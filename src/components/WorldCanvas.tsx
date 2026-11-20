import React, {useEffect, useRef, useState} from 'react';
import {
  Armchair,
  Check,
  ChevronLeft,
  ChevronRight,
  DoorClosed,
  DoorOpen,
  Fish,
  Move,
  PackageMinus,
  RotateCw,
  Utensils,
} from 'lucide-react';
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {WELL_WATER_MAX} from '../data/farmCatalog';
import {FISH_RARITY_CONFIG, rollRandomRiverFish} from '../data/fishingCatalog';
import {FURNITURE_BY_ID, isPointOnFurnitureSurface} from '../data/furnitureCatalog';
import {AvatarRig, buildAvatarRig, updateAvatarRigAnimation} from '../three/avatar3d';
import {FishingVisualFrame} from '../three/fishingVisuals3d';
import {
  buildSubzoneScene,
  HouseDoorHandle,
  HouseWallSurface,
  SubzoneWorld,
} from '../three/subzonesBuilder';
import {
  buildTownScene,
  getTownGroundHeight,
  TOWN_LAKE_WATER_Y,
  TOWN_ZONE_ENTRANCES,
  TownAnchor,
  TownWorld,
  WorldCollider,
} from '../three/townBuilder';
import {
  AvatarConfig,
  AvatarPose,
  CoopKind,
  CoopTroughs,
  CropType,
  FishingPhase,
  FishingRodState,
  FishRarity,
  GameStats,
  GardenPlotState,
  LivestockAnimalState,
  PlacedFurniture,
  PondFishState,
  RiverFishSpeciesId,
  TimeOfDay,
  ToolId,
  WellWaterState,
  ZoneId,
} from '../types/game';
import {soundFX} from '../utils/sound';
import {PlotArcMenu} from './PlotArcMenu';

interface WorldCanvasProps {
  zone: ZoneId;
  avatar: AvatarConfig;
  stats: GameStats;
  timeOfDay: TimeOfDay;
  plots: GardenPlotState[];
  livestock: LivestockAnimalState[];
  troughs: CoopTroughs;
  pondFish: PondFishState[];
  fishFeedCount: number;
  pondFeedPulse: number;
  farmPondFishPulse: number;
  fishingRod: FishingRodState;
  seeds: Partial<Record<CropType, number>>;
  bugSprayCount: number;
  waterCount: number;
  wellWater: WellWaterState;
  placedFurniture: PlacedFurniture[];
  editFurnitureMode: boolean;
  selectedFurnitureId: string | null;
  homeSpotRef: React.MutableRefObject<{x: number; z: number}>;
  onChangeZone: (next: ZoneId) => void;
  onOpenWardrobe: () => void;
  onOpenShop: () => void;
  onOpenKoiShop: () => void;
  onOpenFurnitureShop: () => void;
  onOpenSettings: () => void;
  onOpenDailyQuests: () => void;
  onOpenPhone: () => void;
  onOpenFurniture: () => void;
  onToggleEditFurniture: () => void;
  onSelectFurniture: (id: string | null) => void;
  onMoveFurniture: (id: string, x: number, z: number, rotY?: number) => void;
  onRotateFurniture: (id: string) => void;
  onStowFurniture: (id: string) => void;
  onCatchRiverFish: (preRolled?: {
    speciesId: RiverFishSpeciesId;
    weightKg: number;
    sellPrice: number;
  }) => {
    name: string;
    rarity: FishRarity;
    weightKg: number;
    durabilityLeft: number;
    maxDurability: number;
  } | null;
  onLoseFishingDurability: () => {
    durabilityLeft: number;
    maxDurability: number;
  };
  onRestoreEnergy: () => void;
  onBoostMood: () => void;
  onCollectWellWater: () => {
    gained: number;
    waterCan: number;
    wellRemaining: number;
    nextDropSec: number;
  };
  onPlantPlot: (plotId: number, crop: CropType) => void;
  onWaterPlot: (plotId: number) => void;
  onSprayPestPlot: (plotId: number) => void;
  onWeedPlot: (plotId: number) => void;
  onCancelCropPlot: (plotId: number) => void;
  onHarvestPlot: (plotId: number) => boolean;
  onUpgradePlot: (plotId: number) => void;
  onOpenWorkshop: (tab: 'mill' | 'kitchen') => void;
  onOpenOrders: () => void;
  onOpenStorage: () => void;
  onOpenPasture: (coop?: CoopKind) => void;
  onOpenPond: () => void;
  onOpenFarmShop: () => void;
  onScatterPondFeed: () => void;
  onPondProximityChange: (near: boolean) => void;
  onAddCoins: (amount: number) => void;
}

interface ProjectedTag {
  id: string;
  label: string;
  x: number;
  y: number;
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

const PLAYER_RADIUS = 0.34;

// Reusable math objects (zero allocations in render loop)
const _projVec = new THREE.Vector3();
const _camPosTarget = new THREE.Vector3();
const _camLookTarget = new THREE.Vector3();
const _bgColorTarget = new THREE.Color();
const _sunColorTarget = new THREE.Color();
const _hemiSkyTarget = new THREE.Color();
const _hemiGroundTarget = new THREE.Color();
const _rimColorTarget = new THREE.Color();

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

  if (zone === 'garden') {
    if (isPortrait) {
      return {fov, pos: [0, 18.4, 25.5] as const, look: [0, 0.8, 0.5] as const};
    }
    if (isSquare) {
      return {fov, pos: [0, 17.0, 23.2] as const, look: [0, 0.8, 0.2] as const};
    }
    return {fov, pos: [0, 15.6, 21.0] as const, look: [0, 0.8, 0] as const};
  }

  if (zone === 'boutique') {
    if (isPortrait) {
      return {fov, pos: [0, 8.6, 13.4] as const, look: [0, 0.75, -0.45] as const};
    }
    return {fov, pos: [0, 7.6, 11.4] as const, look: [0, 0.75, -0.45] as const};
  }

  if (isPortrait) {
    return {fov, pos: [0, 6.8, 10.6] as const, look: [0, 0.75, -0.35] as const};
  }
  return {fov, pos: [0, 6.3, 9.5] as const, look: [0, 0.75, -0.35] as const};
}

function getZoneWalkBounds(zone: ZoneId) {
  if (zone === 'town') {
    return {minX: -82, maxX: 82, minZ: -98, maxZ: 78};
  }
  if (zone === 'home') {
    return {minX: -12.85, maxX: 9.85, minZ: -8.95, maxZ: 6.95};
  }
  if (zone === 'garden') {
    return {minX: -21.8, maxX: 21.8, minZ: -14.8, maxZ: 14.6};
  }
  if (zone === 'boutique') {
    return {minX: -5.6, maxX: 5.6, minZ: -4.8, maxZ: 4.9};
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
  livestock,
  troughs,
  pondFish,
  fishFeedCount,
  pondFeedPulse,
  farmPondFishPulse,
  fishingRod,
  seeds,
  bugSprayCount,
  waterCount,
  wellWater,
  placedFurniture,
  editFurnitureMode,
  selectedFurnitureId,
  homeSpotRef,
  onChangeZone,
  onOpenWardrobe,
  onOpenShop,
  onOpenKoiShop,
  onOpenFurnitureShop,
  onOpenSettings,
  onOpenDailyQuests,
  onOpenFurniture,
  onToggleEditFurniture,
  onSelectFurniture,
  onMoveFurniture,
  onRotateFurniture,
  onStowFurniture,
  onCatchRiverFish,
  onLoseFishingDurability,
  onRestoreEnergy,
  onBoostMood,
  onCollectWellWater,
  onPlantPlot,
  onWaterPlot,
  onSprayPestPlot,
  onWeedPlot,
  onCancelCropPlot,
  onHarvestPlot,
  onUpgradePlot,
  onOpenWorkshop,
  onOpenOrders,
  onOpenStorage,
  onOpenPasture,
  onOpenPond,
  onOpenFarmShop,
  onScatterPondFeed,
  onPondProximityChange,
  onAddCoins,
  onOpenPhone,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const labelLayerRef = useRef<HTMLDivElement | null>(null);

  const [tags, setTags] = useState<ProjectedTag[]>([]);
  const [speechBubble, setSpeechBubble] = useState<string | null>(null);
  const [arcMenuPos, setArcMenuPos] = useState<{plotId: number; x: number; y: number} | null>(null);
  const [fishingState, setFishingState] = useState<FishingPhase>('idle');
  const [biteAlertPos, setBiteAlertPos] = useState<{x: number; y: number} | null>(null);
  const [miniActive, setMiniActive] = useState(false);
  const [miniScore, setMiniScore] = useState(0);
  const [starPos, setStarPos] = useState({x: 50, y: 50});
  const [nearbyDoor, setNearbyDoor] = useState<{id: string; label: string; isOpen: boolean} | null>(
    null,
  );
  const [nearPond, setNearPond] = useState(false);
  const [confirmPondFeed, setConfirmPondFeed] = useState(false);
  const [homeToolsOpen, setHomeToolsOpen] = useState(false);
  const [webglError, setWebglError] = useState(false);

  const stateRef = useRef({
    zone,
    avatar,
    stats,
    timeOfDay,
    plots,
    livestock,
    troughs,
    pondFish,
    wellWater,
    fishingState,
    fishingRod,
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
    livestock,
    troughs,
    pondFish,
    wellWater,
    fishingState,
    fishingRod,
    placedFurniture,
    editFurnitureMode,
    selectedFurnitureId,
  };

  const callbacksRef = useRef({
    onChangeZone,
    onOpenWardrobe,
    onOpenShop,
    onOpenKoiShop,
    onOpenFurnitureShop,
    onOpenSettings,
    onOpenDailyQuests,
    onOpenFurniture,
    onToggleEditFurniture,
    onSelectFurniture,
    onMoveFurniture,
    onRotateFurniture,
    onStowFurniture,
    onCatchRiverFish,
    onLoseFishingDurability,
    onRestoreEnergy,
    onBoostMood,
    onCollectWellWater,
    onPlantPlot,
    onWaterPlot,
    onSprayPestPlot,
    onWeedPlot,
    onCancelCropPlot,
    onHarvestPlot,
    onOpenWorkshop,
    onOpenOrders,
    onOpenStorage,
    onOpenPasture,
    onOpenPond,
    onOpenFarmShop,
    onScatterPondFeed,
    onPondProximityChange,
    onAddCoins,
  });
  callbacksRef.current = {
    onChangeZone,
    onOpenWardrobe,
    onOpenShop,
    onOpenKoiShop,
    onOpenFurnitureShop,
    onOpenSettings,
    onOpenDailyQuests,
    onOpenFurniture,
    onToggleEditFurniture,
    onSelectFurniture,
    onMoveFurniture,
    onRotateFurniture,
    onStowFurniture,
    onCatchRiverFish,
    onLoseFishingDurability,
    onRestoreEnergy,
    onBoostMood,
    onCollectWellWater,
    onPlantPlot,
    onWaterPlot,
    onSprayPestPlot,
    onWeedPlot,
    onCancelCropPlot,
    onHarvestPlot,
    onOpenWorkshop,
    onOpenOrders,
    onOpenStorage,
    onOpenPasture,
    onOpenPond,
    onOpenFarmShop,
    onScatterPondFeed,
    onPondProximityChange,
    onAddCoins,
  };

  const rebuildSceneTriggerRef = useRef<(() => void) | null>(null);
  const rebuildAvatarTriggerRef = useRef<((cfg: AvatarConfig, equippedTool: ToolId | null) => void) | null>(null);
  const farmPondFishActionRef = useRef<(() => void) | null>(null);
  const cancelFishingRef = useRef<(() => void) | null>(null);
  const activeTownRef = useRef<TownWorld | null>(null);
  const activeSubzoneRef = useRef<SubzoneWorld | null>(null);
  const bubbleTimerRef = useRef<number | null>(null);
  const fishTimerRef = useRef<number | null>(null);
  const openDoorsRef = useRef<Record<string, boolean>>({});
  const activeDoorsRef = useRef<HouseDoorHandle[]>([]);
  const nearbyDoorKeyRef = useRef<string>('');
  const nearPondRef = useRef<boolean>(false);
  const homeExitTriggeredRef = useRef<boolean>(false);
  const selectedPlotRef = useRef<{plotId: number; worldPos: THREE.Vector3} | null>(null);

  const showBubble = (text: string, _x?: number, _y?: number, _z?: number) => {
    if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
    setSpeechBubble(text);
    bubbleTimerRef.current = window.setTimeout(() => {
      setSpeechBubble(null);
    }, 2600);
  };

  useEffect(() => {
    homeExitTriggeredRef.current = false;
    if (zone !== 'town' && zone !== 'fishing' && zone !== 'garden') {
      if (fishTimerRef.current) {
        clearTimeout(fishTimerRef.current);
        fishTimerRef.current = null;
      }
      cancelFishingRef.current?.();
      setFishingState('idle');
      setBiteAlertPos(null);
    }
    if (zone !== 'home') {
      openDoorsRef.current = {};
      activeDoorsRef.current = [];
      nearbyDoorKeyRef.current = '';
      setNearbyDoor(null);
      setHomeToolsOpen(false);
    }
    if (zone !== 'garden') {
      selectedPlotRef.current = null;
      setArcMenuPos(null);
      setConfirmPondFeed(false);
      if (nearPondRef.current) {
        nearPondRef.current = false;
        setNearPond(false);
        callbacksRef.current.onPondProximityChange(false);
      }
    }
  }, [zone]);

  useEffect(() => {
    if (pondFeedPulse <= 0) return;
    activeSubzoneRef.current?.triggerPondFeed?.();
    showBubble('Rải 1 túi thức ăn thủy sinh!', 14.2, 2.0, 3.0);
  }, [pondFeedPulse]);

  useEffect(() => {
    if (farmPondFishPulse <= 0) return;
    farmPondFishActionRef.current?.();
  }, [farmPondFishPulse]);

  const plotVisualKey = plots
    .map(
      (p) =>
        `${p.id}:${p.stage}:${p.crop ?? ''}:${p.watered ? 1 : 0}:${p.hasPest ? 1 : 0}:${p.hasWeed ? 1 : 0}:${p.level}`,
    )
    .join('|');

  const livestockVisualKey = livestock
    .map((a) => `${a.id}:${a.type}:${a.stage}:${a.sick ? 1 : 0}:${a.hasProduce ? 1 : 0}`)
    .join('|');

  const troughsVisualKey = `${troughs.poultry}:${troughs.cattle}`;

  const pondFishVisualKey = pondFish
    .map((f) => `${f.id}:${f.species}:${f.stage}:${f.sick ? 1 : 0}`)
    .join('|');

  useEffect(() => {
    rebuildSceneTriggerRef.current?.();
  }, [
    zone,
    plotVisualKey,
    livestockVisualKey,
    troughsVisualKey,
    pondFishVisualKey,
    placedFurniture,
    editFurnitureMode,
  ]);

  useEffect(() => {
    const legacyState: 'idle' | 'waiting' | 'bite' =
      fishingState === 'idle' ? 'idle' : fishingState === 'bite' ? 'bite' : 'waiting';
    if (zone === 'town') {
      activeTownRef.current?.setFishingState?.(legacyState);
    } else if (zone === 'garden' || zone === 'fishing') {
      activeSubzoneRef.current?.setFishingState?.(legacyState);
    }
  }, [zone, fishingState]);

  useEffect(() => {
    rebuildAvatarTriggerRef.current?.(
      avatar,
      fishingRod.equipped ? 'wooden_rod' : null,
    );
  }, [avatar, fishingRod.equipped]);

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
    renderer.toneMappingExposure = 0.96;
    const isTouchDevice =
      typeof window !== 'undefined' &&
      (window.matchMedia?.('(pointer: coarse)').matches || navigator.maxTouchPoints > 0);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, isTouchDevice ? 1.25 : 1.5));
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
    scene.background = new THREE.Color('#B2DDF2');
    scene.fog = new THREE.FogExp2('#B2DDF2', 0.0021);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTex = pmrem.fromScene(roomEnv, 0.04).texture;
    roomEnv.dispose();
    scene.environment = envTex;
    scene.environmentIntensity = 0.42;
    pmrem.dispose();

    const initCam = getResponsiveCameraSettings(stateRef.current.zone, width / height);
    const camera = new THREE.PerspectiveCamera(initCam.fov, width / height, 0.4, 420);
    camera.position.set(initCam.pos[0], initCam.pos[1], initCam.pos[2]);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(initCam.look[0], initCam.look[1], initCam.look[2]);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.09;
    controls.enableRotate = true;
    controls.enableZoom = true;
    controls.enablePan = false;
    controls.touches = {ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN};
    controls.rotateSpeed = 0.68;
    controls.zoomSpeed = 0.85;
    controls.minDistance = 6.5;
    controls.maxDistance = 42;
    controls.minPolarAngle = Math.PI * 0.16;
    controls.maxPolarAngle = Math.PI * 0.43;
    controls.update();

    let cameraTransitionActive = false;
    const onControlsStart = () => {
      cameraTransitionActive = false;
    };
    controls.addEventListener('start', onControlsStart);

    // Balanced 3-Point Studio Outdoor Lighting Rig (crisp, rich vinyl colors)
    const hemiLight = new THREE.HemisphereLight('#DCEFFF', '#6A8C58', 0.58);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight('#FFF2D8', 1.22);
    sunLight.position.set(16, 25, 18);
    sunLight.castShadow = false;
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight('#A8D2FF', 0.42);
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

    let playerRig: AvatarRig = buildAvatarRig(stateRef.current.avatar, {
      equippedTool: stateRef.current.fishingRod.equipped ? 'wooden_rod' : null,
    });
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
      const legacyFs: 'idle' | 'waiting' | 'bite' =
        fs === 'idle' ? 'idle' : fs === 'bite' ? 'bite' : 'waiting';

      if (activeTown) {
        scene.remove(activeTown.group);
        activeTown.dispose();
        activeTown = null;
        activeTownRef.current = null;
      }
      if (activeSubzone) {
        scene.remove(activeSubzone.group);
        activeSubzone.dispose();
        activeSubzone = null;
        activeSubzoneRef.current = null;
      }

      if (z === 'town') {
        controls.minDistance = 6.5;
        controls.maxDistance = 42;
        activeTown = buildTownScene();
        activeTownRef.current = activeTown;
        activeTown.setFishingState?.(legacyFs);
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
        controls.minDistance = z === 'garden' || z === 'home' ? 5.5 : 4.5;
        controls.maxDistance = z === 'garden' || z === 'home' ? 26 : 18;
        activeSubzone = buildSubzoneScene(z, {
          plots: pl,
          fishingState: legacyFs,
          placedFurniture: z === 'home' ? pf : undefined,
          editFurnitureMode: z === 'home' ? stateRef.current.editFurnitureMode : undefined,
          openDoors: z === 'home' ? openDoorsRef.current : undefined,
          livestock: z === 'garden' ? stateRef.current.livestock : undefined,
          troughs: z === 'garden' ? stateRef.current.troughs : undefined,
          pondFish: z === 'garden' ? stateRef.current.pondFish : undefined,
        });
        activeSubzoneRef.current = activeSubzone;
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
          } else if (z === 'garden') {
            playerPos.x = 0;
            playerPos.z = 10.2;
            playerPos.rotY = Math.PI;
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
    rebuildAvatarTriggerRef.current = (cfg: AvatarConfig, equippedTool: ToolId | null) => {
      scene.remove(playerRig.root);
      playerRig.root.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          m.geometry.dispose();
          if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
          else m.material.dispose();
        }
      });
      playerRig = buildAvatarRig(cfg, {equippedTool});
      const curY =
        stateRef.current.zone === 'town'
          ? getTownGroundHeight(playerPos.x, playerPos.z, currentPlazaRadius)
          : 0;
      playerRig.root.position.set(playerPos.x, curY, playerPos.z);
      playerRig.root.rotation.y = playerPos.rotY;
      playerRig.root.add(playerProxy);
      scene.add(playerRig.root);
    };

    // Real-time Play Together Fishing State Machine (cast arc -> shadow swim -> 1-4 nibbles -> fast '!' bite -> catch or escape)
    const fishVisualFrame: FishingVisualFrame = {
      active: false,
      bobberVisible: false,
      bobberX: 0,
      bobberY: 0,
      bobberZ: 0,
      bobberTiltX: 0,
      bobberTiltZ: 0,
      rippleVisible: false,
      rippleX: 0,
      rippleZ: 0,
      rippleScale: 1,
      rippleOpacity: 0,
      burstVisible: false,
      burstX: 0,
      burstZ: 0,
      burstScale: 1,
      burstOpacity: 0,
      shadowVisible: false,
      shadowX: 0,
      shadowZ: 0,
      shadowRotY: 0,
      shadowScale: 0.72,
      shadowOpacity: 0,
      shadowTailSpeed: 8,
    };

    const fishCtrl = {
      phase: 'idle' as FishingPhase,
      phaseElapsed: 0,
      spotX: 0,
      spotZ: 0,
      facingRotY: 0,
      targetX: -22.5,
      targetZ: 46.6,
      waterY: TOWN_LAKE_WATER_Y,
      startX: 0,
      startY: 1.5,
      startZ: 0,
      spawnX: -22.5,
      spawnZ: 48.8,
      dirToBobberX: 0,
      dirToBobberZ: -1,
      approachRotY: Math.PI,
      rolledCatch: null as {
        speciesId: RiverFishSpeciesId;
        name: string;
        rarity: FishRarity;
        weightKg: number;
        sellPrice: number;
      } | null,
      shadowScale: 0.72,
      biteWindowSec: 1.45,
      waitDelaySec: 0.75,
      approachDurationSec: 0.95,
      nibbleTarget: 2,
      nibblesDone: 0,
      nextNibbleTimer: 0.35,
      nibbleAnimTimer: 0,
      strikeSuspenseSec: 0.5,
      inStrikeSuspense: false,
      landingSplashTimer: 0,
      pullPoseTimer: 0,
      spookTimer: 0,
      spookX: 0,
      spookZ: 0,
      spookRotY: 0,
      spookScale: 0.72,
    };

    const getZoneFishingWaterTarget = (z: ZoneId) => {
      if (z === 'garden') {
        return {targetX: 17.0, targetZ: 3.0, waterY: 0.06};
      }
      if (z === 'fishing') {
        return {targetX: 0, targetZ: -3.25, waterY: -0.14};
      }
      return {targetX: -22.5, targetZ: 46.6, waterY: TOWN_LAKE_WATER_Y};
    };

    const resetFishing = (showSpook = false) => {
      if (showSpook && fishCtrl.phase !== 'idle') {
        fishCtrl.spookTimer = 0.6;
        fishCtrl.spookX = fishVisualFrame.shadowVisible ? fishVisualFrame.shadowX : fishCtrl.targetX;
        fishCtrl.spookZ = fishVisualFrame.shadowVisible ? fishVisualFrame.shadowZ : fishCtrl.targetZ;
        fishCtrl.spookRotY = fishCtrl.approachRotY + Math.PI;
        fishCtrl.spookScale = fishCtrl.shadowScale;
      }
      fishCtrl.phase = 'idle';
      fishCtrl.phaseElapsed = 0;
      fishCtrl.rolledCatch = null;
      fishCtrl.nibbleAnimTimer = 0;
      fishCtrl.inStrikeSuspense = false;
      playerPos.pose = 'idle';
      setFishingState('idle');
      setBiteAlertPos(null);
    };

    cancelFishingRef.current = () => {
      fishCtrl.spookTimer = 0;
      fishCtrl.pullPoseTimer = 0;
      resetFishing(false);
    };

    const handleSpotFishing = (spotX: number, spotZ: number, facingRotY: number) => {
      const rod = stateRef.current.fishingRod;
      if (!rod.owned) {
        soundFX.tap();
        showBubble(
          'Cần mua Cần Câu Gỗ (100 Xu) ở sạp anh Koi gần hồ!',
          spotX,
          2.25,
          spotZ,
        );
        return;
      }
      if (!rod.equipped) {
        soundFX.tap();
        showBubble(
          'Mở Điện Thoại > Túi Đồ > Cần & Vợt để cầm cần câu!',
          spotX,
          2.25,
          spotZ,
        );
        return;
      }
      if (rod.durability <= 0) {
        soundFX.tap();
        showBubble(
          `Cần câu đã hỏng (0/${rod.maxDurability})! Ghé sạp anh Koi để sửa cần.`,
          spotX,
          2.25,
          spotZ,
        );
        return;
      }

      playerPos.rotY = facingRotY;

      if (fishCtrl.phase === 'idle') {
        const zNow = stateRef.current.zone;
        const target = getZoneFishingWaterTarget(zNow);
        const rolled = rollRandomRiverFish();
        const cfg = FISH_RARITY_CONFIG[rolled.species.rarity];

        const gy =
          zNow === 'town'
            ? getTownGroundHeight(spotX, spotZ, currentPlazaRadius)
            : zNow === 'garden'
              ? 0.36
              : 0;

        // Random angle behind/beside the bobber in open water so shadow glides in naturally
        const forwardX = Math.sin(facingRotY);
        const forwardZ = Math.cos(facingRotY);
        const spread = (Math.random() - 0.5) * 1.45;
        const appDirX = Math.sin(facingRotY + spread);
        const appDirZ = Math.cos(facingRotY + spread);

        fishCtrl.phase = 'casting';
        fishCtrl.phaseElapsed = 0;
        fishCtrl.spotX = spotX;
        fishCtrl.spotZ = spotZ;
        fishCtrl.facingRotY = facingRotY;
        fishCtrl.targetX = target.targetX;
        fishCtrl.targetZ = target.targetZ;
        fishCtrl.waterY = target.waterY;
        fishCtrl.startX = spotX + forwardX * 0.72;
        fishCtrl.startY = gy + 1.55;
        fishCtrl.startZ = spotZ + forwardZ * 0.72;
        fishCtrl.spawnX = target.targetX + appDirX * 2.15;
        fishCtrl.spawnZ = target.targetZ + appDirZ * 2.15;
        fishCtrl.dirToBobberX = -appDirX;
        fishCtrl.dirToBobberZ = -appDirZ;
        fishCtrl.approachRotY = Math.atan2(-appDirX, -appDirZ);

        fishCtrl.rolledCatch = {
          speciesId: rolled.species.id,
          name: rolled.species.name,
          rarity: rolled.species.rarity,
          weightKg: rolled.weightKg,
          sellPrice: rolled.sellPrice,
        };
        fishCtrl.shadowScale = cfg.shadowScale;
        fishCtrl.biteWindowSec = cfg.biteWindowMs / 1000;
        fishCtrl.waitDelaySec = 4.0;
        fishCtrl.approachDurationSec = 2.5;
        fishCtrl.nibbleTarget =
          cfg.nibbleMin + Math.floor(Math.random() * (cfg.nibbleMax - cfg.nibbleMin + 1));
        fishCtrl.nibblesDone = 0;
        fishCtrl.nextNibbleTimer = 0.05;
        fishCtrl.nibbleAnimTimer = 0;
        fishCtrl.strikeSuspenseSec = 0.35 + Math.random() * 0.55;
        fishCtrl.inStrikeSuspense = false;
        fishCtrl.landingSplashTimer = 0;
        fishCtrl.pullPoseTimer = 0;
        fishCtrl.spookTimer = 0;

        playerPos.pose = 'fish_cast';
        setFishingState('casting');
        soundFX.tap();
        showBubble('Quăng phao gỗ tròn xuống nước...', spotX, 2.25, spotZ);
      } else if (fishCtrl.phase === 'bite') {
        const preRolled = fishCtrl.rolledCatch
          ? {
              speciesId: fishCtrl.rolledCatch.speciesId,
              weightKg: fishCtrl.rolledCatch.weightKg,
              sellPrice: fishCtrl.rolledCatch.sellPrice,
            }
          : undefined;
        resetFishing(false);
        fishCtrl.pullPoseTimer = 0.44;
        playerPos.pose = 'fish_pull';
        const res = callbacksRef.current.onCatchRiverFish(preRolled);
        if (res) {
          soundFX.sparkle();
          const rareTag = res.rarity === 'rare' ? ' ★ Hiếm!' : '';
          const brokeTag = res.durabilityLeft === 0 ? ' (Hỏng · Cần sửa)' : '';
          showBubble(
            `Câu được ${res.name} (${res.weightKg.toFixed(2)} kg)${rareTag}! Độ bền ${res.durabilityLeft}/${res.maxDurability}${brokeTag}`,
            spotX,
            2.38,
            spotZ,
          );
        }
      } else if (fishCtrl.phase === 'waiting' || fishCtrl.phase === 'nibbling') {
        resetFishing(true);
        soundFX.tap();
        showBubble('Kéo sớm quá! Cá giật mình bơi mất rồi.', spotX, 2.25, spotZ);
      }
    };

    farmPondFishActionRef.current = () => {
      if (stateRef.current.zone !== 'garden') return;
      const spotX = 15.2;
      const spotZ = 3.0;
      const dist = Math.hypot(playerPos.x - spotX, playerPos.z - spotZ);
      if (dist < 1.35 || fishCtrl.phase !== 'idle') {
        handleSpotFishing(spotX, spotZ, Math.PI / 2);
      } else {
        activeTarget = {
          x: spotX,
          z: spotZ,
          arrivePose: 'idle',
          onArrive: () => handleSpotFishing(spotX, spotZ, Math.PI / 2),
        };
      }
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
      // Fast-reflex bite catch: tapping anywhere while '!' is active pulls immediately!
      if (fishCtrl.phase === 'bite') {
        handleSpotFishing(fishCtrl.spotX, fishCtrl.spotZ, fishCtrl.facingRotY);
        return;
      }

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);

      // 0. House Edit Mode: select furniture, stack on furniture surfaces, or snap to wall/floor
      if (stateRef.current.zone === 'home' && stateRef.current.editFurnitureMode) {
        const hits = raycaster.intersectObjects(currentClickTargets, true);
        const selId = stateRef.current.selectedFurnitureId;
        const selPlaced = selId
          ? stateRef.current.placedFurniture.find((p) => p.instanceId === selId)
          : null;
        const selCat = selPlaced ? FURNITURE_BY_ID[selPlaced.catalogId] : null;
        const isSelStackable = Boolean(
          selCat &&
            !selCat.wallMount &&
            selCat.kind !== 'floor_paint' &&
            selCat.kind !== 'wall_paint' &&
            selCat.kind !== 'rug_round' &&
            selCat.kind !== 'kitchen_l_counter',
        );

        let firstWallHitPoint: THREE.Vector3 | null = null;
        for (const h of hits) {
          let obj: THREE.Object3D | null = h.object;
          while (obj && (!obj.userData || !obj.userData.kind)) {
            obj = obj.parent;
          }
          if (obj && obj.userData.furnitureId) {
            const hitFid = obj.userData.furnitureId as string;
            if (selId && isSelStackable && hitFid !== selId) {
              const hitPlaced = stateRef.current.placedFurniture.find(
                (p) => p.instanceId === hitFid,
              );
              const hitCat = hitPlaced ? FURNITURE_BY_ID[hitPlaced.catalogId] : null;
              if (
                hitPlaced &&
                hitCat &&
                !hitCat.wallMount &&
                hitCat.surfaceHeight &&
                isPointOnFurnitureSurface(h.point.x, h.point.z, hitPlaced, hitCat)
              ) {
                soundFX.tap();
                callbacksRef.current.onMoveFurniture(selId, h.point.x, h.point.z);
                return;
              }
            }
            soundFX.tap();
            callbacksRef.current.onSelectFurniture(hitFid);
            return;
          }
          if (!firstWallHitPoint && obj && obj.userData.kind === 'house_wall') {
            firstWallHitPoint = h.point;
          }
        }

        if (selId) {
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

      selectedPlotRef.current = null;
      setArcMenuPos(null);

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

          if (kind === 'outdoor_swing') {
            soundFX.tap();
            const seatInfo: SeatTarget = {
              seatX: data.seatX as number,
              seatZ: data.seatZ as number,
              seatY: (data.seatY as number) || 0.62,
              rotY: (data.sitRotY as number) ?? 0,
              standX: data.tx as number,
              standZ: data.tz as number,
            };
            activeTarget = {
              x: data.tx as number,
              z: data.tz as number,
              arrivePose: 'sit',
              seat: seatInfo,
              onArrive: () => {
                soundFX.sparkle();
                callbacksRef.current.onBoostMood();
                showBubble('Đung đưa xích đu ngoài trời thật thư giãn! (+Vui vẻ)');
              },
            };
            return;
          }

          if (kind === 'outdoor_campfire') {
            soundFX.tap();
            const seatInfo: SeatTarget = {
              seatX: data.seatX as number,
              seatZ: data.seatZ as number,
              seatY: (data.seatY as number) || 0.42,
              rotY: (data.sitRotY as number) ?? Math.PI,
              standX: data.tx as number,
              standZ: data.tz as number,
            };
            activeTarget = {
              x: data.tx as number,
              z: data.tz as number,
              arrivePose: 'sit',
              seat: seatInfo,
              onArrive: () => {
                soundFX.sparkle();
                callbacksRef.current.onBoostMood();
                showBubble('Ngồi sưởi ấm bên bếp lửa trại thật chill! (+Vui vẻ)');
              },
            };
            return;
          }

          if (kind === 'outdoor_telescope') {
            soundFX.tap();
            activeTarget = {
              x: data.tx as number,
              z: data.tz as number,
              arrivePose: 'idle',
              onArrive: () => {
                soundFX.sparkle();
                callbacksRef.current.onBoostMood();
                const isNightNow = stateRef.current.timeOfDay === 'night';
                showBubble(
                  isNightNow
                    ? 'Ngắm trăng sao qua kính thiên văn thật lung linh! (+Vui vẻ)'
                    : 'Ngắm cảnh thị trấn qua kính thiên văn thật tuyệt! (+Vui vẻ)',
                );
              },
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
                const res = callbacksRef.current.onCollectWellWater();
                soundFX.splash();
                if (res.gained > 0) {
                  showBubble(
                    `Thu +${res.gained} nước từ giếng! (${res.waterCan}/${WELL_WATER_MAX})`,
                    data.tx as number,
                    2.0,
                    data.tz as number,
                  );
                } else if (res.waterCan >= WELL_WATER_MAX) {
                  showBubble(
                    `Bình tưới đã đầy (${WELL_WATER_MAX}/${WELL_WATER_MAX})!`,
                    data.tx as number,
                    2.0,
                    data.tz as number,
                  );
                } else {
                  const m = Math.floor(res.nextDropSec / 60);
                  const s = res.nextDropSec % 60;
                  const waitStr = m > 0 ? `${m}p${s}s` : `${s}s`;
                  showBubble(
                    `Giếng đang tích nước (còn ${waitStr} · Bình ${res.waterCan}/${WELL_WATER_MAX})`,
                    data.tx as number,
                    2.0,
                    data.tz as number,
                  );
                }
              },
            };
            return;
          }

          if (kind === 'plot') {
            soundFX.tap();
            const plotId = data.plotId as number;
            const plotCenterX = (data.px as number) ?? (data.tx as number);
            const plotCenterZ = (data.pz as number) ?? (data.tz as number);
            const tx = data.tx as number;
            const tz = data.tz as number;
            const targetPlot = stateRef.current.plots.find((p) => p.id === plotId);

            if (targetPlot && targetPlot.stage === 'ready' && !targetPlot.hasPest) {
              selectedPlotRef.current = null;
              setArcMenuPos(null);
              const doHarvest = () => {
                const harvested = callbacksRef.current.onHarvestPlot(plotId);
                if (harvested) {
                  soundFX.sparkle();
                  showBubble('Thu hoạch +2 nông sản!', tx, 2.0, tz);
                } else {
                  soundFX.tap();
                  showBubble('Nhà kho đã đầy! Bán bớt hoặc nâng cấp kho', tx, 2.0, tz);
                }
              };
              const distNow = Math.hypot(playerPos.x - tx, playerPos.z - tz);
              if (distNow < 0.85) {
                doHarvest();
              } else {
                activeTarget = {
                  x: tx,
                  z: tz,
                  arrivePose: 'idle',
                  onArrive: doHarvest,
                };
              }
              return;
            }

            if (targetPlot) {
              const anchorVec = new THREE.Vector3(plotCenterX, 0.38, plotCenterZ);
              const cw = container?.clientWidth || window.innerWidth || 800;
              const ch = container?.clientHeight || window.innerHeight || 600;
              _projVec.copy(anchorVec).project(camera);
              const rawX = ((_projVec.x + 1) / 2) * cw;
              const rawY = ((-_projVec.y + 1) / 2) * ch;
              const padX = Math.min(185, cw * 0.38);
              const minY = Math.min(185, ch * 0.45);
              selectedPlotRef.current = {plotId, worldPos: anchorVec};
              setArcMenuPos({
                plotId,
                x: Math.max(padX, Math.min(cw - padX, rawX)),
                y: Math.max(minY, Math.min(ch - 60, rawY)),
              });
              // Auto-walk to plot in background without blocking the radial menu
              activeTarget = {
                x: tx,
                z: tz,
                arrivePose: 'idle',
              };
            }
            return;
          }

          if (kind === 'farm_mill') {
            soundFX.tap();
            activeTarget = {
              x: data.tx as number,
              z: data.tz as number,
              arrivePose: 'idle',
              onArrive: () => {
                soundFX.sparkle();
                callbacksRef.current.onOpenWorkshop('mill');
              },
            };
            return;
          }

          if (kind === 'farm_kitchen') {
            soundFX.tap();
            activeTarget = {
              x: data.tx as number,
              z: data.tz as number,
              arrivePose: 'idle',
              onArrive: () => {
                soundFX.sparkle();
                callbacksRef.current.onOpenWorkshop('kitchen');
              },
            };
            return;
          }

          if (kind === 'order_board') {
            soundFX.tap();
            activeTarget = {
              x: data.tx as number,
              z: data.tz as number,
              arrivePose: 'idle',
              onArrive: () => {
                soundFX.sparkle();
                callbacksRef.current.onOpenOrders();
              },
            };
            return;
          }

          if (kind === 'farm_storage') {
            soundFX.tap();
            activeTarget = {
              x: data.tx as number,
              z: data.tz as number,
              arrivePose: 'idle',
              onArrive: () => {
                soundFX.sparkle();
                callbacksRef.current.onOpenStorage();
              },
            };
            return;
          }

          if (kind === 'pasture_spot') {
            soundFX.tap();
            const targetCoop = data.coop as CoopKind | undefined;
            activeTarget = {
              x: data.tx as number,
              z: data.tz as number,
              arrivePose: 'idle',
              onArrive: () => {
                soundFX.sparkle();
                callbacksRef.current.onOpenPasture(targetCoop);
              },
            };
            return;
          }

          if (kind === 'pond_spot') {
            soundFX.tap();
            if (stateRef.current.fishingState !== 'idle') {
              handleSpotFishing(15.2, 3.0, Math.PI / 2);
              return;
            }
            activeTarget = {
              x: data.tx as number,
              z: data.tz as number,
              arrivePose: 'idle',
              onArrive: () => {
                soundFX.splash();
                callbacksRef.current.onOpenPond();
              },
            };
            return;
          }

          if (kind === 'farm_shop') {
            soundFX.tap();
            activeTarget = {
              x: data.tx as number,
              z: data.tz as number,
              arrivePose: 'idle',
              onArrive: () => {
                soundFX.sparkle();
                callbacksRef.current.onOpenFarmShop();
              },
            };
            return;
          }

          if (kind === 'town_lake_fish') {
            soundFX.tap();
            const spotX = data.tx as number;
            const spotZ = data.tz as number;
            if (fishCtrl.phase !== 'idle') {
              handleSpotFishing(spotX, spotZ, 0);
              return;
            }
            activeTarget = {
              x: spotX,
              z: spotZ,
              arrivePose: 'idle',
              onArrive: () => {
                handleSpotFishing(spotX, spotZ, 0);
              },
            };
            return;
          }

          if (kind === 'fish_cast') {
            soundFX.tap();
            const spotX = data.tx as number;
            const spotZ = data.tz as number;
            if (fishCtrl.phase !== 'idle') {
              handleSpotFishing(spotX, spotZ, Math.PI);
              return;
            }
            activeTarget = {
              x: spotX,
              z: spotZ,
              arrivePose: 'idle',
              onArrive: () => {
                handleSpotFishing(spotX, spotZ, Math.PI);
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
                callbacksRef.current.onAddCoins(8);
                showBubble('Gắp trúng Gấu Bông! +8 Xu', playerPos.x, 2.1, playerPos.z);
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

          if (kind === 'open_furniture_shop') {
            soundFX.tap();
            activeTarget = {
              x: data.tx as number,
              z: data.tz as number,
              arrivePose: 'idle',
              onArrive: () => {
                soundFX.sparkle();
                callbacksRef.current.onOpenFurnitureShop();
              },
            };
            return;
          }

          if (kind === 'koi_shop') {
            soundFX.tap();
            activeTarget = {
              x: data.tx as number,
              z: data.tz as number,
              arrivePose: 'idle',
              onArrive: () => {
                soundFX.sparkle();
                callbacksRef.current.onOpenKoiShop();
              },
            };
            return;
          }
        }
      }

      // 2. Tap on walkable ground or hill -> close arc menu, cancel active wait if walking away, nudge outside obstacle & walk
      if (currentGrounds.length > 0) {
        const groundHits = raycaster.intersectObjects(currentGrounds, false);
        if (groundHits.length > 0) {
          if (fishCtrl.phase !== 'idle') {
            resetFishing(true);
          }
          if (selectedPlotRef.current) {
            selectedPlotRef.current = null;
            setArcMenuPos(null);
          }
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

    let fullscreenUnavailable = false;
    const tryEnterBrowserFullscreen = () => {
      if (fullscreenUnavailable) return;
      try {
        const doc = document as Document & {
          webkitFullscreenElement?: Element | null;
          webkitFullscreenEnabled?: boolean;
        };
        if (doc.fullscreenElement || doc.webkitFullscreenElement) return;
        const el = document.documentElement as HTMLElement & {
          webkitRequestFullscreen?: () => Promise<void> | void;
        };
        if (typeof el.requestFullscreen === 'function') {
          if (doc.fullscreenEnabled === false) {
            fullscreenUnavailable = true;
            return;
          }
          const req = el.requestFullscreen();
          if (req && typeof req.catch === 'function') {
            req.catch(() => {
              // Blocked by browser/iframe policy — ignore cleanly
            });
          }
        } else if (typeof el.webkitRequestFullscreen === 'function') {
          el.webkitRequestFullscreen();
        } else {
          fullscreenUnavailable = true;
        }
      } catch {
        fullscreenUnavailable = true;
      }
    };

    let downX = 0;
    let downY = 0;
    const onPointerDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
      tryEnterBrowserFullscreen();
    };
    const onWindowGameTouch = () => {
      tryEnterBrowserFullscreen();
    };
    const onPointerUp = (e: PointerEvent) => {
      const tapLimit = fishCtrl.phase === 'bite' ? 36 : 12;
      if (Math.hypot(e.clientX - downX, e.clientY - downY) < tapLimit) {
        handlePointerTap(e.clientX, e.clientY);
      }
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointerdown', onWindowGameTouch, {passive: true});

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
    document.addEventListener('fullscreenchange', handleResize);
    document.addEventListener('webkitfullscreenchange', handleResize);
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    let frameId = 0;
    let disposed = false;
    let lastTagPush = 0;
    let lastHadTags = false;
    let biteAlertShown = false;
    let lastBiteAlertX = -9999;
    let lastBiteAlertY = -9999;
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
      if (document.hidden) {
        clock.getDelta();
        frameId = window.setTimeout(() => {
          if (!disposed) frameId = requestAnimationFrame(tick);
        }, 250);
        return;
      }
      const delta = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.getElapsedTime();
      const {zone: z, timeOfDay: tod, avatar: av} = stateRef.current;

      const isIndoor = z === 'home' || z === 'boutique' || z === 'arcade';
      const targetBg =
        tod === 'night'
          ? isIndoor
            ? 0x161c30
            : 0x101e38
          : tod === 'sunset'
            ? 0xeb9c76
            : 0xb2ddf2;
      _bgColorTarget.setHex(targetBg);
      (scene.background as THREE.Color).lerp(_bgColorTarget, 0.08);
      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.color.copy(scene.background as THREE.Color);
        scene.fog.density = THREE.MathUtils.damp(
          scene.fog.density,
          tod === 'night' && !isIndoor ? 0.0025 : 0.0021,
          5,
          delta,
        );
      }
      scene.environmentIntensity = THREE.MathUtils.damp(
        scene.environmentIntensity,
        tod === 'night' ? (isIndoor ? 0.28 : 0.16) : tod === 'sunset' ? 0.34 : 0.42,
        5,
        delta,
      );
      renderer.toneMappingExposure = THREE.MathUtils.damp(
        renderer.toneMappingExposure,
        tod === 'night' ? 0.88 : 0.96,
        5,
        delta,
      );
      sunLight.intensity = THREE.MathUtils.damp(
        sunLight.intensity,
        tod === 'night' ? (isIndoor ? 0.65 : 0.52) : tod === 'sunset' ? 1.04 : 1.22,
        5,
        delta,
      );
      _sunColorTarget.set(
        tod === 'night'
          ? isIndoor
            ? '#CBD8F5'
            : '#BFD6FF'
          : tod === 'sunset'
            ? '#FFAE70'
            : '#FFF2D8',
      );
      sunLight.color.lerp(_sunColorTarget, 0.08);
      hemiLight.intensity = THREE.MathUtils.damp(
        hemiLight.intensity,
        tod === 'night' ? 0.38 : tod === 'sunset' ? 0.48 : 0.58,
        5,
        delta,
      );
      _hemiSkyTarget.set(
        tod === 'night'
          ? isIndoor
            ? '#7A90BF'
            : '#5478B8'
          : tod === 'sunset'
            ? '#FFD6BA'
            : '#DCEFFF',
      );
      _hemiGroundTarget.set(
        tod === 'night'
          ? isIndoor
            ? '#3F3A36'
            : '#223B3E'
          : tod === 'sunset'
            ? '#6D6854'
            : '#6A8C58',
      );
      hemiLight.color.lerp(_hemiSkyTarget, 0.08);
      hemiLight.groundColor.lerp(_hemiGroundTarget, 0.08);
      rimLight.intensity = THREE.MathUtils.damp(
        rimLight.intensity,
        tod === 'night' ? 0.26 : tod === 'sunset' ? 0.34 : 0.42,
        5,
        delta,
      );
      _rimColorTarget.set(
        tod === 'night' ? '#87B0F0' : tod === 'sunset' ? '#FFB585' : '#A8D2FF',
      );
      rimLight.color.lerp(_rimColorTarget, 0.08);

      if (cameraTransitionActive) {
        const w = container?.clientWidth || window.innerWidth || 800;
        const h = container?.clientHeight || window.innerHeight || 600;
        const camCfg = getResponsiveCameraSettings(z, w / h);
        camera.fov = THREE.MathUtils.damp(camera.fov, camCfg.fov, 6, delta);
        camera.updateProjectionMatrix();
        const spawnGroundY =
          z === 'town' ? getTownGroundHeight(playerPos.x, playerPos.z, currentPlazaRadius) : 0;
        _camLookTarget.set(playerPos.x, spawnGroundY + 0.92, playerPos.z);
        _camPosTarget.set(
          playerPos.x + (camCfg.pos[0] - camCfg.look[0]),
          spawnGroundY + camCfg.pos[1],
          playerPos.z + (camCfg.pos[2] - camCfg.look[2]),
        );
        camera.position.x = THREE.MathUtils.damp(camera.position.x, _camPosTarget.x, 7, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _camPosTarget.y, 7, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _camPosTarget.z, 7, delta);
        controls.target.x = THREE.MathUtils.damp(controls.target.x, _camLookTarget.x, 7, delta);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, _camLookTarget.y, 7, delta);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, _camLookTarget.z, 7, delta);
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

      let groundOffset = 0.02;
      if (playerPos.pose === 'sit' && activeSeat) {
        groundOffset = activeSeat.seatY - 0.245;
      } else if (playerPos.pose === 'sleep' && activeSeat?.isBed) {
        groundOffset = 0;
      } else if (z === 'town') {
        groundOffset = getTownGroundHeight(playerPos.x, playerPos.z, currentPlazaRadius);
      } else if (z === 'garden' && playerPos.x > 9.35 && playerPos.x < 15.9 && Math.abs(playerPos.z - 3.0) < 0.98) {
        groundOffset = 0.36;
      }
      prevGroundY = groundOffset;

      // Keep camera & OrbitControls always centered smoothly on the player character
      if (!cameraTransitionActive) {
        const focusX = playerPos.x;
        const focusY = groundOffset + 0.92;
        const focusZ = playerPos.z;
        const followAlpha = 1 - Math.exp(-16 * delta);
        const nextTx = THREE.MathUtils.lerp(controls.target.x, focusX, followAlpha);
        const nextTy = THREE.MathUtils.lerp(controls.target.y, focusY, followAlpha);
        const nextTz = THREE.MathUtils.lerp(controls.target.z, focusZ, followAlpha);
        const dCamX = nextTx - controls.target.x;
        const dCamY = nextTy - controls.target.y;
        const dCamZ = nextTz - controls.target.z;
        controls.target.set(nextTx, nextTy, nextTz);
        camera.position.x += dCamX;
        camera.position.y += dCamY;
        camera.position.z += dCamZ;
      }

      controls.update();

      if (z === 'home') {
        homeSpotRef.current.x = playerPos.x;
        homeSpotRef.current.z = playerPos.z;
        if (
          !stateRef.current.editFurnitureMode &&
          !homeExitTriggeredRef.current &&
          Math.abs(playerPos.x + 1.8) < 1.05 &&
          playerPos.z >= 6.84
        ) {
          homeExitTriggeredRef.current = true;
          activeTarget = null;
          soundFX.enterDoor();
          callbacksRef.current.onChangeZone('town');
        }
      }

      if (z === 'home' && stateRef.current.editFurnitureMode && stateRef.current.selectedFurnitureId) {
        const sel = stateRef.current.placedFurniture.find(
          (p) => p.instanceId === stateRef.current.selectedFurnitureId,
        );
        const cat = sel ? FURNITURE_BY_ID[sel.catalogId] : null;
        if (sel && cat) {
          selectionRing.visible = true;
          selectionRing.position.set(sel.x, (sel.y ?? 0) + 0.03, sel.z);
          const ringRadius =
            Math.max(cat.halfW, cat.halfD) * 1.28 + Math.sin(elapsed * 5) * 0.035;
          selectionRing.scale.set(ringRadius, ringRadius, 1);
        } else {
          selectionRing.visible = false;
        }
      } else {
        selectionRing.visible = false;
      }

      // Play Together Fishing Timeline Driver
      let avatarPoseProgress = 0;
      if (fishCtrl.pullPoseTimer > 0) {
        fishCtrl.pullPoseTimer = Math.max(0, fishCtrl.pullPoseTimer - delta);
        playerPos.pose = fishCtrl.pullPoseTimer > 0 ? 'fish_pull' : 'idle';
        avatarPoseProgress = 1 - fishCtrl.pullPoseTimer / 0.44;
      }

      if (fishCtrl.spookTimer > 0) {
        fishCtrl.spookTimer = Math.max(0, fishCtrl.spookTimer - delta);
      }

      if (fishCtrl.landingSplashTimer > 0) {
        fishCtrl.landingSplashTimer = Math.max(0, fishCtrl.landingSplashTimer - delta);
      }

      if (fishCtrl.phase !== 'idle') {
        fishCtrl.phaseElapsed += delta;
        fishVisualFrame.active = true;
        fishVisualFrame.bobberVisible = true;
        fishVisualFrame.rippleVisible = false;
        fishVisualFrame.burstVisible = false;
        fishVisualFrame.shadowVisible = false;

        if (fishCtrl.phase === 'casting') {
          const castDur = 0.46;
          avatarPoseProgress = Math.min(1, fishCtrl.phaseElapsed / castDur);
          const u = THREE.MathUtils.clamp((fishCtrl.phaseElapsed - 0.14) / 0.32, 0, 1);
          fishVisualFrame.bobberX = THREE.MathUtils.lerp(fishCtrl.startX, fishCtrl.targetX, u);
          fishVisualFrame.bobberZ = THREE.MathUtils.lerp(fishCtrl.startZ, fishCtrl.targetZ, u);
          fishVisualFrame.bobberY =
            THREE.MathUtils.lerp(fishCtrl.startY, fishCtrl.waterY, u) + Math.sin(u * Math.PI) * 1.15;
          fishVisualFrame.bobberTiltX = (1 - u) * 0.45;
          fishVisualFrame.bobberTiltZ = 0;

          if (fishCtrl.phaseElapsed >= castDur) {
            fishCtrl.phase = 'waiting';
            fishCtrl.phaseElapsed = 0;
            fishCtrl.landingSplashTimer = 0.52;
            playerPos.pose = 'fish_wait';
            setFishingState('waiting');
            soundFX.splash();
          }
        } else if (fishCtrl.phase === 'waiting') {
          playerPos.pose = 'fish_wait';
          fishVisualFrame.bobberX = fishCtrl.targetX;
          fishVisualFrame.bobberZ = fishCtrl.targetZ;
          const splashDrop =
            fishCtrl.landingSplashTimer > 0
              ? -Math.sin((fishCtrl.landingSplashTimer / 0.52) * Math.PI) * 0.08
              : 0;
          fishVisualFrame.bobberY = fishCtrl.waterY + splashDrop + Math.sin(elapsed * 3.0) * 0.02;
          fishVisualFrame.bobberTiltX = 0;
          fishVisualFrame.bobberTiltZ = Math.sin(elapsed * 2.5) * 0.04;

          fishVisualFrame.rippleVisible = true;
          fishVisualFrame.rippleX = fishCtrl.targetX;
          fishVisualFrame.rippleZ = fishCtrl.targetZ;
          const rt = (elapsed * 0.72) % 1;
          fishVisualFrame.rippleScale = 0.65 + rt * 1.35;
          fishVisualFrame.rippleOpacity = (1 - rt) * 0.58;

          if (fishCtrl.landingSplashTimer > 0) {
            const bt = 1 - fishCtrl.landingSplashTimer / 0.52;
            fishVisualFrame.burstVisible = true;
            fishVisualFrame.burstX = fishCtrl.targetX;
            fishVisualFrame.burstZ = fishCtrl.targetZ;
            fishVisualFrame.burstScale = 0.6 + bt * 2.0;
            fishVisualFrame.burstOpacity = (1 - bt) * 0.85;
          }

          // Fish shadow emerges & glides smoothly toward bobber
          if (fishCtrl.phaseElapsed >= fishCtrl.waitDelaySec) {
            const swimU = Math.min(
              1,
              (fishCtrl.phaseElapsed - fishCtrl.waitDelaySec) / fishCtrl.approachDurationSec,
            );
            const easeU = 1 - Math.pow(1 - swimU, 2.2);
            const appDist = THREE.MathUtils.lerp(2.15, 0.44, easeU);
            fishVisualFrame.shadowVisible = true;
            fishVisualFrame.shadowX = fishCtrl.targetX - fishCtrl.dirToBobberX * appDist;
            fishVisualFrame.shadowZ = fishCtrl.targetZ - fishCtrl.dirToBobberZ * appDist;
            fishVisualFrame.shadowRotY = fishCtrl.approachRotY;
            fishVisualFrame.shadowScale = fishCtrl.shadowScale;
            fishVisualFrame.shadowOpacity = Math.min(0.48, swimU * 0.9);
            fishVisualFrame.shadowTailSpeed = 9;

            if (swimU >= 1) {
              fishCtrl.phase = 'nibbling';
              fishCtrl.phaseElapsed = 0;
              fishCtrl.nibblesDone = 0;
              fishCtrl.nextNibbleTimer = 0.05;
              fishCtrl.nibbleAnimTimer = 0;
              fishCtrl.inStrikeSuspense = false;
              setFishingState('nibbling');
            }
          }
        } else if (fishCtrl.phase === 'nibbling') {
          playerPos.pose = 'fish_wait';
          let lunge = 0;
          let bobDip = 0;

          if (fishCtrl.nibbleAnimTimer > 0) {
            fishCtrl.nibbleAnimTimer = Math.max(0, fishCtrl.nibbleAnimTimer - delta);
            const nu = 1 - fishCtrl.nibbleAnimTimer / 0.34;
            const poke = Math.sin(nu * Math.PI);
            lunge = poke * 0.22;
            bobDip = -poke * 0.085;

            fishVisualFrame.burstVisible = true;
            fishVisualFrame.burstX = fishCtrl.targetX;
            fishVisualFrame.burstZ = fishCtrl.targetZ;
            fishVisualFrame.burstScale = 0.55 + nu * 1.45;
            fishVisualFrame.burstOpacity = (1 - nu) * 0.72;
          } else if (!fishCtrl.inStrikeSuspense) {
            fishCtrl.nextNibbleTimer -= delta;
            if (fishCtrl.nextNibbleTimer <= 0) {
              fishCtrl.nibblesDone += 1;
              fishCtrl.nibbleAnimTimer = 0.34;
              soundFX.tap();
              if (fishCtrl.nibblesDone >= fishCtrl.nibbleTarget) {
                fishCtrl.inStrikeSuspense = true;
              } else {
                fishCtrl.nextNibbleTimer = 0.68 + Math.random() * 0.55;
              }
            }
          } else {
            fishCtrl.strikeSuspenseSec -= delta;
            if (fishCtrl.strikeSuspenseSec <= 0) {
              fishCtrl.phase = 'bite';
              fishCtrl.phaseElapsed = 0;
              setFishingState('bite');
              soundFX.sparkle();
            }
          }

          const standOff = 0.44 - lunge;
          fishVisualFrame.bobberX = fishCtrl.targetX;
          fishVisualFrame.bobberZ = fishCtrl.targetZ;
          fishVisualFrame.bobberY = fishCtrl.waterY + bobDip + Math.sin(elapsed * 3.5) * 0.018;
          fishVisualFrame.bobberTiltX = bobDip * 2.2;
          fishVisualFrame.bobberTiltZ = Math.sin(elapsed * 12) * Math.abs(bobDip) * 2.0;

          fishVisualFrame.rippleVisible = true;
          fishVisualFrame.rippleX = fishCtrl.targetX;
          fishVisualFrame.rippleZ = fishCtrl.targetZ;
          const rt = (elapsed * 0.95) % 1;
          fishVisualFrame.rippleScale = 0.65 + rt * 1.5;
          fishVisualFrame.rippleOpacity = (1 - rt) * 0.64;

          fishVisualFrame.shadowVisible = true;
          fishVisualFrame.shadowX = fishCtrl.targetX - fishCtrl.dirToBobberX * standOff;
          fishVisualFrame.shadowZ = fishCtrl.targetZ - fishCtrl.dirToBobberZ * standOff;
          fishVisualFrame.shadowRotY = fishCtrl.approachRotY;
          fishVisualFrame.shadowScale = fishCtrl.shadowScale;
          fishVisualFrame.shadowOpacity = 0.48;
          fishVisualFrame.shadowTailSpeed = fishCtrl.nibbleAnimTimer > 0 ? 18 : 10;
        } else if (fishCtrl.phase === 'bite') {
          playerPos.pose = 'fish_wait';
          const shake = Math.sin(elapsed * 34);
          fishVisualFrame.bobberX = fishCtrl.targetX + shake * 0.04;
          fishVisualFrame.bobberZ = fishCtrl.targetZ + Math.cos(elapsed * 29) * 0.04;
          fishVisualFrame.bobberY = fishCtrl.waterY - 0.14 + Math.sin(elapsed * 28) * 0.055;
          fishVisualFrame.bobberTiltX = shake * 0.42;
          fishVisualFrame.bobberTiltZ = Math.cos(elapsed * 26) * 0.42;

          fishVisualFrame.rippleVisible = true;
          fishVisualFrame.rippleX = fishCtrl.targetX;
          fishVisualFrame.rippleZ = fishCtrl.targetZ;
          const rt1 = (elapsed * 2.1) % 1;
          fishVisualFrame.rippleScale = 0.6 + rt1 * 2.1;
          fishVisualFrame.rippleOpacity = (1 - rt1) * 0.92;

          fishVisualFrame.burstVisible = true;
          fishVisualFrame.burstX = fishCtrl.targetX;
          fishVisualFrame.burstZ = fishCtrl.targetZ;
          const rt2 = (elapsed * 2.1 + 0.5) % 1;
          fishVisualFrame.burstScale = 0.55 + rt2 * 1.85;
          fishVisualFrame.burstOpacity = (1 - rt2) * 0.85;

          fishVisualFrame.shadowVisible = true;
          fishVisualFrame.shadowX = fishCtrl.targetX - fishCtrl.dirToBobberX * 0.14;
          fishVisualFrame.shadowZ = fishCtrl.targetZ - fishCtrl.dirToBobberZ * 0.14;
          fishVisualFrame.shadowRotY =
            fishCtrl.approachRotY + Math.sin(elapsed * 24) * 0.18;
          fishVisualFrame.shadowScale = fishCtrl.shadowScale;
          fishVisualFrame.shadowOpacity = 0.54;
          fishVisualFrame.shadowTailSpeed = 28;

          // Reaction timeout: fish escapes and still reduces rod durability!
          if (fishCtrl.phaseElapsed >= fishCtrl.biteWindowSec) {
            const sx = fishCtrl.spotX;
            const sz = fishCtrl.spotZ;
            resetFishing(true);
            soundFX.splash();
            const durRes = callbacksRef.current.onLoseFishingDurability();
            const brokeTag = durRes.durabilityLeft === 0 ? ' (Hỏng · Cần sửa)' : '';
            showBubble(
              `Cá kéo mạnh quá, chạy mất rồi! Độ bền ${durRes.durabilityLeft}/${durRes.maxDurability}${brokeTag}`,
              sx,
              2.35,
              sz,
            );
          }
        }
      } else {
        fishVisualFrame.active = fishCtrl.spookTimer > 0;
        fishVisualFrame.bobberVisible = false;
        fishVisualFrame.rippleVisible = false;
        fishVisualFrame.burstVisible = false;
        if (fishCtrl.spookTimer > 0) {
          const su = 1 - fishCtrl.spookTimer / 0.6;
          fishVisualFrame.shadowVisible = true;
          fishVisualFrame.shadowX =
            fishCtrl.spookX + Math.sin(fishCtrl.spookRotY) * (su * 2.4);
          fishVisualFrame.shadowZ =
            fishCtrl.spookZ + Math.cos(fishCtrl.spookRotY) * (su * 2.4);
          fishVisualFrame.shadowRotY = fishCtrl.spookRotY;
          fishVisualFrame.shadowScale = fishCtrl.spookScale;
          fishVisualFrame.shadowOpacity = Math.max(0, (1 - su) * 0.45);
          fishVisualFrame.shadowTailSpeed = 26;
        } else {
          fishVisualFrame.shadowVisible = false;
        }
      }

      // Hide dangling mini bobber + line on held rod whenever bobber is cast out
      const showHeldMiniBobber = fishCtrl.phase === 'idle';
      if (playerRig.rodBobber) playerRig.rodBobber.visible = showHeldMiniBobber;
      if (playerRig.rodLine) playerRig.rodLine.visible = showHeldMiniBobber;

      playerRig.root.position.set(playerPos.x, groundOffset, playerPos.z);
      playerRig.root.rotation.y = playerPos.rotY;
      updateAvatarRigAnimation(
        playerRig,
        playerPos.pose,
        elapsed,
        av.eyeStyle === 'cozy',
        avatarPoseProgress,
      );

      if (z === 'town') {
        activeTown?.updateFishingVisuals?.(fishVisualFrame, elapsed);
        activeTown?.update(elapsed, tod);
      } else {
        if (z === 'garden' || z === 'fishing') {
          activeSubzone?.updateFishingVisuals?.(fishVisualFrame, elapsed);
        }
        activeSubzone?.update(
          elapsed,
          tod,
          z === 'home' ? {cameraPos: camera.position, playerPos} : undefined,
        );
      }

      renderer.render(scene, camera);

      // Instant project of '!' Bite Exclamation Alert over bobber every frame during bite (ultra-snappy)
      if (fishCtrl.phase === 'bite') {
        const cw = container?.clientWidth || window.innerWidth || 800;
        const ch = container?.clientHeight || window.innerHeight || 600;
        _projVec
          .set(fishCtrl.targetX, fishCtrl.waterY + 0.72, fishCtrl.targetZ)
          .project(camera);
        if (_projVec.z <= 1) {
          const bx = ((_projVec.x + 1) / 2) * cw;
          const by = ((-_projVec.y + 1) / 2) * ch;
          if (
            !biteAlertShown ||
            Math.abs(bx - lastBiteAlertX) >= 1 ||
            Math.abs(by - lastBiteAlertY) >= 1
          ) {
            biteAlertShown = true;
            lastBiteAlertX = bx;
            lastBiteAlertY = by;
            setBiteAlertPos({x: bx, y: by});
          }
        }
      } else if (biteAlertShown) {
        biteAlertShown = false;
        lastBiteAlertX = -9999;
        lastBiteAlertY = -9999;
        setBiteAlertPos(null);
      }

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

        const isNearPondNow =
          z === 'garden' &&
          playerPos.x >= 8.4 &&
          playerPos.x <= 21.4 &&
          playerPos.z >= -4.2 &&
          playerPos.z <= 10.2;
        if (isNearPondNow !== nearPondRef.current) {
          nearPondRef.current = isNearPondNow;
          setNearPond(isNearPondNow);
          if (!isNearPondNow) setConfirmPondFeed(false);
          callbacksRef.current.onPondProximityChange(isNearPondNow);
        }

        if (selectedPlotRef.current && z === 'garden') {
          _projVec.copy(selectedPlotRef.current.worldPos).project(camera);
          if (_projVec.z <= 1) {
            const rawX = ((_projVec.x + 1) / 2) * cw;
            const rawY = ((-_projVec.y + 1) / 2) * ch;
            const padX = Math.min(185, cw * 0.38);
            const minY = Math.min(185, ch * 0.45);
            const nx = Math.max(padX, Math.min(cw - padX, rawX));
            const ny = Math.max(minY, Math.min(ch - 60, rawY));
            const pid = selectedPlotRef.current.plotId;
            setArcMenuPos((prev) =>
              prev && prev.plotId === pid && Math.abs(prev.x - nx) < 1 && Math.abs(prev.y - ny) < 1
                ? prev
                : {plotId: pid, x: nx, y: ny},
            );
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
      window.removeEventListener('pointerdown', onWindowGameTouch);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      document.removeEventListener('fullscreenchange', handleResize);
      document.removeEventListener('webkitfullscreenchange', handleResize);
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
      onAddCoins(15);
      showBubble('Phá đảo Bắt Sao! +15 Xu', -1.95, 2.1, -1.35);
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

        {biteAlertPos && (
          <div
            style={{
              transform: `translate3d(${biteAlertPos.x}px, ${biteAlertPos.y}px, 0) translate(-50%, -100%)`,
            }}
            className="anim-pop absolute top-0 left-0 z-30 flex flex-col items-center"
          >
            <div className="flex h-11 w-11 animate-bounce items-center justify-center rounded-full border-3 border-white bg-[#EF476F] text-2xl font-black text-white shadow-[0_6px_18px_rgba(239,71,111,0.6)]">
              !
            </div>
            <span className="mt-1 rounded-full bg-[#382414]/88 px-2.5 py-0.5 text-[10px] font-extrabold text-[#FFD166] shadow-sm whitespace-nowrap">
              Giật Cần Ngay!
            </span>
          </div>
        )}

      </div>

      {speechBubble && (
        <div className="anim-pop pointer-events-none absolute top-3 left-1/2 z-30 w-max max-w-[min(78vw,360px)] -translate-x-1/2 rounded-2xl border-2 border-[#7A5230]/35 bg-[#FFFDF8]/95 px-4 py-1.5 text-center text-xs font-bold text-[#3F2C1E] shadow-lg">
          {speechBubble}
        </div>
      )}

      {/* Radial Arc Plot Menu (Pure icon-only buttons over the tapped garden bed) */}
      {zone === 'garden' &&
        arcMenuPos &&
        (() => {
          const arcPlot = plots.find((p) => p.id === arcMenuPos.plotId);
          if (!arcPlot) return null;
          return (
            <PlotArcMenu
              plot={arcPlot}
              screenX={arcMenuPos.x}
              screenY={arcMenuPos.y}
              coins={stats.coins}
              seeds={seeds}
              bugSprayCount={bugSprayCount}
              waterCount={waterCount}
              onPlant={onPlantPlot}
              onWater={onWaterPlot}
              onSprayPest={onSprayPestPlot}
              onWeed={onWeedPlot}
              onCancelCrop={onCancelCropPlot}
              onUpgradePlot={onUpgradePlot}
              onClose={() => {
                selectedPlotRef.current = null;
                setArcMenuPos(null);
              }}
            />
          );
        })()}

      {/* Top-Left Compact Smartphone Icon Button */}
      {!miniActive && !(zone === 'home' && editFurnitureMode) && (
        <button
          type="button"
          onClick={() => {
            soundFX.tap();
            onOpenPhone();
          }}
          aria-label="Mở điện thoại"
          className="phone-ui absolute top-2.5 left-2.5 z-30 flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-[#3C3128] bg-[#FFF9EF]/95 text-[#3B2B1E] shadow-lg transition-transform hover:scale-105 active:scale-95"
        >
          <span
            aria-hidden="true"
            className="relative flex h-7 w-5 shrink-0 flex-col items-center justify-between rounded-[6px] border-[1.75px] border-[#2C2421] bg-gradient-to-b from-[#6CC4DE] to-[#56A888] p-[2px] shadow-xs"
          >
            <span className="h-[2px] w-2 rounded-full bg-[#2C2421]/75" />
            <span className="grid grid-cols-2 gap-[2px]">
              <span className="h-1 w-1 rounded-[1px] bg-white/95" />
              <span className="h-1 w-1 rounded-[1px] bg-[#FFE596]" />
              <span className="h-1 w-1 rounded-[1px] bg-[#FFD3DB]" />
              <span className="h-1 w-1 rounded-[1px] bg-white/95" />
            </span>
            <span className="h-[2px] w-2.5 rounded-full bg-white/80" />
          </span>
        </button>
      )}

      {/* Compact collapsible top-right arrow toolbar inside House */}
      {zone === 'home' && (
        <div className="absolute top-2.5 right-2.5 z-30 flex items-center gap-1.5">
          {(homeToolsOpen || editFurnitureMode) && (
            <div className="anim-pop flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  soundFX.tap();
                  onOpenFurniture();
                }}
                className="flex min-h-[30px] items-center gap-1 rounded-xl border-2 border-[#8C6239] bg-[#FFF8EB] px-2 py-1 text-[11px] font-bold text-[#4A3525] shadow-md transition-transform active:scale-95"
              >
                <Armchair className="h-3.5 w-3.5 text-[#9A5B25]" />
                <span>Tủ nội thất</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundFX.tap();
                  if (editFurnitureMode) setHomeToolsOpen(false);
                  onToggleEditFurniture();
                }}
                className={`flex min-h-[30px] items-center gap-1 rounded-xl border-2 px-2 py-1 text-[11px] font-bold shadow-md transition-transform active:scale-95 ${
                  editFurnitureMode
                    ? 'border-[#B95D3B] bg-[#DF7B57] text-white'
                    : 'border-[#8C6239] bg-[#FFF8EB] text-[#4A3525]'
                }`}
              >
                <Move className="h-3.5 w-3.5" />
                <span>{editFurnitureMode ? 'Xong' : 'Di chuyển'}</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              soundFX.tap();
              setHomeToolsOpen((prev) => !prev);
            }}
            aria-label="Mở công cụ nhà"
            className="flex h-8 w-8 items-center justify-center rounded-xl border-2 border-[#8C6239] bg-[#FFF8EB] text-[#4A3525] shadow-md transition-transform active:scale-95"
          >
            {homeToolsOpen || editFurnitureMode ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
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

      {/* Proximity Actions beside Pond in Garden (Scatter Feed + River Fishing) */}
      {zone === 'garden' && nearPond && (
        <div className="absolute bottom-5 left-1/2 z-30 flex -translate-x-1/2 flex-wrap items-center justify-center gap-2">
          {pondFish.some((f) => f.stage === 'growing' && f.hunger < 95) &&
            (confirmPondFeed && fishFeedCount > 0 ? (
              <div className="anim-pop flex items-center gap-2 rounded-2xl border-2 border-[#3C7C99] bg-[#E8F6FC] px-3 py-2 text-xs font-bold text-[#224457] shadow-lg">
                <span>Xác nhận rải 1 túi? (còn {fishFeedCount})</span>
                <button
                  type="button"
                  onClick={() => {
                    soundFX.tap();
                    setConfirmPondFeed(false);
                  }}
                  className="rounded-xl bg-[#D6E5EC] px-2.5 py-1 text-[11px] font-bold text-[#415C6B] transition-transform active:scale-95"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundFX.splash();
                    setConfirmPondFeed(false);
                    onScatterPondFeed();
                  }}
                  className="rounded-xl bg-[#3C7C99] px-3 py-1 text-[11px] font-bold text-white transition-transform active:scale-95"
                >
                  Xác nhận
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={fishFeedCount <= 0}
                onClick={() => {
                  soundFX.tap();
                  setConfirmPondFeed(true);
                }}
                className="anim-pop flex min-h-[42px] items-center gap-2 rounded-2xl border-2 border-[#3C7C99] bg-[#E8F6FC] px-4 py-2 text-xs font-bold text-[#224457] shadow-lg transition-transform active:scale-95 disabled:cursor-not-allowed disabled:border-[#C2CED4] disabled:bg-[#EFF3F5] disabled:text-[#7D8C94]"
              >
                <Utensils className="h-4 w-4 text-[#D98A2B]" />
                <span>
                  {fishFeedCount > 0
                    ? `Rải Thức Ăn Hồ (1 Túi · còn ${fishFeedCount})`
                    : 'Hết thức ăn thủy sinh · Ghé Xe Bus Shop'}
                </span>
              </button>
            ))}

          <button
            type="button"
            onClick={() => {
              soundFX.tap();
              farmPondFishActionRef.current?.();
            }}
            className={`anim-pop flex min-h-[42px] items-center gap-2 rounded-2xl border-2 px-4 py-2 text-xs font-extrabold shadow-lg transition-transform active:scale-95 ${
              fishingState === 'bite'
                ? 'border-[#C92A4C] bg-[#EF476F] text-white animate-pulse'
                : fishingState !== 'idle'
                  ? 'border-[#2D6E82] bg-[#2D7E96] text-white'
                  : 'border-[#3C7C99] bg-[#FFF8EB] text-[#224457]'
            }`}
          >
            <Fish className="h-4 w-4" />
            <span>
              {fishingState === 'idle'
                ? 'Câu Cá Sông'
                : fishingState === 'bite'
                  ? '! Giật Cần Ngay!'
                  : fishingState === 'nibbling'
                    ? 'Cá Đang Rỉa Phao...'
                    : 'Đang Chờ Cá...'}
            </span>
          </button>
        </div>
      )}

      {/* Bottom Action Bar in Furniture Move Mode */}
      {zone === 'home' && editFurnitureMode && (
        <div className="absolute bottom-4 left-1/2 z-30 flex w-[min(95vw,470px)] -translate-x-1/2 flex-col items-center gap-1.5">
          {selectedCatalogItem && selectedPlacedItem ? (
            <>
              <span className="rounded-lg bg-[#4A3525]/85 px-2.5 py-0.5 text-center text-[11px] font-semibold text-amber-50 shadow-xs">
                {selectedCatalogItem.kind === 'floor_paint' || selectedCatalogItem.kind === 'wall_paint'
                  ? `Chạm sàn phòng muốn sơn để đặt "${selectedCatalogItem.name}" · Cất để về mặc định`
                  : selectedCatalogItem.wallMount
                    ? `Chạm tường để gắn "${selectedCatalogItem.name}"`
                    : `Chạm sàn hoặc mặt bàn/tủ/giường để đặt "${selectedCatalogItem.name}"`}
              </span>
              <div className="flex w-full items-center justify-between gap-1.5 rounded-2xl border-2 border-[#8C6239] bg-[#FFF8EB] p-2 shadow-xl">
                <button
                  type="button"
                  onClick={() => {
                    soundFX.tap();
                    onRotateFurniture(selectedPlacedItem.instanceId);
                  }}
                  className="flex min-h-[36px] flex-1 items-center justify-center gap-1 rounded-xl bg-[#6F4E37] px-2.5 text-xs font-bold text-amber-50 transition-transform active:scale-95"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                  <span>Xoay</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundFX.tap();
                    onStowFurniture(selectedPlacedItem.instanceId);
                  }}
                  className="flex min-h-[36px] flex-1 items-center justify-center gap-1 rounded-xl bg-[#E7D4BA] px-2.5 text-xs font-bold text-[#4A3525] transition-transform active:scale-95"
                >
                  <PackageMinus className="h-3.5 w-3.5" />
                  <span>Cất</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundFX.tap();
                    onSelectFurniture(null);
                  }}
                  className="flex min-h-[36px] items-center justify-center rounded-xl bg-[#F3E6D3] px-2.5 text-xs font-bold text-[#6F4E37] transition-transform active:scale-95"
                >
                  Đổi món
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundFX.tap();
                    setHomeToolsOpen(false);
                    onToggleEditFurniture();
                  }}
                  className="flex min-h-[36px] items-center justify-center gap-1 rounded-xl bg-[#6BA383] px-3 text-xs font-bold text-white transition-transform active:scale-95"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Xong</span>
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3 rounded-2xl border-2 border-[#8C6239] bg-[#FFF8EB] px-4 py-2 text-xs font-bold text-[#4A3525] shadow-xl">
              <span>Chạm vào món đồ hoặc thùng sơn để di chuyển / cất</span>
              <button
                type="button"
                onClick={() => {
                  soundFX.tap();
                  setHomeToolsOpen(false);
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
