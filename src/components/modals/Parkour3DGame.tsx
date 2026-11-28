import React, {useCallback, useEffect, useRef, useState} from 'react';
import * as THREE from 'three';
import {
  Compass,
  Flag,
  Heart,
  RotateCcw,
  Sparkles,
  Star,
  Timer,
  Trophy,
  Wind,
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
  createSkyDomeMesh,
  createStoneTileTexture,
  createStudioRenderer,
  createWoodPlankTexture,
  disposeSceneObject,
  ParticleBurstPool,
  playArcadeSfx,
} from './arcade3dUtils';

interface Parkour3DGameProps {
  avatar?: AvatarConfig;
  coinGame?: number;
  onEarnCoinGame: (amount: number) => void;
  onClose?: () => void;
}

type PlatformKind = 'solid' | 'ice' | 'crumble' | 'phase' | 'moving';

interface PlatformDef {
  id: string;
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  kind: PlatformKind;
  color: string;
  moveAmpX?: number;
  moveAmpZ?: number;
  moveAmpY?: number;
  moveSpeed?: number;
  movePhase?: number;
  phaseOffset?: number;
  mesh: THREE.Mesh;
  baseMat: THREE.MeshStandardMaterial;
  crumbleState: 'idle' | 'shaking' | 'broken';
  crumbleTimer: number;
  curX: number;
  curY: number;
  curZ: number;
  dx: number;
  dy: number;
  dz: number;
  solidNow: boolean;
}

interface BouncePadDef {
  x: number;
  y: number;
  z: number;
  r: number;
  power: number;
  isSpring: boolean;
  mesh: THREE.Group;
  squish: number;
}

interface LadderDef {
  x: number;
  z: number;
  yMin: number;
  yMax: number;
  halfW: number;
  faceZ: number;
}

interface ZiplineDef {
  start: THREE.Vector3;
  end: THREE.Vector3;
  speed: number;
  handleMesh: THREE.Group;
}

interface WindZoneDef {
  x: number;
  y: number;
  z: number;
  hw: number;
  hh: number;
  hd: number;
  forceX: number;
  blades: THREE.Group;
  ribbons: THREE.Mesh[];
}

interface SweeperDef {
  cx: number;
  cy: number;
  cz: number;
  len: number;
  speed: number;
  phase: number;
  pivot: THREE.Group;
}

interface SpikePatchDef {
  x: number;
  y: number;
  z: number;
  hw: number;
  hd: number;
}

interface LightningOrbDef {
  cx: number;
  cy: number;
  cz: number;
  radius: number;
  speed: number;
  phase: number;
  mesh: THREE.Group;
  curX: number;
  curY: number;
  curZ: number;
}

interface StarDef {
  x: number;
  y: number;
  z: number;
  collected: boolean;
  mesh: THREE.Group;
}

interface CheckpointDef {
  index: number;
  label: string;
  x: number;
  y: number;
  z: number;
  flagMesh: THREE.Mesh;
  ringMesh: THREE.Mesh;
}

interface HudSnapshot {
  hearts: number;
  maxHearts: number;
  stars: number;
  totalStars: number;
  checkpointIdx: number;
  totalCheckpoints: number;
  zoneName: string;
  progressPct: number;
  elapsedSec: number;
  bannerText: string;
  status: 'ready' | 'playing' | 'won' | 'lost';
  rewardEarned: number;
  climbing: boolean;
  ziplining: boolean;
  windActive: boolean;
  dashReady: boolean;
}

const MAX_HEARTS = 5;
const TOTAL_STARS = 12;
const FINISH_Z = -275;

function getZoneName(z: number): string {
  if (z > -38) return '1. Rừng Cổ Thụ';
  if (z > -78) return '2. Thang & Zipline';
  if (z > -126) return '3. Cầu Mục & Gió';
  if (z > -174) return '4. Vườn Gai & Quét';
  if (z > -222) return '5. Băng & Mây Ẩn';
  if (z > -265) return '6. Tháp Sét';
  return '7. Đền Hoàng Kim';
}

export const Parkour3DGame: React.FC<Parkour3DGameProps> = ({
  avatar,
  coinGame = 0,
  onEarnCoinGame,
  onClose,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const avatarCfg = avatar ?? DEFAULT_AVATAR;

  const [hud, setHud] = useState<HudSnapshot>({
    hearts: MAX_HEARTS,
    maxHearts: MAX_HEARTS,
    stars: 0,
    totalStars: TOTAL_STARS,
    checkpointIdx: 0,
    totalCheckpoints: 4,
    zoneName: '1. Rừng Cổ Thụ',
    progressPct: 0,
    elapsedSec: 0,
    bannerText: '',
    status: 'ready',
    rewardEarned: 0,
    climbing: false,
    ziplining: false,
    windActive: false,
    dashReady: true,
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
    scene.fog = new THREE.Fog('#BAE6FD', 45, 165);

    const skyDome = createSkyDomeMesh('#2563EB', '#7DD3FC', '#FEF08A', 235);
    scene.add(skyDome);

    const camera = new THREE.PerspectiveCamera(
      56,
      (container.clientWidth || 800) / (container.clientHeight || 500),
      0.2,
      290,
    );

    const hemi = new THREE.HemisphereLight('#FFFDF7', '#4D7C0F', 0.9);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight('#FFF5D6', 1.48);
    sun.position.set(18, 38, 22);
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

    const rim = new THREE.DirectionalLight('#93C5FD', 0.6);
    rim.position.set(-16, 14, -24);
    scene.add(rim);

    const woodTex = createWoodPlankTexture('#A16207', '#713F12');
    const stoneTex = createStoneTileTexture('#94A3B8', '#CBD5E1');
    const mossStoneTex = createStoneTileTexture('#4ADE80', '#BBF7D0');
    const iceTex = createStoneTileTexture('#7DD3FC', '#E0F2FE');
    const arrowGuideTex = createConveyorTexture(true);
    const finishTex = createCheckeredFinishTexture();

    const worldGroup = new THREE.Group();
    scene.add(worldGroup);

    const platforms: PlatformDef[] = [];
    const bouncePads: BouncePadDef[] = [];
    const ladders: LadderDef[] = [];
    const ziplines: ZiplineDef[] = [];
    const windZones: WindZoneDef[] = [];
    const sweepers: SweeperDef[] = [];
    const spikePatches: SpikePatchDef[] = [];
    const lightningOrbs: LightningOrbDef[] = [];
    const stars: StarDef[] = [];
    const checkpoints: CheckpointDef[] = [];

    const addPlatform = (
      id: string,
      x: number,
      y: number,
      z: number,
      w: number,
      h: number,
      d: number,
      kind: PlatformKind,
      color: string,
      opts?: {
        tex?: THREE.Texture;
        moveAmpX?: number;
        moveAmpY?: number;
        moveAmpZ?: number;
        moveSpeed?: number;
        movePhase?: number;
        phaseOffset?: number;
        rimColor?: string;
      },
    ): PlatformDef => {
      const mat = new THREE.MeshStandardMaterial({
        color,
        map: opts?.tex ?? null,
        roughness: kind === 'ice' ? 0.14 : 0.56,
        metalness: kind === 'ice' ? 0.15 : 0.04,
        transparent: kind === 'phase',
        opacity: 1,
      });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      mesh.position.set(x, y - h / 2, z);
      mesh.receiveShadow = !isSoftwareGl;
      mesh.castShadow = !isSoftwareGl;

      if (opts?.rimColor) {
        const rimMesh = new THREE.Mesh(
          new THREE.BoxGeometry(w + 0.18, 0.14, d + 0.18),
          new THREE.MeshStandardMaterial({color: opts.rimColor, roughness: 0.42}),
        );
        rimMesh.position.y = h / 2 - 0.06;
        mesh.add(rimMesh);
      }

      worldGroup.add(mesh);
      const p: PlatformDef = {
        id,
        x,
        y,
        z,
        w,
        h,
        d,
        kind,
        color,
        moveAmpX: opts?.moveAmpX,
        moveAmpY: opts?.moveAmpY,
        moveAmpZ: opts?.moveAmpZ,
        moveSpeed: opts?.moveSpeed,
        movePhase: opts?.movePhase,
        phaseOffset: opts?.phaseOffset,
        mesh,
        baseMat: mat,
        crumbleState: 'idle',
        crumbleTimer: 0,
        curX: x,
        curY: y,
        curZ: z,
        dx: 0,
        dy: 0,
        dz: 0,
        solidNow: true,
      };
      platforms.push(p);
      return p;
    };

    const addTreePillar = (x: number, yBottom: number, yTop: number, z: number, canopyRadius = 2.6) => {
      const height = Math.max(2, yTop - yBottom);
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.68, 0.92, height, 10),
        new THREE.MeshStandardMaterial({color: '#92400E', map: woodTex, roughness: 0.8}),
      );
      trunk.position.set(x, yBottom + height / 2, z);
      worldGroup.add(trunk);

      const canopy = new THREE.Mesh(
        new THREE.CylinderGeometry(canopyRadius * 0.92, canopyRadius, 0.9, 14),
        new THREE.MeshStandardMaterial({color: '#22C55E', roughness: 0.65}),
      );
      canopy.position.set(x, yTop - 0.45, z);
      worldGroup.add(canopy);
    };

    const addMushroomPad = (x: number, y: number, z: number, power = 14.0, isSpring = false) => {
      const g = new THREE.Group();
      g.position.set(x, y, z);
      if (isSpring) {
        const base = new THREE.Mesh(
          new THREE.CylinderGeometry(0.75, 0.85, 0.18, 16),
          new THREE.MeshStandardMaterial({color: '#334155', roughness: 0.4}),
        );
        base.position.y = 0.09;
        const coil = new THREE.Mesh(
          new THREE.CylinderGeometry(0.45, 0.45, 0.25, 12),
          new THREE.MeshStandardMaterial({color: '#F59E0B', metalness: 0.5, roughness: 0.3}),
        );
        coil.position.y = 0.25;
        const cap = new THREE.Mesh(
          new THREE.CylinderGeometry(1.0, 0.9, 0.24, 16),
          new THREE.MeshStandardMaterial({
            color: '#FACC15',
            emissive: '#CA8A04',
            emissiveIntensity: 0.38,
            roughness: 0.22,
          }),
        );
        cap.position.y = 0.42;
        g.add(base, coil, cap);
      } else {
        const stem = new THREE.Mesh(
          new THREE.CylinderGeometry(0.42, 0.52, 0.38, 12),
          new THREE.MeshStandardMaterial({color: '#FEF3C7', roughness: 0.65}),
        );
        stem.position.y = 0.19;
        const cap = new THREE.Mesh(
          new THREE.SphereGeometry(0.98, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.52),
          new THREE.MeshStandardMaterial({
            color: '#FB7185',
            emissive: '#E11D48',
            emissiveIntensity: 0.26,
            roughness: 0.32,
          }),
        );
        cap.scale.set(1.1, 0.58, 1.1);
        cap.position.y = 0.28;
        for (let i = 0; i < 4; i++) {
          const ang = (i * Math.PI) / 2 + 0.3;
          const spot = new THREE.Mesh(
            new THREE.SphereGeometry(0.16, 8, 6),
            new THREE.MeshStandardMaterial({color: '#FFFFFF', roughness: 0.5}),
          );
          spot.position.set(Math.cos(ang) * 0.55, 0.5, Math.sin(ang) * 0.55);
          g.add(spot);
        }
        g.add(stem, cap);
      }
      worldGroup.add(g);
      bouncePads.push({x, y, z, r: 1.15, power, isSpring, mesh: g, squish: 0});
    };

    const addRopeLadder = (x: number, yMin: number, yMax: number, z: number, faceDir = 1) => {
      const h = yMax - yMin;
      const ladderGrp = new THREE.Group();
      ladderGrp.position.set(x, yMin, z);
      const railMat = new THREE.MeshStandardMaterial({color: '#D97706', roughness: 0.6});
      const rungMat = new THREE.MeshStandardMaterial({
        color: '#FEF08A',
        emissive: '#CA8A04',
        emissiveIntensity: 0.22,
        roughness: 0.45,
      });
      const railL = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, h, 8), railMat);
      railL.position.set(-0.54, h / 2, 0);
      const railR = railL.clone();
      railR.position.x = 0.54;
      ladderGrp.add(railL, railR);
      const rungs = Math.floor(h / 0.6);
      for (let i = 0; i <= rungs; i++) {
        const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.16, 8), rungMat);
        rung.rotation.z = Math.PI / 2;
        rung.position.set(0, 0.3 + i * 0.6, 0);
        ladderGrp.add(rung);
      }
      worldGroup.add(ladderGrp);
      ladders.push({x, z, yMin, yMax, halfW: 0.95, faceZ: faceDir});
    };

    const addZipline = (startVec: THREE.Vector3, endVec: THREE.Vector3, speed = 14) => {
      const diff = new THREE.Vector3().subVectors(endVec, startVec);
      const len = diff.length();
      const mid = new THREE.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5);

      const cable = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, len, 8),
        new THREE.MeshStandardMaterial({
          color: '#38BDF8',
          emissive: '#0284C7',
          emissiveIntensity: 0.55,
          metalness: 0.4,
          roughness: 0.25,
        }),
      );
      cable.position.copy(mid);
      cable.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), diff.clone().normalize());
      worldGroup.add(cable);

      for (const p of [startVec, endVec]) {
        const post = new THREE.Mesh(
          new THREE.CylinderGeometry(0.14, 0.18, 2.5, 10),
          new THREE.MeshStandardMaterial({color: '#1E293B', roughness: 0.45}),
        );
        post.position.set(p.x, p.y - 1.1, p.z);
        worldGroup.add(post);
      }

      const handle = new THREE.Group();
      handle.position.copy(startVec);
      const pulley = new THREE.Mesh(
        new THREE.BoxGeometry(0.34, 0.24, 0.34),
        new THREE.MeshStandardMaterial({color: '#FACC15', metalness: 0.4, roughness: 0.3}),
      );
      const bar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 1.0, 8),
        new THREE.MeshStandardMaterial({color: '#FB7185', roughness: 0.3}),
      );
      bar.rotation.z = Math.PI / 2;
      bar.position.y = -0.36;
      handle.add(pulley, bar);
      worldGroup.add(handle);

      ziplines.push({start: startVec.clone(), end: endVec.clone(), speed, handleMesh: handle});
    };

    const addStar = (x: number, y: number, z: number) => {
      const g = new THREE.Group();
      g.position.set(x, y, z);
      const gem = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.45, 0),
        new THREE.MeshStandardMaterial({
          color: '#FDE047',
          emissive: '#F59E0B',
          emissiveIntensity: 0.65,
          metalness: 0.25,
          roughness: 0.18,
        }),
      );
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.58, 0.045, 8, 20),
        new THREE.MeshStandardMaterial({
          color: '#FEF08A',
          emissive: '#FACC15',
          emissiveIntensity: 0.7,
        }),
      );
      g.add(gem, ring);
      worldGroup.add(g);
      stars.push({x, y, z, collected: false, mesh: g});
    };

    const addCheckpoint = (index: number, label: string, x: number, y: number, z: number) => {
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.11, 2.5, 10),
        new THREE.MeshStandardMaterial({color: '#FFFFFF', metalness: 0.3, roughness: 0.35}),
      );
      pole.position.set(x + 1.6, y + 1.25, z);
      const flagMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.0, 0.58, 0.08),
        new THREE.MeshStandardMaterial({
          color: '#94A3B8',
          emissive: '#475569',
          emissiveIntensity: 0.25,
          roughness: 0.4,
        }),
      );
      flagMesh.position.set(x + 2.1, y + 2.1, z);
      const ringMesh = new THREE.Mesh(
        new THREE.TorusGeometry(1.2, 0.08, 8, 28),
        new THREE.MeshStandardMaterial({
          color: '#94A3B8',
          emissive: '#475569',
          emissiveIntensity: 0.25,
        }),
      );
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.position.set(x, y + 0.06, z);
      worldGroup.add(pole, flagMesh, ringMesh);
      checkpoints.push({index, label, x, y, z, flagMesh, ringMesh});
    };

    const addWindFan = (
      x: number,
      y: number,
      z: number,
      hw: number,
      hh: number,
      hd: number,
      forceX: number,
    ) => {
      const dir = forceX >= 0 ? 1 : -1;
      const fanX = x - dir * (hw + 2.1);
      const housing = new THREE.Mesh(
        new THREE.CylinderGeometry(1.1, 1.2, 0.85, 14),
        new THREE.MeshStandardMaterial({color: '#334155', roughness: 0.45}),
      );
      housing.rotation.z = Math.PI / 2;
      housing.position.set(fanX, y + 1.25, z);
      worldGroup.add(housing);

      const blades = new THREE.Group();
      blades.position.set(fanX + dir * 0.48, y + 1.25, z);
      const bladeMat = new THREE.MeshStandardMaterial({
        color: '#38BDF8',
        emissive: '#0284C7',
        emissiveIntensity: 0.35,
        roughness: 0.3,
      });
      for (let i = 0; i < 4; i++) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.65, 0.24), bladeMat);
        b.rotation.x = (i * Math.PI) / 4;
        blades.add(b);
      }
      worldGroup.add(blades);

      const ribbons: THREE.Mesh[] = [];
      for (let i = 0; i < 4; i++) {
        const rib = new THREE.Mesh(
          new THREE.BoxGeometry(1.4, 0.09, 0.14),
          new THREE.MeshBasicMaterial({color: '#E0F2FE', transparent: true, opacity: 0.68}),
        );
        rib.position.set(x, y + 0.55 + (i % 2) * 0.9, z - 1.2 + i * 0.8);
        worldGroup.add(rib);
        ribbons.push(rib);
      }
      windZones.push({x, y, z, hw, hh, hd, forceX, blades, ribbons});
    };

    const addSweeper = (cx: number, cy: number, cz: number, len: number, speed: number, phase = 0) => {
      const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.52, 0.65, 12),
        new THREE.MeshStandardMaterial({color: '#475569', roughness: 0.45}),
      );
      hub.position.set(cx, cy + 0.32, cz);
      worldGroup.add(hub);

      const pivot = new THREE.Group();
      pivot.position.set(cx, cy + 0.46, cz);
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.19, 0.19, len * 2, 10),
        new THREE.MeshStandardMaterial({
          color: '#FB7185',
          emissive: '#E11D48',
          emissiveIntensity: 0.32,
          roughness: 0.32,
        }),
      );
      beam.rotation.z = Math.PI / 2;
      const tipL = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 10, 8),
        new THREE.MeshStandardMaterial({color: '#FACC15', roughness: 0.35}),
      );
      tipL.position.x = -len;
      const tipR = tipL.clone();
      tipR.position.x = len;
      pivot.add(beam, tipL, tipR);
      worldGroup.add(pivot);

      sweepers.push({cx, cy: cy + 0.46, cz, len, speed, phase, pivot});
    };

    const addSpikePatch = (x: number, y: number, z: number, hw: number, hd: number) => {
      const mat = new THREE.MeshStandardMaterial({color: '#E11D48', roughness: 0.4});
      const base = new THREE.Mesh(
        new THREE.BoxGeometry(hw * 2, 0.1, hd * 2),
        new THREE.MeshStandardMaterial({color: '#881337', roughness: 0.65}),
      );
      base.position.set(x, y + 0.05, z);
      worldGroup.add(base);

      const cols = Math.max(2, Math.round(hw * 2.1));
      const rows = Math.max(2, Math.round(hd * 2.1));
      for (let ix = 0; ix < cols; ix++) {
        for (let iz = 0; iz < rows; iz++) {
          const sx = x - hw + ((ix + 0.5) / cols) * (hw * 2);
          const sz = z - hd + ((iz + 0.5) / rows) * (hd * 2);
          const cone = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.48, 6), mat);
          cone.position.set(sx, y + 0.3, sz);
          worldGroup.add(cone);
        }
      }
      spikePatches.push({x, y, z, hw, hd});
    };

    const addLightningOrb = (
      cx: number,
      cy: number,
      cz: number,
      radius: number,
      speed: number,
      phase = 0,
    ) => {
      const g = new THREE.Group();
      const core = new THREE.Mesh(
        new THREE.SphereGeometry(0.46, 12, 10),
        new THREE.MeshStandardMaterial({
          color: '#38BDF8',
          emissive: '#0EA5E9',
          emissiveIntensity: 0.9,
          roughness: 0.2,
        }),
      );
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.68, 0.06, 8, 18),
        new THREE.MeshStandardMaterial({
          color: '#FDE047',
          emissive: '#FACC15',
          emissiveIntensity: 0.85,
        }),
      );
      ring.rotation.x = Math.PI / 2;
      g.add(core, ring);
      worldGroup.add(g);
      lightningOrbs.push({
        cx,
        cy,
        cz,
        radius,
        speed,
        phase,
        mesh: g,
        curX: cx,
        curY: cy,
        curZ: cz,
      });
    };

    // =========================================================================
    // EGGY-PARTY STYLE 7-ZONE PARKOUR COURSE
    // =========================================================================
    addPlatform('start', 0, 0, 0, 6.8, 1.4, 7.2, 'solid', '#86EFAC', {
      tex: mossStoneTex,
      rimColor: '#22C55E',
    });
    // Forward Neon Guide Strip on Start Deck
    const startGuide = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 4.4),
      new THREE.MeshBasicMaterial({map: arrowGuideTex}),
    );
    startGuide.rotation.x = -Math.PI / 2;
    startGuide.position.set(0, 0.025, -0.8);
    worldGroup.add(startGuide);

    // Colorful Eggy-Party Start Gate
    const gateMat = new THREE.MeshStandardMaterial({color: '#FACC15', roughness: 0.3});
    const postL = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 3.6, 12), gateMat);
    postL.position.set(-2.9, 1.8, -2.8);
    const postR = postL.clone();
    postR.position.x = 2.9;
    const beamTop = new THREE.Mesh(
      new THREE.BoxGeometry(6.4, 0.55, 0.42),
      new THREE.MeshStandardMaterial({color: '#FB7185', roughness: 0.35}),
    );
    beamTop.position.set(0, 3.6, -2.8);
    worldGroup.add(postL, postR, beamTop);

    addPlatform('z1_p1', 0, 0.8, -6.8, 4.0, 0.9, 3.8, 'solid', '#BBF7D0', {
      tex: mossStoneTex,
      rimColor: '#16A34A',
    });
    addPlatform('z1_p2', -2.6, 1.7, -11.6, 3.8, 0.8, 3.6, 'solid', '#FDE68A', {
      tex: woodTex,
      rimColor: '#F59E0B',
    });
    addStar(-2.6, 2.75, -11.6);

    addPlatform('z1_p3', 2.0, 2.5, -16.0, 4.0, 0.8, 3.6, 'solid', '#FDE68A', {
      tex: woodTex,
      rimColor: '#F59E0B',
    });
    addMushroomPad(2.0, 2.5, -16.0, 14.0);

    addPlatform('z1_tree1', 0, 5.2, -21.6, 5.2, 0.9, 5.0, 'solid', '#4ADE80', {
      rimColor: '#16A34A',
    });
    addTreePillar(0, -4, 4.8, -21.6, 2.6);
    addStar(0, 6.25, -21.6);

    addPlatform('z1_p4', -3.0, 6.0, -27.2, 3.8, 0.75, 3.4, 'solid', '#FDBA74', {
      tex: woodTex,
      rimColor: '#EA580C',
    });
    addPlatform('z1_p5', 2.2, 6.6, -32.2, 3.8, 0.75, 3.4, 'solid', '#FDBA74', {
      tex: woodTex,
      rimColor: '#EA580C',
    });

    // Zone 2
    addPlatform('z2_cliff_bot', 0, 7.0, -37.4, 5.2, 1.4, 4.6, 'solid', '#CBD5E1', {
      tex: stoneTex,
      rimColor: '#38BDF8',
    });
    addPlatform('z2_cliff_top', 0, 13.5, -42.4, 5.4, 6.5, 4.6, 'solid', '#E2E8F0', {
      tex: stoneTex,
      rimColor: '#38BDF8',
    });
    addRopeLadder(0, 7.0, 13.5, -39.95, 1);
    addStar(0, 11.4, -39.5);

    addPlatform('cp1_plat', 0, 13.5, -47.4, 5.0, 1.0, 4.4, 'solid', '#E2E8F0', {
      tex: stoneTex,
      rimColor: '#22C55E',
    });
    addCheckpoint(1, 'Thang & Zipline', 0, 13.5, -47.4);

    addZipline(new THREE.Vector3(0, 16.0, -49.2), new THREE.Vector3(0, 14.0, -70.0), 14.0);
    addStar(0, 14.3, -59.5);

    // Zone 3
    addPlatform('z3_land', 0, 12.2, -72.0, 5.4, 1.2, 5.2, 'solid', '#E2E8F0', {
      tex: stoneTex,
      rimColor: '#0EA5E9',
    });
    addPlatform('z3_cr1', -1.8, 12.6, -77.6, 3.0, 0.55, 3.2, 'crumble', '#FDBA74', {tex: woodTex});
    addPlatform('z3_cr2', 1.8, 13.0, -82.2, 3.0, 0.55, 3.2, 'crumble', '#FDBA74', {tex: woodTex});
    addPlatform('z3_cr3', 0, 13.5, -86.8, 3.0, 0.55, 3.2, 'crumble', '#FDBA74', {tex: woodTex});
    addStar(1.8, 14.0, -82.2);

    addPlatform('z3_wind_bridge', 0, 14.0, -96.0, 4.6, 1.0, 11.5, 'solid', '#E2E8F0', {
      tex: stoneTex,
      rimColor: '#38BDF8',
    });
    addWindFan(0, 14.0, -93.2, 2.5, 3.0, 2.5, 8.2);
    addWindFan(0, 14.0, -99.0, 2.5, 3.0, 2.5, -8.2);

    addPlatform('z3_mv1', 0, 14.8, -106.0, 4.0, 0.85, 3.8, 'moving', '#86EFAC', {
      tex: mossStoneTex,
      moveAmpX: 3.2,
      moveSpeed: 1.45,
      movePhase: 0,
      rimColor: '#16A34A',
    });
    addPlatform('z3_mv2', 0, 16.0, -112.0, 4.0, 0.85, 3.8, 'moving', '#86EFAC', {
      tex: mossStoneTex,
      moveAmpX: 3.2,
      moveSpeed: 1.45,
      movePhase: Math.PI,
      rimColor: '#16A34A',
    });
    addStar(0, 17.2, -112.0);

    addPlatform('z3_spring_plat', 0, 16.6, -118.4, 4.6, 1.0, 4.2, 'solid', '#E2E8F0', {
      tex: stoneTex,
      rimColor: '#FACC15',
    });
    addMushroomPad(0, 16.6, -118.4, 15.4, true);

    // Zone 4
    addPlatform('cp2_plat', 0, 20.0, -126.5, 5.4, 1.2, 5.2, 'solid', '#E2E8F0', {
      tex: stoneTex,
      rimColor: '#22C55E',
    });
    addCheckpoint(2, 'Vườn Gai & Quét', 0, 20.0, -126.5);

    addPlatform('z4_sw1', 0, 20.4, -135.5, 6.4, 1.0, 6.4, 'solid', '#FDE68A', {
      tex: woodTex,
      rimColor: '#FB7185',
    });
    addSweeper(0, 20.4, -135.5, 2.85, 1.8, 0);
    addStar(-2.2, 21.6, -135.5);

    addPlatform('z4_spike_br', 0, 21.0, -145.5, 5.2, 1.0, 9.2, 'solid', '#A7F3D0', {
      tex: mossStoneTex,
      rimColor: '#15803D',
    });
    addSpikePatch(-1.3, 21.0, -143.2, 0.9, 0.9);
    addSpikePatch(1.3, 21.0, -147.2, 0.9, 0.9);

    addPlatform('z4_sw2', 0, 22.0, -155.5, 6.2, 1.0, 6.2, 'solid', '#FDE68A', {
      tex: woodTex,
      rimColor: '#FB7185',
    });
    addSweeper(0, 22.0, -155.5, 2.8, -2.05, 1.2);

    addPlatform('z4_cr1', -2.0, 23.0, -162.8, 3.1, 0.6, 3.2, 'crumble', '#FDBA74', {tex: woodTex});
    addPlatform('z4_cr2', 2.0, 24.2, -168.0, 3.1, 0.6, 3.2, 'crumble', '#FDBA74', {tex: woodTex});
    addStar(2.0, 25.4, -168.0);
    addMushroomPad(2.0, 24.2, -168.0, 14.0);

    // Zone 5
    addPlatform('cp3_plat', 0, 27.0, -175.0, 5.4, 1.2, 5.0, 'solid', '#E0F2FE', {
      tex: iceTex,
      rimColor: '#38BDF8',
    });
    addCheckpoint(3, 'Băng & Mây Ẩn', 0, 27.0, -175.0);

    addPlatform('z5_ice1', 0, 27.2, -183.8, 4.4, 0.9, 8.8, 'ice', '#BAE6FD', {
      tex: iceTex,
      rimColor: '#0284C7',
    });
    addStar(0, 28.4, -184.0);

    addPlatform('z5_cloud1', -2.3, 28.2, -192.4, 3.6, 0.75, 3.6, 'phase', '#FFFFFF', {
      phaseOffset: 0,
    });
    addPlatform('z5_cloud2', 2.3, 29.2, -197.6, 3.6, 0.75, 3.6, 'phase', '#FFFFFF', {
      phaseOffset: 2.2,
    });
    addPlatform('z5_cloud3', 0, 30.2, -203.0, 3.8, 0.75, 3.6, 'phase', '#FFFFFF', {
      phaseOffset: 0.9,
    });
    addStar(2.3, 30.4, -197.6);

    addPlatform('z5_zip_pad', 0, 30.8, -208.2, 4.6, 0.9, 4.0, 'solid', '#E0F2FE', {tex: iceTex});
    addZipline(new THREE.Vector3(0, 33.4, -209.6), new THREE.Vector3(0, 34.4, -221.5), 13.0);

    // Zone 6
    addPlatform('cp4_plat', 0, 34.0, -223.8, 5.4, 1.2, 5.0, 'solid', '#E2E8F0', {
      tex: stoneTex,
      rimColor: '#22C55E',
    });
    addCheckpoint(4, 'Tháp Sét', 0, 34.0, -223.8);

    addPlatform('z6_p1', 0, 34.6, -233.0, 5.2, 1.0, 9.0, 'solid', '#CBD5E1', {
      tex: stoneTex,
      rimColor: '#38BDF8',
    });
    addLightningOrb(0, 35.6, -231.0, 2.1, 2.1, 0);
    addLightningOrb(0, 35.6, -235.5, 2.1, -2.1, Math.PI);
    addStar(0, 36.2, -233.2);

    addPlatform('z6_mv', 0, 35.6, -242.5, 4.4, 0.9, 4.2, 'moving', '#FDE68A', {
      tex: woodTex,
      moveAmpY: 2.2,
      moveSpeed: 1.5,
      rimColor: '#F59E0B',
    });
    addWindFan(0, 36.6, -242.5, 2.9, 3.5, 2.5, 6.8);

    addPlatform('z6_tower_base', 0, 38.0, -250.5, 5.4, 1.2, 5.4, 'solid', '#CBD5E1', {
      tex: stoneTex,
      rimColor: '#8B5CF6',
    });
    addSweeper(0, 38.0, -250.5, 2.4, 2.1, 0.4);

    addPlatform('z6_ladder_wall', 0, 44.0, -256.8, 5.6, 6.0, 4.4, 'solid', '#FEF3C7', {
      tex: stoneTex,
      rimColor: '#F59E0B',
    });
    addRopeLadder(0, 38.0, 44.0, -254.45, 1);
    addStar(0, 42.0, -254.0);

    // Zone 7
    addPlatform('z7_bridge', 0, 44.0, -263.5, 4.8, 0.9, 7.6, 'solid', '#FEF9C3', {
      tex: stoneTex,
      rimColor: '#F59E0B',
    });
    addPlatform('z7_summit', 0, 44.0, -274.5, 9.8, 1.6, 11.5, 'solid', '#FEF3C7', {
      tex: stoneTex,
      rimColor: '#F59E0B',
    });

    const finishArchMat = new THREE.MeshStandardMaterial({
      color: '#F59E0B',
      metalness: 0.35,
      roughness: 0.25,
    });
    const fPostL = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 4.6, 12), finishArchMat);
    fPostL.position.set(-3.4, 46.3, FINISH_Z + 1.5);
    const fPostR = fPostL.clone();
    fPostR.position.x = 3.4;
    const fBanner = new THREE.Mesh(
      new THREE.BoxGeometry(7.2, 1.15, 0.32),
      new THREE.MeshBasicMaterial({map: finishTex}),
    );
    fBanner.position.set(0, 48.2, FINISH_Z + 1.5);
    worldGroup.add(fPostL, fPostR, fBanner);

    const trophyGroup = new THREE.Group();
    trophyGroup.position.set(0, 45.6, FINISH_Z - 1.5);
    const tPed = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.35, 0.6, 16),
      new THREE.MeshStandardMaterial({color: '#F59E0B', roughness: 0.3}),
    );
    tPed.position.y = -1.3;
    const tCup = new THREE.Mesh(
      new THREE.CylinderGeometry(0.78, 0.36, 1.15, 16),
      new THREE.MeshStandardMaterial({
        color: '#FDE047',
        emissive: '#F59E0B',
        emissiveIntensity: 0.45,
        metalness: 0.45,
        roughness: 0.18,
      }),
    );
    const tRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.25, 0.08, 10, 28),
      new THREE.MeshStandardMaterial({
        color: '#38BDF8',
        emissive: '#0EA5E9',
        emissiveIntensity: 0.65,
      }),
    );
    trophyGroup.add(tPed, tCup, tRing);
    worldGroup.add(trophyGroup);

    // Puffy Eggy-Party Clouds framing left/right sky
    const cloudMat = new THREE.MeshStandardMaterial({
      color: '#FFFFFF',
      roughness: 0.85,
      transparent: true,
      opacity: 0.9,
    });
    for (let i = 0; i < 28; i++) {
      const cg = new THREE.Group();
      const side = i % 2 === 0 ? -1 : 1;
      cg.position.set(side * (11 + (i % 4) * 5.0), 3 + i * 1.55, -i * 10.5);
      for (let b = 0; b < 3; b++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(2.3 - b * 0.35, 10, 8), cloudMat);
        puff.position.set((b - 1) * 1.7, b === 1 ? 0.6 : 0, 0);
        puff.scale.y = 0.62;
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
        color: '#38BDF8',
        transparent: true,
        opacity: 0.65,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    dropShadowRing.rotation.x = -Math.PI / 2;
    scene.add(dropShadowRing);

    const particles = new ParticleBurstPool(scene, 180);

    let px = 0;
    let py = 0.1;
    let pz = 1.6;
    let vx = 0;
    let vy = 0;
    let vz = 0;
    let facingYaw = Math.PI;
    let grounded = false;
    let groundPlatform: PlatformDef | null = null;
    let jumpsLeft = 2;
    let coyoteTimer = 0;
    let jumpBufferTimer = 0;
    let dashCooldown = 0;
    let dashTimer = 0;
    let climbingLadder: LadderDef | null = null;
    let activeZipline: ZiplineDef | null = null;
    let zipProgress = 0;
    let zipCooldown = 0;
    let invulnTimer = 0;
    let hearts = MAX_HEARTS;
    let starsCollected = 0;
    let checkpointPos = new THREE.Vector3(0, 0.1, 1.6);
    let highestCheckpointIdx = 0;
    const activatedCheckpoints = new Set<number>();
    let playTimeSec = 0;
    let bannerMsg = '';
    let bannerTimer = 0;
    let rewardPaid = false;

    // Eggy-Party elevated behind-avatar chase angle showing course ahead!
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
      py = 0.1;
      pz = 1.6;
      vx = 0;
      vy = 0;
      vz = 0;
      facingYaw = Math.PI;
      camYaw = 0;
      camPitch = 0.28;
      grounded = false;
      groundPlatform = null;
      jumpsLeft = 2;
      coyoteTimer = 0;
      jumpBufferTimer = 0;
      dashCooldown = 0;
      dashTimer = 0;
      climbingLadder = null;
      activeZipline = null;
      zipProgress = 0;
      zipCooldown = 0;
      invulnTimer = 0;
      hearts = MAX_HEARTS;
      starsCollected = 0;
      checkpointPos.set(0, 0.1, 1.6);
      highestCheckpointIdx = 0;
      activatedCheckpoints.clear();
      playTimeSec = 0;
      bannerMsg = '';
      bannerTimer = 0;
      rewardPaid = false;
      gameStatusRef.current = 'ready';

      platforms.forEach((p) => {
        p.crumbleState = 'idle';
        p.crumbleTimer = 0;
        p.solidNow = true;
        p.mesh.visible = true;
        p.mesh.position.set(p.x, p.y - p.h / 2, p.z);
        p.baseMat.color.set(p.color);
        p.baseMat.opacity = 1;
      });
      stars.forEach((s) => {
        s.collected = false;
        s.mesh.visible = true;
      });
      checkpoints.forEach((cp) => {
        (cp.flagMesh.material as THREE.MeshStandardMaterial).color.set('#94A3B8');
        (cp.flagMesh.material as THREE.MeshStandardMaterial).emissive.set('#475569');
        (cp.ringMesh.material as THREE.MeshStandardMaterial).color.set('#94A3B8');
      });

      setHud({
        hearts: MAX_HEARTS,
        maxHearts: MAX_HEARTS,
        stars: 0,
        totalStars: TOTAL_STARS,
        checkpointIdx: 0,
        totalCheckpoints: checkpoints.length,
        zoneName: getZoneName(pz),
        progressPct: 0,
        elapsedSec: 0,
        bannerText: '',
        status: 'ready',
        rewardEarned: 0,
        climbing: false,
        ziplining: false,
        windActive: false,
        dashReady: true,
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
        const consolation = highestCheckpointIdx > 0 ? highestCheckpointIdx + 1 : 1;
        if (!rewardPaid) {
          rewardPaid = true;
          onEarnRef.current(consolation);
        }
        setHud((h) => ({
          ...h,
          hearts: 0,
          status: 'lost',
          rewardEarned: consolation,
          bannerText: `Hết tim! +${consolation} CG`,
        }));
        return;
      }

      platforms.forEach((p) => {
        if (p.kind === 'crumble') {
          p.crumbleState = 'idle';
          p.crumbleTimer = 0;
          p.solidNow = true;
          p.mesh.visible = true;
          p.baseMat.color.set(p.color);
        }
      });

      px = checkpointPos.x;
      py = checkpointPos.y + 0.5;
      pz = checkpointPos.z;
      vx = 0;
      vy = 0;
      vz = 0;
      dashTimer = 0;
      climbingLadder = null;
      activeZipline = null;
      invulnTimer = 1.4;
      particles.emit(px, py + 0.6, pz, '#38BDF8', 14, 3.6, 3.2);
      showBanner('Quay lại Checkpoint!', 1.3);
    };

    const _fwd = new THREE.Vector3();
    const _right = new THREE.Vector3();
    const _camTarget = new THREE.Vector3();
    const _zipPos = new THREE.Vector3();
    const _zipDir = new THREE.Vector3();

    let disposed = false;
    let rafId = 0;
    let swTimer: number | null = null;
    let lastMs = performance.now();
    let elapsedTotal = 0;
    let hudSyncAccum = 0;

    const stepSimulation = (dt: number) => {
      elapsedTotal += dt;
      if (bannerTimer > 0) {
        bannerTimer = Math.max(0, bannerTimer - dt);
        if (bannerTimer === 0) bannerMsg = '';
      }
      if (invulnTimer > 0) invulnTimer = Math.max(0, invulnTimer - dt);
      if (zipCooldown > 0) zipCooldown = Math.max(0, zipCooldown - dt);
      if (dashCooldown > 0) dashCooldown = Math.max(0, dashCooldown - dt);
      if (dashTimer > 0) dashTimer = Math.max(0, dashTimer - dt);

      if (camResetQueuedRef.current) {
        camResetQueuedRef.current = false;
        camYaw = 0;
        camPitch = 0.28;
      }

      arrowGuideTex.offset.y -= dt * 1.1;

      for (const p of platforms) {
        const prevX = p.curX;
        const prevY = p.curY;
        const prevZ = p.curZ;

        if (p.kind === 'moving') {
          const sp = p.moveSpeed ?? 1.4;
          const ph = p.movePhase ?? 0;
          p.curX = p.x + Math.sin(elapsedTotal * sp + ph) * (p.moveAmpX ?? 0);
          p.curY = p.y + Math.sin(elapsedTotal * sp + ph) * (p.moveAmpY ?? 0);
          p.curZ = p.z + Math.cos(elapsedTotal * sp + ph) * (p.moveAmpZ ?? 0);
          p.mesh.position.set(p.curX, p.curY - p.h / 2, p.curZ);
        } else if (p.kind === 'crumble') {
          if (p.crumbleState === 'shaking') {
            p.crumbleTimer -= dt;
            p.mesh.position.x = p.x + Math.sin(elapsedTotal * 48) * 0.08;
            p.baseMat.color.set('#F59E0B');
            if (p.crumbleTimer <= 0) {
              p.crumbleState = 'broken';
              p.crumbleTimer = 2.8;
              p.solidNow = false;
              p.mesh.visible = false;
              playArcadeSfx('break');
              particles.emit(p.x, p.y, p.z, '#D97706', 12, 3.8, 2.2);
            }
          } else if (p.crumbleState === 'broken') {
            p.crumbleTimer -= dt;
            if (p.crumbleTimer <= 0) {
              p.crumbleState = 'idle';
              p.solidNow = true;
              p.mesh.visible = true;
              p.mesh.position.set(p.x, p.y - p.h / 2, p.z);
              p.baseMat.color.set(p.color);
            }
          }
        } else if (p.kind === 'phase') {
          const cycle = (elapsedTotal + (p.phaseOffset ?? 0)) % 4.9;
          if (cycle < 2.6) {
            p.solidNow = true;
            p.mesh.visible = true;
            p.baseMat.opacity = 0.96;
            p.baseMat.color.set('#FFFFFF');
          } else if (cycle < 3.4) {
            p.solidNow = true;
            p.mesh.visible = Math.floor(elapsedTotal * 14) % 2 === 0;
            p.baseMat.opacity = 0.72;
            p.baseMat.color.set('#FDE047');
          } else {
            p.solidNow = false;
            p.mesh.visible = false;
          }
        }

        p.dx = p.curX - prevX;
        p.dy = p.curY - prevY;
        p.dz = p.curZ - prevZ;
      }

      for (const bp of bouncePads) {
        if (bp.squish > 0) {
          bp.squish = Math.max(0, bp.squish - dt * 5);
          bp.mesh.scale.set(1 + bp.squish * 0.2, 1 - bp.squish * 0.35, 1 + bp.squish * 0.2);
        } else {
          bp.mesh.scale.set(1, 1, 1);
        }
      }
      for (const sw of sweepers) sw.pivot.rotation.y = elapsedTotal * sw.speed + sw.phase;
      for (const wz of windZones) {
        wz.blades.rotation.x += dt * 7.5;
        const dir = wz.forceX >= 0 ? 1 : -1;
        wz.ribbons.forEach((rib, idx) => {
          const span = wz.hw * 2;
          const phase = ((elapsedTotal * 4.5 + idx * 0.85) % span) - wz.hw;
          rib.position.x = wz.x + phase * dir;
        });
      }
      for (const orb of lightningOrbs) {
        const a = elapsedTotal * orb.speed + orb.phase;
        orb.curX = orb.cx + Math.cos(a) * orb.radius;
        orb.curZ = orb.cz + Math.sin(a) * orb.radius;
        orb.curY = orb.cy + Math.sin(elapsedTotal * 4 + orb.phase) * 0.22;
        orb.mesh.position.set(orb.curX, orb.curY, orb.curZ);
        orb.mesh.rotation.y = elapsedTotal * 3.5;
      }
      for (const s of stars) {
        if (!s.collected) {
          s.mesh.rotation.y = elapsedTotal * 2.4;
          s.mesh.position.y = s.y + Math.sin(elapsedTotal * 3.2 + s.z) * 0.16;
        }
      }
      trophyGroup.rotation.y = elapsedTotal * 1.4;
      trophyGroup.position.y = 45.6 + Math.sin(elapsedTotal * 2.5) * 0.18;

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

      // Eggy Party Dash / Dive forward burst!
      if (dashQueuedRef.current) {
        dashQueuedRef.current = false;
        if (dashCooldown <= 0 && !activeZipline && !climbingLadder) {
          dashCooldown = 1.5;
          dashTimer = 0.24;
          const dYaw = Math.hypot(moveX, moveZ) > 0.1 ? Math.atan2(moveX, moveZ) : facingYaw;
          facingYaw = dYaw;
          vx = Math.sin(dYaw) * 14.5;
          vz = Math.cos(dYaw) * 14.5;
          vy = Math.max(vy, 3.2);
          playArcadeSfx('boost');
          particles.emit(px, py + 0.4, pz, '#38BDF8', 12, 3.2, 1.8);
        }
      }

      if (activeZipline) {
        const totalDist = activeZipline.start.distanceTo(activeZipline.end);
        zipProgress += (activeZipline.speed * dt) / Math.max(1, totalDist);
        if (zipProgress >= 1) {
          _zipPos.copy(activeZipline.end);
          px = _zipPos.x;
          py = _zipPos.y - 1.5;
          pz = _zipPos.z;
          vy = 3.2;
          vz = -4.5;
          activeZipline.handleMesh.position.copy(activeZipline.start);
          activeZipline = null;
          zipCooldown = 0.9;
          jumpsLeft = 1;
        } else {
          _zipPos.lerpVectors(activeZipline.start, activeZipline.end, zipProgress);
          activeZipline.handleMesh.position.copy(_zipPos);
          _zipDir.subVectors(activeZipline.end, activeZipline.start).normalize();
          facingYaw = Math.atan2(_zipDir.x, _zipDir.z);
          px = _zipPos.x;
          py = _zipPos.y - 1.55;
          pz = _zipPos.z;
          vx = 0;
          vy = 0;
          vz = 0;
          if (Math.random() < 0.35) {
            particles.emit(_zipPos.x, _zipPos.y, _zipPos.z, '#38BDF8', 2, 1.5, 0.5);
          }
          if (jumpBufferTimer > 0) {
            jumpBufferTimer = 0;
            activeZipline.handleMesh.position.copy(activeZipline.start);
            activeZipline = null;
            zipCooldown = 0.9;
            vy = 10.2;
            jumpsLeft = 1;
            playArcadeSfx('jump');
          }
        }
      } else if (zipCooldown <= 0) {
        for (const zLine of ziplines) {
          if (
            Math.hypot(px - zLine.start.x, py + 1.15 - zLine.start.y, pz - zLine.start.z) < 2.0
          ) {
            activeZipline = zLine;
            zipProgress = 0;
            climbingLadder = null;
            grounded = false;
            playArcadeSfx('zipline');
            showBanner('Đu dây Zipline!', 1.2);
            break;
          }
        }
      }

      if (!activeZipline) {
        let nearLadder: LadderDef | null = null;
        for (const lad of ladders) {
          if (
            Math.abs(px - lad.x) <= lad.halfW &&
            Math.abs(pz - lad.z) <= 0.98 &&
            py >= lad.yMin - 0.35 &&
            py <= lad.yMax + 0.15
          ) {
            nearLadder = lad;
            break;
          }
        }

        if (nearLadder && (inY > 0.25 || climbingLadder === nearLadder)) {
          climbingLadder = nearLadder;
        } else if (!nearLadder) {
          climbingLadder = null;
        }

        if (climbingLadder) {
          grounded = false;
          jumpsLeft = 2;
          vx = (climbingLadder.x - px) * 8;
          pz = THREE.MathUtils.lerp(pz, climbingLadder.z + climbingLadder.faceZ * 0.42, 0.3);
          facingYaw = Math.PI;
          const climbSpd = 5.6;
          if (inY > 0.1) vy = climbSpd;
          else if (inY < -0.1) vy = -climbSpd;
          else vy = 0;
          py += vy * dt;

          if (py >= climbingLadder.yMax + 0.05) {
            py = climbingLadder.yMax + 0.12;
            pz -= 0.72;
            vy = 0;
            climbingLadder = null;
            grounded = true;
          } else if (py < climbingLadder.yMin && inY < 0) {
            py = climbingLadder.yMin;
            climbingLadder = null;
          } else if (jumpBufferTimer > 0) {
            jumpBufferTimer = 0;
            vy = 10.0;
            climbingLadder = null;
            jumpsLeft = 1;
            playArcadeSfx('jump');
          }
        } else {
          if (grounded && groundPlatform) {
            px += groundPlatform.dx;
            py += groundPlatform.dy;
            pz += groundPlatform.dz;
          }

          let inWind = false;
          for (const wz of windZones) {
            if (
              Math.abs(px - wz.x) <= wz.hw &&
              Math.abs(pz - wz.z) <= wz.hd &&
              py >= wz.y - 0.5 &&
              py <= wz.y + wz.hh
            ) {
              inWind = true;
              vx += wz.forceX * dt * 1.4;
              break;
            }
          }

          if (dashTimer <= 0) {
            const onIce = grounded && groundPlatform?.kind === 'ice';
            const accel = grounded ? (onIce ? 15 : 42) : 25;
            const drag = grounded ? (onIce ? 2.2 : 11.5) : 3.2;
            const maxSpeed = 7.2;

            vx += moveX * accel * dt;
            vz += moveZ * accel * dt;

            const damp = Math.exp(-drag * dt);
            if (Math.abs(moveX) < 0.05 && !inWind) vx *= damp;
            if (Math.abs(moveZ) < 0.05) vz *= damp;

            const hSpd = Math.hypot(vx, vz);
            const cap = inWind ? maxSpeed + 3.2 : maxSpeed;
            if (hSpd > cap) {
              const s = cap / hSpd;
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
              vy = 11.2;
              grounded = false;
              groundPlatform = null;
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
          pz += vz * dt;

          const playerR = 0.36;
          let landedOn: PlatformDef | null = null;
          let bestTopY = -Infinity;

          for (const p of platforms) {
            if (!p.solidNow) continue;
            const halfW = p.w / 2 + playerR * 0.65;
            const halfD = p.d / 2 + playerR * 0.65;
            if (Math.abs(px - p.curX) <= halfW && Math.abs(pz - p.curZ) <= halfD) {
              if (vy <= 0 && prevY >= p.curY - 0.35 && py <= p.curY + 0.14) {
                if (p.curY > bestTopY) {
                  bestTopY = p.curY;
                  landedOn = p;
                }
              }
            }
            if (p.h >= 2.2 && py < p.curY - 0.25 && py + 1.25 > p.curY - p.h) {
              const ex = p.w / 2 + playerR;
              const ez = p.d / 2 + playerR;
              const dx = px - p.curX;
              const dz = pz - p.curZ;
              if (Math.abs(dx) < ex && Math.abs(dz) < ez) {
                const ox = ex - Math.abs(dx);
                const oz = ez - Math.abs(dz);
                if (ox < oz) {
                  px += dx >= 0 ? ox : -ox;
                  vx = 0;
                } else {
                  pz += dz >= 0 ? oz : -oz;
                  vz = 0;
                }
              }
            }
          }

          if (landedOn) {
            py = landedOn.curY;
            vy = 0;
            grounded = true;
            groundPlatform = landedOn;
            jumpsLeft = 2;
            if (landedOn.kind === 'crumble' && landedOn.crumbleState === 'idle') {
              landedOn.crumbleState = 'shaking';
              landedOn.crumbleTimer = 0.65;
            }
          } else {
            grounded = false;
            groundPlatform = null;
          }

          for (const bp of bouncePads) {
            if (
              Math.hypot(px - bp.x, pz - bp.z) <= bp.r &&
              py >= bp.y - 0.25 &&
              py <= bp.y + 0.8 &&
              vy <= 1.5
            ) {
              vy = bp.power;
              grounded = false;
              groundPlatform = null;
              jumpsLeft = 1;
              bp.squish = 1;
              playArcadeSfx('bounce');
              particles.emit(
                bp.x,
                bp.y + 0.4,
                bp.z,
                bp.isSpring ? '#FACC15' : '#FB7185',
                14,
                4.2,
                4.5,
              );
            }
          }
        }
      }

      if (invulnTimer <= 0) {
        for (const sw of sweepers) {
          if (Math.abs(py - (sw.cy - 0.45)) < 1.05) {
            const ang = sw.pivot.rotation.y;
            const dirX = Math.cos(ang);
            const dirZ = -Math.sin(ang);
            const relX = px - sw.cx;
            const relZ = pz - sw.cz;
            const proj = relX * dirX + relZ * dirZ;
            if (Math.abs(proj) <= sw.len) {
              const perpDist = Math.abs(-relX * dirZ + relZ * dirX);
              if (perpDist < 0.55) {
                invulnTimer = 1.0;
                hearts = Math.max(0, hearts - 1);
                playArcadeSfx('hit');
                const pushSign = -relX * dirZ + relZ * dirX >= 0 ? 1 : -1;
                vx = -dirZ * pushSign * 9.5;
                vz = dirX * pushSign * 9.5;
                vy = 5.5;
                grounded = false;
                particles.emit(px, py + 0.6, pz, '#FB7185', 14, 4.5, 3.2);
                showBanner('Trúng thanh quét! (-1 Tim)', 1.1);
                if (hearts <= 0) respawnAtCheckpoint(false);
                break;
              }
            }
          }
        }
      }

      if (invulnTimer <= 0) {
        for (const sp of spikePatches) {
          if (
            Math.abs(px - sp.x) <= sp.hw + 0.2 &&
            Math.abs(pz - sp.z) <= sp.hd + 0.2 &&
            Math.abs(py - sp.y) < 0.48
          ) {
            invulnTimer = 1.1;
            hearts = Math.max(0, hearts - 1);
            vy = 7.4;
            grounded = false;
            playArcadeSfx('hit');
            particles.emit(px, py + 0.4, pz, '#F43F5E', 14, 4.2, 3.8);
            showBanner('Dính gai nhọn! (-1 Tim)', 1.1);
            if (hearts <= 0) respawnAtCheckpoint(false);
            break;
          }
        }
      }

      if (invulnTimer <= 0) {
        for (const orb of lightningOrbs) {
          if (Math.hypot(px - orb.curX, py + 0.65 - orb.curY, pz - orb.curZ) < 0.85) {
            invulnTimer = 1.1;
            hearts = Math.max(0, hearts - 1);
            vy = 6.2;
            vx = (px - orb.curX) * 6;
            vz = (pz - orb.curZ) * 6;
            grounded = false;
            playArcadeSfx('hit');
            particles.emit(px, py + 0.6, pz, '#38BDF8', 16, 4.8, 3.5);
            showBanner('Giật sét! (-1 Tim)', 1.1);
            if (hearts <= 0) respawnAtCheckpoint(false);
            break;
          }
        }
      }

      for (const s of stars) {
        if (s.collected) continue;
        if (Math.hypot(px - s.x, py + 0.7 - s.y, pz - s.z) < 1.25) {
          s.collected = true;
          s.mesh.visible = false;
          starsCollected += 1;
          playArcadeSfx('star');
          particles.emit(s.x, s.y, s.z, '#FDE047', 16, 4.5, 4.2);
          showBanner(`★ +1 Sao (${starsCollected}/${TOTAL_STARS})`, 1.0);
        }
      }

      for (const cp of checkpoints) {
        if (activatedCheckpoints.has(cp.index)) continue;
        if (Math.hypot(px - cp.x, pz - cp.z) < 2.35 && Math.abs(py - cp.y) < 1.8) {
          activatedCheckpoints.add(cp.index);
          highestCheckpointIdx = Math.max(highestCheckpointIdx, cp.index);
          checkpointPos.set(cp.x, cp.y + 0.25, cp.z);
          (cp.flagMesh.material as THREE.MeshStandardMaterial).color.set('#34D399');
          (cp.flagMesh.material as THREE.MeshStandardMaterial).emissive.set('#10B981');
          (cp.ringMesh.material as THREE.MeshStandardMaterial).color.set('#34D399');
          playArcadeSfx('checkpoint');
          particles.emit(cp.x, cp.y + 1.2, cp.z, '#34D399', 20, 4.5, 4.8);
          showBanner(`✓ Checkpoint ${cp.index}: ${cp.label}`, 1.8);
        }
      }

      if (Math.hypot(px - 0, pz - (FINISH_Z - 1.5)) < 2.2 && py >= 43.2) {
        gameStatusRef.current = 'won';
        const reward = 12 + Math.floor(starsCollected * 0.5);
        if (!rewardPaid) {
          rewardPaid = true;
          onEarnRef.current(reward);
        }
        playArcadeSfx('win');
        particles.emit(0, 46.2, FINISH_Z - 1.5, '#FDE047', 34, 6.2, 6.5);
        particles.emit(0, 46.2, FINISH_Z - 1.5, '#38BDF8', 24, 5.4, 5.5);
        setHud({
          hearts,
          maxHearts: MAX_HEARTS,
          stars: starsCollected,
          totalStars: TOTAL_STARS,
          checkpointIdx: checkpoints.length,
          totalCheckpoints: checkpoints.length,
          zoneName: '7. Đền Hoàng Kim',
          progressPct: 100,
          elapsedSec: Math.round(playTimeSec),
          bannerText: `CHIẾN THẮNG! +${reward} CG`,
          status: 'won',
          rewardEarned: reward,
          climbing: false,
          ziplining: false,
          windActive: false,
          dashReady: true,
        });
        return;
      }

      if (py < Math.max(-7, checkpointPos.y - 11.5)) {
        respawnAtCheckpoint(true);
      }

      playerRig.root.position.set(px, py, pz);
      playerRig.root.rotation.y = facingYaw;
      playerRig.root.visible =
        invulnTimer <= 0 || Math.floor(elapsedTotal * 16) % 2 === 0;

      const horizSpeed = Math.hypot(vx, vz);
      if (activeZipline) {
        updateAvatarRigAnimation(playerRig, 'jump', elapsedTotal, true);
        playerRig.leftArm.rotation.x = -2.75;
        playerRig.rightArm.rotation.x = -2.75;
      } else if (climbingLadder) {
        updateAvatarRigAnimation(playerRig, 'idle', elapsedTotal, false);
        const climbWave = Math.sin(py * 4.8);
        playerRig.leftArm.rotation.x = -2.1 + climbWave * 0.65;
        playerRig.rightArm.rotation.x = -2.1 - climbWave * 0.65;
        playerRig.leftLeg.rotation.x = -climbWave * 0.45;
        playerRig.rightLeg.rotation.x = climbWave * 0.45;
      } else if (dashTimer > 0) {
        updateAvatarRigAnimation(playerRig, 'jump', elapsedTotal * 1.4, true);
      } else if (!grounded) {
        updateAvatarRigAnimation(playerRig, 'jump', elapsedTotal, false);
      } else if (horizSpeed > 0.45) {
        updateAvatarRigAnimation(playerRig, 'walk', elapsedTotal * 1.18, false);
      } else {
        updateAvatarRigAnimation(playerRig, 'idle', elapsedTotal, false);
      }

      let surfY = -999;
      for (const p of platforms) {
        if (!p.solidNow) continue;
        if (
          Math.abs(px - p.curX) <= p.w / 2 + 0.15 &&
          Math.abs(pz - p.curZ) <= p.d / 2 + 0.15 &&
          p.curY <= py + 0.35 &&
          p.curY > surfY
        ) {
          surfY = p.curY;
        }
      }
      if (surfY > -900) {
        const gap = Math.max(0, py - surfY);
        const scale = THREE.MathUtils.clamp(1 - gap * 0.08, 0.38, 1);
        const alpha = THREE.MathUtils.clamp(0.5 - gap * 0.055, 0.15, 0.5);
        dropShadowDisc.visible = true;
        dropShadowRing.visible = !grounded;
        dropShadowDisc.position.set(px, surfY + 0.025, pz);
        dropShadowDisc.scale.setScalar(scale);
        (dropShadowDisc.material as THREE.MeshBasicMaterial).opacity = alpha;
        dropShadowRing.position.set(px, surfY + 0.03, pz);
        dropShadowRing.scale.setScalar(scale);
      } else {
        dropShadowDisc.visible = false;
        dropShadowRing.visible = false;
      }

      particles.update(dt);
      sun.position.set(px + 18, py + 32, pz + 16);
      sun.target.position.set(px, py, pz);
      sun.target.updateMatrixWorld();

      hudSyncAccum += dt;
      if (hudSyncAccum >= 0.1) {
        hudSyncAccum = 0;
        const pct = Math.min(
          99,
          Math.max(0, Math.round((Math.max(0, -pz) / Math.abs(FINISH_Z)) * 100)),
        );
        const inWindNow = windZones.some(
          (wz) =>
            Math.abs(px - wz.x) <= wz.hw &&
            Math.abs(pz - wz.z) <= wz.hd &&
            py >= wz.y - 0.5 &&
            py <= wz.y + wz.hh,
        );
        setHud((prev) => ({
          ...prev,
          hearts,
          stars: starsCollected,
          checkpointIdx: highestCheckpointIdx,
          zoneName: getZoneName(pz),
          progressPct: pct,
          elapsedSec: Math.round(playTimeSec),
          bannerText: bannerMsg,
          climbing: Boolean(climbingLadder),
          ziplining: Boolean(activeZipline),
          windActive: inWindNow,
          dashReady: dashCooldown <= 0,
        }));
      }
    };

    const updateCamera = (dt: number) => {
      // Eggy-Party panoramic chase camera showing avatar + road ahead + clouds
      const camDist = 9.4;
      const horiz = Math.cos(camPitch) * camDist;
      const vert = Math.sin(camPitch) * camDist + 1.85;
      const desiredX = px + Math.sin(camYaw) * horiz;
      const desiredY = py + vert;
      const desiredZ = pz + Math.cos(camYaw) * horiz;

      const lerpAlpha = Math.min(1, dt * 8.5);
      camera.position.x = THREE.MathUtils.lerp(camera.position.x, desiredX, lerpAlpha);
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, desiredY, lerpAlpha);
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, desiredZ, lerpAlpha);

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

    camera.position.set(0, 4.4, 10.6);
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
    <div className="relative h-full w-full overflow-hidden bg-[#0EA5E9] select-none">
      {/* Full-Viewport 3D Canvas */}
      <div ref={mountRef} className="h-full w-full cursor-grab active:cursor-grabbing" />

      {/* Eggy-Party Top Floating HUD Overlay (Zero-Scroll) */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-2 p-2.5 sm:p-3.5">
        {/* Top-Left Status Pill */}
        <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-white/30 bg-[#0F172A]/72 px-2.5 py-1.5 text-xs font-black text-white shadow-lg">
          <div className="flex items-center gap-0.5">
            {Array.from({length: hud.maxHearts}).map((_, i) => (
              <Heart
                key={i}
                className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${
                  i < hud.hearts
                    ? 'fill-[#FB7185] text-[#F43F5E]'
                    : 'fill-white/15 text-white/25'
                }`}
              />
            ))}
          </div>
          <span className="flex items-center gap-1 rounded-lg bg-[#FACC15]/20 px-1.5 py-0.5 text-[#FDE047] tabular-nums">
            <Star className="h-3.5 w-3.5 fill-[#FDE047]" />
            {hud.stars}/{hud.totalStars}
          </span>
          <span className="hidden items-center gap-1 rounded-lg bg-emerald-500/25 px-1.5 py-0.5 text-emerald-300 tabular-nums sm:flex">
            <Flag className="h-3 w-3" />
            {hud.checkpointIdx}/{hud.totalCheckpoints}
          </span>
        </div>

        {/* Top-Center Progress Pill */}
        <div className="flex min-w-[155px] flex-col items-center rounded-2xl border border-white/30 bg-[#0F172A]/72 px-3 py-1.5 text-white shadow-lg">
          <div className="flex w-full items-center justify-between gap-3 text-[11px] font-black">
            <span className="truncate text-[#7DD3FC]">{hud.zoneName}</span>
            <span className="flex items-center gap-1 tabular-nums text-white/90">
              <Timer className="h-3 w-3" />
              {formatSec(hud.elapsedSec)}
            </span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#34D399] via-[#38BDF8] to-[#FACC15] transition-all duration-200"
              style={{width: `${hud.progressPct}%`}}
            />
          </div>
        </div>

        {/* Top-Right Compact Action Controls */}
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
            <Compass className="h-4 w-4 text-[#7DD3FC]" />
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

      {/* Dynamic Event Toast Banner */}
      {hud.bannerText && (
        <div className="pointer-events-none absolute top-16 left-1/2 -translate-x-1/2 rounded-xl border border-white/35 bg-[#0F172A]/82 px-3.5 py-1 text-center text-xs font-black text-white shadow-lg">
          {hud.bannerText}
        </div>
      )}

      {/* Active Mechanic Chips */}
      {(hud.climbing || hud.ziplining || hud.windActive) && (
        <div className="pointer-events-none absolute top-16 left-3 flex flex-col gap-1">
          {hud.climbing && (
            <span className="rounded-lg bg-amber-600/90 px-2.5 py-1 text-[11px] font-black text-white shadow">
              Leo thang dây (W / ↑)
            </span>
          )}
          {hud.ziplining && (
            <span className="rounded-lg bg-sky-600/90 px-2.5 py-1 text-[11px] font-black text-white shadow">
              Đang đu Zipline!
            </span>
          )}
          {hud.windActive && (
            <span className="flex items-center gap-1 rounded-lg bg-cyan-700/90 px-2.5 py-1 text-[11px] font-black text-white shadow">
              <Wind className="h-3.5 w-3.5" /> Gió thổi ngang
            </span>
          )}
        </div>
      )}

      {/* Subtle Bottom Hint Only Before First Move */}
      {hud.status === 'ready' && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-xl bg-[#0F172A]/68 px-3 py-1 text-center text-[11px] font-bold text-white/95 shadow">
          <span className="text-[#7DD3FC]">WASD/Cần gạt</span> chạy ·{' '}
          <span className="text-[#FDE047]">Space (×2)</span> Nhảy ·{' '}
          <span className="text-[#38BDF8]">Shift</span> Lướt
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
              className="h-10 w-10 rounded-full border-2 border-white bg-[#38BDF8]/90 shadow-md sm:h-11 sm:w-11"
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

      {/* Win / Loss Overlay */}
      {(hud.status === 'won' || hud.status === 'lost') && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0F172A]/72 p-4">
          <div className="w-full max-w-sm rounded-3xl border-2 border-[#FACC15] bg-[#1E293B] p-5 text-center text-white shadow-2xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FACC15]/20 text-[#FDE047]">
              {hud.status === 'won' ? (
                <Trophy className="h-7 w-7" />
              ) : (
                <Heart className="h-7 w-7 text-[#FB7185]" />
              )}
            </div>
            <h3 className="mt-2.5 text-lg font-black">
              {hud.status === 'won' ? 'Chinh Phục Đỉnh Mây!' : 'Hết Mạng Rồi!'}
            </h3>
            <p className="mt-1 text-xs font-semibold text-[#CBD5E1]">
              Thời gian: <strong className="text-white">{formatSec(hud.elapsedSec)}</strong> · Sao:{' '}
              <strong className="text-[#FDE047]">
                {hud.stars}/{hud.totalStars}
              </strong>
            </p>
            <div className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-[#0F172A] py-2 text-sm font-black text-[#38BDF8]">
              <Sparkles className="h-4 w-4 text-[#FDE047]" />
              <span>+{hud.rewardEarned} CoinGame</span>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={handleRestart}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-[#38BDF8] py-2.5 text-xs font-black text-[#082F49] transition active:scale-95"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Chơi Lại</span>
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
