import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, step, queueTurn, stepDuration, chooseBotTurn, makeRecording, replayRecording, swipeTurn, canTurn, COMBO_MS, MAX_TICKS, ROUND_MS, SIZE } from '../web/js/engine.js';
test('only a sideways press can turn a snake', () => {
  assert.equal(canTurn('right','up'),true);assert.equal(canTurn('right','right'),false);assert.equal(canTurn('right','left'),false);
});
test('a curved swipe makes one turn, and a long sideways move makes a second', () => {
  const run = points => { const swipe = { x: 0, y: 0 }; return points.map(([x, y]) => swipeTurn(swipe, x, y)).filter(Boolean); };
  assert.deepEqual(run([[2, -10], [6, -20], [14, -34], [26, -46], [40, -54]]), ['up']);
  assert.deepEqual(run([[0, -24], [20, -26], [40, -28], [60, -30]]), ['up', 'right']);
  assert.deepEqual(run([[5, 5]]), []);
});
const body = (...points) => points.map(([x,y]) => ({ x,y }));
function duel() { return createGame({ mode: 'duel', seed: 123 }); }
function place(g, id, cells, dir) { g.snakes[id].body = body(...cells); g.snakes[id].dir = dir; g.snakes[id].queue = []; }
test('settings reject unsupported modes, speed and seeds', () => {
  for (const options of [{mode:'oops'},{speed:'__proto__'},{seed:NaN},{seed:1.3}]) assert.throws(() => createGame(options));
});
test('one cell per tick and first apple grows exactly once', () => {
  const g = createGame(); for (let i=0;i<4;i++) step(g);
  assert.deepEqual(g.snakes[0].body[0], {x:10,y:10}); assert.equal(g.snakes[0].score,1); assert.equal(g.snakes[0].body.length,5); assert.equal(g.snakes[0].apples,1);
});
test('reverse rejected and two quick turns are applied on separate ticks', () => {
  const g=createGame(); assert.equal(queueTurn(g,0,'left'),false); assert.ok(queueTurn(g,0,'up')); assert.ok(queueTurn(g,0,'left')); assert.equal(queueTurn(g,0,'down'),false);
  step(g); assert.deepEqual(g.snakes[0].body[0],{x:6,y:9}); step(g); assert.deepEqual(g.snakes[0].body[0],{x:5,y:9});
});
test('repeated and malformed directions never eat the queue', () => {
  const g=createGame(); for(const dir of ['right','__proto__','constructor',null,'wrong']) assert.equal(queueTurn(g,0,dir),false);
  assert.equal(g.snakes[0].queue.length,0); assert.equal(queueTurn(g,9,'up'),false);
});
test('wall collision finishes once; later steps cannot mutate the result', () => {
  const g=createGame(); place(g,0,[[19,4],[18,4],[17,4]],'right'); step(g); assert.equal(g.reason,'wall'); assert.equal(g.status,'finished'); const saved=structuredClone(g); step(g); assert.deepEqual(g,saved);
});
test('moving into your own vacating tail is legal', () => {
  const g=createGame(); place(g,0,[[3,3],[3,4],[2,4],[2,3]],'left'); step(g); assert.equal(g.status,'playing'); assert.deepEqual(g.snakes[0].body[0],{x:2,y:3});
});
test('non-tail body collision kills the snake', () => {
  const g=createGame(); place(g,0,[[3,3],[3,4],[2,4],[2,3],[1,3]],'left'); step(g); assert.equal(g.reason,'self');
});
test('same destination is a draw including a contested apple', () => {
  const g=duel(); place(g,0,[[4,5],[3,5],[2,5]],'right'); place(g,1,[[6,5],[7,5],[8,5]],'left'); g.food=[{x:5,y:5}]; step(g);
  assert.equal(g.reason,'double-crash'); assert.equal(g.winner,null); assert.deepEqual(g.snakes.map(s=>s.death),['head-on','head-on']); assert.deepEqual(g.snakes.map(s=>s.score),[0,0]);
});
test('swapped heads are a draw', () => {
  const g=duel(); place(g,0,[[4,5],[3,5],[2,5]],'right'); place(g,1,[[5,5],[6,5],[7,5]],'left'); step(g); assert.equal(g.winner,null); assert.equal(g.reason,'double-crash');
});
test('two different simultaneous deaths also draw', () => {
  const g=duel(); place(g,0,[[19,5],[18,5],[17,5]],'right'); place(g,1,[[0,10],[1,10],[2,10]],'left'); step(g); assert.equal(g.winner,null); assert.equal(g.reason,'double-crash');
});
test('survivor wins even when the crashed player had more apples', () => {
  const g=duel(); place(g,0,[[19,5],[18,5],[17,5]],'right'); g.snakes[0].score=100; step(g); assert.equal(g.winner,1);
});
test('opponent tail vacates unless opponent eats on that tick', () => {
  for(const growth of [false,true]) {
    const g=duel(); place(g,0,[[4,5],[3,5],[2,5]],'right'); place(g,1,[[7,5],[6,5],[5,5]],'right'); g.food=growth?[{x:8,y:5}]:[{x:10,y:10}]; step(g);
    assert.equal(g.snakes[0].alive,!growth); assert.equal(g.snakes[1].alive,true);
  }
});
test('duel outcomes do not depend on player traversal order', () => {
  const a=duel(); place(a,0,[[4,5],[3,5],[2,5]],'right'); place(a,1,[[6,5],[7,5],[8,5]],'left'); const b=structuredClone(a); b.snakes.reverse(); step(a); step(b);
  assert.equal(a.winner,b.winner); assert.equal(a.reason,b.reason); assert.deepEqual(a.snakes.map(s=>s.alive),b.snakes.reverse().map(s=>s.alive));
});
test('starting food and snakes have rotational symmetry', () => {
  const g=duel(); for(let i=0;i<4;i++){ assert.equal(g.snakes[0].body[i].x+g.snakes[1].body[i].x,19); assert.equal(g.snakes[0].body[i].y+g.snakes[1].body[i].y,19); }
  assert.equal(g.food[0].x+g.food[1].x,19); assert.equal(g.food[0].y+g.food[1].y,19);
});
test('duel speed stays equal regardless of apples', () => {
  const g=duel(); g.snakes[0].apples=100; g.snakes[1].apples=1; assert.equal(stepDuration(g),180);
});
test('timed rounds compare apples and tied scores draw', () => {
  for(const score of [0,2]) {const g=duel(); g.elapsedMs=ROUND_MS-140;g.snakes[1].score=score;step(g);assert.equal(g.reason,'time');assert.equal(g.winner,score?1:null);}
});
test('Arcade combo scores 1,2,3 and caps there', () => {
  const g=createGame({mode:'arcade'}); for(let i=0;i<4;i++){g.food=[{x:g.snakes[0].body[0].x+1,y:10}];step(g);} assert.equal(g.snakes[0].score,9);assert.equal(g.snakes[0].combo,3);assert.equal(g.snakes[0].apples,4);
});
test('combo expiration uses active simulation time only', () => {
  const g=createGame({mode:'arcade'}); g.snakes[0].combo=3;g.snakes[0].comboUntil=COMBO_MS;g.elapsedMs=COMBO_MS;g.food=[{x:7,y:10}];step(g);assert.equal(g.snakes[0].score,1);assert.equal(g.snakes[0].combo,1);
});
test('speed progression uses apples, not multiplied score, and has a floor', () => {
  const g=createGame({mode:'arcade'});g.snakes[0].score=99;assert.equal(stepDuration(g),140);g.snakes[0].apples=5;assert.equal(stepDuration(g),133);g.snakes[0].apples=300;assert.equal(stepDuration(g),85);
});
test('new food never overlaps the snake and deterministic seeds repeat', () => {
  const a=createGame({seed:42}), b=createGame({seed:42}); for(let i=0;i<4;i++){step(a);step(b);}assert.deepEqual(a,b);assert.ok(a.food.every(f=>!a.snakes[0].body.some(p=>p.x===f.x&&p.y===f.y)));
});
test('filling the entire board wins without a spawn retry loop', () => {
  const g=createGame();g.snakes[0].body=[{x:18,y:19}];for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++)if(!(x===19&&y===19)&&!(x===18&&y===19))g.snakes[0].body.push({x,y});g.food=[{x:19,y:19}];step(g);assert.equal(g.reason,'board-full');assert.equal(g.winner,0);assert.equal(g.snakes[0].body.length,400);
});
test('recordings reproduce complete games and reject tampering', () => {
  const g=createGame({seed:42});for(let i=0;i<5;i++)step(g);queueTurn(g,0,'up');while(g.status==='playing')step(g);
  const r=makeRecording(g);assert.deepEqual(replayRecording(r),g);assert.throws(()=>replayRecording({...r,score:r.score+1}));assert.throws(()=>replayRecording({...r,ticks:MAX_TICKS+1}));assert.throws(()=>replayRecording({...r,actions:[[1,0,'left']]}));
});
test('unfinished and arcade runs cannot masquerade as Classic ghosts', () => {assert.equal(makeRecording(createGame()),null);const g=createGame({mode:'arcade'});while(g.status==='playing')step(g);assert.equal(makeRecording(g),null);});
test('AI survives a straight wall approach and never reads the input queue', () => {
  const g=duel();place(g,1,[[0,10],[1,10],[2,10]],'left');const dir=chooseBotTurn(g);assert.ok(['up','down'].includes(dir));g.snakes[0].queue=['down','right'];assert.equal(chooseBotTurn(g),dir);queueTurn(g,1,dir);step(g);assert.equal(g.snakes[1].alive,true);
});
test('many seeded bot matches preserve body and score invariants', () => {
  for(let seed=1;seed<=30;seed++){
    const g=duel();g.randomState=seed;
    while(g.status==='playing') {
      for(let id=0;id<2;id++) queueTurn(g,id,chooseBotTurn(g,id));step(g);
      for(const s of g.snakes){assert.equal(s.body.length,4+s.apples);assert.equal(s.score,s.apples);if(s.alive)assert.equal(new Set(s.body.map(p=>`${p.x},${p.y}`)).size,s.body.length);}
    }
    assert.ok(g.tick<=Math.ceil(ROUND_MS/140));
  }
});
