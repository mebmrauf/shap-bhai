import { SIZE } from './engine.js';

export const phrases = Object.freeze({
  start: 'চল ভাই, খেলা শুরু!', eat: 'উউহু!', combo: 'ওস্তাদ! দারুণ খেলছো!',
  wall: 'ওমাগো! মরে গেলাম গো!', self: 'আই ইয়ো!',
  win: 'জিতছি রে! মিষ্টি খাওয়াও!', lose: 'ও আল্লাহ! কী মারটাই না মারলো!',
  draw: 'দুইজনই শেষ! আবার হবে নাকি?', scream: 'আআআআআ!', ah: 'আআআহহ!',
  help: 'ও বাবা গো! কেউ বাঁচাও আমাকে!', run: 'পালাওওওও!'
});
export const reactions = Object.freeze({
  start: ['start'], eat: ['eat'], combo: ['combo', 'eat'], win: ['win'], draw: ['draw'],
  wall: ['wall', 'scream', 'ah'], self: ['self', 'ah', 'scream'],
  lose: ['lose', 'wall', 'help', 'scream', 'ah'], danger: ['run', 'help', 'self'],
  preview: ['wall', 'help', 'run', 'lose', 'scream', 'ah', 'eat', 'self', 'win', 'start', 'combo', 'draw']
});

// A reaction to an actual escape, not a prediction that changes the game rules.
export function escapedDanger(previous, game, id = 0) {
  const old = previous?.snakes[id]?.body, snake = game?.snakes[id];
  if (game?.status !== 'playing' || !snake?.alive || !old || old.length < 2) return false;
  const head = old[0], neck = old[1], current = snake.body[0];
  const dx = head.x - neck.x, dy = head.y - neck.y;
  const mx = current.x - head.x, my = current.y - head.y;
  if (Math.abs(dx) + Math.abs(dy) !== 1 || Math.abs(mx) + Math.abs(my) !== 1 || (mx === dx && my === dy)) return false;
  const occupied = new Set(previous.snakes.flatMap(s => s.body.slice(0, -1)).map(p => `${p.x},${p.y}`));
  for (let n = 1; n <= 2; n++) {
    const x = head.x + dx * n, y = head.y + dy * n;
    if (x < 0 || y < 0 || x >= SIZE || y >= SIZE || occupied.has(`${x},${y}`)) return true;
  }
  return false;
}
export class GameAudio {
  constructor(settings, caption) {
    this.settings = settings; this.caption = caption; this.context = null; this.active = false;
    this.clips = new Map(); this.rotation = new Map(); this.lastLine = null; this.playbackId = 0; this.current = null; this.lastVoice = -Infinity; this.musicBuffer = null; this.musicSource = null; this.musicGain = null; this.musicLoading = null; this.musicFailed = false;
  }
  unlock() {
    try {
      this.context ??= new (window.AudioContext || window.webkitAudioContext)();
      this.context.resume().catch(() => {});
    } catch { /* Sound is optional when a browser cannot create an audio context. */ }
    for (const name of Object.keys(phrases)) if (!this.clips.has(name)) {
      const clip = new Audio(`/audio/${name}.wav?v=neural-bn-1`); clip.preload = 'auto'; this.clips.set(name, clip);
    }
    this.musicFailed = false;
    if (this.settings.music) this.loadMusic();
  }
  tone(frequency, duration = .1, type = 'sine', volume = .06, end = frequency) {
    const c = this.context;
    if (!c || c.state !== 'running') return;
    const o = c.createOscillator(), gain = c.createGain(), t = c.currentTime;
    o.type = type; o.frequency.setValueAtTime(frequency, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, end), t + duration);
    gain.gain.setValueAtTime(.001, t); gain.gain.linearRampToValueAtTime(volume, t + .008); gain.gain.exponentialRampToValueAtTime(.001, t + duration);
    o.connect(gain); gain.connect(c.destination); o.start(); o.stop(t + duration + .01);
  }
  effect(name) {
    if (this.settings.effects && !document.hidden) {
      if (name === 'eat') { this.tone(660, .11, 'triangle', .08, 990); }
      else if (name === 'crash') this.tone(150, .22, 'sawtooth', .035, 40);
      else if (name === 'count') this.tone(440, .08, 'sine', .05);
      else if (name === 'go') this.tone(880, .18, 'triangle', .07);
    }
  }
  voice(name, force = false) {
    const options = reactions[name];
    if (!options || !this.settings.voice || document.hidden) return false;
    const now = performance.now();
    if (!force && (now - this.lastVoice < 6500 || (this.current && !this.current.paused && !this.current.ended))) return false;
    let index = this.rotation.get(name) ?? 0;
    if (options.length > 1 && options[index % options.length] === this.lastLine) index++;
    const line = options[index % options.length], clip = this.clips.get(line);
    if (!clip) return false;
    this.rotation.set(name, index + 1); this.lastLine = line; this.lastVoice = now;
    this.stopVoice();
    this.current = clip; clip.currentTime = 0; clip.volume = .8;
    const playbackId = this.playbackId;
    this.caption(phrases[line]); this.duckMusic(true);
    const finished = () => {
      if (playbackId !== this.playbackId) return;
      this.current = null; this.duckMusic(false);
    };
    clip.onended = finished;
    clip.onerror = () => {
      if (playbackId !== this.playbackId) return;
      finished(); this.caption(`${phrases[line]} · Audio unavailable`);
    };
    clip.play().catch(clip.onerror);
    return true;
  }
  stopVoice() {
    this.playbackId++;
    if (this.current) { this.current.pause(); this.current.currentTime = 0; }
    this.current = null; this.duckMusic(false);
  }
  async loadMusic() {
    if (this.musicBuffer) return this.musicBuffer;
    if (!this.context || this.musicFailed) return null;
    if (!this.musicLoading) {
      this.musicLoading = fetch('/audio/pungi-loop.wav?v=nagin-been-2', { signal: AbortSignal.timeout(10000) })
        .then(response => { if (!response.ok) throw new Error('Music unavailable'); return response.arrayBuffer(); })
        .then(bytes => this.context.decodeAudioData(bytes))
        .then(buffer => { this.musicBuffer = buffer; return buffer; })
        .catch(() => {
          this.musicFailed = true; this.musicLoading = null;
          if (this.active && !this.current) this.caption('Background music unavailable.');
          return null;
        });
    }
    return this.musicLoading;
  }
  async startMusic() {
    if (!this.context || !this.active || !this.settings.music || document.hidden || this.musicSource) return;
    const buffer = await this.loadMusic();
    // A download may finish after pause, mute, or a tab switch.
    if (!buffer || !this.active || !this.settings.music || document.hidden || this.musicSource) return;
    const source = this.context.createBufferSource(), gain = this.context.createGain();
    source.buffer = buffer; source.loop = true;
    gain.gain.value = 0; source.connect(gain); gain.connect(this.context.destination);
    this.musicSource = source; this.musicGain = gain;
    this.duckMusic(!!this.current && !this.current.paused && !this.current.ended);
    source.start();
  }
  duckMusic(ducked) {
    if (!this.musicGain || !this.context) return;
    this.musicGain.gain.setTargetAtTime(ducked ? .07 : .30, this.context.currentTime, .08);
  }
  stopMusic() {
    if (!this.musicSource) return;
    const source = this.musicSource, gain = this.musicGain, t = this.context.currentTime;
    gain.gain.cancelScheduledValues(t); gain.gain.setTargetAtTime(0, t, .015);
    source.onended = () => { source.disconnect(); gain.disconnect(); };
    source.stop(t + .08); this.musicSource = null; this.musicGain = null;
  }
  setActive(active) {
    const wasActive = this.active;
    this.active = active;
    if (!active || document.hidden) {
      this.stopMusic();
      // Repeated online result snapshots must not cut off the loss/win reaction.
      if (wasActive || document.hidden) this.stopVoice();
      return;
    }
    if (this.settings.music) this.startMusic();
    else this.stopMusic();
  }
  update() {
    if (!this.settings.voice) { this.stopVoice(); this.caption(''); }
    this.setActive(this.active);
  }
  stop() { this.setActive(false); this.stopVoice(); this.caption(''); }
}
