// This is the only simulation used by solo, AI, local multiplayer and the server.
export const SIZE = 20;
export const DIRECTIONS = Object.freeze({ up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] });
export const SPEEDS = Object.freeze({ relaxed: 180, normal: 140, fast: 105 });
export const COMBO_MS = 8000;
export const ROUND_MS = 90000;
export const MAX_TICKS = 18000;
const key = p => `${p.x},${p.y}`;
export const same = (a, b) => a.x === b.x && a.y === b.y;
export const inside = p => p.x >= 0 && p.y >= 0 && p.x < SIZE && p.y < SIZE;
export function opposite(a, b) {
  return DIRECTIONS[a][0] + DIRECTIONS[b][0] === 0 && DIRECTIONS[a][1] + DIRECTIONS[b][1] === 0;
}
function random(state) {
  let n = state.randomState;
  n ^= n << 13; n ^= n >>> 17; n ^= n << 5;
  state.randomState = n >>> 0;
  return state.randomState / 4294967296;
}
function snake(id, x, y, dir) {
  const [dx, dy] = DIRECTIONS[dir];
  return { id, dir, queue: [], body: Array.from({ length: 4 }, (_, i) => ({ x: x - i * dx, y: y - i * dy })), alive: true, score: 0, apples: 0, combo: 0, comboUntil: 0, death: null };
}
export function createGame({ mode = 'classic', speed = 'normal', seed = 1 } = {}) {
  if (!['classic', 'arcade', 'duel'].includes(mode) || !Object.hasOwn(SPEEDS, speed) || !Number.isInteger(seed)) throw new Error('Invalid game settings');
  const g = { version: 2, mode, speed, seed: seed >>> 0 || 1, randomState: seed >>> 0 || 1, tick: 0, elapsedMs: 0, status: 'playing', winner: null, reason: '', food: [], events: [], actions: [] };
  g.snakes = mode === 'duel' ? [snake(0, 4, 6, 'right'), snake(1, 15, 13, 'left')] : [snake(0, 6, 10, 'right')];
  g.food = mode === 'duel' ? [{ x: 10, y: 6 }, { x: 9, y: 13 }] : [{ x: 10, y: 10 }];
  return g;
}
export function stepDuration(g) {
  if (g.mode === 'duel') return 140;
  return Math.max(85, SPEEDS[g.speed] - Math.floor(g.snakes[0].apples / 5) * 7);
}
export function queueTurn(g, id, dir) {
  const s = g.snakes[id];
  if (g.status !== 'playing' || !s?.alive || !Object.hasOwn(DIRECTIONS, dir) || s.queue.length >= 2) return false;
  const previous = s.queue.at(-1) ?? s.dir;
  if (dir === previous || opposite(previous, dir)) return false;
  s.queue.push(dir);
  return true;
}
export function clearTurns(g) { for (const s of g.snakes) s.queue = []; }
function spawnFood(g) {
  const occupied = new Set(g.snakes.flatMap(s => s.body).map(key));
  for (const f of g.food) occupied.add(key(f));
  const free = [];
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) if (!occupied.has(`${x},${y}`)) free.push({ x, y });
  if (!free.length) return false;
  if (g.mode === 'duel') {
    // Respawn in rotationally symmetric pairs only after both apples are eaten.
    const symmetric = free.filter(p => !occupied.has(`${SIZE - 1 - p.x},${SIZE - 1 - p.y}`));
    const candidates = symmetric.length ? symmetric : free;
    const p = candidates[Math.floor(random(g) * candidates.length)];
    g.food.push(p);
    const q = { x: SIZE - 1 - p.x, y: SIZE - 1 - p.y };
    if (!occupied.has(key(q)) && !same(p, q)) g.food.push(q);
  } else g.food.push(free[Math.floor(random(g) * free.length)]);
  return true;
}
function finish(g, reason, winner) {
  g.status = 'finished'; g.reason = reason; g.winner = winner;
  g.events.push({ type: 'finish', reason, winner });
}
export function step(g) {
  if (g.status !== 'playing') return g;
  g.events = [];
  const dt = stepDuration(g);
  g.tick++; g.elapsedMs += dt;
  const next = [], grows = [];
  for (const s of g.snakes) {
    const turn = s.queue.shift();
    if (turn) { s.dir = turn; g.actions.push([g.tick, s.id, turn]); }
    const [dx, dy] = DIRECTIONS[s.dir];
    next[s.id] = { x: s.body[0].x + dx, y: s.body[0].y + dy };
    grows[s.id] = g.food.some(f => same(f, next[s.id]));
    if (g.elapsedMs > s.comboUntil) s.combo = 0;
  }
  // Resolve all intended positions against the same snapshot. A non-growing tail
  // vacates on this tick; every other body cell remains solid, including heads.
  const occupied = new Set(g.snakes.flatMap(s => grows[s.id] ? s.body : s.body.slice(0, -1)).map(key));
  for (const s of g.snakes) {
    if (!inside(next[s.id])) s.death = 'wall';
    else if (occupied.has(key(next[s.id]))) s.death = s.body.some(p => same(p, next[s.id])) ? 'self' : 'opponent';
  }
  if (g.snakes.length === 2 && (same(next[0], next[1]) || (same(next[0], g.snakes[1].body[0]) && same(next[1], g.snakes[0].body[0])))) {
    for (const s of g.snakes) s.death = 'head-on';
  }
  for (const s of g.snakes) {
    if (s.death) { s.alive = false; g.events.push({ type: 'crash', id: s.id, reason: s.death }); continue; }
    s.body.unshift(next[s.id]);
    if (!grows[s.id]) s.body.pop();
    else {
      g.food = g.food.filter(f => !same(f, next[s.id]));
      s.apples++;
      s.combo = g.mode === 'arcade' ? Math.min(3, s.combo + 1) : 1;
      s.comboUntil = g.elapsedMs + COMBO_MS;
      s.score += s.combo;
      g.events.push({ type: 'eat', id: s.id, points: s.combo, cell: next[s.id] });
    }
  }
  const alive = g.snakes.filter(s => s.alive);
  if (alive.length < g.snakes.length) {
    finish(g, g.mode === 'duel' ? (alive.length ? 'survivor' : 'double-crash') : g.snakes[0].death, g.mode === 'duel' && alive.length ? alive[0].id : null);
  } else if (!g.food.length && !spawnFood(g)) {
    const winner = g.mode === 'duel' ? (g.snakes[0].score === g.snakes[1].score ? null : Number(g.snakes[1].score > g.snakes[0].score)) : 0;
    finish(g, 'board-full', winner);
  } else if (g.mode === 'duel' && g.elapsedMs >= ROUND_MS) {
    const [a, b] = g.snakes;
    finish(g, 'time', a.score === b.score ? null : Number(b.score > a.score));
  } else if (g.tick >= MAX_TICKS) finish(g, 'limit', g.mode === 'duel' ? null : 0);
  return g;
}
export function publicState(g) {
  const { actions, events, randomState, seed, ...state } = g;
  return structuredClone({ ...state, snakes: state.snakes.map(({ queue, ...snake }) => snake), events });
}
// A space-aware opponent. It sees current positions only, never your queued turn.
export function chooseBotTurn(g, id = 1) {
  const s = g.snakes[id], other = g.snakes.find(p => p.id !== id);
  const blocked = new Set(g.snakes.flatMap(p => p.body.slice(0, -1)).map(key));
  const danger = new Set();
  if (other) for (const [dir, [dx, dy]] of Object.entries(DIRECTIONS)) {
    if (!opposite(dir, other.dir)) danger.add(key({ x: other.body[0].x + dx, y: other.body[0].y + dy }));
  }
  function space(start) {
    const seen = new Set([key(start)]), stack = [start];
    while (stack.length) {
      const p = stack.pop();
      for (const [dx, dy] of Object.values(DIRECTIONS)) {
        const q = { x: p.x + dx, y: p.y + dy }, k = key(q);
        if (inside(q) && !blocked.has(k) && !seen.has(k)) { seen.add(k); stack.push(q); }
      }
    }
    return seen.size;
  }
  let best = s.dir, bestValue = -Infinity;
  for (const [dir, [dx, dy]] of Object.entries(DIRECTIONS)) {
    if (opposite(dir, s.dir)) continue;
    const p = { x: s.body[0].x + dx, y: s.body[0].y + dy };
    if (!inside(p) || blocked.has(key(p))) continue;
    const distance = Math.min(...g.food.map(f => Math.abs(f.x - p.x) + Math.abs(f.y - p.y)), 40);
    const area = space(p);
    const value = Math.min(area, s.body.length + 15) * 8 - distance * 2 - (danger.has(key(p)) ? 120 : 0) + (dir === s.dir ? .1 : 0);
    if (value > bestValue) { bestValue = value; best = dir; }
  }
  return best;
}
export function makeRecording(g) {
  if (g.status !== 'finished' || g.mode !== 'classic') return null;
  return { version: 2, seed: g.seed, speed: g.speed, ticks: g.tick, score: g.snakes[0].score, actions: g.actions.map(a => [...a]) };
}
export function replayRecording(record) {
  if (!record || record.version !== 2 || !Number.isInteger(record.seed) || !Object.hasOwn(SPEEDS, record.speed) || !Number.isInteger(record.ticks) || record.ticks < 1 || record.ticks > MAX_TICKS || !Number.isInteger(record.score) || !Array.isArray(record.actions) || record.actions.length > MAX_TICKS) throw new Error('Invalid replay');
  let last = 0;
  for (const action of record.actions) {
    if (!Array.isArray(action) || action.length !== 3 || !Number.isInteger(action[0]) || action[0] <= last || action[0] > record.ticks || action[1] !== 0 || !Object.hasOwn(DIRECTIONS, action[2])) throw new Error('Invalid replay input');
    last = action[0];
  }
  const g = createGame({ seed: record.seed, speed: record.speed });
  let index = 0;
  while (g.tick < record.ticks && g.status === 'playing') {
    if (record.actions[index]?.[0] === g.tick + 1) {
      if (!queueTurn(g, 0, record.actions[index][2])) throw new Error('Invalid replay turn');
      index++;
    }
    step(g);
  }
  if (g.status !== 'finished' || g.tick !== record.ticks || g.snakes[0].score !== record.score) throw new Error('Replay did not match');
  return g;
}
