import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {PET_CATALOG} from '../data/petCatalog';
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

  // Subtle wingbar stripe near upper edge
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
  const isFlySpecies = (PET_CATALOG[speciesId]?.moveType ?? 'walk') === 'fly';

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
        opacity: isFlySpecies ? 0.18 : 0.24,
        depthWrite: false,
      }),
    );
    shadowDisc = new THREE.Mesh(
      trackGeo(new THREE.CircleGeometry((isFlySpecies ? 0.2 : 0.26) * scale, 20)),
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

    const neckBridge = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.088, 0.108, 0.11, 18)),
      furMat,
    );
    neckBridge.position.set(0, 0.305, 0.108);
    neckBridge.rotation.x = 0.28;
    bodyPivot.add(neckBridge);

    const chestBib = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.094, 18, 14)), creamMat);
    chestBib.scale.set(0.92, 1.08, 0.72);
    chestBib.position.set(0, 0.228, 0.106);
    const bellyPatch = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.102, 16, 12)), softTanMat);
    bellyPatch.scale.set(0.84, 0.65, 1.25);
    bellyPatch.position.set(0, 0.168, -0.005);
    bodyPivot.add(chestBib, bellyPatch);

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

    headPivot.position.set(0, 0.39, 0.132);
    const head = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.148, 24, 18)), furMat);
    head.scale.set(1.04, 0.96, 1.02);
    headPivot.add(head);

    const forehead = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.105, 16, 12)), furMat);
    forehead.scale.set(1.0, 0.85, 0.92);
    forehead.position.set(0, 0.048, 0.032);
    headPivot.add(forehead);

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

    const nose = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.025, 14, 10)), noseMat);
    nose.scale.set(1.25, 0.82, 0.92);
    nose.position.set(0, -0.008, 0.208);
    headPivot.add(nose);

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
  } else if (speciesId === 'shiba_puppy') {
    // Cún Shiba: taller & plumper iconic Japanese Shiba proportions, fox-ginger coat, crisp white-cream urajiro mask & thick curled brush tail
    const shibaMat = trackMat(makeClay('#D96B27', 0.64));
    const creamMat = trackMat(makeClay('#FFF9EE', 0.72));
    const innerEarMat = trackMat(makeClay('#F7C4B8', 0.76));
    const bandanaMat = trackMat(makeClay('#D6343A', 0.48));
    const bellMat = trackMat(makeGlossy('#F7C743', 0.18));
    const noseMat = trackMat(makeGlossy('#1F1410', 0.12));
    const eyeMat = trackMat(makeGlossy('#17100C', 0.05));
    const glintMat = trackMat(new THREE.MeshBasicMaterial({color: '#FFFFFF'}));
    const blushMat = trackMat(makeClay('#F5958A', 0.78));
    const tongueMat = trackMat(makeClay('#F57F8B', 0.56));

    // Proud stout Shiba torso (larger & fuller chest than brown_puppy)
    const torsoPts = [
      new THREE.Vector2(0.001, -0.18),
      new THREE.Vector2(0.105, -0.162),
      new THREE.Vector2(0.15, -0.09),
      new THREE.Vector2(0.148, 0.015),
      new THREE.Vector2(0.158, 0.105),
      new THREE.Vector2(0.125, 0.168),
      new THREE.Vector2(0.001, 0.186),
    ];
    const torsoGeo = trackGeo(new THREE.LatheGeometry(torsoPts, 24));
    torsoGeo.rotateX(Math.PI / 2);
    const torso = new THREE.Mesh(torsoGeo, shibaMat);
    torso.scale.set(1.06, 1.0, 1.04);
    torso.position.set(0, 0.242, -0.012);
    bodyPivot.add(torso);

    // Muscular slanted Shiba neck + plush cream neck ruff
    const neckBridge = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.108, 0.132, 0.125, 20)),
      shibaMat,
    );
    neckBridge.position.set(0, 0.335, 0.105);
    neckBridge.rotation.x = 0.24;
    bodyPivot.add(neckBridge);

    // Crisp cream urajiro chest bib, lower throat & underbelly
    const chestBib = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.118, 20, 14)), creamMat);
    chestBib.scale.set(0.96, 1.14, 0.72);
    chestBib.position.set(0, 0.248, 0.116);
    const neckRuff = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.108, 0.028, 10, 22)), creamMat);
    neckRuff.rotation.x = Math.PI / 2 - 0.26;
    neckRuff.position.set(0, 0.302, 0.105);
    const bellyPatch = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.112, 16, 12)), creamMat);
    bellyPatch.scale.set(0.84, 0.58, 1.24);
    bellyPatch.position.set(0, 0.172, -0.005);
    bodyPivot.add(chestBib, neckRuff, bellyPatch);

    // Traditional crimson Japanese collar scarf + gold bell
    const collar = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.112, 0.022, 12, 24)),
      bandanaMat,
    );
    collar.rotation.x = Math.PI / 2 - 0.28;
    collar.position.set(0, 0.336, 0.102);
    const bandanaKnot = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.062, 0.084, 4)), bandanaMat);
    bandanaKnot.rotation.x = Math.PI;
    bandanaKnot.rotation.y = Math.PI / 4;
    bandanaKnot.position.set(0, 0.282, 0.194);
    const bell = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.028, 12, 10)), bellMat);
    bell.position.set(0, 0.298, 0.21);
    bodyPivot.add(collar, bandanaKnot, bell);

    // Sturdy athletic legs with cream urajiro lower socks
    const legSpecs: [number, number, number, boolean][] = [
      [-0.088, 0.175, 0.098, false],
      [0.088, 0.175, 0.098, false],
      [-0.094, 0.175, -0.11, true],
      [0.094, 0.175, -0.11, true],
    ];
    for (const [lx, ly, lz, isHind] of legSpecs) {
      const legGroup = new THREE.Group();
      legGroup.position.set(lx, ly, lz);
      if (isHind) {
        const haunch = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.062, 14, 10)), shibaMat);
        haunch.scale.set(0.88, 1.08, 1.18);
        haunch.position.set(0, -0.015, -0.01);
        legGroup.add(haunch);
      }
      const upperLeg = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.042, 0.036, 0.072, 14)),
        shibaMat,
      );
      upperLeg.position.y = -0.045;
      const lowerSock = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.035, 0.032, 0.062, 14)),
        creamMat,
      );
      lowerSock.position.y = -0.106;
      const paw = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.045, 14, 10)), creamMat);
      paw.scale.set(0.95, 0.66, 1.18);
      paw.position.set(0, -0.146, 0.014);
      legGroup.add(upperLeg, lowerSock, paw);
      bodyPivot.add(legGroup);
      legs.push(legGroup);
    }

    // Thick Plush Double-Loop Shiba Brush Tail curled snugly over the back
    tailPivot.position.set(0, 0.305, -0.165);
    const tailCurl = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.078, 0.036, 14, 26, Math.PI * 1.62)),
      shibaMat,
    );
    tailCurl.rotation.y = Math.PI / 2;
    tailCurl.rotation.z = 0.32;
    tailCurl.position.set(0, 0.076, -0.012);
    const tailCreamUnder = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.064, 0.026, 12, 20, Math.PI * 1.15)),
      creamMat,
    );
    tailCreamUnder.rotation.y = Math.PI / 2;
    tailCreamUnder.rotation.z = 0.5;
    tailCreamUnder.position.set(0, 0.074, -0.008);
    const tailPlumeTip = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.042, 12, 10)), creamMat);
    tailPlumeTip.position.set(0, 0.132, 0.028);
    tailPivot.add(tailCurl, tailCreamUnder, tailPlumeTip);
    bodyPivot.add(tailPivot);

    // Classic Broad Shiba Head with Tapered Wedge Muzzle & Crisp White Urajiro Cheeks
    headPivot.position.set(0, 0.432, 0.132);
    const head = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.164, 24, 18)), shibaMat);
    head.scale.set(1.12, 0.96, 1.02);
    headPivot.add(head);

    // Plush puffed cream cheek ruffs flaring out cleanly from the jaw (defining Shiba silhouette!)
    [-1, 1].forEach((side) => {
      const jowl = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.074, 16, 12)), creamMat);
      jowl.scale.set(1.18, 0.78, 0.92);
      jowl.position.set(side * 0.1, -0.046, 0.058);
      headPivot.add(jowl);
    });

    // Tapered Shiba fox muzzle (not flat like brown_puppy)
    const muzzle = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.046, 0.072, 0.102, 18)), creamMat);
    muzzle.rotation.x = Math.PI / 2;
    muzzle.scale.set(1.06, 1.0, 0.86);
    muzzle.position.set(0, -0.036, 0.148);
    headPivot.add(muzzle);

    const chin = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.054, 14, 10)), creamMat);
    chin.scale.set(1.12, 0.7, 0.96);
    chin.position.set(0, -0.058, 0.142);
    headPivot.add(chin);

    const nose = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.024, 14, 10)), noseMat);
    nose.scale.set(1.22, 0.82, 0.92);
    nose.position.set(0, -0.018, 0.204);
    headPivot.add(nose);

    const tongue = new THREE.Mesh(
      trackGeo(new RoundedBoxGeometry(0.026, 0.032, 0.012, 3, 0.005)),
      tongueMat,
    );
    tongue.position.set(0, -0.068, 0.178);
    tongue.rotation.x = -0.28;
    headPivot.add(tongue);

    const earL = new THREE.Group();
    const earR = new THREE.Group();
    [-1, 1].forEach((side) => {
      // Expressive slightly almond-angled Shiba eyes
      const eye = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.026, 16, 12)), eyeMat);
      eye.scale.set(1.05, 0.95, 0.9);
      eye.position.set(side * 0.066, 0.024, 0.138);
      const glintMain = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.01, 8, 8)), glintMat);
      glintMain.position.set(side * 0.071, 0.032, 0.161);
      const glintMini = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.0046, 6, 6)), glintMat);
      glintMini.position.set(side * 0.058, 0.018, 0.159);

      // Prominent cream maro eyebrow pips
      const browDot = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.021, 10, 8)), creamMat);
      browDot.scale.set(1.22, 0.78, 0.54);
      browDot.position.set(side * 0.062, 0.074, 0.132);
      browDot.rotation.z = side * -0.22;

      const blush = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.026, 10, 8)), blushMat);
      blush.scale.set(1.24, 0.68, 0.42);
      blush.position.set(side * 0.114, -0.022, 0.112);

      // Bold tall upright triangular Shiba fox ears pitched cleanly forward
      const earGroup = side === -1 ? earL : earR;
      earGroup.position.set(side * 0.108, 0.116, 0.01);
      const outerEar = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.058, 0.132, 4)), shibaMat);
      outerEar.rotation.y = Math.PI / 4;
      outerEar.scale.set(1.02, 1.0, 0.62);
      outerEar.position.set(side * 0.012, 0.052, 0.01);
      outerEar.rotation.z = side * -0.26;
      outerEar.rotation.x = 0.22;
      const innerEar = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.035, 0.088, 4)), innerEarMat);
      innerEar.rotation.y = Math.PI / 4;
      innerEar.scale.set(0.92, 1.0, 0.45);
      innerEar.position.set(side * 0.013, 0.044, 0.026);
      innerEar.rotation.z = side * -0.26;
      innerEar.rotation.x = 0.24;
      earGroup.add(outerEar, innerEar);

      headPivot.add(eye, glintMain, glintMini, browDot, blush, earGroup);
    });
    ears = [earL, earR];
    bodyPivot.add(headPivot);
  } else if (speciesId === 'chinese_cat') {
    // Mèo Trung Hoa Trắng: sleek snowy-white cat with jade-emerald eyes & crimson silk bell collar
    const whiteFurMat = trackMat(makeClay('#FFFFFF', 0.64));
    const softCreamMat = trackMat(makeClay('#F5F2EE', 0.7));
    const earPinkMat = trackMat(makeClay('#F7AEBA', 0.72));
    const collarMat = trackMat(makeClay('#D83140', 0.48));
    const jadeEyeMat = trackMat(makeGlossy('#299C74', 0.12));
    const pupilMat = trackMat(makeGlossy('#151417', 0.05));
    const glintMat = trackMat(new THREE.MeshBasicMaterial({color: '#FFFFFF'}));
    const bellMat = trackMat(makeGlossy('#F8CA44', 0.18));
    const noseMat = trackMat(makeGlossy('#F18B9A', 0.25));
    const blushMat = trackMat(makeClay('#F8A7B3', 0.78));

    // Graceful slender feline Lathe body
    const catBodyPts = [
      new THREE.Vector2(0.001, -0.178),
      new THREE.Vector2(0.076, -0.162),
      new THREE.Vector2(0.114, -0.092),
      new THREE.Vector2(0.112, 0.01),
      new THREE.Vector2(0.116, 0.095),
      new THREE.Vector2(0.094, 0.15),
      new THREE.Vector2(0.001, 0.168),
    ];
    const torsoGeo = trackGeo(new THREE.LatheGeometry(catBodyPts, 24));
    torsoGeo.rotateX(Math.PI / 2);
    const torso = new THREE.Mesh(torsoGeo, whiteFurMat);
    torso.scale.set(0.92, 0.92, 1.05);
    torso.position.set(0, 0.228, -0.015);
    bodyPivot.add(torso);

    const neckBridge = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.074, 0.092, 0.11, 18)),
      whiteFurMat,
    );
    neckBridge.position.set(0, 0.305, 0.1);
    neckBridge.rotation.x = 0.22;
    bodyPivot.add(neckBridge);

    // Fluffy chest ruff + crimson fortune collar + gold fortune bell
    const chestFluff = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.088, 18, 14)), softCreamMat);
    chestFluff.scale.set(0.9, 1.12, 0.72);
    chestFluff.position.set(0, 0.232, 0.1);
    bodyPivot.add(chestFluff);

    const collar = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.084, 0.018, 12, 24)),
      collarMat,
    );
    collar.rotation.x = Math.PI / 2 - 0.26;
    collar.position.set(0, 0.312, 0.098);
    const silkRibbonL = new THREE.Mesh(trackGeo(new RoundedBoxGeometry(0.036, 0.046, 0.014, 2, 0.005)), collarMat);
    silkRibbonL.position.set(-0.02, 0.285, 0.175);
    silkRibbonL.rotation.z = 0.32;
    const silkRibbonR = silkRibbonL.clone();
    silkRibbonR.position.set(0.02, 0.285, 0.175);
    silkRibbonR.rotation.z = -0.32;
    const goldBell = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.026, 12, 10)), bellMat);
    goldBell.position.set(0, 0.278, 0.184);
    bodyPivot.add(collar, silkRibbonL, silkRibbonR, goldBell);

    // Dainty feline legs + soft pink-white paws
    const legSpecs: [number, number, number, boolean][] = [
      [-0.068, 0.172, 0.092, false],
      [0.068, 0.172, 0.092, false],
      [-0.072, 0.172, -0.105, true],
      [0.072, 0.172, -0.105, true],
    ];
    for (const [lx, ly, lz, isHind] of legSpecs) {
      const legGroup = new THREE.Group();
      legGroup.position.set(lx, ly, lz);
      if (isHind) {
        const haunch = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.048, 12, 10)), whiteFurMat);
        haunch.scale.set(0.8, 1.08, 1.15);
        haunch.position.set(0, -0.015, -0.01);
        legGroup.add(haunch);
      }
      const legLimb = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.032, 0.026, 0.128, 14)),
        whiteFurMat,
      );
      legLimb.position.y = -0.08;
      const paw = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.036, 14, 10)), softCreamMat);
      paw.scale.set(0.9, 0.65, 1.18);
      paw.position.set(0, -0.148, 0.012);
      legGroup.add(legLimb, paw);
      bodyPivot.add(legGroup);
      legs.push(legGroup);
    }

    // Graceful upright S-curved plumed cat tail using TubeGeometry
    tailPivot.position.set(0, 0.268, -0.175);
    const catTailCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0.065, -0.075),
      new THREE.Vector3(0, 0.185, -0.095),
      new THREE.Vector3(0, 0.28, -0.035),
      new THREE.Vector3(0, 0.31, -0.085),
    ]);
    const tailMesh = new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(catTailCurve, 18, 0.024, 10, false)),
      whiteFurMat,
    );
    const tailTip = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.026, 10, 8)), whiteFurMat);
    tailTip.position.set(0, 0.31, -0.085);
    tailPivot.add(tailMesh, tailTip);
    bodyPivot.add(tailPivot);

    // Rounded plush white kitten head with bright emerald eyes
    headPivot.position.set(0, 0.392, 0.122);
    const head = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.142, 24, 18)), whiteFurMat);
    head.scale.set(1.06, 0.94, 0.98);
    headPivot.add(head);

    const cheekPuffL = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.036, 12, 10)), whiteFurMat);
    cheekPuffL.scale.set(1.12, 0.85, 0.95);
    cheekPuffL.position.set(-0.026, -0.032, 0.124);
    const cheekPuffR = cheekPuffL.clone();
    cheekPuffR.position.x = 0.026;
    headPivot.add(cheekPuffL, cheekPuffR);

    const nose = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.016, 12, 8)), noseMat);
    nose.scale.set(1.25, 0.8, 0.9);
    nose.position.set(0, -0.016, 0.145);
    headPivot.add(nose);

    const earL = new THREE.Group();
    const earR = new THREE.Group();
    [-1, 1].forEach((side) => {
      // Jade iris + dark pupil + sparkling eye glints
      const iris = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.032, 16, 12)), jadeEyeMat);
      iris.scale.set(1.0, 1.05, 0.72);
      iris.position.set(side * 0.058, 0.022, 0.114);
      const pupil = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.022, 14, 10)), pupilMat);
      pupil.scale.set(0.82, 1.0, 0.72);
      pupil.position.set(side * 0.058, 0.022, 0.125);
      const glintMain = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.0095, 8, 8)), glintMat);
      glintMain.position.set(side * 0.064, 0.032, 0.138);
      const glintMini = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.0044, 6, 6)), glintMat);
      glintMini.position.set(side * 0.051, 0.015, 0.137);

      const blush = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.024, 10, 8)), blushMat);
      blush.scale.set(1.24, 0.65, 0.42);
      blush.position.set(side * 0.092, -0.022, 0.098);

      const earGroup = side === -1 ? earL : earR;
      earGroup.position.set(side * 0.096, 0.098, 0.006);
      const outerEar = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.052, 0.115, 10)), whiteFurMat);
      outerEar.scale.set(0.96, 1.0, 0.56);
      outerEar.position.set(side * 0.01, 0.044, 0);
      outerEar.rotation.z = side * -0.32;
      const innerEar = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.03, 0.078, 8)), earPinkMat);
      innerEar.scale.set(0.88, 1.0, 0.42);
      innerEar.position.set(side * 0.011, 0.036, 0.015);
      innerEar.rotation.z = side * -0.32;
      earGroup.add(outerEar, innerEar);

      headPivot.add(iris, pupil, glintMain, glintMini, blush, earGroup);
    });
    ears = [earL, earR];
    bodyPivot.add(headPivot);
  } else if (speciesId === 'black_cat') {
    // Mèo Đen: sleek dark charcoal-plum kitten with oversized golden-amber eyes, pink inner ears & upright tail
    const blackFurMat = trackMat(makeClay('#282233', 0.66));
    const darkFurMat = trackMat(makeClay('#1C1724', 0.72));
    const earPinkMat = trackMat(makeClay('#EF8FA6', 0.7));
    const amberEyeMat = trackMat(makeGlossy('#F59E0B', 0.14));
    const pupilMat = trackMat(makeGlossy('#110E16', 0.06));
    const glintMat = trackMat(new THREE.MeshBasicMaterial({color: '#FFFFFF'}));
    const noseMat = trackMat(makeGlossy('#4C4058', 0.35));
    const whiskerMat = trackMat(makeClay('#5A5168', 0.55));
    const blushMat = trackMat(makeClay('#DF7892', 0.74));

    // Sleek kitten torso
    const catBodyPts = [
      new THREE.Vector2(0.001, -0.174),
      new THREE.Vector2(0.074, -0.158),
      new THREE.Vector2(0.112, -0.09),
      new THREE.Vector2(0.108, 0.01),
      new THREE.Vector2(0.114, 0.092),
      new THREE.Vector2(0.092, 0.146),
      new THREE.Vector2(0.001, 0.164),
    ];
    const torsoGeo = trackGeo(new THREE.LatheGeometry(catBodyPts, 24));
    torsoGeo.rotateX(Math.PI / 2);
    const torso = new THREE.Mesh(torsoGeo, blackFurMat);
    torso.scale.set(0.92, 0.92, 1.04);
    torso.position.set(0, 0.224, -0.015);
    bodyPivot.add(torso);

    const neckBridge = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.07, 0.088, 0.105, 18)),
      blackFurMat,
    );
    neckBridge.position.set(0, 0.3, 0.096);
    neckBridge.rotation.x = 0.22;
    bodyPivot.add(neckBridge);

    // Dainty feline legs & dark paws
    const legSpecs: [number, number, number, boolean][] = [
      [-0.066, 0.168, 0.09, false],
      [0.066, 0.168, 0.09, false],
      [-0.07, 0.168, -0.102, true],
      [0.07, 0.168, -0.102, true],
    ];
    for (const [lx, ly, lz, isHind] of legSpecs) {
      const legGroup = new THREE.Group();
      legGroup.position.set(lx, ly, lz);
      if (isHind) {
        const haunch = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.046, 12, 10)), blackFurMat);
        haunch.scale.set(0.8, 1.08, 1.14);
        haunch.position.set(0, -0.015, -0.01);
        legGroup.add(haunch);
      }
      const legLimb = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.031, 0.025, 0.124, 14)),
        blackFurMat,
      );
      legLimb.position.y = -0.078;
      const paw = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.034, 14, 10)), darkFurMat);
      paw.scale.set(0.9, 0.65, 1.16);
      paw.position.set(0, -0.144, 0.012);
      legGroup.add(legLimb, paw);
      bodyPivot.add(legGroup);
      legs.push(legGroup);
    }

    // Playful upright curved tail
    tailPivot.position.set(0, 0.264, -0.172);
    const catTailCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0.065, -0.08),
      new THREE.Vector3(0, 0.19, -0.098),
      new THREE.Vector3(0, 0.28, -0.038),
      new THREE.Vector3(0, 0.305, -0.09),
    ]);
    const tailMesh = new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(catTailCurve, 18, 0.021, 10, false)),
      blackFurMat,
    );
    const tailTip = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.023, 10, 8)), blackFurMat);
    tailTip.position.set(0, 0.305, -0.09);
    tailPivot.add(tailMesh, tailTip);
    bodyPivot.add(tailPivot);

    // Expressive big-eyed dark kitten head
    headPivot.position.set(0, 0.388, 0.118);
    const head = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.142, 24, 18)), blackFurMat);
    head.scale.set(1.06, 0.94, 0.98);
    headPivot.add(head);

    const nose = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.014, 10, 8)), noseMat);
    nose.scale.set(1.2, 0.78, 0.9);
    nose.position.set(0, -0.014, 0.144);
    headPivot.add(nose);

    const earL = new THREE.Group();
    const earR = new THREE.Group();
    [-1, 1].forEach((side) => {
      // Big expressive glowing amber eyes
      const iris = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.039, 16, 12)), amberEyeMat);
      iris.scale.set(1.04, 1.08, 0.72);
      iris.position.set(side * 0.058, 0.022, 0.112);
      const pupil = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.025, 14, 10)), pupilMat);
      pupil.scale.set(0.68, 1.04, 0.72);
      pupil.position.set(side * 0.058, 0.022, 0.124);
      const glintMain = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.011, 8, 8)), glintMat);
      glintMain.position.set(side * 0.066, 0.034, 0.14);
      const glintMini = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.005, 6, 6)), glintMat);
      glintMini.position.set(side * 0.05, 0.014, 0.138);

      const blush = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.022, 10, 8)), blushMat);
      blush.scale.set(1.2, 0.65, 0.42);
      blush.position.set(side * 0.092, -0.022, 0.098);

      for (const wy of [-0.018, -0.032]) {
        const whisker = new THREE.Mesh(
          trackGeo(new THREE.CylinderGeometry(0.0025, 0.0025, 0.065, 4)),
          whiskerMat,
        );
        whisker.rotation.z = Math.PI / 2 + side * (wy < -0.025 ? -0.14 : 0.08);
        whisker.position.set(side * 0.132, wy, 0.088);
        headPivot.add(whisker);
      }

      const earGroup = side === -1 ? earL : earR;
      earGroup.position.set(side * 0.096, 0.098, 0.006);
      const outerEar = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.054, 0.118, 10)), blackFurMat);
      outerEar.scale.set(0.96, 1.0, 0.56);
      outerEar.position.set(side * 0.012, 0.045, 0);
      outerEar.rotation.z = side * -0.34;
      const innerEar = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.032, 0.08, 8)), earPinkMat);
      innerEar.scale.set(0.88, 1.0, 0.42);
      innerEar.position.set(side * 0.013, 0.038, 0.015);
      innerEar.rotation.z = side * -0.34;
      earGroup.add(outerEar, innerEar);

      headPivot.add(iris, pupil, glintMain, glintMini, blush, earGroup);
    });
    ears = [earL, earR];
    bodyPivot.add(headPivot);
  } else if (speciesId === 'mischievous_parrot') {
    // Vẹt Tinh Nghịch - colorful scarlet/gold/emerald/cobalt macaw-style parrot with hooked beak & mischievous crest!
    const crimsonMat = trackMat(makeClay('#E8473F', 0.56));
    const brightRedMat = trackMat(makeClay('#FF6A58', 0.54));
    const creamBreastMat = trackMat(makeClay('#FFF0DF', 0.66));
    const goldWingMat = trackMat(makeClay('#F7C842', 0.52));
    const emeraldWingMat = trackMat(makeClay('#34B86E', 0.56));
    const cobaltWingMat = trackMat(makeClay('#2F7FD8', 0.58));
    const cheekPatchMat = trackMat(makeClay('#FFF9F0', 0.64));
    const beakTopMat = trackMat(makeGlossy('#F7C548', 0.32));
    const beakTipMat = trackMat(makeGlossy('#2B2624', 0.25));
    const footMat = trackMat(makeClay('#7A7370', 0.62));
    const eyeMat = trackMat(makeGlossy('#17181E', 0.05));
    const glintMat = trackMat(new THREE.MeshBasicMaterial({color: '#FFFFFF'}));

    const bodyPts = [
      new THREE.Vector2(0.001, -0.175),
      new THREE.Vector2(0.06, -0.145),
      new THREE.Vector2(0.108, -0.078),
      new THREE.Vector2(0.128, 0.01),
      new THREE.Vector2(0.122, 0.092),
      new THREE.Vector2(0.084, 0.148),
      new THREE.Vector2(0.001, 0.168),
    ];
    const birdBodyGeo = trackGeo(new THREE.LatheGeometry(bodyPts, 24));
    birdBodyGeo.rotateX(Math.PI * 0.42);
    const birdBody = new THREE.Mesh(birdBodyGeo, crimsonMat);
    birdBody.scale.set(0.98, 1.0, 1.1);
    birdBody.position.set(0, 0.168, -0.01);
    bodyPivot.add(birdBody);

    const creamBib = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.082, 16, 12)), creamBreastMat);
    creamBib.scale.set(0.88, 1.02, 0.55);
    creamBib.position.set(0, 0.15, 0.072);
    bodyPivot.add(creamBib);

    // Expressive rounded parrot head + perky multi-feather crown crest
    headPivot.position.set(0, 0.285, 0.056);
    const head = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.118, 22, 18)), crimsonMat);
    head.scale.set(1.02, 0.98, 1.05);
    headPivot.add(head);

    const crestSpecs = [
      {len: 0.098, w: 0.025, x: 0, y: 0.102, z: 0.018, rx: 1.72, rz: 0, mat: brightRedMat},
      {len: 0.084, w: 0.022, x: -0.016, y: 0.098, z: -0.006, rx: 2.02, rz: 0.16, mat: goldWingMat},
      {len: 0.072, w: 0.02, x: 0.016, y: 0.096, z: -0.012, rx: 2.15, rz: -0.16, mat: cobaltWingMat},
    ];
    crestSpecs.forEach((c) => {
      const geo = trackGeo(createFeatherBladeGeometry(c.len, c.w, 0.0045));
      const feather = new THREE.Mesh(geo, c.mat);
      feather.position.set(c.x, c.y, c.z);
      feather.rotation.set(c.rx, 0, c.rz);
      headPivot.add(feather);
    });

    // Iconic curved hooked parrot beak!
    const beakCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.012, 0.098),
      new THREE.Vector3(0, 0.01, 0.146),
      new THREE.Vector3(0, -0.022, 0.172),
      new THREE.Vector3(0, -0.048, 0.16),
    ]);
    const upperHookBeak = new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(beakCurve, 14, 0.024, 10, false)),
      beakTopMat,
    );
    upperHookBeak.scale.set(0.95, 1.05, 1.0);
    const beakHookTip = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.015, 0.032, 8)), beakTipMat);
    beakHookTip.rotation.x = Math.PI + 0.35;
    beakHookTip.position.set(0, -0.056, 0.156);
    const lowerMandible = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.022, 10, 8)), beakTipMat);
    lowerMandible.scale.set(0.9, 0.65, 1.15);
    lowerMandible.position.set(0, -0.024, 0.125);
    headPivot.add(upperHookBeak, beakHookTip, lowerMandible);

    [-1, 1].forEach((side) => {
      const cheekPatch = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.044, 14, 12)), cheekPatchMat);
      cheekPatch.scale.set(0.9, 0.85, 0.65);
      cheekPatch.position.set(side * 0.068, 0.014, 0.072);

      const eye = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.024, 14, 12)), eyeMat);
      eye.position.set(side * 0.066, 0.022, 0.09);
      const glintMain = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.009, 8, 8)), glintMat);
      glintMain.position.set(side * 0.07, 0.03, 0.109);
      const glintMini = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.0042, 6, 6)), glintMat);
      glintMini.position.set(side * 0.06, 0.015, 0.108);

      headPivot.add(cheekPatch, eye, glintMain, glintMini);

      // Grasping zygodactyl parrot claws
      const footGroup = new THREE.Group();
      footGroup.position.set(side * 0.048, 0.054, 0.014);
      const legStick = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.011, 0.009, 0.046, 8)),
        footMat,
      );
      legStick.position.y = -0.024;
      const toeFrontA = new THREE.Mesh(trackGeo(new THREE.CapsuleGeometry(0.006, 0.024, 4, 8)), footMat);
      toeFrontA.rotation.x = Math.PI / 2;
      toeFrontA.position.set(-0.007, -0.046, 0.013);
      toeFrontA.rotation.z = 0.25;
      const toeFrontB = toeFrontA.clone();
      toeFrontB.position.x = 0.007;
      toeFrontB.rotation.z = -0.25;
      const toeBack = new THREE.Mesh(trackGeo(new THREE.CapsuleGeometry(0.0055, 0.018, 4, 8)), footMat);
      toeBack.rotation.x = Math.PI / 2;
      toeBack.position.set(0, -0.046, -0.012);
      footGroup.add(legStick, toeFrontA, toeFrontB, toeBack);
      bodyPivot.add(footGroup);
      legs.push(footGroup);
    });
    bodyPivot.add(headPivot);

    // Rainbow Tropical Wing Layers (Gold bar + Emerald mid + Cobalt primary blades)
    leftWing = createSongbirdWing(-1, cobaltWingMat, emeraldWingMat, crimsonMat, goldWingMat, trackGeo);
    rightWing = createSongbirdWing(1, cobaltWingMat, emeraldWingMat, crimsonMat, goldWingMat, trackGeo);
    bodyPivot.add(leftWing, rightWing);

    // Long Fanned Rainbow Parrot Tail
    tailPivot.position.set(0, 0.136, -0.138);
    const makeParrotTail = (xOff: number, yaw: number, len: number, mat: THREE.Material) => {
      const geo = trackGeo(createFeatherBladeGeometry(len, 0.036, 0.005));
      geo.rotateX(Math.PI * 0.56);
      const m = new THREE.Mesh(geo, mat);
      m.position.set(xOff, 0.004, 0);
      m.rotation.y = yaw;
      return m;
    };
    tailPivot.add(
      makeParrotTail(0, 0, 0.215, crimsonMat),
      makeParrotTail(-0.02, -0.22, 0.185, cobaltWingMat),
      makeParrotTail(0.02, 0.22, 0.185, goldWingMat),
    );
    bodyPivot.add(tailPivot);
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

    const belly = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.098, 18, 14)), creamMat);
    belly.scale.set(0.92, 0.96, 0.76);
    belly.position.set(0, 0.132, 0.062);
    bodyPivot.add(belly);

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

    leftWing = createSongbirdWing(-1, deepWingMat, midWingMat, covertMat, wingBarMat, trackGeo);
    rightWing = createSongbirdWing(1, deepWingMat, midWingMat, covertMat, wingBarMat, trackGeo);
    bodyPivot.add(leftWing, rightWing);

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

  let sickGroup: THREE.Group | undefined;
  if (options?.sick) {
    sickGroup = new THREE.Group();
    sickGroup.position.set(0, isFlySpecies ? 0.44 : 0.62, 0);
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
  const isFlySpecies = (PET_CATALOG[rig.speciesId]?.moveType ?? 'walk') === 'fly';

  if (rig.sickGroup) {
    rig.sickGroup.rotation.y = elapsed * 2.4;
    rig.sickGroup.position.y = (isFlySpecies ? 0.44 : 0.62) + Math.sin(elapsed * 4) * 0.025;
  }

  if (!isFlySpecies) {
    const isMoving = mode === 'walk' || mode === 'shop_play';
    const isPlayingJump = mode === 'play_jump';
    const isHeld = mode === 'held_arms';
    const isCat = rig.speciesId === 'chinese_cat' || rig.speciesId === 'black_cat';
    const isShiba = rig.speciesId === 'shiba_puppy';

    const wagSpeed = rig.sickGroup ? 4.2 : isPlayingJump || isHeld ? 13 : isCat ? 4.5 : 9.5;
    if (isCat) {
      // Graceful feline tail sway & gentle ear twitch
      rig.tailPivot.rotation.y = Math.sin(elapsed * wagSpeed) * 0.28;
      rig.tailPivot.rotation.z = Math.cos(elapsed * (wagSpeed * 0.75)) * 0.14;
    } else if (isShiba) {
      // Perky curled tail bobbing enthusiastically
      rig.tailPivot.rotation.y = Math.sin(elapsed * wagSpeed) * 0.42;
      rig.tailPivot.rotation.z = Math.sin(elapsed * wagSpeed) * 0.16;
    } else {
      rig.tailPivot.rotation.y = Math.sin(elapsed * wagSpeed) * 0.55;
      rig.tailPivot.rotation.z = Math.sin(elapsed * wagSpeed) * 0.22;
    }

    if (isHeld) {
      rig.bodyPivot.position.y = Math.sin(elapsed * 3.2) * 0.008;
      rig.bodyPivot.rotation.x = 0.05;
      rig.headPivot.rotation.z = Math.sin(elapsed * 2.4) * 0.08;
      rig.headPivot.rotation.x = -0.1;
      rig.legs.forEach((leg, idx) => {
        leg.rotation.x = idx < 2 ? -0.45 : 0.45;
      });
      if (rig.ears) {
        const eAmp = isCat || isShiba ? 0.04 : 0.12;
        rig.ears[0].rotation.z = eAmp + Math.sin(elapsed * 4) * 0.04;
        rig.ears[1].rotation.z = -eAmp - Math.sin(elapsed * 4) * 0.04;
      }
    } else if (isPlayingJump) {
      const p = extra?.playProgress ?? 0;
      const bounce = Math.abs(Math.sin(p * Math.PI * 6));
      rig.bodyPivot.position.y = bounce * 0.34;
      rig.bodyPivot.rotation.x = -bounce * 0.18;
      rig.headPivot.rotation.x = -0.12 - bounce * 0.12;
      rig.headPivot.rotation.z = Math.sin(elapsed * 8) * 0.1;
      rig.legs.forEach((leg, idx) => {
        leg.rotation.x = idx < 2 ? -bounce * 0.5 : bounce * 0.45;
      });
      if (rig.ears) {
        const baseE = isCat || isShiba ? 0.06 : 0.22;
        const flapE = isCat || isShiba ? 0.12 : 0.32;
        rig.ears[0].rotation.z = baseE + bounce * flapE;
        rig.ears[1].rotation.z = -baseE - bounce * flapE;
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
        const eBase = isCat || isShiba ? 0.03 : 0.1;
        const eBob = isCat || isShiba ? 0.06 : 0.16;
        rig.ears[0].rotation.z = eBase + bounce * eBob;
        rig.ears[1].rotation.z = -eBase - bounce * eBob;
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
        const twitch = isCat ? Math.sin(elapsed * 3.4) * 0.045 : Math.sin(elapsed * 2.2) * 0.04;
        const rest = isCat || isShiba ? 0.02 : 0.06;
        rig.ears[0].rotation.z = rest + twitch;
        rig.ears[1].rotation.z = -rest - twitch;
      }
      if (rig.shadowDisc) rig.shadowDisc.scale.setScalar(1);
    }
    rig.bodyPivot.scale.setScalar(baseScale);
  } else {
    // Flying companions: Blue Bird & Mischievous Parrot
    const isOrbitHeld = mode === 'held_orbit';
    const isPlayJump = mode === 'play_jump';
    const isPlayCircle = mode === 'play_circle';
    const isShopPlay = mode === 'shop_play';
    const isParrot = rig.speciesId === 'mischievous_parrot';

    if (isPlayJump) {
      const p = extra?.playProgress ?? 0;
      const hop = Math.abs(Math.sin(p * Math.PI * 7));
      rig.bodyPivot.position.y = hop * 0.24;
      rig.bodyPivot.rotation.x = -hop * 0.14;
      rig.bodyPivot.rotation.z = 0;
      rig.headPivot.rotation.y = Math.sin(elapsed * (isParrot ? 7.5 : 6)) * 0.2;
      rig.headPivot.rotation.z = Math.sin(elapsed * 9) * 0.09;
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
      rig.bodyPivot.position.y = Math.sin(elapsed * 4.2) * 0.035;
      rig.bodyPivot.rotation.x = 0.14;
      rig.bodyPivot.rotation.z = 0.22;
      rig.headPivot.rotation.y = Math.sin(elapsed * (isParrot ? 3.2 : 2.4)) * 0.22;
      rig.headPivot.rotation.z = Math.sin(elapsed * 3.1) * 0.07;
      const flap = 0.08 + Math.sin(elapsed * (isParrot ? 17.5 : 20)) * 0.72;
      if (rig.leftWing) rig.leftWing.rotation.z = flap;
      if (rig.rightWing) rig.rightWing.rotation.z = -flap;
      rig.tailPivot.rotation.x = Math.sin(elapsed * 8) * 0.16;
      rig.legs.forEach((leg) => (leg.rotation.x = 0.48));
    } else if (isShopPlay) {
      const bob = Math.abs(Math.sin(elapsed * 4.5)) * 0.14;
      rig.bodyPivot.position.y = bob + 0.02;
      rig.bodyPivot.rotation.x = 0.08;
      rig.bodyPivot.rotation.z = 0;
      rig.headPivot.rotation.y = Math.sin(elapsed * 2.8) * 0.26;
      const flap = 0.06 + Math.sin(elapsed * 17.5) * 0.58;
      if (rig.leftWing) rig.leftWing.rotation.z = flap;
      if (rig.rightWing) rig.rightWing.rotation.z = -flap;
      rig.tailPivot.rotation.x = Math.sin(elapsed * 9) * 0.18;
      if (rig.shadowDisc) {
        rig.shadowDisc.scale.setScalar(Math.max(0.55, 1 - bob * 1.4));
      }
    } else {
      const flapSpeed = isPlayCircle ? 24 : isParrot ? 16.5 : 18.5;
      const flapAmp = isPlayCircle ? 0.78 : 0.66;
      const flap = 0.06 + Math.sin(elapsed * flapSpeed) * flapAmp;
      const bob = Math.sin(elapsed * 3.8) * 0.055;
      rig.bodyPivot.position.y = hoverH + bob;
      rig.bodyPivot.rotation.x = isPlayCircle ? 0.16 : 0.08;
      rig.bodyPivot.rotation.z = isParrot ? Math.sin(elapsed * 2.4) * 0.06 : 0;
      rig.headPivot.rotation.y = Math.sin(elapsed * (isParrot ? 3.1 : 2.2)) * (isParrot ? 0.24 : 0.16);
      rig.headPivot.rotation.z = Math.sin(elapsed * 2.8) * 0.08;
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
