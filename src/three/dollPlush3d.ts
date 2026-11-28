import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {DollRarity, getDollByHandheld} from '../data/hddollCatalog';
import {HandheldStyle} from '../types/game';
import {clayMat, glossyClayMat} from './materials';

export interface FloatingHeartItem {
  mesh: THREE.Object3D;
  phase: number;
  baseX: number;
  baseZ: number;
  radius: number;
  speed: number;
}

export interface DollPlushRig {
  root: THREE.Group;
  handheldId: HandheldStyle;
  rarity: DollRarity;
  leftEar?: THREE.Object3D;
  rightEar?: THREE.Object3D;
  eyeGlints: THREE.Object3D[];
  floatingHearts: FloatingHeartItem[];
  openEyesGroup?: THREE.Object3D;
  closedEyesGroup?: THREE.Object3D;
  wavingArm?: THREE.Object3D;
  bellPivot?: THREE.Object3D;
}

let sharedHeartGeo: THREE.ExtrudeGeometry | null = null;

function getPlushHeartGeometry(): THREE.ExtrudeGeometry {
  if (sharedHeartGeo) return sharedHeartGeo;
  const s = new THREE.Shape();
  s.moveTo(0, 0.28);
  s.bezierCurveTo(0.06, 0.52, 0.44, 0.56, 0.48, 0.24);
  s.bezierCurveTo(0.52, -0.05, 0.24, -0.26, 0, -0.48);
  s.bezierCurveTo(-0.24, -0.26, -0.52, -0.05, -0.48, 0.24);
  s.bezierCurveTo(-0.44, 0.56, -0.06, 0.52, 0, 0.28);
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.18,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.06,
    bevelSegments: 3,
    curveSegments: 10,
  });
  geo.center();
  sharedHeartGeo = geo;
  return geo;
}

function createPlushHeartMesh(
  colorHex: string,
  emissiveHex: string,
  emissiveIntensity: number,
  scale = 0.045,
): THREE.Mesh {
  const mat = new THREE.MeshStandardMaterial({
    color: colorHex,
    emissive: emissiveHex,
    emissiveIntensity,
    roughness: 0.28,
    metalness: 0.05,
  });
  const mesh = new THREE.Mesh(getPlushHeartGeometry(), mat);
  mesh.scale.setScalar(scale);
  return mesh;
}

function addPlushLimbs(
  parent: THREE.Group,
  limbMat: THREE.Material,
  pawMat: THREE.Material,
  options?: {skipRightArm?: boolean; shortRoundedPaws?: boolean},
): void {
  const short = Boolean(options?.shortRoundedPaws);
  ([-1, 1] as const).forEach((s) => {
    // Plump lower legs sticking softly forward so the plushie sits snugly in character's arms
    const leg = new THREE.Mesh(
      new THREE.CapsuleGeometry(short ? 0.036 : 0.033, short ? 0.032 : 0.044, 6, 10),
      limbMat,
    );
    leg.position.set(s * 0.068, -0.108, 0.066);
    leg.rotation.x = -1.16;
    leg.rotation.z = s * 0.22;

    const footPad = new THREE.Mesh(
      new THREE.SphereGeometry(short ? 0.034 : 0.028, 10, 8),
      pawMat,
    );
    footPad.scale.set(1, 0.95, 0.65);
    footPad.position.set(s * 0.075, -0.122, 0.106);
    parent.add(leg, footPad);

    if (s === 1 && options?.skipRightArm) return;

    const arm = new THREE.Mesh(
      new THREE.CapsuleGeometry(short ? 0.031 : 0.028, short ? 0.038 : 0.048, 6, 10),
      limbMat,
    );
    arm.position.set(s * 0.112, 0.022, 0.042);
    arm.rotation.z = s * 0.56;
    arm.rotation.x = -0.34;
    parent.add(arm);

    if (short) {
      const handBall = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 8), pawMat);
      handBall.position.set(s * 0.132, -0.008, 0.062);
      parent.add(handBall);
    }
  });
}

function addCuteEyesAndBlush(
  headGrp: THREE.Group,
  eyeGlints: THREE.Object3D[],
  options: {
    faceZ: number;
    eyeY: number;
    eyeX: number;
    eyeRadius: number;
    irisHex?: string;
    sparkle?: boolean;
    cheekHex?: string;
    cheekY?: number;
    sleepy?: boolean;
  },
): void {
  const {
    faceZ,
    eyeY,
    eyeX,
    eyeRadius,
    irisHex = '#231B24',
    sparkle = false,
    cheekHex = '#FF8BA7',
    cheekY = eyeY - 0.026,
    sleepy = false,
  } = options;

  const darkMat = glossyClayMat('#1B151D', 0.14);
  const irisMat = glossyClayMat(irisHex, 0.16);
  const glintMat = new THREE.MeshBasicMaterial({color: '#FFFFFF'});
  const starMat = new THREE.MeshBasicMaterial({color: '#FFFBEB'});
  const blushMat = clayMat(cheekHex, 0.72);

  ([-1, 1] as const).forEach((s) => {
    const blush = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), blushMat);
    blush.scale.set(1.25, 0.72, 0.35);
    blush.position.set(s * (eyeX + 0.02), cheekY, faceZ - 0.002);
    headGrp.add(blush);

    if (sleepy) {
      const arc = new THREE.Mesh(
        new THREE.TorusGeometry(eyeRadius * 0.92, 0.0045, 6, 12, Math.PI),
        darkMat,
      );
      arc.rotation.z = Math.PI;
      arc.position.set(s * eyeX, eyeY + 0.004, faceZ + 0.004);
      headGrp.add(arc);
      return;
    }

    const eyeBase = new THREE.Mesh(new THREE.SphereGeometry(eyeRadius, 14, 12), irisMat);
    eyeBase.scale.set(0.95, 1.12, 0.55);
    eyeBase.position.set(s * eyeX, eyeY, faceZ);

    const pupil = new THREE.Mesh(new THREE.SphereGeometry(eyeRadius * 0.62, 10, 10), darkMat);
    pupil.scale.set(0.95, 1.08, 0.52);
    pupil.position.set(s * eyeX, eyeY - 0.001, faceZ + eyeRadius * 0.35);

    const glintMain = new THREE.Mesh(new THREE.SphereGeometry(eyeRadius * 0.3, 8, 8), glintMat);
    glintMain.scale.set(1, 1, 0.5);
    glintMain.position.set(s * eyeX - 0.006, eyeY + eyeRadius * 0.38, faceZ + eyeRadius * 0.56);

    const glintSub = new THREE.Mesh(new THREE.SphereGeometry(eyeRadius * 0.16, 6, 6), glintMat);
    glintSub.scale.set(1, 1, 0.5);
    glintSub.position.set(s * eyeX + 0.006, eyeY - eyeRadius * 0.28, faceZ + eyeRadius * 0.55);

    headGrp.add(eyeBase, pupil, glintMain, glintSub);

    if (sparkle) {
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(eyeRadius * 0.34, 0), starMat);
      star.scale.set(1, 1, 0.45);
      star.position.set(s * eyeX + 0.004, eyeY + eyeRadius * 0.28, faceZ + eyeRadius * 0.6);
      headGrp.add(star);
      eyeGlints.push(star, glintMain);
    }
  });
}

function addTinySmile(
  headGrp: THREE.Group,
  mouthY: number,
  mouthZ: number,
  noseHex = '#F47296',
): void {
  const noseMat = glossyClayMat(noseHex, 0.25);
  const lineMat = clayMat('#4B3332', 0.5);

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.013, 10, 8), noseMat);
  nose.scale.set(1.2, 0.85, 0.72);
  nose.position.set(0, mouthY + 0.015, mouthZ + 0.005);
  headGrp.add(nose);

  ([-1, 1] as const).forEach((s) => {
    const curve = new THREE.Mesh(
      new THREE.TorusGeometry(0.011, 0.0032, 6, 10, Math.PI),
      lineMat,
    );
    curve.rotation.z = Math.PI;
    curve.position.set(s * 0.01, mouthY + 0.003, mouthZ + 0.002);
    headGrp.add(curve);
  });
}

export function buildDollPlushModel(
  handheldId: HandheldStyle,
  overrideColor?: string,
): DollPlushRig {
  const spec = getDollByHandheld(handheldId);
  const rarity: DollRarity = spec?.rarity ?? 'common';
  const mainCol = spec?.primaryColor || overrideColor || '#F9B4CE';
  const accCol = spec?.accentColor || '#FFF5F8';

  const root = new THREE.Group();
  const eyeGlints: THREE.Object3D[] = [];
  const floatingHearts: FloatingHeartItem[] = [];
  let leftEar: THREE.Object3D | undefined;
  let rightEar: THREE.Object3D | undefined;
  let openEyesGroup: THREE.Object3D | undefined;
  let closedEyesGroup: THREE.Object3D | undefined;
  let wavingArm: THREE.Object3D | undefined;
  let bellPivot: THREE.Object3D | undefined;

  const furMat = clayMat(mainCol, 0.88);
  const softAccentMat = clayMat(accCol, 0.8);
  const vinylFaceMat = glossyClayMat('#FFF3E6', 0.38);
  const pureWhiteMat = clayMat('#FFFFFF', 0.72);

  // ================= 1. SECRET: CINNAMO ANGEL (FLOPPY CLOUD EARS + WAVE + BLINK) =================
  if (handheldId === 'doll_secret_doraemon') {
    const cloudWhiteMat = clayMat('#F5FAFF', 0.82);
    const skyBlueMat = clayMat('#7DD3FC', 0.62);
    const deepSkyMat = glossyClayMat('#0284C7', 0.16);
    const pastelRibbonMat = clayMat('#38BDF8', 0.45);
    const goldMat = glossyClayMat('#FBBF24', 0.22);
    const blushMat = clayMat('#FDA4AF', 0.68);
    const darkLineMat = clayMat('#1E293B', 0.48);

    // Chubby cloud-white body + pastel sky tummy emblem
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.116, 20, 16), cloudWhiteMat);
    body.scale.set(1.06, 1.04, 0.9);
    body.position.set(0, -0.024, 0);

    const tummy = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 14), clayMat('#E0F2FE', 0.78));
    tummy.scale.set(1.02, 1.02, 0.54);
    tummy.position.set(0, -0.028, 0.068);

    // Cute heart badge on belly
    const bellyHeart = createPlushHeartMesh('#7DD3FC', '#38BDF8', 0.18, 0.032);
    bellyHeart.position.set(0, -0.026, 0.112);

    // Tiny angel wings peeking from the back sides
    ([-1, 1] as const).forEach((s) => {
      const wing = new THREE.Group();
      wing.position.set(s * 0.095, 0.015, -0.072);
      wing.rotation.y = s * 0.38;
      wing.rotation.z = -s * 0.32;
      const topFeather = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.048, 6, 10), pureWhiteMat);
      topFeather.scale.set(0.85, 1, 0.42);
      topFeather.position.set(s * 0.022, 0.022, 0);
      const lowFeather = new THREE.Mesh(new THREE.CapsuleGeometry(0.017, 0.032, 6, 10), pureWhiteMat);
      lowFeather.scale.set(0.85, 1, 0.42);
      lowFeather.position.set(s * 0.016, -0.008, 0);
      lowFeather.rotation.z = s * 0.25;
      wing.add(topFeather, lowFeather);
      root.add(wing);
    });

    // Sky-blue satin bow collar + jingling golden bell
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.088, 0.014, 10, 22), pastelRibbonMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, 0.068, 0.008);

    ([-1, 1] as const).forEach((s) => {
      const bowWing = new THREE.Mesh(new RoundedBoxGeometry(0.038, 0.024, 0.016, 2, 0.008), pastelRibbonMat);
      bowWing.position.set(s * 0.024, 0.068, 0.098);
      bowWing.rotation.z = s * 0.26;
      root.add(bowWing);
    });

    bellPivot = new THREE.Group();
    bellPivot.position.set(0, 0.056, 0.104);
    const bellSphere = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 10), goldMat);
    const bellRim = new THREE.Mesh(new THREE.TorusGeometry(0.017, 0.003, 6, 14), clayMat('#D97706', 0.35));
    bellRim.rotation.x = Math.PI / 2;
    bellPivot.add(bellSphere, bellRim);

    addPlushLimbs(root, cloudWhiteMat, clayMat('#BAE6FD', 0.72), {
      skipRightArm: true,
      shortRoundedPaws: true,
    });

    // Raised waving right paw ("tay có vẫy nhẹ")
    wavingArm = new THREE.Group();
    wavingArm.position.set(0.104, 0.04, 0.038);
    const waveTube = new THREE.Mesh(new THREE.CapsuleGeometry(0.028, 0.048, 6, 10), cloudWhiteMat);
    waveTube.position.set(0.024, 0.034, 0.014);
    waveTube.rotation.z = -0.68;
    waveTube.rotation.x = -0.24;
    const wavePaw = new THREE.Mesh(new THREE.SphereGeometry(0.032, 12, 10), pureWhiteMat);
    wavePaw.position.set(0.044, 0.064, 0.024);
    const wavePad = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 8), blushMat);
    wavePad.scale.set(1, 0.85, 0.45);
    wavePad.position.set(0.044, 0.064, 0.052);
    wavingArm.add(waveTube, wavePaw, wavePad);
    root.add(wavingArm);

    // Wide kawaii cloud puppy-bunny head
    const headGrp = new THREE.Group();
    headGrp.position.set(0, 0.164, 0.008);

    const headSphere = new THREE.Mesh(new THREE.SphereGeometry(0.122, 22, 18), cloudWhiteMat);
    headSphere.scale.set(1.16, 0.92, 0.94);

    // Big floppy cloud ears flaring gracefully outward ("tai có lắc")
    const earL = new THREE.Group();
    earL.position.set(-0.122, 0.036, 0.004);
    earL.rotation.z = -0.46;
    earL.userData.baseRotZ = -0.46;

    const earR = new THREE.Group();
    earR.position.set(0.122, 0.036, 0.004);
    earR.rotation.z = 0.46;
    earR.userData.baseRotZ = 0.46;

    ([-1, 1] as const).forEach((s, idx) => {
      const ep = idx === 0 ? earL : earR;
      const earFlop = new THREE.Mesh(new THREE.CapsuleGeometry(0.038, 0.094, 8, 12), cloudWhiteMat);
      earFlop.scale.set(1.06, 1, 0.56);
      earFlop.position.set(s * 0.02, -0.054, 0.006);
      earFlop.rotation.z = s * 0.16;

      const earTipPuff = new THREE.Mesh(new THREE.SphereGeometry(0.043, 12, 10), cloudWhiteMat);
      earTipPuff.scale.set(1.14, 0.92, 0.62);
      earTipPuff.position.set(s * 0.036, -0.104, 0.008);

      const earInner = new THREE.Mesh(new THREE.CapsuleGeometry(0.021, 0.064, 6, 10), skyBlueMat);
      earInner.scale.set(0.95, 1, 0.35);
      earInner.position.set(s * 0.022, -0.058, 0.022);
      earInner.rotation.z = s * 0.16;

      const earBow = new THREE.Mesh(new RoundedBoxGeometry(0.038, 0.02, 0.014, 2, 0.006), pastelRibbonMat);
      earBow.position.set(s * 0.012, 0.004, 0.024);
      earBow.rotation.z = s * 0.24;

      ep.add(earFlop, earTipPuff, earInner, earBow);
      headGrp.add(ep);
    });
    leftEar = earL;
    rightEar = earR;

    // Golden Angel Crown on top of head
    const crownGrp = new THREE.Group();
    crownGrp.position.set(0, 0.118, 0.012);
    const crownBand = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.032, 0.024, 14), goldMat);
    crownGrp.add(crownBand);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.011, 0.022, 6), goldMat);
      tip.position.set(Math.cos(a) * 0.028, 0.02, Math.sin(a) * 0.028);
      const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.0065, 8, 6), pureWhiteMat);
      pearl.position.set(Math.cos(a) * 0.028, 0.031, Math.sin(a) * 0.028);
      crownGrp.add(tip, pearl);
    }
    const crownGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.011, 0), deepSkyMat);
    crownGem.position.set(0, 0.002, 0.035);
    crownGrp.add(crownGem);
    headGrp.add(crownGrp);

    // Animated Open Starry Sky-Blue Eyes vs Happy Blink Eyes ("chớp mắt")
    openEyesGroup = new THREE.Group();
    closedEyesGroup = new THREE.Group();
    closedEyesGroup.visible = false;

    const glintMat = new THREE.MeshBasicMaterial({color: '#FFFFFF'});
    const starMat = new THREE.MeshBasicMaterial({color: '#FFFBEB'});

    ([-1, 1] as const).forEach((s) => {
      const blush = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 8), blushMat);
      blush.scale.set(1.32, 0.72, 0.35);
      blush.position.set(s * 0.072, -0.024, 0.106);
      headGrp.add(blush);

      const iris = new THREE.Mesh(new THREE.SphereGeometry(0.022, 14, 12), deepSkyMat);
      iris.scale.set(0.96, 1.16, 0.55);
      iris.position.set(s * 0.048, 0.004, 0.111);

      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.013, 10, 10), darkLineMat);
      pupil.scale.set(0.95, 1.1, 0.5);
      pupil.position.set(s * 0.048, 0.002, 0.119);

      const glint = new THREE.Mesh(new THREE.SphereGeometry(0.0065, 8, 8), glintMat);
      glint.position.set(s * 0.042, 0.012, 0.125);

      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.007, 0), starMat);
      star.scale.set(1, 1, 0.45);
      star.position.set(s * 0.054, -0.004, 0.125);

      openEyesGroup!.add(iris, pupil, glint, star);
      eyeGlints.push(star, glint);

      // Happy curved blink lashes
      const closedArc = new THREE.Mesh(
        new THREE.TorusGeometry(0.017, 0.0038, 6, 12, Math.PI),
        darkLineMat,
      );
      closedArc.position.set(s * 0.048, 0.001, 0.116);
      closedEyesGroup!.add(closedArc);
    });

    // Cute tiny button nose + w-shaped puppy smile
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.011, 10, 8), clayMat('#F47296', 0.35));
    nose.scale.set(1.25, 0.82, 0.7);
    nose.position.set(0, -0.01, 0.12);
    headGrp.add(nose);

    ([-1, 1] as const).forEach((s) => {
      const smileCurve = new THREE.Mesh(
        new THREE.TorusGeometry(0.012, 0.0034, 6, 10, Math.PI),
        darkLineMat,
      );
      smileCurve.rotation.z = Math.PI;
      smileCurve.position.set(s * 0.011, -0.022, 0.116);
      headGrp.add(smileCurve);
    });

    headGrp.add(headSphere, openEyesGroup, closedEyesGroup);
    root.add(body, tummy, bellyHeart, collar, bellPivot, headGrp);
    return {
      root,
      handheldId,
      rarity,
      leftEar,
      rightEar,
      eyeGlints,
      floatingHearts,
      openEyesGroup,
      closedEyesGroup,
      wavingArm,
      bellPivot,
    };
  }

  // ================= 2. COMMON & SPECIAL PLUSHIES (BabyThree / Labubu / Cartoon) =================
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.118, 20, 16), furMat);
  body.scale.set(1.06, 1.08, 0.88);
  body.position.set(0, -0.024, 0);

  const bellyPatch = new THREE.Mesh(new THREE.SphereGeometry(0.082, 14, 12), softAccentMat);
  bellyPatch.scale.set(1, 1.04, 0.52);
  bellyPatch.position.set(0, -0.028, 0.068);
  root.add(body, bellyPatch);

  addPlushLimbs(root, furMat, softAccentMat);

  // Cute plush head hood + inset vinyl face (BabyThree / Labubu signature look!)
  const headGrp = new THREE.Group();
  headGrp.position.set(0, 0.165, 0.008);

  const hoodSphere = new THREE.Mesh(new THREE.SphereGeometry(0.124, 22, 18), furMat);
  hoodSphere.scale.set(1.08, 0.96, 0.94);

  const facePlate = new THREE.Mesh(
    new THREE.SphereGeometry(0.098, 20, 16),
    handheldId === 'doll_pepe_frog' ? furMat : vinylFaceMat,
  );
  facePlate.scale.set(1.05, 0.92, 0.56);
  facePlate.position.set(0, -0.008, 0.064);

  headGrp.add(hoodSphere, facePlate);

  if (handheldId === 'doll_mimi_bunny') {
    // Soft pink ribbon bow at neck
    const bowMat = clayMat('#FB7185', 0.52);
    const bow = new THREE.Mesh(new RoundedBoxGeometry(0.072, 0.026, 0.02, 2, 0.01), bowMat);
    bow.position.set(0, 0.078, 0.096);
    root.add(bow);

    // Tall curved bunny ears
    ([-1, 1] as const).forEach((s) => {
      const earPivot = new THREE.Group();
      earPivot.position.set(s * 0.064, 0.095, 0);
      earPivot.rotation.z = -s * 0.24;
      const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.092, 8, 12), furMat);
      ear.scale.set(0.95, 1, 0.58);
      ear.position.y = 0.058;
      const inner = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.017, 0.065, 6, 10),
        softAccentMat,
      );
      inner.scale.set(0.9, 1, 0.45);
      inner.position.set(0, 0.056, 0.012);
      earPivot.add(ear, inner);
      headGrp.add(earPivot);
    });
    addCuteEyesAndBlush(headGrp, eyeGlints, {
      faceZ: 0.114,
      eyeY: 0.005,
      eyeX: 0.04,
      eyeRadius: 0.017,
      irisHex: '#3B232B',
    });
    addTinySmile(headGrp, -0.028, 0.114);
  } else if (handheldId === 'doll_coco_bear') {
    // Cozy denim-cream bib pocket & red ribbon
    const bibMat = clayMat('#60A5FA', 0.72);
    const bib = new THREE.Mesh(new RoundedBoxGeometry(0.115, 0.088, 0.028, 2, 0.012), bibMat);
    bib.position.set(0, -0.018, 0.098);
    const redBow = new THREE.Mesh(
      new RoundedBoxGeometry(0.064, 0.024, 0.018, 2, 0.008),
      clayMat('#EF4444', 0.45),
    );
    redBow.position.set(0, 0.072, 0.096);
    root.add(bib, redBow);

    ([-1, 1] as const).forEach((s) => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 10), furMat);
      ear.scale.set(1, 1, 0.62);
      ear.position.set(s * 0.095, 0.092, -0.002);
      const inner = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 8), softAccentMat);
      inner.scale.set(1, 1, 0.5);
      inner.position.set(s * 0.095, 0.092, 0.016);
      headGrp.add(ear, inner);
    });
    const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 10), softAccentMat);
    muzzle.scale.set(1.18, 0.86, 0.56);
    muzzle.position.set(0, -0.022, 0.106);
    headGrp.add(muzzle);

    addCuteEyesAndBlush(headGrp, eyeGlints, {
      faceZ: 0.114,
      eyeY: 0.008,
      eyeX: 0.042,
      eyeRadius: 0.016,
      irisHex: '#271A14',
    });
    addTinySmile(headGrp, -0.028, 0.122, '#3D2419');
  } else if (handheldId === 'doll_pepe_frog') {
    // Raised big frog eyes + mini strawberry beret
    const whiteMat = pureWhiteMat;
    const blackMat = glossyClayMat('#1B1D24', 0.14);
    const berryHat = clayMat('#FB7185', 0.58);
    const leafMat = clayMat('#22C55E', 0.65);

    ([-1, 1] as const).forEach((s) => {
      const eyeBump = new THREE.Mesh(new THREE.SphereGeometry(0.042, 14, 12), furMat);
      eyeBump.position.set(s * 0.058, 0.094, 0.032);
      const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.033, 12, 10), whiteMat);
      eyeWhite.scale.set(1, 1, 0.65);
      eyeWhite.position.set(s * 0.058, 0.096, 0.056);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), blackMat);
      pupil.scale.set(1, 1, 0.6);
      pupil.position.set(s * 0.058, 0.096, 0.072);
      const cheek = new THREE.Mesh(
        new THREE.SphereGeometry(0.024, 10, 8),
        clayMat('#FF8FA3', 0.72),
      );
      cheek.scale.set(1.25, 0.72, 0.36);
      cheek.position.set(s * 0.068, -0.012, 0.11);
      headGrp.add(eyeBump, eyeWhite, pupil, cheek);
    });

    const hat = new THREE.Mesh(new THREE.SphereGeometry(0.036, 12, 10), berryHat);
    hat.scale.set(1.1, 0.85, 1.1);
    hat.position.set(0, 0.128, 0.01);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.024, 6), leafMat);
    stem.position.set(0, 0.16, 0.01);
    const wideSmile = new THREE.Mesh(
      new THREE.TorusGeometry(0.036, 0.004, 6, 14, Math.PI),
      clayMat('#3B2A26', 0.5),
    );
    wideSmile.rotation.z = Math.PI;
    wideSmile.position.set(0, -0.01, 0.114);
    headGrp.add(hat, stem, wideSmile);
  } else if (handheldId === 'doll_boba_capy') {
    // Relaxed sleepy capybara + tangerine on top
    const snout = new THREE.Mesh(
      new RoundedBoxGeometry(0.088, 0.058, 0.044, 3, 0.024),
      clayMat('#D7A97C', 0.75),
    );
    snout.position.set(0, -0.024, 0.104);
    headGrp.add(snout);

    ([-1, 1] as const).forEach((s) => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), furMat);
      ear.scale.set(0.85, 1.0, 0.55);
      ear.position.set(s * 0.096, 0.072, -0.01);
      headGrp.add(ear);
    });

    const orange = new THREE.Mesh(
      new THREE.SphereGeometry(0.038, 12, 10),
      clayMat('#FB923C', 0.45),
    );
    orange.scale.set(1.12, 0.88, 1.12);
    orange.position.set(0, 0.138, 0.008);
    const leaf = new THREE.Mesh(
      new THREE.SphereGeometry(0.016, 8, 6),
      clayMat('#22C55E', 0.6),
    );
    leaf.scale.set(1.5, 0.45, 0.8);
    leaf.position.set(0.014, 0.172, 0.01);
    leaf.rotation.z = 0.35;
    headGrp.add(orange, leaf);

    addCuteEyesAndBlush(headGrp, eyeGlints, {
      faceZ: 0.114,
      eyeY: 0.014,
      eyeX: 0.046,
      eyeRadius: 0.018,
      sleepy: true,
    });
    addTinySmile(headGrp, -0.026, 0.122, '#4B3022');
  } else if (handheldId === 'doll_lulu_sheep') {
    // Scalloped cloud wool curls + golden bell
    const woolMat = clayMat('#FFF8F0', 0.88);
    const puffAngles = [-2.2, -1.5, -0.75, 0, 0.75, 1.5, 2.2];
    puffAngles.forEach((a) => {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 8), woolMat);
      puff.position.set(Math.sin(a) * 0.1, Math.cos(a) * 0.095 + 0.015, 0.02);
      headGrp.add(puff);
    });
    ([-1, 1] as const).forEach((s) => {
      const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.024, 0.056, 6, 10), softAccentMat);
      ear.scale.set(1, 1, 0.52);
      ear.position.set(s * 0.118, 0.008, 0.016);
      ear.rotation.z = s * 0.48;
      headGrp.add(ear);
    });
    const bell = new THREE.Mesh(
      new THREE.SphereGeometry(0.022, 10, 8),
      glossyClayMat('#FACC15', 0.22),
    );
    bell.position.set(0, 0.068, 0.1);
    root.add(bell);

    addCuteEyesAndBlush(headGrp, eyeGlints, {
      faceZ: 0.112,
      eyeY: 0.004,
      eyeX: 0.038,
      eyeRadius: 0.016,
      irisHex: '#3B282A',
    });
    addTinySmile(headGrp, -0.026, 0.114);
  } else if (handheldId === 'doll_pipi_duck') {
    // Duck orange bill + mint beret
    const billMat = clayMat('#FB923C', 0.48);
    const bill = new THREE.Mesh(new THREE.SphereGeometry(0.032, 12, 10), billMat);
    bill.scale.set(1.28, 0.65, 0.92);
    bill.position.set(0, -0.02, 0.118);

    const beret = new THREE.Mesh(
      new THREE.SphereGeometry(0.068, 14, 12),
      clayMat('#5EEAD4', 0.62),
    );
    beret.scale.set(1.18, 0.55, 1.12);
    beret.position.set(-0.024, 0.118, 0.008);
    beret.rotation.z = 0.22;

    const topTuft = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), clayMat('#0F766E', 0.5));
    topTuft.position.set(-0.032, 0.154, 0.008);
    headGrp.add(bill, beret, topTuft);

    addCuteEyesAndBlush(headGrp, eyeGlints, {
      faceZ: 0.114,
      eyeY: 0.012,
      eyeX: 0.042,
      eyeRadius: 0.017,
      irisHex: '#1F1A24',
    });
  } else if (handheldId === 'doll_labu_mint') {
    // SPECIAL 1: LABUBU-INSPIRED MINT MONSTER (Animated upright rabbit ears + sparkly eyes + cute fangs)
    const earL = new THREE.Group();
    earL.position.set(-0.062, 0.098, -0.004);
    earL.rotation.z = 0.14;
    const earR = new THREE.Group();
    earR.position.set(0.062, 0.098, -0.004);
    earR.rotation.z = -0.14;

    [earL, earR].forEach((ep) => {
      const outer = new THREE.Mesh(new THREE.CapsuleGeometry(0.029, 0.105, 8, 12), furMat);
      outer.scale.set(0.95, 1, 0.56);
      outer.position.y = 0.068;
      const inner = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.016, 0.072, 6, 10),
        clayMat('#FFD6E4', 0.72),
      );
      inner.scale.set(0.88, 1, 0.42);
      inner.position.set(0, 0.064, 0.012);
      ep.add(outer, inner);
      headGrp.add(ep);
    });
    leftEar = earL;
    rightEar = earR;

    // Mischievous Labubu wide smile with tiny white tooth triangles
    const grinLine = new THREE.Mesh(
      new THREE.TorusGeometry(0.046, 0.004, 6, 16, Math.PI),
      clayMat('#33252C', 0.45),
    );
    grinLine.rotation.z = Math.PI;
    grinLine.position.set(0, -0.026, 0.114);
    headGrp.add(grinLine);

    for (let t = -2; t <= 2; t++) {
      const fang = new THREE.Mesh(new THREE.ConeGeometry(0.007, 0.015, 4), pureWhiteMat);
      fang.rotation.x = Math.PI;
      fang.position.set(t * 0.016, -0.044 - Math.abs(t) * 0.001, 0.116);
      headGrp.add(fang);
    }

    const labuNose = new THREE.Mesh(
      new THREE.SphereGeometry(0.014, 10, 8),
      glossyClayMat('#FB7185', 0.24),
    );
    labuNose.scale.set(1.25, 0.85, 0.7);
    labuNose.position.set(0, -0.016, 0.118);
    headGrp.add(labuNose);

    addCuteEyesAndBlush(headGrp, eyeGlints, {
      faceZ: 0.114,
      eyeY: 0.012,
      eyeX: 0.042,
      eyeRadius: 0.021,
      irisHex: '#0D9488',
      sparkle: true,
    });
  } else if (handheldId === 'doll_baby3_berry') {
    // SPECIAL 2: BABYTHREE BERRY DELUXE (Whipped lace hood + berry blossom crown + heart pendant + floating hearts!)
    const leafMat = clayMat('#4ADE80', 0.58);
    const creamLaceMat = clayMat('#FFF8FB', 0.78);
    const satinRibbonMat = clayMat('#FB7185', 0.42);
    const seedMat = clayMat('#FDE047', 0.4);
    const blossomMat = clayMat('#FFFBEB', 0.6);

    // Scalloped cream Peter Pan lace collar + satin ribbon bow + 3D heart pendant
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.094, 0.014, 10, 22), creamLaceMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, 0.068, 0.008);
    root.add(collar);

    for (let i = -3; i <= 3; i++) {
      const a = i * 0.34;
      const ruffle = new THREE.Mesh(new THREE.SphereGeometry(0.017, 10, 8), creamLaceMat);
      ruffle.position.set(Math.sin(a) * 0.098, 0.056, Math.cos(a) * 0.096);
      root.add(ruffle);
    }

    ([-1, 1] as const).forEach((s) => {
      const bowLoop = new THREE.Mesh(new RoundedBoxGeometry(0.036, 0.022, 0.016, 2, 0.008), satinRibbonMat);
      bowLoop.position.set(s * 0.023, 0.064, 0.102);
      bowLoop.rotation.z = s * 0.28;
      root.add(bowLoop);
    });

    const heartPendant = createPlushHeartMesh('#F43F5E', '#FB7185', 0.25, 0.032);
    heartPendant.position.set(0, 0.052, 0.11);
    root.add(heartPendant);

    // Heart patch on plush belly
    const bellyHeart = createPlushHeartMesh('#FDA4AF', '#FB7185', 0.12, 0.038);
    bellyHeart.position.set(0, -0.026, 0.112);
    root.add(bellyHeart);

    // Whipped cream lace hood framing the vinyl face
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2;
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.021, 10, 8), creamLaceMat);
      puff.scale.set(1, 1, 0.72);
      puff.position.set(Math.cos(ang) * 0.096, Math.sin(ang) * 0.086 - 0.006, 0.072);
      headGrp.add(puff);
    }

    // Golden strawberry seeds dotted across upper hood
    const seedPositions: Array<[number, number, number]> = [
      [-0.072, 0.068, 0.088],
      [0.072, 0.068, 0.088],
      [-0.042, 0.094, 0.072],
      [0.042, 0.094, 0.072],
      [-0.106, 0.024, 0.066],
      [0.106, 0.024, 0.066],
    ];
    seedPositions.forEach(([sx, sy, sz]) => {
      const seed = new THREE.Mesh(new THREE.SphereGeometry(0.007, 8, 6), seedMat);
      seed.scale.set(0.85, 1.3, 0.65);
      seed.position.set(sx, sy, sz);
      headGrp.add(seed);
    });

    // Animated plush round ears with ear ribbon bows ("vẩy tai nhẹ")
    const earL = new THREE.Group();
    earL.position.set(-0.088, 0.092, 0.004);
    earL.rotation.z = 0.2;
    earL.userData.baseRotZ = 0.2;

    const earR = new THREE.Group();
    earR.position.set(0.088, 0.092, 0.004);
    earR.rotation.z = -0.2;
    earR.userData.baseRotZ = -0.2;

    ([-1, 1] as const).forEach((s, idx) => {
      const ep = idx === 0 ? earL : earR;
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.046, 14, 12), furMat);
      ear.scale.set(1.02, 1.06, 0.6);
      const inner = new THREE.Mesh(new THREE.SphereGeometry(0.027, 10, 8), creamLaceMat);
      inner.scale.set(1, 1, 0.45);
      inner.position.z = 0.018;

      const earBow = new THREE.Mesh(new RoundedBoxGeometry(0.036, 0.018, 0.014, 2, 0.006), satinRibbonMat);
      earBow.position.set(-s * 0.016, -0.026, 0.024);
      earBow.rotation.z = s * 0.35;

      ep.add(ear, inner, earBow);
      headGrp.add(ep);
    });
    leftEar = earL;
    rightEar = earR;

    // 6-leaf strawberry calyx + delicate white strawberry blossom on crown
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8), leafMat);
      leaf.scale.set(1.45, 0.38, 0.78);
      leaf.position.set(Math.cos(a) * 0.028, 0.122, Math.sin(a) * 0.028);
      leaf.rotation.y = -a;
      headGrp.add(leaf);
    }
    const blossomGrp = new THREE.Group();
    blossomGrp.position.set(0.028, 0.132, 0.024);
    blossomGrp.rotation.z = -0.25;
    for (let p = 0; p < 5; p++) {
      const pa = (p / 5) * Math.PI * 2;
      const petal = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 6), blossomMat);
      petal.scale.set(1, 0.55, 1);
      petal.position.set(Math.cos(pa) * 0.013, 0, Math.sin(pa) * 0.013);
      blossomGrp.add(petal);
    }
    const blossomCenter = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), seedMat);
    blossomCenter.position.y = 0.003;
    blossomGrp.add(blossomCenter);
    headGrp.add(blossomGrp);

    addCuteEyesAndBlush(headGrp, eyeGlints, {
      faceZ: 0.114,
      eyeY: 0.006,
      eyeX: 0.041,
      eyeRadius: 0.023,
      irisHex: '#E11D63',
      sparkle: true,
      cheekHex: '#FB7185',
    });
    addTinySmile(headGrp, -0.028, 0.116, '#F43F5E');

    // Floating dreamy 3D hearts rising softly around BabyThree Berry ("trái tim nhẹ nhẹ bay ra từ nó")
    const heartColors = ['#FF4D8D', '#FB7185', '#F472B6', '#FDA4AF', '#FF6B9D'];
    for (let h = 0; h < 5; h++) {
      const side = h % 2 === 0 ? 1 : -1;
      const heartMesh = createPlushHeartMesh(
        heartColors[h],
        heartColors[h],
        0.34,
        0.024 + (h % 2) * 0.006,
      );
      root.add(heartMesh);
      floatingHearts.push({
        mesh: heartMesh,
        phase: h / 5,
        baseX: side * (0.145 + (h % 3) * 0.028),
        baseZ: 0.04 + (h % 2) * 0.045,
        radius: 0.022 + (h % 2) * 0.01,
        speed: 0.28 + (h % 3) * 0.05,
      });
    }
  } else if (handheldId === 'doll_luna_kuromi') {
    // SPECIAL 3: LUNA KUROMI-INSPIRED BUNNY (Dark jester hood + animated pointed ears + violet crystal eyes)
    const darkHoodMat = clayMat('#241E38', 0.72);
    const pinkAccentMat = clayMat('#F472B6', 0.56);

    hoodSphere.material = darkHoodMat;
    const jesterCollar = new THREE.Mesh(
      new THREE.TorusGeometry(0.094, 0.018, 10, 20),
      clayMat('#DDD6FE', 0.68),
    );
    jesterCollar.rotation.x = Math.PI / 2;
    jesterCollar.position.set(0, 0.07, 0.008);
    root.add(jesterCollar);

    const earL = new THREE.Group();
    earL.position.set(-0.07, 0.095, -0.004);
    earL.rotation.z = 0.28;
    const earR = new THREE.Group();
    earR.position.set(0.07, 0.095, -0.004);
    earR.rotation.z = -0.28;
    [earL, earR].forEach((ep) => {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.036, 0.135, 12), darkHoodMat);
      cone.scale.set(1, 1, 0.62);
      cone.position.y = 0.064;
      const pom = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), furMat);
      pom.position.y = 0.132;
      ep.add(cone, pom);
      headGrp.add(ep);
    });
    leftEar = earL;
    rightEar = earR;

    const foreheadBadge = new THREE.Mesh(
      new THREE.SphereGeometry(0.022, 10, 8),
      pinkAccentMat,
    );
    foreheadBadge.scale.set(1.15, 0.95, 0.45);
    foreheadBadge.position.set(0, 0.068, 0.114);
    headGrp.add(foreheadBadge);

    addCuteEyesAndBlush(headGrp, eyeGlints, {
      faceZ: 0.114,
      eyeY: 0.005,
      eyeX: 0.041,
      eyeRadius: 0.021,
      irisHex: '#7C3AED',
      sparkle: true,
      cheekHex: '#F472B6',
    });
    addTinySmile(headGrp, -0.03, 0.115, '#F472B6');
  }

  root.add(headGrp);

  return {
    root,
    handheldId,
    rarity,
    leftEar,
    rightEar,
    eyeGlints,
    floatingHearts,
    openEyesGroup,
    closedEyesGroup,
    wavingArm,
    bellPivot,
  };
}

export function updateDollPlushAnimation(doll: DollPlushRig | undefined, elapsed: number): void {
  if (!doll) return;

  // Special & Secret Dolls: Gentle ear wiggle around each doll's natural rest angle
  if (doll.leftEar && doll.rightEar) {
    const leftBase = (doll.leftEar.userData.baseRotZ as number | undefined) ?? 0.18;
    const rightBase = (doll.rightEar.userData.baseRotZ as number | undefined) ?? -0.18;
    const earWiggle = Math.sin(elapsed * 4.4) * 0.12 + Math.sin(elapsed * 8.8) * 0.035;
    const dir = leftBase < 0 ? -1 : 1;
    doll.leftEar.rotation.z = leftBase + earWiggle * dir;
    doll.rightEar.rotation.z = rightBase - earWiggle * dir;
    doll.leftEar.rotation.x = Math.cos(elapsed * 3.1) * 0.06;
    doll.rightEar.rotation.x = Math.cos(elapsed * 3.1 + 0.5) * 0.06;
  }

  if (doll.eyeGlints.length > 0) {
    for (let i = 0; i < doll.eyeGlints.length; i++) {
      const pulse = 0.85 + 0.42 * Math.sin(elapsed * 6.2 + i * 1.1);
      doll.eyeGlints[i].scale.set(pulse, pulse, 0.5);
      doll.eyeGlints[i].rotation.z = elapsed * 2.4 + i;
    }
  }

  // BabyThree Berry: Soft floating hearts rising gently around the plushie
  if (doll.floatingHearts.length > 0) {
    for (let i = 0; i < doll.floatingHearts.length; i++) {
      const h = doll.floatingHearts[i];
      const u = ((elapsed * h.speed + h.phase) % 1 + 1) % 1;
      h.mesh.position.y = -0.02 + u * 0.42;
      h.mesh.position.x = h.baseX + Math.sin(elapsed * 2.2 + h.phase * Math.PI * 2) * h.radius;
      h.mesh.position.z = h.baseZ + Math.cos(elapsed * 1.8 + h.phase * Math.PI * 2) * h.radius * 0.6;
      h.mesh.rotation.z = Math.sin(elapsed * 2.8 + h.phase * 6) * 0.24;
      h.mesh.rotation.y = elapsed * 0.9 + h.phase * 4;
      const pop = Math.sin(u * Math.PI) * (0.85 + 0.15 * Math.sin(elapsed * 4.5 + i));
      h.mesh.scale.setScalar(Math.max(0.001, 0.03 * pop));
    }
  }

  // Secret Cinnamo Angel: Natural eye blink ("chớp mắt") + gentle paw wave ("vẩy tay nhẹ") + bell jingle
  if (doll.openEyesGroup && doll.closedEyesGroup) {
    const cycle = elapsed % 3.2;
    const blinking = cycle > 2.98 && cycle < 3.16;
    doll.openEyesGroup.visible = !blinking;
    doll.closedEyesGroup.visible = blinking;
  }

  if (doll.wavingArm) {
    doll.wavingArm.rotation.z = Math.sin(elapsed * 5.2) * 0.22 - 0.06;
    doll.wavingArm.rotation.x = Math.cos(elapsed * 5.2) * 0.06;
  }

  if (doll.bellPivot) {
    doll.bellPivot.rotation.z = Math.sin(elapsed * 4.8) * 0.1;
  }
}
