# Dev-only: draws every app icon from one scene, so the PNGs and SVG always match. Needs Pillow.
# Run from the project root: python3 scripts/generate-icons.py
import math
from PIL import Image, ImageDraw

TILE_TOP = ('#176b73', '#125a63')
SKYLINE = [(.02, .30, '#ef476f'), (.17, .42, '#ffd166'), (.32, .25, '#06d6a0'), (.47, .46, '#3a86ff'), (.62, .30, '#ff9f1c'), (.78, .38, '#c77dff')]

def iso(u, v, h=0):
    return (.5 + (u - v) * .46, .50 + (u + v - 1) * .235 - h)

def snake_cells():
    path = [(.10, .84), (.84, .84), (.84, .20), (.34, .20)]
    cells, step = [], .118
    for (a, b), (c, d) in zip(path, path[1:]):
        n = max(1, round(math.hypot(c - a, d - b) / step))
        cells += [(a + (c - a) * i / n, b + (d - b) * i / n) for i in range(n)]
    return cells + [path[-1]]

def balls():
    cells = snake_cells()
    out = []
    for i, (u, v) in enumerate(cells):
        head = i == len(cells) - 1
        taper = min(1, .55 + i * .07)
        color = '#ff2e63' if head else ('#ffd23f' if i % 2 else '#a8f04a')
        x, y = iso(u, v, .075 if head else .035)
        out.append((x, y, .118 if head else .05 * taper, color, head))
    return sorted(out, key=lambda b: b[1])

def shade(hex_color, amount):
    r, g, b = (int(hex_color[i:i + 2], 16) for i in (1, 3, 5))
    mix = (255 if amount > 0 else 0)
    a = abs(amount)
    return tuple(round(c + (mix - c) * a) for c in (r, g, b))

def png(size, scale, rounded):
    S = size * 4
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    bg = Image.new('RGBA', (S, S))
    top, bottom = (17, 28, 66), (58, 22, 74)
    for y in range(S):
        f = y / S
        ImageDraw.Draw(bg).line([(0, y), (S, y)], fill=tuple(round(a + (b - a) * f) for a, b in zip(top, bottom)) + (255,))
    mask = Image.new('L', (S, S), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * .225) if rounded else 0, fill=255)
    im.paste(bg, (0, 0), mask)
    d = ImageDraw.Draw(im)
    off = (1 - scale) / 2
    P = lambda x, y: (S * (off + scale * x), S * (off + scale * y))
    sx, sy = P(.5, .22); r = S * scale * .155
    d.ellipse([sx - r, sy - r, sx + r, sy + r], fill='#ffb703')
    for x, h, c in SKYLINE:
        x0, y0 = P(x + .08, .50 - h * .78); x1, y1 = P(x + .08 + .135, .55)
        d.rectangle([x0, y0, x1, y1], fill=c)
        for wy in range(3):
            for wx in range(2):
                a, b = P(x + .105 + wx * .05, .50 - h * .78 + .03 + wy * .055)
                w = S * scale * .024
                d.rectangle([a, b, a + w, b + w * 1.2], fill=(255, 245, 210, 255))
    drop = .085
    L, R, T, B = iso(0, 1), iso(1, 0), iso(0, 0), iso(1, 1)
    d.polygon([P(*L), P(*B), P(B[0], B[1] + drop), P(L[0], L[1] + drop)], fill='#d7263d')
    d.polygon([P(*R), P(*B), P(B[0], B[1] + drop), P(R[0], R[1] + drop)], fill='#9f1530')
    d.polygon([P(*T), P(*R), P(*B), P(*L)], fill=TILE_TOP[0])
    n = 5
    for a in range(n):
        for b in range(n):
            if (a + b) % 2:
                d.polygon([P(*iso(a / n, b / n)), P(*iso((a + 1) / n, b / n)), P(*iso((a + 1) / n, (b + 1) / n)), P(*iso(a / n, (b + 1) / n))], fill=TILE_TOP[1])
    trim = int(S * scale * .012)
    d.line([P(*L), P(*B), P(*R)], fill='#ffd23f', width=trim)
    d.line([P(L[0], L[1] + drop), P(B[0], B[1] + drop), P(R[0], R[1] + drop)], fill='#ffd23f', width=trim)
    for x, y, r, color, head in balls():
        cx, cy = P(x, y); R_ = S * scale * r
        d.ellipse([cx - R_ * .9, cy + R_ * .1, cx + R_ * .9, cy + R_ * .9], fill=(5, 20, 25, 110))
        for i in range(24):
            f = 1 - i / 24
            a = -.34 + (1 - f) * .62
            rr = R_ * f
            ox, oy = -R_ * .3 * (1 - f), -R_ * .34 * (1 - f)
            d.ellipse([cx + ox - rr, cy + oy - rr, cx + ox + rr, cy + oy + rr], fill=shade(color, a))
        if head:
            for side in (-1, 1):
                ex, ey = cx + R_ * .05 + side * R_ * .42, cy - R_ * .12 + side * R_ * .10
                w = R_ * .30
                d.ellipse([ex - w, ey - w, ex + w, ey + w], fill='#ffffff')
                w *= .52
                d.ellipse([ex + w * .3 - w, ey + w * .1 - w, ex + w * .3 + w, ey + w * .1 + w], fill='#14241a')
    return im.resize((size, size), Image.LANCZOS)

def svg():
    v = lambda p: f'{p[0] * 100:.2f},{p[1] * 100:.2f}'
    L, R, T, B = iso(0, 1), iso(1, 0), iso(0, 0), iso(1, 1)
    drop = .085
    down = lambda p: (p[0], p[1] + drop)
    parts = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="s" x2="0" y2="1"><stop stop-color="#111c42"/><stop offset="1" stop-color="#3a164a"/></linearGradient>']
    for name, c in (('a', '#a8f04a'), ('b', '#ffd23f'), ('c', '#ff2e63')):
        parts.append(f'<radialGradient id="{name}" cx=".36" cy=".32" r=".75"><stop stop-color="#{"%02x%02x%02x" % shade(c, .34)}"/><stop offset=".55" stop-color="{c}"/><stop offset="1" stop-color="#{"%02x%02x%02x" % shade(c, -.28)}"/></radialGradient>')
    parts.append('</defs><rect width="100" height="100" rx="22" fill="url(#s)"/><circle cx="50" cy="22" r="15.5" fill="#ffb703"/>')
    for x, h, c in SKYLINE:
        y = 50 - h * 78
        parts.append(f'<rect x="{x * 100 + 8:.1f}" y="{y:.1f}" width="13.5" height="{55 - y:.1f}" fill="{c}"/>')
    parts.append(f'<polygon points="{v(L)} {v(B)} {v(down(B))} {v(down(L))}" fill="#d7263d"/><polygon points="{v(R)} {v(B)} {v(down(B))} {v(down(R))}" fill="#9f1530"/><polygon points="{v(T)} {v(R)} {v(B)} {v(L)}" fill="{TILE_TOP[0]}"/>')
    for a in range(5):
        for b in range(5):
            if (a + b) % 2:
                parts.append(f'<polygon points="{v(iso(a / 5, b / 5))} {v(iso((a + 1) / 5, b / 5))} {v(iso((a + 1) / 5, (b + 1) / 5))} {v(iso(a / 5, (b + 1) / 5))}" fill="{TILE_TOP[1]}"/>')
    parts.append(f'<polyline points="{v(L)} {v(B)} {v(R)}" fill="none" stroke="#ffd23f" stroke-width="1.2"/>')
    ids = {'#a8f04a': 'a', '#ffd23f': 'b', '#ff2e63': 'c'}
    for x, y, r, color, head in balls():
        parts.append(f'<circle cx="{x * 100:.2f}" cy="{y * 100:.2f}" r="{r * 100:.2f}" fill="url(#{ids[color]})"/>')
        if head:
            for side in (-1, 1):
                ex, ey = (x + r * .05 + side * r * .42) * 100, (y - r * .12 + side * r * .10) * 100
                parts.append(f'<circle cx="{ex:.2f}" cy="{ey:.2f}" r="{r * 30:.2f}" fill="#fff"/><circle cx="{ex + r * 5:.2f}" cy="{ey:.2f}" r="{r * 16:.2f}" fill="#14241a"/>')
    parts.append('</svg>\n')
    return ''.join(parts)

png(192, .94, True).save('web/icon-192.png')
png(512, .94, True).save('web/icon-512.png')
# Launchers crop maskable icons to a circle or squircle, so the scene stays in the middle 80%.
png(192, .74, False).save('web/icon-maskable-192.png')
png(512, .74, False).save('web/icon-maskable-512.png')
png(180, .90, False).convert('RGB').save('web/apple-touch-icon.png')
open('web/icon.svg', 'w').write(svg())
