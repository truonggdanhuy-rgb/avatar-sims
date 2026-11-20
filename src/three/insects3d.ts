import * as THREE from 'three';
import {
  INSECT_CATALOG,
  computeInsectSellPrice,
  pickRandomInsectSpecies,
  rollInsectLengthMm,
} from '../data/insectCatalog';
import {
  InsectHabitat,
  InsectShapeKind,
  InsectSpeciesDefinition,
  InsectSpeciesId,
} from '../types/game';

export interface InsectAnchor {
  x: number;
  y: number;
  z: number;
  habitat: InsectHabitat;
}

export interface InsectCatchEvaluation {
  caught: {
    speciesId: InsectSpeciesId;
    lengthMm: number;
    sellPrice: number;
    worldPos: THREE.Vector3;
  } | null;
  startledCount: number;
  escapedCount: number;
}

export interface InsectFrameEvent {
  escapedByRun: number;
  startledByRun: number;
}

interface ActiveInsect {
  id: number;
  species: InsectSpeciesDefinition;
  root: THREE.Group;
  bodyGroup: THREE.Group;
  leftWing?: THREE.Object3D;
  rightWing?: THREE.Object3D;
  alertGroup: THREE.Group;
  anchor: InsectAnchor;
  pos: THREE.Vector3;
  rotY: number;
  phase: number;
  isFlyingHover: boolean;
  state: 'active' | 'darting' | 'despawning' | 'respawning';
  startleCount: number;
  maxStartles: number;
  stateTimer: number;
  dartDuration: number;
  dartStart: THREE.Vector3;
  dartEnd: THREE.Vector3;
  alertTimer: number;
  respawnTimer: number;
  wingSpeed: number;
}

const ACTIVE_INSECT_COUNT = 38;
const _cullSphere = new THREE.Sphere();

function buildAlertBadge(
  matRed: THREE.MeshBasicMaterial,
  matWhite: THREE.MeshBasicMaterial,
): THREE.Group {
  const g = new THREE.Group();
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.14, 0.02), matRed);
  bar.position.y = 0.06;
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.026, 6, 6), matRed);
  dot.position.y = -0.045;
  const bg = new THREE.Mesh(new THREE.CircleGeometry(0.125, 10), matWhite);
  bg.position.set(0, 0.015, -0.014);
  g.add(bg, bar, dot);
  g.visible = false;
  return g;
}

function createInsectMeshForSpecies(
  spec: InsectSpeciesDefinition,
  matCache: Map<string, THREE.Material>,
  geoCache: Map<string, THREE.BufferGeometry>,
): {
  bodyGroup: THREE.Group;
  leftWing?: THREE.Object3D;
  rightWing?: THREE.Object3D;
  isFlyingHover: boolean;
  wingSpeed: number;
} {
  const getMat = (color: string, opacity = 1, emissive = false) => {
    const key = `${color}_${opacity}_${emissive ? 1 : 0}`;
    let m = matCache.get(key);
    if (!m) {
      m = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.48,
        metalness: 0.06,
        transparent: opacity < 1,
        opacity,
        side: THREE.DoubleSide,
        emissive: emissive ? color : '#000000',
        emissiveIntensity: emissive ? 0.75 : 0,
      });
      matCache.set(key, m);
    }
    return m;
  };

  const getGeo = (key: string, make: () => THREE.BufferGeometry) => {
    let g = geoCache.get(key);
    if (!g) {
      g = make();
      geoCache.set(key, g);
    }
    return g;
  };

  const bodyGroup = new THREE.Group();
  const kind: InsectShapeKind = spec.shapeKind;
  const primaryMat = getMat(spec.primaryColor);
  const accentMat = getMat(spec.accentColor, 1, kind === 'firefly');
  const wingMat = getMat(
    spec.wingColor,
    kind === 'dragonfly' || kind === 'bee' || kind === 'cicada' ? 0.74 : 0.96,
  );

  if (kind === 'butterfly' || kind === 'moth') {
    const thoraxGeo = getGeo('bf_body', () => new THREE.CapsuleGeometry(0.018, 0.095, 4, 6));
    const bodyMesh = new THREE.Mesh(thoraxGeo, primaryMat);
    bodyMesh.rotation.x = Math.PI / 2;
    bodyGroup.add(bodyMesh);

    const wingGeo = getGeo('bf_wing', () => {
      const s = new THREE.Shape();
      s.moveTo(0, 0.035);
      s.quadraticCurveTo(0.13, 0.125, 0.145, 0.035);
      s.quadraticCurveTo(0.11, -0.02, 0.075, -0.045);
      s.quadraticCurveTo(0.11, -0.105, 0.045, -0.125);
      s.quadraticCurveTo(0.005, -0.085, 0, -0.035);
      s.closePath();
      const geo = new THREE.ShapeGeometry(s, 6);
      geo.rotateX(-Math.PI / 2);
      return geo;
    });
    const dotGeo = getGeo('bf_dot', () => new THREE.CircleGeometry(0.022, 6));

    const leftWing = new THREE.Group();
    const lwMesh = new THREE.Mesh(wingGeo, wingMat);
    lwMesh.scale.x = -1;
    const lDot = new THREE.Mesh(dotGeo, accentMat);
    lDot.rotation.x = -Math.PI / 2;
    lDot.position.set(-0.085, 0.004, 0.035);
    leftWing.add(lwMesh, lDot);

    const rightWing = new THREE.Group();
    const rwMesh = new THREE.Mesh(wingGeo, wingMat);
    const rDot = new THREE.Mesh(dotGeo, accentMat);
    rDot.rotation.x = -Math.PI / 2;
    rDot.position.set(0.085, 0.004, 0.035);
    rightWing.add(rwMesh, rDot);

    bodyGroup.add(leftWing, rightWing);
    const scale = spec.rarity === 'rare' ? 1.15 : 0.96;
    bodyGroup.scale.setScalar(scale);
    return {bodyGroup, leftWing, rightWing, isFlyingHover: true, wingSpeed: 12.5};
  }

  if (kind === 'dragonfly') {
    const tailGeo = getGeo('df_tail', () => new THREE.CylinderGeometry(0.011, 0.007, 0.19, 6));
    const tail = new THREE.Mesh(tailGeo, primaryMat);
    tail.rotation.x = Math.PI / 2;
    tail.position.z = -0.065;
    const headGeo = getGeo('df_head', () => new THREE.SphereGeometry(0.024, 6, 6));
    const head = new THREE.Mesh(headGeo, accentMat);
    head.position.z = 0.045;
    bodyGroup.add(tail, head);

    const wGeo = getGeo('df_wing', () => {
      const g = new THREE.BoxGeometry(0.145, 0.004, 0.036);
      g.translate(0.072, 0, 0);
      return g;
    });
    const leftWing = new THREE.Group();
    const lw1 = new THREE.Mesh(wGeo, wingMat);
    lw1.scale.x = -1;
    lw1.position.set(0, 0.014, 0.02);
    const lw2 = new THREE.Mesh(wGeo, wingMat);
    lw2.scale.set(-0.9, 1, 0.85);
    lw2.position.set(0, 0.01, -0.012);
    leftWing.add(lw1, lw2);

    const rightWing = new THREE.Group();
    const rw1 = new THREE.Mesh(wGeo, wingMat);
    rw1.position.set(0, 0.014, 0.02);
    const rw2 = new THREE.Mesh(wGeo, wingMat);
    rw2.scale.set(0.9, 1, 0.85);
    rw2.position.set(0, 0.01, -0.012);
    rightWing.add(rw1, rw2);

    bodyGroup.add(leftWing, rightWing);
    return {bodyGroup, leftWing, rightWing, isFlyingHover: true, wingSpeed: 22};
  }

  if (kind === 'bee') {
    const bodyGeo = getGeo('bee_body', () => new THREE.SphereGeometry(0.048, 8, 7));
    const body = new THREE.Mesh(bodyGeo, primaryMat);
    body.scale.set(0.82, 0.8, 1.28);
    const stripeGeo = getGeo('bee_stripe', () => new THREE.TorusGeometry(0.04, 0.009, 5, 10));
    const stripe = new THREE.Mesh(stripeGeo, accentMat);
    stripe.position.z = -0.006;
    const headGeo = getGeo('bee_head', () => new THREE.SphereGeometry(0.028, 6, 6));
    const head = new THREE.Mesh(headGeo, accentMat);
    head.position.z = 0.056;
    bodyGroup.add(body, stripe, head);

    const wGeo = getGeo('bee_wing', () => {
      const g = new THREE.CircleGeometry(0.045, 7);
      g.scale(1.3, 0.72, 1);
      g.rotateX(-Math.PI / 2);
      g.translate(0.048, 0, 0);
      return g;
    });
    const leftWing = new THREE.Mesh(wGeo, wingMat);
    leftWing.scale.x = -1;
    leftWing.position.set(-0.01, 0.036, 0.015);
    const rightWing = new THREE.Mesh(wGeo, wingMat);
    rightWing.position.set(0.01, 0.036, 0.015);
    bodyGroup.add(leftWing, rightWing);
    return {bodyGroup, leftWing, rightWing, isFlyingHover: true, wingSpeed: 28};
  }

  if (kind === 'firefly') {
    const bodyGeo = getGeo('ff_body', () => new THREE.CapsuleGeometry(0.024, 0.055, 4, 6));
    const body = new THREE.Mesh(bodyGeo, primaryMat);
    body.rotation.x = Math.PI / 2;
    const glowGeo = getGeo('ff_glow', () => new THREE.SphereGeometry(0.028, 6, 6));
    const glow = new THREE.Mesh(glowGeo, accentMat);
    glow.position.z = -0.042;
    const wGeo = getGeo('ff_wing', () => {
      const g = new THREE.BoxGeometry(0.055, 0.004, 0.022);
      g.translate(0.028, 0, 0);
      return g;
    });
    const leftWing = new THREE.Mesh(wGeo, wingMat);
    leftWing.scale.x = -1;
    leftWing.position.set(0, 0.022, 0.01);
    const rightWing = new THREE.Mesh(wGeo, wingMat);
    rightWing.position.set(0, 0.022, 0.01);
    bodyGroup.add(body, glow, leftWing, rightWing);
    return {bodyGroup, leftWing, rightWing, isFlyingHover: true, wingSpeed: 18};
  }

  if (kind === 'horned_beetle') {
    const shellGeo = getGeo('hb_shell', () => new THREE.SphereGeometry(0.068, 8, 7));
    const shell = new THREE.Mesh(shellGeo, primaryMat);
    shell.scale.set(0.88, 0.68, 1.32);
    shell.position.y = 0.032;
    const headGeo = getGeo('hb_head', () => new THREE.SphereGeometry(0.04, 7, 6));
    const head = new THREE.Mesh(headGeo, accentMat);
    head.position.set(0, 0.032, 0.088);
    bodyGroup.add(shell, head);

    if (spec.id === 'bo_kep_kim') {
      const pGeo = getGeo('hb_pincer', () => new THREE.ConeGeometry(0.012, 0.078, 5));
      [-1, 1].forEach((s) => {
        const p = new THREE.Mesh(pGeo, accentMat);
        p.rotation.x = Math.PI / 2;
        p.rotation.z = s * 0.28;
        p.position.set(s * 0.026, 0.038, 0.14);
        bodyGroup.add(p);
      });
    } else {
      const hGeo = getGeo('hb_horn', () => new THREE.ConeGeometry(0.015, 0.085, 5));
      const horn = new THREE.Mesh(hGeo, accentMat);
      horn.rotation.x = 0.85;
      horn.position.set(0, 0.068, 0.135);
      bodyGroup.add(horn);
    }
    return {bodyGroup, isFlyingHover: false, wingSpeed: 0};
  }

  if (kind === 'mantis' || kind === 'grasshopper') {
    const abGeo = getGeo('mg_ab', () => new THREE.CapsuleGeometry(0.024, 0.095, 4, 6));
    const ab = new THREE.Mesh(abGeo, primaryMat);
    ab.rotation.x = Math.PI / 2 - 0.15;
    ab.position.set(0, 0.038, -0.02);
    const headGeo = getGeo('mg_head', () => new THREE.SphereGeometry(0.026, 6, 6));
    const head = new THREE.Mesh(headGeo, accentMat);
    head.position.set(0, kind === 'mantis' ? 0.092 : 0.048, 0.062);
    bodyGroup.add(ab, head);
    if (kind === 'mantis') {
      const armGeo = getGeo('mg_arm', () => new THREE.BoxGeometry(0.014, 0.065, 0.014));
      [-1, 1].forEach((s) => {
        const arm = new THREE.Mesh(armGeo, accentMat);
        arm.position.set(s * 0.026, 0.065, 0.072);
        arm.rotation.x = -0.6;
        bodyGroup.add(arm);
      });
    }
    return {bodyGroup, isFlyingHover: false, wingSpeed: 0};
  }

  // Ladybug, beetle, stinkbug, cicada
  const shellGeo = getGeo('bt_shell', () => new THREE.SphereGeometry(0.058, 8, 7));
  const shell = new THREE.Mesh(shellGeo, primaryMat);
  shell.scale.set(0.95, 0.68, kind === 'cicada' ? 1.48 : 1.15);
  shell.position.y = 0.026;
  const headGeo = getGeo('bt_head', () => new THREE.SphereGeometry(0.028, 6, 6));
  const head = new THREE.Mesh(headGeo, accentMat);
  head.position.set(0, 0.026, kind === 'cicada' ? 0.088 : 0.065);
  bodyGroup.add(shell, head);

  if (kind === 'ladybug') {
    const dotGeo = getGeo('lb_dot', () => new THREE.SphereGeometry(0.012, 5, 5));
    [
      [-0.024, 0.058, 0.018],
      [0.024, 0.058, 0.018],
      [-0.026, 0.052, -0.022],
      [0.026, 0.052, -0.022],
    ].forEach(([dx, dy, dz]) => {
      const d = new THREE.Mesh(dotGeo, accentMat);
      d.position.set(dx, dy, dz);
      bodyGroup.add(d);
    });
  } else if (kind === 'cicada') {
    const cwGeo = getGeo('cic_wing', () => new THREE.BoxGeometry(0.044, 0.005, 0.135));
    [-1, 1].forEach((s) => {
      const w = new THREE.Mesh(cwGeo, wingMat);
      w.position.set(s * 0.028, 0.052, -0.01);
      w.rotation.y = s * 0.18;
      bodyGroup.add(w);
    });
  }

  return {bodyGroup, isFlyingHover: false, wingSpeed: 0};
}

export class TownInsectManager {
  private readonly parent: THREE.Group;
  private readonly anchors: InsectAnchor[];
  private readonly insects: ActiveInsect[] = [];
  private readonly matCache = new Map<string, THREE.Material>();
  private readonly geoCache = new Map<string, THREE.BufferGeometry>();
  private readonly alertRedMat = new THREE.MeshBasicMaterial({color: '#EE3E3E', side: THREE.DoubleSide});
  private readonly alertWhiteMat = new THREE.MeshBasicMaterial({color: '#FFFDF7', side: THREE.DoubleSide});
  private nextId = 1;

  constructor(parent: THREE.Group, anchors: InsectAnchor[]) {
    this.parent = parent;
    this.anchors = anchors.length > 0 ? anchors : [{x: 12, y: 0.4, z: 12, habitat: 'flower'}];

    const innerAnchors = this.anchors.filter((a) => Math.hypot(a.x, a.z) < 28);
    const outerAnchors = this.anchors.filter((a) => Math.hypot(a.x, a.z) >= 28);

    const chosenAnchors: InsectAnchor[] = [];
    const targetCount = Math.min(ACTIVE_INSECT_COUNT, Math.max(12, this.anchors.length));
    const outerGoal = Math.min(outerAnchors.length, Math.ceil(targetCount * 0.52));

    for (let i = 0; i < outerGoal; i++) {
      const idx = Math.floor((i * outerAnchors.length) / outerGoal);
      chosenAnchors.push(outerAnchors[idx]);
    }

    const innerGoal = targetCount - chosenAnchors.length;
    const innerPool = innerAnchors.length > 0 ? innerAnchors : this.anchors;
    for (let i = 0; i < innerGoal; i++) {
      const idx = Math.floor((i * innerPool.length) / Math.max(1, innerGoal));
      chosenAnchors.push(innerPool[idx]);
    }

    chosenAnchors.forEach((anchor) => {
      const species = pickRandomInsectSpecies(anchor.habitat);
      const inst = this.spawnAtAnchor(species, anchor);
      this.insects.push(inst);
    });
  }

  private pickAnchorForHabitat(habitat: InsectHabitat, avoid?: InsectAnchor): InsectAnchor {
    const same = this.anchors.filter((a) => a.habitat === habitat && a !== avoid);
    if (same.length > 0) return same[Math.floor(Math.random() * same.length)];
    const other = this.anchors.filter((a) => a !== avoid);
    if (other.length > 0) return other[Math.floor(Math.random() * other.length)];
    return this.anchors[0];
  }

  private pickDartAnchor(from: THREE.Vector3, habitat: InsectHabitat): InsectAnchor {
    const candidates = this.anchors.filter((a) => {
      const d = Math.hypot(a.x - from.x, a.z - from.z);
      return d >= 4.2 && d <= 10.5;
    });
    if (candidates.length > 0) {
      const pref = candidates.filter((a) => a.habitat === habitat);
      const pool = pref.length > 0 ? pref : candidates;
      return pool[Math.floor(Math.random() * pool.length)];
    }
    return this.pickAnchorForHabitat(habitat);
  }

  private spawnAtAnchor(species: InsectSpeciesDefinition, anchor: InsectAnchor): ActiveInsect {
    const built = createInsectMeshForSpecies(species, this.matCache, this.geoCache);
    const root = new THREE.Group();
    const alertGroup = buildAlertBadge(this.alertRedMat, this.alertWhiteMat);
    alertGroup.position.set(0, 0.36, 0);
    root.add(built.bodyGroup, alertGroup);

    const isFly = built.isFlyingHover;
    const baseY = anchor.y + (isFly ? 0.36 + Math.random() * 0.28 : 0.04);
    const pos = new THREE.Vector3(anchor.x, baseY, anchor.z);
    root.position.copy(pos);
    const rotY = Math.random() * Math.PI * 2;
    root.rotation.y = rotY;
    this.parent.add(root);

    return {
      id: this.nextId++,
      species,
      root,
      bodyGroup: built.bodyGroup,
      leftWing: built.leftWing,
      rightWing: built.rightWing,
      alertGroup,
      anchor,
      pos,
      rotY,
      phase: Math.random() * Math.PI * 2,
      isFlyingHover: isFly,
      state: 'active',
      startleCount: 0,
      maxStartles: Math.random() < 0.5 ? 2 : 3,
      stateTimer: 0,
      dartDuration: 0.72,
      dartStart: pos.clone(),
      dartEnd: pos.clone(),
      alertTimer: 0,
      respawnTimer: 0,
      wingSpeed: built.wingSpeed,
    };
  }

  private rebuildInsectVisual(inst: ActiveInsect, newSpecies: InsectSpeciesDefinition, newAnchor: InsectAnchor) {
    this.parent.remove(inst.root);
    const next = this.spawnAtAnchor(newSpecies, newAnchor);
    inst.species = next.species;
    inst.root = next.root;
    inst.bodyGroup = next.bodyGroup;
    inst.leftWing = next.leftWing;
    inst.rightWing = next.rightWing;
    inst.alertGroup = next.alertGroup;
    inst.anchor = newAnchor;
    inst.pos.copy(next.pos);
    inst.rotY = next.rotY;
    inst.isFlyingHover = next.isFlyingHover;
    inst.wingSpeed = next.wingSpeed;
    inst.state = 'active';
    inst.startleCount = 0;
    inst.maxStartles = Math.random() < 0.5 ? 2 : 3;
    inst.stateTimer = 0;
    inst.alertTimer = 0;
    inst.respawnTimer = 0;
  }

  private startleInsect(inst: ActiveInsect): 'darted' | 'escaped' {
    inst.startleCount += 1;
    inst.alertTimer = 0.75;
    inst.alertGroup.visible = true;

    if (inst.startleCount >= inst.maxStartles) {
      inst.state = 'despawning';
      inst.stateTimer = 0;
      return 'escaped';
    }

    const nextAnchor = this.pickDartAnchor(inst.pos, inst.species.habitat);
    inst.anchor = nextAnchor;
    inst.dartStart.copy(inst.pos);
    const destY = nextAnchor.y + (inst.isFlyingHover ? 0.36 + Math.random() * 0.28 : 0.05);
    inst.dartEnd.set(nextAnchor.x, destY, nextAnchor.z);
    inst.rotY = Math.atan2(inst.dartEnd.x - inst.dartStart.x, inst.dartEnd.z - inst.dartStart.z);
    inst.state = 'darting';
    inst.stateTimer = 0;
    inst.dartDuration = 0.65 + Math.random() * 0.25;
    return 'darted';
  }

  update(
    elapsed: number,
    dt: number,
    playerX: number,
    playerY: number,
    playerZ: number,
    playerSpeed: number,
    isCreeping: boolean,
    frustum?: THREE.Frustum,
  ): InsectFrameEvent {
    let escapedByRun = 0;
    let startledByRun = 0;

    for (let i = 0; i < this.insects.length; i++) {
      const inst = this.insects[i];

      if (inst.state === 'respawning') {
        inst.respawnTimer -= dt;
        if (inst.respawnTimer <= 0) {
          const nextAnchor = this.pickAnchorForHabitat(inst.anchor.habitat, inst.anchor);
          const nextSpecies = pickRandomInsectSpecies(nextAnchor.habitat);
          this.rebuildInsectVisual(inst, nextSpecies, nextAnchor);
        }
        continue;
      }

      if (inst.alertTimer > 0) {
        inst.alertTimer -= dt;
        if (inst.alertTimer <= 0) {
          inst.alertGroup.visible = false;
        }
      }

      if (inst.state === 'despawning') {
        inst.stateTimer += dt;
        const u = Math.min(1, inst.stateTimer / 0.75);
        inst.pos.y += dt * 3.1;
        inst.pos.x += Math.sin(elapsed * 9 + inst.phase) * dt * 0.85;
        inst.root.position.copy(inst.pos);
        inst.root.scale.setScalar(Math.max(0.01, 1 - u * 0.85));
        if (inst.leftWing && inst.rightWing) {
          const flap = Math.sin(elapsed * 26 + inst.phase) * 0.9;
          inst.leftWing.rotation.z = -flap;
          inst.rightWing.rotation.z = flap;
        }
        if (u >= 1) {
          inst.root.visible = false;
          inst.state = 'respawning';
          inst.respawnTimer = 4.5 + Math.random() * 3.5;
        }
        continue;
      }

      if (inst.state === 'darting') {
        inst.stateTimer += dt;
        const u = Math.min(1, inst.stateTimer / inst.dartDuration);
        const ease = 1 - Math.pow(1 - u, 2);
        inst.pos.lerpVectors(inst.dartStart, inst.dartEnd, ease);
        inst.pos.y += Math.sin(u * Math.PI) * 1.15;
        inst.root.position.copy(inst.pos);
        inst.root.rotation.y = inst.rotY;
        if (inst.leftWing && inst.rightWing) {
          const flap = Math.sin(elapsed * 24 + inst.phase) * 0.85;
          inst.leftWing.rotation.z = -flap;
          inst.rightWing.rotation.z = flap;
        }
        if (u >= 1) {
          inst.state = 'active';
          inst.stateTimer = 0;
        }
        continue;
      }

      // Active insect: check if startled by fast walking / jumping / running close by
      const dx = inst.pos.x - playerX;
      const dz = inst.pos.z - playerZ;
      const distXZ = Math.hypot(dx, dz);
      const dy = Math.abs(inst.pos.y - (playerY + 0.6));

      if (!isCreeping && playerSpeed > 0.65 && distXZ < 3.4 && dy < 2.1) {
        const res = this.startleInsect(inst);
        if (res === 'escaped') escapedByRun++;
        else startledByRun++;
        continue;
      }

      // Frustum cull animation updates when far offscreen
      if (frustum) {
        _cullSphere.set(inst.pos, 0.6);
        const visible = frustum.intersectsSphere(_cullSphere);
        inst.root.visible = visible;
        if (!visible) continue;
      }

      if (inst.isFlyingHover) {
        const t = elapsed * 1.4 + inst.phase;
        const ox = Math.sin(t) * 0.34;
        const oz = Math.cos(t * 0.85) * 0.34;
        const oy = Math.sin(t * 2.1) * 0.09;
        inst.root.position.set(inst.pos.x + ox, inst.pos.y + oy, inst.pos.z + oz);
        inst.root.rotation.y = Math.atan2(Math.cos(t) * 0.34, -Math.sin(t * 0.85) * 0.28);
        if (inst.leftWing && inst.rightWing) {
          const flap = Math.sin(elapsed * inst.wingSpeed + inst.phase) * 0.72;
          inst.leftWing.rotation.z = -flap;
          inst.rightWing.rotation.z = flap;
        }
      } else {
        const micro = Math.sin(elapsed * 2.2 + inst.phase) * 0.04;
        inst.root.position.set(inst.pos.x + micro, inst.pos.y, inst.pos.z);
        inst.root.rotation.y = inst.rotY + Math.sin(elapsed * 0.9 + inst.phase) * 0.25;
      }
    }

    return {escapedByRun, startledByRun};
  }

  tryCatch(
    playerX: number,
    playerY: number,
    playerZ: number,
    playerRotY: number,
  ): InsectCatchEvaluation {
    const fwdX = Math.sin(playerRotY);
    const fwdZ = Math.cos(playerRotY);
    const netHitX = playerX + fwdX * 0.92;
    const netHitZ = playerZ + fwdZ * 0.92;

    let bestIdx = -1;
    let bestScore = Infinity;

    for (let i = 0; i < this.insects.length; i++) {
      const inst = this.insects[i];
      if (inst.state !== 'active') continue;
      const curPos = inst.root.position;
      const dx = curPos.x - playerX;
      const dz = curPos.z - playerZ;
      const distXZ = Math.hypot(dx, dz);
      const dy = Math.abs(curPos.y - (playerY + 0.65));

      if (distXZ > 1.85 || dy > 1.45) continue;

      if (distXZ > 0.14) {
        const dot = (dx * fwdX + dz * fwdZ) / distXZ;
        if (dot < 0.87) continue; // Strict straight-ahead cone (~±29 deg); standing sideways misses
      }

      const distToNetHead = Math.hypot(curPos.x - netHitX, curPos.z - netHitZ);
      if (distToNetHead > 0.98) continue;

      if (distToNetHead < bestScore) {
        bestScore = distToNetHead;
        bestIdx = i;
      }
    }

    if (bestIdx >= 0) {
      const target = this.insects[bestIdx];
      const lengthMm = rollInsectLengthMm(target.species);
      const sellPrice = computeInsectSellPrice(target.species.id, lengthMm);
      const worldPos = target.root.position.clone();

      target.root.visible = false;
      target.alertGroup.visible = false;
      target.state = 'respawning';
      target.respawnTimer = 4.0 + Math.random() * 3.0;

      return {
        caught: {
          speciesId: target.species.id,
          lengthMm,
          sellPrice,
          worldPos,
        },
        startledCount: 0,
        escapedCount: 0,
      };
    }

    // Missed swing startles any active bugs within 3.8m
    let startledCount = 0;
    let escapedCount = 0;
    for (let i = 0; i < this.insects.length; i++) {
      const inst = this.insects[i];
      if (inst.state !== 'active') continue;
      const distXZ = Math.hypot(inst.root.position.x - playerX, inst.root.position.z - playerZ);
      const dy = Math.abs(inst.root.position.y - (playerY + 0.65));
      if (distXZ < 3.85 && dy < 2.2) {
        const res = this.startleInsect(inst);
        if (res === 'escaped') escapedCount++;
        else startledCount++;
      }
    }

    return {caught: null, startledCount, escapedCount};
  }

  getRemainingActiveCount(): number {
    return this.insects.filter((i) => i.state === 'active' || i.state === 'darting').length;
  }

  dispose(): void {
    this.matCache.forEach((m) => m.dispose());
    this.geoCache.forEach((g) => g.dispose());
    this.alertRedMat.dispose();
    this.alertWhiteMat.dispose();
    this.matCache.clear();
    this.geoCache.clear();
  }
}

export function getInsectName(speciesId: InsectSpeciesId): string {
  return INSECT_CATALOG[speciesId]?.name ?? speciesId;
}
