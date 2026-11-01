import { randomBytes, timingSafeEqual } from 'node:crypto';
import { createGame, queueTurn, step, stepDuration, publicState } from '../web/js/engine.js';
const token = () => randomBytes(24).toString('hex');
const code = () => randomBytes(4).toString('hex').toUpperCase();
export class RoomError extends Error { constructor(message, status = 400) { super(message); this.status = status; } }
const assert = (ok, message, status) => { if (!ok) throw new RoomError(message, status); };
export class Rooms {
  constructor({ now = () => Date.now(), seed = () => randomBytes(4).readUInt32LE() } = {}) { this.rooms = new Map(); this.now = now; this.seed = seed; }
  player() { return { token: token(), seen: this.now(), seq: 0, ready: false }; }
  create() {
    this.advance();
    assert(this.rooms.size < 100, 'All tables are busy. Try again shortly.', 503);
    let id; do { id = code(); } while (this.rooms.has(id));
    const room = { code: id, players: [this.player(), null], phase: 'waiting', game: null, round: 1, wins: [0, 0], changed: this.now(), nextStep: 0, countdownEnd: 0, message: '' };
    this.rooms.set(id, room);
    return { ...this.snapshot(room, 0), token: room.players[0].token };
  }
  join(id) {
    const room = this.get(id);
    assert(room.phase === 'waiting' && !room.players[1], 'This room already has two players.', 409);
    room.players[1] = this.player(); room.players[0].ready = false;
    this.start(room);
    return { ...this.snapshot(room, 1), token: room.players[1].token };
  }
  get(id) {
    assert(typeof id === 'string' && /^[A-F0-9]{8}$/.test(id), 'Enter an 8-character room code.');
    const room = this.rooms.get(id);
    assert(room && room.phase !== 'closed', room?.message || 'Room not found. Ask your friend for a new code.', 404);
    return room;
  }
  authenticate(room, secret) {
    assert(typeof secret === 'string' && /^[a-f0-9]{48}$/.test(secret), 'Invalid room session.', 401);
    const id = room.players.findIndex(p => p && timingSafeEqual(Buffer.from(p.token), Buffer.from(secret)));
    assert(id >= 0, 'Invalid room session.', 401);
    room.players[id].seen = this.now();
    return id;
  }
  start(room) {
    room.phase = 'countdown'; room.countdownEnd = this.now() + 3000;
    room.nextStep = room.countdownEnd + 140; room.changed = this.now();
    room.game = createGame({ mode: 'duel', seed: this.seed() });
    for (const p of room.players) p.ready = false;
  }
  request(body) {
    assert(body && typeof body === 'object' && !Array.isArray(body), 'Expected a JSON object.');
    this.advance();
    if (body.action === 'create') return this.create();
    if (body.action === 'join') return this.join(body.code);
    const room = this.get(body.code), id = this.authenticate(room, body.token), player = room.players[id];
    if (body.action === 'leave') { room.phase = 'closed'; room.message = 'Your opponent left the room.'; room.changed = this.now(); return { phase: 'closed' }; }
    if (body.action === 'ready') {
      assert(room.phase === 'finished', 'Finish this round first.', 409);
      assert(body.round === room.round, 'That round has ended. Refresh the match.', 409);
      player.ready = true;
      if (room.players.every(p => p?.ready)) {
        if (room.wins.some(n => n >= 3)) { room.wins = [0, 0]; room.round = 1; }
        else room.round++;
        this.start(room);
      }
    } else if (body.action === 'sync') {
      const inputs = body.inputs ?? [];
      assert(Array.isArray(inputs) && inputs.length <= 8, 'Too many inputs.');
      for (const input of inputs) assert(input && Number.isSafeInteger(input.seq) && input.seq > 0 && ['up', 'down', 'left', 'right'].includes(input.dir), 'Invalid input.');
      for (const input of inputs) {
        if (input.seq <= player.seq) continue;
        assert(input.seq <= player.seq + 32, 'Input sequence out of range.');
        player.seq = input.seq;
        if (body.round === room.round && room.phase === 'playing') queueTurn(room.game, id, input.dir);
      }
    } else throw new RoomError('Unknown room action.');
    return this.snapshot(room, id);
  }
  advance() {
    const now = this.now();
    for (const [id, room] of this.rooms) {
      if (room.phase === 'closed') { if (now - room.changed > 60000) this.rooms.delete(id); continue; }
      if (room.players.some(p => p && now - p.seen > 20000)) {
        room.phase = 'closed'; room.message = 'A player disconnected. Create a new room to play again.'; room.changed = now; continue;
      }
      if (room.phase === 'countdown' && now >= room.countdownEnd) room.phase = 'playing';
      // A server stall extends the round instead of teleporting players to death.
      if (room.phase === 'playing' && now - room.nextStep > 700) room.nextStep = now;
      while (room.phase === 'playing' && now >= room.nextStep) {
        step(room.game); room.nextStep += stepDuration(room.game);
        if (room.game.status === 'finished') {
          room.phase = 'finished'; room.changed = now;
          if (room.game.winner !== null) room.wins[room.game.winner]++;
        }
      }
    }
  }
  snapshot(room, id) {
    return { code: room.code, player: id, phase: room.phase, round: room.round, wins: [...room.wins], ready: room.players.map(p => !!p?.ready), connected: room.players.map(Boolean), ack: room.players[id].seq, countdown: Math.max(0, room.countdownEnd - this.now()), nextStepIn: Math.max(0, room.nextStep - this.now()), game: room.game ? publicState(room.game) : null };
  }
}
