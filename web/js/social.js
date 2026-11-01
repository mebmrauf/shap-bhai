// Everything that talks to the leaderboard API or the phone's share sheet.
const TOKEN_KEY = 'snake-arena.v2.player';
let memoryToken = null;
export function playerToken() {
  const fresh = () => [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2, '0')).join('');
  try {
    let token = localStorage.getItem(TOKEN_KEY);
    if (!/^[a-f0-9]{32}$/.test(token ?? '')) { token = fresh(); localStorage.setItem(TOKEN_KEY, token); }
    return token;
  } catch { return memoryToken ??= fresh(); }
}
async function request(path, body) {
  const response = await fetch(path, { ...(body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(12000) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) { const error = new Error(data.error ?? 'Could not reach the server.'); error.status = response.status; throw error; }
  return data;
}
export const saveProfile = profile => request('/api/profile', { token: playerToken(), ...profile });
export const submitDaily = record => request('/api/daily', { token: playerToken(), record });
export const fetchBoard = (scope, crew = '') => request(`/api/leaderboard?scope=${encodeURIComponent(scope)}&crew=${encodeURIComponent(crew)}`);
export const createGhost = (record, name) => request('/api/ghosts', { record, name });
export const fetchGhost = id => request(`/api/ghosts/${encodeURIComponent(id)}`);
export const bnDigits = n => String(n).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]);
const isCancel = error => error?.name === 'AbortError';
// Returns what happened so the button can say so.
export async function sendLink(url, text) {
  if (navigator.share) {
    try { await navigator.share({ text, url }); return 'shared'; } catch (error) { if (isCancel(error)) return 'cancelled'; }
  }
  await navigator.clipboard.writeText(`${text} ${url}`);
  return 'copied';
}
function wrap(c, text, maxWidth) {
  const lines = []; let line = '';
  for (const word of text.split(' ')) {
    const attempt = line ? `${line} ${word}` : word;
    if (c.measureText(attempt).width > maxWidth && line) { lines.push(line); line = word; } else line = attempt;
  }
  return [...lines, line];
}
// A 9:16 card sized for stories and status posts. `shot` is a canvas copied at the moment of the crash.
export async function makeCard({ line, sentence, score, shot, host }) {
  await document.fonts.load('700 60px Bangla', 'বাংলা').catch(() => {});
  const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1920;
  const c = canvas.getContext('2d');
  const sky = c.createLinearGradient(0, 0, 0, 1920); sky.addColorStop(0, '#d7263d'); sky.addColorStop(.55, '#a4133c'); sky.addColorStop(1, '#0b6e6e');
  c.fillStyle = sky; c.fillRect(0, 0, 1080, 1920);
  const band = y => {
    c.fillStyle = '#ffc300'; c.fillRect(0, y, 1080, 92); c.fillStyle = '#0b6e6e'; c.fillRect(0, y + 8, 1080, 76);
    for (let x = 45; x < 1080; x += 90) {
      c.fillStyle = '#fff'; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; c.beginPath(); c.ellipse(x + Math.cos(a) * 15, y + 46 + Math.sin(a) * 15, 11, 7, a, 0, 7); c.fill(); }
      c.fillStyle = '#ffc300'; c.beginPath(); c.arc(x, y + 46, 10, 0, 7); c.fill();
    }
  };
  band(0); band(1828);
  c.textAlign = 'center'; c.fillStyle = '#fff4d6'; c.font = '700 44px system-ui, sans-serif'; c.fillText('DHAKA IN 3D', 540, 180);
  c.font = '700 74px Bangla, sans-serif'; c.fillStyle = '#fff';
  let y = 300; for (const row of wrap(c, line, 940)) { c.fillText(row, 540, y); y += 104; }
  const top = Math.max(y, 500), width = 940, height = 700;
  c.save(); c.beginPath(); c.roundRect(70, top, width, height, 36); c.clip();
  if (shot) {
    const scale = Math.max(width / shot.width, height / shot.height), w = shot.width * scale, h = shot.height * scale;
    c.drawImage(shot, 70 + (width - w) / 2, top + (height - h) / 2, w, h);
  } else { c.fillStyle = '#162f29'; c.fillRect(70, top, width, height); }
  c.restore(); c.lineWidth = 10; c.strokeStyle = '#ffc300'; c.beginPath(); c.roundRect(70, top, width, height, 36); c.stroke();
  c.fillStyle = '#ffc300'; c.font = '700 180px Bangla, sans-serif'; c.fillText(bnDigits(score), 540, top + height + 190);
  c.fillStyle = '#fff'; c.font = '46px Bangla, sans-serif';
  y = top + height + 270; for (const row of wrap(c, sentence, 940)) { c.fillText(row, 540, y); y += 66; }
  c.font = '700 44px Bangla, sans-serif'; c.fillStyle = '#ffe9a8'; c.fillText('তুমি পারবা?', 540, 1730);
  c.font = '34px system-ui, sans-serif'; c.fillStyle = '#fff4d6'; c.fillText(host, 540, 1790);
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not draw the card.')), 'image/png'));
}
export async function shareCard(blob, text, url) {
  const file = new File([blob], 'dhaka-in-3d.png', { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], text: `${text} ${url}` }); return 'shared'; } catch (error) { if (isCancel(error)) return 'cancelled'; }
  }
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'dhaka-in-3d.png'; link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 10000);
  return 'saved';
}
