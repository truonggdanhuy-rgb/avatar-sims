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
  carry_umbrella: {armX: -0.46, armZ: 0.62, elbowX: -0.94, elbowZ: 0.18},
  carry_front: {armX: -0.42, armZ: 0.44, elbowX: -0.98, elbowZ: 0.08},
  carry_bag: {armX: -0.06, armZ: 0.48, elbowX: -0.14, elbowZ: 0.06},
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

const _eyeTexCache = new Map<string, THREE.CanvasTexture>();

function createNendoroidEyeTexture(
  eyeColor: string,
  style: AvatarConfig['eyeStyle'],
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const key = `${eyeColor}_${style}`;
  const cached = _eyeTexCache.get(key);
  if (cached) return cached;

  const size = 192;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const cx = size * 0.5;
  const cy = size * 0.5;
  const baseCol = new THREE.Color(eyeColor);
  const darkHex = `#${shadeHex(eyeColor, -0.26).getHexString()}`;
  const midHex = `#${baseCol.getHexString()}`;
  const lightHex = `#${shadeHex(eyeColor, 0.2).getHexString()}`;
  const rimHex = `#${shadeHex(eyeColor, -0.34).getHexString()}`;

  // Clean warm sclera with soft upper eyelid shadow
  ctx.fillStyle = '#FFFDF9';
  ctx.fillRect(0, 0, size, size);
  const scleraShade = ctx.createLinearGradient(0, 0, 0, size * 0.44);
  scleraShade.addColorStop(0, 'rgba(182, 168, 178, 0.42)');
  scleraShade.addColorStop(1, 'rgba(255, 253, 249, 0)');
  ctx.fillStyle = scleraShade;
  ctx.fillRect(0, 0, size, size * 0.44);

  const isAlmond = style === 'almond' || style === 'squint';
  const irisRx = isAlmond ? size * 0.255 : size * 0.245;
  const irisRy = isAlmond ? size * 0.3 : size * 0.31;
  const irisCy = style === 'squint' ? cy + size * 0.025 : cy;

  // Iris body vertical Nendoroid gradient (deep upper shadow -> luminous jewel crescent)
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, irisCy, irisRx, irisRy, 0, 0, Math.PI * 2);
  ctx.clip();

  const irisGrad = ctx.createLinearGradient(0, irisCy - irisRy, 0, irisCy + irisRy);
  irisGrad.addColorStop(0.0, darkHex);
  irisGrad.addColorStop(0.45, midHex);
  irisGrad.addColorStop(0.84, lightHex);
  irisGrad.addColorStop(1.0, midHex);
  ctx.fillStyle = irisGrad;
  ctx.fillRect(0, 0, size, size);

  // Subtle lower glowing crescent inside iris
  const glowGrad = ctx.createRadialGradient(
    cx,
    irisCy + irisRy * 0.42,
    irisRx * 0.08,
    cx,
    irisCy + irisRy * 0.35,
    irisRx * 0.78,
  );
  glowGrad.addColorStop(0, 'rgba(255, 255, 255, 0.48)');
  glowGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, size, size);

  // Crisp pupil blended under upper shadow
  ctx.beginPath();
  ctx.ellipse(cx, irisCy - irisRy * 0.06, irisRx * 0.46, irisRy * 0.44, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#1E161A';
  ctx.fill();

  // Top dark limbal shadow arc
  ctx.fillStyle = 'rgba(24, 16, 20, 0.36)';
  ctx.fillRect(0, irisCy - irisRy, size, irisRy * 0.42);
  ctx.restore();

  // Soft crisp outer iris ring
  ctx.beginPath();
  ctx.ellipse(cx, irisCy, irisRx, irisRy, 0, 0, Math.PI * 2);
  ctx.lineWidth = 4.2;
  ctx.strokeStyle = rimHex;
  ctx.stroke();

  // Crisp Nendoroid specular catchlights
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.ellipse(
    cx - irisRx * 0.36,
    irisCy - irisRy * 0.32,
    irisRx * 0.25,
    irisRy * 0.2,
    -0.32,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  if (style === 'starry' || style === 'cheerful' || style === 'wink') {
    ctx.beginPath();
    ctx.arc(cx + irisRx * 0.38, irisCy + irisRy * 0.36, irisRx * 0.13, 0, Math.PI * 2);
    ctx.fill();
  }
  if (style === 'starry') {
    ctx.beginPath();
    ctx.arc(cx + irisRx * 0.28, irisCy - irisRy * 0.44, irisRx * 0.08, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  _eyeTexCache.set(key, tex);
  return tex;
}

/**
 * Curved spherical eye disc with exact front-facing UVs (0..1) so procedural eye textures
 * map cleanly onto the face without bug-eye bulge.
 */
function createCurvedEyePatchGeometry(
  rx: number,
  ry: number,
  bulge: number,
  radialSegs = 24,
  ringSegs = 6,
): THREE.BufferGeometry {
  const positions: number[] = [0, 0, bulge];
  const uvs: number[] = [0.5, 0.5];
  const indices: number[] = [];

  for (let ir = 1; ir <= ringSegs; ir++) {
    const r = ir / ringSegs;
    const z = bulge * Math.sqrt(Math.max(0, 1 - r * r * 0.92));
    for (let j = 0; j < radialSegs; j++) {
      const th = (j / radialSegs) * Math.PI * 2;
      const nx = r * Math.cos(th);
      const ny = r * Math.sin(th);
      positions.push(nx * rx, ny * ry, z);
      uvs.push(0.5 + 0.5 * nx, 0.5 + 0.5 * ny);
    }
  }

  for (let j = 0; j < radialSegs; j++) {
    const nextJ = (j + 1) % radialSegs;
    indices.push(0, 1 + j, 1 + nextJ);
  }
  for (let ir = 1; ir < ringSegs; ir++) {
    const rowA = 1 + (ir - 1) * radialSegs;
    const rowB = 1 + ir * radialSegs;
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
    const hoodieClearZ = isHoodie ? 0.06 : 0;
    rightArm.rotation.x = poseCfg.armX;
    rightArm.rotation.z = poseCfg.armZ + hoodieClearZ;
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

    if (handheld === 'milk_tea') {
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

  // Optional Soft Rosy Cheeks (ONLY rendered when config.blush === true!)
  if (config.blush) {
    const blushPatchGeo = new THREE.SphereGeometry(0.042, 14, 10);
    const blushStrokeMat = clayMat('#EB7482', 0.6);
    [-1, 1].forEach((side) => {
      const cheek = new THREE.Mesh(blushPatchGeo, cheekMat);
      cheek.scale.set(1.2, 0.6, 0.09);
      cheek.position.set(side * 0.168, 0.194, 0.2155);
      cheek.rotation.y = side * 0.42;
      headPivot.add(cheek);

      // Two delicate anime blush hatch lines flush on the patch
      [-0.013, 0.01].forEach((dx) => {
        const hatch = new THREE.Mesh(
          createTaperedTubeGeometry(
            [
              [-0.006, -0.008, 0],
              [0.006, 0.009, 0.001],
            ],
            0.0021,
            4,
            6,
            0.25,
          ),
          blushStrokeMat,
        );
        hatch.position.set(side * 0.168 + dx, 0.194, 0.2195);
        hatch.rotation.y = side * 0.42;
        headPivot.add(hatch);
      });
    });
  }

  // Expressive Detailed Nendoroid Eyes ('starry' | 'almond' | 'cheerful' | 'cozy' | 'squint' | 'wink')
  const lashMat = clayMat('#241A19', 0.42);
  const eyeTex = createNendoroidEyeTexture(config.eyeColor, config.eyeStyle);
  const eyePatchMat = new THREE.MeshStandardMaterial({
    color: '#FFFFFF',
    map: eyeTex,
    roughness: 0.2,
    metalness: 0.0,
  });
  const eyelids: THREE.Mesh[] = [];

  const makeEye = (side: -1 | 1) => {
    const eyeGroup = new THREE.Group();
    eyeGroup.position.set(side * 0.11, 0.252, 0.252);
    eyeGroup.rotation.y = side * 0.2;

    const isClosedCozy =
      config.eyeStyle === 'cozy' || (config.eyeStyle === 'wink' && side === 1);

    if (isClosedCozy) {
      const isWinkSide = config.eyeStyle === 'wink';
      const arcPts: [number, number, number][] = isWinkSide
        ? [
            [side * -0.044, 0.016, 0.01],
            [side * -0.004, -0.002, 0.019],
            [side * 0.044, -0.018, 0.01],
          ]
        : [
            [-0.044, -0.012, 0.01],
            [-0.022, 0.01, 0.017],
            [0, 0.018, 0.02],
            [0.022, 0.01, 0.017],
            [0.044, -0.012, 0.01],
          ];
      const arc = new THREE.Mesh(
        createTaperedTubeGeometry(arcPts, 0.0056, 14, 8, 0.22),
        lashMat,
      );
      if (isWinkSide) {
        const lowerWing = new THREE.Mesh(
          createTaperedTubeGeometry(
            [
              [side * -0.04, -0.018, 0.01],
              [side * 0.002, -0.004, 0.018],
              [side * 0.044, -0.018, 0.01],
            ],
            0.0044,
            10,
            8,
            0.2,
          ),
          lashMat,
        );
        eyeGroup.add(lowerWing);
      } else {
        const wing = new THREE.Mesh(
          createTaperedTubeGeometry(
            [
              [side * 0.038, -0.008, 0.011],
              [side * 0.052, -0.002, 0.008],
            ],
            0.0036,
            6,
            6,
            0.15,
          ),
          lashMat,
        );
        eyeGroup.add(wing);
      }
      eyeGroup.add(arc);
      return eyeGroup;
    }

    const isAlmond = config.eyeStyle === 'almond';
    const isSquint = config.eyeStyle === 'squint';
    const rx = isAlmond || isSquint ? 0.054 : 0.05;
    const ry = isAlmond ? 0.048 : isSquint ? 0.046 : 0.056;

    const eyeDisc = new THREE.Mesh(
      createCurvedEyePatchGeometry(rx, ry, 0.015),
      eyePatchMat,
    );
    eyeGroup.add(eyeDisc);

    // Sculpted tapered Upper Eyelash sits cleanly IN FRONT of both iris & drooping squint lid
    const upperLashPts: [number, number, number][] = isSquint
      ? [
          [side * -0.052, 0.016, 0.02],
          [0, 0.012, 0.025],
          [side * 0.054, 0.01, 0.018],
        ]
      : [
          [side * -0.048, 0.014, 0.014],
          [side * -0.024, ry * 0.88, 0.02],
          [0, ry * 0.98, 0.022],
          [side * 0.032, ry * (isAlmond ? 0.84 : 0.8), 0.019],
          [side * 0.058, isAlmond ? 0.012 : 0.006, 0.012],
        ];
    const upperLash = new THREE.Mesh(
      createTaperedTubeGeometry(upperLashPts, isSquint ? 0.0064 : 0.0058, 16, 8, 0.24),
      lashMat,
    );
    eyeGroup.add(upperLash);

    // Subtle lower-outer lash accent for refined Nendoroid finish
    const lowerAccent = new THREE.Mesh(
      createTaperedTubeGeometry(
        [
          [side * -0.03, -ry * 0.86, 0.014],
          [0, -ry * 0.94, 0.018],
          [side * 0.038, -ry * 0.78, 0.013],
        ],
        isSquint ? 0.0038 : 0.0024,
        10,
        6,
        0.18,
      ),
      isSquint ? lashMat : clayMat(shadeHex(config.skinTone, -0.22).getHex(), 0.6),
    );
    eyeGroup.add(lowerAccent);

    // Moving Skin Eyelid (stays tucked strictly behind upperLash z <= 0.019 while cleanly masking upper iris)
    const lid = new THREE.Mesh(new THREE.SphereGeometry(0.056, 14, 12), skinMat);
    const baseLidScaleY = isSquint ? 0.54 : 0.06;
    const baseLidY = isSquint ? 0.031 : 0.046;
    lid.scale.set(1.03, baseLidScaleY, 0.28);
    lid.position.set(0, baseLidY, 0.003);
    lid.userData.baseScaleY = baseLidScaleY;
    lid.userData.baseY = baseLidY;
    eyeGroup.add(lid);
    eyelids.push(lid);

    // Soft cheek lower-lid rise when squinting (nheo mắt)
    if (isSquint) {
      const lowerLid = new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 10), skinMat);
      lowerLid.scale.set(1.02, 0.24, 0.26);
      lowerLid.position.set(0, -0.042, 0.002);
      eyeGroup.add(lowerLid);
    }

    return eyeGroup;
  };
  headPivot.add(makeEye(-1), makeEye(1));

  // Fine Sculpted Tapered Eyebrows matching each expression & hair color
  const browBaseCol = new THREE.Color(config.hairColor);
  const browLum = {h: 0, s: 0, l: 0};
  browBaseCol.getHSL(browLum);
  if (browLum.l > 0.58) browBaseCol.setHSL(browLum.h, browLum.s * 0.85, 0.44);
  else browBaseCol.lerp(new THREE.Color('#1E1512'), 0.22);
  const eyebrowMat = clayMat(browBaseCol.getHex(), 0.56);

  [-1, 1].forEach((side) => {
    const expr = config.expression;
    const isSquint = config.eyeStyle === 'squint';
    const baseY =
      expr === 'grin'
        ? 0.312
        : isSquint
          ? 0.296
          : expr === 'calm'
            ? 0.302
            : 0.306;
    const innerDY =
      expr === 'bashful'
        ? 0.007
        : expr === 'smirk' && side === 1
          ? 0.011
          : expr === 'cat'
            ? -0.004
            : isSquint
              ? -0.005
              : 0;
    const outerDY =
      expr === 'bashful'
        ? -0.005
        : expr === 'smirk' && side === 1
          ? 0.009
          : expr === 'grin'
            ? 0.004
            : -0.002;

    const brow = new THREE.Mesh(
      createTaperedTubeGeometry(
        [
          [side * -0.036, innerDY, 0.003],
          [0, 0.006, 0.007],
          [side * 0.038, outerDY, -0.002],
        ],
        0.0038,
        10,
        6,
        0.24,
      ),
      eyebrowMat,
    );
    brow.position.set(side * 0.11, baseY, 0.258);
    brow.rotation.y = side * 0.2;
    headPivot.add(brow);
  });

  // Delicate Expressive Nendoroid Mouths ('smile' | 'grin' | 'cat' | 'calm' | 'smirk' | 'bashful')
  const mouthLineMat = clayMat('#643731', 0.48);
  const mouthY = 0.15;
  const mouthZ = 0.24;

  if (config.expression === 'grin') {
    const upperLip = new THREE.Mesh(
      createTaperedTubeGeometry(
        [
          [-0.032, mouthY + 0.007, mouthZ - 0.004],
          [0, mouthY + 0.005, mouthZ + 0.002],
          [0.032, mouthY + 0.007, mouthZ - 0.004],
        ],
        0.0036,
        12,
        6,
        0.24,
      ),
      mouthLineMat,
    );
    const mouthCavity = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.022, 0.012, 14, 1, false, 0, Math.PI),
      clayMat('#9C3E49', 0.54),
    );
    mouthCavity.rotation.x = Math.PI / 2;
    mouthCavity.rotation.y = Math.PI / 2;
    mouthCavity.scale.set(0.95, 1, 0.9);
    mouthCavity.position.set(0, mouthY + 0.004, mouthZ - 0.004);
    const teeth = new THREE.Mesh(
      new RoundedBoxGeometry(0.044, 0.008, 0.01, 2, 0.003),
      clayMat('#FFF9F4', 0.35),
    );
    teeth.position.set(0, mouthY + 0.001, mouthZ - 0.001);
    const tongue = new THREE.Mesh(
      new THREE.SphereGeometry(0.015, 10, 8),
      clayMat('#F28691', 0.48),
    );
    tongue.scale.set(1.15, 0.5, 0.5);
    tongue.position.set(0, mouthY - 0.009, mouthZ);
    headPivot.add(mouthCavity, teeth, tongue, upperLip);
  } else if (config.expression === 'cat') {
    const catMouth = new THREE.Mesh(
      createTaperedTubeGeometry(
        [
          [-0.032, mouthY + 0.005, mouthZ - 0.004],
          [-0.016, mouthY - 0.004, mouthZ],
          [0, mouthY + 0.003, mouthZ + 0.002],
          [0.016, mouthY - 0.004, mouthZ],
          [0.032, mouthY + 0.005, mouthZ - 0.004],
        ],
        0.0034,
        18,
        6,
        0.26,
      ),
      mouthLineMat,
    );
    headPivot.add(catMouth);
  } else if (config.expression === 'calm') {
    const calmMouth = new THREE.Mesh(
      createTaperedTubeGeometry(
        [
          [-0.02, mouthY + 0.001, mouthZ - 0.001],
          [0, mouthY - 0.001, mouthZ + 0.001],
          [0.02, mouthY + 0.001, mouthZ - 0.001],
        ],
        0.0034,
        10,
        6,
        0.25,
      ),
      mouthLineMat,
    );
    headPivot.add(calmMouth);
  } else if (config.expression === 'smirk') {
    const smirkMouth = new THREE.Mesh(
      createTaperedTubeGeometry(
        [
          [-0.024, mouthY - 0.002, mouthZ - 0.001],
          [0.002, mouthY - 0.001, mouthZ + 0.002],
          [0.028, mouthY + 0.009, mouthZ - 0.004],
        ],
        0.0036,
        12,
        6,
        0.22,
      ),
      mouthLineMat,
    );
    headPivot.add(smirkMouth);
  } else if (config.expression === 'bashful') {
    const bashfulMouth = new THREE.Mesh(
      createTaperedTubeGeometry(
        [
          [-0.018, mouthY + 0.001, mouthZ - 0.001],
          [-0.006, mouthY - 0.003, mouthZ + 0.001],
          [0.006, mouthY + 0.002, mouthZ + 0.001],
          [0.018, mouthY - 0.002, mouthZ - 0.001],
        ],
        0.0032,
        12,
        6,
        0.25,
      ),
      mouthLineMat,
    );
    headPivot.add(bashfulMouth);
  } else {
    // 'smile': delicate soft Nendoroid U-smile
    const smileMesh = new THREE.Mesh(
      createTaperedTubeGeometry(
        [
          [-0.026, mouthY + 0.005, mouthZ - 0.003],
          [-0.013, mouthY - 0.003, mouthZ + 0.001],
          [0, mouthY - 0.005, mouthZ + 0.002],
          [0.013, mouthY - 0.003, mouthZ + 0.001],
          [0.026, mouthY + 0.005, mouthZ - 0.003],
        ],
        0.0036,
        14,
        6,
        0.24,
      ),
      mouthLineMat,
    );
    headPivot.add(smileMesh);
  }

  // ========== MODULAR STYLIZED 3D CLAY HAIR SYSTEM ==========
  const hairAssembly = buildCharacterHair(config, hairMat, topMat);
  headPivot.add(hairAssembly.root);

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
    rig.eyelids.forEach((lid) => {
      const baseScaleY = (lid.userData.baseScaleY as number) ?? 0.06;
      const baseY = (lid.userData.baseY as number) ?? 0.046;
      lid.scale.y = eyesClosed ? 1.15 : baseScaleY;
      lid.position.y = eyesClosed ? 0 : baseY;
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
    } else if (hold === 'carry_bag') {
      rig.rightArm.rotation.x = HAND_POSES.carry_bag.armX;
      if (rig.rightElbow) rig.rightElbow.rotation.x = HAND_POSES.carry_bag.elbowX;
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
