import * as THREE from 'three';
import {box, cyl, sign, toon, ink} from './kit.js';
import {glow} from './glow.js';

// Tiny set details the story picks for its world. Each one is {place, build(text) -> {g, update?}}.
//   place: floor (on the ground), wall (on the back wall), stool (on a little stool), high (a perch above the action)
const g0 = () => new THREE.Group();
const flatMat = (c, o = 1) => new THREE.MeshBasicMaterial({color: c, transparent: o < 1, opacity: o, depthWrite: o >= 1});
const ball = (r, color, {x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1} = {}) => {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), toon(color)); m.position.set(x, y, z); m.scale.set(sx, sy, sz); return ink(m, 0.025, false);
};
const disc = (r, color, o, sy = 1) => { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 18), flatMat(color, o)); m.rotation.x = -Math.PI / 2; m.scale.y = sy; return m; };
const R = (seed) => { let s = seed * 9301 + 49297; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; };

export const DETAILS = {
  coins: {place: 'floor', build() { const g = g0(); const r = R(3);
    for (let i = 0; i < 5; i++) g.add(cyl(0.09, 0.09, 0.025, '#f2c12e', {x: (r() - 0.5) * 0.7, y: 0.015, z: (r() - 0.5) * 0.5, seg: 14}));
    const t = cyl(0.09, 0.09, 0.025, '#ffd95a', {x: 0.1, y: 0.09, z: 0, seg: 14}); t.rotation.x = 1.2; g.add(t);
    const gl = glow('#ffd95a', 0.8, 0.4); gl.position.y = 0.12; g.add(gl); return {g}; }},
  papers: {place: 'floor', build() { const g = g0(); const r = R(5);
    for (let i = 0; i < 4; i++) { const p = box(0.34, 0.012, 0.44, '#f4efe0', {x: (r() - 0.5) * 0.5, y: 0.008 + i * 0.012, z: (r() - 0.5) * 0.4, thick: 0.004}); p.rotation.y = (r() - 0.5) * 1.6; g.add(p); } return {g}; }},
  footprints: {place: 'floor', build() { const g = g0();
    for (let i = 0; i < 6; i++) { const d = disc(0.08, '#000000', 0.28, 1.7); d.position.set((i % 2 ? 0.12 : -0.12), 0.012, -i * 0.42); d.rotation.z = (i % 2 ? 0.1 : -0.1); g.add(d); } return {g}; }},
  puddle: {place: 'floor', build() { const g = g0(); const d = disc(0.6, '#6fa8c4', 0.6, 0.7); d.position.y = 0.012; g.add(d); const d2 = disc(0.3, '#a9d2e6', 0.5, 0.7); d2.position.set(-0.1, 0.014, 0.05); g.add(d2); return {g}; }},
  hay: {place: 'floor', build() { const g = g0(); const r = R(7);
    for (let i = 0; i < 9; i++) { const b = box(0.04, 0.3, 0.04, '#d9b85a', {x: (r() - 0.5) * 0.6, y: 0.14, z: (r() - 0.5) * 0.4, thick: 0.004}); b.rotation.z = (r() - 0.5) * 1.1; g.add(b); } return {g}; }},
  peel: {place: 'floor', build() { const g = g0();
    for (let i = 0; i < 3; i++) { const b = box(0.24, 0.025, 0.08, '#f2d13a', {y: 0.02, thick: 0.006}); b.rotation.y = i * 2.1; g.add(b); } return {g}; }},
  boots: {place: 'floor', build() { const g = g0();
    const b1 = g0(); b1.add(box(0.2, 0.34, 0.16, '#6b4430', {y: 0.17}), box(0.28, 0.1, 0.18, '#4a3322', {x: 0.04, y: 0.05})); b1.position.x = -0.2; g.add(b1);
    const b2 = g0(); b2.add(box(0.2, 0.34, 0.16, '#6b4430', {y: 0.17}), box(0.28, 0.1, 0.18, '#4a3322', {x: 0.04, y: 0.05})); b2.rotation.z = Math.PI / 2; b2.position.set(0.25, 0.12, 0.05); g.add(b2); return {g}; }},
  bucket: {place: 'floor', build() { const g = g0(); g.add(cyl(0.2, 0.15, 0.36, '#8d9199', {y: 0.18, seg: 14}));
    const h = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.012, 6, 16, Math.PI), toon('#4a4f58')); h.position.y = 0.36; g.add(h); return {g}; }},
  broom: {place: 'floor', build() { const g = g0(); const s = g0(); s.add(cyl(0.02, 0.02, 1.3, '#8a5a3b', {y: 0.65}), box(0.2, 0.3, 0.1, '#d9b85a', {y: 0.12}));
    s.rotation.z = 0.22; s.position.x = -0.1; g.add(s); return {g}; }},
  bolts: {place: 'floor', build() { const g = g0(); const r = R(11);
    for (let i = 0; i < 7; i++) { const c = cyl(0.025, 0.025, 0.08, '#9aa0a8', {x: (r() - 0.5) * 0.7, y: 0.03, z: (r() - 0.5) * 0.5, seg: 6}); c.rotation.z = r() * 3; g.add(c); } return {g}; }},
  mouse: {place: 'floor', build() { const g = g0(); const m = g0(); m.add(ball(0.09, '#9a9a9f', {y: 0.07, sx: 1.2, sz: 0.8}), ball(0.045, '#9a9a9f', {x: 0.12, y: 0.07}),
      ball(0.03, '#e9a9b0', {x: 0.12, y: 0.13, z: 0.04}), ball(0.03, '#e9a9b0', {x: 0.12, y: 0.13, z: -0.04}), cyl(0.008, 0.004, 0.22, '#c9a0a6', {x: -0.2, y: 0.05}));
    m.children[m.children.length - 1].rotation.z = 1.4; g.add(m);
    return {g, update: (t) => { const p = Math.sin(t * 0.7); m.position.x = p * 1.3; m.rotation.y = Math.cos(t * 0.7) > 0 ? 0 : Math.PI; m.position.y = Math.abs(Math.sin(t * 16)) * 0.012; }}; }},
  cobweb: {place: 'wall', build() { const g = g0(); const w = flatMat('#ffffff', 0.55);
    for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.PlaneGeometry(0.012, 0.6), w); b.position.set(Math.sin(i * 0.3) * 0.3, -Math.cos(i * 0.3) * 0.3, 0); b.rotation.z = i * 0.3 + 0.1; g.add(b); }
    for (const r of [0.18, 0.34, 0.5]) { const m = new THREE.Mesh(new THREE.RingGeometry(r - 0.006, r, 12, 1, 0, 1.6), w); m.rotation.z = -1.58; g.add(m); } return {g}; }},
  poster: {place: 'wall', build(text) { const g = g0(); const s = sign(String(text || 'WANTED').toUpperCase().slice(0, 12), 0.95, 1.25, {bg: '#e8d8a8', w: 320, h: 420, font: 'bold 64px Arial'}); g.add(s);
    g.add(cyl(0.02, 0.02, 0.03, '#3a2e2a', {y: 0.6, z: 0.03, seg: 6})); return {g}; }},
  note: {place: 'wall', build(text) { const g = g0(); const s = sign(String(text || 'HELP').toUpperCase().slice(0, 10), 0.5, 0.5, {bg: '#f6e58d', w: 256, h: 256, font: 'bold 60px Arial'}); s.rotation.z = -0.07; g.add(s); return {g}; }},
  calendar: {place: 'wall', build(text) { const g = g0(); g.add(sign(String(text || 'MAY').toUpperCase().slice(0, 8), 0.6, 0.78, {bg: '#fbf7ee', w: 256, h: 320, font: 'bold 70px Arial'}));
    g.add(box(0.6, 0.16, 0.02, '#c8372d', {y: 0.31, z: 0.012, thick: 0.004})); return {g}; }},
  frame: {place: 'wall', build() { const g = g0(); g.add(box(0.8, 1.0, 0.06, '#6b4430', {thick: 0.01})); g.add(sign('', 0.6, 0.8, {bg: '#9fc4d8'})); g.children[1].position.z = 0.04; return {g}; }},
  wall_clock: {place: 'wall', build() { const g = g0(); const f = cyl(0.3, 0.3, 0.06, '#f7f0de', {seg: 24}); f.rotation.x = Math.PI / 2; g.add(f);
    const mh = g0(), hh = g0(); mh.add(box(0.025, 0.24, 0.02, '#2a2a2a', {y: 0.1, z: 0.05, thick: 0.004})); hh.add(box(0.03, 0.16, 0.02, '#2a2a2a', {y: 0.07, z: 0.052, thick: 0.004})); g.add(mh, hh); return {g, update: (t) => { mh.rotation.z = -t * 0.9; hh.rotation.z = -t * 0.075; }}; }},
  teacup: {place: 'stool', build() { const g = g0(); g.add(cyl(0.07, 0.05, 0.08, '#fbf7ee', {y: 0.04, seg: 12}));
    const puffs = [0, 1, 2].map((i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), flatMat('#ffffff', 0.5)); g.add(m); return m; });
    return {g, update: (t) => puffs.forEach((p, i) => { const k = ((t * 0.5 + i / 3) % 1); p.position.set(Math.sin(t * 2 + i) * 0.03, 0.1 + k * 0.45, 0); p.scale.setScalar(0.6 + k * 1.4); p.material.opacity = 0.5 * (1 - k); })}; }},
  candle: {place: 'floor', build() { const g = g0(); g.add(cyl(0.045, 0.05, 0.26, '#f4efe0', {y: 0.13, seg: 10}));
    const fl = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.1, 8), flatMat('#ffb23a')); fl.position.y = 0.31; g.add(fl);
    const gl = glow('#ffb55a', 1.0, 0.6); gl.position.y = 0.32; g.add(gl);
    return {g, update: (t) => { fl.scale.set(1 + 0.15 * Math.sin(t * 17), 1 + 0.25 * Math.sin(t * 13 + 1), 1); gl.material.opacity = 0.5 + 0.15 * Math.sin(t * 9); }}; }},
  plant: {place: 'floor', build() { const g = g0(); g.add(cyl(0.14, 0.1, 0.22, '#b5654a', {y: 0.11, seg: 12})); const leaves = [];
    for (let i = 0; i < 6; i++) { const l = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.4, 6), toon(i % 2 ? '#4f9a4e' : '#5fae5a')); l.position.set(0, 0.4, 0); l.geometry.translate(0, 0.2, 0); l.rotation.z = (i - 2.5) * 0.28; l.rotation.y = i; g.add(ink(l, 0.02, false)); leaves.push(l); }
    return {g, update: (t) => leaves.forEach((l, i) => { l.rotation.x = Math.sin(t * 1.3 + i) * 0.05; })}; }},
  bird: {place: 'high', build() { const g = g0(); g.add(box(1.0, 0.06, 0.1, '#6b4430', {y: -0.03, thick: 0.01}));
    const b = g0(); b.add(ball(0.11, '#4a6fa5', {y: 0.12, sx: 1.2}));
    const head = g0(); head.add(ball(0.07, '#4a6fa5', {x: 0.12, y: 0.22}), new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.07, 6), toon('#f2c12e'))); head.children[1].position.set(0.2, 0.22, 0); head.children[1].rotation.z = -Math.PI / 2;
    b.add(head); b.add(ball(0.06, '#34507d', {x: -0.17, y: 0.1, sx: 1.6, sy: 0.5})); g.add(b);
    return {g, update: (t) => { head.rotation.z = Math.sin(t * 3) * 0.2 * (Math.sin(t * 0.8) > 0.4 ? 1 : 0.2); head.position.y = Math.abs(Math.sin(t * 6)) * 0.01; }}; }},
  moth: {place: 'high', build() { const g = g0(); const lamp = glow('#fff2c0', 0.9, 0.55); g.add(lamp);
    const m = g0(); const w1 = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.07), flatMat('#e9e2cf')), w2 = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.07), flatMat('#e9e2cf'));
    w1.position.x = -0.05; w2.position.x = 0.05; m.add(w1, w2); g.add(m);
    return {g, update: (t) => { m.position.set(Math.cos(t * 2.2) * 0.4, Math.sin(t * 3.1) * 0.25, Math.sin(t * 2.2) * 0.2); w1.scale.x = w2.scale.x = Math.abs(Math.sin(t * 28)) + 0.25; lamp.material.opacity = 0.5 + 0.08 * Math.sin(t * 4); }}; }},
  spider: {place: 'high', build() { const g = g0(); g.add(cyl(0.004, 0.004, 1.2, '#dddddd', {y: 0.6})); const s = g0(); s.add(ball(0.05, '#1c1a1b'));
    for (let i = 0; i < 4; i++) for (const sd of [-1, 1]) { const l = cyl(0.006, 0.006, 0.12, '#1c1a1b', {x: sd * 0.07, y: (i - 1.5) * 0.02, seg: 4}); l.rotation.z = sd * 1.0; s.add(l); }
    g.add(s); return {g, update: (t) => { s.position.y = Math.sin(t * 1.6) * 0.18; }}; }},
};
export const DETAIL_NAMES = Object.keys(DETAILS);
export const makeDetail = (name, text) => { const D = DETAILS[name]; if (!D) return null; return {place: D.place, ...D.build(text)}; };
