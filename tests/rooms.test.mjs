import test from 'node:test';
import assert from 'node:assert/strict';
import { Rooms } from '../scripts/rooms.mjs';
import { createServer } from '../scripts/server.mjs';
function fixture(){let time=1000;const rooms=new Rooms({now:()=>time,seed:()=>42});const a=rooms.create();const b=rooms.join(a.code);return {rooms,a,b,set:t=>time=t, sync:(p,extra={})=>rooms.request({action:'sync',code:a.code,token:p.token,round:1,...extra})};}
test('room membership is limited and tokens are private per player',()=>{
  const {rooms,a,b}=fixture();assert.equal(a.player,0);assert.equal(b.player,1);assert.notEqual(a.token,b.token);assert.equal(b.phase,'countdown');assert.throws(()=>rooms.join(a.code),/two players/);assert.throws(()=>rooms.request({action:'sync',code:a.code,token:'a'.repeat(48)}),/Invalid room/);assert.equal(JSON.stringify(b.game).includes(a.token),false);
});
test('server advances without a client and start countdown is shared',()=>{
  const {rooms,a,b,set,sync}=fixture();set(3999);rooms.advance();assert.equal(sync(a).game.tick,0);set(4140);rooms.advance();const s=sync(a);assert.equal(s.phase,'playing');assert.equal(s.game.tick,1);assert.deepEqual(sync(b).game,s.game);
});
test('input packets are idempotent and stale-round inputs are acknowledged but ignored',()=>{
  const {rooms,a,set,sync}=fixture();set(4010);rooms.advance();sync(a,{inputs:[{seq:1,dir:'up'}]});sync(a,{inputs:[{seq:1,dir:'up'}]});assert.deepEqual(rooms.get(a.code).game.snakes[0].queue,['up']);sync(a,{round:0,inputs:[{seq:2,dir:'left'}]});assert.deepEqual(rooms.get(a.code).game.snakes[0].queue,['up']);assert.equal(sync(a).ack,2);
});
test('cannot mutate before countdown and invalid input is rejected',()=>{
  const {rooms,a,sync}=fixture();sync(a,{inputs:[{seq:1,dir:'up'}]});assert.deepEqual(rooms.get(a.code).game.snakes[0].queue,[]);assert.throws(()=>sync(a,{inputs:[{seq:2,dir:'warp'}]}),/Invalid input/);assert.throws(()=>sync(a,{inputs:Array(9).fill({seq:2,dir:'up'})}),/Too many/);
});
test('both players must ready before next round; wins preserved',()=>{
  const {rooms,a,b,set,sync}=fixture();for(let t=4000;t<7000;t+=140){set(t);rooms.advance();}const s=sync(a);assert.equal(s.phase,'finished');
  const room=rooms.get(a.code);room.wins=[1,0];rooms.request({action:'ready',code:a.code,token:a.token,round:1});assert.equal(sync(a).phase,'finished');rooms.request({action:'ready',code:a.code,token:b.token,round:1});assert.equal(sync(a).phase,'countdown');assert.equal(sync(a).round,2);assert.deepEqual(sync(a).wins,[1,0]);
});
test('new match resets wins only after both accept',()=>{
  const {rooms,a,b}=fixture();const room=rooms.get(a.code);room.phase='finished';room.wins=[3,1];room.round=5;
  rooms.request({action:'ready',code:a.code,token:a.token,round:5});assert.deepEqual(room.wins,[3,1]);rooms.request({action:'ready',code:a.code,token:b.token,round:5});assert.deepEqual(room.wins,[0,0]);assert.equal(room.round,1);
});
test('disconnect closes room and reconnect cannot resurrect match',()=>{
  const {rooms,a,b,set}=fixture();set(21001);rooms.advance();assert.throws(()=>rooms.request({action:'sync',code:a.code,token:a.token}),/disconnected/);assert.throws(()=>rooms.join(a.code),/disconnected/);
});
test('explicit leave closes room for both players',()=>{
  const {rooms,a,b,sync}=fixture();rooms.request({action:'leave',code:a.code,token:a.token});assert.throws(()=>sync(b),/left/);
});
test('stalled server never fast-forwards an entire unseen game',()=>{const {rooms,a,set,sync}=fixture();set(8000);rooms.advance();assert.equal(sync(a).game.tick,1);});
test('HTTP boundary validates methods, JSON, origins and room requests',async t=>{
  const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));const base=`http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(base+'/api/rooms')).status,405);
  assert.equal((await fetch(base+'/api/rooms',{method:'POST',body:'{}'})).status,415);
  assert.equal((await fetch(base+'/api/rooms',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://evil.invalid'},body:'{}'})).status,403);
  assert.equal((await fetch(base+'/api/rooms',{method:'POST',headers:{'Content-Type':'application/json'},body:'{' })).status,400);
  const response=await fetch(base+'/api/rooms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'create'})});assert.equal(response.status,200);assert.equal((await response.json()).phase,'waiting');
  assert.equal((await fetch(base+'/.env')).status,404);assert.equal((await fetch(base+'/')).status,200);assert.match((await fetch(base+'/audio/win.wav')).headers.get('content-type'),/audio/);
});
test('snapshots reveal neither room credentials nor queued future turns',()=>{
  const {rooms,a,set,sync}=fixture();set(4010);rooms.advance();sync(a,{inputs:[{seq:1,dir:'up'}]});const s=sync(a);assert.equal('queue' in s.game.snakes[0],false);assert.equal('randomState' in s.game,false);assert.equal('token' in s,false);
});
