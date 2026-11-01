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
export async function shareCard(blob, text, url) {
  const file = new File([blob], 'shap-bhai.png', { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], text: `${text} ${url}` }); return 'shared'; } catch (error) { if (isCancel(error)) return 'cancelled'; }
  }
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'shap-bhai.png'; link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 10000);
  return 'saved';
}
