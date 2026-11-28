import React, {useCallback, useEffect, useRef, useState} from 'react';
import * as THREE from 'three';
import {
  CloudRain,
  Compass,
  Flag,
  Heart,
  RotateCcw,
  Sparkles,
  Timer,
  Trophy,
  X,
  Zap,
} from 'lucide-react';
import {DEFAULT_AVATAR} from '../../data/avatarCatalog';
import {buildAvatarRig, updateAvatarRigAnimation} from '../../three/avatar3d';
import {AvatarConfig} from '../../types/game';
import {soundFX} from '../../utils/sound';
import {
  createCheckeredFinishTexture,
  createConveyorTexture,
  createHazardStripeTexture,
  createSkyDomeMesh,
  createStoneTileTexture,
  createStudioRenderer,
  disposeSceneObject,
  ParticleBurstPool,
  playArcadeSfx,
} from './arcade3dUtils';

interface ObstacleRush3DGameProps {
  avatar?: AvatarConfig;
  coinGame?: number;
  onEarnCoinGame: (amount: number) => void;
  onClose?: () => void;
}

type TrackDeckKind = 'normal' | 'fragile' | 'conveyor_fwd' | 'conveyor_rev' | 'ramp';

interface DeckDef {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  kind: TrackDeckKind;
  slopeRise?: number;
  mesh: THREE.Mesh;
  mat: THREE.MeshStandardMaterial;
  baseColor: string;
  fragileState: 'idle' | 'cracking' | 'broken';
  fragileTimer: number;
  solidNow: boolean;
}

interface TurntableDef {
  cx: number;
  y: number;
  cz: number;
  r: number;
  omega: number;
  mesh: THREE.Mesh;
}

interface SweeperArmDef {
  cx: number;
  y: number;
  cz: number;
  len: number;
  speed: number;
  phase: number;
  cross: boolean;
  pivot: THREE.Group;
}

interface PendulumHammerDef {
  cx: number;
  pivotY: number;
  cz: number;
  armLen: number;
  maxSwing: number;
  speed: number;
  phase: number;
  pivot: THREE.Group;
  headX: number;
  headY: number;
}

interface RollingBoulderDef {
  laneX: number;
  zStart: number;
  zEnd: number;
  yBase: number;
  ySlope: number;
  speed: number;
  r: number;
  zCur: number;
  mesh: THREE.Mesh;
}

interface SawbladeDef {
  cx: number;
  y: number;
  cz: number;
  ampX: number;
  speed: number;
  phase: number;
  r: number;
  curX: number;
  mesh: THREE.Group;
}

interface PopSpikeDef {
  x: number;
  y: number;
  z: number;
  hw: number;
  hd: number;
  cycleOffset: number;
  spikesGroup: THREE.Group;
  baseMat: THREE.MeshStandardMaterial;
  activeNow: boolean;
}

interface BumperPistonDef {
  side: -1 | 1;
  baseX: number;
  y: number;
  z: number;
  reach: number;
  speed: number;
  phase: number;
  curX: number;
  mesh: THREE.Mesh;
}

interface AcidCloudDef {
  x: number;
  y: number;
  z: number;
  hw: number;
  hd: number;
  drops: THREE.InstancedMesh;
  dropOffsets: Float32Array;
}

interface BoostPadDef {
  x: number;
  y: number;
  z: number;
  hw: number;
  hd: number;
  isSpring?: boolean;
  mesh: THREE.Group;
}

interface CheckpointArchDef {
  index: number;
  label: string;
  x: number;
  y: number;
  z: number;
  flagMesh: THREE.Mesh;
  archMat: THREE.MeshStandardMaterial;
}

interface RushHud {
  hearts: number;
  maxHearts: number;
  meters: number;
  totalMeters: number;
  checkpointIdx: number;
  totalCheckpoints: number;
  sectorName: string;
  elapsedSec: number;
  bannerText: string;
  acidSlow: boolean;
  boosted: boolean;
  dashReady: boolean;
  status: 'ready' | 'playing' | 'won' | 'lost';
  rewardEarned: number;
}

const TOTAL_Z_SPAN = 380;
const TOTAL_METERS = 1000;
const MAX_HEARTS = 8;

function getSectorName(meters: number): string {
  if (meters < 165) return '1. Rào & Quạt Xoay';
  if (meters < 325) return '2. Kính Nứt & Đường Tắt';
  if (meters < 505) return '3. Đá Lăn & Búa Tạ';
  if (meters < 685) return '4. Mưa Axit & Lưỡi Cưa';
  if (meters < 855) return '5. Băng Chuyền & Đĩa Xoay';
  return '6. Nước Rút Về Đích';
}

export const ObstacleRush3DGame: React.FC<ObstacleRush3DGameProps> = ({
  avatar,
  coinGame = 0,
  onEarnCoinGame,
  onClose,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const avatarCfg = avatar ?? DEFAULT_AVATAR;

  const [hud, setHud] = useState<RushHud>({
    hearts: MAX_HEARTS,
    maxHearts: MAX_HEARTS,
    meters: 0,
    totalMeters: TOTAL_METERS,
    checkpointIdx: 0,
    totalCheckpoints: 4,
    sectorName: '1. Rào & Quạt Xoay',
    elapsedSec: 0,
    bannerText: '',
    acidSlow: false,
    boosted: false,
    dashReady: true,
    status: 'ready',
    rewardEarned: 0,
  });

  const keysRef = useRef<Record<string, boolean>>({});
  const joyVecRef = useRef<{x: number; y: number}>({x: 0, y: 0});
  const jumpQueuedRef = useRef(false);
  const dashQueuedRef = useRef(false);
  const camResetQueuedRef = useRef(false);
  const gameStatusRef = useRef<'ready' | 'playing' | 'won' | 'lost'>('ready');
  const restartActionRef = useRef<(() => void) | null>(null);

  const [joyKnob, setJoyKnob] = useState<{x: number; y: number}>({x: 0, y: 0});
  const joyBaseRef = useRef<HTMLDivElement | null>(null);
  const joyPointerIdRef = useRef<number | null>(null);

  const onEarnRef = useRef(onEarnCoinGame);
  onEarnRef.current = onEarnCoinGame;

  const triggerJump = useCallback(() => {
    if (gameStatusRef.current === 'ready') {
      gameStatusRef.current = 'playing';
      setHud((h) => ({...h, status: 'playing'}));
    }
    jumpQueuedRef.current = true;
  }, []);

  const triggerDash = useCallback(() => {
    if (gameStatusRef.current === 'ready') {
      gameStatusRef.current = 'playing';
      setHud((h) => ({...h, status: 'playing'}));
    }
    dashQueuedRef.current = true;
  }, []);

  const handleRestart = useCallback(() => {
    restartActionRef.current?.();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      if (
        code === 'Space' ||
        code === 'ArrowUp' ||
        code === 'ArrowDown' ||
        code === 'ArrowLeft' ||
        code === 'ArrowRight'
      ) {
        e.preventDefault();
      }
      keysRef.current[code] = true;
      if (
        gameStatusRef.current === 'ready' &&
        [
          'KeyW',
          'KeyA',
          'KeyS',
          'KeyD',
          'ArrowUp',
          'ArrowDown',
          'ArrowLeft',
          'ArrowRight',
          'Space',
          'ShiftLeft',
          'ShiftRight',
          'KeyE',
        ].includes(code)
      ) {
        gameStatusRef.current = 'playing';
        setHud((h) => ({...h, status: 'playing'}));
      }
      if (code === 'Space' && !e.repeat) {
        jumpQueuedRef.current = true;
      }
      if ((code === 'ShiftLeft' || code === 'ShiftRight' || code === 'KeyE') && !e.repeat) {
        dashQueuedRef.current = true;
      }
      if (code === 'KeyR' && !e.repeat) {
        camResetQueuedRef.current = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const {renderer, scene, envTex, isSoftwareGl} = createStudioRenderer(container);
    scene.fog = new THREE.Fog('#FDE68A', 52, 175);

    const skyDome = createSkyDomeMesh('#1D4ED8', '#60A5FA', '#FED7AA', 245);
    scene.add(skyDome);

    const camera = new THREE.PerspectiveCamera(
      56,
      (container.clientWidth || 800) / (container.clientHeight || 500),
      0.2,
      295,
    );

    const hemi = new THREE.HemisphereLight('#FFFBEB', '#475569', 0.9);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight('#FFF3D6', 1.48);
    sun.position.set(20, 38, 22);
    if (!isSoftwareGl) {
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
      sun.shadow.camera.near = 2;
      sun.shadow.camera.far = 110;
      const d = 28;
      sun.shadow.camera.left = -d;
      sun.shadow.camera.right = d;
      sun.shadow.camera.top = d;
      sun.shadow.camera.bottom = -d;
      sun.shadow.bias = -0.0005;
    }
    scene.add(sun);
    scene.add(sun.target);

    const rim = new THREE.DirectionalLight('#FCA5A5', 0.56);
    rim.position.set(-18, 14, -22);
    scene.add(rim);

    const stoneTex = createStoneTileTexture('#94A3B8', '#CBD5E1');
    const hazardTex = createHazardStripeTexture('#F59E0B', '#0F172A');
    const convFwdTex = createConveyorTexture(true);
    const convRevTex = createConveyorTexture(false);
    const finishTex = createCheckeredFinishTexture();

    const worldGroup = new THREE.Group();
    scene.add(worldGroup);

    const decks: DeckDef[] = [];
    const turntables: TurntableDef[] = [];
    const sweepers: SweeperArmDef[] = [];
    const hammers: PendulumHammerDef[] = [];
    const boulders: RollingBoulderDef[] = [];
    const sawblades: SawbladeDef[] = [];
    const popSpikes: PopSpikeDef[] = [];
    const pistons: BumperPistonDef[] = [];
    const acidClouds: AcidCloudDef[] = [];
    const boostPads: BoostPadDef[] = [];
    const checkpoints: CheckpointArchDef[] = [];

    const addDeck = (
      x: number,
      y: number,
      z: number,
      w: number,
      h: number,
      d: number,
      kind: TrackDeckKind,
      color: string,
      opts?: {tex?: THREE.Texture; rimColor?: string; slopeRise?: number},
    ) => {
      const mat = new THREE.MeshStandardMaterial({
        color,
        map: opts?.tex ?? null,
        roughness: kind === 'fragile' ? 0.25 : 0.56,
        metalness: kind === 'fragile' ? 0.15 : 0.05,
        transparent: kind === 'fragile',
        opacity: kind === 'fragile' ? 0.9 : 1,
      });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      const slopeRise = opts?.slopeRise ?? 0;
      mesh.position.set(x, y + slopeRise * 0.5 - h / 2, z);
      if (slopeRise !== 0) {
        mesh.rotation.x = Math.atan2(slopeRise, d);
      }
      mesh.receiveShadow = !isSoftwareGl;
      mesh.castShadow = !isSoftwareGl;

      if (opts?.rimColor) {
        const railL = new THREE.Mesh(
          new THREE.BoxGeometry(0.2, 0.26, d),
          new THREE.MeshStandardMaterial({color: opts.rimColor, roughness: 0.4}),
        );
        railL.position.set(-w / 2 + 0.1, h / 2 + 0.11, 0);
        const railR = railL.clone();
        railR.position.x = w / 2 - 0.1;
        mesh.add(railL, railR);
      }

      worldGroup.add(mesh);
      decks.push({
        x,
        y,
        z,
        w,
        h,
        d,
        kind,
        slopeRise,
        mesh,
        mat,
        baseColor: color,
        fragileState: 'idle',
        fragileTimer: 0,
        solidNow: true,
      });
    };

    const addSweeper = (
      cx: number,
      y: number,
      cz: number,
      len: number,
      speed: number,
      phase = 0,
      cross = false,
    ) => {
      const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.6, 0.72, 12),
        new THREE.MeshStandardMaterial({color: '#1E293B', roughness: 0.4}),
      );
      hub.position.set(cx, y + 0.36, cz);
      worldGroup.add(hub);

      const pivot = new THREE.Group();
      pivot.position.set(cx, y + 0.46, cz);
      const barMat = new THREE.MeshStandardMaterial({
        color: '#FB7185',
        emissive: '#E11D48',
        emissiveIntensity: 0.28,
        roughness: 0.35,
      });
      const tipMat = new THREE.MeshStandardMaterial({color: '#FACC15', roughness: 0.35});

      const makeArm = (rotY: number) => {
        const arm = new THREE.Group();
        arm.rotation.y = rotY;
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, len * 2, 10), barMat);
        bar.rotation.z = Math.PI / 2;
        const t1 = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), tipMat);
        t1.position.x = -len;
        const t2 = t1.clone();
        t2.position.x = len;
        arm.add(bar, t1, t2);
        return arm;
      };
      pivot.add(makeArm(0));
      if (cross) pivot.add(makeArm(Math.PI / 2));
      worldGroup.add(pivot);

      sweepers.push({cx, y: y + 0.46, cz, len, speed, phase, cross, pivot});
    };

    const addTurntable = (cx: number, y: number, cz: number, r: number, omega: number) => {
      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(r, r * 0.96, 0.7, 28),
        new THREE.MeshStandardMaterial({
          color: '#38BDF8',
          map: hazardTex,
          roughness: 0.42,
        }),
      );
      mesh.position.set(cx, y - 0.35, cz);
      mesh.receiveShadow = !isSoftwareGl;
      worldGroup.add(mesh);
      turntables.push({cx, y, cz, r, omega, mesh});
    };

    const addHammer = (
      cx: number,
      deckY: number,
      cz: number,
      armLen: number,
      maxSwing: number,
      speed: number,
      phase = 0,
    ) => {
      const pivotY = deckY + armLen + 0.75;
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.42, 0.85),
        new THREE.MeshStandardMaterial({color: '#334155', roughness: 0.45}),
      );
      frame.position.set(cx, pivotY, cz);
      worldGroup.add(frame);

      const pivot = new THREE.Group();
      pivot.position.set(cx, pivotY, cz);
      const rod = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, armLen, 8),
        new THREE.MeshStandardMaterial({color: '#CBD5E1', metalness: 0.5, roughness: 0.3}),
      );
      rod.position.y = -armLen / 2;
      const head = new THREE.Mesh(
        new THREE.CylinderGeometry(0.68, 0.68, 1.85, 14),
        new THREE.MeshStandardMaterial({color: '#EA580C', map: hazardTex, roughness: 0.38}),
      );
      head.rotation.x = Math.PI / 2;
      head.position.y = -armLen;
      pivot.add(rod, head);
      worldGroup.add(pivot);

      hammers.push({
        cx,
        pivotY,
        cz,
        armLen,
        maxSwing,
        speed,
        phase,
        pivot,
        headX: cx,
        headY: deckY + 0.75,
      });
    };

    const addSawblade = (
      cx: number,
      y: number,
      cz: number,
      ampX: number,
      speed: number,
      phase = 0,
    ) => {
      const slot = new THREE.Mesh(
        new THREE.BoxGeometry(ampX * 2 + 0.6, 0.08, 0.24),
        new THREE.MeshStandardMaterial({color: '#0F172A'}),
      );
      slot.position.set(cx, y + 0.04, cz);
      worldGroup.add(slot);

      const g = new THREE.Group();
      g.position.set(cx, y + 0.55, cz);
      const disc = new THREE.Mesh(
        new THREE.CylinderGeometry(0.85, 0.85, 0.14, 18),
        new THREE.MeshStandardMaterial({
          color: '#E2E8F0',
          metalness: 0.65,
          roughness: 0.22,
        }),
      );
      disc.rotation.z = Math.PI / 2;
      const core = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.32, 0.2, 12),
        new THREE.MeshStandardMaterial({color: '#EF4444', emissive: '#B91C1C', emissiveIntensity: 0.4}),
      );
      core.rotation.z = Math.PI / 2;
      g.add(disc, core);
      worldGroup.add(g);
      sawblades.push({cx, y: y + 0.55, cz, ampX, speed, phase, r: 0.88, curX: cx, mesh: g});
    };

    const addPopSpikes = (x: number, y: number, z: number, hw: number, hd: number, cycleOffset = 0) => {
      const baseMat = new THREE.MeshStandardMaterial({color: '#334155', roughness: 0.5});
      const pad = new THREE.Mesh(new THREE.BoxGeometry(hw * 2, 0.08, hd * 2), baseMat);
      pad.position.set(x, y + 0.04, z);
      worldGroup.add(pad);

      const spikesGroup = new THREE.Group();
      spikesGroup.position.set(x, y, z);
      const spikeMat = new THREE.MeshStandardMaterial({
        color: '#E11D48',
        emissive: '#9F1239',
        emissiveIntensity: 0.3,
        roughness: 0.3,
      });
      const cols = Math.max(2, Math.round(hw * 1.8));
      const rows = Math.max(2, Math.round(hd * 1.8));
      for (let ix = 0; ix < cols; ix++) {
        for (let iz = 0; iz < rows; iz++) {
          const cone = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.55, 6), spikeMat);
          cone.position.set(
            -hw + ((ix + 0.5) / cols) * (hw * 2),
            0.28,
            -hd + ((iz + 0.5) / rows) * (hd * 2),
          );
          spikesGroup.add(cone);
        }
      }
      worldGroup.add(spikesGroup);
      popSpikes.push({x, y, z, hw, hd, cycleOffset, spikesGroup, baseMat, activeNow: false});
    };

    const addBoulder = (
      laneX: number,
      zStart: number,
      zEnd: number,
      yBase: number,
      ySlope: number,
      speed: number,
      startOffset: number,
    ) => {
      const r = 1.05;
      const mesh = new THREE.Mesh(
        new THREE.DodecahedronGeometry(r, 1),
        new THREE.MeshStandardMaterial({color: '#94A3B8', map: stoneTex, roughness: 0.72}),
      );
      const zCur = THREE.MathUtils.lerp(zStart, zEnd, startOffset);
      mesh.position.set(laneX, yBase + r, zCur);
      worldGroup.add(mesh);
      boulders.push({laneX, zStart, zEnd, yBase, ySlope, speed, r, zCur, mesh});
    };

    const addBumperPiston = (
      side: -1 | 1,
      baseX: number,
      y: number,
      z: number,
      reach: number,
      speed: number,
      phase = 0,
    ) => {
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 1.15, 1.35),
        new THREE.MeshStandardMaterial({
          color: '#FB7185',
          emissive: '#E11D48',
          emissiveIntensity: 0.3,
          roughness: 0.35,
        }),
      );
      box.position.set(baseX, y + 0.62, z);
      worldGroup.add(box);
      pistons.push({side, baseX, y, z, reach, speed, phase, curX: baseX, mesh: box});
    };

    const addAcidCloud = (x: number, y: number, z: number, hw: number, hd: number) => {
      const cg = new THREE.Group();
      cg.position.set(x, y + 4.5, z);
      const cMat = new THREE.MeshStandardMaterial({
        color: '#A855F7',
        emissive: '#7E22CE',
        emissiveIntensity: 0.42,
        roughness: 0.68,
      });
      for (let i = -2; i <= 2; i++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(1.5 - Math.abs(i) * 0.16, 10, 8), cMat);
        puff.position.set(i * 1.1, Math.abs(i % 2) * 0.35, (i % 2) * 0.45);
        puff.scale.y = 0.65;
        cg.add(puff);
      }
      worldGroup.add(cg);

      const count = 34;
      const dropGeo = new THREE.BoxGeometry(0.06, 0.55, 0.06);
      const dropMat = new THREE.MeshBasicMaterial({
        color: '#E9D5FF',
        transparent: true,
        opacity: 0.74,
      });
      const drops = new THREE.InstancedMesh(dropGeo, dropMat, count);
      const dropOffsets = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        dropOffsets[i * 3] = x + (Math.random() - 0.5) * hw * 2;
        dropOffsets[i * 3 + 1] = Math.random() * 4.2;
        dropOffsets[i * 3 + 2] = z + (Math.random() - 0.5) * hd * 2;
      }
      worldGroup.add(drops);
      acidClouds.push({x, y, z, hw, hd, drops, dropOffsets});
    };

    const addBoostPad = (x: number, y: number, z: number, isSpring = false) => {
      const g = new THREE.Group();
      g.position.set(x, y + 0.06, z);
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(isSpring ? 1.85 : 2.3, 0.15, isSpring ? 1.85 : 2.6),
        new THREE.MeshStandardMaterial({
          color: isSpring ? '#FACC15' : '#22D3EE',
          emissive: isSpring ? '#CA8A04' : '#0284C7',
          emissiveIntensity: 0.6,
          roughness: 0.25,
        }),
      );
      g.add(mesh);
      worldGroup.add(g);
      boostPads.push({x, y, z, hw: 1.2, hd: 1.4, isSpring, mesh: g});
    };

    const addCheckpoint = (index: number, label: string, x: number, y: number, z: number) => {
      const archMat = new THREE.MeshStandardMaterial({
        color: '#64748B',
        emissive: '#334155',
        emissiveIntensity: 0.2,
        roughness: 0.4,
      });
      const postL = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 3.2, 10), archMat);
      postL.position.set(x - 3.8, y + 1.6, z);
      const postR = postL.clone();
      postR.position.x = x + 3.8;
      const topBar = new THREE.Mesh(new THREE.BoxGeometry(8.0, 0.35, 0.35), archMat);
      topBar.position.set(x, y + 3.2, z);
      const flagMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 0.6, 0.08),
        new THREE.MeshStandardMaterial({
          color: '#94A3B8',
          emissive: '#475569',
          emissiveIntensity: 0.25,
        }),
      );
      flagMesh.position.set(x + 4.35, y + 2.8, z);
      worldGroup.add(postL, postR, topBar, flagMesh);
      checkpoints.push({index, label, x, y, z, flagMesh, archMat});
    };

    // =========================================================================
    // EGGY-PARTY STYLE 1000M STADIUM OBSTACLE COURSE
    // =========================================================================
    addDeck(0, 0, -10, 8.6, 1.2, 24, 'normal', '#93C5FD', {
      tex: stoneTex,
      rimColor: '#38BDF8',
    });
    const startGuide = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 5.2),
      new THREE.MeshBasicMaterial({map: convFwdTex}),
    );
    startGuide.rotation.x = -Math.PI / 2;
    startGuide.position.set(0, 0.025, -2.5);
    worldGroup.add(startGuide);

    for (const hz of [-8, -15]) {
      const hurdle = new THREE.Mesh(
        new THREE.BoxGeometry(8.0, 0.55, 0.42),
        new THREE.MeshStandardMaterial({color: '#FB923C', map: hazardTex}),
      );
      hurdle.position.set(0, 0.28, hz);
      worldGroup.add(hurdle);
      popSpikes.push({
        x: 0,
        y: 0,
        z: hz,
        hw: 3.9,
        hd: 0.25,
        cycleOffset: -999,
        spikesGroup: new THREE.Group(),
        baseMat: new THREE.MeshStandardMaterial(),
        activeNow: true,
      });
    }

    addDeck(0, 0, -40, 9.4, 1.2, 34, 'normal', '#BAE6FD', {
      tex: stoneTex,
      rimColor: '#2563EB',
    });
    addBoostPad(0, 0, -25);
    addSweeper(0, 0, -34, 3.9, 1.85, 0, false);
    addSweeper(0, 0, -48, 3.9, -2.05, 1.1, true);

    // Sector 2
    addDeck(0, 0, -64, 8.8, 1.2, 12, 'normal', '#CBD5E1', {tex: stoneTex, rimColor: '#22C55E'});
    addCheckpoint(1, 'Sàn Kính Nứt', 0, 0, -62);

    for (let row = 0; row < 5; row++) {
      const rz = -74 - row * 7.8;
      const fragileCol = (row * 2 + 1) % 3;
      for (let col = 0; col < 3; col++) {
        const lx = (col - 1) * 3.1;
        const isFragile = col === fragileCol || (row % 2 === 1 && col === (fragileCol + 1) % 3);
        addDeck(
          lx,
          0,
          rz,
          2.7,
          0.45,
          5.8,
          isFragile ? 'fragile' : 'normal',
          isFragile ? '#FDBA74' : '#38BDF8',
          {rimColor: isFragile ? '#EA580C' : '#0284C7'},
        );
      }
    }
    addBoostPad(3.1, 0, -74, true);
    addDeck(3.1, 3.2, -94, 3.0, 0.6, 22, 'normal', '#FDE047', {rimColor: '#CA8A04'});

    // Sector 3
    addDeck(0, 0, -124, 9.0, 1.2, 14, 'normal', '#CBD5E1', {tex: stoneTex, rimColor: '#22C55E'});
    addCheckpoint(2, 'Đá Lăn & Búa Tạ', 0, 0, -124);

    addDeck(0, 0, -148, 9.4, 1.4, 34, 'ramp', '#E2E8F0', {
      tex: stoneTex,
      rimColor: '#EF4444',
      slopeRise: 4.2,
    });
    addBoulder(-2.6, -163, -132, 0, 4.2, 10.2, 0.1);
    addBoulder(0, -163, -132, 0, 4.2, 11.8, 0.55);
    addBoulder(2.6, -163, -132, 0, 4.2, 10.8, 0.8);

    addDeck(0, 4.2, -177, 6.4, 1.2, 24, 'normal', '#FED7AA', {
      tex: stoneTex,
      rimColor: '#FB923C',
    });
    addHammer(0, 4.2, -172, 3.8, 1.05, 2.15, 0);
    addHammer(0, 4.2, -182, 3.8, 1.05, 2.35, Math.PI);

    // Sector 4
    addDeck(0, 4.2, -195, 9.0, 1.2, 14, 'normal', '#CBD5E1', {tex: stoneTex, rimColor: '#22C55E'});
    addCheckpoint(3, 'Mưa Axit & Lưỡi Cưa', 0, 4.2, -194);

    addDeck(0, 4.2, -228, 8.6, 1.2, 52, 'normal', '#E9D5FF', {
      tex: stoneTex,
      rimColor: '#9333EA',
    });
    addAcidCloud(0, 4.2, -210, 4.0, 4.5);
    addSawblade(0, 4.2, -210, 3.2, 2.25, 0);
    addPopSpikes(-2.0, 4.2, -222, 1.6, 1.4, 0);
    addPopSpikes(2.0, 4.2, -222, 1.6, 1.4, 1.8);
    addAcidCloud(0, 4.2, -234, 4.0, 4.8);
    addSawblade(0, 4.2, -234, 3.2, -2.55, 1.4);
    addPopSpikes(0, 4.2, -246, 3.6, 1.5, 0.7);

    // Sector 5
    addDeck(0, 4.2, -261, 9.0, 1.2, 12, 'normal', '#CBD5E1', {tex: stoneTex, rimColor: '#22C55E'});
    addCheckpoint(4, 'Băng Chuyền & Đĩa Xoay', 0, 4.2, -260);

    addDeck(-2.3, 4.2, -277, 4.0, 0.9, 18, 'conveyor_fwd', '#38BDF8', {tex: convFwdTex});
    addDeck(2.3, 4.2, -277, 4.0, 0.9, 18, 'conveyor_rev', '#FB7185', {tex: convRevTex});
    addBumperPiston(-1, -4.4, 4.2, -276, 2.6, 2.35, 0);
    addBumperPiston(1, 4.4, 4.2, -281, 2.6, 2.35, Math.PI);

    addTurntable(0, 4.2, -295, 5.4, 1.12);
    addSweeper(0, 4.2, -295, 4.6, -1.45, 0, false);
    addTurntable(0, 4.2, -309, 5.4, -1.2);
    addBumperPiston(-1, -5.2, 4.2, -309, 2.8, 2.15, 0.7);
    addBumperPiston(1, 5.2, 4.2, -309, 2.8, 2.15, 2.5);

    // Sector 6
    addDeck(0, 4.2, -348, 9.0, 1.2, 58, 'normal', '#FDE68A', {
      tex: stoneTex,
      rimColor: '#F59E0B',
    });
    addBoostPad(0, 4.2, -325);
    addSweeper(0, 4.2, -338, 3.9, 2.25, 0, true);
    addSawblade(0, 4.2, -352, 3.3, 2.8, 0.4);
    addBoostPad(0, 4.2, -365);

    addDeck(0, 4.2, -382, 12.4, 1.6, 12, 'normal', '#FEF9C3', {
      tex: stoneTex,
      rimColor: '#F59E0B',
    });
    const fPostL = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.36, 5.2, 12),
      new THREE.MeshStandardMaterial({color: '#F59E0B', metalness: 0.4, roughness: 0.25}),
    );
    fPostL.position.set(-4.6, 6.8, -378);
    const fPostR = fPostL.clone();
    fPostR.position.x = 4.6;
    const fBanner = new THREE.Mesh(
      new THREE.BoxGeometry(9.8, 1.35, 0.36),
      new THREE.MeshBasicMaterial({map: finishTex}),
    );
    fBanner.position.set(0, 9.1, -378);
    worldGroup.add(fPostL, fPostR, fBanner);

    const trophyGroup = new THREE.Group();
    trophyGroup.position.set(0, 6.2, -382);
    const trophyCup = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 0.42, 1.4, 16),
      new THREE.MeshStandardMaterial({
        color: '#FDE047',
        emissive: '#F59E0B',
        emissiveIntensity: 0.48,
        metalness: 0.45,
        roughness: 0.2,
      }),
    );
    const trophyRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.45, 0.09, 10, 28),
      new THREE.MeshStandardMaterial({color: '#FB7185', emissive: '#E11D48', emissiveIntensity: 0.6}),
    );
    trophyGroup.add(trophyCup, trophyRing);
    worldGroup.add(trophyGroup);

    // Puffy Stadium Sky Clouds & Neon Pylons
    const pylonGeo = new THREE.CylinderGeometry(0.28, 0.42, 5.5, 8);
    const pylonMat = new THREE.MeshStandardMaterial({color: '#1E293B', roughness: 0.5});
    const beaconGeo = new THREE.SphereGeometry(0.45, 10, 8);
    const beaconMat = new THREE.MeshStandardMaterial({
      color: '#FACC15',
      emissive: '#F59E0B',
      emissiveIntensity: 0.78,
    });
    const cloudMat = new THREE.MeshStandardMaterial({
      color: '#FFFFFF',
      roughness: 0.85,
      transparent: true,
      opacity: 0.86,
    });
    for (let z = -10; z >= -375; z -= 24) {
      for (const sx of [-8.4, 8.4]) {
        const pylon = new THREE.Mesh(pylonGeo, pylonMat);
        const by = z < -160 ? 3.5 : -0.6;
        pylon.position.set(sx, by, z);
        const beacon = new THREE.Mesh(beaconGeo, beaconMat);
        beacon.position.set(sx, by + 3.0, z);
        worldGroup.add(pylon, beacon);
      }
      const cg = new THREE.Group();
      cg.position.set((Math.abs(z) % 48 === 10 ? -1 : 1) * 14, -2.5, z);
      for (let b = 0; b < 3; b++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(2.4 - b * 0.3, 10, 8), cloudMat);
        puff.position.set((b - 1) * 1.8, b === 1 ? 0.5 : 0, 0);
        puff.scale.y = 0.6;
        cg.add(puff);
      }
      worldGroup.add(cg);
    }

    const playerRig = buildAvatarRig(avatarCfg);
    if (playerRig.shadowDisc) playerRig.shadowDisc.visible = false;
    scene.add(playerRig.root);

    const dropShadowDisc = new THREE.Mesh(
      new THREE.CircleGeometry(0.52, 24),
      new THREE.MeshBasicMaterial({
        color: '#0F172A',
        transparent: true,
        opacity: 0.44,
        depthWrite: false,
      }),
    );
    dropShadowDisc.rotation.x = -Math.PI / 2;
    scene.add(dropShadowDisc);

    const dropShadowRing = new THREE.Mesh(
      new THREE.RingGeometry(0.48, 0.57, 24),
      new THREE.MeshBasicMaterial({
        color: '#FB923C',
        transparent: true,
        opacity: 0.62,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    dropShadowRing.rotation.x = -Math.PI / 2;
    scene.add(dropShadowRing);

    const particles = new ParticleBurstPool(scene, 180);

    let px = 0;
    let py = 0.2;
    let pz = 0.6;
    let vx = 0;
    let vy = 0;
    let vz = 0;
    let facingYaw = Math.PI;
    let grounded = false;
    let jumpsLeft = 2;
    let coyoteTimer = 0;
    let jumpBufferTimer = 0;
    let dashCooldown = 0;
    let dashTimer = 0;
    let invulnTimer = 0;
    let boostTimer = 0;
    let hearts = MAX_HEARTS;
    let checkpointPos = new THREE.Vector3(0, 0.2, 0.6);
    let highestCheckpointIdx = 0;
    const activatedCheckpoints = new Set<number>();
    let playTimeSec = 0;
    let bannerMsg = '';
    let bannerTimer = 0;
    let rewardPaid = false;

    let camYaw = 0;
    let camPitch = 0.28;
    let draggingCam = false;
    let dragLastX = 0;
    let dragLastY = 0;

    const showBanner = (msg: string, duration = 1.8) => {
      bannerMsg = msg;
      bannerTimer = duration;
    };

    const resetRun = () => {
      px = 0;
      py = 0.2;
      pz = 0.6;
      vx = 0;
      vy = 0;
      vz = 0;
      facingYaw = Math.PI;
      camYaw = 0;
      camPitch = 0.28;
      grounded = false;
      jumpsLeft = 2;
      coyoteTimer = 0;
      jumpBufferTimer = 0;
      dashCooldown = 0;
      dashTimer = 0;
      invulnTimer = 0;
      boostTimer = 0;
      hearts = MAX_HEARTS;
      checkpointPos.set(0, 0.2, 0.6);
      highestCheckpointIdx = 0;
      activatedCheckpoints.clear();
      playTimeSec = 0;
      bannerMsg = '';
      bannerTimer = 0;
      rewardPaid = false;
      gameStatusRef.current = 'ready';

      decks.forEach((d) => {
        d.fragileState = 'idle';
        d.fragileTimer = 0;
        d.solidNow = true;
        d.mesh.visible = true;
        d.mesh.position.x = d.x;
        d.mat.color.set(d.baseColor);
      });
      checkpoints.forEach((cp) => {
        (cp.flagMesh.material as THREE.MeshStandardMaterial).color.set('#94A3B8');
        (cp.flagMesh.material as THREE.MeshStandardMaterial).emissive.set('#475569');
        cp.archMat.color.set('#64748B');
        cp.archMat.emissive.set('#334155');
      });

      setHud({
        hearts: MAX_HEARTS,
        maxHearts: MAX_HEARTS,
        meters: 0,
        totalMeters: TOTAL_METERS,
        checkpointIdx: 0,
        totalCheckpoints: checkpoints.length,
        sectorName: getSectorName(0),
        elapsedSec: 0,
        bannerText: '',
        acidSlow: false,
        boosted: false,
        dashReady: true,
        status: 'ready',
        rewardEarned: 0,
      });
    };
    restartActionRef.current = resetRun;

    const dom = renderer.domElement;
    const onPointerDown = (e: PointerEvent) => {
      draggingCam = true;
      dragLastX = e.clientX;
      dragLastY = e.clientY;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!draggingCam) return;
      const dx = e.clientX - dragLastX;
      const dy = e.clientY - dragLastY;
      dragLastX = e.clientX;
      dragLastY = e.clientY;
      camYaw -= dx * 0.0075;
      camPitch = THREE.MathUtils.clamp(camPitch + dy * 0.005, 0.14, 0.78);
    };
    const onPointerUp = () => {
      draggingCam = false;
    };
    dom.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    const handleResize = () => {
      if (!container) return;
      const w = Math.max(320, container.clientWidth || 800);
      const h = Math.max(240, container.clientHeight || 500);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObs = new ResizeObserver(handleResize);
    resizeObs.observe(container);

    const respawnAtCheckpoint = (hurt: boolean) => {
      if (hurt) {
        hearts = Math.max(0, hearts - 1);
        playArcadeSfx('hit');
      }
      if (hearts <= 0) {
        gameStatusRef.current = 'lost';
        const metersDone = Math.min(
          TOTAL_METERS,
          Math.max(0, Math.round((Math.max(0, -pz) / TOTAL_Z_SPAN) * TOTAL_METERS)),
        );
        const consolation = Math.max(2, Math.floor(metersDone / 130));
        if (!rewardPaid) {
          rewardPaid = true;
          onEarnRef.current(consolation);
        }
        setHud((h) => ({
          ...h,
          hearts: 0,
          status: 'lost',
          rewardEarned: consolation,
          bannerText: `Hết mạng! +${consolation} CG`,
        }));
        return;
      }

      decks.forEach((d) => {
        if (d.kind === 'fragile') {
          d.fragileState = 'idle';
          d.fragileTimer = 0;
          d.solidNow = true;
          d.mesh.visible = true;
          d.mesh.position.x = d.x;
          d.mat.color.set(d.baseColor);
        }
      });

      px = checkpointPos.x;
      py = checkpointPos.y + 0.5;
      pz = checkpointPos.z;
      vx = 0;
      vy = 0;
      vz = 0;
      dashTimer = 0;
      invulnTimer = 1.4;
      particles.emit(px, py + 0.5, pz, '#38BDF8', 14, 3.6, 3.2);
      showBanner('Quay lại Checkpoint!', 1.2);
    };

    const _fwd = new THREE.Vector3();
    const _right = new THREE.Vector3();
    const _camTarget = new THREE.Vector3();
    const _rainDummy = new THREE.Object3D();

    let disposed = false;
    let rafId = 0;
    let swTimer: number | null = null;
    let lastMs = performance.now();
    let elapsedTotal = 0;
    let hudSyncAccum = 0;

    const getDeckTopYAt = (d: DeckDef, zVal: number): number => {
      if (!d.slopeRise) return d.y;
      const frontZ = d.z + d.d / 2;
      const t = THREE.MathUtils.clamp((frontZ - zVal) / d.d, 0, 1);
      return d.y + t * d.slopeRise;
    };

    const stepSimulation = (dt: number) => {
      elapsedTotal += dt;
      if (bannerTimer > 0) {
        bannerTimer = Math.max(0, bannerTimer - dt);
        if (bannerTimer === 0) bannerMsg = '';
      }
      if (invulnTimer > 0) invulnTimer = Math.max(0, invulnTimer - dt);
      if (boostTimer > 0) boostTimer = Math.max(0, boostTimer - dt);
      if (dashCooldown > 0) dashCooldown = Math.max(0, dashCooldown - dt);
      if (dashTimer > 0) dashTimer = Math.max(0, dashTimer - dt);

      if (camResetQueuedRef.current) {
        camResetQueuedRef.current = false;
        camYaw = 0;
        camPitch = 0.28;
      }

      convFwdTex.offset.y -= dt * 1.45;
      convRevTex.offset.y += dt * 1.45;

      for (const d of decks) {
        if (d.kind === 'fragile') {
          if (d.fragileState === 'cracking') {
            d.fragileTimer -= dt;
            d.mesh.position.x = d.x + Math.sin(elapsedTotal * 52) * 0.08;
            d.mat.color.set('#EF4444');
            if (d.fragileTimer <= 0) {
              d.fragileState = 'broken';
              d.fragileTimer = 2.6;
              d.solidNow = false;
              d.mesh.visible = false;
              playArcadeSfx('break');
              particles.emit(d.x, d.y, d.z, '#FB923C', 10, 3.2, 2.0);
            }
          } else if (d.fragileState === 'broken') {
            d.fragileTimer -= dt;
            if (d.fragileTimer <= 0) {
              d.fragileState = 'idle';
              d.solidNow = true;
              d.mesh.visible = true;
              d.mesh.position.x = d.x;
              d.mat.color.set(d.baseColor);
            }
          }
        }
      }

      for (const tt of turntables) tt.mesh.rotation.y += tt.omega * dt;
      for (const sw of sweepers) sw.pivot.rotation.y = elapsedTotal * sw.speed + sw.phase;
      for (const hm of hammers) {
        const ang = Math.sin(elapsedTotal * hm.speed + hm.phase) * hm.maxSwing;
        hm.pivot.rotation.z = ang;
        hm.headX = hm.cx + Math.sin(ang) * hm.armLen;
        hm.headY = hm.pivotY - Math.cos(ang) * hm.armLen;
      }
      for (const b of boulders) {
        b.zCur += b.speed * dt;
        if (b.zCur > b.zEnd) b.zCur = b.zStart;
        const t = THREE.MathUtils.clamp((b.zEnd - b.zCur) / (b.zEnd - b.zStart), 0, 1);
        const deckY = b.yBase + t * b.ySlope;
        b.mesh.position.set(b.laneX, deckY + b.r, b.zCur);
        b.mesh.rotation.x += (b.speed * dt) / b.r;
      }
      for (const saw of sawblades) {
        saw.curX = saw.cx + Math.sin(elapsedTotal * saw.speed + saw.phase) * saw.ampX;
        saw.mesh.position.set(saw.curX, saw.y, saw.cz);
        saw.mesh.rotation.x += dt * 11;
      }
      for (const sp of popSpikes) {
        if (sp.cycleOffset === -999) continue;
        const cyc = (elapsedTotal + sp.cycleOffset) % 3.4;
        if (cyc < 1.6) {
          sp.activeNow = false;
          sp.spikesGroup.position.y = sp.y - 0.55;
          sp.baseMat.color.set('#334155');
        } else if (cyc < 2.2) {
          sp.activeNow = false;
          sp.spikesGroup.position.y = sp.y - 0.35;
          sp.baseMat.color.set('#F59E0B');
        } else {
          sp.activeNow = true;
          sp.spikesGroup.position.y = sp.y;
          sp.baseMat.color.set('#E11D48');
        }
      }
      for (const pis of pistons) {
        const wave = (Math.sin(elapsedTotal * pis.speed + pis.phase) + 1) * 0.5;
        pis.curX = pis.baseX - pis.side * wave * pis.reach;
        pis.mesh.position.x = pis.curX;
      }
      for (const ac of acidClouds) {
        const count = ac.drops.count;
        for (let i = 0; i < count; i++) {
          let dy = ac.dropOffsets[i * 3 + 1] - dt * 9.5;
          if (dy < 0) dy += 4.3;
          ac.dropOffsets[i * 3 + 1] = dy;
          _rainDummy.position.set(
            ac.dropOffsets[i * 3],
            ac.y + 0.25 + dy,
            ac.dropOffsets[i * 3 + 2],
          );
          _rainDummy.updateMatrix();
          ac.drops.setMatrixAt(i, _rainDummy.matrix);
        }
        ac.drops.instanceMatrix.needsUpdate = true;
      }
      trophyGroup.rotation.y = elapsedTotal * 1.5;
      trophyGroup.position.y = 6.2 + Math.sin(elapsedTotal * 2.5) * 0.18;

      const status = gameStatusRef.current;
      if (status === 'won' || status === 'lost') {
        particles.update(dt);
        updateAvatarRigAnimation(
          playerRig,
          status === 'won' ? 'happy_jump' : 'idle',
          elapsedTotal,
          status === 'won',
        );
        playerRig.root.position.set(px, py, pz);
        playerRig.root.rotation.y = facingYaw;
        return;
      }

      if (status === 'playing') playTimeSec += dt;

      let inX = joyVecRef.current.x;
      let inY = joyVecRef.current.y;
      if (keysRef.current.KeyA || keysRef.current.ArrowLeft) inX -= 1;
      if (keysRef.current.KeyD || keysRef.current.ArrowRight) inX += 1;
      if (keysRef.current.KeyW || keysRef.current.ArrowUp) inY += 1;
      if (keysRef.current.KeyS || keysRef.current.ArrowDown) inY -= 1;
      const inLen = Math.hypot(inX, inY);
      if (inLen > 1) {
        inX /= inLen;
        inY /= inLen;
      }

      _fwd.set(-Math.sin(camYaw), 0, -Math.cos(camYaw));
      _right.set(Math.cos(camYaw), 0, -Math.sin(camYaw));
      const moveX = _right.x * inX + _fwd.x * inY;
      const moveZ = _right.z * inX + _fwd.z * inY;

      if (jumpQueuedRef.current) {
        jumpQueuedRef.current = false;
        jumpBufferTimer = 0.14;
      } else if (jumpBufferTimer > 0) {
        jumpBufferTimer = Math.max(0, jumpBufferTimer - dt);
      }

      if (dashQueuedRef.current) {
        dashQueuedRef.current = false;
        if (dashCooldown <= 0) {
          dashCooldown = 1.5;
          dashTimer = 0.24;
          const dYaw = Math.hypot(moveX, moveZ) > 0.1 ? Math.atan2(moveX, moveZ) : facingYaw;
          facingYaw = dYaw;
          vx = Math.sin(dYaw) * 14.8;
          vz = Math.cos(dYaw) * 14.8;
          vy = Math.max(vy, 3.2);
          playArcadeSfx('boost');
          particles.emit(px, py + 0.4, pz, '#22D3EE', 12, 3.2, 1.8);
        }
      }

      let inAcid = false;
      for (const ac of acidClouds) {
        if (
          Math.abs(px - ac.x) <= ac.hw &&
          Math.abs(pz - ac.z) <= ac.hd &&
          py >= ac.y - 0.5 &&
          py <= ac.y + 4.4
        ) {
          inAcid = true;
          break;
        }
      }

      let surfaceConveyorZ = 0;
      if (grounded) {
        for (const d of decks) {
          if (!d.solidNow) continue;
          if (Math.abs(px - d.x) <= d.w / 2 && Math.abs(pz - d.z) <= d.d / 2) {
            if (d.kind === 'conveyor_fwd') surfaceConveyorZ = -3.8;
            else if (d.kind === 'conveyor_rev') surfaceConveyorZ = 4.0;
          }
        }
        for (const tt of turntables) {
          const rx = px - tt.cx;
          const rz = pz - tt.cz;
          if (Math.hypot(rx, rz) <= tt.r && Math.abs(py - tt.y) < 0.45) {
            const dAng = tt.omega * dt;
            const c = Math.cos(dAng);
            const s = Math.sin(dAng);
            px = tt.cx + rx * c + rz * s;
            pz = tt.cz - rx * s + rz * c;
          }
        }
      }

      if (dashTimer <= 0) {
        const speedMult = (boostTimer > 0 ? 1.52 : 1) * (inAcid ? 0.58 : 1);
        const maxSpeed = 7.6 * speedMult;
        const accel = grounded ? 44 : 25;
        const drag = grounded ? 11 : 3.2;

        vx += moveX * accel * dt;
        vz += moveZ * accel * dt;

        const damp = Math.exp(-drag * dt);
        if (Math.abs(moveX) < 0.05) vx *= damp;
        if (Math.abs(moveZ) < 0.05) vz *= damp;

        const hSpd = Math.hypot(vx, vz);
        if (hSpd > maxSpeed && invulnTimer < 0.6) {
          const s = maxSpeed / hSpd;
          vx *= s;
          vz *= s;
        }
      }

      if (Math.hypot(moveX, moveZ) > 0.12 && dashTimer <= 0) {
        const targetYaw = Math.atan2(moveX, moveZ);
        let diff = targetYaw - facingYaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        facingYaw += diff * Math.min(1, dt * 14);
      }

      if (grounded) coyoteTimer = 0.14;
      else coyoteTimer = Math.max(0, coyoteTimer - dt);

      if (jumpBufferTimer > 0) {
        if (coyoteTimer > 0) {
          vy = 11.0;
          grounded = false;
          coyoteTimer = 0;
          jumpBufferTimer = 0;
          jumpsLeft = 1;
          playArcadeSfx('jump');
          particles.emit(px, py + 0.1, pz, '#FFFFFF', 7, 2.2, 1.5);
        } else if (jumpsLeft > 0) {
          vy = 10.2;
          jumpsLeft = 0;
          jumpBufferTimer = 0;
          playArcadeSfx('double_jump');
          particles.emit(px, py + 0.15, pz, '#BAE6FD', 11, 3.2, 1.6);
        }
      }

      const prevY = py;
      vy -= 26.5 * dt;
      if (vy < -24) vy = -24;

      px += vx * dt;
      py += vy * dt;
      pz += (vz + surfaceConveyorZ) * dt;

      let landedDeck: DeckDef | null = null;
      let bestTopY = -Infinity;

      for (const d of decks) {
        if (!d.solidNow) continue;
        if (Math.abs(px - d.x) <= d.w / 2 + 0.28 && Math.abs(pz - d.z) <= d.d / 2 + 0.28) {
          const topY = getDeckTopYAt(d, pz);
          if (vy <= 0 && prevY >= topY - 0.55 && py <= topY + 0.25) {
            if (topY > bestTopY) {
              bestTopY = topY;
              landedDeck = d;
            }
          }
        }
      }
      for (const tt of turntables) {
        if (Math.hypot(px - tt.cx, pz - tt.cz) <= tt.r + 0.22) {
          if (vy <= 0 && prevY >= tt.y - 0.35 && py <= tt.y + 0.15) {
            if (tt.y > bestTopY) {
              bestTopY = tt.y;
              landedDeck = null;
            }
          }
        }
      }

      if (bestTopY > -Infinity) {
        py = bestTopY;
        vy = 0;
        grounded = true;
        jumpsLeft = 2;
        if (landedDeck && landedDeck.kind === 'fragile' && landedDeck.fragileState === 'idle') {
          landedDeck.fragileState = 'cracking';
          landedDeck.fragileTimer = 0.48;
        }
      } else {
        grounded = false;
      }

      for (const bp of boostPads) {
        if (
          Math.abs(px - bp.x) <= bp.hw &&
          Math.abs(pz - bp.z) <= bp.hd &&
          Math.abs(py - bp.y) < 0.7
        ) {
          if (bp.isSpring) {
            if (vy <= 2) {
              vy = 14.5;
              vz = -5.5;
              grounded = false;
              jumpsLeft = 1;
              playArcadeSfx('bounce');
              particles.emit(bp.x, bp.y + 0.4, bp.z, '#FDE047', 16, 4.5, 4.5);
              showBanner('Bật đường tắt trên cao!', 1.2);
            }
          } else if (boostTimer <= 0.2) {
            boostTimer = 1.9;
            playArcadeSfx('boost');
            particles.emit(bp.x, bp.y + 0.3, bp.z, '#22D3EE', 14, 4.2, 2.5);
          }
        }
      }

      const applyHit = (msg: string, knockX: number, knockY: number, knockZ: number) => {
        if (invulnTimer > 0) return;
        invulnTimer = 0.95;
        hearts = Math.max(0, hearts - 1);
        vx = knockX;
        vy = knockY;
        vz = knockZ;
        grounded = false;
        playArcadeSfx('hit');
        particles.emit(px, py + 0.6, pz, '#FB7185', 14, 4.5, 3.2);
        showBanner(msg, 1.1);
        if (hearts <= 0) respawnAtCheckpoint(false);
      };

      if (invulnTimer <= 0) {
        for (const sw of sweepers) {
          if (Math.abs(py - (sw.y - 0.46)) < 0.95) {
            const angles = sw.cross
              ? [sw.pivot.rotation.y, sw.pivot.rotation.y + Math.PI / 2]
              : [sw.pivot.rotation.y];
            for (const ang of angles) {
              const dx = Math.cos(ang);
              const dz = -Math.sin(ang);
              const rx = px - sw.cx;
              const rz = pz - sw.cz;
              const proj = rx * dx + rz * dz;
              if (Math.abs(proj) <= sw.len) {
                const perp = -rx * dz + rz * dx;
                if (Math.abs(perp) < 0.55) {
                  const sgn = perp >= 0 ? 1 : -1;
                  applyHit('Quạt xoay đánh trúng! (-1 Tim)', -dz * sgn * 9.5, 5.5, dx * sgn * 9.5);
                  break;
                }
              }
            }
          }
        }
        for (const hm of hammers) {
          if (Math.hypot(px - hm.headX, py + 0.6 - hm.headY, pz - hm.cz) < 1.1) {
            applyHit('Búa tạ đập trúng! (-1 Tim)', (px >= hm.headX ? 1 : -1) * 10.5, 6.2, 4.0);
            break;
          }
        }
        for (const b of boulders) {
          const bPos = b.mesh.position;
          if (Math.hypot(px - bPos.x, py + 0.65 - bPos.y, pz - bPos.z) < b.r + 0.35) {
            applyHit('Đá lăn trúng! (-1 Tim)', (px >= bPos.x ? 1 : -1) * 7.0, 6.4, 8.0);
            break;
          }
        }
        for (const saw of sawblades) {
          if (Math.hypot(px - saw.curX, py + 0.6 - saw.y, pz - saw.cz) < 0.98) {
            applyHit('Chạm lưỡi cưa! (-1 Tim)', 0, 6.5, 6.5);
            break;
          }
        }
        for (const sp of popSpikes) {
          if (!sp.activeNow) continue;
          if (
            Math.abs(px - sp.x) <= sp.hw + 0.18 &&
            Math.abs(pz - sp.z) <= sp.hd + 0.18 &&
            Math.abs(py - sp.y) < 0.45
          ) {
            applyHit(
              sp.cycleOffset === -999 ? 'Vấp rào chắn! (-1 Tim)' : 'Dính gai nhọn! (-1 Tim)',
              0,
              6.2,
              4.5,
            );
            break;
          }
        }
        for (const pis of pistons) {
          if (
            Math.abs(px - pis.curX) < 0.92 &&
            Math.abs(pz - pis.z) < 0.85 &&
            Math.abs(py - pis.y) < 1.05
          ) {
            applyHit('Đệm đẩy va trúng! (-1 Tim)', -pis.side * 10.5, 5.2, 0);
            break;
          }
        }
      }

      for (const cp of checkpoints) {
        if (activatedCheckpoints.has(cp.index)) continue;
        if (Math.abs(pz - cp.z) < 2.2 && Math.abs(px - cp.x) < 4.6 && Math.abs(py - cp.y) < 2.5) {
          activatedCheckpoints.add(cp.index);
          highestCheckpointIdx = Math.max(highestCheckpointIdx, cp.index);
          checkpointPos.set(cp.x, cp.y + 0.25, cp.z);
          (cp.flagMesh.material as THREE.MeshStandardMaterial).color.set('#34D399');
          (cp.flagMesh.material as THREE.MeshStandardMaterial).emissive.set('#10B981');
          cp.archMat.color.set('#10B981');
          cp.archMat.emissive.set('#059669');
          playArcadeSfx('checkpoint');
          particles.emit(cp.x, cp.y + 1.5, cp.z, '#34D399', 20, 4.5, 4.8);
          showBanner(`✓ Checkpoint ${cp.index}: ${cp.label}`, 1.8);
        }
      }

      if (pz <= -TOTAL_Z_SPAN && py >= 3.2) {
        gameStatusRef.current = 'won';
        const speedBonus = Math.max(0, Math.min(20, Math.round((190 - playTimeSec) * 0.2)));
        const heartBonus = Math.min(6, hearts);
        const reward = 14 + speedBonus + heartBonus;
        if (!rewardPaid) {
          rewardPaid = true;
          onEarnRef.current(reward);
        }
        playArcadeSfx('win');
        particles.emit(0, 6.2, -382, '#FDE047', 34, 6.2, 6.5);
        particles.emit(0, 6.2, -382, '#FB7185', 24, 5.4, 5.5);
        setHud({
          hearts,
          maxHearts: MAX_HEARTS,
          meters: TOTAL_METERS,
          totalMeters: TOTAL_METERS,
          checkpointIdx: checkpoints.length,
          totalCheckpoints: checkpoints.length,
          sectorName: '6. Về Đích Chiến Thắng!',
          elapsedSec: Math.round(playTimeSec),
          bannerText: `HOÀN THÀNH 1000M! +${reward} CG`,
          acidSlow: false,
          boosted: false,
          dashReady: true,
          status: 'won',
          rewardEarned: reward,
        });
        return;
      }

      if (py < -8) {
        respawnAtCheckpoint(true);
      }

      playerRig.root.position.set(px, py, pz);
      playerRig.root.rotation.y = facingYaw;
      playerRig.root.visible =
        invulnTimer <= 0 || Math.floor(elapsedTotal * 16) % 2 === 0;

      const horizSpeed = Math.hypot(vx, vz);
      if (dashTimer > 0) {
        updateAvatarRigAnimation(playerRig, 'jump', elapsedTotal * 1.4, true);
      } else if (!grounded) {
        updateAvatarRigAnimation(playerRig, 'jump', elapsedTotal, false);
      } else if (horizSpeed > 0.45) {
        updateAvatarRigAnimation(
          playerRig,
          'walk',
          elapsedTotal * (boostTimer > 0 ? 1.55 : 1.18),
          false,
        );
      } else {
        updateAvatarRigAnimation(playerRig, 'idle', elapsedTotal, false);
      }

      if (boostTimer > 0 && Math.random() < 0.45) {
        particles.emit(px, py + 0.35, pz + 0.2, '#22D3EE', 1, 1.2, 0.8);
      }

      let surfY = -999;
      for (const d of decks) {
        if (!d.solidNow) continue;
        if (Math.abs(px - d.x) <= d.w / 2 + 0.15 && Math.abs(pz - d.z) <= d.d / 2 + 0.15) {
          const ty = getDeckTopYAt(d, pz);
          if (ty <= py + 0.35 && ty > surfY) surfY = ty;
        }
      }
      for (const tt of turntables) {
        if (Math.hypot(px - tt.cx, pz - tt.cz) <= tt.r + 0.15 && tt.y <= py + 0.35 && tt.y > surfY) {
          surfY = tt.y;
        }
      }
      if (surfY > -900) {
        const gap = Math.max(0, py - surfY);
        const sc = THREE.MathUtils.clamp(1 - gap * 0.08, 0.38, 1);
        dropShadowDisc.visible = true;
        dropShadowRing.visible = !grounded;
        dropShadowDisc.position.set(px, surfY + 0.03, pz);
        dropShadowDisc.scale.setScalar(sc);
        (dropShadowDisc.material as THREE.MeshBasicMaterial).opacity = THREE.MathUtils.clamp(
          0.48 - gap * 0.05,
          0.14,
          0.48,
        );
        dropShadowRing.position.set(px, surfY + 0.035, pz);
        dropShadowRing.scale.setScalar(sc);
      } else {
        dropShadowDisc.visible = false;
        dropShadowRing.visible = false;
      }

      particles.update(dt);
      sun.position.set(px + 20, py + 34, pz + 18);
      sun.target.position.set(px, py, pz);
      sun.target.updateMatrixWorld();

      hudSyncAccum += dt;
      if (hudSyncAccum >= 0.1) {
        hudSyncAccum = 0;
        const metersNow = Math.min(
          999,
          Math.max(0, Math.round((Math.max(0, -pz) / TOTAL_Z_SPAN) * TOTAL_METERS)),
        );
        setHud((prev) => ({
          ...prev,
          hearts,
          meters: metersNow,
          checkpointIdx: highestCheckpointIdx,
          sectorName: getSectorName(metersNow),
          elapsedSec: Math.round(playTimeSec),
          bannerText: bannerMsg,
          acidSlow: inAcid,
          boosted: boostTimer > 0,
          dashReady: dashCooldown <= 0,
        }));
      }
    };

    const updateCamera = (dt: number) => {
      const camDist = 9.6;
      const horiz = Math.cos(camPitch) * camDist;
      const vert = Math.sin(camPitch) * camDist + 1.85;
      const desiredX = px + Math.sin(camYaw) * horiz;
      const desiredY = py + vert;
      const desiredZ = pz + Math.cos(camYaw) * horiz;

      const alpha = Math.min(1, dt * 8.5);
      camera.position.x = THREE.MathUtils.lerp(camera.position.x, desiredX, alpha);
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, desiredY, alpha);
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, desiredZ, alpha);

      const lookFwdX = -Math.sin(camYaw) * 2.8;
      const lookFwdZ = -Math.cos(camYaw) * 2.8;
      _camTarget.set(px + lookFwdX, py + 1.3, pz + lookFwdZ);
      camera.lookAt(_camTarget);
      skyDome.position.set(px, py, pz);
    };

    const glCtx = renderer.getContext();
    const afterDraw = (cb: () => void) => {
      if (isSoftwareGl) {
        glCtx.finish();
        swTimer = window.setTimeout(cb, 55);
      } else {
        rafId = requestAnimationFrame(cb);
      }
    };

    camera.position.set(0, 4.5, 9.8);
    camera.lookAt(0, 1.3, -2.5);

    const tick = () => {
      if (disposed) return;
      const now = performance.now();
      const dt = Math.min(0.05, Math.max(0.004, (now - lastMs) / 1000));
      lastMs = now;

      stepSimulation(dt);
      updateCamera(dt);
      renderer.render(scene, camera);
      afterDraw(tick);
    };

    try {
      renderer.compile(scene, camera);
    } catch {
      // ignore shader warm-up warnings
    }
    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      if (swTimer !== null) clearTimeout(swTimer);
      dom.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      resizeObs.disconnect();
      disposeSceneObject(worldGroup);
      disposeSceneObject(playerRig.root);
      envTex.dispose();
      renderer.dispose();
      if (dom.parentNode === container) container.removeChild(dom);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateJoystickFromPointer = (clientX: number, clientY: number) => {
    const base = joyBaseRef.current;
    if (!base) return;
    const rect = base.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = rect.width * 0.38;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxR) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }
    setJoyKnob({x: dx, y: dy});
    joyVecRef.current = {x: dx / maxR, y: -dy / maxR};
    if (gameStatusRef.current === 'ready') {
      gameStatusRef.current = 'playing';
      setHud((h) => ({...h, status: 'playing'}));
    }
  };

  const resetJoystick = () => {
    joyPointerIdRef.current = null;
    setJoyKnob({x: 0, y: 0});
    joyVecRef.current = {x: 0, y: 0};
  };

  const formatSec = (s: number) => {
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#1E293B] select-none">
      {/* Full-Viewport 3D Canvas */}
      <div ref={mountRef} className="h-full w-full cursor-grab active:cursor-grabbing" />

      {/* Eggy-Party Top Floating HUD Overlay (Zero-Scroll) */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-2 p-2.5 sm:p-3.5">
        <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-white/30 bg-[#0F172A]/72 px-2.5 py-1.5 text-xs font-black text-white shadow-lg">
          <div className="flex items-center gap-0.5">
            {Array.from({length: hud.maxHearts}).map((_, i) => (
              <Heart
                key={i}
                className={`h-3.5 w-3.5 ${
                  i < hud.hearts
                    ? 'fill-[#FB7185] text-[#F43F5E]'
                    : 'fill-white/15 text-white/25'
                }`}
              />
            ))}
          </div>
          <span className="rounded-lg bg-orange-500/25 px-1.5 py-0.5 text-[#FDBA74] tabular-nums">
            {hud.meters}/{hud.totalMeters}m
          </span>
          <span className="hidden items-center gap-1 rounded-lg bg-emerald-500/25 px-1.5 py-0.5 text-emerald-300 tabular-nums sm:flex">
            <Flag className="h-3 w-3" />
            {hud.checkpointIdx}/{hud.totalCheckpoints}
          </span>
        </div>

        <div className="flex min-w-[155px] flex-col items-center rounded-2xl border border-white/30 bg-[#0F172A]/72 px-3 py-1.5 text-white shadow-lg">
          <div className="flex w-full items-center justify-between gap-3 text-[11px] font-black">
            <span className="truncate text-[#FDBA74]">{hud.sectorName}</span>
            <span className="flex items-center gap-1 tabular-nums text-white/90">
              <Timer className="h-3 w-3" />
              {formatSec(hud.elapsedSec)}
            </span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#FB923C] via-[#FACC15] to-[#34D399] transition-all duration-200"
              style={{width: `${Math.round((hud.meters / hud.totalMeters) * 100)}%`}}
            />
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-1.5">
          <span className="hidden items-center gap-1 rounded-xl border border-white/25 bg-[#0F172A]/72 px-2.5 py-1.5 text-xs font-black text-[#7DD3FC] tabular-nums sm:flex">
            <Sparkles className="h-3.5 w-3.5" />
            {coinGame} CG
          </span>
          <button
            type="button"
            onClick={() => {
              camResetQueuedRef.current = true;
            }}
            title="Đặt lại góc camera (R)"
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/30 bg-[#0F172A]/72 text-white shadow transition active:scale-95"
          >
            <Compass className="h-4 w-4 text-[#FDBA74]" />
          </button>
          <button
            type="button"
            onClick={handleRestart}
            title="Chơi lại từ đầu"
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/30 bg-[#0F172A]/72 text-white shadow transition active:scale-95"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          {onClose && (
            <button
              type="button"
              onClick={() => {
                soundFX.tap();
                onClose();
              }}
              aria-label="Thoát trò chơi"
              className="flex h-8 items-center gap-1 rounded-xl border border-rose-300/40 bg-rose-600/85 px-2.5 text-xs font-black text-white shadow transition active:scale-95"
            >
              <X className="h-4 w-4" />
              <span className="hidden sm:inline">Thoát</span>
            </button>
          )}
        </div>
      </div>

      {hud.bannerText && (
        <div className="pointer-events-none absolute top-16 left-1/2 -translate-x-1/2 rounded-xl border border-white/35 bg-[#0F172A]/82 px-3.5 py-1 text-center text-xs font-black text-white shadow-lg">
          {hud.bannerText}
        </div>
      )}

      {(hud.acidSlow || hud.boosted) && (
        <div className="pointer-events-none absolute top-16 left-3 flex flex-col gap-1">
          {hud.acidSlow && (
            <span className="flex items-center gap-1 rounded-lg bg-purple-700/90 px-2.5 py-1 text-[11px] font-black text-white shadow">
              <CloudRain className="h-3.5 w-3.5" /> Mưa Axit: Chậm -42%
            </span>
          )}
          {hud.boosted && (
            <span className="flex items-center gap-1 rounded-lg bg-cyan-600/90 px-2.5 py-1 text-[11px] font-black text-white shadow">
              <Zap className="h-3.5 w-3.5" /> Tăng Tốc!
            </span>
          )}
        </div>
      )}

      {hud.status === 'ready' && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-xl bg-[#0F172A]/68 px-3 py-1 text-center text-[11px] font-bold text-white/95 shadow">
          <span className="text-[#FDBA74]">WASD/Cần gạt</span> chạy ·{' '}
          <span className="text-[#FDE047]">Space (×2)</span> Nhảy ·{' '}
          <span className="text-[#38BDF8]">Shift</span> Lướt · Đua 1000m!
        </div>
      )}

      {/* Eggy-Party Bottom Corner Controls */}
      {hud.status !== 'won' && hud.status !== 'lost' && (
        <>
          <div
            ref={joyBaseRef}
            onPointerDown={(e) => {
              e.stopPropagation();
              joyPointerIdRef.current = e.pointerId;
              e.currentTarget.setPointerCapture(e.pointerId);
              updateJoystickFromPointer(e.clientX, e.clientY);
            }}
            onPointerMove={(e) => {
              if (joyPointerIdRef.current !== e.pointerId) return;
              updateJoystickFromPointer(e.clientX, e.clientY);
            }}
            onPointerUp={resetJoystick}
            onPointerCancel={resetJoystick}
            className="absolute bottom-4 left-4 flex h-24 w-24 touch-none items-center justify-center rounded-full border-2 border-white/45 bg-[#0F172A]/40 shadow-lg sm:h-28 sm:w-28"
          >
            <div
              style={{transform: `translate(${joyKnob.x}px, ${joyKnob.y}px)`}}
              className="h-10 w-10 rounded-full border-2 border-white bg-[#FB923C]/90 shadow-md sm:h-11 sm:w-11"
            />
          </div>

          <div className="absolute right-4 bottom-4 flex items-end gap-2.5">
            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                triggerDash();
              }}
              className={`flex h-13 w-13 touch-none flex-col items-center justify-center rounded-full border-2 border-white/80 text-[10px] font-black text-white shadow-lg transition active:scale-90 sm:h-14 sm:w-14 ${
                hud.dashReady
                  ? 'bg-gradient-to-b from-[#38BDF8] to-[#0284C7]'
                  : 'bg-slate-600/70 opacity-65'
              }`}
            >
              <Zap className="h-4 w-4" />
              <span>LƯỚT</span>
            </button>

            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                triggerJump();
              }}
              className="flex h-16 w-16 touch-none flex-col items-center justify-center rounded-full border-2 border-white/85 bg-gradient-to-b from-[#FACC15] to-[#EA580C] text-xs font-black text-white shadow-xl active:scale-90 sm:h-18 sm:w-18"
            >
              <span>NHẢY</span>
              <span className="text-[9px] opacity-90">×2</span>
            </button>
          </div>
        </>
      )}

      {(hud.status === 'won' || hud.status === 'lost') && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0F172A]/72 p-4">
          <div className="w-full max-w-sm rounded-3xl border-2 border-[#FB923C] bg-[#1E293B] p-5 text-center text-white shadow-2xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FB923C]/20 text-[#FDE047]">
              {hud.status === 'won' ? (
                <Trophy className="h-7 w-7" />
              ) : (
                <Heart className="h-7 w-7 text-[#FB7185]" />
              )}
            </div>
            <h3 className="mt-2.5 text-lg font-black">
              {hud.status === 'won' ? 'Về Đích Vượt Chướng Ngại 3D!' : 'Hết Mạng Rồi!'}
            </h3>
            <p className="mt-1 text-xs font-semibold text-[#CBD5E1]">
              Quãng đường: <strong className="text-white">{hud.meters}m</strong> · Thời gian:{' '}
              <strong className="text-[#FDE047]">{formatSec(hud.elapsedSec)}</strong>
            </p>
            <div className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-[#0F172A] py-2 text-sm font-black text-[#38BDF8]">
              <Sparkles className="h-4 w-4 text-[#FDE047]" />
              <span>+{hud.rewardEarned} CoinGame</span>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={handleRestart}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-[#FB923C] py-2.5 text-xs font-black text-[#431407] transition active:scale-95"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Đua Lại</span>
              </button>
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="flex items-center justify-center rounded-2xl bg-white/15 px-4 py-2.5 text-xs font-black text-white transition active:scale-95"
                >
                  Thoát
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
