// Deterministic solo rules shared by gameplay and replay verification.
import { WORLDS, TRAITS, STORY_GOALS } from './adventures.js';
export const SIZE = 20;
export const DIRECTIONS = Object.freeze({ up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] });
export const SPEEDS = Object.freeze({ relaxed: 180, normal: 140, fast: 105 });
export const COMBO_MS = 8000;
// Story runs (version 4) chain bites: the next food within this many moves raises the multiplier, up to x3.
export const STREAK_MOVES = 30;
export const MAX_TICKS = 18000;
export const CHAOS_EVENTS = Object.freeze(['loadshedding', 'traffic', 'flood', 'wedding']);
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
// Bangladesh has one fixed offset (UTC+6), so everyone shares the same challenge day.
export const dhakaDay = (now = Date.now()) => new Date(now + 21600000).toISOString().slice(0, 10);
export function dailySeed(day) {
  let hash = 2166136261;
  for (const ch of `snake-arena:${day}`) hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619);
  return hash >>> 0 || 1;
}
export function createGame({ mode = 'classic', speed = 'normal', seed = 1, theme = null, skin = 'nagin' } = {}) {
  if (!['classic', 'arcade', 'chaos'].includes(mode) || !Object.hasOwn(SPEEDS, speed) || !Number.isInteger(seed)) throw new Error('Invalid game settings');
  if (theme !== null && (!Object.hasOwn(WORLDS, theme) || !Object.hasOwn(TRAITS, skin))) throw new Error('Invalid adventure settings');
  const g = { version: 2, mode, speed, seed: seed >>> 0 || 1, randomState: seed >>> 0 || 1, tick: 0, elapsedMs: 0, status: 'playing', winner: null, reason: '', food: [], events: [], actions: [] };
  g.snakes = [snake(0, 6, 10, 'right')];
  g.food = [{ x: 10, y: 10 }];
  if (mode === 'chaos') g.chaos = { name: null, phase: 'idle', until: 40, last: null, warnings: [], obstacles: [], water: [], blackout: false };
  if (theme) {
    g.version = 4; g.theme = theme; g.skin = skin;
    g.food[0].kind = WORLDS[theme].food;
    g.adventure = { theme, skin, phase: 'rest', next: mode === 'chaos' ? 24 : 34, until: 0, phaseAt: 0, path: [], warnings: [], obstacles: [], water: [], actor: null, delivered: 0, chapter: 0, dodged: 0, stolen: 0, gifts: 0, giftExpires: 0 };
  }
  return g;
}
export function stepDuration(g) {
  const duration = Math.max(85, SPEEDS[g.speed] - Math.floor(g.snakes[0].apples / 5) * 7);
  return g.adventure?.skin === 'tea' ? Math.round(duration * 1.12) : duration;
}
export const canTurn = (heading, dir) => dir !== heading && !opposite(heading, dir);
export function queueTurn(g, id, dir) {
  const s = g.snakes[id];
  if (g.status !== 'playing' || !s?.alive || !Object.hasOwn(DIRECTIONS, dir) || s.queue.length >= 2) return false;
  const previous = s.queue.at(-1) ?? s.dir;
  if (!canTurn(previous, dir)) return false;
  s.queue.push(dir);
  return true;
}
export function clearTurns(g) { for (const s of g.snakes) s.queue = []; }
function spawnFood(g) {
  const occupied = new Set(g.snakes.flatMap(s => s.body).map(key));
  for (const f of g.food) occupied.add(key(f));
  if (g.chaos) for (const p of [...g.chaos.warnings, ...g.chaos.obstacles, ...g.chaos.water]) occupied.add(key(p));
  if (g.adventure) for (const p of [...g.adventure.warnings, ...g.adventure.obstacles, ...g.adventure.water]) occupied.add(key(p));
  const free = [];
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) if (!occupied.has(`${x},${y}`)) free.push({ x, y });
  if (!free.length) return false;
  const food = free[Math.floor(random(g) * free.length)];
  if (g.adventure) food.kind = WORLDS[g.theme].food;
  g.food.push(food);
  return true;
}
// Chaos cells must keep clear of the snake's next few moves, so nothing lands on a player unseen.
function chaosCells(g, name) {
  const head = g.snakes[0].body[0], [dx, dy] = DIRECTIONS[g.snakes[0].dir];
  const taken = new Set([...g.snakes[0].body, ...g.food].map(key));
  const clear = p => inside(p) && !taken.has(key(p)) && Math.abs(p.x - head.x) + Math.abs(p.y - head.y) > 3 && ![1, 2, 3, 4, 5].some(n => same(p, { x: head.x + dx * n, y: head.y + dy * n }));
  for (let attempt = 0; attempt < 24; attempt++) {
    const x = 2 + Math.floor(random(g) * (SIZE - 4)), y = 2 + Math.floor(random(g) * (SIZE - 4));
    const cells = [];
    if (name === 'traffic') {
      const across = random(g) < .5, length = 4 + Math.floor(random(g) * 3);
      for (let i = 0; i < length; i++) cells.push(across ? { x: x + i, y } : { x, y: y + i });
    } else for (let oy = -2; oy <= 2; oy++) for (let ox = -2; ox <= 2; ox++) if (Math.abs(ox) + Math.abs(oy) < 4) cells.push({ x: x + ox, y: y + oy });
    if (cells.every(clear)) return cells;
  }
  return [];
}
function endChaos(g) {
  const c = g.chaos, name = c.name;
  c.name = null; c.phase = 'idle'; c.until = g.tick + 35 + Math.floor(random(g) * 25);
  c.warnings = []; c.obstacles = []; c.water = []; c.blackout = false;
  g.food = g.food.filter(f => !f.feast);
  g.events.push({ type: 'chaos', name, phase: 'end' });
}
function advanceChaos(g) {
  const c = g.chaos;
  if (c.phase === 'active' && g.tick >= c.until) endChaos(g);
  else if (c.phase === 'warn' && g.tick >= c.until) {
    const body = new Set(g.snakes[0].body.map(key));
    // A snake that crossed the warned cells is spared; only an approach after this tick can crash.
    if (c.name === 'traffic') c.obstacles = c.warnings.filter(p => !body.has(key(p)));
    else c.water = c.warnings;
    c.warnings = []; c.phase = 'active'; c.until = g.tick + 60;
    g.events.push({ type: 'chaos', name: c.name, phase: 'start' });
  } else if (c.phase === 'idle' && g.tick >= c.until) {
    const options = CHAOS_EVENTS.filter(name => name !== c.last);
    const name = options[Math.floor(random(g) * options.length)];
    c.name = c.last = name;
    if (name === 'loadshedding') {
      c.phase = 'active'; c.blackout = true; c.until = g.tick + 50;
      g.events.push({ type: 'chaos', name, phase: 'start' });
    } else if (name === 'wedding') {
      c.phase = 'active'; c.until = g.tick + 50;
      for (let i = 0; i < 3; i++) if (spawnFood(g)) g.food.at(-1).feast = true;
      g.events.push({ type: 'chaos', name, phase: 'start' });
    } else {
      c.warnings = chaosCells(g, name);
      if (!c.warnings.length) { c.name = null; c.until = g.tick + 10; return; }
      c.phase = 'warn'; c.until = g.tick + 15;
      g.events.push({ type: 'chaos', name, phase: 'warn' });
    }
  }
}
function finish(g, reason, winner) {
  g.status = 'finished'; g.reason = reason; g.winner = winner;
  g.events.push({ type: 'finish', reason, winner });
}
function adventureEvent(g, phase, extra = {}) { g.events.push({ type: 'adventure', theme: g.theme, phase, ...extra }); }
function restAdventure(g) {
  const a = g.adventure;
  a.phase = 'rest'; a.next = g.tick + (g.mode === 'chaos' ? 25 : 45);
  a.warnings = []; a.obstacles = []; a.water = []; a.actor = null;
}
function rewardAdventure(g) {
  const a = g.adventure;
  a.dodged++;
  if (g.skin === 'nagin') {
    g.snakes[0].score += 2; adventureEvent(g, 'trait', { skin: g.skin, points: 2 });
  }
  g.food = g.food.filter(f => !f.gift);
  if (spawnFood(g)) { g.food.at(-1).gift = g.theme; a.giftExpires = g.tick + 70; adventureEvent(g, 'gift'); }
}
function startEncounter(g) {
  const a = g.adventure, head = g.snakes[0].body[0], world = WORLDS[g.theme];
  const warning = (g.mode === 'chaos' ? 12 : 17) + (g.skin === 'kalnagini' ? 6 : 0);
  a.phase = 'warn'; a.until = g.tick + warning;
  if (world.encounter === 'bus') {
    let row = 2 + Math.floor(random(g) * 16);
    if (Math.abs(row - head.y) < 3) row = head.y < 10 ? 16 : 3;
    a.path = Array.from({ length: SIZE }, (_, x) => ({ x, y: row }));
    if (random(g) < .5) a.path.reverse();
    a.actor = { kind: 'bus', ...a.path[0], dir: a.path[0].x === 0 ? 'right' : 'left', state: 'warn' };
  } else if (world.encounter === 'tiger') {
    const target = { x: Math.max(4, Math.min(15, head.x)), y: Math.max(4, Math.min(15, head.y)) };
    const dir = Object.keys(DIRECTIONS)[Math.floor(random(g) * 4)], [dx, dy] = DIRECTIONS[dir];
    a.path = Array.from({ length: 4 }, (_, i) => ({ x: target.x - dx * (3 - i), y: target.y - dy * (3 - i) }));
    a.actor = { kind: 'tiger', ...a.path[0], dir, state: 'warn' };
  } else if (world.encounter === 'pigeon') {
    const food = g.food.find(f => !f.gift) ?? { x: 10, y: 10 };
    a.path = [{ x: food.x, y: food.y }];
    a.actor = { kind: 'pigeon', ...a.path[0], dir: 'down', state: 'warn' };
  } else {
    a.row = 3 + Math.floor(random(g) * 8);
    a.path = Array.from({ length: SIZE * 6 }, (_, i) => ({ x: i % SIZE, y: a.row + Math.floor(i / SIZE) }));
    a.actor = { kind: 'crab', x: 1, y: a.row + 6, dir: 'right', state: 'warn' };
  }
  a.warnings = a.path.map(p => ({ ...p }));
  adventureEvent(g, 'warn');
}
function advanceAdventure(g) {
  const a = g.adventure, kind = WORLDS[g.theme].encounter;
  if (a.giftExpires && g.tick >= a.giftExpires) { g.food = g.food.filter(f => !f.gift); a.giftExpires = 0; }
  if (a.phase === 'rest') { if (g.tick >= a.next) startEncounter(g); return; }
  if (a.phase === 'warn') {
    if (g.tick < a.until) return;
    a.phase = 'active'; a.phaseAt = g.tick; a.warnings = []; a.actor.state = 'active';
    a.until = g.tick + ({ bus: SIZE, tiger: 8, pigeon: 6, tide: 24 }[kind]);
    if (kind === 'pigeon') {
      g.food = g.food.filter(f => !same(f, a.path[0])); a.stolen++;
      adventureEvent(g, 'stolen');
    } else adventureEvent(g, 'active');
  }
  if (g.tick >= a.until) {
    restAdventure(g);
    if (kind !== 'pigeon') rewardAdventure(g);
    return;
  }
  const at = g.tick - a.phaseAt;
  if (kind === 'bus' || kind === 'tiger') {
    const index = kind === 'bus' ? at : Math.floor(at / 2);
    Object.assign(a.actor, a.path[index]);
    a.obstacles = [a.path[index]];
    if (kind === 'bus' && index > 0) a.obstacles.push(a.path[index - 1]);
  } else if (kind === 'tide') {
    const shift = Math.min(3, Math.floor(Math.min(at, 23 - at) / 3));
    a.water = Array.from({ length: SIZE * 3 }, (_, i) => ({ x: i % SIZE, y: a.row + shift + Math.floor(i / SIZE) }));
    a.actor.x = 1 + at % 18;
  }
}
function eatAdventure(g, food) {
  const a = g.adventure, snake = g.snakes[0];
  if (food.gift) {
    a.gifts++; adventureEvent(g, 'treat', { points: g.skin === 'tiger' ? 5 : 3 });
    if (g.skin === 'tiger') adventureEvent(g, 'trait', { skin: g.skin });
    return;
  }
  a.delivered++;
  if (g.skin === 'jersey' && a.delivered % 3 === 0) { snake.score++; adventureEvent(g, 'trait', { skin: g.skin, points: 1 }); }
  if (a.phase === 'warn' && g.theme === 'rooftop' && same(food, a.path[0])) {
    const points = g.skin === 'tiger' ? 5 : 3;
    snake.score += points; a.dodged++; restAdventure(g); adventureEvent(g, 'rescued', { points });
    if (g.skin === 'nagin') { snake.score += 2; adventureEvent(g, 'trait', { skin: g.skin, points: 2 }); }
  }
  if (a.delivered >= STORY_GOALS[a.chapter]) {
    a.chapter++; adventureEvent(g, a.chapter === 3 ? 'complete' : 'chapter', { chapter: a.chapter });
  }
}
export function step(g) {
  if (g.status !== 'playing') return g;
  g.events = [];
  const dt = stepDuration(g);
  g.tick++; g.elapsedMs += dt;
  if (g.chaos) advanceChaos(g);
  if (g.adventure) advanceAdventure(g);
  const next = [], grows = [];
  for (const s of g.snakes) {
    // Floodwater carries the head straight on; queued turns wait for dry ground.
    const inWater = [...(g.chaos?.water ?? []), ...(g.adventure?.water ?? [])].some(p => same(p, s.body[0]));
    const turn = inWater ? undefined : s.queue.shift();
    if (turn) { s.dir = turn; g.actions.push([g.tick, s.id, turn]); }
    const [dx, dy] = DIRECTIONS[s.dir];
    next[s.id] = { x: s.body[0].x + dx, y: s.body[0].y + dy };
    grows[s.id] = g.food.some(f => same(f, next[s.id])) || s.pending > 0;
    if (g.elapsedMs > s.comboUntil) s.combo = 0;
  }
  // A non-growing tail vacates on this tick; every other body cell stays solid.
  const occupied = new Set(g.snakes.flatMap(s => grows[s.id] ? s.body : s.body.slice(0, -1)).map(key));
  for (const s of g.snakes) {
    if (!inside(next[s.id])) s.death = 'wall';
    else if (g.chaos?.obstacles.some(p => same(p, next[s.id]))) s.death = 'traffic';
    else if (g.adventure?.obstacles.some(p => same(p, next[s.id]) || same(p, s.body[0]))) s.death = g.theme === 'sundarbans' ? 'tiger' : 'traffic';
    else if (occupied.has(key(next[s.id]))) s.death = 'self';
  }
  for (const s of g.snakes) {
    if (s.death) { s.alive = false; g.events.push({ type: 'crash', id: s.id, reason: s.death }); continue; }
    s.body.unshift(next[s.id]);
    if (!grows[s.id]) s.body.pop();
    const eaten = g.food.find(f => same(f, next[s.id]));
    if (!eaten) { if (s.pending > 0) s.pending--; }
    else {
      g.food = g.food.filter(f => f !== eaten);
      s.apples++;
      s.combo = g.mode === 'arcade' || g.version >= 4 ? Math.min(3, s.combo + 1) : 1;
      s.comboUntil = g.elapsedMs + (g.version >= 4 ? STREAK_MOVES * dt : COMBO_MS);
      // Biryani is worth 3 points and two extra segments.
      const points = eaten.gift ? (g.skin === 'tiger' ? 5 : 3) : eaten.feast ? 3 : s.combo;
      if (eaten.feast) s.pending = (s.pending ?? 0) + 2;
      s.score += points;
      g.events.push({ type: 'eat', id: s.id, points, cell: next[s.id], feast: !!eaten.feast, ...(g.adventure ? { gift: !!eaten.gift, kind: eaten.kind } : {}) });
      if (g.adventure) eatAdventure(g, eaten);
    }
  }
  if (!g.snakes[0].alive) finish(g, g.snakes[0].death, null);
  else if (g.adventure?.chapter === 3) finish(g, 'story-complete', 0);
  else if (!g.food.some(f => !f.feast && !f.gift) && !spawnFood(g)) finish(g, 'board-full', 0);
  else if (g.tick >= MAX_TICKS) finish(g, 'limit', 0);
  return g;
}
// One finger stroke is one turn. A thumb moves in an arc, so a second turn needs a long, clearly sideways move.
export function swipeTurn(swipe, x, y) {
  const dx = x - swipe.x, dy = y - swipe.y, major = Math.max(Math.abs(dx), Math.abs(dy)), minor = Math.min(Math.abs(dx), Math.abs(dy));
  if (major < 18) return null;
  const dir = Math.abs(dx) > Math.abs(dy) ? dx > 0 ? 'right' : 'left' : dy > 0 ? 'down' : 'up';
  if (dir === swipe.dir) { swipe.x = x; swipe.y = y; return null; }
  if (swipe.dir && (major < 48 || minor * 2 > major)) return null;
  swipe.x = x; swipe.y = y; swipe.dir = dir;
  return dir;
}
export function makeRecording(g) {
  if (g.status !== 'finished' || g.mode !== 'classic') return null;
  return { version: g.version, seed: g.seed, speed: g.speed, ticks: g.tick, score: g.snakes[0].score, actions: g.actions.map(a => [...a]), ...(g.adventure ? { theme: g.theme, skin: g.skin } : {}) };
}
export function replayRecording(record) {
  if (!record || ![2, 3, 4].includes(record.version) || (record.version >= 3 && (!Object.hasOwn(WORLDS, record.theme) || !Object.hasOwn(TRAITS, record.skin))) || !Number.isInteger(record.seed) || !Object.hasOwn(SPEEDS, record.speed) || !Number.isInteger(record.ticks) || record.ticks < 1 || record.ticks > MAX_TICKS || !Number.isInteger(record.score) || !Array.isArray(record.actions) || record.actions.length > MAX_TICKS) throw new Error('Invalid replay');
  let last = 0;
  for (const action of record.actions) {
    if (!Array.isArray(action) || action.length !== 3 || !Number.isInteger(action[0]) || action[0] <= last || action[0] > record.ticks || action[1] !== 0 || !Object.hasOwn(DIRECTIONS, action[2])) throw new Error('Invalid replay input');
    last = action[0];
  }
  const g = createGame({ seed: record.seed, speed: record.speed, ...(record.version >= 3 ? { theme: record.theme, skin: record.skin } : {}) });
  g.version = record.version; // Older ghosts replay under the rules they were recorded with.
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
