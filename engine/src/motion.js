// Scene movement. Every shot can give a character an action: a ready-made one (wave, jump, swing, fall...) or a CUSTOM one written for that
// scene as keyframes. Simple on purpose: arms, body, head and legs of a flat cut-out character, no physics.
//
// Channels (all optional in a keyframe):
//   armL, armR  raise: 0 hanging, 1.6 straight out to the side, 3.1 straight up, negative = across the body   lean  + toward the camera
//   sway  sideways tilt (+ to the right, 1.4 = toppled over)   yaw  turn the body (6.28 = a full spin)   dx / dz / dy  move sideways / toward camera / up (metres)
//   nod  head down (+)   shake  head turn   tilt  head tilt   crouch  0..0.8 squat   stride  0..1 legs swinging (walk/run)   spread  0..0.9 legs apart
export const LIM = {armL: [-1.2, 3.3], armR: [-1.2, 3.3], lean: [-0.8, 0.9], sway: [-1.6, 1.6], yaw: [-6.4, 6.4], dx: [-4, 4], dy: [-0.6, 2.0], dz: [-2, 2],
  nod: [-0.8, 0.8], shake: [-1, 1], tilt: [-0.8, 0.8], crouch: [0, 0.8], stride: [0, 1], spread: [0, 0.9]};
export const CHANNELS = Object.keys(LIM);
const K = (t, o) => ({t, ...o});
const bob = (n, a, extra) => Array.from({length: n + 1}, (_, i) => K(i / n, {dy: i % 2 ? a : 0, ...(extra || {})}));

export const ACTIONS = {
  wave: [K(0, {armR: 2.6}), K(0.25, {armR: 3.2, tilt: 0.1}), K(0.5, {armR: 2.6}), K(0.75, {armR: 3.2, tilt: 0.1}), K(1, {armR: 2.6})],
  point: [K(0, {armR: 0.6}), K(0.3, {armR: 1.6, lean: 0.1, nod: 0.05}), K(1, {armR: 1.7, lean: 0.12})],
  jump: [K(0, {crouch: 0.4, armL: 0.2, armR: 0.2}), K(0.3, {dy: 0.9, armL: 2.8, armR: 2.8, crouch: 0}), K(0.65, {dy: 0.9, armL: 2.8, armR: 2.8}), K(1, {dy: 0, crouch: 0.3, armL: 0.3, armR: 0.3})],
  run_in: [K(0, {dx: -2.6, stride: 1, lean: 0.25, armL: 1.0, armR: 1.0}), K(0.7, {dx: 0, stride: 1, lean: 0.2, armL: 0.9, armR: 0.9}), K(1, {dx: 0, stride: 0, lean: 0, armL: 0.1, armR: 0.1})],
  walk_in: [K(0, {dx: -2.2, stride: 0.6}), K(1, {dx: 0, stride: 0.3})],
  bow: [K(0, {lean: 0, nod: 0}), K(0.4, {lean: 0.6, nod: 0.5}), K(0.7, {lean: 0.6, nod: 0.5}), K(1, {lean: 0, nod: 0})],
  cower: [K(0, {crouch: 0.1}), K(0.2, {crouch: 0.35, lean: 0.3, armL: 2.6, armR: 3.1, dz: -0.2}), K(1, {crouch: 0.35, lean: 0.3, armL: 2.6, armR: 3.1, dz: -0.3})],
  swing: [K(0, {armR: 2.9, lean: -0.1}), K(0.35, {armR: 3.2, lean: -0.2}), K(0.55, {armR: 0.1, lean: 0.45, crouch: 0.1}), K(1, {armR: 0.9, lean: 0.1})],
  throw: [K(0, {armR: 3.0, lean: -0.2}), K(0.4, {armR: 3.2, lean: -0.3}), K(0.6, {armR: 0.8, lean: 0.4}), K(1, {armR: 0.4, lean: 0.1})],
  fall: [K(0, {armL: 2.5, armR: 2.5, sway: 0}), K(0.35, {armL: 3.0, armR: 3.0, sway: 0.2, dy: 0.15}), K(0.7, {armL: 1.2, armR: 2.2, sway: 1.4, dy: -0.1}), K(1, {armL: 1.5, armR: 1.8, sway: 1.5, dy: -0.15})],
  shake_head: [K(0, {shake: 0}), K(0.2, {shake: -0.6}), K(0.4, {shake: 0.6}), K(0.6, {shake: -0.6}), K(0.8, {shake: 0.6}), K(1, {shake: 0})],
  nod_yes: [K(0, {nod: 0}), K(0.2, {nod: 0.4}), K(0.4, {nod: 0}), K(0.6, {nod: 0.4}), K(0.8, {nod: 0}), K(1, {nod: 0})],
  dance: [K(0, {armL: 1.0, armR: 2.8, sway: -0.15, dy: 0}), K(0.25, {armL: 2.8, armR: 1.0, sway: 0.15, dy: 0.15}), K(0.5, {armL: 1.0, armR: 2.8, sway: -0.15, dy: 0}), K(0.75, {armL: 2.8, armR: 1.0, sway: 0.15, dy: 0.15}), K(1, {armL: 1.0, armR: 2.8, sway: -0.15})],
  slump: [K(0, {lean: 0}), K(0.5, {lean: 0.5, nod: 0.5, crouch: 0.15, armL: -0.1, armR: -0.1}), K(1, {lean: 0.5, nod: 0.5, crouch: 0.15})],
  climb: [K(0, {armL: 3.0, armR: 1.4, dy: 0}), K(0.25, {armL: 1.4, armR: 3.0, dy: 0.2}), K(0.5, {armL: 3.0, armR: 1.4, dy: 0.4}), K(0.75, {armL: 1.4, armR: 3.0, dy: 0.6}), K(1, {armL: 3.0, armR: 1.4, dy: 0.8})],
  push: [K(0, {lean: 0}), K(0.3, {lean: 0.35, armL: 1.3, armR: 1.3, dz: 0.2}), K(1, {lean: 0.4, armL: 1.3, armR: 1.3, dz: 0.4, stride: 0.4})],
  pull: [K(0, {lean: 0}), K(0.3, {lean: -0.3, armL: 1.3, armR: 1.3}), K(1, {lean: -0.35, armL: 1.3, armR: 1.3, dz: -0.4, stride: 0.4})],
  cheer: [K(0, {armL: 3.1, armR: 3.1, dy: 0}), K(0.25, {armL: 3.1, armR: 3.1, dy: 0.25}), K(0.5, {armL: 3.1, armR: 3.1, dy: 0}), K(0.75, {armL: 3.1, armR: 3.1, dy: 0.25}), K(1, {armL: 3.1, armR: 3.1, dy: 0})],
  shrug: [K(0, {armL: 0.2, armR: 0.2}), K(0.4, {armL: 0.9, armR: 0.9, tilt: 0.15, nod: -0.1}), K(1, {armL: 0.9, armR: 0.9, tilt: 0.15})],
  clap: [K(0, {armL: 1.2, armR: 1.2}), K(0.2, {armL: -0.3, armR: -0.3}), K(0.4, {armL: 1.2, armR: 1.2}), K(0.6, {armL: -0.3, armR: -0.3}), K(0.8, {armL: 1.2, armR: 1.2}), K(1, {armL: -0.3, armR: -0.3})],
  stomp: [K(0, {dy: 0}), K(0.2, {dy: 0.2, spread: 0.3}), K(0.3, {dy: 0, spread: 0.1, lean: 0.1}), K(0.6, {dy: 0.2, spread: 0.3}), K(0.7, {dy: 0, spread: 0.1, lean: 0.1}), K(1, {dy: 0, spread: 0})],
  spin: [K(0, {yaw: 0, armL: 1.6, armR: 1.6}), K(1, {yaw: 6.28, armL: 1.6, armR: 1.6})],
  sneak: [K(0, {crouch: 0.2, lean: 0.2, stride: 0.3, dx: -1.2}), K(1, {crouch: 0.2, lean: 0.2, stride: 0.3, dx: 0})],
};
export const ACTION_NAMES = Object.keys(ACTIONS);

const ss = (x) => { const c = Math.min(1, Math.max(0, x)); return c * c * (3 - 2 * c); };

// value of every channel at u (0..1) for a sorted key list; a channel only moves between the keys that mention it
export function evalKeys(keys, u, ease = 'smooth') {
  const out = {};
  for (const c of CHANNELS) {
    const pts = keys.filter((k) => k[c] !== undefined);
    if (!pts.length) continue;
    if (u <= pts[0].t) { out[c] = pts[0][c]; continue; }
    if (u >= pts[pts.length - 1].t) { out[c] = pts[pts.length - 1][c]; continue; }
    let i = 0; while (i + 1 < pts.length && u > pts[i + 1].t) i++;
    const a = pts[i], b = pts[i + 1]; let x = (u - a.t) / Math.max(1e-6, b.t - a.t);
    x = ease === 'linear' ? x : ease === 'snap' ? ss((x - 0.7) / 0.3) : ss(x);
    out[c] = a[c] + (b[c] - a[c]) * x;
  }
  return out;
}

// the movement a character does in a shot at progress p (0..1 through the spoken sentence); several actions add up
export function motionFor(shot, ci, p) {
  let res = null;
  for (const a of shot.actions || []) {
    if (a.who !== ci) continue;
    const at = a.at === undefined ? 0 : a.at, dur = a.dur === undefined ? 0.6 : a.dur;
    const u0 = (p - at) / Math.max(0.05, dur);
    if (u0 < 0 || u0 > 1) continue;
    const rep = Math.max(1, a.repeat || 1);
    const u = rep > 1 ? (u0 * rep) % 1 : u0;
    const keys = (a.do === 'custom' ? a.keys : ACTIONS[a.do]) || [];
    if (!keys.length) continue;
    const v = evalKeys(keys, u, a.ease || 'smooth');
    const w = ss(Math.min(1, u0 / 0.12, (1 - u0) / 0.12));                 // eases in and out so it never snaps
    res = res || {w: 0};
    for (const c of CHANNELS) if (v[c] !== undefined) res[c] = (c === 'armL' || c === 'armR') ? v[c] : (res[c] || 0) + v[c];
    res.w = Math.max(res.w, w);
  }
  return res;
}
