import { SIZE } from './engine.js';

export const phrases = Object.freeze({
  start: 'চলো ভাই, খেলা শুরু!', eat: 'উউহু!', combo: 'ওস্তাদ! দারুণ খেলছো!',
  wall: 'ওমাগো! মরে গেলাম গো!', self: 'আই ইয়ো!',
  win: 'জিতছি রে! মিষ্টি খাওয়াও!', lose: 'ও আল্লাহ! কী মারটাই না মারলো!',
  draw: 'দুইজনই শেষ! আবার হবে নাকি?', scream: 'আআআআআ!', ah: 'আআআহহ!',
  help: 'ও বাবা গো! কেউ বাঁচাও আমাকে!', run: 'পালাওওওও!',
  roastWall1: 'দেয়াল তো নড়ে নাই, ভাই।', roastWall2: 'শুরু হইতেই শেষ! এইটা কি ট্রেলার ছিল?',
  roastWall3: 'চোখ কই থাকে তোমার? ফোনে?', roastWall4: 'ভালোই তো চলতেছিল, দেয়াল দেইখা প্রেমে পড়ে গেলা?',
  roastWall5: 'ব্রেক কই ভাই? লোকাল বাসও এর চেয়ে ভালো চালায়।', roastWall6: 'এত কষ্টের সাপ, এক ধাক্কায় শেষ!',
  roastWall7: 'সবাই দেখছে, ওস্তাদ দেয়ালে গিয়া ঠেকছে।', roastSelf1: 'নিজের লেজ খাইয়া ফেললা? এত ক্ষুধা?',
  roastSelf2: 'শত্রু লাগে না, তুমি নিজেই যথেষ্ট।', roastSelf3: 'নিজের সাথেই মারামারি? থামো ভাই।',
  roastSelf4: 'এত লম্বা হইলা, নিজের লেজ চিনো না?', roastSelf5: 'গিঁট্টু লাইগা গেছে! এখন খুলবে কে?',
  roastTraffic1: 'জ্যামে মরলা! ঢাকায় স্বাগতম।', roastTraffic2: 'বাস কি তোমারে সাইড দিব ভাবছিলা?',
  roastBest1: 'নতুন রেকর্ড! আজকে ভাত বেশি খাইছো নাকি?', roastBest2: 'এই তো! এবার স্ক্রিনশট দিয়া সবাইরে জ্বালাও।',
  roastGhost1: 'ভূতের কাছেও হাইরা গেলা?', roastGhost2: 'ভূত তোমারে ধুইয়া দিল।',
  chaosPower: 'কারেন্ট গেলো! আবার?', chaosTraffic: 'সামনে জ্যাম! বাস আসতেছে!',
  chaosFlood: 'বৃষ্টি হইলো, রাস্তায় পানি!', chaosWedding: 'বিয়ে বাড়ি! বিরিয়ানি খাও!',
  foodFuchka: 'ফুচকায় ঝাল কম হইছে!', foodJhal: 'ঝালমুড়ি! ঝাল বেশি দিয়েন মামা!',
  foodRosho: 'রসগোল্লা! ডায়েট কাল থেকে।', foodIlish: 'ইলিশ! আজকে কপাল ভালো।',
  foodBiryani: 'বিরিয়ানি! আরেক প্লেট দেন মামা!', speedUp: 'গতি বাড়তেছে, সাবধান!',
  bite10: 'দশটা শেষ! পেট ভরে নাই?', bite20: 'বিশটা! সাপ তো হাতি হয়ে গেলো!',
  bite30: 'ত্রিশ! তুমি কি মানুষ?', startDaily: 'আজকের চ্যালেঞ্জ! পুরা দেশ দেখতেছে।',
  startChaos: 'ঢাকায় স্বাগতম! সাবধানে চালাও।', startGhost: 'ভূত রেডি! দৌড় দাও!',
  duelStart: 'দুই সাপ, এক মাঠ। শুরু!', closeCall1: 'অল্পের জন্য বাঁচলা!',
  closeCall2: 'আরেকটু হইলেই শেষ ছিল!', chaosPowerBack: 'কারেন্ট আসছে! বাঁচলাম!',
  chaosTrafficEnd: 'জ্যাম ছুটছে, টান দাও!', chaosFloodEnd: 'পানি নামছে!',
  chaosWeddingEnd: 'বিরিয়ানি শেষ! দাওয়াত খতম।', chaosSlip: 'সাঁতার জানো তো?',
  roastZero: 'একটাও খাইতে পারলা না?', roastGhostWon: 'ভূতরে হারাইলা! সাবাশ!',
  roastGhostTie: 'ভূতের সাথে ড্র! ভূতও অবাক।', roastFull: 'পুরা মাঠ তোমার! তুমিই ওস্তাদ!',
  duelWinWall: 'ও দেয়ালে মারছে! তুমি জিতেছো!', duelWinSelf: 'ও নিজের লেজ খাইছে! তুমি জিতেছো!',
  duelWinHit: 'ও তোমার গায়ে ধাক্কা খাইছে! রাউন্ড তোমার!', duelLoseWall: 'দেয়ালে মেরে রাউন্ড দিয়া দিলা!',
  duelLoseSelf: 'নিজের লেজ খাইয়া হারলা!', duelLoseHit: 'ওর গায়ে ধাক্কা! রাউন্ড গেলো!',
  duelWinTime: 'সময় শেষ! বেশি খাইয়া জিতলা!', duelLoseTime: 'সময় শেষ! ও বেশি খাইছে!',
  duelMatchWin: 'ম্যাচ তোমার! মিষ্টি খাওয়াও!', duelMatchLose: 'ম্যাচ গেলো! আবার হবে নাকি?',
  duelHeadOn: 'মুখোমুখি ধাক্কা! দুইজনই শেষ!', duelTie: 'সমান সমান! কেউ কম না!',
  playerOneWin: 'এক নম্বর খেলোয়াড় জিতেছে!', playerTwoWin: 'দুই নম্বর খেলোয়াড় জিতেছে!',
  momGone: 'আম্মু গেছে! চলো আবার!', rankOne: 'আজকের এক নম্বর তুমি!', kalNagini: 'কালনাগিনী আসছে! সবাই সরে দাঁড়াও!'
});
export const reactions = Object.freeze({
  start: ['start'], eat: ['eat'], combo: ['combo', 'eat'], win: ['win'], draw: ['draw'],
  wall: ['wall', 'scream', 'ah'], self: ['self', 'ah', 'scream'],
  lose: ['lose', 'wall', 'help', 'scream', 'ah'], danger: ['closeCall1', 'run', 'closeCall2', 'help'],
  preview: ['wall', 'help', 'run', 'lose', 'scream', 'ah', 'eat', 'self', 'win', 'start', 'combo', 'draw', 'roastWall1', 'roastWall2', 'roastWall3', 'roastWall4', 'roastWall5', 'roastWall6', 'roastWall7', 'roastSelf1', 'roastSelf2', 'roastSelf3', 'roastSelf4', 'roastSelf5', 'roastTraffic1', 'roastTraffic2', 'roastBest1', 'roastBest2', 'roastGhost1', 'roastGhost2', 'chaosPower', 'chaosTraffic', 'chaosFlood', 'chaosWedding', 'foodFuchka', 'foodJhal', 'foodRosho', 'foodIlish', 'foodBiryani', 'speedUp', 'bite10', 'bite20', 'bite30', 'startDaily', 'startChaos', 'startGhost', 'duelStart', 'closeCall1', 'closeCall2', 'chaosPowerBack', 'chaosTrafficEnd', 'chaosFloodEnd', 'chaosWeddingEnd', 'chaosSlip', 'roastZero', 'roastGhostWon', 'roastGhostTie', 'roastFull', 'duelWinWall', 'duelWinSelf', 'duelWinHit', 'duelLoseWall', 'duelLoseSelf', 'duelLoseHit', 'duelWinTime', 'duelLoseTime', 'duelMatchWin', 'duelMatchLose', 'duelHeadOn', 'duelTie', 'playerOneWin', 'playerTwoWin', 'momGone', 'rankOne', 'kalNagini'],
  roastWallLow: ['roastWall1', 'roastWall2', 'roastWall3'], roastWallMid: ['roastWall4', 'roastWall5', 'roastWall1'], roastWallHigh: ['roastWall6', 'roastWall7'],
  roastSelfLow: ['roastSelf1', 'roastSelf2', 'roastSelf3'], roastSelfHigh: ['roastSelf4', 'roastSelf5', 'roastSelf2'], roastTraffic: ['roastTraffic1', 'roastTraffic2'], roastTrafficOther: ['roastTraffic2'],
  roastBest: ['roastBest1', 'roastBest2'], roastGhost: ['roastGhost1', 'roastGhost2'],
  loadshedding: ['chaosPower'], traffic: ['chaosTraffic'], flood: ['chaosFlood'], wedding: ['chaosWedding'],
  loadsheddingEnd: ['chaosPowerBack'], trafficEnd: ['chaosTrafficEnd'], floodEnd: ['chaosFloodEnd'], weddingEnd: ['chaosWeddingEnd'], slip: ['chaosSlip'],
  roastZero: ['roastZero'], roastGhostWon: ['roastGhostWon'], roastGhostTie: ['roastGhostTie'], roastFull: ['roastFull'],
  foodFuchka: ['foodFuchka'], foodJhal: ['foodJhal'], foodRosho: ['foodRosho'], foodIlish: ['foodIlish'], foodBiryani: ['foodBiryani'],
  speedUp: ['speedUp'], bite10: ['bite10'], bite20: ['bite20'], bite30: ['bite30'],
  startDaily: ['startDaily'], startChaos: ['startChaos'], startGhost: ['startGhost'], duelStart: ['duelStart'],
  duelWinWall: ['duelWinWall'], duelWinSelf: ['duelWinSelf'], duelWinHit: ['duelWinHit'], duelLoseWall: ['duelLoseWall'], duelLoseSelf: ['duelLoseSelf'], duelLoseHit: ['duelLoseHit'],
  duelWinTime: ['duelWinTime'], duelLoseTime: ['duelLoseTime'], duelMatchWin: ['duelMatchWin'], duelMatchLose: ['duelMatchLose'], duelHeadOn: ['duelHeadOn'], duelTie: ['duelTie'],
  playerOneWin: ['playerOneWin'], playerTwoWin: ['playerTwoWin'], momGone: ['momGone'], rankOne: ['rankOne'], kalNagini: ['kalNagini']
});
// Every spoken line answers something that just happened. These are pure so each scenario can be tested.
export function roastBank({ reason, score = 0, newBest = false, ghost = null, theme = 'dhaka' } = {}) {
  if (reason === 'board-full' || reason === 'limit') return 'roastFull';
  if (ghost === 'won') return 'roastGhostWon';
  if (ghost === 'tie') return 'roastGhostTie';
  if (ghost === 'lost') return 'roastGhost';
  if (newBest) return 'roastBest';
  if (score === 0) return 'roastZero';
  if (reason === 'traffic') return ['coxs', 'sundarbans'].includes(theme) ? 'roastTrafficOther' : 'roastTraffic';
  if (reason === 'self') return score >= 10 ? 'roastSelfHigh' : 'roastSelfLow';
  return score >= 20 ? 'roastWallHigh' : score >= 5 ? 'roastWallMid' : 'roastWallLow';
}
export function duelBank({ winner, me = 0, shared = false, reason, death = null, matchOver = false }) {
  if (winner === null) return death === 'head-on' ? 'duelHeadOn' : reason === 'time' || reason === 'board-full' ? 'duelTie' : 'draw';
  // On one keyboard there is no "you", so the line names the player instead.
  if (shared) return winner === 0 ? 'playerOneWin' : 'playerTwoWin';
  const won = winner === me;
  if (matchOver) return won ? 'duelMatchWin' : 'duelMatchLose';
  if (reason === 'time' || reason === 'board-full') return won ? 'duelWinTime' : 'duelLoseTime';
  const how = death === 'wall' ? 'Wall' : death === 'self' ? 'Self' : 'Hit';
  return `duel${won ? 'Win' : 'Lose'}${how}`;
}
export function biteBank({ apples, points = 1, feast = false, kind = 0, arcade = false }) {
  if (feast) return 'foodBiryani';
  if ([10, 20, 30].includes(apples)) return `bite${apples}`;
  if (apples % 5 === 0) return 'speedUp';
  if (arcade && points >= 3) return 'combo';
  return ['foodFuchka', 'foodJhal', 'foodRosho', 'foodIlish'][kind];
}
export function startBank({ duel = false, style = 'classic', skin = 'nagin', theme = 'dhaka' } = {}) {
  if (duel) return 'duelStart';
  if (skin === 'kalnagini') return 'kalNagini';
  if (style === 'chaos') return ['coxs', 'sundarbans'].includes(theme) ? 'start' : 'startChaos';
  if (style === 'ghost') return 'startGhost';
  if (style === 'daily') return 'startDaily';
  return 'start';
}
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
// Fully decoded before use, so speech starts on the instant, never buffers mid-word, and needs no network once cached.
class DecodedClip {
  constructor(context, url) { this.context = context; this.url = url; this.buffer = null; this.loading = null; this.source = null; this.paused = true; this.ended = false; this.currentTime = 0; this.volume = 1; this.onended = null; this.onerror = null; }
  load() {
    this.loading ??= fetch(this.url, { signal: AbortSignal.timeout(20000) })
      .then(response => { if (!response.ok) throw new Error('Clip unavailable'); return response.arrayBuffer(); })
      .then(bytes => this.context.decodeAudioData(bytes))
      .then(buffer => { this.buffer = buffer; })
      .catch(error => { this.loading = null; throw error; });
    return this.loading;
  }
  play() {
    // A clip that arrives late is dropped, because a reaction to a moment already gone sounds broken.
    if (!this.buffer) { this.load().catch(() => {}); return Promise.reject(new Error('Clip not ready')); }
    if (this.context.state !== 'running') this.context.resume().catch(() => {});
    const source = this.context.createBufferSource(), gain = this.context.createGain();
    source.buffer = this.buffer; gain.gain.value = this.volume; source.connect(gain); gain.connect(this.context.destination);
    source.onended = () => {
      source.disconnect(); gain.disconnect();
      if (this.source !== source) return;
      this.source = null; this.paused = true; this.ended = true; this.onended?.();
    };
    // A short lead lets the music finish ducking before the first syllable.
    source.start(this.context.currentTime + .05);
    this.source = source; this.paused = false; this.ended = false;
    return Promise.resolve();
  }
  pause() {
    const source = this.source; this.source = null; this.paused = true;
    if (source) { try { source.stop(); } catch { /* Already finished. */ } }
  }
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
    if (this.context) {
      for (const name of Object.keys(phrases)) if (!this.clips.has(name)) this.clips.set(name, new DecodedClip(this.context, `/audio/${name}.mp3?v=neural-bn-2`));
      this.voicesReady = this.loadVoices();
    }
    this.musicFailed = false;
    if (this.settings.music) this.loadMusic();
  }
  // Three at a time keeps a weak connection responsive. Failed clips retry on the next unlock or play.
  async loadVoices() {
    const queue = [...this.clips.values()].filter(clip => !clip.buffer);
    const worker = async () => { while (queue.length) await queue.shift().load().catch(() => {}); };
    await Promise.all([worker(), worker(), worker()]);
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
    return this.play(this.pick(name));
  }
  pick(name) {
    const options = reactions[name];
    let index = this.rotation.get(name) ?? 0;
    if (options.length > 1 && options[index % options.length] === this.lastLine) index++;
    const line = options[index % options.length];
    this.rotation.set(name, index + 1); this.lastLine = line;
    return line;
  }
  play(line) {
    const clip = this.clips.get(line);
    if (!clip || !this.settings.voice || document.hidden) return false;
    this.lastVoice = performance.now();
    this.stopVoice();
    this.current = clip; clip.currentTime = 0; clip.volume = 1;
    const playbackId = this.playbackId;
    this.caption(phrases[line]); this.duckMusic(true);
    const finished = () => {
      if (playbackId !== this.playbackId) return;
      this.current = null; this.duckMusic(false);
    };
    clip.onended = finished;
    clip.onerror = () => {
      if (playbackId !== this.playbackId) return;
      finished(); // The caption already carries the line when its audio is missing.
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
      // Voice comes first: on a weak connection the words matter more than the backing track.
      this.musicLoading = Promise.resolve(this.voicesReady).then(() => fetch('/audio/pungi-loop.wav?v=nagin-been-2', { signal: AbortSignal.timeout(30000) }))
        .then(response => { if (!response.ok) throw new Error('Music unavailable'); return response.arrayBuffer(); })
        .then(bytes => this.context.decodeAudioData(bytes))
        .then(buffer => { this.musicBuffer = buffer; return buffer; })
        .catch(() => {
          this.musicFailed = true; this.musicLoading = null;
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
