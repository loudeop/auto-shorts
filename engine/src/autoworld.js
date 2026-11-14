import * as THREE from 'three';
import {box, cyl, sign, ground, cloud, facade, crate} from './kit.js';
import {character, PALETTES} from './char.js';
import {LOC, street, room, ease} from './sets.js';
import {wordT, KIND, SHOTS} from './camera.js';
import {dressStreet, dressPlaza, dressOffice, dressYard, dressJoint, dressWeather} from './dress.js';
import * as P from './props.js';
import {cave, desert, forest, harbor, castle} from './sets2.js';
import {makeObject} from './objects.js';
import {objPos} from './camera.js';
import story from './story.json';
import timing from './timing.json';

const ENV = timing.env || [];
const NEW_SETS = {cave, desert, forest, harbor, castle};

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

  // the story's cast, one copy per location (only the ones named in the current shot are visible)
  const heroes = {};
  for (const loc of used) {
    heroes[loc] = story.cast.map((c, ci) => {
      const h = character({
        palette: PALETTES[c.palette] ? c.palette : 'engineer', hat: HATS.includes(c.hat) ? c.hat : 'none',
        glasses: !!c.glasses, seed: 200 + ci * 7,
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
    s.visible = false; W.add(s);
    signs[sh.key] = {g: s, word: Math.max(0, sh.label_word | 0)};
  }

  // one hero prop per shot that asks for it (close-up reveal), popped in at the start of the shot
  const objs = {};
  for (const sh of shots) {
    if (!sh.object) continue;
    const o = makeObject(sh.object); const p = objPos(sh.location);
    o.position.set(p[0], p[1], p[2]); o.scale.setScalar(1.5); o.rotation.y = -0.35;
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
        }
      });
    }
    for (const [key, o] of Object.entries(objs)) {
      o.visible = key === shotKey;
      if (o.visible) { const sh = SHOTS[key]; o.scale.setScalar(1.5 * Math.max(0.001, ease(t, timing.shots.find((x) => x.key === key).start, timing.shots.find((x) => x.key === key).start + 0.3))); o.rotation.y = -0.35 + Math.sin(t * 0.8) * 0.12; }
    }
    for (const [key, o] of Object.entries(signs)) {
      const on = key === shotKey;
      o.g.visible = on;
      if (on) o.g.scale.setScalar(Math.max(0.001, ease(t, wordT(key, o.word), wordT(key, o.word) + 0.35)));
    }
  };
  return {group: W, update};
}
