import * as THREE from 'three';
import {box, cyl, sign, ground, cloud, facade, crate, rng} from './kit.js';
import {character, PALETTES} from './char.js';
import {LOC, street, room, ease} from './sets.js';
import {wordT, KIND, SHOTS} from './camera.js';
import {dressStreet, dressPlaza, dressOffice, dressYard, dressJoint, dressWeather} from './dress.js';
import * as P from './props.js';
import {cave, desert, forest, harbor, castle} from './sets2.js';
import {makeObject} from './objects.js';
import {makeDetail} from './details.js';
import {glow, dotTexture} from './glow.js';
import {PIECES, PIECE_SLOTS, floorPattern} from './setpieces.js';
import flags from './flags.json';
import {objPos, CUTS, END} from './camera.js';
import {buildProp, PROP_SLOTS} from './propbuilder.js';
import {motionFor} from './motion.js';
import story from './story.json';
import timing from './timing.json';

const ENV = timing.env || [];
const NEW_SETS = {cave, desert, forest, harbor, castle};
const OBJECTS_OK = (n) => typeof n === 'string' && n.length > 0;
const KEYS = timing.shots.map((x) => x.key);
const TS = Object.fromEntries(timing.shots.map((x) => [x.key, x]));
const SHOT_A = (i) => CUTS[i];                                   // a shot lasts from its cut to the next cut
const SHOT_B = (i) => (i + 1 < CUTS.length ? CUTS[i + 1] : END);
// enter / exit progress for something that belongs to shot i: grows in just after the cut, shrinks out just before the next one
const winIn = (t, i) => ease(t, SHOT_A(i) - 0.05, SHOT_A(i) + 0.45);
const winOut = (t, i) => 1 - ease(t, SHOT_B(i) - 0.3, SHOT_B(i) + 0.05);
const bounce = (x) => { const n = 7.5625, d = 2.75; if (x < 1 / d) return n * x * x; if (x < 2 / d) { x -= 1.5 / d; return n * x * x + 0.75; } if (x < 2.5 / d) { x -= 2.25 / d; return n * x * x + 0.9375; } x -= 2.625 / d; return n * x * x + 0.984375; };
const START = Object.fromEntries(timing.shots.map((x) => [x.key, x.start]));
const PREV = Object.fromEntries(timing.shots.map((x, i) => [x.key, i ? timing.shots[i - 1].key : null]));
const DESIGN = story.design || {};
const palOf = (D) => { const p = (D && D.palette) || {}; return {trim: p.trim || '#8d8880', accent: p.accent || '#c8372d', wood: p.wood || '#8a5a2b', sky: p.sky || '#bfe3f5'}; };

// props that suit each place, mixed with the ones the story asks for ("props" in story.json)
const DEFAULT_PROPS = {
  cave: ['lantern', 'pickaxe', 'crate', 'gold'], desert: ['crate', 'bottle', 'chest', 'lantern'], forest: ['lantern', 'chest', 'book', 'bottle'],
  harbor: ['crate', 'bottle', 'chest', 'clock'], castle: ['chest', 'scroll', 'trophy', 'key', 'lantern'], office: ['book', 'clock', 'bulb', 'flask', 'battery'],
  lab: ['flask', 'bulb', 'battery', 'magnet', 'gear'], workshop: ['gear', 'hammer', 'battery', 'crate'], yard: ['crate', 'hammer', 'gear', 'bottle'],
  street_day: ['crate', 'coin', 'bottle'], street_night: ['crate', 'lantern', 'coin'],
};
// slots around the action: [dx, dz (relative to the hero row), scale]. Big enough to read on a phone screen.
const SLOTS = [[-2.7, -0.6, 1.4], [2.9, -0.4, 1.3], [-4.2, -2.2, 1.9], [4.4, -2.6, 1.7], [-2.2, 1.7, 1.0], [0.3, -3.4, 1.7], [3.6, 1.9, 0.9], [-3.4, 0.9, 1.2]];

// calm palette: the set (not the characters or props) is pulled darker, less saturated and a little teal, so the eye rests on the action
const CALM = flags.calm === undefined ? 1 : flags.calm;
const DEEP = new THREE.Color('#1f3440');
const calmCache = new Map();
function calmify(root, pal) {
  const tint = pal && pal.tint ? new THREE.Color(pal.tint) : null;
  const tk = tint ? pal.tint : '';
  const ts = tint ? (pal.tint_strength === undefined ? 0.22 : Math.min(0.4, Math.max(0, pal.tint_strength))) : 0;
  if (!CALM && !tint) return;
  root.traverse((o) => {
    if (!o.isMesh || !o.material || o.userData.keep) return;
    const m = o.material;
    if (Array.isArray(m) || !m.color || m.isMeshBasicMaterial) return;      // basic materials = signs, lit windows, outlines: left bright
    let per = calmCache.get(m); if (!per) { per = new Map(); calmCache.set(m, per); }
    let c = per.get(tk);
    if (!c) {
      c = m.clone();
      if (CALM) { c.color.offsetHSL(0, -0.1 * CALM, -0.05 * CALM); c.color.lerp(DEEP, 0.07 * CALM); }
      if (tint) c.color.lerp(tint, ts);                                       // this place's own colour
      per.set(tk, c);
    }
    o.material = c;
  });
}
const GLOWY = {lantern: '#ffd37a', bulb: '#fff2a8', gold: '#ffd95a', coin: '#ffd95a', key: '#ffd95a', trophy: '#ffd95a', chest: '#ffd95a', clock: '#fff2d0', flask: '#8fe8a8', battery: '#9ef0b0'};
const WALLZ = {office: -5.28, lab: -5.28, workshop: -5.9, cave: -7.4, castle: -6.4, yard: -7.9, harbor: -9.0};
const WALL_XS = [-4.2, -1.2, 2.3, 4.4, -2.9, 0.7, 3.6, -5.2];

// drifting particles that suit the place: dust, fireflies, blowing sand or rising embers
function particles(loc, over) {
  const K = KIND[loc], ox = LOC[loc]; const r = rng(loc.length * 13 + 5);
  const kind = over || ((loc === 'forest' || loc === 'street_night') ? 'fly' : loc === 'desert' ? 'sand' : (loc === 'workshop' || loc === 'cave') ? 'ember' : 'dust');
  const N = kind === 'sand' ? 150 : 100;
  const base = new Float32Array(N * 3), pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { base[i * 3] = ox + (r() - 0.5) * 12; base[i * 3 + 1] = 0.3 + r() * 4.2; base[i * 3 + 2] = K.hz - 4 + r() * 8; }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const color = {dust: '#fff3d0', fly: '#e8ff7a', sand: '#e8c890', ember: '#ff9a3c', snow: '#ffffff', petal: '#ffb6c8'}[kind];
  const mat = new THREE.PointsMaterial({color, size: kind === 'fly' ? 0.16 : (kind === 'snow' || kind === 'petal') ? 0.12 : 0.09, map: dotTexture(), transparent: true, opacity: kind === 'dust' ? 0.6 : 0.9, depthWrite: false});
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false;
  const update = (t) => {
    for (let i = 0; i < N; i++) {
      const ph = i * 1.7; let x = base[i * 3], y = base[i * 3 + 1], z = base[i * 3 + 2];
      if (kind === 'dust') { x += Math.sin(t * 0.3 + ph) * 0.5; y += Math.sin(t * 0.4 + ph * 1.3) * 0.3; z += Math.cos(t * 0.25 + ph) * 0.4; }
      else if (kind === 'fly') { x += Math.sin(t * 0.6 + ph) * 1.2; y = 0.6 + (y % 2.2) + Math.sin(t * 0.8 + ph) * 0.4; z += Math.cos(t * 0.5 + ph) * 1.0; }
      else if (kind === 'sand') { x = ox - 8 + ((x - ox + 8 + t * 3.5 + ph) % 16); y = 0.2 + (y % 1.8) + Math.sin(t * 2 + ph) * 0.15; }
      else if (kind === 'snow' || kind === 'petal') { const sp = kind === 'snow' ? 0.55 : 0.3; y = 4.8 - ((4.8 - y + t * sp + ph) % 4.8); x += Math.sin(t * 0.6 + ph) * (kind === 'snow' ? 0.4 : 0.9); z += Math.cos(t * 0.4 + ph) * 0.4; }
      else { y = 0.3 + ((y + t * 0.5 + ph) % 5); x += Math.sin(t * 1.2 + ph) * 0.3; }
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
    }
    geo.attributes.position.needsUpdate = true;
    if (kind === 'fly') mat.opacity = 0.65 + 0.3 * Math.sin(t * 3);
  };
  return {pts, update};
}

const HATS = ['none', 'bowler', 'cap', 'top'];

// Builds only the locations the story uses (less memory), fills them with the template's props and
// crowds, puts the story's cast in every location and one in-world label sign per shot.
export function buildWorld() {
  const W = new THREE.Group();
  const chars = [];
  const updaters = [];
  const shots = Object.values(SHOTS);
  const used = [...new Set(shots.map((s) => s.location))];

  const locGroups = {};
  for (const loc of used) {
    const ox = LOC[loc];
    const n0 = W.children.length;
    if (NEW_SETS[loc]) {
      W.add(NEW_SETS[loc](ox));
    } else if (loc === 'street_night') {
      W.add(street(ox, {lit: true, seed: 11}));
      const moon = new THREE.Mesh(new THREE.CircleGeometry(6, 32), new THREE.MeshBasicMaterial({color: '#f6ecc8', fog: false}));
      moon.position.set(ox - 60, 120, -150); W.add(moon);
      for (let i = 0; i < 6; i++) W.add(cloud(ox - 70 + i * 30, 95 + (i % 2) * 12, -120, 6, '#3d3f6b'));
      updaters.push(dressStreet(W, ox, {lit: true, seed: 11, chars, avoid: []}));
    } else if (loc === 'street_day') {
      W.add(street(ox, {seed: 23}));
      W.add(ground(40, 30, '#d8cdb8', {x: ox, z: -22, seed: 5, repeat: 5}));
      for (let i = 0; i < 7; i++) W.add(cloud(ox - 80 + i * 28, 100 + (i % 3) * 10, -130, 7));
      updaters.push(dressStreet(W, ox, {seed: 23, chars, avoid: []}));
      dressPlaza(W, ox, chars);
    } else if (loc === 'office') {
      W.add(room(ox, {w: 16, h: 5.5, d: 11, wall: '#bfe0db', seed: 8}));
      const d = P.desk(4.0); d.position.set(ox - 2.5, 0.05, 0.9); W.add(d);
      W.add(box(4.4, 2.5, 0.12, '#2f4a3a', {x: ox + 3.2, y: 2.9, z: -5.35, thick: 0.02}));
      const win = sign('', 2.4, 2.0, {bg: '#bfe3f5', border: true}); win.position.set(ox - 5, 3.1, -5.4); W.add(win);
      dressOffice(W, ox, chars);
    } else if (loc === 'yard') {
      W.add(ground(60, 50, '#b39a72', {x: ox, z: -5, seed: 14, repeat: 8}));
      W.add(facade({w: 20, h: 9, color: '#a86f5c', cols: 4, rows: 2, door: true, seed: 71}).translateX(ox).translateZ(-8));
      W.add(box(20, 9, 10, '#8f6c5e', {x: ox, y: 4.5, z: -13.2, thick: 0.04}));
      for (let i = 0; i < 3; i++) W.add(crate(['PARTS', 'GOODS', 'TOOLS'][i], {x: ox + 3.4 + i * 1.3, y: 0.6, z: -3.0, ry: (i - 1) * 0.1}));
      dressYard(W, ox, chars);
    } else if (loc === 'workshop') {
      W.add(room(ox, {w: 22, h: 8, d: 12, wall: '#8a8fa3', floor: '#6a6570', seed: 19}));
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 8), new THREE.MeshBasicMaterial({color: '#ffe2a6'})); lamp.position.set(ox, 7.0, -1); W.add(lamp);
      W.add(cyl(0.03, 0.03, 1.2, '#2a2a2a', {x: ox, y: 7.6, z: -1}));
      dressJoint(W, ox, chars);
    } else if (loc === 'lab') {
      W.add(room(ox, {w: 16, h: 5.5, d: 11, wall: '#c9dbef', floor: '#8a6a4e', seed: 27}));
      W.add(box(6.2, 3.6, 0.12, '#f4f4ee', {x: ox - 1.0, y: 2.9, z: -5.35, thick: 0.02}));
      dressWeather(W, ox, chars);
    }
    // everything this location added becomes one group, so the place can get its own palette
    const lg = new THREE.Group();
    for (const ch of W.children.slice(n0)) lg.add(ch);
    W.add(lg); locGroups[loc] = lg;
  }

  for (const loc of used) calmify(locGroups[loc], (DESIGN[loc] || {}).palette);   // only the sets: dressing, details, props and cast stay bright

  // set dressing: big story props around the action, gently bobbing, and ambient particles
  const bobbers = [];
  for (const loc of used) {
    const K = KIND[loc], ox = LOC[loc], r = rng(loc.length * 7 + 3);
    const names = [...(story.props || []).filter((n) => OBJECTS_OK(n)), ...(DEFAULT_PROPS[loc] || ['crate'])];
    SLOTS.forEach(([dx, dz0, sc], i) => {
      let dz = dz0;
      if (loc.startsWith('street') && dz > 0.9) dz = 0.9;                // stay on the pavement
      if (loc === 'office' && dx < -0.5 && dz > -0.5) return;            // that is where the desk is
      const o = makeObject(names[(i + loc.length) % names.length]);
      o.position.set(ox + dx, K.hy, K.hz + dz); o.scale.setScalar(sc * (0.9 + r() * 0.3));
      const ry = (r() - 0.5) * 1.4; o.rotation.y = ry;
      const gname = names[(i + loc.length) % names.length];
      if (GLOWY[gname]) { const gl = glow(GLOWY[gname], 1.2, 0.15); gl.position.y = 0.45; o.add(gl); }
      W.add(o); bobbers.push({o, y: K.hy, ry, ph: r() * 6});
    });
    const over = (DESIGN[loc] || {}).particles;
    if (over !== 'none') { const p = particles(loc, over); W.add(p.pts); updaters.push(p.update); }
  }

  // per-place design: floor style and scenery pieces chosen by the set designer, so the same place looks different in every story
  for (const loc of used) {
    const D = DESIGN[loc]; if (!D) continue;
    const K = KIND[loc], ox = LOC[loc], pal = palOf(D);
    if (D.floor && D.floor !== 'none' && !loc.startsWith('street')) W.add(floorPattern(D.floor, ox, K.hz, K.hy, pal));
    (D.pieces || []).slice(0, 6).forEach((pc) => {
      const mk = PIECES[pc.name]; if (!mk) return;
      const sl = PIECE_SLOTS[pc.slot] || PIECE_SLOTS.back_left;
      const R = mk(pal, pc.text);
      let z = K.hz + sl[1];
      if (WALLZ[loc] !== undefined) z = Math.max(z, WALLZ[loc] + 0.9);
      if (loc.startsWith('street')) z = Math.min(Math.max(z, 3.8), 7.0);
      R.g.position.set(ox + sl[0], K.hy, z); R.g.scale.setScalar(sl[2] * (pc.scale || 1)); R.g.rotation.y = sl[0] < 0 ? 0.25 : (sl[0] > 0 ? -0.25 : 0);
      W.add(R.g); if (R.update) updaters.push((t) => R.update(t));
    });
  }

  // tiny story details (posters with story words, steaming cups, candles, mice, birds, moths...)
  for (const loc of used) {
    const K = KIND[loc], ox = LOC[loc], rr = rng(loc.length * 31 + 9);
    (story.details || []).slice(0, 8).forEach((spec, i) => {
      const D = makeDetail(spec.name, spec.text); if (!D) return;
      const side = (i % 2 ? 1 : -1);
      let x, y = K.hy, z;
      if (D.place === 'floor' || D.place === 'stool') {
        x = side * (1.6 + rr() * 2.6); z = K.hz + (rr() * 3.2 - 1.6); if (loc.startsWith('street')) z = Math.min(z, K.hz + 0.9);
        if (D.place === 'stool') { const st = new THREE.Group(); st.add(box(0.4, 0.4, 0.4, '#8a5a3b', {y: 0.2, thick: 0.01})); st.position.set(ox + x, K.hy, z); W.add(st); y = K.hy + 0.4; }
      } else if (D.place === 'wall') {
        if (WALLZ[loc] !== undefined) { x = WALL_XS[i % WALL_XS.length]; y = 1.7 + rr() * 1.1; z = WALLZ[loc] + 0.08; }
        else if (spec.text) { x = side * 3.4; z = K.hz - 1.8; const post = new THREE.Group(); post.add(cyl(0.04, 0.04, 1.5, '#6b4430', {y: 0.75})); post.position.set(ox + x, K.hy, z); W.add(post); y = K.hy + 1.7; z += 0.05; }
        else return;                                                   // no wall here
      } else { x = side * (2.8 + rr() * 1.4); y = 2.7 + rr() * 0.7; z = K.hz - 1.8; }
      D.g.position.set(ox + x, y, z); W.add(D.g);
      if (D.update) updaters.push((t) => D.update(t));
    });
  }

  // basic props made just for one shot: they appear with their shot and leave with it (pop / drop / slide / rise / swing in)
  const sprops = [];
  shots.forEach((sh) => {
    const i = KEYS.indexOf(sh.key); if (i < 0) return;
    const K = KIND[sh.location], ox = LOC[sh.location];
    (sh.scene_props || []).slice(0, 3).forEach((spec) => {
      let slot = PROP_SLOTS[spec.slot] || PROP_SLOTS.left;
      if (sh.object && (spec.slot === 'right' || spec.slot === 'right_front')) slot = PROP_SLOTS.far_right;   // keep clear of the close-up prop
      const g = buildProp(spec);
      let z = K.hz + slot[1]; if (sh.location.startsWith('street')) z = Math.min(z, K.hz + 0.9);
      const bx = ox + slot[0], by = K.hy, sc = g.scale.x;
      g.visible = false; W.add(g);
      const held = Number.isInteger(spec.holder) && (sh.who || [0]).includes(spec.holder);
      sprops.push({g, i, loc: sh.location, holder: held ? spec.holder : undefined, enter: spec.enter || 'pop', motion: spec.motion || 'none', bx, by, bz: z,
        sc: held && spec.scale === undefined ? sc * 0.55 : sc, side: slot[0] < 0 ? -1 : 1, ph: i * 1.3});
    });
  });

  // the story's cast, one copy per location (only the ones named in the current shot are visible)
  const heroes = {};
  for (const loc of used) {
    heroes[loc] = story.cast.map((c, ci) => {
      const h = character({
        palette: PALETTES[c.palette] ? c.palette : 'engineer', hat: HATS.includes(c.hat) ? c.hat : 'none',
        glasses: !!c.glasses, seed: 200 + ci * 7, role: c.role || '', costume: c.costume || [], held: c.held || '',
        hair: c.hair || '', hairColor: c.hair_color || '', skin: c.skin || '', build: c.build || '',
      });
      h.userData.baseScale = h.scale.clone();
      h.visible = false; W.add(h); chars.push(h); return h;
    });
  }

  // props that a character holds go into that character's hand and move with the arm (swing the axe, carry the sack)
  for (const p of sprops) {
    if (p.holder === undefined) continue;
    const h = heroes[p.loc] && heroes[p.loc][p.holder];
    if (h) { h.userData.armR.add(p.g); p.g.position.set(0.085, -0.45, 0.03); p.hero = h; }
  }

  // one in-world label per shot (pops in on the word named by label_word)
  const signs = {};
  for (const sh of shots) {
    if (!sh.label) continue;
    const K = KIND[sh.location];
    const s = sign(String(sh.label).toUpperCase().slice(0, 26), 2.1, 0.8, {bg: '#f2e6cc', w: 640, h: 240, font: 'bold 110px Arial, sans-serif'});
    s.position.set(LOC[sh.location], K.hy + 2.45, K.hz - 0.5);
    const sg = glow('#fff1c4', 3.0, 0.12); sg.position.z = -0.05; s.add(sg);
    s.visible = false; W.add(s);
    signs[sh.key] = {g: s, word: Math.max(0, sh.label_word | 0)};
  }

  // one hero prop per shot that asks for it (close-up reveal), popped in at the start of the shot
  const objs = {};
  for (const sh of shots) {
    if (!sh.object) continue;
    const o = makeObject(sh.object); const p = objPos(sh.location);
    o.position.set(p[0], p[1], p[2]); o.scale.setScalar(1.5); o.rotation.y = -0.35;
    const og = glow('#ffd28a', 1.2, 0.22); og.position.y = 0.5; o.add(og); o.userData.glow = og;
    o.visible = false; W.add(o); objs[sh.key] = o;
  }

  const update = (t, cam, shotKey) => {
    for (const c of chars) c.userData.update(t, cam.position);
    for (const u of updaters) u(t, cam);
    const cur = SHOTS[shotKey];
    const age = cur ? Math.max(0, t - (START[shotKey] || 0)) : 99;
    const prev = cur ? SHOTS[PREV[shotKey]] : null;                                  // previous shot: heroes hand over smoothly
    const slotX = (who, idx) => (who.length === 1 ? 0 : (idx === 0 ? -0.9 : 0.9));
    const poseOf = (sh, ci, a, t0) => {
      const w = (sh.who || [0]).slice(0, 2); const i = w.indexOf(ci);
      const emo = Array.isArray(sh.emotion) ? (sh.emotion[i] || sh.emotion[0]) : sh.emotion;
      const T = TS[sh.key];
      return {emo: emo || 'neutral', talk: sh.speaker === ci ? (ENV[Math.floor(t * 30)] || 0) : 0, age: a,
        mv: motionFor(sh, ci, (t - T.start) / Math.max(0.1, T.end - T.start))};
    };
    for (const loc of used) {
      const K = KIND[loc];
      const who = cur && cur.location === loc ? (cur.who || [0]).slice(0, 2) : [];
      const pWho = prev && cur && prev.location === loc && cur.location === loc ? (prev.who || [0]).slice(0, 2) : [];
      heroes[loc].forEach((h, ci) => {
        const idx = who.indexOf(ci), pi = pWho.indexOf(ci);
        let w = 0, x = 0, ref = cur, a = age;
        if (idx >= 0) {
          const k = ease(age, 0, 0.35);
          x = pi >= 0 ? slotX(pWho, pi) + (slotX(who, idx) - slotX(pWho, pi)) * k : slotX(who, idx);   // glide to the new spot
          w = pi >= 0 ? 1 : k;                                                                          // newcomers grow in
        } else if (pi >= 0 && age < 0.25) {                                                              // leavers shrink out
          w = 1 - ease(age, 0, 0.25); x = slotX(pWho, pi); ref = prev; a = t - (START[PREV[shotKey]] || 0);
        }
        h.visible = w > 0.01;
        if (!h.visible) return;
        h.position.set(LOC[loc] + x, K.hy, K.hz);
        const s = Math.max(0.001, w * (1 + 0.1 * Math.sin(Math.min(1, w) * Math.PI)));            // small pop on arrival
        const bs = h.userData.baseScale; h.scale.set(bs.x * s, bs.y * s, bs.z * s);
        Object.assign(h.userData.pose, poseOf(ref, ci, a));
      });
    }
    for (const b of bobbers) { b.o.position.y = b.y + Math.abs(Math.sin(t * 1.4 + b.ph)) * 0.03; b.o.rotation.y = b.ry + Math.sin(t * 0.5 + b.ph) * 0.15; }
    for (const [key, o] of Object.entries(objs)) {                                  // close-up prop: pops in, shrinks out
      const i = KEYS.indexOf(key); const w = Math.min(winIn(t, i), winOut(t, i));
      o.visible = w > 0.004; if (!o.visible) continue;
      o.userData.glow.material.opacity = 0.2 + 0.06 * Math.sin(t * 3);
      o.scale.setScalar(1.5 * Math.max(0.001, w * (1 + 0.1 * Math.sin(Math.min(1, w) * Math.PI)))); o.rotation.y = -0.35 + Math.sin(t * 0.8) * 0.12;
    }
    for (const [key, o] of Object.entries(signs)) {                                  // signs: pop in on their word, shrink out with the shot
      const i = KEYS.indexOf(key);
      const on = key === shotKey || (t > SHOT_A(i) && t < SHOT_B(i) + 0.05);
      o.g.visible = on;
      if (on) o.g.scale.setScalar(Math.max(0.001, ease(t, wordT(key, o.word), wordT(key, o.word) + 0.35) * winOut(t, i)));
    }
    for (const p of sprops) {                                                         // shot props
      const wIn = winIn(t, p.i), wOut = winOut(t, p.i), w = Math.min(wIn, wOut);
      p.g.visible = w > 0.004 && (!p.hero || p.hero.visible); if (!p.g.visible) continue;
      if (p.hero) {                                                                   // held: follows the hand, just pops in and out
        p.g.position.set(0.085, -0.45, 0.03); p.g.rotation.set(0, 0, 0); p.g.scale.setScalar(p.sc * Math.max(0.001, Math.min(1, w)));
        p.g.userData.flash.material.opacity = 0.35 * Math.sin(Math.min(1, wIn) * Math.PI); continue;
      }
      let dx = 0, dy = 0, rz = 0, ry = 0, k = 1;
      if (p.enter === 'drop') dy = (1 - bounce(wIn)) * 3.5;
      else if (p.enter === 'slide') dx = p.side * (1 - w) * 3.2;
      else if (p.enter === 'rise') dy = -(1 - w) * 1.4;
      else if (p.enter === 'swing_in') rz = -p.side * (1 - wIn) * 1.2;
      if (p.motion === 'bob') dy += Math.abs(Math.sin(t * 1.8 + p.ph)) * 0.05;
      else if (p.motion === 'spin') ry = t * 1.4 + p.ph;
      else if (p.motion === 'swing') rz += Math.sin(t * 2.0 + p.ph) * 0.22;
      else if (p.motion === 'pulse') k = 1 + Math.sin(t * 3 + p.ph) * 0.05;
      const pop = p.enter === 'drop' ? (wOut < 1 ? wOut : 1) : w * (1 + 0.12 * Math.sin(Math.min(1, w) * Math.PI));
      p.g.position.set(p.bx + dx, p.by + dy, p.bz); p.g.rotation.set(0, ry + (p.side < 0 ? 0.25 : -0.25), rz);
      p.g.scale.setScalar(p.sc * Math.max(0.001, pop) * k);
      p.g.userData.flash.material.opacity = 0.35 * Math.sin(Math.min(1, wIn) * Math.PI);        // a quick glow as it arrives
    }
  };
  return {group: W, update};
}
