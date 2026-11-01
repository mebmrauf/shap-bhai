// Models and scenery for the 3D board. Everything is procedural, so the download stays small and works offline.
import { Mesh, Group, BoxGeometry, SphereGeometry, CylinderGeometry, ConeGeometry, PlaneGeometry, TorusGeometry, CircleGeometry, InstancedMesh, Object3D, MeshStandardMaterial, CanvasTexture, RepeatWrapping, SRGBColorSpace, DoubleSide, Color } from '../vendor/three-0.187.0-r2/three.min.js';
import { SIZE } from './engine.js';

// Fixed seed: the same scenery every visit, and no flicker when a board is rebuilt.
function seeded(seed) { let n = seed; return () => { n = (n * 16807) % 2147483647; return (n - 1) / 2147483646; }; }
export function texture(width, height, paint, repeatX = 1, repeatY = 1, color = true) {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  paint(canvas.getContext('2d'), width, height);
  const map = new CanvasTexture(canvas);
  if (color) map.colorSpace = SRGBColorSpace;
  map.wrapS = map.wrapT = RepeatWrapping; map.repeat.set(repeatX, repeatY); map.anisotropy = 4;
  return map;
}
export const mat = (color, roughness = .8, metalness = 0, extra = {}) => new MeshStandardMaterial({ color, roughness, metalness, ...extra });
function shadow(mesh, cast = true, receive = false) { mesh.castShadow = cast; mesh.receiveShadow = receive; return mesh; }
export function box(w, h, d, material, x = 0, y = 0, z = 0) { const m = new Mesh(new BoxGeometry(w, h, d), material); m.position.set(x, y, z); return shadow(m); }
export function cyl(top, bottom, h, material, x = 0, y = 0, z = 0, segments = 12) { const m = new Mesh(new CylinderGeometry(top, bottom, h, segments), material); m.position.set(x, y, z); return shadow(m); }
export function ball(r, material, x = 0, y = 0, z = 0, detail = 14) { const m = new Mesh(new SphereGeometry(r, detail, Math.max(8, detail - 4)), material); m.position.set(x, y, z); return shadow(m); }
function speckle(c, w, h, count, colors, rnd, max = 2.2) {
  for (let i = 0; i < count; i++) { c.fillStyle = colors[Math.floor(rnd() * colors.length)]; c.globalAlpha = .08 + rnd() * .3; c.beginPath(); c.arc(rnd() * w, rnd() * h, rnd() * max, 0, 7); c.fill(); }
  c.globalAlpha = 1;
}

const TIRE = mat('#16161a', .9), CHROME = mat('#c9ced6', .25, .9), STEEL = mat('#4a4f57', .55, .7);
function wheel(radius, x, y, z, spokes = 0) {
  const g = new Group();
  const tire = new Mesh(new TorusGeometry(radius, radius * .16, 8, 22), TIRE); tire.castShadow = true; g.add(tire);
  if (spokes) for (let i = 0; i < spokes; i++) { const s = new Mesh(new BoxGeometry(radius * 1.9, .012, .012), CHROME); s.rotation.z = i * Math.PI / spokes; g.add(s); }
  else g.add(new Mesh(new CircleGeometry(radius * .8, 14), STEEL));
  g.add(new Mesh(new CylinderGeometry(radius * .18, radius * .18, .06, 8).rotateX(Math.PI / 2), CHROME));
  g.position.set(x, y, z);
  return g;
}
const artCache = new Map();
function rickshawArt(hue) {
  if (!artCache.has(hue)) artCache.set(hue, texture(128, 96, (c, w, h) => {
    c.fillStyle = hue; c.fillRect(0, 0, w, h); c.fillStyle = '#ffd23f'; c.fillRect(0, 0, w, 7); c.fillRect(0, h - 7, w, 7);
    c.fillStyle = '#7bdff2'; c.beginPath(); c.arc(w / 2, h * .46, 26, Math.PI, 0); c.fill(); c.fillStyle = '#2d6a4f'; c.fillRect(8, h * .46, w - 16, 22);
    for (const x of [24, 64, 104]) { c.fillStyle = '#fff'; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; c.beginPath(); c.ellipse(x + Math.cos(a) * 6, h * .68 + Math.sin(a) * 6, 4, 2.5, a, 0, 7); c.fill(); } c.fillStyle = '#ff2e63'; c.beginPath(); c.arc(x, h * .68, 3.4, 0, 7); c.fill(); }
  }));
  return artCache.get(hue);
}
// Faces +x. About one grid cell long at scale 1.
export function rickshaw(hue = '#d7263d') {
  const g = new Group(), paint = mat(hue, .35, .1), art = mat('#ffffff', .5, 0, { map: rickshawArt(hue) });
  g.add(wheel(.15, -.26, .15, .19, 8), wheel(.15, -.26, .15, -.19, 8), wheel(.15, .36, .15, 0, 8));
  g.add(box(.56, .03, .03, STEEL, .05, .24, 0), box(.03, .03, .4, STEEL, -.26, .15, 0), box(.03, .25, .03, STEEL, .34, .29, 0), box(.03, .03, .22, CHROME, .34, .42, 0));
  g.add(box(.26, .1, .38, paint, -.2, .3, 0), box(.2, .05, .36, mat('#7a1020', .6), -.17, .38, 0), box(.05, .2, .36, art, -.31, .44, 0), box(.1, .03, .1, mat('#1b1b1b', .7), .12, .4, 0), box(.02, .15, .02, STEEL, .12, .32, 0));
  const hood = new Mesh(new CylinderGeometry(.21, .21, .4, 12, 1, true, 0, Math.PI).rotateX(Math.PI / 2).rotateY(Math.PI / 2), mat('#14325c', .75, 0, { side: DoubleSide })); hood.position.set(-.16, .5, 0); hood.castShadow = true; g.add(hood);
  return g;
}
const busCache = new Map();
function busSide(hue) {
  if (!busCache.has(hue)) busCache.set(hue, texture(256, 96, (c, w, h) => {
    c.fillStyle = hue; c.fillRect(0, 0, w, h); c.fillStyle = '#f7f1dc'; c.fillRect(0, h * .62, w, 9); c.fillStyle = '#ffc300'; c.fillRect(0, h * .74, w, 6);
    c.fillStyle = '#16232e'; for (let x = 8; x < w - 12; x += 34) { c.fillRect(x, 12, 28, 30); }
    c.fillStyle = '#7ca5b8'; c.globalAlpha = .35; for (let x = 8; x < w - 12; x += 34) c.fillRect(x + 2, 14, 11, 26); c.globalAlpha = 1;
    // Every Dhaka bus has been in a few arguments.
    const rnd = seeded(hue.charCodeAt(1) * 977 + 3); c.strokeStyle = '#00000055'; for (let i = 0; i < 14; i++) { c.lineWidth = 1 + rnd() * 2; c.beginPath(); const x = rnd() * w, y = 44 + rnd() * 50; c.moveTo(x, y); c.lineTo(x + 8 + rnd() * 22, y + rnd() * 5); c.stroke(); }
    speckle(c, w, h, 90, ['#3a2a1a', '#000'], rnd, 3);
    c.fillStyle = '#fff'; c.font = '700 13px Bangla,sans-serif'; c.fillText('গুলিস্তান - মতিঝিল', 12, h - 7);
  }));
  return busCache.get(hue);
}
export function bus(hue = '#1f7a8c') {
  const g = new Group(), side = mat('#fff', .55, .1, { map: busSide(hue) }), paint = mat(hue, .5, .1), glass = mat('#14222c', .12, .4);
  const body = new Mesh(new BoxGeometry(.94, .5, .6), [glass, paint, paint, paint, side, side]); body.position.y = .41; body.castShadow = true; g.add(body);
  g.add(box(.9, .05, .56, mat('#d8d8d0', .6), 0, .68, 0), box(.02, .06, .4, mat('#ffe9a8', .2, 0, { emissive: '#ffcf70', emissiveIntensity: .7 }), .475, .22, 0));
  for (const x of [-.26, .27]) for (const z of [-.3, .3]) g.add(wheel(.1, x, .1, z));
  return g;
}
export function cng() {
  const g = new Group(), green = mat('#1f8a4c', .4, .1);
  g.add(box(.5, .24, .34, green, -.02, .3, 0), box(.2, .3, .3, green, .17, .34, 0).rotateZ(.2));
  const roof = new Mesh(new CylinderGeometry(.2, .2, .36, 12, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateY(Math.PI / 2), mat('#14592f', .6)); roof.position.set(-.05, .44, 0); roof.scale.y = .9; roof.castShadow = true; g.add(roof);
  g.add(box(.02, .16, .3, mat('#1a2a33', .15, .4), .25, .45, 0), box(.4, .012, .3, mat('#d8e8e0', .3), -.05, .22, 0), wheel(.09, -.17, .09, .18), wheel(.09, -.17, .09, -.18), wheel(.09, .28, .09, 0));
  return g;
}
const vehicles = [() => rickshaw('#d7263d'), () => bus('#1f7a8c'), cng, () => bus('#b5382a'), () => rickshaw('#0f8b8d'), () => bus('#3a5a9b')];
export const trafficModel = index => vehicles[index % vehicles.length]();

const newsprint = () => texture(64, 64, (c, w, h) => { c.fillStyle = '#e6dfc6'; c.fillRect(0, 0, w, h); c.fillStyle = '#4a4a44'; for (let y = 4; y < h; y += 5) for (let x = 3; x < w; x += 12) c.fillRect(x, y, 6 + (x * y) % 5, 1.6); });
const crisp = () => texture(128, 128, (c, w, h) => { c.fillStyle = '#d9983f'; c.fillRect(0, 0, w, h); speckle(c, w, h, 500, ['#a8611c', '#f0c070', '#7a4310'], seeded(11), 5); });
// Faces any way; sits on the ground at y=0 and spans roughly one cell.
export function foodModel(kind) {
  const g = new Group();
  if (kind === 'feast') { // biryani in a brass handi
    const brass = mat('#c28a2c', .32, .9), rice = mat('#f3d27a', .8), rnd = seeded(5);
    g.add(cyl(.36, .25, .26, brass, 0, .13, 0, 18), new Mesh(new TorusGeometry(.36, .03, 8, 22).rotateX(Math.PI / 2), brass).translateY(.26));
    const heap = ball(.34, rice, 0, .24, 0, 16); heap.scale.y = .55; g.add(heap);
    for (let i = 0; i < 26; i++) { const a = rnd() * 7, r = rnd() * .28, grain = ball(.022, mat(rnd() > .6 ? '#fff4cf' : '#e8a93c', .7), Math.cos(a) * r, .36 + (.28 - r) * .25, Math.sin(a) * r, 6); grain.scale.x = 2; grain.rotation.y = a; g.add(grain); }
    g.add(ball(.075, mat('#6b3414', .55), .1, .42, .05, 10), ball(.06, mat('#fff', .4), -.1, .41, -.04, 10));
  } else if (kind === 0) { // fuchka: crisp shells on a leaf with tamarind water showing
    const leaf = new Mesh(new CircleGeometry(.36, 18).rotateX(-Math.PI / 2), mat('#3f7d3a', .6)); leaf.position.y = .012; leaf.scale.z = .8; g.add(leaf);
    const skin = mat('#fff', .75, 0, { map: crisp(), bumpMap: crisp(), bumpScale: 1.5 });
    for (const [x, z, s] of [[-.12, .05, 1], [.14, .04, .9], [.01, -.13, .85]]) {
      const shell = ball(.16 * s, skin, x, .15 * s, z, 16); shell.scale.y = .95; g.add(shell);
      const hole = new Mesh(new CircleGeometry(.07 * s, 12).rotateX(-Math.PI / 2 + .25), mat('#3a1f0c', .35)); hole.position.set(x, .3 * s, z + .012); g.add(hole);
      g.add(ball(.024, mat('#e8d58a', .6), x + .012, .3 * s, z + .012, 6));
    }
  } else if (kind === 1) { // jhalmuri in a newspaper cone
    const cone = new Mesh(new ConeGeometry(.2, .46, 14).rotateX(Math.PI), mat('#fff', .9, 0, { map: newsprint() })); cone.position.y = .26; cone.castShadow = true; g.add(cone);
    const rnd = seeded(23);
    for (let i = 0; i < 34; i++) { const a = rnd() * 7, r = rnd() * .17, x = Math.cos(a) * r, z = Math.sin(a) * r; const p = rnd(); const piece = ball(p > .9 ? .02 : .032, mat(p > .9 ? '#d7261e' : p > .8 ? '#3c9a3c' : p > .65 ? '#b98a4a' : '#f4ecd2', .85), x, .49 + (.18 - r) * .35 + rnd() * .03, z, 6); if (p > .9) piece.scale.x = 2.4; g.add(piece); }
  } else if (kind === 2) { // roshogolla in syrup, in a clay bhar
    const clay = mat('#a85c33', .85);
    g.add(cyl(.3, .21, .22, clay, 0, .11, 0, 18), new Mesh(new TorusGeometry(.3, .022, 8, 22).rotateX(Math.PI / 2), clay).translateY(.22));
    const syrup = new Mesh(new CircleGeometry(.28, 22).rotateX(-Math.PI / 2), mat('#e8c98a', .06, 0, { transparent: true, opacity: .85 })); syrup.position.y = .2; g.add(syrup);
    const sweet = mat('#fffaf0', .42);
    for (const [x, z] of [[-.1, .05], [.1, .05], [0, -.11]]) { const b = ball(.105, sweet, x, .26, z, 14); g.add(b); }
  } else { // ilish: the deep-bodied silver fish, on a banana leaf
    const leaf = new Mesh(new PlaneGeometry(.86, .34).rotateX(-Math.PI / 2), mat('#2f6d31', .55)); leaf.position.y = .012; g.add(leaf);
    const scales = texture(128, 64, (c, w, h) => {
      const grad = c.createLinearGradient(0, 0, 0, h); grad.addColorStop(0, '#5b7186'); grad.addColorStop(.45, '#c9d4dc'); grad.addColorStop(1, '#f4f6f8'); c.fillStyle = grad; c.fillRect(0, 0, w, h);
      c.strokeStyle = '#00000022'; for (let y = 0; y < h; y += 5) for (let x = (y % 10 ? 3 : 0); x < w; x += 6) { c.beginPath(); c.arc(x, y, 3, 0, Math.PI); c.stroke(); }
    });
    const silver = mat('#fff', .24, .65, { map: scales }), fin = mat('#7c8c99', .4, .5, { side: DoubleSide });
    const body = ball(.27, silver, 0, .15, 0, 20); body.scale.set(1.35, .78, .42); g.add(body);
    const tail = new Mesh(new ConeGeometry(.12, .2, 4).rotateZ(-Math.PI / 2), fin); tail.position.set(-.42, .15, 0); tail.scale.z = .2; tail.castShadow = true; g.add(tail);
    const dorsal = new Mesh(new ConeGeometry(.06, .1, 3), fin); dorsal.position.set(.02, .35, 0); dorsal.scale.z = .25; g.add(dorsal);
    g.add(ball(.032, mat('#f6e7a8', .2), .27, .2, .085, 8), ball(.016, mat('#050505', .1), .285, .2, .108, 6));
  }
  return g;
}

// The snake's head, pointing along +x, with an optional cobra hood.
export function snakeHead() {
  const g = new Group(), skin = mat('#ffffff', .34, .08);
  const skull = ball(.33, skin, -.03, .02, 0, 20); skull.scale.set(1.25, .68, 1);
  const snout = ball(.2, skin, .22, -.03, 0, 16); snout.scale.set(1.15, .62, .85);
  g.add(skull, snout);
  const irises = [];
  for (const side of [-1, 1]) {
    const iris = mat('#e9c13b', .18, 0, { emissive: '#000000' }), eye = ball(.075, iris, .1, .11, side * .2, 12); irises.push(iris);
    const slit = box(.012, .082, .022, mat('#050505', .12), .155, .118, side * .24); slit.castShadow = false;
    g.add(eye, slit, ball(.012, mat('#160a08', .5), .36, .015, side * .06, 6));
  }
  const tongue = new Group(), red = mat('#d3123f', .4);
  tongue.add(box(.2, .012, .022, red, .1, 0, 0));
  for (const side of [-1, 1]) { const fork = box(.09, .01, .012, red, .24, 0, side * .022); fork.rotation.y = -side * .5; tongue.add(fork); }
  tongue.position.set(.38, -.05, 0); g.add(tongue);
  const hood = new Group(), hoodMat = mat('#20202c', .36, .1, { side: DoubleSide }), gold = mat('#e0b02f', .34, .35);
  const flare = ball(.5, hoodMat, 0, .3, 0, 18); flare.scale.set(.16, .72, 1.18); hood.add(flare);
  // The gold spectacle mark, on the face the camera can see.
  for (const side of [-1, 1]) { const ring = new Mesh(new TorusGeometry(.095, .024, 6, 14).rotateY(Math.PI / 2), gold); ring.position.set(.085, .42, side * .24); hood.add(ring); }
  hood.add(box(.02, .035, .24, gold, .085, .42, 0));
  // Reared back, so the spread of the hood shows from above.
  hood.position.set(-.16, -.02, 0); hood.rotation.z = .85;
  hood.visible = false; g.add(hood);
  return { group: g, skin, irises, tongue, hood };
}

const facadeCache = new Map();
function facade(wall, seed) {
  const key = wall + seed;
  if (!facadeCache.has(key)) facadeCache.set(key, texture(160, 320, (c, w, h) => {
    const rnd = seeded(seed * 311 + 7); c.fillStyle = wall; c.fillRect(0, 0, w, h);
    // Monsoon stains run down every wall in Dhaka.
    for (let i = 0; i < 26; i++) { const x = rnd() * w, g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#00000040'); g.addColorStop(1, '#00000000'); c.fillStyle = g; c.fillRect(x, rnd() * h * .4, 3 + rnd() * 12, h * (.3 + rnd() * .6)); }
    speckle(c, w, h, 240, ['#000', '#fff', '#3a2a1a'], rnd, 3);
    for (let floor = 0; floor < 4; floor++) {
      const y = floor * 80; c.fillStyle = '#00000030'; c.fillRect(0, y + 72, w, 5);
      for (let col = 0; col < 2; col++) {
        const x = 14 + col * 76, lit = rnd() > .84;
        c.fillStyle = lit ? '#ffdd8f' : rnd() > .5 ? '#1c2a36' : '#2e3f4c'; c.fillRect(x, y + 12, 56, 42);
        c.fillStyle = '#ffffff18'; c.fillRect(x, y + 12, 22, 42);
        // Window grills.
        c.strokeStyle = '#1a1a1a'; c.lineWidth = 2; for (let bar = 0; bar <= 5; bar++) { c.beginPath(); c.moveTo(x + bar * 11.2, y + 12); c.lineTo(x + bar * 11.2, y + 54); c.stroke(); }
        c.fillStyle = '#ffffff30'; c.fillRect(x - 3, y + 54, 62, 5);
        if (rnd() > .6) { const colors = ['#ef476f', '#3a86ff', '#ffd166', '#fefae0', '#06d6a0']; for (let cloth = 0; cloth < 4; cloth++) { c.fillStyle = colors[Math.floor(rnd() * 5)]; c.fillRect(x + cloth * 14 + 2, y + 54, 10, 12 + rnd() * 10); } }
        else if (rnd() > .55) { c.fillStyle = '#d4d6d2'; c.fillRect(x + 36, y + 56, 20, 13); c.fillStyle = '#7d8084'; c.fillRect(x + 38, y + 58, 16, 9); }
      }
    }
  }));
  return facadeCache.get(key);
}
const roofMat = mat('#57524a', .95);
function building(wall, seed, w, floors, d, x, z, detail, rnd) {
  const g = new Group(), h = floors * .95, map = facade(wall, seed).clone(); map.repeat.set(Math.max(1, Math.round(w / 2.2)), floors / 4);
  const face = mat('#ffffff', .9, 0, { map }), plain = mat(new Color(wall).multiplyScalar(.75), .92), body = new Mesh(new BoxGeometry(w, h, d), [plain, plain, roofMat, roofMat, face, plain]);
  body.position.y = h / 2; g.add(body);
  g.add(box(w + .08, .28, d + .08, mat(new Color(wall).multiplyScalar(.82), .9), 0, h + .05, 0));
  if (detail) {
    const tank = cyl(.4, .4, .7, mat('#20242a', .6), w * (rnd() - .5) * .5, h + .45, 0); tank.castShadow = false; g.add(tank);
    if (rnd() > .5) { const stair = box(1.1, .8, 1, plain, -w * .24, h + .4, -d * .1); stair.castShadow = false; g.add(stair); }
  }
  g.position.set(x, 0, z);
  return g;
}
const SHOPS = ['মায়ের দোয়া ফার্মেসি', 'ঢাকা বিরিয়ানি হাউস', 'মামা চা স্টল', 'নিউ মডেল টেইলার্স', 'বাবার দোয়া স্টোর', 'ফুচকা কর্নার', 'মোবাইল সার্ভিসিং', 'জ্যাম হোটেল'];
function signboard(index, width) {
  const colors = ['#c1121f', '#006a4e', '#1d3557', '#7209b7', '#b5651d'], hue = colors[index % colors.length];
  const map = texture(320, 64, (c, w, h) => {
    c.fillStyle = hue; c.fillRect(0, 0, w, h); c.fillStyle = '#ffd23f'; c.fillRect(0, 0, w, 5); c.fillRect(0, h - 5, w, 5);
    c.fillStyle = '#fff'; c.font = '700 34px Bangla,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(SHOPS[index % SHOPS.length], w / 2, h / 2 + 2, w - 18);
  });
  const sign = new Mesh(new BoxGeometry(width, width / 5, .08), mat('#fff', .5, 0, { map, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: .12 }));
  return sign;
}
function tree(x, z, scale, rnd, leaf = '#3f7f3a') {
  const g = new Group(), bark = mat('#5a4530', .95);
  g.add(cyl(.09, .17, 1.8, bark, 0, .9, 0, 7));
  for (let i = 0; i < 6; i++) { const a = rnd() * 7, r = rnd() * .65, blob = ball(.55 + rnd() * .35, mat(new Color(leaf).offsetHSL(0, 0, (rnd() - .5) * .1), .9), Math.cos(a) * r, 1.9 + rnd() * .75, Math.sin(a) * r, 8); g.add(blob); }
  g.position.set(x, 0, z); g.scale.setScalar(scale);
  return g;
}
function palm(x, z, height, rnd) {
  const g = new Group(), bark = mat('#7a6246', .95), trunk = cyl(.08, .15, height, bark, 0, height / 2, 0, 7); trunk.rotation.z = (rnd() - .5) * .2; g.add(trunk);
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * Math.PI * 2, frond = new Mesh(new PlaneGeometry(1.7, .34, 4, 1), mat('#2f8a46', .75, 0, { side: DoubleSide }));
    const p = frond.geometry.attributes.position; for (let v = 0; v < p.count; v++) { const t = p.getX(v) + .85; p.setY(v, p.getY(v) * (1 - t * .45)); p.setZ(v, -t * t * .3); }
    frond.geometry.computeVertexNormals(); frond.rotation.set(-Math.PI / 2 + .25, 0, a); frond.position.set(Math.cos(a) * .72, height + .08, -Math.sin(a) * .72); frond.castShadow = true; g.add(frond);
  }
  g.position.set(x, 0, z);
  return g;
}
function mangrove(x, z, scale, rnd) {
  const g = new Group(), bark = mat('#4e3d2b', .95);
  g.add(cyl(.11, .18, 1.5, bark, 0, 1, 0, 7));
  for (let i = 0; i < 6; i++) { const a = i * 1.05, root = cyl(.018, .05, .75, bark, Math.cos(a) * .26, .26, Math.sin(a) * .26, 5); root.rotation.set(Math.sin(a) * .7, 0, -Math.cos(a) * .7); g.add(root); }
  for (let i = 0; i < 6; i++) { const a = rnd() * 7, r = rnd() * .6; g.add(ball(.42 + rnd() * .35, mat(new Color('#2e6f43').offsetHSL(0, 0, (rnd() - .5) * .08), .9), Math.cos(a) * r, 1.8 + rnd() * .6, Math.sin(a) * r, 8)); }
  g.position.set(x, 0, z); g.scale.setScalar(scale);
  return g;
}
function waterTexture(deep, light) {
  return texture(256, 256, (c, w, h) => {
    c.fillStyle = deep; c.fillRect(0, 0, w, h); const rnd = seeded(77); c.strokeStyle = light; c.lineCap = 'round';
    for (let i = 0; i < 90; i++) { c.globalAlpha = .1 + rnd() * .35; c.lineWidth = .8 + rnd() * 2; const x = rnd() * w, y = rnd() * h, l = 10 + rnd() * 36; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + l / 2, y - 3, x + l, y); c.stroke(); }
    c.globalAlpha = 1;
  }, 14, 8);
}

// One line of mood per place: light, sky and ground.
export const LOOKS = Object.freeze({
  dhaka: { top: '#6f93b5', mid: '#f0b98a', low: '#f7d9a8', fog: '#d9b596', sun: '#ffdcb0', sunPower: 3.1, sky: 1.05, sunDir: [-9, 15, 8], ground: ['#4c4e54', '#3d3f44', '#5e6065'] },
  rooftop: { top: '#54548f', mid: '#ee8c86', low: '#ffc98b', fog: '#e9a78c', sun: '#ffc08a', sunPower: 2.9, sky: .95, sunDir: [10, 11, 8], ground: ['#8a5a44', '#6e4634', '#a26c50'] },
  coxs: { top: '#2f8fd6', mid: '#8fd0f0', low: '#e4f4f8', fog: '#cfe6ee', sun: '#fff4dc', sunPower: 3.5, sky: 1.2, sunDir: [-7, 19, 6], ground: ['#dcc189', '#c9ab70', '#ecd6a4'] },
  sundarbans: { top: '#8db5b0', mid: '#c7d8c0', low: '#e8e8cf', fog: '#c6d4bd', sun: '#fff0cf', sunPower: 2.5, sky: 1.1, sunDir: [8, 14, 9], ground: ['#4a4632', '#3a3827', '#5a5a3c'] }
});

// Paints the playing surface. Cells stay readable: realism must never hide where the grid is.
export function boardTextures(theme) {
  const paint = (c, w) => {
    const u = w / SIZE, rnd = seeded(theme.length * 101 + 9);
    const looks = {
      dhaka: [['#55585e', '#63666c'], '#34363b', ['#74767a', '#44464b', '#303238']],
      rooftop: [['#a4603f', '#b06a48'], '#5f3a2a', ['#c47f5c', '#7d4a33', '#8f5a42']],
      coxs: [['#cdb078', '#d7bb85'], '#a78f5f', ['#e8d4a0', '#a98e5a', '#bfa16b']],
      sundarbans: [['#5b5a3a', '#646341'], '#37361f', ['#7a7a4e', '#3e3d27', '#4a5a30']]
    }[theme];
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) { c.fillStyle = looks[0][(x + y) % 2]; c.fillRect(x * u, y * u, u, u); }
    speckle(c, w, w, 7000, looks[2], rnd, 2.6);
    if (theme === 'dhaka') {
      c.fillStyle = '#d9d4bf'; c.globalAlpha = .55; for (const y of [5, 15]) for (let x = 0; x < SIZE; x += 2) c.fillRect(x * u + u * .3, y * u - u * .05, u * 1.1, u * .1);
      c.globalAlpha = .07; c.fillStyle = '#000'; for (let i = 0; i < 16; i++) { c.beginPath(); c.ellipse(rnd() * w, rnd() * w, 10 + rnd() * 30, 6 + rnd() * 16, rnd() * 3, 0, 7); c.fill(); }
      c.globalAlpha = 1; c.fillStyle = '#25262a'; c.beginPath(); c.arc(u * 13.5, u * 9.5, u * .42, 0, 7); c.fill(); c.strokeStyle = '#55565a'; c.lineWidth = 3; c.stroke();
    } else if (theme === 'coxs') {
      c.strokeStyle = '#8f7a4d'; c.globalAlpha = .28; for (let y = 6; y < w; y += 15) { c.lineWidth = 1 + rnd() * 2; c.beginPath(); c.moveTo(0, y); for (let x = 0; x < w; x += 30) c.quadraticCurveTo(x + 15, y + (rnd() - .5) * 10, x + 30, y + (rnd() - .5) * 4); c.stroke(); }
      c.globalAlpha = 1;
    } else if (theme === 'sundarbans') {
      c.fillStyle = '#4f6a2f'; c.globalAlpha = .28; for (let i = 0; i < 26; i++) { c.beginPath(); c.ellipse(rnd() * w, rnd() * w, 12 + rnd() * 34, 7 + rnd() * 20, rnd() * 3, 0, 7); c.fill(); }
      c.globalAlpha = 1;
    }
    c.strokeStyle = looks[1]; c.lineWidth = theme === 'rooftop' ? 3 : 1.4; c.globalAlpha = theme === 'rooftop' ? .9 : .5;
    for (let i = 0; i <= SIZE; i++) { c.beginPath(); c.moveTo(i * u, 0); c.lineTo(i * u, w); c.moveTo(0, i * u); c.lineTo(w, i * u); c.stroke(); }
    c.globalAlpha = 1;
  };
  return { map: texture(1024, 1024, paint), bump: texture(512, 512, (c, w) => { c.fillStyle = '#808080'; c.fillRect(0, 0, w, w); speckle(c, w, w, 5000, ['#000', '#fff'], seeded(3), 2.2); }, 1, 1, false) };
}
export function groundTexture(look) {
  return texture(256, 256, (c, w, h) => { c.fillStyle = look.ground[0]; c.fillRect(0, 0, w, h); speckle(c, w, h, 1500, look.ground, seeded(9), 3); }, 60, 60);
}

export function floralBand(edge, trim) {
  return texture(256, 64, (c, w, h) => {
    c.fillStyle = edge; c.fillRect(0, 0, w, h); c.fillStyle = trim; c.fillRect(0, 0, w, 5); c.fillRect(0, h - 5, w, 5);
    for (let x = 32; x < w; x += 64) {
      c.fillStyle = '#ffffff'; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; c.beginPath(); c.ellipse(x + Math.cos(a) * 11, h / 2 + Math.sin(a) * 11, 8, 5, a, 0, 7); c.fill(); }
      c.fillStyle = trim; c.beginPath(); c.arc(x, h / 2, 7, 0, 7); c.fill();
      c.fillStyle = '#0b6e4f'; for (const s of [-1, 1]) { c.beginPath(); c.ellipse(x + s * 26, h / 2, 7, 3.5, s * .6, 0, 7); c.fill(); }
    }
  }, 5, 1);
}

// `detail` is 0 on weak devices, which keeps the place recognisable with far fewer objects.
export function decorate(theme, group, animated, detail) {
  const T = SIZE / 2, rnd = seeded(theme.length * 53 + 11), walls = ['#d9b28c', '#c9c2b4', '#e0c58f', '#b8bfbf', '#d99a7c', '#a9b8a0', '#e7d9c0', '#c78f7c'];
  const dummy = new Object3D();
  if (theme === 'dhaka') {
    const paving = texture(128, 128, (c, w, h) => { c.fillStyle = '#8d8a84'; c.fillRect(0, 0, w, h); speckle(c, w, h, 300, ['#6c6962', '#a5a29b', '#55524c'], seeded(19), 3); c.strokeStyle = '#55524c'; c.lineWidth = 3; c.strokeRect(0, 0, w, h); }, 60, 5);
    const pavement = box(90, .16, 7, mat('#fff', .95, 0, { map: paving }), 0, .08, -T - 7); pavement.castShadow = false; pavement.receiveShadow = true; group.add(pavement);
    let x = -46, i = 0;
    while (x < 46) { const w = 4 + rnd() * 3.5, floors = 5 + Math.floor(rnd() * (detail ? 9 : 6)); group.add(building(walls[i % 8], i % 3, w, floors, 4, x + w / 2, -T - 12.5, detail, rnd)); x += w + .1; i++; }
    x = -40; let shop = 0;
    while (x < 40) { const w = 4 + rnd() * 2.4, sign = signboard(shop++, Math.min(w - .4, 4.6)); sign.position.set(x + w / 2, 2.2, -T - 10.42); group.add(sign); x += w + .1; }
    for (const side of [-1, 1]) {
      for (let z = -8; z <= 9; z += detail ? 4.4 : 8.8) { const v = trafficModel(Math.abs(Math.round(z * side)) % 6); v.position.set(side * (T + 2.4 + rnd() * 1.1), 0, z); v.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2; v.scale.setScalar(2.1); group.add(v); }
      const wallBlock = building(walls[(side + 3) % 8], 1, 4, 8, 22, side * (T + 12), -2, detail, rnd); group.add(wallBlock);
    }
    const poles = [-T - 2, -T / 3, T / 3, T + 2], wire = mat('#101012', .9);
    for (const x of poles) { group.add(cyl(.07, .1, 7, mat('#6e6a64', .9), x, 3.5, -T - 4.4, 6), box(1.5, .07, .07, STEEL, x, 6.5, -T - 4.4)); }
    if (detail) for (let line = 0; line < 8; line++) { const y = 6.7 - line * .2, cable = box(2 * T + 7, .018, .018, wire, 0, y, -T - 4.4 + (line % 3) * .14); cable.rotation.z = (rnd() - .5) * .012; cable.castShadow = false; group.add(cable); }
    group.add(tree(-T - 7, -T - 6.4, 1.4, rnd), tree(T + 7, -T - 6.2, 1.3, rnd));
    const moving = bus('#b5382a'); moving.scale.setScalar(2.4); moving.position.set(0, 0, -T - 2.4); group.add(moving);
    animated.push(t => { moving.position.x = ((t * 2.2) % 70) - 35; });
    const auto = cng(); auto.scale.setScalar(2.2); auto.rotation.y = Math.PI; auto.position.set(0, 0, -T - 1.4); group.add(auto);
    animated.push(t => { auto.position.x = 35 - ((t * 3 + 22) % 70); });
  } else if (theme === 'rooftop') {
    const brick = texture(128, 64, (c, w, h) => { c.fillStyle = '#6b3a2a'; c.fillRect(0, 0, w, h); for (let y = 0; y < 4; y++) for (let x = -1; x < 4; x++) { c.fillStyle = ['#a65a3f', '#b86a48', '#94513a'][(x * 3 + y) % 3 + (x < 0 ? 3 : 0)] ?? '#a65a3f'; c.fillRect(x * 34 + (y % 2) * 16 + 2, y * 16 + 2, 30, 12); } }, 16, 1);
    const wallMat = mat('#fff', .95, 0, { map: brick }), edge = T + 2.6;
    group.add(box(2 * edge + .6, 1.1, .5, wallMat, 0, .55, -edge), box(2 * edge + .6, 1.1, .5, wallMat, 0, .55, edge), box(.5, 1.1, 2 * edge, wallMat, -edge, .55, 0), box(.5, 1.1, 2 * edge, wallMat, edge, .55, 0));
    for (let i = 0; i < 16; i++) group.add(building(walls[i % 8], i % 3, 4 + rnd() * 2, 3 + Math.floor(rnd() * 6), 5, -44 + i * 6, -T - 12 - rnd() * 5, detail, rnd));
    for (const [x, z] of [[-T - 1.5, -6], [T + 1.5, -3], [T + 1.5, 6]]) { const stand = box(1.6, .85, 1.6, mat('#7d7d78', .9), x, .42, z); group.add(stand, cyl(.82, .82, 1.5, mat('#1b1e22', .55), x, 1.6, z, 18), cyl(.3, .3, .14, mat('#1b1e22', .55), x, 2.42, z, 12)); }
    const kiteColors = ['#ef233c', '#ffd166', '#06d6a0', '#7209b7', '#fb5607', '#3a86ff'];
    for (let i = 0; i < (detail ? 8 : 4); i++) {
      const kite = new Group(), sail = new Mesh(new ConeGeometry(.75, 1.15, 4).rotateY(Math.PI / 4), mat(kiteColors[i % 6], .7, 0, { side: DoubleSide })); sail.scale.z = .05; kite.add(sail);
      const tailKite = box(.05, 1, .02, mat('#fff', .8), 0, -1, 0); tailKite.castShadow = false; kite.add(tailKite);
      kite.position.set(-16 + i * 4.6, 10 + (i * 3) % 6, -T - 4 - (i % 3) * 2); group.add(kite);
      animated.push(t => { kite.position.y = 10 + (i * 3) % 6 + Math.sin(t * .8 + i) * .9; kite.rotation.z = Math.sin(t * .6 + i * 2) * .35; });
    }
    const clothes = ['#ef476f', '#fefae0', '#118ab2', '#ffd166', '#06d6a0', '#ff9f1c'];
    group.add(box(2 * T, .03, .03, mat('#222', .8), 0, 2.7, -T - 1.2));
    for (let x = -T + .6; x < T; x += 1.8) { const cloth = box(.8, .9 + rnd() * .3, .02, mat(clothes[Math.floor(rnd() * 6)], .9), x, 2.2, -T - 1.2); group.add(cloth); }
    for (const [x, z] of [[-T - 1.4, 5], [-T - 1.4, 8], [T + 1.4, -8]]) { group.add(cyl(.3, .2, .4, mat('#a85c33', .9), x, .2, z), ball(.42, mat('#3f7f3a', .9), x, .75, z, 9)); }
  } else if (theme === 'coxs') {
    const sea = new Mesh(new PlaneGeometry(240, 90), mat('#fff', .16, .15, { map: waterTexture('#127ea3', '#7fd8e8') })); sea.rotation.x = -Math.PI / 2; sea.position.set(0, .04, -T - 46); sea.receiveShadow = true; group.add(sea);
    animated.push(t => { sea.material.map.offset.set(t * .012, t * .02); });
    const foam = [];
    for (let i = 0; i < 4; i++) { const f = new Mesh(new PlaneGeometry(240, 1 + i * .25), mat('#ffffff', .5, 0, { transparent: true, opacity: .8 - i * .15 })); f.rotation.x = -Math.PI / 2; f.position.y = .06; group.add(f); foam.push(f); }
    animated.push(t => foam.forEach((f, i) => { f.position.z = -T - 2.2 - i * 2.7 + Math.sin(t * .8 + i * 1.2) * .9; }));
    const wet = new Mesh(new PlaneGeometry(240, 5), mat('#a48a5a', .2, .1)); wet.rotation.x = -Math.PI / 2; wet.position.set(0, .03, -T - 2.5); group.add(wet);
    for (const [x, z, h] of [[-T - 3, -6, 4.6], [-T - 4.6, 2, 5.4], [T + 3, -8, 4.8], [T + 4.6, 0, 5.6], [T + 3, 7, 4.2], [-T - 3, 8, 4]]) group.add(palm(x, z, h, rnd));
    ['#ef476f', '#ffd166', '#06d6a0', '#118ab2'].forEach((color, i) => {
      const u = new Group(); u.add(cyl(.035, .035, 2, mat('#f0f0f0', .4, .4), 0, 1, 0, 6)); const top = new Mesh(new ConeGeometry(1.15, .55, 12), mat(color, .7)); top.position.y = 2.1; top.castShadow = true; u.add(top);
      u.position.set(-T - 3 + i * .9, 0, 4 + (i % 2) * 1.2 - i * 2.1); if (i > 1) u.position.x = T + 3 - (i - 2) * .9; group.add(u);
    });
    for (let i = 0; i < (detail ? 3 : 1); i++) {
      const boat = new Group(), hull = ball(1, mat(['#c1121f', '#1d6fa5', '#f4a261'][i], .55), 0, 0, 0, 14); hull.scale.set(2.8, .55, .7); boat.add(hull, box(1.5, .5, .8, mat('#6b4a2c', .85), 0, .6, 0), cyl(.03, .04, 3, mat('#3a2a1a', .9), .3, 1.6, 0, 5));
      boat.position.set(-18 + i * 18, .25, -T - 18 - i * 6); group.add(boat);
      animated.push(t => { boat.position.y = .25 + Math.sin(t * 1.1 + i) * .1; boat.rotation.z = Math.sin(t * .9 + i) * .05; });
    }
  } else {
    const river = new Mesh(new PlaneGeometry(240, 22), mat('#fff', .22, .1, { map: waterTexture('#5a7f6c', '#b9d4c0') })); river.rotation.x = -Math.PI / 2; river.position.set(0, .03, -T - 12); river.receiveShadow = true; group.add(river);
    animated.push(t => { river.material.map.offset.x = t * .02; });
    for (let i = 0; i < (detail ? 26 : 12); i++) group.add(mangrove(-48 + i * (detail ? 3.8 : 8), -T - 24 - rnd() * 7, 1.6 + rnd() * 1.1, rnd));
    for (const [x, z, s] of [[-T - 3, -8, 1.5], [-T - 4.4, -2, 1.8], [-T - 3, 5, 1.4], [T + 3, -7, 1.6], [T + 4.4, 0, 1.9], [T + 3, 7, 1.4]]) group.add(mangrove(x, z, s, rnd));
    // Breathing roots poke out of the mud all around a real mangrove.
    const spikes = new InstancedMesh(new ConeGeometry(.05, .4, 5), mat('#4e3d2b', .95), detail ? 220 : 70);
    for (let i = 0; i < spikes.count; i++) { let x, z; do { x = (rnd() - .5) * 34; z = (rnd() - .5) * 30; } while (Math.abs(x) < T + 1 && Math.abs(z) < T + 1 && z > -T - 1); dummy.position.set(x, .16, z); dummy.rotation.set((rnd() - .5) * .3, 0, (rnd() - .5) * .3); dummy.updateMatrix(); spikes.setMatrixAt(i, dummy.matrix); }
    spikes.castShadow = true; group.add(spikes);
    const stripes = texture(128, 64, (c, w, h) => { c.fillStyle = '#e88b24'; c.fillRect(0, 0, w, h); c.fillStyle = '#f7dcb0'; c.fillRect(0, h * .72, w, h * .28); c.fillStyle = '#15120e'; const r = seeded(31); for (let x = 3; x < w; x += 12) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 5 + r() * 3, h * (.35 + r() * .3)); c.lineTo(x + 7, 0); c.fill(); } });
    const fur = mat('#fff', .85, 0, { map: stripes }), tiger = new Group();
    const torso = ball(.55, fur, -.7, .55, 0, 14); torso.scale.set(1.5, .72, .68); const head = ball(.34, fur, .3, .72, 0, 14); head.scale.set(1, .92, 1);
    tiger.add(torso, head, ball(.16, mat('#f7dcb0', .8), .55, .63, 0, 9), ball(.04, mat('#1a1208', .4), .69, .67, 0, 6), ball(.09, fur, .22, 1.02, .2, 8), ball(.09, fur, .22, 1.02, -.2, 8), ball(.05, mat('#e8d04a', .2), .54, .79, .14, 7), ball(.05, mat('#e8d04a', .2), .54, .79, -.14, 7), ball(.02, mat('#050505', .2), .587, .79, .15, 5), ball(.02, mat('#050505', .2), .587, .79, -.15, 5));
    for (const [x, z] of [[-1.15, .26], [-1.15, -.26], [-.2, .26], [-.2, -.26]]) tiger.add(cyl(.09, .1, .45, fur, x, .22, z, 7));
    const tigerTail = cyl(.04, .07, 1.1, fur, -1.68, .6, 0, 6); tigerTail.rotation.z = .9; tiger.add(tigerTail);
    tiger.rotation.y = -.75; tiger.position.set(-T - 2.1, 0, -T - .7); group.add(tiger);
    animated.push(t => { head.rotation.y = Math.sin(t * .5) * .35; tigerTail.rotation.x = Math.sin(t * 1.4) * .4; });
  }
}
