import * as THREE from 'three';
import {box, cyl, toon, ink, rng} from './kit.js';
import {glow} from './glow.js';
import story from './story.json';

// Per-video "stage": every video gets its own colour world (story.world, designed by the script writer) and its own
// set pieces built from it: tinted walls and ground, a patterned floor rug, bunting, wall art, backdrop landmarks,
// floating colour orbs. Nothing here is shared between videos except the code.

export const WORLD = story.world || {};
const C = (k, d) => new THREE.Color(WORLD[k] || d);

// ---------- helpers ----------
const lum = (c) => c.r * 0.299 + c.g * 0.587 + c.b * 0.114;
const hsl = {h: 0, s: 0, l: 0};

// push a hex colour toward full vividness
export function vivid(color, amount = 0.25, lift = 0.02) {
  const c = new THREE.Color(color); c.getHSL(hsl);
  if (hsl.s < 0.06) return c;                                   // greys, blacks and whites stay neutral
  c.setHSL(hsl.h, Math.min(1, hsl.s + amount * (1 - hsl.s) * 1.6), Math.min(0.92, Math.max(0.08, hsl.l + lift)));
  return c;
}

// pull every set material toward this video's wall / ground colours, then make it vivid
const tintCache = new Map();
export function tintSet(root, amount = 0.3, vividAmt = 0.3) {
  const wall = C('wall', '#7fd0e8'), ground = C('ground', '#f2b45a');
  root.traverse((o) => {
    if (!o.isMesh || !o.material || o.userData.keep) return;
    const m = o.material;
    if (Array.isArray(m) || !m.color || m.isMeshBasicMaterial) return;
    let c = tintCache.get(m);
    if (!c) {
      c = m.clone(); const l = lum(c.color);
      if (amount > 0) c.color.lerp(l > 0.5 ? wall : ground, amount * (0.5 + 0.5 * Math.abs(l - 0.5) * 2));
      c.color.copy(vivid(c.color, vividAmt, 0.01));
      tintCache.set(m, c);
    }
    o.material = c;
  });
}

const flatMat = (color) => new THREE.MeshBasicMaterial({color, side: THREE.DoubleSide});
const mesh = (geo, color, toonShade = true) => new THREE.Mesh(geo, toonShade ? toon(color) : flatMat(color));

// ---------- floor rug / painted stage floor under the heroes ----------
function rugTexture(pattern, a, b, c) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 512; const g = cv.getContext('2d');
  const hex = (x) => '#' + x.getHexString();
  g.fillStyle = hex(a); g.fillRect(0, 0, 512, 512);
  if (pattern === 'checker') {
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = (x + y) % 2 ? hex(b) : hex(a); g.fillRect(x * 64, y * 64, 64, 64); }
  } else if (pattern === 'stripes') {
    for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? hex(b) : hex(a); g.fillRect(i * 64, 0, 64, 512); }
  } else if (pattern === 'diamonds') {
    g.fillStyle = hex(b);
    for (let y = 0; y < 6; y++) for (let x = 0; x < 6; x++) { g.beginPath(); const cx = x * 96 + 48, cy = y * 96 + 48; g.moveTo(cx, cy - 40); g.lineTo(cx + 40, cy); g.lineTo(cx, cy + 40); g.lineTo(cx - 40, cy); g.fill(); }
  } else {                                                        // rings
    for (let i = 6; i >= 0; i--) { g.fillStyle = i % 2 ? hex(b) : hex(a); g.beginPath(); g.arc(256, 256, 36 * (i + 1), 0, Math.PI * 2); g.fill(); }
    g.fillStyle = hex(c); g.beginPath(); g.arc(256, 256, 40, 0, Math.PI * 2); g.fill();
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function rug(ox, hy, hz) {
  const pattern = WORLD.floor || 'rings';
  const tex = rugTexture(pattern, C('accent', '#ff4d8d'), C('accent2', '#ffd23f'), C('ground', '#f2b45a'));
  const round = pattern === 'rings';
  const geo = round ? new THREE.CircleGeometry(3.6, 48) : new THREE.PlaneGeometry(6.4, 4.4);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({map: tex, transparent: true, opacity: 0.96}));
  m.rotation.x = -Math.PI / 2; m.position.set(ox, hy + 0.012, hz + 0.3); m.userData.keep = true; return m;
}

// ---------- bunting / pennant garlands ----------
function bunting(ox, y, z, span, cols) {
  const g = new THREE.Group(); const n = 14;
  for (let i = 0; i < n; i++) {
    const x = -span / 2 + span * (i + 0.5) / n; const sag = Math.sin(((i + 0.5) / n) * Math.PI) * 0.45;
    const tri = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.5, 3), flatMat(cols[i % cols.length]));
    tri.rotation.set(0, 0, Math.PI); tri.position.set(x, y - sag - 0.25, 0); g.add(tri);
  }
  const line = box(span, 0.025, 0.025, '#2a2430', {y: y - 0.2, thick: 0.002, edges: false}); g.add(line);
  g.position.set(ox, 0, z); g.userData.keep = true; return g;
}

// ---------- big wall art for interiors (bold shapes in the video's colours) ----------
function wallArt(ox, z, y, cols, r) {
  const g = new THREE.Group();
  const kinds = ['circle', 'tri', 'bars', 'ring'];
  [-4.6, -0.2, 4.0].forEach((x, i) => {
    const w = 2.4 + r() * 0.8, h = 2.4 + r() * 0.6, k = kinds[Math.floor(r() * kinds.length)];
    const frame = box(w, h, 0.1, cols[i % cols.length], {x, y, z, thick: 0.03}); g.add(frame);
    const inner = flatMat(cols[(i + 1) % cols.length]); const c3 = cols[(i + 2) % cols.length];
    let s;
    if (k === 'circle') s = new THREE.Mesh(new THREE.CircleGeometry(h * 0.34, 24), inner);
    else if (k === 'tri') s = new THREE.Mesh(new THREE.CircleGeometry(h * 0.38, 3), inner);
    else if (k === 'ring') s = new THREE.Mesh(new THREE.RingGeometry(h * 0.18, h * 0.36, 24), inner);
    else { s = new THREE.Group(); for (let j = 0; j < 3; j++) { const bar = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.7, h * 0.16), j === 1 ? flatMat(c3) : inner); bar.position.y = (j - 1) * h * 0.27; s.add(bar); } }
    s.position.set(x, y, z + 0.07); g.add(s);
  });
  g.userData.keep = true; return g;
}

// ---------- backdrop landmarks for outdoor sets ----------
const LANDMARKS = {
  tower: (r, cols) => { const g = new THREE.Group(); const h = 14 + r() * 8; g.add(cyl(2.4, 3.2, h, cols[0], {y: h / 2}), cyl(3.4, 2.6, 2.2, cols[1], {y: h + 1.1}), cyl(0, 2.4, 3.6, cols[2], {y: h + 4})); return g; },
  arch: (r, cols) => { const g = new THREE.Group(); g.add(box(2.2, 11, 2.2, cols[0], {x: -5, y: 5.5}), box(2.2, 11, 2.2, cols[0], {x: 5, y: 5.5}), box(12.4, 2.4, 2.6, cols[1], {y: 11.5})); const t = mesh(new THREE.TorusGeometry(4.4, 0.7, 8, 24, Math.PI), cols[2]); t.position.y = 9; g.add(ink(t, 0.04, false)); return g; },
  pillars: (r, cols) => { const g = new THREE.Group(); for (let i = 0; i < 5; i++) { const h = 8 + r() * 6; g.add(cyl(1.1, 1.3, h, cols[i % cols.length], {x: (i - 2) * 4.2, y: h / 2})); g.add(box(3.0, 0.8, 3.0, cols[(i + 1) % cols.length], {x: (i - 2) * 4.2, y: h + 0.4})); } return g; },
  crystals: (r, cols) => { const g = new THREE.Group(); for (let i = 0; i < 9; i++) { const h = 5 + r() * 9; const c = mesh(new THREE.ConeGeometry(1.1 + r() * 1.3, h, 5), cols[i % cols.length]); c.position.set((i - 4) * 3.2 + r() * 2, h / 2, r() * 3); c.rotation.z = (r() - 0.5) * 0.35; g.add(ink(c, 0.04, false)); const gl = glow(cols[i % cols.length], h * 1.1, 0.22); gl.position.copy(c.position); gl.position.y += h * 0.1; g.add(gl); } return g; },
  windmill: (r, cols) => { const g = new THREE.Group(); g.add(cyl(2.0, 3.0, 10, cols[0], {y: 5}), cyl(0, 3.4, 3.2, cols[1], {y: 11.6})); const rotor = new THREE.Group(); for (let i = 0; i < 4; i++) { const bl = box(0.9, 6.5, 0.2, cols[2], {y: 3.4}); const arm = new THREE.Group(); arm.add(bl); arm.rotation.z = i * Math.PI / 2; rotor.add(arm); } rotor.position.set(0, 9.6, 3.0); g.add(rotor); g.userData.spin = rotor; return g; },
  pyramid: (r, cols) => { const g = new THREE.Group(); const p = mesh(new THREE.ConeGeometry(9, 11, 4), cols[0]); p.position.y = 5.5; p.rotation.y = Math.PI / 4; g.add(ink(p, 0.05, false)); const q = mesh(new THREE.ConeGeometry(5, 6.5, 4), cols[1]); q.position.set(11, 3.2, 3); q.rotation.y = Math.PI / 4; g.add(ink(q, 0.05, false)); return g; },
  balloons: (r, cols) => { const g = new THREE.Group(); for (let i = 0; i < 7; i++) { const b = new THREE.Group(); const s = mesh(new THREE.SphereGeometry(1.6 + r() * 0.9, 16, 12), cols[i % cols.length]); s.scale.y = 1.2; b.add(ink(s, 0.04, false)); b.add(box(0.8, 0.6, 0.8, '#7a4a2b', {y: -2.6})); b.position.set((i - 3) * 5.4, 9 + r() * 7, r() * 4); b.userData.ph = r() * 6; b.userData.by = b.position.y; g.add(b); } g.userData.bob = true; return g; },
  neon: (r, cols) => { const g = new THREE.Group(); for (let i = 0; i < 6; i++) { const h = 9 + r() * 9; g.add(box(2.6, h, 2.6, '#2a2438', {x: (i - 2.5) * 4.4, y: h / 2})); for (let k = 0; k < 4; k++) g.add(box(2.7, 0.24, 2.7, cols[(i + k) % cols.length], {x: (i - 2.5) * 4.4, y: 1.5 + k * (h / 4.2), edges: false, thick: 0.001}).clone()); const gl = glow(cols[i % cols.length], 7, 0.3); gl.position.set((i - 2.5) * 4.4, h * 0.7, 1.8); g.add(gl); } return g; },
};
const OUTDOOR_DEFAULT = ['tower', 'arch', 'pillars', 'crystals', 'windmill', 'pyramid', 'balloons', 'neon'];
export const LANDMARK_NAMES = Object.keys(LANDMARKS);

const INDOOR = {office: -5.28, lab: -5.28, workshop: -5.9, cave: -7.4, castle: -6.4};
const SKY_OPEN = new Set(['street_day', 'street_night', 'yard', 'desert', 'forest', 'harbor']);

// Returns {group, update} for one location.
export function stageFor(loc, ox, hy, hz, seedBase) {
  const r = rng(seedBase * 97 + loc.length * 13 + 7);
  const A = C('accent', '#ff4d8d'), B = C('accent2', '#ffd23f'), D = C('accent3', '#3fd0ff');
  const cols = [A, B, D, C('wall', '#7fd0e8')].map((c) => vivid(c, 0.3).getStyle());
  const group = new THREE.Group(); const spinners = []; const bobbers = [];
  group.add(rug(ox, hy, hz));

  if (INDOOR[loc] !== undefined) {
    const wz = INDOOR[loc] + 0.12;
    group.add(wallArt(ox, wz, 3.5, cols, r));
    group.add(bunting(ox, 5.0, hz + 1.2, 11, cols));
    group.add(bunting(ox, 5.5, hz - 2.4, 12, cols.slice().reverse()));
  } else if (SKY_OPEN.has(loc)) {
    const names = (WORLD.landmarks || []).filter((n) => LANDMARKS[n]); const pool = names.length ? names : OUTDOOR_DEFAULT;
    const count = 3 + Math.floor(r() * 2);
    for (let i = 0; i < count; i++) {
      const name = pool[(i + Math.floor(r() * pool.length)) % pool.length];
      const lm = LANDMARKS[name](r, cols);
      const side = i % 2 ? 1 : -1;
      lm.position.set(ox + side * (14 + r() * 22) + (i === 0 ? side * -10 : 0), loc === 'harbor' ? -0.3 : 0, hz - 26 - r() * 22);
      lm.rotation.y = (r() - 0.5) * 0.6; lm.scale.setScalar(1.1 + r() * 0.9);
      group.add(lm);
      if (lm.userData.spin) spinners.push(lm.userData.spin);
      if (lm.userData.bob) bobbers.push(lm);
    }
    group.add(bunting(ox, 5.2, hz + 1.6, 12, cols));
  }

  // floating colour orbs around the action (soft additive glows)
  const orbs = [];
  for (let i = 0; i < 9; i++) {
    const o = glow(cols[i % cols.length], 1.4 + r() * 1.6, 0.34);
    const bx = ox + (r() - 0.5) * 11, by = 0.8 + r() * 3.6, bz = hz - 3.8 + r() * 4.6;
    o.position.set(bx, by, bz); group.add(o); orbs.push({o, bx, by, bz, ph: r() * 6});
  }
  const update = (t) => {
    for (const s of spinners) s.rotation.z = t * 0.5;
    for (const b of bobbers) b.children.forEach((c) => { if (c.userData.ph !== undefined) c.position.y = c.userData.by + Math.sin(t * 0.9 + c.userData.ph) * 0.6; });
    for (const q of orbs) { q.o.position.set(q.bx + Math.sin(t * 0.5 + q.ph) * 0.5, q.by + Math.sin(t * 0.8 + q.ph * 1.3) * 0.35, q.bz); q.o.material.opacity = 0.26 + 0.12 * Math.sin(t * 1.7 + q.ph); }
  };
  return {group, update};
}

// make the colours of one object (a character, a hero prop) richer; shared materials are cloned once and cached
const punchCache = new Map();
export function punchMaterials(root, amount = 0.22) {
  if (!amount) return root;
  root.traverse((o) => {
    if (!o.isMesh || !o.material || Array.isArray(o.material) || !o.material.color || o.material.map) return;
    const m = o.material; let c = punchCache.get(m);
    if (!c) {
      c = m.clone(); const h = {}; c.color.getHSL(h);
      if (h.s > 0.1 && h.l > 0.2 && h.l < 0.93) c.color.copy(vivid(c.color, amount, 0.015));
      punchCache.set(m, c);
    }
    o.material = c;
  });
  return root;
}
