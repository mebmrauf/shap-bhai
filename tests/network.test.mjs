import test from 'node:test';
import assert from 'node:assert/strict';
import { RoomConnection, SmoothView } from '../web/js/network.js';
import { createGame, publicState, queueTurn, step } from '../web/js/engine.js';
function connection(){const delivered=[],errors=[];const c=new RoomConnection(s=>delivered.push(s),(message,fatal)=>errors.push({message,fatal}));c.schedule=()=>{};c.accept({code:'12345678',phase:'playing',round:1,ack:0});return {c,delivered,errors};}
test('acknowledgements retain inputs queued while a request was in flight',()=>{
  const {c}=connection();c.turn('up');c.turn('left');c.accept({code:'12345678',phase:'playing',round:1,ack:1});assert.deepEqual(c.pending,[{seq:2,dir:'left'}]);
});
test('round transitions clear pending input',()=>{
  const {c}=connection();c.turn('up');c.accept({code:'12345678',phase:'countdown',round:2,ack:0});assert.deepEqual(c.pending,[]);c.turn('left');assert.deepEqual(c.pending,[]);
});
test('retry after a lost response keeps the original input sequence',async()=>{
  const {c,errors}=connection();c.turn('up');const packets=[];c.request=async packet=>{packets.push(structuredClone(packet));throw new Error('offline');};c.lastSuccess=-10000;await c.poll();await c.poll();assert.equal(packets.length,2);assert.deepEqual(packets[0].inputs,packets[1].inputs);assert.equal(c.pending[0].seq,1);assert.equal(errors[0].fatal,false);
});
test('a turn is sent at once, even while a slow sync is still in flight',async()=>{
  const {c}=connection();c.inFlight=true;const packets=[];c.request=async packet=>{packets.push(structuredClone(packet));return {code:'12345678',phase:'playing',round:1,ack:1};};
  c.turn('up');await new Promise(done=>setTimeout(done));assert.equal(packets.length,1);assert.deepEqual(packets[0].inputs,[{seq:1,dir:'up'}]);assert.deepEqual(c.pending,[]);
});
test('a snapshot arriving out of order confirms inputs but cannot rewind the game',()=>{
  const {c,delivered}=connection();c.accept({code:'12345678',phase:'playing',round:1,ack:0,game:{tick:10}});c.turn('up');const shown=delivered.length;
  c.accept({code:'12345678',phase:'playing',round:1,ack:1,game:{tick:9}});
  assert.equal(c.state.game.tick,10);assert.equal(delivered.length,shown);assert.deepEqual(c.pending,[]);
});
test('a brief network drop stays quiet, and a long one says so',async()=>{
  const {c,errors}=connection();c.request=async()=>{throw new Error('offline');};await c.poll();assert.equal(errors.length,0);
  c.lastSuccess=-10000;await c.poll();assert.equal(errors.length,1);assert.equal(errors[0].fatal,false);
});
test('a closed room stops polling with one actionable error',async()=>{
  const {c,errors}=connection();c.request=async()=>{const e=new Error('Your opponent left.');e.status=404;throw e;};await c.poll();assert.equal(c.stopped,true);assert.equal(errors.length,1);assert.equal(errors[0].fatal,true);
});
test('poll cannot overlap another request',async()=>{
  const {c}=connection();c.inFlight=true;let requests=0;c.request=async()=>requests++;await c.poll();assert.equal(requests,0);
});
test('readiness race falls back to syncing rather than retrying ready forever',async()=>{
  const {c}=connection();c.state.phase='finished';c.ready();c.request=async()=>{const e=new Error('Round started');e.status=409;throw e;};await c.poll();assert.equal(c.readyWanted,false);assert.equal(c.stopped,false);
});
const roomState=(game,extra={})=>({player:0,round:1,nextStepIn:0,queued:[],game:publicState(game),...extra});
const headAt=view=>{const a=view.before.snakes[0].body[0],b=view.shown.snakes[0].body[0];return {x:a.x+(b.x-a.x)*view.fraction,y:a.y+(b.y-a.y)*view.fraction};};
test('the view moves along my turn, even once the server only has it queued',()=>{
  const g=createGame({mode:'duel',seed:3}),v=new SmoothView();
  const view=v.frame(roomState(g,{queued:['up']}),0,0,[],70);
  assert.ok(headAt(view).y<6);assert.equal(view.shown.snakes[0].dir,'up');
});
test('motion stays continuous and forward while snapshot timing wobbles',()=>{
  const g=createGame({mode:'duel',seed:3}),v=new SmoothView();let last=null,arrived=0;
  for(let now=0;now<420;now+=16){if(now%160===0)arrived=now-(now%320?30:0);const state=roomState(g);state.nextStepIn=0;const x=headAt(v.frame(state,0,now%320?120:40,[],now)).x;if(last!==null){assert.ok(x>=last-1e-9);assert.ok(x-last<.45);}last=x;}
});
test('a wrong guess slides to the truth rather than teleporting',()=>{
  const g=createGame({mode:'duel',seed:3}),v=new SmoothView();
  const guess=headAt(v.frame(roomState(g),0,0,[],400));
  queueTurn(g,0,'up');for(let i=0;i<3;i++)step(g);
  const fixed=v.frame(roomState(g),416,0,[],416);
  const moved=headAt(fixed);assert.ok(Math.abs(moved.x-guess.x)+Math.abs(moved.y-guess.y)<.45);
  let settled;for(let now=432;now<1100;now+=16)settled=v.frame(roomState(g),416,0,[],now);
  assert.equal(settled.fraction,1);assert.equal(settled.shown.snakes[0].dir,'up');
});
test('a long silence is flagged and prediction stops guessing',()=>{
  const g=createGame({mode:'duel',seed:3}),v=new SmoothView();
  const view=v.frame(roomState(g),0,0,[],5000);
  assert.equal(view.stale,true);assert.deepEqual(view.shown.snakes[0].body[0],{x:10,y:7});
});
