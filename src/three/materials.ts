import {PaintPattern} from '../types/game';
import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const _textureCache = new Map<string, THREE.CanvasTexture>();
const _clayMatPool = new Map<string, THREE.MeshStandardMaterial>();
const _glossyClayMatPool = new Map<string, THREE.MeshStandardMaterial>();

function getOrBuildCachedTexture(
  key: string,
  build: () => THREE.CanvasTexture,
  repX?: number,
  repY?: number,
): THREE.CanvasTexture {
  let base = _textureCache.get(key);
  if (!base) {
    base = build();
    base.userData = {...base.userData, sharedCache: true};
    _textureCache.set(key, base);
  }
  const rx = repX ?? base.repeat.x;
  const ry = repY ?? base.repeat.y;
  if (rx === base.repeat.x && ry === base.repeat.y) {
    return base;
  }
  const repKey = `${key}|r:${rx}x${ry}`;
  let variant = _textureCache.get(repKey);
  if (!variant) {
    variant = base.clone();
    variant.repeat.set(rx, ry);
    variant.needsUpdate = true;
    variant.userData = {...variant.userData, sharedCache: true};
    _textureCache.set(repKey, variant);
  }
  return variant;
}

export function createCobblestoneTexture(): THREE.CanvasTexture {
  return getOrBuildCachedTexture('cobblestone', () => {
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
  });
}

export function createFlagstonePathTexture(repX = 2, repY = 8): THREE.CanvasTexture {
  return getOrBuildCachedTexture(
    'flagstone',
    () => {
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
      tex.repeat.set(2, 8);
      return tex;
    },
    repX,
    repY,
  );
}

export function createStoneWalkwayTexture(repX = 1, repY = 1): THREE.CanvasTexture {
  return getOrBuildCachedTexture(
    'stone_walkway',
    () => {
      const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Soft warm stone mortar base (low contrast so paths stay calm on the eyes)
  ctx.fillStyle = '#AEAAA0';
  ctx.fillRect(0, 0, 512, 512);

  const stonePalette = [
    '#D7D3C9',
    '#CBC7BD',
    '#DDD9CF',
    '#C3BFB5',
    '#D1CDC3',
  ];

  // Larger, clean ashlar / flagstone slabs (4 rows x 3-4 wide slabs)
  const rows = 4;
  const rowH = 512 / rows;
  for (let r = 0; r < rows; r++) {
    const cols = r % 2 === 0 ? 3 : 4;
    let x = r % 2 === 0 ? 0 : -44;
    for (let c = 0; c <= cols; c++) {
      const baseW = r % 2 === 0 ? 170 : 128;
      const jitter = ((r * 29 + c * 43) % 24) - 12;
      const w = baseW + jitter;
      const y = r * rowH + 4;
      const h = rowH - 8;

      ctx.fillStyle = stonePalette[(r * 5 + c * 3) % stonePalette.length];
      ctx.beginPath();
      ctx.roundRect(x + 4, y, w - 8, h, 14);
      ctx.fill();

      // Gentle top-left highlight & subtle bottom edge
      ctx.strokeStyle = 'rgba(255, 253, 246, 0.32)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.strokeStyle = 'rgba(92, 88, 78, 0.16)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x + 5, y + 2, w - 10, h - 3, 12);
      ctx.stroke();

      x += w;
    }
  }

  // Very subtle natural mineral grain (seeded, low-opacity)
  let seed = 0x2f81d9a3;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 240; i++) {
    const sx = rnd() * 512;
    const sy = rnd() * 512;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(105, 100, 90, 0.08)' : 'rgba(255, 253, 245, 0.09)';
    ctx.fillRect(sx, sy, 3, 3);
  }

      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(1, 1);
      return tex;
    },
    repX,
    repY,
  );
}

export function createWoodPlankTexture(
  base = '#CC965E',
  seam = '#9E6C3B',
  repX = 3,
  repY = 3,
): THREE.CanvasTexture {
  return getOrBuildCachedTexture(
    `wood_plank:${base}:${seam}`,
    () => {
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
    },
    repX,
    repY,
  );
}

export function createCheckerFloorTexture(a = '#5B4D84', b = '#453969'): THREE.CanvasTexture {
  return getOrBuildCachedTexture(`checker_floor:${a}:${b}`, () => {
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
  });
}

export function createPaintPatternTexture(
  pattern: PaintPattern,
  primary: string,
  secondary: string,
  repX = 3,
  repY = 3,
): THREE.CanvasTexture {
  if (pattern === 'wood_plank') {
    const base = createWoodPlankTexture(primary, secondary);
    if (repX === 3 && repY === 3) return base;
    const cloned = base.clone();
    cloned.repeat.set(repX, repY);
    cloned.needsUpdate = true;
    return cloned;
  }
  if (pattern === 'checker_tile') {
    const base = createCheckerFloorTexture(primary, secondary);
    if (repX === 3 && repY === 3) return base;
    const cloned = base.clone();
    cloned.repeat.set(repX, repY);
    cloned.needsUpdate = true;
    return cloned;
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

export function createGrassTexture(repX = 8, repY = 12): THREE.CanvasTexture {
  return getOrBuildCachedTexture(
    'grass',
    () => {
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
    },
    repX,
    repY,
  );
}

export function clayMat(
  color: string | number,
  roughness = 0.68,
  metalness = 0.04,
): THREE.MeshStandardMaterial {
  const key = `${String(color)}|${roughness.toFixed(2)}|${metalness.toFixed(2)}`;
  let m = _clayMatPool.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness,
    });
    m.userData.pooled = true;
    _clayMatPool.set(key, m);
  }
  return m;
}

export function glossyClayMat(color: string | number, roughness = 0.28): THREE.MeshStandardMaterial {
  const r = Math.max(0.08, roughness * 0.72);
  const key = `${String(color)}|${r.toFixed(2)}`;
  let m = _glossyClayMatPool.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color,
      roughness: r,
      metalness: 0.08,
      envMapIntensity: 0.9,
    });
    m.userData.pooled = true;
    _glossyClayMatPool.set(key, m);
  }
  return m;
}

export type SignAtlasRegionId =
  | 'daily_quests'
  | 'koi_stall'
  | 'pet_shop'
  | 'farm_kitchen'
  | 'farm_shop'
  | 'ship_stall'
  | 'river_boat_sign';

interface AtlasRectPx {
  x: number;
  y: number;
  w: number;
  h: number;
}

const ATLAS_SIZE = 1024;
const SIGN_ATLAS_RECTS: Record<SignAtlasRegionId, AtlasRectPx> = {
  daily_quests: {x: 16, y: 16, w: 480, h: 240},
  koi_stall: {x: 528, y: 16, w: 480, h: 240},
  pet_shop: {x: 16, y: 288, w: 480, h: 240},
  farm_kitchen: {x: 528, y: 288, w: 480, h: 150},
  farm_shop: {x: 528, y: 464, w: 480, h: 150},
  ship_stall: {x: 16, y: 560, w: 480, h: 220},
  river_boat_sign: {x: 528, y: 636, w: 480, h: 220},
};

let _signAtlasMat: THREE.MeshStandardMaterial | null = null;

export function getSignTextureAtlas(): THREE.CanvasTexture {
  return getOrBuildCachedTexture('sign_atlas_1024', () => {
    const canvas = document.createElement('canvas');
    canvas.width = ATLAS_SIZE;
    canvas.height = ATLAS_SIZE;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, ATLAS_SIZE, ATLAS_SIZE);

    // 1. Daily Quests Sign
    {
      const {x, y, w, h} = SIGN_ATLAS_RECTS.daily_quests;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(w / 512, h / 256);
      ctx.fillStyle = '#FFF5E1';
      ctx.fillRect(0, 0, 512, 256);
      ctx.strokeStyle = '#9C6B3F';
      ctx.lineWidth = 10;
      ctx.strokeRect(16, 16, 480, 224);
      ctx.strokeStyle = '#D9B88F';
      ctx.lineWidth = 4;
      ctx.strokeRect(28, 28, 456, 200);
      ctx.fillStyle = '#4A2F1B';
      ctx.font = 'bold 56px "Nunito", "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Nhiệm vụ ngày', 256, 102);
      ctx.fillStyle = '#C97B49';
      ctx.fillRect(116, 146, 280, 6);
      ctx.fillStyle = '#6BA383';
      [172, 256, 340].forEach((cx) => {
        ctx.beginPath();
        ctx.arc(cx, 186, 12, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }

    // 2. Koi Stall Sign
    {
      const {x, y, w, h} = SIGN_ATLAS_RECTS.koi_stall;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(w / 512, h / 256);
      ctx.fillStyle = '#FDF6E6';
      ctx.fillRect(0, 0, 512, 256);
      ctx.strokeStyle = '#7A4E2D';
      ctx.lineWidth = 12;
      ctx.strokeRect(12, 12, 488, 232);
      ctx.strokeStyle = '#3B9AB2';
      ctx.lineWidth = 4;
      ctx.strokeRect(24, 24, 464, 208);
      ctx.save();
      ctx.translate(152, 108);
      ctx.fillStyle = '#43A3B8';
      ctx.beginPath();
      ctx.ellipse(0, 0, 52, 26, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(46, 0);
      ctx.lineTo(76, -22);
      ctx.lineTo(68, 0);
      ctx.lineTo(76, 22);
      ctx.closePath();
      ctx.fillStyle = '#2F7D92';
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-12, -24);
      ctx.lineTo(6, -38);
      ctx.lineTo(22, -20);
      ctx.closePath();
      ctx.fillStyle = '#E87A54';
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(-28, -5, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1E2A32';
      ctx.beginPath();
      ctx.arc(-29, -5, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.translate(358, 114);
      ctx.fillStyle = '#D99E57';
      ctx.beginPath();
      ctx.moveTo(-36, -18);
      ctx.lineTo(36, -18);
      ctx.quadraticCurveTo(46, 28, 22, 36);
      ctx.lineTo(-22, 36);
      ctx.quadraticCurveTo(-46, 28, -36, -18);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#8F5A29';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.fillStyle = '#B87638';
      ctx.fillRect(-40, -24, 80, 10);
      ctx.strokeStyle = '#A66931';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-34, 4);
      ctx.lineTo(34, 4);
      ctx.moveTo(-30, 18);
      ctx.lineTo(30, 18);
      ctx.stroke();
      ctx.fillStyle = '#FF9C6E';
      ctx.beginPath();
      ctx.moveTo(10, -24);
      ctx.lineTo(26, -42);
      ctx.lineTo(2, -38);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#382414';
      ctx.font = 'bold 46px "Nunito", "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Tiệm của Koi', 256, 194);
      ctx.restore();
    }

    // 3. Pet Shop Side Sign
    {
      const {x, y, w, h} = SIGN_ATLAS_RECTS.pet_shop;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(w / 512, h / 256);
      ctx.fillStyle = '#FFF7EA';
      ctx.fillRect(0, 0, 512, 256);
      ctx.strokeStyle = '#E0825B';
      ctx.lineWidth = 14;
      ctx.strokeRect(12, 12, 488, 232);
      ctx.strokeStyle = '#5BB7B0';
      ctx.lineWidth = 5;
      ctx.strokeRect(26, 26, 460, 204);
      const drawPaw = (cx: number, cy: number, s: number, col: string) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(s, s);
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.ellipse(0, 10, 18, 15, 0, 0, Math.PI * 2);
        ctx.fill();
        [
          [-18, -10],
          [-6, -20],
          [7, -20],
          [18, -10],
        ].forEach(([tx, ty]) => {
          ctx.beginPath();
          ctx.arc(tx, ty, 6.8, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
      };
      drawPaw(88, 130, 0.95, '#F09470');
      drawPaw(424, 130, 0.95, '#5BB7B0');
      ctx.fillStyle = '#4A3122';
      ctx.font = '900 94px "Nunito", "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Pets', 256, 132);
      ctx.restore();
    }

    // 4 & 5. Farm Kitchen & Farm Shop Signs
    const drawFarmTile = (
      rect: AtlasRectPx,
      title: string,
      subtitle: string,
      bg: string,
      border: string,
      textColor: string,
    ) => {
      ctx.save();
      ctx.translate(rect.x, rect.y);
      ctx.scale(rect.w / 512, rect.h / 160);
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.roundRect(6, 6, 500, 148, 22);
      ctx.fill();
      ctx.strokeStyle = border;
      ctx.lineWidth = 9;
      ctx.stroke();
      ctx.fillStyle = textColor;
      ctx.font = 'bold 48px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(title, 256, 64);
      ctx.font = '600 24px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.globalAlpha = 0.82;
      ctx.fillText(subtitle, 256, 114);
      ctx.restore();
    };
    drawFarmTile(
      SIGN_ATLAS_RECTS.farm_kitchen,
      'BẾP NÔNG TRẠI',
      'Nấu ăn & làm bánh',
      '#FFF3DA',
      '#8A5632',
      '#4F321D',
    );
    drawFarmTile(
      SIGN_ATLAS_RECTS.farm_shop,
      'FARM SHOP',
      'Hạt giống · Vật tư',
      '#FFE79B',
      '#7C512D',
      '#4A2F19',
    );

    // 6. NPC Ship Stall Boat Emblem Sign
    {
      const {x, y, w, h} = SIGN_ATLAS_RECTS.ship_stall;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(w / 512, h / 240);
      ctx.fillStyle = '#F4FBFF';
      ctx.fillRect(0, 0, 512, 240);
      ctx.strokeStyle = '#316E8E';
      ctx.lineWidth = 12;
      ctx.strokeRect(12, 12, 488, 216);
      ctx.strokeStyle = '#D99E57';
      ctx.lineWidth = 5;
      ctx.strokeRect(24, 24, 464, 192);
      // Boat emblem on left
      ctx.save();
      ctx.translate(116, 114);
      ctx.fillStyle = '#C98344';
      ctx.beginPath();
      ctx.moveTo(-48, 8);
      ctx.lineTo(48, 8);
      ctx.quadraticCurveTo(36, 36, 0, 36);
      ctx.quadraticCurveTo(-36, 36, -48, 8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#754119';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.fillStyle = '#754119';
      ctx.fillRect(-3, -44, 6, 52);
      ctx.fillStyle = '#4AAED0';
      ctx.beginPath();
      ctx.moveTo(3, -42);
      ctx.lineTo(38, -8);
      ctx.lineTo(3, -2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#FFE4A3';
      ctx.beginPath();
      ctx.moveTo(-3, -36);
      ctx.lineTo(-30, -6);
      ctx.lineTo(-3, -2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#204A63';
      ctx.font = '900 44px "Nunito", "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('TIỆM CỦA SHIP', 330, 96);
      ctx.fillStyle = '#B86E2E';
      ctx.font = 'bold 28px "Nunito", "Segoe UI", system-ui, sans-serif';
      ctx.fillText('Thuyền Gỗ · Bến Sông', 330, 152);
      ctx.restore();
    }

    // 7. Riverside Dock Boat Boarding Sign
    {
      const {x, y, w, h} = SIGN_ATLAS_RECTS.river_boat_sign;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(w / 512, h / 240);
      ctx.fillStyle = '#FFF7E4';
      ctx.fillRect(0, 0, 512, 240);
      ctx.strokeStyle = '#7D4D27';
      ctx.lineWidth = 12;
      ctx.strokeRect(12, 12, 488, 216);
      ctx.strokeStyle = '#4CA6C9';
      ctx.lineWidth = 5;
      ctx.strokeRect(24, 24, 464, 192);
      // Waves + Rowboat illustration
      ctx.strokeStyle = '#4CA6C9';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(90, 126);
      ctx.quadraticCurveTo(150, 114, 210, 126);
      ctx.quadraticCurveTo(270, 138, 330, 126);
      ctx.quadraticCurveTo(380, 116, 424, 126);
      ctx.stroke();
      ctx.fillStyle = '#C98344';
      ctx.strokeStyle = '#754119';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(154, 88);
      ctx.lineTo(358, 88);
      ctx.quadraticCurveTo(334, 122, 256, 122);
      ctx.quadraticCurveTo(178, 122, 154, 88);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Little oars
      ctx.strokeStyle = '#E8B878';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(222, 82);
      ctx.lineTo(192, 128);
      ctx.moveTo(292, 82);
      ctx.lineTo(322, 128);
      ctx.stroke();
      ctx.fillStyle = '#332011';
      ctx.font = '900 42px "Nunito", "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('XUỐNG THUYỀN', 256, 180);
      ctx.restore();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  });
}

export function createRiverWaterTexture(repX = 4, repY = 38): THREE.CanvasTexture {
  return getOrBuildCachedTexture(
    'river_water_128',
    () => {
      const size = 128;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;

      // Calm, natural riverside teal-blue base (no blinding cyan glare)
      const baseGrad = ctx.createLinearGradient(0, 0, size, 0);
      baseGrad.addColorStop(0, '#3689A3');
      baseGrad.addColorStop(0.5, '#2A7A96');
      baseGrad.addColorStop(1, '#3689A3');
      ctx.fillStyle = baseGrad;
      ctx.fillRect(0, 0, size, size);

      // Subtle shaded flow bands
      ctx.strokeStyle = 'rgba(18, 66, 88, 0.22)';
      ctx.lineWidth = 4;
      for (let i = 0; i < 4; i++) {
        const y = i * 32 + 16;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(40, y + 6, 88, y - 6, 128, y);
        ctx.stroke();
      }

      // Soft muted aqua current ripples
      ctx.strokeStyle = 'rgba(186, 232, 242, 0.14)';
      ctx.lineWidth = 2.2;
      for (let i = 0; i < 6; i++) {
        const y = i * 21 + 8;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(34, y - 5, 94, y + 5, 128, y);
        ctx.stroke();
      }

      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(repX, repY);
      return tex;
    },
    repX,
    repY,
  );
}

export function createWaterfallTexture(): THREE.CanvasTexture {
  return getOrBuildCachedTexture('waterfall_128', () => {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, size, size);

    // Feathered water column with soft natural alpha edges (never a hard glass slab)
    const grad = ctx.createLinearGradient(0, 0, size, 0);
    grad.addColorStop(0.0, 'rgba(72, 154, 182, 0.0)');
    grad.addColorStop(0.12, 'rgba(84, 170, 198, 0.58)');
    grad.addColorStop(0.32, 'rgba(116, 198, 220, 0.84)');
    grad.addColorStop(0.5, 'rgba(136, 212, 230, 0.88)');
    grad.addColorStop(0.68, 'rgba(116, 198, 220, 0.84)');
    grad.addColorStop(0.88, 'rgba(84, 170, 198, 0.58)');
    grad.addColorStop(1.0, 'rgba(72, 154, 182, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Organic broken whitewater foam ribbons
    const streams = [
      {x: 18, w: 6, y0: 6, h: 52, a: 0.42},
      {x: 32, w: 10, y0: 0, h: 128, a: 0.62},
      {x: 48, w: 7, y0: 28, h: 74, a: 0.52},
      {x: 62, w: 13, y0: 0, h: 128, a: 0.72},
      {x: 82, w: 8, y0: 14, h: 86, a: 0.58},
      {x: 96, w: 10, y0: 0, h: 128, a: 0.6},
      {x: 110, w: 5, y0: 40, h: 56, a: 0.38},
    ];
    for (const s of streams) {
      const sg = ctx.createLinearGradient(s.x, 0, s.x + s.w, 0);
      sg.addColorStop(0, 'rgba(246, 253, 255, 0)');
      sg.addColorStop(0.5, `rgba(246, 253, 255, ${s.a})`);
      sg.addColorStop(1, 'rgba(246, 253, 255, 0)');
      ctx.fillStyle = sg;
      ctx.fillRect(s.x, s.y0, s.w, s.h);
      if (s.y0 + s.h > size) {
        ctx.fillRect(s.x, 0, s.w, s.y0 + s.h - size);
      }
    }

    // Fine vertical droplet streaks for cascading texture
    ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
    for (let i = 0; i < 24; i++) {
      const dx = 14 + ((i * 23) % 100);
      const dy = (i * 19) % 104;
      ctx.fillRect(dx, dy, 2, 16 + (i % 3) * 8);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 2.5);
    return tex;
  });
}

export function getSharedSignAtlasMaterial(): THREE.MeshStandardMaterial {
  if (!_signAtlasMat) {
    _signAtlasMat = new THREE.MeshStandardMaterial({
      map: getSignTextureAtlas(),
      roughness: 0.55,
    });
    _signAtlasMat.userData.pooled = true;
  }
  return _signAtlasMat;
}

export function applyAtlasRegionToGeometry<T extends THREE.BufferGeometry>(
  geo: T,
  region: SignAtlasRegionId,
): T {
  const r = SIGN_ATLAS_RECTS[region];
  const u0 = r.x / ATLAS_SIZE;
  const u1 = (r.x + r.w) / ATLAS_SIZE;
  const v1 = 1 - r.y / ATLAS_SIZE;
  const v0 = 1 - (r.y + r.h) / ATLAS_SIZE;
  const uv = geo.attributes.uv;
  if (uv) {
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0));
    }
    uv.needsUpdate = true;
  }
  return geo;
}

export function createAtlasPlaneGeometry(
  width: number,
  height: number,
  region: SignAtlasRegionId,
): THREE.PlaneGeometry {
  return applyAtlasRegionToGeometry(new THREE.PlaneGeometry(width, height), region);
}

export function getWarmGlowTexture(): THREE.CanvasTexture {
  return getOrBuildCachedTexture('warm_glow_128', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
    grad.addColorStop(0, 'rgba(255, 214, 130, 0.92)');
    grad.addColorStop(0.45, 'rgba(255, 192, 95, 0.35)');
    grad.addColorStop(1, 'rgba(255, 200, 110, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
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

/**
 * Merges static leaf THREE.Mesh children under `root` sharing the exact same Material
 * and vertex attribute layout into single batched meshes for lower CPU traversal and
 * fewer WebGL draw calls. Skips invisible collider proxies, InstancedMeshes,
 * multi-material meshes, and anything inside `skipSet`.
 */
export function mergeStaticGroupByMaterial(
  root: THREE.Object3D,
  skipSet?: Set<THREE.Object3D>,
): void {
  root.updateMatrixWorld(true);
  const invRoot = root.matrixWorld.clone().invert();

  const shouldSkip = (obj: THREE.Object3D): boolean => {
    let cur: THREE.Object3D | null = obj;
    while (cur) {
      if (skipSet?.has(cur)) return true;
      if (cur === root) break;
      cur = cur.parent;
    }
    return false;
  };

  interface BatchItem {
    mesh: THREE.Mesh;
    material: THREE.Material;
    hasNormal: boolean;
    hasUv: boolean;
    hasColor: boolean;
    castShadow: boolean;
    receiveShadow: boolean;
    renderOrder: number;
  }

  const buckets = new Map<string, BatchItem[]>();

  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || (obj as THREE.InstancedMesh).isInstancedMesh) return;
    if (!mesh.visible || shouldSkip(mesh)) return;
    if (mesh.userData?.kind === 'ground') return;
    const mat = mesh.material;
    if (!mat || Array.isArray(mat) || mat.visible === false) return;

    const geo = mesh.geometry;
    if (!geo || !geo.attributes.position) return;

    const hasNormal = Boolean(geo.attributes.normal);
    const hasUv = Boolean(geo.attributes.uv);
    const hasColor = Boolean(geo.attributes.color);
    const key = `${mat.uuid}|n:${hasNormal ? 1 : 0}|u:${hasUv ? 1 : 0}|c:${hasColor ? 1 : 0}|cs:${mesh.castShadow ? 1 : 0}|rs:${mesh.receiveShadow ? 1 : 0}|ro:${mesh.renderOrder}`;
    let list = buckets.get(key);
    if (!list) {
      list = [];
      buckets.set(key, list);
    }
    list.push({
      mesh,
      material: mat,
      hasNormal,
      hasUv,
      hasColor,
      castShadow: mesh.castShadow,
      receiveShadow: mesh.receiveShadow,
      renderOrder: mesh.renderOrder,
    });
  });

  const relMat = new THREE.Matrix4();
  const toMergeReplace: {
    merged: THREE.Mesh;
    sources: THREE.Mesh[];
  }[] = [];

  buckets.forEach((items) => {
    if (items.length < 2) {
      if (items.length === 1) {
        items[0].mesh.geometry.computeBoundingSphere();
      }
      return;
    }
    const prepared: THREE.BufferGeometry[] = [];
    let failed = false;
    for (const item of items) {
      const raw = item.mesh.geometry;
      const g = raw.index ? raw.toNonIndexed() : raw.clone();
      if (g.attributes.tangent) g.deleteAttribute('tangent');
      // Keep only standard attributes so mergeGeometries never rejects mismatched extra attrs
      for (const attrName of Object.keys(g.attributes)) {
        if (
          attrName !== 'position' &&
          attrName !== 'normal' &&
          attrName !== 'uv' &&
          attrName !== 'color'
        ) {
          g.deleteAttribute(attrName);
        }
      }
      relMat.multiplyMatrices(invRoot, item.mesh.matrixWorld);
      g.applyMatrix4(relMat);
      prepared.push(g);
    }
    const mergedGeo = mergeGeometries(prepared, false);
    prepared.forEach((g) => g.dispose());
    if (!mergedGeo) {
      failed = true;
    }
    if (!failed && mergedGeo) {
      mergedGeo.computeBoundingSphere();
      const first = items[0];
      const mergedMesh = new THREE.Mesh(mergedGeo, first.material);
      mergedMesh.castShadow = first.castShadow;
      mergedMesh.receiveShadow = first.receiveShadow;
      mergedMesh.renderOrder = first.renderOrder;
      mergedMesh.frustumCulled = true;
      toMergeReplace.push({
        merged: mergedMesh,
        sources: items.map((it) => it.mesh),
      });
    }
  });

  for (const entry of toMergeReplace) {
    for (const src of entry.sources) {
      src.parent?.remove(src);
      src.geometry.dispose();
    }
    root.add(entry.merged);
  }
}
