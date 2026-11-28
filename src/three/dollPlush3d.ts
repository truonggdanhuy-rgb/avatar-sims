import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {DollRarity, getDollByHandheld} from '../data/hddollCatalog';
import {HandheldStyle} from '../types/game';
import {clayMat, glossyClayMat} from './materials';

export interface DollPlushRig {
  root: THREE.Group;
  handheldId: HandheldStyle;
  rarity: DollRarity;
  leftEar?: THREE.Object3D;
  rightEar?: THREE.Object3D;
  eyeGlints: THREE.Object3D[];
  openEyesGroup?: THREE.Object3D;
  closedEyesGroup?: THREE.Object3D;
  wavingArm?: THREE.Object3D;
  bellPivot?: THREE.Object3D;
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

  // ================= 1. SECRET: DORAEMON =================
  if (handheldId === 'doll_secret_doraemon') {
    const doraBlueMat = clayMat('#1E88E5', 0.62);
    const collarRedMat = glossyClayMat('#E53935', 0.28);
    const goldBellMat = glossyClayMat('#FFD54F', 0.2);
    const blackLineMat = clayMat('#1B1D24', 0.45);
    const mouthRedMat = clayMat('#D32F2F', 0.55);

    // Chubby round blue body + white tummy + 4D pocket
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.118, 20, 16), doraBlueMat);
    body.scale.set(1.04, 1.06, 0.9);
    body.position.set(0, -0.022, 0);

    const tummy = new THREE.Mesh(new THREE.SphereGeometry(0.088, 16, 14), pureWhiteMat);
    tummy.scale.set(1.02, 1.02, 0.55);
    tummy.position.set(0, -0.025, 0.068);

    const pocket = new THREE.Mesh(
      new THREE.CylinderGeometry(0.056, 0.056, 0.016, 16, 1, false, 0, Math.PI),
      pureWhiteMat,
    );
    pocket.rotation.x = Math.PI / 2;
    pocket.rotation.z = Math.PI;
    pocket.position.set(0, -0.034, 0.108);

    const pocketRim = new THREE.Mesh(
      new RoundedBoxGeometry(0.11, 0.008, 0.014, 1, 0.003),
      clayMat('#CBD5E1', 0.6),
    );
    pocketRim.position.set(0, -0.034, 0.112);

    // Signature red collar & jingling golden bell
    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(0.088, 0.016, 10, 24),
      collarRedMat,
    );
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, 0.072, 0.006);

    bellPivot = new THREE.Group();
    bellPivot.position.set(0, 0.065, 0.098);
    const bellSphere = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 10), goldBellMat);
    const bellStripe = new THREE.Mesh(
      new THREE.TorusGeometry(0.021, 0.0035, 6, 16),
      clayMat('#B45309', 0.4),
    );
    bellStripe.rotation.x = Math.PI / 2;
    bellPivot.add(bellSphere, bellStripe);

    addPlushLimbs(root, doraBlueMat, pureWhiteMat, {
      skipRightArm: true,
      shortRoundedPaws: true,
    });

    // Right arm waving paw ("vẩy tay nhẹ")
    wavingArm = new THREE.Group();
    wavingArm.position.set(0.105, 0.044, 0.036);
    const waveTube = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.029, 0.052, 6, 10),
      doraBlueMat,
    );
    waveTube.position.set(0.025, 0.036, 0.015);
    waveTube.rotation.z = -0.68;
    waveTube.rotation.x = -0.25;
    const wavePaw = new THREE.Mesh(new THREE.SphereGeometry(0.034, 12, 10), pureWhiteMat);
    wavePaw.position.set(0.048, 0.068, 0.026);
    wavingArm.add(waveTube, wavePaw);
    root.add(wavingArm);

    // Big iconic Doraemon round head
    const headGrp = new THREE.Group();
    headGrp.position.set(0, 0.168, 0.008);

    const headSphere = new THREE.Mesh(new THREE.SphereGeometry(0.126, 22, 18), doraBlueMat);
    headSphere.scale.set(1.06, 0.98, 0.96);

    const whiteMask = new THREE.Mesh(new THREE.SphereGeometry(0.108, 20, 16), pureWhiteMat);
    whiteMask.scale.set(1.04, 0.94, 0.62);
    whiteMask.position.set(0, -0.014, 0.066);

    // Nose + wide cheerful smile + whiskers
    const redNose = new THREE.Mesh(new THREE.SphereGeometry(0.02, 12, 10), collarRedMat);
    redNose.position.set(0, 0.012, 0.132);

    const noseBridge = new THREE.Mesh(
      new THREE.CylinderGeometry(0.003, 0.003, 0.044, 6),
      blackLineMat,
    );
    noseBridge.position.set(0, -0.016, 0.126);

    const smileMouth = new THREE.Mesh(
      new THREE.CylinderGeometry(0.048, 0.044, 0.012, 16, 1, false, 0, Math.PI),
      mouthRedMat,
    );
    smileMouth.rotation.x = Math.PI / 2;
    smileMouth.rotation.z = Math.PI;
    smileMouth.position.set(0, -0.036, 0.118);

    ([-1, 1] as const).forEach((s) => {
      [-0.18, 0, 0.18].forEach((ang, wi) => {
        const whisker = new THREE.Mesh(
          new THREE.CylinderGeometry(0.0024, 0.0024, 0.052, 6),
          blackLineMat,
        );
        whisker.rotation.z = Math.PI / 2 + s * ang;
        whisker.rotation.y = s * 0.25;
        whisker.position.set(s * 0.068, 0.002 - wi * 0.014, 0.114);
        headGrp.add(whisker);
      });
    });

    // Animated Open Eyes vs Closed Blink Eyes ("chớp mắt")
    openEyesGroup = new THREE.Group();
    closedEyesGroup = new THREE.Group();
    closedEyesGroup.visible = false;

    ([-1, 1] as const).forEach((s) => {
      const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.027, 14, 12), pureWhiteMat);
      sclera.scale.set(0.84, 1.12, 0.5);
      sclera.position.set(s * 0.025, 0.048, 0.116);

      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.011, 10, 8), blackLineMat);
      pupil.scale.set(0.85, 1.15, 0.5);
      pupil.position.set(s * 0.018, 0.048, 0.129);

      const glint = new THREE.Mesh(
        new THREE.SphereGeometry(0.0045, 6, 6),
        new THREE.MeshBasicMaterial({color: '#FFFFFF'}),
      );
      glint.position.set(s * 0.016, 0.054, 0.135);
      openEyesGroup!.add(sclera, pupil, glint);

      // Closed happy blink curve on white sclera
      const closedSclera = sclera.clone();
      const closedArc = new THREE.Mesh(
        new THREE.TorusGeometry(0.015, 0.0036, 6, 12, Math.PI),
        blackLineMat,
      );
      closedArc.position.set(s * 0.024, 0.044, 0.128);
      closedEyesGroup!.add(closedSclera, closedArc);
    });

    headGrp.add(
      headSphere,
      whiteMask,
      redNose,
      noseBridge,
      smileMouth,
      openEyesGroup,
      closedEyesGroup,
    );
    root.add(body, tummy, pocket, pocketRim, collar, bellPivot, headGrp);
    return {
      root,
      handheldId,
      rarity,
      eyeGlints,
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
    // SPECIAL 2: BABYTHREE BERRY (Animated bear ears + strawberry crown + starry sparkly eyes)
    const leafMat = clayMat('#4ADE80', 0.6);
    const laceMat = clayMat('#FFF5F8', 0.72);
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.094, 0.018, 10, 20), laceMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, 0.072, 0.008);
    const heartGem = new THREE.Mesh(
      new THREE.SphereGeometry(0.02, 10, 8),
      glossyClayMat('#F43F5E', 0.2),
    );
    heartGem.position.set(0, 0.068, 0.102);
    root.add(collar, heartGem);

    const earL = new THREE.Group();
    earL.position.set(-0.088, 0.088, 0);
    const earR = new THREE.Group();
    earR.position.set(0.088, 0.088, 0);
    [earL, earR].forEach((ep) => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.044, 12, 10), furMat);
      ear.scale.set(1, 1, 0.6);
      const inner = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 8), softAccentMat);
      inner.scale.set(1, 1, 0.45);
      inner.position.z = 0.016;
      ep.add(ear, inner);
      headGrp.add(ep);
    });
    leftEar = earL;
    rightEar = earR;

    // Strawberry calyx leaves on crown
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 6), leafMat);
      leaf.scale.set(1.4, 0.4, 0.75);
      leaf.position.set(Math.cos(a) * 0.026, 0.122, Math.sin(a) * 0.026);
      leaf.rotation.y = -a;
      headGrp.add(leaf);
    }

    addCuteEyesAndBlush(headGrp, eyeGlints, {
      faceZ: 0.114,
      eyeY: 0.006,
      eyeX: 0.041,
      eyeRadius: 0.022,
      irisHex: '#BE185D',
      sparkle: true,
      cheekHex: '#FB7185',
    });
    addTinySmile(headGrp, -0.03, 0.115, '#F43F5E');
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
    openEyesGroup,
    closedEyesGroup,
    wavingArm,
    bellPivot,
  };
}

export function updateDollPlushAnimation(doll: DollPlushRig | undefined, elapsed: number): void {
  if (!doll) return;

  // Special Dolls: Gentle ear wiggle ("vẩy tai nhẹ") + twinkling crystal eye glints ("mắt long lanh")
  if (doll.leftEar && doll.rightEar) {
    const earWiggle = Math.sin(elapsed * 4.4) * 0.11 + Math.sin(elapsed * 8.8) * 0.03;
    doll.leftEar.rotation.z = 0.18 + earWiggle;
    doll.rightEar.rotation.z = -0.18 - earWiggle;
    doll.leftEar.rotation.x = Math.cos(elapsed * 3.1) * 0.05;
    doll.rightEar.rotation.x = Math.cos(elapsed * 3.1 + 0.5) * 0.05;
  }

  if (doll.eyeGlints.length > 0) {
    for (let i = 0; i < doll.eyeGlints.length; i++) {
      const pulse = 0.85 + 0.42 * Math.sin(elapsed * 6.2 + i * 1.1);
      doll.eyeGlints[i].scale.set(pulse, pulse, 0.5);
      doll.eyeGlints[i].rotation.z = elapsed * 2.4 + i;
    }
  }

  // Secret Doraemon: Natural eye blink ("chớp mắt") + gentle paw wave ("vẩy tay nhẹ") + bell jingle
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
