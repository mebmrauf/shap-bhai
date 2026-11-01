// An installed app resumes from memory instead of navigating, so the browser never looks for
// a new version by itself. This asks on every return, and reloads at the first safe moment.
const CHECK_EVERY_MS = 15 * 60 * 1000, MIN_GAP_MS = 60 * 1000;
export function keepUpdated({ isBusy, worker = navigator.serviceWorker, reload = () => location.reload(), doc = document, win = window, now = () => Date.now() }) {
  let registration = null, pending = false, reloading = false, lastCheck = 0;
  // The very first install also changes the controller, but that page is already current.
  let hadController = !!worker?.controller;
  const check = (force = false) => {
    if (!registration || (!force && now() - lastCheck < MIN_GAP_MS)) return;
    lastCheck = now();
    registration.update().catch(() => {});
  };
  const applyPending = (force = false) => {
    if (!pending || reloading || (!force && isBusy())) return false;
    reloading = true; reload();
    return true;
  };
  if (!worker) return { applyPending, check, start: () => {} };
  worker.addEventListener('controllerchange', () => {
    if (!hadController) { hadController = true; return; }
    pending = true; applyPending();
  });
  const start = async () => {
    try { registration = await worker.register('/sw.js', { updateViaCache: 'none' }); } catch { return; }
    check(true);
    doc.addEventListener('visibilitychange', () => { if (!doc.hidden) { check(); applyPending(); } });
    win.addEventListener('online', () => check(true));
    win.addEventListener('pageshow', () => check());
    win.setInterval(() => { if (!doc.hidden) check(true); }, CHECK_EVERY_MS);
  };
  return { applyPending, check, start };
}
