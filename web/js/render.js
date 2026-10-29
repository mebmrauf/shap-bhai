import { SIZE, DIRECTIONS } from './engine.js';
export class ArenaRenderer {
  constructor(canvas) { this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.flat = false; this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches; this.width = 0; this.height = 0; }
  resize() {
    const { width, height } = this.canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    if (width !== this.width || height !== this.height || dpr !== this.dpr) {
      this.width = width; this.height = height; this.dpr = dpr;
      this.canvas.width = Math.round(width * dpr); this.canvas.height = Math.round(height * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }
  draw(game, previous, fraction = 1, ghost = null, preview = false) {
    this.resize();
    const c = this.ctx, w = this.width, h = this.height;
    if (!w || !h || !game) return;
    const tilt = this.flat ? 1 : .82;
    const u = Math.min((w - 52) / SIZE, (h - 82) / (SIZE * tilt));
    const left = (w - SIZE * u) / 2, top = (h - SIZE * u * tilt) / 2 - (preview ? 4 : 0);
    const depth = this.flat ? 2 : u * .48;
    const project = (x, y, z = 0) => [left + x * u, top + y * u * tilt - z * u];
    c.clearRect(0, 0, w, h); c.fillStyle = '#162f29'; c.fillRect(0, 0, w, h);
    // A raised board with orthographic controls: screen up always means up.
    c.fillStyle = '#0d211b'; c.beginPath(); c.roundRect(left - 7, top + 8, SIZE * u + 14, SIZE * u * tilt + depth + 8, 8); c.fill();
    c.fillStyle = '#3c5c49'; c.beginPath(); c.roundRect(left - 5, top - 5, SIZE * u + 10, SIZE * u * tilt + depth + 10, 6); c.fill();
    c.fillStyle = '#0d251e'; c.fillRect(left, top, SIZE * u, SIZE * u * tilt);
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
      c.fillStyle = (x + y) % 2 ? '#223e33' : '#254236';
      const [px, py] = project(x, y); c.fillRect(px + .45, py + .45, u - .9, u * tilt - .9);
    }
    c.font = `${Math.max(7, u * .34)}px system-ui`; c.fillStyle = '#83977b'; c.textAlign = 'center';
    for (let i = 0; i < SIZE; i += 5) { const [x, y] = project(i + .5, 0); c.fillText(String(i + 1).padStart(2, '0'), x, y - 12); }
    if (preview) {
      const head = game.snakes[0].body[0], food = game.food[0];
      c.strokeStyle = '#b6d78860'; c.lineWidth = 1.5; c.setLineDash([3, 5]); c.beginPath();
      c.moveTo(...project(head.x + .5, head.y + .5)); c.lineTo(...project(food.x + .5, head.y + .5)); c.lineTo(...project(food.x + .5, food.y + .5)); c.stroke(); c.setLineDash([]);
    }
    for (const f of game.food) {
      const [x, y] = project(f.x + .5, f.y + .58);
      c.fillStyle = '#0a221a88'; c.beginPath(); c.ellipse(x + 2, y + 3, u * .32, u * .16, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#bc463a'; c.beginPath(); c.ellipse(x, y - u * .15, u * .29, u * .28, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#ed7d59'; c.beginPath(); c.ellipse(x - u * .055, y - u * .25, u * .23, u * .2, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#2c271b'; c.lineWidth = Math.max(1.5, u * .06); c.beginPath(); c.moveTo(x, y - u * .42); c.lineTo(x + u * .04, y - u * .57); c.stroke();
      c.fillStyle = '#aac871'; c.beginPath(); c.ellipse(x + u * .13, y - u * .49, u * .13, u * .06, -.4, 0, Math.PI * 2); c.fill();
    }
    const drawSnake = (s, old, alpha, isGhost = false) => {
      const colors = s.id === 0 ? ['#bde58b', '#9dc86c', '#698d45'] : ['#f5c776', '#e3aa4f', '#a67231'];
      for (let i = s.body.length - 1; i >= 0; i--) {
        const p = s.body[i], q = old?.body[i] ?? old?.body.at(-1) ?? p;
        const x = q.x + (p.x - q.x) * alpha, y = q.y + (p.y - q.y) * alpha;
        const [px, py] = project(x + .07, y + .08, this.flat ? 0 : .17);
        const cw = u * .86, ch = u * tilt * .84, cd = this.flat ? 0 : u * .19;
        if (isGhost) {
          c.strokeStyle = '#a0dbeb'; c.lineWidth = Math.max(1, u * .07); c.globalAlpha = ghost.status === 'finished' ? .18 : .6;
          c.beginPath(); c.roundRect(px, py, cw, ch, u * .15); c.stroke(); c.globalAlpha = 1; continue;
        }
        c.fillStyle = '#081c1a55'; c.beginPath(); c.roundRect(px + 2, py + cd + 3, cw, ch, u * .16); c.fill();
        c.fillStyle = colors[2]; c.beginPath(); c.roundRect(px, py + cd, cw, ch, u * .16); c.fill();
        c.fillStyle = s.alive ? (i === 0 || i % 3 === 0 ? colors[0] : colors[1]) : '#849373';
        c.beginPath(); c.roundRect(px, py, cw, ch, u * .16); c.fill();
        if (i === 0) {
          const [dx, dy] = DIRECTIONS[s.dir], cx = px + cw / 2, cy = py + ch / 2;
          for (const side of [-1, 1]) {
            const ex = cx + (dx * .2 - dy * side * .2) * u, ey = cy + (dy * .2 + dx * side * .2) * u * tilt;
            c.fillStyle = '#fbf9d9'; c.beginPath(); c.arc(ex, ey, u * .115, 0, Math.PI * 2); c.fill();
            c.fillStyle = '#213b25'; c.beginPath(); c.arc(ex + dx * u * .035, ey + dy * u * .035, u * .057, 0, Math.PI * 2); c.fill();
          }
        }
      }
    };
    if (ghost) drawSnake(ghost.snakes[0], null, 1, true);
    for (const s of game.snakes) drawSnake(s, previous?.snakes[s.id], this.reduced ? 1 : Math.min(1, Math.max(0, fraction)));
  }
}
