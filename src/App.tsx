import {useEffect, useRef, useState} from 'react';
import {BoutiqueModal} from './components/modals/BoutiqueModal';
import {DailyQuestsModal} from './components/modals/DailyQuestsModal';
import {FarmShopModal} from './components/modals/FarmShopModal';
import {FarmStorageModal} from './components/modals/FarmStorageModal';
import {FarmWorkshopModal} from './components/modals/FarmWorkshopModal';
import {FurnitureModal} from './components/modals/FurnitureModal';
import {FurnitureShopModal} from './components/modals/FurnitureShopModal';
import {LivestockModal} from './components/modals/LivestockModal';
import {OrderBoardModal} from './components/modals/OrderBoardModal';
import {PhoneMenuModal} from './components/modals/PhoneMenuModal';
import {PondModal} from './components/modals/PondModal';
import {SettingsModal} from './components/modals/SettingsModal';
import {WardrobeModal} from './components/modals/WardrobeModal';
import {KoiShopModal} from './components/modals/KoiShopModal';
import {WorldCanvas} from './components/WorldCanvas';
import {DEFAULT_AVATAR, SHOP_ITEMS, STARTER_OWNED_IDS} from './data/avatarCatalog';
import {
  computeFishSellPrice,
  createInitialFishDex,
  createInitialFishingRod,
  getRodRepairCost,
  RIVER_FISH_CATALOG,
  rollRandomRiverFish,
  WOODEN_ROD_MAX_DURABILITY,
  WOODEN_ROD_PRICE,
} from './data/fishingCatalog';
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
import {
  AnimalProduceId,
  AnimalType,
  AvatarConfig,
  CaughtFishItem,
  CookingJob,
  CoopKind,
  CoopTroughs,
  CropType,
  DailyQuestProgress,
  FarmInventory,
  FarmItemKind,
  FarmOrder,
  FarmSupplies,
  FishDexRecord,
  FishingRodState,
  FurnitureCatalogItem,
  GameStats,
  GardenPlotState,
  KitchenLevel,
  LivestockAnimalState,
  MillJob,
  PlacedFurniture,
  PlotLevel,
  PondFishSpecies,
  PondFishState,
  ProcessedId,
  RecipeId,
  RiverFishSpeciesId,
  ShopItem,
  TimeOfDay,
  WellWaterState,
  ZoneId,
} from './types/game';
import {soundFX} from './utils/sound';

const STORAGE_KEY = 'thi_tran_may_save_v1';
const HOUSE_LAYOUT_VERSION = 5;

const getTodayKey = () => new Date().toISOString().slice(0, 10);

const createEmptyDailyQuests = (): DailyQuestProgress => ({
  date: getTodayKey(),
  tasks: {garden: false, fishing: false, dressup: false},
  claimed: {garden: false, fishing: false, dressup: false},
});

function clampDropIntoHouse(rawX: number, rawZ: number): {x: number; z: number} {
  return {
    x: Math.max(-12.6, Math.min(9.6, rawX)),
    z: Math.max(-8.6, Math.min(6.6, rawZ)),
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
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [furnitureModalOpen, setFurnitureModalOpen] = useState(false);
  const [workshopTab, setWorkshopTab] = useState<'mill' | 'kitchen' | null>(null);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [storageOpen, setStorageOpen] = useState(false);
  const [pastureCoop, setPastureCoop] = useState<CoopKind | null>(null);
  const [pondOpen, setPondOpen] = useState(false);
  const [farmShopOpen, setFarmShopOpen] = useState(false);
  const [koiShopOpen, setKoiShopOpen] = useState(false);
  const [phoneInitialTab, setPhoneInitialTab] = useState<'menu' | 'guide' | 'bag' | 'fishdex'>('menu');
  const [phoneBagSubTab, setPhoneBagSubTab] = useState<'list' | 'tools' | 'basket'>('list');
  const [nearPond, setNearPond] = useState(false);
  const [pondFeedPulse, setPondFeedPulse] = useState(0);
  const [farmPondFishPulse, setFarmPondFishPulse] = useState(0);
  const [editFurnitureMode, setEditFurnitureMode] = useState(false);
  const [selectedFurnitureId, setSelectedFurnitureId] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('morning');

  const homeSpotRef = useRef<{x: number; z: number}>({x: -1.8, z: 4.5});

  const [avatar, setAvatar] = useState<AvatarConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.avatar) return {...DEFAULT_AVATAR, ...parsed.avatar};
      }
    } catch {
      // ignore storage errors
    }
    return DEFAULT_AVATAR;
  });

  const [stats, setStats] = useState<GameStats>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.stats) return parsed.stats;
      }
    } catch {
      // ignore storage errors
    }
    return {coins: 100, energy: 85, mood: 90};
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
        if (parsed.dailyQuests && parsed.dailyQuests.date === getTodayKey()) {
          return parsed.dailyQuests;
        }
      }
    } catch {
      // ignore storage errors
    }
    return createEmptyDailyQuests();
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
                  f.speciesId in RIVER_FISH_CATALOG &&
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

  const [fishDex, setFishDex] = useState<Partial<Record<RiverFishSpeciesId, FishDexRecord>>>(() => {
    const base = createInitialFishDex();
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.fishDex && typeof parsed.fishDex === 'object') {
          for (const key of Object.keys(RIVER_FISH_CATALOG) as RiverFishSpeciesId[]) {
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
          if (dt < 800) return ani;
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
          if (dt < 800) return fish;
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
    };

    tickFarmWorld();
    const timer = window.setInterval(tickFarmWorld, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          houseVersion: HOUSE_LAYOUT_VERSION,
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
          placedFurniture,
          furnitureInventory,
          fishingRod,
          fishBasket,
          fishDex,
        }),
      );
    } catch {
      // ignore storage quota errors
    }
  }, [
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
    placedFurniture,
    furnitureInventory,
    fishingRod,
    fishBasket,
    fishDex,
  ]);

  const handleZoneChange = (next: ZoneId) => {
    setZone(next);
    if (next !== 'home') {
      setFurnitureModalOpen(false);
      setEditFurnitureMode(false);
      setSelectedFurnitureId(null);
    }
    if (next !== 'garden') {
      setWorkshopTab(null);
      setOrdersOpen(false);
      setStorageOpen(false);
      setPastureCoop(null);
      setPondOpen(false);
      setFarmShopOpen(false);
    }
  };

  const markQuestDone = (key: keyof DailyQuestProgress['tasks']) => {
    const today = getTodayKey();
    setDailyQuests((prev) => {
      const base = prev.date === today ? prev : createEmptyDailyQuests();
      if (base.tasks[key]) return base;
      return {...base, tasks: {...base.tasks, [key]: true}};
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
    markQuestDone('garden');
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
    markQuestDone('garden');
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
    markQuestDone('garden');
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

  const handleRepairFishingRod = () => {
    if (!fishingRod.owned || fishingRod.durability >= fishingRod.maxDurability) return;
    const cost = getRodRepairCost(fishingRod.durability, fishingRod.maxDurability);
    if (stats.coins < cost) return;
    soundFX.sparkle();
    setStats((prev) => ({
      ...prev,
      coins: prev.coins - cost,
    }));
    setFishingRod((prev) => ({
      ...prev,
      durability: prev.maxDurability,
    }));
  };

  const handleToggleEquipRod = () => {
    if (!fishingRod.owned) return;
    const nextEquipped = !fishingRod.equipped;
    setFishingRod((prev) => ({...prev, equipped: nextEquipped}));
    // Stowing handheld item back to wardrobe when equipping fishing rod / net
    if (nextEquipped) {
      setAvatar((prev) => (prev.handheld !== 'none' ? {...prev, handheld: 'none'} : prev));
    }
  };

  const handleCatchRiverFish = () => {
    const rod = fishingRodRef.current;
    if (!rod.owned || !rod.equipped || rod.durability <= 0) return null;

    const nextDur = Math.max(0, rod.durability - 1);
    const caught = rollRandomRiverFish();
    const spec = caught.species;

    const newItem: CaughtFishItem = {
      id: `fish_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      speciesId: spec.id,
      waterType: 'river',
      weightKg: caught.weightKg,
      sellPrice: caught.sellPrice,
      caughtAt: Date.now(),
      locked: false,
    };

    setFishingRod((prev) => ({
      ...prev,
      durability: Math.max(0, prev.durability - 1),
    }));
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
      mood: Math.min(100, prev.mood + 2),
    }));
    markQuestDone('fishing');

    return {
      name: spec.name,
      rarity: spec.rarity,
      weightKg: caught.weightKg,
      durabilityLeft: nextDur,
      maxDurability: rod.maxDurability,
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

  const handleSellAllUnlockedFish = () => {
    const unlocked = fishBasket.filter((f) => !f.locked && f.waterType === 'river');
    if (unlocked.length === 0) return;
    const totalGain = unlocked.reduce(
      (sum, f) => sum + computeFishSellPrice(f.speciesId, f.weightKg),
      0,
    );
    soundFX.sparkle();
    setFishBasket((prev) => prev.filter((f) => f.locked || f.waterType !== 'river'));
    setStats((prev) => ({
      ...prev,
      coins: prev.coins + totalGain,
      mood: Math.min(100, prev.mood + Math.min(8, unlocked.length)),
    }));
  };

  // === AVATAR, SHOPS & HOUSE FURNITURE ===
  const handleEquipAvatar = (next: AvatarConfig) => {
    setAvatar(next);
    if (next.handheld !== 'none') {
      setFishingRod((prev) => (prev.equipped ? {...prev, equipped: false} : prev));
    }
    markQuestDone('dressup');
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
    }
    markQuestDone('dressup');
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
  };

  const handleClaimQuest = (key: keyof DailyQuestProgress['tasks'], reward: number) => {
    setDailyQuests((prev) => {
      if (!prev.tasks[key] || prev.claimed[key]) return prev;
      return {...prev, claimed: {...prev.claimed, [key]: true}};
    });
    addCoins(reward);
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
    setFurnitureModalOpen(false);
    setEditFurnitureMode(true);
    setSelectedFurnitureId(instanceId);
  };

  const handleMoveFurniture = (instanceId: string, x: number, z: number, rotY?: number) => {
    setPlacedFurniture((prev) => {
      const target = prev.find((item) => item.instanceId === instanceId);
      if (!target) return prev;
      const cat = FURNITURE_BY_ID[target.catalogId];
      if (cat?.wallMount && rotY !== undefined) {
        return prev.map((item) =>
          item.instanceId === instanceId
            ? {...item, x: Number(x.toFixed(2)), z: Number(z.toFixed(2)), rotY, y: undefined}
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
    setEditFurnitureMode((prev) => {
      const next = !prev;
      if (!next) setSelectedFurnitureId(null);
      return next;
    });
  };

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
        seeds={farmInventory.seeds}
        bugSprayCount={farmInventory.supplies.bugSpray}
        waterCount={waterCan}
        wellWater={wellWater}
        placedFurniture={placedFurniture}
        editFurnitureMode={editFurnitureMode}
        selectedFurnitureId={selectedFurnitureId}
        homeSpotRef={homeSpotRef}
        onChangeZone={handleZoneChange}
        onOpenWardrobe={() => setWardrobeOpen(true)}
        onOpenShop={() => setBoutiqueOpen(true)}
        onOpenKoiShop={() => setKoiShopOpen(true)}
        onOpenFurnitureShop={() => setFurnitureShopOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenDailyQuests={() => setDailyQuestsOpen(true)}
        onOpenPhone={() => {
          setPhoneInitialTab('menu');
          setPhoneBagSubTab('list');
          setPhoneOpen(true);
        }}
        onOpenFurniture={() => {
          setEditFurnitureMode(false);
          setSelectedFurnitureId(null);
          setFurnitureModalOpen(true);
        }}
        onToggleEditFurniture={handleToggleEditFurniture}
        onSelectFurniture={setSelectedFurnitureId}
        onMoveFurniture={handleMoveFurniture}
        onRotateFurniture={handleRotateFurniture}
        onStowFurniture={handleStowFurniture}
        onCatchRiverFish={handleCatchRiverFish}
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
          onPlaceItem={handlePlaceFurniture}
          onClose={() => setFurnitureModalOpen(false)}
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

      {zone === 'garden' && storageOpen && (
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
          fishBasket={fishBasket}
          onBuyRod={handleBuyFishingRod}
          onRepairRod={handleRepairFishingRod}
          onToggleFishLock={handleToggleFishLock}
          onSellFish={handleSellFish}
          onSellAllUnlocked={handleSellAllUnlockedFish}
          onOpenBagTools={() => {
            setKoiShopOpen(false);
            setPhoneInitialTab('bag');
            setPhoneBagSubTab('tools');
            setPhoneOpen(true);
          }}
          onClose={() => setKoiShopOpen(false)}
        />
      )}

      {boutiqueOpen && (
        <BoutiqueModal
          avatar={avatar}
          coins={stats.coins}
          ownedIds={ownedIds}
          onBuyItem={handleBuyShopItem}
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
          quests={dailyQuests}
          onClaimQuest={handleClaimQuest}
          onClose={() => setDailyQuestsOpen(false)}
        />
      )}

      {phoneOpen && (
        <PhoneMenuModal
          zone={zone}
          avatar={avatar}
          stats={stats}
          timeOfDay={timeOfDay}
          soundEnabled={soundEnabled}
          dailyQuests={dailyQuests}
          storageUsed={storageUsed}
          storageCapacity={storageCapacity}
          fishingRod={fishingRod}
          fishBasket={fishBasket}
          fishDex={fishDex}
          initialTab={phoneInitialTab}
          initialBagSubTab={phoneBagSubTab}
          onToggleEquipRod={handleToggleEquipRod}
          onToggleFishLock={handleToggleFishLock}
          onSellFish={handleSellFish}
          onSellAllUnlocked={handleSellAllUnlockedFish}
          onOpenWardrobe={() => {
            setPhoneOpen(false);
            setWardrobeOpen(true);
          }}
          onOpenDailyQuests={() => {
            setPhoneOpen(false);
            setDailyQuestsOpen(true);
          }}
          onOpenSettings={() => {
            setPhoneOpen(false);
            setSettingsOpen(true);
          }}
          onOpenStorage={() => {
            setPhoneOpen(false);
            if (zone !== 'garden') {
              handleZoneChange('garden');
            }
            setStorageOpen(true);
          }}
          onChangeTimeOfDay={setTimeOfDay}
          onToggleSound={handleToggleSound}
          onClose={() => setPhoneOpen(false)}
        />
      )}

      {settingsOpen && (
        <SettingsModal
          playerName={avatar.name}
          onChangeName={(name) =>
            setAvatar((prev) => ({...prev, name: name || 'Mây Nhỏ'}))
          }
          timeOfDay={timeOfDay}
          onChangeTimeOfDay={setTimeOfDay}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </main>
  );
}
