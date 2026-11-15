import * as THREE from 'three';

let _tex = null;
// soft round dot, shared by glows and particles
export function dotTexture() {
  if (_tex) return _tex;
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  _tex = new THREE.CanvasTexture(c); return _tex;
}

// additive halo sprite: put it behind or on top of something you want to highlight (the bloom pass makes it bleed softly)
export function glow(color = '#ffd28a', size = 1.6, opacity = 0.55) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({map: dotTexture(), color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false}));
  s.scale.set(size, size, 1); s.userData.base = {size, opacity}; s.userData.keep = true;
  return s;
}
