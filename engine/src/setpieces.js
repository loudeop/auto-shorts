import * as THREE from 'three';
import {box, cyl, sign, crate, toon, ink} from './kit.js';
import * as P from './props.js';
import {glow} from './glow.js';

// Large scenery pieces the "set designer" (an LLM via OpenRouter, or a seeded random fallback) places in each location so that
// the same place looks different in every story. c = palette {trim, accent, wood, sky}; text is optional (signboard).
const g0 = () => new THREE.Group();
const rockMesh = (r, color, x, y, z, k) => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), toon(color)); m.position.set(x, y, z); m.scale.set(1.2, 0.85, 1); m.rotation.set(k, k * 2, 0); return ink(m, 0.04, false); };
const cone = (r, h, color, seg = 7, o = {}) => { const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), toon(color)); m.position.set(o.x || 0, (o.y || 0) + h / 2, o.z || 0); return ink(m, 0.035, true, 50); };

export const PIECES = {
  column(c) { const g = g0(); g.add(box(1.0, 0.35, 1.0, c.trim, {y: 0.18}), cyl(0.38, 0.42, 4.4, c.trim, {y: 2.55, seg: 14}), box(1.1, 0.3, 1.1, c.trim, {y: 4.9})); return {g}; },
  arch(c) { const g = g0(); g.add(box(0.6, 4.2, 0.6, c.trim, {x: -1.4, y: 2.1}), box(0.6, 4.2, 0.6, c.trim, {x: 1.4, y: 2.1}), box(3.6, 0.6, 0.7, c.trim, {y: 4.5}), box(0.5, 0.5, 0.75, c.accent, {y: 4.1})); return {g}; },
  big_window(c) { const g = g0(); g.add(box(2.2, 3.0, 0.2, c.trim, {y: 2.6})); const p = sign('', 1.8, 2.6, {bg: c.sky}); p.position.set(0, 2.6, 0.12); g.add(p, box(0.08, 2.6, 0.05, c.trim, {y: 2.6, z: 0.14}), box(1.8, 0.08, 0.05, c.trim, {y: 2.6, z: 0.14})); return {g}; },
  shelf(c) { const g = g0(); g.add(box(0.12, 3.2, 0.7, c.wood, {x: -1.1, y: 1.6}), box(0.12, 3.2, 0.7, c.wood, {x: 1.1, y: 1.6}));
    [0.5, 1.5, 2.5].forEach((y, i) => { g.add(box(2.3, 0.1, 0.7, c.wood, {y})); for (let k = 0; k < 4; k++) g.add(box(0.3, 0.3 + (k % 2) * 0.15, 0.3, [c.accent, '#e9e2cf', '#8d9199', '#c8372d'][(i + k) % 4], {x: -0.8 + k * 0.5, y: y + 0.25, thick: 0.01})); }); return {g}; },
  beam_frame(c) { const g = g0(); g.add(box(0.4, 4.4, 0.4, c.wood, {x: -2.0, y: 2.2}), box(0.4, 4.4, 0.4, c.wood, {x: 2.0, y: 2.2}), box(4.8, 0.45, 0.5, c.wood, {y: 4.4}));
    for (const s of [-1, 1]) { const b = box(0.25, 1.5, 0.25, c.wood, {x: s * 1.5, y: 3.8}); b.rotation.z = s * 0.8; g.add(b); } return {g}; },
  banner(c) { const g = g0(); g.add(cyl(0.05, 0.05, 4.4, c.trim, {y: 2.2, seg: 8}), box(1.2, 2.6, 0.06, c.accent, {x: 0.65, y: 3.0, thick: 0.015}), box(1.2, 0.28, 0.07, c.trim, {x: 0.65, y: 3.9})); return {g, update: (t) => { g.children[1].rotation.y = Math.sin(t * 1.3) * 0.06; }}; },
  barrel_stack(c) { const g = g0(); const a = P.barrel(c.accent), b = P.barrel(c.wood), d = P.barrel(c.accent); a.position.x = -0.55; b.position.x = 0.55; d.position.set(0, 0.95, 0); g.add(a, b, d); return {g}; },
  crate_stack(c) { const g = g0(); g.add(crate('', {x: -0.65, y: 0.6, z: 0}), crate('', {x: 0.65, y: 0.6, z: 0.1, ry: 0.15}), crate('', {x: 0, y: 1.8, z: 0.05, ry: -0.2})); return {g}; },
  hay_bales(c) { const g = g0(); const col = '#d9b85a'; g.add(box(1.3, 0.8, 0.9, col, {x: -0.7, y: 0.4}), box(1.3, 0.8, 0.9, col, {x: 0.7, y: 0.4}), box(1.3, 0.8, 0.9, col, {y: 1.2, ry: 0.1})); return {g}; },
  fence(c) { const g = g0(); for (let i = 0; i < 5; i++) g.add(box(0.18, 1.5, 0.18, c.wood, {x: -2 + i, y: 0.75})); g.add(box(4.4, 0.14, 0.1, c.wood, {y: 1.2, z: 0.1}), box(4.4, 0.14, 0.1, c.wood, {y: 0.6, z: 0.1})); return {g}; },
  rock_cluster(c) { const g = g0(); [[0, 0.7, 0, 1.2], [1.3, 0.5, 0.4, 0.8], [-1.2, 0.45, 0.3, 0.7], [0.3, 0.4, 1.1, 0.6]].forEach(([x, y, z, r], i) => g.add(rockMesh(r, ['#8a8f8a', '#7a7f7a', '#9a9f9a', '#6f746f'][i], x, y, z, i + 1))); return {g}; },
  tree_big(c) { const g = g0(); g.add(P.tree(2.8, 7)); return {g}; },
  tent(c) { const g = g0(); g.add(cone(1.8, 2.6, c.accent, 4)); const door = box(0.7, 1.3, 0.05, '#2a2420', {y: 0.65, z: 1.08}); g.add(door); g.rotation.y = 0.2; return {g}; },
  stalagmites(c) { const g = g0(); [[0, 0, 2.6, 0.5], [0.9, 0.2, 1.7, 0.4], [-0.8, -0.1, 2.0, 0.45], [1.6, 0.4, 1.1, 0.3]].forEach(([x, z, h, r]) => g.add(cone(r, h, '#7a6a58', 7, {x, z}))); return {g}; },
  lamp_post(c) { const g = g0(); g.add(cyl(0.07, 0.1, 3.4, c.trim, {y: 1.7, seg: 8}), box(0.5, 0.6, 0.5, '#2a2a2a', {y: 3.6}), box(0.36, 0.44, 0.36, '#ffd37a', {y: 3.6}));
    const gl = glow('#ffd37a', 2.2, 0.35); gl.position.y = 3.6; g.add(gl); return {g, update: (t) => { gl.material.opacity = 0.32 + 0.06 * Math.sin(t * 6); }}; },
  chandelier(c) { const g = g0(); const ring = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.05, 6, 20), toon(c.trim)); ring.rotation.x = Math.PI / 2; ring.position.y = 4.3; g.add(ink(ring, 0.02, false), cyl(0.02, 0.02, 1.4, c.trim, {y: 5.1}));
    const gls = []; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; g.add(cyl(0.04, 0.04, 0.25, '#f4efe0', {x: Math.cos(a) * 0.8, y: 4.45, z: Math.sin(a) * 0.8, seg: 8})); const gl = glow('#ffb55a', 0.7, 0.5); gl.position.set(Math.cos(a) * 0.8, 4.7, Math.sin(a) * 0.8); g.add(gl); gls.push(gl); }
    return {g, update: (t) => gls.forEach((gl, i) => { gl.material.opacity = 0.45 + 0.12 * Math.sin(t * 9 + i * 2); })}; },
  fireplace(c) { const g = g0(); g.add(box(2.8, 2.4, 0.9, '#8d8880', {y: 1.2}), box(1.5, 1.4, 0.3, '#1c1512', {y: 0.9, z: 0.42}), box(3.2, 0.3, 1.1, c.trim, {y: 2.5}));
    const fl = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.8, 7), new THREE.MeshBasicMaterial({color: '#ff8a2b'})); fl.position.set(0, 0.7, 0.45); g.add(fl);
    const gl = glow('#ff9a3c', 3.0, 0.45); gl.position.set(0, 0.9, 0.7); g.add(gl);
    return {g, update: (t) => { fl.scale.set(1 + 0.15 * Math.sin(t * 15), 1 + 0.25 * Math.sin(t * 11 + 1), 1); gl.material.opacity = 0.4 + 0.1 * Math.sin(t * 8); }}; },
  mast_flag(c) { const g = g0(); g.add(cyl(0.07, 0.1, 5.4, c.wood, {y: 2.7, seg: 8})); const f = P.flag(c.accent, 1); f.position.set(0.1, 4.5, 0); g.add(f); return {g}; },
  pipes(c) { const g = g0(); [0.7, 1.4, 2.1].forEach((y, i) => { const p = cyl(0.2, 0.2, 3.6, i % 2 ? '#8d9199' : c.accent, {y, seg: 12}); p.rotation.z = Math.PI / 2; g.add(p); }); g.add(cyl(0.3, 0.3, 0.1, '#c8372d', {x: 1.0, y: 1.4, z: 0.3, seg: 10}).rotateX(Math.PI / 2)); return {g}; },
  tank(c) { const g = g0(); g.add(cyl(1.1, 1.1, 2.8, '#9aa0a8', {y: 1.4, seg: 20}), cyl(1.12, 1.12, 0.2, c.accent, {y: 0.8, seg: 20}), cyl(1.12, 1.12, 0.2, c.accent, {y: 2.0, seg: 20}), cyl(0.2, 1.1, 0.5, '#9aa0a8', {y: 3.05, seg: 20})); return {g}; },
  statue(c) { const g = g0(); const st = '#a9a7a2'; g.add(box(1.2, 1.0, 1.2, st, {y: 0.5}), cyl(0.3, 0.4, 1.8, st, {y: 1.9, seg: 12}));
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 10), toon(st)); h.position.y = 3.0; g.add(ink(h, 0.03, false)); const a = box(0.18, 1.2, 0.18, st, {x: 0.55, y: 2.3}); a.rotation.z = -0.4; g.add(a); return {g}; },
  cactus(c) { const g = g0(); g.add(cyl(0.3, 0.34, 3.2, '#5a9a4a', {y: 1.6, seg: 10}), cyl(0.2, 0.2, 1.1, '#5a9a4a', {x: 0.6, y: 1.9, seg: 8}), cyl(0.2, 0.2, 1.0, '#5a9a4a', {x: -0.6, y: 1.5, seg: 8})); return {g}; },
  crystals(c) { const g = g0(); const gls = []; [[0, 0, 2.2, 0.35], [0.7, 0.2, 1.5, 0.28], [-0.7, 0.1, 1.7, 0.3], [0.2, -0.5, 1.1, 0.22]].forEach(([x, z, h, r], i) => { const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 5), new THREE.MeshBasicMaterial({color: c.accent})); m.position.set(x, h / 2, z); m.rotation.z = (i - 1.5) * 0.12; g.add(ink(m, 0.03, true, 50)); });
    const gl = glow(c.accent, 3.2, 0.4); gl.position.y = 1.0; g.add(gl); return {g, update: (t) => { gl.material.opacity = 0.34 + 0.08 * Math.sin(t * 2.4); }}; },
  mushrooms(c) { const g = g0(); [[0, 0, 1.2, 0.55], [0.9, 0.3, 0.8, 0.4], [-0.8, 0.2, 0.9, 0.42]].forEach(([x, z, h, r], i) => { g.add(cyl(r * 0.3, r * 0.35, h, '#efe3c8', {x, y: h / 2, z, seg: 10})); const cap = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon(i % 2 ? c.accent : '#c8372d')); cap.position.set(x, h, z); g.add(ink(cap, 0.03, false)); }); return {g}; },
  market_stall(c) { const g = g0(); g.add(box(2.6, 0.9, 1.2, c.wood, {y: 0.45}), cyl(0.06, 0.06, 2.6, c.wood, {x: -1.2, y: 1.3, z: -0.5, seg: 6}), cyl(0.06, 0.06, 2.6, c.wood, {x: 1.2, y: 1.3, z: -0.5, seg: 6}));
    for (let i = 0; i < 6; i++) g.add(box(0.45, 0.08, 1.5, i % 2 ? '#fbf7ee' : c.accent, {x: -1.15 + i * 0.46, y: 2.6, z: -0.2 + 0.0, thick: 0.01}));
    for (let i = 0; i < 4; i++) g.add(box(0.3, 0.3, 0.3, [c.accent, '#e9e2cf', '#d9a441', '#c8372d'][i], {x: -0.9 + i * 0.6, y: 1.05, thick: 0.01})); return {g}; },
  signboard(c, text) { const g = g0(); g.add(cyl(0.07, 0.07, 2.8, c.wood, {x: -1.1, y: 1.4, seg: 6}), cyl(0.07, 0.07, 2.8, c.wood, {x: 1.1, y: 1.4, seg: 6}));
    const s = sign(String(text || 'WELCOME').toUpperCase().slice(0, 20), 2.6, 1.0, {bg: '#e8d8a8', w: 640, h: 240, font: 'bold 84px Arial'}); s.position.set(0, 2.6, 0.1); g.add(s); return {g}; },
};
export const PIECE_NAMES = Object.keys(PIECES);

// named spots around the action: [dx, dz relative to the hero row, scale]. Front spots are small so they never block the camera.
export const PIECE_SLOTS = {
  back_left: [-4.6, -3.4, 1], back_right: [4.6, -3.4, 1], back_center: [0, -4.6, 1.1], far_left: [-6.6, -1.0, 1], far_right: [6.6, -1.0, 1],
  mid_left: [-3.8, -1.6, 0.95], mid_right: [4.0, -1.8, 0.95], front_left: [-3.6, 1.9, 0.6], front_right: [3.9, 2.1, 0.6],
};

// floor styles drawn over the ground under the action
export function floorPattern(style, ox, hz, hy, c) {
  const g = g0(); const y = hy + 0.012;
  const flat = (w, d, color, x, z, h = 0.02) => box(w, h, d, color, {x: ox + x, y: y + h / 2, z: hz + z, thick: 0.004, edges: false});
  if (style === 'rug') { g.add(flat(5.4, 3.6, c.trim, 0, 0, 0.02), flat(4.8, 3.0, c.accent, 0, 0, 0.03), flat(3.6, 2.0, c.trim, 0, 0, 0.04), flat(2.8, 1.2, c.accent, 0, 0, 0.05)); }
  else if (style === 'planks') { for (let i = 0; i < 14; i++) g.add(flat(0.5, 7, i % 2 ? c.wood : c.trim, -3.5 + i * 0.55, 0, 0.02)); }
  else if (style === 'checker') { for (let i = 0; i < 8; i++) for (let j = 0; j < 6; j++) g.add(flat(1, 1, (i + j) % 2 ? c.trim : c.accent, -4 + i + 0.5, -3 + j + 0.5, 0.02)); }
  else if (style === 'stones') { const r = (a) => ((Math.sin(a * 12.9898) * 43758.5453) % 1 + 1) % 1; for (let i = 0; i < 26; i++) { const b = flat(0.7 + r(i) * 0.6, 0.6 + r(i + 40) * 0.6, i % 2 ? '#9a948a' : '#8a857c', -4 + r(i + 80) * 8, -3 + r(i + 120) * 6, 0.03); b.rotation.y = r(i + 160); g.add(b); } }
  else if (style === 'path') { g.add(flat(2.6, 14, c.wood, 0, -2, 0.02), flat(2.0, 14, c.trim, 0, -2, 0.03)); }
  return g;
}
export const FLOOR_STYLES = ['rug', 'planks', 'checker', 'stones', 'path', 'none'];
