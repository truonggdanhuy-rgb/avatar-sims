import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {FurnitureCatalogItem} from '../types/game';
import {clayMat, glossyClayMat} from './materials';

const _clockFaceCache = new Map<string, THREE.CanvasTexture>();
const _calendarFaceCache = new Map<string, THREE.CanvasTexture>();
const _tetCoupletCache = new Map<string, THREE.CanvasTexture>();
const _tetRugCache = new Map<string, THREE.CanvasTexture>();
let _moonTexCache: THREE.CanvasTexture | null = null;
let _laptopTexCache: THREE.CanvasTexture | null = null;
let _desktopTexCache: THREE.CanvasTexture | null = null;
let _pinboardTexCache: THREE.CanvasTexture | null = null;
let _openBookLeftTexCache: THREE.CanvasTexture | null = null;
let _openBookRightTexCache: THREE.CanvasTexture | null = null;
let _calligraphyFontInjected = false;
const _calligraphyRedrawHooks: Array<() => void> = [];

function getStudyScreenTexture(mode: 'laptop' | 'desktop'): THREE.CanvasTexture {
  if (mode === 'laptop' && _laptopTexCache) return _laptopTexCache;
  if (mode === 'desktop' && _desktopTexCache) return _desktopTexCache;

  const canvas = document.createElement('canvas');
  canvas.width = mode === 'desktop' ? 640 : 512;
  canvas.height = mode === 'desktop' ? 360 : 320;
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width;
  const h = canvas.height;

  // Soft dreamy pastel gradient wallpaper
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, mode === 'desktop' ? '#BCE7FD' : '#D5EEFF');
  bg.addColorStop(0.55, '#EFE5FA');
  bg.addColorStop(1, '#FDE2EC');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Cute fluffy clouds on desktop background
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  [
    [w * 0.2, h * 0.34, 34],
    [w * 0.25, h * 0.3, 42],
    [w * 0.31, h * 0.35, 30],
    [w * 0.78, h * 0.25, 28],
    [w * 0.83, h * 0.22, 34],
  ].forEach(([cx, cy, r]) => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  });

  // Main aesthetic workspace window
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.beginPath();
  ctx.roundRect(w * 0.08, h * 0.12, w * 0.56, h * 0.66, 14);
  ctx.fill();
  ctx.fillStyle = '#F2F5FA';
  ctx.beginPath();
  ctx.roundRect(w * 0.08, h * 0.12, w * 0.56, 30, [14, 14, 0, 0]);
  ctx.fill();
  // Window traffic-light dots
  ['#FF7B89', '#FFD166', '#6BCB9B'].forEach((col, i) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(w * 0.08 + 20 + i * 16, h * 0.12 + 15, 4.5, 0, Math.PI * 2);
    ctx.fill();
  });
  // Lines / art blocks inside window
  ctx.fillStyle = '#E8F3FC';
  ctx.fillRect(w * 0.11, h * 0.25, w * 0.22, h * 0.45);
  ctx.fillStyle = '#91D8F7';
  ctx.fillRect(w * 0.13, h * 0.29, w * 0.18, 12);
  ctx.fillStyle = '#F7B7C9';
  ctx.fillRect(w * 0.13, h * 0.35, w * 0.14, 10);
  ctx.fillStyle = '#9EE0B5';
  ctx.fillRect(w * 0.13, h * 0.41, w * 0.16, 10);

  ctx.fillStyle = '#6A7B91';
  for (let row = 0; row < 5; row++) {
    ctx.fillStyle = row % 2 === 0 ? '#79B6E8' : '#C5D1DF';
    ctx.fillRect(w * 0.36, h * 0.27 + row * 24, w * (0.14 + (row % 3) * 0.04), 10);
  }

  // Right widget card (Clock + Music player)
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  ctx.beginPath();
  ctx.roundRect(w * 0.68, h * 0.16, w * 0.24, h * 0.36, 14);
  ctx.fill();
  ctx.fillStyle = '#3B4E6B';
  ctx.font = 'bold 34px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('09:30', w * 0.8, h * 0.32);
  ctx.fillStyle = '#8FA1B8';
  ctx.font = 'bold 14px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText('MÂY STUDIO', w * 0.8, h * 0.43);

  if (mode === 'desktop') {
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.beginPath();
    ctx.roundRect(w * 0.68, h * 0.56, w * 0.24, h * 0.22, 12);
    ctx.fill();
    ctx.fillStyle = '#F28BA8';
    ctx.beginPath();
    ctx.arc(w * 0.74, h * 0.67, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7AA8D6';
    ctx.fillRect(w * 0.78, h * 0.63, 72, 8);
    ctx.fillStyle = '#D5E2F0';
    ctx.fillRect(w * 0.78, h * 0.7, 56, 6);
  }

  // Bottom translucent dock
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.beginPath();
  ctx.roundRect(w * 0.24, h - 34, w * 0.52, 24, 12);
  ctx.fill();
  ['#FF8FA3', '#FFD166', '#6BCB9B', '#72C2F5', '#B49AF2', '#F7A97C'].forEach((col, i) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(w * 0.29 + i * (w * 0.084), h - 22, 7.5, 0, Math.PI * 2);
    ctx.fill();
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  if (mode === 'laptop') _laptopTexCache = tex;
  else _desktopTexCache = tex;
  return tex;
}

function getPinboardTexture(): THREE.CanvasTexture {
  if (_pinboardTexCache) return _pinboardTexCache;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 340;
  const ctx = canvas.getContext('2d')!;

  // Warm natural cork texture
  ctx.fillStyle = '#D7AD7B';
  ctx.fillRect(0, 0, 512, 340);
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(130,84,42,0.14)' : 'rgba(255,235,205,0.18)';
    const rx = (i * 73) % 512;
    const ry = (i * 137) % 340;
    ctx.fillRect(rx, ry, 3, 2);
  }

  // Subtle pastel grid lines painted on cork
  ctx.strokeStyle = 'rgba(255,248,236,0.22)';
  ctx.lineWidth = 1.5;
  for (let x = 40; x < 512; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 340);
    ctx.stroke();
  }
  for (let y = 40; y < 340; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  // Printed planner header strip on cork
  ctx.fillStyle = '#FFFDF7';
  ctx.fillRect(190, 20, 132, 30);
  ctx.fillStyle = '#6A472B';
  ctx.font = 'bold 16px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TO-DO & NOTES', 256, 35);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  _pinboardTexCache = tex;
  return tex;
}

function getOpenBookPageTexture(side: 'left' | 'right'): THREE.CanvasTexture {
  if (side === 'left' && _openBookLeftTexCache) return _openBookLeftTexCache;
  if (side === 'right' && _openBookRightTexCache) return _openBookRightTexCache;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 320;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#FFFDF6';
  ctx.fillRect(0, 0, 256, 320);

  // Subtle notebook ruled lines
  ctx.strokeStyle = '#DCE6F2';
  ctx.lineWidth = 1.5;
  for (let y = 44; y <= 284; y += 22) {
    ctx.beginPath();
    ctx.moveTo(20, y);
    ctx.lineTo(236, y);
    ctx.stroke();
  }

  // Soft margin line
  ctx.strokeStyle = '#F2B5BD';
  ctx.beginPath();
  ctx.moveTo(36, 18);
  ctx.lineTo(36, 302);
  ctx.stroke();

  if (side === 'left') {
    ctx.fillStyle = '#7EA8D8';
    ctx.fillRect(46, 28, 120, 12);
    ctx.fillStyle = '#6C7A89';
    [60, 82, 104, 148, 170, 192, 236, 258].forEach((y, idx) => {
      ctx.fillRect(46, y, 130 + ((idx * 29) % 45), 5);
    });
    // Cute pastel highlight bar
    ctx.fillStyle = 'rgba(255, 224, 102, 0.55)';
    ctx.fillRect(44, 120, 145, 16);
  } else {
    // Mini doodle chart & bullet notes on right page
    ctx.fillStyle = '#F7A8B8';
    ctx.beginPath();
    ctx.arc(136, 94, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#9AD5C5';
    ctx.beginPath();
    ctx.moveTo(136, 94);
    ctx.arc(136, 94, 34, -0.5, 1.4);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#6C7A89';
    [164, 186, 208, 230, 252].forEach((y, idx) => {
      ctx.fillRect(46, y, 120 + ((idx * 37) % 52), 5);
    });
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  if (side === 'left') _openBookLeftTexCache = tex;
  else _openBookRightTexCache = tex;
  return tex;
}

function ensureCalligraphyFont(onReady?: () => void) {
  if (typeof document === 'undefined') return;
  if (onReady) _calligraphyRedrawHooks.push(onReady);
  if (_calligraphyFontInjected) {
    if (document.fonts?.check('700 40px "Charm"') && onReady) {
      onReady();
    }
    return;
  }
  _calligraphyFontInjected = true;
  if (!document.getElementById('tet-calligraphy-font')) {
    const link = document.createElement('link');
    link.id = 'tet-calligraphy-font';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Charm:wght@700&display=swap';
    document.head.appendChild(link);
  }
  document.fonts?.load('700 48px "Charm"').then(() => {
    while (_calligraphyRedrawHooks.length > 0) {
      const fn = _calligraphyRedrawHooks.shift();
      fn?.();
    }
  }).catch(() => {});
}

function drawCanvasMaiFlower(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  petalColor: string,
  centerColor: string,
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = petalColor;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.ellipse(
      Math.cos(a) * r * 0.56,
      Math.sin(a) * r * 0.56,
      r * 0.42,
      r * 0.34,
      a,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.fillStyle = centerColor;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function getTetCalendarTexture(): THREE.CanvasTexture {
  const cached = _calendarFaceCache.get('tet_viet_nam');
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 680;
  const ctx = canvas.getContext('2d')!;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;

  const paint = () => {
    const hasCharm = typeof document !== 'undefined' && document.fonts?.check('700 40px "Charm"');
    const calFont = hasCharm
      ? '700 44px "Charm", "Palatino Linotype", Georgia, cursive'
      : 'italic 700 42px "Palatino Linotype", "Book Antiqua", Georgia, serif';

    // Crisp crimson lacquer header + ivory parchment lower sheet (no overlapping fills)
    ctx.fillStyle = '#FFF7E8';
    ctx.fillRect(0, 0, 512, 680);

    // Top festive crimson banner
    const grad = ctx.createLinearGradient(0, 0, 512, 235);
    grad.addColorStop(0, '#BA181B');
    grad.addColorStop(1, '#E03131');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 232);

    // Clean inner gold frame inside banner
    ctx.strokeStyle = '#F7C948';
    ctx.lineWidth = 4;
    ctx.strokeRect(18, 18, 476, 196);

    // Delicate painted golden hoa mai branch in top-left & bottom-right corners
    ctx.strokeStyle = '#6D351A';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(26, 200);
    ctx.quadraticCurveTo(85, 148, 150, 126);
    ctx.stroke();
    drawCanvasMaiFlower(ctx, 82, 162, 16, '#FFD43B', '#E87A14');
    drawCanvasMaiFlower(ctx, 138, 132, 19, '#FFD43B', '#E87A14');
    drawCanvasMaiFlower(ctx, 434, 62, 17, '#FFD43B', '#E87A14');
    drawCanvasMaiFlower(ctx, 456, 108, 13, '#FFE066', '#E87A14');

    // Hanging lucky lantern motif top-right
    ctx.fillStyle = '#F7C948';
    ctx.fillRect(392, 24, 3, 24);

    // Single-pass calligraphic header text (never double-stroked)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFE066';
    ctx.font = calFont;
    ctx.fillText('Xuân An Khang', 256, 86);

    ctx.fillStyle = '#FFF5D6';
    ctx.font = '700 22px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText('CHÚC MỪNG NĂM MỚI', 256, 164);

    // Lower tear-off daily bloc calendar sheet
    ctx.strokeStyle = '#D9B061';
    ctx.lineWidth = 3;
    ctx.strokeRect(24, 252, 464, 404);

    ctx.fillStyle = '#B8232A';
    ctx.font = '700 26px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText('THÁNG GIÊNG · TẾT CỔ TRUYỀN', 256, 294);

    // Big crisp Lunar New Year Day 1
    ctx.fillStyle = '#C92424';
    ctx.font = '900 164px "Bricolage Grotesque", Georgia, serif';
    ctx.fillText('1', 256, 424);

    ctx.fillStyle = '#7A4322';
    ctx.font = '700 30px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText('MÙNG 1 TẾT', 256, 530);

    // Clean gold seal pill at bottom
    ctx.fillStyle = '#D92B2B';
    ctx.beginPath();
    ctx.roundRect(108, 574, 296, 48, 24);
    ctx.fill();
    ctx.strokeStyle = '#F5C443';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = '#FFE680';
    ctx.font = '700 21px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText('PHÚC · LỘC · THỌ', 256, 599);

    tex.needsUpdate = true;
  };

  paint();
  ensureCalligraphyFont(paint);
  _calendarFaceCache.set('tet_viet_nam', tex);
  return tex;
}

function getTetCoupletTexture(words: string[], sealLabel: string): THREE.CanvasTexture {
  const key = words.join('|');
  const cached = _tetCoupletCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 880;
  const ctx = canvas.getContext('2d')!;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;

  const paint = () => {
    const hasCharm = typeof document !== 'undefined' && document.fonts?.check('700 40px "Charm"');
    const fontSpec = hasCharm
      ? '700 54px "Charm", "Palatino Linotype", Georgia, cursive'
      : 'italic 700 50px "Palatino Linotype", "Book Antiqua", Georgia, serif';

    // Crimson silk brocade backdrop
    const bg = ctx.createLinearGradient(0, 0, 320, 880);
    bg.addColorStop(0, '#B91C1C');
    bg.addColorStop(0.5, '#D12626');
    bg.addColorStop(1, '#A61717');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 320, 880);

    // Subtle scattered golden silk flecks strictly outside text bounds
    const fleckSpots: [number, number, number][] = [
      [34, 80, 3], [286, 110, 2.5], [38, 310, 2.5], [282, 420, 3],
      [34, 590, 2.5], [286, 710, 3], [46, 790, 2.5], [274, 240, 2],
    ];
    ctx.fillStyle = 'rgba(255, 224, 112, 0.55)';
    for (const [fx, fy, fr] of fleckSpots) {
      ctx.beginPath();
      ctx.arc(fx, fy, fr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Crisp outer gold border + recessed corner fret (never overlaps text)
    ctx.strokeStyle = '#F6C945';
    ctx.lineWidth = 6;
    ctx.strokeRect(18, 22, 284, 836);
    ctx.strokeStyle = 'rgba(246, 201, 69, 0.52)';
    ctx.lineWidth = 2;
    ctx.strokeRect(28, 32, 264, 816);

    // Small golden hoa mai accent at top & bottom center margin
    drawCanvasMaiFlower(ctx, 160, 74, 20, '#F7CE46', '#B91C1C');
    drawCanvasMaiFlower(ctx, 160, 806, 18, '#F7CE46', '#B91C1C');

    // Clean vertical stacked calligraphy words with generous vertical spacing (no diacritic overlap!)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = fontSpec;
    ctx.fillStyle = '#FFE47A';
    ctx.shadowColor = 'rgba(84, 8, 8, 0.45)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;

    const topStart = 185;
    const stepY = words.length <= 4 ? 142 : 112;
    words.forEach((w, idx) => {
      ctx.fillText(w, 160, topStart + idx * stepY);
    });
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Traditional crimson-framed square seal stamp ("Triện") cleanly tucked below last word
    const sealY = 730;
    ctx.fillStyle = '#FFE47A';
    ctx.fillRect(136, sealY - 22, 48, 44);
    ctx.strokeStyle = '#991B1B';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(140, sealY - 18, 40, 36);
    ctx.fillStyle = '#991B1B';
    ctx.font = '700 18px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText(sealLabel, 160, sealY + 1);

    tex.needsUpdate = true;
  };

  paint();
  ensureCalligraphyFont(paint);
  _tetCoupletCache.set(key, tex);
  return tex;
}

function getTetRugTexture(baseHex: string, goldHex: string): THREE.CanvasTexture {
  const key = `${baseHex}:${goldHex}`;
  const cached = _tetRugCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 384;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 512, 384);

  // Double gold woven border
  ctx.strokeStyle = goldHex;
  ctx.lineWidth = 8;
  ctx.strokeRect(20, 20, 472, 344);
  ctx.lineWidth = 2.5;
  ctx.strokeRect(34, 34, 444, 316);

  // Center auspicious golden ring & hoa mai bouquet medallion
  ctx.strokeStyle = goldHex;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(256, 192, 76, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(256, 192, 64, 0, Math.PI * 2);
  ctx.stroke();

  drawCanvasMaiFlower(ctx, 256, 192, 34, '#FFD43B', '#D95D24');
  // 4 corner hoa mai accents
  for (const [mx, my] of [[68, 66], [444, 66], [68, 318], [444, 318]]) {
    drawCanvasMaiFlower(ctx, mx, my, 18, '#FFE066', '#B8232A');
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  _tetRugCache.set(key, tex);
  return tex;
}

function getMoonSurfaceTexture(): THREE.CanvasTexture {
  if (_moonTexCache) return _moonTexCache;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#FFF5D6';
  ctx.fillRect(0, 0, 512, 256);

  const craters: [number, number, number, number][] = [
    [90, 92, 38, 0.16], [168, 128, 52, 0.14], [272, 78, 44, 0.17],
    [354, 152, 56, 0.13], [438, 96, 36, 0.15], [134, 186, 28, 0.14],
    [244, 174, 34, 0.15], [396, 62, 26, 0.14], [52, 164, 24, 0.12],
  ];
  for (const [cx, cy, cr, alpha] of craters) {
    ctx.fillStyle = `rgba(214, 178, 108, ${alpha})`;
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(182, 142, 76, ${alpha * 1.15})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  _moonTexCache = tex;
  return tex;
}

function getClockDialTexture(faceHex: string): THREE.CanvasTexture {
  const cached = _clockFaceCache.get(faceHex);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const cx = 256;
  const cy = 256;

  ctx.fillStyle = faceHex;
  ctx.fillRect(0, 0, 512, 512);

  // Subtle inner cream dial ring
  ctx.strokeStyle = '#DFCDB4';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(cx, cy, 212, 0, Math.PI * 2);
  ctx.stroke();

  // 60 minute ticks & 12 bold hour markers
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
    const isHour = i % 5 === 0;
    const r0 = isHour ? 182 : 196;
    const r1 = 208;
    ctx.strokeStyle = isHour ? '#5B402D' : '#B7A28B';
    ctx.lineWidth = isHour ? 7 : 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.stroke();
  }

  // Hour numerals 12, 3, 6, 9 + dots
  ctx.fillStyle = '#4A3525';
  ctx.font = 'bold 34px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const labels: [number, string][] = [
    [12, '12'],
    [3, '3'],
    [6, '6'],
    [9, '9'],
  ];
  for (const [h, txt] of labels) {
    const a = (h / 12) * Math.PI * 2 - Math.PI / 2;
    ctx.fillText(txt, cx + Math.cos(a) * 148, cy + Math.sin(a) * 148);
  }

  ctx.fillStyle = '#9C7E63';
  ctx.font = 'bold 16px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText('THỊ TRẤN MÂY', cx, cy + 72);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  _clockFaceCache.set(faceHex, tex);
  return tex;
}

function getCalendarPageTexture(bgHex: string, accentHex: string): THREE.CanvasTexture {
  const key = `${bgHex}:${accentHex}`;
  const cached = _calendarFaceCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 640;
  const ctx = canvas.getContext('2d')!;

  // Paper background
  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, 512, 640);

  // Cozy illustrated banner header
  ctx.fillStyle = accentHex;
  ctx.fillRect(0, 0, 512, 168);

  // Cute decorative clouds inside banner
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.beginPath();
  ctx.arc(88, 72, 34, 0, Math.PI * 2);
  ctx.arc(124, 64, 42, 0, Math.PI * 2);
  ctx.arc(162, 74, 30, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(386, 98, 28, 0, Math.PI * 2);
  ctx.arc(416, 92, 35, 0, Math.PI * 2);
  ctx.arc(446, 100, 24, 0, Math.PI * 2);
  ctx.fill();

  // Warm sun circle
  ctx.fillStyle = '#FFE082';
  ctx.beginPath();
  ctx.arc(426, 48, 24, 0, Math.PI * 2);
  ctx.fill();

  // Month title
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 44px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('THÁNG 11', 256, 76);

  ctx.font = 'bold 20px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fillText('THỊ TRẤN MÂY', 256, 126);

  // Weekday headers
  const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const colW = 62;
  const startX = 40 + colW / 2;
  ctx.font = 'bold 21px "Plus Jakarta Sans", system-ui, sans-serif';
  days.forEach((d, idx) => {
    ctx.fillStyle = idx === 6 ? '#D95D52' : '#7B604A';
    ctx.fillText(d, startX + idx * colW, 204);
  });

  ctx.strokeStyle = '#E6D6C2';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(32, 224);
  ctx.lineTo(480, 224);
  ctx.stroke();

  // Dates 1..30 grid (starting Friday -> col 4)
  ctx.font = 'bold 24px "Plus Jakarta Sans", system-ui, sans-serif';
  let col = 4;
  let row = 0;
  for (let day = 1; day <= 30; day++) {
    const dx = startX + col * colW;
    const dy = 266 + row * 70;
    if (day === 20) {
      // Highlighted special day circle
      ctx.fillStyle = accentHex;
      ctx.beginPath();
      ctx.arc(dx, dy, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
    } else if (day === 12 || day === 24) {
      ctx.fillStyle = '#FCE6BE';
      ctx.beginPath();
      ctx.arc(dx, dy, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5B402D';
    } else {
      ctx.fillStyle = col === 6 ? '#D95D52' : '#4A3525';
    }
    ctx.fillText(String(day), dx, dy);
    col++;
    if (col >= 7) {
      col = 0;
      row++;
    }
  }

  // Cute bottom note strip
  ctx.fillStyle = '#F3E7D6';
  ctx.fillRect(32, 586, 448, 32);
  ctx.fillStyle = '#876B54';
  ctx.font = 'bold 16px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText('★ Thu hoạch & Câu cá cùng gia đình', 256, 603);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  _calendarFaceCache.set(key, tex);
  return tex;
}

function buildRosetteSucculent(leafHex: string, scale = 1): THREE.Group {
  const sg = new THREE.Group();
  const leafMat = clayMat(leafHex, 0.56);
  const tipMat = clayMat('#9CD9AE', 0.55);

  const addRing = (count: number, radius: number, y: number, tilt: number, ps: number, mat: THREE.Material) => {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + y * 2.1;
      const petal = new THREE.Mesh(new THREE.ConeGeometry(0.038 * ps, 0.11 * ps, 6), mat);
      petal.scale.set(1.15, 1, 0.52);
      petal.position.set(Math.sin(a) * radius, y, Math.cos(a) * radius);
      petal.rotation.order = 'YXZ';
      petal.rotation.y = a;
      petal.rotation.x = tilt;
      sg.add(petal);
    }
  };

  addRing(8, 0.056, 0.025, 1.12, 1.05, leafMat);
  addRing(6, 0.036, 0.052, 0.72, 0.85, tipMat);
  const bud = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.065, 6), tipMat);
  bud.position.y = 0.072;
  sg.add(bud);

  sg.scale.setScalar(scale);
  return sg;
}

function build3DFlowerHead(petalHex: string, centerHex = '#FFD24C', scale = 1): THREE.Group {
  const fg = new THREE.Group();
  const petalMat = clayMat(petalHex, 0.46);
  const centerMat = clayMat(centerHex, 0.38);
  const antherMat = glossyClayMat('#FFF3B0', 0.28);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const petal = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), petalMat);
    petal.scale.set(0.88, 0.28, 1.18);
    petal.position.set(Math.sin(a) * 0.048, 0.01, Math.cos(a) * 0.048);
    petal.rotation.order = 'YXZ';
    petal.rotation.y = a;
    petal.rotation.x = -0.28;
    fg.add(petal);
  }
  const center = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 6), centerMat);
  center.scale.set(1, 0.72, 1);
  center.position.y = 0.018;
  fg.add(center);

  for (let s = 0; s < 5; s++) {
    const sa = (s / 5) * Math.PI * 2 + 0.31;
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.008, 5, 5), antherMat);
    tip.position.set(Math.sin(sa) * 0.024, 0.028, Math.cos(sa) * 0.024);
    fg.add(tip);
  }
  fg.scale.setScalar(scale);
  return fg;
}

function buildSculptedGiftBow(ribbonMat: THREE.Material, scale = 1): THREE.Group {
  const bow = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const loop = new THREE.Mesh(new THREE.TorusGeometry(0.046, 0.013, 6, 12), ribbonMat);
    loop.rotation.y = (i / 4) * Math.PI * 2 + Math.PI / 4;
    loop.rotation.x = 0.42;
    loop.position.y = 0.024;
    bow.add(loop);
  }
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), ribbonMat);
  knot.position.y = 0.022;
  bow.add(knot);
  bow.scale.setScalar(scale);
  return bow;
}

function registerTwinkleBulb(
  g: THREE.Group,
  mesh: THREE.Mesh,
  mat: THREE.MeshStandardMaterial,
  phase: number,
  baseIntensity = 1.15,
) {
  if (!g.userData.twinkleBulbs) {
    g.userData.twinkleBulbs = [];
  }
  (
    g.userData.twinkleBulbs as Array<{
      mesh: THREE.Mesh;
      mat: THREE.MeshStandardMaterial;
      phase: number;
      baseIntensity: number;
    }>
  ).push({mesh, mat, phase, baseIntensity});
}

function createSolidBedSleepBlanket(
  quiltMat: THREE.Material,
  cuffMat: THREE.Material,
): THREE.Group {
  const sleepGrp = new THREE.Group();

  // Closed manifold solid quilt profile from inside mattress (y=0.48) up to plush dome (y=1.16)
  // and draping down both sides (|x|=0.95..1.07, y=0.14) — zero hollow interior gap!
  const buildQuiltCrossSection = (expand = 0, domeBoost = 0) => {
    const s = new THREE.Shape();
    const ox = 1.07 + expand;
    const ix = 0.94;
    const baseSideY = 0.14;
    const innerBaseY = 0.48;
    const peakY = 1.16 + domeBoost;

    s.moveTo(-ox, baseSideY);
    s.lineTo(-ox, 0.58);
    s.bezierCurveTo(-ox, 0.78, -0.78, 1.04 + domeBoost, -0.34, 1.13 + domeBoost);
    s.quadraticCurveTo(0, peakY + 0.03, 0.34, 1.13 + domeBoost);
    s.bezierCurveTo(0.78, 1.04 + domeBoost, ox, 0.78, ox, 0.58);
    s.lineTo(ox, baseSideY);
    s.lineTo(ix, baseSideY);
    s.lineTo(ix, innerBaseY);
    s.lineTo(-ix, innerBaseY);
    s.lineTo(-ix, baseSideY);
    s.closePath();
    return s;
  };

  // Main quilted blanket covering neck (z=-0.44) all the way past foot of mattress (z=+1.20)
  const mainGeo = new THREE.ExtrudeGeometry(buildQuiltCrossSection(0, 0), {
    depth: 1.54,
    bevelEnabled: true,
    bevelThickness: 0.055,
    bevelSize: 0.035,
    bevelSegments: 4,
    curveSegments: 22,
  });
  mainGeo.translate(0, 0, -0.38);
  const mainQuilt = new THREE.Mesh(mainGeo, quiltMat);

  // Plush folded cream/pastel cuff right up at the sleeping character's neck/collarbone
  const cuffGeo = new THREE.ExtrudeGeometry(buildQuiltCrossSection(0.015, 0.018), {
    depth: 0.16,
    bevelEnabled: true,
    bevelThickness: 0.032,
    bevelSize: 0.02,
    bevelSegments: 3,
    curveSegments: 22,
  });
  cuffGeo.translate(0, 0, -0.415);
  const cuffMesh = new THREE.Mesh(cuffGeo, cuffMat);

  sleepGrp.add(mainQuilt, cuffMesh);
  return sleepGrp;
}

function buildUnderPotWoodStand(
  woodMat: THREE.Material,
  trayTopY = 0.175,
  trayRadius = 0.195,
): THREE.Group {
  const stand = new THREE.Group();
  const barY = trayTopY - 0.026;
  const legLen = Math.hypot(0.035, barY);

  // 4 short splayed wooden legs strictly UNDER the cross-cradle (never piercing the pot!)
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.023, 0.017, legLen, 8), woodMat);
    const rMid = trayRadius * 0.88;
    leg.position.set(Math.cos(a) * rMid, barY * 0.5, Math.sin(a) * rMid);
    leg.rotation.order = 'YXZ';
    leg.rotation.y = -a;
    leg.rotation.z = -0.18;
    stand.add(leg);
  }

  // Cross-cradle bars supporting the circular wooden tray
  for (let i = 0; i < 2; i++) {
    const bar = new THREE.Mesh(
      new RoundedBoxGeometry(trayRadius * 1.92, 0.032, 0.04, 2, 0.008),
      woodMat,
    );
    bar.position.y = barY;
    bar.rotation.y = i * (Math.PI / 2);
    stand.add(bar);
  }

  const tray = new THREE.Mesh(
    new THREE.CylinderGeometry(trayRadius, trayRadius * 0.94, 0.026, 16),
    woodMat,
  );
  tray.position.y = trayTopY - 0.013;
  stand.add(tray);

  return stand;
}

let _clayFiddleLeafGeo: THREE.BufferGeometry | null = null;
function getClayFiddleLeafGeometry(): THREE.BufferGeometry {
  if (_clayFiddleLeafGeo) return _clayFiddleLeafGeo;
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(0.035, 0.042, 0.075, 0.052, 0.115, 0.044);
  s.bezierCurveTo(0.165, 0.034, 0.215, 0.118, 0.295, 0.105);
  s.bezierCurveTo(0.355, 0.095, 0.375, 0.036, 0.375, 0);
  s.bezierCurveTo(0.375, -0.036, 0.355, -0.095, 0.295, -0.105);
  s.bezierCurveTo(0.215, -0.118, 0.165, -0.034, 0.115, -0.044);
  s.bezierCurveTo(0.075, -0.052, 0.035, -0.042, 0, 0);

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.012,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.011,
    bevelSegments: 4,
    curveSegments: 14,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, -0.006, 0);

  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const u = THREE.MathUtils.clamp(x / 0.38, 0, 1);
    const arch = Math.sin(u * Math.PI) * 0.022 - u * u * 0.018;
    const cup = z * z * 0.35;
    pos.setY(i, y + arch + cup);
  }
  geo.computeVertexNormals();
  _clayFiddleLeafGeo = geo;
  return geo;
}

let _clayMonsteraLeafGeo: THREE.BufferGeometry | null = null;
function getClayMonsteraLeafGeometry(): THREE.BufferGeometry {
  if (_clayMonsteraLeafGeo) return _clayMonsteraLeafGeo;
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  // Basal upper lobe + sculpted Monstera scallop notches tapering to plump rounded tip
  s.bezierCurveTo(-0.035, 0.055, 0.02, 0.138, 0.095, 0.145);
  s.bezierCurveTo(0.115, 0.147, 0.125, 0.105, 0.145, 0.105);
  s.bezierCurveTo(0.165, 0.105, 0.17, 0.142, 0.205, 0.132);
  s.bezierCurveTo(0.222, 0.126, 0.228, 0.092, 0.246, 0.09);
  s.bezierCurveTo(0.268, 0.088, 0.305, 0.068, 0.345, 0.016);
  s.quadraticCurveTo(0.365, 0, 0.345, -0.016);
  // Symmetric lower lobe
  s.bezierCurveTo(0.305, -0.068, 0.268, -0.088, 0.246, -0.09);
  s.bezierCurveTo(0.228, -0.092, 0.222, -0.126, 0.205, -0.132);
  s.bezierCurveTo(0.17, -0.142, 0.165, -0.105, 0.145, -0.105);
  s.bezierCurveTo(0.125, -0.105, 0.115, -0.147, 0.095, -0.145);
  s.bezierCurveTo(0.02, -0.138, -0.035, -0.055, 0, 0);

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.011,
    bevelEnabled: true,
    bevelThickness: 0.011,
    bevelSize: 0.01,
    bevelSegments: 4,
    curveSegments: 14,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, -0.0055, 0);

  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const u = THREE.MathUtils.clamp(x / 0.35, 0, 1);
    const arch = Math.sin(u * Math.PI) * 0.02 - u * u * 0.024;
    const cup = z * z * 0.25;
    pos.setY(i, y + arch + cup);
  }
  geo.computeVertexNormals();
  _clayMonsteraLeafGeo = geo;
  return geo;
}

export function buildFurnitureMesh(item: FurnitureCatalogItem): THREE.Group {
  const g = new THREE.Group();
  const mainMat = clayMat(item.color, 0.72);
  const accentMat = clayMat(item.accentColor || '#9E734B', 0.65);

  switch (item.kind) {
    case 'sofa': {
      // Raised on 4 slender wooden legs + cushion top at y=0.52 (matches outdoor map bench)
      const legMat = clayMat('#7D5333', 0.68);
      [
        [-0.88, -0.34],
        [0.88, -0.34],
        [-0.88, 0.34],
        [0.88, 0.34],
      ].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.032, 0.18, 8), legMat);
        leg.position.set(lx, 0.09, lz);
        g.add(leg);
      });
      const woodBase = new THREE.Mesh(
        new RoundedBoxGeometry(1.98, 0.09, 0.88, 2, 0.03),
        legMat,
      );
      woodBase.position.set(0, 0.21, 0);
      const seatCushion = new THREE.Mesh(
        new RoundedBoxGeometry(1.78, 0.28, 0.86, 3, 0.1),
        mainMat,
      );
      seatCushion.position.set(0, 0.38, 0.02);
      const back = new THREE.Mesh(
        new RoundedBoxGeometry(2.0, 0.72, 0.24, 3, 0.1),
        accentMat,
      );
      back.position.set(0, 0.68, -0.33);
      [-0.91, 0.91].forEach((ax) => {
        const arm = new THREE.Mesh(
          new RoundedBoxGeometry(0.22, 0.48, 0.86, 3, 0.08),
          accentMat,
        );
        arm.position.set(ax, 0.48, 0);
        g.add(arm);
      });
      // Throw pillows tucked to the left/right corners so center sitting stays crisp
      [-0.64, 0.64].forEach((px) => {
        const cushion = new THREE.Mesh(
          new RoundedBoxGeometry(0.36, 0.28, 0.16, 2, 0.06),
          clayMat('#FFF6EA', 0.8),
        );
        cushion.position.set(px, 0.66, -0.17);
        cushion.rotation.x = -0.22;
        cushion.rotation.z = px < 0 ? 0.1 : -0.1;
        g.add(cushion);
      });
      g.add(woodBase, seatCushion, back);
      break;
    }

    case 'armchair': {
      const legMat = clayMat('#7D5333', 0.68);
      [
        [-0.38, -0.32],
        [0.38, -0.32],
        [-0.38, 0.32],
        [0.38, 0.32],
      ].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.03, 0.18, 8), legMat);
        leg.position.set(lx, 0.09, lz);
        g.add(leg);
      });
      const woodBase = new THREE.Mesh(
        new RoundedBoxGeometry(0.96, 0.09, 0.84, 2, 0.03),
        legMat,
      );
      woodBase.position.set(0, 0.21, 0);
      const seat = new THREE.Mesh(
        new RoundedBoxGeometry(0.84, 0.28, 0.84, 3, 0.1),
        mainMat,
      );
      seat.position.set(0, 0.38, 0.02);
      const back = new THREE.Mesh(
        new RoundedBoxGeometry(0.98, 0.72, 0.22, 3, 0.09),
        accentMat,
      );
      back.position.set(0, 0.68, -0.34);
      [-0.42, 0.42].forEach((ax) => {
        const arm = new THREE.Mesh(
          new RoundedBoxGeometry(0.18, 0.46, 0.82, 2, 0.06),
          accentMat,
        );
        arm.position.set(ax, 0.47, 0);
        g.add(arm);
      });
      g.add(woodBase, seat, back);
      break;
    }

    case 'coffee_table': {
      const top = new THREE.Mesh(
        new RoundedBoxGeometry(1.36, 0.12, 0.88, 3, 0.05),
        mainMat,
      );
      top.position.y = 0.46;
      [
        [-0.54, -0.32],
        [0.54, -0.32],
        [-0.54, 0.32],
        [0.54, 0.32],
      ].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.42, 7), accentMat);
        leg.position.set(lx, 0.21, lz);
        g.add(leg);
      });
      const tray = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.26, 0.05, 12),
        clayMat('#FFF8EB', 0.5),
      );
      tray.position.set(-0.2, 0.54, 0);
      const mug = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.06, 0.11, 9),
        clayMat('#F28482', 0.4),
      );
      mug.position.set(-0.2, 0.61, 0);
      g.add(top, tray, mug);
      break;
    }

    case 'tv_stand': {
      const cabinet = new THREE.Mesh(
        new RoundedBoxGeometry(1.9, 0.58, 0.68, 3, 0.05),
        mainMat,
      );
      cabinet.position.y = 0.34;
      const screenFrame = new THREE.Mesh(
        new RoundedBoxGeometry(1.52, 0.92, 0.1, 2, 0.04),
        accentMat,
      );
      screenFrame.position.set(0, 1.15, -0.05);
      const screen = new THREE.Mesh(
        new THREE.BoxGeometry(1.36, 0.76, 0.11),
        glossyClayMat('#8CD3F5', 0.18),
      );
      screen.position.set(0, 1.15, -0.04);
      const standNeck = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.22, 0.12),
        accentMat,
      );
      standNeck.position.set(0, 0.68, -0.05);
      g.add(cabinet, screenFrame, screen, standNeck);
      break;
    }

    case 'bookshelf': {
      // Open hollow bookcase (back + left/right sides + shelves) so books clearly show inside!
      const shelfMat = clayMat('#8F5F39', 0.68);
      const pageMat = clayMat('#FFF8EB', 0.78);
      const backBoard = new THREE.Mesh(
        new RoundedBoxGeometry(1.4, 2.02, 0.06, 2, 0.02),
        mainMat,
      );
      backBoard.position.set(0, 1.04, -0.25);

      [-0.67, 0.67].forEach((sx) => {
        const side = new THREE.Mesh(
          new RoundedBoxGeometry(0.08, 2.04, 0.56, 2, 0.025),
          mainMat,
        );
        side.position.set(sx, 1.04, 0);
        g.add(side);
      });

      const basePlinth = new THREE.Mesh(
        new RoundedBoxGeometry(1.42, 0.13, 0.56, 2, 0.025),
        shelfMat,
      );
      basePlinth.position.set(0, 0.065, 0);

      const topCrown = new THREE.Mesh(
        new RoundedBoxGeometry(1.48, 0.09, 0.6, 2, 0.03),
        shelfMat,
      );
      topCrown.position.set(0, 2.05, 0.01);
      g.add(backBoard, basePlinth, topCrown);

      [0.72, 1.34].forEach((sy) => {
        const shelf = new THREE.Mesh(
          new RoundedBoxGeometry(1.3, 0.055, 0.52, 2, 0.015),
          shelfMat,
        );
        shelf.position.set(0, sy, 0);
        g.add(shelf);
      });

      // Rich rows of colorful upright + leaning books inside each open cubby!
      const bookCols = ['#E86B82', '#5FA683', '#F4C152', '#5BA4DC', '#9C7EDB', '#EE8B62'];
      const shelfFloors = [0.13, 0.748, 1.368];
      shelfFloors.forEach((floorY, rIdx) => {
        let cursorX = -0.54;
        const count = rIdx === 1 ? 5 : 6;
        for (let b = 0; b < count; b++) {
          const bw = 0.085 + ((b + rIdx) % 3) * 0.022;
          const bh = 0.34 + ((b * 2 + rIdx) % 3) * 0.065;
          const bd = 0.34 + ((b + rIdx) % 2) * 0.03;
          const bColor = bookCols[(b + rIdx * 2) % bookCols.length];
          const book = new THREE.Mesh(
            new RoundedBoxGeometry(bw, bh, bd, 2, 0.014),
            clayMat(bColor, 0.58),
          );
          book.position.set(cursorX + bw * 0.5, floorY + bh * 0.5, 0.03);
          const pages = new THREE.Mesh(
            new THREE.BoxGeometry(bw * 0.62, bh * 0.9, bd * 0.94),
            pageMat,
          );
          pages.position.set(cursorX + bw * 0.5, floorY + bh * 0.5 + 0.015, 0.045);
          g.add(book, pages);
          cursorX += bw + 0.025;
        }
        // Extra leaning book or cozy mini decor on right side of shelf
        if (rIdx === 0) {
          const stack1 = new THREE.Mesh(
            new RoundedBoxGeometry(0.32, 0.07, 0.26, 2, 0.015),
            clayMat('#5FA683', 0.6),
          );
          stack1.position.set(0.38, floorY + 0.035, 0.05);
          const stack2 = new THREE.Mesh(
            new RoundedBoxGeometry(0.28, 0.065, 0.24, 2, 0.015),
            clayMat('#F4C152', 0.6),
          );
          stack2.position.set(0.39, floorY + 0.1, 0.05);
          g.add(stack1, stack2);
        } else if (rIdx === 1) {
          const miniPot = new THREE.Mesh(
            new THREE.CylinderGeometry(0.085, 0.068, 0.12, 9),
            clayMat('#D98C5F', 0.68),
          );
          miniPot.position.set(0.38, floorY + 0.06, 0.08);
          const miniPlant = buildRosetteSucculent('#6EB882', 1.15);
          miniPlant.position.set(0.38, floorY + 0.11, 0.08);
          g.add(miniPot, miniPlant);
        } else {
          const leanBook = new THREE.Mesh(
            new RoundedBoxGeometry(0.09, 0.38, 0.34, 2, 0.014),
            clayMat('#E86B82', 0.58),
          );
          leanBook.position.set(0.41, floorY + 0.18, 0.03);
          leanBook.rotation.z = 0.26;
          g.add(leanBook);
        }
      });
      break;
    }

    case 'rug_round': {
      const outer = new THREE.Mesh(
        new THREE.CylinderGeometry(1.55, 1.58, 0.04, 24),
        mainMat,
      );
      outer.scale.set(1.06, 1, 0.84);
      outer.position.y = 0.02;
      const inner = new THREE.Mesh(
        new THREE.CylinderGeometry(1.16, 1.18, 0.045, 24),
        accentMat,
      );
      inner.scale.set(1.06, 1, 0.84);
      inner.position.y = 0.022;
      g.add(outer, inner);
      break;
    }

    case 'bed': {
      const headboard = new THREE.Mesh(
        new RoundedBoxGeometry(2.1, 1.42, 0.2, 3, 0.06),
        accentMat,
      );
      headboard.position.set(0, 0.72, -1.12);
      const mattress = new THREE.Mesh(
        new RoundedBoxGeometry(2.0, 0.5, 2.3, 3, 0.1),
        clayMat('#FFFDF8', 0.78),
      );
      mattress.position.set(0, 0.4, 0);

      const idleBlanket = new THREE.Group();
      const blanket = new THREE.Mesh(
        new RoundedBoxGeometry(2.08, 0.52, 1.5, 3, 0.12),
        mainMat,
      );
      blanket.position.set(0, 0.42, 0.42);
      idleBlanket.add(blanket);

      const sleepBlanket = createSolidBedSleepBlanket(mainMat, clayMat('#FFFDF8', 0.78));
      sleepBlanket.visible = false;

      g.userData.bedIdleBlanket = idleBlanket;
      g.userData.bedSleepBlanket = sleepBlanket;

      [-0.44, 0.44].forEach((px) => {
        const pillow = new THREE.Mesh(
          new RoundedBoxGeometry(0.82, 0.22, 0.5, 2, 0.07),
          clayMat('#FFFDF8', 0.8),
        );
        pillow.position.set(px, 0.72, -0.76);
        g.add(pillow);
      });
      g.add(headboard, mattress, idleBlanket, sleepBlanket);
      break;
    }

    case 'wardrobe': {
      const wBody = new THREE.Mesh(
        new RoundedBoxGeometry(1.82, 2.65, 1.0, 3, 0.07),
        mainMat,
      );
      wBody.position.y = 1.32;
      const wTop = new THREE.Mesh(
        new RoundedBoxGeometry(1.98, 0.18, 1.12, 2, 0.04),
        clayMat('#8A5C36', 0.65),
      );
      wTop.position.y = 2.7;
      const mirror = new THREE.Mesh(
        new RoundedBoxGeometry(0.64, 1.78, 0.08, 2, 0.03),
        glossyClayMat(item.accentColor || '#DDF3FC', 0.1),
      );
      mirror.position.set(0.4, 1.42, 0.5);
      const doorPanel = new THREE.Mesh(
        new RoundedBoxGeometry(0.66, 2.15, 0.08, 2, 0.03),
        clayMat('#C59363', 0.64),
      );
      doorPanel.position.set(-0.4, 1.38, 0.5);
      g.add(wBody, wTop, mirror, doorPanel);
      break;
    }

    case 'nightstand': {
      // Cozy raised bedside cabinet with 2 framed drawers, brass knobs & sculpted bedside lamp
      const woodLegMat = clayMat('#875935', 0.7);
      const drawerMat = clayMat('#EFE0C8', 0.68);
      const brassMat = glossyClayMat('#F4C95D', 0.24);

      [
        [-0.31, -0.25],
        [0.31, -0.25],
        [-0.31, 0.25],
        [0.31, 0.25],
      ].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.024, 0.15, 7), woodLegMat);
        leg.position.set(lx, 0.075, lz);
        g.add(leg);
      });

      const body = new THREE.Mesh(
        new RoundedBoxGeometry(0.76, 0.5, 0.62, 2, 0.04),
        mainMat,
      );
      body.position.set(0, 0.39, 0);

      const topSlab = new THREE.Mesh(
        new RoundedBoxGeometry(0.84, 0.06, 0.68, 2, 0.025),
        clayMat('#B47B48', 0.62),
      );
      topSlab.position.set(0, 0.67, 0);

      [0.27, 0.5].forEach((dy) => {
        const drawerFront = new THREE.Mesh(
          new RoundedBoxGeometry(0.62, 0.18, 0.05, 2, 0.02),
          drawerMat,
        );
        drawerFront.position.set(0, dy, 0.3);
        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.03, 7, 7), brassMat);
        knob.position.set(0, dy, 0.34);
        g.add(drawerFront, knob);
      });

      // Cute bedside ceramic lamp + tiny book on top
      const miniBook = new THREE.Mesh(
        new RoundedBoxGeometry(0.24, 0.045, 0.18, 2, 0.012),
        clayMat('#7BAE8B', 0.65),
      );
      miniBook.position.set(-0.2, 0.72, 0.08);
      miniBook.rotation.y = 0.25;

      const lampPot = new THREE.Mesh(
        new THREE.SphereGeometry(0.095, 10, 8),
        clayMat('#F3D3B3', 0.48),
      );
      lampPot.scale.set(1, 0.9, 1);
      lampPot.position.set(0.14, 0.77, -0.05);
      const lampNeck = new THREE.Mesh(
        new THREE.CylinderGeometry(0.024, 0.028, 0.12, 8),
        brassMat,
      );
      lampNeck.position.set(0.14, 0.88, -0.05);
      const shadeMat = new THREE.MeshStandardMaterial({
        color: item.accentColor || '#FFF3D6',
        emissive: '#FFD27A',
        emissiveIntensity: 0.34,
        roughness: 0.45,
      });
      const shade = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.19, 0.21, 12),
        shadeMat,
      );
      shade.position.set(0.14, 1.0, -0.05);
      const shadeCap = new THREE.Mesh(new THREE.SphereGeometry(0.024, 7, 7), brassMat);
      shadeCap.position.set(0.14, 1.11, -0.05);

      g.add(body, topSlab, miniBook, lampPot, lampNeck, shade, shadeCap);
      break;
    }

    case 'dining_table': {
      // Sculpted oak family dining table with ONLY a pretty light-blue tablecloth on top (no vase!)
      const woodLegMat = clayMat('#9E6A3E', 0.68);
      const clothColor = item.accentColor || '#BDE5FA';
      const clothMat = clayMat(clothColor, 0.78);
      const laceMat = clayMat('#F2FAFF', 0.72);

      const top = new THREE.Mesh(
        new RoundedBoxGeometry(2.06, 0.1, 1.36, 3, 0.045),
        mainMat,
      );
      top.position.y = 0.84;

      const apron = new THREE.Mesh(
        new RoundedBoxGeometry(1.82, 0.1, 1.12, 2, 0.02),
        woodLegMat,
      );
      apron.position.y = 0.75;

      [
        [-0.84, -0.49],
        [0.84, -0.49],
        [-0.84, 0.49],
        [0.84, 0.49],
      ].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.042, 0.8, 8), woodLegMat);
        leg.position.set(lx, 0.4, lz);
        const footCap = new THREE.Mesh(
          new THREE.CylinderGeometry(0.044, 0.046, 0.06, 8),
          glossyClayMat('#E8C366', 0.28),
        );
        footCap.position.set(lx, 0.03, lz);
        g.add(leg, footCap);
      });

      // Pretty light-blue tablecloth draped softly across the tabletop with hanging hem & trim
      const clothTop = new THREE.Mesh(
        new RoundedBoxGeometry(2.09, 0.032, 1.39, 3, 0.02),
        clothMat,
      );
      clothTop.position.set(0, 0.896, 0);

      // Draped side overhangs
      const overhangFB = new THREE.Mesh(
        new RoundedBoxGeometry(2.06, 0.14, 1.41, 3, 0.025),
        clothMat,
      );
      overhangFB.position.set(0, 0.835, 0);

      // Delicate pale-white center stripe/piping accent on the light-blue cloth
      const hemTrim = new THREE.Mesh(
        new RoundedBoxGeometry(2.08, 0.022, 1.42, 2, 0.01),
        laceMat,
      );
      hemTrim.position.set(0, 0.77, 0);

      g.add(top, apron, clothTop, overhangFB, hemTrim);
      break;
    }

    case 'dining_chair': {
      // Raised to seat top y=0.50 (matches outdoor bench posture cleanly)
      const seat = new THREE.Mesh(
        new RoundedBoxGeometry(0.6, 0.08, 0.56, 2, 0.035),
        accentMat,
      );
      seat.position.y = 0.46;
      const frameSeat = new THREE.Mesh(
        new RoundedBoxGeometry(0.62, 0.05, 0.58, 2, 0.02),
        mainMat,
      );
      frameSeat.position.y = 0.41;
      [-0.23, 0.23].forEach((bx) => {
        const post = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.58, 0.06, 2, 0.02), mainMat);
        post.position.set(bx, 0.74, -0.24);
        g.add(post);
      });
      const topRail = new THREE.Mesh(
        new RoundedBoxGeometry(0.58, 0.14, 0.07, 2, 0.025),
        mainMat,
      );
      topRail.position.set(0, 0.96, -0.24);
      const midRail = new THREE.Mesh(
        new RoundedBoxGeometry(0.52, 0.08, 0.05, 2, 0.015),
        mainMat,
      );
      midRail.position.set(0, 0.72, -0.24);
      [
        [-0.22, -0.21],
        [0.22, -0.21],
        [-0.22, 0.21],
        [0.22, 0.21],
      ].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.028, 0.41, 7), mainMat);
        leg.position.set(lx, 0.205, lz);
        g.add(leg);
      });
      g.add(seat, frameSeat, topRail, midRail);
      break;
    }

    case 'fridge': {
      const body = new THREE.Mesh(
        new RoundedBoxGeometry(1.04, 2.28, 0.96, 3, 0.08),
        mainMat,
      );
      body.position.y = 1.14;
      const seam = new THREE.Mesh(
        new THREE.BoxGeometry(1.06, 0.04, 0.98),
        accentMat,
      );
      seam.position.y = 1.48;
      [0.95, 1.85].forEach((hy) => {
        const handle = new THREE.Mesh(
          new RoundedBoxGeometry(0.06, 0.38, 0.08, 2, 0.02),
          accentMat,
        );
        handle.position.set(-0.34, hy, 0.5);
        g.add(handle);
      });
      g.add(body, seam);
      break;
    }

    case 'dish_cabinet': {
      // Open-front cottage hutch displaying plates, bowls, mugs & glass bottles inside!
      const darkWoodMat = clayMat('#8F5F39', 0.68);
      const creamDoorMat = clayMat('#EFE0CA', 0.7);
      const goldMat = glossyClayMat('#F4C95D', 0.24);
      const plateWhite = glossyClayMat('#FFFFFF', 0.24);
      const plateBlue = glossyClayMat('#9CD6EE', 0.24);
      const plateSage = glossyClayMat('#9AD1B3', 0.26);
      const glassBottleMat = glossyClayMat('#8FD8EC', 0.12);
      const amberBottleMat = glossyClayMat('#E3A65B', 0.16);

      // Lower buffet cabinet
      const lowerBase = new THREE.Mesh(
        new RoundedBoxGeometry(1.48, 0.82, 0.72, 2, 0.04),
        mainMat,
      );
      lowerBase.position.set(0, 0.45, 0);
      const counterTop = new THREE.Mesh(
        new RoundedBoxGeometry(1.56, 0.07, 0.78, 2, 0.025),
        darkWoodMat,
      );
      counterTop.position.set(0, 0.89, 0);

      [-0.36, 0.36].forEach((dx) => {
        const lDoor = new THREE.Mesh(
          new RoundedBoxGeometry(0.62, 0.56, 0.05, 2, 0.02),
          creamDoorMat,
        );
        lDoor.position.set(dx, 0.42, 0.35);
        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.03, 7, 7), goldMat);
        knob.position.set(dx > 0 ? dx - 0.2 : dx + 0.2, 0.46, 0.39);
        g.add(lDoor, knob);
      });

      // Open upper hutch frame (back + sides + shelves + top crown)
      const upperBack = new THREE.Mesh(
        new RoundedBoxGeometry(1.4, 1.24, 0.06, 2, 0.02),
        clayMat('#EDE0CE', 0.75),
      );
      upperBack.position.set(0, 1.54, -0.3);

      [-0.68, 0.68].forEach((sx) => {
        const side = new THREE.Mesh(
          new RoundedBoxGeometry(0.07, 1.26, 0.46, 2, 0.02),
          mainMat,
        );
        side.position.set(sx, 1.54, -0.1);
        g.add(side);
      });

      const crown = new THREE.Mesh(
        new RoundedBoxGeometry(1.5, 0.09, 0.52, 2, 0.03),
        darkWoodMat,
      );
      crown.position.set(0, 2.18, -0.09);

      // Subtle center divider & glass-door side trim strips (open center so dishes shine)
      const centerDivider = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 1.2, 0.42),
        mainMat,
      );
      centerDivider.position.set(0, 1.54, -0.1);

      [1.33, 1.74].forEach((sy) => {
        const shelf = new THREE.Mesh(
          new RoundedBoxGeometry(1.32, 0.045, 0.42, 2, 0.015),
          darkWoodMat,
        );
        shelf.position.set(0, sy, -0.1);
        g.add(shelf);
      });

      // Bottom hutch shelf (y=0.925): stacked plates + teapot + cups
      for (let i = 0; i < 4; i++) {
        const plate = new THREE.Mesh(
          new THREE.CylinderGeometry(0.14, 0.11, 0.026, 14),
          i % 2 === 0 ? plateWhite : plateBlue,
        );
        plate.position.set(-0.44, 0.94 + i * 0.032, -0.08);
        g.add(plate);
      }
      // Teapot + 2 teacups
      const teapot = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), plateSage);
      teapot.scale.set(1.1, 0.86, 1.1);
      teapot.position.set(-0.18, 1.01, -0.06);
      const potLid = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 6), plateWhite);
      potLid.position.set(-0.18, 1.11, -0.06);
      g.add(teapot, potLid);

      [0.22, 0.46].forEach((cx, idx) => {
        const cup = new THREE.Mesh(
          new THREE.CylinderGeometry(0.068, 0.052, 0.11, 10),
          idx === 0 ? plateWhite : plateBlue,
        );
        cup.position.set(cx, 0.98, -0.05);
        g.add(cup);
      });

      // Middle shelf (y=1.35): nested bowls + glass bottles + condiment jars
      for (let i = 0; i < 3; i++) {
        const bowl = new THREE.Mesh(
          new THREE.CylinderGeometry(0.11, 0.065, 0.055, 12),
          i === 1 ? plateBlue : plateWhite,
        );
        bowl.position.set(-0.42, 1.38 + i * 0.042, -0.07);
        g.add(bowl);
      }
      [
        [-0.17, 0.22, glassBottleMat],
        [0.2, 0.25, amberBottleMat],
        [0.34, 0.2, glassBottleMat],
        [0.49, 0.16, plateSage],
      ].forEach(([bx, bh, bMat]) => {
        const bottle = new THREE.Mesh(
          new THREE.CylinderGeometry(0.048, 0.058, bh as number, 10),
          bMat as THREE.Material,
        );
        bottle.position.set(bx as number, 1.35 + (bh as number) * 0.5, -0.07);
        const cork = new THREE.Mesh(
          new THREE.CylinderGeometry(0.025, 0.022, 0.04, 8),
          clayMat('#C48F5A', 0.72),
        );
        cork.position.set(bx as number, 1.35 + (bh as number) + 0.015, -0.07);
        g.add(bottle, cork);
      });

      // Top shelf (y=1.76): decorative leaning platters + tall jars
      [-0.44, -0.22].forEach((px, idx) => {
        const standPlate = new THREE.Mesh(
          new THREE.CylinderGeometry(0.14, 0.14, 0.024, 16),
          idx === 0 ? plateBlue : plateWhite,
        );
        standPlate.rotation.x = Math.PI / 2 - 0.18;
        standPlate.position.set(px, 1.9, -0.22);
        g.add(standPlate);
      });
      [0.22, 0.44].forEach((jx, idx) => {
        const jar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.072, 0.072, 0.22, 10),
          idx === 0 ? plateWhite : glassBottleMat,
        );
        jar.position.set(jx, 1.87, -0.08);
        const lid = new THREE.Mesh(
          new THREE.CylinderGeometry(0.078, 0.078, 0.032, 10),
          darkWoodMat,
        );
        lid.position.set(jx, 1.99, -0.08);
        g.add(jar, lid);
      });

      g.add(lowerBase, counterTop, upperBack, crown, centerDivider);
      break;
    }

    case 'bathtub': {
      // Hollow clawfoot ceramic soaking tub (y=0.06..0.76) with chrome faucet, running water & rubber ducky!
      const porcelainMat = clayMat(item.color || '#FFFFFF', 0.28);
      const trimGoldMat = glossyClayMat('#E6BC5A', 0.24);
      const chromeMat = clayMat('#D6DFE8', 0.22, 0.74);

      // 4 claw feet
      [
        [-0.78, -0.34],
        [0.78, -0.34],
        [-0.78, 0.34],
        [0.78, 0.34],
      ].forEach(([fx, fz]) => {
        const foot = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 7), trimGoldMat);
        foot.scale.set(1.15, 0.85, 1.15);
        foot.position.set(fx, 0.055, fz);
        g.add(foot);
      });

      // Tub inner floor
      const tubFloor = new THREE.Mesh(
        new RoundedBoxGeometry(1.94, 0.1, 1.0, 3, 0.04),
        porcelainMat,
      );
      tubFloor.position.set(0, 0.12, 0);

      // 4 hollow soaking tub walls (y=0.14..0.72)
      const wallFront = new THREE.Mesh(
        new RoundedBoxGeometry(1.98, 0.62, 0.13, 3, 0.05),
        porcelainMat,
      );
      wallFront.position.set(0, 0.43, 0.45);
      const wallBack = wallFront.clone();
      wallBack.position.z = -0.45;

      const wallLeft = new THREE.Mesh(
        new RoundedBoxGeometry(0.14, 0.62, 1.02, 3, 0.05),
        porcelainMat,
      );
      wallLeft.position.set(-0.92, 0.43, 0);
      const wallRight = wallLeft.clone();
      wallRight.position.x = 0.92;

      // Rolled porcelain rim lip (top at y=0.76)
      const rimFront = new THREE.Mesh(
        new RoundedBoxGeometry(2.06, 0.08, 0.17, 3, 0.04),
        porcelainMat,
      );
      rimFront.position.set(0, 0.74, 0.46);
      const rimBack = rimFront.clone();
      rimBack.position.z = -0.46;
      const rimLeft = new THREE.Mesh(
        new RoundedBoxGeometry(0.19, 0.08, 1.08, 3, 0.04),
        porcelainMat,
      );
      rimLeft.position.set(-0.94, 0.74, 0);
      const rimRight = rimLeft.clone();
      rimRight.position.x = 0.94;

      // Chrome gooseneck mixer faucet + cross handles + showerhead at +X end
      const spoutStand = new THREE.Mesh(
        new THREE.CylinderGeometry(0.036, 0.048, 0.34, 10),
        chromeMat,
      );
      spoutStand.position.set(0.88, 0.9, 0);
      const spoutArch = new THREE.Mesh(
        new THREE.TorusGeometry(0.14, 0.026, 8, 12, Math.PI),
        chromeMat,
      );
      spoutArch.position.set(0.74, 1.06, 0);
      [-0.14, 0.14].forEach((hz) => {
        const knobPost = new THREE.Mesh(
          new THREE.CylinderGeometry(0.026, 0.032, 0.1, 8),
          chromeMat,
        );
        knobPost.position.set(0.92, 0.82, hz);
        const knobCap = new THREE.Mesh(
          new THREE.CylinderGeometry(0.045, 0.045, 0.025, 8),
          trimGoldMat,
        );
        knobCap.position.set(0.92, 0.875, hz);
        g.add(knobPost, knobCap);
      });

      // Little yellow rubber ducky sitting on back rim
      const duckBody = new THREE.Mesh(
        new THREE.SphereGeometry(0.065, 9, 8),
        clayMat('#FFD447', 0.45),
      );
      duckBody.scale.set(1.25, 0.88, 0.95);
      duckBody.position.set(-0.55, 0.82, -0.46);
      const duckHead = new THREE.Mesh(
        new THREE.SphereGeometry(0.045, 8, 8),
        clayMat('#FFD447', 0.45),
      );
      duckHead.position.set(-0.49, 0.88, -0.46);
      const duckBeak = new THREE.Mesh(
        new THREE.ConeGeometry(0.022, 0.04, 6),
        clayMat('#F47B3B', 0.5),
      );
      duckBeak.rotation.z = -Math.PI / 2;
      duckBeak.position.set(-0.44, 0.875, -0.46);

      // Dynamic translucent turquoise bath water inside hollow tub
      const waterMat = new THREE.MeshStandardMaterial({
        color: item.accentColor || '#68CAEE',
        emissive: '#38A2CC',
        emissiveIntensity: 0.12,
        roughness: 0.12,
        metalness: 0.05,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
      });
      const tubWater = new THREE.Mesh(
        new RoundedBoxGeometry(1.7, 0.06, 0.78, 2, 0.02),
        waterMat,
      );
      tubWater.position.set(0, 0.34, 0);
      tubWater.renderOrder = 3;

      // Flowing faucet stream dropping from spout (x=0.60, y=1.06 down to water)
      const streamMat = new THREE.MeshStandardMaterial({
        color: '#BCEEFF',
        emissive: '#8CE2FF',
        emissiveIntensity: 0.25,
        roughness: 0.08,
        transparent: true,
        opacity: 0.76,
        depthWrite: false,
      });
      const tubStream = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.026, 0.72, 10),
        streamMat,
      );
      tubStream.position.set(0.6, 0.7, 0);
      tubStream.renderOrder = 4;

      // Splash ripple ring on bathwater where stream hits
      const rippleMat = new THREE.MeshBasicMaterial({
        color: '#E6FAFF',
        transparent: true,
        opacity: 0.72,
        side: THREE.DoubleSide,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      });
      const tubRipple = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.085, 18), rippleMat);
      tubRipple.rotation.x = -Math.PI / 2;
      tubRipple.position.set(0.6, 0.38, 0);
      tubRipple.renderOrder = 5;

      g.userData.tubWaterMesh = tubWater;
      g.userData.tubStreamMesh = tubStream;
      g.userData.tubRippleMesh = tubRipple;

      g.add(
        tubFloor,
        wallFront,
        wallBack,
        wallLeft,
        wallRight,
        rimFront,
        rimBack,
        rimLeft,
        rimRight,
        spoutStand,
        spoutArch,
        duckBody,
        duckHead,
        duckBeak,
        tubWater,
        tubStream,
        tubRipple,
      );
      break;
    }

    case 'vanity_sink': {
      // Cozy raised bathroom vanity with framed doors, marble counter, sculpted sink, gooseneck faucet, towel bar & arched mirror!
      const woodMat = clayMat('#B98452', 0.68);
      const doorMat = clayMat('#EFE4D4', 0.72);
      const marbleMat = glossyClayMat('#FBF8F3', 0.24);
      const chromeMat = clayMat('#D3DCE6', 0.22, 0.72);
      const goldMat = glossyClayMat('#F4C95D', 0.24);

      // 4 wooden feet
      [
        [-0.52, -0.26],
        [0.52, -0.26],
        [-0.52, 0.26],
        [0.52, 0.26],
      ].forEach(([lx, lz]) => {
        const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.028, 0.12, 8), woodMat);
        foot.position.set(lx, 0.06, lz);
        g.add(foot);
      });

      const cab = new THREE.Mesh(
        new RoundedBoxGeometry(1.22, 0.68, 0.66, 2, 0.04),
        mainMat,
      );
      cab.position.set(0, 0.46, 0);

      [-0.29, 0.29].forEach((dx) => {
        const door = new THREE.Mesh(
          new RoundedBoxGeometry(0.5, 0.54, 0.04, 2, 0.02),
          doorMat,
        );
        door.position.set(dx, 0.46, 0.33);
        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.026, 7, 7), goldMat);
        knob.position.set(dx > 0 ? dx - 0.17 : dx + 0.17, 0.5, 0.36);
        g.add(door, knob);
      });

      const counter = new THREE.Mesh(
        new RoundedBoxGeometry(1.3, 0.07, 0.74, 2, 0.025),
        marbleMat,
      );
      counter.position.set(0, 0.835, 0);

      const backsplash = new THREE.Mesh(
        new RoundedBoxGeometry(1.28, 0.14, 0.06, 2, 0.02),
        marbleMat,
      );
      backsplash.position.set(0, 0.93, -0.32);

      // Porcelain sink bowl + drain + gooseneck faucet
      const sinkRim = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.23, 0.1, 16),
        glossyClayMat('#FFFFFF', 0.18),
      );
      sinkRim.scale.set(1.18, 1, 0.9);
      sinkRim.position.set(0, 0.88, 0.02);

      const sinkWater = new THREE.Mesh(
        new THREE.CylinderGeometry(0.23, 0.23, 0.02, 16),
        glossyClayMat('#A9E2F5', 0.12),
      );
      sinkWater.scale.set(1.15, 1, 0.88);
      sinkWater.position.set(0, 0.925, 0.02);

      const faucetPost = new THREE.Mesh(
        new THREE.CylinderGeometry(0.024, 0.03, 0.22, 8),
        chromeMat,
      );
      faucetPost.position.set(0, 0.98, -0.23);
      const faucetNeck = new THREE.Mesh(
        new THREE.TorusGeometry(0.075, 0.018, 6, 10, Math.PI),
        chromeMat,
      );
      faucetNeck.rotation.y = Math.PI / 2;
      faucetNeck.position.set(0, 1.09, -0.155);

      // Soap dispenser & cup
      const soapBottle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.042, 0.048, 0.14, 9),
        clayMat('#8CD1B8', 0.42),
      );
      soapBottle.position.set(-0.44, 0.94, 0.06);
      const soapPump = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.014, 0.05, 6),
        chromeMat,
      );
      soapPump.position.set(-0.44, 1.03, 0.06);

      const tumbler = new THREE.Mesh(
        new THREE.CylinderGeometry(0.044, 0.036, 0.11, 9),
        clayMat('#FFD59E', 0.48),
      );
      tumbler.position.set(0.45, 0.925, 0.05);

      // Side towel bar & folded pastel hand towel
      const towelBar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, 0.42, 8),
        chromeMat,
      );
      towelBar.rotation.x = Math.PI / 2;
      towelBar.position.set(-0.67, 0.66, 0);
      const handTowel = new THREE.Mesh(
        new RoundedBoxGeometry(0.07, 0.34, 0.28, 2, 0.025),
        clayMat('#9FD7EE', 0.84),
      );
      handTowel.position.set(-0.68, 0.5, 0);

      // Wooden-framed arched bathroom mirror mounted on solid backing column
      const mirrorBack = new THREE.Mesh(
        new RoundedBoxGeometry(0.92, 0.94, 0.06, 2, 0.02),
        woodMat,
      );
      mirrorBack.position.set(0, 1.54, -0.31);
      const mirrorArchFrame = new THREE.Mesh(
        new THREE.CylinderGeometry(0.46, 0.46, 0.06, 20),
        woodMat,
      );
      mirrorArchFrame.rotation.x = Math.PI / 2;
      mirrorArchFrame.position.set(0, 1.88, -0.31);

      const mirrorGlassMat = glossyClayMat(item.accentColor || '#C8ECFA', 0.08);
      const mirrorGlassRect = new THREE.Mesh(
        new THREE.BoxGeometry(0.78, 0.8, 0.068),
        mirrorGlassMat,
      );
      mirrorGlassRect.position.set(0, 1.54, -0.305);
      const mirrorGlassArch = new THREE.Mesh(
        new THREE.CylinderGeometry(0.39, 0.39, 0.068, 20),
        mirrorGlassMat,
      );
      mirrorGlassArch.rotation.x = Math.PI / 2;
      mirrorGlassArch.position.set(0, 1.88, -0.305);

      g.add(
        cab,
        counter,
        backsplash,
        sinkRim,
        sinkWater,
        faucetPost,
        faucetNeck,
        soapBottle,
        soapPump,
        tumbler,
        towelBar,
        handTowel,
        mirrorBack,
        mirrorArchFrame,
        mirrorGlassRect,
        mirrorGlassArch,
      );
      break;
    }

    case 'floor_lamp': {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.08, 12), accentMat);
      base.position.y = 0.04;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.75, 8), accentMat);
      pole.position.y = 0.92;
      const shadeMat = new THREE.MeshStandardMaterial({
        color: item.color,
        emissive: '#FFD166',
        emissiveIntensity: 0.72,
        roughness: 0.42,
      });
      const shade = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.36, 0.42, 14),
        shadeMat,
      );
      shade.position.y = 1.84;
      const finial = new THREE.Mesh(
        new THREE.SphereGeometry(0.036, 8, 8),
        glossyClayMat('#F4C95D', 0.25),
      );
      finial.position.y = 2.08;
      g.userData.lampShadeMat = shadeMat;
      g.userData.lampLightLocalPos = [0, 1.76, 0];
      g.add(base, pole, shade, finial);
      break;
    }

    case 'table_lamp': {
      const potBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.14, 0.18, 12),
        accentMat,
      );
      potBase.position.y = 0.09;
      const brassStem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.03, 0.16, 8),
        glossyClayMat('#F4C95D', 0.25),
      );
      brassStem.position.y = 0.24;
      const shadeMat = new THREE.MeshStandardMaterial({
        color: item.color,
        emissive: '#FFD166',
        emissiveIntensity: 0.72,
        roughness: 0.42,
      });
      const shade = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.22, 0.24, 14),
        shadeMat,
      );
      shade.position.y = 0.38;
      g.userData.lampShadeMat = shadeMat;
      g.userData.lampLightLocalPos = [0, 0.42, 0];
      g.add(potBase, brassStem, shade);
      break;
    }

    case 'wall_lamp': {
      const cy = item.mountHeight ?? 2.02;
      const backPlate = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 0.04, 14),
        accentMat,
      );
      backPlate.rotation.x = Math.PI / 2;
      backPlate.position.set(0, cy, 0.02);
      const arm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.18, 8),
        glossyClayMat('#E8C366', 0.26),
      );
      arm.rotation.x = Math.PI / 2;
      arm.position.set(0, cy, 0.1);
      const shadeMat = new THREE.MeshStandardMaterial({
        color: item.color,
        emissive: '#FFD166',
        emissiveIntensity: 0.72,
        roughness: 0.4,
      });
      const shade = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.17, 0.18, 12),
        shadeMat,
      );
      shade.position.set(0, cy + 0.06, 0.19);
      g.userData.lampShadeMat = shadeMat;
      g.userData.lampLightLocalPos = [0, cy + 0.04, 0.26];
      g.add(backPlate, arm, shade);
      break;
    }

    case 'potted_plant': {
      if (item.id === 'plant_lavender') {
        // Fluted terracotta/cream pot + grassy base leaves + slender purple lavender flower spikes
        const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, 0.32, 12), accentMat);
        pot.position.y = 0.16;
        const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.23, 0.055, 12), accentMat);
        rim.position.y = 0.31;
        const soil = new THREE.Mesh(
          new THREE.CylinderGeometry(0.2, 0.2, 0.04, 10),
          clayMat('#6B4429', 0.9),
        );
        soil.position.y = 0.325;
        const grassMat = clayMat('#78AC7D', 0.76);
        const lavMat1 = clayMat(item.color || '#A678D3', 0.62);
        const lavMat2 = clayMat('#C29AE8', 0.6);

        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2;
          const r = 0.07 + (i % 2) * 0.05;
          const leafBlade = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.24, 5), grassMat);
          leafBlade.position.set(Math.cos(a) * r, 0.4, Math.sin(a) * r);
          leafBlade.rotation.z = -Math.cos(a) * 0.55;
          leafBlade.rotation.x = Math.sin(a) * 0.55;
          g.add(leafBlade);
        }

        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * Math.PI * 2 + 0.2;
          const dist = i === 0 ? 0 : i < 5 ? 0.075 : 0.13;
          const sx = Math.cos(a) * dist;
          const sz = Math.sin(a) * dist;
          const h = i === 0 ? 0.48 : 0.36 + (i % 3) * 0.05;
          const tiltX = Math.sin(a) * (dist * 1.6);
          const tiltZ = -Math.cos(a) * (dist * 1.6);

          const stalkGroup = new THREE.Group();
          stalkGroup.position.set(sx, 0.33, sz);
          stalkGroup.rotation.set(tiltX, 0, tiltZ);

          const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.013, h, 5), grassMat);
          stem.position.y = h * 0.5;
          stalkGroup.add(stem);

          for (let f = 0; f < 3; f++) {
            const bud = new THREE.Mesh(
              new THREE.SphereGeometry(0.036 - f * 0.005, 6, 5),
              f === 2 ? lavMat2 : lavMat1,
            );
            bud.scale.set(0.85, 1.45, 0.85);
            bud.position.y = h - 0.08 + f * 0.048;
            stalkGroup.add(bud);
          }
          g.add(stalkGroup);
        }
        g.add(pot, rim, soil);
      } else {
        // Sculpted polymer-clay Monstera Plant seated cleanly ON TOP of wooden stand (zero leg pierce!)
        const standWood = clayMat('#9E6A3E', 0.72);
        const stand = buildUnderPotWoodStand(standWood, 0.175, 0.19);
        g.add(stand);

        const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.17, 0.3, 16), accentMat);
        pot.position.y = 0.325;
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.215, 0.026, 8, 18), accentMat);
        rim.rotation.x = Math.PI / 2;
        rim.position.y = 0.47;
        const soil = new THREE.Mesh(
          new THREE.CylinderGeometry(0.195, 0.195, 0.036, 14),
          clayMat('#684227', 0.9),
        );
        soil.position.y = 0.468;

        const stemMat = clayMat('#4C8D52', 0.72);
        const leafMat = clayMat(item.color || '#4F9E5A', 0.58);
        const leafDark = clayMat('#3B8246', 0.62);
        const veinMat = clayMat('#76C47B', 0.56);
        const monsteraGeo = getClayMonsteraLeafGeometry();

        const frondSpecs: [number, number, number, number, number][] = [
          [0.05, 0.52, 0.26, 0.98, 0.14],
          [0.98, 0.44, 0.32, 0.92, 0.22],
          [1.92, 0.4, 0.29, 0.86, 0.18],
          [2.88, 0.48, 0.3, 0.95, 0.16],
          [3.82, 0.38, 0.33, 0.84, 0.24],
          [4.75, 0.45, 0.28, 0.9, 0.18],
          [5.55, 0.56, 0.18, 0.88, 0.08],
        ];
        frondSpecs.forEach(([ang, height, reach, sc, droop], idx) => {
          const frond = new THREE.Group();
          frond.rotation.y = ang;

          const startPt = new THREE.Vector3(0.03, 0.465, 0);
          const midPt = new THREE.Vector3(reach * 0.55, 0.465 + height * 0.68, 0);
          const tipPt = new THREE.Vector3(reach, 0.465 + height, 0);
          const curve = new THREE.CatmullRomCurve3([startPt, midPt, tipPt]);
          const petiole = new THREE.Mesh(
            new THREE.TubeGeometry(curve, 8, 0.013, 7, false),
            stemMat,
          );
          frond.add(petiole);

          const bladeGroup = new THREE.Group();
          bladeGroup.position.copy(tipPt);
          bladeGroup.rotation.z = -droop - 0.18;
          bladeGroup.scale.setScalar(sc);

          const blade = new THREE.Mesh(
            monsteraGeo,
            idx % 2 === 0 ? leafMat : leafDark,
          );
          const midrib = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.008, 0.22, 4, 6),
            veinMat,
          );
          midrib.rotation.z = Math.PI / 2;
          midrib.position.set(0.14, 0.017, 0);
          bladeGroup.add(blade, midrib);

          frond.add(bladeGroup);
          g.add(frond);
        });
        g.add(pot, rim, soil);
      }
      break;
    }

    case 'plant_fiddle': {
      // Sculpted Fiddle-Leaf Fig seated cleanly ON TOP of wooden stand + curved organic branches + plump clay leaves
      const standMat = clayMat('#8F5F39', 0.72);
      const stand = buildUnderPotWoodStand(standMat, 0.175, 0.195);
      g.add(stand);

      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.32, 16), accentMat);
      pot.position.y = 0.335;
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(0.218, 0.026, 8, 18),
        clayMat('#DFD2BE', 0.58),
      );
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 0.49;
      const soil = new THREE.Mesh(
        new THREE.CylinderGeometry(0.198, 0.198, 0.036, 14),
        clayMat('#6B4429', 0.9),
      );
      soil.position.y = 0.488;

      const trunkMat = clayMat('#7D5737', 0.78);
      const leafDark = clayMat('#3F874B', 0.58);
      const veinMat = clayMat('#7BC480', 0.54);
      const fiddleGeo = getClayFiddleLeafGeometry();

      // Curved sculpted main trunk rising smoothly from soil
      const mainTrunkCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.47, 0),
        new THREE.Vector3(-0.018, 0.68, 0.012),
        new THREE.Vector3(0.014, 0.9, -0.01),
        new THREE.Vector3(0.02, 1.18, 0.04),
      ]);
      const mainTrunk = new THREE.Mesh(
        new THREE.TubeGeometry(mainTrunkCurve, 12, 0.03, 8, false),
        trunkMat,
      );

      const branchLeftCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.01, 0.79, 0.005),
        new THREE.Vector3(-0.08, 0.94, 0.045),
        new THREE.Vector3(-0.14, 1.12, 0.075),
      ]);
      const branchLeft = new THREE.Mesh(
        new THREE.TubeGeometry(branchLeftCurve, 8, 0.021, 7, false),
        trunkMat,
      );

      const branchRightCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.008, 0.84, -0.005),
        new THREE.Vector3(0.09, 0.98, -0.05),
        new THREE.Vector3(0.15, 1.16, -0.06),
      ]);
      const branchRight = new THREE.Mesh(
        new THREE.TubeGeometry(branchRightCurve, 8, 0.021, 7, false),
        trunkMat,
      );

      // Every leaf connects via a real curved clay petiole directly from trunk/branch to leaf base socket!
      const fiddleLeafSpecs: {
        anchor: [number, number, number];
        base: [number, number, number];
        yaw: number;
        pitch: number;
        roll: number;
        scale: number;
      }[] = [
        {anchor: [-0.005, 0.74, 0.01], base: [-0.08, 0.84, -0.09], yaw: 2.35, pitch: 0.34, roll: 0.14, scale: 0.92},
        {anchor: [0.008, 0.82, -0.005], base: [0.1, 0.9, 0.09], yaw: -0.72, pitch: 0.38, roll: -0.1, scale: 0.9},
        {anchor: [-0.09, 0.96, 0.05], base: [-0.18, 1.03, -0.02], yaw: 2.85, pitch: 0.32, roll: 0.16, scale: 0.96},
        {anchor: [0.1, 1.0, -0.05], base: [0.18, 1.08, 0.03], yaw: -0.18, pitch: 0.3, roll: -0.14, scale: 0.98},
        {anchor: [-0.14, 1.12, 0.075], base: [-0.17, 1.24, 0.12], yaw: 2.2, pitch: 0.24, roll: 0.08, scale: 0.94},
        {anchor: [0.15, 1.16, -0.06], base: [0.19, 1.28, -0.09], yaw: 0.45, pitch: 0.24, roll: -0.08, scale: 0.94},
        {anchor: [0.02, 1.18, 0.04], base: [0.02, 1.32, 0.06], yaw: -1.42, pitch: 0.18, roll: 0.05, scale: 0.9},
      ];

      fiddleLeafSpecs.forEach((spec, idx) => {
        const p0 = new THREE.Vector3(...spec.anchor);
        const p2 = new THREE.Vector3(...spec.base);
        const p1 = p0.clone().lerp(p2, 0.5);
        p1.y += 0.035;
        const petiole = new THREE.Mesh(
          new THREE.TubeGeometry(new THREE.CatmullRomCurve3([p0, p1, p2]), 6, 0.011, 6, false),
          trunkMat,
        );
        g.add(petiole);

        const lg = new THREE.Group();
        lg.position.copy(p2);
        lg.rotation.order = 'YXZ';
        lg.rotation.y = spec.yaw;
        lg.rotation.z = -spec.pitch;
        lg.rotation.x = spec.roll;
        lg.scale.setScalar(spec.scale);

        const blade = new THREE.Mesh(fiddleGeo, idx % 2 === 0 ? mainMat : leafDark);
        const midrib = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.007, 0.26, 4, 6),
          veinMat,
        );
        midrib.rotation.z = Math.PI / 2;
        midrib.position.set(0.16, 0.018, 0);
        lg.add(blade, midrib);
        g.add(lg);
      });

      g.add(pot, rim, soil, mainTrunk, branchLeft, branchRight);
      break;
    }

    case 'plant_snake': {
      // Glazed patterned pot + 9 tapered pointed variegated snake-plant blades
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.16, 0.34, 12), accentMat);
      pot.position.y = 0.17;
      const rim = new THREE.Mesh(
        new THREE.CylinderGeometry(0.225, 0.22, 0.06, 12),
        clayMat('#FAF5EC', 0.52),
      );
      rim.position.y = 0.33;
      const soil = new THREE.Mesh(
        new THREE.CylinderGeometry(0.19, 0.19, 0.04, 10),
        clayMat('#6E472B', 0.9),
      );
      soil.position.y = 0.345;

      const darkEdgeMat = clayMat(item.color || '#4F9655', 0.62);
      const brightBladeMat = clayMat('#9CD976', 0.58);
      for (let i = 0; i < 9; i++) {
        const ang = (i / 9) * Math.PI * 2;
        const dist = i < 3 ? 0.035 : 0.095;
        const h = i < 3 ? 0.64 : 0.44 + (i % 3) * 0.08;
        const blade = new THREE.Mesh(
          new THREE.ConeGeometry(0.052, h, 4),
          i % 2 === 0 ? darkEdgeMat : brightBladeMat,
        );
        blade.scale.set(1, 1, 0.22);
        blade.position.set(Math.cos(ang) * dist, 0.33 + h * 0.46, Math.sin(ang) * dist);
        blade.rotation.y = -ang + Math.PI / 2;
        blade.rotation.x = i < 3 ? 0.05 : 0.16;
        g.add(blade);
      }
      g.add(pot, rim, soil);
      break;
    }

    case 'flower_basket': {
      // Woven wicker basket + leafy greenery + 7 real 5-petal 3D daisies
      const basket = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.17, 0.23, 14),
        accentMat,
      );
      basket.position.y = 0.115;
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(0.24, 0.03, 7, 16),
        clayMat('#A57544', 0.72),
      );
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 0.23;
      const archHandle = new THREE.Mesh(
        new THREE.TorusGeometry(0.23, 0.022, 6, 16, Math.PI),
        clayMat('#A57544', 0.72),
      );
      archHandle.position.y = 0.23;

      const foliageMat = clayMat('#55A158', 0.74);
      for (let l = 0; l < 6; l++) {
        const la = (l / 6) * Math.PI * 2;
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.11, 7, 5), foliageMat);
        leaf.scale.set(1.25, 0.28, 0.85);
        leaf.position.set(Math.cos(la) * 0.13, 0.26, Math.sin(la) * 0.13);
        leaf.rotation.y = -la;
        leaf.rotation.z = -0.25;
        g.add(leaf);
      }

      const blossomSpecs: [number, number, number, number, number, string][] = [
        [0, 0.34, 0, 0, 0, item.color],
        [-0.12, 0.3, 0.09, 0.35, 0.35, '#FFF8EE'],
        [0.12, 0.3, 0.08, 0.35, -0.35, '#FFD6E2'],
        [-0.1, 0.29, -0.1, -0.35, 0.32, '#BCE6FA'],
        [0.11, 0.31, -0.09, -0.32, -0.35, '#FFE89E'],
        [0, 0.27, 0.15, 0.55, 0, item.color],
        [0, 0.28, -0.14, -0.5, 0, '#FFF8EE'],
      ];
      blossomSpecs.forEach(([fx, fy, fz, rx, rz, col]) => {
        const flower = build3DFlowerHead(col, '#FFD24C', 1.15);
        flower.position.set(fx, fy, fz);
        flower.rotation.set(rx, 0, rz);
        g.add(flower);
      });
      g.add(basket, rim, archHandle);
      break;
    }

    case 'window_single': {
      const cy = item.mountHeight ?? 1.78;
      const glassMat = new THREE.MeshStandardMaterial({
        color: item.accentColor || '#BFE9FA',
        emissive: '#FFE8A3',
        emissiveIntensity: 0.16,
        roughness: 0.16,
      });
      const frame = new THREE.Mesh(new RoundedBoxGeometry(1.18, 1.38, 0.08, 2, 0.03), mainMat);
      frame.position.set(0, cy, 0.02);
      const glass = new THREE.Mesh(new THREE.BoxGeometry(0.96, 1.16, 0.09), glassMat);
      glass.position.set(0, cy, 0.03);
      const barV = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.18, 0.11), mainMat);
      barV.position.set(0, cy, 0.04);
      const barH = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.06, 0.11), mainMat);
      barH.position.set(0, cy + 0.06, 0.04);
      const sill = new THREE.Mesh(
        new RoundedBoxGeometry(1.32, 0.09, 0.2, 2, 0.03),
        clayMat('#FFF6E8', 0.68),
      );
      sill.position.set(0, cy - 0.7, 0.07);
      g.add(frame, glass, barV, barH, sill);
      break;
    }

    case 'window_double': {
      const cy = item.mountHeight ?? 1.78;
      const glassMat = new THREE.MeshStandardMaterial({
        color: item.accentColor || '#BFE9FA',
        emissive: '#FFE8A3',
        emissiveIntensity: 0.16,
        roughness: 0.16,
      });
      const frame = new THREE.Mesh(new RoundedBoxGeometry(2.14, 1.42, 0.08, 2, 0.03), mainMat);
      frame.position.set(0, cy, 0.02);
      [-0.5, 0.5].forEach((sx) => {
        const pane = new THREE.Mesh(new THREE.BoxGeometry(0.86, 1.18, 0.09), glassMat);
        pane.position.set(sx, cy, 0.03);
        const sashH = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.05, 0.11), mainMat);
        sashH.position.set(sx, cy + 0.06, 0.04);
        const sashV = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.2, 0.11), mainMat);
        sashV.position.set(sx, cy, 0.04);
        g.add(pane, sashH, sashV);
      });
      const centerPost = new THREE.Mesh(new THREE.BoxGeometry(0.11, 1.32, 0.12), mainMat);
      centerPost.position.set(0, cy, 0.04);
      const sill = new THREE.Mesh(
        new RoundedBoxGeometry(2.3, 0.09, 0.22, 2, 0.03),
        clayMat('#FFF6E8', 0.68),
      );
      sill.position.set(0, cy - 0.72, 0.08);
      g.add(frame, centerPost, sill);
      break;
    }

    case 'window_curtain': {
      const cy = item.mountHeight ?? 1.78;
      const glassMat = new THREE.MeshStandardMaterial({
        color: '#BFE9FA',
        emissive: '#FFE8A3',
        emissiveIntensity: 0.16,
        roughness: 0.16,
      });
      const frame = new THREE.Mesh(new RoundedBoxGeometry(2.04, 1.4, 0.08, 2, 0.03), mainMat);
      frame.position.set(0, cy, 0.02);
      const glass = new THREE.Mesh(new THREE.BoxGeometry(1.82, 1.18, 0.09), glassMat);
      glass.position.set(0, cy, 0.03);
      const barV = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.2, 0.11), mainMat);
      barV.position.set(0, cy, 0.04);
      const barH = new THREE.Mesh(new THREE.BoxGeometry(1.84, 0.06, 0.11), mainMat);
      barH.position.set(0, cy + 0.06, 0.04);

      const rod = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.035, 2.52, 8),
        clayMat('#7E5333', 0.62),
      );
      rod.rotation.z = Math.PI / 2;
      rod.position.set(0, cy + 0.82, 0.12);
      [-1.27, 1.27].forEach((fx) => {
        const finial = new THREE.Mesh(
          new THREE.SphereGeometry(0.06, 8, 8),
          glossyClayMat('#F4C95D', 0.25),
        );
        finial.position.set(fx, cy + 0.82, 0.12);
        g.add(finial);
      });

      const curtainMat = clayMat(item.accentColor || '#8ABEA2', 0.85);
      [-0.98, 0.98].forEach((cx) => {
        const drape = new THREE.Mesh(
          new RoundedBoxGeometry(0.42, 1.62, 0.14, 2, 0.05),
          curtainMat,
        );
        drape.position.set(cx, cy, 0.12);
        const tie = new THREE.Mesh(
          new RoundedBoxGeometry(0.44, 0.08, 0.16, 2, 0.02),
          clayMat('#FFF6E8', 0.72),
        );
        tie.position.set(cx, cy - 0.18, 0.13);
        g.add(drape, tie);
      });

      const sill = new THREE.Mesh(
        new RoundedBoxGeometry(2.18, 0.09, 0.22, 2, 0.03),
        clayMat('#FFF6E8', 0.68),
      );
      sill.position.set(0, cy - 0.71, 0.08);
      g.add(frame, glass, barV, barH, rod, sill);
      break;
    }

    case 'wall_clock': {
      const cy = item.mountHeight ?? 2.15;
      const bezel = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.08, 22), mainMat);
      bezel.rotation.x = Math.PI / 2;
      bezel.position.set(0, cy, 0.03);

      const brassRim = new THREE.Mesh(
        new THREE.TorusGeometry(0.35, 0.018, 8, 24),
        glossyClayMat('#E8C366', 0.25),
      );
      brassRim.position.set(0, cy, 0.072);

      const dialTex = getClockDialTexture(item.accentColor || '#FFFDF6');
      const dialMat = new THREE.MeshStandardMaterial({map: dialTex, roughness: 0.42});
      const dialPlane = new THREE.Mesh(new THREE.CircleGeometry(0.335, 24), dialMat);
      dialPlane.position.set(0, cy, 0.074);

      const handMat = clayMat('#4A3525', 0.45);
      const hourPivot = new THREE.Group();
      hourPivot.position.set(0, cy, 0.084);
      const hourMesh = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.16, 0.016), handMat);
      hourMesh.position.y = 0.075;
      hourPivot.add(hourMesh);

      const minPivot = new THREE.Group();
      minPivot.position.set(0, cy, 0.092);
      const minMesh = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.23, 0.016), handMat);
      minMesh.position.y = 0.105;
      minPivot.add(minMesh);

      const secPivot = new THREE.Group();
      secPivot.position.set(0, cy, 0.1);
      const secMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.01, 0.24, 0.01),
        clayMat('#E25C4E', 0.45),
      );
      secMesh.position.y = 0.095;
      secPivot.add(secMesh);

      const pin = new THREE.Mesh(
        new THREE.SphereGeometry(0.032, 8, 8),
        glossyClayMat('#F4C95D', 0.22),
      );
      pin.position.set(0, cy, 0.108);

      g.userData.clockHourPivot = hourPivot;
      g.userData.clockMinPivot = minPivot;
      g.userData.clockSecPivot = secPivot;

      g.add(bezel, brassRim, dialPlane, hourPivot, minPivot, secPivot, pin);
      break;
    }

    case 'wall_calendar': {
      const cy = item.mountHeight ?? 2.05;
      const oakMat = clayMat('#9E6A3E', 0.68);
      const calTex = getCalendarPageTexture(item.color || '#FFF9EF', item.accentColor || '#E57A6B');

      const backPad = new THREE.Mesh(
        new RoundedBoxGeometry(0.58, 0.72, 0.038, 2, 0.015),
        clayMat('#EADCC7', 0.72),
      );
      backPad.position.set(0, cy, 0.015);

      const pagePlane = new THREE.Mesh(
        new THREE.PlaneGeometry(0.54, 0.68),
        new THREE.MeshStandardMaterial({map: calTex, roughness: 0.62}),
      );
      pagePlane.position.set(0, cy, 0.038);

      const topBar = new THREE.Mesh(
        new RoundedBoxGeometry(0.64, 0.055, 0.05, 2, 0.015),
        oakMat,
      );
      topBar.position.set(0, cy + 0.36, 0.03);

      const nailPin = new THREE.Mesh(
        new THREE.SphereGeometry(0.025, 7, 7),
        glossyClayMat('#E8C366', 0.25),
      );
      nailPin.position.set(0, cy + 0.48, 0.025);

      [-1, 1].forEach((s) => {
        const cord = new THREE.Mesh(
          new THREE.CylinderGeometry(0.008, 0.008, 0.24, 5),
          clayMat('#B79573', 0.78),
        );
        cord.position.set(s * 0.08, cy + 0.42, 0.026);
        cord.rotation.z = s * 0.56;
        g.add(cord);
      });

      const brassRingMat = glossyClayMat('#D6B156', 0.28);
      for (let r = -2; r <= 2; r++) {
        const coil = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.007, 5, 10), brassRingMat);
        coil.rotation.y = Math.PI / 2;
        coil.position.set(r * 0.1, cy + 0.36, 0.048);
        g.add(coil);
      }

      g.add(backPad, pagePlane, topBar, nailPin);
      break;
    }

    case 'succulent_shelf': {
      // Sculpted floating wall shelf with 3 real rosette succulents + trailing string-of-pearls vine!
      const cy = item.mountHeight ?? 1.98;
      const plank = new THREE.Mesh(
        new RoundedBoxGeometry(1.22, 0.07, 0.34, 2, 0.022),
        mainMat,
      );
      plank.position.set(0, cy, 0.17);
      [-0.44, 0.44].forEach((bx) => {
        const bracket = new THREE.Mesh(
          new RoundedBoxGeometry(0.06, 0.19, 0.25, 2, 0.015),
          clayMat('#7D5333', 0.65),
        );
        bracket.position.set(bx, cy - 0.11, 0.12);
        g.add(bracket);
      });

      const rosetteSpecs: [number, string, string, number][] = [
        [-0.36, '#D98C5F', item.accentColor || '#68B47E', 1.15],
        [0, '#FFF4E2', '#82C79A', 1.25],
        [0.36, '#C47E58', '#569D72', 1.1],
      ];
      rosetteSpecs.forEach(([px, potHex, succHex, sc]) => {
        const pot = new THREE.Mesh(
          new THREE.CylinderGeometry(0.095, 0.072, 0.13, 10),
          clayMat(potHex, 0.68),
        );
        pot.position.set(px, cy + 0.1, 0.18);
        const potRim = new THREE.Mesh(
          new THREE.CylinderGeometry(0.104, 0.1, 0.028, 10),
          clayMat(potHex, 0.64),
        );
        potRim.position.set(px, cy + 0.16, 0.18);

        const rosette = buildRosetteSucculent(succHex, sc);
        rosette.position.set(px, cy + 0.165, 0.18);
        g.add(pot, potRim, rosette);
      });

      // Trailing string-of-pearls beads hanging off the right pot
      const pearlMat = clayMat('#76C285', 0.56);
      for (let s = 0; s < 5; s++) {
        const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.022 - s * 0.002, 6, 6), pearlMat);
        pearl.position.set(0.46 + s * 0.02, cy + 0.12 - s * 0.06, 0.27);
        g.add(pearl);
      }

      g.add(plank);
      break;
    }

    case 'wall_tv': {
      const cy = item.mountHeight ?? 1.85;
      const mount = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.28, 0.04),
        clayMat('#4A5568', 0.5),
      );
      mount.position.set(0, cy, 0.02);
      const bezel = new THREE.Mesh(
        new RoundedBoxGeometry(1.76, 0.98, 0.06, 2, 0.03),
        mainMat,
      );
      bezel.position.set(0, cy, 0.065);
      const screen = new THREE.Mesh(
        new THREE.BoxGeometry(1.62, 0.86, 0.07),
        glossyClayMat(item.accentColor || '#91D7F7', 0.12),
      );
      screen.position.set(0, cy, 0.07);
      const soundbar = new THREE.Mesh(
        new RoundedBoxGeometry(1.16, 0.09, 0.09, 2, 0.02),
        clayMat('#3B4252', 0.45),
      );
      soundbar.position.set(0, cy - 0.58, 0.07);
      g.add(mount, bezel, screen, soundbar);
      break;
    }

    case 'kitchen_l_counter': {
      const cabBodyMat = clayMat(item.color || '#F4EBDC', 0.72);
      const cabDoorMat = clayMat(item.accentColor || '#DFCEB4', 0.68);
      const marbleTopMat = glossyClayMat('#FAF8F5', 0.28);
      const metalMat = clayMat('#CFD8E0', 0.25, 0.72);
      const stoveGlassMat = glossyClayMat('#1E2532', 0.14);
      const handleGoldMat = glossyClayMat('#F4C95D', 0.25);

      const backBase = new THREE.Mesh(
        new RoundedBoxGeometry(3.55, 0.84, 1.0, 2, 0.04),
        cabBodyMat,
      );
      backBase.position.set(-0.03, 0.42, -1.69);
      const backTop = new THREE.Mesh(
        new RoundedBoxGeometry(3.62, 0.08, 1.08, 2, 0.03),
        marbleTopMat,
      );
      backTop.position.set(-0.03, 0.88, -1.69);

      const rightBase = new THREE.Mesh(
        new RoundedBoxGeometry(1.0, 0.84, 4.28, 2, 0.04),
        cabBodyMat,
      );
      rightBase.position.set(1.27, 0.42, 0.95);
      const rightTop = new THREE.Mesh(
        new RoundedBoxGeometry(1.08, 0.08, 4.36, 2, 0.03),
        marbleTopMat,
      );
      rightTop.position.set(1.27, 0.88, 0.95);

      [-1.35, -0.5, 0.35].forEach((cx) => {
        const dPanel = new THREE.Mesh(
          new RoundedBoxGeometry(0.68, 0.66, 0.05, 2, 0.02),
          cabDoorMat,
        );
        dPanel.position.set(cx, 0.42, -1.17);
        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), handleGoldMat);
        knob.position.set(cx + 0.22, 0.52, -1.13);
        g.add(dPanel, knob);
      });
      [-0.5, 0.4, 1.3, 2.2].forEach((cz) => {
        const dPanel = new THREE.Mesh(
          new RoundedBoxGeometry(0.05, 0.66, 0.72, 2, 0.02),
          cabDoorMat,
        );
        dPanel.position.set(0.75, 0.42, cz);
        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), handleGoldMat);
        knob.position.set(0.71, 0.52, cz + 0.24);
        g.add(dPanel, knob);
      });

      const sinkRim = new THREE.Mesh(
        new RoundedBoxGeometry(1.02, 0.04, 0.68, 2, 0.02),
        metalMat,
      );
      sinkRim.position.set(-0.9, 0.92, -1.69);
      const sinkBasin = new THREE.Mesh(
        new THREE.BoxGeometry(0.84, 0.05, 0.52),
        clayMat('#8D9AA6', 0.35, 0.5),
      );
      sinkBasin.position.set(-0.9, 0.925, -1.69);
      const faucetBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.05, 0.28, 8),
        metalMat,
      );
      faucetBase.position.set(-0.9, 1.06, -2.01);
      const faucetNeck = new THREE.Mesh(
        new THREE.TorusGeometry(0.11, 0.025, 6, 10, Math.PI),
        metalMat,
      );
      faucetNeck.rotation.y = Math.PI / 2;
      faucetNeck.position.set(-0.9, 1.2, -1.9);

      const stoveBase = new THREE.Mesh(
        new RoundedBoxGeometry(0.76, 0.03, 1.25, 2, 0.02),
        stoveGlassMat,
      );
      stoveBase.position.set(1.27, 0.93, 0.4);
      [0.07, 0.73].forEach((bz) => {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(0.15, 0.19, 16),
          new THREE.MeshBasicMaterial({color: '#6BC5F2'}),
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(1.27, 0.95, bz);
        g.add(ring);
      });

      g.add(
        backBase,
        backTop,
        rightBase,
        rightTop,
        sinkRim,
        sinkBasin,
        faucetBase,
        faucetNeck,
        stoveBase,
      );
      break;
    }

    case 'microwave': {
      // Compact pastel countertop microwave sized cleanly to avatar kitchen counter scale (~0.72m W x 0.39m H x 0.44m D)
      const shellMat = clayMat(item.color || '#FFF6EA', 0.42);
      const trimMat = clayMat(item.accentColor || '#75C3B6', 0.48);
      const chromeMat = glossyClayMat('#D8E0E8', 0.16);
      const glassFrameMat = glossyClayMat('#27313D', 0.22);
      const glassPaneMat = new THREE.MeshStandardMaterial({
        color: '#19222C',
        roughness: 0.12,
        metalness: 0.25,
        transparent: true,
        opacity: 0.62,
      });
      const cavityMat = clayMat('#EFE8DC', 0.56);
      const glowWarmMat = new THREE.MeshStandardMaterial({
        color: '#FFE5B4',
        emissive: '#FFB95C',
        emissiveIntensity: 0.28,
        roughness: 0.4,
      });
      const plateMat = glossyClayMat('#FFFFFF', 0.2);

      // 4 rubber feet resting flush on counter/table/floor at y = 0
      [-0.29, 0.29].forEach((fx) => {
        [-0.16, 0.16].forEach((fz) => {
          const foot = new THREE.Mesh(
            new THREE.CylinderGeometry(0.028, 0.032, 0.026, 10),
            glassFrameMat,
          );
          foot.position.set(fx, 0.013, fz);
          g.add(foot);
        });
      });

      // Main rounded body shell
      const body = new THREE.Mesh(
        new RoundedBoxGeometry(0.72, 0.37, 0.44, 4, 0.045),
        shellMat,
      );
      body.position.set(0, 0.205, 0);

      // Soft pastel top accent trim band
      const topTrim = new THREE.Mesh(
        new RoundedBoxGeometry(0.68, 0.022, 0.4, 2, 0.01),
        trimMat,
      );
      topTrim.position.set(0, 0.388, 0);

      // Door bezel on left + interior warm cavity & ceramic plate visible through glass
      const doorBezel = new THREE.Mesh(
        new RoundedBoxGeometry(0.47, 0.29, 0.036, 3, 0.018),
        trimMat,
      );
      doorBezel.position.set(-0.095, 0.205, 0.212);

      const cavityBack = new THREE.Mesh(
        new RoundedBoxGeometry(0.39, 0.22, 0.03, 2, 0.01),
        cavityMat,
      );
      cavityBack.position.set(-0.105, 0.205, 0.198);

      const cavityLight = new THREE.Mesh(
        new RoundedBoxGeometry(0.14, 0.025, 0.02, 1, 0.008),
        glowWarmMat,
      );
      cavityLight.position.set(-0.105, 0.292, 0.21);

      const turntablePlate = new THREE.Mesh(
        new THREE.CylinderGeometry(0.115, 0.095, 0.018, 16),
        plateMat,
      );
      turntablePlate.position.set(-0.105, 0.12, 0.205);

      const doorWindow = new THREE.Mesh(
        new RoundedBoxGeometry(0.38, 0.21, 0.014, 2, 0.008),
        glassPaneMat,
      );
      doorWindow.position.set(-0.105, 0.205, 0.232);

      // Chrome vertical door handle
      const handleBar = new THREE.Mesh(
        new RoundedBoxGeometry(0.024, 0.2, 0.026, 2, 0.01),
        chromeMat,
      );
      handleBar.position.set(0.105, 0.205, 0.246);
      [-0.075, 0.075].forEach((hy) => {
        const post = new THREE.Mesh(
          new RoundedBoxGeometry(0.02, 0.022, 0.024, 1, 0.006),
          chromeMat,
        );
        post.position.set(0.105, 0.205 + hy, 0.232);
        g.add(post);
      });

      // Right-hand digital control strip, timer screen & rotary dial
      const ctrlPanel = new THREE.Mesh(
        new RoundedBoxGeometry(0.155, 0.29, 0.026, 2, 0.012),
        glassFrameMat,
      );
      ctrlPanel.position.set(0.245, 0.205, 0.214);

      const ledScreen = new THREE.Mesh(
        new RoundedBoxGeometry(0.11, 0.052, 0.014, 1, 0.004),
        new THREE.MeshBasicMaterial({color: '#88F2D6'}),
      );
      ledScreen.position.set(0.245, 0.295, 0.226);

      const dial = new THREE.Mesh(
        new THREE.CylinderGeometry(0.036, 0.04, 0.026, 16),
        chromeMat,
      );
      dial.rotation.x = Math.PI / 2;
      dial.position.set(0.245, 0.2, 0.232);

      const startBtn = new THREE.Mesh(
        new RoundedBoxGeometry(0.088, 0.032, 0.016, 2, 0.006),
        trimMat,
      );
      startBtn.position.set(0.245, 0.115, 0.226);

      g.add(
        body,
        topTrim,
        doorBezel,
        cavityBack,
        cavityLight,
        turntablePlate,
        doorWindow,
        handleBar,
        ctrlPanel,
        ledScreen,
        dial,
        startBtn,
      );
      break;
    }

    case 'mini_oven': {
      // Retro Pastel Countertop Mini Convection Oven (~0.76m W x 0.43m H x 0.48m D)
      const bodyMat = clayMat(item.color || '#A9D6C3', 0.44);
      const brassMat = glossyClayMat(item.accentColor || '#F2C063', 0.22);
      const creamTrimMat = clayMat('#FFF8EE', 0.52);
      const darkSteelMat = glossyClayMat('#2D3642', 0.28);
      const bakeGlassMat = new THREE.MeshStandardMaterial({
        color: '#222830',
        roughness: 0.1,
        metalness: 0.2,
        transparent: true,
        opacity: 0.56,
      });
      const emberGlowMat = new THREE.MeshStandardMaterial({
        color: '#FF9E44',
        emissive: '#FF7B1C',
        emissiveIntensity: 0.45,
        roughness: 0.35,
      });

      // 4 retro tapered feet
      [-0.3, 0.3].forEach((fx) => {
        [-0.17, 0.17].forEach((fz) => {
          const leg = new THREE.Mesh(
            new THREE.CylinderGeometry(0.028, 0.022, 0.04, 12),
            brassMat,
          );
          leg.position.set(fx, 0.02, fz);
          g.add(leg);
        });
      });

      const body = new THREE.Mesh(
        new RoundedBoxGeometry(0.76, 0.4, 0.48, 4, 0.048),
        bodyMat,
      );
      body.position.set(0, 0.235, 0);

      // Cream retro front faceplate
      const frontPlate = new THREE.Mesh(
        new RoundedBoxGeometry(0.71, 0.35, 0.032, 3, 0.025),
        creamTrimMat,
      );
      frontPlate.position.set(0, 0.235, 0.23);

      // Drop-down oven door with interior rack & warm baking glow
      const doorFrame = new THREE.Mesh(
        new RoundedBoxGeometry(0.49, 0.275, 0.03, 3, 0.02),
        darkSteelMat,
      );
      doorFrame.position.set(-0.08, 0.22, 0.244);

      const bakeChamber = new THREE.Mesh(
        new RoundedBoxGeometry(0.42, 0.2, 0.02, 2, 0.008),
        clayMat('#3C322C', 0.72),
      );
      bakeChamber.position.set(-0.08, 0.22, 0.238);

      const heatTube = new THREE.Mesh(
        new RoundedBoxGeometry(0.32, 0.016, 0.014, 1, 0.006),
        emberGlowMat,
      );
      heatTube.position.set(-0.08, 0.295, 0.248);

      const wireRack = new THREE.Mesh(
        new RoundedBoxGeometry(0.38, 0.012, 0.022, 1, 0.004),
        clayMat('#D8DFE6', 0.25, 0.65),
      );
      wireRack.position.set(-0.08, 0.195, 0.248);

      const ovenGlass = new THREE.Mesh(
        new RoundedBoxGeometry(0.41, 0.19, 0.012, 2, 0.008),
        bakeGlassMat,
      );
      ovenGlass.position.set(-0.08, 0.22, 0.26);

      // Horizontal brushed brass oven handle across top of door
      const doorHandle = new THREE.Mesh(
        new RoundedBoxGeometry(0.42, 0.022, 0.026, 2, 0.01),
        brassMat,
      );
      doorHandle.position.set(-0.08, 0.335, 0.276);
      [-0.17, 0.01].forEach((hx) => {
        const bracket = new THREE.Mesh(
          new RoundedBoxGeometry(0.024, 0.022, 0.028, 1, 0.006),
          brassMat,
        );
        bracket.position.set(hx, 0.335, 0.262);
        g.add(bracket);
      });

      // Right side control dials (Temperature + Timer) + indicator gem
      [0.3, 0.2, 0.11].forEach((dy, di) => {
        const bezel = new THREE.Mesh(
          new THREE.CylinderGeometry(0.036, 0.038, 0.014, 16),
          darkSteelMat,
        );
        bezel.rotation.x = Math.PI / 2;
        bezel.position.set(0.255, dy, 0.248);
        const knob = new THREE.Mesh(
          new THREE.CylinderGeometry(0.026, 0.028, 0.026, 16),
          di === 2 ? emberGlowMat : brassMat,
        );
        knob.rotation.x = Math.PI / 2;
        knob.position.set(0.255, dy, 0.258);
        g.add(bezel, knob);
      });

      // Subtle top heat vents
      for (let v = -2; v <= 2; v++) {
        const vent = new THREE.Mesh(
          new RoundedBoxGeometry(0.06, 0.01, 0.16, 1, 0.004),
          darkSteelMat,
        );
        vent.position.set(v * 0.095, 0.436, -0.08);
        g.add(vent);
      }

      g.add(
        body,
        frontPlate,
        doorFrame,
        bakeChamber,
        heatTube,
        wireRack,
        ovenGlass,
        doorHandle,
      );
      break;
    }

    case 'wooden_table': {
      const top = new THREE.Mesh(
        new RoundedBoxGeometry(1.52, 0.1, 0.94, 3, 0.04),
        mainMat,
      );
      top.position.y = 0.73;
      const apron = new THREE.Mesh(
        new RoundedBoxGeometry(1.36, 0.09, 0.78, 2, 0.02),
        accentMat,
      );
      apron.position.y = 0.65;
      [
        [-0.64, -0.35],
        [0.64, -0.35],
        [-0.64, 0.35],
        [0.64, 0.35],
      ].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(
          new RoundedBoxGeometry(0.09, 0.72, 0.09, 2, 0.02),
          accentMat,
        );
        leg.position.set(lx, 0.36, lz);
        g.add(leg);
      });
      g.add(top, apron);
      break;
    }

    case 'wooden_chair': {
      // Raised cleanly so cushion top is y=0.50 (matches outdoor bench & indoor chairs)
      const seat = new THREE.Mesh(
        new RoundedBoxGeometry(0.56, 0.08, 0.54, 2, 0.03),
        mainMat,
      );
      seat.position.y = 0.44;
      const cushion = new THREE.Mesh(
        new RoundedBoxGeometry(0.46, 0.05, 0.44, 2, 0.02),
        accentMat,
      );
      cushion.position.y = 0.48;
      [-0.22, 0.22].forEach((bx) => {
        const post = new THREE.Mesh(
          new RoundedBoxGeometry(0.06, 0.58, 0.06, 2, 0.02),
          mainMat,
        );
        post.position.set(bx, 0.73, -0.22);
        g.add(post);
      });
      const rail = new THREE.Mesh(
        new RoundedBoxGeometry(0.54, 0.14, 0.06, 2, 0.02),
        mainMat,
      );
      rail.position.set(0, 0.94, -0.22);
      const midRail = new THREE.Mesh(
        new RoundedBoxGeometry(0.48, 0.07, 0.04, 2, 0.01),
        mainMat,
      );
      midRail.position.set(0, 0.7, -0.22);
      [
        [-0.21, -0.2],
        [0.21, -0.2],
        [-0.21, 0.2],
        [0.21, 0.2],
      ].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(
          new THREE.CylinderGeometry(0.034, 0.026, 0.44, 7),
          mainMat,
        );
        leg.position.set(lx, 0.22, lz);
        g.add(leg);
      });
      g.add(seat, cushion, rail, midRail);
      break;
    }

    case 'table_tv': {
      const baseFoot = new THREE.Mesh(
        new RoundedBoxGeometry(0.56, 0.04, 0.24, 2, 0.02),
        clayMat('#4B5563', 0.45),
      );
      baseFoot.position.y = 0.02;
      const neck = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.14, 0.06),
        clayMat('#4B5563', 0.45),
      );
      neck.position.set(0, 0.1, -0.02);
      const bezel = new THREE.Mesh(
        new RoundedBoxGeometry(1.24, 0.72, 0.07, 2, 0.03),
        mainMat,
      );
      bezel.position.set(0, 0.48, -0.02);
      const screen = new THREE.Mesh(
        new THREE.BoxGeometry(1.12, 0.62, 0.08),
        glossyClayMat(item.accentColor || '#8ED8F8', 0.14),
      );
      screen.position.set(0, 0.48, -0.015);
      g.add(baseFoot, neck, bezel, screen);
      break;
    }

    case 'wall_calendar_tet': {
      const cy = item.mountHeight ?? 2.04;
      const lacquerRedMat = glossyClayMat('#B81D24', 0.34);
      const goldMat = glossyClayMat('#F5C443', 0.28);
      const tetCalTex = getTetCalendarTexture();

      const backPad = new THREE.Mesh(
        new RoundedBoxGeometry(0.6, 0.76, 0.036, 2, 0.014),
        lacquerRedMat,
      );
      backPad.position.set(0, cy, 0.018);

      // Offset plane strictly +0.009m in front of backPad front face (0.036 -> 0.045) to prevent z-fighting
      const sheetPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(0.54, 0.7),
        new THREE.MeshStandardMaterial({map: tetCalTex, roughness: 0.56}),
      );
      sheetPlane.position.set(0, cy, 0.045);

      const topBar = new THREE.Mesh(
        new RoundedBoxGeometry(0.68, 0.058, 0.054, 2, 0.016),
        clayMat('#5E2814', 0.58),
      );
      topBar.position.set(0, cy + 0.39, 0.032);
      for (const sx of [-0.35, 0.35]) {
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), goldMat);
        cap.position.set(sx, cy + 0.39, 0.032);
        g.add(cap);
      }

      const nailPin = new THREE.Mesh(new THREE.SphereGeometry(0.024, 7, 7), goldMat);
      nailPin.position.set(0, cy + 0.51, 0.025);
      [-1, 1].forEach((s) => {
        const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.24, 5), goldMat);
        cord.position.set(s * 0.08, cy + 0.45, 0.026);
        cord.rotation.z = s * 0.56;
        g.add(cord);
      });

      // Lucky gold rings binding the calendar pad
      for (let r = -2; r <= 2; r++) {
        const coil = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.0065, 5, 10), goldMat);
        coil.rotation.y = Math.PI / 2;
        coil.position.set(r * 0.1, cy + 0.39, 0.052);
        g.add(coil);
      }

      // Hanging red silk tassel below calendar
      const tasselKnot = new THREE.Mesh(new THREE.SphereGeometry(0.024, 7, 7), goldMat);
      tasselKnot.position.set(0, cy - 0.41, 0.032);
      const tasselFringe = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.14, 10), lacquerRedMat);
      tasselFringe.position.set(0, cy - 0.49, 0.032);

      g.add(backPad, sheetPlane, topBar, nailPin, tasselKnot, tasselFringe);
      break;
    }

    case 'tet_couplets': {
      const cy = item.mountHeight ?? 1.98;
      const woodMat = clayMat('#5E2814', 0.62);
      const goldMat = glossyClayMat('#F5C443', 0.26);
      const crimsonSilkMat = clayMat('#B91C1C', 0.66);

      const leftTex = getTetCoupletTexture(['CHÚC', 'MỪNG', 'NĂM', 'MỚI'], 'Xuân');
      const rightTex = getTetCoupletTexture(['VẠN', 'SỰ', 'NHƯ', 'Ý'], 'Phúc');

      const specs: [number, THREE.CanvasTexture][] = [
        [-0.48, leftTex],
        [0.48, rightTex],
      ];

      for (const [sx, tex] of specs) {
        const backing = new THREE.Mesh(
          new THREE.BoxGeometry(0.36, 1.04, 0.014),
          crimsonSilkMat,
        );
        backing.position.set(sx, cy, 0.022);

        // Front calligraphic surface cleanly +0.010m proud of backing (+0.029 -> 0.036)
        const scrollFace = new THREE.Mesh(
          new THREE.PlaneGeometry(0.35, 1.02),
          new THREE.MeshStandardMaterial({map: tex, roughness: 0.58}),
        );
        scrollFace.position.set(sx, cy, 0.036);

        // Top & bottom wooden scroll dowels with golden end caps
        for (const ry of [cy + 0.54, cy - 0.54]) {
          const dowel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.44, 10), woodMat);
          dowel.rotation.z = Math.PI / 2;
          dowel.position.set(sx, ry, 0.028);
          g.add(dowel);
          for (const ex of [-0.22, 0.22]) {
            const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.035, 8), goldMat);
            cap.rotation.z = Math.PI / 2;
            cap.position.set(sx + ex, ry, 0.028);
            g.add(cap);
          }
        }

        // Hanging cord & pin + bottom crimson tassel
        const pin = new THREE.Mesh(new THREE.SphereGeometry(0.018, 7, 7), goldMat);
        pin.position.set(sx, cy + 0.68, 0.024);
        [-1, 1].forEach((side) => {
          const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.18, 5), goldMat);
          cord.position.set(sx + side * 0.06, cy + 0.61, 0.025);
          cord.rotation.z = side * 0.54;
          g.add(cord);
        });
        const bead = new THREE.Mesh(new THREE.SphereGeometry(0.02, 7, 7), goldMat);
        bead.position.set(sx, cy - 0.59, 0.028);
        const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.15, 10), crimsonSilkMat);
        tassel.position.set(sx, cy - 0.67, 0.028);

        g.add(backing, scrollFace, pin, bead, tassel);
      }
      break;
    }

    case 'tet_mai_pot':
    case 'tet_peach_pot': {
      const isMai = item.kind === 'tet_mai_pot';
      const potMat = glossyClayMat(isMai ? '#B82525' : '#2F5D8C', 0.34);
      const rimMat = glossyClayMat(isMai ? '#F5C443' : '#F4ECE1', 0.32);
      const soilMat = clayMat('#4C3422', 0.92);
      const barkMat = clayMat(isMai ? '#6A4125' : '#533526', 0.84);
      const leafMat = clayMat('#66B856', 0.58);
      const budMat = clayMat(isMai ? '#88C959' : '#E84A7F', 0.52);
      const blossomCol = isMai ? '#FFD43B' : '#FF9EB5';
      const centerCol = isMai ? '#E87A14' : '#F6C945';

      // Ornate Lathe porcelain pot
      const potPts = [
        new THREE.Vector2(0.01, 0.0),
        new THREE.Vector2(0.22, 0.0),
        new THREE.Vector2(0.24, 0.06),
        new THREE.Vector2(0.32, 0.24),
        new THREE.Vector2(0.3, 0.4),
        new THREE.Vector2(0.35, 0.45),
        new THREE.Vector2(0.35, 0.5),
        new THREE.Vector2(0.27, 0.5),
        new THREE.Vector2(0.25, 0.42),
      ];
      const potBody = new THREE.Mesh(new THREE.LatheGeometry(potPts, 18), potMat);
      const potRing = new THREE.Mesh(new THREE.TorusGeometry(0.345, 0.024, 8, 22), rimMat);
      potRing.rotation.x = Math.PI / 2;
      potRing.position.y = 0.475;
      const baseFoot = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.24, 0.045, 16), rimMat);
      baseFoot.position.y = 0.022;
      const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.25, 0.05, 14), soilMat);
      soil.position.y = 0.44;
      g.add(potBody, potRing, baseFoot, soil);

      // Sculpted gnarled multi-branch trunk & arching boughs
      const upVec = new THREE.Vector3(0, 1, 0);
      const addTaperBranch = (
        p0: THREE.Vector3,
        p1: THREE.Vector3,
        rBot: number,
        rTop: number,
      ) => {
        const dir = new THREE.Vector3().subVectors(p1, p0);
        const len = dir.length();
        const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, len, 8), barkMat);
        mesh.position.addVectors(p0, p1).multiplyScalar(0.5);
        mesh.quaternion.setFromUnitVectors(upVec, dir.normalize());
        const joint = new THREE.Mesh(new THREE.SphereGeometry(rTop * 1.04, 7, 6), barkMat);
        joint.position.copy(p1);
        g.add(mesh, joint);
      };

      const rootPt = new THREE.Vector3(0, 0.44, 0);
      const midPt = new THREE.Vector3(isMai ? -0.04 : 0.04, 0.78, 0.02);
      const forkPt = new THREE.Vector3(isMai ? 0.05 : -0.05, 1.06, -0.02);
      addTaperBranch(rootPt, midPt, 0.068, 0.052);
      addTaperBranch(midPt, forkPt, 0.052, 0.038);

      const twigs: {
        start: THREE.Vector3;
        end: THREE.Vector3;
        r0: number;
        r1: number;
        blooms: number;
        lixi?: boolean;
      }[] = [
        {start: midPt, end: new THREE.Vector3(-0.34, 0.98, 0.2), r0: 0.03, r1: 0.015, blooms: 4, lixi: true},
        {start: midPt, end: new THREE.Vector3(0.32, 0.94, -0.18), r0: 0.03, r1: 0.014, blooms: 4},
        {start: forkPt, end: new THREE.Vector3(-0.38, 1.28, -0.14), r0: 0.028, r1: 0.012, blooms: 5, lixi: true},
        {start: forkPt, end: new THREE.Vector3(0.38, 1.26, 0.22), r0: 0.028, r1: 0.012, blooms: 5, lixi: true},
        {start: forkPt, end: new THREE.Vector3(0.02, 1.48, 0.06), r0: 0.032, r1: 0.014, blooms: 5},
        {start: new THREE.Vector3(0.02, 1.32, 0.04), end: new THREE.Vector3(-0.22, 1.54, 0.18), r0: 0.018, r1: 0.009, blooms: 4},
        {start: new THREE.Vector3(0.02, 1.36, 0.04), end: new THREE.Vector3(0.24, 1.56, -0.16), r0: 0.018, r1: 0.009, blooms: 4},
        {start: new THREE.Vector3(-0.18, 1.16, -0.08), end: new THREE.Vector3(-0.42, 1.12, 0.14), r0: 0.018, r1: 0.009, blooms: 4},
        {start: new THREE.Vector3(0.2, 1.16, 0.1), end: new THREE.Vector3(0.42, 1.1, -0.08), r0: 0.018, r1: 0.009, blooms: 4},
        {start: new THREE.Vector3(0.02, 1.48, 0.06), end: new THREE.Vector3(0.04, 1.66, -0.02), r0: 0.015, r1: 0.008, blooms: 4},
      ];

      const lixiMat = glossyClayMat('#E02424', 0.38);
      const lixiGoldMat = glossyClayMat('#F7C948', 0.25);

      twigs.forEach((tw, idx) => {
        addTaperBranch(tw.start, tw.end, tw.r0, tw.r1);
        for (let b = 0; b < tw.blooms; b++) {
          const frac = 0.28 + (b / Math.max(1, tw.blooms - 1)) * 0.72;
          const pt = new THREE.Vector3().lerpVectors(tw.start, tw.end, frac);
          const ang = idx * 1.4 + b * 2.15;
          const radial = 0.042 + (b % 2) * 0.022;
          const bx = pt.x + Math.cos(ang) * radial;
          const by = pt.y + Math.sin(b * 1.7) * 0.032 + 0.015;
          const bz = pt.z + Math.sin(ang) * radial;

          const flower = build3DFlowerHead(blossomCol, centerCol, 0.92 + (b % 3) * 0.14);
          flower.position.set(bx, by, bz);
          flower.rotation.set(0.36, ang, 0.24 * Math.sin(ang));
          g.add(flower);

          if (b % 2 === 0) {
            const bud = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 5), budMat);
            bud.scale.set(0.85, 1.45, 0.85);
            bud.position.set(pt.x - Math.cos(ang) * 0.035, pt.y + 0.026, pt.z - Math.sin(ang) * 0.035);
            bud.rotation.z = Math.cos(ang) * 0.45;
            g.add(bud);
          }
          if (b === 1) {
            const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.024, 6, 5), leafMat);
            leaf.scale.set(0.65, 0.22, 1.45);
            leaf.position.set(pt.x + Math.sin(ang) * 0.03, pt.y + 0.015, pt.z + Math.cos(ang) * 0.03);
            leaf.rotation.y = ang + 0.8;
            g.add(leaf);
          }
        }

        if (tw.lixi) {
          const lxPos = new THREE.Vector3().lerpVectors(tw.start, tw.end, 0.68);
          const thread = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.08, 4), lixiGoldMat);
          thread.position.set(lxPos.x, lxPos.y - 0.045, lxPos.z);
          const env = new THREE.Mesh(new RoundedBoxGeometry(0.068, 0.095, 0.014, 1, 0.004), lixiMat);
          env.position.set(lxPos.x, lxPos.y - 0.125, lxPos.z);
          env.rotation.y = idx * 0.6;
          const seal = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.018, 8), lixiGoldMat);
          seal.rotation.x = Math.PI / 2;
          seal.position.copy(env.position);
          g.add(thread, env, seal);
        }
      });

      // Scattered delicate fallen petals resting cleanly above soil
      for (let fp = 0; fp < 5; fp++) {
        const fa = (fp / 5) * Math.PI * 2 + 0.4;
        const petal = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.006, 7), clayMat(blossomCol, 0.5));
        petal.position.set(Math.cos(fa) * 0.14, 0.47, Math.sin(fa) * 0.14);
        g.add(petal);
      }
      break;
    }

    case 'tet_tea_table': {
      // Strictly clean empty table surface (no food/cups baked on top!) at surfaceHeight = 0.54
      const rosewoodMat = clayMat(item.color || '#7C361C', 0.52);
      const frameDarkMat = clayMat(item.accentColor || '#4E1F0F', 0.56);
      const brassMat = glossyClayMat('#E8C366', 0.25);

      const frameOuter = new THREE.Mesh(new RoundedBoxGeometry(1.52, 0.072, 0.92, 3, 0.025), frameDarkMat);
      frameOuter.position.y = 0.502;
      // Central inlaid top panel raised cleanly +0.004m above outer frame -> flush surface at y=0.54
      const insetPanel = new THREE.Mesh(new RoundedBoxGeometry(1.32, 0.072, 0.72, 2, 0.018), rosewoodMat);
      insetPanel.position.y = 0.506;

      // Carved scalloped apron rails below tabletop
      const apronFrontBack = new THREE.Mesh(new RoundedBoxGeometry(1.38, 0.095, 0.78, 2, 0.02), frameDarkMat);
      apronFrontBack.position.y = 0.425;

      // Lower slatted display stretcher shelf at y = 0.14
      const lowerShelf = new THREE.Mesh(new RoundedBoxGeometry(1.28, 0.036, 0.68, 2, 0.012), rosewoodMat);
      lowerShelf.position.y = 0.14;

      const legPts: [number, number][] = [
        [-0.65, -0.36],
        [0.65, -0.36],
        [-0.65, 0.36],
        [0.65, 0.36],
      ];
      for (const [lx, lz] of legPts) {
        const leg = new THREE.Mesh(new RoundedBoxGeometry(0.095, 0.49, 0.095, 2, 0.028), frameDarkMat);
        leg.position.set(lx, 0.245, lz);
        const footCap = new THREE.Mesh(new RoundedBoxGeometry(0.104, 0.045, 0.104, 2, 0.015), brassMat);
        footCap.position.set(lx, 0.022, lz);
        g.add(leg, footCap);
      }

      g.add(frameOuter, insetPanel, apronFrontBack, lowerShelf);
      break;
    }

    case 'tet_chair': {
      const woodMat = clayMat(item.color || '#7C361C', 0.52);
      const cushionMat = clayMat(item.accentColor || '#C92A2A', 0.72);
      const goldMat = glossyClayMat('#E8C366', 0.26);

      const seatFrame = new THREE.Mesh(new RoundedBoxGeometry(0.68, 0.08, 0.64, 2, 0.026), woodMat);
      seatFrame.position.y = 0.43;
      const cushion = new THREE.Mesh(new RoundedBoxGeometry(0.56, 0.065, 0.54, 2, 0.028), cushionMat);
      cushion.position.set(0, 0.47, 0.02);

      for (const [lx, lz] of [
        [-0.26, -0.24],
        [0.26, -0.24],
        [-0.26, 0.24],
        [0.26, 0.24],
      ]) {
        const leg = new THREE.Mesh(new RoundedBoxGeometry(0.068, 0.43, 0.068, 2, 0.02), woodMat);
        leg.position.set(lx, 0.215, lz);
        g.add(leg);
      }

      // Carved backrest stiles + crest rail + golden medallion splat
      [-0.26, 0.26].forEach((bx) => {
        const stile = new THREE.Mesh(new RoundedBoxGeometry(0.068, 0.66, 0.068, 2, 0.02), woodMat);
        stile.position.set(bx, 0.78, -0.24);
        const armPost = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.24, 0.06, 2, 0.018), woodMat);
        armPost.position.set(bx * 1.06, 0.56, 0.16);
        const armRail = new THREE.Mesh(new RoundedBoxGeometry(0.072, 0.055, 0.46, 2, 0.02), woodMat);
        armRail.position.set(bx * 1.06, 0.67, -0.03);
        g.add(stile, armPost, armRail);
      });
      const crest = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.11, 0.07, 2, 0.028), woodMat);
      crest.position.set(0, 1.08, -0.24);
      const backSplat = new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.54, 0.042, 2, 0.015), woodMat);
      backSplat.position.set(0, 0.78, -0.24);
      const medallion = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.052, 14), goldMat);
      medallion.rotation.x = Math.PI / 2;
      medallion.position.set(0, 0.8, -0.238);

      g.add(seatFrame, cushion, crest, backSplat, medallion);
      break;
    }

    case 'tet_five_fruit_tray': {
      // Sculpted pedestal "Mâm Bồng" + 5 distinct non-overlapping traditional Vietnamese Tet fruits
      const woodTrayMat = clayMat(item.accentColor || '#8C3B1F', 0.46);
      const goldTrimMat = glossyClayMat('#F2C249', 0.26);

      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 0.05, 16), woodTrayMat);
      foot.position.y = 0.025;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.09, 14), woodTrayMat);
      stem.position.y = 0.09;
      const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.15, 0.055, 22), woodTrayMat);
      dish.position.y = 0.155;
      const dishRim = new THREE.Mesh(new THREE.TorusGeometry(0.255, 0.016, 8, 24), goldTrimMat);
      dishRim.rotation.x = Math.PI / 2;
      dishRim.position.y = 0.18;
      g.add(foot, stem, dish, dishRim);

      // 1. Cradling green banana hand (Nải chuối xanh) along back arc
      const bananaMat = clayMat('#76B947', 0.54);
      const bananaTipMat = clayMat('#4C5F29', 0.72);
      for (let b = -2; b <= 2; b++) {
        const ang = b * 0.28;
        const bananaPivot = new THREE.Group();
        bananaPivot.position.set(Math.sin(ang) * 0.11, 0.2, -0.07 + Math.abs(b) * 0.015);
        bananaPivot.rotation.set(-0.22, -ang * 0.75, b * 0.12);
        const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.024, 0.13, 5, 8), bananaMat);
        body.rotation.x = 0.35;
        body.position.y = 0.08;
        const tip = new THREE.Mesh(new THREE.SphereGeometry(0.011, 5, 5), bananaTipMat);
        tip.position.set(0, 0.155, -0.025);
        bananaPivot.add(body, tip);
        g.add(bananaPivot);
      }

      // 2. Central Golden Pomelo (Quả Bưởi)
      const pomelo = new THREE.Mesh(new THREE.SphereGeometry(0.092, 14, 12), clayMat('#F2C12E', 0.56));
      pomelo.scale.set(1.06, 0.96, 1.06);
      pomelo.position.set(0, 0.255, 0.02);
      const pLeaf = new THREE.Mesh(new THREE.SphereGeometry(0.026, 6, 5), clayMat('#3B8C44', 0.5));
      pLeaf.scale.set(1.4, 0.25, 0.7);
      pLeaf.position.set(0.03, 0.35, 0.02);
      pLeaf.rotation.z = 0.35;
      g.add(pomelo, pLeaf);

      // 3. Red Dragon Fruit / Custard Apple (Thanh Long) front-left
      const dragonFruit = new THREE.Mesh(new THREE.SphereGeometry(0.062, 10, 8), glossyClayMat('#E03E6E', 0.44));
      dragonFruit.scale.set(0.92, 1.15, 0.92);
      dragonFruit.position.set(-0.115, 0.23, 0.085);
      const dragonScale = new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.045, 5), clayMat('#52B75B', 0.52));
      dragonScale.position.set(-0.115, 0.3, 0.085);
      g.add(dragonFruit, dragonScale);

      // 4. Golden Mango (Xoài Cát) front-right
      const mango = new THREE.Mesh(new THREE.SphereGeometry(0.056, 10, 8), glossyClayMat('#FFA928', 0.42));
      mango.scale.set(1.28, 0.84, 0.88);
      mango.position.set(0.115, 0.22, 0.075);
      mango.rotation.y = -0.5;
      g.add(mango);

      // 5. Pair of bright tangerines (Quýt Tết) nestled in front gap
      for (const tx of [-0.032, 0.042]) {
        const tang = new THREE.Mesh(new THREE.SphereGeometry(0.036, 9, 8), glossyClayMat('#FF6D1F', 0.42));
        tang.scale.set(1.08, 0.86, 1.08);
        tang.position.set(tx, 0.21, 0.145);
        g.add(tang);
      }
      break;
    }

    case 'tet_banh_chung': {
      // Celadon ceramic platter + crisp Banh Chung (raised lat-giang bamboo strips!) + Festive Watermelon
      const plateMat = glossyClayMat('#E7F0EA', 0.32);
      const goldTrim = glossyClayMat('#F2C249', 0.28);
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.19, 0.032, 18), plateMat);
      plate.position.y = 0.016;
      const plateRim = new THREE.Mesh(new THREE.TorusGeometry(0.235, 0.01, 6, 20), goldTrim);
      plateRim.rotation.x = Math.PI / 2;
      plateRim.position.y = 0.032;
      g.add(plate, plateRim);

      // Square Banh Chung wrapped in lá dong
      const cakeGroup = new THREE.Group();
      cakeGroup.position.set(-0.045, 0.072, 0.01);
      cakeGroup.rotation.y = 0.28;
      const leafWrap = new THREE.Mesh(
        new RoundedBoxGeometry(0.17, 0.08, 0.17, 2, 0.014),
        clayMat('#2E8540', 0.62),
      );
      cakeGroup.add(leafWrap);
      // Bamboo ties raised cleanly +0.006m outside cake faces (no overlap!)
      const bambooMat = clayMat('#EAD293', 0.65);
      for (const offset of [-0.036, 0.036]) {
        const tieX = new THREE.Mesh(new THREE.BoxGeometry(0.184, 0.092, 0.012), bambooMat);
        tieX.position.z = offset;
        const tieZ = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.092, 0.184), bambooMat);
        tieZ.position.x = offset;
        cakeGroup.add(tieX, tieZ);
      }
      g.add(cakeGroup);

      // Whole green Tet watermelon & juicy red slice beside it
      const melon = new THREE.Mesh(new THREE.SphereGeometry(0.074, 12, 10), glossyClayMat('#226F3D', 0.42));
      melon.scale.set(0.95, 1.12, 0.95);
      melon.position.set(0.1, 0.11, -0.055);
      const sliceRind = new THREE.Mesh(
        new THREE.CylinderGeometry(0.068, 0.068, 0.022, 12, 1, false, 0, Math.PI),
        clayMat('#2E8540', 0.56),
      );
      sliceRind.rotation.z = Math.PI / 2;
      sliceRind.rotation.y = 0.55;
      sliceRind.position.set(0.09, 0.045, 0.09);
      const sliceFlesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.056, 0.056, 0.026, 12, 1, false, 0, Math.PI),
        glossyClayMat('#F0444D', 0.42),
      );
      sliceFlesh.rotation.copy(sliceRind.rotation);
      sliceFlesh.position.copy(sliceRind.position);
      g.add(melon, sliceRind, sliceFlesh);
      break;
    }

    case 'tea_set_ceramic': {
      // Pure ceramic teapot & 4 teacups sitting directly on floor/table surface (zero tray underneath!)
      const ceramicMat = glossyClayMat(item.color || '#6BB8A8', 0.26);
      const rimMat = glossyClayMat('#F5EFE4', 0.3);
      const lidKnobMat = glossyClayMat('#F2C249', 0.24);
      const teaMat = glossyClayMat('#D48C38', 0.22);

      // Refined Lathe teapot body directly on y = 0
      const potPts = [
        new THREE.Vector2(0.01, 0),
        new THREE.Vector2(0.052, 0),
        new THREE.Vector2(0.082, 0.048),
        new THREE.Vector2(0.076, 0.095),
        new THREE.Vector2(0.044, 0.125),
        new THREE.Vector2(0.048, 0.138),
        new THREE.Vector2(0.01, 0.142),
      ];
      const pot = new THREE.Mesh(new THREE.LatheGeometry(potPts, 16), ceramicMat);
      pot.position.set(-0.07, 0, -0.02);
      const potNeck = new THREE.Mesh(new THREE.TorusGeometry(0.046, 0.006, 6, 16), rimMat);
      potNeck.rotation.x = Math.PI / 2;
      potNeck.position.set(-0.07, 0.13, -0.02);
      const lidKnob = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 8), lidKnobMat);
      lidKnob.position.set(-0.07, 0.155, -0.02);

      const spoutCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.005, 0.052, -0.02),
        new THREE.Vector3(0.028, 0.075, -0.02),
        new THREE.Vector3(0.042, 0.112, -0.02),
      ]);
      const spout = new THREE.Mesh(new THREE.TubeGeometry(spoutCurve, 10, 0.012, 8, false), ceramicMat);
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.011, 7, 14, Math.PI * 1.1), ceramicMat);
      handle.rotation.z = Math.PI * 0.45;
      handle.position.set(-0.142, 0.078, -0.02);
      g.add(pot, potNeck, lidKnob, spout, handle);

      // 4 glazed porcelain teacups resting directly on surface y = 0
      const cupPts = [
        new THREE.Vector2(0.008, 0),
        new THREE.Vector2(0.02, 0),
        new THREE.Vector2(0.029, 0.036),
        new THREE.Vector2(0.026, 0.042),
        new THREE.Vector2(0.023, 0.036),
      ];
      const cupGeo = new THREE.LatheGeometry(cupPts, 12);
      for (const [cx, cz] of [
        [0.085, -0.075],
        [0.145, 0.015],
        [0.065, 0.082],
        [-0.038, 0.105],
      ]) {
        const cup = new THREE.Mesh(cupGeo, ceramicMat);
        cup.position.set(cx, 0, cz);
        const cupRim = new THREE.Mesh(new THREE.TorusGeometry(0.027, 0.0035, 5, 12), rimMat);
        cupRim.rotation.x = Math.PI / 2;
        cupRim.position.set(cx, 0.04, cz);
        const tea = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.006, 10), teaMat);
        tea.position.set(cx, 0.031, cz);
        g.add(cup, cupRim, tea);
      }
      break;
    }

    case 'tet_lantern_lamp': {
      const standMat = clayMat('#4E2414', 0.6);
      const goldMat = glossyClayMat('#F4C95D', 0.25);
      const lanternMat = new THREE.MeshStandardMaterial({
        color: item.color || '#E63946',
        emissive: '#FF5C3A',
        emissiveIntensity: 0.78,
        roughness: 0.42,
      });

      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.23, 0.055, 16), standMat);
      base.position.y = 0.028;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.034, 1.42, 9), standMat);
      post.position.set(-0.1, 0.73, -0.05);
      const arm = new THREE.Mesh(new RoundedBoxGeometry(0.32, 0.042, 0.042, 2, 0.014), standMat);
      arm.position.set(0.03, 1.42, 0.02);
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.16, 6), goldMat);
      cord.position.set(0.14, 1.32, 0.02);

      // Ribbed Hội An silk lantern
      const lanternBody = new THREE.Mesh(new THREE.SphereGeometry(0.175, 16, 12), lanternMat);
      lanternBody.scale.set(1.02, 1.24, 1.02);
      lanternBody.position.set(0.14, 1.04, 0.02);
      const capTop = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.088, 0.038, 12), goldMat);
      capTop.position.set(0.14, 1.245, 0.02);
      const capBot = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.072, 0.038, 12), goldMat);
      capBot.position.set(0.14, 0.835, 0.02);
      const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.18, 10), clayMat('#D92424', 0.65));
      tassel.position.set(0.14, 0.72, 0.02);

      g.userData.lampShadeMat = lanternMat;
      g.userData.lampLightLocalPos = [0.14, 1.05, 0.02];
      g.add(base, post, arm, cord, lanternBody, capTop, capBot, tassel);
      break;
    }

    case 'tet_vase_blossom': {
      // Classic ceramic vase holding graceful cut peach blossom branches (cành hoa đào, NOT a full potted tree)
      const vaseMat = glossyClayMat(item.color || '#34689A', 0.28);
      const rimMat = glossyClayMat('#F4EFE4', 0.32);
      const goldBandMat = glossyClayMat('#F2C249', 0.24);
      const twigMat = clayMat('#5E3A24', 0.84);
      const budMat = clayMat('#E84A7F', 0.52);
      const leafMat = clayMat('#66B856', 0.62);

      const vasePts = [
        new THREE.Vector2(0.01, 0),
        new THREE.Vector2(0.085, 0),
        new THREE.Vector2(0.145, 0.18),
        new THREE.Vector2(0.125, 0.34),
        new THREE.Vector2(0.065, 0.44),
        new THREE.Vector2(0.085, 0.52),
        new THREE.Vector2(0.062, 0.52),
        new THREE.Vector2(0.056, 0.43),
      ];
      const vase = new THREE.Mesh(new THREE.LatheGeometry(vasePts, 18), vaseMat);
      const neckRing = new THREE.Mesh(new THREE.TorusGeometry(0.078, 0.012, 6, 18), rimMat);
      neckRing.rotation.x = Math.PI / 2;
      neckRing.position.y = 0.515;
      const bellyBand = new THREE.Mesh(new THREE.TorusGeometry(0.144, 0.006, 6, 20), goldBandMat);
      bellyBand.rotation.x = Math.PI / 2;
      bellyBand.position.y = 0.19;
      g.add(vase, neckRing, bellyBand);

      // 6 slender curving cut peach blossom branches fanning gracefully from inside the vase neck
      const branchSpecs: Array<{
        pts: [number, number, number][];
        forkIdx: number;
        forkDir: [number, number, number];
        blooms: number;
      }> = [
        {
          pts: [[0, 0.44, 0], [-0.05, 0.66, 0.04], [-0.17, 0.86, 0.09], [-0.26, 0.96, 0.13]],
          forkIdx: 1,
          forkDir: [-0.14, 0.16, -0.05],
          blooms: 4,
        },
        {
          pts: [[0.01, 0.44, -0.01], [0.06, 0.68, -0.03], [0.16, 0.88, -0.07], [0.24, 1.0, -0.1]],
          forkIdx: 1,
          forkDir: [0.14, 0.15, 0.08],
          blooms: 4,
        },
        {
          pts: [[0, 0.44, 0.01], [0.01, 0.72, 0.02], [-0.03, 0.96, 0.03], [0.02, 1.12, 0.01]],
          forkIdx: 2,
          forkDir: [0.11, 0.13, 0.07],
          blooms: 4,
        },
        {
          pts: [[-0.01, 0.44, -0.01], [-0.07, 0.64, -0.06], [-0.19, 0.76, -0.14]],
          forkIdx: 1,
          forkDir: [-0.09, 0.14, 0.06],
          blooms: 3,
        },
        {
          pts: [[0.01, 0.44, 0.01], [0.08, 0.62, 0.07], [0.21, 0.74, 0.16]],
          forkIdx: 1,
          forkDir: [0.08, 0.12, -0.06],
          blooms: 3,
        },
        {
          pts: [[0, 0.44, 0], [-0.02, 0.6, 0.08], [-0.06, 0.73, 0.18]],
          forkIdx: 1,
          forkDir: [0.06, 0.11, 0.09],
          blooms: 3,
        },
      ];

      branchSpecs.forEach((br, idx) => {
        const curve = new THREE.CatmullRomCurve3(br.pts.map((p) => new THREE.Vector3(...p)));
        const twig = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.0085, 6, false), twigMat);
        g.add(twig);

        // Forked secondary twig
        const forkBase = new THREE.Vector3(...br.pts[br.forkIdx]);
        const forkTip = forkBase.clone().add(new THREE.Vector3(...br.forkDir));
        const forkCurve = new THREE.CatmullRomCurve3([
          forkBase,
          forkBase.clone().lerp(forkTip, 0.5).add(new THREE.Vector3(0, 0.02, 0)),
          forkTip,
        ]);
        const subTwig = new THREE.Mesh(new THREE.TubeGeometry(forkCurve, 6, 0.0055, 5, false), twigMat);
        g.add(subTwig);

        // Pink 5-petal peach blossoms & rose buds along the branch & fork
        for (let b = 0; b < br.blooms; b++) {
          const u = 0.34 + (b / Math.max(1, br.blooms - 1)) * 0.64;
          const pt = curve.getPointAt(u);
          const ang = idx * 1.3 + b * 2.1;
          const flower = build3DFlowerHead(
            b % 2 === 0 ? '#FF9EB5' : '#FFB5C8',
            '#F6C945',
            0.76 + (b % 2) * 0.14,
          );
          flower.position.set(
            pt.x + Math.cos(ang) * 0.022,
            pt.y + 0.01,
            pt.z + Math.sin(ang) * 0.022,
          );
          flower.rotation.set(0.45, ang, 0.25 * Math.cos(ang));
          g.add(flower);

          if (b % 2 === 0) {
            const bud = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 5), budMat);
            bud.scale.set(0.85, 1.4, 0.85);
            bud.position.set(pt.x - Math.cos(ang) * 0.02, pt.y + 0.022, pt.z - Math.sin(ang) * 0.02);
            bud.rotation.z = Math.cos(ang) * 0.45;
            g.add(bud);
          }
        }

        // Blossom + tender spring leaf on the secondary fork tip
        const tipFlower = build3DFlowerHead('#FF9EB5', '#F6C945', 0.78);
        tipFlower.position.copy(forkTip);
        tipFlower.rotation.set(0.42, idx * 0.9, 0.2);
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 5), leafMat);
        leaf.scale.set(0.55, 0.2, 1.4);
        leaf.position.copy(forkTip).add(new THREE.Vector3(0.015, 0.012, 0.015));
        leaf.rotation.y = idx * 1.1;
        g.add(tipFlower, leaf);
      });
      break;
    }

    case 'tet_rug_red': {
      const rugTex = getTetRugTexture(item.color || '#B8232A', item.accentColor || '#F4C95D');
      const rugBase = new THREE.Mesh(
        new RoundedBoxGeometry(2.9, 0.024, 2.1, 2, 0.012),
        clayMat(item.color || '#B8232A', 0.86),
      );
      rugBase.position.y = 0.012;
      const rugTop = new THREE.Mesh(
        new THREE.PlaneGeometry(2.86, 2.06),
        new THREE.MeshStandardMaterial({map: rugTex, roughness: 0.84}),
      );
      rugTop.rotation.x = -Math.PI / 2;
      rugTop.position.y = 0.028;
      g.add(rugBase, rugTop);
      break;
    }

    case 'tet_flower_wreath': {
      // Handcrafted braided rattan Tết wreath with asymmetric cascading Mai & Đào sprays, gold fortune coin & twin silk tassels (no lights!)
      const cy = item.mountHeight ?? 2.02;
      const wreathGroup = new THREE.Group();
      wreathGroup.position.set(0, cy, 0.055);

      const vineDarkMat = clayMat('#7D4F28', 0.82);
      const vineLightMat = clayMat('#A9733C', 0.78);
      const leafMat = clayMat('#4FA353', 0.62);
      const silkRedMat = glossyClayMat('#D62828', 0.42);
      const goldMat = glossyClayMat('#F5C443', 0.24);

      // 3 organically waving braided rattan vine loops (breaks stiff geometric circle look)
      for (let v = 0; v < 3; v++) {
        const vinePts: THREE.Vector3[] = [];
        for (let s = 0; s < 28; s++) {
          const a = (s / 28) * Math.PI * 2;
          const rad = 0.345 + Math.sin(a * 3 + v * 2.1) * 0.018;
          const vz = Math.cos(a * 2 + v * 1.9) * 0.012;
          vinePts.push(new THREE.Vector3(Math.cos(a) * rad, Math.sin(a) * rad, vz));
        }
        const vineCurve = new THREE.CatmullRomCurve3(vinePts, true);
        const vineMesh = new THREE.Mesh(
          new THREE.TubeGeometry(vineCurve, 44, v === 0 ? 0.022 : 0.015, 7, true),
          v % 2 === 0 ? vineDarkMat : vineLightMat,
        );
        wreathGroup.add(vineMesh);
      }

      // Asymmetric cascading floral sprays: rich lower-left sweep + lighter upper-right accent
      const maiSprayAngles = [
        -Math.PI * 0.72,
        -Math.PI * 0.86,
        -Math.PI * 0.98,
        Math.PI * 0.92,
        Math.PI * 0.78,
        -Math.PI * 0.56,
        -Math.PI * 0.42,
        Math.PI * 0.24,
        Math.PI * 0.12,
        -Math.PI * 0.02,
        -Math.PI * 0.16,
      ];
      maiSprayAngles.forEach((a, idx) => {
        const rOff = 0.34 + Math.sin(idx * 1.7) * 0.036;
        const fx = Math.cos(a) * rOff;
        const fy = Math.sin(a) * rOff;
        const isPeach = idx % 3 === 1;
        const fl = build3DFlowerHead(
          isPeach ? '#FF9EB5' : '#FFD43B',
          isPeach ? '#F6C945' : '#E87A14',
          idx % 2 === 0 ? 1.12 : 0.88,
        );
        fl.position.set(fx, fy, 0.048 + (idx % 2) * 0.016);
        fl.rotation.x = Math.PI / 2 - 0.15;
        fl.rotation.z = Math.sin(idx) * 0.22;
        wreathGroup.add(fl);

        // Fresh green spring leaves flanking blossoms
        for (const side of [-1, 1]) {
          const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.028, 6, 5), leafMat);
          leaf.scale.set(0.55, 1.55, 0.26);
          leaf.position.set(
            fx + Math.cos(a + side * 0.4) * 0.036,
            fy + Math.sin(a + side * 0.4) * 0.036,
            0.032,
          );
          leaf.rotation.z = a + side * 0.55;
          wreathGroup.add(leaf);
        }
      });

      // Decorative crimson silk ribbon bow + auspicious golden coin + flowing twin tails at crown
      const bowPivot = new THREE.Group();
      bowPivot.position.set(0, 0.355, 0.068);
      for (const s of [-1, 1]) {
        const loop = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.02, 8, 16), silkRedMat);
        loop.scale.set(1.28, 0.8, 0.65);
        loop.position.set(s * 0.082, 0.02, 0);
        loop.rotation.z = s * -0.24;
        const tailCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(s * 0.02, 0, -0.01),
          new THREE.Vector3(s * 0.065, -0.09, 0.008),
          new THREE.Vector3(s * 0.09, -0.2, -0.005),
        ]);
        const tail = new THREE.Mesh(new THREE.TubeGeometry(tailCurve, 10, 0.018, 6, false), silkRedMat);
        tail.scale.set(1.3, 1, 0.45);
        bowPivot.add(loop, tail);
      }
      const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.014, 16), goldMat);
      coin.rotation.x = Math.PI / 2;
      coin.position.z = 0.02;
      const coinSquare = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.022, 0.018), silkRedMat);
      coinSquare.position.z = 0.022;
      bowPivot.add(coin, coinSquare);
      wreathGroup.add(bowPivot);

      // Twin hanging red tassels & gold beads at bottom
      for (const tx of [-0.055, 0.055]) {
        const bead = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), goldMat);
        bead.position.set(tx, -0.375, 0.036);
        const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.145, 10), silkRedMat);
        tassel.position.set(tx, -0.465, 0.036);
        wreathGroup.add(bead, tassel);
      }

      g.add(wreathGroup);
      break;
    }

    case 'xmas_wreath': {
      // Hand-Tied Botanical Christmas Wreath: feathered multi-species evergreen spray fans, braided grapevine core,
      // hanging golden jingle bells inside the arch, dried spiced oranges, cinnamon sticks, layered pinecones & velvet bow (zero lights!)
      const cy = item.mountHeight ?? 2.02;
      const wreathGroup = new THREE.Group();
      wreathGroup.position.set(0, cy, 0.06);

      const vineMat = clayMat('#6B462B', 0.88);
      const firDeepMat = clayMat('#15472B', 0.74);
      const spruceMidMat = clayMat('#1F663D', 0.68);
      const cedarSageMat = clayMat('#3A855C', 0.62);
      const eucalyptusMat = clayMat('#689E82', 0.66);
      const snowDustMat = clayMat('#EEF6FB', 0.72);
      const coneDarkMat = clayMat('#5E371E', 0.84);
      const coneTipMat = clayMat('#9A643C', 0.78);
      const cinnamonMat = clayMat('#8D4C27', 0.76);
      const orangeRindMat = glossyClayMat('#DF6F24', 0.44);
      const orangePulpMat = glossyClayMat('#F7A43B', 0.34);
      const velvetRedMat = glossyClayMat('#B41B24', 0.46);
      const velvetDarkMat = glossyClayMat('#841118', 0.52);
      const berryMat = glossyClayMat('#E02430', 0.2);
      const brassBellMat = glossyClayMat('#F2C249', 0.18);

      // 1. Braided Rustic Grapevine Frame (textured twin rings tucked behind boughs)
      const vineMain = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.026, 8, 28), vineMat);
      vineMain.position.z = 0.008;
      const vineTwist = new THREE.Mesh(new THREE.TorusGeometry(0.338, 0.014, 7, 28), coneDarkMat);
      vineTwist.position.z = 0.014;
      wreathGroup.add(vineMain, vineTwist);

      // 2. Feathered Botanical Evergreen Spray Fans (26 fanned clusters x 3 splayed needle sprays = lush organic outline!)
      const needleGeo = new THREE.SphereGeometry(0.032, 7, 6);
      needleGeo.scale(0.55, 2.35, 0.24);
      const leafPalette = [firDeepMat, spruceMidMat, cedarSageMat, spruceMidMat];

      for (let i = 0; i < 26; i++) {
        const a = (i / 26) * Math.PI * 2;
        // Gentle asymmetrical fullness (especially lush along sides & lower arc)
        const asymBoost = 1.0 + 0.14 * Math.sin(a * 2 + 0.7) + (Math.sin(a) < 0 ? 0.1 : 0);
        const rBase = 0.315 + Math.sin(i * 1.9) * 0.028;
        const bx = Math.cos(a) * rBase;
        const by = Math.sin(a) * rBase;
        const bz = 0.022 + (i % 3) * 0.012;

        const spray = new THREE.Group();
        spray.position.set(bx, by, bz);
        // Tangential flow sweeping gracefully around the ring
        spray.rotation.z = a - Math.PI * 0.48 + (i % 2 === 0 ? 0.16 : -0.14);
        spray.rotation.x = 0.18 + (i % 3) * 0.08;
        spray.scale.setScalar(asymBoost);

        // 3 fanned needles per cluster (outer sweep, center spine, inner tuck)
        const fanOffsets: Array<[number, number, number, number, THREE.Material]> = [
          [-0.026, 0.045, 0.004, 0.38, leafPalette[i % 4]],
          [0, 0.062, 0.012, 0.02, leafPalette[(i + 1) % 4]],
          [0.028, 0.042, 0.002, -0.36, leafPalette[(i + 2) % 4]],
        ];
        for (const [nx, ny, nz, nRot, nMat] of fanOffsets) {
          const sprig = new THREE.Mesh(needleGeo, nMat);
          sprig.position.set(nx, ny, nz);
          sprig.rotation.z = nRot;
          spray.add(sprig);
        }

        // Frosted silver eucalyptus leaf accent every 3rd bough
        if (i % 3 === 1) {
          const euc = new THREE.Mesh(new THREE.SphereGeometry(0.03, 7, 6), eucalyptusMat);
          euc.scale.set(0.95, 1.35, 0.2);
          euc.position.set(0.036, 0.072, 0.022);
          euc.rotation.z = -0.52;
          spray.add(euc);
        }

        // Subtle winter frost dusting on outer tips
        if (i % 4 === 0) {
          const frost = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 5), snowDustMat);
          frost.scale.set(1.1, 1.5, 0.3);
          frost.position.set(-0.018, 0.095, 0.018);
          frost.rotation.z = 0.25;
          spray.add(frost);
        }

        wreathGroup.add(spray);
      }

      // 3. Hanging Golden Jingle Bells suspended inside top arch beneath the bow
      [-0.048, 0.048].forEach((bx, bi) => {
        const cordLen = bi === 0 ? 0.11 : 0.145;
        const cord = new THREE.Mesh(
          new THREE.CylinderGeometry(0.004, 0.004, cordLen, 6),
          velvetDarkMat,
        );
        cord.position.set(bx, 0.24 - cordLen * 0.5, 0.055);
        cord.rotation.z = bi === 0 ? 0.12 : -0.1;

        const bellGrp = new THREE.Group();
        bellGrp.position.set(bx * 1.15, 0.23 - cordLen, 0.058);
        bellGrp.rotation.z = bi === 0 ? 0.16 : -0.14;
        const bellCup = new THREE.Mesh(
          new THREE.CylinderGeometry(0.018, 0.034, 0.044, 12),
          brassBellMat,
        );
        const bellLip = new THREE.Mesh(
          new THREE.TorusGeometry(0.032, 0.006, 6, 14),
          brassBellMat,
        );
        bellLip.rotation.x = Math.PI / 2;
        bellLip.position.y = -0.02;
        const clapper = new THREE.Mesh(new THREE.SphereGeometry(0.01, 7, 6), brassBellMat);
        clapper.position.y = -0.028;
        bellGrp.add(bellCup, bellLip, clapper);
        wreathGroup.add(cord, bellGrp);
      });

      // 4. Layered Botanical Pine Cone helper
      const addPineCone = (px: number, py: number, pz: number, tiltZ: number, sc = 1) => {
        const cone = new THREE.Group();
        cone.position.set(px, py, pz);
        cone.rotation.set(0.36, 0, tiltZ);
        cone.scale.setScalar(sc);
        for (let ring = 0; ring < 5; ring++) {
          const r = 0.034 - ring * 0.0052;
          const layer = new THREE.Mesh(
            new THREE.ConeGeometry(r, 0.026, 7),
            ring % 2 === 0 ? coneDarkMat : coneTipMat,
          );
          layer.position.y = ring * 0.015;
          cone.add(layer);
        }
        wreathGroup.add(cone);
      };

      // 5. Dried Spiced Orange Slices (3:30 and 8:30 positions)
      [-Math.PI * 0.12, Math.PI * 1.12].forEach((oa) => {
        const ox = Math.cos(oa) * 0.345;
        const oy = Math.sin(oa) * 0.345;
        const orangeGrp = new THREE.Group();
        orangeGrp.position.set(ox, oy, 0.072);
        orangeGrp.rotation.set(-0.15, oa > 1 ? 0.22 : -0.22, oa * 0.3);
        const rind = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.014, 14), orangeRindMat);
        rind.rotation.x = Math.PI / 2;
        const pulp = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.016, 14), orangePulpMat);
        pulp.rotation.x = Math.PI / 2;
        orangeGrp.add(rind, pulp);
        wreathGroup.add(orangeGrp);
      });

      // 6. Cinnamon Stick Bundle tied cleanly at 7 o'clock & 10 o'clock
      [-Math.PI * 0.72, Math.PI * 0.78].forEach((ca) => {
        const cx = Math.cos(ca) * 0.34;
        const cyPos = Math.sin(ca) * 0.34;
        const cinGrp = new THREE.Group();
        cinGrp.position.set(cx, cyPos, 0.076);
        cinGrp.rotation.z = ca + 0.65;
        [-0.012, 0.012].forEach((offset) => {
          const stick = new THREE.Mesh(
            new THREE.CylinderGeometry(0.011, 0.011, 0.095, 8),
            cinnamonMat,
          );
          stick.position.x = offset;
          cinGrp.add(stick);
        });
        const twine = new THREE.Mesh(
          new THREE.TorusGeometry(0.018, 0.004, 6, 12),
          snowDustMat,
        );
        twine.rotation.x = Math.PI / 2;
        cinGrp.add(twine);
        wreathGroup.add(cinGrp);
      });

      // 7. Three Pine Cone + Winterberry Holly Clusters (9:30, 2:30, and 6:00 base anchor)
      [Math.PI * 0.88, Math.PI * 0.18, -Math.PI * 0.5].forEach((ca, ci) => {
        const cx = Math.cos(ca) * 0.335;
        const cyPos = Math.sin(ca) * 0.335;
        addPineCone(cx - Math.sin(ca) * 0.022, cyPos + Math.cos(ca) * 0.022, 0.074, ca + 0.4, 0.94);
        if (ci === 2) {
          addPineCone(cx + 0.045, cyPos + 0.01, 0.072, ca - 0.5, 0.82);
        }
        for (const [bx, by, bz] of [
          [0.018, 0.012, 0.095],
          [-0.014, 0.024, 0.092],
          [0.008, -0.018, 0.094],
        ]) {
          const berry = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 7), berryMat);
          berry.position.set(cx + bx + (ci === 2 ? -0.04 : 0), cyPos + by, bz);
          wreathGroup.add(berry);
        }
      });

      // 8. Opulent Sculpted Velvet Crimson Bow at 12 o'clock Crown with Draped Swallowtail Ribbons
      const bowPivot = new THREE.Group();
      bowPivot.position.set(0, 0.34, 0.088);
      for (const s of [-1, 1]) {
        const bigLoop = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.024, 10, 18), velvetRedMat);
        bigLoop.scale.set(1.26, 0.78, 0.58);
        bigLoop.position.set(s * 0.098, 0.022, 0);
        bigLoop.rotation.z = s * -0.22;

        const innerFold = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.016, 8, 14), velvetDarkMat);
        innerFold.scale.set(1.18, 0.72, 0.55);
        innerFold.position.set(s * 0.068, -0.008, 0.016);
        innerFold.rotation.z = s * -0.36;

        const tailCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(s * 0.018, 0, -0.006),
          new THREE.Vector3(s * 0.08, -0.095, 0.022),
          new THREE.Vector3(s * 0.135, -0.215, 0.008),
        ]);
        const tail = new THREE.Mesh(new THREE.TubeGeometry(tailCurve, 12, 0.022, 6, false), velvetRedMat);
        tail.scale.set(1.35, 1, 0.32);
        bowPivot.add(bigLoop, innerFold, tail);
      }
      const bowKnot = new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 8), velvetRedMat);
      bowKnot.scale.set(1.12, 0.92, 0.85);
      bowKnot.position.z = 0.025;
      bowPivot.add(bowKnot);
      wreathGroup.add(bowPivot);

      g.add(wreathGroup);
      break;
    }

    case 'xmas_tree': {
      // Plush multi-tiered 2.32m Christmas tree with EVEN 360-degree outer fairy illumination, gold bead garland, baubles & golden star topper!
      const trunkMat = clayMat('#6B4427', 0.85);
      const skirtMat = clayMat('#C92A2A', 0.78);
      const skirtTrimMat = clayMat('#FFF8ED', 0.72);
      const pineDeep = clayMat('#1B5E3A', 0.72);
      const pineMid = clayMat('#237447', 0.68);
      const pineFresh = clayMat('#2E8B57', 0.64);
      const snowDustMat = clayMat('#F4FAFF', 0.65);

      const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.66, 0.06, 20), skirtMat);
      skirt.position.y = 0.03;
      const skirtRim = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.025, 7, 24), skirtTrimMat);
      skirtRim.rotation.x = Math.PI / 2;
      skirtRim.position.y = 0.032;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.5, 10), trunkMat);
      trunk.position.y = 0.25;
      g.add(skirt, skirtRim, trunk);

      const tiers = [
        {y: 0.44, r: 0.64, h: 0.56, sprigs: 14, mat: pineDeep},
        {y: 0.76, r: 0.55, h: 0.52, sprigs: 12, mat: pineMid},
        {y: 1.06, r: 0.46, h: 0.46, sprigs: 11, mat: pineDeep},
        {y: 1.34, r: 0.37, h: 0.42, sprigs: 9, mat: pineFresh},
        {y: 1.6, r: 0.28, h: 0.36, sprigs: 8, mat: pineMid},
        {y: 1.84, r: 0.19, h: 0.34, sprigs: 6, mat: pineFresh},
      ];

      tiers.forEach((tier, tIdx) => {
        const core = new THREE.Mesh(new THREE.ConeGeometry(tier.r * 0.88, tier.h, 14), tier.mat);
        core.position.y = tier.y + tier.h * 0.42;
        g.add(core);

        for (let s = 0; s < tier.sprigs; s++) {
          const a = (s / tier.sprigs) * Math.PI * 2 + tIdx * 0.37;
          const bough = new THREE.Mesh(
            new THREE.ConeGeometry(0.105 - tIdx * 0.01, tier.r * 0.68, 6),
            s % 2 === 0 ? tier.mat : pineFresh,
          );
          bough.scale.set(1.22, 1, 0.55);
          bough.position.set(
            Math.cos(a) * tier.r * 0.54,
            tier.y + 0.08,
            Math.sin(a) * tier.r * 0.54,
          );
          bough.rotation.order = 'YXZ';
          bough.rotation.y = Math.atan2(Math.cos(a), Math.sin(a));
          bough.rotation.x = 1.18;
          g.add(bough);

          if ((s + tIdx) % 3 === 0) {
            const frost = new THREE.Mesh(new THREE.SphereGeometry(0.038, 6, 5), snowDustMat);
            frost.scale.set(1.2, 0.42, 0.88);
            frost.position.set(
              Math.cos(a) * tier.r * 0.8,
              tier.y + 0.035,
              Math.sin(a) * tier.r * 0.8,
            );
            g.add(frost);
          }
        }
      });

      // Even 360-degree outer helical fairy garland positioned cleanly proud of all boughs (never occluded!)
      const helixPts: THREE.Vector3[] = [];
      const spiralSamples = 56;
      for (let i = 0; i <= spiralSamples; i++) {
        const u = i / spiralSamples;
        const a = u * Math.PI * 2 * 4.25;
        const hy = 0.48 + u * 1.48;
        const hr = THREE.MathUtils.lerp(0.675, 0.185, u);
        helixPts.push(new THREE.Vector3(Math.cos(a) * hr, hy, Math.sin(a) * hr));
      }
      const garlandCurve = new THREE.CatmullRomCurve3(helixPts);
      const neonWireMat = new THREE.MeshStandardMaterial({
        color: '#FFE680',
        emissive: '#FFC947',
        emissiveIntensity: 0.72,
        roughness: 0.25,
      });
      const garlandCord = new THREE.Mesh(new THREE.TubeGeometry(garlandCurve, 84, 0.011, 6, false), neonWireMat);
      g.add(garlandCord);

      // Evenly distributed glowing LED bulbs with individual materials so every angle shines uniformly!
      const bulbColors = ['#FFE066', '#FFF3B0', '#FF6B8B', '#74C0FC', '#69DB7C'];
      const totalBulbs = 36;
      for (let b = 0; b < totalBulbs; b++) {
        const u = (b + 0.4) / totalBulbs;
        const pt = garlandCurve.getPointAt(u);
        const hex = bulbColors[b % bulbColors.length];
        const mat = new THREE.MeshStandardMaterial({
          color: hex,
          emissive: hex,
          emissiveIntensity: 1.15,
          roughness: 0.18,
        });
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.025, 7, 6), mat);
        bulb.position.copy(pt);
        g.add(bulb);
        registerTwinkleBulb(g, bulb, mat, b * 0.55, 1.15);
      }

      // Glossy metallic baubles ("Trái Châu") evenly spaced around every tier
      const baublePalette = ['#E03131', '#F5C443', '#339AF0', '#F8F9FA', '#F06595'];
      const capGold = glossyClayMat('#F5C443', 0.22);
      for (let i = 0; i < 20; i++) {
        const u = 0.08 + (i / 20) * 0.78;
        const a = i * 2.39996; // Golden angle distribution for natural 360 uniformity!
        const by = 0.48 + u * 1.38;
        const br = THREE.MathUtils.lerp(0.61, 0.19, u);
        const bx = Math.cos(a) * br;
        const bz = Math.sin(a) * br;
        const ornament = new THREE.Mesh(
          new THREE.SphereGeometry(0.046, 10, 8),
          glossyClayMat(baublePalette[i % baublePalette.length], 0.16),
        );
        ornament.position.set(bx, by, bz);
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.015, 0.018, 6), capGold);
        cap.position.set(bx, by + 0.046, bz);
        g.add(ornament, cap);
      }

      // Sculpted 3D Golden Star Topper at y = 2.18
      const starMat = new THREE.MeshStandardMaterial({
        color: '#FFE066',
        emissive: '#FFB703',
        emissiveIntensity: 0.95,
        roughness: 0.2,
        metalness: 0.35,
      });
      const starGroup = new THREE.Group();
      starGroup.position.y = 2.16;
      const starHub = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), starMat);
      starGroup.add(starHub);
      for (let p = 0; p < 5; p++) {
        const pa = (p / 5) * Math.PI * 2;
        const ray = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.145, 4), starMat);
        ray.position.set(Math.sin(pa) * 0.075, Math.cos(pa) * 0.075, 0);
        ray.rotation.z = -pa;
        starGroup.add(ray);
      }
      g.add(starGroup);

      g.userData.lampShadeMat = neonWireMat;
      g.userData.lampLightLocalPos = [0, 1.35, 0];
      break;
    }

    case 'xmas_snowman': {
      // Character-proportioned Snowman (~1.36m tall, never oversized!)
      const snowMat = clayMat('#F4F8FC', 0.78);
      const coalMat = glossyClayMat('#262B34', 0.32);
      const carrotMat = clayMat('#FF7A1A', 0.56);
      const scarfRedMat = clayMat('#D9383A', 0.74);
      const scarfCreamMat = clayMat('#FFF8EB', 0.72);
      const hatMat = clayMat('#2B303A', 0.62);
      const twigMat = clayMat('#6D4325', 0.86);

      // Soft snow mound base
      const snowPad = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 0.06, 18), snowMat);
      snowPad.position.y = 0.03;

      // Bottom, torso & head spheres
      const botBall = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 12), snowMat);
      botBall.scale.set(1.04, 0.92, 1.04);
      botBall.position.y = 0.34;
      const midBall = new THREE.Mesh(new THREE.SphereGeometry(0.255, 16, 12), snowMat);
      midBall.scale.set(1.02, 0.94, 1.02);
      midBall.position.y = 0.76;
      const headBall = new THREE.Mesh(new THREE.SphereGeometry(0.195, 14, 12), snowMat);
      headBall.position.y = 1.12;
      g.add(snowPad, botBall, midBall, headBall);

      // Knit winter scarf (coiled neck ring + draped front tail cleanly outside torso)
      const scarfNeck = new THREE.Mesh(new THREE.TorusGeometry(0.185, 0.044, 8, 18), scarfRedMat);
      scarfNeck.rotation.x = Math.PI / 2;
      scarfNeck.position.y = 0.945;
      const scarfStripe = new THREE.Mesh(new THREE.TorusGeometry(0.186, 0.045, 8, 18, 0.7), scarfCreamMat);
      scarfStripe.rotation.x = Math.PI / 2;
      scarfStripe.rotation.z = 1.25;
      scarfStripe.position.y = 0.945;
      const scarfTail = new THREE.Mesh(new RoundedBoxGeometry(0.088, 0.24, 0.03, 2, 0.012), scarfRedMat);
      scarfTail.position.set(0.09, 0.82, 0.225);
      scarfTail.rotation.set(-0.22, 0, -0.18);
      g.add(scarfNeck, scarfStripe, scarfTail);

      // Carrot nose, glossy coal eyes, smile pebbles & coat buttons
      const nose = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.13, 8), carrotMat);
      nose.rotation.x = Math.PI / 2;
      nose.position.set(0, 1.12, 0.23);
      g.add(nose);

      for (const ex of [-0.068, 0.068]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.021, 7, 7), coalMat);
        eye.position.set(ex, 1.175, 0.178);
        g.add(eye);
      }
      for (let m = -2; m <= 2; m++) {
        const smileDot = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), coalMat);
        smileDot.position.set(m * 0.028, 1.055 + Math.abs(m) * 0.008, 0.182 - Math.abs(m) * 0.007);
        g.add(smileDot);
      }
      for (const [by, bz] of [[0.82, 0.252], [0.71, 0.248], [0.42, 0.332]]) {
        const btn = new THREE.Mesh(new THREE.SphereGeometry(0.024, 7, 7), coalMat);
        btn.position.set(0, by, bz);
        g.add(btn);
      }

      // Classic Top Hat with red band
      const hatGroup = new THREE.Group();
      hatGroup.position.set(0.015, 1.285, 0);
      hatGroup.rotation.z = -0.1;
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.022, 16), hatMat);
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.142, 0.17, 14), hatMat);
      crown.position.y = 0.092;
      const hatBand = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.145, 0.036, 14), scarfRedMat);
      hatBand.position.y = 0.028;
      hatGroup.add(brim, crown, hatBand);
      g.add(hatGroup);

      // Twig arms + cozy red mittens
      for (const s of [-1, 1]) {
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.022, 0.34, 6), twigMat);
        arm.position.set(s * 0.33, 0.8, 0.02);
        arm.rotation.z = s * -1.05;
        const mitten = new THREE.Mesh(new THREE.SphereGeometry(0.044, 8, 7), scarfRedMat);
        mitten.scale.set(1.15, 0.88, 0.92);
        mitten.position.set(s * 0.46, 0.87, 0.04);
        g.add(arm, mitten);
      }
      break;
    }

    case 'xmas_gift_boxes': {
      // Trio of Santa gift boxes with crisp proud satin ribbons & 4-loop bows
      const addGiftBox = (
        w: number,
        h: number,
        d: number,
        px: number,
        py: number,
        pz: number,
        rotY: number,
        boxHex: string,
        ribbonHex: string,
      ) => {
        const bg = new THREE.Group();
        bg.position.set(px, py, pz);
        bg.rotation.y = rotY;
        const bMat = clayMat(boxHex, 0.56);
        const rMat = glossyClayMat(ribbonHex, 0.3);

        const body = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, 0.018), bMat);
        body.position.y = h * 0.5;
        const lid = new THREE.Mesh(new RoundedBoxGeometry(w + 0.024, 0.042, d + 0.024, 2, 0.014), bMat);
        lid.position.y = h - 0.01;
        // Ribbons lifted cleanly proud of body/lid walls (+0.008m clearance -> zero z-fighting!)
        const ribA = new THREE.Mesh(new RoundedBoxGeometry(0.044, h + 0.02, d + 0.036, 1, 0.008), rMat);
        ribA.position.y = h * 0.5 + 0.005;
        const ribB = new THREE.Mesh(new RoundedBoxGeometry(w + 0.036, h + 0.02, 0.044, 1, 0.008), rMat);
        ribB.position.y = h * 0.5 + 0.005;
        const bow = buildSculptedGiftBow(rMat, Math.max(0.75, w * 2.1));
        bow.position.y = h + 0.012;
        bg.add(body, lid, ribA, ribB, bow);
        g.add(bg);
      };

      addGiftBox(0.32, 0.24, 0.3, -0.1, 0, -0.05, 0.16, '#D9383A', '#F5C443');
      addGiftBox(0.24, 0.2, 0.24, 0.17, 0, 0.08, -0.28, '#237447', '#F8F9FA');
      addGiftBox(0.2, 0.15, 0.2, -0.08, 0.252, -0.04, 0.42, '#FFF5E1', '#D9383A');
      break;
    }

    case 'moon_lamp': {
      const goldMat = glossyClayMat(item.accentColor || '#D9A74A', 0.28);
      const baseFoot = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.036, 16), clayMat('#5E3A22', 0.65));
      baseFoot.position.y = 0.018;
      const crescent = new THREE.Mesh(
        new THREE.TorusGeometry(0.18, 0.016, 8, 22, Math.PI * 1.15),
        goldMat,
      );
      crescent.position.set(0, 0.23, 0);
      crescent.rotation.z = -Math.PI * 0.58;
      const moonTex = getMoonSurfaceTexture();
      const moonMat = new THREE.MeshStandardMaterial({
        map: moonTex,
        color: '#FFF6DC',
        emissive: '#FFE08A',
        emissiveIntensity: 0.85,
        roughness: 0.48,
      });
      const moonOrb = new THREE.Mesh(new THREE.SphereGeometry(0.135, 18, 14), moonMat);
      moonOrb.position.set(0, 0.24, 0);

      g.userData.lampShadeMat = moonMat;
      g.userData.lampLightLocalPos = [0, 0.3, 0.1];
      g.add(baseFoot, crescent, moonOrb);
      break;
    }

    case 'bonsai_zen': {
      // Sculpted Windswept / Semi-Cascade Bonsai ("Dáng Bạt Phong"): Stepped Tokoname pot, Suiseki rock, flared nebari roots, gnarled tapering S-trunk, exposed wood branches & layered Niwaki pine cloud pads
      const potMat = glossyClayMat('#394654', 0.42);
      const potRimMat = glossyClayMat('#55687A', 0.38);
      const soilMat = clayMat('#3B2A1E', 0.94);
      const mossMat = clayMat('#5AA44C', 0.88);
      const rockMat = clayMat('#6D7682', 0.86);
      const barkMat = clayMat('#633D24', 0.88);
      const shariMat = clayMat('#B89A78', 0.82);
      const pineDeepMat = clayMat('#2B663C', 0.76);
      const pineMidMat = clayMat(item.color || '#458F54', 0.72);
      const pineTopMat = clayMat('#63B36C', 0.66);

      // Stepped glazed stoneware rectangular pot with corner feet & lip rim
      const potBody = new THREE.Mesh(new RoundedBoxGeometry(0.52, 0.11, 0.36, 2, 0.02), potMat);
      potBody.position.y = 0.075;
      const potLip = new THREE.Mesh(new RoundedBoxGeometry(0.56, 0.024, 0.4, 2, 0.01), potRimMat);
      potLip.position.y = 0.132;
      const soilBed = new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.025, 0.3, 1, 0.008), soilMat);
      soilBed.position.y = 0.128;
      for (const [fx, fz] of [[-0.2, -0.12], [0.2, -0.12], [-0.2, 0.12], [0.2, 0.12]]) {
        const foot = new THREE.Mesh(new RoundedBoxGeometry(0.065, 0.032, 0.065, 1, 0.01), potMat);
        foot.position.set(fx, 0.016, fz);
        g.add(foot);
      }
      g.add(potBody, potLip, soilBed);

      // Rolling moss mounds & Suiseki accent rock
      const mossL = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), mossMat);
      mossL.scale.set(1.25, 0.24, 0.82);
      mossL.position.set(-0.06, 0.138, 0.01);
      const mossR = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), mossMat);
      mossR.scale.set(1.1, 0.2, 0.75);
      mossR.position.set(0.12, 0.136, -0.02);
      const rockMain = new THREE.Mesh(new THREE.DodecahedronGeometry(0.068, 0), rockMat);
      rockMain.scale.set(1.2, 0.85, 0.9);
      rockMain.position.set(0.13, 0.162, 0.04);
      rockMain.rotation.set(0.3, 0.6, 0.2);
      const rockSub = new THREE.Mesh(new THREE.DodecahedronGeometry(0.042, 0), rockMat);
      rockSub.position.set(-0.16, 0.155, -0.05);
      g.add(mossL, mossR, rockMain, rockSub);

      // Tapered gnarled S-curved trunk helper
      const upVec = new THREE.Vector3(0, 1, 0);
      const addTaperSeg = (p0: THREE.Vector3, p1: THREE.Vector3, r0: number, r1: number, mat: THREE.Material = barkMat) => {
        const dir = new THREE.Vector3().subVectors(p1, p0);
        const len = dir.length();
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, len, 8), mat);
        seg.position.addVectors(p0, p1).multiplyScalar(0.5);
        seg.quaternion.setFromUnitVectors(upVec, dir.normalize());
        const knot = new THREE.Mesh(new THREE.SphereGeometry(r1 * 1.04, 7, 6), mat);
        knot.position.copy(p1);
        g.add(seg, knot);
      };

      // Flared Nebari surface roots anchoring the tree into moss
      const rootBase = new THREE.Vector3(-0.07, 0.155, 0);
      [
        new THREE.Vector3(-0.16, 0.135, 0.06),
        new THREE.Vector3(-0.15, 0.135, -0.07),
        new THREE.Vector3(0.02, 0.135, 0.075),
        new THREE.Vector3(0.01, 0.135, -0.06),
      ].forEach((rEnd) => addTaperSeg(rootBase, rEnd, 0.026, 0.008));

      // Main gnarled Windswept S-curve trunk (clear taper from r=0.056 base -> r=0.016 apex!)
      const trunkPts: [THREE.Vector3, number][] = [
        [new THREE.Vector3(-0.07, 0.138, 0), 0.056],
        [new THREE.Vector3(-0.1, 0.215, 0.015), 0.046],
        [new THREE.Vector3(-0.05, 0.29, 0.025), 0.038],
        [new THREE.Vector3(0.04, 0.355, -0.01), 0.031],
        [new THREE.Vector3(0.11, 0.415, -0.025), 0.025],
        [new THREE.Vector3(0.05, 0.485, 0.005), 0.02],
        [new THREE.Vector3(0.09, 0.54, 0.01), 0.015],
      ];
      for (let i = 0; i < trunkPts.length - 1; i++) {
        addTaperSeg(trunkPts[i][0], trunkPts[i + 1][0], trunkPts[i][1], trunkPts[i + 1][1]);
      }
      // Subtle pale carved shari deadwood highlight along the primary bend
      addTaperSeg(
        new THREE.Vector3(-0.06, 0.23, 0.042),
        new THREE.Vector3(0.03, 0.34, 0.018),
        0.011,
        0.006,
        shariMat,
      );

      // Visible secondary woody branches reaching out to each Niwaki cloud pad
      const brLeft = new THREE.Vector3(-0.18, 0.33, 0.03);
      addTaperSeg(trunkPts[2][0], brLeft, 0.02, 0.01);
      const brRightLow = new THREE.Vector3(0.24, 0.36, -0.01);
      addTaperSeg(trunkPts[3][0], brRightLow, 0.021, 0.01);
      const brRightMid = new THREE.Vector3(0.22, 0.44, 0.02);
      addTaperSeg(trunkPts[4][0], brRightMid, 0.017, 0.009);
      const brApex = new THREE.Vector3(0.08, 0.56, 0.0);
      addTaperSeg(trunkPts[6][0], brApex, 0.014, 0.008);

      // Multi-puff layered flat-bottom Niwaki pine foliage cloud pads (with crisp negative space showing trunk & branches!)
      const addFoliageCloudPad = (cx: number, cy: number, cz: number, sx: number, sy: number, sz: number) => {
        const pad = new THREE.Group();
        pad.position.set(cx, cy, cz);
        const puffs: [number, number, number, number, number][] = [
          [0, 0, 0, 1.0, 0],
          [-0.45, -0.08, 0.12, 0.72, 0],
          [0.46, -0.06, -0.1, 0.74, 1],
          [0.08, 0.14, 0.15, 0.68, 2],
          [-0.22, 0.12, -0.18, 0.64, 1],
          [0.24, 0.18, 0.02, 0.56, 2],
        ];
        puffs.forEach(([ox, oy, oz, rad, layer]) => {
          const mat = layer === 0 ? pineDeepMat : layer === 1 ? pineMidMat : pineTopMat;
          const m = new THREE.Mesh(new THREE.SphereGeometry(0.088 * rad, 10, 8), mat);
          m.scale.set(sx * 1.15, sy * 0.46, sz * 1.05);
          m.position.set(ox * sx * 0.09, oy * sy * 0.08, oz * sz * 0.09);
          pad.add(m);
        });
        g.add(pad);
      };

      addFoliageCloudPad(-0.2, 0.355, 0.035, 1.15, 0.9, 1.05);
      addFoliageCloudPad(0.26, 0.375, -0.01, 1.25, 0.85, 1.1);
      addFoliageCloudPad(0.21, 0.465, 0.025, 1.05, 0.85, 0.95);
      addFoliageCloudPad(0.075, 0.58, 0.005, 1.32, 0.98, 1.12);
      break;
    }

    case 'vinyl_corner': {
      const walnutMat = clayMat(item.color || '#8D5836', 0.62);
      const deckMat = clayMat('#F2E9DC', 0.48);
      const goldMat = glossyClayMat('#E8C366', 0.25);

      const plinth = new THREE.Mesh(new RoundedBoxGeometry(0.68, 0.14, 0.52, 2, 0.025), walnutMat);
      plinth.position.y = 0.07;
      const topPlate = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.024, 0.46, 2, 0.01), deckMat);
      topPlate.position.y = 0.148;

      const discGroup = new THREE.Group();
      discGroup.position.set(-0.07, 0.168, 0);
      const record = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 0.012, 24),
        glossyClayMat('#1E222A', 0.2),
      );
      const label = new THREE.Mesh(
        new THREE.CylinderGeometry(0.062, 0.062, 0.015, 16),
        clayMat(item.accentColor || '#E57A6B', 0.48),
      );
      const spindle = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.028, 8), goldMat);
      spindle.position.y = 0.01;
      discGroup.add(record, label, spindle);

      // Tonearm
      const armBase = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, 0.036, 10), goldMat);
      armBase.position.set(0.2, 0.175, -0.14);
      const armBar = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.24, 6), goldMat);
      armBar.rotation.x = Math.PI / 2;
      armBar.rotation.z = 0.34;
      armBar.position.set(0.16, 0.19, -0.02);

      // Volume knobs on right corner
      for (const kz of [0.1, 0.16]) {
        const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.022, 10), goldMat);
        knob.position.set(0.22, 0.168, kz);
        g.add(knob);
      }

      g.userData.vinylDisc = discGroup;
      g.add(plinth, topPlate, discGroup, armBase, armBar);
      break;
    }

    case 'white_desk': {
      // Scandinavian White Wooden Study Desk (surfaceHeight = 0.78m, 1.72m W x 0.94m D)
      const whiteWoodMat = clayMat(item.color || '#FAF8F4', 0.44);
      const trimWhiteMat = clayMat(item.accentColor || '#DFD4C2', 0.52);
      const brassKnobMat = glossyClayMat('#DFBE73', 0.24);

      const tabletop = new THREE.Mesh(
        new RoundedBoxGeometry(1.72, 0.065, 0.94, 3, 0.028),
        whiteWoodMat,
      );
      tabletop.position.y = 0.748;

      // Under-desk apron & drawer cabinet block on left/center + open cubby on right
      const drawerBox = new THREE.Mesh(
        new RoundedBoxGeometry(1.04, 0.145, 0.86, 2, 0.02),
        whiteWoodMat,
      );
      drawerBox.position.set(-0.28, 0.648, 0);

      const cubbyTop = new THREE.Mesh(
        new RoundedBoxGeometry(0.54, 0.028, 0.86, 2, 0.01),
        whiteWoodMat,
      );
      cubbyTop.position.set(0.52, 0.585, 0);
      const cubbyDivider = new THREE.Mesh(
        new RoundedBoxGeometry(0.032, 0.14, 0.84, 2, 0.01),
        trimWhiteMat,
      );
      cubbyDivider.position.set(0.25, 0.648, 0);

      // Two crisp recessed white drawers facing +Z with dainty brass knobs
      [-0.54, -0.02].forEach((dx) => {
        const face = new THREE.Mesh(
          new RoundedBoxGeometry(0.46, 0.105, 0.028, 2, 0.012),
          trimWhiteMat,
        );
        face.position.set(dx, 0.648, 0.432);
        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), brassKnobMat);
        knob.position.set(dx, 0.648, 0.456);
        g.add(face, knob);
      });

      // Slender tapered white wooden legs with slight Nordic outward splay & brass foot tips
      [
        [-0.76, -0.37, -0.06, -0.05],
        [0.76, -0.37, 0.06, -0.05],
        [-0.76, 0.37, -0.06, 0.05],
        [0.76, 0.37, 0.06, 0.05],
      ].forEach(([lx, lz, sx, sz]) => {
        const leg = new THREE.Mesh(
          new THREE.CylinderGeometry(0.034, 0.024, 0.72, 10),
          whiteWoodMat,
        );
        leg.position.set(lx, 0.36, lz);
        leg.rotation.z = -sx * 0.9;
        leg.rotation.x = sz * 0.9;
        const footCap = new THREE.Mesh(
          new THREE.CylinderGeometry(0.025, 0.023, 0.045, 10),
          brassKnobMat,
        );
        footCap.position.set(lx + sx * 0.42, 0.022, lz + sz * 0.42);
        footCap.rotation.z = -sx * 0.9;
        footCap.rotation.x = sz * 0.9;
        g.add(leg, footCap);
      });

      g.add(tabletop, drawerBox, cubbyTop, cubbyDivider);
      break;
    }

    case 'white_study_chair': {
      // Cozy White Ergonomic Study Chair (seat cushion top = 0.50m, facing +Z)
      const whiteFrameMat = clayMat(item.color || '#FAF8F4', 0.44);
      const cushionMat = clayMat(item.accentColor || '#EADFD1', 0.76);
      const brassFerruleMat = glossyClayMat('#DFBE73', 0.25);

      const seatShell = new THREE.Mesh(
        new RoundedBoxGeometry(0.54, 0.065, 0.52, 3, 0.028),
        whiteFrameMat,
      );
      seatShell.position.y = 0.44;
      const seatPad = new THREE.Mesh(
        new RoundedBoxGeometry(0.48, 0.055, 0.46, 3, 0.024),
        cushionMat,
      );
      seatPad.position.set(0, 0.478, 0.01);

      // Curved wrap-around white wooden backrest & upholstered lumbar pad
      const backCurve = new THREE.Mesh(
        new RoundedBoxGeometry(0.54, 0.24, 0.058, 3, 0.025),
        whiteFrameMat,
      );
      backCurve.position.set(0, 0.84, -0.22);
      const backPad = new THREE.Mesh(
        new RoundedBoxGeometry(0.44, 0.17, 0.045, 3, 0.018),
        cushionMat,
      );
      backPad.position.set(0, 0.84, -0.195);

      // Backrest support posts + side curved rails
      [-0.2, 0.2].forEach((bx) => {
        const post = new THREE.Mesh(
          new THREE.CylinderGeometry(0.024, 0.028, 0.42, 10),
          whiteFrameMat,
        );
        post.position.set(bx, 0.64, -0.22);
        post.rotation.x = -0.06;
        g.add(post);
      });

      // Tapered splayed white legs with brass caps + cross stretcher
      [
        [-0.21, -0.19, -0.06, -0.06],
        [0.21, -0.19, 0.06, -0.06],
        [-0.21, 0.19, -0.06, 0.06],
        [0.21, 0.19, 0.06, 0.06],
      ].forEach(([lx, lz, sx, sz]) => {
        const leg = new THREE.Mesh(
          new THREE.CylinderGeometry(0.028, 0.02, 0.43, 10),
          whiteFrameMat,
        );
        leg.position.set(lx, 0.215, lz);
        leg.rotation.z = -sx;
        leg.rotation.x = sz;
        const ferrule = new THREE.Mesh(
          new THREE.CylinderGeometry(0.021, 0.019, 0.04, 10),
          brassFerruleMat,
        );
        ferrule.position.set(lx + sx * 0.2, 0.02, lz + sz * 0.2);
        g.add(leg, ferrule);
      });

      const stretcherX = new THREE.Mesh(
        new THREE.CylinderGeometry(0.016, 0.016, 0.42, 8),
        whiteFrameMat,
      );
      stretcherX.rotation.z = Math.PI / 2;
      stretcherX.position.set(0, 0.18, 0);

      g.add(seatShell, seatPad, backCurve, backPad, stretcherX);
      break;
    }

    case 'office_swivel_chair': {
      // Static Decorative Ergonomic Office Swivel Chair (seat top = 0.50m, 5-star caster base, armrests, headrest)
      const shellMat = clayMat(item.color || '#F4F6F9', 0.46);
      const cushionMat = clayMat(item.accentColor || '#7CB8CC', 0.72);
      const chromeMat = glossyClayMat('#D6DEE6', 0.16);
      const wheelMat = clayMat('#2B333D', 0.65);

      // 5-star base hub & 5 caster wheel arms touching y = 0
      const centerHub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.068, 0.05, 14),
        chromeMat,
      );
      centerHub.position.y = 0.085;
      const piston = new THREE.Mesh(
        new THREE.CylinderGeometry(0.032, 0.036, 0.34, 12),
        chromeMat,
      );
      piston.position.y = 0.25;
      const underPlate = new THREE.Mesh(
        new RoundedBoxGeometry(0.24, 0.045, 0.24, 2, 0.015),
        wheelMat,
      );
      underPlate.position.y = 0.41;

      for (let i = 0; i < 5; i++) {
        const ang = (i / 5) * Math.PI * 2 + 0.3;
        const arm = new THREE.Mesh(new RoundedBoxGeometry(0.045, 0.036, 0.28, 2, 0.012), chromeMat);
        arm.position.set(Math.sin(ang) * 0.145, 0.068, Math.cos(ang) * 0.145);
        arm.rotation.y = ang;
        arm.rotation.x = 0.08;
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.03, 8), chromeMat);
        stem.position.set(Math.sin(ang) * 0.26, 0.044, Math.cos(ang) * 0.26);
        const caster = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.034, 12), wheelMat);
        caster.rotation.z = Math.PI / 2;
        caster.rotation.y = ang;
        caster.position.set(Math.sin(ang) * 0.26, 0.025, Math.cos(ang) * 0.26);
        g.add(arm, stem, caster);
      }

      // Contoured thick cushioned seat (top = 0.505m)
      const seatRim = new THREE.Mesh(
        new RoundedBoxGeometry(0.56, 0.05, 0.54, 3, 0.022),
        shellMat,
      );
      seatRim.position.y = 0.445;
      const seatCushion = new THREE.Mesh(
        new RoundedBoxGeometry(0.5, 0.065, 0.48, 3, 0.028),
        cushionMat,
      );
      seatCushion.position.set(0, 0.476, 0.01);

      // Padded armrests on left & right
      [-0.275, 0.275].forEach((ax) => {
        const support = new THREE.Mesh(
          new RoundedBoxGeometry(0.035, 0.21, 0.045, 2, 0.012),
          shellMat,
        );
        support.position.set(ax, 0.56, 0.0);
        const armPad = new THREE.Mesh(
          new RoundedBoxGeometry(0.072, 0.042, 0.3, 3, 0.018),
          cushionMat,
        );
        armPad.position.set(ax, 0.67, 0.02);
        g.add(support, armPad);
      });

      // High ergonomic backrest + lumbar pillow + headrest
      const spineBar = new THREE.Mesh(
        new RoundedBoxGeometry(0.11, 0.46, 0.048, 2, 0.016),
        shellMat,
      );
      spineBar.position.set(0, 0.68, -0.25);
      const backFrame = new THREE.Mesh(
        new RoundedBoxGeometry(0.5, 0.52, 0.055, 3, 0.024),
        shellMat,
      );
      backFrame.position.set(0, 0.79, -0.225);
      backFrame.rotation.x = -0.05;
      const backPad = new THREE.Mesh(
        new RoundedBoxGeometry(0.43, 0.45, 0.05, 3, 0.022),
        cushionMat,
      );
      backPad.position.set(0, 0.79, -0.195);
      backPad.rotation.x = -0.05;

      const lumbar = new THREE.Mesh(
        new RoundedBoxGeometry(0.34, 0.13, 0.055, 3, 0.025),
        shellMat,
      );
      lumbar.position.set(0, 0.63, -0.165);

      const headNeck = new THREE.Mesh(
        new RoundedBoxGeometry(0.08, 0.08, 0.036, 2, 0.01),
        chromeMat,
      );
      headNeck.position.set(0, 1.07, -0.235);
      const headrest = new THREE.Mesh(
        new RoundedBoxGeometry(0.32, 0.15, 0.072, 3, 0.03),
        cushionMat,
      );
      headrest.position.set(0, 1.15, -0.215);
      headrest.rotation.x = 0.08;

      g.add(
        centerHub,
        piston,
        underPlate,
        seatRim,
        seatCushion,
        spineBar,
        backFrame,
        backPad,
        lumbar,
        headNeck,
        headrest,
      );
      break;
    }

    case 'study_laptop': {
      // Sleek Pastel Ultrabook Laptop open at 112°
      const aluMat = glossyClayMat(item.color || '#E6EBF2', 0.24);
      const keyMat = clayMat('#2D3644', 0.58);
      const trackMat = clayMat('#D3DBE6', 0.32);
      const screenTex = getStudyScreenTexture('laptop');
      const screenMat = new THREE.MeshStandardMaterial({
        map: screenTex,
        emissive: '#FFFFFF',
        emissiveMap: screenTex,
        emissiveIntensity: 0.34,
        roughness: 0.22,
      });

      const base = new THREE.Mesh(new RoundedBoxGeometry(0.36, 0.016, 0.24, 2, 0.006), aluMat);
      base.position.y = 0.008;

      const keyWell = new THREE.Mesh(new RoundedBoxGeometry(0.31, 0.006, 0.115, 1, 0.002), keyMat);
      keyWell.position.set(0, 0.0155, -0.035);

      const trackpad = new THREE.Mesh(
        new RoundedBoxGeometry(0.11, 0.004, 0.068, 1, 0.002),
        trackMat,
      );
      trackpad.position.set(0, 0.016, 0.066);

      // Hinged display lid tilted gracefully open
      const lidPivot = new THREE.Group();
      lidPivot.position.set(0, 0.016, -0.115);
      lidPivot.rotation.x = -0.34;

      const lidBack = new THREE.Mesh(new RoundedBoxGeometry(0.36, 0.23, 0.01, 2, 0.004), aluMat);
      lidBack.position.set(0, 0.115, 0);

      const screenBezel = new THREE.Mesh(
        new RoundedBoxGeometry(0.34, 0.21, 0.006, 1, 0.002),
        keyMat,
      );
      screenBezel.position.set(0, 0.115, 0.005);

      const screenPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.315, 0.188), screenMat);
      screenPlane.position.set(0, 0.116, 0.0095);

      // Cute pastel star logo on back of lid
      const logoDot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.016, 0.016, 0.004, 12),
        glossyClayMat(item.accentColor || '#8ED8F8', 0.2),
      );
      logoDot.rotation.x = Math.PI / 2;
      logoDot.position.set(0, 0.125, -0.006);

      lidPivot.add(lidBack, screenBezel, screenPlane, logoDot);
      g.add(base, keyWell, trackpad, lidPivot);
      break;
    }

    case 'desktop_pc_set': {
      // Aesthetic Complete Desktop PC Setup: Desk Mat + Widescreen Monitor + Mechanical Keyboard + Mouse + Pastel RGB PC Tower
      const caseWhiteMat = clayMat(item.color || '#F4F6FA', 0.36);
      const accentMat = clayMat(item.accentColor || '#7ED4F7', 0.42);
      const darkTrimMat = clayMat('#2B3442', 0.52);
      const metalStandMat = glossyClayMat('#C9D2DC', 0.2);
      const matFabricMat = clayMat('#DCE6F2', 0.85);
      const pinkKeyMat = clayMat('#F4A6BE', 0.5);
      const screenTex = getStudyScreenTexture('desktop');
      const screenMat = new THREE.MeshStandardMaterial({
        map: screenTex,
        emissive: '#FFFFFF',
        emissiveMap: screenTex,
        emissiveIntensity: 0.36,
        roughness: 0.2,
      });
      const rgbGlowMat = new THREE.MeshStandardMaterial({
        color: '#8BE9FD',
        emissive: '#7FD8FF',
        emissiveIntensity: 0.72,
        roughness: 0.3,
      });
      const rgbPinkMat = new THREE.MeshStandardMaterial({
        color: '#FFB3C9',
        emissive: '#FF8FB3',
        emissiveIntensity: 0.65,
        roughness: 0.3,
      });

      // Soft wide desk mat
      const deskMat = new THREE.Mesh(
        new RoundedBoxGeometry(0.96, 0.008, 0.42, 2, 0.004),
        matFabricMat,
      );
      deskMat.position.set(-0.02, 0.004, 0.02);

      // (1) Widescreen Monitor on the left-center (-0.15, -0.09)
      const monBase = new THREE.Mesh(
        new RoundedBoxGeometry(0.24, 0.014, 0.14, 2, 0.006),
        metalStandMat,
      );
      monBase.position.set(-0.15, 0.015, -0.1);
      const monNeck = new THREE.Mesh(
        new RoundedBoxGeometry(0.048, 0.16, 0.032, 2, 0.008),
        metalStandMat,
      );
      monNeck.position.set(-0.15, 0.095, -0.13);
      monNeck.rotation.x = -0.08;

      const monFrame = new THREE.Mesh(
        new RoundedBoxGeometry(0.58, 0.34, 0.024, 2, 0.01),
        caseWhiteMat,
      );
      monFrame.position.set(-0.15, 0.31, -0.09);
      const monInner = new THREE.Mesh(
        new RoundedBoxGeometry(0.55, 0.31, 0.008, 1, 0.004),
        darkTrimMat,
      );
      monInner.position.set(-0.15, 0.31, -0.078);
      const monScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.53, 0.292), screenMat);
      monScreen.position.set(-0.15, 0.312, -0.072);
      // Tiny chin status LED
      const monLed = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.005, 0.005), rgbGlowMat);
      monLed.position.set(-0.15, 0.148, -0.076);

      // (2) Compact 75% Pastel Mechanical Keyboard (-0.17, 0.11)
      const kbBody = new THREE.Mesh(
        new RoundedBoxGeometry(0.34, 0.02, 0.125, 2, 0.006),
        caseWhiteMat,
      );
      kbBody.position.set(-0.17, 0.018, 0.11);
      kbBody.rotation.x = 0.06;

      // Keycap clusters (Esc pink, main white, accent sky spacebar/arrows)
      const keyBlockMain = new THREE.Mesh(
        new RoundedBoxGeometry(0.28, 0.012, 0.088, 1, 0.003),
        clayMat('#FFFFFF', 0.45),
      );
      keyBlockMain.position.set(-0.175, 0.029, 0.105);
      keyBlockMain.rotation.x = 0.06;

      const escKey = new THREE.Mesh(
        new RoundedBoxGeometry(0.024, 0.014, 0.022, 1, 0.003),
        pinkKeyMat,
      );
      escKey.position.set(-0.31, 0.03, 0.068);
      const spaceBar = new THREE.Mesh(
        new RoundedBoxGeometry(0.11, 0.013, 0.02, 1, 0.003),
        accentMat,
      );
      spaceBar.position.set(-0.18, 0.029, 0.152);

      // (3) Ergonomic Wireless Mouse (0.11, 0.12)
      const mouseShell = new THREE.Mesh(
        new RoundedBoxGeometry(0.056, 0.028, 0.092, 3, 0.014),
        caseWhiteMat,
      );
      mouseShell.position.set(0.11, 0.022, 0.115);
      const scrollWheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.008, 0.008, 0.01, 10),
        pinkKeyMat,
      );
      scrollWheel.rotation.z = Math.PI / 2;
      scrollWheel.position.set(0.11, 0.036, 0.088);

      // (4) Pastel White Tempered-Glass PC Tower (CPU Case) on the right (0.35, -0.01)
      const towerX = 0.35;
      const towerZ = -0.01;
      for (const [fx, fz] of [
        [-0.075, -0.14],
        [0.075, -0.14],
        [-0.075, 0.14],
        [0.075, 0.14],
      ]) {
        const foot = new THREE.Mesh(
          new THREE.CylinderGeometry(0.018, 0.016, 0.022, 10),
          metalStandMat,
        );
        foot.position.set(towerX + fx, 0.019, towerZ + fz);
        g.add(foot);
      }

      const pcBody = new THREE.Mesh(
        new RoundedBoxGeometry(0.2, 0.42, 0.36, 3, 0.016),
        caseWhiteMat,
      );
      pcBody.position.set(towerX, 0.238, towerZ);

      // Dark interior chamber visible through left-facing side window (-X facing the monitor)
      const interiorBack = new THREE.Mesh(
        new RoundedBoxGeometry(0.02, 0.34, 0.28, 1, 0.004),
        darkTrimMat,
      );
      interiorBack.position.set(towerX - 0.088, 0.24, towerZ);

      // Glowing pastel RGB fans + horizontal GPU bar inside CPU case
      [0.32, 0.18].forEach((fy, fi) => {
        const fanRing = new THREE.Mesh(
          new THREE.TorusGeometry(0.044, 0.008, 8, 16),
          fi === 0 ? rgbGlowMat : rgbPinkMat,
        );
        fanRing.rotation.y = Math.PI / 2;
        fanRing.position.set(towerX - 0.098, fy, towerZ - 0.06);
        g.add(fanRing);
      });
      const gpuBar = new THREE.Mesh(
        new RoundedBoxGeometry(0.024, 0.032, 0.18, 1, 0.006),
        rgbGlowMat,
      );
      gpuBar.position.set(towerX - 0.095, 0.22, towerZ + 0.03);

      // Clear tempered glass cover slightly proud on -X side
      const glassPanel = new THREE.Mesh(
        new THREE.BoxGeometry(0.006, 0.35, 0.29),
        new THREE.MeshStandardMaterial({
          color: '#DDF4FF',
          roughness: 0.08,
          metalness: 0.15,
          transparent: true,
          opacity: 0.32,
        }),
      );
      glassPanel.position.set(towerX - 0.103, 0.24, towerZ);

      // Front mesh intake + 2 glowing front intake rings facing +Z
      const frontMesh = new THREE.Mesh(
        new RoundedBoxGeometry(0.15, 0.34, 0.014, 2, 0.006),
        clayMat('#DCE3EC', 0.6),
      );
      frontMesh.position.set(towerX, 0.238, towerZ + 0.178);
      [0.31, 0.17].forEach((fy, fi) => {
        const frontFan = new THREE.Mesh(
          new THREE.TorusGeometry(0.045, 0.007, 8, 16),
          fi === 0 ? rgbGlowMat : rgbPinkMat,
        );
        frontFan.position.set(towerX, fy, towerZ + 0.186);
        g.add(frontFan);
      });

      // Top power button + subtle top dust filter
      const powerBtn = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, 0.01, 10),
        rgbGlowMat,
      );
      powerBtn.position.set(towerX + 0.045, 0.45, towerZ + 0.12);

      g.add(
        deskMat,
        monBase,
        monNeck,
        monFrame,
        monInner,
        monScreen,
        monLed,
        kbBody,
        keyBlockMain,
        escKey,
        spaceBar,
        mouseShell,
        scrollWheel,
        pcBody,
        interiorBack,
        gpuBar,
        glassPanel,
        frontMesh,
        powerBtn,
      );
      break;
    }

    case 'wall_pinboard': {
      // Cute Cork Wall Pinboard with colorful 3D sticky notes, polaroids, twine & pushpins
      const cy = item.mountHeight ?? 1.88;
      const frameMat = clayMat(item.color || '#DFB684', 0.56);
      const corkMat = new THREE.MeshStandardMaterial({map: getPinboardTexture(), roughness: 0.86});
      const pinRedMat = glossyClayMat('#E85D68', 0.25);
      const pinSkyMat = glossyClayMat('#5FAEE3', 0.25);
      const pinGoldMat = glossyClayMat('#F4C44E', 0.25);

      const boardW = 1.16;
      const boardH = 0.76;
      const backBoard = new THREE.Mesh(
        new RoundedBoxGeometry(boardW, boardH, 0.028, 2, 0.01),
        frameMat,
      );
      backBoard.position.set(0, cy, 0.014);

      const corkFace = new THREE.Mesh(new THREE.PlaneGeometry(boardW - 0.1, boardH - 0.1), corkMat);
      corkFace.position.set(0, cy, 0.032);

      // Raised wooden perimeter frame bars (zero z-fighting!)
      const topFrame = new THREE.Mesh(new RoundedBoxGeometry(boardW + 0.04, 0.055, 0.046, 2, 0.012), frameMat);
      topFrame.position.set(0, cy + boardH / 2 - 0.015, 0.024);
      const botFrame = new THREE.Mesh(new RoundedBoxGeometry(boardW + 0.04, 0.055, 0.046, 2, 0.012), frameMat);
      botFrame.position.set(0, cy - boardH / 2 + 0.015, 0.024);
      [-boardW / 2 + 0.015, boardW / 2 - 0.015].forEach((fx) => {
        const sideBar = new THREE.Mesh(
          new RoundedBoxGeometry(0.055, boardH + 0.02, 0.046, 2, 0.012),
          frameMat,
        );
        sideBar.position.set(fx, cy, 0.024);
        g.add(sideBar);
      });

      // Colorful 3D pinned sticky notes & mini polaroid cards protruding cleanly at z = 0.039..0.046
      const addStickyNote = (
        nx: number,
        ny: number,
        w: number,
        h: number,
        rotZ: number,
        hex: string,
        pinMat: THREE.Material,
        isPolaroid = false,
      ) => {
        const ng = new THREE.Group();
        ng.position.set(nx, cy + ny, 0.039);
        ng.rotation.z = rotZ;

        const sheet = new THREE.Mesh(
          new THREE.BoxGeometry(w, h, 0.006),
          clayMat(hex, 0.72),
        );
        ng.add(sheet);

        if (isPolaroid) {
          const photo = new THREE.Mesh(
            new THREE.BoxGeometry(w * 0.82, h * 0.65, 0.004),
            clayMat('#8BD3F5', 0.48),
          );
          photo.position.set(0, h * 0.08, 0.004);
          const sun = new THREE.Mesh(
            new THREE.CircleGeometry(w * 0.14, 12),
            clayMat('#FFE066', 0.5),
          );
          sun.position.set(w * 0.16, h * 0.18, 0.007);
          ng.add(photo, sun);
        } else {
          // Handwritten lines on sticky note
          const lineMat = clayMat('#8A7665', 0.8);
          for (let l = 0; l < 3; l++) {
            const line = new THREE.Mesh(
              new THREE.BoxGeometry(w * (0.64 - l * 0.1), 0.008, 0.003),
              lineMat,
            );
            line.position.set(-w * 0.06, h * 0.14 - l * 0.032, 0.004);
            ng.add(line);
          }
        }

        const pinHead = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 8), pinMat);
        pinHead.position.set(0, h * 0.36, 0.014);
        ng.add(pinHead);
        g.add(ng);
      };

      addStickyNote(-0.36, 0.14, 0.19, 0.19, 0.09, '#FFF29E', pinRedMat);
      addStickyNote(-0.14, -0.09, 0.18, 0.18, -0.07, '#FFB8CC', pinSkyMat);
      addStickyNote(0.14, -0.06, 0.2, 0.23, 0.06, '#FFFFFF', pinGoldMat, true);
      addStickyNote(0.37, 0.13, 0.18, 0.18, -0.1, '#B8EBD0', pinRedMat);
      addStickyNote(0.36, -0.13, 0.17, 0.16, 0.08, '#BDE4FF', pinGoldMat);
      addStickyNote(-0.36, -0.14, 0.21, 0.14, -0.04, '#FFE2AD', pinSkyMat);

      g.add(backBoard, corkFace, topFrame, botFrame);
      break;
    }

    case 'study_desk_lamp': {
      // Articulated Pastel-Mint & Brass Gooseneck Study Desk Lamp (toggleable via 'lamp' interactive)
      const baseMat = clayMat(item.accentColor || '#8AC4B4', 0.44);
      const brassMat = glossyClayMat('#DFBE73', 0.24);
      const shadeMat = new THREE.MeshStandardMaterial({
        color: item.color || '#FFF2BF',
        emissive: '#FFD670',
        emissiveIntensity: 0.72,
        roughness: 0.38,
      });

      const baseDisc = new THREE.Mesh(
        new THREE.CylinderGeometry(0.105, 0.12, 0.032, 18),
        baseMat,
      );
      baseDisc.position.set(0, 0.016, -0.02);
      const switchBtn = new THREE.Mesh(
        new THREE.CylinderGeometry(0.016, 0.016, 0.014, 10),
        clayMat('#F48FB1', 0.45),
      );
      switchBtn.position.set(0.045, 0.036, 0.03);

      // Lower angled arm & upper forward arm
      const lowerArm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.014, 0.24, 10),
        brassMat,
      );
      lowerArm.position.set(0, 0.135, -0.055);
      lowerArm.rotation.x = -0.32;

      const joint = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 10), brassMat);
      joint.position.set(0, 0.245, -0.092);

      const upperArm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.011, 0.012, 0.22, 10),
        brassMat,
      );
      upperArm.position.set(0, 0.32, -0.018);
      upperArm.rotation.x = 0.74;

      // Pastel dome shade + warm inner glowing bulb
      const shadePivot = new THREE.Group();
      shadePivot.position.set(0, 0.375, 0.068);
      shadePivot.rotation.x = 0.38;

      const shadeCap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.052, 0.04, 14),
        brassMat,
      );
      shadeCap.position.y = 0.06;
      const shadeCone = new THREE.Mesh(
        new THREE.CylinderGeometry(0.052, 0.11, 0.115, 18),
        baseMat,
      );
      shadeCone.position.y = -0.005;
      const bulbGlow = new THREE.Mesh(
        new THREE.SphereGeometry(0.046, 12, 10),
        shadeMat,
      );
      bulbGlow.position.y = -0.052;
      shadePivot.add(shadeCap, shadeCone, bulbGlow);

      g.userData.lampShadeMat = shadeMat;
      g.userData.lampLightLocalPos = [0, 0.34, 0.09];
      g.add(baseDisc, switchBtn, lowerArm, joint, upperArm, shadePivot);
      break;
    }

    case 'pen_holder': {
      // Cute Ribbed Pastel Ceramic Cup filled with Pencils, Pens & Wooden Ruler
      const cupMat = glossyClayMat(item.color || '#9FD4C0', 0.28);
      const rimMat = clayMat('#FFF8EE', 0.44);
      const woodMat = clayMat('#E5BE8A', 0.65);

      const cupBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.058, 0.052, 0.135, 16),
        cupMat,
      );
      cupBody.position.y = 0.068;
      const cupRim = new THREE.Mesh(
        new THREE.TorusGeometry(0.056, 0.008, 8, 18),
        rimMat,
      );
      cupRim.rotation.x = Math.PI / 2;
      cupRim.position.y = 0.136;

      // Cute pencils & pens poking out at playful angles
      const pens: Array<[number, number, number, number, string, boolean]> = [
        [-0.02, 0.01, 0.16, -0.18, '#F4A261', true],
        [0.018, -0.012, -0.14, 0.12, '#79B6E8', true],
        [0.005, 0.02, 0.11, 0.15, '#F28BA8', false],
        [-0.016, -0.018, -0.09, -0.14, '#A8D88A', true],
      ];
      pens.forEach(([px, pz, rx, rz, hex, isPencil]) => {
        const pg = new THREE.Group();
        pg.position.set(px, 0.12, pz);
        pg.rotation.set(rx, 0, rz);
        const shaft = new THREE.Mesh(
          new THREE.CylinderGeometry(0.0075, 0.0075, 0.15, 8),
          clayMat(hex, 0.48),
        );
        shaft.position.y = 0.04;
        pg.add(shaft);
        if (isPencil) {
          const tip = new THREE.Mesh(new THREE.ConeGeometry(0.0075, 0.022, 8), woodMat);
          tip.position.y = 0.125;
          pg.add(tip);
        } else {
          const cap = new THREE.Mesh(
            new THREE.CylinderGeometry(0.0085, 0.0085, 0.032, 8),
            clayMat('#FFFFFF', 0.4),
          );
          cap.position.y = 0.115;
          pg.add(cap);
        }
        g.add(pg);
      });

      // Tiny wooden ruler leaning out
      const ruler = new THREE.Mesh(
        new RoundedBoxGeometry(0.024, 0.175, 0.005, 1, 0.002),
        woodMat,
      );
      ruler.position.set(0.024, 0.15, -0.015);
      ruler.rotation.z = -0.18;
      ruler.rotation.y = 0.4;

      g.add(cupBody, cupRim, ruler);
      break;
    }

    case 'art_supply_rack': {
      // Desktop Mini 2-Tier Art Caddy with Paint Tubes, Brush Cup, Palette & Sketchpad
      const rackWoodMat = clayMat(item.color || '#E8C597', 0.62);
      const accentMat = clayMat(item.accentColor || '#E76F51', 0.5);
      const creamMat = clayMat('#FFF8EE', 0.52);

      // Mini 2-tier wooden rack frame
      const baseShelf = new THREE.Mesh(
        new RoundedBoxGeometry(0.32, 0.018, 0.18, 2, 0.006),
        rackWoodMat,
      );
      baseShelf.position.y = 0.012;
      const midShelf = new THREE.Mesh(
        new RoundedBoxGeometry(0.32, 0.016, 0.15, 2, 0.005),
        rackWoodMat,
      );
      midShelf.position.set(0, 0.105, -0.015);
      const backBoard = new THREE.Mesh(
        new RoundedBoxGeometry(0.32, 0.16, 0.016, 2, 0.006),
        rackWoodMat,
      );
      backBoard.position.set(0, 0.088, -0.085);
      [-0.152, 0.152].forEach((sx) => {
        const sideWall = new THREE.Mesh(
          new RoundedBoxGeometry(0.016, 0.16, 0.175, 2, 0.006),
          rackWoodMat,
        );
        sideWall.position.set(sx, 0.088, 0);
        g.add(sideWall);
      });

      // Paint tubes lying neatly on lower tier
      ['#E76F51', '#F4C44E', '#5FAEE3', '#75C3A5'].forEach((hex, idx) => {
        const tube = new THREE.Mesh(
          new THREE.CylinderGeometry(0.013, 0.015, 0.075, 10),
          clayMat(hex, 0.45),
        );
        tube.rotation.x = Math.PI / 2;
        tube.position.set(-0.095 + idx * 0.042, 0.036, 0.025);
        const cap = new THREE.Mesh(
          new THREE.CylinderGeometry(0.007, 0.008, 0.014, 8),
          creamMat,
        );
        cap.rotation.x = Math.PI / 2;
        cap.position.set(-0.095 + idx * 0.042, 0.036, 0.068);
        g.add(tube, cap);
      });

      // Mini brush cup + 3 artist brushes on upper tier left
      const cup = new THREE.Mesh(
        new THREE.CylinderGeometry(0.032, 0.028, 0.068, 12),
        clayMat('#9FD4C0', 0.42),
      );
      cup.position.set(-0.085, 0.146, -0.01);
      [-0.18, 0.02, 0.2].forEach((tilt, bi) => {
        const handle = new THREE.Mesh(
          new THREE.CylinderGeometry(0.005, 0.006, 0.13, 7),
          clayMat(bi === 0 ? '#D86C52' : bi === 1 ? '#5B88B2' : '#7C5A3C', 0.55),
        );
        handle.position.set(-0.085 + tilt * 0.04, 0.19, -0.01);
        handle.rotation.z = tilt;
        const bristle = new THREE.Mesh(
          new THREE.ConeGeometry(0.008, 0.022, 7),
          clayMat('#3D2E24', 0.7),
        );
        bristle.position.set(-0.085 + tilt * 0.02 - Math.sin(tilt) * 0.07, 0.258, -0.01);
        bristle.rotation.z = tilt;
        g.add(handle, bristle);
      });

      // Wooden painter's palette with colorful paint dabs leaning on upper tier right
      const palette = new THREE.Mesh(
        new THREE.CylinderGeometry(0.068, 0.068, 0.01, 18),
        creamMat,
      );
      palette.scale.set(1.15, 1, 0.85);
      palette.position.set(0.068, 0.16, -0.02);
      palette.rotation.x = 1.2;
      palette.rotation.z = -0.2;
      [
        [-0.032, '#E76F51'],
        [-0.01, '#F4C44E'],
        [0.014, '#5FAEE3'],
        [0.036, '#75C3A5'],
      ].forEach(([dx, hex]) => {
        const dab = new THREE.Mesh(
          new THREE.SphereGeometry(0.01, 7, 7),
          clayMat(hex as string, 0.35),
        );
        dab.position.set(0.068 + (dx as number), 0.172, 0.005);
        g.add(dab);
      });

      // Small upright sketchbook
      const sketchpad = new THREE.Mesh(
        new RoundedBoxGeometry(0.11, 0.13, 0.016, 1, 0.004),
        accentMat,
      );
      sketchpad.position.set(0.095, 0.088, 0.045);
      sketchpad.rotation.y = -0.35;

      g.add(baseShelf, midShelf, backBoard, cup, palette, sketchpad);
      break;
    }

    case 'pencil_case': {
      // Cute Pastel Fabric Zipper Pencil Pouch + 2 Resting Pens & Eraser
      const pouchMat = clayMat(item.color || '#F4A6BE', 0.72);
      const trimMat = clayMat(item.accentColor || '#FFF3D4', 0.65);
      const goldMat = glossyClayMat('#DFBE73', 0.22);

      const body = new THREE.Mesh(
        new RoundedBoxGeometry(0.24, 0.07, 0.105, 3, 0.025),
        pouchMat,
      );
      body.position.set(0, 0.035, 0);

      const zipTrack = new THREE.Mesh(
        new RoundedBoxGeometry(0.21, 0.01, 0.018, 1, 0.003),
        trimMat,
      );
      zipTrack.position.set(0, 0.071, 0);
      const zipPull = new THREE.Mesh(
        new RoundedBoxGeometry(0.024, 0.008, 0.014, 1, 0.003),
        goldMat,
      );
      zipPull.position.set(0.095, 0.074, 0.012);
      zipPull.rotation.y = 0.5;

      const patch = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.018, 0.008, 12),
        trimMat,
      );
      patch.rotation.x = Math.PI / 2;
      patch.position.set(-0.055, 0.038, 0.052);

      // Pen & eraser neatly beside pouch
      const pen = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0065, 0.0065, 0.16, 8),
        clayMat('#79B6E8', 0.45),
      );
      pen.rotation.z = Math.PI / 2;
      pen.rotation.y = 0.14;
      pen.position.set(0.02, 0.007, 0.072);

      const eraser = new THREE.Mesh(
        new RoundedBoxGeometry(0.042, 0.016, 0.022, 1, 0.004),
        clayMat('#FFFFFF', 0.5),
      );
      eraser.position.set(-0.09, 0.008, 0.074);
      eraser.rotation.y = -0.2;

      g.add(body, zipTrack, zipPull, patch, pen, eraser);
      break;
    }

    case 'book_stack': {
      // Neat Staggered Stack of 4 Hardcover Study Books with Recessed Cream Pages & Tiny Bookmark/Apple
      const addBook = (
        w: number,
        h: number,
        d: number,
        py: number,
        rotY: number,
        coverHex: string,
      ) => {
        const bg = new THREE.Group();
        bg.position.set(0, py, 0);
        bg.rotation.y = rotY;
        const cMat = clayMat(coverHex, 0.62);
        const pageMat = clayMat('#FFF8EA', 0.8);

        const bottomCover = new THREE.Mesh(new RoundedBoxGeometry(w, 0.008, d, 1, 0.003), cMat);
        bottomCover.position.y = 0.004;
        const pages = new THREE.Mesh(
          new THREE.BoxGeometry(w - 0.018, h - 0.016, d - 0.016),
          pageMat,
        );
        pages.position.set(0.006, h * 0.5, 0);
        const spine = new THREE.Mesh(
          new RoundedBoxGeometry(0.014, h, d, 1, 0.004),
          cMat,
        );
        spine.position.set(-w * 0.5 + 0.007, h * 0.5, 0);
        const topCover = new THREE.Mesh(new RoundedBoxGeometry(w, 0.008, d, 1, 0.003), cMat);
        topCover.position.y = h - 0.004;
        bg.add(bottomCover, pages, spine, topCover);
        g.add(bg);
      };

      addBook(0.28, 0.046, 0.21, 0, 0.04, item.color || '#79A7C7');
      addBook(0.26, 0.042, 0.195, 0.046, -0.14, item.accentColor || '#E68A7B');
      addBook(0.24, 0.038, 0.185, 0.088, 0.1, '#7DBB92');
      addBook(0.22, 0.036, 0.175, 0.126, -0.05, '#F2C572');

      // Cute miniature ceramic apple on top of the book stack
      const apple = new THREE.Mesh(
        new THREE.SphereGeometry(0.026, 12, 10),
        glossyClayMat('#E85D68', 0.28),
      );
      apple.scale.set(1.05, 0.92, 1.05);
      apple.position.set(0.02, 0.184, 0.01);
      const leaf = new THREE.Mesh(
        new THREE.BoxGeometry(0.016, 0.005, 0.01),
        clayMat('#66B856', 0.5),
      );
      leaf.position.set(0.028, 0.21, 0.01);
      leaf.rotation.z = 0.4;

      g.add(apple, leaf);
      break;
    }

    case 'open_book': {
      // Open Hardcover Notebook/Book with Canvas-Textured Pages, Bookmark Ribbon & Pen
      const coverMat = clayMat(item.accentColor || '#5B88B2', 0.62);
      const paperMat = clayMat('#FAF5E8', 0.82);
      const leftTex = getOpenBookPageTexture('left');
      const rightTex = getOpenBookPageTexture('right');

      const coverBack = new THREE.Mesh(
        new RoundedBoxGeometry(0.34, 0.01, 0.23, 2, 0.004),
        coverMat,
      );
      coverBack.position.y = 0.005;

      const leftBlock = new THREE.Mesh(
        new RoundedBoxGeometry(0.155, 0.018, 0.21, 2, 0.004),
        paperMat,
      );
      leftBlock.position.set(-0.08, 0.018, 0);
      leftBlock.rotation.z = -0.04;

      const rightBlock = new THREE.Mesh(
        new RoundedBoxGeometry(0.155, 0.018, 0.21, 2, 0.004),
        paperMat,
      );
      rightBlock.position.set(0.08, 0.018, 0);
      rightBlock.rotation.z = 0.04;

      const leftFace = new THREE.Mesh(
        new THREE.PlaneGeometry(0.148, 0.2),
        new THREE.MeshStandardMaterial({map: leftTex, roughness: 0.74}),
      );
      leftFace.rotation.x = -Math.PI / 2;
      leftFace.rotation.y = -0.04;
      leftFace.position.set(-0.08, 0.029, 0);

      const rightFace = new THREE.Mesh(
        new THREE.PlaneGeometry(0.148, 0.2),
        new THREE.MeshStandardMaterial({map: rightTex, roughness: 0.74}),
      );
      rightFace.rotation.x = -Math.PI / 2;
      rightFace.rotation.y = 0.04;
      rightFace.position.set(0.08, 0.029, 0);

      // Satin red bookmark ribbon peeking out the bottom crease
      const ribbon = new THREE.Mesh(
        new THREE.BoxGeometry(0.014, 0.004, 0.25),
        clayMat('#E85D68', 0.55),
      );
      ribbon.position.set(0, 0.024, 0.025);

      // Fountain pen resting diagonally on right page
      const pen = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0055, 0.0055, 0.145, 8),
        glossyClayMat('#39485E', 0.25),
      );
      pen.rotation.x = Math.PI / 2;
      pen.rotation.z = -0.42;
      pen.position.set(0.085, 0.036, 0.015);

      g.add(coverBack, leftBlock, rightBlock, leftFace, rightFace, ribbon, pen);
      break;
    }

    case 'headphone_stand': {
      // Weighted Wood/Alu Stand Holding Cute Pastel Over-Ear Gaming Headphones
      const standMat = clayMat(item.color || '#F2ECE3', 0.45);
      const hpMat = clayMat(item.accentColor || '#F298A8', 0.44);
      const padMat = clayMat('#FFF8F0', 0.68);
      const metalMat = glossyClayMat('#CFD8E2', 0.2);

      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.075, 0.085, 0.02, 18),
        standMat,
      );
      base.position.y = 0.01;
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.014, 0.27, 10),
        metalMat,
      );
      stem.position.y = 0.15;
      const saddle = new THREE.Mesh(
        new RoundedBoxGeometry(0.095, 0.024, 0.052, 2, 0.01),
        standMat,
      );
      saddle.position.y = 0.292;

      // Over-ear headphone resting cleanly atop the saddle
      const headband = new THREE.Mesh(
        new THREE.TorusGeometry(0.095, 0.015, 10, 22, Math.PI * 1.08),
        hpMat,
      );
      headband.position.y = 0.215;
      headband.rotation.z = -Math.PI * 0.04;

      [-1, 1].forEach((s) => {
        const yoke = new THREE.Mesh(
          new THREE.CylinderGeometry(0.007, 0.007, 0.048, 8),
          metalMat,
        );
        yoke.position.set(s * 0.096, 0.195, 0);
        const earCup = new THREE.Mesh(
          new THREE.CylinderGeometry(0.048, 0.048, 0.034, 16),
          hpMat,
        );
        earCup.rotation.z = Math.PI / 2;
        earCup.position.set(s * 0.098, 0.145, 0);
        const cushion = new THREE.Mesh(
          new THREE.TorusGeometry(0.038, 0.012, 10, 18),
          padMat,
        );
        cushion.rotation.y = Math.PI / 2;
        cushion.position.set(s * 0.078, 0.145, 0);
        const accentRing = new THREE.Mesh(
          new THREE.TorusGeometry(0.03, 0.005, 8, 16),
          glossyClayMat('#FFF8F0', 0.2),
        );
        accentRing.rotation.y = Math.PI / 2;
        accentRing.position.set(s * 0.116, 0.145, 0);
        g.add(yoke, earCup, cushion, accentRing);
      });

      g.add(base, stem, saddle, headband);
      break;
    }

    case 'table_snack_tray': {
      // Natural Wooden Serving Tray with Iced Drink Cup + Porcelain Plate with Strawberry Cake & Frosted Donut
      const trayMat = clayMat(item.color || '#E7CEA9', 0.62);
      const rimMat = clayMat('#C8A476', 0.64);
      const plateMat = glossyClayMat('#FFFFFF', 0.18);
      const pinkMat = clayMat(item.accentColor || '#F48FB1', 0.45);
      const creamMat = clayMat('#FFF8EE', 0.56);

      const trayBase = new THREE.Mesh(
        new RoundedBoxGeometry(0.36, 0.016, 0.25, 2, 0.006),
        trayMat,
      );
      trayBase.position.y = 0.008;
      // Raised perimeter rims + handles
      [-0.12, 0.12].forEach((rz) => {
        const rail = new THREE.Mesh(new RoundedBoxGeometry(0.36, 0.022, 0.014, 1, 0.004), rimMat);
        rail.position.set(0, 0.019, rz);
        g.add(rail);
      });
      [-0.175, 0.175].forEach((rx) => {
        const rail = new THREE.Mesh(new RoundedBoxGeometry(0.014, 0.028, 0.25, 1, 0.004), rimMat);
        rail.position.set(rx, 0.022, 0);
        g.add(rail);
      });

      // Tall glass/cup of iced strawberry milk / peach tea on left (-0.095, -0.01)
      const cupBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.042, 0.033, 0.115, 14),
        new THREE.MeshStandardMaterial({
          color: '#FFB7CC',
          roughness: 0.16,
          transparent: true,
          opacity: 0.88,
        }),
      );
      cupBody.position.set(-0.095, 0.072, -0.01);
      const foamCap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.043, 0.041, 0.02, 14),
        creamMat,
      );
      foamCap.position.set(-0.095, 0.132, -0.01);
      const straw = new THREE.Mesh(
        new THREE.CylinderGeometry(0.005, 0.005, 0.09, 8),
        clayMat('#FFFFFF', 0.4),
      );
      straw.position.set(-0.082, 0.165, -0.01);
      straw.rotation.z = -0.25;

      // Porcelain plate on right (+0.07, 0.005)
      const plate = new THREE.Mesh(
        new THREE.CylinderGeometry(0.095, 0.075, 0.014, 18),
        plateMat,
      );
      plate.position.set(0.07, 0.022, 0.005);

      // Frosted strawberry cake slice on plate
      const sponge = new THREE.Mesh(
        new RoundedBoxGeometry(0.078, 0.044, 0.064, 2, 0.008),
        clayMat('#F4D08A', 0.72),
      );
      sponge.position.set(0.055, 0.05, -0.025);
      sponge.rotation.y = 0.22;
      const icingTop = new THREE.Mesh(
        new RoundedBoxGeometry(0.082, 0.014, 0.068, 2, 0.006),
        creamMat,
      );
      icingTop.position.set(0.055, 0.074, -0.025);
      icingTop.rotation.y = 0.22;
      const berry = new THREE.Mesh(
        new THREE.ConeGeometry(0.014, 0.024, 10),
        clayMat('#E63946', 0.42),
      );
      berry.rotation.x = Math.PI;
      berry.position.set(0.055, 0.091, -0.025);

      // Pink glazed donut beside cake slice
      const donutBase = new THREE.Mesh(
        new THREE.TorusGeometry(0.026, 0.012, 10, 16),
        clayMat('#E2A76F', 0.68),
      );
      donutBase.rotation.x = Math.PI / 2;
      donutBase.position.set(0.095, 0.039, 0.042);
      const donutGlaze = new THREE.Mesh(
        new THREE.TorusGeometry(0.026, 0.0105, 10, 16),
        pinkMat,
      );
      donutGlaze.rotation.x = Math.PI / 2;
      donutGlaze.position.set(0.095, 0.044, 0.042);

      g.add(
        trayBase,
        cupBody,
        foamCap,
        straw,
        plate,
        sponge,
        icingTop,
        berry,
        donutBase,
        donutGlaze,
      );
      break;
    }

    case 'cozy_fireplace': {
      // Classic Cream Mantel Fireplace with Brick Hearth, Stacked Logs & Warm Glowing Embers (no PointLight spam)
      const mantelMat = clayMat(item.color || '#F3ECE2', 0.52);
      const brickMat = clayMat(item.accentColor || '#C57B48', 0.78);
      const sootMat = clayMat('#2E2623', 0.9);
      const hearthMat = clayMat('#A99A8B', 0.72);
      const woodLogMat = clayMat('#7D4F2D', 0.85);
      const emberMat = new THREE.MeshStandardMaterial({
        color: '#FF7B29',
        emissive: '#FF5400',
        emissiveIntensity: 0.95,
        roughness: 0.4,
      });
      const flameMat = new THREE.MeshStandardMaterial({
        color: '#FFD166',
        emissive: '#FF9E1B',
        emissiveIntensity: 1.05,
        roughness: 0.35,
      });

      const hearth = new THREE.Mesh(new RoundedBoxGeometry(1.42, 0.08, 0.66, 2, 0.015), hearthMat);
      hearth.position.set(0, 0.04, 0.02);

      // Left & right pillars + back recess + chimney breast
      [-0.5, 0.5].forEach((px) => {
        const pillar = new THREE.Mesh(
          new RoundedBoxGeometry(0.32, 0.92, 0.54, 2, 0.02),
          mantelMat,
        );
        pillar.position.set(px, 0.54, -0.02);
        const trim = new THREE.Mesh(
          new RoundedBoxGeometry(0.22, 0.76, 0.04, 2, 0.01),
          clayMat('#E4D8C7', 0.56),
        );
        trim.position.set(px, 0.54, 0.245);
        g.add(pillar, trim);
      });

      const backWall = new THREE.Mesh(new RoundedBoxGeometry(0.76, 0.86, 0.14, 1, 0.01), sootMat);
      backWall.position.set(0, 0.51, -0.2);

      const archHeader = new THREE.Mesh(new RoundedBoxGeometry(1.38, 0.2, 0.56, 2, 0.02), mantelMat);
      archHeader.position.set(0, 0.91, -0.02);

      const topShelf = new THREE.Mesh(new RoundedBoxGeometry(1.46, 0.07, 0.62, 2, 0.018), clayMat('#C89866', 0.58));
      topShelf.position.set(0, 1.045, -0.01);

      // Inner brick surround
      [-0.32, 0.32].forEach((bx) => {
        const brickSide = new THREE.Mesh(new RoundedBoxGeometry(0.08, 0.72, 0.42, 1, 0.008), brickMat);
        brickSide.position.set(bx, 0.44, -0.02);
        g.add(brickSide);
      });
      const brickTop = new THREE.Mesh(new RoundedBoxGeometry(0.72, 0.1, 0.42, 1, 0.008), brickMat);
      brickTop.position.set(0, 0.76, -0.02);

      // Stacked firewood logs & warm glowing flames
      [-0.12, 0.12].forEach((lx, i) => {
        const log = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.34, 10), woodLogMat);
        log.rotation.z = Math.PI / 2;
        log.rotation.y = i === 0 ? 0.18 : -0.18;
        log.position.set(lx * 0.4, 0.14, -0.02 + i * 0.06);
        g.add(log);
      });
      const topLog = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.052, 0.3, 10), woodLogMat);
      topLog.rotation.z = Math.PI / 2;
      topLog.position.set(0, 0.21, 0);

      const emberBed = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), emberMat);
      emberBed.scale.set(1.3, 0.32, 0.75);
      emberBed.position.set(0, 0.11, 0);

      [
        [-0.08, 0.29, 0.01, 0.055, 0.17],
        [0, 0.33, -0.01, 0.072, 0.24],
        [0.085, 0.28, 0.02, 0.052, 0.15],
      ].forEach(([fx, fy, fz, rad, h]) => {
        const flame = new THREE.Mesh(new THREE.ConeGeometry(rad, h, 8), flameMat);
        flame.position.set(fx, fy, fz);
        g.add(flame);
      });

      // Decorative brass candle & tiny framed picture on mantel shelf
      const miniFrame = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.28, 0.03, 1, 0.006), clayMat('#B9895B', 0.55));
      miniFrame.position.set(-0.36, 1.22, -0.06);
      miniFrame.rotation.x = -0.08;
      const miniCanvas = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.01), clayMat('#CDE8F6', 0.6));
      miniCanvas.position.set(-0.36, 1.22, -0.042);
      miniCanvas.rotation.x = -0.08;

      const potBody = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.05, 0.11, 12), glossyClayMat('#9AC7B5', 0.3));
      potBody.position.set(0.4, 1.135, 0);
      const bush = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), clayMat('#64A86B', 0.72));
      bush.position.set(0.4, 1.23, 0);

      g.add(hearth, backWall, archHeader, topShelf, brickTop, topLog, emberBed, miniFrame, miniCanvas, potBody, bush);
      break;
    }

    case 'fish_aquarium': {
      // Wooden Cabinet Stand + Illuminated Blue Glass Aquarium with Coral, Aquatic Plants & Cute Fish
      const standMat = clayMat(item.color || '#D8C5A3', 0.58);
      const trimMat = clayMat('#B69870', 0.62);
      const waterMat = new THREE.MeshStandardMaterial({
        color: item.accentColor || '#56B8E6',
        emissive: '#1D74A8',
        emissiveIntensity: 0.32,
        roughness: 0.14,
        transparent: true,
        opacity: 0.68,
      });
      const glassFrameMat = clayMat('#2B3640', 0.35);

      const cabinet = new THREE.Mesh(new RoundedBoxGeometry(1.18, 0.62, 0.5, 2, 0.02), standMat);
      cabinet.position.y = 0.33;
      [-0.28, 0.28].forEach((dx) => {
        const door = new THREE.Mesh(new RoundedBoxGeometry(0.52, 0.52, 0.025, 2, 0.008), trimMat);
        door.position.set(dx, 0.33, 0.252);
        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), glossyClayMat('#E8D08B', 0.22));
        knob.position.set(dx + (dx < 0 ? 0.19 : -0.19), 0.34, 0.27);
        g.add(door, knob);
      });
      const topPlinth = new THREE.Mesh(new RoundedBoxGeometry(1.22, 0.05, 0.54, 2, 0.012), trimMat);
      topPlinth.position.y = 0.665;

      // Tank water volume + dark top/bottom rims
      const botRim = new THREE.Mesh(new RoundedBoxGeometry(1.14, 0.04, 0.46, 1, 0.008), glassFrameMat);
      botRim.position.y = 0.71;
      const waterBox = new THREE.Mesh(new RoundedBoxGeometry(1.08, 0.56, 0.42, 1, 0.01), waterMat);
      waterBox.position.y = 1.0;
      const sandBed = new THREE.Mesh(new RoundedBoxGeometry(1.06, 0.06, 0.4, 1, 0.01), clayMat('#EED8AE', 0.85));
      sandBed.position.y = 0.75;
      const topHood = new THREE.Mesh(new RoundedBoxGeometry(1.15, 0.06, 0.47, 2, 0.012), glassFrameMat);
      topHood.position.y = 1.3;

      // Stones, kelp blades & coral inside tank
      [-0.36, -0.31, 0.34].forEach((kx, i) => {
        const kelp = new THREE.Mesh(
          new THREE.ConeGeometry(0.03, 0.28 + i * 0.05, 7),
          clayMat('#49A068', 0.65),
        );
        kelp.position.set(kx, 0.9, -0.06 + i * 0.04);
        g.add(kelp);
      });
      const coral = new THREE.Mesh(new THREE.DodecahedronGeometry(0.07, 0), clayMat('#F28482', 0.6));
      coral.position.set(0.18, 0.82, 0.04);
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.075, 0), clayMat('#7D8894', 0.82));
      rock.scale.set(1.3, 0.8, 0.9);
      rock.position.set(-0.14, 0.81, -0.03);

      // 3 colorful little aquarium fish
      [
        [-0.22, 1.05, 0.05, '#FF8C42', 0],
        [0.08, 0.96, -0.04, '#FFD166', Math.PI],
        [0.26, 1.12, 0.04, '#FF6B97', 0.25],
      ].forEach(([fx, fy, fz, col, ry]) => {
        const fg = new THREE.Group();
        fg.position.set(fx as number, fy as number, fz as number);
        fg.rotation.y = ry as number;
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 8), clayMat(col as string, 0.4));
        body.scale.set(1.4, 0.85, 0.55);
        const tail = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.045, 4), clayMat(col as string, 0.45));
        tail.rotation.z = -Math.PI / 2;
        tail.position.x = -0.06;
        fg.add(body, tail);
        g.add(fg);
      });

      g.add(cabinet, topPlinth, botRim, waterBox, sandBed, topHood, coral, rock);
      break;
    }

    case 'beanbag_chair': {
      // Cozy Tear-Drop Pastel Beanbag Lounger with Piping Seam & Mini Accent Pillow
      const bagMat = clayMat(item.color || '#F59CA9', 0.78);
      const seamMat = clayMat(item.accentColor || '#FFF4E6', 0.68);

      const basePuff = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 14), bagMat);
      basePuff.scale.set(1.04, 0.66, 1.06);
      basePuff.position.set(0, 0.25, 0.02);

      const backRest = new THREE.Mesh(new THREE.SphereGeometry(0.31, 16, 12), bagMat);
      backRest.scale.set(1.06, 1.12, 0.72);
      backRest.position.set(0, 0.44, -0.2);

      const seatDip = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.31, 0.06, 16), seamMat);
      seatDip.position.set(0, 0.38, 0.08);

      const piping = new THREE.Mesh(new THREE.TorusGeometry(0.41, 0.015, 8, 24), seamMat);
      piping.rotation.x = Math.PI / 2;
      piping.position.set(0, 0.16, 0.02);

      const miniPillow = new THREE.Mesh(new RoundedBoxGeometry(0.26, 0.19, 0.09, 3, 0.035), seamMat);
      miniPillow.position.set(0.04, 0.48, -0.06);
      miniPillow.rotation.set(-0.35, -0.18, 0.1);

      g.add(basePuff, backRest, seatDip, piping, miniPillow);
      break;
    }

    case 'cat_tree_tower': {
      // Multi-Level Sisal & Plush Cat Tree Tower with Condo House, Perch Bed & Dangling Pom-Pom
      const plushMat = clayMat(item.color || '#EDE0CF', 0.85);
      const sisalMat = clayMat(item.accentColor || '#D6A77A', 0.9);
      const darkHoleMat = clayMat('#4C3D34', 0.9);
      const pomMat = clayMat('#F28BA8', 0.7);

      const basePlate = new THREE.Mesh(new RoundedBoxGeometry(0.68, 0.06, 0.64, 2, 0.018), plushMat);
      basePlate.position.y = 0.03;

      // Cozy cube condo on left-back
      const condo = new THREE.Mesh(new RoundedBoxGeometry(0.36, 0.34, 0.36, 2, 0.025), plushMat);
      condo.position.set(-0.12, 0.23, -0.06);
      const condoOpening = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.03, 14), darkHoleMat);
      condoOpening.rotation.x = Math.PI / 2;
      condoOpening.position.set(-0.12, 0.22, 0.12);

      // Right sisal scratching post + mid platform
      const postRight = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.055, 0.72, 12), sisalMat);
      postRight.position.set(0.18, 0.42, 0.08);
      const midShelf = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.045, 0.36, 2, 0.016), plushMat);
      midShelf.position.set(0.08, 0.79, 0.04);

      // Upper post + top cushioned round cat bed with cute cat ears rim
      const postTop = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.052, 0.52, 12), sisalMat);
      postTop.position.set(-0.08, 1.07, -0.04);
      const topBed = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.08, 16), plushMat);
      topBed.position.set(-0.08, 1.35, -0.04);
      const topRim = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.045, 10, 18), plushMat);
      topRim.rotation.x = Math.PI / 2;
      topRim.position.set(-0.08, 1.4, -0.04);

      // Dangling string + pink pom-pom under top bed
      const string = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.18, 6), sisalMat);
      string.position.set(0.11, 1.22, 0.06);
      const pom = new THREE.Mesh(new THREE.SphereGeometry(0.036, 10, 10), pomMat);
      pom.position.set(0.11, 1.12, 0.06);

      // Cute cat ear accents on top rim
      [-0.17, 0.01].forEach((ex) => {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.075, 4), pomMat);
        ear.position.set(ex, 1.46, -0.21);
        g.add(ear);
      });

      g.add(basePlate, condo, condoOpening, postRight, midShelf, postTop, topBed, topRim, string, pom);
      break;
    }

    case 'wall_gallery_frames': {
      // Trio of Framed Pastel Botanical & Mountain Artworks Mounted Flush Facing +Z
      const cy = item.mountHeight ?? 1.92;
      const frameMat = clayMat(item.color || '#DFB684', 0.56);
      const matBoardMat = clayMat('#FFFDF7', 0.72);
      const specs: Array<[number, number, number, string, string]> = [
        [-0.44, 0.34, 0.44, '#CFE9F7', '#7BB892'],
        [0, 0.42, 0.54, '#FDE3EC', '#F4A261'],
        [0.44, 0.34, 0.44, '#E8F3E0', item.accentColor || '#8ECAE6'],
      ];
      specs.forEach(([fx, fw, fh, bgHex, artHex], idx) => {
        const fg = new THREE.Group();
        fg.position.set(fx, cy + (idx === 1 ? 0.03 : -0.02), 0.018);

        const outer = new THREE.Mesh(new RoundedBoxGeometry(fw, fh, 0.034, 2, 0.008), frameMat);
        const matBoard = new THREE.Mesh(new THREE.BoxGeometry(fw - 0.06, fh - 0.06, 0.01), matBoardMat);
        matBoard.position.z = 0.014;
        const innerBg = new THREE.Mesh(new THREE.BoxGeometry(fw - 0.12, fh - 0.12, 0.008), clayMat(bgHex, 0.65));
        innerBg.position.z = 0.019;

        if (idx === 0) {
          // Cute botanical leaf shape
          const stem = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.18, 0.006), clayMat(artHex, 0.6));
          stem.position.set(0, -0.02, 0.024);
          const leafL = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), clayMat(artHex, 0.6));
          leafL.scale.set(0.65, 1.3, 0.2);
          leafL.rotation.z = 0.45;
          leafL.position.set(-0.035, 0.02, 0.025);
          const leafR = leafL.clone();
          leafR.rotation.z = -0.45;
          leafR.position.set(0.035, 0.05, 0.025);
          fg.add(stem, leafL, leafR);
        } else if (idx === 1) {
          // Sunset mountain & sun artwork
          const sun = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.006, 14), clayMat('#FFD166', 0.5));
          sun.rotation.x = Math.PI / 2;
          sun.position.set(0.04, 0.08, 0.025);
          const peak1 = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.17, 4), clayMat(artHex, 0.65));
          peak1.rotation.y = Math.PI / 4;
          peak1.scale.z = 0.15;
          peak1.position.set(-0.04, -0.06, 0.025);
          const peak2 = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.13, 4), clayMat('#E76F51', 0.65));
          peak2.rotation.y = Math.PI / 4;
          peak2.scale.z = 0.15;
          peak2.position.set(0.06, -0.08, 0.026);
          fg.add(sun, peak1, peak2);
        } else {
          // Abstract pastel arch & clouds
          const arch = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.006, 14), clayMat(artHex, 0.58));
          arch.rotation.x = Math.PI / 2;
          arch.position.set(0, -0.04, 0.025);
          const moonDot = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 10), clayMat('#F4A261', 0.5));
          moonDot.scale.z = 0.25;
          moonDot.position.set(-0.04, 0.08, 0.025);
          fg.add(arch, moonDot);
        }

        fg.add(outer, matBoard, innerBg);
        g.add(fg);
      });
      break;
    }

    case 'wall_mirror_arch': {
      // Gold-Framed Arched Vanity Wall Mirror Facing +Z
      const cy = item.mountHeight ?? 1.82;
      const goldMat = glossyClayMat(item.color || '#E0B967', 0.22);
      const glassMat = new THREE.MeshStandardMaterial({
        color: item.accentColor || '#CDE8F5',
        emissive: '#9BCBE2',
        emissiveIntensity: 0.15,
        roughness: 0.08,
        metalness: 0.42,
      });
      const glintMat = new THREE.MeshStandardMaterial({
        color: '#FFFFFF',
        emissive: '#FFFFFF',
        emissiveIntensity: 0.3,
        roughness: 0.1,
        transparent: true,
        opacity: 0.55,
      });

      const rectBack = new THREE.Mesh(new RoundedBoxGeometry(0.6, 0.72, 0.036, 2, 0.012), goldMat);
      rectBack.position.set(0, cy - 0.12, 0.018);
      const archBack = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.036, 22), goldMat);
      archBack.rotation.x = Math.PI / 2;
      archBack.position.set(0, cy + 0.24, 0.018);

      const rectGlass = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.68, 0.014), glassMat);
      rectGlass.position.set(0, cy - 0.1, 0.034);
      const archGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.014, 22), glassMat);
      archGlass.rotation.x = Math.PI / 2;
      archGlass.position.set(0, cy + 0.24, 0.034);

      const glint = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.44, 0.005), glintMat);
      glint.position.set(-0.11, cy + 0.06, 0.043);
      glint.rotation.z = -0.32;

      g.add(rectBack, archBack, rectGlass, archGlass, glint);
      break;
    }

    case 'plush_bear_giant': {
      // Huggable Seated Giant Honey Teddy Bear with Cute Bowtie & Rosy Cheeks
      const furMat = clayMat(item.color || '#D79E68', 0.86);
      const muzzleMat = clayMat('#F8E7CE', 0.8);
      const bowMat = clayMat(item.accentColor || '#E86A7D', 0.6);
      const darkMat = glossyClayMat('#2B211B', 0.22);
      const blushMat = clayMat('#F497A6', 0.75);

      const belly = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 14), furMat);
      belly.scale.set(1.02, 1.15, 0.92);
      belly.position.set(0, 0.25, -0.02);
      const tummyPatch = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), muzzleMat);
      tummyPatch.scale.set(0.95, 1.05, 0.35);
      tummyPatch.position.set(0, 0.24, 0.17);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 16, 14), furMat);
      head.position.set(0, 0.56, 0.01);
      const snout = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 10), muzzleMat);
      snout.scale.set(1.15, 0.85, 0.9);
      snout.position.set(0, 0.52, 0.19);
      const nose = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), darkMat);
      nose.scale.set(1.3, 0.9, 0.8);
      nose.position.set(0, 0.545, 0.265);

      [-1, 1].forEach((s) => {
        const ear = new THREE.Mesh(new THREE.SphereGeometry(0.072, 12, 10), furMat);
        ear.position.set(s * 0.165, 0.72, -0.01);
        const earIn = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), muzzleMat);
        earIn.position.set(s * 0.165, 0.72, 0.045);

        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), darkMat);
        eye.position.set(s * 0.075, 0.6, 0.19);
        const blush = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), blushMat);
        blush.scale.set(1.2, 0.7, 0.3);
        blush.position.set(s * 0.115, 0.55, 0.175);

        const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.062, 0.16, 6, 10), furMat);
        arm.position.set(s * 0.22, 0.33, 0.08);
        arm.rotation.set(-0.5, 0, s * 0.35);

        const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.18, 6, 10), furMat);
        leg.position.set(s * 0.15, 0.09, 0.18);
        leg.rotation.set(Math.PI / 2 - 0.12, s * 0.24, 0);
        const pawPad = new THREE.Mesh(new THREE.SphereGeometry(0.052, 10, 8), muzzleMat);
        pawPad.scale.set(0.95, 1.15, 0.3);
        pawPad.position.set(s * 0.19, 0.1, 0.31);

        g.add(ear, earIn, eye, blush, arm, leg, pawPad);
      });

      // Cute bow tie at neck
      [-0.045, 0.045].forEach((bx, idx) => {
        const wing = new THREE.Mesh(new THREE.ConeGeometry(0.036, 0.07, 4), bowMat);
        wing.rotation.z = idx === 0 ? -Math.PI / 2 : Math.PI / 2;
        wing.position.set(bx, 0.39, 0.2);
        g.add(wing);
      });
      const bowKnot = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), bowMat);
      bowKnot.position.set(0, 0.39, 0.21);

      g.add(belly, tummyPatch, head, snout, nose, bowKnot);
      break;
    }

    case 'coffee_maker_bar': {
      // Compact Pastel Sage Countertop Espresso Machine + Mug & Coffee Bean Jar
      const machineMat = glossyClayMat(item.color || '#98C4AE', 0.28);
      const chromeMat = glossyClayMat(item.accentColor || '#E8EEF2', 0.18);
      const darkMat = clayMat('#2E2623', 0.72);
      const mugMat = glossyClayMat('#FFF8F0', 0.22);

      const baseTray = new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.03, 0.2, 2, 0.008), chromeMat);
      baseTray.position.set(-0.04, 0.015, 0);
      const rearTower = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.27, 0.12, 2, 0.015), machineMat);
      rearTower.position.set(-0.04, 0.15, -0.04);
      const topHead = new THREE.Mesh(new RoundedBoxGeometry(0.23, 0.07, 0.19, 2, 0.014), machineMat);
      topHead.position.set(-0.04, 0.275, 0);

      const groupHead = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.038, 0.035, 12), chromeMat);
      groupHead.position.set(-0.04, 0.225, 0.04);
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.012, 0.09, 8), darkMat);
      handle.rotation.x = Math.PI / 2;
      handle.position.set(-0.04, 0.225, 0.11);

      const gauge = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.012, 12), mugMat);
      gauge.rotation.x = Math.PI / 2;
      gauge.position.set(-0.04, 0.275, 0.096);

      const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.028, 0.062, 12), mugMat);
      mug.position.set(-0.04, 0.062, 0.04);
      const coffee = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.008, 12), clayMat('#52321E', 0.35));
      coffee.position.set(-0.04, 0.09, 0.04);

      // Cute glass bean canister on right
      const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.12, 12), clayMat('#6B4429', 0.5));
      jar.position.set(0.135, 0.062, 0.01);
      const jarLid = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.022, 12), clayMat('#D8B282', 0.55));
      jarLid.position.set(0.135, 0.13, 0.01);

      g.add(baseTray, rearTower, topHead, groupHead, handle, gauge, mug, coffee, jar, jarLid);
      break;
    }

    case 'toast_toaster_set': {
      // Retro Butter-Cream Pop-Up Toaster with Two Golden Toasts + Butter Dish & Jam Jar
      const toasterMat = glossyClayMat(item.color || '#F5E4B7', 0.24);
      const toastMat = clayMat(item.accentColor || '#D88C51', 0.78);
      const crumbMat = clayMat('#F4CF8A', 0.82);
      const chromeMat = glossyClayMat('#DCE4EC', 0.2);

      const body = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.135, 0.14, 3, 0.024), toasterMat);
      body.position.set(-0.04, 0.072, 0);
      const footBase = new THREE.Mesh(new RoundedBoxGeometry(0.21, 0.014, 0.15, 2, 0.006), chromeMat);
      footBase.position.set(-0.04, 0.007, 0);

      const lever = new THREE.Mesh(new RoundedBoxGeometry(0.024, 0.016, 0.026, 1, 0.005), chromeMat);
      lever.position.set(0.07, 0.09, 0);

      // Two crispy toast slices popping out top
      [-0.028, 0.028].forEach((tz) => {
        const crust = new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.085, 0.022, 2, 0.006), toastMat);
        crust.position.set(-0.04, 0.145, tz);
        const breadFace = new THREE.Mesh(new RoundedBoxGeometry(0.094, 0.068, 0.024, 1, 0.004), crumbMat);
        breadFace.position.set(-0.04, 0.145, tz);
        g.add(crust, breadFace);
      });

      // Tiny strawberry jam jar beside toaster
      const jam = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.07, 12), glossyClayMat('#E85D75', 0.3));
      jam.position.set(0.115, 0.035, 0.025);
      const jamLid = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.016, 12), chromeMat);
      jamLid.position.set(0.115, 0.076, 0.025);

      g.add(body, footBase, lever, jam, jamLid);
      break;
    }

    case 'piano_keyboard': {
      // Ivory Upright Digital Piano with Black/White Keys, Music Stand, Sheet Music & Padded Bench
      const woodMat = glossyClayMat(item.color || '#FAF6EE', 0.34);
      const darkMat = clayMat(item.accentColor || '#4A3F37', 0.52);
      const whiteKeyMat = glossyClayMat('#FFFFFF', 0.22);
      const goldMat = glossyClayMat('#D8B55B', 0.22);

      const keybed = new THREE.Mesh(new RoundedBoxGeometry(1.36, 0.12, 0.44, 2, 0.016), woodMat);
      keybed.position.set(0, 0.72, -0.02);
      const backPanel = new THREE.Mesh(new RoundedBoxGeometry(1.34, 0.18, 0.16, 2, 0.015), woodMat);
      backPanel.position.set(0, 0.83, -0.16);

      [-0.6, 0.6].forEach((lx) => {
        const leg = new THREE.Mesh(new RoundedBoxGeometry(0.075, 0.7, 0.36, 2, 0.012), woodMat);
        leg.position.set(lx, 0.35, -0.02);
        g.add(leg);
      });
      const modesty = new THREE.Mesh(new RoundedBoxGeometry(1.16, 0.36, 0.04, 1, 0.008), woodMat);
      modesty.position.set(0, 0.48, -0.17);

      // 3 brass pedals at floor
      [-0.08, 0, 0.08].forEach((px) => {
        const pedal = new THREE.Mesh(new RoundedBoxGeometry(0.035, 0.022, 0.09, 1, 0.005), goldMat);
        pedal.position.set(px, 0.02, -0.06);
        g.add(pedal);
      });

      // White & black piano keys
      const whiteKeys = new THREE.Mesh(new RoundedBoxGeometry(1.18, 0.035, 0.18, 1, 0.004), whiteKeyMat);
      whiteKeys.position.set(0, 0.785, 0.09);
      g.add(whiteKeys);
      for (let i = -9; i <= 9; i++) {
        if (Math.abs(i) % 7 === 0 || Math.abs(i) % 7 === 3) continue;
        const bk = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.032, 0.105), darkMat);
        bk.position.set(i * 0.056, 0.805, 0.045);
        g.add(bk);
      }

      // Music rest + open sheet music
      const stand = new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.24, 0.018, 1, 0.005), woodMat);
      stand.position.set(0, 1.02, -0.1);
      stand.rotation.x = -0.22;
      const sheet = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.2, 0.01), whiteKeyMat);
      sheet.position.set(0, 1.03, -0.086);
      sheet.rotation.x = -0.22;

      g.add(keybed, backPanel, modesty, stand, sheet);
      break;
    }

    case 'record_shelf_cabinet': {
      // Mid-Century Oak Turntable Console Cabinet with Vinyl Records & Retro Speaker
      const oakMat = clayMat(item.color || '#C7925B', 0.62);
      const darkMat = clayMat(item.accentColor || '#3A3A44', 0.48);
      const vinylMat = glossyClayMat('#1E1E24', 0.2);

      // Tapered legs
      [
        [-0.54, -0.2],
        [0.54, -0.2],
        [-0.54, 0.2],
        [0.54, 0.2],
      ].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.016, 0.22, 8), oakMat);
        leg.position.set(lx, 0.11, lz);
        g.add(leg);
      });

      const boxBody = new THREE.Mesh(new RoundedBoxGeometry(1.24, 0.62, 0.5, 2, 0.018), oakMat);
      boxBody.position.y = 0.53;
      const shelfVoid = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.52, 0.44), clayMat('#8A5F38', 0.72));
      shelfVoid.position.set(0, 0.53, 0.035);
      const midDivider = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.52, 0.45), oakMat);
      midDivider.position.set(0, 0.53, 0.03);

      // Colorful vinyl sleeves lined vertically on left compartment
      ['#E76F51', '#F4C44E', '#5FAEE3', '#75C3A5', '#F28BA8', '#A78BFA', '#E9C46A'].forEach((hex, idx) => {
        const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.44, 0.36), clayMat(hex, 0.65));
        sleeve.position.set(-0.48 + idx * 0.068, 0.51, 0.04);
        sleeve.rotation.z = idx === 6 ? -0.15 : 0;
        g.add(sleeve);
      });

      // Retro mesh speaker inside right compartment
      const speakerBox = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.38, 0.32, 2, 0.014), darkMat);
      speakerBox.position.set(0.3, 0.48, 0.05);
      const woofer = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.018, 8, 18), clayMat('#C8A464', 0.4));
      woofer.position.set(0.3, 0.46, 0.212);

      // Turntable platter & spinning vinyl LP on top surface (surfaceHeight = 0.88)
      const plinth = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.045, 0.38, 2, 0.01), clayMat('#EDE2D2', 0.48));
      plinth.position.set(-0.22, 0.862, 0);
      const recordDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.145, 0.008, 22), vinylMat);
      recordDisc.position.set(-0.26, 0.89, 0);
      const labelDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.01, 16), clayMat('#E76F51', 0.55));
      labelDisc.position.set(-0.26, 0.891, 0);
      const toneArm = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.17, 6), glossyClayMat('#D4DDE5', 0.2));
      toneArm.rotation.x = Math.PI / 2;
      toneArm.rotation.z = 0.38;
      toneArm.position.set(-0.08, 0.9, 0.02);

      // Potted mini succulent on right top
      const miniPot = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.055, 0.1, 12), clayMat('#E29578', 0.6));
      miniPot.position.set(0.36, 0.89, -0.02);
      const plant = new THREE.Mesh(new THREE.DodecahedronGeometry(0.075, 0), clayMat('#68B074', 0.7));
      plant.position.set(0.36, 0.97, -0.02);

      g.add(boxBody, shelfVoid, midDivider, speakerBox, woofer, plinth, recordDisc, labelDisc, toneArm, miniPot, plant);
      break;
    }

    case 'terrace_swing_egg': {
      // Boho Rattan Egg Swing Chair on Curved Metal Stand with Plush Pink Cushion
      const rattanMat = clayMat(item.color || '#E2C397', 0.72);
      const cushionMat = clayMat(item.accentColor || '#F7A8B8', 0.78);
      const standMat = glossyClayMat('#4A4540', 0.38);

      // Circular base ring + curved C-arm stand
      const baseRing = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.026, 10, 28), standMat);
      baseRing.rotation.x = Math.PI / 2;
      baseRing.position.y = 0.026;

      const rearPole = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.028, 1.38, 10), standMat);
      rearPole.position.set(0, 0.72, -0.36);
      rearPole.rotation.x = 0.08;

      const archArm = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.022, 8, 18, Math.PI * 0.62), standMat);
      archArm.rotation.y = Math.PI / 2;
      archArm.position.set(0, 1.36, -0.02);

      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.22, 6), glossyClayMat('#D6DEE5', 0.2));
      chain.position.set(0, 1.5, 0.02);

      // Woven rattan egg shell basket (back dome + front rim + ribs)
      const basketBack = new THREE.Mesh(
        new THREE.SphereGeometry(0.44, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.62),
        rattanMat,
      );
      basketBack.rotation.x = -Math.PI * 0.5;
      basketBack.scale.set(0.95, 1.0, 1.18);
      basketBack.position.set(0, 0.84, 0.04);

      const basketRim = new THREE.Mesh(new THREE.TorusGeometry(0.39, 0.032, 10, 24), rattanMat);
      basketRim.scale.set(0.96, 1.18, 1);
      basketRim.position.set(0, 0.84, 0.16);

      // Thick plush cushion inside egg seat (surfaceHeight = 0.56)
      const seatCushion = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 12), cushionMat);
      seatCushion.scale.set(1.05, 0.45, 0.95);
      seatCushion.position.set(0, 0.56, 0.06);

      const backCushion = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 12), cushionMat);
      backCushion.scale.set(1.0, 1.08, 0.45);
      backCushion.position.set(0, 0.82, -0.11);

      const throwPillow = new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.18, 0.08, 2, 0.03), clayMat('#FFF8EE', 0.72));
      throwPillow.position.set(-0.08, 0.68, 0);
      throwPillow.rotation.set(-0.35, 0.25, 0.12);

      g.add(
        baseRing,
        rearPole,
        archArm,
        chain,
        basketBack,
        basketRim,
        seatCushion,
        backCushion,
        throwPillow,
      );
      break;
    }

    case 'floor_paint':
    case 'wall_paint': {
      const can = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.22, 0.44, 14),
        clayMat('#E8EDF2', 0.4, 0.35),
      );
      can.position.y = 0.22;
      const band = new THREE.Mesh(
        new THREE.CylinderGeometry(0.244, 0.236, 0.18, 14),
        clayMat(item.color, 0.55),
      );
      band.position.y = 0.22;
      const paintTop = new THREE.Mesh(
        new THREE.CylinderGeometry(0.21, 0.21, 0.03, 14),
        glossyClayMat(item.color, 0.2),
      );
      paintTop.position.y = 0.43;
      const swatch = new THREE.Mesh(
        new RoundedBoxGeometry(0.14, 0.12, 0.04, 2, 0.015),
        clayMat(item.accentColor || item.color, 0.5),
      );
      swatch.position.set(0, 0.22, 0.235);
      const handle = new THREE.Mesh(
        new THREE.TorusGeometry(0.25, 0.018, 6, 12, Math.PI),
        clayMat('#9AA5B1', 0.35, 0.65),
      );
      handle.position.y = 0.34;
      handle.rotation.x = 0.42;
      const stick = new THREE.Mesh(
        new THREE.CylinderGeometry(0.024, 0.024, 0.36, 7),
        clayMat('#C58F5B', 0.7),
      );
      stick.position.set(0.08, 0.54, -0.02);
      stick.rotation.z = -0.35;
      const brushHead = new THREE.Mesh(
        item.kind === 'wall_paint'
          ? new THREE.CylinderGeometry(0.05, 0.05, 0.18, 10)
          : new RoundedBoxGeometry(0.12, 0.08, 0.04, 2, 0.01),
        clayMat(item.color, 0.6),
      );
      if (item.kind === 'wall_paint') {
        brushHead.rotation.z = Math.PI / 2;
      }
      brushHead.position.set(0.14, 0.68, -0.02);
      g.add(can, band, paintTop, swatch, handle, stick, brushHead);
      break;
    }
  }

  return g;
}
