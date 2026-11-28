import React, {useEffect, useRef, useState} from 'react';
import {
  Armchair,
  ArrowDown,
  Backpack,
  Building2,
  Check,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  Coins,
  DoorClosed,
  DoorOpen,
  Fish,
  Flame,
  Gamepad2,
  Lightbulb,
  LightbulbOff,
  Move,
  Package,
  PackageMinus,
  RotateCw,
  Smile,
  Sparkles,
  Sprout,
  Trophy,
  Utensils,
  Waves,
  Wind,
  Wrench,
  X,
} from 'lucide-react';
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {WELL_WATER_MAX} from '../data/farmCatalog';
import {
  BOAT_CATALOG,
  FISH_RARITY_CONFIG,
  getRodRepairCost,
  rollRandomRiverFish,
  rollRandomSeaFish,
} from '../data/fishingCatalog';
import {getNetRepairCost} from '../data/insectCatalog';
import {MAX_PET_INTIMACY, PET_CATALOG} from '../data/petCatalog';
import {getMountDefinition} from '../data/mountCatalog';
import {PLAYER_ACTION_CATALOG, PLAYER_ACTION_SLOT_COUNT} from '../data/progressionCatalog';
import {
  BicycleMountIcon,
  DongThapLotusMountIcon,
  FishIllustration,
  LotusUmbrellaMountIcon,
  SkateboardMountIcon,
  WitchBroomMountIcon,
} from './FishingIcons';
import {InsectIllustration} from './InsectIcons';
import {BlingBlingBadge, PetSpeciesIcon} from './PetIcons';
import {
  BBQ_FOOD_CATALOG,
  getMovementSpeedMultiplier,
  HUNGER_HUNGRY_THRESHOLD,
  HUNGER_NEAR_EMPTY_THRESHOLD,
} from '../data/foodCatalog';
import {HandheldFoodIcon} from './modals/VendingMachineModal';
import {ANNA_AVATAR} from '../data/avatarCatalog';
import {FURNITURE_BY_ID, isPointOnFurnitureSurface} from '../data/furnitureCatalog';
import {FARM_DECOR_BY_ID} from '../data/farmDecorCatalog';
import {TourCameraTarget} from './OnboardingTourOverlay';
import {
  AvatarMountAnimParams,
  AvatarRig,
  buildAvatarRig,
  updateAvatarRigAnimation,
} from '../three/avatar3d';
import {buildBoatById, BuiltBoatRig} from '../three/boat3d';
import {buildMountRig, MountRig, updateMountAnimation} from '../three/mounts3d';
import {FishingVisualFrame} from '../three/fishingVisuals3d';
import {buildPetModel, PetAnimMode, PetRig, updatePetAnimation} from '../three/pets3d';
import {
  buildSubzoneScene,
  HouseDoorHandle,
  HouseLampInfo,
  HouseWallSurface,
  SubzoneWorld,
} from '../three/subzonesBuilder';
import {
  clampMallFloorPoint,
  MALL_ATRIUM_HALF_D,
  MALL_ATRIUM_HALF_W,
  MALL_ESCALATOR_LANES,
  MALL_HALF_D,
  MALL_HALF_W,
  MALL_UPPER_Y,
  MALL_WALL_H,
  MallEscalatorLane,
} from '../three/mallBuilder';
import {
  buildTownScene,
  clampPointToMallDeck,
  getLakeShoreRadius,
  getTownGroundHeight,
  getWestRiverCenterX,
  getWestRiverHalfWidth,
  getWestRiverNavBounds,
  isPointOnPlazaFlowerBed,
  LAKE_CENTER,
  MALL_DECK_Y,
  MALL_ELEVATOR_BOARD_POS,
  MALL_ELEVATOR_CAB_POS,
  RIVER_BOAT_SPAWN,
  RIVER_BOARD_INTERACT,
  RIVER_WATER_Y,
  TOWN_LAKE_WATER_Y,
  TOWN_PLAZA_RADIUS,
  TOWN_ZONE_ENTRANCES,
  TownAnchor,
  TownWorld,
  WEST_BRIDGE_HALF_SPAN,
  WEST_BRIDGE_Z,
  WEST_RIVER_NAV_MAX_Z,
  WEST_RIVER_NAV_MIN_Z,
  WorldCollider,
} from '../three/townBuilder';
import {
  clampPointToIslandTreehouse,
  getIslandBaseTerrainY,
  getIslandGroundHeight,
  ISLAND_BALLOON_POS,
  ISLAND_BOAT_INTERACT,
  ISLAND_BOAT_SPAWN,
  ISLAND_LADDER_BOTTOM,
  ISLAND_LADDER_CLIMB_END,
  ISLAND_LADDER_CLIMB_START,
  ISLAND_LADDER_TOP,
  ISLAND_PIER_DUCK_INTERACT,
  ISLAND_PIER_INTERACT,
  ISLAND_PIER_X_MAX,
  ISLAND_PIER_X_MIN,
  ISLAND_PIER_Z_MAX,
  ISLAND_PIER_Z_MIN,
  ISLAND_SPAWN,
  ISLAND_SWIM_MAX_R,
  ISLAND_TREEHOUSE_DECK_Y,
  ISLAND_TREEHOUSE_DOOR,
  ISLAND_WATER_Y,
  isPointOnIslandPier,
} from '../three/islandBuilder';
import {
  ActionId,
  ArcadeGameId,
  ArcadeHubSection,
  AvatarConfig,
  AvatarPose,
  BbqFoodId,
  BoatId,
  BoatsState,
  BugNetState,
  CoopKind,
  CoopTroughs,
  CropType,
  FishingPhase,
  FishingRodState,
  FishRarity,
  FishSpeciesId,
  FishWaterType,
  GameStats,
  GardenPlotState,
  InsectRarity,
  InsectSpeciesId,
  JoyboyDeliveryState,
  JoyboyTargetNpcId,
  LivestockAnimalState,
  MountId,
  OnlinePlayerMeta,
  OnlinePlayerPosePacket,
  OnlinePlayerState,
  OwnedMountsState,
  OwnedPetState,
  PetSpeciesId,
  PetSupplies,
  PlacedFarmDecor,
  PlacedFurniture,
  PondFishState,
  TimeOfDay,
  ToolId,
  WellWaterState,
  ZoneId,
} from '../types/game';
import {isPublicMultiplayerZone, townMultiplayer} from '../utils/multiplayerClient';
import {soundFX} from '../utils/sound';
import {PetArcMenu} from './PetArcMenu';
import {PlotArcMenu} from './PlotArcMenu';
import {RemotePlayerArcMenu} from './RemotePlayerArcMenu';

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
  boats: BoatsState;
  bugNet: BugNetState;
  seeds: Partial<Record<CropType, number>>;
  bugSprayCount: number;
  waterCount: number;
  wellWater: WellWaterState;
  placedFurniture: PlacedFurniture[];
  editFurnitureMode: boolean;
  selectedFurnitureId: string | null;
  placedFarmDecor: PlacedFarmDecor[];
  editFarmDecorMode: boolean;
  selectedFarmDecorId: string | null;
  joyboyDelivery: JoyboyDeliveryState;
  joyboyModalOpen: boolean;
  homeSpotRef: React.MutableRefObject<{x: number; z: number}>;
  ownedMounts: OwnedMountsState;
  equippedActionSlots: (ActionId | null)[];
  teleportToPlazaPulse: number;
  onChangeZone: (next: ZoneId) => void;
  onOpenWardrobe: () => void;
  onOpenShop: () => void;
  onOpenKoiShop: () => void;
  onOpenShipShop: () => void;
  onOpenTunShop: () => void;
  onOpenPeppaShop: () => void;
  onOpenCafeShop: () => void;
  onOpenMicrowave: () => void;
  onOpenMiniOven: () => void;
  onToggleMount: (mountId: MountId) => void;
  onDismountMount: () => void;
  onOpenFurnitureShop: () => void;
  onOpenSettings: () => void;
  onOpenDailyQuests: () => void;
  onOpenPhone: () => void;
  onOpenBag: () => void;
  onOpenFurniture: () => void;
  onToggleEditFurniture: () => void;
  onSelectFurniture: (id: string | null) => void;
  onMoveFurniture: (id: string, x: number, z: number, rotY?: number, y?: number) => void;
  onRotateFurniture: (id: string) => void;
  onStowFurniture: (id: string) => void;
  onOpenFarmDecorShop: () => void;
  onOpenFarmDecorBag: () => void;
  onToggleEditFarmDecor: () => void;
  onSelectFarmDecor: (id: string | null) => void;
  onMoveFarmDecor: (id: string, x: number, z: number) => void;
  onRotateFarmDecor: (id: string) => void;
  onStowFarmDecor: (id: string) => void;
  onOpenJoyboyModal: () => void;
  onCompleteJoyboyDelivery: () => {
    ok: boolean;
    targetNpcName?: string;
    rewardCoins?: number;
    remainingToday?: number;
    message?: string;
  };
  onCatchRiverFish: (preRolled?: {
    speciesId: FishSpeciesId;
    weightKg: number;
    sellPrice: number;
    waterType?: FishWaterType;
  }) => {
    speciesId: FishSpeciesId;
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
  onOpenArcadeHub?: (section?: ArcadeHubSection) => void;
  onOpenArcadeGame: (gameId: ArcadeGameId) => void;
  onOpenCoinGameShop: () => void;
  activePet: OwnedPetState | null;
  carriedPetId: string | null;
  petSupplies: PetSupplies;
  equippedFoodId: BbqFoodId | null;
  bbqFoods: Partial<Record<BbqFoodId, number>>;
  onOpenBbqGrill: () => void;
  onOpenVendingMachine: () => void;
  onEatEquippedFood: () => {ok: boolean; message: string};
  onUnequipFood: () => void;
  onOpenPetSupplyShop: () => void;
  onOpenPetAdopt: () => void;
  onHoldPet: (petId: string) => void;
  onReleasePet: () => void;
  onFeedPet: (petId: string) => {ok: boolean; message: string} | void;
  onCurePet: (petId: string) => void;
  onPlayWithPet: (petId: string) => {ok: boolean; gainedXp: boolean; message: string} | void;
  tourCameraTarget?: TourCameraTarget | null;
  onOpenFurnitureDisplay: (furnitureId: string) => void;
  onStartAnnaTour: () => void;
  claimableLevelGiftsCount?: number;
  onSendPlayerGift?: (
    target: OnlinePlayerMeta,
    currency: 'coins' | 'coinGame',
    amount: number,
  ) => {ok: boolean; message: string};
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
  isMallSwing?: boolean;
  mallSeesawSide?: -1 | 1;
  isBath?: boolean;
}

type CatchCelebrationData =
  | {
      kind: 'fish';
      speciesId: FishSpeciesId;
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

  if (zone === 'mall') {
    if (isPortrait) {
      return {fov: 50, pos: [0, 7.2, 8.8] as const, look: [0, 1.0, 0] as const};
    }
    if (isSquare) {
      return {fov: 46, pos: [0, 6.8, 8.2] as const, look: [0, 1.0, 0] as const};
    }
    return {fov: 43, pos: [0, 6.2, 7.2] as const, look: [0, 1.0, 0] as const};
  }

  if (zone === 'island') {
    if (isPortrait) {
      return {fov, pos: [0, 17.6, 27.0] as const, look: [0, 0.9, 0] as const};
    }
    if (isSquare) {
      return {fov, pos: [0, 16.5, 25.0] as const, look: [0, 0.9, 0] as const};
    }
    return {fov, pos: [0, 15.2, 23.2] as const, look: [0, 0.9, 0] as const};
  }

  if (zone === 'arcade') {
    if (isPortrait) {
      return {fov, pos: [0, 11.4, 17.8] as const, look: [0, 0.9, -0.4] as const};
    }
    if (isSquare) {
      return {fov, pos: [0, 10.6, 16.4] as const, look: [0, 0.9, -0.4] as const};
    }
    return {fov, pos: [0, 10.0, 15.2] as const, look: [0, 0.9, -0.4] as const};
  }

  if (isPortrait) {
    return {fov, pos: [0, 6.8, 10.6] as const, look: [0, 0.75, -0.35] as const};
  }
  return {fov, pos: [0, 6.3, 9.5] as const, look: [0, 0.75, -0.35] as const};
}

function getZoneWalkBounds(zone: ZoneId) {
  if (zone === 'town') {
    return {minX: -146, maxX: 82, minZ: -98, maxZ: 78};
  }
  if (zone === 'island') {
    return {minX: -74.0, maxX: 74.0, minZ: -74.0, maxZ: 74.0};
  }
  if (zone === 'home') {
    return {minX: -12.85, maxX: 9.85, minZ: -8.95, maxZ: 6.95};
  }
  if (zone === 'garden') {
    return {minX: -30.5, maxX: 30.5, minZ: -21.5, maxZ: 21.2};
  }
  if (zone === 'boutique') {
    return {minX: -5.6, maxX: 5.6, minZ: -4.8, maxZ: 4.9};
  }
  if (zone === 'petshop') {
    return {minX: -7.5, maxX: 7.5, minZ: -6.1, maxZ: 6.15};
  }
  if (zone === 'mall') {
    return {
      minX: -(MALL_HALF_W - 1.3),
      maxX: MALL_HALF_W - 1.3,
      minZ: -(MALL_HALF_D - 1.3),
      maxZ: MALL_HALF_D - 1.3,
    };
  }
  if (zone === 'arcade') {
    return {minX: -10.6, maxX: 10.6, minZ: -8.35, maxZ: 8.5};
  }
  return {minX: -3.45, maxX: 3.45, minZ: -4.05, maxZ: 4.05};
}

function getWallItemHalfHeight(kind: string): number {
  switch (kind) {
    case 'wall_clock':
      return 0.42;
    case 'wall_calendar':
    case 'wall_calendar_tet':
      return 0.45;
    case 'tet_couplets':
      return 0.72;
    case 'xmas_wreath':
    case 'tet_flower_wreath':
      return 0.48;
    case 'succulent_shelf':
      return 0.28;
    case 'wall_lamp':
      return 0.24;
    case 'wall_tv':
      return 0.56;
    case 'wall_pinboard':
      return 0.44;
    case 'wall_gallery_frames':
      return 0.42;
    case 'wall_mirror_arch':
      return 0.62;
    case 'wall_lamp_pompompurin':
      return 0.34;
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
    case 'xmas_tree':
      return baseY + 2.35;
    case 'dish_cabinet':
      return baseY + 2.22;
    case 'bookshelf':
    case 'floor_lamp':
      return baseY + 2.1;
    case 'vampire_coffin_sofa':
    case 'candelabra_gothic':
      return baseY + 1.88;
    case 'tet_mai_pot':
    case 'tet_peach_pot':
      return baseY + 1.68;
    case 'terrace_swing_egg':
      return baseY + 2.18;
    case 'cat_tree_tower':
      return baseY + 1.56;
    case 'tet_lantern_lamp':
      return baseY + 1.55;
    case 'cozy_fireplace':
      return baseY + 1.48;
    case 'bed_pompompurin':
      return baseY + 1.46;
    case 'shelf_pompompurin':
      return baseY + 1.42;
    case 'xmas_snowman':
    case 'fish_aquarium':
      return baseY + 1.38;
    case 'kitchen_l_counter':
      return baseY + 1.12;
    case 'office_swivel_chair':
      return baseY + 1.24;
    case 'piano_keyboard':
      return baseY + 1.05;
    case 'white_study_chair':
      return baseY + 0.96;
    case 'plush_bear_giant':
      return baseY + 0.72;
    case 'stool_pompompurin':
      return baseY + 0.56;
    case 'desktop_pc_set':
      return baseY + 0.54;
    case 'study_desk_lamp':
      return baseY + 0.48;
    case 'picnic_gingham_set':
      return baseY + 0.42;
    case 'coffee_maker_bar':
      return baseY + 0.36;
    case 'toast_toaster_set':
      return baseY + 0.26;
    case 'pudding_flan_plate':
      return baseY + 0.22;
    case 'study_laptop':
    case 'headphone_stand':
    case 'art_supply_rack':
    case 'pen_holder':
    case 'book_stack':
    case 'table_snack_tray':
    case 'pencil_case':
    case 'open_book':
      return baseY + 0.34;
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

const COLLIDER_CELL_SIZE = 4.0;
const COLLIDER_HASH_PAD = 1.05;

interface ColliderSpatialIndex {
  buckets: Map<number, WorldCollider[]>;
}

const colliderIndexCache = new WeakMap<WorldCollider[], ColliderSpatialIndex>();

function getColliderCellKey(cx: number, cz: number): number {
  return ((cx + 2048) << 12) | (cz + 2048);
}

function getColliderSpatialIndex(colliders: WorldCollider[]): ColliderSpatialIndex {
  let cached = colliderIndexCache.get(colliders);
  if (cached) return cached;

  const buckets = new Map<number, WorldCollider[]>();
  for (let i = 0; i < colliders.length; i++) {
    const col = colliders[i];
    let ahw: number;
    let ahd: number;
    if (col.type === 'circle') {
      ahw = col.r + COLLIDER_HASH_PAD;
      ahd = col.r + COLLIDER_HASH_PAD;
    } else {
      const rot = col.rotY || 0;
      const cos = Math.abs(Math.cos(rot));
      const sin = Math.abs(Math.sin(rot));
      ahw = col.hw * cos + col.hd * sin + COLLIDER_HASH_PAD;
      ahd = col.hw * sin + col.hd * cos + COLLIDER_HASH_PAD;
    }
    const minCx = Math.floor((col.x - ahw) / COLLIDER_CELL_SIZE);
    const maxCx = Math.floor((col.x + ahw) / COLLIDER_CELL_SIZE);
    const minCz = Math.floor((col.z - ahd) / COLLIDER_CELL_SIZE);
    const maxCz = Math.floor((col.z + ahd) / COLLIDER_CELL_SIZE);
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cz = minCz; cz <= maxCz; cz++) {
        const key = getColliderCellKey(cx, cz);
        let list = buckets.get(key);
        if (!list) {
          list = [];
          buckets.set(key, list);
        }
        list.push(col);
      }
    }
  }
  cached = {buckets};
  colliderIndexCache.set(colliders, cached);
  return cached;
}

function queryNearbyColliders(
  px: number,
  pz: number,
  colliders: WorldCollider[],
  radius: number,
): WorldCollider[] {
  if (colliders.length <= 24 || radius > COLLIDER_HASH_PAD) {
    return colliders;
  }
  const index = getColliderSpatialIndex(colliders);
  const cx = Math.floor(px / COLLIDER_CELL_SIZE);
  const cz = Math.floor(pz / COLLIDER_CELL_SIZE);
  return index.buckets.get(getColliderCellKey(cx, cz)) ?? [];
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
    const candidates = queryNearbyColliders(x, z, colliders, radius);
    for (let i = 0; i < candidates.length; i++) {
      const col = candidates[i];
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
  const candidates = queryNearbyColliders(px, pz, colliders, radius);
  for (let i = 0; i < candidates.length; i++) {
    const col = candidates[i];
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
  const inflateSq = inflate * inflate;

  // Pre-warm spatial index for subsequent walk / pathfinding queries
  getColliderSpatialIndex(colliders);

  // Stamp each collider directly onto only the grid cells within its inflated AABB
  for (let i = 0; i < colliders.length; i++) {
    const col = colliders[i];
    if (col.type === 'circle') {
      const ext = col.r + inflate;
      const minDistSq = ext * ext;
      const minC = Math.max(0, Math.floor((col.x - ext - b.minX) / step));
      const maxC = Math.min(cols - 1, Math.ceil((col.x + ext - b.minX) / step));
      const minR = Math.max(0, Math.floor((col.z - ext - b.minZ) / step));
      const maxR = Math.min(rows - 1, Math.ceil((col.z + ext - b.minZ) / step));
      for (let r = minR; r <= maxR; r++) {
        const dz = b.minZ + r * step - col.z;
        const rowOff = r * cols;
        for (let c = minC; c <= maxC; c++) {
          if (blocked[rowOff + c] === 1) continue;
          const dx = b.minX + c * step - col.x;
          if (dx * dx + dz * dz < minDistSq) {
            blocked[rowOff + c] = 1;
          }
        }
      }
    } else {
      const rot = col.rotY || 0;
      const cos = Math.cos(rot);
      const sin = Math.sin(rot);
      const ahw = col.hw * Math.abs(cos) + col.hd * Math.abs(sin) + inflate;
      const ahd = col.hw * Math.abs(sin) + col.hd * Math.abs(cos) + inflate;
      const minC = Math.max(0, Math.floor((col.x - ahw - b.minX) / step));
      const maxC = Math.min(cols - 1, Math.ceil((col.x + ahw - b.minX) / step));
      const minR = Math.max(0, Math.floor((col.z - ahd - b.minZ) / step));
      const maxR = Math.min(rows - 1, Math.ceil((col.z + ahd - b.minZ) / step));
      for (let r = minR; r <= maxR; r++) {
        const dz = b.minZ + r * step - col.z;
        const rowOff = r * cols;
        for (let c = minC; c <= maxC; c++) {
          if (blocked[rowOff + c] === 1) continue;
          const dx = b.minX + c * step - col.x;
          const lx = dx * cos - dz * sin;
          const lz = dx * sin + dz * cos;
          const cx = Math.max(-col.hw, Math.min(col.hw, lx));
          const cz = Math.max(-col.hd, Math.min(col.hd, lz));
          const vx = lx - cx;
          const vz = lz - cz;
          if (vx * vx + vz * vz < inflateSq) {
            blocked[rowOff + c] = 1;
          }
        }
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

function findSmartPathSingle(
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
  while (heapSize > 0 && iter < 3200) {
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

function findSmartPath(
  nav: NavGrid | null,
  colliders: WorldCollider[],
  startX: number,
  startZ: number,
  goalX: number,
  goalZ: number,
): NavPoint[] {
  // Fast cross-river bridge routing in town so A* never explores thousands of riverbank cells
  if (nav && nav.minX < -100) {
    const startRiverX = getWestRiverCenterX(startZ);
    const goalRiverX = getWestRiverCenterX(goalZ);
    const sSide = startX - startRiverX;
    const gSide = goalX - goalRiverX;
    if ((sSide < -5 && gSide > 5) || (sSide > 5 && gSide < -5)) {
      const bridgeMidX = getWestRiverCenterX(WEST_BRIDGE_Z);
      const eastPortal = {x: bridgeMidX + 11.2, z: WEST_BRIDGE_Z};
      const westPortal = {x: bridgeMidX - 11.2, z: WEST_BRIDGE_Z};
      const entry = sSide > 0 ? eastPortal : westPortal;
      const exit = sSide > 0 ? westPortal : eastPortal;
      const segA = findSmartPathSingle(nav, colliders, startX, startZ, entry.x, entry.z);
      const segB = findSmartPathSingle(nav, colliders, exit.x, exit.z, goalX, goalZ);
      return [...segA, entry, exit, ...segB];
    }
  }
  return findSmartPathSingle(nav, colliders, startX, startZ, goalX, goalZ);
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
  boats,
  bugNet,
  seeds,
  bugSprayCount,
  waterCount,
  wellWater,
  placedFurniture,
  editFurnitureMode,
  selectedFurnitureId,
  placedFarmDecor,
  editFarmDecorMode,
  selectedFarmDecorId,
  joyboyDelivery,
  joyboyModalOpen,
  homeSpotRef,
  ownedMounts,
  equippedActionSlots,
  teleportToPlazaPulse,
  onChangeZone,
  onOpenWardrobe,
  onOpenShop,
  onOpenKoiShop,
  onOpenShipShop,
  onOpenTunShop,
  onOpenPeppaShop,
  onOpenCafeShop,
  onOpenMicrowave,
  onOpenMiniOven,
  onToggleMount,
  onDismountMount,
  onOpenFurnitureShop,
  onOpenSettings,
  onOpenDailyQuests,
  onOpenFurniture,
  onToggleEditFurniture,
  onSelectFurniture,
  onMoveFurniture,
  onRotateFurniture,
  onStowFurniture,
  onOpenFarmDecorShop,
  onOpenFarmDecorBag,
  onToggleEditFarmDecor,
  onSelectFarmDecor,
  onMoveFarmDecor,
  onRotateFarmDecor,
  onStowFarmDecor,
  onOpenJoyboyModal,
  onCompleteJoyboyDelivery,
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
  onOpenArcadeHub,
  onOpenArcadeGame,
  onOpenCoinGameShop,
  onOpenPhone,
  onOpenBag,
  activePet,
  carriedPetId,
  petSupplies,
  equippedFoodId,
  bbqFoods,
  onOpenBbqGrill,
  onOpenVendingMachine,
  onEatEquippedFood,
  onUnequipFood,
  onOpenPetSupplyShop,
  onOpenPetAdopt,
  onHoldPet,
  onReleasePet,
  onFeedPet,
  onCurePet,
  onPlayWithPet,
  tourCameraTarget = null,
  onOpenFurnitureDisplay,
  onStartAnnaTour,
  claimableLevelGiftsCount = 0,
  onSendPlayerGift,
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
  const fishActionRef = useRef<(() => void) | null>(null);
  const triggerPlayerActionRef = useRef<((actionId: ActionId) => void) | null>(null);
  const teleportPlazaActionRef = useRef<(() => void) | null>(null);
  const mallRideActionRef = useRef<(() => void) | null>(null);
  const launchParachuteRef = useRef<(() => void) | null>(null);
  const goToIslandActionRef = useRef<(() => void) | null>(null);
  const goToTownFromIslandActionRef = useRef<(() => void) | null>(null);
  const toggleIslandSwimActionRef = useRef<(() => void) | null>(null);
  const playerNameDomRef = useRef<HTMLDivElement | null>(null);
  const petNameDomRef = useRef<HTMLDivElement | null>(null);
  const mallElevatorHudRef = useRef<'none' | 'near_ground' | 'deck' | 'riding'>('none');
  const nearTownBalloonRef = useRef<boolean>(false);
  const nearIslandBalloonRef = useRef<boolean>(false);
  const nearIslandPierRef = useRef<boolean>(false);
  const pendingPlazaSpawnRef = useRef<boolean>(false);

  const [tags, setTags] = useState<ProjectedTag[]>([]);
  const [speechBubble, setSpeechBubble] = useState<string | null>(null);
  const [arcMenuPos, setArcMenuPos] = useState<{plotId: number; x: number; y: number} | null>(null);
  const [petArcMenuPos, setPetArcMenuPos] = useState<{petId: string; x: number; y: number} | null>(null);
  const [remoteArcMenuPos, setRemoteArcMenuPos] = useState<{
    player: OnlinePlayerMeta;
    x: number;
    y: number;
  } | null>(null);
  const [mallElevatorHud, setMallElevatorHud] = useState<'none' | 'near_ground' | 'deck' | 'riding'>('none');
  const [isBoatingHud, setIsBoatingHud] = useState(false);
  const [parachuteConfirmOpen, setParachuteConfirmOpen] = useState(false);
  const [isParachutingHud, setIsParachutingHud] = useState(false);
  const [nearTownBalloon, setNearTownBalloon] = useState(false);
  const [nearIslandBalloon, setNearIslandBalloon] = useState(false);
  const [nearIslandPier, setNearIslandPier] = useState(false);
  const [isSwimmingHud, setIsSwimmingHud] = useState(false);
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
  const [nearbyDoor, setNearbyDoor] = useState<{id: string; label: string; isOpen: boolean} | null>(
    null,
  );
  const [houseLightsOn, setHouseLightsOn] = useState(true);
  const [nearbyLamp, setNearbyLamp] = useState<HouseLampInfo | null>(null);
  const [nearbyAppliance, setNearbyAppliance] = useState<{
    id: string;
    kind: 'microwave' | 'mini_oven' | 'kitchen_counter';
    name: string;
  } | null>(null);
  const [nearPond, setNearPond] = useState(false);
  const [confirmPondFeed, setConfirmPondFeed] = useState(false);
  const [homeToolsOpen, setHomeToolsOpen] = useState(false);
  const [farmToolsOpen, setFarmToolsOpen] = useState(false);
  const [actionsTrayOpen, setActionsTrayOpen] = useState(false);
  const [webglError, setWebglError] = useState(false);
  const [jumpIdleDimmed, setJumpIdleDimmed] = useState(false);
  const jumpDimTimerRef = useRef<number | null>(null);

  const bumpJumpButtonVisibility = () => {
    setJumpIdleDimmed(false);
    if (jumpDimTimerRef.current) {
      clearTimeout(jumpDimTimerRef.current);
    }
    jumpDimTimerRef.current = window.setTimeout(() => {
      setJumpIdleDimmed(true);
    }, 5000);
  };

  useEffect(() => {
    setActionsTrayOpen(false);
  }, [zone, editFurnitureMode, editFarmDecorMode, isParachutingHud]);

  useEffect(() => {
    bumpJumpButtonVisibility();
    return () => {
      if (jumpDimTimerRef.current) {
        clearTimeout(jumpDimTimerRef.current);
      }
    };
  }, [zone, editFurnitureMode, editFarmDecorMode, isParachutingHud]);

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
    boats,
    bugNet,
    ownedMounts,
    placedFurniture,
    editFurnitureMode,
    selectedFurnitureId,
    placedFarmDecor,
    editFarmDecorMode,
    selectedFarmDecorId,
    joyboyDelivery,
    joyboyModalOpen,
    activePet,
    carriedPetId,
    equippedFoodId,
    tourCameraTarget,
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
    boats,
    bugNet,
    ownedMounts,
    placedFurniture,
    editFurnitureMode,
    selectedFurnitureId,
    placedFarmDecor,
    editFarmDecorMode,
    selectedFarmDecorId,
    joyboyDelivery,
    joyboyModalOpen,
    activePet,
    carriedPetId,
    equippedFoodId,
    tourCameraTarget,
  };

  const callbacksRef = useRef({
    onChangeZone,
    onOpenWardrobe,
    onOpenShop,
    onOpenKoiShop,
    onOpenShipShop,
    onOpenTunShop,
    onOpenPeppaShop,
    onOpenCafeShop,
    onOpenMicrowave,
    onOpenMiniOven,
    onDismountMount,
    onOpenFurnitureShop,
    onOpenSettings,
    onOpenDailyQuests,
    onOpenFurniture,
    onToggleEditFurniture,
    onSelectFurniture,
    onMoveFurniture,
    onRotateFurniture,
    onStowFurniture,
    onOpenFarmDecorShop,
    onSelectFarmDecor,
    onMoveFarmDecor,
    onOpenJoyboyModal,
    onCompleteJoyboyDelivery,
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
    onOpenArcadeHub,
    onOpenArcadeGame,
    onOpenCoinGameShop,
    onOpenPetSupplyShop,
    onOpenPetAdopt,
    onOpenBbqGrill,
    onOpenVendingMachine,
    onOpenFurnitureDisplay,
    onStartAnnaTour,
    onSendPlayerGift,
  });
  callbacksRef.current = {
    onChangeZone,
    onOpenWardrobe,
    onOpenShop,
    onOpenKoiShop,
    onOpenShipShop,
    onOpenTunShop,
    onOpenPeppaShop,
    onOpenCafeShop,
    onOpenMicrowave,
    onOpenMiniOven,
    onDismountMount,
    onOpenFurnitureShop,
    onOpenSettings,
    onOpenDailyQuests,
    onOpenFurniture,
    onToggleEditFurniture,
    onSelectFurniture,
    onMoveFurniture,
    onRotateFurniture,
    onStowFurniture,
    onOpenFarmDecorShop,
    onSelectFarmDecor,
    onMoveFarmDecor,
    onOpenJoyboyModal,
    onCompleteJoyboyDelivery,
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
    onOpenArcadeHub,
    onOpenArcadeGame,
    onOpenCoinGameShop,
    onOpenPetSupplyShop,
    onOpenPetAdopt,
    onOpenBbqGrill,
    onOpenVendingMachine,
    onOpenFurnitureDisplay,
    onStartAnnaTour,
    onSendPlayerGift,
  };

  const tourEndSnapRef = useRef<(() => void) | null>(null);
  const wasTourActiveRef = useRef<boolean>(false);
  useEffect(() => {
    const isNowActive = Boolean(tourCameraTarget);
    if (wasTourActiveRef.current && !isNowActive) {
      tourEndSnapRef.current?.();
    }
    wasTourActiveRef.current = isNowActive;
  }, [tourCameraTarget]);

  const rebuildSceneTriggerRef = useRef<(() => void) | null>(null);
  const rebuildAvatarTriggerRef = useRef<
    ((
      cfg: AvatarConfig,
      equippedTool: ToolId | null,
      equippedFood: BbqFoodId | null,
      carryingPet: {speciesId: PetSpeciesId; sick?: boolean} | null,
    ) => void) | null
  >(null);
  const syncMountRigTriggerRef = useRef<((mountId: MountId | null) => void) | null>(null);
  const syncPetCompanionRef = useRef<(() => void) | null>(null);
  const triggerPetPlayRef = useRef<((petId: string) => void) | null>(null);
  const farmPondFishActionRef = useRef<(() => void) | null>(null);
  const cancelFishingRef = useRef<(() => void) | null>(null);
  const activeTownRef = useRef<TownWorld | null>(null);
  const activeSubzoneRef = useRef<SubzoneWorld | null>(null);
  const joyboyApproachRef = useRef<boolean>(false);
  const isBoatingRef = useRef<boolean>(false);
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
  const nearbyApplianceKeyRef = useRef<string>('');
  const nearPondRef = useRef<boolean>(false);
  const homeExitTriggeredRef = useRef<boolean>(false);
  const selectedPlotRef = useRef<{plotId: number; worldPos: THREE.Vector3} | null>(null);
  const selectedPetRef = useRef<{petId: string} | null>(null);
  const selectedRemoteRef = useRef<{playerId: string} | null>(null);

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
    selectedRemoteRef.current = null;
    setRemoteArcMenuPos(null);
    if (zone !== 'town') {
      joyboyApproachRef.current = false;
      mallElevatorHudRef.current = 'none';
      setMallElevatorHud('none');
      setIsBoatingHud(false);
      setIsParachutingHud(false);
      setParachuteConfirmOpen(false);
      nearTownBalloonRef.current = false;
      setNearTownBalloon(false);
    }
    if (zone !== 'island') {
      setIsSwimmingHud(false);
      nearIslandBalloonRef.current = false;
      setNearIslandBalloon(false);
      nearIslandPierRef.current = false;
      setNearIslandPier(false);
    }
    if (zone !== 'town' && zone !== 'fishing' && zone !== 'garden' && zone !== 'island') {
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
      nearbyApplianceKeyRef.current = '';
      setNearbyDoor(null);
      setNearbyLamp(null);
      setNearbyAppliance(null);
      setHomeToolsOpen(false);
    }
    if (zone !== 'garden') {
      selectedPlotRef.current = null;
      setArcMenuPos(null);
      setConfirmPondFeed(false);
      setFarmToolsOpen(false);
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
    placedFarmDecor,
    editFarmDecorMode,
  ]);

  useEffect(() => {
    if (isBoatingRef.current) return;
    if (zone === 'town') {
      activeTownRef.current?.setRiverBoatPose?.(
        false,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        boats.activeBoatId,
      );
    } else if (zone === 'island') {
      activeSubzoneRef.current?.setIslandBoatPose?.(
        false,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        boats.activeBoatId,
      );
    }
  }, [zone, boats.activeBoatId]);

  useEffect(() => {
    const legacyState: 'idle' | 'waiting' | 'bite' =
      fishingState === 'idle' ? 'idle' : fishingState === 'bite' ? 'bite' : 'waiting';
    if (zone === 'town') {
      activeTownRef.current?.setFishingState?.(legacyState);
    } else if (zone === 'garden' || zone === 'fishing' || zone === 'island') {
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
    rebuildAvatarTriggerRef.current?.(avatar, equippedTool, equippedFoodId, carryingPet);
    syncPetCompanionRef.current?.();
    if (carryingPet || !activePet) {
      selectedPetRef.current = null;
      setPetArcMenuPos(null);
    }
  }, [
    avatar,
    fishingRod.equipped,
    bugNet.equipped,
    equippedFoodId,
    carriedPetId,
    activePet?.id,
    activePet?.speciesId,
    activePet?.sick,
  ]);

  useEffect(() => {
    syncMountRigTriggerRef.current?.(ownedMounts.activeMountId);
  }, [ownedMounts.activeMountId]);

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
      equippedFood: stateRef.current.equippedFoodId,
      carryingPet: initCarriedPet,
    });
    playerRig.root.position.set(playerPos.x, 0.14, playerPos.z);
    scene.add(playerRig.root);

    const tourAnnaRig: AvatarRig = buildAvatarRig(ANNA_AVATAR);
    tourAnnaRig.root.visible = false;
    scene.add(tourAnnaRig.root);

    tourEndSnapRef.current = () => {
      cameraTransitionActive = true;
    };

    let mountRig: MountRig | null = null;
    let skateMoveSec = 0;
    let skateIdleBlend = 1;
    let bikeWheelAngle = 0;
    let bikeCrankAngle = 0.35;
    let bikeSteerAngle = 0;
    let bikeIdleBlend = 1;
    let bikeLeanAngle = 0;
    let prevPlayerRotForSteer = playerPos.rotY;
    const _mountZeroVec = new THREE.Vector3(0, 0, 0);
    const _lotusHandWorldVec = new THREE.Vector3();

    const syncMountRig = (mountId: MountId | null) => {
      if (!mountId) {
        if (mountRig) {
          playerRig.root.remove(mountRig.root);
          mountRig.dispose();
          mountRig = null;
        }
        skateMoveSec = 0;
        skateIdleBlend = 1;
        bikeIdleBlend = 1;
        bikeLeanAngle = 0;
        return;
      }
      if (!mountRig || mountRig.mountId !== mountId) {
        if (mountRig) {
          playerRig.root.remove(mountRig.root);
          mountRig.dispose();
        }
        mountRig = buildMountRig(mountId);
        skateMoveSec = 0;
        skateIdleBlend = 1;
        bikeSteerAngle = 0;
        bikeIdleBlend = 1;
        bikeLeanAngle = 0;
        jumpY = 0;
        jumpVel = 0;
        playerRig.root.add(mountRig.root);
      } else if (mountRig.root.parent !== playerRig.root) {
        jumpY = 0;
        jumpVel = 0;
        playerRig.root.add(mountRig.root);
      }
    };
    syncMountRigTriggerRef.current = syncMountRig;
    syncMountRig(stateRef.current.ownedMounts.activeMountId);

    let playPetTimer = 0;
    let happyActionTimer = 0;
    const mallElev = {
      state: 'ground' as 'ground' | 'riding_up' | 'deck' | 'riding_down',
      progress: 0,
      duration: 4.4,
      y: 0.04,
    };
    const mallState = {
      floor: 1 as 1 | 2,
      ridingLane: null as MallEscalatorLane | null,
      progress: 0,
      duration: 3.4,
      cooldown: 0,
    };
    const mallSlideCtrl = {
      active: false,
      elapsed: 0,
      duration: 3.1,
      y: 0.02,
    };
    const parachuteCtrl = {
      active: false,
      worldY: MALL_DECK_Y,
    };
    const boatState = {
      active: false,
      x: RIVER_BOAT_SPAWN.x,
      z: RIVER_BOAT_SPAWN.z,
      rotY: RIVER_BOAT_SPAWN.rotY,
      targetX: null as number | null,
      targetZ: null as number | null,
      moving: false,
    };
    const clampRiverBoatPoint = (x: number, z: number) => {
      const cz = THREE.MathUtils.clamp(z, WEST_RIVER_NAV_MIN_Z, WEST_RIVER_NAV_MAX_Z);
      const bounds = getWestRiverNavBounds(cz);
      let cx = THREE.MathUtils.clamp(x, bounds.minX, bounds.maxX);
      const dxW = cx - -94.8;
      const dzW = cz - -9.0;
      if (Math.hypot(dxW, dzW) < 3.4) {
        cx = Math.min(bounds.maxX, -94.8 + 3.5);
      }
      return {x: cx, z: cz};
    };

    const clampIslandBoatPoint = (x: number, z: number) => {
      const maxR = ISLAND_SWIM_MAX_R - 1.2;
      let cx = x;
      let cz = z;
      const r0 = Math.hypot(cx, cz);
      if (r0 > maxR && r0 > 0.001) {
        cx = (cx / r0) * maxR;
        cz = (cz / r0) * maxR;
      }
      if (getIslandBaseTerrainY(cx, cz) >= ISLAND_WATER_Y - 0.34) {
        const rr = Math.hypot(cx, cz) || 1;
        const ux = cx / rr;
        const uz = cz / rr;
        for (let rt = Math.max(24.0, rr); rt <= maxR; rt += 0.35) {
          const tx = ux * rt;
          const tz = uz * rt;
          if (getIslandBaseTerrainY(tx, tz) < ISLAND_WATER_Y - 0.34) {
            cx = tx;
            cz = tz;
            break;
          }
        }
      }
      const pierMinX = ISLAND_PIER_X_MIN - 0.92;
      const pierMaxX = ISLAND_PIER_X_MAX + 0.92;
      const pierMinZ = ISLAND_PIER_Z_MIN - 0.6;
      const pierMaxZ = ISLAND_PIER_Z_MAX + 0.95;
      if (cx > pierMinX && cx < pierMaxX && cz > pierMinZ && cz < pierMaxZ) {
        const dLeft = Math.abs(cx - pierMinX);
        const dRight = Math.abs(pierMaxX - cx);
        const dSea = Math.abs(pierMaxZ - cz);
        if (dSea <= dLeft && dSea <= dRight) {
          cz = pierMaxZ;
        } else if (dLeft < dRight) {
          cx = pierMinX;
        } else {
          cx = pierMaxX;
        }
      }
      const fdx = cx - -2.85;
      const fdz = cz - 31.8;
      const fDist = Math.hypot(fdx, fdz);
      if (fDist < 1.38) {
        const fDirX = fDist > 0.001 ? fdx / fDist : -1;
        const fDirZ = fDist > 0.001 ? fdz / fDist : 0;
        cx = -2.85 + fDirX * 1.38;
        cz = 31.8 + fDirZ * 1.38;
      }
      return {x: cx, z: cz};
    };

    const swimState = {
      active: false,
      targetX: null as number | null,
      targetZ: null as number | null,
      moving: false,
      limitNoticeCooldown: 0,
    };

    const treehouseState = {
      onTreehouse: false,
      climbing: false,
      direction: 'up' as 'up' | 'down',
      progress: 0,
      duration: 2.05,
      cooldown: 0,
      baseGroundY: 0.72,
      postClimbAction: null as (() => void) | null,
    };

    const clampSwimOceanPoint = (x: number, z: number): {x: number; z: number; hitLimit: boolean} => {
      const r = Math.hypot(x, z);
      const maxR = ISLAND_SWIM_MAX_R - 0.7;
      let hitLimit = false;
      let cx = x;
      let cz = z;
      if (r > maxR && r > 0.001) {
        hitLimit = true;
        cx = (x / r) * maxR;
        cz = (z / r) * maxR;
      }
      return {x: cx, z: cz, hitLimit};
    };

    const enterIslandSwim = (startX?: number, startZ?: number) => {
      if (stateRef.current.zone !== 'island') return;
      if (fishCtrl.phase !== 'idle') {
        resetFishing(false);
      }
      if (boatState.active) {
        boatState.active = false;
        boatState.targetX = null;
        boatState.targetZ = null;
        boatState.moving = false;
        isBoatingRef.current = false;
        activeSubzone?.setIslandBoatPose?.(
          false,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          stateRef.current.boats.activeBoatId,
        );
        setIsBoatingHud(false);
      }
      callbacksRef.current.onDismountMount();
      activeTarget = null;
      releaseSeatIfNeeded();
      treehouseState.onTreehouse = false;
      treehouseState.climbing = false;
      treehouseState.postClimbAction = null;
      activeSubzone?.setTreehouseFocus?.(false);
      activeSubzone?.setSwimRingPose?.(false);
      jumpY = 0;
      jumpVel = 0;
      swimState.active = true;
      swimState.targetX = null;
      swimState.targetZ = null;
      swimState.moving = false;
      if (typeof startX === 'number' && typeof startZ === 'number') {
        playerPos.x = startX;
        playerPos.z = startZ;
      } else if (isPointOnIslandPier(playerPos.x, playerPos.z)) {
        playerPos.x = -2.35;
        playerPos.z = 33.6;
        playerPos.rotY = Math.PI * 0.85;
      } else {
        const r = Math.hypot(playerPos.x, playerPos.z) || 1;
        const pushR = Math.max(r + 2.4, 27.4);
        playerPos.x = (playerPos.x / r) * pushR;
        playerPos.z = (playerPos.z / r) * pushR;
      }
      playerPos.pose = 'swim';
      prevGroundY = ISLAND_WATER_Y - 0.72;
      setIsSwimmingHud(true);
      soundFX.splash();
      showBubble(
        'Bơi tự do ngoài biển! Chạm mặt nước để bơi, bơi vào bãi cát hoặc chạm cầu cảng để lên bờ.',
        playerPos.x,
        1.5,
        playerPos.z,
      );
    };

    const exitIslandSwim = (toPier = false) => {
      if (!swimState.active) return;
      swimState.active = false;
      swimState.targetX = null;
      swimState.targetZ = null;
      swimState.moving = false;
      activeSubzone?.setSwimRingPose?.(false);
      setIsSwimmingHud(false);
      if (toPier) {
        playerPos.x = ISLAND_PIER_DUCK_INTERACT.tx;
        playerPos.z = ISLAND_PIER_DUCK_INTERACT.tz;
        playerPos.rotY = Math.PI;
      } else {
        const r = Math.hypot(playerPos.x, playerPos.z) || 1;
        for (let rt = r; rt >= 17.5; rt -= 0.4) {
          const sx = (playerPos.x / r) * rt;
          const sz = (playerPos.z / r) * rt;
          if (getIslandBaseTerrainY(sx, sz) >= ISLAND_WATER_Y + 0.14) {
            playerPos.x = sx;
            playerPos.z = sz;
            break;
          }
        }
      }
      playerPos.pose = 'idle';
      prevGroundY = getIslandGroundHeight(playerPos.x, playerPos.z);
      jumpY = 0;
      jumpVel = 0;
      soundFX.tap();
      showBubble(toPier ? 'Đã lên Cầu Cảng!' : 'Đã bơi lên bãi cát!');
    };

    toggleIslandSwimActionRef.current = () => {
      if (stateRef.current.zone !== 'island') return;
      if (swimState.active) {
        const nearEndOfPier = Math.hypot(playerPos.x, playerPos.z - 32.2) < 6.4;
        exitIslandSwim(nearEndOfPier);
      } else {
        enterIslandSwim();
      }
    };

    goToIslandActionRef.current = () => {
      if (stateRef.current.zone !== 'town') return;
      callbacksRef.current.onDismountMount();
      soundFX.enterDoor();
      callbacksRef.current.onChangeZone('island');
    };

    goToTownFromIslandActionRef.current = () => {
      if (stateRef.current.zone !== 'island') return;
      if (boatState.active) {
        boatState.active = false;
        boatState.targetX = null;
        boatState.targetZ = null;
        boatState.moving = false;
        isBoatingRef.current = false;
        activeSubzone?.setIslandBoatPose?.(
          false,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          stateRef.current.boats.activeBoatId,
        );
        setIsBoatingHud(false);
      }
      if (swimState.active) {
        swimState.active = false;
        swimState.targetX = null;
        swimState.targetZ = null;
        swimState.moving = false;
        setIsSwimmingHud(false);
      }
      callbacksRef.current.onDismountMount();
      soundFX.enterDoor();
      callbacksRef.current.onChangeZone('town');
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
    const getActiveColliders = (zNow = stateRef.current.zone): WorldCollider[] => {
      if (zNow === 'mall') {
        return mallState.floor === 2
          ? currentColliders.filter((c) => c.id?.startsWith('mall_f2_'))
          : currentColliders.filter((c) => !c.id?.startsWith('mall_f2_'));
      }
      if (zNow === 'island') {
        return treehouseState.onTreehouse
          ? currentColliders.filter((c) => c.id?.startsWith('island_th_'))
          : currentColliders.filter((c) => !c.id?.startsWith('island_th_'));
      }
      return currentColliders;
    };
    let currentShadowBlockers: THREE.Mesh[] = [];
    let currentShadowBlockerBoxes: THREE.Box3[] = [];
    let currentTreeCanopies: {x: number; z: number; rSq: number}[] = [];
    const _shadowBoxHitVec = new THREE.Vector3();
    let currentNavGrid: NavGrid | null = null;
    let mallFloor2NavGrid: NavGrid | null = null;
    let currentPlazaRadius = TOWN_PLAZA_RADIUS;
    let currentGrounds: THREE.Object3D[] = [];
    let currentWallSurfaces: HouseWallSurface[] = [];
    let prevGroundY = 0.14;

    const collectShadowBlockers = (
      root: THREE.Object3D,
    ): {meshes: THREE.Mesh[]; boxes: THREE.Box3[]; canopies: {x: number; z: number; rSq: number}[]} => {
      const meshes: THREE.Mesh[] = [];
      const boxes: THREE.Box3[] = [];
      const canopies: {x: number; z: number; rSq: number}[] = [];
      const tmpMat = new THREE.Matrix4();
      const tmpPos = new THREE.Vector3();
      const tmpQuat = new THREE.Quaternion();
      const tmpScale = new THREE.Vector3();
      root.updateMatrixWorld(true);
      const visit = (obj: THREE.Object3D) => {
        if (!obj.visible) return;
        if ((obj as THREE.Sprite).isSprite || (obj as THREE.Points).isPoints) return;
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh) {
          const ud = mesh.userData || {};
          if ((mesh as THREE.InstancedMesh).isInstancedMesh) {
            // Pre-extract fast 2D canopy shade disks once on load (zero per-click InstancedMesh raycasts!)
            if (ud.isTreeShadowCaster) {
              const im = mesh as THREE.InstancedMesh;
              if (!im.geometry.boundingSphere) im.geometry.computeBoundingSphere();
              const baseR = im.geometry.boundingSphere ? im.geometry.boundingSphere.radius * 0.72 : 1.8;
              if (baseR >= 1.1) {
                for (let i = 0; i < im.count; i++) {
                  im.getMatrixAt(i, tmpMat);
                  tmpMat.decompose(tmpPos, tmpQuat, tmpScale);
                  const r = baseR * Math.max(tmpScale.x, tmpScale.z);
                  canopies.push({x: tmpPos.x, z: tmpPos.z, rSq: r * r});
                }
              }
            }
          } else if (
            !ud.isWaterMesh &&
            !ud.isWaterSurface &&
            !ud.isFishingVisual &&
            !ud.noShadowBlock &&
            (ud.kind !== 'ground' || ud.isMallDeck)
          ) {
            const mat = mesh.material;
            const visibleMat = Array.isArray(mat)
              ? mat.some((m) => m.visible !== false && (!m.transparent || m.opacity >= 0.15))
              : Boolean(mat && mat.visible !== false && (!mat.transparent || mat.opacity >= 0.15));
            if (visibleMat) {
              if (!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere();
              meshes.push(mesh);
              boxes.push(new THREE.Box3().setFromObject(mesh));
            }
          }
        }
        const children = obj.children;
        for (let i = 0; i < children.length; i++) {
          visit(children[i]);
        }
      };
      visit(root);
      return {meshes, boxes, canopies};
    };

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
      if (zNow === 'island' && treehouseState.onTreehouse) {
        return clampPointToIslandTreehouse(wx, wz);
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
      if (zNow === 'mall') {
        if (mallState.ridingLane) {
          const eased =
            mallState.progress * mallState.progress * (3 - 2 * mallState.progress);
          return THREE.MathUtils.lerp(
            mallState.ridingLane.startY,
            mallState.ridingLane.endY,
            eased,
          );
        }
        return mallState.floor === 2 ? MALL_UPPER_Y : 0.02;
      }
      if (zNow === 'island') {
        if (treehouseState.climbing) {
          const eased =
            treehouseState.progress * treehouseState.progress * (3 - 2 * treehouseState.progress);
          if (treehouseState.direction === 'up') {
            const climbT = Math.min(1, eased / 0.88);
            const stepT = Math.max(0, (eased - 0.88) / 0.12);
            return eased <= 0.88
              ? THREE.MathUtils.lerp(treehouseState.baseGroundY, ISLAND_TREEHOUSE_DECK_Y - 0.08, climbT)
              : THREE.MathUtils.lerp(ISLAND_TREEHOUSE_DECK_Y - 0.08, ISLAND_TREEHOUSE_DECK_Y, stepT);
          }
          const stepT = Math.min(1, eased / 0.12);
          const climbT = Math.max(0, (eased - 0.12) / 0.88);
          return eased <= 0.12
            ? THREE.MathUtils.lerp(ISLAND_TREEHOUSE_DECK_Y, ISLAND_TREEHOUSE_DECK_Y - 0.08, stepT)
            : THREE.MathUtils.lerp(ISLAND_TREEHOUSE_DECK_Y - 0.08, treehouseState.baseGroundY, climbT);
        }
        if (treehouseState.onTreehouse) {
          return ISLAND_TREEHOUSE_DECK_Y;
        }
        return swimState.active && Math.hypot(px, pz) > 25.0
          ? ISLAND_WATER_Y + 0.04
          : getIslandGroundHeight(px, pz);
      }
      return 0.02;
    };

    interface RemotePlayerEntity {
      id: string;
      meta: OnlinePlayerMeta;
      metaKey: string;
      rig: AvatarRig;
      clickProxy: THREE.Mesh;
      mountRig: MountRig | null;
      mountId: MountId | null;
      boatRig: BuiltBoatRig | null;
      boatId: BoatId | null;
      petRig: PetRig | null;
      petKey: string | null;
      petX: number;
      petY: number;
      petZ: number;
      petRotY: number;
      nameDom: HTMLDivElement | null;
      petNameDom: HTMLDivElement | null;
      x: number;
      y: number;
      z: number;
      rotY: number;
      rotX: number;
      vx: number;
      vy: number;
      vz: number;
      targetX: number;
      targetY: number;
      targetZ: number;
      targetRotY: number;
      targetRotX: number;
      pose: AvatarPose;
      poseProgress: number;
      speed: number;
      mallFloor: 1 | 2;
      boatActive: boolean;
      boatX: number;
      boatZ: number;
      boatRotY: number;
      boatMoving: boolean;
      targetPetX: number;
      targetPetY: number;
      targetPetZ: number;
      targetPetRotY: number;
      petPlayKind: 'none' | 'jump' | 'circle';
      skateMoveSec: number;
      skateIdleBlend: number;
      bikeWheelAngle: number;
      bikeCrankAngle: number;
      bikeSteerAngle: number;
      bikeIdleBlend: number;
      prevRotForSteer: number;
      lastPoseAt: number;
      hasInitialPose: boolean;
      visibleInZone: boolean;
    }

    const remoteEntities = new Map<string, RemotePlayerEntity>();
    const _remoteHeadVec = new THREE.Vector3();
    const _remotePetVec = new THREE.Vector3();
    const _remoteLotusHandVec = new THREE.Vector3();
    const _remoteZeroVec = new THREE.Vector3(0, 0, 0);

    const disposeObjectTree = (root: THREE.Object3D) => {
      root.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          m.geometry?.dispose();
          if (Array.isArray(m.material)) {
            m.material.forEach((mat) => mat.dispose());
          } else {
            m.material?.dispose();
          }
        }
      });
    };

    const computeRemoteMetaKey = (meta: OnlinePlayerMeta): string => {
      return JSON.stringify({
        avatar: meta.avatar,
        tool: meta.equippedTool,
        food: meta.equippedFood,
        carried: meta.carriedPet,
      });
    };

    const createRemoteNameDom = (): HTMLDivElement | null => {
      const layer = labelLayerRef.current;
      if (!layer) return null;
      const el = document.createElement('div');
      el.style.display = 'none';
      el.style.textShadow =
        '0 1px 3px rgba(24,18,12,0.94), 0 0 2px rgba(24,18,12,0.96), 1px 0 0 rgba(24,18,12,0.82), -1px 0 0 rgba(24,18,12,0.82), 0 -1px 0 rgba(24,18,12,0.82)';
      el.className =
        'pointer-events-none absolute top-0 left-0 z-20 text-[12px] font-bold leading-none tracking-[0.01em] text-[#FFFDF5] whitespace-nowrap select-none';
      layer.appendChild(el);
      return el;
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
      if (isPublicMultiplayerZone(stateRef.current.zone)) {
        for (const ent of remoteEntities.values()) {
          if (ent.visibleInZone) {
            base.push(ent.clickProxy);
          }
        }
      }
      currentClickTargets = base;
    };

    const removeRemoteEntity = (playerId: string) => {
      const ent = remoteEntities.get(playerId);
      if (!ent) return;
      if (ent.mountRig) {
        ent.rig.root.remove(ent.mountRig.root);
        ent.mountRig.dispose();
        ent.mountRig = null;
      }
      if (ent.boatRig) {
        scene.remove(ent.boatRig.boat);
        disposeObjectTree(ent.boatRig.boat);
        ent.boatRig = null;
      }
      if (ent.petRig) {
        scene.remove(ent.petRig.root);
        ent.petRig.dispose();
        ent.petRig = null;
      }
      ent.rig.heldPetRig?.dispose();
      ent.rig.root.remove(ent.clickProxy);
      ent.clickProxy.geometry.dispose();
      (ent.clickProxy.material as THREE.Material).dispose();
      scene.remove(ent.rig.root);
      disposeObjectTree(ent.rig.root);
      ent.nameDom?.remove();
      ent.petNameDom?.remove();
      remoteEntities.delete(playerId);
      if (selectedRemoteRef.current?.playerId === playerId) {
        selectedRemoteRef.current = null;
        setRemoteArcMenuPos(null);
      }
    };

    const syncRemoteEntity = (state: OnlinePlayerState): RemotePlayerEntity => {
      const meta = state.meta;
      const existingEnt = remoteEntities.get(meta.id);
      const nextMetaKey = computeRemoteMetaKey(meta);
      let ent: RemotePlayerEntity;

      if (!existingEnt) {
        const rig = buildAvatarRig(meta.avatar, {
          equippedTool: meta.equippedTool,
          equippedFood: meta.equippedFood,
          carryingPet: meta.carriedPet,
        });
        rig.root.visible = false;
        const clickProxy = new THREE.Mesh(
          new THREE.BoxGeometry(1.05, 1.95, 1.05),
          new THREE.MeshBasicMaterial({visible: false}),
        );
        clickProxy.position.y = 0.95;
        clickProxy.userData = {kind: 'remote_player', playerId: meta.id};
        rig.root.add(clickProxy);
        scene.add(rig.root);

        ent = {
          id: meta.id,
          meta,
          metaKey: nextMetaKey,
          rig,
          clickProxy,
          mountRig: null,
          mountId: null,
          boatRig: null,
          boatId: null,
          petRig: null,
          petKey: null,
          petX: 0,
          petY: 0,
          petZ: 0,
          petRotY: 0,
          nameDom: createRemoteNameDom(),
          petNameDom: createRemoteNameDom(),
          x: state.pose?.x ?? 0,
          y: state.pose?.y ?? 0.14,
          z: state.pose?.z ?? 3.4,
          rotY: state.pose?.rotY ?? 0,
          rotX: state.pose?.rotX ?? 0,
          vx: state.pose?.vx ?? 0,
          vy: state.pose?.vy ?? 0,
          vz: state.pose?.vz ?? 0,
          targetX: state.pose?.x ?? 0,
          targetY: state.pose?.y ?? 0.14,
          targetZ: state.pose?.z ?? 3.4,
          targetRotY: state.pose?.rotY ?? 0,
          targetRotX: state.pose?.rotX ?? 0,
          pose: state.pose?.pose ?? 'idle',
          poseProgress: state.pose?.poseProgress ?? 0,
          speed: state.pose?.speed ?? 0,
          mallFloor: state.pose?.mallFloor ?? 1,
          boatActive: Boolean(state.pose?.boat?.active),
          boatX: state.pose?.boat?.x ?? 0,
          boatZ: state.pose?.boat?.z ?? 0,
          boatRotY: state.pose?.boat?.rotY ?? 0,
          boatMoving: Boolean(state.pose?.boat?.moving),
          targetPetX: state.pose?.pet?.x ?? 0,
          targetPetY: state.pose?.pet?.y ?? 0,
          targetPetZ: state.pose?.pet?.z ?? 0,
          targetPetRotY: state.pose?.pet?.rotY ?? 0,
          petPlayKind: state.pose?.pet?.playKind ?? 'none',
          skateMoveSec: 0,
          skateIdleBlend: 1,
          bikeWheelAngle: 0,
          bikeCrankAngle: 0.35,
          bikeSteerAngle: 0,
          bikeIdleBlend: 1,
          prevRotForSteer: state.pose?.rotY ?? 0,
          lastPoseAt: performance.now(),
          hasInitialPose: Boolean(state.pose),
          visibleInZone: false,
        };
        remoteEntities.set(meta.id, ent);
      } else {
        ent = existingEnt;
        ent.meta = meta;
        if (ent.metaKey !== nextMetaKey) {
          ent.metaKey = nextMetaKey;
          if (ent.mountRig) {
            ent.rig.root.remove(ent.mountRig.root);
          }
          ent.rig.root.remove(ent.clickProxy);
          ent.rig.heldPetRig?.dispose();
          scene.remove(ent.rig.root);
          disposeObjectTree(ent.rig.root);

          ent.rig = buildAvatarRig(meta.avatar, {
            equippedTool: meta.equippedTool,
            equippedFood: meta.equippedFood,
            carryingPet: meta.carriedPet,
          });
          ent.rig.root.position.set(ent.x, ent.y, ent.z);
          ent.rig.root.rotation.set(ent.rotX, ent.rotY, 0);
          ent.rig.root.visible = ent.visibleInZone;
          ent.rig.root.add(ent.clickProxy);
          if (ent.mountRig) {
            ent.rig.root.add(ent.mountRig.root);
          }
          scene.add(ent.rig.root);
        }
      }

      if (ent.nameDom) {
        ent.nameDom.textContent = `${meta.name} · Lv.${meta.level}`;
      }

      // Sync MountRig cleanly (never hidden)
      const nextMountId = meta.activeMountId ?? null;
      if (ent.mountId !== nextMountId) {
        if (ent.mountRig) {
          ent.rig.root.remove(ent.mountRig.root);
          ent.mountRig.dispose();
          ent.mountRig = null;
        }
        ent.mountId = nextMountId;
        if (nextMountId) {
          ent.mountRig = buildMountRig(nextMountId);
          ent.rig.root.add(ent.mountRig.root);
        }
      }

      // Sync Companion PetRig (only when summoned and not currently carried in hand/shoulder)
      const comp = meta.companionPet && !meta.carriedPet ? meta.companionPet : null;
      const nextPetKey = comp ? `${comp.speciesId}:${comp.sick ? 1 : 0}:${comp.name}` : null;
      if (ent.petKey !== nextPetKey) {
        if (ent.petRig) {
          scene.remove(ent.petRig.root);
          ent.petRig.dispose();
          ent.petRig = null;
        }
        ent.petKey = nextPetKey;
        if (comp) {
          const petScale = PET_CATALOG[comp.speciesId].moveType === 'fly' ? 1.35 : 1.34;
          const pRig = buildPetModel(comp.speciesId, {
            scale: petScale,
            sick: comp.sick,
            withShadow: true,
          });
          pRig.root.visible = ent.visibleInZone;
          scene.add(pRig.root);
          ent.petRig = pRig;
          ent.petX = ent.targetPetX || ent.x - 1;
          ent.petY = ent.targetPetY || ent.y;
          ent.petZ = ent.targetPetZ || ent.z - 1;
          ent.petRotY = ent.targetPetRotY || ent.rotY;
          pRig.root.position.set(ent.petX, ent.petY, ent.petZ);
          pRig.root.rotation.y = ent.petRotY;
        }
      }
      if (ent.petNameDom) {
        ent.petNameDom.textContent = comp
          ? `${comp.name}${comp.sick ? ' (Ốm)' : ''}`
          : '';
      }

      return ent;
    };

    const applyRemotePosePacket = (pkt: OnlinePlayerPosePacket) => {
      const ent = remoteEntities.get(pkt.id);
      if (!ent) return;
      ent.meta = {...ent.meta, zone: pkt.zone};
      ent.vx = pkt.vx;
      ent.vy = pkt.vy;
      ent.vz = pkt.vz;
      ent.targetX = pkt.x;
      ent.targetY = pkt.y;
      ent.targetZ = pkt.z;
      ent.targetRotY = pkt.rotY;
      ent.targetRotX = pkt.rotX;
      ent.pose = pkt.pose;
      ent.poseProgress = pkt.poseProgress;
      ent.speed = pkt.speed;
      ent.mallFloor = pkt.mallFloor;
      ent.lastPoseAt = performance.now();

      if (pkt.boat && pkt.boat.active) {
        ent.boatActive = true;
        ent.boatX = pkt.boat.x;
        ent.boatZ = pkt.boat.z;
        ent.boatRotY = pkt.boat.rotY;
        ent.boatMoving = Boolean(pkt.boat.moving);
        const bId = pkt.boat.boatId;
        if (ent.boatId !== bId) {
          if (ent.boatRig) {
            scene.remove(ent.boatRig.boat);
            disposeObjectTree(ent.boatRig.boat);
            ent.boatRig = null;
          }
          ent.boatId = bId;
          ent.boatRig = buildBoatById(bId, true);
          scene.add(ent.boatRig.boat);
        }
      } else {
        ent.boatActive = false;
        ent.boatMoving = false;
      }

      if (pkt.pet) {
        ent.targetPetX = pkt.pet.x;
        ent.targetPetY = pkt.pet.y;
        ent.targetPetZ = pkt.pet.z;
        ent.targetPetRotY = pkt.pet.rotY;
        ent.petPlayKind = pkt.pet.playKind ?? 'none';
      }

      if (!ent.hasInitialPose) {
        ent.hasInitialPose = true;
        ent.x = pkt.x;
        ent.y = pkt.y;
        ent.z = pkt.z;
        ent.rotY = pkt.rotY;
        ent.rotX = pkt.rotX;
        ent.prevRotForSteer = pkt.rotY;
        if (pkt.pet) {
          ent.petX = pkt.pet.x;
          ent.petY = pkt.pet.y;
          ent.petZ = pkt.pet.z;
          ent.petRotY = pkt.pet.rotY;
        }
        refreshClickTargetsWithPet();
      }
    };

    const unsubRoster = townMultiplayer.subscribeRoster((playersMap) => {
      for (const existingId of Array.from(remoteEntities.keys())) {
        if (!playersMap.has(existingId)) {
          removeRemoteEntity(existingId);
        }
      }
      for (const st of playersMap.values()) {
        const ent = syncRemoteEntity(st);
        if (st.pose) {
          applyRemotePosePacket(st.pose);
        }
        if (selectedRemoteRef.current?.playerId === ent.id) {
          setRemoteArcMenuPos((prev) => (prev ? {...prev, player: ent.meta} : prev));
        }
      }
      refreshClickTargetsWithPet();
    });

    const unsubPose = townMultiplayer.subscribePose((pkt) => {
      applyRemotePosePacket(pkt);
    });

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

        const petScale = PET_CATALOG[curPet.speciesId].moveType === 'fly' ? 1.35 : 1.34;
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
        happyActionTimer = 0;
      }
    };

    triggerPlayerActionRef.current = (actionId: ActionId) => {
      const def = PLAYER_ACTION_CATALOG[actionId];
      if (!def) return;
      const isRidingElev =
        stateRef.current.zone === 'town' &&
        (mallElev.state === 'riding_up' || mallElev.state === 'riding_down');
      if (
        stateRef.current.ownedMounts.activeMountId !== null ||
        isRidingElev ||
        mallState.ridingLane !== null ||
        treehouseState.climbing ||
        mallSlideCtrl.active ||
        parachuteCtrl.active ||
        boatState.active ||
        swimState.active ||
        fishCtrl.phase !== 'idle' ||
        netSwingCtrl.active
      ) {
        showBubble(
          stateRef.current.ownedMounts.activeMountId !== null
            ? 'Hãy xuống thú cưỡi để dùng hành động nhé!'
            : 'Hãy dừng hoạt động hiện tại để dùng hành động nhé!',
        );
        return;
      }
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
      playPetTimer = 0;
      happyActionTimer = def.durationSec;
      playerPos.pose = 'happy_jump';
      soundFX.sparkle();
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
        const shadowData = collectShadowBlockers(activeTown.group);
        currentShadowBlockers = shadowData.meshes;
        currentShadowBlockerBoxes = shadowData.boxes;
        currentTreeCanopies = shadowData.canopies;
        currentNavGrid = buildNavGrid('town', currentColliders);
        mallFloor2NavGrid = null;
        currentPlazaRadius = activeTown.plazaRadius;
        currentGrounds = activeTown.groundMeshes;
        activeDoorsRef.current = [];
        currentWallSurfaces = [];
        if (zoneChanged) {
          mallElev.state = 'ground';
          mallElev.progress = 0;
          mallElev.y = 0.04;
          activeTown.setMallElevatorY?.(0.04);
          mallState.floor = 1;
          mallState.ridingLane = null;
          mallState.progress = 0;
          mallState.cooldown = 0;
          mallSlideCtrl.active = false;
          mallSlideCtrl.elapsed = 0;
          mallSlideCtrl.y = 0.02;
          parachuteCtrl.active = false;
          parachuteCtrl.worldY = MALL_DECK_Y;
          setIsParachutingHud(false);
          setParachuteConfirmOpen(false);
          boatState.active = false;
          boatState.targetX = null;
          boatState.targetZ = null;
          boatState.moving = false;
          isBoatingRef.current = false;
          activeTown.setRiverBoatPose?.(
            false,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            stateRef.current.boats.activeBoatId,
          );
          setIsBoatingHud(false);
          playPetTimer = 0;
          happyActionTimer = 0;
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
          if (boatState.active) {
            activeTown.setRiverBoatPose?.(
              true,
              boatState.x,
              boatState.z,
              boatState.rotY,
              false,
              0,
              stateRef.current.boats.activeBoatId,
            );
          } else {
            activeTown.setRiverBoatPose?.(
              false,
              undefined,
              undefined,
              undefined,
              undefined,
              undefined,
              stateRef.current.boats.activeBoatId,
            );
          }
        }
      } else {
        mallElev.state = 'ground';
        mallElev.progress = 0;
        mallElev.y = 0.04;
        parachuteCtrl.active = false;
        parachuteCtrl.worldY = MALL_DECK_Y;
        setIsParachutingHud(false);
        setParachuteConfirmOpen(false);
        if (zoneChanged || z !== 'island') {
          boatState.active = false;
          boatState.targetX = null;
          boatState.targetZ = null;
          boatState.moving = false;
          isBoatingRef.current = false;
          setIsBoatingHud(false);
          swimState.active = false;
          swimState.targetX = null;
          swimState.targetZ = null;
          swimState.moving = false;
          setIsSwimmingHud(false);
          treehouseState.onTreehouse = false;
          treehouseState.climbing = false;
          treehouseState.direction = 'up';
          treehouseState.progress = 0;
          treehouseState.cooldown = 0;
          treehouseState.postClimbAction = null;
        }
        if (zoneChanged) {
          playPetTimer = 0;
          happyActionTimer = 0;
        }
        controls.minDistance = z === 'garden' || z === 'home' ? 5.5 : z === 'mall' ? 3.6 : 4.5;
        controls.maxDistance =
          z === 'island'
            ? 56
            : z === 'garden'
              ? 34
              : z === 'home'
                ? 26
                : z === 'mall'
                  ? 16.5
                  : z === 'petshop' || z === 'arcade'
                    ? 22
                    : 18;
        controls.minPolarAngle = z === 'island' ? Math.PI * 0.12 : Math.PI * 0.16;
        controls.maxPolarAngle =
          z === 'island' ? Math.PI * 0.62 : z === 'mall' ? Math.PI * 0.48 : Math.PI * 0.45;
        activeSubzone = buildSubzoneScene(z, {
          plots: pl,
          fishingState: legacyFs,
          placedFurniture: z === 'home' ? pf : undefined,
          editFurnitureMode: z === 'home' ? stateRef.current.editFurnitureMode : undefined,
          placedFarmDecor: z === 'garden' ? stateRef.current.placedFarmDecor : undefined,
          editFarmDecorMode: z === 'garden' ? stateRef.current.editFarmDecorMode : undefined,
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
        currentShadowBlockers = [];
        currentShadowBlockerBoxes = [];
        currentTreeCanopies = [];
        if (z === 'mall') {
          currentNavGrid = buildNavGrid(
            'mall',
            currentColliders.filter((c) => !c.id?.startsWith('mall_f2_')),
          );
          mallFloor2NavGrid = buildNavGrid(
            'mall',
            currentColliders.filter((c) => c.id?.startsWith('mall_f2_')),
          );
        } else if (z === 'island') {
          currentNavGrid = buildNavGrid(
            'island',
            currentColliders.filter((c) => !c.id?.startsWith('island_th_')),
          );
          mallFloor2NavGrid = null;
        } else {
          currentNavGrid = buildNavGrid(z, currentColliders);
          mallFloor2NavGrid = null;
        }
        currentGrounds =
          activeSubzone.groundMeshes && activeSubzone.groundMeshes.length > 0
            ? activeSubzone.groundMeshes
            : [activeSubzone.groundMesh];
        activeDoorsRef.current = activeSubzone.doors ?? [];
        currentWallSurfaces = activeSubzone.wallSurfaces ?? [];
        if (zoneChanged) {
          activeTarget = null;
          activeSeat = null;
          jumpY = 0;
          jumpVel = 0;
          mallState.floor = 1;
          mallState.ridingLane = null;
          mallState.progress = 0;
          mallState.cooldown = 0;
          mallSlideCtrl.active = false;
          mallSlideCtrl.elapsed = 0;
          mallSlideCtrl.y = 0.02;
          if (z === 'home') {
            playerPos.x = -1.8;
            playerPos.z = 5.2;
            playerPos.rotY = Math.PI;
            homeSpotRef.current = {x: -1.8, z: 5.2};
          } else if (z === 'garden') {
            playerPos.x = 0;
            playerPos.z = 19.2;
            playerPos.rotY = Math.PI;
          } else if (z === 'petshop') {
            playerPos.x = 0;
            playerPos.z = 4.6;
            playerPos.rotY = Math.PI;
          } else if (z === 'mall') {
            playerPos.x = 0;
            playerPos.z = 18.8;
            playerPos.rotY = Math.PI;
          } else if (z === 'island') {
            playerPos.x = ISLAND_SPAWN.x;
            playerPos.z = ISLAND_SPAWN.z;
            playerPos.rotY = ISLAND_SPAWN.rotY;
          } else if (z === 'arcade') {
            playerPos.x = 0;
            playerPos.z = 7.4;
            playerPos.rotY = Math.PI;
          } else {
            playerPos.x = 0;
            playerPos.z = 2.6;
            playerPos.rotY = 0;
          }
          playerPos.pose = 'idle';
          const spawnSubY =
            z === 'island' ? getIslandGroundHeight(playerPos.x, playerPos.z) : 0;
          prevGroundY = spawnSubY;
          playerRig.root.position.set(playerPos.x, spawnSubY, playerPos.z);
          playerRig.root.rotation.y = playerPos.rotY;
          cameraTransitionActive = true;
          if (z === 'island') {
            activeSubzone.setIslandBoatPose?.(
              false,
              undefined,
              undefined,
              undefined,
              undefined,
              undefined,
              stateRef.current.boats.activeBoatId,
            );
          }
        } else if (z === 'island') {
          activeSubzone.setTreehouseFocus?.(treehouseState.onTreehouse || treehouseState.climbing);
          if (boatState.active) {
            activeSubzone.setIslandBoatPose?.(
              true,
              boatState.x,
              boatState.z,
              boatState.rotY,
              false,
              0,
              stateRef.current.boats.activeBoatId,
            );
          } else {
            activeSubzone.setIslandBoatPose?.(
              false,
              undefined,
              undefined,
              undefined,
              undefined,
              undefined,
              stateRef.current.boats.activeBoatId,
            );
          }
        }
      }
      activeZoneLoaded = z;
      syncPetCompanion(zoneChanged);
      refreshClickTargetsWithPet();
      if (!isSoftwareGl) {
        try {
          renderer.compile(scene, camera);
        } catch {
          // ignore shader pre-compile issues
        }
      }
    };

    rebuildSceneTriggerRef.current = loadCurrentWorld;
    rebuildAvatarTriggerRef.current = (
      cfg: AvatarConfig,
      equippedTool: ToolId | null,
      equippedFood: BbqFoodId | null,
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
      playerRig = buildAvatarRig(cfg, {equippedTool, equippedFood, carryingPet});
      const curY =
        stateRef.current.zone === 'town'
          ? boatState.active
            ? RIVER_WATER_Y + 0.16
            : mallElev.state === 'deck'
              ? MALL_DECK_Y
              : mallElev.state === 'riding_up' || mallElev.state === 'riding_down'
                ? mallElev.y + 0.06
                : getTownGroundHeight(playerPos.x, playerPos.z, currentPlazaRadius)
          : stateRef.current.zone === 'island'
            ? boatState.active
              ? ISLAND_WATER_Y + 0.16
              : swimState.active
                ? ISLAND_WATER_Y - 0.72
                : getIslandGroundHeight(playerPos.x, playerPos.z)
            : stateRef.current.zone === 'mall'
              ? mallState.floor === 2
                ? MALL_UPPER_Y
                : 0.02
              : 0;
      playerRig.root.position.set(playerPos.x, curY, playerPos.z);
      playerRig.root.rotation.y = playerPos.rotY;
      playerRig.root.add(playerProxy);
      if (mountRig) {
        playerRig.root.add(mountRig.root);
      }
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
      thrashIntensity: 0,
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
        speciesId: FishSpeciesId;
        name: string;
        rarity: FishRarity;
        weightKg: number;
        sellPrice: number;
        waterType: FishWaterType;
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
      struggleDurationSec: 2.8,
      struggleSplashTimer: 0,
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
      if (z === 'island') {
        return {targetX: 0, targetZ: 36.2, waterY: ISLAND_WATER_Y};
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

    const _shadowRay = new THREE.Raycaster();
    _shadowRay.camera = camera;
    const _shadowUpDir = new THREE.Vector3(0, 1, 0);
    const _shadowOrigin = new THREE.Vector3();
    const _shadowTarget = new THREE.Vector3();
    const _shadowCamDir = new THREE.Vector3();
    const _shadowHits: THREE.Intersection[] = [];

    const isObjTreeVisible = (obj: THREE.Object3D): boolean => {
      let cur: THREE.Object3D | null = obj;
      while (cur) {
        if (!cur.visible) return false;
        cur = cur.parent;
      }
      return true;
    };

    const isShadowBlockerHit = (
      hit: THREE.Intersection,
      waterY: number,
      allowShoreGrass = false,
    ): boolean => {
      const mesh = hit.object as THREE.Mesh;
      if (!mesh.isMesh) return false;
      if (!isObjTreeVisible(mesh)) return false;
      const mat = mesh.material;
      if (Array.isArray(mat)) {
        if (mat.every((m) => m.visible === false)) return false;
      } else if (mat) {
        if (mat.visible === false) return false;
        if ('opacity' in mat && mat.transparent && mat.opacity < 0.15) return false;
      }
      const ud = mesh.userData || {};
      if (ud.isWaterMesh || ud.isWaterSurface || ud.isFishingVisual) return false;
      if (ud.kind === 'ground') {
        return allowShoreGrass ? hit.point.y > 0.38 : hit.point.y > waterY + 0.14;
      }
      return true;
    };

    const hasShadowBlockerRayHit = (
      waterY: number,
      allowShoreGrass: boolean,
    ): boolean => {
      _shadowRay.camera = camera;
      const maxDistSq = _shadowRay.far * _shadowRay.far;
      for (let i = 0; i < currentShadowBlockers.length; i++) {
        const box = currentShadowBlockerBoxes[i];
        if (box) {
          const hitPt = _shadowRay.ray.intersectBox(box, _shadowBoxHitVec);
          if (!hitPt) continue;
          if (hitPt.distanceToSquared(_shadowRay.ray.origin) > maxDistSq) continue;
        }
        const blocker = currentShadowBlockers[i];
        _shadowHits.length = 0;
        blocker.raycast(_shadowRay, _shadowHits);
        for (let h = 0; h < _shadowHits.length; h++) {
          if (isShadowBlockerHit(_shadowHits[h], waterY, allowShoreGrass)) {
            _shadowHits.length = 0;
            return true;
          }
        }
      }
      _shadowHits.length = 0;
      return false;
    };

    const isWaterTargetOpenForShadow = (
      targetX: number,
      targetZ: number,
      waterY: number,
      waterKind: 'river' | 'lake' | 'sea',
    ): boolean => {
      if (waterKind === 'sea') {
        if (Math.hypot(targetX, targetZ) > ISLAND_SWIM_MAX_R - 1.5) return false;
        if (getIslandBaseTerrainY(targetX, targetZ) >= ISLAND_WATER_Y - 0.14) return false;
        if (
          targetX >= ISLAND_PIER_X_MIN - 0.35 &&
          targetX <= ISLAND_PIER_X_MAX + 0.35 &&
          targetZ >= ISLAND_PIER_Z_MIN - 0.35 &&
          targetZ <= ISLAND_PIER_Z_MAX + 0.35
        ) {
          return false;
        }
        if (Math.hypot(targetX - -2.85, targetZ - 31.8) < 1.25) return false;
        if (!boatState.active && Math.hypot(targetX - 2.8, targetZ - 31.7) < 1.55) return false;
        const islandCols = getActiveColliders('island');
        for (let i = 0; i < islandCols.length; i++) {
          const c = islandCols[i];
          if (c.type === 'circle' && !c.id && Math.hypot(targetX - c.x, targetZ - c.z) < c.r + 0.45) {
            return false;
          }
        }
        return true;
      }
      if (waterKind === 'river') {
        if (targetZ < WEST_RIVER_NAV_MIN_Z + 1.0 || targetZ > WEST_RIVER_NAV_MAX_Z - 1.0) {
          return false;
        }
        const cx = getWestRiverCenterX(targetZ);
        const hw = getWestRiverHalfWidth(targetZ);
        if (Math.abs(targetX - cx) > hw - 1.05) return false;
        // Arched bridge deck shadow
        if (
          Math.abs(targetZ - WEST_BRIDGE_Z) < 1.95 &&
          Math.abs(targetX - getWestRiverCenterX(WEST_BRIDGE_Z)) < WEST_BRIDGE_HALF_SPAN + 0.35
        ) {
          return false;
        }
        // Boat dock overhang shadow
        if (targetX > -78.1 && targetZ > -3.35 && targetZ < -0.25) return false;
        // Waterfall plunge pool foam & cliff base pocket
        if (Math.hypot(targetX - -94.7, targetZ - -9.0) < 3.45) return false;
        if (targetX < -93.4 && targetZ > -14.2 && targetZ < -3.8) return false;
      } else {
        const dx = targetX - LAKE_CENTER.x;
        const dz = targetZ - LAKE_CENTER.z;
        const dist = Math.hypot(dx, dz);
        const theta = Math.atan2(dz, dx);
        if (dist > getLakeShoreRadius(theta) - 1.25) return false;
        // Wooden lake pier shadow
        if (Math.abs(targetX - -22.5) < 1.55 && targetZ < 45.05) return false;
      }

      if (!activeTown) return true;

      // Analytical tree canopy shade check (zero CPU InstancedMesh raycasts!)
      for (let i = 0; i < currentTreeCanopies.length; i++) {
        const c = currentTreeCanopies[i];
        const dx = targetX - c.x;
        const dz = targetZ - c.z;
        if (dx * dx + dz * dz < c.rSq) return false;
      }

      // Overhead shade ray (bridge, pier, dock, cliff rocks, buildings)
      _shadowOrigin.set(targetX, waterY + 0.12, targetZ);
      _shadowRay.set(_shadowOrigin, _shadowUpDir);
      _shadowRay.near = 0.04;
      _shadowRay.far = 28;
      if (hasShadowBlockerRayHit(waterY, false)) {
        return false;
      }

      // Camera line-of-sight occlusion ray (ensures fish shadow is visible from camera)
      _shadowTarget.set(targetX, waterY + 0.06, targetZ);
      _shadowCamDir.subVectors(_shadowTarget, camera.position);
      const camDist = _shadowCamDir.length();
      if (camDist > 0.6) {
        _shadowCamDir.divideScalar(camDist);
        _shadowRay.set(camera.position, _shadowCamDir);
        _shadowRay.near = 0.25;
        _shadowRay.far = camDist - 0.32;
        if (hasShadowBlockerRayHit(waterY, true)) {
          return false;
        }
      }

      return true;
    };

    const handleSpotFishing = (
      spotX: number,
      spotZ: number,
      facingRotY: number,
      customWater?: {targetX: number; targetZ: number; waterY: number; castOriginY?: number},
    ) => {
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
        const target = customWater ?? getZoneFishingWaterTarget(zNow);
        const rolled = zNow === 'island' ? rollRandomSeaFish() : rollRandomRiverFish();
        const cfg = FISH_RARITY_CONFIG[rolled.species.rarity];

        const gy =
          zNow === 'town'
            ? getTownGroundHeight(spotX, spotZ, currentPlazaRadius)
            : zNow === 'garden'
              ? 0.36
              : zNow === 'island'
                ? getIslandGroundHeight(spotX, spotZ)
                : 0;

        // Pick an unoccluded open-water approach angle so the fish shadow spawns clearly in view
        const forwardX = Math.sin(facingRotY);
        const forwardZ = Math.cos(facingRotY);
        const waterKindTown: 'river' | 'lake' | 'sea' | null =
          zNow === 'town'
            ? target.targetX < -55
              ? 'river'
              : 'lake'
            : zNow === 'island'
              ? 'sea'
              : null;
        const baseJitter = (Math.random() - 0.5) * 0.32;
        const spreadCandidates = [0, 0.7, -0.7, 1.35, -1.35];
        let chosenAngle = facingRotY + baseJitter;
        if (waterKindTown) {
          for (let si = 0; si < spreadCandidates.length; si++) {
            const candAngle = facingRotY + spreadCandidates[si] + (si === 0 ? baseJitter : 0);
            const sx = target.targetX + Math.sin(candAngle) * 2.15;
            const sz = target.targetZ + Math.cos(candAngle) * 2.15;
            const mx = target.targetX + Math.sin(candAngle) * 1.1;
            const mz = target.targetZ + Math.cos(candAngle) * 1.1;
            if (
              isWaterTargetOpenForShadow(sx, sz, target.waterY, waterKindTown) &&
              isWaterTargetOpenForShadow(mx, mz, target.waterY, waterKindTown)
            ) {
              chosenAngle = candAngle;
              break;
            }
          }
        }
        const appDirX = Math.sin(chosenAngle);
        const appDirZ = Math.cos(chosenAngle);

        fishCtrl.phase = 'casting';
        fishCtrl.phaseElapsed = 0;
        fishCtrl.spotX = spotX;
        fishCtrl.spotZ = spotZ;
        fishCtrl.facingRotY = facingRotY;
        fishCtrl.targetX = target.targetX;
        fishCtrl.targetZ = target.targetZ;
        fishCtrl.waterY = target.waterY;
        fishCtrl.startX = spotX + forwardX * 0.72;
        fishCtrl.startY = customWater?.castOriginY ?? gy + 1.55;
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
          waterType: rolled.species.waterType,
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
        fishCtrl.struggleDurationSec = 2.8;
        fishCtrl.struggleSplashTimer = 0;
        fishCtrl.pullPoseTimer = 0;
        fishCtrl.spookTimer = 0;

        playerPos.pose = 'fish_cast';
        setFishingState('casting');
        soundFX.tap();
        showBubble('Quăng phao xuống nước...', spotX, 2.25, spotZ);
      } else if (fishCtrl.phase === 'bite') {
        const rarity = fishCtrl.rolledCatch?.rarity;
        const isRare = rarity === 'rare';
        fishCtrl.struggleDurationSec = isRare
          ? 3.4 + Math.random() * 1.6
          : 2.0 + Math.random() * 2.0;
        fishCtrl.struggleSplashTimer = 0.42;
        fishCtrl.phase = 'pulling';
        fishCtrl.phaseElapsed = 0;
        playerPos.pose = 'fish_pull';
        setFishingState('pulling');
        setBiteAlertPos(null);
        soundFX.splash();
        showBubble(
          isRare ? 'Cá hiếm đang vùng vẫy mạnh! Cố kéo lên!' : 'Dính cá rồi! Đang kéo cần lên...',
          spotX,
          2.35,
          spotZ,
        );
      } else if (fishCtrl.phase === 'pulling') {
        return;
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
      const zNowWalk = stateRef.current.zone;
      const activeNav =
        zNowWalk === 'mall' && mallState.floor === 2 ? mallFloor2NavGrid : currentNavGrid;
      const activeCols = getActiveColliders(zNowWalk);
      const waypoints = findSmartPath(
        activeNav,
        activeCols,
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

    const disembarkBoat = (showNote = true) => {
      if (!boatState.active) return;
      if (fishCtrl.phase !== 'idle') {
        resetFishing(false);
      }
      const zBoat = stateRef.current.zone;
      boatState.active = false;
      boatState.targetX = null;
      boatState.targetZ = null;
      boatState.moving = false;
      isBoatingRef.current = false;
      setIsBoatingHud(false);
      if (zBoat === 'island') {
        activeSubzone?.setIslandBoatPose?.(
          false,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          stateRef.current.boats.activeBoatId,
        );
        playerPos.x = ISLAND_BOAT_INTERACT.tx;
        playerPos.z = ISLAND_BOAT_INTERACT.tz;
        playerPos.rotY = -Math.PI / 2;
        playerPos.pose = 'idle';
        prevGroundY = getIslandGroundHeight(playerPos.x, playerPos.z);
        jumpY = 0;
        jumpVel = 0;
        if (showNote) {
          soundFX.tap();
          showBubble('Đã lên Cầu Cảng Đảo Mây!');
        }
        return;
      }
      activeTown?.setRiverBoatPose?.(
        false,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        stateRef.current.boats.activeBoatId,
      );
      playerPos.x = -75.0;
      playerPos.z = -1.8;
      playerPos.rotY = Math.PI / 2;
      playerPos.pose = 'idle';
      prevGroundY = getTownGroundHeight(playerPos.x, playerPos.z, currentPlazaRadius);
      jumpY = 0;
      jumpVel = 0;
      if (showNote) {
        soundFX.tap();
        showBubble('Đã lên bến gỗ Khu Sinh Thái!');
      }
    };

    const climbTreehouseLadder = (direction: 'up' | 'down', postAction?: () => void) => {
      if (stateRef.current.zone !== 'island' || treehouseState.climbing) return;
      if (fishCtrl.phase !== 'idle') {
        resetFishing(false);
      }
      callbacksRef.current.onDismountMount();
      releaseSeatIfNeeded();
      activeTarget = null;
      jumpY = 0;
      jumpVel = 0;
      playPetTimer = 0;
      treehouseState.climbing = true;
      treehouseState.direction = direction;
      treehouseState.progress = 0;
      treehouseState.baseGroundY = getIslandBaseTerrainY(
        ISLAND_LADDER_BOTTOM.x,
        ISLAND_LADDER_BOTTOM.z,
      );
      treehouseState.postClimbAction = postAction ?? null;
      playerPos.x =
        direction === 'up' ? ISLAND_LADDER_CLIMB_START.x : ISLAND_LADDER_CLIMB_END.x;
      playerPos.z =
        direction === 'up' ? ISLAND_LADDER_CLIMB_START.z : ISLAND_LADDER_CLIMB_END.z;
      playerPos.rotY = Math.PI;
      playerPos.pose = 'climb';
      activeSubzone?.setTreehouseFocus?.(true);
      soundFX.tap();
      showBubble(
        direction === 'up'
          ? 'Đang leo cầu thang dây lên Vườn Trên Cây...'
          : 'Đang leo cầu thang dây xuống bãi cỏ...',
      );
    };

    const walkToIslandTreehousePoint = (
      tx: number,
      tz: number,
      arrivePose: AvatarPose,
      seat?: SeatTarget,
      onArrive?: () => void,
    ) => {
      if (stateRef.current.zone !== 'island') return;
      if (!treehouseState.onTreehouse) {
        if (swimState.active) {
          showBubble('Hãy lên bờ trước khi leo Cầu Thang Dây lên Nhà Trên Cây!');
          return;
        }
        const distBot = Math.hypot(
          playerPos.x - ISLAND_LADDER_CLIMB_START.x,
          playerPos.z - ISLAND_LADDER_CLIMB_START.z,
        );
        const startUp = () =>
          climbTreehouseLadder('up', () =>
            walkToIslandTreehousePoint(tx, tz, arrivePose, seat, onArrive),
          );
        if (distBot < 0.72) {
          startUp();
        } else {
          startWalkTo(
            ISLAND_LADDER_CLIMB_START.x,
            ISLAND_LADDER_CLIMB_START.z,
            'idle',
            undefined,
            startUp,
          );
        }
        return;
      }

      const thPt = clampPointToIslandTreehouse(tx, tz);
      const finalPt = seat
        ? thPt
        : resolvePointAgainstColliders(
            thPt.x,
            thPt.z,
            getActiveColliders('island'),
            PLAYER_RADIUS,
            false,
          );
      const clampedFinal = clampPointToIslandTreehouse(finalPt.x, finalPt.z);
      const waypoints: {x: number; z: number}[] = [];
      const doorZ = ISLAND_TREEHOUSE_DOOR.z;
      const startInside = playerPos.z < doorZ;
      const endInside = clampedFinal.z < doorZ;
      if (startInside !== endInside) {
        if (startInside) {
          waypoints.push({x: ISLAND_TREEHOUSE_DOOR.x, z: doorZ - 0.52});
          waypoints.push({x: ISLAND_TREEHOUSE_DOOR.x, z: doorZ + 0.52});
        } else {
          waypoints.push({x: ISLAND_TREEHOUSE_DOOR.x, z: doorZ + 0.52});
          waypoints.push({x: ISLAND_TREEHOUSE_DOOR.x, z: doorZ - 0.52});
        }
      }
      waypoints.push({x: clampedFinal.x, z: clampedFinal.z});
      stallTimer = 0;
      prevDistToTarget = Infinity;
      playPetTimer = 0;
      activeTarget = {
        x: clampedFinal.x,
        z: clampedFinal.z,
        waypoints,
        waypointIdx: 0,
        arrivePose,
        seat,
        onArrive,
      };
    };

    const ensureOnIslandGroundThen = (afterDown: () => void) => {
      if (stateRef.current.zone === 'island' && treehouseState.onTreehouse) {
        walkToIslandTreehousePoint(
          ISLAND_LADDER_TOP.x,
          ISLAND_LADDER_TOP.z,
          'idle',
          undefined,
          () => climbTreehouseLadder('down', afterDown),
        );
        return;
      }
      afterDown();
    };

    jumpActionRef.current = () => {
      if (
        stateRef.current.ownedMounts.activeMountId !== null ||
        boatState.active ||
        parachuteCtrl.active ||
        swimState.active ||
        treehouseState.climbing ||
        mallSlideCtrl.active
      ) {
        return;
      }
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
      const zAct = stateRef.current.zone;
      if (
        (zAct !== 'town' && zAct !== 'island') ||
        boatState.active ||
        parachuteCtrl.active ||
        swimState.active ||
        treehouseState.climbing
      ) {
        return;
      }
      const net = stateRef.current.bugNet;
      if (!net.owned || !net.equipped) return;
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

    fishActionRef.current = () => {
      const zAct = stateRef.current.zone;
      if (parachuteCtrl.active || swimState.active || treehouseState.climbing || netSwingCtrl.active) {
        return;
      }
      if (fishCtrl.phase !== 'idle') {
        handleSpotFishing(
          fishCtrl.spotX || (boatState.active ? boatState.x : playerPos.x),
          fishCtrl.spotZ || (boatState.active ? boatState.z : playerPos.z),
          fishCtrl.facingRotY,
        );
        return;
      }
      const rod = stateRef.current.fishingRod;
      if (!rod.owned || !rod.equipped) return;
      if (rod.durability <= 0) {
        soundFX.tap();
        setBrokenRodPrompt({
          repairCost: getRodRepairCost(rod.durability, rod.maxDurability),
          maxDurability: rod.maxDurability,
        });
        return;
      }

      if (boatState.active && (zAct === 'town' || zAct === 'island')) {
        const boatWaterY = zAct === 'island' ? ISLAND_WATER_Y : RIVER_WATER_Y;
        const boatWaterKind = zAct === 'island' ? 'sea' : 'river';
        const yawCand = [0, 0.45, -0.45, 0.9, -0.9];
        const distCand = [3.8, 4.7, 3.0, 5.4];
        for (let yi = 0; yi < yawCand.length; yi++) {
          const ang = boatState.rotY + yawCand[yi];
          for (let di = 0; di < distCand.length; di++) {
            const tx = boatState.x + Math.sin(ang) * distCand[di];
            const tz = boatState.z + Math.cos(ang) * distCand[di];
            if (isWaterTargetOpenForShadow(tx, tz, boatWaterY, boatWaterKind)) {
              boatState.targetX = null;
              boatState.targetZ = null;
              boatState.moving = false;
              handleSpotFishing(boatState.x, boatState.z, ang, {
                targetX: tx,
                targetZ: tz,
                waterY: boatWaterY,
                castOriginY: boatWaterY + 1.78,
              });
              return;
            }
          }
        }
        soundFX.tap();
        showBubble('Chỗ này bị che khuất! Hãy chèo thuyền ra vùng nước thoáng hơn.');
        return;
      }

      if (zAct === 'garden') {
        if (Math.hypot(playerPos.x - 15.2, playerPos.z - 3.0) < 4.5) {
          farmPondFishActionRef.current?.();
        } else {
          soundFX.tap();
          showBubble('Hãy đi lại gần Hồ Cá trong Nông Trại để câu cá!');
        }
        return;
      }

      if (zAct === 'fishing') {
        handleSpotFishing(playerPos.x, playerPos.z, 0);
        return;
      }

      if (zAct === 'island') {
        const distC = Math.hypot(playerPos.x, playerPos.z) || 1;
        const outAngle = Math.atan2(playerPos.x / distC, playerPos.z / distC);
        const dirs = [playerPos.rotY, playerPos.rotY + 0.35, playerPos.rotY - 0.35, outAngle];
        const dists = [3.4, 4.3, 5.2, 6.0];
        for (let ai = 0; ai < dirs.length; ai++) {
          for (let di = 0; di < dists.length; di++) {
            const tx = playerPos.x + Math.sin(dirs[ai]) * dists[di];
            const tz = playerPos.z + Math.cos(dirs[ai]) * dists[di];
            if (isWaterTargetOpenForShadow(tx, tz, ISLAND_WATER_Y, 'sea')) {
              handleSpotFishing(playerPos.x, playerPos.z, dirs[ai], {
                targetX: tx,
                targetZ: tz,
                waterY: ISLAND_WATER_Y,
              });
              return;
            }
          }
        }
        soundFX.tap();
        showBubble('Hãy đứng gần mép biển hoặc cầu cảng, hướng ra vùng nước thoáng để quăng phao!');
        return;
      }

      if (zAct === 'town') {
        const dirs = [playerPos.rotY, playerPos.rotY + 0.35, playerPos.rotY - 0.35];
        const dists = [3.2, 4.0, 4.8];
        const waterKind: 'river' | 'lake' = playerPos.x < -55 ? 'river' : 'lake';
        const wY = waterKind === 'river' ? RIVER_WATER_Y : TOWN_LAKE_WATER_Y;
        for (let ai = 0; ai < dirs.length; ai++) {
          for (let di = 0; di < dists.length; di++) {
            const tx = playerPos.x + Math.sin(dirs[ai]) * dists[di];
            const tz = playerPos.z + Math.cos(dirs[ai]) * dists[di];
            if (isWaterTargetOpenForShadow(tx, tz, wY, waterKind)) {
              handleSpotFishing(playerPos.x, playerPos.z, dirs[ai], {
                targetX: tx,
                targetZ: tz,
                waterY: wY,
              });
              return;
            }
          }
        }
        soundFX.tap();
        showBubble('Hãy đứng sát bờ hồ hoặc bờ sông thoáng để quăng phao!');
      }
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
      parachuteCtrl.active = false;
      parachuteCtrl.worldY = MALL_DECK_Y;
      setIsParachutingHud(false);
      setParachuteConfirmOpen(false);
      boatState.active = false;
      boatState.targetX = null;
      boatState.targetZ = null;
      boatState.moving = false;
      isBoatingRef.current = false;
      activeTown?.setRiverBoatPose?.(
        false,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        stateRef.current.boats.activeBoatId,
      );
      setIsBoatingHud(false);
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
          callbacksRef.current.onDismountMount();
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

    launchParachuteRef.current = () => {
      if (stateRef.current.zone !== 'town' || mallElev.state !== 'deck' || parachuteCtrl.active) {
        return;
      }
      setParachuteConfirmOpen(false);
      activeTarget = null;
      releaseSeatIfNeeded();
      jumpY = 0;
      jumpVel = 0;
      playPetTimer = 0;
      if (fishCtrl.phase !== 'idle') {
        resetFishing(false);
      }
      mallElev.state = 'ground';
      mallElev.progress = 0;
      mallElev.y = 0.04;
      activeTown?.setMallElevatorY?.(0.04);
      mallElevatorHudRef.current = 'none';
      setMallElevatorHud('none');

      parachuteCtrl.active = true;
      parachuteCtrl.worldY = MALL_DECK_Y;
      prevGroundY = MALL_DECK_Y;
      playerPos.x = -39.4;
      playerPos.z = 2.6;
      playerPos.rotY = Math.PI * 0.42;
      playerPos.pose = 'parachute';

      callbacksRef.current.onDismountMount();
      setIsParachutingHud(true);
      soundFX.sparkle();
      showBubble('Bung dù rồi! Dùng Joystick để chọn nơi đáp đất nhé!');
    };

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
      if (parachuteCtrl.active || treehouseState.climbing) return;
      if (
        stateRef.current.zone === 'town' &&
        (mallElev.state === 'riding_up' || mallElev.state === 'riding_down')
      ) {
        return;
      }
      // Fast-reflex bite catch: tapping anywhere while '!' is active starts the tug-of-war struggle!
      if (fishCtrl.phase === 'bite') {
        handleSpotFishing(fishCtrl.spotX, fishCtrl.spotZ, fishCtrl.facingRotY);
        return;
      }
      if (fishCtrl.phase === 'pulling') {
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
            !selCat.walkable &&
            selCat.kind !== 'floor_paint' &&
            selCat.kind !== 'wall_paint' &&
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

      // 0b. Farm Decor Edit Mode: select placed farm decor or move selected item on garden lawn
      if (stateRef.current.zone === 'garden' && stateRef.current.editFarmDecorMode) {
        const hits = raycaster.intersectObjects(currentClickTargets, true);
        const selId = stateRef.current.selectedFarmDecorId;
        for (const h of hits) {
          let obj: THREE.Object3D | null = h.object;
          while (obj && (!obj.userData || !obj.userData.kind)) {
            obj = obj.parent;
          }
          if (obj && obj.userData.farmDecorId) {
            const hitId = obj.userData.farmDecorId as string;
            soundFX.tap();
            callbacksRef.current.onSelectFarmDecor(hitId);
            return;
          }
        }
        if (selId && currentGrounds.length > 0) {
          const groundHits = raycaster.intersectObjects(currentGrounds, false);
          if (groundHits.length > 0) {
            const pt = groundHits[0].point;
            const gb = getZoneWalkBounds('garden');
            const cx = THREE.MathUtils.clamp(pt.x, gb.minX + 0.8, gb.maxX - 0.8);
            const cz = THREE.MathUtils.clamp(pt.z, gb.minZ + 0.8, gb.maxZ - 0.8);
            soundFX.tap();
            callbacksRef.current.onMoveFarmDecor(selId, cx, cz);
          }
        }
        return;
      }

      joyboyApproachRef.current = false;
      selectedPlotRef.current = null;
      setArcMenuPos(null);
      selectedPetRef.current = null;
      setPetArcMenuPos(null);
      selectedRemoteRef.current = null;
      setRemoteArcMenuPos(null);

      // 1. Check interactive buildings/objects/NPCs/player
      const hits = raycaster.intersectObjects(currentClickTargets, true);
      if (hits.length > 0) {
        let obj: THREE.Object3D | null = hits[0].object;
        while (obj && (!obj.userData || !obj.userData.kind)) {
          obj = obj.parent;
        }
        // Prevent river water below a bridge/pier deck from hijacking clicks on top of the bridge/pier!
        const waterUnderWalkableGround =
          Boolean(obj && obj.userData?.isWaterMesh && currentGrounds.length > 0) &&
          (() => {
            const gPre = raycaster.intersectObjects(currentGrounds, false);
            return gPre.length > 0 && gPre[0].distance < hits[0].distance - 0.02;
          })();
        if (obj && obj.userData.kind && !waterUnderWalkableGround) {
          const data = obj.userData;
          const kind = data.kind as string;

          if (kind === 'player') {
            soundFX.tap();
            setActionsTrayOpen((prev) => !prev);
            return;
          }

          if (kind === 'remote_player' && typeof data.playerId === 'string') {
            const ent = remoteEntities.get(data.playerId);
            if (ent && ent.visibleInZone && isPublicMultiplayerZone(stateRef.current.zone)) {
              soundFX.tap();
              selectedRemoteRef.current = {playerId: ent.id};
              const cw = container?.clientWidth || window.innerWidth || 800;
              const ch = container?.clientHeight || window.innerHeight || 600;
              _remoteHeadVec.set(ent.x, ent.y + 1.32, ent.z).project(camera);
              const rawX = _remoteHeadVec.z <= 1 ? ((_remoteHeadVec.x + 1) / 2) * cw : cw / 2;
              const rawY = _remoteHeadVec.z <= 1 ? ((-_remoteHeadVec.y + 1) / 2) * ch : ch / 2;
              const padX = Math.min(185, cw * 0.36);
              const minY = Math.min(165, ch * 0.42);
              setRemoteArcMenuPos({
                player: ent.meta,
                x: Math.max(padX, Math.min(cw - padX, rawX)),
                y: Math.max(minY, Math.min(ch - 70, rawY)),
              });
              return;
            }
          }

          releaseSeatIfNeeded();
          stallTimer = 0;
          prevDistToTarget = Infinity;

          if (kind === 'bench') {
            soundFX.tap();
            const slots = Array.isArray(data.seatSlots)
              ? (data.seatSlots as Array<{
                  seatX: number;
                  seatZ: number;
                  seatY?: number;
                  sitRotY?: number;
                  tx: number;
                  tz: number;
                }>)
              : null;
            let chosen = {
              seatX: data.seatX as number,
              seatZ: data.seatZ as number,
              seatY: (data.seatY as number) || 0.52,
              sitRotY: (data.sitRotY as number) ?? 0,
              tx: data.tx as number,
              tz: data.tz as number,
            };
            if (slots && slots.length > 0) {
              const hitPt = hits[0].point;
              let bestDist = Infinity;
              for (const slot of slots) {
                const d = Math.hypot(slot.seatX - hitPt.x, slot.seatZ - hitPt.z);
                if (d < bestDist) {
                  bestDist = d;
                  chosen = {
                    seatX: slot.seatX,
                    seatZ: slot.seatZ,
                    seatY: slot.seatY ?? ((data.seatY as number) || 0.52),
                    sitRotY: slot.sitRotY ?? ((data.sitRotY as number) ?? 0),
                    tx: slot.tx,
                    tz: slot.tz,
                  };
                }
              }
            }
            const seatInfo: SeatTarget = {
              seatX: chosen.seatX,
              seatZ: chosen.seatZ,
              seatY: chosen.seatY,
              rotY: chosen.sitRotY,
              standX: chosen.tx,
              standZ: chosen.tz,
            };
            if (
              stateRef.current.zone === 'mall' &&
              mallState.floor === 2 &&
              chosen.seatY < MALL_UPPER_Y
            ) {
              showBubble('Hãy xuống thang cuốn về Tầng 1 để ngồi nghỉ nhé!');
              return;
            }
            const sitMessage = typeof data.sitMessage === 'string' ? data.sitMessage : null;
            if (stateRef.current.zone === 'island' && data.isTreehouseItem) {
              walkToIslandTreehousePoint(chosen.tx, chosen.tz, 'sit', seatInfo, () => {
                soundFX.sparkle();
                callbacksRef.current.onBoostMood();
                showBubble('Thưởng trà & bánh ngọt thơm lừng trên Nhà Trên Cây! (+Vui vẻ)');
              });
            } else if (stateRef.current.zone === 'island' && treehouseState.onTreehouse) {
              ensureOnIslandGroundThen(() =>
                startWalkTo(chosen.tx, chosen.tz, 'sit', seatInfo, () => {
                  soundFX.sparkle();
                  if (sitMessage) {
                    callbacksRef.current.onBoostMood();
                    showBubble(sitMessage);
                  }
                }),
              );
            } else {
              startWalkTo(chosen.tx, chosen.tz, 'sit', seatInfo, () => {
                soundFX.sparkle();
                if (sitMessage) {
                  callbacksRef.current.onBoostMood();
                  showBubble(sitMessage);
                }
              });
            }
            return;
          }

          if (kind === 'island_rope_ladder') {
            soundFX.tap();
            if (swimState.active) {
              showBubble('Hãy lên bờ trước khi leo Cầu Thang Dây!');
              return;
            }
            if (treehouseState.onTreehouse) {
              walkToIslandTreehousePoint(
                ISLAND_LADDER_TOP.x,
                ISLAND_LADDER_TOP.z,
                'idle',
                undefined,
                () => climbTreehouseLadder('down'),
              );
            } else {
              const distBot = Math.hypot(
                playerPos.x - ISLAND_LADDER_CLIMB_START.x,
                playerPos.z - ISLAND_LADDER_CLIMB_START.z,
              );
              if (distBot < 0.72) {
                climbTreehouseLadder('up');
              } else {
                startWalkTo(
                  ISLAND_LADDER_CLIMB_START.x,
                  ISLAND_LADDER_CLIMB_START.z,
                  'idle',
                  undefined,
                  () => climbTreehouseLadder('up'),
                );
              }
            }
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
            ensureOnIslandGroundThen(() =>
              startWalkTo(data.tx as number, data.tz as number, 'sit', seatInfo, () => {
                soundFX.sparkle();
                callbacksRef.current.onBoostMood();
                showBubble('Ngồi sưởi ấm bên bếp lửa trại thật chill! (+Vui vẻ)');
              }),
            );
            return;
          }

          if (kind === 'beach_grill') {
            soundFX.tap();
            ensureOnIslandGroundThen(() =>
              startWalkTo(data.tx as number, data.tz as number, 'idle', undefined, () => {
                soundFX.sparkle();
                callbacksRef.current.onBoostMood();
                showBubble(
                  'Nướng cá biển vàng giòn thơm phức bên tiếng sóng rì rào! (+Vui vẻ)',
                  (data.grillX as number) ?? (data.tx as number),
                  2.1,
                  (data.grillZ as number) ?? (data.tz as number),
                );
              }),
            );
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

          if (kind === 'microwave') {
            soundFX.tap();
            startWalkTo(data.tx as number, data.tz as number, 'idle', undefined, () => {
              soundFX.sparkle();
              callbacksRef.current.onOpenMicrowave();
            });
            return;
          }

          if (kind === 'mini_oven') {
            soundFX.tap();
            startWalkTo(data.tx as number, data.tz as number, 'idle', undefined, () => {
              soundFX.sparkle();
              callbacksRef.current.onOpenMiniOven();
            });
            return;
          }

          if (kind === 'bed') {
            soundFX.tap();
            const bedId = typeof data.furnitureId === 'string' ? data.furnitureId : null;
            const sleepMsg =
              (data.sleepMessage as string | undefined) || 'Ngủ thật ngon! (+Năng lượng)';
            const bedSeat: SeatTarget = {
              seatX: (data.seatX as number) ?? 2.35,
              seatZ: (data.seatZ as number) ?? -3.1,
              seatY: (data.seatY as number) ?? 0.65,
              rotY: (data.sitRotY as number) ?? 0,
              standX: data.tx as number,
              standZ: data.tz as number,
              isBed: true,
            };
            const walkToBed = () =>
              startWalkTo(data.tx as number, data.tz as number, 'sleep', bedSeat, () => {
                soundFX.nap();
                if (bedId) {
                  activeBedIdRef.current = bedId;
                  activeSubzone?.setActiveBed?.(bedId);
                }
                callbacksRef.current.onRestoreEnergy();
                showBubble(sleepMsg, bedSeat.seatX, bedSeat.seatY + 1.45, bedSeat.seatZ);
              });
            if (stateRef.current.zone === 'island') {
              ensureOnIslandGroundThen(walkToBed);
            } else {
              walkToBed();
            }
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
              const harvested = callbacksRef.current.onHarvestPlot(plotId);
              if (harvested) {
                soundFX.sparkle();
                showBubble('Thu hoạch +2 nông sản!', tx, 2.0, tz);
              } else {
                soundFX.tap();
                showBubble('Nhà kho đã đầy! Bán bớt hoặc nâng cấp kho', tx, 2.0, tz);
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
            }
            return;
          }

          if (kind === 'farm_mill') {
            soundFX.sparkle();
            callbacksRef.current.onOpenWorkshop('mill');
            return;
          }

          if (kind === 'farm_kitchen') {
            soundFX.sparkle();
            callbacksRef.current.onOpenWorkshop('kitchen');
            return;
          }

          if (kind === 'order_board') {
            soundFX.sparkle();
            callbacksRef.current.onOpenOrders();
            return;
          }

          if (kind === 'farm_storage') {
            soundFX.sparkle();
            callbacksRef.current.onOpenStorage();
            return;
          }

          if (kind === 'pasture_spot') {
            const targetCoop = data.coop as CoopKind | undefined;
            soundFX.sparkle();
            callbacksRef.current.onOpenPasture(targetCoop);
            return;
          }

          if (kind === 'pond_spot') {
            soundFX.tap();
            if (stateRef.current.fishingState !== 'idle') {
              handleSpotFishing(15.2, 3.0, Math.PI / 2);
              return;
            }
            soundFX.splash();
            callbacksRef.current.onOpenPond();
            return;
          }

          if (kind === 'farm_shop') {
            soundFX.sparkle();
            callbacksRef.current.onOpenFarmShop();
            return;
          }

          if (kind === 'town_lake_fish') {
            if (boatState.active) return;
            soundFX.tap();
            if (fishCtrl.phase !== 'idle') {
              handleSpotFishing(
                fishCtrl.spotX || playerPos.x,
                fishCtrl.spotZ || playerPos.z,
                fishCtrl.facingRotY,
              );
              return;
            }
            if (data.isWaterMesh) {
              const hitPt = hits[0].point;
              const tryLakeShoreCast = (spotX: number, spotZ: number) => {
                const rodNow = stateRef.current.fishingRod;
                if (!rodNow.owned || !rodNow.equipped || rodNow.durability <= 0) {
                  handleSpotFishing(spotX, spotZ, Math.atan2(hitPt.x - spotX, hitPt.z - spotZ));
                  return;
                }
                const dxW = hitPt.x - spotX;
                const dzW = hitPt.z - spotZ;
                const rawD = Math.hypot(dxW, dzW);
                const dirX =
                  rawD > 0.05
                    ? dxW / rawD
                    : (LAKE_CENTER.x - spotX) / (Math.hypot(LAKE_CENTER.x - spotX, LAKE_CENTER.z - spotZ) || 1);
                const dirZ =
                  rawD > 0.05
                    ? dzW / rawD
                    : (LAKE_CENTER.z - spotZ) / (Math.hypot(LAKE_CENTER.x - spotX, LAKE_CENTER.z - spotZ) || 1);
                const castDist = THREE.MathUtils.clamp(rawD, 2.5, 4.6);
                const tx = spotX + dirX * castDist;
                const tz = spotZ + dirZ * castDist;
                if (!isWaterTargetOpenForShadow(tx, tz, TOWN_LAKE_WATER_Y, 'lake')) {
                  soundFX.tap();
                  showBubble(
                    'Chỗ này bị che bóng, không thấy bóng cá! Hãy di chuyển đến nơi thoáng hơn.',
                    spotX,
                    2.25,
                    spotZ,
                  );
                  return;
                }
                const castRotY = Math.atan2(tx - spotX, tz - spotZ);
                handleSpotFishing(spotX, spotZ, castRotY, {
                  targetX: tx,
                  targetZ: tz,
                  waterY: TOWN_LAKE_WATER_Y,
                });
              };

              const distToHit = Math.hypot(playerPos.x - hitPt.x, playerPos.z - hitPt.z);
              const playerGy = getTownGroundHeight(playerPos.x, playerPos.z, currentPlazaRadius);
              if (distToHit <= 5.6 && playerGy < 1.35) {
                tryLakeShoreCast(playerPos.x, playerPos.z);
              } else {
                const lx = hitPt.x - LAKE_CENTER.x;
                const lz = hitPt.z - LAKE_CENTER.z;
                const standTheta =
                  Math.hypot(lx, lz) > 2.2
                    ? Math.atan2(lz, lx)
                    : Math.atan2(playerPos.z - LAKE_CENTER.z, playerPos.x - LAKE_CENTER.x);
                const sr = getLakeShoreRadius(standTheta) + 1.08;
                const standX = LAKE_CENTER.x + Math.cos(standTheta) * sr;
                const standZ = LAKE_CENTER.z + Math.sin(standTheta) * sr;
                startWalkTo(standX, standZ, 'idle', undefined, () =>
                  tryLakeShoreCast(standX, standZ),
                );
              }
              return;
            }
            const spotX = data.tx as number;
            const spotZ = data.tz as number;
            startWalkTo(spotX, spotZ, 'idle', undefined, () => {
              if (!isWaterTargetOpenForShadow(-22.5, 46.6, TOWN_LAKE_WATER_Y, 'lake')) {
                showBubble(
                  'Chỗ này bị che bóng, không thấy bóng cá! Hãy di chuyển đến nơi thoáng hơn.',
                  spotX,
                  2.25,
                  spotZ,
                );
                return;
              }
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
              soundFX.sparkle();
              callbacksRef.current.onOpenArcadeGame('catch_stars');
            });
            return;
          }

          if (kind === 'arcade_claw') {
            soundFX.tap();
            startWalkTo(data.tx as number, data.tz as number, 'idle', undefined, () => {
              soundFX.sparkle();
              callbacksRef.current.onOpenArcadeGame('claw_ball');
            });
            return;
          }

          if (kind === 'arcade_whack_mole') {
            soundFX.tap();
            startWalkTo(data.tx as number, data.tz as number, 'idle', undefined, () => {
              soundFX.sparkle();
              callbacksRef.current.onOpenArcadeGame('whack_mole');
            });
            return;
          }

          if (kind === 'arcade_coingame_shop') {
            soundFX.tap();
            startWalkTo(data.tx as number, data.tz as number, 'idle', undefined, () => {
              soundFX.sparkle();
              callbacksRef.current.onOpenCoinGameShop();
            });
            return;
          }

          if (kind === 'arcade_blindbox_hddoll') {
            soundFX.tap();
            startWalkTo(data.tx as number, data.tz as number, 'idle', undefined, () => {
              soundFX.sparkle();
              callbacksRef.current.onOpenArcadeHub?.('blindbox');
            });
            return;
          }

          if (kind === 'npc_anna') {
            soundFX.tap();
            if (boatState.active) {
              disembarkBoat(false);
            }
            if (stateRef.current.zone === 'town' && mallElev.state === 'deck') {
              showBubble('Hãy xuống khỏi sân thượng May Mall để gặp Anna!');
              return;
            }
            startWalkTo(data.tx as number, data.tz as number, 'idle', undefined, () => {
              const ax = typeof data.annaX === 'number' ? data.annaX : -3.25;
              const az = typeof data.annaZ === 'number' ? data.annaZ : 3.7;
              playerPos.rotY = Math.atan2(ax - playerPos.x, az - playerPos.z);
              soundFX.sparkle();
              callbacksRef.current.onStartAnnaTour();
            });
            return;
          }

          if (
            kind === 'doll_display' ||
            kind === 'aquarium_display' ||
            kind === 'insect_display'
          ) {
            soundFX.tap();
            const furnId = data.furnitureId as string;
            startWalkTo(data.tx as number, data.tz as number, 'idle', undefined, () => {
              soundFX.sparkle();
              callbacksRef.current.onOpenFurnitureDisplay(furnId);
            });
            return;
          }

          if (kind === 'arcade_pc_station') {
            soundFX.tap();
            startWalkTo(
              data.tx as number,
              data.tz as number,
              'sit',
              {
                seatX: data.seatX as number,
                seatZ: data.seatZ as number,
                seatY: data.seatY as number,
                rotY: data.sitRotY as number,
                standX: data.tx as number,
                standZ: data.tz as number,
              },
              () => {
                soundFX.sparkle();
                callbacksRef.current.onOpenArcadeGame('pc_games');
              },
            );
            return;
          }

          if (kind === 'arcade_dance_pad') {
            soundFX.tap();
            startWalkTo(data.tx as number, data.tz as number, 'idle', undefined, () => {
              soundFX.sparkle();
              callbacksRef.current.onBoostMood();
              callbacksRef.current.onOpenArcadeGame('rhythm_dance');
            });
            return;
          }

          if (kind === 'arcade_racing_pod') {
            soundFX.tap();
            startWalkTo(data.tx as number, data.tz as number, 'idle', undefined, () => {
              soundFX.sparkle();
              callbacksRef.current.onBoostMood();
              callbacksRef.current.onOpenArcadeHub?.('games');
            });
            return;
          }

          if (kind === 'arcade_parkour') {
            soundFX.tap();
            startWalkTo(data.tx as number, data.tz as number, 'idle', undefined, () => {
              soundFX.sparkle();
              callbacksRef.current.onBoostMood();
              callbacksRef.current.onOpenArcadeGame('parkour_climb');
            });
            return;
          }

          if (kind === 'arcade_obstacle') {
            soundFX.tap();
            startWalkTo(data.tx as number, data.tz as number, 'idle', undefined, () => {
              soundFX.sparkle();
              callbacksRef.current.onBoostMood();
              callbacksRef.current.onOpenArcadeGame('obstacle_rush');
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

          const activeOrder = stateRef.current.joyboyDelivery.activeOrder;
          const resolveDeliveryTarget = (): JoyboyTargetNpcId | null => {
            if (kind === 'koi_shop') return 'koi';
            if (kind === 'ship_shop' && !boatState.active) return 'ship';
            if (kind === 'open_shop') return 'tina';
            if (kind === 'open_furniture_shop') return 'bob';
            if (kind === 'ivan_npc') return 'ivan';
            if (
              (kind === 'npc_tun' ||
                kind === 'mall_display_bike' ||
                kind === 'mall_display_skate') &&
              !(stateRef.current.zone === 'mall' && mallState.floor === 2)
            ) {
              return 'tun';
            }
            if (
              (kind === 'npc_peppa' || kind === 'mall_market_stall') &&
              !(stateRef.current.zone === 'mall' && mallState.floor === 2)
            ) {
              return 'peppa';
            }
            if (
              kind === 'mall_cafe_counter' &&
              !(stateRef.current.zone === 'mall' && mallState.floor === 2)
            ) {
              return 'cafe';
            }
            return null;
          };

          const matchedDeliveryNpc = resolveDeliveryTarget();
          if (activeOrder && matchedDeliveryNpc === activeOrder.targetNpcId) {
            soundFX.tap();
            const txDeliv = typeof data.tx === 'number' ? data.tx : playerPos.x;
            const tzDeliv = typeof data.tz === 'number' ? data.tz : playerPos.z;
            startWalkTo(txDeliv, tzDeliv, 'idle', undefined, () => {
              const res = callbacksRef.current.onCompleteJoyboyDelivery();
              if (res.ok) {
                soundFX.sparkle();
              } else {
                soundFX.tap();
              }
              if (res.message) {
                showBubble(res.message);
              }
            });
            return;
          }

          if (kind === 'npc_joyboy') {
            soundFX.tap();
            if (boatState.active) {
              disembarkBoat(false);
            }
            if (stateRef.current.zone === 'town' && mallElev.state === 'deck') {
              showBubble('Hãy xuống khỏi sân thượng May Mall để gặp Joyboy!');
              return;
            }
            const jPos = activeTown?.getJoyboyPosition?.() ?? {x: 3.3, z: 3.8};
            const dxJ = playerPos.x - jPos.x;
            const dzJ = playerPos.z - jPos.z;
            const dLen = Math.hypot(dxJ, dzJ);
            const standDist = 1.45;
            const rawStandX = dLen > 0.05 ? jPos.x + (dxJ / dLen) * standDist : jPos.x;
            const rawStandZ = dLen > 0.05 ? jPos.z + (dzJ / dLen) * standDist : jPos.z + standDist;
            const tb = getZoneWalkBounds('town');
            const standX = THREE.MathUtils.clamp(rawStandX, tb.minX + 1, tb.maxX - 1);
            const standZ = THREE.MathUtils.clamp(rawStandZ, tb.minZ + 1, tb.maxZ - 1);
            joyboyApproachRef.current = true;
            activeTown?.setJoyboyPaused?.(true);
            startWalkTo(standX, standZ, 'idle', undefined, () => {
              joyboyApproachRef.current = false;
              const liveJ = activeTown?.getJoyboyPosition?.() ?? jPos;
              playerPos.rotY = Math.atan2(liveJ.x - playerPos.x, liveJ.z - playerPos.z);
              soundFX.sparkle();
              callbacksRef.current.onOpenJoyboyModal();
            });
            return;
          }

          if (kind === 'open_farm_decor_shop') {
            soundFX.sparkle();
            callbacksRef.current.onOpenFarmDecorShop();
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

          if (kind === 'ship_shop') {
            soundFX.tap();
            if (boatState.active) {
              disembarkBoat(false);
            }
            startWalkTo(data.tx as number, data.tz as number, 'idle', undefined, () => {
              soundFX.sparkle();
              callbacksRef.current.onOpenShipShop();
            });
            return;
          }

          if (kind === 'campsite_bbq') {
            soundFX.tap();
            const walkToBbq = () =>
              startWalkTo(data.tx as number, data.tz as number, 'idle', undefined, () => {
                soundFX.sparkle();
                callbacksRef.current.onOpenBbqGrill();
              });
            if (stateRef.current.zone === 'island') {
              ensureOnIslandGroundThen(walkToBbq);
            } else {
              walkToBbq();
            }
            return;
          }

          if (kind === 'mall_vending_machine') {
            if (stateRef.current.zone === 'town' && mallElev.state === 'deck') return;
            soundFX.tap();
            startWalkTo(data.tx as number, data.tz as number, 'idle', undefined, () => {
              soundFX.sparkle();
              callbacksRef.current.onOpenVendingMachine();
            });
            return;
          }

          if (kind === 'river_boat_board') {
            soundFX.tap();
            if (boatState.active) {
              disembarkBoat(true);
              return;
            }
            const embarkNow = () => {
              if (stateRef.current.boats.ownedIds.length === 0) {
                soundFX.tap();
                showBubble(
                  `Bạn chưa có thuyền (từ ${BOAT_CATALOG.wooden_boat.price} Xu)! Ghé Sạp Thuyền của Ship ngay bên cạnh để chọn nhiều mẫu thuyền đẹp nhé.`,
                );
                return;
              }
              releaseSeatIfNeeded();
              activeTarget = null;
              jumpY = 0;
              jumpVel = 0;
              playPetTimer = 0;
              if (fishCtrl.phase !== 'idle') {
                resetFishing(false);
              }
              const sp = clampRiverBoatPoint(RIVER_BOAT_SPAWN.x, RIVER_BOAT_SPAWN.z);
              const curBoatId = stateRef.current.boats.activeBoatId;
              const curBoatName = BOAT_CATALOG[curBoatId]?.name ?? 'Thuyền';
              boatState.active = true;
              boatState.x = sp.x;
              boatState.z = sp.z;
              boatState.rotY = RIVER_BOAT_SPAWN.rotY;
              boatState.targetX = null;
              boatState.targetZ = null;
              boatState.moving = false;
              isBoatingRef.current = true;
              callbacksRef.current.onDismountMount();
              activeTown?.setRiverBoatPose?.(
                true,
                boatState.x,
                boatState.z,
                boatState.rotY,
                false,
                0,
                curBoatId,
              );
              setIsBoatingHud(true);
              soundFX.splash();
              showBubble(
                `Đã xuống ${curBoatName}! Kéo Joystick hoặc chạm mặt nước để chèo, cầm Cần Câu chạm nước để câu cá sông!`,
              );
            };
            const distBoard = Math.hypot(
              playerPos.x - RIVER_BOARD_INTERACT.tx,
              playerPos.z - RIVER_BOARD_INTERACT.tz,
            );
            if (distBoard < 2.2) {
              embarkNow();
            } else {
              startWalkTo(
                RIVER_BOARD_INTERACT.tx,
                RIVER_BOARD_INTERACT.tz,
                'idle',
                undefined,
                embarkNow,
              );
            }
            return;
          }

          if (kind === 'river_water') {
            if (fishCtrl.phase === 'waiting' || fishCtrl.phase === 'nibbling') {
              handleSpotFishing(
                boatState.active ? boatState.x : playerPos.x,
                boatState.active ? boatState.z : playerPos.z,
                fishCtrl.facingRotY,
              );
              return;
            }
            if (!boatState.active) {
              soundFX.tap();
              if (fishCtrl.phase !== 'idle') return;
              if (stateRef.current.fishingRod.equipped) {
                const hitPt = hits[0].point;
                const tryRiverShoreCast = (spotX: number, spotZ: number) => {
                  const rodNow = stateRef.current.fishingRod;
                  if (rodNow.durability <= 0) {
                    setBrokenRodPrompt({
                      repairCost: getRodRepairCost(rodNow.durability, rodNow.maxDurability),
                      maxDurability: rodNow.maxDurability,
                    });
                    return;
                  }
                  const cxSpot = getWestRiverCenterX(spotZ);
                  const dxW = hitPt.x - spotX;
                  const dzW = hitPt.z - spotZ;
                  const rawD = Math.hypot(dxW, dzW);
                  const dirX = rawD > 0.05 ? dxW / rawD : spotX >= cxSpot ? -1 : 1;
                  const dirZ = rawD > 0.05 ? dzW / rawD : 0;
                  const castDist = THREE.MathUtils.clamp(rawD, 2.8, 4.8);
                  const tz = THREE.MathUtils.clamp(
                    spotZ + dirZ * castDist,
                    WEST_RIVER_NAV_MIN_Z + 1.2,
                    WEST_RIVER_NAV_MAX_Z - 1.2,
                  );
                  const tx = spotX + dirX * castDist;
                  if (!isWaterTargetOpenForShadow(tx, tz, RIVER_WATER_Y, 'river')) {
                    soundFX.tap();
                    showBubble(
                      'Chỗ này bị che bóng, không thấy bóng cá! Hãy di chuyển đến nơi thoáng hơn.',
                      spotX,
                      2.25,
                      spotZ,
                    );
                    return;
                  }
                  const castRotY = Math.atan2(tx - spotX, tz - spotZ);
                  handleSpotFishing(spotX, spotZ, castRotY, {
                    targetX: tx,
                    targetZ: tz,
                    waterY: RIVER_WATER_Y,
                  });
                };

                const distToHit = Math.hypot(playerPos.x - hitPt.x, playerPos.z - hitPt.z);
                const playerGy = getTownGroundHeight(playerPos.x, playerPos.z, currentPlazaRadius);
                if (distToHit <= 5.6 && playerGy < 2.6) {
                  tryRiverShoreCast(playerPos.x, playerPos.z);
                } else {
                  const standZ = THREE.MathUtils.clamp(
                    hitPt.z,
                    WEST_RIVER_NAV_MIN_Z + 2.0,
                    WEST_RIVER_NAV_MAX_Z - 2.0,
                  );
                  const cxStand = getWestRiverCenterX(standZ);
                  const hwStand = getWestRiverHalfWidth(standZ);
                  const useWestBank = playerPos.x < cxStand - 0.5 && standZ >= 12.5;
                  const standX = useWestBank
                    ? cxStand - hwStand - 1.65
                    : cxStand + hwStand + 1.65;
                  startWalkTo(standX, standZ, 'idle', undefined, () =>
                    tryRiverShoreCast(standX, standZ),
                  );
                }
                return;
              }
              showBubble(
                stateRef.current.boats.ownedIds.length > 0
                  ? 'Chạm Biển hiệu Xuống Thuyền hoặc chiếc thuyền neo để xuống sông! (Hoặc cầm Cần Câu để câu từ bờ)'
                  : stateRef.current.fishingRod.owned
                    ? `Mở Túi Đồ cầm Cần Câu để câu từ bờ, hoặc ghé Sạp Ship (${BOAT_CATALOG.wooden_boat.price}–${BOAT_CATALOG.speedboat_retro.price} Xu) mua Thuyền!`
                    : `Ghé Sạp Ship (${BOAT_CATALOG.wooden_boat.price}–${BOAT_CATALOG.speedboat_retro.price} Xu) mua Thuyền, hoặc mua Cần Câu ở Sạp Koi để câu từ bờ!`,
              );
              return;
            }
            if (fishCtrl.phase !== 'idle') return;
            if (stateRef.current.fishingRod.equipped) {
              const rodNow = stateRef.current.fishingRod;
              if (rodNow.durability <= 0) {
                soundFX.tap();
                setBrokenRodPrompt({
                  repairCost: getRodRepairCost(rodNow.durability, rodNow.maxDurability),
                  maxDurability: rodNow.maxDurability,
                });
                return;
              }
              const hitPt = hits[0].point;
              const dxW = hitPt.x - boatState.x;
              const dzW = hitPt.z - boatState.z;
              const rawDist = Math.hypot(dxW, dzW);
              const castDist = THREE.MathUtils.clamp(rawDist, 2.8, 4.8);
              const dirX = rawDist > 0.05 ? dxW / rawDist : Math.sin(boatState.rotY);
              const dirZ = rawDist > 0.05 ? dzW / rawDist : Math.cos(boatState.rotY);
              const tz = THREE.MathUtils.clamp(
                boatState.z + dirZ * castDist,
                WEST_RIVER_NAV_MIN_Z + 1.2,
                WEST_RIVER_NAV_MAX_Z - 1.2,
              );
              const bRiver = getWestRiverNavBounds(tz);
              const tx = THREE.MathUtils.clamp(
                boatState.x + dirX * castDist,
                bRiver.minX - 0.6,
                bRiver.maxX + 0.6,
              );
              boatState.targetX = null;
              boatState.targetZ = null;
              boatState.moving = false;
              if (!isWaterTargetOpenForShadow(tx, tz, RIVER_WATER_Y, 'river')) {
                soundFX.tap();
                showBubble(
                  'Chỗ này bị che bóng, không thấy bóng cá! Hãy chèo thuyền đến nơi thoáng hơn.',
                  boatState.x,
                  2.25,
                  boatState.z,
                );
                return;
              }
              const castRotY = Math.atan2(tx - boatState.x, tz - boatState.z);
              handleSpotFishing(boatState.x, boatState.z, castRotY, {
                targetX: tx,
                targetZ: tz,
                waterY: RIVER_WATER_Y,
                castOriginY: RIVER_WATER_Y + 1.78,
              });
              return;
            }
            const dest = clampRiverBoatPoint(hits[0].point.x, hits[0].point.z);
            boatState.targetX = dest.x;
            boatState.targetZ = dest.z;
            soundFX.tap();
            return;
          }

          if (boatState.active) {
            const curBoatName = BOAT_CATALOG[stateRef.current.boats.activeBoatId]?.name ?? 'Thuyền';
            soundFX.tap();
            showBubble(`Đang trên ${curBoatName}! Chạm bờ hoặc bến gỗ để lên bờ.`);
            return;
          }

          if (kind === 'mall_entrance') {
            soundFX.tap();
            if (stateRef.current.zone === 'town' && mallElev.state === 'deck') {
              showBubble('Bạn đang ở trên Sân Thượng May Mall! Bấm thang máy kính để xuống tầng trệt.');
              return;
            }
            startWalkTo(data.tx as number, data.tz as number, 'idle', undefined, () => {
              soundFX.enterDoor();
              callbacksRef.current.onChangeZone('mall');
            });
            return;
          }

          if (kind === 'mall_escalator') {
            soundFX.tap();
            if (stateRef.current.zone !== 'mall' || mallState.ridingLane) return;
            const lane = MALL_ESCALATOR_LANES.find((l) => l.id === data.laneId);
            if (!lane) return;
            if (mallState.floor !== lane.startFloor) {
              showBubble(
                lane.dir === 'up'
                  ? 'Thang cuốn này cố định đi LÊN từ Tầng 1! Hãy chọn thang đi XUỐNG bên cạnh nhé.'
                  : 'Thang cuốn này cố định đi XUỐNG từ Tầng 2! Hãy chọn thang đi LÊN bên cạnh nhé.',
              );
              return;
            }
            startWalkTo(lane.approachX, lane.approachZ, 'idle', undefined, () => {
              if (mallState.ridingLane || mallState.floor !== lane.startFloor) return;
              callbacksRef.current.onDismountMount();
              soundFX.tap();
              mallState.ridingLane = lane;
              mallState.progress = 0;
              activeTarget = null;
              activeSeat = null;
              jumpY = 0;
              jumpVel = 0;
            });
            return;
          }

          if (kind === 'npc_tun') {
            soundFX.tap();
            if (stateRef.current.zone === 'mall' && mallState.floor === 2) {
              showBubble('Hãy xuống thang cuốn về Tầng 1 để gặp Tun mua Ván Trượt & Xe Đạp nhé!');
              return;
            }
            startWalkTo(data.tx as number, data.tz as number, 'idle', undefined, () => {
              soundFX.sparkle();
              playerPos.rotY = Math.atan2(-2.65 - playerPos.x, 0.95 - playerPos.z);
              callbacksRef.current.onOpenTunShop();
            });
            return;
          }

          if (kind === 'mall_display_car') {
            soundFX.tap();
            if (stateRef.current.zone === 'mall' && mallState.floor === 2) return;
            startWalkTo(data.tx as number, data.tz as number, 'idle', undefined, () => {
              soundFX.sparkle();
              showBubble(
                'Siêu xe mini tương lai Hạng S siêu tốc — sắp mở bán tại Kumo Motors May Mall!',
              );
            });
            return;
          }

          if (kind === 'mall_display_bike') {
            soundFX.tap();
            if (stateRef.current.zone === 'mall' && mallState.floor === 2) return;
            startWalkTo(data.tx as number, data.tz as number, 'idle', undefined, () => {
              soundFX.sparkle();
              callbacksRef.current.onOpenTunShop();
            });
            return;
          }

          if (kind === 'mall_display_skate') {
            soundFX.tap();
            if (stateRef.current.zone === 'mall' && mallState.floor === 2) return;
            startWalkTo(data.tx as number, data.tz as number, 'idle', undefined, () => {
              soundFX.sparkle();
              callbacksRef.current.onOpenTunShop();
            });
            return;
          }

          if (kind === 'mall_cafe_counter') {
            soundFX.tap();
            if (stateRef.current.zone === 'mall' && mallState.floor === 2) {
              showBubble('Hãy xuống thang cuốn về Tầng 1 để ghé Quán Cà Phê Mây nhé!');
              return;
            }
            startWalkTo(data.tx as number, data.tz as number, 'idle', undefined, () => {
              soundFX.sparkle();
              playerPos.rotY = Math.atan2(-23.2 - playerPos.x, 21.35 - playerPos.z);
              callbacksRef.current.onOpenCafeShop();
            });
            return;
          }

          if (kind === 'npc_peppa' || kind === 'mall_market_stall') {
            soundFX.tap();
            if (stateRef.current.zone === 'mall' && mallState.floor === 2) {
              showBubble('Hãy xuống thang cuốn về Tầng 1 để ghé Siêu Thị Mini của Peppa nhé!');
              return;
            }
            startWalkTo(data.tx as number, data.tz as number, 'idle', undefined, () => {
              soundFX.sparkle();
              playerPos.rotY = Math.atan2(24.0 - playerPos.x, 19.35 - playerPos.z);
              callbacksRef.current.onOpenPeppaShop();
            });
            return;
          }

          if (kind === 'mall_cartoon_gallery') {
            soundFX.tap();
            if (stateRef.current.zone === 'mall' && mallState.floor === 2) return;
            startWalkTo(data.tx as number, data.tz as number, 'idle', undefined, () => {
              soundFX.sparkle();
              showBubble(
                'Khu Nội Thất Cartoon & Mascot Gấu Trắng Ôm Sao — tha hồ check-in cực xinh!',
              );
            });
            return;
          }

          if (kind === 'mall_swing') {
            soundFX.tap();
            if (stateRef.current.zone === 'mall' && mallState.floor === 2) {
              showBubble('Hãy xuống thang cuốn về Tầng 1 để chơi Xích Đu Cầu Vồng nhé!');
              return;
            }
            if (mallSlideCtrl.active) return;
            startWalkTo(
              data.tx as number,
              data.tz as number,
              'sit',
              {
                seatX: data.seatX as number,
                seatZ: data.seatZ as number,
                seatY: data.seatY as number,
                rotY: data.sitRotY as number,
                standX: data.tx as number,
                standZ: data.tz as number,
                isMallSwing: true,
              },
              () => {
                callbacksRef.current.onBoostMood();
                showBubble('Đu đưa trên Xích Đu Cầu Vồng Pastel! (+Vui vẻ)');
              },
            );
            return;
          }

          if (kind === 'mall_seesaw') {
            soundFX.tap();
            if (stateRef.current.zone === 'mall' && mallState.floor === 2) {
              showBubble('Hãy xuống thang cuốn về Tầng 1 để chơi Bập Bênh Đám Mây nhé!');
              return;
            }
            if (mallSlideCtrl.active) return;
            const side = (data.side as -1 | 1) ?? -1;
            startWalkTo(
              data.tx as number,
              data.tz as number,
              'sit',
              {
                seatX: data.seatX as number,
                seatZ: data.seatZ as number,
                seatY: data.seatY as number,
                rotY: data.sitRotY as number,
                standX: data.tx as number,
                standZ: data.tz as number,
                mallSeesawSide: side,
              },
              () => {
                callbacksRef.current.onBoostMood();
                showBubble('Nhún nhịp nhàng trên Bập Bênh Đám Mây! (+Vui vẻ)');
              },
            );
            return;
          }

          if (kind === 'mall_slide') {
            soundFX.tap();
            if (stateRef.current.zone === 'mall' && mallState.floor === 2) {
              showBubble('Hãy xuống thang cuốn về Tầng 1 để chơi Cầu Tuột Mây Hồng nhé!');
              return;
            }
            if (mallSlideCtrl.active) return;
            startWalkTo(data.tx as number, data.tz as number, 'idle', undefined, () => {
              callbacksRef.current.onDismountMount();
              soundFX.tap();
              mallSlideCtrl.active = true;
              mallSlideCtrl.elapsed = 0;
              mallSlideCtrl.y = 0.04;
              activeTarget = null;
              activeSeat = null;
              jumpY = 0;
              jumpVel = 0;
            });
            return;
          }

          if (kind === 'mall_arcade') {
            soundFX.tap();
            if (stateRef.current.zone === 'mall' && mallState.floor === 2) return;
            startWalkTo(data.tx as number, data.tz as number, 'idle', undefined, () => {
              soundFX.sparkle();
              callbacksRef.current.onBoostMood();
              showBubble(
                'Khu Vui Chơi Mây Mall — thử ngay Xích Đu Cầu Vồng, Bập Bênh Đám Mây & Cầu Tuột Mây Hồng nhé! (+Vui vẻ)',
              );
            });
            return;
          }

          if (kind === 'mall_directory') {
            soundFX.tap();
            if (stateRef.current.zone === 'mall' && mallState.floor === 2) return;
            startWalkTo(data.tx as number, data.tz as number, 'idle', undefined, () => {
              soundFX.sparkle();
              showBubble(
                'Tầng 1: Quán Cà Phê Mây (Tây Nam) · Bistro & Chợ Tươi (Đông Nam) · Cartoon Decor (Tây Bắc) · Khu Vui Chơi (Đông Bắc) · Kumo Motors (Trung tâm).',
              );
            });
            return;
          }

          if (kind === 'mall_elevator') {
            soundFX.tap();
            startMallElevatorRide();
            return;
          }

          if (kind === 'mall_parachute') {
            soundFX.tap();
            if (stateRef.current.zone === 'town' && mallElev.state === 'deck') {
              const dist = Math.hypot(
                playerPos.x - (data.tx as number),
                playerPos.z - (data.tz as number),
              );
              if (dist < 0.85) {
                setParachuteConfirmOpen(true);
              } else {
                startWalkTo(data.tx as number, data.tz as number, 'idle', undefined, () => {
                  setParachuteConfirmOpen(true);
                });
              }
            }
            return;
          }

          if (kind === 'balloon_to_island') {
            soundFX.tap();
            startWalkTo(data.tx as number, data.tz as number, 'idle', undefined, () => {
              goToIslandActionRef.current?.();
            });
            return;
          }

          if (kind === 'balloon_to_town') {
            soundFX.tap();
            if (boatState.active) {
              disembarkBoat(false);
            }
            if (swimState.active) {
              exitIslandSwim(false);
            }
            ensureOnIslandGroundThen(() =>
              startWalkTo(data.tx as number, data.tz as number, 'idle', undefined, () => {
                goToTownFromIslandActionRef.current?.();
              }),
            );
            return;
          }

          if (kind === 'island_boat_board') {
            soundFX.tap();
            if (boatState.active) {
              disembarkBoat(true);
              return;
            }
            const embarkIslandNow = () => {
              if (swimState.active) {
                swimState.active = false;
                swimState.targetX = null;
                swimState.targetZ = null;
                swimState.moving = false;
                setIsSwimmingHud(false);
              }
              releaseSeatIfNeeded();
              activeTarget = null;
              jumpY = 0;
              jumpVel = 0;
              playPetTimer = 0;
              if (fishCtrl.phase !== 'idle') {
                resetFishing(false);
              }
              const curBoatId = stateRef.current.boats.activeBoatId;
              const curBoatName = BOAT_CATALOG[curBoatId]?.name ?? 'Thuyền';
              const sp = clampIslandBoatPoint(ISLAND_BOAT_SPAWN.x, ISLAND_BOAT_SPAWN.z);
              boatState.active = true;
              boatState.x = sp.x;
              boatState.z = sp.z;
              boatState.rotY = ISLAND_BOAT_SPAWN.rotY;
              boatState.targetX = null;
              boatState.targetZ = null;
              boatState.moving = false;
              isBoatingRef.current = true;
              callbacksRef.current.onDismountMount();
              activeSubzone?.setIslandBoatPose?.(
                true,
                boatState.x,
                boatState.z,
                boatState.rotY,
                false,
                0,
                curBoatId,
              );
              setIsBoatingHud(true);
              soundFX.splash();
              showBubble(
                `Đã xuống ${curBoatName}! Kéo Joystick hoặc chạm mặt biển để chèo, cầm Cần Câu để câu cá biển!`,
              );
            };
            if (swimState.active) {
              embarkIslandNow();
              return;
            }
            const txBoard = (data.tx as number) ?? ISLAND_BOAT_INTERACT.tx;
            const tzBoard = (data.tz as number) ?? ISLAND_BOAT_INTERACT.tz;
            const distBoard = Math.hypot(playerPos.x - txBoard, playerPos.z - tzBoard);
            if (distBoard < 2.4 && !treehouseState.onTreehouse) {
              embarkIslandNow();
            } else {
              ensureOnIslandGroundThen(() =>
                startWalkTo(txBoard, tzBoard, 'idle', undefined, embarkIslandNow),
              );
            }
            return;
          }

          if (
            kind === 'island_pier_swim' ||
            kind === 'island_swim_float' ||
            kind === 'island_duck_float_swim'
          ) {
            soundFX.tap();
            if (boatState.active) {
              disembarkBoat(false);
            }
            if (swimState.active) {
              exitIslandSwim(true);
            } else {
              ensureOnIslandGroundThen(() =>
                startWalkTo(
                  (data.tx as number) ?? ISLAND_PIER_DUCK_INTERACT.tx,
                  (data.tz as number) ?? ISLAND_PIER_DUCK_INTERACT.tz,
                  'idle',
                  undefined,
                  () => {
                    enterIslandSwim(-2.35, 33.6);
                  },
                ),
              );
            }
            return;
          }

          if (kind === 'island_sea_water') {
            if (fishCtrl.phase === 'waiting' || fishCtrl.phase === 'nibbling') {
              handleSpotFishing(
                boatState.active ? boatState.x : playerPos.x,
                boatState.active ? boatState.z : playerPos.z,
                fishCtrl.facingRotY,
              );
              return;
            }
            const hitPt = hits[0].point;
            if (swimState.active) {
              soundFX.tap();
              const clamped = clampSwimOceanPoint(hitPt.x, hitPt.z);
              if (clamped.hitLimit) {
                showBubble('Đã tới giới hạn vùng bơi an toàn!');
              }
              swimState.targetX = clamped.x;
              swimState.targetZ = clamped.z;
              return;
            }
            if (boatState.active) {
              if (fishCtrl.phase !== 'idle') return;
              if (stateRef.current.fishingRod.equipped) {
                const rodNow = stateRef.current.fishingRod;
                if (rodNow.durability <= 0) {
                  soundFX.tap();
                  setBrokenRodPrompt({
                    repairCost: getRodRepairCost(rodNow.durability, rodNow.maxDurability),
                    maxDurability: rodNow.maxDurability,
                  });
                  return;
                }
                const dxW = hitPt.x - boatState.x;
                const dzW = hitPt.z - boatState.z;
                const rawDist = Math.hypot(dxW, dzW);
                const dirX = rawDist > 0.05 ? dxW / rawDist : Math.sin(boatState.rotY);
                const dirZ = rawDist > 0.05 ? dzW / rawDist : Math.cos(boatState.rotY);
                const preferred = THREE.MathUtils.clamp(rawDist, 2.9, 5.4);
                let tx = boatState.x + dirX * preferred;
                let tz = boatState.z + dirZ * preferred;
                let foundOpen = isWaterTargetOpenForShadow(tx, tz, ISLAND_WATER_Y, 'sea');
                if (!foundOpen) {
                  const fallbackDists = [3.6, 4.6, 5.6, 6.4];
                  for (let fi = 0; fi < fallbackDists.length; fi++) {
                    const cx = boatState.x + dirX * fallbackDists[fi];
                    const cz = boatState.z + dirZ * fallbackDists[fi];
                    if (isWaterTargetOpenForShadow(cx, cz, ISLAND_WATER_Y, 'sea')) {
                      tx = cx;
                      tz = cz;
                      foundOpen = true;
                      break;
                    }
                  }
                }
                boatState.targetX = null;
                boatState.targetZ = null;
                boatState.moving = false;
                if (!foundOpen) {
                  soundFX.tap();
                  showBubble(
                    'Chỗ này không hiện bóng cá! Hãy chèo thuyền ra vùng biển thoáng hơn.',
                    boatState.x,
                    2.2,
                    boatState.z,
                  );
                  return;
                }
                const castRotY = Math.atan2(tx - boatState.x, tz - boatState.z);
                handleSpotFishing(boatState.x, boatState.z, castRotY, {
                  targetX: tx,
                  targetZ: tz,
                  waterY: ISLAND_WATER_Y,
                  castOriginY: ISLAND_WATER_Y + 1.78,
                });
                return;
              }
              const dest = clampIslandBoatPoint(hitPt.x, hitPt.z);
              boatState.targetX = dest.x;
              boatState.targetZ = dest.z;
              soundFX.tap();
              return;
            }
            soundFX.tap();
            if (stateRef.current.fishingRod.equipped) {
              if (fishCtrl.phase !== 'idle') return;
              const trySeaBeachCast = (spotX: number, spotZ: number) => {
                const rodNow = stateRef.current.fishingRod;
                if (rodNow.durability <= 0) {
                  setBrokenRodPrompt({
                    repairCost: getRodRepairCost(rodNow.durability, rodNow.maxDurability),
                    maxDurability: rodNow.maxDurability,
                  });
                  return;
                }
                const dxW = hitPt.x - spotX;
                const dzW = hitPt.z - spotZ;
                const rawD = Math.hypot(dxW, dzW);
                const dirX =
                  rawD > 0.05 ? dxW / rawD : (spotX || 0) / (Math.hypot(spotX, spotZ) || 1);
                const dirZ =
                  rawD > 0.05 ? dzW / rawD : (spotZ || 1) / (Math.hypot(spotX, spotZ) || 1);
                const preferredDist = THREE.MathUtils.clamp(rawD, 2.8, 5.4);
                let tx = spotX + dirX * preferredDist;
                let tz = spotZ + dirZ * preferredDist;
                let foundOpen = isWaterTargetOpenForShadow(tx, tz, ISLAND_WATER_Y, 'sea');
                if (!foundOpen) {
                  const fallbackDists = [3.6, 4.6, 5.6, 6.4];
                  for (let fi = 0; fi < fallbackDists.length; fi++) {
                    const cx = spotX + dirX * fallbackDists[fi];
                    const cz = spotZ + dirZ * fallbackDists[fi];
                    if (isWaterTargetOpenForShadow(cx, cz, ISLAND_WATER_Y, 'sea')) {
                      tx = cx;
                      tz = cz;
                      foundOpen = true;
                      break;
                    }
                  }
                }
                if (!foundOpen) {
                  soundFX.tap();
                  showBubble(
                    'Hãy đứng sát mép bãi biển hoặc Cầu Cảng hướng ra vùng nước thoáng để quăng phao!',
                    spotX,
                    2.2,
                    spotZ,
                  );
                  return;
                }
                const castRotY = Math.atan2(tx - spotX, tz - spotZ);
                handleSpotFishing(spotX, spotZ, castRotY, {
                  targetX: tx,
                  targetZ: tz,
                  waterY: ISLAND_WATER_Y,
                });
              };

              const distToHit = Math.hypot(playerPos.x - hitPt.x, playerPos.z - hitPt.z);
              if (
                distToHit <= 7.2 &&
                (isPointOnIslandPier(playerPos.x, playerPos.z) ||
                  getIslandBaseTerrainY(playerPos.x, playerPos.z) <= 0.72)
              ) {
                trySeaBeachCast(playerPos.x, playerPos.z);
              } else {
                const ang = Math.atan2(hitPt.z, hitPt.x);
                let standX = Math.cos(ang) * 23.0;
                let standZ = Math.sin(ang) * 23.0;
                for (let rt = 19.0; rt <= 29.0; rt += 0.35) {
                  const tx = Math.cos(ang) * rt;
                  const tz = Math.sin(ang) * rt;
                  if (getIslandBaseTerrainY(tx, tz) <= ISLAND_WATER_Y + 0.12) {
                    standX = Math.cos(ang) * Math.max(19.0, rt - 0.55);
                    standZ = Math.sin(ang) * Math.max(19.0, rt - 0.55);
                    break;
                  }
                }
                ensureOnIslandGroundThen(() =>
                  startWalkTo(standX, standZ, 'idle', undefined, () =>
                    trySeaBeachCast(standX, standZ),
                  ),
                );
              }
              return;
            }
            showBubble(
              'Chạm Phao Bơi để bơi tự do, chạm Thuyền Gỗ để chèo thuyền, hoặc cầm Cần Câu để câu cá biển!',
            );
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
          if (boatState.active) {
            const hitPt = groundHits[0].point;
            const curZoneBoat = stateRef.current.zone;
            const onDryShore =
              curZoneBoat === 'island'
                ? getIslandGroundHeight(hitPt.x, hitPt.z) >= ISLAND_WATER_Y - 0.04
                : getTownGroundHeight(hitPt.x, hitPt.z, currentPlazaRadius) >= RIVER_WATER_Y + 0.02;
            if (!onDryShore) {
              const dest =
                curZoneBoat === 'island'
                  ? clampIslandBoatPoint(hitPt.x, hitPt.z)
                  : clampRiverBoatPoint(hitPt.x, hitPt.z);
              boatState.targetX = dest.x;
              boatState.targetZ = dest.z;
              soundFX.tap();
              return;
            }
            disembarkBoat(false);
          }
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

          if (stateRef.current.zone === 'island' && !swimState.active) {
            const firstHit = groundHits[0];
            if (firstHit.object.userData?.isTreehouseFloor) {
              walkToIslandTreehousePoint(firstHit.point.x, firstHit.point.z, 'idle');
              return;
            }
          }

          const groundHit =
            stateRef.current.zone === 'mall'
              ? groundHits.find((h) => h.object.userData?.mallFloor === mallState.floor)
              : stateRef.current.zone === 'island'
                ? groundHits.find((h) => !h.object.userData?.isTreehouseFloor)
                : groundHits.find((h) => !h.object.userData?.isMallDeck);
          if (!groundHit) return;
          const pt = groundHit.point;
          if (stateRef.current.zone === 'island' && swimState.active) {
            // Swim toward shore or beach point; touching shallow beach automatically exits swim
            const clampedSwim = clampSwimOceanPoint(pt.x, pt.z);
            swimState.targetX = clampedSwim.x;
            swimState.targetZ = clampedSwim.z;
            soundFX.tap();
            return;
          }
          const b = getZoneWalkBounds(stateRef.current.zone);
          let clampedX = THREE.MathUtils.clamp(pt.x, b.minX, b.maxX);
          let clampedZ = THREE.MathUtils.clamp(pt.z, b.minZ, b.maxZ);
          if (stateRef.current.zone === 'island' && getIslandGroundHeight(clampedX, clampedZ) < ISLAND_WATER_Y - 0.08) {
            // Pull underwater clicks gently back onto shallow beach edge
            const rHit = Math.hypot(clampedX, clampedZ) || 1;
            const nx = clampedX / rHit;
            const nz = clampedZ / rHit;
            for (let rt = Math.min(rHit, 32); rt >= 18; rt -= 0.35) {
              const sx = nx * rt;
              const sz = nz * rt;
              if (getIslandGroundHeight(sx, sz) >= ISLAND_WATER_Y - 0.04) {
                clampedX = sx;
                clampedZ = sz;
                break;
              }
            }
          }
          const floorPoint =
            stateRef.current.zone === 'mall'
              ? clampMallFloorPoint(clampedX, clampedZ, mallState.floor)
              : {x: clampedX, z: clampedZ};
          if (stateRef.current.zone === 'island' && treehouseState.onTreehouse) {
            ensureOnIslandGroundThen(() => {
              const safeDown = resolvePointAgainstColliders(
                floorPoint.x,
                floorPoint.z,
                currentColliders.filter((c) => !c.id?.startsWith('island_th_')),
                PLAYER_RADIUS,
                false,
              );
              startWalkTo(safeDown.x, safeDown.z, 'idle');
            });
            return;
          }
          const onBedNow = stateRef.current.zone === 'town' && prevGroundY + jumpY >= 0.86;
          const safeTarget = resolvePointAgainstColliders(
            floorPoint.x,
            floorPoint.z,
            getActiveColliders(stateRef.current.zone),
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
    let hiddenTimerId = 0;
    let disposed = false;
    let lastTagPush = 0;
    let lastHadTags = false;
    let lastTagSnapshot: ProjectedTag[] = [];
    let bbqLabelArmed = true;
    let bbqLabelHideAtMs = 0;
    let biteAlertShown = false;
    let lastBiteAlertX = -9999;
    let lastBiteAlertY = -9999;
    const clock = new THREE.Clock();

    const scheduleNextFrame = () => {
      if (disposed) return;
      if (isSoftwareGl) {
        const gl = renderer.getContext() as WebGL2RenderingContext;
        if (typeof gl.fenceSync === 'function') {
          const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
          if (sync) {
            gl.flush();
            const pollSync = () => {
              if (disposed) {
                try {
                  gl.deleteSync(sync);
                } catch {
                  // ignore
                }
                return;
              }
              const status = gl.clientWaitSync(sync, 0, 0);
              if (status === gl.TIMEOUT_EXPIRED) {
                hiddenTimerId = window.setTimeout(pollSync, 16);
              } else {
                try {
                  gl.deleteSync(sync);
                } catch {
                  // ignore
                }
                hiddenTimerId = window.setTimeout(() => {
                  if (!disposed) frameId = requestAnimationFrame(tick);
                }, 48);
              }
            };
            hiddenTimerId = window.setTimeout(pollSync, 24);
            return;
          }
        }
        hiddenTimerId = window.setTimeout(() => {
          if (!disposed) frameId = requestAnimationFrame(tick);
        }, 80);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    let prevSentX = playerPos.x;
    let prevSentY = 0.14;
    let prevSentZ = playerPos.z;
    let prevSentZone: ZoneId = stateRef.current.zone;

    function tick() {
      if (disposed) return;
      if (document.hidden) {
        clock.getDelta();
        hiddenTimerId = window.setTimeout(() => {
          if (!disposed) frameId = requestAnimationFrame(tick);
        }, 250);
        return;
      }
      const delta = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.getElapsedTime();
      const {zone: z, timeOfDay: tod, avatar: av} = stateRef.current;

      const isIndoor =
        z === 'home' || z === 'boutique' || z === 'arcade' || z === 'petshop' || z === 'mall';
      const isHomeDark = z === 'home' && !houseLightsOnRef.current;
      const isArcade = z === 'arcade';
      const targetBg = isHomeDark
        ? 0x0c1324
        : isArcade
          ? 0x0e1326
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
          (tod === 'night' && !isIndoor) || isHomeDark ? 0.0025 : isArcade ? 0.0014 : 0.0021,
          5,
          delta,
        );
      }
      scene.environmentIntensity = THREE.MathUtils.damp(
        scene.environmentIntensity,
        isHomeDark
          ? 0.08
          : isArcade
            ? 0.36
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
        isHomeDark ? 0.78 : isArcade ? 0.94 : tod === 'night' ? 0.88 : 0.96,
        5,
        delta,
      );
      sunLight.intensity = THREE.MathUtils.damp(
        sunLight.intensity,
        isHomeDark
          ? 0.2
          : isArcade
            ? 0.88
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
          : isArcade
            ? '#E6F0FF'
            : tod === 'night'
              ? isIndoor
                ? '#CBD8F5'
                : '#BFD6FF'
              : '#FFF2D8',
      );
      sunLight.color.lerp(_sunColorTarget, 0.08);
      hemiLight.intensity = THREE.MathUtils.damp(
        hemiLight.intensity,
        isHomeDark ? 0.16 : isArcade ? 0.52 : tod === 'night' ? 0.38 : 0.58,
        5,
        delta,
      );
      _hemiSkyTarget.set(
        isHomeDark
          ? '#3F568D'
          : isArcade
            ? '#9BC4FF'
            : tod === 'night'
              ? isIndoor
                ? '#7A90BF'
                : '#5478B8'
              : '#DCEFFF',
      );
      _hemiGroundTarget.set(
        isHomeDark
          ? '#1E2334'
          : isArcade
            ? '#232B4D'
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
        isHomeDark ? 0.14 : isArcade ? 0.44 : tod === 'night' ? 0.26 : 0.42,
        5,
        delta,
      );
      _rimColorTarget.set(
        isHomeDark || tod === 'night' ? '#87B0F0' : '#A8D2FF',
      );
      rimLight.color.lerp(_rimColorTarget, 0.08);

      const activeTour = stateRef.current.tourCameraTarget;
      const isTourControlling = Boolean(activeTour && activeTour.zone === z);
      if (isTourControlling && activeTour) {
        const isPlazaStop = z === 'town' && activeTour.annaPos[2] < 10;
        tourAnnaRig.root.visible = !isPlazaStop;
        if (!isPlazaStop) {
          tourAnnaRig.root.position.set(
            activeTour.annaPos[0],
            activeTour.annaPos[1],
            activeTour.annaPos[2],
          );
          tourAnnaRig.root.rotation.y = activeTour.annaRotY;
          updateAvatarRigAnimation(tourAnnaRig, 'idle', elapsed, false);
        }
        const w = container?.clientWidth || window.innerWidth || 800;
        const h = container?.clientHeight || window.innerHeight || 600;
        const camCfg = getResponsiveCameraSettings(z, w / h);
        camera.fov = THREE.MathUtils.damp(camera.fov, camCfg.fov, 5, delta);
        camera.updateProjectionMatrix();
        camera.position.x = THREE.MathUtils.damp(camera.position.x, activeTour.camPos[0], 4.5, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, activeTour.camPos[1], 4.5, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, activeTour.camPos[2], 4.5, delta);
        controls.target.x = THREE.MathUtils.damp(controls.target.x, activeTour.lookAt[0], 4.5, delta);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, activeTour.lookAt[1], 4.5, delta);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, activeTour.lookAt[2], 4.5, delta);
      } else {
        tourAnnaRig.root.visible = false;
      }

      if (!isTourControlling && cameraTransitionActive) {
        const w = container?.clientWidth || window.innerWidth || 800;
        const h = container?.clientHeight || window.innerHeight || 600;
        const camCfg = getResponsiveCameraSettings(z, w / h);
        camera.fov = THREE.MathUtils.damp(camera.fov, camCfg.fov, 6, delta);
        camera.updateProjectionMatrix();
        const spawnGroundY =
          z === 'town'
            ? getTownGroundHeight(playerPos.x, playerPos.z, currentPlazaRadius)
            : z === 'island'
              ? swimState.active
                ? ISLAND_WATER_Y - 0.56
                : getIslandGroundHeight(playerPos.x, playerPos.z)
              : z === 'mall' && mallState.floor === 2
                ? MALL_UPPER_Y
                : 0;
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
      const isRidingEscalator = z === 'mall' && mallState.ridingLane !== null;
      const isClimbingLadder = z === 'island' && treehouseState.climbing;
      const isSlidingMall = z === 'mall' && mallSlideCtrl.active;
      if (z === 'mall' && !isRidingEscalator) {
        mallState.cooldown = Math.max(0, mallState.cooldown - delta);
      }
      if (z === 'island' && !isClimbingLadder) {
        treehouseState.cooldown = Math.max(0, treehouseState.cooldown - delta);
      }

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

      if (isRidingEscalator && mallState.ridingLane) {
        const lane = mallState.ridingLane;
        mallState.progress = Math.min(1, mallState.progress + delta / mallState.duration);
        const eased =
          mallState.progress * mallState.progress * (3 - 2 * mallState.progress);
        playerPos.x = THREE.MathUtils.lerp(lane.startX, lane.endX, eased);
        playerPos.z = THREE.MathUtils.lerp(lane.startZ, lane.endZ, eased);
        playerPos.rotY = lane.travelRotY;
        playerPos.pose = 'idle';
        activeTarget = null;
        activeSeat = null;
        jumpY = 0;
        jumpVel = 0;
        playPetTimer = 0;
        if (mallState.progress >= 1) {
          mallState.floor = lane.endFloor;
          const landed = clampMallFloorPoint(lane.exitX, lane.exitZ, lane.endFloor);
          playerPos.x = landed.x;
          playerPos.z = landed.z;
          mallState.ridingLane = null;
          mallState.progress = 0;
          mallState.cooldown = 1.4;
          prevGroundY = lane.endFloor === 2 ? MALL_UPPER_Y : 0.02;
        }
      }

      if (isClimbingLadder) {
        treehouseState.progress = Math.min(
          1,
          treehouseState.progress + delta / treehouseState.duration,
        );
        const goingUp = treehouseState.direction === 'up';
        const eased =
          treehouseState.progress *
          treehouseState.progress *
          (3 - 2 * treehouseState.progress);
        playerPos.x = ISLAND_LADDER_CLIMB_START.x;
        if (goingUp) {
          if (eased <= 0.88) {
            const climbT = eased / 0.88;
            playerPos.z = THREE.MathUtils.lerp(
              ISLAND_LADDER_CLIMB_START.z,
              ISLAND_LADDER_CLIMB_END.z,
              climbT,
            );
            playerPos.pose = 'climb';
          } else {
            const stepT = (eased - 0.88) / 0.12;
            playerPos.z = THREE.MathUtils.lerp(
              ISLAND_LADDER_CLIMB_END.z,
              ISLAND_LADDER_TOP.z,
              stepT,
            );
            playerPos.pose = 'walk';
          }
        } else {
          if (eased <= 0.12) {
            const stepT = eased / 0.12;
            playerPos.z = THREE.MathUtils.lerp(
              ISLAND_LADDER_TOP.z,
              ISLAND_LADDER_CLIMB_END.z,
              stepT,
            );
            playerPos.pose = 'walk';
          } else {
            const climbT = (eased - 0.12) / 0.88;
            playerPos.z = THREE.MathUtils.lerp(
              ISLAND_LADDER_CLIMB_END.z,
              ISLAND_LADDER_CLIMB_START.z,
              climbT,
            );
            playerPos.pose = 'climb';
          }
        }
        playerPos.rotY = Math.PI;
        activeTarget = null;
        activeSeat = null;
        jumpY = 0;
        jumpVel = 0;
        playPetTimer = 0;
        if (treehouseState.progress >= 1) {
          treehouseState.climbing = false;
          treehouseState.progress = 0;
          treehouseState.onTreehouse = goingUp;
          treehouseState.cooldown = 1.5;
          activeSubzone?.setTreehouseFocus?.(goingUp);
          if (goingUp) {
            playerPos.x = ISLAND_LADDER_TOP.x;
            playerPos.z = ISLAND_LADDER_TOP.z;
            playerPos.rotY = Math.PI;
            prevGroundY = ISLAND_TREEHOUSE_DECK_Y;
          } else {
            playerPos.x = ISLAND_LADDER_CLIMB_START.x;
            playerPos.z = ISLAND_LADDER_CLIMB_START.z;
            playerPos.rotY = 0;
            prevGroundY = treehouseState.baseGroundY;
          }
          playerPos.pose = 'idle';
          const cbClimb = treehouseState.postClimbAction;
          treehouseState.postClimbAction = null;
          soundFX.tap();
          cbClimb?.();
        }
      }

      if (isSlidingMall) {
        mallSlideCtrl.elapsed += delta;
        const st = Math.min(1, mallSlideCtrl.elapsed / mallSlideCtrl.duration);
        playerPos.x = 25.6;
        playerPos.rotY = 0;
        activeTarget = null;
        activeSeat = null;
        jumpY = 0;
        jumpVel = 0;
        playPetTimer = 0;
        if (st < 0.38) {
          const u = st / 0.38;
          playerPos.z = THREE.MathUtils.lerp(-19.55, -17.85, u);
          mallSlideCtrl.y = THREE.MathUtils.lerp(0.04, 1.88, u);
          playerPos.pose = 'climb';
        } else if (st < 0.46) {
          const u = (st - 0.38) / 0.08;
          playerPos.z = THREE.MathUtils.lerp(-17.85, -17.05, u);
          mallSlideCtrl.y = 1.88;
          playerPos.pose = 'walk';
        } else if (st < 0.92) {
          const u = (st - 0.46) / 0.46;
          const su = u * u * (3 - 2 * u);
          playerPos.z = THREE.MathUtils.lerp(-17.05, -13.1, su);
          mallSlideCtrl.y = THREE.MathUtils.lerp(1.88, 0.22, su);
          playerPos.pose = 'sit';
        } else {
          const u = (st - 0.92) / 0.08;
          playerPos.z = THREE.MathUtils.lerp(-13.1, -12.35, u);
          mallSlideCtrl.y = THREE.MathUtils.lerp(0.22, 0.02, u);
          playerPos.pose = 'walk';
        }
        if (st >= 1) {
          mallSlideCtrl.active = false;
          mallSlideCtrl.elapsed = 0;
          mallSlideCtrl.y = 0.02;
          playerPos.x = 25.6;
          playerPos.z = -12.35;
          playerPos.rotY = 0;
          playerPos.pose = 'idle';
          prevGroundY = 0.02;
          soundFX.sparkle();
          callbacksRef.current.onBoostMood();
          showBubble('Tuột Cầu Tuột Mây Hồng siêu vui! (+Vui vẻ)');
        }
      }

      // Jump vertical physics
      if (
        !isRidingMallElevator &&
        !isRidingEscalator &&
        !isClimbingLadder &&
        !isSlidingMall &&
        !parachuteCtrl.active &&
        (jumpY > 0 || jumpVel !== 0)
      ) {
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
      const isAirborne =
        !isRidingMallElevator &&
        !isRidingEscalator &&
        !isClimbingLadder &&
        !isSlidingMall &&
        !parachuteCtrl.active &&
        jumpY > 0.01;

      const onFlowerBedLevel = z === 'town' && !isOnMallDeck && prevGroundY + jumpY >= 0.86;

      let groundOffset = z === 'mall' && mallState.floor === 2 ? MALL_UPPER_Y : 0.02;
      const joy = joystickInputRef.current;
      const joyMag =
        !isRidingMallElevator &&
        !isRidingEscalator &&
        !isClimbingLadder &&
        !isSlidingMall &&
        fishCtrl.phase !== 'pulling' &&
        joy.active
          ? Math.hypot(joy.x, joy.y)
          : 0;
      let moveHorizSpeed = 0;
      let isCreepingNow = false;

      if ((z === 'town' || z === 'island') && boatState.active) {
        activeTarget = null;
        activeSeat = null;
        jumpY = 0;
        jumpVel = 0;
        playPetTimer = 0;

        const clampBoat = z === 'island' ? clampIslandBoatPoint : clampRiverBoatPoint;
        const boatWaterY = z === 'island' ? ISLAND_WATER_Y : RIVER_WATER_Y;

        if (joyMag > 0.08) {
          if (fishCtrl.phase !== 'idle') {
            resetFishing(true);
          }
          boatState.targetX = null;
          boatState.targetZ = null;
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
          const stepLen = 5.4 * Math.min(1, joyMag) * delta;
          const next = clampBoat(
            boatState.x + (moveDirX / moveLen) * stepLen,
            boatState.z + (moveDirZ / moveLen) * stepLen,
          );
          const dmx = next.x - boatState.x;
          const dmz = next.z - boatState.z;
          boatState.x = next.x;
          boatState.z = next.z;
          boatState.moving = Math.hypot(dmx, dmz) > 0.002;
          moveHorizSpeed = Math.hypot(dmx, dmz) / Math.max(0.001, delta);
          const targetRot =
            boatState.moving ? Math.atan2(dmx, dmz) : Math.atan2(moveDirX, moveDirZ);
          let diff = targetRot - boatState.rotY;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          boatState.rotY += diff * Math.min(1, delta * 9);
        } else if (boatState.targetX !== null && boatState.targetZ !== null) {
          if (fishCtrl.phase !== 'idle') {
            boatState.targetX = null;
            boatState.targetZ = null;
            boatState.moving = false;
          } else {
            const dx = boatState.targetX - boatState.x;
            const dz = boatState.targetZ - boatState.z;
            const dist = Math.hypot(dx, dz);
            if (dist < 0.25) {
              boatState.targetX = null;
              boatState.targetZ = null;
              boatState.moving = false;
            } else {
              const stepLen = Math.min(dist, 5.4 * delta);
              const next = clampBoat(
                boatState.x + (dx / dist) * stepLen,
                boatState.z + (dz / dist) * stepLen,
              );
              const dmx = next.x - boatState.x;
              const dmz = next.z - boatState.z;
              boatState.x = next.x;
              boatState.z = next.z;
              boatState.moving = Math.hypot(dmx, dmz) > 0.002;
              moveHorizSpeed = Math.hypot(dmx, dmz) / Math.max(0.001, delta);
              if (boatState.moving) {
                const targetRot = Math.atan2(dmx, dmz);
                let diff = targetRot - boatState.rotY;
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;
                boatState.rotY += diff * Math.min(1, delta * 9);
              } else {
                boatState.targetX = null;
                boatState.targetZ = null;
              }
            }
          }
        } else {
          boatState.moving = false;
        }

        if (z === 'town') {
          activeTown?.setRiverBoatPose?.(
            true,
            boatState.x,
            boatState.z,
            boatState.rotY,
            boatState.moving,
            elapsed,
            stateRef.current.boats.activeBoatId,
          );
        } else {
          activeSubzone?.setIslandBoatPose?.(
            true,
            boatState.x,
            boatState.z,
            boatState.rotY,
            boatState.moving,
            elapsed,
            stateRef.current.boats.activeBoatId,
          );
        }

        const boatBob = Math.sin(elapsed * 2.2) * 0.028;
        const isBoatFishing = fishCtrl.phase !== 'idle' || fishCtrl.pullPoseTimer > 0;
        if (isBoatFishing) {
          playerPos.x = boatState.x;
          playerPos.z = boatState.z;
          groundOffset = boatWaterY + 0.16 + boatBob;
        } else {
          const aftOff = -0.56;
          playerPos.x = boatState.x + Math.sin(boatState.rotY) * aftOff;
          playerPos.z = boatState.z + Math.cos(boatState.rotY) * aftOff;
          playerPos.rotY = boatState.rotY;
          playerPos.pose = 'sit';
          groundOffset = boatWaterY + 0.18 + boatBob;
        }
        prevGroundY = groundOffset;
      } else if (z === 'town' && parachuteCtrl.active) {
        activeTarget = null;
        activeSeat = null;
        jumpY = 0;
        jumpVel = 0;
        playPetTimer = 0;

        if (joyMag > 0.06) {
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
          const stepLen = 6.8 * Math.min(1, joyMag) * delta;
          const b = getZoneWalkBounds('town');
          playerPos.x = THREE.MathUtils.clamp(
            playerPos.x + (moveDirX / moveLen) * stepLen,
            b.minX + 0.8,
            b.maxX - 0.8,
          );
          playerPos.z = THREE.MathUtils.clamp(
            playerPos.z + (moveDirZ / moveLen) * stepLen,
            b.minZ + 0.8,
            b.maxZ - 0.8,
          );
          const targetRot = Math.atan2(moveDirX, moveDirZ);
          let diff = targetRot - playerPos.rotY;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          playerPos.rotY += diff * Math.min(1, delta * 7);
        }

        // Monotonic steady descent — never climbs upward
        parachuteCtrl.worldY -= 2.35 * delta;

        // Nudge safely onto dry land if gliding over the West River or Town Lake
        if (parachuteCtrl.worldY <= 2.4) {
          const riverCx = getWestRiverCenterX(playerPos.z);
          const riverHw = getWestRiverHalfWidth(playerPos.z);
          if (Math.abs(playerPos.x - riverCx) < riverHw + 1.25) {
            playerPos.x = riverCx + riverHw + 1.4;
          }
          const lakeDx = playerPos.x - LAKE_CENTER.x;
          const lakeDz = playerPos.z - LAKE_CENTER.z;
          const lakeDist = Math.hypot(lakeDx, lakeDz);
          const lakeAng = Math.atan2(lakeDz, lakeDx);
          const lakeShoreR = getLakeShoreRadius(lakeAng) + 1.35;
          if (lakeDist < lakeShoreR) {
            const nx = lakeDist > 0.001 ? lakeDx / lakeDist : 1;
            const nz = lakeDist > 0.001 ? lakeDz / lakeDist : 0;
            playerPos.x = LAKE_CENTER.x + nx * lakeShoreR;
            playerPos.z = LAKE_CENTER.z + nz * lakeShoreR;
          }
        }

        let landGroundY = getTownGroundHeight(playerPos.x, playerPos.z, currentPlazaRadius);
        if (parachuteCtrl.worldY < landGroundY + 2.5) {
          const resolved = resolvePointAgainstColliders(
            playerPos.x,
            playerPos.z,
            currentColliders,
            PLAYER_RADIUS,
            false,
          );
          playerPos.x = resolved.x;
          playerPos.z = resolved.z;
          landGroundY = getTownGroundHeight(playerPos.x, playerPos.z, currentPlazaRadius);
        }

        if (parachuteCtrl.worldY <= landGroundY + 0.08) {
          parachuteCtrl.active = false;
          playerPos.pose = 'idle';
          groundOffset = landGroundY;
          prevGroundY = landGroundY;
          setIsParachutingHud(false);
          soundFX.tap();
          showBubble('Đã đáp đất an toàn!');
        } else {
          playerPos.pose = 'parachute';
          groundOffset = parachuteCtrl.worldY;
          prevGroundY = parachuteCtrl.worldY;
        }
      } else if (z === 'island' && swimState.active) {
        activeTarget = null;
        activeSeat = null;
        jumpY = 0;
        jumpVel = 0;
        playPetTimer = 0;
        swimState.limitNoticeCooldown = Math.max(0, swimState.limitNoticeCooldown - delta);

        const swimSpeed = 4.65;
        let nextSwimX = playerPos.x;
        let nextSwimZ = playerPos.z;
        let hitBoundary = false;

        if (joyMag > 0.08) {
          swimState.targetX = null;
          swimState.targetZ = null;
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
          const stepLen = swimSpeed * Math.min(1, joyMag) * delta;
          const clamped = clampSwimOceanPoint(
            playerPos.x + (moveDirX / moveLen) * stepLen,
            playerPos.z + (moveDirZ / moveLen) * stepLen,
          );
          nextSwimX = clamped.x;
          nextSwimZ = clamped.z;
          hitBoundary = clamped.hitLimit;
        } else if (swimState.targetX !== null && swimState.targetZ !== null) {
          const dx = swimState.targetX - playerPos.x;
          const dz = swimState.targetZ - playerPos.z;
          const dist = Math.hypot(dx, dz);
          if (dist < 0.28) {
            swimState.targetX = null;
            swimState.targetZ = null;
          } else {
            const stepLen = Math.min(dist, swimSpeed * delta);
            const clamped = clampSwimOceanPoint(
              playerPos.x + (dx / dist) * stepLen,
              playerPos.z + (dz / dist) * stepLen,
            );
            nextSwimX = clamped.x;
            nextSwimZ = clamped.z;
            hitBoundary = clamped.hitLimit;
          }
        }

        if (hitBoundary && swimState.limitNoticeCooldown <= 0) {
          swimState.limitNoticeCooldown = 2.6;
          showBubble('Đã tới giới hạn vùng bơi an toàn!');
        }

        // Prevent swimming inside moored pier pilings
        const resolvedSwim = resolvePointAgainstColliders(
          nextSwimX,
          nextSwimZ,
          getActiveColliders('island'),
          PLAYER_RADIUS,
          false,
        );
        const dmx = resolvedSwim.x - playerPos.x;
        const dmz = resolvedSwim.z - playerPos.z;
        playerPos.x = resolvedSwim.x;
        playerPos.z = resolvedSwim.z;
        moveHorizSpeed = Math.hypot(dmx, dmz) / Math.max(0.001, delta);
        swimState.moving = Math.hypot(dmx, dmz) > 0.002;
        if (swimState.moving) {
          const targetRot = Math.atan2(dmx, dmz);
          let diff = targetRot - playerPos.rotY;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          playerPos.rotY += diff * Math.min(1, delta * 9);
        }

        // Swimming back up onto the shallow sandy beach cleanly exits swim mode
        if (getIslandBaseTerrainY(playerPos.x, playerPos.z) >= ISLAND_WATER_Y + 0.08) {
          exitIslandSwim(false);
          groundOffset = getIslandGroundHeight(playerPos.x, playerPos.z);
          prevGroundY = groundOffset;
        } else {
          playerPos.pose = 'swim';
          groundOffset = ISLAND_WATER_Y - 0.72;
          prevGroundY = groundOffset;
          activeSubzone?.setSwimRingPose?.(false);
        }
      } else {
        if (z === 'island') {
          activeSubzone?.setSwimRingPose?.(false);
        }
        if (
          isRidingMallElevator ||
          isRidingEscalator ||
          isClimbingLadder ||
          isSlidingMall ||
          fishCtrl.phase === 'pulling'
        ) {
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
          if (selectedRemoteRef.current) {
            selectedRemoteRef.current = null;
            setRemoteArcMenuPos(null);
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
            (z === 'town' || z === 'island') &&
            !isOnMallDeck &&
            !treehouseState.onTreehouse &&
            stateRef.current.bugNet.equipped &&
            joyMag <= 0.58 &&
            !isAirborne;
          // Apply hunger slowdown & equipped mount speed boost uniformly
          const hungerSpeedMult = getMovementSpeedMultiplier(stateRef.current.stats);
          const mountDefJoy = !isCreepingNow
            ? getMountDefinition(stateRef.current.ownedMounts.activeMountId)
            : null;
          const mountSpeedMult = mountDefJoy ? mountDefJoy.speedMultiplier : 1;
          const speed =
            (isCreepingNow
              ? 0.68
              : (z === 'town'
                  ? isOnMallDeck
                    ? 4.2
                    : 5.6
                  : z === 'island'
                    ? treehouseState.onTreehouse
                      ? 4.0
                      : 5.2
                    : z === 'mall'
                      ? 4.8
                      : 3.6) * Math.min(1, joyMag)) *
            hungerSpeedMult *
            mountSpeedMult;
          const stepLen = speed * delta;
          const rawX = playerPos.x + (moveDirX / moveLen) * stepLen;
          const rawZ = playerPos.z + (moveDirZ / moveLen) * stepLen;

          let nextX: number;
          let nextZ: number;
          if (isOnMallDeck) {
            const deckClamped = clampPointToMallDeck(rawX, rawZ);
            nextX = deckClamped.x;
            nextZ = deckClamped.z;
          } else if (z === 'island' && treehouseState.onTreehouse) {
            const resolved = resolvePointAgainstColliders(
              rawX,
              rawZ,
              getActiveColliders('island'),
              PLAYER_RADIUS,
              false,
            );
            const thClamped = clampPointToIslandTreehouse(resolved.x, resolved.z);
            nextX = thClamped.x;
            nextZ = thClamped.z;
          } else {
            const resolved = resolvePointAgainstColliders(
              rawX,
              rawZ,
              getActiveColliders(z),
              PLAYER_RADIUS,
              onFlowerBedLevel,
            );
            const b = getZoneWalkBounds(z);
            nextX = THREE.MathUtils.clamp(resolved.x, b.minX, b.maxX);
            nextZ = THREE.MathUtils.clamp(resolved.z, b.minZ, b.maxZ);
            if (z === 'mall') {
              const mp = clampMallFloorPoint(nextX, nextZ, mallState.floor);
              nextX = mp.x;
              nextZ = mp.z;
            } else if (z === 'island' && getIslandGroundHeight(nextX, nextZ) < ISLAND_WATER_Y - 0.1) {
              // Keep non-swimming feet at ankle-deep sandy shoreline or on wooden pier
              if (getIslandGroundHeight(playerPos.x, playerPos.z) >= ISLAND_WATER_Y - 0.1) {
                nextX = playerPos.x;
                nextZ = playerPos.z;
              }
            }
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
            // Apply hunger slowdown & equipped mount speed boost uniformly
            const hungerSpeedMult = getMovementSpeedMultiplier(stateRef.current.stats);
            const mountDefWalk = getMountDefinition(stateRef.current.ownedMounts.activeMountId);
            const mountSpeedMult = mountDefWalk ? mountDefWalk.speedMultiplier : 1;
            const speed =
              (z === 'town'
                ? isOnMallDeck
                  ? 4.2
                  : 5.6
                : z === 'island'
                  ? 5.2
                  : z === 'mall'
                    ? 4.8
                    : 3.6) *
              hungerSpeedMult *
              mountSpeedMult;

            if (isFinalWp && dist < 0.16) {
              if (activeTarget.seat && !isAirborne) {
                callbacksRef.current.onDismountMount();
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
                const activeCols = getActiveColliders(z);
                let resolved = resolvePointAgainstColliders(
                  rawX,
                  rawZ,
                  activeCols,
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
                    activeCols,
                    PLAYER_RADIUS,
                    onFlowerBedLevel,
                  );
                  const optB = resolvePointAgainstColliders(
                    playerPos.x - perpX * stepLen * 0.9,
                    playerPos.z - perpZ * stepLen * 0.9,
                    activeCols,
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
                if (z === 'mall') {
                  const mp = clampMallFloorPoint(nextX, nextZ, mallState.floor);
                  nextX = mp.x;
                  nextZ = mp.z;
                } else if (z === 'island' && treehouseState.onTreehouse) {
                  const thp = clampPointToIslandTreehouse(nextX, nextZ);
                  nextX = thp.x;
                  nextZ = thp.z;
                }
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

        if (happyActionTimer > 0) {
          if (
            stateRef.current.ownedMounts.activeMountId !== null ||
            isAirborne ||
            isRidingMallElevator ||
            isRidingEscalator ||
            isClimbingLadder ||
            isSlidingMall ||
            parachuteCtrl.active ||
            boatState.active ||
            swimState.active ||
            fishCtrl.phase !== 'idle' ||
            netSwingCtrl.active ||
            activeTarget ||
            activeSeat ||
            joyMag > 0.08
          ) {
            happyActionTimer = 0;
            if (!isAirborne && !activeTarget && !activeSeat && playerPos.pose === 'happy_jump') {
              playerPos.pose = 'idle';
            }
          } else {
            happyActionTimer = Math.max(0, happyActionTimer - delta);
            playerPos.pose = happyActionTimer > 0 ? 'happy_jump' : 'idle';
          }
        } else if (playerPos.pose === 'happy_jump' && !isAirborne && !activeTarget) {
          playerPos.pose = 'idle';
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
        } else if (z === 'mall') {
          activeSubzone?.setMallSwingSeated?.(
            Boolean(playerPos.pose === 'sit' && activeSeat?.isMallSwing),
          );
          activeSubzone?.setMallSeesawRider?.(
            playerPos.pose === 'sit' && activeSeat?.mallSeesawSide
              ? activeSeat.mallSeesawSide
              : null,
          );
        }

        if (
          z === 'mall' &&
          !isRidingEscalator &&
          !isSlidingMall &&
          mallState.cooldown <= 0 &&
          !activeTarget
        ) {
          for (let i = 0; i < MALL_ESCALATOR_LANES.length; i++) {
            const lane = MALL_ESCALATOR_LANES[i];
            if (lane.startFloor !== mallState.floor) continue;
            if (Math.hypot(playerPos.x - lane.approachX, playerPos.z - lane.approachZ) < 0.85) {
              callbacksRef.current.onDismountMount();
              soundFX.tap();
              mallState.ridingLane = lane;
              mallState.progress = 0;
              activeTarget = null;
              activeSeat = null;
              jumpY = 0;
              jumpVel = 0;
              break;
            }
          }
        }

        if (
          z === 'island' &&
          !isClimbingLadder &&
          treehouseState.cooldown <= 0 &&
          !activeTarget &&
          joyMag > 0.08
        ) {
          if (
            treehouseState.onTreehouse &&
            Math.abs(playerPos.x - ISLAND_LADDER_TOP.x) < 0.56 &&
            playerPos.z > -6.58
          ) {
            climbTreehouseLadder('down');
          } else if (
            !treehouseState.onTreehouse &&
            Math.hypot(
              playerPos.x - ISLAND_LADDER_CLIMB_START.x,
              playerPos.z - ISLAND_LADDER_CLIMB_START.z,
            ) < 0.58
          ) {
            climbTreehouseLadder('up');
          }
        }

        if (isRidingMallElevator) {
          groundOffset = mallElev.y + 0.06;
        } else if (isRidingEscalator && mallState.ridingLane) {
          const eased =
            mallState.progress * mallState.progress * (3 - 2 * mallState.progress);
          groundOffset = THREE.MathUtils.lerp(
            mallState.ridingLane.startY,
            mallState.ridingLane.endY,
            eased,
          );
        } else if (isClimbingLadder) {
          const eased =
            treehouseState.progress *
            treehouseState.progress *
            (3 - 2 * treehouseState.progress);
          if (treehouseState.direction === 'up') {
            const climbT = Math.min(1, eased / 0.88);
            const stepT = Math.max(0, (eased - 0.88) / 0.12);
            groundOffset =
              eased <= 0.88
                ? THREE.MathUtils.lerp(treehouseState.baseGroundY, ISLAND_TREEHOUSE_DECK_Y - 0.08, climbT)
                : THREE.MathUtils.lerp(ISLAND_TREEHOUSE_DECK_Y - 0.08, ISLAND_TREEHOUSE_DECK_Y, stepT);
          } else {
            const stepT = Math.min(1, eased / 0.12);
            const climbT = Math.max(0, (eased - 0.12) / 0.88);
            groundOffset =
              eased <= 0.12
                ? THREE.MathUtils.lerp(ISLAND_TREEHOUSE_DECK_Y, ISLAND_TREEHOUSE_DECK_Y - 0.08, stepT)
                : THREE.MathUtils.lerp(ISLAND_TREEHOUSE_DECK_Y - 0.08, treehouseState.baseGroundY, climbT);
          }
        } else if (isSlidingMall) {
          groundOffset = mallSlideCtrl.y;
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
        } else if (z === 'island') {
          groundOffset = treehouseState.onTreehouse
            ? ISLAND_TREEHOUSE_DECK_Y
            : getIslandGroundHeight(playerPos.x, playerPos.z);
        } else if (z === 'mall') {
          groundOffset = mallState.floor === 2 ? MALL_UPPER_Y : 0.02;
        }

        // Preserve world elevation smoothly when landing onto or stepping off elevated flower beds
        if (isRidingMallElevator || isRidingEscalator || isClimbingLadder || isSlidingMall) {
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
      }

      const isSwingingTown = Boolean(z === 'town' && playerPos.pose === 'sit' && activeSeat?.isSwing);
      const isSwingingMall = Boolean(
        z === 'mall' && playerPos.pose === 'sit' && activeSeat?.isMallSwing,
      );
      const isSeesawingMall = Boolean(
        z === 'mall' && playerPos.pose === 'sit' && activeSeat?.mallSeesawSide,
      );
      const swingPose = isSwingingTown
        ? activeTown?.getOutdoorSwingSeatPose?.()
        : isSwingingMall
          ? activeSubzone?.getMallSwingSeatPose?.()
          : null;
      const seesawPose =
        isSeesawingMall && activeSeat?.mallSeesawSide
          ? activeSubzone?.getMallSeesawSeatPose?.(activeSeat.mallSeesawSide)
          : null;
      const ridePose = swingPose ?? seesawPose;

      // Keep camera & OrbitControls always centered smoothly on the player character
      if (!isTourControlling && !cameraTransitionActive) {
        const focusX = ridePose ? ridePose.x : playerPos.x;
        const focusY = (ridePose ? ridePose.y - 0.245 : groundOffset) + 0.92;
        const focusZ = ridePose ? ridePose.z : playerPos.z;
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
      if ((z === 'town' || z === 'island') && !cameraTransitionActive && !isTourControlling) {
        const camGround =
          z === 'town'
            ? Math.max(
                TOWN_LAKE_WATER_Y + 0.35,
                getTownGroundHeight(camera.position.x, camera.position.z, currentPlazaRadius),
              )
            : Math.max(
                ISLAND_WATER_Y + 0.35,
                getIslandGroundHeight(camera.position.x, camera.position.z),
              );
        const minCamY = camGround + 0.55;
        if (camera.position.y < minCamY) {
          camera.position.y = minCamY;
        }
      } else if (z === 'mall') {
        const tx = controls.target.x;
        const ty = controls.target.y;
        const tz = controls.target.z;
        const dx = camera.position.x - tx;
        const dy = camera.position.y - ty;
        const dz = camera.position.z - tz;
        const minFloorCamY =
          mallState.floor === 2 && !mallState.ridingLane ? MALL_UPPER_Y + 0.72 : 0.65;
        const maxCamX = MALL_HALF_W - 0.95;
        const maxCamZ = MALL_HALF_D - 0.95;
        const maxCamY = MALL_WALL_H - 0.95;

        let maxT = 1.0;
        if (dx > 0.001 && tx + dx > maxCamX) maxT = Math.min(maxT, (maxCamX - tx) / dx);
        if (dx < -0.001 && tx + dx < -maxCamX) maxT = Math.min(maxT, (-maxCamX - tx) / dx);
        if (dz > 0.001 && tz + dz > maxCamZ) maxT = Math.min(maxT, (maxCamZ - tz) / dz);
        if (dz < -0.001 && tz + dz < -maxCamZ) maxT = Math.min(maxT, (-maxCamZ - tz) / dz);
        if (dy > 0.001 && ty + dy > maxCamY) maxT = Math.min(maxT, (maxCamY - ty) / dy);
        if (dy < -0.001 && ty + dy < minFloorCamY) maxT = Math.min(maxT, (minFloorCamY - ty) / dy);

        // When player is on Floor 1, prevent camera ray from rising above/behind Floor 2 mezzanine deck
        if (mallState.floor === 1 && !mallState.ridingLane) {
          const isCamBlockedByF2 = (t: number) => {
            const rx = tx + dx * t;
            const ry = ty + dy * t;
            const rz = tz + dz * t;
            if (ry < MALL_UPPER_Y - 0.95) return false;
            return (
              Math.abs(rx) > MALL_ATRIUM_HALF_W - 0.55 || Math.abs(rz) > MALL_ATRIUM_HALF_D - 0.55
            );
          };
          if (isCamBlockedByF2(maxT)) {
            let lo = 0.28;
            let hi = maxT;
            for (let it = 0; it < 7; it++) {
              const mid = (lo + hi) * 0.5;
              if (isCamBlockedByF2(mid)) {
                hi = mid;
              } else {
                lo = mid;
              }
            }
            maxT = lo;
          }
        }

        maxT = Math.max(0.28, maxT);
        if (maxT < 0.999) {
          camera.position.set(
            THREE.MathUtils.clamp(tx + dx * maxT, -maxCamX, maxCamX),
            THREE.MathUtils.clamp(ty + dy * maxT, minFloorCamY, maxCamY),
            THREE.MathUtils.clamp(tz + dz * maxT, -maxCamZ, maxCamZ),
          );
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
      } else if (
        z === 'garden' &&
        stateRef.current.editFarmDecorMode &&
        stateRef.current.selectedFarmDecorId
      ) {
        const selF = stateRef.current.placedFarmDecor.find(
          (p) => p.instanceId === stateRef.current.selectedFarmDecorId,
        );
        const catF = selF ? FARM_DECOR_BY_ID[selF.catalogId] : null;
        if (selF && catF) {
          selectionRing.visible = true;
          selectionRing.position.set(selF.x, 0.04, selF.z);
          const ringRadius =
            Math.max(catF.halfW, catF.halfD) * 1.28 + Math.sin(elapsed * 5) * 0.035;
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
        fishVisualFrame.thrashIntensity = 0;

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
          fishVisualFrame.thrashIntensity = 0.35;

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
        } else if (fishCtrl.phase === 'pulling') {
          playerPos.pose = 'fish_pull';
          avatarPoseProgress = Math.min(1, fishCtrl.phaseElapsed / 0.35);

          // Intense tug-of-war bobber darting & violent water thrashing for 2–5s
          const dartX = Math.sin(elapsed * 19) * 0.24 + Math.cos(elapsed * 31) * 0.08;
          const dartZ = Math.cos(elapsed * 16) * 0.22 + Math.sin(elapsed * 27) * 0.08;
          const bx = fishCtrl.targetX + dartX;
          const bz = fishCtrl.targetZ + dartZ;

          fishVisualFrame.bobberX = bx;
          fishVisualFrame.bobberZ = bz;
          fishVisualFrame.bobberY = fishCtrl.waterY - 0.16 + Math.sin(elapsed * 32) * 0.09;
          fishVisualFrame.bobberTiltX = Math.sin(elapsed * 36) * 0.62;
          fishVisualFrame.bobberTiltZ = Math.cos(elapsed * 31) * 0.62;
          fishVisualFrame.thrashIntensity = 1.0;

          fishVisualFrame.rippleVisible = true;
          fishVisualFrame.rippleX = bx;
          fishVisualFrame.rippleZ = bz;
          const rt1 = (elapsed * 2.8) % 1;
          fishVisualFrame.rippleScale = 0.75 + rt1 * 2.6;
          fishVisualFrame.rippleOpacity = (1 - rt1) * 0.96;

          fishVisualFrame.burstVisible = true;
          fishVisualFrame.burstX = bx;
          fishVisualFrame.burstZ = bz;
          const rt2 = (elapsed * 3.1 + 0.5) % 1;
          fishVisualFrame.burstScale = 0.7 + rt2 * 2.35;
          fishVisualFrame.burstOpacity = (1 - rt2) * 0.92;

          fishVisualFrame.shadowVisible = true;
          fishVisualFrame.shadowX = bx - fishCtrl.dirToBobberX * 0.1;
          fishVisualFrame.shadowZ = bz - fishCtrl.dirToBobberZ * 0.1;
          fishVisualFrame.shadowRotY =
            fishCtrl.approachRotY + Math.sin(elapsed * 22) * 0.45;
          fishVisualFrame.shadowScale = fishCtrl.shadowScale * 1.08;
          fishVisualFrame.shadowOpacity = 0.62;
          fishVisualFrame.shadowTailSpeed = 40;

          fishCtrl.struggleSplashTimer -= delta;
          if (fishCtrl.struggleSplashTimer <= 0) {
            fishCtrl.struggleSplashTimer = 0.55 + Math.random() * 0.35;
            soundFX.splash();
          }

          if (fishCtrl.phaseElapsed >= fishCtrl.struggleDurationSec) {
            const preRolled = fishCtrl.rolledCatch
              ? {
                  speciesId: fishCtrl.rolledCatch.speciesId,
                  weightKg: fishCtrl.rolledCatch.weightKg,
                  sellPrice: fishCtrl.rolledCatch.sellPrice,
                  waterType: fishCtrl.rolledCatch.waterType,
                }
              : undefined;
            resetFishing(false);
            fishCtrl.pullPoseTimer = 0.35;
            playerPos.pose = 'fish_pull';
            const res = callbacksRef.current.onCatchRiverFish(preRolled);
            if (res) {
              soundFX.sparkle();
              setSpeechBubble(null);
              triggerCatchCelebration({kind: 'fish', ...res});
            }
          }
        }
      } else {
        fishVisualFrame.active = fishCtrl.spookTimer > 0;
        fishVisualFrame.bobberVisible = false;
        fishVisualFrame.rippleVisible = false;
        fishVisualFrame.burstVisible = false;
        fishVisualFrame.thrashIntensity = 0;
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
      } else if (seesawPose) {
        playerRig.root.position.set(seesawPose.x, seesawPose.y - 0.22, seesawPose.z);
        playerRig.root.rotation.x = seesawPose.pitch * 0.4;
        playerRig.root.rotation.y = seesawPose.rotY;
      } else {
        playerRig.root.position.set(playerPos.x, groundOffset + jumpY, playerPos.z);
        playerRig.root.rotation.x = 0;
        playerRig.root.rotation.y = playerPos.rotY;
      }
      if (playerRig.shadowDisc) {
        playerRig.shadowDisc.visible = !swimState.active;
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
          const evalRes =
            z === 'town'
              ? activeTown?.tryCatchInsect?.(
                  playerPos.x,
                  groundOffset + jumpY,
                  playerPos.z,
                  playerPos.rotY,
                )
              : activeSubzone?.tryCatchInsect?.(
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

      let mountAnimParams: AvatarMountAnimParams | undefined;
      const curActiveMountId = stateRef.current.ownedMounts.activeMountId;
      const curMountDef = getMountDefinition(curActiveMountId);
      const ridingMountActive = Boolean(
        curMountDef &&
          mountRig &&
          mountRig.mountId === curMountDef.id &&
          !boatState.active &&
          !swimState.active &&
          !parachuteCtrl.active &&
          !isRidingMallElevator &&
          !isRidingEscalator &&
          !isClimbingLadder &&
          !isSlidingMall &&
          !activeSeat &&
          !netSwingCtrl.active &&
          fishCtrl.phase === 'idle' &&
          !swingPose &&
          !seesawPose,
      );
      if (mountRig) {
        mountRig.root.visible = ridingMountActive;
      }
      if (ridingMountActive && curMountDef && mountRig) {
        if (curMountDef.kind === 'skateboard') {
          const wheelRadius = 0.05;
          mountRig.root.position.lerp(_mountZeroVec, Math.min(1, delta * 18));
          if (moveHorizSpeed > 0.28 && !isAirborne) {
            skateMoveSec += delta;
            bikeWheelAngle += (moveHorizSpeed * delta) / wheelRadius;
          } else if (moveHorizSpeed <= 0.28 && !isAirborne) {
            skateMoveSec = 0;
          }

          if (isAirborne) {
            skateIdleBlend = THREE.MathUtils.damp(skateIdleBlend, 0, 14, delta);
            playerPos.pose = 'skate_ride';
            mountAnimParams = {idlePop: 0, idleBlend: skateIdleBlend};
            updateMountAnimation(mountRig, {
              pose: 'skate_ride',
              elapsed,
              speed: moveHorizSpeed,
              wheelAngle: bikeWheelAngle,
              crankAngle: 0,
              steerAngle: 0,
              wheelRadius,
              idlePop: 0,
              idleBlend: skateIdleBlend,
            });
          } else if (moveHorizSpeed > 0.28) {
            skateIdleBlend = THREE.MathUtils.damp(skateIdleBlend, 0, 14, delta);
            // Long travel (> 2s): drop rear push foot to kick backward smoothly then return onto deck
            let poseMount: 'skate_ride' | 'skate_push' = 'skate_ride';
            let pushPhase = 0;
            if (skateMoveSec > 2.0) {
              const cycle = (skateMoveSec - 2.0) % 3.1;
              if (cycle < 0.78) {
                poseMount = 'skate_push';
                pushPhase = cycle / 0.78;
              }
            }
            playerPos.pose = poseMount;
            mountAnimParams = {pushPhase, idleBlend: skateIdleBlend};
            updateMountAnimation(mountRig, {
              pose: poseMount,
              elapsed,
              speed: moveHorizSpeed,
              wheelAngle: bikeWheelAngle,
              crankAngle: 0,
              steerAngle: 0,
              wheelRadius,
              idlePop: 0,
              idleBlend: skateIdleBlend,
            });
          } else {
            skateIdleBlend = THREE.MathUtils.damp(skateIdleBlend, 1, 10, delta);
            playerPos.pose = 'skate_idle';
            mountAnimParams = {idlePop: 0, idleBlend: skateIdleBlend};
            updateMountAnimation(mountRig, {
              pose: 'skate_idle',
              elapsed,
              speed: 0,
              wheelAngle: bikeWheelAngle,
              crankAngle: 0,
              steerAngle: 0,
              wheelRadius,
              idlePop: 0,
              idleBlend: skateIdleBlend,
            });
          }
        } else if (curMountDef.kind === 'lotus_umbrella' || curMountDef.kind === 'dong_thap_lotus') {
          mountRig.root.position.lerp(_mountZeroVec, Math.min(1, delta * 18));
          const isLotusMoving = moveHorizSpeed > 0.22 && !isAirborne;
          playerPos.pose = isLotusMoving ? 'lotus_ride' : 'lotus_idle';
          const lotusIdleB = isLotusMoving ? 0 : 1;
          mountAnimParams = {idleBlend: lotusIdleB};
          updateMountAnimation(mountRig, {
            pose: playerPos.pose,
            elapsed,
            speed: moveHorizSpeed,
            wheelAngle: 0,
            crankAngle: 0,
            steerAngle: 0,
            wheelRadius: 0.3,
            idleBlend: lotusIdleB,
          });
        } else if (curMountDef.kind === 'witch_broom') {
          mountRig.root.position.lerp(_mountZeroVec, Math.min(1, delta * 18));
          const isBroomMoving = moveHorizSpeed > 0.22;
          playerPos.pose = isBroomMoving ? 'broom_ride' : 'broom_idle';
          const broomIdleB = isBroomMoving ? 0 : 1;
          mountAnimParams = {idleBlend: broomIdleB};
          updateMountAnimation(mountRig, {
            pose: playerPos.pose,
            elapsed,
            speed: moveHorizSpeed,
            wheelAngle: 0,
            crankAngle: 0,
            steerAngle: 0,
            wheelRadius: 0.3,
            idleBlend: broomIdleB,
          });
        } else {
          const wheelRadius = 0.355;
          mountRig.root.position.lerp(_mountZeroVec, Math.min(1, delta * 18));
          let rotDelta = playerPos.rotY - prevPlayerRotForSteer;
          while (rotDelta > Math.PI) rotDelta -= Math.PI * 2;
          while (rotDelta < -Math.PI) rotDelta += Math.PI * 2;
          const targetSteer = THREE.MathUtils.clamp(
            (rotDelta / Math.max(0.001, delta)) * 0.14,
            -0.45,
            0.45,
          );
          bikeSteerAngle = THREE.MathUtils.damp(bikeSteerAngle, targetSteer, 11, delta);

          const isBikeMoving = moveHorizSpeed > 0.22 && !isAirborne;
          const isBikeIdle = !isBikeMoving && !isAirborne;
          bikeIdleBlend = THREE.MathUtils.damp(bikeIdleBlend, isBikeIdle ? 1 : 0, 9.5, delta);
          bikeLeanAngle = 0;

          if (isBikeMoving) {
            bikeWheelAngle += (moveHorizSpeed * delta) / wheelRadius;
            // Realistic relaxed pedaling cadence (~1.0 - 1.2 rev/sec max, never supersonic!)
            const crankOmega = THREE.MathUtils.clamp(moveHorizSpeed * 1.05, 1.8, 7.6);
            bikeCrankAngle += crankOmega * delta;
            playerPos.pose = 'bike_ride';
          } else {
            playerPos.pose = isAirborne ? 'bike_ride' : 'bike_idle';
          }
          mountAnimParams = {
            crankAngle: bikeCrankAngle,
            steerAngle: bikeSteerAngle,
            idleBlend: bikeIdleBlend,
            leanAngle: bikeLeanAngle,
          };
          updateMountAnimation(mountRig, {
            pose: playerPos.pose === 'bike_ride' ? 'bike_ride' : 'bike_idle',
            elapsed,
            speed: moveHorizSpeed,
            wheelAngle: bikeWheelAngle,
            crankAngle: bikeCrankAngle,
            steerAngle: bikeSteerAngle,
            wheelRadius,
            idleBlend: bikeIdleBlend,
            leanAngle: bikeLeanAngle,
          });
        }
      } else {
        skateMoveSec = 0;
        skateIdleBlend = 1;
        bikeIdleBlend = 1;
        bikeLeanAngle = 0;
      }
      prevPlayerRotForSteer = playerPos.rotY;

      if (playerPos.pose === 'swim' && !mountAnimParams) {
        mountAnimParams = {idleBlend: swimState.moving ? 0 : 1};
      }

      updateAvatarRigAnimation(
        playerRig,
        playerPos.pose,
        elapsed,
        av.eyeStyle === 'happy_arc',
        avatarPoseProgress,
        mountAnimParams,
      );

      if (
        ridingMountActive &&
        (curMountDef?.kind === 'lotus_umbrella' || curMountDef?.kind === 'dong_thap_lotus') &&
        mountRig?.lotusPivot &&
        playerRig.rightHand
      ) {
        playerRig.root.updateMatrixWorld(true);
        playerRig.rightHand.getWorldPosition(_lotusHandWorldVec);
        playerRig.root.worldToLocal(_lotusHandWorldVec);
        mountRig.lotusPivot.position.copy(_lotusHandWorldVec);
      }

      // Keep walking orbit pet cleanly grounded on hills, plaza, Skydeck, or elevator floor
      if (playerRig.heldPetRig && PET_CATALOG[playerRig.heldPetRig.speciesId].moveType === 'walk') {
        let petGy = 0.02;
        if (boatState.active && (z === 'town' || z === 'island')) {
          petGy = groundOffset;
        } else if (isRidingMallElevator) {
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
        } else if (z === 'island') {
          petGy = treehouseState.climbing
            ? groundOffset
            : treehouseState.onTreehouse
              ? ISLAND_TREEHOUSE_DECK_Y
              : swimState.active
                ? ISLAND_WATER_Y + 0.04
                : getIslandGroundHeight(playerPos.x, playerPos.z);
        } else if (z === 'mall') {
          petGy = isRidingEscalator
            ? groundOffset
            : mallState.floor === 2
              ? MALL_UPPER_Y
              : 0.02;
        }
        playerRig.heldPetRig.root.position.y = petGy - (groundOffset + jumpY);
      }

      // Update active 3D Companion Pet (walk or left-side fly, keeping safe distance from player)
      if (petCompanion.rig && petCompanion.speciesId) {
        const isFly = PET_CATALOG[petCompanion.speciesId].moveType === 'fly';
        const companionScale = isFly ? 1.35 : 1.34;
        const minSafeDist = isFly ? 1.32 : 1.22;
        let petMovedSpeed = 0;

        if (boatState.active && (z === 'town' || z === 'island')) {
          const petBoatWaterY = z === 'island' ? ISLAND_WATER_Y : RIVER_WATER_Y;
          const boatBobPet = Math.sin(elapsed * 2.2) * 0.028;
          petCompanion.playTimer = 0;
          petCompanion.playKind = 'none';
          if (isFly) {
            petCompanion.x = boatState.x - Math.cos(boatState.rotY) * 1.25;
            petCompanion.z = boatState.z + Math.sin(boatState.rotY) * 1.25;
            petCompanion.y = petBoatWaterY + 1.55;
            petCompanion.rotY = boatState.rotY;
          } else {
            petCompanion.x = boatState.x + Math.sin(boatState.rotY) * 0.92;
            petCompanion.z = boatState.z + Math.cos(boatState.rotY) * 0.92;
            petCompanion.y = petBoatWaterY + 0.34 + boatBobPet;
            petCompanion.rotY = boatState.rotY;
          }
          petCompanion.rig.root.position.set(petCompanion.x, petCompanion.y, petCompanion.z);
          petCompanion.rig.root.rotation.y = petCompanion.rotY;
          updatePetAnimation(petCompanion.rig, isFly ? 'fly' : 'idle', elapsed, {
            baseScale: companionScale,
            hoverHeight: 0,
          });
        } else if (isRidingMallElevator) {
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
          } else if (z === 'island' && treehouseState.onTreehouse) {
            const thp = clampPointToIslandTreehouse(petCompanion.x, petCompanion.z);
            petCompanion.x = thp.x;
            petCompanion.z = thp.z;
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
        const distToBbq = Math.hypot(playerPos.x - -107.6, playerPos.z - 34.4);
        const distToCamp = Math.hypot(playerPos.x - -113.5, playerPos.z - 36.2);
        if (distToCamp > 21.0) {
          bbqLabelArmed = true;
          bbqLabelHideAtMs = 0;
        } else if (bbqLabelArmed && distToBbq <= 3.8) {
          bbqLabelArmed = false;
          bbqLabelHideAtMs = performance.now() + 4000;
        }
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
        activeTown?.setJoyboyPaused?.(
          stateRef.current.joyboyModalOpen ||
            (joyboyApproachRef.current && Boolean(activeTarget)),
        );
        activeTown?.update(elapsed, tod, _frustum, camera.position);
      } else {
        bbqLabelArmed = true;
        bbqLabelHideAtMs = 0;
        if (z === 'garden' || z === 'fishing' || z === 'island') {
          activeSubzone?.updateFishingVisuals?.(fishVisualFrame, elapsed);
        }
        if (z === 'island') {
          const islandInsects = activeSubzone?.updateInsects?.(
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
            islandInsects &&
            (islandInsects.escapedByRun > 0 || islandInsects.startledByRun > 0) &&
            stateRef.current.bugNet.equipped &&
            !netSwingCtrl.active &&
            insectAlertCooldown <= 0
          ) {
            insectAlertCooldown = 3.2;
            showBubble(
              islandInsects.escapedByRun > 0
                ? 'Đi quá mạnh làm côn trùng bay mất! Kéo nhẹ Joystick để đi rón rén.'
                : 'Côn trùng giật mình bay sang chỗ khác! Kéo nhẹ Joystick để đi chậm.',
            );
          }
        }
        activeSubzone?.update(elapsed, tod, {cameraPos: camera.position, playerPos});
      }

      // High-precision local pose broadcast & 60fps remote player interpolation
      {
        const nowMs = performance.now();
        const zoneSwitched = prevSentZone !== z;
        const curX = playerRig.root.position.x;
        const curY = playerRig.root.position.y;
        const curZ = playerRig.root.position.z;
        const invDt = zoneSwitched ? 0 : 1 / Math.max(0.008, delta);
        const localVx = zoneSwitched ? 0 : (curX - prevSentX) * invDt;
        const localVy = zoneSwitched ? 0 : (curY - prevSentY) * invDt;
        const localVz = zoneSwitched ? 0 : (curZ - prevSentZ) * invDt;
        prevSentX = curX;
        prevSentY = curY;
        prevSentZ = curZ;
        prevSentZone = z;

        if (isPublicMultiplayerZone(z)) {
          const mallFloorNow: 1 | 2 =
            z === 'mall'
              ? mallState.floor
              : z === 'town' && (isOnMallDeck || isRidingMallElevator)
                ? 2
                : 1;

          townMultiplayer.sendPose(
            {
              zone: z,
              x: curX,
              y: curY,
              z: curZ,
              vx: localVx,
              vy: localVy,
              vz: localVz,
              rotY: playerRig.root.rotation.y,
              rotX: playerRig.root.rotation.x,
              pose: playerPos.pose,
              poseProgress: avatarPoseProgress,
              speed: moveHorizSpeed,
              mallFloor: mallFloorNow,
              boat: boatState.active
                ? {
                    active: true,
                    boatId: stateRef.current.boats.activeBoatId,
                    x: boatState.x,
                    z: boatState.z,
                    rotY: boatState.rotY,
                    moving: boatState.moving,
                  }
                : null,
              pet:
                petCompanion.rig && petCompanion.speciesId
                  ? {
                      x: petCompanion.x,
                      y: petCompanion.y,
                      z: petCompanion.z,
                      rotY: petCompanion.rotY,
                      moving: petCompanion.playTimer <= 0 && moveHorizSpeed > 0.14,
                      playKind: petCompanion.playTimer > 0 ? petCompanion.playKind : 'none',
                    }
                  : null,
            },
            zoneSwitched,
          );
        }

        const isPublicZoneNow = isPublicMultiplayerZone(z);
        let clickTargetVisibilityChanged = false;

        for (const ent of remoteEntities.values()) {
          const shouldBeVisible =
            isPublicZoneNow && ent.hasInitialPose && ent.meta.zone === z;

          if (ent.visibleInZone !== shouldBeVisible) {
            ent.visibleInZone = shouldBeVisible;
            clickTargetVisibilityChanged = true;
          }

          if (!shouldBeVisible) {
            ent.rig.root.visible = false;
            ent.clickProxy.visible = false;
            if (ent.mountRig) ent.mountRig.root.visible = false;
            if (ent.boatRig) ent.boatRig.boat.visible = false;
            if (ent.petRig) ent.petRig.root.visible = false;
            if (ent.nameDom) ent.nameDom.style.display = 'none';
            if (ent.petNameDom) ent.petNameDom.style.display = 'none';
            continue;
          }

          // Smooth dead-reckoning + exponential damp for sub-centimeter precision
          const ageSec = Math.min(0.11, Math.max(0, (nowMs - ent.lastPoseAt) / 1000));
          const predX = ent.targetX + ent.vx * ageSec;
          const predY = ent.targetY + ent.vy * ageSec;
          const predZ = ent.targetZ + ent.vz * ageSec;
          const distGap = Math.hypot(predX - ent.x, predY - ent.y, predZ - ent.z);

          if (distGap > 9.0) {
            ent.x = predX;
            ent.y = predY;
            ent.z = predZ;
            ent.rotY = ent.targetRotY;
            ent.rotX = ent.targetRotX;
          } else {
            ent.x = THREE.MathUtils.damp(ent.x, predX, 22, delta);
            ent.y = THREE.MathUtils.damp(ent.y, predY, 22, delta);
            ent.z = THREE.MathUtils.damp(ent.z, predZ, 22, delta);
            let rDiff = ent.targetRotY - ent.rotY;
            while (rDiff > Math.PI) rDiff -= Math.PI * 2;
            while (rDiff < -Math.PI) rDiff += Math.PI * 2;
            ent.rotY += rDiff * Math.min(1, delta * 18);
            ent.rotX = THREE.MathUtils.damp(ent.rotX, ent.targetRotX, 18, delta);
          }

          ent.rig.root.visible = true;
          ent.clickProxy.visible = true;
          ent.rig.root.position.set(ent.x, ent.y, ent.z);
          ent.rig.root.rotation.x = ent.rotX;
          ent.rig.root.rotation.y = ent.rotY;

          // Remote Boat Sync (town river & island ocean)
          if (ent.boatRig) {
            const showBoat = ent.boatActive && (z === 'town' || z === 'island');
            ent.boatRig.boat.visible = showBoat;
            if (showBoat) {
              const bWaterY = z === 'island' ? ISLAND_WATER_Y : RIVER_WATER_Y;
              const bBob = Math.sin(elapsed * 2.2) * 0.028;
              ent.boatRig.boat.position.set(
                THREE.MathUtils.damp(ent.boatRig.boat.position.x, ent.boatX, 20, delta),
                bWaterY + 0.05 + bBob,
                THREE.MathUtils.damp(ent.boatRig.boat.position.z, ent.boatZ, 20, delta),
              );
              let brDiff = ent.boatRotY - ent.boatRig.boat.rotation.y;
              while (brDiff > Math.PI) brDiff -= Math.PI * 2;
              while (brDiff < -Math.PI) brDiff += Math.PI * 2;
              ent.boatRig.boat.rotation.set(
                ent.boatMoving ? Math.sin(elapsed * 4.4) * 0.02 : Math.sin(elapsed * 1.7) * 0.01,
                ent.boatRig.boat.rotation.y + brDiff * Math.min(1, delta * 16),
                Math.cos(elapsed * 2.1) * 0.018,
              );
              if (
                ent.boatRig.driveKind === 'oars' &&
                ent.boatRig.oarLPivot &&
                ent.boatRig.oarRPivot
              ) {
                const stroke = ent.boatMoving ? Math.sin(elapsed * 5.6) * 0.42 : 0;
                const dip = ent.boatMoving ? Math.cos(elapsed * 5.6) * 0.14 : 0;
                ent.boatRig.oarLPivot.rotation.set(dip, stroke, 0);
                ent.boatRig.oarRPivot.rotation.set(dip, -stroke, 0);
              } else if (ent.boatRig.driveKind === 'pedal') {
                const spin = ent.boatMoving ? elapsed * 6.8 : 0;
                if (ent.boatRig.wheelPivot) ent.boatRig.wheelPivot.rotation.x = spin;
                if (ent.boatRig.crankPivot) ent.boatRig.crankPivot.rotation.x = spin * 0.72;
                if (ent.boatRig.pedalLPivot) ent.boatRig.pedalLPivot.rotation.x = -spin * 0.72;
                if (ent.boatRig.pedalRPivot) ent.boatRig.pedalRPivot.rotation.x = -spin * 0.72;
              } else if (ent.boatRig.driveKind === 'motor') {
                if (ent.boatRig.wheelPivot) {
                  ent.boatRig.wheelPivot.rotation.z = ent.boatMoving
                    ? elapsed * 14
                    : elapsed * 1.8;
                }
              }
              if (ent.boatRig.sailPivot) {
                ent.boatRig.sailPivot.rotation.z = Math.sin(elapsed * 2.1) * 0.06;
                ent.boatRig.sailPivot.rotation.y = ent.boatMoving
                  ? Math.sin(elapsed * 4.2) * 0.14
                  : Math.sin(elapsed * 1.5) * 0.06;
              }
            }
          }

          // Remote MountRig Animation (never hidden)
          let remoteMountAnim: AvatarMountAnimParams | undefined;
          const rMountDef = getMountDefinition(ent.meta.activeMountId);
          const isRemoteMountPose =
            ent.pose === 'skate_idle' ||
            ent.pose === 'skate_ride' ||
            ent.pose === 'skate_push' ||
            ent.pose === 'lotus_idle' ||
            ent.pose === 'lotus_ride' ||
            ent.pose === 'broom_idle' ||
            ent.pose === 'broom_ride' ||
            ent.pose === 'bike_idle' ||
            ent.pose === 'bike_ride';
          const remoteMountVisible = Boolean(
            ent.mountRig && rMountDef && !ent.boatActive && isRemoteMountPose,
          );
          if (ent.mountRig) {
            ent.mountRig.root.visible = remoteMountVisible;
          }
          if (remoteMountVisible && ent.mountRig && rMountDef) {
            ent.mountRig.root.position.lerp(_remoteZeroVec, Math.min(1, delta * 18));
            if (rMountDef.kind === 'skateboard') {
              const wheelR = 0.05;
              const isMoving = ent.pose === 'skate_ride' || ent.pose === 'skate_push';
              if (isMoving && ent.speed > 0.28) {
                ent.skateMoveSec += delta;
                ent.bikeWheelAngle += (ent.speed * delta) / wheelR;
              } else {
                ent.skateMoveSec = 0;
              }
              ent.skateIdleBlend = THREE.MathUtils.damp(
                ent.skateIdleBlend,
                ent.pose === 'skate_idle' ? 1 : 0,
                12,
                delta,
              );
              const pushPhase =
                ent.pose === 'skate_push' && ent.skateMoveSec > 2.0
                  ? ((ent.skateMoveSec - 2.0) % 3.1) / 0.78
                  : 0;
              remoteMountAnim = {pushPhase, idleBlend: ent.skateIdleBlend};
              updateMountAnimation(ent.mountRig, {
                pose: ent.pose === 'skate_push' ? 'skate_push' : ent.pose === 'skate_ride' ? 'skate_ride' : 'skate_idle',
                elapsed,
                speed: ent.speed,
                wheelAngle: ent.bikeWheelAngle,
                crankAngle: 0,
                steerAngle: 0,
                wheelRadius: wheelR,
                idlePop: 0,
                idleBlend: ent.skateIdleBlend,
              });
            } else if (rMountDef.kind === 'lotus_umbrella' || rMountDef.kind === 'dong_thap_lotus') {
              const ib = ent.pose === 'lotus_ride' ? 0 : 1;
              remoteMountAnim = {idleBlend: ib};
              updateMountAnimation(ent.mountRig, {
                pose: ent.pose === 'lotus_ride' ? 'lotus_ride' : 'lotus_idle',
                elapsed,
                speed: ent.speed,
                wheelAngle: 0,
                crankAngle: 0,
                steerAngle: 0,
                wheelRadius: 0.3,
                idleBlend: ib,
              });
            } else if (rMountDef.kind === 'witch_broom') {
              const ib = ent.pose === 'broom_ride' ? 0 : 1;
              remoteMountAnim = {idleBlend: ib};
              updateMountAnimation(ent.mountRig, {
                pose: ent.pose === 'broom_ride' ? 'broom_ride' : 'broom_idle',
                elapsed,
                speed: ent.speed,
                wheelAngle: 0,
                crankAngle: 0,
                steerAngle: 0,
                wheelRadius: 0.3,
                idleBlend: ib,
              });
            } else {
              const wheelR = 0.355;
              let rDelta = ent.rotY - ent.prevRotForSteer;
              while (rDelta > Math.PI) rDelta -= Math.PI * 2;
              while (rDelta < -Math.PI) rDelta += Math.PI * 2;
              const targetSteer = THREE.MathUtils.clamp(
                (rDelta / Math.max(0.001, delta)) * 0.14,
                -0.45,
                0.45,
              );
              ent.bikeSteerAngle = THREE.MathUtils.damp(ent.bikeSteerAngle, targetSteer, 11, delta);
              const isBikeMoving = ent.pose === 'bike_ride' && ent.speed > 0.22;
              ent.bikeIdleBlend = THREE.MathUtils.damp(
                ent.bikeIdleBlend,
                ent.pose === 'bike_idle' ? 1 : 0,
                9.5,
                delta,
              );
              if (isBikeMoving) {
                ent.bikeWheelAngle += (ent.speed * delta) / wheelR;
                ent.bikeCrankAngle += THREE.MathUtils.clamp(ent.speed * 1.05, 1.8, 7.6) * delta;
              }
              remoteMountAnim = {
                crankAngle: ent.bikeCrankAngle,
                steerAngle: ent.bikeSteerAngle,
                idleBlend: ent.bikeIdleBlend,
                leanAngle: 0,
              };
              updateMountAnimation(ent.mountRig, {
                pose: ent.pose === 'bike_ride' ? 'bike_ride' : 'bike_idle',
                elapsed,
                speed: ent.speed,
                wheelAngle: ent.bikeWheelAngle,
                crankAngle: ent.bikeCrankAngle,
                steerAngle: ent.bikeSteerAngle,
                wheelRadius: wheelR,
                idleBlend: ent.bikeIdleBlend,
                leanAngle: 0,
              });
            }
          }
          ent.prevRotForSteer = ent.rotY;

          updateAvatarRigAnimation(
            ent.rig,
            ent.pose,
            elapsed,
            ent.meta.avatar.eyeStyle === 'happy_arc',
            ent.poseProgress,
            remoteMountAnim,
          );

          if (
            remoteMountVisible &&
            rMountDef &&
            (rMountDef.kind === 'lotus_umbrella' || rMountDef.kind === 'dong_thap_lotus') &&
            ent.mountRig?.lotusPivot &&
            ent.rig.rightHand
          ) {
            ent.rig.root.updateMatrixWorld(true);
            ent.rig.rightHand.getWorldPosition(_remoteLotusHandVec);
            ent.rig.root.worldToLocal(_remoteLotusHandVec);
            ent.mountRig.lotusPivot.position.copy(_remoteLotusHandVec);
          }

          // Remote Companion Pet interpolation + animation
          if (ent.petRig && ent.meta.companionPet) {
            ent.petRig.root.visible = true;
            const prevPx = ent.petX;
            const prevPz = ent.petZ;
            const petGap = Math.hypot(
              ent.targetPetX - ent.petX,
              ent.targetPetY - ent.petY,
              ent.targetPetZ - ent.petZ,
            );
            if (petGap > 8.0) {
              ent.petX = ent.targetPetX;
              ent.petY = ent.targetPetY;
              ent.petZ = ent.targetPetZ;
              ent.petRotY = ent.targetPetRotY;
            } else {
              ent.petX = THREE.MathUtils.damp(ent.petX, ent.targetPetX, 18, delta);
              ent.petY = THREE.MathUtils.damp(ent.petY, ent.targetPetY, 18, delta);
              ent.petZ = THREE.MathUtils.damp(ent.petZ, ent.targetPetZ, 18, delta);
              let prDiff = ent.targetPetRotY - ent.petRotY;
              while (prDiff > Math.PI) prDiff -= Math.PI * 2;
              while (prDiff < -Math.PI) prDiff += Math.PI * 2;
              ent.petRotY += prDiff * Math.min(1, delta * 14);
            }
            const petMoveSpd = Math.hypot(ent.petX - prevPx, ent.petZ - prevPz) / Math.max(0.008, delta);
            const isFlyPet = PET_CATALOG[ent.meta.companionPet.speciesId].moveType === 'fly';
            const pScale = isFlyPet ? 1.35 : 1.34;
            ent.petRig.root.position.set(ent.petX, ent.petY, ent.petZ);
            ent.petRig.root.rotation.y = ent.petRotY;
            const rPetMode: PetAnimMode =
              ent.petPlayKind === 'jump'
                ? 'play_jump'
                : ent.petPlayKind === 'circle'
                  ? 'play_circle'
                  : isFlyPet
                    ? 'fly'
                    : petMoveSpd > 0.14
                      ? 'walk'
                      : 'idle';
            updatePetAnimation(
              ent.petRig,
              rPetMode,
              elapsed,
              {baseScale: pScale, hoverHeight: 0},
            );
          }
        }

        if (clickTargetVisibilityChanged) {
          refreshClickTargetsWithPet();
        }
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
              _petAnchorVec.y += PET_CATALOG[curPetTag.speciesId].moveType === 'fly' ? 0.58 : 0.72;
            } else if (petCompanion.rig) {
              petCompanion.rig.root.getWorldPosition(_petAnchorVec);
              _petAnchorVec.y += PET_CATALOG[curPetTag.speciesId].moveType === 'fly' ? 0.66 : 0.84;
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

        // Project Remote Players & Remote Pets crisp DOM nameplates
        for (const ent of remoteEntities.values()) {
          if (!ent.visibleInZone || isEditingHome) {
            if (ent.nameDom) ent.nameDom.style.display = 'none';
            if (ent.petNameDom) ent.petNameDom.style.display = 'none';
            continue;
          }
          if (ent.nameDom) {
            ent.rig.headPivot.getWorldPosition(_remoteHeadVec);
            _remoteHeadVec.y += ent.rig.headTopAbovePivot + 0.14;
            const dCam = camera.position.distanceTo(_remoteHeadVec);
            const alpha = dCam <= 22 ? 1 : dCam >= 28 ? 0 : 1 - (dCam - 22) / 6;
            _projVec.copy(_remoteHeadVec).project(camera);
            if (alpha > 0.02 && _projVec.z >= -1 && _projVec.z <= 1) {
              const px = ((_projVec.x + 1) / 2) * cwNow;
              const py = ((-_projVec.y + 1) / 2) * chNow;
              ent.nameDom.style.display = 'block';
              ent.nameDom.style.opacity = alpha.toFixed(2);
              ent.nameDom.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0) translate(-50%, -100%)`;
            } else {
              ent.nameDom.style.display = 'none';
            }
          }
          if (ent.petNameDom) {
            const comp = ent.meta.companionPet;
            const heldRig = ent.rig.heldPetRig;
            if (comp && (heldRig || ent.petRig)) {
              if (heldRig) {
                heldRig.root.getWorldPosition(_remotePetVec);
                _remotePetVec.y += PET_CATALOG[comp.speciesId].moveType === 'fly' ? 0.58 : 0.72;
              } else if (ent.petRig) {
                ent.petRig.root.getWorldPosition(_remotePetVec);
                _remotePetVec.y += PET_CATALOG[comp.speciesId].moveType === 'fly' ? 0.66 : 0.84;
              }
              const dCamP = camera.position.distanceTo(_remotePetVec);
              const pAlpha = dCamP <= 18 ? 1 : dCamP >= 23 ? 0 : 1 - (dCamP - 18) / 5;
              _projVec.copy(_remotePetVec).project(camera);
              if (pAlpha > 0.02 && _projVec.z >= -1 && _projVec.z <= 1) {
                const bx = ((_projVec.x + 1) / 2) * cwNow;
                const by = ((-_projVec.y + 1) / 2) * chNow;
                ent.petNameDom.style.display = 'block';
                ent.petNameDom.style.opacity = pAlpha.toFixed(2);
                ent.petNameDom.style.transform = `translate3d(${bx.toFixed(1)}px, ${by.toFixed(1)}px, 0) translate(-50%, -100%)`;
              } else {
                ent.petNameDom.style.display = 'none';
              }
            } else {
              ent.petNameDom.style.display = 'none';
            }
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
          z !== 'town' || parachuteCtrl.active
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

        const nextNearTownBalloon =
          z === 'town' &&
          !parachuteCtrl.active &&
          Math.hypot(playerPos.x - 0.95, playerPos.z - -64.8) <= 5.8;
        if (nextNearTownBalloon !== nearTownBalloonRef.current) {
          nearTownBalloonRef.current = nextNearTownBalloon;
          setNearTownBalloon(nextNearTownBalloon);
        }

        const nextNearIslandBalloon =
          z === 'island' &&
          !swimState.active &&
          !boatState.active &&
          Math.hypot(playerPos.x - ISLAND_BALLOON_POS.x, playerPos.z - ISLAND_BALLOON_POS.z) <= 5.8;
        if (nextNearIslandBalloon !== nearIslandBalloonRef.current) {
          nearIslandBalloonRef.current = nextNearIslandBalloon;
          setNearIslandBalloon(nextNearIslandBalloon);
        }

        const nextNearIslandPier =
          z === 'island' &&
          !swimState.active &&
          !boatState.active &&
          Math.hypot(playerPos.x - 0, playerPos.z - 31.8) <= 5.2;
        if (nextNearIslandPier !== nearIslandPierRef.current) {
          nearIslandPierRef.current = nextNearIslandPier;
          setNearIslandPier(nextNearIslandPier);
        }

        if (currentAnchors.length > 0) {
          const nextTags: ProjectedTag[] = [];
          const nowMs = performance.now();
          let arcadeCandidates: Array<{anchor: (typeof currentAnchors)[number]; dist: number}> | null =
            z === 'arcade' ? [] : null;
          for (const a of currentAnchors) {
            if (a.id === 'campsite_bbq_tag' && (z !== 'town' || nowMs >= bbqLabelHideAtMs)) {
              continue;
            }
            if (a.id === 'balloon_station' && z === 'town') {
              if (Math.hypot(playerPos.x - a.worldPos.x, playerPos.z - a.worldPos.z) > 6.5) {
                continue;
              }
            }
            if (a.id === 'island_balloon_station' && z === 'island') {
              if (Math.hypot(playerPos.x - a.worldPos.x, playerPos.z - a.worldPos.z) > 6.8) {
                continue;
              }
            }
            const isNpcAnchor = Boolean(
              a.isNpc || a.id.startsWith('npc_') || a.id.endsWith('_npc'),
            );
            if (isNpcAnchor) {
              const maxNpcDist = a.maxLabelDist ?? 3.6;
              if (
                (z === 'mall' && (mallState.floor !== 1 || mallState.ridingLane !== null)) ||
                Math.hypot(playerPos.x - a.worldPos.x, playerPos.z - a.worldPos.z) > maxNpcDist
              ) {
                continue;
              }
            }
            if (arcadeCandidates) {
              const dist = Math.hypot(playerPos.x - a.worldPos.x, playerPos.z - a.worldPos.z);
              const maxArcadeDist = a.maxLabelDist ?? (a.id.startsWith('exit') ? 4.2 : 3.75);
              if (dist <= maxArcadeDist) {
                arcadeCandidates.push({anchor: a, dist});
              }
              continue;
            }
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
          if (arcadeCandidates && arcadeCandidates.length > 0) {
            arcadeCandidates.sort((lhs, rhs) => lhs.dist - rhs.dist);
            const picked = arcadeCandidates.slice(0, 2);
            for (const {anchor: a} of picked) {
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
          }
          const changed =
            nextTags.length !== lastTagSnapshot.length ||
            nextTags.some((t, idx) => {
              const prev = lastTagSnapshot[idx];
              return (
                !prev ||
                prev.id !== t.id ||
                prev.label !== t.label ||
                Math.abs(prev.x - t.x) >= 0.5 ||
                Math.abs(prev.y - t.y) >= 0.5
              );
            });
          if (changed) {
            lastTagSnapshot = nextTags;
            setTags(nextTags);
          }
          lastHadTags = true;
        } else if (lastHadTags) {
          lastTagSnapshot = [];
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

        if (z === 'home') {
          let closestApp: {
            id: string;
            kind: 'microwave' | 'mini_oven' | 'kitchen_counter';
            name: string;
          } | null = null;
          let bestAppD = 2.45;
          for (const pf of stateRef.current.placedFurniture) {
            const cat = FURNITURE_BY_ID[pf.catalogId];
            if (!cat) continue;
            if (cat.interactive === 'microwave' || cat.interactive === 'mini_oven') {
              const d = Math.hypot(playerPos.x - pf.x, playerPos.z - pf.z);
              if (d < bestAppD) {
                bestAppD = d;
                closestApp = {
                  id: pf.instanceId,
                  kind: cat.interactive,
                  name: cat.kind === 'microwave' ? 'Lò Vi Sóng' : 'Lò Nướng Mini',
                };
              }
            }
          }
          if (!closestApp) {
            let bestCounterD = 1.65;
            for (const pf of stateRef.current.placedFurniture) {
              const cat = FURNITURE_BY_ID[pf.catalogId];
              if (!cat || cat.kind !== 'kitchen_l_counter') continue;
              const cos = Math.cos(pf.rotY);
              const sin = Math.sin(pf.rotY);
              const dx = playerPos.x - pf.x;
              const dz = playerPos.z - pf.z;
              const lx = dx * cos - dz * sin;
              const lz = dx * sin + dz * cos;
              const dBack = Math.hypot(
                lx - THREE.MathUtils.clamp(lx, -1.85, 1.79),
                lz - THREE.MathUtils.clamp(lz, -2.25, -1.13),
              );
              const dRight = Math.hypot(
                lx - THREE.MathUtils.clamp(lx, 0.71, 1.83),
                lz - THREE.MathUtils.clamp(lz, -1.27, 3.17),
              );
              const dCounter = Math.min(dBack, dRight);
              if (dCounter < bestCounterD) {
                bestCounterD = dCounter;
                closestApp = {
                  id: pf.instanceId,
                  kind: 'kitchen_counter',
                  name: 'Bếp Nấu',
                };
              }
            }
          }
          const nextAppKey = closestApp ? `${closestApp.id}:${closestApp.kind}` : '';
          if (nextAppKey !== nearbyApplianceKeyRef.current) {
            nearbyApplianceKeyRef.current = nextAppKey;
            setNearbyAppliance(closestApp);
          }
        } else if (nearbyApplianceKeyRef.current !== '') {
          nearbyApplianceKeyRef.current = '';
          setNearbyAppliance(null);
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

        if (selectedRemoteRef.current) {
          const ent = remoteEntities.get(selectedRemoteRef.current.playerId);
          if (!ent || !ent.visibleInZone || !isPublicMultiplayerZone(z)) {
            selectedRemoteRef.current = null;
            setRemoteArcMenuPos(null);
          } else {
            _projVec.set(ent.x, ent.y + 1.32, ent.z).project(camera);
            if (_projVec.z <= 1) {
              const rawX = ((_projVec.x + 1) / 2) * cw;
              const rawY = ((-_projVec.y + 1) / 2) * ch;
              const padX = Math.min(185, cw * 0.36);
              const minY = Math.min(165, ch * 0.42);
              const nx = Math.max(padX, Math.min(cw - padX, rawX));
              const ny = Math.max(minY, Math.min(ch - 70, rawY));
              setRemoteArcMenuPos((prev) =>
                prev &&
                prev.player.id === ent.id &&
                prev.player.updatedAt === ent.meta.updatedAt &&
                Math.abs(prev.x - nx) < 1 &&
                Math.abs(prev.y - ny) < 1
                  ? prev
                  : {player: ent.meta, x: nx, y: ny},
              );
            }
          }
        }
      }

      scheduleNextFrame();
    }

    if (!isSoftwareGl) {
      try {
        renderer.compile(scene, camera);
      } catch {
        // ignore shader pre-compile issues
      }
    }
    tick();

    return () => {
      disposed = true;
      unsubRoster();
      unsubPose();
      for (const id of Array.from(remoteEntities.keys())) {
        removeRemoteEntity(id);
      }
      cancelAnimationFrame(frameId);
      clearTimeout(hiddenTimerId);
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
      if (mountRig) {
        playerRig.root.remove(mountRig.root);
        mountRig.dispose();
        mountRig = null;
      }
      playerRig.heldPetRig?.dispose();
      tourAnnaRig.heldPetRig?.dispose();
      scene.remove(tourAnnaRig.root);
      tourAnnaRig.root.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          m.geometry?.dispose();
          if (Array.isArray(m.material)) {
            m.material.forEach((mat) => mat.dispose());
          } else {
            m.material?.dispose();
          }
        }
      });
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

  const handleOpenNearbyAppliance = () => {
    if (!nearbyAppliance) return;
    if (nearbyAppliance.kind === 'microwave') {
      soundFX.sparkle();
      callbacksRef.current.onOpenMicrowave();
      return;
    }
    if (nearbyAppliance.kind === 'mini_oven') {
      soundFX.sparkle();
      callbacksRef.current.onOpenMiniOven();
      return;
    }
    const placedMicro = stateRef.current.placedFurniture.find(
      (pf) => FURNITURE_BY_ID[pf.catalogId]?.interactive === 'microwave',
    );
    if (placedMicro) {
      soundFX.sparkle();
      callbacksRef.current.onOpenMicrowave();
      return;
    }
    const placedOven = stateRef.current.placedFurniture.find(
      (pf) => FURNITURE_BY_ID[pf.catalogId]?.interactive === 'mini_oven',
    );
    if (placedOven) {
      soundFX.sparkle();
      callbacksRef.current.onOpenMiniOven();
      return;
    }
    soundFX.tap();
    showBubble(
      'Bếp chưa có Lò Vi Sóng / Lò Nướng Mini! Hãy mua tại Tiệm Nội Thất (Thị Trấn) rồi mở Tủ Nội Thất đặt lên bàn bếp để nấu nguyên liệu Peppa nhé.',
    );
  };

  const selectedPlacedItem =
    zone === 'home' && editFurnitureMode && selectedFurnitureId
      ? placedFurniture.find((p) => p.instanceId === selectedFurnitureId)
      : null;
  const selectedCatalogItem = selectedPlacedItem
    ? FURNITURE_BY_ID[selectedPlacedItem.catalogId]
    : null;
  const selectedFarmPlacedItem =
    zone === 'garden' && editFarmDecorMode && selectedFarmDecorId
      ? placedFarmDecor.find((p) => p.instanceId === selectedFarmDecorId)
      : null;
  const selectedFarmCatalogItem = selectedFarmPlacedItem
    ? FARM_DECOR_BY_ID[selectedFarmPlacedItem.catalogId]
    : null;
  const isEditingAny =
    (zone === 'home' && editFurnitureMode) || (zone === 'garden' && editFarmDecorMode);

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

      {/* Radial Arc Menu when tapping another online player */}
      {remoteArcMenuPos && isPublicMultiplayerZone(zone) && (
        <RemotePlayerArcMenu
          player={remoteArcMenuPos.player}
          screenX={remoteArcMenuPos.x}
          screenY={remoteArcMenuPos.y}
          myCoins={stats.coins}
          myCoinGame={stats.coinGame ?? 0}
          onSendGift={(target, currency, amount) => {
            if (callbacksRef.current.onSendPlayerGift) {
              return callbacksRef.current.onSendPlayerGift(target, currency, amount);
            }
            return {ok: false, message: 'Tính năng tặng xu chưa sẵn sàng.'};
          }}
          onClose={() => {
            selectedRemoteRef.current = null;
            setRemoteArcMenuPos(null);
          }}
        />
      )}

      {/* May Mall Panoramic Glass Elevator Action HUD */}
      {zone === 'town' && mallElevatorHud !== 'none' && (
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

      {/* Parachute Glide Status HUD Banner */}
      {zone === 'town' && isParachutingHud && (
        <div className="phone-ui pointer-events-none absolute bottom-5 left-1/2 z-30 -translate-x-1/2">
          <div className="anim-pop flex items-center gap-2 rounded-2xl border-2 border-[#E86C5D] bg-[#FFF8F2]/95 px-4 py-2 text-xs font-extrabold text-[#5E281B] shadow-lg whitespace-nowrap">
            <ArrowDown className="h-4 w-4 shrink-0 text-[#E86C5D]" />
            <span>Đang lướt dù đáp đất · Dùng Joystick chọn hướng</span>
          </div>
        </div>
      )}

      {/* Hot Air Balloon Departure Button ("Qua Đảo") when close to Town Balloon Station */}
      {zone === 'town' && nearTownBalloon && !isParachutingHud && (
        <div className="phone-ui absolute bottom-5 left-1/2 z-30 flex -translate-x-1/2 justify-center">
          <button
            type="button"
            onClick={() => {
              goToIslandActionRef.current?.();
            }}
            className="anim-pop flex min-h-[42px] items-center gap-2 rounded-2xl border-2 border-[#2A7EA0] bg-[#E8F8FF]/95 px-5 py-2 text-xs font-extrabold text-[#124863] shadow-lg transition-transform hover:scale-105 active:scale-95"
          >
            <Wind className="h-4 w-4 text-[#2A7EA0]" />
            <span>Qua Đảo</span>
          </button>
        </div>
      )}

      {/* Hot Air Balloon Return Button ("Về Mây") when close to Island Balloon Station */}
      {zone === 'island' && nearIslandBalloon && !isSwimmingHud && !isBoatingHud && (
        <div className="phone-ui absolute bottom-5 left-1/2 z-30 flex -translate-x-1/2 justify-center">
          <button
            type="button"
            onClick={() => {
              goToTownFromIslandActionRef.current?.();
            }}
            className="anim-pop flex min-h-[42px] items-center gap-2 rounded-2xl border-2 border-[#D96B52] bg-[#FFF4EE]/95 px-5 py-2 text-xs font-extrabold text-[#6E2D1D] shadow-lg transition-transform hover:scale-105 active:scale-95"
          >
            <Wind className="h-4 w-4 text-[#D96B52]" />
            <span>Về Mây</span>
          </button>
        </div>
      )}

      {/* Island Boat Pier Swim Entry HUD */}
      {zone === 'island' && nearIslandPier && !isSwimmingHud && !isBoatingHud && (
        <div className="phone-ui absolute bottom-5 left-1/2 z-30 flex -translate-x-1/2 justify-center">
          <button
            type="button"
            onClick={() => {
              toggleIslandSwimActionRef.current?.();
            }}
            className="anim-pop flex min-h-[42px] items-center gap-2 rounded-2xl border-2 border-[#1E82A8] bg-[#E5F8FF]/95 px-5 py-2 text-xs font-extrabold text-[#124A63] shadow-lg transition-transform hover:scale-105 active:scale-95"
          >
            <Waves className="h-4 w-4 text-[#1E82A8]" />
            <span>Bơi Biển</span>
          </button>
        </div>
      )}

      {/* Top-Left Compact Smartphone Icon Button */}
      {!isEditingAny && (
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
          {claimableLevelGiftsCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full border border-[#FFF9EF] bg-[#EF4444] px-1 text-[9px] font-black text-white shadow-xs">
              {claimableLevelGiftsCount}
            </span>
          )}
        </button>
      )}

      {/* Top-Left Standalone Backpack ('Túi Đồ') Button beside Phone */}
      {!isEditingAny && (
        <button
          type="button"
          onClick={() => {
            soundFX.tap();
            onOpenBag();
          }}
          aria-label="Mở Túi Đồ"
          title="Túi Đồ"
          className="phone-ui absolute top-2.5 left-[62px] z-30 flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-[#3C3128] bg-[#FFF4E3]/95 text-[#8F5320] shadow-lg transition-transform hover:scale-105 active:scale-95"
        >
          <Backpack className="h-5 w-5" strokeWidth={2.2} />
          {(fishingRod.equipped ||
            bugNet.equipped ||
            Boolean(equippedFoodId && (bbqFoods[equippedFoodId] ?? 0) > 0)) && (
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-[#FFF9EF] bg-[#45A168]" />
          )}
        </button>
      )}

      {/* Top-Left Release Pet ('X') Button beside Backpack when hugging / shoulder-perching a pet */}
      {carriedPetId && activePet && !isEditingAny && (
        <button
          type="button"
          onClick={() => {
            soundFX.tap();
            onReleasePet();
          }}
          aria-label={
            PET_CATALOG[activePet.speciesId].moveType === 'fly'
              ? 'Dừng bay quanh'
              : 'Dừng đi quanh'
          }
          title={
            PET_CATALOG[activePet.speciesId].moveType === 'fly'
              ? 'Dừng bay quanh'
              : 'Dừng đi quanh'
          }
          className="phone-ui anim-pop absolute top-2.5 left-[118px] z-30 flex h-11 items-center gap-1.5 rounded-2xl border-2 border-[#3C3128] bg-[#FFF2EA]/95 px-2.5 text-[#3B2B1E] shadow-lg transition-transform hover:scale-105 active:scale-95"
        >
          <PetSpeciesIcon speciesId={activePet.speciesId} className="h-6 w-6 shrink-0" />
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#DF5E56] text-white shadow-xs">
            <X className="h-3.5 w-3.5 stroke-[3]" />
          </span>
        </button>
      )}

      {/* Top-Left Quick Mount / Dismount Button when player owns any mount */}
      {ownedMounts.ownedIds.length > 0 &&
        !isEditingAny &&
        (() => {
          const quickId =
            ownedMounts.activeMountId ?? ownedMounts.lastMountId ?? ownedMounts.ownedIds[0];
          const quickDef = getMountDefinition(quickId);
          if (!quickDef) return null;
          const isMountedHud = ownedMounts.activeMountId !== null;
          return (
            <button
              type="button"
              onClick={() => {
                soundFX.tap();
                onToggleMount(quickId);
              }}
              aria-label={isMountedHud ? `Xuống ${quickDef.name}` : `Cưỡi ${quickDef.name}`}
              title={isMountedHud ? `Xuống ${quickDef.name}` : `Cưỡi ${quickDef.name}`}
              className={`phone-ui anim-pop absolute top-2.5 z-30 flex h-11 items-center gap-1.5 rounded-2xl border-2 px-2.5 shadow-lg transition-transform hover:scale-105 active:scale-95 ${
                carriedPetId && activePet ? 'left-[220px]' : 'left-[118px]'
              } ${
                isMountedHud
                  ? 'border-[#2E7D55] bg-[#EAF9F0]/95 text-[#1F5E3F]'
                  : 'border-[#3C3128] bg-[#FFF8EB]/95 text-[#4A3525]'
              }`}
            >
              {quickDef.kind === 'skateboard' ? (
                <SkateboardMountIcon className="h-6 w-6 shrink-0" />
              ) : quickDef.kind === 'lotus_umbrella' ? (
                <LotusUmbrellaMountIcon className="h-6 w-6 shrink-0" />
              ) : quickDef.kind === 'dong_thap_lotus' ? (
                <DongThapLotusMountIcon className="h-6 w-6 shrink-0" />
              ) : quickDef.kind === 'witch_broom' ? (
                <WitchBroomMountIcon className="h-6 w-6 shrink-0" />
              ) : (
                <BicycleMountIcon className="h-6 w-6 shrink-0" />
              )}
              <span className="text-[11px] font-black leading-none whitespace-nowrap">
                {isMountedHud ? 'Xuống' : 'Cưỡi'}
              </span>
            </button>
          );
        })()}

      {/* Compact Top-Left Held Food/Drink Quick-Eat Pill & Low-Hunger (<5%) Speed Warning */}
      {!isEditingAny &&
        ((equippedFoodId && (bbqFoods[equippedFoodId] ?? 0) > 0) ||
          (stats.hunger ?? 100) < HUNGER_HUNGRY_THRESHOLD) && (
          <div className="phone-ui absolute top-[62px] left-2.5 z-30 flex max-w-[calc(100vw-20px)] flex-col items-start gap-1.5">
            {equippedFoodId && (bbqFoods[equippedFoodId] ?? 0) > 0 && (() => {
              const heldDef = BBQ_FOOD_CATALOG[equippedFoodId];
              const verb = heldDef?.kind === 'drink' ? 'Uống' : 'Ăn';
              return (
                <div className="anim-pop flex max-w-full flex-wrap items-center gap-1 rounded-2xl border-2 border-[#3C3128] bg-[#FFF8EB]/95 p-1 pr-1.5 shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      const res = onEatEquippedFood();
                      if (res.ok) {
                        soundFX.sparkle();
                      } else {
                        soundFX.tap();
                      }
                      showBubble(res.message);
                    }}
                    className="flex items-center gap-1.5 rounded-xl bg-[#D96B38] px-2.5 py-1 text-[11px] font-black text-white shadow-xs transition active:scale-95"
                  >
                    <HandheldFoodIcon foodId={equippedFoodId} className="h-4 w-4 shrink-0" />
                    <span>
                      {verb} {heldDef.name} (x{bbqFoods[equippedFoodId] ?? 0})
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.tap();
                      onUnequipFood();
                    }}
                    title="Cất xuống"
                    className="rounded-lg bg-[#EFE0C9] px-2 py-1 text-[10px] font-extrabold text-[#5B422E] transition active:scale-95"
                  >
                    Cất
                  </button>
                </div>
              );
            })()}

            {(stats.hunger ?? 100) < HUNGER_HUNGRY_THRESHOLD && (
              <div className="anim-pop flex max-w-full items-center gap-1.5 rounded-xl border border-[#D86A3B] bg-[#FFF0E8]/95 px-2.5 py-1 text-[11px] leading-snug font-extrabold text-[#B53D1E] shadow-md">
                <Utensils className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {(stats.hunger ?? 100) < HUNGER_NEAR_EMPTY_THRESHOLD
                    ? `Đói gần cạn (${Math.round(stats.hunger ?? 0)}%) · Đi chậm! Hãy mở Túi đồ ăn thức ăn`
                    : `Đang đói (${Math.round(stats.hunger ?? 0)}%) · Đi chậm`}
                </span>
              </div>
            )}
          </div>
        )}

      {/* Active Joyboy Delivery Reminder Badge */}
      {joyboyDelivery.activeOrder && !isEditingAny && (
        <button
          type="button"
          onClick={() => {
            soundFX.tap();
            const o = joyboyDelivery.activeOrder!;
            showBubble(
              `Đơn Joyboy: Giao "${o.parcelName}" cho ${o.targetNpcName} (${o.locationHint}) · +${o.rewardCoins} Xu`,
            );
          }}
          className={`phone-ui anim-pop absolute right-2.5 z-30 flex max-w-[200px] items-center gap-1.5 rounded-2xl border-2 border-[#C27829] bg-[#FFF6E3]/95 px-2.5 py-1.5 text-left text-[#593514] shadow-lg transition hover:scale-[1.02] active:scale-95 ${
            zone === 'home' || zone === 'garden' ? 'top-12' : 'top-2.5'
          }`}
        >
          <Package className="h-4 w-4 shrink-0 text-[#D97724]" />
          <div className="min-w-0">
            <div className="truncate text-[10px] font-black leading-tight">
              Giao: {joyboyDelivery.activeOrder.targetNpcName}
            </div>
            <div className="truncate text-[9px] font-bold text-[#8A5B2C]">
              +{joyboyDelivery.activeOrder.rewardCoins} Xu · Chạm xem nơi nhận
            </div>
          </div>
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

      {/* Compact collapsible top-right arrow toolbar inside Garden */}
      {zone === 'garden' && (
        <div className="absolute top-2.5 right-2.5 z-30 flex items-center gap-1.5">
          {(farmToolsOpen || editFarmDecorMode) && (
            <div className="anim-pop flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  soundFX.tap();
                  onOpenFarmDecorBag();
                }}
                className="flex min-h-[30px] items-center gap-1 rounded-xl border-2 border-[#4B8A57] bg-[#F4FBF1] px-2 py-1 text-[11px] font-bold text-[#2F5B39] shadow-md transition-transform active:scale-95"
              >
                <Sprout className="h-3.5 w-3.5 text-[#4E9A5A]" />
                <span>Túi trang trí</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundFX.tap();
                  if (editFarmDecorMode) setFarmToolsOpen(false);
                  onToggleEditFarmDecor();
                }}
                className={`flex min-h-[30px] items-center gap-1 rounded-xl border-2 px-2 py-1 text-[11px] font-bold shadow-md transition-transform active:scale-95 ${
                  editFarmDecorMode
                    ? 'border-[#3E7E4B] bg-[#55A063] text-white'
                    : 'border-[#4B8A57] bg-[#F4FBF1] text-[#2F5B39]'
                }`}
              >
                <Move className="h-3.5 w-3.5" />
                <span>{editFarmDecorMode ? 'Xong' : 'Di chuyển'}</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              soundFX.tap();
              setFarmToolsOpen((prev) => !prev);
            }}
            aria-label="Mở công cụ trang trí nông trại"
            className="flex h-8 w-8 items-center justify-center rounded-xl border-2 border-[#4B8A57] bg-[#F4FBF1] text-[#2F5B39] shadow-md transition-transform active:scale-95"
          >
            {farmToolsOpen || editFarmDecorMode ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>
      )}

      {/* Compact Top-Right CoinGame & HDDOLL Quick Hub inside Arcade */}
      {zone === 'arcade' && (
        <button
          type="button"
          onClick={() => {
            soundFX.tap();
            onOpenArcadeHub?.('overview');
          }}
          className="phone-ui absolute top-2.5 right-2.5 z-30 flex items-center gap-2.5 rounded-2xl border-2 border-[#38BDF8]/75 bg-[#0F172A]/95 px-3 py-1.5 text-xs font-black text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
        >
          <span className="flex items-center gap-1 tabular-nums text-[#38BDF8]">
            <Gamepad2 className="h-4 w-4" />
            <span>{stats.coinGame ?? 0} CoinGame</span>
          </span>
          <span className="h-3.5 w-[1px] bg-white/20" />
          <span className="flex items-center gap-1 tabular-nums text-[#FBBF24]">
            <Coins className="h-3.5 w-3.5" />
            <span>{stats.coins} Xu</span>
          </span>
        </button>
      )}

      {/* Proximity Door, Lamp & Kitchen Appliance Controls inside House */}
      {zone === 'home' && !editFurnitureMode && (nearbyDoor || nearbyLamp || nearbyAppliance) && (
        <div className="phone-ui absolute bottom-5 left-1/2 z-30 flex -translate-x-1/2 flex-wrap items-center justify-center gap-2">
          {nearbyAppliance && (
            <button
              type="button"
              onClick={handleOpenNearbyAppliance}
              className="anim-pop flex min-h-[42px] items-center gap-2 rounded-2xl border-2 border-[#C8642E] bg-[#FFF2E5] px-4 py-2 text-xs font-extrabold text-[#6E2D12] shadow-lg transition-transform hover:scale-105 active:scale-95"
            >
              {nearbyAppliance.kind === 'mini_oven' ? (
                <Flame className="h-4 w-4 text-[#D97736]" />
              ) : (
                <ChefHat className="h-4 w-4 text-[#3D8BAE]" />
              )}
              <span>
                {nearbyAppliance.kind === 'kitchen_counter'
                  ? 'Nấu ăn'
                  : `Nấu ăn · ${nearbyAppliance.name}`}
              </span>
            </button>
          )}

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
      {zone === 'garden' && nearPond && !editFarmDecorMode && (
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
                  : fishingState === 'pulling'
                    ? 'Đang Kéo Cá Lên...'
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

      {/* Bottom Action Bar in Farm Decor Move Mode */}
      {zone === 'garden' && editFarmDecorMode && (
        <div className="absolute bottom-4 left-1/2 z-30 flex w-[min(95vw,470px)] -translate-x-1/2 flex-col items-center gap-1.5">
          {selectedFarmCatalogItem && selectedFarmPlacedItem ? (
            <>
              <span className="rounded-lg bg-[#2F5B39]/90 px-2.5 py-0.5 text-center text-[11px] font-semibold text-amber-50 shadow-xs">
                {`Chạm bãi cỏ nông trại để di chuyển "${selectedFarmCatalogItem.name}"`}
              </span>
              <div className="flex w-full items-center justify-between gap-1.5 rounded-2xl border-2 border-[#4B8A57] bg-[#F4FBF1] p-2 shadow-xl">
                <button
                  type="button"
                  onClick={() => {
                    soundFX.tap();
                    onRotateFarmDecor(selectedFarmPlacedItem.instanceId);
                  }}
                  className="flex min-h-[36px] flex-1 items-center justify-center gap-1 rounded-xl bg-[#4E9A5A] px-2.5 text-xs font-bold text-white transition-transform active:scale-95"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                  <span>Xoay</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundFX.tap();
                    onStowFarmDecor(selectedFarmPlacedItem.instanceId);
                  }}
                  className="flex min-h-[36px] flex-1 items-center justify-center gap-1 rounded-xl bg-[#DCEFD8] px-2.5 text-xs font-bold text-[#2F5B39] transition-transform active:scale-95"
                >
                  <PackageMinus className="h-3.5 w-3.5" />
                  <span>Cất</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundFX.tap();
                    onSelectFarmDecor(null);
                  }}
                  className="flex min-h-[36px] items-center justify-center rounded-xl bg-[#EAF5E6] px-2.5 text-xs font-bold text-[#3E7649] transition-transform active:scale-95"
                >
                  Đổi món
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundFX.tap();
                    setFarmToolsOpen(false);
                    onToggleEditFarmDecor();
                  }}
                  className="flex min-h-[36px] items-center justify-center gap-1 rounded-xl bg-[#3B7D48] px-3 text-xs font-bold text-white transition-transform active:scale-95"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Xong</span>
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3 rounded-2xl border-2 border-[#4B8A57] bg-[#F4FBF1] px-4 py-2 text-xs font-bold text-[#2F5B39] shadow-xl">
              <span>Chạm vào món đồ trang trí để di chuyển / xoay / cất</span>
              <button
                type="button"
                onClick={() => {
                  soundFX.tap();
                  setFarmToolsOpen(false);
                  onToggleEditFarmDecor();
                }}
                className="rounded-xl bg-[#4E9A5A] px-3 py-1.5 text-white transition-transform active:scale-95"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
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

      {/* MayMall Skydeck Parachute Jump Confirmation Modal */}
      {parachuteConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
          onClick={() => setParachuteConfirmOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="anim-pop w-full max-w-sm rounded-3xl border-4 border-[#F5B09B] bg-[#FFF8F2] p-5 text-[#3B2A1A] shadow-2xl"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#F5B8A5] bg-[#FFE8E1] text-[#E86C5D]">
                <Wind className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-black">Nhảy Dù Từ May Mall?</h3>
                <p className="text-xs font-bold text-[#7A6048]">
                  Độ cao Sân Thượng: 25m
                </p>
              </div>
            </div>

            <p className="mt-3 rounded-2xl border border-[#EFE0D4] bg-white px-3.5 py-3 text-xs font-bold leading-relaxed text-[#523D28]">
              Bung dù lướt xuống từ từ và dùng <b>Joystick</b> để điều khiển hướng đáp đất khắp thị trấn. Sau khi chạm đất, dù sẽ tự động thu lại!
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  soundFX.tap();
                  setParachuteConfirmOpen(false);
                }}
                className="rounded-xl bg-[#EADCCB] py-2.5 text-xs font-black text-[#5C442C] transition active:scale-95"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  launchParachuteRef.current?.();
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#E86C5D] py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-[#D65A4C] active:scale-95"
              >
                <Wind className="h-3.5 w-3.5" />
                Bung Dù Ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Self-Click 8-Slot Hành động Tray (bấm vào nhân vật để bật/tắt) */}
      {actionsTrayOpen && !isEditingAny && !isParachutingHud && (
        <div
          className={`phone-ui anim-pop absolute left-1/2 z-30 w-[min(92vw,312px)] -translate-x-1/2 rounded-2xl border-2 border-[#3C3128] bg-[#FFF8EB] p-2.5 shadow-xl ${
            isBoatingHud ||
            isSwimmingHud ||
            nearTownBalloon ||
            nearIslandBalloon ||
            nearIslandPier ||
            mallElevatorHud !== 'none'
              ? 'bottom-[74px]'
              : 'bottom-5'
          }`}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-black text-[#4A3525]">
              <Smile className="h-4 w-4 text-[#DF7A20]" strokeWidth={2.3} />
              <span>Hành động</span>
            </span>
            <button
              type="button"
              onClick={() => {
                soundFX.tap();
                setActionsTrayOpen(false);
              }}
              aria-label="Đóng bảng hành động"
              className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#EFE0C9] text-[#5B422E] hover:bg-[#E5CEAE] active:scale-95"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2.6} />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {Array.from({length: PLAYER_ACTION_SLOT_COUNT}, (_, idx) => {
              const slotActionId = equippedActionSlots[idx] ?? null;
              const def = slotActionId ? PLAYER_ACTION_CATALOG[slotActionId] : null;
              if (!def || !slotActionId) {
                return (
                  <div
                    key={idx}
                    className="flex min-h-[48px] flex-col items-center justify-center rounded-xl border border-dashed border-[#D8C3A8] bg-[#F7EEE0] px-1 py-1 text-center"
                  >
                    <span className="text-[9px] font-bold text-[#B39C84]">Ô {idx + 1}</span>
                    <span className="text-[10px] font-bold text-[#B39C84]">Trống</span>
                  </div>
                );
              }
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => triggerPlayerActionRef.current?.(slotActionId)}
                  className="flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-xl border border-[#E5B87B] bg-[#FFF2DC] px-1 py-1 text-[#5A3210] shadow-xs transition-transform hover:scale-[1.03] active:scale-95"
                >
                  <Smile
                    className="h-4 w-4 shrink-0"
                    style={{color: def.accentColor}}
                    strokeWidth={2.3}
                  />
                  <span className="line-clamp-1 text-[10px] font-black leading-tight">
                    {def.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Fixed Dynamic Touch Joystick (Bottom-Left) — always enabled */}
      {!isEditingAny && (
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
            className="pointer-events-none absolute top-1/2 left-1/2 h-24 w-24 rounded-full border-2 border-white/75 bg-[#4A3525]/25 shadow-lg transition-opacity duration-100"
          >
            <div
              ref={joystickKnobRef}
              style={{transform: 'translate(-50%, -50%)'}}
              className="absolute top-1/2 left-1/2 h-11 w-11 rounded-full border-2 border-[#4A3525]/40 bg-[#FFF8EB]/95 shadow-md"
            />
          </div>
        </div>
      )}

      {/* FPS-Style Catch Bug Button (Right Beside Jump Button when holding Bug Net) */}
      {(zone === 'town' || zone === 'island') && bugNet.equipped && !isSwimmingHud && (
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

      {/* Quick Cast / Pull Rod Button (Right Beside Jump Button when holding Fishing Rod) */}
      {(zone === 'town' || zone === 'island' || zone === 'garden' || zone === 'fishing') &&
        fishingRod.equipped &&
        !bugNet.equipped &&
        !isSwimmingHud &&
        !isParachutingHud && (
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              fishActionRef.current?.();
            }}
            aria-label={fishingState === 'bite' ? 'Giật cần câu' : 'Quăng phao câu cá'}
            className={`phone-ui absolute right-[114px] bottom-10 z-30 flex h-[64px] w-[64px] flex-col items-center justify-center gap-0.5 rounded-full border-[2.5px] shadow-md transition-transform active:scale-90 sm:right-[128px] sm:bottom-12 ${
              fishingState === 'bite'
                ? 'border-[#C92A4C] bg-[#EF476F] text-white animate-pulse'
                : fishingState !== 'idle'
                  ? 'border-[#2D6E82] bg-[#2D7E96]/90 text-white'
                  : 'border-[#3C95AD]/80 bg-[#EAF9FF]/85 text-[#1B5E75]'
            }`}
          >
            <Fish className="h-6 w-6" />
            <span className="text-[11px] font-black leading-none">
              {fishingState === 'bite'
                ? 'Giật!'
                : fishingState === 'pulling'
                  ? 'Kéo...'
                  : fishingState !== 'idle'
                    ? 'Thu'
                    : 'Câu'}
            </span>
          </button>
        )}

      {/* Fixed Right-Side Jump Button — hidden while riding mounts; fades slightly after 5s idle while remaining clickable */}
      {!isParachutingHud && !isEditingAny && ownedMounts.activeMountId === null && (
        <button
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation();
            bumpJumpButtonVisibility();
            jumpActionRef.current?.();
          }}
          aria-label="Nhảy lên"
          className={`phone-ui absolute right-9 bottom-12 z-30 flex h-[64px] w-[64px] items-center justify-center rounded-full border-[2.5px] border-[#6BB2C7]/65 bg-[#FFFDF8]/80 text-[#2C7489]/90 shadow-md transition-[opacity,transform] duration-500 active:scale-90 sm:right-12 sm:bottom-14 ${
            jumpIdleDimmed ? 'opacity-30 hover:opacity-85' : 'opacity-100'
          }`}
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
