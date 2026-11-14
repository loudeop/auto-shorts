import * as THREE from 'three';
import {box, cyl, sign, toon, ink} from './kit.js';

// Hero props for close-ups. Each is about 0.8-1.0 m tall, origin at the bottom centre.
const g = () => new THREE.Group();
const ball = (r, color, {x = 0, y = 0, z = 0, sy = 1, flat = false} = {}) => {
  const m = new THREE.Mesh(flat ? new THREE.IcosahedronGeometry(r, 0) : new THREE.SphereGeometry(r, 18, 12), toon(color));
  m.position.set(x, y, z); m.scale.y = sy; return ink(m, 0.03, false);
};
const rot = (m, x = 0, y = 0, z = 0) => { m.rotation.set(x, y, z); return m; };

export const OBJECTS = {
  gold() { const o = g(); [[0, .12, 0, .22], [.28, .1, .05, .17], [-.26, .1, .1, .18], [.1, .3, -.05, .16], [-.08, .28, .08, .14], [.0, .1, .3, .15], [.22, .08, -.25, .14]]
    .forEach(([x, y, z, r], i) => o.add(ball(r, i % 2 ? '#f2c12e' : '#ffd95a', {x, y, z, flat: true}))); return o; },
  dynamite() { const o = g(); [-0.13, 0, 0.13].forEach((x, i) => o.add(cyl(0.065, 0.065, 0.62, '#c8372d', {x, y: 0.31 + i * 0.01})));
    o.add(cyl(0.2, 0.2, 0.07, '#e9e2cf', {y: 0.34, seg: 12})); o.add(cyl(0.012, 0.012, 0.3, '#2a2a2a', {y: 0.78, x: 0.02}));
    o.add(ball(0.045, '#ff8a2b', {y: 0.95, x: 0.02})); return o; },
  bottle() { const o = g(); o.add(cyl(0.17, 0.17, 0.5, '#3f8f5a', {y: 0.25})); o.add(cyl(0.06, 0.15, 0.2, '#3f8f5a', {y: 0.6}));
    o.add(cyl(0.055, 0.055, 0.22, '#3f8f5a', {y: 0.8})); o.add(cyl(0.06, 0.06, 0.07, '#b98a52', {y: 0.94})); o.add(box(0.2, 0.2, 0.01, '#f2e6cc', {y: 0.25, z: 0.17, thick: 0.01})); return o; },
  key() { const o = g(); const ring = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.045, 10, 20), toon('#f2c12e')); ring.position.y = 0.78; o.add(ink(ring, 0.02, false));
    o.add(box(0.07, 0.6, 0.05, '#f2c12e', {y: 0.4})); o.add(box(0.2, 0.06, 0.05, '#f2c12e', {x: 0.1, y: 0.12})); o.add(box(0.14, 0.06, 0.05, '#f2c12e', {x: 0.07, y: 0.24})); return o; },
  coin() { const o = g(); const c = cyl(0.4, 0.4, 0.07, '#f2c12e', {y: 0.45, seg: 28}); rot(c, Math.PI / 2); o.add(c);
    const s = sign('$', 0.4, 0.4, {bg: '#f7d96a', w: 128, h: 128, font: 'bold 100px Arial'}); s.position.set(0, 0.45, 0.05); o.add(s); return o; },
  bulb() { const o = g(); o.add(ball(0.26, '#fff2a8', {y: 0.6, sy: 1.1})); o.add(cyl(0.12, 0.1, 0.18, '#8d9199', {y: 0.3})); o.add(cyl(0.1, 0.1, 0.08, '#6a6e75', {y: 0.17})); return o; },
  rocket() { const o = g(); o.add(cyl(0.18, 0.18, 0.7, '#f4f1ea', {y: 0.55})); o.add(cyl(0.01, 0.18, 0.3, '#c8372d', {y: 1.05}));
    o.add(box(0.5, 0.25, 0.04, '#c8372d', {y: 0.3})); o.add(box(0.04, 0.25, 0.5, '#c8372d', {y: 0.3})); o.add(ball(0.07, '#6fb6e8', {y: 0.7, z: 0.17})); o.add(cyl(0.12, 0.08, 0.1, '#6a6e75', {y: 0.15})); return o; },
  book() { const o = g(); o.add(box(0.7, 0.12, 0.5, '#9b3d32', {y: 0.07})); o.add(box(0.64, 0.08, 0.45, '#f2e6cc', {y: 0.07, x: 0.02, thick: 0.01}));
    o.add(box(0.7, 0.1, 0.5, '#9b3d32', {y: 0.17})); const s = sign('BOOK', 0.5, 0.2, {bg: '#e8c76a', w: 256, h: 100, font: 'bold 60px Arial'}); rot(s, -Math.PI / 2); s.position.set(0, 0.23, 0); o.add(s); return o; },
  map() { const o = g(); const s = sign('X', 0.9, 0.65, {bg: '#e8d8a8', w: 384, h: 280, font: 'bold 150px Arial'}); s.position.set(0, 0.5, 0); rot(s, -0.15, 0, 0.05); o.add(s); o.add(cyl(0.02, 0.02, 0.5, '#6b4430', {y: 0.25})); return o; },
  flask() { const o = g(); o.add(cyl(0.07, 0.3, 0.5, '#9fd7e8', {y: 0.3})); o.add(cyl(0.07, 0.07, 0.3, '#9fd7e8', {y: 0.7})); o.add(cyl(0.2, 0.28, 0.14, '#6dd16a', {y: 0.09})); return o; },
  gear() { const o = g(); const c = cyl(0.3, 0.3, 0.12, '#8d9199', {y: 0.5, seg: 24}); rot(c, Math.PI / 2); o.add(c);
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; const t = box(0.12, 0.14, 0.12, '#8d9199', {x: Math.cos(a) * 0.36, y: 0.5 + Math.sin(a) * 0.36, thick: 0.02}); t.rotation.z = a; o.add(t); }
    const h = cyl(0.1, 0.1, 0.14, '#4a4f58', {y: 0.5, seg: 12}); rot(h, Math.PI / 2); o.add(h); return o; },
  bomb() { const o = g(); o.add(ball(0.32, '#2a2a30', {y: 0.34})); o.add(cyl(0.07, 0.07, 0.1, '#4a4f58', {y: 0.68})); o.add(cyl(0.012, 0.012, 0.25, '#b98a52', {y: 0.82, x: 0.05})); o.add(ball(0.05, '#ff8a2b', {y: 0.96, x: 0.05})); return o; },
  trophy() { const o = g(); o.add(cyl(0.3, 0.12, 0.4, '#f2c12e', {y: 0.7})); o.add(cyl(0.05, 0.05, 0.3, '#f2c12e', {y: 0.38})); o.add(box(0.4, 0.14, 0.4, '#6b4430', {y: 0.07})); return o; },
  egg() { const o = g(); o.add(ball(0.3, '#f6efe0', {y: 0.4, sy: 1.3})); return o; },
  clock() { const o = g(); const c = cyl(0.4, 0.4, 0.1, '#f7f0de', {y: 0.55, seg: 28}); rot(c, Math.PI / 2); o.add(c);
    const hand = (len, a) => { const h = box(0.03, len, 0.03, '#351f22', {y: 0.55 + Math.cos(a) * len / 2, x: Math.sin(a) * len / 2, z: 0.07, thick: 0.01}); h.rotation.z = -a; return h; };
    o.add(hand(0.28, 0.6), hand(0.2, 3.4)); o.add(cyl(0.02, 0.02, 0.05, '#c8372d', {y: 0.15, x: 0.2, z: 0})); return o; },
  hammer() { const o = g(); o.add(box(0.09, 0.9, 0.09, '#8a5a3b', {y: 0.45})); o.add(box(0.4, 0.2, 0.2, '#6a6e75', {y: 0.9})); return o; },
  pickaxe() { const o = g(); o.add(box(0.08, 1.0, 0.08, '#8a5a3b', {y: 0.5})); o.add(box(0.7, 0.09, 0.09, '#6a6e75', {y: 0.98})); o.add(box(0.2, 0.09, 0.09, '#6a6e75', {y: 1.05, x: 0.38, ry: 0})); return o; },
  lantern() { const o = g(); o.add(cyl(0.2, 0.2, 0.05, '#2a2a2a', {y: 0.03})); o.add(cyl(0.16, 0.16, 0.45, '#ffd37a', {y: 0.28})); o.add(cyl(0.12, 0.2, 0.08, '#2a2a2a', {y: 0.55}));
    const h = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.015, 8, 16, Math.PI), toon('#2a2a2a')); h.position.y = 0.6; o.add(h); return o; },
  chest() { const o = g(); o.add(box(0.9, 0.45, 0.55, '#8a5a3b', {y: 0.23})); const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.9, 16, 1, false, 0, Math.PI), toon('#9b6a45'));
    lid.rotation.z = Math.PI / 2; lid.rotation.y = Math.PI / 2; lid.position.y = 0.45; o.add(ink(lid, 0.03, false)); o.add(box(0.12, 0.16, 0.06, '#f2c12e', {y: 0.42, z: 0.3})); o.add(box(0.92, 0.06, 0.57, '#4a4f58', {y: 0.38, thick: 0.01})); return o; },
  scroll() { const o = g(); const c = cyl(0.14, 0.14, 0.8, '#efe3c0', {y: 0.3}); rot(c, 0, 0, Math.PI / 2); o.add(c); o.add(cyl(0.16, 0.16, 0.05, '#8a5a3b', {x: 0.42, y: 0.3, seg: 12}).rotateZ(Math.PI / 2)); o.add(cyl(0.16, 0.16, 0.05, '#8a5a3b', {x: -0.42, y: 0.3, seg: 12}).rotateZ(Math.PI / 2)); return o; },
  magnet() { const o = g(); o.add(box(0.14, 0.6, 0.14, '#c8372d', {x: -0.24, y: 0.4})); o.add(box(0.14, 0.6, 0.14, '#c8372d', {x: 0.24, y: 0.4})); o.add(box(0.62, 0.14, 0.14, '#c8372d', {y: 0.77}));
    o.add(box(0.14, 0.14, 0.15, '#cfd3d8', {x: -0.24, y: 0.14})); o.add(box(0.14, 0.14, 0.15, '#cfd3d8', {x: 0.24, y: 0.14})); return o; },
  battery() { const o = g(); o.add(cyl(0.2, 0.2, 0.8, '#3f9a5a', {y: 0.4})); o.add(cyl(0.08, 0.08, 0.1, '#cfd3d8', {y: 0.85})); o.add(cyl(0.2, 0.2, 0.2, '#f2c12e', {y: 0.1}));
    const s = sign('+', 0.25, 0.25, {bg: '#3f9a5a', w: 96, h: 96, font: 'bold 80px Arial'}); s.position.set(0, 0.55, 0.21); o.add(s); return o; },
  crate() { const o = g(); o.add(box(0.8, 0.8, 0.8, '#b98a52', {y: 0.4})); o.add(box(0.84, 0.1, 0.84, '#8a5a3b', {y: 0.1, thick: 0.01})); o.add(box(0.84, 0.1, 0.84, '#8a5a3b', {y: 0.7, thick: 0.01})); return o; },
};
export const OBJECT_NAMES = Object.keys(OBJECTS);
export const makeObject = (name) => (OBJECTS[name] || OBJECTS.crate)();
