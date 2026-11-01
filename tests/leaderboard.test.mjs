import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createGame, step, queueTurn, makeRecording, dailySeed, dhakaDay } from '../web/js/engine.js';
import { Leaderboard } from '../scripts/leaderboard.mjs';
import { createServer } from '../scripts/server.mjs';
const NOW = Date.UTC(2026, 10, 1, 6), TOKEN = 'a'.repeat(32);
function run(seed, turns = {}, speed = 'normal') {
  const g = createGame({ seed, speed });
  while (g.status === 'playing') { if (turns[g.tick]) queueTurn(g, 0, turns[g.tick]); step(g); }
  return makeRecording(g);
}
const today = () => dailySeed(dhakaDay(NOW));
// Answers just enough SQL to exercise the rules that live outside the database.
function fakePool({ player = true } = {}) {
  const calls = [];
  return { calls, async query(text, values) {
    calls.push({ text, values });
    if (text.includes('CREATE TABLE')) return { rows: [] };
    if (text.startsWith('SELECT 1')) return { rows: player ? [{}] : [] };
    if (text.includes('INSERT INTO snake_daily_scores')) return { rows: [{ score: values[2] }] };
    if (text.includes('AS rank')) return { rows: [{ score: 5, rank: 2 }] };
    return { rows: [] };
  } };
}
test('a genuine daily run is replayed, accepted and ranked', async () => {
  const pool = fakePool(), board = new Leaderboard(pool, () => NOW), record = run(today());
  const result = await board.submitDaily({ token: TOKEN, record });
  assert.equal(result.rank, 2); assert.equal(result.day, dhakaDay(NOW)); assert.equal(result.improved, true);
  const insert = pool.calls.find(c => c.text.includes('INSERT INTO snake_daily_scores'));
  assert.equal(insert.values[2], record.score);
  assert.notEqual(insert.values[1], TOKEN, 'the raw token must never be stored');
});
test('forged scores, wrong days and wrong speeds are rejected before any write', async () => {
  const cases = [
    [{ ...run(today()), score: 999 }, /could not be verified/],
    [run(today() + 1), /has ended/],
    [run(today(), {}, 'fast'), /Standard speed/],
    [{ version: 2, seed: today(), speed: 'normal', ticks: 1, score: 0, actions: 'nope' }, /could not be verified/],
    [null, /could not be verified/]
  ];
  for (const [record, message] of cases) {
    const pool = fakePool();
    await assert.rejects(new Leaderboard(pool, () => NOW).submitDaily({ token: TOKEN, record }), message);
    assert.equal(pool.calls.some(c => c.text.includes('INSERT')), false);
  }
});
test('yesterday still counts, so a run finished across midnight is not lost', async () => {
  const yesterday = dailySeed(dhakaDay(NOW - 86400000));
  const result = await new Leaderboard(fakePool(), () => NOW).submitDaily({ token: TOKEN, record: run(yesterday) });
  assert.equal(result.day, dhakaDay(NOW - 86400000));
});
test('a score needs a player card first', async () => {
  await assert.rejects(new Leaderboard(fakePool({ player: false }), () => NOW).submitDaily({ token: TOKEN, record: run(today()) }), e => e.status === 409);
});
test('profiles are validated and stored only by hashed token', async () => {
  const pool = fakePool(), board = new Leaderboard(pool, () => NOW);
  assert.deepEqual(await board.saveProfile({ token: TOKEN, name: ' রাফি ', district: 'Dhaka', crew: 'du-cse-24' }), { name: 'রাফি', district: 'Dhaka', crew: 'DU-CSE-24' });
  assert.equal(JSON.stringify(pool.calls).includes(TOKEN), false);
  for (const bad of [{ token: 'x', name: 'Rafi' }, { token: TOKEN, name: '<b>hi</b>' }, { token: TOKEN, name: 'A' }, { token: TOKEN, name: 'Rafi', district: 'Atlantis' }, { token: TOKEN, name: 'Rafi', crew: 'a b' }]) await assert.rejects(board.saveProfile(bad));
});
test('ghost links store only verified replay fields', async () => {
  const pool = fakePool(), board = new Leaderboard(pool, () => NOW), record = run(55);
  await board.saveGhost({ record: { ...record, injected: '<script>' }, name: 'Rafi' });
  const insert = pool.calls.find(c => c.text.includes('INSERT INTO snake_ghosts'));
  assert.equal(insert.values[3].includes('injected'), false);
  await assert.rejects(board.saveGhost({ record: { ...record, score: 1000 }, name: 'Rafi' }));
  await assert.rejects(board.ghost("x'; DROP TABLE snake_ghosts;--"));
});
test('a failed first connection is retried on the next request', async () => {
  let attempts = 0;
  const board = new Leaderboard({ async query() { if (++attempts === 1) throw new Error('down'); return { rows: [] }; } }, () => NOW);
  await assert.rejects(board.top());
  assert.deepEqual((await board.top()).rows, []);
});
async function serve(leaderboard) {
  const server = createServer({ leaderboard }); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  return { server, base: `http://127.0.0.1:${server.address().port}` };
}
const post = (base, path, body, headers = {}) => fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
test('without a database the API says so plainly and the game still loads', async () => {
  const { server, base } = await serve(null);
  try {
    assert.equal((await fetch(`${base}/api/leaderboard`)).status, 503);
    assert.equal((await post(base, '/api/daily', {})).status, 503);
    assert.equal((await fetch(`${base}/api/nope`)).status, 404);
    assert.equal((await fetch(base)).status, 200);
  } finally { server.close(); server.closeAllConnections(); }
});
test('API routes enforce method, origin, content type, size and write limits', async () => {
  const { server, base } = await serve(new Leaderboard(fakePool(), () => NOW));
  try {
    assert.equal((await fetch(`${base}/api/daily`)).status, 405);
    assert.equal((await fetch(`${base}/api/leaderboard`, { method: 'POST' })).status, 405);
    assert.equal((await post(base, '/api/profile', { token: TOKEN, name: 'Rafi' }, { Origin: 'https://evil.example' })).status, 403);
    assert.equal((await fetch(`${base}/api/profile`, { method: 'POST', body: '{}' })).status, 415);
    // The server stops reading an oversized body, so the client sees either the 413 or a reset.
    const oversized = await post(base, '/api/ghosts', { padding: 'x'.repeat(400000) }).then(r => r.status, () => 413);
    assert.equal(oversized, 413);
    const statuses = [];
    for (let i = 0; i < 8; i++) statuses.push((await post(base, '/api/profile', { token: TOKEN, name: 'Rafi' })).status);
    assert.ok(statuses.includes(429));
  } finally { server.close(); server.closeAllConnections(); }
});
test('a database failure gives players a plain message, never its details', async () => {
  const { server, base } = await serve(new Leaderboard({ async query() { throw Object.assign(new Error('password authentication failed for secret-host'), { code: '28P01' }); } }, () => NOW));
  const log = console.error; console.error = () => {};
  try {
    const response = await fetch(`${base}/api/leaderboard`), text = await response.text();
    assert.equal(response.status, 503); assert.equal(text.includes('secret-host'), false);
  } finally { console.error = log; server.close(); server.closeAllConnections(); }
});
test('text assets are gzipped when asked and vendor files cache for good', async () => {
  const { server, base } = await serve(null);
  try {
    const vendor = await fetch(`${base}/vendor/three-0.187.0/three.min.js`);
    assert.equal(vendor.headers.get('content-encoding'), 'gzip');
    assert.match(vendor.headers.get('cache-control'), /immutable/);
    assert.ok((await vendor.text()).length > 100000);
    assert.equal((await fetch(`${base}/index.html`)).headers.get('cache-control'), 'no-store');
    assert.equal((await fetch(`${base}/audio/eat.mp3`)).headers.get('content-encoding'), null);
  } finally { server.close(); server.closeAllConnections(); }
});
