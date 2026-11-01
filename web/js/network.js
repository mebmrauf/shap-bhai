import { predict, stepDuration } from './engine.js';
const MAX_AHEAD = 6, BLEND_MS_PER_CELL = 55;
const lerpBody = (from, to, f) => to.map((p, i) => { const q = from[i] ?? from.at(-1) ?? p; return { x: q.x + (p.x - q.x) * f, y: q.y + (p.y - q.y) * f }; });
// Turns snapshots from a slow link into steady motion. Display only: the server still decides everything.
export class SmoothView {
  constructor() { this.clock = null; this.round = 0; this.at = 0; this.drawn = null; this.truth = null; this.blendFrom = null; this.blendAt = 0; this.blendMs = 120; }
  frame(state, arrivedAt, latency, pending, now) {
    const game = state.game, duration = stepDuration(game);
    // In ticks: where the server should be by now, plus one so motion never needs a past state we lack.
    const target = game.tick + 1 + (now - arrivedAt + latency / 2 - (state.nextStepIn ?? 0)) / duration;
    const elapsed = Math.max(0, now - this.at) / duration; this.at = now;
    if (this.clock === null || this.round !== state.round || Math.abs(target - this.clock) > 4) this.clock = target;
    // One steady clock, nudged gently: each snapshot's timing noise must not move the snake backwards.
    else this.clock += Math.max(0, elapsed + (target - this.clock) * Math.min(1, elapsed * .35));
    this.round = state.round;
    const whole = Math.floor(this.clock), ahead = Math.max(0, Math.min(MAX_AHEAD, whole - game.tick + 1));
    const held = whole - game.tick + 1 > MAX_AHEAD || whole - game.tick + 1 < 1;
    const turns = [...(state.queued ?? []), ...pending], me = state.player;
    const shown = predict(game, ahead, me, turns), previous = ahead > 0 ? predict(game, ahead - 1, me, turns) : game;
    const fraction = held ? 1 : this.clock - whole;
    const truth = shown.snakes.map((s, i) => lerpBody(previous.snakes[i].body, s.body, fraction));
    // A wrong guess shows up as a sudden gap between frames. Slide across it instead of teleporting.
    const gap = !this.truth ? 0 : Math.max(...truth.map((body, i) => { const a = body[0], b = this.truth[i]?.[0]; return b ? Math.abs(a.x - b.x) + Math.abs(a.y - b.y) : 0; }));
    // Longer corrections take longer, so a big fix still reads as a slide.
    if (gap > .45) { this.blendFrom = this.drawn; this.blendAt = now; this.blendMs = Math.max(120, gap * BLEND_MS_PER_CELL); }
    let blend = 1;
    if (this.blendFrom) { blend = Math.min(1, (now - this.blendAt) / this.blendMs); if (blend >= 1) this.blendFrom = null; }
    const from = this.blendFrom ?? truth;
    this.drawn = truth.map((body, i) => lerpBody(from[i] ?? body, body, blend)); this.truth = truth;
    return { shown: { ...shown, snakes: shown.snakes.map((s, i) => ({ ...s, body: truth[i] })) }, before: { snakes: from.map(body => ({ body })) }, fraction: blend, stale: now - arrivedAt > 1500 };
  }
}
export class RoomConnection {
  constructor(onState, onError) { this.onState = onState; this.onError = onError; this.sequence = 0; this.pending = []; this.stopped = false; this.timer = null; this.lastSuccess = 0; this.state = null; this.secret = null; this.inFlight = false; this.readyWanted = false; this.latency = 150; this.failures = 0; this.sendingInputs = false; }
  async request(body, timeout = 8000) {
    const response = await fetch('/api/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeout) });
    const result = await response.json();
    if (!response.ok) { const error = new Error(result.error || 'Connection failed.'); error.status = response.status; throw error; }
    return result;
  }
  async open(action, code) {
    const state = await this.request({ action, code });
    this.secret = state.token;
    if (this.stopped) { this.request({ action: 'leave', code: state.code, token: this.secret }).catch(() => {}); return; }
    this.accept(state); this.schedule(0);
  }
  accept(state) {
    this.lastSuccess = performance.now();
    // Inputs travel on their own requests, so an older snapshot can arrive last. It may only confirm inputs.
    if (this.state?.game && state.game && this.state.round === state.round && state.game.tick < this.state.game.tick) { this.pending = this.pending.filter(p => p.seq > state.ack); return; }
    if (this.state?.round !== state.round || state.phase !== 'playing') this.pending = [];
    this.pending = this.pending.filter(p => p.seq > state.ack);
    this.state = state; this.onState(state);
  }
  turn(dir) {
    if (this.state?.phase !== 'playing' || this.pending.length >= 2) return;
    if (this.pending.at(-1)?.dir === dir) return;
    this.pending.push({ seq: ++this.sequence, dir });
    this.sendInputs();
  }
  // A turn must not wait for a slow sync to come back. Sequence numbers make a duplicate harmless.
  async sendInputs() {
    if (this.sendingInputs || this.stopped || !this.pending.length) return;
    this.sendingInputs = true;
    try {
      const state = await this.request({ action: 'sync', code: this.state.code, token: this.secret, round: this.state.round, inputs: this.pending.slice(0, 8) }, 3000);
      if (!this.stopped) this.accept(state);
    } catch { /* The regular sync retries the same inputs. */ }
    this.sendingInputs = false;
    if (this.pending.length && !this.stopped && performance.now() - this.lastSuccess < 1000) this.sendInputs();
  }
  schedule(ms = 60) { if (!this.stopped) this.timer = setTimeout(() => this.poll(), ms); }
  async poll() {
    if (this.stopped || this.inFlight) return;
    this.inFlight = true;
    const ready = this.readyWanted;
    const packet = { action: ready ? 'ready' : 'sync', code: this.state.code, token: this.secret, round: this.state.round, inputs: this.pending.slice(0, 8) };
    let wait = 60;
    const sentAt = performance.now();
    try {
      const state = await this.request(packet, 3000);
      this.failures = 0; this.latency += (performance.now() - sentAt - this.latency) * .2;
      if (!this.stopped) { this.accept(state); if (ready) this.readyWanted = false; }
    } catch (error) {
      if (this.stopped) return;
      if ([400, 401, 404].includes(error.status)) { this.stopped = true; this.onError(error.message, true); }
      else if (error.status === 409) { this.readyWanted = false; }
      else {
        wait = Math.min(1000, 150 * 2 ** this.failures++);
        // Brief drops are normal on mobile data, so stay quiet unless the gap is noticeable.
        if (performance.now() - this.lastSuccess > 1500) this.onError('Weak connection. Reconnecting…', false);
      }
    } finally { this.inFlight = false; this.schedule(wait); }
  }
  ready() { if (this.state?.phase === 'finished') this.readyWanted = true; }
  close() {
    this.stopped = true; clearTimeout(this.timer);
    if (this.state && this.secret) fetch('/api/rooms', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'leave', code: this.state.code, token: this.secret }) }).catch(() => {});
  }
}
