import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {FurnitureCatalogItem} from '../types/game';
import {clayMat, glossyClayMat} from './materials';

const _clockFaceCache = new Map<string, THREE.CanvasTexture>();
const _calendarFaceCache = new Map<string, THREE.CanvasTexture>();

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
  const petalMat = clayMat(petalHex, 0.48);
  const centerMat = clayMat(centerHex, 0.42);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const petal = new THREE.Mesh(new THREE.SphereGeometry(0.042, 7, 5), petalMat);
    petal.scale.set(0.86, 0.36, 1.35);
    petal.position.set(Math.sin(a) * 0.052, 0.008, Math.cos(a) * 0.052);
    petal.rotation.y = a;
    petal.rotation.x = -0.18;
    fg.add(petal);
  }
  const center = new THREE.Mesh(new THREE.SphereGeometry(0.032, 7, 6), centerMat);
  center.scale.set(1, 0.65, 1);
  center.position.y = 0.014;
  fg.add(center);
  fg.scale.setScalar(scale);
  return fg;
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
