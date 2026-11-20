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

export type HatFitMode = 'none' | 'crown_cap' | 'headband';

export interface HatAttachmentPoints {
  crownTop: {position: THREE.Vector3; rotation: THREE.Euler; radius: number};
  crownTilted: {position: THREE.Vector3; rotation: THREE.Euler};
  headbandArc: {center: THREE.Vector3; radius: number; tiltX: number};
  templeLeft: {position: THREE.Vector3; rotation: THREE.Euler};
  templeRight: {position: THREE.Vector3; rotation: THREE.Euler};
  backCrown: {position: THREE.Vector3; rotation: THREE.Euler};
}

export interface CharacterHairAssembly {
  root: THREE.Group;
  hairBase: THREE.Group;
  frontHair: THREE.Group;
  sideHair: THREE.Group;
  backHair: THREE.Group;
  hairAccessories: THREE.Group;
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
    smoothstep01(42, 95, latDeg) *
    (1 - smoothstep01(130, 168, latDeg));
  const frontFlatten = 1 - 0.055 * frontMask;

  const cheekFull =
    0.014 *
    Math.exp(-Math.pow((latDeg - 114) / 18, 2)) *
    Math.exp(-Math.pow((absLon - 48) / 22, 2));
  const jawTaper = 1 - 0.1 * smoothstep01(114, 165, latDeg);
  const chinLift = 0.018 * smoothstep01(122, 175, latDeg);

  const noseBump = includeNose
    ? 0.018 *
      Math.exp(-Math.pow((latDeg - 103) / 6.5, 2)) *
      Math.exp(-Math.pow(absLon / 7.5, 2))
    : 0;

  const rx = (HEAD_RX + offset) * jawTaper + cheekFull;
  const ry = HEAD_RY + offset;
  const rz = (HEAD_RZ + offset) * frontFlatten + noseBump;

  const x = rx * sinLat * Math.sin(lon);
  const y = HEAD_CY + ry * cosLat + chinLift;
  const z = rz * sinLat * Math.cos(lon);
  return [x, y, z];
}

/**
 * Smooth matte-satin polymer-clay hair material (soft lighting rolloff, zero plastic shine).
 */
export function createHairClayMaterial(color: string | number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.64,
    metalness: 0.0,
  });
}

export function resolveHatFitMode(headItem?: HeadItemStyle): HatFitMode {
  if (headItem === 'beret' || headItem === 'sunhat') return 'crown_cap';
  if (
    headItem === 'cat_ears' ||
    headItem === 'flower_crown' ||
    headItem === 'ribbon_bow'
  ) {
    return 'headband';
  }
  return 'none';
}

function isMaleShortStyle(hairBack: HairBackStyle): boolean {
  return (
    hairBack === 'short_crop' ||
    hairBack === 'boy_1' ||
    hairBack === 'boy_2' ||
    hairBack === 'boy_3'
  );
}

interface LockStep {
  lat: number;
  lon: number;
  offset: number;
}

function sampleHeadSteps(
  steps: LockStep[],
  samples = 14,
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
  profile?: 'bangs' | 'lock' | 'wave' | 'bob';
  outwardMode?: 'spherical' | 'drape';
  tipLift?: number;
  tubularSegs?: number;
  radialSegs?: number;
}

/**
 * Builds a plush, cushioned polymer clay hair lock with D-shaped inner fit,
 * soft rounded tip, and verified outward triangle winding.
 */
function createClayLockGeometry(
  points: [number, number, number][],
  opts: ClayLockOptions,
): THREE.BufferGeometry {
  const {
    width,
    depth,
    innerFlatten = 0.24,
    ridgeBoost = 0.1,
    profile = 'lock',
    outwardMode = 'spherical',
    tipLift = 0.0,
    tubularSegs = 16,
    radialSegs = 10,
  } = opts;

  const vecs = points.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
  const curve = new THREE.CatmullRomCurve3(vecs, false, 'centripetal', 0.5);
  const headCenter = new THREE.Vector3(0, HEAD_CY, 0);
  const fallbackUp = new THREE.Vector3(0, 1, 0);

  const evalProfileScale = (t: number): {wScale: number; dScale: number} => {
    if (profile === 'bangs') {
      const rootEase = smoothstep01(0.0, 0.22, t);
      const tipEase = 1 - 0.62 * Math.pow(smoothstep01(0.58, 1.0, t), 1.8);
      return {
        wScale: Math.max(0.28, (0.55 + 0.45 * rootEase) * tipEase),
        dScale: Math.max(0.18, (0.38 + 0.62 * rootEase) * tipEase),
      };
    }
    if (profile === 'wave') {
      const rootEase = smoothstep01(0.0, 0.2, t);
      const swell = 0.8 + 0.28 * Math.sin(smoothstep01(0.08, 0.85, t) * Math.PI);
      const tipTaper = 1 - 0.58 * Math.pow(smoothstep01(0.76, 1.0, t), 1.65);
      return {
        wScale: Math.max(0.3, (0.58 + 0.42 * rootEase) * swell * tipTaper),
        dScale: Math.max(0.24, (0.48 + 0.52 * rootEase) * swell * tipTaper),
      };
    }
    if (profile === 'bob') {
      const rootEase = smoothstep01(0.0, 0.2, t);
      const swell = 0.85 + 0.22 * Math.sin(t * Math.PI);
      const tipTaper = 1 - 0.5 * Math.pow(smoothstep01(0.75, 1.0, t), 1.6);
      return {
        wScale: Math.max(0.32, (0.55 + 0.45 * rootEase) * swell * tipTaper),
        dScale: Math.max(0.22, (0.45 + 0.55 * rootEase) * swell * tipTaper),
      };
    }
    const belly = Math.pow(Math.sin(t * Math.PI), 0.48);
    const skew = 0.78 + 0.22 * (1 - t);
    return {
      wScale: Math.max(0.16, belly * skew),
      dScale: Math.max(0.16, belly * skew),
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
      const horiz = new THREE.Vector3(center.x, 0.04, center.z - 0.02);
      const sph = center.clone().sub(headCenter);
      const mix = smoothstep01(0.28, 0.02, center.y);
      radial = sph.normalize().lerp(horiz.normalize(), mix).normalize();
    } else {
      radial = center.clone().sub(headCenter);
      if (radial.lengthSq() < 1e-5) radial.set(0, 0, 1);
      radial.normalize();
    }

    const outDir = radial.clone().addScaledVector(tan, -radial.dot(tan));
    if (outDir.lengthSq() < 1e-4) {
      outDir.copy(fallbackUp).addScaledVector(tan, -fallbackUp.dot(tan));
      if (outDir.lengthSq() < 1e-4) outDir.set(0, 0, 1);
    }
    outDir.normalize();

    const sideDir = tan.clone().cross(outDir).normalize();
    const {wScale, dScale} = evalProfileScale(t);
    const w = width * wScale;
    const h = depth * dScale;
    const curlOut = tipLift * Math.pow(smoothstep01(0.55, 1.0, t), 1.8);

    for (let j = 0; j < radialSegs; j++) {
      const theta = (j / radialSegs) * Math.PI * 2;
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);
      const lateral = cos * w;
      const ridge = sin > 0 ? 1 + ridgeBoost * Math.pow(sin, 1.5) : innerFlatten;
      const out = sin * h * ridge + curlOut;

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
    const nextJ = (j + 1) % radialSegs;
    indices.push(startCenterIdx, j, nextJ);
  }

  const endCenterIdx = positions.length / 3;
  const p1 = curve.getPointAt(1);
  const t1 = curve.getTangentAt(1).normalize();
  positions.push(p1.x + t1.x * 0.009, p1.y + t1.y * 0.009, p1.z + t1.z * 0.009);
  const lastRow = tubularSegs * radialSegs;
  for (let j = 0; j < radialSegs; j++) {
    const nextJ = (j + 1) % radialSegs;
    indices.push(endCenterIdx, lastRow + nextJ, lastRow + j);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

/**
 * HAIR BASE + CONTINUOUS SCULPTED BACK SHELL:
 * Builds a single cohesive sculpted dome that hugs the skull gracefully at the crown,
 * contours cleanly behind/above the ears, and for long_wave / bob_cut seamlessly cascades
 * into a sculpted, softly scalloped, A-line or tulip clay silhouette (like figure reference!)
 * with zero gaps, zero sharp octopus tips, and automatic hat-fit crown adaptation.
 */
function createHairBaseGeometry(
  hairBack: HairBackStyle,
  hairFront: HairFrontStyle,
  hatMode: HatFitMode,
): {geom: THREE.BufferGeometry; crownOuterOffset: number} {
  const lonSegs = 80;
  const outerSegs = 28;
  const lipSegs = 4;
  const innerSegs = 8;

  const isMaleShort = isMaleShortStyle(hairBack);
  const isLong = hairBack === 'long_wave';
  const isBob = hairBack === 'bob_cut';
  const isDraped = isLong || isBob;
  const isHatCap = hatMode === 'crown_cap';

  const partLon =
    hairBack === 'boy_1'
      ? 24
      : hairBack === 'boy_2' || (!isMaleShort && hairFront === 'curtain')
        ? 0
        : !isMaleShort && hairFront === 'side_sweep'
          ? -24
          : null;

  const baseCrownLoft = isHatCap ? 0.016 : isMaleShort ? 0.025 : 0.027;

  // Front bangs edge is tucked smoothly behind FrontHair sculpted bangs
  // while back/sides flow cleanly around ears and nape
  const getPerimeterProfile = (lonDeg: number) => {
    const a = Math.abs(lonDeg);

    // Forehead hairline stays tucked softly behind the FrontHair bangs piece
    const browLat =
      !isMaleShort && hairFront === 'curtain'
        ? 58 - 10 * Math.exp(-Math.pow(lonDeg / 14, 2))
        : hairBack === 'boy_2'
          ? 58 - 11 * Math.exp(-Math.pow(lonDeg / 13, 2))
          : hairBack === 'boy_1'
            ? 60 - 9 * Math.exp(-Math.pow((lonDeg - 24) / 14, 2))
            : 60;

    // Gentle sideburn curve cleanly in front of ear (a = 62..68)
    const toTemple = smoothstep01(42, 62, a);
    const sideburnDrop = (isMaleShort ? 14 : 16) * Math.exp(-Math.pow((a - 62) / 6.8, 2));

    // Smoothly arch right above ear top (y ~ 0.34, lat ~ 74-77) so ear sits unobstructed
    const earTuck = smoothstep01(70, 82, a) * (1 - smoothstep01(93, 108, a));

    let endLat = browLat + toTemple * (75 - browLat) + sideburnDrop;

    if (!isDraped) {
      // Distinct, natural contoured nape silhouettes for short & tied styles (not a flat horizontal cut!)
      const centerBackNapeDip =
        hairBack === 'boy_2'
          ? 128 + 6 * smoothstep01(145, 180, a)
          : hairBack === 'boy_1'
            ? 114 + 5 * smoothstep01(150, 180, a)
            : hairBack === 'boy_3'
              ? 120 + 6 * Math.cos(((a - 180) * Math.PI) / 30) * smoothstep01(135, 180, a)
              : hairBack === 'short_crop'
                ? 123 + 4 * smoothstep01(140, 180, a)
                : 122; // tied styles nape

      const toNape = smoothstep01(96, 126, a);
      endLat = endLat * (1 - earTuck * 0.08) + toNape * (centerBackNapeDip - endLat);
      return {endLat, dropLen: 0};
    }

    // Draped styles (long_wave & bob_cut): tuck cleanly behind ear (a > 96), cascade seamlessly
    const toBack = smoothstep01(90, 114, a);
    endLat = endLat * (1 - toBack) + 92 * toBack;
    endLat = endLat * (1 - earTuck) + 74 * earTuck;

    // Sculpted scalloped clay curtain hemline matching grey figurine reference (wide soft waves, never spiky!)
    const backMask = smoothstep01(90, 114, a);
    const backAngle = Math.max(0, a - 104) / 76; // 0 behind ear -> 1 center back
    // 3 broad, gentle sculpted scallops across the back (center + 2 side sweeps)
    const gentleScallop = Math.pow(0.5 + 0.5 * Math.cos(backAngle * Math.PI * 4), 0.8);

    const fullDrop = isLong
      ? 0.42 + 0.032 * gentleScallop + 0.038 * Math.sin(backAngle * Math.PI * 0.5)
      : 0.21 + 0.012 * gentleScallop;
    // Small soft transition curve behind ear (no cheek drop here because SideHair drapes in front of ear)
    const dropLen = backMask * fullDrop;

    return {endLat, dropLen};
  };

  const evalCapVertex = (lonDeg: number, s: number): [number, number, number] => {
    const a = Math.abs(lonDeg);
    const {endLat, dropLen} = getPerimeterProfile(lonDeg);

    // Subtle soft sculptural panel folds along lower back mantle (like grey clay model!)
    const backAngle = Math.max(0, a - 104) / 76;
    const panelFoldAmp = isDraped && a > 100 ? (isLong ? 0.012 : 0.008) : 0.0;

    const evalAlongSurface = (vSurf: number, wallBias: number): [number, number, number] => {
      const latReach = Math.min(endLat, 92);
      const fracSphere =
        dropLen > 0 ? latReach / (latReach + dropLen * 125) : 1.0;

      const evalOffsetAt = (vParam: number) => {
        const frontTapering =
          Math.max(0, Math.cos((lonDeg * Math.PI) / 180)) *
          smoothstep01(0.45, 1.0, vParam);
        const napeTapering = !isDraped ? smoothstep01(0.7, 1.0, vParam) * smoothstep01(96, 130, a) : 0;

        const crownShape =
          baseCrownLoft *
          (1 + 0.2 * Math.sin(Math.min(1, vParam / Math.max(0.25, fracSphere)) * Math.PI * 0.82)) *
          (1 - 0.55 * frontTapering) *
          (1 - 0.62 * napeTapering);

        const partContour =
          partLon !== null
            ? (-0.005 * Math.exp(-Math.pow((lonDeg - partLon) / 6.5, 2)) +
                0.007 * Math.exp(-Math.pow((Math.abs(lonDeg - partLon) - 18) / 12, 2))) *
              smoothstep01(0.06, 0.35, vParam) *
              (1 - 0.7 * smoothstep01(0.65, 1.0, vParam)) *
              (isHatCap ? 0.35 : 1.0)
            : 0;

        // Soft occipital & gathered fullness on short / tied hairstyles
        const occiputShape =
          !isDraped && a > 105
            ? (hairBack === 'ponytail'
                ? 0.012 * Math.exp(-Math.pow((vParam - 0.58) / 0.22, 2))
                : hairBack === 'twin_buns' || hairBack === 'twin_tails'
                  ? 0.006 * Math.exp(-Math.pow((vParam - 0.55) / 0.25, 2)) -
                    0.004 * Math.exp(-Math.pow((a - 180) / 10, 2)) * smoothstep01(0.25, 0.75, vParam)
                  : 0.01 * Math.exp(-Math.pow((vParam - 0.62) / 0.24, 2))) *
              smoothstep01(105, 145, a)
            : 0;

        // Gentle soft undulating back drape folds (lower half only, never sharp ribs!)
        const backFolds =
          panelFoldAmp *
          (0.5 + 0.5 * Math.cos(backAngle * Math.PI * 4)) *
          smoothstep01(0.32, 0.72, vParam);

        const tipPinch = 1 - 0.5 * smoothstep01(0.82, 1.0, vParam);
        const thickness = (isDraped ? 0.022 : isHatCap ? 0.01 : 0.013) * tipPinch;

        return Math.max(
          0.002,
          crownShape + partContour + occiputShape + backFolds + wallBias * thickness,
        );
      };

      if (vSurf <= fracSphere || dropLen <= 0.001) {
        const localT = fracSphere > 0 ? vSurf / fracSphere : 1;
        const latDeg = localT * endLat;
        return headSurfacePoint(latDeg, lonDeg, evalOffsetAt(vSurf));
      }

      // Continuous drape from exact anchor point at vSurf = fracSphere
      const dropT = Math.min(1, (vSurf - fracSphere) / Math.max(1e-4, 1 - fracSphere));
      const [ax, ay, az] = headSurfacePoint(endLat, lonDeg, evalOffsetAt(fracSphere));
      const backWeight = smoothstep01(98, 155, a);

      // Long hair flares into a gentle A-line clay wave; bob curls cleanly inward under jaw
      const flareZ = isLong
        ? -0.048 * Math.pow(smoothstep01(0.1, 1.0, dropT), 1.2) * backWeight +
          0.014 * Math.sin(dropT * Math.PI)
        : -0.022 * Math.sin(dropT * Math.PI * 0.8) + 0.056 * Math.pow(smoothstep01(0.45, 1.0, dropT), 1.4);
      const flareX = isLong
        ? 0.052 * Math.pow(smoothstep01(0.1, 1.0, dropT), 1.15) * Math.sign(lonDeg || 1) * smoothstep01(94, 140, a)
        : -0.036 * Math.pow(smoothstep01(0.5, 1.0, dropT), 1.35) * Math.sign(lonDeg || 1) * smoothstep01(94, 132, a);

      return [
        ax + flareX,
        ay - dropT * dropLen,
        az + flareZ * (0.3 + 0.7 * backWeight),
      ];
    };

    if (s <= 1.0) return evalAlongSurface(s, 0.5);
    if (s <= 2.0) {
      const ang = (s - 1.0) * Math.PI;
      const [ox, oy, oz] = evalAlongSurface(1.0, 0.5);
      const [ix, iy, iz] = evalAlongSurface(1.0, -0.5);
      const cx = (ox + ix) * 0.5;
      const cy = (oy + iy) * 0.5;
      const cz = (oz + iz) * 0.5;
      const hx = (ox - ix) * 0.5;
      const hy = (oy - iy) * 0.5;
      const hz = (oz - iz) * 0.5;
      const lip = Math.hypot(hx, hz) * 0.85;
      return [
        cx + hx * Math.cos(ang),
        cy + hy * Math.cos(ang) - lip * Math.sin(ang),
        cz + hz * Math.cos(ang),
      ];
    }
    const inU = s - 2.0;
    return evalAlongSurface(1.0 - inU * (isDraped ? 0.36 : 0.25), -0.5);
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

  return {geom, crownOuterOffset: baseCrownLoft + (isDraped ? 0.011 : 0.007)};
}

/**
 * SCULPTED FRONT BANGS VISOR CURTAIN (Continuous Ear-to-Ear Polymer Clay Front Hair):
 * Creates the cohesive sculpted front hair mass (matching the grey figurine reference's left piece!)
 * so bangs never leave bald gaps or look like isolated stickers pasted on the forehead.
 */
function createContinuousFrontCurtainGeometry(
  hairBack: HairBackStyle,
  hairFront: HairFrontStyle,
  hatMode: HatFitMode,
): THREE.BufferGeometry {
  const lonSegs = 44;
  const latSegs = 14;
  const lipSegs = 3;
  const lonSpan = 64; // -64 deg to +64 deg (smoothly merges into temples)

  const isMaleShort = isMaleShortStyle(hairBack);
  const isHatCap = hatMode === 'crown_cap';
  const crownLift = isHatCap ? -0.008 : 0.0;

  const getBangEdgeLat = (lonDeg: number): number => {
    const a = Math.abs(lonDeg);
    const edgeFade = 1 - smoothstep01(48, 64, a);

    if (hairBack === 'boy_1') {
      // Asymmetrical right-swept crop parting at +26 deg with soft sculpted lock notches
      const partNotch = 13 * Math.exp(-Math.pow((lonDeg - 26) / 9.5, 2));
      const lockCuts =
        6.5 * Math.exp(-Math.pow((lonDeg - 2) / 5.5, 2)) +
        6.0 * Math.exp(-Math.pow((lonDeg + 20) / 5.5, 2));
      const sweep = 4.5 * Math.sin(((lonDeg + 10) * Math.PI) / 22) * edgeFade;
      return 76 - partNotch - lockCuts * edgeFade + sweep;
    }
    if (hairBack === 'boy_2') {
      const centerOpen = 20 * Math.exp(-Math.pow(lonDeg / 13.5, 2));
      const swoop = 5.5 * smoothstep01(14, 42, a) * edgeFade;
      return 76 + swoop - centerOpen;
    }
    if (hairBack === 'boy_3') {
      // Distinct plush rounded brow tufts (clear clay divisions like sculpted boy bangs)
      const lockCuts =
        7.0 * Math.exp(-Math.pow((lonDeg + 24) / 5.2, 2)) +
        7.5 * Math.exp(-Math.pow(lonDeg / 5.0, 2)) +
        7.0 * Math.exp(-Math.pow((lonDeg - 24) / 5.2, 2));
      return 76.5 - lockCuts * edgeFade;
    }
    if (hairBack === 'short_crop') {
      const lockCuts =
        6.2 * Math.exp(-Math.pow((a - 14) / 5.2, 2)) +
        5.8 * Math.exp(-Math.pow((a - 34) / 5.2, 2));
      return 76 - lockCuts * edgeFade;
    }

    if (hairFront === 'neat_fringe') {
      // Sculpted clay doll bangs: full soft fringe with gentle vertical lock slits in lower tips
      const lockCuts =
        5.5 * Math.exp(-Math.pow((a - 15) / 4.6, 2)) +
        5.2 * Math.exp(-Math.pow((a - 34) / 4.8, 2));
      return 77 - lockCuts * edgeFade;
    }
    if (hairFront === 'curtain') {
      const centerOpen = 17 * Math.exp(-Math.pow(lonDeg / 13.5, 2));
      const swoop = 6.5 * smoothstep01(16, 48, a) * edgeFade;
      return 76.5 + swoop - centerOpen;
    }
    if (hairFront === 'side_sweep') {
      const partOpen = 14 * Math.exp(-Math.pow((lonDeg + 24) / 11, 2));
      const lockCut = 5.0 * Math.exp(-Math.pow((lonDeg - 10) / 5.5, 2));
      const sweep = 5.5 * smoothstep01(-16, 36, lonDeg) * edgeFade;
      return 75.5 + sweep - partOpen - lockCut * edgeFade;
    }

    // air_bangs: playful spaced airy clay locks revealing natural brow peeks
    const softNotches =
      Math.exp(-Math.pow((a - 16) / 6.0, 2)) * 9.5 +
      Math.exp(-Math.pow((a - 36) / 5.8, 2)) * 7.5 +
      Math.exp(-Math.pow(a / 5.0, 2)) * 4.5;
    return 77.5 - softNotches * edgeFade;
  };

  const evalPoint = (lonDeg: number, s: number): [number, number, number] => {
    const a = Math.abs(lonDeg);
    const maxLat = getBangEdgeLat(lonDeg);
    const startLat = 16;
    const sideEmbed = 1 - smoothstep01(48, 64, a);

    const evalAlong = (v: number, wallBias: number): [number, number, number] => {
      const latDeg = startLat + v * (maxLat - startLat);
      const archLoft =
        (0.015 + crownLift) * (1 - v) +
        0.028 * Math.sin(v * Math.PI * 0.9) +
        0.009 * v;

      // Richer sculpted clay pillow grooves on lower bangs so locks catch gentle highlights
      const ridgeFreq =
        hairFront === 'neat_fringe' || hairBack === 'boy_3' || hairBack === 'short_crop'
          ? 11
          : 15;
      const clayPillow =
        0.0075 *
        (0.5 + 0.5 * Math.cos((lonDeg * Math.PI) / ridgeFreq)) *
        smoothstep01(0.28, 0.78, v);

      const thickness = (0.014 * (1 - 0.55 * smoothstep01(0.74, 1.0, v))) * (0.4 + 0.6 * sideEmbed);
      const offset = Math.max(
        0.004,
        (archLoft + clayPillow) * (0.45 + 0.55 * sideEmbed) + wallBias * thickness,
      );
      return headSurfacePoint(latDeg, lonDeg, offset);
    };

    if (s <= 1.0) return evalAlong(s, 0.5);
    const ang = (s - 1.0) * Math.PI;
    const [ox, oy, oz] = evalAlong(1.0, 0.5);
    const [ix, iy, iz] = evalAlong(1.0, -0.5);
    const cx = (ox + ix) * 0.5;
    const cy = (oy + iy) * 0.5;
    const cz = (oz + iz) * 0.5;
    const hx = (ox - ix) * 0.5;
    const hy = (oy - iy) * 0.5;
    const hz = (oz - iz) * 0.5;
    const lip = Math.hypot(hx, hz) * 0.85;
    return [
      cx + hx * Math.cos(ang),
      cy + hy * Math.cos(ang) - lip * Math.sin(ang),
      cz + hz * Math.cos(ang),
    ];
  };

  const sList: number[] = [];
  for (let i = 0; i <= latSegs; i++) sList.push(i / latSegs);
  for (let i = 1; i <= lipSegs; i++) sList.push(1.0 + i / lipSegs);

  const positions: number[] = [];
  const indices: number[] = [];

  for (const s of sList) {
    for (let j = 0; j <= lonSegs; j++) {
      const lonDeg = -lonSpan + (j / lonSegs) * (lonSpan * 2);
      const [x, y, z] = evalPoint(lonDeg, s);
      positions.push(x, y, z);
    }
  }

  const stride = lonSegs + 1;
  for (let i = 0; i < sList.length - 1; i++) {
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
 * FRONT HAIR:
 * Combines the seamless ear-to-ear clay bangs curtain with soft sculpted hero locks
 * (comma curls, side sweep locks, wispy accents) for unmistakable 3D form.
 */
function buildFrontHairLocks(
  hairBack: HairBackStyle,
  hairFront: HairFrontStyle,
  hairMat: THREE.Material,
  hatMode: HatFitMode,
): THREE.Group {
  const grp = new THREE.Group();
  grp.name = 'FrontHair';
  const crownLift = hatMode === 'crown_cap' ? -0.008 : 0.0;

  // 1. Unified sculpted bangs foundation (eliminates gaps & "pasted sticker" look)
  grp.add(
    new THREE.Mesh(
      createContinuousFrontCurtainGeometry(hairBack, hairFront, hatMode),
      hairMat,
    ),
  );

  // 2. Layered sculptural accent locks perched organically on the bangs curtain
  const addHeroLock = (steps: LockStep[], width: number, depth: number) => {
    const adjusted = steps.map((s, idx) => ({
      lat: s.lat,
      lon: s.lon,
      offset:
        idx < 2 ? Math.max(0.012, s.offset + crownLift * 0.7) : s.offset,
    }));
    grp.add(
      new THREE.Mesh(
        createClayLockGeometry(sampleHeadSteps(adjusted, 14), {
          width,
          depth,
          innerFlatten: 0.22,
          ridgeBoost: 0.12,
          profile: 'bangs',
          tubularSegs: 14,
          radialSegs: 10,
        }),
        hairMat,
      ),
    );
  };

  if (hairBack === 'boy_1') {
    // Sleek overlapping left-to-right side sweep ribbons
    addHeroLock(
      [
        {lat: 20, lon: 22, offset: 0.022},
        {lat: 48, lon: 4, offset: 0.038},
        {lat: 75, lon: -16, offset: 0.014},
      ],
      0.068,
      0.022,
    );
    addHeroLock(
      [
        {lat: 24, lon: 14, offset: 0.022},
        {lat: 52, lon: -16, offset: 0.036},
        {lat: 74, lon: -38, offset: 0.014},
      ],
      0.06,
      0.02,
    );
  } else if (hairBack === 'boy_2') {
    // Signature inward-curling K-pop / anime comma locks on both sides of the center part
    [-1, 1].forEach((side) => {
      addHeroLock(
        [
          {lat: 18, lon: side * 6, offset: 0.022},
          {lat: 46, lon: side * 26, offset: 0.04},
          {lat: 68, lon: side * 28, offset: 0.028},
          {lat: 78, lon: side * 14, offset: 0.013},
        ],
        0.062,
        0.024,
      );
    });
  } else if (hairBack === 'boy_3') {
    // Soft multi-curved tousled brow locks + subtle curled crown sweep
    addHeroLock(
      [
        {lat: 20, lon: -4, offset: 0.022},
        {lat: 48, lon: -14, offset: 0.039},
        {lat: 76, lon: -22, offset: 0.014},
      ],
      0.06,
      0.022,
    );
    addHeroLock(
      [
        {lat: 20, lon: 8, offset: 0.022},
        {lat: 48, lon: 18, offset: 0.039},
        {lat: 75, lon: 24, offset: 0.014},
      ],
      0.06,
      0.022,
    );
    if (hatMode !== 'crown_cap') {
      const p0 = headSurfacePoint(10, 2, 0.022);
      grp.add(
        new THREE.Mesh(
          createClayLockGeometry(
            [
              p0,
              [p0[0] + 0.022, p0[1] + 0.028, p0[2] + 0.008],
              [p0[0] + 0.062, p0[1] + 0.032, p0[2] - 0.008],
            ],
            {
              width: 0.032,
              depth: 0.02,
              innerFlatten: 0.7,
              profile: 'lock',
              tubularSegs: 12,
              radialSegs: 10,
            },
          ),
          hairMat,
        ),
      );
    }
  } else if (!isMaleShortStyle(hairBack)) {
    if (hairFront === 'curtain') {
      [-1, 1].forEach((side) => {
        addHeroLock(
          [
            {lat: 20, lon: side * 6, offset: 0.022},
            {lat: 48, lon: side * 28, offset: 0.038},
            {lat: 78, lon: side * 42, offset: 0.015},
          ],
          0.064,
          0.022,
        );
      });
    } else if (hairFront === 'side_sweep') {
      addHeroLock(
        [
          {lat: 16, lon: -22, offset: 0.018},
          {lat: 48, lon: 0, offset: 0.032},
          {lat: 74, lon: 20, offset: 0.012},
        ],
        0.068,
        0.016,
      );
    }
  }

  return grp;
}

/**
 * SIDE HAIR:
 * Sculpted temple-to-cheek hair framing locks sitting smoothly in front of ears
 * and curving organically downward for long, bob, and tied styles.
 */
function buildSideHairLocks(
  hairBack: HairBackStyle,
  hairMat: THREE.Material,
): THREE.Group {
  const grp = new THREE.Group();
  grp.name = 'SideHair';

  const isMaleShort = isMaleShortStyle(hairBack);
  const isLong = hairBack === 'long_wave';
  const isBob = hairBack === 'bob_cut';

  [-1, 1].forEach((side) => {
    if (isMaleShort) {
      const lengthLat = hairBack === 'boy_2' ? 104 : 95;
      const pts = sampleHeadSteps(
        [
          {lat: 42, lon: side * 56, offset: 0.014},
          {lat: 68, lon: side * 62, offset: 0.022},
          {lat: lengthLat, lon: side * 63, offset: 0.01},
        ],
        12,
      );
      grp.add(
        new THREE.Mesh(
          createClayLockGeometry(pts, {
            width: 0.048,
            depth: 0.018,
            innerFlatten: 0.25,
            profile: 'bangs',
            tubularSegs: 12,
            radialSegs: 10,
          }),
          hairMat,
        ),
      );
      return;
    }

    if (isLong) {
      const root0 = headSurfacePoint(44, side * 58, 0.022);
      const root1 = headSurfacePoint(74, side * 62, 0.028);
      const pts: [number, number, number][] = [
        root0,
        root1,
        [side * 0.305, 0.22, 0.095],
        [side * 0.292, 0.07, 0.088],
        [side * 0.268, -0.09, 0.07],
      ];
      grp.add(
        new THREE.Mesh(
          createClayLockGeometry(pts, {
            width: 0.056,
            depth: 0.03,
            innerFlatten: 0.38,
            profile: 'wave',
            outwardMode: 'drape',
            tubularSegs: 18,
            radialSegs: 10,
          }),
          hairMat,
        ),
      );
      return;
    }

    if (isBob) {
      const root0 = headSurfacePoint(44, side * 58, 0.022);
      const root1 = headSurfacePoint(76, side * 62, 0.03);
      const pts: [number, number, number][] = [
        root0,
        root1,
        [side * 0.312, 0.21, 0.084],
        [side * 0.284, 0.095, 0.09],
        [side * 0.236, 0.038, 0.098],
      ];
      grp.add(
        new THREE.Mesh(
          createClayLockGeometry(pts, {
            width: 0.064,
            depth: 0.03,
            innerFlatten: 0.36,
            profile: 'bob',
            outwardMode: 'drape',
            tubularSegs: 16,
            radialSegs: 10,
          }),
          hairMat,
        ),
      );
      return;
    }

    // Soft cheek wisps for tied styles
    const root0 = headSurfacePoint(44, side * 58, 0.022);
    const root1 = headSurfacePoint(76, side * 62, 0.026);
    const pts: [number, number, number][] = [
      root0,
      root1,
      [side * 0.284, 0.21, 0.098],
      [side * 0.246, 0.115, 0.114],
    ];
    grp.add(
      new THREE.Mesh(
        createClayLockGeometry(pts, {
          width: 0.044,
          depth: 0.022,
          innerFlatten: 0.32,
          profile: 'bangs',
          outwardMode: 'drape',
          tubularSegs: 14,
          radialSegs: 10,
        }),
        hairMat,
      ),
    );
  });

  return grp;
}

/**
 * BACK HAIR (LAYERED SCULPTED FORMS):
 * Long hair & bob sit flush over the cohesive scalloped HairBase mantle with broad, layered
 * outer clay waves (zero gaps, zero octopus legs, zero pumpkin ribs).
 * Ponytail, twin tails, twin buns, and male cuts have distinct layered back structures.
 */
function buildBackHairLayers(
  hairBack: HairBackStyle,
  hairMat: THREE.Material,
  tieMat: THREE.Material,
  hatMode: HatFitMode,
  backHairGroup: THREE.Group,
  accGroup: THREE.Group,
): void {
  // ---- 1. LONG WAVE: Flush layered outer S-waves draped naturally on top of the flared mantle ----
  if (hairBack === 'long_wave') {
    const outerWaves: {
      lonTop: number;
      midPt: [number, number, number];
      hemPt: [number, number, number];
      width: number;
      depth: number;
    }[] = [
      {
        lonTop: 180,
        midPt: [0, 0.11, -0.352],
        hemPt: [0, -0.145, -0.365],
        width: 0.145,
        depth: 0.032,
      },
      {
        lonTop: 138,
        midPt: [0.23, 0.13, -0.278],
        hemPt: [0.265, -0.11, -0.272],
        width: 0.125,
        depth: 0.03,
      },
      {
        lonTop: -138,
        midPt: [-0.23, 0.13, -0.278],
        hemPt: [-0.265, -0.11, -0.272],
        width: 0.125,
        depth: 0.03,
      },
    ];

    outerWaves.forEach((p) => {
      const r0 = headSurfacePoint(36, p.lonTop, 0.02);
      const r1 = headSurfacePoint(82, p.lonTop, 0.032);
      backHairGroup.add(
        new THREE.Mesh(
          createClayLockGeometry([r0, r1, p.midPt, p.hemPt], {
            width: p.width,
            depth: p.depth,
            innerFlatten: 0.25,
            ridgeBoost: 0.08,
            profile: 'wave',
            outwardMode: 'drape',
            tipLift: 0.006,
            tubularSegs: 18,
            radialSegs: 12,
          }),
          hairMat,
        ),
      );
    });
    return;
  }

  // ---- 2. BOB CUT: Soft low-profile side C-curl layers hugging the smooth bob dome ----
  if (hairBack === 'bob_cut') {
    [-1, 1].forEach((side) => {
      const r0 = headSurfacePoint(42, side * 124, 0.022);
      const r1 = headSurfacePoint(82, side * 122, 0.032);
      backHairGroup.add(
        new THREE.Mesh(
          createClayLockGeometry(
            [
              r0,
              r1,
              [side * 0.296, 0.2, -0.195],
              [side * 0.245, 0.08, -0.135],
            ],
            {
              width: 0.118,
              depth: 0.026,
              innerFlatten: 0.24,
              ridgeBoost: 0.06,
              profile: 'bob',
              outwardMode: 'drape',
              tubularSegs: 16,
              radialSegs: 10,
            },
          ),
          hairMat,
        ),
      );
    });
    return;
  }

  // ---- 3. PONYTAIL: Gathered back ridges + scrunchie + multi-layer flowing S-wave ponytail ----
  if (hairBack === 'ponytail') {
    const rootLat = hatMode === 'crown_cap' ? 86 : 74;
    const rootPt = headSurfacePoint(rootLat, 180, 0.022);

    // Gathered hair sweeps pulling upward toward the ponytail knot (back structure!)
    [-1, 1].forEach((side) => {
      const sweepPts = sampleHeadSteps(
        [
          {lat: 112, lon: side * 145, offset: 0.012},
          {lat: 92, lon: side * 162, offset: 0.024},
          {lat: rootLat, lon: 180, offset: 0.022},
        ],
        10,
      );
      backHairGroup.add(
        new THREE.Mesh(
          createClayLockGeometry(sweepPts, {
            width: 0.072,
            depth: 0.018,
            innerFlatten: 0.24,
            profile: 'lock',
            tubularSegs: 10,
            radialSegs: 8,
          }),
          hairMat,
        ),
      );
    });

    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.052, 16, 12), hairMat);
    knot.position.set(rootPt[0], rootPt[1], rootPt[2]);
    backHairGroup.add(knot);

    const tie = new THREE.Mesh(
      new THREE.TorusGeometry(0.056, 0.018, 10, 18),
      tieMat,
    );
    tie.position.set(rootPt[0], rootPt[1], rootPt[2]);
    tie.rotation.x = -0.28;
    accGroup.add(tie);

    const ryOffset = hatMode === 'crown_cap' ? -0.045 : 0.0;
    backHairGroup.add(
      new THREE.Mesh(
        createClayLockGeometry(
          [
            rootPt,
            [0, 0.37 + ryOffset, -0.37],
            [0, 0.25 + ryOffset, -0.455],
            [0, 0.08 + ryOffset, -0.44],
            [0, -0.09 + ryOffset, -0.385],
          ],
          {
            width: 0.102,
            depth: 0.068,
            innerFlatten: 0.65,
            ridgeBoost: 0.14,
            profile: 'wave',
            outwardMode: 'drape',
            tubularSegs: 20,
            radialSegs: 12,
          },
        ),
        hairMat,
      ),
    );
    [-1, 1].forEach((side) => {
      backHairGroup.add(
        new THREE.Mesh(
          createClayLockGeometry(
            [
              rootPt,
              [side * 0.054, 0.34 + ryOffset, -0.368],
              [side * 0.088, 0.19 + ryOffset, -0.428],
              [side * 0.066, 0.01 + ryOffset, -0.39],
            ],
            {
              width: 0.062,
              depth: 0.042,
              innerFlatten: 0.55,
              ridgeBoost: 0.12,
              profile: 'wave',
              outwardMode: 'drape',
              tubularSegs: 18,
              radialSegs: 10,
            },
          ),
          hairMat,
        ),
      );
    });
    return;
  }

  // ---- 4. TWIN TAILS: Clean scrunchies + bouncy dual-layer pigtails ----
  if (hairBack === 'twin_tails') {
    [-1, 1].forEach((side) => {
      const rootLat = hatMode === 'crown_cap' ? 86 : 74;
      const rootPt = headSurfacePoint(rootLat, side * 116, 0.022);
      const radialOut = new THREE.Vector3(
        rootPt[0],
        rootPt[1] - HEAD_CY,
        rootPt[2],
      ).normalize();

      const knot = new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 12), hairMat);
      knot.position.set(rootPt[0], rootPt[1], rootPt[2]);
      backHairGroup.add(knot);

      const tie = new THREE.Mesh(
        new THREE.TorusGeometry(0.055, 0.018, 10, 18),
        tieMat,
      );
      tie.position.set(rootPt[0], rootPt[1], rootPt[2]);
      tie.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), radialOut);
      accGroup.add(tie);

      const yAdj = hatMode === 'crown_cap' ? -0.04 : 0;
      backHairGroup.add(
        new THREE.Mesh(
          createClayLockGeometry(
            [
              rootPt,
              [side * 0.39, 0.25 + yAdj, -0.14],
              [side * 0.43, 0.08 + yAdj, -0.155],
              [side * 0.41, -0.12 + yAdj, -0.125],
            ],
            {
              width: 0.084,
              depth: 0.058,
              innerFlatten: 0.65,
              ridgeBoost: 0.12,
              profile: 'wave',
              outwardMode: 'drape',
              tubularSegs: 18,
              radialSegs: 12,
            },
          ),
          hairMat,
        ),
      );
      backHairGroup.add(
        new THREE.Mesh(
          createClayLockGeometry(
            [
              rootPt,
              [side * 0.365, 0.23 + yAdj, -0.195],
              [side * 0.38, 0.06 + yAdj, -0.22],
              [side * 0.35, -0.09 + yAdj, -0.185],
            ],
            {
              width: 0.056,
              depth: 0.042,
              innerFlatten: 0.6,
              ridgeBoost: 0.1,
              profile: 'wave',
              outwardMode: 'drape',
              tubularSegs: 16,
              radialSegs: 10,
            },
          ),
          hairMat,
        ),
      );
    });
    return;
  }

  // ---- 5. TWIN BUNS: Twisted coiled clay buns + hat-aware low-bun adaptation ----
  if (hairBack === 'twin_buns') {
    const isHatCap = hatMode === 'crown_cap';
    const bunLat = isHatCap ? 70 : 48;
    const bunLon = isHatCap ? 112 : 104;
    const bunScale = isHatCap ? 0.88 : 1.0;

    [-1, 1].forEach((side) => {
      const pBun = headSurfacePoint(bunLat, side * bunLon, 0.042);
      const radialDir = new THREE.Vector3(
        pBun[0],
        pBun[1] - HEAD_CY,
        pBun[2],
      ).normalize();

      const bunBase = new THREE.Mesh(
        new THREE.SphereGeometry(0.114 * bunScale, 20, 16),
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
        new THREE.TorusGeometry(0.09 * bunScale, 0.018, 10, 18),
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
    return;
  }

  // ---- 6. MALE & SHORT CROP BACK LAYERS: Distinct tapered nape waves ----
  const backLocks: {lons: [number, number, number]; latEnd: number; w: number; d: number}[] =
    hairBack === 'boy_2'
      ? [
          // Soft medium-length center-parted wolf/two-block back layers
          {lons: [176, 152, 134], latEnd: 132, w: 0.094, d: 0.024},
          {lons: [-176, -152, -134], latEnd: 132, w: 0.094, d: 0.024},
          {lons: [122, 112, 104], latEnd: 118, w: 0.072, d: 0.022},
          {lons: [-122, -112, -104], latEnd: 118, w: 0.072, d: 0.022},
        ]
      : hairBack === 'boy_3'
        ? [
            // Layered V-tapered fluffy crop waves
            {lons: [180, 180, 180], latEnd: 126, w: 0.098, d: 0.026},
            {lons: [148, 142, 138], latEnd: 120, w: 0.088, d: 0.024},
            {lons: [-148, -142, -138], latEnd: 120, w: 0.088, d: 0.024},
          ]
        : [
            // boy_1 & short_crop: sleek, cleanly tapered back crown waves
            {lons: [180, 180, 180], latEnd: 118, w: 0.098, d: 0.022},
            {lons: [144, 138, 134], latEnd: 114, w: 0.086, d: 0.02},
            {lons: [-144, -138, -134], latEnd: 114, w: 0.086, d: 0.02},
          ];

  backLocks.forEach((b) => {
    const pts = sampleHeadSteps(
      [
        {lat: 42, lon: b.lons[0], offset: hatMode === 'crown_cap' ? 0.012 : 0.02},
        {lat: 84, lon: b.lons[1], offset: 0.03},
        {lat: b.latEnd, lon: b.lons[2], offset: 0.008},
      ],
      14,
    );
    backHairGroup.add(
      new THREE.Mesh(
        createClayLockGeometry(pts, {
          width: b.w,
          depth: b.d,
          innerFlatten: 0.22,
          ridgeBoost: 0.08,
          profile: 'bangs',
          tubularSegs: 14,
          radialSegs: 10,
        }),
        hairMat,
      ),
    );
  });
}

/**
 * Standardized entry point building all modular hair groups and HatAttachmentPoints.
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
  const {geom: baseGeom, crownOuterOffset} = createHairBaseGeometry(
    config.hairBack,
    config.hairFront,
    hatMode,
  );
  hairBase.add(new THREE.Mesh(baseGeom, hairMat));

  const frontHair = buildFrontHairLocks(
    config.hairBack,
    config.hairFront,
    hairMat,
    hatMode,
  );
  const sideHair = buildSideHairLocks(config.hairBack, hairMat);

  const backHair = new THREE.Group();
  backHair.name = 'BackHair';
  const hairAccessories = new THREE.Group();
  hairAccessories.name = 'HairAccessories';

  buildBackHairLayers(
    config.hairBack,
    hairMat,
    tieMat,
    hatMode,
    backHair,
    hairAccessories,
  );

  root.add(hairBase, frontHair, sideHair, backHair, hairAccessories);

  const crownY = HEAD_CY + HEAD_RY + crownOuterOffset;
  const sideSurf = headSurfacePoint(86, 90, crownOuterOffset * 0.72);
  const headbandRadius = Math.max(0.33, Math.abs(sideSurf[0]));

  const templeL = headSurfacePoint(56, -54, crownOuterOffset * 0.85);
  const templeR = headSurfacePoint(56, 54, crownOuterOffset * 0.85);
  const backPt = headSurfacePoint(52, 180, crownOuterOffset * 0.85);

  const attachments: HatAttachmentPoints = {
    crownTop: {
      position: new THREE.Vector3(0, crownY - 0.022, -0.015),
      rotation: new THREE.Euler(0, 0, 0),
      radius: headbandRadius * 0.84,
    },
    crownTilted: {
      position: new THREE.Vector3(0.036, crownY - 0.01, -0.018),
      rotation: new THREE.Euler(0, 0, -0.17),
    },
    headbandArc: {
      center: new THREE.Vector3(0, HEAD_CY + 0.01, 0.01),
      radius: headbandRadius,
      tiltX: -0.14,
    },
    templeLeft: {
      position: new THREE.Vector3(templeL[0], templeL[1], templeL[2]),
      rotation: new THREE.Euler(0.15, -0.82, 0.25),
    },
    templeRight: {
      position: new THREE.Vector3(templeR[0], templeR[1], templeR[2]),
      rotation: new THREE.Euler(0.15, 0.82, -0.25),
    },
    backCrown: {
      position: new THREE.Vector3(backPt[0], backPt[1], backPt[2]),
      rotation: new THREE.Euler(-0.35, Math.PI, 0),
    },
  };

  return {
    root,
    hairBase,
    frontHair,
    sideHair,
    backHair,
    hairAccessories,
    attachments,
  };
}
