import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { GameAudio, phrases, phrasesEn, reactions, escapedDanger } from '../web/js/audio.js';
import { createGame, queueTurn, step } from '../web/js/engine.js';
function fixture() {
  globalThis.document = { hidden: false };
  const captions = [], settings = { voice: true, effects: false, music: false };
  const a = new GameAudio(settings, text => captions.push(text));
  for (const name of Object.keys(phrases)) a.clips.set(name, { paused: true, ended: false, currentTime: 0, pauses: 0, plays: 0,
    play() { this.paused = false; this.plays++; return Promise.resolve(); },
    pause() { this.paused = true; this.pauses++; }
  });
  return { a, settings, captions };
}
test('every reaction is backed by a generated clip and matching caption', async () => {
  const credits = JSON.parse(await readFile(new URL('../web/audio/credits.json', import.meta.url), 'utf8'));
  assert.deepEqual(credits.lines, phrases);
  assert.deepEqual(new Set(reactions.preview), new Set(Object.keys(phrases)));
  for (const bank of Object.values(reactions)) for (const name of bank) assert.ok(phrases[name]);
});
test('every English reaction is backed by a generated clip and matching caption', async () => {
  const credits = JSON.parse(await readFile(new URL('../web/audio/credits-en.json', import.meta.url), 'utf8'));
  assert.deepEqual(credits.lines, phrasesEn);
  assert.deepEqual(new Set(Object.keys(phrasesEn)), new Set(Object.keys(phrases)));
  for (const bank of Object.values(reactions)) for (const name of bank) assert.ok(phrasesEn[name]);
});
test('switching to English voices uses English clips and English captions', () => {
  const { a, captions } = fixture();
  a.setLanguage('en');
  for (const name of Object.keys(phrasesEn)) {
    a.clips.set(name, {
      paused: true, ended: false, currentTime: 0,
      play() { this.paused = false; return Promise.resolve(); },
      pause() { this.paused = true; }
    });
  }
  a.voice('start', true);
  assert.equal(captions.at(-1), phrasesEn.start);
  assert.equal(a.phrase('wall'), phrasesEn.wall);
});
test('repeated crashes rotate rather than repeating the same line', () => {
  const { a, captions } = fixture();
  for (let i = 0; i < 4; i++) a.voice('wall', true);
  assert.deepEqual(captions, [phrases.wall, phrases.scream, phrases.ah, phrases.wall]);
});
test('cooldown and existing speech suppress incidental reactions', () => {
  const { a } = fixture(); a.voice('start');
  assert.equal(a.voice('danger'), false); assert.equal(a.rotation.has('danger'), false);
  a.lastVoice = -Infinity; assert.equal(a.voice('eat'), false);
  a.current.paused = true; assert.equal(a.voice('eat'), true);
});
test('result reaction interrupts once, and repeated result snapshots let it finish', () => {
  const { a } = fixture(); a.setActive(true); a.voice('start'); const start = a.current;
  a.setActive(false); assert.equal(start.paused, true); a.voice('lose', true); const lose = a.current;
  a.setActive(false); a.setActive(false);
  assert.equal(lose.paused, false); assert.equal(lose.plays, 1);
});
test('mute and hidden tab suppress forced speech as well', () => {
  const { a, settings } = fixture(); a.voice('preview', true); const clip = a.current;
  settings.voice = false; a.update(); assert.equal(clip.paused, true); assert.equal(a.voice('win', true), false);
  settings.voice = true; document.hidden = true; assert.equal(a.voice('win', true), false); document.hidden = false;
});
test('late playback rejection cannot overwrite a newer caption', async () => {
  const { a, captions } = fixture(); let reject;
  a.clips.get('start').play = () => new Promise((_, no) => reject = no);
  a.voice('start', true); a.voice('wall', true); reject(new Error('cancelled')); await Promise.resolve();
  assert.equal(captions.at(-1), phrases.wall);
});
test('leaving the menu or game stops result and preview speech', () => {
  const { a, captions } = fixture(); a.voice('preview', true); const clip = a.current; a.stop();
  assert.equal(clip.paused, true); assert.equal(a.current, null); assert.equal(captions.at(-1), '');
});
test('close-call reaction requires a completed safe turn near danger', () => {
  const game = createGame(); game.snakes[0].body = [{x:18,y:10},{x:17,y:10},{x:16,y:10},{x:15,y:10}];
  const before = structuredClone(game); queueTurn(game,0,'up'); step(game);
  assert.equal(escapedDanger(before, game),true);
  game.status = 'finished'; assert.equal(escapedDanger(before, game),false);
});
test('ordinary movement and skipped network ticks do not trigger close calls', () => {
  const game = createGame(), before = structuredClone(game); queueTurn(game,0,'up'); step(game);
  assert.equal(escapedDanger(before,game),false);
  game.snakes[0].body[0] = {x:6,y:6}; assert.equal(escapedDanger(before,game),false);
});

function musicFixture() {
  const f = fixture(), sources = [], targets = [];
  f.settings.music = true;
  f.a.context = { currentTime: 10, destination: {},
    createBufferSource() { const source = { starts: 0, stops: 0, connect() {}, disconnect() {}, start() { this.starts++; }, stop() { this.stops++; } }; sources.push(source); return source; },
    createGain() { return { gain: { value: 0, setTargetAtTime(value) { targets.push(value); }, cancelScheduledValues() {} }, connect() {}, disconnect() {} }; }
  };
  f.a.musicBuffer = { duration: 14.25 };
  return { ...f, sources, targets };
}
test('pungi loops once across repeated updates, and stops on pause or mute', async () => {
  const { a, settings, sources } = musicFixture();
  a.setActive(true); a.setActive(true); await Promise.resolve();
  assert.equal(sources.length, 1); assert.equal(sources[0].loop, true); assert.equal(sources[0].starts, 1);
  a.setActive(false); assert.equal(sources[0].stops, 1);
  a.setActive(true); await Promise.resolve(); assert.equal(sources.length, 2);
  settings.music = false; a.update(); assert.equal(sources[1].stops, 1); assert.equal(a.musicSource, null);
});
test('music finishing its load after pause, mute, or hiding does not start', async () => {
  for (const cancel of [f => f.a.setActive(false), f => { f.settings.music = false; f.a.update(); }, () => { document.hidden = true; }]) {
    const f = musicFixture(); let resolve;
    f.a.loadMusic = () => new Promise(done => resolve = done);
    f.a.setActive(true); cancel(f); resolve({ duration: 14.25 }); await Promise.resolve();
    assert.equal(f.sources.length, 0);
  }
  document.hidden = false;
});
test('pungi ducks beneath reactions and restores volume when they finish or stop', async () => {
  const { a, targets, sources } = musicFixture();
  a.setActive(true); await Promise.resolve(); assert.equal(targets.at(-1), .30);
  a.voice('start', true); assert.equal(targets.at(-1), .07);
  a.current.onended(); assert.equal(targets.at(-1), .30);
  a.voice('wall', true); a.stopVoice(); assert.equal(targets.at(-1), .30);
  document.hidden = true; a.setActive(true); assert.equal(sources[0].stops, 1); document.hidden = false;
});
