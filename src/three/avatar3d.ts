import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {PET_CATALOG} from '../data/petCatalog';
import {AvatarConfig, AvatarPose, BbqFoodId, PetSpeciesId, ToolId} from '../types/game';
import {
  buildCharacterHair,
  createHairClayMaterial,
  headSurfacePoint,
} from './hairSystem';
import {clayMat, glossyClayMat, makeShadowed} from './materials';
import {buildPetModel, PetRig, updatePetAnimation} from './pets3d';

export type HoldPose =
  | 'none'
  | 'carry_front'
  | 'carry_bag'
  | 'carry_umbrella'
  | 'carry_net';

const HEAD_PIVOT_Y = 0.968;

const HAND_POSES: Record<HoldPose, {armX: number; armZ: number; elbowX: number; elbowZ: number}> = {
  none: {armX: 0, armZ: 0.36, elbowX: -0.12, elbowZ: -0.05},
  carry_umbrella: {armX: -0.46, armZ: 0.62, elbowX: -0.94, elbowZ: 0.18},
  carry_front: {armX: -0.42, armZ: 0.44, elbowX: -0.98, elbowZ: 0.08},
  carry_bag: {armX: -0.06, armZ: 0.48, elbowX: -0.14, elbowZ: 0.06},
  carry_net: {armX: -1.16, armZ: 0.24, elbowX: -1.24, elbowZ: -0.18},
};

export interface AvatarMountAnimParams {
  pushPhase?: number;
  idlePop?: number;
  idleBlend?: number;
  leanAngle?: number;
  crankAngle?: number;
  steerAngle?: number;
}

export interface SkirtDeformPair {
  mesh: THREE.Mesh;
  standGeo: THREE.BufferGeometry;
  sitGeo: THREE.BufferGeometry;
  bikeGeo: THREE.BufferGeometry;
}

export interface AvatarRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  torsoGroup?: THREE.Group;
  skirtPivot?: THREE.Group;
  skirtDeformMeshes?: SkirtDeformPair[];
  aoDaiFrontPanel?: THREE.Group;
  aoDaiBackPanel?: THREE.Group;
  wingsGroup?: THREE.Group;
  leftWing?: THREE.Group;
  rightWing?: THREE.Group;
  headPivot: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftElbow?: THREE.Group;
  rightElbow?: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftKnee?: THREE.Group;
  rightKnee?: THREE.Group;
  eyelids: THREE.Mesh[];
  openEyeGroup?: THREE.Group;
  closedEyeGroup?: THREE.Group;
  skipNaturalBlink?: boolean;
  shadowDisc?: THREE.Mesh;
  parachuteGroup?: THREE.Group;
  holdPose?: HoldPose;
  toolType?: ToolId | null;
  rodBobber?: THREE.Object3D;
  rodLine?: THREE.Object3D;
  rodMidPivot?: THREE.Group;
  rodTipPivot?: THREE.Group;
  heldPetRig?: PetRig;
  headTopAbovePivot: number;
}

function shadeHex(hex: string, factor: number): THREE.Color {
  const c = new THREE.Color(hex);
  const hsl = {h: 0, s: 0, l: 0};
  c.getHSL(hsl);
  const nextL = Math.min(0.92, Math.max(0.12, hsl.l + factor));
  c.setHSL(hsl.h, hsl.s, nextL);
  return c;
}

const _eyeTexCache = new Map<string, THREE.CanvasTexture>();
const _mouthTexCache = new Map<string, THREE.CanvasTexture>();

function drawFourPointStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  outerR: number,
  innerR: number,
) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = (i * Math.PI) / 4;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function createChibiEyeTexture(
  eyeColor: string,
  style: AvatarConfig['eyeStyle'] | 'sleep_closed',
  side: -1 | 1,
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const effectiveStyle: AvatarConfig['eyeStyle'] | 'sleep_closed' =
    style === 'wink' ? (side === 1 ? 'happy_arc' : 'bright') : style;
  const key = `chibi_eye_v3_${eyeColor}_${effectiveStyle}_${side}`;
  const cached = _eyeTexCache.get(key);
  if (cached) return cached;

  const w = 320;
  const h = 280;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, w, h);

  const cx = w * 0.5;
  const cy = h * 0.56;
  // side === -1 is viewer's left eye (inner corner toward +X / canvas right)
  const dir = side === -1 ? 1 : -1;

  if (effectiveStyle === 'sleep_closed' || effectiveStyle === 'happy_arc') {
    ctx.strokeStyle = '#241814';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (effectiveStyle === 'sleep_closed') {
      ctx.lineWidth = 15;
      ctx.beginPath();
      ctx.moveTo(cx - 88, cy - 4);
      ctx.quadraticCurveTo(cx, cy + 32, cx + 88, cy - 4);
      ctx.stroke();
    } else {
      ctx.lineWidth = 18;
      ctx.beginPath();
      ctx.moveTo(cx - 90, cy + 20);
      ctx.quadraticCurveTo(cx, cy - 44, cx + 90, cy + 20);
      ctx.stroke();
      // Cute outer lash flick
      ctx.lineWidth = 11;
      ctx.beginPath();
      ctx.moveTo(cx - dir * 78, cy + 10);
      ctx.quadraticCurveTo(cx - dir * 94, cy + 4, cx - dir * 102, cy - 12);
      ctx.stroke();
    }
  } else if (effectiveStyle === 'joy_xd') {
    ctx.strokeStyle = '#1E1512';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 21;

    // Viewer left eye draws '>' pointing inward (+X), viewer right eye draws '<' pointing inward (-X)
    const tipX = cx + dir * 72;
    const tailX = cx - dir * 76;
    const armY = 56;
    ctx.beginPath();
    ctx.moveTo(tailX, cy - armY);
    ctx.quadraticCurveTo(cx + dir * 12, cy - armY * 0.32, tipX, cy);
    ctx.quadraticCurveTo(cx + dir * 12, cy + armY * 0.32, tailX, cy + armY);
    ctx.stroke();
  } else {
    // Rich expressive big chibi eyes: 'bright', 'gentle', 'sparkle', 'heroic', 'cool'
    const darkHex = `#${shadeHex(eyeColor, -0.34).getHexString()}`;
    const midHex = `#${new THREE.Color(eyeColor).getHexString()}`;
    const lightHex = `#${shadeHex(eyeColor, 0.26).getHexString()}`;
    const rimHex = `#${shadeHex(eyeColor, -0.42).getHexString()}`;
    const lashColor = effectiveStyle === 'gentle' ? '#362016' : '#1B1516';

    const traceEyeShape = () => {
      ctx.beginPath();
      if (effectiveStyle === 'cool') {
        const halfW = 104;
        const topY = cy - 36;
        const botY = cy + 52;
        ctx.moveTo(cx - halfW, topY + 6);
        ctx.quadraticCurveTo(cx, topY - 12, cx + halfW, topY + 6);
        ctx.bezierCurveTo(
          cx + halfW - 6,
          botY + 12,
          cx - halfW + 6,
          botY + 12,
          cx - halfW,
          topY + 6,
        );
      } else if (effectiveStyle === 'gentle') {
        // Warm, softly droopy-outer large oval chibi eye
        ctx.ellipse(cx, cy + 4, 102, 92, dir * -0.07, 0, Math.PI * 2);
      } else if (effectiveStyle === 'sparkle') {
        ctx.ellipse(cx, cy, 106, 98, 0, 0, Math.PI * 2);
      } else if (effectiveStyle === 'heroic') {
        // Bold rounded-almond chibi eye with crisp outer lift
        const rx = 104;
        const ry = 88;
        ctx.moveTo(cx - dir * rx, cy - 10);
        ctx.bezierCurveTo(
          cx - dir * (rx * 0.65),
          cy - ry * 1.15,
          cx + dir * (rx * 0.62),
          cy - ry * 1.06,
          cx + dir * rx,
          cy + 8,
        );
        ctx.bezierCurveTo(
          cx + dir * (rx * 0.65),
          cy + ry * 1.04,
          cx - dir * (rx * 0.58),
          cy + ry * 1.05,
          cx - dir * rx,
          cy - 10,
        );
      } else {
        // 'bright': classic big luminous Nendoroid-style rounded eye
        ctx.ellipse(cx, cy + 2, 104, 94, 0, 0, Math.PI * 2);
      }
      ctx.closePath();
    };

    // 1. Sclera + subtle soft top lid shade
    ctx.save();
    traceEyeShape();
    ctx.clip();

    ctx.fillStyle = '#FFFDFB';
    ctx.fillRect(0, 0, w, h);

    const lidShade = ctx.createLinearGradient(0, cy - 96, 0, cy - 16);
    lidShade.addColorStop(0, 'rgba(155, 145, 175, 0.30)');
    lidShade.addColorStop(1, 'rgba(255, 253, 251, 0)');
    ctx.fillStyle = lidShade;
    ctx.fillRect(0, cy - 104, w, 94);

    // 2. Large Soulful Iris & Pupil
    const irisRx =
      effectiveStyle === 'cool'
        ? 54
        : effectiveStyle === 'sparkle'
          ? 78
          : effectiveStyle === 'gentle'
            ? 74
            : 75;
    const irisRy =
      effectiveStyle === 'cool'
        ? 52
        : effectiveStyle === 'sparkle'
          ? 84
          : effectiveStyle === 'gentle'
            ? 80
            : 80;
    const irisCx =
      cx +
      dir *
        (effectiveStyle === 'heroic' ? 5 : effectiveStyle === 'gentle' ? 6 : 2);
    const irisCy =
      effectiveStyle === 'cool'
        ? cy + 12
        : effectiveStyle === 'gentle'
          ? cy + 8
          : cy + 5;

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(irisCx, irisCy, irisRx, irisRy, 0, 0, Math.PI * 2);
    ctx.clip();

    const grad = ctx.createLinearGradient(0, irisCy - irisRy, 0, irisCy + irisRy);
    grad.addColorStop(0.0, darkHex);
    grad.addColorStop(0.45, midHex);
    grad.addColorStop(0.84, lightHex);
    grad.addColorStop(1.0, midHex);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Luminous lower iris crescent glow
    const glow = ctx.createRadialGradient(
      irisCx,
      irisCy + irisRy * 0.48,
      6,
      irisCx,
      irisCy + irisRy * 0.42,
      irisRx * 0.85,
    );
    glow.addColorStop(0, 'rgba(255, 255, 255, 0.58)');
    glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    // Crisp deep pupil
    ctx.beginPath();
    ctx.ellipse(
      irisCx,
      irisCy - irisRy * 0.04,
      irisRx * 0.46,
      irisRy * 0.46,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = '#17131B';
    ctx.fill();

    ctx.restore();

    // Subtle iris outline ring
    ctx.beginPath();
    ctx.ellipse(irisCx, irisCy, irisRx, irisRy, 0, 0, Math.PI * 2);
    ctx.lineWidth = 4.5;
    ctx.strokeStyle = rimHex;
    ctx.stroke();

    // Glossy anime/chibi specular catchlights
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(
      irisCx - irisRx * 0.36,
      irisCy - irisRy * 0.34,
      irisRx * 0.28,
      irisRy * 0.25,
      -0.28,
      0,
      Math.PI * 2,
    );
    ctx.fill();

    if (effectiveStyle !== 'cool') {
      // Secondary bottom-right bounce dot
      ctx.beginPath();
      ctx.arc(
        irisCx + irisRx * 0.34,
        irisCy + irisRy * 0.38,
        irisRx * (effectiveStyle === 'sparkle' ? 0.17 : 0.13),
        0,
        Math.PI * 2,
      );
      ctx.fill();

      // Tiny crisp upper-right glint
      ctx.beginPath();
      ctx.arc(
        irisCx + irisRx * 0.28,
        irisCy - irisRy * 0.42,
        irisRx * 0.09,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(irisCx + irisRx * 0.3, irisCy + irisRy * 0.28, irisRx * 0.1, 0, Math.PI * 2);
      ctx.fill();
    }

    if (effectiveStyle === 'sparkle') {
      ctx.fillStyle = '#FFFDF8';
      drawFourPointStar(
        ctx,
        irisCx - irisRx * 0.12,
        irisCy + irisRy * 0.42,
        irisRx * 0.2,
        irisRx * 0.07,
      );
    }

    ctx.restore();

    // 3. Crisp Upper Eyelash Wing & Gentle Lower Rim
    ctx.strokeStyle = lashColor;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (effectiveStyle === 'cool') {
      ctx.lineWidth = 15;
      ctx.beginPath();
      ctx.moveTo(cx - dir * 112, cy - 34);
      ctx.quadraticCurveTo(cx, cy - 48, cx + dir * 106, cy - 28);
      ctx.stroke();

      ctx.lineWidth = 6;
      ctx.strokeStyle = 'rgba(42, 30, 26, 0.72)';
      ctx.beginPath();
      ctx.moveTo(cx - dir * 84, cy + 54);
      ctx.quadraticCurveTo(cx, cy + 62, cx + dir * 82, cy + 54);
      ctx.stroke();
    } else if (effectiveStyle === 'gentle') {
      ctx.lineWidth = 17;
      ctx.beginPath();
      ctx.moveTo(cx - dir * 106, cy - 12);
      ctx.quadraticCurveTo(cx - dir * 88, cy - 24, cx - dir * 68, cy - 58);
      ctx.bezierCurveTo(
        cx - dir * 32,
        cy - 92,
        cx + dir * 50,
        cy - 92,
        cx + dir * 94,
        cy - 18,
      );
      ctx.stroke();

      ctx.lineWidth = 5.5;
      ctx.strokeStyle = 'rgba(62, 36, 24, 0.58)';
      ctx.beginPath();
      ctx.moveTo(cx - dir * 74, cy + 72);
      ctx.quadraticCurveTo(cx, cy + 94, cx + dir * 74, cy + 70);
      ctx.stroke();
    } else {
      // 'bright', 'sparkle', 'heroic': thick velvety curved upper lash + adorable outer wing
      const outerX = cx - dir * 104;
      const innerX = cx + dir * 98;
      const peakY =
        effectiveStyle === 'sparkle'
          ? cy - 98
          : effectiveStyle === 'heroic'
            ? cy - 88
            : cy - 94;

      ctx.lineWidth = effectiveStyle === 'heroic' ? 19 : 18;
      ctx.beginPath();
      ctx.moveTo(outerX - dir * 14, cy - 22);
      ctx.quadraticCurveTo(outerX + dir * 4, cy - 16, outerX + dir * 18, cy - 42);
      ctx.bezierCurveTo(
        cx - dir * 42,
        peakY,
        cx + dir * 50,
        peakY + 8,
        innerX,
        cy + 4,
      );
      ctx.stroke();

      if (effectiveStyle === 'sparkle') {
        // Extra cute dainty upper-outer lash accent
        ctx.lineWidth = 8.5;
        ctx.beginPath();
        ctx.moveTo(outerX + dir * 10, cy - 48);
        ctx.lineTo(outerX - dir * 10, cy - 60);
        ctx.stroke();
      }

      // Soft lower contour
      ctx.lineWidth = 5.5;
      ctx.strokeStyle = 'rgba(42, 28, 24, 0.65)';
      ctx.beginPath();
      ctx.moveTo(outerX + dir * 24, cy + 68);
      ctx.quadraticCurveTo(
        cx,
        cy + (effectiveStyle === 'sparkle' ? 98 : 90),
        innerX - dir * 22,
        cy + 66,
      );
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  _eyeTexCache.set(key, tex);
  return tex;
}

function createChibiMouthTexture(
  expr: AvatarConfig['expression'],
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const key = `chibi_mouth_v3_${expr}`;
  const cached = _mouthTexCache.get(key);
  if (cached) return cached;

  const w = 320;
  const h = 260;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, w, h);
  const cx = w * 0.5;
  const noseY = h * 0.22;
  const mouthY = h * 0.58;

  // Tiny sculpted warm nose button with soft highlight
  ctx.fillStyle = expr === 'joy_open' ? '#CF6B6F' : '#C27C62';
  ctx.beginPath();
  ctx.ellipse(cx, noseY, 6.2, 4.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 232, 218, 0.72)';
  ctx.beginPath();
  ctx.arc(cx - 1.8, noseY - 1.4, 2.0, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (expr === 'sweet_smile') {
    ctx.strokeStyle = '#582D24';
    ctx.lineWidth = 11.5;
    ctx.beginPath();
    ctx.moveTo(cx - 46, mouthY - 14);
    ctx.quadraticCurveTo(cx, mouthY + 24, cx + 46, mouthY - 14);
    ctx.stroke();

    // Subtle rosy corner dimples
    ctx.fillStyle = 'rgba(220, 120, 118, 0.45)';
    ctx.beginPath();
    ctx.arc(cx - 50, mouthY - 12, 5.5, 0, Math.PI * 2);
    ctx.arc(cx + 50, mouthY - 12, 5.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (expr === 'joy_open') {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx - 46, mouthY - 14);
    ctx.quadraticCurveTo(cx, mouthY - 8, cx + 46, mouthY - 14);
    ctx.bezierCurveTo(cx + 46, mouthY + 38, cx - 46, mouthY + 38, cx - 46, mouthY - 14);
    ctx.closePath();
    ctx.fillStyle = '#A83844';
    ctx.fill();
    ctx.clip();

    // Crisp white upper teeth band
    ctx.fillStyle = '#FFFDF9';
    ctx.fillRect(cx - 44, mouthY - 16, 88, 14);

    // Warm pink tongue
    ctx.beginPath();
    ctx.ellipse(cx, mouthY + 22, 34, 19, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#F68B97';
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = '#4A2220';
    ctx.lineWidth = 5.5;
    ctx.beginPath();
    ctx.moveTo(cx - 46, mouthY - 14);
    ctx.quadraticCurveTo(cx, mouthY - 8, cx + 46, mouthY - 14);
    ctx.bezierCurveTo(cx + 46, mouthY + 38, cx - 46, mouthY + 38, cx - 46, mouthY - 14);
    ctx.stroke();
  } else if (expr === 'cat_w') {
    ctx.strokeStyle = '#48241C';
    ctx.lineWidth = 11.5;
    ctx.beginPath();
    ctx.moveTo(cx - 46, mouthY - 6);
    ctx.quadraticCurveTo(cx - 24, mouthY + 22, cx, mouthY - 2);
    ctx.quadraticCurveTo(cx + 24, mouthY + 22, cx + 46, mouthY - 6);
    ctx.stroke();
  } else if (expr === 'gentle_o') {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, mouthY + 4, 21, 24, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#A83844';
    ctx.fill();
    ctx.clip();
    ctx.beginPath();
    ctx.ellipse(cx, mouthY + 19, 19, 14, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#F48E99';
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = '#4E2422';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(cx, mouthY + 4, 21, 24, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (expr === 'confident') {
    ctx.strokeStyle = '#38201B';
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.moveTo(cx - 44, mouthY + 2);
    ctx.quadraticCurveTo(cx + 6, mouthY + 8, cx + 48, mouthY - 12);
    ctx.stroke();
  } else if (expr === 'pout') {
    ctx.strokeStyle = '#38201B';
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.moveTo(cx - 34, mouthY + 14);
    ctx.quadraticCurveTo(cx - 2, mouthY - 14, cx + 28, mouthY + 12);
    ctx.stroke();

    // Cute side puff cheek curve
    ctx.lineWidth = 8.5;
    ctx.beginPath();
    ctx.moveTo(cx + 22, mouthY - 8);
    ctx.quadraticCurveTo(cx + 42, mouthY + 6, cx + 24, mouthY + 24);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  _mouthTexCache.set(key, tex);
  return tex;
}

/**
 * Curved conformal surface patch sampled directly from `headSurfacePoint`
 * so procedural eye and mouth decals wrap flush on the clay head with zero clipping.
 */
function createHeadConformalPatchGeometry(
  latMin: number,
  latMax: number,
  lonMin: number,
  lonMax: number,
  loft = 0.0028,
  segU = 18,
  segV = 14,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let iv = 0; iv <= segV; iv++) {
    const v = iv / segV;
    const lat = THREE.MathUtils.lerp(latMax, latMin, v);
    for (let iu = 0; iu <= segU; iu++) {
      const u = iu / segU;
      const lon = THREE.MathUtils.lerp(lonMin, lonMax, u);
      const [px, py, pz] = headSurfacePoint(lat, lon, loft);
      positions.push(px, py, pz);
      uvs.push(u, v);
    }
  }

  const stride = segU + 1;
  for (let iv = 0; iv < segV; iv++) {
    for (let iu = 0; iu < segU; iu++) {
      const a = iv * stride + iu;
      const b = a + 1;
      const d = (iv + 1) * stride + iu;
      const c = d + 1;
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

/**
 * Smooth tapered 3D clay stroke (for delicate anime brows, winged lashes, squint lids, and mouths).
 */
function createTaperedTubeGeometry(
  pts: [number, number, number][],
  baseRadius: number,
  tubularSegs = 14,
  radialSegs = 8,
  tipScale = 0.22,
): THREE.BufferGeometry {
  const vecs = pts.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
  const curve = new THREE.CatmullRomCurve3(vecs, false, 'centripetal', 0.5);
  const positions: number[] = [];
  const indices: number[] = [];
  const upRef = new THREE.Vector3(0, 0, 1);

  for (let i = 0; i <= tubularSegs; i++) {
    const t = i / tubularSegs;
    const c = curve.getPointAt(t);
    const tan = curve.getTangentAt(t).normalize();
    const normal = upRef.clone().addScaledVector(tan, -upRef.dot(tan));
    if (normal.lengthSq() < 1e-4) normal.set(0, 1, 0);
    normal.normalize();
    const binorm = tan.clone().cross(normal).normalize();

    const arch = Math.sin(t * Math.PI);
    const r = baseRadius * (tipScale + (1 - tipScale) * Math.pow(arch, 0.55));
    for (let j = 0; j < radialSegs; j++) {
      const th = (j / radialSegs) * Math.PI * 2;
      const cos = Math.cos(th);
      const sin = Math.sin(th);
      positions.push(
        c.x + (normal.x * cos + binorm.x * sin) * r,
        c.y + (normal.y * cos + binorm.y * sin) * r,
        c.z + (normal.z * cos + binorm.z * sin) * r,
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

  const startIdx = positions.length / 3;
  const p0 = curve.getPointAt(0);
  positions.push(p0.x, p0.y, p0.z);
  for (let j = 0; j < radialSegs; j++) {
    indices.push(startIdx, j, (j + 1) % radialSegs);
  }
  const endIdx = positions.length / 3;
  const p1 = curve.getPointAt(1);
  positions.push(p1.x, p1.y, p1.z);
  const lastRow = tubularSegs * radialSegs;
  for (let j = 0; j < radialSegs; j++) {
    indices.push(endIdx, lastRow + ((j + 1) % radialSegs), lastRow + j);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
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

/**
 * Universal seated drape deformer for ANY skirt, dress hem, or trim geometry attached under skirtPivot.
 * Automatically drapes front vertices smoothly over horizontal thighs & knees while tucking
 * back/side hems cleanly atop the seat without poking under the bench or into the backrest.
 */
function createSeatedSkirtDrapeGeometry(
  standGeo: THREE.BufferGeometry,
  meshOffsetY: number,
  meshRotX = 0,
): THREE.BufferGeometry {
  const sitGeo = standGeo.clone();
  const posAttr = sitGeo.attributes.position as THREE.BufferAttribute;

  // First find max drop below skirtPivot waist (y = 0) across this skirt piece
  const cosR = Math.cos(meshRotX);
  const sinR = Math.sin(meshRotX);
  let maxDrop = 0.22;
  for (let i = 0; i < posAttr.count; i++) {
    const ly = posAttr.getY(i);
    const lz = posAttr.getZ(i);
    const sy = ly * cosR - lz * sinR + meshOffsetY;
    if (-sy > maxDrop) maxDrop = -sy;
  }

  for (let i = 0; i < posAttr.count; i++) {
    const lx = posAttr.getX(i);
    const ly = posAttr.getY(i);
    const lz = posAttr.getZ(i);

    // Transform vertex from mesh-local into upright skirtPivot space (waist at y = 0)
    const sx = lx;
    const sy = ly * cosR - lz * sinR + meshOffsetY;
    const sz = ly * sinR + lz * cosR;

    const drop = Math.max(0, -sy);
    const v = THREE.MathUtils.clamp(drop / maxDrop, 0, 1);
    const radial = Math.hypot(sx, sz) || 0.001;
    const frontAmt = THREE.MathUtils.clamp(sz / radial, 0, 1);
    const frontCurve = Math.pow(frontAmt, 1.12);
    const backAmt = THREE.MathUtils.clamp(-sz / radial, 0, 1);

    // Subtle natural sideways hip relaxation when sitting
    const nx = sx * (1 + 0.08 * v);

    // Forward drape along seated lap (+Z) & slight forward tuck at lower back against backrest
    const lapPush = frontCurve * (0.045 + 0.215 * Math.pow(v, 0.88));
    const backNudge = backAmt * (0.045 * v);
    const nz = sz + lapPush + backNudge;

    // Vertical drape: front fabric rests gently atop horizontal thighs & folds softly down at knees;
    // side/back fabric gathers cleanly just above the wooden bench surface (bench top ≈ -0.215)
    const seatSurfaceY = -0.182;
    const flatSideBackY = Math.max(seatSurfaceY, sy * (0.72 - 0.06 * backAmt));
    // Longer skirts (drop > 0.25) drape gently downward past the knee edge
    const kneeCascade = Math.max(0, drop - 0.24) * 0.65;
    const frontLapY = Math.max(-0.115 - kneeCascade, -0.025 - 0.075 * v - kneeCascade);
    let ny = THREE.MathUtils.lerp(flatSideBackY, frontLapY, frontCurve);
    // Keep very top waistband row flush with torso waist
    if (v < 0.08) {
      ny = THREE.MathUtils.lerp(sy, ny, v / 0.08);
    }

    // Transform back from skirtPivot space into mesh-local space
    const dy = ny - meshOffsetY;
    const ddz = nz;
    posAttr.setXYZ(
      i,
      nx,
      dy * cosR + ddz * sinR,
      -dy * sinR + ddz * cosR,
    );
  }

  posAttr.needsUpdate = true;
  sitGeo.computeVertexNormals();
  return sitGeo;
}

/**
 * Tailored cycling skirt/hem deformer: arches fabric smoothly forward & outward over straddling
 * thighs while keeping the lower hem tucked cleanly over the bike saddle without clipping legs or frame.
 */
function createBicycleSkirtDrapeGeometry(
  standGeo: THREE.BufferGeometry,
  meshOffsetY: number,
  meshRotX = 0,
): THREE.BufferGeometry {
  const bikeGeo = standGeo.clone();
  const posAttr = bikeGeo.attributes.position as THREE.BufferAttribute;

  const cosR = Math.cos(meshRotX);
  const sinR = Math.sin(meshRotX);
  let maxDrop = 0.22;
  for (let i = 0; i < posAttr.count; i++) {
    const ly = posAttr.getY(i);
    const lz = posAttr.getZ(i);
    const sy = ly * cosR - lz * sinR + meshOffsetY;
    if (-sy > maxDrop) maxDrop = -sy;
  }

  for (let i = 0; i < posAttr.count; i++) {
    const lx = posAttr.getX(i);
    const ly = posAttr.getY(i);
    const lz = posAttr.getZ(i);

    const sx = lx;
    const sy = ly * cosR - lz * sinR + meshOffsetY;
    const sz = ly * sinR + lz * cosR;

    const drop = Math.max(0, -sy);
    const v = THREE.MathUtils.clamp(drop / maxDrop, 0, 1);
    const radial = Math.hypot(sx, sz) || 0.001;
    const frontAmt = THREE.MathUtils.clamp(sz / radial, 0, 1);
    const backAmt = THREE.MathUtils.clamp(-sz / radial, 0, 1);
    const sideAmt = THREE.MathUtils.clamp(Math.abs(sx) / radial, 0, 1);

    // Widen subtly over straddling thighs & saddle while keeping waistband seamless
    const nx = sx * (1 + (0.18 + 0.1 * frontAmt) * v);
    // Drape generously forward over raised thighs starting early near upper hip so knees never poke out
    const lapPush = frontAmt * (0.075 + 0.175 * Math.pow(v, 0.58));
    const backTuck = backAmt * (0.04 * v);
    const nz = sz + lapPush - backTuck;

    // Gentle saddle relief only toward the rear/center saddle seam, while front drapes smoothly downward over thighs
    const rearSaddleRelief = backAmt * (1 - sideAmt) * 0.032 * v;
    const frontKneeCover = frontAmt * 0.025 * Math.pow(v, 0.85);
    const longSkirtHold = Math.max(0, drop - 0.23) * 0.42;
    let ny = THREE.MathUtils.lerp(
      sy,
      sy * 0.92 + rearSaddleRelief - frontKneeCover + longSkirtHold,
      v,
    );
    if (v < 0.06) {
      ny = THREE.MathUtils.lerp(sy, ny, v / 0.06);
    }

    const dy = ny - meshOffsetY;
    posAttr.setXYZ(
      i,
      nx,
      dy * cosR + nz * sinR,
      -dy * sinR + nz * cosR,
    );
  }

  posAttr.needsUpdate = true;
  bikeGeo.computeVertexNormals();
  return bikeGeo;
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

function createFittedFemaleTorsoProfile(): THREE.Vector2[] {
  const pts: [number, number][] = [
    [0.01, -0.195],
    [0.195, -0.195],
    [0.172, -0.14],
    [0.162, -0.095],
    [0.184, -0.02],
    [0.194, 0.055],
    [0.184, 0.125],
    [0.166, 0.168],
    [0.106, 0.196],
    [0.072, 0.21],
  ];
  return pts.map(([r, y]) => new THREE.Vector2(r, y));
}

function createAoDaiTorsoProfile(isMale: boolean): THREE.Vector2[] {
  const pts: [number, number][] = isMale
    ? [
        [0.01, -0.195],
        [0.218, -0.195],
        [0.215, -0.135],
        [0.208, -0.04],
        [0.206, 0.06],
        [0.204, 0.132],
        [0.18, 0.172],
        [0.12, 0.198],
        [0.078, 0.212],
      ]
    : [
        [0.01, -0.195],
        [0.208, -0.195],
        [0.184, -0.148],
        [0.166, -0.078],
        [0.188, 0.008],
        [0.198, 0.072],
        [0.186, 0.135],
        [0.164, 0.172],
        [0.11, 0.198],
        [0.074, 0.212],
      ];
  return pts.map(([r, y]) => new THREE.Vector2(r, y));
}

/**
 * Builds a graceful, softly pleated, solid curved Vietnamese Ao Dai front or back flap (`tà áo`)
 * wrapping cleanly around waist & flowing smoothly down to mid-shin with crisp side slits (`xẻ tà`).
 */
function createAoDaiPanelGeometry(
  isFront: boolean,
  waistR: number,
  hemR: number,
  length: number,
  halfSpanRad: number,
  thickness = 0.012,
): THREE.BufferGeometry {
  const segU = 18;
  const segV = 16;
  const centerTheta = isFront ? 0 : Math.PI;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const evalPt = (u: number, v: number, faceSign: number): [number, number, number] => {
    const thetaOff = (u - 0.5) * 2 * halfSpanRad;
    // Slight widening below waist + gentle tapered rounding at bottom side corners
    const spanBoost = 1 + 0.12 * Math.sin(v * Math.PI * 0.72);
    const theta = centerTheta + thetaOff * spanBoost;
    const edgeRound = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(u - 0.5) * 2, 3.2)), 0.45);

    const rBase = THREE.MathUtils.lerp(waistR, hemR, Math.pow(v, 0.82));
    // Soft vertical silk drape wave
    const silkFold = Math.sin((u - 0.5) * Math.PI * 4) * 0.0055 * Math.pow(v, 0.85);
    const r = rBase + silkFold + faceSign * (thickness * 0.5) * (0.35 + 0.65 * edgeRound);

    // Subtle upward curve at outer side corners for authentic curved hem silhouette
    const cornerLift = (1 - edgeRound) * 0.018 * Math.pow(v, 1.8);
    const y = -v * length + cornerLift;
    return [Math.sin(theta) * r, y, Math.cos(theta) * r];
  };

  const stride = segU + 1;
  for (let iv = 0; iv <= segV; iv++) {
    const v = iv / segV;
    for (let iu = 0; iu <= segU; iu++) {
      const u = iu / segU;
      const p = evalPt(u, v, 1);
      positions.push(p[0], p[1], p[2]);
      uvs.push(u, 1 - v);
    }
  }
  const backStart = (segV + 1) * stride;
  for (let iv = 0; iv <= segV; iv++) {
    const v = iv / segV;
    for (let iu = 0; iu <= segU; iu++) {
      const u = iu / segU;
      const p = evalPt(u, v, -1);
      positions.push(p[0], p[1], p[2]);
      uvs.push(u, 1 - v);
    }
  }

  for (let iv = 0; iv < segV; iv++) {
    for (let iu = 0; iu < segU; iu++) {
      const a = iv * stride + iu;
      const b = (iv + 1) * stride + iu;
      const c = (iv + 1) * stride + (iu + 1);
      const d = iv * stride + (iu + 1);
      indices.push(a, b, d, b, c, d);

      const ba = backStart + a;
      const bb = backStart + b;
      const bc = backStart + c;
      const bd = backStart + d;
      indices.push(ba, bd, bb, bb, bd, bc);
    }
  }

  // Stitch side borders & bottom hem seamlessly
  for (let iv = 0; iv < segV; iv++) {
    const fl0 = iv * stride;
    const fl1 = (iv + 1) * stride;
    indices.push(fl0, backStart + fl0, fl1, fl1, backStart + fl0, backStart + fl1);
    const fr0 = iv * stride + segU;
    const fr1 = (iv + 1) * stride + segU;
    indices.push(fr0, fr1, backStart + fr0, fr1, backStart + fr1, backStart + fr0);
  }
  for (let iu = 0; iu < segU; iu++) {
    const fb0 = segV * stride + iu;
    const fb1 = segV * stride + iu + 1;
    indices.push(fb0, backStart + fb0, fb1, fb1, backStart + fb0, backStart + fb1);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

function createAoDaiHemTrimGeometry(
  isFront: boolean,
  hemR: number,
  length: number,
  halfSpanRad: number,
): THREE.BufferGeometry {
  const segU = 18;
  const centerTheta = isFront ? 0 : Math.PI;
  const pts: THREE.Vector3[] = [];
  for (let iu = 0; iu <= segU; iu++) {
    const u = iu / segU;
    const thetaOff = (u - 0.5) * 2 * halfSpanRad * 1.12;
    const theta = centerTheta + thetaOff;
    const edgeRound = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(u - 0.5) * 2, 3.2)), 0.45);
    const silkFold = Math.sin((u - 0.5) * Math.PI * 4) * 0.0055;
    const r = hemR + silkFold + 0.003;
    const y = -length + (1 - edgeRound) * 0.018;
    pts.push(new THREE.Vector3(Math.sin(theta) * r, y, Math.cos(theta) * r));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.007, 6, false);
}

function createFeatherShape(length: number, width: number, curveOffset = 0.05): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(
    width * 0.72,
    length * 0.25,
    width * 0.95 + curveOffset,
    length * 0.72,
    curveOffset * 1.15,
    length,
  );
  s.bezierCurveTo(
    -width * 0.78 + curveOffset,
    length * 0.75,
    -width * 0.65,
    length * 0.28,
    0,
    0,
  );
  s.closePath();
  return s;
}

function createPencilSkirtGeometry(
  waistR: number,
  hipR: number,
  hemR: number,
  height: number,
  segU = 32,
  segV = 12,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let iv = 0; iv <= segV; iv++) {
    const t = iv / segV; // 0 = top waist, 1 = bottom hem
    const y = (0.5 - t) * height;
    const curveR =
      t < 0.36
        ? THREE.MathUtils.lerp(waistR, hipR, Math.sin((t / 0.36) * (Math.PI * 0.5)))
        : THREE.MathUtils.lerp(hipR, hemR, (t - 0.36) / 0.64);
    for (let iu = 0; iu <= segU; iu++) {
      const u = iu / segU;
      const th = u * Math.PI * 2;
      positions.push(Math.sin(th) * curveR, y, Math.cos(th) * curveR);
      uvs.push(u, 1 - t);
    }
  }

  for (let iv = 0; iv < segV; iv++) {
    for (let iu = 0; iu < segU; iu++) {
      const a = iv * (segU + 1) + iu;
      const b = a + segU + 1;
      indices.push(a, b, a + 1);
      indices.push(b, b + 1, a + 1);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

function createFivePointStarShape(outerR: number, innerR: number): THREE.Shape {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = Math.PI / 2 + (i * Math.PI) / 5;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

const _varsityPatchCache = new Map<string, THREE.CanvasTexture>();

function createVarsityBadgeTexture(
  letter: string,
  bgHex: string,
  fgHex: string,
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const key = `varsity_${letter}_${bgHex}_${fgHex}`;
  const cached = _varsityPatchCache.get(key);
  if (cached) return cached;

  const size = 192;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, size, size);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 132px Georgia, "Times New Roman", serif';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 18;
  ctx.strokeStyle = fgHex;
  ctx.strokeText(letter, size * 0.5, size * 0.54);
  ctx.fillStyle = fgHex;
  ctx.fillText(letter, size * 0.5, size * 0.54);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  _varsityPatchCache.set(key, tex);
  return tex;
}

function getPandaFabricTexture(
  baseHex: string,
  repeatX = 3,
  repeatY = 2,
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const key = `panda_${baseHex}_${repeatX}_${repeatY}`;
  const cached = _varsityPatchCache.get(key);
  if (cached) return cached;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);

  const drawPandaFace = (cx: number, cy: number, r: number) => {
    ctx.save();
    // Ears
    ctx.fillStyle = '#2B2427';
    ctx.beginPath();
    ctx.arc(cx - r * 0.72, cy - r * 0.68, r * 0.34, 0, Math.PI * 2);
    ctx.arc(cx + r * 0.72, cy - r * 0.68, r * 0.34, 0, Math.PI * 2);
    ctx.fill();
    // White head
    ctx.fillStyle = '#FFFDF9';
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, r * 0.88, 0, 0, Math.PI * 2);
    ctx.fill();
    // Eye patches
    ctx.fillStyle = '#2B2427';
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.38, cy - r * 0.06, r * 0.23, r * 0.28, -0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + r * 0.38, cy - r * 0.06, r * 0.23, r * 0.28, 0.25, 0, Math.PI * 2);
    ctx.fill();
    // White eye glints
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(cx - r * 0.36, cy - r * 0.1, r * 0.08, 0, Math.PI * 2);
    ctx.arc(cx + r * 0.36, cy - r * 0.1, r * 0.08, 0, Math.PI * 2);
    ctx.fill();
    // Pink cheeks
    ctx.fillStyle = 'rgba(244, 134, 168, 0.55)';
    ctx.beginPath();
    ctx.arc(cx - r * 0.58, cy + r * 0.22, r * 0.14, 0, Math.PI * 2);
    ctx.arc(cx + r * 0.58, cy + r * 0.22, r * 0.14, 0, Math.PI * 2);
    ctx.fill();
    // Nose + mouth
    ctx.fillStyle = '#2B2427';
    ctx.beginPath();
    ctx.ellipse(cx, cy + r * 0.18, r * 0.12, r * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  // Staggered tile so edges wrap seamlessly
  const spots: [number, number][] = [
    [64, 64],
    [192, 64],
    [128, 192],
    [0, 192],
    [256, 192],
  ];
  spots.forEach(([sx, sy]) => drawPandaFace(sx, sy, 34));

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 4;
  _varsityPatchCache.set(key, tex);
  return tex;
}

function getCoinBrocadeTexture(baseHex: string): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const key = `coin_v2_${baseHex}`;
  const cached = _varsityPatchCache.get(key);
  if (cached) return cached;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const silkGrad = ctx.createLinearGradient(0, 0, size, size);
  silkGrad.addColorStop(0, baseHex);
  silkGrad.addColorStop(0.5, `#${shadeHex(baseHex, 0.05).getHexString()}`);
  silkGrad.addColorStop(1, baseHex);
  ctx.fillStyle = silkGrad;
  ctx.fillRect(0, 0, size, size);

  const drawCoin = (cx: number, cy: number, r: number) => {
    ctx.save();
    ctx.fillStyle = '#F7CA44';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#C98512';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.76, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = baseHex;
    ctx.fillRect(cx - r * 0.24, cy - r * 0.24, r * 0.48, r * 0.48);
    ctx.restore();
  };

  [
    [52, 54, 20],
    [176, 44, 17],
    [118, 134, 22],
    [232, 162, 19],
    [-24, 162, 19],
    [58, 224, 18],
    [192, 228, 20],
  ].forEach(([cx, cy, r]) => drawCoin(cx, cy, r));

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.anisotropy = 4;
  _varsityPatchCache.set(key, tex);
  return tex;
}

function getAoDaiMotifTexture(
  baseHex: string,
  motif: 'lotus' | 'peach' | 'white_silk' | 'nam_brocade',
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const key = `aodai_${motif}_${baseHex}`;
  const cached = _varsityPatchCache.get(key);
  if (cached) return cached;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, baseHex);
  grad.addColorStop(0.55, `#${shadeHex(baseHex, 0.04).getHexString()}`);
  grad.addColorStop(1, baseHex);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  if (motif === 'white_silk') {
    ctx.strokeStyle = 'rgba(235, 228, 216, 0.28)';
    ctx.lineWidth = 2;
    for (let i = -size; i < size * 2; i += 24) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + size * 0.5, size);
      ctx.stroke();
    }
  } else if (motif === 'lotus') {
    const drawLotus = (lx: number, ly: number, sc: number) => {
      ctx.save();
      ctx.translate(lx, ly);
      ctx.scale(sc, sc);
      ctx.fillStyle = '#539E76';
      ctx.beginPath();
      ctx.ellipse(-18, 16, 22, 10, -0.3, 0, Math.PI * 2);
      ctx.fill();
      for (let p = -2; p <= 2; p++) {
        ctx.save();
        ctx.rotate(p * 0.32);
        ctx.fillStyle = p === 0 ? '#FFF7FA' : '#FBD0DF';
        ctx.beginPath();
        ctx.ellipse(0, -14, 9, 20, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = '#F7CA44';
      ctx.beginPath();
      ctx.arc(0, -6, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };
    drawLotus(74, 175, 0.95);
    drawLotus(188, 118, 0.78);
    drawLotus(148, 226, 0.7);
  } else if (motif === 'peach') {
    // Slender diagonal apricot/peach branch + blossoms
    ctx.strokeStyle = '#6B4229';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(18, 232);
    ctx.quadraticCurveTo(118, 160, 236, 72);
    ctx.stroke();

    const drawFlower = (fx: number, fy: number, r: number, col: string) => {
      ctx.save();
      ctx.translate(fx, fy);
      ctx.fillStyle = col;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * r * 0.75, Math.sin(a) * r * 0.75, r * 0.56, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#FFE46B';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.34, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };
    const isWarmGold = baseHex.toLowerCase().includes('e8a8');
    const blossom = isWarmGold ? '#FFF5E1' : '#FFD3DF';
    [
      [62, 198, 16],
      [112, 162, 19],
      [158, 128, 15],
      [204, 92, 18],
      [96, 114, 14],
    ].forEach(([fx, fy, r]) => drawFlower(fx, fy, r, blossom));
  } else if (motif === 'nam_brocade') {
    // Traditional golden Longevity (Chữ Thọ) circular medallions
    const drawMedallion = (mx: number, my: number, r: number) => {
      ctx.save();
      ctx.strokeStyle = 'rgba(243, 198, 86, 0.72)';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(mx, my, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(mx, my, r * 0.62, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(mx - r * 0.42, my);
      ctx.lineTo(mx + r * 0.42, my);
      ctx.moveTo(mx, my - r * 0.42);
      ctx.lineTo(mx, my + r * 0.42);
      ctx.stroke();
      ctx.restore();
    };
    [
      [64, 64, 24],
      [192, 64, 24],
      [128, 150, 26],
      [48, 224, 22],
      [208, 224, 22],
    ].forEach(([mx, my, r]) => drawMedallion(mx, my, r));
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(motif === 'nam_brocade' ? 2 : 1, motif === 'nam_brocade' ? 2 : 1);
  tex.anisotropy = 4;
  _varsityPatchCache.set(key, tex);
  return tex;
}

function getPlaidSkirtTexture(baseHex: string): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const key = `plaid_${baseHex}`;
  const cached = _varsityPatchCache.get(key);
  if (cached) return cached;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);

  const dark = `#${shadeHex(baseHex, -0.22).getHexString()}`;
  ctx.fillStyle = dark;
  ctx.globalAlpha = 0.55;
  ctx.fillRect(28, 0, 32, size);
  ctx.fillRect(156, 0, 32, size);
  ctx.fillRect(0, 28, size, 32);
  ctx.fillRect(0, 156, size, 32);

  ctx.globalAlpha = 0.9;
  ctx.fillStyle = '#FAF3E4';
  ctx.fillRect(96, 0, 8, size);
  ctx.fillRect(224, 0, 8, size);
  ctx.fillRect(0, 96, size, 8);
  ctx.fillRect(0, 224, size, 8);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 1);
  tex.anisotropy = 4;
  _varsityPatchCache.set(key, tex);
  return tex;
}

function getHawaiiPrintTexture(baseHex: string): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const key = `hawaii_${baseHex}`;
  const cached = _varsityPatchCache.get(key);
  if (cached) return cached;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);

  const drawHibiscus = (hx: number, hy: number, r: number, col: string) => {
    ctx.save();
    ctx.translate(hx, hy);
    ctx.fillStyle = '#3B8A56';
    ctx.beginPath();
    ctx.ellipse(r * 0.9, r * 0.5, r * 0.65, r * 0.3, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = col;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, r * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#FFE066';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  drawHibiscus(64, 68, 28, '#FFF7F2');
  drawHibiscus(190, 58, 24, '#FF90A8');
  drawHibiscus(126, 178, 30, '#FFF7F2');
  drawHibiscus(24, 210, 22, '#FFD166');
  drawHibiscus(232, 206, 24, '#FF90A8');

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.anisotropy = 4;
  _varsityPatchCache.set(key, tex);
  return tex;
}

function getCloudShortsTexture(baseHex: string): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const key = `cloudshorts_${baseHex}`;
  const cached = _varsityPatchCache.get(key);
  if (cached) return cached;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, baseHex);
  grad.addColorStop(0.55, '#9CE0FA');
  grad.addColorStop(1, '#FFFFFF');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  [
    [40, 175, 22],
    [66, 164, 26],
    [96, 176, 20],
    [164, 182, 24],
    [192, 168, 28],
    [222, 182, 21],
  ].forEach(([cx, cy, r]) => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  [
    [45, 75, 10],
    [130, 52, 8],
    [205, 88, 12],
    [150, 118, 7],
  ].forEach(([cx, cy, r]) => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(2, 1);
  tex.anisotropy = 4;
  _varsityPatchCache.set(key, tex);
  return tex;
}

function getCCBeanieBadgeTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const key = 'cc_beanie_badge';
  const cached = _varsityPatchCache.get(key);
  if (cached) return cached;

  const size = 160;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#5D3B26';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = '#EFE3D3';
  ctx.lineWidth = 10;
  ctx.font = '800 72px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFF8EE';
  ctx.fillText('CC', size / 2, size * 0.54);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  _varsityPatchCache.set(key, tex);
  return tex;
}

/**
 * Curved, softly pleated 3D knit scarf tail draping cleanly forward over chest/bust without clipping.
 */
function createCurvedScarfTailGeometry(
  widthTop: number,
  widthBot: number,
  length: number,
  thickness: number,
  archZ: number,
): THREE.BufferGeometry {
  const segU = 10;
  const segV = 14;
  const positions: number[] = [];
  const indices: number[] = [];

  const evalPoint = (u: number, v: number, faceSign: number): [number, number, number] => {
    const w = THREE.MathUtils.lerp(widthTop, widthBot, Math.pow(v, 0.85));
    const x = (u - 0.5) * w;
    const y = -v * length;
    // Gentle cloth arch forward over chest & subtle vertical pleat ripples
    const spineZ = archZ * Math.sin(v * Math.PI * 0.88) + 0.008 * v;
    const edgeRound = 1 - Math.pow(Math.abs(u - 0.5) * 2, 2.2) * 0.65;
    const pleatWave = Math.sin((u - 0.5) * Math.PI * 3) * 0.0035 * v;
    const halfT = thickness * 0.5 * edgeRound;
    const z = spineZ + faceSign * halfT + pleatWave;
    return [x, y, z];
  };

  // Front face (faceSign = +1), bottom edge, back face (faceSign = -1)
  const stride = segU + 1;
  for (let iv = 0; iv <= segV; iv++) {
    const v = iv / segV;
    for (let iu = 0; iu <= segU; iu++) {
      const p = evalPoint(iu / segU, v, 1);
      positions.push(p[0], p[1], p[2]);
    }
  }
  const backStart = (segV + 1) * stride;
  for (let iv = 0; iv <= segV; iv++) {
    const v = iv / segV;
    for (let iu = 0; iu <= segU; iu++) {
      const p = evalPoint(iu / segU, v, -1);
      positions.push(p[0], p[1], p[2]);
    }
  }

  for (let iv = 0; iv < segV; iv++) {
    for (let iu = 0; iu < segU; iu++) {
      // Front
      const a = iv * stride + iu;
      const b = (iv + 1) * stride + iu;
      const c = (iv + 1) * stride + (iu + 1);
      const d = iv * stride + (iu + 1);
      indices.push(a, b, d, b, c, d);

      // Back
      const ba = backStart + a;
      const bb = backStart + b;
      const bc = backStart + c;
      const bd = backStart + d;
      indices.push(ba, bd, bb, bb, bd, bc);
    }
  }

  // Stitch side borders & top/bottom edges cleanly
  for (let iv = 0; iv < segV; iv++) {
    const fl0 = iv * stride;
    const fl1 = (iv + 1) * stride;
    const bl0 = backStart + fl0;
    const bl1 = backStart + fl1;
    indices.push(fl0, bl0, fl1, fl1, bl0, bl1);

    const fr0 = iv * stride + segU;
    const fr1 = (iv + 1) * stride + segU;
    const br0 = backStart + fr0;
    const br1 = backStart + fr1;
    indices.push(fr0, fr1, br0, fr1, br1, br0);
  }
  for (let iu = 0; iu < segU; iu++) {
    const ft0 = iu;
    const ft1 = iu + 1;
    const bt0 = backStart + iu;
    const bt1 = backStart + iu + 1;
    indices.push(ft0, ft1, bt0, ft1, bt1, bt0);

    const fb0 = segV * stride + iu;
    const fb1 = segV * stride + iu + 1;
    const bb0 = backStart + fb0;
    const bb1 = backStart + fb1;
    indices.push(fb0, bb0, fb1, fb1, bb0, bb1);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}



export function buildAvatarRig(
  config: AvatarConfig,
  options?: {
    equippedTool?: ToolId | null;
    equippedFood?: BbqFoodId | null;
    carryingPet?: {speciesId: PetSpeciesId; sick?: boolean} | null;
  },
): AvatarRig {
  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  const skinMat = clayMat(config.skinTone, 0.54, 0.02);
  const hairMat = createHairClayMaterial(config.hairColor);
  const rawTopMat = clayMat(config.topColor, 0.66, 0.02);
  const isAoDaiTop =
    config.top === 'coin_tunic' ||
    config.top === 'ao_dai_lotus' ||
    config.top === 'ao_dai_peach' ||
    config.top === 'ao_dai_white' ||
    config.top === 'ao_dai_nam';
  const pandaTopTex =
    config.top === 'panda_pajama' ? getPandaFabricTexture(config.topColor, 3, 2) : null;
  const aoDaiTex =
    config.top === 'coin_tunic'
      ? getCoinBrocadeTexture(config.topColor)
      : config.top === 'ao_dai_lotus'
        ? getAoDaiMotifTexture(config.topColor, 'lotus')
        : config.top === 'ao_dai_peach'
          ? getAoDaiMotifTexture(config.topColor, 'peach')
          : config.top === 'ao_dai_white'
            ? getAoDaiMotifTexture(config.topColor, 'white_silk')
            : config.top === 'ao_dai_nam'
              ? getAoDaiMotifTexture(config.topColor, 'nam_brocade')
              : null;
  const hawaiiTex =
    config.top === 'hawaii_shirt' ? getHawaiiPrintTexture(config.topColor) : null;
  const topMat = pandaTopTex
    ? new THREE.MeshStandardMaterial({
        color: '#FFFFFF',
        map: pandaTopTex,
        roughness: 0.72,
        metalness: 0.02,
      })
    : aoDaiTex
      ? new THREE.MeshStandardMaterial({
          color: '#FFFFFF',
          map: aoDaiTex,
          roughness: 0.44,
          metalness: 0.06,
        })
      : hawaiiTex
        ? new THREE.MeshStandardMaterial({
            color: '#FFFFFF',
            map: hawaiiTex,
            roughness: 0.66,
            metalness: 0.02,
          })
        : rawTopMat;
  const topDarkMat = clayMat(shadeHex(config.topColor, -0.09).getHex(), 0.7, 0.02);
  const topLightMat = clayMat(shadeHex(config.topColor, 0.09).getHex(), 0.62, 0.02);
  const topTrimMat = clayMat('#FFFBF2', 0.7, 0.02);

  const rawBottomMat = clayMat(config.bottomColor, 0.72, 0.02);
  const pandaBottomTex =
    config.bottom === 'pajama_pants' ? getPandaFabricTexture(config.bottomColor, 2, 2) : null;
  const cloudShortsTex =
    config.bottom === 'cloud_shorts' ? getCloudShortsTexture(config.bottomColor) : null;
  const plaidSkirtTex =
    config.bottom === 'plaid_skirt' ? getPlaidSkirtTexture(config.bottomColor) : null;
  const isSilkBottom =
    config.bottom === 'tunic_pants' || config.bottom === 'silk_culottes';
  const bottomMat = pandaBottomTex
    ? new THREE.MeshStandardMaterial({
        color: '#FFFFFF',
        map: pandaBottomTex,
        roughness: 0.72,
        metalness: 0.02,
      })
    : cloudShortsTex
      ? new THREE.MeshStandardMaterial({
          color: '#FFFFFF',
          map: cloudShortsTex,
          roughness: 0.64,
          metalness: 0.02,
        })
      : plaidSkirtTex
        ? new THREE.MeshStandardMaterial({
            color: '#FFFFFF',
            map: plaidSkirtTex,
            roughness: 0.68,
            metalness: 0.02,
          })
        : isSilkBottom
          ? clayMat(config.bottomColor, 0.42, 0.05)
          : rawBottomMat;
  const bottomDarkMat = clayMat(shadeHex(config.bottomColor, -0.09).getHex(), 0.74, 0.02);
  const bottomLightMat = clayMat(shadeHex(config.bottomColor, 0.07).getHex(), 0.68, 0.02);
  const cheekMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#F28A95'),
    roughness: 0.72,
    metalness: 0,
    transparent: true,
    opacity: 0.56,
    depthWrite: false,
  });

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

  const isPeppaMascot = config.mascotCostume === 'peppa_pig';
  const peppaPinkMat = clayMat('#F7A6C2', 0.62, 0.02);
  const peppaDarkPinkMat = clayMat('#E4779F', 0.66, 0.02);
  const peppaSnoutTipMat = clayMat('#F28FB3', 0.56, 0.02);
  const peppaNostrilMat = clayMat('#C44978', 0.52, 0.02);

  // ========== ARTICULATED LEGS (HIP -> THIGH -> KNEE -> SHIN -> GROUNDED SHOES) ==========
  const KNEE_Y = -0.215;
  const sockMat = clayMat('#FFF8EE', 0.72, 0.01);
  const makeLeg = (xOffset: number) => {
    const legPivot = new THREE.Group();
    legPivot.position.set(xOffset, 0.52, 0);

    const isTrousers =
      config.bottom === 'wide_trousers' ||
      config.bottom === 'office_trousers' ||
      config.bottom === 'pajama_pants' ||
      config.bottom === 'overalls_pants' ||
      config.bottom === 'tunic_pants' ||
      config.bottom === 'silk_culottes' ||
      config.bottom === 'cargo_pants' ||
      config.bottom === 'flare_jeans';
    const legMat = isPeppaMascot ? peppaPinkMat : isTrousers ? bottomMat : skinMat;
    const hipCap = new THREE.Mesh(new THREE.SphereGeometry(0.078, 14, 12), legMat);
    legPivot.add(hipCap);

    // Upper thigh (hip y=0 down to knee y=-0.215) — openEnded meets seamless sphere cap without dark ring seam
    const thighMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.077, 0.066, 0.218, 18, 1, true),
      legMat,
    );
    thighMesh.position.y = -0.109;
    legPivot.add(thighMesh);

    const kneeCap = new THREE.Mesh(new THREE.SphereGeometry(0.0685, 14, 12), legMat);
    kneeCap.position.y = KNEE_Y;
    legPivot.add(kneeCap);

    if (
      config.bottom === 'wide_trousers' ||
      config.bottom === 'pajama_pants' ||
      config.bottom === 'overalls_pants' ||
      config.bottom === 'tunic_pants' ||
      config.bottom === 'silk_culottes' ||
      config.bottom === 'cargo_pants' ||
      config.bottom === 'flare_jeans'
    ) {
      const isSilkWide =
        config.bottom === 'tunic_pants' || config.bottom === 'silk_culottes';
      const thighR = isSilkWide ? 0.106 : 0.104;
      const hipPantCap = new THREE.Mesh(
        new THREE.SphereGeometry(thighR, 16, 14),
        bottomMat,
      );
      const thighPant = new THREE.Mesh(
        new THREE.CylinderGeometry(
          thighR - 0.001,
          isSilkWide ? 0.112 : 0.105,
          0.218,
          20,
          1,
          true,
        ),
        bottomMat,
      );
      thighPant.position.y = -0.109;
      const kneeTrouserCap = new THREE.Mesh(
        new THREE.SphereGeometry(isSilkWide ? 0.112 : 0.106, 16, 14),
        bottomMat,
      );
      kneeTrouserCap.position.y = KNEE_Y;
      legPivot.add(hipPantCap, thighPant, kneeTrouserCap);

      if (config.bottom === 'cargo_pants') {
        const legSide = xOffset < 0 ? -1 : 1;
        const pocketBox = new THREE.Mesh(
          new RoundedBoxGeometry(0.038, 0.095, 0.09, 2, 0.012),
          bottomLightMat,
        );
        pocketBox.position.set(legSide * 0.102, -0.135, 0.008);
        const pocketFlap = new THREE.Mesh(
          new RoundedBoxGeometry(0.042, 0.026, 0.094, 2, 0.008),
          bottomDarkMat,
        );
        pocketFlap.position.set(legSide * 0.104, -0.094, 0.008);
        legPivot.add(pocketBox, pocketFlap);
      }
    } else if (config.bottom === 'office_trousers') {
      // Watertight tailored straight-leg dress slacks (1:1 spheres + openEnded cylinders, recessed crease inside knee radius!)
      const hipPantCap = new THREE.Mesh(
        new THREE.SphereGeometry(0.097, 16, 14),
        bottomMat,
      );
      const thighPant = new THREE.Mesh(
        new THREE.CylinderGeometry(0.096, 0.086, 0.218, 20, 1, true),
        bottomMat,
      );
      thighPant.position.y = -0.109;
      const thighCrease = new THREE.Mesh(
        new RoundedBoxGeometry(0.012, 0.118, 0.008, 2, 0.003),
        bottomLightMat,
      );
      thighCrease.position.set(0, -0.11, 0.086);
      const kneeTrouserCap = new THREE.Mesh(
        new THREE.SphereGeometry(0.086, 16, 14),
        bottomMat,
      );
      kneeTrouserCap.position.y = KNEE_Y;
      legPivot.add(hipPantCap, thighPant, thighCrease, kneeTrouserCap);
    } else if (config.bottom === 'denim_shorts' || config.bottom === 'cargo_shorts') {
      const hipShortCap = new THREE.Mesh(
        new THREE.SphereGeometry(0.106, 16, 14),
        bottomMat,
      );
      const shortMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.105, 0.102, 0.16, 20, 1, true),
        bottomMat,
      );
      shortMesh.position.y = -0.08;
      legPivot.add(hipShortCap, shortMesh);

      const hem = new THREE.Mesh(
        new THREE.TorusGeometry(0.102, 0.011, 8, 20),
        bottomLightMat,
      );
      hem.rotation.x = Math.PI / 2;
      hem.position.y = -0.16;
      legPivot.add(hem);

      if (config.bottom === 'cargo_shorts') {
        const legSide = xOffset < 0 ? -1 : 1;
        const pocketBox = new THREE.Mesh(
          new RoundedBoxGeometry(0.036, 0.082, 0.086, 2, 0.012),
          bottomLightMat,
        );
        pocketBox.position.set(legSide * 0.098, -0.09, 0.008);
        const pocketFlap = new THREE.Mesh(
          new RoundedBoxGeometry(0.04, 0.024, 0.09, 2, 0.008),
          bottomDarkMat,
        );
        pocketFlap.position.set(legSide * 0.1, -0.056, 0.008);
        const pocketBtn = new THREE.Mesh(
          new THREE.SphereGeometry(0.009, 8, 6),
          clayMat('#4D3B2B', 0.45),
        );
        pocketBtn.position.set(legSide * 0.118, -0.06, 0.008);
        legPivot.add(pocketBox, pocketFlap, pocketBtn);
      }
    } else if (config.bottom === 'sport_shorts' || config.bottom === 'cloud_shorts') {
      const hipShortCap = new THREE.Mesh(
        new THREE.SphereGeometry(0.107, 16, 14),
        bottomMat,
      );
      const shortMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.106, 0.108, 0.155, 20, 1, true),
        bottomMat,
      );
      shortMesh.position.y = -0.078;
      const whiteTrimMat = clayMat('#FFFFFF', 0.56);
      const hem = new THREE.Mesh(
        new THREE.TorusGeometry(0.107, 0.011, 8, 20),
        whiteTrimMat,
      );
      hem.rotation.x = Math.PI / 2;
      hem.position.y = -0.154;

      if (config.bottom === 'sport_shorts') {
        const legSide = xOffset < 0 ? -1 : 1;
        const sideStripe = new THREE.Mesh(
          new RoundedBoxGeometry(0.016, 0.138, 0.024, 2, 0.006),
          whiteTrimMat,
        );
        sideStripe.position.set(legSide * 0.101, -0.078, 0.008);
        legPivot.add(sideStripe);
      } else {
        for (let c = 0; c < 6; c++) {
          const ang = (c / 6) * Math.PI * 2;
          const puff = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 8), whiteTrimMat);
          puff.position.set(Math.cos(ang) * 0.1, -0.152, Math.sin(ang) * 0.1);
          legPivot.add(puff);
        }
      }
      legPivot.add(hipShortCap, shortMesh, hem);
    }

    // Lower leg (shin + socks + shoes) pivoted at KNEE_Y so knees bend naturally when sitting/cycling
    const kneePivot = new THREE.Group();
    kneePivot.position.set(0, KNEE_Y, 0);
    legPivot.add(kneePivot);

    const shinMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.066, 0.055, 0.225, 18, 1, true),
      legMat,
    );
    shinMesh.position.y = -0.112;
    kneePivot.add(shinMesh);

    if (
      config.bottom === 'wide_trousers' ||
      config.bottom === 'pajama_pants' ||
      config.bottom === 'overalls_pants' ||
      config.bottom === 'tunic_pants' ||
      config.bottom === 'silk_culottes' ||
      config.bottom === 'cargo_pants' ||
      config.bottom === 'flare_jeans'
    ) {
      const isTunicPants =
        config.bottom === 'tunic_pants' || config.bottom === 'silk_culottes';
      const isFlare = config.bottom === 'flare_jeans';
      const shinTopR = isTunicPants ? 0.112 : 0.105;
      const shinBotR = isTunicPants ? 0.134 : isFlare ? 0.138 : 0.114;
      const shinH = isTunicPants ? 0.215 : 0.195;
      const shinPant = new THREE.Mesh(
        new THREE.CylinderGeometry(shinTopR, shinBotR, shinH, 22, 1, true),
        bottomMat,
      );
      shinPant.position.y = -shinH * 0.5;
      kneePivot.add(shinPant);

      const cuffMat =
        config.bottom === 'pajama_pants'
          ? clayMat('#FFFDF9', 0.62)
          : config.bottom === 'overalls_pants'
            ? clayMat(shadeHex(config.bottomColor, 0.1).getHex(), 0.7)
            : isTunicPants
              ? bottomMat
              : bottomDarkMat;
      const cuff = new THREE.Mesh(
        new THREE.CylinderGeometry(
          shinBotR,
          isTunicPants ? shinBotR + 0.004 : shinBotR + 0.002,
          config.bottom === 'pajama_pants' ? 0.026 : isTunicPants ? 0.024 : 0.044,
          22,
        ),
        cuffMat,
      );
      cuff.position.y = isTunicPants ? -0.205 : -0.18;
      kneePivot.add(cuff);
    } else if (config.bottom === 'office_trousers') {
      // Straight tapered tailored slacks ending cleanly above dress shoes
      const shinPant = new THREE.Mesh(
        new THREE.CylinderGeometry(0.085, 0.078, 0.206, 20, 1, true),
        bottomMat,
      );
      shinPant.position.y = -0.103;
      const shinCrease = new THREE.Mesh(
        new RoundedBoxGeometry(0.011, 0.12, 0.008, 2, 0.003),
        bottomLightMat,
      );
      shinCrease.position.set(0, -0.116, 0.077);
      const tailoredHem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.079, 0.022, 20),
        bottomDarkMat,
      );
      tailoredHem.position.y = -0.196;
      kneePivot.add(shinPant, shinCrease, tailoredHem);
    }

    const isAnimalCrocs =
      config.shoes === 'crocs_fish' ||
      config.shoes === 'crocs_panda' ||
      config.shoes === 'crocs_chick' ||
      config.shoes === 'crocs_frog' ||
      config.shoes === 'crocs_bunny' ||
      config.shoes === 'crocs_dino';

    // Knit ankle sock + rolled cuff bridging the lower shin smoothly into shoes
    if (
      !isTrousers &&
      !isPeppaMascot &&
      config.shoes !== 'boots' &&
      config.shoes !== 'rain_boots' &&
      !isAnimalCrocs
    ) {
      const sockTube = new THREE.Mesh(
        new THREE.CylinderGeometry(0.062, 0.059, 0.105, 18),
        sockMat,
      );
      sockTube.position.y = -0.175;
      const sockCuff = new THREE.Mesh(
        new THREE.TorusGeometry(0.06, 0.011, 8, 18),
        sockMat,
      );
      sockCuff.rotation.x = Math.PI / 2;
      sockCuff.position.y = -0.123;
      kneePivot.add(sockTube, sockCuff);
    }

    // Shoe planted flush on ground when standing (0.52 - 0.215 - 0.297 = 0.008 right above shadowDisc)
    const shoeMat = glossyClayMat(config.shoeColor || '#3A2B2B', 0.34);
    if (isAnimalCrocs) {
      const upperColor =
        config.shoes === 'crocs_fish'
          ? '#5AC4DF'
          : config.shoes === 'crocs_panda'
            ? '#FFFFFF'
            : config.shoes === 'crocs_chick'
              ? '#F8CE48'
              : config.shoes === 'crocs_frog'
                ? '#6CC763'
                : config.shoes === 'crocs_bunny'
                  ? '#F7A8C4'
                  : '#5DC288';
      const soleColor =
        config.shoes === 'crocs_fish'
          ? '#F28AA8'
          : config.shoes === 'crocs_panda'
            ? '#3675DE'
            : config.shoes === 'crocs_chick'
              ? '#E88A2C'
              : config.shoes === 'crocs_frog'
                ? '#F2E7B8'
                : config.shoes === 'crocs_bunny'
                  ? '#FFFFFF'
                  : '#F6CA44';
      const upperMat = glossyClayMat(upperColor, 0.3);
      const soleMat = clayMat(soleColor, 0.42);
      const stripeMat = clayMat(shadeHex(soleColor, -0.14).getHex(), 0.4);
      const holeMat = clayMat('#1F1D24', 0.85);
      const scleraMat = glossyClayMat('#FFFFFF', 0.16);
      const pupilMat = glossyClayMat('#1B1D24', 0.12);

      const crocGroup = new THREE.Group();
      // Chunky, wide, roomy Classic Crocs Clog silhouette
      const crocSole = new THREE.Mesh(
        new RoundedBoxGeometry(0.188, 0.044, 0.278, 4, 0.018),
        soleMat,
      );
      crocSole.position.set(0, -0.274, 0.048);
      const crocSoleToe = new THREE.Mesh(
        new THREE.SphereGeometry(0.096, 16, 12),
        soleMat,
      );
      crocSoleToe.scale.set(1.01, 0.26, 1.08);
      crocSoleToe.position.set(0, -0.281, 0.126);

      // Signature Crocs midsole racing stripe band
      const midsoleStripe = new THREE.Mesh(
        new RoundedBoxGeometry(0.191, 0.012, 0.281, 3, 0.005),
        stripeMat,
      );
      midsoleStripe.position.set(0, -0.258, 0.048);

      // Bulbous sculpted Croc clog upper + tall rounded toe bumper dome
      const crocBody = new THREE.Mesh(
        new RoundedBoxGeometry(0.182, 0.098, 0.258, 5, 0.046),
        upperMat,
      );
      crocBody.position.set(0, -0.23, 0.048);
      const crocToeDome = new THREE.Mesh(
        new THREE.SphereGeometry(0.096, 18, 14),
        upperMat,
      );
      crocToeDome.scale.set(1.01, 0.78, 1.12);
      crocToeDome.position.set(0, -0.234, 0.126);
      crocGroup.add(crocSole, crocSoleToe, midsoleStripe, crocBody, crocToeDome);

      // Authentic Crocs perforated ventilation holes across upper vamp + side ports
      const vampHoleCoords: [number, number, number][] = [
        [-0.032, -0.179, 0.088],
        [0.032, -0.179, 0.088],
        [-0.044, -0.184, 0.122],
        [0, -0.176, 0.118],
        [0.044, -0.184, 0.122],
        [-0.03, -0.194, 0.155],
        [0.03, -0.194, 0.155],
      ];
      vampHoleCoords.forEach(([hx, hy, hz]) => {
        const hole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.011, 0.011, 0.008, 10),
          holeMat,
        );
        hole.position.set(hx, hy, hz);
        hole.rotation.x = 0.24;
        hole.rotation.z = -hx * 1.4;
        crocGroup.add(hole);
      });
      [-1, 1].forEach((side) => {
        for (let p = 0; p < 3; p++) {
          const port = new THREE.Mesh(
            new THREE.CylinderGeometry(0.009, 0.009, 0.01, 8),
            holeMat,
          );
          port.rotation.z = Math.PI / 2;
          port.position.set(side * 0.091, -0.242, 0.075 + p * 0.038);
          crocGroup.add(port);
        }
      });

      // Pivoted Croc heel sport strap + glossy round side Croc rivets
      const strapMat =
        config.shoes === 'crocs_panda'
          ? soleMat
          : clayMat(shadeHex(upperColor, -0.12).getHex(), 0.4);
      const heelStrap = new THREE.Mesh(
        new THREE.TorusGeometry(0.094, 0.016, 10, 22, Math.PI),
        strapMat,
      );
      heelStrap.rotation.x = Math.PI / 2 - 0.28;
      heelStrap.rotation.z = Math.PI;
      heelStrap.position.set(0, -0.205, -0.022);
      crocGroup.add(heelStrap);
      [-1, 1].forEach((side) => {
        const rivet = new THREE.Mesh(
          new THREE.CylinderGeometry(0.018, 0.018, 0.012, 12),
          strapMat,
        );
        rivet.rotation.z = Math.PI / 2;
        rivet.position.set(side * 0.093, -0.208, -0.008);
        const rivetDot = new THREE.Mesh(
          new THREE.CylinderGeometry(0.009, 0.009, 0.014, 10),
          scleraMat,
        );
        rivetDot.rotation.z = Math.PI / 2;
        rivetDot.position.set(side * 0.094, -0.208, -0.008);
        crocGroup.add(rivet, rivetDot);
      });

      if (config.shoes === 'crocs_fish') {
        const lipMat = glossyClayMat('#F79AB6', 0.34);
        const lips = new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 10), lipMat);
        lips.scale.set(1.42, 0.68, 0.78);
        lips.position.set(0, -0.244, 0.228);
        const fin = new THREE.Mesh(
          new RoundedBoxGeometry(0.022, 0.046, 0.056, 2, 0.01),
          clayMat('#3B9EC2', 0.4),
        );
        fin.position.set(0, -0.172, 0.088);
        fin.rotation.x = -0.32;
        crocGroup.add(lips, fin);

        [-1, 1].forEach((side) => {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.032, 12, 10), scleraMat);
          eye.position.set(side * 0.036, -0.168, 0.145);
          const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 8), pupilMat);
          pupil.position.set(side * 0.036, -0.165, 0.172);
          crocGroup.add(eye, pupil);
        });
      } else if (config.shoes === 'crocs_panda') {
        const blackMat = clayMat('#222228', 0.44);
        [-1, 1].forEach((side) => {
          const ear = new THREE.Mesh(new THREE.SphereGeometry(0.028, 12, 10), blackMat);
          ear.scale.set(1, 1, 0.62);
          ear.position.set(side * 0.054, -0.168, 0.112);
          const patch = new THREE.Mesh(new THREE.SphereGeometry(0.029, 12, 10), blackMat);
          patch.scale.set(1.08, 0.88, 0.44);
          patch.position.set(side * 0.038, -0.214, 0.212);
          patch.rotation.z = side * 0.26;
          const glint = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 8), scleraMat);
          glint.position.set(side * 0.038, -0.212, 0.225);
          crocGroup.add(ear, patch, glint);
        });
        const nose = new THREE.Mesh(new THREE.SphereGeometry(0.017, 10, 8), blackMat);
        nose.scale.set(1.25, 0.85, 0.7);
        nose.position.set(0, -0.234, 0.232);
        crocGroup.add(nose);
      } else if (config.shoes === 'crocs_chick') {
        const beakMat = glossyClayMat('#F27E24', 0.34);
        const beak = new THREE.Mesh(new THREE.SphereGeometry(0.034, 12, 10), beakMat);
        beak.scale.set(1.38, 0.58, 1.0);
        beak.position.set(0, -0.242, 0.228);
        const crest = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.015, 0.03, 6, 8),
          upperMat,
        );
        crest.position.set(0, -0.166, 0.115);
        crocGroup.add(beak, crest);

        [-1, 1].forEach((side) => {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.017, 10, 8), pupilMat);
          eye.position.set(side * 0.038, -0.208, 0.21);
          const cheek = new THREE.Mesh(
            new THREE.SphereGeometry(0.019, 8, 8),
            clayMat('#F58E9A', 0.65),
          );
          cheek.scale.set(1.12, 0.78, 0.45);
          cheek.position.set(side * 0.062, -0.23, 0.194);
          crocGroup.add(eye, cheek);
        });
      } else if (config.shoes === 'crocs_frog') {
        [-1, 1].forEach((side) => {
          const bump = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 10), upperMat);
          bump.position.set(side * 0.04, -0.172, 0.138);
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8), scleraMat);
          eye.position.set(side * 0.04, -0.17, 0.155);
          const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.013, 8, 8), pupilMat);
          pupil.position.set(side * 0.04, -0.168, 0.176);
          const blush = new THREE.Mesh(
            new THREE.SphereGeometry(0.019, 8, 8),
            clayMat('#F697AE', 0.62),
          );
          blush.scale.set(1.18, 0.74, 0.45);
          blush.position.set(side * 0.058, -0.232, 0.198);
          crocGroup.add(bump, eye, pupil, blush);
        });
        const smile = new THREE.Mesh(
          new THREE.TorusGeometry(0.034, 0.005, 6, 14, Math.PI),
          holeMat,
        );
        smile.rotation.z = Math.PI;
        smile.position.set(0, -0.235, 0.224);
        crocGroup.add(smile);
      } else if (config.shoes === 'crocs_bunny') {
        const innerEarMat = clayMat('#FFF4F7', 0.52);
        const noseMat = glossyClayMat('#EA5A88', 0.34);
        [-1, 1].forEach((side) => {
          const ear = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.019, 0.068, 6, 10),
            upperMat,
          );
          ear.scale.set(1, 1, 0.45);
          ear.position.set(side * 0.042, -0.164, 0.092);
          ear.rotation.x = -0.95;
          ear.rotation.z = side * 0.22;
          const earIn = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.01, 0.046, 5, 8),
            innerEarMat,
          );
          earIn.scale.set(1, 1, 0.4);
          earIn.position.set(side * 0.042, -0.16, 0.095);
          earIn.rotation.x = -0.95;
          earIn.rotation.z = side * 0.22;
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 8), pupilMat);
          eye.position.set(side * 0.034, -0.208, 0.212);
          crocGroup.add(ear, earIn, eye);
        });
        const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 8), innerEarMat);
        muzzle.scale.set(1.2, 0.85, 0.65);
        muzzle.position.set(0, -0.236, 0.222);
        const nose = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 8), noseMat);
        nose.position.set(0, -0.228, 0.236);
        crocGroup.add(muzzle, nose);
      } else if (config.shoes === 'crocs_dino') {
        const spikeMat = clayMat('#F6CA44', 0.42);
        for (let sp = 0; sp < 3; sp++) {
          const spike = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.04, 6), spikeMat);
          spike.position.set(0, -0.168 - sp * 0.012, 0.078 + sp * 0.038);
          spike.rotation.x = 0.25 + sp * 0.15;
          crocGroup.add(spike);
        }
        [-1, 1].forEach((side) => {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.023, 10, 8), scleraMat);
          eye.position.set(side * 0.044, -0.186, 0.165);
          const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), pupilMat);
          pupil.position.set(side * 0.044, -0.184, 0.184);
          crocGroup.add(eye, pupil);
        });
        for (let t = -2; t <= 2; t++) {
          const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.016, 5), scleraMat);
          tooth.rotation.x = Math.PI;
          tooth.position.set(t * 0.018, -0.256, 0.228 - Math.abs(t) * 0.004);
          crocGroup.add(tooth);
        }
      }
      kneePivot.add(crocGroup);
    } else {
      const isSneaker = config.shoes === 'sneakers' || config.shoes === 'platform_sneakers';
      const isRainBoot = config.shoes === 'rain_boots';
      const bootMat = isRainBoot
        ? glossyClayMat(config.shoeColor || '#E03D45', 0.22)
        : shoeMat;
      const shoeBase = new THREE.Mesh(
        new RoundedBoxGeometry(
          config.shoes === 'platform_sneakers' ? 0.168 : 0.154,
          isSneaker ? 0.092 : 0.102,
          config.shoes === 'platform_sneakers' ? 0.246 : 0.23,
          4,
          isSneaker ? 0.04 : 0.044,
        ),
        bootMat,
      );
      shoeBase.position.set(0, isSneaker ? -0.234 : -0.245, 0.036);
      kneePivot.add(shoeBase);

      const toeCap = new THREE.Mesh(
        new THREE.SphereGeometry(config.shoes === 'platform_sneakers' ? 0.08 : 0.074, 14, 10),
        bootMat,
      );
      toeCap.scale.set(1.0, isSneaker ? 0.6 : 0.68, 1.05);
      toeCap.position.set(0, isSneaker ? -0.24 : -0.251, 0.114);
      kneePivot.add(toeCap);

      if (config.shoes === 'platform_sneakers') {
        const midPlatform = new THREE.Mesh(
          new RoundedBoxGeometry(0.174, 0.038, 0.254, 3, 0.015),
          clayMat('#FFFFFF', 0.42),
        );
        midPlatform.position.set(0, -0.274, 0.042);
        const treadPlatform = new THREE.Mesh(
          new RoundedBoxGeometry(0.176, 0.016, 0.256, 2, 0.006),
          clayMat('#D8B589', 0.56),
        );
        treadPlatform.position.set(0, -0.292, 0.042);
        kneePivot.add(midPlatform, treadPlatform);
        for (let i = 0; i < 3; i++) {
          const lace = new THREE.Mesh(
            new RoundedBoxGeometry(0.068, 0.014, 0.018, 2, 0.005),
            clayMat('#FFFFFF', 0.4),
          );
          lace.position.set(0, -0.188, 0.038 + i * 0.034);
          kneePivot.add(lace);
        }
      } else if (config.shoes === 'ribbon_heels') {
        const collarRim = new THREE.Mesh(
          new THREE.TorusGeometry(0.064, 0.012, 8, 18),
          shoeMat,
        );
        collarRim.rotation.x = Math.PI / 2;
        collarRim.position.set(0, -0.195, 0.005);
        const bowMat = clayMat('#FFF6F9', 0.38);
        [-1, 1].forEach((side) => {
          const wing = new THREE.Mesh(
            new RoundedBoxGeometry(0.038, 0.022, 0.016, 2, 0.008),
            bowMat,
          );
          wing.position.set(side * 0.024, -0.204, 0.112);
          wing.rotation.z = side * 0.25;
          kneePivot.add(wing);
        });
        const pearl = new THREE.Mesh(
          new THREE.SphereGeometry(0.013, 10, 8),
          glossyClayMat('#FFFDF9', 0.15),
        );
        pearl.position.set(0, -0.203, 0.122);
        kneePivot.add(collarRim, pearl);
      } else if (config.shoes === 'sneakers') {
        const outsole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.07, 0.069, 0.022, 22),
          clayMat('#EBE5DB', 0.48),
        );
        outsole.scale.set(1.04, 1, 1.56);
        outsole.position.set(0, -0.284, 0.056);
        kneePivot.add(outsole);

        for (let i = 0; i < 2; i++) {
          const lace = new THREE.Mesh(
            new RoundedBoxGeometry(0.064, 0.014, 0.02, 2, 0.005),
            clayMat('#FFFFFF', 0.4),
          );
          lace.position.set(0, -0.193, 0.042 + i * 0.04);
          kneePivot.add(lace);
        }
      } else if (config.shoes === 'boots') {
        const bootShaft = new THREE.Mesh(
          new THREE.CylinderGeometry(0.084, 0.088, 0.165, 16),
          shoeMat,
        );
        bootShaft.position.set(0, -0.155, 0);
        const collar = new THREE.Mesh(
          new THREE.TorusGeometry(0.084, 0.015, 8, 16),
          clayMat(shadeHex(config.shoeColor || '#3A2B2B', -0.08).getHex(), 0.45),
        );
        collar.rotation.x = Math.PI / 2;
        collar.position.set(0, -0.073, 0);
        kneePivot.add(bootShaft, collar);
      } else if (isRainBoot) {
        const bootShaft = new THREE.Mesh(
          new THREE.CylinderGeometry(0.09, 0.085, 0.195, 18),
          bootMat,
        );
        bootShaft.position.set(0, -0.138, 0);
        const rimColor = config.shoeColor === '#F5E7C6' ? '#E5A832' : '#FFFFFF';
        const collar = new THREE.Mesh(
          new THREE.TorusGeometry(0.09, 0.015, 8, 18),
          clayMat(rimColor, 0.35),
        );
        collar.rotation.x = Math.PI / 2;
        collar.position.set(0, -0.042, 0);
        const lugSole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.075, 0.074, 0.026, 20),
          clayMat(rimColor, 0.42),
        );
        lugSole.scale.set(1.04, 1, 1.56);
        lugSole.position.set(0, -0.283, 0.056);
        kneePivot.add(bootShaft, collar, lugSole);
      } else if (config.shoes === 'mary_janes') {
        const collarRim = new THREE.Mesh(
          new THREE.TorusGeometry(0.064, 0.012, 8, 18),
          shoeMat,
        );
        collarRim.rotation.x = Math.PI / 2;
        collarRim.position.set(0, -0.195, 0.005);
        const strap = new THREE.Mesh(
          new RoundedBoxGeometry(0.148, 0.02, 0.03, 2, 0.008),
          clayMat(shadeHex(config.shoeColor || '#3A2B2B', 0.08).getHex(), 0.35),
        );
        strap.position.set(0, -0.2, 0.032);
        kneePivot.add(collarRim, strap);
      } else if (config.shoes === 'loafers') {
        const collarRim = new THREE.Mesh(
          new THREE.TorusGeometry(0.064, 0.012, 8, 18),
          shoeMat,
        );
        collarRim.rotation.x = Math.PI / 2;
        collarRim.position.set(0, -0.195, 0.005);
        const saddle = new THREE.Mesh(
          new RoundedBoxGeometry(0.14, 0.02, 0.052, 2, 0.008),
          clayMat(shadeHex(config.shoeColor || '#D8B894', -0.14).getHex(), 0.4),
        );
        saddle.position.set(0, -0.197, 0.054);
        kneePivot.add(collarRim, saddle);
      }
    }

    return {legPivot, kneePivot};
  };

  const leftLegRig = makeLeg(-0.125);
  const rightLegRig = makeLeg(0.125);
  const leftLeg = leftLegRig.legPivot;
  const rightLeg = rightLegRig.legPivot;
  const leftKnee = leftLegRig.kneePivot;
  const rightKnee = rightLegRig.kneePivot;
  bodyPivot.add(leftLeg, rightLeg);

  // Seamless sculpted pelvis / groin bridge uniting left & right hips cleanly when sitting or cycling
  const isPinaforeDress = config.top === 'pinafore_dress';
  const isLolitaDress = config.top === 'lolita_dress';
  const isFittedBody =
    config.top === 'office_female' ||
    (isAoDaiTop && config.top !== 'ao_dai_nam') ||
    isLolitaDress;
  const isSkirtBottom =
    isPinaforeDress ||
    isLolitaDress ||
    config.bottom === 'pleated_skirt' ||
    config.bottom === 'midi_skirt' ||
    config.bottom === 'office_skirt' ||
    config.bottom === 'a_line_skirt' ||
    config.bottom === 'tiered_lace_skirt' ||
    config.bottom === 'plaid_skirt';
  const pelvisBridgeMat =
    isPinaforeDress || isLolitaDress
      ? topDarkMat
      : isSkirtBottom
        ? bottomDarkMat
        : bottomMat;
  const pelvisBarR =
    config.bottom === 'office_trousers' ? 0.094 : isSkirtBottom ? 0.086 : 0.103;
  const pelvisBridge = new THREE.Mesh(
    new THREE.CylinderGeometry(pelvisBarR, pelvisBarR, 0.24, 16),
    pelvisBridgeMat,
  );
  pelvisBridge.rotation.z = Math.PI / 2;
  pelvisBridge.position.set(0, 0.525, -0.004);
  const pelvisCollar = new THREE.Mesh(
    new THREE.CylinderGeometry(
      isFittedBody ? 0.168 : 0.195,
      isSkirtBottom ? 0.155 : 0.195,
      0.095,
      20,
    ),
    pelvisBridgeMat,
  );
  pelvisCollar.scale.set(1, 1, 0.72);
  pelvisCollar.position.set(0, 0.558, -0.004);
  bodyPivot.add(pelvisBridge, pelvisCollar);

  // ========== TORSO & SCULPTED CLOTHING ==========
  const torsoGroup = new THREE.Group();
  torsoGroup.position.set(0, 0.77, 0);
  bodyPivot.add(torsoGroup);

  const isOfficeFemale = config.top === 'office_female';
  const pureWhiteMat = clayMat('#FFFFFF', 0.56, 0.02);
  const creamTeeMat = clayMat('#FAF4E8', 0.66, 0.02);
  const baseTorsoMat =
    config.top === 'sailor_blouse' ||
    config.top === 'cardigan_vest' ||
    config.top === 'academy_blazer'
      ? topTrimMat
      : config.top === 'ribbon_blouse' ||
          config.top === 'pinafore_dress' ||
          config.top === 'sport_raglan' ||
          config.top === 'casual_shirt' ||
          config.top === 'denim_overalls'
        ? pureWhiteMat
        : config.top === 'raglan_clover'
          ? creamTeeMat
          : topMat;

  const isHoodie = config.top === 'hoodie' || config.top === 'bunny_hoodie';
  const isOuterwear =
    isHoodie ||
    config.top === 'zip_parka' ||
    config.top === 'varsity_jacket' ||
    config.top === 'puffer_jacket' ||
    config.top === 'trench_coat' ||
    config.top === 'academy_blazer' ||
    config.top === 'bomber_jacket';
  const torsoOffset = isHoodie
    ? 0.024
    : config.top === 'puffer_jacket'
      ? 0.028
      : config.top === 'zip_parka' || config.top === 'trench_coat'
        ? 0.02
        : config.top === 'varsity_jacket' ||
            config.top === 'bomber_jacket' ||
            config.top === 'academy_blazer'
          ? 0.014
          : config.top === 'star_sweater' || config.top === 'turtleneck_sweater'
            ? 0.01
            : 0;
  const torsoYMin =
    isHoodie ||
    config.top === 'zip_parka' ||
    config.top === 'puffer_jacket' ||
    config.top === 'trench_coat'
      ? -0.215
      : -0.195;
  const torsoGeo = new THREE.LatheGeometry(
    isAoDaiTop
      ? createAoDaiTorsoProfile(config.top === 'ao_dai_nam')
      : isFittedBody
        ? createFittedFemaleTorsoProfile()
        : createTorsoProfilePoints(torsoOffset, torsoYMin, 0.21),
    28,
  );
  const torsoMesh = new THREE.Mesh(torsoGeo, baseTorsoMat);
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
  } else if (config.top === 'office_male') {
    // Crisp white tailored dress shirt with structured V-collar, tie, tie clip & central placket
    const shirtWhite = clayMat(config.topColor || '#FFFFFF', 0.56, 0.02);
    const shirtShade = clayMat('#E3E9F0', 0.62, 0.02);
    const tieMat = clayMat('#1F3456', 0.44, 0.05);
    const tieStripeMat = clayMat('#3B5D8C', 0.42, 0.05);
    const silverMat = new THREE.MeshStandardMaterial({
      color: '#DCE2EA',
      roughness: 0.18,
      metalness: 0.65,
    });

    const neckBand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.118, 0.132, 0.042, 22),
      shirtWhite,
    );
    neckBand.position.set(0, 0.196, 0);
    torsoGroup.add(neckBand);

    [-1, 1].forEach((s) => {
      const collarWing = new THREE.Mesh(
        new RoundedBoxGeometry(0.088, 0.048, 0.032, 2, 0.012),
        shirtWhite,
      );
      collarWing.position.set(s * 0.058, 0.172, 0.106);
      collarWing.rotation.z = -s * 0.34;
      collarWing.rotation.y = s * 0.36;
      collarWing.rotation.x = 0.22;
      torsoGroup.add(collarWing);
    });

    const placket = new THREE.Mesh(
      new RoundedBoxGeometry(0.04, 0.3, 0.018, 2, 0.006),
      shirtShade,
    );
    placket.position.set(0, -0.01, 0.205);
    placket.rotation.x = -0.05;
    torsoGroup.add(placket);

    // Sculpted 3D tailored necktie + Windsor knot + metallic tie clip
    const tieKnot = new THREE.Mesh(
      new RoundedBoxGeometry(0.054, 0.052, 0.034, 3, 0.014),
      tieMat,
    );
    tieKnot.position.set(0, 0.146, 0.198);
    tieKnot.rotation.x = -0.22;

    const tieShape = new THREE.Shape();
    tieShape.moveTo(-0.018, 0.135);
    tieShape.lineTo(0.018, 0.135);
    tieShape.lineTo(0.036, -0.088);
    tieShape.lineTo(0.0, -0.142);
    tieShape.lineTo(-0.036, -0.088);
    tieShape.closePath();
    const tieGeo = new THREE.ExtrudeGeometry(tieShape, {
      depth: 0.016,
      bevelEnabled: true,
      bevelThickness: 0.006,
      bevelSize: 0.005,
      bevelSegments: 2,
    });
    const tieBlade = new THREE.Mesh(tieGeo, tieMat);
    tieBlade.position.set(0, -0.004, 0.204);
    tieBlade.rotation.x = -0.06;

    const tieAccent = new THREE.Mesh(
      new RoundedBoxGeometry(0.054, 0.016, 0.022, 2, 0.005),
      tieStripeMat,
    );
    tieAccent.position.set(0, 0.035, 0.216);
    tieAccent.rotation.z = 0.32;

    const tieClip = new THREE.Mesh(
      new RoundedBoxGeometry(0.044, 0.011, 0.012, 2, 0.004),
      silverMat,
    );
    tieClip.position.set(0.008, 0.015, 0.223);
    torsoGroup.add(tieKnot, tieBlade, tieAccent, tieClip);
  } else if (config.top === 'office_female') {
    // Fitted waist-cinching white office blouse with sculpted feminine chest & crisp V-collar
    const shirtWhite = clayMat(config.topColor || '#FFFFFF', 0.54, 0.02);
    const shirtShadow = clayMat('#E6EBF0', 0.62, 0.02);
    const pearlBtnMat = glossyClayMat('#FFF8F2', 0.2);

    // Subtle collarbone V-neck skin reveal
    const vNeckShape = new THREE.Shape();
    vNeckShape.moveTo(-0.056, 0.04);
    vNeckShape.lineTo(0.056, 0.04);
    vNeckShape.lineTo(0.0, -0.042);
    vNeckShape.closePath();
    const vNeckSkin = new THREE.Mesh(
      new THREE.ExtrudeGeometry(vNeckShape, {
        depth: 0.018,
        bevelEnabled: true,
        bevelThickness: 0.006,
        bevelSize: 0.005,
        bevelSegments: 2,
      }),
      skinMat,
    );
    vNeckSkin.position.set(0, 0.16, 0.118);
    vNeckSkin.rotation.x = -0.45;
    torsoGroup.add(vNeckSkin);

    // Sculpted feminine bust contour integrated cleanly in crisp blouse fabric
    [-1, 1].forEach((s) => {
      const bust = new THREE.Mesh(new THREE.SphereGeometry(0.088, 18, 16), shirtWhite);
      bust.scale.set(1.06, 0.94, 0.86);
      bust.position.set(s * 0.068, 0.05, 0.138);
      torsoGroup.add(bust);
    });
    const bridgeChest = new THREE.Mesh(
      new THREE.SphereGeometry(0.062, 14, 12),
      shirtWhite,
    );
    bridgeChest.scale.set(1.25, 0.82, 0.72);
    bridgeChest.position.set(0, 0.048, 0.142);
    torsoGroup.add(bridgeChest);

    // Crisp tailored V-lapels
    [-1, 1].forEach((s) => {
      const lapel = new THREE.Mesh(
        new RoundedBoxGeometry(0.042, 0.125, 0.022, 2, 0.008),
        shirtWhite,
      );
      lapel.position.set(s * 0.042, 0.145, 0.155);
      lapel.rotation.z = s * 0.42;
      lapel.rotation.y = s * 0.28;
      lapel.rotation.x = -0.35;
      torsoGroup.add(lapel);
    });

    // Vertical waist-contour seams & delicate pearl buttons
    const placket = new THREE.Mesh(
      new RoundedBoxGeometry(0.026, 0.21, 0.016, 2, 0.005),
      shirtShadow,
    );
    placket.position.set(0, -0.025, 0.175);
    torsoGroup.add(placket);

    for (let i = 0; i < 3; i++) {
      const btn = new THREE.Mesh(
        new THREE.SphereGeometry(0.011, 10, 8),
        pearlBtnMat,
      );
      btn.scale.set(1, 1, 0.6);
      btn.position.set(0, 0.01 - i * 0.058, 0.186 - i * 0.004);
      torsoGroup.add(btn);
    }
  } else if (config.top === 'varsity_jacket') {
    const creamSleeveMat = topTrimMat;
    const stripeDarkMat = topDarkMat;

    // Contrasting ribbed varsity stand collar with white stripe
    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(0.136, 0.032, 10, 26),
      topMat,
    );
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, 0.196, 0);
    const collarStripe = new THREE.Mesh(
      new THREE.TorusGeometry(0.146, 0.008, 8, 26),
      creamSleeveMat,
    );
    collarStripe.rotation.x = Math.PI / 2;
    collarStripe.position.set(0, 0.208, 0);
    torsoGroup.add(collar, collarStripe);

    // Subtle inner white tee V-peek at throat
    const innerTee = new THREE.Mesh(
      new THREE.CylinderGeometry(0.105, 0.08, 0.055, 18),
      pureWhiteMat,
    );
    innerTee.position.set(0, 0.198, 0.036);
    torsoGroup.add(innerTee);

    // Center snap placket + 5 glossy snap buttons
    const placket = new THREE.Mesh(
      new RoundedBoxGeometry(0.036, 0.34, 0.02, 2, 0.006),
      stripeDarkMat,
    );
    placket.position.set(0, -0.015, 0.216);
    placket.rotation.x = -0.05;
    torsoGroup.add(placket);

    const snapMat = glossyClayMat('#F4F5F7', 0.18);
    for (let i = 0; i < 5; i++) {
      const snap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.014, 0.014, 0.014, 12),
        snapMat,
      );
      snap.rotation.x = Math.PI / 2;
      snap.position.set(0, 0.115 - i * 0.068, 0.224 + i * 0.003);
      torsoGroup.add(snap);
    }

    // Striped ribbed waistband hem
    const ribHem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.236, 0.238, 0.048, 28),
      stripeDarkMat,
    );
    ribHem.position.set(0, -0.175, 0);
    const hemStripe = new THREE.Mesh(
      new THREE.TorusGeometry(0.238, 0.008, 8, 28),
      creamSleeveMat,
    );
    hemStripe.rotation.x = Math.PI / 2;
    hemStripe.position.set(0, -0.175, 0);
    torsoGroup.add(ribHem, hemStripe);

    // Slanted crisp white welt pockets
    [-1, 1].forEach((s) => {
      const welt = new THREE.Mesh(
        new RoundedBoxGeometry(0.022, 0.095, 0.022, 2, 0.008),
        creamSleeveMat,
      );
      welt.position.set(s * 0.132, -0.078, 0.205);
      welt.rotation.y = s * 0.56;
      welt.rotation.z = s * 0.26;
      torsoGroup.add(welt);
    });

    // Crisp collegiate 'B' chenille patch on left chest (viewer right)
    const patchTex = createVarsityBadgeTexture('B', '#2E333E', '#FFFFFF');
    const badgePlate = new THREE.Mesh(
      new RoundedBoxGeometry(0.072, 0.082, 0.016, 2, 0.006),
      new THREE.MeshStandardMaterial({
        color: '#FFFFFF',
        map: patchTex,
        roughness: 0.72,
        metalness: 0,
      }),
    );
    badgePlate.position.set(0.088, 0.068, 0.206);
    badgePlate.rotation.y = 0.36;
    badgePlate.rotation.x = -0.08;
    torsoGroup.add(badgePlate);
  } else if (config.top === 'raglan_clover') {
    // Raglan sage collar + shoulder yoke arcs + 3D 4-leaf clover chest emblem
    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(0.122, 0.028, 10, 24),
      topMat,
    );
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, 0.198, 0);
    torsoGroup.add(collar);

    [-1, 1].forEach((s) => {
      const yoke = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.044, 0.095, 8, 12),
        topMat,
      );
      yoke.position.set(s * 0.145, 0.155, 0);
      yoke.rotation.z = s * 1.15;
      torsoGroup.add(yoke);
    });

    const cloverGrp = new THREE.Group();
    cloverGrp.position.set(0, 0.045, 0.214);
    const leafMat = clayMat(config.topColor, 0.58);
    const leafOffsets: [number, number, number][] = [
      [-0.022, 0.022, 0.65],
      [0.022, 0.022, -0.65],
      [-0.024, -0.018, 2.35],
      [0.024, -0.018, -2.35],
    ];
    leafOffsets.forEach(([lx, ly, rot]) => {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.024, 12, 10), leafMat);
      leaf.scale.set(1.0, 1.24, 0.45);
      leaf.position.set(lx, ly, 0);
      leaf.rotation.z = rot;
      cloverGrp.add(leaf);
    });
    const stem = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.007, 0.036, 5, 8),
      leafMat,
    );
    stem.position.set(0.008, -0.046, -0.002);
    stem.rotation.z = 0.24;
    cloverGrp.add(stem);
    torsoGroup.add(cloverGrp);
  } else if (config.top === 'star_sweater') {
    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(0.128, 0.038, 10, 24),
      topDarkMat,
    );
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, 0.204, 0);

    const ribHem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.238, 0.242, 0.046, 26),
      topDarkMat,
    );
    ribHem.position.set(0, -0.17, 0);
    torsoGroup.add(collar, ribHem);

    // 3D golden knit star emblem on chest
    const starGeo = new THREE.ExtrudeGeometry(createFivePointStarShape(0.046, 0.021), {
      depth: 0.012,
      bevelEnabled: true,
      bevelThickness: 0.005,
      bevelSize: 0.004,
      bevelSegments: 2,
    });
    const starMesh = new THREE.Mesh(starGeo, clayMat('#E8B954', 0.52));
    starMesh.position.set(0.056, 0.052, 0.214);
    starMesh.rotation.y = 0.22;
    starMesh.rotation.x = -0.08;
    torsoGroup.add(starMesh);
  } else if (config.top === 'ribbon_blouse') {
    const collarShade = clayMat('#EEF2F6', 0.58);
    [-1, 1].forEach((s) => {
      const collarWing = new THREE.Mesh(
        new RoundedBoxGeometry(0.088, 0.048, 0.032, 2, 0.012),
        pureWhiteMat,
      );
      collarWing.position.set(s * 0.058, 0.178, 0.114);
      collarWing.rotation.z = -s * 0.34;
      collarWing.rotation.y = s * 0.34;
      collarWing.rotation.x = 0.2;
      torsoGroup.add(collarWing);
    });

    const placket = new THREE.Mesh(
      new RoundedBoxGeometry(0.028, 0.28, 0.014, 2, 0.005),
      collarShade,
    );
    placket.position.set(0, -0.02, 0.206);
    placket.rotation.x = -0.05;
    torsoGroup.add(placket);

    const btnMat = glossyClayMat('#FFF8F2', 0.22);
    for (let i = 0; i < 3; i++) {
      const btn = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 8), btnMat);
      btn.scale.set(1, 1, 0.55);
      btn.position.set(0, 0.025 - i * 0.068, 0.214 + i * 0.004);
      torsoGroup.add(btn);
    }

    // Lush sculpted 3D red ribbon bow at collar
    const bowMat = clayMat(config.topColor || '#D94B5A', 0.48);
    const knotMat = clayMat(shadeHex(config.topColor || '#D94B5A', -0.08).getHex(), 0.5);
    const bowGrp = new THREE.Group();
    bowGrp.position.set(0, 0.138, 0.204);
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.032, 12, 10), knotMat);
    knot.scale.set(1.0, 0.9, 0.85);
    bowGrp.add(knot);
    [-1, 1].forEach((s) => {
      const wing = new THREE.Mesh(
        new RoundedBoxGeometry(0.076, 0.048, 0.026, 3, 0.016),
        bowMat,
      );
      wing.position.set(s * 0.054, 0.006, -0.004);
      wing.rotation.z = s * 0.22;
      wing.rotation.y = -s * 0.24;
      const tail = new THREE.Mesh(
        new RoundedBoxGeometry(0.028, 0.086, 0.016, 2, 0.007),
        bowMat,
      );
      tail.position.set(s * 0.03, -0.052, 0.004);
      tail.rotation.z = s * 0.24;
      bowGrp.add(wing, tail);
    });
    torsoGroup.add(bowGrp);
  } else if (config.top === 'pinafore_dress') {
    // Yellow overall pinafore bib, shoulder straps, brass buttons, and front pocket over white tee
    const bibFront = new THREE.Mesh(
      new RoundedBoxGeometry(0.245, 0.165, 0.048, 3, 0.018),
      topMat,
    );
    bibFront.position.set(0, 0.025, 0.194);
    bibFront.rotation.x = -0.06;

    const bibBack = new THREE.Mesh(
      new RoundedBoxGeometry(0.235, 0.155, 0.042, 3, 0.016),
      topMat,
    );
    bibBack.position.set(0, 0.025, -0.192);
    bibBack.rotation.x = 0.06;

    const waistBand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.218, 0.226, 0.145, 28),
      topMat,
    );
    waistBand.position.set(0, -0.115, 0);

    const bibPocket = new THREE.Mesh(
      new RoundedBoxGeometry(0.165, 0.095, 0.03, 3, 0.012),
      topLightMat,
    );
    bibPocket.position.set(0, -0.032, 0.218);
    const pocketRim = new THREE.Mesh(
      new RoundedBoxGeometry(0.172, 0.018, 0.032, 2, 0.006),
      topDarkMat,
    );
    pocketRim.position.set(0, 0.014, 0.219);
    torsoGroup.add(bibFront, bibBack, waistBand, bibPocket, pocketRim);

    const brassMat = glossyClayMat('#E3B04B', 0.25);
    [-1, 1].forEach((s) => {
      const strap = new THREE.Mesh(
        new THREE.TorusGeometry(0.125, 0.022, 8, 20, Math.PI * 0.92),
        topMat,
      );
      strap.rotation.y = Math.PI / 2;
      strap.rotation.z = 0.08;
      strap.position.set(s * 0.105, 0.09, 0.004);
      const btn = new THREE.Mesh(
        new THREE.CylinderGeometry(0.017, 0.017, 0.014, 12),
        brassMat,
      );
      btn.rotation.x = Math.PI / 2;
      btn.position.set(s * 0.098, 0.086, 0.216);
      torsoGroup.add(strap, btn);
    });
  } else if (config.top === 'bunny_hoodie') {
    // Plush Pastel Bunny Hoodie with cowl collar, compact back hood, kangaroo pocket, and 3D bunny face badge
    const hoodInnerMat = clayMat(shadeHex(config.topColor, -0.16).getHex(), 0.78);
    const cowlCollar = new THREE.Mesh(
      new THREE.TorusGeometry(0.172, 0.054, 12, 26),
      topMat,
    );
    cowlCollar.rotation.x = Math.PI / 2 + 0.22;
    cowlCollar.position.set(0, 0.192, -0.022);
    torsoGroup.add(cowlCollar);

    const backHoodGroup = new THREE.Group();
    backHoodGroup.position.set(0, 0.132, -0.162);
    const hoodOuterShell = new THREE.Mesh(
      new THREE.SphereGeometry(0.168, 18, 16),
      topMat,
    );
    hoodOuterShell.scale.set(1.12, 0.74, 0.76);
    hoodOuterShell.rotation.x = -0.38;
    const hoodInnerPocket = new THREE.Mesh(
      new THREE.SphereGeometry(0.115, 14, 12),
      hoodInnerMat,
    );
    hoodInnerPocket.scale.set(1.02, 0.45, 0.72);
    hoodInnerPocket.rotation.x = -0.45;
    hoodInnerPocket.position.set(0, 0.052, -0.015);
    backHoodGroup.add(hoodOuterShell, hoodInnerPocket);
    torsoGroup.add(backHoodGroup);

    const ribHem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.252, 0.244, 0.052, 26),
      topDarkMat,
    );
    ribHem.position.set(0, -0.186, 0);
    const pocket = new THREE.Mesh(
      new RoundedBoxGeometry(0.265, 0.115, 0.052, 3, 0.02),
      topLightMat,
    );
    pocket.position.set(0, -0.075, 0.224);
    torsoGroup.add(ribHem, pocket);

    // Drawstrings with round pom tips
    [-1, 1].forEach((s) => {
      const cord = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.009, 0.088, 6, 8),
        pureWhiteMat,
      );
      cord.position.set(s * 0.052, 0.105, 0.226);
      cord.rotation.z = s * 0.08;
      cord.rotation.x = -0.14;
      const pom = new THREE.Mesh(new THREE.SphereGeometry(0.015, 10, 8), pureWhiteMat);
      pom.position.set(s * 0.058, 0.054, 0.232);
      torsoGroup.add(cord, pom);
    });

    // Cute 3D White Bunny Face Emblem on chest
    const bunnyGrp = new THREE.Group();
    bunnyGrp.position.set(0, 0.048, 0.228);
    const bunnyHead = new THREE.Mesh(
      new THREE.SphereGeometry(0.048, 16, 12),
      pureWhiteMat,
    );
    bunnyHead.scale.set(1.14, 0.92, 0.42);
    bunnyGrp.add(bunnyHead);

    const bunnyEyeMat = clayMat('#2B2328', 0.3);
    const bunnyPinkMat = clayMat('#F5A2B8', 0.6);
    [-1, 1].forEach((s) => {
      const ear = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.015, 0.042, 6, 10),
        pureWhiteMat,
      );
      ear.scale.set(0.95, 1, 0.48);
      ear.position.set(s * 0.024, 0.058, 0);
      ear.rotation.z = -s * 0.14;
      const earIn = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.008, 0.026, 5, 8),
        bunnyPinkMat,
      );
      earIn.scale.set(0.9, 1, 0.45);
      earIn.position.set(s * 0.024, 0.056, 0.006);
      earIn.rotation.z = -s * 0.14;
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 6), bunnyEyeMat);
      eye.position.set(s * 0.018, 0.006, 0.018);
      bunnyGrp.add(ear, earIn, eye);
    });
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.0065, 8, 6), bunnyPinkMat);
    nose.scale.set(1.2, 0.85, 0.6);
    nose.position.set(0, -0.006, 0.02);
    bunnyGrp.add(nose);
    torsoGroup.add(bunnyGrp);
  } else if (config.top === 'zip_parka') {
    // Cozy zip-up hooded parka with inner white tee collar peek, metallic zipper, white trim pockets & hem
    const innerTee = new THREE.Mesh(
      new THREE.CylinderGeometry(0.112, 0.09, 0.065, 18),
      pureWhiteMat,
    );
    innerTee.position.set(0, 0.194, 0.03);
    torsoGroup.add(innerTee);

    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(0.168, 0.046, 12, 26),
      topMat,
    );
    collar.rotation.x = Math.PI / 2 + 0.22;
    collar.position.set(0, 0.188, -0.022);
    torsoGroup.add(collar);

    const backHoodGroup = new THREE.Group();
    backHoodGroup.position.set(0, 0.13, -0.16);
    const hoodOuterShell = new THREE.Mesh(
      new THREE.SphereGeometry(0.165, 18, 16),
      topMat,
    );
    hoodOuterShell.scale.set(1.12, 0.76, 0.76);
    hoodOuterShell.rotation.x = -0.38;
    const hoodLining = new THREE.Mesh(
      new THREE.SphereGeometry(0.116, 14, 12),
      topLightMat,
    );
    hoodLining.scale.set(1.0, 0.45, 0.7);
    hoodLining.rotation.x = -0.46;
    hoodLining.position.set(0, 0.052, -0.014);
    backHoodGroup.add(hoodOuterShell, hoodLining);
    torsoGroup.add(backHoodGroup);

    // Center zipper track & metallic pull tab
    const zipMat = new THREE.MeshStandardMaterial({
      color: '#E5E8EE',
      roughness: 0.25,
      metalness: 0.55,
    });
    const zipTrack = new THREE.Mesh(
      new RoundedBoxGeometry(0.018, 0.34, 0.016, 2, 0.004),
      zipMat,
    );
    zipTrack.position.set(0, -0.015, 0.222);
    zipTrack.rotation.x = -0.05;
    const zipPull = new THREE.Mesh(
      new RoundedBoxGeometry(0.022, 0.034, 0.014, 2, 0.005),
      zipMat,
    );
    zipPull.position.set(0, 0.135, 0.226);
    zipPull.rotation.x = 0.22;
    torsoGroup.add(zipTrack, zipPull);

    // White ribbed waistband hem
    const ribHem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.246, 0.242, 0.046, 26),
      pureWhiteMat,
    );
    ribHem.position.set(0, -0.186, 0);
    torsoGroup.add(ribHem);

    // Front side pockets with crisp white welt trim
    [-1, 1].forEach((s) => {
      const pocket = new THREE.Mesh(
        new RoundedBoxGeometry(0.088, 0.092, 0.028, 2, 0.01),
        topLightMat,
      );
      pocket.position.set(s * 0.134, -0.084, 0.212);
      pocket.rotation.y = s * 0.48;
      const trim = new THREE.Mesh(
        new RoundedBoxGeometry(0.092, 0.022, 0.03, 2, 0.006),
        pureWhiteMat,
      );
      trim.position.set(s * 0.134, -0.044, 0.214);
      trim.rotation.y = s * 0.48;
      torsoGroup.add(pocket, trim);
    });
  } else if (config.top === 'safari_shirt') {
    const placket = new THREE.Mesh(
      new RoundedBoxGeometry(0.032, 0.31, 0.016, 2, 0.005),
      topLightMat,
    );
    placket.position.set(0, -0.015, 0.205);
    placket.rotation.x = -0.05;
    torsoGroup.add(placket);

    [-1, 1].forEach((s) => {
      const collarWing = new THREE.Mesh(
        new RoundedBoxGeometry(0.086, 0.048, 0.032, 2, 0.012),
        topLightMat,
      );
      collarWing.position.set(s * 0.058, 0.178, 0.112);
      collarWing.rotation.z = -s * 0.34;
      collarWing.rotation.y = s * 0.34;
      collarWing.rotation.x = 0.2;

      const pocket = new THREE.Mesh(
        new RoundedBoxGeometry(0.078, 0.08, 0.022, 2, 0.008),
        topLightMat,
      );
      pocket.position.set(s * 0.098, 0.036, 0.195);
      pocket.rotation.y = s * 0.38;
      const flap = new THREE.Mesh(
        new RoundedBoxGeometry(0.082, 0.026, 0.024, 2, 0.006),
        topDarkMat,
      );
      flap.position.set(s * 0.098, 0.072, 0.196);
      flap.rotation.y = s * 0.38;
      torsoGroup.add(collarWing, pocket, flap);
    });

    const btnMat = clayMat('#6B4A32', 0.42);
    for (let i = 0; i < 4; i++) {
      const btn = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, 0.012, 10),
        btnMat,
      );
      btn.rotation.x = Math.PI / 2;
      btn.position.set(0, 0.1 - i * 0.074, 0.214 + i * 0.004);
      torsoGroup.add(btn);
    }
  } else if (config.top === 'sport_raglan') {
    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(0.122, 0.028, 10, 24),
      topMat,
    );
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, 0.198, 0);
    torsoGroup.add(collar);

    [-1, 1].forEach((s) => {
      const yoke = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.044, 0.095, 8, 12),
        topMat,
      );
      yoke.position.set(s * 0.145, 0.155, 0);
      yoke.rotation.z = s * 1.15;
      torsoGroup.add(yoke);
    });

    const starGeo = new THREE.ExtrudeGeometry(createFivePointStarShape(0.06, 0.027), {
      depth: 0.012,
      bevelEnabled: true,
      bevelThickness: 0.005,
      bevelSize: 0.004,
      bevelSegments: 2,
    });
    const starMesh = new THREE.Mesh(starGeo, topMat);
    starMesh.position.set(0, 0.045, 0.204);
    starMesh.rotation.x = -0.06;
    torsoGroup.add(starMesh);
  } else if (config.top === 'casual_shirt') {
    const shirtShade = clayMat('#E6ECF2', 0.62, 0.02);
    [-1, 1].forEach((s) => {
      const collarWing = new THREE.Mesh(
        new RoundedBoxGeometry(0.086, 0.048, 0.03, 2, 0.012),
        pureWhiteMat,
      );
      collarWing.position.set(s * 0.056, 0.178, 0.112);
      collarWing.rotation.z = -s * 0.34;
      collarWing.rotation.y = s * 0.34;
      collarWing.rotation.x = 0.2;
      torsoGroup.add(collarWing);
    });

    const placket = new THREE.Mesh(
      new RoundedBoxGeometry(0.03, 0.31, 0.014, 2, 0.005),
      shirtShade,
    );
    placket.position.set(0, -0.015, 0.205);
    placket.rotation.x = -0.05;

    const chestPocket = new THREE.Mesh(
      new RoundedBoxGeometry(0.068, 0.072, 0.018, 2, 0.007),
      shirtShade,
    );
    chestPocket.position.set(0.095, 0.045, 0.194);
    chestPocket.rotation.y = 0.38;
    torsoGroup.add(placket, chestPocket);

    const btnMat = glossyClayMat('#EEF2F6', 0.24);
    for (let i = 0; i < 4; i++) {
      const btn = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 8), btnMat);
      btn.scale.set(1, 1, 0.55);
      btn.position.set(0, 0.105 - i * 0.074, 0.214 + i * 0.004);
      torsoGroup.add(btn);
    }
  } else if (config.top === 'panda_pajama') {
    // Crisp white Peter Pan collar + button placket on cute panda-patterned pajama shirt
    [-1, 1].forEach((s) => {
      const collarLeaf = new THREE.Mesh(
        new THREE.SphereGeometry(0.068, 14, 10),
        pureWhiteMat,
      );
      collarLeaf.scale.set(1.18, 0.24, 0.92);
      collarLeaf.position.set(s * 0.074, 0.184, 0.088);
      collarLeaf.rotation.y = s * 0.36;
      collarLeaf.rotation.z = -s * 0.28;
      collarLeaf.rotation.x = 0.24;
      torsoGroup.add(collarLeaf);
    });
    const backCollar = new THREE.Mesh(
      new THREE.TorusGeometry(0.118, 0.018, 8, 22, Math.PI * 1.15),
      pureWhiteMat,
    );
    backCollar.rotation.x = Math.PI / 2;
    backCollar.rotation.z = Math.PI - 0.18;
    backCollar.position.set(0, 0.192, -0.01);
    const placket = new THREE.Mesh(
      new RoundedBoxGeometry(0.032, 0.34, 0.016, 2, 0.006),
      pureWhiteMat,
    );
    placket.position.set(0, -0.015, 0.205);
    placket.rotation.x = -0.05;
    torsoGroup.add(backCollar, placket);

    const btnMat = clayMat('#FFF6EC', 0.4);
    for (let i = 0; i < 4; i++) {
      const btn = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), btnMat);
      btn.scale.set(1, 1, 0.55);
      btn.position.set(0, 0.115 - i * 0.078, 0.214 + i * 0.004);
      torsoGroup.add(btn);
    }
  } else if (config.top === 'denim_overalls') {
    const denimMat = clayMat(config.topColor || '#364A72', 0.72);
    const denimDarkMat = clayMat(shadeHex(config.topColor || '#364A72', -0.08).getHex(), 0.75);
    const brassMat = new THREE.MeshStandardMaterial({
      color: '#F2C14E',
      roughness: 0.26,
      metalness: 0.65,
    });
    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(0.118, 0.022, 10, 22),
      pureWhiteMat,
    );
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, 0.196, 0);
    // Lower denim wrap + bib apron
    const waistWrap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.212, 0.222, 0.195, 26),
      denimMat,
    );
    waistWrap.position.set(0, -0.125, 0);
    const bibFront = new THREE.Mesh(
      new RoundedBoxGeometry(0.224, 0.195, 0.044, 3, 0.014),
      denimMat,
    );
    bibFront.position.set(0, 0.024, 0.188);
    bibFront.rotation.x = -0.08;
    const bibPocket = new THREE.Mesh(
      new RoundedBoxGeometry(0.125, 0.085, 0.018, 2, 0.008),
      denimDarkMat,
    );
    bibPocket.position.set(0, 0.036, 0.212);
    bibPocket.rotation.x = -0.08;
    torsoGroup.add(collar, waistWrap, bibFront, bibPocket);

    [-1, 1].forEach((s) => {
      const strap = new THREE.Mesh(
        new RoundedBoxGeometry(0.046, 0.21, 0.22, 3, 0.016),
        denimMat,
      );
      strap.position.set(s * 0.095, 0.115, 0.076);
      strap.rotation.x = 0.08;
      const btn = new THREE.Mesh(
        new THREE.CylinderGeometry(0.016, 0.016, 0.014, 12),
        brassMat,
      );
      btn.rotation.x = Math.PI / 2;
      btn.position.set(s * 0.088, 0.105, 0.205);
      torsoGroup.add(strap, btn);
    });
  } else if (config.top === 'puffer_jacket') {
    const pufferMat = topMat;
    const greenLiningMat = clayMat('#2B7A4B', 0.68);
    // Chunky quilted horizontal puffer baffles + green collar lining + white zipper trim
    const baffleY = [-0.145, -0.04, 0.068, 0.165];
    const baffleR = [0.244, 0.238, 0.228, 0.206];
    baffleY.forEach((by, idx) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(baffleR[idx] - 0.028, 0.046, 12, 28),
        pufferMat,
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.set(0, by, 0);
      torsoGroup.add(ring);
    });
    const innerCollar = new THREE.Mesh(
      new THREE.TorusGeometry(0.148, 0.038, 10, 24),
      greenLiningMat,
    );
    innerCollar.rotation.x = Math.PI / 2;
    innerCollar.position.set(0, 0.205, 0.008);
    const whiteZip = new THREE.Mesh(
      new RoundedBoxGeometry(0.03, 0.36, 0.018, 2, 0.006),
      pureWhiteMat,
    );
    whiteZip.position.set(0, -0.01, 0.236);
    whiteZip.rotation.x = -0.05;
    const hoodCollar = new THREE.Mesh(
      new THREE.SphereGeometry(0.185, 16, 12),
      greenLiningMat,
    );
    hoodCollar.scale.set(1.12, 0.56, 0.85);
    hoodCollar.position.set(0, 0.16, -0.155);
    torsoGroup.add(innerCollar, whiteZip, hoodCollar);
  } else if (isAoDaiTop) {
    const isMaleAoDai = config.top === 'ao_dai_nam';
    const isWhiteAoDai = config.top === 'ao_dai_white';
    const trimAccentMat = isWhiteAoDai
      ? glossyClayMat('#EAE2D6', 0.32)
      : clayMat('#F2CA52', 0.34, 0.24);
    const frogBtnMat = isWhiteAoDai
      ? glossyClayMat('#FFFFFF', 0.22)
      : glossyClayMat('#F4D05E', 0.26);

    // 1. Classic Vietnamese Standing Mandarin Collar (Cổ Tàu) with subtle front notch & silk/gold piping
    const collarH = isMaleAoDai ? 0.058 : 0.054;
    const collarR = isMaleAoDai ? 0.114 : 0.106;
    const collar = new THREE.Mesh(
      new THREE.CylinderGeometry(collarR, collarR + 0.009, collarH, 24, 1, false, 0.14, Math.PI * 2 - 0.28),
      topMat,
    );
    collar.position.set(0, 0.212, 0);
    const collarTopRim = new THREE.Mesh(
      new THREE.TorusGeometry(collarR + 0.001, 0.007, 8, 24, Math.PI * 2 - 0.28),
      trimAccentMat,
    );
    collarTopRim.rotation.x = Math.PI / 2;
    collarTopRim.rotation.z = Math.PI / 2 - 0.14;
    collarTopRim.position.set(0, 0.212 + collarH * 0.5, 0);
    const collarBaseRim = new THREE.Mesh(
      new THREE.TorusGeometry(collarR + 0.01, 0.0065, 8, 24, Math.PI * 2 - 0.28),
      trimAccentMat,
    );
    collarBaseRim.rotation.x = Math.PI / 2;
    collarBaseRim.rotation.z = Math.PI / 2 - 0.14;
    collarBaseRim.position.set(0, 0.212 - collarH * 0.45, 0);
    torsoGroup.add(collar, collarTopRim, collarBaseRim);

    // 2. Sculpted feminine bust silhouette on women's Áo Dài
    if (!isMaleAoDai) {
      [-1, 1].forEach((s) => {
        const bust = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 14), topMat);
        bust.scale.set(1.04, 0.9, 0.8);
        bust.position.set(s * 0.066, 0.054, 0.136);
        torsoGroup.add(bust);
      });
    }

    // 3. Authentic Raglan Diagonal Sleeve Seams from neck down toward underarms
    [-1, 1].forEach((s) => {
      const raglanCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(s * 0.072, 0.194, 0.088),
        new THREE.Vector3(s * 0.128, 0.16, 0.095),
        new THREE.Vector3(s * 0.168, 0.118, 0.056),
      ]);
      const raglanSeam = new THREE.Mesh(
        new THREE.TubeGeometry(raglanCurve, 12, 0.0055, 6, false),
        trimAccentMat,
      );
      const backRaglanCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(s * 0.072, 0.194, -0.088),
        new THREE.Vector3(s * 0.128, 0.16, -0.095),
        new THREE.Vector3(s * 0.168, 0.118, -0.056),
      ]);
      const backRaglan = new THREE.Mesh(
        new THREE.TubeGeometry(backRaglanCurve, 12, 0.0055, 6, false),
        trimAccentMat,
      );
      torsoGroup.add(raglanSeam, backRaglan);
    });

    // 4. Diagonal Tà Chéo Closure Piping + 4 Delicate Frog Buttons (Khuy Bấm) down right side
    const zFront = isMaleAoDai ? 0.192 : 0.188;
    const plackPts = [
      new THREE.Vector3(0.014, 0.184, 0.132),
      new THREE.Vector3(0.088, 0.142, 0.168),
      new THREE.Vector3(0.146, 0.088, 0.146),
      new THREE.Vector3(0.158, -0.025, 0.118),
      new THREE.Vector3(0.168, -0.148, 0.098),
    ];
    const diagPlacket = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(plackPts), 20, 0.0065, 6, false),
      trimAccentMat,
    );
    torsoGroup.add(diagPlacket);

    [
      [0.085, 0.142, 0.172],
      [0.144, 0.088, 0.15],
      [0.156, 0.024, 0.132],
      [0.16, -0.042, 0.122],
    ].forEach(([bx, by, bz]) => {
      const frogKnot = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 8), frogBtnMat);
      frogKnot.scale.set(1.25, 0.85, 0.75);
      frogKnot.position.set(bx, by, bz);
      torsoGroup.add(frogKnot);
    });

    // Refined waist sash / lotus emblem on lotus & peach Áo Dài
    if (config.top === 'ao_dai_lotus' || config.top === 'ao_dai_peach') {
      const brooch = new THREE.Mesh(
        new THREE.CylinderGeometry(0.022, 0.022, 0.01, 14),
        trimAccentMat,
      );
      brooch.rotation.x = Math.PI / 2;
      brooch.position.set(-0.072, 0.098, zFront - 0.012);
      brooch.rotation.y = -0.35;
      torsoGroup.add(brooch);
    }
  } else if (config.top === 'lolita_dress') {
    const laceMat = clayMat('#FFF9FB', 0.66);
    const ribbonMat = clayMat(shadeHex(config.topColor, -0.14).getHex(), 0.48);
    const gemMat = glossyClayMat('#FF78A8', 0.16);

    // Sweet ruffled sweetheart collar + lace yoke
    const neckRuffle = new THREE.Mesh(
      new THREE.TorusGeometry(0.118, 0.022, 10, 26),
      laceMat,
    );
    neckRuffle.rotation.x = Math.PI / 2;
    neckRuffle.position.set(0, 0.194, 0.006);
    torsoGroup.add(neckRuffle);

    // Sculpted princess bodice contour + front ribbon corset panel
    [-1, 1].forEach((s) => {
      const bust = new THREE.Mesh(new THREE.SphereGeometry(0.078, 14, 12), topMat);
      bust.scale.set(1.04, 0.88, 0.8);
      bust.position.set(s * 0.064, 0.052, 0.132);
      torsoGroup.add(bust);
    });

    const bodicePanel = new THREE.Mesh(
      new RoundedBoxGeometry(0.115, 0.215, 0.024, 3, 0.008),
      laceMat,
    );
    bodicePanel.position.set(0, -0.022, 0.172);
    torsoGroup.add(bodicePanel);

    // Crossed corset ribbons + chest bow with heart gem
    for (let i = 0; i < 3; i++) {
      const bar = new THREE.Mesh(
        new RoundedBoxGeometry(0.088, 0.013, 0.016, 2, 0.005),
        ribbonMat,
      );
      bar.position.set(0, 0.028 - i * 0.048, 0.184);
      bar.rotation.z = i % 2 === 0 ? 0.18 : -0.18;
      torsoGroup.add(bar);
    }
    const bowCenter = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 10), gemMat);
    bowCenter.position.set(0, 0.108, 0.188);
    torsoGroup.add(bowCenter);
    [-1, 1].forEach((s) => {
      const wing = new THREE.Mesh(
        new RoundedBoxGeometry(0.056, 0.036, 0.018, 2, 0.01),
        ribbonMat,
      );
      wing.position.set(s * 0.042, 0.11, 0.184);
      wing.rotation.z = s * 0.22;
      torsoGroup.add(wing);
    });

    // Waistband bow at back & front waist sash
    const waistSash = new THREE.Mesh(
      new THREE.CylinderGeometry(0.176, 0.182, 0.04, 24),
      ribbonMat,
    );
    waistSash.position.set(0, -0.112, 0);
    torsoGroup.add(waistSash);
  } else if (config.top === 'trench_coat') {
    const coatDarkMat = clayMat(shadeHex(config.topColor, -0.14).getHex(), 0.72);
    const buckleMat = new THREE.MeshStandardMaterial({
      color: '#D9B15F',
      roughness: 0.25,
      metalness: 0.62,
    });
    const innerShirt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.112, 0.09, 0.065, 18),
      pureWhiteMat,
    );
    innerShirt.position.set(0, 0.192, 0.032);
    torsoGroup.add(innerShirt);

    // Wide notched trench lapels
    [-1, 1].forEach((s) => {
      const lapel = new THREE.Mesh(
        new RoundedBoxGeometry(0.072, 0.185, 0.026, 2, 0.008),
        topLightMat,
      );
      lapel.position.set(s * 0.066, 0.105, 0.202);
      lapel.rotation.z = s * 0.28;
      lapel.rotation.y = s * 0.34;
      const shoulderEpaulet = new THREE.Mesh(
        new RoundedBoxGeometry(0.088, 0.02, 0.042, 2, 0.006),
        coatDarkMat,
      );
      shoulderEpaulet.position.set(s * 0.135, 0.188, 0.008);
      shoulderEpaulet.rotation.z = -s * 0.22;
      torsoGroup.add(lapel, shoulderEpaulet);
    });

    // Double-breasted buttons (2 columns x 3 rows)
    for (let r = 0; r < 3; r++) {
      [-1, 1].forEach((s) => {
        const btn = new THREE.Mesh(
          new THREE.CylinderGeometry(0.014, 0.014, 0.014, 10),
          clayMat('#4B3322', 0.42),
        );
        btn.rotation.x = Math.PI / 2;
        btn.position.set(s * 0.046, 0.065 - r * 0.066, 0.222 + r * 0.004);
        torsoGroup.add(btn);
      });
    }

    // Trench waist belt + metallic buckle
    const belt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.242, 0.246, 0.042, 28),
      coatDarkMat,
    );
    belt.position.set(0, -0.105, 0);
    const beltBuckle = new THREE.Mesh(
      new RoundedBoxGeometry(0.056, 0.046, 0.016, 2, 0.005),
      buckleMat,
    );
    beltBuckle.position.set(0, -0.105, 0.245);
    torsoGroup.add(belt, beltBuckle);
  } else if (config.top === 'academy_blazer') {
    const blazerMat = topMat;
    const tieMat = clayMat(
      config.topColor === '#7E2B3D' ? '#25395C' : '#9B2C3B',
      0.48,
    );
    const goldCrestMat = new THREE.MeshStandardMaterial({
      color: '#ECC356',
      roughness: 0.26,
      metalness: 0.58,
    });

    // Outer open-front blazer shell over crisp ivory/white shirt
    const blazerShell = new THREE.Mesh(
      new THREE.LatheGeometry(
        createTorsoProfilePoints(0.018, -0.195, 0.195),
        28,
        0.34,
        Math.PI * 2 - 0.68,
      ),
      blazerMat,
    );
    torsoGroup.add(blazerShell);

    // Crisp shirt collar & academy tie
    [-1, 1].forEach((s) => {
      const collar = new THREE.Mesh(
        new RoundedBoxGeometry(0.072, 0.04, 0.028, 2, 0.01),
        pureWhiteMat,
      );
      collar.position.set(s * 0.048, 0.182, 0.125);
      collar.rotation.z = -s * 0.34;
      collar.rotation.y = s * 0.32;

      const lapel = new THREE.Mesh(
        new RoundedBoxGeometry(0.054, 0.195, 0.024, 2, 0.008),
        topLightMat,
      );
      lapel.position.set(s * 0.068, 0.065, 0.198);
      lapel.rotation.z = s * 0.18;
      lapel.rotation.y = s * 0.32;
      torsoGroup.add(collar, lapel);
    });

    const tieKnot = new THREE.Mesh(
      new RoundedBoxGeometry(0.046, 0.044, 0.028, 2, 0.01),
      tieMat,
    );
    tieKnot.position.set(0, 0.15, 0.196);
    const tieBlade = new THREE.Mesh(
      new RoundedBoxGeometry(0.044, 0.175, 0.018, 2, 0.007),
      tieMat,
    );
    tieBlade.position.set(0, 0.048, 0.205);
    const crest = new THREE.Mesh(
      new THREE.CylinderGeometry(0.026, 0.022, 0.012, 6),
      goldCrestMat,
    );
    crest.rotation.x = Math.PI / 2;
    crest.position.set(0.105, 0.068, 0.198);
    crest.rotation.y = 0.42;
    torsoGroup.add(tieKnot, tieBlade, crest);
  } else if (config.top === 'bomber_jacket') {
    const ribDarkMat = topDarkMat;
    const zipMat = new THREE.MeshStandardMaterial({
      color: '#D8DFE8',
      roughness: 0.22,
      metalness: 0.65,
    });
    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(0.132, 0.03, 10, 26),
      ribDarkMat,
    );
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, 0.196, 0);
    const collarStripe = new THREE.Mesh(
      new THREE.TorusGeometry(0.144, 0.007, 8, 26),
      pureWhiteMat,
    );
    collarStripe.rotation.x = Math.PI / 2;
    collarStripe.position.set(0, 0.204, 0);

    const ribHem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.236, 0.238, 0.048, 26),
      ribDarkMat,
    );
    ribHem.position.set(0, -0.175, 0);
    const hemStripe = new THREE.Mesh(
      new THREE.TorusGeometry(0.238, 0.007, 8, 26),
      pureWhiteMat,
    );
    hemStripe.rotation.x = Math.PI / 2;
    hemStripe.position.set(0, -0.175, 0);

    const zip = new THREE.Mesh(
      new RoundedBoxGeometry(0.02, 0.34, 0.016, 2, 0.004),
      zipMat,
    );
    zip.position.set(0, -0.01, 0.222);
    zip.rotation.x = -0.05;
    torsoGroup.add(collar, collarStripe, ribHem, hemStripe, zip);

    [-1, 1].forEach((s) => {
      const pocket = new THREE.Mesh(
        new RoundedBoxGeometry(0.022, 0.088, 0.022, 2, 0.008),
        ribDarkMat,
      );
      pocket.position.set(s * 0.132, -0.078, 0.205);
      pocket.rotation.y = s * 0.54;
      pocket.rotation.z = s * 0.26;
      torsoGroup.add(pocket);
    });
  } else if (config.top === 'turtleneck_sweater') {
    // Cozy ribbed high turtleneck + vertical cable knit braids
    const neckTube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.106, 0.122, 0.088, 24),
      topMat,
    );
    neckTube.position.set(0, 0.215, 0);
    const neckFold = new THREE.Mesh(
      new THREE.TorusGeometry(0.108, 0.03, 12, 24),
      topLightMat,
    );
    neckFold.rotation.x = Math.PI / 2;
    neckFold.position.set(0, 0.235, 0);
    const ribHem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.238, 0.24, 0.048, 26),
      topDarkMat,
    );
    ribHem.position.set(0, -0.172, 0);
    torsoGroup.add(neckTube, neckFold, ribHem);

    [-0.082, 0, 0.082].forEach((bx) => {
      const braid = new THREE.Mesh(
        new RoundedBoxGeometry(0.024, 0.31, 0.018, 2, 0.008),
        topLightMat,
      );
      braid.position.set(bx, -0.008, 0.206 - Math.abs(bx) * 0.16);
      braid.rotation.x = -0.04;
      torsoGroup.add(braid);
    });
  } else if (config.top === 'hawaii_shirt') {
    const collarMat = clayMat(config.topColor, 0.64);
    const innerTee = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.09, 0.065, 18),
      pureWhiteMat,
    );
    innerTee.position.set(0, 0.194, 0.032);
    torsoGroup.add(innerTee);

    [-1, 1].forEach((s) => {
      const campCollar = new THREE.Mesh(
        new RoundedBoxGeometry(0.086, 0.056, 0.028, 2, 0.01),
        collarMat,
      );
      campCollar.position.set(s * 0.062, 0.166, 0.132);
      campCollar.rotation.z = -s * 0.42;
      campCollar.rotation.y = s * 0.34;
      torsoGroup.add(campCollar);
    });
    const coconutBtnMat = clayMat('#7D5030', 0.56);
    for (let i = 0; i < 4; i++) {
      const btn = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, 0.012, 10),
        coconutBtnMat,
      );
      btn.rotation.x = Math.PI / 2;
      btn.position.set(0, 0.098 - i * 0.072, 0.214 + i * 0.004);
      torsoGroup.add(btn);
    }
  }

  if (isPeppaMascot) {
    const collarMat = clayMat('#FFF8F8', 0.66);
    const badgeMat = glossyClayMat('#F8B4C8', 0.34);
    const snoutBadgeMat = glossyClayMat('#E45C88', 0.32);
    const collarRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.118, 0.018, 10, 22),
      collarMat,
    );
    collarRing.rotation.x = Math.PI / 2;
    collarRing.position.set(0, 0.188, 0.01);
    torsoGroup.add(collarRing);

    const chestBadge = new THREE.Mesh(
      new THREE.CylinderGeometry(0.056, 0.056, 0.014, 16),
      badgeMat,
    );
    chestBadge.rotation.x = Math.PI / 2;
    chestBadge.position.set(0, 0.068, 0.208);
    const badgeSnout = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, 0.016, 12),
      snoutBadgeMat,
    );
    badgeSnout.rotation.x = Math.PI / 2;
    badgeSnout.position.set(0.012, 0.072, 0.215);
    torsoGroup.add(chestBadge, badgeSnout);

    // Cute curly pink pig tail at back of dress/hips
    const pigTailMat = clayMat('#F99AC0', 0.58);
    const tailPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 18; i++) {
      const t = i / 18;
      const a = t * Math.PI * 2.2;
      tailPts.push(
        new THREE.Vector3(
          Math.sin(a) * (0.018 + t * 0.028),
          -0.145 + t * 0.07 + Math.cos(a) * 0.02,
          -0.21 - t * 0.085,
        ),
      );
    }
    const tailCurve = new THREE.CatmullRomCurve3(tailPts);
    const pigTail = new THREE.Mesh(
      new THREE.TubeGeometry(tailCurve, 22, 0.015, 8, false),
      pigTailMat,
    );
    torsoGroup.add(pigTail);
  }

  // Bottoms & Flowing Long Flaps on Torso (clean radial hierarchy so all skirts & Ao Dai flaps drape smoothly via paired geometries)
  let skirtPivot: THREE.Group | undefined;
  let aoDaiFrontPanel: THREE.Group | undefined;
  let aoDaiBackPanel: THREE.Group | undefined;
  const skirtDeformMeshes: SkirtDeformPair[] = [];

  const ensureSkirtPivot = () => {
    if (!skirtPivot) {
      skirtPivot = new THREE.Group();
      skirtPivot.position.set(0, -0.158, 0);
      torsoGroup.add(skirtPivot);
    }
    return skirtPivot;
  };

  if (isAoDaiTop) {
    const pivot = ensureSkirtPivot();
    const isMaleAoDai = config.top === 'ao_dai_nam';
    const isWhiteAoDai = config.top === 'ao_dai_white';
    const flapLen = isMaleAoDai ? 0.36 : 0.44;
    const halfSpan = isMaleAoDai ? 0.72 : 0.66;
    const flapWaistR = isMaleAoDai ? 0.218 : 0.208;
    const flapHemR = isMaleAoDai ? 0.268 : 0.278;
    const trimMat = isWhiteAoDai
      ? glossyClayMat('#EAE2D6', 0.32)
      : clayMat('#F2CA52', 0.36, 0.22);

    aoDaiFrontPanel = new THREE.Group();
    aoDaiBackPanel = new THREE.Group();
    pivot.add(aoDaiFrontPanel, aoDaiBackPanel);

    // Front Flowing Flap (Tà Trước) + Hem Trim
    const frontGeo = createAoDaiPanelGeometry(true, flapWaistR, flapHemR, flapLen, halfSpan, 0.012);
    const frontMesh = new THREE.Mesh(frontGeo, topMat);
    aoDaiFrontPanel.add(frontMesh);
    skirtDeformMeshes.push({
      mesh: frontMesh,
      standGeo: frontGeo,
      sitGeo: createSeatedSkirtDrapeGeometry(frontGeo, -0.02, 0),
      bikeGeo: createBicycleSkirtDrapeGeometry(frontGeo, -0.02, 0),
    });

    const frontTrimGeo = createAoDaiHemTrimGeometry(true, flapHemR, flapLen, halfSpan);
    const frontTrimMesh = new THREE.Mesh(frontTrimGeo, trimMat);
    aoDaiFrontPanel.add(frontTrimMesh);
    skirtDeformMeshes.push({
      mesh: frontTrimMesh,
      standGeo: frontTrimGeo,
      sitGeo: createSeatedSkirtDrapeGeometry(frontTrimGeo, -0.02, 0),
      bikeGeo: createBicycleSkirtDrapeGeometry(frontTrimGeo, -0.02, 0),
    });

    // Back Flowing Flap (Tà Sau) + Hem Trim
    const backGeo = createAoDaiPanelGeometry(false, flapWaistR, flapHemR, flapLen, halfSpan, 0.012);
    const backMesh = new THREE.Mesh(backGeo, topMat);
    aoDaiBackPanel.add(backMesh);
    skirtDeformMeshes.push({
      mesh: backMesh,
      standGeo: backGeo,
      sitGeo: createSeatedSkirtDrapeGeometry(backGeo, -0.02, 0),
      bikeGeo: createBicycleSkirtDrapeGeometry(backGeo, -0.02, 0),
    });

    const backTrimGeo = createAoDaiHemTrimGeometry(false, flapHemR, flapLen, halfSpan);
    const backTrimMesh = new THREE.Mesh(backTrimGeo, trimMat);
    aoDaiBackPanel.add(backTrimMesh);
    skirtDeformMeshes.push({
      mesh: backTrimMesh,
      standGeo: backTrimGeo,
      sitGeo: createSeatedSkirtDrapeGeometry(backTrimGeo, -0.02, 0),
      bikeGeo: createBicycleSkirtDrapeGeometry(backTrimGeo, -0.02, 0),
    });
  } else if (config.top === 'trench_coat') {
    const pivot = ensureSkirtPivot();
    const coatSkirtGeo = createPencilSkirtGeometry(0.242, 0.278, 0.305, 0.245, 28, 12);
    const offsetY = -0.128;
    const coatSkirtMesh = new THREE.Mesh(coatSkirtGeo, topMat);
    coatSkirtMesh.position.set(0, offsetY, 0);
    pivot.add(coatSkirtMesh);
    skirtDeformMeshes.push({
      mesh: coatSkirtMesh,
      standGeo: coatSkirtGeo,
      sitGeo: createSeatedSkirtDrapeGeometry(coatSkirtGeo, offsetY, 0),
      bikeGeo: createBicycleSkirtDrapeGeometry(coatSkirtGeo, offsetY, 0),
    });
  } else if (isLolitaDress) {
    const pivot = ensureSkirtPivot();
    const laceMat = clayMat('#FFF9FB', 0.66);
    const outerSkirtGeo = createPencilSkirtGeometry(0.184, 0.315, 0.358, 0.245, 32, 12);
    const offsetY = -0.125;
    const outerSkirtMesh = new THREE.Mesh(outerSkirtGeo, topMat);
    outerSkirtMesh.position.set(0, offsetY, 0);
    pivot.add(outerSkirtMesh);
    skirtDeformMeshes.push({
      mesh: outerSkirtMesh,
      standGeo: outerSkirtGeo,
      sitGeo: createSeatedSkirtDrapeGeometry(outerSkirtGeo, offsetY, 0),
      bikeGeo: createBicycleSkirtDrapeGeometry(outerSkirtGeo, offsetY, 0),
    });

    const laceHemGeo = new THREE.TorusGeometry(0.355, 0.018, 8, 32);
    const hemY = -0.245;
    const laceHem = new THREE.Mesh(laceHemGeo, laceMat);
    laceHem.rotation.x = Math.PI / 2;
    laceHem.position.set(0, hemY, 0);
    pivot.add(laceHem);
    skirtDeformMeshes.push({
      mesh: laceHem,
      standGeo: laceHemGeo,
      sitGeo: createSeatedSkirtDrapeGeometry(laceHemGeo, hemY, Math.PI / 2),
      bikeGeo: createBicycleSkirtDrapeGeometry(laceHemGeo, hemY, Math.PI / 2),
    });
  }

  if (isPinaforeDress) {
    // Integrated flared A-line pinafore skirt (uses sit/bike deformers so sitting & cycling never clip)
    const pivot = ensureSkirtPivot();

    const skirtGeo = createPencilSkirtGeometry(0.222, 0.278, 0.324, 0.245, 32, 12);
    const skirtOffsetY = -0.135;
    const skirtSitGeo = createSeatedSkirtDrapeGeometry(skirtGeo, skirtOffsetY, 0);
    const skirtBikeGeo = createBicycleSkirtDrapeGeometry(skirtGeo, skirtOffsetY, 0);
    const skirtMesh = new THREE.Mesh(skirtGeo, topMat);
    skirtMesh.position.set(0, skirtOffsetY, 0);
    pivot.add(skirtMesh);
    skirtDeformMeshes.push({
      mesh: skirtMesh,
      standGeo: skirtGeo,
      sitGeo: skirtSitGeo,
      bikeGeo: skirtBikeGeo,
    });

    const hemStandGeo = new THREE.TorusGeometry(0.322, 0.011, 8, 32);
    const hemOffsetY = -0.255;
    const hemSitGeo = createSeatedSkirtDrapeGeometry(hemStandGeo, hemOffsetY, Math.PI / 2);
    const hemBikeGeo = createBicycleSkirtDrapeGeometry(hemStandGeo, hemOffsetY, Math.PI / 2);
    const hemRing = new THREE.Mesh(hemStandGeo, topDarkMat);
    hemRing.rotation.x = Math.PI / 2;
    hemRing.position.set(0, hemOffsetY, 0);
    pivot.add(hemRing);
    skirtDeformMeshes.push({
      mesh: hemRing,
      standGeo: hemStandGeo,
      sitGeo: hemSitGeo,
      bikeGeo: hemBikeGeo,
    });
  } else if (
    config.bottom === 'pleated_skirt' ||
    config.bottom === 'midi_skirt' ||
    config.bottom === 'plaid_skirt'
  ) {
    const isMidi = config.bottom === 'midi_skirt';
    const waistband = new THREE.Mesh(
      new THREE.CylinderGeometry(0.214, 0.22, 0.048, 26),
      bottomDarkMat,
    );
    waistband.position.set(0, -0.158, 0);
    torsoGroup.add(waistband);

    const pivot = ensureSkirtPivot();

    const skirtGeo = createPleatedSkirtGeometry(
      0.216,
      isMidi ? 0.325 : 0.285,
      isMidi ? 0.33 : 0.23,
      isMidi ? 12 : 16,
      isMidi ? 0.011 : 0.016,
    );
    const skirtOffsetY = isMidi ? -0.182 : -0.13;
    const skirtSitGeo = createSeatedSkirtDrapeGeometry(skirtGeo, skirtOffsetY, 0);
    const skirtBikeGeo = createBicycleSkirtDrapeGeometry(skirtGeo, skirtOffsetY, 0);
    const skirtMesh = new THREE.Mesh(skirtGeo, bottomMat);
    skirtMesh.position.set(0, skirtOffsetY, 0);
    pivot.add(skirtMesh);
    skirtDeformMeshes.push({
      mesh: skirtMesh,
      standGeo: skirtGeo,
      sitGeo: skirtSitGeo,
      bikeGeo: skirtBikeGeo,
    });

    const hemStandGeo = new THREE.TorusGeometry(isMidi ? 0.322 : 0.282, 0.012, 8, 32);
    const hemOffsetY = isMidi ? -0.332 : -0.23;
    const hemSitGeo = createSeatedSkirtDrapeGeometry(hemStandGeo, hemOffsetY, Math.PI / 2);
    const hemBikeGeo = createBicycleSkirtDrapeGeometry(hemStandGeo, hemOffsetY, Math.PI / 2);
    const hemRing = new THREE.Mesh(hemStandGeo, bottomLightMat);
    hemRing.rotation.x = Math.PI / 2;
    hemRing.position.set(0, hemOffsetY, 0);
    pivot.add(hemRing);
    skirtDeformMeshes.push({
      mesh: hemRing,
      standGeo: hemStandGeo,
      sitGeo: hemSitGeo,
      bikeGeo: hemBikeGeo,
    });
  } else if (config.bottom === 'tiered_lace_skirt') {
    const waistband = new THREE.Mesh(
      new THREE.CylinderGeometry(0.214, 0.22, 0.048, 28),
      bottomDarkMat,
    );
    waistband.position.set(0, -0.158, 0);
    torsoGroup.add(waistband);

    const pivot = ensureSkirtPivot();
    const whiteLaceMat = clayMat('#FFFFFF', 0.62);
    const tiers = [
      {topR: 0.216, hipR: 0.254, hemR: 0.278, h: 0.115, offY: -0.068, trimY: -0.125},
      {topR: 0.246, hipR: 0.286, hemR: 0.312, h: 0.12, offY: -0.145, trimY: -0.205},
      {topR: 0.278, hipR: 0.322, hemR: 0.352, h: 0.125, offY: -0.225, trimY: -0.286},
    ];
    tiers.forEach((tier) => {
      const tGeo = createPencilSkirtGeometry(tier.topR, tier.hipR, tier.hemR, tier.h, 30, 8);
      const tMesh = new THREE.Mesh(tGeo, bottomMat);
      tMesh.position.set(0, tier.offY, 0);
      pivot.add(tMesh);
      skirtDeformMeshes.push({
        mesh: tMesh,
        standGeo: tGeo,
        sitGeo: createSeatedSkirtDrapeGeometry(tGeo, tier.offY, 0),
        bikeGeo: createBicycleSkirtDrapeGeometry(tGeo, tier.offY, 0),
      });

      const trimGeo = new THREE.TorusGeometry(tier.hemR, 0.011, 8, 30);
      const trimMesh = new THREE.Mesh(trimGeo, whiteLaceMat);
      trimMesh.rotation.x = Math.PI / 2;
      trimMesh.position.set(0, tier.trimY, 0);
      pivot.add(trimMesh);
      skirtDeformMeshes.push({
        mesh: trimMesh,
        standGeo: trimGeo,
        sitGeo: createSeatedSkirtDrapeGeometry(trimGeo, tier.trimY, Math.PI / 2),
        bikeGeo: createBicycleSkirtDrapeGeometry(trimGeo, tier.trimY, Math.PI / 2),
      });
    });
  } else if (config.bottom === 'a_line_skirt') {
    const waistband = new THREE.Mesh(
      new THREE.CylinderGeometry(0.214, 0.22, 0.048, 28),
      bottomDarkMat,
    );
    waistband.position.set(0, -0.158, 0);
    torsoGroup.add(waistband);

    const pivot = ensureSkirtPivot();

    const skirtGeo = createPencilSkirtGeometry(0.216, 0.258, 0.296, 0.225, 32, 12);
    const skirtOffsetY = -0.128;
    const skirtSitGeo = createSeatedSkirtDrapeGeometry(skirtGeo, skirtOffsetY, 0);
    const skirtBikeGeo = createBicycleSkirtDrapeGeometry(skirtGeo, skirtOffsetY, 0);
    const skirtMesh = new THREE.Mesh(skirtGeo, bottomMat);
    skirtMesh.position.set(0, skirtOffsetY, 0);
    pivot.add(skirtMesh);
    skirtDeformMeshes.push({
      mesh: skirtMesh,
      standGeo: skirtGeo,
      sitGeo: skirtSitGeo,
      bikeGeo: skirtBikeGeo,
    });

    const hemStandGeo = new THREE.TorusGeometry(0.294, 0.011, 8, 32);
    const hemOffsetY = -0.238;
    const hemSitGeo = createSeatedSkirtDrapeGeometry(hemStandGeo, hemOffsetY, Math.PI / 2);
    const hemBikeGeo = createBicycleSkirtDrapeGeometry(hemStandGeo, hemOffsetY, Math.PI / 2);
    const hemRing = new THREE.Mesh(hemStandGeo, bottomLightMat);
    hemRing.rotation.x = Math.PI / 2;
    hemRing.position.set(0, hemOffsetY, 0);
    pivot.add(hemRing);
    skirtDeformMeshes.push({
      mesh: hemRing,
      standGeo: hemStandGeo,
      sitGeo: hemSitGeo,
      bikeGeo: hemBikeGeo,
    });
  } else if (config.bottom === 'office_skirt') {
    // High-waisted chic office pencil skirt hugging waist smoothly with slim belt & gold buckle
    const skirtWaistR = isOfficeFemale ? 0.168 : 0.215;
    const waistbandY = isOfficeFemale ? -0.118 : -0.156;
    const waistband = new THREE.Mesh(
      new THREE.CylinderGeometry(skirtWaistR, skirtWaistR + 0.012, 0.048, 28),
      bottomDarkMat,
    );
    waistband.position.set(0, waistbandY, 0);
    torsoGroup.add(waistband);

    const goldBuckle = new THREE.Mesh(
      new RoundedBoxGeometry(0.046, 0.028, 0.014, 2, 0.005),
      new THREE.MeshStandardMaterial({color: '#E8C36A', roughness: 0.2, metalness: 0.65}),
    );
    goldBuckle.position.set(0, waistbandY, skirtWaistR + 0.008);
    torsoGroup.add(goldBuckle);

    const pivot = ensureSkirtPivot();

    const skirtH = isOfficeFemale ? 0.295 : 0.255;
    const skirtGeo = createPencilSkirtGeometry(
      skirtWaistR + 0.008,
      isOfficeFemale ? 0.218 : 0.234,
      isOfficeFemale ? 0.204 : 0.218,
      skirtH,
    );
    const skirtOffsetY = -skirtH * 0.5 - 0.012;
    const skirtSitGeo = createSeatedSkirtDrapeGeometry(skirtGeo, skirtOffsetY, 0);
    const skirtBikeGeo = createBicycleSkirtDrapeGeometry(skirtGeo, skirtOffsetY, 0);
    const skirtMesh = new THREE.Mesh(skirtGeo, bottomMat);
    skirtMesh.position.set(0, skirtOffsetY, 0);
    pivot.add(skirtMesh);
    skirtDeformMeshes.push({
      mesh: skirtMesh,
      standGeo: skirtGeo,
      sitGeo: skirtSitGeo,
      bikeGeo: skirtBikeGeo,
    });

    const hemStandGeo = new THREE.TorusGeometry(isOfficeFemale ? 0.204 : 0.218, 0.01, 8, 32);
    const hemOffsetY = -skirtH - 0.008;
    const hemSitGeo = createSeatedSkirtDrapeGeometry(hemStandGeo, hemOffsetY, Math.PI / 2);
    const hemBikeGeo = createBicycleSkirtDrapeGeometry(hemStandGeo, hemOffsetY, Math.PI / 2);
    const hemRing = new THREE.Mesh(hemStandGeo, bottomDarkMat);
    hemRing.rotation.x = Math.PI / 2;
    hemRing.position.set(0, hemOffsetY, 0);
    pivot.add(hemRing);
    skirtDeformMeshes.push({
      mesh: hemRing,
      standGeo: hemStandGeo,
      sitGeo: hemSitGeo,
      bikeGeo: hemBikeGeo,
    });
  } else if (config.bottom === 'office_trousers') {
    const waistR = isOfficeFemale ? 0.194 : 0.22;
    const beltMat = clayMat('#241B17', 0.42, 0.1);
    const waist = new THREE.Mesh(
      new THREE.CylinderGeometry(waistR, waistR + 0.006, 0.072, 26),
      bottomMat,
    );
    waist.position.set(0, -0.204, 0);
    const belt = new THREE.Mesh(
      new THREE.CylinderGeometry(waistR + 0.008, waistR + 0.008, 0.032, 26),
      beltMat,
    );
    belt.position.set(0, -0.186, 0);
    const buckle = new THREE.Mesh(
      new RoundedBoxGeometry(0.048, 0.032, 0.016, 2, 0.005),
      new THREE.MeshStandardMaterial({color: '#D6DCE4', roughness: 0.2, metalness: 0.65}),
    );
    buckle.position.set(0, -0.186, waistR + 0.01);
    torsoGroup.add(waist, belt, buckle);
  } else if (config.bottom === 'sport_shorts' || config.bottom === 'cloud_shorts') {
    const waist = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.224, 0.078, 26),
      clayMat('#FFFFFF', 0.56),
    );
    waist.position.set(0, -0.206, 0);
    torsoGroup.add(waist);

    [-1, 1].forEach((s) => {
      const cord = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.008, 0.056, 5, 8),
        clayMat('#FFFFFF', 0.52),
      );
      cord.position.set(s * 0.022, -0.214, 0.224);
      cord.rotation.z = s * 0.24;
      torsoGroup.add(cord);
    });
  } else if (config.bottom === 'pajama_pants') {
    const waist = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.224, 0.078, 26),
      bottomMat,
    );
    waist.position.set(0, -0.206, 0);
    torsoGroup.add(waist);
  } else if (!isAoDaiTop && config.top !== 'denim_overalls' && config.top !== 'trench_coat' && !isLolitaDress) {
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

  // ========== SCULPTED 3D BACKPACKS, RATTAN BASKET & WING SYSTEM (Zero Torso/Hair Clipping!) ==========
  let wingsGroup: THREE.Group | undefined;
  let leftWing: THREE.Group | undefined;
  let rightWing: THREE.Group | undefined;
  const backpack = config.backpack && config.backpack !== 'none' ? config.backpack : null;
  if (backpack && !isPeppaMascot) {
    const bpCol = config.backpackColor || '#5CC4DF';
    const bpGroup = new THREE.Group();
    const hasLongBackHair =
      config.hairBack === 'long_wave' ||
      config.hairBack === 'bob_cut' ||
      config.hairBack === 'ponytail';
    const isWings = backpack === 'angel_wings' || backpack === 'crystal_wings';
    const torsoBackSurfaceZ =
      isHoodie || config.top === 'puffer_jacket'
        ? -0.258
        : config.top === 'zip_parka' ||
            config.top === 'varsity_jacket' ||
            config.top === 'trench_coat' ||
            config.top === 'bomber_jacket' ||
            config.top === 'academy_blazer'
          ? -0.242
          : -0.222;
    // Push backpacks cleanly OUTSIDE torso/hood & clear of long back hair
    const backPadZ =
      backpack === 'carrot_basket'
        ? hasLongBackHair
          ? -0.345
          : -0.305
        : isWings
          ? torsoBackSurfaceZ + 0.012
          : torsoBackSurfaceZ - (hasLongBackHair ? 0.118 : 0.095);
    const bpY = backpack === 'carrot_basket' ? -0.072 : isWings ? 0.052 : 0.004;
    bpGroup.position.set(0, bpY, backPadZ);

    // Shoulder straps (routed over actual torso surface cleanly regardless of backpack Z clearance)
    if (!isWings) {
      const strapMat = clayMat(
        backpack === 'carrot_basket'
          ? '#D49A5A'
          : backpack === 'honey_bear'
            ? '#5C341F'
            : backpack === 'bee_plush'
              ? '#3E281D'
              : backpack === 'strawberry_bear'
                ? '#D14F6B'
                : backpack === 'astro_pack'
                  ? '#94A3B8'
                  : backpack === 'lamb_plush' || backpack === 'bunny_plush'
                    ? bpCol
                    : shadeHex(bpCol, -0.1).getHex(),
        0.7,
      );
      [-1, 1].forEach((side) => {
        const strapArc = new THREE.Mesh(
          new THREE.TorusGeometry(0.165, 0.019, 8, 20, Math.PI * 1.15),
          strapMat,
        );
        strapArc.rotation.y = Math.PI / 2;
        strapArc.rotation.z = -0.08;
        strapArc.position.set(side * 0.132, 0.048 - bpY, -backPadZ - 0.018);
        bpGroup.add(strapArc);
      });
    }

    const packContent = new THREE.Group();
    if (!isWings && backpack !== 'carrot_basket') {
      // Generous 1.24x plush & daypack proportions so backpacks look bold, cute, and prominent
      packContent.scale.setScalar(1.24);
    }

    if (backpack === 'fish_plush') {
      const fishMat = clayMat(bpCol, 0.62);
      const bellyMat = clayMat('#92E0F2', 0.68);
      const lipMat = glossyClayMat('#F79AB6', 0.38);
      const scleraMat = glossyClayMat('#FFFFFF', 0.16);
      const pupilMat = glossyClayMat('#1B1D24', 0.12);

      const body = new THREE.Mesh(
        new RoundedBoxGeometry(0.24, 0.28, 0.14, 4, 0.068),
        fishMat,
      );
      const belly = new THREE.Mesh(
        new THREE.SphereGeometry(0.092, 14, 12),
        bellyMat,
      );
      belly.scale.set(1.02, 0.9, 0.45);
      belly.position.set(0, -0.055, -0.052);
      const lips = new THREE.Mesh(new THREE.SphereGeometry(0.046, 12, 10), lipMat);
      lips.scale.set(1.5, 0.56, 0.72);
      lips.position.set(0, 0.014, -0.075);
      const dorsal = new THREE.Mesh(
        new RoundedBoxGeometry(0.032, 0.055, 0.068, 2, 0.014),
        clayMat('#3D9EC0', 0.58),
      );
      dorsal.position.set(0, 0.155, -0.008);
      packContent.add(body, belly, lips, dorsal);

      [-1, 1].forEach((side) => {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.028, 12, 10), scleraMat);
        eye.position.set(side * 0.042, 0.072, -0.068);
        const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 8), pupilMat);
        pupil.position.set(side * 0.042, 0.072, -0.09);
        const fin = new THREE.Mesh(
          new THREE.SphereGeometry(0.036, 10, 8),
          clayMat('#3D9EC0', 0.62),
        );
        fin.scale.set(0.5, 1.0, 0.85);
        fin.position.set(side * 0.128, -0.015, -0.01);
        fin.rotation.z = side * 0.45;
        const foot = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.024, 0.045, 6, 8),
          clayMat('#3D9EC0', 0.62),
        );
        foot.position.set(side * 0.062, -0.155, -0.018);
        foot.rotation.x = 0.25;
        packContent.add(eye, pupil, fin, foot);
      });
    } else if (backpack === 'lamb_plush') {
      const hoodMat = clayMat(bpCol, 0.68);
      const creamMat = clayMat('#FFF8F0', 0.78);
      const pupilMat = glossyClayMat('#221E24', 0.15);
      const cheekMat = clayMat('#F79AB4', 0.65);

      const torsoPlush = new THREE.Mesh(
        new RoundedBoxGeometry(0.18, 0.15, 0.11, 4, 0.05),
        creamMat,
      );
      torsoPlush.position.set(0, -0.072, -0.01);
      const hood = new THREE.Mesh(new THREE.SphereGeometry(0.118, 16, 14), hoodMat);
      hood.scale.set(1.08, 0.96, 0.82);
      hood.position.set(0, 0.062, -0.015);
      const face = new THREE.Mesh(new THREE.SphereGeometry(0.088, 14, 12), creamMat);
      face.scale.set(1.06, 0.94, 0.56);
      face.position.set(0, 0.056, -0.065);
      const flowerAccent = new THREE.Mesh(
        new THREE.SphereGeometry(0.024, 10, 8),
        clayMat('#FFE77A', 0.55),
      );
      flowerAccent.position.set(0.078, 0.132, -0.065);
      packContent.add(torsoPlush, hood, face, flowerAccent);

      [-1, 1].forEach((side) => {
        const ear = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.032, 0.075, 6, 10),
          hoodMat,
        );
        ear.position.set(side * 0.125, 0.055, -0.028);
        ear.rotation.z = side * 0.52;
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.013, 8, 8), pupilMat);
        eye.position.set(side * 0.034, 0.066, -0.112);
        const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), cheekMat);
        cheek.scale.set(1.1, 0.72, 0.4);
        cheek.position.set(side * 0.056, 0.042, -0.105);
        const paw = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 8), creamMat);
        paw.position.set(side * 0.056, -0.145, -0.035);
        packContent.add(ear, eye, cheek, paw);
      });
    } else if (backpack === 'chick_plush') {
      const yellowMat = clayMat(bpCol, 0.66);
      const orangeMat = clayMat('#F28B30', 0.54);
      const pupilMat = glossyClayMat('#221E24', 0.14);

      const pack = new THREE.Mesh(
        new RoundedBoxGeometry(0.24, 0.27, 0.12, 4, 0.05),
        yellowMat,
      );
      const beak = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 8), orangeMat);
      beak.scale.set(1.2, 0.65, 0.9);
      beak.position.set(0, 0.036, -0.068);
      packContent.add(pack, beak);

      [-1, 1].forEach((side) => {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.013, 8, 8), pupilMat);
        eye.position.set(side * 0.044, 0.066, -0.06);
        const wing = new THREE.Mesh(
          new RoundedBoxGeometry(0.034, 0.078, 0.055, 2, 0.015),
          yellowMat,
        );
        wing.position.set(side * 0.128, -0.01, -0.008);
        wing.rotation.z = side * 0.25;
        const foot = new THREE.Mesh(
          new RoundedBoxGeometry(0.036, 0.045, 0.036, 2, 0.012),
          orangeMat,
        );
        foot.position.set(side * 0.056, -0.148, -0.02);
        packContent.add(eye, wing, foot);
      });
    } else if (backpack === 'bee_plush') {
      const beeYellow = clayMat(bpCol, 0.62);
      const beeBrown = clayMat('#3E281D', 0.72);
      const wingMat = glossyClayMat('#FFFFFF', 0.22);
      const pupilMat = glossyClayMat('#1B1D24', 0.14);

      const body = new THREE.Mesh(new THREE.SphereGeometry(0.135, 18, 14), beeYellow);
      body.scale.set(1.05, 0.96, 0.78);
      const stripe = new THREE.Mesh(
        new THREE.TorusGeometry(0.118, 0.024, 8, 22),
        beeBrown,
      );
      stripe.scale.set(1.06, 0.78, 1.0);
      stripe.rotation.x = Math.PI / 2;
      stripe.position.set(0, -0.024, 0);
      packContent.add(body, stripe);

      [-1, 1].forEach((side) => {
        const wing = new THREE.Mesh(new THREE.SphereGeometry(0.062, 12, 10), wingMat);
        wing.scale.set(1.15, 0.68, 0.28);
        wing.position.set(side * 0.095, 0.115, -0.035);
        wing.rotation.z = -side * 0.45;
        const ant = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.01, 0.045, 5, 8),
          beeBrown,
        );
        ant.position.set(side * 0.045, 0.14, -0.05);
        ant.rotation.z = -side * 0.3;
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 8), pupilMat);
        eye.position.set(side * 0.044, 0.045, -0.102);
        packContent.add(wing, ant, eye);
      });
    } else if (backpack === 'honey_bear') {
      const chocoMat = clayMat('#5C341F', 0.72);
      const honeyMat = glossyClayMat(bpCol, 0.26);
      const body = new THREE.Mesh(
        new RoundedBoxGeometry(0.23, 0.27, 0.125, 4, 0.05),
        chocoMat,
      );
      const honeyCap = new THREE.Mesh(
        new RoundedBoxGeometry(0.236, 0.14, 0.132, 4, 0.048),
        honeyMat,
      );
      honeyCap.position.set(0, 0.068, 0);
      packContent.add(body, honeyCap);
      [-1, 1].forEach((side) => {
        const ear = new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 10), honeyMat);
        ear.scale.set(1, 1, 0.6);
        ear.position.set(side * 0.085, 0.148, -0.01);
        const drip = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.02, 0.035, 5, 8),
          honeyMat,
        );
        drip.position.set(side * 0.056, -0.012, -0.062);
        packContent.add(ear, drip);
      });
    } else if (backpack === 'bunny_plush') {
      const pinkMat = clayMat(bpCol, 0.66);
      const creamMat = clayMat('#FFF8F2', 0.76);
      const pupilMat = glossyClayMat('#221E24', 0.14);
      const body = new THREE.Mesh(
        new RoundedBoxGeometry(0.22, 0.24, 0.125, 4, 0.052),
        pinkMat,
      );
      const belly = new THREE.Mesh(new THREE.SphereGeometry(0.072, 12, 10), creamMat);
      belly.scale.set(1, 1.05, 0.4);
      belly.position.set(0, -0.035, -0.052);
      const nose = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 8), clayMat('#F26C95', 0.5));
      nose.position.set(0, 0.042, -0.066);
      const tail = new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 8), creamMat);
      tail.position.set(0, -0.09, -0.068);
      packContent.add(body, belly, nose, tail);
      [-1, 1].forEach((side) => {
        const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.026, 0.135, 6, 10), pinkMat);
        ear.scale.set(1, 1, 0.55);
        ear.position.set(side * 0.064, 0.165, -0.012);
        ear.rotation.z = -side * 0.22;
        const innerEar = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.014, 0.092, 5, 8),
          creamMat,
        );
        innerEar.scale.set(1, 1, 0.45);
        innerEar.position.set(side * 0.064, 0.165, -0.024);
        innerEar.rotation.z = -side * 0.22;
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.013, 8, 8), pupilMat);
        eye.position.set(side * 0.042, 0.065, -0.062);
        packContent.add(ear, innerEar, eye);
      });
    } else if (backpack === 'strawberry_bear') {
      const berryMat = clayMat(bpCol, 0.65);
      const creamMat = clayMat('#FFF5EC', 0.72);
      const leafMat = clayMat('#5AA85B', 0.68);
      const pupilMat = glossyClayMat('#221E24', 0.14);
      const body = new THREE.Mesh(
        new RoundedBoxGeometry(0.24, 0.26, 0.13, 4, 0.058),
        berryMat,
      );
      const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 10), creamMat);
      muzzle.scale.set(1.15, 0.85, 0.55);
      muzzle.position.set(0, 0.025, -0.062);
      const nose = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 8), pupilMat);
      nose.position.set(0, 0.036, -0.088);
      const leafTop = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.018, 0.024, 6), leafMat);
      leafTop.position.set(0, 0.138, -0.012);
      packContent.add(body, muzzle, nose, leafTop);
      [-1, 1].forEach((side) => {
        const ear = new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 10), berryMat);
        ear.scale.set(1, 1, 0.6);
        ear.position.set(side * 0.092, 0.128, -0.014);
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.013, 8, 8), pupilMat);
        eye.position.set(side * 0.046, 0.064, -0.066);
        packContent.add(ear, eye);
      });
    } else if (backpack === 'astro_pack') {
      const shellMat = glossyClayMat(bpCol, 0.28);
      const accentMat = clayMat('#E65B48', 0.48);
      const visorMat = glossyClayMat('#38BDF8', 0.18);
      const body = new THREE.Mesh(
        new RoundedBoxGeometry(0.24, 0.27, 0.125, 4, 0.032),
        shellMat,
      );
      const visorWindow = new THREE.Mesh(
        new RoundedBoxGeometry(0.145, 0.095, 0.024, 2, 0.01),
        visorMat,
      );
      visorWindow.position.set(0, 0.045, -0.06);
      const stripe = new THREE.Mesh(
        new RoundedBoxGeometry(0.244, 0.028, 0.13, 2, 0.008),
        accentMat,
      );
      stripe.position.set(0, -0.055, 0);
      packContent.add(body, visorWindow, stripe);
      [-1, 1].forEach((side) => {
        const thruster = new THREE.Mesh(
          new THREE.CylinderGeometry(0.032, 0.044, 0.095, 12),
          accentMat,
        );
        thruster.position.set(side * 0.075, -0.145, -0.015);
        const flame = new THREE.Mesh(
          new THREE.ConeGeometry(0.028, 0.055, 10),
          new THREE.MeshStandardMaterial({
            color: '#FFB703',
            emissive: '#FF7B00',
            emissiveIntensity: 0.6,
            roughness: 0.35,
          }),
        );
        flame.rotation.x = Math.PI;
        flame.position.set(side * 0.075, -0.215, -0.015);
        packContent.add(thruster, flame);
      });
    } else if (backpack === 'carrot_basket') {
      // Positioned cleanly lower and angled slightly backward so long back hair NEVER swallows it
      const rattanMat = clayMat(bpCol, 0.8);
      const rimMat = clayMat('#B97C3E', 0.74);
      const weaveBandMat = clayMat('#9E632B', 0.78);
      const carrotMat = clayMat('#F46B25', 0.56);
      const leafMat = clayMat('#4FA84B', 0.68);

      packContent.scale.setScalar(1.18);
      packContent.rotation.x = 0.16;

      const basket = new THREE.Mesh(
        new THREE.CylinderGeometry(0.135, 0.098, 0.255, 18),
        rattanMat,
      );
      basket.scale.set(1.08, 1, 0.78);
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(0.135, 0.02, 8, 20),
        rimMat,
      );
      rim.rotation.x = Math.PI / 2;
      rim.scale.set(1.08, 0.78, 1);
      rim.position.y = 0.125;
      packContent.add(basket, rim);

      [-0.04, 0.04].forEach((wy) => {
        const band = new THREE.Mesh(
          new THREE.TorusGeometry(wy > 0 ? 0.122 : 0.108, 0.009, 6, 20),
          weaveBandMat,
        );
        band.rotation.x = Math.PI / 2;
        band.scale.set(1.08, 0.78, 1);
        band.position.y = wy;
        packContent.add(band);
      });

      [-0.052, 0, 0.052].forEach((cx, idx) => {
        const carrot = new THREE.Mesh(
          new THREE.ConeGeometry(0.036, 0.13, 10),
          carrotMat,
        );
        carrot.rotation.x = Math.PI;
        carrot.rotation.z = (idx - 1) * 0.18;
        carrot.position.set(cx, 0.135, -0.01);
        const leaf1 = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), leafMat);
        leaf1.scale.set(0.85, 1.45, 0.7);
        leaf1.position.set(cx, 0.215, -0.01);
        const leaf2 = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 8), leafMat);
        leaf2.scale.set(0.75, 1.25, 0.65);
        leaf2.position.set(cx + (idx - 1) * 0.016, 0.205, -0.022);
        leaf2.rotation.z = -(idx - 1) * 0.28;
        packContent.add(carrot, leaf1, leaf2);
      });
    } else if (backpack === 'angel_wings') {
      // Sculpted multi-tiered pearlescent angel wings with beveled ExtrudeGeometry feathers & golden shoulder clasp
      const primaryWingMat = new THREE.MeshStandardMaterial({
        color: bpCol,
        emissive: '#FFF4E6',
        emissiveIntensity: 0.16,
        roughness: 0.36,
        metalness: 0.06,
      });
      const covertWingMat = new THREE.MeshStandardMaterial({
        color: '#FFEBF2',
        emissive: '#FFF5F8',
        emissiveIntensity: 0.14,
        roughness: 0.38,
        metalness: 0.05,
      });
      const goldClaspMat = new THREE.MeshStandardMaterial({
        color: '#F2C964',
        roughness: 0.24,
        metalness: 0.65,
      });

      wingsGroup = new THREE.Group();
      const claspHub = new THREE.Mesh(new THREE.SphereGeometry(0.044, 14, 12), goldClaspMat);
      claspHub.scale.set(1.25, 0.95, 0.55);
      wingsGroup.add(claspHub);

      const primarySpecs = [
        {len: 0.44, w: 0.058, rotZ: -0.92, y: 0.095, x: 0.055, curve: 0.055},
        {len: 0.41, w: 0.056, rotZ: -1.14, y: 0.072, x: 0.062, curve: 0.048},
        {len: 0.37, w: 0.052, rotZ: -1.38, y: 0.045, x: 0.064, curve: 0.04},
        {len: 0.33, w: 0.048, rotZ: -1.62, y: 0.018, x: 0.062, curve: 0.032},
        {len: 0.28, w: 0.044, rotZ: -1.86, y: -0.008, x: 0.056, curve: 0.025},
        {len: 0.24, w: 0.04, rotZ: -2.08, y: -0.03, x: 0.048, curve: 0.02},
        {len: 0.19, w: 0.036, rotZ: -2.3, y: -0.048, x: 0.04, curve: 0.015},
      ];
      const covertSpecs = [
        {len: 0.25, w: 0.046, rotZ: -0.98, y: 0.088, x: 0.052},
        {len: 0.22, w: 0.044, rotZ: -1.24, y: 0.058, x: 0.058},
        {len: 0.19, w: 0.04, rotZ: -1.52, y: 0.028, x: 0.056},
        {len: 0.16, w: 0.038, rotZ: -1.8, y: 0.0, x: 0.052},
      ];

      const buildWingSide = (side: -1 | 1) => {
        const wGrp = new THREE.Group();
        wGrp.position.set(side * 0.046, 0.02, -0.01);
        wGrp.rotation.y = side * 0.22;

        primarySpecs.forEach((f, idx) => {
          const geo = new THREE.ExtrudeGeometry(
            createFeatherShape(f.len, f.w, side * f.curve),
            {
              depth: 0.014,
              bevelEnabled: true,
              bevelThickness: 0.005,
              bevelSize: 0.004,
              bevelSegments: 2,
            },
          );
          const mesh = new THREE.Mesh(geo, idx % 2 === 0 ? primaryWingMat : covertWingMat);
          mesh.position.set(side * f.x, f.y, -0.012 - idx * 0.002);
          mesh.rotation.z = side * f.rotZ;
          wGrp.add(mesh);
        });

        covertSpecs.forEach((c, idx) => {
          const geo = new THREE.ExtrudeGeometry(
            createFeatherShape(c.len, c.w, side * 0.02),
            {
              depth: 0.015,
              bevelEnabled: true,
              bevelThickness: 0.005,
              bevelSize: 0.004,
              bevelSegments: 2,
            },
          );
          const mesh = new THREE.Mesh(geo, primaryWingMat);
          mesh.position.set(side * c.x, c.y, -0.028 - idx * 0.0015);
          mesh.rotation.z = side * c.rotZ;
          wGrp.add(mesh);
        });

        const shoulderBar = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.024, 0.12, 6, 10),
          goldClaspMat,
        );
        shoulderBar.position.set(side * 0.095, 0.088, -0.012);
        shoulderBar.rotation.z = -side * 1.1;
        wGrp.add(shoulderBar);
        return wGrp;
      };

      leftWing = buildWingSide(-1);
      rightWing = buildWingSide(1);
      wingsGroup.add(leftWing, rightWing);
      packContent.add(wingsGroup);
    } else if (backpack === 'crystal_wings') {
      const wingGlassMat = new THREE.MeshStandardMaterial({
        color: bpCol,
        emissive: bpCol,
        emissiveIntensity: 0.35,
        roughness: 0.16,
        metalness: 0.24,
        transparent: true,
        opacity: 0.84,
      });
      const silverRimMat = new THREE.MeshStandardMaterial({
        color: '#EEF6FF',
        roughness: 0.18,
        metalness: 0.65,
      });
      wingsGroup = new THREE.Group();
      const gemCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.044, 0), silverRimMat);
      gemCore.scale.set(0.9, 1.25, 0.55);
      wingsGroup.add(gemCore);

      const buildCrystalSide = (side: -1 | 1) => {
        const wGrp = new THREE.Group();
        wGrp.position.set(side * 0.04, 0.015, -0.01);
        wGrp.rotation.y = side * 0.24;

        const upperWingGeo = new THREE.ExtrudeGeometry(
          createFeatherShape(0.42, 0.145, side * 0.06),
          {depth: 0.01, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2},
        );
        const upperWing = new THREE.Mesh(upperWingGeo, wingGlassMat);
        upperWing.position.set(side * 0.03, 0.04, -0.015);
        upperWing.rotation.z = -side * 1.05;

        const lowerWingGeo = new THREE.ExtrudeGeometry(
          createFeatherShape(0.28, 0.105, side * 0.035),
          {depth: 0.01, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2},
        );
        const lowerWing = new THREE.Mesh(lowerWingGeo, wingGlassMat);
        lowerWing.position.set(side * 0.032, -0.015, -0.018);
        lowerWing.rotation.z = -side * 2.08;

        const frameRib = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.01, 0.24, 5, 8),
          silverRimMat,
        );
        frameRib.position.set(side * 0.135, 0.11, -0.01);
        frameRib.rotation.z = -side * 1.05;
        wGrp.add(upperWing, lowerWing, frameRib);
        return wGrp;
      };

      leftWing = buildCrystalSide(-1);
      rightWing = buildCrystalSide(1);
      wingsGroup.add(leftWing, rightWing);
      packContent.add(wingsGroup);
    }

    bpGroup.add(packContent);
    torsoGroup.add(bpGroup);
  }

  // ========== SEAMLESS ARTICULATED ARMS + REAL HANDHELD GRIP ==========
  const isShortSleeve =
    config.top === 'sailor_blouse' ||
    config.top === 'raglan_clover' ||
    config.top === 'ribbon_blouse' ||
    config.top === 'pinafore_dress' ||
    config.top === 'safari_shirt' ||
    config.top === 'sport_raglan' ||
    config.top === 'casual_shirt' ||
    config.top === 'hawaii_shirt' ||
    isLolitaDress;
  const isSleeveless = config.top === 'sundress';
  const carryingPet = options?.carryingPet ?? null;
  const equippedTool = options?.equippedTool ?? null;
  const equippedFood = !equippedTool ? (options?.equippedFood ?? null) : null;
  const handheld =
    !equippedTool && !equippedFood && config.handheld && config.handheld !== 'none'
      ? config.handheld
      : null;
  const holdPose: HoldPose = equippedTool
    ? equippedTool === 'wooden_net'
      ? 'carry_net'
      : 'carry_front'
    : equippedFood
      ? 'carry_front'
      : !handheld
        ? 'none'
        : handheld === 'tote_bag'
          ? 'carry_bag'
          : handheld === 'mini_umbrella'
            ? 'carry_umbrella'
            : 'carry_front';

  const makeArm = (side: -1 | 1) => {
    // Relaxed natural A-pose seated flush on shoulder corner with breathing room beside waist/hips
    const shoulderPivot = new THREE.Group();
    const baseArmZ = isOuterwear ? 0.4 : HAND_POSES.none.armZ;
    shoulderPivot.position.set(
      side * (isOuterwear ? 0.214 : isFittedBody ? 0.184 : 0.198),
      isFittedBody ? 0.885 : 0.89,
      0,
    );
    shoulderPivot.rotation.z = side * baseArmZ;

    const shortSleeveMat =
      config.top === 'raglan_clover' ||
      config.top === 'sport_raglan' ||
      config.top === 'safari_shirt' ||
      config.top === 'hawaii_shirt' ||
      isLolitaDress
        ? topMat
        : config.top === 'sailor_blouse'
          ? topTrimMat
          : pureWhiteMat;
    const shortSleeveCuffMat =
      config.top === 'sailor_blouse'
        ? topMat
        : config.top === 'raglan_clover' || config.top === 'sport_raglan'
          ? topDarkMat
          : config.top === 'safari_shirt' || config.top === 'hawaii_shirt'
            ? topLightMat
            : isLolitaDress
              ? clayMat('#FFF9FB', 0.62)
              : clayMat('#E6ECF2', 0.6);

    const longSleeveMat = isPeppaMascot
      ? peppaPinkMat
      : config.top === 'varsity_jacket'
        ? topTrimMat
        : config.top === 'denim_overalls'
          ? pureWhiteMat
          : topMat;
    const upperMat = isPeppaMascot
      ? peppaPinkMat
      : isSleeveless
        ? skinMat
        : isShortSleeve
          ? shortSleeveMat
          : longSleeveMat;
    const upperR = isOuterwear ? 0.062 : isShortSleeve ? 0.05 : isAoDaiTop ? 0.049 : 0.055;
    const midR = isOuterwear ? 0.055 : isShortSleeve ? 0.044 : isAoDaiTop ? 0.044 : 0.048;
    const wristR = isOuterwear ? 0.05 : isShortSleeve ? 0.041 : isAoDaiTop ? 0.04 : 0.043;

    if (isShortSleeve) {
      const sleeveCap = new THREE.Mesh(
        new THREE.SphereGeometry(isLolitaDress ? 0.07 : 0.058, 14, 12),
        shortSleeveMat,
      );
      const sleeveTube = new THREE.Mesh(
        new THREE.CylinderGeometry(isLolitaDress ? 0.066 : 0.058, isLolitaDress ? 0.068 : 0.064, 0.12, 16),
        shortSleeveMat,
      );
      sleeveTube.position.y = -0.06;
      const sleeveCuff = new THREE.Mesh(
        new THREE.TorusGeometry(0.063, 0.011, 8, 16),
        shortSleeveCuffMat,
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

    const forearmMat = isPeppaMascot
      ? peppaPinkMat
      : isSleeveless || isShortSleeve
        ? skinMat
        : longSleeveMat;
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

    if (isPeppaMascot || (!isSleeveless && !isShortSleeve)) {
      if (isAoDaiTop) {
        // Slim tailored silk wrist trim on Áo Dài (no bulky jacket cuff ring!)
        const aoDaiWristRim = new THREE.Mesh(
          new THREE.TorusGeometry(wristR + 0.002, 0.005, 8, 16),
          config.top === 'ao_dai_white'
            ? clayMat('#EAE2D6', 0.45)
            : clayMat('#F2CA52', 0.36, 0.2),
        );
        aoDaiWristRim.rotation.x = Math.PI / 2;
        aoDaiWristRim.position.y = -0.128;
        elbowPivot.add(aoDaiWristRim);
      } else {
        const cuffMat = isPeppaMascot
          ? peppaDarkPinkMat
          : config.top === 'cardigan_vest' || config.top === 'academy_blazer'
            ? topTrimMat
            : config.top === 'zip_parka' ||
                config.top === 'panda_pajama' ||
                config.top === 'denim_overalls'
              ? pureWhiteMat
              : config.top === 'varsity_jacket'
                ? topMat
                : topDarkMat;
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
        if (config.top === 'varsity_jacket' || config.top === 'bomber_jacket') {
          const stripeRing = new THREE.Mesh(
            new THREE.TorusGeometry(wristR + 0.007, 0.0045, 6, 16),
            topTrimMat,
          );
          stripeRing.rotation.x = Math.PI / 2;
          stripeRing.position.y = -0.118;
          elbowPivot.add(stripeRing);
        }
      }
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

    const isGripping =
      side === 1 && (Boolean(handheld) || Boolean(equippedTool) || Boolean(equippedFood));
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

  leftArm.userData.baseZ = leftArm.rotation.z;
  rightArm.userData.baseZ = rightArm.rotation.z;
  bodyPivot.add(leftArm, rightArm);

  let rodBobberObj: THREE.Object3D | undefined;
  let rodLineObj: THREE.Object3D | undefined;
  let rodMidPivot: THREE.Group | undefined;
  let rodTipPivot: THREE.Group | undefined;

  if (handheld || equippedTool || equippedFood) {
    const hColor = config.handheldColor || '#E8B84B';
    const poseCfg = HAND_POSES[holdPose];
    const hoodieClearZ = isOuterwear ? 0.06 : 0;
    rightArm.rotation.x = poseCfg.armX;
    rightArm.rotation.z = poseCfg.armZ + hoodieClearZ;
    rightArm.userData.baseZ = rightArm.rotation.z;
    rightElbow.rotation.x = poseCfg.elbowX;
    rightElbow.rotation.z = poseCfg.elbowZ;

    // Attach handAnchor directly at the closed-fist grip pocket, oriented upright in world space
    const handAnchor = new THREE.Group();
    handAnchor.position.set(0, -0.005, 0.026);
    rightArmRig.handGroup.add(handAnchor);

    bodyPivot.updateMatrixWorld(true);
    const handWorldQuat = new THREE.Quaternion();
    rightArmRig.handGroup.getWorldQuaternion(handWorldQuat);
    const desiredWorldQuat = new THREE.Quaternion().setFromEuler(
      holdPose === 'carry_umbrella'
        ? new THREE.Euler(-0.04, 0, -0.04) // angled gently outward away from face/hat; safe for balloons too
        : holdPose === 'carry_front'
          ? new THREE.Euler(0.1, 0, -0.04)
          : new THREE.Euler(0, 0, 0),
    );
    handAnchor.quaternion.copy(handWorldQuat).invert().multiply(desiredWorldQuat);

    if (equippedTool === 'wooden_rod') {
      const rodGroup = new THREE.Group();
      // Tilt rod forward and slightly upward (~48 deg) from the hand grip
      rodGroup.rotation.x = 0.72;
      rodGroup.rotation.z = -0.08;

      const corkMat = clayMat('#B88450', 0.78);
      const darkWoodMat = clayMat('#7D502E', 0.68);
      const bambooMat = clayMat('#D2A466', 0.56);
      const brassMat = glossyClayMat('#DDA844', 0.25);

      const buttCap = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 8), darkWoodMat);
      buttCap.position.set(0, -0.14, 0);

      const handle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.021, 0.023, 0.28, 12),
        corkMat,
      );
      handle.position.set(0, 0.0, 0);

      const reelBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.036, 0.036, 0.045, 12),
        brassMat,
      );
      reelBody.rotation.z = Math.PI / 2;
      reelBody.position.set(0.026, 0.095, 0.022);

      const reelCrank = new THREE.Mesh(
        new RoundedBoxGeometry(0.038, 0.012, 0.012, 2, 0.004),
        darkWoodMat,
      );
      reelCrank.position.set(0.052, 0.095, 0.034);

      const shaftButt = new THREE.Mesh(
        new THREE.CylinderGeometry(0.016, 0.019, 0.24, 10),
        darkWoodMat,
      );
      shaftButt.position.set(0, 0.26, 0);

      // Universal Flex Pivot 1 (Mid Shaft): rotates +X to flex rod cleanly downward under fish tension
      rodMidPivot = new THREE.Group();
      rodMidPivot.position.set(0, 0.38, 0);

      const shaftMid = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0125, 0.016, 0.42, 10),
        darkWoodMat,
      );
      shaftMid.position.set(0, 0.21, 0);

      const midGuide = new THREE.Mesh(
        new THREE.TorusGeometry(0.017, 0.0038, 6, 12),
        brassMat,
      );
      midGuide.position.set(0, 0.41, 0.012);

      // Universal Flex Pivot 2 (Upper Whip Tip): bends even further downward under heavy struggle
      rodTipPivot = new THREE.Group();
      rodTipPivot.position.set(0, 0.42, 0);

      const shaftUpper = new THREE.Mesh(
        new THREE.CylinderGeometry(0.006, 0.0125, 0.66, 10),
        bambooMat,
      );
      shaftUpper.position.set(0, 0.33, 0);

      const tipRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.015, 0.004, 6, 12),
        brassMat,
      );
      tipRing.position.set(0, 0.665, 0);

      const lineDrop = new THREE.Mesh(
        new THREE.CylinderGeometry(0.002, 0.002, 0.34, 4),
        clayMat('#F5FAFF', 0.3),
      );
      lineDrop.position.set(0, 0.5, 0.16);
      lineDrop.rotation.x = -0.72;
      rodLineObj = lineDrop;

      const miniBobberGroup = new THREE.Group();
      miniBobberGroup.position.set(0, 0.37, 0.28);
      const miniBobber = new THREE.Mesh(
        new THREE.SphereGeometry(0.025, 10, 10),
        glossyClayMat('#8B5228', 0.24),
      );
      const miniBobberBand = new THREE.Mesh(
        new THREE.TorusGeometry(0.024, 0.0045, 6, 12),
        glossyClayMat('#D6A168', 0.32),
      );
      miniBobberBand.rotation.x = Math.PI / 2;
      miniBobberBand.position.y = -0.003;
      miniBobberGroup.add(miniBobber, miniBobberBand);
      rodBobberObj = miniBobberGroup;

      rodTipPivot.add(shaftUpper, tipRing, lineDrop, miniBobberGroup);
      rodMidPivot.add(shaftMid, midGuide, rodTipPivot);
      rodGroup.add(
        buttCap,
        handle,
        reelBody,
        reelCrank,
        shaftButt,
        rodMidPivot,
      );
      handAnchor.add(rodGroup);
    } else if (equippedTool === 'wooden_net') {
      const netGroup = new THREE.Group();
      // Rest pole comfortably backward & slightly outward over right shoulder
      netGroup.rotation.x = -0.82;
      netGroup.rotation.z = -0.22;

      const darkWoodMat = clayMat('#7D4F2D', 0.68);
      const handleWoodMat = clayMat('#B87F4D', 0.64);
      const shaftWoodMat = clayMat('#9D6639', 0.62);
      const netSackMat = new THREE.MeshStandardMaterial({
        color: '#ECF7FC',
        roughness: 0.78,
        metalness: 0.02,
        side: THREE.DoubleSide,
      });

      const buttCap = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 8), darkWoodMat);
      buttCap.position.set(0, -0.15, 0);

      const handleGrip = new THREE.Mesh(
        new THREE.CylinderGeometry(0.021, 0.022, 0.28, 12),
        handleWoodMat,
      );
      handleGrip.position.set(0, -0.01, 0);

      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.016, 0.019, 0.64, 10),
        shaftWoodMat,
      );
      pole.position.set(0, 0.42, 0);

      const socket = new THREE.Mesh(
        new THREE.CylinderGeometry(0.028, 0.02, 0.075, 10),
        darkWoodMat,
      );
      socket.position.set(0, 0.74, 0);

      const hoopGroup = new THREE.Group();
      hoopGroup.position.set(0, 0.96, 0);
      hoopGroup.rotation.x = 0.06;

      const hoop = new THREE.Mesh(
        new THREE.TorusGeometry(0.215, 0.02, 10, 26),
        darkWoodMat,
      );

      // Deep tapered white mesh sack hanging backward behind the shoulder
      const sackPts = [
        new THREE.Vector2(0.0, -0.49),
        new THREE.Vector2(0.055, -0.45),
        new THREE.Vector2(0.115, -0.32),
        new THREE.Vector2(0.175, -0.14),
        new THREE.Vector2(0.208, 0.0),
      ];
      const sackGeo = new THREE.LatheGeometry(sackPts, 20);
      const sack = new THREE.Mesh(sackGeo, netSackMat);
      sack.rotation.x = Math.PI / 2;
      sack.position.set(0, 0, 0.0);

      hoopGroup.add(hoop, sack);
      netGroup.add(buttCap, handleGrip, pole, socket, hoopGroup);
      handAnchor.add(netGroup);
    } else if (handheld === 'milk_tea') {
      const cup = new THREE.Mesh(
        new THREE.CylinderGeometry(0.074, 0.052, 0.185, 16),
        clayMat(hColor, 0.35),
      );
      cup.position.set(0.006, 0.024, 0.012);
      const sleeve = new THREE.Mesh(
        new THREE.CylinderGeometry(0.064, 0.058, 0.064, 16),
        clayMat('#E8D3B9', 0.8),
      );
      sleeve.position.set(0.006, 0.01, 0.012);
      const lid = new THREE.Mesh(
        new THREE.SphereGeometry(0.074, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
        glossyClayMat('#FFF8F0', 0.2),
      );
      lid.position.set(0.006, 0.116, 0.012);
      const straw = new THREE.Mesh(
        new THREE.CylinderGeometry(0.011, 0.011, 0.135, 8),
        clayMat('#E86F82', 0.4),
      );
      straw.position.set(0.022, 0.184, 0.012);
      straw.rotation.z = -0.15;
      handAnchor.add(cup, sleeve, lid, straw);
    } else if (handheld === 'plush_bear') {
      const bearGrp = new THREE.Group();
      bearGrp.position.set(0.032, 0.016, 0.048);
      bearGrp.rotation.y = -0.34;

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
        strap.position.set(0.056 + sx, -0.082, 0);
        handAnchor.add(strap);
      });
      const bag = new THREE.Mesh(
        new RoundedBoxGeometry(0.115, 0.25, 0.215, 3, 0.025),
        clayMat(hColor, 0.78),
      );
      bag.position.set(0.056, -0.208, 0);
      const pocket = new THREE.Mesh(
        new RoundedBoxGeometry(0.018, 0.12, 0.125, 2, 0.012),
        clayMat(shadeHex(hColor, -0.08).getHex(), 0.78),
      );
      pocket.position.set(0.113, -0.218, 0);
      const badge = new THREE.Mesh(
        new THREE.CylinderGeometry(0.022, 0.022, 0.01, 12),
        clayMat('#E86F82', 0.5),
      );
      badge.rotation.z = Math.PI / 2;
      badge.position.set(0.123, -0.178, 0.038);
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
    } else if (handheld === 'blue_rose_bouquet') {
      const wrap = new THREE.Mesh(
        new THREE.ConeGeometry(0.145, 0.3, 14, 1, true),
        clayMat('#FFFDF9', 0.78),
      );
      wrap.rotation.x = Math.PI;
      wrap.position.set(0, 0.065, 0);
      const ribbonBow = new THREE.Mesh(
        new RoundedBoxGeometry(0.095, 0.042, 0.032, 2, 0.012),
        clayMat('#3D86EC', 0.45),
      );
      ribbonBow.position.set(0, 0.032, 0.035);
      handAnchor.add(wrap, ribbonBow);

      const leafMat = clayMat('#4C9A5E', 0.65);
      [-1, 0, 1].forEach((s) => {
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.052, 10, 8), leafMat);
        leaf.scale.set(0.75, 1.35, 0.3);
        leaf.position.set(s * 0.08, 0.22, -0.025);
        leaf.rotation.z = -s * 0.4;
        handAnchor.add(leaf);
      });

      const roseMat = clayMat(hColor || '#5598EE', 0.52);
      const roseInnerMat = clayMat('#80B8FF', 0.48);
      const buildRose = (rx: number, ry: number, rz: number, sc: number) => {
        const rGrp = new THREE.Group();
        rGrp.position.set(rx, ry, rz);
        rGrp.scale.setScalar(sc);
        const core = new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 10), roseInnerMat);
        rGrp.add(core);
        for (let p = 0; p < 5; p++) {
          const ang = (p / 5) * Math.PI * 2;
          const petal = new THREE.Mesh(new THREE.SphereGeometry(0.034, 10, 8), roseMat);
          petal.scale.set(1.1, 0.85, 0.55);
          petal.position.set(Math.cos(ang) * 0.036, Math.sin(ang) * 0.02, Math.sin(ang) * 0.032);
          rGrp.add(petal);
        }
        handAnchor.add(rGrp);
      };
      buildRose(0, 0.268, 0.018, 1.05);
      buildRose(-0.072, 0.228, 0.022, 0.88);
      buildRose(0.072, 0.228, 0.022, 0.88);
    } else if (handheld === 'cupid_bow') {
      const goldMat = glossyClayMat(hColor || '#E8B24B', 0.26);
      const stringMat = clayMat('#FFF5DC', 0.4);
      const heartMat = glossyClayMat('#E84258', 0.3);

      const bowArc = new THREE.Mesh(
        new THREE.TorusGeometry(0.24, 0.016, 10, 26, Math.PI * 1.1),
        goldMat,
      );
      bowArc.rotation.z = -Math.PI * 0.55;
      bowArc.position.set(0, 0.05, 0.06);
      const stringRod = new THREE.Mesh(
        new THREE.CylinderGeometry(0.005, 0.005, 0.46, 6),
        stringMat,
      );
      stringRod.position.set(0, 0.05, 0.035);
      const arrowShaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.009, 0.009, 0.38, 8),
        goldMat,
      );
      arrowShaft.rotation.x = Math.PI / 2;
      arrowShaft.position.set(0, 0.05, 0.16);
      const arrowHeart = new THREE.Mesh(
        new THREE.SphereGeometry(0.034, 12, 10),
        heartMat,
      );
      arrowHeart.scale.set(1.15, 0.9, 0.55);
      arrowHeart.position.set(0, 0.05, 0.35);
      handAnchor.add(bowArc, stringRod, arrowShaft, arrowHeart);
    } else if (handheld === 'paper_lantern') {
      const stickMat = clayMat('#7D5333', 0.65);
      const redSilkMat = new THREE.MeshStandardMaterial({
        color: hColor || '#EA3B3B',
        emissive: '#FF5428',
        emissiveIntensity: 0.45,
        roughness: 0.42,
      });
      const goldMat = clayMat('#F4CA4C', 0.3, 0.35);

      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.011, 0.32, 8), stickMat);
      handle.rotation.x = 0.72;
      handle.position.set(0, 0.08, 0.08);
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.08, 6), goldMat);
      cord.position.set(0, 0.145, 0.19);
      const lanternBody = new THREE.Mesh(new THREE.SphereGeometry(0.092, 16, 14), redSilkMat);
      lanternBody.scale.set(1.06, 0.92, 1.06);
      lanternBody.position.set(0, 0.045, 0.19);
      const topCap = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.058, 0.018, 12), goldMat);
      topCap.position.set(0, 0.125, 0.19);
      const botCap = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.048, 0.018, 12), goldMat);
      botCap.position.set(0, -0.035, 0.19);
      const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.095, 8), redSilkMat);
      tassel.position.set(0, -0.09, 0.19);
      handAnchor.add(handle, cord, lanternBody, topCap, botCap, tassel);
    } else if (handheld === 'lotus_fan') {
      const fanGrp = new THREE.Group();
      fanGrp.position.set(0, 0.04, 0.02);
      fanGrp.rotation.x = 0.25;
      fanGrp.rotation.z = -0.18;
      const bambooMat = clayMat('#C69454', 0.66);
      const silkMat = clayMat(hColor || '#F7B7C8', 0.56);
      const goldTrimMat = clayMat('#F4CA4C', 0.32, 0.28);

      const handleStick = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.012, 0.14, 8), bambooMat);
      handleStick.position.set(0, 0.01, 0);
      const fanDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.145, 0.014, 24), silkMat);
      fanDisc.rotation.x = Math.PI / 2;
      fanDisc.position.set(0, 0.18, 0);
      const fanRim = new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.008, 8, 24), goldTrimMat);
      fanRim.position.set(0, 0.18, 0);
      const lotusBlossom = new THREE.Mesh(new THREE.SphereGeometry(0.036, 10, 8), clayMat('#FFF4F7', 0.45));
      lotusBlossom.scale.set(1.2, 0.85, 0.35);
      lotusBlossom.position.set(0, 0.175, 0.01);
      const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.075, 8), clayMat('#E85A72', 0.55));
      tassel.position.set(0, -0.09, 0);
      fanGrp.add(handleStick, fanDisc, fanRim, lotusBlossom, tassel);
      handAnchor.add(fanGrp);
    } else if (handheld === 'matcha_latte') {
      const cup = new THREE.Mesh(
        new THREE.CylinderGeometry(0.072, 0.05, 0.175, 16),
        clayMat(hColor || '#6EBA6A', 0.38),
      );
      cup.position.set(0.006, 0.024, 0.012);
      const creamFoam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.074, 0.072, 0.036, 16),
        glossyClayMat('#FFFDF7', 0.24),
      );
      creamFoam.position.set(0.006, 0.105, 0.012);
      const lid = new THREE.Mesh(
        new THREE.SphereGeometry(0.073, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
        glossyClayMat('#FFFFFF', 0.16),
      );
      lid.position.set(0.006, 0.122, 0.012);
      const straw = new THREE.Mesh(
        new THREE.CylinderGeometry(0.01, 0.01, 0.135, 8),
        clayMat('#438742', 0.4),
      );
      straw.position.set(0.02, 0.184, 0.012);
      straw.rotation.z = -0.14;
      handAnchor.add(cup, creamFoam, lid, straw);
    } else if (equippedFood === 'bbq_meat_skewer') {
      const skewerGroup = new THREE.Group();
      skewerGroup.rotation.x = 0.24;
      skewerGroup.rotation.z = -0.08;
      const stickMat = clayMat('#D9B47E', 0.72);
      const meatMat = glossyClayMat('#B94E28', 0.36);
      const searMat = clayMat('#4C2615', 0.78);
      const redPepMat = glossyClayMat('#E34D3C', 0.38);
      const yelPepMat = glossyClayMat('#F4B93D', 0.42);
      const grnPepMat = glossyClayMat('#63AD48', 0.44);

      const stick = new THREE.Mesh(
        new THREE.CylinderGeometry(0.009, 0.011, 0.44, 8),
        stickMat,
      );
      stick.position.set(0, 0.14, 0);
      skewerGroup.add(stick);

      [
        {y: 0.08, geo: new THREE.SphereGeometry(0.036, 9, 8), scale: [1.1, 0.72, 1.0], mat: grnPepMat},
        {y: 0.14, geo: new RoundedBoxGeometry(0.072, 0.062, 0.068, 2, 0.018), scale: [1, 1, 1], mat: meatMat},
        {y: 0.20, geo: new RoundedBoxGeometry(0.066, 0.034, 0.064, 2, 0.01), scale: [1, 1, 1], mat: yelPepMat},
        {y: 0.255, geo: new RoundedBoxGeometry(0.074, 0.062, 0.068, 2, 0.018), scale: [1, 1, 1], mat: meatMat},
        {y: 0.31, geo: new RoundedBoxGeometry(0.062, 0.032, 0.062, 2, 0.01), scale: [1, 1, 1], mat: redPepMat},
      ].forEach((chunk, ci) => {
        const m = new THREE.Mesh(chunk.geo, chunk.mat);
        m.position.set(0, chunk.y, 0);
        m.scale.set(chunk.scale[0], chunk.scale[1], chunk.scale[2]);
        m.rotation.y = ci * 0.42;
        skewerGroup.add(m);
        if (chunk.mat === meatMat) {
          const charBar = new THREE.Mesh(
            new RoundedBoxGeometry(0.078, 0.012, 0.072, 1, 0.004),
            searMat,
          );
          charBar.position.set(0, chunk.y, 0);
          charBar.rotation.y = ci * 0.42;
          skewerGroup.add(charBar);
        }
      });
      handAnchor.add(skewerGroup);
    } else if (equippedFood === 'bbq_grilled_fish') {
      const fishPlateGroup = new THREE.Group();
      fishPlateGroup.position.set(0.01, 0.03, 0.02);
      fishPlateGroup.rotation.x = -0.35;
      fishPlateGroup.rotation.z = -0.14;

      const bambooMat = clayMat('#D8B37C', 0.72);
      const leafMat = clayMat('#529446', 0.62);
      const fishSkinMat = glossyClayMat('#DF8E3A', 0.36);
      const fishCharMat = clayMat('#5C3116', 0.76);
      const lemonMat = glossyClayMat('#F9DC5C', 0.38);

      const handleStick = new THREE.Mesh(
        new THREE.CylinderGeometry(0.011, 0.012, 0.24, 8),
        bambooMat,
      );
      handleStick.position.set(0, 0.03, 0);

      const leafTray = new THREE.Mesh(
        new RoundedBoxGeometry(0.16, 0.024, 0.28, 2, 0.012),
        leafMat,
      );
      leafTray.position.set(0, 0.14, 0.04);

      const fishBody = new THREE.Mesh(new THREE.SphereGeometry(0.068, 12, 10), fishSkinMat);
      fishBody.scale.set(0.75, 0.56, 1.55);
      fishBody.position.set(0, 0.175, 0.03);

      const fishTail = new THREE.Mesh(new THREE.ConeGeometry(0.044, 0.075, 6), fishSkinMat);
      fishTail.rotation.x = Math.PI / 2;
      fishTail.scale.set(0.38, 1, 1.0);
      fishTail.position.set(0, 0.175, 0.155);

      [-0.03, 0.02, 0.07].forEach((fz) => {
        const mark = new THREE.Mesh(
          new RoundedBoxGeometry(0.088, 0.012, 0.014, 1, 0.004),
          fishCharMat,
        );
        mark.position.set(0, 0.205, fz);
        mark.rotation.y = 0.24;
        fishPlateGroup.add(mark);
      });

      const lemon = new THREE.Mesh(
        new THREE.CylinderGeometry(0.028, 0.028, 0.012, 10),
        lemonMat,
      );
      lemon.position.set(0.042, 0.162, -0.03);
      fishPlateGroup.add(handleStick, leafTray, fishBody, fishTail, lemon);
      handAnchor.add(fishPlateGroup);
    } else if (equippedFood === 'bbq_corn_sausage') {
      const comboGroup = new THREE.Group();
      comboGroup.rotation.x = 0.2;
      comboGroup.rotation.z = -0.06;

      const stickMat = clayMat('#D8B37C', 0.72);
      const cornMat = glossyClayMat('#F6C93E', 0.42);
      const butterMat = glossyClayMat('#FFF199', 0.3);
      const sausageMat = glossyClayMat('#C94933', 0.32);
      const searMat = clayMat('#522414', 0.76);

      const stick = new THREE.Mesh(
        new THREE.CylinderGeometry(0.009, 0.011, 0.42, 8),
        stickMat,
      );
      stick.position.set(0, 0.13, 0);

      const cornCob = new THREE.Mesh(
        new THREE.CylinderGeometry(0.042, 0.038, 0.14, 12),
        cornMat,
      );
      cornCob.position.set(-0.026, 0.21, 0);
      cornCob.rotation.z = 0.12;

      const butterPat = new THREE.Mesh(
        new RoundedBoxGeometry(0.034, 0.018, 0.034, 1, 0.005),
        butterMat,
      );
      butterPat.position.set(-0.028, 0.25, 0.034);

      const sausage = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.03, 0.115, 6, 10),
        sausageMat,
      );
      sausage.position.set(0.034, 0.21, 0.008);
      sausage.rotation.z = -0.1;

      [-0.03, 0.0, 0.03].forEach((sy) => {
        const notch = new THREE.Mesh(
          new RoundedBoxGeometry(0.056, 0.009, 0.056, 1, 0.003),
          searMat,
        );
        notch.position.set(0.034, 0.21 + sy, 0.008);
        notch.rotation.z = 0.16;
        comboGroup.add(notch);
      });

      comboGroup.add(stick, cornCob, butterPat, sausage);
      handAnchor.add(comboGroup);
    } else if (equippedFood === 'drink_water') {
      const bottleGroup = new THREE.Group();
      bottleGroup.rotation.x = 0.16;
      bottleGroup.rotation.z = -0.05;
      const plasticMat = new THREE.MeshStandardMaterial({
        color: '#CBEFFF',
        roughness: 0.18,
        metalness: 0.05,
        transparent: true,
        opacity: 0.86,
      });
      const capMat = glossyClayMat('#2A7FB2', 0.28);
      const labelMat = glossyClayMat('#4AB1E6', 0.34);

      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.165, 12), plasticMat);
      body.position.y = 0.11;
      const label = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.068, 12), labelMat);
      label.position.y = 0.11;
      const shoulder = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.038, 0.04, 12), plasticMat);
      shoulder.position.y = 0.212;
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.021, 0.028, 10), capMat);
      cap.position.y = 0.244;
      bottleGroup.add(body, label, shoulder, cap);
      handAnchor.add(bottleGroup);
    } else if (equippedFood === 'drink_strawberry_milk') {
      const milkGroup = new THREE.Group();
      milkGroup.rotation.x = 0.18;
      milkGroup.rotation.z = -0.06;
      const cartonMat = clayMat('#FFB2CE', 0.56);
      const bandMat = clayMat('#FFF8FA', 0.62);
      const berryMat = glossyClayMat('#EB4876', 0.32);
      const strawMat = glossyClayMat('#F45886', 0.3);

      const carton = new THREE.Mesh(
        new RoundedBoxGeometry(0.086, 0.135, 0.072, 2, 0.01),
        cartonMat,
      );
      carton.position.y = 0.1;
      const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.058, 0.042, 4), cartonMat);
      roof.rotation.y = Math.PI / 4;
      roof.position.y = 0.186;
      const band = new THREE.Mesh(new RoundedBoxGeometry(0.09, 0.048, 0.076, 1, 0.005), bandMat);
      band.position.y = 0.1;
      const berry = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 8), berryMat);
      berry.position.set(0, 0.1, 0.04);
      const strawStem = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.075, 6), strawMat);
      strawStem.position.set(0.018, 0.21, 0);
      strawStem.rotation.z = -0.24;
      milkGroup.add(carton, roof, band, berry, strawStem);
      handAnchor.add(milkGroup);
    } else if (equippedFood === 'drink_matcha_can' || equippedFood === 'drink_cola') {
      const canGroup = new THREE.Group();
      canGroup.rotation.x = 0.16;
      canGroup.rotation.z = -0.06;
      const isMatcha = equippedFood === 'drink_matcha_can';
      const bodyMat = glossyClayMat(isMatcha ? '#62B36E' : '#EB6834', 0.26);
      const labelMat = glossyClayMat(isMatcha ? '#E8F7E3' : '#FFF4D8', 0.36);
      const rimMat = glossyClayMat('#DCE4EC', 0.18);

      const canBody = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.138, 14), bodyMat);
      canBody.position.y = 0.105;
      const canLabel = new THREE.Mesh(new THREE.CylinderGeometry(0.0375, 0.0375, 0.062, 14), labelMat);
      canLabel.position.y = 0.105;
      const topRim = new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.036, 0.014, 14), rimMat);
      topRim.position.y = 0.178;
      const botRim = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.032, 0.012, 14), rimMat);
      botRim.position.y = 0.034;
      canGroup.add(canBody, canLabel, topRim, botRim);
      handAnchor.add(canGroup);
    }
  }

  // ========== SCULPTED CHIBI-SIMS HEAD & EXPRESSIVE FACE ==========
  const headPivot = new THREE.Group();
  headPivot.position.set(0, HEAD_PIVOT_Y, 0);
  bodyPivot.add(headPivot);

  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.062, 0.076, 0.092, 16),
    skinMat,
  );
  neck.position.y = -0.004;
  headPivot.add(neck);

  // Sculpted head mesh (already centered at HEAD_CY = 0.30)
  const headMesh = new THREE.Mesh(createSculptedHeadGeometry(), skinMat);
  headPivot.add(headMesh);

  // Detailed Ears nested cleanly beside Nendoroid cheek/jaw contour
  {
    const innerEarMat = clayMat(shadeHex(config.skinTone, -0.11).getHex(), 0.72);
    [-1, 1].forEach((side) => {
      const earGrp = new THREE.Group();
      earGrp.position.set(side * 0.298, 0.252, -0.01);
      earGrp.rotation.y = -side * 0.22;

      const earOuter = new THREE.Mesh(new THREE.SphereGeometry(0.056, 12, 12), skinMat);
      earOuter.scale.set(0.6, 1.0, 0.72);
      const earInner = new THREE.Mesh(new THREE.SphereGeometry(0.036, 10, 10), innerEarMat);
      earInner.scale.set(0.42, 0.72, 0.45);
      earInner.position.set(side * 0.012, 0, 0.008);
      earGrp.add(earOuter, earInner);
      headPivot.add(earGrp);
    });
  }

  // Optional Soft Rosy Cheeks positioned right beneath large chibi eye corners
  if (config.blush) {
    const blushPatchGeo = new THREE.SphereGeometry(0.048, 14, 10);
    [-1, 1].forEach((side) => {
      const cheek = new THREE.Mesh(blushPatchGeo, cheekMat);
      cheek.scale.set(1.38, 0.72, 0.08);
      const [cx, cy, cz] = headSurfacePoint(117, side * 42, 0.0022);
      cheek.position.set(cx, cy, cz);
      cheek.rotation.y = side * 0.48;
      headPivot.add(cheek);
    });
  }

  // ========== CONFORMAL BIG CHIBI FACIAL SYSTEM ==========
  const eyelids: THREE.Mesh[] = [];
  const openEyeGroup = new THREE.Group();
  const closedEyeGroup = new THREE.Group();
  closedEyeGroup.visible = false;

  const eyeLatMin = 80;
  const eyeLatMax = 115;

  ([-1, 1] as const).forEach((side) => {
    const lonA = side === -1 ? -46 : 10;
    const lonB = side === -1 ? -10 : 46;
    const patchGeo = createHeadConformalPatchGeometry(
      eyeLatMin,
      eyeLatMax,
      lonA,
      lonB,
      0.0028,
      20,
      16,
    );

    const openTex = createChibiEyeTexture(config.eyeColor, config.eyeStyle, side);
    const openMat = new THREE.MeshStandardMaterial({
      color: '#FFFFFF',
      map: openTex,
      transparent: true,
      alphaTest: 0.02,
      roughness: 0.24,
      metalness: 0.0,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });
    openEyeGroup.add(new THREE.Mesh(patchGeo, openMat));

    const closedTex = createChibiEyeTexture(config.eyeColor, 'sleep_closed', side);
    const closedMat = new THREE.MeshStandardMaterial({
      color: '#FFFFFF',
      map: closedTex,
      transparent: true,
      alphaTest: 0.02,
      roughness: 0.34,
      metalness: 0.0,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });
    closedEyeGroup.add(new THREE.Mesh(patchGeo, closedMat));
  });
  headPivot.add(openEyeGroup, closedEyeGroup);

  // Clean Sculpted Eyebrows aligned smoothly above the big chibi eyes
  const browBaseCol = new THREE.Color(config.hairColor);
  const browLum = {h: 0, s: 0, l: 0};
  browBaseCol.getHSL(browLum);
  if (browLum.l > 0.58) browBaseCol.setHSL(browLum.h, browLum.s * 0.85, 0.44);
  else browBaseCol.lerp(new THREE.Color('#1A1412'), 0.32);
  const eyebrowMat = clayMat(browBaseCol.getHex(), 0.54);

  [-1, 1].forEach((side) => {
    const es = config.eyeStyle;
    const ex = config.expression;
    const isPout = ex === 'pout';
    const isCool = es === 'cool' || ex === 'confident';
    const isHappy =
      es === 'happy_arc' ||
      es === 'joy_xd' ||
      es === 'sparkle' ||
      ex === 'joy_open';

    const browLat = isPout ? 78 : isCool ? 78 : isHappy ? 74 : 76;
    const innerLat = isPout ? browLat + 3.2 : isCool ? browLat + 1.8 : browLat + 0.6;
    const midLat = isPout ? browLat - 0.4 : isCool ? browLat : browLat - 2.2;
    const outerLat = isPout ? browLat - 3.8 : isCool ? browLat + 0.4 : browLat + 0.8;

    const lonInner = side * 15;
    const lonMid = side * 27;
    const lonOuter = side * 39;

    const brow = new THREE.Mesh(
      createTaperedTubeGeometry(
        [
          headSurfacePoint(innerLat, lonInner, 0.0034),
          headSurfacePoint(midLat, lonMid, 0.0038),
          headSurfacePoint(outerLat, lonOuter, 0.0032),
        ],
        isPout || isCool ? 0.0046 : 0.0042,
        12,
        6,
        0.24,
      ),
      eyebrowMat,
    );
    headPivot.add(brow);
  });

  // Conformal Cute Chibi Mouth + Nose Button
  const mouthTex = createChibiMouthTexture(config.expression);
  const mouthPatchGeo = createHeadConformalPatchGeometry(107, 142, -22, 22, 0.0026, 18, 14);
  const mouthMat = new THREE.MeshStandardMaterial({
    color: '#FFFFFF',
    map: mouthTex,
    transparent: true,
    alphaTest: 0.02,
    roughness: 0.42,
    metalness: 0.0,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  headPivot.add(new THREE.Mesh(mouthPatchGeo, mouthMat));

  // ========== MODULAR STYLIZED 3D CLAY HAIR + ADORABLE PEPPA KIGURUMI CAP ==========
  {
    const hairAssembly = buildCharacterHair(config, hairMat, topMat);
    headPivot.add(hairAssembly.root);

    if (isPeppaMascot) {
      // Cute chibi girl wearing a fluffy pastel Peppa Pig mascot cap/hood over her hair (exposes face + air bangs cleanly!)
      const hoodPinkMat = clayMat('#FFA8CA', 0.6);
      const hoodDeepPinkMat = clayMat('#E96C9B', 0.56);
      const hoodRimMat = clayMat('#FFE0EE', 0.62);
      const mascotEyeDarkMat = clayMat('#522439', 0.48);
      const mascotCheekMat = clayMat('#FF7BA7', 0.66);

      const hoodGroup = new THREE.Group();

      // Soft plush piggy beret/hood cap perched smoothly over crown & back-top of hair (never covers face!)
      const capDome = new THREE.Mesh(new THREE.SphereGeometry(0.322, 24, 16), hoodPinkMat);
      capDome.scale.set(1.03, 0.56, 1.04);
      capDome.position.set(0, 0.525, -0.03);
      hoodGroup.add(capDome);

      // Soft fluffy cream-pink cuff band framing the top crown just above her bangs
      const capBand = new THREE.Mesh(new THREE.TorusGeometry(0.285, 0.026, 10, 28), hoodRimMat);
      capBand.rotation.x = Math.PI / 2 - 0.14;
      capBand.position.set(0, 0.485, -0.015);
      hoodGroup.add(capBand);

      // Cute soft pastel collar scarf tucked neatly at neck
      const hoodCollar = new THREE.Mesh(
        new THREE.TorusGeometry(0.118, 0.024, 10, 22),
        hoodRimMat,
      );
      hoodCollar.rotation.x = Math.PI / 2;
      hoodCollar.position.set(0, 0.018, -0.005);
      hoodGroup.add(hoodCollar);

      // Two soft rounded plush piggy ears on the cap
      [-1, 1].forEach((side) => {
        const earOuter = new THREE.Mesh(new THREE.SphereGeometry(0.064, 14, 12), hoodPinkMat);
        earOuter.scale.set(0.76, 1.32, 0.46);
        earOuter.position.set(side * 0.145, 0.725, -0.015);
        earOuter.rotation.z = -side * 0.24;
        earOuter.rotation.x = 0.06;

        const earInner = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 10), hoodDeepPinkMat);
        earInner.scale.set(0.62, 1.08, 0.28);
        earInner.position.set(side * 0.146, 0.722, 0.006);
        earInner.rotation.z = -side * 0.24;
        earInner.rotation.x = 0.06;
        hoodGroup.add(earOuter, earInner);
      });

      // Tiny gentle plush piggy nose charm on the cap front (no creepy long cylinder!)
      const snoutGroup = new THREE.Group();
      snoutGroup.position.set(0, 0.562, 0.275);
      snoutGroup.rotation.x = -0.22;

      const snoutTip = new THREE.Mesh(new THREE.SphereGeometry(0.064, 14, 12), hoodRimMat);
      snoutTip.scale.set(1.18, 0.86, 0.64);
      snoutGroup.add(snoutTip);

      [-0.022, 0.022].forEach((nx) => {
        const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), hoodDeepPinkMat);
        nostril.scale.set(1.0, 1.15, 0.55);
        nostril.position.set(nx, 0.002, 0.042);
        snoutGroup.add(nostril);
      });
      hoodGroup.add(snoutGroup);

      // Sweet embroidered happy piggy eyes & rosy cheeks on cap crest (gentle, cute, zero scary white bulbs)
      [-1, 1].forEach((side) => {
        const cuteEyeArc = new THREE.Mesh(
          new THREE.TorusGeometry(0.024, 0.007, 8, 12, Math.PI),
          mascotEyeDarkMat,
        );
        cuteEyeArc.position.set(side * 0.075, 0.618, 0.222);
        cuteEyeArc.rotation.x = -0.35;
        cuteEyeArc.rotation.y = side * 0.18;

        const capCheek = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), mascotCheekMat);
        capCheek.scale.set(1.2, 0.85, 0.36);
        capCheek.position.set(side * 0.135, 0.558, 0.212);
        capCheek.rotation.y = side * 0.42;
        hoodGroup.add(cuteEyeArc, capCheek);
      });

      headPivot.add(hoodGroup);
    }

    // ========== STANDARDIZED HEADWEAR & ACCESSORIES ON HAT ATTACHMENT POINTS ==========
    const {crownTop, crownTilted, headbandArc, templeLeft, templeRight} =
      hairAssembly.attachments;
    const accGroup = hairAssembly.hairAccessories;
    const headItemCol = config.headItemColor || config.topColor;

    if (config.headItem === 'beret') {
      const beretMat = clayMat(headItemCol, 0.66);
      const rimMat = clayMat(shadeHex(headItemCol, -0.14).getHex(), 0.72);
      // Ordered bottom-up for crisp outward-facing Three.js LatheGeometry normals
      const pts = [
        new THREE.Vector2(0.245, -0.008),
        new THREE.Vector2(0.268, 0.0),
        new THREE.Vector2(0.32, 0.024),
        new THREE.Vector2(0.332, 0.072),
        new THREE.Vector2(0.248, 0.114),
        new THREE.Vector2(0.1, 0.124),
        new THREE.Vector2(0.0, 0.118),
      ];
      const beretGeo = new THREE.LatheGeometry(pts, 28);
      beretGeo.scale(1.06, 0.96, 1.0);
      const beretBody = new THREE.Mesh(beretGeo, beretMat);
      beretBody.position.set(
        crownTilted.position.x,
        crownTilted.position.y - 0.078,
        crownTilted.position.z,
      );
      beretBody.rotation.copy(crownTilted.rotation);

      const band = new THREE.Mesh(new THREE.TorusGeometry(0.262, 0.02, 10, 28), rimMat);
      band.rotation.x = Math.PI / 2;
      band.scale.set(1.04, 0.98, 1.0);
      const bandHolder = new THREE.Group();
      bandHolder.position.set(
        crownTilted.position.x,
        crownTilted.position.y - 0.074,
        crownTilted.position.z,
      );
      bandHolder.rotation.copy(crownTilted.rotation);
      bandHolder.add(band);

      const stem = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.026, 6, 8), rimMat);
      stem.position.set(
        crownTilted.position.x + 0.018,
        crownTilted.position.y + 0.044,
        crownTilted.position.z,
      );
      stem.rotation.copy(crownTilted.rotation);
      accGroup.add(beretBody, bandHolder, stem);
    } else if (config.headItem === 'sunhat') {
      const hatMat = clayMat(headItemCol || '#EBD08E', 0.74);
      const ribbonMat = clayMat('#E57A6B', 0.65);
      // Ordered inner-underbrim -> outer-brim -> top-crown for outward normals
      const pts = [
        new THREE.Vector2(0.262, 0.006),
        new THREE.Vector2(0.42, -0.022),
        new THREE.Vector2(0.518, -0.042),
        new THREE.Vector2(0.516, -0.028),
        new THREE.Vector2(0.43, -0.008),
        new THREE.Vector2(0.278, 0.018),
        new THREE.Vector2(0.245, 0.118),
        new THREE.Vector2(0.16, 0.14),
        new THREE.Vector2(0.0, 0.146),
      ];
      const hatGeo = new THREE.LatheGeometry(pts, 32);
      hatGeo.scale(1.06, 1.0, 0.98);
      const pos = hatGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);
        const r = Math.hypot(x, z);
        if (r > 0.28) {
          pos.setY(i, y + Math.sin(Math.atan2(z, x) * 2) * 0.015 * ((r - 0.28) / 0.23));
        }
      }
      hatGeo.computeVertexNormals();

      const sunhat = new THREE.Mesh(hatGeo, hatMat);
      sunhat.position.set(crownTop.position.x, crownTop.position.y - 0.068, crownTop.position.z);
      sunhat.rotation.copy(crownTop.rotation);

      const ribbon = new THREE.Mesh(new THREE.CylinderGeometry(0.274, 0.282, 0.036, 24), ribbonMat);
      ribbon.scale.set(1.06, 1, 0.98);
      ribbon.position.set(crownTop.position.x, crownTop.position.y - 0.036, crownTop.position.z);
      ribbon.rotation.copy(crownTop.rotation);
      accGroup.add(sunhat, ribbon);
    } else if (config.headItem === 'cap') {
      const capCol = headItemCol || '#4B86B4';
      const capMat = clayMat(capCol, 0.6);
      const darkCapMat = clayMat(shadeHex(capCol, -0.14).getHex(), 0.64);
      const trimMat = clayMat('#F7F3EA', 0.62);

      const capGrp = new THREE.Group();
      // Roomy sporty dome covering crown cleanly down to brow & temples while bangs peek out underneath
      capGrp.position.set(crownTop.position.x, crownTop.position.y - 0.168, crownTop.position.z - 0.004);
      capGrp.rotation.set(-0.08, 0, 0);

      const domeGeo = new THREE.SphereGeometry(1, 32, 18, 0, Math.PI * 2, 0, Math.PI * 0.56);
      domeGeo.scale(0.382, 0.252, 0.368);
      const dome = new THREE.Mesh(domeGeo, capMat);

      const rimGeo = new THREE.TorusGeometry(1, 0.018, 10, 32);
      rimGeo.rotateX(Math.PI / 2);
      rimGeo.scale(0.376, 1, 0.362);
      const rim = new THREE.Mesh(rimGeo, darkCapMat);
      rim.position.y = -0.004;

      const visorShape = new THREE.Shape();
      visorShape.moveTo(-0.255, 0);
      visorShape.bezierCurveTo(-0.25, 0.225, -0.135, 0.335, 0, 0.345);
      visorShape.bezierCurveTo(0.135, 0.335, 0.25, 0.225, 0.255, 0);
      visorShape.quadraticCurveTo(0, 0.078, -0.255, 0);

      const visorGeo = new THREE.ExtrudeGeometry(visorShape, {
        depth: 0.018,
        bevelEnabled: true,
        bevelThickness: 0.008,
        bevelSize: 0.008,
        bevelSegments: 2,
        curveSegments: 16,
      });
      visorGeo.rotateX(Math.PI / 2 + 0.1);
      const vPos = visorGeo.attributes.position;
      for (let i = 0; i < vPos.count; i++) {
        const vx = vPos.getX(i);
        const vz = vPos.getZ(i);
        vPos.setY(i, vPos.getY(i) - vx * vx * 0.62 - vz * 0.04);
      }
      visorGeo.computeVertexNormals();
      const visor = new THREE.Mesh(visorGeo, capMat);
      visor.position.set(0, 0.014, 0.272);

      const emblem = new THREE.Mesh(
        new RoundedBoxGeometry(0.088, 0.048, 0.018, 2, 0.008),
        trimMat,
      );
      emblem.position.set(0, 0.09, 0.352);
      emblem.rotation.x = -0.34;

      const btn = new THREE.Mesh(new THREE.SphereGeometry(0.024, 12, 10), darkCapMat);
      btn.scale.set(1, 0.52, 1);
      btn.position.set(0, 0.252, 0);

      capGrp.add(dome, rim, visor, emblem, btn);
      accGroup.add(capGrp);
    } else if (config.headItem === 'beanie') {
      const knitCol = headItemCol || '#D89A48';
      const knitMat = clayMat(knitCol, 0.78);
      const cuffMat = clayMat(shadeHex(knitCol, -0.1).getHex(), 0.8);
      const pomMat = clayMat('#F8F4EC', 0.82);

      const beanieGrp = new THREE.Group();
      beanieGrp.position.set(crownTop.position.x, crownTop.position.y - 0.112, crownTop.position.z - 0.006);
      beanieGrp.rotation.set(-0.1, 0, 0);

      // Oversized plush knit beanie sitting snugly over hair without poke-through
      const pts = [
        new THREE.Vector2(0.352, -0.076),
        new THREE.Vector2(0.388, -0.068),
        new THREE.Vector2(0.384, 0.018),
        new THREE.Vector2(0.326, 0.112),
        new THREE.Vector2(0.195, 0.168),
        new THREE.Vector2(0.0, 0.178),
      ];
      const domeGeo = new THREE.LatheGeometry(pts, 32);
      domeGeo.scale(1.06, 1.0, 1.0);
      const dome = new THREE.Mesh(domeGeo, knitMat);

      const cuffGeo = new THREE.TorusGeometry(0.368, 0.048, 12, 32);
      cuffGeo.rotateX(Math.PI / 2);
      cuffGeo.scale(1.06, 1.0, 1.0);
      const cuff = new THREE.Mesh(cuffGeo, cuffMat);
      cuff.position.y = -0.064;

      const pom = new THREE.Mesh(new THREE.SphereGeometry(0.064, 16, 12), pomMat);
      pom.position.set(0, 0.2, -0.01);

      beanieGrp.add(dome, cuff, pom);
      accGroup.add(beanieGrp);
    } else if (config.headItem === 'bucket_hat') {
      const hatCol = headItemCol || '#DFBA87';
      const hatMat = clayMat(hatCol, 0.72);
      const bandMat = clayMat(shadeHex(hatCol, -0.14).getHex(), 0.74);

      const bucketGrp = new THREE.Group();
      bucketGrp.position.set(crownTop.position.x, crownTop.position.y - 0.132, crownTop.position.z - 0.004);
      bucketGrp.rotation.set(-0.08, 0, 0);

      // Tapered flat-top bucket crown + downward bell brim (all in one smooth LatheGeometry)
      const pts = [
        new THREE.Vector2(0.354, -0.044),
        new THREE.Vector2(0.45, -0.072),
        new THREE.Vector2(0.506, -0.098),
        new THREE.Vector2(0.498, -0.08),
        new THREE.Vector2(0.435, -0.052),
        new THREE.Vector2(0.376, -0.022),
        new THREE.Vector2(0.362, 0.055),
        new THREE.Vector2(0.324, 0.135),
        new THREE.Vector2(0.278, 0.158),
        new THREE.Vector2(0.14, 0.164),
        new THREE.Vector2(0.0, 0.162),
      ];
      const bucketGeo = new THREE.LatheGeometry(pts, 32);
      bucketGeo.scale(1.06, 1.0, 1.01);
      const bucketMesh = new THREE.Mesh(bucketGeo, hatMat);

      const band = new THREE.Mesh(
        new THREE.CylinderGeometry(0.372, 0.382, 0.036, 32),
        bandMat,
      );
      band.scale.set(1.06, 1, 1.01);
      band.position.y = 0.0;

      bucketGrp.add(bucketMesh, band);
      accGroup.add(bucketGrp);
    } else if (config.headItem === 'cat_ears') {
      const bandR = headbandArc.radius;
      const band = new THREE.Mesh(
        new THREE.TorusGeometry(bandR, 0.019, 10, 28, Math.PI),
        clayMat('#3A2B28', 0.65),
      );
      band.scale.set(1.01, 0.99, 1.0);
      band.position.copy(headbandArc.center);
      band.rotation.x = headbandArc.tiltX;
      accGroup.add(band);

      const earTopY = headbandArc.center.y + bandR * 0.99 * Math.cos(headbandArc.tiltX) - 0.012;
      const earZ = headbandArc.center.z - bandR * Math.sin(headbandArc.tiltX) * 0.52 + 0.022;
      [-1, 1].forEach((side) => {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.084, 0.145, 14), clayMat('#FFF8F2'));
        ear.scale.set(1.0, 1.0, 0.62);
        ear.position.set(side * 0.21, earTopY, earZ);
        ear.rotation.z = -side * 0.3;
        ear.rotation.x = headbandArc.tiltX;
        const inner = new THREE.Mesh(
          new THREE.ConeGeometry(0.046, 0.095, 12),
          clayMat(headItemCol || '#F497AC'),
        );
        inner.scale.set(1.0, 1.0, 0.52);
        inner.position.set(side * 0.21, earTopY - 0.012, earZ + 0.022);
        inner.rotation.z = -side * 0.3;
        inner.rotation.x = headbandArc.tiltX;
        accGroup.add(ear, inner);
      });
    } else if (config.headItem === 'flower_crown') {
      const bandR = headbandArc.radius;
      const band = new THREE.Mesh(
        new THREE.TorusGeometry(bandR, 0.017, 10, 28, Math.PI),
        clayMat('#5E9E69', 0.72),
      );
      band.scale.set(1.01, 0.99, 1.0);
      band.position.copy(headbandArc.center);
      band.rotation.x = headbandArc.tiltX;
      accGroup.add(band);

      const petalGeo = new THREE.SphereGeometry(0.019, 10, 8);
      petalGeo.scale(0.85, 1.15, 0.45);
      const coreMat = clayMat('#F7C844', 0.58);

      for (let i = 0; i < 5; i++) {
        const ang = -1.06 + i * 0.53;
        const fx = Math.sin(ang) * (bandR * 1.01 + 0.014);
        const fy = headbandArc.center.y + Math.cos(ang) * (bandR * 0.99 + 0.014) * Math.cos(headbandArc.tiltX);
        const fz = headbandArc.center.z - Math.cos(ang) * (bandR + 0.014) * Math.sin(headbandArc.tiltX);

        const flowerGrp = new THREE.Group();
        flowerGrp.position.set(fx, fy, fz);
        const radialN = new THREE.Vector3(
          Math.sin(ang),
          Math.cos(ang) * Math.cos(headbandArc.tiltX),
          -Math.cos(ang) * Math.sin(headbandArc.tiltX) + 0.22,
        ).normalize();
        flowerGrp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), radialN);

        const pMat = clayMat(i % 2 === 0 ? headItemCol || '#F7A8B8' : '#FFF3B8', 0.62);
        for (let p = 0; p < 5; p++) {
          const pa = (p / 5) * Math.PI * 2;
          const petal = new THREE.Mesh(petalGeo, pMat);
          petal.position.set(Math.cos(pa) * 0.022, Math.sin(pa) * 0.022, 0);
          petal.rotation.z = pa - Math.PI / 2;
          flowerGrp.add(petal);
        }
        const bud = new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 8), coreMat);
        bud.scale.set(1, 1, 0.65);
        bud.position.z = 0.006;
        flowerGrp.add(bud);
        accGroup.add(flowerGrp);
      }
    } else if (config.headItem === 'ribbon_bow') {
      const bowMat = clayMat(headItemCol || '#6BAEE6', 0.56);
      const knotMat = clayMat(shadeHex(headItemCol || '#6BAEE6', -0.1).getHex(), 0.58);
      const bandR = headbandArc.radius;

      // Band sits flush on outer hair envelope
      const band = new THREE.Mesh(
        new THREE.TorusGeometry(bandR, 0.02, 10, 28, Math.PI),
        bowMat,
      );
      band.scale.set(1.01, 0.99, 1.0);
      band.position.copy(headbandArc.center);
      band.rotation.x = headbandArc.tiltX;
      accGroup.add(band);

      // Sculpted bow mounted cleanly ON TOP of the headband arch so hair never hides it
      const bowAng = 0.56;
      const archR = bandR + 0.022;
      const bowGrp = new THREE.Group();
      bowGrp.position.set(
        Math.sin(bowAng) * archR * 1.01,
        headbandArc.center.y + Math.cos(bowAng) * archR * 0.99 * Math.cos(headbandArc.tiltX),
        headbandArc.center.z - Math.cos(bowAng) * archR * Math.sin(headbandArc.tiltX) + 0.012,
      );
      bowGrp.rotation.set(headbandArc.tiltX, -0.16, -bowAng * 0.72);

      [-1, 1].forEach((side) => {
        const wing = new THREE.Mesh(new THREE.SphereGeometry(0.068, 14, 12), bowMat);
        wing.scale.set(1.25, 0.76, 0.54);
        wing.position.set(side * 0.064, 0.008, 0);
        wing.rotation.z = side * 0.24;

        const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.016, 0.056, 6, 8), bowMat);
        tail.position.set(side * 0.036, -0.048, -0.006);
        tail.rotation.z = side * 0.42;
        bowGrp.add(wing, tail);
      });
      const knot = new THREE.Mesh(new THREE.SphereGeometry(0.032, 12, 10), knotMat);
      knot.scale.set(1.05, 0.92, 0.85);
      knot.position.set(0, 0.004, 0.016);
      bowGrp.add(knot);
      accGroup.add(bowGrp);
    } else if (config.headItem === 'hair_clip') {
      const clipMat1 = clayMat(headItemCol || '#F4A261', 0.45);
      const clipMat2 = clayMat('#FDF2D6', 0.48);
      const clipGrp = new THREE.Group();
      clipGrp.position.copy(templeRight.position);
      clipGrp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), templeRight.normal);

      const barGeo = new THREE.CapsuleGeometry(0.011, 0.068, 6, 10);
      barGeo.rotateZ(Math.PI / 2);
      const bar1 = new THREE.Mesh(barGeo, clipMat1);
      bar1.position.set(0, 0.013, 0.006);
      bar1.rotation.z = 0.08;
      const bar2 = new THREE.Mesh(barGeo, clipMat2);
      bar2.position.set(0, -0.013, 0.006);
      bar2.rotation.z = -0.06;
      const gem = new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 8), clipMat2);
      gem.position.set(0.028, 0.013, 0.01);
      clipGrp.add(bar1, bar2, gem);
      accGroup.add(clipGrp);
    } else if (config.headItem === 'flower_pin') {
      const petalMat = clayMat(headItemCol || '#FFF9F0', 0.58);
      const coreMat = clayMat('#F4B942', 0.54);
      const pinGrp = new THREE.Group();
      pinGrp.position.copy(templeLeft.position);
      pinGrp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), templeLeft.normal);

      const petalGeo = new THREE.SphereGeometry(0.022, 10, 10);
      petalGeo.scale(0.85, 1.15, 0.45);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const p = new THREE.Mesh(petalGeo, petalMat);
        p.position.set(Math.cos(a) * 0.026, Math.sin(a) * 0.026, 0.005);
        p.rotation.z = a - Math.PI / 2;
        pinGrp.add(p);
      }
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 8), coreMat);
      core.scale.set(1, 1, 0.65);
      core.position.set(0, 0, 0.011);
      pinGrp.add(core);
      accGroup.add(pinGrp);
    } else if (
      config.headItem === 'frog_bucket' ||
      config.headItem === 'chick_hat' ||
      config.headItem === 'cloud_bucket'
    ) {
      const hatCol =
        headItemCol ||
        (config.headItem === 'frog_bucket'
          ? '#61A648'
          : config.headItem === 'chick_hat'
            ? '#F6CB45'
            : '#37BCE8');
      const hatMat = clayMat(hatCol, 0.68);
      const bandMat = clayMat(shadeHex(hatCol, -0.12).getHex(), 0.72);

      const bucketGrp = new THREE.Group();
      bucketGrp.position.set(
        crownTop.position.x,
        crownTop.position.y - 0.132,
        crownTop.position.z - 0.004,
      );
      bucketGrp.rotation.set(-0.08, 0, 0);

      const pts = [
        new THREE.Vector2(0.354, -0.044),
        new THREE.Vector2(0.45, -0.072),
        new THREE.Vector2(0.506, -0.098),
        new THREE.Vector2(0.498, -0.08),
        new THREE.Vector2(0.435, -0.052),
        new THREE.Vector2(0.376, -0.022),
        new THREE.Vector2(0.362, 0.055),
        new THREE.Vector2(0.324, 0.135),
        new THREE.Vector2(0.278, 0.158),
        new THREE.Vector2(0.14, 0.164),
        new THREE.Vector2(0.0, 0.162),
      ];
      const bucketGeo = new THREE.LatheGeometry(pts, 32);
      bucketGeo.scale(1.06, 1.0, 1.01);
      const bucketMesh = new THREE.Mesh(bucketGeo, hatMat);
      const band = new THREE.Mesh(
        new THREE.CylinderGeometry(0.372, 0.382, 0.032, 32),
        bandMat,
      );
      band.scale.set(1.06, 1, 1.01);
      bucketGrp.add(bucketMesh, band);

      if (config.headItem === 'frog_bucket') {
        const scleraMat = glossyClayMat('#FFFFFF', 0.18);
        const pupilMat = glossyClayMat('#1B1D24', 0.12);
        [-1, 1].forEach((side) => {
          const bump = new THREE.Mesh(new THREE.SphereGeometry(0.084, 14, 12), hatMat);
          bump.position.set(side * 0.155, 0.17, 0.115);
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.058, 12, 10), scleraMat);
          eye.position.set(side * 0.155, 0.178, 0.158);
          const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), pupilMat);
          pupil.position.set(side * 0.155, 0.18, 0.206);
          bucketGrp.add(bump, eye, pupil);
        });
      } else if (config.headItem === 'chick_hat') {
        const beakMat = glossyClayMat('#F27E24', 0.36);
        const pupilMat = glossyClayMat('#1B1D24', 0.14);
        const beak = new THREE.Mesh(new THREE.SphereGeometry(0.068, 12, 10), beakMat);
        beak.scale.set(1.32, 0.56, 1.0);
        beak.position.set(0, 0.056, 0.385);
        const tuft = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.024, 0.055, 6, 8),
          hatMat,
        );
        tuft.position.set(0, 0.185, 0.04);
        bucketGrp.add(beak, tuft);
        [-1, 1].forEach((side) => {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 8), pupilMat);
          eye.position.set(side * 0.105, 0.095, 0.352);
          const cheek = new THREE.Mesh(
            new THREE.SphereGeometry(0.028, 8, 8),
            clayMat('#F58E9A', 0.65),
          );
          cheek.scale.set(1.1, 0.72, 0.4);
          cheek.position.set(side * 0.155, 0.052, 0.335);
          bucketGrp.add(eye, cheek);
        });
      } else if (config.headItem === 'cloud_bucket') {
        const cloudMat = clayMat('#FFFFFF', 0.64);
        [
          [0, 0.072, 0.365, 0.044],
          [-0.042, 0.058, 0.356, 0.034],
          [0.042, 0.058, 0.356, 0.034],
        ].forEach(([cx, cy, cz, r]) => {
          const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), cloudMat);
          puff.scale.set(1.1, 0.9, 0.6);
          puff.position.set(cx, cy, cz);
          bucketGrp.add(puff);
        });
        const sunBadge = new THREE.Mesh(
          new THREE.SphereGeometry(0.024, 10, 8),
          clayMat('#F6C945', 0.5),
        );
        sunBadge.scale.set(1, 1, 0.6);
        sunBadge.position.set(0.026, 0.098, 0.375);
        bucketGrp.add(sunBadge);
      }

      accGroup.add(bucketGrp);
    } else if (config.headItem === 'rainbow_cap') {
      const capCol = headItemCol || '#F2B44D';
      const capMat = clayMat(capCol, 0.6);
      const darkCapMat = clayMat(shadeHex(capCol, -0.14).getHex(), 0.64);

      const capGrp = new THREE.Group();
      capGrp.position.set(
        crownTop.position.x,
        crownTop.position.y - 0.168,
        crownTop.position.z - 0.004,
      );
      capGrp.rotation.set(-0.08, 0, 0);

      const domeGeo = new THREE.SphereGeometry(1, 32, 18, 0, Math.PI * 2, 0, Math.PI * 0.56);
      domeGeo.scale(0.382, 0.252, 0.368);
      const dome = new THREE.Mesh(domeGeo, capMat);
      const visorShape = new THREE.Shape();
      visorShape.moveTo(-0.255, 0);
      visorShape.bezierCurveTo(-0.25, 0.225, -0.135, 0.335, 0, 0.345);
      visorShape.bezierCurveTo(0.135, 0.335, 0.25, 0.225, 0.255, 0);
      visorShape.quadraticCurveTo(0, 0.078, -0.255, 0);
      const visorGeo = new THREE.ExtrudeGeometry(visorShape, {
        depth: 0.018,
        bevelEnabled: true,
        bevelThickness: 0.008,
        bevelSize: 0.008,
        bevelSegments: 2,
        curveSegments: 16,
      });
      visorGeo.rotateX(Math.PI / 2 + 0.1);
      const visor = new THREE.Mesh(visorGeo, capMat);
      visor.position.set(0, 0.014, 0.272);
      const btn = new THREE.Mesh(new THREE.SphereGeometry(0.024, 12, 10), darkCapMat);
      btn.scale.set(1, 0.52, 1);
      btn.position.set(0, 0.252, 0);
      capGrp.add(dome, visor, btn);

      const rbColors = ['#F2646D', '#F6C145', '#68C27C', '#5EA8E8'];
      rbColors.forEach((rc, idx) => {
        const arc = new THREE.Mesh(
          new THREE.TorusGeometry(0.068 - idx * 0.013, 0.009, 8, 18, Math.PI),
          clayMat(rc, 0.55),
        );
        arc.position.set(0, 0.068, 0.348);
        arc.rotation.x = -0.34;
        capGrp.add(arc);
      });
      accGroup.add(capGrp);
    } else if (config.headItem === 'cc_beanie') {
      const knitCol = headItemCol || '#6E4730';
      const knitMat = clayMat(knitCol, 0.8);
      const cuffMat = clayMat(shadeHex(knitCol, -0.09).getHex(), 0.82);

      const beanieGrp = new THREE.Group();
      beanieGrp.position.set(
        crownTop.position.x,
        crownTop.position.y - 0.112,
        crownTop.position.z - 0.006,
      );
      beanieGrp.rotation.set(-0.1, 0, 0);

      const pts = [
        new THREE.Vector2(0.352, -0.076),
        new THREE.Vector2(0.388, -0.068),
        new THREE.Vector2(0.384, 0.018),
        new THREE.Vector2(0.326, 0.112),
        new THREE.Vector2(0.195, 0.168),
        new THREE.Vector2(0.0, 0.178),
      ];
      const domeGeo = new THREE.LatheGeometry(pts, 32);
      domeGeo.scale(1.06, 1.0, 1.0);
      const dome = new THREE.Mesh(domeGeo, knitMat);
      const cuffGeo = new THREE.TorusGeometry(0.368, 0.048, 12, 32);
      cuffGeo.rotateX(Math.PI / 2);
      cuffGeo.scale(1.06, 1.0, 1.0);
      const cuff = new THREE.Mesh(cuffGeo, cuffMat);
      cuff.position.y = -0.064;

      const ccTex = getCCBeanieBadgeTexture();
      const ccBadge = new THREE.Mesh(
        new RoundedBoxGeometry(0.115, 0.066, 0.018, 2, 0.008),
        new THREE.MeshStandardMaterial({
          color: '#FFFFFF',
          map: ccTex,
          roughness: 0.72,
          metalness: 0,
        }),
      );
      ccBadge.position.set(0, -0.056, 0.398);
      ccBadge.rotation.x = 0.08;
      beanieGrp.add(dome, cuff, ccBadge);
      accGroup.add(beanieGrp);
    } else if (config.headItem === 'angel_halo') {
      const haloMat = new THREE.MeshStandardMaterial({
        color: headItemCol || '#FFF3A8',
        emissive: '#FFE885',
        emissiveIntensity: 0.45,
        roughness: 0.2,
        metalness: 0.25,
      });
      const halo = new THREE.Mesh(
        new THREE.TorusGeometry(0.245, 0.022, 12, 36),
        haloMat,
      );
      halo.rotation.x = Math.PI / 2 + 0.08;
      halo.position.set(
        crownTop.position.x,
        crownTop.position.y + 0.135,
        crownTop.position.z - 0.01,
      );
      accGroup.add(halo);
    } else if (config.headItem === 'non_la') {
      // Traditional Vietnamese Conical Bamboo Hat (Nón Lá) with woven rim & red silk chin strap
      const strawMat = clayMat(headItemCol || '#EBD39D', 0.72);
      const rimMat = clayMat('#C49752', 0.74);
      const strapMat = clayMat('#E0566B', 0.55);

      const nonGroup = new THREE.Group();
      nonGroup.position.set(
        crownTop.position.x,
        crownTop.position.y - 0.085,
        crownTop.position.z - 0.006,
      );
      nonGroup.rotation.x = -0.06;

      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.54, 0.34, 32, 1, true),
        strawMat,
      );
      cone.material.side = THREE.DoubleSide;
      cone.position.y = 0.14;
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(0.54, 0.012, 8, 32),
        rimMat,
      );
      rim.rotation.x = Math.PI / 2;
      rim.position.y = -0.03;
      const ribRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.32, 0.008, 6, 28),
        rimMat,
      );
      ribRing.rotation.x = Math.PI / 2;
      ribRing.position.y = 0.11;
      const chinStrap = new THREE.Mesh(
        new THREE.TorusGeometry(0.275, 0.009, 8, 24, Math.PI),
        strapMat,
      );
      chinStrap.rotation.x = Math.PI;
      chinStrap.position.set(0, -0.045, 0.045);
      nonGroup.add(cone, rim, ribRing, chinStrap);
      accGroup.add(nonGroup);
    } else if (config.headItem === 'khan_dong') {
      // Traditional Vietnamese Layered Brocade Turban (Khăn Đóng / Khăn Xếp)
      const silkMat = clayMat(headItemCol || '#C93030', 0.52);
      const goldMat = clayMat('#F2C64E', 0.32, 0.28);

      const khanGroup = new THREE.Group();
      khanGroup.position.set(
        crownTop.position.x,
        crownTop.position.y - 0.125,
        crownTop.position.z - 0.01,
      );
      khanGroup.rotation.x = -0.12;

      for (let t = 0; t < 3; t++) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.375 - t * 0.016, 0.038, 12, 32),
          silkMat,
        );
        ring.rotation.x = Math.PI / 2;
        ring.scale.set(1.06, 1.0, 1.0);
        ring.position.y = t * 0.046;
        khanGroup.add(ring);
      }
      const frontPlate = new THREE.Mesh(
        new THREE.CylinderGeometry(0.048, 0.048, 0.022, 16),
        goldMat,
      );
      frontPlate.rotation.x = Math.PI / 2;
      frontPlate.position.set(0, 0.055, 0.39);
      const innerPlate = new THREE.Mesh(
        new THREE.CylinderGeometry(0.024, 0.024, 0.026, 12),
        silkMat,
      );
      innerPlate.rotation.x = Math.PI / 2;
      innerPlate.position.set(0, 0.055, 0.394);
      khanGroup.add(frontPlate, innerPlate);
      accGroup.add(khanGroup);
    } else if (config.headItem === 'bunny_beanie') {
      const knitMat = clayMat(headItemCol || '#F6B1C4', 0.78);
      const cuffMat = clayMat(shadeHex(headItemCol || '#F6B1C4', -0.1).getHex(), 0.8);
      const innerMat = clayMat('#FFF8FA', 0.72);
      const beanieGrp = new THREE.Group();
      beanieGrp.position.set(
        crownTop.position.x,
        crownTop.position.y - 0.112,
        crownTop.position.z - 0.006,
      );
      beanieGrp.rotation.set(-0.1, 0, 0);

      const pts = [
        new THREE.Vector2(0.352, -0.076),
        new THREE.Vector2(0.388, -0.068),
        new THREE.Vector2(0.384, 0.018),
        new THREE.Vector2(0.326, 0.112),
        new THREE.Vector2(0.195, 0.168),
        new THREE.Vector2(0.0, 0.178),
      ];
      const domeGeo = new THREE.LatheGeometry(pts, 32);
      domeGeo.scale(1.06, 1.0, 1.0);
      const dome = new THREE.Mesh(domeGeo, knitMat);
      const cuffGeo = new THREE.TorusGeometry(0.368, 0.048, 12, 32);
      cuffGeo.rotateX(Math.PI / 2);
      cuffGeo.scale(1.06, 1.0, 1.0);
      const cuff = new THREE.Mesh(cuffGeo, cuffMat);
      cuff.position.y = -0.064;
      beanieGrp.add(dome, cuff);

      [-1, 1].forEach((side) => {
        const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.046, 0.19, 8, 12), knitMat);
        ear.scale.set(1, 1, 0.56);
        ear.position.set(side * 0.145, 0.23, -0.01);
        ear.rotation.z = -side * 0.18;
        const innerEar = new THREE.Mesh(new THREE.CapsuleGeometry(0.024, 0.13, 6, 10), innerMat);
        innerEar.scale.set(1, 1, 0.45);
        innerEar.position.set(side * 0.145, 0.228, 0.015);
        innerEar.rotation.z = -side * 0.18;
        beanieGrp.add(ear, innerEar);
      });
      accGroup.add(beanieGrp);
    } else if (config.headItem === 'royal_crown') {
      const goldMat = new THREE.MeshStandardMaterial({
        color: headItemCol || '#F5C94C',
        roughness: 0.2,
        metalness: 0.68,
      });
      const rubyMat = glossyClayMat('#E63956', 0.14);
      const crownGrp = new THREE.Group();
      crownGrp.position.set(
        crownTop.position.x,
        crownTop.position.y - 0.012,
        crownTop.position.z - 0.004,
      );

      const baseBand = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.165, 0.062, 24), goldMat);
      crownGrp.add(baseBand);
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.036, 0.088, 6), goldMat);
        spike.position.set(Math.sin(ang) * 0.168, 0.065, Math.cos(ang) * 0.168);
        const gem = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), rubyMat);
        gem.position.set(Math.sin(ang) * 0.172, 0.108, Math.cos(ang) * 0.172);
        crownGrp.add(spike, gem);
      }
      accGroup.add(crownGrp);
    } else if (config.headItem === 'headphone') {
      const hpMat = glossyClayMat(headItemCol || '#87CEEB', 0.28);
      const cushionMat = clayMat('#FFF8FA', 0.68);
      const bandR = headbandArc.radius + 0.016;
      const band = new THREE.Mesh(
        new THREE.TorusGeometry(bandR, 0.024, 10, 28, Math.PI),
        hpMat,
      );
      band.scale.set(1.04, 1.0, 1.0);
      band.position.copy(headbandArc.center);
      band.rotation.x = headbandArc.tiltX;
      accGroup.add(band);

      [-1, 1].forEach((side) => {
        const cup = new THREE.Mesh(new THREE.SphereGeometry(0.115, 16, 14), hpMat);
        cup.scale.set(0.48, 1.08, 0.96);
        cup.position.set(side * (bandR * 1.02 + 0.012), headbandArc.center.y - 0.04, 0.0);
        const pad = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.028, 10, 20), cushionMat);
        pad.rotation.y = Math.PI / 2;
        pad.position.set(side * (bandR * 1.02 - 0.012), headbandArc.center.y - 0.04, 0.0);
        accGroup.add(cup, pad);
      });
    }
  }

  // ========== SCULPTED ACCESSORIES ==========
  const accCol = config.accessoryColor || '#4A3628';
  if (config.accessory === 'glasses' || config.accessory === 'sunglasses') {
    const isSun = config.accessory === 'sunglasses';
    const frameMat = glossyClayMat(accCol, 0.25);
    const lensMat = glossyClayMat('#1A1D24', 0.1);
    [-1, 1].forEach((side) => {
      const gx = side * 0.132;
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.074, 0.0095, 8, 22), frameMat);
      rim.position.set(gx, 0.25, 0.296);
      rim.rotation.y = side * 0.14;
      headPivot.add(rim);
      if (isSun) {
        const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.01, 18), lensMat);
        lens.rotation.x = Math.PI / 2;
        lens.rotation.z = -side * 0.14;
        lens.position.set(gx, 0.25, 0.292);
        headPivot.add(lens);
      }
      const pStart = new THREE.Vector3(side * 0.204, 0.254, 0.288);
      const pEnd = new THREE.Vector3(side * 0.302, 0.258, 0.015);
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
    const bridge = new THREE.Mesh(new RoundedBoxGeometry(0.068, 0.013, 0.013, 2, 0.005), frameMat);
    bridge.position.set(0, 0.256, 0.302);
    headPivot.add(bridge);
  } else if (config.accessory === 'star_glasses') {
    const frameMat = glossyClayMat(accCol || '#F3BA3D', 0.22);
    const lensMat = new THREE.MeshStandardMaterial({
      color: '#FFE787',
      roughness: 0.16,
      transparent: true,
      opacity: 0.55,
    });
    const starShape = createFivePointStarShape(0.088, 0.048);
    const starGeo = new THREE.ExtrudeGeometry(starShape, {
      depth: 0.012,
      bevelEnabled: true,
      bevelThickness: 0.004,
      bevelSize: 0.004,
      bevelSegments: 1,
    });
    [-1, 1].forEach((side) => {
      const starFrame = new THREE.Mesh(starGeo, frameMat);
      starFrame.position.set(side * 0.132, 0.246, 0.294);
      starFrame.rotation.y = side * 0.14;
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.056, 12), lensMat);
      lens.position.set(side * 0.132, 0.248, 0.3);
      lens.rotation.y = side * 0.14;
      headPivot.add(starFrame, lens);
    });
    const bridge = new THREE.Mesh(new RoundedBoxGeometry(0.068, 0.013, 0.013, 2, 0.005), frameMat);
    bridge.position.set(0, 0.256, 0.302);
    headPivot.add(bridge);
  } else if (config.accessory === 'scarf') {
    const scarfMat = clayMat(accCol, 0.78);
    const scarfLightMat = clayMat(shadeHex(accCol, 0.14).getHex(), 0.72);
    const scarfDarkMat = clayMat(shadeHex(accCol, -0.14).getHex(), 0.8);
    const scarfTrimMat = clayMat('#FFF8EE', 0.72);

    const scarfGrp = new THREE.Group();
    const isBulkyScarfFit = isOuterwear;
    const ringR = isBulkyScarfFit ? 0.194 : 0.178;
    const tubeR = isBulkyScarfFit ? 0.062 : 0.058;
    const ringY = isBulkyScarfFit ? 0.212 : 0.208;
    const frontKnotZ = isBulkyScarfFit ? 0.252 : isFittedBody ? 0.244 : 0.236;

    // 1. Lower plush knitted neck collar wrap (sits cleanly OVER all shirt/hoodie/jacket collars)
    const lowerWrap = new THREE.Mesh(
      new THREE.TorusGeometry(ringR, tubeR, 14, 32),
      scarfMat,
    );
    lowerWrap.rotation.x = Math.PI / 2 + 0.12;
    lowerWrap.scale.set(1.07, 1.02, 0.94);
    lowerWrap.position.set(0, ringY, 0.008);
    scarfGrp.add(lowerWrap);

    // 2. Upper cozy folded inner knit tier cradling under the chin cleanly
    const upperFold = new THREE.Mesh(
      new THREE.TorusGeometry(ringR - 0.02, tubeR * 0.72, 12, 28),
      scarfLightMat,
    );
    upperFold.rotation.x = Math.PI / 2 + 0.09;
    upperFold.scale.set(1.06, 1.02, 0.94);
    upperFold.position.set(0, ringY + 0.026, 0.006);
    scarfGrp.add(upperFold);

    // 3. Woven ribbed trim bands wrapping diagonally around the collar
    [-1, 1].forEach((side) => {
      const ribBand = new THREE.Mesh(
        new THREE.TorusGeometry(tubeR + 0.0025, 0.008, 8, 18),
        scarfTrimMat,
      );
      const ang = side * 0.56;
      ribBand.position.set(
        Math.sin(ang) * ringR * 1.07,
        ringY - Math.cos(ang) * ringR * 0.12,
        Math.cos(ang) * ringR * 1.02 + 0.008,
      );
      ribBand.rotation.y = ang + Math.PI / 2;
      ribBand.rotation.x = 0.22;
      scarfGrp.add(ribBand);
    });

    // 4. Plump front cross-over knit knot resting in front of collarbone
    const knotGrp = new THREE.Group();
    knotGrp.position.set(0.056, 0.168, frontKnotZ);
    knotGrp.rotation.z = -0.16;

    const knotCore = new THREE.Mesh(
      new RoundedBoxGeometry(0.114, 0.088, 0.068, 3, 0.028),
      scarfLightMat,
    );
    const knotWrap = new THREE.Mesh(
      new THREE.TorusGeometry(0.044, 0.015, 8, 18),
      scarfDarkMat,
    );
    knotWrap.rotation.y = Math.PI / 2;
    knotWrap.rotation.x = 0.25;
    knotWrap.position.set(0, 0.002, 0.008);
    knotGrp.add(knotCore, knotWrap);
    scarfGrp.add(knotGrp);

    // 5. Primary curved front cloth tail draping smoothly over chest/buttons/ties + stripes & tassels
    const mainTailGrp = new THREE.Group();
    mainTailGrp.position.set(0.062, 0.162, frontKnotZ + 0.002);
    mainTailGrp.rotation.z = 0.09;
    mainTailGrp.rotation.x = -0.05;

    const mainTailLen = 0.225;
    const mainTailMesh = new THREE.Mesh(
      createCurvedScarfTailGeometry(0.084, 0.112, mainTailLen, 0.036, 0.018),
      scarfMat,
    );
    const mainStripe = new THREE.Mesh(
      new RoundedBoxGeometry(0.108, 0.02, 0.04, 2, 0.006),
      scarfTrimMat,
    );
    mainStripe.position.set(0, -mainTailLen + 0.036, 0.013);
    mainTailGrp.add(mainTailMesh, mainStripe);

    for (let t = 0; t < 4; t++) {
      const tx = -0.038 + t * 0.025;
      const tassel = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.008, 0.032, 5, 8),
        t % 2 === 0 ? scarfDarkMat : scarfTrimMat,
      );
      tassel.position.set(tx, -mainTailLen - 0.016, 0.008);
      mainTailGrp.add(tassel);
    }
    scarfGrp.add(mainTailGrp);

    // 6. Secondary shorter layered under-tail with stripe & tassels
    const subTailGrp = new THREE.Group();
    subTailGrp.position.set(-0.006, 0.162, frontKnotZ - 0.016);
    subTailGrp.rotation.z = -0.18;
    subTailGrp.rotation.x = -0.04;

    const subTailLen = 0.175;
    const subTailMesh = new THREE.Mesh(
      createCurvedScarfTailGeometry(0.076, 0.098, subTailLen, 0.032, 0.014),
      scarfDarkMat,
    );
    const subStripe = new THREE.Mesh(
      new RoundedBoxGeometry(0.094, 0.018, 0.036, 2, 0.005),
      scarfTrimMat,
    );
    subStripe.position.set(0, -subTailLen + 0.032, 0.011);
    subTailGrp.add(subTailMesh, subStripe);

    for (let t = 0; t < 3; t++) {
      const tx = -0.026 + t * 0.026;
      const tassel = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.0075, 0.028, 5, 8),
        t === 1 ? scarfTrimMat : scarfMat,
      );
      tassel.position.set(tx, -subTailLen - 0.014, 0.007);
      subTailGrp.add(tassel);
    }
    scarfGrp.add(subTailGrp);

    torsoGroup.add(scarfGrp);
  } else if (config.accessory === 'pearl_necklace') {
    const pearlMat = glossyClayMat(accCol || '#FFFDF7', 0.15);
    for (let i = 0; i < 9; i++) {
      const ang = -1.25 + (i / 8) * 2.5;
      const bead = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 10), pearlMat);
      bead.position.set(Math.sin(ang) * 0.168, 0.185, Math.cos(ang) * 0.168);
      torsoGroup.add(bead);
    }
  } else if (config.accessory === 'pearl_ribbon_choker') {
    const ribbonMat = clayMat(accCol || '#D94B64', 0.52);
    const pearlMat = glossyClayMat('#FFFDF7', 0.16);
    const chokerRing = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.014, 8, 22), ribbonMat);
    chokerRing.rotation.x = Math.PI / 2;
    chokerRing.position.set(0, 0.215, 0);
    const pendant = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 10), pearlMat);
    pendant.position.set(0, 0.194, 0.125);
    [-1, 1].forEach((side) => {
      const wing = new THREE.Mesh(new RoundedBoxGeometry(0.044, 0.028, 0.014, 2, 0.007), ribbonMat);
      wing.position.set(side * 0.03, 0.205, 0.118);
      wing.rotation.z = side * 0.24;
      torsoGroup.add(wing);
    });
    torsoGroup.add(chokerRing, pendant);
  } else if (config.accessory === 'camera_strap') {
    const camBodyMat = clayMat(accCol || '#3B3438', 0.45);
    const silverMat = new THREE.MeshStandardMaterial({
      color: '#DDE5EE',
      roughness: 0.2,
      metalness: 0.65,
    });
    const strapMat = clayMat('#7D5236', 0.72);
    const strap = new THREE.Mesh(
      new THREE.TorusGeometry(0.228, 0.013, 8, 26),
      strapMat,
    );
    strap.position.set(0, 0.02, 0);
    strap.rotation.y = Math.PI / 2;
    strap.rotation.x = 0.58;
    const camGrp = new THREE.Group();
    camGrp.position.set(0.095, -0.055, 0.225);
    camGrp.rotation.y = 0.35;
    camGrp.rotation.z = -0.15;
    const camBox = new THREE.Mesh(new RoundedBoxGeometry(0.115, 0.072, 0.042, 2, 0.01), camBodyMat);
    const camTop = new THREE.Mesh(new RoundedBoxGeometry(0.112, 0.022, 0.04, 2, 0.006), silverMat);
    camTop.position.y = 0.032;
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.028, 0.032, 14), silverMat);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(0.01, -0.004, 0.028);
    camGrp.add(camBox, camTop, lens);
    torsoGroup.add(strap, camGrp);
  }

  let heldPetRig: PetRig | undefined;
  if (carryingPet) {
    const carryMoveType = PET_CATALOG[carryingPet.speciesId]?.moveType ?? 'walk';
    if (carryMoveType === 'fly') {
      heldPetRig = buildPetModel(carryingPet.speciesId, {
        scale: 1.08,
        sick: carryingPet.sick,
        withShadow: false,
      });
      // Orbit smoothly around the player's body in root space
      heldPetRig.root.position.set(0.72, 1.06, 0);
      heldPetRig.root.rotation.y = 0;
      root.add(heldPetRig.root);
    } else {
      heldPetRig = buildPetModel(carryingPet.speciesId, {
        scale: 1.08,
        sick: carryingPet.sick,
        withShadow: true,
      });
      // Orbit smoothly around the player on ground level in root space
      heldPetRig.root.position.set(0.85, 0, 0);
      heldPetRig.root.rotation.y = 0;
      root.add(heldPetRig.root);
    }
  }

  // Lightweight static clay Parachute assembly (hidden unless pose === 'parachute')
  const parachuteGroup = new THREE.Group();
  parachuteGroup.visible = false;
  const chuteDomeGeo = new THREE.SphereGeometry(0.92, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.52);
  const chuteCreamMat = clayMat('#FFF5E1', 0.65, 0.02);
  const chuteCoralMat = clayMat('#F26B5B', 0.55, 0.02);
  const chuteGoldMat = clayMat('#FFD166', 0.42, 0.06);
  const chuteCordMat = clayMat('#4C4038', 0.85, 0.05);

  const chuteMain = new THREE.Mesh(chuteDomeGeo, chuteCreamMat);
  chuteMain.scale.set(1.12, 0.72, 0.94);
  chuteMain.position.set(0, 2.38, -0.04);
  parachuteGroup.add(chuteMain);

  for (let w = 0; w < 4; w++) {
    const wedge = new THREE.Mesh(
      new THREE.SphereGeometry(0.926, 6, 6, (w * Math.PI) / 2, Math.PI / 4, 0, Math.PI * 0.515),
      chuteCoralMat,
    );
    wedge.scale.set(1.12, 0.72, 0.94);
    wedge.position.set(0, 2.38, -0.04);
    parachuteGroup.add(wedge);
  }

  const chuteRim = new THREE.Mesh(new THREE.TorusGeometry(0.96, 0.048, 6, 18), chuteGoldMat);
  chuteRim.rotation.x = Math.PI / 2;
  chuteRim.scale.set(1.06, 0.88, 1);
  chuteRim.position.set(0, 2.36, -0.04);
  parachuteGroup.add(chuteRim);

  const chuteTopCap = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), chuteCoralMat);
  chuteTopCap.scale.set(1.2, 0.6, 1.2);
  chuteTopCap.position.set(0, 3.04, -0.04);
  parachuteGroup.add(chuteTopCap);

  const cordEndpoints: [number, number, number, number, number, number][] = [
    [-0.88, 2.34, 0.34, -0.24, 1.56, 0.08],
    [0.88, 2.34, 0.34, 0.24, 1.56, 0.08],
    [-0.84, 2.34, -0.44, -0.22, 1.48, -0.08],
    [0.84, 2.34, -0.44, 0.22, 1.48, -0.08],
  ];
  const cordUpVec = new THREE.Vector3(0, 1, 0);
  cordEndpoints.forEach(([tx, ty, tz, bx, by, bz]) => {
    const topP = new THREE.Vector3(tx, ty, tz);
    const botP = new THREE.Vector3(bx, by, bz);
    const diff = new THREE.Vector3().subVectors(topP, botP);
    const len = diff.length();
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, len, 5), chuteCordMat);
    cord.position.addVectors(topP, botP).multiplyScalar(0.5);
    cord.quaternion.setFromUnitVectors(cordUpVec, diff.normalize());
    parachuteGroup.add(cord);
  });

  [-0.24, 0.24].forEach((sx) => {
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.14, 6), chuteGoldMat);
    grip.rotation.z = Math.PI / 2;
    grip.position.set(sx, 1.54, 0.08);
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.42, 0.24), chuteCordMat);
    strap.position.set(sx * 0.72, 0.96, 0);
    parachuteGroup.add(grip, strap);
  });
  bodyPivot.add(parachuteGroup);

  root.updateMatrixWorld(true);
  const headBounds = new THREE.Box3().setFromObject(headPivot);
  const headTopAbovePivot = Number.isFinite(headBounds.max.y)
    ? Math.max(0.28, headBounds.max.y - HEAD_PIVOT_Y)
    : 0.42;

  makeShadowed(root, true, true);
  shadowDisc.castShadow = false;
  if (heldPetRig?.shadowDisc) {
    heldPetRig.shadowDisc.castShadow = false;
  }

  return {
    root,
    bodyPivot,
    torsoGroup,
    skirtPivot,
    skirtDeformMeshes,
    aoDaiFrontPanel,
    aoDaiBackPanel,
    wingsGroup,
    leftWing,
    rightWing,
    headPivot,
    leftArm,
    rightArm,
    leftElbow,
    rightElbow,
    leftLeg,
    rightLeg,
    leftKnee,
    rightKnee,
    eyelids,
    openEyeGroup,
    closedEyeGroup,
    skipNaturalBlink:
      config.eyeStyle === 'happy_arc' ||
      config.eyeStyle === 'joy_xd' ||
      config.eyeStyle === 'wink',
    shadowDisc,
    parachuteGroup,
    holdPose,
    toolType: equippedTool,
    rodBobber: rodBobberObj,
    rodLine: rodLineObj,
    rodMidPivot,
    rodTipPivot,
    heldPetRig,
    headTopAbovePivot,
  };
}

export function updateAvatarRigAnimation(
  rig: AvatarRig,
  pose: AvatarPose,
  elapsed: number,
  isCozyEyes = false,
  poseProgress = 0,
  mountAnim?: AvatarMountAnimParams,
): void {
  const isNaturalBlink = !isCozyEyes && !rig.skipNaturalBlink && elapsed % 4.5 > 4.38;
  const eyesClosed = pose === 'sleep' || isNaturalBlink;
  if (rig.openEyeGroup && rig.closedEyeGroup) {
    rig.openEyeGroup.visible = !eyesClosed;
    rig.closedEyeGroup.visible = eyesClosed;
  }
  if (rig.eyelids.length > 0) {
    const lidClosed = pose === 'sleep' || isCozyEyes;
    rig.eyelids.forEach((lid) => {
      const baseScaleY = (lid.userData.baseScaleY as number) ?? 0.06;
      const baseY = (lid.userData.baseY as number) ?? 0.046;
      lid.scale.y = lidClosed ? 1.15 : baseScaleY;
      lid.position.y = lidClosed ? 0 : baseY;
    });
  }

  if (rig.shadowDisc) {
    rig.shadowDisc.visible = pose !== 'sit' && pose !== 'sleep' && pose !== 'parachute';
  }
  if (rig.parachuteGroup) {
    rig.parachuteGroup.visible = pose === 'parachute';
  }

  const hold = rig.holdPose || 'none';
  const isBikePose = pose === 'bike_idle' || pose === 'bike_ride';
  const isSkatePose = pose === 'skate_idle' || pose === 'skate_ride' || pose === 'skate_push';

  // Reset shared mount/sit offsets & fishing rod flex cleanly on every pose transition
  if (rig.rodMidPivot) rig.rodMidPivot.rotation.x = 0;
  if (rig.rodTipPivot) rig.rodTipPivot.rotation.x = 0;
  rig.bodyPivot.position.x = 0;
  rig.bodyPivot.position.z = 0;
  rig.bodyPivot.rotation.y = 0;
  rig.headPivot.rotation.y = 0;
  rig.leftArm.position.z = 0;
  rig.rightArm.position.z = 0;
  rig.leftArm.rotation.y = 0;
  rig.rightArm.rotation.y = 0;
  if (rig.leftElbow) {
    rig.leftElbow.rotation.y = 0;
    rig.leftElbow.rotation.z = -HAND_POSES.none.elbowZ;
  }
  if (rig.rightElbow) {
    rig.rightElbow.rotation.y = 0;
    rig.rightElbow.rotation.z = HAND_POSES[hold].elbowZ;
  }

  // Reset Ao Dai flaps cleanly before pose switch so idle/sit/bike always start clean
  if (rig.aoDaiFrontPanel) rig.aoDaiFrontPanel.rotation.x = 0;
  if (rig.aoDaiBackPanel) rig.aoDaiBackPanel.rotation.x = 0;
  // Gentle continuous flutter on angel/crystal wings
  if (rig.leftWing && rig.rightWing) {
    const isActiveFlutter = pose === 'walk' || pose === 'jump' || pose === 'parachute';
    const wingAmp = isActiveFlutter ? 0.11 : 0.045;
    const wingFreq = isActiveFlutter ? 8.2 : 2.6;
    const wingWave = Math.sin(elapsed * wingFreq) * wingAmp;
    rig.leftWing.rotation.y = -0.22 - wingWave;
    rig.rightWing.rotation.y = 0.22 + wingWave;
  }

  if (pose !== 'sit' && pose !== 'bath' && !isBikePose) {
    rig.leftLeg.position.z = 0;
    rig.rightLeg.position.z = 0;
    if (rig.skirtPivot) {
      rig.skirtPivot.rotation.x = 0;
      rig.skirtPivot.position.set(0, -0.158, 0);
      rig.skirtPivot.scale.set(1, 1, 1);
    }
    if (rig.skirtDeformMeshes) {
      for (let i = 0; i < rig.skirtDeformMeshes.length; i++) {
        const pair = rig.skirtDeformMeshes[i];
        if (pair.mesh.geometry !== pair.standGeo) {
          pair.mesh.geometry = pair.standGeo;
        }
      }
    }
  } else if (isBikePose) {
    rig.leftLeg.position.z = 0.008;
    rig.rightLeg.position.z = 0.008;
    if (rig.skirtPivot) {
      rig.skirtPivot.rotation.x = 0;
      rig.skirtPivot.position.set(0, -0.158, 0);
      rig.skirtPivot.scale.set(1, 1, 1);
    }
    if (rig.skirtDeformMeshes) {
      for (let i = 0; i < rig.skirtDeformMeshes.length; i++) {
        const pair = rig.skirtDeformMeshes[i];
        if (pair.mesh.geometry !== pair.bikeGeo) {
          pair.mesh.geometry = pair.bikeGeo;
        }
      }
    }
  }

  if (pose !== 'parachute' && !isSkatePose && !isBikePose) {
    rig.bodyPivot.rotation.z = 0;
    rig.leftArm.rotation.z =
      (rig.leftArm.userData.baseZ as number | undefined) ?? -HAND_POSES.none.armZ;
    rig.rightArm.rotation.z =
      (rig.rightArm.userData.baseZ as number | undefined) ?? HAND_POSES.none.armZ;
  }

  if (pose === 'walk') {
    const swing = Math.sin(elapsed * 12);
    rig.leftLeg.rotation.x = swing * 0.55;
    rig.rightLeg.rotation.x = -swing * 0.55;
    rig.leftLeg.rotation.z = 0;
    rig.rightLeg.rotation.z = 0;
    if (rig.leftKnee) rig.leftKnee.rotation.x = Math.max(0, -swing) * 0.5 + 0.06;
    if (rig.rightKnee) rig.rightKnee.rotation.x = Math.max(0, swing) * 0.5 + 0.06;
    if (rig.aoDaiFrontPanel) rig.aoDaiFrontPanel.rotation.x = -(0.1 + Math.abs(swing) * 0.2);
    if (rig.aoDaiBackPanel) rig.aoDaiBackPanel.rotation.x = 0.09 + Math.abs(swing) * 0.18;
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
    } else if (hold === 'carry_net') {
      rig.rightArm.rotation.x = HAND_POSES.carry_net.armX + swing * 0.05;
      if (rig.rightElbow) rig.rightElbow.rotation.x = HAND_POSES.carry_net.elbowX;
    } else {
      rig.rightArm.rotation.x = swing * 0.45;
      if (rig.rightElbow) rig.rightElbow.rotation.x = HAND_POSES.none.elbowX - 0.08 + Math.max(0, swing) * 0.15;
    }

    if (rig.torsoGroup) rig.torsoGroup.position.y = 0.77;
    rig.headPivot.position.y = HEAD_PIVOT_Y;
    rig.bodyPivot.position.y = Math.abs(Math.cos(elapsed * 12)) * 0.075;
    rig.bodyPivot.rotation.x = 0.06;
    rig.headPivot.rotation.x = 0;
    rig.headPivot.rotation.z = Math.sin(elapsed * 6) * 0.03;
  } else if (pose === 'creep') {
    // Khum nhẹ người, bước rất chậm rón rén khi kéo nhẹ joystick lúc cầm vợt
    const swing = Math.sin(elapsed * 3.1);
    rig.leftLeg.rotation.x = swing * 0.24 - 0.14;
    rig.rightLeg.rotation.x = -swing * 0.24 - 0.14;
    rig.leftLeg.rotation.z = -0.04;
    rig.rightLeg.rotation.z = 0.04;
    if (rig.leftKnee) rig.leftKnee.rotation.x = 0.42 + Math.max(0, -swing) * 0.24;
    if (rig.rightKnee) rig.rightKnee.rotation.x = 0.42 + Math.max(0, swing) * 0.24;
    if (rig.aoDaiFrontPanel) rig.aoDaiFrontPanel.rotation.x = -0.14;
    if (rig.aoDaiBackPanel) rig.aoDaiBackPanel.rotation.x = 0.12;

    rig.leftArm.rotation.x = -0.28 - swing * 0.11;
    if (rig.leftElbow) rig.leftElbow.rotation.x = -0.58;

    if (hold === 'carry_net') {
      rig.rightArm.rotation.x = HAND_POSES.carry_net.armX + 0.14;
      if (rig.rightElbow) rig.rightElbow.rotation.x = HAND_POSES.carry_net.elbowX + 0.16;
    } else {
      rig.rightArm.rotation.x = -0.28 + swing * 0.11;
      if (rig.rightElbow) rig.rightElbow.rotation.x = -0.58;
    }

    if (rig.torsoGroup) rig.torsoGroup.position.y = 0.77;
    rig.headPivot.position.y = HEAD_PIVOT_Y;
    rig.bodyPivot.position.y = -0.09 + Math.abs(Math.cos(elapsed * 3.1)) * 0.016;
    rig.bodyPivot.rotation.x = 0.27;
    rig.headPivot.rotation.x = -0.2;
    rig.headPivot.rotation.z = 0;
  } else if (pose === 'net_swing') {
    const u = THREE.MathUtils.clamp(poseProgress, 0, 1);
    let armX: number;
    let elbowX: number;
    let torsoLean: number;
    if (u < 0.28) {
      const t = u / 0.28;
      armX = THREE.MathUtils.lerp(HAND_POSES.carry_net.armX, -1.68, t);
      elbowX = THREE.MathUtils.lerp(HAND_POSES.carry_net.elbowX, -0.55, t);
      torsoLean = THREE.MathUtils.lerp(0.05, -0.12, t);
    } else if (u < 0.66) {
      const t = Math.sin(((u - 0.28) / 0.38) * (Math.PI * 0.5));
      armX = THREE.MathUtils.lerp(-1.68, 0.24, t);
      elbowX = THREE.MathUtils.lerp(-0.55, -0.16, t);
      torsoLean = THREE.MathUtils.lerp(-0.12, 0.24, t);
    } else {
      const t = (u - 0.66) / 0.34;
      armX = THREE.MathUtils.lerp(0.24, HAND_POSES.carry_net.armX, t);
      elbowX = THREE.MathUtils.lerp(-0.16, HAND_POSES.carry_net.elbowX, t);
      torsoLean = THREE.MathUtils.lerp(0.24, 0.04, t);
    }
    rig.leftLeg.rotation.x = -0.12;
    rig.rightLeg.rotation.x = 0.14;
    rig.leftLeg.rotation.z = 0;
    rig.rightLeg.rotation.z = 0;
    if (rig.leftKnee) rig.leftKnee.rotation.x = 0.16;
    if (rig.rightKnee) rig.rightKnee.rotation.x = 0.12;
    rig.leftArm.rotation.x = -0.22;
    if (rig.leftElbow) rig.leftElbow.rotation.x = -0.34;
    rig.rightArm.rotation.x = armX;
    if (rig.rightElbow) rig.rightElbow.rotation.x = elbowX;
    if (rig.torsoGroup) rig.torsoGroup.position.y = 0.77;
    rig.headPivot.position.y = HEAD_PIVOT_Y;
    rig.bodyPivot.position.y = -0.02;
    rig.bodyPivot.rotation.x = torsoLean;
    rig.headPivot.rotation.x = -torsoLean * 0.45;
    rig.headPivot.rotation.z = 0;
  } else if (pose === 'jump') {
    rig.leftLeg.rotation.x = -0.34;
    rig.rightLeg.rotation.x = 0.24;
    rig.leftLeg.rotation.z = -0.05;
    rig.rightLeg.rotation.z = 0.05;
    if (rig.leftKnee) rig.leftKnee.rotation.x = 0.62;
    if (rig.rightKnee) rig.rightKnee.rotation.x = 0.42;
    if (rig.aoDaiFrontPanel) rig.aoDaiFrontPanel.rotation.x = -0.22;
    if (rig.aoDaiBackPanel) rig.aoDaiBackPanel.rotation.x = 0.2;

    rig.leftArm.rotation.x = -0.58;
    if (rig.leftElbow) rig.leftElbow.rotation.x = -0.42;
    if (hold === 'carry_umbrella') {
      rig.rightArm.rotation.x = HAND_POSES.carry_umbrella.armX - 0.08;
      if (rig.rightElbow) rig.rightElbow.rotation.x = HAND_POSES.carry_umbrella.elbowX;
    } else if (hold === 'carry_front') {
      rig.rightArm.rotation.x = HAND_POSES.carry_front.armX - 0.12;
      if (rig.rightElbow) rig.rightElbow.rotation.x = HAND_POSES.carry_front.elbowX;
    } else if (hold === 'carry_bag') {
      rig.rightArm.rotation.x = HAND_POSES.carry_bag.armX - 0.15;
      if (rig.rightElbow) rig.rightElbow.rotation.x = HAND_POSES.carry_bag.elbowX;
    } else if (hold === 'carry_net') {
      rig.rightArm.rotation.x = HAND_POSES.carry_net.armX - 0.06;
      if (rig.rightElbow) rig.rightElbow.rotation.x = HAND_POSES.carry_net.elbowX;
    } else {
      rig.rightArm.rotation.x = -0.58;
      if (rig.rightElbow) rig.rightElbow.rotation.x = -0.42;
    }

    if (rig.torsoGroup) rig.torsoGroup.position.y = 0.77;
    rig.headPivot.position.y = HEAD_PIVOT_Y;
    rig.bodyPivot.position.y = 0.03;
    rig.bodyPivot.rotation.x = -0.06;
    rig.headPivot.rotation.x = -0.04;
    rig.headPivot.rotation.z = 0;
  } else if (pose === 'fish_cast') {
    const u = THREE.MathUtils.clamp(poseProgress, 0, 1);
    // Smooth two-beat cast: wind up back (0..0.38) then brisk forward throw (0.38..1)
    let armX: number;
    let elbowX: number;
    let torsoLean: number;
    if (u < 0.38) {
      const t = u / 0.38;
      armX = THREE.MathUtils.lerp(-0.42, -1.25, t);
      elbowX = THREE.MathUtils.lerp(-0.98, -0.52, t);
      torsoLean = THREE.MathUtils.lerp(0, -0.1, t);
    } else {
      const t = Math.sin(((u - 0.38) / 0.62) * (Math.PI * 0.5));
      armX = THREE.MathUtils.lerp(-1.25, -0.18, t);
      elbowX = THREE.MathUtils.lerp(-0.52, -0.45, t);
      torsoLean = THREE.MathUtils.lerp(-0.1, 0.12, t);
    }
    rig.leftLeg.rotation.x = -0.08;
    rig.rightLeg.rotation.x = 0.08;
    rig.leftLeg.rotation.z = 0;
    rig.rightLeg.rotation.z = 0;
    if (rig.leftKnee) rig.leftKnee.rotation.x = 0.08;
    if (rig.rightKnee) rig.rightKnee.rotation.x = 0.05;
    rig.leftArm.rotation.x = -0.12;
    if (rig.leftElbow) rig.leftElbow.rotation.x = -0.25;
    rig.rightArm.rotation.x = armX;
    if (rig.rightElbow) rig.rightElbow.rotation.x = elbowX;
    if (rig.torsoGroup) rig.torsoGroup.position.y = 0.77;
    rig.headPivot.position.y = HEAD_PIVOT_Y;
    rig.bodyPivot.position.y = 0;
    rig.bodyPivot.rotation.x = torsoLean;
    rig.headPivot.rotation.x = 0;
    rig.headPivot.rotation.z = 0;
  } else if (pose === 'fish_wait') {
    const breathe = Math.sin(elapsed * 2.2) * 0.018;
    rig.leftLeg.rotation.x = 0;
    rig.rightLeg.rotation.x = 0;
    rig.leftLeg.rotation.z = 0;
    rig.rightLeg.rotation.z = 0;
    if (rig.leftKnee) rig.leftKnee.rotation.x = 0;
    if (rig.rightKnee) rig.rightKnee.rotation.x = 0;
    rig.leftArm.rotation.x = 0.04;
    if (rig.leftElbow) rig.leftElbow.rotation.x = -0.18;
    rig.rightArm.rotation.x = HAND_POSES.carry_front.armX - 0.06 + breathe;
    if (rig.rightElbow) rig.rightElbow.rotation.x = HAND_POSES.carry_front.elbowX + 0.18;
    if (rig.torsoGroup) rig.torsoGroup.position.y = 0.77;
    rig.headPivot.position.y = HEAD_PIVOT_Y;
    rig.bodyPivot.position.y = 0;
    rig.bodyPivot.rotation.x = 0.03;
    rig.headPivot.rotation.x = 0;
    rig.headPivot.rotation.z = 0;
  } else if (pose === 'fish_pull') {
    const u = THREE.MathUtils.clamp(poseProgress, 0, 1);
    const tug = 0.5 + 0.5 * Math.sin(elapsed * 9.5);
    const snap = Math.max(0.72, Math.sin(Math.min(1, u * 1.35) * Math.PI * 0.5));
    const pullStrength = snap * (0.76 + 0.24 * tug);
    rig.leftLeg.rotation.x = -0.22 * snap;
    rig.rightLeg.rotation.x = 0.24 * snap;
    rig.leftLeg.rotation.z = -0.05;
    rig.rightLeg.rotation.z = 0.05;
    if (rig.leftKnee) rig.leftKnee.rotation.x = 0.28 * snap;
    if (rig.rightKnee) rig.rightKnee.rotation.x = 0.24 * snap;
    rig.leftArm.rotation.x = -0.58 - 0.16 * tug;
    if (rig.leftElbow) rig.leftElbow.rotation.x = -0.66;
    rig.rightArm.rotation.x = THREE.MathUtils.lerp(-0.62, -1.24, pullStrength);
    if (rig.rightElbow) rig.rightElbow.rotation.x = THREE.MathUtils.lerp(-0.82, -0.56, pullStrength);
    if (rig.torsoGroup) rig.torsoGroup.position.y = 0.77;
    rig.headPivot.position.y = HEAD_PIVOT_Y;
    rig.bodyPivot.position.y = -0.025 * snap + Math.sin(elapsed * 11) * 0.01;
    rig.bodyPivot.rotation.x = -0.22 * snap - 0.11 * tug;
    rig.headPivot.rotation.x = 0.12 * snap;
    rig.headPivot.rotation.z = Math.sin(elapsed * 6.5) * 0.035;
    // Universal downward bend on ANY fishing rod under struggle tension
    const rodBend = (0.82 + 0.22 * Math.sin(elapsed * 12.5)) * snap;
    if (rig.rodMidPivot) rig.rodMidPivot.rotation.x = 0.36 * rodBend;
    if (rig.rodTipPivot) rig.rodTipPivot.rotation.x = 0.68 * rodBend;
  } else if (pose === 'sit') {
    const sitBreath = Math.sin(elapsed * 1.9);
    const breath01 = 0.5 + 0.5 * sitBreath;

    // Unified natural sitting posture across all skirts, shorts, and trousers:
    // keep hip spheres docked cleanly inside pelvis bridge (z = 0.008) so no staircase lip forms at waist
    rig.leftLeg.position.z = 0.008;
    rig.rightLeg.position.z = 0.008;
    rig.leftLeg.rotation.x = -1.38;
    rig.rightLeg.rotation.x = -1.38;
    rig.leftLeg.rotation.z = -0.02;
    rig.rightLeg.rotation.z = 0.02;
    if (rig.leftKnee) rig.leftKnee.rotation.x = 1.32;
    if (rig.rightKnee) rig.rightKnee.rotation.x = 1.32;

    if (rig.skirtPivot) {
      rig.skirtPivot.rotation.x = 0;
      rig.skirtPivot.position.set(0, -0.158, 0);
      rig.skirtPivot.scale.set(1, 1, 1);
    }
    if (rig.skirtDeformMeshes) {
      for (let i = 0; i < rig.skirtDeformMeshes.length; i++) {
        const pair = rig.skirtDeformMeshes[i];
        if (pair.mesh.geometry !== pair.sitGeo) {
          pair.mesh.geometry = pair.sitGeo;
        }
      }
    }

    rig.leftArm.rotation.x = -0.44 + sitBreath * 0.015;
    if (rig.leftElbow) rig.leftElbow.rotation.x = -0.62;

    if (hold === 'carry_umbrella') {
      rig.rightArm.rotation.x = HAND_POSES.carry_umbrella.armX + sitBreath * 0.012;
      if (rig.rightElbow) rig.rightElbow.rotation.x = HAND_POSES.carry_umbrella.elbowX;
    } else if (hold === 'carry_front') {
      rig.rightArm.rotation.x = HAND_POSES.carry_front.armX + sitBreath * 0.012;
      if (rig.rightElbow) rig.rightElbow.rotation.x = HAND_POSES.carry_front.elbowX;
    } else if (hold === 'carry_bag') {
      rig.rightArm.rotation.x = HAND_POSES.carry_bag.armX + sitBreath * 0.012;
      if (rig.rightElbow) rig.rightElbow.rotation.x = HAND_POSES.carry_bag.elbowX;
    } else if (hold === 'carry_net') {
      rig.rightArm.rotation.x = HAND_POSES.carry_net.armX + sitBreath * 0.01;
      if (rig.rightElbow) rig.rightElbow.rotation.x = HAND_POSES.carry_net.elbowX;
    } else {
      rig.rightArm.rotation.x = -0.44 + sitBreath * 0.015;
      if (rig.rightElbow) rig.rightElbow.rotation.x = -0.62;
    }

    if (rig.torsoGroup) rig.torsoGroup.position.y = 0.77 + breath01 * 0.008;
    rig.headPivot.position.y = HEAD_PIVOT_Y + breath01 * 0.01;
    rig.bodyPivot.position.y = -0.152;
    rig.bodyPivot.rotation.x = 0.02 + sitBreath * 0.008;
    rig.headPivot.rotation.x = Math.sin(elapsed * 1.9 - 0.5) * 0.015;
    rig.headPivot.rotation.z = Math.sin(elapsed * 0.85) * 0.01;
  } else if (pose === 'bath') {
    const bathBreath = Math.sin(elapsed * 1.65);
    const breath01 = 0.5 + 0.5 * bathBreath;

    rig.leftLeg.position.z = 0.008;
    rig.rightLeg.position.z = 0.008;
    rig.leftLeg.rotation.x = -1.46;
    rig.rightLeg.rotation.x = -1.46;
    rig.leftLeg.rotation.z = -0.02;
    rig.rightLeg.rotation.z = 0.02;
    if (rig.leftKnee) rig.leftKnee.rotation.x = 0.08;
    if (rig.rightKnee) rig.rightKnee.rotation.x = 0.08;

    if (rig.skirtPivot) {
      rig.skirtPivot.rotation.x = 0;
      rig.skirtPivot.position.set(0, -0.158, 0);
      rig.skirtPivot.scale.set(1, 1, 1);
    }
    if (rig.skirtDeformMeshes) {
      for (let i = 0; i < rig.skirtDeformMeshes.length; i++) {
        const pair = rig.skirtDeformMeshes[i];
        if (pair.mesh.geometry !== pair.sitGeo) {
          pair.mesh.geometry = pair.sitGeo;
        }
      }
    }

    rig.leftArm.rotation.x = -0.3 + bathBreath * 0.03;
    rig.rightArm.rotation.x = -0.3 - bathBreath * 0.03;
    if (rig.leftElbow) rig.leftElbow.rotation.x = -0.38;
    if (rig.rightElbow) rig.rightElbow.rotation.x = -0.38;

    if (rig.torsoGroup) rig.torsoGroup.position.y = 0.77 + breath01 * 0.01;
    rig.headPivot.position.y = HEAD_PIVOT_Y + breath01 * 0.012;
    rig.bodyPivot.position.y = -0.245;
    rig.bodyPivot.rotation.x = -0.04 + bathBreath * 0.01;
    rig.headPivot.rotation.x = Math.sin(elapsed * 1.65 - 0.4) * 0.018;
    rig.headPivot.rotation.z = Math.sin(elapsed * 0.75) * 0.012;
  } else if (pose === 'sleep') {
    rig.leftLeg.rotation.x = 0;
    rig.rightLeg.rotation.x = 0;
    rig.leftLeg.rotation.z = 0;
    rig.rightLeg.rotation.z = 0;
    if (rig.leftKnee) rig.leftKnee.rotation.x = 0;
    if (rig.rightKnee) rig.rightKnee.rotation.x = 0;
    rig.leftArm.rotation.x = 0;
    rig.rightArm.rotation.x = 0;
    if (rig.leftElbow) rig.leftElbow.rotation.x = -0.08;
    if (rig.rightElbow) rig.rightElbow.rotation.x = -0.08;
    if (rig.torsoGroup) rig.torsoGroup.position.y = 0.77;
    rig.headPivot.position.y = HEAD_PIVOT_Y;
    rig.bodyPivot.position.y = 0.88;
    rig.bodyPivot.rotation.x = -Math.PI / 2;
    rig.headPivot.rotation.x = 0;
    rig.headPivot.rotation.z = 0;
  } else if (pose === 'play_pet') {
    const wave = Math.sin(elapsed * 11);
    const waveOpp = Math.sin(elapsed * 11 + Math.PI * 0.85);
    rig.leftLeg.rotation.x = -0.1;
    rig.rightLeg.rotation.x = 0.08;
    rig.leftLeg.rotation.z = 0;
    rig.rightLeg.rotation.z = 0;
    if (rig.leftKnee) rig.leftKnee.rotation.x = 0.16;
    if (rig.rightKnee) rig.rightKnee.rotation.x = 0.14;

    rig.leftArm.rotation.x = -0.84 + wave * 0.24;
    rig.rightArm.rotation.x = -0.84 + waveOpp * 0.24;
    if (rig.leftElbow) rig.leftElbow.rotation.x = -0.58 + Math.cos(elapsed * 11) * 0.26;
    if (rig.rightElbow) rig.rightElbow.rotation.x = -0.58 - Math.cos(elapsed * 11) * 0.26;

    if (rig.torsoGroup) rig.torsoGroup.position.y = 0.77;
    rig.headPivot.position.y = HEAD_PIVOT_Y;
    rig.bodyPivot.position.y = -0.025 + Math.abs(Math.sin(elapsed * 5.5)) * 0.014;
    rig.bodyPivot.rotation.x = 0.16;
    rig.headPivot.rotation.x = 0.12 + Math.sin(elapsed * 5.5) * 0.035;
    rig.headPivot.rotation.z = Math.sin(elapsed * 3.5) * 0.045;
  } else if (pose === 'parachute') {
    const sway = Math.sin(elapsed * 1.9) * 0.055;
    rig.bodyPivot.rotation.z = sway;
    rig.bodyPivot.rotation.x = 0.08;
    rig.bodyPivot.position.y = 0;
    rig.leftArm.rotation.set(-2.28, 0, 0.18);
    rig.rightArm.rotation.set(-2.28, 0, -0.18);
    if (rig.leftElbow) rig.leftElbow.rotation.x = -0.48;
    if (rig.rightElbow) rig.rightElbow.rotation.x = -0.48;
    rig.leftLeg.rotation.set(0.16 + Math.sin(elapsed * 2.4) * 0.08, 0, -0.04);
    rig.rightLeg.rotation.set(-0.12 - Math.sin(elapsed * 2.4) * 0.08, 0, 0.04);
    if (rig.leftKnee) rig.leftKnee.rotation.x = 0.28;
    if (rig.rightKnee) rig.rightKnee.rotation.x = 0.34;
    if (rig.torsoGroup) rig.torsoGroup.position.y = 0.77;
    rig.headPivot.position.y = HEAD_PIVOT_Y;
    rig.headPivot.rotation.set(0.08, 0, -sway * 0.4);
  } else if (pose === 'skate_idle') {
    // Cool standing stance beside upright forward-facing skateboard: left hand rests lightly on top nose!
    const breath = Math.sin(elapsed * 2.1);

    rig.bodyPivot.position.set(0.06, -0.002 + breath * 0.004, -0.02);
    rig.bodyPivot.rotation.set(0.02, -0.24, 0);
    if (rig.torsoGroup) rig.torsoGroup.position.y = 0.77;
    rig.headPivot.position.y = HEAD_PIVOT_Y;
    rig.headPivot.rotation.set(0.02 + breath * 0.015, 0.22, -0.02);

    // Left hand (-X side) rests behind/atop the upright skateboard rim with zero cuff/palm poking through front face
    rig.leftArm.rotation.set(-1.16, 0, -0.2);
    if (rig.leftElbow) rig.leftElbow.rotation.set(-0.34, 0, 0.05);

    rig.rightArm.rotation.set(0.18, 0, 0.36);
    if (rig.rightElbow) rig.rightElbow.rotation.set(-0.9, 0, -0.05);

    rig.leftLeg.rotation.set(-0.08, 0, -0.04);
    if (rig.leftKnee) rig.leftKnee.rotation.x = 0.1;
    rig.rightLeg.rotation.set(0.06, 0, 0.05);
    if (rig.rightKnee) rig.rightKnee.rotation.x = 0.04;
  } else if (pose === 'skate_ride' || pose === 'skate_push') {
    const pushPhase = pose === 'skate_push' ? THREE.MathUtils.clamp(mountAnim?.pushPhase ?? 0, 0, 1) : 0;
    const isPushing = pose === 'skate_push' && pushPhase > 0.001;
    const carveSway = Math.sin(elapsed * 4.2) * 0.04;
    // Smooth curve: 0..0.24 crouch & drop push foot beside deck, 0.24..0.72 kick backward (-Z), 0.72..1 lift back onto deck
    let pushSwing = 0;
    let pushDrop = 0;
    if (isPushing) {
      if (pushPhase < 0.24) {
        const t = pushPhase / 0.24;
        pushDrop = Math.sin(t * (Math.PI * 0.5));
        pushSwing = THREE.MathUtils.lerp(0, 0.45, t);
      } else if (pushPhase < 0.72) {
        const t = (pushPhase - 0.24) / 0.48;
        pushDrop = 1 - Math.max(0, (t - 0.8) / 0.2) * 0.35;
        pushSwing = THREE.MathUtils.lerp(0.45, -0.52, Math.sin(t * (Math.PI * 0.5)));
      } else {
        const t = (pushPhase - 0.72) / 0.28;
        pushDrop = THREE.MathUtils.lerp(0.65, 0, t);
        pushSwing = THREE.MathUtils.lerp(-0.52, 0, t);
      }
    }

    const crouchBounce = Math.sin(elapsed * 6.4) * 0.006;
    const bodyY = THREE.MathUtils.lerp(0.104, 0.042, pushDrop) + crouchBounce;
    rig.bodyPivot.position.set(0, bodyY, 0);
    rig.bodyPivot.rotation.set(0.015 + pushDrop * 0.035, -1.36, carveSway);
    if (rig.torsoGroup) rig.torsoGroup.position.y = 0.77;
    rig.headPivot.position.y = HEAD_PIVOT_Y;
    rig.headPivot.rotation.set(-0.03, 1.24, -carveSway * 0.6);

    // Front (+Z world) foot stays planted flush on deck; during push, knee bends deeper as body lowers
    rig.rightLeg.rotation.set(
      THREE.MathUtils.lerp(-0.32, -0.82, pushDrop),
      0,
      THREE.MathUtils.lerp(0.16, 0.24, pushDrop),
    );
    if (rig.rightKnee) {
      rig.rightKnee.rotation.x = THREE.MathUtils.lerp(0.62, 1.26, pushDrop);
    }

    if (isPushing) {
      // With rotY = -1.36, -rotation.x steps foot off deck onto -X side; +rotation.z sweeps leg backward along -Z travel!
      rig.leftLeg.rotation.set(
        THREE.MathUtils.lerp(-0.32, -0.28, pushDrop),
        0,
        THREE.MathUtils.lerp(-0.16, -0.04 + pushSwing * 0.65, pushDrop),
      );
      if (rig.leftKnee) {
        rig.leftKnee.rotation.x = THREE.MathUtils.lerp(
          0.62,
          0.04 + Math.max(0, -pushSwing) * 0.16,
          pushDrop,
        );
      }
    } else {
      rig.leftLeg.rotation.set(-0.32, 0, -0.16);
      if (rig.leftKnee) rig.leftKnee.rotation.x = 0.62;
    }

    const armPump = isPushing ? pushSwing * 0.44 : Math.sin(elapsed * 4.2) * 0.08;
    rig.leftArm.rotation.set(-0.18 - armPump, 0, -0.58 - carveSway * 0.8);
    rig.rightArm.rotation.set(-0.28 + armPump, 0, 0.55 - carveSway * 0.8);
    if (rig.leftElbow) rig.leftElbow.rotation.set(-0.4, 0, 0.1);
    if (rig.rightElbow) rig.rightElbow.rotation.set(-0.38, 0, -0.1);
  } else if (pose === 'bike_idle' || pose === 'bike_ride') {
    const crankAngle = mountAnim?.crankAngle ?? 0.35;
    const steerAngle = mountAnim?.steerAngle ?? 0;
    const idleBlend = THREE.MathUtils.clamp(
      mountAnim?.idleBlend ?? (pose === 'bike_idle' ? 1 : 0),
      0,
      1,
    );

    const bodyPitch = 0.19;
    const bodyY = 0.19;
    const bodyZ = -0.21;
    const rollZ = steerAngle * 0.14 * (1 - idleBlend);
    const breath = idleBlend > 0.01 ? Math.sin(elapsed * 2.0) * 0.004 * idleBlend : 0;

    rig.bodyPivot.position.set(0, bodyY + breath, bodyZ);
    rig.bodyPivot.rotation.set(bodyPitch, 0, rollZ);
    if (rig.torsoGroup) rig.torsoGroup.position.y = 0.77;
    rig.headPivot.position.y = HEAD_PIVOT_Y;
    rig.headPivot.rotation.set(-bodyPitch * 0.75 + breath * 1.5, steerAngle * 0.34, -rollZ * 0.45);

    // Hands smoothly grip enlarged cruiser leather handlebar sleeves cleanly
    rig.leftArm.rotation.set(-0.84 + steerAngle * 0.22, 0, -0.04);
    rig.rightArm.rotation.set(-0.84 - steerAngle * 0.22, 0, 0.04);
    if (rig.leftElbow) rig.leftElbow.rotation.set(-0.42, 0, 0.05);
    if (rig.rightElbow) rig.rightElbow.rotation.set(-0.42, 0, -0.05);

    // 2-bone IK from hip to exact pedal coordinates (CRANK_Y = 0.28, CRANK_Z = -0.01, CRANK_R = 0.075)
    const L1 = 0.215;
    const L2 = 0.286;
    const hipY = bodyY + breath + 0.52 * Math.cos(bodyPitch);
    const hipZ = bodyZ + 0.52 * Math.sin(bodyPitch) + 0.008 * Math.cos(bodyPitch);
    const solvePedalLeg = (
      legGroup: THREE.Group,
      kneeGroup: THREE.Group | undefined,
      targetY: number,
      targetZ: number,
      splayZ: number,
    ) => {
      const dy = targetY + 0.01 - hipY;
      const dz = targetZ - 0.036 - hipZ;
      const d = THREE.MathUtils.clamp(Math.hypot(dy, dz), 0.14, L1 + L2 - 0.008);
      const phiTarget = Math.atan2(dz, -dy);
      const cosA = THREE.MathUtils.clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -0.985, 0.985);
      const phiThigh = phiTarget + Math.acos(cosA);
      const cosB = THREE.MathUtils.clamp((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2), -0.985, 0.985);
      const kneeFlex = Math.PI - Math.acos(cosB);
      legGroup.rotation.set(-(phiThigh + bodyPitch), 0, splayZ);
      if (kneeGroup) kneeGroup.rotation.x = kneeFlex;
    };

    const CRANK_Y = 0.28;
    const CRANK_Z = -0.01;
    const CRANK_R = 0.075;
    const p1Y = CRANK_Y + CRANK_R * Math.cos(crankAngle);
    const p1Z = CRANK_Z + CRANK_R * Math.sin(crankAngle);
    const p2Y = CRANK_Y - CRANK_R * Math.cos(crankAngle);
    const p2Z = CRANK_Z - CRANK_R * Math.sin(crankAngle);

    // Keep both feet comfortably seated on their pedals in both ride and kickstand-parked idle!
    solvePedalLeg(rig.rightLeg, rig.rightKnee, p1Y, p1Z, 0.04);
    solvePedalLeg(rig.leftLeg, rig.leftKnee, p2Y, p2Z, -0.04);
  } else if (pose === 'swim') {
    const treadBlend = THREE.MathUtils.clamp(mountAnim?.idleBlend ?? 0, 0, 1);
    const stroke = elapsed * 4.2;
    const kick = Math.sin(elapsed * 8.2);
    const treadCycle = elapsed * 2.5;
    const bob = Math.sin(elapsed * 2.6) * (0.032 - treadBlend * 0.008);

    // Blend cleanly between streamlined active swimming and upright stationary treading water
    const pitch = THREE.MathUtils.lerp(
      1.02 + Math.sin(elapsed * 2.4) * 0.035,
      0.46 + Math.sin(treadCycle * 0.8) * 0.025,
      treadBlend,
    );
    const bodyY = THREE.MathUtils.lerp(0.5, 0.22, treadBlend) + bob;
    const roll = Math.sin(stroke) * 0.08 * (1 - treadBlend);

    rig.bodyPivot.position.set(0, bodyY, 0);
    rig.bodyPivot.rotation.set(pitch, 0, roll);
    if (rig.torsoGroup) rig.torsoGroup.position.y = 0.77;
    rig.headPivot.position.y = HEAD_PIVOT_Y;
    rig.headPivot.rotation.set(
      THREE.MathUtils.lerp(-0.82, -0.36, treadBlend) + Math.sin(elapsed * 2.2) * 0.03,
      Math.sin(stroke * 0.5) * 0.07 * (1 - treadBlend * 0.6),
      0,
    );

    // Smooth breaststroke paddling when moving, calm lateral sculling when treading water
    const sweep = Math.sin(stroke);
    const sweepCos = Math.cos(stroke);
    const scull = Math.sin(treadCycle);
    const scullCos = Math.cos(treadCycle);
    const activeArmX = -1.25 + sweepCos * 0.48;
    const activeArmZ = 0.4 + sweep * 0.44;
    const treadArmX = -0.58 + scullCos * 0.16;
    const treadArmZ = 0.58 + scull * 0.26;

    rig.leftArm.rotation.set(
      THREE.MathUtils.lerp(activeArmX, treadArmX, treadBlend),
      0,
      THREE.MathUtils.lerp(-activeArmZ, -treadArmZ, treadBlend),
    );
    rig.rightArm.rotation.set(
      THREE.MathUtils.lerp(activeArmX, treadArmX, treadBlend),
      0,
      THREE.MathUtils.lerp(activeArmZ, treadArmZ, treadBlend),
    );
    const elbowBend = THREE.MathUtils.lerp(-0.46, -0.68, treadBlend);
    if (rig.leftElbow) rig.leftElbow.rotation.set(elbowBend, 0, 0.14);
    if (rig.rightElbow) rig.rightElbow.rotation.set(elbowBend, 0, -0.14);

    // Flutter kick while swimming -> slow relaxed treading kick while stationary
    const treadKick = Math.sin(treadCycle * 1.35);
    const legSwing = THREE.MathUtils.lerp(kick * 0.34, treadKick * 0.2, treadBlend);
    const legBase = THREE.MathUtils.lerp(0.18, -0.12, treadBlend);
    rig.leftLeg.rotation.set(legBase + legSwing, 0, -0.06);
    rig.rightLeg.rotation.set(legBase - legSwing, 0, 0.06);
    if (rig.leftKnee) {
      rig.leftKnee.rotation.x = THREE.MathUtils.lerp(
        Math.max(0.06, -kick * 0.24),
        Math.max(0.18, 0.36 - treadKick * 0.22),
        treadBlend,
      );
    }
    if (rig.rightKnee) {
      rig.rightKnee.rotation.x = THREE.MathUtils.lerp(
        Math.max(0.06, kick * 0.24),
        Math.max(0.18, 0.36 + treadKick * 0.22),
        treadBlend,
      );
    }
  } else if (pose === 'climb') {
    const cycle = elapsed * 8.2;
    const reach = Math.sin(cycle);
    const step = Math.sin(cycle + Math.PI * 0.15);

    rig.leftLeg.position.z = 0;
    rig.rightLeg.position.z = 0;
    rig.bodyPivot.position.set(0, Math.abs(reach) * 0.015, 0);
    rig.bodyPivot.rotation.set(0.05, 0, reach * 0.04);
    if (rig.torsoGroup) rig.torsoGroup.position.y = 0.77;
    rig.headPivot.position.y = HEAD_PIVOT_Y;
    rig.headPivot.rotation.set(-0.22, Math.sin(cycle * 0.5) * 0.05, -reach * 0.035);

    // Alternating hand-over-hand forward-upward reach onto rope ladder rungs cleanly in front of torso
    rig.leftArm.rotation.set(-2.06 + reach * 0.48, 0, 0.16);
    rig.rightArm.rotation.set(-2.06 - reach * 0.48, 0, -0.16);
    if (rig.leftElbow) rig.leftElbow.rotation.set(-0.56 - reach * 0.28, 0, 0);
    if (rig.rightElbow) rig.rightElbow.rotation.set(-0.56 + reach * 0.28, 0, 0);

    // Alternating knee-lift rung stepping cleanly outside ladder
    rig.leftLeg.rotation.set(-0.28 + step * 0.34, 0, -0.04);
    rig.rightLeg.rotation.set(-0.28 - step * 0.34, 0, 0.04);
    if (rig.leftKnee) rig.leftKnee.rotation.x = Math.max(0.16, 0.68 - step * 0.42);
    if (rig.rightKnee) rig.rightKnee.rotation.x = Math.max(0.16, 0.68 + step * 0.42);
  } else {
    // Gentle breathing Idle: subtle body bob & soft breathing rhythm
    const breathPhase = elapsed * 2.15;
    const breath = Math.sin(breathPhase);
    const breath01 = 0.5 + 0.5 * breath;

    rig.leftLeg.rotation.x = 0;
    rig.rightLeg.rotation.x = 0;
    rig.leftLeg.rotation.z = 0;
    rig.rightLeg.rotation.z = 0;
    if (rig.leftKnee) rig.leftKnee.rotation.x = 0;
    if (rig.rightKnee) rig.rightKnee.rotation.x = 0;
    rig.bodyPivot.position.y = breath01 * 0.016;
    rig.bodyPivot.rotation.x = breath * 0.012;

    if (rig.torsoGroup) rig.torsoGroup.position.y = 0.77 + breath01 * 0.014;
    rig.headPivot.position.y = HEAD_PIVOT_Y + breath01 * 0.018;
    rig.headPivot.rotation.x = Math.sin(breathPhase - 0.5) * 0.024;
    rig.headPivot.rotation.z = Math.sin(elapsed * 0.95) * 0.016;

    rig.leftArm.rotation.x = Math.sin(breathPhase - 0.3) * 0.024;
    if (rig.leftElbow) rig.leftElbow.rotation.x = HAND_POSES.none.elbowX - breath01 * 0.03;

    if (hold === 'carry_umbrella') {
      rig.rightArm.rotation.x = HAND_POSES.carry_umbrella.armX + breath * 0.014;
      if (rig.rightElbow) rig.rightElbow.rotation.x = HAND_POSES.carry_umbrella.elbowX;
    } else if (hold === 'carry_front') {
      rig.rightArm.rotation.x = HAND_POSES.carry_front.armX + breath * 0.014;
      if (rig.rightElbow) rig.rightElbow.rotation.x = HAND_POSES.carry_front.elbowX;
    } else if (hold === 'carry_bag') {
      rig.rightArm.rotation.x = HAND_POSES.carry_bag.armX + breath * 0.014;
      if (rig.rightElbow) rig.rightElbow.rotation.x = HAND_POSES.carry_bag.elbowX;
    } else if (hold === 'carry_net') {
      rig.rightArm.rotation.x = HAND_POSES.carry_net.armX + breath * 0.012;
      if (rig.rightElbow) rig.rightElbow.rotation.x = HAND_POSES.carry_net.elbowX;
    } else {
      rig.rightArm.rotation.x = -Math.sin(breathPhase - 0.3) * 0.024;
      if (rig.rightElbow) rig.rightElbow.rotation.x = HAND_POSES.none.elbowX - breath01 * 0.03;
    }
  }

  if (rig.heldPetRig) {
    const orbitAngle = elapsed * 2.15;
    const isFlyPet = (PET_CATALOG[rig.heldPetRig.speciesId]?.moveType ?? 'walk') === 'fly';
    if (isFlyPet) {
      const orbitRadius = 0.72;
      const orbitY = 1.05 + Math.sin(elapsed * 3.0) * 0.11;
      rig.heldPetRig.root.position.set(
        Math.cos(orbitAngle) * orbitRadius,
        orbitY,
        Math.sin(orbitAngle) * orbitRadius,
      );
      rig.heldPetRig.root.rotation.y = -orbitAngle;
      updatePetAnimation(rig.heldPetRig, 'held_orbit', elapsed, {baseScale: 1.08});
    } else {
      const orbitRadius = 0.85;
      rig.heldPetRig.root.position.set(
        Math.cos(orbitAngle) * orbitRadius,
        0,
        Math.sin(orbitAngle) * orbitRadius,
      );
      rig.heldPetRig.root.rotation.y = -orbitAngle;
      updatePetAnimation(rig.heldPetRig, 'walk', elapsed, {baseScale: 1.08});
    }
  }
}
