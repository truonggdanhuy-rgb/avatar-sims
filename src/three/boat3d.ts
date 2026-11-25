import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {BoatId} from '../types/game';
import {clayMat, glossyClayMat, mergeStaticGroupByMaterial} from './materials';

export type BoatDriveKind = 'oars' | 'pedal' | 'motor';

export interface BuiltBoatRig {
  boat: THREE.Group;
  driveKind: BoatDriveKind;
  oarLPivot: THREE.Group | null;
  oarRPivot: THREE.Group | null;
  wheelPivot: THREE.Group | null;
  crankPivot: THREE.Group | null;
  pedalLPivot: THREE.Group | null;
  pedalRPivot: THREE.Group | null;
  sailPivot?: THREE.Group | null;
}

export interface WoodenBoatBuild {
  boat: THREE.Group;
  oarLPivot: THREE.Group | null;
  oarRPivot: THREE.Group | null;
}

export interface DuckBoatBuild {
  boat: THREE.Group;
  wheelPivot: THREE.Group | null;
  crankPivot: THREE.Group | null;
  pedalLPivot: THREE.Group | null;
  pedalRPivot: THREE.Group | null;
}

export function buildWoodenRowboat(
  withOarPivots = false,
  lampBulbsOut?: THREE.MeshStandardMaterial[],
): WoodenBoatBuild {
  const boat = new THREE.Group();
  const oakHull = clayMat('#A46233', 0.68);
  const oakInner = clayMat('#C88E56', 0.72);
  const oakTrim = clayMat('#DDA86F', 0.62);
  const oakDark = clayMat('#5D351A', 0.78);
  const brassMat = clayMat('#D8A94B', 0.34, 0.72);
  const ropeHempMat = clayMat('#DCC194', 0.86);
  const cushionRed = clayMat('#C65943', 0.74);
  const sailBlue = clayMat('#3D8EB8', 0.58);

  const STATIONS = 11;
  const PROW_Z = 1.52;
  const STERN_Z = -1.18;
  const hullHalfW = (t: number) => {
    if (t > 0.58) {
      const u = (1 - t) / 0.42;
      return 0.64 * Math.pow(Math.max(0.02, u), 0.62);
    }
    if (t < 0.22) {
      return THREE.MathUtils.lerp(0.46, 0.62, t / 0.22);
    }
    return 0.62 + 0.03 * Math.sin(((t - 0.22) / 0.36) * Math.PI);
  };
  const sheerLift = (t: number) =>
    Math.pow(Math.max(0, (t - 0.55) / 0.45), 1.7) * 0.2 + (t < 0.2 ? 0.04 : 0);

  const makeHullShellGeo = (wallOffset: number, yOffset: number) => {
    const verts: number[] = [];
    const indices: number[] = [];
    const RING = 7;
    for (let i = 0; i <= STATIONS; i++) {
      const t = i / STATIONS;
      const z = THREE.MathUtils.lerp(STERN_Z, PROW_Z, t);
      const hw = Math.max(0.03, hullHalfW(t) + wallOffset);
      const sheerY = 0.38 + sheerLift(t) + yOffset;
      const chineY = 0.11 + sheerLift(t) * 0.35 + yOffset;
      const keelY = 0.02 + sheerLift(t) * 0.28 + yOffset;
      const pts: [number, number][] = [
        [-hw, sheerY],
        [-hw * 0.84, chineY],
        [-hw * 0.42, keelY + 0.02],
        [0, keelY],
        [hw * 0.42, keelY + 0.02],
        [hw * 0.84, chineY],
        [hw, sheerY],
      ];
      for (const [px, py] of pts) {
        verts.push(px, py, z);
      }
    }
    for (let i = 0; i < STATIONS; i++) {
      const rA = i * RING;
      const rB = (i + 1) * RING;
      for (let j = 0; j < RING - 1; j++) {
        const a = rA + j;
        const b = rA + j + 1;
        const c = rB + j;
        const d = rB + j + 1;
        indices.push(a, c, b, b, c, d);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  };

  const oakHullDouble = new THREE.MeshStandardMaterial({
    color: '#A46233',
    roughness: 0.68,
    side: THREE.DoubleSide,
  });
  const oakInnerDouble = new THREE.MeshStandardMaterial({
    color: '#C88E56',
    roughness: 0.72,
    side: THREE.DoubleSide,
  });
  const outerShell = new THREE.Mesh(makeHullShellGeo(0, 0), oakHullDouble);
  const innerShell = new THREE.Mesh(makeHullShellGeo(-0.055, 0.045), oakInnerDouble);
  boat.add(outerShell, innerShell);

  const transom = new THREE.Mesh(new RoundedBoxGeometry(0.94, 0.36, 0.1, 2, 0.03), oakDark);
  transom.position.set(0, 0.22, STERN_Z + 0.03);
  transom.rotation.x = -0.14;
  const keelSpine = new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.08, 2.38, 2, 0.02), oakDark);
  keelSpine.position.set(0, 0.01, 0.06);
  const stemPost = new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.48, 0.18, 2, 0.03), oakDark);
  stemPost.rotation.x = 0.56;
  stemPost.position.set(0, 0.34, PROW_Z - 0.08);
  boat.add(transom, keelSpine, stemPost);

  [-1, 1].forEach((side) => {
    for (let i = 0; i < STATIONS; i++) {
      const t0 = i / STATIONS;
      const t1 = (i + 1) / STATIONS;
      const z0 = THREE.MathUtils.lerp(STERN_Z, PROW_Z, t0);
      const z1 = THREE.MathUtils.lerp(STERN_Z, PROW_Z, t1);
      const x0 = side * hullHalfW(t0);
      const x1 = side * hullHalfW(t1);
      const y0 = 0.4 + sheerLift(t0);
      const y1 = 0.4 + sheerLift(t1);
      const segLen = Math.hypot(x1 - x0, y1 - y0, z1 - z0);
      const rail = new THREE.Mesh(
        new RoundedBoxGeometry(0.085, 0.075, segLen + 0.04, 1, 0.02),
        oakTrim,
      );
      rail.position.set((x0 + x1) * 0.5, (y0 + y1) * 0.5, (z0 + z1) * 0.5);
      rail.lookAt(x1, y1, z1);
      boat.add(rail);
    }
  });

  for (let s = -2; s <= 2; s++) {
    const plank = new THREE.Mesh(
      new RoundedBoxGeometry(0.11, 0.035, 1.82 - Math.abs(s) * 0.14, 1, 0.01),
      s % 2 === 0 ? oakTrim : oakInner,
    );
    plank.position.set(s * 0.145, 0.1, -0.05);
    boat.add(plank);
  }
  [-0.78, -0.22, 0.32, 0.82].forEach((rz) => {
    const rib = new THREE.Mesh(new RoundedBoxGeometry(0.92, 0.04, 0.06, 1, 0.015), oakDark);
    rib.position.set(0, 0.085, rz);
    boat.add(rib);
  });

  const foreDeck = new THREE.Mesh(new THREE.ConeGeometry(0.54, 0.68, 4), oakTrim);
  foreDeck.rotation.x = Math.PI / 2;
  foreDeck.rotation.y = Math.PI / 4;
  foreDeck.scale.set(0.95, 1, 0.14);
  foreDeck.position.set(0, 0.38, 1.18);
  const ropeCoil = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.028, 6, 12), ropeHempMat);
  ropeCoil.rotation.x = Math.PI / 2;
  ropeCoil.position.set(-0.1, 0.43, 1.06);
  const cleat = new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.035, 0.04, 1, 0.01), brassMat);
  cleat.position.set(0.12, 0.43, 1.14);
  boat.add(foreDeck, ropeCoil, cleat);

  const aftBench = new THREE.Mesh(new RoundedBoxGeometry(1.06, 0.075, 0.4, 2, 0.02), oakTrim);
  aftBench.position.set(0, 0.28, -0.58);
  const cushion = new THREE.Mesh(new RoundedBoxGeometry(0.74, 0.06, 0.32, 2, 0.025), cushionRed);
  cushion.position.set(0, 0.33, -0.58);
  const midThwart = new THREE.Mesh(new RoundedBoxGeometry(1.14, 0.07, 0.3, 2, 0.02), oakTrim);
  midThwart.position.set(0, 0.27, 0.26);
  boat.add(aftBench, cushion, midThwart);

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.034, 0.72, 7), oakDark);
  mast.position.set(0, 0.72, 1.32);
  const bowArm = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.05, 0.24, 1, 0.01), oakDark);
  bowArm.position.set(0, 1.02, 1.42);
  const bowCap = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.07, 6), oakDark);
  bowCap.position.set(0, 0.94, 1.5);
  const bowBulbMat = new THREE.MeshStandardMaterial({
    color: '#FFF4C2',
    emissive: '#FFCC66',
    emissiveIntensity: 0.45,
    roughness: 0.25,
  });
  lampBulbsOut?.push(bowBulbMat);
  const bowBulb = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 8), bowBulbMat);
  bowBulb.position.set(0, 0.85, 1.5);
  const flag = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.3, 3), sailBlue);
  flag.rotation.z = -Math.PI / 2;
  flag.position.set(0.14, 0.96, 1.32);
  boat.add(mast, bowArm, bowCap, bowBulb, flag);

  let oarLPivot: THREE.Group | null = null;
  let oarRPivot: THREE.Group | null = null;
  [-1, 1].forEach((side) => {
    const oarlock = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.09, 6), brassMat);
    oarlock.position.set(side * 0.62, 0.44, 0.14);
    boat.add(oarlock);

    const pivot = new THREE.Group();
    pivot.position.set(side * 0.62, 0.47, 0.14);
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.024, 0.24, 6), oakDark);
    grip.rotation.z = side * 1.16;
    grip.position.set(-side * 0.14, 0.06, 0);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.026, 1.28, 7), oakTrim);
    shaft.rotation.z = side * 1.16;
    shaft.position.set(side * 0.44, -0.17, 0);
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.12, 7), oakDark);
    collar.rotation.z = side * 1.16;
    collar.position.set(side * 0.02, -0.01, 0);
    const blade = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.028, 0.48, 2, 0.01), oakHull);
    blade.rotation.z = side * 1.16;
    blade.position.set(side * 0.98, -0.41, 0);
    pivot.add(grip, collar, shaft, blade);
    boat.add(pivot);
    if (side < 0) oarLPivot = pivot;
    else oarRPivot = pivot;
  });

  const skipSet = new Set<THREE.Object3D>();
  if (withOarPivots) {
    if (oarLPivot) skipSet.add(oarLPivot);
    if (oarRPivot) skipSet.add(oarRPivot);
  }
  mergeStaticGroupByMaterial(boat, skipSet);
  return {boat, oarLPivot, oarRPivot};
}

/**
 * Thuyền Đạp Vịt (Duck Pedal Boat) — cute sculpted park duck/swan boat
 * with seated cockpit at z = -0.56 (matching player boat seating aftOff = -0.56),
 * arched neck/head/beak, twin feathered wings, handlebars, rotating foot pedals,
 * and spinning stern water paddlewheel.
 */
export function buildDuckPedalBoat(
  withAnim = false,
  lampBulbsOut?: THREE.MeshStandardMaterial[],
): DuckBoatBuild {
  const boat = new THREE.Group();

  const shellCreamMat = glossyClayMat('#FFF8EC', 0.28);
  const shellInnerMat = clayMat('#F4EBDC', 0.56);
  const wingCreamMat = glossyClayMat('#FFFDF7', 0.34);
  const aquaTrimMat = glossyClayMat('#4AB3D6', 0.32);
  const aquaDeepMat = clayMat('#2B7B99', 0.45);
  const coralCushionMat = clayMat('#F2786B', 0.66);
  const teakDeckMat = clayMat('#C68C53', 0.68);
  const orangeBillMat = glossyClayMat('#FF8D2E', 0.3);
  const cheekPinkMat = clayMat('#FF9BAE', 0.52);
  const eyeDarkMat = glossyClayMat('#201A17', 0.15);
  const eyeShineMat = glossyClayMat('#FFFFFF', 0.1);
  const chromeMat = clayMat('#DCE4EC', 0.22, 0.78);
  const pedalMat = clayMat('#3B4652', 0.55);
  const goldAccentMat = clayMat('#F2C249', 0.32, 0.5);

  // 1. Rounded Duck Hull Shell (double-sided smooth loft + bright aqua bumper collar)
  const STATIONS = 12;
  const PROW_Z = 1.44;
  const STERN_Z = -1.16;
  const hullHalfW = (t: number) => {
    if (t > 0.62) {
      const u = (1 - t) / 0.38;
      return 0.72 * Math.pow(Math.max(0.04, u), 0.55);
    }
    if (t < 0.2) {
      return THREE.MathUtils.lerp(0.56, 0.71, t / 0.2);
    }
    return 0.71 + 0.05 * Math.sin(((t - 0.2) / 0.42) * Math.PI);
  };
  const gunwaleY = (t: number) => 0.42 + (t > 0.72 ? (t - 0.72) * 0.28 : 0);

  const makeDuckHullGeo = (wallOffset: number, yOffset: number) => {
    const verts: number[] = [];
    const indices: number[] = [];
    const RING = 7;
    for (let i = 0; i <= STATIONS; i++) {
      const t = i / STATIONS;
      const z = THREE.MathUtils.lerp(STERN_Z, PROW_Z, t);
      const hw = Math.max(0.05, hullHalfW(t) + wallOffset);
      const topY = gunwaleY(t) + yOffset;
      const midY = 0.14 + yOffset;
      const keelY = 0.02 + yOffset;
      const pts: [number, number][] = [
        [-hw, topY],
        [-hw * 0.9, midY],
        [-hw * 0.48, keelY + 0.015],
        [0, keelY],
        [hw * 0.48, keelY + 0.015],
        [hw * 0.9, midY],
        [hw, topY],
      ];
      for (const [px, py] of pts) {
        verts.push(px, py, z);
      }
    }
    for (let i = 0; i < STATIONS; i++) {
      const rA = i * RING;
      const rB = (i + 1) * RING;
      for (let j = 0; j < RING - 1; j++) {
        const a = rA + j;
        const b = rA + j + 1;
        const c = rB + j;
        const d = rB + j + 1;
        indices.push(a, c, b, b, c, d);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  };

  const outerDuckMat = new THREE.MeshStandardMaterial({
    color: '#FFF8EC',
    roughness: 0.3,
    side: THREE.DoubleSide,
  });
  const innerDuckMat = new THREE.MeshStandardMaterial({
    color: '#F4EBDC',
    roughness: 0.56,
    side: THREE.DoubleSide,
  });
  boat.add(
    new THREE.Mesh(makeDuckHullGeo(0, 0), outerDuckMat),
    new THREE.Mesh(makeDuckHullGeo(-0.06, 0.04), innerDuckMat),
  );

  // Aqua waterline bumper trim along both rails
  [-1, 1].forEach((side) => {
    for (let i = 0; i < STATIONS; i++) {
      const t0 = i / STATIONS;
      const t1 = (i + 1) / STATIONS;
      const z0 = THREE.MathUtils.lerp(STERN_Z, PROW_Z, t0);
      const z1 = THREE.MathUtils.lerp(STERN_Z, PROW_Z, t1);
      const x0 = side * (hullHalfW(t0) + 0.02);
      const x1 = side * (hullHalfW(t1) + 0.02);
      const y0 = gunwaleY(t0) + 0.015;
      const y1 = gunwaleY(t1) + 0.015;
      const segLen = Math.hypot(x1 - x0, y1 - y0, z1 - z0);
      const rail = new THREE.Mesh(
        new RoundedBoxGeometry(0.085, 0.075, segLen + 0.04, 2, 0.025),
        aquaTrimMat,
      );
      rail.position.set((x0 + x1) * 0.5, (y0 + y1) * 0.5, (z0 + z1) * 0.5);
      rail.lookAt(x1, y1, z1);
      boat.add(rail);
    }
  });

  // Stern transom wall & non-slip wooden cockpit floor
  const transom = new THREE.Mesh(new RoundedBoxGeometry(1.12, 0.4, 0.1, 2, 0.04), shellCreamMat);
  transom.position.set(0, 0.24, STERN_Z + 0.03);
  boat.add(transom);

  const floorDeck = new THREE.Mesh(
    new RoundedBoxGeometry(0.96, 0.05, 1.72, 2, 0.02),
    teakDeckMat,
  );
  floorDeck.position.set(0, 0.095, -0.06);
  boat.add(floorDeck);

  // Rounded Foredeck Hood covering bow (z = 0.64 .. 1.38)
  const foreHood = new THREE.Mesh(new THREE.SphereGeometry(0.62, 14, 10), shellCreamMat);
  foreHood.scale.set(1.02, 0.34, 0.92);
  foreHood.position.set(0, 0.43, 0.9);
  const collarTrim = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.045, 8, 18), aquaTrimMat);
  collarTrim.rotation.x = Math.PI / 2 - 0.16;
  collarTrim.position.set(0, 0.57, 1.05);
  boat.add(foreHood, collarTrim);

  // 2. Sculpted Feathered Side Wings flanking left & right rails
  [-1, 1].forEach((side) => {
    const wingMain = new THREE.Mesh(new THREE.SphereGeometry(0.46, 12, 9), wingCreamMat);
    wingMain.scale.set(0.24, 0.58, 1.48);
    wingMain.position.set(side * 0.73, 0.36, -0.14);
    wingMain.rotation.y = side * -0.09;
    wingMain.rotation.z = side * 0.14;
    const wingTip = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.42, 7), aquaTrimMat);
    wingTip.rotation.x = -Math.PI / 2 + 0.15;
    wingTip.position.set(side * 0.72, 0.41, -0.82);
    boat.add(wingMain, wingTip);
  });

  // Curled Duck Tail rising cleanly above stern paddlewheel
  const tailBase = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.42, 8), shellCreamMat);
  tailBase.rotation.x = -0.85;
  tailBase.position.set(0, 0.52, -1.16);
  const tailCurl = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.24, 7), wingCreamMat);
  tailCurl.rotation.x = -0.35;
  tailCurl.position.set(0, 0.68, -1.25);
  boat.add(tailBase, tailCurl);

  // 3. Cute Sculpted Duck Neck, Head, Rosy Cheeks, Glossy Eyes, Orange Bill & Crown Crest
  const neckLow = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.21, 0.46, 12), shellCreamMat);
  neckLow.position.set(0, 0.74, 1.12);
  neckLow.rotation.x = 0.32;
  const neckTop = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.15, 0.36, 12), shellCreamMat);
  neckTop.position.set(0, 1.0, 1.24);
  neckTop.rotation.x = 0.08;

  // Aqua ribbon collar around neck
  const neckRibbon = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.032, 7, 16), aquaTrimMat);
  neckRibbon.rotation.x = Math.PI / 2 + 0.15;
  neckRibbon.position.set(0, 0.88, 1.18);
  const neckBow = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.08, 0.06, 2, 0.025), coralCushionMat);
  neckBow.position.set(0, 0.85, 1.33);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 12), shellCreamMat);
  head.scale.set(0.96, 0.94, 1.06);
  head.position.set(0, 1.22, 1.28);

  // Cute tuft on duck crown + tiny glowing golden crown crest
  const crownTuft = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.15, 7), shellCreamMat);
  crownTuft.rotation.x = -0.35;
  crownTuft.position.set(0, 1.46, 1.24);
  const crestMat = new THREE.MeshStandardMaterial({
    color: '#FFE993',
    emissive: '#FFBC38',
    emissiveIntensity: 0.45,
    roughness: 0.25,
  });
  lampBulbsOut?.push(crestMat);
  const bowCrest = new THREE.Mesh(new THREE.OctahedronGeometry(0.065, 0), crestMat);
  bowCrest.position.set(0, 1.46, 1.33);

  // Plump rounded orange duck bill
  const upperBill = new THREE.Mesh(new THREE.SphereGeometry(0.145, 12, 8), orangeBillMat);
  upperBill.scale.set(1.05, 0.42, 1.35);
  upperBill.position.set(0, 1.18, 1.53);
  const lowerBill = new THREE.Mesh(new THREE.SphereGeometry(0.115, 10, 8), orangeBillMat);
  lowerBill.scale.set(0.95, 0.34, 1.12);
  lowerBill.position.set(0, 1.12, 1.5);

  // Expressive glossy eyes & rosy cheeks
  [-1, 1].forEach((side) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 8), eyeDarkMat);
    eye.position.set(side * 0.14, 1.26, 1.46);
    const shine = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 6), eyeShineMat);
    shine.position.set(side * 0.148, 1.275, 1.495);
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), cheekPinkMat);
    cheek.scale.set(0.75, 0.55, 0.85);
    cheek.position.set(side * 0.185, 1.16, 1.41);
    boat.add(eye, shine, cheek);
  });

  boat.add(
    neckLow,
    neckTop,
    neckRibbon,
    neckBow,
    head,
    crownTuft,
    bowCrest,
    upperBill,
    lowerBill,
  );

  // 4. Twin Cushioned Rider Seats aligned at z = -0.56 (exact match with boatState seating!)
  const seatBase = new THREE.Mesh(
    new RoundedBoxGeometry(1.04, 0.22, 0.44, 2, 0.04),
    shellInnerMat,
  );
  seatBase.position.set(0, 0.21, -0.56);
  const seatBack = new THREE.Mesh(
    new RoundedBoxGeometry(1.0, 0.34, 0.11, 2, 0.04),
    aquaTrimMat,
  );
  seatBack.position.set(0, 0.43, -0.76);
  seatBack.rotation.x = -0.14;
  const cushionMain = new THREE.Mesh(
    new RoundedBoxGeometry(0.92, 0.075, 0.36, 2, 0.03),
    coralCushionMat,
  );
  cushionMain.position.set(0, 0.33, -0.56);
  const centerStripe = new THREE.Mesh(
    new RoundedBoxGeometry(0.06, 0.082, 0.37, 1, 0.01),
    shellCreamMat,
  );
  centerStripe.position.set(0, 0.332, -0.56);
  boat.add(seatBase, seatBack, cushionMain, centerStripe);

  // 5. Center Steering Console & Handlebars (z = -0.02)
  const helmPost = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.055, 0.54, 10), chromeMat);
  helmPost.position.set(0, 0.35, -0.02);
  helmPost.rotation.x = -0.18;
  const helmBar = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.52, 8), chromeMat);
  helmBar.rotation.z = Math.PI / 2;
  helmBar.position.set(0, 0.61, -0.07);
  [-0.24, 0.24].forEach((gx) => {
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.12, 8), aquaDeepMat);
    grip.rotation.z = Math.PI / 2;
    grip.position.set(gx, 0.61, -0.07);
    boat.add(grip);
  });
  const helmBadge = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 10), goldAccentMat);
  helmBadge.rotation.x = Math.PI / 2 - 0.18;
  helmBadge.position.set(0, 0.61, -0.045);
  boat.add(helmPost, helmBar, helmBadge);

  // 6. Foot Pedal Crank Assembly in Cockpit Footwell (z = -0.16, y = 0.22)
  const crankPivot = new THREE.Group();
  crankPivot.position.set(0, 0.22, -0.16);
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.44, 8), chromeMat);
  axle.rotation.z = Math.PI / 2;
  crankPivot.add(axle);

  let pedalLPivot: THREE.Group | null = null;
  let pedalRPivot: THREE.Group | null = null;
  [-1, 1].forEach((side) => {
    const arm = new THREE.Mesh(new RoundedBoxGeometry(0.03, 0.12, 0.035, 1, 0.01), chromeMat);
    arm.position.set(side * 0.2, side * 0.045, 0);
    crankPivot.add(arm);

    const pGroup = new THREE.Group();
    pGroup.position.set(side * 0.24, side * 0.095, 0);
    const pad = new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.032, 0.14, 1, 0.01), pedalMat);
    pGroup.add(pad);
    crankPivot.add(pGroup);
    if (side < 0) pedalLPivot = pGroup;
    else pedalRPivot = pGroup;
  });
  boat.add(crankPivot);

  // 7. Stern Paddlewheel Housing + Rotating 6-Blade Water Wheel (z = -1.25)
  const wheelGuard = new THREE.Mesh(
    new THREE.TorusGeometry(0.28, 0.045, 8, 16, Math.PI),
    aquaTrimMat,
  );
  wheelGuard.rotation.y = Math.PI / 2;
  wheelGuard.position.set(0, 0.26, -1.24);
  [-0.22, 0.22].forEach((sx) => {
    const strut = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.07, 0.24, 1, 0.015), aquaDeepMat);
    strut.position.set(sx, 0.22, -1.18);
    boat.add(strut);
  });
  boat.add(wheelGuard);

  const wheelPivot = new THREE.Group();
  wheelPivot.position.set(0, 0.22, -1.26);
  const wheelHub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.36, 10), chromeMat);
  wheelHub.rotation.z = Math.PI / 2;
  wheelPivot.add(wheelHub);
  for (let b = 0; b < 6; b++) {
    const ang = (b / 6) * Math.PI * 2;
    const spoke = new THREE.Mesh(new RoundedBoxGeometry(0.32, 0.025, 0.2, 1, 0.008), b % 2 === 0 ? coralCushionMat : aquaTrimMat);
    spoke.position.set(0, Math.sin(ang) * 0.16, Math.cos(ang) * 0.16);
    spoke.rotation.x = -ang;
    wheelPivot.add(spoke);
  }
  boat.add(wheelPivot);

  const skipSet = new Set<THREE.Object3D>();
  if (withAnim) {
    skipSet.add(wheelPivot);
    skipSet.add(crankPivot);
  }
  mergeStaticGroupByMaterial(boat, skipSet);

  return {
    boat,
    wheelPivot: withAnim ? wheelPivot : null,
    crankPivot: withAnim ? crankPivot : null,
    pedalLPivot: withAnim ? pedalLPivot : null,
    pedalRPivot: withAnim ? pedalRPivot : null,
  };
}

/**
 * Thuyền Thiên Nga Hồng (Pink Swan Princess Pedal Boat) — pastel pearl-pink swan hull,
 * golden crown atop curved head, feathered wings, plush bench at z = -0.56, and gold paddlewheel.
 */
export function buildSwanPrincessBoat(
  withAnim = false,
  lampBulbsOut?: THREE.MeshStandardMaterial[],
): BuiltBoatRig {
  const boat = new THREE.Group();

  const pearlPinkMat = glossyClayMat('#FFD6E5', 0.24);
  const softPinkMat = clayMat('#F9BFD3', 0.48);
  const wingRoseMat = glossyClayMat('#FFF2F7', 0.3);
  const goldMat = clayMat('#F2C249', 0.26, 0.65);
  const velvetMat = clayMat('#D9658B', 0.66);
  const deckWoodMat = clayMat('#D8B38E', 0.66);
  const beakMat = glossyClayMat('#FF9B54', 0.28);
  const eyeDarkMat = glossyClayMat('#201A17', 0.15);
  const chromeMat = clayMat('#DCE4EC', 0.22, 0.78);
  const pedalMat = clayMat('#4C4046', 0.55);

  const STATIONS = 12;
  const PROW_Z = 1.44;
  const STERN_Z = -1.16;
  const hullHalfW = (t: number) => {
    if (t > 0.62) {
      const u = (1 - t) / 0.38;
      return 0.72 * Math.pow(Math.max(0.04, u), 0.55);
    }
    if (t < 0.2) return THREE.MathUtils.lerp(0.56, 0.71, t / 0.2);
    return 0.71 + 0.05 * Math.sin(((t - 0.2) / 0.42) * Math.PI);
  };
  const gunwaleY = (t: number) => 0.42 + (t > 0.72 ? (t - 0.72) * 0.28 : 0);

  const makeSwanHullGeo = (wallOffset: number, yOffset: number) => {
    const verts: number[] = [];
    const indices: number[] = [];
    const RING = 7;
    for (let i = 0; i <= STATIONS; i++) {
      const t = i / STATIONS;
      const z = THREE.MathUtils.lerp(STERN_Z, PROW_Z, t);
      const hw = Math.max(0.05, hullHalfW(t) + wallOffset);
      const topY = gunwaleY(t) + yOffset;
      const midY = 0.14 + yOffset;
      const keelY = 0.02 + yOffset;
      const pts: [number, number][] = [
        [-hw, topY],
        [-hw * 0.9, midY],
        [-hw * 0.48, keelY + 0.015],
        [0, keelY],
        [hw * 0.48, keelY + 0.015],
        [hw * 0.9, midY],
        [hw, topY],
      ];
      for (const [px, py] of pts) verts.push(px, py, z);
    }
    for (let i = 0; i < STATIONS; i++) {
      const rA = i * RING;
      const rB = (i + 1) * RING;
      for (let j = 0; j < RING - 1; j++) {
        indices.push(rA + j, rB + j, rA + j + 1, rA + j + 1, rB + j, rB + j + 1);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  };

  const outerSwanMat = new THREE.MeshStandardMaterial({color: '#FFD6E5', roughness: 0.26, side: THREE.DoubleSide});
  const innerSwanMat = new THREE.MeshStandardMaterial({color: '#FBEAF1', roughness: 0.52, side: THREE.DoubleSide});
  boat.add(new THREE.Mesh(makeSwanHullGeo(0, 0), outerSwanMat), new THREE.Mesh(makeSwanHullGeo(-0.06, 0.04), innerSwanMat));

  // Gold gunwale bumper rails
  [-1, 1].forEach((side) => {
    for (let i = 0; i < STATIONS; i++) {
      const t0 = i / STATIONS;
      const t1 = (i + 1) / STATIONS;
      const z0 = THREE.MathUtils.lerp(STERN_Z, PROW_Z, t0);
      const z1 = THREE.MathUtils.lerp(STERN_Z, PROW_Z, t1);
      const x0 = side * (hullHalfW(t0) + 0.02);
      const x1 = side * (hullHalfW(t1) + 0.02);
      const y0 = gunwaleY(t0) + 0.015;
      const y1 = gunwaleY(t1) + 0.015;
      const segLen = Math.hypot(x1 - x0, y1 - y0, z1 - z0);
      const rail = new THREE.Mesh(new RoundedBoxGeometry(0.08, 0.07, segLen + 0.04, 2, 0.025), goldMat);
      rail.position.set((x0 + x1) * 0.5, (y0 + y1) * 0.5, (z0 + z1) * 0.5);
      rail.lookAt(x1, y1, z1);
      boat.add(rail);
    }
  });

  const transom = new THREE.Mesh(new RoundedBoxGeometry(1.12, 0.4, 0.1, 2, 0.04), softPinkMat);
  transom.position.set(0, 0.24, STERN_Z + 0.03);
  const floorDeck = new THREE.Mesh(new RoundedBoxGeometry(0.96, 0.05, 1.72, 2, 0.02), deckWoodMat);
  floorDeck.position.set(0, 0.095, -0.06);
  const foreHood = new THREE.Mesh(new THREE.SphereGeometry(0.62, 14, 10), pearlPinkMat);
  foreHood.scale.set(1.02, 0.34, 0.92);
  foreHood.position.set(0, 0.43, 0.9);
  const collarTrim = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.04, 8, 18), goldMat);
  collarTrim.rotation.x = Math.PI / 2 - 0.16;
  collarTrim.position.set(0, 0.57, 1.05);
  boat.add(transom, floorDeck, foreHood, collarTrim);

  // Sculpted wings & graceful swan neck + golden crown
  [-1, 1].forEach((side) => {
    const wing = new THREE.Mesh(new THREE.SphereGeometry(0.46, 12, 9), wingRoseMat);
    wing.scale.set(0.24, 0.62, 1.5);
    wing.position.set(side * 0.73, 0.38, -0.14);
    wing.rotation.y = side * -0.09;
    wing.rotation.z = side * 0.16;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.44, 7), softPinkMat);
    tip.rotation.x = -Math.PI / 2 + 0.16;
    tip.position.set(side * 0.72, 0.45, -0.84);
    boat.add(wing, tip);
  });

  const neckCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.56, 1.05),
    new THREE.Vector3(0, 0.88, 0.9),
    new THREE.Vector3(0, 1.24, 1.04),
    new THREE.Vector3(0, 1.44, 1.26),
  ]);
  boat.add(new THREE.Mesh(new THREE.TubeGeometry(neckCurve, 14, 0.115, 10, false), pearlPinkMat));

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.195, 14, 12), pearlPinkMat);
  head.scale.set(0.92, 0.96, 1.08);
  head.position.set(0, 1.48, 1.3);
  const bill = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.24, 8), beakMat);
  bill.rotation.x = Math.PI / 2 + 0.18;
  bill.position.set(0, 1.44, 1.52);
  [-1, 1].forEach((s) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), eyeDarkMat);
    eye.position.set(s * 0.14, 1.52, 1.41);
    boat.add(eye);
  });
  // Royal golden princess crown
  const crownBand = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.088, 0.075, 12), goldMat);
  crownBand.position.set(0, 1.67, 1.28);
  boat.add(head, bill, crownBand);
  for (let p = 0; p < 5; p++) {
    const ang = (p / 5) * Math.PI * 2;
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.06, 5), goldMat);
    spike.position.set(Math.cos(ang) * 0.08, 1.73, 1.28 + Math.sin(ang) * 0.08);
    boat.add(spike);
  }

  // Glowing crystal gem lantern on chest
  const gemMat = new THREE.MeshStandardMaterial({
    color: '#FFE5F0',
    emissive: '#FF7EB6',
    emissiveIntensity: 0.4,
    roughness: 0.18,
  });
  if (lampBulbsOut) lampBulbsOut.push(gemMat);
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.065, 0), gemMat);
  gem.position.set(0, 0.59, 1.18);
  boat.add(gem);

  // Twin seats at z = -0.56 matching player seating offset
  const seatBase = new THREE.Mesh(new RoundedBoxGeometry(1.04, 0.16, 0.42, 2, 0.04), pearlPinkMat);
  seatBase.position.set(0, 0.18, -0.56);
  const seatCushion = new THREE.Mesh(new RoundedBoxGeometry(0.96, 0.1, 0.36, 2, 0.03), velvetMat);
  seatCushion.position.set(0, 0.28, -0.56);
  const backrest = new THREE.Mesh(new RoundedBoxGeometry(0.98, 0.32, 0.12, 2, 0.035), velvetMat);
  backrest.position.set(0, 0.44, -0.76);
  backrest.rotation.x = -0.14;
  boat.add(seatBase, seatCushion, backrest);

  // Handlebars + pedal crank + stern gold paddlewheel
  const helmPost = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.04, 0.44, 8), chromeMat);
  helmPost.position.set(0, 0.38, -0.05);
  const helmBar = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.04, 0.045, 2, 0.015), goldMat);
  helmBar.position.set(0, 0.6, -0.04);
  boat.add(helmPost, helmBar);

  const crankPivot = new THREE.Group();
  crankPivot.position.set(0, 0.22, -0.16);
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.44, 8), chromeMat);
  axle.rotation.z = Math.PI / 2;
  crankPivot.add(axle);
  let pedalLPivot: THREE.Group | null = null;
  let pedalRPivot: THREE.Group | null = null;
  [-1, 1].forEach((side) => {
    const arm = new THREE.Mesh(new RoundedBoxGeometry(0.03, 0.12, 0.035, 1, 0.01), chromeMat);
    arm.position.set(side * 0.2, side * 0.045, 0);
    const pGroup = new THREE.Group();
    pGroup.position.set(side * 0.24, side * 0.095, 0);
    pGroup.add(new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.032, 0.14, 1, 0.01), pedalMat));
    crankPivot.add(arm, pGroup);
    if (side < 0) pedalLPivot = pGroup;
    else pedalRPivot = pGroup;
  });
  boat.add(crankPivot);

  const wheelGuard = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.042, 8, 16, Math.PI), goldMat);
  wheelGuard.rotation.y = Math.PI / 2;
  wheelGuard.position.set(0, 0.26, -1.24);
  boat.add(wheelGuard);

  const wheelPivot = new THREE.Group();
  wheelPivot.position.set(0, 0.22, -1.26);
  const wheelHub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.36, 10), chromeMat);
  wheelHub.rotation.z = Math.PI / 2;
  wheelPivot.add(wheelHub);
  for (let b = 0; b < 6; b++) {
    const ang = (b / 6) * Math.PI * 2;
    const spoke = new THREE.Mesh(new RoundedBoxGeometry(0.32, 0.025, 0.2, 1, 0.008), b % 2 === 0 ? velvetMat : goldMat);
    spoke.position.set(0, Math.sin(ang) * 0.16, Math.cos(ang) * 0.16);
    spoke.rotation.x = -ang;
    wheelPivot.add(spoke);
  }
  boat.add(wheelPivot);

  const skipSet = new Set<THREE.Object3D>();
  if (withAnim) {
    skipSet.add(wheelPivot);
    skipSet.add(crankPivot);
  }
  mergeStaticGroupByMaterial(boat, skipSet);
  return {
    boat,
    driveKind: 'pedal',
    oarLPivot: null,
    oarRPivot: null,
    wheelPivot: withAnim ? wheelPivot : null,
    crankPivot: withAnim ? crankPivot : null,
    pedalLPivot: withAnim ? pedalLPivot : null,
    pedalRPivot: withAnim ? pedalRPivot : null,
  };
}

/**
 * Thuyền Hải Tặc Mini (Mini Pirate Galleon) — dark mahogany hull with gold trim,
 * bow mast & Jolly Roger skull flag, mini brass cannons, aft helm & animated wooden oars.
 */
export function buildPirateGalleonBoat(
  withAnim = false,
  lampBulbsOut?: THREE.MeshStandardMaterial[],
): BuiltBoatRig {
  const boat = new THREE.Group();
  const darkWoodMat = new THREE.MeshStandardMaterial({color: '#63371C', roughness: 0.72, side: THREE.DoubleSide});
  const deckWoodMat = new THREE.MeshStandardMaterial({color: '#A56C3D', roughness: 0.76, side: THREE.DoubleSide});
  const railDarkMat = clayMat('#41220F', 0.74);
  const goldMat = clayMat('#E5B649', 0.3, 0.65);
  const blackMat = clayMat('#24262C', 0.68);
  const redVelvetMat = clayMat('#B83B35', 0.7);
  const ivoryMat = clayMat('#F8FAFC', 0.6);

  const STATIONS = 11;
  const PROW_Z = 1.54;
  const STERN_Z = -1.2;
  const hullHalfW = (t: number) => {
    if (t > 0.58) return 0.65 * Math.pow(Math.max(0.03, (1 - t) / 0.42), 0.6);
    if (t < 0.22) return THREE.MathUtils.lerp(0.5, 0.64, t / 0.22);
    return 0.64 + 0.03 * Math.sin(((t - 0.22) / 0.36) * Math.PI);
  };
  const sheerLift = (t: number) => Math.pow(Math.max(0, (t - 0.55) / 0.45), 1.65) * 0.24 + (t < 0.25 ? 0.14 : 0);

  const makeHullGeo = (wallOffset: number, yOffset: number) => {
    const verts: number[] = [];
    const indices: number[] = [];
    const RING = 7;
    for (let i = 0; i <= STATIONS; i++) {
      const t = i / STATIONS;
      const z = THREE.MathUtils.lerp(STERN_Z, PROW_Z, t);
      const hw = Math.max(0.03, hullHalfW(t) + wallOffset);
      const sheerY = 0.42 + sheerLift(t) + yOffset;
      const chineY = 0.12 + sheerLift(t) * 0.32 + yOffset;
      const keelY = 0.02 + sheerLift(t) * 0.25 + yOffset;
      const pts: [number, number][] = [
        [-hw, sheerY],
        [-hw * 0.86, chineY],
        [-hw * 0.44, keelY + 0.02],
        [0, keelY],
        [hw * 0.44, keelY + 0.02],
        [hw * 0.86, chineY],
        [hw, sheerY],
      ];
      for (const [px, py] of pts) verts.push(px, py, z);
    }
    for (let i = 0; i < STATIONS; i++) {
      const rA = i * RING;
      const rB = (i + 1) * RING;
      for (let j = 0; j < RING - 1; j++) {
        indices.push(rA + j, rB + j, rA + j + 1, rA + j + 1, rB + j, rB + j + 1);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  };

  boat.add(new THREE.Mesh(makeHullGeo(0, 0), darkWoodMat), new THREE.Mesh(makeHullGeo(-0.055, 0.04), deckWoodMat));

  // Gold stripe & thick dark gunwales
  [-1, 1].forEach((side) => {
    for (let i = 0; i < STATIONS; i++) {
      const t0 = i / STATIONS;
      const t1 = (i + 1) / STATIONS;
      const z0 = THREE.MathUtils.lerp(STERN_Z, PROW_Z, t0);
      const z1 = THREE.MathUtils.lerp(STERN_Z, PROW_Z, t1);
      const x0 = side * (hullHalfW(t0) + 0.01);
      const x1 = side * (hullHalfW(t1) + 0.01);
      const y0 = 0.43 + sheerLift(t0);
      const y1 = 0.43 + sheerLift(t1);
      const len = Math.hypot(x1 - x0, y1 - y0, z1 - z0);
      const gun = new THREE.Mesh(new RoundedBoxGeometry(0.085, 0.065, len + 0.03, 1, 0.015), goldMat);
      gun.position.set((x0 + x1) * 0.5, (y0 + y1) * 0.5, (z0 + z1) * 0.5);
      gun.lookAt(x1, y1, z1);
      boat.add(gun);
    }
    // 2 cute mini brass cannons protruding near bow sides
    [-0.1, 0.5].forEach((cz) => {
      const cannon = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.05, 0.24, 10), blackMat);
      cannon.rotation.z = side * (Math.PI / 2);
      cannon.position.set(side * 0.64, 0.34, cz);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.01, 6, 10), goldMat);
      ring.rotation.y = Math.PI / 2;
      ring.position.set(side * 0.74, 0.34, cz);
      boat.add(cannon, ring);
    });
  });

  // Floor grating, bowsprit & aft seat bench at z = -0.56
  const floorDeck = new THREE.Mesh(new RoundedBoxGeometry(0.84, 0.05, 1.9, 2, 0.015), deckWoodMat);
  floorDeck.position.set(0, 0.09, 0.04);
  const bowsprit = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.06, 0.78, 8), railDarkMat);
  bowsprit.rotation.x = Math.PI * 0.38;
  bowsprit.position.set(0, 0.74, 1.62);
  const starFigurehead = new THREE.Mesh(new THREE.OctahedronGeometry(0.075, 0), goldMat);
  starFigurehead.position.set(0, 0.89, 1.92);

  const seatBench = new THREE.Mesh(new RoundedBoxGeometry(1.06, 0.08, 0.34, 2, 0.02), railDarkMat);
  seatBench.position.set(0, 0.28, -0.56);
  const seatCushion = new THREE.Mesh(new RoundedBoxGeometry(0.92, 0.06, 0.28, 2, 0.02), redVelvetMat);
  seatCushion.position.set(0, 0.34, -0.56);

  // Stern lantern + miniature ship's wheel behind captain seat
  const helmPost = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.038, 0.42, 8), railDarkMat);
  helmPost.position.set(0, 0.4, -0.96);
  const helmRim = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.022, 7, 16), goldMat);
  helmRim.position.set(0, 0.62, -0.94);
  const sternLampMat = new THREE.MeshStandardMaterial({
    color: '#FFE79A',
    emissive: '#FFAA2B',
    emissiveIntensity: 0.45,
    roughness: 0.22,
  });
  if (lampBulbsOut) lampBulbsOut.push(sternLampMat);
  const lanternPole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.56, 6), goldMat);
  lanternPole.position.set(0.36, 0.68, -1.08);
  const lanternGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.052, 0.14, 6), sternLampMat);
  lanternGlass.position.set(0.36, 0.92, -1.08);

  // Bow mast & billowing Jolly Roger pennant (sailPivot)
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.048, 1.62, 8), railDarkMat);
  mast.position.set(0, 0.9, 0.65);
  const sailPivot = new THREE.Group();
  sailPivot.position.set(0, 1.48, 0.65);
  const flagCloth = new THREE.Mesh(new RoundedBoxGeometry(0.024, 0.38, 0.56, 1, 0.006), blackMat);
  flagCloth.position.set(0, 0, -0.29);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.072, 8, 8), ivoryMat);
  skull.scale.set(0.35, 1, 1);
  skull.position.set(0, 0.02, -0.29);
  sailPivot.add(flagCloth, skull);

  boat.add(floorDeck, bowsprit, starFigurehead, seatBench, seatCushion, helmPost, helmRim, lanternPole, lanternGlass, mast, sailPivot);

  // Animated wooden oars
  let oarLPivot: THREE.Group | null = null;
  let oarRPivot: THREE.Group | null = null;
  [-1, 1].forEach((side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.64, 0.49, 0.12);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.026, 1.45, 7), deckWoodMat);
    shaft.rotation.z = side * 1.16;
    shaft.position.set(side * 0.36, -0.14, 0);
    const blade = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.028, 0.46, 2, 0.01), railDarkMat);
    blade.rotation.z = side * 1.16;
    blade.position.set(side * 0.98, -0.4, 0);
    pivot.add(shaft, blade);
    boat.add(pivot);
    if (side < 0) oarLPivot = pivot;
    else oarRPivot = pivot;
  });

  const skipSet = new Set<THREE.Object3D>();
  if (withAnim) {
    if (oarLPivot) skipSet.add(oarLPivot);
    if (oarRPivot) skipSet.add(oarRPivot);
    skipSet.add(sailPivot);
  }
  mergeStaticGroupByMaterial(boat, skipSet);
  return {
    boat,
    driveKind: 'oars',
    oarLPivot: withAnim ? oarLPivot : null,
    oarRPivot: withAnim ? oarRPivot : null,
    wheelPivot: null,
    crankPivot: null,
    pedalLPivot: null,
    pedalRPivot: null,
    sailPivot: withAnim ? sailPivot : null,
  };
}

/**
 * Ca Nô Thể Thao Retro (Mint-Aqua & Cream Retro Speedboat) — sleek hull,
 * wrap-around windshield, chrome steering wheel, leather cockpit bench at z = -0.56,
 * and stern outboard motor with spinning brass propeller.
 */
export function buildSpeedboatRetro(
  withAnim = false,
  lampBulbsOut?: THREE.MeshStandardMaterial[],
): BuiltBoatRig {
  const boat = new THREE.Group();
  const mintHullMat = new THREE.MeshStandardMaterial({color: '#4CC2AB', roughness: 0.24, side: THREE.DoubleSide});
  const creamDeckMat = glossyClayMat('#FFF8EB', 0.24);
  const racingOrangeMat = glossyClayMat('#F2845C', 0.28);
  const leatherTanMat = clayMat('#D99B52', 0.56);
  const chromeMat = clayMat('#DCE4EC', 0.2, 0.82);
  const darkMetalMat = clayMat('#2E3740', 0.45, 0.45);
  const goldPropMat = clayMat('#E8B84B', 0.26, 0.72);
  const glassMat = new THREE.MeshStandardMaterial({
    color: '#AEE8F8',
    roughness: 0.1,
    transparent: true,
    opacity: 0.58,
    side: THREE.DoubleSide,
  });

  const STATIONS = 11;
  const PROW_Z = 1.56;
  const STERN_Z = -1.16;
  const hullHalfW = (t: number) => {
    if (t > 0.54) return 0.68 * Math.pow(Math.max(0.03, (1 - t) / 0.46), 0.68);
    return THREE.MathUtils.lerp(0.62, 0.68, t / 0.54);
  };
  const makeHullGeo = (wallOffset: number, yOffset: number) => {
    const verts: number[] = [];
    const indices: number[] = [];
    const RING = 7;
    for (let i = 0; i <= STATIONS; i++) {
      const t = i / STATIONS;
      const z = THREE.MathUtils.lerp(STERN_Z, PROW_Z, t);
      const hw = Math.max(0.03, hullHalfW(t) + wallOffset);
      const sheerY = 0.42 + (t > 0.6 ? (t - 0.6) * 0.24 : 0) + yOffset;
      const chineY = 0.12 + (t > 0.6 ? (t - 0.6) * 0.12 : 0) + yOffset;
      const keelY = 0.02 + yOffset;
      const pts: [number, number][] = [
        [-hw, sheerY],
        [-hw * 0.9, chineY],
        [-hw * 0.45, keelY + 0.02],
        [0, keelY],
        [hw * 0.45, keelY + 0.02],
        [hw * 0.9, chineY],
        [hw, sheerY],
      ];
      for (const [px, py] of pts) verts.push(px, py, z);
    }
    for (let i = 0; i < STATIONS; i++) {
      const rA = i * RING;
      const rB = (i + 1) * RING;
      for (let j = 0; j < RING - 1; j++) {
        indices.push(rA + j, rB + j, rA + j + 1, rA + j + 1, rB + j, rB + j + 1);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  };

  boat.add(new THREE.Mesh(makeHullGeo(0, 0), mintHullMat), new THREE.Mesh(makeHullGeo(-0.06, 0.05), creamDeckMat));

  // Cream deck foredeck & racing stripe
  const foreDeck = new THREE.Mesh(new RoundedBoxGeometry(1.06, 0.08, 1.05, 2, 0.04), creamDeckMat);
  foreDeck.position.set(0, 0.46, 0.84);
  const bowNose = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.64, 10), creamDeckMat);
  bowNose.rotation.x = Math.PI / 2;
  bowNose.scale.set(1.15, 1, 0.35);
  bowNose.position.set(0, 0.49, 1.32);
  const stripe = new THREE.Mesh(new RoundedBoxGeometry(0.18, 0.02, 1.18, 1, 0.005), racingOrangeMat);
  stripe.position.set(0, 0.51, 0.92);
  const transom = new THREE.Mesh(new RoundedBoxGeometry(1.2, 0.4, 0.1, 2, 0.03), creamDeckMat);
  transom.position.set(0, 0.25, STERN_Z + 0.04);
  const cockpitFloor = new THREE.Mesh(new RoundedBoxGeometry(1.02, 0.04, 1.38, 2, 0.015), clayMat('#B88450', 0.65));
  cockpitFloor.position.set(0, 0.1, -0.35);
  boat.add(foreDeck, bowNose, stripe, transom, cockpitFloor);

  // Wrap-around retro windshield & dashboard steering wheel
  const wsCenter = new THREE.Mesh(new RoundedBoxGeometry(0.96, 0.28, 0.03, 1, 0.01), glassMat);
  wsCenter.position.set(0, 0.62, 0.38);
  wsCenter.rotation.x = -0.45;
  [-0.5, 0.5].forEach((sx) => {
    const wingGlass = new THREE.Mesh(new RoundedBoxGeometry(0.03, 0.24, 0.42, 1, 0.01), glassMat);
    wingGlass.position.set(sx, 0.59, 0.19);
    wingGlass.rotation.z = sx * -0.18;
    boat.add(wingGlass);
  });
  const dash = new THREE.Mesh(new RoundedBoxGeometry(0.96, 0.18, 0.18, 2, 0.03), creamDeckMat);
  dash.position.set(0, 0.39, 0.24);
  const steeringCol = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.24, 8), chromeMat);
  steeringCol.rotation.x = 0.6;
  steeringCol.position.set(-0.22, 0.48, 0.1);
  const steeringWheel = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.018, 8, 18), leatherTanMat);
  steeringWheel.rotation.x = 0.6;
  steeringWheel.position.set(-0.22, 0.53, 0.01);
  boat.add(wsCenter, dash, steeringCol, steeringWheel);

  // Headlight badge on bow
  const bowLightMat = new THREE.MeshStandardMaterial({
    color: '#FFF5CC',
    emissive: '#FFE066',
    emissiveIntensity: 0.45,
    roughness: 0.2,
  });
  if (lampBulbsOut) lampBulbsOut.push(bowLightMat);
  const headlight = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), bowLightMat);
  headlight.position.set(0, 0.53, 1.48);
  boat.add(headlight);

  // Sporty ribbed leather cockpit bench at z = -0.56
  const seatBase = new THREE.Mesh(new RoundedBoxGeometry(1.02, 0.16, 0.42, 2, 0.04), creamDeckMat);
  seatBase.position.set(0, 0.19, -0.56);
  const seatCushion = new THREE.Mesh(new RoundedBoxGeometry(0.96, 0.11, 0.38, 2, 0.03), leatherTanMat);
  seatCushion.position.set(0, 0.29, -0.56);
  const seatBack = new THREE.Mesh(new RoundedBoxGeometry(0.98, 0.34, 0.12, 2, 0.035), leatherTanMat);
  seatBack.position.set(0, 0.46, -0.78);
  seatBack.rotation.x = -0.15;
  boat.add(seatBase, seatCushion, seatBack);

  // Outboard motor & spinning 3-blade brass propeller at stern (wheelPivot)
  const motorPod = new THREE.Mesh(new RoundedBoxGeometry(0.28, 0.34, 0.26, 2, 0.04), darkMetalMat);
  motorPod.position.set(0, 0.52, -1.24);
  const motorCap = new THREE.Mesh(new RoundedBoxGeometry(0.29, 0.1, 0.27, 2, 0.03), mintHullMat);
  motorCap.position.set(0, 0.67, -1.24);
  const shaft = new THREE.Mesh(new RoundedBoxGeometry(0.08, 0.38, 0.1, 1, 0.02), chromeMat);
  shaft.position.set(0, 0.24, -1.24);
  boat.add(motorPod, motorCap, shaft);

  const wheelPivot = new THREE.Group();
  wheelPivot.position.set(0, 0.12, -1.32);
  const propHub = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.1, 8), goldPropMat);
  propHub.rotation.x = -Math.PI / 2;
  wheelPivot.add(propHub);
  for (let b = 0; b < 3; b++) {
    const bladeGrp = new THREE.Group();
    bladeGrp.rotation.z = (b * Math.PI * 2) / 3;
    const blade = new THREE.Mesh(new RoundedBoxGeometry(0.055, 0.14, 0.018, 1, 0.005), goldPropMat);
    blade.position.y = 0.085;
    blade.rotation.y = 0.4;
    bladeGrp.add(blade);
    wheelPivot.add(bladeGrp);
  }
  boat.add(wheelPivot);

  const skipSet = new Set<THREE.Object3D>();
  if (withAnim) skipSet.add(wheelPivot);
  mergeStaticGroupByMaterial(boat, skipSet);
  return {
    boat,
    driveKind: 'motor',
    oarLPivot: null,
    oarRPivot: null,
    wheelPivot: withAnim ? wheelPivot : null,
    crankPivot: null,
    pedalLPivot: null,
    pedalRPivot: null,
  };
}

/**
 * Thuyền Hoa Sen Đêm Trăng (Pink Lotus Petal Sampan with Warm Paper Lantern) —
 * scalloped lotus-pink petals cradling a jade-wood deck, cushioned seat at z = -0.56,
 * bamboo arch holding glowing lantern, and animated wooden oars.
 */
export function buildLotusLanternBoat(
  withAnim = false,
  lampBulbsOut?: THREE.MeshStandardMaterial[],
): BuiltBoatRig {
  const boat = new THREE.Group();
  const petalPinkMat = new THREE.MeshStandardMaterial({color: '#F591B0', roughness: 0.42, side: THREE.DoubleSide});
  const petalLightMat = glossyClayMat('#FFC2D6', 0.38);
  const jadeMat = clayMat('#64AD88', 0.56);
  const deckWoodMat = clayMat('#C68D58', 0.7);
  const bambooMat = clayMat('#8E643B', 0.72);
  const goldMat = clayMat('#EBC258', 0.32, 0.5);

  const STATIONS = 11;
  const PROW_Z = 1.5;
  const STERN_Z = -1.2;
  const hullHalfW = (t: number) => Math.sin(Math.pow(t, 0.85) * Math.PI) * 0.66 + 0.08;
  const sheerLift = (t: number) => Math.pow(Math.abs(t - 0.45) * 1.8, 1.8) * 0.22;

  const makeHullGeo = (wallOffset: number, yOffset: number) => {
    const verts: number[] = [];
    const indices: number[] = [];
    const RING = 7;
    for (let i = 0; i <= STATIONS; i++) {
      const t = i / STATIONS;
      const z = THREE.MathUtils.lerp(STERN_Z, PROW_Z, t);
      const hw = Math.max(0.03, hullHalfW(t) + wallOffset);
      const sheerY = 0.38 + sheerLift(t) + yOffset;
      const chineY = 0.11 + sheerLift(t) * 0.35 + yOffset;
      const keelY = 0.02 + sheerLift(t) * 0.25 + yOffset;
      const pts: [number, number][] = [
        [-hw, sheerY],
        [-hw * 0.84, chineY],
        [-hw * 0.42, keelY + 0.02],
        [0, keelY],
        [hw * 0.42, keelY + 0.02],
        [hw * 0.84, chineY],
        [hw, sheerY],
      ];
      for (const [px, py] of pts) verts.push(px, py, z);
    }
    for (let i = 0; i < STATIONS; i++) {
      const rA = i * RING;
      const rB = (i + 1) * RING;
      for (let j = 0; j < RING - 1; j++) {
        indices.push(rA + j, rB + j, rA + j + 1, rA + j + 1, rB + j, rB + j + 1);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  };

  boat.add(new THREE.Mesh(makeHullGeo(0, 0), petalPinkMat), new THREE.Mesh(makeHullGeo(-0.055, 0.04), petalLightMat));

  // Decorative scalloped lotus petals hugging bow & stern
  [-0.95, -0.35, 0.35, 0.95].forEach((pz, idx) => {
    [-1, 1].forEach((side) => {
      const petal = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), idx % 2 === 0 ? petalLightMat : petalPinkMat);
      petal.scale.set(0.32, 0.72, 1.3);
      petal.position.set(side * (idx === 0 || idx === 3 ? 0.42 : 0.64), 0.3, pz);
      petal.rotation.z = side * 0.28;
      boat.add(petal);
    });
  });

  // Jade lotus-pad deck & cushioned seat bench at z = -0.56
  const deck = new THREE.Mesh(new RoundedBoxGeometry(0.84, 0.05, 1.66, 2, 0.02), deckWoodMat);
  deck.position.set(0, 0.09, 0.06);
  const bench = new THREE.Mesh(new RoundedBoxGeometry(0.98, 0.075, 0.32, 2, 0.02), deckWoodMat);
  bench.position.set(0, 0.26, -0.56);
  const cushion = new THREE.Mesh(new RoundedBoxGeometry(0.74, 0.06, 0.26, 2, 0.025), jadeMat);
  cushion.position.set(0, 0.32, -0.56);
  boat.add(deck, bench, cushion);

  // Curved bamboo bow post holding warm swinging lantern (sailPivot)
  const poleCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.38, 1.14),
    new THREE.Vector3(0, 0.96, 1.24),
    new THREE.Vector3(0, 1.24, 1.08),
    new THREE.Vector3(0, 1.18, 0.92),
  ]);
  boat.add(new THREE.Mesh(new THREE.TubeGeometry(poleCurve, 12, 0.026, 7, false), bambooMat));

  const lanternGlowMat = new THREE.MeshStandardMaterial({
    color: '#FFE79C',
    emissive: '#FF9E2C',
    emissiveIntensity: 0.65,
    roughness: 0.24,
  });
  if (lampBulbsOut) lampBulbsOut.push(lanternGlowMat);

  const sailPivot = new THREE.Group();
  sailPivot.position.set(0, 1.16, 0.92);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.14, 6), goldMat);
  cord.position.y = -0.07;
  const globe = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), lanternGlowMat);
  globe.scale.set(1, 1.18, 1);
  globe.position.y = -0.2;
  const capTop = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.035, 10), goldMat);
  capTop.position.y = -0.09;
  const capBot = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.05, 0.03, 10), goldMat);
  capBot.position.y = -0.32;
  sailPivot.add(cord, globe, capTop, capBot);
  boat.add(sailPivot);

  // Animated wooden oars
  let oarLPivot: THREE.Group | null = null;
  let oarRPivot: THREE.Group | null = null;
  [-1, 1].forEach((side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.63, 0.45, 0.14);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.024, 1.4, 7), bambooMat);
    shaft.rotation.z = side * 1.16;
    shaft.position.set(side * 0.36, -0.14, 0);
    const blade = new THREE.Mesh(new RoundedBoxGeometry(0.19, 0.026, 0.45, 2, 0.01), petalPinkMat);
    blade.rotation.z = side * 1.16;
    blade.position.set(side * 0.96, -0.4, 0);
    pivot.add(shaft, blade);
    boat.add(pivot);
    if (side < 0) oarLPivot = pivot;
    else oarRPivot = pivot;
  });

  const skipSet = new Set<THREE.Object3D>();
  if (withAnim) {
    if (oarLPivot) skipSet.add(oarLPivot);
    if (oarRPivot) skipSet.add(oarRPivot);
    skipSet.add(sailPivot);
  }
  mergeStaticGroupByMaterial(boat, skipSet);
  return {
    boat,
    driveKind: 'oars',
    oarLPivot: withAnim ? oarLPivot : null,
    oarRPivot: withAnim ? oarRPivot : null,
    wheelPivot: null,
    crankPivot: null,
    pedalLPivot: null,
    pedalRPivot: null,
    sailPivot: withAnim ? sailPivot : null,
  };
}

/**
 * Unified factory building any of the 6 boat skins with identical player seating (z = -0.56).
 */
export function buildBoatById(
  boatId: BoatId,
  withAnim = false,
  lampBulbsOut?: THREE.MeshStandardMaterial[],
): BuiltBoatRig {
  switch (boatId) {
    case 'duck_boat': {
      const built = buildDuckPedalBoat(withAnim, lampBulbsOut);
      return {
        boat: built.boat,
        driveKind: 'pedal',
        oarLPivot: null,
        oarRPivot: null,
        wheelPivot: built.wheelPivot,
        crankPivot: built.crankPivot,
        pedalLPivot: built.pedalLPivot,
        pedalRPivot: built.pedalRPivot,
      };
    }
    case 'swan_princess_boat':
      return buildSwanPrincessBoat(withAnim, lampBulbsOut);
    case 'pirate_galleon_boat':
      return buildPirateGalleonBoat(withAnim, lampBulbsOut);
    case 'speedboat_retro':
      return buildSpeedboatRetro(withAnim, lampBulbsOut);
    case 'lotus_lantern_boat':
      return buildLotusLanternBoat(withAnim, lampBulbsOut);
    case 'wooden_boat':
    default: {
      const built = buildWoodenRowboat(withAnim, lampBulbsOut);
      return {
        boat: built.boat,
        driveKind: 'oars',
        oarLPivot: built.oarLPivot,
        oarRPivot: built.oarRPivot,
        wheelPivot: null,
        crankPivot: null,
        pedalLPivot: null,
        pedalRPivot: null,
      };
    }
  }
}
