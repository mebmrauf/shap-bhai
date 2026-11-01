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
