import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {TUN_AVATAR} from '../data/avatarCatalog';
import {AvatarConfig, TimeOfDay} from '../types/game';
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

      if (shopName.trim().length > 0) {
        ctx.fillStyle = textHex;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `700 44px ${MALL_SIGN_FONT}`;
        ctx.fillText(shopName, w * 0.5, h * 0.5 + 2);
      } else {
        // Decorative pastel cloud & star trio when sign text is temporarily hidden
        ctx.fillStyle = '#FFFFFF';
        [
          [w * 0.5 - 32, h * 0.54, 18],
          [w * 0.5, h * 0.48, 24],
          [w * 0.5 + 32, h * 0.54, 18],
        ].forEach(([cx, cy, cr]) => {
          ctx.beginPath();
          ctx.arc(cx, cy, cr, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.fillStyle = accentHex;
        [-96, 96].forEach((ox) => {
          ctx.beginPath();
          ctx.arc(w * 0.5 + ox, h * 0.5, 7, 0, Math.PI * 2);
          ctx.fill();
        });
      }
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

type MallIconKind = 'boba' | 'bag' | 'gift' | 'cloud_star' | 'fashion' | 'mart' | 'japanese';

function buildSculptedMallIcon(kind: MallIconKind, scale = 1): THREE.Group {
  const g = new THREE.Group();
  const creamMat = glossyClayMat('#FFF9EE', 0.35);
  const goldMat = glossyClayMat('#FFD166', 0.25);
  const berryMat = glossyClayMat('#FF7A9C', 0.32);
  const mintMat = glossyClayMat('#6ED6BD', 0.34);
  const skyMat = glossyClayMat('#78C7FF', 0.34);
  const chocoMat = clayMat('#4C342B', 0.55);

  if (kind === 'japanese') {
    const bowlMat = glossyClayMat('#EA6F52', 0.34);
    const brothMat = glossyClayMat('#F7BD5B', 0.28);
    const salmonMat = glossyClayMat('#FF8663', 0.32);
    const noriMat = clayMat('#2B362E', 0.72);
    // Ramen bowl
    const bowl = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 16, 12, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55),
      bowlMat,
    );
    bowl.position.set(-0.08, 0.04, 0);
    const broth = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.03, 16), brothMat);
    broth.position.set(-0.08, 0.02, 0);
    const naruto = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 12), creamMat);
    naruto.position.set(-0.1, 0.04, 0.05);
    const chop1 = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.008, 0.42, 6), goldMat);
    chop1.position.set(-0.02, 0.14, -0.02);
    chop1.rotation.z = -1.1;
    // Salmon nigiri beside bowl
    const rice = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.1, 0.12, 2, 0.035), creamMat);
    rice.position.set(0.18, -0.14, 0.06);
    const salmon = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.045, 0.13, 2, 0.02), salmonMat);
    salmon.position.set(0.18, -0.08, 0.06);
    const noriBand = new THREE.Mesh(new RoundedBoxGeometry(0.04, 0.13, 0.135, 1, 0.008), noriMat);
    noriBand.position.set(0.18, -0.11, 0.06);
    g.add(bowl, broth, naruto, chop1, rice, salmon, noriBand);
  } else if (kind === 'boba') {
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
    new THREE.CylinderGeometry(8.6, 8.6, 0.034, 48),
    clayMat('#DFEEF7', 0.55),
  );
  plazaRingOuter.position.set(0.6, 0.025, 0);
  const plazaRingInner = new THREE.Mesh(
    new THREE.CylinderGeometry(6.8, 6.8, 0.03, 48),
    clayMat('#FFF9EF', 0.52),
  );
  plazaRingInner.position.set(0.6, 0.06, 0);
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

  // Structural Columns with Luminous Capital Bands Supporting Floor 2 & Skylight Vault
  for (let cx = -24; cx <= 24; cx += 16) {
    [-12.2, 12.2].forEach((cz) => {
      if (Math.abs(cx) === 8) return;
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, WALL_H - 0.3, 16), upperWallMat);
      col.position.set(cx, (WALL_H - 0.3) * 0.5, cz);
      const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.65, 0.62, 16), creamTrimMat);
      plinth.position.set(cx, 0.31, cz);
      const plinthGold = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.032, 8, 20), goldMat);
      plinthGold.rotation.x = Math.PI / 2;
      plinthGold.position.set(cx, 0.62, cz);
      const goldBand = new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.47, 0.16, 16), goldMat);
      goldBand.position.set(cx, MALL_UPPER_Y - 0.26, cz);
      const glowRingLow = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.035, 8, 20), warmLampMat);
      glowRingLow.rotation.x = Math.PI / 2;
      glowRingLow.position.set(cx, 3.65, cz);
      const glowRingHigh = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.035, 8, 20), warmLampMat);
      glowRingHigh.rotation.x = Math.PI / 2;
      glowRingHigh.position.set(cx, MALL_UPPER_Y + 4.2, cz);
      shellGroup.add(col, plinth, plinthGold, goldBand, glowRingLow, glowRingHigh);
      colliders.push({type: 'circle', id: `mall_f1_col_${cx}_${cz}`, x: cx, z: cz, r: 0.66});
      colliders.push({type: 'circle', id: `mall_f2_col_${cx}_${cz}`, x: cx, z: cz, r: 0.66});
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
    {bx: -24, name: 'CARTOON DECOR', accent: '#B89CF5', pill: '#F4EEFF', fg: '#543A8C', awningA: '#C7B0FA', awningB: '#FFFDFB', icon: 'cloud_star'},
    {bx: -12, name: 'NHÀ HÀNG NHẬT', accent: '#E06D53', pill: '#FFF2EB', fg: '#7A2714', awningA: '#EB8267', awningB: '#FFF8F2', icon: 'japanese'},
    {bx: 0, name: '', accent: '#549EE0', pill: '#E9F4FF', fg: '#1F5588', awningA: '#6AB2EC', awningB: '#FFFFFF', icon: 'cloud_star'},
    {bx: 12, name: 'ẨM THỰC & CHỢ', accent: '#5CB88A', pill: '#E8FAF0', fg: '#1E6945', awningA: '#70C99B', awningB: '#FFFDF8', icon: 'mart'},
    {bx: 24, name: 'KHU VUI CHƠI', accent: '#F28CA3', pill: '#FFEAF0', fg: '#9A3150', awningA: '#F59BB0', awningB: '#FFF9FB', icon: 'gift'},
  ];

  northShops.forEach(({bx, name, accent, pill, fg, awningA, awningB, icon}) => {
    const bayFrame = new THREE.Mesh(new RoundedBoxGeometry(9.4, 4.4, 0.18, 2, 0.04), creamTrimMat);
    bayFrame.position.set(bx, 2.35, -MALL_HALF_D + 0.22);
    const bayPane = new THREE.Mesh(
      new THREE.BoxGeometry(8.5, 3.6, 0.08),
      icon === 'japanese' ? clayMat('#FFF1E2', 0.62) : skyAccentMat,
    );
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

    // Play Together-inspired warm Japanese chochin lanterns & cozy wood counter accent at Nhà Hàng Nhật (bx = -12)
    if (icon === 'japanese') {
      [-3.85, 3.85].forEach((lx) => {
        const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.36, 6), darkMetalMat);
        cord.position.set(bx + lx, 4.02, -MALL_HALF_D + 0.92);
        const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 12), warmLampMat);
        lantern.scale.set(0.86, 1.28, 0.86);
        lantern.position.set(bx + lx, 3.68, -MALL_HALF_D + 0.92);
        const capTop = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.06, 12), darkMetalMat);
        capTop.position.set(bx + lx, 3.98, -MALL_HALF_D + 0.92);
        const capBot = capTop.clone();
        capBot.position.y = 3.38;
        shellGroup.add(cord, lantern, capTop, capBot);
      });
    }

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

    // North Floor 2 Upper Boutique Storefronts (recessed against North wall — Floor 2 stays 100% walkable!)
    const f2NorthShops: Record<number, {title: string; accent: string; pill: string; fg: string; icon: MallIconKind}> = {
      [-24]: {title: 'MÂY FASHION', accent: '#FF86A4', pill: '#FFF0F4', fg: '#8F2948', icon: 'fashion'},
      [-12]: {title: 'STAR TOYS', accent: '#62B6E8', pill: '#EDF7FF', fg: '#1E5882', icon: 'gift'},
      [0]: {title: 'SKY GALLERY', accent: '#F2B84B', pill: '#FFF8E6', fg: '#7D5112', icon: 'cloud_star'},
      [12]: {title: 'MELODY LAB', accent: '#A688F0', pill: '#F4EEFF', fg: '#4D338C', icon: 'bag'},
      [24]: {title: 'SWEET BAKERY', accent: '#60C299', pill: '#EAFAF3', fg: '#1D6B4B', icon: 'boba'},
    };
    const f2Shop = f2NorthShops[bx];
    const f2WinFrameN = new THREE.Mesh(new RoundedBoxGeometry(9.2, 4.1, 0.18, 2, 0.04), creamTrimMat);
    f2WinFrameN.position.set(bx, MALL_UPPER_Y + 2.25, -MALL_HALF_D + 0.21);
    const f2WinPaneN = new THREE.Mesh(new THREE.BoxGeometry(8.3, 3.3, 0.08), windowPaneMat);
    f2WinPaneN.position.set(bx, MALL_UPPER_Y + 2.25, -MALL_HALF_D + 0.34);
    const f2WinPadN = new THREE.Mesh(
      new RoundedBoxGeometry(6.0, 0.38, 0.38, 2, 0.05),
      glossyClayMat(f2Shop.accent, 0.44),
    );
    f2WinPadN.position.set(bx, MALL_UPPER_Y + 0.56, -MALL_HALF_D + 0.48);
    const f2ItemsN = buildShopWindowDisplay(f2Shop.icon);
    f2ItemsN.position.set(bx, MALL_UPPER_Y + 0.76, -MALL_HALF_D + 0.5);
    const f2SignTex = createStorefrontSignTexture(
      f2Shop.title,
      f2Shop.accent,
      f2Shop.pill,
      f2Shop.fg,
      disposables,
      isDisposed,
    );
    const f2SignBoard = new THREE.Mesh(
      new RoundedBoxGeometry(6.2, 1.28, 0.18, 3, 0.22),
      glossyClayMat(f2Shop.accent, 0.4),
    );
    f2SignBoard.position.set(bx, MALL_UPPER_Y + 5.15, -MALL_HALF_D + 0.34);
    const f2SignFace = new THREE.Mesh(
      new THREE.PlaneGeometry(5.85, 1.06),
      new THREE.MeshBasicMaterial({map: f2SignTex}),
    );
    f2SignFace.position.set(bx, MALL_UPPER_Y + 5.15, -MALL_HALF_D + 0.45);
    for (let s = 0; s < 5; s++) {
      const aw = new THREE.Mesh(
        new RoundedBoxGeometry(1.66, 0.2, 0.96, 2, 0.06),
        clayMat(s % 2 === 0 ? f2Shop.accent : '#FFFDF8', 0.48),
      );
      aw.position.set(bx - 3.32 + s * 1.66, MALL_UPPER_Y + 4.05, -MALL_HALF_D + 0.66);
      aw.rotation.x = 0.26;
      shellGroup.add(aw);
    }
    shellGroup.add(f2WinFrameN, f2WinPaneN, f2WinPadN, f2SignBoard);
    group.add(f2ItemsN, f2SignFace);

    // South Floor 2 Boutique Display Windows & Clerestory Trim
    const f2WinFrameS = new THREE.Mesh(new RoundedBoxGeometry(9.2, 3.8, 0.16, 2, 0.04), creamTrimMat);
    f2WinFrameS.position.set(bx, MALL_UPPER_Y + 4.4, MALL_HALF_D - 0.21);
    const f2WinPaneS = new THREE.Mesh(new THREE.BoxGeometry(8.4, 3.0, 0.06), windowPaneMat);
    f2WinPaneS.position.set(bx, MALL_UPPER_Y + 4.4, MALL_HALF_D - 0.33);
    const f2SignS = new THREE.Mesh(
      new RoundedBoxGeometry(5.6, 0.9, 0.16, 3, 0.18),
      glossyClayMat(bx === 0 ? '#F2B84B' : accent, 0.44),
    );
    f2SignS.position.set(bx, MALL_UPPER_Y + 6.75, MALL_HALF_D - 0.34);
    shellGroup.add(f2WinFrameS, f2WinPaneS, f2SignS);
  });

  // West & East Floor 2 Boutique Wall Showcases (x = ±31.65 — strictly flush outside walking bounds)
  [-1, 1].forEach((side) => {
    const wx = side * (MALL_HALF_W - 0.32);
    const faceSign = -side;
    [
      {wz: -14, title: side < 0 ? 'KUMO TECH' : 'CLOUD HOME', accent: side < 0 ? '#54A6EB' : '#65C49E', pill: '#F0F9FF', fg: '#1E4E78', icon: (side < 0 ? 'bag' : 'mart') as MallIconKind},
      {wz: 0, title: side < 0 ? 'PET CORNER' : 'GIFT STUDIO', accent: side < 0 ? '#F5A65B' : '#FF86A4', pill: '#FFF7ED', fg: '#783B12', icon: (side < 0 ? 'cloud_star' : 'gift') as MallIconKind},
      {wz: 14, title: side < 0 ? 'BOBA CLUB' : 'SUNGLASSES', accent: side < 0 ? '#B18DF2' : '#E8735E', pill: '#F5F0FF', fg: '#4B2B85', icon: (side < 0 ? 'boba' : 'fashion') as MallIconKind},
    ].forEach(({wz, title, accent, pill, fg, icon}) => {
      const frame = new THREE.Mesh(new RoundedBoxGeometry(0.18, 4.0, 8.8, 2, 0.04), creamTrimMat);
      frame.position.set(wx, MALL_UPPER_Y + 2.25, wz);
      const pane = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3.2, 7.9), windowPaneMat);
      pane.position.set(wx + faceSign * 0.12, MALL_UPPER_Y + 2.25, wz);
      const sTex = createStorefrontSignTexture(title, accent, pill, fg, disposables, isDisposed);
      const sBoard = new THREE.Mesh(
        new RoundedBoxGeometry(0.18, 1.18, 5.8, 3, 0.2),
        glossyClayMat(accent, 0.42),
      );
      sBoard.position.set(wx + faceSign * 0.12, MALL_UPPER_Y + 4.95, wz);
      const sFace = new THREE.Mesh(new THREE.PlaneGeometry(5.45, 0.96), new THREE.MeshBasicMaterial({map: sTex}));
      sFace.position.set(wx + faceSign * 0.24, MALL_UPPER_Y + 4.95, wz);
      sFace.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
      const items = buildShopWindowDisplay(icon);
      items.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
      items.position.set(wx + faceSign * 0.34, MALL_UPPER_Y + 0.65, wz);
      shellGroup.add(frame, pane, sBoard);
      group.add(sFace, items);
    });
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

  // Perimeter Wing Coffered Ceiling + Grand Luminous Arched Glass Skylight Vault Over Central Atrium!
  const skylitGlassMat = new THREE.MeshStandardMaterial({
    color: '#DDF5FF',
    emissive: '#B6EBFF',
    emissiveIntensity: 0.42,
    roughness: 0.12,
    transparent: true,
    opacity: 0.64,
  });

  // Solid perimeter ceiling slabs framing the 30m x 22m central skylight opening (|x| < 15, |z| < 11)
  [
    {cx: 0, cz: -18.7, w: MALL_HALF_W * 2 + 0.8, d: 15.4},
    {cx: 0, cz: 18.7, w: MALL_HALF_W * 2 + 0.8, d: 15.4},
    {cx: -23.7, cz: 0, w: 17.4, d: 22.0},
    {cx: 23.7, cz: 0, w: 17.4, d: 22.0},
  ].forEach(({cx, cz, w, d}) => {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(w, 0.42, d), upperWallMat);
    slab.position.set(cx, WALL_H + 0.21, cz);
    shellGroup.add(slab);
  });

  // Skylight perimeter cornice frame + warm coves
  [
    {x: 0, z: -11.0, w: 30.6, d: 0.45},
    {x: 0, z: 11.0, w: 30.6, d: 0.45},
    {x: -15.0, z: 0, w: 0.45, d: 22.4},
    {x: 15.0, z: 0, w: 0.45, d: 22.4},
  ].forEach(({x, z, w, d}) => {
    const rim = new THREE.Mesh(new RoundedBoxGeometry(w, 0.56, d, 2, 0.06), creamTrimMat);
    rim.position.set(x, WALL_H - 0.06, z);
    const goldStrip = new THREE.Mesh(new RoundedBoxGeometry(w * 0.98, 0.14, d * 0.96, 1, 0.02), goldMat);
    goldStrip.position.set(x, WALL_H - 0.32, z);
    shellGroup.add(rim, goldStrip);
  });

  // Arched Barrel-Vault Skylight Glass Dome & Cream/Gold Roof Ribs above Atrium (y = WALL_H .. WALL_H + 3.8)
  const vaultGlass = new THREE.Mesh(
    new THREE.CylinderGeometry(11.0, 11.0, 30.0, 20, 1, true, 0, Math.PI),
    skylitGlassMat,
  );
  vaultGlass.rotation.z = Math.PI / 2;
  vaultGlass.scale.set(0.34, 1, 1);
  vaultGlass.position.set(0, WALL_H, 0);
  shellGroup.add(vaultGlass);

  [-15, -9, -3, 3, 9, 15].forEach((rx) => {
    const archRib = new THREE.Mesh(new THREE.TorusGeometry(11.0, 0.18, 8, 24, Math.PI), creamTrimMat);
    archRib.rotation.y = Math.PI / 2;
    archRib.scale.set(1, 0.34, 1);
    archRib.position.set(rx, WALL_H, 0);
    shellGroup.add(archRib);
  });
  [-5.5, 0, 5.5].forEach((pz) => {
    const purlin = new THREE.Mesh(new THREE.BoxGeometry(30.0, 0.16, 0.22), goldMat);
    const purlinY = WALL_H + Math.sqrt(Math.max(0, 11 * 11 - pz * pz)) * 0.34;
    purlin.position.set(0, purlinY, pz);
    shellGroup.add(purlin);
  });

  // Coffer Crossbeams along outer wings
  [-18, 18].forEach((bz) => {
    const beamX = new THREE.Mesh(new THREE.BoxGeometry(MALL_HALF_W * 2, 0.34, 0.56), creamTrimMat);
    beamX.position.set(0, WALL_H - 0.17, bz);
    shellGroup.add(beamX);
  });
  [-24, 24].forEach((bx) => {
    const beamZ = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.34, MALL_HALF_D * 2), creamTrimMat);
    beamZ.position.set(bx, WALL_H - 0.17, 0);
    shellGroup.add(beamZ);
  });

  // Recessed Wing Lights (Đèn trần cánh)
  [-21, -9, 9, 21].forEach((lz) => {
    [-22, -11, 0, 11, 22].forEach((lx) => {
      if (Math.abs(lx) < 14 && Math.abs(lz) < 10) return;
      const bezel = new THREE.Mesh(new RoundedBoxGeometry(3.8, 0.12, 2.2, 2, 0.03), silverMat);
      bezel.position.set(lx, WALL_H - 0.08, lz);
      const diffuser = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.08, 1.8), ceilingLightMat);
      diffuser.position.set(lx, WALL_H - 0.16, lz);
      shellGroup.add(bezel);
      ceilingLightsGroup.add(diffuser);
    });
  });

  // 3 Grand Multi-Tier Crystal & Gold Atrium Chandeliers suspended below the Skylight Vault!
  [-9.5, 0, 9.5].forEach((hx, hIdx) => {
    const dropLen = hIdx === 1 ? 4.4 : 3.6;
    const baseY = WALL_H + 3.2 - dropLen;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, dropLen, 8), goldMat);
    stem.position.set(hx, WALL_H + 3.2 - dropLen * 0.5, 0);
    shellGroup.add(stem);

    [
      {r: hIdx === 1 ? 2.45 : 1.95, yOff: 0.75},
      {r: hIdx === 1 ? 1.55 : 1.2, yOff: 0},
    ].forEach(({r, yOff}) => {
      const ringGold = new THREE.Mesh(new THREE.TorusGeometry(r, 0.08, 10, 32), goldMat);
      ringGold.rotation.x = Math.PI / 2;
      ringGold.position.set(hx, baseY + yOff, 0);
      const ringGlow = new THREE.Mesh(new THREE.TorusGeometry(r, 0.065, 8, 32), ceilingLightMat);
      ringGlow.rotation.x = Math.PI / 2;
      ringGlow.position.set(hx, baseY + yOff - 0.08, 0);
      shellGroup.add(ringGold);
      ceilingLightsGroup.add(ringGlow);
    });

    // Hanging pearl drops beneath bottom chandelier tier
    for (let p = 0; p < 8; p++) {
      const a = (p / 8) * Math.PI * 2;
      const pr = hIdx === 1 ? 1.55 : 1.2;
      const drop = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), warmLampMat);
      drop.position.set(hx + Math.cos(a) * pr, baseY - 0.24, Math.sin(a) * pr);
      ceilingLightsGroup.add(drop);
    }
  });

  // Festive Pastel Floating Sky Hot-Air Balloons & Puffy Clouds high in Atrium!
  [
    {x: -5.2, y: 13.4, z: -6.4, col: '#FF9EB5', stripe: '#FFF8EB', s: 1.05},
    {x: 5.4, y: 14.2, z: 6.2, col: '#78C7FF', stripe: '#FFF8EB', s: 1.15},
    {x: -11.5, y: 12.6, z: 5.8, col: '#FFD87D', stripe: '#FF9EB5', s: 0.9},
    {x: 11.4, y: 12.8, z: -5.8, col: '#7ED6C2', stripe: '#FFF8EB', s: 0.92},
  ].forEach(({x, y, z, col, stripe, s}) => {
    const bGroup = new THREE.Group();
    bGroup.position.set(x, y, z);
    bGroup.scale.setScalar(s);
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 6.2, 6), silverMat);
    cable.position.y = 3.6;
    const envelope = new THREE.Mesh(new THREE.SphereGeometry(0.85, 16, 14), glossyClayMat(col, 0.34));
    envelope.scale.set(1, 1.18, 1);
    const belt = new THREE.Mesh(new THREE.TorusGeometry(0.84, 0.06, 8, 22), glossyClayMat(stripe, 0.34));
    belt.rotation.x = Math.PI / 2;
    const basket = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.32, 0.42, 2, 0.04), warmWoodMat);
    basket.position.y = -1.32;
    [-0.16, 0.16].forEach((rx) => {
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.55, 5), goldMat);
      rope.position.set(rx, -1.04, 0);
      bGroup.add(rope);
    });
    bGroup.add(cable, envelope, belt, basket);
    shellGroup.add(bGroup);
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
    isNpc: true,
    maxLabelDist: 3.1,
  });

  // ========== 7. OPEN-CONCEPT FLOOR 1 WINGS: FLAGSHIP QUÁN CÀ PHÊ MÂY, BISTRO & CHỢ, CARTOON DECOR, ARCADE & ATRIUM PLAZA ==========
  const lobbyDecor = new THREE.Group();
  const leafMat = clayMat('#52A862', 0.72);
  const potMat = clayMat('#E9DEC9', 0.68);
  const creamFoamMat = glossyClayMat('#FFF8EE', 0.38);
  const espressoBrownMat = clayMat('#4E3224', 0.58);
  const latteTanMat = clayMat('#D8B388', 0.62);
  const honeyOakMat = clayMat('#DDA96E', 0.64);
  const sageMat = clayMat('#76BFA2', 0.56);
  const berryPinkMat = glossyClayMat('#FF89A6', 0.36);
  const lavenderMat = clayMat('#C6B3F7', 0.58);
  const butterYellowMat = glossyClayMat('#FFD66E', 0.38);
  const mintMat = clayMat('#7BDAC0', 0.52);
  const peachBlossomMat = glossyClayMat('#FF9EB8', 0.42);
  const clearCaseGlassMat = new THREE.MeshStandardMaterial({
    color: '#DFF6FF',
    roughness: 0.08,
    metalness: 0.1,
    transparent: true,
    opacity: 0.36,
    depthWrite: false,
  });

  // Inner Atrium Circular Cushioned Planter-Bench Lounge Pods + Perimeter Potted Trees
  [
    [-10.8, -6.2],
    [10.8, -6.2],
    [-10.8, 6.2],
    [10.8, 6.2],
  ].forEach(([px, pz], idx) => {
    const ringBench = new THREE.Mesh(new THREE.CylinderGeometry(1.04, 1.08, 0.42, 20), creamFoamMat);
    ringBench.position.set(px, 0.21, pz);
    const seatPad = new THREE.Mesh(
      new THREE.TorusGeometry(0.84, 0.14, 10, 22),
      idx % 2 === 0 ? sageMat : berryPinkMat,
    );
    seatPad.rotation.x = Math.PI / 2;
    seatPad.position.set(px, 0.44, pz);
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.46, 0.72, 14), honeyOakMat);
    pot.position.set(px, 0.36, pz);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 1.35, 8), espressoBrownMat);
    trunk.position.set(px, 1.16, pz);
    const crownA = new THREE.Mesh(new THREE.SphereGeometry(0.68, 12, 10), leafMat);
    crownA.position.set(px, 1.98, pz);
    const crownB = new THREE.Mesh(new THREE.SphereGeometry(0.46, 10, 8), leafMat);
    crownB.position.set(px + 0.34, 1.76, pz - 0.18);
    const crownC = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), sageMat);
    crownC.position.set(px - 0.3, 1.82, pz + 0.22);
    lobbyDecor.add(ringBench, seatPad, pot, trunk, crownA, crownB, crownC);
    colliders.push({type: 'circle', id: `mall_f1_plant_${idx}`, x: px, z: pz, r: 1.08});
  });

  [
    [-30.2, -24.2],
    [30.2, -24.2],
    [-30.2, 24.2],
    [30.2, 24.2],
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
    colliders.push({type: 'circle', id: `mall_f1_plant_${idx + 4}`, x: px, z: pz, r: 0.58});
  });

  // Central atrium around Tun kept open & spacious (no clutter benches)

  // ---------- 7A. FLAGSHIP QUÁN CÀ PHÊ MÂY (SOUTH-WEST OPEN WING: x=-29..-11.4, z=+7.2..+23.2) ----------
  const cafePad = new THREE.Mesh(
    new RoundedBoxGeometry(17.6, 0.036, 15.8, 2, 0.015),
    clayMat('#F2DEC3', 0.62),
  );
  cafePad.position.set(-20.2, 0.018, 15.2);
  const cafeBorder = new THREE.Mesh(
    new RoundedBoxGeometry(17.2, 0.014, 15.4, 2, 0.01),
    clayMat('#DFBE96', 0.66),
  );
  cafeBorder.position.set(-20.2, 0.036, 15.2);
  lobbyDecor.add(cafePad, cafeBorder);

  // L-Shaped Open Espresso & Pastry Bar Counter (NO enclosing booth walls!)
  const barFront = new THREE.Mesh(new RoundedBoxGeometry(7.2, 1.02, 1.1, 3, 0.06), warmWoodMat);
  barFront.position.set(-23.6, 0.51, 20.2);
  const barFrontTop = new THREE.Mesh(new RoundedBoxGeometry(7.38, 0.09, 1.24, 3, 0.03), creamFoamMat);
  barFrontTop.position.set(-23.6, 1.05, 20.2);
  const barFrontTrim = new THREE.Mesh(new RoundedBoxGeometry(6.8, 0.16, 0.08, 2, 0.02), sageMat);
  barFrontTrim.position.set(-23.6, 0.72, 19.64);

  const barSide = new THREE.Mesh(new RoundedBoxGeometry(1.1, 1.02, 2.8, 3, 0.06), warmWoodMat);
  barSide.position.set(-27.2, 0.51, 18.8);
  const barSideTop = new THREE.Mesh(new RoundedBoxGeometry(1.24, 0.09, 2.94, 3, 0.03), creamFoamMat);
  barSideTop.position.set(-27.2, 1.05, 18.8);

  // Back Bar Credenza + Sculpted "MÂY CAFÉ" Sign Canopy Held by Two Slender Timber Posts
  const backBar = new THREE.Mesh(new RoundedBoxGeometry(7.0, 0.92, 0.85, 3, 0.05), espressoBrownMat);
  backBar.position.set(-23.6, 0.46, 22.6);
  const backBarTop = new THREE.Mesh(new RoundedBoxGeometry(7.14, 0.08, 0.96, 2, 0.025), creamFoamMat);
  backBarTop.position.set(-23.6, 0.96, 22.6);
  lobbyDecor.add(barFront, barFrontTop, barFrontTrim, barSide, barSideTop, backBar, backBarTop);

  [-26.8, -20.4].forEach((px) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.1, 3.05, 10), espressoBrownMat);
    post.position.set(px, 1.525, 22.6);
    lobbyDecor.add(post);
  });

  const cafeTex = createStorefrontSignTexture('MÂY CAFÉ', '#C68B59', '#FFF6EA', '#5A341A', disposables, isDisposed);
  const cafeSignBoard = new THREE.Mesh(new RoundedBoxGeometry(5.6, 1.25, 0.18, 3, 0.22), honeyOakMat);
  cafeSignBoard.position.set(-23.6, 3.15, 22.6);
  const cafeSignFace = new THREE.Mesh(
    new THREE.PlaneGeometry(5.2, 1.02),
    new THREE.MeshBasicMaterial({map: cafeTex}),
  );
  cafeSignFace.position.set(-23.6, 3.15, 22.5);
  cafeSignFace.rotation.y = Math.PI;
  group.add(cafeSignFace);

  // Giant Sculpted 3D Latte Cup Emblem perched atop the Café Sign
  const giantCup = new THREE.Group();
  giantCup.position.set(-23.6, 4.18, 22.55);
  giantCup.rotation.y = Math.PI;
  const gCupBody = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.28, 0.56, 18), creamFoamMat);
  const gCupFoam = new THREE.Mesh(new THREE.SphereGeometry(0.39, 14, 10), latteTanMat);
  gCupFoam.scale.set(1, 0.35, 1);
  gCupFoam.position.y = 0.24;
  const gCupHeart = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), creamFoamMat);
  gCupHeart.position.set(0, 0.34, 0.08);
  const gCupHandle = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.045, 8, 14, Math.PI), creamFoamMat);
  gCupHandle.rotation.z = -Math.PI / 2;
  gCupHandle.position.set(0.38, 0.02, 0);
  const gSaucer = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.4, 0.07, 18), sageMat);
  gSaucer.position.y = -0.3;
  giantCup.add(gCupBody, gCupFoam, gCupHeart, gCupHandle, gSaucer);
  lobbyDecor.add(cafeSignBoard, giantCup);

  // Bar Counter Props: Detailed 2-Group Italian Espresso Machine, Grinder, Register & Glass Pastry Vitrine
  const espGroup = new THREE.Group();
  espGroup.position.set(-25.4, 1.095, 20.2);

  // Lower stainless base & drip tray grate extending forward (-Z)
  const espFoot = new THREE.Mesh(new RoundedBoxGeometry(1.06, 0.09, 0.58, 2, 0.025), silverMat);
  espFoot.position.set(0, 0.045, 0);
  const dripTray = new THREE.Mesh(new RoundedBoxGeometry(0.92, 0.055, 0.22, 2, 0.015), darkMetalMat);
  dripTray.position.set(0, 0.048, -0.27);
  const dripGrate = new THREE.Mesh(new RoundedBoxGeometry(0.86, 0.012, 0.17, 1, 0.004), silverMat);
  dripGrate.position.set(0, 0.08, -0.27);

  // Sculpted pastel sage & cream body shell + top cup-warmer tray
  const espBody = new THREE.Mesh(new RoundedBoxGeometry(1.02, 0.44, 0.48, 3, 0.055), sageMat);
  espBody.position.set(0, 0.31, 0.03);
  const espFrontFace = new THREE.Mesh(new RoundedBoxGeometry(0.94, 0.36, 0.04, 2, 0.015), silverMat);
  espFrontFace.position.set(0, 0.3, -0.2);
  const espCap = new THREE.Mesh(new RoundedBoxGeometry(1.06, 0.08, 0.52, 3, 0.025), creamFoamMat);
  espCap.position.set(0, 0.54, 0.03);
  const cupRail = new THREE.Mesh(new RoundedBoxGeometry(0.98, 0.055, 0.44, 2, 0.01), goldMat);
  cupRail.position.set(0, 0.605, 0.03);

  // Stacked porcelain espresso cups atop the warmer rail
  [-0.32, -0.11, 0.11, 0.32].forEach((cx, idx) => {
    const saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.05, 0.014, 12), creamFoamMat);
    saucer.position.set(cx, 0.59, 0.02);
    const cup = new THREE.Mesh(
      new THREE.CylinderGeometry(0.052, 0.038, 0.072, 12),
      idx % 2 === 0 ? creamFoamMat : berryPinkMat,
    );
    cup.position.set(cx, 0.632, 0.02);
    espGroup.add(saucer, cup);
  });

  // Pressure dial gauge in center front
  const gaugeBezel = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.028, 16), goldMat);
  gaugeBezel.rotation.x = Math.PI / 2;
  gaugeBezel.position.set(0, 0.42, -0.22);
  const gaugeFace = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.032, 14), creamFoamMat);
  gaugeFace.rotation.x = Math.PI / 2;
  gaugeFace.position.set(0, 0.42, -0.222);

  // Two precision group heads + angled portafilters + shot glasses + side steam wands
  [-0.25, 0.25].forEach((gx) => {
    const groupHead = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.062, 0.095, 14), silverMat);
    groupHead.position.set(gx, 0.35, -0.245);
    const pfBasket = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.048, 0.045, 14), goldMat);
    pfBasket.position.set(gx, 0.285, -0.255);
    const pfHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.022, 0.18, 10), darkMetalMat);
    pfHandle.rotation.x = Math.PI / 2 + 0.18;
    pfHandle.position.set(gx, 0.265, -0.36);

    const shotGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.032, 0.068, 12), creamFoamMat);
    shotGlass.position.set(gx, 0.122, -0.265);
    const cremaTop = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.012, 12), espressoBrownMat);
    cremaTop.position.set(gx, 0.156, -0.265);

    const wand = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.009, 0.18, 8), silverMat);
    wand.position.set(gx * 1.72, 0.26, -0.25);
    wand.rotation.z = gx < 0 ? 0.26 : -0.26;
    wand.rotation.x = -0.2;
    espGroup.add(groupHead, pfBasket, pfHandle, shotGlass, cremaTop, wand);
  });

  espGroup.add(espFoot, dripTray, dripGrate, espBody, espFrontFace, espCap, cupRail, gaugeBezel, gaugeFace);
  lobbyDecor.add(espGroup);

  const grinder = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.36, 12), darkMetalMat);
  grinder.position.set(-24.25, 1.28, 20.2);
  const hopper = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.075, 0.24, 12), latteTanMat);
  hopper.position.set(-24.25, 1.54, 20.2);
  const register = new THREE.Mesh(new RoundedBoxGeometry(0.4, 0.26, 0.24, 2, 0.03), creamFoamMat);
  register.position.set(-23.25, 1.22, 20.2);
  const registerScreen = new THREE.Mesh(new RoundedBoxGeometry(0.32, 0.18, 0.04, 1, 0.01), windowPaneMat);
  registerScreen.position.set(-23.25, 1.28, 20.1);
  lobbyDecor.add(grinder, hopper, register, registerScreen);

  // Illuminated Open-Frame Glass Pastry Vitrine stocked with Layered Cakes, Frosted Donuts, Croissants & Macarons
  const vitrineGroup = new THREE.Group();
  vitrineGroup.position.set(-21.35, 1.095, 20.2);
  const vitrineBase = new THREE.Mesh(new RoundedBoxGeometry(2.24, 0.09, 0.82, 2, 0.025), warmWoodMat);
  vitrineBase.position.y = 0.045;
  const vitrineMidShelf = new THREE.Mesh(new RoundedBoxGeometry(2.08, 0.035, 0.68, 1, 0.01), creamFoamMat);
  vitrineMidShelf.position.y = 0.36;
  const vitrineTopCap = new THREE.Mesh(new RoundedBoxGeometry(2.22, 0.055, 0.8, 2, 0.02), warmWoodMat);
  vitrineTopCap.position.y = 0.72;
  const vitrineLightBar = new THREE.Mesh(new RoundedBoxGeometry(1.96, 0.028, 0.08, 1, 0.01), warmLampMat);
  vitrineLightBar.position.set(0, 0.68, -0.24);

  [
    [-1.06, -0.35],
    [1.06, -0.35],
    [-1.06, 0.35],
    [1.06, 0.35],
  ].forEach(([px, pz]) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.66, 8), goldMat);
    post.position.set(px, 0.39, pz);
    vitrineGroup.add(post);
  });
  const frontGlass = new THREE.Mesh(new THREE.BoxGeometry(2.08, 0.58, 0.025), clearCaseGlassMat);
  frontGlass.position.set(0, 0.39, -0.36);

  // Lower Shelf: 3 Layered Cake Slices on porcelain trays + 2 Golden Croissants
  [-0.78, -0.32, 0.14].forEach((cx, idx) => {
    const tray = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.02, 14), creamFoamMat);
    tray.position.set(cx, 0.1, 0);
    const sponge = new THREE.Mesh(
      new RoundedBoxGeometry(0.17, 0.12, 0.16, 2, 0.02),
      idx === 0 ? berryPinkMat : idx === 1 ? espressoBrownMat : mintMat,
    );
    sponge.position.set(cx, 0.17, 0);
    const creamLayer = new THREE.Mesh(new RoundedBoxGeometry(0.18, 0.03, 0.17, 1, 0.008), creamFoamMat);
    creamLayer.position.set(cx, 0.165, 0);
    const topping = new THREE.Mesh(
      new THREE.SphereGeometry(0.036, 10, 8),
      idx === 1 ? butterYellowMat : berryPinkMat,
    );
    topping.position.set(cx, 0.25, 0);
    vitrineGroup.add(tray, sponge, creamLayer, topping);
  });
  [0.56, 0.86].forEach((cx) => {
    const cro = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.044, 8, 12, Math.PI * 1.18), honeyOakMat);
    cro.rotation.x = Math.PI / 2;
    cro.position.set(cx, 0.135, 0);
    vitrineGroup.add(cro);
  });

  // Upper Shelf: 3 Glazed Donuts & 2 Macaron Stacks
  [-0.72, -0.28, 0.16].forEach((dx, idx) => {
    const dough = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.042, 10, 16), honeyOakMat);
    dough.rotation.x = Math.PI / 2;
    dough.position.set(dx, 0.42, 0);
    const glaze = new THREE.Mesh(
      new THREE.TorusGeometry(0.085, 0.036, 10, 16),
      idx === 0 ? berryPinkMat : idx === 1 ? espressoBrownMat : mintMat,
    );
    glaze.rotation.x = Math.PI / 2;
    glaze.position.set(dx, 0.435, 0);
    vitrineGroup.add(dough, glaze);
  });
  [0.58, 0.85].forEach((mx, idx) => {
    for (let layer = 0; layer < 2; layer++) {
      const mac = new THREE.Mesh(
        new THREE.CylinderGeometry(0.068, 0.068, 0.052, 12),
        (idx + layer) % 2 === 0 ? lavenderMat : butterYellowMat,
      );
      mac.position.set(mx, 0.405 + layer * 0.056, 0);
      vitrineGroup.add(mac);
    }
  });

  vitrineGroup.add(vitrineBase, vitrineMidShelf, vitrineTopCap, vitrineLightBar, frontGlass);
  lobbyDecor.add(vitrineGroup);

  // Back Bar Coffee Syrups & Ceramic Mug Shelves
  for (let i = 0; i < 6; i++) {
    const sx = -25.8 + i * 0.85;
    const bottle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.08, 0.28, 10),
      i % 2 === 0 ? berryPinkMat : mintMat,
    );
    bottle.position.set(sx, 1.14, 22.55);
    lobbyDecor.add(bottle);
  }

  // Cute Chalkboard Coffee Menu Easel near Café Entrance
  const easelBoard = new THREE.Mesh(new RoundedBoxGeometry(0.84, 1.18, 0.07, 2, 0.025), warmWoodMat);
  easelBoard.position.set(-26.8, 0.72, 15.2);
  easelBoard.rotation.set(-0.16, 0.45, 0);
  const chalkFace = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.96, 0.08), clayMat('#2E3D37', 0.85));
  chalkFace.position.set(-26.8, 0.72, 15.2);
  chalkFace.rotation.set(-0.16, 0.45, 0);
  lobbyDecor.add(easelBoard, chalkFace);
  colliders.push({type: 'circle', id: 'mall_f1_cafe_easel', x: -26.8, z: 15.2, r: 0.58});

  // Café Bar Colliders & Click Proxy
  colliders.push({type: 'box', id: 'mall_f1_cafe_front', x: -23.6, z: 20.2, hw: 3.7, hd: 0.65});
  colliders.push({type: 'box', id: 'mall_f1_cafe_side', x: -27.2, z: 18.8, hw: 0.65, hd: 1.5});
  colliders.push({type: 'box', id: 'mall_f1_cafe_back', x: -23.6, z: 22.6, hw: 3.6, hd: 0.55});
  addMallProxy(
    group,
    [7.2, 2.2, 2.4],
    [-23.6, 1.1, 20.6],
    {kind: 'mall_cafe_counter', tx: -23.2, tz: 18.65},
    clickTargets,
  );

  // Friendly Barista NPC ("Mây") behind the espresso bar
  const BARISTA_AVATAR: AvatarConfig = {
    name: 'Mây Barista',
    skinTone: '#F7CEAD',
    hairBack: 'ponytail',
    hairFront: 'air_bangs',
    hairColor: '#5B3A29',
    eyeStyle: 'bright',
    eyeColor: '#5B341E',
    expression: 'sweet_smile',
    blush: true,
    top: 'cardigan_vest',
    topColor: '#5C8A72',
    bottom: 'midi_skirt',
    bottomColor: '#FFF5E6',
    shoes: 'loafers',
    shoeColor: '#69432B',
    headItem: 'beret',
    headItemColor: '#C68B59',
    accessory: 'none',
    accessoryColor: '#4A3628',
    handheld: 'none',
    handheldColor: '#E8B84B',
  };
  const BARISTA_X = -23.2;
  const BARISTA_Z = 21.35;
  const baristaRig = buildAvatarRig(BARISTA_AVATAR);
  baristaRig.root.position.set(BARISTA_X, 0.036, BARISTA_Z);
  baristaRig.root.rotation.y = Math.PI;
  group.add(baristaRig.root);
  addMallProxy(
    baristaRig.root,
    [1.0, 1.9, 1.0],
    [0, 0.95, 0],
    {kind: 'mall_cafe_counter', tx: -23.2, tz: 18.65},
    clickTargets,
  );
  labelAnchors.push({
    id: 'npc_barista',
    label: 'Barista Mây',
    worldPos: new THREE.Vector3(BARISTA_X, 2.25, BARISTA_Z),
    isNpc: true,
    maxLabelDist: 3.1,
  });

  // 4 Open Bistro Coffee Tables & 8 Interactive Cushioned Chairs in Quán Cà Phê Mây
  const cafeTables: [number, number][] = [
    [-19.2, 10.2],
    [-14.2, 10.2],
    [-19.2, 15.2],
    [-14.2, 15.2],
  ];
  cafeTables.forEach(([tx, tz], tIdx) => {
    const tblTop = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.08, 20), creamFoamMat);
    tblTop.position.set(tx, 0.78, tz);
    const tblRim = new THREE.Mesh(new THREE.TorusGeometry(0.61, 0.022, 8, 28), warmWoodMat);
    tblRim.rotation.x = Math.PI / 2;
    tblRim.position.set(tx, 0.78, tz);
    const tblStem = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.08, 0.72, 10), darkMetalMat);
    tblStem.position.set(tx, 0.4, tz);
    const tblFoot = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.06, 14), darkMetalMat);
    tblFoot.position.set(tx, 0.05, tz);

    // Detailed Latte Mug with saucer, curved handle & latte art foam (Left)
    const saucerL = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.085, 0.018, 16), creamFoamMat);
    saucerL.position.set(tx - 0.24, 0.829, tz + 0.04);
    const mugL = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.054, 0.11, 14), sageMat);
    mugL.position.set(tx - 0.24, 0.892, tz + 0.04);
    const handleL = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.011, 8, 12, Math.PI), sageMat);
    handleL.rotation.z = -Math.PI / 2;
    handleL.position.set(tx - 0.168, 0.895, tz + 0.04);
    const coffeeL = new THREE.Mesh(new THREE.CylinderGeometry(0.064, 0.064, 0.014, 14), latteTanMat);
    coffeeL.position.set(tx - 0.24, 0.944, tz + 0.04);
    const foamHeartL = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), creamFoamMat);
    foamHeartL.scale.set(1.2, 0.45, 1.0);
    foamHeartL.position.set(tx - 0.24, 0.952, tz + 0.04);

    // Tall Iced Drink Glass with Dome Lid & Straw (Right)
    const icedCup = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.046, 0.15, 14), clearCaseGlassMat);
    icedCup.position.set(tx + 0.22, 0.895, tz - 0.08);
    const icedDrink = new THREE.Mesh(
      new THREE.CylinderGeometry(0.054, 0.042, 0.11, 12),
      tIdx % 2 === 0 ? espressoBrownMat : peachBlossomMat,
    );
    icedDrink.position.set(tx + 0.22, 0.88, tz - 0.08);
    const icedLid = new THREE.Mesh(
      new THREE.SphereGeometry(0.064, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5),
      creamFoamMat,
    );
    icedLid.position.set(tx + 0.22, 0.968, tz - 0.08);
    const strawR = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.14, 8), berryPinkMat);
    strawR.position.set(tx + 0.235, 1.03, tz - 0.08);
    strawR.rotation.z = -0.22;

    // Dessert Plate with Layered Cake Slice
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.11, 0.024, 16), creamFoamMat);
    plate.position.set(tx + 0.02, 0.832, tz + 0.2);
    const cakeBody = new THREE.Mesh(
      new RoundedBoxGeometry(0.14, 0.075, 0.11, 2, 0.015),
      tIdx % 2 === 0 ? honeyOakMat : berryPinkMat,
    );
    cakeBody.position.set(tx + 0.02, 0.88, tz + 0.2);
    const cakeIcing = new THREE.Mesh(new RoundedBoxGeometry(0.146, 0.022, 0.116, 1, 0.006), creamFoamMat);
    cakeIcing.position.set(tx + 0.02, 0.92, tz + 0.2);
    const cherry = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), berryPinkMat);
    cherry.position.set(tx + 0.02, 0.945, tz + 0.2);

    lobbyDecor.add(
      tblTop,
      tblRim,
      tblStem,
      tblFoot,
      saucerL,
      mugL,
      handleL,
      coffeeL,
      foamHeartL,
      icedCup,
      icedDrink,
      icedLid,
      strawR,
      plate,
      cakeBody,
      cakeIcing,
      cherry,
    );
    colliders.push({type: 'circle', id: `mall_f1_cafe_tbl_${tIdx}`, x: tx, z: tz, r: 0.68});

    [-1, 1].forEach((side, cIdx) => {
      const cx = tx + side * 0.96;
      const sitRotY = side < 0 ? Math.PI / 2 : -Math.PI / 2;
      const chSeat = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.25, 0.09, 14), warmWoodMat);
      chSeat.position.set(cx, 0.45, tz);
      const chPad = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.24, 0.06, 14),
        (tIdx + cIdx) % 2 === 0 ? sageMat : berryPinkMat,
      );
      chPad.position.set(cx, 0.515, tz);
      const chBack = new THREE.Mesh(new RoundedBoxGeometry(0.07, 0.36, 0.42, 2, 0.03), warmWoodMat);
      chBack.position.set(cx + side * 0.22, 0.66, tz);
      const chLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.18, 0.42, 10), darkMetalMat);
      chLeg.position.set(cx, 0.22, tz);
      lobbyDecor.add(chSeat, chPad, chBack, chLeg);
      colliders.push({type: 'circle', id: `mall_f1_cafe_ch_${tIdx}_${cIdx}`, x: cx, z: tz, r: 0.36});
      addMallProxy(
        group,
        [0.64, 0.85, 0.64],
        [cx, 0.45, tz],
        {
          kind: 'bench',
          tx: cx + side * 0.28,
          tz: tz + 0.78,
          seatX: cx,
          seatZ: tz,
          seatY: 0.55,
          sitRotY,
          sitMessage: 'Nhâm nhi cà phê sữa & bánh ngọt tại Quán Cà Phê Mây thật thư giãn! (+Vui vẻ)',
        },
        clickTargets,
      );
    });
  });

  // ---------- 7B. NHÀ HÀNG BISTRO & CHỢ NGUYÊN LIỆU TƯƠI (SOUTH-EAST OPEN WING: x=+11.4..+29, z=+7.2..+23.2) ----------
  const marketPad = new THREE.Mesh(
    new RoundedBoxGeometry(17.6, 0.036, 15.8, 2, 0.015),
    clayMat('#E8F3EA', 0.64),
  );
  marketPad.position.set(20.2, 0.018, 15.2);
  lobbyDecor.add(marketPad);

  // Clean Play-Together Style Mini Supermarket Shelves stocked with recognizable Milk, Eggs, Cheese, Popcorn, Noodles & Jams
  [21.2, 24.0, 26.8].forEach((sx, idx) => {
    const rackGroup = new THREE.Group();
    rackGroup.position.set(sx, 0.036, 21.05);

    const counterBase = new THREE.Mesh(new RoundedBoxGeometry(2.52, 0.82, 1.32, 3, 0.05), creamFoamMat);
    counterBase.position.set(0, 0.41, 0);
    const pinkSkirt = new THREE.Mesh(new RoundedBoxGeometry(2.54, 0.22, 1.34, 2, 0.03), berryPinkMat);
    pinkSkirt.position.set(0, 0.12, 0);
    const lowerShelf = new THREE.Mesh(new RoundedBoxGeometry(2.48, 0.08, 1.24, 2, 0.02), honeyOakMat);
    lowerShelf.position.set(0, 0.85, 0);
    const upperShelf = new THREE.Mesh(new RoundedBoxGeometry(2.38, 0.08, 0.62, 2, 0.02), honeyOakMat);
    upperShelf.position.set(0, 1.38, 0.32);
    const backBoard = new THREE.Mesh(new RoundedBoxGeometry(2.42, 0.82, 0.08, 2, 0.02), creamFoamMat);
    backBoard.position.set(0, 1.24, 0.62);
    rackGroup.add(counterBase, pinkSkirt, lowerShelf, upperShelf, backBoard);

    if (idx === 0) {
      // Shelf 1: Dairy & Eggs (Milk Cartons, Egg Trays, Cheese Wedges, Butter Blocks)
      [-0.85, -0.58].forEach((mx) => {
        const carton = new THREE.Mesh(new RoundedBoxGeometry(0.18, 0.32, 0.18, 2, 0.02), skyAccentMat);
        carton.position.set(mx, 1.58, 0.32);
        const cap = new THREE.Mesh(new RoundedBoxGeometry(0.19, 0.1, 0.19, 2, 0.02), creamFoamMat);
        cap.position.set(mx, 1.72, 0.32);
        rackGroup.add(carton, cap);
      });
      [0.05, 0.62].forEach((ex) => {
        const tray = new THREE.Mesh(new RoundedBoxGeometry(0.44, 0.09, 0.32, 2, 0.02), latteTanMat);
        tray.position.set(ex, 1.46, 0.32);
        rackGroup.add(tray);
        for (let r = 0; r < 2; r++) {
          const egg = new THREE.Mesh(new THREE.SphereGeometry(0.058, 10, 8), creamFoamMat);
          egg.scale.set(0.85, 1.22, 0.85);
          egg.position.set(ex + (r - 0.5) * 0.16, 1.54, 0.32);
          rackGroup.add(egg);
        }
      });
      // Lower shelf: Cheese wedges & butter blocks inside baskets
      [-0.65, 0.55].forEach((bx, bIdx) => {
        const basket = new THREE.Mesh(new RoundedBoxGeometry(0.92, 0.16, 0.54, 2, 0.025), clayMat('#DDA96E', 0.68));
        basket.position.set(bx, 0.96, -0.26);
        rackGroup.add(basket);
        [-0.22, 0.08, 0.34].forEach((ox) => {
          const block = new THREE.Mesh(
            bIdx === 0 ? new THREE.CylinderGeometry(0.11, 0.11, 0.12, 3) : new RoundedBoxGeometry(0.2, 0.11, 0.15, 2, 0.02),
            butterYellowMat,
          );
          block.position.set(bx + ox, 1.07, -0.26);
          rackGroup.add(block);
        });
      });
    } else if (idx === 1) {
      // Shelf 2: Popcorn Buckets, Noodle Cups, Flour Bags & Cacao Tins
      [-0.78, -0.28].forEach((px) => {
        const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.1, 0.28, 12), berryPinkMat);
        cup.position.set(px, 1.56, 0.32);
        rackGroup.add(cup);
        [-0.04, 0, 0.04].forEach((kx, kIdx) => {
          const puff = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), butterYellowMat);
          puff.position.set(px + kx, 1.72 + (kIdx % 2) * 0.03, 0.32);
          rackGroup.add(puff);
        });
      });
      [0.32, 0.78].forEach((nx, nIdx) => {
        const tin = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.12, 0.26, 12),
          nIdx === 0 ? espressoBrownMat : creamFoamMat,
        );
        tin.position.set(nx, 1.55, 0.32);
        const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.128, 0.128, 0.05, 12), honeyOakMat);
        lid.position.set(nx, 1.69, 0.32);
        rackGroup.add(tin, lid);
      });
      // Lower shelf: Flour sacks & golden noodle packs
      [-0.65, 0.55].forEach((bx, bIdx) => {
        const basket = new THREE.Mesh(new RoundedBoxGeometry(0.92, 0.16, 0.54, 2, 0.025), clayMat('#DDA96E', 0.68));
        basket.position.set(bx, 0.96, -0.26);
        rackGroup.add(basket);
        [-0.2, 0.2].forEach((ox) => {
          const pack = new THREE.Mesh(
            new RoundedBoxGeometry(0.28, 0.22, 0.18, 2, 0.04),
            bIdx === 0 ? creamFoamMat : butterYellowMat,
          );
          pack.position.set(bx + ox, 1.08, -0.26);
          rackGroup.add(pack);
        });
      });
    } else {
      // Shelf 3: Strawberry Jam Jars, Honey Jars, Sausage & Chicken Packs
      [-0.82, -0.35, 0.14, 0.62].forEach((jx, jIdx) => {
        const jar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.1, 0.1, 0.24, 12),
          jIdx < 2 ? berryPinkMat : butterYellowMat,
        );
        jar.position.set(jx, 1.54, 0.32);
        const cap = new THREE.Mesh(
          new THREE.CylinderGeometry(0.088, 0.088, 0.055, 12),
          jIdx < 2 ? creamFoamMat : honeyOakMat,
        );
        cap.position.set(jx, 1.68, 0.32);
        rackGroup.add(jar, cap);
      });
      [-0.65, 0.55].forEach((bx, bIdx) => {
        const basket = new THREE.Mesh(new RoundedBoxGeometry(0.92, 0.16, 0.54, 2, 0.025), clayMat('#DDA96E', 0.68));
        basket.position.set(bx, 0.96, -0.26);
        rackGroup.add(basket);
        [-0.22, 0.16].forEach((ox) => {
          const tray = new THREE.Mesh(new RoundedBoxGeometry(0.32, 0.08, 0.28, 2, 0.02), creamFoamMat);
          tray.position.set(bx + ox, 1.03, -0.26);
          const meat = new THREE.Mesh(
            new RoundedBoxGeometry(0.22, 0.06, 0.16, 2, 0.025),
            bIdx === 0 ? clayMat('#D95B43', 0.55) : clayMat('#F29E7C', 0.55),
          );
          meat.position.set(bx + ox, 1.09, -0.26);
          rackGroup.add(tray, meat);
        });
      });
    }
    lobbyDecor.add(rackGroup);
  });

  // Neat Peppa Checkout Counter beside Peppa (replaces awkward rolling cart!)
  const checkoutCounter = new THREE.Mesh(new RoundedBoxGeometry(1.65, 0.88, 0.78, 3, 0.05), creamFoamMat);
  checkoutCounter.position.set(25.75, 0.44, 19.35);
  const checkoutTop = new THREE.Mesh(new RoundedBoxGeometry(1.74, 0.08, 0.86, 2, 0.03), berryPinkMat);
  checkoutTop.position.set(25.75, 0.92, 19.35);
  const peppaReg = new THREE.Mesh(new RoundedBoxGeometry(0.38, 0.26, 0.22, 2, 0.03), creamFoamMat);
  peppaReg.position.set(25.65, 1.09, 19.35);
  const peppaBasket = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.2, 0.3, 2, 0.03), skyAccentMat);
  peppaBasket.position.set(26.18, 1.06, 19.35);
  lobbyDecor.add(checkoutCounter, checkoutTop, peppaReg, peppaBasket);
  colliders.push({type: 'box', id: 'mall_f1_peppa_checkout', x: 25.75, z: 19.35, hw: 0.92, hd: 0.48});

  // Striped Pastel Pink & Cream Canopy Overhead + Siêu Thị Mini của Peppa Signboard!
  [19.8, 28.2].forEach((px) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 3.2, 10), warmWoodMat);
    post.position.set(px, 1.6, 20.5);
    lobbyDecor.add(post);
  });
  for (let s = 0; s < 8; s++) {
    const aw = new THREE.Mesh(
      new RoundedBoxGeometry(1.08, 0.12, 1.65, 2, 0.04),
      s % 2 === 0 ? berryPinkMat : creamFoamMat,
    );
    aw.position.set(20.15 + s * 1.1, 3.05, 20.65);
    aw.rotation.x = 0.22;
    lobbyDecor.add(aw);
  }
  const peppaSignTex = createStorefrontSignTexture(
    'SIÊU THỊ PEPPA',
    '#F0689B',
    '#FFF4F8',
    '#8B1E47',
    disposables,
    isDisposed,
  );
  const peppaSignBoard = new THREE.Mesh(
    new RoundedBoxGeometry(6.0, 1.24, 0.18, 3, 0.2),
    berryPinkMat,
  );
  peppaSignBoard.position.set(24.0, 3.85, 21.15);
  const peppaSignFace = new THREE.Mesh(
    new THREE.PlaneGeometry(5.6, 1.04),
    new THREE.MeshBasicMaterial({map: peppaSignTex}),
  );
  peppaSignFace.position.set(24.0, 3.85, 21.05);
  peppaSignFace.rotation.y = Math.PI;
  lobbyDecor.add(peppaSignBoard);
  group.add(peppaSignFace);

  colliders.push({type: 'box', id: 'mall_f1_market_stalls', x: 24.0, z: 21.1, hw: 4.35, hd: 0.95});
  addMallProxy(
    group,
    [8.4, 2.4, 2.1],
    [24.0, 1.2, 21.0],
    {kind: 'npc_peppa', tx: 24.0, tz: 17.7},
    clickTargets,
  );

  // NPC Peppa — cô gái mặc mascot chú heo Peppa bán Nguyên Liệu & Công Thức nấu ăn tại Siêu Thị Mini!
  const PEPPA_AVATAR: AvatarConfig = {
    name: 'Peppa',
    mascotCostume: 'peppa_pig',
    skinTone: '#F7D2BA',
    hairBack: 'bob_cut',
    hairFront: 'air_bangs',
    hairColor: '#5B3A29',
    eyeStyle: 'bright',
    eyeColor: '#4E2E1D',
    expression: 'sweet_smile',
    blush: true,
    top: 'sundress',
    topColor: '#E53935',
    bottom: 'a_line_skirt',
    bottomColor: '#E53935',
    shoes: 'boots',
    shoeColor: '#252329',
    headItem: 'none',
    headItemColor: '#F48FB1',
    accessory: 'none',
    accessoryColor: '#4A3628',
    handheld: 'none',
    handheldColor: '#E8B84B',
  };
  const PEPPA_X = 24.0;
  const PEPPA_Z = 19.35;
  const peppaRig = buildAvatarRig(PEPPA_AVATAR);
  peppaRig.root.position.set(PEPPA_X, 0.036, PEPPA_Z);
  peppaRig.root.rotation.y = Math.PI;
  group.add(peppaRig.root);
  colliders.push({type: 'circle', id: 'mall_f1_peppa', x: PEPPA_X, z: PEPPA_Z, r: 0.48});
  addMallProxy(
    peppaRig.root,
    [1.1, 2.05, 1.1],
    [0, 1.0, 0],
    {kind: 'npc_peppa', tx: 24.0, tz: 17.7},
    clickTargets,
  );
  labelAnchors.push({
    id: 'npc_peppa',
    label: 'Peppa',
    worldPos: new THREE.Vector3(PEPPA_X, 2.38, PEPPA_Z),
    isNpc: true,
    maxLabelDist: 3.1,
  });

  // 2 Bistro Dining Tables & 4 Interactive Chairs in SE Wing
  [
    [14.6, 10.4],
    [14.6, 15.6],
  ].forEach(([tx, tz], tIdx) => {
    const tblTop = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.08, 20), honeyOakMat);
    tblTop.position.set(tx, 0.78, tz);
    const tblLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.72, 10), darkMetalMat);
    tblLeg.position.set(tx, 0.4, tz);
    const tblFoot = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.06, 14), darkMetalMat);
    tblFoot.position.set(tx, 0.05, tz);
    const saladPlate = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.14, 0.035, 12), creamFoamMat);
    saladPlate.position.set(tx - 0.16, 0.84, tz);
    const saladBowl = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), leafMat);
    saladBowl.scale.set(1.2, 0.6, 1.2);
    saladBowl.position.set(tx - 0.16, 0.88, tz);
    const juice = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.045, 0.15, 10), butterYellowMat);
    juice.position.set(tx + 0.18, 0.9, tz + 0.08);
    lobbyDecor.add(tblTop, tblLeg, tblFoot, saladPlate, saladBowl, juice);
    colliders.push({type: 'circle', id: `mall_f1_bistro_tbl_${tIdx}`, x: tx, z: tz, r: 0.7});

    [-1, 1].forEach((side, cIdx) => {
      const cx = tx + side * 0.98;
      const sitRotY = side < 0 ? Math.PI / 2 : -Math.PI / 2;
      const chSeat = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.09, 0.48, 2, 0.03), sageMat);
      chSeat.position.set(cx, 0.48, tz);
      const chBack = new THREE.Mesh(new RoundedBoxGeometry(0.08, 0.4, 0.46, 2, 0.03), warmWoodMat);
      chBack.position.set(cx + side * 0.22, 0.68, tz);
      const chLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.18, 0.42, 10), darkMetalMat);
      chLeg.position.set(cx, 0.22, tz);
      lobbyDecor.add(chSeat, chBack, chLeg);
      colliders.push({type: 'circle', id: `mall_f1_bistro_ch_${tIdx}_${cIdx}`, x: cx, z: tz, r: 0.36});
      addMallProxy(
        group,
        [0.64, 0.88, 0.64],
        [cx, 0.45, tz],
        {
          kind: 'bench',
          tx: cx + side * 0.3,
          tz: tz + 0.78,
          seatX: cx,
          seatZ: tz,
          seatY: 0.54,
          sitRotY,
          sitMessage: 'Thưởng thức món ngon tươi sạch tại Khu Ẩm Thực Bistro! (+Vui vẻ)',
        },
        clickTargets,
      );
    });
  });

  // ---------- 7C. KHU NỘI THẤT CARTOON & MASCOT MÂY (NORTH-WEST OPEN WING: x=-29..-11.8, z=-22.2..-6.5) ----------
  const cartoonPad = new THREE.Mesh(
    new RoundedBoxGeometry(16.8, 0.036, 15.2, 2, 0.015),
    clayMat('#F3EBFF', 0.64),
  );
  cartoonPad.position.set(-20.4, 0.018, -14.4);
  const cartoonCloudMat = buildSculptedCloud(2.6, clayMat('#FFF9FD', 0.56));
  cartoonCloudMat.scale.set(2.8, 0.08, 2.2);
  cartoonCloudMat.position.set(-20.2, 0.045, -16.8);
  lobbyDecor.add(cartoonPad, cartoonCloudMat);

  // Giant Sculpted Mây Bear & Cloud Mascot Stage at (-20.2, -16.8)
  const mascotStage = new THREE.Mesh(new THREE.CylinderGeometry(1.42, 1.56, 0.34, 24), lavenderMat);
  mascotStage.position.set(-20.2, 0.19, -16.8);
  const mascotRim = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.055, 8, 28), butterYellowMat);
  mascotRim.rotation.x = Math.PI / 2;
  mascotRim.position.set(-20.2, 0.36, -16.8);
  lobbyDecor.add(mascotStage, mascotRim);

  const mascotGroup = new THREE.Group();
  mascotGroup.position.set(-20.2, 0.36, -16.8);
  const bearBodyMat = glossyClayMat('#FFF8EE', 0.44);
  const bearBelly = new THREE.Mesh(new THREE.SphereGeometry(0.58, 16, 14), bearBodyMat);
  bearBelly.scale.set(1.05, 1.15, 0.95);
  bearBelly.position.y = 0.62;
  const bearHead = new THREE.Mesh(new THREE.SphereGeometry(0.52, 16, 14), bearBodyMat);
  bearHead.scale.set(1.12, 0.96, 0.96);
  bearHead.position.y = 1.45;
  [-0.42, 0.42].forEach((ex) => {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), bearBodyMat);
    ear.position.set(ex, 1.88, -0.02);
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 8), berryPinkMat);
    cheek.position.set(ex * 0.62, 1.4, 0.45);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.048, 8, 8), darkMetalMat);
    eye.position.set(ex * 0.46, 1.5, 0.47);
    const arm = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), bearBodyMat);
    arm.scale.set(0.9, 1.35, 0.9);
    arm.position.set(ex * 1.25, 0.78, 0.15);
    arm.rotation.z = ex < 0 ? 0.5 : -0.5;
    mascotGroup.add(ear, cheek, eye, arm);
  });
  const bearNose = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), warmWoodMat);
  bearNose.position.set(0, 1.43, 0.51);
  const mascotStar = buildSculptedStar(0.32, 0.09, butterYellowMat);
  mascotStar.position.set(0, 0.86, 0.56);
  mascotGroup.add(bearBelly, bearHead, bearNose, mascotStar);
  lobbyDecor.add(mascotGroup);
  colliders.push({type: 'circle', id: 'mall_f1_cartoon_mascot', x: -20.2, z: -16.8, r: 1.58});
  addMallProxy(
    group,
    [2.8, 2.5, 2.8],
    [-20.2, 1.25, -16.8],
    {kind: 'mall_cartoon_gallery', tx: -20.2, tz: -14.4},
    clickTargets,
  );

  // 3 Miniature Cartoon Furniture Display Pedestals
  [
    {px: -26.5, pz: -18.5, col: '#FF9EB5', kind: 'cloud'},
    {px: -26.5, pz: -15.5, col: '#7ED6C2', kind: 'star'},
    {px: -15.5, pz: -19.2, col: '#FFD66E', kind: 'bunny'},
  ].forEach(({px, pz, col, kind}, idx) => {
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.62, 0.76, 16), creamFoamMat);
    ped.position.set(px, 0.4, pz);
    const accentBand = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.1, 16), glossyClayMat(col, 0.36));
    accentBand.position.set(px, 0.74, pz);
    lobbyDecor.add(ped, accentBand);
    if (kind === 'cloud') {
      const mini = buildSculptedCloud(0.7, glossyClayMat('#FFFFFF', 0.32));
      mini.position.set(px, 1.02, pz);
      lobbyDecor.add(mini);
    } else if (kind === 'star') {
      const mini = buildSculptedStar(0.28, 0.09, butterYellowMat);
      mini.position.set(px, 1.06, pz);
      lobbyDecor.add(mini);
    } else {
      const miniChair = new THREE.Mesh(new RoundedBoxGeometry(0.45, 0.34, 0.4, 2, 0.08), berryPinkMat);
      miniChair.position.set(px, 0.98, pz);
      [-0.12, 0.12].forEach((ex) => {
        const ear = new THREE.Mesh(new RoundedBoxGeometry(0.09, 0.34, 0.08, 2, 0.03), berryPinkMat);
        ear.position.set(px + ex, 1.28, pz - 0.12);
        lobbyDecor.add(ear);
      });
      lobbyDecor.add(miniChair);
    }
    colliders.push({type: 'circle', id: `mall_f1_cartoon_ped_${idx}`, x: px, z: pz, r: 0.7});
    addMallProxy(
      group,
      [1.2, 1.5, 1.2],
      [px, 0.75, pz],
      {kind: 'mall_cartoon_gallery', tx: px + 1.45, tz: pz},
      clickTargets,
    );
  });

  // Giant Pastel Rainbow Arch + Cartoon Cloud Floor Lamp + Plush/Gift Display Shelf (ZERO sinking seats!)
  const rainbowGroup = new THREE.Group();
  rainbowGroup.position.set(-15.6, 0.036, -11.4);
  [
    {r: 1.55, tube: 0.12, mat: berryPinkMat},
    {r: 1.33, tube: 0.11, mat: butterYellowMat},
    {r: 1.12, tube: 0.11, mat: mintMat},
    {r: 0.91, tube: 0.1, mat: skyAccentMat},
  ].forEach(({r, tube, mat}) => {
    const arc = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 10, 28, Math.PI), mat);
    arc.position.y = 0.35;
    rainbowGroup.add(arc);
  });
  [-1.25, 1.25].forEach((cx) => {
    const baseCloud = buildSculptedCloud(0.95, creamFoamMat);
    baseCloud.position.set(cx, 0.25, 0);
    rainbowGroup.add(baseCloud);
  });
  lobbyDecor.add(rainbowGroup);
  colliders.push({type: 'circle', id: 'mall_f1_rainbow_l', x: -16.85, z: -11.4, r: 0.56});
  colliders.push({type: 'circle', id: 'mall_f1_rainbow_r', x: -14.35, z: -11.4, r: 0.56});
  addMallProxy(
    group,
    [3.2, 2.2, 1.1],
    [-15.6, 1.1, -11.4],
    {kind: 'mall_cartoon_gallery', tx: -15.6, tz: -9.5},
    clickTargets,
  );

  // Oversized Cartoon Cloud Floor Lamp at (-13.4, -14.8)
  const lampPost = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.85, 10), goldMat);
  lampPost.position.set(-13.4, 0.95, -14.8);
  const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.44, 0.12, 14), lavenderMat);
  lampBase.position.set(-13.4, 0.09, -14.8);
  const lampCloud = buildSculptedCloud(0.92, warmLampMat);
  lampCloud.position.set(-13.4, 1.98, -14.8);
  lobbyDecor.add(lampPost, lampBase, lampCloud);
  colliders.push({type: 'circle', id: 'mall_f1_cartoon_lamp', x: -13.4, z: -14.8, r: 0.48});

  // Pastel Plush & Gift Display Shelf at (-26.8, -11.4)
  const plushShelf = new THREE.Mesh(new RoundedBoxGeometry(2.1, 1.75, 0.64, 3, 0.06), lavenderMat);
  plushShelf.position.set(-26.8, 0.91, -11.4);
  const shelfStepA = new THREE.Mesh(new RoundedBoxGeometry(1.9, 0.08, 0.56, 2, 0.02), creamFoamMat);
  shelfStepA.position.set(-26.8, 0.72, -11.35);
  const shelfStepB = shelfStepA.clone();
  shelfStepB.position.y = 1.28;
  lobbyDecor.add(plushShelf, shelfStepA, shelfStepB);
  [-27.3, -26.8, -26.3].forEach((px, idx) => {
    const gift = new THREE.Mesh(
      new RoundedBoxGeometry(0.32, 0.28, 0.28, 2, 0.04),
      idx === 0 ? berryPinkMat : idx === 1 ? butterYellowMat : mintMat,
    );
    gift.position.set(px, 1.46, -11.24);
    const plush = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 10, 8),
      idx === 1 ? creamFoamMat : berryPinkMat,
    );
    plush.position.set(px, 0.92, -11.24);
    lobbyDecor.add(gift, plush);
  });
  colliders.push({type: 'box', id: 'mall_f1_plush_shelf', x: -26.8, z: -11.4, hw: 1.15, hd: 0.42});
  addMallProxy(
    group,
    [2.1, 1.8, 0.8],
    [-26.8, 0.9, -11.4],
    {kind: 'mall_cartoon_gallery', tx: -26.8, tz: -9.7},
    clickTargets,
  );

  // ---------- 7D. KHU VUI CHƠI MỀM PASTEL (NORTH-EAST OPEN WING: x=+11.8..+29, z=-22.2..-6.5) ----------
  const playPad = new THREE.Mesh(
    new RoundedBoxGeometry(16.8, 0.036, 15.2, 2, 0.015),
    clayMat('#EEF6FF', 0.62),
  );
  playPad.position.set(20.4, 0.018, -14.4);
  lobbyDecor.add(playPad);

  // Soft Foam Pastel Play Mat Zones (clearly distinct from Town's outdoor grass/wood playground!)
  [
    {x: 15.6, z: -14.0, w: 4.4, d: 4.2, mat: clayMat('#FFE6EE', 0.66)},
    {x: 21.2, z: -11.8, w: 5.0, d: 3.4, mat: clayMat('#E5F7EF', 0.66)},
    {x: 25.6, z: -16.2, w: 4.4, d: 8.6, mat: clayMat('#FFF5DA', 0.66)},
  ].forEach(({x, z, w, d, mat}) => {
    const foam = new THREE.Mesh(new RoundedBoxGeometry(w, 0.032, d, 2, 0.014), mat);
    foam.position.set(x, 0.042, z);
    lobbyDecor.add(foam);
  });

  // (1) Interactive Pastel Rainbow Swing (Xích Đu Cầu Vồng) at (15.6, -14.0)
  let mallSwingPivot: THREE.Group | null = null;
  let mallSwingSeated = false;
  let mallSwingPhase = 0;
  let mallSwingAmp = 0.06;
  {
    const swingBase = new THREE.Group();
    swingBase.position.set(15.6, 0.036, -14.0);

    [-1.24, 1.24].forEach((sx) => {
      const legF = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.095, 2.6, 10), skyAccentMat);
      legF.position.set(sx, 1.24, 0.42);
      legF.rotation.x = -0.3;
      const legB = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.095, 2.6, 10), berryPinkMat);
      legB.position.set(sx, 1.24, -0.42);
      legB.rotation.x = 0.3;
      const cloudCap = buildSculptedCloud(0.58, creamFoamMat);
      cloudCap.position.set(sx, 2.46, 0);
      swingBase.add(legF, legB, cloudCap);
    });
    const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 2.7, 12), butterYellowMat);
    crossbar.rotation.z = Math.PI / 2;
    crossbar.position.y = 2.44;
    const rainbowTop = new THREE.Mesh(new THREE.TorusGeometry(1.18, 0.075, 10, 24, Math.PI), berryPinkMat);
    rainbowTop.position.set(0, 2.44, 0);
    swingBase.add(crossbar, rainbowTop);

    mallSwingPivot = new THREE.Group();
    mallSwingPivot.position.set(0, 2.44, 0);
    [-0.54, 0.54].forEach((rx) => {
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 1.8, 8), goldMat);
      chain.position.set(rx, -0.9, 0);
      mallSwingPivot!.add(chain);
    });
    const swingSeat = new THREE.Mesh(new RoundedBoxGeometry(1.22, 0.11, 0.5, 2, 0.04), berryPinkMat);
    swingSeat.position.y = -1.8;
    const seatCushion = new THREE.Mesh(new RoundedBoxGeometry(1.04, 0.05, 0.4, 2, 0.02), creamFoamMat);
    seatCushion.position.y = -1.73;
    mallSwingPivot.add(swingSeat, seatCushion);
    swingBase.add(mallSwingPivot);
    group.add(swingBase);

    colliders.push({type: 'box', id: 'mall_f1_swing', x: 15.6, z: -14.0, hw: 1.45, hd: 0.72});
    addMallProxy(
      group,
      [2.6, 2.6, 1.5],
      [15.6, 1.3, -14.0],
      {
        kind: 'mall_swing',
        tx: 15.6,
        tz: -12.15,
        seatX: 15.6,
        seatZ: -14.0,
        seatY: 0.72,
        sitRotY: 0,
      },
      clickTargets,
    );
  }

  // (2) Interactive Pastel Cloud Seesaw (Bập Bênh Đám Mây) at (21.2, -11.8)
  let mallSeesawPivot: THREE.Group | null = null;
  let mallSeesawRiderSide: -1 | 1 | null = null;
  let mallSeesawPhase = 0;
  let mallSeesawAngle = 0.08;
  {
    const seesawBase = new THREE.Group();
    seesawBase.position.set(21.2, 0.036, -11.8);

    const fulcrumBase = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.46, 0.56, 14), lavenderMat);
    fulcrumBase.position.y = 0.28;
    const starHub = buildSculptedStar(0.24, 0.09, butterYellowMat);
    starHub.position.set(0, 0.48, 0.28);
    seesawBase.add(fulcrumBase, starHub);

    mallSeesawPivot = new THREE.Group();
    mallSeesawPivot.position.set(0, 0.56, 0);
    const beam = new THREE.Mesh(new RoundedBoxGeometry(3.25, 0.14, 0.52, 3, 0.05), skyAccentMat);
    mallSeesawPivot.add(beam);

    ([-1, 1] as const).forEach((side) => {
      const seatXLocal = side * 1.18;
      const pad = new THREE.Mesh(
        new RoundedBoxGeometry(0.56, 0.1, 0.46, 2, 0.04),
        side < 0 ? berryPinkMat : mintMat,
      );
      pad.position.set(seatXLocal, 0.11, 0);
      const handleStem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.34, 8), butterYellowMat);
      handleStem.position.set(side * 0.74, 0.22, 0);
      const handleBar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.38, 8), butterYellowMat);
      handleBar.rotation.x = Math.PI / 2;
      handleBar.position.set(side * 0.74, 0.38, 0);
      mallSeesawPivot!.add(pad, handleStem, handleBar);
    });
    seesawBase.add(mallSeesawPivot);
    group.add(seesawBase);

    colliders.push({type: 'box', id: 'mall_f1_seesaw', x: 21.2, z: -11.8, hw: 1.75, hd: 0.55});
    ([-1, 1] as const).forEach((side) => {
      const seatWorldX = 21.2 + side * 1.18;
      addMallProxy(
        group,
        [1.15, 1.0, 0.95],
        [seatWorldX, 0.68, -11.8],
        {
          kind: 'mall_seesaw',
          side,
          tx: seatWorldX,
          tz: -10.55,
          seatX: seatWorldX,
          seatZ: -11.8,
          seatY: 0.76,
          sitRotY: side < 0 ? Math.PI / 2 : -Math.PI / 2,
        },
        clickTargets,
      );
    });
  }

  // (3) Interactive Pastel Pink Cloud Slide (Cầu Tuột Mây Hồng) at (25.6, -16.8)
  {
    const slideGroup = new THREE.Group();
    slideGroup.position.set(25.6, 0.036, 0);

    // Top landing deck at z = -17.6, y = 1.85
    [-0.58, 0.58].forEach((lx) => {
      [-18.2, -17.0].forEach((lz) => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.075, 2.7, 10), creamFoamMat);
        post.position.set(lx, 1.35, lz);
        slideGroup.add(post);
      });
    });
    const deck = new THREE.Mesh(new RoundedBoxGeometry(1.36, 0.14, 1.36, 2, 0.04), berryPinkMat);
    deck.position.set(0, 1.82, -17.6);
    const canopyArch = new THREE.Mesh(new THREE.SphereGeometry(0.86, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), skyAccentMat);
    canopyArch.scale.set(1.0, 0.65, 1.05);
    canopyArch.position.set(0, 2.68, -17.6);
    const canopyStar = buildSculptedStar(0.22, 0.06, butterYellowMat);
    canopyStar.position.set(0, 3.35, -17.6);
    slideGroup.add(deck, canopyArch, canopyStar);

    // Back climbing steps from z = -19.2 up to z = -18.2
    for (let st = 0; st < 5; st++) {
      const step = new THREE.Mesh(new RoundedBoxGeometry(0.92, 0.1, 0.28, 2, 0.03), mintMat);
      step.position.set(0, 0.3 + st * 0.34, -19.2 + st * 0.24);
      slideGroup.add(step);
    }
    [-0.52, 0.52].forEach((rx) => {
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.1, 8), butterYellowMat);
      rail.position.set(rx, 1.25, -18.75);
      rail.rotation.x = 0.55;
      slideGroup.add(rail);
    });

    // Smooth Curved Slide Chute descending forward (+Z) from z=-17.0 down to z=-13.2
    const chuteSteps = 14;
    for (let i = 0; i < chuteSteps; i++) {
      const u = i / (chuteSteps - 1);
      const cz = THREE.MathUtils.lerp(-17.0, -13.15, u);
      const cy = THREE.MathUtils.lerp(1.76, 0.12, u * u * (3 - 2 * u));
      const slopePitch = Math.atan2(1.64, 3.85) * (0.4 + 0.6 * Math.sin(u * Math.PI));
      const seg = new THREE.Mesh(new RoundedBoxGeometry(0.94, 0.1, 0.42, 2, 0.03), berryPinkMat);
      seg.position.set(0, cy, cz);
      seg.rotation.x = slopePitch;
      slideGroup.add(seg);

      [-0.49, 0.49].forEach((wx) => {
        const wall = new THREE.Mesh(new RoundedBoxGeometry(0.09, 0.22, 0.42, 2, 0.025), creamFoamMat);
        wall.position.set(wx, cy + 0.11, cz);
        wall.rotation.x = slopePitch;
        slideGroup.add(wall);
      });
    }

    lobbyDecor.add(slideGroup);
    colliders.push({type: 'box', id: 'mall_f1_slide', x: 25.6, z: -16.4, hw: 1.05, hd: 2.85});
    addMallProxy(
      group,
      [1.8, 3.2, 6.2],
      [25.6, 1.6, -16.2],
      {kind: 'mall_slide', tx: 25.6, tz: -19.85},
      clickTargets,
    );
  }

  // (4) Cute Mini Pastel Ball Pit at (16.2, -19.6)
  {
    const pitWall = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.24, 12, 28), mintMat);
    pitWall.rotation.x = Math.PI / 2;
    pitWall.position.set(16.2, 0.24, -19.6);
    const pitFloor = new THREE.Mesh(new THREE.CylinderGeometry(1.48, 1.48, 0.06, 24), creamFoamMat);
    pitFloor.position.set(16.2, 0.06, -19.6);
    lobbyDecor.add(pitWall, pitFloor);
    for (let b = 0; b < 18; b++) {
      const ang = (b / 18) * Math.PI * 2 + (b % 3) * 0.4;
      const rad = 0.28 + ((b * 7) % 10) * 0.1;
      const ball = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 10, 8),
        b % 4 === 0 ? berryPinkMat : b % 4 === 1 ? butterYellowMat : b % 4 === 2 ? skyAccentMat : lavenderMat,
      );
      ball.position.set(16.2 + Math.cos(ang) * rad, 0.2 + (b % 2) * 0.08, -19.6 + Math.sin(ang) * rad);
      lobbyDecor.add(ball);
    }
    colliders.push({type: 'circle', id: 'mall_f1_ballpit', x: 16.2, z: -19.6, r: 1.75});
  }

  // ---------- 7E. SOUTH-CENTRAL ATRIUM PEACH BLOSSOM FOUNTAIN & DIRECTORY BOARD ----------
  const fountainX = 0;
  const fountainZ = 13.2;
  const ftnBase = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 2.0, 0.42, 28), creamFoamMat);
  ftnBase.position.set(fountainX, 0.21, fountainZ);
  const ftnWater = new THREE.Mesh(
    new THREE.CylinderGeometry(1.62, 1.62, 0.08, 24),
    glossyClayMat('#9BE4FF', 0.14),
  );
  ftnWater.position.set(fountainX, 0.42, fountainZ);
  const ftnPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 0.85, 16), creamFoamMat);
  ftnPillar.position.set(fountainX, 0.72, fountainZ);
  const ftnBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.42, 0.24, 20), lavenderMat);
  ftnBowl.position.set(fountainX, 1.16, fountainZ);
  const ftnBlossomTree = new THREE.Group();
  ftnBlossomTree.position.set(fountainX, 1.28, fountainZ);
  const ftnTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.13, 0.92, 10), warmWoodMat);
  ftnTrunk.position.y = 0.44;
  ftnBlossomTree.add(ftnTrunk);
  [
    [0, 1.02, 0, 0.56],
    [-0.38, 0.86, 0.2, 0.36],
    [0.36, 0.88, -0.18, 0.38],
    [0.12, 1.24, 0.18, 0.32],
  ].forEach(([bx, by, bz, br]) => {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(br, 12, 10), peachBlossomMat);
    puff.position.set(bx, by, bz);
    ftnBlossomTree.add(puff);
  });
  lobbyDecor.add(ftnBase, ftnWater, ftnPillar, ftnBowl, ftnBlossomTree);
  colliders.push({type: 'circle', id: 'mall_f1_atrium_fountain', x: fountainX, z: fountainZ, r: 2.02});

  // Grand Promenade Champagne-Gold & Coral-Blush Velvet Carpet Runners (strict non-overlapping Y clearance)
  const carpetGoldMat = clayMat('#E9C46A', 0.44);
  carpetGoldMat.polygonOffset = true;
  carpetGoldMat.polygonOffsetFactor = -2;
  carpetGoldMat.polygonOffsetUnits = -2;
  const carpetBlushMat = clayMat('#F28A9E', 0.72);
  carpetBlushMat.polygonOffset = true;
  carpetBlushMat.polygonOffsetFactor = -3;
  carpetBlushMat.polygonOffsetUnits = -3;
  [
    {x: 0, z: 18.4, w: 3.4, d: 6.0},
    {x: 0, z: 9.8, w: 3.4, d: 2.6},
  ].forEach(({x, z, w, d}) => {
    const runnerTrim = new THREE.Mesh(new RoundedBoxGeometry(w + 0.32, 0.024, d, 1, 0.006), carpetGoldMat);
    runnerTrim.position.set(x, 0.03, z);
    const runnerCore = new THREE.Mesh(new RoundedBoxGeometry(w, 0.022, d - 0.12, 1, 0.006), carpetBlushMat);
    runnerCore.position.set(x, 0.056, z);
    lobbyDecor.add(runnerTrim, runnerCore);
  });

  // Entrance Promenade Bollard Light Pillars flanking Walkway (clear of entrance lane)
  [-3.8, 3.8].forEach((bx) => {
    [16.2, 21.0].forEach((bz) => {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.28, 0.48, 12), creamFoamMat);
      pot.position.set(bx, 0.24, bz);
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10), warmLampMat);
      glow.position.set(bx, 0.62, bz);
      const bush = new THREE.Mesh(new THREE.SphereGeometry(0.24, 9, 8), leafMat);
      bush.position.set(bx, 0.5, bz);
      lobbyDecor.add(pot, bush, glow);
      colliders.push({type: 'circle', id: `mall_f1_bollard_${bx}_${bz}`, x: bx, z: bz, r: 0.38});
    });
  });

  // Mall Directory Board near South Entrance at (-5.6, +18.8)
  const dirStand = new THREE.Mesh(new RoundedBoxGeometry(1.55, 1.75, 0.18, 3, 0.05), creamFoamMat);
  dirStand.position.set(-5.6, 0.96, 18.8);
  dirStand.rotation.y = 0.35;
  const dirBase = new THREE.Mesh(new RoundedBoxGeometry(1.65, 0.16, 0.58, 2, 0.04), warmWoodMat);
  dirBase.position.set(-5.6, 0.08, 18.8);
  dirBase.rotation.y = 0.35;
  const dirTex = createStorefrontSignTexture('BẢN ĐỒ MALL', '#549EE0', '#E9F4FF', '#1F5588', disposables, isDisposed);
  const dirFace = new THREE.Mesh(
    new THREE.PlaneGeometry(1.36, 0.42),
    new THREE.MeshBasicMaterial({map: dirTex}),
  );
  dirFace.position.set(-5.56, 1.48, 18.9);
  dirFace.rotation.y = 0.35;
  lobbyDecor.add(dirStand, dirBase);
  group.add(dirFace);
  colliders.push({type: 'circle', id: 'mall_f1_directory', x: -5.6, z: 18.8, r: 0.85});
  addMallProxy(
    group,
    [1.6, 1.9, 0.8],
    [-5.6, 0.95, 18.8],
    {kind: 'mall_directory', tx: -5.0, tz: 17.4},
    clickTargets,
  );

  // Symmetric Pastel Cloud Star Welcome Totem on Right Side of Entrance Promenade (+5.6, +18.8)
  const promoGroup = new THREE.Group();
  promoGroup.position.set(5.6, 0.04, 18.8);
  promoGroup.rotation.y = -0.35;
  const promoPlinth = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.74, 0.36, 18), creamFoamMat);
  promoPlinth.position.y = 0.18;
  const promoRim = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.04, 8, 20), goldMat);
  promoRim.rotation.x = Math.PI / 2;
  promoRim.position.y = 0.36;
  const promoPole = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 1.15, 10), berryPinkMat);
  promoPole.position.y = 0.92;
  const promoCloud = buildSculptedCloud(0.95, creamFoamMat);
  promoCloud.position.y = 1.62;
  const promoStar = buildSculptedStar(0.32, 0.1, butterYellowMat);
  promoStar.position.set(0, 2.02, 0.08);
  promoGroup.add(promoPlinth, promoRim, promoPole, promoCloud, promoStar);
  lobbyDecor.add(promoGroup);
  colliders.push({type: 'circle', id: 'mall_f1_promo_totem', x: 5.6, z: 18.8, r: 0.85});

  mergeStaticGroupByMaterial(lobbyDecor);
  group.add(lobbyDecor);

  // ========== 8. GRAND SOUTH GLASS EXIT PORTAL (Z = +25.4 -> BACK TO TOWN, NO EXIT LABEL) ==========
  const exitPortal = new THREE.Group();
  const exitTrim = new THREE.Mesh(
    new RoundedBoxGeometry(4.45, 0.026, 3.85, 2, 0.008),
    carpetGoldMat,
  );
  exitTrim.position.set(0, 0.03, MALL_HALF_D - 2.2);
  const exitRugMat = clayMat('#B9464E', 0.82);
  exitRugMat.polygonOffset = true;
  exitRugMat.polygonOffsetFactor = -3;
  exitRugMat.polygonOffsetUnits = -3;
  const exitRug = new THREE.Mesh(
    new RoundedBoxGeometry(4.12, 0.024, 3.52, 2, 0.008),
    exitRugMat,
  );
  exitRug.position.set(0, 0.058, MALL_HALF_D - 2.2);

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

  // Dynamic Update: Tun & Barista idle breathing + smooth escalator step loop + indoor Swing & Seesaw animations!
  const _stepDummy = new THREE.Object3D();
  const _swingWorldPos = new THREE.Vector3();
  const _seesawWorldPos = new THREE.Vector3();
  let lastElapsed = 0;

  const update = (elapsed: number, timeOfDay: TimeOfDay) => {
    const dt = Math.min(0.05, Math.max(0.001, elapsed - lastElapsed));
    lastElapsed = elapsed;

    updateAvatarRigAnimation(tunRig, 'idle', elapsed, false);
    updateAvatarRigAnimation(baristaRig, 'idle', elapsed + 1.35, false);
    const isNight = timeOfDay === 'night';
    warmLampMat.emissiveIntensity = isNight ? 1.1 : 0.36;
    ceilingLightMat.emissiveIntensity = isNight ? 1.15 : 0.85;
    windowPaneMat.emissive.set(isNight ? '#3B6DA6' : '#8ED8F8');
    windowPaneMat.emissiveIntensity = isNight ? 0.28 : 0.16;

    // Indoor Rainbow Swing pendulum
    const targetSwingAmp = mallSwingSeated ? 0.48 : 0.065;
    const swingFreq = mallSwingSeated ? 2.4 : 1.3;
    mallSwingAmp = THREE.MathUtils.lerp(mallSwingAmp, targetSwingAmp, 1 - Math.exp(-3.6 * dt));
    mallSwingPhase += dt * swingFreq;
    if (mallSwingPivot) {
      mallSwingPivot.rotation.x = Math.sin(mallSwingPhase) * mallSwingAmp;
    }

    // Indoor Cloud Seesaw gentle rocking
    const seesawTargetAmp = mallSeesawRiderSide !== null ? 0.22 : 0.08;
    const seesawFreq = mallSeesawRiderSide !== null ? 2.3 : 1.2;
    mallSeesawPhase += dt * seesawFreq;
    const targetRoll = Math.sin(mallSeesawPhase) * seesawTargetAmp;
    mallSeesawAngle = THREE.MathUtils.lerp(mallSeesawAngle, targetRoll, 1 - Math.exp(-5.0 * dt));
    if (mallSeesawPivot) {
      mallSeesawPivot.rotation.z = mallSeesawAngle;
    }

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
    setMallSwingSeated: (seated: boolean) => {
      mallSwingSeated = seated;
    },
    getMallSwingSeatPose: () => {
      if (!mallSwingPivot) return null;
      mallSwingPivot.updateMatrixWorld(true);
      _swingWorldPos.set(0, -1.7, 0).applyMatrix4(mallSwingPivot.matrixWorld);
      return {
        x: _swingWorldPos.x,
        y: _swingWorldPos.y,
        z: _swingWorldPos.z,
        pitch: mallSwingPivot.rotation.x,
      };
    },
    setMallSeesawRider: (side: -1 | 1 | null) => {
      mallSeesawRiderSide = side;
    },
    getMallSeesawSeatPose: (side: -1 | 1) => {
      if (!mallSeesawPivot) return null;
      mallSeesawPivot.updateMatrixWorld(true);
      _seesawWorldPos.set(side * 1.18, 0.18, 0).applyMatrix4(mallSeesawPivot.matrixWorld);
      return {
        x: _seesawWorldPos.x,
        y: _seesawWorldPos.y,
        z: _seesawWorldPos.z,
        pitch: mallSeesawPivot.rotation.z * (side < 0 ? 0.35 : -0.35),
        rotY: side < 0 ? Math.PI / 2 : -Math.PI / 2,
      };
    },
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
