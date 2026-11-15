import * as THREE from 'three';
import {INK, rng} from './kit.js';
import {ACC, ROLES, HAIR, SKIN, HAIR_COLORS, BUILDS} from './accessories.js';
import {glow} from './glow.js';

const inkMat = new THREE.MeshBasicMaterial({color: INK, side: THREE.DoubleSide});
const fillCache = new Map();
function fillMat(c) {
  if (!fillCache.has(c)) fillCache.set(c, new THREE.MeshBasicMaterial({color: c, side: THREE.DoubleSide}));
  return fillCache.get(c);
}

// polygon points -> flat fill + wobbly ink band behind it
function flat(pts, color, z, band = 0.022, seed = 1) {
  const g = new THREE.Group();
  const r = rng(seed);
  const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const fill = new THREE.Mesh(new THREE.ShapeGeometry(shape), fillMat(color));
  fill.position.z = z;
  // ink band: offset along vertex normals with slight wobble
  const n = pts.length, out = [];
  for (let i = 0; i < n; i++) {
    const p = pts[i], a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
    let tx = b[0] - a[0], ty = b[1] - a[1]; const L = Math.hypot(tx, ty) || 1; tx /= L; ty /= L;
    const w = band * (0.8 + r() * 0.45);
    out.push(new THREE.Vector2(p[0] + ty * w, p[1] - tx * w));
  }
  // make sure ink is outside: test orientation
  const area = pts.reduce((s, p, i) => s + p[0] * pts[(i + 1) % n][1] - pts[(i + 1) % n][0] * p[1], 0);
  let inkPts = out;
  if (area < 0) {
    inkPts = pts.map((p, i) => { const o = out[i]; return new THREE.Vector2(2 * p[0] - o.x, 2 * p[1] - o.y); });
  }
  const inkM = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(inkPts)), inkMat);
  inkM.position.z = z - 0.004;
  g.add(inkM, fill);
  return g;
}
function circlePts(cx, cy, rx, ry = rx, n = 28, a0 = 0, a1 = Math.PI * 2) {
  const p = []; for (let i = 0; i < n; i++) { const a = a0 + (a1 - a0) * i / (n - (a1 - a0 >= 6.28 ? 0 : 1)); p.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
  return p;
}
function stick(x0, y0, x1, y1, w0, w1) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
  const s = new THREE.Shape([
    new THREE.Vector2(x0 + nx * w0, y0 + ny * w0), new THREE.Vector2(x1 + nx * w1, y1 + ny * w1),
    new THREE.Vector2(x1 - nx * w1, y1 - ny * w1), new THREE.Vector2(x0 - nx * w0, y0 - ny * w0)]);
  return new THREE.Mesh(new THREE.ShapeGeometry(s), inkMat);
}

export const PALETTES = {
  engineer: {jacket: '#3e5a7a', jacket2: '#334c68', tie: '#b3392f', hair: '#4a3328'},
  student: {jacket: '#c4793d', jacket2: '#a9652f', tie: '#2f5d62', hair: '#2b1d17'},
  welder: {jacket: '#5f7d4f', jacket2: '#4f6a41', tie: '#d9a441', hair: '#5a3a26'},
  clerk: {jacket: '#7a4f73', jacket2: '#67425f', tie: '#e0b04a', hair: '#3b2a22'},
  official: {jacket: '#5a5f66', jacket2: '#4b4f55', tie: '#2f6db3', hair: '#8b8178'},
  red: {jacket: '#c8463a', jacket2: '#a93a30', tie: '#f2d36b', hair: '#3b2a22'},
  teal: {jacket: '#2f8f8a', jacket2: '#277873', tie: '#f07a2b', hair: '#2b1d17'},
  mustard: {jacket: '#d9a441', jacket2: '#bf8f36', tie: '#3e5a7a', hair: '#5a3a26'},
  pink: {jacket: '#d77a9c', jacket2: '#bf6687', tie: '#2f5d62', hair: '#6b4430'},
  navy: {jacket: '#2e3f6b', jacket2: '#26355a', tie: '#e0533d', hair: '#1f1a18'},
};

// Emotion presets. Face: brow tilt (+ = inner end down), brow lift, lid openness, eye scale, mouth curve (+ smile / - frown), mouth open/width.
// Body (from research on emotional body movement): spd = tempo, arms = raise/open, lean = trunk lean (+ forward), droop = head bowed,
// sway = side-to-side trunk, shake = trembling, step = walks toward (+) or away from (-) the camera, coverR/coverL = hand to face,
// close = hands held close to the body, turn = slow head turns.
export const EMO = {
  neutral: {brow: 0, browY: 0, lid: 0.55, eyeS: 1, curve: 0.35, open: 0, ow: 1, tilt: 0, bounce: 1, arms: 0, spd: 1, lean: 0, droop: 0, sway: 0.012, shake: 0, step: 0, coverR: 0, coverL: 0, close: 0, turn: 0.05},
  happy: {brow: -0.1, browY: 0.02, lid: 0.7, eyeS: 1, curve: 1, open: 0.3, ow: 1.2, tilt: 0.06, bounce: 2.0, arms: 0.45, spd: 1.6, lean: -0.05, droop: -0.06, sway: 0.05, shake: 0, step: 0.1, coverR: 0, coverL: 0, close: 0, turn: 0.1},
  excited: {brow: -0.15, browY: 0.05, lid: 0.95, eyeS: 1.15, curve: 1, open: 0.65, ow: 1.3, tilt: 0.1, bounce: 3.2, arms: 0.85, spd: 2.3, lean: -0.04, droop: -0.05, sway: 0.06, shake: 0.05, step: 0.15, coverR: 0, coverL: 0, close: 0, turn: 0.12},
  shocked: {brow: -0.2, browY: 0.09, lid: 1, eyeS: 1.3, curve: 0, open: 0.9, ow: 0.8, tilt: 0, bounce: 0.5, arms: 0.55, spd: 1, lean: -0.14, droop: -0.04, sway: 0, shake: 0.35, step: -0.3, coverR: 0, coverL: 0, close: 0, turn: 0},
  scared: {brow: -0.35, browY: 0.07, lid: 1, eyeS: 1.2, curve: -0.5, open: 0.5, ow: 1, tilt: 0.05, bounce: 2.6, arms: 0.2, spd: 1.5, lean: -0.1, droop: 0.08, sway: 0.03, shake: 1, step: -0.5, coverR: 1, coverL: 0.55, close: 0, turn: 0.08},
  angry: {brow: 0.5, browY: -0.02, lid: 0.45, eyeS: 0.9, curve: -0.8, open: 0.35, ow: 1.3, tilt: -0.05, bounce: 1.5, arms: 0.75, spd: 1.6, lean: 0.1, droop: 0.03, sway: 0.025, shake: 0.3, step: 0.35, coverR: 0, coverL: 0, close: 0, turn: 0},
  sad: {brow: -0.4, browY: 0, lid: 0.4, eyeS: 0.95, curve: -1, open: 0, ow: 1, tilt: 0.12, bounce: 0.3, arms: -0.1, spd: 0.45, lean: 0.13, droop: 0.38, sway: 0.015, shake: 0, step: 0, coverR: 0, coverL: 0, close: 0.15, turn: 0.04},
  worried: {brow: -0.3, browY: 0.03, lid: 0.8, eyeS: 1.05, curve: -0.4, open: 0.1, ow: 0.9, tilt: 0.1, bounce: 1, arms: 0.05, spd: 1.3, lean: 0.05, droop: 0.1, sway: 0.035, shake: 0.12, step: -0.05, coverR: 0, coverL: 0, close: 0.75, turn: 0.1},
  smug: {brow: 0.15, browY: 0, lid: 0.4, eyeS: 1, curve: 0.8, open: 0, ow: 1, tilt: -0.1, bounce: 0.8, arms: 0, spd: 0.7, lean: -0.07, droop: -0.09, sway: 0.025, shake: 0, step: 0.05, coverR: 0, coverL: 0, close: 0, turn: 0.14},
  thinking: {brow: -0.1, browY: 0.04, lid: 0.7, eyeS: 1, curve: 0, open: 0, ow: 1, tilt: 0.15, bounce: 0.5, arms: 0, spd: 0.6, lean: 0.03, droop: 0.06, sway: 0.02, shake: 0, step: 0, coverR: 0.95, coverL: 0, close: 0.2, turn: 0.12},
  interested: {brow: -0.12, browY: 0.06, lid: 0.9, eyeS: 1.12, curve: 0.3, open: 0, ow: 1, tilt: 0.08, bounce: 0.6, arms: 0, spd: 0.7, lean: 0.09, droop: 0, sway: 0.01, shake: 0, step: 0.5, coverR: 0, coverL: 0, close: 0, turn: 0.02},
  disgusted: {brow: 0.4, browY: -0.02, lid: 0.4, eyeS: 0.9, curve: -0.9, open: 0.15, ow: 0.9, tilt: -0.08, bounce: 0.6, arms: 0, spd: 1.1, lean: -0.08, droop: -0.02, sway: 0.11, shake: 0, step: -0.18, coverR: 0.15, coverL: 0, close: 1, turn: 0.2},
  bored: {brow: 0.05, browY: -0.03, lid: 0.28, eyeS: 0.95, curve: -0.1, open: 0, ow: 1, tilt: 0.1, bounce: 0.3, arms: -0.05, spd: 0.35, lean: 0.1, droop: 0.26, sway: 0.02, shake: 0, step: 0, coverR: 0, coverL: 0, close: 0, turn: 0.38},
};
const ss = (x) => { const c = Math.min(1, Math.max(0, x)); return c * c * (3 - 2 * c); };
const mixEmo = (A, B, k) => { const o = {}; for (const key in A) o[key] = A[key] + ((B[key] === undefined ? A[key] : B[key]) - A[key]) * k; return o; };

export function character({palette = 'engineer', hat = 'none', glasses = false, seed = 1, scale = 1, role = '', costume = [], held = '', hair = '', hairColor = '', skin = '', build = ''} = {}) {
  const P = PALETTES[palette];
  const skinC = SKIN[skin] || '#f4ecdc';
  const hairCol = HAIR_COLORS[hairColor] || P.hair;
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  // legs (thin tapered sticks) + feet
  // each leg hangs from a hip pivot so it can swing (walk-in, weight shift, hops)
  const legL = new THREE.Group(), legR = new THREE.Group();
  legL.position.set(-0.09, 0.72, 0); legR.position.set(0.09, 0.72, 0);
  legL.add(stick(0, 0, -0.01, -0.67, 0.03, 0.022)); legR.add(stick(0, 0, 0.01, -0.67, 0.03, 0.022));
  legL.add(flat(circlePts(-0.04, -0.68, 0.09, 0.045), INK, 0.0, 0.004, seed + 1)); legR.add(flat(circlePts(0.04, -0.68, 0.09, 0.045), INK, 0.0, 0.004, seed + 2));
  body.add(legL, legR);
  // pear torso, two-tone
  const torso = [];
  for (let i = 0; i <= 20; i++) { const t = i / 20; const a = Math.PI * 2 * t; const y = 0.98 + Math.sin(a) * 0.29; const wid = 0.2 + 0.07 * (1 - (y - 0.69) / 0.58); torso.push([Math.cos(a) * wid, y]); }
  body.add(flat(torso, P.jacket, 0.01, 0.022, seed + 3));
  const lower = []; for (let i = 0; i <= 12; i++) { const a = Math.PI + Math.PI * i / 12; lower.push([Math.cos(a) * 0.255, 0.86 + Math.sin(a) * 0.17]); }
  body.add(flat(lower, P.jacket2, 0.015, 0.0, seed + 4));
  // pocket patch
  body.add(flat([[0.07, 0.98], [0.17, 0.98], [0.16, 0.9], [0.08, 0.9]], P.jacket2, 0.02, 0.008, seed + 5));
  // white collar + tie
  body.add(flat([[-0.11, 1.25], [0, 1.15], [0.11, 1.25], [0.0, 1.28]], '#fbf7ee', 0.025, 0.01, seed + 6));
  body.add(flat([[-0.025, 1.17], [0.025, 1.17], [0.04, 0.98], [0, 0.93], [-0.04, 0.98]], P.tie, 0.03, 0.008, seed + 7));
  // arms
  const armL = new THREE.Group(), armR = new THREE.Group();
  armL.position.set(-0.2, 1.17, 0.012); armR.position.set(0.2, 1.17, 0.012);
  armL.add(stick(0, 0, -0.08, -0.42, 0.026, 0.02)); armR.add(stick(0, 0, 0.08, -0.42, 0.026, 0.02));
  armL.add(flat(circlePts(-0.085, -0.45, 0.05), INK, 0.002, 0.0, seed + 8)); armR.add(flat(circlePts(0.085, -0.45, 0.05), INK, 0.002, 0.0, seed + 9));
  body.add(armL, armR);
  // head
  const head = new THREE.Group(); head.position.set(0, 1.56, 0.04); body.add(head);
  head.add(flat(circlePts(0, 0, 0.33, 0.31, 36), skinC, 0, 0.024, seed + 10));
  // hair fringe
  const fringe = circlePts(0, 0, 0.335, 0.315, 18, 0.15, Math.PI - 0.15);
  fringe.push([-0.24, 0.17], [-0.1, 0.21], [0.04, 0.17], [0.18, 0.22], [0.3, 0.12]);
  const fringeMesh = flat(fringe.reverse(), hairCol, 0.01, 0.012, seed + 11); fringeMesh.visible = hair !== 'bald'; head.add(fringeMesh);
  if (HAIR[hair]) head.add(HAIR[hair]({flat, circlePts, stick, THREE}, hairCol));
  // ---- expressive face: eyes (lids blink/widen), brows, mouth (curve + open for speech) ----
  const eyes = [], brows = [];
  for (const ex of [-0.11, 0.11]) {
    const eye = new THREE.Group(); eye.position.set(ex, -0.005, 0.02); head.add(eye);
    eye.add(flat(circlePts(0, 0, 0.06, 0.07, 18), '#ffffff', 0.0, 0.012, seed + 12));
    const pupil = new THREE.Mesh(new THREE.CircleGeometry(0.026, 12), inkMat); pupil.position.z = 0.012; eye.add(pupil);
    const lid = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.09), fillMat(skinC)); lid.position.set(0, 0.05, 0.016); eye.add(lid);
    const lidLine = stick(-0.065, -0.045, 0.065, -0.045, 0.008, 0.008); lid.add(lidLine); lidLine.position.z = 0.002;
    eyes.push({eye, lid, pupil});
    const brow = new THREE.Group(); brow.position.set(ex, 0.13, 0.05); head.add(brow);
    brow.add(stick(-0.065, 0, 0.065, 0, 0.011, 0.011));
    brows.push({brow, side: ex < 0 ? -1 : 1});
  }
  const mouth = new THREE.Group(); mouth.position.set(0, -0.12, 0.03); head.add(mouth);
  const curve = new THREE.Group(); mouth.add(curve);
  for (let i = 0; i < 8; i++) {
    const x0 = -0.065 + i * 0.13 / 8, x1 = -0.065 + (i + 1) * 0.13 / 8;
    curve.add(stick(x0, 0.04 * (x0 / 0.065) ** 2, x1, 0.04 * (x1 / 0.065) ** 2, 0.008, 0.008));
  }
  const openM = new THREE.Group(); mouth.add(openM); openM.position.y = -0.01;
  openM.add(flat(circlePts(0, 0, 0.055, 0.06, 20), '#7a2a30', 0.0, 0.012, seed + 19));
  const tongue = new THREE.Mesh(new THREE.CircleGeometry(0.03, 12), fillMat('#d9686f')); tongue.position.set(0, -0.032, 0.004); tongue.scale.y = 0.55; openM.add(tongue);
  if (glasses) {
    for (const ex of [-0.11, 0.11]) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.075, 0.095, 24), inkMat); ring.position.set(ex, -0.0, 0.045); head.add(ring);
    }
    const br = stick(-0.035, 0.0, 0.035, 0.0, 0.01, 0.01); br.position.z = 0.045; head.add(br);
  }
  // ---- costume: role preset + extra pieces + held tool, each mounted by slot ----
  const R = ROLES[role] || {ids: [], held: ''};
  const ids = [...R.ids, ...costume.filter((id) => ACC[id] && ACC[id].slot !== 'hand')];
  const heldId = ACC[held] && ACC[held].slot === 'hand' ? held : (R.held || '');
  if (heldId) ids.push(heldId);
  const H = {flat, circlePts, stick, THREE, glow};
  const anims = [];
  const usedSlots = new Set();
  for (const id of ids) {
    const A = ACC[id]; if (!A) continue;
    if ((A.slot === 'head' || A.slot === 'hand') && usedSlots.has(A.slot)) continue;   // one hat, one tool
    usedSlots.add(A.slot);
    const obj = A.build(H, P, hairCol);
    if (A.slot === 'head' || A.slot === 'face') head.add(obj);
    else if (A.slot === 'hand') { obj.position.set(0.085, -0.45, 0.02); armR.add(obj); }
    else body.add(obj);
    if (A.anim) anims.push({g: obj, fn: A.anim});
  }
  const hasHeadItem = usedSlots.has('head');
  // legacy hats are skipped when a costume already put something on the head
  if (hat === 'cap' && !hasHeadItem) {
    head.add(flat(circlePts(0, 0.17, 0.3, 0.13, 20, 0, Math.PI), P.jacket2, 0.035, 0.02, seed + 13));
    head.add(flat([[-0.05, 0.18], [0.42, 0.16], [0.42, 0.12], [-0.05, 0.13]], P.jacket2, 0.036, 0.02, seed + 14));
  } else if (hat === 'bowler' && !hasHeadItem) {
    head.add(flat(circlePts(0, 0.2, 0.24, 0.2, 20, 0, Math.PI), '#2e2a2b', 0.035, 0.02, seed + 15));
    head.add(flat([[-0.38, 0.2], [0.38, 0.2], [0.38, 0.15], [-0.38, 0.15]], '#2e2a2b', 0.036, 0.02, seed + 16));
  } else if (hat === 'top' && !hasHeadItem) {
    head.add(flat([[-0.2, 0.2], [0.2, 0.2], [0.18, 0.62], [-0.18, 0.62]], '#2e2a2b', 0.035, 0.02, seed + 17));
    head.add(flat([[-0.36, 0.22], [0.36, 0.22], [0.36, 0.16], [-0.36, 0.16]], '#2e2a2b', 0.036, 0.02, seed + 18));
  }
  // soft contact shadow blob
  const blob = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24), new THREE.MeshBasicMaterial({color: '#000', transparent: true, opacity: 0.22, depthWrite: false}));
  blob.rotation.x = -Math.PI / 2; blob.position.y = 0.01; blob.scale.y = 0.55;
  root.add(blob);
  const B = BUILDS[build] || [1, 1];
  root.scale.set(B[0] * scale, B[1] * scale, scale);
  const phase = rng(seed)() * 6;
  // pose is set from outside each frame: {emo, talk 0..1}. Everything is a pure function of time (no state).
  root.userData.pose = {emo: 'neutral', talk: 0, age: 99, side: 0, look: 0, listening: false};
  root.userData.update = (t, camPos, baseYaw = 0) => {
    const {emo, talk, age} = root.userData.pose;
    const T = EMO[emo] || EMO.neutral;
    const k = ss(age / 0.35);                       // the emotion eases in over 0.35 s after each cut
    const E = mixEmo(EMO.neutral, T, k);
    const a = age * E.spd + phase;                  // body tempo, local to this shot
    // face
    const bt = ((t * 0.33 + phase * 0.37) % 1);
    const blink = bt < 0.045 ? Math.sin(bt / 0.045 * Math.PI) : 0;
    const lidOpen = Math.max(0, E.lid * (1 - blink));
    for (const e of eyes) {
      e.lid.position.y = -0.025 + lidOpen * 0.14;
      e.eye.scale.set(1, E.eyeS * (1 - 0.5 * blink * (E.lid > 0.7 ? 1 : 0)), 1);
      e.pupil.position.x = Math.sin(t * 0.7 + phase) * 0.012;
    }
    for (const b of brows) {
      b.brow.rotation.z = b.side * E.brow + (talk > 0.15 ? Math.sin(t * 6 + phase) * 0.04 * talk : 0);
      b.brow.position.y = 0.13 + E.browY + talk * 0.015;
    }
    const open = talk > 0 ? Math.min(1, Math.max(E.open * 0.3, talk * 1.3)) : E.open;
    openM.scale.set(E.ow * (0.8 + 0.4 * open), Math.max(0.001, open), 1);
    openM.visible = open > 0.04;
    curve.scale.y = openM.visible && open > 0.35 ? 0.0001 : E.curve;
    curve.scale.x = 1 + 0.25 * Math.max(0, E.curve);
    mouth.position.y = -0.12 - 0.02 * open;
    // trunk and head: lean, slouch, sway, retreat / approach, trembling, slow head turns
    const tremble = E.shake > 0.001;
    // entrance: a short walk-in from the side the character stands on, with a pop (squash and stretch) when they land
    const pose = root.userData.pose;
    const enter = pose.side ? 1 - ss(age / 0.65) : 0;
    const walking = enter > 0.02 ? 1 : 0;
    const stepCycle = Math.sin(age * 15);
    const pop = Math.exp(-age * 6.5) * Math.sin(age * 20);               // damped spring after every cut
    // real hops when excited or happy
    const hop = E.bounce > 1.8 ? Math.max(0, Math.sin(a * 3.1)) * 0.075 * (E.bounce - 1.5) : 0;
    body.position.y = Math.abs(Math.sin(a * 2.2)) * 0.015 * E.bounce + hop + walking * Math.abs(stepCycle) * 0.05 + pop * 0.03;
    body.position.x = (tremble ? Math.sin(t * 53 + phase) * 0.012 * E.shake : 0) + (pose.side || 0) * enter * 1.3 + Math.sin(a * 0.5) * 0.02;   // slow weight shift
    body.position.z = T.step * ss(age / 1.2);
    body.scale.set(1 - pop * 0.045, 1 + pop * 0.06 + Math.sin(t * 1.9 + phase) * 0.006, 1);   // squash-stretch + breathing
    // legs: stride while entering, small weight shift or hop-tuck otherwise
    const stride = walking * stepCycle * 0.55 + (1 - walking) * (Math.sin(a * 0.7) * 0.03 + (hop > 0 ? 0.25 * Math.sin(a * 3.1) : 0));
    legL.rotation.z = stride; legR.rotation.z = -stride;
    body.rotation.x = E.lean;
    body.rotation.z = Math.sin(a * 1.6) * E.sway;
    head.rotation.z = Math.sin(a * 1.3) * 0.05 + E.tilt;
    head.rotation.x = E.droop + nod + (talk > 0 ? Math.sin(t * 9 + phase) * 0.045 * talk : 0) + (tremble ? Math.sin(t * 61 + phase) * 0.03 * E.shake : 0);
    // listeners glance at whoever is speaking and nod along; speakers add beat nods
    const glance = pose.listening ? ss((age - 0.25) / 0.4) * (pose.look || 0) * -0.32 : 0;
    const nod = pose.listening ? Math.max(0, Math.sin(t * 2.6 + phase)) ** 3 * 0.1 : 0;
    head.rotation.y = Math.sin(a * 0.9) * E.turn + glance;
    head.position.y = 1.56 + Math.sin(a * 1.9) * 0.008 + (E.eyeS > 1.2 ? 0.012 : 0) - E.droop * 0.05;
    // arms: open / raised, held close, trembling, or hands in front of the face
    const raise = E.arms * 2.0 * (0.75 + 0.25 * Math.sin(a * 3.2)) + (talk > 0 ? talk * 0.5 * Math.max(0.3, E.arms + 0.2) * Math.sin(t * 7 + phase) : 0);
    const jit = tremble ? Math.sin(t * 47 + phase) * 0.12 * E.shake : 0;
    const wring = E.close * (0.9 + Math.sin(t * 5 + phase) * 0.12);
    const cL = E.coverL, cR = E.coverR;
    armL.rotation.z = (Math.sin(a * 1.6) * 0.08 - raise + wring + jit) * (1 - cL) - 3.3 * cL;
    armR.rotation.z = (-Math.sin(a * 1.4 + 1) * 0.08 + raise * (E.arms > 0.4 ? 1 : 0.35) - wring + jit) * (1 - cR) + 3.3 * cR;
    armL.position.z = 0.012 + cL * 0.14; armR.position.z = 0.012 + cR * 0.14;
    for (const an of anims) an.fn(an.g, t, E);
    // turn toward camera, clamped yaw
    const wp = new THREE.Vector3(); root.getWorldPosition(wp);
    let yaw = Math.atan2(camPos.x - wp.x, camPos.z - wp.z) - baseYaw;
    yaw = Math.max(-0.7, Math.min(0.7, yaw));
    body.rotation.y = yaw + baseYaw - root.rotation.y;
  };
  root.userData.armR = armR; root.userData.armL = armL;
  return root;
}
