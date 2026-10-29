import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Rooms, RoomError } from './rooms.mjs';
const ROOT = fileURLToPath(new URL('../web/', import.meta.url));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ttf': 'font/ttf', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
export function createServer() {
  const rooms = new Rooms(), rates = new Map();
  const ticker = setInterval(() => rooms.advance(), 20); ticker.unref();
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; font-src 'self'; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
    res.setHeader('Cache-Control', 'no-store');
    function json(status, value) { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(value)); }
    try {
      const url = new URL(req.url, 'http://localhost');
      if (['/health', '/healthz', '/api/health'].includes(url.pathname)) {
        if (!['GET', 'HEAD'].includes(req.method)) { res.setHeader('Allow', 'GET, HEAD'); return json(405, { error: 'Use GET or HEAD.' }); }
        if (req.method === 'HEAD') { res.writeHead(200); return res.end(); }
        return json(200, { status: 'ok', uptime: Math.floor(process.uptime()), timestamp: Date.now() });
      }
      if (url.pathname === '/api/rooms') {
        if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return json(405, { error: 'Use POST.' }); }
        if (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) return json(403, { error: 'Origin not allowed.' });
        if (!req.headers['content-type']?.startsWith('application/json')) return json(415, { error: 'Send JSON.' });
        const ip = req.socket.remoteAddress, now = Date.now();
        let rate = rates.get(ip);
        if (!rate || now - rate.start > 10000) { rate = { start: now, count: 0, opens: 0 }; rates.set(ip, rate); }
        if (++rate.count > 400) return json(429, { error: 'Too many requests. Wait a moment.' });
        if (rates.size > 1000) for (const [key, entry] of rates) if (now - entry.start > 10000) rates.delete(key);
        let raw = '', bytes = 0;
        for await (const chunk of req) { bytes += chunk.length; if (bytes > 16384) throw new RoomError('Request too large.', 413); raw += chunk; }
        let body; try { body = JSON.parse(raw); } catch { throw new RoomError('Invalid JSON.'); }
        if (['create', 'join'].includes(body?.action) && ++rate.opens > 12) throw new RoomError('Too many room requests. Wait a moment.', 429);
        return json(200, rooms.request(body));
      }
      if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); return res.end(); }
      const decoded = decodeURIComponent(url.pathname);
      const relative = decoded === '/' ? 'index.html' : decoded.slice(1);
      const filename = path.resolve(ROOT, relative);
      if (!filename.startsWith(ROOT) || relative.split('/').includes('..')) { res.writeHead(403); return res.end('Forbidden'); }
      const stat = await fs.promises.stat(filename);
      if (!stat.isFile()) throw new Error('Not found');
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(filename)] || 'application/octet-stream', 'Content-Length': stat.size });
      if (req.method === 'HEAD') return res.end();
      fs.createReadStream(filename).pipe(res);
    } catch (error) {
      if (res.headersSent) return res.end();
      json(error instanceof RoomError ? error.status : 404, { error: error instanceof RoomError ? error.message : 'Not found.' });
    }
  });
  server.on('close', () => clearInterval(ticker));
  return server;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 8124), host = process.env.HOST || '127.0.0.1';
  createServer().listen(port, host, () => console.log(`Snake Arena: http://${host}:${port}`));
}
