import * as THREE from 'three';
import {MOUNT_CATALOG} from '../data/mountCatalog';
import {MountDefinition, MountId, MountKind} from '../types/game';

export const BICYCLE_CRANK_Y = 0.28;
export const BICYCLE_CRANK_Z = -0.01;
export const BICYCLE_CRANK_RADIUS = 0.075;
export const BICYCLE_PEDAL_X = 0.155;
export const BICYCLE_SADDLE_Y = 0.70;
export const BICYCLE_SADDLE_Z = -0.21;
export const BICYCLE_GRIP_X = 0.205;
export const BICYCLE_GRIP_Y = 0.87;
export const BICYCLE_GRIP_Z = 0.19;

export interface MountAnimationState {
  pose:
    | 'skate_idle'
    | 'skate_ride'
    | 'skate_push'
    | 'bike_idle'
    | 'bike_ride'
    | 'lotus_idle'
    | 'lotus_ride'
    | 'broom_idle'
    | 'broom_ride';
  elapsed: number;
  speed: number;
  wheelAngle: number;
  crankAngle: number;
  steerAngle: number;
  wheelRadius: number;
  idlePop?: number;
  idleBlend?: number;
  leanAngle?: number;
}

export interface LotusRainDrop {
  mesh: THREE.Mesh;
  baseX: number;
  baseZ: number;
  phase: number;
  speed: number;
}

export interface LotusFallingPetal {
  mesh: THREE.Mesh;
  angle: number;
  radius: number;
  phase: number;
  speed: number;
  spinOffset: number;
}

export interface MountRig {
  mountId: MountId;
  kind: MountKind;
  root: THREE.Group;
  boardCenterPivot?: THREE.Group | null;
  rearPivot: THREE.Group | null;
  crankGroup: THREE.Group | null;
  leftPedalPivot: THREE.Group | null;
  rightPedalPivot: THREE.Group | null;
  steerGroup: THREE.Group | null;
  kickstandPivot?: THREE.Group | null;
  lotusPivot?: THREE.Group | null;
  lotusFrogGroup?: THREE.Group | null;
  lotusCloudGroup?: THREE.Group | null;
  lotusRainDrops?: LotusRainDrop[];
  dongThapBlossomGroup?: THREE.Group | null;
  dongThapAuraRings?: THREE.Mesh[];
  dongThapFallingPetals?: LotusFallingPetal[];
  dongThapSparkles?: LotusFallingPetal[];
  broomPivot?: THREE.Group | null;
  broomCatGroup?: THREE.Group | null;
  broomCatTail?: THREE.Group | null;
  broomPouchGroup?: THREE.Group | null;
  wheels: THREE.Object3D[];
  dispose: () => void;
}

function makeStandard(
  color: string,
  roughness = 0.42,
  metalness = 0.08,
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
  });
}

function buildSkateboardRig(def: MountDefinition): MountRig {
  const root = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };

  const pal = def.palette;
  const wheelMat = trackMat(makeStandard(pal.wheelOrTire, 0.34, 0.06));
  const wheelCoreMat = trackMat(makeStandard(pal.primary, 0.28, 0.22));
  const truckMat = trackMat(makeStandard('#D5DFE9', 0.24, 0.72));
  const rubberMat = trackMat(makeStandard('#334155', 0.62, 0.1));
  const gripMat = trackMat(makeStandard(pal.trim, 0.88, 0.04));
  const woodEdgeMat = trackMat(makeStandard('#E8C38E', 0.52, 0.04));
  const deckGraphicMat = trackMat(makeStandard(pal.primary, 0.32, 0.1));
  const deckAccentMat = trackMat(makeStandard(pal.accent, 0.3, 0.1));
  const deckCreamMat = trackMat(makeStandard(pal.secondary, 0.36, 0.06));

  // Center pivot enables smooth flip from flat riding deck to upright graphic-forward idle stand
  const boardCenterPivot = new THREE.Group();
  boardCenterPivot.rotation.order = 'YXZ';
  root.add(boardCenterPivot);

  const REAR_AXLE_Y = 0.05;
  const REAR_AXLE_Z = -0.245;
  const FRONT_AXLE_Z = 0.245;
  const rearPivot = new THREE.Group();
  rearPivot.position.set(0, REAR_AXLE_Y, REAR_AXLE_Z);
  boardCenterPivot.add(rearPivot);

  const boardBody = new THREE.Group();
  boardBody.position.set(0, -REAR_AXLE_Y, -REAR_AXLE_Z);
  rearPivot.add(boardBody);

  const wheels: THREE.Object3D[] = [];
  const wheelGeo = trackGeo(new THREE.CylinderGeometry(0.05, 0.05, 0.042, 18));
  wheelGeo.rotateZ(Math.PI / 2);
  const coreGeo = trackGeo(new THREE.CylinderGeometry(0.025, 0.025, 0.045, 14));
  coreGeo.rotateZ(Math.PI / 2);
  const spokeDotGeo = trackGeo(new THREE.BoxGeometry(0.047, 0.013, 0.076));

  const addAxle = (zPos: number) => {
    const hanger = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.016, 0.016, 0.275, 10)),
      truckMat,
    );
    hanger.rotation.z = Math.PI / 2;
    hanger.position.set(0, REAR_AXLE_Y, zPos);
    boardBody.add(hanger);

    const baseplate = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.105, 0.018, 0.105)),
      truckMat,
    );
    baseplate.position.set(0, 0.102, zPos);
    boardBody.add(baseplate);

    const kingpin = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.016, 0.02, 0.052, 8)),
      rubberMat,
    );
    kingpin.position.set(0, 0.076, zPos);
    boardBody.add(kingpin);

    for (const side of [-1, 1]) {
      const wheelPivot = new THREE.Group();
      wheelPivot.position.set(side * 0.136, REAR_AXLE_Y, zPos);

      const tire = new THREE.Mesh(wheelGeo, wheelMat);
      const core = new THREE.Mesh(coreGeo, wheelCoreMat);
      const spinBar = new THREE.Mesh(spokeDotGeo, deckCreamMat);
      wheelPivot.add(tire, core, spinBar);

      boardBody.add(wheelPivot);
      wheels.push(wheelPivot);
    }
  };

  addAxle(REAR_AXLE_Z);
  addAxle(FRONT_AXLE_Z);

  // Maple 7-ply wider pro deck (~0.285m x 0.86m) with cleanly separated layers (zero Z-fighting!)
  const deckGroup = new THREE.Group();
  deckGroup.position.set(0, 0.119, 0);
  boardBody.add(deckGroup);

  const centerWood = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.285, 0.02, 0.54)),
    woodEdgeMat,
  );
  deckGroup.add(centerWood);

  // Top grip side (+Y): y = +0.013 (grip) & y = +0.0185 (stripe)
  const centerGrip = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.27, 0.006, 0.53)),
    gripMat,
  );
  centerGrip.position.y = 0.013;
  deckGroup.add(centerGrip);

  const gripStripe = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.068, 0.004, 0.46)),
    deckAccentMat,
  );
  gripStripe.position.set(0, 0.018, 0);
  deckGroup.add(gripStripe);

  // Bottom graphic side (-Y, faces forward when standing!): strictly non-overlapping Y heights & XZ zones
  const underBase = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.262, 0.006, 0.53)),
    deckGraphicMat,
  );
  underBase.position.set(0, -0.013, 0);
  deckGroup.add(underBase);

  const underDiag1 = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.228, 0.004, 0.072)),
    deckCreamMat,
  );
  underDiag1.position.set(0, -0.018, 0.145);
  underDiag1.rotation.y = 0.28;
  deckGroup.add(underDiag1);

  const underDiag2 = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.228, 0.004, 0.062)),
    deckAccentMat,
  );
  underDiag2.position.set(0, -0.018, -0.145);
  underDiag2.rotation.y = 0.28;
  deckGroup.add(underDiag2);

  const underCircle = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.068, 0.068, 0.004, 22)),
    deckCreamMat,
  );
  underCircle.position.set(0, -0.018, 0);
  deckGroup.add(underCircle);

  const underCore = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.038, 0.038, 0.003, 18)),
    deckAccentMat,
  );
  underCore.position.set(0, -0.0215, 0);
  deckGroup.add(underCore);

  const addKickEnd = (dir: 1 | -1) => {
    const endPivot = new THREE.Group();
    endPivot.position.set(0, 0, dir * 0.272);
    endPivot.rotation.x = dir === 1 ? -0.3 : 0.3;
    deckGroup.add(endPivot);

    const tipWood = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.272, 0.018, 0.076)),
      woodEdgeMat,
    );
    tipWood.position.set(0, 0, dir * 0.042);
    endPivot.add(tipWood);

    const tipRound = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.136, 0.136, 0.018, 20)),
      woodEdgeMat,
    );
    tipRound.position.set(0, 0, dir * 0.082);
    endPivot.add(tipRound);

    const tipGrip = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.256, 0.005, 0.074)),
      gripMat,
    );
    tipGrip.position.set(0, 0.0115, dir * 0.042);
    endPivot.add(tipGrip);

    const tipGripRound = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.128, 0.128, 0.005, 20)),
      gripMat,
    );
    tipGripRound.position.set(0, 0.0115, dir * 0.082);
    endPivot.add(tipGripRound);

    // Distinct Y layers between under-band (-0.011) and rounded kick tip (-0.015) prevent z-fighting
    const tipUnderBand = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.246, 0.004, 0.072)),
      deckGraphicMat,
    );
    tipUnderBand.position.set(0, -0.011, dir * 0.042);
    endPivot.add(tipUnderBand);

    const tipUnder = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.124, 0.124, 0.004, 20)),
      deckAccentMat,
    );
    tipUnder.position.set(0, -0.015, dir * 0.082);
    endPivot.add(tipUnder);
  };

  addKickEnd(1);
  addKickEnd(-1);

  return {
    mountId: def.id,
    kind: def.kind,
    root,
    boardCenterPivot,
    rearPivot,
    crankGroup: null,
    leftPedalPivot: null,
    rightPedalPivot: null,
    steerGroup: null,
    kickstandPivot: null,
    wheels,
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}

function buildBicycleRig(def: MountDefinition): MountRig {
  const root = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };

  const pal = def.palette;
  const frameMat = trackMat(makeStandard(pal.primary, 0.26, 0.28));
  const secondaryMat = trackMat(makeStandard(pal.secondary, 0.38, 0.12));
  const chromeMat = trackMat(makeStandard(pal.trim, 0.18, 0.84));
  const leatherMat = trackMat(makeStandard(pal.accent, 0.52, 0.06));
  const tireMat = trackMat(makeStandard(pal.wheelOrTire, 0.78, 0.04));
  const whitewallMat = trackMat(makeStandard('#F5EFE3', 0.65, 0.04));
  const rimMat = trackMat(makeStandard('#E8EDF2', 0.2, 0.8));
  const rattanMat = trackMat(makeStandard('#D9AC6F', 0.72, 0.04));
  const rattanDarkMat = trackMat(makeStandard('#B5834B', 0.76, 0.04));
  const headLampMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#FFF9D6',
      emissive: '#FFE89A',
      emissiveIntensity: 0.45,
      roughness: 0.2,
    }),
  );

  // Full-size cruiser bicycle matching character proportions nicely
  const WHEEL_R = 0.355;
  const REAR_Z = -0.52;
  const FRONT_Z = 0.54;

  const wheels: THREE.Object3D[] = [];

  const buildWheel = (): THREE.Group => {
    const wg = new THREE.Group();
    const tire = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(WHEEL_R - 0.03, 0.03, 12, 32)),
      tireMat,
    );
    tire.rotation.y = Math.PI / 2;
    wg.add(tire);

    const whitewall = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(WHEEL_R - 0.05, 0.012, 8, 30)),
      whitewallMat,
    );
    whitewall.rotation.y = Math.PI / 2;
    wg.add(whitewall);

    const rim = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(WHEEL_R - 0.062, 0.012, 8, 30)),
      rimMat,
    );
    rim.rotation.y = Math.PI / 2;
    wg.add(rim);

    const hub = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.034, 0.034, 0.088, 12)),
      chromeMat,
    );
    hub.rotation.z = Math.PI / 2;
    wg.add(hub);

    const spokeGeo = trackGeo(new THREE.CylinderGeometry(0.0045, 0.0045, (WHEEL_R - 0.066) * 2, 6));
    for (let i = 0; i < 6; i++) {
      const sp = new THREE.Mesh(spokeGeo, rimMat);
      sp.rotation.x = (i * Math.PI) / 6;
      wg.add(sp);
    }

    const reflector = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.018, 0.044, 0.028)),
      trackMat(makeStandard('#FFB703', 0.28, 0.12)),
    );
    reflector.position.set(0, WHEEL_R - 0.105, 0);
    wg.add(reflector);

    return wg;
  };

  const addTubeBetween = (
    parent: THREE.Object3D,
    p1: THREE.Vector3,
    p2: THREE.Vector3,
    radius: number,
    mat: THREE.Material,
  ) => {
    const dir = new THREE.Vector3().subVectors(p2, p1);
    const len = dir.length();
    if (len < 0.001) return;
    const mesh = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(radius, radius, len, 10)),
      mat,
    );
    mesh.position.copy(p1).add(p2).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    parent.add(mesh);
  };

  // Rear wheel
  const rearWheel = buildWheel();
  rearWheel.position.set(0, WHEEL_R, REAR_Z);
  root.add(rearWheel);
  wheels.push(rearWheel);

  // Rear curved fender + chrome stays
  const fenderGeo = trackGeo(
    new THREE.TorusGeometry(WHEEL_R + 0.02, 0.022, 7, 24, Math.PI * 0.96),
  );
  const rearFender = new THREE.Mesh(fenderGeo, secondaryMat);
  rearFender.rotation.y = Math.PI / 2;
  rearFender.rotation.z = Math.PI * 0.02;
  rearFender.position.set(0, WHEEL_R, REAR_Z);
  root.add(rearFender);

  for (const s of [-1, 1]) {
    addTubeBetween(
      root,
      new THREE.Vector3(s * 0.05, WHEEL_R, REAR_Z),
      new THREE.Vector3(s * 0.036, WHEEL_R + 0.25, REAR_Z - 0.25),
      0.006,
      chromeMat,
    );
  }

  // Enlarged Cruiser Frame
  const bbPos = new THREE.Vector3(0, BICYCLE_CRANK_Y, BICYCLE_CRANK_Z);
  const seatLugPos = new THREE.Vector3(0, 0.61, -0.175);
  const headTopPos = new THREE.Vector3(0, 0.76, 0.305);
  const headBotPos = new THREE.Vector3(0, 0.52, 0.345);

  addTubeBetween(root, bbPos, seatLugPos, 0.022, frameMat);
  addTubeBetween(root, bbPos, headBotPos, 0.024, frameMat);
  addTubeBetween(root, seatLugPos, headTopPos, 0.019, frameMat);
  addTubeBetween(root, headTopPos, headBotPos, 0.027, frameMat);

  for (const s of [-1, 1]) {
    const axlePt = new THREE.Vector3(s * 0.052, WHEEL_R, REAR_Z);
    const bbSidePt = new THREE.Vector3(s * 0.042, BICYCLE_CRANK_Y, BICYCLE_CRANK_Z);
    const stayTopPt = new THREE.Vector3(s * 0.03, 0.59, -0.17);
    addTubeBetween(root, bbSidePt, axlePt, 0.014, frameMat);
    addTubeBetween(root, stayTopPt, axlePt, 0.013, frameMat);
  }

  // Painted vintage chainguard
  const chainguard = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.028, 0.08, 0.49)),
    secondaryMat,
  );
  chainguard.position.set(-0.058, (BICYCLE_CRANK_Y + WHEEL_R) * 0.5 + 0.015, -0.25);
  chainguard.rotation.x = -0.14;
  root.add(chainguard);

  // Folding Chrome Kickstand (stands vertically near rear-center when parked, tucks neatly along chainstay when moving!)
  const kickstandPivot = new THREE.Group();
  kickstandPivot.position.set(-0.046, BICYCLE_CRANK_Y - 0.015, -0.14);
  root.add(kickstandPivot);

  const standShaft = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.009, 0.008, 0.285, 8)),
    chromeMat,
  );
  standShaft.position.set(-0.042, -0.132, -0.01);
  standShaft.rotation.z = -0.28;
  kickstandPivot.add(standShaft);

  const standFoot = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.018, 0.02, 0.018, 10)),
    tireMat,
  );
  standFoot.position.set(-0.085, -0.26, -0.01);
  kickstandPivot.add(standFoot);
  kickstandPivot.rotation.x = -1.42;

  // Rear luggage rack above larger rear fender
  const rackY = 0.745;
  const rackL1 = new THREE.Vector3(-0.082, rackY, -0.71);
  const rackR1 = new THREE.Vector3(0.082, rackY, -0.71);
  const rackL2 = new THREE.Vector3(-0.082, rackY, -0.34);
  const rackR2 = new THREE.Vector3(0.082, rackY, -0.34);
  addTubeBetween(root, rackL1, rackL2, 0.0095, chromeMat);
  addTubeBetween(root, rackR1, rackR2, 0.0095, chromeMat);
  addTubeBetween(root, rackL1, rackR1, 0.0095, chromeMat);
  addTubeBetween(root, rackL2, rackR2, 0.0095, chromeMat);
  addTubeBetween(root, rackL1, new THREE.Vector3(-0.052, WHEEL_R, REAR_Z), 0.0085, chromeMat);
  addTubeBetween(root, rackR1, new THREE.Vector3(0.052, WHEEL_R, REAR_Z), 0.0085, chromeMat);
  for (let sIdx = -1; sIdx <= 1; sIdx++) {
    const slat = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.028, 0.013, 0.35)),
      rattanDarkMat,
    );
    slat.position.set(sIdx * 0.044, rackY + 0.006, -0.525);
    root.add(slat);
  }

  // Seatpost & twin-spring stitched leather cruiser saddle
  const saddleBasePos = new THREE.Vector3(0, BICYCLE_SADDLE_Y - 0.028, BICYCLE_SADDLE_Z);
  addTubeBetween(root, seatLugPos, saddleBasePos, 0.016, chromeMat);

  const saddleGroup = new THREE.Group();
  saddleGroup.position.set(0, BICYCLE_SADDLE_Y, BICYCLE_SADDLE_Z);
  root.add(saddleGroup);

  const saddleRear = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.098, 0.104, 0.048, 16)),
    leatherMat,
  );
  saddleRear.scale.set(1.06, 1, 0.78);
  saddleRear.position.set(0, -0.015, -0.03);
  saddleGroup.add(saddleRear);

  const saddleNose = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.076, 0.04, 0.155)),
    leatherMat,
  );
  saddleNose.position.set(0, -0.014, 0.055);
  saddleGroup.add(saddleNose);

  for (const s of [-1, 1]) {
    const spring = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.015, 0.015, 0.036, 8)),
      chromeMat,
    );
    spring.position.set(s * 0.045, -0.045, -0.048);
    saddleGroup.add(spring);
  }

  // Crank housing, chainring & dual pedals
  const crankHousing = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.035, 0.035, 0.096, 12)),
    chromeMat,
  );
  crankHousing.rotation.z = Math.PI / 2;
  crankHousing.position.set(0, BICYCLE_CRANK_Y, BICYCLE_CRANK_Z);
  root.add(crankHousing);

  const chainring = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.08, 0.08, 0.014, 18)),
    chromeMat,
  );
  chainring.rotation.z = Math.PI / 2;
  chainring.position.set(-0.058, BICYCLE_CRANK_Y, BICYCLE_CRANK_Z);
  root.add(chainring);

  const crankGroup = new THREE.Group();
  crankGroup.position.set(0, BICYCLE_CRANK_Y, BICYCLE_CRANK_Z);
  root.add(crankGroup);

  const buildCrankArmAndPedal = (side: 1 | -1, ySign: 1 | -1): THREE.Group => {
    const xArm = side * 0.078;
    const arm = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.018, BICYCLE_CRANK_RADIUS + 0.022, 0.024)),
      chromeMat,
    );
    arm.position.set(xArm, ySign * (BICYCLE_CRANK_RADIUS * 0.5), 0);
    crankGroup.add(arm);

    const pedalPivot = new THREE.Group();
    pedalPivot.position.set(side * BICYCLE_PEDAL_X, ySign * BICYCLE_CRANK_RADIUS, 0);
    crankGroup.add(pedalPivot);

    const pedalPin = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.009, 0.009, 0.11, 8)),
      chromeMat,
    );
    pedalPin.rotation.z = Math.PI / 2;
    pedalPin.position.set(-side * 0.038, 0, 0);
    pedalPivot.add(pedalPin);

    const pedalPlatform = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.086, 0.022, 0.096)),
      tireMat,
    );
    pedalPivot.add(pedalPlatform);

    const pedalStripe = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.088, 0.01, 0.02)),
      trackMat(makeStandard('#FFB703', 0.35, 0.1)),
    );
    pedalPivot.add(pedalStripe);

    return pedalPivot;
  };

  const leftPedalPivot = buildCrankArmAndPedal(1, 1);
  const rightPedalPivot = buildCrankArmAndPedal(-1, -1);

  // Steering Fork + Front Wheel + Cruiser Handlebar + Woven Front Basket mounted CLEARLY ABOVE FENDER
  const steerPivotPos = new THREE.Vector3(0, headTopPos.y, headTopPos.z);
  const steerGroup = new THREE.Group();
  steerGroup.position.copy(steerPivotPos);
  root.add(steerGroup);

  const localFrontHubL = new THREE.Vector3(
    0.054,
    WHEEL_R - steerPivotPos.y,
    FRONT_Z - steerPivotPos.z,
  );
  const localFrontHubR = new THREE.Vector3(
    -0.054,
    WHEEL_R - steerPivotPos.y,
    FRONT_Z - steerPivotPos.z,
  );
  const localCrownL = new THREE.Vector3(0.044, -0.22, 0.045);
  const localCrownR = new THREE.Vector3(-0.044, -0.22, 0.045);
  const localStemBot = new THREE.Vector3(0, -0.22, 0.045);
  const localStemTop = new THREE.Vector3(0, BICYCLE_GRIP_Y - steerPivotPos.y + 0.025, 0.0);

  addTubeBetween(steerGroup, localStemBot, localStemTop, 0.017, chromeMat);
  addTubeBetween(steerGroup, localCrownL, localCrownR, 0.018, frameMat);
  addTubeBetween(steerGroup, localCrownL, localFrontHubL, 0.014, frameMat);
  addTubeBetween(steerGroup, localCrownR, localFrontHubR, 0.014, frameMat);

  const frontWheel = buildWheel();
  frontWheel.position.set(0, WHEEL_R - steerPivotPos.y, FRONT_Z - steerPivotPos.z);
  steerGroup.add(frontWheel);
  wheels.push(frontWheel);

  const frontFender = new THREE.Mesh(fenderGeo, secondaryMat);
  frontFender.rotation.y = Math.PI / 2;
  frontFender.rotation.z = Math.PI * 0.05;
  frontFender.position.copy(frontWheel.position);
  steerGroup.add(frontFender);

  for (const s of [-1, 1]) {
    addTubeBetween(
      steerGroup,
      new THREE.Vector3(s * 0.052, frontWheel.position.y, frontWheel.position.z),
      new THREE.Vector3(s * 0.038, frontWheel.position.y + 0.16, frontWheel.position.z + 0.31),
      0.006,
      chromeMat,
    );
  }

  // Swept Cruiser Handlebar aligned to BICYCLE_GRIP_X/Y/Z
  const localBarCenter = new THREE.Vector3(0, BICYCLE_GRIP_Y - steerPivotPos.y + 0.025, 0.01);
  const localShoulderL = new THREE.Vector3(
    -0.138,
    BICYCLE_GRIP_Y - steerPivotPos.y + 0.025,
    -0.01,
  );
  const localShoulderR = new THREE.Vector3(
    0.138,
    BICYCLE_GRIP_Y - steerPivotPos.y + 0.025,
    -0.01,
  );
  const localGripL = new THREE.Vector3(
    -BICYCLE_GRIP_X,
    BICYCLE_GRIP_Y - steerPivotPos.y,
    BICYCLE_GRIP_Z - steerPivotPos.z,
  );
  const localGripR = new THREE.Vector3(
    BICYCLE_GRIP_X,
    BICYCLE_GRIP_Y - steerPivotPos.y,
    BICYCLE_GRIP_Z - steerPivotPos.z,
  );

  addTubeBetween(steerGroup, localShoulderL, localBarCenter, 0.0135, chromeMat);
  addTubeBetween(steerGroup, localShoulderR, localBarCenter, 0.0135, chromeMat);
  addTubeBetween(steerGroup, localShoulderL, localGripL, 0.0135, chromeMat);
  addTubeBetween(steerGroup, localShoulderR, localGripR, 0.0135, chromeMat);

  for (const [shoulder, grip] of [
    [localShoulderL, localGripL],
    [localShoulderR, localGripR],
  ]) {
    const dir = new THREE.Vector3().subVectors(grip, shoulder);
    const gripMesh = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.021, 0.021, 0.09, 12)),
      leatherMat,
    );
    gripMesh.position.copy(grip).addScaledVector(dir.clone().normalize(), -0.018);
    gripMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    steerGroup.add(gripMesh);
  }

  // Silver bike bell
  const bell = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.025, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.6)),
    chromeMat,
  );
  bell.position.set(0.095, localBarCenter.y + 0.018, 0.0);
  steerGroup.add(bell);

  // Detailed Open-Top Woven Rattan Front Basket positioned cleanly ABOVE front fender (zero wheel intersection!)
  const basketGroup = new THREE.Group();
  basketGroup.position.set(0, 0.115, 0.155);
  steerGroup.add(basketGroup);

  const BW = 0.25;
  const BH = 0.14;
  const BD = 0.175;
  const basketFloor = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(BW * 0.86, 0.014, BD * 0.84)),
    rattanDarkMat,
  );
  basketFloor.position.set(0, -BH * 0.5 + 0.007, 0);
  basketGroup.add(basketFloor);

  for (let row = 0; row < 5; row++) {
    const t = row / 4;
    const wy = -BH * 0.42 + t * (BH * 0.82);
    const flare = 0.88 + t * 0.16;
    const bandW = BW * flare;
    const bandD = BD * flare;
    const bandMat = row % 2 === 0 ? rattanMat : rattanDarkMat;

    const frontSl = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(bandW, 0.022, 0.012)), bandMat);
    frontSl.position.set(0, wy, bandD * 0.5);
    const backSl = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(bandW, 0.022, 0.012)), bandMat);
    backSl.position.set(0, wy, -bandD * 0.5);
    const leftSl = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.012, 0.022, bandD)), bandMat);
    leftSl.position.set(-bandW * 0.5, wy, 0);
    const rightSl = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.012, 0.022, bandD)), bandMat);
    rightSl.position.set(bandW * 0.5, wy, 0);
    basketGroup.add(frontSl, backSl, leftSl, rightSl);
  }

  for (let rx = -2; rx <= 2; rx++) {
    const rib = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.006, 0.005, BH, 6)),
      rattanDarkMat,
    );
    rib.position.set(rx * 0.05, 0, BD * 0.51);
    rib.rotation.x = 0.09;
    basketGroup.add(rib);
  }
  for (const sx of [-1, 1]) {
    for (let rz = -1; rz <= 1; rz++) {
      const sRib = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.006, 0.005, BH, 6)),
        rattanDarkMat,
      );
      sRib.position.set(sx * BW * 0.51, 0, rz * 0.045);
      sRib.rotation.z = -sx * 0.09;
      basketGroup.add(sRib);
    }
  }

  const rimY = BH * 0.49;
  const rimW = BW * 1.08;
  const rimD = BD * 1.08;
  const rimFront = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.013, 0.013, rimW, 8)), leatherMat);
  rimFront.rotation.z = Math.PI / 2;
  rimFront.position.set(0, rimY, rimD * 0.5);
  const rimBack = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.013, 0.013, rimW, 8)), leatherMat);
  rimBack.rotation.z = Math.PI / 2;
  rimBack.position.set(0, rimY, -rimD * 0.5);
  const rimLeft = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.013, 0.013, rimD, 8)), leatherMat);
  rimLeft.rotation.x = Math.PI / 2;
  rimLeft.position.set(-rimW * 0.5, rimY, 0);
  const rimRight = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.013, 0.013, rimD, 8)), leatherMat);
  rimRight.rotation.x = Math.PI / 2;
  rimRight.position.set(rimW * 0.5, rimY, 0);
  basketGroup.add(rimFront, rimBack, rimLeft, rimRight);

  for (const sx of [-0.055, 0.055]) {
    const strap = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.018, 0.042, 0.08)),
      leatherMat,
    );
    strap.position.set(sx, rimY - 0.01, -rimD * 0.5 - 0.02);
    strap.rotation.x = -0.35;
    basketGroup.add(strap);
  }

  const pouch = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.125, 0.082, 0.09)),
    secondaryMat,
  );
  pouch.position.set(-0.025, 0.008, 0.0);
  pouch.rotation.z = 0.08;
  basketGroup.add(pouch);

  const flowerStemMat = trackMat(makeStandard('#4D9B5A', 0.6, 0.05));
  const petalPinkMat = trackMat(makeStandard('#FF9BB3', 0.45, 0.05));
  const petalCreamMat = trackMat(makeStandard('#FFF4B8', 0.45, 0.05));
  for (let fi = 0; fi < 2; fi++) {
    const stem = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.005, 0.005, 0.075, 6)),
      flowerStemMat,
    );
    stem.position.set(0.055 + fi * 0.028, 0.055, 0.015 - fi * 0.025);
    stem.rotation.z = -0.22 - fi * 0.14;
    basketGroup.add(stem);

    const bloom = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.024, 10, 8)),
      fi === 0 ? petalPinkMat : petalCreamMat,
    );
    bloom.scale.set(1.15, 0.58, 1.15);
    bloom.position.set(0.068 + fi * 0.032, 0.095, 0.015 - fi * 0.025);
    basketGroup.add(bloom);
  }

  // Chrome basket support stays connecting cleanly down to fork crown (not blocking front fender!)
  for (const s of [-1, 1]) {
    addTubeBetween(
      steerGroup,
      new THREE.Vector3(s * 0.068, 0.115 - BH * 0.48, 0.145),
      new THREE.Vector3(s * 0.044, localCrownL.y, localCrownL.z),
      0.006,
      chromeMat,
    );
  }

  // Retro chrome bullet headlamp mounted ahead of fork crown cleanly below basket & clearing tire
  const headlamp = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.028, 0.034, 0.062, 14)),
    chromeMat,
  );
  headlamp.rotation.x = Math.PI / 2;
  headlamp.position.set(0, -0.02, 0.36);
  steerGroup.add(headlamp);

  const lampLens = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.027, 12, 8)),
    headLampMat,
  );
  lampLens.position.set(0, -0.02, 0.39);
  steerGroup.add(lampLens);

  return {
    mountId: def.id,
    kind: def.kind,
    root,
    boardCenterPivot: null,
    rearPivot: null,
    crankGroup,
    leftPedalPivot,
    rightPedalPivot,
    steerGroup,
    kickstandPivot,
    wheels,
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}

function buildLotusUmbrellaRig(def: MountDefinition): MountRig {
  const root = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };

  const lotusPivot = new THREE.Group();
  root.add(lotusPivot);

  const stemMat = trackMat(makeStandard('#1F7A47', 0.45, 0.05));
  const stemHookMat = trackMat(makeStandard('#8A5A32', 0.42, 0.08));
  const leafTopMat = trackMat(makeStandard('#30AE62', 0.48, 0.04));
  const leafEdgeMat = trackMat(makeStandard('#218C4D', 0.52, 0.04));
  const leafVeinMat = trackMat(makeStandard('#A7F3D0', 0.42, 0.02));
  const dewGoldMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#FDE68A',
      emissive: '#F59E0B',
      emissiveIntensity: 0.25,
      roughness: 0.2,
      metalness: 0.2,
    }),
  );

  // Curved umbrella stem held in hand at origin (0,0,0) rising to canopy at y = 1.05
  const shaft = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.02, 0.024, 1.12, 12)),
    stemMat,
  );
  shaft.position.set(0, 0.48, 0);
  lotusPivot.add(shaft);

  const handleGrip = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.025, 0.025, 0.14, 12)),
    stemHookMat,
  );
  handleGrip.position.set(0, -0.02, 0);
  const handleCurve = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.055, 0.022, 8, 14, Math.PI)),
    stemHookMat,
  );
  handleCurve.rotation.z = Math.PI;
  handleCurve.position.set(0.055, -0.09, 0);
  lotusPivot.add(handleGrip, handleCurve);

  // Giant scalloped lotus leaf canopy (diameter ~1.58m, as big as a real umbrella!)
  const canopy = new THREE.Group();
  canopy.position.set(0, 1.05, 0);
  lotusPivot.add(canopy);

  const leafDome = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.14, 0.78, 0.2, 24)),
    leafTopMat,
  );
  leafDome.position.y = 0.02;
  canopy.add(leafDome);

  const lobeCount = 12;
  const lobeGeo = trackGeo(new THREE.SphereGeometry(0.22, 10, 8));
  lobeGeo.scale(1.0, 0.18, 1.15);
  const veinGeo = trackGeo(new THREE.BoxGeometry(0.018, 0.014, 0.68));
  for (let i = 0; i < lobeCount; i++) {
    const ang = (i / lobeCount) * Math.PI * 2;
    const lobe = new THREE.Mesh(lobeGeo, i % 2 === 0 ? leafTopMat : leafEdgeMat);
    lobe.position.set(Math.sin(ang) * 0.64, -0.065, Math.cos(ang) * 0.64);
    lobe.rotation.y = ang;
    lobe.rotation.x = 0.16;
    canopy.add(lobe);

    if (i % 2 === 0) {
      const vein = new THREE.Mesh(veinGeo, leafVeinMat);
      vein.position.set(Math.sin(ang) * 0.37, 0.045, Math.cos(ang) * 0.37);
      vein.rotation.y = ang;
      vein.rotation.x = 0.24;
      canopy.add(vein);
    }
  }

  const centerBud = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.075, 12, 10)),
    dewGoldMat,
  );
  centerBud.scale.set(1.2, 0.75, 1.2);
  centerBud.position.y = 0.125;
  canopy.add(centerBud);

  // Cute Frog perched cheerfully on top of the lotus leaf!
  const frogGroup = new THREE.Group();
  frogGroup.position.set(0.22, 0.11, 0.18);
  frogGroup.rotation.y = -0.35;
  const frogGreenMat = trackMat(makeStandard('#65DF4A', 0.45, 0.04));
  const frogBellyMat = trackMat(makeStandard('#E9FCD1', 0.55, 0.02));
  const frogWhiteMat = trackMat(makeStandard('#FFFFFF', 0.25, 0.02));
  const frogDarkMat = trackMat(makeStandard('#111827', 0.2, 0.1));
  const frogBlushMat = trackMat(makeStandard('#FDA4AF', 0.5, 0.02));

  const fBody = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.115, 14, 12)), frogGreenMat);
  fBody.scale.set(1.08, 0.84, 1.0);
  fBody.position.y = 0.085;
  const fBelly = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.088, 12, 10)), frogBellyMat);
  fBelly.scale.set(1.0, 0.72, 0.75);
  fBelly.position.set(0, 0.07, 0.042);

  for (const s of [-1, 1]) {
    const eyeBump = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.046, 12, 10)), frogGreenMat);
    eyeBump.position.set(s * 0.062, 0.168, 0.048);
    const sclera = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.036, 10, 10)), frogWhiteMat);
    sclera.position.set(s * 0.064, 0.172, 0.064);
    const pupil = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.02, 8, 8)), frogDarkMat);
    pupil.position.set(s * 0.065, 0.174, 0.089);
    const blush = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.022, 8, 8)), frogBlushMat);
    blush.scale.set(1.2, 0.75, 0.6);
    blush.position.set(s * 0.082, 0.115, 0.076);
    const paw = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.03, 8, 8)), frogGreenMat);
    paw.scale.set(0.95, 0.6, 1.3);
    paw.position.set(s * 0.068, 0.022, 0.095);
    const thigh = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.048, 10, 8)), frogGreenMat);
    thigh.scale.set(0.8, 0.85, 1.25);
    thigh.position.set(s * 0.105, 0.045, -0.025);
    frogGroup.add(eyeBump, sclera, pupil, blush, paw, thigh);
  }
  frogGroup.add(fBody, fBelly);
  canopy.add(frogGroup);

  // Fluffy Miniature Raincloud floating above the lotus leaf & frog
  const cloudGroup = new THREE.Group();
  cloudGroup.position.set(0.02, 0.62, 0.02);
  const cloudMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#DDF0FC',
      emissive: '#60A5FA',
      emissiveIntensity: 0.12,
      roughness: 0.72,
    }),
  );
  const cloudShadeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#B5D5EC',
      emissive: '#3B82F6',
      emissiveIntensity: 0.1,
      roughness: 0.76,
    }),
  );
  const cloudSpecs: [number, number, number, number, boolean][] = [
    [0, 0.07, 0, 0.2, false],
    [-0.17, 0.01, 0.03, 0.16, true],
    [0.18, 0.02, -0.02, 0.155, false],
    [-0.07, -0.01, 0.12, 0.145, true],
    [0.09, -0.01, -0.11, 0.14, true],
  ];
  for (const [cx, cy, cz, cr, shade] of cloudSpecs) {
    const puff = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(cr, 12, 10)),
      shade ? cloudShadeMat : cloudMat,
    );
    puff.scale.set(1.15, 0.85, 1.05);
    puff.position.set(cx, cy, cz);
    cloudGroup.add(puff);
  }
  canopy.add(cloudGroup);

  // Animated falling translucent cyan raindrops around the giant lotus rim
  const rainMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: '#7DD3FC',
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    }),
  );
  const rainGeo = trackGeo(new THREE.CylinderGeometry(0.008, 0.014, 0.11, 6));
  const rainDrops: LotusRainDrop[] = [];
  for (let i = 0; i < 18; i++) {
    const ang = (i / 18) * Math.PI * 2 + (i % 3) * 0.25;
    const rad = i % 2 === 0 ? 0.82 : 0.62;
    const mesh = new THREE.Mesh(rainGeo, rainMat);
    mesh.renderOrder = 5;
    const bx = Math.sin(ang) * rad;
    const bz = Math.cos(ang) * rad;
    mesh.position.set(bx, 0.3, bz);
    canopy.add(mesh);
    rainDrops.push({
      mesh,
      baseX: bx,
      baseZ: bz,
      phase: (i * 0.17) % 1,
      speed: 0.85 + (i % 4) * 0.18,
    });
  }

  return {
    mountId: def.id,
    kind: def.kind,
    root,
    boardCenterPivot: null,
    rearPivot: null,
    crankGroup: null,
    leftPedalPivot: null,
    rightPedalPivot: null,
    steerGroup: null,
    kickstandPivot: null,
    lotusPivot,
    lotusFrogGroup: frogGroup,
    lotusCloudGroup: cloudGroup,
    lotusRainDrops: rainDrops,
    wheels: [],
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}

function createDongThapPetalGeometry(
  length: number,
  maxWidth: number,
  cupDepth: number,
  outwardCurl: number,
  baseColorHex: string,
  tipColorHex: string,
): THREE.BufferGeometry {
  const segU = 8;
  const segV = 12;
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const baseC = new THREE.Color(baseColorHex);
  const tipC = new THREE.Color(tipColorHex);
  const tmpC = new THREE.Color();

  for (let iv = 0; iv <= segV; iv++) {
    const v = iv / segV; // 0 = base at receptacle, 1 = pointed lotus tip
    // Graceful pointed lotus boat-petal width profile
    const widthProfile = Math.sin(Math.pow(v, 0.72) * Math.PI) * (1 - 0.12 * v);
    const halfW = maxWidth * 0.5 * Math.max(0.06, widthProfile);
    // Outward curve arching gently upward into cupped bowl
    const y = v * length;
    const zCurve = Math.sin(v * Math.PI * 0.78) * outwardCurl - Math.pow(v, 2.2) * outwardCurl * 0.35;

    // Color blend: creamy pearl white lower base -> luminous sakura pink -> deeper rose tip
    const colorBlend = Math.pow(v, 0.85);
    tmpC.copy(baseC).lerp(tipC, colorBlend);

    for (let iu = 0; iu <= segU; iu++) {
      const u = (iu / segU) * 2 - 1; // -1..1 across petal width
      const x = u * halfW;
      // Cupped cross-section (concave inside toward flower center)
      const bowlZ = (1 - u * u) * cupDepth * Math.sin(v * Math.PI);
      positions.push(x, y, zCurve + bowlZ);
      colors.push(tmpC.r, tmpC.g, tmpC.b);
    }
  }

  for (let iv = 0; iv < segV; iv++) {
    for (let iu = 0; iu < segU; iu++) {
      const a = iv * (segU + 1) + iu;
      const b = a + 1;
      const c = a + (segU + 1);
      const d = c + 1;
      indices.push(a, b, d, a, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function buildDongThapLotusRig(def: MountDefinition): MountRig {
  const root = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };

  const lotusPivot = new THREE.Group();
  root.add(lotusPivot);

  const stemMat = trackMat(makeStandard('#6BC84A', 0.42, 0.04));
  const stemDarkMat = trackMat(makeStandard('#479E32', 0.46, 0.04));
  const podGoldMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#FDE047',
      emissive: '#F59E0B',
      emissiveIntensity: 0.42,
      roughness: 0.28,
      metalness: 0.14,
    }),
  );
  const stamenMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#FFFBEB',
      emissive: '#FBBF24',
      emissiveIntensity: 0.55,
      roughness: 0.25,
    }),
  );

  // Sculpted slightly arched green lotus stem held cleanly in right hand (0,0,0) rising to giant flower
  const stemCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.015, -0.26, 0.018),
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.018, 0.48, -0.025),
    new THREE.Vector3(0.025, 0.96, -0.035),
  ]);
  const stemMesh = new THREE.Mesh(
    trackGeo(new THREE.TubeGeometry(stemCurve, 22, 0.021, 10, false)),
    stemMat,
  );
  const stemTipCap = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.021, 8, 8)), stemDarkMat);
  stemTipCap.position.set(0.015, -0.26, 0.018);
  lotusPivot.add(stemMesh, stemTipCap);

  // Giant Luminous Sen Dong Thap Blossom Group
  const blossomGroup = new THREE.Group();
  blossomGroup.position.set(0.025, 0.98, -0.035);
  lotusPivot.add(blossomGroup);

  // Sculpted green lotus receptacle cup & 6 calyx sepals
  const cupMesh = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.115, 0.028, 0.125, 16)),
    stemMat,
  );
  cupMesh.position.y = 0.04;
  blossomGroup.add(cupMesh);

  const sepalGeo = trackGeo(
    createDongThapPetalGeometry(0.19, 0.085, 0.018, 0.02, '#5EC643', '#3E9A2F'),
  );
  const sepalMat = trackMat(
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.45,
      side: THREE.DoubleSide,
    }),
  );
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2;
    const sepal = new THREE.Mesh(sepalGeo, sepalMat);
    sepal.position.set(Math.sin(ang) * 0.08, 0.075, Math.cos(ang) * 0.08);
    sepal.rotation.y = ang;
    sepal.rotation.x = 1.08;
    blossomGroup.add(sepal);
  }

  // Luminous vertex-colored sakura-pink-to-pearl-white lotus petals!
  const petalOuterMat = trackMat(
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      emissive: '#FF8FC4',
      emissiveIntensity: 0.24,
      roughness: 0.3,
      metalness: 0.02,
      side: THREE.DoubleSide,
    }),
  );
  const petalInnerMat = trackMat(
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      emissive: '#FFD0E6',
      emissiveIntensity: 0.28,
      roughness: 0.26,
      metalness: 0.02,
      side: THREE.DoubleSide,
    }),
  );

  // Outer Tier (8 sweeping large petals spanning ~1.28m)
  const outerGeo = trackGeo(
    createDongThapPetalGeometry(0.66, 0.34, 0.075, 0.085, '#FFF6FA', '#FF78B4'),
  );
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    const petal = new THREE.Mesh(outerGeo, petalOuterMat);
    petal.position.set(Math.sin(ang) * 0.095, 0.085, Math.cos(ang) * 0.095);
    petal.rotation.y = ang;
    petal.rotation.x = 0.88 + (i % 2) * 0.08;
    blossomGroup.add(petal);
  }

  // Middle Tier (7 luminous cupped petals)
  const midGeo = trackGeo(
    createDongThapPetalGeometry(0.56, 0.29, 0.07, 0.065, '#FFF9FC', '#FF97C6'),
  );
  for (let i = 0; i < 7; i++) {
    const ang = (i / 7) * Math.PI * 2 + 0.28;
    const petal = new THREE.Mesh(midGeo, petalOuterMat);
    petal.position.set(Math.sin(ang) * 0.078, 0.1, Math.cos(ang) * 0.078);
    petal.rotation.y = ang;
    petal.rotation.x = 0.56;
    blossomGroup.add(petal);
  }

  // Inner Tier (6 glowing pearl-pink upright cradling petals)
  const innerGeo = trackGeo(
    createDongThapPetalGeometry(0.42, 0.23, 0.062, 0.045, '#FFFFFF', '#FFB4D7'),
  );
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2 + 0.52;
    const petal = new THREE.Mesh(innerGeo, petalInnerMat);
    petal.position.set(Math.sin(ang) * 0.058, 0.115, Math.cos(ang) * 0.058);
    petal.rotation.y = ang;
    petal.rotation.x = 0.28;
    blossomGroup.add(petal);
  }

  // Glowing Golden Lotus Seedpod (Gương Sen) & Stamen Crown
  const seedpod = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.088, 0.052, 0.078, 16)),
    podGoldMat,
  );
  seedpod.position.y = 0.155;
  blossomGroup.add(seedpod);

  const stamenGeo = trackGeo(new THREE.SphereGeometry(0.015, 8, 6));
  for (let s = 0; s < 16; s++) {
    const ang = (s / 16) * Math.PI * 2;
    const dot = new THREE.Mesh(stamenGeo, stamenMat);
    dot.position.set(Math.sin(ang) * 0.095, 0.195 + (s % 2) * 0.02, Math.cos(ang) * 0.095);
    blossomGroup.add(dot);
  }

  // Glowing pink-gold lotus aura rings slowly swirling around blossom
  const auraRings: THREE.Mesh[] = [];
  const ringMatPink = trackMat(
    new THREE.MeshBasicMaterial({
      color: '#FF9CD0',
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    }),
  );
  const ringMatGold = trackMat(
    new THREE.MeshBasicMaterial({
      color: '#FDE68A',
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
    }),
  );
  const aura1 = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.68, 0.014, 8, 42)), ringMatPink);
  aura1.position.y = 0.22;
  aura1.rotation.set(Math.PI / 2 - 0.18, 0.12, 0);
  const aura2 = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.54, 0.01, 8, 36)), ringMatGold);
  aura2.position.y = 0.26;
  aura2.rotation.set(Math.PI / 2 + 0.22, -0.15, 0);
  blossomGroup.add(aura1, aura2);
  auraRings.push(aura1, aura2);

  // 12 Drifting Falling Pink Lotus Petals swirling gracefully around the character!
  const miniPetalGeo = trackGeo(
    createDongThapPetalGeometry(0.095, 0.056, 0.016, 0.012, '#FFF2F8', '#FF78B4'),
  );
  const fallingPetals: LotusFallingPetal[] = [];
  for (let i = 0; i < 12; i++) {
    const mesh = new THREE.Mesh(miniPetalGeo, petalOuterMat);
    mesh.renderOrder = 5;
    blossomGroup.add(mesh);
    fallingPetals.push({
      mesh,
      angle: (i / 12) * Math.PI * 2,
      radius: 0.42 + (i % 3) * 0.19,
      phase: (i * 0.19) % 1,
      speed: 0.34 + (i % 4) * 0.07,
      spinOffset: i * 1.1,
    });
  }

  // 14 Twinkling Golden & Rose Sparkle Motes rising softly around the lotus
  const sparkleMatGold = trackMat(
    new THREE.MeshBasicMaterial({
      color: '#FEF08A',
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    }),
  );
  const sparkleMatRose = trackMat(
    new THREE.MeshBasicMaterial({
      color: '#FBCFE8',
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    }),
  );
  const sparkleGeo = trackGeo(new THREE.OctahedronGeometry(0.022, 0));
  const sparkles: LotusFallingPetal[] = [];
  for (let i = 0; i < 14; i++) {
    const mesh = new THREE.Mesh(sparkleGeo, i % 2 === 0 ? sparkleMatGold : sparkleMatRose);
    mesh.renderOrder = 6;
    blossomGroup.add(mesh);
    sparkles.push({
      mesh,
      angle: (i / 14) * Math.PI * 2 + 0.2,
      radius: 0.36 + (i % 4) * 0.14,
      phase: (i * 0.23) % 1,
      speed: 0.42 + (i % 3) * 0.12,
      spinOffset: i * 0.9,
    });
  }

  return {
    mountId: def.id,
    kind: def.kind,
    root,
    boardCenterPivot: null,
    rearPivot: null,
    crankGroup: null,
    leftPedalPivot: null,
    rightPedalPivot: null,
    steerGroup: null,
    kickstandPivot: null,
    lotusPivot,
    dongThapBlossomGroup: blossomGroup,
    dongThapAuraRings: auraRings,
    dongThapFallingPetals: fallingPetals,
    dongThapSparkles: sparkles,
    wheels: [],
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}

function buildWitchBroomRig(def: MountDefinition): MountRig {
  const root = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };

  const broomPivot = new THREE.Group();
  broomPivot.position.set(0, 0.92, 0);
  root.add(broomPivot);

  const woodMat = trackMat(makeStandard('#633C22', 0.52, 0.06));
  const woodDarkMat = trackMat(makeStandard('#472915', 0.58, 0.04));
  const strawMat = trackMat(makeStandard('#C88D48', 0.72, 0.02));
  const strawLightMat = trackMat(makeStandard('#E3AD62', 0.68, 0.02));
  const redRibbonMat = trackMat(makeStandard('#DF2B32', 0.44, 0.04));
  const goldMat = trackMat(makeStandard('#F8CE48', 0.34, 0.16));
  const goldShadeMat = trackMat(makeStandard('#D99A22', 0.42, 0.12));

  // Long sculpted slightly arched wooden broomstick extending forward (+Z) & rear (-Z)
  const stickPts = [
    new THREE.Vector3(0, 0.02, 0.74),
    new THREE.Vector3(0, 0.015, 0.36),
    new THREE.Vector3(0, 0.0, 0.0),
    new THREE.Vector3(0, -0.01, -0.44),
  ];
  const stickCurve = new THREE.CatmullRomCurve3(stickPts);
  const stickMesh = new THREE.Mesh(
    trackGeo(new THREE.TubeGeometry(stickCurve, 22, 0.032, 12, false)),
    woodMat,
  );
  broomPivot.add(stickMesh);

  const frontCap = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.034, 12, 10)), woodDarkMat);
  frontCap.position.set(0, 0.02, 0.74);
  const frontGoldBand = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.033, 0.008, 8, 16)),
    goldMat,
  );
  frontGoldBand.position.set(0, 0.019, 0.67);
  broomPivot.add(frontCap, frontGoldBand);

  // Flared sculpted broom bristles at rear (-Z)
  const bristlePts = [
    new THREE.Vector2(0.042, 0.0),
    new THREE.Vector2(0.095, -0.14),
    new THREE.Vector2(0.155, -0.34),
    new THREE.Vector2(0.172, -0.5),
    new THREE.Vector2(0.13, -0.55),
    new THREE.Vector2(0.0, -0.52),
  ];
  const bristleGeo = trackGeo(new THREE.LatheGeometry(bristlePts, 24));
  bristleGeo.rotateX(Math.PI / 2);
  const bristles = new THREE.Mesh(bristleGeo, strawMat);
  bristles.scale.set(1.06, 0.86, 1.0);
  bristles.position.set(0, -0.015, -0.41);
  broomPivot.add(bristles);

  // Subtle ribbed straw ridges around tail for rich clay craftsmanship
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const rib = new THREE.Mesh(
      trackGeo(new THREE.CapsuleGeometry(0.024, 0.36, 4, 8)),
      i % 2 === 0 ? strawLightMat : strawMat,
    );
    rib.position.set(Math.cos(a) * 0.115, -0.018 + Math.sin(a) * 0.095, -0.71);
    rib.rotation.x = Math.PI / 2 + Math.sin(a) * 0.2;
    rib.rotation.z = -Math.cos(a) * 0.2;
    broomPivot.add(rib);
  }

  // Crimson ribbon collar + double sculpted ribbon bow tying the bristles
  const tieBand = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.056, 0.062, 0.072, 18)),
    redRibbonMat,
  );
  tieBand.rotation.x = Math.PI / 2;
  tieBand.position.set(0, -0.012, -0.42);
  const bowKnot = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.036, 10, 8)), redRibbonMat);
  bowKnot.position.set(0, 0.05, -0.42);
  broomPivot.add(tieBand, bowKnot);
  [-1, 1].forEach((s) => {
    const loop = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.048, 10, 8)), redRibbonMat);
    loop.scale.set(1.5, 0.72, 0.5);
    loop.position.set(s * 0.064, 0.062, -0.42);
    loop.rotation.z = s * 0.32;
    broomPivot.add(loop);
  });

  // Crescent-moon golden pouch hanging from side of broomstick (matches Image 1)
  const broomPouchGroup = new THREE.Group();
  broomPouchGroup.position.set(-0.15, 0.04, -0.24);
  const strapCord = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.07, 0.008, 6, 16)),
    goldShadeMat,
  );
  strapCord.position.set(0.07, 0.04, 0);
  strapCord.rotation.y = Math.PI / 2;
  const crescentMoon = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.115, 0.045, 10, 20, Math.PI * 1.15)),
    goldMat,
  );
  crescentMoon.rotation.z = -Math.PI * 0.72;
  crescentMoon.rotation.y = -0.3;
  crescentMoon.position.set(-0.02, -0.03, 0);
  broomPouchGroup.add(strapCord, crescentMoon);
  broomPivot.add(broomPouchGroup);

  // Cute perched miniature Black Cat (Mèo Đen) riding along behind the player!
  const broomCatGroup = new THREE.Group();
  broomCatGroup.position.set(-0.08, 0.09, -0.38);
  broomCatGroup.rotation.y = 0.22;

  const catFurMat = trackMat(makeStandard('#282233', 0.65, 0.02));
  const catPinkMat = trackMat(makeStandard('#EF8FA6', 0.68, 0.02));
  const catEyeMat = trackMat(makeStandard('#F59E0B', 0.16, 0.05));
  const catPupilMat = trackMat(makeStandard('#120E17', 0.08, 0.05));
  const catGlintMat = trackMat(new THREE.MeshBasicMaterial({color: '#FFFFFF'}));

  const cBody = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.075, 14, 12)), catFurMat);
  cBody.scale.set(0.86, 0.88, 1.24);
  cBody.position.set(0, 0.035, -0.02);

  const cHead = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.082, 16, 14)), catFurMat);
  cHead.scale.set(1.06, 0.94, 0.96);
  cHead.position.set(0, 0.135, 0.065);
  broomCatGroup.add(cBody, cHead);

  [-1, 1].forEach((side) => {
    const ear = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.032, 0.068, 8)), catFurMat);
    ear.scale.set(0.95, 1, 0.56);
    ear.position.set(side * 0.058, 0.21, 0.062);
    ear.rotation.z = side * -0.34;
    const inner = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.018, 0.044, 6)), catPinkMat);
    inner.scale.set(0.85, 1, 0.42);
    inner.position.set(side * 0.058, 0.205, 0.071);
    inner.rotation.z = side * -0.34;

    const iris = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.024, 12, 10)), catEyeMat);
    iris.scale.set(1.02, 1.06, 0.7);
    iris.position.set(side * 0.035, 0.145, 0.13);
    const pupil = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.015, 10, 8)), catPupilMat);
    pupil.scale.set(0.68, 1.04, 0.7);
    pupil.position.set(side * 0.035, 0.145, 0.138);
    const glint = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.006, 6, 6)), catGlintMat);
    glint.position.set(side * 0.04, 0.153, 0.149);

    const paw = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.024, 8, 8)), catFurMat);
    paw.scale.set(0.9, 0.7, 1.2);
    paw.position.set(side * 0.042, -0.02, 0.058);
    broomCatGroup.add(ear, inner, iris, pupil, glint, paw);
  });

  const broomCatTail = new THREE.Group();
  broomCatTail.position.set(0, 0.06, -0.11);
  const cTailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0.05, -0.06),
    new THREE.Vector3(0, 0.14, -0.065),
    new THREE.Vector3(0, 0.19, -0.02),
  ]);
  const cTailMesh = new THREE.Mesh(
    trackGeo(new THREE.TubeGeometry(cTailCurve, 12, 0.014, 8, false)),
    catFurMat,
  );
  broomCatTail.add(cTailMesh);
  broomCatGroup.add(broomCatTail);
  broomPivot.add(broomCatGroup);

  return {
    mountId: def.id,
    kind: def.kind,
    root,
    boardCenterPivot: null,
    rearPivot: null,
    crankGroup: null,
    leftPedalPivot: null,
    rightPedalPivot: null,
    steerGroup: null,
    kickstandPivot: null,
    broomPivot,
    broomCatGroup,
    broomCatTail,
    broomPouchGroup,
    wheels: [],
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}

export function buildMountRig(mountId: MountId): MountRig {
  const def = MOUNT_CATALOG[mountId] ?? MOUNT_CATALOG.skateboard_classic;
  if (def.kind === 'bicycle') {
    return buildBicycleRig(def);
  }
  if (def.kind === 'lotus_umbrella') {
    return buildLotusUmbrellaRig(def);
  }
  if (def.kind === 'dong_thap_lotus') {
    return buildDongThapLotusRig(def);
  }
  if (def.kind === 'witch_broom') {
    return buildWitchBroomRig(def);
  }
  return buildSkateboardRig(def);
}

export function updateMountAnimation(rig: MountRig, state: MountAnimationState): void {
  for (let i = 0; i < rig.wheels.length; i++) {
    rig.wheels[i].rotation.x = state.wheelAngle;
  }

  if (rig.kind === 'witch_broom') {
    rig.root.rotation.z = 0;
    const isMoving = state.pose === 'broom_ride';
    const floatBob = Math.sin(state.elapsed * 2.5) * 0.075;
    if (rig.broomPivot) {
      rig.broomPivot.position.y = 0.94 + floatBob;
      rig.broomPivot.rotation.x = isMoving ? 0.14 : 0.03 + Math.sin(state.elapsed * 2.0) * 0.025;
      rig.broomPivot.rotation.z = Math.sin(state.elapsed * 1.9) * 0.045;
    }
    if (rig.broomCatGroup) {
      rig.broomCatGroup.rotation.z = Math.sin(state.elapsed * 2.2) * 0.05;
      rig.broomCatGroup.rotation.y = 0.22 + Math.sin(state.elapsed * 1.4) * 0.12;
    }
    if (rig.broomCatTail) {
      rig.broomCatTail.rotation.y = Math.sin(state.elapsed * 4.5) * 0.28;
      rig.broomCatTail.rotation.z = Math.cos(state.elapsed * 3.4) * 0.14;
    }
    if (rig.broomPouchGroup) {
      rig.broomPouchGroup.rotation.z = Math.sin(state.elapsed * 3.2) * 0.08 + (isMoving ? 0.16 : 0);
    }
    return;
  }

  if (rig.kind === 'dong_thap_lotus') {
    rig.root.rotation.z = 0;
    const isMoving = state.pose === 'lotus_ride';
    if (rig.lotusPivot) {
      rig.lotusPivot.rotation.x = isMoving ? 0.14 : 0.02 + Math.sin(state.elapsed * 2.1) * 0.025;
      rig.lotusPivot.rotation.z = Math.sin(state.elapsed * 1.8) * 0.038;
    }
    if (rig.dongThapBlossomGroup) {
      rig.dongThapBlossomGroup.rotation.y = Math.sin(state.elapsed * 0.7) * 0.18;
    }
    if (rig.dongThapAuraRings) {
      const [ring1, ring2] = rig.dongThapAuraRings;
      if (ring1) {
        ring1.rotation.z = state.elapsed * 0.65;
        const s1 = 1 + Math.sin(state.elapsed * 2.4) * 0.045;
        ring1.scale.set(s1, s1, 1);
      }
      if (ring2) {
        ring2.rotation.z = -state.elapsed * 0.9;
        const s2 = 1 + Math.cos(state.elapsed * 2.8) * 0.05;
        ring2.scale.set(s2, s2, 1);
      }
    }
    if (rig.dongThapFallingPetals) {
      for (const petal of rig.dongThapFallingPetals) {
        const u = (state.elapsed * petal.speed + petal.phase) % 1;
        const ang = petal.angle + state.elapsed * 0.85;
        const rad = petal.radius + Math.sin(u * Math.PI * 2 + petal.spinOffset) * 0.14;
        petal.mesh.position.set(
          Math.sin(ang) * rad,
          0.32 - u * 1.38,
          Math.cos(ang) * rad,
        );
        petal.mesh.rotation.set(
          Math.sin(state.elapsed * 2.2 + petal.spinOffset) * 0.9,
          ang + state.elapsed * 1.6,
          Math.cos(state.elapsed * 2.6 + petal.spinOffset) * 0.75,
        );
        const fadeScale = Math.sin(u * Math.PI);
        petal.mesh.scale.setScalar(0.55 + fadeScale * 0.55);
      }
    }
    if (rig.dongThapSparkles) {
      for (const sp of rig.dongThapSparkles) {
        const u = (state.elapsed * sp.speed + sp.phase) % 1;
        const ang = sp.angle - state.elapsed * 0.55;
        const rad = sp.radius + Math.cos(u * Math.PI * 2) * 0.08;
        sp.mesh.position.set(
          Math.sin(ang) * rad,
          -0.25 + u * 0.92,
          Math.cos(ang) * rad,
        );
        const pulse = Math.sin(u * Math.PI) * (0.65 + 0.45 * Math.sin(state.elapsed * 6.5 + sp.spinOffset));
        sp.mesh.scale.setScalar(Math.max(0.08, pulse));
        sp.mesh.rotation.y = state.elapsed * 2.8 + sp.spinOffset;
      }
    }
    return;
  }

  if (rig.kind === 'lotus_umbrella') {
    rig.root.rotation.z = 0;
    const isMoving = state.pose === 'lotus_ride';
    if (rig.lotusPivot) {
      rig.lotusPivot.rotation.x = isMoving ? 0.12 : 0.02 + Math.sin(state.elapsed * 2.1) * 0.025;
      rig.lotusPivot.rotation.z = Math.sin(state.elapsed * 1.8) * 0.035;
    }
    if (rig.lotusFrogGroup) {
      const fHop = Math.abs(Math.sin(state.elapsed * 2.6));
      rig.lotusFrogGroup.position.y = 0.11 + (fHop > 0.85 ? (fHop - 0.85) * 0.18 : 0);
      rig.lotusFrogGroup.rotation.y = -0.35 + Math.sin(state.elapsed * 1.3) * 0.14;
    }
    if (rig.lotusCloudGroup) {
      rig.lotusCloudGroup.position.y = 0.62 + Math.sin(state.elapsed * 2.3) * 0.035;
      rig.lotusCloudGroup.rotation.y = Math.sin(state.elapsed * 0.9) * 0.12;
    }
    if (rig.lotusRainDrops) {
      for (const drop of rig.lotusRainDrops) {
        const u = (state.elapsed * drop.speed + drop.phase) % 1;
        drop.mesh.position.set(drop.baseX, 0.52 - u * 1.38, drop.baseZ);
      }
    }
    return;
  }

  if (rig.kind === 'skateboard') {
    const idleB = THREE.MathUtils.clamp(
      state.idleBlend ?? (state.pose === 'skate_idle' ? 1 : 0),
      0,
      1,
    );

    if (rig.boardCenterPivot) {
      // Position board cleanly IN FRONT (+Z) of palm & cuff so neither hand nor cuff pokes out front!
      const idleTiltX = -Math.PI / 2 + 0.14;
      const idleYawY = 0.16;
      const idleRollZ = -0.06;
      rig.boardCenterPivot.position.set(
        -0.265 * idleB,
        0.41 * idleB,
        0.335 * idleB,
      );
      rig.boardCenterPivot.rotation.set(
        idleTiltX * idleB,
        idleYawY * idleB,
        idleRollZ * idleB,
      );
    }

    if (rig.rearPivot) {
      if (state.pose === 'skate_idle') {
        rig.rearPivot.rotation.x = Math.sin(state.elapsed * 2.1) * 0.008;
      } else if (state.pose === 'skate_push') {
        rig.rearPivot.rotation.x = Math.sin(state.elapsed * 4.5) * 0.015;
      } else {
        rig.rearPivot.rotation.x = Math.sin(state.elapsed * 6.0) * 0.014;
      }
    }
    rig.root.rotation.z = 0;
  }

  if (rig.kind === 'bicycle') {
    // Keep bicycle upright & grounded evenly when stopped; only kickstand deploys!
    rig.root.rotation.z = 0;
    if (rig.kickstandPivot) {
      const idleB = THREE.MathUtils.clamp(
        state.idleBlend ?? (state.pose === 'bike_idle' ? 1 : 0),
        0,
        1,
      );
      rig.kickstandPivot.rotation.x = THREE.MathUtils.lerp(-1.42, 0.08, idleB);
    }
    if (rig.crankGroup) {
      rig.crankGroup.rotation.x = state.crankAngle;
    }
    if (rig.leftPedalPivot) {
      rig.leftPedalPivot.rotation.x = -state.crankAngle;
    }
    if (rig.rightPedalPivot) {
      rig.rightPedalPivot.rotation.x = -state.crankAngle;
    }
    if (rig.steerGroup) {
      rig.steerGroup.rotation.y = state.steerAngle;
    }
  }
}
