import test from 'node:test';
import assert from 'node:assert/strict';
import { RoomConnection } from '../web/js/network.js';
function connection(){const delivered=[],errors=[];const c=new RoomConnection(s=>delivered.push(s),(message,fatal)=>errors.push({message,fatal}));c.schedule=()=>{};c.accept({code:'12345678',phase:'playing',round:1,ack:0});return {c,delivered,errors};}
test('acknowledgements retain inputs queued while a request was in flight',()=>{
  const {c}=connection();c.turn('up');c.turn('left');c.accept({code:'12345678',phase:'playing',round:1,ack:1});assert.deepEqual(c.pending,[{seq:2,dir:'left'}]);
});
test('round transitions clear pending input',()=>{
  const {c}=connection();c.turn('up');c.accept({code:'12345678',phase:'countdown',round:2,ack:0});assert.deepEqual(c.pending,[]);c.turn('left');assert.deepEqual(c.pending,[]);
});
test('retry after a lost response keeps the original input sequence',async()=>{
  const {c,errors}=connection();c.turn('up');const packets=[];c.request=async packet=>{packets.push(structuredClone(packet));throw new Error('offline');};await c.poll();await c.poll();assert.equal(packets.length,2);assert.deepEqual(packets[0].inputs,packets[1].inputs);assert.equal(c.pending[0].seq,1);assert.equal(errors[0].fatal,false);
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
