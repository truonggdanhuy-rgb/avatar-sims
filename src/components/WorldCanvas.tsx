import React, {useEffect, useRef, useState} from 'react';
import {
  Armchair,
  Check,
  DoorClosed,
  DoorOpen,
  Move,
  PackageMinus,
  RotateCw,
} from 'lucide-react';
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {FURNITURE_BY_ID} from '../data/furnitureCatalog';
import {AvatarRig, buildAvatarRig, updateAvatarRigAnimation} from '../three/avatar3d';
import {
  buildSubzoneScene,
  HouseDoorHandle,
  HouseWallSurface,
  SubzoneWorld,
} from '../three/subzonesBuilder';
import {
  buildTownScene,
  getTownGroundHeight,
  TOWN_ZONE_ENTRANCES,
  TownAnchor,
  TownWorld,
  WorldCollider,
} from '../three/townBuilder';
import {
  AvatarConfig,
  AvatarPose,
  CropType,
  GameStats,
  GardenPlotState,
  PlacedFurniture,
  TimeOfDay,
  ZoneId,
} from '../types/game';
import {soundFX} from '../utils/sound';

interface WorldCanvasProps {
  zone: ZoneId;
  avatar: AvatarConfig;
  stats: GameStats;
  timeOfDay: TimeOfDay;
  plots: GardenPlotState[];
  placedFurniture: PlacedFurniture[];
  editFurnitureMode: boolean;
  selectedFurnitureId: string | null;
  homeSpotRef: React.MutableRefObject<{x: number; z: number}>;
  onChangeZone: (next: ZoneId) => void;
  onOpenWardrobe: () => void;
  onOpenShop: () => void;
  onOpenSettings: () => void;
  onOpenDailyQuests: () => void;
  onOpenFurniture: () => void;
  onToggleEditFurniture: () => void;
  onSelectFurniture: (id: string | null) => void;
  onMoveFurniture: (id: string, x: number, z: number, rotY?: number) => void;
  onRotateFurniture: (id: string) => void;
  onStowFurniture: (id: string) => void;
  onFishCaught: () => void;
  onRestoreEnergy: () => void;
  onBoostMood: () => void;
  onUpdatePlot: (plotId: number, next: GardenPlotState) => void;
  onAddCoins: (amount: number) => void;
}

interface ProjectedTag {
  id: string;
  label: string;
  x: number;
  y: number;
}

interface BubbleState {
  text: string;
  worldPos: THREE.Vector3;
}

interface SeatTarget {
  seatX: number;
  seatZ: number;
  seatY: number;
  rotY: number;
  standX: number;
  standZ: number;
  isBed?: boolean;
}

const CROP_CYCLE: CropType[] = ['strawberry', 'sunflower', 'carrot'];
const CROP_LABELS: Record<CropType, string> = {
  strawberry: 'Dâu Tây',
  sunflower: 'Hướng Dương',
  carrot: 'Cà Rốt',
};
const FISH_LIST = [
  {name: 'Cá Chép Vàng', coins: 20},
  {name: 'Cá Bảy Màu', coins: 15},
  {name: 'Cá Ngựa Sao', coins: 35},
  {name: 'Cá Rồng Nhí', coins: 45},
];

const PLAYER_RADIUS = 0.34;

// Reusable math objects (zero allocations in render loop)
const _projVec = new THREE.Vector3();
const _camPosTarget = new THREE.Vector3();
const _camLookTarget = new THREE.Vector3();
const _bgColorTarget = new THREE.Color();
const _sunColorTarget = new THREE.Color();

function getResponsiveCameraSettings(zone: ZoneId, aspect: number) {
  const isPortrait = aspect < 0.82;
  const isSquare = aspect >= 0.82 && aspect < 1.15;
  const fov = isPortrait ? 45 : isSquare ? 40 : 36;

  if (zone === 'town') {
    if (isPortrait) {
      return {fov, pos: [0, 18.8, 29.6] as const, look: [0, 0.9, 0] as const};
    }
    if (isSquare) {
      return {fov, pos: [0, 17.5, 27.5] as const, look: [0, 0.9, 0] as const};
    }
    return {fov, pos: [0, 16.5, 25.5] as const, look: [0, 0.9, 0] as const};
  }

  if (zone === 'home') {
    if (isPortrait) {
      return {fov, pos: [-1.8, 14.2, 19.8] as const, look: [-1.8, 0.7, 0.8] as const};
    }
    if (isSquare) {
      return {fov, pos: [-1.8, 13.4, 18.4] as const, look: [-1.8, 0.7, 0.4] as const};
    }
    return {fov, pos: [-1.8, 12.6, 17.2] as const, look: [-1.8, 0.7, 0.2] as const};
  }

  if (isPortrait) {
    return {fov, pos: [0, 6.8, 10.6] as const, look: [0, 0.75, -0.35] as const};
  }
  return {fov, pos: [0, 6.3, 9.5] as const, look: [0, 0.75, -0.35] as const};
}

function getZoneWalkBounds(zone: ZoneId) {
  if (zone === 'town') {
    return {minX: -29.5, maxX: 29.5, minZ: -31.5, maxZ: 27.5};
  }
  if (zone === 'home') {
    return {minX: -12.85, maxX: 9.85, minZ: -8.95, maxZ: 6.95};
  }
  return {minX: -3.45, maxX: 3.45, minZ: -4.05, maxZ: 4.05};
}

function snapPointToNearestWall(
  px: number,
  pz: number,
  catHalfW: number,
  cameraPos: THREE.Vector3,
  surfaces: HouseWallSurface[],
): {x: number; z: number; rotY: number} | null {
  const upSurfaces = surfaces.filter((s) => s.isUp());
  const candidates = upSurfaces.length > 0 ? upSurfaces : surfaces;
  if (candidates.length === 0) return null;

  let best: HouseWallSurface | null = null;
  let bestSpan = 0;
  let bestDist = Infinity;

  for (const w of candidates) {
    const pad = Math.min(catHalfW * 0.5, (w.maxSpan - w.minSpan) * 0.35);
    const rawSpan = w.axis === 'z' ? px : pz;
    const clampedSpan = THREE.MathUtils.clamp(rawSpan, w.minSpan + pad, w.maxSpan - pad);
    const wx = w.axis === 'z' ? clampedSpan : w.pos;
    const wz = w.axis === 'z' ? w.pos : clampedSpan;
    const dist = Math.hypot(px - wx, pz - wz);
    if (dist < bestDist) {
      bestDist = dist;
      best = w;
      bestSpan = clampedSpan;
    }
  }

  if (!best) return null;
  const side =
    best.outerSide !== undefined
      ? -best.outerSide
      : best.axis === 'z'
        ? cameraPos.z >= best.pos
          ? 1
          : -1
        : cameraPos.x >= best.pos
          ? 1
          : -1;
  const offset = best.thickness / 2 + 0.03;

  if (best.axis === 'z') {
    return {
      x: bestSpan,
      z: best.pos + side * offset,
      rotY: side > 0 ? 0 : Math.PI,
    };
  }
  return {
    x: best.pos + side * offset,
    z: bestSpan,
    rotY: side > 0 ? Math.PI / 2 : -Math.PI / 2,
  };
}

function resolvePointAgainstColliders(
  px: number,
  pz: number,
  colliders: WorldCollider[],
  radius = PLAYER_RADIUS,
): {x: number; z: number; collided: boolean} {
  let x = px;
  let z = pz;
  let collided = false;

  for (let pass = 0; pass < 2; pass++) {
    for (const col of colliders) {
      if (col.type === 'circle') {
        const dx = x - col.x;
        const dz = z - col.z;
        const minDist = col.r + radius;
        const dSq = dx * dx + dz * dz;
        if (dSq < minDist * minDist) {
          collided = true;
          const d = Math.sqrt(dSq);
          if (d < 0.0001) {
            z = col.z + minDist;
          } else {
            const push = minDist - d;
            x += (dx / d) * push;
            z += (dz / d) * push;
          }
        }
      } else {
        const rot = col.rotY || 0;
        const cos = Math.cos(rot);
        const sin = Math.sin(rot);
        const dx = x - col.x;
        const dz = z - col.z;

        // Transform world offset into box local coordinates
        const lx = dx * cos - dz * sin;
        const lz = dx * sin + dz * cos;

        const cx = THREE.MathUtils.clamp(lx, -col.hw, col.hw);
        const cz = THREE.MathUtils.clamp(lz, -col.hd, col.hd);
        const vx = lx - cx;
        const vz = lz - cz;
        const dSq = vx * vx + vz * vz;

        let nlx = lx;
        let nlz = lz;
        let hitBox = false;

        if (dSq > 0.000001 && dSq < radius * radius) {
          hitBox = true;
          const d = Math.sqrt(dSq);
          const push = radius - d;
          nlx = lx + (vx / d) * push;
          nlz = lz + (vz / d) * push;
        } else if (dSq <= 0.000001) {
          hitBox = true;
          const penX = col.hw + radius - Math.abs(lx);
          const penZ = col.hd + radius - Math.abs(lz);
          if (penX < penZ) {
            nlx = lx >= 0 ? col.hw + radius : -(col.hw + radius);
          } else {
            nlz = lz >= 0 ? col.hd + radius : -(col.hd + radius);
          }
        }

        if (hitBox) {
          collided = true;
          x = col.x + nlx * cos + nlz * sin;
          z = col.z - nlx * sin + nlz * cos;
        }
      }
    }
  }

  return {x, z, collided};
}

export const WorldCanvas: React.FC<WorldCanvasProps> = ({
  zone,
  avatar,
  stats,
  timeOfDay,
  plots,
  placedFurniture,
  editFurnitureMode,
  selectedFurnitureId,
  homeSpotRef,
  onChangeZone,
  onOpenWardrobe,
  onOpenShop,
  onOpenSettings,
  onOpenDailyQuests,
  onOpenFurniture,
  onToggleEditFurniture,
  onSelectFurniture,
  onMoveFurniture,
  onRotateFurniture,
  onStowFurniture,
  onFishCaught,
  onRestoreEnergy,
  onBoostMood,
  onUpdatePlot,
  onAddCoins,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const labelLayerRef = useRef<HTMLDivElement | null>(null);

  const [tags, setTags] = useState<ProjectedTag[]>([]);
  const [speechBubble, setSpeechBubble] = useState<{text: string; x: number; y: number} | null>(null);
  const [fishingState, setFishingState] = useState<'idle' | 'waiting' | 'bite'>('idle');
  const [miniActive, setMiniActive] = useState(false);
  const [miniScore, setMiniScore] = useState(0);
  const [starPos, setStarPos] = useState({x: 50, y: 50});
  const [nearbyDoor, setNearbyDoor] = useState<{id: string; label: string; isOpen: boolean} | null>(
    null,
  );
  const [webglError, setWebglError] = useState(false);

  const stateRef = useRef({
    zone,
    avatar,
    stats,
    timeOfDay,
    plots,
    fishingState,
    placedFurniture,
    editFurnitureMode,
    selectedFurnitureId,
  });
  stateRef.current = {
    zone,
    avatar,
    stats,
    timeOfDay,
    plots,
    fishingState,
    placedFurniture,
    editFurnitureMode,
    selectedFurnitureId,
  };

  const callbacksRef = useRef({
    onChangeZone,
    onOpenWardrobe,
    onOpenShop,
    onOpenSettings,
    onOpenDailyQuests,
    onOpenFurniture,
    onToggleEditFurniture,
    onSelectFurniture,
    onMoveFurniture,
    onRotateFurniture,
    onStowFurniture,
    onFishCaught,
    onRestoreEnergy,
    onBoostMood,
    onUpdatePlot,
    onAddCoins,
  });
  callbacksRef.current = {
    onChangeZone,
    onOpenWardrobe,
    onOpenShop,
    onOpenSettings,
    onOpenDailyQuests,
    onOpenFurniture,
    onToggleEditFurniture,
    onSelectFurniture,
    onMoveFurniture,
    onRotateFurniture,
    onStowFurniture,
    onFishCaught,
    onRestoreEnergy,
    onBoostMood,
    onUpdatePlot,
    onAddCoins,
  };

  const rebuildSceneTriggerRef = useRef<(() => void) | null>(null);
  const rebuildAvatarTriggerRef = useRef<((cfg: AvatarConfig) => void) | null>(null);
  const playerBubbleRef = useRef<BubbleState | null>(null);
  const bubbleTimerRef = useRef<number | null>(null);
  const fishTimerRef = useRef<number | null>(null);
  const openDoorsRef = useRef<Record<string, boolean>>({});
  const activeDoorsRef = useRef<HouseDoorHandle[]>([]);
  const nearbyDoorKeyRef = useRef<string>('');

  const showBubble = (text: string, x: number, y: number, z: number) => {
    if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
    playerBubbleRef.current = {text, worldPos: new THREE.Vector3(x, y, z)};
    bubbleTimerRef.current = window.setTimeout(() => {
      playerBubbleRef.current = null;
      setSpeechBubble(null);
    }, 2600);
  };

  useEffect(() => {
    if (zone !== 'home') {
      openDoorsRef.current = {};
      activeDoorsRef.current = [];
      nearbyDoorKeyRef.current = '';
      setNearbyDoor(null);
    }
  }, [zone]);

  useEffect(() => {
    rebuildSceneTriggerRef.current?.();
  }, [zone, plots, fishingState, placedFurniture]);

  useEffect(() => {
    rebuildAvatarTriggerRef.current?.(avatar);
  }, [avatar]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglError(true);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = false;

    const width = container.clientWidth || window.innerWidth || 800;
    const height = container.clientHeight || window.innerHeight || 600;
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#BFE6F7');
    scene.fog = new THREE.FogExp2('#BFE6F7', 0.0056);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmrem.dispose();

    const initCam = getResponsiveCameraSettings(stateRef.current.zone, width / height);
    const camera = new THREE.PerspectiveCamera(initCam.fov, width / height, 0.4, 190);
    camera.position.set(initCam.pos[0], initCam.pos[1], initCam.pos[2]);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(initCam.look[0], initCam.look[1], initCam.look[2]);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.enableRotate = true;
    controls.enableZoom = true;
    controls.enablePan = true;
    controls.rotateSpeed = 0.78;
    controls.zoomSpeed = 0.9;
    controls.minDistance = 4.8;
    controls.maxDistance = 68;
    controls.minPolarAngle = Math.PI * 0.14;
    controls.maxPolarAngle = Math.PI * 0.46;
    controls.update();

    let cameraTransitionActive = false;
    const onControlsStart = () => {
      cameraTransitionActive = false;
    };
    controls.addEventListener('start', onControlsStart);

    // 3-Point Studio Outdoor Lighting Rig
    const hemiLight = new THREE.HemisphereLight('#E6F5FF', '#8FA876', 0.88);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight('#FFF3DA', 1.45);
    sunLight.position.set(16, 25, 18);
    sunLight.castShadow = false;
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight('#B8DCFF', 0.42);
    rimLight.position.set(-10, 8, -12);
    scene.add(rimLight);

    // Player Avatar State & Rig
    const playerPos = {x: 0, z: 3.4, rotY: 0, pose: 'idle' as AvatarPose};
    let activeTarget: {
      x: number;
      z: number;
      arrivePose: AvatarPose;
      seat?: SeatTarget;
      onArrive?: () => void;
    } | null = null;
    let activeSeat: SeatTarget | null = null;
    let stallTimer = 0;
    let prevDistToTarget = Infinity;

    let playerRig: AvatarRig = buildAvatarRig(stateRef.current.avatar);
    playerRig.root.position.set(playerPos.x, 0.14, playerPos.z);
    scene.add(playerRig.root);

    const playerProxy = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 1.85, 0.95),
      new THREE.MeshBasicMaterial({visible: false}),
    );
    playerProxy.position.y = 0.9;
    playerProxy.userData = {kind: 'player'};
    playerRig.root.add(playerProxy);

    let activeTown: TownWorld | null = null;
    let activeSubzone: SubzoneWorld | null = null;
    let activeZoneLoaded: ZoneId | null = null;
    let currentAnchors: TownAnchor[] = [];
    let currentClickTargets: THREE.Object3D[] = [];
    let currentColliders: WorldCollider[] = [];
    let currentPlazaRadius = 6.8;
    let currentGrounds: THREE.Object3D[] = [];
    let currentWallSurfaces: HouseWallSurface[] = [];
    let prevGroundY = 0.14;

    const selectionRing = new THREE.Mesh(
      new THREE.RingGeometry(0.76, 0.96, 32),
      new THREE.MeshBasicMaterial({
        color: '#FFD166',
        transparent: true,
        opacity: 0.92,
        side: THREE.DoubleSide,
      }),
    );
    selectionRing.rotation.x = -Math.PI / 2;
    selectionRing.position.y = 0.03;
    selectionRing.visible = false;
    scene.add(selectionRing);

    const loadCurrentWorld = () => {
      const {zone: z, plots: pl, fishingState: fs, placedFurniture: pf} = stateRef.current;

      if (activeTown) {
        scene.remove(activeTown.group);
        activeTown.dispose();
        activeTown = null;
      }
      if (activeSubzone) {
        scene.remove(activeSubzone.group);
        activeSubzone.dispose();
        activeSubzone = null;
      }

      if (z === 'town') {
        activeTown = buildTownScene();
        scene.add(activeTown.group);
        currentAnchors = activeTown.labelAnchors;
        currentClickTargets = [...activeTown.clickTargets, playerProxy];
        currentColliders = activeTown.colliders;
        currentPlazaRadius = activeTown.plazaRadius;
        currentGrounds = activeTown.groundMeshes;
        activeDoorsRef.current = [];
        currentWallSurfaces = [];
        if (activeZoneLoaded !== 'town') {
          activeTarget = null;
          activeSeat = null;
          if (activeZoneLoaded !== null) {
            const exitSpawn = TOWN_ZONE_ENTRANCES[activeZoneLoaded];
            playerPos.x = exitSpawn.tx;
            playerPos.z = exitSpawn.tz;
            playerPos.rotY = exitSpawn.exitRotY;
          } else {
            playerPos.x = 0;
            playerPos.z = 3.6;
            playerPos.rotY = 0;
          }
          playerPos.pose = 'idle';
          const spawnY = getTownGroundHeight(playerPos.x, playerPos.z, currentPlazaRadius);
          prevGroundY = spawnY;
          playerRig.root.position.set(playerPos.x, spawnY, playerPos.z);
          playerRig.root.rotation.y = playerPos.rotY;
          cameraTransitionActive = true;
        }
      } else {
        activeSubzone = buildSubzoneScene(z, {
          plots: pl,
          fishingState: fs,
          placedFurniture: z === 'home' ? pf : undefined,
          openDoors: z === 'home' ? openDoorsRef.current : undefined,
        });
        scene.add(activeSubzone.group);
        currentAnchors = activeSubzone.labelAnchors;
        currentClickTargets = [...activeSubzone.clickTargets, playerProxy];
        currentColliders = activeSubzone.colliders;
        currentGrounds = [activeSubzone.groundMesh];
        activeDoorsRef.current = activeSubzone.doors ?? [];
        currentWallSurfaces = activeSubzone.wallSurfaces ?? [];
        if (activeZoneLoaded !== z) {
          activeTarget = null;
          activeSeat = null;
          if (z === 'home') {
            playerPos.x = -1.8;
            playerPos.z = 5.2;
            playerPos.rotY = Math.PI;
            homeSpotRef.current = {x: -1.8, z: 5.2};
          } else {
            playerPos.x = 0;
            playerPos.z = 2.6;
            playerPos.rotY = 0;
          }
          playerPos.pose = 'idle';
          prevGroundY = 0;
          playerRig.root.position.set(playerPos.x, 0, playerPos.z);
          playerRig.root.rotation.y = playerPos.rotY;
          cameraTransitionActive = true;
        }
      }
      activeZoneLoaded = z;
    };

    rebuildSceneTriggerRef.current = loadCurrentWorld;
    rebuildAvatarTriggerRef.current = (cfg: AvatarConfig) => {
      scene.remove(playerRig.root);
      playerRig.root.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          m.geometry.dispose();
          if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
          else m.material.dispose();
        }
      });
      playerRig = buildAvatarRig(cfg);
      const curY =
        stateRef.current.zone === 'town'
          ? getTownGroundHeight(playerPos.x, playerPos.z, currentPlazaRadius)
          : 0;
      playerRig.root.position.set(playerPos.x, curY, playerPos.z);
      playerRig.root.rotation.y = playerPos.rotY;
      playerRig.root.add(playerProxy);
      scene.add(playerRig.root);
    };

    loadCurrentWorld();

    const releaseSeatIfNeeded = () => {
      if (activeSeat) {
        playerPos.x = activeSeat.standX;
        playerPos.z = activeSeat.standZ;
        activeSeat = null;
      }
    };

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const handlePointerTap = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);

      // 0. House Edit Mode: select furniture or move selected furniture (with wall snap for wall-mounted items)
      if (stateRef.current.zone === 'home' && stateRef.current.editFurnitureMode) {
        const hits = raycaster.intersectObjects(currentClickTargets, true);
        let firstWallHitPoint: THREE.Vector3 | null = null;
        for (const h of hits) {
          let obj: THREE.Object3D | null = h.object;
          while (obj && (!obj.userData || !obj.userData.kind)) {
            obj = obj.parent;
          }
          if (obj && obj.userData.furnitureId) {
            soundFX.tap();
            callbacksRef.current.onSelectFurniture(obj.userData.furnitureId as string);
            return;
          }
          if (!firstWallHitPoint && obj && obj.userData.kind === 'house_wall') {
            firstWallHitPoint = h.point;
          }
        }

        const selId = stateRef.current.selectedFurnitureId;
        if (selId) {
          const selPlaced = stateRef.current.placedFurniture.find((p) => p.instanceId === selId);
          const selCat = selPlaced ? FURNITURE_BY_ID[selPlaced.catalogId] : null;
          if (selCat?.wallMount) {
            let refPt = firstWallHitPoint;
            if (!refPt && currentGrounds.length > 0) {
              const groundHits = raycaster.intersectObjects(currentGrounds, false);
              if (groundHits.length > 0) refPt = groundHits[0].point;
            }
            if (refPt) {
              const snapped = snapPointToNearestWall(
                refPt.x,
                refPt.z,
                selCat.halfW,
                camera.position,
                currentWallSurfaces,
              );
              if (snapped) {
                soundFX.tap();
                callbacksRef.current.onMoveFurniture(selId, snapped.x, snapped.z, snapped.rotY);
              }
            }
          } else if (currentGrounds.length > 0) {
            const groundHits = raycaster.intersectObjects(currentGrounds, false);
            if (groundHits.length > 0) {
              const pt = groundHits[0].point;
              soundFX.tap();
              callbacksRef.current.onMoveFurniture(selId, pt.x, pt.z);
            }
          }
        }
        return;
      }

      // 1. Check interactive buildings/objects/NPCs/player
      const hits = raycaster.intersectObjects(currentClickTargets, true);
      if (hits.length > 0) {
        let obj: THREE.Object3D | null = hits[0].object;
        while (obj && (!obj.userData || !obj.userData.kind)) {
          obj = obj.parent;
        }
        if (obj && obj.userData.kind) {
          const data = obj.userData;
          const kind = data.kind as string;

          if (kind === 'player') {
            soundFX.sparkle();
            const s = stateRef.current.stats;
            showBubble(
              `${s.coins} Xu · Năng lượng ${s.energy}% · Vui vẻ ${s.mood}%`,
              playerPos.x,
              playerRig.root.position.y + 2.05,
              playerPos.z,
            );
            return;
          }

          releaseSeatIfNeeded();
          stallTimer = 0;
          prevDistToTarget = Infinity;

          if (kind === 'bench') {
            soundFX.tap();
            const seatInfo: SeatTarget = {
              seatX: data.seatX as number,
              seatZ: data.seatZ as number,
              seatY: (data.seatY as number) || 0.52,
              rotY: (data.sitRotY as number) ?? 0,
              standX: data.tx as number,
              standZ: data.tz as number,
            };
            activeTarget = {
              x: data.tx as number,
              z: data.tz as number,
              arrivePose: 'sit',
              seat: seatInfo,
              onArrive: () => soundFX.sparkle(),
            };
            return;
          }

          if (kind === 'zone') {
            soundFX.tap();
            activeTarget = {
              x: data.tx as number,
              z: data.tz as number,
              arrivePose: 'idle',
              onArrive: () => {
                soundFX.enterDoor();
                callbacksRef.current.onChangeZone(data.zone as ZoneId);
              },
            };
            return;
          }

          if (kind === 'settings') {
            soundFX.tap();
            activeTarget = {
              x: data.tx as number,
              z: data.tz as number,
              arrivePose: 'idle',
              onArrive: () => {
                soundFX.sparkle();
                callbacksRef.current.onOpenSettings();
              },
            };
            return;
          }

          if (kind === 'daily_quests') {
            soundFX.tap();
            activeTarget = {
              x: data.tx as number,
              z: data.tz as number,
              arrivePose: 'idle',
              onArrive: () => {
                soundFX.sparkle();
                callbacksRef.current.onOpenDailyQuests();
              },
            };
            return;
          }

          if (kind === 'exit') {
            soundFX.tap();
            activeTarget = {
              x: data.tx as number,
              z: data.tz as number,
              arrivePose: 'idle',
              onArrive: () => {
                soundFX.enterDoor();
                setFishingState('idle');
                callbacksRef.current.onChangeZone('town');
              },
            };
            return;
          }

          if (kind === 'wardrobe') {
            soundFX.tap();
            activeTarget = {
              x: data.tx as number,
              z: data.tz as number,
              arrivePose: 'idle',
              onArrive: () => {
                soundFX.sparkle();
                callbacksRef.current.onOpenWardrobe();
              },
            };
            return;
          }

          if (kind === 'bed') {
            soundFX.tap();
            const bedSeat: SeatTarget = {
              seatX: (data.seatX as number) ?? 2.35,
              seatZ: (data.seatZ as number) ?? -3.1,
              seatY: (data.seatY as number) ?? 0.68,
              rotY: (data.sitRotY as number) ?? 0,
              standX: data.tx as number,
              standZ: data.tz as number,
              isBed: true,
            };
            activeTarget = {
              x: data.tx as number,
              z: data.tz as number,
              arrivePose: 'sleep',
              seat: bedSeat,
              onArrive: () => {
                soundFX.nap();
                callbacksRef.current.onRestoreEnergy();
                showBubble('Ngủ thật ngon! (+Năng lượng)', bedSeat.seatX, 2.1, bedSeat.seatZ);
              },
            };
            return;
          }

          if (kind === 'sofa') {
            soundFX.tap();
            const sofaSeat: SeatTarget = {
              seatX: (data.seatX as number) ?? -2.38,
              seatZ: (data.seatZ as number) ?? 1.3,
              seatY: (data.seatY as number) ?? 0.62,
              rotY: (data.sitRotY as number) ?? Math.PI / 2,
              standX: data.tx as number,
              standZ: data.tz as number,
            };
            activeTarget = {
              x: data.tx as number,
              z: data.tz as number,
              arrivePose: 'sit',
              seat: sofaSeat,
              onArrive: () => {
                soundFX.sparkle();
                callbacksRef.current.onBoostMood();
                showBubble('Thư giãn thật thích! (+Vui vẻ)', sofaSeat.seatX, 2.0, sofaSeat.seatZ);
              },
            };
            return;
          }

          if (kind === 'well') {
            soundFX.tap();
            activeTarget = {
              x: data.tx as number,
              z: data.tz as number,
              arrivePose: 'idle',
              onArrive: () => {
                soundFX.splash();
                showBubble('Bình tưới đã đầy nước mát!', data.tx as number, 2.0, data.tz as number);
              },
            };
            return;
          }

          if (kind === 'plot') {
            soundFX.tap();
            const plotId = data.plotId as number;
            activeTarget = {
              x: data.tx as number,
              z: data.tz as number,
              arrivePose: 'idle',
              onArrive: () => {
                const plot = stateRef.current.plots.find((p) => p.id === plotId);
                if (!plot) return;
                if (plot.stage === 'empty') {
                  const chosen = CROP_CYCLE[plot.id % CROP_CYCLE.length];
                  callbacksRef.current.onUpdatePlot(plot.id, {...plot, stage: 'planted', crop: chosen});
                  soundFX.sparkle();
                  showBubble(`Đã gieo ${CROP_LABELS[chosen]}!`, playerPos.x, 2.1, playerPos.z);
                } else if (plot.stage === 'planted') {
                  callbacksRef.current.onUpdatePlot(plot.id, {...plot, stage: 'watered'});
                  soundFX.splash();
                  showBubble('Đang tưới nước...', playerPos.x, 2.1, playerPos.z);
                  window.setTimeout(() => {
                    callbacksRef.current.onUpdatePlot(plot.id, {...plot, stage: 'ready'});
                  }, 1300);
                } else if (plot.stage === 'watered') {
                  callbacksRef.current.onUpdatePlot(plot.id, {...plot, stage: 'ready'});
                } else if (plot.stage === 'ready') {
                  const cropName = plot.crop ? CROP_LABELS[plot.crop] : 'Nông sản';
                  callbacksRef.current.onUpdatePlot(plot.id, {id: plot.id, stage: 'empty', crop: null});
                  callbacksRef.current.onAddCoins(25);
                  soundFX.sparkle();
                  showBubble(`Thu hoạch ${cropName}! +25 Xu`, playerPos.x, 2.1, playerPos.z);
                }
              },
            };
            return;
          }

          if (kind === 'fish_cast') {
            soundFX.tap();
            activeTarget = {
              x: data.tx as number,
              z: data.tz as number,
              arrivePose: 'idle',
              onArrive: () => {
                const curFs = stateRef.current.fishingState;
                if (curFs === 'idle') {
                  setFishingState('waiting');
                  soundFX.splash();
                  showBubble('Thả phao... chờ cá cắn câu!', 0, 2.1, -1.4);
                  if (fishTimerRef.current) clearTimeout(fishTimerRef.current);
                  fishTimerRef.current = window.setTimeout(() => {
                    setFishingState('bite');
                    soundFX.sparkle();
                  }, 1700);
                } else if (curFs === 'bite') {
                  const fish = FISH_LIST[Math.floor(Math.random() * FISH_LIST.length)];
                  setFishingState('idle');
                  soundFX.sparkle();
                  callbacksRef.current.onAddCoins(fish.coins);
                  callbacksRef.current.onFishCaught();
                  showBubble(`Câu được ${fish.name}! +${fish.coins} Xu`, 0, 2.1, -1.4);
                } else {
                  if (fishTimerRef.current) clearTimeout(fishTimerRef.current);
                  setFishingState('idle');
                }
              },
            };
            return;
          }

          if (kind === 'arcade_star') {
            soundFX.tap();
            activeTarget = {
              x: data.tx as number,
              z: data.tz as number,
              arrivePose: 'idle',
              onArrive: () => {
                setMiniScore(0);
                setMiniActive(true);
                setStarPos({x: 30 + Math.random() * 45, y: 25 + Math.random() * 50});
                soundFX.sparkle();
              },
            };
            return;
          }

          if (kind === 'arcade_claw') {
            soundFX.tap();
            activeTarget = {
              x: data.tx as number,
              z: data.tz as number,
              arrivePose: 'idle',
              onArrive: () => {
                soundFX.sparkle();
                callbacksRef.current.onAddCoins(10);
                showBubble('Gắp trúng Gấu Bông! +10 Xu', playerPos.x, 2.1, playerPos.z);
              },
            };
            return;
          }

          if (kind === 'house_door') {
            const doorId = data.doorId as string;
            const door = activeDoorsRef.current.find((d) => d.id === doorId);
            if (door) {
              const dist = Math.hypot(playerPos.x - door.x, playerPos.z - door.z);
              if (dist < 2.65) {
                const nextOpen = !door.isOpen;
                door.setOpen(nextOpen);
                openDoorsRef.current[door.id] = nextOpen;
                soundFX.enterDoor();
                nearbyDoorKeyRef.current = `${door.id}:${nextOpen}`;
                setNearbyDoor({id: door.id, label: door.label, isOpen: nextOpen});
              } else {
                soundFX.tap();
                const dx = playerPos.x - door.x;
                const dz = playerPos.z - door.z;
                const len = Math.hypot(dx, dz) || 1;
                activeTarget = {
                  x: door.x + (dx / len) * 1.15,
                  z: door.z + (dz / len) * 1.15,
                  arrivePose: 'idle',
                  onArrive: () => {
                    const nextOpen = !door.isOpen;
                    door.setOpen(nextOpen);
                    openDoorsRef.current[door.id] = nextOpen;
                    soundFX.enterDoor();
                    nearbyDoorKeyRef.current = `${door.id}:${nextOpen}`;
                    setNearbyDoor({id: door.id, label: door.label, isOpen: nextOpen});
                  },
                };
              }
            }
            return;
          }

          if (kind === 'furniture' || kind === 'house_wall') {
            return;
          }

          if (kind === 'open_shop') {
            soundFX.tap();
            activeTarget = {
              x: data.tx as number,
              z: data.tz as number,
              arrivePose: 'idle',
              onArrive: () => {
                soundFX.sparkle();
                callbacksRef.current.onOpenShop();
              },
            };
            return;
          }
        }
      }

      // 2. Tap on walkable ground or hill -> nudge outside any obstacle & walk there
      if (currentGrounds.length > 0) {
        const groundHits = raycaster.intersectObjects(currentGrounds, false);
        if (groundHits.length > 0) {
          releaseSeatIfNeeded();
          const pt = groundHits[0].point;
          const b = getZoneWalkBounds(stateRef.current.zone);
          const clampedX = THREE.MathUtils.clamp(pt.x, b.minX, b.maxX);
          const clampedZ = THREE.MathUtils.clamp(pt.z, b.minZ, b.maxZ);
          const safeTarget = resolvePointAgainstColliders(clampedX, clampedZ, currentColliders);
          stallTimer = 0;
          prevDistToTarget = Infinity;
          activeTarget = {
            x: THREE.MathUtils.clamp(safeTarget.x, b.minX, b.maxX),
            z: THREE.MathUtils.clamp(safeTarget.z, b.minZ, b.maxZ),
            arrivePose: 'idle',
          };
        }
      }
    };

    let downX = 0;
    let downY = 0;
    const onPointerDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };
    const onPointerUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) < 12) {
        handlePointerTap(e.clientX, e.clientY);
      }
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth || 800;
      const h = container.clientHeight || window.innerHeight || 600;
      const aspect = w / h;
      const camCfg = getResponsiveCameraSettings(stateRef.current.zone, aspect);
      camera.fov = camCfg.fov;
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    let frameId = 0;
    let disposed = false;
    let lastTagPush = 0;
    let lastHadTags = false;
    const clock = new THREE.Clock();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;
      const delta = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.getElapsedTime();
      const {zone: z, timeOfDay: tod, avatar: av} = stateRef.current;

      const targetBg =
        tod === 'night'
          ? 0x1e284b
          : tod === 'sunset'
            ? 0xf0a682
            : 0xbfe6f7;
      _bgColorTarget.setHex(targetBg);
      (scene.background as THREE.Color).lerp(_bgColorTarget, 0.08);
      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.color.copy(scene.background as THREE.Color);
      }
      sunLight.intensity = THREE.MathUtils.damp(
        sunLight.intensity,
        tod === 'night' ? 0.55 : tod === 'sunset' ? 1.25 : 1.48,
        5,
        delta,
      );
      _sunColorTarget.set(tod === 'night' ? '#A3C4FF' : tod === 'sunset' ? '#FFAE70' : '#FFF3DA');
      sunLight.color.lerp(_sunColorTarget, 0.08);
      hemiLight.intensity = THREE.MathUtils.damp(
        hemiLight.intensity,
        tod === 'night' ? 0.45 : 0.88,
        5,
        delta,
      );

      if (cameraTransitionActive) {
        const w = container?.clientWidth || window.innerWidth || 800;
        const h = container?.clientHeight || window.innerHeight || 600;
        const camCfg = getResponsiveCameraSettings(z, w / h);
        camera.fov = THREE.MathUtils.damp(camera.fov, camCfg.fov, 6, delta);
        camera.updateProjectionMatrix();
        const camOffX =
          z === 'town'
            ? playerPos.x * 0.65
            : z === 'home'
              ? (playerPos.x + 1.8) * 0.65
              : 0;
        const camOffZ =
          z === 'town'
            ? (playerPos.z - 3.6) * 0.65
            : z === 'home'
              ? (playerPos.z - 5.2) * 0.65
              : 0;
        _camPosTarget.set(
          camCfg.pos[0] + camOffX,
          camCfg.pos[1],
          camCfg.pos[2] + camOffZ,
        );
        _camLookTarget.set(
          camCfg.look[0] + camOffX,
          camCfg.look[1],
          camCfg.look[2] + camOffZ,
        );
        camera.position.x = THREE.MathUtils.damp(camera.position.x, _camPosTarget.x, 6, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _camPosTarget.y, 6, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _camPosTarget.z, 6, delta);
        controls.target.x = THREE.MathUtils.damp(controls.target.x, _camLookTarget.x, 6, delta);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, _camLookTarget.y, 6, delta);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, _camLookTarget.z, 6, delta);
        if (
          camera.position.distanceTo(_camPosTarget) < 0.08 &&
          controls.target.distanceTo(_camLookTarget) < 0.08
        ) {
          cameraTransitionActive = false;
        }
      }

      // Walk kinematics with collision sliding & exact seat alignment
      if (activeTarget) {
        const dx = activeTarget.x - playerPos.x;
        const dz = activeTarget.z - playerPos.z;
        const dist = Math.hypot(dx, dz);
        const speed = z === 'town' ? 5.6 : 3.6;

        if (dist < 0.16) {
          if (activeTarget.seat) {
            activeSeat = activeTarget.seat;
            playerPos.x = activeTarget.seat.seatX;
            playerPos.z = activeTarget.seat.seatZ;
            playerPos.rotY = activeTarget.seat.rotY;
          } else {
            playerPos.x = activeTarget.x;
            playerPos.z = activeTarget.z;
          }
          playerPos.pose = activeTarget.arrivePose;
          const cb = activeTarget.onArrive;
          activeTarget = null;
          stallTimer = 0;
          cb?.();
        } else {
          playerPos.pose = 'walk';
          const dirX = dx / dist;
          const dirZ = dz / dist;
          const stepLen = Math.min(dist, speed * delta);
          const rawX = playerPos.x + dirX * stepLen;
          const rawZ = playerPos.z + dirZ * stepLen;

          let resolved = resolvePointAgainstColliders(rawX, rawZ, currentColliders);
          // Tangential slide around circular/box obstacles if direct path is blocked
          const progress = (resolved.x - playerPos.x) * dirX + (resolved.z - playerPos.z) * dirZ;
          if (resolved.collided && progress < stepLen * 0.35) {
            const perpX = -dirZ;
            const perpZ = dirX;
            const optA = resolvePointAgainstColliders(
              playerPos.x + perpX * stepLen * 0.9,
              playerPos.z + perpZ * stepLen * 0.9,
              currentColliders,
            );
            const optB = resolvePointAgainstColliders(
              playerPos.x - perpX * stepLen * 0.9,
              playerPos.z - perpZ * stepLen * 0.9,
              currentColliders,
            );
            const distA = Math.hypot(activeTarget.x - optA.x, activeTarget.z - optA.z);
            const distB = Math.hypot(activeTarget.x - optB.x, activeTarget.z - optB.z);
            resolved = distA <= distB ? optA : optB;
          }

          const b = getZoneWalkBounds(z);
          const nextX = THREE.MathUtils.clamp(resolved.x, b.minX, b.maxX);
          const nextZ = THREE.MathUtils.clamp(resolved.z, b.minZ, b.maxZ);

          const moveX = nextX - playerPos.x;
          const moveZ = nextZ - playerPos.z;
          playerPos.x = nextX;
          playerPos.z = nextZ;

          if (!cameraTransitionActive) {
            camera.position.x += moveX * 0.65;
            camera.position.z += moveZ * 0.65;
            controls.target.x += moveX * 0.65;
            controls.target.z += moveZ * 0.65;
          }

          if (Math.hypot(moveX, moveZ) > 0.002) {
            const targetRot = Math.atan2(moveX, moveZ);
            let diff = targetRot - playerPos.rotY;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            playerPos.rotY += diff * Math.min(1, delta * 12);
          }

          const newDist = Math.hypot(activeTarget.x - playerPos.x, activeTarget.z - playerPos.z);
          if (prevDistToTarget - newDist < stepLen * 0.15) {
            stallTimer += delta;
            if (stallTimer > 0.45) {
              activeTarget = null;
              playerPos.pose = 'idle';
              stallTimer = 0;
            }
          } else {
            stallTimer = 0;
            prevDistToTarget = newDist;
          }
        }
      }

      controls.update();

      let groundOffset = 0.02;
      if (playerPos.pose === 'sit' && activeSeat) {
        groundOffset = activeSeat.seatY - 0.245;
      } else if (playerPos.pose === 'sleep' && activeSeat?.isBed) {
        groundOffset = 0;
      } else if (z === 'town') {
        groundOffset = getTownGroundHeight(playerPos.x, playerPos.z, currentPlazaRadius);
      }

      if (z === 'town') {
        const dGroundY = groundOffset - prevGroundY;
        if (!cameraTransitionActive && Math.abs(dGroundY) > 0.0001) {
          camera.position.y += dGroundY * 0.65;
          controls.target.y += dGroundY * 0.65;
        }
        prevGroundY = groundOffset;
      }

      if (z === 'home') {
        homeSpotRef.current.x = playerPos.x;
        homeSpotRef.current.z = playerPos.z;
      }

      if (z === 'home' && stateRef.current.editFurnitureMode && stateRef.current.selectedFurnitureId) {
        const sel = stateRef.current.placedFurniture.find(
          (p) => p.instanceId === stateRef.current.selectedFurnitureId,
        );
        const cat = sel ? FURNITURE_BY_ID[sel.catalogId] : null;
        if (sel && cat) {
          selectionRing.visible = true;
          selectionRing.position.set(sel.x, 0.03, sel.z);
          const ringRadius =
            Math.max(cat.halfW, cat.halfD) * 1.28 + Math.sin(elapsed * 5) * 0.035;
          selectionRing.scale.set(ringRadius, ringRadius, 1);
        } else {
          selectionRing.visible = false;
        }
      } else {
        selectionRing.visible = false;
      }

      playerRig.root.position.set(playerPos.x, groundOffset, playerPos.z);
      playerRig.root.rotation.y = playerPos.rotY;
      updateAvatarRigAnimation(playerRig, playerPos.pose, elapsed, av.eyeStyle === 'cozy');

      activeTown?.update(elapsed, tod);
      activeSubzone?.update(
        elapsed,
        tod,
        z === 'home' ? {cameraPos: camera.position, playerPos} : undefined,
      );

      renderer.render(scene, camera);

      if (elapsed - lastTagPush > 0.065) {
        lastTagPush = elapsed;
        const cw = container?.clientWidth || window.innerWidth || 800;
        const ch = container?.clientHeight || window.innerHeight || 600;

        if (currentAnchors.length > 0) {
          const nextTags: ProjectedTag[] = [];
          for (const a of currentAnchors) {
            _projVec.copy(a.worldPos).project(camera);
            if (_projVec.z <= 1) {
              nextTags.push({
                id: a.id,
                label: a.label,
                x: ((_projVec.x + 1) / 2) * cw,
                y: ((-_projVec.y + 1) / 2) * ch,
              });
            }
          }
          setTags(nextTags);
          lastHadTags = true;
        } else if (lastHadTags) {
          setTags([]);
          lastHadTags = false;
        }

        if (z === 'home' && activeDoorsRef.current.length > 0) {
          let closest: HouseDoorHandle | null = null;
          let bestD = 2.45;
          for (const d of activeDoorsRef.current) {
            const dist = Math.hypot(playerPos.x - d.x, playerPos.z - d.z);
            if (dist < bestD) {
              bestD = dist;
              closest = d;
            }
          }
          const nextKey = closest ? `${closest.id}:${closest.isOpen}` : '';
          if (nextKey !== nearbyDoorKeyRef.current) {
            nearbyDoorKeyRef.current = nextKey;
            setNearbyDoor(
              closest
                ? {id: closest.id, label: closest.label, isOpen: closest.isOpen}
                : null,
            );
          }
        } else if (nearbyDoorKeyRef.current !== '') {
          nearbyDoorKeyRef.current = '';
          setNearbyDoor(null);
        }

        if (playerBubbleRef.current) {
          _projVec.copy(playerBubbleRef.current.worldPos).project(camera);
          if (_projVec.z <= 1) {
            setSpeechBubble({
              text: playerBubbleRef.current.text,
              x: ((_projVec.x + 1) / 2) * cw,
              y: ((-_projVec.y + 1) / 2) * ch,
            });
          } else {
            setSpeechBubble(null);
          }
        }
      }

      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    }

    if (!isSoftwareGl) renderer.compile(scene, camera);
    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
      if (fishTimerRef.current) clearTimeout(fishTimerRef.current);
      resizeObserver.disconnect();
      controls.removeEventListener('start', onControlsStart);
      controls.dispose();
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      activeTown?.dispose();
      activeSubzone?.dispose();
      selectionRing.geometry.dispose();
      (selectionRing.material as THREE.Material).dispose();
      envTex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const hitStar = () => {
    const next = miniScore + 1;
    soundFX.sparkle();
    if (next >= 5) {
      setMiniActive(false);
      onAddCoins(30);
      showBubble('Phá đảo Bắt Sao! +30 Xu', -1.95, 2.1, -1.35);
    } else {
      setMiniScore(next);
      setStarPos({x: 20 + Math.random() * 60, y: 20 + Math.random() * 60});
    }
  };

  const handleToggleNearbyDoor = () => {
    if (!nearbyDoor) return;
    const door = activeDoorsRef.current.find((d) => d.id === nearbyDoor.id);
    if (!door) return;
    const nextOpen = !door.isOpen;
    door.setOpen(nextOpen);
    openDoorsRef.current[door.id] = nextOpen;
    soundFX.enterDoor();
    nearbyDoorKeyRef.current = `${door.id}:${nextOpen}`;
    setNearbyDoor({id: door.id, label: door.label, isOpen: nextOpen});
  };

  const selectedPlacedItem =
    zone === 'home' && editFurnitureMode && selectedFurnitureId
      ? placedFurniture.find((p) => p.instanceId === selectedFurnitureId)
      : null;
  const selectedCatalogItem = selectedPlacedItem
    ? FURNITURE_BY_ID[selectedPlacedItem.catalogId]
    : null;

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div ref={mountRef} className="absolute inset-0 h-full w-full" />

      {webglError && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#DFEFE0] p-6 text-center text-sm font-semibold text-[#4A3525]">
          Trình duyệt chưa hỗ trợ WebGL để hiển thị thị trấn 3D.
        </div>
      )}

      <div ref={labelLayerRef} className="pointer-events-none absolute inset-0 overflow-hidden">
        {tags.map((tag) => (
          <div
            key={tag.id}
            style={{transform: `translate3d(${tag.x}px, ${tag.y}px, 0) translate(-50%, -100%)`}}
            className="absolute top-0 left-0 rounded-lg border border-[#7A5230]/45 bg-[#FFF8EB]/92 px-2 py-0.5 text-[11px] font-bold tracking-tight text-[#4A3525] shadow-xs whitespace-nowrap"
          >
            {tag.label}
          </div>
        ))}

        {speechBubble && (
          <div
            style={{
              transform: `translate3d(${speechBubble.x}px, ${speechBubble.y}px, 0) translate(-50%, -100%)`,
            }}
            className="anim-pop absolute top-0 left-0 max-w-[220px] rounded-2xl border border-[#7A5230]/25 bg-white/95 px-3 py-1.5 text-center text-xs font-semibold text-stone-800 shadow-md"
          >
            {speechBubble.text}
          </div>
        )}
      </div>

      {/* Top-corner 2 small buttons inside House: Tủ nội thất & Di chuyển */}
      {zone === 'home' && (
        <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              soundFX.tap();
              onOpenFurniture();
            }}
            className="flex min-h-[38px] items-center gap-1.5 rounded-xl border-2 border-[#8C6239] bg-[#FFF8EB] px-3 py-1.5 text-xs font-bold text-[#4A3525] shadow-md transition-transform active:scale-95"
          >
            <Armchair className="h-4 w-4 text-[#9A5B25]" />
            <span>Tủ nội thất</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundFX.tap();
              onToggleEditFurniture();
            }}
            className={`flex min-h-[38px] items-center gap-1.5 rounded-xl border-2 px-3 py-1.5 text-xs font-bold shadow-md transition-transform active:scale-95 ${
              editFurnitureMode
                ? 'border-[#B95D3B] bg-[#DF7B57] text-white'
                : 'border-[#8C6239] bg-[#FFF8EB] text-[#4A3525]'
            }`}
          >
            <Move className="h-4 w-4" />
            <span>{editFurnitureMode ? 'Xong' : 'Di chuyển'}</span>
          </button>
        </div>
      )}

      {/* Proximity Door Toggle Button inside House */}
      {zone === 'home' && !editFurnitureMode && nearbyDoor && (
        <div className="absolute bottom-5 left-1/2 z-30 -translate-x-1/2">
          <button
            type="button"
            onClick={handleToggleNearbyDoor}
            className="anim-pop flex min-h-[42px] items-center gap-2 rounded-2xl border-2 border-[#7A5230] bg-[#FFF8EB] px-4 py-2 text-xs font-bold text-[#4A3525] shadow-lg transition-transform active:scale-95"
          >
            {nearbyDoor.isOpen ? (
              <DoorClosed className="h-4 w-4 text-[#B95D3B]" />
            ) : (
              <DoorOpen className="h-4 w-4 text-[#4B8A66]" />
            )}
            <span>
              {nearbyDoor.isOpen ? `Đóng ${nearbyDoor.label}` : `Mở ${nearbyDoor.label}`}
            </span>
          </button>
        </div>
      )}

      {/* Bottom Action Bar in Furniture Move Mode */}
      {zone === 'home' && editFurnitureMode && (
        <div className="absolute bottom-4 left-1/2 z-30 flex w-[min(94vw,440px)] -translate-x-1/2 flex-col items-center gap-1.5">
          {selectedCatalogItem && selectedPlacedItem ? (
            <>
              <span className="rounded-lg bg-[#4A3525]/85 px-2.5 py-0.5 text-[11px] font-semibold text-amber-50 shadow-xs">
                {selectedCatalogItem.wallMount
                  ? `Chạm tường để đặt "${selectedCatalogItem.name}" · Chạm đồ khác để chọn`
                  : `Chạm sàn để đặt "${selectedCatalogItem.name}" · Chạm đồ khác để chọn`}
              </span>
              <div className="flex w-full items-center justify-between gap-2 rounded-2xl border-2 border-[#8C6239] bg-[#FFF8EB] p-2 shadow-xl">
                <button
                  type="button"
                  onClick={() => {
                    soundFX.tap();
                    onRotateFurniture(selectedPlacedItem.instanceId);
                  }}
                  className="flex min-h-[38px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#6F4E37] px-3 text-xs font-bold text-amber-50 transition-transform active:scale-95"
                >
                  <RotateCw className="h-4 w-4" />
                  <span>Xoay</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundFX.tap();
                    onStowFurniture(selectedPlacedItem.instanceId);
                  }}
                  className="flex min-h-[38px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#E7D4BA] px-3 text-xs font-bold text-[#4A3525] transition-transform active:scale-95"
                >
                  <PackageMinus className="h-4 w-4" />
                  <span>Cất vào tủ</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundFX.tap();
                    onToggleEditFurniture();
                  }}
                  className="flex min-h-[38px] items-center justify-center gap-1 rounded-xl bg-[#6BA383] px-3.5 text-xs font-bold text-white transition-transform active:scale-95"
                >
                  <Check className="h-4 w-4" />
                  <span>Xong</span>
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3 rounded-2xl border-2 border-[#8C6239] bg-[#FFF8EB] px-4 py-2 text-xs font-bold text-[#4A3525] shadow-xl">
              <span>Chạm vào một món nội thất để di chuyển hoặc xoay</span>
              <button
                type="button"
                onClick={() => {
                  soundFX.tap();
                  onToggleEditFurniture();
                }}
                className="rounded-xl bg-[#6BA383] px-3 py-1.5 text-white transition-transform active:scale-95"
              >
                Xong
              </button>
            </div>
          )}
        </div>
      )}

      {miniActive && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-stone-950/70 p-4">
          <div className="anim-pop relative flex h-80 w-full max-w-md flex-col overflow-hidden rounded-3xl border-4 border-amber-300 bg-[#182342] p-4 text-white shadow-2xl">
            <div className="flex items-center justify-between text-xs font-bold text-amber-200">
              <span>Chạm 5 Ngôi Sao ({miniScore}/5)</span>
              <button
                type="button"
                onClick={() => setMiniActive(false)}
                className="rounded-lg bg-white/15 px-2.5 py-1 text-[11px]"
              >
                Nghỉ Chơi
              </button>
            </div>
            <div className="relative mt-2 flex-1 rounded-2xl bg-[#10182E]">
              <button
                type="button"
                onClick={hitStar}
                style={{left: `${starPos.x}%`, top: `${starPos.y}%`}}
                className="absolute flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-amber-300/25 transition-transform active:scale-90"
                aria-label="Ngôi sao"
              >
                <svg width="30" height="30" viewBox="0 0 32 32">
                  <polygon
                    points="16,2 20,11 30,12 22,19 24,29 16,24 8,29 10,19 2,12 12,11"
                    fill="#FFD166"
                    stroke="#FFF"
                    strokeWidth="1.5"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
