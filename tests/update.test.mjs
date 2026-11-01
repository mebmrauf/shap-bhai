import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { keepUpdated } from '../web/js/update.js';
function target() { const handlers = {}; return { handlers, addEventListener(name, fn) { (handlers[name] ??= []).push(fn); }, fire(name) { for (const fn of handlers[name] ?? []) fn(); } }; }
function fixture({ controller = {}, busy = false } = {}) {
  const worker = Object.assign(target(), { controller, registered: null, async register(url, options) { this.registered = { url, options }; return registration; } });
  const registration = { updates: 0, async update() { this.updates++; } };
  const doc = Object.assign(target(), { hidden: false }), win = Object.assign(target(), { timers: [], setInterval(fn, ms) { this.timers.push({ fn, ms }); } });
  const state = { reloads: 0, busy, time: 1000000 };
  const updater = keepUpdated({ isBusy: () => state.busy, worker, doc, win, reload: () => state.reloads++, now: () => state.time });
  return { worker, registration, doc, win, state, updater };
}
test('registers without the HTTP cache and checks straight away', async () => {
  const { worker, registration, updater } = fixture(); await updater.start();
  assert.deepEqual(worker.registered, { url: '/sw.js', options: { updateViaCache: 'none' } });
  assert.equal(registration.updates, 1);
});
test('coming back to the app checks for a new version, which is what installed apps were missing', async () => {
  const { registration, doc, state, updater } = fixture(); await updater.start();
  state.time += 120000; doc.fire('visibilitychange');
  assert.equal(registration.updates, 2);
});
test('rapid app switching does not hammer the server', async () => {
  const { registration, doc, state, updater } = fixture(); await updater.start();
  state.time += 5000; doc.fire('visibilitychange'); doc.fire('visibilitychange');
  assert.equal(registration.updates, 1);
});
test('regaining a connection checks at once, and an open app checks on a timer', async () => {
  const { registration, win, doc, updater } = fixture(); await updater.start();
  win.fire('online'); assert.equal(registration.updates, 2);
  assert.equal(win.timers.length, 1); win.timers[0].fn(); assert.equal(registration.updates, 3);
  doc.hidden = true; win.timers[0].fn(); assert.equal(registration.updates, 3);
});
test('a new version reloads straight away when the player is on the menu', () => {
  const { worker, state } = fixture(); worker.fire('controllerchange');
  assert.equal(state.reloads, 1);
});
test('a game in progress is never interrupted; the reload waits for a safe moment', () => {
  const { worker, state, updater } = fixture({ busy: true }); worker.fire('controllerchange');
  assert.equal(state.reloads, 0); assert.equal(updater.applyPending(), false);
  state.busy = false; assert.equal(updater.applyPending(), true); assert.equal(state.reloads, 1);
  assert.equal(updater.applyPending(), false); assert.equal(state.reloads, 1);
});
test('the first ever install does not reload a page that is already current', () => {
  const { worker, state } = fixture({ controller: null }); worker.fire('controllerchange');
  assert.equal(state.reloads, 0);
  worker.fire('controllerchange'); assert.equal(state.reloads, 1);
});
test('nothing to apply means nothing reloads', () => {
  const { state, updater } = fixture(); assert.equal(updater.applyPending(true), false); assert.equal(state.reloads, 0);
});
const read = path => readFile(new URL(path, import.meta.url), 'utf8');
test('the manifest installs correctly with the new name and real icons', async () => {
  const manifest = JSON.parse(await read('../web/manifest.json'));
  assert.equal(manifest.name, 'Dhaka in 3D'); assert.equal(manifest.id, '/'); assert.equal(manifest.start_url, '/'); assert.equal(manifest.display, 'standalone');
  assert.ok(manifest.icons.some(i => i.purpose === 'maskable' && i.sizes === '512x512'));
  assert.ok(manifest.icons.some(i => i.purpose === 'any' && i.sizes === '192x192'));
  const worker = await read('../web/sw.js');
  for (const icon of [...manifest.icons, ...manifest.shortcuts.flatMap(s => s.icons ?? [])]) { await access(new URL(`../web/${icon.src}`, import.meta.url)); assert.ok(worker.includes(`/${icon.src}`), icon.src); }
});
test('the old name is gone from everything players can see', async () => {
  for (const file of ['../web/index.html', '../web/manifest.json', '../web/js/i18n.js', '../web/js/social.js']) {
    const text = (await read(file)).replace(/snake-arena[.\w-]*/g, '');
    assert.equal(/snake arena|snake\s*<span[^>]*>\s*arena|অ্যারেনা/i.test(text), false, file);
  }
  assert.match(await read('../web/index.html'), /<title>Dhaka in 3D<\/title>/);
});
