import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {AvatarConfig, AvatarPose} from '../types/game';
import {
  buildCharacterHair,
  createHairClayMaterial,
  headSurfacePoint,
} from './hairSystem';
import {clayMat, glossyClayMat, makeShadowed} from './materials';

export type HoldPose = 'none' | 'carry_front' | 'carry_bag' | 'carry_umbrella';

const HEAD_PIVOT_Y = 0.968;

const HAND_POSES: Record<HoldPose, {armX: number; armZ: number; elbowX: number; elbowZ: number}> = {
  none: {armX: 0, armZ: 0.36, elbowX: -0.12, elbowZ: -0.05},
  carry_umbrella: {armX: -0.42, armZ: 0.34, elbowX: -1.06, elbowZ: -0.06},
  carry_front: {armX: -0.34, armZ: 0.3, elbowX: -0.92, elbowZ: -0.12},
  carry_bag: {armX: -0.04, armZ: 0.36, elbowX: -0.18, elbowZ: -0.04},
};

export interface AvatarRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  torsoGroup?: THREE.Group;
  headPivot: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftElbow?: THREE.Group;
  rightElbow?: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  eyelids: THREE.Mesh[];
  shadowDisc?: THREE.Mesh;
  holdPose?: HoldPose;
}

function shadeHex(hex: string, factor: number): THREE.Color {
  const c = new THREE.Color(hex);
  const hsl = {h: 0, s: 0, l: 0};
  c.getHSL(hsl);
  const nextL = Math.min(0.92, Math.max(0.12, hsl.l + factor));
  c.setHSL(hsl.h, hsl.s, nextL);
  return c;
}

/**
 * Builds the sculpted stylized chibi head mesh (flatter brow, soft cheeks, chin, nose).
 */
function createSculptedHeadGeometry(): THREE.BufferGeometry {
  const lonSegs = 64;
  const latSegs = 36;
  const positions: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= latSegs; i++) {
    const latDeg = (i / latSegs) * 180;
    for (let j = 0; j <= lonSegs; j++) {
      const lonDeg = -180 + (j / lonSegs) * 360;
      const [x, y, z] = headSurfacePoint(latDeg, lonDeg, 0, true);
      positions.push(x, y, z);
    }
  }

  const stride = lonSegs + 1;
  for (let i = 0; i < latSegs; i++) {
    for (let j = 0; j < lonSegs; j++) {
      const a = i * stride + j;
      const b = (i + 1) * stride + j;
      const c = (i + 1) * stride + (j + 1);
      const d = i * stride + (j + 1);
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

/**
 * Builds a seamless sculpted accordion/pleated skirt geometry from waist to hem.
 */
function createPleatedSkirtGeometry(
  waistR: number,
  hemR: number,
  height: number,
  pleatCount: number,
  pleatAmp: number,
): THREE.BufferGeometry {
  const radSegs = pleatCount * 4;
  const heightSegs = 6;
  const positions: number[] = [];
  const indices: number[] = [];

  for (let iy = 0; iy <= heightSegs; iy++) {
    const v = iy / heightSegs;
    const y = (0.5 - v) * height;
    const baseR = waistR + (hemR - waistR) * Math.pow(v, 0.92);
    // Start pleat wave at 0 at the waistband so the top ring never pokes through shirts/cardigans
    const amp = pleatAmp * Math.pow(v, 0.85);

    for (let ir = 0; ir <= radSegs; ir++) {
      const u = ir / radSegs;
      const theta = u * Math.PI * 2;
      const wave = Math.cos(theta * pleatCount);
      const r = baseR + amp * wave;
      positions.push(Math.sin(theta) * r, y, Math.cos(theta) * r);
    }
  }

  const stride = radSegs + 1;
  for (let iy = 0; iy < heightSegs; iy++) {
    for (let ir = 0; ir < radSegs; ir++) {
      const a = iy * stride + ir;
      const b = (iy + 1) * stride + ir;
      const c = (iy + 1) * stride + (ir + 1);
      const d = iy * stride + (ir + 1);
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const bottomCenterIdx = positions.length / 3;
  positions.push(0, -height * 0.44, 0);
  const lastRow = heightSegs * stride;
  for (let ir = 0; ir < radSegs; ir++) {
    indices.push(bottomCenterIdx, lastRow + ir + 1, lastRow + ir);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

function createTorsoProfilePoints(scaleOffset = 0, yMin = -0.195, yMax = 0.21): THREE.Vector2[] {
  const basePts: [number, number][] = [
    [0.01, yMin],
    [0.218 + scaleOffset, yMin],
    [0.222 + scaleOffset, -0.14],
    [0.212 + scaleOffset, -0.05],
    [0.204 + scaleOffset, 0.05],
    [0.202 + scaleOffset, 0.128],
    [0.174 + scaleOffset, 0.17],
    [0.114 + scaleOffset * 0.6, 0.198],
    [0.075, yMax],
  ];
  return basePts.map(([r, y]) => new THREE.Vector2(Math.max(0.005, r), y));
}



export function buildAvatarRig(config: AvatarConfig): AvatarRig {
  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  const skinMat = clayMat(config.skinTone, 0.54, 0.02);
  const hairMat = createHairClayMaterial(config.hairColor);
  const topMat = clayMat(config.topColor, 0.66, 0.02);
  const topDarkMat = clayMat(shadeHex(config.topColor, -0.09).getHex(), 0.7, 0.02);
  const topLightMat = clayMat(shadeHex(config.topColor, 0.09).getHex(), 0.62, 0.02);
  const topTrimMat = clayMat('#FFFBF2', 0.7, 0.02);
  const bottomMat = clayMat(config.bottomColor, 0.72, 0.02);
  const bottomDarkMat = clayMat(shadeHex(config.bottomColor, -0.09).getHex(), 0.74, 0.02);
  const bottomLightMat = clayMat(shadeHex(config.bottomColor, 0.07).getHex(), 0.68, 0.02);
  const eyeWhiteMat = glossyClayMat('#FFFFFF', 0.16);
  const irisMat = glossyClayMat(config.eyeColor, 0.14);
  const pupilMat = glossyClayMat('#241B19', 0.12);
  const cheekMat = clayMat('#F28B92', 0.65, 0);

  // Soft contact shadow disc right under the planted shoes
  const shadowDisc = new THREE.Mesh(
    new THREE.CircleGeometry(0.35, 24),
    new THREE.MeshBasicMaterial({
      color: 0x261a14,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    }),
  );
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.004;
  root.add(shadowDisc);

  // ========== LEGS, SOCKS & GROUNDED SHOES ==========
  const sockMat = clayMat('#FFF8EE', 0.72, 0.01);
  const makeLeg = (xOffset: number) => {
    const legPivot = new THREE.Group();
    legPivot.position.set(xOffset, 0.52, 0);

    // Continuous tapered leg extending deep inside the shoe so there is never an empty ankle gap
    const legMat = config.bottom === 'wide_trousers' ? bottomMat : skinMat;
    const hipCap = new THREE.Mesh(new THREE.SphereGeometry(0.078, 14, 12), legMat);
    legPivot.add(hipCap);

    const legMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.078, 0.056, 0.44, 18),
      legMat,
    );
    legMesh.position.y = -0.22;
    legPivot.add(legMesh);

    if (config.bottom === 'wide_trousers') {
      const pantCyl = new THREE.Mesh(
        new THREE.CylinderGeometry(0.094, 0.114, 0.395, 18),
        bottomMat,
      );
      pantCyl.position.y = -0.202;
      legPivot.add(pantCyl);

      const cuff = new THREE.Mesh(
        new THREE.CylinderGeometry(0.118, 0.12, 0.044, 18),
        bottomDarkMat,
      );
      cuff.position.y = -0.395;
      legPivot.add(cuff);
    } else if (config.bottom === 'denim_shorts') {
      const shortMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.106, 0.102, 0.165, 16),
        bottomMat,
      );
      shortMesh.position.y = -0.08;
      legPivot.add(shortMesh);

      const hem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.106, 0.107, 0.026, 16),
        bottomLightMat,
      );
      hem.position.y = -0.16;
      legPivot.add(hem);
    }

    // Knit ankle sock + rolled cuff bridging the lower shin smoothly into shoes
    if (config.bottom !== 'wide_trousers' && config.shoes !== 'boots') {
      const sockTube = new THREE.Mesh(
        new THREE.CylinderGeometry(0.062, 0.059, 0.105, 18),
        sockMat,
      );
      sockTube.position.y = -0.39;
      const sockCuff = new THREE.Mesh(
        new THREE.TorusGeometry(0.06, 0.011, 8, 18),
        sockMat,
      );
      sockCuff.rotation.x = Math.PI / 2;
      sockCuff.position.y = -0.338;
      legPivot.add(sockTube, sockCuff);
    }

    // Shoe planted flush on ground (0.52 - 0.512 = 0.008 right above shadowDisc)
    const shoeMat = glossyClayMat(config.shoeColor || '#3A2B2B', 0.34);
    const isSneaker = config.shoes === 'sneakers';
    const shoeBase = new THREE.Mesh(
      new RoundedBoxGeometry(0.154, isSneaker ? 0.092 : 0.102, 0.23, 4, isSneaker ? 0.04 : 0.044),
      shoeMat,
    );
    shoeBase.position.set(0, isSneaker ? -0.454 : -0.46, 0.036);
    legPivot.add(shoeBase);

    const toeCap = new THREE.Mesh(new THREE.SphereGeometry(0.074, 14, 10), shoeMat);
    toeCap.scale.set(1.0, isSneaker ? 0.6 : 0.68, 1.05);
    toeCap.position.set(0, isSneaker ? -0.46 : -0.466, 0.114);
    legPivot.add(toeCap);

    if (isSneaker) {
      const outsole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.069, 0.022, 22),
        clayMat('#EBE5DB', 0.48),
      );
      outsole.scale.set(1.04, 1, 1.56);
      outsole.position.set(0, -0.499, 0.056);
      legPivot.add(outsole);

      for (let i = 0; i < 2; i++) {
        const lace = new THREE.Mesh(
          new RoundedBoxGeometry(0.064, 0.014, 0.02, 2, 0.005),
          clayMat('#FFFFFF', 0.4),
        );
        lace.position.set(0, -0.408, 0.042 + i * 0.04);
        legPivot.add(lace);
      }
    } else if (config.shoes === 'boots') {
      const bootShaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.084, 0.088, 0.165, 16),
        shoeMat,
      );
      bootShaft.position.set(0, -0.37, 0);
      const collar = new THREE.Mesh(
        new THREE.TorusGeometry(0.084, 0.015, 8, 16),
        clayMat(shadeHex(config.shoeColor || '#3A2B2B', -0.08).getHex(), 0.45),
      );
      collar.rotation.x = Math.PI / 2;
      collar.position.set(0, -0.288, 0);
      legPivot.add(bootShaft, collar);
    } else if (config.shoes === 'mary_janes') {
      const collarRim = new THREE.Mesh(
        new THREE.TorusGeometry(0.064, 0.012, 8, 18),
        shoeMat,
      );
      collarRim.rotation.x = Math.PI / 2;
      collarRim.position.set(0, -0.41, 0.005);
      const strap = new THREE.Mesh(
        new RoundedBoxGeometry(0.148, 0.02, 0.03, 2, 0.008),
        clayMat(shadeHex(config.shoeColor || '#3A2B2B', 0.08).getHex(), 0.35),
      );
      strap.position.set(0, -0.415, 0.032);
      legPivot.add(collarRim, strap);
    } else if (config.shoes === 'loafers') {
      const collarRim = new THREE.Mesh(
        new THREE.TorusGeometry(0.064, 0.012, 8, 18),
        shoeMat,
      );
      collarRim.rotation.x = Math.PI / 2;
      collarRim.position.set(0, -0.41, 0.005);
      const saddle = new THREE.Mesh(
        new RoundedBoxGeometry(0.14, 0.02, 0.052, 2, 0.008),
        clayMat(shadeHex(config.shoeColor || '#D8B894', -0.14).getHex(), 0.4),
      );
      saddle.position.set(0, -0.412, 0.054);
      legPivot.add(collarRim, saddle);
    }

    return legPivot;
  };

  const leftLeg = makeLeg(-0.125);
  const rightLeg = makeLeg(0.125);
  bodyPivot.add(leftLeg, rightLeg);

  // ========== TORSO & SCULPTED CLOTHING ==========
  const torsoGroup = new THREE.Group();
  torsoGroup.position.set(0, 0.77, 0);
  bodyPivot.add(torsoGroup);

  const baseTorsoMat =
    config.top === 'sailor_blouse' || config.top === 'cardigan_vest'
      ? topTrimMat
      : topMat;

  const isHoodie = config.top === 'hoodie';
  const torsoMesh = new THREE.Mesh(
    new THREE.LatheGeometry(
      createTorsoProfilePoints(isHoodie ? 0.024 : 0, isHoodie ? -0.215 : -0.195, 0.21),
      28,
    ),
    baseTorsoMat,
  );
  torsoGroup.add(torsoMesh);

  if (config.top === 'cardigan_vest') {
    const vestProfile = [
      new THREE.Vector2(0.232, -0.165),
      new THREE.Vector2(0.234, -0.13),
      new THREE.Vector2(0.222, -0.05),
      new THREE.Vector2(0.212, 0.05),
      new THREE.Vector2(0.21, 0.13),
      new THREE.Vector2(0.184, 0.172),
    ];
    const vestMesh = new THREE.Mesh(
      new THREE.LatheGeometry(vestProfile, 26, 0.33, Math.PI * 2 - 0.66),
      topMat,
    );
    torsoGroup.add(vestMesh);

    // Tailored knit placket trims hugging the front opening seamlessly from collar to hem
    [-1, 1].forEach((s) => {
      const placket = new THREE.Mesh(
        new RoundedBoxGeometry(0.024, 0.31, 0.024, 2, 0.008),
        topDarkMat,
      );
      placket.position.set(s * 0.068, -0.005, 0.198);
      placket.rotation.x = 0.08;
      placket.rotation.y = s * 0.28;
      torsoGroup.add(placket);

      const collar = new THREE.Mesh(
        new RoundedBoxGeometry(0.08, 0.042, 0.036, 2, 0.014),
        topTrimMat,
      );
      collar.position.set(s * 0.058, 0.192, 0.108);
      collar.rotation.z = -s * 0.32;
      collar.rotation.y = s * 0.32;
      torsoGroup.add(collar);
    });

    const ribHem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.234, 0.238, 0.044, 26),
      topDarkMat,
    );
    ribHem.position.set(0, -0.17, 0);
    torsoGroup.add(ribHem);

    for (let i = 0; i < 3; i++) {
      const btn = new THREE.Mesh(
        new THREE.CylinderGeometry(0.016, 0.016, 0.016, 10),
        clayMat('#5C3E2B', 0.4),
      );
      btn.rotation.x = Math.PI / 2;
      btn.position.set(0, 0.08 - i * 0.082, 0.208 + i * 0.008);
      torsoGroup.add(btn);
    }

    [-1, 1].forEach((s) => {
      const pocket = new THREE.Mesh(
        new RoundedBoxGeometry(0.075, 0.066, 0.022, 2, 0.008),
        topLightMat,
      );
      pocket.position.set(s * 0.122, -0.065, 0.198);
      pocket.rotation.y = s * 0.48;
      torsoGroup.add(pocket);
    });
  } else if (config.top === 'sailor_blouse') {
    const backFlap = new THREE.Mesh(
      new RoundedBoxGeometry(0.36, 0.11, 0.26, 3, 0.03),
      topMat,
    );
    backFlap.position.set(0, 0.145, -0.045);
    backFlap.rotation.x = -0.14;
    torsoGroup.add(backFlap);

    const stripeTrim = new THREE.Mesh(
      new RoundedBoxGeometry(0.368, 0.02, 0.268, 2, 0.008),
      topTrimMat,
    );
    stripeTrim.position.set(0, 0.105, -0.048);
    stripeTrim.rotation.x = -0.14;
    torsoGroup.add(stripeTrim);

    const bowMat = clayMat('#E85D68', 0.45);
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.034, 10, 10), bowMat);
    knot.position.set(0, 0.135, 0.198);
    torsoGroup.add(knot);
    [-1, 1].forEach((s) => {
      const wing = new THREE.Mesh(
        new RoundedBoxGeometry(0.07, 0.044, 0.025, 2, 0.014),
        bowMat,
      );
      wing.position.set(s * 0.05, 0.14, 0.192);
      wing.rotation.z = s * 0.25;
      wing.rotation.y = -s * 0.22;
      const tail = new THREE.Mesh(
        new RoundedBoxGeometry(0.028, 0.08, 0.016, 2, 0.007),
        bowMat,
      );
      tail.position.set(s * 0.028, 0.088, 0.198);
      tail.rotation.z = s * 0.22;
      torsoGroup.add(wing, tail);
    });
  } else if (config.top === 'hoodie') {
    // Plush Oversized Hoodie Collar + Large Sculpted Draped Back Hood
    const hoodInnerMat = clayMat(shadeHex(config.topColor, -0.18).getHex(), 0.78);

    const cowlCollar = new THREE.Mesh(
      new THREE.TorusGeometry(0.172, 0.056, 12, 26),
      topMat,
    );
    cowlCollar.rotation.x = Math.PI / 2 + 0.24;
    cowlCollar.position.set(0, 0.192, -0.025);
    torsoGroup.add(cowlCollar);

    // Large draped hood pouch behind shoulders & neck
    const backHoodGroup = new THREE.Group();
    backHoodGroup.position.set(0, 0.135, -0.175);

    const hoodOuterShell = new THREE.Mesh(
      new THREE.SphereGeometry(0.185, 18, 16),
      topMat,
    );
    hoodOuterShell.scale.set(1.12, 0.72, 0.88);
    hoodOuterShell.rotation.x = -0.42;
    backHoodGroup.add(hoodOuterShell);

    const hoodCowlLip = new THREE.Mesh(
      new THREE.TorusGeometry(0.145, 0.044, 10, 22),
      topLightMat,
    );
    hoodCowlLip.rotation.x = Math.PI / 2 - 0.52;
    hoodCowlLip.position.set(0, 0.068, -0.015);
    backHoodGroup.add(hoodCowlLip);

    const hoodInnerPocket = new THREE.Mesh(
      new THREE.SphereGeometry(0.125, 14, 12),
      hoodInnerMat,
    );
    hoodInnerPocket.scale.set(1.02, 0.45, 0.78);
    hoodInnerPocket.rotation.x = -0.48;
    hoodInnerPocket.position.set(0, 0.055, -0.02);
    backHoodGroup.add(hoodInnerPocket);

    [-1, 1].forEach((side) => {
      const shoulderFold = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.054, 0.11, 8, 12),
        topDarkMat,
      );
      shoulderFold.position.set(side * 0.13, 0.005, 0.045);
      shoulderFold.rotation.z = side * 0.55;
      shoulderFold.rotation.x = 0.38;
      backHoodGroup.add(shoulderFold);
    });
    torsoGroup.add(backHoodGroup);

    // Wide Tapered Ribbed Waistband
    const ribHem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.252, 0.244, 0.052, 26),
      topDarkMat,
    );
    ribHem.position.set(0, -0.186, 0);
    torsoGroup.add(ribHem);

    // Detailed Kangaroo Front Pocket + Angled Side Entry Shadow Recesses
    const pocket = new THREE.Mesh(
      new RoundedBoxGeometry(0.27, 0.12, 0.055, 3, 0.022),
      topLightMat,
    );
    pocket.position.set(0, -0.072, 0.224);
    const pocketTopTrim = new THREE.Mesh(
      new RoundedBoxGeometry(0.215, 0.018, 0.058, 2, 0.006),
      topDarkMat,
    );
    pocketTopTrim.position.set(0, -0.014, 0.226);
    torsoGroup.add(pocket, pocketTopTrim);

    [-1, 1].forEach((s) => {
      const sideSlit = new THREE.Mesh(
        new RoundedBoxGeometry(0.024, 0.092, 0.045, 2, 0.008),
        topDarkMat,
      );
      sideSlit.position.set(s * 0.13, -0.075, 0.218);
      sideSlit.rotation.z = s * 0.24;
      sideSlit.rotation.y = s * 0.35;
      torsoGroup.add(sideSlit);
    });

    // Metal Collar Eyelets & Curved Drawstrings with Aglet Tips
    const eyeletMat = clayMat('#D8CFC2', 0.35, 0.3);
    [-1, 1].forEach((s) => {
      const eyelet = new THREE.Mesh(
        new THREE.TorusGeometry(0.014, 0.0045, 6, 12),
        eyeletMat,
      );
      eyelet.position.set(s * 0.054, 0.154, 0.214);
      eyelet.rotation.y = s * 0.22;

      const cord = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.01, 0.105, 6, 8),
        topTrimMat,
      );
      cord.position.set(s * 0.058, 0.095, 0.226);
      cord.rotation.z = s * 0.06;
      cord.rotation.x = -0.14;

      const aglet = new THREE.Mesh(
        new THREE.CylinderGeometry(0.011, 0.009, 0.024, 8),
        eyeletMat,
      );
      aglet.position.set(s * 0.062, 0.036, 0.234);
      aglet.rotation.z = s * 0.06;
      torsoGroup.add(eyelet, cord, aglet);
    });
  } else if (config.top === 'knit_sweater') {
    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(0.125, 0.042, 10, 22),
      topTrimMat,
    );
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, 0.205, 0);
    torsoGroup.add(collar);

    const chestBand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.206, 0.21, 0.044, 24),
      topLightMat,
    );
    chestBand.position.set(0, 0.045, 0);
    const ribHem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.232, 0.236, 0.044, 26),
      topDarkMat,
    );
    ribHem.position.set(0, -0.17, 0);
    torsoGroup.add(chestBand, ribHem);
  } else if (config.top === 'sundress') {
    const chestSkin = new THREE.Mesh(
      new THREE.LatheGeometry(createTorsoProfilePoints(0.004, 0.11, 0.215), 24),
      skinMat,
    );
    torsoGroup.add(chestSkin);

    [-1, 1].forEach((s) => {
      const strap = new THREE.Mesh(
        new THREE.TorusGeometry(0.068, 0.018, 8, 16, Math.PI),
        topMat,
      );
      strap.rotation.y = Math.PI / 2;
      strap.position.set(s * 0.115, 0.165, 0);
      torsoGroup.add(strap);
    });

    const neckTrim = new THREE.Mesh(
      new THREE.TorusGeometry(0.195, 0.018, 8, 24),
      topTrimMat,
    );
    neckTrim.rotation.x = Math.PI / 2;
    neckTrim.position.set(0, 0.115, 0);
    const waistSash = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.226, 0.044, 24),
      topTrimMat,
    );
    waistSash.position.set(0, -0.09, 0);
    torsoGroup.add(neckTrim, waistSash);
  }

  // Bottoms on Torso (clean radial hierarchy so skirts & trousers never clip through tops)
  if (config.bottom === 'pleated_skirt' || config.bottom === 'midi_skirt') {
    const isMidi = config.bottom === 'midi_skirt';
    const waistband = new THREE.Mesh(
      new THREE.CylinderGeometry(0.214, 0.22, 0.048, 26),
      bottomDarkMat,
    );
    waistband.position.set(0, -0.158, 0);
    torsoGroup.add(waistband);

    const skirtGeo = createPleatedSkirtGeometry(
      0.216,
      isMidi ? 0.325 : 0.285,
      isMidi ? 0.33 : 0.23,
      isMidi ? 12 : 16,
      isMidi ? 0.011 : 0.016,
    );
    const skirtMesh = new THREE.Mesh(skirtGeo, bottomMat);
    skirtMesh.position.set(0, isMidi ? -0.34 : -0.288, 0);
    torsoGroup.add(skirtMesh);

    const hemRing = new THREE.Mesh(
      new THREE.TorusGeometry(isMidi ? 0.322 : 0.282, 0.012, 8, 32),
      bottomLightMat,
    );
    hemRing.rotation.x = Math.PI / 2;
    hemRing.position.set(0, isMidi ? -0.49 : -0.388, 0);
    torsoGroup.add(hemRing);
  } else {
    const waist = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.224, 0.078, 26),
      bottomDarkMat,
    );
    waist.position.set(0, -0.206, 0);
    torsoGroup.add(waist);

    const button = new THREE.Mesh(
      new THREE.CylinderGeometry(0.017, 0.017, 0.016, 10),
      clayMat('#E8C476', 0.35),
    );
    button.rotation.x = Math.PI / 2;
    button.position.set(0, -0.205, 0.224);
    torsoGroup.add(button);
  }

  // ========== SEAMLESS ARTICULATED ARMS + REAL HANDHELD GRIP ==========
  const isShortSleeve = config.top === 'sailor_blouse';
  const isSleeveless = config.top === 'sundress';
  const handheld = config.handheld && config.handheld !== 'none' ? config.handheld : null;
  const holdPose: HoldPose = !handheld
    ? 'none'
    : handheld === 'tote_bag'
      ? 'carry_bag'
      : handheld === 'mini_umbrella'
        ? 'carry_umbrella'
        : 'carry_front';

  const makeArm = (side: -1 | 1) => {
    // Relaxed natural A-pose seated flush on shoulder corner with breathing room beside waist/hips
    const shoulderPivot = new THREE.Group();
    const baseArmZ = isHoodie ? 0.4 : HAND_POSES.none.armZ;
    shoulderPivot.position.set(side * (isHoodie ? 0.214 : 0.198), 0.89, 0);
    shoulderPivot.rotation.z = side * baseArmZ;

    const upperMat = isSleeveless ? skinMat : isShortSleeve ? topTrimMat : topMat;
    const upperR = isHoodie ? 0.062 : isShortSleeve ? 0.05 : 0.055;
    const midR = isHoodie ? 0.055 : isShortSleeve ? 0.044 : 0.048;
    const wristR = isHoodie ? 0.05 : isShortSleeve ? 0.041 : 0.043;

    if (isShortSleeve) {
      const sleeveCap = new THREE.Mesh(
        new THREE.SphereGeometry(0.058, 14, 12),
        topTrimMat,
      );
      const sleeveTube = new THREE.Mesh(
        new THREE.CylinderGeometry(0.058, 0.064, 0.12, 16),
        topTrimMat,
      );
      sleeveTube.position.y = -0.06;
      const sleeveCuff = new THREE.Mesh(
        new THREE.TorusGeometry(0.063, 0.011, 8, 16),
        topMat,
      );
      sleeveCuff.rotation.x = Math.PI / 2;
      sleeveCuff.position.y = -0.12;
      shoulderPivot.add(sleeveCap, sleeveTube, sleeveCuff);

      const innerSkinUpper = new THREE.Mesh(
        new THREE.CylinderGeometry(0.046, midR, 0.15, 16),
        skinMat,
      );
      innerSkinUpper.position.y = -0.075;
      shoulderPivot.add(innerSkinUpper);
    } else {
      const shoulderJoint = new THREE.Mesh(
        new THREE.SphereGeometry(upperR, 14, 12),
        upperMat,
      );
      const upperArm = new THREE.Mesh(
        new THREE.CylinderGeometry(upperR, midR, 0.15, 16),
        upperMat,
      );
      upperArm.position.y = -0.075;
      shoulderPivot.add(shoulderJoint, upperArm);
    }

    const elbowPivot = new THREE.Group();
    elbowPivot.position.set(0, -0.15, 0);
    elbowPivot.rotation.x = HAND_POSES.none.elbowX;
    elbowPivot.rotation.z = side * HAND_POSES.none.elbowZ;
    shoulderPivot.add(elbowPivot);

    const forearmMat = isSleeveless || isShortSleeve ? skinMat : topMat;
    const elbowJoint = new THREE.Mesh(
      new THREE.SphereGeometry(midR, 14, 12),
      forearmMat,
    );
    const forearm = new THREE.Mesh(
      new THREE.CylinderGeometry(midR, wristR, 0.132, 16),
      forearmMat,
    );
    forearm.position.y = -0.066;
    elbowPivot.add(elbowJoint, forearm);

    if (!isSleeveless && !isShortSleeve) {
      const cuffMat = config.top === 'cardigan_vest' ? topTrimMat : topDarkMat;
      const wristCuff = new THREE.Mesh(
        new THREE.TorusGeometry(wristR + 0.005, 0.012, 8, 16),
        cuffMat,
      );
      wristCuff.rotation.x = Math.PI / 2;
      wristCuff.position.y = -0.125;
      const cuffInner = new THREE.Mesh(
        new THREE.CylinderGeometry(wristR + 0.002, wristR + 0.004, 0.024, 14),
        cuffMat,
      );
      cuffInner.position.y = -0.121;
      elbowPivot.add(wristCuff, cuffInner);
    }

    const wristBridge = new THREE.Mesh(
      new THREE.CylinderGeometry(wristR * 0.78, 0.033, 0.036, 12),
      skinMat,
    );
    wristBridge.position.y = -0.138;
    elbowPivot.add(wristBridge);

    const handGroup = new THREE.Group();
    handGroup.position.set(0, -0.16, 0);
    elbowPivot.add(handGroup);

    const isGripping = side === 1 && Boolean(handheld);
    const palm = new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 12), skinMat);
    palm.scale.set(0.92, 1.06, isGripping ? 0.86 : 0.88);
    if (isGripping) palm.position.set(0, 0, -0.004);
    handGroup.add(palm);

    if (isGripping) {
      // Sculpted curled fingers + opposing thumb forming a real closed grip pocket at (0, -0.005, 0.024)
      const fingerCurl = new THREE.Mesh(
        new RoundedBoxGeometry(0.058, 0.044, 0.034, 3, 0.014),
        skinMat,
      );
      fingerCurl.position.set(-0.004, -0.01, 0.034);
      fingerCurl.rotation.x = 0.22;
      handGroup.add(fingerCurl);

      const thumbGrip = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.015, 0.028, 6, 8),
        skinMat,
      );
      thumbGrip.position.set(-0.024, 0.014, 0.03);
      thumbGrip.rotation.z = -0.95;
      thumbGrip.rotation.x = 0.25;
      handGroup.add(thumbGrip);
    } else {
      const thumb = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.015, 0.024, 6, 8),
        skinMat,
      );
      thumb.position.set(-side * 0.032, 0.006, 0.03);
      thumb.rotation.z = side * 0.52;
      thumb.rotation.x = -0.45;
      handGroup.add(thumb);
    }

    return {shoulderPivot, elbowPivot, handGroup};
  };

  const leftArmRig = makeArm(-1);
  const rightArmRig = makeArm(1);
  const leftArm = leftArmRig.shoulderPivot;
  const rightArm = rightArmRig.shoulderPivot;
  const leftElbow = leftArmRig.elbowPivot;
  const rightElbow = rightArmRig.elbowPivot;

  bodyPivot.add(leftArm, rightArm);

  if (handheld) {
    const hColor = config.handheldColor || '#E8B84B';
    const poseCfg = HAND_POSES[holdPose];
    rightArm.rotation.x = poseCfg.armX;
    rightArm.rotation.z = poseCfg.armZ;
    rightElbow.rotation.x = poseCfg.elbowX;
    rightElbow.rotation.z = poseCfg.elbowZ;

    // Attach handAnchor directly at the closed-fist grip pocket, oriented upright in world space
    const handAnchor = new THREE.Group();
    handAnchor.position.set(0, -0.005, 0.024);
    rightArmRig.handGroup.add(handAnchor);

    bodyPivot.updateMatrixWorld(true);
    const handWorldQuat = new THREE.Quaternion();
    rightArmRig.handGroup.getWorldQuaternion(handWorldQuat);
    const desiredWorldQuat = new THREE.Quaternion().setFromEuler(
      holdPose === 'carry_umbrella'
        ? new THREE.Euler(-0.07, 0, 0.11) // subtle natural shelter lean over the character's head
        : holdPose === 'carry_front'
          ? new THREE.Euler(0.08, 0, 0)
          : new THREE.Euler(0, 0, 0),
    );
    handAnchor.quaternion.copy(handWorldQuat).invert().multiply(desiredWorldQuat);

    if (handheld === 'milk_tea') {
      const cup = new THREE.Mesh(
        new THREE.CylinderGeometry(0.074, 0.052, 0.185, 16),
        clayMat(hColor, 0.35),
      );
      cup.position.set(0, 0.022, 0);
      const sleeve = new THREE.Mesh(
        new THREE.CylinderGeometry(0.064, 0.058, 0.064, 16),
        clayMat('#E8D3B9', 0.8),
      );
      sleeve.position.set(0, 0.008, 0);
      const lid = new THREE.Mesh(
        new THREE.SphereGeometry(0.074, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
        glossyClayMat('#FFF8F0', 0.2),
      );
      lid.position.set(0, 0.114, 0);
      const straw = new THREE.Mesh(
        new THREE.CylinderGeometry(0.011, 0.011, 0.135, 8),
        clayMat('#E86F82', 0.4),
      );
      straw.position.set(0.016, 0.182, 0);
      straw.rotation.z = -0.15;
      handAnchor.add(cup, sleeve, lid, straw);
    } else if (handheld === 'plush_bear') {
      const bearGrp = new THREE.Group();
      bearGrp.position.set(-0.02, 0.01, 0.025);
      bearGrp.rotation.y = -0.22;

      const bearMat = clayMat(hColor, 0.85);
      const creamMat = clayMat('#F7E6D0', 0.78);
      const noseMat = glossyClayMat('#2A1D18', 0.18);

      const bearBody = new THREE.Mesh(new THREE.SphereGeometry(0.108, 14, 14), bearMat);
      bearBody.scale.set(0.95, 1.14, 0.85);
      bearBody.position.set(0, 0.045, 0.02);

      const belly = new THREE.Mesh(new THREE.SphereGeometry(0.068, 12, 12), creamMat);
      belly.scale.set(0.9, 1.05, 0.5);
      belly.position.set(0, 0.04, 0.082);

      const bearHead = new THREE.Mesh(new THREE.SphereGeometry(0.098, 14, 14), bearMat);
      bearHead.scale.set(1.05, 0.96, 0.96);
      bearHead.position.set(0, 0.205, 0.03);

      [-1, 1].forEach((s) => {
        const ear = new THREE.Mesh(new THREE.SphereGeometry(0.036, 10, 10), bearMat);
        ear.position.set(s * 0.078, 0.282, 0.025);
        const innerEar = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), creamMat);
        innerEar.scale.set(1, 1, 0.5);
        innerEar.position.set(s * 0.078, 0.282, 0.052);
        const bEye = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 8), noseMat);
        bEye.position.set(s * 0.036, 0.22, 0.118);
        const bArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.026, 0.046, 6, 10), bearMat);
        bArm.position.set(s * 0.098, 0.085, 0.04);
        bArm.rotation.z = s * 0.55;
        bArm.rotation.x = -0.3;
        const bLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.044, 6, 10), bearMat);
        bLeg.position.set(s * 0.064, -0.05, 0.075);
        bLeg.rotation.x = -1.15;
        bLeg.rotation.z = s * 0.25;
        const paw = new THREE.Mesh(new THREE.SphereGeometry(0.021, 8, 8), creamMat);
        paw.scale.set(1, 1, 0.5);
        paw.position.set(s * 0.074, -0.062, 0.115);
        bearGrp.add(ear, innerEar, bEye, bArm, bLeg, paw);
      });

      const snout = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 10), creamMat);
      snout.scale.set(1.1, 0.85, 0.85);
      snout.position.set(0, 0.186, 0.112);
      const bNose = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 8), noseMat);
      bNose.scale.set(1.2, 0.8, 0.7);
      bNose.position.set(0, 0.196, 0.144);

      const bow = new THREE.Mesh(
        new RoundedBoxGeometry(0.072, 0.026, 0.02, 2, 0.01),
        clayMat('#E85D68', 0.5),
      );
      bow.position.set(0, 0.128, 0.102);

      bearGrp.add(bearBody, belly, bearHead, snout, bNose, bow);
      handAnchor.add(bearGrp);
    } else if (handheld === 'flower_bouquet') {
      const wrap = new THREE.Mesh(
        new THREE.ConeGeometry(0.14, 0.3, 14, 1, true),
        clayMat('#E9D5B5', 0.82),
      );
      wrap.rotation.x = Math.PI;
      wrap.position.set(0, 0.065, 0);

      const tissueRim = new THREE.Mesh(
        new THREE.TorusGeometry(0.132, 0.021, 8, 18),
        clayMat('#FFF9F0', 0.78),
      );
      tissueRim.rotation.x = Math.PI / 2;
      tissueRim.position.set(0, 0.205, 0);

      const ribbonTie = new THREE.Mesh(
        new THREE.TorusGeometry(0.046, 0.014, 8, 14),
        clayMat('#E86F82', 0.5),
      );
      ribbonTie.rotation.x = Math.PI / 2;
      ribbonTie.position.set(0, 0.025, 0);
      handAnchor.add(wrap, tissueRim, ribbonTie);

      const leafMat = clayMat('#5E9E69', 0.65);
      [-1, 0, 1].forEach((s) => {
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.052, 10, 8), leafMat);
        leaf.scale.set(0.75, 1.35, 0.3);
        leaf.position.set(s * 0.08, 0.22, -0.025);
        leaf.rotation.z = -s * 0.4;
        handAnchor.add(leaf);
      });

      const buildSunflower = (fx: number, fy: number, fz: number, scale: number) => {
        const fGrp = new THREE.Group();
        fGrp.position.set(fx, fy, fz);
        fGrp.scale.setScalar(scale);
        fGrp.rotation.x = 0.28;
        const center = new THREE.Mesh(
          new THREE.SphereGeometry(0.052, 12, 10),
          clayMat('#5E3A22', 0.72),
        );
        center.scale.set(1, 1, 0.5);
        fGrp.add(center);
        const petalMat = clayMat(hColor, 0.58);
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2;
          const petal = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), petalMat);
          petal.scale.set(0.7, 1.45, 0.4);
          petal.position.set(Math.cos(a) * 0.068, Math.sin(a) * 0.068, -0.005);
          petal.rotation.z = a - Math.PI / 2;
          fGrp.add(petal);
        }
        handAnchor.add(fGrp);
      };

      buildSunflower(0, 0.275, 0.015, 1.1);
      buildSunflower(-0.078, 0.23, 0.02, 0.82);
      buildSunflower(0.078, 0.23, 0.02, 0.82);
    } else if (handheld === 'tote_bag') {
      const strapMat = clayMat('#C59F76', 0.75);
      [-0.036, 0.036].forEach((sx) => {
        const strap = new THREE.Mesh(
          new THREE.TorusGeometry(0.082, 0.012, 8, 18, Math.PI),
          strapMat,
        );
        strap.rotation.y = Math.PI / 2;
        strap.position.set(0.038 + sx, -0.082, 0);
        handAnchor.add(strap);
      });
      const bag = new THREE.Mesh(
        new RoundedBoxGeometry(0.115, 0.25, 0.215, 3, 0.025),
        clayMat(hColor, 0.78),
      );
      bag.position.set(0.038, -0.208, 0);
      const pocket = new THREE.Mesh(
        new RoundedBoxGeometry(0.018, 0.12, 0.125, 2, 0.012),
        clayMat(shadeHex(hColor, -0.08).getHex(), 0.78),
      );
      pocket.position.set(0.095, -0.218, 0);
      const badge = new THREE.Mesh(
        new THREE.CylinderGeometry(0.022, 0.022, 0.01, 12),
        clayMat('#E86F82', 0.5),
      );
      badge.rotation.z = Math.PI / 2;
      badge.position.set(0.105, -0.178, 0.038);
      handAnchor.add(bag, pocket, badge);
    } else if (handheld === 'mini_umbrella') {
      // Tall, wide protective umbrella clearing head & hats cleanly (~1.92m rim, 2.16m dome)
      const stickMat = clayMat('#7D5333', 0.55);
      const metalMat = clayMat('#D6CEC4', 0.35, 0.35);

      const stick = new THREE.Mesh(
        new THREE.CylinderGeometry(0.013, 0.013, 1.38, 10),
        stickMat,
      );
      stick.position.set(0, 0.57, 0);

      const hook = new THREE.Mesh(
        new THREE.TorusGeometry(0.034, 0.014, 8, 16, Math.PI),
        stickMat,
      );
      hook.rotation.z = Math.PI;
      hook.position.set(0.034, -0.118, 0);

      const runner = new THREE.Mesh(
        new THREE.CylinderGeometry(0.022, 0.022, 0.055, 10),
        metalMat,
      );
      runner.position.set(0, 1.07, 0);

      const canopyPts = [
        new THREE.Vector2(0.005, 0.24),
        new THREE.Vector2(0.26, 0.205),
        new THREE.Vector2(0.52, 0.115),
        new THREE.Vector2(0.72, 0.0),
      ];
      const canopyMat = clayMat(hColor, 0.52);
      canopyMat.side = THREE.DoubleSide;
      const canopy = new THREE.Mesh(new THREE.LatheGeometry(canopyPts, 24), canopyMat);
      canopy.position.set(0, 1.13, 0);

      const edgeTrim = new THREE.Mesh(
        new THREE.TorusGeometry(0.718, 0.016, 8, 32),
        clayMat('#FFFDF7', 0.6),
      );
      edgeTrim.rotation.x = Math.PI / 2;
      edgeTrim.position.set(0, 1.13, 0);

      // 8 delicate underside ribs connecting runner collar to canopy rim
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        const pA = new THREE.Vector3(0, 1.08, 0);
        const pB = new THREE.Vector3(Math.cos(ang) * 0.69, 1.13, Math.sin(ang) * 0.69);
        const mid = pA.clone().add(pB).multiplyScalar(0.5);
        const rib = new THREE.Mesh(
          new THREE.CylinderGeometry(0.005, 0.005, pA.distanceTo(pB), 6),
          metalMat,
        );
        rib.position.copy(mid);
        rib.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          pB.clone().sub(pA).normalize(),
        );
        handAnchor.add(rib);
      }

      const tip = new THREE.Mesh(
        new THREE.ConeGeometry(0.022, 0.09, 10),
        stickMat,
      );
      tip.position.set(0, 1.405, 0);

      handAnchor.add(stick, hook, runner, canopy, edgeTrim, tip);
    }
  }

  // ========== SCULPTED CHIBI-SIMS HEAD & EXPRESSIVE FACE ==========
  const headPivot = new THREE.Group();
  headPivot.position.set(0, HEAD_PIVOT_Y, 0);
  bodyPivot.add(headPivot);

  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.064, 0.076, 0.07, 16),
    skinMat,
  );
  neck.position.y = -0.015;
  headPivot.add(neck);

  // Sculpted head mesh (already centered at HEAD_CY = 0.30)
  const headMesh = new THREE.Mesh(createSculptedHeadGeometry(), skinMat);
  headPivot.add(headMesh);

  // Detailed Ears with soft inner ear hollows
  const innerEarMat = clayMat(shadeHex(config.skinTone, -0.11).getHex(), 0.72);
  [-1, 1].forEach((side) => {
    const earGrp = new THREE.Group();
    earGrp.position.set(side * 0.305, 0.27, -0.012);
    earGrp.rotation.y = -side * 0.22;

    const earOuter = new THREE.Mesh(new THREE.SphereGeometry(0.056, 12, 12), skinMat);
    earOuter.scale.set(0.6, 1.0, 0.72);
    const earInner = new THREE.Mesh(new THREE.SphereGeometry(0.036, 10, 10), innerEarMat);
    earInner.scale.set(0.42, 0.72, 0.45);
    earInner.position.set(side * 0.012, 0, 0.008);
    earGrp.add(earOuter, earInner);
    headPivot.add(earGrp);
  });

  // Soft Rosy Cheeks
  const cheekGeo = new THREE.SphereGeometry(0.044, 12, 10);
  const cheekL = new THREE.Mesh(cheekGeo, cheekMat);
  cheekL.scale.set(1.26, 0.68, 0.35);
  cheekL.position.set(-0.172, 0.195, 0.214);
  cheekL.rotation.y = -0.32;
  const cheekR = cheekL.clone();
  cheekR.position.x = 0.172;
  cheekR.rotation.y = 0.32;
  headPivot.add(cheekL, cheekR);

  // Expressive Eyes + Sleek Curved Upper Lash Liners + Eyelids
  const eyelids: THREE.Mesh[] = [];
  const makeEye = (side: -1 | 1) => {
    const eyeGroup = new THREE.Group();
    eyeGroup.position.set(side * 0.112, 0.258, 0.246);
    eyeGroup.rotation.y = side * 0.18;

    if (config.eyeStyle === 'cozy') {
      const arc = new THREE.Mesh(
        new THREE.TorusGeometry(0.042, 0.01, 8, 14, Math.PI * 0.85),
        pupilMat,
      );
      arc.rotation.z = 0.24;
      arc.position.set(0, -0.01, 0.018);
      eyeGroup.add(arc);
    } else {
      const isAlmond = config.eyeStyle === 'almond';
      const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.056, 14, 14), eyeWhiteMat);
      sclera.scale.set(isAlmond ? 1.04 : 0.96, isAlmond ? 0.92 : 1.08, 0.42);
      eyeGroup.add(sclera);

      const iris = new THREE.Mesh(new THREE.SphereGeometry(0.041, 14, 14), irisMat);
      iris.scale.set(0.96, isAlmond ? 0.92 : 1.05, 0.42);
      iris.position.z = 0.015;
      eyeGroup.add(iris);

      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.023, 12, 12), pupilMat);
      pupil.scale.set(1, 1, 0.42);
      pupil.position.z = 0.025;
      eyeGroup.add(pupil);

      const glint = new THREE.Mesh(
        new THREE.SphereGeometry(0.013, 8, 8),
        new THREE.MeshBasicMaterial({color: '#FFFFFF'}),
      );
      glint.position.set(-0.013, 0.017, 0.034);
      eyeGroup.add(glint);

      if (config.eyeStyle === 'starry') {
        const subGlint = new THREE.Mesh(
          new THREE.SphereGeometry(0.008, 8, 8),
          new THREE.MeshBasicMaterial({color: '#FFFFFF'}),
        );
        subGlint.position.set(0.014, -0.014, 0.033);
        eyeGroup.add(subGlint);
      }

      const lash = new THREE.Mesh(
        new THREE.TorusGeometry(0.056, 0.0105, 8, 16, Math.PI * 0.86),
        pupilMat,
      );
      lash.rotation.z = 0.22 + (isAlmond ? -side * 0.14 : 0);
      lash.position.set(0, 0.012, 0.017);
      eyeGroup.add(lash);

      const lid = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), skinMat);
      lid.scale.set(1.04, 0.08, 0.52);
      lid.position.set(0, 0.044, 0.008);
      eyeGroup.add(lid);
      eyelids.push(lid);
    }

    return eyeGroup;
  };
  headPivot.add(makeEye(-1), makeEye(1));

  // Fine Curved Sculpted Eyebrows (cleanly seated on sculpted forehead above eyes & glasses)
  const eyebrowMat = clayMat(shadeHex(config.hairColor, -0.05).getHex(), 0.52);
  [-1, 1].forEach((side) => {
    const brow = new THREE.Mesh(
      new THREE.TorusGeometry(0.045, 0.0072, 6, 12, Math.PI * 0.42),
      eyebrowMat,
    );
    const browY =
      config.expression === 'grin'
        ? 0.314
        : config.expression === 'calm'
          ? 0.304
          : 0.308;
    const tilt =
      config.expression === 'grin'
        ? side * 0.06
        : config.expression === 'cat'
          ? -side * 0.12
          : config.expression === 'calm'
            ? side * 0.04
            : -side * 0.04;
    brow.position.set(side * 0.112, browY, 0.256);
    brow.rotation.y = side * 0.18;
    brow.rotation.z = Math.PI * 0.29 + tilt;
    headPivot.add(brow);
  });

  // Mouth Expressions ('smile' | 'grin' | 'cat' | 'calm') seated cleanly on sculpted chin plane
  const mouthLineMat = clayMat('#5B342E', 0.48);
  if (config.expression === 'grin') {
    const mouthCavity = new THREE.Mesh(
      new THREE.CylinderGeometry(0.036, 0.027, 0.018, 12, 1, false, 0, Math.PI),
      clayMat('#9C3D46', 0.5),
    );
    mouthCavity.rotation.x = Math.PI / 2;
    mouthCavity.rotation.y = Math.PI / 2;
    mouthCavity.scale.set(0.95, 1, 0.85);
    mouthCavity.position.set(0, 0.155, 0.236);
    const tongue = new THREE.Mesh(
      new THREE.SphereGeometry(0.019, 10, 8),
      clayMat('#F07F89', 0.45),
    );
    tongue.scale.set(1.1, 0.55, 0.6);
    tongue.position.set(0, 0.141, 0.24);
    headPivot.add(mouthCavity, tongue);
  } else if (config.expression === 'cat') {
    [-1, 1].forEach((s) => {
      const catArc = new THREE.Mesh(
        new THREE.TorusGeometry(0.018, 0.0068, 6, 12, Math.PI),
        mouthLineMat,
      );
      catArc.rotation.z = Math.PI;
      catArc.position.set(s * 0.018, 0.155, 0.238);
      headPivot.add(catArc);
    });
  } else if (config.expression === 'calm') {
    const calmMouth = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.0068, 0.028, 6, 8),
      mouthLineMat,
    );
    calmMouth.rotation.z = Math.PI / 2;
    calmMouth.position.set(0, 0.153, 0.239);
    headPivot.add(calmMouth);
  } else {
    const smileMesh = new THREE.Mesh(
      new THREE.TorusGeometry(0.028, 0.0082, 8, 14, Math.PI),
      mouthLineMat,
    );
    smileMesh.rotation.z = Math.PI;
    smileMesh.position.set(0, 0.156, 0.238);
    headPivot.add(smileMesh);
  }

  // ========== MODULAR STYLIZED 3D CLAY HAIR SYSTEM ==========
  const hairAssembly = buildCharacterHair(config, hairMat, topMat);
  headPivot.add(hairAssembly.root);

  // ========== STANDARDIZED HEADWEAR ON HAT ATTACHMENT POINTS ==========
  const {crownTop, crownTilted, headbandArc} = hairAssembly.attachments;
  const headItemCol = config.headItemColor || config.topColor;
  if (config.headItem === 'beret') {
    const beretMat = clayMat(headItemCol, 0.62);
    const beretBody = new THREE.Mesh(
      new THREE.SphereGeometry(0.275, 24, 16),
      beretMat,
    );
    beretBody.scale.set(1.06, 0.38, 1.04);
    beretBody.position.set(
      crownTilted.position.x,
      crownTilted.position.y - 0.016,
      crownTilted.position.z,
    );
    beretBody.rotation.copy(crownTilted.rotation);
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.014, 0.016, 0.055, 8),
      clayMat('#3A2B28'),
    );
    stem.position.set(
      crownTilted.position.x + 0.022,
      crownTilted.position.y + 0.084,
      crownTilted.position.z,
    );
    stem.rotation.copy(crownTilted.rotation);
    headPivot.add(beretBody, stem);
  } else if (config.headItem === 'sunhat') {
    const hatMat = clayMat(headItemCol || '#EBD08E', 0.78);
    const brimY = crownTop.position.y - 0.044;
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.5, 0.032, 24), hatMat);
    brim.position.set(crownTop.position.x, brimY, crownTop.position.z);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.245, 0.295, 0.165, 20), hatMat);
    crown.position.set(crownTop.position.x, brimY + 0.08, crownTop.position.z);
    const ribbon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.299, 0.303, 0.042, 20),
      clayMat('#E57A6B'),
    );
    ribbon.position.set(crownTop.position.x, brimY + 0.03, crownTop.position.z);
    headPivot.add(brim, crown, ribbon);
  } else if (config.headItem === 'cat_ears') {
    const bandR = headbandArc.radius;
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(bandR, 0.02, 8, 24, Math.PI),
      clayMat('#3A2B28'),
    );
    band.position.copy(headbandArc.center);
    band.rotation.x = headbandArc.tiltX;
    headPivot.add(band);

    const earTopY =
      headbandArc.center.y +
      bandR * Math.cos(headbandArc.tiltX) -
      0.01;
    const earZ =
      headbandArc.center.z - bandR * Math.sin(headbandArc.tiltX) * 0.5 + 0.025;
    [-1, 1].forEach((side) => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.086, 0.15, 12), clayMat('#FFF8F2'));
      ear.position.set(side * 0.205, earTopY, earZ);
      ear.rotation.z = -side * 0.3;
      ear.rotation.x = headbandArc.tiltX;
      const inner = new THREE.Mesh(
        new THREE.ConeGeometry(0.048, 0.098, 10),
        clayMat(headItemCol || '#F497AC'),
      );
      inner.position.set(side * 0.205, earTopY - 0.015, earZ + 0.03);
      inner.rotation.z = -side * 0.3;
      inner.rotation.x = headbandArc.tiltX;
      headPivot.add(ear, inner);
    });
  } else if (config.headItem === 'flower_crown') {
    const ringR = headbandArc.radius - 0.036;
    const band = new THREE.Mesh(new THREE.TorusGeometry(ringR, 0.02, 8, 24), clayMat('#5E9E69'));
    band.rotation.x = Math.PI / 2 - 0.16;
    band.position.set(0, 0.505, -0.006);
    headPivot.add(band);
    for (let i = 0; i < 6; i++) {
      const ang = -1.0 + i * 0.4;
      const fl = new THREE.Mesh(
        new THREE.SphereGeometry(0.042, 10, 10),
        clayMat(i % 2 === 0 ? headItemCol || '#F7A8B8' : '#FFE082'),
      );
      fl.position.set(Math.sin(ang) * (ringR + 0.008), 0.525, Math.cos(ang) * (ringR + 0.008) - 0.006);
      headPivot.add(fl);
    }
  } else if (config.headItem === 'ribbon_bow') {
    const bowMat = clayMat(headItemCol || '#6BAEE6', 0.52);
    const bandR = headbandArc.radius;
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(bandR, 0.02, 8, 24, Math.PI),
      bowMat,
    );
    band.position.copy(headbandArc.center);
    band.rotation.x = headbandArc.tiltX;
    const bowY = headbandArc.center.y + bandR * 0.9;
    const wingL = new THREE.Mesh(new THREE.SphereGeometry(0.072, 10, 10), bowMat);
    wingL.scale.set(1.2, 0.72, 0.52);
    wingL.position.set(0.145, bowY + 0.015, 0.078);
    wingL.rotation.z = -0.25;
    const wingR = wingL.clone();
    wingR.position.set(0.245, bowY - 0.025, 0.078);
    wingR.rotation.z = 0.25;
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.034, 10, 10), bowMat);
    knot.position.set(0.195, bowY - 0.005, 0.1);
    headPivot.add(band, wingL, wingR, knot);
  }

  // ========== SCULPTED ACCESSORIES ==========
  const accCol = config.accessoryColor || '#4A3628';
  if (config.accessory === 'glasses' || config.accessory === 'sunglasses') {
    const isSun = config.accessory === 'sunglasses';
    const frameMat = glossyClayMat(accCol, 0.25);
    const lensMat = glossyClayMat('#1A1D24', 0.1);
    [-1, 1].forEach((side) => {
      const gx = side * 0.112;
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.066, 0.01, 8, 18), frameMat);
      rim.position.set(gx, 0.258, 0.304);
      rim.rotation.y = side * 0.12;
      headPivot.add(rim);
      if (isSun) {
        const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.01, 16), lensMat);
        lens.rotation.x = Math.PI / 2;
        lens.rotation.z = -side * 0.12;
        lens.position.set(gx, 0.258, 0.3);
        headPivot.add(lens);
      }
      const pStart = new THREE.Vector3(side * 0.175, 0.262, 0.296);
      const pEnd = new THREE.Vector3(side * 0.302, 0.262, 0.015);
      const mid = pStart.clone().add(pEnd).multiplyScalar(0.5);
      const len = pStart.distanceTo(pEnd);
      const arm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0055, 0.0055, len, 6),
        frameMat,
      );
      arm.position.copy(mid);
      arm.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        pEnd.clone().sub(pStart).normalize(),
      );
      headPivot.add(arm);
    });
    const bridge = new THREE.Mesh(new RoundedBoxGeometry(0.08, 0.013, 0.013, 2, 0.005), frameMat);
    bridge.position.set(0, 0.264, 0.308);
    headPivot.add(bridge);
  } else if (config.accessory === 'scarf') {
    const scarfMat = clayMat(accCol, 0.78);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.165, 0.055, 10, 22), scarfMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 0.195, 0);
    const tail = new THREE.Mesh(
      new RoundedBoxGeometry(0.095, 0.21, 0.048, 2, 0.016),
      scarfMat,
    );
    tail.position.set(0.095, 0.085, 0.198);
    tail.rotation.z = -0.15;
    torsoGroup.add(ring, tail);
  } else if (config.accessory === 'pearl_necklace') {
    const pearlMat = glossyClayMat(accCol || '#FFFDF7', 0.15);
    for (let i = 0; i < 9; i++) {
      const ang = -1.25 + (i / 8) * 2.5;
      const bead = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 10), pearlMat);
      bead.position.set(Math.sin(ang) * 0.168, 0.185, Math.cos(ang) * 0.168);
      torsoGroup.add(bead);
    }
  }

  makeShadowed(root, true, true);
  shadowDisc.castShadow = false;

  return {
    root,
    bodyPivot,
    torsoGroup,
    headPivot,
    leftArm,
    rightArm,
    leftElbow,
    rightElbow,
    leftLeg,
    rightLeg,
    eyelids,
    shadowDisc,
    holdPose,
  };
}

export function updateAvatarRigAnimation(
  rig: AvatarRig,
  pose: AvatarPose,
  elapsed: number,
  isCozyEyes = false,
): void {
  if (rig.eyelids.length > 0) {
    const eyesClosed = pose === 'sleep' || isCozyEyes;
    const targetLidY = eyesClosed ? 1.15 : 0.08;
    const lidY = eyesClosed ? 0 : 0.044;
    rig.eyelids.forEach((lid) => {
      lid.scale.y = targetLidY;
      lid.position.y = lidY;
    });
  }

  if (rig.shadowDisc) {
    rig.shadowDisc.visible = pose !== 'sit' && pose !== 'sleep';
  }

  const hold = rig.holdPose || 'none';

  if (pose === 'walk') {
    const swing = Math.sin(elapsed * 12);
    rig.leftLeg.rotation.x = swing * 0.55;
    rig.rightLeg.rotation.x = -swing * 0.55;
    rig.leftArm.rotation.x = -swing * 0.45;
    if (rig.leftElbow) rig.leftElbow.rotation.x = HAND_POSES.none.elbowX - 0.08 + Math.max(0, -swing) * 0.15;

    if (hold === 'carry_umbrella') {
      rig.rightArm.rotation.x = HAND_POSES.carry_umbrella.armX + swing * 0.06;
      if (rig.rightElbow) rig.rightElbow.rotation.x = HAND_POSES.carry_umbrella.elbowX;
    } else if (hold === 'carry_front') {
      rig.rightArm.rotation.x = HAND_POSES.carry_front.armX + swing * 0.1;
      if (rig.rightElbow) rig.rightElbow.rotation.x = HAND_POSES.carry_front.elbowX;
    } else if (hold === 'carry_bag') {
      rig.rightArm.rotation.x = HAND_POSES.carry_bag.armX + swing * 0.22;
      if (rig.rightElbow) rig.rightElbow.rotation.x = HAND_POSES.carry_bag.elbowX;
    } else {
      rig.rightArm.rotation.x = swing * 0.45;
      if (rig.rightElbow) rig.rightElbow.rotation.x = HAND_POSES.none.elbowX - 0.08 + Math.max(0, swing) * 0.15;
    }

    if (rig.torsoGroup) rig.torsoGroup.position.y = 0.77;
    rig.headPivot.position.y = HEAD_PIVOT_Y;
    rig.bodyPivot.position.y = Math.abs(Math.cos(elapsed * 12)) * 0.075;
    rig.bodyPivot.rotation.x = 0.06;
    rig.headPivot.rotation.z = Math.sin(elapsed * 6) * 0.03;
  } else if (pose === 'sit') {
    rig.leftLeg.rotation.x = -1.36;
    rig.rightLeg.rotation.x = -1.36;
    rig.leftArm.rotation.x = -0.42;
    if (rig.leftElbow) rig.leftElbow.rotation.x = -0.52;

    if (hold === 'carry_umbrella') {
      rig.rightArm.rotation.x = HAND_POSES.carry_umbrella.armX;
      if (rig.rightElbow) rig.rightElbow.rotation.x = HAND_POSES.carry_umbrella.elbowX;
    } else if (hold === 'carry_front') {
      rig.rightArm.rotation.x = HAND_POSES.carry_front.armX;
      if (rig.rightElbow) rig.rightElbow.rotation.x = HAND_POSES.carry_front.elbowX;
    } else {
      rig.rightArm.rotation.x = -0.42;
      if (rig.rightElbow) rig.rightElbow.rotation.x = -0.52;
    }

    if (rig.torsoGroup) rig.torsoGroup.position.y = 0.77;
    rig.headPivot.position.y = HEAD_PIVOT_Y;
    rig.bodyPivot.position.y = -0.18;
    rig.bodyPivot.rotation.x = 0;
    rig.headPivot.rotation.z = 0;
  } else if (pose === 'sleep') {
    rig.leftLeg.rotation.x = 0;
    rig.rightLeg.rotation.x = 0;
    rig.leftArm.rotation.x = 0;
    rig.rightArm.rotation.x = 0;
    if (rig.leftElbow) rig.leftElbow.rotation.x = -0.08;
    if (rig.rightElbow) rig.rightElbow.rotation.x = -0.08;
    if (rig.torsoGroup) rig.torsoGroup.position.y = 0.77;
    rig.headPivot.position.y = HEAD_PIVOT_Y;
    rig.bodyPivot.position.y = 0.36;
    rig.bodyPivot.rotation.x = -Math.PI / 2;
    rig.headPivot.rotation.z = 0;
  } else {
    // Calm static Idle: planted cleanly on the ground with zero jitter/idle sway
    rig.leftLeg.rotation.x = 0;
    rig.rightLeg.rotation.x = 0;
    rig.bodyPivot.position.y = 0;
    rig.bodyPivot.rotation.x = 0;

    if (rig.torsoGroup) rig.torsoGroup.position.y = 0.77;
    rig.headPivot.position.y = HEAD_PIVOT_Y;
    rig.headPivot.rotation.z = 0;

    rig.leftArm.rotation.x = 0;
    if (rig.leftElbow) rig.leftElbow.rotation.x = HAND_POSES.none.elbowX;

    if (hold === 'carry_umbrella') {
      rig.rightArm.rotation.x = HAND_POSES.carry_umbrella.armX;
      if (rig.rightElbow) rig.rightElbow.rotation.x = HAND_POSES.carry_umbrella.elbowX;
    } else if (hold === 'carry_front') {
      rig.rightArm.rotation.x = HAND_POSES.carry_front.armX;
      if (rig.rightElbow) rig.rightElbow.rotation.x = HAND_POSES.carry_front.elbowX;
    } else if (hold === 'carry_bag') {
      rig.rightArm.rotation.x = HAND_POSES.carry_bag.armX;
      if (rig.rightElbow) rig.rightElbow.rotation.x = HAND_POSES.carry_bag.elbowX;
    } else {
      rig.rightArm.rotation.x = 0;
      if (rig.rightElbow) rig.rightElbow.rotation.x = HAND_POSES.none.elbowX;
    }
  }
}
