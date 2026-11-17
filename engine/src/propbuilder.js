import * as THREE from 'three';
import {toon, ink, sign} from './kit.js';
import {makeObject} from './objects.js';
import {glow} from './glow.js';

// Basic props made for ONE shot. A prop is either a named recipe / library object, or a custom list of simple shapes:
//   {name: 'rope'}  or  {parts: [{shape: 'box|cylinder|sphere|cone|torus|disc', color: '#8a5a3b', size: [w,h,d], pos: [x,y,z], rot: [x,y,z]}]}
// plus optional slot, enter (pop|drop|slide|rise|swing_in), motion (none|bob|spin|swing|pulse), scale, glow colour, text label.
const HEX = /^#[0-9a-fA-F]{6}$/;
const clamp = (n, a, b, d) => Math.min(b, Math.max(a, Number.isFinite(+n) ? +n : d));
const P = (shape, color, size, pos = [0, 0, 0], rot = [0, 0, 0]) => ({shape, color, size, pos, rot});
const HP = Math.PI / 2;

// ready-made basic props, built only from simple shapes (origin on the ground, about 1-2 m tall)
export const RECIPES = {
  rope: [P('torus', '#c9a46a', [0.3, 0.07], [0, 0.08, 0], [HP, 0, 0]), P('torus', '#b8935a', [0.22, 0.07], [0, 0.17, 0], [HP, 0, 0]), P('cylinder', '#c9a46a', [0.035, 1.8], [0.3, 0.9, 0])],
  axe: [P('cylinder', '#8a5a3b', [0.04, 1.1], [0, 0.55, 0]), P('box', '#8d9199', [0.38, 0.3, 0.06], [0.18, 1.0, 0]), P('box', '#d5d9de', [0.05, 0.34, 0.04], [0.38, 1.0, 0])],
  spring: [0, 1, 2, 3, 4, 5].map((i) => P('torus', '#9aa0a8', [0.22, 0.04], [0, 0.12 + i * 0.16, 0], [HP, 0, 0])).concat([P('box', '#6a6e75', [0.6, 0.08, 0.6], [0, 0.04, 0])]),
  platform: [P('box', '#8a5a3b', [2.2, 0.15, 1.4], [0, 0.5, 0])].concat([[-1, -0.6], [1, -0.6], [-1, 0.6], [1, 0.6]].map(([x, z]) => P('cylinder', '#5a3d28', [0.05, 1.0], [x, 1.05, z])), [P('box', '#5a3d28', [2.1, 0.06, 0.06], [0, 1.55, -0.6]), P('box', '#5a3d28', [2.1, 0.06, 0.06], [0, 1.55, 0.6])]),
  door: [P('box', '#5a3d28', [1.3, 2.2, 0.1], [0, 1.1, -0.04]), P('box', '#8a5a3b', [1.1, 2.1, 0.12], [0, 1.05, 0]), P('sphere', '#f2c12e', [0.06], [0.4, 1.0, 0.1])],
  table: [P('box', '#8a5a3b', [1.6, 0.1, 0.9], [0, 0.8, 0])].concat([[-0.7, -0.35], [0.7, -0.35], [-0.7, 0.35], [0.7, 0.35]].map(([x, z]) => P('cylinder', '#6b4430', [0.05, 0.8], [x, 0.4, z]))),
  chair: [P('box', '#8a5a3b', [0.5, 0.08, 0.5], [0, 0.5, 0]), P('box', '#8a5a3b', [0.5, 0.6, 0.07], [0, 0.85, -0.22])].concat([[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]].map(([x, z]) => P('cylinder', '#6b4430', [0.035, 0.5], [x, 0.25, z]))),
  stool: [P('cylinder', '#8a5a3b', [0.28, 0.08], [0, 0.5, 0])].concat([[-0.15, 0], [0.12, 0.1], [0.12, -0.1]].map(([x, z]) => P('cylinder', '#6b4430', [0.035, 0.5], [x, 0.25, z]))),
  bell: [P('cone', '#d8b050', [0.4, 0.6], [0, 0.55, 0]), P('sphere', '#8a6a2a', [0.07], [0, 0.22, 0]), P('torus', '#8a6a2a', [0.1, 0.025], [0, 1.0, 0]), P('box', '#6b4430', [1.0, 0.1, 0.1], [0, 1.1, 0]), P('cylinder', '#6b4430', [0.05, 1.1], [-0.5, 0.55, 0]), P('cylinder', '#6b4430', [0.05, 1.1], [0.5, 0.55, 0])],
  anvil: [P('box', '#3a3d44', [0.9, 0.3, 0.4], [0, 0.55, 0]), P('box', '#33363c', [0.4, 0.3, 0.3], [0, 0.3, 0]), P('box', '#2a2c32', [0.7, 0.12, 0.5], [0, 0.06, 0]), P('cone', '#3a3d44', [0.15, 0.4], [0.62, 0.55, 0], [0, 0, -HP])],
  lever: [P('box', '#4a4f58', [0.5, 0.15, 0.3], [0, 0.08, 0]), P('cylinder', '#9aa0a8', [0.04, 0.9], [0.1, 0.55, 0], [0, 0, -0.5]), P('sphere', '#c8372d', [0.09], [0.32, 0.95, 0])],
  dial: [P('box', '#4a4f58', [0.9, 0.9, 0.12], [0, 0.9, 0]), P('disc', '#f4f1ea', [0.32, 0.04], [0, 0.9, 0.08], [HP, 0, 0]), P('box', '#c8372d', [0.03, 0.26, 0.02], [0.05, 0.98, 0.11], [0, 0, -0.6]), P('cylinder', '#2a2a2a', [0.04, 0.9], [0, 0.45, -0.05])],
  safe: [P('box', '#4a4f58', [0.9, 1.0, 0.8], [0, 0.5, 0]), P('disc', '#f2c12e', [0.16, 0.05], [0, 0.55, 0.42], [HP, 0, 0]), P('box', '#f2c12e', [0.3, 0.05, 0.05], [0, 0.55, 0.46])],
  balloon: [P('sphere', '#c8372d', [0.45], [0, 1.7, 0]), P('cone', '#a52a22', [0.07, 0.12], [0, 1.2, 0], [Math.PI, 0, 0]), P('cylinder', '#e9e2cf', [0.012, 1.1], [0, 0.6, 0])],
  campfire: [P('cylinder', '#6b4430', [0.08, 0.9], [0, 0.1, 0], [0, 0.6, HP]), P('cylinder', '#5a3a26', [0.08, 0.9], [0, 0.1, 0], [0, -0.6, HP]), P('cone', '#ff8a2b', [0.25, 0.7], [0, 0.45, 0]), P('cone', '#ffd95a', [0.14, 0.4], [0, 0.35, 0.02])],
  wheel: [P('torus', '#6b4430', [0.5, 0.07], [0, 0.6, 0]), P('cylinder', '#4a3322', [0.09, 0.14], [0, 0.6, 0], [HP, 0, 0]), P('box', '#6b4430', [0.9, 0.05, 0.05], [0, 0.6, 0]), P('box', '#6b4430', [0.05, 0.9, 0.05], [0, 0.6, 0])],
  cart: [P('box', '#8a5a3b', [1.4, 0.5, 0.8], [0, 0.65, 0]), P('torus', '#4a3322', [0.3, 0.06], [-0.5, 0.32, 0.45]), P('torus', '#4a3322', [0.3, 0.06], [0.5, 0.32, 0.45]), P('cylinder', '#6b4430', [0.04, 1.2], [-1.05, 0.7, 0], [0, 0, 1.2])],
  shovel: [P('cylinder', '#8a5a3b', [0.03, 1.3], [0, 0.85, 0]), P('box', '#8d9199', [0.3, 0.4, 0.04], [0, 0.2, 0]), P('box', '#8a5a3b', [0.2, 0.05, 0.05], [0, 1.5, 0])],
  ladder: [P('cylinder', '#8a5a3b', [0.04, 2.2], [-0.25, 1.1, 0]), P('cylinder', '#8a5a3b', [0.04, 2.2], [0.25, 1.1, 0])].concat([0, 1, 2, 3, 4, 5].map((i) => P('box', '#6b4430', [0.5, 0.05, 0.05], [0, 0.3 + i * 0.35, 0]))),
  bowl: [P('cylinder', '#b5654a', [0.32, 0.22], [0, 0.11, 0]), P('disc', '#4a3322', [0.27, 0.02], [0, 0.22, 0])],
  sack: [P('sphere', '#b89a62', [0.38], [0, 0.36, 0]), P('cone', '#b89a62', [0.16, 0.28], [0, 0.66, 0]), P('torus', '#6b4430', [0.12, 0.025], [0, 0.68, 0], [HP, 0, 0])],
  signpost: [P('cylinder', '#6b4430', [0.06, 1.8], [0, 0.9, 0]), P('box', '#c9a46a', [0.9, 0.35, 0.06], [0.3, 1.5, 0.05]), P('cone', '#c9a46a', [0.2, 0.3], [0.85, 1.5, 0.05], [0, 0, -HP])],
  lamp: [P('disc', '#4a4f58', [0.25, 0.06], [0, 0.03, 0]), P('cylinder', '#4a4f58', [0.04, 1.6], [0, 0.85, 0]), P('sphere', '#fff2a8', [0.2], [0, 1.75, 0])],
};
export const RECIPE_NAMES = Object.keys(RECIPES);

export const PROP_SLOTS = {   // [dx, dz] relative to the hero row; none of these block the camera path
  left: [-2.0, 0.5], right: [2.1, 0.4], far_left: [-3.0, -0.9], far_right: [3.0, -1.0], behind: [0, -1.5], left_front: [-1.5, 1.5], right_front: [1.6, 1.6],
};
export const ENTERS = ['pop', 'drop', 'slide', 'rise', 'swing_in'];
export const MOTIONS = ['none', 'bob', 'spin', 'swing', 'pulse'];

function partMesh(p) {
  const c = HEX.test(p.color) ? p.color : '#9aa0a8';
  const s = (Array.isArray(p.size) ? p.size : [0.3]).slice(0, 3).map((n) => clamp(n, 0.03, 3, 0.3));
  let geo;
  switch (p.shape) {
    case 'box': geo = new THREE.BoxGeometry(s[0], s[1] === undefined ? s[0] : s[1], s[2] === undefined ? s[0] : s[2]); break;
    case 'cylinder': geo = new THREE.CylinderGeometry(s[0], s[0], s[1] === undefined ? s[0] * 2 : s[1], 16); break;
    case 'cone': geo = new THREE.ConeGeometry(s[0], s[1] === undefined ? s[0] * 2 : s[1], 14); break;
    case 'sphere': geo = new THREE.SphereGeometry(s[0], 16, 12); break;
    case 'torus': geo = new THREE.TorusGeometry(s[0], Math.min(s[1] === undefined ? s[0] * 0.25 : s[1], s[0] * 0.9), 8, 24); break;
    case 'disc': geo = new THREE.CylinderGeometry(s[0], s[0], s[1] === undefined ? 0.05 : s[1], 24); break;
    default: geo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
  }
  const m = new THREE.Mesh(geo, toon(c));
  const pos = p.pos || [0, 0, 0], rot = p.rot || [0, 0, 0];
  m.position.set(clamp(pos[0], -3, 3, 0), clamp(pos[1], -0.5, 4, 0), clamp(pos[2], -3, 3, 0));
  m.rotation.set(+rot[0] || 0, +rot[1] || 0, +rot[2] || 0);
  return ink(m, 0.03, p.shape === 'box' || p.shape === 'cylinder' || p.shape === 'cone', 40);
}

export function buildProp(spec) {
  const g = new THREE.Group();
  const parts = Array.isArray(spec.parts) && spec.parts.length ? spec.parts : RECIPES[spec.name];
  if (parts) parts.slice(0, 10).forEach((p) => g.add(partMesh(p)));
  else g.add(makeObject(spec.name));                          // a library object (gold, dynamite, key...) or a crate if unknown
  if (spec.text) {
    const s = sign(String(spec.text).toUpperCase().slice(0, 14), 1.0, 0.45, {bg: '#f2e6cc', w: 320, h: 144, font: 'bold 64px Arial'});
    s.position.set(0, 2.15, 0.05); g.add(s);
  }
  if (typeof spec.glow === 'string' && HEX.test(spec.glow)) { const gl = glow(spec.glow, 1.6, 0.22); gl.position.y = 0.9; g.add(gl); }
  const flash = glow('#fff1c4', 2.4, 0); flash.position.y = 0.9; g.add(flash); g.userData.flash = flash;   // brief highlight as it appears
  g.scale.setScalar(clamp(spec.scale, 0.4, 2.5, 1));
  return g;
}
