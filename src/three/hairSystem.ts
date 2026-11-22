import * as THREE from 'three';
import {
  AvatarConfig,
  HairBackStyle,
  HairFrontStyle,
  HeadItemStyle,
} from '../types/game';

// Shared sculpted chibi-sims head constants (centered at y = 0.30 inside headPivot)
export const HEAD_CY = 0.3;
export const HEAD_RX = 0.312;
export const HEAD_RY = 0.296;
export const HEAD_RZ = 0.288;

export type HatFitMode = 'none' | 'on_hair' | 'snug_cap';

export interface HatAttachmentPoints {
  crownTop: {position: THREE.Vector3; rotation: THREE.Euler; radius: number};
  crownTilted: {position: THREE.Vector3; rotation: THREE.Euler};
  foreheadRim: {position: THREE.Vector3; rotation: THREE.Euler};
  headbandArc: {center: THREE.Vector3; radius: number; tiltX: number};
  templeLeft: {position: THREE.Vector3; rotation: THREE.Euler; normal: THREE.Vector3};
  templeRight: {position: THREE.Vector3; rotation: THREE.Euler; normal: THREE.Vector3};
  backCrown: {position: THREE.Vector3; rotation: THREE.Euler};
  napeAnchor: {position: THREE.Vector3; rotation: THREE.Euler};
}

export interface CharacterHairAssembly {
  root: THREE.Group;
  hairBase: THREE.Group;
  frontHair: THREE.Group;
  sideHair: THREE.Group;
  backHair: THREE.Group;
  hairAccessories: THREE.Group;
  hatAttachmentPoints: THREE.Group;
  attachments: HatAttachmentPoints;
}

export const smoothstep01 = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

/**
 * Evaluates a point on the sculpted stylized chibi head surface + optional radial offset.
 */
export function headSurfacePoint(
  latDeg: number,
  lonDeg: number,
  offset = 0.0,
  includeNose = false,
): [number, number, number] {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  const absLon = Math.abs(lonDeg);
  const sinLat = Math.sin(lat);
  const cosLat = Math.cos(lat);

  const frontMask =
    Math.max(0, Math.cos(lon)) *
    smoothstep01(40, 92, latDeg) *
    (1 - smoothstep01(128, 168, latDeg));
  const frontFlatten = 1 - 0.062 * frontMask;

  const cheekFull =
    0.022 *
    Math.exp(-Math.pow((latDeg - 112) / 14, 2)) *
    Math.exp(-Math.pow((absLon - 46) / 21, 2));

  const jawTaper = 1 - 0.27 * smoothstep01(108, 168, latDeg);
  const chinDepthTaper = 1 - 0.14 * smoothstep01(126, 174, latDeg);
  const chinShapeY =
    -0.012 *
      Math.exp(-Math.pow((latDeg - 148) / 20, 2)) *
      Math.max(0, Math.cos(lon)) +
    0.016 * smoothstep01(134, 178, latDeg);

  const noseBump = includeNose
    ? 0.0065 *
      Math.exp(-Math.pow((latDeg - 106) / 4.8, 2)) *
      Math.exp(-Math.pow(absLon / 5.5, 2))
    : 0;

  const rx = (HEAD_RX + offset) * jawTaper + cheekFull;
  const ry = HEAD_RY + offset;
  const rz = (HEAD_RZ + offset) * frontFlatten * chinDepthTaper + noseBump;

  const x = rx * sinLat * Math.sin(lon);
  const y = HEAD_CY + ry * cosLat + chinShapeY;
  const z = rz * sinLat * Math.cos(lon);
  return [x, y, z];
}

function headOutwardNormal(latDeg: number, lonDeg: number): THREE.Vector3 {
  const p0 = headSurfacePoint(latDeg, lonDeg, 0);
  const p1 = headSurfacePoint(latDeg, lonDeg, 0.03);
  return new THREE.Vector3(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]).normalize();
}

/**
 * Soft matte polymer-clay / Nendoroid hair material (no harsh specular glare).
 */
export function createHairClayMaterial(color: string | number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.72,
    metalness: 0.0,
    envMapIntensity: 0.42,
  });
}

export function resolveHatFitMode(headItem?: HeadItemStyle): HatFitMode {
  if (headItem === 'cap' || headItem === 'beanie' || headItem === 'bucket_hat') {
    return 'snug_cap';
  }
  if (headItem === 'beret' || headItem === 'sunhat') {
    return 'on_hair';
  }
  return 'none';
}

function isMaleStyle(hairBack: HairBackStyle): boolean {
  return (
    hairBack === 'short_crop' ||
    hairBack === 'boy_1' ||
    hairBack === 'boy_2' ||
    hairBack === 'boy_3' ||
    hairBack === 'boy_4' ||
    hairBack === 'hero_wave'
  );
}

interface PetalDef {
  c: number; // center lon (deg)
  hw: number; // half width (deg)
  drop: number; // downward lat extent above browBaseLat
}

function getFrontPetals(
  hairBack: HairBackStyle,
  hairFront: HairFrontStyle,
): {browBaseLat: number; partLon: number | null; petals: PetalDef[]} {
  const male = isMaleStyle(hairBack);

  if (hairBack === 'boy_1') {
    return {
      browBaseLat: 63,
      partLon: 14,
      petals: [
        {c: -48, hw: 16, drop: 26},
        {c: -26, hw: 15, drop: 18},
        {c: -4, hw: 15, drop: 19},
        {c: 20, hw: 15, drop: 18},
        {c: 46, hw: 16, drop: 26},
      ],
    };
  }

  if (hairBack === 'boy_2' || (!male && hairFront === 'curtain')) {
    return {
      browBaseLat: 56,
      partLon: 0,
      petals: [
        {c: -52, hw: 17, drop: 34},
        {c: -32, hw: 15, drop: 27},
        {c: -14, hw: 12, drop: 18},
        {c: 14, hw: 12, drop: 18},
        {c: 32, hw: 15, drop: 27},
        {c: 52, hw: 17, drop: 34},
      ],
    };
  }

  if (hairBack === 'boy_3') {
    return {
      browBaseLat: 62,
      partLon: null,
      petals: [
        {c: -50, hw: 16, drop: 28},
        {c: -28, hw: 14, drop: 20},
        {c: -6, hw: 14, drop: 22},
        {c: 16, hw: 14, drop: 20},
        {c: 40, hw: 15, drop: 24},
        {c: 54, hw: 14, drop: 28},
      ],
    };
  }

  if (hairBack === 'boy_4') {
    return {
      browBaseLat: 62,
      partLon: null,
      petals: [
        {c: -52, hw: 15, drop: 32},
        {c: -33, hw: 13, drop: 20},
        {c: -15, hw: 12, drop: 19},
        {c: 4, hw: 12, drop: 22},
        {c: 22, hw: 13, drop: 19},
        {c: 44, hw: 15, drop: 29},
      ],
    };
  }

  if (hairBack === 'hero_wave') {
    return {
      browBaseLat: 54,
      partLon: 20,
      petals: [
        {c: -52, hw: 17, drop: 26},
        {c: -28, hw: 18, drop: 14},
        {c: -4, hw: 16, drop: 11},
        {c: 20, hw: 14, drop: 8},
        {c: 44, hw: 18, drop: 24},
      ],
    };
  }

  if (hairBack === 'short_crop') {
    return {
      browBaseLat: 64,
      partLon: null,
      petals: [
        {c: -48, hw: 16, drop: 24},
        {c: -22, hw: 15, drop: 12},
        {c: 4, hw: 15, drop: 11},
        {c: 28, hw: 15, drop: 13},
        {c: 50, hw: 16, drop: 25},
      ],
    };
  }

  if (hairFront === 'neat_fringe') {
    return {
      browBaseLat: 67,
      partLon: null,
      petals: [
        {c: -46, hw: 16, drop: 17},
        {c: -23, hw: 15, drop: 13},
        {c: 0, hw: 15, drop: 13},
        {c: 23, hw: 15, drop: 13},
        {c: 46, hw: 16, drop: 17},
      ],
    };
  }

  if (hairFront === 'side_sweep') {
    return {
      browBaseLat: 61,
      partLon: -20,
      petals: [
        {c: -48, hw: 16, drop: 25},
        {c: -26, hw: 14, drop: 16},
        {c: -4, hw: 16, drop: 18},
        {c: 20, hw: 16, drop: 21},
        {c: 46, hw: 17, drop: 27},
      ],
    };
  }

  // Default: sculpted chunky clay bangs matching Nendoroid/Animal-Crossing look (5 soft wide petals)
  return {
    browBaseLat: 65,
    partLon: null,
    petals: [
      {c: -48, hw: 18, drop: 24},
      {c: -24, hw: 16, drop: 18},
      {c: -2, hw: 15, drop: 19},
      {c: 21, hw: 16, drop: 18},
      {c: 47, hw: 18, drop: 24},
    ],
  };
}

/**
 * Evaluates smooth chunky clay petal bump & valley groove intensity at `lonDeg`.
 */
function evalFrontPetalShape(lonDeg: number, petals: PetalDef[]): {drop: number; groove: number} {
  let maxDrop = 0;
  let groove = 0;
  for (const p of petals) {
    const u = Math.abs(lonDeg - p.c) / p.hw;
    if (u < 1.35) {
      // Raised cosine-bell petal lobe: smooth full overlap, rounded tip, zero high spiky wedges!
      const bell = Math.exp(-Math.pow(u, 2.0) * 1.28);
      const val = p.drop * bell;
      if (val > maxDrop) maxDrop = val;
      // Soft valley groove between adjacent clay petals
      const edgeGroove = Math.exp(-Math.pow((u - 0.9) / 0.25, 2));
      groove = Math.max(groove, edgeGroove);
    }
  }
  return {drop: maxDrop, groove};
}

/**
 * 1. UNIFIED SCULPTED CLAY HOOD (`HairBase`):
 * Single continuous manifold geometry covering the crown, sculpted chunky bangs seamlessly on the forehead,
 * smooth arch over ears, and clean nape lobes on short/male/tied hairstyles.
 * Zero overlapping tube seams, zero frizzy strips, completely smooth polymer-clay feel!
 */
function createUnifiedClayCapGeometry(
  hairBack: HairBackStyle,
  hairFront: HairFrontStyle,
  hatMode: HatFitMode,
): {geom: THREE.BufferGeometry; crownOuterOffset: number} {
  const lonSegs = 128;
  const outerSegs = 26;
  const lipSegs = 4;
  const innerSegs = 4;

  const male = isMaleStyle(hairBack);
  const hasBackCurtain = hairBack === 'long_wave' || hairBack === 'bob_cut';
  const isSnugCap = hatMode === 'snug_cap';
  const isOnHairHat = hatMode === 'on_hair';

  const {browBaseLat, partLon, petals} = getFrontPetals(hairBack, hairFront);

  // Full plush Nendoroid volume across crown & brow (never crushed flat!)
  const baseCrownLoft =
    hairBack === 'boy_4' || hairBack === 'hero_wave'
      ? 0.088
      : hairBack === 'boy_3'
        ? 0.086
        : male
          ? 0.082
          : 0.08;

  const getPerimeterLat = (lonDeg: number): number => {
    const a = Math.abs(lonDeg);
    const {drop} = evalFrontPetalShape(lonDeg, petals);
    const frontHairline = browBaseLat + drop;

    // Gentle center/side part dip if applicable
    const partLift =
      partLon !== null ? 5.0 * Math.exp(-Math.pow((lonDeg - partLon) / 8.5, 2)) : 0;

    // Front region smoothly covers outer temples around lon ~54..72° down past brow corners
    const toSideZone = smoothstep01(50, 70, a);

    // Sideburn & Over-ear contour:
    // - Male styles form clean sideburn in front of ear (a~60°) then hug above/behind ear
    // - Long/Bob & tied styles dip smoothly at temple (a~62°) then arch snugly just above ear (lat ~78°)
    const sideburnLobe = male
      ? (hairBack === 'boy_2' ? 24 : 20) * Math.exp(-Math.pow((a - 60) / 9, 2))
      : 10 * Math.exp(-Math.pow((a - 62) / 9, 2));
    const earArchZone = Math.exp(-Math.pow((a - 82) / 11, 2));
    const overEarLat = hasBackCurtain ? 78 : male ? 79 : 80;

    let sideLat = 84 * (1 - earArchZone * 0.22) + overEarLat * (earArchZone * 0.22) + sideburnLobe;

    //Behind-ear & nape contour (wraps snugly right down behind the ear to the collar/neck!)
    const backNapeLat =
      hasBackCurtain
        ? 120
        : hairBack === 'boy_2'
          ? 135
          : hairBack === 'boy_4' || hairBack === 'boy_3' || hairBack === 'hero_wave'
            ? 133
            : hairBack === 'boy_1' || hairBack === 'short_crop'
              ? 131
              : 128;
    const napeScallop =
      !hasBackCurtain && male
        ? 1.6 * (0.5 + 0.5 * Math.cos(((a - 180) * Math.PI) / 34)) * smoothstep01(116, 175, a)
        : 0;

    const toBack = smoothstep01(86, 106, a);
    sideLat = sideLat + toBack * (backNapeLat + napeScallop - sideLat);

    return (frontHairline - partLift) * (1 - toSideZone) + sideLat * toSideZone;
  };

  const evalCapVertex = (lonDeg: number, s: number): [number, number, number] => {
    const a = Math.abs(lonDeg);
    const endLat = getPerimeterLat(lonDeg);
    const {groove: frontGroove} = evalFrontPetalShape(lonDeg, petals);

    const evalAlongSurface = (vSurf: number, wallBias: number, sealDeep = 0): [number, number, number] => {
      const latDeg = vSurf * endLat;

      // Keep upper/mid crown super plump & rounded (0..0.68), then taper perimeter smoothly down onto skin
      // so bang tips never dangle in mid-air and temples/ears/nape stay tightly hugged with zero gaps!
      const frontWeight = smoothstep01(72, 24, a);
      const sideWeight = smoothstep01(48, 72, a) * (1 - smoothstep01(86, 110, a));
      const napeWeight = smoothstep01(86, 116, a);

      const frontTipTaper = frontWeight * smoothstep01(0.66, 1.0, vSurf);
      const sideTipTaper = sideWeight * smoothstep01(0.56, 1.0, vSurf);
      const napeTipTaper = napeWeight * smoothstep01(0.54, 1.0, vSurf);

      const puffSwell = 1 + 0.14 * Math.sin(Math.pow(vSurf, 0.72) * Math.PI * 0.9);
      let crownShape =
        baseCrownLoft *
        puffSwell *
        (1 - 0.84 * frontTipTaper) *
        (1 - 0.9 * sideTipTaper) *
        (1 - 0.9 * napeTipTaper);

      // Gentle crown flattening ONLY right under beret/sunhat top seat (~top 28°) so hair stays plump everywhere visible!
      if (isOnHairHat) {
        const seatFade = 1 - smoothstep01(0.0, 0.38, vSurf);
        crownShape = THREE.MathUtils.lerp(crownShape, baseCrownLoft * 0.78, seatFade);
      }

      // Snug cap (baseball cap / beanie) tucks upper dome inside hat (~0.026m) and blooms below hat rim!
      if (isSnugCap) {
        const capArea = 1 - smoothstep01(0.52, 0.84, vSurf);
        crownShape = THREE.MathUtils.lerp(crownShape, 0.026, capArea * 0.92);
      }

      const partContour =
        partLon !== null
          ? (-0.007 * Math.exp(-Math.pow((lonDeg - partLon) / 8, 2)) +
              0.008 * Math.exp(-Math.pow((Math.abs(lonDeg - partLon) - 18) / 11, 2))) *
            smoothstep01(0.1, 0.45, vSurf) *
            (1 - 0.65 * smoothstep01(0.72, 1.0, vSurf)) *
            (isSnugCap ? 0.35 : 1.0)
          : 0;

      const frontMask = smoothstep01(68, 42, a);
      const bangValleyDip =
        -0.011 * frontGroove * frontMask * smoothstep01(0.42, 0.9, vSurf);

      const backMask = smoothstep01(90, 120, a);
      const backGrooves =
        !hasBackCurtain
          ? -0.006 *
            Math.pow(Math.abs(Math.sin(((lonDeg - 180) * Math.PI) / 36)), 1.6) *
            backMask *
            smoothstep01(0.42, 0.8, vSurf) *
            (1 - smoothstep01(0.76, 0.96, vSurf))
          : 0;

      // Plump clay lip at forehead bangs (0.014m), snug flush taper at sides & nape (0.007m)
      const rimThick = (0.014 * frontWeight + 0.007 * (1 - frontWeight)) * (1 - 0.3 * smoothstep01(0.84, 1.0, vSurf));
      const thickness = isSnugCap ? 0.01 : rimThick;

      // Seal inner rim deeply inward into head/neck geometry so no hollow underside ever leaks background!
      const rawOffset =
        crownShape + partContour + bangValleyDip + backGrooves + wallBias * thickness;
      const offset =
        sealDeep > 0
          ? THREE.MathUtils.lerp(Math.max(0.002, rawOffset), -0.026, sealDeep)
          : Math.max(0.006, rawOffset);
      return headSurfacePoint(latDeg, lonDeg, offset);
    };

    if (s <= 1.0) return evalAlongSurface(s, 0.5, 0);
    if (s <= 2.0) {
      const ang = (s - 1.0) * Math.PI;
      const [ox, oy, oz] = evalAlongSurface(1.0, 0.5, 0);
      const [ix, iy, iz] = evalAlongSurface(1.0, -0.5, 0);
      const cx = (ox + ix) * 0.5;
      const cy = (oy + iy) * 0.5;
      const cz = (oz + iz) * 0.5;
      const hx = (ox - ix) * 0.5;
      const hy = (oy - iy) * 0.5;
      const hz = (oz - iz) * 0.5;
      const lip = Math.hypot(hx, hz) * 0.65;
      return [
        cx + hx * Math.cos(ang),
        cy + hy * Math.cos(ang) - lip * Math.sin(ang),
        cz + hz * Math.cos(ang),
      ];
    }
    const inU = s - 2.0;
    return evalAlongSurface(1.0 - inU * 0.24, -0.5, inU);
  };

  const sValues: number[] = [];
  for (let i = 1; i <= outerSegs; i++) sValues.push(i / outerSegs);
  for (let i = 1; i <= lipSegs; i++) sValues.push(1.0 + i / lipSegs);
  for (let i = 1; i <= innerSegs; i++) sValues.push(2.0 + i / innerSegs);

  const positions: number[] = [];
  const indices: number[] = [];

  const [px0, py0, pz0] = evalCapVertex(0, 0);
  positions.push(px0, py0, pz0);

  for (const s of sValues) {
    for (let j = 0; j < lonSegs; j++) {
      const lonDeg = -180 + (j / lonSegs) * 360;
      const [x, y, z] = evalCapVertex(lonDeg, s);
      positions.push(x, y, z);
    }
  }

  for (let j = 0; j < lonSegs; j++) {
    const nextJ = (j + 1) % lonSegs;
    indices.push(0, 1 + j, 1 + nextJ);
  }

  const ringCount = sValues.length;
  for (let i = 0; i < ringCount - 1; i++) {
    const rowA = 1 + i * lonSegs;
    const rowB = 1 + (i + 1) * lonSegs;
    for (let j = 0; j < lonSegs; j++) {
      const nextJ = (j + 1) % lonSegs;
      const a = rowA + j;
      const b = rowB + j;
      const c = rowB + nextJ;
      const d = rowA + nextJ;
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();

  const crownOuterOffset = isSnugCap ? 0.038 : baseCrownLoft + 0.008;
  return {geom, crownOuterOffset};
}

/**
 * 2. UNIFIED SCULPTED BACK CLAY BELL (`long_wave` & `bob_cut`):
 * Matches the reference turnaround image cleanly:
 * - ONE continuous thick sculpted polymer-clay curtain wrapping seamlessly from behind left ear
 *   around the back to behind right ear (`lon +96° .. +180° / -180° .. -96°`),
 *   closed cleanly with rounded side-edges and a rounded C-curved scalloped bottom hem!
 * - Zero intersecting ribbon meshes or jagged hanging strips from side or rear angles!
 */
function createBackClayBellGeometry(
  style: 'long_wave' | 'bob_cut',
  crownOffset: number,
): THREE.BufferGeometry {
  const isLong = style === 'long_wave';
  const lonMin = 80; // Tucked smoothly right behind the ears to eliminate side air gap!
  const lonMax = 280; // Wraps across 180° back to -80° (= 280°)
  const uSegs = 56;
  const vSegs = 24;

  const hemBaseY = isLong ? -0.095 : 0.032;
  const bellRadius = isLong ? 0.364 : 0.354;
  const outerHalfThick = 0.026;

  const evalBellPoint = (
    uNorm: number, // 0..1 around back arc (84° -> 276°)
    v: number, // 0 (crown root) -> 1 (bottom hem)
    thicknessSign: number, // +1 outer clay surface, -1 solid inner neck-hugging core
  ): [number, number, number] => {
    const lonDeg = lonMin + uNorm * (lonMax - lonMin);
    const rad = (lonDeg * Math.PI) / 180;

    // Gentle rounded scallop & edge tuck toward behind-ear border (uNorm -> 0 or 1)
    const sideTaper = Math.sin(Math.min(1, Math.max(0, uNorm)) * Math.PI);
    const edgePinch = 0.25 + 0.75 * Math.pow(sideTaper, 0.36);

    // 5 wide pillowy clay scallops across back (matching the reference back view!)
    const lobeAngle = (uNorm - 0.5) * Math.PI * 5;
    const scallopWave = Math.cos(lobeAngle);
    const lobeCrease = Math.max(0, -scallopWave);

    const hemArch =
      (isLong ? -0.022 : -0.012) * sideTaper +
      0.014 * lobeCrease * smoothstep01(0.65, 1.0, v);

    // Top anchor merges inside HairBase dome; behind-ear side edges stay tucked closer to skull/jaw
    const sidePullIn = 1 - 0.14 * (1 - sideTaper);
    const rootPt = headSurfacePoint(26, lonDeg, crownOffset * 0.88);
    const midPt = headSurfacePoint(78, lonDeg, (crownOffset + 0.01) * sidePullIn);

    const midFlare = Math.sin(v * Math.PI);
    const bottomCurl = smoothstep01(0.62, 1.0, v);
    const targetR = bellRadius * sidePullIn * (1 + 0.055 * midFlare - 0.08 * bottomCurl);

    const p0 = new THREE.Vector3(...rootPt);
    const p1 = new THREE.Vector3(...midPt);
    const p2 = new THREE.Vector3(
      Math.sin(rad) * targetR * 1.03,
      HEAD_CY * 0.42 + hemBaseY * 0.32,
      Math.cos(rad) * targetR * 1.02 - 0.016,
    );
    const p3 = new THREE.Vector3(
      Math.sin(rad) * (targetR - (isLong ? 0.018 : 0.044)),
      hemBaseY + hemArch,
      Math.cos(rad) * (targetR - (isLong ? 0.014 : 0.038)) - 0.012,
    );

    const o = 1 - v;
    const center = new THREE.Vector3()
      .addScaledVector(p0, o * o * o)
      .addScaledVector(p1, 3 * o * o * v)
      .addScaledVector(p2, 3 * o * v * v)
      .addScaledVector(p3, v * v * v);

    const radialXZ = new THREE.Vector3(Math.sin(rad), 0.14 * (1 - v), Math.cos(rad)).normalize();

    const fluteDepth =
      -0.015 *
      Math.pow(lobeCrease, 1.35) *
      smoothstep01(0.28, 0.85, v) *
      (1 - 0.2 * smoothstep01(0.92, 1.0, v));

    if (thicknessSign >= 0) {
      const vThickEnv =
        (0.4 + 0.6 * smoothstep01(0.0, 0.25, v)) *
        (1 - 0.35 * smoothstep01(0.86, 1.0, v));
      center.addScaledVector(
        radialXZ,
        thicknessSign * outerHalfThick * edgePinch * vThickEnv + fluteDepth,
      );
    } else {
      // Inner wall hugs all the way into the neck/skull core (R ~ 0.19-0.24) so NO behind-ear gap can ever appear!
      const corePull = 0.125 + 0.035 * Math.sin(v * Math.PI);
      center.addScaledVector(radialXZ, -corePull * edgePinch);
    }
    return [center.x, center.y, center.z];
  };

  // Closed solid shell: outer surface (v=0..1) -> rounded bottom pillow lip -> inner skull/neck core (v=1..0)
  const outerSteps = vSegs;
  const lipSteps = 4;
  const innerSteps = vSegs;
  const loopPts: {v: number; sign: number}[] = [];

  for (let i = 0; i <= outerSteps; i++) {
    loopPts.push({v: i / outerSteps, sign: 1});
  }
  for (let i = 1; i < lipSteps; i++) {
    const ang = (i / lipSteps) * Math.PI;
    loopPts.push({v: 1.0 + 0.028 * Math.sin(ang), sign: Math.cos(ang)});
  }
  for (let i = innerSteps; i >= 0; i--) {
    loopPts.push({v: i / innerSteps, sign: -1});
  }

  const positions: number[] = [];
  const indices: number[] = [];
  const stride = uSegs + 1;

  for (let iv = 0; iv < loopPts.length; iv++) {
    const lp = loopPts[iv];
    const vClamped = Math.min(1, Math.max(0, lp.v));
    const hemDropExtra = lp.v > 1 ? -(lp.v - 1) * 0.42 : 0;
    for (let iu = 0; iu <= uSegs; iu++) {
      const uNorm = iu / uSegs;
      const pt = evalBellPoint(uNorm, vClamped, lp.sign);
      positions.push(pt[0], pt[1] + hemDropExtra, pt[2]);
    }
  }

  for (let iv = 0; iv < loopPts.length - 1; iv++) {
    for (let iu = 0; iu < uSegs; iu++) {
      const a = iv * stride + iu;
      const b = (iv + 1) * stride + iu;
      const c = (iv + 1) * stride + (iu + 1);
      const d = iv * stride + (iu + 1);
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const nLoop = loopPts.length;
  for (let i = 0; i < outerSteps; i++) {
    const opp = nLoop - 1 - i;
    const oppNext = nLoop - 2 - i;
    indices.push(i * stride, opp * stride, (i + 1) * stride);
    indices.push((i + 1) * stride, opp * stride, oppNext * stride);
    const r = uSegs;
    indices.push(i * stride + r, (i + 1) * stride + r, opp * stride + r);
    indices.push((i + 1) * stride + r, oppNext * stride + r, opp * stride + r);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

interface LockStep {
  lat: number;
  lon: number;
  offset: number;
}

function sampleHeadSteps(
  steps: LockStep[],
  samples = 16,
): [number, number, number][] {
  if (samples <= 1 || steps.length < 2) {
    return steps.map((s) => headSurfacePoint(s.lat, s.lon, s.offset));
  }
  const paramPts = steps.map((s) => new THREE.Vector3(s.lat, s.lon, s.offset));
  const curve = new THREE.CatmullRomCurve3(paramPts, false, 'centripetal', 0.5);
  const out: [number, number, number][] = [];
  for (let i = 0; i <= samples; i++) {
    const p = curve.getPointAt(i / samples);
    out.push(headSurfacePoint(p.x, p.y, p.z));
  }
  return out;
}

interface ClayLockOptions {
  width: number;
  depth: number;
  innerFlatten?: number;
  ridgeBoost?: number;
  edgePinch?: number;
  profile?: 'blade' | 'tuft' | 'quiff' | 'drape' | 'bob' | 'bell';
  outwardMode?: 'spherical' | 'drape';
  tubularSegs?: number;
  radialSegs?: number;
  roundTipScale?: number;
}

const _headCenter = new THREE.Vector3(0, HEAD_CY, 0);
const _fallbackUp = new THREE.Vector3(0, 1, 0);

/**
 * Clean plush clay lock geometry (reserved ONLY for cheek drapes, tied tails, quiff, and boy_4 ahoge/tips).
 */
function createClayLockGeometry(
  points: [number, number, number][],
  opts: ClayLockOptions,
): THREE.BufferGeometry {
  const {
    width,
    depth,
    innerFlatten = 0.42,
    ridgeBoost = 0.1,
    edgePinch = 0.34,
    profile = 'drape',
    outwardMode = 'spherical',
    tubularSegs = 18,
    radialSegs = 14,
    roundTipScale = 0.42,
  } = opts;

  const vecs = points.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
  const curve = new THREE.CatmullRomCurve3(vecs, false, 'centripetal', 0.5);

  const evalProfileScale = (t: number): {wScale: number; dScale: number} => {
    if (profile === 'blade' || profile === 'tuft') {
      const rootEase = smoothstep01(0.0, 0.24, t);
      const swell = 0.84 + 0.24 * Math.sin(Math.pow(t, 0.78) * Math.PI * 0.75);
      const u = smoothstep01(0.42, 1.0, t);
      const tip = 1 - (1 - roundTipScale) * Math.pow(u, 1.15);
      return {
        wScale: Math.max(0.14, (0.72 + 0.28 * rootEase) * swell * tip),
        dScale: Math.max(0.14, (0.5 + 0.5 * rootEase) * swell * tip),
      };
    }
    if (profile === 'quiff') {
      const rootEase = smoothstep01(0.0, 0.24, t);
      const swell = 0.9 + 0.25 * Math.sin(Math.pow(t, 0.8) * Math.PI);
      const tipEase = 1 - 0.65 * Math.pow(smoothstep01(0.55, 1.0, t), 1.25);
      return {
        wScale: Math.max(0.24, (0.7 + 0.3 * rootEase) * swell * tipEase),
        dScale: Math.max(0.2, (0.5 + 0.5 * rootEase) * swell * tipEase),
      };
    }
    if (profile === 'bell') {
      // Smooth plush teardrop ponytail/twin-tail bell shape
      const rootFlare = 0.42 + 0.72 * Math.sin(Math.pow(t, 0.65) * Math.PI * 0.88);
      const tipRound = 1 - 0.52 * Math.pow(smoothstep01(0.68, 1.0, t), 1.45);
      return {
        wScale: Math.max(0.28, rootFlare * tipRound),
        dScale: Math.max(0.28, rootFlare * tipRound),
      };
    }
    // 'drape' / 'bob': broad cheek curtain with smooth pillowy mid & gentle rounded tip
    const rootEase = smoothstep01(0.0, 0.24, t);
    const swell = 0.9 + 0.18 * Math.sin(smoothstep01(0.1, 0.85, t) * Math.PI);
    const tipTaper =
      1 - (1 - Math.max(0.32, roundTipScale)) * Math.pow(smoothstep01(0.66, 1.0, t), 1.35);
    return {
      wScale: Math.max(0.3, (0.74 + 0.26 * rootEase) * swell * tipTaper),
      dScale: Math.max(0.26, (0.56 + 0.44 * rootEase) * swell * tipTaper),
    };
  };

  const positions: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= tubularSegs; i++) {
    const t = i / tubularSegs;
    const center = curve.getPointAt(t);
    const tan = curve.getTangentAt(t).normalize();

    let radial: THREE.Vector3;
    if (outwardMode === 'drape') {
      const horiz = new THREE.Vector3(center.x, 0.05, center.z - 0.02);
      const sph = center.clone().sub(_headCenter);
      const mix = smoothstep01(0.32, 0.0, center.y);
      radial = sph.normalize().lerp(horiz.normalize(), mix).normalize();
    } else {
      radial = center.clone().sub(_headCenter);
      if (radial.lengthSq() < 1e-5) radial.set(0, 0, 1);
      radial.normalize();
    }

    const outDir = radial.clone().addScaledVector(tan, -radial.dot(tan));
    if (outDir.lengthSq() < 1e-4) {
      outDir.copy(_fallbackUp).addScaledVector(tan, -_fallbackUp.dot(tan));
      if (outDir.lengthSq() < 1e-4) outDir.set(0, 0, 1);
    }
    outDir.normalize();

    const sideDir = tan.clone().cross(outDir).normalize();
    const {wScale, dScale} = evalProfileScale(t);
    const endRound = i === 0 ? 0.68 : i === tubularSegs ? 0.56 : 1.0;
    const w = width * wScale * endRound;
    const h = depth * dScale * endRound;

    for (let j = 0; j < radialSegs; j++) {
      const theta = (j / radialSegs) * Math.PI * 2;
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);

      const sx = Math.sign(cos) * Math.pow(Math.abs(cos), 0.78);
      const absSin = Math.abs(sin);
      const edgeTaper = edgePinch + (1 - edgePinch) * Math.pow(absSin, 0.6);
      const sy = Math.sign(sin) * Math.pow(absSin, 0.76) * edgeTaper;
      const lateral = sx * w;
      const ridge = sy > 0 ? 1 + ridgeBoost * Math.pow(absSin, 1.5) : innerFlatten;
      const out = sy * h * ridge;

      positions.push(
        center.x + sideDir.x * lateral + outDir.x * out,
        center.y + sideDir.y * lateral + outDir.y * out,
        center.z + sideDir.z * lateral + outDir.z * out,
      );
    }
  }

  for (let i = 0; i < tubularSegs; i++) {
    const rowA = i * radialSegs;
    const rowB = (i + 1) * radialSegs;
    for (let j = 0; j < radialSegs; j++) {
      const nextJ = (j + 1) % radialSegs;
      const a = rowA + j;
      const b = rowB + j;
      const c = rowB + nextJ;
      const d = rowA + nextJ;
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const startCenterIdx = positions.length / 3;
  const p0 = curve.getPointAt(0);
  const t0 = curve.getTangentAt(0).normalize();
  positions.push(p0.x - t0.x * 0.005, p0.y - t0.y * 0.005, p0.z - t0.z * 0.005);
  for (let j = 0; j < radialSegs; j++) {
    indices.push(startCenterIdx, j, (j + 1) % radialSegs);
  }

  const endCenterIdx = positions.length / 3;
  const p1 = curve.getPointAt(1);
  const t1 = curve.getTangentAt(1).normalize();
  positions.push(p1.x + t1.x * 0.01, p1.y + t1.y * 0.01, p1.z + t1.z * 0.01);
  const lastRow = tubularSegs * radialSegs;
  for (let j = 0; j < radialSegs; j++) {
    indices.push(endCenterIdx, lastRow + ((j + 1) % radialSegs), lastRow + j);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

/**
 * Minimal sculpted front accents (ONLY for signature styles that raise volume above the smooth hood:
 * `short_crop` plush quiff, `boy_3` upper anime petals, `boy_4` left-side tips & ahoge).
 * Standard bangs are now sculpted DIRECTLY into `HairBase` for a 100% seamless clay silhouette!
 */
function buildFrontSignatureAccents(
  hairBack: HairBackStyle,
  hairMat: THREE.Material,
  hatMode: HatFitMode,
  crownOuterOffset: number,
): THREE.Group {
  const grp = new THREE.Group();
  grp.name = 'FrontHair';
  const isSnugCap = hatMode === 'snug_cap';

  if (hairBack === 'short_crop' && !isSnugCap) {
    const quiffWaves: {steps: LockStep[]; w: number; d: number}[] = [
      {
        steps: [
          {lat: 64, lon: -4, offset: 0.068},
          {lat: 36, lon: -14, offset: crownOuterOffset + 0.024},
          {lat: 16, lon: -26, offset: crownOuterOffset + 0.012},
        ],
        w: 0.095,
        d: 0.04,
      },
      {
        steps: [
          {lat: 64, lon: 18, offset: 0.066},
          {lat: 38, lon: 6, offset: crownOuterOffset + 0.02},
          {lat: 18, lon: -6, offset: crownOuterOffset + 0.01},
        ],
        w: 0.088,
        d: 0.036,
      },
    ];
    quiffWaves.forEach((q) =>
      grp.add(
        new THREE.Mesh(
          createClayLockGeometry(sampleHeadSteps(q.steps, 14), {
            width: q.w,
            depth: q.d,
            profile: 'quiff',
            roundTipScale: 0.28,
          }),
          hairMat,
        ),
      ),
    );
  } else if (hairBack === 'boy_3' && !isSnugCap) {
    const upperPetals: {steps: LockStep[]; w: number; d: number}[] = [
      {
        steps: [
          {lat: 12, lon: 14, offset: crownOuterOffset - 0.004},
          {lat: 30, lon: -10, offset: crownOuterOffset + 0.026},
          {lat: 54, lon: -28, offset: crownOuterOffset + 0.012},
        ],
        w: 0.092,
        d: 0.038,
      },
      {
        steps: [
          {lat: 12, lon: 28, offset: crownOuterOffset - 0.004},
          {lat: 28, lon: 60, offset: crownOuterOffset + 0.022},
          {lat: 50, lon: 84, offset: crownOuterOffset + 0.008},
        ],
        w: 0.088,
        d: 0.036,
      },
      {
        steps: [
          {lat: 12, lon: -28, offset: crownOuterOffset - 0.004},
          {lat: 28, lon: -62, offset: crownOuterOffset + 0.022},
          {lat: 50, lon: -86, offset: crownOuterOffset + 0.008},
        ],
        w: 0.088,
        d: 0.036,
      },
    ];
    upperPetals.forEach((p) =>
      grp.add(
        new THREE.Mesh(
          createClayLockGeometry(sampleHeadSteps(p.steps, 14), {
            width: p.w,
            depth: p.d,
            profile: 'tuft',
            roundTipScale: 0.16,
          }),
          hairMat,
        ),
      ),
    );
  } else if (hairBack === 'boy_4' && !isSnugCap) {
    // Two clean sculpted outward tips on viewer's left (-lon) + top cowlick ahoge
    const leftFlares: LockStep[][] = [
      [
        {lat: 30, lon: -50, offset: crownOuterOffset - 0.004},
        {lat: 56, lon: -68, offset: crownOuterOffset + 0.012},
        {lat: 70, lon: -78, offset: crownOuterOffset + 0.044},
      ],
      [
        {lat: 38, lon: -56, offset: crownOuterOffset - 0.004},
        {lat: 66, lon: -72, offset: crownOuterOffset + 0.006},
        {lat: 82, lon: -82, offset: crownOuterOffset + 0.036},
      ],
    ];
    leftFlares.forEach((steps) =>
      grp.add(
        new THREE.Mesh(
          createClayLockGeometry(sampleHeadSteps(steps, 12), {
            width: 0.068,
            depth: 0.03,
            profile: 'tuft',
            edgePinch: 0.22,
            roundTipScale: 0.1,
          }),
          hairMat,
        ),
      ),
    );

    if (hatMode === 'none') {
      grp.add(
        new THREE.Mesh(
          createClayLockGeometry(
            [
              [0.018, HEAD_CY + HEAD_RY + crownOuterOffset - 0.014, -0.012],
              [0.038, HEAD_CY + HEAD_RY + crownOuterOffset + 0.034, -0.018],
              [0.056, HEAD_CY + HEAD_RY + crownOuterOffset + 0.072, -0.024],
            ],
            {
              width: 0.022,
              depth: 0.014,
              innerFlatten: 0.65,
              profile: 'tuft',
              tubularSegs: 10,
              radialSegs: 8,
              roundTipScale: 0.08,
            },
          ),
          hairMat,
        ),
      );
    }
  } else if (hairBack === 'hero_wave' && !isSnugCap) {
    // Cohesive sculpted clay S-wave curl emerging smoothly from upper-left forehead hairline (Image 4)
    const heroCurlSteps: LockStep[] = [
      {lat: 38, lon: 6, offset: crownOuterOffset + 0.002},
      {lat: 50, lon: -6, offset: crownOuterOffset + 0.014},
      {lat: 63, lon: -16, offset: 0.046},
      {lat: 70, lon: -12, offset: 0.028},
      {lat: 68, lon: -1, offset: 0.012},
    ];
    grp.add(
      new THREE.Mesh(
        createClayLockGeometry(sampleHeadSteps(heroCurlSteps, 18), {
          width: 0.072,
          depth: 0.036,
          innerFlatten: 0.62,
          profile: 'quiff',
          edgePinch: 0.2,
          tubularSegs: 18,
          radialSegs: 12,
          roundTipScale: 0.14,
        }),
        hairMat,
      ),
    );
  }

  return grp;
}

/**
 * 3. SIDE CHEEK DRAPES:
 * Thick, pillowy, smoothly curved clay cheek curtains for female styles (`long_wave`, `bob_cut`,
 * and tied styles) framing the face in front of the ears with soft inward curl.
 */
function buildSideCheekDrapes(
  hairBack: HairBackStyle,
  hairMat: THREE.Material,
  crownOffset: number,
  hatMode: HatFitMode,
): THREE.Group {
  const grp = new THREE.Group();
  grp.name = 'SideHair';

  if (isMaleStyle(hairBack)) {
    // Male sideburns and over-ear shapes are smoothly sculpted directly into the unified HairBase!
    return grp;
  }

  const rootOff = crownOffset * 0.9;
  const sideOff = hatMode === 'snug_cap' ? 0.068 : crownOffset + 0.008;

  [-1, 1].forEach((side) => {
    if (hairBack === 'long_wave') {
      // Broad smooth clay cheek drape hugging cheek/jaw cleanly with zero air gap
      const pts: [number, number, number][] = [
        headSurfacePoint(26, side * 56, rootOff),
        headSurfacePoint(74, side * 66, sideOff * 0.56),
        [side * 0.304, 0.19, 0.068],
        [side * 0.286, 0.055, 0.068],
        [side * 0.242, -0.082, 0.072],
      ];
      grp.add(
        new THREE.Mesh(
          createClayLockGeometry(pts, {
            width: 0.098,
            depth: 0.048,
            innerFlatten: 0.72,
            edgePinch: 0.42,
            profile: 'drape',
            outwardMode: 'drape',
            tubularSegs: 20,
            radialSegs: 14,
            roundTipScale: 0.48,
          }),
          hairMat,
        ),
      );
      return;
    }

    if (hairBack === 'bob_cut') {
      const pts: [number, number, number][] = [
        headSurfacePoint(26, side * 56, rootOff),
        headSurfacePoint(74, side * 66, sideOff * 0.56),
        [side * 0.302, 0.19, 0.064],
        [side * 0.268, 0.098, 0.07],
        [side * 0.214, 0.046, 0.078],
      ];
      grp.add(
        new THREE.Mesh(
          createClayLockGeometry(pts, {
            width: 0.096,
            depth: 0.046,
            innerFlatten: 0.72,
            edgePinch: 0.42,
            profile: 'bob',
            outwardMode: 'drape',
            tubularSegs: 18,
            radialSegs: 14,
            roundTipScale: 0.46,
          }),
          hairMat,
        ),
      );
      return;
    }

    // Tied styles (ponytail, twin_tails, twin_buns): snug face-framing cheek curls
    const pts: [number, number, number][] = [
      headSurfacePoint(42, side * 58, hatMode === 'snug_cap' ? 0.04 : crownOffset * 0.78),
      headSurfacePoint(76, side * 62, sideOff * 0.45),
      [side * 0.278, 0.198, 0.092],
      [side * 0.228, 0.108, 0.106],
    ];
    grp.add(
      new THREE.Mesh(
        createClayLockGeometry(pts, {
          width: 0.068,
          depth: 0.034,
          innerFlatten: 0.62,
          edgePinch: 0.36,
          profile: 'blade',
          outwardMode: 'drape',
          tubularSegs: 14,
          radialSegs: 12,
          roundTipScale: 0.26,
        }),
        hairMat,
      ),
    );
  });

  return grp;
}

/**
 * 4. BACK HAIR:
 * - `long_wave` & `bob_cut`: Unified smooth sculpted polymer clay bell (zero frizz!).
 * - `ponytail` / `twin_tails` / `twin_buns`: Smooth plump multi-lobe clay bells & swirl buns.
 * - Male styles: Smooth nape already sculpted directly into `HairBase`!
 */
function buildBackClayStructures(
  hairBack: HairBackStyle,
  hairMat: THREE.Material,
  tieMat: THREE.Material,
  crownOffset: number,
  hatMode: HatFitMode,
  backHairGroup: THREE.Group,
  accGroup: THREE.Group,
): void {
  if (hairBack === 'long_wave' || hairBack === 'bob_cut') {
    backHairGroup.add(
      new THREE.Mesh(
        createBackClayBellGeometry(hairBack, crownOffset),
        hairMat,
      ),
    );
    return;
  }

  const isSnugCap = hatMode === 'snug_cap';

  if (hairBack === 'ponytail') {
    const rootLat = isSnugCap ? 88 : 74;
    const rootOff = isSnugCap ? 0.046 : crownOffset + 0.008;
    const rootPt = headSurfacePoint(rootLat, 180, rootOff);

    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.062, 16, 12), hairMat);
    knot.position.set(rootPt[0], rootPt[1], rootPt[2]);
    backHairGroup.add(knot);

    const tie = new THREE.Mesh(
      new THREE.TorusGeometry(0.066, 0.018, 10, 18),
      tieMat,
    );
    tie.position.set(rootPt[0], rootPt[1], rootPt[2]);
    tie.rotation.x = -0.28;
    accGroup.add(tie);

    const ryOffset = isSnugCap ? -0.055 : 0.0;
    // Main plump sculpted clay ponytail bell + subtle inner cushion
    backHairGroup.add(
      new THREE.Mesh(
        createClayLockGeometry(
          [
            rootPt,
            [0, 0.36 + ryOffset, -0.4],
            [0, 0.22 + ryOffset, -0.495],
            [0, 0.05 + ryOffset, -0.465],
            [0, -0.11 + ryOffset, -0.405],
          ],
          {
            width: 0.135,
            depth: 0.095,
            innerFlatten: 0.72,
            ridgeBoost: 0.14,
            edgePinch: 0.45,
            profile: 'bell',
            outwardMode: 'drape',
            tubularSegs: 20,
            radialSegs: 16,
          },
        ),
        hairMat,
      ),
    );
    return;
  }

  if (hairBack === 'twin_tails') {
    [-1, 1].forEach((side) => {
      const rootLat = isSnugCap ? 86 : 74;
      const rootPt = headSurfacePoint(rootLat, side * 116, isSnugCap ? 0.044 : crownOffset + 0.006);
      const radialOut = new THREE.Vector3(
        rootPt[0],
        rootPt[1] - HEAD_CY,
        rootPt[2],
      ).normalize();

      const knot = new THREE.Mesh(new THREE.SphereGeometry(0.058, 14, 12), hairMat);
      knot.position.set(rootPt[0], rootPt[1], rootPt[2]);
      backHairGroup.add(knot);

      const tie = new THREE.Mesh(
        new THREE.TorusGeometry(0.062, 0.018, 10, 18),
        tieMat,
      );
      tie.position.set(rootPt[0], rootPt[1], rootPt[2]);
      tie.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), radialOut);
      accGroup.add(tie);

      const yAdj = isSnugCap ? -0.05 : 0;
      backHairGroup.add(
        new THREE.Mesh(
          createClayLockGeometry(
            [
              rootPt,
              [side * 0.435, 0.26 + yAdj, -0.155],
              [side * 0.485, 0.07 + yAdj, -0.175],
              [side * 0.45, -0.11 + yAdj, -0.145],
            ],
            {
              width: 0.116,
              depth: 0.086,
              innerFlatten: 0.74,
              ridgeBoost: 0.12,
              edgePinch: 0.44,
              profile: 'bell',
              outwardMode: 'drape',
              tubularSegs: 18,
              radialSegs: 16,
            },
          ),
          hairMat,
        ),
      );
    });
    return;
  }

  if (hairBack === 'twin_buns') {
    const bunLat = isSnugCap ? 74 : 50;
    const bunLon = isSnugCap ? 114 : 102;
    const bunScale = isSnugCap ? 0.88 : 1.06;

    [-1, 1].forEach((side) => {
      const pBun = headSurfacePoint(bunLat, side * bunLon, isSnugCap ? 0.046 : crownOffset * 0.84);
      const radialDir = new THREE.Vector3(
        pBun[0],
        pBun[1] - HEAD_CY,
        pBun[2],
      ).normalize();

      const bunBase = new THREE.Mesh(
        new THREE.SphereGeometry(0.116 * bunScale, 20, 16),
        hairMat,
      );
      bunBase.scale.set(1.06, 0.88, 0.98);
      bunBase.position.set(pBun[0], pBun[1], pBun[2]);

      const swirlRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.068 * bunScale, 0.036 * bunScale, 10, 18),
        hairMat,
      );
      swirlRing.position.set(
        pBun[0] + radialDir.x * 0.044 * bunScale,
        pBun[1] + radialDir.y * 0.044 * bunScale,
        pBun[2] + radialDir.z * 0.044 * bunScale,
      );
      swirlRing.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), radialDir);

      const tie = new THREE.Mesh(
        new THREE.TorusGeometry(0.092 * bunScale, 0.018, 10, 18),
        tieMat,
      );
      tie.position.set(
        pBun[0] - radialDir.x * 0.016,
        pBun[1] - radialDir.y * 0.016,
        pBun[2] - radialDir.z * 0.016,
      );
      tie.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), radialDir);

      backHairGroup.add(bunBase, swirlRing);
      accGroup.add(tie);
    });
  }
}

/**
 * Standardized entry point building all 6 modular sculpted clay hair components:
 * HairBase, FrontHair, SideHair, BackHair, HairAccessories, and HatAttachmentPoints.
 */
export function buildCharacterHair(
  config: AvatarConfig,
  hairMat: THREE.Material,
  tieMat: THREE.Material,
): CharacterHairAssembly {
  const hatMode = resolveHatFitMode(config.headItem);

  const root = new THREE.Group();
  root.name = 'CharacterHair';

  const hairBase = new THREE.Group();
  hairBase.name = 'HairBase';
  const {geom: baseGeom, crownOuterOffset} = createUnifiedClayCapGeometry(
    config.hairBack,
    config.hairFront,
    hatMode,
  );
  hairBase.add(new THREE.Mesh(baseGeom, hairMat));

  const frontHair = buildFrontSignatureAccents(
    config.hairBack,
    hairMat,
    hatMode,
    crownOuterOffset,
  );
  const sideHair = buildSideCheekDrapes(
    config.hairBack,
    hairMat,
    crownOuterOffset,
    hatMode,
  );

  const backHair = new THREE.Group();
  backHair.name = 'BackHair';
  const hairAccessories = new THREE.Group();
  hairAccessories.name = 'HairAccessories';

  buildBackClayStructures(
    config.hairBack,
    hairMat,
    tieMat,
    crownOuterOffset,
    hatMode,
    backHair,
    hairAccessories,
  );

  // Standardized Attachment Points hugging the outer clay silhouette cleanly
  const isSnugCap = hatMode === 'snug_cap';
  const crownY = HEAD_CY + HEAD_RY + crownOuterOffset;
  const sideSurf = headSurfacePoint(68, 90, isSnugCap ? 0.036 : crownOuterOffset * 0.56);
  const headbandRadius = Math.min(0.382, Math.max(0.362, Math.abs(sideSurf[0]) + 0.008));

  const templeL = headSurfacePoint(64, -50, isSnugCap ? 0.048 : crownOuterOffset * 0.68 + 0.01);
  const templeR = headSurfacePoint(64, 50, isSnugCap ? 0.048 : crownOuterOffset * 0.68 + 0.01);
  const foreheadPt = headSurfacePoint(54, 0, isSnugCap ? 0.052 : crownOuterOffset * 0.82);
  const backPt = headSurfacePoint(52, 180, crownOuterOffset * 0.9);
  const napePt = headSurfacePoint(120, 180, 0.022);

  const attachments: HatAttachmentPoints = {
    crownTop: {
      position: new THREE.Vector3(0, crownY - 0.018, -0.012),
      rotation: new THREE.Euler(-0.06, 0, 0),
      radius: headbandRadius * 0.84,
    },
    crownTilted: {
      position: new THREE.Vector3(0.036, crownY - 0.012, -0.014),
      rotation: new THREE.Euler(-0.08, 0, -0.22),
    },
    foreheadRim: {
      position: new THREE.Vector3(foreheadPt[0], foreheadPt[1], foreheadPt[2]),
      rotation: new THREE.Euler(-0.14, 0, 0),
    },
    headbandArc: {
      center: new THREE.Vector3(0, HEAD_CY + 0.004, 0.014),
      radius: headbandRadius,
      tiltX: -0.16,
    },
    templeLeft: {
      position: new THREE.Vector3(templeL[0], templeL[1], templeL[2]),
      rotation: new THREE.Euler(0.12, -0.78, 0.22),
      normal: headOutwardNormal(68, -50),
    },
    templeRight: {
      position: new THREE.Vector3(templeR[0], templeR[1], templeR[2]),
      rotation: new THREE.Euler(0.12, 0.78, -0.22),
      normal: headOutwardNormal(68, 50),
    },
    backCrown: {
      position: new THREE.Vector3(backPt[0], backPt[1], backPt[2]),
      rotation: new THREE.Euler(-0.35, Math.PI, 0),
    },
    napeAnchor: {
      position: new THREE.Vector3(napePt[0], napePt[1], napePt[2]),
      rotation: new THREE.Euler(0.18, Math.PI, 0),
    },
  };

  const hatAttachmentPoints = new THREE.Group();
  hatAttachmentPoints.name = 'HatAttachmentPoints';
  (
    [
      ['crownTop', attachments.crownTop.position, attachments.crownTop.rotation],
      ['crownTilted', attachments.crownTilted.position, attachments.crownTilted.rotation],
      ['foreheadRim', attachments.foreheadRim.position, attachments.foreheadRim.rotation],
      ['templeLeft', attachments.templeLeft.position, attachments.templeLeft.rotation],
      ['templeRight', attachments.templeRight.position, attachments.templeRight.rotation],
      ['backCrown', attachments.backCrown.position, attachments.backCrown.rotation],
      ['napeAnchor', attachments.napeAnchor.position, attachments.napeAnchor.rotation],
    ] as const
  ).forEach(([name, pos, rot]) => {
    const node = new THREE.Object3D();
    node.name = `Socket_${name}`;
    node.position.copy(pos);
    node.rotation.copy(rot);
    hatAttachmentPoints.add(node);
  });

  root.add(
    hairBase,
    frontHair,
    sideHair,
    backHair,
    hairAccessories,
    hatAttachmentPoints,
  );

  return {
    root,
    hairBase,
    frontHair,
    sideHair,
    backHair,
    hairAccessories,
    hatAttachmentPoints,
    attachments,
  };
}
