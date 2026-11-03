// Share sheet and card utilities.
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
