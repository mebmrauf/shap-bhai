import { Scene, PerspectiveCamera, WebGLRenderer, Color, Fog, HemisphereLight, DirectionalLight, PointLight, Mesh, Group, InstancedMesh, Object3D, BoxGeometry, SphereGeometry, CylinderGeometry, ConeGeometry, PlaneGeometry, CircleGeometry, TorusGeometry, MeshLambertMaterial, MeshPhongMaterial, MeshBasicMaterial, CanvasTexture, RepeatWrapping, SRGBColorSpace, DoubleSide, Vector3 } from '../vendor/three-0.187.0/three.min.js';
import { SIZE, DIRECTIONS } from './engine.js';
import { THEMES, SKINS, foodKind } from './themes.js';

const AMBER = { head: '#ff7a00', body: ['#ffa53a', '#fff1c9', '#ffa53a'] };
const cellX = x => x + .5 - SIZE / 2, cellZ = y => y + .5 - SIZE / 2;
const lambert = color => new MeshLambertMaterial({ color });
function box(w, h, d, color, x = 0, y = 0, z = 0) { const m = new Mesh(new BoxGeometry(w, h, d), lambert(color)); m.position.set(x, y, z); return m; }
function cylinder(top, bottom, h, color, x = 0, y = 0, z = 0, segments = 10) { const m = new Mesh(new CylinderGeometry(top, bottom, h, segments), lambert(color)); m.position.set(x, y, z); return m; }
function ball(r, color, x = 0, y = 0, z = 0) { const m = new Mesh(new SphereGeometry(r, 12, 10), new MeshPhongMaterial({ color, shininess: 70 })); m.position.set(x, y, z); return m; }
function canvasTexture(width, height, paint) {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  paint(canvas.getContext('2d'), width, height);
  const texture = new CanvasTexture(canvas); texture.colorSpace = SRGBColorSpace; texture.anisotropy = 4;
  return texture;
}
function rickshaw(color = '#ef233c') {
  const g = new Group();
  g.add(box(.5, .22, .3, color, 0, .3, 0), box(.2, .08, .3, '#ffd166', -.08, .46, 0));
  const hood = new Mesh(new CylinderGeometry(.2, .2, .34, 10, 1, false, 0, Math.PI), lambert('#1d3557')); hood.rotation.x = Math.PI / 2; hood.rotation.y = Math.PI / 2; hood.position.set(-.1, .52, 0); g.add(hood);
  for (const [x, z] of [[-.16, .19], [-.16, -.19], [.3, 0]]) { const w = new Mesh(new TorusGeometry(.12, .025, 6, 12), lambert('#14151a')); w.position.set(x, .13, z); g.add(w); }
  g.add(box(.3, .03, .03, '#c0c0c0', .16, .22, 0));
  return g;
}
function bus(color = '#2a9d8f') {
  const g = new Group();
  g.add(box(.9, .55, .62, color, 0, .4, 0), box(.92, .17, .64, '#dff6ff', 0, .52, 0), box(.92, .06, .64, '#ffd166', 0, .27, 0));
  for (const x of [-.27, .27]) for (const z of [-.3, .3]) { const w = cylinder(.09, .09, .06, '#14151a', x, .1, z); w.rotation.x = Math.PI / 2; g.add(w); }
  return g;
}
function palm(x, z, height = 3) {
  const g = new Group(), trunk = cylinder(.09, .16, height, '#8d6e4a', 0, height / 2, 0, 6); trunk.rotation.z = .08; g.add(trunk);
  for (let i = 0; i < 6; i++) { const leaf = new Mesh(new ConeGeometry(.2, 1.5, 4), lambert('#2e9e4f')); leaf.position.set(Math.cos(i) * .6, height, Math.sin(i) * .6); leaf.rotation.set(Math.sin(i) * 1.2, 0, -Math.cos(i) * 1.2); g.add(leaf); }
  g.position.set(x, 0, z); return g;
}
function mangrove(x, z, scale = 1) {
  const g = new Group(); g.add(cylinder(.14, .22, 1.8, '#5b4630', 0, .9, 0, 6));
  for (const [ox, oy, oz, r] of [[0, 2.2, 0, .9], [.5, 1.8, .3, .6], [-.5, 1.9, -.2, .65]]) g.add(ball(r, '#2f7d46', ox, oy, oz));
  for (let i = 0; i < 4; i++) { const root = cylinder(.03, .05, .7, '#5b4630', Math.cos(i * 1.6) * .3, .25, Math.sin(i * 1.6) * .3, 5); root.rotation.set(Math.sin(i * 1.6) * .6, 0, -Math.cos(i * 1.6) * .6); g.add(root); }
  g.position.set(x, 0, z); g.scale.setScalar(scale); return g;
}
const windows = () => canvasTexture(64, 96, (c, w, h) => {
  c.fillStyle = '#fff'; c.fillRect(0, 0, w, h);
  for (let y = 6; y < h - 8; y += 22) for (let x = 7; x < w - 12; x += 20) { c.fillStyle = (x * y) % 5 ? '#39465e' : '#ffe08a'; c.fillRect(x, y, 12, 14); }
});
function building(texture, color, w, h, x, z) {
  const t = texture.clone(); t.wrapS = t.wrapT = RepeatWrapping; t.repeat.set(Math.max(1, Math.round(w)), Math.max(1, Math.round(h / 2))); t.needsUpdate = true;
  const m = new Mesh(new BoxGeometry(w, h, 3), new MeshLambertMaterial({ color, map: t })); m.position.set(x, h / 2, z); return m;
}
function decorate(theme, group, animated) {
  const T = SIZE / 2;
  if (theme === 'dhaka') {
    const tex = windows(), colors = ['#ef476f', '#ffd166', '#06d6a0', '#118ab2', '#f78c6b', '#c77dff', '#fefae0'];
    let x = -32, i = 0;
    while (x < 32) { const w = 3 + (i * 7 % 4); group.add(building(tex, colors[i % colors.length], w, 6 + (i * 5 % 9), x + w / 2, -T - 6)); x += w + .3; i++; }
    for (const side of [-1, 1]) for (let z = -7; z <= 8; z += 5) { const r = rickshaw(['#ef233c', '#06d6a0', '#ffd166'][(z + 7) % 3]); r.position.set(side * (T + 2.2), 0, z); r.rotation.y = side > 0 ? 1.57 : -1.57; r.scale.setScalar(1.7); group.add(r); }
    for (const x of [-T - 1.2, T + 1.2]) { group.add(box(.12, 6, .12, '#3a3a3a', x, 3, -T - 2), box(2, .08, .08, '#3a3a3a', x, 5.6, -T - 2)); }
    group.add(box(2 * T + 2.4, .03, .03, '#17181c', 0, 5.6, -T - 1.9), box(2 * T + 2.4, .03, .03, '#17181c', 0, 5.2, -T - 2.1));
    const moving = bus('#e63946'); moving.scale.setScalar(2.4); moving.position.set(0, 0, -T - 2.6); group.add(moving);
    animated.push(t => { moving.position.x = ((t * 1.8) % 60) - 30; });
  } else if (theme === 'rooftop') {
    for (const [a, b, c, d] of [[2 * T + 3, .9, .5, 0], [.5, .9, 2 * T + 3, 1]]) for (const side of [-1, 1]) group.add(box(a, b, c, '#d9a074', d ? side * (T + 1.5) : 0, .45, d ? 0 : side * (T + 1.5)));
    const tex = windows(), colors = ['#d4a373', '#e9c46a', '#cd6155', '#a3b18a'];
    for (let i = 0; i < 12; i++) group.add(building(tex, colors[i % 4], 4, 3 + i * 3 % 5, -24 + i * 4.3, -T - 7));
    for (const [x, z] of [[-T - 3, -6], [T + 3, -2], [T + 3.5, 6]]) { group.add(cylinder(.9, .9, 1.7, '#1f2226', x, 1.75, z, 14), box(1.7, .9, 1.7, '#8d8d8d', x, .45, z)); }
    const colorsKite = ['#ef233c', '#ffd166', '#06d6a0', '#7209b7', '#fb5607'];
    for (let i = 0; i < 6; i++) {
      const kite = new Group(), body = new Mesh(new ConeGeometry(.8, 1.2, 4), new MeshLambertMaterial({ color: colorsKite[i % 5], side: DoubleSide }));
      body.scale.z = .08; kite.add(body); kite.add(box(.05, .9, .05, '#ffffff', 0, -1, 0));
      kite.position.set(-14 + i * 5.6, 8 + (i * 3) % 5, -T - 1 - (i % 3)); group.add(kite);
      animated.push(t => { kite.position.y = 8 + (i * 3) % 5 + Math.sin(t * .8 + i) * .8; kite.rotation.z = Math.sin(t * .6 + i * 2) * .35; });
    }
    for (let x = -T; x < T; x += 2.1) group.add(box(.7, .8, .04, ['#ef476f', '#fefae0', '#118ab2'][Math.abs(Math.round(x)) % 3], x, 2.2, -T - 1.3));
    group.add(box(2 * T, .03, .03, '#222', 0, 2.65, -T - 1.3));
  } else if (theme === 'coxs') {
    const sea = new Mesh(new PlaneGeometry(90, 26), lambert('#1aa7c9')); sea.rotation.x = -Math.PI / 2; sea.position.set(0, .03, -T - 14); group.add(sea);
    const foam = [];
    for (let i = 0; i < 3; i++) { const f = box(90, .04, .7, '#f2fbff', 0, .05, -T - 3 - i * 3); foam.push(f); group.add(f); }
    animated.push(t => foam.forEach((f, i) => { f.position.z = -T - 3 - i * 3 + Math.sin(t * .9 + i) * .7; }));
    for (const [x, z, h] of [[-T - 3, -6, 3.4], [-T - 4, 2, 4], [T + 3, -8, 3.6], [T + 4, 0, 4.2], [T + 3, 7, 3.2], [-T - 3, 8, 3]]) group.add(palm(x, z, h));
    ['#ef476f', '#ffd166', '#06d6a0', '#118ab2'].forEach((color, i) => {
      const u = new Group(); u.add(cylinder(.04, .04, 1.8, '#f5f5f5', 0, .9, 0, 5)); const top = new Mesh(new ConeGeometry(1, .5, 8), lambert(color)); top.position.y = 1.9; u.add(top);
      u.position.set(-9 + i * 6, 0, -T - 1.7); group.add(u);
    });
  } else {
    const river = new Mesh(new PlaneGeometry(90, 16), lambert('#4f8f85')); river.rotation.x = -Math.PI / 2; river.position.set(0, .03, -T - 9); group.add(river);
    for (let i = 0; i < 18; i++) group.add(mangrove(-32 + i * 3.8, -T - 16 - (i % 3), 1.7 + (i % 3) * .3));
    for (const [x, z, s] of [[-T - 3, -8, 1.3], [-T - 4, -2, 1.5], [-T - 3, 5, 1.2], [T + 3, -7, 1.4], [T + 4, 0, 1.6], [T + 3, 7, 1.2]]) group.add(mangrove(x, z, s));
    const tiger = new Group(); tiger.add(box(1.1, .9, .9, '#f4902b', 0, .45, 0));
    for (const x of [-.32, 0, .32]) tiger.add(box(.1, .92, .92, '#1c1a17', x, .46, 0));
    tiger.add(box(.28, .28, .1, '#f4902b', -.34, 1, 0), box(.28, .28, .1, '#f4902b', .34, 1, 0));
    for (const x of [-.25, .25]) { tiger.add(ball(.1, '#ffffff', x, .58, .46), ball(.05, '#111111', x, .58, .55)); }
    tiger.position.set(-T - 1.4, -.35, -T - .4); group.add(tiger);
    animated.push(t => { tiger.position.y = -.35 + Math.max(0, Math.sin(t * .5)) * .55; });
  }
}
function foodModel(kind) {
  const g = new Group();
  if (kind === 'feast') {
    g.add(cylinder(.34, .26, .14, '#d9d9d9', 0, .07, 0, 14));
    const rice = ball(.3, '#f2b632', 0, .24, 0); rice.scale.y = .75; g.add(rice);
    for (const [x, z] of [[.12, .08], [-.1, .12], [.02, -.13]]) g.add(ball(.07, '#7a3e1d', x, .42, z));
  } else if (kind === 0) { // fuchka
    const shell = ball(.3, '#d99a4e', 0, .3, 0); shell.scale.y = .86; g.add(shell);
    const hole = new Mesh(new CircleGeometry(.14, 12), lambert('#4a2c14')); hole.rotation.x = -Math.PI / 2 + .2; hole.position.set(0, .55, .05); g.add(hole);
    g.add(ball(.05, '#f4e3a1', .02, .57, .03));
  } else if (kind === 1) { // jhalmuri in a newspaper cone
    const cone = new Mesh(new ConeGeometry(.24, .5, 10), lambert('#f1ead2')); cone.rotation.x = Math.PI; cone.position.y = .3; g.add(cone);
    for (const [x, z, c] of [[.08, .05, '#ffefba'], [-.08, 0, '#e63946'], [0, -.08, '#57a639'], [.02, .1, '#ffcf56']]) g.add(ball(.07, c, x, .56, z));
  } else if (kind === 2) { // roshogolla
    g.add(cylinder(.3, .2, .12, '#3f88c5', 0, .06, 0, 14));
    g.add(ball(.24, '#fffdf2', 0, .3, 0));
  } else { // ilish
    const fish = ball(.32, '#cfd8dc', 0, .28, 0); fish.scale.set(1.1, .55, .4); g.add(fish);
    const tail = new Mesh(new ConeGeometry(.15, .25, 4), lambert('#90a4ae')); tail.rotation.z = -Math.PI / 2; tail.position.set(-.42, .28, 0); g.add(tail);
    g.add(ball(.04, '#111111', .24, .32, .13));
  }
  g.traverse(o => { if (o.material) { o.material = o.material.clone(); o.material.emissive = o.material.color.clone(); o.material.emissiveIntensity = .08; } });
  return g;
}

export class Arena3D {
  constructor(canvas, { theme = 'dhaka', skin = 'nagin' } = {}) {
    this.canvas = canvas; this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false, failIfMajorPerformanceCaveat: true, preserveDrawingBuffer: false });
    this.pixelRatio = Math.min(devicePixelRatio || 1, 1.75); this.renderer.setPixelRatio(this.pixelRatio);
    this.scene = new Scene(); this.camera = new PerspectiveCamera(36, 1, .1, 500);
    this.hemi = new HemisphereLight(0xffffff, 0x665544, 2.1); this.sun = new DirectionalLight(0xfff0d8, 2); this.sun.position.set(-6, 18, 9);
    this.headLight = new PointLight(0xfff3b0, 0, 11, 1.6); this.scene.add(this.hemi, this.sun, this.headLight);
    this.width = 0; this.height = 0; this.clock = performance.now(); this.time = 0; this.shakeAmount = 0; this.dark = 0; this.slowFrames = 0; this.frames = 0;
    this.animated = []; this.foods = new Map(); this.foodModels = new Map(); this.bulges = []; this.particles = []; this.chaosKey = '';
    this.dummy = new Object3D();
    const sphere = new SphereGeometry(.5, 14, 10), disc = new CircleGeometry(.48, 14); disc.rotateX(-Math.PI / 2);
    this.shadows = new InstancedMesh(disc, new MeshBasicMaterial({ color: 0, transparent: true, opacity: .28, depthWrite: false }), SIZE * SIZE * 2 + 8);
    this.scene.add(this.shadows);
    this.snakes = [0, 1].map(() => {
      const bodies = new InstancedMesh(sphere, new MeshPhongMaterial({ color: 0xffffff, shininess: 80, specular: 0x555555 }), SIZE * SIZE + 4);
      const head = new Group(), skull = new Mesh(sphere, new MeshPhongMaterial({ color: 0xffffff, shininess: 90, specular: 0x666666 })); skull.scale.set(1.12, .95, 1.05); head.add(skull);
      const whites = [], hood = new Group();
      for (const side of [-1, 1]) { const white = ball(.15, '#ffffff', .2, .22, side * .22); whites.push(white); head.add(white, ball(.08, '#14241a', .3, .24, side * .24)); }
      // A cobra's raised hood, with the gold crest that makes the silhouette read at a glance.
      const flare = new Mesh(sphere, new MeshPhongMaterial({ color: 0x1b1b26, shininess: 90, specular: 0x777777 })); flare.scale.set(.42, 1.05, 1.5); flare.position.set(-.3, .42, 0); hood.add(flare);
      const crest = new Mesh(sphere, new MeshPhongMaterial({ color: 0xe0b02f, emissive: 0x6a4d05, shininess: 90 })); crest.scale.set(.1, .55, .72); crest.position.set(-.12, .46, 0); hood.add(crest);
      hood.visible = false; head.add(hood);
      const tongue = box(.26, .02, .05, '#e0174f', .6, -.04, 0); head.add(tongue);
      this.scene.add(bodies, head); return { bodies, head, skull, tongue, whites, hood };
    });
    this.ghostBody = new InstancedMesh(sphere, new MeshPhongMaterial({ color: 0x6fe3ff, transparent: true, opacity: .42, depthWrite: false, emissive: 0x2299bb, emissiveIntensity: .7 }), SIZE * SIZE + 4); this.scene.add(this.ghostBody);
    this.particleMesh = new InstancedMesh(new SphereGeometry(.09, 6, 5), new MeshBasicMaterial({ color: 0xffffff }), 48); this.particleMesh.count = 0; this.scene.add(this.particleMesh);
    this.warnMaterial = new MeshBasicMaterial({ color: 0xff2d2d, transparent: true, opacity: .5, depthWrite: false });
    this.waterMaterial = new MeshPhongMaterial({ color: 0x2f9fe0, transparent: true, opacity: .72, shininess: 120, depthWrite: false });
    this.chaos = new Group(); this.scene.add(this.chaos);
    this.setSkin(skin); this.setTheme(theme);
  }
  setSkin(name) { this.skin = SKINS[name] ?? SKINS.nagin; }
  setTheme(name) {
    this.themeName = THEMES[name] ? name : 'dhaka'; const t = THEMES[this.themeName];
    if (this.world) { this.scene.remove(this.world); this.world.traverse(o => { o.geometry?.dispose(); o.material?.map?.dispose(); o.material?.dispose(); }); }
    this.world = new Group(); this.animated = []; this.sky = new Color(t.sky);
    this.scene.background = this.sky.clone(); this.scene.fog = new Fog(t.sky, 48, 100);
    const ground = new Mesh(new PlaneGeometry(500, 500), lambert(t.ground)); ground.rotation.x = -Math.PI / 2; ground.position.y = -.02; this.world.add(ground);
    const tiles = canvasTexture(1024, 1024, (c, w) => {
      const u = w / SIZE;
      for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) { c.fillStyle = t.tiles[(x + y) % 2]; c.fillRect(x * u, y * u, u, u); }
      c.globalAlpha = .14; c.fillStyle = '#fff';
      if (this.themeName === 'dhaka') for (let y = 2; y < SIZE; y += 4) for (let x = 0; x < SIZE; x += 2) c.fillRect(x * u + u * .25, y * u - u * .05, u, u * .1);
      else { for (let i = 0; i < 90; i++) { const px = (i * 197) % w, py = (i * 353) % w; c.beginPath(); c.arc(px, py, 2 + i % 5, 0, 7); c.fill(); } }
      c.globalAlpha = 1;
    });
    const board = new Mesh(new PlaneGeometry(SIZE, SIZE), new MeshLambertMaterial({ map: tiles })); board.rotation.x = -Math.PI / 2; this.world.add(board);
    const floral = canvasTexture(256, 64, (c, w, h) => {
      c.fillStyle = t.edge; c.fillRect(0, 0, w, h); c.fillStyle = t.trim; c.fillRect(0, 0, w, 5); c.fillRect(0, h - 5, w, 5);
      for (let x = 32; x < w; x += 64) {
        c.fillStyle = '#ffffff'; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; c.beginPath(); c.ellipse(x + Math.cos(a) * 11, h / 2 + Math.sin(a) * 11, 8, 5, a, 0, 7); c.fill(); }
        c.fillStyle = t.trim; c.beginPath(); c.arc(x, h / 2, 7, 0, 7); c.fill();
        c.fillStyle = '#0b6e4f'; for (const s of [-1, 1]) { c.beginPath(); c.ellipse(x + s * 26, h / 2, 7, 3.5, s * .6, 0, 7); c.fill(); }
      }
    });
    floral.wrapS = RepeatWrapping; floral.repeat.set(7, 1);
    const rim = new MeshLambertMaterial({ map: floral });
    for (const side of [-1, 1]) {
      const front = new Mesh(new BoxGeometry(SIZE + 1.3, .34, .65), rim); front.position.set(0, .17, side * (SIZE / 2 + .33)); this.world.add(front);
      const wing = new Mesh(new BoxGeometry(.65, .34, SIZE), lambert(t.edge)); wing.position.set(side * (SIZE / 2 + .33), .17, 0); this.world.add(wing);
    }
    decorate(this.themeName, this.world, this.animated);
    this.scene.add(this.world);
    if (this.width) this.fit();
  }
  resize() {
    const { width, height } = this.canvas.getBoundingClientRect();
    if (!width || !height) return false;
    if (width !== this.width || height !== this.height) {
      this.width = width; this.height = height; this.renderer.setSize(width, height, false);
      this.camera.aspect = width / height; this.fit();
    }
    return true;
  }
  setFree(free) {
    const old = this.free;
    if (old && ['left', 'right', 'top', 'bottom'].every(side => Math.abs(old[side] - free[side]) < 1)) return;
    this.free = free;
    if (this.width) this.fit();
  }
  // Walk the camera back along a fixed tilt until the rim's corners sit inside the free part of the screen.
  fit() {
    const w = this.width, h = this.height, free = this.free ?? { left: 0, right: 0, top: 0, bottom: 0 };
    // A sliver of free space must not push the board out of sight.
    const roomW = Math.max(w * .35, w - free.left - free.right), roomH = Math.max(h * .3, h - free.top - free.bottom);
    const dx = (free.right - free.left) / 2, dy = (free.bottom - free.top) / 2;
    const half = SIZE / 2 + .9, direction = new Vector3(0, 1.32, 1).normalize(), target = new Vector3(0, 0, .55), v = new Vector3();
    const cx = -2 * dx / w, cy = 2 * dy / h, spanX = roomW / w * .97, spanY = roomH / h * .95;
    this.camera.setViewOffset(w, h, dx, dy, w, h);
    let distance = 20;
    for (; distance < 240; distance += .5) {
      this.camera.position.copy(direction).multiplyScalar(distance).add(target); this.camera.lookAt(target); this.camera.updateMatrixWorld();
      if ([[-half, half], [half, half], [-half, -half], [half, -half]].every(([x, z]) => { v.set(x, 0, z).project(this.camera); return Math.abs(v.x - cx) < spanX && Math.abs(v.y - cy) < spanY; })) break;
    }
    this.camera.userData.target = target;
    this.goal = { position: this.camera.position.clone(), dx, dy };
    this.view ??= { position: this.goal.position.clone(), dx, dy };
    // Keep the board clear of the haze however far back the camera had to go.
    this.scene.fog.near = distance + 12; this.scene.fog.far = distance + 75;
  }
  effect(name, data = {}) {
    if (name === 'eat') {
      this.bulges.push({ id: data.id ?? 0, start: this.time });
      if (this.reduced) return;
      const colors = data.feast ? [0xffc300, 0xffffff, 0xff7a00] : [0xffd23f, 0xff4d7d, 0x7bd81e];
      for (let i = 0; i < (data.feast ? 16 : 8) && this.particles.length < 48; i++) {
        const a = i * 2.4; this.particles.push({ x: cellX(data.cell.x), y: .5, z: cellZ(data.cell.y), vx: Math.cos(a) * 2.6, vy: 3 + (i % 3), vz: Math.sin(a) * 2.6, life: .55, color: colors[i % 3] });
      }
    } else if (name === 'crash' && !this.reduced) this.shakeAmount = 1;
  }
  syncFood(food, emissive) {
    const live = new Set();
    for (const f of food) {
      const key = `${f.x},${f.y},${f.feast ? 1 : 0}`; live.add(key);
      if (!this.foods.has(key)) {
        const kind = f.feast ? 'feast' : foodKind(f);
        if (!this.foodModels.has(kind)) this.foodModels.set(kind, foodModel(kind));
        const model = this.foodModels.get(kind).clone(); model.position.set(cellX(f.x), 0, cellZ(f.y)); model.userData.seed = f.x * 3 + f.y; model.scale.setScalar(f.feast ? 1.9 : 1.6);
        this.scene.add(model); this.foods.set(key, model);
      }
    }
    for (const [key, model] of this.foods) {
      if (!live.has(key)) { this.scene.remove(model); this.foods.delete(key); continue; }
      model.rotation.y = this.reduced ? .5 : this.time * 1.4 + model.userData.seed;
      model.position.y = this.reduced ? .02 : .05 + Math.abs(Math.sin(this.time * 2.6 + model.userData.seed)) * .12;
    }
    for (const model of this.foods.values()) model.traverse(o => { if (o.material) o.material.emissiveIntensity = emissive; });
  }
  syncChaos(c) {
    const key = c ? JSON.stringify([c.warnings, c.obstacles, c.water]) : '';
    if (key !== this.chaosKey) {
      this.chaosKey = key;
      this.chaos.clear();
      const tile = new PlaneGeometry(.96, .96); tile.rotateX(-Math.PI / 2);
      for (const p of c?.warnings ?? []) { const m = new Mesh(tile, this.warnMaterial); m.position.set(cellX(p.x), .025, cellZ(p.y)); this.chaos.add(m); }
      for (const p of c?.water ?? []) { const m = new Mesh(tile, this.waterMaterial); m.position.set(cellX(p.x), .03, cellZ(p.y)); this.chaos.add(m); }
      (c?.obstacles ?? []).forEach((p, i) => {
        const model = i % 2 ? rickshaw(['#ef233c', '#ffd166'][i % 4 === 1 ? 0 : 1]) : bus(['#2a9d8f', '#e63946', '#3a86ff'][i % 3]);
        model.position.set(cellX(p.x), this.reduced ? 0 : 3, cellZ(p.y)); model.userData.drop = true; this.chaos.add(model);
      });
    }
    this.warnMaterial.opacity = .3 + Math.abs(Math.sin(this.time * 7)) * .45;
    this.waterMaterial.opacity = .64 + Math.sin(this.time * 3) * .1;
    for (const child of this.chaos.children) if (child.userData.drop && child.position.y > 0) child.position.y = Math.max(0, child.position.y - .22);
  }
  drawSnake(view, snake, old, alpha, palette, shadowStart) {
    const d = this.dummy, count = snake.body.length;
    let shadowIndex = shadowStart;
    const dead = !snake.alive;
    for (let i = 0; i < count; i++) {
      const p = snake.body[i], q = old?.body[i] ?? old?.body.at(-1) ?? p;
      const x = cellX(q.x + (p.x - q.x) * alpha), z = cellZ(q.y + (p.y - q.y) * alpha);
      let scale = 1.04 - Math.max(0, i - count + 4) * .14;
      for (const b of this.bulges) if (b.id === snake.id) { const at = (this.time - b.start) * 34; scale += .3 * Math.exp(-((i - at) ** 2) / 3); }
      if (i === 0) {
        view.head.position.set(x, .46, z); const [dx, dy] = DIRECTIONS[snake.dir]; view.head.rotation.y = Math.atan2(-dy, dx);
        view.head.visible = true; view.skull.material.color.set(dead ? '#8c9186' : palette.head);
        view.hood.visible = !!palette.hood && !dead;
        for (const white of view.whites) { white.material.color.set(palette.eye ?? '#ffffff'); white.material.emissive.set(palette.eye ?? '#000000'); white.material.emissiveIntensity = palette.eye ? .9 : 0; }
        view.tongue.visible = !dead && !this.reduced && Math.sin(this.time * 9) > .1;
        d.scale.setScalar(0);
      } else d.scale.set(scale, scale * .86, scale);
      d.position.set(x, .4, z); d.updateMatrix(); view.bodies.setMatrixAt(i, d.matrix);
      this.bodyColor.set(dead ? '#8c9186' : palette.body[i % palette.body.length]); view.bodies.setColorAt(i, this.bodyColor);
      d.position.set(x, .012, z); d.scale.setScalar(i === 0 ? 1.15 : scale); d.updateMatrix(); this.shadows.setMatrixAt(shadowIndex++, d.matrix);
    }
    view.bodies.count = count; view.bodies.instanceMatrix.needsUpdate = true; if (view.bodies.instanceColor) view.bodies.instanceColor.needsUpdate = true;
    view.bodies.frustumCulled = false;
    return shadowIndex;
  }
  draw(game, previous, fraction = 1, ghost = null, preview = false) {
    if (!game || !this.resize()) return;
    const now = performance.now(), dt = Math.min(.1, (now - this.clock) / 1000); this.clock = now; this.time += dt;
    this.bodyColor ??= new Color();
    // Budget phones keep their frame rate by trading resolution first.
    if (dt > .04) this.slowFrames++; if (++this.frames >= 90) { if (this.slowFrames > 45 && this.pixelRatio > 1) { this.pixelRatio = Math.max(1, this.pixelRatio - .35); this.renderer.setPixelRatio(this.pixelRatio); } this.frames = 0; this.slowFrames = 0; }
    this.bulges = this.bulges.filter(b => this.time - b.start < 1.6);
    const alpha = this.reduced ? 1 : Math.min(1, Math.max(0, fraction));
    let shadows = 0;
    game.snakes.forEach((s, index) => { shadows = this.drawSnake(this.snakes[index], s, previous?.snakes[s.id], alpha, index === 0 && game.mode !== 'duel' ? this.skin : index === 0 ? SKINS.nagin : AMBER, shadows); });
    for (let i = game.snakes.length; i < 2; i++) { this.snakes[i].bodies.count = 0; this.snakes[i].head.visible = false; }
    this.shadows.count = shadows; this.shadows.instanceMatrix.needsUpdate = true; this.shadows.frustumCulled = false;
    this.ghostBody.visible = !!ghost;
    if (ghost) {
      const body = ghost.snakes[0].body, d = this.dummy;
      body.forEach((p, i) => { d.position.set(cellX(p.x), .42, cellZ(p.y)); d.scale.setScalar(i ? .84 : 1); d.updateMatrix(); this.ghostBody.setMatrixAt(i, d.matrix); });
      this.ghostBody.count = body.length; this.ghostBody.instanceMatrix.needsUpdate = true; this.ghostBody.material.opacity = ghost.status === 'finished' ? .14 : .42; this.ghostBody.frustumCulled = false;
    }
    const wantDark = game.chaos?.blackout ? 1 : 0; this.dark += (wantDark - this.dark) * Math.min(1, dt * (this.reduced ? 30 : 7));
    this.syncFood(game.food, .08 + this.dark * .9); this.syncChaos(game.chaos);
    this.hemi.intensity = 2.1 * (1 - this.dark * .94); this.sun.intensity = 2 * (1 - this.dark * .96);
    this.scene.background.copy(this.sky).multiplyScalar(1 - this.dark * .93);
    this.headLight.position.set(this.snakes[0].head.position.x, 1.5, this.snakes[0].head.position.z); this.headLight.intensity = this.dark * 34;
    if (!this.reduced) for (const fn of this.animated) fn(this.time);
    this.particles = this.particles.filter(p => (p.life -= dt) > 0);
    this.particles.forEach((p, i) => { p.vy -= 11 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; this.dummy.position.set(p.x, Math.max(.05, p.y), p.z); this.dummy.scale.setScalar(Math.max(.15, p.life * 2)); this.dummy.updateMatrix(); this.particleMesh.setMatrixAt(i, this.dummy.matrix); this.bodyColor.set(p.color); this.particleMesh.setColorAt(i, this.bodyColor); });
    this.particleMesh.count = this.particles.length; this.particleMesh.instanceMatrix.needsUpdate = true; if (this.particleMesh.instanceColor) this.particleMesh.instanceColor.needsUpdate = true; this.particleMesh.frustumCulled = false;
    if (this.goal) {
      // Glide when a panel opens or closes instead of snapping.
      const ease = this.reduced ? 1 : Math.min(1, dt * 9), view = this.view;
      view.position.lerp(this.goal.position, ease); view.dx += (this.goal.dx - view.dx) * ease; view.dy += (this.goal.dy - view.dy) * ease;
      this.camera.setViewOffset(this.width, this.height, view.dx, view.dy, this.width, this.height);
      this.camera.position.copy(view.position);
      if (preview && !this.reduced) this.camera.position.x += Math.sin(this.time * .35) * 1.1;
      if (this.shakeAmount > .01) { this.camera.position.x += Math.sin(this.time * 61) * this.shakeAmount * .55; this.camera.position.y += Math.cos(this.time * 47) * this.shakeAmount * .4; this.shakeAmount *= Math.pow(.02, dt); }
      this.camera.lookAt(this.camera.userData.target);
    }
    this.renderer.render(this.scene, this.camera);
  }
  // The drawing buffer clears after compositing, so render immediately before reading it.
  snapshot() { this.renderer.render(this.scene, this.camera); return this.canvas; }
}
