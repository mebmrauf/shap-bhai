const phrases = {
  start: 'চল ভাই, খেলা শুরু!', eat: 'বাহ! মজা তো!', combo: 'ওস্তাদ! দারুণ খেলছো!',
  wall: 'আরে ভাই! সামনে দেয়াল!', self: 'নিজের লেজই খেয়ে ফেললে!',
  win: 'জিতছো ভাই! মিষ্টি খাওয়াও!', lose: 'আহারে! আরেকবার হবে নাকি?', draw: 'দুইজনই ওস্তাদ! আবার খেলো!'
};
export class GameAudio {
  constructor(settings, caption) {
    this.settings = settings; this.caption = caption; this.context = null; this.active = false;
    this.clips = new Map(); this.current = null; this.lastVoice = -Infinity; this.beat = 0; this.timer = null;
  }
  unlock() {
    try {
      this.context ??= new (window.AudioContext || window.webkitAudioContext)();
      this.context.resume().catch(() => {});
    } catch { /* Sound is optional when a browser cannot create an audio context. */ }
    for (const name of Object.keys(phrases)) if (!this.clips.has(name)) {
      const clip = new Audio(`/audio/${name}.wav`); clip.preload = 'auto'; this.clips.set(name, clip);
    }
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
    if (!this.settings.voice || document.hidden) return;
    const now = performance.now();
    if (!force && now - this.lastVoice < 6500) return;
    this.lastVoice = now; this.caption(phrases[name]);
    if (this.current) { this.current.pause(); this.current.currentTime = 0; }
    const clip = this.clips.get(name);
    if (!clip) return;
    this.current = clip; clip.currentTime = 0; clip.volume = .65;
    clip.play().catch(() => this.caption(`${phrases[name]} · Audio unavailable`));
  }
  setActive(active) {
    this.active = active;
    clearInterval(this.timer); this.timer = null;
    if (!active || document.hidden) { this.current?.pause(); return; }
    if (this.settings.music) {
      // Original 6/8 plucked melody and low drum pattern; no song samples.
      const notes = [293.66, 349.23, 392, 440, 392, 349.23, 293.66, 0, 440, 523.25, 440, 392];
      this.timer = setInterval(() => {
        if (!this.active || !this.settings.music) return;
        const beat = this.beat++ % 12;
        if (beat % 3 === 0) this.tone(110, .17, 'sine', .055, 42);
        else this.tone(beat % 2 ? 260 : 190, .045, 'triangle', .023, 90);
        if (notes[beat]) this.tone(notes[beat], .17, 'triangle', .022);
      }, 210);
    }
  }
  update() {
    if (!this.settings.voice) { this.current?.pause(); this.caption(''); }
    this.setActive(this.active);
  }
  stop() { this.setActive(false); this.caption(''); }
}
