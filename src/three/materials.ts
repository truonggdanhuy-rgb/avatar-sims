import {PaintPattern} from '../types/game';
import * as THREE from 'three';

export function createCobblestoneTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#D8C19F';
  ctx.fillRect(0, 0, 256, 256);

  const stones = [
    '#E6D2B5',
    '#D2B792',
    '#DEC6A4',
    '#C7A981',
    '#EBDBC1',
  ];

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const offset = (row % 2) * 16;
      const x = (col * 32 + offset) % 256;
      const y = row * 32;
      ctx.fillStyle = stones[(row * 7 + col * 3) % stones.length];
      ctx.beginPath();
      ctx.roundRect(x + 2, y + 2, 27, 26, 7);
      ctx.fill();
      ctx.strokeStyle = 'rgba(110, 82, 54, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  return tex;
}

export function createFlagstonePathTexture(repX = 2, repY = 8): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Earthy mortar bed between stones
  ctx.fillStyle = '#8F7A5E';
  ctx.fillRect(0, 0, 256, 256);

  const stoneColors = [
    '#DFCDB1',
    '#CCB594',
    '#D6C1A2',
    '#E5D7BF',
    '#C3AB89',
    '#D8C5A8',
  ];

  // Irregular staggered flagstones
  const rows = 6;
  const rowH = 256 / rows;
  for (let r = 0; r < rows; r++) {
    const cols = r % 2 === 0 ? 4 : 5;
    let x = r % 2 === 0 ? 2 : -18;
    for (let c = 0; c <= cols; c++) {
      const w = r % 2 === 0 ? 54 + ((r * 13 + c * 19) % 16) : 44 + ((r * 7 + c * 23) % 18);
      const y = r * rowH + 3;
      const h = rowH - 6;
      const col = stoneColors[(r * 5 + c * 3) % stoneColors.length];
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.roundRect(x + 2, y, w - 4, h, 8);
      ctx.fill();

      // Subtle bevel highlight & shadow on each flagstone
      ctx.strokeStyle = 'rgba(255, 248, 232, 0.38)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(84, 64, 42, 0.28)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 3, y + 1, w - 6, h - 2);

      x += w;
    }
  }

  // Subtle stone mineral speckles
  for (let i = 0; i < 160; i++) {
    const sx = (i * 71 + 17) % 256;
    const sy = (i * 113 + 31) % 256;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(95, 76, 52, 0.14)' : 'rgba(255, 252, 240, 0.16)';
    ctx.fillRect(sx, sy, 2, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repX, repY);
  return tex;
}

export function createWoodPlankTexture(base = '#CC965E', seam = '#9E6C3B'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 8; i++) {
    const y = i * 32;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(90,55,25,0.05)';
    ctx.fillRect(0, y, 256, 32);
    ctx.fillStyle = seam;
    ctx.fillRect(0, y, 256, 2);
    const jointX = ((i * 89 + 40) % 210) + 20;
    ctx.fillRect(jointX, y, 2, 32);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

export function createCheckerFloorTexture(a = '#5B4D84', b = '#453969'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const size = 32;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? a : b;
      ctx.fillRect(c * size, r * size, size, size);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

export function createPaintPatternTexture(
  pattern: PaintPattern,
  primary: string,
  secondary: string,
  repX = 3,
  repY = 3,
): THREE.CanvasTexture {
  if (pattern === 'wood_plank') {
    const t = createWoodPlankTexture(primary, secondary);
    t.repeat.set(repX, repY);
    return t;
  }
  if (pattern === 'checker_tile') {
    const t = createCheckerFloorTexture(primary, secondary);
    t.repeat.set(repX, repY);
    return t;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = primary;
  ctx.fillRect(0, 0, 256, 256);

  if (pattern === 'terrazzo') {
    const chips = [secondary, '#E5989B', '#7FB3A8', '#E9C46A', '#A89F91'];
    let s = 0x3a91c25;
    const rnd = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
    for (let i = 0; i < 85; i++) {
      const cx = rnd() * 256;
      const cy = rnd() * 256;
      const r = 4 + rnd() * 7;
      ctx.fillStyle = chips[i % chips.length];
      ctx.beginPath();
      ctx.moveTo(cx + r, cy);
      ctx.lineTo(cx + r * 0.2, cy + r * 0.9);
      ctx.lineTo(cx - r * 0.85, cy + r * 0.35);
      ctx.lineTo(cx - r * 0.4, cy - r * 0.8);
      ctx.closePath();
      ctx.fill();
    }
  } else if (pattern === 'stripes') {
    ctx.fillStyle = secondary;
    for (let x = 0; x < 256; x += 32) {
      ctx.fillRect(x, 0, 14, 256);
    }
  } else if (pattern === 'polka_dot') {
    ctx.fillStyle = secondary;
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const cx = col * 64 + (row % 2 === 0 ? 16 : 48);
        const cy = row * 64 + 32;
        ctx.beginPath();
        ctx.arc(cx, cy, 10, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (pattern === 'matte_wainscot') {
    // Subtle plaster variation + lower wainscot paneling band
    ctx.fillStyle = secondary;
    ctx.fillRect(0, 184, 256, 72);
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillRect(0, 182, 256, 6);
    ctx.strokeStyle = 'rgba(110,85,60,0.14)';
    ctx.lineWidth = 3;
    for (let x = 14; x < 256; x += 64) {
      ctx.strokeRect(x, 196, 36, 44);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repX, repY);
  return tex;
}

export function createGrassTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#70BA58';
  ctx.fillRect(0, 0, size, size);

  // Seeded PRNG (mulberry32) so tiling has no linear-congruence diagonal bands
  let seed = 0x51a9c3d7;
  const rand = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // Soft toroidally-wrapped meadow tonal variations (seamless & non-banded)
  const palette = [
    'rgba(140, 206, 98, 0.08)',
    'rgba(66, 134, 50, 0.065)',
    'rgba(222, 232, 152, 0.055)',
  ];
  for (let i = 0; i < 64; i++) {
    const cx = rand() * size;
    const cy = rand() * size;
    const radius = 14 + rand() * 24;
    const color = palette[i % palette.length];

    for (const ox of [-size, 0, size]) {
      for (const oy of [-size, 0, size]) {
        const px = cx + ox;
        const py = cy + oy;
        if (px + radius < 0 || px - radius > size || py + radius < 0 || py - radius > size) {
          continue;
        }
        const grad = ctx.createRadialGradient(px, py, 0, px, py, radius);
        grad.addColorStop(0, color);
        grad.addColorStop(1, 'rgba(112, 186, 88, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 12);
  return tex;
}

export function clayMat(color: string | number, roughness = 0.68, metalness = 0.04): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
  });
}

export function glossyClayMat(color: string | number, roughness = 0.28): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness,
    metalness: 0.05,
    clearcoat: 0.65,
    clearcoatRoughness: 0.25,
  });
}

export function makeShadowed(obj: THREE.Object3D, cast = true, receive = true): void {
  obj.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = cast;
      child.receiveShadow = receive;
    }
  });
}
