import React, {useEffect, useRef, useState} from 'react';
import {
  Armchair,
  Bug,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Coins,
  DoorClosed,
  DoorOpen,
  Fish,
  Lightbulb,
  LightbulbOff,
  Move,
  PackageMinus,
  RotateCw,
  Sparkles,
  Trophy,
  Utensils,
  Wrench,
  X,
} from 'lucide-react';
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {WELL_WATER_MAX} from '../data/farmCatalog';
import {
  FISH_RARITY_CONFIG,
  getRodRepairCost,
  rollRandomRiverFish,
} from '../data/fishingCatalog';
import {getNetRepairCost} from '../data/insectCatalog';
import {MAX_PET_INTIMACY, PET_CATALOG} from '../data/petCatalog';
import {FishIllustration} from './FishingIcons';
import {InsectIllustration} from './InsectIcons';
import {BlingBlingBadge, PetSpeciesIcon} from './PetIcons';
import {FURNITURE_BY_ID, isPointOnFurnitureSurface} from '../data/furnitureCatalog';
import {AvatarRig, buildAvatarRig, updateAvatarRigAnimation} from '../three/avatar3d';
import {FishingVisualFrame} from '../three/fishingVisuals3d';
import {buildPetModel, PetRig, updatePetAnimation} from '../three/pets3d';
import {
  buildSubzoneScene,
  HouseDoorHandle,
  HouseLampInfo,
  HouseWallSurface,
  SubzoneWorld,
} from '../three/subzonesBuilder';
import {
  buildTownScene,
  clampPointToMallDeck,
  getTownGroundHeight,
  isPointOnPlazaFlowerBed,
  MALL_DECK_Y,
  MALL_ELEVATOR_BOARD_POS,
  MALL_ELEVATOR_CAB_POS,
  TOWN_LAKE_WATER_Y,
  TOWN_ZONE_ENTRANCES,
  TownAnchor,
  TownWorld,
  WorldCollider,
} from '../three/townBuilder';
import {
  AvatarConfig,
  AvatarPose,
  BugNetState,
  CoopKind,
  CoopTroughs,
  CropType,
  FishingPhase,
  FishingRodState,
  FishRarity,
  GameStats,
  GardenPlotState,
  InsectRarity,
  InsectSpeciesId,
  LivestockAnimalState,
  OwnedPetState,
  PetSpeciesId,
  PetSupplies,
  PlacedFurniture,
  PondFishState,
  RiverFishSpeciesId,
  TimeOfDay,
  ToolId,
  WellWaterState,
  ZoneId,
} from '../types/game';
import {soundFX} from '../utils/sound';
import {PetArcMenu} from './PetArcMenu';
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
  bugNet: BugNetState;
  seeds: Partial<Record<CropType, number>>;
  bugSprayCount: number;
  waterCount: number;
  wellWater: WellWaterState;
  placedFurniture: PlacedFurniture[];
  editFurnitureMode: boolean;
  selectedFurnitureId: string | null;
  homeSpotRef: React.MutableRefObject<{x: number; z: number}>;
  showJoystick: boolean;
  showJumpButton: boolean;
  teleportToPlazaPulse: number;
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
  onMoveFurniture: (id: string, x: number, z: number, rotY?: number, y?: number) => void;
  onRotateFurniture: (id: string) => void;
  onStowFurniture: (id: string) => void;
  onCatchRiverFish: (preRolled?: {
    speciesId: RiverFishSpeciesId;
    weightKg: number;
    sellPrice: number;
  }) => {
    speciesId: RiverFishSpeciesId;
    name: string;
    rarity: FishRarity;
    weightKg: number;
    sellPrice: number;
    isNewRecord: boolean;
    isFirstDiscovery: boolean;
    durabilityLeft: number;
    maxDurability: number;
    durabilityLost: number;
  } | null;
  onLoseFishingDurability: () => {
    durabilityLeft: number;
    maxDurability: number;
    durabilityLost: number;
  };
  onRepairFishingRod: () => boolean;
  onCatchInsect: (caught: {
    speciesId: InsectSpeciesId;
    lengthMm: number;
    sellPrice: number;
  }) => {
    speciesId: InsectSpeciesId;
    name: string;
    rarity: InsectRarity;
    lengthMm: number;
    sellPrice: number;
    isNewRecord: boolean;
    isFirstDiscovery: boolean;
    durabilityLeft: number;
    maxDurability: number;
    durabilityLost: number;
  } | null;
  onLoseNetDurability: () => {
    durabilityLeft: number;
    maxDurability: number;
    durabilityLost: number;
  };
  onRepairBugNet: () => boolean;
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
  activePet: OwnedPetState | null;
  carriedPetId: string | null;
  petSupplies: PetSupplies;
  onOpenPetSupplyShop: () => void;
  onOpenPetAdopt: () => void;
  onHoldPet: (petId: string) => void;
  onReleasePet: () => void;
  onFeedPet: (petId: string) => {ok: boolean; message: string} | void;
  onCurePet: (petId: string) => void;
  onPlayWithPet: (petId: string) => {ok: boolean; gainedXp: boolean; message: string} | void;
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
  isSwing?: boolean;
  isBath?: boolean;
}

type CatchCelebrationData =
  | {
      kind: 'fish';
      speciesId: RiverFishSpeciesId;
      name: string;
      rarity: FishRarity;
      weightKg: number;
      sellPrice: number;
      isNewRecord: boolean;
      isFirstDiscovery: boolean;
      durabilityLeft: number;
      maxDurability: number;
    }
  | {
      kind: 'insect';
      speciesId: InsectSpeciesId;
      name: string;
      rarity: InsectRarity;
      lengthMm: number;
      sellPrice: number;
      isNewRecord: boolean;
      isFirstDiscovery: boolean;
      durabilityLeft: number;
      maxDurability: number;
    };

interface NavPoint {
  x: number;
  z: number;
}

interface NavGrid {
  minX: number;
  minZ: number;
  step: number;
  cols: number;
  rows: number;
  blocked: Uint8Array;
  gScore: Float32Array;
  fScore: Float32Array;
  parent: Int32Array;
  seen: Uint32Array;
  closed: Uint32Array;
  heap: Int32Array;
  searchId: number;
}

const PLAYER_RADIUS = 0.34;
const JUMP_VELOCITY = 7.9;
const JUMP_GRAVITY = 28.0; // Peak ~1.11m: just clears plaza flower bed rims (0.98m) smoothly

// Reusable math objects (zero allocations in render loop)
const _projVec = new THREE.Vector3();
const _headAnchorVec = new THREE.Vector3();
const _petAnchorVec = new THREE.Vector3();
const _camPosTarget = new THREE.Vector3();
const _camLookTarget = new THREE.Vector3();
const _bgColorTarget = new THREE.Color();
const _sunColorTarget = new THREE.Color();
const _hemiSkyTarget = new THREE.Color();
const _hemiGroundTarget = new THREE.Color();
const _rimColorTarget = new THREE.Color();
const _frustum = new THREE.Frustum();
const _projScreenMatrix = new THREE.Matrix4();

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

  if (zone === 'petshop') {
    if (isPortrait) {
      return {fov, pos: [0, 10.8, 16.6] as const, look: [0, 0.85, -0.4] as const};
    }
    return {fov, pos: [0, 9.4, 14.2] as const, look: [0, 0.85, -0.4] as const};
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
  if (zone === 'petshop') {
    return {minX: -7.5, maxX: 7.5, minZ: -6.1, maxZ: 6.15};
  }
  return {minX: -3.45, maxX: 3.45, minZ: -4.05, maxZ: 4.05};
}

function getWallItemHalfHeight(kind: string): number {
  switch (kind) {
    case 'wall_clock':
      return 0.42;
    case 'wall_calendar':
      return 0.44;
    case 'succulent_shelf':
      return 0.28;
    case 'wall_lamp':
      return 0.24;
    case 'wall_tv':
      return 0.56;
    default:
      return 0.65;
  }
}

function getFloorObstacleMaxTop(
  cat: (typeof FURNITURE_BY_ID)[string],
  baseY: number,
): number {
  switch (cat.kind) {
    case 'wardrobe':
      return baseY + 2.82;
    case 'fridge':
      return baseY + 2.32;
    case 'vanity_sink':
      return baseY + 2.38;
    case 'dish_cabinet':
      return baseY + 2.22;
    case 'bookshelf':
      return baseY + 2.1;
    case 'floor_lamp':
      return baseY + 2.1;
    case 'kitchen_l_counter':
      return baseY + 1.12;
    default:
      return baseY + (cat.surfaceHeight ?? 1.05);
  }
}

function snapPointToNearestWall(
  px: number,
  pz: number,
  cat: (typeof FURNITURE_BY_ID)[string],
  cameraPos: THREE.Vector3,
  surfaces: HouseWallSurface[],
  placedFurniture: PlacedFurniture[],
  selectedId: string,
  preferredWallId?: string,
  hitY?: number,
  currentOffsetY?: number,
): {x: number; z: number; rotY: number; y?: number; blocked?: boolean} {
  const upSurfaces = surfaces.filter((s) => s.isUp());
  let candidates = upSurfaces.length > 0 ? upSurfaces : surfaces;
  if (preferredWallId) {
    const wallMatched = candidates.filter((s) => s.wallGroupId === preferredWallId);
    if (wallMatched.length > 0) candidates = wallMatched;
  }
  if (candidates.length === 0) return {x: px, z: pz, rotY: 0, blocked: true};

  let best: HouseWallSurface | null = null;
  let bestSpan = 0;
  let bestDist = Infinity;

  for (const w of candidates) {
    const spanLen = w.maxSpan - w.minSpan;
    if (spanLen < cat.halfW * 1.75) continue;
    const pad = Math.min(cat.halfW + 0.04, spanLen * 0.45);
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

  if (!best) return {x: px, z: pz, rotY: 0, blocked: true};

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
  const rotY =
    best.axis === 'z' ? (side > 0 ? 0 : Math.PI) : side > 0 ? Math.PI / 2 : -Math.PI / 2;
  const outX = best.axis === 'z' ? bestSpan : best.pos + side * offset;
  const outZ = best.axis === 'z' ? best.pos + side * offset : bestSpan;

  const baseMountY = cat.mountHeight ?? 1.8;
  const halfH = getWallItemHalfHeight(cat.kind);
  const minCenterY = cat.kind.startsWith('window_') ? 1.35 : 0.65 + halfH;
  const maxCenterY = 2.95 - halfH;
  const desiredCenterY =
    hitY !== undefined && hitY > 0.3
      ? THREE.MathUtils.clamp(hitY, minCenterY, maxCenterY)
      : THREE.MathUtils.clamp(baseMountY + (currentOffsetY ?? 0), minCenterY, maxCenterY);
  const nextYOffset = Number((desiredCenterY - baseMountY).toFixed(2));

  // Obstacle Check 1: Other wall-mounted items on the same wall
  for (const other of placedFurniture) {
    if (other.instanceId === selectedId) continue;
    const oCat = FURNITURE_BY_ID[other.catalogId];
    if (!oCat || oCat.kind === 'floor_paint' || oCat.kind === 'wall_paint' || oCat.walkable) {
      continue;
    }

    if (oCat.wallMount) {
      const distToWallPlane =
        best.axis === 'z' ? Math.abs(other.z - best.pos) : Math.abs(other.x - best.pos);
      if (distToWallPlane > best.thickness / 2 + 0.35) continue;

      const sameSideOrWindow =
        cat.kind.startsWith('window_') ||
        oCat.kind.startsWith('window_') ||
        (best.axis === 'z'
          ? Math.sign(other.z - best.pos) === side
          : Math.sign(other.x - best.pos) === side);
      if (!sameSideOrWindow) continue;

      const otherSpan = best.axis === 'z' ? other.x : other.z;
      const otherHalfH = getWallItemHalfHeight(oCat.kind);
      const otherCenterY = (oCat.mountHeight ?? 1.8) + (other.y ?? 0);
      if (
        Math.abs(otherSpan - bestSpan) < cat.halfW + oCat.halfW + 0.04 &&
        Math.abs(otherCenterY - desiredCenterY) < halfH + otherHalfH + 0.04
      ) {
        return {x: outX, z: outZ, rotY, blocked: true};
      }
    } else {
      // Obstacle Check 2: Tall floor furniture pressed against the wall below/across the mount height
      const otherTopY = getFloorObstacleMaxTop(oCat, other.y ?? 0);
      if (otherTopY <= desiredCenterY - halfH + 0.04) continue;

      const sinR = Math.abs(Math.sin(other.rotY));
      const cosR = Math.abs(Math.cos(other.rotY));
      const effHalfX = oCat.halfW * cosR + oCat.halfD * sinR;
      const effHalfZ = oCat.halfW * sinR + oCat.halfD * cosR;
      const perpDist =
        best.axis === 'z' ? (other.z - best.pos) * side : (other.x - best.pos) * side;
      const perpExtent = best.axis === 'z' ? effHalfZ : effHalfX;
      if (perpDist > -0.15 && perpDist - perpExtent < best.thickness / 2 + 0.55) {
        const otherSpan = best.axis === 'z' ? other.x : other.z;
        const otherSpanHalf = best.axis === 'z' ? effHalfX : effHalfZ;
        if (Math.abs(otherSpan - bestSpan) < cat.halfW + otherSpanHalf - 0.05) {
          return {x: outX, z: outZ, rotY, blocked: true};
        }
      }
    }
  }

  return {
    x: outX,
    z: outZ,
    rotY,
    y: Math.abs(nextYOffset) > 0.01 ? nextYOffset : 0,
    blocked: false,
  };
}

function resolvePointAgainstColliders(
  px: number,
  pz: number,
  colliders: WorldCollider[],
  radius = PLAYER_RADIUS,
  skipBedColliders = false,
): {x: number; z: number; collided: boolean} {
  let x = px;
  let z = pz;
  let collided = false;

  for (let pass = 0; pass < 2; pass++) {
    for (const col of colliders) {
      if (skipBedColliders && col.id?.startsWith('plaza_curved_bed_')) continue;
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

function isPointBlockedByColliders(
  px: number,
  pz: number,
  colliders: WorldCollider[],
  radius = PLAYER_RADIUS + 0.12,
): boolean {
  for (let i = 0; i < colliders.length; i++) {
    const col = colliders[i];
    if (col.type === 'circle') {
      const dx = px - col.x;
      const dz = pz - col.z;
      const minDist = col.r + radius;
      if (dx * dx + dz * dz < minDist * minDist) return true;
    } else {
      const rot = col.rotY || 0;
      const cos = Math.cos(rot);
      const sin = Math.sin(rot);
      const dx = px - col.x;
      const dz = pz - col.z;
      const lx = dx * cos - dz * sin;
      const lz = dx * sin + dz * cos;
      const cx = Math.max(-col.hw, Math.min(col.hw, lx));
      const cz = Math.max(-col.hd, Math.min(col.hd, lz));
      const vx = lx - cx;
      const vz = lz - cz;
      if (vx * vx + vz * vz < radius * radius) return true;
    }
  }
  return false;
}

function buildNavGrid(zone: ZoneId, colliders: WorldCollider[]): NavGrid {
  const b = getZoneWalkBounds(zone);
  const step = zone === 'town' ? 1.15 : zone === 'garden' ? 0.72 : 0.48;
  const cols = Math.max(4, Math.floor((b.maxX - b.minX) / step) + 1);
  const rows = Math.max(4, Math.floor((b.maxZ - b.minZ) / step) + 1);
  const total = cols * rows;
  const blocked = new Uint8Array(total);
  const inflate = PLAYER_RADIUS + (zone === 'town' ? 0.14 : 0.08);

  for (let r = 0; r < rows; r++) {
    const wz = b.minZ + r * step;
    const rowOff = r * cols;
    for (let c = 0; c < cols; c++) {
      const wx = b.minX + c * step;
      if (isPointBlockedByColliders(wx, wz, colliders, inflate)) {
        blocked[rowOff + c] = 1;
      }
    }
  }

  return {
    minX: b.minX,
    minZ: b.minZ,
    step,
    cols,
    rows,
    blocked,
    gScore: new Float32Array(total),
    fScore: new Float32Array(total),
    parent: new Int32Array(total),
    seen: new Uint32Array(total),
    closed: new Uint32Array(total),
    heap: new Int32Array(Math.max(1024, total * 2)),
    searchId: 0,
  };
}

function hasColliderLineOfSight(
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  colliders: WorldCollider[],
  stepSize: number,
  radius: number,
): boolean {
  const dist = Math.hypot(x1 - x0, z1 - z0);
  if (dist < stepSize) return true;
  const samples = Math.ceil(dist / stepSize);
  for (let i = 1; i < samples; i++) {
    const t = i / samples;
    const sx = x0 + (x1 - x0) * t;
    const sz = z0 + (z1 - z0) * t;
    if (isPointBlockedByColliders(sx, sz, colliders, radius)) {
      return false;
    }
  }
  return true;
}

function findNearestWalkableCell(nav: NavGrid, startC: number, startR: number): number {
  const c0 = Math.max(0, Math.min(nav.cols - 1, startC));
  const r0 = Math.max(0, Math.min(nav.rows - 1, startR));
  const idx0 = r0 * nav.cols + c0;
  if (nav.blocked[idx0] === 0) return idx0;

  let bestIdx = -1;
  let bestD2 = Infinity;
  for (let rad = 1; rad <= 6; rad++) {
    const minC = Math.max(0, c0 - rad);
    const maxC = Math.min(nav.cols - 1, c0 + rad);
    const minR = Math.max(0, r0 - rad);
    const maxR = Math.min(nav.rows - 1, r0 + rad);
    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        const idx = r * nav.cols + c;
        if (nav.blocked[idx] === 0) {
          const d2 = (c - c0) * (c - c0) + (r - r0) * (r - r0);
          if (d2 < bestD2) {
            bestD2 = d2;
            bestIdx = idx;
          }
        }
      }
    }
    if (bestIdx !== -1) return bestIdx;
  }
  return -1;
}

const ASTAR_DIRS: readonly [number, number, number][] = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, Math.SQRT2],
  [1, -1, Math.SQRT2],
  [-1, 1, Math.SQRT2],
  [-1, -1, Math.SQRT2],
];

function findSmartPath(
  nav: NavGrid | null,
  colliders: WorldCollider[],
  startX: number,
  startZ: number,
  goalX: number,
  goalZ: number,
): NavPoint[] {
  const losStep = nav ? nav.step * 0.42 : 0.45;
  const losRadius = PLAYER_RADIUS + 0.06;
  if (hasColliderLineOfSight(startX, startZ, goalX, goalZ, colliders, losStep, losRadius)) {
    return [{x: goalX, z: goalZ}];
  }
  if (!nav) {
    return [{x: goalX, z: goalZ}];
  }

  const sC = Math.round((startX - nav.minX) / nav.step);
  const sR = Math.round((startZ - nav.minZ) / nav.step);
  const gC = Math.round((goalX - nav.minX) / nav.step);
  const gR = Math.round((goalZ - nav.minZ) / nav.step);

  const startIdx = findNearestWalkableCell(nav, sC, sR);
  const goalIdx = findNearestWalkableCell(nav, gC, gR);
  if (startIdx === -1 || goalIdx === -1 || startIdx === goalIdx) {
    return [{x: goalX, z: goalZ}];
  }

  nav.searchId = (nav.searchId + 1) >>> 0;
  if (nav.searchId === 0) {
    nav.seen.fill(0);
    nav.closed.fill(0);
    nav.searchId = 1;
  }
  const sid = nav.searchId;
  const {cols, rows, blocked, gScore, fScore, parent, seen, closed, heap} = nav;
  const goalCol = goalIdx % cols;
  const goalRow = (goalIdx / cols) | 0;

  let heapSize = 0;
  const pushHeap = (idx: number) => {
    if (heapSize >= heap.length) return;
    let i = heapSize++;
    heap[i] = idx;
    const f = fScore[idx];
    while (i > 0) {
      const p = (i - 1) >> 1;
      const pIdx = heap[p];
      if (fScore[pIdx] <= f) break;
      heap[i] = pIdx;
      i = p;
    }
    heap[i] = idx;
  };
  const popHeap = (): number => {
    const top = heap[0];
    const last = heap[--heapSize];
    if (heapSize > 0) {
      let i = 0;
      const half = heapSize >> 1;
      const fLast = fScore[last];
      while (i < half) {
        let c = (i << 1) + 1;
        const r = c + 1;
        if (r < heapSize && fScore[heap[r]] < fScore[heap[c]]) c = r;
        const cIdx = heap[c];
        if (fLast <= fScore[cIdx]) break;
        heap[i] = cIdx;
        i = c;
      }
      heap[i] = last;
    }
    return top;
  };

  const octile = (c: number, r: number) => {
    const dx = Math.abs(goalCol - c);
    const dz = Math.abs(goalRow - r);
    return dx + dz + (Math.SQRT2 - 2) * (dx < dz ? dx : dz);
  };

  seen[startIdx] = sid;
  gScore[startIdx] = 0;
  fScore[startIdx] = octile(startIdx % cols, (startIdx / cols) | 0);
  parent[startIdx] = -1;
  pushHeap(startIdx);

  let found = false;
  let iter = 0;
  while (heapSize > 0 && iter < 9000) {
    iter++;
    const cur = popHeap();
    if (closed[cur] === sid) continue;
    if (cur === goalIdx) {
      found = true;
      break;
    }
    closed[cur] = sid;

    const cc = cur % cols;
    const cr = (cur / cols) | 0;
    const curG = gScore[cur];

    for (let d = 0; d < 8; d++) {
      const dir = ASTAR_DIRS[d];
      const nc = cc + dir[0];
      const nr = cr + dir[1];
      if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;
      const nb = nr * cols + nc;
      if (blocked[nb] === 1 || closed[nb] === sid) continue;
      // Prevent corner cutting across diagonal blocked neighbors
      if (dir[0] !== 0 && dir[1] !== 0) {
        if (blocked[cr * cols + nc] === 1 || blocked[nr * cols + cc] === 1) continue;
      }

      const nextG = curG + dir[2];
      if (seen[nb] !== sid || nextG < gScore[nb]) {
        seen[nb] = sid;
        gScore[nb] = nextG;
        fScore[nb] = nextG + octile(nc, nr) * 1.02;
        parent[nb] = cur;
        pushHeap(nb);
      }
    }
  }

  if (!found) {
    return [{x: goalX, z: goalZ}];
  }

  const rawPoints: NavPoint[] = [];
  let trace = goalIdx;
  while (trace !== -1 && trace !== startIdx) {
    const tc = trace % cols;
    const tr = (trace / cols) | 0;
    rawPoints.push({x: nav.minX + tc * nav.step, z: nav.minZ + tr * nav.step});
    trace = parent[trace];
  }
  rawPoints.reverse();
  rawPoints.push({x: goalX, z: goalZ});

  // String-pull smoothing: collapse collinear/clear segments into sleek direct corners
  const smoothed: NavPoint[] = [];
  let anchorX = startX;
  let anchorZ = startZ;
  let idx = 0;
  while (idx < rawPoints.length) {
    let farthest = idx;
    for (let j = rawPoints.length - 1; j > idx; j--) {
      if (
        hasColliderLineOfSight(
          anchorX,
          anchorZ,
          rawPoints[j].x,
          rawPoints[j].z,
          colliders,
          losStep,
          losRadius,
        )
      ) {
        farthest = j;
        break;
      }
    }
    const chosen = rawPoints[farthest];
    smoothed.push(chosen);
    anchorX = chosen.x;
    anchorZ = chosen.z;
    idx = farthest + 1;
  }

  return smoothed.length > 0 ? smoothed : [{x: goalX, z: goalZ}];
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
  bugNet,
  seeds,
  bugSprayCount,
  waterCount,
  wellWater,
  placedFurniture,
  editFurnitureMode,
  selectedFurnitureId,
  homeSpotRef,
  showJoystick,
  showJumpButton,
  teleportToPlazaPulse,
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
  onRepairFishingRod,
  onCatchInsect,
  onLoseNetDurability,
  onRepairBugNet,
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
  activePet,
  carriedPetId,
  petSupplies,
  onOpenPetSupplyShop,
  onOpenPetAdopt,
  onHoldPet,
  onReleasePet,
  onFeedPet,
  onCurePet,
  onPlayWithPet,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const labelLayerRef = useRef<HTMLDivElement | null>(null);
  const joystickBaseRef = useRef<HTMLDivElement | null>(null);
  const joystickKnobRef = useRef<HTMLDivElement | null>(null);
  const joystickInputRef = useRef<{x: number; y: number; active: boolean}>({
    x: 0,
    y: 0,
    active: false,
  });
  const joystickOriginRef = useRef<{x: number; y: number; pointerId: number | null}>({
    x: 0,
    y: 0,
    pointerId: null,
  });
  const jumpActionRef = useRef<(() => void) | null>(null);
  const catchActionRef = useRef<(() => void) | null>(null);
  const teleportPlazaActionRef = useRef<(() => void) | null>(null);
  const mallRideActionRef = useRef<(() => void) | null>(null);
  const playerNameDomRef = useRef<HTMLDivElement | null>(null);
  const petNameDomRef = useRef<HTMLDivElement | null>(null);
  const mallElevatorHudRef = useRef<'none' | 'near_ground' | 'deck' | 'riding'>('none');
  const pendingPlazaSpawnRef = useRef<boolean>(false);

  const [tags, setTags] = useState<ProjectedTag[]>([]);
  const [speechBubble, setSpeechBubble] = useState<string | null>(null);
  const [arcMenuPos, setArcMenuPos] = useState<{plotId: number; x: number; y: number} | null>(null);
  const [petArcMenuPos, setPetArcMenuPos] = useState<{petId: string; x: number; y: number} | null>(null);
  const [mallElevatorHud, setMallElevatorHud] = useState<'none' | 'near_ground' | 'deck' | 'riding'>('none');
  const [fishingState, setFishingState] = useState<FishingPhase>('idle');
  const [biteAlertPos, setBiteAlertPos] = useState<{x: number; y: number} | null>(null);
  const [brokenRodPrompt, setBrokenRodPrompt] = useState<{
    repairCost: number;
    maxDurability: number;
  } | null>(null);
  const [brokenNetPrompt, setBrokenNetPrompt] = useState<{
    repairCost: number;
    maxDurability: number;
  } | null>(null);
  const [catchCelebration, setCatchCelebration] = useState<CatchCelebrationData | null>(null);
  const [miniActive, setMiniActive] = useState(false);
  const [miniScore, setMiniScore] = useState(0);
  const [starPos, setStarPos] = useState({x: 50, y: 50});
  const [nearbyDoor, setNearbyDoor] = useState<{id: string; label: string; isOpen: boolean} | null>(
    null,
  );
  const [houseLightsOn, setHouseLightsOn] = useState(true);
  const [nearbyLamp, setNearbyLamp] = useState<HouseLampInfo | null>(null);
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
    bugNet,
    showJoystick,
    placedFurniture,
    editFurnitureMode,
    selectedFurnitureId,
    activePet,
    carriedPetId,
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
    bugNet,
    showJoystick,
    placedFurniture,
    editFurnitureMode,
    selectedFurnitureId,
    activePet,
    carriedPetId,
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
    onCatchInsect,
    onLoseNetDurability,
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
    onOpenPetSupplyShop,
    onOpenPetAdopt,
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
    onCatchInsect,
    onLoseNetDurability,
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
    onOpenPetSupplyShop,
    onOpenPetAdopt,
  };

  const rebuildSceneTriggerRef = useRef<(() => void) | null>(null);
  const rebuildAvatarTriggerRef = useRef<
    ((
      cfg: AvatarConfig,
      equippedTool: ToolId | null,
      carryingPet: {speciesId: PetSpeciesId; sick?: boolean} | null,
    ) => void) | null
  >(null);
  const syncPetCompanionRef = useRef<(() => void) | null>(null);
  const triggerPetPlayRef = useRef<((petId: string) => void) | null>(null);
  const farmPondFishActionRef = useRef<(() => void) | null>(null);
  const cancelFishingRef = useRef<(() => void) | null>(null);
  const activeTownRef = useRef<TownWorld | null>(null);
  const activeSubzoneRef = useRef<SubzoneWorld | null>(null);
  const bubbleTimerRef = useRef<number | null>(null);
  const catchTimerRef = useRef<number | null>(null);
  const fishTimerRef = useRef<number | null>(null);
  const openDoorsRef = useRef<Record<string, boolean>>({});
  const houseLightsOnRef = useRef<boolean>(true);
  const lampStatesRef = useRef<Record<string, boolean>>({});
  const activeBathtubIdRef = useRef<string | null>(null);
  const activeBedIdRef = useRef<string | null>(null);
  const activeDoorsRef = useRef<HouseDoorHandle[]>([]);
  const nearbyDoorKeyRef = useRef<string>('');
  const nearbyLampKeyRef = useRef<string>('');
  const nearPondRef = useRef<boolean>(false);
  const homeExitTriggeredRef = useRef<boolean>(false);
  const selectedPlotRef = useRef<{plotId: number; worldPos: THREE.Vector3} | null>(null);
  const selectedPetRef = useRef<{petId: string} | null>(null);

  const showBubble = (text: string, _x?: number, _y?: number, _z?: number) => {
    if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
    setSpeechBubble(text);
    bubbleTimerRef.current = window.setTimeout(() => {
      setSpeechBubble(null);
    }, 2600);
  };

  const triggerCatchCelebration = (res: CatchCelebrationData) => {
    if (catchTimerRef.current) clearTimeout(catchTimerRef.current);
    setCatchCelebration(res);
    catchTimerRef.current = window.setTimeout(() => {
      setCatchCelebration(null);
    }, 3400);
  };

  useEffect(() => {
    homeExitTriggeredRef.current = false;
    selectedPetRef.current = null;
    setPetArcMenuPos(null);
    if (zone !== 'town') {
      mallElevatorHudRef.current = 'none';
      setMallElevatorHud('none');
    }
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
      activeBathtubIdRef.current = null;
      activeBedIdRef.current = null;
      nearbyDoorKeyRef.current = '';
      nearbyLampKeyRef.current = '';
      setNearbyDoor(null);
      setNearbyLamp(null);
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

  useEffect(() => {
    if (!showJoystick) {
      joystickInputRef.current = {x: 0, y: 0, active: false};
      joystickOriginRef.current.pointerId = null;
      if (joystickBaseRef.current) {
        joystickBaseRef.current.style.opacity = '0';
      }
    }
  }, [showJoystick]);

  useEffect(() => {
    if (teleportToPlazaPulse <= 0) return;
    pendingPlazaSpawnRef.current = true;
    teleportPlazaActionRef.current?.();
  }, [teleportToPlazaPulse]);

  const plotVisualKey = plots
    .map(
      (p) =>
        `${p.id}:${p.stage}:${p.crop ?? ''}:${p.watered ? 1 : 0}:${p.hasPest ? 1 : 0}:${p.hasWeed ? 1 : 0}:${p.level}`,
    )
    .join('|');

  const livestockVisualKey = livestock
    .map(
      (a) =>
        `${a.id}:${a.type}:${a.stage}:${a.sick ? 1 : 0}:${a.hunger < 45 ? 1 : 0}:${a.hasProduce ? 1 : 0}`,
    )
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
    const carryingPet =
      carriedPetId && activePet && activePet.id === carriedPetId
        ? {speciesId: activePet.speciesId, sick: activePet.sick}
        : null;
    const equippedTool: ToolId | null = fishingRod.equipped
      ? 'wooden_rod'
      : bugNet.equipped
        ? 'wooden_net'
        : null;
    rebuildAvatarTriggerRef.current?.(avatar, equippedTool, carryingPet);
    syncPetCompanionRef.current?.();
    if (carryingPet || !activePet) {
      selectedPetRef.current = null;
      setPetArcMenuPos(null);
    }
  }, [
    avatar,
    fishingRod.equipped,
    bugNet.equipped,
    carriedPetId,
    activePet?.id,
    activePet?.speciesId,
    activePet?.sick,
  ]);

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
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, isTouchDevice ? 1.15 : 1.5));
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
    controls.minDistance = 4.6;
    controls.maxDistance = 54;
    controls.minPolarAngle = Math.PI * 0.12;
    controls.maxPolarAngle = Math.PI * 0.68;
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
    let jumpY = 0;
    let jumpVel = 0;
    let activeTarget: {
      x: number;
      z: number;
      waypoints: NavPoint[];
      waypointIdx: number;
      arrivePose: AvatarPose;
      seat?: SeatTarget;
      onArrive?: () => void;
    } | null = null;
    let activeSeat: SeatTarget | null = null;
    let stallTimer = 0;
    let prevDistToTarget = Infinity;

    const netSwingCtrl = {
      active: false,
      elapsed: 0,
      catchEvaluated: false,
      duration: 0.38,
    };
    let insectAlertCooldown = 0;

    const initCarriedPet =
      stateRef.current.carriedPetId &&
      stateRef.current.activePet &&
      stateRef.current.activePet.id === stateRef.current.carriedPetId
        ? {
            speciesId: stateRef.current.activePet.speciesId,
            sick: stateRef.current.activePet.sick,
          }
        : null;
    let playerRig: AvatarRig = buildAvatarRig(stateRef.current.avatar, {
      equippedTool: stateRef.current.fishingRod.equipped
        ? 'wooden_rod'
        : stateRef.current.bugNet.equipped
          ? 'wooden_net'
          : null,
      carryingPet: initCarriedPet,
    });
    playerRig.root.position.set(playerPos.x, 0.14, playerPos.z);
    scene.add(playerRig.root);

    let playPetTimer = 0;
    const mallElev = {
      state: 'ground' as 'ground' | 'riding_up' | 'deck' | 'riding_down',
      progress: 0,
      duration: 4.4,
      y: 0.04,
    };

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
    let currentNavGrid: NavGrid | null = null;
    let currentPlazaRadius = 6.8;
    let currentGrounds: THREE.Object3D[] = [];
    let currentWallSurfaces: HouseWallSurface[] = [];
    let prevGroundY = 0.14;

    const petCompanion = {
      rig: null as PetRig | null,
      proxy: null as THREE.Mesh | null,
      petId: null as string | null,
      speciesId: null as PetSpeciesId | null,
      sick: false,
      x: 0,
      y: 0.14,
      z: 2.0,
      rotY: 0,
      playTimer: 0,
      playDuration: 4.5,
      playKind: 'none' as 'none' | 'jump' | 'circle',
      playOrbitAngle: 0,
    };

    const getPetTargetOffset = (
      speciesId: PetSpeciesId,
      px: number,
      pz: number,
      rotY: number,
      zNow: ZoneId,
    ) => {
      // Flying pets fly cleanly on the character's LEFT side (-X local, opposite +X umbrella).
      // Walking pets follow slightly behind & to the left at safe distance (>= 1.2m).
      const spec = PET_CATALOG[speciesId];
      const lx = spec.moveType === 'fly' ? -1.38 : -0.96;
      const lz = spec.moveType === 'fly' ? -0.14 : -1.22;
      const cosR = Math.cos(rotY);
      const sinR = Math.sin(rotY);
      const wx = px + lx * cosR + lz * sinR;
      const wz = pz - lx * sinR + lz * cosR;
      if (zNow === 'town' && mallElev.state === 'deck') {
        return clampPointToMallDeck(wx, wz);
      }
      const b = getZoneWalkBounds(zNow);
      return {
        x: THREE.MathUtils.clamp(wx, b.minX + 0.35, b.maxX - 0.35),
        z: THREE.MathUtils.clamp(wz, b.minZ + 0.35, b.maxZ - 0.35),
      };
    };

    const getPetGroundY = (px: number, pz: number, zNow: ZoneId): number => {
      if (zNow === 'town') {
        if (mallElev.state === 'deck') return MALL_DECK_Y;
        if (mallElev.state === 'riding_up' || mallElev.state === 'riding_down') {
          return mallElev.y + 0.06;
        }
        return getTownGroundHeight(px, pz, currentPlazaRadius);
      }
      if (zNow === 'garden' && px > 9.35 && px < 15.9 && Math.abs(pz - 3.0) < 0.98) {
        return 0.36;
      }
      return 0.02;
    };

    const refreshClickTargetsWithPet = () => {
      const base = activeTown
        ? [...activeTown.clickTargets, playerProxy]
        : activeSubzone
          ? [...activeSubzone.clickTargets, playerProxy]
          : [playerProxy];
      if (petCompanion.proxy) {
        base.push(petCompanion.proxy);
      }
      currentClickTargets = base;
    };

    const disposePetCompanion = () => {
      if (petCompanion.rig) {
        scene.remove(petCompanion.rig.root);
        petCompanion.rig.dispose();
        petCompanion.rig = null;
      }
      if (petCompanion.proxy) {
        petCompanion.proxy.geometry.dispose();
        (petCompanion.proxy.material as THREE.Material).dispose();
        petCompanion.proxy = null;
      }
      petCompanion.petId = null;
      petCompanion.speciesId = null;
      petCompanion.sick = false;
      petCompanion.playTimer = 0;
      petCompanion.playKind = 'none';
      refreshClickTargetsWithPet();
    };

    const placePetCompanionNearPlayer = () => {
      if (!petCompanion.rig || !petCompanion.speciesId) return;
      const zNow = stateRef.current.zone;
      const off = getPetTargetOffset(
        petCompanion.speciesId,
        playerPos.x,
        playerPos.z,
        playerPos.rotY,
        zNow,
      );
      petCompanion.x = off.x;
      petCompanion.z = off.z;
      petCompanion.rotY = playerPos.rotY;
      const gy = getPetGroundY(off.x, off.z, zNow);
      petCompanion.y = PET_CATALOG[petCompanion.speciesId].moveType === 'fly' ? gy + 1.32 : gy;
      petCompanion.rig.root.position.set(petCompanion.x, petCompanion.y, petCompanion.z);
      petCompanion.rig.root.rotation.y = petCompanion.rotY;
    };

    const syncPetCompanion = (forceSnap = false) => {
      const {activePet: curPet, carriedPetId: curCarried} = stateRef.current;
      const shouldShow = Boolean(curPet && curCarried !== curPet.id);
      if (!shouldShow || !curPet) {
        if (petCompanion.rig) {
          disposePetCompanion();
        }
        return;
      }

      const needsRebuild =
        !petCompanion.rig ||
        petCompanion.petId !== curPet.id ||
        petCompanion.speciesId !== curPet.speciesId ||
        petCompanion.sick !== curPet.sick;

      if (needsRebuild) {
        const hadSamePet = petCompanion.rig !== null && petCompanion.petId === curPet.id;
        const prevX = petCompanion.x;
        const prevY = petCompanion.y;
        const prevZ = petCompanion.z;
        const prevRotY = petCompanion.rotY;
        disposePetCompanion();

        const petScale = curPet.speciesId === 'blue_bird' ? 1.35 : 1.34;
        const rig = buildPetModel(curPet.speciesId, {
          scale: petScale,
          sick: curPet.sick,
          withShadow: true,
        });
        const proxy = new THREE.Mesh(
          new THREE.BoxGeometry(1.08, 1.08, 1.08),
          new THREE.MeshBasicMaterial({visible: false}),
        );
        proxy.position.set(0, 0.44, 0);
        proxy.userData = {kind: 'active_pet', petId: curPet.id};
        rig.root.add(proxy);

        petCompanion.rig = rig;
        petCompanion.proxy = proxy;
        petCompanion.petId = curPet.id;
        petCompanion.speciesId = curPet.speciesId;
        petCompanion.sick = curPet.sick;
        scene.add(rig.root);

        if (hadSamePet && !forceSnap) {
          petCompanion.x = prevX;
          petCompanion.y = prevY;
          petCompanion.z = prevZ;
          petCompanion.rotY = prevRotY;
          rig.root.position.set(prevX, prevY, prevZ);
          rig.root.rotation.y = prevRotY;
        } else {
          placePetCompanionNearPlayer();
        }
        refreshClickTargetsWithPet();
      } else if (forceSnap) {
        placePetCompanionNearPlayer();
      }
    };

    syncPetCompanionRef.current = () => syncPetCompanion(false);
    triggerPetPlayRef.current = (petId: string) => {
      if (petCompanion.petId !== petId || !petCompanion.rig || !petCompanion.speciesId) return;
      // Both walking and flying pets come land/stand in front of the player & hop playfully!
      petCompanion.playKind = 'jump';
      petCompanion.playDuration = 4.5;
      petCompanion.playTimer = 4.5;
      petCompanion.playOrbitAngle = Math.atan2(
        petCompanion.z - playerPos.z,
        petCompanion.x - playerPos.x,
      );
      const isRidingElev =
        stateRef.current.zone === 'town' &&
        (mallElev.state === 'riding_up' || mallElev.state === 'riding_down');
      if (!isRidingElev && fishCtrl.phase === 'idle' && !netSwingCtrl.active) {
        activeTarget = null;
        if (activeSeat) {
          if (activeSeat.isBath) {
            activeBathtubIdRef.current = null;
            activeSubzone?.setActiveBathtub?.(null);
          }
          if (activeSeat.isBed) {
            activeBedIdRef.current = null;
            activeSubzone?.setActiveBed?.(null);
          }
          playerPos.x = activeSeat.standX;
          playerPos.z = activeSeat.standZ;
          activeSeat = null;
        }
        playPetTimer = 4.5;
      }
    };

    const selectionRing = new THREE.Mesh(
      new THREE.RingGeometry(0.76, 0.96, 32),
      new THREE.MeshBasicMaterial({
        color: '#FFD166',
        transparent: true,
        opacity: 0.92,
        side: THREE.DoubleSide,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      }),
    );
    selectionRing.rotation.x = -Math.PI / 2;
    selectionRing.position.y = 0.03;
    selectionRing.renderOrder = 2;
    selectionRing.visible = false;
    scene.add(selectionRing);

    const loadCurrentWorld = () => {
      const {zone: z, plots: pl, fishingState: fs, placedFurniture: pf} = stateRef.current;
      const legacyFs: 'idle' | 'waiting' | 'bite' =
        fs === 'idle' ? 'idle' : fs === 'bite' ? 'bite' : 'waiting';
      const zoneChanged = activeZoneLoaded !== z;

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
        controls.minDistance = 4.6;
        controls.maxDistance = 54;
        controls.minPolarAngle = Math.PI * 0.12;
        controls.maxPolarAngle = Math.PI * 0.68;
        activeTown = buildTownScene();
        activeTownRef.current = activeTown;
        activeTown.setFishingState?.(legacyFs);
        scene.add(activeTown.group);
        currentAnchors = activeTown.labelAnchors;
        currentColliders = activeTown.colliders;
        currentNavGrid = buildNavGrid('town', currentColliders);
        currentPlazaRadius = activeTown.plazaRadius;
        currentGrounds = activeTown.groundMeshes;
        activeDoorsRef.current = [];
        currentWallSurfaces = [];
        if (zoneChanged) {
          mallElev.state = 'ground';
          mallElev.progress = 0;
          mallElev.y = 0.04;
          activeTown.setMallElevatorY?.(0.04);
          playPetTimer = 0;
          activeTarget = null;
          activeSeat = null;
          jumpY = 0;
          jumpVel = 0;
          let warpedToPlaza = false;
          if (pendingPlazaSpawnRef.current) {
            pendingPlazaSpawnRef.current = false;
            playerPos.x = 0;
            playerPos.z = 3.6;
            playerPos.rotY = 0;
            warpedToPlaza = true;
          } else if (activeZoneLoaded !== null && activeZoneLoaded !== 'town') {
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
          if (warpedToPlaza) {
            showBubble('Đã di chuyển về Quảng Trường!', 0, spawnY + 2.05, 3.6);
          }
        } else {
          activeTown.setMallElevatorY?.(mallElev.y);
        }
      } else {
        mallElev.state = 'ground';
        mallElev.progress = 0;
        mallElev.y = 0.04;
        if (zoneChanged) playPetTimer = 0;
        controls.minDistance = z === 'garden' || z === 'home' ? 5.5 : 4.5;
        controls.maxDistance = z === 'garden' || z === 'home' ? 26 : z === 'petshop' ? 22 : 18;
        controls.minPolarAngle = Math.PI * 0.16;
        controls.maxPolarAngle = Math.PI * 0.45;
        activeSubzone = buildSubzoneScene(z, {
          plots: pl,
          fishingState: legacyFs,
          placedFurniture: z === 'home' ? pf : undefined,
          editFurnitureMode: z === 'home' ? stateRef.current.editFurnitureMode : undefined,
          openDoors: z === 'home' ? openDoorsRef.current : undefined,
          houseLightsOn: z === 'home' ? houseLightsOnRef.current : undefined,
          lampStates: z === 'home' ? lampStatesRef.current : undefined,
          livestock: z === 'garden' ? stateRef.current.livestock : undefined,
          troughs: z === 'garden' ? stateRef.current.troughs : undefined,
          pondFish: z === 'garden' ? stateRef.current.pondFish : undefined,
        });
        activeSubzoneRef.current = activeSubzone;
        if (z === 'home' && activeBathtubIdRef.current) {
          activeSubzone.setActiveBathtub?.(activeBathtubIdRef.current);
        }
        if (z === 'home' && activeBedIdRef.current) {
          activeSubzone.setActiveBed?.(activeBedIdRef.current);
        }
        scene.add(activeSubzone.group);
        currentAnchors = activeSubzone.labelAnchors;
        currentColliders = activeSubzone.colliders;
        currentNavGrid = buildNavGrid(z, currentColliders);
        currentGrounds = [activeSubzone.groundMesh];
        activeDoorsRef.current = activeSubzone.doors ?? [];
        currentWallSurfaces = activeSubzone.wallSurfaces ?? [];
        if (zoneChanged) {
          activeTarget = null;
          activeSeat = null;
          jumpY = 0;
          jumpVel = 0;
          if (z === 'home') {
            playerPos.x = -1.8;
            playerPos.z = 5.2;
            playerPos.rotY = Math.PI;
            homeSpotRef.current = {x: -1.8, z: 5.2};
          } else if (z === 'garden') {
            playerPos.x = 0;
            playerPos.z = 10.2;
            playerPos.rotY = Math.PI;
          } else if (z === 'petshop') {
            playerPos.x = 0;
            playerPos.z = 4.6;
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
      syncPetCompanion(zoneChanged);
      refreshClickTargetsWithPet();
    };

    rebuildSceneTriggerRef.current = loadCurrentWorld;
    rebuildAvatarTriggerRef.current = (
      cfg: AvatarConfig,
      equippedTool: ToolId | null,
      carryingPet: {speciesId: PetSpeciesId; sick?: boolean} | null,
    ) => {
      scene.remove(playerRig.root);
      playerRig.heldPetRig?.dispose();
      playerRig.root.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          m.geometry.dispose();
          if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
          else m.material.dispose();
        }
      });
      playerRig = buildAvatarRig(cfg, {equippedTool, carryingPet});
      const curY =
        stateRef.current.zone === 'town'
          ? mallElev.state === 'deck'
            ? MALL_DECK_Y
            : mallElev.state === 'riding_up' || mallElev.state === 'riding_down'
              ? mallElev.y + 0.06
              : getTownGroundHeight(playerPos.x, playerPos.z, currentPlazaRadius)
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
        setBrokenRodPrompt({
          repairCost: getRodRepairCost(rod.durability, rod.maxDurability),
          maxDurability: rod.maxDurability,
        });
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
        showBubble('Quăng phao xuống nước...', spotX, 2.25, spotZ);
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
          setSpeechBubble(null);
          triggerCatchCelebration({kind: 'fish', ...res});
        }
      } else if (fishCtrl.phase === 'waiting' || fishCtrl.phase === 'nibbling') {
        resetFishing(true);
        soundFX.tap();
        showBubble('Kéo sớm quá! Cá giật mình bơi mất rồi.', spotX, 2.25, spotZ);
      }
    };

    const releaseSeatIfNeeded = () => {
      if (activeSeat) {
        if (activeSeat.isBath) {
          activeBathtubIdRef.current = null;
          activeSubzone?.setActiveBathtub?.(null);
        }
        if (activeSeat.isBed) {
          activeBedIdRef.current = null;
          activeSubzone?.setActiveBed?.(null);
        }
        playerPos.x = activeSeat.standX;
        playerPos.z = activeSeat.standZ;
        activeSeat = null;
      }
    };

    const startWalkTo = (
      x: number,
      z: number,
      arrivePose: AvatarPose,
      seat?: SeatTarget,
      onArrive?: () => void,
    ) => {
      stallTimer = 0;
      prevDistToTarget = Infinity;
      playPetTimer = 0;
      if (stateRef.current.zone === 'town' && mallElev.state === 'deck') {
        const deckPt = clampPointToMallDeck(x, z);
        activeTarget = {
          x: deckPt.x,
          z: deckPt.z,
          waypoints: [{x: deckPt.x, z: deckPt.z}],
          waypointIdx: 0,
          arrivePose,
          seat,
          onArrive,
        };
        return;
      }
      const b = getZoneWalkBounds(stateRef.current.zone);
      const clampedX = THREE.MathUtils.clamp(x, b.minX, b.maxX);
      const clampedZ = THREE.MathUtils.clamp(z, b.minZ, b.maxZ);
      const waypoints = findSmartPath(
        currentNavGrid,
        currentColliders,
        playerPos.x,
        playerPos.z,
        clampedX,
        clampedZ,
      );
      activeTarget = {
        x: clampedX,
        z: clampedZ,
        waypoints,
        waypointIdx: 0,
        arrivePose,
        seat,
        onArrive,
      };
    };

    jumpActionRef.current = () => {
      if (
        stateRef.current.zone === 'town' &&
        (mallElev.state === 'riding_up' || mallElev.state === 'riding_down')
      ) {
        return;
      }
      if (jumpY > 0.02 || jumpVel > 0.02 || netSwingCtrl.active) return;
      if (fishCtrl.phase !== 'idle') {
        resetFishing(true);
      }
      playPetTimer = 0;
      releaseSeatIfNeeded();
      jumpVel = JUMP_VELOCITY;
      soundFX.tap();
    };

    catchActionRef.current = () => {
      if (stateRef.current.zone !== 'town') return;
      const net = stateRef.current.bugNet;
      if (!net.owned || !net.equipped) return;
      if (!stateRef.current.showJoystick) {
        soundFX.tap();
        showBubble('Vào Menu Điện Thoại (góc trên trái) → Bật Joystick để bắt côn trùng!');
        return;
      }
      if (net.durability <= 0) {
        soundFX.tap();
        setBrokenNetPrompt({
          repairCost: getNetRepairCost(net.durability, net.maxDurability),
          maxDurability: net.maxDurability,
        });
        return;
      }
      if (netSwingCtrl.active || jumpY > 0.05) return;
      if (fishCtrl.phase !== 'idle') {
        resetFishing(true);
      }
      activeTarget = null;
      releaseSeatIfNeeded();
      netSwingCtrl.active = true;
      netSwingCtrl.elapsed = 0;
      netSwingCtrl.catchEvaluated = false;
      soundFX.tap();
    };

    teleportPlazaActionRef.current = () => {
      if (activeZoneLoaded !== 'town') {
        pendingPlazaSpawnRef.current = true;
        return;
      }
      pendingPlazaSpawnRef.current = false;
      mallElev.state = 'ground';
      mallElev.progress = 0;
      mallElev.y = 0.04;
      activeTown?.setMallElevatorY?.(0.04);
      mallElevatorHudRef.current = 'none';
      setMallElevatorHud('none');
      playPetTimer = 0;
      activeTarget = null;
      activeSeat = null;
      jumpY = 0;
      jumpVel = 0;
      if (fishCtrl.phase !== 'idle') {
        resetFishing(false);
      }
      playerPos.x = 0;
      playerPos.z = 3.6;
      playerPos.rotY = 0;
      playerPos.pose = 'idle';
      const spawnY = getTownGroundHeight(playerPos.x, playerPos.z, currentPlazaRadius);
      prevGroundY = spawnY;
      playerRig.root.position.set(playerPos.x, spawnY, playerPos.z);
      playerRig.root.rotation.y = playerPos.rotY;
      cameraTransitionActive = true;
      showBubble('Đã di chuyển về Quảng Trường!', 0, spawnY + 2.05, 3.6);
    };

    const startMallElevatorRide = () => {
      if (stateRef.current.zone !== 'town') return;
      if (mallElev.state === 'riding_up' || mallElev.state === 'riding_down') return;
      if (fishCtrl.phase !== 'idle') {
        resetFishing(true);
      }
      if (selectedPetRef.current) {
        selectedPetRef.current = null;
        setPetArcMenuPos(null);
      }
      playPetTimer = 0;

      if (mallElev.state === 'ground') {
        const boardUp = () => {
          mallElev.state = 'riding_up';
          mallElev.progress = 0;
          activeTarget = null;
          releaseSeatIfNeeded();
          jumpY = 0;
          jumpVel = 0;
          playPetTimer = 0;
          soundFX.sparkle();
          showBubble('Thang máy kính đang đưa bạn lên Đài Quan Sát tầng 25m...');
        };
        const dist = Math.hypot(
          playerPos.x - MALL_ELEVATOR_BOARD_POS.x,
          playerPos.z - MALL_ELEVATOR_BOARD_POS.z,
        );
        if (dist < 1.25) {
          boardUp();
        } else {
          startWalkTo(
            MALL_ELEVATOR_BOARD_POS.x,
            MALL_ELEVATOR_BOARD_POS.z,
            'idle',
            undefined,
            boardUp,
          );
        }
      } else if (mallElev.state === 'deck') {
        const boardDown = () => {
          mallElev.state = 'riding_down';
          mallElev.progress = 0;
          activeTarget = null;
          releaseSeatIfNeeded();
          jumpY = 0;
          jumpVel = 0;
          playPetTimer = 0;
          soundFX.tap();
          showBubble('Thang máy kính đang đưa bạn xuống tầng trệt...');
        };
        const dist = Math.hypot(playerPos.x + 46.65, playerPos.z - MALL_ELEVATOR_CAB_POS.z);
        if (dist < 0.95) {
          boardDown();
        } else {
          startWalkTo(-46.65, MALL_ELEVATOR_CAB_POS.z, 'idle', undefined, boardDown);
        }
      }
    };
    mallRideActionRef.current = startMallElevatorRide;

    farmPondFishActionRef.current = () => {
      if (stateRef.current.zone !== 'garden') return;
      const spotX = 15.2;
      const spotZ = 3.0;
      const dist = Math.hypot(playerPos.x - spotX, playerPos.z - spotZ);
      if (dist < 1.35 || fishCtrl.phase !== 'idle') {
        handleSpotFishing(spotX, spotZ, Math.PI / 2);
      } else {
        startWalkTo(spotX, spotZ, 'idle', undefined, () =>
          handleSpotFishing(spotX, spotZ, Math.PI / 2),
        );
      }
    };

    loadCurrentWorld();

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const handlePointerTap = (clientX: number, clientY: number) => {
      if (
        stateRef.current.zone === 'town' &&
        (mallElev.state === 'riding_up' || mallElev.state === 'riding_down')
      ) {
        return;
      }
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
        let firstWallHitId: string | undefined;
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
            firstWallHitId = obj.userData.wallId as string | undefined;
          }
        }

        if (selId) {
          if (selCat?.wallMount && selPlaced) {
            let refPt = firstWallHitPoint;
            if (!refPt && currentGrounds.length > 0) {
              const groundHits = raycaster.intersectObjects(currentGrounds, false);
              if (groundHits.length > 0) refPt = groundHits[0].point;
            }
            if (refPt) {
              const snapped = snapPointToNearestWall(
                refPt.x,
                refPt.z,
                selCat,
                camera.position,
                currentWallSurfaces,
                stateRef.current.placedFurniture,
                selId,
                firstWallHitPoint ? firstWallHitId : undefined,
                firstWallHitPoint ? firstWallHitPoint.y : undefined,
                selPlaced.y,
              );
              if (snapped.blocked) {
                soundFX.tap();
                showBubble('Chỗ tường này đang có vật cản (cửa hoặc đồ cao)!');
              } else {
                soundFX.tap();
                callbacksRef.current.onMoveFurniture(
                  selId,
                  snapped.x,
                  snapped.z,
                  snapped.rotY,
                  snapped.y,
                );
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
      selectedPetRef.current = null;
      setPetArcMenuPos(null);

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
            startWalkTo(data.tx as number, data.tz as number, 'sit', seatInfo, () =>
              soundFX.sparkle(),
            );
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
              isSwing: true,
            };
            startWalkTo(data.tx as number, data.tz as number, 'sit', seatInfo, () => {
              soundFX.sparkle();
              callbacksRef.current.onBoostMood();
              showBubble('Đung đưa xích đu ngoài trời thật thư giãn! (+Vui vẻ)');
            });
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
            startWalkTo(data.tx as number, data.tz as number, 'sit', seatInfo, () => {
              soundFX.sparkle();
              callbacksRef.current.onBoostMood();
              showBubble('Ngồi sưởi ấm bên bếp lửa trại thật chill! (+Vui vẻ)');
            });
            return;
          }

          if (kind === 'outdoor_telescope') {
            soundFX.tap();
            const faceRot = data.faceRotY as number | undefined;
            startWalkTo(data.tx as number, data.tz as number, 'idle', undefined, () => {
              if (typeof faceRot === 'number') {
                playerPos.rotY = faceRot;
              }
              soundFX.sparkle();
              callbacksRef.current.onBoostMood();
              const isNightNow = stateRef.current.timeOfDay === 'night';
              showBubble(
                isNightNow
                  ? 'Ngắm trăng sao qua kính thiên văn thật lung linh! (+Vui vẻ)'
                  : 'Ngắm cảnh thị trấn qua kính thiên văn thật tuyệt! (+Vui vẻ)',
              );
            });
            return;
          }

          if (kind === 'zone') {
            soundFX.tap();
            startWalkTo(data.tx as number, data.tz as number, 'idle', undefined, () => {
              soundFX.enterDoor();
              callbacksRef.current.onChangeZone(data.zone as ZoneId);
            });
            return;
          }

          if (kind === 'settings') {
            soundFX.tap();
            startWalkTo(data.tx as number, data.tz as number, 'idle', undefined, () => {
              soundFX.sparkle();
              callbacksRef.current.onOpenSettings();
            });
            return;
          }

          if (kind === 'daily_quests') {
            soundFX.tap();
            startWalkTo(data.tx as number, data.tz as number, 'idle', undefined, () => {
              soundFX.sparkle();
              callbacksRef.current.onOpenDailyQuests();
            });
            return;
          }

          if (kind === 'exit') {
            soundFX.tap();
            startWalkTo(data.tx as number, data.tz as number, 'idle', undefined, () => {
              soundFX.enterDoor();
              setFishingState('idle');
              callbacksRef.current.onChangeZone('town');
            });
            return;
          }

          if (kind === 'wardrobe') {
            soundFX.tap();
            startWalkTo(data.tx as number, data.tz as number, 'idle', undefined, () => {
              soundFX.sparkle();
              callbacksRef.current.onOpenWardrobe();
            });
            return;
          }

          if (kind === 'bed') {
            soundFX.tap();
            const bedId = data.furnitureId as string;
            const bedSeat: SeatTarget = {
              seatX: (data.seatX as number) ?? 2.35,
              seatZ: (data.seatZ as number) ?? -3.1,
              seatY: (data.seatY as number) ?? 0.65,
              rotY: (data.sitRotY as number) ?? 0,
              standX: data.tx as number,
              standZ: data.tz as number,
              isBed: true,
            };
            startWalkTo(data.tx as number, data.tz as number, 'sleep', bedSeat, () => {
              soundFX.nap();
              activeBedIdRef.current = bedId;
              activeSubzone?.setActiveBed?.(bedId);
              callbacksRef.current.onRestoreEnergy();
              showBubble('Ngủ thật ngon! (+Năng lượng)', bedSeat.seatX, 2.1, bedSeat.seatZ);
            });
            return;
          }

          if (kind === 'sofa') {
            soundFX.tap();
            const sofaSeat: SeatTarget = {
              seatX: (data.seatX as number) ?? -2.38,
              seatZ: (data.seatZ as number) ?? 1.3,
              seatY: (data.seatY as number) ?? 0.52,
              rotY: (data.sitRotY as number) ?? Math.PI / 2,
              standX: data.tx as number,
              standZ: data.tz as number,
            };
            startWalkTo(data.tx as number, data.tz as number, 'sit', sofaSeat, () => {
              soundFX.sparkle();
              callbacksRef.current.onBoostMood();
              showBubble('Thư giãn thật thích! (+Vui vẻ)', sofaSeat.seatX, 2.0, sofaSeat.seatZ);
            });
            return;
          }

          if (kind === 'bathtub') {
            soundFX.tap();
            const tubId = data.furnitureId as string;
            const bathSeat: SeatTarget = {
              seatX: (data.seatX as number) ?? 9.2,
              seatZ: (data.seatZ as number) ?? -7.8,
              seatY: (data.seatY as number) ?? 0.245,
              rotY: (data.sitRotY as number) ?? Math.PI / 2,
              standX: data.tx as number,
              standZ: data.tz as number,
              isBath: true,
            };
            startWalkTo(data.tx as number, data.tz as number, 'bath', bathSeat, () => {
              soundFX.splash();
              activeBathtubIdRef.current = tubId;
              activeSubzone?.setActiveBathtub?.(tubId);
              callbacksRef.current.onBoostMood();
              showBubble(
                'Ngâm bồn nước ấm ngập tới cổ thật sảng khoái! (+Vui vẻ)',
                bathSeat.seatX,
                2.0,
                bathSeat.seatZ,
              );
            });
            return;
          }

          if (kind === 'lamp') {
            const fid = data.furnitureId as string;
            const label = (data.label as string) || 'Đèn';
            const doToggleLamp = () => {
              const cur = lampStatesRef.current[fid] ?? true;
              const nextOn = !cur;
              lampStatesRef.current[fid] = nextOn;
              activeSubzone?.setLampOn?.(fid, nextOn);
              const houseLamps = activeSubzone?.getHouseLamps?.() ?? [];
              const matched = houseLamps.find((l) => l.id === fid);
              if (matched) {
                nearbyLampKeyRef.current = `${matched.id}:${nextOn}`;
                setNearbyLamp({...matched, isOn: nextOn});
              }
              soundFX.tap();
              showBubble(nextOn ? `Đã bật ${label}!` : `Đã tắt ${label}.`);
            };
            const dist = Math.hypot(playerPos.x - (data.tx as number), playerPos.z - (data.tz as number));
            if (dist < 2.65) {
              doToggleLamp();
            } else {
              soundFX.tap();
              startWalkTo(data.tx as number, data.tz as number, 'idle', undefined, doToggleLamp);
            }
            return;
          }

          if (kind === 'well') {
            soundFX.tap();
            startWalkTo(data.tx as number, data.tz as number, 'idle', undefined, () => {
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
            });
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
                startWalkTo(tx, tz, 'idle', undefined, doHarvest);
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
              startWalkTo(tx, tz, 'idle');
            }
            return;
          }

          if (kind === 'farm_mill') {
            soundFX.tap();
            startWalkTo(data.tx as number, data.tz as number, 'idle', undefined, () => {
              soundFX.sparkle();
              callbacksRef.current.onOpenWorkshop('mill');
            });
            return;
          }

          if (kind === 'farm_kitchen') {
            soundFX.tap();
            startWalkTo(data.tx as number, data.tz as number, 'idle', undefined, () => {
              soundFX.sparkle();
              callbacksRef.current.onOpenWorkshop('kitchen');
            });
            return;
          }

          if (kind === 'order_board') {
            soundFX.tap();
            startWalkTo(data.tx as number, data.tz as number, 'idle', undefined, () => {
              soundFX.sparkle();
              callbacksRef.current.onOpenOrders();
            });
            return;
          }

          if (kind === 'farm_storage') {
            soundFX.tap();
            startWalkTo(data.tx as number, data.tz as number, 'idle', undefined, () => {
              soundFX.sparkle();
              callbacksRef.current.onOpenStorage();
            });
            return;
          }

          if (kind === 'pasture_spot') {
            soundFX.tap();
            const targetCoop = data.coop as CoopKind | undefined;
            startWalkTo(data.tx as number, data.tz as number, 'idle', undefined, () => {
              soundFX.sparkle();
              callbacksRef.current.onOpenPasture(targetCoop);
            });
            return;
          }

          if (kind === 'pond_spot') {
            soundFX.tap();
            if (stateRef.current.fishingState !== 'idle') {
              handleSpotFishing(15.2, 3.0, Math.PI / 2);
              return;
            }
            startWalkTo(data.tx as number, data.tz as number, 'idle', undefined, () => {
              soundFX.splash();
              callbacksRef.current.onOpenPond();
            });
            return;
          }

          if (kind === 'farm_shop') {
            soundFX.tap();
            startWalkTo(data.tx as number, data.tz as number, 'idle', undefined, () => {
              soundFX.sparkle();
              callbacksRef.current.onOpenFarmShop();
            });
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
            startWalkTo(spotX, spotZ, 'idle', undefined, () => {
              handleSpotFishing(spotX, spotZ, 0);
            });
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
            startWalkTo(spotX, spotZ, 'idle', undefined, () => {
              handleSpotFishing(spotX, spotZ, Math.PI);
            });
            return;
          }

          if (kind === 'arcade_star') {
            soundFX.tap();
            startWalkTo(data.tx as number, data.tz as number, 'idle', undefined, () => {
              setMiniScore(0);
              setMiniActive(true);
              setStarPos({x: 30 + Math.random() * 45, y: 25 + Math.random() * 50});
              soundFX.sparkle();
            });
            return;
          }

          if (kind === 'arcade_claw') {
            soundFX.tap();
            startWalkTo(data.tx as number, data.tz as number, 'idle', undefined, () => {
              soundFX.sparkle();
              callbacksRef.current.onAddCoins(8);
              showBubble('Gắp trúng Gấu Bông! +8 Xu', playerPos.x, 2.1, playerPos.z);
            });
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
                startWalkTo(
                  door.x + (dx / len) * 1.15,
                  door.z + (dz / len) * 1.15,
                  'idle',
                  undefined,
                  () => {
                    const nextOpen = !door.isOpen;
                    door.setOpen(nextOpen);
                    openDoorsRef.current[door.id] = nextOpen;
                    soundFX.enterDoor();
                    nearbyDoorKeyRef.current = `${door.id}:${nextOpen}`;
                    setNearbyDoor({id: door.id, label: door.label, isOpen: nextOpen});
                  },
                );
              }
            }
            return;
          }

          if (kind === 'furniture' || kind === 'house_wall') {
            return;
          }

          if (kind === 'open_shop') {
            soundFX.tap();
            startWalkTo(data.tx as number, data.tz as number, 'idle', undefined, () => {
              soundFX.sparkle();
              callbacksRef.current.onOpenShop();
            });
            return;
          }

          if (kind === 'open_furniture_shop') {
            soundFX.tap();
            startWalkTo(data.tx as number, data.tz as number, 'idle', undefined, () => {
              soundFX.sparkle();
              callbacksRef.current.onOpenFurnitureShop();
            });
            return;
          }

          if (kind === 'koi_shop') {
            soundFX.tap();
            startWalkTo(data.tx as number, data.tz as number, 'idle', undefined, () => {
              soundFX.sparkle();
              callbacksRef.current.onOpenKoiShop();
            });
            return;
          }

          if (kind === 'active_pet') {
            soundFX.tap();
            const petId = data.petId as string;
            if (petCompanion.rig && stateRef.current.activePet?.id === petId) {
              const cw = container?.clientWidth || window.innerWidth || 800;
              const ch = container?.clientHeight || window.innerHeight || 600;
              _projVec
                .set(
                  petCompanion.rig.root.position.x,
                  petCompanion.rig.root.position.y + 0.55,
                  petCompanion.rig.root.position.z,
                )
                .project(camera);
              const rawX = ((_projVec.x + 1) / 2) * cw;
              const rawY = ((-_projVec.y + 1) / 2) * ch;
              const padX = Math.min(185, cw * 0.38);
              const minY = Math.min(185, ch * 0.45);
              selectedPetRef.current = {petId};
              setPetArcMenuPos({
                petId,
                x: Math.max(padX, Math.min(cw - padX, rawX)),
                y: Math.max(minY, Math.min(ch - 85, rawY)),
              });
            }
            return;
          }

          if (kind === 'ivan_npc') {
            soundFX.tap();
            startWalkTo(data.tx as number, data.tz as number, 'idle', undefined, () => {
              soundFX.sparkle();
              callbacksRef.current.onOpenPetSupplyShop();
            });
            return;
          }

          if (kind === 'open_pet_adopt') {
            if (stateRef.current.zone === 'town' && mallElev.state === 'deck') return;
            soundFX.tap();
            startWalkTo(data.tx as number, data.tz as number, 'idle', undefined, () => {
              soundFX.sparkle();
              callbacksRef.current.onOpenPetAdopt();
            });
            return;
          }

          if (kind === 'mall_entrance') {
            soundFX.tap();
            if (stateRef.current.zone === 'town' && mallElev.state === 'deck') {
              showBubble('Bạn đang ở trên Sân Thượng May Mall! Bấm thang máy kính để xuống tầng trệt.');
              return;
            }
            startWalkTo(data.tx as number, data.tz as number, 'idle', undefined, () => {
              soundFX.tap();
              showBubble(
                'Cửa vào May Mall (Map bên trong sắp ra mắt)! Hiện bạn có thể đi thang máy kính lên Sân Thượng.',
              );
            });
            return;
          }

          if (kind === 'mall_elevator') {
            soundFX.tap();
            startMallElevatorRide();
            return;
          }

          if (stateRef.current.zone === 'town' && mallElev.state === 'deck') {
            return;
          }
        }
      }

      // 2. Tap on walkable ground or hill -> smart A* route around obstacles cleanly
      if (currentGrounds.length > 0) {
        const groundHits = raycaster.intersectObjects(currentGrounds, false);
        if (groundHits.length > 0) {
          playPetTimer = 0;
          if (fishCtrl.phase !== 'idle') {
            resetFishing(true);
          }
          if (selectedPlotRef.current) {
            selectedPlotRef.current = null;
            setArcMenuPos(null);
          }
          if (selectedPetRef.current) {
            selectedPetRef.current = null;
            setPetArcMenuPos(null);
          }
          releaseSeatIfNeeded();

          if (stateRef.current.zone === 'town' && mallElev.state === 'deck') {
            const deckHit = groundHits.find((h) => h.object.userData?.isMallDeck);
            if (!deckHit) return;
            const deckPt = clampPointToMallDeck(deckHit.point.x, deckHit.point.z);
            startWalkTo(deckPt.x, deckPt.z, 'idle');
            return;
          }

          const groundHit = groundHits.find((h) => !h.object.userData?.isMallDeck);
          if (!groundHit) return;
          const pt = groundHit.point;
          const b = getZoneWalkBounds(stateRef.current.zone);
          const clampedX = THREE.MathUtils.clamp(pt.x, b.minX, b.maxX);
          const clampedZ = THREE.MathUtils.clamp(pt.z, b.minZ, b.maxZ);
          const onBedNow = stateRef.current.zone === 'town' && prevGroundY + jumpY >= 0.86;
          const safeTarget = resolvePointAgainstColliders(
            clampedX,
            clampedZ,
            currentColliders,
            PLAYER_RADIUS,
            onBedNow,
          );
          if (onBedNow && isPointOnPlazaFlowerBed(safeTarget.x, safeTarget.z)) {
            stallTimer = 0;
            prevDistToTarget = Infinity;
            activeTarget = {
              x: safeTarget.x,
              z: safeTarget.z,
              waypoints: [{x: safeTarget.x, z: safeTarget.z}],
              waypointIdx: 0,
              arrivePose: 'idle',
            };
          } else {
            startWalkTo(safeTarget.x, safeTarget.z, 'idle');
          }
        }
      }
    };

    const shouldAutoFullscreen =
      typeof navigator !== 'undefined' &&
      (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

    let fullscreenUnavailable = false;
    const tryEnterBrowserFullscreen = () => {
      if (!shouldAutoFullscreen || fullscreenUnavailable) return;
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
      if (shouldAutoFullscreen) {
        tryEnterBrowserFullscreen();
      }
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
    if (shouldAutoFullscreen) {
      window.addEventListener('pointerdown', onWindowGameTouch, {passive: true});
    }

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

      const isIndoor = z === 'home' || z === 'boutique' || z === 'arcade' || z === 'petshop';
      const isHomeDark = z === 'home' && !houseLightsOnRef.current;
      const targetBg = isHomeDark
        ? 0x0c1324
        : tod === 'night'
          ? isIndoor
            ? 0x161c30
            : 0x101e38
          : 0xb2ddf2;
      _bgColorTarget.setHex(targetBg);
      (scene.background as THREE.Color).lerp(_bgColorTarget, 0.08);
      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.color.copy(scene.background as THREE.Color);
        scene.fog.density = THREE.MathUtils.damp(
          scene.fog.density,
          (tod === 'night' && !isIndoor) || isHomeDark ? 0.0025 : 0.0021,
          5,
          delta,
        );
      }
      scene.environmentIntensity = THREE.MathUtils.damp(
        scene.environmentIntensity,
        isHomeDark
          ? 0.08
          : tod === 'night'
            ? isIndoor
              ? 0.28
              : 0.16
            : 0.42,
        5,
        delta,
      );
      renderer.toneMappingExposure = THREE.MathUtils.damp(
        renderer.toneMappingExposure,
        isHomeDark ? 0.78 : tod === 'night' ? 0.88 : 0.96,
        5,
        delta,
      );
      sunLight.intensity = THREE.MathUtils.damp(
        sunLight.intensity,
        isHomeDark
          ? 0.2
          : tod === 'night'
            ? isIndoor
              ? 0.65
              : 0.52
            : 1.22,
        5,
        delta,
      );
      _sunColorTarget.set(
        isHomeDark
          ? '#7B96D4'
          : tod === 'night'
            ? isIndoor
              ? '#CBD8F5'
              : '#BFD6FF'
            : '#FFF2D8',
      );
      sunLight.color.lerp(_sunColorTarget, 0.08);
      hemiLight.intensity = THREE.MathUtils.damp(
        hemiLight.intensity,
        isHomeDark ? 0.16 : tod === 'night' ? 0.38 : 0.58,
        5,
        delta,
      );
      _hemiSkyTarget.set(
        isHomeDark
          ? '#3F568D'
          : tod === 'night'
            ? isIndoor
              ? '#7A90BF'
              : '#5478B8'
            : '#DCEFFF',
      );
      _hemiGroundTarget.set(
        isHomeDark
          ? '#1E2334'
          : tod === 'night'
            ? isIndoor
              ? '#3F3A36'
              : '#223B3E'
            : '#6A8C58',
      );
      hemiLight.color.lerp(_hemiSkyTarget, 0.08);
      hemiLight.groundColor.lerp(_hemiGroundTarget, 0.08);
      rimLight.intensity = THREE.MathUtils.damp(
        rimLight.intensity,
        isHomeDark ? 0.14 : tod === 'night' ? 0.26 : 0.42,
        5,
        delta,
      );
      _rimColorTarget.set(
        isHomeDark || tod === 'night' ? '#87B0F0' : '#A8D2FF',
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

      const isRidingMallElevator =
        z === 'town' && (mallElev.state === 'riding_up' || mallElev.state === 'riding_down');
      const isOnMallDeck = z === 'town' && mallElev.state === 'deck';

      if (isRidingMallElevator) {
        mallElev.progress = Math.min(1, mallElev.progress + delta / mallElev.duration);
        const eased = mallElev.progress * mallElev.progress * (3 - 2 * mallElev.progress);
        mallElev.y =
          mallElev.state === 'riding_up'
            ? THREE.MathUtils.lerp(0.04, MALL_DECK_Y, eased)
            : THREE.MathUtils.lerp(MALL_DECK_Y, 0.04, eased);
        activeTown?.setMallElevatorY?.(mallElev.y);
        playerPos.x = MALL_ELEVATOR_CAB_POS.x;
        playerPos.z = MALL_ELEVATOR_CAB_POS.z;
        playerPos.rotY = Math.PI / 2;
        playerPos.pose = 'idle';
        activeTarget = null;
        jumpY = 0;
        jumpVel = 0;
        playPetTimer = 0;
        if (mallElev.progress >= 1) {
          if (mallElev.state === 'riding_up') {
            mallElev.state = 'deck';
            mallElev.y = MALL_DECK_Y;
            playerPos.x = -46.15;
            playerPos.z = -2.5;
            playerPos.rotY = Math.PI / 2;
            prevGroundY = MALL_DECK_Y;
            showBubble('Chào mừng đến Đài Quan Sát May Mall!');
          } else {
            mallElev.state = 'ground';
            mallElev.y = 0.04;
            playerPos.x = MALL_ELEVATOR_BOARD_POS.x;
            playerPos.z = MALL_ELEVATOR_BOARD_POS.z;
            playerPos.rotY = Math.PI / 2;
            prevGroundY = getTownGroundHeight(playerPos.x, playerPos.z, currentPlazaRadius);
          }
        }
      }

      // Jump vertical physics
      if (!isRidingMallElevator && (jumpY > 0 || jumpVel !== 0)) {
        jumpY += jumpVel * delta;
        jumpVel -= JUMP_GRAVITY * delta;
        if (jumpY <= 0) {
          jumpY = 0;
          jumpVel = 0;
          if (!activeTarget && playerPos.pose === 'jump') {
            playerPos.pose = 'idle';
          }
        }
      }
      const isAirborne = !isRidingMallElevator && jumpY > 0.01;

      const onFlowerBedLevel = z === 'town' && !isOnMallDeck && prevGroundY + jumpY >= 0.86;

      // Dynamic Virtual Joystick steering OR Smart Waypoint Walk Kinematics
      const joy = joystickInputRef.current;
      const joyMag = !isRidingMallElevator && joy.active ? Math.hypot(joy.x, joy.y) : 0;
      let moveHorizSpeed = 0;
      let isCreepingNow = false;

      if (isRidingMallElevator) {
        activeTarget = null;
      } else if (netSwingCtrl.active) {
        activeTarget = null;
        playPetTimer = 0;
      } else if (joyMag > 0.08) {
        playPetTimer = 0;
        if (activeTarget) activeTarget = null;
        releaseSeatIfNeeded();
        if (fishCtrl.phase !== 'idle') {
          resetFishing(true);
        }
        if (selectedPlotRef.current) {
          selectedPlotRef.current = null;
          setArcMenuPos(null);
        }
        if (selectedPetRef.current) {
          selectedPetRef.current = null;
          setPetArcMenuPos(null);
        }

        let fwdX = controls.target.x - camera.position.x;
        let fwdZ = controls.target.z - camera.position.z;
        const fwdLen = Math.hypot(fwdX, fwdZ);
        if (fwdLen > 0.001) {
          fwdX /= fwdLen;
          fwdZ /= fwdLen;
        } else {
          fwdX = 0;
          fwdZ = -1;
        }
        const rightX = -fwdZ;
        const rightZ = fwdX;
        const moveDirX = rightX * joy.x + fwdX * -joy.y;
        const moveDirZ = rightZ * joy.x + fwdZ * -joy.y;
        const moveLen = Math.hypot(moveDirX, moveDirZ) || 1;
        isCreepingNow =
          z === 'town' &&
          !isOnMallDeck &&
          stateRef.current.bugNet.equipped &&
          joyMag <= 0.58 &&
          !isAirborne;
        const speed = isCreepingNow
          ? 0.68
          : (z === 'town' ? (isOnMallDeck ? 4.2 : 5.6) : 3.6) * Math.min(1, joyMag);
        const stepLen = speed * delta;
        const rawX = playerPos.x + (moveDirX / moveLen) * stepLen;
        const rawZ = playerPos.z + (moveDirZ / moveLen) * stepLen;

        let nextX: number;
        let nextZ: number;
        if (isOnMallDeck) {
          const deckClamped = clampPointToMallDeck(rawX, rawZ);
          nextX = deckClamped.x;
          nextZ = deckClamped.z;
        } else {
          const resolved = resolvePointAgainstColliders(
            rawX,
            rawZ,
            currentColliders,
            PLAYER_RADIUS,
            onFlowerBedLevel,
          );
          const b = getZoneWalkBounds(z);
          nextX = THREE.MathUtils.clamp(resolved.x, b.minX, b.maxX);
          nextZ = THREE.MathUtils.clamp(resolved.z, b.minZ, b.maxZ);
        }
        const dmx = nextX - playerPos.x;
        const dmz = nextZ - playerPos.z;
        playerPos.x = nextX;
        playerPos.z = nextZ;
        moveHorizSpeed = Math.hypot(dmx, dmz) / Math.max(0.001, delta);

        const targetRot =
          Math.hypot(dmx, dmz) > 0.002
            ? Math.atan2(dmx, dmz)
            : Math.atan2(moveDirX, moveDirZ);
        let diff = targetRot - playerPos.rotY;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        playerPos.rotY += diff * Math.min(1, delta * (isCreepingNow ? 10 : 14));
        playerPos.pose = isAirborne ? 'jump' : isCreepingNow ? 'creep' : 'walk';
      } else {
        if (!activeTarget && (playerPos.pose === 'walk' || playerPos.pose === 'creep')) {
          playerPos.pose = isAirborne ? 'jump' : 'idle';
        }
        // Smart waypoint walk kinematics with collision sliding & exact seat alignment
        if (activeTarget) {
          playPetTimer = 0;
          while (
            activeTarget.waypointIdx < activeTarget.waypoints.length - 1 &&
            Math.hypot(
              activeTarget.waypoints[activeTarget.waypointIdx].x - playerPos.x,
              activeTarget.waypoints[activeTarget.waypointIdx].z - playerPos.z,
            ) < 0.34
          ) {
            activeTarget.waypointIdx++;
            prevDistToTarget = Infinity;
            stallTimer = 0;
          }

          const isFinalWp = activeTarget.waypointIdx >= activeTarget.waypoints.length - 1;
          const wp = activeTarget.waypoints[activeTarget.waypointIdx] ?? activeTarget;
          const dx = wp.x - playerPos.x;
          const dz = wp.z - playerPos.z;
          const dist = Math.hypot(dx, dz);
          const speed = z === 'town' ? (isOnMallDeck ? 4.2 : 5.6) : 3.6;

          if (isFinalWp && dist < 0.16) {
            if (activeTarget.seat && !isAirborne) {
              activeSeat = activeTarget.seat;
              playerPos.x = activeTarget.seat.seatX;
              playerPos.z = activeTarget.seat.seatZ;
              playerPos.rotY = activeTarget.seat.rotY;
            } else {
              playerPos.x = activeTarget.x;
              playerPos.z = activeTarget.z;
            }
            playerPos.pose = isAirborne ? 'jump' : activeTarget.arrivePose;
            const cb = activeTarget.onArrive;
            activeTarget = null;
            stallTimer = 0;
            cb?.();
          } else {
            playerPos.pose = isAirborne ? 'jump' : 'walk';
            const dirX = dist > 0.0001 ? dx / dist : 0;
            const dirZ = dist > 0.0001 ? dz / dist : 0;
            const stepLen = Math.min(dist, speed * delta);
            const rawX = playerPos.x + dirX * stepLen;
            const rawZ = playerPos.z + dirZ * stepLen;

            let nextX: number;
            let nextZ: number;
            if (isOnMallDeck) {
              const deckClamped = clampPointToMallDeck(rawX, rawZ);
              nextX = deckClamped.x;
              nextZ = deckClamped.z;
            } else {
              let resolved = resolvePointAgainstColliders(
                rawX,
                rawZ,
                currentColliders,
                PLAYER_RADIUS,
                onFlowerBedLevel,
              );
              // Secondary tangential slide around obstacle corners
              const progress = (resolved.x - playerPos.x) * dirX + (resolved.z - playerPos.z) * dirZ;
              if (resolved.collided && progress < stepLen * 0.35) {
                const perpX = -dirZ;
                const perpZ = dirX;
                const optA = resolvePointAgainstColliders(
                  playerPos.x + perpX * stepLen * 0.9,
                  playerPos.z + perpZ * stepLen * 0.9,
                  currentColliders,
                  PLAYER_RADIUS,
                  onFlowerBedLevel,
                );
                const optB = resolvePointAgainstColliders(
                  playerPos.x - perpX * stepLen * 0.9,
                  playerPos.z - perpZ * stepLen * 0.9,
                  currentColliders,
                  PLAYER_RADIUS,
                  onFlowerBedLevel,
                );
                const distA = Math.hypot(wp.x - optA.x, wp.z - optA.z);
                const distB = Math.hypot(wp.x - optB.x, wp.z - optB.z);
                resolved = distA <= distB ? optA : optB;
              }

              const b = getZoneWalkBounds(z);
              nextX = THREE.MathUtils.clamp(resolved.x, b.minX, b.maxX);
              nextZ = THREE.MathUtils.clamp(resolved.z, b.minZ, b.maxZ);
            }

            const moveX = nextX - playerPos.x;
            const moveZ = nextZ - playerPos.z;
            playerPos.x = nextX;
            playerPos.z = nextZ;
            moveHorizSpeed = Math.hypot(moveX, moveZ) / Math.max(0.001, delta);

            if (Math.hypot(moveX, moveZ) > 0.002) {
              const targetRot = Math.atan2(moveX, moveZ);
              let diff = targetRot - playerPos.rotY;
              while (diff > Math.PI) diff -= Math.PI * 2;
              while (diff < -Math.PI) diff += Math.PI * 2;
              playerPos.rotY += diff * Math.min(1, delta * 12);
            }

            const newDist = Math.hypot(wp.x - playerPos.x, wp.z - playerPos.z);
            if (prevDistToTarget - newDist < stepLen * 0.15) {
              stallTimer += delta;
              if (stallTimer > 0.5) {
                activeTarget = null;
                playerPos.pose = isAirborne ? 'jump' : 'idle';
                stallTimer = 0;
              }
            } else {
              stallTimer = 0;
              prevDistToTarget = newDist;
            }
          }
        }
      }

      if (playPetTimer > 0) {
        if (isAirborne || isRidingMallElevator || activeTarget || activeSeat || joyMag > 0.08) {
          playPetTimer = 0;
          if (!isAirborne && !activeTarget && !activeSeat && playerPos.pose === 'play_pet') {
            playerPos.pose = 'idle';
          }
        } else {
          playPetTimer = Math.max(0, playPetTimer - delta);
          if (petCompanion.rig) {
            const pDx = petCompanion.x - playerPos.x;
            const pDz = petCompanion.z - playerPos.z;
            if (Math.hypot(pDx, pDz) > 0.05) {
              const facePetRot = Math.atan2(pDx, pDz);
              let diff = facePetRot - playerPos.rotY;
              while (diff > Math.PI) diff -= Math.PI * 2;
              while (diff < -Math.PI) diff += Math.PI * 2;
              playerPos.rotY += diff * Math.min(1, delta * 11);
            }
          }
          playerPos.pose = playPetTimer > 0 ? 'play_pet' : 'idle';
        }
      } else if (playerPos.pose === 'play_pet' && !isAirborne && !activeTarget) {
        playerPos.pose = 'idle';
      }

      if (isAirborne) {
        playerPos.pose = 'jump';
        moveHorizSpeed = Math.max(moveHorizSpeed, 2.5);
      }

      if (z === 'town') {
        activeTown?.setOutdoorSwingSeated?.(Boolean(playerPos.pose === 'sit' && activeSeat?.isSwing));
      }

      let groundOffset = 0.02;
      if (isRidingMallElevator) {
        groundOffset = mallElev.y + 0.06;
      } else if ((playerPos.pose === 'sit' || playerPos.pose === 'bath') && activeSeat) {
        groundOffset = activeSeat.seatY - 0.245;
      } else if (playerPos.pose === 'sleep' && activeSeat?.isBed) {
        groundOffset = activeSeat.seatY - 0.65;
      } else if (isOnMallDeck) {
        groundOffset = MALL_DECK_Y;
      } else if (z === 'town') {
        if (isPointOnPlazaFlowerBed(playerPos.x, playerPos.z) && prevGroundY + jumpY >= 0.82) {
          groundOffset = 0.98;
        } else {
          groundOffset = getTownGroundHeight(playerPos.x, playerPos.z, currentPlazaRadius);
        }
      } else if (z === 'garden' && playerPos.x > 9.35 && playerPos.x < 15.9 && Math.abs(playerPos.z - 3.0) < 0.98) {
        groundOffset = 0.36;
      }

      // Preserve world elevation smoothly when landing onto or stepping off elevated flower beds
      if (isRidingMallElevator) {
        prevGroundY = groundOffset;
        jumpY = 0;
      } else {
        if (groundOffset < prevGroundY - 0.05) {
          jumpY += prevGroundY - groundOffset;
        } else if (groundOffset > prevGroundY + 0.05) {
          jumpY = Math.max(0, prevGroundY + jumpY - groundOffset);
        }
        prevGroundY = groundOffset;
      }

      const isSwingingNow = Boolean(z === 'town' && playerPos.pose === 'sit' && activeSeat?.isSwing);
      const swingPose = isSwingingNow ? activeTown?.getOutdoorSwingSeatPose?.() : null;

      // Keep camera & OrbitControls always centered smoothly on the player character
      if (!cameraTransitionActive) {
        const focusX = swingPose ? swingPose.x : playerPos.x;
        const focusY = (swingPose ? swingPose.y - 0.245 : groundOffset) + 0.92;
        const focusZ = swingPose ? swingPose.z : playerPos.z;
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
      if (z === 'town' && !cameraTransitionActive) {
        const camGround = Math.max(
          TOWN_LAKE_WATER_Y + 0.35,
          getTownGroundHeight(camera.position.x, camera.position.z, currentPlazaRadius),
        );
        const minCamY = camGround + 0.55;
        if (camera.position.y < minCamY) {
          camera.position.y = minCamY;
        }
      }
      camera.updateMatrixWorld();
      _projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      _frustum.setFromProjectionMatrix(_projScreenMatrix);

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
          selectionRing.position.set(sel.x, cat.wallMount ? 0.03 : (sel.y ?? 0) + 0.03, sel.z);
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

          // Reaction timeout: fish escapes and may reduce rod durability
          if (fishCtrl.phaseElapsed >= fishCtrl.biteWindowSec) {
            const sx = fishCtrl.spotX;
            const sz = fishCtrl.spotZ;
            resetFishing(true);
            soundFX.splash();
            const durRes = callbacksRef.current.onLoseFishingDurability();
            const brokeTag = durRes.durabilityLeft === 0 ? ' · Cần câu đã hỏng!' : '';
            const durInfo =
              durRes.durabilityLost > 0
                ? ` Độ bền ${durRes.durabilityLeft}/${durRes.maxDurability}${brokeTag}`
                : '';
            showBubble(
              `Cá kéo mạnh quá, chạy mất rồi!${durInfo}`,
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

      if (swingPose) {
        playerRig.root.position.set(swingPose.x, swingPose.y - 0.245, swingPose.z);
        playerRig.root.rotation.x = swingPose.pitch * 0.85;
        playerRig.root.rotation.y = playerPos.rotY;
      } else {
        playerRig.root.position.set(playerPos.x, groundOffset + jumpY, playerPos.z);
        playerRig.root.rotation.x = 0;
        playerRig.root.rotation.y = playerPos.rotY;
      }
      if (playerRig.shadowDisc) {
        playerRig.shadowDisc.position.y = 0.004 - jumpY;
        const shScale = Math.max(0.42, 1 - jumpY * 0.28);
        playerRig.shadowDisc.scale.setScalar(shScale);
      }

      if (insectAlertCooldown > 0) {
        insectAlertCooldown = Math.max(0, insectAlertCooldown - delta);
      }

      if (netSwingCtrl.active) {
        netSwingCtrl.elapsed += delta;
        playerPos.pose = 'net_swing';
        avatarPoseProgress = Math.min(1, netSwingCtrl.elapsed / netSwingCtrl.duration);

        if (netSwingCtrl.elapsed >= 0.16 && !netSwingCtrl.catchEvaluated) {
          netSwingCtrl.catchEvaluated = true;
          const evalRes = activeTown?.tryCatchInsect?.(
            playerPos.x,
            groundOffset + jumpY,
            playerPos.z,
            playerPos.rotY,
          );
          if (evalRes?.caught) {
            const catchRes = callbacksRef.current.onCatchInsect(evalRes.caught);
            if (catchRes) {
              soundFX.sparkle();
              setSpeechBubble(null);
              triggerCatchCelebration({
                kind: 'insect',
                speciesId: catchRes.speciesId,
                name: catchRes.name,
                rarity: catchRes.rarity,
                lengthMm: catchRes.lengthMm,
                sellPrice: catchRes.sellPrice,
                isNewRecord: catchRes.isNewRecord,
                isFirstDiscovery: catchRes.isFirstDiscovery,
                durabilityLeft: catchRes.durabilityLeft,
                maxDurability: catchRes.maxDurability,
              });
            }
          } else {
            const durRes = callbacksRef.current.onLoseNetDurability();
            const durInfo =
              durRes.durabilityLeft === 0
                ? ' Vợt gỗ đã hỏng! Chạm nút Bắt để sửa.'
                : durRes.durabilityLost > 0
                  ? ` (Độ bền ${durRes.durabilityLeft}/${durRes.maxDurability})`
                  : '';
            if (evalRes && evalRes.escapedCount > 0) {
              showBubble(`Vung hụt! Côn trùng hoảng sợ bay mất rồi.${durInfo}`);
            } else if (evalRes && evalRes.startledCount > 0) {
              showBubble(
                `Chệch góc rồi! Xoay mặt thẳng vào côn trùng trước khi Bắt.${durInfo}`,
              );
            } else {
              showBubble(`Chưa trúng côn trùng nào ngay trước mặt!${durInfo}`);
            }
          }
        }

        if (netSwingCtrl.elapsed >= netSwingCtrl.duration) {
          netSwingCtrl.active = false;
          netSwingCtrl.elapsed = 0;
          playerPos.pose = 'idle';
          avatarPoseProgress = 0;
        }
      }

      updateAvatarRigAnimation(
        playerRig,
        playerPos.pose,
        elapsed,
        av.eyeStyle === 'happy_arc',
        avatarPoseProgress,
      );

      // Keep walking orbit pet cleanly grounded on hills, plaza, Skydeck, or elevator floor
      if (playerRig.heldPetRig?.speciesId === 'brown_puppy') {
        let petGy = 0.02;
        if (isRidingMallElevator) {
          petGy = mallElev.y + 0.06;
        } else if (isOnMallDeck) {
          petGy = MALL_DECK_Y;
        } else if (z === 'town') {
          const lx = playerRig.heldPetRig.root.position.x;
          const lz = playerRig.heldPetRig.root.position.z;
          const cosR = Math.cos(playerPos.rotY);
          const sinR = Math.sin(playerPos.rotY);
          const petWx = playerPos.x + lx * cosR + lz * sinR;
          const petWz = playerPos.z - lx * sinR + lz * cosR;
          petGy = getTownGroundHeight(petWx, petWz, currentPlazaRadius);
        } else if (
          z === 'garden' &&
          playerPos.x > 9.35 &&
          playerPos.x < 15.9 &&
          Math.abs(playerPos.z - 3.0) < 0.98
        ) {
          petGy = 0.36;
        }
        playerRig.heldPetRig.root.position.y = petGy - (groundOffset + jumpY);
      }

      // Update active 3D Companion Pet (walk or left-side fly, keeping safe distance from player)
      if (petCompanion.rig && petCompanion.speciesId) {
        const isFly = PET_CATALOG[petCompanion.speciesId].moveType === 'fly';
        const companionScale = petCompanion.speciesId === 'blue_bird' ? 1.35 : 1.34;
        const minSafeDist = isFly ? 1.32 : 1.22;
        let petMovedSpeed = 0;

        if (isRidingMallElevator) {
          petCompanion.playTimer = 0;
          petCompanion.playKind = 'none';
          petCompanion.x = MALL_ELEVATOR_CAB_POS.x + 0.26;
          petCompanion.z = MALL_ELEVATOR_CAB_POS.z + 0.56;
          petCompanion.y = isFly ? mallElev.y + 1.18 : mallElev.y + 0.08;
          petCompanion.rotY = Math.PI / 2;
          petCompanion.rig.root.position.set(petCompanion.x, petCompanion.y, petCompanion.z);
          petCompanion.rig.root.rotation.y = petCompanion.rotY;
          updatePetAnimation(petCompanion.rig, isFly ? 'fly' : 'idle', elapsed, {
            baseScale: companionScale,
            hoverHeight: 0,
          });
        } else if (petCompanion.playTimer > 0) {
          petCompanion.playTimer = Math.max(0, petCompanion.playTimer - delta);
          const p = 1 - petCompanion.playTimer / Math.max(0.01, petCompanion.playDuration);

          if (petCompanion.playKind === 'circle') {
            // Orbiting animation (reserved for orbit actions)
            petCompanion.playOrbitAngle += delta * 3.85;
            const radius = 1.38;
            const tx = playerPos.x + Math.cos(petCompanion.playOrbitAngle) * radius;
            const tz = playerPos.z + Math.sin(petCompanion.playOrbitAngle) * radius;
            if (isOnMallDeck) {
              const dp = clampPointToMallDeck(tx, tz);
              petCompanion.x = dp.x;
              petCompanion.z = dp.z;
            } else {
              const b = getZoneWalkBounds(z);
              petCompanion.x = THREE.MathUtils.clamp(tx, b.minX + 0.35, b.maxX - 0.35);
              petCompanion.z = THREE.MathUtils.clamp(tz, b.minZ + 0.35, b.maxZ - 0.35);
            }
            const gy = getPetGroundY(petCompanion.x, petCompanion.z, z);
            petCompanion.y = gy + 1.42 + Math.sin(elapsed * 4.5) * 0.08;
            petCompanion.rotY = Math.atan2(
              -Math.sin(petCompanion.playOrbitAngle),
              Math.cos(petCompanion.playOrbitAngle),
            );
            petCompanion.rig.root.position.set(petCompanion.x, petCompanion.y, petCompanion.z);
            petCompanion.rig.root.rotation.y = petCompanion.rotY;
            updatePetAnimation(petCompanion.rig, 'play_circle', elapsed, {
              baseScale: companionScale,
              playProgress: p,
              hoverHeight: 0,
            });
          } else {
            // Both walking pets and flying pets land/stand in front of player & hop joyfully!
            const cosR = Math.cos(playerPos.rotY);
            const sinR = Math.sin(playerPos.rotY);
            const goalX = playerPos.x + 0.16 * cosR + 1.24 * sinR;
            const goalZ = playerPos.z - 0.16 * sinR + 1.24 * cosR;
            let cgx: number;
            let cgz: number;
            if (isOnMallDeck) {
              const dp = clampPointToMallDeck(goalX, goalZ);
              cgx = dp.x;
              cgz = dp.z;
            } else {
              const b = getZoneWalkBounds(z);
              cgx = THREE.MathUtils.clamp(goalX, b.minX + 0.35, b.maxX - 0.35);
              cgz = THREE.MathUtils.clamp(goalZ, b.minZ + 0.35, b.maxZ - 0.35);
            }
            const followA = 1 - Math.exp(-8 * delta);
            petCompanion.x = THREE.MathUtils.lerp(petCompanion.x, cgx, followA);
            petCompanion.z = THREE.MathUtils.lerp(petCompanion.z, cgz, followA);
            const minPlayDist = isFly ? 1.22 : 1.16;
            const dPlayer = Math.hypot(petCompanion.x - playerPos.x, petCompanion.z - playerPos.z);
            if (dPlayer < minPlayDist && dPlayer > 0.001) {
              petCompanion.x =
                playerPos.x + ((petCompanion.x - playerPos.x) / dPlayer) * minPlayDist;
              petCompanion.z =
                playerPos.z + ((petCompanion.z - playerPos.z) / dPlayer) * minPlayDist;
            }
            if (isOnMallDeck) {
              const dp = clampPointToMallDeck(petCompanion.x, petCompanion.z);
              petCompanion.x = dp.x;
              petCompanion.z = dp.z;
            }
            const gy = getPetGroundY(petCompanion.x, petCompanion.z, z);
            petCompanion.y = isFly ? THREE.MathUtils.damp(petCompanion.y, gy, 10, delta) : gy;
            const faceRot = Math.atan2(playerPos.x - petCompanion.x, playerPos.z - petCompanion.z);
            let rDiff = faceRot - petCompanion.rotY;
            while (rDiff > Math.PI) rDiff -= Math.PI * 2;
            while (rDiff < -Math.PI) rDiff += Math.PI * 2;
            petCompanion.rotY += rDiff * Math.min(1, delta * 10);
            petCompanion.rig.root.position.set(petCompanion.x, petCompanion.y, petCompanion.z);
            petCompanion.rig.root.rotation.y = petCompanion.rotY;
            updatePetAnimation(petCompanion.rig, 'play_jump', elapsed, {
              baseScale: companionScale,
              playProgress: p,
            });
          }

          if (petCompanion.playTimer <= 0) {
            petCompanion.playKind = 'none';
          }
        } else {
          const targetOff = getPetTargetOffset(
            petCompanion.speciesId,
            playerPos.x,
            playerPos.z,
            playerPos.rotY,
            z,
          );
          const dx = targetOff.x - petCompanion.x;
          const dz = targetOff.z - petCompanion.z;
          const dist = Math.hypot(dx, dz);

          if (dist > 0.05) {
            const maxStep = (z === 'town' ? 5.6 : 3.9) * delta;
            const step = dist > 2.4 ? dist * Math.min(1, delta * 5.2) : Math.min(dist, maxStep);
            const prevX = petCompanion.x;
            const prevZ = petCompanion.z;
            petCompanion.x += (dx / dist) * step;
            petCompanion.z += (dz / dist) * step;
            petMovedSpeed =
              Math.hypot(petCompanion.x - prevX, petCompanion.z - prevZ) /
              Math.max(0.001, delta);
          }

          // Enforce safe distance so walking & flying pets NEVER touch/overlap avatar
          const curDistPlayer = Math.hypot(
            petCompanion.x - playerPos.x,
            petCompanion.z - playerPos.z,
          );
          if (curDistPlayer < minSafeDist) {
            if (curDistPlayer < 0.001) {
              petCompanion.x = targetOff.x;
              petCompanion.z = targetOff.z;
            } else {
              petCompanion.x =
                playerPos.x + ((petCompanion.x - playerPos.x) / curDistPlayer) * minSafeDist;
              petCompanion.z =
                playerPos.z + ((petCompanion.z - playerPos.z) / curDistPlayer) * minSafeDist;
            }
          }
          if (isOnMallDeck) {
            const dp = clampPointToMallDeck(petCompanion.x, petCompanion.z);
            petCompanion.x = dp.x;
            petCompanion.z = dp.z;
          }

          const gy = getPetGroundY(petCompanion.x, petCompanion.z, z);
          if (isFly) {
            const targetY = gy + 1.32;
            petCompanion.y = THREE.MathUtils.damp(petCompanion.y, targetY, 8, delta);
          } else {
            petCompanion.y = THREE.MathUtils.damp(petCompanion.y, gy, 12, delta);
          }

          const desiredRot = dist > 0.25 ? Math.atan2(dx, dz) : playerPos.rotY;
          let rDiff = desiredRot - petCompanion.rotY;
          while (rDiff > Math.PI) rDiff -= Math.PI * 2;
          while (rDiff < -Math.PI) rDiff += Math.PI * 2;
          petCompanion.rotY += rDiff * Math.min(1, delta * 9);

          petCompanion.rig.root.position.set(petCompanion.x, petCompanion.y, petCompanion.z);
          petCompanion.rig.root.rotation.y = petCompanion.rotY;

          updatePetAnimation(
            petCompanion.rig,
            isFly ? 'fly' : petMovedSpeed > 0.14 ? 'walk' : 'idle',
            elapsed,
            {baseScale: companionScale, hoverHeight: 0},
          );
        }
      }

      const isEditingHome = z === 'home' && stateRef.current.editFurnitureMode;

      if (z === 'town') {
        activeTown?.updateFishingVisuals?.(fishVisualFrame, elapsed);
        const insectEvents = activeTown?.updateInsects?.(
          playerPos.x,
          groundOffset + jumpY,
          playerPos.z,
          moveHorizSpeed,
          isCreepingNow,
          elapsed,
          delta,
          _frustum,
          camera.position.x,
          camera.position.z,
        );
        if (
          insectEvents &&
          (insectEvents.escapedByRun > 0 || insectEvents.startledByRun > 0) &&
          stateRef.current.bugNet.equipped &&
          !netSwingCtrl.active &&
          insectAlertCooldown <= 0
        ) {
          insectAlertCooldown = 3.2;
          showBubble(
            insectEvents.escapedByRun > 0
              ? 'Đi quá mạnh làm côn trùng bay mất! Kéo nhẹ Joystick để đi rón rén.'
              : 'Côn trùng giật mình bay sang chỗ khác! Kéo nhẹ Joystick để đi chậm.',
          );
        }
        activeTown?.update(elapsed, tod, _frustum, camera.position);
      } else {
        if (z === 'garden' || z === 'fishing') {
          activeSubzone?.updateFishingVisuals?.(fishVisualFrame, elapsed);
        }
        activeSubzone?.update(elapsed, tod, {cameraPos: camera.position, playerPos});
      }

      renderer.render(scene, camera);

      // Project crisp native DOM nameplates every frame (ONLY visible on close zoom <= 14.5..17.5m)
      {
        const cwNow = container?.clientWidth || window.innerWidth || 800;
        const chNow = container?.clientHeight || window.innerHeight || 600;
        const pDom = playerNameDomRef.current;
        if (pDom) {
          playerRig.headPivot.getWorldPosition(_headAnchorVec);
          _headAnchorVec.y += playerRig.headTopAbovePivot + 0.14;
          const camDistPlayer = camera.position.distanceTo(_headAnchorVec);
          const pAlpha =
            camDistPlayer <= 14.5
              ? 1
              : camDistPlayer >= 17.5
                ? 0
                : 1 - (camDistPlayer - 14.5) / 3.0;
          _projVec.copy(_headAnchorVec).project(camera);
          if (!isEditingHome && pAlpha > 0.02 && _projVec.z >= -1 && _projVec.z <= 1) {
            const px = ((_projVec.x + 1) / 2) * cwNow;
            const py = ((-_projVec.y + 1) / 2) * chNow;
            pDom.style.display = 'block';
            pDom.style.opacity = pAlpha.toFixed(2);
            pDom.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0) translate(-50%, -100%)`;
          } else {
            pDom.style.display = 'none';
          }
        }

        const petDom = petNameDomRef.current;
        if (petDom) {
          const curPetTag = stateRef.current.activePet;
          const isCarryingTag = Boolean(
            curPetTag && stateRef.current.carriedPetId === curPetTag.id && playerRig.heldPetRig,
          );
          if (curPetTag && !isEditingHome && (isCarryingTag || petCompanion.rig)) {
            if (isCarryingTag && playerRig.heldPetRig) {
              playerRig.heldPetRig.root.getWorldPosition(_petAnchorVec);
              _petAnchorVec.y += curPetTag.speciesId === 'blue_bird' ? 0.58 : 0.72;
            } else if (petCompanion.rig) {
              petCompanion.rig.root.getWorldPosition(_petAnchorVec);
              _petAnchorVec.y += curPetTag.speciesId === 'blue_bird' ? 0.66 : 0.84;
            }
            const camDistPet = camera.position.distanceTo(_petAnchorVec);
            const petAlpha =
              camDistPet <= 14.5
                ? 1
                : camDistPet >= 17.5
                  ? 0
                  : 1 - (camDistPet - 14.5) / 3.0;
            _projVec.copy(_petAnchorVec).project(camera);
            if (petAlpha > 0.02 && _projVec.z >= -1 && _projVec.z <= 1) {
              const bx = ((_projVec.x + 1) / 2) * cwNow;
              const by = ((-_projVec.y + 1) / 2) * chNow;
              petDom.style.display = 'flex';
              petDom.style.opacity = petAlpha.toFixed(2);
              petDom.style.transform = `translate3d(${bx.toFixed(1)}px, ${by.toFixed(1)}px, 0) translate(-50%, -100%)`;
            } else {
              petDom.style.display = 'none';
            }
          } else {
            petDom.style.display = 'none';
          }
        }
      }

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
        const nextElevHud: 'none' | 'near_ground' | 'deck' | 'riding' =
          z !== 'town'
            ? 'none'
            : isRidingMallElevator
              ? 'riding'
              : isOnMallDeck
                ? 'deck'
                : Math.hypot(
                      playerPos.x - MALL_ELEVATOR_BOARD_POS.x,
                      playerPos.z - MALL_ELEVATOR_BOARD_POS.z,
                    ) < 4.4
                  ? 'near_ground'
                  : 'none';
        if (nextElevHud !== mallElevatorHudRef.current) {
          mallElevatorHudRef.current = nextElevHud;
          setMallElevatorHud(nextElevHud);
        }
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

        if (z === 'home') {
          const houseLamps = activeSubzoneRef.current?.getHouseLamps?.() ?? [];
          let closestLamp: HouseLampInfo | null = null;
          let bestLampD = 2.85;
          for (const l of houseLamps) {
            const d = Math.hypot(playerPos.x - l.x, playerPos.z - l.z);
            if (d < bestLampD) {
              bestLampD = d;
              closestLamp = l;
            }
          }
          const nextLampKey = closestLamp ? `${closestLamp.id}:${closestLamp.isOn}` : '';
          if (nextLampKey !== nearbyLampKeyRef.current) {
            nearbyLampKeyRef.current = nextLampKey;
            setNearbyLamp(closestLamp);
          }
        } else if (nearbyLampKeyRef.current !== '') {
          nearbyLampKeyRef.current = '';
          setNearbyLamp(null);
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

        if (selectedPetRef.current) {
          const {activePet: curPet, carriedPetId: curCarried} = stateRef.current;
          if (!curPet || curCarried === curPet.id || !petCompanion.rig) {
            selectedPetRef.current = null;
            setPetArcMenuPos(null);
          } else {
            _projVec
              .set(
                petCompanion.rig.root.position.x,
                petCompanion.rig.root.position.y + 0.68,
                petCompanion.rig.root.position.z,
              )
              .project(camera);
            if (_projVec.z <= 1) {
              const rawX = ((_projVec.x + 1) / 2) * cw;
              const rawY = ((-_projVec.y + 1) / 2) * ch;
              const padX = Math.min(185, cw * 0.38);
              const minY = Math.min(185, ch * 0.45);
              const nx = Math.max(padX, Math.min(cw - padX, rawX));
              const ny = Math.max(minY, Math.min(ch - 85, rawY));
              const pid = selectedPetRef.current.petId;
              setPetArcMenuPos((prev) =>
                prev && prev.petId === pid && Math.abs(prev.x - nx) < 1 && Math.abs(prev.y - ny) < 1
                  ? prev
                  : {petId: pid, x: nx, y: ny},
              );
            }
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
      if (shouldAutoFullscreen) {
        window.removeEventListener('pointerdown', onWindowGameTouch);
      }
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      document.removeEventListener('fullscreenchange', handleResize);
      document.removeEventListener('webkitfullscreenchange', handleResize);
      disposePetCompanion();
      playerRig.heldPetRig?.dispose();
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

  const handleToggleHouseLights = () => {
    const nextOn = !houseLightsOnRef.current;
    houseLightsOnRef.current = nextOn;
    setHouseLightsOn(nextOn);
    activeSubzoneRef.current?.setHouseLightsOn?.(nextOn);
    soundFX.tap();
    showBubble(
      nextOn
        ? 'Đã bật đèn phòng sáng trưng!'
        : 'Đã tắt đèn phòng — bật từng chiếc đèn để chill nhé!',
    );
  };

  const handleToggleNearbyLamp = () => {
    if (!nearbyLamp) return;
    const nextOn = !nearbyLamp.isOn;
    lampStatesRef.current[nearbyLamp.id] = nextOn;
    activeSubzoneRef.current?.setLampOn?.(nearbyLamp.id, nextOn);
    soundFX.tap();
    nearbyLampKeyRef.current = `${nearbyLamp.id}:${nextOn}`;
    setNearbyLamp({...nearbyLamp, isOn: nextOn});
    showBubble(nextOn ? `Đã bật ${nearbyLamp.name}!` : `Đã tắt ${nearbyLamp.name}.`);
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

        {/* Crisp close-zoom-only player nameplate (pure text only, zero icons or pill backdrop) */}
        <div
          ref={playerNameDomRef}
          style={{
            display: 'none',
            textShadow:
              '0 1px 3px rgba(24,18,12,0.94), 0 0 2px rgba(24,18,12,0.96), 1px 0 0 rgba(24,18,12,0.82), -1px 0 0 rgba(24,18,12,0.82), 0 -1px 0 rgba(24,18,12,0.82)',
          }}
          className="pointer-events-none absolute top-0 left-0 z-20 text-[12px] font-bold leading-none tracking-[0.01em] text-white whitespace-nowrap select-none"
        >
          {avatar.name}
        </div>

        {/* Crisp close-zoom-only pet nameplate (+ Bling Bling at Lv.10) */}
        <div
          ref={petNameDomRef}
          style={{
            display: 'none',
            textShadow:
              '0 1px 3px rgba(24,18,12,0.94), 0 0 2px rgba(24,18,12,0.96), 1px 0 0 rgba(24,18,12,0.82), -1px 0 0 rgba(24,18,12,0.82), 0 -1px 0 rgba(24,18,12,0.82)',
          }}
          className="pointer-events-none absolute top-0 left-0 z-20 items-center gap-1 text-[11.5px] font-bold leading-none text-[#FFFDF5] whitespace-nowrap select-none"
        >
          {activePet && activePet.intimacyLevel >= MAX_PET_INTIMACY && (
            <BlingBlingBadge className="h-3.5 w-3.5 shrink-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.75)]" />
          )}
          <span>{activePet?.name ?? ''}</span>
          {activePet?.sick && <span className="text-[#FFD0CA]">(Ốm)</span>}
        </div>

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

      {/* Radial Arc Pet Menu when tapping companion pet */}
      {petArcMenuPos &&
        activePet &&
        activePet.id === petArcMenuPos.petId &&
        carriedPetId !== activePet.id && (
          <PetArcMenu
            pet={activePet}
            screenX={petArcMenuPos.x}
            screenY={petArcMenuPos.y}
            supplies={petSupplies}
            onHoldPet={(petId) => {
              selectedPetRef.current = null;
              setPetArcMenuPos(null);
              onHoldPet(petId);
            }}
            onFeedPet={(petId) => {
              const res = onFeedPet(petId);
              if (res?.message) showBubble(res.message);
            }}
            onCurePet={onCurePet}
            onPlayWithPet={(petId) => {
              triggerPetPlayRef.current?.(petId);
              const res = onPlayWithPet(petId);
              if (res?.message) showBubble(res.message);
            }}
            onClose={() => {
              selectedPetRef.current = null;
              setPetArcMenuPos(null);
            }}
          />
        )}

      {/* May Mall Panoramic Glass Elevator Action HUD */}
      {zone === 'town' && mallElevatorHud !== 'none' && !miniActive && (
        <div className="phone-ui absolute bottom-5 left-1/2 z-30 flex -translate-x-1/2 justify-center">
          <button
            type="button"
            disabled={mallElevatorHud === 'riding'}
            onClick={() => {
              soundFX.tap();
              mallRideActionRef.current?.();
            }}
            className="anim-pop flex min-h-[42px] items-center gap-2 rounded-2xl border-2 border-[#2A6F97] bg-[#EAF7FF]/95 px-4 py-2 text-xs font-extrabold text-[#163F5B] shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-75"
          >
            <Building2 className="h-4 w-4 text-[#2A6F97]" />
            <span>
              {mallElevatorHud === 'riding'
                ? 'Thang máy kính đang di chuyển...'
                : mallElevatorHud === 'deck'
                  ? 'Xuống Tầng Trệt May Mall'
                  : 'Lên Sân Thượng May Mall (25m)'}
            </span>
          </button>
        </div>
      )}

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

      {/* Top-Left Release Pet ('X') Button beside Phone when hugging / shoulder-perching a pet */}
      {carriedPetId && activePet && !miniActive && !(zone === 'home' && editFurnitureMode) && (
        <button
          type="button"
          onClick={() => {
            soundFX.tap();
            onReleasePet();
          }}
          aria-label={activePet.speciesId === 'blue_bird' ? 'Dừng bay quanh' : 'Dừng đi quanh'}
          title={activePet.speciesId === 'blue_bird' ? 'Dừng bay quanh' : 'Dừng đi quanh'}
          className="phone-ui anim-pop absolute top-2.5 left-[62px] z-30 flex h-11 items-center gap-1.5 rounded-2xl border-2 border-[#3C3128] bg-[#FFF2EA]/95 px-2.5 text-[#3B2B1E] shadow-lg transition-transform hover:scale-105 active:scale-95"
        >
          <PetSpeciesIcon speciesId={activePet.speciesId} className="h-6 w-6 shrink-0" />
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#DF5E56] text-white shadow-xs">
            <X className="h-3.5 w-3.5 stroke-[3]" />
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
                onClick={handleToggleHouseLights}
                className={`flex min-h-[30px] items-center gap-1 rounded-xl border-2 px-2 py-1 text-[11px] font-bold shadow-md transition-transform active:scale-95 ${
                  houseLightsOn
                    ? 'border-[#8C6239] bg-[#FFF8EB] text-[#4A3525]'
                    : 'border-[#4D648D] bg-[#1E2B45] text-[#F8E7B9]'
                }`}
              >
                {houseLightsOn ? (
                  <LightbulbOff className="h-3.5 w-3.5 text-[#C26A38]" />
                ) : (
                  <Lightbulb className="h-3.5 w-3.5 text-[#FFD166]" />
                )}
                <span>{houseLightsOn ? 'Tắt đèn' : 'Bật đèn'}</span>
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

      {/* Proximity Door & Lamp Controls inside House */}
      {zone === 'home' && !editFurnitureMode && (nearbyDoor || nearbyLamp) && (
        <div className="absolute bottom-5 left-1/2 z-30 flex -translate-x-1/2 flex-wrap items-center justify-center gap-2">
          {nearbyLamp && (
            <button
              type="button"
              onClick={handleToggleNearbyLamp}
              className={`anim-pop flex min-h-[42px] items-center gap-2 rounded-2xl border-2 px-4 py-2 text-xs font-bold shadow-lg transition-transform active:scale-95 ${
                nearbyLamp.isOn
                  ? 'border-[#C9963B] bg-[#FFF8EB] text-[#4A3525]'
                  : 'border-[#5F7396] bg-[#24324E] text-[#FFE8A3]'
              }`}
            >
              {nearbyLamp.isOn ? (
                <LightbulbOff className="h-4 w-4 text-[#C26A38]" />
              ) : (
                <Lightbulb className="h-4 w-4 text-[#FFD166]" />
              )}
              <span>{nearbyLamp.isOn ? `Tắt ${nearbyLamp.name}` : `Bật ${nearbyLamp.name}`}</span>
            </button>
          )}

          {nearbyDoor && (
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
          )}
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

      {/* Catch Celebration Card Overlay */}
      {catchCelebration && (
        <div
          onClick={() => setCatchCelebration(null)}
          className="pointer-events-auto fixed inset-x-0 bottom-6 z-40 flex justify-center px-4"
        >
          <div
            className={`anim-catch-card relative w-full max-w-[336px] cursor-pointer overflow-hidden rounded-3xl border-4 p-4 shadow-2xl ${
              catchCelebration.rarity === 'rare'
                ? 'border-[#F4C44E] bg-gradient-to-br from-[#2B174D] via-[#4C247D] to-[#23395B] text-white'
                : 'border-[#5AB7D0] bg-gradient-to-br from-[#FFFDF7] to-[#E6F6FB] text-[#2F2114]'
            }`}
          >
            {/* Decorative Twinkling Sparkles */}
            <Sparkles
              className={`anim-sparkle pointer-events-none absolute top-3 right-3 h-5 w-5 ${
                catchCelebration.rarity === 'rare' ? 'text-[#FFD166]' : 'text-[#42A8C4]'
              }`}
            />
            <Sparkles
              style={{animationDelay: '0.35s'}}
              className={`anim-sparkle pointer-events-none absolute bottom-3 left-3 h-4 w-4 ${
                catchCelebration.rarity === 'rare' ? 'text-[#C792EA]' : 'text-[#5DC49B]'
              }`}
            />

            <div className="flex items-center gap-3.5">
              {/* Animated Catch Illustration */}
              <div
                className={`relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border-2 ${
                  catchCelebration.rarity === 'rare'
                    ? 'border-[#FFD166]/60 bg-[#FFFFFF]/15 shadow-[0_0_24px_rgba(255,209,102,0.4)]'
                    : catchCelebration.kind === 'insect'
                      ? 'border-[#89D8B0] bg-white shadow-inner'
                      : 'border-[#9AD7E8] bg-white shadow-inner'
                }`}
              >
                <div className="anim-fish-jump">
                  {catchCelebration.kind === 'insect' ? (
                    <InsectIllustration
                      speciesId={catchCelebration.speciesId}
                      className="h-16 w-16"
                    />
                  ) : (
                    <FishIllustration
                      speciesId={catchCelebration.speciesId}
                      className="h-16 w-16"
                    />
                  )}
                </div>
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                      catchCelebration.rarity === 'rare'
                        ? 'bg-[#FFD166] text-[#3B2108]'
                        : catchCelebration.kind === 'insect'
                          ? 'bg-[#42A48D] text-white'
                          : 'bg-[#3C95AD] text-white'
                    }`}
                  >
                    {catchCelebration.rarity === 'rare'
                      ? '★ Hiếm!'
                      : catchCelebration.kind === 'insect'
                        ? 'Bắt Thành Công'
                        : 'Câu Thành Công'}
                  </span>
                  {catchCelebration.isFirstDiscovery && (
                    <span className="rounded-full bg-[#44B67B] px-2 py-0.5 text-[10px] font-black text-white">
                      Loài Mới!
                    </span>
                  )}
                  {!catchCelebration.isFirstDiscovery && catchCelebration.isNewRecord && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-[#EE6C4D] px-2 py-0.5 text-[10px] font-black text-white">
                      <Trophy className="h-2.5 w-2.5" />
                      Kỷ Lục!
                    </span>
                  )}
                </div>

                <div className="truncate text-base font-black leading-tight">
                  {catchCelebration.name}
                </div>

                <div
                  className={`flex items-center gap-2 text-xs font-extrabold tabular-nums ${
                    catchCelebration.rarity === 'rare' ? 'text-[#E8DDF7]' : 'text-[#5B4530]'
                  }`}
                >
                  <span>
                    {catchCelebration.kind === 'insect'
                      ? `${catchCelebration.lengthMm} mm`
                      : `${catchCelebration.weightKg.toFixed(2)} kg`}
                  </span>
                  <span>·</span>
                  <span
                    className={
                      catchCelebration.rarity === 'rare' ? 'text-[#FFD166]' : 'text-[#C67B14]'
                    }
                  >
                    Giá ~{catchCelebration.sellPrice} Xu
                  </span>
                </div>

                <div
                  className={`text-[10px] font-bold tabular-nums ${
                    catchCelebration.durabilityLeft === 0
                      ? 'text-[#FF6B6B]'
                      : catchCelebration.rarity === 'rare'
                        ? 'text-white/75'
                        : 'text-[#6E7A85]'
                  }`}
                >
                  {catchCelebration.kind === 'insect' ? 'Độ bền vợt: ' : 'Độ bền cần: '}
                  {catchCelebration.durabilityLeft}/{catchCelebration.maxDurability}
                  {catchCelebration.durabilityLeft === 0 ? ' (Hỏng)' : ''}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Broken Rod Repair Confirmation Modal */}
      {brokenRodPrompt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          onClick={() => setBrokenRodPrompt(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="anim-pop w-full max-w-sm rounded-3xl border-4 border-[#DFCA9F] bg-[#FFF8EB] p-5 text-[#3B2A1A] shadow-2xl"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FDECEC] text-[#D64545] border border-[#F5C2C2]">
                <Wrench className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-black">Cần câu đang hỏng</h3>
                <p className="text-xs font-bold text-[#7A6048]">
                  Độ bền: 0/{brokenRodPrompt.maxDurability}
                </p>
              </div>
            </div>

            <p className="mt-3 rounded-2xl border border-[#EADBC2] bg-white px-3.5 py-3 text-xs font-bold leading-relaxed text-[#523D28]">
              Cần câu đang hỏng! Bạn muốn sửa cần với giá{' '}
              <span className="font-black text-[#C47C1A]">
                {brokenRodPrompt.repairCost} Xu
              </span>{' '}
              để câu tiếp không?
            </p>

            <div className="mt-2 flex items-center justify-between text-[11px] font-bold text-[#7A6048] px-1">
              <span>Số dư hiện có:</span>
              <span className="inline-flex items-center gap-1 font-black text-[#9E6014]">
                <Coins className="h-3.5 w-3.5 text-amber-500" />
                {stats.coins} Xu
              </span>
            </div>

            {stats.coins < brokenRodPrompt.repairCost && (
              <div className="mt-2 rounded-xl bg-[#FDECEC] px-3 py-1.5 text-[11px] font-bold text-[#B63535]">
                Bạn chưa đủ {brokenRodPrompt.repairCost} Xu để sửa cần.
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  soundFX.tap();
                  setBrokenRodPrompt(null);
                }}
                className="rounded-xl bg-[#EADCCB] py-2.5 text-xs font-black text-[#5C442C] transition active:scale-95"
              >
                Để sau
              </button>
              <button
                type="button"
                disabled={stats.coins < brokenRodPrompt.repairCost}
                onClick={() => {
                  const ok = onRepairFishingRod();
                  if (ok) {
                    setBrokenRodPrompt(null);
                    showBubble('Đã sửa cần câu xong! Thả phao câu tiếp thôi.');
                  }
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#E89B35] py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-[#D68924] disabled:opacity-45 active:scale-95"
              >
                <Wrench className="h-3.5 w-3.5" />
                Sửa ({brokenRodPrompt.repairCost} Xu)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Broken Bug Net Repair Confirmation Modal */}
      {brokenNetPrompt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          onClick={() => setBrokenNetPrompt(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="anim-pop w-full max-w-sm rounded-3xl border-4 border-[#DFCA9F] bg-[#FFF8EB] p-5 text-[#3B2A1A] shadow-2xl"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#F5C2C2] bg-[#FDECEC] text-[#D64545]">
                <Wrench className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-black">Vợt gỗ đang hỏng</h3>
                <p className="text-xs font-bold text-[#7A6048]">
                  Độ bền: 0/{brokenNetPrompt.maxDurability}
                </p>
              </div>
            </div>

            <p className="mt-3 rounded-2xl border border-[#EADBC2] bg-white px-3.5 py-3 text-xs font-bold leading-relaxed text-[#523D28]">
              Vợt bắt côn trùng đang hỏng! Bạn muốn sửa vợt với giá{' '}
              <span className="font-black text-[#C47C1A]">
                {brokenNetPrompt.repairCost} Xu
              </span>{' '}
              để bắt tiếp không?
            </p>

            <div className="mt-2 flex items-center justify-between px-1 text-[11px] font-bold text-[#7A6048]">
              <span>Số dư hiện có:</span>
              <span className="inline-flex items-center gap-1 font-black text-[#9E6014]">
                <Coins className="h-3.5 w-3.5 text-amber-500" />
                {stats.coins} Xu
              </span>
            </div>

            {stats.coins < brokenNetPrompt.repairCost && (
              <div className="mt-2 rounded-xl bg-[#FDECEC] px-3 py-1.5 text-[11px] font-bold text-[#B63535]">
                Bạn chưa đủ {brokenNetPrompt.repairCost} Xu để sửa vợt.
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  soundFX.tap();
                  setBrokenNetPrompt(null);
                }}
                className="rounded-xl bg-[#EADCCB] py-2.5 text-xs font-black text-[#5C442C] transition active:scale-95"
              >
                Để sau
              </button>
              <button
                type="button"
                disabled={stats.coins < brokenNetPrompt.repairCost}
                onClick={() => {
                  const ok = onRepairBugNet();
                  if (ok) {
                    setBrokenNetPrompt(null);
                    showBubble('Đã sửa vợt gỗ xong! Tiếp tục rình bắt côn trùng nào.');
                  }
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#48A674] py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-[#3A9162] disabled:opacity-45 active:scale-95"
              >
                <Wrench className="h-3.5 w-3.5" />
                Sửa ({brokenNetPrompt.repairCost} Xu)
              </button>
            </div>
          </div>
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

      {/* Dynamic Hidden Touch Joystick (Bottom-Left) — appears only while touching */}
      {showJoystick && !miniActive && !(zone === 'home' && editFurnitureMode) && (
        <div
          className="phone-ui absolute bottom-2 left-2 z-30 h-44 w-44 touch-none select-none"
          onPointerDown={(e) => {
            e.stopPropagation();
            const rect = e.currentTarget.getBoundingClientRect();
            const cx = e.clientX - rect.left;
            const cy = e.clientY - rect.top;
            joystickOriginRef.current = {x: cx, y: cy, pointerId: e.pointerId};
            joystickInputRef.current = {x: 0, y: 0, active: true};
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch {
              // ignore pointer capture unavailability
            }
            if (joystickBaseRef.current) {
              joystickBaseRef.current.style.left = `${cx}px`;
              joystickBaseRef.current.style.top = `${cy}px`;
              joystickBaseRef.current.style.opacity = '1';
            }
            if (joystickKnobRef.current) {
              joystickKnobRef.current.style.transform = 'translate(-50%, -50%)';
            }
          }}
          onPointerMove={(e) => {
            if (
              !joystickInputRef.current.active ||
              joystickOriginRef.current.pointerId !== e.pointerId
            ) {
              return;
            }
            e.stopPropagation();
            const rect = e.currentTarget.getBoundingClientRect();
            const dx = e.clientX - rect.left - joystickOriginRef.current.x;
            const dy = e.clientY - rect.top - joystickOriginRef.current.y;
            const maxR = 40;
            const dist = Math.hypot(dx, dy);
            const clampedDist = Math.min(dist, maxR);
            const angle = dist > 0.001 ? Math.atan2(dy, dx) : 0;
            const ox = Math.cos(angle) * clampedDist;
            const oy = Math.sin(angle) * clampedDist;
            joystickInputRef.current.x = ox / maxR;
            joystickInputRef.current.y = oy / maxR;
            if (joystickKnobRef.current) {
              joystickKnobRef.current.style.transform = `translate(calc(-50% + ${ox}px), calc(-50% + ${oy}px))`;
            }
          }}
          onPointerUp={(e) => {
            if (joystickOriginRef.current.pointerId !== e.pointerId) return;
            e.stopPropagation();
            joystickOriginRef.current.pointerId = null;
            joystickInputRef.current = {x: 0, y: 0, active: false};
            if (joystickBaseRef.current) {
              joystickBaseRef.current.style.opacity = '0';
            }
            if (joystickKnobRef.current) {
              joystickKnobRef.current.style.transform = 'translate(-50%, -50%)';
            }
          }}
          onPointerCancel={(e) => {
            if (joystickOriginRef.current.pointerId !== e.pointerId) return;
            joystickOriginRef.current.pointerId = null;
            joystickInputRef.current = {x: 0, y: 0, active: false};
            if (joystickBaseRef.current) {
              joystickBaseRef.current.style.opacity = '0';
            }
          }}
        >
          <div
            ref={joystickBaseRef}
            style={{opacity: 0, transform: 'translate(-50%, -50%)'}}
            className="pointer-events-none absolute top-1/2 left-1/2 h-24 w-24 rounded-full border-2 border-white/75 bg-[#4A3525]/25 shadow-lg backdrop-blur-[2px] transition-opacity duration-100"
          >
            <div
              ref={joystickKnobRef}
              style={{transform: 'translate(-50%, -50%)'}}
              className="absolute top-1/2 left-1/2 h-11 w-11 rounded-full border-2 border-[#4A3525]/40 bg-[#FFF8EB]/95 shadow-md"
            />
          </div>
        </div>
      )}

      {/* Mandatory Joystick Guide when holding Bug Net with Joystick turned off */}
      {zone === 'town' && bugNet.equipped && !showJoystick && !miniActive && (
        <div className="phone-ui pointer-events-auto absolute bottom-6 left-1/2 z-30 flex max-w-[92vw] -translate-x-1/2 items-center gap-2.5 rounded-2xl border-2 border-[#7CC79D] bg-[#F5FFF9]/95 px-4 py-2.5 text-xs font-bold text-[#21593A] shadow-lg">
          <Bug className="h-4 w-4 shrink-0 text-[#2E8F5B]" />
          <span>
            Cầm vợt bắt côn trùng cần bật Joystick! Vào{' '}
            <button
              type="button"
              onClick={() => {
                soundFX.tap();
                onOpenPhone();
              }}
              className="font-black underline decoration-2 underline-offset-2 text-[#1B6E43]"
            >
              Menu Điện Thoại
            </button>{' '}
            → bật <b>Joystick</b> để đi rón rén và bắt bọ.
          </span>
        </div>
      )}

      {/* FPS-Style Catch Bug Button (Right Beside Jump Button when holding Bug Net) */}
      {zone === 'town' && bugNet.equipped && showJoystick && !miniActive && (
        <button
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation();
            catchActionRef.current?.();
          }}
          aria-label="Bắt côn trùng"
          className="phone-ui absolute right-[114px] bottom-10 z-30 flex h-[64px] w-[64px] flex-col items-center justify-center gap-0.5 rounded-full border-[2.5px] border-[#5BB883]/75 bg-[#F2FFF6]/75 text-[#226B43]/90 shadow-md transition-transform active:scale-90 sm:right-[128px] sm:bottom-12"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 19L12.5 11.5" />
            <ellipse
              cx="16"
              cy="8"
              rx="4.6"
              ry="3.6"
              transform="rotate(-45 16 8)"
            />
            <path d="M12.8 5.8C13.8 8.8 15.2 10.2 18.2 11.2" strokeOpacity="0.5" />
          </svg>
          <span className="text-[11px] font-black leading-none">Bắt</span>
        </button>
      )}

      {/* Right-Side FPS-Style Jump Button (Moved inward, higher up, softer colors) */}
      {showJumpButton && !miniActive && !(zone === 'home' && editFurnitureMode) && (
        <button
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation();
            jumpActionRef.current?.();
          }}
          aria-label="Nhảy lên"
          className="phone-ui absolute right-9 bottom-12 z-30 flex h-[64px] w-[64px] items-center justify-center rounded-full border-[2.5px] border-[#6BB2C7]/65 bg-[#FFFDF8]/68 text-[#2C7489]/80 shadow-md transition-transform active:scale-90 sm:right-12 sm:bottom-14"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-8 w-8"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.15"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12.5" cy="4.8" r="2.2" fill="currentColor" stroke="none" />
            <path d="M6.5 10.2l3.8-1.9 3.9 0.4 3.4-2.1" />
            <path d="M11.6 8.5l-0.6 5.2" />
            <path d="M11 13.7l-3.4 2.4-1.5 3.3" />
            <path d="M11 13.7l3.7 1.3 2.1 4.1" />
            <path d="M4.8 21.2h14.4" strokeOpacity="0.35" strokeDasharray="2.5 2.5" />
          </svg>
        </button>
      )}
    </div>
  );
};
