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
import flags from './flags.json';
import {objPos} from './camera.js';
import story from './story.json';
import timing from './timing.json';

const ENV = timing.env || [];
const NEW_SETS = {cave, desert, forest, harbor, castle};
const OBJECTS_OK = (n) => typeof n === 'string' && n.length > 0;
const START = Object.fromEntries(timing.shots.map((x) => [x.key, x.start]));

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
function calmify(root) {
  if (!CALM) return;
  root.traverse((o) => {
    if (!o.isMesh || !o.material || o.userData.keep) return;
    const m = o.material;
    if (Array.isArray(m) || !m.color || m.isMeshBasicMaterial) return;      // basic materials = signs, lit windows, outlines: left bright
    let c = calmCache.get(m);
    if (!c) { c = m.clone(); c.color.offsetHSL(0, -0.1 * CALM, -0.09 * CALM); c.color.lerp(DEEP, 0.1 * CALM); calmCache.set(m, c); }
    o.material = c;
  });
}
const GLOWY = {lantern: '#ffd37a', bulb: '#fff2a8', gold: '#ffd95a', coin: '#ffd95a', key: '#ffd95a', trophy: '#ffd95a', chest: '#ffd95a', clock: '#fff2d0', flask: '#8fe8a8', battery: '#9ef0b0'};
const WALLZ = {office: -5.28, lab: -5.28, workshop: -5.9, cave: -7.4, castle: -6.4, yard: -7.9, harbor: -9.0};
const WALL_XS = [-4.2, -1.2, 2.3, 4.4, -2.9, 0.7, 3.6, -5.2];

// drifting particles that suit the place: dust, fireflies, blowing sand or rising embers
function particles(loc) {
  const K = KIND[loc], ox = LOC[loc]; const r = rng(loc.length * 13 + 5);
  const kind = (loc === 'forest' || loc === 'street_night') ? 'fly' : loc === 'desert' ? 'sand' : (loc === 'workshop' || loc === 'cave') ? 'ember' : 'dust';
  const N = kind === 'sand' ? 150 : 100;
  const base = new Float32Array(N * 3), pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { base[i * 3] = ox + (r() - 0.5) * 12; base[i * 3 + 1] = 0.3 + r() * 4.2; base[i * 3 + 2] = K.hz - 4 + r() * 8; }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const color = {dust: '#fff3d0', fly: '#e8ff7a', sand: '#e8c890', ember: '#ff9a3c'}[kind];
  const mat = new THREE.PointsMaterial({color, size: kind === 'fly' ? 0.16 : 0.09, map: dotTexture(), transparent: true, opacity: kind === 'dust' ? 0.6 : 0.9, depthWrite: false});
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false;
  const update = (t) => {
    for (let i = 0; i < N; i++) {
      const ph = i * 1.7; let x = base[i * 3], y = base[i * 3 + 1], z = base[i * 3 + 2];
      if (kind === 'dust') { x += Math.sin(t * 0.3 + ph) * 0.5; y += Math.sin(t * 0.4 + ph * 1.3) * 0.3; z += Math.cos(t * 0.25 + ph) * 0.4; }
      else if (kind === 'fly') { x += Math.sin(t * 0.6 + ph) * 1.2; y = 0.6 + (y % 2.2) + Math.sin(t * 0.8 + ph) * 0.4; z += Math.cos(t * 0.5 + ph) * 1.0; }
      else if (kind === 'sand') { x = ox - 8 + ((x - ox + 8 + t * 3.5 + ph) % 16); y = 0.2 + (y % 1.8) + Math.sin(t * 2 + ph) * 0.15; }
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

  for (const loc of used) {
    const ox = LOC[loc];
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
  }

  calmify(W);   // only the set so far: dressing, details, props and cast stay bright

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
      if (GLOWY[gname]) { const gl = glow(GLOWY[gname], 1.5, 0.28); gl.position.y = 0.45; o.add(gl); }
      W.add(o); bobbers.push({o, y: K.hy, ry, ph: r() * 6});
    });
    const p = particles(loc); W.add(p.pts); updaters.push(p.update);
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

  // the story's cast, one copy per location (only the ones named in the current shot are visible)
  const heroes = {};
  for (const loc of used) {
    heroes[loc] = story.cast.map((c, ci) => {
      const h = character({
        palette: PALETTES[c.palette] ? c.palette : 'engineer', hat: HATS.includes(c.hat) ? c.hat : 'none',
        glasses: !!c.glasses, seed: 200 + ci * 7, role: c.role || '', costume: c.costume || [], held: c.held || '',
        hair: c.hair || '', hairColor: c.hair_color || '', skin: c.skin || '', build: c.build || '',
      });
      h.visible = false; W.add(h); chars.push(h); return h;
    });
  }

  // one in-world label per shot (pops in on the word named by label_word)
  const signs = {};
  for (const sh of shots) {
    if (!sh.label) continue;
    const K = KIND[sh.location];
    const s = sign(String(sh.label).toUpperCase().slice(0, 26), 2.1, 0.8, {bg: '#f2e6cc', w: 640, h: 240, font: 'bold 110px Arial, sans-serif'});
    s.position.set(LOC[sh.location], K.hy + 2.45, K.hz - 0.5);
    const sg = glow('#fff1c4', 3.4, 0.22); sg.position.z = -0.05; s.add(sg);
    s.visible = false; W.add(s);
    signs[sh.key] = {g: s, word: Math.max(0, sh.label_word | 0)};
  }

  // one hero prop per shot that asks for it (close-up reveal), popped in at the start of the shot
  const objs = {};
  for (const sh of shots) {
    if (!sh.object) continue;
    const o = makeObject(sh.object); const p = objPos(sh.location);
    o.position.set(p[0], p[1], p[2]); o.scale.setScalar(1.5); o.rotation.y = -0.35;
    const og = glow('#ffd28a', 1.5, 0.45); og.position.y = 0.5; o.add(og); o.userData.glow = og;
    o.visible = false; W.add(o); objs[sh.key] = o;
  }

  const update = (t, cam, shotKey) => {
    for (const c of chars) c.userData.update(t, cam.position);
    for (const u of updaters) u(t, cam);
    const cur = SHOTS[shotKey];
    for (const loc of used) {
      const K = KIND[loc];
      const who = cur && cur.location === loc ? (cur.who || [0]).slice(0, 2) : [];
      heroes[loc].forEach((h, ci) => {
        const idx = who.indexOf(ci);
        h.visible = idx >= 0;
        if (idx >= 0) {
          h.position.set(LOC[loc] + (who.length === 1 ? 0 : (idx === 0 ? -0.9 : 0.9)), K.hy, K.hz);
          const emo = Array.isArray(cur.emotion) ? (cur.emotion[idx] || cur.emotion[0]) : cur.emotion;
          h.userData.pose.emo = emo || 'neutral';
          h.userData.pose.talk = cur.speaker === ci ? (ENV[Math.floor(t * 30)] || 0) : 0;
          h.userData.pose.age = Math.max(0, t - (START[shotKey] || 0));
        }
      });
    }
    for (const b of bobbers) { b.o.position.y = b.y + Math.abs(Math.sin(t * 1.4 + b.ph)) * 0.03; b.o.rotation.y = b.ry + Math.sin(t * 0.5 + b.ph) * 0.15; }
    for (const [key, o] of Object.entries(objs)) {
      o.visible = key === shotKey;
      if (o.visible) { o.userData.glow.material.opacity = 0.38 + 0.14 * Math.sin(t * 3); const sh = SHOTS[key]; o.scale.setScalar(1.5 * Math.max(0.001, ease(t, timing.shots.find((x) => x.key === key).start, timing.shots.find((x) => x.key === key).start + 0.3))); o.rotation.y = -0.35 + Math.sin(t * 0.8) * 0.12; }
    }
    for (const [key, o] of Object.entries(signs)) {
      const on = key === shotKey;
      o.g.visible = on;
      if (on) o.g.scale.setScalar(Math.max(0.001, ease(t, wordT(key, o.word), wordT(key, o.word) + 0.35)));
    }
  };
  return {group: W, update};
}
