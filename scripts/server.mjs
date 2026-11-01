import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { createHash, createHmac, randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Rooms, RoomError } from './rooms.mjs';
import { connectLeaderboard } from './leaderboard.mjs';
const ROOT = fileURLToPath(new URL('../web/', import.meta.url));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ttf': 'font/ttf', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
// Changes whenever any game file changes, which is what makes browsers pick up a new version.
function buildId() {
  const hash = createHash('sha256');
  for (const name of fs.readdirSync(ROOT, { recursive: true }).map(String).sort()) {
    const file = path.join(ROOT, name);
    if (fs.statSync(file).isFile() && name !== 'sw.js' && !path.basename(name).startsWith('.')) hash.update(name).update(fs.readFileSync(file));
  }
  return hash.digest('hex').slice(0, 12);
}
const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.svg', '.json']);
const REPLAY_BYTES = 300000;
export function createServer({ leaderboard = null } = {}) {
  const rooms = new Rooms(), rates = new Map(), build = buildId();
  const ipSecret = process.env.IP_HASH_SECRET || randomBytes(32).toString('hex');
  // Render's proxy is the socket peer, so the real client is the first forwarded address.
  // shortcut: a client can forge this header to dodge rate limits; use the platform's verified IP header if abuse appears.
  const clientKey = req => createHmac('sha256', ipSecret).update((process.env.RENDER && req.headers['x-forwarded-for']?.split(',')[0].trim()) || req.socket.remoteAddress || '').digest('hex');
  const ticker = setInterval(() => rooms.advance(), 20); ticker.unref();
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; font-src 'self'; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
    res.setHeader('Cache-Control', 'no-store');
    function json(status, value) {
      // A rejected request may still have an unread body, which would corrupt a reused connection.
      if (!req.complete) res.setHeader('Connection', 'close');
      const text = JSON.stringify(value);
      // Room snapshots repeat heavily, so this saves real bandwidth on a slow link.
      if (text.length > 512 && /\bgzip\b/.test(req.headers['accept-encoding'] ?? '')) {
        res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Encoding': 'gzip', Vary: 'Accept-Encoding' });
        return res.end(zlib.gzipSync(text, { level: 1 }));
      }
      res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(text);
    }
    function rateFor() {
      const ip = clientKey(req), now = Date.now();
      let rate = rates.get(ip);
      if (!rate || now - rate.start > 10000) { rate = { start: now, count: 0, opens: 0, writes: 0 }; rates.set(ip, rate); }
      if (rates.size > 1000) for (const [key, entry] of rates) if (now - entry.start > 10000) rates.delete(key);
      return rate;
    }
    async function readJson(limit) {
      if (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) throw new RoomError('Origin not allowed.', 403);
      if (!req.headers['content-type']?.startsWith('application/json')) throw new RoomError('Send JSON.', 415);
      if (Number(req.headers['content-length']) > limit) throw new RoomError('Request too large.', 413);
      let raw = '', bytes = 0;
      for await (const chunk of req) { bytes += chunk.length; if (bytes > limit) throw new RoomError('Request too large.', 413); raw += chunk; }
      try { return JSON.parse(raw); } catch { throw new RoomError('Invalid JSON.'); }
    }
    try {
      const url = new URL(req.url, 'http://localhost');
      if (['/health', '/healthz', '/api/health'].includes(url.pathname)) {
        if (!['GET', 'HEAD'].includes(req.method)) { res.setHeader('Allow', 'GET, HEAD'); return json(405, { error: 'Use GET or HEAD.' }); }
        if (req.method === 'HEAD') { res.writeHead(200); return res.end(); }
        return json(200, { status: 'ok', uptime: Math.floor(process.uptime()), timestamp: Date.now() });
      }
      if (url.pathname === '/api/rooms') {
        if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return json(405, { error: 'Use POST.' }); }
        const rate = rateFor();
        if (++rate.count > 400) return json(429, { error: 'Too many requests. Wait a moment.' });
        const body = await readJson(16384);
        if (['create', 'join'].includes(body?.action) && ++rate.opens > 12) throw new RoomError('Too many room requests. Wait a moment.', 429);
        return json(200, rooms.request(body));
      }
      if (url.pathname.startsWith('/api/')) {
        const ghostMatch = url.pathname.match(/^\/api\/ghosts\/([^/]+)$/);
        const writes = { '/api/profile': 'saveProfile', '/api/daily': 'submitDaily', '/api/ghosts': 'saveGhost' }[url.pathname];
        const isRead = url.pathname === '/api/leaderboard' || !!ghostMatch;
        if (!writes && !isRead) return json(404, { error: 'Not found.' });
        if (req.method !== (writes ? 'POST' : 'GET')) { res.setHeader('Allow', writes ? 'POST' : 'GET'); return json(405, { error: `Use ${writes ? 'POST' : 'GET'}.` }); }
        if (!leaderboard) return json(503, { error: 'Online leaderboards are not set up on this server.' });
        const rate = rateFor();
        if (++rate.count > 400 || (writes && ++rate.writes > 6)) return json(429, { error: 'Too many requests. Wait a moment.' });
        if (writes) return json(200, await leaderboard[writes](await readJson(REPLAY_BYTES)));
        if (ghostMatch) return json(200, await leaderboard.ghost(decodeURIComponent(ghostMatch[1])));
        return json(200, await leaderboard.top({ scope: url.searchParams.get('scope') ?? 'everyone', crew: url.searchParams.get('crew') ?? '' }));
      }
      if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); return res.end(); }
      const decoded = decodeURIComponent(url.pathname);
      const relative = decoded === '/' ? 'index.html' : decoded.slice(1);
      const filename = path.resolve(ROOT, relative);
      if (!filename.startsWith(ROOT) || relative.split('/').includes('..')) { res.writeHead(403); return res.end('Forbidden'); }
      if (relative === 'sw.js') { res.writeHead(200, { 'Content-Type': TYPES['.js'] }); return res.end(req.method === 'HEAD' ? undefined : (await fs.promises.readFile(filename, 'utf8')).replace('__BUILD__', build)); }
      const stat = await fs.promises.stat(filename);
      if (!stat.isFile()) throw new Error('Not found');
      const extension = path.extname(filename), gzip = COMPRESSIBLE.has(extension) && /\bgzip\b/.test(req.headers['accept-encoding'] ?? '');
      // Vendor paths carry their version, so they can be cached for good.
      if (relative.startsWith('vendor/')) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      if (COMPRESSIBLE.has(extension)) res.setHeader('Vary', 'Accept-Encoding');
      res.writeHead(200, { 'Content-Type': TYPES[extension] || 'application/octet-stream', ...(gzip ? { 'Content-Encoding': 'gzip' } : { 'Content-Length': stat.size }) });
      if (req.method === 'HEAD') return res.end();
      const file = fs.createReadStream(filename);
      if (gzip) file.pipe(zlib.createGzip()).pipe(res); else file.pipe(res);
    } catch (error) {
      if (res.headersSent) return res.end();
      if (error instanceof RoomError) return json(error.status, { error: error.message });
      // Database failures reach the log by code only, and players get a plain message.
      if (req.url.startsWith('/api/') && !(error instanceof TypeError)) { console.error('Request failed:', error.code ?? 'unknown'); return json(503, { error: 'The leaderboard is unavailable right now.' }); }
      json(404, { error: 'Not found.' });
    }
  });
  server.on('close', () => clearInterval(ticker));
  return server;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try { process.loadEnvFile(new URL('../.env', import.meta.url)); } catch { /* Hosted platforms set real environment variables. */ }
  const port = Number(process.env.PORT || 8124), host = process.env.HOST || '127.0.0.1';
  createServer({ leaderboard: await connectLeaderboard() }).listen(port, host, () => console.log(`Shap Bhai: http://${host}:${port}`));
}
