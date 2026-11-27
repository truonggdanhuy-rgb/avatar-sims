import {useEffect, useRef, useState} from 'react';
import {BackpackModal, BagSubTab} from './components/modals/BackpackModal';
import {BoutiqueModal} from './components/modals/BoutiqueModal';
import {DailyCheckInModal} from './components/modals/DailyCheckInModal';
import {DailyQuestsModal} from './components/modals/DailyQuestsModal';
import {FarmDecorModal} from './components/modals/FarmDecorModal';
import {FarmDecorShopModal} from './components/modals/FarmDecorShopModal';
import {FarmShopModal} from './components/modals/FarmShopModal';
import {FarmStorageModal} from './components/modals/FarmStorageModal';
import {FarmWorkshopModal} from './components/modals/FarmWorkshopModal';
import {FurnitureModal} from './components/modals/FurnitureModal';
import {FurnitureShopModal} from './components/modals/FurnitureShopModal';
import {JoyboyDeliveryModal} from './components/modals/JoyboyDeliveryModal';
import {LivestockModal} from './components/modals/LivestockModal';
import {OrderBoardModal} from './components/modals/OrderBoardModal';
import {PhoneMenuModal} from './components/modals/PhoneMenuModal';
import {PondModal} from './components/modals/PondModal';
import {PetAdoptModal} from './components/modals/PetAdoptModal';
import {PetSupplyShopModal} from './components/modals/PetSupplyShopModal';
import {SettingsModal} from './components/modals/SettingsModal';
import {ShipShopModal} from './components/modals/ShipShopModal';
import {StarterCharacterModal} from './components/modals/StarterCharacterModal';
import {TunShopModal} from './components/modals/TunShopModal';
import {WardrobeModal} from './components/modals/WardrobeModal';
import {KoiShopModal} from './components/modals/KoiShopModal';
import {BbqGrillModal} from './components/modals/BbqGrillModal';
import {VendingMachineModal} from './components/modals/VendingMachineModal';
import {PeppaShopModal} from './components/modals/PeppaShopModal';
import {ApplianceCookModal} from './components/modals/ApplianceCookModal';
import {MayCafeModal} from './components/modals/MayCafeModal';
import {ArcadeHubModal} from './components/modals/ArcadeHubModal';
import {ArcadeMiniGameModal} from './components/modals/ArcadeMiniGameModal';
import {CoinGameShopModal} from './components/modals/CoinGameShopModal';
import {WorldCanvas} from './components/WorldCanvas';
import {MAY_CAFE_ITEMS, MayCafeItemId} from './data/mayCafeCatalog';
import {
  createInitialPeppaDishes,
  createInitialPeppaIngredients,
  KitchenApplianceId,
  PEPPA_INGREDIENTS,
  PEPPA_RECIPES,
  PeppaIngredientId,
  PeppaRecipeId,
} from './data/peppaKitchenCatalog';
import {createInitialOwnedMounts, MOUNT_CATALOG} from './data/mountCatalog';
import {DEFAULT_AVATAR, SHOP_ITEMS, STARTER_OWNED_IDS} from './data/avatarCatalog';
import {
  BBQ_FOOD_CATALOG,
  createInitialBbqFoods,
  HANDHELD_CONSUMABLE_LIST,
} from './data/foodCatalog';
import {
  applyPetCureCare,
  applyPetFeedCare,
  applyPetLevelStep,
  applyPetPlayCare,
  createInitialPetSupplies,
  createOwnedPet,
  isPetTooHungry,
  MAX_PET_INTIMACY,
  PET_CATALOG,
  PET_STARVING_THRESHOLD,
  PET_SUPPLY_META,
  tickPetCareMeters,
} from './data/petCatalog';
import {
  ALL_FISH_CATALOG,
  BOAT_CATALOG,
  computeFishSellPrice,
  createInitialBoatsState,
  createInitialFishDex,
  createInitialFishingRod,
  getRodRepairCost,
  rollRandomRiverFish,
  rollRandomSeaFish,
  rollRodDurabilityLoss,
  WOODEN_ROD_MAX_DURABILITY,
  WOODEN_ROD_PRICE,
} from './data/fishingCatalog';
import {
  computeInsectSellPrice,
  createInitialBugNet,
  createInitialInsectDex,
  getNetRepairCost,
  INSECT_CATALOG,
  rollNetDurabilityLoss,
  WOODEN_NET_MAX_DURABILITY,
  WOODEN_NET_PRICE,
} from './data/insectCatalog';
import {
  ANIMALS,
  createAnimalInstance,
  createInitialFarmInventory,
  createInitialLivestock,
  createInitialOrders,
  createInitialPlots,
  createInitialPondFish,
  createInitialSupplies,
  createInitialTroughs,
  createSingleFarmOrder,
  CROPS,
  getFarmItemCount,
  getFarmItemDirectSellPrice,
  getFarmSeedSellPrice,
  getFarmStorageCapacity,
  getFarmStorageUsed,
  getWarehouseUpgradeCost,
  INITIAL_WATER_CAN,
  INITIAL_WELL_STORED,
  KITCHEN_LEVELS,
  KITCHEN_RECIPES,
  MAX_COOP_ANIMALS,
  MAX_POND_FISH,
  MAX_WAREHOUSE_LEVEL,
  MILL_SLOTS,
  PLOT_COUNT,
  PLOT_LEVELS,
  POND_FISH_SPECIES,
  PROCESSED_ITEMS,
  SUPPLY_META,
  SUPPLY_PRICES,
  WATER_CAN_MAX,
  WELL_WATER_INTERVAL_MS,
  WELL_WATER_MAX,
} from './data/farmCatalog';
import {
  computeStackedY,
  FURNITURE_BY_ID,
  isPointOnFurnitureSurface,
  STARTER_FURNITURE_INVENTORY,
  STARTER_PLACED_FURNITURE,
} from './data/furnitureCatalog';
import {FARM_DECOR_BY_ID} from './data/farmDecorCatalog';
import {
  CHECK_IN_REWARDS,
  createEmptyDailyQuests,
  createInitialCheckInState,
  createInitialJoyboyDeliveryState,
  createInitialPlayerActions,
  getTodayDateKey,
  MAX_JOYBOY_DELIVERIES_PER_DAY,
  normalizeDailyQuests,
  normalizeJoyboyDeliveryState,
  normalizePlayerActions,
  PLAYER_ACTION_CATALOG,
  rollJoyboyDeliveryOrder,
} from './data/progressionCatalog';
import {
  ActionId,
  AnimalProduceId,
  AnimalType,
  ArcadeGameId,
  ArcadeHubSection,
  AvatarConfig,
  BbqFoodId,
  BoatId,
  BoatsState,
  BugNetState,
  CaughtFishItem,
  CaughtInsectItem,
  CheckInState,
  CookingJob,
  CoopKind,
  CoopTroughs,
  CropType,
  DailyQuestKey,
  DailyQuestProgress,
  FarmDecorCatalogItem,
  FarmDecorCategory,
  FarmInventory,
  FarmItemKind,
  FarmOrder,
  FarmSupplies,
  FishDexRecord,
  FishingRodState,
  FishSpeciesId,
  FishWaterType,
  FurnitureCatalogItem,
  FurnitureCategory,
  GameStats,
  GardenPlotState,
  InsectDexRecord,
  InsectSpeciesId,
  JoyboyDeliveryState,
  KitchenLevel,
  LivestockAnimalState,
  MillJob,
  MountId,
  OwnedMountsState,
  OwnedPetState,
  PetSpeciesId,
  PetSupplies,
  PetSupplyId,
  PlacedFarmDecor,
  PlacedFurniture,
  PlayerActionsState,
  PlotLevel,
  PondFishSpecies,
  PondFishState,
  ProcessedId,
  RecipeId,
  ShopItem,
  ShopSet,
  TimeOfDay,
  WellWaterState,
  ZoneId,
} from './types/game';
import {finalizePlayerName, sanitizePlayerNameInput} from './utils/playerName';
import {soundFX} from './utils/sound';

const STORAGE_KEY = 'thi_tran_may_save_v1';
const HOUSE_LAYOUT_VERSION = 5;
const TELEPORT_COOLDOWN_MS = 15000;

function clampDropIntoHouse(rawX: number, rawZ: number): {x: number; z: number} {
  return {
    x: Math.max(-12.6, Math.min(9.6, rawX)),
    z: Math.max(-8.6, Math.min(6.6, rawZ)),
  };
}

function clampDropIntoGarden(rawX: number, rawZ: number): {x: number; z: number} {
  return {
    x: Math.max(-29.5, Math.min(29.5, rawX)),
    z: Math.max(-20.5, Math.min(20.5, rawZ)),
  };
}

function migrateSavedPlots(rawPlots: unknown): GardenPlotState[] {
  const now = Date.now();
  const defaults = createInitialPlots(now);
  if (!Array.isArray(rawPlots)) return defaults;

  return defaults.map((def, idx) => {
    const old = rawPlots[idx] as
      | {
          stage?: string;
          crop?: string | null;
          level?: number;
          watered?: boolean;
          hasPest?: boolean;
          hasWeed?: boolean;
          pestRolled?: boolean;
          plantedAt?: number | null;
          readyAt?: number | null;
          durationMs?: number;
        }
      | undefined;
    if (!old || typeof old !== 'object') return def;

    const validCrop =
      old.crop && old.crop in CROPS ? (old.crop as CropType) : null;
    const level: PlotLevel = old.level === 2 || old.level === 3 ? old.level : 1;

    if (old.stage === 'ready' && validCrop) {
      return {
        id: def.id,
        level,
        stage: 'ready',
        crop: validCrop,
        watered: Boolean(old.watered),
        hasPest: Boolean(old.hasPest),
        hasWeed: Boolean(old.hasWeed),
        pestRolled: true,
        plantedAt: old.plantedAt ?? now - 20000,
        readyAt: old.readyAt ?? now,
        durationMs: old.durationMs || CROPS[validCrop].growSeconds * 1000,
      };
    }

    if ((old.stage === 'growing' || old.stage === 'planted' || old.stage === 'watered') && validCrop) {
      const durationMs = old.durationMs || CROPS[validCrop].growSeconds * 1000;
      const readyAt = old.readyAt ?? now + durationMs;
      return {
        id: def.id,
        level,
        stage: now >= readyAt ? 'ready' : 'growing',
        crop: validCrop,
        watered: Boolean(old.watered || old.stage === 'watered'),
        hasPest: Boolean(old.hasPest),
        hasWeed: Boolean(old.hasWeed),
        pestRolled: Boolean(old.pestRolled),
        plantedAt: old.plantedAt ?? now,
        readyAt,
        durationMs,
      };
    }

    return {
      id: def.id,
      level,
      stage: 'empty',
      crop: null,
      watered: false,
      hasPest: false,
      hasWeed: Boolean(old.hasWeed),
      pestRolled: false,
      plantedAt: null,
      readyAt: null,
      durationMs: 0,
    };
  });
}

function pruneZeroCounts<K extends string>(
  rec: Partial<Record<K, number>> | undefined,
): Partial<Record<K, number>> {
  const out: Partial<Record<K, number>> = {};
  if (!rec) return out;
  for (const [k, v] of Object.entries(rec)) {
    if (typeof v === 'number' && v > 0) {
      out[k as K] = v;
    }
  }
  return out;
}

function adjustFarmInventory(
  inv: FarmInventory,
  deltas: {kind: FarmItemKind; id: string; delta: number}[],
): FarmInventory {
  const crops = {...inv.crops};
  const animalProducts = {...inv.animalProducts};
  const processed = {...inv.processed};
  const dishes = {...inv.dishes};

  for (const d of deltas) {
    if (d.kind === 'crop') {
      const key = d.id as CropType;
      crops[key] = Math.max(0, (crops[key] || 0) + d.delta);
    } else if (d.kind === 'animal_product') {
      const key = d.id as AnimalProduceId;
      animalProducts[key] = Math.max(0, (animalProducts[key] || 0) + d.delta);
    } else if (d.kind === 'processed') {
      const key = d.id as ProcessedId;
      processed[key] = Math.max(0, (processed[key] || 0) + d.delta);
    } else {
      const key = d.id as RecipeId;
      dishes[key] = Math.max(0, (dishes[key] || 0) + d.delta);
    }
  }

  return {
    seeds: inv.seeds,
    crops,
    animalProducts,
    processed,
    dishes,
    supplies: inv.supplies,
  };
}

function migrateSavedPondFish(raw: unknown): PondFishState[] {
  const now = Date.now();
  if (!Array.isArray(raw)) return createInitialPondFish(now);
  const speciesMap: Record<string, PondFishSpecies> = {
    fish_12h: 'fish_12h',
    duck_24h: 'duck_24h',
    turtle_48h: 'turtle_48h',
    carp_24h: 'fish_12h',
    tilapia_24h: 'duck_24h',
    salmon_48h: 'turtle_48h',
    sturgeon_48h: 'turtle_48h',
  };
  return raw
    .filter((f): f is Partial<PondFishState> => Boolean(f && typeof f === 'object'))
    .map((f, idx) => {
      const mapped = speciesMap[String(f.species)] ?? 'fish_12h';
      const spec = POND_FISH_SPECIES[mapped];
      const totalDurationMs = spec.durationHours * 3600 * 1000;
      const remainingMs =
        typeof f.remainingMs === 'number'
          ? Math.max(0, Math.min(totalDurationMs, f.remainingMs))
          : totalDurationMs;
      const stage = f.stage === 'ready' || remainingMs <= 0 ? 'ready' : 'growing';
      return {
        id: typeof f.id === 'string' ? f.id : `fish_mig_${idx}`,
        species: mapped,
        stage,
        stockedAt: typeof f.stockedAt === 'number' ? f.stockedAt : now,
        remainingMs: stage === 'ready' ? 0 : remainingMs,
        totalDurationMs,
        hunger: typeof f.hunger === 'number' ? Math.max(0, Math.min(100, f.hunger)) : 88,
        sick: Boolean(f.sick),
        lastCareCheckAt: typeof f.lastCareCheckAt === 'number' ? f.lastCareCheckAt : now,
        lastTickAt: typeof f.lastTickAt === 'number' ? f.lastTickAt : now,
      };
    });
}

export default function App() {
  const [zone, setZone] = useState<ZoneId>('town');
  const [wardrobeOpen, setWardrobeOpen] = useState(false);
  const [boutiqueOpen, setBoutiqueOpen] = useState(false);
  const [furnitureShopOpen, setFurnitureShopOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dailyQuestsOpen, setDailyQuestsOpen] = useState(false);
  const [dailyCheckInOpen, setDailyCheckInOpen] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [furnitureModalOpen, setFurnitureModalOpen] = useState(false);
  const [furnitureModalTab, setFurnitureModalTab] = useState<'all' | FurnitureCategory>('all');
  const returnToFurnitureModalRef = useRef(false);
  const [farmDecorShopOpen, setFarmDecorShopOpen] = useState(false);
  const [farmDecorModalOpen, setFarmDecorModalOpen] = useState(false);
  const [farmDecorModalTab, setFarmDecorModalTab] = useState<FarmDecorCategory>('all');
  const returnToFarmDecorModalRef = useRef(false);
  const [editFarmDecorMode, setEditFarmDecorMode] = useState(false);
  const [selectedFarmDecorId, setSelectedFarmDecorId] = useState<string | null>(null);
  const [joyboyModalOpen, setJoyboyModalOpen] = useState(false);
  const [workshopTab, setWorkshopTab] = useState<'mill' | 'kitchen' | null>(null);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [storageOpen, setStorageOpen] = useState(false);
  const [pastureCoop, setPastureCoop] = useState<CoopKind | null>(null);
  const [pondOpen, setPondOpen] = useState(false);
  const [farmShopOpen, setFarmShopOpen] = useState(false);
  const [koiShopOpen, setKoiShopOpen] = useState(false);
  const [shipShopOpen, setShipShopOpen] = useState(false);
  const [tunShopOpen, setTunShopOpen] = useState(false);
  const [peppaShopOpen, setPeppaShopOpen] = useState(false);
  const [cafeShopOpen, setCafeShopOpen] = useState(false);
  const [activeApplianceModal, setActiveApplianceModal] = useState<KitchenApplianceId | null>(null);
  const [petSupplyShopOpen, setPetSupplyShopOpen] = useState(false);
  const [petAdoptOpen, setPetAdoptOpen] = useState(false);
  const [bbqGrillOpen, setBbqGrillOpen] = useState(false);
  const [vendingOpen, setVendingOpen] = useState(false);
  const [arcadeHubSection, setArcadeHubSection] = useState<ArcadeHubSection | null>(null);
  const [activeArcadeGame, setActiveArcadeGame] = useState<ArcadeGameId | null>(null);
  const [coinGameShopOpen, setCoinGameShopOpen] = useState(false);
  const [lastFreeClawDate, setLastFreeClawDate] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return typeof parsed.lastFreeClawDate === 'string' ? parsed.lastFreeClawDate : null;
      }
    } catch {
      // ignore storage errors
    }
    return null;
  });
  const [bagOpen, setBagOpen] = useState(false);
  const [bagInitialSubTab, setBagInitialSubTab] = useState<BagSubTab>('list');
  const [phoneInitialTab, setPhoneInitialTab] = useState<
    'menu' | 'account' | 'guide' | 'fishdex' | 'actions'
  >('menu');
  const [nearPond, setNearPond] = useState(false);
  const [pondFeedPulse, setPondFeedPulse] = useState(0);
  const [farmPondFishPulse, setFarmPondFishPulse] = useState(0);
  const [editFurnitureMode, setEditFurnitureMode] = useState(false);
  const [selectedFurnitureId, setSelectedFurnitureId] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('morning');

  const homeSpotRef = useRef<{x: number; z: number}>({x: -1.8, z: 4.5});

  const [avatar, setAvatar] = useState<AvatarConfig>(() => {
    const LEGACY_EYE_MAP: Record<string, AvatarConfig['eyeStyle']> = {
      starry: 'sparkle',
      almond: 'heroic',
      cheerful: 'bright',
      squint: 'cool',
      wink: 'wink',
      hero: 'heroic',
      sweet: 'bright',
      halftime: 'cool',
      cool_slit: 'cool',
      happy_xd: 'joy_xd',
      pout_xd: 'joy_xd',
      cozy: 'happy_arc',
    };
    const LEGACY_EXPR_MAP: Record<string, AvatarConfig['expression']> = {
      smile: 'sweet_smile',
      grin: 'joy_open',
      cat: 'cat_w',
      calm: 'confident',
      smirk: 'confident',
      bashful: 'pout',
      hero_smile: 'confident',
      sweet_u: 'sweet_smile',
      open_o: 'gentle_o',
      happy_d: 'joy_open',
      cool_line: 'confident',
      pout_puff: 'pout',
    };
    const VALID_EYES = new Set<string>([
      'bright',
      'gentle',
      'sparkle',
      'heroic',
      'cool',
      'happy_arc',
      'joy_xd',
      'wink',
    ]);
    const VALID_EXPRS = new Set<string>([
      'sweet_smile',
      'joy_open',
      'cat_w',
      'gentle_o',
      'confident',
      'pout',
    ]);
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.avatar) {
          const merged = {...DEFAULT_AVATAR, ...parsed.avatar} as AvatarConfig & Record<string, unknown>;
          const rawEye = String(merged.eyeStyle ?? '');
          if (!VALID_EYES.has(rawEye)) {
            merged.eyeStyle = LEGACY_EYE_MAP[rawEye] ?? DEFAULT_AVATAR.eyeStyle;
          }
          const rawExpr = String(merged.expression ?? '');
          if (!VALID_EXPRS.has(rawExpr)) {
            merged.expression = LEGACY_EXPR_MAP[rawExpr] ?? DEFAULT_AVATAR.expression;
          }
          merged.name = finalizePlayerName(String(merged.name ?? ''), DEFAULT_AVATAR.name);
          return merged;
        }
      }
    } catch {
      // ignore storage errors
    }
    return DEFAULT_AVATAR;
  });

  const [hasCreatedCharacter, setHasCreatedCharacter] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.characterCreated === true || Boolean(parsed.avatar))) {
          return true;
        }
      }
    } catch {
      // ignore storage errors
    }
    return false;
  });

  const [stats, setStats] = useState<GameStats>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.stats) {
          return {
            coins: typeof parsed.stats.coins === 'number' ? parsed.stats.coins : 150,
            coinGame:
              typeof parsed.stats.coinGame === 'number' && Number.isFinite(parsed.stats.coinGame)
                ? Math.max(0, Math.floor(parsed.stats.coinGame))
                : 0,
            energy: typeof parsed.stats.energy === 'number' ? parsed.stats.energy : 85,
            mood: typeof parsed.stats.mood === 'number' ? parsed.stats.mood : 90,
            hunger:
              typeof parsed.stats.hunger === 'number' && Number.isFinite(parsed.stats.hunger)
                ? Math.max(0, Math.min(100, parsed.stats.hunger))
                : 90,
          };
        }
      }
    } catch {
      // ignore storage errors
    }
    return {coins: 150, coinGame: 0, energy: 85, mood: 90, hunger: 90};
  });

  const [plots, setPlots] = useState<GardenPlotState[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.plots)) {
          return migrateSavedPlots(parsed.plots);
        }
      }
    } catch {
      // ignore storage errors
    }
    return createInitialPlots();
  });

  const [farmInventory, setFarmInventory] = useState<FarmInventory>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.farmInventory && typeof parsed.farmInventory === 'object') {
          const rawProducts = {...(parsed.farmInventory.animalProducts || {})} as Record<
            string,
            number
          >;
          if (typeof rawProducts.egg === 'number' && rawProducts.egg > 0) {
            rawProducts.chicken_egg = (rawProducts.chicken_egg || 0) + rawProducts.egg;
            delete rawProducts.egg;
          }
          const rawSupplies = parsed.farmInventory.supplies || {};
          const defaults = createInitialSupplies();
          return {
            seeds:
              parsed.farmInventory.seeds && typeof parsed.farmInventory.seeds === 'object'
                ? parsed.farmInventory.seeds
                : {wheat: 4, scallion: 2, rice: 2, carrot: 2, corn: 1},
            crops: parsed.farmInventory.crops || {},
            animalProducts: rawProducts as FarmInventory['animalProducts'],
            processed: parsed.farmInventory.processed || {},
            dishes: parsed.farmInventory.dishes || {},
            supplies: {
              bugSpray:
                typeof rawSupplies.bugSpray === 'number' ? rawSupplies.bugSpray : defaults.bugSpray,
              animalFeed:
                typeof rawSupplies.animalFeed === 'number'
                  ? rawSupplies.animalFeed
                  : defaults.animalFeed,
              animalMedicine:
                typeof rawSupplies.animalMedicine === 'number'
                  ? rawSupplies.animalMedicine
                  : defaults.animalMedicine,
              fishFeed:
                typeof rawSupplies.fishFeed === 'number' ? rawSupplies.fishFeed : defaults.fishFeed,
              fishMedicine:
                typeof rawSupplies.fishMedicine === 'number'
                  ? rawSupplies.fishMedicine
                  : defaults.fishMedicine,
            },
          };
        }
      }
    } catch {
      // ignore storage errors
    }
    return createInitialFarmInventory();
  });

  const [kitchenLevel, setKitchenLevel] = useState<KitchenLevel>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.kitchenLevel === 2 || parsed.kitchenLevel === 3) {
          return parsed.kitchenLevel;
        }
      }
    } catch {
      // ignore storage errors
    }
    return 1;
  });

  const [warehouseLevel, setWarehouseLevel] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.warehouseLevel === 'number') {
          return Math.max(1, Math.min(MAX_WAREHOUSE_LEVEL, Math.floor(parsed.warehouseLevel)));
        }
      }
    } catch {
      // ignore storage errors
    }
    return 1;
  });

  const [millQueue, setMillQueue] = useState<MillJob[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.millQueue)) {
          return parsed.millQueue.filter(
            (j: Partial<MillJob>): j is MillJob =>
              Boolean(
                j &&
                  typeof j.id === 'string' &&
                  typeof j.processedId === 'string' &&
                  j.processedId in PROCESSED_ITEMS &&
                  typeof j.readyAt === 'number' &&
                  typeof j.durationMs === 'number',
              ),
          );
        }
      }
    } catch {
      // ignore storage errors
    }
    return [];
  });

  const [cookingQueue, setCookingQueue] = useState<CookingJob[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.cookingQueue)) {
          return parsed.cookingQueue.filter(
            (j: Partial<CookingJob>): j is CookingJob =>
              Boolean(
                j &&
                  typeof j.id === 'string' &&
                  typeof j.recipeId === 'string' &&
                  j.recipeId in KITCHEN_RECIPES &&
                  typeof j.readyAt === 'number' &&
                  typeof j.durationMs === 'number',
              ),
          );
        }
      }
    } catch {
      // ignore storage errors
    }
    return [];
  });

  const [livestock, setLivestock] = useState<LivestockAnimalState[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.livestock)) {
          const now = Date.now();
          return parsed.livestock
            .filter(
              (a: Partial<LivestockAnimalState>) =>
                a && typeof a.type === 'string' && a.type in ANIMALS,
            )
            .map((a: Partial<LivestockAnimalState>, idx: number) => {
              const type = a.type as AnimalType;
              const def = ANIMALS[type];
              if (
                a.coop &&
                a.stage &&
                typeof a.growRemainingMs === 'number' &&
                typeof a.activeRemainingMs === 'number' &&
                typeof a.produceRemainingMs === 'number'
              ) {
                return a as LivestockAnimalState;
              }
              const migrated = createAnimalInstance(type, idx + 1, now, true);
              return {
                ...migrated,
                id: typeof a.id === 'string' ? a.id : migrated.id,
                name: typeof a.name === 'string' ? a.name : migrated.name,
                hunger: typeof a.hunger === 'number' ? a.hunger : migrated.hunger,
                sick: Boolean(a.sick),
                hasProduce: Boolean(a.hasProduce),
              };
            });
        }
      }
    } catch {
      // ignore storage errors
    }
    return createInitialLivestock();
  });

  const [troughs, setTroughs] = useState<CoopTroughs>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.troughs && typeof parsed.troughs === 'object') {
          return {
            poultry: Math.max(0, Number(parsed.troughs.poultry) || 0),
            cattle: Math.max(0, Number(parsed.troughs.cattle) || 0),
          };
        }
      }
    } catch {
      // ignore storage errors
    }
    return createInitialTroughs();
  });
  const troughsRef = useRef(troughs);
  troughsRef.current = troughs;

  const [pondFish, setPondFish] = useState<PondFishState[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.pondFish)) {
          return migrateSavedPondFish(parsed.pondFish);
        }
      }
    } catch {
      // ignore storage errors
    }
    return createInitialPondFish();
  });

  const [waterCan, setWaterCan] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.waterCan === 'number') {
          return Math.max(0, Math.min(WATER_CAN_MAX, Math.floor(parsed.waterCan)));
        }
      }
    } catch {
      // ignore storage errors
    }
    return INITIAL_WATER_CAN;
  });
  const waterCanRef = useRef(waterCan);
  waterCanRef.current = waterCan;

  const [wellWater, setWellWater] = useState<WellWaterState>(() => {
    const now = Date.now();
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.wellWater && typeof parsed.wellWater === 'object') {
          return {
            stored: Math.max(0, Math.min(WELL_WATER_MAX, Math.floor(Number(parsed.wellWater.stored) || 0))),
            lastTickAt:
              typeof parsed.wellWater.lastTickAt === 'number'
                ? parsed.wellWater.lastTickAt
                : now,
          };
        }
      }
    } catch {
      // ignore storage errors
    }
    return {stored: INITIAL_WELL_STORED, lastTickAt: now};
  });
  const wellWaterRef = useRef(wellWater);
  wellWaterRef.current = wellWater;

  const [farmOrders, setFarmOrders] = useState<FarmOrder[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.farmOrders) && parsed.farmOrders.length > 0) {
          return parsed.farmOrders;
        }
      }
    } catch {
      // ignore storage errors
    }
    return createInitialOrders();
  });

  const [ownedIds, setOwnedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.ownedIds)) {
          const validSaved = parsed.ownedIds.filter((id: string) =>
            SHOP_ITEMS.some((item) => item.id === id),
          );
          return Array.from(new Set([...STARTER_OWNED_IDS, ...validSaved]));
        }
      }
    } catch {
      // ignore storage errors
    }
    return STARTER_OWNED_IDS;
  });

  const [dailyQuests, setDailyQuests] = useState<DailyQuestProgress>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.dailyQuests) {
          return normalizeDailyQuests(parsed.dailyQuests);
        }
      }
    } catch {
      // ignore storage errors
    }
    return createEmptyDailyQuests();
  });

  const [checkIn, setCheckIn] = useState<CheckInState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.checkIn && typeof parsed.checkIn === 'object') {
          const completedDays =
            typeof parsed.checkIn.completedDays === 'number'
              ? Math.max(0, Math.min(7, Math.floor(parsed.checkIn.completedDays)))
              : 0;
          const lastClaimDate =
            typeof parsed.checkIn.lastClaimDate === 'string'
              ? parsed.checkIn.lastClaimDate
              : null;
          return {completedDays, lastClaimDate};
        }
      }
    } catch {
      // ignore storage errors
    }
    return createInitialCheckInState();
  });

  const [placedFarmDecor, setPlacedFarmDecor] = useState<PlacedFarmDecor[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.placedFarmDecor)) {
          return parsed.placedFarmDecor.filter(
            (p: PlacedFarmDecor) =>
              p && typeof p.catalogId === 'string' && Boolean(FARM_DECOR_BY_ID[p.catalogId]),
          );
        }
      }
    } catch {
      // ignore storage errors
    }
    return [];
  });

  const [farmDecorInventory, setFarmDecorInventory] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.farmDecorInventory && typeof parsed.farmDecorInventory === 'object') {
          const out: Record<string, number> = {};
          for (const [k, v] of Object.entries(parsed.farmDecorInventory)) {
            if (FARM_DECOR_BY_ID[k] && typeof v === 'number' && v > 0) {
              out[k] = Math.floor(v);
            }
          }
          return out;
        }
      }
    } catch {
      // ignore storage errors
    }
    return {};
  });

  const [joyboyDelivery, setJoyboyDelivery] = useState<JoyboyDeliveryState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.joyboyDelivery) {
          return normalizeJoyboyDeliveryState(parsed.joyboyDelivery);
        }
      }
    } catch {
      // ignore storage errors
    }
    return createInitialJoyboyDeliveryState();
  });

  const [playerActions, setPlayerActions] = useState<PlayerActionsState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.playerActions) {
          return normalizePlayerActions(parsed.playerActions);
        }
      }
    } catch {
      // ignore storage errors
    }
    return createInitialPlayerActions();
  });

  const [placedFurniture, setPlacedFurniture] = useState<PlacedFurniture[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          parsed.houseVersion >= 3 &&
          Array.isArray(parsed.placedFurniture)
        ) {
          const filtered: PlacedFurniture[] = parsed.placedFurniture.filter(
            (p: PlacedFurniture) => p && typeof p.catalogId === 'string' && FURNITURE_BY_ID[p.catalogId],
          );
          const next = [...filtered];
          const hasWardrobePlaced = next.some(
            (p) => FURNITURE_BY_ID[p.catalogId]?.interactive === 'wardrobe',
          );
          const hasWardrobeInInv = (parsed.furnitureInventory?.wardrobe_oak || 0) > 0;
          if (parsed.houseVersion < HOUSE_LAYOUT_VERSION && !hasWardrobePlaced && !hasWardrobeInInv) {
            next.push({instanceId: 'init_wardrobe_1', catalogId: 'wardrobe_oak', x: -6.2, z: -8.55, rotY: 0});
          }
          const hasKitchenLPlaced = next.some((p) => p.catalogId === 'kitchen_l_cream');
          const hasKitchenLInInv = (parsed.furnitureInventory?.kitchen_l_cream || 0) > 0;
          if (parsed.houseVersion < 5 && !hasKitchenLPlaced && !hasKitchenLInInv) {
            next.push({instanceId: 'init_kitchen_l_1', catalogId: 'kitchen_l_cream', x: 8.55, z: 1.85, rotY: 0});
          }
          return next;
        }
      }
    } catch {
      // ignore storage errors
    }
    return STARTER_PLACED_FURNITURE;
  });

  const [furnitureInventory, setFurnitureInventory] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          parsed.houseVersion >= 3 &&
          parsed.furnitureInventory &&
          typeof parsed.furnitureInventory === 'object'
        ) {
          return parsed.furnitureInventory;
        }
      }
    } catch {
      // ignore storage errors
    }
    return STARTER_FURNITURE_INVENTORY;
  });

  const [fishingRod, setFishingRod] = useState<FishingRodState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.fishingRod && typeof parsed.fishingRod === 'object') {
          const r = parsed.fishingRod;
          const maxDur =
            typeof r.maxDurability === 'number' && r.maxDurability > 0
              ? r.maxDurability
              : WOODEN_ROD_MAX_DURABILITY;
          return {
            owned: Boolean(r.owned),
            equipped: Boolean(r.owned && r.equipped),
            durability:
              typeof r.durability === 'number'
                ? Math.max(0, Math.min(maxDur, Math.floor(r.durability)))
                : maxDur,
            maxDurability: maxDur,
          };
        }
      }
    } catch {
      // ignore storage errors
    }
    return createInitialFishingRod();
  });
  const fishingRodRef = useRef(fishingRod);
  fishingRodRef.current = fishingRod;

  const [boats, setBoats] = useState<BoatsState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.boats && typeof parsed.boats === 'object') {
          const isBoatId = (id: unknown): id is BoatId =>
            typeof id === 'string' && id in BOAT_CATALOG;
          const rawOwned = Array.isArray(parsed.boats.ownedIds)
            ? parsed.boats.ownedIds.filter(isBoatId)
            : [];
          const ownedIds = Array.from(new Set(rawOwned)) as BoatId[];
          const activeBoatId: BoatId =
            isBoatId(parsed.boats.activeBoatId) &&
            ownedIds.includes(parsed.boats.activeBoatId)
              ? parsed.boats.activeBoatId
              : ownedIds[0] ?? 'wooden_boat';
          const purchasedAt: Partial<Record<BoatId, number>> = {};
          if (parsed.boats.purchasedAt && typeof parsed.boats.purchasedAt === 'object') {
            for (const [k, v] of Object.entries(parsed.boats.purchasedAt)) {
              if (isBoatId(k) && typeof v === 'number') {
                purchasedAt[k] = v;
              }
            }
          }
          return {ownedIds, activeBoatId, purchasedAt};
        }
        if (parsed.woodenBoat && typeof parsed.woodenBoat === 'object' && parsed.woodenBoat.owned) {
          return {
            ownedIds: ['wooden_boat'],
            activeBoatId: 'wooden_boat',
            purchasedAt:
              typeof parsed.woodenBoat.purchasedAt === 'number'
                ? {wooden_boat: parsed.woodenBoat.purchasedAt}
                : {},
          };
        }
      }
    } catch {
      // ignore storage errors
    }
    return createInitialBoatsState();
  });

  const [fishBasket, setFishBasket] = useState<CaughtFishItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.fishBasket)) {
          return parsed.fishBasket.filter(
            (f: Partial<CaughtFishItem>): f is CaughtFishItem =>
              Boolean(
                f &&
                  typeof f.id === 'string' &&
                  typeof f.speciesId === 'string' &&
                  f.speciesId in ALL_FISH_CATALOG &&
                  typeof f.weightKg === 'number' &&
                  f.weightKg > 0,
              ),
          );
        }
      }
    } catch {
      // ignore storage errors
    }
    return [];
  });

  const [fishDex, setFishDex] = useState<Partial<Record<FishSpeciesId, FishDexRecord>>>(() => {
    const base = createInitialFishDex();
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.fishDex && typeof parsed.fishDex === 'object') {
          for (const key of Object.keys(ALL_FISH_CATALOG) as FishSpeciesId[]) {
            const rec = parsed.fishDex[key];
            if (rec && typeof rec === 'object') {
              base[key] = {
                caughtCount: Math.max(0, Number(rec.caughtCount ?? rec.totalCaught) || 0),
                maxWeightKg: Math.max(0, Number(rec.maxWeightKg) || 0),
              };
            }
          }
        }
      }
    } catch {
      // ignore storage errors
    }
    return base;
  });

  const [accountId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.accountId === 'string' && parsed.accountId.trim()) {
          return parsed.accountId.trim();
        }
      }
    } catch {
      // ignore storage errors
    }
    const randCode = Math.random().toString(36).slice(2, 6).toUpperCase();
    const randNum = Math.floor(1000 + Math.random() * 9000);
    return `MAY-${randCode}-${randNum}`;
  });

  const [accountCreatedAt] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.accountCreatedAt === 'number' && parsed.accountCreatedAt > 0) {
          return parsed.accountCreatedAt;
        }
      }
    } catch {
      // ignore storage errors
    }
    return Date.now();
  });

  const [bugNet, setBugNet] = useState<BugNetState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.bugNet && typeof parsed.bugNet === 'object') {
          const n = parsed.bugNet;
          const maxDur =
            typeof n.maxDurability === 'number' && n.maxDurability > 0
              ? n.maxDurability
              : WOODEN_NET_MAX_DURABILITY;
          return {
            owned: Boolean(n.owned),
            equipped: Boolean(n.owned && n.equipped),
            durability:
              typeof n.durability === 'number'
                ? Math.max(0, Math.min(maxDur, Math.floor(n.durability)))
                : maxDur,
            maxDurability: maxDur,
          };
        }
      }
    } catch {
      // ignore storage errors
    }
    return createInitialBugNet();
  });
  const bugNetRef = useRef(bugNet);
  bugNetRef.current = bugNet;

  const [insectBasket, setInsectBasket] = useState<CaughtInsectItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.insectBasket)) {
          return parsed.insectBasket.filter(
            (b: Partial<CaughtInsectItem>): b is CaughtInsectItem =>
              Boolean(
                b &&
                  typeof b.id === 'string' &&
                  typeof b.speciesId === 'string' &&
                  b.speciesId in INSECT_CATALOG &&
                  typeof b.lengthMm === 'number' &&
                  b.lengthMm > 0,
              ),
          );
        }
      }
    } catch {
      // ignore storage errors
    }
    return [];
  });

  const [insectDex, setInsectDex] = useState<Partial<Record<InsectSpeciesId, InsectDexRecord>>>(() => {
    const base = createInitialInsectDex();
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.insectDex && typeof parsed.insectDex === 'object') {
          for (const key of Object.keys(INSECT_CATALOG) as InsectSpeciesId[]) {
            const rec = parsed.insectDex[key];
            if (rec && typeof rec === 'object') {
              base[key] = {
                caughtCount: Math.max(0, Number(rec.caughtCount ?? rec.totalCaught) || 0),
                maxLengthMm: Math.max(0, Number(rec.maxLengthMm) || 0),
              };
            }
          }
        }
      }
    } catch {
      // ignore storage errors
    }
    return base;
  });

  const [ownedMounts, setOwnedMounts] = useState<OwnedMountsState>(() => {
    const base = createInitialOwnedMounts();
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.ownedMounts && typeof parsed.ownedMounts === 'object') {
          const rawOwned = Array.isArray(parsed.ownedMounts.ownedIds)
            ? parsed.ownedMounts.ownedIds.filter(
                (id: unknown): id is MountId => typeof id === 'string' && id in MOUNT_CATALOG,
              )
            : [];
          const dedupOwned = Array.from(new Set(rawOwned)) as MountId[];
          const active =
            typeof parsed.ownedMounts.activeMountId === 'string' &&
            dedupOwned.includes(parsed.ownedMounts.activeMountId as MountId)
              ? (parsed.ownedMounts.activeMountId as MountId)
              : null;
          const last =
            typeof parsed.ownedMounts.lastMountId === 'string' &&
            dedupOwned.includes(parsed.ownedMounts.lastMountId as MountId)
              ? (parsed.ownedMounts.lastMountId as MountId)
              : (dedupOwned[0] ?? null);
          return {
            ownedIds: dedupOwned,
            activeMountId: active,
            lastMountId: last,
          };
        }
      }
    } catch {
      // ignore storage errors
    }
    return base;
  });

  const [redeemedCodes, setRedeemedCodes] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.redeemedCodes)) {
          return parsed.redeemedCodes.filter((c: unknown): c is string => typeof c === 'string');
        }
      }
    } catch {
      // ignore storage errors
    }
    return [];
  });

  const [ownedPets, setOwnedPets] = useState<OwnedPetState[]>(() => {
    const now = Date.now();
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.ownedPets)) {
          return (parsed.ownedPets as Partial<OwnedPetState>[])
            .filter(
              (p): p is Partial<OwnedPetState> =>
                Boolean(
                  p &&
                    typeof p.id === 'string' &&
                    typeof p.speciesId === 'string' &&
                    p.speciesId in PET_CATALOG,
                ),
            )
            .map((p: Partial<OwnedPetState>) => {
              const speciesId = p.speciesId as PetSpeciesId;
              const spec = PET_CATALOG[speciesId];
              const basePet: OwnedPetState = {
                id: p.id!,
                speciesId,
                name:
                  typeof p.name === 'string' && p.name.trim()
                    ? p.name.trim().slice(0, 20)
                    : spec.name,
                intimacyLevel:
                  typeof p.intimacyLevel === 'number'
                    ? Math.max(1, Math.min(MAX_PET_INTIMACY, Math.floor(p.intimacyLevel)))
                    : 1,
                intimacyXp:
                  typeof p.intimacyXp === 'number' ? Math.max(0, Math.floor(p.intimacyXp)) : 0,
                hunger:
                  typeof p.hunger === 'number' && Number.isFinite(p.hunger)
                    ? Math.max(0, Math.min(100, p.hunger))
                    : 75,
                happiness:
                  typeof p.happiness === 'number' && Number.isFinite(p.happiness)
                    ? Math.max(0, Math.min(100, p.happiness))
                    : 75,
                sick: Boolean(p.sick),
                lastTickAt: typeof p.lastTickAt === 'number' ? p.lastTickAt : now,
                adoptedAt: typeof p.adoptedAt === 'number' ? p.adoptedAt : now,
              };
              const dtOffline = Math.max(0, now - basePet.lastTickAt);
              return {...tickPetCareMeters(basePet, dtOffline), lastTickAt: now};
            });
        }
      }
    } catch {
      // ignore storage errors
    }
    return [];
  });

  const [activePetId, setActivePetId] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.activePetId === 'string' && parsed.activePetId.trim()) {
          return parsed.activePetId;
        }
      }
    } catch {
      // ignore storage errors
    }
    return null;
  });

  const [carriedPetId, setCarriedPetId] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.carriedPetId === 'string' && parsed.carriedPetId.trim()) {
          return parsed.carriedPetId;
        }
      }
    } catch {
      // ignore storage errors
    }
    return null;
  });

  const [petSupplies, setPetSupplies] = useState<PetSupplies>(() => {
    const defaults = createInitialPetSupplies();
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.petSupplies && typeof parsed.petSupplies === 'object') {
          const s = parsed.petSupplies;
          return {
            petFood:
              typeof s.petFood === 'number' ? Math.max(0, Math.floor(s.petFood)) : defaults.petFood,
            petMedicine:
              typeof s.petMedicine === 'number'
                ? Math.max(0, Math.floor(s.petMedicine))
                : defaults.petMedicine,
            intimacyTest:
              typeof s.intimacyTest === 'number'
                ? Math.max(0, Math.floor(s.intimacyTest))
                : defaults.intimacyTest,
          };
        }
      }
    } catch {
      // ignore storage errors
    }
    return defaults;
  });

  const [bbqFoods, setBbqFoods] = useState<Partial<Record<BbqFoodId, number>>>(() => {
    const defaults = createInitialBbqFoods();
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.bbqFoods && typeof parsed.bbqFoods === 'object') {
          for (const item of HANDHELD_CONSUMABLE_LIST) {
            const val = parsed.bbqFoods[item.id];
            if (typeof val === 'number' && Number.isFinite(val)) {
              defaults[item.id] = Math.max(0, Math.floor(val));
            }
          }
        }
      }
    } catch {
      // ignore storage errors
    }
    return defaults;
  });

  const [equippedFoodId, setEquippedFoodId] = useState<BbqFoodId | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          typeof parsed.equippedFoodId === 'string' &&
          parsed.equippedFoodId in BBQ_FOOD_CATALOG
        ) {
          const fid = parsed.equippedFoodId as BbqFoodId;
          if ((parsed.bbqFoods?.[fid] ?? 0) > 0) return fid;
        }
      }
    } catch {
      // ignore storage errors
    }
    return null;
  });

  const [peppaIngredients, setPeppaIngredients] = useState<
    Partial<Record<PeppaIngredientId, number>>
  >(() => {
    const defaults = createInitialPeppaIngredients();
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.peppaIngredients && typeof parsed.peppaIngredients === 'object') {
          for (const key of Object.keys(PEPPA_INGREDIENTS) as PeppaIngredientId[]) {
            const val = parsed.peppaIngredients[key];
            if (typeof val === 'number' && Number.isFinite(val) && val > 0) {
              defaults[key] = Math.floor(val);
            }
          }
        }
      }
    } catch {
      // ignore storage errors
    }
    return defaults;
  });

  const [unlockedPeppaRecipes, setUnlockedPeppaRecipes] = useState<PeppaRecipeId[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.unlockedPeppaRecipes)) {
          return parsed.unlockedPeppaRecipes.filter(
            (id: unknown): id is PeppaRecipeId => typeof id === 'string' && id in PEPPA_RECIPES,
          );
        }
      }
    } catch {
      // ignore storage errors
    }
    return [];
  });

  const [peppaDishes, setPeppaDishes] = useState<Partial<Record<PeppaRecipeId, number>>>(() => {
    const defaults = createInitialPeppaDishes();
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.peppaDishes && typeof parsed.peppaDishes === 'object') {
          for (const key of Object.keys(PEPPA_RECIPES) as PeppaRecipeId[]) {
            const val = parsed.peppaDishes[key];
            if (typeof val === 'number' && Number.isFinite(val) && val > 0) {
              defaults[key] = Math.floor(val);
            }
          }
        }
      }
    } catch {
      // ignore storage errors
    }
    return defaults;
  });

  const [teleportToPlazaPulse, setTeleportToPlazaPulse] = useState(0);
  const [teleportCooldownEndAt, setTeleportCooldownEndAt] = useState(0);
  const [teleportClockNow, setTeleportClockNow] = useState(() => Date.now());

  useEffect(() => {
    if (teleportCooldownEndAt <= Date.now()) return;
    setTeleportClockNow(Date.now());
    const timer = window.setInterval(() => {
      const now = Date.now();
      setTeleportClockNow(now);
      if (now >= teleportCooldownEndAt) {
        window.clearInterval(timer);
      }
    }, 450);
    return () => window.clearInterval(timer);
  }, [teleportCooldownEndAt]);

  const teleportCooldownSec = Math.max(
    0,
    Math.ceil((teleportCooldownEndAt - teleportClockNow) / 1000),
  );

  // Ensure plots count stays synced to PLOT_COUNT
  useEffect(() => {
    if (plots.length !== PLOT_COUNT) {
      setPlots((prev) => migrateSavedPlots(prev));
    }
  }, [plots.length]);

  // Real-time crop, livestock & 24h/48h pond fish simulation tick (supports offline catch-up!)
  useEffect(() => {
    const tickFarmWorld = () => {
      const now = Date.now();

      // 1. Plots
      setPlots((prev) => {
        let changed = false;
        const next = prev.map((plot) => {
          if (plot.stage !== 'growing' || !plot.crop || !plot.readyAt) return plot;

          let updated = plot;
          if (!plot.pestRolled && plot.plantedAt && plot.durationMs > 0) {
            const pestCheckAt = plot.plantedAt + plot.durationMs * 0.2;
            if (now >= pestCheckAt) {
              const chance = PLOT_LEVELS[plot.level].pestChance;
              updated = {
                ...updated,
                pestRolled: true,
                hasPest: Math.random() < chance,
                hasWeed: updated.hasWeed || Math.random() < 0.15,
              };
              changed = true;
            }
          }

          if (now >= plot.readyAt) {
            updated = {
              ...updated,
              stage: 'ready',
              pestRolled: true,
            };
            changed = true;
          }

          return updated;
        });

        return changed ? next : prev;
      });

      // 2. Livestock (2 coops: poultry & cattle, baby -> adult -> retired)
      const currentTroughs = {...troughsRef.current};
      let troughsConsumed = false;
      setLivestock((prev) => {
        if (prev.length === 0) return prev;
        let changed = false;
        const next = prev.map((ani) => {
          const dt = Math.max(0, now - ani.lastTickAt);
          if (dt < 2500) return ani;
          changed = true;

          const totalLifeMs = ani.growDurationMs + ani.activeDurationMs;
          const remainingLifeMs = ani.growRemainingMs + ani.activeRemainingMs;
          const elapsedLifeMs = Math.max(0, totalLifeMs - remainingLifeMs);

          // Animals only eat ~2 times across their entire lifespan; eat from trough when meal time arrives
          let nextHunger = ani.hunger;
          let nextMeals = ani.mealsRemaining;
          let nextMealAt = ani.nextMealElapsedMs;
          if (nextMeals > 0 && elapsedLifeMs >= nextMealAt) {
            if (currentTroughs[ani.coop] > 0) {
              currentTroughs[ani.coop] -= 1;
              troughsConsumed = true;
              nextHunger = 100;
            } else {
              nextHunger = Math.max(10, ani.hunger - 55);
            }
            nextMeals -= 1;
            nextMealAt = Math.round(totalLifeMs * 0.72);
          }

          let nextSick = ani.sick;
          let nextStage = ani.stage;
          let nextGrowRem = ani.growRemainingMs;
          let nextActiveRem = ani.activeRemainingMs;
          let nextProdRem = ani.produceRemainingMs;
          let nextHasProduce = ani.hasProduce;

          if (nextStage !== 'retired') {
            if (!nextSick && dt >= 1000) {
              // Moderate sickness chance (slightly higher if hungry)
              const pPerSec = nextHunger < 35 ? 0.00045 : 0.00012;
              if (Math.random() < 1 - Math.pow(1 - pPerSec, Math.min(dt / 1000, 120))) {
                nextSick = true;
              }
            }

            const hungerSpeed = nextHunger <= 20 ? 0.65 : 1.0;
            const sickSpeed = nextSick ? 0.85 : 1.0;
            const effDt = dt * hungerSpeed * sickSpeed;

            if (nextStage === 'baby') {
              nextGrowRem = Math.max(0, nextGrowRem - effDt);
              if (nextGrowRem <= 0) {
                nextStage = 'adult';
              }
            } else {
              nextActiveRem = Math.max(0, nextActiveRem - effDt);
              if (!nextHasProduce) {
                nextProdRem = Math.max(0, nextProdRem - effDt);
                if (nextProdRem <= 0) {
                  nextHasProduce = true;
                }
              }
              if (nextActiveRem <= 0) {
                nextStage = 'retired';
              }
            }
          }

          return {
            ...ani,
            stage: nextStage,
            growRemainingMs: nextGrowRem,
            activeRemainingMs: nextActiveRem,
            mealsRemaining: nextMeals,
            nextMealElapsedMs: nextMealAt,
            hunger: nextHunger,
            sick: nextSick,
            hasProduce: nextHasProduce,
            produceRemainingMs: nextProdRem,
            lastTickAt: now,
          };
        });
        return changed ? next : prev;
      });
      if (troughsConsumed) {
        troughsRef.current = currentTroughs;
        setTroughs(currentTroughs);
      }

      // 3. 24h / 48h Pond Aquaculture Fish
      setPondFish((prev) => {
        if (prev.length === 0) return prev;
        let changed = false;
        const next = prev.map((fish) => {
          if (fish.stage === 'ready') {
            if (now - fish.lastTickAt > 5000) {
              changed = true;
              return {...fish, lastTickAt: now};
            }
            return fish;
          }
          const dt = Math.max(0, now - fish.lastTickAt);
          if (dt < 2500) return fish;
          changed = true;

          // Hunger drops ~5.5% per hour (so checking ~1-2x/day is comfy!)
          const hungerDrop = (dt / 3600000) * 5.5;
          const nextHunger = Math.max(0, fish.hunger - hungerDrop);
          let nextSick = fish.sick;
          let nextCareAt = fish.lastCareCheckAt;

          // Care/disease check every 3.5 hours offline OR small active chance while growing
          const CARE_INTERVAL = 3.5 * 3600 * 1000;
          if (!nextSick && now - nextCareAt >= CARE_INTERVAL) {
            nextCareAt = now;
            const sickChance = nextHunger < 35 ? 0.42 : 0.22;
            if (Math.random() < sickChance) {
              nextSick = true;
            }
          } else if (!nextSick && dt >= 1000) {
            // Subtle active-play chance (~0.0012/s) so players also get to use fish medicine
            if (Math.random() < 1 - Math.pow(1 - (nextHunger < 35 ? 0.0022 : 0.0008), Math.min(dt / 1000, 60))) {
              nextSick = true;
              nextCareAt = now;
            }
          }

          let nextRem = fish.remainingMs;
          if (!nextSick) {
            const speed = nextHunger <= 15 ? 0.5 : 1.0;
            nextRem = Math.max(0, fish.remainingMs - dt * speed);
          }

          return {
            ...fish,
            stage: nextRem <= 0 ? ('ready' as const) : ('growing' as const),
            hunger: nextHunger,
            sick: nextSick,
            remainingMs: nextRem,
            lastCareCheckAt: nextCareAt,
            lastTickAt: now,
          };
        });
        return changed ? next : prev;
      });

      // 4. Well Water Offline & Online Generation (+1 water per WELL_WATER_INTERVAL_MS up to 50)
      setWellWater((prev) => {
        if (prev.stored >= WELL_WATER_MAX) {
          if (now - prev.lastTickAt > 10000) {
            return {...prev, lastTickAt: now};
          }
          return prev;
        }
        const elapsedMs = Math.max(0, now - prev.lastTickAt);
        const generated = Math.floor(elapsedMs / WELL_WATER_INTERVAL_MS);
        if (generated <= 0) return prev;
        const nextStored = Math.min(WELL_WATER_MAX, prev.stored + generated);
        const nextTickAt =
          nextStored >= WELL_WATER_MAX
            ? now
            : prev.lastTickAt + generated * WELL_WATER_INTERVAL_MS;
        return {stored: nextStored, lastTickAt: nextTickAt};
      });

      // 5. Pets hunger/happiness decay & rare sickness tick (rất hiếm khi bệnh)
      setOwnedPets((prev) => {
        if (prev.length === 0) return prev;
        let changed = false;
        const next = prev.map((pet) => {
          const dt = Math.max(0, now - pet.lastTickAt);
          if (dt < 2500) return pet;
          changed = true;
          let nextSick = pet.sick;
          if (!nextSick) {
            const dtSec = Math.min(dt / 1000, 120);
            const pPerSec = 0.000035;
            if (Math.random() < 1 - Math.pow(1 - pPerSec, dtSec)) {
              nextSick = true;
            }
          }
          const ticked = tickPetCareMeters(pet, dt);
          return {
            ...ticked,
            sick: nextSick,
            lastTickAt: now,
          };
        });
        return changed ? next : prev;
      });
    };

    tickFarmWorld();
    const timer = window.setInterval(tickFarmWorld, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const persistState = () => {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            houseVersion: HOUSE_LAYOUT_VERSION,
            characterCreated: hasCreatedCharacter,
            avatar,
            stats,
            plots,
            farmInventory: {
              seeds: pruneZeroCounts(farmInventory.seeds),
              crops: pruneZeroCounts(farmInventory.crops),
              animalProducts: pruneZeroCounts(farmInventory.animalProducts),
              processed: pruneZeroCounts(farmInventory.processed),
              dishes: pruneZeroCounts(farmInventory.dishes),
              supplies: farmInventory.supplies,
            },
            kitchenLevel,
            warehouseLevel,
            millQueue,
            cookingQueue,
            livestock,
            troughs,
            pondFish,
            waterCan,
            wellWater,
            farmOrders,
            ownedIds,
            dailyQuests,
            checkIn,
            placedFurniture,
            furnitureInventory: pruneZeroCounts(furnitureInventory),
            placedFarmDecor,
            farmDecorInventory: pruneZeroCounts(farmDecorInventory),
            joyboyDelivery,
            playerActions,
            fishingRod,
            boats,
            woodenBoat: {
              owned: boats.ownedIds.includes('wooden_boat'),
              purchasedAt: boats.purchasedAt.wooden_boat ?? null,
            },
            fishBasket,
            fishDex,
            bugNet,
            insectBasket,
            insectDex,
            accountCreatedAt,
            accountId,
            ownedMounts,
            redeemedCodes,
            ownedPets,
            activePetId,
            carriedPetId,
            petSupplies,
            bbqFoods: pruneZeroCounts(bbqFoods),
            equippedFoodId,
            peppaIngredients: pruneZeroCounts(peppaIngredients),
            unlockedPeppaRecipes,
            peppaDishes: pruneZeroCounts(peppaDishes),
            lastFreeClawDate,
          }),
        );
      } catch {
        // ignore storage quota errors
      }
    };

    const timer = window.setTimeout(persistState, 800);
    window.addEventListener('pagehide', persistState);
    window.addEventListener('beforeunload', persistState);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pagehide', persistState);
      window.removeEventListener('beforeunload', persistState);
    };
  }, [
    hasCreatedCharacter,
    avatar,
    stats,
    plots,
    farmInventory,
    kitchenLevel,
    warehouseLevel,
    millQueue,
    cookingQueue,
    livestock,
    troughs,
    pondFish,
    waterCan,
    wellWater,
    farmOrders,
    ownedIds,
    dailyQuests,
    checkIn,
    placedFurniture,
    furnitureInventory,
    placedFarmDecor,
    farmDecorInventory,
    joyboyDelivery,
    playerActions,
    fishingRod,
    boats,
    fishBasket,
    fishDex,
    bugNet,
    insectBasket,
    insectDex,
    accountCreatedAt,
    accountId,
    ownedMounts,
    redeemedCodes,
    ownedPets,
    activePetId,
    carriedPetId,
    petSupplies,
    bbqFoods,
    equippedFoodId,
    peppaIngredients,
    unlockedPeppaRecipes,
    peppaDishes,
    lastFreeClawDate,
  ]);

  // Gentle passive hunger decay (-1 every 130 seconds for relaxed pacing)
  useEffect(() => {
    const id = window.setInterval(() => {
      setStats((prev) => {
        const cur = prev.hunger ?? 100;
        if (cur <= 0) return prev;
        return {...prev, hunger: Math.max(0, cur - 1)};
      });
    }, 130000);
    return () => window.clearInterval(id);
  }, []);

  const handleZoneChange = (next: ZoneId) => {
    setZone(next);
    if (next !== 'home') {
      returnToFurnitureModalRef.current = false;
      setFurnitureModalOpen(false);
      setActiveApplianceModal(null);
      setEditFurnitureMode(false);
      setSelectedFurnitureId(null);
    }
    if (next !== 'garden') {
      returnToFarmDecorModalRef.current = false;
      setFarmDecorShopOpen(false);
      setFarmDecorModalOpen(false);
      setEditFarmDecorMode(false);
      setSelectedFarmDecorId(null);
      setWorkshopTab(null);
      setOrdersOpen(false);
      setStorageOpen(false);
      setPastureCoop(null);
      setPondOpen(false);
      setFarmShopOpen(false);
    }
    if (next !== 'town') {
      setShipShopOpen(false);
      setBbqGrillOpen(false);
      setJoyboyModalOpen(false);
    }
    if (next !== 'mall') {
      setTunShopOpen(false);
      setPeppaShopOpen(false);
    }
    if (next !== 'petshop') {
      setPetSupplyShopOpen(false);
      setPetAdoptOpen(false);
    }
    if (next !== 'arcade') {
      setArcadeHubSection(null);
      setActiveArcadeGame(null);
      setCoinGameShopOpen(false);
    }
  };

  const handleTeleportToPlaza = () => {
    const now = Date.now();
    if (now < teleportCooldownEndAt) return;
    setTeleportCooldownEndAt(now + TELEPORT_COOLDOWN_MS);
    setTeleportClockNow(now);
    if (zone !== 'town') {
      handleZoneChange('town');
    }
    setTeleportToPlazaPulse((p) => p + 1);
  };

  const handleRedeemGiftCode = (rawCode: string): {ok: boolean; message: string} => {
    const code = rawCode.trim().toUpperCase();
    if (code === 'HUYHUY03') {
      if (redeemedCodes.includes('HUYHUY03')) {
        return {
          ok: false,
          message: 'Mã "HUYHUY03" đã được quy đổi trên thiết bị này rồi.',
        };
      }
      setRedeemedCodes((prev) => [...prev, 'HUYHUY03']);
      setStats((prev) => ({...prev, coins: prev.coins + 10000}));
      return {
        ok: true,
        message: 'Nhập mã HUYHUY03 thành công! Bạn nhận được +10.000 Xu.',
      };
    }
    return {
      ok: false,
      message: `Mã "${code}" không hợp lệ hoặc đã hết hạn.`,
    };
  };

  const markQuestDone = (key: DailyQuestKey) => {
    const today = getTodayDateKey();
    setDailyQuests((prev) => {
      const normalized = prev.date === today ? normalizeDailyQuests(prev) : createEmptyDailyQuests();
      if (normalized.tasks[key]) return normalized;
      return {...normalized, tasks: {...normalized.tasks, [key]: true}};
    });
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    soundFX.enabled = next;
    setSoundEnabled(next);
    if (next) soundFX.tap();
  };

  const addCoins = (amount: number) => {
    setStats((prev) => ({
      ...prev,
      coins: prev.coins + amount,
      mood: Math.min(100, prev.mood + 4),
    }));
  };

  const handleEarnCoinGame = (amount: number) => {
    if (amount <= 0) return;
    setStats((prev) => ({
      ...prev,
      coinGame: Math.max(0, (prev.coinGame ?? 0) + amount),
      mood: Math.min(100, prev.mood + 3),
    }));
  };

  const handleSpendCoins = (amount: number): boolean => {
    if (amount <= 0) return true;
    if (stats.coins < amount) return false;
    setStats((prev) => ({
      ...prev,
      coins: Math.max(0, prev.coins - amount),
    }));
    return true;
  };

  // === FARMING & PLOT HANDLERS ===
  const handlePlantPlot = (plotId: number, crop: CropType) => {
    const def = CROPS[crop];
    const seedOwned = farmInventory.seeds[crop] || 0;
    if (seedOwned <= 0) return;
    const now = Date.now();

    setFarmInventory((prev) => ({
      ...prev,
      seeds: {
        ...prev.seeds,
        [crop]: Math.max(0, (prev.seeds[crop] || 0) - 1),
      },
    }));
    setStats((prev) => ({
      ...prev,
      energy: Math.max(5, prev.energy - 2),
    }));

    setPlots((prev) =>
      prev.map((plot) => {
        if (plot.id !== plotId || plot.stage !== 'empty') return plot;
        const speed = PLOT_LEVELS[plot.level].speedMultiplier;
        const durationMs = Math.max(5000, Math.round(def.growSeconds * 1000 * speed));
        return {
          ...plot,
          stage: 'growing',
          crop,
          watered: false,
          hasPest: false,
          pestRolled: false,
          plantedAt: now,
          readyAt: now + durationMs,
          durationMs,
        };
      }),
    );
    markQuestDone('garden');
  };

  const handleWaterPlot = (plotId: number) => {
    if (waterCanRef.current <= 0) return;
    const target = plots.find((p) => p.id === plotId);
    if (!target || target.stage !== 'growing' || target.watered || !target.readyAt) return;

    const nextCan = Math.max(0, waterCanRef.current - 1);
    waterCanRef.current = nextCan;
    setWaterCan(nextCan);

    const now = Date.now();
    setPlots((prev) =>
      prev.map((plot) => {
        if (plot.id !== plotId || plot.stage !== 'growing' || plot.watered || !plot.readyAt) {
          return plot;
        }
        const rem = Math.max(1000, plot.readyAt - now);
        const reducedRem = Math.round(rem * 0.8);
        return {
          ...plot,
          watered: true,
          readyAt: now + reducedRem,
        };
      }),
    );
    setStats((prev) => ({
      ...prev,
      energy: Math.max(5, prev.energy - 1),
    }));
    markQuestDone('garden');
  };

  const handleCollectWellWater = (): {
    gained: number;
    waterCan: number;
    wellRemaining: number;
    nextDropSec: number;
  } => {
    const now = Date.now();
    const curWell = wellWaterRef.current;
    const curCan = waterCanRef.current;
    const spaceInCan = Math.max(0, WATER_CAN_MAX - curCan);
    const gained = Math.min(curWell.stored, spaceInCan);

    const nextCan = curCan + gained;
    const nextWellStored = curWell.stored - gained;
    const nextLastTick = curWell.stored >= WELL_WATER_MAX && gained > 0 ? now : curWell.lastTickAt;

    if (gained > 0) {
      waterCanRef.current = nextCan;
      wellWaterRef.current = {stored: nextWellStored, lastTickAt: nextLastTick};
      setWaterCan(nextCan);
      setWellWater({stored: nextWellStored, lastTickAt: nextLastTick});
      setStats((prev) => ({
        ...prev,
        energy: Math.min(100, prev.energy + 10),
      }));
    }

    const remMs = Math.max(0, WELL_WATER_INTERVAL_MS - (now - nextLastTick));
    return {
      gained,
      waterCan: nextCan,
      wellRemaining: nextWellStored,
      nextDropSec: Math.ceil(remMs / 1000),
    };
  };

  const handleSprayPest = (plotId: number) => {
    const target = plots.find((p) => p.id === plotId);
    if (!target || !target.hasPest) return;
    if (farmInventory.supplies.bugSpray <= 0) return;

    setFarmInventory((prev) => ({
      ...prev,
      supplies: {...prev.supplies, bugSpray: prev.supplies.bugSpray - 1},
    }));

    setPlots((prev) =>
      prev.map((plot) => (plot.id === plotId ? {...plot, hasPest: false} : plot)),
    );
    setStats((prev) => ({
      ...prev,
      energy: Math.max(5, prev.energy - 1),
      mood: Math.min(100, prev.mood + 2),
    }));
  };

  const handleWeedPlot = (plotId: number) => {
    const target = plots.find((p) => p.id === plotId);
    if (!target || !target.hasWeed) return;
    setPlots((prev) =>
      prev.map((plot) => (plot.id === plotId ? {...plot, hasWeed: false} : plot)),
    );
    setStats((prev) => ({
      ...prev,
      mood: Math.min(100, prev.mood + 1),
    }));
  };

  const handleCancelCrop = (plotId: number) => {
    setPlots((prev) =>
      prev.map((p) =>
        p.id === plotId && p.stage === 'growing'
          ? {
              ...p,
              stage: 'empty',
              crop: null,
              watered: false,
              hasPest: false,
              hasWeed: false,
              pestRolled: false,
              plantedAt: null,
              readyAt: null,
              durationMs: 0,
            }
          : p,
      ),
    );
  };

  const storageUsed = getFarmStorageUsed(farmInventory);
  const storageCapacity = getFarmStorageCapacity(warehouseLevel);
  const storageFull = storageUsed >= storageCapacity;

  const handleHarvestPlot = (plotId: number): boolean => {
    const target = plots.find((p) => p.id === plotId);
    if (!target || target.stage !== 'ready' || !target.crop) return false;
    if (getFarmStorageUsed(farmInventory) >= getFarmStorageCapacity(warehouseLevel)) {
      return false;
    }

    const yieldQty = target.hasPest ? 1 : 2;
    const harvestedCrop = target.crop;

    setFarmInventory((prev) =>
      adjustFarmInventory(prev, [{kind: 'crop', id: harvestedCrop, delta: yieldQty}]),
    );
    setPlots((prev) =>
      prev.map((p) =>
        p.id === plotId
          ? {
              ...p,
              stage: 'empty',
              crop: null,
              watered: false,
              hasPest: false,
              hasWeed: Math.random() < 0.25,
              pestRolled: false,
              plantedAt: null,
              readyAt: null,
              durationMs: 0,
            }
          : p,
      ),
    );
    setStats((prev) => ({
      ...prev,
      energy: Math.max(5, prev.energy - 2),
      mood: Math.min(100, prev.mood + 2),
    }));
    markQuestDone('garden');
    return true;
  };

  const handleUpgradePlot = (plotId: number) => {
    const target = plots.find((p) => p.id === plotId);
    if (!target || target.level >= 3) return;
    const cost = PLOT_LEVELS[target.level].upgradeCostToNext;
    if (cost === null || stats.coins < cost) return;

    const nextLevel = (target.level + 1) as PlotLevel;
    setStats((prev) => ({
      ...prev,
      coins: prev.coins - cost,
      mood: Math.min(100, prev.mood + 4),
    }));
    setPlots((prev) =>
      prev.map((p) => (p.id === plotId ? {...p, level: nextLevel} : p)),
    );
  };

  // === MILL (4 FIXED SLOTS, FAST TIMED QUEUE), KITCHEN (5/7/10 SLOTS) & ORDERS ===
  const handleStartMill = (id: ProcessedId) => {
    const proc = PROCESSED_ITEMS[id];
    if (!proc || millQueue.length >= MILL_SLOTS) return;
    const hasAll = proc.inputs.every(
      (inp) => getFarmItemCount(farmInventory, inp.kind, inp.id) >= inp.qty,
    );
    if (!hasAll) return;

    const deltas = proc.inputs.map((inp) => ({
      kind: inp.kind,
      id: inp.id,
      delta: -inp.qty,
    }));
    const now = Date.now();
    const durationMs = Math.max(5000, proc.processSeconds * 1000);
    setFarmInventory((prev) => adjustFarmInventory(prev, deltas));
    setMillQueue((prev) => [
      ...prev,
      {
        id: `mill_${now.toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
        processedId: id,
        startedAt: now,
        readyAt: now + durationMs,
        durationMs,
      },
    ]);
    setStats((prev) => ({...prev, mood: Math.min(100, prev.mood + 1)}));
    markQuestDone('cooking');
  };

  const handleCollectProcessed = (jobId: string) => {
    const job = millQueue.find((j) => j.id === jobId);
    if (!job || Date.now() < job.readyAt) return;
    if (getFarmStorageUsed(farmInventory) >= getFarmStorageCapacity(warehouseLevel)) return;
    setMillQueue((prev) => prev.filter((j) => j.id !== jobId));
    setFarmInventory((prev) =>
      adjustFarmInventory(prev, [{kind: 'processed', id: job.processedId, delta: 1}]),
    );
    setStats((prev) => ({...prev, mood: Math.min(100, prev.mood + 2)}));
  };

  const handleStartCook = (id: RecipeId) => {
    const rec = KITCHEN_RECIPES[id];
    const kInfo = KITCHEN_LEVELS[kitchenLevel];
    if (!rec || cookingQueue.length >= kInfo.slots) return;
    const hasAll = rec.inputs.every(
      (inp) => getFarmItemCount(farmInventory, inp.kind, inp.id) >= inp.qty,
    );
    if (!hasAll) return;

    const deltas = rec.inputs.map((inp) => ({
      kind: inp.kind,
      id: inp.id,
      delta: -inp.qty,
    }));
    const now = Date.now();
    const durationMs = Math.max(
      30000,
      Math.round(rec.cookSeconds * 1000 * kInfo.speedMultiplier),
    );
    setFarmInventory((prev) => adjustFarmInventory(prev, deltas));
    setCookingQueue((prev) => [
      ...prev,
      {
        id: `cook_${now.toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
        recipeId: id,
        startedAt: now,
        readyAt: now + durationMs,
        durationMs,
      },
    ]);
    setStats((prev) => ({...prev, mood: Math.min(100, prev.mood + 2)}));
    markQuestDone('cooking');
  };

  const handleCollectDish = (jobId: string) => {
    const job = cookingQueue.find((j) => j.id === jobId);
    if (!job || Date.now() < job.readyAt) return;
    if (getFarmStorageUsed(farmInventory) >= getFarmStorageCapacity(warehouseLevel)) return;
    setCookingQueue((prev) => prev.filter((j) => j.id !== jobId));
    setFarmInventory((prev) =>
      adjustFarmInventory(prev, [{kind: 'dish', id: job.recipeId, delta: 1}]),
    );
    setStats((prev) => ({...prev, mood: Math.min(100, prev.mood + 3)}));
    markQuestDone('cooking');
  };

  const handleUpgradeKitchen = () => {
    if (kitchenLevel >= 3) return;
    const cost = KITCHEN_LEVELS[kitchenLevel].upgradeCostToNext;
    if (cost === null || stats.coins < cost) return;
    const nextLevel = (kitchenLevel + 1) as KitchenLevel;
    setStats((prev) => ({
      ...prev,
      coins: prev.coins - cost,
      mood: Math.min(100, prev.mood + 5),
    }));
    setKitchenLevel(nextLevel);
  };

  // === FARM BUS SHOP HANDLERS ===
  const handleBuySeedBag = (crop: CropType, qty = 1) => {
    const cost = CROPS[crop].seedPrice * qty;
    if (stats.coins < cost) return;
    if (getFarmStorageUsed(farmInventory) + qty > getFarmStorageCapacity(warehouseLevel)) return;
    setStats((prev) => ({...prev, coins: prev.coins - cost}));
    setFarmInventory((prev) => ({
      ...prev,
      seeds: {
        ...prev.seeds,
        [crop]: (prev.seeds[crop] || 0) + qty,
      },
    }));
  };

  const handleBuyFarmSupply = (supply: keyof FarmSupplies, qty = 1) => {
    const cost = SUPPLY_PRICES[supply] * qty;
    if (stats.coins < cost) return;
    if (getFarmStorageUsed(farmInventory) + qty > getFarmStorageCapacity(warehouseLevel)) return;
    setStats((prev) => ({...prev, coins: prev.coins - cost}));
    setFarmInventory((prev) => ({
      ...prev,
      supplies: {
        ...prev.supplies,
        [supply]: prev.supplies[supply] + qty,
      },
    }));
  };

  const handleFulfillOrder = (orderId: string) => {
    const order = farmOrders.find((o) => o.id === orderId);
    if (!order) return;
    const hasAll = order.requirements.every(
      (req) => getFarmItemCount(farmInventory, req.kind, req.id) >= req.qty,
    );
    if (!hasAll) return;

    const deltas = order.requirements.map((req) => ({
      kind: req.kind,
      id: req.id,
      delta: -req.qty,
    }));
    setFarmInventory((prev) => adjustFarmInventory(prev, deltas));
    setStats((prev) => ({
      ...prev,
      coins: prev.coins + order.rewardCoins,
      mood: Math.min(100, prev.mood + 6),
    }));
    setFarmOrders((prev) =>
      prev.map((o, idx) => (o.id === orderId ? createSingleFarmOrder(idx + 1) : o)),
    );
    markQuestDone('cooking');
  };

  const handleRefreshOrder = (orderId: string) => {
    if (stats.coins < 5) return;
    setStats((prev) => ({...prev, coins: prev.coins - 5}));
    setFarmOrders((prev) =>
      prev.map((o, idx) => (o.id === orderId ? createSingleFarmOrder(idx + 7) : o)),
    );
  };

  const handleDirectSell = (kind: FarmItemKind, id: string, qty: number) => {
    const have = getFarmItemCount(farmInventory, kind, id);
    const sellQty = Math.min(have, qty);
    if (sellQty <= 0) return;

    const earn = getFarmItemDirectSellPrice(kind, id) * sellQty;
    setFarmInventory((prev) => adjustFarmInventory(prev, [{kind, id, delta: -sellQty}]));
    setStats((prev) => ({...prev, coins: prev.coins + earn}));
  };

  const handleSellSeed = (crop: CropType, qty: number) => {
    const have = farmInventory.seeds[crop] || 0;
    const sellQty = Math.min(have, qty);
    if (sellQty <= 0) return;

    const earn = getFarmSeedSellPrice(crop) * sellQty;
    setFarmInventory((prev) => ({
      ...prev,
      seeds: {
        ...prev.seeds,
        [crop]: Math.max(0, (prev.seeds[crop] || 0) - sellQty),
      },
    }));
    setStats((prev) => ({...prev, coins: prev.coins + earn}));
  };

  const handleSellSupply = (supply: keyof FarmSupplies, qty: number) => {
    const have = farmInventory.supplies[supply] || 0;
    const sellQty = Math.min(have, qty);
    if (sellQty <= 0) return;

    const earn = SUPPLY_META[supply].sellPrice * sellQty;
    setFarmInventory((prev) => ({
      ...prev,
      supplies: {
        ...prev.supplies,
        [supply]: Math.max(0, prev.supplies[supply] - sellQty),
      },
    }));
    setStats((prev) => ({...prev, coins: prev.coins + earn}));
  };

  const handleUpgradeWarehouse = () => {
    const cost = getWarehouseUpgradeCost(warehouseLevel);
    if (cost === null || stats.coins < cost) return;
    setStats((prev) => ({
      ...prev,
      coins: prev.coins - cost,
      mood: Math.min(100, prev.mood + 4),
    }));
    setWarehouseLevel((prev) => Math.min(MAX_WAREHOUSE_LEVEL, prev + 1));
  };

  // === LIVESTOCK (2 COOPS: POULTRY & CATTLE) HANDLERS ===
  const handleBuyAnimal = (type: AnimalType) => {
    const def = ANIMALS[type];
    const coopCount = livestock.filter((a) => a.coop === def.coop).length;
    if (coopCount >= MAX_COOP_ANIMALS[def.coop] || stats.coins < def.buyPrice) return;
    const now = Date.now();
    const countOfType = livestock.filter((a) => a.type === type).length + 1;
    setStats((prev) => ({
      ...prev,
      coins: prev.coins - def.buyPrice,
      mood: Math.min(100, prev.mood + 5),
    }));
    setLivestock((prev) => [...prev, createAnimalInstance(type, countOfType, now, false)]);
  };

  const handleFeedAnimal = (animalId: string) => {
    if (farmInventory.supplies.animalFeed <= 0) return;

    setFarmInventory((prev) => ({
      ...prev,
      supplies: {...prev.supplies, animalFeed: prev.supplies.animalFeed - 1},
    }));

    setLivestock((prev) =>
      prev.map((a) => {
        if (a.id !== animalId) return a;
        if (a.stage === 'baby') {
          const nextGrow = Math.max(0, Math.round(a.growRemainingMs * 0.72));
          return {
            ...a,
            hunger: Math.min(100, a.hunger + 65),
            growRemainingMs: nextGrow,
            stage: nextGrow <= 0 ? 'adult' : 'baby',
          };
        }
        const nextProd = a.hasProduce
          ? a.produceRemainingMs
          : Math.max(0, Math.round(a.produceRemainingMs * 0.72));
        return {
          ...a,
          hunger: Math.min(100, a.hunger + 65),
          produceRemainingMs: nextProd,
          hasProduce: a.hasProduce || (a.stage === 'adult' && nextProd <= 0),
        };
      }),
    );
    markQuestDone('livestock');
  };

  const handleFillCoopTrough = (coop: CoopKind) => {
    const coopCount = livestock.filter((a) => a.coop === coop).length;
    const needed = Math.max(0, coopCount - troughs[coop]);
    const inBag = farmInventory.supplies.animalFeed;
    const used = Math.min(needed, inBag);
    if (used <= 0) return;

    setFarmInventory((prev) => ({
      ...prev,
      supplies: {...prev.supplies, animalFeed: prev.supplies.animalFeed - used},
    }));
    setTroughs((prev) => {
      const next = {...prev, [coop]: Math.min(coopCount, prev[coop] + used)};
      troughsRef.current = next;
      return next;
    });
  };

  const handleCureAnimal = (animalId: string) => {
    if (farmInventory.supplies.animalMedicine <= 0) return;

    setFarmInventory((prev) => ({
      ...prev,
      supplies: {...prev.supplies, animalMedicine: prev.supplies.animalMedicine - 1},
    }));

    setLivestock((prev) =>
      prev.map((a) => (a.id === animalId ? {...a, sick: false} : a)),
    );
  };

  const handleCollectProduce = (animalId: string) => {
    const ani = livestock.find((a) => a.id === animalId);
    if (!ani || !ani.hasProduce) return;
    if (getFarmStorageUsed(farmInventory) >= getFarmStorageCapacity(warehouseLevel)) return;
    const def = ANIMALS[ani.type];
    const yieldQty = ani.sick ? 1 : 2;

    setFarmInventory((prev) =>
      adjustFarmInventory(prev, [{kind: 'animal_product', id: def.produceId, delta: yieldQty}]),
    );
    setLivestock((prev) =>
      prev.map((a) =>
        a.id === animalId
          ? {
              ...a,
              hasProduce: false,
              produceRemainingMs: a.produceCycleMs,
              lastTickAt: Date.now(),
            }
          : a,
      ),
    );
    setStats((prev) => ({
      ...prev,
      energy: Math.max(5, prev.energy - 1),
      mood: Math.min(100, prev.mood + 3),
    }));
    markQuestDone('livestock');
  };

  const handleSellAnimal = (animalId: string) => {
    const ani = livestock.find((a) => a.id === animalId);
    if (!ani) return;
    const def = ANIMALS[ani.type];
    const sellPrice =
      ani.stage === 'baby' ? Math.round(def.buyPrice * 0.7) : def.adultSellPrice;
    setLivestock((prev) => prev.filter((a) => a.id !== animalId));
    setStats((prev) => ({...prev, coins: prev.coins + sellPrice}));
  };

  // === POND AQUACULTURE (CÁ 12H · VỊT VÀNG 1 NGÀY · RÙA 2 NGÀY) HANDLERS ===
  const handleStockFish = (species: PondFishSpecies) => {
    const spec = POND_FISH_SPECIES[species];
    if (pondFish.length >= MAX_POND_FISH || stats.coins < spec.fryPrice) return;
    const now = Date.now();
    const durationMs = spec.durationHours * 3600 * 1000;
    setStats((prev) => ({
      ...prev,
      coins: prev.coins - spec.fryPrice,
      mood: Math.min(100, prev.mood + 4),
    }));
    setPondFish((prev) => [
      ...prev,
      {
        id: `fish_${now.toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
        species,
        stage: 'growing',
        stockedAt: now,
        remainingMs: durationMs,
        totalDurationMs: durationMs,
        hunger: 100,
        sick: false,
        lastCareCheckAt: now,
        lastTickAt: now,
      },
    ]);
  };

  // 1 túi thức ăn thủy sinh (5 Xu) rải khi đứng gần hồ -> cho tối đa 4 con ăn
  const handleScatterPondFeed = () => {
    if (!nearPond || farmInventory.supplies.fishFeed <= 0) return;
    const candidates = pondFish
      .filter((f) => f.stage === 'growing' && f.hunger < 95)
      .sort((a, b) => a.hunger - b.hunger)
      .slice(0, 4);
    if (candidates.length === 0) return;

    const fedIds = new Set(candidates.map((c) => c.id));
    setFarmInventory((prev) => ({
      ...prev,
      supplies: {...prev.supplies, fishFeed: prev.supplies.fishFeed - 1},
    }));
    setPondFish((prev) =>
      prev.map((f) =>
        fedIds.has(f.id) ? {...f, hunger: Math.min(100, f.hunger + 65)} : f,
      ),
    );
    setPondFeedPulse((n) => n + 1);
    markQuestDone('livestock');
  };

  const handleCureFish = (fishId: string) => {
    if (farmInventory.supplies.fishMedicine <= 0) return;
    setFarmInventory((prev) => ({
      ...prev,
      supplies: {...prev.supplies, fishMedicine: prev.supplies.fishMedicine - 1},
    }));

    setPondFish((prev) =>
      prev.map((f) => (f.id === fishId ? {...f, sick: false, lastCareCheckAt: Date.now()} : f)),
    );
  };

  const handleHarvestFish = (fishId: string) => {
    const fish = pondFish.find((f) => f.id === fishId);
    if (!fish || fish.stage !== 'ready') return;
    const spec = POND_FISH_SPECIES[fish.species];
    setPondFish((prev) => prev.filter((f) => f.id !== fishId));
    setStats((prev) => ({
      ...prev,
      coins: prev.coins + spec.matureSellPrice,
      mood: Math.min(100, prev.mood + 6),
    }));
    markQuestDone('livestock');
  };

  // === FISHING SYSTEM (KOI STALL, BAG ROD/NET, BASKET & FISHDEX) ===
  const handleBuyFishingRod = () => {
    if (fishingRod.owned || stats.coins < WOODEN_ROD_PRICE) return;
    soundFX.sparkle();
    setStats((prev) => ({
      ...prev,
      coins: prev.coins - WOODEN_ROD_PRICE,
      mood: Math.min(100, prev.mood + 5),
    }));
    setFishingRod({
      owned: true,
      equipped: false,
      durability: WOODEN_ROD_MAX_DURABILITY,
      maxDurability: WOODEN_ROD_MAX_DURABILITY,
    });
  };

  const handleBuyBoat = (boatId: BoatId) => {
    const spec = BOAT_CATALOG[boatId];
    if (!spec || boats.ownedIds.includes(boatId) || stats.coins < spec.price) return;
    soundFX.sparkle();
    setStats((prev) => ({
      ...prev,
      coins: prev.coins - spec.price,
      mood: Math.min(100, prev.mood + 8),
    }));
    setBoats((prev) => ({
      ownedIds: prev.ownedIds.includes(boatId) ? prev.ownedIds : [...prev.ownedIds, boatId],
      activeBoatId: boatId,
      purchasedAt: {
        ...prev.purchasedAt,
        [boatId]: Date.now(),
      },
    }));
  };

  const handleSelectBoat = (boatId: BoatId) => {
    if (!boats.ownedIds.includes(boatId)) return;
    soundFX.tap();
    setBoats((prev) => ({
      ...prev,
      activeBoatId: boatId,
    }));
  };

  const handleBuyMount = (mountId: MountId) => {
    const def = MOUNT_CATALOG[mountId];
    if (!def || ownedMounts.ownedIds.includes(mountId) || stats.coins < def.price) return;
    soundFX.sparkle();
    setStats((prev) => ({
      ...prev,
      coins: prev.coins - def.price,
      mood: Math.min(100, prev.mood + 8),
    }));
    setOwnedMounts((prev) => ({
      ownedIds: prev.ownedIds.includes(mountId) ? prev.ownedIds : [...prev.ownedIds, mountId],
      activeMountId: mountId,
      lastMountId: mountId,
    }));
    setFishingRod((prev) => (prev.equipped ? {...prev, equipped: false} : prev));
    setBugNet((prev) => (prev.equipped ? {...prev, equipped: false} : prev));
    setEquippedFoodId(null);
    setAvatar((prev) => (prev.handheld !== 'none' ? {...prev, handheld: 'none'} : prev));
  };

  const handleBuyCoinGameMount = (mountId: MountId) => {
    const def = MOUNT_CATALOG[mountId];
    const cost = def?.coinGamePrice ?? def?.price ?? 0;
    if (!def || def.currency !== 'coinGame' || ownedMounts.ownedIds.includes(mountId)) return;
    if ((stats.coinGame ?? 0) < cost) return;
    soundFX.sparkle();
    setStats((prev) => ({
      ...prev,
      coinGame: Math.max(0, (prev.coinGame ?? 0) - cost),
      mood: Math.min(100, prev.mood + 10),
    }));
    setOwnedMounts((prev) => ({
      ownedIds: prev.ownedIds.includes(mountId) ? prev.ownedIds : [...prev.ownedIds, mountId],
      activeMountId: mountId,
      lastMountId: mountId,
    }));
    setFishingRod((prev) => (prev.equipped ? {...prev, equipped: false} : prev));
    setBugNet((prev) => (prev.equipped ? {...prev, equipped: false} : prev));
    setEquippedFoodId(null);
    setAvatar((prev) => (prev.handheld !== 'none' ? {...prev, handheld: 'none'} : prev));
  };

  const handleToggleMount = (mountId: MountId) => {
    if (!ownedMounts.ownedIds.includes(mountId)) return;
    const willMount = ownedMounts.activeMountId !== mountId;
    setOwnedMounts((prev) => ({
      ...prev,
      activeMountId: willMount ? mountId : null,
      lastMountId: mountId,
    }));
    if (willMount) {
      setFishingRod((prev) => (prev.equipped ? {...prev, equipped: false} : prev));
      setBugNet((prev) => (prev.equipped ? {...prev, equipped: false} : prev));
      setEquippedFoodId(null);
      setAvatar((prev) => (prev.handheld !== 'none' ? {...prev, handheld: 'none'} : prev));
    }
  };

  const handleDismountMount = () => {
    setOwnedMounts((prev) => (prev.activeMountId ? {...prev, activeMountId: null} : prev));
  };

  const handleRepairFishingRod = () => {
    if (!fishingRod.owned || fishingRod.durability >= fishingRod.maxDurability) return false;
    const cost = getRodRepairCost(fishingRod.durability, fishingRod.maxDurability);
    if (stats.coins < cost) return false;
    soundFX.sparkle();
    setStats((prev) => ({
      ...prev,
      coins: prev.coins - cost,
    }));
    setFishingRod((prev) => ({
      ...prev,
      durability: prev.maxDurability,
    }));
    return true;
  };

  const handleToggleEquipRod = () => {
    if (!fishingRod.owned) return;
    const nextEquipped = !fishingRod.equipped;
    setFishingRod((prev) => ({...prev, equipped: nextEquipped}));
    // Stowing bug net, handheld food, mount & fashion item back when equipping fishing rod
    if (nextEquipped) {
      setBugNet((prev) => (prev.equipped ? {...prev, equipped: false} : prev));
      setEquippedFoodId(null);
      setOwnedMounts((prev) => (prev.activeMountId ? {...prev, activeMountId: null} : prev));
      setAvatar((prev) => (prev.handheld !== 'none' ? {...prev, handheld: 'none'} : prev));
    }
  };

  const handleCatchRiverFish = (preRolled?: {
    speciesId: FishSpeciesId;
    weightKg: number;
    sellPrice: number;
    waterType?: FishWaterType;
  }) => {
    const rod = fishingRodRef.current;
    if (!rod.owned || !rod.equipped || rod.durability <= 0) return null;

    const isSea = (preRolled?.waterType ?? (zone === 'island' ? 'sea' : 'river')) === 'sea';
    const caught = preRolled
      ? {
          species: ALL_FISH_CATALOG[preRolled.speciesId],
          weightKg: preRolled.weightKg,
          sellPrice: preRolled.sellPrice,
        }
      : isSea
        ? rollRandomSeaFish()
        : rollRandomRiverFish();
    const spec = caught.species;

    const durLost = rollRodDurabilityLoss('catch', spec.rarity);
    const nextDur = Math.max(0, rod.durability - durLost);

    const existingDex = fishDex[spec.id];
    const isFirstDiscovery = !existingDex || existingDex.caughtCount === 0;
    const isNewRecord =
      Boolean(existingDex && existingDex.caughtCount > 0) &&
      caught.weightKg > (existingDex?.maxWeightKg ?? 0);

    const newItem: CaughtFishItem = {
      id: `fish_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      speciesId: spec.id,
      waterType: spec.waterType,
      weightKg: caught.weightKg,
      sellPrice: caught.sellPrice,
      caughtAt: Date.now(),
      locked: false,
    };

    if (durLost > 0) {
      setFishingRod((prev) => ({
        ...prev,
        durability: Math.max(0, prev.durability - durLost),
      }));
    }
    setFishBasket((prev) => [newItem, ...prev]);
    setFishDex((prev) => {
      const existing = prev[spec.id] ?? {
        caughtCount: 0,
        maxWeightKg: 0,
      };
      return {
        ...prev,
        [spec.id]: {
          caughtCount: existing.caughtCount + 1,
          maxWeightKg: Math.max(existing.maxWeightKg, caught.weightKg),
        },
      };
    });
    setStats((prev) => ({
      ...prev,
      energy: Math.max(5, prev.energy - 2),
      hunger: Math.max(0, (prev.hunger ?? 90) - 1),
      mood: Math.min(100, prev.mood + 2),
    }));
    markQuestDone('fishing');

    return {
      speciesId: spec.id,
      name: spec.name,
      rarity: spec.rarity,
      weightKg: caught.weightKg,
      sellPrice: caught.sellPrice,
      isNewRecord,
      isFirstDiscovery,
      durabilityLeft: nextDur,
      maxDurability: rod.maxDurability,
      durabilityLost: durLost,
    };
  };

  const handleLoseFishingDurability = () => {
    const rod = fishingRodRef.current;
    if (!rod.owned) {
      return {durabilityLeft: 0, maxDurability: WOODEN_ROD_MAX_DURABILITY, durabilityLost: 0};
    }
    const durLost = rollRodDurabilityLoss('escape');
    const nextDur = Math.max(0, rod.durability - durLost);
    if (durLost > 0) {
      setFishingRod((prev) => ({
        ...prev,
        durability: Math.max(0, prev.durability - durLost),
      }));
    }
    setStats((prev) => ({
      ...prev,
      energy: Math.max(5, prev.energy - 1),
    }));
    return {
      durabilityLeft: nextDur,
      maxDurability: rod.maxDurability,
      durabilityLost: durLost,
    };
  };

  const handleToggleFishLock = (fishId: string) => {
    setFishBasket((prev) =>
      prev.map((f) => (f.id === fishId ? {...f, locked: !f.locked} : f)),
    );
  };

  const handleSellFish = (fishId: string) => {
    const target = fishBasket.find((f) => f.id === fishId);
    if (!target || target.locked) return;
    const gain = computeFishSellPrice(target.speciesId, target.weightKg);
    soundFX.sparkle();
    setFishBasket((prev) => prev.filter((f) => f.id !== fishId));
    setStats((prev) => ({
      ...prev,
      coins: prev.coins + gain,
      mood: Math.min(100, prev.mood + 1),
    }));
  };

  const handleSellAllUnlockedFish = (waterType: FishWaterType = 'river') => {
    const unlocked = fishBasket.filter((f) => !f.locked && f.waterType === waterType);
    if (unlocked.length === 0) return;
    const totalGain = unlocked.reduce(
      (sum, f) => sum + computeFishSellPrice(f.speciesId, f.weightKg),
      0,
    );
    soundFX.sparkle();
    setFishBasket((prev) => prev.filter((f) => f.locked || f.waterType !== waterType));
    setStats((prev) => ({
      ...prev,
      coins: prev.coins + totalGain,
      mood: Math.min(100, prev.mood + Math.min(8, unlocked.length)),
    }));
  };

  // === BUG NET & INSECT CATCHING SYSTEM ===
  const handleBuyBugNet = () => {
    if (bugNet.owned || stats.coins < WOODEN_NET_PRICE) return;
    soundFX.sparkle();
    setStats((prev) => ({
      ...prev,
      coins: prev.coins - WOODEN_NET_PRICE,
      mood: Math.min(100, prev.mood + 5),
    }));
    setBugNet({
      owned: true,
      equipped: false,
      durability: WOODEN_NET_MAX_DURABILITY,
      maxDurability: WOODEN_NET_MAX_DURABILITY,
    });
  };

  const handleRepairBugNet = () => {
    if (!bugNet.owned || bugNet.durability >= bugNet.maxDurability) return false;
    const cost = getNetRepairCost(bugNet.durability, bugNet.maxDurability);
    if (stats.coins < cost) return false;
    soundFX.sparkle();
    setStats((prev) => ({
      ...prev,
      coins: prev.coins - cost,
    }));
    setBugNet((prev) => ({
      ...prev,
      durability: prev.maxDurability,
    }));
    return true;
  };

  const handleToggleEquipNet = () => {
    if (!bugNet.owned) return;
    const nextEquipped = !bugNet.equipped;
    setBugNet((prev) => ({...prev, equipped: nextEquipped}));
    if (nextEquipped) {
      setFishingRod((prev) => (prev.equipped ? {...prev, equipped: false} : prev));
      setEquippedFoodId(null);
      setOwnedMounts((prev) => (prev.activeMountId ? {...prev, activeMountId: null} : prev));
      setAvatar((prev) => (prev.handheld !== 'none' ? {...prev, handheld: 'none'} : prev));
    }
  };

  const handleCatchInsect = (caught: {
    speciesId: InsectSpeciesId;
    lengthMm: number;
    sellPrice: number;
  }) => {
    const net = bugNetRef.current;
    if (!net.owned || !net.equipped || net.durability <= 0) return null;

    const spec = INSECT_CATALOG[caught.speciesId];
    if (!spec) return null;

    const durLost = rollNetDurabilityLoss('catch', spec.rarity);
    const nextDur = Math.max(0, net.durability - durLost);

    const existingDex = insectDex[spec.id];
    const isFirstDiscovery = !existingDex || existingDex.caughtCount === 0;
    const isNewRecord =
      Boolean(existingDex && existingDex.caughtCount > 0) &&
      caught.lengthMm > (existingDex?.maxLengthMm ?? 0);

    const newItem: CaughtInsectItem = {
      id: `bug_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      speciesId: spec.id,
      lengthMm: caught.lengthMm,
      sellPrice: caught.sellPrice,
      caughtAt: Date.now(),
      locked: false,
    };

    if (durLost > 0) {
      setBugNet((prev) => ({
        ...prev,
        durability: Math.max(0, prev.durability - durLost),
      }));
    }
    setInsectBasket((prev) => [newItem, ...prev]);
    setInsectDex((prev) => {
      const existing = prev[spec.id] ?? {
        caughtCount: 0,
        maxLengthMm: 0,
      };
      return {
        ...prev,
        [spec.id]: {
          caughtCount: existing.caughtCount + 1,
          maxLengthMm: Math.max(existing.maxLengthMm, caught.lengthMm),
        },
      };
    });
    setStats((prev) => ({
      ...prev,
      energy: Math.max(5, prev.energy - 2),
      hunger: Math.max(0, (prev.hunger ?? 90) - 1),
      mood: Math.min(100, prev.mood + 2),
    }));
    markQuestDone('insects');

    return {
      speciesId: spec.id,
      name: spec.name,
      rarity: spec.rarity,
      lengthMm: caught.lengthMm,
      sellPrice: caught.sellPrice,
      isNewRecord,
      isFirstDiscovery,
      durabilityLeft: nextDur,
      maxDurability: net.maxDurability,
      durabilityLost: durLost,
    };
  };

  const handleLoseNetDurability = () => {
    const net = bugNetRef.current;
    if (!net.owned) {
      return {durabilityLeft: 0, maxDurability: WOODEN_NET_MAX_DURABILITY, durabilityLost: 0};
    }
    const durLost = rollNetDurabilityLoss('miss');
    const nextDur = Math.max(0, net.durability - durLost);
    if (durLost > 0) {
      setBugNet((prev) => ({
        ...prev,
        durability: Math.max(0, prev.durability - durLost),
      }));
    }
    setStats((prev) => ({
      ...prev,
      energy: Math.max(5, prev.energy - 1),
    }));
    return {
      durabilityLeft: nextDur,
      maxDurability: net.maxDurability,
      durabilityLost: durLost,
    };
  };

  const handleToggleInsectLock = (insectId: string) => {
    setInsectBasket((prev) =>
      prev.map((b) => (b.id === insectId ? {...b, locked: !b.locked} : b)),
    );
  };

  const handleSellInsect = (insectId: string) => {
    const target = insectBasket.find((b) => b.id === insectId);
    if (!target || target.locked) return;
    const gain = computeInsectSellPrice(target.speciesId, target.lengthMm);
    soundFX.sparkle();
    setInsectBasket((prev) => prev.filter((b) => b.id !== insectId));
    setStats((prev) => ({
      ...prev,
      coins: prev.coins + gain,
      mood: Math.min(100, prev.mood + 1),
    }));
  };

  const handleSellAllUnlockedInsects = () => {
    const unlocked = insectBasket.filter((b) => !b.locked);
    if (unlocked.length === 0) return;
    const totalGain = unlocked.reduce(
      (sum, b) => sum + computeInsectSellPrice(b.speciesId, b.lengthMm),
      0,
    );
    soundFX.sparkle();
    setInsectBasket((prev) => prev.filter((b) => b.locked));
    setStats((prev) => ({
      ...prev,
      coins: prev.coins + totalGain,
      mood: Math.min(100, prev.mood + Math.min(8, unlocked.length)),
    }));
  };

  // === BBQ CAMPSITE FOOD & VENDING DRINK HANDLERS ===
  const handleCookBbqFood = (foodId: BbqFoodId): {ok: boolean; message: string} => {
    const def = BBQ_FOOD_CATALOG[foodId];
    if (!def) return {ok: false, message: 'Món nướng không hợp lệ.'};
    if (stats.coins < def.price) {
      return {ok: false, message: `Bạn cần ${def.price} Xu để nướng ${def.name}.`};
    }
    setStats((prev) => ({...prev, coins: prev.coins - def.price}));
    setBbqFoods((prev) => ({...prev, [foodId]: (prev[foodId] ?? 0) + 1}));
    markQuestDone('cooking');
    return {ok: true, message: `Đã nướng thơm phức 1 ${def.name}! Mở Túi Đồ -> Thức Ăn để cầm trên tay nhé.`};
  };

  const handleBuyVendingDrink = (drinkId: BbqFoodId): {ok: boolean; message: string} => {
    const def = BBQ_FOOD_CATALOG[drinkId];
    if (!def || def.kind !== 'drink') return {ok: false, message: 'Thức uống không hợp lệ.'};
    if (stats.coins < def.price) {
      return {ok: false, message: `Bạn cần ${def.price} Xu để mua ${def.name}.`};
    }
    setStats((prev) => ({...prev, coins: prev.coins - def.price}));
    setBbqFoods((prev) => ({...prev, [drinkId]: (prev[drinkId] ?? 0) + 1}));
    return {ok: true, message: `Đã mua 1 ${def.name}! Mở Túi Đồ -> Thức Ăn để cầm trên tay và uống nhé.`};
  };

  const handleToggleEquipFood = (foodId: BbqFoodId) => {
    if ((bbqFoods[foodId] ?? 0) <= 0) return;
    if (equippedFoodId === foodId) {
      setEquippedFoodId(null);
      return;
    }
    setFishingRod((prev) => (prev.equipped ? {...prev, equipped: false} : prev));
    setBugNet((prev) => (prev.equipped ? {...prev, equipped: false} : prev));
    setOwnedMounts((prev) => (prev.activeMountId ? {...prev, activeMountId: null} : prev));
    setAvatar((prev) => (prev.handheld !== 'none' ? {...prev, handheld: 'none'} : prev));
    setEquippedFoodId(foodId);
  };

  const handleEatBbqFood = (foodId: BbqFoodId): {ok: boolean; message: string} => {
    const def = BBQ_FOOD_CATALOG[foodId];
    const count = bbqFoods[foodId] ?? 0;
    if (!def || count <= 0) {
      return {
        ok: false,
        message: def?.kind === 'drink' ? 'Bạn đã hết nước uống này trong túi.' : 'Bạn đã hết món ăn này trong túi.',
      };
    }
    if ((stats.hunger ?? 100) >= 100) {
      return {ok: false, message: 'Bạn đã no căng rồi (100% Độ no)!'};
    }
    const nextCount = count - 1;
    setBbqFoods((prev) => ({...prev, [foodId]: nextCount}));
    if (nextCount <= 0 && equippedFoodId === foodId) {
      setEquippedFoodId(null);
    }
    setStats((prev) => ({
      ...prev,
      hunger: Math.min(100, Math.round((prev.hunger ?? 100) + def.hungerRestore)),
      mood: Math.min(100, prev.mood + 3),
    }));
    const verb = def.kind === 'drink' ? 'Đã uống' : 'Đã ăn';
    return {ok: true, message: `${verb} ${def.name}! (+${def.hungerRestore}% Độ no)`};
  };

  // === SIÊU THỊ MINI CỦA PEPPA & BẾP GIA DỤNG (LÒ VI SÓNG / LÒ NƯỚNG MINI) ===
  const handleBuyPeppaIngredient = (id: PeppaIngredientId, qty: number): boolean => {
    const def = PEPPA_INGREDIENTS[id];
    const amount = Math.max(1, Math.floor(qty));
    const totalCost = def ? def.price * amount : 0;
    if (!def || stats.coins < totalCost) return false;
    setStats((prev) => ({...prev, coins: prev.coins - totalCost}));
    setPeppaIngredients((prev) => ({
      ...prev,
      [id]: (prev[id] ?? 0) + amount,
    }));
    return true;
  };

  const handleBuyCafeItem = (itemId: MayCafeItemId): {ok: boolean; message: string} => {
    const def = MAY_CAFE_ITEMS[itemId];
    if (!def) return {ok: false, message: 'Món không tồn tại trong thực đơn Quán Cà Phê Mây.'};
    if (stats.energy >= 100 && (stats.hunger ?? 100) >= 100) {
      return {ok: false, message: 'Thể lực & Độ no của bạn đang đầy 100% rồi!'};
    }
    if (stats.coins < def.price) {
      return {ok: false, message: `Không đủ xu (cần ${def.price} xu).`};
    }
    setStats((prev) => ({
      ...prev,
      coins: prev.coins - def.price,
      energy: Math.min(100, Math.round(prev.energy + def.energyRestore)),
      hunger: Math.min(100, Math.round((prev.hunger ?? 100) + def.hungerRestore)),
      mood: Math.min(100, Math.round(prev.mood + def.moodRestore)),
    }));
    return {
      ok: true,
      message: `Thưởng thức ${def.name}! (+${def.energyRestore}% Thể lực, +${def.hungerRestore}% Độ no)`,
    };
  };

  const handleBuyPeppaRecipe = (id: PeppaRecipeId): boolean => {
    const def = PEPPA_RECIPES[id];
    if (!def || unlockedPeppaRecipes.includes(id) || stats.coins < def.recipePrice) return false;
    setStats((prev) => ({
      ...prev,
      coins: prev.coins - def.recipePrice,
      mood: Math.min(100, prev.mood + 5),
    }));
    setUnlockedPeppaRecipes((prev) => (prev.includes(id) ? prev : [...prev, id]));
    return true;
  };

  const handleCookPeppaDish = (recipeId: PeppaRecipeId): {ok: boolean; message: string} => {
    const def = PEPPA_RECIPES[recipeId];
    if (!def) return {ok: false, message: 'Công thức không tồn tại.'};
    if (!unlockedPeppaRecipes.includes(recipeId)) {
      return {ok: false, message: 'Bạn chưa sở hữu công thức này! Hãy mua tại Siêu Thị Mini của Peppa.'};
    }
    for (const req of def.ingredients) {
      if ((peppaIngredients[req.id] ?? 0) < req.qty) {
        return {
          ok: false,
          message: `Thiếu ${PEPPA_INGREDIENTS[req.id].name} (cần ${req.qty}).`,
        };
      }
    }
    setPeppaIngredients((prev) => {
      const next = {...prev};
      for (const req of def.ingredients) {
        next[req.id] = Math.max(0, (next[req.id] ?? 0) - req.qty);
      }
      return next;
    });
    setPeppaDishes((prev) => ({
      ...prev,
      [recipeId]: (prev[recipeId] ?? 0) + 1,
    }));
    setStats((prev) => ({...prev, mood: Math.min(100, prev.mood + 3)}));
    markQuestDone('cooking');
    return {ok: true, message: `Nấu thành công 1x ${def.name}! (+Vào túi Thức Ăn)`};
  };

  const handleEatPeppaDish = (recipeId: PeppaRecipeId): {ok: boolean; message: string} => {
    const def = PEPPA_RECIPES[recipeId];
    const count = peppaDishes[recipeId] ?? 0;
    if (!def || count <= 0) {
      return {ok: false, message: 'Bạn chưa có món này trong túi.'};
    }
    if (stats.energy >= 100 && (stats.hunger ?? 100) >= 100) {
      return {ok: false, message: 'Thể lực và Độ no đều đã đầy 100% rồi!'};
    }
    setPeppaDishes((prev) => ({
      ...prev,
      [recipeId]: Math.max(0, (prev[recipeId] ?? 0) - 1),
    }));
    setStats((prev) => ({
      ...prev,
      energy: Math.min(100, Math.round(prev.energy + def.energyRestore)),
      hunger: Math.min(100, Math.round((prev.hunger ?? 100) + def.hungerRestore)),
      mood: Math.min(100, prev.mood + def.moodRestore),
    }));
    return {
      ok: true,
      message: `Thưởng thức ${def.name}! (+${def.energyRestore} Thể lực, +${def.hungerRestore} Độ no)`,
    };
  };

  const handleSellPeppaDish = (recipeId: PeppaRecipeId): {ok: boolean; message: string} => {
    const def = PEPPA_RECIPES[recipeId];
    const count = peppaDishes[recipeId] ?? 0;
    if (!def || count <= 0) {
      return {ok: false, message: 'Không có món này để bán.'};
    }
    setPeppaDishes((prev) => ({
      ...prev,
      [recipeId]: Math.max(0, (prev[recipeId] ?? 0) - 1),
    }));
    setStats((prev) => ({
      ...prev,
      coins: prev.coins + def.sellPrice,
      mood: Math.min(100, prev.mood + 2),
    }));
    return {ok: true, message: `Đã bán 1x ${def.name} nhận +${def.sellPrice} Xu!`};
  };

  // === AVATAR, SHOPS & HOUSE FURNITURE ===
  const handleConfirmStarterCharacter = ({
    avatar: chosenAvatar,
    unlockItemIds,
  }: {
    avatar: AvatarConfig;
    unlockItemIds: string[];
  }) => {
    setAvatar(chosenAvatar);
    setOwnedIds((prev) => Array.from(new Set([...prev, ...unlockItemIds])));
    setHasCreatedCharacter(true);
  };

  const handleEquipAvatar = (next: AvatarConfig) => {
    setAvatar(next);
    if (next.handheld !== 'none') {
      setFishingRod((prev) => (prev.equipped ? {...prev, equipped: false} : prev));
      setBugNet((prev) => (prev.equipped ? {...prev, equipped: false} : prev));
      setEquippedFoodId(null);
    }
  };

  const handleBuyShopItem = (item: ShopItem) => {
    if (ownedIds.includes(item.id) || stats.coins < item.price) return;
    setStats((prev) => ({
      ...prev,
      coins: prev.coins - item.price,
      mood: Math.min(100, prev.mood + 8),
    }));
    setOwnedIds((prev) => [...prev, item.id]);
    setAvatar((prev) => ({...prev, ...item.patch}));
    if (item.patch.handheld && item.patch.handheld !== 'none') {
      setFishingRod((prev) => (prev.equipped ? {...prev, equipped: false} : prev));
      setBugNet((prev) => (prev.equipped ? {...prev, equipped: false} : prev));
      setEquippedFoodId(null);
    }
    markQuestDone('delivery');
  };

  const handleBuyShopSet = (set: ShopSet, finalPrice: number) => {
    const missingIds = set.itemIds.filter((id) => !ownedIds.includes(id));
    if (missingIds.length === 0 || stats.coins < finalPrice) return;
    setStats((prev) => ({
      ...prev,
      coins: prev.coins - finalPrice,
      mood: Math.min(100, prev.mood + 14),
    }));
    setOwnedIds((prev) => Array.from(new Set([...prev, ...missingIds])));
    setAvatar((prev) => ({...prev, ...set.patch}));
    if (set.patch.handheld && set.patch.handheld !== 'none') {
      setFishingRod((prev) => (prev.equipped ? {...prev, equipped: false} : prev));
      setBugNet((prev) => (prev.equipped ? {...prev, equipped: false} : prev));
      setEquippedFoodId(null);
    }
    markQuestDone('delivery');
  };

  const handleBuyFurnitureItem = (item: FurnitureCatalogItem) => {
    if (stats.coins < item.price) return;
    setStats((prev) => ({
      ...prev,
      coins: prev.coins - item.price,
      mood: Math.min(100, prev.mood + 4),
    }));
    setFurnitureInventory((prev) => ({
      ...prev,
      [item.id]: (prev[item.id] || 0) + 1,
    }));
    markQuestDone('decor');
  };

  const handleClaimQuest = (key: DailyQuestKey, reward: number) => {
    setDailyQuests((prev) => {
      const normalized = normalizeDailyQuests(prev);
      if (!normalized.tasks[key] || normalized.claimed[key]) return normalized;
      return {...normalized, claimed: {...normalized.claimed, [key]: true}};
    });
    addCoins(reward);
  };

  // === ĐIỂM DANH 7 NGÀY & NGHỀ GIAO HÀNG JOYBOY ===
  const handleClaimDailyCheckIn = () => {
    const today = getTodayDateKey();
    if (checkIn.lastClaimDate === today) return;
    const prevCompleted = checkIn.completedDays >= 7 ? 0 : checkIn.completedDays;
    const dayIndex = Math.max(0, Math.min(6, prevCompleted));
    const spec = CHECK_IN_REWARDS[dayIndex];
    if (!spec) return;

    soundFX.sparkle();
    setCheckIn({
      completedDays: dayIndex + 1,
      lastClaimDate: today,
    });
    setStats((prev) => ({
      ...prev,
      coins: prev.coins + spec.coins,
      mood: Math.min(100, prev.mood + 6),
    }));
    if (spec.foodReward || spec.bonusFoodReward) {
      setBbqFoods((prev) => {
        const next = {...prev};
        if (spec.foodReward) {
          next[spec.foodReward.foodId] = (next[spec.foodReward.foodId] ?? 0) + spec.foodReward.qty;
        }
        if (spec.bonusFoodReward) {
          next[spec.bonusFoodReward.foodId] =
            (next[spec.bonusFoodReward.foodId] ?? 0) + spec.bonusFoodReward.qty;
        }
        return next;
      });
    }
  };

  const handleAcceptJoyboyOrder = () => {
    const current = normalizeJoyboyDeliveryState(joyboyDelivery);
    if (current.activeOrder || current.completedCount >= MAX_JOYBOY_DELIVERIES_PER_DAY) {
      return;
    }
    const order = rollJoyboyDeliveryOrder();
    setJoyboyDelivery({
      ...current,
      activeOrder: order,
    });
  };

  const handleCancelJoyboyOrder = () => {
    const current = normalizeJoyboyDeliveryState(joyboyDelivery);
    setJoyboyDelivery({
      ...current,
      activeOrder: null,
    });
  };

  const handleCompleteJoyboyDelivery = () => {
    const current = normalizeJoyboyDeliveryState(joyboyDelivery);
    const order = current.activeOrder;
    if (!order) {
      return {ok: false, message: 'Bạn chưa nhận đơn giao hàng nào từ Joyboy.'};
    }
    soundFX.sparkle();
    const nextCompleted = Math.min(MAX_JOYBOY_DELIVERIES_PER_DAY, current.completedCount + 1);
    setJoyboyDelivery({
      date: current.date,
      completedCount: nextCompleted,
      activeOrder: null,
    });
    setStats((prev) => ({
      ...prev,
      coins: prev.coins + order.rewardCoins,
      mood: Math.min(100, prev.mood + 6),
    }));
    markQuestDone('delivery');
    const remainingToday = Math.max(0, MAX_JOYBOY_DELIVERIES_PER_DAY - nextCompleted);
    return {
      ok: true,
      targetNpcName: order.targetNpcName,
      rewardCoins: order.rewardCoins,
      remainingToday,
      message: `Đã giao "${order.parcelName}" cho ${order.targetNpcName}! +${order.rewardCoins} Xu`,
    };
  };

  // === HÀNH ĐỘNG NHÂN VẬT (8 Ô TRANG BỊ + KHO HÀNH ĐỘNG) ===
  const handleEquipPlayerAction = (actionId: ActionId, targetSlotIndex?: number) => {
    if (!(actionId in PLAYER_ACTION_CATALOG)) return;
    soundFX.tap();
    setPlayerActions((prev) => {
      const ownedIds = prev.ownedIds.includes(actionId)
        ? prev.ownedIds
        : [...prev.ownedIds, actionId];
      const nextSlots: (ActionId | null)[] = prev.equippedSlots.map((slot) =>
        slot === actionId ? null : slot,
      );
      let slotIdx =
        typeof targetSlotIndex === 'number' &&
        targetSlotIndex >= 0 &&
        targetSlotIndex < nextSlots.length
          ? targetSlotIndex
          : nextSlots.findIndex((s) => s === null);
      if (slotIdx < 0) slotIdx = 0;
      nextSlots[slotIdx] = actionId;
      return {
        ownedIds,
        equippedSlots: nextSlots,
      };
    });
  };

  const handleUnequipPlayerAction = (slotIndex: number) => {
    soundFX.tap();
    setPlayerActions((prev) => {
      if (slotIndex < 0 || slotIndex >= prev.equippedSlots.length) return prev;
      if (prev.equippedSlots[slotIndex] === null) return prev;
      const nextSlots = [...prev.equippedSlots];
      nextSlots[slotIndex] = null;
      return {
        ...prev,
        equippedSlots: nextSlots,
      };
    });
  };

  // === TRANG TRÍ NÔNG TRẠI (MUA, ĐẶT, DI CHUYỂN, XOAY, CẤT) ===
  const handleBuyFarmDecorItem = (item: FarmDecorCatalogItem) => {
    if (stats.coins < item.price) return;
    setStats((prev) => ({
      ...prev,
      coins: prev.coins - item.price,
      mood: Math.min(100, prev.mood + 4),
    }));
    setFarmDecorInventory((prev) => ({
      ...prev,
      [item.id]: (prev[item.id] || 0) + 1,
    }));
    markQuestDone('decor');
  };

  const handlePlaceFarmDecor = (catalogId: string) => {
    const available = farmDecorInventory[catalogId] || 0;
    const cat = FARM_DECOR_BY_ID[catalogId];
    if (available <= 0 || !cat) return;

    const spot = clampDropIntoGarden(
      5.5 + (Math.random() - 0.5) * 3.0,
      16.0 + (Math.random() - 0.5) * 1.8,
    );
    const sx = Number(spot.x.toFixed(2));
    const sz = Number(spot.z.toFixed(2));
    const instanceId = `fdec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

    setFarmDecorInventory((prev) => ({
      ...prev,
      [catalogId]: Math.max(0, (prev[catalogId] || 0) - 1),
    }));
    setPlacedFarmDecor((prev) => [
      ...prev,
      {
        instanceId,
        catalogId,
        x: sx,
        z: sz,
        rotY: 0,
      },
    ]);
    markQuestDone('decor');
    returnToFarmDecorModalRef.current = true;
    setFarmDecorModalOpen(false);
    setEditFarmDecorMode(true);
    setSelectedFarmDecorId(instanceId);
  };

  const handleMoveFarmDecor = (instanceId: string, x: number, z: number) => {
    const safe = clampDropIntoGarden(x, z);
    const nextX = Number(safe.x.toFixed(2));
    const nextZ = Number(safe.z.toFixed(2));
    setPlacedFarmDecor((prev) =>
      prev.map((item) =>
        item.instanceId === instanceId ? {...item, x: nextX, z: nextZ} : item,
      ),
    );
    markQuestDone('decor');
  };

  const handleRotateFarmDecor = (instanceId: string) => {
    setPlacedFarmDecor((prev) =>
      prev.map((item) =>
        item.instanceId === instanceId
          ? {...item, rotY: (item.rotY + Math.PI / 4) % (Math.PI * 2)}
          : item,
      ),
    );
  };

  const handleStowFarmDecor = (instanceId: string) => {
    const target = placedFarmDecor.find((item) => item.instanceId === instanceId);
    if (!target) return;
    setPlacedFarmDecor((prev) => prev.filter((item) => item.instanceId !== instanceId));
    setFarmDecorInventory((prev) => ({
      ...prev,
      [target.catalogId]: (prev[target.catalogId] || 0) + 1,
    }));
    setSelectedFarmDecorId(null);
  };

  const handleToggleEditFarmDecor = () => {
    const closingEdit = editFarmDecorMode;
    setEditFarmDecorMode((prev) => {
      const next = !prev;
      if (!next) setSelectedFarmDecorId(null);
      return next;
    });
    if (closingEdit && returnToFarmDecorModalRef.current) {
      returnToFarmDecorModalRef.current = false;
      setFarmDecorModalOpen(true);
    }
  };

  const handlePlaceFurniture = (catalogId: string) => {
    const available = furnitureInventory[catalogId] || 0;
    const cat = FURNITURE_BY_ID[catalogId];
    if (available <= 0 || !cat) return;

    let spawnX: number;
    let spawnZ: number;
    const spawnRotY = 0;

    if (cat.wallMount) {
      if (homeSpotRef.current.z < -0.5) {
        spawnX = Math.max(-12.0, Math.min(9.2, homeSpotRef.current.x));
        spawnZ = -9.32;
      } else {
        spawnX = Math.max(-3.6, Math.min(3.3, homeSpotRef.current.x));
        if (spawnX > -1.6 && spawnX < 0.8) {
          spawnX = homeSpotRef.current.x >= -0.4 ? 2.1 : -2.6;
        }
        spawnZ = -0.35;
      }
    } else if (cat.kind === 'floor_paint' || cat.kind === 'wall_paint') {
      const spot = clampDropIntoHouse(homeSpotRef.current.x, homeSpotRef.current.z);
      spawnX = spot.x;
      spawnZ = spot.z;
    } else {
      const spot = clampDropIntoHouse(
        homeSpotRef.current.x + (Math.random() - 0.5) * 0.6,
        homeSpotRef.current.z - 1.2,
      );
      spawnX = spot.x;
      spawnZ = spot.z;
    }

    const sx = Number(spawnX.toFixed(2));
    const sz = Number(spawnZ.toFixed(2));
    const instanceId = `furn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

    setFurnitureInventory((prev) => ({
      ...prev,
      [catalogId]: Math.max(0, (prev[catalogId] || 0) - 1),
    }));
    setPlacedFurniture((prev) => {
      const sy = computeStackedY(sx, sz, catalogId, prev);
      const newItem: PlacedFurniture = {
        instanceId,
        catalogId,
        x: sx,
        z: sz,
        y: sy > 0 ? sy : undefined,
        rotY: spawnRotY,
      };
      return [...prev, newItem];
    });
    returnToFurnitureModalRef.current = true;
    setFurnitureModalOpen(false);
    setEditFurnitureMode(true);
    setSelectedFurnitureId(instanceId);
    markQuestDone('decor');
  };

  const handleMoveFurniture = (
    instanceId: string,
    x: number,
    z: number,
    rotY?: number,
    y?: number,
  ) => {
    setPlacedFurniture((prev) => {
      const target = prev.find((item) => item.instanceId === instanceId);
      if (!target) return prev;
      const cat = FURNITURE_BY_ID[target.catalogId];
      if (cat?.wallMount && rotY !== undefined) {
        const nextMountY = y !== undefined ? Number(y.toFixed(2)) : target.y;
        return prev.map((item) =>
          item.instanceId === instanceId
            ? {
                ...item,
                x: Number(x.toFixed(2)),
                z: Number(z.toFixed(2)),
                rotY,
                y: nextMountY && Math.abs(nextMountY) > 0.01 ? nextMountY : undefined,
              }
            : item,
        );
      }

      const safe = clampDropIntoHouse(x, z);
      const nextX = Number(safe.x.toFixed(2));
      const nextZ = Number(safe.z.toFixed(2));
      const dx = nextX - target.x;
      const dz = nextZ - target.z;
      const oldBaseY = target.y ?? 0;
      const nextY = computeStackedY(nextX, nextZ, target.catalogId, prev, instanceId);
      const dy = nextY - oldBaseY;

      const carriedIds = new Set<string>();
      if (cat?.surfaceHeight && !cat.wallMount) {
        const expectedTop = oldBaseY + cat.surfaceHeight;
        for (const cand of prev) {
          if (cand.instanceId === instanceId) continue;
          const candCat = FURNITURE_BY_ID[cand.catalogId];
          if (!candCat || candCat.wallMount || candCat.kind === 'floor_paint' || candCat.kind === 'wall_paint') {
            continue;
          }
          if (
            Math.abs((cand.y ?? 0) - expectedTop) <= 0.06 &&
            isPointOnFurnitureSurface(cand.x, cand.z, target, cat)
          ) {
            carriedIds.add(cand.instanceId);
          }
        }
      }

      return prev.map((item) => {
        if (item.instanceId === instanceId) {
          return {
            ...item,
            x: nextX,
            z: nextZ,
            y: nextY > 0 ? nextY : undefined,
          };
        }
        if (carriedIds.has(item.instanceId)) {
          const movedChild = clampDropIntoHouse(item.x + dx, item.z + dz);
          const childY = Number(Math.max(0, (item.y ?? 0) + dy).toFixed(2));
          return {
            ...item,
            x: Number(movedChild.x.toFixed(2)),
            z: Number(movedChild.z.toFixed(2)),
            y: childY > 0 ? childY : undefined,
          };
        }
        return item;
      });
    });
    markQuestDone('decor');
  };

  const handleRotateFurniture = (instanceId: string) => {
    setPlacedFurniture((prev) =>
      prev.map((item) => {
        if (item.instanceId !== instanceId) return item;
        const cat = FURNITURE_BY_ID[item.catalogId];
        const step = cat?.wallMount ? Math.PI / 2 : Math.PI / 4;
        return {
          ...item,
          rotY: (item.rotY + step) % (Math.PI * 2),
        };
      }),
    );
  };

  const handleStowFurniture = (instanceId: string) => {
    const target = placedFurniture.find((item) => item.instanceId === instanceId);
    if (!target) return;
    setPlacedFurniture((prev) => {
      const remaining = prev.filter((item) => item.instanceId !== instanceId);
      return remaining.map((item) => {
        if (!item.y || item.y <= 0) return item;
        const recomputed = computeStackedY(item.x, item.z, item.catalogId, remaining, item.instanceId);
        return {
          ...item,
          y: recomputed > 0 ? recomputed : undefined,
        };
      });
    });
    setFurnitureInventory((prev) => ({
      ...prev,
      [target.catalogId]: (prev[target.catalogId] || 0) + 1,
    }));
    setSelectedFurnitureId(null);
  };

  const handleToggleEditFurniture = () => {
    const closingEdit = editFurnitureMode;
    setEditFurnitureMode((prev) => {
      const next = !prev;
      if (!next) setSelectedFurnitureId(null);
      return next;
    });
    if (closingEdit && returnToFurnitureModalRef.current) {
      returnToFurnitureModalRef.current = false;
      setFurnitureModalOpen(true);
    }
  };

  // === PETS SYSTEM HANDLERS ===
  const activePet: OwnedPetState | null = activePetId
    ? ownedPets.find((p) => p.id === activePetId) ?? null
    : null;
  const effectiveCarriedPetId =
    carriedPetId &&
    activePet &&
    carriedPetId === activePet.id &&
    PET_CATALOG[activePet.speciesId]?.canHold &&
    !isPetTooHungry(activePet)
      ? carriedPetId
      : null;

  useEffect(() => {
    if (carriedPetId && activePet && carriedPetId === activePet.id && isPetTooHungry(activePet)) {
      setCarriedPetId(null);
    }
  }, [carriedPetId, activePet]);

  const handleAdoptPet = (speciesId: PetSpeciesId) => {
    const spec = PET_CATALOG[speciesId];
    if (!spec || stats.coins < spec.price) return;
    soundFX.sparkle();
    const newPet = createOwnedPet(speciesId, ownedPets.length + 1);
    setStats((prev) => ({
      ...prev,
      coins: prev.coins - spec.price,
      mood: Math.min(100, prev.mood + 10),
    }));
    setOwnedPets((prev) => [...prev, newPet]);
    setActivePetId(newPet.id);
    setCarriedPetId(null);
    markQuestDone('pet');
  };

  const handleBuyPetSupply = (supplyId: PetSupplyId, qty = 1) => {
    const meta = PET_SUPPLY_META[supplyId];
    if (!meta || qty <= 0) return;
    const totalCost = meta.price * qty;
    if (stats.coins < totalCost) return;
    soundFX.tap();
    setStats((prev) => ({
      ...prev,
      coins: prev.coins - totalCost,
    }));
    setPetSupplies((prev) => ({
      ...prev,
      [supplyId]: (prev[supplyId] || 0) + qty,
    }));
  };

  const handleToggleSummonPet = (petId: string) => {
    const target = ownedPets.find((p) => p.id === petId);
    if (!target) return;
    soundFX.tap();
    setCarriedPetId(null);
    setActivePetId((prev) => (prev === petId ? null : petId));
  };

  const handleHoldPet = (petId: string) => {
    const target = ownedPets.find((p) => p.id === petId);
    if (!target || isPetTooHungry(target)) return;
    const spec = PET_CATALOG[target.speciesId];
    if (!spec?.canHold) return;
    soundFX.tap();
    setActivePetId(petId);
    setCarriedPetId(petId);
  };

  const handleReleasePet = () => {
    soundFX.tap();
    setCarriedPetId(null);
  };

  const handleRenamePet = (petId: string, newName: string) => {
    const target = ownedPets.find((p) => p.id === petId);
    if (!target || isPetTooHungry(target)) return;
    const trimmed = newName.trim().slice(0, 20);
    if (!trimmed) return;
    setOwnedPets((prev) =>
      prev.map((p) => (p.id === petId ? {...p, name: trimmed} : p)),
    );
  };

  const handleFeedPet = (petId: string): {ok: boolean; message: string} => {
    if (petSupplies.petFood <= 0) {
      return {ok: false, message: 'Bạn đã hết thức ăn thú cưng! Mua thêm tại cửa hàng Ivan.'};
    }
    const target = ownedPets.find((p) => p.id === petId);
    if (!target) return {ok: false, message: 'Không tìm thấy thú cưng.'};
    const feedRes = applyPetFeedCare(target);
    if (!feedRes.ok) {
      soundFX.tap();
      return {ok: false, message: feedRes.message};
    }
    soundFX.sparkle();
    setPetSupplies((prev) => ({
      ...prev,
      petFood: Math.max(0, prev.petFood - 1),
    }));
    setOwnedPets((prev) => prev.map((p) => (p.id === petId ? feedRes.pet : p)));
    setStats((prev) => ({
      ...prev,
      mood: Math.min(100, prev.mood + 3),
    }));
    markQuestDone('pet');
    return {ok: true, message: feedRes.message};
  };

  const handleCurePet = (petId: string) => {
    if (petSupplies.petMedicine <= 0) return;
    const target = ownedPets.find((p) => p.id === petId);
    if (!target || !target.sick || isPetTooHungry(target)) return;
    soundFX.sparkle();
    setPetSupplies((prev) => ({
      ...prev,
      petMedicine: Math.max(0, prev.petMedicine - 1),
    }));
    setOwnedPets((prev) =>
      prev.map((p) => (p.id === petId ? applyPetCureCare(p) : p)),
    );
    setStats((prev) => ({
      ...prev,
      mood: Math.min(100, prev.mood + 4),
    }));
    markQuestDone('pet');
  };

  const handlePlayWithPet = (petId: string): {ok: boolean; gainedXp: boolean; message: string} => {
    const target = ownedPets.find((p) => p.id === petId);
    if (!target) return {ok: false, gainedXp: false, message: ''};
    const playRes = applyPetPlayCare(target);
    soundFX.tap();
    if (!playRes.gainedXp && isPetTooHungry(target)) {
      return {ok: false, gainedXp: false, message: playRes.message};
    }
    if (playRes.gainedXp) {
      setOwnedPets((prev) => prev.map((p) => (p.id === petId ? playRes.pet : p)));
    }
    setStats((prev) => ({
      ...prev,
      mood: Math.min(100, prev.mood + 4),
    }));
    markQuestDone('pet');
    return {ok: true, gainedXp: playRes.gainedXp, message: playRes.message};
  };

  const handleUsePetSupply = (
    petId: string,
    supplyId: PetSupplyId,
  ): {ok: boolean; message: string} => {
    const target = ownedPets.find((p) => p.id === petId);
    if (!target) return {ok: false, message: 'Không tìm thấy thú cưng.'};
    if ((petSupplies[supplyId] || 0) <= 0) {
      return {ok: false, message: 'Bạn đã hết vật phẩm này trong túi.'};
    }

    if (supplyId === 'petFood') {
      const feedRes = applyPetFeedCare(target);
      if (!feedRes.ok) {
        return {ok: false, message: feedRes.message};
      }
      soundFX.sparkle();
      setPetSupplies((prev) => ({...prev, petFood: Math.max(0, prev.petFood - 1)}));
      setOwnedPets((prev) => prev.map((p) => (p.id === petId ? feedRes.pet : p)));
      setStats((prev) => ({...prev, mood: Math.min(100, prev.mood + 3)}));
      markQuestDone('pet');
      return {ok: true, message: feedRes.message};
    }

    if (isPetTooHungry(target)) {
      return {
        ok: false,
        message: `${target.name} đang đói quá (≤${PET_STARVING_THRESHOLD}%), chỉ có thể cho bé ăn lúc này!`,
      };
    }

    if (supplyId === 'petMedicine') {
      if (!target.sick) {
        return {ok: false, message: `${target.name} đang hoàn toàn khỏe mạnh!`};
      }
      soundFX.sparkle();
      setPetSupplies((prev) => ({...prev, petMedicine: Math.max(0, prev.petMedicine - 1)}));
      setOwnedPets((prev) =>
        prev.map((p) => (p.id === petId ? applyPetCureCare(p) : p)),
      );
      setStats((prev) => ({...prev, mood: Math.min(100, prev.mood + 4)}));
      markQuestDone('pet');
      return {ok: true, message: `Đã chữa khỏi bệnh cho ${target.name} (+1 thân mật)!`};
    }

    // intimacyTest
    if (target.intimacyLevel >= MAX_PET_INTIMACY) {
      return {ok: false, message: `${target.name} đã đạt cấp thân mật tối đa (Lv.10)!`};
    }
    soundFX.sparkle();
    setPetSupplies((prev) => ({
      ...prev,
      intimacyTest: Math.max(0, prev.intimacyTest - 1),
    }));
    const nextLv = Math.min(MAX_PET_INTIMACY, target.intimacyLevel + 1);
    setOwnedPets((prev) =>
      prev.map((p) => (p.id === petId ? applyPetLevelStep(p, 1) : p)),
    );
    markQuestDone('pet');
    return {
      ok: true,
      message: `Test thân mật thành công! ${target.name} đã lên Lv.${nextLv}!`,
    };
  };

  const activeDailyQuests = normalizeDailyQuests(dailyQuests);
  const activeJoyboyDelivery = normalizeJoyboyDeliveryState(joyboyDelivery);

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden bg-[#BFE6F7] select-none">
      <WorldCanvas
        zone={zone}
        avatar={avatar}
        stats={stats}
        timeOfDay={timeOfDay}
        plots={plots}
        livestock={livestock}
        troughs={troughs}
        pondFish={pondFish}
        fishFeedCount={farmInventory.supplies.fishFeed}
        pondFeedPulse={pondFeedPulse}
        farmPondFishPulse={farmPondFishPulse}
        fishingRod={fishingRod}
        boats={boats}
        bugNet={bugNet}
        seeds={farmInventory.seeds}
        bugSprayCount={farmInventory.supplies.bugSpray}
        waterCount={waterCan}
        wellWater={wellWater}
        placedFurniture={placedFurniture}
        editFurnitureMode={editFurnitureMode}
        selectedFurnitureId={selectedFurnitureId}
        placedFarmDecor={placedFarmDecor}
        editFarmDecorMode={editFarmDecorMode}
        selectedFarmDecorId={selectedFarmDecorId}
        joyboyDelivery={activeJoyboyDelivery}
        joyboyModalOpen={joyboyModalOpen}
        homeSpotRef={homeSpotRef}
        ownedMounts={ownedMounts}
        equippedActionSlots={playerActions.equippedSlots}
        teleportToPlazaPulse={teleportToPlazaPulse}
        activePet={activePet}
        carriedPetId={effectiveCarriedPetId}
        petSupplies={petSupplies}
        equippedFoodId={equippedFoodId}
        bbqFoods={bbqFoods}
        onOpenBbqGrill={() => setBbqGrillOpen(true)}
        onOpenVendingMachine={() => setVendingOpen(true)}
        onEatEquippedFood={() =>
          equippedFoodId
            ? handleEatBbqFood(equippedFoodId)
            : {ok: false, message: 'Chưa cầm thức ăn hay thức uống nào.'}
        }
        onUnequipFood={() => setEquippedFoodId(null)}
        onChangeZone={handleZoneChange}
        onOpenWardrobe={() => setWardrobeOpen(true)}
        onOpenShop={() => setBoutiqueOpen(true)}
        onOpenKoiShop={() => setKoiShopOpen(true)}
        onOpenShipShop={() => setShipShopOpen(true)}
        onOpenTunShop={() => setTunShopOpen(true)}
        onOpenPeppaShop={() => setPeppaShopOpen(true)}
        onOpenCafeShop={() => setCafeShopOpen(true)}
        onOpenMicrowave={() => setActiveApplianceModal('microwave')}
        onOpenMiniOven={() => setActiveApplianceModal('mini_oven')}
        onToggleMount={handleToggleMount}
        onDismountMount={handleDismountMount}
        onOpenFurnitureShop={() => setFurnitureShopOpen(true)}
        onOpenPetSupplyShop={() => setPetSupplyShopOpen(true)}
        onOpenPetAdopt={() => setPetAdoptOpen(true)}
        onHoldPet={handleHoldPet}
        onReleasePet={handleReleasePet}
        onFeedPet={handleFeedPet}
        onCurePet={handleCurePet}
        onPlayWithPet={handlePlayWithPet}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenDailyQuests={() => setDailyQuestsOpen(true)}
        onOpenPhone={() => {
          setPhoneInitialTab('menu');
          setPhoneOpen(true);
        }}
        onOpenBag={() => {
          setBagInitialSubTab('list');
          setBagOpen(true);
        }}
        onOpenFurniture={() => {
          returnToFurnitureModalRef.current = false;
          setEditFurnitureMode(false);
          setSelectedFurnitureId(null);
          setFurnitureModalOpen(true);
        }}
        onToggleEditFurniture={handleToggleEditFurniture}
        onSelectFurniture={setSelectedFurnitureId}
        onMoveFurniture={handleMoveFurniture}
        onRotateFurniture={handleRotateFurniture}
        onStowFurniture={handleStowFurniture}
        onOpenFarmDecorShop={() => setFarmDecorShopOpen(true)}
        onOpenFarmDecorBag={() => {
          returnToFarmDecorModalRef.current = false;
          setEditFarmDecorMode(false);
          setSelectedFarmDecorId(null);
          setFarmDecorModalOpen(true);
        }}
        onToggleEditFarmDecor={handleToggleEditFarmDecor}
        onSelectFarmDecor={setSelectedFarmDecorId}
        onMoveFarmDecor={handleMoveFarmDecor}
        onRotateFarmDecor={handleRotateFarmDecor}
        onStowFarmDecor={handleStowFarmDecor}
        onOpenJoyboyModal={() => setJoyboyModalOpen(true)}
        onCompleteJoyboyDelivery={handleCompleteJoyboyDelivery}
        onCatchRiverFish={handleCatchRiverFish}
        onLoseFishingDurability={handleLoseFishingDurability}
        onRepairFishingRod={handleRepairFishingRod}
        onCatchInsect={handleCatchInsect}
        onLoseNetDurability={handleLoseNetDurability}
        onRepairBugNet={handleRepairBugNet}
        onRestoreEnergy={() => setStats((prev) => ({...prev, energy: 100}))}
        onBoostMood={() =>
          setStats((prev) => ({...prev, mood: Math.min(100, prev.mood + 10)}))
        }
        onCollectWellWater={handleCollectWellWater}
        onPlantPlot={handlePlantPlot}
        onWaterPlot={handleWaterPlot}
        onSprayPestPlot={handleSprayPest}
        onWeedPlot={handleWeedPlot}
        onCancelCropPlot={handleCancelCrop}
        onHarvestPlot={handleHarvestPlot}
        onUpgradePlot={handleUpgradePlot}
        onOpenWorkshop={(tab) => setWorkshopTab(tab)}
        onOpenOrders={() => setOrdersOpen(true)}
        onOpenStorage={() => setStorageOpen(true)}
        onOpenPasture={(coop) => setPastureCoop(coop ?? 'poultry')}
        onOpenPond={() => setPondOpen(true)}
        onOpenFarmShop={() => setFarmShopOpen(true)}
        onScatterPondFeed={handleScatterPondFeed}
        onPondProximityChange={setNearPond}
        onAddCoins={addCoins}
        onOpenArcadeHub={(section = 'overview') => setArcadeHubSection(section)}
        onOpenArcadeGame={(gameId) => {
          setArcadeHubSection(null);
          setCoinGameShopOpen(false);
          setActiveArcadeGame(gameId);
        }}
        onOpenCoinGameShop={() => {
          setArcadeHubSection(null);
          setActiveArcadeGame(null);
          setCoinGameShopOpen(true);
        }}
      />

      {wardrobeOpen && (
        <WardrobeModal
          avatar={avatar}
          ownedIds={ownedIds}
          onChange={handleEquipAvatar}
          onClose={() => setWardrobeOpen(false)}
        />
      )}

      {furnitureModalOpen && zone === 'home' && (
        <FurnitureModal
          inventory={furnitureInventory}
          placed={placedFurniture}
          tab={furnitureModalTab}
          onTabChange={setFurnitureModalTab}
          onPlaceItem={handlePlaceFurniture}
          onClose={() => setFurnitureModalOpen(false)}
        />
      )}

      {zone === 'garden' && farmDecorShopOpen && (
        <FarmDecorShopModal
          coins={stats.coins}
          inventory={farmDecorInventory}
          placed={placedFarmDecor}
          onBuyItem={handleBuyFarmDecorItem}
          onOpenBag={() => {
            setFarmDecorShopOpen(false);
            returnToFarmDecorModalRef.current = false;
            setEditFarmDecorMode(false);
            setSelectedFarmDecorId(null);
            setFarmDecorModalOpen(true);
          }}
          onClose={() => setFarmDecorShopOpen(false)}
        />
      )}

      {zone === 'garden' && farmDecorModalOpen && (
        <FarmDecorModal
          inventory={farmDecorInventory}
          placed={placedFarmDecor}
          tab={farmDecorModalTab}
          onTabChange={setFarmDecorModalTab}
          onPlaceItem={handlePlaceFarmDecor}
          onClose={() => setFarmDecorModalOpen(false)}
        />
      )}

      {zone === 'garden' && workshopTab && (
        <FarmWorkshopModal
          station={workshopTab}
          coins={stats.coins}
          kitchenLevel={kitchenLevel}
          millQueue={millQueue}
          cookingQueue={cookingQueue}
          inventory={farmInventory}
          storageUsed={storageUsed}
          storageCapacity={storageCapacity}
          storageFull={storageFull}
          onStartMill={handleStartMill}
          onCollectProcessed={handleCollectProcessed}
          onStartCook={handleStartCook}
          onCollectDish={handleCollectDish}
          onUpgradeKitchen={handleUpgradeKitchen}
          onClose={() => setWorkshopTab(null)}
        />
      )}

      {zone === 'garden' && farmShopOpen && (
        <FarmShopModal
          coins={stats.coins}
          inventory={farmInventory}
          storageUsed={storageUsed}
          storageCapacity={storageCapacity}
          poultryCount={livestock.filter((a) => a.coop === 'poultry').length}
          cattleCount={livestock.filter((a) => a.coop === 'cattle').length}
          pondCount={pondFish.length}
          onBuySeed={handleBuySeedBag}
          onBuySupply={handleBuyFarmSupply}
          onBuyAnimal={handleBuyAnimal}
          onStockFish={handleStockFish}
          onClose={() => setFarmShopOpen(false)}
        />
      )}

      {zone === 'garden' && ordersOpen && (
        <OrderBoardModal
          coins={stats.coins}
          orders={farmOrders}
          inventory={farmInventory}
          onFulfillOrder={handleFulfillOrder}
          onRefreshOrder={handleRefreshOrder}
          onClose={() => setOrdersOpen(false)}
        />
      )}

      {storageOpen && (
        <FarmStorageModal
          coins={stats.coins}
          warehouseLevel={warehouseLevel}
          inventory={farmInventory}
          onDirectSell={handleDirectSell}
          onSellSeed={handleSellSeed}
          onSellSupply={handleSellSupply}
          onUpgradeWarehouse={handleUpgradeWarehouse}
          onClose={() => setStorageOpen(false)}
        />
      )}

      {zone === 'garden' && pastureCoop && (
        <LivestockModal
          key={pastureCoop}
          coop={pastureCoop}
          coins={stats.coins}
          animals={livestock}
          troughs={troughs}
          inventory={farmInventory}
          storageFull={storageFull}
          onFeedAnimal={handleFeedAnimal}
          onFillTrough={handleFillCoopTrough}
          onCureAnimal={handleCureAnimal}
          onCollectProduce={handleCollectProduce}
          onSellAnimal={handleSellAnimal}
          onClose={() => setPastureCoop(null)}
        />
      )}

      {zone === 'garden' && pondOpen && (
        <PondModal
          coins={stats.coins}
          fishList={pondFish}
          supplies={farmInventory.supplies}
          nearPond={nearPond}
          onScatterFeed={handleScatterPondFeed}
          onCureFish={handleCureFish}
          onHarvestFish={handleHarvestFish}
          onStartFishing={() => setFarmPondFishPulse((p) => p + 1)}
          onClose={() => setPondOpen(false)}
        />
      )}

      {koiShopOpen && (
        <KoiShopModal
          coins={stats.coins}
          fishingRod={fishingRod}
          bugNet={bugNet}
          fishBasket={fishBasket}
          insectBasket={insectBasket}
          onBuyRod={handleBuyFishingRod}
          onBuyNet={handleBuyBugNet}
          onToggleFishLock={handleToggleFishLock}
          onSellFish={handleSellFish}
          onSellAllUnlocked={handleSellAllUnlockedFish}
          onToggleInsectLock={handleToggleInsectLock}
          onSellInsect={handleSellInsect}
          onSellAllUnlockedInsects={handleSellAllUnlockedInsects}
          onOpenBagTools={() => {
            setKoiShopOpen(false);
            setBagInitialSubTab('tools');
            setBagOpen(true);
          }}
          onClose={() => setKoiShopOpen(false)}
        />
      )}

      {zone === 'town' && bbqGrillOpen && (
        <BbqGrillModal
          coins={stats.coins}
          hunger={stats.hunger ?? 100}
          bbqFoods={bbqFoods}
          onCookFood={handleCookBbqFood}
          onOpenBagFood={() => {
            setBbqGrillOpen(false);
            setBagInitialSubTab('food');
            setBagOpen(true);
          }}
          onClose={() => setBbqGrillOpen(false)}
        />
      )}

      {zone === 'town' && vendingOpen && (
        <VendingMachineModal
          coins={stats.coins}
          hunger={stats.hunger ?? 100}
          bbqFoods={bbqFoods}
          onBuyDrink={handleBuyVendingDrink}
          onOpenBagFood={() => {
            setVendingOpen(false);
            setBagInitialSubTab('food');
            setBagOpen(true);
          }}
          onClose={() => setVendingOpen(false)}
        />
      )}

      {zone === 'town' && shipShopOpen && (
        <ShipShopModal
          coins={stats.coins}
          boats={boats}
          onBuyBoat={handleBuyBoat}
          onSelectBoat={handleSelectBoat}
          onOpenBagBoats={() => {
            setShipShopOpen(false);
            setBagInitialSubTab('boats');
            setBagOpen(true);
          }}
          onClose={() => setShipShopOpen(false)}
        />
      )}

      {zone === 'town' && joyboyModalOpen && (
        <JoyboyDeliveryModal
          deliveryState={activeJoyboyDelivery}
          onAcceptOrder={handleAcceptJoyboyOrder}
          onCancelOrder={handleCancelJoyboyOrder}
          onClose={() => setJoyboyModalOpen(false)}
        />
      )}

      {zone === 'mall' && tunShopOpen && (
        <TunShopModal
          coins={stats.coins}
          ownedMounts={ownedMounts}
          onBuyMount={handleBuyMount}
          onToggleMount={handleToggleMount}
          onOpenBagMounts={() => {
            setTunShopOpen(false);
            setBagInitialSubTab('mounts');
            setBagOpen(true);
          }}
          onClose={() => setTunShopOpen(false)}
        />
      )}

      {zone === 'mall' && peppaShopOpen && (
        <PeppaShopModal
          coins={stats.coins}
          ingredients={peppaIngredients}
          unlockedRecipes={unlockedPeppaRecipes}
          onBuyIngredient={handleBuyPeppaIngredient}
          onBuyRecipe={handleBuyPeppaRecipe}
          onClose={() => setPeppaShopOpen(false)}
        />
      )}

      {zone === 'mall' && cafeShopOpen && (
        <MayCafeModal
          coins={stats.coins}
          energy={stats.energy}
          hunger={stats.hunger ?? 100}
          onBuyItem={handleBuyCafeItem}
          onClose={() => setCafeShopOpen(false)}
        />
      )}

      {zone === 'arcade' && arcadeHubSection && (
        <ArcadeHubModal
          section={arcadeHubSection}
          coins={stats.coins}
          coinGame={stats.coinGame ?? 0}
          onSelectSection={setArcadeHubSection}
          onOpenArcadeGame={(gameId) => {
            setArcadeHubSection(null);
            setActiveArcadeGame(gameId);
          }}
          onOpenCoinGameShop={() => {
            setArcadeHubSection(null);
            setCoinGameShopOpen(true);
          }}
          onClose={() => setArcadeHubSection(null)}
        />
      )}

      {zone === 'arcade' && activeArcadeGame && (
        <ArcadeMiniGameModal
          gameId={activeArcadeGame}
          coins={stats.coins}
          coinGame={stats.coinGame ?? 0}
          hasFreeClawToday={lastFreeClawDate !== getTodayDateKey()}
          onUseFreeClawToday={() => setLastFreeClawDate(getTodayDateKey())}
          onSpendCoins={handleSpendCoins}
          onEarnCoinGame={handleEarnCoinGame}
          onEarnCoins={addCoins}
          onSelectGame={setActiveArcadeGame}
          onClose={() => setActiveArcadeGame(null)}
        />
      )}

      {zone === 'arcade' && coinGameShopOpen && (
        <CoinGameShopModal
          coinGame={stats.coinGame ?? 0}
          coins={stats.coins}
          ownedMounts={ownedMounts}
          onBuyCoinGameMount={handleBuyCoinGameMount}
          onToggleMount={handleToggleMount}
          onOpenBagMounts={() => {
            setCoinGameShopOpen(false);
            setBagInitialSubTab('mounts');
            setBagOpen(true);
          }}
          onClose={() => setCoinGameShopOpen(false)}
        />
      )}

      {zone === 'home' && activeApplianceModal && (
        <ApplianceCookModal
          appliance={activeApplianceModal}
          coins={stats.coins}
          energy={stats.energy}
          hunger={stats.hunger ?? 100}
          ingredients={peppaIngredients}
          unlockedRecipes={unlockedPeppaRecipes}
          dishes={peppaDishes}
          onCookDish={handleCookPeppaDish}
          onEatDish={handleEatPeppaDish}
          onSellDish={handleSellPeppaDish}
          onClose={() => setActiveApplianceModal(null)}
        />
      )}

      {boutiqueOpen && (
        <BoutiqueModal
          avatar={avatar}
          coins={stats.coins}
          ownedIds={ownedIds}
          onBuyItem={handleBuyShopItem}
          onBuySet={handleBuyShopSet}
          onEquipAvatar={handleEquipAvatar}
          onClose={() => setBoutiqueOpen(false)}
        />
      )}

      {furnitureShopOpen && (
        <FurnitureShopModal
          coins={stats.coins}
          inventory={furnitureInventory}
          placed={placedFurniture}
          onBuyItem={handleBuyFurnitureItem}
          onClose={() => setFurnitureShopOpen(false)}
        />
      )}

      {dailyQuestsOpen && (
        <DailyQuestsModal
          quests={activeDailyQuests}
          onClaimQuest={handleClaimQuest}
          onClose={() => setDailyQuestsOpen(false)}
        />
      )}

      {dailyCheckInOpen && (
        <DailyCheckInModal
          checkIn={checkIn}
          onClaimToday={handleClaimDailyCheckIn}
          onClose={() => setDailyCheckInOpen(false)}
        />
      )}

      {bagOpen && (
        <BackpackModal
          fishingRod={fishingRod}
          bugNet={bugNet}
          boats={boats}
          ownedMounts={ownedMounts}
          ownedPets={ownedPets}
          activePetId={activePetId}
          petSupplies={petSupplies}
          bbqFoods={bbqFoods}
          equippedFoodId={equippedFoodId}
          farmDishes={farmInventory.dishes}
          peppaDishes={peppaDishes}
          initialSubTab={bagInitialSubTab}
          onToggleEquipRod={handleToggleEquipRod}
          onToggleEquipNet={handleToggleEquipNet}
          onSelectBoat={handleSelectBoat}
          onToggleEquipFood={handleToggleEquipFood}
          onEatPeppaDish={handleEatPeppaDish}
          onSellPeppaDish={handleSellPeppaDish}
          onToggleMount={handleToggleMount}
          onToggleSummonPet={handleToggleSummonPet}
          onRenamePet={handleRenamePet}
          onUsePetSupply={handleUsePetSupply}
          onClose={() => setBagOpen(false)}
        />
      )}

      {phoneOpen && (
        <PhoneMenuModal
          zone={zone}
          avatar={avatar}
          stats={stats}
          timeOfDay={timeOfDay}
          soundEnabled={soundEnabled}
          dailyQuests={activeDailyQuests}
          checkIn={checkIn}
          storageUsed={storageUsed}
          storageCapacity={storageCapacity}
          fishDex={fishDex}
          insectDex={insectDex}
          playerActions={playerActions}
          accountCreatedAt={accountCreatedAt}
          accountId={accountId}
          teleportCooldownSec={teleportCooldownSec}
          initialTab={phoneInitialTab}
          onTeleportToPlaza={handleTeleportToPlaza}
          onOpenWardrobe={() => {
            setPhoneOpen(false);
            setWardrobeOpen(true);
          }}
          onOpenDailyQuests={() => {
            setPhoneOpen(false);
            setDailyQuestsOpen(true);
          }}
          onOpenDailyCheckIn={() => {
            setPhoneOpen(false);
            setDailyCheckInOpen(true);
          }}
          onOpenSettings={() => {
            setPhoneOpen(false);
            setSettingsOpen(true);
          }}
          onOpenStorage={() => {
            setPhoneOpen(false);
            setStorageOpen(true);
          }}
          onEquipPlayerAction={handleEquipPlayerAction}
          onUnequipPlayerAction={handleUnequipPlayerAction}
          onChangeTimeOfDay={setTimeOfDay}
          onToggleSound={handleToggleSound}
          onRedeemGiftCode={handleRedeemGiftCode}
          onClose={() => setPhoneOpen(false)}
        />
      )}

      {zone === 'petshop' && petSupplyShopOpen && (
        <PetSupplyShopModal
          coins={stats.coins}
          supplies={petSupplies}
          onBuySupply={handleBuyPetSupply}
          onClose={() => setPetSupplyShopOpen(false)}
        />
      )}

      {zone === 'petshop' && petAdoptOpen && (
        <PetAdoptModal
          coins={stats.coins}
          ownedPets={ownedPets}
          onAdoptPet={handleAdoptPet}
          onClose={() => setPetAdoptOpen(false)}
        />
      )}

      {settingsOpen && (
        <SettingsModal
          playerName={avatar.name}
          onChangeName={(name) =>
            setAvatar((prev) => ({
              ...prev,
              name: sanitizePlayerNameInput(name) || 'Mây Nhỏ',
            }))
          }
          timeOfDay={timeOfDay}
          onChangeTimeOfDay={setTimeOfDay}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {!hasCreatedCharacter && (
        <StarterCharacterModal onConfirm={handleConfirmStarterCharacter} />
      )}
    </main>
  );
}
