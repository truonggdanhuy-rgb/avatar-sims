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
  lenScale: number;
  widthScale: number;
  driftX: number;
}

export interface LotusRainSplash {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  baseX: number;
  baseY: number;
  baseZ: number;
  phase: number;
  speed: number;
  maxScale: number;
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
  lotusRainSplashes?: LotusRainSplash[];
  dongThapBlossomGroup?: THREE.Group | null;
  dongThapGlowLight?: THREE.PointLight | null;
  dongThapGlowAura?: THREE.Mesh | null;
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

function createSoftRadialGlowTexture(
  innerColor: string,
  midColor: string,
  outerColor: string,
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const grad = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
  grad.addColorStop(0, innerColor);
  grad.addColorStop(0.42, midColor);
  grad.addColorStop(1, outerColor);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createLotusLeafCanopyGeometry(radius: number): THREE.BufferGeometry {
  const rings = 10;
  const segs = 56;
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  const centerC = new THREE.Color('#6CEB88');
  const midC = new THREE.Color('#2BAE62');
  const rimC = new THREE.Color('#197942');
  const tmpC = new THREE.Color();

  for (let ir = 0; ir <= rings; ir++) {
    const rFrac = ir / rings;
    for (let is = 0; is <= segs; is++) {
      const ang = (is / segs) * Math.PI * 2;
      // Signature lotus-leaf V-notch on the rear edge (~ang = PI * 0.92)
      const notchAngle = Math.abs(Math.atan2(Math.sin(ang - 2.85), Math.cos(ang - 2.85)));
      const notchFactor = notchAngle < 0.28 ? 1 - 0.16 * Math.cos((notchAngle / 0.28) * (Math.PI / 2)) : 1;
      // Organic ruffled scalloped edge
      const ruffleRad = 1 + 0.045 * Math.sin(ang * 13) * Math.pow(rFrac, 1.6);
      const r = rFrac * radius * notchFactor * ruffleRad;

      // Dome curve + gentle lifted wavy outer edge
      const domeY = (1 - Math.pow(rFrac, 1.75)) * 0.19;
      const edgeWaveY = Math.sin(ang * 13) * 0.028 * Math.pow(rFrac, 2.2);
      const rimCurlY = Math.pow(Math.max(0, rFrac - 0.82) / 0.18, 2) * 0.032;
      const y = domeY + edgeWaveY + rimCurlY - 0.08;

      const x = Math.sin(ang) * r;
      const z = Math.cos(ang) * r;
      positions.push(x, y, z);

      if (rFrac < 0.45) {
        tmpC.copy(centerC).lerp(midC, rFrac / 0.45);
      } else {
        tmpC.copy(midC).lerp(rimC, (rFrac - 0.45) / 0.55);
      }
      colors.push(tmpC.r, tmpC.g, tmpC.b);
    }
  }

  for (let ir = 0; ir < rings; ir++) {
    for (let is = 0; is < segs; is++) {
      const a = ir * (segs + 1) + is;
      const b = a + 1;
      const c = a + (segs + 1);
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function buildLotusUmbrellaRig(def: MountDefinition): MountRig {
  const root = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };
  const trackTex = <T extends THREE.Texture | null>(t: T): T => {
    if (t) textures.push(t);
    return t;
  };

  const lotusPivot = new THREE.Group();
  root.add(lotusPivot);

  const stemMat = trackMat(makeStandard('#1F7A47', 0.44, 0.05));
  const stemHookMat = trackMat(makeStandard('#8A5A32', 0.4, 0.08));
  const leafMat = trackMat(
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.44,
      metalness: 0.04,
      side: THREE.DoubleSide,
    }),
  );
  const leafVeinMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#B8F7D4',
      emissive: '#34D399',
      emissiveIntensity: 0.14,
      roughness: 0.36,
    }),
  );
  const dewGoldMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#FDE68A',
      emissive: '#F59E0B',
      emissiveIntensity: 0.32,
      roughness: 0.2,
      metalness: 0.2,
    }),
  );
  const dewWaterMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#E0F9FF',
      emissive: '#7DD3FC',
      emissiveIntensity: 0.28,
      roughness: 0.08,
      metalness: 0.18,
      transparent: true,
      opacity: 0.86,
    }),
  );

  // Gracefully curved emerald stem held at origin (0,0,0) rising to larger canopy at y = 1.16
  const stemCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.02, 0),
    new THREE.Vector3(0.018, 0.36, -0.015),
    new THREE.Vector3(0.012, 0.78, -0.02),
    new THREE.Vector3(0, 1.17, 0),
  ]);
  const shaft = new THREE.Mesh(
    trackGeo(new THREE.TubeGeometry(stemCurve, 22, 0.022, 10, false)),
    stemMat,
  );
  lotusPivot.add(shaft);

  const handleGrip = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.026, 0.026, 0.15, 12)),
    stemHookMat,
  );
  handleGrip.position.set(0, -0.03, 0);
  const handleCurve = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.058, 0.023, 8, 16, Math.PI)),
    stemHookMat,
  );
  handleCurve.rotation.z = Math.PI;
  handleCurve.position.set(0.058, -0.105, 0);
  lotusPivot.add(handleGrip, handleCurve);

  // Larger sculpted ruffled lotus leaf umbrella (~1.84m diameter)
  const canopy = new THREE.Group();
  canopy.position.set(0, 1.16, 0);
  lotusPivot.add(canopy);

  const leafMesh = new THREE.Mesh(trackGeo(createLotusLeafCanopyGeometry(0.92)), leafMat);
  canopy.add(leafMesh);

  // Organic curved radial surface veins following the dome contour
  const veinCount = 10;
  for (let i = 0; i < veinCount; i++) {
    const ang = (i / veinCount) * Math.PI * 2;
    if (Math.abs(Math.atan2(Math.sin(ang - 2.85), Math.cos(ang - 2.85))) < 0.25) continue;
    const vx = Math.sin(ang);
    const vz = Math.cos(ang);
    const veinCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(vx * 0.07, 0.115, vz * 0.07),
      new THREE.Vector3(vx * 0.34, 0.088, vz * 0.34),
      new THREE.Vector3(vx * 0.62, 0.028, vz * 0.62),
      new THREE.Vector3(vx * 0.84, -0.048, vz * 0.84),
    ]);
    const veinMesh = new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(veinCurve, 10, 0.0085, 6, false)),
      leafVeinMat,
    );
    canopy.add(veinMesh);
  }

  // Golden center umbo bud + glistening morning dewdrop pearls on leaf
  const centerBud = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.082, 14, 12)),
    dewGoldMat,
  );
  centerBud.scale.set(1.22, 0.72, 1.22);
  centerBud.position.y = 0.125;
  canopy.add(centerBud);

  const dewCoords: [number, number, number, number][] = [
    [-0.38, 0.095, 0.28, 0.032],
    [0.44, 0.085, -0.22, 0.028],
    [-0.22, 0.065, -0.52, 0.026],
    [0.18, 0.055, 0.56, 0.024],
    [-0.62, 0.025, -0.14, 0.025],
  ];
  for (const [dx, dy, dz, dr] of dewCoords) {
    const drop = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(dr, 10, 8)), dewWaterMat);
    drop.scale.set(1.15, 0.72, 1.15);
    drop.position.set(dx, dy, dz);
    canopy.add(drop);
  }

  // Cute Frog perched cheerfully on top of the lotus leaf
  const frogGroup = new THREE.Group();
  frogGroup.position.set(0.26, 0.1, 0.22);
  frogGroup.rotation.y = -0.35;
  const frogGreenMat = trackMat(makeStandard('#65DF4A', 0.42, 0.04));
  const frogBellyMat = trackMat(makeStandard('#E9FCD1', 0.52, 0.02));
  const frogWhiteMat = trackMat(makeStandard('#FFFFFF', 0.22, 0.02));
  const frogDarkMat = trackMat(makeStandard('#111827', 0.18, 0.1));
  const frogBlushMat = trackMat(makeStandard('#FDA4AF', 0.48, 0.02));

  const fBody = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.122, 14, 12)), frogGreenMat);
  fBody.scale.set(1.08, 0.84, 1.0);
  fBody.position.y = 0.088;
  const fBelly = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.092, 12, 10)), frogBellyMat);
  fBelly.scale.set(1.0, 0.72, 0.75);
  fBelly.position.set(0, 0.072, 0.044);

  for (const s of [-1, 1]) {
    const eyeBump = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.048, 12, 10)), frogGreenMat);
    eyeBump.position.set(s * 0.065, 0.174, 0.05);
    const sclera = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.038, 10, 10)), frogWhiteMat);
    sclera.position.set(s * 0.067, 0.178, 0.066);
    const pupil = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.021, 8, 8)), frogDarkMat);
    pupil.position.set(s * 0.068, 0.18, 0.092);
    const blush = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.023, 8, 8)), frogBlushMat);
    blush.scale.set(1.2, 0.75, 0.6);
    blush.position.set(s * 0.085, 0.12, 0.078);
    const paw = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.032, 8, 8)), frogGreenMat);
    paw.scale.set(0.95, 0.6, 1.3);
    paw.position.set(s * 0.07, 0.024, 0.1);
    const thigh = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.05, 10, 8)), frogGreenMat);
    thigh.scale.set(0.8, 0.85, 1.25);
    thigh.position.set(s * 0.11, 0.048, -0.026);
    frogGroup.add(eyeBump, sclera, pupil, blush, paw, thigh);
  }
  frogGroup.add(fBody, fBelly);
  canopy.add(frogGroup);

  // Rich Layered Fluffy Raincloud floating above the giant lotus umbrella
  const cloudGroup = new THREE.Group();
  cloudGroup.position.set(0.02, 0.68, 0.02);
  const cloudMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#ECF7FF',
      emissive: '#7DD3FC',
      emissiveIntensity: 0.18,
      roughness: 0.7,
    }),
  );
  const cloudShadeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#A5CBE8',
      emissive: '#38BDF8',
      emissiveIntensity: 0.2,
      roughness: 0.74,
    }),
  );
  const cloudSpecs: [number, number, number, number, boolean][] = [
    [0, 0.09, 0, 0.24, false],
    [-0.22, 0.02, 0.04, 0.18, true],
    [0.23, 0.03, -0.03, 0.175, false],
    [-0.1, 0.0, 0.16, 0.165, true],
    [0.12, 0.0, -0.15, 0.16, true],
    [-0.36, -0.02, -0.05, 0.13, true],
    [0.37, -0.02, 0.05, 0.13, false],
    [-0.08, 0.12, -0.07, 0.155, false],
  ];
  for (const [cx, cy, cz, cr, shade] of cloudSpecs) {
    const puff = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(cr, 12, 10)),
      shade ? cloudShadeMat : cloudMat,
    );
    puff.scale.set(1.18, 0.84, 1.08);
    puff.position.set(cx, cy, cz);
    cloudGroup.add(puff);
  }

  // Soft translucent cyan rain-mist halo glowing gently beneath the raincloud
  const rainGlowTex = trackTex(
    createSoftRadialGlowTexture(
      'rgba(186, 230, 253, 0.55)',
      'rgba(56, 189, 248, 0.22)',
      'rgba(56, 189, 248, 0)',
    ),
  );
  const mistHaloMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: '#BAE6FD',
      map: rainGlowTex,
      transparent: true,
      opacity: 0.58,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  const mistHalo = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(1.18, 1.18)), mistHaloMat);
  mistHalo.rotation.x = -Math.PI / 2;
  mistHalo.position.y = -0.08;
  cloudGroup.add(mistHalo);
  canopy.add(cloudGroup);

  // High-Craft Diagonal Shimmering Rain Streaks (tapered droplets with smooth fade-in/out!)
  const rainMatBright = trackMat(
    new THREE.MeshBasicMaterial({
      color: '#E0F4FF',
      transparent: true,
      opacity: 0.82,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  const rainMatSoft = trackMat(
    new THREE.MeshBasicMaterial({
      color: '#7DD3FC',
      transparent: true,
      opacity: 0.62,
      depthWrite: false,
    }),
  );
  const rainGeo = trackGeo(new THREE.CylinderGeometry(0.0022, 0.0088, 0.22, 6));
  const rainDrops: LotusRainDrop[] = [];
  const dropCount = 34;
  for (let i = 0; i < dropCount; i++) {
    const ang = (i / dropCount) * Math.PI * 2 + (i % 3) * 0.27;
    const rad = 0.36 + (i % 4) * 0.22;
    const mesh = new THREE.Mesh(rainGeo, i % 2 === 0 ? rainMatBright : rainMatSoft);
    mesh.renderOrder = 6;
    const bx = Math.sin(ang) * rad;
    const bz = Math.cos(ang) * rad;
    mesh.position.set(bx, 0.25, bz);
    canopy.add(mesh);
    rainDrops.push({
      mesh,
      baseX: bx,
      baseZ: bz,
      phase: (i * 0.137) % 1,
      speed: 1.05 + (i % 5) * 0.2,
      lenScale: 0.78 + (i % 4) * 0.24,
      widthScale: 0.75 + (i % 3) * 0.18,
      driftX: 0.08 + (i % 3) * 0.03,
    });
  }

  // Delicate expanding Rain Splash Ripples around the leaf rim & below the character
  const splashGeo = trackGeo(new THREE.RingGeometry(0.032, 0.056, 18));
  const rainSplashes: LotusRainSplash[] = [];
  const splashCount = 12;
  for (let i = 0; i < splashCount; i++) {
    const ang = (i / splashCount) * Math.PI * 2 + 0.18;
    const isCanopySplash = i % 3 === 0;
    const rad = isCanopySplash ? 0.56 + (i % 2) * 0.16 : 0.78 + (i % 3) * 0.18;
    const mat = trackMat(
      new THREE.MeshBasicMaterial({
        color: isCanopySplash ? '#E0F7FF' : '#93C5FD',
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    const mesh = new THREE.Mesh(splashGeo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.renderOrder = 6;
    const bx = Math.sin(ang) * rad;
    const bz = Math.cos(ang) * rad;
    const by = isCanopySplash ? 0.06 : -1.28;
    mesh.position.set(bx, by, bz);
    canopy.add(mesh);
    rainSplashes.push({
      mesh,
      mat,
      baseX: bx,
      baseY: by,
      baseZ: bz,
      phase: (i * 0.21) % 1,
      speed: 1.2 + (i % 4) * 0.18,
      maxScale: isCanopySplash ? 1.55 : 2.35,
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
    lotusRainSplashes: rainSplashes,
    wheels: [],
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
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
  const segU = 10;
  const segV = 14;
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const baseC = new THREE.Color(baseColorHex);
  const midC = new THREE.Color(baseColorHex).lerp(new THREE.Color(tipColorHex), 0.45);
  const tipC = new THREE.Color(tipColorHex);
  const tmpC = new THREE.Color();

  for (let iv = 0; iv <= segV; iv++) {
    const v = iv / segV; // 0 = base at receptacle, 1 = pointed lotus tip
    // Graceful pointed Dong Thap lotus boat-petal width profile
    const widthProfile = Math.sin(Math.pow(v, 0.72) * Math.PI) * (1 - 0.1 * v);
    const halfW = maxWidth * 0.5 * Math.max(0.055, widthProfile);
    const y = v * length;
    // Sweeping outward blossom arch with delicate upturned petal tip
    const zCurve =
      Math.sin(v * Math.PI * 0.8) * outwardCurl - Math.pow(v, 2.3) * outwardCurl * 0.42;

    if (v < 0.55) {
      tmpC.copy(baseC).lerp(midC, v / 0.55);
    } else {
      tmpC.copy(midC).lerp(tipC, (v - 0.55) / 0.45);
    }

    for (let iu = 0; iu <= segU; iu++) {
      const u = (iu / segU) * 2 - 1; // -1..1 across petal width
      const x = u * halfW;
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
  const textures: THREE.Texture[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };
  const trackTex = <T extends THREE.Texture | null>(t: T): T => {
    if (t) textures.push(t);
    return t;
  };

  const lotusPivot = new THREE.Group();
  root.add(lotusPivot);

  const stemMat = trackMat(makeStandard('#5EC445', 0.4, 0.04));
  const stemDarkMat = trackMat(makeStandard('#3D8E2E', 0.46, 0.04));
  const podGoldMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#FDE047',
      emissive: '#F59E0B',
      emissiveIntensity: 0.5,
      roughness: 0.24,
      metalness: 0.16,
    }),
  );
  const stamenMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#FFFBEB',
      emissive: '#FBBF24',
      emissiveIntensity: 0.68,
      roughness: 0.22,
    }),
  );

  // Longer, gracefully arched green lotus stem held cleanly in hand (0,0,0) rising to giant flower at y = 1.15
  const stemCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.018, -0.34, 0.022),
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.022, 0.56, -0.032),
    new THREE.Vector3(0.028, 1.15, -0.045),
  ]);
  const stemMesh = new THREE.Mesh(
    trackGeo(new THREE.TubeGeometry(stemCurve, 26, 0.023, 12, false)),
    stemMat,
  );
  const stemTipCap = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.023, 8, 8)), stemDarkMat);
  stemTipCap.position.set(0.018, -0.34, 0.022);
  const stemCollar = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.034, 0.025, 0.09, 12)),
    stemDarkMat,
  );
  stemCollar.position.set(0.008, -0.04, 0.008);
  lotusPivot.add(stemMesh, stemTipCap, stemCollar);

  // Grand Luminous Wide-Blooming Sen Dong Thap Blossom (~1.90m full span!)
  const blossomGroup = new THREE.Group();
  blossomGroup.position.set(0.028, 1.16, -0.045);
  lotusPivot.add(blossomGroup);

  // Real Pink PointLight illuminating the lotus petals, character, and nearby world!
  const pinkGlowLight = new THREE.PointLight('#FF78C4', 1.65, 5.4, 1.7);
  pinkGlowLight.position.set(0, 0.28, 0);
  blossomGroup.add(pinkGlowLight);

  // Sculpted green lotus receptacle cup & 8 wide calyx sepals
  const cupMesh = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.145, 0.034, 0.145, 18)),
    stemMat,
  );
  cupMesh.position.y = 0.045;
  blossomGroup.add(cupMesh);

  const sepalGeo = trackGeo(
    createDongThapPetalGeometry(0.26, 0.11, 0.022, 0.032, '#69CC4C', '#3B952C'),
  );
  const sepalMat = trackMat(
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.42,
      side: THREE.DoubleSide,
    }),
  );
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    const sepal = new THREE.Mesh(sepalGeo, sepalMat);
    sepal.position.set(Math.sin(ang) * 0.1, 0.08, Math.cos(ang) * 0.1);
    sepal.rotation.y = ang;
    sepal.rotation.x = 1.28;
    blossomGroup.add(sepal);
  }

  // Silky luminous sakura-pink-to-pearl-white petal materials with warm pink emissive glow
  const petalOuterMat = trackMat(
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      emissive: '#FF70B8',
      emissiveIntensity: 0.36,
      roughness: 0.26,
      metalness: 0.02,
      side: THREE.DoubleSide,
    }),
  );
  const petalMidMat = trackMat(
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      emissive: '#FF92C9',
      emissiveIntensity: 0.38,
      roughness: 0.24,
      metalness: 0.02,
      side: THREE.DoubleSide,
    }),
  );
  const petalInnerMat = trackMat(
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      emissive: '#FFD0E8',
      emissiveIntensity: 0.42,
      roughness: 0.22,
      metalness: 0.02,
      side: THREE.DoubleSide,
    }),
  );

  // Tier 1: Wide-Blooming Outer Skirt (10 grand sweeping petals spanning ~1.92m!)
  const outerGeo = trackGeo(
    createDongThapPetalGeometry(0.88, 0.44, 0.088, 0.145, '#FFF5FA', '#FF5AA6'),
  );
  for (let i = 0; i < 10; i++) {
    const ang = (i / 10) * Math.PI * 2;
    const petal = new THREE.Mesh(outerGeo, petalOuterMat);
    petal.position.set(Math.sin(ang) * 0.115, 0.095, Math.cos(ang) * 0.115);
    petal.rotation.y = ang;
    petal.rotation.x = 1.18 + (i % 2) * 0.08;
    blossomGroup.add(petal);
  }

  // Tier 2: Mid-Outer Blooming Crown (9 rich arched petals)
  const midOuterGeo = trackGeo(
    createDongThapPetalGeometry(0.74, 0.37, 0.08, 0.115, '#FFF7FB', '#FF78B9'),
  );
  for (let i = 0; i < 9; i++) {
    const ang = (i / 9) * Math.PI * 2 + 0.19;
    const petal = new THREE.Mesh(midOuterGeo, petalMidMat);
    petal.position.set(Math.sin(ang) * 0.095, 0.11, Math.cos(ang) * 0.095);
    petal.rotation.y = ang;
    petal.rotation.x = 0.84 + (i % 2) * 0.05;
    blossomGroup.add(petal);
  }

  // Tier 3: Mid-Inner Radiant Cup (8 cupped luminous petals)
  const midInnerGeo = trackGeo(
    createDongThapPetalGeometry(0.56, 0.29, 0.072, 0.08, '#FFFAFC', '#FF9ACE'),
  );
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2 + 0.36;
    const petal = new THREE.Mesh(midInnerGeo, petalMidMat);
    petal.position.set(Math.sin(ang) * 0.075, 0.125, Math.cos(ang) * 0.075);
    petal.rotation.y = ang;
    petal.rotation.x = 0.5;
    blossomGroup.add(petal);
  }

  // Tier 4: Heart Crown (6 glowing pearl-pink upright cradling petals)
  const innerGeo = trackGeo(
    createDongThapPetalGeometry(0.39, 0.22, 0.06, 0.042, '#FFFFFF', '#FFBEDF'),
  );
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2 + 0.52;
    const petal = new THREE.Mesh(innerGeo, petalInnerMat);
    petal.position.set(Math.sin(ang) * 0.052, 0.135, Math.cos(ang) * 0.052);
    petal.rotation.y = ang;
    petal.rotation.x = 0.22;
    blossomGroup.add(petal);
  }

  // Ornate Golden Lotus Seedpod (Gương Sen), Seed Dots & 24 Stamen Filaments
  const seedpod = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.105, 0.06, 0.088, 18)),
    podGoldMat,
  );
  seedpod.position.y = 0.175;
  blossomGroup.add(seedpod);

  const seedDotGeo = trackGeo(new THREE.SphereGeometry(0.012, 6, 6));
  const seedDotMat = trackMat(makeStandard('#B45309', 0.4, 0.1));
  for (let sd = 0; sd < 7; sd++) {
    const r = sd === 0 ? 0 : 0.058;
    const a = sd === 0 ? 0 : ((sd - 1) / 6) * Math.PI * 2;
    const dot = new THREE.Mesh(seedDotGeo, seedDotMat);
    dot.position.set(Math.sin(a) * r, 0.22, Math.cos(a) * r);
    blossomGroup.add(dot);
  }

  const filamentGeo = trackGeo(new THREE.CylinderGeometry(0.003, 0.004, 0.075, 5));
  const pollenGeo = trackGeo(new THREE.SphereGeometry(0.015, 8, 6));
  for (let s = 0; s < 24; s++) {
    const ang = (s / 24) * Math.PI * 2;
    const r = 0.112 + (s % 2) * 0.016;
    const sx = Math.sin(ang) * r;
    const sz = Math.cos(ang) * r;
    const fil = new THREE.Mesh(filamentGeo, stamenMat);
    fil.position.set(sx * 0.92, 0.195, sz * 0.92);
    fil.rotation.y = ang;
    fil.rotation.x = 0.32;
    const dot = new THREE.Mesh(pollenGeo, stamenMat);
    dot.position.set(sx, 0.228 + (s % 2) * 0.022, sz);
    blossomGroup.add(fil, dot);
  }

  // Layered Soft Additive Pink Light Halo (Zero hard polygon edges!)
  const pinkGlowTex = trackTex(
    createSoftRadialGlowTexture(
      'rgba(255, 224, 242, 0.92)',
      'rgba(255, 105, 185, 0.45)',
      'rgba(255, 105, 185, 0)',
    ),
  );
  const auraGlowMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: '#FF85C8',
      map: pinkGlowTex,
      transparent: true,
      opacity: 0.78,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  const glowAuraDisc = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(2.55, 2.55)), auraGlowMat);
  glowAuraDisc.rotation.x = -Math.PI / 2;
  glowAuraDisc.position.y = 0.22;
  glowAuraDisc.renderOrder = 4;

  const innerHeartGlowMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: '#FFB4DE',
      transparent: true,
      opacity: 0.26,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  const innerHeartGlow = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.24, 16, 14)),
    innerHeartGlowMat,
  );
  innerHeartGlow.position.y = 0.24;
  innerHeartGlow.renderOrder = 4;
  blossomGroup.add(glowAuraDisc, innerHeartGlow);

  // Luminous Pink & Rose-Gold Swirling Aura Rings around wide blossom
  const auraRings: THREE.Mesh[] = [];
  const ringMatPink = trackMat(
    new THREE.MeshBasicMaterial({
      color: '#FF94CE',
      transparent: true,
      opacity: 0.48,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  const ringMatGold = trackMat(
    new THREE.MeshBasicMaterial({
      color: '#FDE68A',
      transparent: true,
      opacity: 0.46,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  const aura1 = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.98, 0.015, 8, 48)), ringMatPink);
  aura1.position.y = 0.25;
  aura1.rotation.set(Math.PI / 2 - 0.16, 0.12, 0);
  const aura2 = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.76, 0.011, 8, 42)), ringMatGold);
  aura2.position.y = 0.3;
  aura2.rotation.set(Math.PI / 2 + 0.2, -0.14, 0);
  blossomGroup.add(aura1, aura2);
  auraRings.push(aura1, aura2);

  // 18 Drifting Falling Pink Lotus Petals spiraling gracefully around the character
  const miniPetalGeo = trackGeo(
    createDongThapPetalGeometry(0.11, 0.065, 0.018, 0.016, '#FFF2F8', '#FF6CB0'),
  );
  const fallingPetals: LotusFallingPetal[] = [];
  for (let i = 0; i < 18; i++) {
    const mesh = new THREE.Mesh(miniPetalGeo, petalOuterMat);
    mesh.renderOrder = 6;
    blossomGroup.add(mesh);
    fallingPetals.push({
      mesh,
      angle: (i / 18) * Math.PI * 2,
      radius: 0.56 + (i % 4) * 0.2,
      phase: (i * 0.173) % 1,
      speed: 0.3 + (i % 4) * 0.065,
      spinOffset: i * 1.15,
    });
  }

  // 22 Radiant Pink & Golden Starlight Motes rising softly around the lotus
  const sparkleMatGold = trackMat(
    new THREE.MeshBasicMaterial({
      color: '#FEF08A',
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  const sparkleMatPink = trackMat(
    new THREE.MeshBasicMaterial({
      color: '#FF9BD4',
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  const sparkleGeo = trackGeo(new THREE.OctahedronGeometry(0.026, 0));
  const sparkles: LotusFallingPetal[] = [];
  for (let i = 0; i < 22; i++) {
    const mesh = new THREE.Mesh(sparkleGeo, i % 3 === 0 ? sparkleMatGold : sparkleMatPink);
    mesh.renderOrder = 6;
    blossomGroup.add(mesh);
    sparkles.push({
      mesh,
      angle: (i / 22) * Math.PI * 2 + 0.15,
      radius: 0.45 + (i % 5) * 0.15,
      phase: (i * 0.197) % 1,
      speed: 0.38 + (i % 4) * 0.1,
      spinOffset: i * 0.85,
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
    dongThapGlowLight: pinkGlowLight,
    dongThapGlowAura: glowAuraDisc,
    dongThapAuraRings: auraRings,
    dongThapFallingPetals: fallingPetals,
    dongThapSparkles: sparkles,
    wheels: [],
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
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
      rig.dongThapBlossomGroup.rotation.y = Math.sin(state.elapsed * 0.65) * 0.16;
    }
    if (rig.dongThapGlowLight) {
      rig.dongThapGlowLight.intensity = 1.55 + Math.sin(state.elapsed * 2.8) * 0.3;
    }
    if (rig.dongThapGlowAura) {
      const auraPulse = 1 + Math.sin(state.elapsed * 2.2) * 0.08;
      rig.dongThapGlowAura.scale.set(auraPulse, auraPulse, 1);
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
        const ang = petal.angle + state.elapsed * 0.72 + Math.sin(u * Math.PI * 2) * 0.28;
        const rad = petal.radius + Math.sin(u * Math.PI * 2 + petal.spinOffset) * 0.18;
        petal.mesh.position.set(
          Math.sin(ang) * rad,
          0.34 - u * 1.52,
          Math.cos(ang) * rad,
        );
        petal.mesh.rotation.set(
          Math.sin(state.elapsed * 2.1 + petal.spinOffset) * 0.85,
          ang + state.elapsed * 1.4,
          Math.cos(state.elapsed * 2.5 + petal.spinOffset) * 0.7,
        );
        const fadeScale = Math.sin(u * Math.PI);
        petal.mesh.scale.setScalar(0.18 + fadeScale * 0.96);
      }
    }
    if (rig.dongThapSparkles) {
      for (const sp of rig.dongThapSparkles) {
        const u = (state.elapsed * sp.speed + sp.phase) % 1;
        const ang = sp.angle - state.elapsed * 0.55;
        const rad = sp.radius + Math.cos(u * Math.PI * 2) * 0.1;
        sp.mesh.position.set(
          Math.sin(ang) * rad,
          -0.38 + u * 1.15,
          Math.cos(ang) * rad,
        );
        const pulse =
          Math.sin(u * Math.PI) * (0.68 + 0.42 * Math.sin(state.elapsed * 6.2 + sp.spinOffset));
        sp.mesh.scale.setScalar(Math.max(0.06, pulse));
        sp.mesh.rotation.y = state.elapsed * 2.6 + sp.spinOffset;
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
      rig.lotusFrogGroup.position.y = 0.1 + (fHop > 0.85 ? (fHop - 0.85) * 0.18 : 0);
      rig.lotusFrogGroup.rotation.y = -0.35 + Math.sin(state.elapsed * 1.3) * 0.14;
    }
    if (rig.lotusCloudGroup) {
      rig.lotusCloudGroup.position.y = 0.68 + Math.sin(state.elapsed * 2.3) * 0.032;
      rig.lotusCloudGroup.rotation.y = Math.sin(state.elapsed * 0.9) * 0.12;
    }
    if (rig.lotusRainDrops) {
      const windTiltZ = isMoving ? 0.12 : 0.15;
      const windTiltX = isMoving ? -0.22 : -0.04;
      for (const drop of rig.lotusRainDrops) {
        const u = (state.elapsed * drop.speed + drop.phase) % 1;
        // Fade streaks smoothly in below cloud and vanish smoothly near ground
        const fade = Math.pow(Math.sin(u * Math.PI), 0.55);
        drop.mesh.position.set(
          drop.baseX - u * drop.driftX,
          0.56 - u * 1.72,
          drop.baseZ + (isMoving ? u * 0.28 : 0),
        );
        drop.mesh.rotation.set(windTiltX, 0, windTiltZ);
        drop.mesh.scale.set(
          drop.widthScale * (0.4 + fade * 0.65),
          drop.lenScale * (0.35 + fade * 0.85),
          drop.widthScale * (0.4 + fade * 0.65),
        );
      }
    }
    if (rig.lotusRainSplashes) {
      for (const sp of rig.lotusRainSplashes) {
        const u = (state.elapsed * sp.speed + sp.phase) % 1;
        const sc = 0.35 + u * sp.maxScale;
        sp.mesh.position.set(sp.baseX, sp.baseY, sp.baseZ);
        sp.mesh.scale.set(sc, sc, 1);
        sp.mat.opacity = (1 - u) * 0.55;
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
