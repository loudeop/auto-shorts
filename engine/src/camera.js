import * as THREE from 'three';
import timing from './timing.json';
import story from './story.json';
import {LOC} from './sets.js';

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
};

const v = (a) => new THREE.Vector3(...a);

// Where the hero characters stand in each location (z, ground height) and which light preset it uses.
export const KIND = {
  street_day: {light: 'day', hz: 6.2, hy: 0.25},
  street_night: {light: 'night', hz: 6.2, hy: 0.25},
  office: {light: 'office', hz: -1.0, hy: 0.05},
  yard: {light: 'yard', hz: 0.6, hy: 0.05},
  workshop: {light: 'joint', hz: -1.0, hy: 0.05},
  lab: {light: 'weather', hz: -1.0, hy: 0.05},
};
const MOVES = ['push', 'track', 'pull', 'crane'];

// three camera keys per move, always travelling, always 2.2-4.3 m from the characters
function pathFor(loc, move, cx) {
  const K = KIND[loc], X = LOC[loc] + cx, z = K.hz, y = K.hy;
  const p = (dx, h, d) => ({x: X + dx, y: y + h, z: z + d});
  const l = (dx, h) => ({x: X + dx, y: y + h, z});
  let k;
  if (move === 'track') k = [{p: p(-2.4, 1.5, 3.3), l: l(-0.9, 1.15)}, {p: p(0, 1.45, 3.1), l: l(0, 1.15)}, {p: p(2.4, 1.5, 3.3), l: l(0.9, 1.15)}];
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
  const move = i === 0 ? 'crane' : (MOVES.includes(sh.cam) ? sh.cam : MOVES[i % MOVES.length]);
  PLAN[sh.key] = {light, anchor: [LOC[loc], 0, KIND[loc].hz], keys: pathFor(loc, move, 0)};
});
export const SHOTS = SHOT;

// precompute curves + beat times
const CURVES = {};
keys.forEach((k, i) => {
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
export function cameraAt(t) {
  const k = shotAt(t); const C = CURVES[k];
  const u = warpU(C.T, t);
  return {key: k, pos: C.p.getPointAt(u), look: C.l.getPointAt(u), plan: PLAN[k], a: C.a, b: C.b};
}
// dip-to-cream opacity at location changes only (0.4 s); same-location shots are plain cuts
const CONT = new Set(keys.filter((k, i) => i > 0 && SHOT[k].location === SHOT[keys[i - 1]].location));
export function dipAt(t) {
  let o = 0;
  keys.forEach((k, i) => {
    if (i === 0 || CONT.has(k)) return;
    const c = CUTS[i]; const d = Math.abs(t - c);
    if (d < 0.2) o = Math.max(o, 1 - d / 0.2);
  });
  return o;
}
