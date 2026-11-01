import { Scene, PerspectiveCamera, WebGLRenderer, Color, Fog, HemisphereLight, DirectionalLight, PointLight, Mesh, Group, InstancedMesh, Object3D, BoxGeometry, SphereGeometry, PlaneGeometry, CircleGeometry, BufferGeometry, BufferAttribute, MeshStandardMaterial, MeshBasicMaterial, PMREMGenerator, RepeatWrapping, BackSide, Vector3, ACESFilmicToneMapping, PCFSoftShadowMap, DynamicDrawUsage } from '../vendor/three-0.187.0-r2/three.min.js';
import { SIZE, DIRECTIONS } from './engine.js';
import { THEMES, SKINS, foodKind } from './themes.js';
import { LOOKS, boardTextures, groundTexture, floralBand, decorate, foodModel, snakeHead, trafficModel, texture, mat } from './world3d.js';

const AMBER = { head: '#d96a0a', body: ['#ff9a2e', '#ffe3a6', '#ff9a2e'] };
const cellX = x => x + .5 - SIZE / 2, cellZ = y => y + .5 - SIZE / 2;
const RING = 12, STEPS = 4, CELL_REPEAT = 2.4;

// Scales, a spine pattern and a pale belly, in the skin's colours.
const skinTextures = new Map();
function skinTexture(palette) {
  const key = palette.body.join();
  if (!skinTextures.has(key)) skinTextures.set(key, texture(512, 256, (c, w, h) => {
    const band = w / palette.body.length;
    palette.body.forEach((color, i) => { c.fillStyle = color; c.fillRect(i * band, 0, band + 1, h); });
    // Canvas y runs opposite to the tube's v: the back of the snake is low on the canvas, the belly high.
    const belly = c.createLinearGradient(0, 0, 0, h * .5); belly.addColorStop(0, '#f6efd8f0'); belly.addColorStop(.75, '#f6efd8b0'); belly.addColorStop(1, '#f6efd800'); c.fillStyle = belly; c.fillRect(0, 0, w, h * .5);
    c.fillStyle = '#00000060'; for (let x = 0; x < w; x += w / 6) { c.beginPath(); c.moveTo(x + w / 12, h * .58); c.lineTo(x + w / 6, h * .75); c.lineTo(x + w / 12, h * .92); c.lineTo(x, h * .75); c.fill(); }
    c.strokeStyle = '#00000038'; c.lineWidth = 1.2;
    for (let row = 0; row < 26; row++) for (let col = 0; col < 42; col++) { const x = col * 12.2 + (row % 2) * 6.1, y = row * 10; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 6, y + 5); c.lineTo(x, y + 10); c.lineTo(x - 6, y + 5); c.closePath(); c.stroke(); }
  }));
  return skinTextures.get(key);
}
const scaleBump = () => texture(256, 128, (c, w, h) => {
  c.fillStyle = '#909090'; c.fillRect(0, 0, w, h); c.fillStyle = '#d0d0d0'; c.strokeStyle = '#303030'; c.lineWidth = 1;
  for (let row = 0; row < 13; row++) for (let col = 0; col < 21; col++) { const x = col * 12.2 + (row % 2) * 6.1, y = row * 10; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 5.4, y + 5); c.lineTo(x, y + 10); c.lineTo(x - 5.4, y + 5); c.closePath(); c.fill(); c.stroke(); }
}, 1, 1, false);

// One continuous smooth body, rebuilt each frame. Far better looking than a row of balls, and still one draw call.
class SnakeBody {
  constructor(material) {
    const rings = SIZE * SIZE * STEPS + 2, size = rings * RING;
    this.position = new BufferAttribute(new Float32Array(size * 3), 3); this.normal = new BufferAttribute(new Float32Array(size * 3), 3); this.uv = new BufferAttribute(new Float32Array(size * 2), 2);
    for (const attribute of [this.position, this.normal, this.uv]) attribute.setUsage(DynamicDrawUsage);
    const index = new Uint32Array((rings - 1) * (RING - 1) * 6); let at = 0;
    for (let r = 0; r < rings - 1; r++) for (let a = 0; a < RING - 1; a++) { const p = r * RING + a; index.set([p, p + 1, p + RING, p + 1, p + RING + 1, p + RING], at); at += 6; }
    const geometry = new BufferGeometry(); geometry.setAttribute('position', this.position); geometry.setAttribute('normal', this.normal); geometry.setAttribute('uv', this.uv); geometry.setIndex(new BufferAttribute(index, 1));
    this.mesh = new Mesh(geometry, material); this.mesh.frustumCulled = false; this.mesh.castShadow = true;
    this.samples = [];
  }
  // points run from head to tail; radius(distanceFromHead, distanceFromTail) shapes the body.
  update(points, radius) {
    const samples = this.samples; samples.length = 0;
    const n = points.length;
    for (let i = 0; i < n - 1; i++) {
      const p0 = points[Math.max(0, i - 1)], p1 = points[i], p2 = points[i + 1], p3 = points[Math.min(n - 1, i + 2)];
      for (let s = 0; s < STEPS; s++) {
        const t = s / STEPS, t2 = t * t, t3 = t2 * t;
        samples.push({ x: .5 * (2 * p1.x + (p2.x - p0.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (3 * p1.x - p0.x - 3 * p2.x + p3.x) * t3), z: .5 * (2 * p1.z + (p2.z - p0.z) * t + (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 + (3 * p1.z - p0.z - 3 * p2.z + p3.z) * t3) });
      }
    }
    samples.push({ x: points[n - 1].x, z: points[n - 1].z });
    let length = 0; const lengths = samples.map((s, i) => i ? (length += Math.hypot(s.x - samples[i - 1].x, s.z - samples[i - 1].z)) : 0);
    let tx = 1, tz = 0;
    const pos = this.position.array, nor = this.normal.array, uv = this.uv.array;
    samples.forEach((s, i) => {
      const a = samples[Math.max(0, i - 1)], b = samples[Math.min(samples.length - 1, i + 1)], dx = a.x - b.x, dz = a.z - b.z, d = Math.hypot(dx, dz);
      if (d > 1e-4) { tx = dx / d; tz = dz / d; }
      const r = radius(lengths[i], length - lengths[i]), sideX = -tz, sideZ = tx, cy = r * .78 + .015;
      for (let k = 0; k < RING; k++) {
        const angle = k / (RING - 1) * Math.PI * 2, cos = Math.cos(angle), sin = Math.sin(angle), at = (i * RING + k) * 3;
        pos[at] = s.x + sideX * cos * r; pos[at + 1] = cy + sin * r * .78; pos[at + 2] = s.z + sideZ * cos * r;
        nor[at] = sideX * cos; nor[at + 1] = sin; nor[at + 2] = sideZ * cos;
        const uvAt = (i * RING + k) * 2; uv[uvAt] = lengths[i] / CELL_REPEAT; uv[uvAt + 1] = k / (RING - 1);
      }
    });
    this.position.needsUpdate = this.normal.needsUpdate = this.uv.needsUpdate = true;
    this.mesh.geometry.setDrawRange(0, Math.max(0, samples.length - 1) * (RING - 1) * 6);
    this.mesh.visible = samples.length > 1;
  }
}
// Budget phones report little memory or few cores. Anything unknown starts high, and backs off if it struggles.
const isCapable = () => (navigator.deviceMemory ?? 8) >= 4 && (navigator.hardwareConcurrency ?? 8) >= 4;
export class Arena3D {
  constructor(canvas, { theme = 'dhaka', skin = 'nagin' } = {}) {
    this.canvas = canvas; this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.high = isCapable();
    this.renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false, failIfMajorPerformanceCaveat: true, preserveDrawingBuffer: false });
    const phone = matchMedia('(pointer: coarse)').matches;
    this.pixelRatio = Math.min(devicePixelRatio || 1, this.high && !phone ? 2 : 1.5); this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.toneMapping = ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.3;
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = PCFSoftShadowMap;
    this.scene = new Scene(); this.scene.fog = new Fog('#ffffff', 60, 160); this.camera = new PerspectiveCamera(34, 1, .1, 700);
    this.hemi = new HemisphereLight(0xffffff, 0x665544, 1); this.sun = new DirectionalLight(0xffffff, 3);
    this.sun.castShadow = this.high; const shadowEdge = SIZE / 2 + 8, sc = this.sun.shadow; sc.mapSize.set(phone ? 1024 : 2048, phone ? 1024 : 2048); sc.bias = -.0004; sc.normalBias = .025;
    Object.assign(sc.camera, { left: -shadowEdge, right: shadowEdge, top: shadowEdge, bottom: -shadowEdge, near: 1, far: 70 });
    this.headLight = new PointLight(0xffe7b0, 0, 12, 1.5); this.scene.add(this.hemi, this.sun, this.sun.target, this.headLight);
    this.width = 0; this.height = 0; this.clock = performance.now(); this.time = 0; this.shakeAmount = 0; this.dark = 0; this.spent = 0; this.frames = 0;
    this.animated = []; this.foods = new Map(); this.foodModels = new Map(); this.bulges = []; this.particles = []; this.chaosKey = '';
    this.dummy = new Object3D(); this.tint = new Color();
    this.pmrem = this.high ? new PMREMGenerator(this.renderer) : null;
    const bump = scaleBump();
    this.snakes = [0, 1].map(() => {
      const material = new MeshStandardMaterial({ color: 0xffffff, roughness: .36, metalness: .06, bumpMap: bump, bumpScale: 1.2 });
      const body = new SnakeBody(material), head = snakeHead(); head.group.traverse(o => { if (o.isMesh) o.castShadow = true; });
      this.scene.add(body.mesh, head.group);
      return { body, head, material };
    });
    this.ghost = new SnakeBody(new MeshStandardMaterial({ color: 0x6fe3ff, transparent: true, opacity: .42, depthWrite: false, emissive: 0x2299bb, emissiveIntensity: .8, roughness: .3 })); this.ghost.mesh.castShadow = false; this.scene.add(this.ghost.mesh);
    // Weak devices get a soft blob under the snake instead of real shadows.
    const disc = new CircleGeometry(.5, 14).rotateX(-Math.PI / 2);
    this.blobs = new InstancedMesh(disc, new MeshBasicMaterial({ color: 0, transparent: true, opacity: .3, depthWrite: false }), SIZE * SIZE * 2 + 8); this.blobs.frustumCulled = false; this.blobs.visible = !this.high; this.scene.add(this.blobs);
    this.particleMesh = new InstancedMesh(new SphereGeometry(.09, 6, 5), new MeshBasicMaterial({ color: 0xffffff }), 48); this.particleMesh.count = 0; this.particleMesh.frustumCulled = false; this.scene.add(this.particleMesh);
    this.warnMaterial = new MeshBasicMaterial({ color: 0xff2d2d, transparent: true, opacity: .5, depthWrite: false });
    this.waterMaterial = new MeshStandardMaterial({ color: 0x1f7fd0, transparent: true, opacity: .88, roughness: .1, metalness: .1, depthWrite: false });
    this.chaos = new Group(); this.scene.add(this.chaos);
    this.setSkin(skin); this.setTheme(theme);
    // Shop signs are painted in Bangla, so paint them again if the font arrived late.
    if (!document.fonts.check('700 34px Bangla', 'ঢাকা')) document.fonts.load('700 34px Bangla', 'ঢাকা').then(() => this.setTheme(this.themeName)).catch(() => {});
  }
  setSkin(name) { this.skin = SKINS[name] ?? SKINS.nagin; }
  buildSky(look) {
    const map = texture(16, 512, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, look.top); g.addColorStop(.42, look.mid); g.addColorStop(.52, look.low); g.addColorStop(1, look.low); c.fillStyle = g; c.fillRect(0, 0, w, h);
    });
    map.wrapS = RepeatWrapping;
    return new Mesh(new SphereGeometry(320, 24, 16), new MeshBasicMaterial({ map, side: BackSide, fog: false, toneMapped: false }));
  }
  setTheme(name) {
    this.themeName = THEMES[name] ? name : 'dhaka'; const t = THEMES[this.themeName], look = LOOKS[this.themeName];
    if (this.world) { this.scene.remove(this.world); this.world.traverse(o => { o.geometry?.dispose(); for (const m of [o.material].flat()) if (m) { m.dispose(); } }); this.scene.environment?.dispose(); }
    this.world = new Group(); this.animated = []; this.look = look;
    this.sky = this.buildSky(look); this.world.add(this.sky);
    this.scene.fog.color.set(look.fog); this.fogColor = new Color(look.fog);
    this.hemi.color.set(look.mid); this.hemi.groundColor.set(look.ground[0]); this.baseHemi = this.high ? 1.15 : 2.1; this.sun.color.set(look.sun); this.baseSun = look.sunPower;
    this.sun.position.set(...look.sunDir).multiplyScalar(2.4);
    if (this.pmrem) {
      const studio = new Scene(); studio.add(this.buildSky(look));
      this.scene.environment = this.pmrem.fromScene(studio, .03).texture; this.baseEnv = look.sky * .95; this.scene.environmentIntensity = this.baseEnv;
    }
    const ground = new Mesh(new PlaneGeometry(700, 700), mat('#fff', .95, 0, { map: groundTexture(look) })); ground.rotation.x = -Math.PI / 2; ground.position.y = -.03; ground.receiveShadow = true; this.world.add(ground);
    const surface = boardTextures(this.themeName), board = new Mesh(new PlaneGeometry(SIZE, SIZE), new MeshStandardMaterial({ map: surface.map, bumpMap: surface.bump, bumpScale: .6, roughness: this.themeName === 'coxs' ? .9 : .82 })); board.rotation.x = -Math.PI / 2; board.receiveShadow = true; this.world.add(board);
    // A painted kerb: the rickshaw-art band runs along the top, with plain concrete sides.
    const band = floralBand(t.edge, t.trim), turned = band.clone(); turned.center.set(.5, .5); turned.rotation = Math.PI / 2; turned.repeat.set(5, 1); turned.needsUpdate = true;
    const painted = new MeshStandardMaterial({ map: band, roughness: .5 }), paintedSide = new MeshStandardMaterial({ map: turned, roughness: .5 }), curb = new MeshStandardMaterial({ color: '#b9b2a4', roughness: .92 });
    for (const side of [-1, 1]) {
      const front = new Mesh(new BoxGeometry(SIZE + 1.3, .3, .65), [curb, curb, painted, curb, curb, curb]); front.position.set(0, .15, side * (SIZE / 2 + .33)); front.castShadow = front.receiveShadow = true; this.world.add(front);
      const wing = new Mesh(new BoxGeometry(.65, .3, SIZE), [curb, curb, paintedSide, curb, curb, curb]); wing.position.set(side * (SIZE / 2 + .33), .15, 0); wing.castShadow = wing.receiveShadow = true; this.world.add(wing);
    }
    decorate(this.themeName, this.world, this.animated, this.high ? 1 : 0);
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
    const half = SIZE / 2 + .9, direction = new Vector3(0, .98, 1).normalize(), target = new Vector3(0, 0, .7), v = new Vector3();
    const cx = -2 * dx / w, cy = 2 * dy / h, spanX = roomW / w * .97, spanY = roomH / h * .95;
    this.camera.setViewOffset(w, h, dx, dy, w, h);
    let distance = 20;
    for (; distance < 300; distance += .5) {
      this.camera.position.copy(direction).multiplyScalar(distance).add(target); this.camera.lookAt(target); this.camera.updateMatrixWorld();
      if ([[-half, half], [half, half], [-half, -half], [half, -half]].every(([x, z]) => { v.set(x, 0, z).project(this.camera); return Math.abs(v.x - cx) < spanX && Math.abs(v.y - cy) < spanY; })) break;
    }
    this.camera.userData.target = target;
    this.goal = { position: this.camera.position.clone(), dx, dy };
    this.view ??= { position: this.goal.position.clone(), dx, dy };
    // Keep the board clear of the haze however far back the camera had to go.
    this.scene.fog.near = distance + 16; this.scene.fog.far = distance + 150;
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
  syncFood(food, glow) {
    const live = new Set();
    for (const f of food) {
      const key = `${f.x},${f.y},${f.feast ? 1 : 0}`; live.add(key);
      if (!this.foods.has(key)) {
        const kind = f.feast ? 'feast' : foodKind(f);
        if (!this.foodModels.has(kind)) { const made = foodModel(kind); made.traverse(o => { if (o.isMesh) { o.castShadow = true; o.material = o.material.clone(); o.material.emissive = o.material.color.clone(); if (o.material.map) o.material.emissiveMap = o.material.map; o.material.emissiveIntensity = .03; } }); this.foodModels.set(kind, made); }
        const model = this.foodModels.get(kind).clone(); model.position.set(cellX(f.x), 0, cellZ(f.y)); model.userData.seed = f.x * 3 + f.y; model.scale.setScalar(f.feast ? 1.85 : 1.8);
        this.scene.add(model); this.foods.set(key, model);
      }
    }
    for (const [key, model] of this.foods) {
      if (!live.has(key)) { this.scene.remove(model); this.foods.delete(key); continue; }
      // A slow turn draws the eye to the food without making it float like a game pickup.
      model.rotation.y = this.reduced ? .5 : this.time * .7 + model.userData.seed;
    }
    // Clones share their materials with these originals, so this lights all of them.
    for (const made of this.foodModels.values()) made.traverse(o => { if (o.isMesh) o.material.emissiveIntensity = glow; });
  }
  syncChaos(c) {
    const key = c ? JSON.stringify([c.warnings, c.obstacles, c.water]) : '';
    if (key !== this.chaosKey) {
      this.chaosKey = key;
      this.chaos.clear();
      const tile = new PlaneGeometry(.96, .96); tile.rotateX(-Math.PI / 2);
      for (const p of c?.warnings ?? []) { const m = new Mesh(tile, this.warnMaterial); m.position.set(cellX(p.x), .025, cellZ(p.y)); this.chaos.add(m); }
      for (const p of c?.water ?? []) { const m = new Mesh(tile, this.waterMaterial); m.position.set(cellX(p.x), .03, cellZ(p.y)); m.receiveShadow = true; this.chaos.add(m); }
      (c?.obstacles ?? []).forEach((p, i) => {
        const model = trafficModel(i); model.position.set(cellX(p.x), this.reduced ? 0 : 3, cellZ(p.y)); model.userData.drop = true; this.chaos.add(model);
      });
    }
    this.warnMaterial.opacity = .3 + Math.abs(Math.sin(this.time * 7)) * .45;
    this.waterMaterial.opacity = .84 + Math.sin(this.time * 3) * .06;
    for (const child of this.chaos.children) if (child.userData.drop && child.position.y > 0) child.position.y = Math.max(0, child.position.y - .22);
  }
  drawSnake(view, snake, old, alpha, palette, blobStart) {
    const points = snake.body.map((p, i) => {
      const q = old?.body[i] ?? old?.body.at(-1) ?? p;
      return { x: cellX(q.x + (p.x - q.x) * alpha), z: cellZ(q.y + (p.y - q.y) * alpha) };
    });
    const dead = !snake.alive, bulges = this.bulges.filter(b => b.id === snake.id).map(b => (this.time - b.start) * 26);
    view.material.map = skinTexture(palette); view.material.color.set(dead ? '#7c7f78' : '#ffffff');
    view.body.update(points, (fromHead, fromTail) => {
      let r = .41 * Math.pow(Math.min(1, fromTail / 2.4), .62);
      // A slight neck, then the swallowed meal travelling down the body.
      r *= .88 + .12 * Math.min(1, fromHead / 1.2);
      for (const at of bulges) r *= 1 + .38 * Math.exp(-((fromHead - at) ** 2) / .7);
      return Math.max(.025, r);
    });
    const head = view.head, first = points[0], next = points[1] ?? first, dx = first.x - next.x, dz = first.z - next.z;
    let heading;
    if (Math.hypot(dx, dz) > .02) heading = Math.atan2(-dz, dx); else { const [ax, ay] = DIRECTIONS[snake.dir]; heading = Math.atan2(-ay, ax); }
    head.group.visible = true; head.group.position.set(first.x, .31, first.z); head.group.scale.setScalar(1.15); head.group.rotation.y = heading;
    head.skin.color.set(dead ? '#7c7f78' : palette.head); head.hood.visible = !!palette.hood && !dead;
    for (const iris of head.irises) { iris.color.set(palette.eye ?? '#e9c13b'); iris.emissive.set(palette.eye ?? '#000000'); iris.emissiveIntensity = palette.eye ? 1.1 : 0; }
    head.tongue.visible = !dead && !this.reduced && (this.time * 1.7 + snake.id) % 1 < .4;
    if (head.tongue.visible) head.tongue.scale.x = .7 + Math.abs(Math.sin(this.time * 22)) * .6;
    let at = blobStart;
    if (this.blobs.visible) for (let i = 0; i < points.length; i++) { const d = this.dummy; d.position.set(points[i].x, .014, points[i].z); d.rotation.set(0, 0, 0); d.scale.setScalar(i ? .95 : 1.25); d.updateMatrix(); this.blobs.setMatrixAt(at++, d.matrix); }
    return at;
  }
  draw(game, previous, fraction = 1, ghost = null, preview = false) {
    if (!game || !this.resize()) return;
    const now = performance.now(), gap = now - this.clock, dt = Math.min(.1, gap / 1000); this.clock = now; this.time += dt;
    // Weak devices keep their frame rate: shadows go first, then scenery, then resolution.
    // Judged by the clock, not a frame count: at 5 fps a frame count takes far longer than a round lasts.
    if (gap < 1000) { this.frames++; this.spent += gap; }
    if (this.spent >= 800) {
      if (this.spent / this.frames > 34) {
        if (this.sun.castShadow) { this.sun.castShadow = false; this.blobs.visible = true; }
        else if (this.high) { this.high = false; this.setTheme(this.themeName); }
        else if (this.pixelRatio > 1) { this.pixelRatio = Math.max(1, this.pixelRatio - .35); this.renderer.setPixelRatio(this.pixelRatio); }
      }
      this.frames = 0; this.spent = 0;
    }
    this.bulges = this.bulges.filter(b => this.time - b.start < 2.2);
    const alpha = this.reduced ? 1 : Math.min(1, Math.max(0, fraction));
    let blobs = 0;
    game.snakes.forEach((s, index) => { blobs = this.drawSnake(this.snakes[index], s, previous?.snakes[s.id], alpha, index === 0 && game.mode !== 'duel' ? this.skin : index === 0 ? SKINS.nagin : AMBER, blobs); });
    for (let i = game.snakes.length; i < 2; i++) { this.snakes[i].body.mesh.visible = false; this.snakes[i].head.group.visible = false; }
    if (this.blobs.visible) { this.blobs.count = blobs; this.blobs.instanceMatrix.needsUpdate = true; }
    this.ghost.mesh.visible = !!ghost;
    if (ghost) {
      this.ghost.update(ghost.snakes[0].body.map(p => ({ x: cellX(p.x), z: cellZ(p.y) })), (_, fromTail) => Math.max(.03, .33 * Math.pow(Math.min(1, fromTail / 2), .6)));
      this.ghost.mesh.material.opacity = ghost.status === 'finished' ? .14 : .42;
    }
    const wantDark = game.chaos?.blackout ? 1 : 0; this.dark += (wantDark - this.dark) * Math.min(1, dt * (this.reduced ? 30 : 7));
    this.syncFood(game.food, .03 + this.dark * .8); this.syncChaos(game.chaos);
    this.hemi.intensity = this.baseHemi * (1 - this.dark * .95); this.sun.intensity = this.baseSun * (1 - this.dark * .98);
    if (this.pmrem) this.scene.environmentIntensity = this.baseEnv * (1 - this.dark * .95);
    const night = 1 - this.dark * .94; this.sky.material.color.setScalar(night); this.scene.fog.color.copy(this.fogColor).multiplyScalar(night);
    this.headLight.position.set(this.snakes[0].head.group.position.x, 1.5, this.snakes[0].head.group.position.z); this.headLight.intensity = this.dark * 34;
    if (!this.reduced) for (const fn of this.animated) fn(this.time);
    this.particles = this.particles.filter(p => (p.life -= dt) > 0);
    this.particles.forEach((p, i) => { p.vy -= 11 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; this.dummy.position.set(p.x, Math.max(.05, p.y), p.z); this.dummy.rotation.set(0, 0, 0); this.dummy.scale.setScalar(Math.max(.15, p.life * 2)); this.dummy.updateMatrix(); this.particleMesh.setMatrixAt(i, this.dummy.matrix); this.tint.set(p.color); this.particleMesh.setColorAt(i, this.tint); });
    this.particleMesh.count = this.particles.length; this.particleMesh.instanceMatrix.needsUpdate = true; if (this.particleMesh.instanceColor) this.particleMesh.instanceColor.needsUpdate = true;
    if (this.goal) {
      // Glide when a panel opens or closes instead of snapping.
      const ease = this.reduced ? 1 : Math.min(1, dt * 9), view = this.view;
      view.position.lerp(this.goal.position, ease); view.dx += (this.goal.dx - view.dx) * ease; view.dy += (this.goal.dy - view.dy) * ease;
      this.camera.setViewOffset(this.width, this.height, view.dx, view.dy, this.width, this.height);
      this.camera.position.copy(view.position);
      if (preview && !this.reduced) this.camera.position.x += Math.sin(this.time * .3) * .9;
      if (this.shakeAmount > .01) { this.camera.position.x += Math.sin(this.time * 61) * this.shakeAmount * .55; this.camera.position.y += Math.cos(this.time * 47) * this.shakeAmount * .4; this.shakeAmount *= Math.pow(.02, dt); }
      this.camera.lookAt(this.camera.userData.target);
    }
    this.renderer.render(this.scene, this.camera);
  }
  quality() { return `3D shadows ${this.sun.castShadow ? 'on' : 'off'}, scenery ${this.high ? 'full' : 'light'}, sharpness ${this.pixelRatio.toFixed(2)}, ${this.renderer.info.render.calls} draws`; }
  // The drawing buffer clears after compositing, so render immediately before reading it.
  snapshot() { this.renderer.render(this.scene, this.camera); return this.canvas; }
}
