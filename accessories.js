// Costume pieces that turn a plain character into a cowboy, miner, pirate... Everything is built from the same flat, inked shapes as the
// characters. H = helpers handed in by char.js (flat, circlePts, stick, THREE, glow). Coordinates:
//   head / face items: head space (head radius about 0.33, top of head at y 0.31)
//   neck / torso / back items: body space (feet at y 0, shoulders at 1.17, neck at 1.27)
//   held items: hand space (origin in the hand, +y up the arm when it hangs down)
export const ACC = {};
const def = (id, slot, build, anim) => { ACC[id] = {slot, build, anim}; };
const rect = (H, x0, y0, x1, y1, color, z, seed = 1, band = 0.012) => H.flat([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], color, z, band, seed);
const star = (H, cx, cy, r, color, z, seed) => { const p = []; for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; p.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); } return H.flat(p, color, z, 0.008, seed); };
const G = (H) => new H.THREE.Group();

// ---------------- hats ----------------
def('cowboy_hat', 'head', (H) => { const g = G(H), tan = '#b8864b';
  g.add(H.flat([[-0.5, 0.27], [-0.32, 0.16], [0.32, 0.16], [0.5, 0.27], [0.3, 0.22], [-0.3, 0.22]], tan, 0.036, 0.02, 31));
  g.add(H.flat([[-0.22, 0.19], [-0.19, 0.45], [-0.05, 0.4], [0.05, 0.4], [0.19, 0.45], [0.22, 0.19]], tan, 0.037, 0.02, 32));
  g.add(rect(H, -0.22, 0.19, 0.22, 0.26, '#5a3a22', 0.038, 33, 0.008)); return g; });
def('hard_hat', 'head', (H) => { const g = G(H);
  g.add(H.flat(H.circlePts(0, 0.17, 0.31, 0.24, 22, 0, Math.PI), '#f2c12e', 0.035, 0.02, 34));
  g.add(rect(H, -0.37, 0.14, 0.37, 0.19, '#e0ae1f', 0.036, 35, 0.015)); g.add(rect(H, -0.03, 0.2, 0.03, 0.41, '#e0ae1f', 0.037, 36, 0.008)); return g; });
def('miner_helmet', 'head', (H) => { const g = ACC.hard_hat.build(H); const lamp = H.flat(H.circlePts(0, 0.3, 0.075, 0.075, 14), '#fff2a8', 0.04, 0.012, 37); g.add(lamp);
  const gl = H.glow('#ffe6a0', 0.9, 0.6); gl.position.set(0, 0.3, 0.06); g.add(gl); g.userData.glow = gl; return g; },
  (g, t) => { const gl = g.userData.glow; if (gl) gl.material.opacity = 0.5 + 0.12 * Math.sin(t * 5); });
def('chef_hat', 'head', (H) => { const g = G(H);
  g.add(rect(H, -0.24, 0.18, 0.24, 0.3, '#fbf7ee', 0.035, 38, 0.014));
  for (const [x, y, r] of [[-0.17, 0.42, 0.14], [0.0, 0.5, 0.17], [0.17, 0.42, 0.14]]) g.add(H.flat(H.circlePts(x, y, r, r, 18), '#fbf7ee', 0.036, 0.014, 39 + Math.round(x * 10))); return g; });
def('crown', 'head', (H) => { const g = G(H);
  g.add(H.flat([[-0.24, 0.2], [0.24, 0.2], [0.26, 0.44], [0.13, 0.34], [0, 0.48], [-0.13, 0.34], [-0.26, 0.44]], '#f2c12e', 0.035, 0.016, 40));
  g.add(H.flat(H.circlePts(0, 0.27, 0.035, 0.035, 10), '#c8372d', 0.037, 0.006, 41)); return g; });
def('wizard_hat', 'head', (H) => { const g = G(H);
  g.add(H.flat([[-0.28, 0.2], [0.28, 0.2], [0.16, 0.5], [0.22, 0.82], [0.06, 0.78], [-0.08, 0.55]], '#4a3a8a', 0.035, 0.018, 42));
  g.add(H.flat([[-0.46, 0.22], [0.46, 0.22], [0.4, 0.14], [-0.4, 0.14]], '#3a2c6e', 0.036, 0.018, 43));
  g.add(star(H, 0.0, 0.38, 0.06, '#f2c12e', 0.038, 44)); return g; });
def('pirate_hat', 'head', (H) => { const g = G(H);
  g.add(H.flat([[-0.5, 0.2], [-0.25, 0.44], [0, 0.34], [0.25, 0.44], [0.5, 0.2], [0.3, 0.12], [-0.3, 0.12]], '#2a2527', 0.035, 0.02, 45));
  g.add(H.flat(H.circlePts(0, 0.25, 0.06, 0.06, 12), '#f4f1ea', 0.037, 0.008, 46)); return g; });
def('beanie', 'head', (H, P) => { const g = G(H);
  g.add(H.flat(H.circlePts(0, 0.12, 0.33, 0.27, 20, 0, Math.PI), P.jacket2, 0.035, 0.02, 47));
  g.add(rect(H, -0.34, 0.08, 0.34, 0.17, '#e9e2cf', 0.036, 48, 0.012)); g.add(H.flat(H.circlePts(0, 0.42, 0.07, 0.07, 12), '#e9e2cf', 0.036, 0.01, 49)); return g; });
def('police_cap', 'head', (H) => { const g = G(H);
  g.add(H.flat(H.circlePts(0, 0.18, 0.3, 0.16, 20, 0, Math.PI), '#26355a', 0.035, 0.02, 50));
  g.add(H.flat([[-0.05, 0.2], [0.42, 0.18], [0.42, 0.14], [-0.05, 0.14]], '#1b2745', 0.036, 0.016, 51));
  g.add(H.flat(H.circlePts(0, 0.22, 0.05, 0.05, 10), '#f2c12e', 0.038, 0.006, 52)); return g; });
def('sailor_hat', 'head', (H) => { const g = G(H);
  g.add(H.flat(H.circlePts(0, 0.17, 0.3, 0.17, 20, 0, Math.PI), '#fbf7ee', 0.035, 0.018, 53));
  g.add(H.flat([[-0.34, 0.19], [0.34, 0.19], [0.3, 0.1], [-0.3, 0.1]], '#2f5d9e', 0.036, 0.016, 54)); return g; });
def('knight_helmet', 'head', (H) => { const g = G(H);
  g.add(H.flat(H.circlePts(0, 0.17, 0.35, 0.3, 24, 0, Math.PI), '#9aa0a8', 0.035, 0.02, 55));
  g.add(rect(H, -0.03, -0.02, 0.03, 0.3, '#868c94', 0.037, 56, 0.01));
  g.add(H.flat([[-0.04, 0.46], [0.04, 0.46], [0.1, 0.62], [-0.02, 0.6]], '#c8372d', 0.034, 0.012, 57)); return g; });
def('headband', 'head', (H) => { const g = G(H);
  g.add(rect(H, -0.34, 0.12, 0.34, 0.19, '#c8372d', 0.035, 58, 0.012)); g.add(H.flat([[-0.34, 0.17], [-0.56, 0.08], [-0.5, 0.22]], '#c8372d', 0.034, 0.01, 59)); return g; });
def('beret', 'head', (H) => { const g = G(H);
  g.add(H.flat(H.circlePts(0.05, 0.28, 0.32, 0.12, 20), '#7a2a30', 0.035, 0.018, 60)); g.add(H.flat(H.circlePts(0.05, 0.4, 0.03, 0.03, 8), '#7a2a30', 0.036, 0.006, 61)); return g; });
def('explorer_hat', 'head', (H) => { const g = G(H);
  g.add(H.flat(H.circlePts(0, 0.15, 0.33, 0.27, 22, 0, Math.PI), '#d8c08a', 0.035, 0.02, 62));
  g.add(rect(H, -0.43, 0.11, 0.43, 0.17, '#c4aa72', 0.036, 63, 0.015)); g.add(rect(H, -0.31, 0.2, 0.31, 0.25, '#7a5a30', 0.037, 64, 0.008)); return g; });
def('straw_hat', 'head', (H) => { const g = G(H);
  g.add(H.flat(H.circlePts(0, 0.19, 0.52, 0.1, 24), '#e0c070', 0.035, 0.018, 65));
  g.add(H.flat(H.circlePts(0, 0.2, 0.24, 0.2, 18, 0, Math.PI), '#e8cc7e', 0.036, 0.018, 66)); g.add(rect(H, -0.24, 0.2, 0.24, 0.26, '#c8372d', 0.037, 67, 0.008)); return g; });
def('fedora', 'head', (H) => { const g = G(H);
  g.add(H.flat([[-0.44, 0.22], [-0.3, 0.15], [0.3, 0.15], [0.44, 0.22], [0.3, 0.2], [-0.3, 0.2]], '#6b5b4b', 0.036, 0.018, 68));
  g.add(H.flat([[-0.22, 0.19], [-0.2, 0.4], [-0.02, 0.36], [0.02, 0.36], [0.2, 0.4], [0.22, 0.19]], '#6b5b4b', 0.037, 0.018, 69));
  g.add(rect(H, -0.22, 0.19, 0.22, 0.25, '#2f2623', 0.038, 70, 0.008)); return g; });

// ---------------- face ----------------
def('mustache', 'face', (H, P, hair) => { const g = G(H);
  g.add(H.flat(H.circlePts(-0.075, -0.075, 0.08, 0.036, 16), hair, 0.062, 0.01, 71)); g.add(H.flat(H.circlePts(0.075, -0.075, 0.08, 0.036, 16), hair, 0.062, 0.01, 72));
  g.add(H.flat(H.circlePts(-0.16, -0.05, 0.03, 0.03, 8), hair, 0.063, 0.008, 73)); g.add(H.flat(H.circlePts(0.16, -0.05, 0.03, 0.03, 8), hair, 0.063, 0.008, 74)); return g; });
def('beard', 'face', (H, P, hair) => { const g = G(H);
  g.add(H.flat([[-0.34, 0.02], [-0.31, -0.26], [-0.16, -0.45], [0, -0.5], [0.16, -0.45], [0.31, -0.26], [0.34, 0.02]], hair, -0.012, 0.016, 75)); return g; });
def('goggles', 'face', (H) => { const g = G(H);
  g.add(rect(H, -0.35, 0.17, 0.35, 0.22, '#6b4430', 0.045, 76, 0.01));
  for (const x of [-0.12, 0.12]) g.add(H.flat(H.circlePts(x, 0.2, 0.09, 0.09, 16), '#9fd7e8', 0.047, 0.016, 77 + Math.round(x * 10))); return g; });
def('eyepatch', 'face', (H) => { const g = G(H);
  g.add(H.stick(0.11, 0.05, -0.33, 0.2, 0.012, 0.012)); g.add(H.flat(H.circlePts(0.11, -0.005, 0.09, 0.09, 14), '#1c1a1b', 0.062, 0.008, 79)); return g; });

// ---------------- neck / torso / back ----------------
def('bandana', 'neck', (H) => { const g = G(H);
  g.add(H.flat([[-0.18, 1.29], [0.18, 1.29], [0, 1.0]], '#c43d32', 0.036, 0.012, 80));
  for (const [x, y] of [[-0.07, 1.2], [0.06, 1.2], [0, 1.1]]) g.add(H.flat(H.circlePts(x, y, 0.017, 0.017, 6), '#fbf7ee', 0.038, 0.002, 81)); return g; });
def('scarf', 'neck', (H) => { const g = G(H);
  g.add(rect(H, -0.21, 1.2, 0.21, 1.3, '#d9a441', 0.036, 82, 0.012)); g.add(rect(H, 0.08, 0.9, 0.2, 1.22, '#c48a2c', 0.037, 83, 0.012)); return g; });
def('bowtie', 'neck', (H) => { const g = G(H);
  g.add(H.flat([[0, 1.22], [-0.14, 1.31], [-0.14, 1.13]], '#c8372d', 0.04, 0.008, 84)); g.add(H.flat([[0, 1.22], [0.14, 1.31], [0.14, 1.13]], '#c8372d', 0.04, 0.008, 85));
  g.add(H.flat(H.circlePts(0, 1.22, 0.03, 0.03, 8), '#a52a22', 0.041, 0.006, 86)); return g; });
def('badge', 'torso', (H) => { const g = G(H); g.add(star(H, -0.1, 1.05, 0.085, '#f2c12e', 0.036, 87)); return g; });
def('vest', 'torso', (H) => { const g = G(H), c = '#6b4430';
  g.add(H.flat([[-0.27, 1.2], [-0.04, 1.24], [-0.03, 0.8], [-0.25, 0.77]], c, 0.016, 0.014, 88)); g.add(H.flat([[0.27, 1.2], [0.04, 1.24], [0.03, 0.8], [0.25, 0.77]], c, 0.016, 0.014, 89));
  for (const y of [1.05, 0.93]) g.add(H.flat(H.circlePts(0.06, y, 0.015, 0.015, 6), '#f2c12e', 0.034, 0.002, 90)); return g; });
def('apron', 'torso', (H) => { const g = G(H);
  g.add(H.flat([[-0.17, 1.2], [0.17, 1.2], [0.21, 0.72], [-0.21, 0.72]], '#efe8d8', 0.018, 0.014, 91)); g.add(rect(H, -0.12, 0.85, 0.12, 0.76, '#ddd5c2', 0.02, 92, 0.008)); return g; });
def('lab_coat', 'torso', (H) => { const g = G(H);
  g.add(H.flat([[-0.27, 1.22], [0.27, 1.22], [0.31, 0.6], [-0.31, 0.6]], '#f4f1ea', 0.017, 0.016, 93)); g.add(rect(H, 0.07, 1.0, 0.18, 0.93, '#ddd8cc', 0.02, 94, 0.008)); return g; });
def('belt', 'torso', (H) => { const g = G(H);
  g.add(rect(H, -0.27, 0.89, 0.27, 0.83, '#4a3322', 0.019, 95, 0.008)); g.add(rect(H, -0.04, 0.9, 0.04, 0.82, '#f2c12e', 0.021, 96, 0.006)); return g; });
def('cape', 'back', (H) => { const g = G(H);
  g.add(H.flat([[-0.22, 1.25], [0.22, 1.25], [0.46, 0.34], [-0.46, 0.34]], '#a8332f', -0.025, 0.02, 97)); return g; },
  (g, t, E) => { g.scale.x = 1 + Math.sin(t * 2.1) * 0.04 + E.shake * 0.05; });
def('backpack', 'back', (H) => { const g = G(H);
  g.add(H.flat([[-0.31, 1.14], [0.31, 1.14], [0.33, 0.68], [-0.33, 0.68]], '#8a5a3b', -0.03, 0.02, 98));
  g.add(H.stick(-0.17, 1.17, -0.13, 0.86, 0.018, 0.018)); g.add(H.stick(0.17, 1.17, 0.13, 0.86, 0.018, 0.018)); return g; });

// ---------------- held items (hand space), with their own motion ----------------
const swing = (g, t, E) => { g.rotation.z = Math.sin(t * 4.2 * E.spd) * (0.12 + E.arms * 0.5); };
const sway = (g, t, E) => { g.rotation.z = Math.sin(t * 2.2) * (0.08 + E.shake * 0.2); };
def('pickaxe', 'hand', (H) => { const g = G(H);
  g.add(rect(H, -0.025, -0.3, 0.025, 0.62, '#8a5a3b', 0.02, 100)); g.add(H.flat([[-0.3, 0.55], [0.3, 0.55], [0.36, 0.43], [0.0, 0.5], [-0.36, 0.43]], '#8d9199', 0.022, 0.014, 101)); return g; }, swing);
def('hammer', 'hand', (H) => { const g = G(H);
  g.add(rect(H, -0.025, -0.3, 0.025, 0.5, '#8a5a3b', 0.02, 102)); g.add(rect(H, -0.17, 0.46, 0.17, 0.62, '#6a6e75', 0.022, 103, 0.014)); return g; }, swing);
def('wrench', 'hand', (H) => { const g = G(H);
  g.add(rect(H, -0.03, -0.3, 0.03, 0.45, '#9aa0a8', 0.02, 104)); g.add(H.flat(H.circlePts(0, 0.52, 0.1, 0.1, 12), '#9aa0a8', 0.022, 0.012, 105));
  g.add(rect(H, -0.025, 0.5, 0.025, 0.65, '#c9ccd2', 0.024, 106, 0.0)); return g; }, swing);
def('sword', 'hand', (H) => { const g = G(H);
  g.add(rect(H, -0.025, -0.2, 0.025, -0.02, '#6b4430', 0.02, 107)); g.add(rect(H, -0.12, -0.02, 0.12, 0.03, '#f2c12e', 0.022, 108));
  g.add(H.flat([[-0.04, 0.03], [0.04, 0.03], [0.03, 0.8], [0, 0.88], [-0.03, 0.8]], '#d5d9de', 0.021, 0.012, 109)); return g; }, swing);
def('torch', 'hand', (H) => { const g = G(H);
  g.add(rect(H, -0.025, -0.3, 0.025, 0.45, '#6b4430', 0.02, 110));
  const fl = H.flat([[-0.09, 0.45], [0.09, 0.45], [0.07, 0.62], [0, 0.82], [-0.07, 0.62]], '#ff8a2b', 0.022, 0.008, 111); g.add(fl);
  const gl = H.glow('#ffb55a', 1.3, 0.6); gl.position.set(0, 0.6, 0.05); g.add(gl); g.userData.fl = fl; g.userData.glow = gl; return g; },
  (g, t) => { const f = g.userData.fl; if (f) f.scale.set(1 + 0.12 * Math.sin(t * 17), 1 + 0.2 * Math.sin(t * 13 + 1), 1); g.userData.glow.material.opacity = 0.5 + 0.15 * Math.sin(t * 11); g.rotation.z = Math.sin(t * 2) * 0.05; });
def('lantern', 'hand', (H) => { const g = G(H);
  g.add(H.stick(0, 0.0, 0, 0.12, 0.012, 0.012)); g.add(rect(H, -0.09, -0.22, 0.09, 0.0, '#2a2a2a', 0.02, 112, 0.01)); g.add(rect(H, -0.06, -0.19, 0.06, -0.03, '#ffd37a', 0.022, 113, 0.004));
  const gl = H.glow('#ffd37a', 1.1, 0.6); gl.position.set(0, -0.1, 0.05); g.add(gl); g.userData.glow = gl; return g; },
  (g, t, E) => { g.rotation.z = Math.sin(t * 2.2) * (0.08 + E.shake * 0.2); g.userData.glow.material.opacity = 0.5 + 0.12 * Math.sin(t * 7); });
def('umbrella', 'hand', (H) => { const g = G(H);
  g.add(rect(H, -0.015, -0.3, 0.015, 0.55, '#3a2e2a', 0.02, 114, 0.008)); g.add(H.flat(H.circlePts(0, 0.5, 0.46, 0.26, 20, 0, Math.PI), '#c8372d', 0.022, 0.016, 115)); return g; }, sway);
def('cane', 'hand', (H) => { const g = G(H);
  g.add(rect(H, -0.02, -0.3, 0.02, 0.55, '#4a3322', 0.02, 116, 0.008)); g.add(H.flat(H.circlePts(0, 0.6, 0.06, 0.06, 10), '#f2c12e', 0.022, 0.01, 117)); return g; }, sway);
def('staff', 'hand', (H) => { const g = G(H);
  g.add(rect(H, -0.025, -0.4, 0.025, 0.75, '#6b4430', 0.02, 118)); g.add(H.flat(H.circlePts(0, 0.84, 0.09, 0.09, 14), '#9fd7ff', 0.022, 0.012, 119));
  const gl = H.glow('#9fd7ff', 1.2, 0.6); gl.position.set(0, 0.84, 0.05); g.add(gl); g.userData.glow = gl; return g; },
  (g, t) => { g.userData.glow.material.opacity = 0.5 + 0.2 * Math.sin(t * 3); g.rotation.z = Math.sin(t * 1.5) * 0.04; });
def('scroll', 'hand', (H) => { const g = G(H);
  g.add(rect(H, -0.07, -0.2, 0.07, 0.3, '#efe3c0', 0.02, 120)); for (const y of [-0.2, 0.3]) g.add(H.flat(H.circlePts(0, y, 0.09, 0.04, 10), '#8a5a3b', 0.022, 0.008, 121)); return g; }, sway);
def('flask', 'hand', (H) => { const g = G(H);
  g.add(rect(H, -0.04, 0.0, 0.04, 0.2, '#bfe6f2', 0.02, 122, 0.01)); g.add(H.flat([[-0.04, 0.0], [0.04, 0.0], [0.17, -0.22], [-0.17, -0.22]], '#bfe6f2', 0.021, 0.012, 123));
  g.add(H.flat([[-0.13, -0.16], [0.13, -0.16], [0.17, -0.22], [-0.17, -0.22]], '#6dd16a', 0.023, 0.0, 124)); return g; },
  (g, t) => { g.rotation.z = Math.sin(t * 3) * 0.06; });
def('moneybag', 'hand', (H) => { const g = G(H);
  g.add(H.flat(H.circlePts(0, -0.1, 0.17, 0.2, 16), '#a8793f', 0.02, 0.014, 125)); g.add(rect(H, -0.06, 0.07, 0.06, 0.15, '#a8793f', 0.021, 126, 0.01));
  g.add(H.flat(H.circlePts(0, -0.1, 0.07, 0.07, 10), '#f2c12e', 0.023, 0.008, 127)); return g; }, sway);
def('clipboard', 'hand', (H) => { const g = G(H);
  g.add(rect(H, -0.14, -0.28, 0.14, 0.12, '#8a5a3b', 0.02, 128)); g.add(rect(H, -0.11, -0.25, 0.11, 0.08, '#f4f1ea', 0.022, 129, 0.006)); g.add(rect(H, -0.05, 0.1, 0.05, 0.15, '#9aa0a8', 0.024, 130, 0.008)); return g; });
def('telescope', 'hand', (H) => { const g = G(H);
  g.add(rect(H, -0.045, -0.15, 0.045, 0.2, '#c79a3b', 0.02, 131)); g.add(rect(H, -0.065, 0.2, 0.065, 0.5, '#d8b050', 0.021, 132)); g.add(rect(H, -0.08, 0.5, 0.08, 0.6, '#8a6a2a', 0.022, 133)); g.rotation.z = -0.25; return g; });
def('magnifier', 'hand', (H) => { const g = G(H);
  g.add(rect(H, -0.02, -0.25, 0.02, 0.15, '#6b4430', 0.02, 134, 0.008)); g.add(H.flat(H.circlePts(0, 0.3, 0.17, 0.17, 18), '#bfe6f2', 0.022, 0.02, 135)); return g; },
  (g, t) => { g.rotation.z = Math.sin(t * 1.6) * 0.1; });
def('ladle', 'hand', (H) => { const g = G(H);
  g.add(rect(H, -0.02, -0.25, 0.02, 0.4, '#9aa0a8', 0.02, 136, 0.008)); g.add(H.flat(H.circlePts(0, 0.45, 0.1, 0.1, 12, Math.PI, Math.PI * 2), '#9aa0a8', 0.022, 0.012, 137)); return g; }, swing);
def('book', 'hand', (H) => { const g = G(H);
  g.add(rect(H, -0.12, -0.2, 0.12, 0.12, '#9b3d32', 0.02, 138)); g.add(rect(H, 0.08, -0.18, 0.12, 0.1, '#f2e6cc', 0.022, 139, 0.004)); return g; });
def('lasso', 'hand', (H) => { const g = G(H);
  // coil in the hand, rope up to a big loop that spins
  g.add(H.flat(H.circlePts(0, -0.02, 0.1, 0.07, 14), '#c9a46a', 0.022, 0.012, 140));
  g.add(H.stick(0, 0.02, 0.05, 0.75, 0.012, 0.012));
  const loop = new H.THREE.Group(); loop.position.set(0.05, 0.85, 0.03);
  const mk = (r, color, w) => new H.THREE.Mesh(new H.THREE.TorusGeometry(r, w, 6, 28), new H.THREE.MeshBasicMaterial({color}));
  const ink = mk(0.44, '#1c1a1b', 0.034); ink.position.z = -0.004; const rope = mk(0.44, '#d9b878', 0.022);
  loop.add(ink, rope); g.add(loop); g.userData.loop = loop; return g; },
  (g, t, E) => { const L = g.userData.loop; const w = t * (6 + 5 * E.spd); L.scale.x = 0.18 + 0.82 * Math.abs(Math.cos(w)); L.rotation.z = Math.sin(w * 0.5) * 0.25; });

// ---------------- hair ----------------
export const HAIR = {
  spiky: (H, c) => H.flat([[-0.3, 0.2], [-0.26, 0.52], [-0.15, 0.3], [-0.08, 0.6], [0, 0.32], [0.1, 0.62], [0.17, 0.3], [0.27, 0.52], [0.3, 0.2]], c, 0.012, 0.012, 150),
  long: (H, c) => { const g = G(H); g.add(H.flat([[-0.34, 0.15], [-0.47, -0.45], [-0.3, -0.52], [-0.27, 0.0]], c, -0.01, 0.012, 151)); g.add(H.flat([[0.34, 0.15], [0.47, -0.45], [0.3, -0.52], [0.27, 0.0]], c, -0.01, 0.012, 152)); return g; },
  bun: (H, c) => H.flat(H.circlePts(0, 0.45, 0.13, 0.13, 14), c, 0.008, 0.012, 153),
  curly: (H, c) => { const g = G(H); for (let i = 0; i < 8; i++) { const a = Math.PI * (0.05 + i * 0.127); g.add(H.flat(H.circlePts(Math.cos(a) * 0.3, 0.02 + Math.sin(a) * 0.3, 0.1, 0.1, 10), c, 0.008, 0.01, 154 + i)); } return g; },
};

export const ROLES = {
  cowboy: {ids: ['cowboy_hat', 'bandana', 'vest', 'belt', 'mustache'], held: 'lasso'},
  sheriff: {ids: ['cowboy_hat', 'badge', 'vest', 'belt', 'mustache'], held: ''},
  miner: {ids: ['miner_helmet', 'belt', 'backpack'], held: 'pickaxe'},
  prospector: {ids: ['straw_hat', 'beard', 'vest', 'backpack'], held: 'pickaxe'},
  pirate: {ids: ['pirate_hat', 'eyepatch', 'beard', 'bandana'], held: 'sword'},
  sailor: {ids: ['sailor_hat', 'scarf'], held: 'telescope'},
  scientist: {ids: ['lab_coat', 'goggles'], held: 'flask', hair: 'spiky'},
  inventor: {ids: ['goggles', 'apron', 'belt'], held: 'wrench', hair: 'spiky'},
  chef: {ids: ['chef_hat', 'apron', 'mustache'], held: 'ladle'},
  knight: {ids: ['knight_helmet', 'cape', 'belt'], held: 'sword'},
  king: {ids: ['crown', 'cape', 'beard'], held: 'cane'},
  wizard: {ids: ['wizard_hat', 'cape', 'beard'], held: 'staff'},
  detective: {ids: ['fedora', 'scarf', 'mustache'], held: 'magnifier'},
  explorer: {ids: ['explorer_hat', 'vest', 'backpack'], held: 'scroll'},
  farmer: {ids: ['straw_hat', 'apron', 'beard'], held: 'lantern'},
  mechanic: {ids: ['hard_hat', 'belt'], held: 'wrench'},
  merchant: {ids: ['fedora', 'bowtie', 'vest', 'mustache'], held: 'moneybag'},
  police: {ids: ['police_cap', 'badge'], held: ''},
  student: {ids: ['beanie', 'backpack'], held: 'book'},
  artist: {ids: ['beret', 'scarf', 'mustache'], held: ''},
};
export const SKIN = {cream: '#f4ecdc', pale: '#f8efe6', tan: '#e6c29a', brown: '#b9835a', dark: '#7a4e32'};
export const HAIR_COLORS = {black: '#2a1f1a', brown: '#5a3a26', blonde: '#d8b05a', red: '#a8442a', white: '#ece8e0', gray: '#8d8f94'};
export const BUILDS = {tall: [0.94, 1.12], short: [1.06, 0.88], wide: [1.24, 0.98], kid: [0.88, 0.78]};
