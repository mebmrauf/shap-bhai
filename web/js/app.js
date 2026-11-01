import { createGame, queueTurn, clearTurns, step, stepDuration, chooseBotTurn, makeRecording, replayRecording, predict, dailySeed, dhakaDay, ROUND_MS } from './engine.js';
import { ArenaRenderer } from './render.js';
import { RoomConnection } from './network.js';
import { GameAudio, escapedDanger, roastBank, duelBank, biteBank, startBank, phrases } from './audio.js';
import { THEMES, SKINS, foodKind } from './themes.js';
import { DISTRICTS } from './districts.js';
import { saveProfile, submitDaily, fetchBoard, createGhost, fetchGhost, sendLink, makeCard, shareCard, bnDigits } from './social.js';
const $ = id => document.getElementById(id);
const ui = Object.fromEntries([...document.querySelectorAll('[id]')].map(el => [el.id, el]));
const get = (key, fallback) => { try { const raw = localStorage.getItem(`snake-arena.v2.${key}`); return raw && raw.length < 2000000 ? JSON.parse(raw) : fallback; } catch { return fallback; } };
const put = (key, value) => { try { localStorage.setItem(`snake-arena.v2.${key}`, JSON.stringify(value)); return true; } catch { return false; } };
const saved = get('sound', {});
const sound = { effects: saved?.effects !== false, voice: saved?.voice !== false, music: saved?.music !== false };
let captionTimer;
const audio = new GameAudio(sound, text => { clearTimeout(captionTimer); ui.caption.textContent = text; if (ui.voicePreviewCaption) ui.voicePreviewCaption.textContent = text; if (text) captionTimer = setTimeout(() => { ui.caption.textContent = ''; if (ui.voicePreviewCaption) ui.voicePreviewCaption.textContent = ''; }, 6500); });
const renderer = new ArenaRenderer(ui.board);
let selectedMode = 'solo', session = null, game = null, previous = null, screen = 'menu';
let frameAt = performance.now(), accumulator = 0, countdownEnd = 0, lastCount = null;
let series = { round: 1, wins: [0, 0] }, connection = null, networkAt = 0, lastNetworkTick = -1;
let ghost = null, recording = null, ghostIndex = 0, preview = null, resultSaved = '';
let resumeAfterLeave = false, slipSaid = false;
const prefs = { theme: 'dhaka', skin: 'nagin', flat: false, ...get('prefs', {}) };
let view3d = null, friendGhost = null, pendingDaily = get('pendingDaily', null), lastRun = null, boardScope = 'everyone';
// Beyond this a guess would be wrong more often than right, so the board waits for the server.
const MAX_PREDICTED_TICKS = 6;
const OFFLINE_ROOM = 'Online rooms need internet. Solo, Chaos, the computer and same-keyboard games all work offline.';
const lifetimeApples = () => { const n = get('apples', 0); return Number.isInteger(n) && n >= 0 ? n : 0; };
const CHAOS_STATUS = { loadshedding: 'কারেন্ট নাই! মাথার আলোয় চলো।', traffic: 'জ্যাম! লাল ঘর থেকে সরো।', flood: 'রাস্তায় পানি! ঢুকলে মোড় নেওয়া যাবে না।', wedding: 'বিরিয়ানি! ৩ পয়েন্ট, লেজ বাড়ে দ্বিগুণ।' };
const DEATH_SENTENCE = { wall: 'দেয়ালে ধাক্কা খাইলো', self: 'নিজের লেজ কামড়াইলো', traffic: 'বাসের সাথে ধাক্কা খাইলো', 'board-full': 'পুরা মাঠ দখল করলো', limit: 'ম্যারাথন শেষ করলো' };
const positions = g => ({ snakes: g.snakes.map(s => ({ body: s.body.map(p => ({ ...p })) })) });
function randomSeed() { return crypto.getRandomValues(new Uint32Array(1))[0] || 1; }
function bestKey(style = ui.style.value, speed = ui.speed.value) { return style === 'daily' ? `best.daily.${dhakaDay()}` : `best.${style === 'ghost' ? 'classic' : style}.${speed}`; }
function best(style, speed) { const n = get(bestKey(style, speed), 0); return Number.isInteger(n) && n >= 0 ? n : 0; }
function loadGhost(speed) {
  const record = get(`ghost.${speed}`, null);
  if (!record) return null;
  try { if (record.speed !== speed) return null; replayRecording(record); return record; } catch { return null; }
}
function error(message = '') { ui.setupError.textContent = message; ui.setupError.hidden = !message; }
function updateSetup() {
  const duel = selectedMode === 'duel', opponent = ui.opponent.value, style = ui.style.value;
  ui.soloMode.setAttribute('aria-pressed', String(!duel)); ui.duelMode.setAttribute('aria-pressed', String(duel));
  ui.onlineFields.hidden = opponent !== 'online'; ui.codeField.hidden = ui.roomAction.value !== 'join';
  error();
  const record = !duel && style === 'ghost' ? friendGhost?.record ?? loadGhost(ui.speed.value) : null;
  ui.speed.disabled = style === 'daily' || (style === 'ghost' && !!friendGhost);
  const descriptions = { daily: 'Same board for all of Bangladesh today, at Standard speed. Your best run goes on the leaderboard.', classic: 'The original rules. Eat, grow longer, and avoid walls and your tail.', chaos: 'Load shedding, traffic jams, floods and wedding biryani, all on the way to your high score.', arcade: 'Eat again within 8 seconds to build a combo. Points climb to ×3; speed follows food eaten.', ghost: friendGhost ? `Race ${friendGhost.name}'s ${record.score}-point run on the same starting board. Their blue ghost cannot hit you.` : record ? `Race your ${record.score}-point best on the same starting board. The blue ghost cannot hit you.` : 'Finish a Classic run to set a ghost. Your first race records one automatically.' };
  ui.modeDescription.textContent = duel ? opponent === 'local' ? 'Two players, one keyboard. Equal speed. First to win 3 rounds takes the match.' : opponent === 'online' ? 'Share a room with a friend. Same rules, one referee. First to 3 round wins.' : 'Outlast a space-aware computer opponent. First to 3 round wins.' : descriptions[style];
  const label = duel ? opponent === 'online' ? ui.roomAction.value === 'create' ? 'Create room' : 'Join room' : opponent === 'local' ? 'Start local match' : 'Play the computer' : style === 'ghost' ? friendGhost ? `Race ${friendGhost.name}` : record ? 'Race your ghost' : 'Record first ghost' : style === 'daily' ? "Play today's challenge" : style === 'chaos' ? 'Start the chaos' : style === 'arcade' ? 'Play Arcade' : 'Play Classic';
  playLabel(label);
  for (const el of document.querySelectorAll('[data-description]')) el.textContent = ui.modeDescription.textContent;
  renderCards();
  ui.bestLabel.parentElement.hidden = duel; ui.bestLabel.hidden = duel; ui.bestValue.textContent = best();
  ui.rulesText.replaceChildren();
  const paragraphs = duel ? [
    'Eat to grow. Hitting a wall or either snake knocks you out. The last snake moving wins the round.',
    'Head-on collisions and swapped heads are draws. A tail cell is safe only when its owner moves away without growing.',
    'Rounds last 90 seconds. If both survive, more food wins; equal scores draw. Both players keep the same speed.',
    opponent === 'local' ? 'Player 1: W A S D. Player 2: arrow keys. Escape pauses both players.' : opponent === 'online' ? 'Use arrow keys or W A S D. Online matches keep running if you change tabs. Both players must agree to the next round.' : 'Use arrow keys or W A S D. Escape pauses. The computer sees the board, not your next input.'
  ] : ['Use arrow keys, W A S D, the direction buttons, or swipe on the board. You cannot reverse into your neck.', 'One turn is applied per movement step. Two quick turns can be queued. Escape or P pauses; switching tabs also pauses.', 'Each bite adds a body segment. Speed increases slightly every 5 bites. Fill the board to win.', ...(style === 'chaos' ? ['Red cells become traffic in about two seconds, and hitting a bus ends the run. Floodwater carries you straight until you reach dry ground. Biryani scores 3. Chaos runs never count towards daily leaderboards.'] : style === 'daily' ? ['Everyone gets the same food order today, until the snake paths differ. You can retry as often as you like; only your best run counts. Bangladesh time decides the day.'] : style === 'arcade' ? ['Combos reset after 8 seconds of active play. Pausing does not consume your combo. Arcade records are separate.'] : style === 'ghost' ? ['Your ghost replays its recorded turns on its own board. Both runs use the same seed; different routes can produce different later apple positions. Higher score wins; equal scores are a draw.'] : [])];
  for (const text of paragraphs) { const p = document.createElement('p'); p.textContent = text; ui.rulesText.append(p); }
  ui.board.setAttribute('aria-label', duel ? 'Snake arena preview. Player 1 is green; Player 2 is amber.' : 'Snake arena preview. Your snake is ready.');
  preview = createGame({ mode: duel ? 'duel' : 'classic', seed: 1 });
  if (!duel) { preview.snakes[0].body = [{x:8,y:8},{x:7,y:8},{x:6,y:8},{x:5,y:8},{x:4,y:8},{x:4,y:9},{x:4,y:10},{x:4,y:11},{x:5,y:11},{x:6,y:11},{x:7,y:11}]; preview.food = [{x:13,y:8}]; }
  ui.p1Name.textContent = duel ? 'Player 1' : 'Your snake'; ui.p2Name.textContent = duel ? opponent === 'bot' ? 'Computer' : 'Player 2' : 'Best'; ui.p2Mark.hidden = !duel;
  ui.p1Score.textContent = '0'; ui.p2Score.textContent = duel ? '0' : best();
  ui.middleScore.textContent = duel ? 'FIRST TO 3' : style === 'ghost' ? 'GHOST RACE' : style.toUpperCase();
  ui.arenaLabel.textContent = duel ? 'A LEVEL PLAYING FIELD' : 'THE PRACTICE GREEN';
  ui.statusText.textContent = duel ? 'Same speed. Same rules. Settle it on the board.' : 'Eat up. Keep your head clear.';
  ui.controlsHint.innerHTML = duel && opponent === 'local' ? '<span><kbd>W A S D</kbd> Player 1</span><span><kbd>↑ ← ↓ →</kbd> Player 2</span>' : '<span><kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd> or <kbd>W A S D</kbd> to steer</span><span><kbd>Esc</kbd> pause</span>';
  if (duel && opponent === 'online') ui.controlsHint.lastElementChild.textContent = 'Online matches cannot be paused.';
}
function playControls(visible) {
  ui.pauseButton.hidden = !visible || !!connection; ui.exitButton.hidden = !visible; ui.momButton.hidden = !visible || !!connection;
  ui.touchControls.hidden = !visible || session?.opponent === 'local'; ui.controlsHint.hidden = !visible;
}
function overlay(eyebrow, title, text, button = '', action = null, focus = true) {
  playControls(false);
  ui.overlay.hidden = false; ui.overlayEyebrow.textContent = eyebrow; ui.overlayTitle.textContent = title; ui.overlayText.textContent = text;
  ui.continueButton.hidden = !button; ui.continueButton.textContent = button; ui.continueButton.onclick = action;
  ui.roomShare.hidden = true; ui.countdown.hidden = true; ui.resultActions.hidden = true; ui.rankText.hidden = true; ui.resultScore.hidden = true; ui.overlayTitle.removeAttribute('lang');
  if (focus) ui.overlayTitle.focus({ preventScroll: true });
}
function enterGame() {
  document.querySelector('.board-actions').prepend(ui.soundButton); ui.soundButton.textContent = 'Sound';
  ui.app.classList.add('playing'); ui.previewTag.hidden = true; ui.overlay.hidden = true; ui.exitButton.hidden = false;
  ui.pauseButton.hidden = session.opponent === 'online';
  ui.touchControls.hidden = session.opponent === 'local';
  ui.connectionStatus.textContent = ''; ui.startButton.disabled = false;
  ui.board.setAttribute('tabindex', '0'); ui.board.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: 'instant' });
}
function beginLocalRound() {
  playControls(true);
  resultSaved = ''; recording = session.style === 'ghost' ? friendGhost?.record ?? loadGhost(session.speed) : null;
  const seed = recording?.seed ?? (session.style === 'daily' ? dailySeed(dhakaDay()) : randomSeed());
  game = createGame({ mode: session.mode === 'duel' ? 'duel' : ['arcade', 'chaos'].includes(session.style) ? session.style : 'classic', speed: session.speed, seed });
  previous = positions(game); accumulator = 0; ghostIndex = 0;
  ghost = recording ? createGame({ seed: recording.seed, speed: recording.speed }) : null;
  screen = 'countdown'; countdownEnd = performance.now() + 3000; lastCount = null;
  ui.overlay.hidden = true; ui.countdown.hidden = false; ui.countdownText.textContent = session.opponent === 'local' ? 'Player 1: W A S D · Player 2: arrow keys' : 'Get ready';
  ui.pauseButton.hidden = false; ui.pauseButton.textContent = 'Pause'; audio.setActive(false); updateHud();
}
function playLabel(text) {
  ui.startButton.replaceChildren(document.createTextNode(text)); const arrow = document.createElement('span'); arrow.textContent = '↗'; arrow.setAttribute('aria-hidden', 'true'); ui.startButton.append(arrow);
  for (const button of document.querySelectorAll('[data-play]')) button.textContent = text;
}
const CARD_NOTES = { daily: 'Same board for everyone, new every day', classic: 'Pure snake, no surprises', chaos: 'Load shedding, jams, floods, biryani', arcade: 'Chain bites for up to ×3 points', ghost: 'Beat a replay of your best run', bot: 'Practice against a clever snake', local: 'Two players, one keyboard', online: 'Send a friend a link' };
// The selects stay as the single source of truth; each card just sets one.
function cardsFor(select, container, decorate) {
  container.replaceChildren(...[...select.options].map(option => {
    const card = document.createElement('button'); card.type = 'button'; card.className = 'card'; card.disabled = option.disabled;
    card.setAttribute('aria-pressed', String(option.value === select.value));
    const name = document.createElement('b'); name.textContent = option.textContent; card.append(name);
    if (CARD_NOTES[option.value]) { const note = document.createElement('small'); note.textContent = CARD_NOTES[option.value]; card.append(note); }
    decorate?.(card, option.value);
    card.onclick = () => { select.value = option.value; select.onchange(); };
    return card;
  }));
}
function renderCards() {
  cardsFor(ui.style, ui.styleCards); cardsFor(ui.speed, ui.speedCards); cardsFor(ui.opponent, ui.opponentCards); cardsFor(ui.roomAction, ui.roomCards);
  ui.speedCards.classList.toggle('locked', ui.speed.disabled);
  for (const card of ui.speedCards.children) card.disabled = ui.speed.disabled;
  const swatch = colors => card => { const chip = document.createElement('i'); chip.className = 'swatch'; chip.style.background = `linear-gradient(135deg,${colors.join(',')})`; card.prepend(chip); };
  cardsFor(ui.theme, ui.themeCards, (card, value) => swatch([THEMES[value].sky, THEMES[value].tiles[0], THEMES[value].edge])(card));
  cardsFor(ui.skin, ui.skinCards, (card, value) => swatch(SKINS[value].body)(card));
  ui.looksSummary.textContent = `${THEMES[prefs.theme]?.label ?? ''}`;
}
function showScreen(name) {
  for (const id of ['home', 'solo', 'duel', 'looks', 'how']) ui[`${id}Screen`].hidden = id !== name;
  error();
  (name === 'home' ? ui.startButton : ui[`${name}Screen`].querySelector('[data-back]')).focus({ preventScroll: true });
}
function setupBusy(busy) {
  for (const el of ui.setup.querySelectorAll('button, select, input')) el.disabled = busy;
  ui.setup.setAttribute('aria-busy', String(busy));
  if (busy) playLabel('Connecting…');
}
async function start() {
  if (ui.startButton.disabled) return;
  error(); audio.unlock();
  session = { mode: selectedMode, style: ui.style.value, speed: ui.style.value === 'daily' ? 'normal' : ui.style.value === 'ghost' && friendGhost ? friendGhost.record.speed : ui.speed.value, opponent: selectedMode === 'duel' ? ui.opponent.value : null };
  if (session.opponent === 'online') {
    if (navigator.onLine === false) { error(OFFLINE_ROOM); session = null; return; }
    const code = ui.roomCode.value.trim().toUpperCase();
    if (ui.roomAction.value === 'join' && !/^[A-F0-9]{8}$/.test(code)) { error('Enter the 8-character room code your friend shared.'); ui.roomCode.focus(); return; }
    setupBusy(true);
    const activeConnection = new RoomConnection(state => onNetwork(state), (message, fatal) => {
      ui.connectionStatus.textContent = message;
      if (fatal) { ui.connectionStatus.textContent = ''; screen = 'result'; audio.stop(); ui.pauseButton.hidden = true; overlay('CONNECTION ENDED', 'Room closed', message); }
    });
    connection = activeConnection; lastNetworkTick = -1; game = null; previous = null;
    try {
      await activeConnection.open(ui.roomAction.value, code);
      if (connection !== activeConnection) return;
      setupBusy(false); enterGame();
      // open() has already delivered the first snapshot; restore its waiting panel.
      onNetwork(activeConnection.state, true);
    } catch (e) { activeConnection.close(); connection = null; session = null; setupBusy(false); updateSetup(); error(e.status ? e.message : navigator.onLine === false ? OFFLINE_ROOM : 'Could not reach the room server. Check your connection and try again.'); }
    return;
  }
  series = { round: 1, wins: [0, 0] }; enterGame(); beginLocalRound();
}
function onNetwork(state, force = false) {
  if (!state || !session) return;
  const oldScreen = screen, oldRound = series.round;
  ui.connectionStatus.textContent = '';
  series = { round: state.round, wins: state.wins };
  if (state.game && (state.game.tick !== lastNetworkTick || oldRound !== state.round || force)) {
    const before = game;
    previous = positions(game ?? state.game); game = state.game;
    networkAt = performance.now(); lastNetworkTick = game.tick;
    // A slow link skips ticks, so reactions come from what changed rather than the last tick's events.
    const sameRound = before && oldRound === state.round;
    if (sameRound) handleEvents([
      ...game.snakes.flatMap(s => s.score > before.snakes[s.id].score ? [{ type: 'eat', id: s.id, points: s.score - before.snakes[s.id].score, cell: s.body[0] }] : []),
      ...game.snakes.flatMap(s => before.snakes[s.id].alive && !s.alive ? [{ type: 'crash', id: s.id }] : [])
    ]);
  }
  ui.pauseButton.hidden = true;
  if (state.phase === 'waiting') {
    screen = 'waiting';
    if (oldScreen !== 'waiting' || force) {
      overlay('YOUR TABLE IS READY', 'Invite a friend', 'Send the link or share this room code.\nThe countdown starts when they join.');
      ui.roomShare.hidden = false; ui.shareCode.value = state.code; ui.menuButton.textContent = 'Cancel room';
      history.replaceState(null, '', `?room=${state.code}`);
    }
  } else if (state.phase === 'countdown') {
    screen = 'countdown'; playControls(true); ui.overlay.hidden = true; ui.countdown.hidden = false;
    countdownEnd = performance.now() + state.countdown;
    ui.countdownText.textContent = `You are Player ${state.player + 1} · ${state.player ? 'amber' : 'green'} snake`;
    if (oldScreen !== 'countdown') { lastCount = null; audio.setActive(false); }
  } else if (state.phase === 'playing') {
    screen = 'playing'; playControls(true); ui.overlay.hidden = true; ui.countdown.hidden = true;
    if (oldScreen !== 'playing') { audio.effect('go'); audio.setActive(true); if (game.tick === 0) audio.voice(startBank({ duel: game.mode === 'duel', style: session.style, skin: prefs.skin }), true); }
  } else if (state.phase === 'finished') {
    screen = 'result'; audio.setActive(false);
    if (oldScreen !== 'result' || force) { updateHud(); showResults(); }
    if (state.ready[state.player]) { ui.continueButton.disabled = true; ui.continueButton.textContent = 'Waiting for opponent…'; }
    else { ui.continueButton.disabled = false; }
  }
  if (game && state.phase !== 'finished') updateHud();
}
function updateHud() {
  if (!game || !session) return;
  const duel = game.mode === 'duel', me = connection?.state?.player ?? 0;
  ui.arenaLabel.textContent = duel ? `${session.opponent === 'online' ? 'ONLINE' : session.opponent === 'bot' ? 'VS COMPUTER' : 'SAME KEYBOARD'} · ROUND ${series.round}` : session.style === 'ghost' ? 'GHOST RACE' : session.style === 'daily' ? `TODAY · ${dhakaDay()}` : `${session.style.toUpperCase()} · ${session.speed.toUpperCase()}`;
  ui.p1Name.textContent = duel ? session.opponent === 'online' && me === 0 ? 'You · P1' : 'Player 1' : 'Your snake';
  ui.p2Name.textContent = duel ? session.opponent === 'bot' ? 'Computer' : session.opponent === 'online' && me === 1 ? 'You · P2' : 'Player 2' : ghost ? 'Ghost' : 'Best';
  ui.p1Score.textContent = game.snakes[0].score; ui.p2Score.textContent = duel ? game.snakes[1].score : ghost ? ghost.snakes[0].score : best(session.style, session.speed);
  ui.p2Mark.hidden = !duel;
  ui.middleScore.textContent = duel ? `${series.wins[0]} — ${series.wins[1]} ROUNDS` : session.style === 'ghost' ? recording ? `TARGET ${recording.score}` : 'RECORDING' : game.mode === 'classic' ? 'BITES' : 'POINTS';
  ui.comboWrap.hidden = session.style !== 'arcade' || duel;
  if (!ui.comboWrap.hidden) { ui.comboText.textContent = `×${Math.max(1, game.snakes[0].combo)}`; ui.comboMeter.value = Math.max(0, game.snakes[0].comboUntil - game.elapsedMs); }
  ui.timerText.textContent = duel ? `${Math.ceil(Math.max(0, ROUND_MS - game.elapsedMs) / 1000)}s left` : `${game.snakes[0].body.length} segments`;
  ui.statusText.textContent = duel ? 'Last snake moving wins. First to 3 rounds.' : game.chaos ? CHAOS_STATUS[game.chaos.name] ?? 'Enjoy the quiet while it lasts.' : session.style === 'arcade' ? 'Keep eating. Combos last 8 seconds.' : session.style === 'ghost' ? recording ? ghost?.status === 'finished' ? 'Ghost finished. Keep going to beat its score.' : 'The blue outline is your best run.' : 'Finish this run to save your first ghost.' : 'Find your rhythm. Watch your tail.';
  ui.board.setAttribute('aria-label', duel ? `Snake arena. Player 1: ${game.snakes[0].score} points. Player 2: ${game.snakes[1].score} points.` : `Snake arena. Score ${game.snakes[0].score}. Length ${game.snakes[0].body.length}.`);
}
function handleEvents(events) {
  for (const e of events ?? []) {
    if (e.type === 'eat') { view3d?.effect('eat', e); audio.effect('eat'); if (session?.opponent === 'local' ? false : e.id === (connection?.state?.player ?? 0)) { const apples = game.snakes[e.id].apples, bank = biteBank({ apples, points: e.points, feast: e.feast, kind: foodKind(e.cell), arcade: game.mode === 'arcade' }); audio.voice(bank, e.feast || apples % 5 === 0); } }
    if (e.type === 'crash') { view3d?.effect('crash'); audio.effect('crash'); }
    // Traffic and floods speak on their warning, because that is when the player can still react.
    if (e.type === 'chaos') { if (e.phase === 'end') { slipSaid = false; audio.voice(`${e.name}End`); } else if (e.phase === 'warn' || !['traffic', 'flood'].includes(e.name)) audio.voice(e.name, true); }
  }
  if (!slipSaid && game?.chaos?.water.some(p => p.x === game.snakes[0].body[0].x && p.y === game.snakes[0].body[0].y)) { slipSaid = true; audio.voice('slip', true); }
  const players = session?.opponent === 'local' ? [0, 1] : [connection?.state?.player ?? 0];
  if (players.some(id => escapedDanger(previous, game, id))) audio.voice('danger');
}
function saveRun() {
  const score = game.snakes[0].score, key = bestKey(session.style, session.speed);
  let ok = true;
  const newBest = score > best(session.style, session.speed);
  if (newBest) ok = put(key, score);
  const record = makeRecording(game);
  lastRun = { newBest, record, reason: game.reason, score, apples: game.snakes[0].apples, line: null };
  put('apples', lifetimeApples() + game.snakes[0].apples); fillLooks();
  if (record) {
    const old = loadGhost(session.speed);
    if (!old || record.score > old.score || (record.score === old.score && record.ticks > old.ticks)) {
      ok = put(`ghost.${session.speed}`, record) && ok;
      resultSaved = ok ? 'Your best ghost is saved.' : 'Storage is unavailable; this ghost could not be saved.';
    } else resultSaved = 'Your previous best ghost is kept.';
  } else resultSaved = ok ? 'Best saved on this device.' : 'Storage is unavailable; this score could not be saved.';
}
function showResults() {
  ui.comboWrap.hidden = true; ui.statusText.textContent = game.mode === 'duel' ? 'Round complete.' : 'Run complete.'; ui.timerText.textContent = '';
  ui.pauseButton.hidden = true; ui.countdown.hidden = true; ui.continueButton.disabled = false; ui.menuButton.textContent = 'Back to menu';
  if (game.mode === 'duel') {
    const wonMatch = series.wins.some(n => n >= 3), winner = game.winner;
    const label = winner === null ? 'A draw.' : session.opponent === 'bot' ? winner === 0 ? 'You take the round.' : 'Computer takes it.' : `Player ${winner + 1} takes it.`;
    const title = wonMatch ? session.opponent === 'bot' ? series.wins[0] >= 3 ? 'You win the match.' : 'Computer wins.' : `Player ${series.wins[0] >= 3 ? 1 : 2} wins the match.` : label;
    const why = game.reason === 'double-crash' ? 'Both snakes crashed on the same step. No round awarded.' : game.reason === 'time' ? winner === null ? 'Time is up. Equal food, equal honours.' : 'Time is up. More food wins this round.' : game.reason === 'board-full' ? 'The arena is full. More food wins.' : `Player ${1 - winner + 1} hit ${game.snakes[1 - winner].death === 'wall' ? 'the wall' : game.snakes[1 - winner].death === 'self' ? 'their own body' : 'the other snake'}.`;
    overlay(wonMatch ? 'MATCH COMPLETE' : `ROUND ${series.round} COMPLETE`, title, why, connection ? wonMatch ? 'Ready for rematch' : 'Ready for next round' : wonMatch ? 'Play another match' : 'Next round', () => {
      audio.unlock();
      if (connection) { connection.ready(); ui.continueButton.disabled = true; ui.continueButton.textContent = 'Waiting for opponent…'; }
      else { series = wonMatch ? { round: 1, wins: [0, 0] } : { round: series.round + 1, wins: [...series.wins] }; beginLocalRound(); }
    });
    const me = connection?.state?.player ?? 0;
    audio.voice(duelBank({ winner, me, shared: session.opponent === 'local', reason: game.reason, death: winner === null ? game.snakes[0].death : game.snakes[1 - winner].death, matchOver: wonMatch }), true);
  } else {
    const score = game.snakes[0].score;
    const rival = friendGhost ? `${friendGhost.name}'s ghost` : 'your ghost';
    const ghostResult = recording ? score > recording.score ? `You beat ${rival}.` : score === recording.score ? `A tie with ${rival}.` : `${friendGhost ? `${friendGhost.name}'s ghost keeps` : 'Your ghost keeps'} the crown.` : null;
    const line = audio.pick(roastBank({ reason: game.reason, score, newBest: score > 0 && lastRun.newBest, ghost: !recording ? null : score > recording.score ? 'won' : score === recording.score ? 'tie' : 'lost' }));
    lastRun.line = phrases[line];
    overlay('RUN COMPLETE', phrases[line], `${ghostResult ? `${ghostResult}\n` : ''}${game.snakes[0].apples} bite${game.snakes[0].apples === 1 ? '' : 's'} · ${Math.floor(game.elapsedMs / 1000)} sec · ${resultSaved}`, 'Play again', () => { audio.unlock(); beginLocalRound(); });
    ui.overlayTitle.lang = 'bn'; ui.resultScore.hidden = false; ui.resultScore.textContent = score; audio.play(line);
    ui.resultActions.hidden = false; ui.shareButton.hidden = false; ui.challengeButton.hidden = !lastRun.record; ui.joinButton.hidden = true;
    ui.shareButton.textContent = 'Share card'; ui.challengeButton.textContent = 'Send my ghost';
    lastRun.shot = copyBoard();
    if (session.style === 'daily' && lastRun.record) { if (!pendingDaily || lastRun.record.seed !== pendingDaily.seed || lastRun.record.score > pendingDaily.score) { pendingDaily = lastRun.record; put('pendingDaily', pendingDaily); } postDaily(true); }
  }
}
function pause() {
  if (connection || !['playing', 'countdown'].includes(screen)) return;
  screen = 'paused'; clearTurns(game); audio.stop(); ui.pauseButton.textContent = 'Resume';
  overlay('TAKE A BREATHER', 'Paused.', 'Your snake and timers are waiting for you.', 'Resume game', resume);
}
function resume() {
  if (screen !== 'paused') return;
  audio.unlock(); playControls(true); clearTurns(game); accumulator = 0; screen = 'countdown'; countdownEnd = performance.now() + 1200; lastCount = null;
  ui.overlay.hidden = true; ui.countdown.hidden = false; ui.countdownText.textContent = 'Back in the game'; ui.pauseButton.textContent = 'Pause';
  ui.board.focus({ preventScroll: true });
}
function menu() {
  document.querySelector('.header-actions').append(ui.soundButton); ui.soundButton.textContent = 'Sound settings';
  connection?.close(); connection = null; game = null; previous = null; session = null; ghost = null; recording = null;
  ui.momButton.hidden = true; ui.resultActions.hidden = true;
  screen = 'menu'; ui.controlsHint.hidden = false; audio.stop(); ui.app.classList.remove('playing'); ui.overlay.hidden = true; ui.countdown.hidden = true; ui.previewTag.hidden = false;
  ui.pauseButton.hidden = true; ui.exitButton.hidden = true; ui.touchControls.hidden = true; ui.comboWrap.hidden = true; ui.timerText.textContent = ''; ui.connectionStatus.textContent = '';
  ui.startButton.disabled = false; ui.continueButton.disabled = false; ui.board.removeAttribute('tabindex'); ui.menuButton.textContent = 'Back to menu';
  if (!friendGhost) history.replaceState(null, '', location.pathname); updateSetup(); window.scrollTo({ top: 0, behavior: 'instant' }); showScreen('home');
}
function requestLeave() {
  if (['result', 'waiting'].includes(screen)) { menu(); return; }
  resumeAfterLeave = !connection && ['playing', 'countdown'].includes(screen);
  pause(); ui.leaveText.textContent = connection ? 'Leaving closes this room for both players.' : 'This run will end. Unfinished runs are not saved as ghosts.';
  ui.leaveDialog.showModal(); ui.stayButton.focus();
}
function steer(id, dir) {
  if (screen !== 'playing') return;
  if (connection) { connection.turn(dir); return; }
  queueTurn(game, id, dir);
}
function advanceGhost() {
  if (!ghost || ghost.status !== 'playing') return;
  while (ghost.status === 'playing' && ghost.elapsedMs + stepDuration(ghost) <= game.elapsedMs) {
    if (recording.actions[ghostIndex]?.[0] === ghost.tick + 1) { queueTurn(ghost, 0, recording.actions[ghostIndex++][2]); }
    step(ghost);
  }
}
function frame(now) {
  const dt = Math.min(250, now - frameAt); frameAt = now;
  if (screen === 'countdown') {
    const count = Math.max(1, Math.ceil((countdownEnd - now) / 1000));
    if (count !== lastCount) { ui.countdownNumber.textContent = count; lastCount = count; audio.effect('count'); }
    if (!connection && now >= countdownEnd) { screen = 'playing'; accumulator = 0; ui.countdown.hidden = true; audio.effect('go'); audio.setActive(true); if (game.tick === 0) audio.voice(startBank({ duel: game.mode === 'duel', style: session.style, skin: prefs.skin }), true); }
  } else if (screen === 'playing' && !connection) {
    accumulator += dt;
    while (game.status === 'playing' && accumulator >= stepDuration(game)) {
      accumulator -= stepDuration(game); previous = positions(game);
      if (session.opponent === 'bot') queueTurn(game, 1, chooseBotTurn(game));
      step(game); advanceGhost(); handleEvents(game.events); updateHud();
      if (game.status === 'finished') {
        screen = 'result'; audio.setActive(false);
        if (game.mode === 'duel') { if (game.winner !== null) series.wins[game.winner]++; }
        else saveRun();
        updateHud(); showResults();
      }
    }
  }
  let shown = screen === 'menu' || !game ? preview : game, shownBefore = screen === 'menu' ? null : previous;
  let fraction = screen !== 'playing' ? 1 : connection ? 1 : accumulator / stepDuration(game);
  if (connection && screen === 'playing' && game?.status === 'playing') {
    // Show where the server is by now: the snapshot's age plus half a round trip, in 140 ms ticks.
    const state = connection.state, sinceStep = (now - networkAt + connection.latency / 2 - (state.nextStepIn ?? 0)) / stepDuration(game);
    const ahead = Math.max(0, Math.min(MAX_PREDICTED_TICKS, Math.floor(sinceStep) + 1));
    const turns = connection.pending.map(p => p.dir);
    fraction = ahead >= MAX_PREDICTED_TICKS ? 1 : sinceStep < 0 ? Math.min(1, (now - networkAt) / 110) : sinceStep - Math.floor(sinceStep);
    shown = predict(game, ahead, state.player, turns);
    if (ahead > 0) shownBefore = positions(predict(game, ahead - 1, state.player, turns));
    ui.connectionStatus.textContent = now - networkAt > 1500 ? 'Weak connection. Reconnecting…' : '';
  }
  const scene = view3d && !prefs.flat ? view3d : renderer;
  scene.draw(shown, shownBefore, fraction, ghost, screen === 'menu');
  requestAnimationFrame(frame);
}
function syncView() {
  renderer.flat = prefs.flat; ui.board3d.hidden = !view3d || prefs.flat;
  ui.viewButton.setAttribute('aria-pressed', String(prefs.flat));
  ui.viewButton.textContent = prefs.flat ? view3d ? '3D view' : 'Raised view' : 'Flat view';
}
function fillLooks() {
  const apples = lifetimeApples();
  ui.theme.replaceChildren(...Object.entries(THEMES).map(([value, t]) => new Option(t.label, value, false, value === prefs.theme)));
  ui.skin.replaceChildren(...Object.entries(SKINS).map(([value, skin]) => {
    const locked = apples < skin.unlock, option = new Option(locked ? `${skin.label} · ${skin.unlock} bites` : skin.label, value, false, value === prefs.skin);
    option.disabled = locked; return option;
  }));
  renderCards();
}
// Copied now because the WebGL buffer is gone by the time someone taps Share.
function copyBoard() {
  try {
    const source = view3d && !prefs.flat ? view3d.snapshot() : ui.board;
    const shot = document.createElement('canvas'); shot.width = source.width; shot.height = source.height;
    shot.getContext('2d').drawImage(source, 0, 0);
    return shot;
  } catch { return null; }
}
function savedProfile() { const p = get('profile', null); return typeof p?.name === 'string' ? p : null; }
// The run is stored first, so a dead connection only delays it. Replays are verified by the server whenever they arrive.
async function postDaily(visible = false) {
  if (!pendingDaily) return;
  const say = text => { if (visible) { ui.rankText.hidden = false; ui.rankText.textContent = text; } };
  if (!savedProfile()) { say('Add your name to put this run on the board.'); if (visible) ui.joinButton.hidden = false; return; }
  const record = pendingDaily;
  say(navigator.onLine === false ? "You're offline. This run posts when you reconnect." : 'Checking your run with the referee…');
  if (navigator.onLine === false) return;
  try {
    const result = await submitDaily(record);
    if (pendingDaily === record) { pendingDaily = null; put('pendingDaily', null); }
    if (visible && result.improved && result.rank === 1) audio.voice('rankOne', true);
    say(result.improved ? `You are #${result.rank} in today's challenge.` : `Your best today is ${result.best}, ranked #${result.rank}.`);
  } catch (e) {
    if (e.status === 409) { say('Add your name to put this run on the board.'); if (visible) ui.joinButton.hidden = false; }
    else if (e.status === 400) { if (pendingDaily === record) { pendingDaily = null; put('pendingDaily', null); } say(e.message); }
    else say('Your run is saved. It posts when the connection is back.');
  }
}
async function loadBoard() {
  for (const tab of ui.boardDialog.querySelectorAll('[data-scope]')) tab.setAttribute('aria-pressed', String(tab.dataset.scope === boardScope));
  const crew = savedProfile()?.crew ?? '';
  ui.boardList.replaceChildren();
  if (boardScope === 'crew' && !crew) { ui.boardStatus.textContent = 'Add a crew code to your player card, then share it with friends.'; return; }
  ui.boardStatus.textContent = 'Loading…';
  try {
    const { rows, day } = await fetchBoard(boardScope, crew);
    ui.boardStatus.textContent = rows.length ? boardScope === 'district' ? `${day} · average of each district's top 5` : boardScope === 'crew' ? `${day} · crew ${crew}` : day : 'Nobody has played today. Take first place.';
    ui.boardList.replaceChildren(...rows.map(row => {
      const item = document.createElement('li'), name = document.createElement('span'), score = document.createElement('b');
      name.textContent = row.name ? `${row.name}${row.district ? ` · ${row.district}` : ''}` : `${row.district} · ${row.players} player${row.players === 1 ? '' : 's'}`;
      score.textContent = row.score; item.append(name, score); return item;
    }));
  } catch (e) { ui.boardStatus.textContent = e.status ? e.message : "The leaderboard needs internet. Your best run posts when you're back online."; }
}
function openBoard() {
  const profile = savedProfile();
  ui.profileName.value = profile?.name ?? ''; ui.profileDistrict.value = profile?.district ?? ''; ui.profileCrew.value = profile?.crew ?? '';
  ui.profileError.hidden = true; ui.boardDialog.showModal(); loadBoard();
}
function openStudy() {
  pause(); ui.studyDialog.showModal(); document.title = 'Physics Notes · Chapter 4';
}
ui.profileDistrict.append(...DISTRICTS.map(name => new Option(name, name)));
ui.boardButton.onclick = openBoard; ui.joinButton.onclick = openBoard; ui.boardClose.onclick = () => ui.boardDialog.close();
for (const tab of ui.boardDialog.querySelectorAll('[data-scope]')) tab.onclick = () => { boardScope = tab.dataset.scope; loadBoard(); };
ui.profileForm.addEventListener('submit', async event => {
  event.preventDefault(); ui.profileError.hidden = true; ui.profileSave.disabled = true;
  try {
    put('profile', await saveProfile({ name: ui.profileName.value, district: ui.profileDistrict.value, crew: ui.profileCrew.value }));
    ui.profileSave.textContent = 'Saved'; setTimeout(() => ui.profileSave.textContent = 'Save player card', 2000);
    if (pendingDaily) { ui.joinButton.hidden = true; await postDaily(); }
    await loadBoard();
  } catch (e) { ui.profileError.textContent = e.status ? e.message : 'Saving your player card needs internet.'; ui.profileError.hidden = false; }
  ui.profileSave.disabled = false;
});
ui.momButton.onclick = openStudy; ui.studyClose.onclick = () => { ui.studyDialog.close(); audio.unlock(); audio.voice('momGone', true); };
ui.studyDialog.addEventListener('close', () => { document.title = 'Snake Arena'; });
ui.shareButton.onclick = async () => {
  const run = lastRun; if (!run) return;
  ui.shareButton.disabled = true;
  try {
    const sentence = `আমার সাপ ${bnDigits(run.apples)}টা ${THEMES[prefs.theme].food} খেয়ে ${DEATH_SENTENCE[run.reason] ?? 'খেলা শেষ করলো'}।`;
    const result = await shareCard(await makeCard({ line: run.line, sentence, score: run.score, shot: run.shot, host: location.host }), sentence, location.origin);
    ui.shareButton.textContent = result === 'saved' ? 'Card saved' : result === 'shared' ? 'Shared' : 'Share card';
  } catch { ui.shareButton.textContent = 'Could not make card'; }
  ui.shareButton.disabled = false;
};
ui.challengeButton.onclick = async () => {
  const run = lastRun; if (!run?.record) return;
  ui.challengeButton.disabled = true;
  try {
    run.ghostId ??= (await createGhost(run.record, savedProfile()?.name)).id;
    const result = await sendLink(`${location.origin}/?ghost=${run.ghostId}`, `আমার ${bnDigits(run.score)} পয়েন্টের ভূতকে হারাইতে পারবা?`);
    ui.challengeButton.textContent = result === 'copied' ? 'Link copied' : result === 'shared' ? 'Sent' : 'Send my ghost';
  } catch (e) { ui.challengeButton.textContent = e.status && e.status !== 503 ? 'Try again' : 'Needs internet'; }
  ui.challengeButton.disabled = false;
};
ui.soloMode.onclick = () => { selectedMode = 'solo'; updateSetup(); showScreen('solo'); };
ui.duelMode.onclick = () => { selectedMode = 'duel'; updateSetup(); showScreen('duel'); };
ui.looksButton.onclick = () => showScreen('looks'); ui.howButton.onclick = () => showScreen('how');
for (const button of document.querySelectorAll('[data-back]')) button.onclick = () => showScreen('home');
for (const button of document.querySelectorAll('[data-play]')) button.onclick = start;
for (const id of ['speed', 'opponent', 'roomAction']) ui[id].onchange = updateSetup;
ui.style.onchange = () => { friendGhost = null; updateSetup(); };
ui.theme.onchange = () => { prefs.theme = ui.theme.value; put('prefs', prefs); view3d?.setTheme(prefs.theme); renderCards(); };
ui.skin.onchange = () => { prefs.skin = ui.skin.value; put('prefs', prefs); view3d?.setSkin(prefs.skin); renderer.skin = SKINS[prefs.skin]; renderCards(); if (prefs.skin === 'kalnagini') { audio.unlock(); audio.voice('kalNagini', true); } };
ui.startButton.onclick = start; ui.menuButton.onclick = requestLeave; ui.exitButton.onclick = requestLeave;
ui.pauseButton.onclick = () => screen === 'paused' ? resume() : pause();
ui.viewButton.onclick = () => { prefs.flat = !prefs.flat; put('prefs', prefs); syncView(); };
ui.confirmLeave.onclick = () => { ui.leaveDialog.close(); menu(); };
ui.stayButton.onclick = () => { ui.leaveDialog.close(); if (resumeAfterLeave) resume(); };
ui.leaveDialog.addEventListener('cancel', () => { if (resumeAfterLeave) setTimeout(resume, 0); });
ui.copyButton.onclick = async () => {
  try { await navigator.clipboard.writeText(`${location.origin}/?room=${connection.state.code}`); ui.copyButton.textContent = 'Invite link copied'; }
  catch { ui.shareCode.focus(); ui.shareCode.select(); ui.copyButton.textContent = 'Select and copy this code'; }
  setTimeout(() => ui.copyButton.textContent = 'Copy invite link', 2500);
};
ui.soundButton.onclick = () => { pause(); ui.soundDialog.showModal(); };
for (const [name, id] of [['effects','effectsSetting'], ['voice','voiceSetting'], ['music','musicSetting']]) {
  ui[id].checked = sound[name];
  ui[id].onchange = () => { sound[name] = ui[id].checked; put('sound', sound); audio.unlock(); audio.update(); };
}
ui.previewSound.onclick = () => { audio.unlock(); if (!sound.voice) { sound.voice = true; ui.voiceSetting.checked = true; put('sound', sound); } audio.voice('preview', true); ui.previewSound.textContent = 'Next Bangla reaction'; };
const keyDirs = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
window.addEventListener('keydown', event => {
  if (event.isComposing || event.metaKey || event.ctrlKey || event.altKey || /INPUT|SELECT|TEXTAREA/.test(event.target.tagName) || document.querySelector('dialog[open]')) return;
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (key === 'Escape' && screen === 'menu' && ui.homeScreen.hidden) { showScreen('home'); return; }
  if (key === 'b' && !connection && ['playing', 'countdown', 'paused'].includes(screen)) { event.preventDefault(); openStudy(); return; }
  if ((key === 'Escape' || key === 'p') && screen !== 'menu') { event.preventDefault(); if (!event.repeat) screen === 'paused' ? resume() : pause(); return; }
  const dir = keyDirs[key];
  if (dir && ['playing', 'countdown', 'paused'].includes(screen)) {
    event.preventDefault(); if (event.repeat) return;
    steer(session?.opponent === 'local' && key.startsWith('Arrow') ? 1 : 0, dir);
  }
});
for (const button of ui.touchControls.querySelectorAll('button')) button.addEventListener('pointerdown', event => { event.preventDefault(); steer(0, button.dataset.dir); });
let swipe = null;
ui.board.addEventListener('pointerdown', event => { if (event.pointerType === 'mouse') return; swipe = { x: event.clientX, y: event.clientY }; ui.board.setPointerCapture(event.pointerId); });
ui.board.addEventListener('pointermove', event => {
  if (!swipe || session?.opponent === 'local') return;
  const dx = event.clientX - swipe.x, dy = event.clientY - swipe.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
  steer(0, Math.abs(dx) > Math.abs(dy) ? dx > 0 ? 'right' : 'left' : dy > 0 ? 'down' : 'up');
  swipe = { x: event.clientX, y: event.clientY };
});
for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) ui.board.addEventListener(name, () => swipe = null);
window.addEventListener('blur', () => { pause(); if (connection) connection.pending = []; });
document.addEventListener('visibilitychange', () => { if (document.hidden) { pause(); audio.setActive(false); } else if (connection && screen === 'playing') audio.setActive(true); });
window.addEventListener('pagehide', () => connection?.close());
const initialCode = new URLSearchParams(location.search).get('room');
if (initialCode) { selectedMode = 'duel'; ui.opponent.value = 'online'; ui.roomAction.value = 'join'; ui.roomCode.value = initialCode.toUpperCase().slice(0, 8); }
const initialGhost = new URLSearchParams(location.search).get('ghost');
if (initialGhost) fetchGhost(initialGhost).then(({ name, record }) => {
  replayRecording(record); // Never trust a stored replay: it must rebuild the same run here too.
  friendGhost = { name, record }; selectedMode = 'solo'; ui.style.value = 'ghost'; updateSetup();
}).catch(e => { history.replaceState(null, '', location.pathname); ui.style.value = 'daily'; updateSetup(); error(e.status ? e.message : "That friend's ghost needs internet to download. Everything else works offline."); });
// Register service worker for PWA mobile installation and offline caching
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
window.addEventListener('online', () => postDaily()); postDaily();
renderer.skin = SKINS[prefs.skin]; fillLooks(); syncView(); ui.style.value = selectedMode === 'solo' && !initialGhost ? 'daily' : ui.style.value;
updateSetup(); requestAnimationFrame(frame);
if (initialCode) showScreen('duel');
// The 2D board stays the fallback, so 3D is only ever an upgrade.
import('./render3d.js').then(({ Arena3D }) => {
  view3d = new Arena3D(ui.board3d, { theme: prefs.theme, skin: prefs.skin }); syncView();
  ui.board3d.addEventListener('webglcontextlost', () => { view3d = null; syncView(); });
}).catch(() => syncView());
