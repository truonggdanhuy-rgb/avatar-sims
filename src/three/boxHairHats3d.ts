import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {HeadItemStyle} from '../types/game';
import {
  BOX_CY,
  BOX_D,
  BOX_FRONT_Z,
  BOX_H,
  BOX_TOP_Y,
  BOX_W,
  createBoxHeadbandCurveGeometry,
} from './boxHeadSystem';
import {clayMat, glossyClayMat} from './materials';

function shadeColor(hex: string, delta: number): string {
  const c = new THREE.Color(hex);
  const hsl = {h: 0, s: 0, l: 0};
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, Math.min(0.94, Math.max(0.08, hsl.l + delta)));
  return `#${c.getHexString()}`;
}

function addBaseCap(
  grp: THREE.Group,
  mat: THREE.Material,
  options?: {
    backHeight?: number;
    backBottomOffset?: number;
    sideLength?: 'buzz' | 'short' | 'bob' | 'shoulder' | 'long';
    flaredEnds?: boolean;
    capThickness?: number;
  },
): void {
  const capT = options?.capThickness ?? 0.048;
  const sideLen = options?.sideLength ?? 'short';
  const backH =
    options?.backHeight ??
    (sideLen === 'buzz'
      ? 0.24
      : sideLen === 'short'
        ? 0.36
        : sideLen === 'bob'
          ? 0.48
          : sideLen === 'shoulder'
            ? 0.56
            : 0.65);

  // 1. Top crown shell hugging upper box head
  const crown = new THREE.Mesh(
    new RoundedBoxGeometry(BOX_W + capT, 0.165, BOX_D + capT, 4, 0.076),
    mat,
  );
  crown.position.set(0, BOX_TOP_Y - 0.012, -0.008);
  grp.add(crown);

  // Soft crown dome rounding
  const topDome = new THREE.Mesh(new THREE.SphereGeometry(0.32, 18, 12), mat);
  topDome.scale.set(1.02, 0.28, 0.94);
  topDome.position.set(0, BOX_TOP_Y + 0.038, -0.014);
  grp.add(topDome);

  // 2. Back hair curtain covering back & rear corners
  const backCurtain = new THREE.Mesh(
    new RoundedBoxGeometry(BOX_W + capT + 0.012, backH, 0.24, 4, 0.074),
    mat,
  );
  const backTopY = BOX_TOP_Y + 0.04;
  backCurtain.position.set(0, backTopY - backH * 0.5, -BOX_FRONT_Z + 0.068);
  grp.add(backCurtain);

  // 3. Left & Right side locks framing the box face
  if (sideLen === 'buzz') {
    [-1, 1].forEach((s) => {
      const sideFade = new THREE.Mesh(
        new RoundedBoxGeometry(0.036, 0.26, BOX_D - 0.05, 3, 0.018),
        mat,
      );
      sideFade.position.set(s * (BOX_W * 0.5 + 0.012), BOX_TOP_Y - 0.13, -0.02);
      grp.add(sideFade);
    });
    return;
  }

  const sideH =
    sideLen === 'short'
      ? 0.25
      : sideLen === 'bob'
        ? 0.45
        : sideLen === 'shoulder'
          ? 0.52
          : 0.6;
  const sideW = sideLen === 'short' ? 0.058 : 0.076;
  const sideY = BOX_TOP_Y - sideH * 0.5 + 0.015;

  ([-1, 1] as const).forEach((s) => {
    const sideLock = new THREE.Mesh(
      new RoundedBoxGeometry(sideW, sideH, BOX_D * 0.88, 3, 0.032),
      mat,
    );
    sideLock.position.set(s * (BOX_W * 0.5 + 0.018), sideY, -0.016);
    grp.add(sideLock);

    // Front cheek lock hugging front side edge without blocking eyes
    if (sideLen !== 'short') {
      const frontStrand = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.038, Math.max(0.18, sideH - 0.11), 6, 10),
        mat,
      );
      frontStrand.scale.set(0.92, 1, 0.85);
      frontStrand.position.set(s * (BOX_W * 0.5 + 0.008), sideY - 0.015, 0.195);
      frontStrand.rotation.z = options?.flaredEnds ? -s * 0.12 : s * 0.06;
      grp.add(frontStrand);

      if (options?.flaredEnds) {
        const curlTip = new THREE.Mesh(new THREE.SphereGeometry(0.054, 10, 8), mat);
        curlTip.scale.set(1.15, 0.82, 0.92);
        curlTip.position.set(s * (BOX_W * 0.5 + 0.042), sideY - sideH * 0.46, 0.14);
        grp.add(curlTip);
      } else {
        const inwardCurl = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), mat);
        inwardCurl.scale.set(1.05, 0.82, 0.95);
        inwardCurl.position.set(s * (BOX_W * 0.5 - 0.005), sideY - sideH * 0.46, 0.16);
        grp.add(inwardCurl);
      }
    } else {
      // Short boy tapered sideburn
      const sideburn = new THREE.Mesh(new THREE.CapsuleGeometry(0.026, 0.11, 6, 8), mat);
      sideburn.position.set(s * (BOX_W * 0.5 + 0.014), BOX_TOP_Y - 0.16, 0.17);
      grp.add(sideburn);
    }
  });
}

function addMessyBangs(grp: THREE.Group, mat: THREE.Material, tipMat: THREE.Material): void {
  const locks: Array<[number, number, number, number, number]> = [
    [-0.21, BOX_TOP_Y - 0.052, 0.028, 0.09, 0.34],
    [-0.11, BOX_TOP_Y - 0.065, 0.032, 0.105, 0.18],
    [0.0, BOX_TOP_Y - 0.072, 0.034, 0.11, -0.05],
    [0.11, BOX_TOP_Y - 0.062, 0.032, 0.102, -0.22],
    [0.21, BOX_TOP_Y - 0.05, 0.028, 0.09, -0.36],
  ];
  locks.forEach(([x, y, r, len, rz]) => {
    const tuft = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 8), mat);
    tuft.scale.set(1.1, 1, 0.65);
    tuft.position.set(x, y, BOX_FRONT_Z + 0.016);
    tuft.rotation.z = rz;
    tuft.rotation.x = 0.28;
    grp.add(tuft);
  });
  // Top tousled crown puffs
  for (let i = -2; i <= 2; i++) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.066, 10, 8), i % 2 === 0 ? mat : tipMat);
    puff.scale.set(1.15, 0.72, 1.05);
    puff.position.set(i * 0.1, BOX_TOP_Y + 0.065 + (i % 2 === 0 ? 0.012 : 0), 0.03);
    puff.rotation.z = -i * 0.12;
    grp.add(puff);
  }
}

function addSpikyCrown(grp: THREE.Group, mat: THREE.Material, tipMat: THREE.Material): void {
  const spikes: Array<[number, number, number, number, number, number]> = [
    [-0.18, BOX_TOP_Y + 0.078, 0.06, 0.058, 0.12, 0.28],
    [-0.08, BOX_TOP_Y + 0.095, 0.04, 0.066, 0.145, 0.14],
    [0.02, BOX_TOP_Y + 0.102, 0.02, 0.07, 0.155, -0.08],
    [0.13, BOX_TOP_Y + 0.088, 0.05, 0.062, 0.135, -0.24],
    [0.22, BOX_TOP_Y + 0.066, 0.02, 0.052, 0.11, -0.38],
    [-0.12, BOX_TOP_Y + 0.08, -0.09, 0.06, 0.125, 0.2],
    [0.08, BOX_TOP_Y + 0.084, -0.1, 0.062, 0.13, -0.18],
  ];
  spikes.forEach(([x, y, z, r, h, rz], idx) => {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(r, h, 8), idx % 2 === 0 ? mat : tipMat);
    spike.position.set(x, y, z);
    spike.rotation.z = rz;
    spike.rotation.x = 0.18;
    grp.add(spike);
  });
  // Clean lifted short forehead fringe
  for (let i = -2; i <= 2; i++) {
    const fringe = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.075, 5, 8), mat);
    fringe.scale.set(1.05, 1, 0.65);
    fringe.position.set(i * 0.1, BOX_TOP_Y - 0.036, BOX_FRONT_Z + 0.015);
    fringe.rotation.z = -i * 0.15;
    fringe.rotation.x = -0.35;
    grp.add(fringe);
  }
}

function addCurtainBangs(
  grp: THREE.Group,
  mat: THREE.Material,
  highlightMat: THREE.Material,
  gapWidth = 0.048,
): void {
  ([-1, 1] as const).forEach((s) => {
    const sweep = new THREE.Mesh(new THREE.CapsuleGeometry(0.042, 0.15, 8, 10), mat);
    sweep.scale.set(1.08, 1, 0.62);
    sweep.position.set(s * (0.115 + gapWidth), BOX_TOP_Y - 0.044, BOX_FRONT_Z + 0.016);
    sweep.rotation.z = s * 0.56;
    sweep.rotation.x = 0.16;

    const outerCurl = new THREE.Mesh(new THREE.CapsuleGeometry(0.034, 0.12, 6, 8), highlightMat);
    outerCurl.scale.set(1, 1, 0.6);
    outerCurl.position.set(s * 0.255, BOX_TOP_Y - 0.088, BOX_FRONT_Z + 0.008);
    outerCurl.rotation.z = s * 0.18;

    const topSweep = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), mat);
    topSweep.scale.set(1.22, 0.58, 1.0);
    topSweep.position.set(s * 0.125, BOX_TOP_Y + 0.056, 0.07);
    topSweep.rotation.z = -s * 0.14;
    grp.add(sweep, outerCurl, topSweep);
  });
}

function addSidePartBangs(grp: THREE.Group, mat: THREE.Material, highlightMat: THREE.Material, flip = 1): void {
  // Asymmetric voluminous side-parted wave
  const bigWave = new THREE.Mesh(new THREE.CapsuleGeometry(0.048, 0.21, 8, 12), mat);
  bigWave.scale.set(1.12, 1, 0.66);
  bigWave.position.set(flip * 0.09, BOX_TOP_Y - 0.036, BOX_FRONT_Z + 0.018);
  bigWave.rotation.z = flip * 0.68;

  const sideWing = new THREE.Mesh(new THREE.CapsuleGeometry(0.036, 0.13, 6, 8), highlightMat);
  sideWing.scale.set(1.05, 1, 0.62);
  sideWing.position.set(-flip * 0.21, BOX_TOP_Y - 0.058, BOX_FRONT_Z + 0.012);
  sideWing.rotation.z = -flip * 0.42;

  const crownLift = new THREE.Mesh(new THREE.SphereGeometry(0.115, 14, 10), mat);
  crownLift.scale.set(1.35, 0.56, 1.12);
  crownLift.position.set(flip * 0.08, BOX_TOP_Y + 0.068, 0.06);
  crownLift.rotation.z = -flip * 0.16;
  grp.add(bigWave, sideWing, crownLift);
}

function addBluntBangs(grp: THREE.Group, mat: THREE.Material, soft = false): void {
  const bangSlab = new THREE.Mesh(
    new RoundedBoxGeometry(BOX_W - 0.035, 0.132, 0.07, 3, 0.028),
    mat,
  );
  bangSlab.position.set(0, BOX_TOP_Y - 0.044, BOX_FRONT_Z + 0.008);
  grp.add(bangSlab);

  const count = soft ? 5 : 4;
  for (let i = 0; i < count; i++) {
    const x = ((i - (count - 1) / 2) / count) * 0.46;
    const strand = new THREE.Mesh(new THREE.CapsuleGeometry(0.032, 0.072, 6, 8), mat);
    strand.scale.set(1.15, 1, 0.52);
    strand.position.set(x, BOX_TOP_Y - 0.064, BOX_FRONT_Z + 0.022);
    strand.rotation.z = soft ? -x * 0.35 : 0;
    grp.add(strand);
  }
}

function addFlowerClip(
  grp: THREE.Group,
  petalHex: string,
  centerHex: string,
  pos: [number, number, number],
  scale = 1,
): void {
  const flower = new THREE.Group();
  flower.position.set(...pos);
  flower.scale.setScalar(scale);
  flower.rotation.y = 0.25;
  flower.rotation.x = -0.18;

  const pMat = glossyClayMat(petalHex, 0.28);
  const cMat = clayMat(centerHex, 0.45);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const petal = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 8), pMat);
    petal.scale.set(0.95, 1.15, 0.42);
    petal.position.set(Math.cos(a) * 0.026, Math.sin(a) * 0.026, 0);
    flower.add(petal);
  }
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.017, 10, 8), cMat);
  core.scale.set(1, 1, 0.65);
  core.position.z = 0.007;
  flower.add(core);
  grp.add(flower);
}

function addGoldPinClip(grp: THREE.Group, pos: [number, number, number]): void {
  const pinMat = new THREE.MeshStandardMaterial({
    color: '#FBBF24',
    roughness: 0.22,
    metalness: 0.62,
  });
  const pin = new THREE.Mesh(new RoundedBoxGeometry(0.088, 0.017, 0.018, 2, 0.006), pinMat);
  pin.position.set(...pos);
  pin.rotation.z = -0.22;
  grp.add(pin);
}

function addRibbonBow(
  grp: THREE.Group,
  ribbonHex: string,
  pos: [number, number, number],
  rotZ = -0.24,
  scale = 1,
): void {
  const bowMat = clayMat(ribbonHex, 0.48);
  const knotMat = clayMat(shadeColor(ribbonHex, -0.12), 0.5);
  const bow = new THREE.Group();
  bow.position.set(...pos);
  bow.rotation.z = rotZ;
  bow.scale.setScalar(scale);
  [-1, 1].forEach((s) => {
    const wing = new THREE.Mesh(new THREE.SphereGeometry(0.048, 12, 10), bowMat);
    wing.scale.set(1.22, 0.72, 0.52);
    wing.position.set(s * 0.046, 0.006, 0);
    wing.rotation.z = s * 0.22;
    const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.013, 0.046, 5, 8), bowMat);
    tail.position.set(s * 0.026, -0.036, -0.004);
    tail.rotation.z = s * 0.36;
    bow.add(wing, tail);
  });
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), knotMat);
  knot.position.z = 0.01;
  bow.add(knot);
  grp.add(bow);
}

function addBraidedTail(
  grp: THREE.Group,
  mat: THREE.Material,
  tieHex: string,
  startPos: [number, number, number],
  rotZ = 0,
  segments = 4,
): void {
  const braid = new THREE.Group();
  braid.position.set(...startPos);
  braid.rotation.z = rotZ;
  for (let i = 0; i < segments; i++) {
    const r = 0.042 - i * 0.004;
    const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), mat);
    puff.scale.set(0.95, 1.12, 0.88);
    puff.position.set((i % 2 === 0 ? -1 : 1) * 0.006, -i * 0.055, 0);
    braid.add(puff);
  }
  const tie = new THREE.Mesh(
    new THREE.TorusGeometry(0.025, 0.009, 8, 14),
    clayMat(tieHex, 0.48),
  );
  tie.rotation.x = Math.PI / 2;
  tie.position.set(0, -(segments - 0.5) * 0.055, 0);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.055, 8), mat);
  tip.rotation.x = Math.PI;
  tip.position.set(0, -(segments - 0.1) * 0.055 - 0.02, 0);
  braid.add(tie, tip);
  grp.add(braid);
}

export function buildBoxHeadHairOrHood3D(
  headItem: HeadItemStyle,
  headItemColor: string,
): THREE.Group | null {
  const grp = new THREE.Group();
  const baseCol = headItemColor || '#6B4834';
  const hairMat = clayMat(baseCol, 0.68);
  const tipMat = clayMat(shadeColor(baseCol, 0.07), 0.66);

  switch (headItem) {
    // ==================== ROW 1: BOY STYLES ====================
    case 'hair_boy_messy': {
      addBaseCap(grp, hairMat, {sideLength: 'short'});
      addMessyBangs(grp, hairMat, tipMat);
      return grp;
    }

    case 'hair_boy_spiky': {
      addBaseCap(grp, hairMat, {sideLength: 'short'});
      addSpikyCrown(grp, hairMat, tipMat);
      return grp;
    }

    case 'hair_boy_sidepart': {
      addBaseCap(grp, hairMat, {sideLength: 'short'});
      addSidePartBangs(grp, hairMat, tipMat, 1);
      return grp;
    }

    case 'hair_boy_curtain_black': {
      addBaseCap(grp, hairMat, {sideLength: 'short'});
      addCurtainBangs(grp, hairMat, tipMat, 0.048);
      return grp;
    }

    case 'hair_boy_fluffy': {
      addBaseCap(grp, hairMat, {sideLength: 'short'});
      addMessyBangs(grp, hairMat, tipMat);
      addBluntBangs(grp, hairMat, true);
      return grp;
    }

    case 'hair_boy_layered': {
      addBaseCap(grp, hairMat, {sideLength: 'short'});
      addBluntBangs(grp, hairMat, true);
      ([-1, 1] as const).forEach((s) => {
        const earTuft = new THREE.Mesh(new THREE.CapsuleGeometry(0.032, 0.11, 6, 8), tipMat);
        earTuft.position.set(s * (BOX_W * 0.5 + 0.025), BOX_TOP_Y - 0.16, 0.12);
        earTuft.rotation.z = -s * 0.22;
        grp.add(earTuft);
      });
      return grp;
    }

    // ==================== ROW 2: BOY & IDOL STYLES ====================
    case 'hair_boy_wolf': {
      addBaseCap(grp, hairMat, {sideLength: 'bob', flaredEnds: true});
      addCurtainBangs(grp, hairMat, tipMat, 0.035);
      return grp;
    }

    case 'hair_boy_ash_violet': {
      addBaseCap(grp, hairMat, {sideLength: 'short'});
      addCurtainBangs(grp, hairMat, tipMat, 0.028);
      ([-1, 1] as const).forEach((s) => {
        const wispy = new THREE.Mesh(new THREE.CapsuleGeometry(0.028, 0.12, 6, 8), tipMat);
        wispy.position.set(s * 0.295, BOX_TOP_Y - 0.13, 0.18);
        wispy.rotation.z = -s * 0.24;
        grp.add(wispy);
      });
      return grp;
    }

    case 'hair_boy_comma': {
      addBaseCap(grp, hairMat, {sideLength: 'short'});
      addSidePartBangs(grp, hairMat, tipMat, -1);
      return grp;
    }

    case 'hair_boy_curl': {
      addBaseCap(grp, hairMat, {sideLength: 'short'});
      // Curly cloud dome + curly fringe puffs
      for (let i = -3; i <= 3; i++) {
        const fPuff = new THREE.Mesh(new THREE.SphereGeometry(0.048, 10, 8), i % 2 === 0 ? hairMat : tipMat);
        fPuff.scale.set(1.05, 0.88, 0.72);
        fPuff.position.set(i * 0.075, BOX_TOP_Y - 0.035, BOX_FRONT_Z + 0.012);
        grp.add(fPuff);
      }
      for (let i = -2; i <= 2; i++) {
        const topCurl = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), tipMat);
        topCurl.scale.set(1.15, 0.78, 1.05);
        topCurl.position.set(i * 0.105, BOX_TOP_Y + 0.068, 0.02);
        grp.add(topCurl);
      }
      return grp;
    }

    case 'hair_boy_flame': {
      addBaseCap(grp, hairMat, {sideLength: 'short'});
      addSpikyCrown(grp, hairMat, tipMat);
      return grp;
    }

    case 'hair_boy_buzz': {
      addBaseCap(grp, hairMat, {sideLength: 'buzz', capThickness: 0.024});
      const hairline = new THREE.Mesh(
        new RoundedBoxGeometry(BOX_W - 0.02, 0.055, 0.036, 2, 0.016),
        hairMat,
      );
      hairline.position.set(0, BOX_TOP_Y - 0.018, BOX_FRONT_Z + 0.002);
      grp.add(hairline);
      return grp;
    }

    case 'hair_boy_slick': {
      addBaseCap(grp, hairMat, {sideLength: 'buzz', capThickness: 0.032});
      for (let i = -2; i <= 2; i++) {
        const wave = new THREE.Mesh(new THREE.CapsuleGeometry(0.036, 0.19, 8, 10), i === 0 ? tipMat : hairMat);
        wave.rotation.x = Math.PI / 2 - 0.18;
        wave.position.set(i * 0.095, BOX_TOP_Y + 0.052, 0.035);
        grp.add(wave);
      }
      return grp;
    }

    // ==================== ROW 3: GIRL BOB, BUNS, PONYTAILS ====================
    case 'hair_girl_bob': {
      addBaseCap(grp, hairMat, {sideLength: 'bob'});
      addBluntBangs(grp, hairMat);
      return grp;
    }

    case 'hair_girl_flower_pink': {
      addBaseCap(grp, hairMat, {sideLength: 'shoulder', flaredEnds: true});
      addBluntBangs(grp, hairMat, true);
      addFlowerClip(grp, '#FF9EBB', '#FDE047', [0.19, BOX_TOP_Y - 0.028, BOX_FRONT_Z + 0.044], 1.15);
      return grp;
    }

    case 'hair_girl_twin_buns': {
      addBaseCap(grp, hairMat, {sideLength: 'short'});
      addBluntBangs(grp, hairMat);
      ([-1, 1] as const).forEach((s) => {
        const bun = new THREE.Mesh(new THREE.SphereGeometry(0.118, 16, 14), hairMat);
        bun.scale.set(1.06, 0.96, 0.96);
        bun.position.set(s * 0.255, BOX_TOP_Y + 0.088, -0.02);
        const tie = new THREE.Mesh(
          new THREE.TorusGeometry(0.072, 0.014, 8, 18),
          clayMat(shadeColor(baseCol, -0.15), 0.55),
        );
        tie.rotation.x = Math.PI / 2 - 0.35;
        tie.rotation.z = s * 0.55;
        tie.position.set(s * 0.215, BOX_TOP_Y + 0.048, -0.02);
        grp.add(bun, tie);
      });
      return grp;
    }

    case 'hair_girl_side_pony': {
      addBaseCap(grp, hairMat, {sideLength: 'shoulder', flaredEnds: true});
      addBluntBangs(grp, hairMat, true);
      addFlowerClip(grp, '#FF9EBB', '#FDE047', [0.19, BOX_TOP_Y - 0.024, BOX_FRONT_Z + 0.044], 1.15);
      // Side ponytail on top-right
      const ponyGrp = new THREE.Group();
      ponyGrp.position.set(0.28, BOX_TOP_Y + 0.02, -0.06);
      const ponyMain = new THREE.Mesh(new THREE.CapsuleGeometry(0.068, 0.24, 8, 12), hairMat);
      ponyMain.position.set(0.078, -0.11, -0.01);
      ponyMain.rotation.z = 0.24;
      const ponyTip = new THREE.Mesh(new THREE.ConeGeometry(0.068, 0.14, 10), tipMat);
      ponyTip.rotation.x = Math.PI;
      ponyTip.position.set(0.11, -0.27, -0.01);
      ponyGrp.add(ponyMain, ponyTip);
      grp.add(ponyGrp);
      return grp;
    }

    case 'hair_girl_wavy_daisy': {
      addBaseCap(grp, hairMat, {sideLength: 'shoulder', flaredEnds: true});
      addCurtainBangs(grp, hairMat, tipMat, 0.036);
      addFlowerClip(grp, '#FACC15', '#B45309', [0.22, BOX_TOP_Y - 0.016, BOX_FRONT_Z + 0.044], 1.18);
      return grp;
    }

    case 'hair_girl_straight_clip': {
      addBaseCap(grp, hairMat, {sideLength: 'long', flaredEnds: false});
      addBluntBangs(grp, hairMat);
      addGoldPinClip(grp, [0.155, BOX_TOP_Y - 0.03, BOX_FRONT_Z + 0.045]);
      return grp;
    }

    case 'hair_girl_high_pony': {
      addBaseCap(grp, hairMat, {sideLength: 'bob'});
      addBluntBangs(grp, hairMat, true);
      addGoldPinClip(grp, [0.145, BOX_TOP_Y - 0.03, BOX_FRONT_Z + 0.045]);
      // High puffy ponytail on top-right with pink scrunchie
      const scrunchie = new THREE.Mesh(
        new THREE.TorusGeometry(0.056, 0.026, 10, 18),
        clayMat('#FB7185', 0.45),
      );
      scrunchie.rotation.x = Math.PI / 2 - 0.3;
      scrunchie.rotation.z = -0.38;
      scrunchie.position.set(0.19, BOX_TOP_Y + 0.085, -0.08);
      grp.add(scrunchie);

      const pony = new THREE.Mesh(new THREE.CapsuleGeometry(0.072, 0.34, 10, 12), hairMat);
      pony.position.set(0.32, BOX_TOP_Y - 0.055, -0.1);
      pony.rotation.z = 0.32;
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.068, 0.14, 10), tipMat);
      tip.rotation.x = Math.PI;
      tip.position.set(0.38, BOX_TOP_Y - 0.28, -0.1);
      grp.add(pony, tip);
      return grp;
    }

    // ==================== ROW 4: GIRL PASTEL, BAND, BRAIDS, BOW ====================
    case 'hair_girl_pink_wave': {
      addBaseCap(grp, hairMat, {sideLength: 'shoulder', flaredEnds: true});
      addCurtainBangs(grp, hairMat, tipMat, 0.028);
      return grp;
    }

    case 'hair_girl_lavender_flower': {
      addBaseCap(grp, hairMat, {sideLength: 'long', flaredEnds: true});
      addCurtainBangs(grp, hairMat, tipMat, 0.028);
      addFlowerClip(grp, '#FDE047', '#F59E0B', [0.22, BOX_TOP_Y - 0.016, BOX_FRONT_Z + 0.044], 1.18);
      return grp;
    }

    case 'hair_girl_twin_tails': {
      addBaseCap(grp, hairMat, {sideLength: 'bob'});
      addBluntBangs(grp, hairMat);
      ([-1, 1] as const).forEach((s) => {
        const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.052, 0.15, 8, 10), hairMat);
        tail.position.set(s * (BOX_W * 0.5 + 0.078), BOX_CY - 0.17, 0.08);
        tail.rotation.z = s * 0.34;
        addRibbonBow(grp, '#A78BFA', [s * (BOX_W * 0.5 + 0.055), BOX_CY - 0.08, 0.14], -s * 0.25, 0.72);
        grp.add(tail);
      });
      return grp;
    }

    case 'hair_girl_white_band': {
      addBaseCap(grp, hairMat, {sideLength: 'bob'});
      addBluntBangs(grp, hairMat);
      const band = new THREE.Mesh(
        createBoxHeadbandCurveGeometry(0.036, 0.026, 0.04),
        clayMat('#FFFDF9', 0.42),
      );
      grp.add(band);
      return grp;
    }

    case 'hair_girl_twin_braids': {
      addBaseCap(grp, hairMat, {sideLength: 'bob'});
      addBluntBangs(grp, hairMat, true);
      addFlowerClip(grp, '#FBCFE8', '#FDE047', [0.18, BOX_TOP_Y - 0.024, BOX_FRONT_Z + 0.044], 1.05);
      ([-1, 1] as const).forEach((s) => {
        addBraidedTail(grp, hairMat, '#93C5FD', [s * (BOX_W * 0.5 + 0.025), BOX_CY - 0.08, 0.18], s * 0.08, 4);
      });
      return grp;
    }

    case 'hair_girl_side_braid': {
      addBaseCap(grp, hairMat, {sideLength: 'shoulder'});
      addCurtainBangs(grp, hairMat, tipMat, 0.032);
      addBraidedTail(grp, hairMat, '#F472B6', [0.275, BOX_CY - 0.06, 0.195], 0.12, 4);
      return grp;
    }

    case 'hair_girl_white_bow': {
      addBaseCap(grp, hairMat, {sideLength: 'long', flaredEnds: true});
      addBluntBangs(grp, hairMat, true);
      addRibbonBow(grp, '#FFFFFF', [0.215, BOX_TOP_Y + 0.016, 0.155], -0.32, 1.15);
      return grp;
    }

    // ==================== ROW 5: PLUSH HOODS & CAT-EAR HAIR ====================
    case 'bunny_hood_hat': {
      const hoodMat = clayMat(headItemColor || '#FCE7F3', 0.72);
      const innerPinkMat = clayMat('#F9A8D4', 0.65);
      const eyeDarkMat = clayMat('#2A1E24', 0.45);
      const cheekMat = clayMat('#FB7185', 0.65);

      const hood = new THREE.Mesh(
        new RoundedBoxGeometry(BOX_W + 0.056, BOX_H - 0.04, BOX_D + 0.042, 4, 0.085),
        hoodMat,
      );
      hood.position.set(0, BOX_CY + 0.06, -0.028);
      const topCuff = new THREE.Mesh(
        new RoundedBoxGeometry(BOX_W + 0.064, 0.15, BOX_D + 0.048, 4, 0.072),
        hoodMat,
      );
      topCuff.position.set(0, BOX_TOP_Y - 0.004, 0.0);
      grp.add(hood, topCuff);

      // Cute bunny eyes + cheeks + nose on hood forehead
      [-1, 1].forEach((s) => {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.017, 10, 8), eyeDarkMat);
        eye.position.set(s * 0.075, BOX_TOP_Y + 0.015, BOX_FRONT_Z + 0.024);
        const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 8), cheekMat);
        cheek.scale.set(1.25, 0.72, 0.35);
        cheek.position.set(s * 0.125, BOX_TOP_Y - 0.012, BOX_FRONT_Z + 0.022);
        grp.add(eye, cheek);
      });
      const nose = new THREE.Mesh(new THREE.SphereGeometry(0.013, 8, 8), cheekMat);
      nose.scale.set(1.2, 0.8, 0.5);
      nose.position.set(0, BOX_TOP_Y - 0.004, BOX_FRONT_Z + 0.026);
      grp.add(nose);

      // Big long floppy pink-lined bunny ears draping down sides
      ([-1, 1] as const).forEach((s) => {
        const earBase = new THREE.Mesh(new THREE.CapsuleGeometry(0.056, 0.28, 8, 12), hoodMat);
        earBase.scale.set(1.15, 1, 0.42);
        earBase.position.set(s * (BOX_W * 0.5 + 0.075), BOX_CY + 0.12, 0.04);
        earBase.rotation.z = s * 0.34;
        const inner = new THREE.Mesh(new THREE.CapsuleGeometry(0.032, 0.21, 6, 10), innerPinkMat);
        inner.scale.set(1, 1, 0.3);
        inner.position.set(s * (BOX_W * 0.5 + 0.075), BOX_CY + 0.11, 0.064);
        inner.rotation.z = s * 0.34;
        grp.add(earBase, inner);
      });
      return grp;
    }

    case 'hair_cat_ears_brown': {
      addBaseCap(grp, hairMat, {sideLength: 'bob'});
      addSidePartBangs(grp, hairMat, tipMat, 1);
      const catDarkMat = clayMat('#242026', 0.62);
      const catPinkMat = clayMat('#FB7185', 0.64);
      ([-1, 1] as const).forEach((s) => {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.088, 0.15, 4), catDarkMat);
        ear.rotation.y = Math.PI / 4;
        ear.scale.set(1, 1, 0.65);
        ear.position.set(s * 0.18, BOX_TOP_Y + 0.095, 0.03);
        ear.rotation.z = -s * 0.22;
        const inner = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.095, 4), catPinkMat);
        inner.rotation.y = Math.PI / 4;
        inner.scale.set(1, 1, 0.45);
        inner.position.set(s * 0.18, BOX_TOP_Y + 0.086, 0.058);
        inner.rotation.z = -s * 0.22;
        grp.add(ear, inner);
      });
      return grp;
    }

    case 'panda_hood_hat': {
      const whiteHoodMat = clayMat(headItemColor || '#FFFFFF', 0.74);
      const blackMat = clayMat('#242429', 0.65);

      const hood = new THREE.Mesh(
        new RoundedBoxGeometry(BOX_W + 0.054, BOX_H - 0.06, BOX_D + 0.042, 4, 0.082),
        whiteHoodMat,
      );
      hood.position.set(0, BOX_CY + 0.065, -0.025);
      const topCap = new THREE.Mesh(
        new RoundedBoxGeometry(BOX_W + 0.06, 0.155, BOX_D + 0.046, 4, 0.072),
        whiteHoodMat,
      );
      topCap.position.set(0, BOX_TOP_Y - 0.005, 0);
      grp.add(hood, topCap);

      // Subtle dark hair peek along inner cheek edges
      ([-1, 1] as const).forEach((s) => {
        const hairPeek = new THREE.Mesh(new THREE.CapsuleGeometry(0.026, 0.18, 6, 8), blackMat);
        hairPeek.position.set(s * (BOX_W * 0.5 + 0.004), BOX_CY + 0.04, 0.18);
        const ear = new THREE.Mesh(new THREE.CylinderGeometry(0.076, 0.076, 0.052, 16), blackMat);
        ear.rotation.x = Math.PI / 2;
        ear.position.set(s * 0.21, BOX_TOP_Y + 0.075, 0.02);
        grp.add(hairPeek, ear);
      });

      // Cute panda face embroidered on forehead
      ([-1, 1] as const).forEach((s) => {
        const patch = new THREE.Mesh(new THREE.SphereGeometry(0.036, 10, 8), blackMat);
        patch.scale.set(1.15, 0.9, 0.35);
        patch.position.set(s * 0.072, BOX_TOP_Y + 0.01, BOX_FRONT_Z + 0.024);
        patch.rotation.z = s * 0.22;
        const eyeDot = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 8), whiteHoodMat);
        eyeDot.position.set(s * 0.068, BOX_TOP_Y + 0.014, BOX_FRONT_Z + 0.034);
        grp.add(patch, eyeDot);
      });
      const nose = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 8), blackMat);
      nose.scale.set(1.25, 0.8, 0.5);
      nose.position.set(0, BOX_TOP_Y - 0.012, BOX_FRONT_Z + 0.028);
      grp.add(nose);
      return grp;
    }

    case 'frog_hood_hat': {
      const frogMat = clayMat(headItemColor || '#8BD46E', 0.68);
      const scleraMat = glossyClayMat('#FFFFFF', 0.18);
      const pupilMat = glossyClayMat('#1B1D24', 0.12);
      const blushMat = clayMat('#FB7185', 0.65);

      const hood = new THREE.Mesh(
        new RoundedBoxGeometry(BOX_W + 0.052, BOX_H - 0.06, BOX_D + 0.04, 4, 0.082),
        frogMat,
      );
      hood.position.set(0, BOX_CY + 0.065, -0.025);
      const topCap = new THREE.Mesh(
        new RoundedBoxGeometry(BOX_W + 0.058, 0.145, BOX_D + 0.044, 4, 0.07),
        frogMat,
      );
      topCap.position.set(0, BOX_TOP_Y - 0.008, 0);
      grp.add(hood, topCap);

      ([-1, 1] as const).forEach((s) => {
        const bump = new THREE.Mesh(new THREE.SphereGeometry(0.078, 14, 12), frogMat);
        bump.position.set(s * 0.145, BOX_TOP_Y + 0.072, 0.085);
        const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), scleraMat);
        sclera.position.set(s * 0.145, BOX_TOP_Y + 0.078, 0.13);
        const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 8), pupilMat);
        pupil.position.set(s * 0.145, BOX_TOP_Y + 0.08, 0.175);
        const blush = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 8), blushMat);
        blush.scale.set(1.3, 0.72, 0.35);
        blush.position.set(s * 0.135, BOX_TOP_Y - 0.01, BOX_FRONT_Z + 0.024);
        grp.add(bump, sclera, pupil, blush);
      });
      return grp;
    }

    default:
      return null;
  }
}
