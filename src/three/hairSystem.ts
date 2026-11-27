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

const _hairTexCache = new Map<string, THREE.CanvasTexture>();

/**
 * Pure vertical silky tonal gradient (root -> soft crown sheen -> tip) with ZERO horizontal
 * stripe noise or bump corrugation so small locks, braids, and the crown apex look completely
 * smooth, plush, and velvety like Heartopia / Nendoroid clay hair.
 */
function getHairSheenGradientTexture(color: string | number): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const baseCol = new THREE.Color(color);
  const hex = `#${baseCol.getHexString()}`;
  const key = `hair_silky_v2_${hex}`;
  const cached = _hairTexCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const hsl = {h: 0, s: 0, l: 0};
  baseCol.getHSL(hsl);

  const rootCol = new THREE.Color().setHSL(
    hsl.h,
    Math.min(1, hsl.s * 1.03),
    Math.max(0.05, hsl.l - 0.05),
  );
  const midCol = baseCol;
  const sheenCol = new THREE.Color().setHSL(
    hsl.h,
    Math.max(0.04, hsl.s * 0.92),
    Math.min(0.94, hsl.l + (hsl.l > 0.72 ? 0.05 : 0.08)),
  );
  const tipCol = new THREE.Color().setHSL(
    hsl.h,
    Math.min(1, hsl.s * 1.02),
    Math.max(0.06, hsl.l - 0.04),
  );

  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0.0, `#${rootCol.getHexString()}`);
  grad.addColorStop(0.22, `#${midCol.getHexString()}`);
  grad.addColorStop(0.42, `#${sheenCol.getHexString()}`);
  grad.addColorStop(0.68, `#${midCol.getHexString()}`);
  grad.addColorStop(1.0, `#${tipCol.getHexString()}`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.userData = {sharedCache: true};
  _hairTexCache.set(key, tex);
  return tex;
}

/**
 * Smooth, velvety Heartopia polymer-clay hair material (zero ribbed bump noise).
 */
export function createHairClayMaterial(color: string | number): THREE.MeshStandardMaterial {
  const sheenTex = getHairSheenGradientTexture(color);
  return new THREE.MeshStandardMaterial({
    color: sheenTex ? '#FFFFFF' : color,
    map: sheenTex ?? undefined,
    roughness: 0.5,
    metalness: 0.02,
    envMapIntensity: 0.42,
    userData: {pooled: false},
  });
}

export function resolveHatFitMode(headItem?: HeadItemStyle): HatFitMode {
  if (
    headItem === 'cap' ||
    headItem === 'beanie' ||
    headItem === 'cc_beanie' ||
    headItem === 'bucket_hat' ||
    headItem === 'frog_bucket' ||
    headItem === 'chick_hat' ||
    headItem === 'cloud_bucket' ||
    headItem === 'rainbow_cap' ||
    headItem === 'bunny_beanie' ||
    headItem === 'pompom_ear_hood'
  ) {
    return 'snug_cap';
  }
  if (
    headItem === 'beret' ||
    headItem === 'sunhat' ||
    headItem === 'non_la' ||
    headItem === 'khan_dong' ||
    headItem === 'picnic_bonnet' ||
    headItem === 'witch_giant_bow'
  ) {
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
    hairBack === 'hero_wave' ||
    hairBack === 'midautumn_spiky'
  );
}

/**
 * 1. SLEEK SCULPTED HAIR DOME (`HairBase`):
 * Smooth continuous manifold skull cap with a clean arched forehead hairline tucked under the
 * sculpted front bangs, smooth arch over ears, and gentle natural nape contour.
 */
function createUnifiedClayCapGeometry(
  hairBack: HairBackStyle,
  hairFront: HairFrontStyle,
  hatMode: HatFitMode,
): {geom: THREE.BufferGeometry; crownOuterOffset: number} {
  const lonSegs = 96;
  const outerSegs = 24;
  const lipSegs = 4;
  const innerSegs = 4;

  const male = isMaleStyle(hairBack);
  const hasBackCurtain =
    hairBack === 'long_wave' || hairBack === 'bob_cut' || hairBack === 'witch_bob';
  const isSnugCap = hatMode === 'snug_cap';
  const isOnHairHat = hatMode === 'on_hair';

  const partLon: number | null =
    hairBack === 'boy_2' || (!male && hairFront === 'curtain')
      ? 0
      : hairBack === 'boy_1'
        ? 14
        : hairBack === 'hero_wave'
          ? 18
          : hairBack === 'midautumn_spiky'
            ? -14
            : !male && hairFront === 'side_sweep'
              ? -16
              : null;

  const baseCrownLoft =
    hairBack === 'boy_4' || hairBack === 'hero_wave' || hairBack === 'midautumn_spiky'
      ? 0.056
      : hairBack === 'boy_3'
        ? 0.054
        : male
          ? 0.052
          : 0.05;

  const getPerimeterLat = (lonDeg: number): number => {
    const a = Math.abs(lonDeg);
    // Clean, smooth forehead hairline tucked cleanly under FrontHair bangs (around lat 56..60)
    const partNotch =
      partLon !== null ? 5.0 * Math.exp(-Math.pow((lonDeg - partLon) / 10, 2)) : 0;
    const frontHairline = (isSnugCap ? 62 : 58) - partNotch;

    const toSideZone = smoothstep01(48, 70, a);

    const sideburnLobe = male
      ? (hairBack === 'boy_2' ? 20 : 16) * Math.exp(-Math.pow((a - 59) / 9, 2))
      : 7 * Math.exp(-Math.pow((a - 61) / 9, 2));
    const earArchZone = Math.exp(-Math.pow((a - 82) / 11, 2));
    const overEarLat = hasBackCurtain ? 78 : male ? 79 : 80;

    let sideLat = 84 * (1 - earArchZone * 0.22) + overEarLat * (earArchZone * 0.22) + sideburnLobe;

    const backNapeLat =
      hasBackCurtain
        ? 118
        : hairBack === 'boy_2'
          ? 131
          : hairBack === 'boy_4' ||
              hairBack === 'boy_3' ||
              hairBack === 'hero_wave' ||
              hairBack === 'midautumn_spiky'
            ? 130
            : hairBack === 'boy_1' || hairBack === 'short_crop'
              ? 128
              : 126;

    const toBack = smoothstep01(86, 108, a);
    sideLat = sideLat + toBack * (backNapeLat - sideLat);

    return frontHairline * (1 - toSideZone) + sideLat * toSideZone;
  };

  const evalCapVertex = (lonDeg: number, s: number): [number, number, number] => {
    const a = Math.abs(lonDeg);
    const endLat = getPerimeterLat(lonDeg);

    const evalAlongSurface = (vSurf: number, wallBias: number, sealDeep = 0): [number, number, number] => {
      const latDeg = vSurf * endLat;

      const frontWeight = smoothstep01(72, 24, a);
      const sideWeight = smoothstep01(48, 72, a) * (1 - smoothstep01(86, 110, a));
      const napeWeight = smoothstep01(86, 116, a);

      const frontTipTaper = frontWeight * smoothstep01(0.55, 1.0, vSurf);
      const sideTipTaper = sideWeight * smoothstep01(0.52, 1.0, vSurf);
      const napeTipTaper = napeWeight * smoothstep01(0.48, 1.0, vSurf);

      const puffSwell = 1 + 0.08 * Math.sin(Math.pow(vSurf, 0.74) * Math.PI * 0.9);
      let crownShape =
        baseCrownLoft *
        puffSwell *
        (1 - 0.86 * frontTipTaper) *
        (1 - 0.9 * sideTipTaper) *
        (1 - 0.9 * napeTipTaper);

      if (isOnHairHat) {
        const seatFade = 1 - smoothstep01(0.0, 0.38, vSurf);
        crownShape = THREE.MathUtils.lerp(crownShape, baseCrownLoft * 0.78, seatFade);
      }

      if (isSnugCap) {
        const capArea = 1 - smoothstep01(0.52, 0.84, vSurf);
        crownShape = THREE.MathUtils.lerp(crownShape, 0.022, capArea * 0.92);
      }

      const partContour =
        partLon !== null
          ? (-0.006 * Math.exp(-Math.pow((lonDeg - partLon) / 8, 2)) +
              0.005 * Math.exp(-Math.pow((Math.abs(lonDeg - partLon) - 18) / 11, 2))) *
            smoothstep01(0.08, 0.45, vSurf) *
            (1 - 0.65 * smoothstep01(0.72, 1.0, vSurf)) *
            (isSnugCap ? 0.35 : 1.0)
          : 0;

      const backMask = smoothstep01(96, 126, a);
      const backGrooves =
        !hasBackCurtain
          ? -0.004 *
            Math.pow(Math.abs(Math.sin(((lonDeg - 180) * Math.PI) / 36)), 1.4) *
            backMask *
            smoothstep01(0.42, 0.82, vSurf) *
            (1 - smoothstep01(0.78, 0.96, vSurf))
          : 0;

      const rimThick =
        (0.0055 * frontWeight + 0.0045 * (1 - frontWeight)) *
        (1 - 0.45 * smoothstep01(0.8, 1.0, vSurf));
      const thickness = isSnugCap ? 0.006 : rimThick;

      const rawOffset = crownShape + partContour + backGrooves + wallBias * thickness;
      const offset =
        sealDeep > 0
          ? THREE.MathUtils.lerp(Math.max(0.002, rawOffset), -0.024, sealDeep)
          : Math.max(0.004, rawOffset);
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
      const lip = Math.hypot(hx, hz) * 0.55;
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
  const uvs: number[] = [];
  const indices: number[] = [];

  const [px0, py0, pz0] = evalCapVertex(0, 0);
  positions.push(px0, py0, pz0);
  uvs.push(0.5, 0.0);

  for (const s of sValues) {
    const vUv = s <= 1.0 ? 1.0 - s * 0.85 : 0.15;
    for (let j = 0; j <= lonSegs; j++) {
      const uUv = j / lonSegs;
      const lonDeg = -180 + uUv * 360;
      const [x, y, z] = evalCapVertex(lonDeg, s);
      positions.push(x, y, z);
      uvs.push(uUv, 1.0 - vUv);
    }
  }

  const stride = lonSegs + 1;
  for (let j = 0; j < lonSegs; j++) {
    indices.push(0, 1 + j, 1 + j + 1);
  }

  const ringCount = sValues.length;
  for (let i = 0; i < ringCount - 1; i++) {
    const rowA = 1 + i * stride;
    const rowB = 1 + (i + 1) * stride;
    for (let j = 0; j < lonSegs; j++) {
      const a = rowA + j;
      const b = rowB + j;
      const c = rowB + j + 1;
      const d = rowA + j + 1;
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();

  const crownOuterOffset = isSnugCap ? 0.032 : baseCrownLoft + 0.004;
  return {geom, crownOuterOffset};
}

/**
 * 2. SMOOTH SCULPTED BACK CLAY BELL (`long_wave`, `bob_cut`, `witch_bob`):
 * Soft cohesive Heartopia / Nendoroid curved back silhouette with gentle subtle waves and
 * softly rounded inward C-curl hem.
 */
function createBackClayBellGeometry(
  style: 'long_wave' | 'bob_cut' | 'witch_bob',
  crownOffset: number,
): THREE.BufferGeometry {
  const isLong = style === 'long_wave';
  const isWitchBob = style === 'witch_bob';
  const lonMin = 76;
  const lonMax = 284;
  const uSegs = 52;
  const vSegs = 22;

  const hemBaseY = isLong ? -0.075 : isWitchBob ? 0.022 : 0.044;
  const bellRadius = isLong ? 0.338 : isWitchBob ? 0.336 : 0.33;
  const outerHalfThick = 0.015;

  const evalBellPoint = (
    uNorm: number,
    v: number,
    thicknessSign: number,
  ): [number, number, number] => {
    const lonDeg = lonMin + uNorm * (lonMax - lonMin);
    const rad = (lonDeg * Math.PI) / 180;

    const sideTaper = Math.sin(Math.min(1, Math.max(0, uNorm)) * Math.PI);
    const edgePinch = 0.25 + 0.75 * Math.pow(sideTaper, 0.36);

    // 5 soft gentle sculpted flutes across the back curtain
    const lobeAngle = (uNorm - 0.5) * Math.PI * 5;
    const scallopWave = Math.cos(lobeAngle);
    const lobeCrease = Math.max(0, -scallopWave);

    const hemArch =
      (isLong ? -0.02 : -0.012) * sideTaper +
      0.01 * lobeCrease * smoothstep01(0.65, 1.0, v);

    const sidePullIn = 1 - 0.14 * (1 - sideTaper);
    const rootPt = headSurfacePoint(26, lonDeg, crownOffset * 0.85);
    const midPt = headSurfacePoint(78, lonDeg, (crownOffset + 0.005) * sidePullIn);

    const midFlare = Math.sin(v * Math.PI);
    const bottomCurl = smoothstep01(0.56, 1.0, v);
    const targetR =
      bellRadius *
      sidePullIn *
      (1 + (isLong ? 0.036 : 0.032) * midFlare - (isLong ? 0.068 : 0.11) * bottomCurl);

    const p0 = new THREE.Vector3(...rootPt);
    const p1 = new THREE.Vector3(...midPt);
    const p2 = new THREE.Vector3(
      Math.sin(rad) * targetR * 1.01,
      HEAD_CY * 0.44 + hemBaseY * 0.34,
      Math.cos(rad) * targetR - 0.014,
    );
    const p3 = new THREE.Vector3(
      Math.sin(rad) * (targetR - (isLong ? 0.028 : 0.05)),
      hemBaseY + hemArch,
      Math.cos(rad) * (targetR - (isLong ? 0.024 : 0.044)) - 0.01,
    );

    const o = 1 - v;
    const center = new THREE.Vector3()
      .addScaledVector(p0, o * o * o)
      .addScaledVector(p1, 3 * o * o * v)
      .addScaledVector(p2, 3 * o * v * v)
      .addScaledVector(p3, v * v * v);

    const radialXZ = new THREE.Vector3(Math.sin(rad), 0.14 * (1 - v), Math.cos(rad)).normalize();

    const fluteDepth =
      -0.008 *
      Math.pow(lobeCrease, 1.2) *
      smoothstep01(0.28, 0.85, v) *
      (1 - 0.25 * smoothstep01(0.92, 1.0, v));

    if (thicknessSign >= 0) {
      const vThickEnv =
        (0.38 + 0.62 * smoothstep01(0.0, 0.25, v)) *
        (1 - 0.45 * smoothstep01(0.84, 1.0, v));
      center.addScaledVector(
        radialXZ,
        thicknessSign * outerHalfThick * edgePinch * vThickEnv + fluteDepth,
      );
    } else {
      const corePull = 0.114 + 0.028 * Math.sin(v * Math.PI);
      center.addScaledVector(radialXZ, -corePull * edgePinch);
    }
    return [center.x, center.y, center.z];
  };

  const outerSteps = vSegs;
  const lipSteps = 4;
  const innerSteps = vSegs;
  const loopPts: {v: number; sign: number}[] = [];

  for (let i = 0; i <= outerSteps; i++) {
    loopPts.push({v: i / outerSteps, sign: 1});
  }
  for (let i = 1; i < lipSteps; i++) {
    const ang = (i / lipSteps) * Math.PI;
    loopPts.push({v: 1.0 + 0.02 * Math.sin(ang), sign: Math.cos(ang)});
  }
  for (let i = innerSteps; i >= 0; i--) {
    loopPts.push({v: i / innerSteps, sign: -1});
  }

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const stride = uSegs + 1;

  for (let iv = 0; iv < loopPts.length; iv++) {
    const lp = loopPts[iv];
    const vClamped = Math.min(1, Math.max(0, lp.v));
    const hemDropExtra = lp.v > 1 ? -(lp.v - 1) * 0.32 : 0;
    for (let iu = 0; iu <= uSegs; iu++) {
      const uNorm = iu / uSegs;
      const pt = evalBellPoint(uNorm, vClamped, lp.sign);
      positions.push(pt[0], pt[1] + hemDropExtra, pt[2]);
      uvs.push(uNorm, vClamped);
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
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
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
  profile?: 'petal' | 'tuft' | 'quiff' | 'drape' | 'bob' | 'bell';
  outwardMode?: 'spherical' | 'drape';
  tubularSegs?: number;
  radialSegs?: number;
  roundTipScale?: number;
}

const _headCenter = new THREE.Vector3(0, HEAD_CY, 0);
const _fallbackUp = new THREE.Vector3(0, 1, 0);

/**
 * Plush, smoothly rounded polymer-clay lock geometry with soft hemispherical petal ends
 * (ZERO needle-sharp cone tips, ZERO protruding spikes).
 */
function createClayLockGeometry(
  points: [number, number, number][],
  opts: ClayLockOptions,
): THREE.BufferGeometry {
  const {
    width,
    depth,
    innerFlatten = 0.28,
    ridgeBoost = 0.1,
    edgePinch = 0.4,
    profile = 'petal',
    outwardMode = 'spherical',
    tubularSegs: tubularSegsIn = 16,
    radialSegs: radialSegsIn = 12,
    roundTipScale = 0.42,
  } = opts;
  // More rings / sides = smooth round locks (no faceted or spiky look)
  const tubularSegs = Math.max(tubularSegsIn, 24);
  const radialSegs = Math.max(radialSegsIn, 14);

  const vecs = points.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
  const curve = new THREE.CatmullRomCurve3(vecs, false, 'centripetal', 0.5);
  const safeTip = Math.max(0.28, roundTipScale);

  // Blunt, rounded lock end: the body only narrows a little, then a quarter-ellipse cap closes it
  // (no thin pointed tips).
  const curveLen = Math.max(0.05, curve.getLength());
  const capLen = Math.min(curveLen * 0.38, width * 0.9);
  const capStart = 1 - capLen / curveLen;
  const tipBody = Math.min(0.8, Math.max(0.55, safeTip + 0.14));
  const bodyTaper = (t: number) =>
    1 - (1 - tipBody) * smoothstep01(0.3, Math.max(0.35, capStart), t);
  const capScale = (t: number) => {
    if (t <= capStart) return 1;
    const k = (t - capStart) / (1 - capStart);
    return Math.max(0.03, Math.sqrt(Math.max(0, 1 - k * k)));
  };

  const evalProfileScale = (t: number): {wScale: number; dScale: number} => {
    const cap = capScale(t);
    if (profile === 'bell') {
      const rootFlare = 0.36 + 0.8 * Math.sin(Math.pow(t, 0.58) * Math.PI * 0.78);
      const body = Math.max(0.3, rootFlare * bodyTaper(t));
      return {wScale: body * cap, dScale: body * cap};
    }
    if (profile === 'quiff') {
      const rootEase = smoothstep01(0.0, 0.25, t);
      const swell = 0.9 + 0.2 * Math.sin(Math.pow(t, 0.8) * Math.PI);
      const taper = bodyTaper(t);
      return {
        wScale: (0.78 + 0.22 * rootEase) * swell * taper * cap,
        dScale: (0.58 + 0.42 * rootEase) * swell * taper * cap,
      };
    }
    // 'petal' / 'drape' / 'bob' / 'tuft': broad plush lock with a soft round end
    const rootEase = smoothstep01(0.0, 0.2, t);
    const swell = 0.94 + 0.1 * Math.sin(smoothstep01(0.1, 0.78, t) * Math.PI);
    const taper = bodyTaper(t);
    return {
      wScale: (0.82 + 0.18 * rootEase) * swell * taper * cap,
      dScale: (0.62 + 0.38 * rootEase) * swell * taper * cap,
    };
  };

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const ringStride = radialSegs + 1;

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

    // Root end is hidden inside the hair cap; the rounded tip comes from capScale() above.
    const endRound = i === 0 ? 0.72 : 1.0;

    const w = width * wScale * endRound;
    const h = depth * 1.1 * dScale * endRound;

    for (let j = 0; j <= radialSegs; j++) {
      const u = j / radialSegs;
      const theta = u * Math.PI * 2;
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);

      const sx = Math.sign(cos) * Math.pow(Math.abs(cos), 0.9);
      const absSin = Math.abs(sin);
      const pinch = Math.max(edgePinch, 0.72); // no knife-thin edges
      const edgeTaper = pinch + (1 - pinch) * Math.pow(absSin, 0.6);
      const sy = Math.sign(sin) * Math.pow(absSin, 0.88) * edgeTaper;
      const lateral = sx * w;
      const ridge = sy > 0 ? 1 + ridgeBoost * Math.pow(absSin, 1.4) : innerFlatten;
      const out = sy * h * ridge;

      positions.push(
        center.x + sideDir.x * lateral + outDir.x * out,
        center.y + sideDir.y * lateral + outDir.y * out,
        center.z + sideDir.z * lateral + outDir.z * out,
      );
      uvs.push(u, t);
    }
  }

  for (let i = 0; i < tubularSegs; i++) {
    const rowA = i * ringStride;
    const rowB = (i + 1) * ringStride;
    for (let j = 0; j < radialSegs; j++) {
      const a = rowA + j;
      const b = rowB + j;
      const c = rowB + j + 1;
      const d = rowA + j + 1;
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const startCenterIdx = positions.length / 3;
  const p0 = curve.getPointAt(0);
  const t0 = curve.getTangentAt(0).normalize();
  positions.push(p0.x - t0.x * 0.002, p0.y - t0.y * 0.002, p0.z - t0.z * 0.002);
  uvs.push(0.5, 0.0);
  for (let j = 0; j < radialSegs; j++) {
    indices.push(startCenterIdx, j, j + 1);
  }

  const endCenterIdx = positions.length / 3;
  const p1 = curve.getPointAt(1);
  const t1 = curve.getTangentAt(1).normalize();
  // Short gentle rounded dome closure (NEVER a long forward needle!)
  positions.push(p1.x + t1.x * 0.002, p1.y + t1.y * 0.002, p1.z + t1.z * 0.002);
  uvs.push(0.5, 1.0);
  const lastRow = tubularSegs * ringStride;
  for (let j = 0; j < radialSegs; j++) {
    indices.push(endCenterIdx, lastRow + j + 1, lastRow + j);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

function addLockMesh(
  grp: THREE.Group,
  steps: LockStep[],
  hairMat: THREE.Material,
  w: number,
  d: number,
  opts?: Partial<ClayLockOptions>,
) {
  grp.add(
    new THREE.Mesh(
      createClayLockGeometry(sampleHeadSteps(steps, 16), {
        width: w,
        depth: d,
        innerFlatten: 0.24,
        ridgeBoost: 0.1,
        edgePinch: 0.42,
        profile: 'petal',
        tubularSegs: 16,
        radialSegs: 12,
        roundTipScale: 0.42,
        ...opts,
      }),
      hairMat,
    ),
  );
}

/**
 * 2. HEARTOPIA FLUSH ROUNDED FOREHEAD BANGS:
 * Every bang lock hugs the forehead smoothly (offset 0.030 -> 0.011), ends cleanly at/above
 * eyebrow level (lat 70..76) with plush rounded petal tips (zero needle spikes, zero eye poke,
 * zero floating forehead horns).
 */
function buildFrontSignatureAccents(
  hairBack: HairBackStyle,
  hairFront: HairFrontStyle,
  hairMat: THREE.Material,
  hatMode: HatFitMode,
  crownOuterOffset: number,
): THREE.Group {
  const grp = new THREE.Group();
  grp.name = 'FrontHair';
  const isSnugCap = hatMode === 'snug_cap';
  const male = isMaleStyle(hairBack);

  const rootOff = isSnugCap ? 0.022 : crownOuterOffset - 0.008;
  const midOff = isSnugCap ? 0.02 : 0.03;
  const tipOff = 0.011;

  // Peeking lower bangs when wearing a snug cap / beanie / Pompompurin hood
  if (isSnugCap) {
    if (hairBack === 'boy_2' || (!male && hairFront === 'curtain')) {
      [-1, 1].forEach((side) => {
        addLockMesh(
          grp,
          [
            {lat: 54, lon: side * 8, offset: rootOff},
            {lat: 66, lon: side * 24, offset: midOff},
            {lat: 77, lon: side * 40, offset: tipOff},
          ],
          hairMat,
          0.056,
          0.016,
          {roundTipScale: 0.44},
        );
      });
    } else {
      const peekLocks = [
        {c0: -40, c1: -44, latEnd: 76, w: 0.048},
        {c0: -18, c1: -20, latEnd: 74, w: 0.05},
        {c0: 4, c1: 2, latEnd: 74, w: 0.052},
        {c0: 24, c1: 26, latEnd: 74, w: 0.05},
        {c0: 44, c1: 48, latEnd: 76, w: 0.046},
      ];
      peekLocks.forEach((l) =>
        addLockMesh(
          grp,
          [
            {lat: 54, lon: l.c0, offset: rootOff},
            {lat: 66, lon: (l.c0 + l.c1) * 0.5, offset: midOff},
            {lat: l.latEnd, lon: l.c1, offset: tipOff},
          ],
          hairMat,
          l.w,
          0.016,
          {roundTipScale: 0.46},
        ),
      );
    }
    return grp;
  }

  // Curtain / Center-parted Heartopia Bangs (Image 3 left boy, Image 4 left boy)
  if (hairBack === 'boy_2' || (!male && hairFront === 'curtain')) {
    [-1, 1].forEach((side) => {
      // Smooth rounded comma-curtain sweeping outward along forehead to outer brow/temple
      addLockMesh(
        grp,
        [
          {lat: 24, lon: side * 4, offset: rootOff},
          {lat: 48, lon: side * 16, offset: midOff + 0.003},
          {lat: 68, lon: side * 32, offset: 0.022},
          {lat: 82, lon: side * 45, offset: tipOff},
        ],
        hairMat,
        0.064,
        0.018,
        {roundTipScale: 0.44},
      );
      // Soft outer temple feather framing cheekbone cleanly
      addLockMesh(
        grp,
        [
          {lat: 32, lon: side * 20, offset: rootOff},
          {lat: 56, lon: side * 38, offset: 0.028},
          {lat: 80, lon: side * 53, offset: tipOff},
        ],
        hairMat,
        0.054,
        0.016,
        {roundTipScale: 0.44},
      );
    });
    return grp;
  }

  // Side-swept bangs
  if (!male && hairFront === 'side_sweep') {
    const sweepLocks: {steps: LockStep[]; w: number}[] = [
      {
        steps: [
          {lat: 26, lon: -16, offset: rootOff},
          {lat: 50, lon: -4, offset: midOff + 0.002},
          {lat: 72, lon: 14, offset: tipOff},
        ],
        w: 0.062,
      },
      {
        steps: [
          {lat: 28, lon: -4, offset: rootOff},
          {lat: 52, lon: 14, offset: midOff},
          {lat: 74, lon: 34, offset: tipOff},
        ],
        w: 0.056,
      },
      {
        steps: [
          {lat: 30, lon: -24, offset: rootOff},
          {lat: 54, lon: -31, offset: midOff},
          {lat: 74, lon: -38, offset: tipOff},
        ],
        w: 0.052,
      },
      {
        steps: [
          {lat: 34, lon: -38, offset: rootOff},
          {lat: 58, lon: -46, offset: 0.026},
          {lat: 79, lon: -53, offset: tipOff},
        ],
        w: 0.048,
      },
    ];
    sweepLocks.forEach((l) =>
      addLockMesh(grp, l.steps, hairMat, l.w, 0.016, {roundTipScale: 0.44}),
    );
    return grp;
  }

  // Neat rounded blunt fringe (witch_bob, midautumn_buns, Pompompurin bob)
  if (!male && (hairFront === 'neat_fringe' || hairBack === 'witch_bob' || hairBack === 'midautumn_buns')) {
    const fringeLocks = [
      {lon0: -42, lon1: -47, latEnd: 77, w: 0.05},
      {lon0: -22, lon1: -23, latEnd: 73, w: 0.052},
      {lon0: 0, lon1: 0, latEnd: 72, w: 0.054},
      {lon0: 22, lon1: 23, latEnd: 73, w: 0.052},
      {lon0: 42, lon1: 47, latEnd: 77, w: 0.05},
    ];
    fringeLocks.forEach((l, idx) =>
      addLockMesh(
        grp,
        [
          {lat: 26, lon: l.lon0 * 0.72, offset: rootOff},
          {lat: 50, lon: l.lon0, offset: midOff + (idx % 2) * 0.002},
          {lat: l.latEnd, lon: l.lon1, offset: tipOff},
        ],
        hairMat,
        l.w,
        0.016,
        {roundTipScale: 0.5},
      ),
    );
    return grp;
  }

  // Female Soft Airy Heartopia Bangs (Image 2 pink twin-tails: flush plush rounded petals)
  if (!male) {
    const airLocks = [
      {lon0: -42, lon1: -47, latEnd: 78, w: 0.052},
      {lon0: -22, lon1: -24, latEnd: 73, w: 0.052},
      {lon0: -2, lon1: 0, latEnd: 74, w: 0.052},
      {lon0: 19, lon1: 21, latEnd: 73, w: 0.052},
      {lon0: 41, lon1: 46, latEnd: 78, w: 0.052},
    ];
    airLocks.forEach((l, idx) =>
      addLockMesh(
        grp,
        [
          {lat: 26, lon: l.lon0 * 0.68, offset: rootOff},
          {lat: 50, lon: l.lon0, offset: midOff + (idx % 2) * 0.002},
          {lat: l.latEnd, lon: l.lon1, offset: tipOff},
        ],
        hairMat,
        l.w,
        0.016,
        {roundTipScale: 0.44},
      ),
    );
    return grp;
  }

  // Male flush Heartopia layered bangs (cleanly framing forehead & brows, rounded soft tips)
  const boyLocks = [
    {lon0: -43, lon1: -48, latEnd: 78, w: 0.052},
    {lon0: -22, lon1: -18, latEnd: 72, w: 0.054},
    {lon0: 0, lon1: -4, latEnd: 73, w: 0.054},
    {lon0: 21, lon1: 18, latEnd: 72, w: 0.054},
    {lon0: 42, lon1: 48, latEnd: 78, w: 0.052},
  ];
  boyLocks.forEach((l, idx) =>
    addLockMesh(
      grp,
      [
        {lat: 26, lon: l.lon0 * 0.68, offset: rootOff},
        {lat: 50, lon: l.lon0, offset: midOff + (idx % 2) * 0.002},
        {lat: l.latEnd, lon: l.lon1, offset: tipOff},
      ],
      hairMat,
      l.w,
      0.017,
      {roundTipScale: 0.42},
    ),
  );

  // Subtle rounded signature crown accents
  if (hairBack === 'short_crop') {
    const quiffWaves: {steps: LockStep[]; w: number}[] = [
      {
        steps: [
          {lat: 56, lon: -6, offset: 0.036},
          {lat: 34, lon: -14, offset: crownOuterOffset + 0.009},
          {lat: 16, lon: -24, offset: crownOuterOffset + 0.002},
        ],
        w: 0.064,
      },
      {
        steps: [
          {lat: 56, lon: 16, offset: 0.034},
          {lat: 36, lon: 6, offset: crownOuterOffset + 0.007},
          {lat: 18, lon: -4, offset: crownOuterOffset + 0.001},
        ],
        w: 0.058,
      },
    ];
    quiffWaves.forEach((q) =>
      addLockMesh(grp, q.steps, hairMat, q.w, 0.018, {profile: 'quiff', roundTipScale: 0.46}),
    );
  } else if (hairBack === 'boy_3') {
    const upperPetals: {steps: LockStep[]; w: number}[] = [
      {
        steps: [
          {lat: 14, lon: 12, offset: rootOff},
          {lat: 30, lon: -8, offset: crownOuterOffset + 0.008},
          {lat: 50, lon: -24, offset: 0.034},
        ],
        w: 0.062,
      },
      {
        steps: [
          {lat: 14, lon: 26, offset: rootOff},
          {lat: 28, lon: 56, offset: crownOuterOffset + 0.006},
          {lat: 48, lon: 78, offset: 0.03},
        ],
        w: 0.058,
      },
    ];
    upperPetals.forEach((p) =>
      addLockMesh(grp, p.steps, hairMat, p.w, 0.017, {roundTipScale: 0.44}),
    );
  } else if (hairBack === 'boy_4') {
    // Soft plush left temple curls + cute small curved ahoge
    addLockMesh(
      grp,
      [
        {lat: 34, lon: -50, offset: rootOff},
        {lat: 56, lon: -66, offset: crownOuterOffset + 0.004},
        {lat: 74, lon: -74, offset: 0.022},
      ],
      hairMat,
      0.05,
      0.017,
      {roundTipScale: 0.42},
    );
    if (hatMode === 'none') {
      grp.add(
        new THREE.Mesh(
          createClayLockGeometry(
            [
              [0.012, HEAD_CY + HEAD_RY + crownOuterOffset - 0.01, -0.01],
              [0.028, HEAD_CY + HEAD_RY + crownOuterOffset + 0.022, -0.014],
              [0.044, HEAD_CY + HEAD_RY + crownOuterOffset + 0.044, -0.018],
            ],
            {
              width: 0.018,
              depth: 0.011,
              innerFlatten: 0.6,
              edgePinch: 0.5,
              profile: 'petal',
              tubularSegs: 10,
              radialSegs: 8,
              roundTipScale: 0.38,
            },
          ),
          hairMat,
        ),
      );
    }
  } else if (hairBack === 'hero_wave') {
    addLockMesh(
      grp,
      [
        {lat: 38, lon: 6, offset: crownOuterOffset},
        {lat: 52, lon: -6, offset: 0.038},
        {lat: 64, lon: -14, offset: 0.026},
        {lat: 70, lon: -8, offset: 0.014},
      ],
      hairMat,
      0.05,
      0.017,
      {profile: 'quiff', roundTipScale: 0.42},
    );
  } else if (hairBack === 'midautumn_spiky') {
    addLockMesh(
      grp,
      [
        {lat: 16, lon: -10, offset: rootOff},
        {lat: 28, lon: -28, offset: crownOuterOffset + 0.012},
        {lat: 44, lon: -42, offset: 0.032},
      ],
      hairMat,
      0.06,
      0.018,
      {roundTipScale: 0.4},
    );
  }

  return grp;
}

/**
 * 3. SOFT CHEEK-HUGGING SIDE DRAPES:
 * Short, plush inward-curling cheek locks that frame the jawline gracefully without EVER
 * hanging down into the shoulders, arms, or hands!
 */
function buildSideCheekDrapes(
  hairBack: HairBackStyle,
  hairMat: THREE.Material,
  crownOffset: number,
  hatMode: HatFitMode,
): THREE.Group {
  const grp = new THREE.Group();
  grp.name = 'SideHair';

  if (hairBack === 'midautumn_spiky') {
    const rootOff = crownOffset * 0.84;
    [-1, 1].forEach((side) => {
      const pts: [number, number, number][] = [
        headSurfacePoint(42, side * 56, rootOff),
        headSurfacePoint(76, side * 62, 0.018),
        [side * 0.258, 0.165, 0.102],
        [side * 0.214, 0.088, 0.114],
      ];
      grp.add(
        new THREE.Mesh(
          createClayLockGeometry(pts, {
            width: 0.04,
            depth: 0.018,
            innerFlatten: 0.42,
            edgePinch: 0.42,
            profile: 'petal',
            outwardMode: 'drape',
            tubularSegs: 14,
            radialSegs: 10,
            roundTipScale: 0.44,
          }),
          hairMat,
        ),
      );
    });
    return grp;
  }

  if (isMaleStyle(hairBack) || hairBack === 'student_braids') {
    return grp;
  }

  const rootOff = crownOffset * 0.85;
  const sideOff = hatMode === 'snug_cap' ? 0.028 : crownOffset;

  [-1, 1].forEach((side) => {
    if (hairBack === 'long_wave') {
      // Soft cheek-framing curl ending gently at jawline (well clear of arms & hands!)
      const cheekPts: [number, number, number][] = [
        headSurfacePoint(30, side * 54, rootOff),
        headSurfacePoint(72, side * 61, sideOff * 0.5),
        [side * 0.274, 0.188, 0.082],
        [side * 0.228, 0.095, 0.104],
      ];
      grp.add(
        new THREE.Mesh(
          createClayLockGeometry(cheekPts, {
            width: 0.056,
            depth: 0.024,
            innerFlatten: 0.36,
            ridgeBoost: 0.12,
            edgePinch: 0.42,
            profile: 'drape',
            outwardMode: 'drape',
            tubularSegs: 16,
            radialSegs: 12,
            roundTipScale: 0.44,
          }),
          hairMat,
        ),
      );

      // Shoulder-skimming back-side curtain lock tucked BEHIND shoulder (z < 0, never near hands)
      const backSidePts: [number, number, number][] = [
        headSurfacePoint(34, side * 72, rootOff),
        headSurfacePoint(80, side * 78, sideOff * 0.45),
        [side * 0.296, 0.16, -0.028],
        [side * 0.278, 0.015, -0.055],
      ];
      grp.add(
        new THREE.Mesh(
          createClayLockGeometry(backSidePts, {
            width: 0.064,
            depth: 0.028,
            innerFlatten: 0.44,
            ridgeBoost: 0.1,
            edgePinch: 0.44,
            profile: 'drape',
            outwardMode: 'drape',
            tubularSegs: 16,
            radialSegs: 12,
            roundTipScale: 0.46,
          }),
          hairMat,
        ),
      );
      return;
    }

    if (hairBack === 'bob_cut' || hairBack === 'witch_bob') {
      const isWitch = hairBack === 'witch_bob';
      const pts: [number, number, number][] = [
        headSurfacePoint(30, side * 55, rootOff),
        headSurfacePoint(74, side * 63, sideOff * 0.48),
        [side * 0.282, 0.184, 0.072],
        [side * 0.246, isWitch ? 0.088 : 0.104, 0.086],
        [side * 0.206, isWitch ? 0.044 : 0.062, 0.094],
      ];
      grp.add(
        new THREE.Mesh(
          createClayLockGeometry(pts, {
            width: 0.064,
            depth: 0.028,
            innerFlatten: 0.42,
            ridgeBoost: 0.12,
            edgePinch: 0.44,
            profile: 'bob',
            outwardMode: 'drape',
            tubularSegs: 16,
            radialSegs: 12,
            roundTipScale: 0.48,
          }),
          hairMat,
        ),
      );
      return;
    }

    // Tied styles (ponytail, twin_tails, twin_buns, midautumn_buns): delicate cheek curl
    const pts: [number, number, number][] = [
      headSurfacePoint(42, side * 56, hatMode === 'snug_cap' ? 0.026 : crownOffset * 0.72),
      headSurfacePoint(76, side * 62, sideOff * 0.4),
      [side * 0.264, 0.194, 0.095],
      [side * 0.222, 0.118, 0.112],
    ];
    grp.add(
      new THREE.Mesh(
        createClayLockGeometry(pts, {
          width: 0.044,
          depth: 0.02,
          innerFlatten: 0.36,
          ridgeBoost: 0.1,
          edgePinch: 0.42,
          profile: 'petal',
          outwardMode: 'drape',
          tubularSegs: 14,
          radialSegs: 10,
          roundTipScale: 0.44,
        }),
        hairMat,
      ),
    );
  });

  return grp;
}

/**
 * 4. BACK HAIR:
 * - `long_wave`, `bob_cut`, `witch_bob`: Unified smooth sculpted clay bell.
 * - `ponytail` & `twin_tails`: Plush rounded Heartopia teardrops (zero pointy spikes!).
 * - `student_braids`: Smooth sculpted chest braids clear of arms/hands.
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
  if (hairBack === 'long_wave' || hairBack === 'bob_cut' || hairBack === 'witch_bob') {
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
    const rootOff = isSnugCap ? 0.038 : crownOffset + 0.004;
    const rootPt = headSurfacePoint(rootLat, 180, rootOff);

    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), hairMat);
    knot.position.set(rootPt[0], rootPt[1], rootPt[2]);
    backHairGroup.add(knot);

    const tie = new THREE.Mesh(
      new THREE.TorusGeometry(0.052, 0.015, 10, 18),
      tieMat,
    );
    tie.position.set(rootPt[0], rootPt[1], rootPt[2]);
    tie.rotation.x = -0.28;
    accGroup.add(tie);

    const ryOffset = isSnugCap ? -0.055 : 0.0;
    backHairGroup.add(
      new THREE.Mesh(
        createClayLockGeometry(
          [
            rootPt,
            [0, 0.35 + ryOffset, -0.39],
            [0, 0.19 + ryOffset, -0.47],
            [0, 0.04 + ryOffset, -0.43],
          ],
          {
            width: 0.082,
            depth: 0.056,
            innerFlatten: 0.58,
            ridgeBoost: 0.14,
            edgePinch: 0.44,
            profile: 'bell',
            outwardMode: 'drape',
            tubularSegs: 18,
            radialSegs: 14,
            roundTipScale: 0.44,
          },
        ),
        hairMat,
      ),
    );
    return;
  }

  if (hairBack === 'twin_tails') {
    [-1, 1].forEach((side) => {
      const rootLat = isSnugCap ? 88 : 78;
      const rootPt = headSurfacePoint(rootLat, side * 116, isSnugCap ? 0.036 : crownOffset + 0.004);
      const radialOut = new THREE.Vector3(
        rootPt[0],
        rootPt[1] - HEAD_CY,
        rootPt[2],
      ).normalize();

      const knot = new THREE.Mesh(new THREE.SphereGeometry(0.044, 14, 12), hairMat);
      knot.position.set(rootPt[0], rootPt[1], rootPt[2]);
      backHairGroup.add(knot);

      const tie = new THREE.Mesh(
        new THREE.TorusGeometry(0.048, 0.015, 10, 18),
        tieMat,
      );
      tie.position.set(rootPt[0], rootPt[1], rootPt[2]);
      tie.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), radialOut);
      accGroup.add(tie);

      const yAdj = isSnugCap ? -0.045 : 0;
      // Plush Heartopia twin-tail bell + soft back companion lock (rounded tips, stays clear of hands!)
      const bunches: {pts: [number, number, number][]; w: number; d: number; tip: number}[] = [
        {
          pts: [
            rootPt,
            [side * 0.395, 0.24 + yAdj, -0.155],
            [side * 0.44, 0.1 + yAdj, -0.175],
            [side * 0.4, -0.02 + yAdj, -0.14],
          ],
          w: 0.072,
          d: 0.05,
          tip: 0.46,
        },
        {
          pts: [
            rootPt,
            [side * 0.355, 0.22 + yAdj, -0.2],
            [side * 0.375, 0.09 + yAdj, -0.22],
            [side * 0.34, -0.01 + yAdj, -0.185],
          ],
          w: 0.046,
          d: 0.034,
          tip: 0.42,
        },
      ];
      bunches.forEach((b) =>
        backHairGroup.add(
          new THREE.Mesh(
            createClayLockGeometry(b.pts, {
              width: b.w,
              depth: b.d,
              innerFlatten: 0.56,
              ridgeBoost: 0.12,
              edgePinch: 0.45,
              profile: 'bell',
              outwardMode: 'drape',
              tubularSegs: 16,
              radialSegs: 14,
              roundTipScale: b.tip,
            }),
            hairMat,
          ),
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
      const pBun = headSurfacePoint(bunLat, side * bunLon, isSnugCap ? 0.044 : crownOffset * 0.84);
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
    return;
  }

  if (hairBack === 'midautumn_buns') {
    const crimsonMat = new THREE.MeshStandardMaterial({
      color: '#DF2930',
      roughness: 0.52,
      metalness: 0.02,
    });
    const goldTieMat = new THREE.MeshStandardMaterial({
      color: '#F5C43E',
      roughness: 0.35,
      metalness: 0.25,
    });
    const jadeMat = new THREE.MeshStandardMaterial({
      color: '#4EB869',
      roughness: 0.22,
      metalness: 0.08,
    });

    const braidBeadGeo = new THREE.SphereGeometry(0.026, 10, 8);
    [-1, 1].forEach((side) => {
      if (!isSnugCap) {
        const archPts = [
          new THREE.Vector3(side * 0.022, HEAD_CY + HEAD_RY + crownOffset - 0.015, 0.015),
          new THREE.Vector3(side * 0.16, HEAD_CY + HEAD_RY + crownOffset + 0.082, 0.005),
          new THREE.Vector3(side * 0.295, HEAD_CY + HEAD_RY + crownOffset + 0.055, -0.012),
          new THREE.Vector3(side * 0.375, HEAD_CY + 0.175, -0.018),
          new THREE.Vector3(side * 0.35, HEAD_CY + 0.02, -0.02),
        ];
        const archCurve = new THREE.CatmullRomCurve3(archPts);
        for (let b = 0; b <= 11; b++) {
          const t = b / 11;
          const p = archCurve.getPointAt(t);
          const bead = new THREE.Mesh(braidBeadGeo, hairMat);
          bead.position.copy(p);
          const s = 0.85 + 0.35 * Math.sin(t * Math.PI);
          bead.scale.set(s, s * 0.92, s * 0.92);
          backHairGroup.add(bead);
        }
      }

      const bunAnchor = new THREE.Vector3(side * 0.345, HEAD_CY - 0.005, -0.022);
      const sideBun = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.032, 10, 18), hairMat);
      sideBun.position.copy(bunAnchor);
      sideBun.rotation.y = side * 0.55;
      const bunCore = new THREE.Mesh(new THREE.SphereGeometry(0.056, 12, 10), hairMat);
      bunCore.position.copy(bunAnchor);
      backHairGroup.add(sideBun, bunCore);

      const tieKnot = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), goldTieMat);
      tieKnot.position.set(side * 0.36, HEAD_CY + 0.048, 0.012);
      const tieLoopL = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.008, 6, 12), goldTieMat);
      tieLoopL.position.set(side * 0.348, HEAD_CY + 0.068, 0.02);
      tieLoopL.rotation.z = side * 0.45;
      const tasselCap = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.025, 10), goldTieMat);
      tasselCap.position.set(side * 0.365, HEAD_CY + 0.022, 0.016);
      const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.115, 12), crimsonMat);
      tassel.position.set(side * 0.368, HEAD_CY - 0.038, 0.018);
      accGroup.add(tieKnot, tieLoopL, tasselCap, tassel);

      const stud = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), goldTieMat);
      stud.position.set(side * 0.312, HEAD_CY - 0.072, 0.052);
      const jadeOrb = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 10), jadeMat);
      jadeOrb.position.set(side * 0.318, HEAD_CY - 0.112, 0.055);
      accGroup.add(stud, jadeOrb);

      backHairGroup.add(
        new THREE.Mesh(
          createClayLockGeometry(
            [
              [side * 0.25, HEAD_CY - 0.06, -0.14],
              [side * 0.32, HEAD_CY - 0.16, -0.155],
              [side * 0.36, HEAD_CY - 0.24, -0.1],
            ],
            {
              width: 0.072,
              depth: 0.044,
              innerFlatten: 0.65,
              edgePinch: 0.44,
              profile: 'drape',
              outwardMode: 'drape',
              tubularSegs: 14,
              radialSegs: 12,
              roundTipScale: 0.42,
            },
          ),
          hairMat,
        ),
      );
    });
    return;
  }

  if (hairBack === 'student_braids') {
    const crimsonBowMat = new THREE.MeshStandardMaterial({
      color: '#DF3038',
      roughness: 0.44,
      metalness: 0.04,
    });
    const plaitGeo = new THREE.SphereGeometry(0.029, 12, 10);

    [-1, 1].forEach((side) => {
      const rootPt = headSurfacePoint(
        isSnugCap ? 100 : 94,
        side * 108,
        isSnugCap ? 0.026 : crownOffset * 0.65,
      );
      // Tucked smoothly over front collarbone, ending cleanly on upper chest (never into arms/hands!)
      const pts = [
        new THREE.Vector3(rootPt[0], rootPt[1], rootPt[2]),
        new THREE.Vector3(side * 0.275, 0.135, 0.032),
        new THREE.Vector3(side * 0.242, 0.045, 0.122),
        new THREE.Vector3(side * 0.198, -0.042, 0.165),
        new THREE.Vector3(side * 0.184, -0.105, 0.172),
      ];
      const braidCurve = new THREE.CatmullRomCurve3(pts);

      const steps = 11;
      for (let i = 0; i < steps; i++) {
        const u = (i / (steps - 1)) * 0.74;
        const p = braidCurve.getPointAt(u);
        const tan = braidCurve.getTangentAt(u).normalize();
        const taper = 1.0 - u * 0.36;
        const alt = i % 2 === 0 ? 1 : -1;

        const segA = new THREE.Mesh(plaitGeo, hairMat);
        segA.position.set(p.x + side * alt * 0.007, p.y, p.z + 0.004);
        segA.scale.set(0.76 * taper, 1.28 * taper, 0.56 * taper);
        segA.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), tan);
        segA.rotateZ(alt * 0.5);

        const segB = new THREE.Mesh(plaitGeo, hairMat);
        segB.position.set(p.x - side * alt * 0.007, p.y - 0.003, p.z - 0.003);
        segB.scale.set(0.74 * taper, 1.24 * taper, 0.54 * taper);
        segB.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), tan);
        segB.rotateZ(-alt * 0.5);

        backHairGroup.add(segA, segB);
      }

      const tiePos = braidCurve.getPointAt(0.75);
      const tieBand = new THREE.Mesh(
        new THREE.TorusGeometry(0.024, 0.0085, 8, 16),
        crimsonBowMat,
      );
      tieBand.position.copy(tiePos);
      tieBand.rotation.x = Math.PI / 2 - 0.18;
      accGroup.add(tieBand);

      const bowKnot = new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 8), crimsonBowMat);
      bowKnot.position.set(tiePos.x, tiePos.y, tiePos.z + 0.022);
      accGroup.add(bowKnot);

      [-1, 1].forEach((bSide) => {
        const loop = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 8), crimsonBowMat);
        loop.scale.set(1.36, 0.72, 0.38);
        loop.position.set(tiePos.x + bSide * 0.022, tiePos.y + 0.006, tiePos.z + 0.022);
        loop.rotation.z = bSide * 0.34;
        const tail = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.046, 8), crimsonBowMat);
        tail.position.set(tiePos.x + bSide * 0.013, tiePos.y - 0.02, tiePos.z + 0.02);
        tail.rotation.z = bSide * 0.28;
        accGroup.add(loop, tail);
      });

      const tipStart = braidCurve.getPointAt(0.74);
      const tipEnd = braidCurve.getPointAt(1.0);
      backHairGroup.add(
        new THREE.Mesh(
          createClayLockGeometry(
            [
              [tipStart.x, tipStart.y, tipStart.z],
              [(tipStart.x + tipEnd.x) * 0.5, (tipStart.y + tipEnd.y) * 0.5, tipEnd.z + 0.003],
              [tipEnd.x, tipEnd.y, tipEnd.z],
            ],
            {
              width: 0.036,
              depth: 0.024,
              innerFlatten: 0.5,
              edgePinch: 0.45,
              profile: 'bell',
              outwardMode: 'drape',
              tubularSegs: 12,
              radialSegs: 10,
              roundTipScale: 0.44,
            },
          ),
          hairMat,
        ),
      );
    });
    return;
  }

  if (hairBack === 'midautumn_spiky') {
    const crimsonMat = new THREE.MeshStandardMaterial({
      color: '#DF2930',
      roughness: 0.52,
      metalness: 0.02,
    });
    [-1, 1].forEach((side) => {
      const tieRibbon = new THREE.Mesh(
        new THREE.ConeGeometry(0.022, 0.13, 8),
        crimsonMat,
      );
      tieRibbon.position.set(side * 0.115, HEAD_CY - 0.16, -0.255);
      tieRibbon.rotation.z = side * 0.38;
      tieRibbon.rotation.x = 0.24;
      accGroup.add(tieRibbon);
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
    config.hairFront,
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

  // Standardized Attachment Points hugging the outer sleek silhouette cleanly
  const isSnugCap = hatMode === 'snug_cap';
  const crownY = HEAD_CY + HEAD_RY + crownOuterOffset;
  const sideSurf = headSurfacePoint(68, 90, isSnugCap ? 0.032 : crownOuterOffset * 0.56);
  const headbandRadius = Math.min(0.368, Math.max(0.348, Math.abs(sideSurf[0]) + 0.006));

  const templeL = headSurfacePoint(64, -50, isSnugCap ? 0.046 : crownOuterOffset * 0.68 + 0.01);
  const templeR = headSurfacePoint(64, 50, isSnugCap ? 0.046 : crownOuterOffset * 0.68 + 0.01);
  const foreheadPt = headSurfacePoint(54, 0, isSnugCap ? 0.05 : crownOuterOffset * 0.82);
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
