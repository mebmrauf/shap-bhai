import { createGame, queueTurn, clearTurns, step, stepDuration, makeRecording, replayRecording, dailySeed, dhakaDay, swipeTurn, canTurn } from './engine.js';
import { ArenaRenderer } from './render.js';
import { GameAudio, escapedDanger, roastBank, biteBank, startBank, phrases } from './audio.js';
import { THEMES, SKINS, foodKind } from './themes.js';
import { t, num, lang, applyLanguage } from './i18n.js';
import { keepUpdated } from './update.js';
import { sendLink, shareCard, bnDigits } from './social.js';
import { paintCard, CARD_STYLES } from './cards.js';
const $ = id => document.getElementById(id);
const ui = Object.fromEntries([...document.querySelectorAll('[id]')].map(el => [el.id, el]));
applyLanguage();
// Decides the controls and layout for tablets, whose width alone says nothing about touch.
if (matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints > 0 && !matchMedia('(hover: hover)').matches)) document.documentElement.dataset.touch = '';
const get = (key, fallback) => { try { const raw = localStorage.getItem(`snake-arena.v2.${key}`); return raw && raw.length < 2000000 ? JSON.parse(raw) : fallback; } catch { return fallback; } };
const put = (key, value) => { try { localStorage.setItem(`snake-arena.v2.${key}`, JSON.stringify(value)); return true; } catch { return false; } };
const saved = get('sound', {});
const sound = { effects: saved?.effects !== false, voice: saved?.voice !== false, music: saved?.music !== false };
let captionTimer;
const audio = new GameAudio(sound, text => { clearTimeout(captionTimer); ui.caption.textContent = text; if (ui.voicePreviewCaption) ui.voicePreviewCaption.textContent = text; if (text) captionTimer = setTimeout(() => { ui.caption.textContent = ''; if (ui.voicePreviewCaption) ui.voicePreviewCaption.textContent = ''; }, 6500); });
const renderer = new ArenaRenderer(ui.board);
let session = null, game = null, previous = null, screen = 'menu';
let frameAt = performance.now(), accumulator = 0, countdownEnd = 0, lastCount = null;
let ghost = null, recording = null, ghostIndex = 0, preview = null, resultSaved = '';
let resumeAfterLeave = false, slipSaid = false;
const prefs = { theme: 'dhaka', skin: 'nagin', flat: false, ...get('prefs', {}) };
let view3d = null, friendGhost = null, lastRun = null;
const CHAOS_STATUS = { loadshedding: "No power! Follow your head's glow.", traffic: 'Traffic jam! Get off the red cells.', flood: "Flooded road! You can't turn in the water.", wedding: 'Biryani! 3 points and extra growth.' };
const positions = g => ({ snakes: g.snakes.map(s => ({ body: s.body.map(p => ({ ...p })) })) });
function randomSeed() { return crypto.getRandomValues(new Uint32Array(1))[0] || 1; }
function bestKey(style = ui.style.value, speed = ui.speed.value) { return `best.${style === 'ghost' ? 'classic' : style}.${speed}`; }
function best(style, speed) { const n = get(bestKey(style, speed), 0); return Number.isInteger(n) && n >= 0 ? n : 0; }
function loadGhost(speed) {
  const record = get(`ghost.${speed}`, null);
  if (!record) return null;
  try { if (record.speed !== speed) return null; replayRecording(record); return record; } catch { return null; }
}
function error(message = '') { ui.setupError.textContent = message; ui.setupError.hidden = !message; }
function updateSetup() {
  const style = ui.style.value;
  error();
  const record = style === 'ghost' ? friendGhost?.record ?? loadGhost(ui.speed.value) : null;
  ui.speed.disabled = style === 'ghost' && !!friendGhost;
  const descriptions = {
    classic: t('The original rules. Eat, grow longer, and avoid walls and your tail.'),
    chaos: t('Load shedding, traffic jams, floods and wedding biryani, all on the way to your high score.'),
    ghost: friendGhost ? t("Race {name}'s {score}-point run on the same starting board. Their blue ghost cannot hit you.", { name: friendGhost.name, score: record.score }) : record ? t('Race your {score}-point best on the same starting board. The blue ghost cannot hit you.', { score: record.score }) : t('Finish a Classic run to set a ghost. Your first race records one automatically.')
  };
  ui.modeDescription.textContent = descriptions[style];
  const label = style === 'ghost' ? (friendGhost ? t('Race {name}', { name: friendGhost.name }) : record ? t('Race your ghost') : t('Record first ghost')) : style === 'chaos' ? t('Start the chaos') : t('Play Classic');
  playLabel(label);
  for (const el of document.querySelectorAll('[data-description]')) el.textContent = ui.modeDescription.textContent;
  renderCards();
  ui.bestLabel.parentElement.hidden = false; ui.bestLabel.hidden = false; ui.bestValue.textContent = num(best());
  ui.rulesText.replaceChildren();
  const paragraphs = [
    t('Use arrow keys, W A S D, the direction buttons, or swipe on the board. You cannot reverse into your neck.'),
    t('One turn is applied per movement step. Two quick turns can be queued. Escape or P pauses; switching tabs also pauses.'),
    t('Each bite adds a body segment. Speed increases slightly every 5 bites. Fill the board to win.'),
    ...(style === 'chaos' ? [t('Red cells become traffic in about two seconds, and hitting a bus ends the run. Floodwater carries you straight until you reach dry ground. Biryani scores 3. Chaos runs never count towards daily leaderboards.')] : style === 'ghost' ? [t('Your ghost replays its recorded turns on its own board. Both runs use the same seed; different routes can produce different later apple positions. Higher score wins; equal scores are a draw.')] : [])
  ];
  for (const text of paragraphs) { const p = document.createElement('p'); p.textContent = text; ui.rulesText.append(p); }
  ui.board.setAttribute('aria-label', t('Board preview. Your snake is ready.'));
  preview = createGame({ mode: 'classic', seed: 1 });
  preview.snakes[0].body = [{x:8,y:8},{x:7,y:8},{x:6,y:8},{x:5,y:8},{x:4,y:8},{x:4,y:9},{x:4,y:10},{x:4,y:11},{x:5,y:11},{x:6,y:11},{x:7,y:11}]; preview.food = [{x:13,y:8}];
  ui.p1Name.textContent = t('Your snake'); ui.p2Name.textContent = t('Best');
  if (ui.p2Mark) ui.p2Mark.hidden = true;
  ui.p1Score.textContent = num(0); ui.p2Score.textContent = num(best());
  ui.middleScore.textContent = style === 'ghost' ? t('GHOST RACE') : t(style.toUpperCase());
  ui.arenaLabel.textContent = t('THE PRACTICE GREEN');
  ui.statusText.textContent = t('Eat up. Keep your head clear.');
  ui.controlsHint.innerHTML = `<span><kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd> ${t('or')} <kbd>W A S D</kbd> ${t('to steer')}</span><span><kbd>Esc</kbd> ${t('pause')}</span>`;
}
function playControls(visible) {
  ui.pauseButton.hidden = !visible; ui.exitButton.hidden = !visible; ui.momButton.hidden = !visible;
  ui.touchControls.hidden = !visible; ui.controlsHint.hidden = !visible;
}
function overlay(eyebrow, title, text, button = '', action = null, focus = true) {
  playControls(false);
  ui.overlay.hidden = false; ui.overlayEyebrow.textContent = eyebrow; ui.overlayTitle.textContent = title; ui.overlayText.textContent = text;
  ui.continueButton.hidden = !button; ui.continueButton.textContent = button; ui.continueButton.onclick = action;
  ui.countdown.hidden = true; ui.resultActions.hidden = true; ui.rankText.hidden = true; ui.resultScore.hidden = true; ui.overlayTitle.removeAttribute('lang');
  if (focus) ui.overlayTitle.focus({ preventScroll: true });
}
function enterGame() {
  document.querySelector('.board-actions').prepend(ui.soundButton); ui.soundButton.textContent = t('Sound');
  ui.app.classList.add('playing'); ui.previewTag.hidden = true; ui.overlay.hidden = true; ui.exitButton.hidden = false;
  ui.pauseButton.hidden = false;
  ui.touchControls.hidden = false;
  ui.startButton.disabled = false;
  ui.board.setAttribute('tabindex', '0'); ui.board.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: 'instant' });
}
function beginLocalRound() {
  playControls(true);
  earlyTurns = {}; resultSaved = ''; recording = session.style === 'ghost' ? friendGhost?.record ?? loadGhost(session.speed) : null;
  const seed = recording?.seed ?? randomSeed();
  game = createGame({ mode: session.style === 'chaos' ? 'chaos' : 'classic', speed: session.speed, seed });
  previous = positions(game); accumulator = 0; ghostIndex = 0;
  ghost = recording ? createGame({ seed: recording.seed, speed: recording.speed }) : null;
  screen = 'countdown'; countdownEnd = performance.now() + 3000; lastCount = null;
  ui.overlay.hidden = true; ui.countdown.hidden = false; ui.countdownText.textContent = t('Get ready');
  ui.pauseButton.hidden = false; ui.pauseButton.textContent = t('Pause'); audio.stop(); updateHud();
}
function playLabel(text) {
  ui.startButton.replaceChildren(document.createTextNode(text)); const arrow = document.createElement('span'); arrow.textContent = '↗'; arrow.setAttribute('aria-hidden', 'true'); ui.startButton.append(arrow);
  for (const button of document.querySelectorAll('[data-play]')) button.textContent = text;
}
const CARD_NOTES = { classic: 'Pure snake, no surprises', chaos: 'Load shedding, jams, floods, biryani', ghost: 'Beat a replay of your best run' };
// The selects stay as the single source of truth; each card just sets one.
function cardsFor(select, container, decorate) {
  if (!select || !container) return;
  container.replaceChildren(...[...select.options].map(option => {
    const card = document.createElement('button'); card.type = 'button'; card.className = 'card'; 
    card.setAttribute('aria-pressed', String(option.value === select.value));
    const name = document.createElement('b'); name.textContent = option.textContent; card.append(name);
    if (CARD_NOTES[option.value]) { const note = document.createElement('small'); note.textContent = t(CARD_NOTES[option.value]); card.append(note); }
    decorate?.(card, option.value);
    card.onclick = () => { select.value = option.value; select.onchange(); };
    return card;
  }));
}
function renderCards() {
  cardsFor(ui.style, ui.styleCards); cardsFor(ui.speed, ui.speedCards);
  cardsFor(ui.viewStyle, ui.viewCards);
  ui.speedCards.classList.toggle('locked', ui.speed.disabled);
  for (const card of ui.speedCards.children) card.disabled = ui.speed.disabled;
  const swatch = colors => card => { const chip = document.createElement('i'); chip.className = 'swatch'; chip.style.background = `linear-gradient(135deg,${colors.join(',')})`; card.prepend(chip); };
  cardsFor(ui.theme, ui.themeCards, (card, value) => swatch([THEMES[value].sky, THEMES[value].tiles[0], THEMES[value].edge])(card));
  cardsFor(ui.skin, ui.skinCards, (card, value) => swatch(SKINS[value].body)(card));
  const chosen = SKINS[prefs.skin] ?? SKINS.nagin; ui.looksSummary.textContent = t(chosen.label); ui.snakeDot.style.background = `linear-gradient(135deg,${chosen.body.join(',')})`;
}
function showScreen(name) {
  for (const id of ['home', 'solo', 'looks', 'how']) if (ui[`${id}Screen`]) ui[`${id}Screen`].hidden = id !== name;
  error();
  (name === 'home' ? ui.startButton : ui[`${name}Screen`].querySelector('[data-back]')).focus({ preventScroll: true });
}
async function start() {
  if (ui.startButton.disabled || updater.applyPending(true)) return;
  error(); audio.unlock();
  session = { mode: 'solo', style: ui.style.value, speed: ui.style.value === 'ghost' && friendGhost ? friendGhost.record.speed : ui.speed.value };
  enterGame(); beginLocalRound();
}
function updateHud() {
  if (!game || !session) return;
  ui.arenaLabel.textContent = session.style === 'ghost' ? t('GHOST RACE') : t(session.style.toUpperCase());
  ui.p1Name.textContent = t('Your snake');
  ui.p2Name.textContent = ghost ? t('Ghost') : t('Best');
  ui.p1Score.textContent = num(game.snakes[0].score); ui.p2Score.textContent = num(ghost ? ghost.snakes[0].score : best(session.style, session.speed));
  if (ui.p2Mark) ui.p2Mark.hidden = true;
  ui.middleScore.textContent = session.style === 'ghost' ? (recording ? t('TARGET {n}', { n: recording.score }) : t('RECORDING')) : t('BITES');
  ui.timerText.textContent = t('{n} segments', { n: game.snakes[0].body.length });
  ui.statusText.textContent = game.chaos ? t(CHAOS_STATUS[game.chaos.name] ?? t('Enjoy the quiet while it lasts.')) : session.style === 'ghost' ? (recording ? (ghost?.status === 'finished' ? t('Ghost finished. Keep going to beat its score.') : t('The blue outline is your rival.')) : t('Finish this run to save your first ghost.')) : t('Find your rhythm. Watch your tail.');
  ui.board.setAttribute('aria-label', `Board. Score ${game.snakes[0].score}. Length ${game.snakes[0].body.length}.`);
}
// Routine lines wait their turn, so they never cut off an event announcement.
function handleEvents(events) {
  for (const e of events ?? []) {
    if (e.type === 'eat') { view3d?.effect('eat', e); audio.effect('eat'); const apples = game.snakes[0].apples, bank = biteBank({ apples, points: e.points, feast: e.feast, kind: foodKind(e.cell) }); audio.voice(bank, e.feast || bank.startsWith('bite')); }
    if (e.type === 'crash') { view3d?.effect('crash'); audio.effect('crash'); }
    // Traffic and floods speak on their warning, because that is when the player can still react.
    if (e.type === 'chaos') { if (e.phase === 'end') { slipSaid = false; audio.voice(`${e.name}End`); } else if (e.phase === 'warn' || !['traffic', 'flood'].includes(e.name)) audio.voice(e.name, true); }
  }
  if (!slipSaid && game?.chaos?.water.some(p => p.x === game.snakes[0].body[0].x && p.y === game.snakes[0].body[0].y)) { slipSaid = true; audio.voice('slip', true); }
  if (escapedDanger(previous, game, 0)) audio.voice('danger');
}
function saveRun() {
  const score = game.snakes[0].score, key = bestKey(session.style, session.speed);
  let ok = true;
  const newBest = score > best(session.style, session.speed);
  if (newBest) ok = put(key, score);
  const record = makeRecording(game);
  lastRun = { newBest, record, reason: game.reason, score, apples: game.snakes[0].apples, line: null };
  if (record) {
    const old = loadGhost(session.speed);
    if (!old || record.score > old.score || (record.score === old.score && record.ticks > old.ticks)) {
      ok = put(`ghost.${session.speed}`, record) && ok;
      resultSaved = ok ? t('Your best ghost is saved.') : t('Storage is unavailable; this ghost could not be saved.');
    } else resultSaved = t('Your previous best ghost is kept.');
  } else resultSaved = ok ? t('Best saved on this device.') : t('Storage is unavailable; this score could not be saved.');
}
function showResults() {
  ui.statusText.textContent = t('Run complete.'); ui.timerText.textContent = '';
  ui.pauseButton.hidden = true; ui.countdown.hidden = true; ui.continueButton.disabled = false; ui.menuButton.textContent = t('Back to menu');
  const score = game.snakes[0].score;
  const rival = friendGhost ? t("{name}'s ghost", { name: friendGhost.name }) : t('your ghost');
  const ghostResult = recording ? score > recording.score ? t('You beat {rival}.', { rival }) : score === recording.score ? t('A tie with {rival}.', { rival }) : t('{rival} keeps the crown.', { rival }) : null;
  const line = audio.pick(roastBank({ reason: game.reason, score, newBest: score > 0 && lastRun.newBest, ghost: !recording ? null : score > recording.score ? 'won' : score === recording.score ? 'tie' : 'lost' }));
  lastRun.line = phrases[line];
  overlay(t('RUN COMPLETE'), phrases[line], `${ghostResult ? `${ghostResult}\n` : ''}${t(game.snakes[0].apples === 1 ? '{n} bite · {sec} sec · {saved}' : '{n} bites · {sec} sec · {saved}', { n: game.snakes[0].apples, sec: Math.floor(game.elapsedMs / 1000), saved: resultSaved })}`, t('Play again'), () => { if (updater.applyPending(true)) return; audio.unlock(); beginLocalRound(); });
  ui.overlayTitle.lang = 'bn'; ui.resultScore.hidden = false; ui.resultScore.textContent = num(score); audio.play(line);
  ui.resultActions.hidden = false; ui.shareButton.hidden = false;
  lastRun.shot = copyBoard();
}
function pause() {
  if (!['playing', 'countdown'].includes(screen)) return;
  screen = 'paused'; clearTurns(game); audio.stop(); ui.pauseButton.textContent = t('Resume');
  overlay(t('TAKE A BREATHER'), t('Paused.'), t('Your snake and timers are waiting for you.'), t('Resume game'), resume);
}
function resume() {
  if (screen !== 'paused') return;
  audio.unlock(); playControls(true); clearTurns(game); accumulator = 0; screen = 'countdown'; countdownEnd = performance.now() + 1200; lastCount = null;
  ui.overlay.hidden = true; ui.countdown.hidden = false; ui.countdownText.textContent = t('Back in the game'); ui.pauseButton.textContent = t('Pause');
  ui.board.focus({ preventScroll: true });
}
function menu() {
  document.querySelector('.header-actions').append(ui.soundButton); ui.soundButton.textContent = t('Sound');
  game = null; previous = null; session = null; ghost = null; recording = null;
  ui.momButton.hidden = true; ui.resultActions.hidden = true;
  screen = 'menu'; ui.controlsHint.hidden = false; audio.stop(); ui.app.classList.remove('playing'); ui.overlay.hidden = true; ui.countdown.hidden = true; ui.previewTag.hidden = false;
  ui.pauseButton.hidden = true; ui.exitButton.hidden = true; ui.touchControls.hidden = true; ui.timerText.textContent = '';
  ui.startButton.disabled = false; ui.continueButton.disabled = false; ui.board.removeAttribute('tabindex'); ui.menuButton.textContent = t('Back to menu');
  if (!friendGhost) history.replaceState(null, '', location.pathname); updateSetup(); window.scrollTo({ top: 0, behavior: 'instant' }); showScreen('home'); updater.applyPending();
}
function requestLeave() {
  if (['result', 'waiting'].includes(screen)) { menu(); return; }
  resumeAfterLeave = ['playing', 'countdown'].includes(screen);
  pause(); ui.leaveText.textContent = t('This run will end. Unfinished runs are not saved as ghosts.');
  ui.leaveDialog.showModal(); ui.stayButton.focus();
}
// A press during the countdown is kept for the start. The snake reaches a wall about 2 seconds in, so losing it can cost the round.
let earlyTurns = {};
function releaseEarlyTurns() {
  for (const [id, dir] of Object.entries(earlyTurns)) { diagnostics?.note(`early turn ${dir}`); queueTurn(game, 0, dir); }
  earlyTurns = {};
}
function plannedDirection() {
  return game?.snakes[0].queue.at(-1) ?? game?.snakes[0].dir;
}
function steer(id, dir) {
  if (screen === 'countdown') { earlyTurns[0] = dir; diagnostics?.note(`held ${dir} for the start`); return; }
  if (screen !== 'playing') return;
  diagnostics?.note(`turn ${dir}, heading ${game.snakes[0].dir}`);
  queueTurn(game, 0, dir);
}
function advanceGhost() {
  if (!ghost || ghost.status !== 'playing') return;
  while (ghost.status === 'playing' && ghost.elapsedMs + stepDuration(ghost) <= game.elapsedMs) {
    if (recording.actions[ghostIndex]?.[0] === ghost.tick + 1) { queueTurn(ghost, 0, recording.actions[ghostIndex++][2]); }
    step(ghost);
  }
}
function frame(now) {
  // Scheduled first, so one bad frame can never freeze the game.
  requestAnimationFrame(frame);
  diagnostics?.frame(now);
  const dt = Math.min(250, now - frameAt); frameAt = now;
  if (screen === 'countdown') {
    const count = Math.max(1, Math.ceil((countdownEnd - now) / 1000));
    if (count !== lastCount) { ui.countdownNumber.textContent = count; lastCount = count; audio.effect('count'); }
    if (now >= countdownEnd) { screen = 'playing'; releaseEarlyTurns(); accumulator = 0; ui.countdown.hidden = true; audio.effect('go'); audio.setActive(true); if (game.tick === 0) audio.voice(startBank({ style: session.style, skin: prefs.skin }), true); }
  } else if (screen === 'playing') {
    accumulator += dt;
    while (game.status === 'playing' && accumulator >= stepDuration(game)) {
      accumulator -= stepDuration(game); previous = positions(game);
      step(game); advanceGhost(); handleEvents(game.events); updateHud();
      if (game.status === 'finished') {
        screen = 'result'; audio.setActive(false);
        saveRun();
        updateHud(); showResults();
      }
    }
  }
  let shown = screen === 'menu' || !game ? preview : game, shownBefore = screen === 'menu' ? null : previous;
  let fraction = screen !== 'playing' ? 1 : accumulator / stepDuration(game);
  const scene = view3d && !prefs.flat ? view3d : renderer;
  const free = freeSpace();
  document.documentElement.style.setProperty('--inset-b', `${free.bottom}px`);
  try {
    scene.setFree(free);
    scene.draw(shown, shownBefore, fraction, ghost, screen === 'menu');
  } catch (failure) {
    diagnostics?.note(`render failed: ${failure.message}`);
    // The 2D board can always take over from 3D.
    if (scene === view3d) { view3d = null; syncView(); }
  }
}
// The world fills the screen, so the camera needs to know which part the panels and HUD leave free.
let lastFree = null;
function freeSpace() {
  // The controls hide under a result card; the camera must not jump behind it.
  if (!ui.overlay.hidden && lastFree) return lastFree;
  return lastFree = measureFree();
}
function measureFree() {
  const vw = innerWidth, vh = innerHeight, gap = 10, free = { left: 0, right: 0, top: 0, bottom: 0 };
  const visible = el => { if (!el || el.hidden) return null; const r = el.getBoundingClientRect(); return r.width && r.height ? r : null; };
  if (!ui.app.classList.contains('playing')) {
    const panel = visible(ui.setup);
    free.top = (visible(document.querySelector('.site-header'))?.bottom ?? 0) * .75;
    if (panel) { if (panel.width > vw * .8) free.bottom = vh - panel.top + gap; else free.left = panel.right + gap; }
    return free;
  }
  const hud = ['.arena-top', '.scoreboard', '.arena-bottom', '.controls-hint', '.touch-controls'].map(selector => visible(document.querySelector(selector))).filter(Boolean);
  if (getComputedStyle(document.querySelector('.game-area')).getPropertyValue('--hud').trim() === 'side') {
    free.right = vw - Math.min(...hud.map(r => r.left)) + gap; free.top = free.bottom = gap;
    return free;
  }
  free.top = Math.max(gap, ...hud.filter(r => r.top < vh / 2).map(r => r.bottom)) + gap;
  free.bottom = vh - Math.min(vh - gap, ...hud.filter(r => r.top >= vh / 2).map(r => r.top)) + gap;
  return free;
}
function syncView() {
  renderer.flat = prefs.flat; ui.board3d.hidden = !view3d || prefs.flat;
  if (ui.viewStyle) ui.viewStyle.value = prefs.flat ? 'flat' : '3d';
}
function fillLooks() {
  ui.viewStyle.replaceChildren(
    new Option(t('3D view'), '3d', false, !prefs.flat),
    new Option(t('Flat view'), 'flat', false, prefs.flat)
  );
  ui.theme.replaceChildren(...Object.entries(THEMES).map(([value, theme]) => new Option(t(theme.label), value, false, value === prefs.theme)));
  ui.skin.replaceChildren(...Object.entries(SKINS).map(([value, skin]) => new Option(t(skin.label), value, false, value === prefs.skin)));
  renderCards();
}
// Copied now because the WebGL buffer is gone by the time someone taps Share.
function copyBoard() {
  try {
    const source = view3d && !prefs.flat ? view3d.snapshot() : ui.board, scale = source.width / innerWidth, free = lastFree ?? { left: 0, right: 0, top: 0, bottom: 0 };
    const x = free.left * scale, y = free.top * scale, width = source.width - x - free.right * scale, height = source.height - y - free.bottom * scale;
    const shot = document.createElement('canvas'); shot.width = width; shot.height = height;
    shot.getContext('2d').drawImage(source, x, y, width, height, 0, 0, width, height);
    return shot;
  } catch { return null; }
}
function openStudy() {
  pause(); ui.studyDialog.showModal(); document.title = 'Physics Notes · Chapter 4';
}
function syncLanguage() { ui.langButton.textContent = lang() === 'bn' ? 'English' : 'বাংলা'; ui.soundButton.textContent = t('Sound'); }
ui.langButton.onclick = () => { applyLanguage(lang() === 'bn' ? 'en' : 'bn'); syncLanguage(); fillLooks(); syncView(); updateSetup(); };
syncLanguage();
ui.momButton.onclick = openStudy; ui.studyClose.onclick = () => { ui.studyDialog.close(); audio.unlock(); audio.voice('momGone', true); };
ui.studyDialog.addEventListener('close', () => { document.title = 'Shap Bhai'; });
// Starts on a design that suits the run, then flips through the rest.
let cardIndex = 0, cardText = '';
async function showCard() {
  const run = lastRun; if (!run) return;
  ui.cardStatus.textContent = t('Making your card…'); ui.cardNext.disabled = ui.cardSend.disabled = true;
  try {
    cardText = await paintCard(ui.cardCanvas, CARD_STYLES[cardIndex % CARD_STYLES.length], { ...run, theme: prefs.theme }, { lang: lang(), shot: run.shot, host: location.host });
    ui.cardStatus.textContent = '';
  } catch { ui.cardStatus.textContent = t('Could not make the card. Try again.'); }
  ui.cardNext.disabled = ui.cardSend.disabled = false;
}
ui.shareButton.onclick = () => { ui.cardDialog.showModal(); showCard(); };
ui.cardNext.onclick = () => { cardIndex++; showCard(); };
ui.cardClose.onclick = () => ui.cardDialog.close();
ui.cardSend.onclick = async () => {
  ui.cardSend.disabled = true;
  try {
    const blob = await new Promise((resolve, reject) => ui.cardCanvas.toBlob(file => file ? resolve(file) : reject(new Error('No card')), 'image/png'));
    const result = await shareCard(blob, cardText, location.origin);
    ui.cardStatus.textContent = result === 'saved' ? t('Card saved to your device.') : result === 'shared' ? t('Shared!') : '';
  } catch { ui.cardStatus.textContent = t('Could not make the card. Try again.'); }
  ui.cardSend.disabled = false;
};
ui.soloMode.onclick = () => { updateSetup(); showScreen('solo'); };
ui.looksButton.onclick = () => showScreen('looks'); ui.snakeChip.onclick = () => showScreen('looks'); ui.howButton.onclick = () => showScreen('how');
for (const button of document.querySelectorAll('[data-back]')) button.onclick = () => showScreen('home');
for (const button of document.querySelectorAll('[data-play]')) button.onclick = start;
for (const id of ['speed']) if (ui[id]) ui[id].onchange = updateSetup;
ui.style.onchange = () => { friendGhost = null; updateSetup(); };
ui.viewStyle.onchange = () => { prefs.flat = ui.viewStyle.value === 'flat'; put('prefs', prefs); syncView(); renderCards(); };
ui.theme.onchange = () => { prefs.theme = ui.theme.value; put('prefs', prefs); view3d?.setTheme(prefs.theme); renderCards(); };
ui.skin.onchange = () => { prefs.skin = ui.skin.value; put('prefs', prefs); view3d?.setSkin(prefs.skin); renderer.skin = SKINS[prefs.skin]; renderCards(); if (prefs.skin === 'kalnagini') { audio.unlock(); audio.voice('kalNagini', true); } };
ui.startButton.onclick = start; ui.menuButton.onclick = requestLeave; ui.exitButton.onclick = requestLeave;
ui.pauseButton.onclick = () => screen === 'paused' ? resume() : pause();
ui.confirmLeave.onclick = () => { ui.leaveDialog.close(); menu(); };
ui.stayButton.onclick = () => { ui.leaveDialog.close(); if (resumeAfterLeave) resume(); };
ui.leaveDialog.addEventListener('cancel', () => { if (resumeAfterLeave) setTimeout(resume, 0); });
ui.soundButton.onclick = () => { pause(); ui.soundDialog.showModal(); };
for (const [name, id] of [['effects','effectsSetting'], ['voice','voiceSetting'], ['music','musicSetting']]) {
  ui[id].checked = sound[name];
  ui[id].onchange = () => { sound[name] = ui[id].checked; put('sound', sound); audio.unlock(); audio.update(); };
}
ui.previewSound.onclick = () => { audio.unlock(); if (!sound.voice) { sound.voice = true; ui.voiceSetting.checked = true; put('sound', sound); } audio.voice('preview', true); ui.previewSound.textContent = t('Next Bangla reaction'); };
const keyDirs = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
window.addEventListener('keydown', event => {
  if (event.isComposing || event.metaKey || event.ctrlKey || event.altKey || /INPUT|SELECT|TEXTAREA/.test(event.target.tagName) || document.querySelector('dialog[open]')) return;
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (key === 'Escape' && screen === 'menu' && ui.homeScreen.hidden) { showScreen('home'); return; }
  if (key === 'b' && ['playing', 'countdown', 'paused'].includes(screen)) { event.preventDefault(); openStudy(); return; }
  if ((key === 'Escape' || key === 'p') && screen !== 'menu') { event.preventDefault(); if (!event.repeat) screen === 'paused' ? resume() : pause(); return; }
  const dir = keyDirs[key];
  if (dir && ['playing', 'countdown', 'paused'].includes(screen)) {
    event.preventDefault(); if (event.repeat) return;
    steer(0, dir);
  }
});
// Older phones have no pointer events, so they get touch events instead.
const pressEvent = window.PointerEvent ? 'pointerdown' : 'touchstart';
for (const button of ui.touchControls.querySelectorAll('button')) button.addEventListener(pressEvent, event => {
  event.preventDefault();
  // The same way or straight back cannot turn the snake, so the button says so instead of seeming dead.
  if (screen === 'playing' && !canTurn(plannedDirection(), button.dataset.dir)) { button.classList.remove('refused'); void button.offsetWidth; button.classList.add('refused'); }
  steer(0, button.dataset.dir);
}, { passive: false });
let swipe = null;
ui.board.addEventListener('pointerdown', event => { if (event.pointerType === 'mouse') return; swipe = { x: event.clientX, y: event.clientY }; try { ui.board.setPointerCapture(event.pointerId); } catch { /* The swipe still works inside the board. */ } });
ui.board.addEventListener('pointermove', event => {
  if (!swipe) return;
  const dir = swipeTurn(swipe, event.clientX, event.clientY);
  if (dir) steer(0, dir);
});
for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) ui.board.addEventListener(name, () => swipe = null);
window.addEventListener('blur', () => pause());
document.addEventListener('visibilitychange', () => { if (document.hidden) { pause(); audio.setActive(false); } });
// Opened with ?debug: shows on the phone itself what the game receives, for problems no desktop can reproduce.
const diagnostics = new URLSearchParams(location.search).has('debug') ? (() => {
  const box = document.createElement('pre'); box.className = 'diagnostics'; document.body.append(box);
  const notes = []; let frames = 0, windowAt = performance.now(), fps = 0, worst = 0, lastFrame = 0;
  const note = text => { notes.unshift(`${(performance.now() / 1000).toFixed(1)} ${text}`); notes.length = Math.min(notes.length, 14); };
  for (const name of ['pointerdown', 'touchstart', 'keydown']) window.addEventListener(name, event => {
    if (screen === 'result') return;
    const hit = event.touches?.[0] ?? event, under = hit.clientX === undefined ? null : document.elementFromPoint(hit.clientX, hit.clientY);
    note(`${name} ${event.pointerType ?? ''} ${event.key ?? ''} on ${event.target?.dataset?.dir ?? event.target?.id ?? event.target?.tagName} under ${under?.dataset?.dir ?? under?.id ?? under?.className ?? '-'}`);
  }, { capture: true, passive: true });
  for (const name of ['blur', 'focus', 'pagehide']) window.addEventListener(name, () => note(name));
  document.addEventListener('visibilitychange', () => note(`hidden=${document.hidden}`));
  addEventListener('error', event => note(`error: ${event.message}`));
  return { note, frame(now) {
    worst = Math.max(worst, now - lastFrame); lastFrame = now; frames++;
    if (now - windowAt < 1000) return;
    fps = Math.round(frames * 1000 / (now - windowAt)); frames = 0; windowAt = now;
    const q = view3d?.quality?.() ?? '2D', net = 'offline/local';
    box.style.display = ['playing', 'countdown'].includes(screen) ? 'none' : '';
    box.textContent = `${fps} fps, worst ${Math.round(worst)} ms\n${q}\nscreen ${screen}, ${net}\n${notes.join('\n')}`; worst = 0;
  } };
})() : null;
const updater = keepUpdated({ isBusy: () => screen !== 'menu' || !!document.querySelector('dialog[open]') });
window.addEventListener('load', () => updater.start());
renderer.skin = SKINS[prefs.skin]; fillLooks(); syncView(); const initialStyle = new URLSearchParams(location.search).get('style'); ui.style.value = initialStyle === 'chaos' ? 'chaos' : 'classic';
updateSetup(); requestAnimationFrame(frame);
// The 2D board stays the fallback, so 3D is only ever an upgrade.
import('./render3d.js').then(({ Arena3D }) => {
  view3d = new Arena3D(ui.board3d, { theme: prefs.theme, skin: prefs.skin }); syncView();
  ui.board3d.addEventListener('webglcontextlost', () => { view3d = null; syncView(); });
}).catch(() => syncView());
