import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {PetSpeciesId} from '../types/game';

export type PetAnimMode =
  | 'idle'
  | 'walk'
  | 'fly'
  | 'play_jump'
  | 'play_circle'
  | 'held_arms'
  | 'held_orbit'
  | 'shop_play';

export interface PetRig {
  speciesId: PetSpeciesId;
  root: THREE.Group;
  bodyPivot: THREE.Group;
  headPivot: THREE.Group;
  tailPivot: THREE.Group;
  legs: THREE.Group[];
  ears?: [THREE.Group, THREE.Group];
  leftWing?: THREE.Group;
  rightWing?: THREE.Group;
  shadowDisc?: THREE.Mesh;
  sickGroup?: THREE.Group;
  dispose: () => void;
}

function makeClay(hex: string, roughness = 0.7): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: hex,
    roughness,
    metalness: 0.03,
  });
}

function makeGlossy(hex: string, roughness = 0.14): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: hex,
    roughness,
    metalness: 0.08,
  });
}

export function buildPetModel(
  speciesId: PetSpeciesId,
  options?: {
    scale?: number;
    sick?: boolean;
    withShadow?: boolean;
  },
): PetRig {
  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  const headPivot = new THREE.Group();
  const tailPivot = new THREE.Group();
  const legs: THREE.Group[] = [];
  const scale = options?.scale ?? 1;
  const withShadow = options?.withShadow ?? true;

  const ownedGeos: THREE.BufferGeometry[] = [];
  const ownedMats: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    ownedGeos.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    ownedMats.push(m);
    return m;
  };

  let shadowDisc: THREE.Mesh | undefined;
  let ears: [THREE.Group, THREE.Group] | undefined;
  let leftWing: THREE.Group | undefined;
  let rightWing: THREE.Group | undefined;

  if (withShadow) {
    const shMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: '#2A241E',
        transparent: true,
        opacity: speciesId === 'blue_bird' ? 0.18 : 0.24,
        depthWrite: false,
      }),
    );
    shadowDisc = new THREE.Mesh(
      trackGeo(
        new THREE.CircleGeometry((speciesId === 'blue_bird' ? 0.19 : 0.25) * scale, 20),
      ),
      shMat,
    );
    shadowDisc.rotation.x = -Math.PI / 2;
    shadowDisc.position.y = 0.01;
    root.add(shadowDisc);
  }

  root.add(bodyPivot);
  bodyPivot.scale.setScalar(scale);

  if (speciesId === 'brown_puppy') {
    const furMat = trackMat(makeClay('#C98249', 0.68));
    const darkFurMat = trackMat(makeClay('#8F4E26', 0.72));
    const creamMat = trackMat(makeClay('#FFF3DC', 0.72));
    const collarMat = trackMat(makeClay('#E45B56', 0.52));
    const bellMat = trackMat(makeGlossy('#F8CA44', 0.2));
    const noseMat = trackMat(makeGlossy('#391E14', 0.16));
    const eyeMat = trackMat(makeGlossy('#1C1411', 0.08));
    const glintMat = trackMat(new THREE.MeshBasicMaterial({color: '#FFFFFF'}));
    const blushMat = trackMat(makeClay('#F4978E', 0.78));
    const tongueMat = trackMat(makeClay('#F27885', 0.6));

    // Plump, rounded chibi torso & cozy hips
    const torso = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.155, 20, 16)), furMat);
    torso.scale.set(0.96, 0.92, 1.28);
    torso.position.set(0, 0.22, -0.02);
    bodyPivot.add(torso);

    // Fluffy cloud-like chest ruff
    const chestCenter = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.105, 16, 12)), creamMat);
    chestCenter.scale.set(0.88, 0.96, 0.75);
    chestCenter.position.set(0, 0.215, 0.092);
    const chestFluffL = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.055, 12, 10)), creamMat);
    chestFluffL.position.set(-0.048, 0.238, 0.125);
    const chestFluffR = chestFluffL.clone();
    chestFluffR.position.x = 0.048;
    bodyPivot.add(chestCenter, chestFluffL, chestFluffR);

    // Cozy coral collar + shiny gold bell
    const collar = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.106, 0.022, 12, 24)),
      collarMat,
    );
    collar.rotation.x = Math.PI / 2 - 0.36;
    collar.position.set(0, 0.295, 0.09);
    bodyPivot.add(collar);

    const bellRing = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.015, 0.005, 8, 14)),
      bellMat,
    );
    bellRing.position.set(0, 0.278, 0.186);
    const bell = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.03, 12, 10)), bellMat);
    bell.position.set(0, 0.252, 0.194);
    bodyPivot.add(bellRing, bell);

    // 4 cute stubby legs with soft round paws
    const legOffsets: [number, number, number][] = [
      [-0.088, 0.142, 0.095],
      [0.088, 0.142, 0.095],
      [-0.092, 0.142, -0.115],
      [0.092, 0.142, -0.115],
    ];
    for (const [lx, ly, lz] of legOffsets) {
      const legGroup = new THREE.Group();
      legGroup.position.set(lx, ly, lz);
      const upperLeg = new THREE.Mesh(
        trackGeo(new THREE.CapsuleGeometry(0.039, 0.068, 8, 12)),
        furMat,
      );
      upperLeg.position.y = -0.048;
      const paw = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.045, 12, 10)), creamMat);
      paw.scale.set(0.96, 0.72, 1.16);
      paw.position.set(0, -0.106, 0.014);
      legGroup.add(upperLeg, paw);
      bodyPivot.add(legGroup);
      legs.push(legGroup);
    }

    // Fluffy curved puppy tail with creamy tip
    tailPivot.position.set(0, 0.27, -0.18);
    const tailBase = new THREE.Mesh(
      trackGeo(new THREE.CapsuleGeometry(0.03, 0.082, 8, 12)),
      darkFurMat,
    );
    tailBase.position.set(0, 0.052, -0.026);
    tailBase.rotation.x = -0.62;
    const tailCurl = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.04, 12, 10)), darkFurMat);
    tailCurl.position.set(0, 0.092, -0.056);
    const tailTip = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.038, 12, 10)), creamMat);
    tailTip.position.set(0, 0.122, -0.068);
    tailPivot.add(tailBase, tailCurl, tailTip);
    bodyPivot.add(tailPivot);

    // Big round expressive chibi head
    headPivot.position.set(0, 0.375, 0.128);
    const head = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.156, 22, 18)), furMat);
    head.scale.set(1.06, 0.96, 1.0);
    headPivot.add(head);

    // Soft chubby cream muzzle
    const muzzle = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.078, 16, 12)), creamMat);
    muzzle.scale.set(1.18, 0.84, 0.92);
    muzzle.position.set(0, -0.034, 0.118);
    headPivot.add(muzzle);

    // Cute rounded button nose
    const nose = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.027, 12, 10)), noseMat);
    nose.scale.set(1.24, 0.86, 0.9);
    nose.position.set(0, -0.004, 0.178);
    headPivot.add(nose);

    // Soft pink happy tongue
    const tongue = new THREE.Mesh(
      trackGeo(new RoundedBoxGeometry(0.03, 0.034, 0.014, 3, 0.006)),
      tongueMat,
    );
    tongue.position.set(0, -0.062, 0.162);
    tongue.rotation.x = -0.32;
    headPivot.add(tongue);

    // Eyes with dual catchlights, adorable cream eyebrow dots, blush & velvety floppy ears
    const earL = new THREE.Group();
    const earR = new THREE.Group();
    [-1, 1].forEach((side) => {
      const eye = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.029, 14, 12)), eyeMat);
      eye.position.set(side * 0.064, 0.026, 0.132);
      const glintMain = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.0105, 8, 8)), glintMat);
      glintMain.position.set(side * 0.069, 0.035, 0.156);
      const glintMini = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.005, 6, 6)), glintMat);
      glintMini.position.set(side * 0.056, 0.019, 0.155);

      const browDot = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.017, 10, 8)), creamMat);
      browDot.scale.set(1.25, 0.72, 0.55);
      browDot.position.set(side * 0.062, 0.072, 0.128);
      browDot.rotation.z = side * -0.18;

      const blush = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.027, 10, 8)), blushMat);
      blush.scale.set(1.22, 0.72, 0.42);
      blush.position.set(side * 0.1, -0.022, 0.114);

      const earGroup = side === -1 ? earL : earR;
      earGroup.position.set(side * 0.132, 0.062, 0.01);
      const earUpper = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(0.048, 12, 10)),
        darkFurMat,
      );
      earUpper.scale.set(0.75, 1.05, 1.15);
      earUpper.position.set(side * 0.014, -0.022, 0.008);
      const earLower = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(0.05, 12, 10)),
        darkFurMat,
      );
      earLower.scale.set(0.72, 1.18, 1.12);
      earLower.position.set(side * 0.028, -0.078, 0.022);
      earLower.rotation.z = side * 0.22;
      earGroup.add(earUpper, earLower);

      headPivot.add(eye, glintMain, glintMini, browDot, blush, earGroup);
    });
    ears = [earL, earR];
    bodyPivot.add(headPivot);
  } else {
    // Blue Bird (Chim Xanh) - irresistibly plump cozy chibi songbird
    const blueMat = trackMat(makeClay('#54B7F4', 0.62));
    const wingBlueMat = trackMat(makeClay('#328BD0', 0.65));
    const lightWingMat = trackMat(makeClay('#76CBFA', 0.66));
    const creamMat = trackMat(makeClay('#FFF8E9', 0.72));
    const beakMat = trackMat(makeClay('#F7B538', 0.46));
    const beakLowerMat = trackMat(makeClay('#E89A24', 0.5));
    const footMat = trackMat(makeClay('#EC9B27', 0.58));
    const eyeMat = trackMat(makeGlossy('#1A2029', 0.08));
    const glintMat = trackMat(new THREE.MeshBasicMaterial({color: '#FFFFFF'}));
    const blushMat = trackMat(makeClay('#F79992', 0.76));

    // Plump pear-shaped songbird body (feet touch y=0 cleanly)
    const body = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.132, 20, 16)), blueMat);
    body.scale.set(1.02, 0.96, 1.14);
    body.position.set(0, 0.148, 0);
    bodyPivot.add(body);

    // Creamy soft breast & round tummy
    const belly = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.106, 18, 14)), creamMat);
    belly.scale.set(0.92, 0.88, 0.76);
    belly.position.set(0, 0.128, 0.068);
    bodyPivot.add(belly);

    // Cute oversized round chibi head blending seamlessly into chest
    headPivot.position.set(0, 0.258, 0.046);
    const head = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.115, 20, 16)), blueMat);
    head.scale.set(1.04, 0.98, 1.0);
    headPivot.add(head);

    // Soft double rounded head crest tufts (no sharp cone!)
    const crestMain = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.032, 12, 10)), wingBlueMat);
    crestMain.scale.set(0.75, 1.45, 1.1);
    crestMain.position.set(0, 0.124, -0.012);
    crestMain.rotation.x = -0.45;
    const crestBack = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.024, 10, 8)), lightWingMat);
    crestBack.scale.set(0.7, 1.3, 1.05);
    crestBack.position.set(0, 0.114, -0.044);
    crestBack.rotation.x = -0.78;
    headPivot.add(crestMain, crestBack);

    // Cute two-part rounded golden songbird beak
    const upperBeak = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.028, 12, 10)), beakMat);
    upperBeak.scale.set(1.05, 0.72, 1.42);
    upperBeak.position.set(0, -0.008, 0.122);
    const lowerBeak = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.02, 10, 8)), beakLowerMat);
    lowerBeak.scale.set(0.92, 0.56, 1.18);
    lowerBeak.position.set(0, -0.023, 0.115);
    headPivot.add(upperBeak, lowerBeak);

    [-1, 1].forEach((side) => {
      // Big expressive eyes with dual white catchlights + rosy cheeks
      const eye = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.026, 14, 12)), eyeMat);
      eye.position.set(side * 0.06, 0.02, 0.09);
      const glintMain = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.0095, 8, 8)), glintMat);
      glintMain.position.set(side * 0.065, 0.028, 0.11);
      const glintMini = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.0045, 6, 6)), glintMat);
      glintMini.position.set(side * 0.053, 0.013, 0.109);

      const blush = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.023, 10, 8)), blushMat);
      blush.scale.set(1.24, 0.72, 0.42);
      blush.position.set(side * 0.086, -0.016, 0.072);
      headPivot.add(eye, glintMain, glintMini, blush);

      // Cute sturdy little orange feet
      const footGroup = new THREE.Group();
      footGroup.position.set(side * 0.048, 0.048, 0.022);
      const legStick = new THREE.Mesh(
        trackGeo(new THREE.CapsuleGeometry(0.012, 0.028, 6, 8)),
        footMat,
      );
      legStick.position.y = -0.02;
      const toeL = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.015, 8, 6)), footMat);
      toeL.scale.set(0.75, 0.55, 1.55);
      toeL.position.set(-0.008, -0.042, 0.014);
      toeL.rotation.y = 0.25;
      const toeR = toeL.clone();
      toeR.position.x = 0.008;
      toeR.rotation.y = -0.25;
      footGroup.add(legStick, toeL, toeR);
      bodyPivot.add(footGroup);
      legs.push(footGroup);
    });
    bodyPivot.add(headPivot);

    // Sculpted layered wings (primary + secondary feather lobes)
    const makeWing = (side: -1 | 1) => {
      const wingPivot = new THREE.Group();
      wingPivot.position.set(side * 0.122, 0.168, 0.012);
      const wingPrimary = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(0.076, 14, 12)),
        wingBlueMat,
      );
      wingPrimary.scale.set(0.42, 0.72, 1.42);
      wingPrimary.position.set(side * 0.028, -0.008, -0.038);

      const wingCover = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(0.056, 12, 10)),
        lightWingMat,
      );
      wingCover.scale.set(0.42, 0.62, 1.15);
      wingCover.position.set(side * 0.036, 0.01, -0.015);

      wingPivot.add(wingPrimary, wingCover);
      bodyPivot.add(wingPivot);
      return wingPivot;
    };
    leftWing = makeWing(-1);
    rightWing = makeWing(1);

    // Fanned 3-feather sculpted tail (no boxy slab!)
    tailPivot.position.set(0, 0.145, -0.124);
    const tailMid = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.034, 12, 10)), wingBlueMat);
    tailMid.scale.set(0.88, 0.34, 1.85);
    tailMid.position.set(0, 0.018, -0.056);
    tailMid.rotation.x = 0.26;

    const tailL = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.028, 10, 8)), lightWingMat);
    tailL.scale.set(0.82, 0.32, 1.65);
    tailL.position.set(-0.026, 0.014, -0.048);
    tailL.rotation.set(0.24, -0.28, 0.08);

    const tailR = tailL.clone();
    tailR.position.x = 0.026;
    tailR.rotation.set(0.24, 0.28, -0.08);

    tailPivot.add(tailMid, tailL, tailR);
    bodyPivot.add(tailPivot);
  }

  // Optional Sick Indicator (tiny spinning blue droplet overhead)
  let sickGroup: THREE.Group | undefined;
  if (options?.sick) {
    sickGroup = new THREE.Group();
    sickGroup.position.set(0, speciesId === 'blue_bird' ? 0.45 : 0.63, 0);
    const dropMat = trackMat(makeGlossy('#66B8F5', 0.25));
    const dropA = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.034, 8, 8)), dropMat);
    dropA.scale.set(0.85, 1.25, 0.85);
    dropA.position.set(0.08, 0, 0);
    const dropB = dropA.clone();
    dropB.position.set(-0.08, 0.03, 0);
    sickGroup.add(dropA, dropB);
    bodyPivot.add(sickGroup);
  }

  return {
    speciesId,
    root,
    bodyPivot,
    headPivot,
    tailPivot,
    legs,
    ears,
    leftWing,
    rightWing,
    shadowDisc,
    sickGroup,
    dispose: () => {
      for (const g of ownedGeos) g.dispose();
      for (const m of ownedMats) m.dispose();
    },
  };
}

export function updatePetAnimation(
  rig: PetRig,
  mode: PetAnimMode,
  elapsed: number,
  extra?: {baseScale?: number; playProgress?: number; hoverHeight?: number},
): void {
  const baseScale = extra?.baseScale ?? rig.bodyPivot.scale.x ?? 1;
  const hoverH = extra?.hoverHeight ?? 0;

  if (rig.sickGroup) {
    rig.sickGroup.rotation.y = elapsed * 2.4;
    rig.sickGroup.position.y =
      (rig.speciesId === 'blue_bird' ? 0.45 : 0.63) + Math.sin(elapsed * 4) * 0.025;
  }

  if (rig.speciesId === 'brown_puppy') {
    const isMoving = mode === 'walk' || mode === 'shop_play';
    const isPlayingJump = mode === 'play_jump';
    const isHeld = mode === 'held_arms';

    // Always wag tail happily! (slower if sick)
    const wagSpeed = rig.sickGroup ? 4.5 : isPlayingJump || isHeld ? 14 : 9.5;
    rig.tailPivot.rotation.y = Math.sin(elapsed * wagSpeed) * 0.55;
    rig.tailPivot.rotation.z = Math.sin(elapsed * wagSpeed) * 0.22;

    if (isHeld) {
      rig.bodyPivot.position.y = Math.sin(elapsed * 3.2) * 0.008;
      rig.bodyPivot.rotation.x = 0.05;
      rig.headPivot.rotation.z = Math.sin(elapsed * 2.4) * 0.08;
      rig.headPivot.rotation.x = -0.1;
      rig.legs.forEach((leg, idx) => {
        leg.rotation.x = idx < 2 ? -0.45 : 0.45;
      });
      if (rig.ears) {
        rig.ears[0].rotation.z = 0.12 + Math.sin(elapsed * 4) * 0.05;
        rig.ears[1].rotation.z = -0.12 - Math.sin(elapsed * 4) * 0.05;
      }
    } else if (isPlayingJump) {
      const p = extra?.playProgress ?? 0;
      const bounce = Math.abs(Math.sin(p * Math.PI * 3));
      rig.bodyPivot.position.y = bounce * 0.34;
      rig.bodyPivot.rotation.x = -bounce * 0.18;
      rig.headPivot.rotation.x = -0.12 - bounce * 0.12;
      rig.headPivot.rotation.z = Math.sin(elapsed * 8) * 0.1;
      rig.legs.forEach((leg, idx) => {
        leg.rotation.x = idx < 2 ? -bounce * 0.5 : bounce * 0.45;
      });
      if (rig.ears) {
        rig.ears[0].rotation.z = 0.22 + bounce * 0.32;
        rig.ears[1].rotation.z = -0.22 - bounce * 0.32;
      }
      if (rig.shadowDisc) {
        const s = Math.max(0.55, 1 - bounce * 0.32);
        rig.shadowDisc.scale.setScalar(s);
      }
    } else if (isMoving) {
      const stride = Math.sin(elapsed * 14);
      const bounce = Math.abs(Math.cos(elapsed * 14));
      rig.bodyPivot.position.y = bounce * 0.045;
      rig.bodyPivot.rotation.x = 0.04;
      rig.headPivot.rotation.x = -0.04;
      rig.headPivot.rotation.z = Math.sin(elapsed * 7) * 0.04;
      rig.legs.forEach((leg, idx) => {
        const phase = idx === 0 || idx === 3 ? stride : -stride;
        leg.rotation.x = phase * 0.58;
      });
      if (rig.ears) {
        rig.ears[0].rotation.z = 0.1 + bounce * 0.16;
        rig.ears[1].rotation.z = -0.1 - bounce * 0.16;
      }
      if (rig.shadowDisc) rig.shadowDisc.scale.setScalar(1);
    } else {
      const breath = Math.sin(elapsed * 3.0);
      rig.bodyPivot.position.y = (0.5 + 0.5 * breath) * 0.012;
      rig.bodyPivot.rotation.x = 0;
      rig.headPivot.rotation.x = Math.sin(elapsed * 1.8) * 0.04;
      rig.headPivot.rotation.z = Math.sin(elapsed * 1.3) * 0.06;
      rig.legs.forEach((leg) => {
        leg.rotation.x = 0;
      });
      if (rig.ears) {
        rig.ears[0].rotation.z = 0.06 + Math.sin(elapsed * 2.2) * 0.04;
        rig.ears[1].rotation.z = -0.06 - Math.sin(elapsed * 2.2) * 0.04;
      }
      if (rig.shadowDisc) rig.shadowDisc.scale.setScalar(1);
    }
    rig.bodyPivot.scale.setScalar(baseScale);
  } else {
    // Blue Bird animations
    const isOrbitHeld = mode === 'held_orbit';
    const isPlayCircle = mode === 'play_circle';
    const isShopPlay = mode === 'shop_play';

    if (isOrbitHeld) {
      // Circling gracefully around the player's body with joyful wing flaps
      rig.bodyPivot.position.y = Math.sin(elapsed * 4.2) * 0.035;
      rig.bodyPivot.rotation.x = 0.14;
      rig.bodyPivot.rotation.z = 0.1;
      rig.headPivot.rotation.y = Math.sin(elapsed * 2.4) * 0.18;
      rig.headPivot.rotation.z = Math.sin(elapsed * 3.1) * 0.06;
      const flap = Math.sin(elapsed * 21) * 0.72;
      if (rig.leftWing) rig.leftWing.rotation.z = flap;
      if (rig.rightWing) rig.rightWing.rotation.z = -flap;
      rig.tailPivot.rotation.x = Math.sin(elapsed * 8) * 0.16;
      rig.legs.forEach((leg) => (leg.rotation.x = 0.45));
    } else if (isShopPlay) {
      const bob = Math.abs(Math.sin(elapsed * 4.5)) * 0.14;
      rig.bodyPivot.position.y = bob + 0.04;
      rig.bodyPivot.rotation.x = 0.08;
      rig.bodyPivot.rotation.z = 0;
      rig.headPivot.rotation.y = Math.sin(elapsed * 2.6) * 0.25;
      const flap = Math.sin(elapsed * 18) * 0.62;
      if (rig.leftWing) rig.leftWing.rotation.z = flap;
      if (rig.rightWing) rig.rightWing.rotation.z = -flap;
      rig.tailPivot.rotation.x = Math.sin(elapsed * 9) * 0.18;
      if (rig.shadowDisc) {
        rig.shadowDisc.scale.setScalar(Math.max(0.55, 1 - bob * 1.4));
      }
    } else {
      const flapSpeed = isPlayCircle ? 26 : 19;
      const flapAmp = isPlayCircle ? 0.85 : 0.68;
      const flap = Math.sin(elapsed * flapSpeed) * flapAmp;
      const bob = Math.sin(elapsed * 3.8) * 0.06;
      rig.bodyPivot.position.y = hoverH + bob;
      rig.bodyPivot.rotation.x = isPlayCircle ? 0.16 : 0.06;
      rig.bodyPivot.rotation.z = 0;
      rig.headPivot.rotation.y = Math.sin(elapsed * 2.2) * 0.16;
      rig.headPivot.rotation.z = Math.sin(elapsed * 2.8) * 0.06;
      if (rig.leftWing) rig.leftWing.rotation.z = flap;
      if (rig.rightWing) rig.rightWing.rotation.z = -flap;
      rig.tailPivot.rotation.x = Math.sin(elapsed * 8) * 0.16;
      rig.legs.forEach((leg) => (leg.rotation.x = 0.48));
      if (rig.shadowDisc) {
        rig.shadowDisc.position.y = 0.01;
        rig.shadowDisc.scale.setScalar(0.76 + Math.sin(elapsed * 3.8) * 0.05);
      }
    }
    rig.bodyPivot.scale.setScalar(baseScale);
  }
}
