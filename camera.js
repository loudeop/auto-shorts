import * as THREE from 'three';
import timing from './timing.json';
import story from './story.json';
import {LOC} from './sets.js';
import flags from './flags.json';

// monotone cubic time warp: beat times per path key -> path position 0..1 (ease in/out)
export function warpU(T, t) {
  const n = T.length; if (t <= T[0]) return 0; if (t >= T[n - 1]) return 1;
  const sec = []; for (let i = 0; i < n - 1; i++) sec.push((1 / (n - 1)) / (T[i + 1] - T[i]));
  const m = [0]; for (let i = 1; i < n - 1; i++) m.push(2 * sec[i - 1] * sec[i] / (sec[i - 1] + sec[i])); m.push(0);
  let i = 0; while (t > T[i + 1]) i++;
  const h = T[i + 1] - T[i], x = (t - T[i]) / h, x2 = x * x, x3 = x2 * x;
  return (2 * x3 - 3 * x2 + 1) * (i / (n - 1)) + (x3 - 2 * x2 + x) * h * m[i] + (-2 * x3 + 3 * x2) * ((i + 1) / (n - 1)) + (x3 - x2) * h * m[i + 1];
}

const S = Object.fromEntries(timing.shots.map((s) => [s.key, s]));
const keys = timing.shots.map((s) => s.key);
// cut = midway between the end of one sentence and the start of the next
export const CUTS = keys.map((k, i) => (i === 0 ? 0 : (timing.shots[i - 1].end + timing.shots[i].start) / 2));
export const END = timing.duration;
// word time: proportional position of word index (0-based) inside a sentence
export const wordT = (key, idx) => S[key].start + (S[key].end - S[key].start) * idx / S[key].words;

// light presets
export const LIGHTS = {
  night: {sun: '#a9b8ff', si: 1.0, sky: '#4a50a0', gnd: '#2a2030', hi: 1.0, fog: '#232856', near: 120, far: 420, sunOff: [-40, 90, 50], shadow: 70, top: '#0b1030', hor: '#3e3f86', pt: null},
  day: {sun: '#fff0cf', si: 2.6, sky: '#a9d8ff', gnd: '#d9a878', hi: 1.15, fog: '#cfe7f7', near: 160, far: 650, sunOff: [-50, 90, 60], shadow: 80, top: '#3d8fe0', hor: '#cde9f8', pt: null},
  storm: {sun: '#cdd3de', si: 1.1, sky: '#8a95a6', gnd: '#4a4f58', hi: 1.0, fog: '#66738a', near: 45, far: 260, sunOff: [-40, 80, 40], shadow: 80, top: '#3c4454', hor: '#7d889a', pt: null},
  office: {sun: '#fff4e4', si: 1.6, sky: '#f4fbff', gnd: '#b48a62', hi: 1.05, fog: '#efe2cb', near: 30, far: 90, sunOff: [-6, 9, 7], shadow: 10, top: '#7fb7e6', hor: '#d6ecf6', pt: {c: '#ffc77a', i: 7, p: [-2.5, 3.6, 0.5], d: 14}},
  yard: {sun: '#ffe7bd', si: 2.5, sky: '#b5dcff', gnd: '#d1ad7c', hi: 1.15, fog: '#e2e3d4', near: 70, far: 260, sunOff: [-14, 22, 14], shadow: 20, top: '#3d8fe0', hor: '#d9ecf5', pt: null},
  joint: {sun: '#ffe0b0', si: 2.3, sky: '#c4c8dc', gnd: '#5a5662', hi: 1.3, fog: '#4a4a58', near: 30, far: 80, sunOff: [-7, 12, 9], shadow: 12, top: '#222', hor: '#333', pt: {c: '#ffb066', i: 16, p: [-3.2, 4.6, -1.5], d: 12}},
  weather: {sun: '#eef2ff', si: 1.4, sky: '#eef3f6', gnd: '#8f7b66', hi: 1.1, fog: '#e3e7e1', near: 30, far: 90, sunOff: [-6, 9, 7], shadow: 10, top: '#56606e', hor: '#9aa4b0', pt: {c: '#ffd58a', i: 5, p: [0, 3.8, 0], d: 14}},
  morning: {sun: '#ffbf7a', si: 2.5, sky: '#ffe0bd', gnd: '#c08a5a', hi: 1.0, fog: '#f6d9b8', near: 160, far: 650, sunOff: [-60, 40, 50], shadow: 80, top: '#6fa6dd', hor: '#ffd3a1', pt: null},
  cave: {sun: '#ffd9a0', si: 1.4, sky: '#b9a890', gnd: '#4a3a2a', hi: 1.15, fog: '#3a2c20', near: 18, far: 60, sunOff: [-6, 10, 8], shadow: 12, top: '#1a1410', hor: '#2a2018', pt: {c: '#ffb066', i: 14, p: [-2, 4, -1], d: 14}},
  desert: {sun: '#fff1c4', si: 3.0, sky: '#bfe0ff', gnd: '#d8b070', hi: 1.1, fog: '#f1d9a8', near: 90, far: 420, sunOff: [-30, 50, 30], shadow: 30, top: '#3d8fe0', hor: '#f7e3bd', pt: null},
  forest: {sun: '#fff0c0', si: 2.1, sky: '#cfe8ff', gnd: '#4a7a3a', hi: 1.1, fog: '#cfe3c0', near: 30, far: 150, sunOff: [-20, 40, 20], shadow: 30, top: '#5fa0d8', hor: '#e3efd0', pt: null},
  harbor: {sun: '#fff0cf', si: 2.6, sky: '#a9d8ff', gnd: '#8a7a6a', hi: 1.15, fog: '#cfe3ee', near: 80, far: 420, sunOff: [-40, 70, 50], shadow: 40, top: '#4a95d8', hor: '#d9eef7', pt: null},
  castle: {sun: '#ffe0b0', si: 1.3, sky: '#aab0c0', gnd: '#6a6258', hi: 0.95, fog: '#3a3630', near: 20, far: 75, sunOff: [-6, 9, 7], shadow: 10, top: '#222', hor: '#333', pt: {c: '#ffb066', i: 12, p: [0, 5, -1], d: 16}},
};

// colour modes: CALM (old look, off by default) pulls everything darker and greyer; VIVID (default) pushes every light, sky and fog
// to full saturation, and story.world (designed per video) repaints the sky, fog and ground so each video has its own colours.
const CALM = flags.calm === undefined ? 0 : flags.calm;
const VIVID = flags.vivid === undefined ? 1 : flags.vivid;
const soften = (hex, ds, dl) => new THREE.Color(hex).offsetHSL(0, ds, dl).getStyle();
const punch = (hex, amt, dl = 0) => { const c = new THREE.Color(hex), h = {}; c.getHSL(h); if (h.s < 0.05) return c.getStyle(); c.setHSL(h.h, Math.min(1, h.s + amt * (1 - h.s) * 1.6), Math.min(0.95, Math.max(0.05, h.l + dl))); return c.getStyle(); };
if (CALM) {
  for (const L of Object.values(LIGHTS)) {
    for (const k of ['sky', 'gnd', 'fog', 'top', 'hor']) if (L[k]) L[k] = soften(L[k], -0.12 * CALM, -0.07 * CALM);
    L.si *= 1 - 0.12 * CALM; L.hi *= 1 - 0.08 * CALM;
    if (L.pt) L.pt = {...L.pt, i: L.pt.i * (1 - 0.1 * CALM)};
  }
}
const WORLD = story.world || {};
const mixHex = (a, b, k) => new THREE.Color(a).lerp(new THREE.Color(b), k).getStyle();
const OPEN_SKY = ['day', 'morning', 'yard', 'desert', 'forest', 'harbor', 'night'];
for (const [name, L] of Object.entries(LIGHTS)) {
  if (WORLD.sky_top) {            // this video's own sky, horizon and fog
    const open = OPEN_SKY.includes(name);
    const night = name === 'night' || WORLD.time === 'night';
    const top = night ? mixHex(WORLD.sky_top, '#0b0f3a', 0.55) : WORLD.sky_top;
    const hor = night ? mixHex(WORLD.sky_horizon || WORLD.sky_top, '#3b2f8a', 0.45) : (WORLD.sky_horizon || WORLD.sky_top);
    if (open) { L.top = top; L.hor = hor; L.fog = mixHex(L.fog, hor, 0.7); L.sky = mixHex(L.sky, hor, 0.5); L.gnd = mixHex(L.gnd, WORLD.ground || L.gnd, 0.45); }
    else { L.sky = mixHex(L.sky, WORLD.wall || L.sky, 0.35); L.gnd = mixHex(L.gnd, WORLD.ground || L.gnd, 0.4); L.fog = mixHex(L.fog, WORLD.wall || L.fog, 0.3); if (L.pt && WORLD.accent2) L.pt = {...L.pt, c: mixHex(L.pt.c, WORLD.accent2, 0.35)}; }
  }
  if (VIVID) {
    for (const k of ['sky', 'gnd', 'fog', 'top', 'hor']) if (L[k] && (k !== 'top' && k !== 'hor' || name !== 'joint')) L[k] = punch(L[k], 0.28 * VIVID, 0.015 * VIVID);
    L.si *= 1 + 0.12 * VIVID; L.hi *= 1 + 0.15 * VIVID;
    if (L.pt) L.pt = {...L.pt, c: punch(L.pt.c, 0.2 * VIVID), i: L.pt.i * (1 + 0.15 * VIVID)};
  }
}

const v = (a) => new THREE.Vector3(...a);

// Where the hero characters stand in each location (z, ground height) and which light preset it uses.
export const KIND = {
  street_day: {light: 'day', hz: 6.2, hy: 0.25},
  street_night: {light: 'night', hz: 6.2, hy: 0.25},
  office: {light: 'office', hz: -1.0, hy: 0.05},
  yard: {light: 'yard', hz: 0.6, hy: 0.05},
  workshop: {light: 'joint', hz: -1.0, hy: 0.05},
  lab: {light: 'weather', hz: -1.0, hy: 0.05},
  cave: {light: 'cave', hz: -1.0, hy: 0.05},
  desert: {light: 'desert', hz: 0.6, hy: 0.05},
  forest: {light: 'forest', hz: 0.6, hy: 0.05},
  harbor: {light: 'harbor', hz: -2.0, hy: 0.05},
  castle: {light: 'castle', hz: -1.0, hy: 0.05},
};
const MOVES = ['push', 'track', 'pull', 'crane'];
// where a close-up hero prop sits (right of and a little in front of the characters)
export const objPos = (loc) => [LOC[loc] + 1.7, KIND[loc].hy, KIND[loc].hz + 0.9];

// three camera keys per move, always travelling, always 1.8-4.3 m from the subject
function pathFor(loc, move, cx) {
  const K = KIND[loc], X = LOC[loc] + cx, z = K.hz, y = K.hy;
  const p = (dx, h, d) => ({x: X + dx, y: y + h, z: z + d});
  const l = (dx, h, dz = 0) => ({x: X + dx, y: y + h, z: z + dz});
  let k;
  if (move === 'reveal') k = [{p: p(1.15, 0.95, 2.7), l: l(1.7, 0.5, 0.9)}, {p: p(0.7, 1.35, 3.4), l: l(1.0, 0.85, 0.3)}, {p: p(0, 1.5, 3.0), l: l(0, 1.2)}];
  else if (move === 'track') k = [{p: p(-2.4, 1.5, 3.3), l: l(-0.9, 1.15)}, {p: p(0, 1.45, 3.1), l: l(0, 1.15)}, {p: p(2.4, 1.5, 3.3), l: l(0.9, 1.15)}];
  else if (move === 'crane') k = [{p: p(1.2, 3.4, 4.2), l: l(0, 1.9)}, {p: p(0.6, 2.4, 3.5), l: l(0, 1.5)}, {p: p(0, 1.5, 2.8), l: l(0, 1.2)}];
  else if (move === 'pull') k = [{p: p(0, 1.4, 2.2), l: l(0, 1.25)}, {p: p(0.5, 1.7, 3.4), l: l(0, 1.3)}, {p: p(1.0, 2.0, 5.0), l: l(0, 1.3)}];
  else k = [{p: p(-1.0, 1.7, 4.2), l: l(0, 1.2)}, {p: p(-0.4, 1.55, 3.2), l: l(0, 1.2)}, {p: p(0, 1.45, 2.5), l: l(0, 1.2)}];
  return k.map((q) => ({p: [q.p.x, q.p.y, q.p.z], l: [q.l.x, q.l.y, q.l.z]}));
}

// camera plan generated from story.json (one entry per shot key, same keys as timing.json)
export const PLAN = {};
const SHOT = {};
story.shots.forEach((sh, i) => {
  const loc = KIND[sh.location] ? sh.location : 'office';
  SHOT[sh.key] = {...sh, location: loc};
  const street = loc.startsWith('street');
  const light = street && LIGHTS[sh.mood] ? sh.mood : KIND[loc].light;
  let move = MOVES[i % MOVES.length];
  if (MOVES.includes(sh.cam)) move = sh.cam;
  if (sh.object) move = 'reveal';
  if (i === 0 && !sh.object) move = 'crane';
  PLAN[sh.key] = {light, anchor: [LOC[loc], 0, KIND[loc].hz], keys: pathFor(loc, move, 0)};
});
export const SHOTS = SHOT;

// precompute curves + beat times
const CURVES = {};
const IDX = {};
keys.forEach((k, i) => {
  IDX[k] = i;
  const P = PLAN[k];
  const a = CUTS[i], b = i + 1 < keys.length ? CUTS[i + 1] : END;
  const T = P.keys.map((_, j) => a + (b - a) * j / (P.keys.length - 1));
  CURVES[k] = {
    p: new THREE.CatmullRomCurve3(P.keys.map((q) => v(q.p)), false, 'centripetal'),
    l: new THREE.CatmullRomCurve3(P.keys.map((q) => v(q.l)), false, 'centripetal'),
    T, a, b,
  };
});

export function shotAt(t) {
  let i = 0; while (i + 1 < CUTS.length && t >= CUTS[i + 1]) i++;
  return keys[i];
}
const poseOf = (k, t) => {
  const C = CURVES[k];
  const u = warpU(C.T, Math.min(Math.max(t, C.a), C.b));
  return {pos: C.p.getPointAt(u), look: C.l.getPointAt(u)};
};
const ss = (x) => { const c = Math.min(1, Math.max(0, x)); return c * c * (3 - 2 * c); };
const GLIDE = 0.4;   // seconds each side of a cut inside the same location: the camera glides between framings
const WHIP = 0.22;   // seconds each side of a location change: whip-pan + motion blur
const sameLoc = (j) => SHOT[keys[j]].location === SHOT[keys[j - 1]].location;

export function cameraAt(t) {
  const k = shotAt(t); const i = IDX[k];
  let base = poseOf(k, t);
  let whip = 0, dir = 0;
  for (const j of [i, i + 1]) {
    if (j <= 0 || j >= keys.length) continue;
    const c = CUTS[j];
    if (sameLoc(j)) {
      if (Math.abs(t - c) < GLIDE) {
        const w = ss((t - (c - GLIDE)) / (2 * GLIDE));
        const A = poseOf(keys[j - 1], t), B = poseOf(keys[j], t);
        base = {pos: A.pos.clone().lerp(B.pos, w), look: A.look.clone().lerp(B.look, w)};
      }
    } else if (Math.abs(t - c) < WHIP) {
      whip = 1 - Math.abs(t - c) / WHIP; dir = t < c ? 1 : -1;
    }
  }
  if (whip > 0) {   // swing the view sideways: out to the right before the cut, in from the left after it
    const d = base.look.clone().sub(base.pos); const L = d.length();
    const side = new THREE.Vector3().crossVectors(d, new THREE.Vector3(0, 1, 0)).normalize();
    base.look = base.look.clone().add(side.multiplyScalar(dir * whip * whip * 0.9 * L));
  }
  return {key: k, pos: base.pos, look: base.look, plan: PLAN[k], a: CURVES[k].a, b: CURVES[k].b, whip: whip * whip};
}
export const whipAt = (t) => cameraAt(t).whip;
// no fade to cream any more: transitions are camera moves
export const dipAt = () => 0;
