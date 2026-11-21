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
  pose: 'skate_idle' | 'skate_ride' | 'skate_push' | 'bike_idle' | 'bike_ride';
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

export function buildMountRig(mountId: MountId): MountRig {
  const def = MOUNT_CATALOG[mountId] ?? MOUNT_CATALOG.skateboard_classic;
  if (def.kind === 'bicycle') {
    return buildBicycleRig(def);
  }
  return buildSkateboardRig(def);
}

export function updateMountAnimation(rig: MountRig, state: MountAnimationState): void {
  for (let i = 0; i < rig.wheels.length; i++) {
    rig.wheels[i].rotation.x = state.wheelAngle;
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
