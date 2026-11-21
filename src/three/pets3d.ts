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

function makeClay(hex: string, roughness = 0.68): THREE.MeshStandardMaterial {
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

function createTeardropEarGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.014);
  shape.bezierCurveTo(0.036, 0.012, 0.056, -0.032, 0.052, -0.088);
  shape.bezierCurveTo(0.048, -0.132, 0.02, -0.15, 0, -0.146);
  shape.bezierCurveTo(-0.024, -0.142, -0.044, -0.106, -0.038, -0.052);
  shape.bezierCurveTo(-0.034, -0.012, -0.018, 0.014, 0, 0.014);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.018,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.008,
    bevelSegments: 3,
    curveSegments: 14,
  });
  geo.center();
  return geo;
}

function createFeatherBladeGeometry(
  length: number,
  width: number,
  thickness = 0.006,
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(width * 0.72, -length * 0.14, width * 0.92, -length * 0.62, width * 0.18, -length);
  shape.bezierCurveTo(0, -length * 1.04, -width * 0.2, -length * 0.96, -width * 0.34, -length * 0.66);
  shape.bezierCurveTo(-width * 0.42, -length * 0.3, -width * 0.25, -length * 0.06, 0, 0);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: thickness * 0.55,
    bevelSize: thickness * 0.45,
    bevelSegments: 2,
    curveSegments: 10,
  });
  return geo;
}

function createSongbirdWing(
  side: -1 | 1,
  primaryMat: THREE.Material,
  midMat: THREE.Material,
  covertMat: THREE.Material,
  accentMat: THREE.Material,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
): THREE.Group {
  const wingPivot = new THREE.Group();
  wingPivot.position.set(side * 0.118, 0.182, 0.02);

  // Smooth anatomical airfoil shoulder & upper covert base
  const shoulderCap = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.052, 14, 12)), covertMat);
  shoulderCap.scale.set(0.55, 0.78, 1.32);
  shoulderCap.position.set(side * 0.018, 0.006, -0.022);
  wingPivot.add(shoulderCap);

  // Wing arm group pitched backward cleanly in flight & tucked at rest
  const bladeCluster = new THREE.Group();
  bladeCluster.rotation.x = Math.PI * 0.52;
  bladeCluster.rotation.z = side * -0.14;
  wingPivot.add(bladeCluster);

  // Subtle pale sky wingbar stripe near upper edge
  const barGeo = trackGeo(createFeatherBladeGeometry(0.115, 0.036, 0.005));
  barGeo.rotateY(side * (Math.PI / 2));
  const wingBar = new THREE.Mesh(barGeo, accentMat);
  wingBar.position.set(side * 0.032, 0.01, -0.012);
  wingBar.rotation.y = side * 0.18;
  wingBar.rotation.x = 0.06;
  bladeCluster.add(wingBar);

  // Layered primary + secondary flight feathers fanning gracefully outward & back
  const featherSpecs = [
    {len: 0.145, w: 0.042, spread: 0.08, sweep: 0.12, yOff: 0.0, zOff: -0.006, mat: midMat},
    {len: 0.175, w: 0.044, spread: 0.24, sweep: 0.04, yOff: -0.004, zOff: -0.01, mat: midMat},
    {len: 0.198, w: 0.043, spread: 0.42, sweep: -0.04, yOff: -0.008, zOff: -0.014, mat: primaryMat},
    {len: 0.212, w: 0.039, spread: 0.62, sweep: -0.12, yOff: -0.012, zOff: -0.018, mat: primaryMat},
    {len: 0.195, w: 0.034, spread: 0.82, sweep: -0.18, yOff: -0.014, zOff: -0.022, mat: primaryMat},
  ];

  featherSpecs.forEach((f) => {
    const geo = trackGeo(createFeatherBladeGeometry(f.len, f.w, 0.0045));
    geo.rotateY(side * (Math.PI / 2));
    const mesh = new THREE.Mesh(geo, f.mat);
    mesh.position.set(side * (0.022 + Math.abs(f.yOff)), f.yOff, f.zOff);
    mesh.rotation.z = side * -f.spread;
    mesh.rotation.y = side * f.sweep;
    bladeCluster.add(mesh);
  });

  return wingPivot;
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
        new THREE.CircleGeometry((speciesId === 'blue_bird' ? 0.2 : 0.26) * scale, 20),
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
    const furMat = trackMat(makeClay('#C77E43', 0.68));
    const darkFurMat = trackMat(makeClay('#874822', 0.72));
    const softTanMat = trackMat(makeClay('#DEA067', 0.7));
    const creamMat = trackMat(makeClay('#FFF4DF', 0.72));
    const collarMat = trackMat(makeClay('#E25652', 0.5));
    const bellMat = trackMat(makeGlossy('#F8CA44', 0.2));
    const noseMat = trackMat(makeGlossy('#2F1810', 0.14));
    const eyeMat = trackMat(makeGlossy('#19120F', 0.06));
    const glintMat = trackMat(new THREE.MeshBasicMaterial({color: '#FFFFFF'}));
    const blushMat = trackMat(makeClay('#F4978E', 0.78));
    const tongueMat = trackMat(makeClay('#F27885', 0.58));

    // Sculpted Lathe torso for cohesive chest -> waist -> rounded rump profile
    const torsoPts = [
      new THREE.Vector2(0.001, -0.175),
      new THREE.Vector2(0.088, -0.16),
      new THREE.Vector2(0.132, -0.1),
      new THREE.Vector2(0.136, 0.0),
      new THREE.Vector2(0.142, 0.095),
      new THREE.Vector2(0.116, 0.158),
      new THREE.Vector2(0.001, 0.178),
    ];
    const torsoGeo = trackGeo(new THREE.LatheGeometry(torsoPts, 24));
    torsoGeo.rotateX(Math.PI / 2);
    const torso = new THREE.Mesh(torsoGeo, furMat);
    torso.scale.set(0.98, 0.94, 1.06);
    torso.position.set(0, 0.228, -0.015);
    bodyPivot.add(torso);

    // Smooth neck bridge blending chest cleanly up into the puppy head
    const neckBridge = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.088, 0.108, 0.11, 18)),
      furMat,
    );
    neckBridge.position.set(0, 0.305, 0.108);
    neckBridge.rotation.x = 0.28;
    bodyPivot.add(neckBridge);

    // Soft contoured cream chest bib
    const chestBib = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.094, 18, 14)), creamMat);
    chestBib.scale.set(0.92, 1.08, 0.72);
    chestBib.position.set(0, 0.228, 0.106);
    const bellyPatch = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.102, 16, 12)), softTanMat);
    bellyPatch.scale.set(0.84, 0.65, 1.25);
    bellyPatch.position.set(0, 0.168, -0.005);
    bodyPivot.add(chestBib, bellyPatch);

    // Coral collar + golden bell tucked smoothly around neck bridge
    const collar = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.098, 0.02, 12, 24)),
      collarMat,
    );
    collar.rotation.x = Math.PI / 2 - 0.32;
    collar.position.set(0, 0.312, 0.102);
    bodyPivot.add(collar);

    const bellRing = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.014, 0.0045, 8, 14)),
      bellMat,
    );
    bellRing.position.set(0, 0.292, 0.194);
    const bell = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.028, 12, 10)), bellMat);
    bell.position.set(0, 0.268, 0.202);
    bodyPivot.add(bellRing, bell);

    // 4 sculpted puppy legs with subtle haunch taper + cream paws touching y = 0
    const legSpecs: [number, number, number, boolean][] = [
      [-0.084, 0.165, 0.094, false],
      [0.084, 0.165, 0.094, false],
      [-0.088, 0.165, -0.108, true],
      [0.088, 0.165, -0.108, true],
    ];
    for (const [lx, ly, lz, isHind] of legSpecs) {
      const legGroup = new THREE.Group();
      legGroup.position.set(lx, ly, lz);
      if (isHind) {
        const haunch = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.056, 12, 10)), furMat);
        haunch.scale.set(0.84, 1.08, 1.15);
        haunch.position.set(0, -0.016, -0.01);
        legGroup.add(haunch);
      }
      const legLimb = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.04, 0.033, 0.115, 14)),
        furMat,
      );
      legLimb.position.y = -0.072;
      const paw = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.044, 14, 10)), creamMat);
      paw.scale.set(0.92, 0.66, 1.18);
      paw.position.set(0, -0.136, 0.014);
      legGroup.add(legLimb, paw);
      bodyPivot.add(legGroup);
      legs.push(legGroup);
    }

    // Curved tapering puppy tail with cream plume tip
    tailPivot.position.set(0, 0.275, -0.175);
    const tailShaft = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.022, 0.032, 0.105, 12)),
      darkFurMat,
    );
    tailShaft.position.set(0, 0.048, -0.026);
    tailShaft.rotation.x = -0.58;
    const tailTip = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.034, 12, 10)), creamMat);
    tailTip.scale.set(0.9, 1.25, 0.9);
    tailTip.position.set(0, 0.105, -0.058);
    tailPivot.add(tailShaft, tailTip);
    bodyPivot.add(tailPivot);

    // Sculpted puppy cranium + protruding snout + soft brow + teardrop floppy ears
    headPivot.position.set(0, 0.39, 0.132);
    const head = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.148, 24, 18)), furMat);
    head.scale.set(1.04, 0.96, 1.02);
    headPivot.add(head);

    // Soft forehead dome + cozy side cheeks
    const forehead = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.105, 16, 12)), furMat);
    forehead.scale.set(1.0, 0.85, 0.92);
    forehead.position.set(0, 0.048, 0.032);
    headPivot.add(forehead);

    // Protruding tapered snout bridge & chubby cream muzzle cheeks
    const snoutBridge = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.046, 0.068, 0.088, 16)),
      creamMat,
    );
    snoutBridge.rotation.x = Math.PI / 2 + 0.12;
    snoutBridge.scale.set(1.22, 1.0, 0.86);
    snoutBridge.position.set(0, -0.028, 0.135);
    headPivot.add(snoutBridge);

    const muzzleTip = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.058, 16, 12)), creamMat);
    muzzleTip.scale.set(1.2, 0.82, 0.92);
    muzzleTip.position.set(0, -0.034, 0.158);
    headPivot.add(muzzleTip);

    // Sculpted rounded triangular puppy nose
    const nose = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.025, 14, 10)), noseMat);
    nose.scale.set(1.25, 0.82, 0.92);
    nose.position.set(0, -0.008, 0.208);
    headPivot.add(nose);

    // Happy pink puppy tongue
    const tongue = new THREE.Mesh(
      trackGeo(new RoundedBoxGeometry(0.028, 0.034, 0.012, 3, 0.005)),
      tongueMat,
    );
    tongue.position.set(0, -0.064, 0.186);
    tongue.rotation.x = -0.34;
    headPivot.add(tongue);

    const earGeo = trackGeo(createTeardropEarGeometry());
    const earL = new THREE.Group();
    const earR = new THREE.Group();
    [-1, 1].forEach((side) => {
      const eye = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.028, 16, 12)), eyeMat);
      eye.position.set(side * 0.06, 0.028, 0.126);
      const glintMain = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.0105, 8, 8)), glintMat);
      glintMain.position.set(side * 0.065, 0.037, 0.15);
      const glintMini = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.0048, 6, 6)), glintMat);
      glintMini.position.set(side * 0.052, 0.021, 0.149);

      const browDot = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.017, 10, 8)), creamMat);
      browDot.scale.set(1.25, 0.68, 0.52);
      browDot.position.set(side * 0.058, 0.072, 0.12);
      browDot.rotation.z = side * -0.2;

      const blush = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.026, 10, 8)), blushMat);
      blush.scale.set(1.22, 0.7, 0.4);
      blush.position.set(side * 0.095, -0.02, 0.108);

      const earGroup = side === -1 ? earL : earR;
      earGroup.position.set(side * 0.124, 0.064, 0.012);
      const earMesh = new THREE.Mesh(earGeo, darkFurMat);
      earMesh.position.set(side * 0.02, -0.058, 0.008);
      earMesh.rotation.set(0.08, side * 1.18, side * 0.24);
      earGroup.add(earMesh);

      headPivot.add(eye, glintMain, glintMini, browDot, blush, earGroup);
    });
    ears = [earL, earR];
    bodyPivot.add(headPivot);
  } else {
    // Blue Bird (Chim Xanh) - sculpted realistic songbird anatomy + feathered wings
    const blueMat = trackMat(makeClay('#50B4F3', 0.6));
    const midWingMat = trackMat(makeClay('#3694D8', 0.64));
    const deepWingMat = trackMat(makeClay('#2676B9', 0.66));
    const covertMat = trackMat(makeClay('#67C4FA', 0.62));
    const wingBarMat = trackMat(makeClay('#DCF1FF', 0.68));
    const creamMat = trackMat(makeClay('#FFF8EA', 0.72));
    const beakMat = trackMat(makeClay('#F7B538', 0.44));
    const beakLowerMat = trackMat(makeClay('#E2921D', 0.48));
    const footMat = trackMat(makeClay('#E89928', 0.56));
    const eyeRingMat = trackMat(makeClay('#BCE5FD', 0.7));
    const eyeMat = trackMat(makeGlossy('#181F28', 0.06));
    const glintMat = trackMat(new THREE.MeshBasicMaterial({color: '#FFFFFF'}));
    const blushMat = trackMat(makeClay('#F79992', 0.76));

    // Streamlined songbird Lathe body silhouette (smooth chest + tapered rump)
    const bodyPts = [
      new THREE.Vector2(0.001, -0.155),
      new THREE.Vector2(0.056, -0.132),
      new THREE.Vector2(0.104, -0.072),
      new THREE.Vector2(0.122, 0.006),
      new THREE.Vector2(0.114, 0.078),
      new THREE.Vector2(0.078, 0.132),
      new THREE.Vector2(0.001, 0.15),
    ];
    const birdBodyGeo = trackGeo(new THREE.LatheGeometry(bodyPts, 24));
    birdBodyGeo.rotateX(Math.PI * 0.43);
    const birdBody = new THREE.Mesh(birdBodyGeo, blueMat);
    birdBody.scale.set(0.98, 1.0, 1.08);
    birdBody.position.set(0, 0.156, -0.008);
    bodyPivot.add(birdBody);

    // Smooth creamy breast & underside blending cleanly along the chest curve
    const belly = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.098, 18, 14)), creamMat);
    belly.scale.set(0.92, 0.96, 0.76);
    belly.position.set(0, 0.132, 0.062);
    bodyPivot.add(belly);

    // Sleek songbird head + crown crest tufts
    headPivot.position.set(0, 0.264, 0.054);
    const head = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.108, 22, 18)), blueMat);
    head.scale.set(1.02, 0.96, 1.04);
    headPivot.add(head);

    const crestGeoA = trackGeo(createFeatherBladeGeometry(0.072, 0.022, 0.004));
    const crestA = new THREE.Mesh(crestGeoA, midWingMat);
    crestA.position.set(0, 0.092, 0.004);
    crestA.rotation.x = 1.98;
    const crestGeoB = trackGeo(createFeatherBladeGeometry(0.056, 0.018, 0.004));
    const crestB = new THREE.Mesh(crestGeoB, covertMat);
    crestB.position.set(0, 0.088, -0.026);
    crestB.rotation.x = 2.25;
    headPivot.add(crestA, crestB);

    // Realistic tapered conical songbird beak (upper + lower mandibles)
    const upperBeakGeo = trackGeo(new THREE.ConeGeometry(0.025, 0.072, 14));
    upperBeakGeo.rotateX(Math.PI / 2 + 0.06);
    const upperBeak = new THREE.Mesh(upperBeakGeo, beakMat);
    upperBeak.scale.set(1.08, 0.78, 1.0);
    upperBeak.position.set(0, -0.004, 0.128);

    const lowerBeakGeo = trackGeo(new THREE.ConeGeometry(0.018, 0.052, 12));
    lowerBeakGeo.rotateX(Math.PI / 2 - 0.1);
    const lowerBeak = new THREE.Mesh(lowerBeakGeo, beakLowerMat);
    lowerBeak.scale.set(0.96, 0.62, 1.0);
    lowerBeak.position.set(0, -0.017, 0.118);
    headPivot.add(upperBeak, lowerBeak);

    [-1, 1].forEach((side) => {
      // Soft feather eye ring + expressive eyes + rosy cheek
      const eyeRing = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.031, 14, 12)), eyeRingMat);
      eyeRing.scale.set(1.0, 1.0, 0.65);
      eyeRing.position.set(side * 0.058, 0.018, 0.084);
      const eye = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.024, 14, 12)), eyeMat);
      eye.position.set(side * 0.06, 0.019, 0.091);
      const glintMain = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.009, 8, 8)), glintMat);
      glintMain.position.set(side * 0.064, 0.027, 0.11);
      const glintMini = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.0042, 6, 6)), glintMat);
      glintMini.position.set(side * 0.054, 0.012, 0.109);

      const blush = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.02, 10, 8)), blushMat);
      blush.scale.set(1.2, 0.68, 0.4);
      blush.position.set(side * 0.082, -0.018, 0.068);
      headPivot.add(eyeRing, eye, glintMain, glintMini, blush);

      // Slender songbird legs + 3-toe claws cleanly resting on y = 0
      const footGroup = new THREE.Group();
      footGroup.position.set(side * 0.046, 0.052, 0.016);
      const legStick = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.009, 0.008, 0.044, 8)),
        footMat,
      );
      legStick.position.y = -0.024;
      const toeMid = new THREE.Mesh(trackGeo(new THREE.CapsuleGeometry(0.0055, 0.026, 4, 8)), footMat);
      toeMid.rotation.x = Math.PI / 2;
      toeMid.position.set(0, -0.046, 0.014);
      const toeL = toeMid.clone();
      toeL.position.set(-0.008, -0.046, 0.012);
      toeL.rotation.z = 0.36;
      const toeR = toeMid.clone();
      toeR.position.set(0.008, -0.046, 0.012);
      toeR.rotation.z = -0.36;
      const backToe = new THREE.Mesh(trackGeo(new THREE.CapsuleGeometry(0.005, 0.016, 4, 8)), footMat);
      backToe.rotation.x = Math.PI / 2;
      backToe.position.set(0, -0.046, -0.012);
      footGroup.add(legStick, toeMid, toeL, toeR, backToe);
      bodyPivot.add(footGroup);
      legs.push(footGroup);
    });
    bodyPivot.add(headPivot);

    // Sculpted layered multi-feather wings
    leftWing = createSongbirdWing(-1, deepWingMat, midWingMat, covertMat, wingBarMat, trackGeo);
    rightWing = createSongbirdWing(1, deepWingMat, midWingMat, covertMat, wingBarMat, trackGeo);
    bodyPivot.add(leftWing, rightWing);

    // Fanned 3-blade feathered tail
    tailPivot.position.set(0, 0.138, -0.128);
    const makeTailFeather = (xOff: number, yaw: number, len: number, mat: THREE.Material) => {
      const geo = trackGeo(createFeatherBladeGeometry(len, 0.032, 0.005));
      geo.rotateX(Math.PI * 0.56);
      const m = new THREE.Mesh(geo, mat);
      m.position.set(xOff, 0.004, 0);
      m.rotation.y = yaw;
      return m;
    };
    tailPivot.add(
      makeTailFeather(0, 0, 0.145, deepWingMat),
      makeTailFeather(-0.018, -0.26, 0.128, midWingMat),
      makeTailFeather(0.018, 0.26, 0.128, midWingMat),
    );
    bodyPivot.add(tailPivot);
  }

  // Optional Sick Indicator (tiny spinning blue droplet overhead)
  let sickGroup: THREE.Group | undefined;
  if (options?.sick) {
    sickGroup = new THREE.Group();
    sickGroup.position.set(0, speciesId === 'blue_bird' ? 0.44 : 0.62, 0);
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
      (rig.speciesId === 'blue_bird' ? 0.44 : 0.62) + Math.sin(elapsed * 4) * 0.025;
  }

  if (rig.speciesId === 'brown_puppy') {
    const isMoving = mode === 'walk' || mode === 'shop_play';
    const isPlayingJump = mode === 'play_jump';
    const isHeld = mode === 'held_arms';

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
    // Blue Bird animations (fly, orbit-around-player, and joyful ground-landing hops!)
    const isOrbitHeld = mode === 'held_orbit';
    const isPlayJump = mode === 'play_jump';
    const isPlayCircle = mode === 'play_circle';
    const isShopPlay = mode === 'shop_play';

    if (isPlayJump) {
      // Lands on ground in front of player and hops joyfully while fluttering wings
      const p = extra?.playProgress ?? 0;
      const hop = Math.abs(Math.sin(p * Math.PI * 4));
      rig.bodyPivot.position.y = hop * 0.24;
      rig.bodyPivot.rotation.x = -hop * 0.14;
      rig.bodyPivot.rotation.z = 0;
      rig.headPivot.rotation.y = Math.sin(elapsed * 6) * 0.16;
      rig.headPivot.rotation.z = Math.sin(elapsed * 9) * 0.08;
      const flutter = 0.18 + hop * 0.62 * Math.abs(Math.sin(elapsed * 24));
      if (rig.leftWing) rig.leftWing.rotation.z = flutter;
      if (rig.rightWing) rig.rightWing.rotation.z = -flutter;
      rig.tailPivot.rotation.x = Math.sin(elapsed * 12) * 0.22;
      rig.legs.forEach((leg) => {
        leg.rotation.x = -hop * 0.25;
      });
      if (rig.shadowDisc) {
        rig.shadowDisc.position.y = 0.01;
        rig.shadowDisc.scale.setScalar(Math.max(0.55, 1 - hop * 0.35));
      }
    } else if (isOrbitHeld) {
      // Circling gracefully around the player's body with realistic feathered wingbeats
      rig.bodyPivot.position.y = Math.sin(elapsed * 4.2) * 0.035;
      rig.bodyPivot.rotation.x = 0.14;
      rig.bodyPivot.rotation.z = 0.22;
      rig.headPivot.rotation.y = Math.sin(elapsed * 2.4) * 0.18;
      rig.headPivot.rotation.z = Math.sin(elapsed * 3.1) * 0.06;
      const flap = 0.08 + Math.sin(elapsed * 20) * 0.72;
      if (rig.leftWing) rig.leftWing.rotation.z = flap;
      if (rig.rightWing) rig.rightWing.rotation.z = -flap;
      rig.tailPivot.rotation.x = Math.sin(elapsed * 8) * 0.16;
      rig.legs.forEach((leg) => (leg.rotation.x = 0.48));
    } else if (isShopPlay) {
      const bob = Math.abs(Math.sin(elapsed * 4.5)) * 0.14;
      rig.bodyPivot.position.y = bob + 0.02;
      rig.bodyPivot.rotation.x = 0.08;
      rig.bodyPivot.rotation.z = 0;
      rig.headPivot.rotation.y = Math.sin(elapsed * 2.6) * 0.25;
      const flap = 0.06 + Math.sin(elapsed * 18) * 0.58;
      if (rig.leftWing) rig.leftWing.rotation.z = flap;
      if (rig.rightWing) rig.rightWing.rotation.z = -flap;
      rig.tailPivot.rotation.x = Math.sin(elapsed * 9) * 0.18;
      if (rig.shadowDisc) {
        rig.shadowDisc.scale.setScalar(Math.max(0.55, 1 - bob * 1.4));
      }
    } else {
      const flapSpeed = isPlayCircle ? 24 : 18.5;
      const flapAmp = isPlayCircle ? 0.78 : 0.66;
      const flap = 0.06 + Math.sin(elapsed * flapSpeed) * flapAmp;
      const bob = Math.sin(elapsed * 3.8) * 0.055;
      rig.bodyPivot.position.y = hoverH + bob;
      rig.bodyPivot.rotation.x = isPlayCircle ? 0.16 : 0.08;
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
