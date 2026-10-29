import { createGame, queueTurn, clearTurns, step, stepDuration, chooseBotTurn, makeRecording, replayRecording, COMBO_MS, ROUND_MS } from './engine.js';
import { ArenaRenderer } from './render.js';
import { RoomConnection } from './network.js';
import { GameAudio } from './audio.js';
const $ = id => document.getElementById(id);
const ui = Object.fromEntries([...document.querySelectorAll('[id]')].map(el => [el.id, el]));
const get = (key, fallback) => { try { const raw = localStorage.getItem(`snake-arena.v2.${key}`); return raw && raw.length < 2000000 ? JSON.parse(raw) : fallback; } catch { return fallback; } };
const put = (key, value) => { try { localStorage.setItem(`snake-arena.v2.${key}`, JSON.stringify(value)); return true; } catch { return false; } };
const saved = get('sound', {});
const sound = { effects: saved?.effects !== false, voice: saved?.voice !== false, music: saved?.music === true };
let captionTimer;
const audio = new GameAudio(sound, text => { clearTimeout(captionTimer); ui.caption.textContent = text; if (text) captionTimer = setTimeout(() => ui.caption.textContent = '', 5000); });
const renderer = new ArenaRenderer(ui.board);
let selectedMode = 'solo', session = null, game = null, previous = null, screen = 'menu';
let frameAt = performance.now(), accumulator = 0, countdownEnd = 0, lastCount = null;
let series = { round: 1, wins: [0, 0] }, connection = null, networkAt = 0, lastNetworkTick = -1;
let ghost = null, recording = null, ghostIndex = 0, preview = null, resultSaved = '';
let resumeAfterLeave = false;
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
  const duel = selectedMode === 'duel', opponent = ui.opponent.value, style = ui.style.value;
  ui.soloMode.setAttribute('aria-pressed', String(!duel)); ui.duelMode.setAttribute('aria-pressed', String(duel));
  ui.soloFields.hidden = duel; ui.duelFields.hidden = !duel;
  ui.onlineFields.hidden = opponent !== 'online'; ui.codeField.hidden = ui.roomAction.value !== 'join';
  error();
  const record = !duel && style === 'ghost' ? loadGhost(ui.speed.value) : null;
  const descriptions = { classic: 'The original rules. Eat apples, grow longer, and avoid walls and your tail.', arcade: 'Eat again within 8 seconds to build a combo. Points climb to ×3; speed follows apples.', ghost: record ? `Race your ${record.score}-point best on the same starting board. The blue ghost cannot hit you.` : 'Finish a Classic run to set a ghost. Your first race records one automatically.' };
  ui.modeDescription.textContent = duel ? opponent === 'local' ? 'Two players, one keyboard. Equal speed. First to win 3 rounds takes the match.' : opponent === 'online' ? 'Share a room with a friend. Same rules, one referee. First to 3 round wins.' : 'Outlast a space-aware computer opponent. First to 3 round wins.' : descriptions[style];
  const label = duel ? opponent === 'online' ? ui.roomAction.value === 'create' ? 'Create room' : 'Join room' : opponent === 'local' ? 'Start local match' : 'Play the computer' : style === 'ghost' ? record ? 'Race your ghost' : 'Record first ghost' : style === 'arcade' ? 'Play Arcade' : 'Play Classic';
  ui.startButton.replaceChildren(document.createTextNode(label)); const arrow = document.createElement('span'); arrow.textContent = '↗'; arrow.setAttribute('aria-hidden', 'true'); ui.startButton.append(arrow);
  ui.bestLabel.parentElement.hidden = duel; ui.bestLabel.hidden = duel; ui.bestValue.textContent = best();
  ui.rulesText.replaceChildren();
  const paragraphs = duel ? [
    'Eat apples to grow. Hitting a wall or either snake knocks you out. The last snake moving wins the round.',
    'Head-on collisions and swapped heads are draws. A tail cell is safe only when its owner moves away without growing.',
    'Rounds last 90 seconds. If both survive, more apples wins; equal scores draw. Both players keep the same speed.',
    opponent === 'local' ? 'Player 1: W A S D. Player 2: arrow keys. Escape pauses both players.' : opponent === 'online' ? 'Use arrow keys or W A S D. Online matches keep running if you change tabs. Both players must agree to the next round.' : 'Use arrow keys or W A S D. Escape pauses. The computer sees the board, not your next input.'
  ] : ['Use arrow keys, W A S D, the direction buttons, or swipe on the board. You cannot reverse into your neck.', 'One turn is applied per movement step. Two quick turns can be queued. Escape or P pauses; switching tabs also pauses.', 'Each apple adds a body segment. Speed increases slightly every 5 apples. Fill the board to win.', ...(style === 'arcade' ? ['Combos reset after 8 seconds of active play. Pausing does not consume your combo. Arcade records are separate.'] : style === 'ghost' ? ['Your ghost replays its recorded turns on its own board. Both runs use the same seed; different routes can produce different later apple positions. Higher score wins; equal scores are a draw.'] : [])];
  for (const text of paragraphs) { const p = document.createElement('p'); p.textContent = text; ui.rulesText.append(p); }
  ui.board.setAttribute('aria-label', duel ? 'Snake arena preview. Player 1 is green; Player 2 is amber.' : 'Snake arena preview. Your snake is green; apples are red.');
  preview = createGame({ mode: duel ? 'duel' : 'classic', seed: 1 });
  if (!duel) { preview.snakes[0].body = [{x:8,y:8},{x:7,y:8},{x:6,y:8},{x:5,y:8},{x:4,y:8},{x:4,y:9},{x:4,y:10},{x:4,y:11},{x:5,y:11},{x:6,y:11},{x:7,y:11}]; preview.food = [{x:13,y:8}]; }
  ui.p1Name.textContent = duel ? 'Player 1' : 'Your snake'; ui.p2Name.textContent = duel ? opponent === 'bot' ? 'Computer' : 'Player 2' : 'Best'; ui.p2Mark.hidden = !duel;
  ui.p1Score.textContent = '0'; ui.p2Score.textContent = duel ? '0' : best();
  ui.middleScore.textContent = duel ? 'FIRST TO 3' : style === 'ghost' ? 'GHOST RACE' : style.toUpperCase();
  ui.arenaLabel.textContent = duel ? 'A LEVEL PLAYING FIELD' : 'THE PRACTICE GREEN';
  ui.statusText.textContent = duel ? 'Same speed. Same rules. Settle it on the board.' : 'Eat the red apples. Keep your head clear.';
  ui.controlsHint.innerHTML = duel && opponent === 'local' ? '<span><kbd>W A S D</kbd> Player 1</span><span><kbd>↑ ← ↓ →</kbd> Player 2</span>' : '<span><kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd> or <kbd>W A S D</kbd> to steer</span><span><kbd>Esc</kbd> pause</span>';
  if (duel && opponent === 'online') ui.controlsHint.lastElementChild.textContent = 'Online matches cannot be paused.';
}
function playControls(visible) {
  ui.pauseButton.hidden = !visible || !!connection; ui.exitButton.hidden = !visible;
  ui.touchControls.hidden = !visible || session?.opponent === 'local'; ui.controlsHint.hidden = !visible;
}
function overlay(eyebrow, title, text, button = '', action = null, focus = true) {
  playControls(false);
  ui.overlay.hidden = false; ui.overlayEyebrow.textContent = eyebrow; ui.overlayTitle.textContent = title; ui.overlayText.textContent = text;
  ui.continueButton.hidden = !button; ui.continueButton.textContent = button; ui.continueButton.onclick = action;
  ui.roomShare.hidden = true; ui.countdown.hidden = true;
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
  resultSaved = ''; recording = session.style === 'ghost' ? loadGhost(session.speed) : null;
  const seed = recording?.seed ?? randomSeed();
  game = createGame({ mode: session.mode === 'duel' ? 'duel' : session.style === 'arcade' ? 'arcade' : 'classic', speed: session.speed, seed });
  previous = positions(game); accumulator = 0; ghostIndex = 0;
  ghost = recording ? createGame({ seed: recording.seed, speed: recording.speed }) : null;
  screen = 'countdown'; countdownEnd = performance.now() + 3000; lastCount = null;
  ui.overlay.hidden = true; ui.countdown.hidden = false; ui.countdownText.textContent = session.opponent === 'local' ? 'Player 1: W A S D · Player 2: arrow keys' : 'Get ready';
  ui.pauseButton.hidden = false; ui.pauseButton.textContent = 'Pause'; audio.setActive(false); updateHud();
}
function setupBusy(busy) {
  for (const el of ui.setup.querySelectorAll('button, select, input')) el.disabled = busy;
  ui.setup.setAttribute('aria-busy', String(busy));
  if (busy) ui.startButton.textContent = 'Connecting…';
}
async function start() {
  if (ui.startButton.disabled) return;
  error(); audio.unlock();
  session = { mode: selectedMode, style: ui.style.value, speed: ui.speed.value, opponent: selectedMode === 'duel' ? ui.opponent.value : null };
  if (session.opponent === 'online') {
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
    } catch (e) { activeConnection.close(); connection = null; session = null; setupBusy(false); updateSetup(); error(e.message || 'Could not reach the room server.'); }
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
    previous = positions(game ?? state.game); game = state.game;
    networkAt = performance.now(); lastNetworkTick = game.tick;
    if (state.phase === 'playing') handleEvents(game.events);
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
    if (oldScreen !== 'playing') { audio.effect('go'); audio.setActive(true); if (game.tick === 0) audio.voice('start', true); }
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
  ui.arenaLabel.textContent = duel ? `${session.opponent === 'online' ? 'ONLINE' : session.opponent === 'bot' ? 'VS COMPUTER' : 'SAME KEYBOARD'} · ROUND ${series.round}` : session.style === 'ghost' ? 'GHOST RACE' : `${session.style.toUpperCase()} · ${session.speed.toUpperCase()}`;
  ui.p1Name.textContent = duel ? session.opponent === 'online' && me === 0 ? 'You · P1' : 'Player 1' : 'Your snake';
  ui.p2Name.textContent = duel ? session.opponent === 'bot' ? 'Computer' : session.opponent === 'online' && me === 1 ? 'You · P2' : 'Player 2' : ghost ? 'Ghost' : 'Best';
  ui.p1Score.textContent = game.snakes[0].score; ui.p2Score.textContent = duel ? game.snakes[1].score : ghost ? ghost.snakes[0].score : best(session.style, session.speed);
  ui.p2Mark.hidden = !duel;
  ui.middleScore.textContent = duel ? `${series.wins[0]} — ${series.wins[1]} ROUNDS` : session.style === 'ghost' ? recording ? `TARGET ${recording.score}` : 'RECORDING' : game.mode === 'arcade' ? 'POINTS' : 'APPLES';
  ui.comboWrap.hidden = session.style !== 'arcade' || duel;
  if (!ui.comboWrap.hidden) { ui.comboText.textContent = `×${Math.max(1, game.snakes[0].combo)}`; ui.comboMeter.value = Math.max(0, game.snakes[0].comboUntil - game.elapsedMs); }
  ui.timerText.textContent = duel ? `${Math.ceil(Math.max(0, ROUND_MS - game.elapsedMs) / 1000)}s left` : `${game.snakes[0].body.length} segments`;
  ui.statusText.textContent = duel ? 'Last snake moving wins. First to 3 rounds.' : session.style === 'arcade' ? 'Keep eating. Combos last 8 seconds.' : session.style === 'ghost' ? recording ? ghost?.status === 'finished' ? 'Ghost finished. Keep going to beat its score.' : 'The blue outline is your best run.' : 'Finish this run to save your first ghost.' : 'Find your rhythm. Watch your tail.';
  ui.board.setAttribute('aria-label', duel ? `Snake arena. Player 1: ${game.snakes[0].score} apples. Player 2: ${game.snakes[1].score} apples.` : `Snake arena. Score ${game.snakes[0].score}. Length ${game.snakes[0].body.length}.`);
}
function handleEvents(events) {
  for (const e of events ?? []) {
    if (e.type === 'eat') { audio.effect('eat'); if (e.id === (connection?.state?.player ?? 0)) audio.voice(e.points >= 3 ? 'combo' : 'eat'); }
    if (e.type === 'crash') audio.effect('crash');
  }
}
function saveRun() {
  const score = game.snakes[0].score, key = bestKey(session.style, session.speed);
  let ok = true;
  if (score > best(session.style, session.speed)) ok = put(key, score);
  const record = makeRecording(game);
  if (record) {
    const old = loadGhost(session.speed);
    if (!old || record.score > old.score || (record.score === old.score && record.ticks > old.ticks)) {
      ok = put(`ghost.${session.speed}`, record) && ok;
      resultSaved = ok ? 'Your best ghost is saved.' : 'Storage is unavailable; this ghost could not be saved.';
    } else resultSaved = 'Your previous best ghost is kept.';
  } else resultSaved = ok ? 'Arcade best saved on this device.' : 'Storage is unavailable; this score could not be saved.';
}
function showResults() {
  ui.comboWrap.hidden = true; ui.statusText.textContent = game.mode === 'duel' ? 'Round complete.' : 'Run complete.'; ui.timerText.textContent = '';
  ui.pauseButton.hidden = true; ui.countdown.hidden = true; ui.continueButton.disabled = false; ui.menuButton.textContent = 'Back to menu';
  if (game.mode === 'duel') {
    const wonMatch = series.wins.some(n => n >= 3), winner = game.winner;
    const label = winner === null ? 'A draw.' : session.opponent === 'bot' ? winner === 0 ? 'You take the round.' : 'Computer takes it.' : `Player ${winner + 1} takes it.`;
    const title = wonMatch ? session.opponent === 'bot' ? series.wins[0] >= 3 ? 'You win the match.' : 'Computer wins.' : `Player ${series.wins[0] >= 3 ? 1 : 2} wins the match.` : label;
    const why = game.reason === 'double-crash' ? 'Both snakes crashed on the same step. No round awarded.' : game.reason === 'time' ? winner === null ? 'Time is up. Equal apples, equal honours.' : 'Time is up. More apples wins this round.' : game.reason === 'board-full' ? 'The arena is full. More apples wins.' : `Player ${1 - winner + 1} hit ${game.snakes[1 - winner].death === 'wall' ? 'the wall' : game.snakes[1 - winner].death === 'self' ? 'their own body' : 'the other snake'}.`;
    overlay(wonMatch ? 'MATCH COMPLETE' : `ROUND ${series.round} COMPLETE`, title, why, connection ? wonMatch ? 'Ready for rematch' : 'Ready for next round' : wonMatch ? 'Play another match' : 'Next round', () => {
      audio.unlock();
      if (connection) { connection.ready(); ui.continueButton.disabled = true; ui.continueButton.textContent = 'Waiting for opponent…'; }
      else { series = wonMatch ? { round: 1, wins: [0, 0] } : { round: series.round + 1, wins: [...series.wins] }; beginLocalRound(); }
    });
    const me = connection?.state?.player ?? 0;
    audio.voice(winner === null ? 'draw' : session.opponent === 'local' || winner === me ? 'win' : 'lose', true);
  } else {
    const score = game.snakes[0].score;
    const titles = { wall: 'That wall won.', self: 'A twist too far.', 'board-full': 'Every square. Yours.', limit: 'A marathon run.' };
    const ghostResult = recording ? score > recording.score ? 'You beat your ghost.' : score === recording.score ? 'A tie with your ghost.' : 'Your ghost keeps the crown.' : null;
    overlay('RUN COMPLETE', ghostResult ?? titles[game.reason] ?? 'Good run.', `${score} point${score === 1 ? '' : 's'} · ${game.snakes[0].apples} apples · ${Math.floor(game.elapsedMs / 1000)} seconds\n${resultSaved}`, 'Play again', () => { audio.unlock(); beginLocalRound(); });
    audio.voice(game.reason === 'board-full' || (recording && score > recording.score) ? 'win' : game.reason === 'self' ? 'self' : game.reason === 'wall' ? 'wall' : 'lose', true);
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
  screen = 'menu'; ui.controlsHint.hidden = false; audio.stop(); ui.app.classList.remove('playing'); ui.overlay.hidden = true; ui.countdown.hidden = true; ui.previewTag.hidden = false;
  ui.pauseButton.hidden = true; ui.exitButton.hidden = true; ui.touchControls.hidden = true; ui.comboWrap.hidden = true; ui.timerText.textContent = ''; ui.connectionStatus.textContent = '';
  ui.startButton.disabled = false; ui.continueButton.disabled = false; ui.board.removeAttribute('tabindex'); ui.menuButton.textContent = 'Back to menu';
  history.replaceState(null, '', location.pathname); updateSetup(); window.scrollTo({ top: 0, behavior: 'instant' }); ui.startButton.focus({ preventScroll: true });
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
    if (!connection && now >= countdownEnd) { screen = 'playing'; accumulator = 0; ui.countdown.hidden = true; audio.effect('go'); audio.setActive(true); if (game.tick === 0) audio.voice('start', true); }
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
  const fraction = screen !== 'playing' ? 1 : connection ? Math.min(1, (now - networkAt) / 110) : accumulator / stepDuration(game);
  renderer.draw(screen === 'menu' || !game ? preview : game, screen === 'menu' ? null : previous, fraction, ghost, screen === 'menu');
  requestAnimationFrame(frame);
}
ui.soloMode.onclick = () => { selectedMode = 'solo'; updateSetup(); };
ui.duelMode.onclick = () => { selectedMode = 'duel'; updateSetup(); };
for (const id of ['style', 'speed', 'opponent', 'roomAction']) ui[id].onchange = updateSetup;
ui.startButton.onclick = start; ui.menuButton.onclick = requestLeave; ui.exitButton.onclick = requestLeave;
ui.pauseButton.onclick = () => screen === 'paused' ? resume() : pause();
ui.viewButton.onclick = () => { renderer.flat = !renderer.flat; ui.viewButton.setAttribute('aria-pressed', String(renderer.flat)); ui.viewButton.textContent = renderer.flat ? 'Raised view' : 'Flat view'; };
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
ui.previewSound.onclick = () => { audio.unlock(); if (!sound.voice) { sound.voice = true; ui.voiceSetting.checked = true; put('sound', sound); } audio.voice('win', true); };
const keyDirs = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
window.addEventListener('keydown', event => {
  if (event.isComposing || event.metaKey || event.ctrlKey || event.altKey || /INPUT|SELECT|TEXTAREA/.test(event.target.tagName) || document.querySelector('dialog[open]')) return;
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
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
// Retire the previous game's cache so localhost cannot serve its old entry point.
if ('serviceWorker' in navigator) navigator.serviceWorker.getRegistrations().then(registrations => { for (const registration of registrations) registration.unregister(); }).catch(() => {});
updateSetup(); requestAnimationFrame(frame);
