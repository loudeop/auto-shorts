import * as THREE from 'three';
import {box, cyl, ground, cloud, facade, crate, paintTex, toon, ink, rng} from './kit.js';
import * as P from './props.js';

// Extra story worlds built from the same toon kit. Each returns a Group centred on x = ox.
// Heroes stand near z = hz (see KIND in camera.js); cameras work between z = hz+2 and hz+5.
const wall = (ox, x, y, z, w, h, d, color, seed) => box(w, h, d, color, {x: ox + x, y, z, map: paintTex(color, {seed, stains: 18, chips: 24, scratches: 14}), thick: 0.03});
const rock = (x, y, z, s, color, seed = 1) => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), toon(color)); m.position.set(x, y, z); m.scale.set(1.2, 0.8, 1); m.rotation.set(seed, seed * 2, 0); return ink(m, 0.04, false); };
const lampHang = (x, y, z) => { const o = new THREE.Group(); o.add(cyl(0.01, 0.01, 0.8, '#2a2a2a', {y: 0.4}), cyl(0.12, 0.12, 0.3, '#ffd37a', {y: 0}), cyl(0.1, 0.16, 0.08, '#2a2a2a', {y: 0.18})); o.position.set(x, y, z); return o; };

export function cave(ox) {
  const W = new THREE.Group(); const r = rng(5);
  W.add(ground(34, 30, '#8a6a45', {x: ox, z: -2, seed: 31, repeat: 5}));
  W.add(wall(ox, 0, 3.4, -8, 18, 7.2, 1, '#7a5a3a', 32), wall(ox, -8.5, 3.4, -1, 1, 7.2, 18, '#80603e', 33), wall(ox, 8.5, 3.4, -1, 1, 7.2, 18, '#80603e', 34), wall(ox, 0, 7.2, -1, 18, 1, 18, '#5a4630', 35));
  for (let i = 0; i < 14; i++) W.add(rock(ox + (r() - 0.5) * 16, 0.2 + r() * 0.2, -7 + r() * 5, 0.3 + r() * 0.5, ['#7a5a3a', '#8e6b45', '#6a4e32'][i % 3], i + 1));
  for (const z of [-5, -1.5, 2.5]) {
    W.add(box(0.4, 6.4, 0.4, '#8a5a2b', {x: ox - 5, y: 3.2, z}), box(0.4, 6.4, 0.4, '#8a5a2b', {x: ox + 5, y: 3.2, z}), box(10.8, 0.4, 0.45, '#8a5a2b', {x: ox, y: 6.4, z}));
    W.add(lampHang(ox - 4.4, 5.2, z + 0.5), lampHang(ox + 4.4, 5.2, z + 0.5));
  }
  for (const x of [-1.4, 1.4]) W.add(box(0.16, 0.12, 26, '#5a5a60', {x: ox + x, y: 0.06, z: -1, thick: 0.01}));
  for (let i = 0; i < 12; i++) W.add(box(3.2, 0.1, 0.4, '#6b4430', {x: ox, y: 0.03, z: -9 + i * 1.8, thick: 0.01}));
  const cart = new THREE.Group(); cart.add(box(1.6, 0.9, 1.2, '#b0452e', {y: 0.75}), cyl(0.28, 0.28, 0.1, '#2a2a2a', {x: -0.6, y: 0.28, z: 0.62}).rotateX(Math.PI / 2), cyl(0.28, 0.28, 0.1, '#2a2a2a', {x: 0.6, y: 0.28, z: 0.62}).rotateX(Math.PI / 2));
  for (let i = 0; i < 6; i++) cart.add(rock((r() - 0.5) * 1.1, 1.25, (r() - 0.5) * 0.8, 0.22, '#f2c12e', i));
  cart.position.set(ox + 3.8, 0, -4.2); W.add(cart);
  W.add(P.barrel('#8a5a2b').translateX(ox - 4).translateZ(-3.5), P.ladder(3.2).translateX(ox - 6.2).translateZ(-6.4));
  return W;
}

export function desert(ox) {
  const W = new THREE.Group(); const r = rng(9);
  W.add(ground(120, 90, '#e0b878', {x: ox, z: -10, seed: 41, repeat: 10}));
  for (let i = 0; i < 6; i++) { const s = 6 + r() * 6; const m = box(s * 1.6, s * 2.2, s * 1.4, '#c1693a', {x: ox - 30 + i * 12 + r() * 6, y: s * 1.1, z: -30 - r() * 14, map: paintTex('#c1693a', {seed: 50 + i, stains: 30}), thick: 0.08}); W.add(m); }
  for (let i = 0; i < 9; i++) { const c = new THREE.Group(); const x = ox + (r() - 0.5) * 24, z = -6 - r() * 14, h = 1.4 + r() * 1.6;
    c.add(cyl(0.22, 0.26, h, '#5a9a4a', {y: h / 2}), cyl(0.14, 0.14, 0.7, '#5a9a4a', {x: 0.4, y: h * 0.6}), cyl(0.14, 0.14, 0.7, '#5a9a4a', {x: -0.4, y: h * 0.45}));
    c.position.set(x, 0, z); W.add(c); }
  for (let i = 0; i < 14; i++) W.add(rock(ox + (r() - 0.5) * 26, 0.25, -4 - r() * 16, 0.3 + r() * 0.6, ['#b48a5a', '#a07850', '#c49a68'][i % 3], i));
  W.add(box(0.2, 2.2, 0.2, '#6b4430', {x: ox - 3.4, y: 1.1, z: -3}), box(1.6, 0.6, 0.12, '#b98a52', {x: ox - 3.4, y: 2.0, z: -2.9}));
  W.add(cloud(ox - 30, 50, -90, 3), cloud(ox + 20, 58, -100, 4));
  return W;
}

export function forest(ox) {
  const W = new THREE.Group(); const r = rng(13);
  W.add(ground(90, 70, '#5f8f45', {x: ox, z: -10, seed: 61, repeat: 8}));
  const path = box(3.6, 0.04, 60, '#b99a6b', {x: ox, y: 0.01, z: -10, thick: 0.005}); W.add(path);
  for (let i = 0; i < 26; i++) { const side = i % 2 ? 1 : -1; W.add(P.tree(1.3 + r() * 1.1, i + 3).translateX(ox + side * (3.6 + r() * 14)).translateZ(-r() * 26 + 2)); }
  for (let i = 0; i < 10; i++) W.add(rock(ox + (r() - 0.5) * 20, 0.2, -2 - r() * 14, 0.25 + r() * 0.4, '#8a8f8a', i));
  const log = cyl(0.32, 0.32, 3, '#6b4430', {x: ox + 3.4, y: 0.3, z: -2.5}); log.rotation.z = Math.PI / 2; log.rotation.y = 0.4; W.add(log);
  for (let i = 0; i < 6; i++) { const m = new THREE.Group(); m.add(cyl(0.05, 0.06, 0.25, '#f2e6cc', {y: 0.12}), cyl(0.02, 0.22, 0.14, '#c8372d', {y: 0.3})); m.position.set(ox + (r() - 0.5) * 8, 0, -1 - r() * 5); W.add(m); }
  W.add(cloud(ox - 30, 55, -90, 3, '#f1ece0'), cloud(ox + 25, 60, -100, 4, '#f1ece0'));
  return W;
}

export function harbor(ox) {
  const W = new THREE.Group(); const r = rng(17);
  const sea = new THREE.Mesh(new THREE.BoxGeometry(160, 0.4, 120), toon('#3f86b5')); sea.position.set(ox, -0.7, -10); W.add(sea);
  for (let i = 0; i < 14; i++) W.add(box(20, 0.12, 0.34, '#8f6a45', {x: ox, y: 0.0, z: -6.4 + i * 0.52, thick: 0.01}));
  W.add(box(20, 0.2, 7.4, '#7a5a3a', {x: ox, y: -0.16, z: -2.7, thick: 0.01}));
  for (let i = 0; i < 6; i++) W.add(cyl(0.16, 0.16, 1.6, '#4a3a2a', {x: ox - 9 + i * 3.6, y: 0.4, z: 1.0}));
  for (let i = 0; i < 4; i++) W.add(P.barrel(['#2f6db3', '#c43d32', '#2f6db3', '#d9a441'][i]).translateX(ox - 8 + i * 1.1).translateZ(-5.6));
  W.add(crate('FISH', {x: ox + 6.4, y: 0.6, z: -5.2}), crate('SALT', {x: ox + 7.6, y: 0.6, z: -5.4, ry: 0.3}), crate('RUM', {x: ox + 7.0, y: 1.8, z: -5.3, ry: -0.2}));
  W.add(facade({w: 16, h: 6, color: '#8f7a68', cols: 4, rows: 1, door: true, seed: 91}).translateX(ox - 3).translateZ(-9.5));
  const lh = new THREE.Group(); for (let i = 0; i < 4; i++) lh.add(cyl(1.2 - i * 0.12, 1.3 - i * 0.12, 2.2, i % 2 ? '#c8372d' : '#f4f1ea', {y: 1.1 + i * 2.2}));
  lh.add(box(1.4, 1.0, 1.4, '#ffe7a0', {y: 9.2}), cyl(0.01, 1.2, 0.8, '#c8372d', {y: 10.1}));
  lh.position.set(ox + 24, -0.3, -16); W.add(lh);
  const boat = new THREE.Group(); boat.add(box(5.0, 0.9, 1.7, '#a8433a', {y: 0.0}), box(1.4, 1.0, 1.2, '#e9e2cf', {y: 0.9, x: -0.6}), cyl(0.06, 0.06, 4.0, '#6b4430', {y: 2.0, x: 1.2}));
  boat.position.set(ox - 10, -0.4, 6.5); boat.rotation.y = 0.35; W.add(boat);
  for (let i = 0; i < 5; i++) W.add(cloud(ox - 60 + i * 28, 55 + (i % 2) * 10, -110, 4));
  return W;
}

export function castle(ox) {
  const W = new THREE.Group(); const r = rng(21);
  W.add(ground(30, 26, '#9a948a', {x: ox, z: -1, seed: 71, repeat: 5}));
  W.add(wall(ox, 0, 4, -7, 18, 8.4, 1, '#8d8880', 72), wall(ox, -8.5, 4, -1, 1, 8.4, 16, '#948f86', 73), wall(ox, 8.5, 4, -1, 1, 8.4, 16, '#948f86', 74), wall(ox, 0, 8.4, -1, 18, 1, 16, '#5a5650', 75));
  for (const z of [-5, -1, 3]) W.add(box(17, 0.5, 0.6, '#5a3d28', {x: ox, y: 8.0, z}));
  for (const x of [-6, -2, 2, 6]) { const f = P.flag(['#c43d32', '#2f5d9e', '#d9a441', '#3f7a45'][(x + 6) / 4], 1); f.position.set(ox + x, 2.3, -6.4); f.rotation.y = 0; W.add(f); }
  for (const x of [-7.5, 7.5]) for (const z of [-5, 1]) { const t = new THREE.Group(); t.add(cyl(0.05, 0.05, 0.9, '#4a3a2a', {y: 0.45}), cyl(0.0, 0.14, 0.34, '#ff8a2b', {y: 1.0})); t.position.set(ox + x, 2.8, z); W.add(t); }
  const table = new THREE.Group(); table.add(box(5.2, 0.14, 1.4, '#6b4430', {y: 0.95}), box(0.2, 0.9, 1.2, '#4a3a2a', {x: -2.2, y: 0.45}), box(0.2, 0.9, 1.2, '#4a3a2a', {x: 2.2, y: 0.45}));
  for (let i = 0; i < 4; i++) table.add(cyl(0.05, 0.05, 0.3, '#f4f1ea', {x: -1.8 + i * 1.2, y: 1.2}), cyl(0.0, 0.03, 0.08, '#ff8a2b', {x: -1.8 + i * 1.2, y: 1.4}));
  table.position.set(ox - 3.4, 0, 2.0); W.add(table);
  const throne = new THREE.Group(); throne.add(box(1.0, 0.5, 1.0, '#7a2a30', {y: 0.25}), box(1.0, 2.2, 0.2, '#7a2a30', {y: 1.2, z: -0.45}), box(1.2, 0.18, 1.2, '#f2c12e', {y: 0.02, thick: 0.01}));
  throne.position.set(ox + 4.8, 0, -4.6); W.add(throne);
  for (const x of [-4, 4]) { const w = box(1.1, 2.4, 0.1, '#6fb6e8', {x: ox + x, y: 4.6, z: -6.45, thick: 0.02}); W.add(w); }
  return W;
}
