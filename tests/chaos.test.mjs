import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, step, queueTurn, makeRecording, replayRecording, publicState, predict, dailySeed, dhakaDay, CHAOS_EVENTS, DIRECTIONS } from '../web/js/engine.js';
import { roastBank, duelBank, biteBank, startBank, reactions, phrases } from '../web/js/audio.js';
// A simple survivor: circle the middle of the board so events keep firing.
function steer(g) {
  const head = g.snakes[0].body[0], dir = g.snakes[0].dir;
  const order = { right: 'down', down: 'left', left: 'up', up: 'right' };
  const [dx, dy] = DIRECTIONS[dir], x = head.x + dx * 3, y = head.y + dy * 3;
  if (x < 3 || y < 3 || x > 16 || y > 16 || g.chaos?.obstacles.some(p => p.x === head.x + dx && p.y === head.y + dy)) queueTurn(g, 0, order[dir]);
}
test('daily seed is stable for a day and differs between days', () => {
  assert.equal(dailySeed('2026-11-01'), dailySeed('2026-11-01'));
  assert.notEqual(dailySeed('2026-11-01'), dailySeed('2026-11-02'));
});
test('the challenge day turns over at midnight in Bangladesh, not UTC', () => {
  assert.equal(dhakaDay(Date.UTC(2026, 10, 1, 17, 59)), '2026-11-01');
  assert.equal(dhakaDay(Date.UTC(2026, 10, 1, 18, 0)), '2026-11-02');
});
test('classic games carry no chaos state and classic replays still verify', () => {
  const g = createGame({ seed: 77 });
  assert.equal(g.chaos, undefined);
  queueTurn(g, 0, 'up'); while (g.status === 'playing') step(g);
  assert.equal(replayRecording(makeRecording(g)).snakes[0].score, g.snakes[0].score);
});
test('chaos runs are deterministic for a seed', () => {
  const run = () => { const g = createGame({ mode: 'chaos', seed: 4242 }); for (let i = 0; i < 900 && g.status === 'playing'; i++) { steer(g); step(g); } return JSON.stringify([g.tick, g.chaos, g.food, g.snakes[0].body]); };
  assert.equal(run(), run());
});
test('every chaos event fires and always ends cleanly', () => {
  const seen = new Set();
  for (let seed = 1; seed < 40 && seen.size < CHAOS_EVENTS.length; seed++) {
    const g = createGame({ mode: 'chaos', seed });
    for (let i = 0; i < 2500 && g.status === 'playing'; i++) {
      steer(g); step(g);
      for (const e of g.events) if (e.type === 'chaos') {
        if (e.phase !== 'end') seen.add(e.name);
        else { assert.equal(g.chaos.blackout, false); assert.deepEqual([g.chaos.obstacles, g.chaos.water, g.chaos.warnings], [[], [], []]); assert.equal(g.food.some(f => f.feast), false); }
      }
    }
  }
  assert.deepEqual([...seen].sort(), [...CHAOS_EVENTS].sort());
});
test('traffic is announced before it becomes solid, and never lands on the snake', () => {
  let checked = 0;
  for (let seed = 1; seed < 60; seed++) {
    const g = createGame({ mode: 'chaos', seed });
    for (let i = 0; i < 1500 && g.status === 'playing'; i++) {
      steer(g); const before = g.chaos.phase, name = g.chaos.name; step(g);
      if (g.chaos.name === 'traffic' && g.chaos.phase === 'active' && before === 'warn' && name === 'traffic') {
        checked++;
        const body = new Set(g.snakes[0].body.map(p => `${p.x},${p.y}`));
        for (const p of g.chaos.obstacles) assert.equal(body.has(`${p.x},${p.y}`), false);
      }
      if (g.chaos.obstacles.length) assert.notEqual(before, 'idle');
    }
  }
  assert.ok(checked > 0);
});
test('hitting traffic ends the run with its own reason', () => {
  const g = createGame({ mode: 'chaos', seed: 9 });
  g.chaos.until = 9999; g.chaos.obstacles = [{ x: 7, y: 10 }];
  step(g);
  assert.equal(g.status, 'finished'); assert.equal(g.reason, 'traffic');
});
test('floodwater holds queued turns until the head is on dry ground', () => {
  const g = createGame({ mode: 'chaos', seed: 9 });
  g.chaos.until = 9999; g.chaos.water = [{ x: 6, y: 10 }];
  queueTurn(g, 0, 'up'); step(g);
  assert.equal(g.snakes[0].dir, 'right'); assert.deepEqual(g.snakes[0].body[0], { x: 7, y: 10 });
  step(g);
  assert.equal(g.snakes[0].dir, 'up');
});
test('biryani scores 3 and grows two extra segments', () => {
  const g = createGame({ mode: 'chaos', seed: 9 }); g.chaos.until = 9999;
  g.food.push({ x: 7, y: 10, feast: true });
  const start = g.snakes[0].body.length;
  step(g);
  assert.equal(g.snakes[0].score, 3); assert.equal(g.snakes[0].body.length, start + 1);
  step(g); step(g);
  assert.equal(g.snakes[0].body.length, start + 3);
  assert.ok(g.food.some(f => !f.feast));
});
test('solo voice lines match how the run ended', () => {
  const cases = [
    [{ reason: 'wall', score: 2 }, 'roastWallLow'], [{ reason: 'wall', score: 8 }, 'roastWallMid'], [{ reason: 'wall', score: 25 }, 'roastWallHigh'],
    [{ reason: 'self', score: 2 }, 'roastSelfLow'], [{ reason: 'self', score: 12 }, 'roastSelfHigh'], [{ reason: 'traffic', score: 1 }, 'roastTraffic'],
    [{ reason: 'traffic', score: 1, theme: 'sundarbans' }, 'roastTrafficOther'], [{ reason: 'traffic', score: 1, theme: 'coxs' }, 'roastTrafficOther'],
    [{ reason: 'wall', score: 0 }, 'roastZero'], [{ reason: 'wall', score: 40, newBest: true }, 'roastBest'], [{ reason: 'board-full', score: 400 }, 'roastFull'],
    [{ reason: 'wall', score: 3, ghost: 'lost' }, 'roastGhost'], [{ reason: 'wall', score: 30, newBest: true, ghost: 'won' }, 'roastGhostWon'], [{ reason: 'self', score: 3, ghost: 'tie' }, 'roastGhostTie']
  ];
  for (const [run, bank] of cases) assert.equal(roastBank(run), bank);
});
test('duel voice lines say what actually happened, from the right side', () => {
  const cases = [
    [{ winner: 0, me: 0, reason: 'survivor', death: 'wall' }, 'duelWinWall'], [{ winner: 1, me: 1, reason: 'survivor', death: 'self' }, 'duelWinSelf'], [{ winner: 0, me: 0, reason: 'survivor', death: 'opponent' }, 'duelWinHit'],
    [{ winner: 1, me: 0, reason: 'survivor', death: 'wall' }, 'duelLoseWall'], [{ winner: 1, me: 0, reason: 'survivor', death: 'self' }, 'duelLoseSelf'], [{ winner: 0, me: 1, reason: 'survivor', death: 'opponent' }, 'duelLoseHit'],
    [{ winner: 0, me: 0, reason: 'time' }, 'duelWinTime'], [{ winner: 1, me: 0, reason: 'time' }, 'duelLoseTime'], [{ winner: 0, me: 0, reason: 'survivor', death: 'wall', matchOver: true }, 'duelMatchWin'], [{ winner: 1, me: 0, reason: 'survivor', matchOver: true }, 'duelMatchLose'],
    [{ winner: null, reason: 'double-crash', death: 'head-on' }, 'duelHeadOn'], [{ winner: null, reason: 'time' }, 'duelTie'], [{ winner: null, reason: 'double-crash', death: 'wall' }, 'draw'],
    [{ winner: 1, shared: true, reason: 'survivor', death: 'wall' }, 'playerTwoWin'], [{ winner: 0, shared: true, reason: 'time' }, 'playerOneWin']
  ];
  for (const [round, bank] of cases) assert.equal(duelBank(round), bank);
});
test('bite lines name the food on the board, and milestones take priority', () => {
  assert.deepEqual([0, 1, 2, 3].map(kind => biteBank({ apples: 1, kind })), ['foodFuchka', 'foodJhal', 'foodRosho', 'foodIlish']);
  assert.equal(biteBank({ apples: 5, kind: 2 }), 'speedUp'); assert.equal(biteBank({ apples: 10 }), 'bite10'); assert.equal(biteBank({ apples: 30 }), 'bite30');
  assert.equal(biteBank({ apples: 3, feast: true }), 'foodBiryani'); assert.equal(biteBank({ apples: 3, points: 3, arcade: true }), 'combo'); assert.equal(biteBank({ apples: 3, points: 3, kind: 1 }), 'foodJhal');
});
test('openers match the mode', () => {
  assert.equal(startBank({ duel: true, style: 'daily' }), 'duelStart'); assert.equal(startBank({ style: 'daily' }), 'startDaily'); assert.equal(startBank({ style: 'chaos' }), 'startChaos'); assert.equal(startBank({ style: 'chaos', theme: 'coxs' }), 'start'); assert.equal(startBank({ style: 'chaos', theme: 'sundarbans' }), 'start'); assert.equal(startBank({ style: 'ghost' }), 'startGhost'); assert.equal(startBank({ style: 'arcade' }), 'start'); assert.equal(startBank({ style: 'classic', skin: 'kalnagini' }), 'kalNagini'); assert.equal(startBank({ duel: true, skin: 'kalnagini' }), 'duelStart');
});
test('every bank a scenario can choose has real lines', () => {
  const banks = ['roastWallLow', 'roastWallMid', 'roastWallHigh', 'roastSelfLow', 'roastSelfHigh', 'roastTraffic', 'roastTrafficOther', 'roastBest', 'roastGhost', 'roastZero', 'roastGhostWon', 'roastGhostTie', 'roastFull', 'duelWinWall', 'duelWinSelf', 'duelWinHit', 'duelLoseWall', 'duelLoseSelf', 'duelLoseHit', 'duelWinTime', 'duelLoseTime', 'duelMatchWin', 'duelMatchLose', 'duelHeadOn', 'duelTie', 'playerOneWin', 'playerTwoWin', 'draw', 'foodFuchka', 'foodJhal', 'foodRosho', 'foodIlish', 'foodBiryani', 'speedUp', 'bite10', 'bite20', 'bite30', 'combo', 'startDaily', 'startChaos', 'startGhost', 'duelStart', 'start', 'danger', 'slip', 'momGone', 'rankOne', ...CHAOS_EVENTS, ...CHAOS_EVENTS.map(name => `${name}End`)];
  for (const bank of banks) { assert.ok(reactions[bank]?.length, bank); for (const line of reactions[bank]) assert.ok(phrases[line], line); }
});
test('prediction matches the real game on a clear path, and leaves the snapshot untouched', () => {
  const g = createGame({ mode: 'duel', seed: 3 }), snapshot = publicState(g), copy = structuredClone(snapshot);
  const shown = predict(snapshot, 3);
  for (let i = 0; i < 3; i++) step(g);
  assert.deepEqual(shown.snakes.map(s => s.body), g.snakes.map(s => s.body));
  assert.deepEqual(snapshot, copy);
});
test('prediction applies my queued turn straight away and never shows a death', () => {
  const snapshot = publicState(createGame({ mode: 'duel', seed: 3 }));
  assert.deepEqual(predict(snapshot, 1, 0, ['up']).snakes[0].body[0], { x: 4, y: 6 });
  const edge = structuredClone(snapshot); edge.snakes[0].body = [{ x: 19, y: 6 }, { x: 18, y: 6 }, { x: 17, y: 6 }, { x: 16, y: 6 }];
  const held = predict(edge, 5).snakes[0];
  assert.equal(held.alive, true); assert.deepEqual(held.body[0], { x: 19, y: 6 });
});
