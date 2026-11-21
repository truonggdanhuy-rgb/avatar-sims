import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {TUN_AVATAR} from '../data/avatarCatalog';
import {TimeOfDay} from '../types/game';
import {buildAvatarRig, updateAvatarRigAnimation} from './avatar3d';
import {
  clayMat,
  createCheckerFloorTexture,
  glossyClayMat,
  mergeStaticGroupByMaterial,
} from './materials';
import type {SubzoneWorld} from './subzonesBuilder';
import type {TownAnchor, WorldCollider} from './townBuilder';

export const MALL_HALF_W = 32;
export const MALL_HALF_D = 26;
export const MALL_UPPER_Y = 8.4;
export const MALL_WALL_H = 19.6;
export const MALL_ATRIUM_HALF_W = 16.0;
export const MALL_ATRIUM_HALF_D = 12.0;

export interface MallEscalatorLane {
  id: string;
  side: 'left' | 'right';
  dir: 'up' | 'down';
  startFloor: 1 | 2;
  endFloor: 1 | 2;
  startX: number;
  startY: number;
  startZ: number;
  endX: number;
  endY: number;
  endZ: number;
  approachX: number;
  approachZ: number;
  exitX: number;
  exitZ: number;
  travelRotY: number;
}

// Fixed bidirectional UP + DOWN Escalators on BOTH Left (-X) and Right (+X) wings of May Mall Grand Lobby
export const MALL_ESCALATOR_LANES: MallEscalatorLane[] = [
  {
    id: 'esc_left_up',
    side: 'left',
    dir: 'up',
    startFloor: 1,
    endFloor: 2,
    startX: -16.8,
    startY: 0,
    startZ: -1.8,
    endX: -27.2,
    endY: MALL_UPPER_Y,
    endZ: -1.8,
    approachX: -15.3,
    approachZ: -1.8,
    exitX: -28.6,
    exitZ: -1.8,
    travelRotY: -Math.PI / 2,
  },
  {
    id: 'esc_left_down',
    side: 'left',
    dir: 'down',
    startFloor: 2,
    endFloor: 1,
    startX: -27.2,
    startY: MALL_UPPER_Y,
    startZ: 1.8,
    endX: -16.8,
    endY: 0,
    endZ: 1.8,
    approachX: -28.6,
    approachZ: 1.8,
    exitX: -15.3,
    exitZ: 1.8,
    travelRotY: Math.PI / 2,
  },
  {
    id: 'esc_right_up',
    side: 'right',
    dir: 'up',
    startFloor: 1,
    endFloor: 2,
    startX: 16.8,
    startY: 0,
    startZ: -1.8,
    endX: 27.2,
    endY: MALL_UPPER_Y,
    endZ: -1.8,
    approachX: 15.3,
    approachZ: -1.8,
    exitX: 28.6,
    exitZ: -1.8,
    travelRotY: Math.PI / 2,
  },
  {
    id: 'esc_right_down',
    side: 'right',
    dir: 'down',
    startFloor: 2,
    endFloor: 1,
    startX: 27.2,
    startY: MALL_UPPER_Y,
    startZ: 1.8,
    endX: 16.8,
    endY: 0,
    endZ: 1.8,
    approachX: 28.6,
    approachZ: 1.8,
    exitX: 15.3,
    exitZ: 1.8,
    travelRotY: -Math.PI / 2,
  },
];

export function clampMallFloorPoint(x: number, z: number, floor: 1 | 2): {x: number; z: number} {
  let cx = THREE.MathUtils.clamp(x, -(MALL_HALF_W - 1.25), MALL_HALF_W - 1.25);
  let cz = THREE.MathUtils.clamp(z, -(MALL_HALF_D - 1.25), MALL_HALF_D - 1.25);

  if (floor === 2) {
    // Keep away from the central atrium glass railing opening (|x| < 16.0 && |z| < 12.0)
    const atrW = MALL_ATRIUM_HALF_W + 0.45;
    const atrD = MALL_ATRIUM_HALF_D + 0.45;
    if (Math.abs(cx) < atrW && Math.abs(cz) < atrD) {
      const pushX = atrW - Math.abs(cx);
      const pushZ = atrD - Math.abs(cz);
      if (pushX < pushZ) {
        cx = (cx >= 0 ? 1 : -1) * atrW;
      } else {
        cz = (cz >= 0 ? 1 : -1) * atrD;
      }
    }

    // Keep away from the Left & Right escalator stairwell wells (16.4 <= |x| <= 27.35 && |z| < 3.85)
    const absX = Math.abs(cx);
    if (absX > 16.4 && absX < 27.35 && Math.abs(cz) < 3.85) {
      const sign = cx >= 0 ? 1 : -1;
      const dOuter = 27.35 - absX;
      const dSide = 3.85 - Math.abs(cz);
      if (dOuter <= dSide) {
        cx = sign * 27.35;
      } else {
        cz = (cz >= 0 ? 1 : -1) * 3.85;
      }
    }
  }

  return {x: cx, z: cz};
}

function addMallProxy(
  parent: THREE.Object3D,
  size: [number, number, number],
  pos: [number, number, number],
  userData: Record<string, unknown>,
  targets: THREE.Object3D[],
) {
  const proxy = new THREE.Mesh(
    new THREE.BoxGeometry(size[0], size[1], size[2]),
    new THREE.MeshBasicMaterial({visible: false}),
  );
  proxy.position.set(pos[0], pos[1], pos[2]);
  proxy.userData = userData;
  parent.add(proxy);
  targets.push(proxy);
}

const MALL_SIGN_FONT = '"Plus Jakarta Sans", "Segoe UI", "Roboto", Arial, sans-serif';

function makeMallSignTexture(
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  disposables: THREE.Texture[],
  isDisposed?: () => boolean,
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (ctx) {
    draw(ctx, w, h);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  disposables.push(tex);

  if (typeof document !== 'undefined' && document.fonts?.ready) {
    void document.fonts.ready.then(() => {
      if (isDisposed?.()) return;
      const c2 = c.getContext('2d');
      if (!c2) return;
      c2.clearRect(0, 0, w, h);
      draw(c2, w, h);
      tex.needsUpdate = true;
    });
  }
  return tex;
}

function createWelcomeMallBannerTexture(
  disposables: THREE.Texture[],
  isDisposed: () => boolean,
): THREE.CanvasTexture {
  return makeMallSignTexture(
    1024,
    256,
    (ctx, w, h) => {
      // Soft creamy-ivory pastel gradient with zero harsh stripes
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#FFFDF8');
      bg.addColorStop(1, '#FFF3E4');
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.roundRect(4, 4, w - 8, h - 8, 44);
      ctx.fill();

      // Gentle pastel double scalloped-feel inner border
      ctx.strokeStyle = '#FF9EAA';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.roundRect(14, 14, w - 28, h - 28, 36);
      ctx.stroke();

      ctx.strokeStyle = '#F7D27A';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(24, 24, w - 48, h - 48, 28);
      ctx.stroke();

      // Soft decorative pastel bokeh dots on left & right margins
      const dotColors = ['#FFD6DE', '#CBEFFF', '#FFE8A3', '#CFF3E4'];
      [
        [68, 72, 16, 0],
        [96, 182, 11, 1],
        [114, 62, 8, 2],
        [w - 68, 72, 16, 1],
        [w - 96, 182, 11, 0],
        [w - 114, 62, 8, 3],
      ].forEach(([dx, dy, dr, ci]) => {
        ctx.fillStyle = dotColors[ci];
        ctx.beginPath();
        ctx.arc(dx, dy, dr, 0, Math.PI * 2);
        ctx.fill();
      });

      // Crisp clean Vietnamese main title (weight 700 matches Plus Jakarta Sans cleanly!)
      ctx.fillStyle = '#2B3553';
      ctx.font = `700 56px ${MALL_SIGN_FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('CHÀO MỪNG ĐẾN MÂY MALL', w * 0.5, 96);

      // Soft pastel pill badge underneath for general mall categories
      const pillW = 590;
      const pillH = 54;
      ctx.fillStyle = '#FFE4EA';
      ctx.beginPath();
      ctx.roundRect((w - pillW) * 0.5, 152, pillW, pillH, 27);
      ctx.fill();
      ctx.strokeStyle = '#FFB6C6';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.fillStyle = '#B8415E';
      ctx.font = `700 29px ${MALL_SIGN_FONT}`;
      ctx.fillText('Ăn uống  •  Mua sắm  •  Giải trí', w * 0.5, 180);
    },
    disposables,
    isDisposed,
  );
}

function createStorefrontSignTexture(
  shopName: string,
  accentHex: string,
  pillHex: string,
  textHex: string,
  disposables: THREE.Texture[],
  isDisposed: () => boolean,
): THREE.CanvasTexture {
  return makeMallSignTexture(
    512,
    128,
    (ctx, w, h) => {
      ctx.fillStyle = '#FFFDF7';
      ctx.beginPath();
      ctx.roundRect(4, 4, w - 8, h - 8, 32);
      ctx.fill();

      ctx.fillStyle = pillHex;
      ctx.beginPath();
      ctx.roundRect(14, 14, w - 28, h - 28, 24);
      ctx.fill();

      ctx.strokeStyle = accentHex;
      ctx.lineWidth = 5;
      ctx.stroke();

      // Cute flanking pastel dots
      [48, w - 48].forEach((dx) => {
        ctx.fillStyle = accentHex;
        ctx.beginPath();
        ctx.arc(dx, h * 0.5, 9, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.fillStyle = textHex;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `700 44px ${MALL_SIGN_FONT}`;
      ctx.fillText(shopName, w * 0.5, h * 0.5 + 2);
    },
    disposables,
    isDisposed,
  );
}

function buildSculptedCloud(scale: number, mat: THREE.Material): THREE.Group {
  const cloud = new THREE.Group();
  const puffs: [number, number, number, number][] = [
    [0, 0.08, 0, 0.34],
    [-0.28, 0, 0.02, 0.25],
    [0.28, 0.01, -0.02, 0.26],
    [-0.14, -0.05, 0.08, 0.22],
    [0.14, -0.05, 0.08, 0.22],
  ];
  puffs.forEach(([x, y, z, r]) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 12), mat);
    m.scale.set(1.06, 0.88, 0.72);
    m.position.set(x, y, z);
    cloud.add(m);
  });
  cloud.scale.setScalar(scale);
  return cloud;
}

function buildSculptedStar(outerR: number, depth: number, mat: THREE.Material): THREE.Mesh {
  const shape = new THREE.Shape();
  const innerR = outerR * 0.48;
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    const px = Math.cos(a) * r;
    const py = -Math.sin(a) * r;
    if (i === 0) shape.moveTo(px, py);
    else shape.lineTo(px, py);
  }
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: depth * 0.28,
    bevelSize: outerR * 0.08,
    bevelSegments: 2,
  });
  geo.center();
  return new THREE.Mesh(geo, mat);
}

function buildSculptedBow(mat: THREE.Material, scale = 1): THREE.Group {
  const bow = new THREE.Group();
  [-1, 1].forEach((side) => {
    const loop = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.055, 10, 18), mat);
    loop.scale.set(1.25, 0.82, 0.75);
    loop.position.set(side * 0.16, 0.04, 0);
    loop.rotation.z = side * -0.25;
    const tail = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.24, 0.04, 2, 0.015), mat);
    tail.position.set(side * 0.11, -0.14, 0.01);
    tail.rotation.z = side * 0.32;
    bow.add(loop, tail);
  });
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 10), mat);
  knot.scale.set(1, 0.9, 0.85);
  bow.add(knot);
  bow.scale.setScalar(scale);
  return bow;
}

type MallIconKind = 'boba' | 'bag' | 'gift' | 'cloud_star' | 'fashion' | 'mart';

function buildSculptedMallIcon(kind: MallIconKind, scale = 1): THREE.Group {
  const g = new THREE.Group();
  const creamMat = glossyClayMat('#FFF9EE', 0.35);
  const goldMat = glossyClayMat('#FFD166', 0.25);
  const berryMat = glossyClayMat('#FF7A9C', 0.32);
  const mintMat = glossyClayMat('#6ED6BD', 0.34);
  const skyMat = glossyClayMat('#78C7FF', 0.34);
  const chocoMat = clayMat('#4C342B', 0.55);

  if (kind === 'boba') {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.17, 0.44, 16), creamMat);
    cup.position.y = -0.06;
    const teaBand = new THREE.Mesh(new THREE.CylinderGeometry(0.225, 0.19, 0.22, 16), berryMat);
    teaBand.position.y = -0.09;
    const lid = new THREE.Mesh(new THREE.SphereGeometry(0.245, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), creamMat);
    lid.position.y = 0.15;
    const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.34, 8), mintMat);
    straw.position.set(0.06, 0.3, 0);
    straw.rotation.z = -0.2;
    g.add(cup, teaBand, lid, straw);
    [-0.08, 0, 0.08].forEach((px, idx) => {
      const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.038, 8, 8), chocoMat);
      pearl.position.set(px, -0.21 + (idx % 2) * 0.035, 0.17);
      g.add(pearl);
    });
  } else if (kind === 'bag') {
    const bag = new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.44, 0.18, 3, 0.05), skyMat);
    bag.position.y = -0.08;
    const cuff = new THREE.Mesh(new RoundedBoxGeometry(0.48, 0.1, 0.19, 2, 0.03), creamMat);
    cuff.position.y = 0.11;
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.028, 8, 16, Math.PI), goldMat);
    handle.position.set(0, 0.16, 0);
    const badge = buildSculptedStar(0.11, 0.04, goldMat);
    badge.position.set(0, -0.09, 0.11);
    g.add(bag, cuff, handle, badge);
  } else if (kind === 'gift') {
    const box = new THREE.Mesh(new RoundedBoxGeometry(0.44, 0.36, 0.24, 3, 0.045), creamMat);
    box.position.y = -0.08;
    const lid = new THREE.Mesh(new RoundedBoxGeometry(0.49, 0.11, 0.27, 2, 0.035), berryMat);
    lid.position.y = 0.11;
    const ribV = new THREE.Mesh(new RoundedBoxGeometry(0.08, 0.44, 0.28, 1, 0.015), berryMat);
    ribV.position.y = -0.04;
    const bow = buildSculptedBow(goldMat, 0.72);
    bow.position.set(0, 0.22, 0);
    g.add(box, lid, ribV, bow);
  } else if (kind === 'cloud_star') {
    const cloud = buildSculptedCloud(0.75, creamMat);
    cloud.position.set(-0.04, -0.06, 0);
    const star = buildSculptedStar(0.15, 0.05, goldMat);
    star.position.set(0.16, 0.14, 0.08);
    star.rotation.z = 0.25;
    g.add(cloud, star);
  } else if (kind === 'fashion') {
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.29, 0.04, 18), berryMat);
    brim.position.y = -0.04;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), berryMat);
    dome.scale.set(1.15, 0.65, 1.05);
    dome.position.y = 0.06;
    const ribbon = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.024, 8, 18), creamMat);
    ribbon.rotation.x = Math.PI / 2;
    ribbon.position.y = 0.0;
    const pip = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.06, 8), goldMat);
    pip.position.y = 0.19;
    g.add(brim, dome, ribbon, pip);
  } else {
    const basket = new THREE.Mesh(new RoundedBoxGeometry(0.48, 0.28, 0.24, 3, 0.04), glossyClayMat('#DDA86D', 0.45));
    basket.position.y = -0.1;
    const apple = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), berryMat);
    apple.position.set(-0.1, 0.08, 0.02);
    const citrus = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), goldMat);
    citrus.position.set(0.1, 0.07, -0.01);
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), mintMat);
    leaf.scale.set(1.4, 0.6, 0.7);
    leaf.position.set(0.02, 0.18, 0.02);
    g.add(basket, apple, citrus, leaf);
  }

  g.scale.setScalar(scale);
  return g;
}

function buildSculptedHangingRibbonBanner(cfg: {
  x: number;
  y: number;
  z: number;
  ribbonHex: string;
  trimHex: string;
  icon: MallIconKind;
  goldMat: THREE.Material;
  silverMat: THREE.Material;
}): THREE.Group {
  const banner = new THREE.Group();
  banner.position.set(cfg.x, cfg.y, cfg.z);

  const ribbonMat = glossyClayMat(cfg.ribbonHex, 0.44);
  const trimMat = glossyClayMat(cfg.trimHex, 0.42);
  const creamMat = glossyClayMat('#FFFBF2', 0.42);

  // Sculpted swallowtail pennant body using extruded custom silhouette!
  const w = 1.95;
  const h = 3.15;
  const notch = 0.48;
  const shape = new THREE.Shape();
  shape.moveTo(-w * 0.5, h * 0.5);
  shape.lineTo(w * 0.5, h * 0.5);
  shape.lineTo(w * 0.5, -h * 0.5);
  shape.lineTo(0, -h * 0.5 + notch);
  shape.lineTo(-w * 0.5, -h * 0.5);
  shape.closePath();

  const bodyGeo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.08,
    bevelEnabled: true,
    bevelThickness: 0.035,
    bevelSize: 0.035,
    bevelSegments: 2,
  });
  bodyGeo.center();
  const bodyMesh = new THREE.Mesh(bodyGeo, ribbonMat);
  banner.add(bodyMesh);

  // Cute pastel inner scallop/rounded frame plate on BOTH front & back (never blank or backwards!)
  [-0.065, 0.065].forEach((fz) => {
    const innerPad = new THREE.Mesh(new RoundedBoxGeometry(1.54, 2.08, 0.04, 3, 0.16), creamMat);
    innerPad.position.set(0, 0.14, fz);
    const halo = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.04, 24), trimMat);
    halo.rotation.x = Math.PI / 2;
    halo.position.set(0, 0.16, fz + (fz > 0 ? 0.025 : -0.025));
    banner.add(innerPad, halo);

    const iconGroup = buildSculptedMallIcon(cfg.icon, 1.32);
    iconGroup.position.set(0, 0.16, fz + (fz > 0 ? 0.14 : -0.14));
    if (fz < 0) iconGroup.rotation.y = Math.PI;
    banner.add(iconGroup);
  });

  // Gold top dowel rod with cute sphere finials & hanging wire
  const dowel = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 2.38, 10), cfg.goldMat);
  dowel.rotation.z = Math.PI / 2;
  dowel.position.set(0, h * 0.5 + 0.06, 0);
  banner.add(dowel);
  [-1.22, 1.22].forEach((fx) => {
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 8), cfg.goldMat);
    finial.position.set(fx, h * 0.5 + 0.06, 0);
    banner.add(finial);
  });

  const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.25, 6), cfg.silverMat);
  wire.position.set(0, h * 0.5 + 0.72, 0);
  banner.add(wire);

  // Cute sculpted 3D ribbon bow perched on top & dangling star charm below!
  const topBow = buildSculptedBow(trimMat, 1.15);
  topBow.position.set(0, h * 0.5 + 0.14, 0.08);
  const bottomCharm = buildSculptedStar(0.24, 0.07, cfg.goldMat);
  bottomCharm.position.set(0, -h * 0.5 + notch - 0.34, 0);
  const charmCord = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.28, 6), cfg.goldMat);
  charmCord.position.set(0, -h * 0.5 + notch - 0.14, 0);
  banner.add(topBow, bottomCharm, charmCord);

  return banner;
}

function buildSculptedShadowboxRelief(
  kind: 'tun' | 'car' | 'bike' | 'skate',
  cedarMat: THREE.Material,
  darkWoodMat: THREE.Material,
): THREE.Group {
  const box = new THREE.Group();
  const shojiCream = clayMat('#FFF8EC', 0.74);
  const goldMat = glossyClayMat('#FFD166', 0.25);

  const outerFrame = new THREE.Mesh(new RoundedBoxGeometry(1.78, 2.12, 0.14, 3, 0.045), darkWoodMat);
  const innerTrim = new THREE.Mesh(new RoundedBoxGeometry(1.62, 1.96, 0.15, 2, 0.03), cedarMat);
  const matBoard = new THREE.Mesh(new RoundedBoxGeometry(1.48, 1.82, 0.16, 2, 0.02), shojiCream);
  box.add(outerFrame, innerTrim, matBoard);

  const haloHex =
    kind === 'tun'
      ? '#FFE2EA'
      : kind === 'car'
        ? '#D9F0FF'
        : kind === 'bike'
          ? '#D6F5EA'
          : '#FFE8D6';
  const halo = new THREE.Mesh(
    new THREE.CylinderGeometry(0.56, 0.56, 0.03, 28),
    clayMat(haloHex, 0.65),
  );
  halo.rotation.x = Math.PI / 2;
  halo.position.set(0, 0.12, 0.085);
  box.add(halo);

  // Cute wooden nameplate strip at bottom (zero Japanese text, clean minimal emblem bar)
  const pillColor =
    kind === 'tun' ? '#E85D75' : kind === 'car' ? '#3B8CE0' : kind === 'bike' ? '#35A88F' : '#F0714D';
  const badgeBar = new THREE.Mesh(
    new RoundedBoxGeometry(0.98, 0.16, 0.045, 2, 0.04),
    glossyClayMat(pillColor, 0.36),
  );
  badgeBar.position.set(0, -0.64, 0.095);
  box.add(badgeBar);
  [-0.36, 0.36].forEach((sx) => {
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), goldMat);
    dot.position.set(sx, -0.64, 0.12);
    box.add(dot);
  });

  // Sculpted 3D miniature relief inside frame
  const relief = new THREE.Group();
  relief.position.set(0, 0.12, 0.13);

  if (kind === 'tun') {
    const cloud = buildSculptedCloud(1.05, glossyClayMat('#FFFFFF', 0.36));
    cloud.position.set(0, -0.06, 0);
    const star = buildSculptedStar(0.24, 0.06, goldMat);
    star.position.set(0.24, 0.22, 0.06);
    star.rotation.z = 0.22;
    const miniHeart = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), glossyClayMat('#FF7A9C', 0.3));
    miniHeart.position.set(-0.26, 0.18, 0.05);
    relief.add(cloud, star, miniHeart);
  } else if (kind === 'car') {
    const blueMat = glossyClayMat('#47A8FF', 0.24);
    const cabinMat = glossyClayMat('#C2EEFF', 0.22);
    const tireMat = clayMat('#242B36', 0.78);
    const body = new THREE.Mesh(new RoundedBoxGeometry(0.92, 0.26, 0.14, 3, 0.09), blueMat);
    body.position.y = -0.05;
    const roof = new THREE.Mesh(new RoundedBoxGeometry(0.52, 0.2, 0.12, 3, 0.07), cabinMat);
    roof.position.set(-0.02, 0.12, -0.01);
    relief.add(body, roof);
    [-0.27, 0.27].forEach((wx) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.14, 16), tireMat);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(wx, -0.18, 0.02);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.15, 12), goldMat);
      hub.rotation.x = Math.PI / 2;
      hub.position.set(wx, -0.18, 0.025);
      relief.add(wheel, hub);
    });
  } else if (kind === 'bike') {
    const mintMat = glossyClayMat('#38C2A6', 0.28);
    const tireMat = clayMat('#2C333E', 0.78);
    const wickerMat = clayMat('#D8A368', 0.65);
    [-0.28, 0.28].forEach((wx) => {
      const tire = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.032, 10, 20), tireMat);
      tire.position.set(wx, -0.13, 0);
      relief.add(tire);
    });
    const topBar = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.04, 0.05, 1, 0.015), mintMat);
    topBar.position.set(0, 0.06, 0.01);
    const downBar = new THREE.Mesh(new RoundedBoxGeometry(0.44, 0.04, 0.05, 1, 0.015), mintMat);
    downBar.position.set(0.03, -0.05, 0.01);
    downBar.rotation.z = 0.56;
    const seatPost = new THREE.Mesh(new RoundedBoxGeometry(0.04, 0.3, 0.05, 1, 0.015), mintMat);
    seatPost.position.set(-0.16, 0.02, 0.01);
    seatPost.rotation.z = 0.22;
    const basket = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.14, 0.09, 2, 0.02), wickerMat);
    basket.position.set(0.32, 0.12, 0.03);
    const saddle = new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.045, 0.07, 2, 0.015), clayMat('#8F5230', 0.6));
    saddle.position.set(-0.19, 0.17, 0.02);
    relief.add(topBar, downBar, seatPost, basket, saddle);
  } else {
    const deckMat = glossyClayMat('#FF6F61', 0.3);
    const tealMat = glossyClayMat('#3BC4B2', 0.3);
    const deckGroup = new THREE.Group();
    deckGroup.rotation.z = 0.42;
    const deck = new THREE.Mesh(new RoundedBoxGeometry(0.86, 0.2, 0.06, 3, 0.09), deckMat);
    const stripe = new THREE.Mesh(new RoundedBoxGeometry(0.28, 0.205, 0.068, 2, 0.01), tealMat);
    deckGroup.add(deck, stripe);
    [-0.24, 0.24].forEach((wx) => {
      const wheel = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 10), goldMat);
      wheel.position.set(wx, -0.12, 0.03);
      deckGroup.add(wheel);
    });
    const starA = buildSculptedStar(0.11, 0.035, goldMat);
    starA.position.set(-0.34, 0.26, 0.03);
    relief.add(deckGroup, starA);
  }

  box.add(relief);
  return box;
}

function buildShopWindowDisplay(kind: MallIconKind): THREE.Group {
  const display = new THREE.Group();
  const standMat = clayMat('#FFF8ED', 0.55);
  [-1.4, 0, 1.4].forEach((ox, idx) => {
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.4, 0.32 + (idx === 1 ? 0.18 : 0), 14), standMat);
    ped.position.set(ox, 0.16 + (idx === 1 ? 0.09 : 0), 0);
    const item = buildSculptedMallIcon(kind, idx === 1 ? 0.92 : 0.72);
    item.position.set(ox, 0.52 + (idx === 1 ? 0.18 : 0), 0);
    item.rotation.y = (idx - 1) * 0.25;
    display.add(ped, item);
  });
  return display;
}

function buildFuturisticMiniConvertible(): THREE.Group {
  // Petite, soft-curved, luxurious single-seater futuristic blue convertible car (~2.15m x 1.24m)
  const car = new THREE.Group();

  const blueBodyMat = new THREE.MeshStandardMaterial({
    color: '#46A4FF',
    roughness: 0.2,
    metalness: 0.34,
    envMapIntensity: 1.05,
  });
  const blueDeepMat = new THREE.MeshStandardMaterial({
    color: '#2570C8',
    roughness: 0.24,
    metalness: 0.38,
    envMapIntensity: 0.9,
  });
  const pearlWhiteMat = glossyClayMat('#F5FAFF', 0.22);
  const chromeMat = new THREE.MeshStandardMaterial({
    color: '#E6EFF7',
    roughness: 0.16,
    metalness: 0.78,
    envMapIntensity: 1.1,
  });
  const creamSeatMat = glossyClayMat('#FFF6E6', 0.52);
  const seatPipingMat = glossyClayMat('#65B9FF', 0.42);
  const darkCabinMat = clayMat('#1E2A3B', 0.72);
  const tireMat = clayMat('#222933', 0.84);
  const cyanGlowMat = new THREE.MeshStandardMaterial({
    color: '#C2F6FF',
    emissive: '#4CE0FF',
    emissiveIntensity: 1.15,
    roughness: 0.18,
  });
  const headLightMat = new THREE.MeshStandardMaterial({
    color: '#FFFFFF',
    emissive: '#B6F1FF',
    emissiveIntensity: 1.25,
    roughness: 0.12,
  });
  const glassVisorMat = new THREE.MeshStandardMaterial({
    color: '#9BE0FF',
    roughness: 0.08,
    metalness: 0.14,
    transparent: true,
    opacity: 0.46,
  });

  // Soft sculpted lower aero tub + chrome splitter skirt
  const lowerTub = new THREE.Mesh(
    new RoundedBoxGeometry(1.16, 0.26, 2.08, 4, 0.12),
    blueDeepMat,
  );
  lowerTub.position.set(0, 0.24, 0);
  car.add(lowerTub);

  const aeroSkirt = new THREE.Mesh(
    new RoundedBoxGeometry(1.22, 0.06, 2.14, 3, 0.03),
    chromeMat,
  );
  aeroSkirt.position.set(0, 0.14, 0);
  car.add(aeroSkirt);

  // Soft rounded chubby sculpted main shell (front & rear fenders seamlessly blended)
  const frontShell = new THREE.Mesh(new THREE.SphereGeometry(0.62, 22, 16), blueBodyMat);
  frontShell.scale.set(0.98, 0.48, 1.12);
  frontShell.position.set(0, 0.38, 0.44);
  car.add(frontShell);

  const rearShell = new THREE.Mesh(new THREE.SphereGeometry(0.63, 22, 16), blueBodyMat);
  rearShell.scale.set(0.99, 0.56, 1.08);
  rearShell.position.set(0, 0.43, -0.44);
  car.add(rearShell);

  // Smooth connecting center side body sills (flanking single cockpit)
  [-0.47, 0.47].forEach((sx) => {
    const sill = new THREE.Mesh(
      new RoundedBoxGeometry(0.24, 0.34, 1.48, 4, 0.11),
      blueBodyMat,
    );
    sill.position.set(sx, 0.41, 0);
    const sideAccent = new THREE.Mesh(
      new RoundedBoxGeometry(0.03, 0.045, 1.04, 2, 0.015),
      cyanGlowMat,
    );
    sideAccent.position.set(sx + (sx < 0 ? -0.115 : 0.115), 0.36, -0.02);
    car.add(sill, sideAccent);
  });

  // Pearl-White Luxury Hood Crest + Glowing Cute Curved LED Smile Bar & Crystal Headlights
  const hoodCap = new THREE.Mesh(new THREE.SphereGeometry(0.38, 18, 12), pearlWhiteMat);
  hoodCap.scale.set(1.06, 0.28, 1.24);
  hoodCap.position.set(0, 0.5, 0.54);
  car.add(hoodCap);

  const grilleBar = new THREE.Mesh(
    new RoundedBoxGeometry(0.56, 0.055, 0.12, 3, 0.025),
    cyanGlowMat,
  );
  grilleBar.position.set(0, 0.29, 1.04);
  car.add(grilleBar);

  [-0.38, 0.38].forEach((hx) => {
    const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.02, 8, 16), chromeMat);
    bezel.position.set(hx, 0.42, 0.94);
    bezel.rotation.y = hx * 0.25;
    const lens = new THREE.Mesh(new THREE.SphereGeometry(0.092, 12, 10), headLightMat);
    lens.scale.set(1.0, 0.88, 0.58);
    lens.position.set(hx, 0.42, 0.94);
    car.add(bezel, lens);
  });

  // Single-Seater Open Cockpit Tub & Cozy Cream Luxury Bucket Seat
  const cockpitRecess = new THREE.Mesh(
    new RoundedBoxGeometry(0.74, 0.18, 0.92, 3, 0.06),
    darkCabinMat,
  );
  cockpitRecess.position.set(0, 0.42, -0.04);
  car.add(cockpitRecess);

  const seatCushion = new THREE.Mesh(
    new RoundedBoxGeometry(0.54, 0.12, 0.48, 3, 0.05),
    creamSeatMat,
  );
  seatCushion.position.set(0, 0.51, -0.14);
  const seatBack = new THREE.Mesh(
    new RoundedBoxGeometry(0.52, 0.44, 0.13, 3, 0.055),
    creamSeatMat,
  );
  seatBack.position.set(0, 0.72, -0.36);
  seatBack.rotation.x = -0.22;
  const headrest = new THREE.Mesh(
    new RoundedBoxGeometry(0.32, 0.18, 0.11, 3, 0.05),
    creamSeatMat,
  );
  headrest.position.set(0, 0.98, -0.42);
  headrest.rotation.x = -0.15;
  const seatTrim = new THREE.Mesh(
    new RoundedBoxGeometry(0.56, 0.04, 0.5, 2, 0.015),
    seatPipingMat,
  );
  seatTrim.position.set(0, 0.55, -0.14);
  car.add(seatCushion, seatBack, headrest, seatTrim);

  // Sleek Chrome Sport Convertible Roll-Hoop + Tail Fin Accent Behind the 1-Person Seat
  const rollHoop = new THREE.Mesh(
    new THREE.TorusGeometry(0.28, 0.036, 10, 20, Math.PI),
    chromeMat,
  );
  rollHoop.position.set(0, 0.76, -0.52);
  rollHoop.rotation.x = -0.18;
  const deckLid = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), pearlWhiteMat);
  deckLid.scale.set(0.95, 0.25, 0.85);
  deckLid.position.set(0, 0.63, -0.68);
  car.add(rollHoop, deckLid);

  // Futuristic Holographic Dashboard Pod & Compact Butterfly Yoke Steering Wheel
  const dashCowling = new THREE.Mesh(
    new RoundedBoxGeometry(0.68, 0.16, 0.26, 3, 0.06),
    pearlWhiteMat,
  );
  dashCowling.position.set(0, 0.62, 0.29);
  const holoScreen = new THREE.Mesh(
    new RoundedBoxGeometry(0.34, 0.12, 0.025, 2, 0.01),
    cyanGlowMat,
  );
  holoScreen.position.set(0, 0.73, 0.24);
  holoScreen.rotation.x = -0.35;

  const steerColumn = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.035, 0.22, 8), chromeMat);
  steerColumn.rotation.x = 0.85;
  steerColumn.position.set(0, 0.64, 0.17);
  const steerYoke = new THREE.Mesh(
    new THREE.TorusGeometry(0.115, 0.022, 8, 16, Math.PI * 1.35),
    blueDeepMat,
  );
  steerYoke.rotation.z = -Math.PI * 0.175;
  steerYoke.rotation.x = -0.58;
  steerYoke.position.set(0, 0.68, 0.1);
  car.add(dashCowling, holoScreen, steerColumn, steerYoke);

  // Curved Wrap-Around Translucent Aero Windshield + Satin Chrome Frame & Cute Wing Mirrors
  const windshield = new THREE.Mesh(
    new THREE.CylinderGeometry(0.48, 0.54, 0.34, 22, 1, true, -Math.PI * 0.38, Math.PI * 0.76),
    glassVisorMat,
  );
  windshield.position.set(0, 0.76, 0.18);
  windshield.rotation.x = -0.42;
  const wsRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.47, 0.024, 8, 22, Math.PI * 0.76),
    chromeMat,
  );
  wsRim.position.set(0, 0.91, 0.11);
  wsRim.rotation.x = Math.PI / 2 - 0.42;
  wsRim.rotation.z = Math.PI * 0.12;
  car.add(windshield, wsRim);

  [-0.58, 0.58].forEach((mx) => {
    const stalk = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.025, 0.03), chromeMat);
    stalk.position.set(mx, 0.59, 0.28);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), pearlWhiteMat);
    cap.scale.set(1.2, 0.75, 1.3);
    cap.position.set(mx + (mx < 0 ? -0.05 : 0.05), 0.61, 0.28);
    car.add(stalk, cap);
  });

  // Rear Futuristic Light Strip + Twin Soft Jet Diffuser Rings
  const rearStrip = new THREE.Mesh(
    new RoundedBoxGeometry(0.76, 0.05, 0.06, 2, 0.02),
    cyanGlowMat,
  );
  rearStrip.position.set(0, 0.46, -1.06);
  car.add(rearStrip);
  [-0.26, 0.26].forEach((tx) => {
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.095, 0.09, 12), chromeMat);
    pod.rotation.x = Math.PI / 2;
    pod.position.set(tx, 0.26, -1.04);
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.1, 10), cyanGlowMat);
    core.rotation.x = Math.PI / 2;
    core.position.set(tx, 0.26, -1.045);
    car.add(pod, core);
  });

  // 4 Wide Cute Futuristic Aero Wheels with Glowing Cyan Rim Strips & Star Caps
  [
    [-0.54, 0.64],
    [0.54, 0.64],
    [-0.54, -0.62],
    [0.54, -0.62],
  ].forEach(([wx, wz]) => {
    const wGroup = new THREE.Group();
    wGroup.position.set(wx, 0.22, wz);

    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.16, 18), tireMat);
    tire.rotation.z = Math.PI / 2;

    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.145, 0.17, 16), chromeMat);
    rim.rotation.z = Math.PI / 2;

    const sideSign = wx < 0 ? -1 : 1;
    const ledRing = new THREE.Mesh(new THREE.TorusGeometry(0.142, 0.015, 8, 18), cyanGlowMat);
    ledRing.rotation.y = Math.PI / 2;
    ledRing.position.x = sideSign * 0.086;

    const hub = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), blueBodyMat);
    hub.scale.set(0.55, 1, 1);
    hub.position.x = sideSign * 0.088;

    wGroup.add(tire, rim, ledRing, hub);
    car.add(wGroup);
  });

  return car;
}

function buildShowroomBicycle(): THREE.Group {
  const bike = new THREE.Group();
  const standMat = clayMat('#CFD8E3', 0.35, 0.6);
  const frameMat = glossyClayMat('#43C6AC', 0.28);
  const chromeMat = new THREE.MeshStandardMaterial({color: '#EEF3F8', roughness: 0.18, metalness: 0.72});
  const tireMat = clayMat('#2B313B', 0.84);
  const leatherMat = clayMat('#995B34', 0.62);
  const basketMat = clayMat('#DEB47B', 0.74);

  // Showroom U-stand
  const standBase = new THREE.Mesh(new RoundedBoxGeometry(0.56, 0.05, 1.56, 2, 0.02), standMat);
  standBase.position.set(0, 0.025, 0);
  const cradleL = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.36, 7), standMat);
  cradleL.position.set(-0.1, 0.2, -0.45);
  const cradleR = cradleL.clone();
  cradleR.position.x = 0.1;
  bike.add(standBase, cradleL, cradleR);

  // Wheels
  [-0.5, 0.5].forEach((wz) => {
    const tire = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.04, 10, 22), tireMat);
    tire.rotation.y = Math.PI / 2;
    tire.position.set(0, 0.34, wz);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.255, 0.015, 8, 20), chromeMat);
    rim.rotation.y = Math.PI / 2;
    rim.position.set(0, 0.34, wz);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.1, 10), chromeMat);
    hub.rotation.z = Math.PI / 2;
    hub.position.set(0, 0.34, wz);
    bike.add(tire, rim, hub);
    for (let s = 0; s < 4; s++) {
      const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.5, 4), chromeMat);
      spoke.rotation.x = (s * Math.PI) / 4;
      spoke.position.set(0, 0.34, wz);
      bike.add(spoke);
    }
  });

  // Frame diamond + front fork
  const addBar = (a: [number, number, number], b: [number, number, number], r: number, mat: THREE.Material) => {
    const va = new THREE.Vector3(...a);
    const vb = new THREE.Vector3(...b);
    const dist = va.distanceTo(vb);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(r, r, dist, 8), mat);
    bar.position.copy(va).lerp(vb, 0.5);
    bar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
    bike.add(bar);
  };
  addBar([0, 0.34, -0.5], [0, 0.34, -0.05], 0.022, frameMat);
  addBar([0, 0.34, -0.5], [0, 0.74, -0.18], 0.022, frameMat);
  addBar([0, 0.34, -0.05], [0, 0.84, -0.2], 0.025, frameMat);
  addBar([0, 0.34, -0.05], [0, 0.72, 0.34], 0.025, frameMat);
  addBar([0, 0.74, -0.18], [0, 0.76, 0.33], 0.024, frameMat);
  addBar([0, 0.34, 0.5], [0, 0.86, 0.32], 0.024, frameMat);

  // Saddle & Handlebar + Wicker Basket
  const saddle = new THREE.Mesh(new RoundedBoxGeometry(0.18, 0.07, 0.28, 2, 0.03), leatherMat);
  saddle.position.set(0, 0.88, -0.22);
  const hBar = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.52, 8), chromeMat);
  hBar.rotation.z = Math.PI / 2;
  hBar.position.set(0, 0.91, 0.31);
  [-0.23, 0.23].forEach((gx) => {
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.1, 8), leatherMat);
    grip.rotation.z = Math.PI / 2;
    grip.position.set(gx, 0.91, 0.31);
    bike.add(grip);
  });
  const basket = new THREE.Mesh(new RoundedBoxGeometry(0.28, 0.2, 0.22, 2, 0.03), basketMat);
  basket.position.set(0, 0.78, 0.44);
  const lampOrb = new THREE.Mesh(
    new THREE.SphereGeometry(0.048, 8, 8),
    new THREE.MeshStandardMaterial({color: '#FFF8D6', emissive: '#FFE082', emissiveIntensity: 0.7}),
  );
  lampOrb.position.set(0, 0.76, 0.56);
  bike.add(saddle, hBar, basket, lampOrb);

  return bike;
}

function buildSkateboardRack(): THREE.Group {
  // Energetic display rack holding 2 sporty skateboards
  const rack = new THREE.Group();
  const standSlateMat = clayMat('#2B3646', 0.48, 0.45);
  const chromeMat = new THREE.MeshStandardMaterial({color: '#DFE8F2', roughness: 0.22, metalness: 0.7});
  const gripMat = clayMat('#1F2329', 0.92);

  // Base platform + A-frame vertical rails + sporty accent bar
  const basePlate = new THREE.Mesh(new RoundedBoxGeometry(1.52, 0.08, 0.82, 2, 0.03), standSlateMat);
  basePlate.position.y = 0.04;
  rack.add(basePlate);

  [-0.62, 0.62].forEach((px) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 1.05, 8), chromeMat);
    post.position.set(px, 0.55, -0.18);
    rack.add(post);
  });
  const topHeader = new THREE.Mesh(new RoundedBoxGeometry(1.36, 0.14, 0.08, 2, 0.03), standSlateMat);
  topHeader.position.set(0, 1.06, -0.18);
  const neonStrip = new THREE.Mesh(
    new RoundedBoxGeometry(1.18, 0.04, 0.09, 1, 0.01),
    new THREE.MeshStandardMaterial({color: '#A5F3FC', emissive: '#38BDF8', emissiveIntensity: 0.9}),
  );
  neonStrip.position.set(0, 1.06, -0.18);
  rack.add(topHeader, neonStrip);

  const boards: {x: number; deckCol: string; stripeCol: string; wheelCol: string; tiltY: number}[] = [
    {x: -0.34, deckCol: '#FF6B6B', stripeCol: '#FFF4B8', wheelCol: '#4EE0FF', tiltY: 0.08},
    {x: 0.34, deckCol: '#38BDF8', stripeCol: '#FFD166', wheelCol: '#FF7B8E', tiltY: -0.08},
  ];
  boards.forEach(({x, deckCol, stripeCol, wheelCol, tiltY}) => {
    // Support bracket
    const arm = new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.045, 0.24, 2, 0.015), chromeMat);
    arm.position.set(x, 0.22, 0.02);
    rack.add(arm);

    const sb = new THREE.Group();
    sb.position.set(x, 0.62, 0.06);
    sb.rotation.x = -0.26;
    sb.rotation.y = tiltY;

    const deckMat = glossyClayMat(deckCol, 0.34);
    const stripeMat = glossyClayMat(stripeCol, 0.3);
    const whMat = glossyClayMat(wheelCol, 0.32);

    const midDeck = new THREE.Mesh(new RoundedBoxGeometry(0.28, 0.72, 0.024, 2, 0.01), deckMat);
    const grip = new THREE.Mesh(new RoundedBoxGeometry(0.26, 0.68, 0.012, 1, 0.005), gripMat);
    grip.position.z = -0.012;
    const stripe = new THREE.Mesh(new RoundedBoxGeometry(0.08, 0.64, 0.014, 1, 0.005), stripeMat);
    stripe.position.z = 0.012;

    const nose = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.024, 14), deckMat);
    nose.rotation.x = Math.PI / 2;
    nose.rotation.z = 0.01;
    nose.position.set(0, 0.36, -0.018);

    const tail = nose.clone();
    tail.position.set(0, -0.36, -0.018);

    sb.add(midDeck, grip, stripe, nose, tail);

    // Dual metal trucks + 4 urethane wheels facing forward cleanly!
    [-0.22, 0.22].forEach((ty) => {
      const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.24, 8), chromeMat);
      axle.rotation.z = Math.PI / 2;
      axle.position.set(0, ty, 0.05);
      const basepad = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.04), standSlateMat);
      basepad.position.set(0, ty, 0.028);
      sb.add(axle, basepad);

      [-0.125, 0.125].forEach((wx) => {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.044, 0.04, 12), whMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(wx, ty, 0.05);
        sb.add(wheel);
      });
    });

    rack.add(sb);
  });

  return rack;
}

export function buildMallInteriorScene(): SubzoneWorld {
  const group = new THREE.Group();
  const clickTargets: THREE.Object3D[] = [];
  const labelAnchors: TownAnchor[] = [];
  const colliders: WorldCollider[] = [];
  const disposables: THREE.Texture[] = [];
  let disposed = false;
  const isDisposed = () => disposed;

  // Shared materials
  const pearlWallMat = clayMat('#FAF6EE', 0.72);
  const upperWallMat = clayMat('#FFFBF4', 0.68);
  const creamTrimMat = clayMat('#E8DFCF', 0.64);
  const silverMat = clayMat('#CBD6E2', 0.34, 0.45);
  const darkMetalMat = clayMat('#334155', 0.45, 0.42);
  const warmWoodMat = clayMat('#C6925D', 0.68);
  const goldMat = glossyClayMat('#EAC264', 0.24);
  const skyAccentMat = clayMat('#6CC5F0', 0.48);
  const warmLampMat = new THREE.MeshStandardMaterial({
    color: '#FFF8DF',
    emissive: '#FFD678',
    emissiveIntensity: 0.38,
    roughness: 0.24,
  });
  const glassRailMat = new THREE.MeshStandardMaterial({
    color: '#CBEFFF',
    roughness: 0.1,
    metalness: 0.12,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
  });
  const windowPaneMat = new THREE.MeshStandardMaterial({
    color: '#D5F1FF',
    emissive: '#8ED8F8',
    emissiveIntensity: 0.16,
    roughness: 0.18,
  });
  const ceilingLightMat = new THREE.MeshStandardMaterial({
    color: '#FFFDF5',
    emissive: '#FFE8A3',
    emissiveIntensity: 0.85,
    roughness: 0.18,
  });

  // ========== 1. MASSIVE GROUND FLOOR (64m x 52m) + NON-OVERLAPPING INLAID CENTRAL MEDALLION ==========
  const floor1Tex = createCheckerFloorTexture('#F7F2E7', '#ECE4D3');
  floor1Tex.repeat.set(18, 15);
  disposables.push(floor1Tex);
  const groundMesh = new THREE.Mesh(
    new THREE.BoxGeometry(MALL_HALF_W * 2, 0.5, MALL_HALF_D * 2),
    new THREE.MeshStandardMaterial({map: floor1Tex, roughness: 0.56, metalness: 0.04}),
  );
  groundMesh.position.y = -0.25;
  groundMesh.userData = {kind: 'ground', mallFloor: 1};
  group.add(groundMesh);

  // Decorative plaza medallion ring under the vehicle showroom (clean vertical offsets — zero Z-fighting)
  const plazaRingOuter = new THREE.Mesh(
    new THREE.CylinderGeometry(8.6, 8.6, 0.04, 48),
    clayMat('#DFEEF7', 0.55),
  );
  plazaRingOuter.position.set(0.6, 0.025, 0);
  const plazaRingInner = new THREE.Mesh(
    new THREE.CylinderGeometry(6.8, 6.8, 0.04, 48),
    clayMat('#FFF9EF', 0.52),
  );
  plazaRingInner.position.set(0.6, 0.055, 0);
  group.add(plazaRingOuter, plazaRingInner);

  // ========== 2. MASSIVE UPPER FLOOR 2 MEZZANINE (DISJOINT NON-OVERLAPPING DECK PANELS) ==========
  const floor2Tex = createCheckerFloorTexture('#F6F0E4', '#E6DCC8');
  floor2Tex.repeat.set(14, 12);
  disposables.push(floor2Tex);
  const floor2Mat = new THREE.MeshStandardMaterial({map: floor2Tex, roughness: 0.58, metalness: 0.04});

  const floor2WalkGroup = new THREE.Group();
  const makeFloor2DeckPanel = (cx: number, cz: number, w: number, d: number) => {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(w, 0.48, d), floor2Mat);
    slab.position.set(cx, MALL_UPPER_Y - 0.24, cz);
    slab.userData = {kind: 'ground', mallFloor: 2};
    floor2WalkGroup.add(slab);
  };

  // Disjoint deck rectangles leaving Central Atrium & Escalator Wells cleanly open with ZERO overlap
  // North & South Full Promenade Wings (z = -26..-12 and +12..+26, full 64m wide)
  makeFloor2DeckPanel(0, -19.0, MALL_HALF_W * 2, 14.0);
  makeFloor2DeckPanel(0, 19.0, MALL_HALF_W * 2, 14.0);
  // West Outer Wing behind Left Escalators (x = -32..-27.2, z = -12..+12)
  makeFloor2DeckPanel(-29.6, 0, 4.8, 24.0);
  // West Mid Wings North & South of Left Escalator Well (x = -27.2..-16.8, z = -12..-3.6 & +3.6..+12)
  makeFloor2DeckPanel(-22.0, -7.8, 10.4, 8.4);
  makeFloor2DeckPanel(-22.0, 7.8, 10.4, 8.4);
  // West Inner Strip Between Atrium Rail & Escalator Landing (x = -16.8..-16.0, z = -12..+12)
  makeFloor2DeckPanel(-16.4, 0, 0.8, 24.0);
  // East Outer Wing behind Right Escalators (x = +27.2..+32, z = -12..+12)
  makeFloor2DeckPanel(29.6, 0, 4.8, 24.0);
  // East Mid Wings North & South of Right Escalator Well (x = +16.8..+27.2, z = -12..-3.6 & +3.6..+12)
  makeFloor2DeckPanel(22.0, -7.8, 10.4, 8.4);
  makeFloor2DeckPanel(22.0, 7.8, 10.4, 8.4);
  // East Inner Strip Between Atrium Rail & Escalator Landing (x = +16.0..+16.8, z = -12..+12)
  makeFloor2DeckPanel(16.4, 0, 0.8, 24.0);

  group.add(floor2WalkGroup);

  // ========== 3. GLASS ATRIUM BALUSTRADES + ESCALATOR WELL RAILINGS ON FLOOR 2 ==========
  const railStatic = new THREE.Group();
  const addBalustrade = (x0: number, z0: number, x1: number, z1: number, baseY = MALL_UPPER_Y) => {
    const dx = x1 - x0;
    const dz = z1 - z0;
    const len = Math.hypot(dx, dz);
    if (len < 0.2) return;
    const ang = Math.atan2(dx, dz);
    const midX = (x0 + x1) * 0.5;
    const midZ = (z0 + z1) * 0.5;

    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.94, Math.max(0.1, len - 0.08)), glassRailMat);
    glass.position.set(midX, baseY + 0.56, midZ);
    glass.rotation.y = ang;
    const topCap = new THREE.Mesh(new RoundedBoxGeometry(0.09, 0.06, len + 0.04, 1, 0.02), silverMat);
    topCap.position.set(midX, baseY + 1.06, midZ);
    topCap.rotation.y = ang;
    const curb = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, Math.max(0.1, len - 0.02)), creamTrimMat);
    curb.position.set(midX, baseY + 0.07, midZ);
    curb.rotation.y = ang;
    railStatic.add(glass, topCap, curb);

    const posts = Math.max(2, Math.round(len / 3.2) + 1);
    for (let i = 0; i < posts; i++) {
      const t = i / (posts - 1);
      const px = THREE.MathUtils.lerp(x0, x1, t);
      const pz = THREE.MathUtils.lerp(z0, z1, t);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.04, 1.04, 7), darkMetalMat);
      post.position.set(px, baseY + 0.54, pz);
      railStatic.add(post);
    }
  };

  // Central Atrium Void Balustrades (Floor 2 overlooking Floor 1)
  addBalustrade(-MALL_ATRIUM_HALF_W, -MALL_ATRIUM_HALF_D, MALL_ATRIUM_HALF_W, -MALL_ATRIUM_HALF_D);
  addBalustrade(-MALL_ATRIUM_HALF_W, MALL_ATRIUM_HALF_D, MALL_ATRIUM_HALF_W, MALL_ATRIUM_HALF_D);
  addBalustrade(-MALL_ATRIUM_HALF_W, -MALL_ATRIUM_HALF_D, -MALL_ATRIUM_HALF_W, MALL_ATRIUM_HALF_D);
  addBalustrade(MALL_ATRIUM_HALF_W, -MALL_ATRIUM_HALF_D, MALL_ATRIUM_HALF_W, MALL_ATRIUM_HALF_D);

  // Side railings framing Left & Right Escalator Wells on Floor 2 (leaving x = ±27.2 open for boarding/exit)
  [-1, 1].forEach((side) => {
    const innerX = side * 16.8;
    const outerX = side * 27.2;
    const minX = Math.min(innerX, outerX);
    const maxX = Math.max(innerX, outerX);
    addBalustrade(minX, -3.6, maxX, -3.6);
    addBalustrade(minX, 3.6, maxX, 3.6);
    addBalustrade(innerX, -3.6, innerX, 3.6);
    colliders.push({
      type: 'box',
      id: `mall_f2_esc_well_${side < 0 ? 'l' : 'r'}`,
      x: side * 22.0,
      z: 0,
      hw: 5.0,
      hd: 3.6,
    });
  });

  // Floor 2 Central Atrium Void Collider (keeps Floor 2 walkers safely behind glass railings)
  colliders.push({
    type: 'box',
    id: 'mall_f2_atrium',
    x: 0,
    z: 0,
    hw: MALL_ATRIUM_HALF_W + 0.15,
    hd: MALL_ATRIUM_HALF_D + 0.15,
  });

  // Architectural Wood Fascia Band Lining Inner Atrium Rim (recessed slightly below MALL_UPPER_Y so zero coplanar Z-fighting!)
  [
    [0, -(MALL_ATRIUM_HALF_D - 0.12), MALL_ATRIUM_HALF_W * 2 - 0.24, 0.22],
    [0, MALL_ATRIUM_HALF_D - 0.12, MALL_ATRIUM_HALF_W * 2 - 0.24, 0.22],
    [-(MALL_ATRIUM_HALF_W - 0.12), 0, 0.22, MALL_ATRIUM_HALF_D * 2 - 0.48],
    [MALL_ATRIUM_HALF_W - 0.12, 0, 0.22, MALL_ATRIUM_HALF_D * 2 - 0.48],
  ].forEach(([fx, fz, fw, fd]) => {
    const trim = new THREE.Mesh(new THREE.BoxGeometry(fw, 0.44, fd), warmWoodMat);
    trim.position.set(fx, MALL_UPPER_Y - 0.28, fz);
    railStatic.add(trim);
  });
  mergeStaticGroupByMaterial(railStatic);
  group.add(railStatic);

  // ========== 4. TALL PERIMETER WALLS, NON-Z-FIGHTING WINDOWS & FULLY ENCLOSED CEILING WITH LIGHTS ==========
  const shellGroup = new THREE.Group();
  const ceilingLightsGroup = new THREE.Group();
  const WALL_H = MALL_WALL_H;

  // Perimeter Walls (North, West, East solid; South has wide sunlit glass portal!)
  const wallN = new THREE.Mesh(new THREE.BoxGeometry(MALL_HALF_W * 2 + 0.8, WALL_H, 0.6), pearlWallMat);
  wallN.position.set(0, WALL_H * 0.5, -MALL_HALF_D - 0.2);
  const wallW = new THREE.Mesh(new THREE.BoxGeometry(0.6, WALL_H, MALL_HALF_D * 2 + 0.8), pearlWallMat);
  wallW.position.set(-MALL_HALF_W - 0.2, WALL_H * 0.5, 0);
  const wallE = wallW.clone();
  wallE.position.x = MALL_HALF_W + 0.2;

  // South Wall with Central Glass Entrance Gap (x = -3.4..+3.4, y = 0..4.8 open)
  const wallSL = new THREE.Mesh(new THREE.BoxGeometry(MALL_HALF_W - 3.2, WALL_H, 0.6), pearlWallMat);
  wallSL.position.set(-(MALL_HALF_W + 3.2) * 0.5, WALL_H * 0.5, MALL_HALF_D + 0.2);
  const wallSR = wallSL.clone();
  wallSR.position.x = (MALL_HALF_W + 3.2) * 0.5;
  const wallSCrown = new THREE.Mesh(new THREE.BoxGeometry(6.8, WALL_H - 4.8, 0.6), pearlWallMat);
  wallSCrown.position.set(0, 4.8 + (WALL_H - 4.8) * 0.5, MALL_HALF_D + 0.2);
  shellGroup.add(wallN, wallW, wallE, wallSL, wallSR, wallSCrown);

  // Structural Columns Supporting Floor 2 Mezzanine & Enclosed Coffered Ceiling
  for (let cx = -24; cx <= 24; cx += 16) {
    [-12.2, 12.2].forEach((cz) => {
      if (Math.abs(cx) === 8) return;
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, WALL_H - 0.3, 14), upperWallMat);
      col.position.set(cx, (WALL_H - 0.3) * 0.5, cz);
      const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.62, 0.58, 14), creamTrimMat);
      plinth.position.set(cx, 0.29, cz);
      const goldBand = new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.47, 0.16, 14), goldMat);
      goldBand.position.set(cx, MALL_UPPER_Y - 0.26, cz);
      shellGroup.add(col, plinth, goldBand);
      colliders.push({type: 'circle', id: `mall_f1_col_${cx}_${cz}`, x: cx, z: cz, r: 0.62});
      colliders.push({type: 'circle', id: `mall_f2_col_${cx}_${cz}`, x: cx, z: cz, r: 0.62});
    });
  }

  // Ground Storefront Alcoves, Cute Rounded Shop Signs, Pastel Awnings & 3D Window Displays
  const northShops: {
    bx: number;
    name: string;
    accent: string;
    pill: string;
    fg: string;
    awningA: string;
    awningB: string;
    icon: MallIconKind;
  }[] = [
    {bx: -24, name: 'THỜI TRANG', accent: '#F28CA3', pill: '#FFEAF0', fg: '#9A3150', awningA: '#F59BB0', awningB: '#FFF9FB', icon: 'fashion'},
    {bx: -12, name: 'TRÀ SỮA', accent: '#4EB8A2', pill: '#E6FAF5', fg: '#1D6B5B', awningA: '#62C7B2', awningB: '#FFFDF8', icon: 'boba'},
    {bx: 0, name: 'XE CỘ MÂY', accent: '#549EE0', pill: '#E9F4FF', fg: '#1F5588', awningA: '#6AB2EC', awningB: '#FFFFFF', icon: 'cloud_star'},
    {bx: 12, name: 'QUÀ TẶNG', accent: '#EE8B60', pill: '#FFF0E6', fg: '#9E4020', awningA: '#F49D72', awningB: '#FFF9F4', icon: 'gift'},
    {bx: 24, name: 'SIÊU THỊ', accent: '#6B8AD6', pill: '#EDF2FF', fg: '#2C4685', awningA: '#809EE2', awningB: '#FFFFFF', icon: 'mart'},
  ];

  northShops.forEach(({bx, name, accent, pill, fg, awningA, awningB, icon}) => {
    const bayFrame = new THREE.Mesh(new RoundedBoxGeometry(9.4, 4.4, 0.18, 2, 0.04), creamTrimMat);
    bayFrame.position.set(bx, 2.35, -MALL_HALF_D + 0.22);
    const bayPane = new THREE.Mesh(new THREE.BoxGeometry(8.5, 3.6, 0.08), skyAccentMat);
    bayPane.position.set(bx, 2.35, -MALL_HALF_D + 0.36);

    const shopTex = createStorefrontSignTexture(name, accent, pill, fg, disposables, isDisposed);
    const shopSignFrame = new THREE.Mesh(
      new RoundedBoxGeometry(6.85, 1.56, 0.2, 4, 0.28),
      glossyClayMat(accent, 0.42),
    );
    shopSignFrame.position.set(bx, 5.55, -MALL_HALF_D + 0.34);
    const shopSignMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(6.45, 1.3),
      new THREE.MeshBasicMaterial({map: shopTex}),
    );
    shopSignMesh.position.set(bx, 5.55, -MALL_HALF_D + 0.46);

    // Cute 3D sculpted emblem flanking the left end of each boutique sign
    const signBadge = buildSculptedMallIcon(icon, 1.05);
    signBadge.position.set(bx - 3.65, 5.55, -MALL_HALF_D + 0.56);
    group.add(signBadge);

    // Soft rounded pastel boutique awning scallops
    for (let s = 0; s < 6; s++) {
      const awStripe = new THREE.Mesh(
        new RoundedBoxGeometry(1.46, 0.24, 1.12, 2, 0.08),
        clayMat(s % 2 === 0 ? awningA : awningB, 0.52),
      );
      awStripe.position.set(bx - 3.65 + s * 1.46, 4.38, -MALL_HALF_D + 0.72);
      awStripe.rotation.x = 0.26;
      shellGroup.add(awStripe);
    }

    // Storefront window display pad + cute 3D miniature showcase items
    const winMannequinPad = new THREE.Mesh(
      new RoundedBoxGeometry(5.8, 0.42, 0.42, 2, 0.06),
      clayMat(awningA, 0.5),
    );
    winMannequinPad.position.set(bx, 0.8, -MALL_HALF_D + 0.62);
    const winItems = buildShopWindowDisplay(icon);
    winItems.position.set(bx, 1.01, -MALL_HALF_D + 0.64);

    shellGroup.add(bayFrame, bayPane, shopSignFrame, winMannequinPad);
    group.add(shopSignMesh, winItems);

    // North Floor 2 Upper Clerestory Windows
    const f2WinFrameN = new THREE.Mesh(new RoundedBoxGeometry(9.2, 3.6, 0.16, 2, 0.04), creamTrimMat);
    f2WinFrameN.position.set(bx, MALL_UPPER_Y + 4.8, -MALL_HALF_D + 0.21);
    const f2WinPaneN = new THREE.Mesh(new THREE.BoxGeometry(8.4, 2.9, 0.06), windowPaneMat);
    f2WinPaneN.position.set(bx, MALL_UPPER_Y + 4.8, -MALL_HALF_D + 0.33);
    shellGroup.add(f2WinFrameN, f2WinPaneN);

    // South Floor 2 Upper Clerestory Windows
    const f2WinFrameS = new THREE.Mesh(new RoundedBoxGeometry(9.2, 3.6, 0.16, 2, 0.04), creamTrimMat);
    f2WinFrameS.position.set(bx, MALL_UPPER_Y + 4.8, MALL_HALF_D - 0.21);
    const f2WinPaneS = new THREE.Mesh(new THREE.BoxGeometry(8.4, 2.9, 0.06), windowPaneMat);
    f2WinPaneS.position.set(bx, MALL_UPPER_Y + 4.8, MALL_HALF_D - 0.33);
    shellGroup.add(f2WinFrameS, f2WinPaneS);
  });

  // Grand Suspended Sculpted 3D Atrium Welcome Banner ("CHÀO MỪNG ĐẾN MÂY MALL" + "Ăn uống · Mua sắm · Giải trí")
  const welcomeTex = createWelcomeMallBannerTexture(disposables, isDisposed);
  const welcomeBannerGroup = new THREE.Group();
  const wbWidth = 13.4;
  const wbHeight = 2.75;
  const wbY = 6.25;
  const wbZ = -MALL_ATRIUM_HALF_D + 0.42;

  const wbFrame = new THREE.Mesh(
    new RoundedBoxGeometry(wbWidth + 0.5, wbHeight + 0.45, 0.24, 4, 0.42),
    glossyClayMat('#FFA3B5', 0.36),
  );
  wbFrame.position.set(0, wbY, wbZ);
  const wbFront = new THREE.Mesh(
    new THREE.PlaneGeometry(wbWidth, wbHeight),
    new THREE.MeshBasicMaterial({map: welcomeTex}),
  );
  wbFront.position.set(0, wbY, wbZ + 0.13);
  const wbBack = new THREE.Mesh(
    new THREE.PlaneGeometry(wbWidth, wbHeight),
    new THREE.MeshBasicMaterial({map: welcomeTex}),
  );
  wbBack.position.set(0, wbY, wbZ - 0.13);
  wbBack.rotation.y = Math.PI;
  welcomeBannerGroup.add(wbFrame, wbFront, wbBack);

  // Cute sculpted 3D puffy clouds, pastel bow & golden stars framing the welcome board
  const cloudWhiteMat = glossyClayMat('#FFFFFF', 0.34);
  [-1, 1].forEach((side) => {
    const cloudCorner = buildSculptedCloud(1.85, cloudWhiteMat);
    cloudCorner.position.set(side * (wbWidth * 0.5 + 0.18), wbY + 0.15, wbZ + 0.12);
    const starTop = buildSculptedStar(0.32, 0.09, goldMat);
    starTop.position.set(side * (wbWidth * 0.36), wbY + wbHeight * 0.5 + 0.25, wbZ + 0.14);
    starTop.rotation.z = side * -0.2;
    welcomeBannerGroup.add(cloudCorner, starTop);
  });
  const centerBow = buildSculptedBow(glossyClayMat('#FF7A9C', 0.34), 1.45);
  centerBow.position.set(0, wbY + wbHeight * 0.5 + 0.3, wbZ + 0.14);
  welcomeBannerGroup.add(centerBow);

  [-5.2, 0, 5.2].forEach((rx) => {
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 1.85, 6), silverMat);
    cable.position.set(rx, wbY + wbHeight * 0.5 + 0.9, wbZ);
    welcomeBannerGroup.add(cable);
  });
  group.add(welcomeBannerGroup);

  // 4 Cute Sculpted 3D Pastel Hanging Mall Ribbon Banners (no backwards text, 3D icons on both faces!)
  const hangingBannerSpecs: {
    x: number;
    y: number;
    z: number;
    ribbonHex: string;
    trimHex: string;
    icon: MallIconKind;
  }[] = [
    {x: -12.6, y: 5.75, z: -MALL_ATRIUM_HALF_D + 0.45, ribbonHex: '#FF9EB5', trimHex: '#FFE2EA', icon: 'boba'},
    {x: 12.6, y: 5.75, z: -MALL_ATRIUM_HALF_D + 0.45, ribbonHex: '#7BCDF5', trimHex: '#E0F5FF', icon: 'bag'},
    {x: -10.5, y: 5.75, z: MALL_ATRIUM_HALF_D - 0.45, ribbonHex: '#F9CF6B', trimHex: '#FFF5D6', icon: 'gift'},
    {x: 10.5, y: 5.75, z: MALL_ATRIUM_HALF_D - 0.45, ribbonHex: '#7DD6BA', trimHex: '#E0FAF1', icon: 'cloud_star'},
  ];
  hangingBannerSpecs.forEach((cfg) => {
    const banner = buildSculptedHangingRibbonBanner({
      ...cfg,
      goldMat,
      silverMat,
    });
    group.add(banner);
  });

  // Soft Pastel Rounded Bunting Garland Along Atrium Ceiling Rim
  const buntingColors = ['#FF9EAA', '#FFD87D', '#7ED6C2', '#89C8F5', '#F7B2D9'];
  for (let i = -14; i <= 14; i += 2) {
    if (Math.abs(i) < 7) continue;
    const flagColor = buntingColors[Math.abs(i) % buntingColors.length];
    const flagMesh = new THREE.Mesh(
      new RoundedBoxGeometry(0.46, 0.52, 0.06, 2, 0.14),
      clayMat(flagColor, 0.52),
    );
    flagMesh.rotation.z = Math.PI / 4;
    flagMesh.position.set(i * 0.96, 7.66, -MALL_ATRIUM_HALF_D + 0.35);
    const bead = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), goldMat);
    bead.position.set(i * 0.96, 7.98, -MALL_ATRIUM_HALF_D + 0.35);
    shellGroup.add(flagMesh, bead);
  }

  // Fully Enclosed Coffered Ceiling across ENTIRE 64m x 52m Interior (Zero open skylight or stray bands!)
  const mainCeiling = new THREE.Mesh(
    new THREE.BoxGeometry(MALL_HALF_W * 2 + 0.8, 0.4, MALL_HALF_D * 2 + 0.8),
    upperWallMat,
  );
  mainCeiling.position.set(0, WALL_H + 0.2, 0);
  shellGroup.add(mainCeiling);

  // Architectural Coffer Crossbeams along Ceiling
  for (let bz = -18; bz <= 18; bz += 9) {
    const beamX = new THREE.Mesh(new THREE.BoxGeometry(MALL_HALF_W * 2, 0.34, 0.56), creamTrimMat);
    beamX.position.set(0, WALL_H - 0.17, bz);
    shellGroup.add(beamX);
  }
  for (let bx = -24; bx <= 24; bx += 12) {
    const beamZ = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.34, MALL_HALF_D * 2), creamTrimMat);
    beamZ.position.set(bx, WALL_H - 0.17, 0);
    shellGroup.add(beamZ);
  }

  // Rows of Sleek Recessed Ceiling Lights (Đèn trần) + Central Atrium Accent Rings
  [-21, -9, 9, 21].forEach((lz) => {
    [-22, -11, 0, 11, 22].forEach((lx) => {
      const bezel = new THREE.Mesh(new RoundedBoxGeometry(3.8, 0.12, 2.2, 2, 0.03), silverMat);
      bezel.position.set(lx, WALL_H - 0.08, lz);
      const diffuser = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.08, 1.8), ceilingLightMat);
      diffuser.position.set(lx, WALL_H - 0.16, lz);
      shellGroup.add(bezel);
      ceilingLightsGroup.add(diffuser);
    });
  });

  // Grand Atrium Luminous Pendant Halos Hanging High Beneath the Closed Ceiling (y = WALL_H - 2.2)
  [-9, 0, 9].forEach((hx) => {
    const ringHousing = new THREE.Mesh(new THREE.TorusGeometry(2.35, 0.12, 10, 32), silverMat);
    ringHousing.rotation.x = Math.PI / 2;
    ringHousing.position.set(hx, WALL_H - 2.2, 0);
    const ringGlow = new THREE.Mesh(new THREE.TorusGeometry(2.35, 0.09, 8, 32), ceilingLightMat);
    ringGlow.rotation.x = Math.PI / 2;
    ringGlow.position.set(hx, WALL_H - 2.31, 0);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 8), silverMat);
    stem.position.set(hx, WALL_H - 1.1, 0);
    shellGroup.add(ringHousing, stem);
    ceilingLightsGroup.add(ringGlow);
  });

  mergeStaticGroupByMaterial(shellGroup);
  mergeStaticGroupByMaterial(ceilingLightsGroup);
  group.add(shellGroup, ceilingLightsGroup);

  // ========== 5. ANIMATED LEFT & RIGHT FIXED ESCALATORS (1 UP + 1 DOWN PER SIDE) ==========
  const escStatic = new THREE.Group();

  interface EscalatorAnimMeta {
    lane: MallEscalatorLane;
    stepCount: number;
  }
  const escAnimList: EscalatorAnimMeta[] = [];
  const STEPS_PER_LANE = 26;

  MALL_ESCALATOR_LANES.forEach((lane) => {
    const xLow = lane.side === 'left' ? -16.8 : 16.8;
    const xHigh = lane.side === 'left' ? -27.2 : 27.2;
    const zMid = lane.startZ;
    const dx = xHigh - xLow;
    const dy = MALL_UPPER_Y;
    const diagLen = Math.hypot(dx, dy);
    const slopePitch = Math.atan2(dy, Math.abs(dx)) * (lane.side === 'left' ? -1 : 1);
    const midX = (xLow + xHigh) * 0.5;
    const midY = dy * 0.5;

    // Sloped stainless truss spine
    const truss = new THREE.Mesh(new RoundedBoxGeometry(diagLen + 0.6, 0.44, 1.56, 2, 0.04), silverMat);
    truss.position.set(midX, midY - 0.24, zMid);
    truss.rotation.z = slopePitch;
    escStatic.add(truss);

    // Lower Floor 1 & Upper Floor 2 silver landing comb plates (clean 1cm offset above floor top)
    const plateLow = new THREE.Mesh(new RoundedBoxGeometry(1.35, 0.08, 1.62, 1, 0.02), darkMetalMat);
    plateLow.position.set(xLow + (lane.side === 'left' ? 0.45 : -0.45), 0.05, zMid);
    const plateHigh = new THREE.Mesh(new RoundedBoxGeometry(1.35, 0.08, 1.62, 1, 0.02), darkMetalMat);
    plateHigh.position.set(xHigh + (lane.side === 'left' ? -0.45 : 0.45), MALL_UPPER_Y + 0.05, zMid);
    escStatic.add(plateLow, plateHigh);

    // Dual sloped glass balustrades + dark moving handrails
    [-0.78, 0.78].forEach((oz) => {
      const glassWall = new THREE.Mesh(new THREE.BoxGeometry(diagLen + 0.4, 0.94, 0.05), glassRailMat);
      glassWall.position.set(midX, midY + 0.46, zMid + oz);
      glassWall.rotation.z = slopePitch;
      const handRail = new THREE.Mesh(
        new RoundedBoxGeometry(diagLen + 0.9, 0.085, 0.11, 2, 0.03),
        darkMetalMat,
      );
      handRail.position.set(midX, midY + 0.96, zMid + oz);
      handRail.rotation.z = slopePitch;
      escStatic.add(glassWall, handRail);
    });

    // Click proxy along escalator lane
    const hitSlope = new THREE.Mesh(
      new THREE.BoxGeometry(diagLen + 1.8, 2.1, 1.75),
      new THREE.MeshBasicMaterial({visible: false}),
    );
    hitSlope.position.set(midX, midY + 0.65, zMid);
    hitSlope.rotation.z = slopePitch;
    hitSlope.userData = {kind: 'mall_escalator', laneId: lane.id};
    group.add(hitSlope);
    clickTargets.push(hitSlope);

    escAnimList.push({lane, stepCount: STEPS_PER_LANE});
  });

  // Floor 1 colliders guarding under the diagonal escalator belly
  [-1, 1].forEach((side) => {
    colliders.push({
      type: 'box',
      id: `mall_f1_esc_block_${side < 0 ? 'l' : 'r'}`,
      x: side * 22.0,
      z: 0,
      hw: 5.05,
      hd: 3.55,
    });
  });
  mergeStaticGroupByMaterial(escStatic);
  group.add(escStatic);

  // Single InstancedMesh for ALL 104 Escalator Moving Steps across Left & Right Fixed UP/DOWN lanes!
  const stepGeo = new RoundedBoxGeometry(0.48, 0.3, 1.38, 1, 0.015);
  const stepMat = clayMat('#7D8B99', 0.55, 0.35);
  const totalEscSteps = escAnimList.length * STEPS_PER_LANE;
  const escStepsIM = new THREE.InstancedMesh(stepGeo, stepMat, totalEscSteps);
  escStepsIM.frustumCulled = false;
  group.add(escStepsIM);

  // ========== 6. GRAND LOBBY SHOWROOM DAIS, TUN NPC, FUTURISTIC BLUE MINI CONVERTIBLE, BIKE & SKATEBOARD RACK ==========
  const showcaseGroup = new THREE.Group();

  // Central Low Sleek Showroom Dais (strictly stacked heights — zero Z-fighting)
  const daisX = 0.8;
  const daisZ = -1.2;
  const daisBase = new THREE.Mesh(
    new RoundedBoxGeometry(10.8, 0.11, 5.4, 3, 0.04),
    clayMat('#EDE6D8', 0.5),
  );
  daisBase.position.set(daisX, 0.08, daisZ);
  const daisTop = new THREE.Mesh(
    new RoundedBoxGeometry(10.4, 0.06, 5.0, 3, 0.03),
    clayMat('#FAF8F2', 0.42),
  );
  daisTop.position.set(daisX, 0.165, daisZ);

  // Circular Spotlight Plinth directly under the Futuristic Blue Convertible Car (flush on daisTop y = 0.195)
  const carX = -0.35;
  const carZ = -1.1;
  const turntablePad = new THREE.Mesh(
    new THREE.CylinderGeometry(1.75, 1.85, 0.11, 32),
    clayMat('#DCEFFF', 0.32),
  );
  turntablePad.position.set(carX, 0.25, carZ);
  const turntableRim = new THREE.Mesh(
    new THREE.TorusGeometry(1.78, 0.032, 8, 40),
    new THREE.MeshStandardMaterial({
      color: '#B5EEFF',
      emissive: '#38BDF8',
      emissiveIntensity: 0.95,
      roughness: 0.2,
    }),
  );
  turntableRim.rotation.x = Math.PI / 2;
  turntableRim.position.set(carX, 0.3, carZ);
  showcaseGroup.add(daisBase, daisTop, turntablePad, turntableRim);

  // Japanese-Style Tun Motors Showroom Backdrop Behind Dais (Hinoki cedar beams + Red Lanterns + 4 Sculpted 3D Relief Shadowboxes)
  const jpBackdropZ = daisZ - 2.35;
  const cedarMat = clayMat('#B87B46', 0.68);
  const charcoalWoodMat = clayMat('#2B2624', 0.64);
  const redLacquerMat = clayMat('#C83E35', 0.42);
  const norenIndigoMat = clayMat('#223E5C', 0.78);
  const lanternGlowMat = new THREE.MeshStandardMaterial({
    color: '#FFE5B4',
    emissive: '#FF9E44',
    emissiveIntensity: 0.78,
    roughness: 0.45,
  });

  // Architectural Japanese Showroom Archway & Cedar Slatted Wall Screen
  [-4.4, 6.0].forEach((px) => {
    const pillar = new THREE.Mesh(new RoundedBoxGeometry(0.34, 4.15, 0.34, 2, 0.04), charcoalWoodMat);
    pillar.position.set(px, 2.08, jpBackdropZ);
    const pillarBase = new THREE.Mesh(new RoundedBoxGeometry(0.54, 0.3, 0.54, 2, 0.04), cedarMat);
    pillarBase.position.set(px, 0.15, jpBackdropZ);
    showcaseGroup.add(pillar, pillarBase);
  });

  const archBeam = new THREE.Mesh(new RoundedBoxGeometry(11.6, 0.44, 0.46, 2, 0.05), charcoalWoodMat);
  archBeam.position.set(daisX, 4.05, jpBackdropZ);
  const archTopLip = new THREE.Mesh(new RoundedBoxGeometry(12.2, 0.18, 0.58, 2, 0.04), redLacquerMat);
  archTopLip.position.set(daisX, 4.3, jpBackdropZ);
  const slatPanel = new THREE.Mesh(new RoundedBoxGeometry(10.1, 3.05, 0.14, 2, 0.02), clayMat('#F4ECDC', 0.72));
  slatPanel.position.set(daisX, 2.15, jpBackdropZ - 0.16);
  showcaseGroup.add(archBeam, archTopLip, slatPanel);

  // Vertical Cedar Lattice Slats & Indigo Japanese Noren Curtains with Cute Sculpted Cloud Emblems
  for (let sx = -4.0; sx <= 5.6; sx += 0.48) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3.05, 0.08), cedarMat);
    slat.position.set(sx, 2.15, jpBackdropZ - 0.06);
    showcaseGroup.add(slat);
  }
  const norenCloudMat = clayMat('#FFF8EE', 0.6);
  for (let ni = 0; ni < 5; ni++) {
    const nx = -2.6 + ni * 1.7;
    const noren = new THREE.Mesh(new RoundedBoxGeometry(1.42, 0.58, 0.06, 2, 0.025), norenIndigoMat);
    noren.position.set(nx, 3.55, jpBackdropZ + 0.18);
    const norenCloud = buildSculptedCloud(0.42, norenCloudMat);
    norenCloud.position.set(nx, 3.54, jpBackdropZ + 0.22);
    showcaseGroup.add(noren, norenCloud);
  }

  // Hanging Traditional Japanese Chochin Paper Lanterns at Left & Right Pillars
  [-4.4, 6.0].forEach((lx) => {
    const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 12), lanternGlowMat);
    lantern.scale.set(0.92, 1.28, 0.92);
    lantern.position.set(lx, 3.25, jpBackdropZ + 0.42);
    const capT = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.08, 12), charcoalWoodMat);
    capT.position.set(lx, 3.6, jpBackdropZ + 0.42);
    const capB = capT.clone();
    capB.position.y = 2.9;
    showcaseGroup.add(lantern, capT, capB);
  });

  // 4 Sculpted 3D Hinoki Wooden Wall Relief Shadowboxes (Zero text / zero Japanese characters!)
  const shadowboxSpecs: {x: number; y: number; z: number; kind: 'tun' | 'car' | 'bike' | 'skate'}[] = [
    {x: -2.5, y: 2.15, z: jpBackdropZ + 0.08, kind: 'tun'},
    {x: -0.35, y: 2.15, z: jpBackdropZ + 0.08, kind: 'car'},
    {x: 2.15, y: 2.15, z: jpBackdropZ + 0.08, kind: 'bike'},
    {x: 4.55, y: 2.15, z: jpBackdropZ + 0.08, kind: 'skate'},
  ];
  shadowboxSpecs.forEach(({x, y, z, kind}) => {
    const sb = buildSculptedShadowboxRelief(kind, cedarMat, charcoalWoodMat);
    sb.position.set(x, y, z);
    showcaseGroup.add(sb);
  });

  // Hero Prop 1: Futuristic Cute 1-Seater Blue Luxury Convertible Car
  const carGroup = buildFuturisticMiniConvertible();
  carGroup.position.set(carX, 0.305, carZ);
  carGroup.rotation.y = 0.42;
  group.add(carGroup);
  addMallProxy(
    carGroup,
    [1.6, 1.25, 2.35],
    [0, 0.55, 0],
    {kind: 'mall_display_car', tx: carX, tz: carZ + 2.35},
    clickTargets,
  );
  colliders.push({type: 'circle', id: 'mall_f1_car', x: carX, z: carZ, r: 1.55});

  // Hero Prop 2: Stylized Showroom Bicycle sitting flush on daisTop (0.195)
  const bikeX = 2.45;
  const bikeZ = -0.65;
  const bikeGroup = buildShowroomBicycle();
  bikeGroup.position.set(bikeX, 0.195, bikeZ);
  bikeGroup.rotation.y = -0.52;
  showcaseGroup.add(bikeGroup);
  addMallProxy(
    group,
    [1.1, 1.3, 1.75],
    [bikeX, 0.72, bikeZ],
    {kind: 'mall_display_bike', tx: bikeX, tz: bikeZ + 1.9},
    clickTargets,
  );
  colliders.push({type: 'circle', id: 'mall_f1_bike', x: bikeX, z: bikeZ, r: 0.85});

  // Hero Prop 3: Dynamic Display Rack Holding 2 Sporty Skateboards flush on daisTop (0.195)
  const skateX = 4.65;
  const skateZ = -1.1;
  const skateRackGroup = buildSkateboardRack();
  skateRackGroup.position.set(skateX, 0.195, skateZ);
  skateRackGroup.rotation.y = -0.34;
  showcaseGroup.add(skateRackGroup);
  addMallProxy(
    group,
    [1.65, 1.45, 1.15],
    [skateX, 0.78, skateZ],
    {kind: 'mall_display_skate', tx: skateX, tz: skateZ + 1.8},
    clickTargets,
  );
  colliders.push({type: 'box', id: 'mall_f1_skate', x: skateX, z: skateZ, hw: 0.92, hd: 0.65});

  mergeStaticGroupByMaterial(showcaseGroup);
  group.add(showcaseGroup);

  // Collider guard around Showroom Dais & Japanese Backdrop Screen (keeping front walking space comfortable)
  colliders.push({type: 'box', id: 'mall_f1_dais', x: daisX, z: daisZ, hw: 5.1, hd: 2.1});
  colliders.push({type: 'box', id: 'mall_f1_jp_backdrop', x: daisX, z: jpBackdropZ, hw: 5.4, hd: 0.45});

  // NPC Tun standing 100% flush atop daisTop (top = 0.165 + 0.03 = 0.195) beside the futuristic blue car
  // CRITICAL: Label "Tun" ONLY appears when player walks very close (enforced in WorldCanvas)!
  const TUN_X = -2.65;
  const TUN_Z = 0.95;
  const TUN_BASE_Y = 0.195;
  const tunRig = buildAvatarRig(TUN_AVATAR);
  tunRig.root.position.set(TUN_X, TUN_BASE_Y, TUN_Z);
  tunRig.root.rotation.y = 0.38;
  group.add(tunRig.root);
  addMallProxy(
    tunRig.root,
    [1.05, 1.95, 1.05],
    [0, 0.95, 0],
    {kind: 'npc_tun', tx: -2.25, tz: 2.55},
    clickTargets,
  );
  colliders.push({type: 'circle', id: 'mall_f1_tun', x: TUN_X, z: TUN_Z, r: 0.56});
  labelAnchors.push({
    id: 'npc_tun',
    label: 'Tun',
    worldPos: new THREE.Vector3(TUN_X, TUN_BASE_Y + 2.25, TUN_Z),
  });

  // ========== 7. ATRIUM LOUNGE BENCHES & POTTED PLANTS ON FLOOR 1 PERIMETER ==========
  const lobbyDecor = new THREE.Group();
  const leafMat = clayMat('#52A862', 0.72);
  const potMat = clayMat('#E9DEC9', 0.68);
  [
    [-12.5, -8.5],
    [12.5, -8.5],
    [-12.5, 8.5],
    [12.5, 8.5],
    [-28.5, -22.5],
    [28.5, -22.5],
    [-28.5, 22.5],
    [28.5, 22.5],
  ].forEach(([px, pz], idx) => {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.34, 0.58, 10), potMat);
    pot.position.set(px, 0.29, pz);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 1.05, 7), warmWoodMat);
    trunk.position.set(px, 0.95, pz);
    const crownA = new THREE.Mesh(new THREE.SphereGeometry(0.54, 10, 8), leafMat);
    crownA.position.set(px, 1.56, pz);
    const crownB = new THREE.Mesh(new THREE.SphereGeometry(0.38, 8, 7), leafMat);
    crownB.position.set(px + 0.28, 1.38, pz - 0.14);
    lobbyDecor.add(pot, trunk, crownA, crownB);
    colliders.push({type: 'circle', id: `mall_f1_plant_${idx}`, x: px, z: pz, r: 0.58});
  });

  // 4 Interactive Atrium Benches on Floor 1
  [
    {bx: -8.5, bz: 9.2, rotY: 0},
    {bx: 8.5, bz: 9.2, rotY: 0},
    {bx: -8.5, bz: -9.2, rotY: Math.PI},
    {bx: 8.5, bz: -9.2, rotY: Math.PI},
  ].forEach(({bx, bz, rotY}, idx) => {
    const bench = new THREE.Group();
    bench.position.set(bx, 0, bz);
    bench.rotation.y = rotY;
    const seat = new THREE.Mesh(new RoundedBoxGeometry(2.1, 0.14, 0.72, 2, 0.04), warmWoodMat);
    seat.position.y = 0.42;
    const cushion = new THREE.Mesh(new RoundedBoxGeometry(1.9, 0.08, 0.62, 2, 0.03), clayMat('#F4EFE4', 0.75));
    cushion.position.y = 0.51;
    [-0.85, 0.85].forEach((lx) => {
      const leg = new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.4, 0.6, 1, 0.02), darkMetalMat);
      leg.position.set(lx, 0.2, 0);
      bench.add(leg);
    });
    bench.add(seat, cushion);
    lobbyDecor.add(bench);
    const frontOffZ = rotY === 0 ? 1.05 : -1.05;
    addMallProxy(
      group,
      [2.2, 0.85, 0.95],
      [bx, 0.42, bz + frontOffZ * 0.25],
      {
        kind: 'bench',
        tx: bx,
        tz: bz + frontOffZ,
        seatX: bx,
        seatZ: bz,
        seatY: 0.56,
        sitRotY: rotY,
      },
      clickTargets,
    );
    colliders.push({type: 'box', id: `mall_f1_bench_${idx}`, x: bx, z: bz, hw: 1.15, hd: 0.48});
  });

  mergeStaticGroupByMaterial(lobbyDecor);
  group.add(lobbyDecor);

  // ========== 8. GRAND SOUTH GLASS EXIT PORTAL (Z = +25.4 -> BACK TO TOWN, NO EXIT LABEL) ==========
  const exitPortal = new THREE.Group();
  const exitTrim = new THREE.Mesh(
    new RoundedBoxGeometry(4.45, 0.036, 3.85, 2, 0.012),
    goldMat,
  );
  exitTrim.position.set(0, 0.022, MALL_HALF_D - 2.2);
  const exitRug = new THREE.Mesh(
    new RoundedBoxGeometry(4.12, 0.04, 3.52, 2, 0.015),
    clayMat('#B9464E', 0.82),
  );
  exitRug.position.set(0, 0.046, MALL_HALF_D - 2.2);

  [-3.2, 3.2].forEach((px) => {
    const jamb = new THREE.Mesh(new RoundedBoxGeometry(0.32, 4.7, 0.42, 2, 0.04), creamTrimMat);
    jamb.position.set(px, 2.35, MALL_HALF_D - 0.15);
    exitPortal.add(jamb);
  });
  const header = new THREE.Mesh(new RoundedBoxGeometry(6.8, 0.42, 0.48, 2, 0.04), creamTrimMat);
  header.position.set(0, 4.65, MALL_HALF_D - 0.15);
  const doorGlass = new THREE.Mesh(new THREE.BoxGeometry(5.9, 4.3, 0.08), glassRailMat);
  doorGlass.position.set(0, 2.2, MALL_HALF_D - 0.15);
  const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.12, 4.3, 0.12), silverMat);
  mullion.position.set(0, 2.2, MALL_HALF_D - 0.15);

  exitPortal.add(exitTrim, exitRug, header, doorGlass, mullion);
  mergeStaticGroupByMaterial(exitPortal);
  group.add(exitPortal);

  addMallProxy(
    group,
    [5.8, 3.8, 2.2],
    [0, 1.9, MALL_HALF_D - 0.85],
    {kind: 'exit', tx: 0, tz: MALL_HALF_D - 2.6},
    clickTargets,
  );

  // Keep walkable area inside Floor 1 & Floor 2 clean around walls
  const floor1RayMeshes: THREE.Object3D[] = [groundMesh];
  const floor2RayMeshes: THREE.Object3D[] = floor2WalkGroup.children;

  // Dynamic Update: Tun idle breathing + smooth continuous fixed escalator step loop!
  const _stepDummy = new THREE.Object3D();
  const update = (elapsed: number, timeOfDay: TimeOfDay) => {
    updateAvatarRigAnimation(tunRig, 'idle', elapsed, false);
    const isNight = timeOfDay === 'night';
    warmLampMat.emissiveIntensity = isNight ? 1.1 : 0.36;
    ceilingLightMat.emissiveIntensity = isNight ? 1.15 : 0.85;
    windowPaneMat.emissive.set(isNight ? '#3B6DA6' : '#8ED8F8');
    windowPaneMat.emissiveIntensity = isNight ? 0.28 : 0.16;

    // Smoothly scroll all 4 escalator lanes in 1 shared InstancedMesh (UP moves 0->UPPER, DOWN moves UPPER->0!)
    let instIdx = 0;
    const speedCyclesPerSec = 0.14;
    for (let li = 0; li < escAnimList.length; li++) {
      const {lane, stepCount} = escAnimList[li];
      const offset = (elapsed * speedCyclesPerSec) % 1;
      for (let s = 0; s < stepCount; s++) {
        let u = (s / stepCount + offset) % 1;
        if (u < 0) u += 1;
        const sx = THREE.MathUtils.lerp(lane.startX, lane.endX, u);
        const sy = THREE.MathUtils.lerp(lane.startY, lane.endY, u);
        _stepDummy.position.set(sx, sy - 0.08, lane.startZ);
        _stepDummy.rotation.set(0, 0, 0);
        _stepDummy.updateMatrix();
        escStepsIM.setMatrixAt(instIdx++, _stepDummy.matrix);
      }
    }
    escStepsIM.instanceMatrix.needsUpdate = true;
  };

  return {
    group,
    groundMesh,
    groundMeshes: [...floor1RayMeshes, ...floor2RayMeshes],
    clickTargets,
    labelAnchors,
    colliders,
    update,
    dispose: () => {
      disposed = true;
      disposables.forEach((t) => t.dispose());
      group.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          m.geometry.dispose();
          if (Array.isArray(m.material)) {
            m.material.forEach((mat) => {
              if (!mat.userData?.pooled) mat.dispose();
            });
          } else if (!m.material.userData?.pooled) {
            m.material.dispose();
          }
        }
      });
    },
  };
}
