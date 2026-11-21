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
export const MALL_UPPER_Y = 6.2;
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

// Dual UP + DOWN Escalators on BOTH Left (-X) and Right (+X) wings of May Mall Grand Lobby
export const MALL_ESCALATOR_LANES: MallEscalatorLane[] = [
  {
    id: 'esc_left_up',
    side: 'left',
    dir: 'up',
    startFloor: 1,
    endFloor: 2,
    startX: -17.6,
    startY: 0,
    startZ: -1.75,
    endX: -26.0,
    endY: MALL_UPPER_Y,
    endZ: -1.75,
    approachX: -16.1,
    approachZ: -1.75,
    exitX: -27.4,
    exitZ: -1.75,
    travelRotY: -Math.PI / 2,
  },
  {
    id: 'esc_left_down',
    side: 'left',
    dir: 'down',
    startFloor: 2,
    endFloor: 1,
    startX: -26.0,
    startY: MALL_UPPER_Y,
    startZ: 1.75,
    endX: -17.6,
    endY: 0,
    endZ: 1.75,
    approachX: -27.4,
    approachZ: 1.75,
    exitX: -16.1,
    exitZ: 1.75,
    travelRotY: Math.PI / 2,
  },
  {
    id: 'esc_right_up',
    side: 'right',
    dir: 'up',
    startFloor: 1,
    endFloor: 2,
    startX: 17.6,
    startY: 0,
    startZ: -1.75,
    endX: 26.0,
    endY: MALL_UPPER_Y,
    endZ: -1.75,
    approachX: 16.1,
    approachZ: -1.75,
    exitX: 27.4,
    exitZ: -1.75,
    travelRotY: Math.PI / 2,
  },
  {
    id: 'esc_right_down',
    side: 'right',
    dir: 'down',
    startFloor: 2,
    endFloor: 1,
    startX: 26.0,
    startY: MALL_UPPER_Y,
    startZ: 1.75,
    endX: 17.6,
    endY: 0,
    endZ: 1.75,
    approachX: 27.4,
    approachZ: 1.75,
    exitX: 16.1,
    exitZ: 1.75,
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

    // Keep away from the Left & Right escalator stairwell wells (17.2 <= |x| <= 26.15 && |z| < 3.65)
    const absX = Math.abs(cx);
    if (absX > 17.1 && absX < 26.15 && Math.abs(cz) < 3.65) {
      const sign = cx >= 0 ? 1 : -1;
      const dOuter = 26.15 - absX;
      const dSide = 3.65 - Math.abs(cz);
      if (dOuter <= dSide) {
        cx = sign * 26.15;
      } else {
        cz = (cz >= 0 ? 1 : -1) * 3.65;
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

function createDirectionArrowTexture(dir: 'up' | 'down'): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = dir === 'up' ? '#1E8268' : '#2C6A9E';
    ctx.beginPath();
    ctx.roundRect(6, 6, 116, 116, 22);
    ctx.fill();
    ctx.strokeStyle = dir === 'up' ? '#8CF2CE' : '#96DAFF';
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    if (dir === 'up') {
      ctx.moveTo(64, 24);
      ctx.lineTo(100, 66);
      ctx.lineTo(78, 66);
      ctx.lineTo(78, 102);
      ctx.lineTo(50, 102);
      ctx.lineTo(50, 66);
      ctx.lineTo(28, 66);
    } else {
      ctx.moveTo(64, 104);
      ctx.lineTo(100, 62);
      ctx.lineTo(78, 62);
      ctx.lineTo(78, 26);
      ctx.lineTo(50, 26);
      ctx.lineTo(50, 62);
      ctx.lineTo(28, 62);
    }
    ctx.closePath();
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
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
  const skylightGlassMat = new THREE.MeshStandardMaterial({
    color: '#DDF6FF',
    emissive: '#8ED8F8',
    emissiveIntensity: 0.14,
    roughness: 0.18,
    transparent: true,
    opacity: 0.42,
    side: THREE.DoubleSide,
  });

  // ========== 1. MASSIVE GROUND FLOOR (64m x 52m) + INLAID CENTRAL MEDALLION ==========
  const floor1Tex = createCheckerFloorTexture('#F7F2E7', '#ECE4D3');
  floor1Tex.repeat.set(18, 15);
  disposables.push(floor1Tex);
  const groundMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(MALL_HALF_W * 2, MALL_HALF_D * 2),
    new THREE.MeshStandardMaterial({map: floor1Tex, roughness: 0.56, metalness: 0.04}),
  );
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.userData = {kind: 'ground', mallFloor: 1};
  group.add(groundMesh);

  const subFloor = new THREE.Mesh(
    new THREE.BoxGeometry(MALL_HALF_W * 2 + 1.2, 0.5, MALL_HALF_D * 2 + 1.2),
    creamTrimMat,
  );
  subFloor.position.y = -0.26;
  group.add(subFloor);

  // Decorative plaza medallion ring under the vehicle showroom
  const plazaRingOuter = new THREE.Mesh(
    new THREE.CylinderGeometry(8.6, 8.6, 0.025, 48),
    clayMat('#DFEEF7', 0.55),
  );
  plazaRingOuter.position.set(0.6, 0.01, 0);
  const plazaRingInner = new THREE.Mesh(
    new THREE.CylinderGeometry(6.8, 6.8, 0.032, 48),
    clayMat('#FFF9EF', 0.52),
  );
  plazaRingInner.position.set(0.6, 0.015, 0);
  group.add(plazaRingOuter, plazaRingInner);

  // ========== 2. MASSIVE UPPER FLOOR 2 MEZZANINE (HUGE OPEN SPACE AROUND CENTRAL ATRIUM) ==========
  const floor2Tex = createCheckerFloorTexture('#F6F0E4', '#E6DCC8');
  floor2Tex.repeat.set(14, 12);
  disposables.push(floor2Tex);
  const floor2Mat = new THREE.MeshStandardMaterial({map: floor2Tex, roughness: 0.58, metalness: 0.04});

  // Build Floor 2 slab out of clean walkable panels leaving Atrium + 2 Escalator Stairwells cleanly open!
  const floor2WalkGroup = new THREE.Group();
  const makeFloor2DeckPanel = (cx: number, cz: number, w: number, d: number) => {
    // Visual + raycast deck panel
    const slab = new THREE.Mesh(new THREE.BoxGeometry(w, 0.42, d), floor2Mat);
    slab.position.set(cx, MALL_UPPER_Y - 0.21, cz);
    slab.userData = {kind: 'ground', mallFloor: 2};
    floor2WalkGroup.add(slab);

    // Warm cream soffit underneath Floor 2
    const soffit = new THREE.Mesh(new THREE.BoxGeometry(w, 0.14, d), creamTrimMat);
    soffit.position.set(cx, MALL_UPPER_Y - 0.48, cz);
    group.add(soffit);
  };

  // North Huge Promenade Wing (z = -26..-12, full 64m wide! Ideal for future restaurant & shops)
  makeFloor2DeckPanel(0, -19.0, MALL_HALF_W * 2, 14.0);
  // South Promenade Wing (z = +12..+26, full 64m wide)
  makeFloor2DeckPanel(0, 19.0, MALL_HALF_W * 2, 14.0);
  // West Outer Wing behind Left Escalators (x = -32..-26, z = -12..+12)
  makeFloor2DeckPanel(-29.0, 0, 6.0, 24.0);
  // West Mid Wing North & South of Left Escalator Well (x = -26..-16, z = -12..-3.4 & +3.4..+12)
  makeFloor2DeckPanel(-21.0, -7.7, 10.0, 8.6);
  makeFloor2DeckPanel(-21.0, 7.7, 10.0, 8.6);
  // West Thin Strip Between Atrium Rail & Escalator Landing (x = -17.4..-16.0, z = -3.4..+3.4)
  makeFloor2DeckPanel(-16.7, 0, 1.4, 6.8);
  // East Outer Wing behind Right Escalators (x = +26..+32, z = -12..+12)
  makeFloor2DeckPanel(29.0, 0, 6.0, 24.0);
  // East Mid Wing North & South of Right Escalator Well (x = +16..+26, z = -12..-3.4 & +3.4..+12)
  makeFloor2DeckPanel(21.0, -7.7, 10.0, 8.6);
  makeFloor2DeckPanel(21.0, 7.7, 10.0, 8.6);
  // East Thin Strip Between Atrium Rail & Escalator Landing (x = +16.0..+17.4, z = -3.4..+3.4)
  makeFloor2DeckPanel(16.7, 0, 1.4, 6.8);

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

    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.96, len), glassRailMat);
    glass.position.set(midX, baseY + 0.52, midZ);
    glass.rotation.y = ang;
    const topCap = new THREE.Mesh(new RoundedBoxGeometry(0.09, 0.06, len + 0.08, 1, 0.02), silverMat);
    topCap.position.set(midX, baseY + 1.03, midZ);
    topCap.rotation.y = ang;
    const curb = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, len + 0.08), creamTrimMat);
    curb.position.set(midX, baseY + 0.06, midZ);
    curb.rotation.y = ang;
    railStatic.add(glass, topCap, curb);

    const posts = Math.max(2, Math.round(len / 3.2) + 1);
    for (let i = 0; i < posts; i++) {
      const t = i / (posts - 1);
      const px = THREE.MathUtils.lerp(x0, x1, t);
      const pz = THREE.MathUtils.lerp(z0, z1, t);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.04, 1.04, 7), darkMetalMat);
      post.position.set(px, baseY + 0.52, pz);
      railStatic.add(post);
    }
  };

  // Central Atrium Void Balustrades (Floor 2 overlooking Floor 1)
  addBalustrade(-MALL_ATRIUM_HALF_W, -MALL_ATRIUM_HALF_D, MALL_ATRIUM_HALF_W, -MALL_ATRIUM_HALF_D);
  addBalustrade(-MALL_ATRIUM_HALF_W, MALL_ATRIUM_HALF_D, MALL_ATRIUM_HALF_W, MALL_ATRIUM_HALF_D);
  addBalustrade(-MALL_ATRIUM_HALF_W, -MALL_ATRIUM_HALF_D, -MALL_ATRIUM_HALF_W, MALL_ATRIUM_HALF_D);
  addBalustrade(MALL_ATRIUM_HALF_W, -MALL_ATRIUM_HALF_D, MALL_ATRIUM_HALF_W, MALL_ATRIUM_HALF_D);

  // Side railings framing Left & Right Escalator Wells on Floor 2 (leaving x = ±26.0 open for boarding!)
  [-1, 1].forEach((side) => {
    const innerX = side * 17.4;
    const outerX = side * 26.0;
    const minX = Math.min(innerX, outerX);
    const maxX = Math.max(innerX, outerX);
    addBalustrade(minX, -3.45, maxX, -3.45);
    addBalustrade(minX, 3.45, maxX, 3.45);
    addBalustrade(innerX, -3.45, innerX, 3.45);
    colliders.push({
      type: 'box',
      id: `mall_f2_esc_well_${side < 0 ? 'l' : 'r'}`,
      x: side * 21.6,
      z: 0,
      hw: 4.2,
      hd: 3.45,
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

  // Architectural Wood Fascia Band Lining Inner Atrium Rim
  [
    [0, -MALL_ATRIUM_HALF_D, MALL_ATRIUM_HALF_W * 2 + 0.4, 0.3],
    [0, MALL_ATRIUM_HALF_D, MALL_ATRIUM_HALF_W * 2 + 0.4, 0.3],
    [-MALL_ATRIUM_HALF_W, 0, 0.3, MALL_ATRIUM_HALF_D * 2],
    [MALL_ATRIUM_HALF_W, 0, 0.3, MALL_ATRIUM_HALF_D * 2],
  ].forEach(([fx, fz, fw, fd]) => {
    const trim = new THREE.Mesh(new THREE.BoxGeometry(fw, 0.56, fd), warmWoodMat);
    trim.position.set(fx, MALL_UPPER_Y - 0.28, fz);
    railStatic.add(trim);
  });
  mergeStaticGroupByMaterial(railStatic);
  group.add(railStatic);

  // ========== 4. GRAND PERIMETER WALLS, LUXURY SHELL ARCADE & VAULTED SKYLIGHT ==========
  const shellGroup = new THREE.Group();
  const WALL_H = 13.6;

  // Perimeter Walls (North, West, East solid; South has wide sunlit glass portal!)
  const wallN = new THREE.Mesh(new THREE.BoxGeometry(MALL_HALF_W * 2 + 0.8, WALL_H, 0.6), pearlWallMat);
  wallN.position.set(0, WALL_H * 0.5, -MALL_HALF_D - 0.2);
  const wallW = new THREE.Mesh(new THREE.BoxGeometry(0.6, WALL_H, MALL_HALF_D * 2 + 0.8), pearlWallMat);
  wallW.position.set(-MALL_HALF_W - 0.2, WALL_H * 0.5, 0);
  const wallE = wallW.clone();
  wallE.position.x = MALL_HALF_W + 0.2;

  // South Wall with Central Glass Entrance Gap (x = -3.4..+3.4, y = 0..4.4 open)
  const wallSL = new THREE.Mesh(new THREE.BoxGeometry(MALL_HALF_W - 3.2, WALL_H, 0.6), pearlWallMat);
  wallSL.position.set(-(MALL_HALF_W + 3.2) * 0.5, WALL_H * 0.5, MALL_HALF_D + 0.2);
  const wallSR = wallSL.clone();
  wallSR.position.x = (MALL_HALF_W + 3.2) * 0.5;
  const wallSCrown = new THREE.Mesh(new THREE.BoxGeometry(6.8, WALL_H - 4.4, 0.6), pearlWallMat);
  wallSCrown.position.set(0, 4.4 + (WALL_H - 4.4) * 0.5, MALL_HALF_D + 0.2);
  shellGroup.add(wallN, wallW, wallE, wallSL, wallSR, wallSCrown);

  // Structural Columns Supporting Floor 2 Mezzanine & Skylight Rib Vault
  for (let cx = -24; cx <= 24; cx += 16) {
    [-12.2, 12.2].forEach((cz) => {
      if (Math.abs(cx) === 8) return; // keep central showroom vista wide open
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, WALL_H - 0.4, 14), upperWallMat);
      col.position.set(cx, (WALL_H - 0.4) * 0.5, cz);
      const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.62, 0.55, 14), creamTrimMat);
      plinth.position.set(cx, 0.275, cz);
      const goldBand = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.14, 14), goldMat);
      goldBand.position.set(cx, MALL_UPPER_Y - 0.25, cz);
      shellGroup.add(col, plinth, goldBand);
      colliders.push({type: 'circle', id: `mall_f1_col_${cx}_${cz}`, x: cx, z: cz, r: 0.62});
      colliders.push({type: 'circle', id: `mall_f2_col_${cx}_${cz}`, x: cx, z: cz, r: 0.62});
    });
  }

  // Empty Placeholder Future-Shop Alcove Frames along Ground North/East/West walls + Floor 2 Clerestory Windows
  [-24, -12, 0, 12, 24].forEach((bx) => {
    const bayFrame = new THREE.Mesh(new RoundedBoxGeometry(9.4, 4.2, 0.24, 2, 0.04), creamTrimMat);
    bayFrame.position.set(bx, 2.2, -MALL_HALF_D + 0.12);
    const bayPane = new THREE.Mesh(new THREE.BoxGeometry(8.6, 3.5, 0.12), skyAccentMat);
    bayPane.position.set(bx, 2.15, -MALL_HALF_D + 0.18);
    shellGroup.add(bayFrame, bayPane);

    // Bright upper clerestory light windows on Floor 2 North & South walls
    const f2WinN = new THREE.Mesh(new RoundedBoxGeometry(8.4, 3.1, 0.18, 2, 0.04), skylightGlassMat);
    f2WinN.position.set(bx, MALL_UPPER_Y + 3.4, -MALL_HALF_D + 0.12);
    shellGroup.add(f2WinN);
  });

  // Grand Translucent Skylight Roof + Arched White Trusses over the Central Atrium (y = 13.6..17.8)
  const skylightRoof = new THREE.Mesh(
    new THREE.CylinderGeometry(16.8, 16.8, 52.4, 20, 1, true, -Math.PI * 0.5, Math.PI),
    skylightGlassMat,
  );
  skylightRoof.rotation.z = Math.PI / 2;
  skylightRoof.rotation.y = Math.PI / 2;
  skylightRoof.scale.set(1, 0.28, 1);
  skylightRoof.position.set(0, WALL_H - 0.1, 0);
  shellGroup.add(skylightRoof);

  // Perimeter Roof Soffit Deck over side mezzanine bays so interior looks fully enclosed & cozy
  [
    [0, -19.5, MALL_HALF_W * 2, 13.0],
    [0, 19.5, MALL_HALF_W * 2, 13.0],
    [-24.2, 0, 15.6, 26.0],
    [24.2, 0, 15.6, 26.0],
  ].forEach(([rx, rz, rw, rd]) => {
    const roofCap = new THREE.Mesh(new THREE.BoxGeometry(rw, 0.32, rd), upperWallMat);
    roofCap.position.set(rx, WALL_H, rz);
    shellGroup.add(roofCap);
  });
  for (let rz = -20; rz <= 20; rz += 10) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(33.5, 0.28, 0.36), silverMat);
    rib.position.set(0, WALL_H - 0.15, rz);
    shellGroup.add(rib);
  }
  mergeStaticGroupByMaterial(shellGroup);
  group.add(shellGroup);

  // ========== 5. ANIMATED LEFT & RIGHT DUAL ESCALATORS (UP + DOWN ON BOTH SIDES) ==========
  const escStatic = new THREE.Group();
  const arrowUpTex = createDirectionArrowTexture('up');
  const arrowDownTex = createDirectionArrowTexture('down');
  disposables.push(arrowUpTex, arrowDownTex);
  const arrowUpMat = new THREE.MeshBasicMaterial({map: arrowUpTex});
  const arrowDownMat = new THREE.MeshBasicMaterial({map: arrowDownTex});

  interface EscalatorAnimMeta {
    lane: MallEscalatorLane;
    stepCount: number;
  }
  const escAnimList: EscalatorAnimMeta[] = [];
  const STEPS_PER_LANE = 22;

  MALL_ESCALATOR_LANES.forEach((lane) => {
    const xLow = lane.side === 'left' ? -17.6 : 17.6;
    const xHigh = lane.side === 'left' ? -26.0 : 26.0;
    const zMid = lane.startZ;
    const dx = xHigh - xLow;
    const dy = MALL_UPPER_Y;
    const diagLen = Math.hypot(dx, dy);
    const slopePitch = Math.atan2(dy, Math.abs(dx)) * (lane.side === 'left' ? -1 : 1);
    const midX = (xLow + xHigh) * 0.5;
    const midY = dy * 0.5;

    // Sloped stainless truss spine
    const truss = new THREE.Mesh(new RoundedBoxGeometry(diagLen + 0.6, 0.42, 1.56, 2, 0.04), silverMat);
    truss.position.set(midX, midY - 0.22, zMid);
    truss.rotation.z = slopePitch;
    escStatic.add(truss);

    // Lower Floor 1 & Upper Floor 2 silver landing comb plates
    const plateLow = new THREE.Mesh(new RoundedBoxGeometry(1.35, 0.08, 1.62, 1, 0.02), darkMetalMat);
    plateLow.position.set(xLow + (lane.side === 'left' ? 0.45 : -0.45), 0.03, zMid);
    const plateHigh = new THREE.Mesh(new RoundedBoxGeometry(1.35, 0.08, 1.62, 1, 0.02), darkMetalMat);
    plateHigh.position.set(xHigh + (lane.side === 'left' ? -0.45 : 0.45), MALL_UPPER_Y + 0.03, zMid);
    escStatic.add(plateLow, plateHigh);

    // Dual sloped glass balustrades + dark moving handrails
    [-0.78, 0.78].forEach((oz) => {
      const glassWall = new THREE.Mesh(new THREE.BoxGeometry(diagLen + 0.4, 0.92, 0.05), glassRailMat);
      glassWall.position.set(midX, midY + 0.44, zMid + oz);
      glassWall.rotation.z = slopePitch;
      const handRail = new THREE.Mesh(
        new RoundedBoxGeometry(diagLen + 0.9, 0.085, 0.11, 2, 0.03),
        darkMetalMat,
      );
      handRail.position.set(midX, midY + 0.94, zMid + oz);
      handRail.rotation.z = slopePitch;
      escStatic.add(glassWall, handRail);
    });

    // Illuminated Floor Entry Arrow Pads (at boarding end of each lane!)
    const padTexMat = lane.dir === 'up' ? arrowUpMat : arrowDownMat;
    const arrowPad = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.95), padTexMat);
    arrowPad.rotation.x = -Math.PI / 2;
    arrowPad.rotation.z = lane.side === 'left' ? Math.PI / 2 : -Math.PI / 2;
    if (lane.startFloor === 1) {
      arrowPad.position.set(lane.approachX + (lane.side === 'left' ? -0.45 : 0.45), 0.025, zMid);
    } else {
      arrowPad.position.set(lane.approachX + (lane.side === 'left' ? 0.45 : -0.45), MALL_UPPER_Y + 0.025, zMid);
    }
    group.add(arrowPad);

    // Click proxy along escalator lane & entry pad
    const hitSlope = new THREE.Mesh(
      new THREE.BoxGeometry(diagLen + 1.6, 1.95, 1.7),
      new THREE.MeshBasicMaterial({visible: false}),
    );
    hitSlope.position.set(midX, midY + 0.65, zMid);
    hitSlope.rotation.z = slopePitch;
    hitSlope.userData = {kind: 'mall_escalator', laneId: lane.id};
    group.add(hitSlope);
    clickTargets.push(hitSlope);

    // Anchor label on entry end of each escalator
    labelAnchors.push({
      id: `mall_esc_lbl_${lane.id}`,
      label: lane.dir === 'up' ? 'Thang Cuốn Lên ▲' : 'Thang Cuốn Xuống ▼',
      worldPos: new THREE.Vector3(
        lane.startX,
        lane.startY + 1.45,
        lane.startZ,
      ),
    });

    escAnimList.push({lane, stepCount: STEPS_PER_LANE});
  });

  // Floor 1 colliders guarding under the diagonal escalator belly so avatars don't clip through low slope
  [-1, 1].forEach((side) => {
    colliders.push({
      type: 'box',
      id: `mall_f1_esc_block_${side < 0 ? 'l' : 'r'}`,
      x: side * 22.0,
      z: 0,
      hw: 4.35,
      hd: 3.45,
    });
  });
  mergeStaticGroupByMaterial(escStatic);
  group.add(escStatic);

  // Single InstancedMesh for ALL 88 Escalator Moving Steps across Left & Right UP/DOWN lanes!
  const stepGeo = new RoundedBoxGeometry(0.46, 0.24, 1.38, 1, 0.015);
  const stepMat = clayMat('#7D8B99', 0.55, 0.35);
  const totalEscSteps = escAnimList.length * STEPS_PER_LANE;
  const escStepsIM = new THREE.InstancedMesh(stepGeo, stepMat, totalEscSteps);
  escStepsIM.frustumCulled = false;
  group.add(escStepsIM);

  // ========== 6. GRAND LOBBY SHOWROOM DAIS, TUN NPC, FUTURISTIC BLUE MINI CONVERTIBLE, BIKE & SKATEBOARD RACK ==========
  const showcaseGroup = new THREE.Group();

  // Central Low Sleek Showroom Dais (walkable perimeter, props collidable)
  const daisX = 0.8;
  const daisZ = -1.2;
  const daisBase = new THREE.Mesh(
    new RoundedBoxGeometry(10.8, 0.12, 5.4, 3, 0.05),
    clayMat('#EDE6D8', 0.5),
  );
  daisBase.position.set(daisX, 0.06, daisZ);
  const daisTop = new THREE.Mesh(
    new RoundedBoxGeometry(10.4, 0.06, 5.0, 3, 0.03),
    clayMat('#FAF8F2', 0.42),
  );
  daisTop.position.set(daisX, 0.14, daisZ);

  // Circular Spotlight Plinth directly under the Futuristic Blue Convertible Car
  const carX = -0.35;
  const carZ = -1.1;
  const turntablePad = new THREE.Mesh(
    new THREE.CylinderGeometry(1.75, 1.85, 0.12, 32),
    clayMat('#DCEFFF', 0.32),
  );
  turntablePad.position.set(carX, 0.21, carZ);
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
  turntableRim.position.set(carX, 0.26, carZ);
  showcaseGroup.add(daisBase, daisTop, turntablePad, turntableRim);

  // Hero Prop 1: Futuristic Cute 1-Seater Blue Luxury Convertible Car
  const carGroup = buildFuturisticMiniConvertible();
  carGroup.position.set(carX, 0.27, carZ);
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

  // Hero Prop 2: Stylized Showroom Bicycle beside Tun & Car
  const bikeX = 2.45;
  const bikeZ = -0.65;
  const bikeGroup = buildShowroomBicycle();
  bikeGroup.position.set(bikeX, 0.17, bikeZ);
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

  // Hero Prop 3: Dynamic Display Rack Holding 2 Sporty Skateboards
  const skateX = 4.65;
  const skateZ = -1.1;
  const skateRackGroup = buildSkateboardRack();
  skateRackGroup.position.set(skateX, 0.17, skateZ);
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

  // Collider guard around Showroom Dais rear/sides (keeping front walking space comfortable)
  colliders.push({type: 'box', id: 'mall_f1_dais', x: daisX, z: daisZ, hw: 5.1, hd: 2.1});

  // NPC Tun standing warmly beside the futuristic blue car in the Grand Lobby
  // CRITICAL: Label "Tun" ONLY appears when player walks very close (enforced in WorldCanvas)!
  const TUN_X = -2.65;
  const TUN_Z = 0.95;
  const tunRig = buildAvatarRig(TUN_AVATAR);
  tunRig.root.position.set(TUN_X, 0, TUN_Z);
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
    worldPos: new THREE.Vector3(TUN_X, 2.25, TUN_Z),
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

  // ========== 8. GRAND SOUTH GLASS EXIT PORTAL (Z = +25.4 -> BACK TO TOWN) ==========
  const exitPortal = new THREE.Group();
  const exitRug = new THREE.Mesh(
    new RoundedBoxGeometry(4.2, 0.03, 3.6, 2, 0.015),
    clayMat('#B9464E', 0.82),
  );
  exitRug.position.set(0, 0.015, MALL_HALF_D - 2.2);
  const exitTrim = new THREE.Mesh(
    new RoundedBoxGeometry(4.45, 0.022, 3.85, 2, 0.01),
    goldMat,
  );
  exitTrim.position.set(0, 0.011, MALL_HALF_D - 2.2);

  [-3.2, 3.2].forEach((px) => {
    const jamb = new THREE.Mesh(new RoundedBoxGeometry(0.32, 4.3, 0.42, 2, 0.04), creamTrimMat);
    jamb.position.set(px, 2.15, MALL_HALF_D - 0.15);
    exitPortal.add(jamb);
  });
  const header = new THREE.Mesh(new RoundedBoxGeometry(6.8, 0.42, 0.48, 2, 0.04), creamTrimMat);
  header.position.set(0, 4.25, MALL_HALF_D - 0.15);
  const doorGlass = new THREE.Mesh(new THREE.BoxGeometry(5.9, 3.9, 0.08), glassRailMat);
  doorGlass.position.set(0, 2.0, MALL_HALF_D - 0.15);
  const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.9, 0.12), silverMat);
  mullion.position.set(0, 2.0, MALL_HALF_D - 0.15);

  exitPortal.add(exitTrim, exitRug, header, doorGlass, mullion);
  mergeStaticGroupByMaterial(exitPortal);
  group.add(exitPortal);

  addMallProxy(
    group,
    [5.8, 3.6, 2.2],
    [0, 1.8, MALL_HALF_D - 0.85],
    {kind: 'exit', tx: 0, tz: MALL_HALF_D - 2.6},
    clickTargets,
  );
  labelAnchors.push({
    id: 'mall_exit',
    label: 'Ra Thị Trấn',
    worldPos: new THREE.Vector3(0, 2.8, MALL_HALF_D - 0.8),
  });

  // Keep walkable area inside Floor 1 clean around walls
  const floor1RayMeshes: THREE.Object3D[] = [groundMesh];
  const floor2RayMeshes: THREE.Object3D[] = floor2WalkGroup.children;

  // Dynamic Update: Tun idle breathing + smooth continuous escalator step loop!
  const _stepDummy = new THREE.Object3D();
  const update = (elapsed: number, timeOfDay: TimeOfDay) => {
    updateAvatarRigAnimation(tunRig, 'idle', elapsed, false);
    const isNight = timeOfDay === 'night';
    warmLampMat.emissiveIntensity = isNight ? 1.1 : 0.36;
    skylightGlassMat.emissive.set(isNight ? '#305B8C' : '#8ED8F8');
    skylightGlassMat.emissiveIntensity = isNight ? 0.24 : 0.14;

    // Smoothly scroll all 4 escalator lanes in 1 shared InstancedMesh
    let instIdx = 0;
    const speedCyclesPerSec = 0.14;
    for (let li = 0; li < escAnimList.length; li++) {
      const {lane, stepCount} = escAnimList[li];
      const travelSign = lane.dir === 'up' ? 1 : -1;
      const offset = (elapsed * speedCyclesPerSec * travelSign) % 1;
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
