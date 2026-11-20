import {useEffect, useRef, useState} from 'react';
import {BoutiqueModal} from './components/modals/BoutiqueModal';
import {DailyQuestsModal} from './components/modals/DailyQuestsModal';
import {FarmWorkshopModal} from './components/modals/FarmWorkshopModal';
import {FurnitureModal} from './components/modals/FurnitureModal';
import {FurnitureShopModal} from './components/modals/FurnitureShopModal';
import {GardenPlotModal} from './components/modals/GardenPlotModal';
import {LivestockModal} from './components/modals/LivestockModal';
import {OrderBoardModal} from './components/modals/OrderBoardModal';
import {PondModal} from './components/modals/PondModal';
import {SettingsModal} from './components/modals/SettingsModal';
import {WardrobeModal} from './components/modals/WardrobeModal';
import {WorldCanvas} from './components/WorldCanvas';
import {DEFAULT_AVATAR, SHOP_ITEMS, STARTER_OWNED_IDS} from './data/avatarCatalog';
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
  KITCHEN_RECIPES,
  MAX_COOP_ANIMALS,
  MAX_POND_FISH,
  PLOT_COUNT,
  PLOT_LEVELS,
  POND_FISH_SPECIES,
  PROCESSED_ITEMS,
  SUPPLY_PRICES,
} from './data/farmCatalog';
import {
  FURNITURE_BY_ID,
  STARTER_FURNITURE_INVENTORY,
  STARTER_PLACED_FURNITURE,
} from './data/furnitureCatalog';
import {
  AnimalProduceId,
  AnimalType,
  AvatarConfig,
  CoopKind,
  CoopTroughs,
  CropType,
  DailyQuestProgress,
  FarmInventory,
  FarmItemKind,
  FarmOrder,
  FurnitureCatalogItem,
  GameStats,
  GardenPlotState,
  LivestockAnimalState,
  PlacedFurniture,
  PlotLevel,
  PondFishSpecies,
  PondFishState,
  ProcessedId,
  RecipeId,
  ShopItem,
  TimeOfDay,
  ZoneId,
} from './types/game';
import {soundFX} from './utils/sound';

const STORAGE_KEY = 'thi_tran_may_save_v1';
const HOUSE_LAYOUT_VERSION = 4;

const getTodayKey = () => new Date().toISOString().slice(0, 10);

const createEmptyDailyQuests = (): DailyQuestProgress => ({
  date: getTodayKey(),
  tasks: {garden: false, fishing: false, dressup: false},
  claimed: {garden: false, fishing: false, dressup: false},
});

function clampDropIntoHouse(rawX: number, rawZ: number): {x: number; z: number} {
  let x = Math.max(-12.4, Math.min(9.4, rawX));
  let z = Math.max(-8.4, Math.min(6.4, rawZ));
  if (x > 6.45 && z > -0.5 && z < 5.2 && (z < 0.95 || x > 8.95)) {
    x = 6.2;
  }
  return {x, z};
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

  return {crops, animalProducts, processed, dishes, supplies: inv.supplies};
}

export default function App() {
  const [zone, setZone] = useState<ZoneId>('town');
  const [wardrobeOpen, setWardrobeOpen] = useState(false);
  const [boutiqueOpen, setBoutiqueOpen] = useState(false);
  const [furnitureShopOpen, setFurnitureShopOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dailyQuestsOpen, setDailyQuestsOpen] = useState(false);
  const [furnitureModalOpen, setFurnitureModalOpen] = useState(false);
  const [activePlotId, setActivePlotId] = useState<number | null>(null);
  const [workshopTab, setWorkshopTab] = useState<'mill' | 'kitchen' | null>(null);
  const [orderBoardOpen, setOrderBoardOpen] = useState(false);
  const [pastureCoop, setPastureCoop] = useState<CoopKind | null>(null);
  const [pondOpen, setPondOpen] = useState(false);
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
          return {
            crops: parsed.farmInventory.crops || {},
            animalProducts: rawProducts as FarmInventory['animalProducts'],
            processed: parsed.farmInventory.processed || {},
            dishes: parsed.farmInventory.dishes || {},
            supplies: {
              ...createInitialSupplies(),
              ...(parsed.farmInventory.supplies || {}),
            },
          };
        }
      }
    } catch {
      // ignore storage errors
    }
    return createInitialFarmInventory();
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
          return parsed.pondFish;
        }
      }
    } catch {
      // ignore storage errors
    }
    return createInitialPondFish();
  });

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
          const filtered = parsed.placedFurniture.filter(
            (p: PlacedFurniture) => p && typeof p.catalogId === 'string' && FURNITURE_BY_ID[p.catalogId],
          );
          const hasWardrobePlaced = filtered.some(
            (p: PlacedFurniture) => FURNITURE_BY_ID[p.catalogId]?.interactive === 'wardrobe',
          );
          const hasWardrobeInInv = (parsed.furnitureInventory?.wardrobe_oak || 0) > 0;
          if (parsed.houseVersion < HOUSE_LAYOUT_VERSION && !hasWardrobePlaced && !hasWardrobeInInv) {
            return [
              ...filtered,
              {instanceId: 'init_wardrobe_1', catalogId: 'wardrobe_oak', x: -6.2, z: -8.55, rotY: 0},
            ];
          }
          return filtered;
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
            const pestCheckAt = plot.plantedAt + plot.durationMs * 0.35;
            if (now >= pestCheckAt) {
              const chance = PLOT_LEVELS[plot.level].pestChance;
              updated = {
                ...updated,
                pestRolled: true,
                hasPest: Math.random() < chance,
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
          livestock,
          troughs,
          pondFish,
          farmOrders,
          ownedIds,
          dailyQuests,
          placedFurniture,
          furnitureInventory,
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
    livestock,
    troughs,
    pondFish,
    farmOrders,
    ownedIds,
    dailyQuests,
    placedFurniture,
    furnitureInventory,
  ]);

  const handleZoneChange = (next: ZoneId) => {
    setZone(next);
    if (next !== 'home') {
      setFurnitureModalOpen(false);
      setEditFurnitureMode(false);
      setSelectedFurnitureId(null);
    }
    if (next !== 'garden') {
      setActivePlotId(null);
      setWorkshopTab(null);
      setOrderBoardOpen(false);
      setPastureCoop(null);
      setPondOpen(false);
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
    if (stats.coins < def.seedPrice) return;
    const now = Date.now();

    setStats((prev) => ({
      ...prev,
      coins: prev.coins - def.seedPrice,
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

  const handleSprayPest = (plotId: number) => {
    const target = plots.find((p) => p.id === plotId);
    if (!target || !target.hasPest) return;

    const hasSpray = farmInventory.supplies.bugSpray > 0;
    if (!hasSpray && stats.coins < SUPPLY_PRICES.bugSpray) return;

    if (hasSpray) {
      setFarmInventory((prev) => ({
        ...prev,
        supplies: {...prev.supplies, bugSpray: prev.supplies.bugSpray - 1},
      }));
    } else {
      setStats((prev) => ({...prev, coins: prev.coins - SUPPLY_PRICES.bugSpray}));
    }

    setPlots((prev) =>
      prev.map((plot) => (plot.id === plotId ? {...plot, hasPest: false} : plot)),
    );
    setStats((prev) => ({
      ...prev,
      energy: Math.max(5, prev.energy - 1),
      mood: Math.min(100, prev.mood + 2),
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
              pestRolled: false,
              plantedAt: null,
              readyAt: null,
              durationMs: 0,
            }
          : p,
      ),
    );
    setActivePlotId(null);
  };

  const handleHarvestPlot = (plotId: number) => {
    const target = plots.find((p) => p.id === plotId);
    if (!target || target.stage !== 'ready' || !target.crop) return;

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
    setActivePlotId(null);
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

  // === MILL, KITCHEN & ORDERS ===
  const handleProcessItem = (id: ProcessedId) => {
    const proc = PROCESSED_ITEMS[id];
    if (!proc) return;
    const hasAll = proc.inputs.every(
      (inp) => getFarmItemCount(farmInventory, inp.kind, inp.id) >= inp.qty,
    );
    if (!hasAll) return;

    const deltas = [
      ...proc.inputs.map((inp) => ({kind: inp.kind, id: inp.id, delta: -inp.qty})),
      {kind: 'processed' as const, id: proc.id, delta: 1},
    ];
    setFarmInventory((prev) => adjustFarmInventory(prev, deltas));
    setStats((prev) => ({...prev, mood: Math.min(100, prev.mood + 2)}));
  };

  const handleCookRecipe = (id: RecipeId) => {
    const rec = KITCHEN_RECIPES[id];
    if (!rec) return;
    const hasAll = rec.inputs.every(
      (inp) => getFarmItemCount(farmInventory, inp.kind, inp.id) >= inp.qty,
    );
    if (!hasAll) return;

    const deltas = [
      ...rec.inputs.map((inp) => ({kind: inp.kind, id: inp.id, delta: -inp.qty})),
      {kind: 'dish' as const, id: rec.id, delta: 1},
    ];
    setFarmInventory((prev) => adjustFarmInventory(prev, deltas));
    setStats((prev) => ({...prev, mood: Math.min(100, prev.mood + 3)}));
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
    const hasSupply = farmInventory.supplies.animalFeed > 0;
    if (!hasSupply && stats.coins < SUPPLY_PRICES.animalFeed) return;

    if (hasSupply) {
      setFarmInventory((prev) => ({
        ...prev,
        supplies: {...prev.supplies, animalFeed: prev.supplies.animalFeed - 1},
      }));
    } else {
      setStats((prev) => ({...prev, coins: prev.coins - SUPPLY_PRICES.animalFeed}));
    }

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
    if (needed <= 0) return;

    const inBag = farmInventory.supplies.animalFeed;
    const fromBag = Math.min(inBag, needed);
    const needBuy = needed - fromBag;
    const cost = needBuy * SUPPLY_PRICES.animalFeed;
    if (stats.coins < cost) return;

    if (fromBag > 0) {
      setFarmInventory((prev) => ({
        ...prev,
        supplies: {...prev.supplies, animalFeed: prev.supplies.animalFeed - fromBag},
      }));
    }
    if (cost > 0) {
      setStats((prev) => ({...prev, coins: prev.coins - cost}));
    }
    setTroughs((prev) => {
      const next = {...prev, [coop]: Math.max(prev[coop], coopCount)};
      troughsRef.current = next;
      return next;
    });
  };

  const handleCureAnimal = (animalId: string) => {
    const hasMed = farmInventory.supplies.animalMedicine > 0;
    if (!hasMed && stats.coins < SUPPLY_PRICES.animalMedicine) return;

    if (hasMed) {
      setFarmInventory((prev) => ({
        ...prev,
        supplies: {...prev.supplies, animalMedicine: prev.supplies.animalMedicine - 1},
      }));
    } else {
      setStats((prev) => ({...prev, coins: prev.coins - SUPPLY_PRICES.animalMedicine}));
    }

    setLivestock((prev) =>
      prev.map((a) => (a.id === animalId ? {...a, sick: false} : a)),
    );
  };

  const handleCollectProduce = (animalId: string) => {
    const ani = livestock.find((a) => a.id === animalId);
    if (!ani || !ani.hasProduce) return;
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

  const handleBuyLivestockSupply = (supply: 'animalFeed' | 'animalMedicine', qty = 1) => {
    const cost = SUPPLY_PRICES[supply] * qty;
    if (stats.coins < cost) return;
    setStats((prev) => ({...prev, coins: prev.coins - cost}));
    setFarmInventory((prev) => ({
      ...prev,
      supplies: {...prev.supplies, [supply]: prev.supplies[supply] + qty},
    }));
  };

  const handleCraftFeedFromCrop = (crop: 'wheat' | 'corn') => {
    const have = farmInventory.crops[crop] || 0;
    if (have < 1) return;
    const gain = crop === 'corn' ? 3 : 2;
    setFarmInventory((prev) => {
      const next = adjustFarmInventory(prev, [{kind: 'crop', id: crop, delta: -1}]);
      return {
        ...next,
        supplies: {...next.supplies, animalFeed: next.supplies.animalFeed + gain},
      };
    });
  };

  // === POND AQUACULTURE (24H / 48H FISH) HANDLERS ===
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

  const handleFeedFish = (fishId: string) => {
    const hasSupply = farmInventory.supplies.fishFeed > 0;
    if (!hasSupply && stats.coins < SUPPLY_PRICES.fishFeed) return;
    if (hasSupply) {
      setFarmInventory((prev) => ({
        ...prev,
        supplies: {...prev.supplies, fishFeed: prev.supplies.fishFeed - 1},
      }));
    } else {
      setStats((prev) => ({...prev, coins: prev.coins - SUPPLY_PRICES.fishFeed}));
    }

    setPondFish((prev) =>
      prev.map((f) => {
        if (f.id !== fishId || f.stage === 'ready') return f;
        // Feeding grants +60 hunger and -15 min bonus growth
        const nextRem = Math.max(0, f.remainingMs - 15 * 60 * 1000);
        return {
          ...f,
          hunger: Math.min(100, f.hunger + 60),
          remainingMs: nextRem,
          stage: nextRem <= 0 ? 'ready' : 'growing',
        };
      }),
    );
  };

  const handleCureFish = (fishId: string) => {
    const hasMed = farmInventory.supplies.fishMedicine > 0;
    if (!hasMed && stats.coins < SUPPLY_PRICES.fishMedicine) return;
    if (hasMed) {
      setFarmInventory((prev) => ({
        ...prev,
        supplies: {...prev.supplies, fishMedicine: prev.supplies.fishMedicine - 1},
      }));
    } else {
      setStats((prev) => ({...prev, coins: prev.coins - SUPPLY_PRICES.fishMedicine}));
    }

    setPondFish((prev) =>
      prev.map((f) => (f.id === fishId ? {...f, sick: false, lastCareCheckAt: Date.now()} : f)),
    );
  };

  const handleBoostFish = (fishId: string) => {
    const hasBooster = farmInventory.supplies.pondBooster > 0;
    if (!hasBooster && stats.coins < SUPPLY_PRICES.pondBooster) return;
    if (hasBooster) {
      setFarmInventory((prev) => ({
        ...prev,
        supplies: {...prev.supplies, pondBooster: prev.supplies.pondBooster - 1},
      }));
    } else {
      setStats((prev) => ({...prev, coins: prev.coins - SUPPLY_PRICES.pondBooster}));
    }

    setPondFish((prev) =>
      prev.map((f) => {
        if (f.id !== fishId || f.stage === 'ready' || f.sick) return f;
        const nextRem = Math.max(0, f.remainingMs - 4 * 3600 * 1000);
        return {
          ...f,
          remainingMs: nextRem,
          stage: nextRem <= 0 ? 'ready' : 'growing',
        };
      }),
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

  const handleBuyPondSupply = (
    supply: 'fishFeed' | 'fishMedicine' | 'pondBooster',
    qty = 1,
  ) => {
    const cost = SUPPLY_PRICES[supply] * qty;
    if (stats.coins < cost) return;
    setStats((prev) => ({...prev, coins: prev.coins - cost}));
    setFarmInventory((prev) => ({
      ...prev,
      supplies: {...prev.supplies, [supply]: prev.supplies[supply] + qty},
    }));
  };

  // === AVATAR, SHOPS & HOUSE FURNITURE ===
  const handleEquipAvatar = (next: AvatarConfig) => {
    setAvatar(next);
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
    } else {
      const spot = clampDropIntoHouse(
        homeSpotRef.current.x + (Math.random() - 0.5) * 0.6,
        homeSpotRef.current.z - 1.2,
      );
      spawnX = spot.x;
      spawnZ = spot.z;
    }

    const instanceId = `furn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const newItem: PlacedFurniture = {
      instanceId,
      catalogId,
      x: Number(spawnX.toFixed(2)),
      z: Number(spawnZ.toFixed(2)),
      rotY: spawnRotY,
    };

    setFurnitureInventory((prev) => ({
      ...prev,
      [catalogId]: Math.max(0, (prev[catalogId] || 0) - 1),
    }));
    setPlacedFurniture((prev) => [...prev, newItem]);
    setFurnitureModalOpen(false);
    setEditFurnitureMode(true);
    setSelectedFurnitureId(instanceId);
  };

  const handleMoveFurniture = (instanceId: string, x: number, z: number, rotY?: number) => {
    setPlacedFurniture((prev) =>
      prev.map((item) => {
        if (item.instanceId !== instanceId) return item;
        const cat = FURNITURE_BY_ID[item.catalogId];
        if (cat?.wallMount && rotY !== undefined) {
          return {
            ...item,
            x: Number(x.toFixed(2)),
            z: Number(z.toFixed(2)),
            rotY,
          };
        }
        const safe = clampDropIntoHouse(x, z);
        return {
          ...item,
          x: Number(safe.x.toFixed(2)),
          z: Number(safe.z.toFixed(2)),
        };
      }),
    );
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
    setPlacedFurniture((prev) => prev.filter((item) => item.instanceId !== instanceId));
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

  const activePlot =
    activePlotId !== null ? plots.find((p) => p.id === activePlotId) ?? null : null;

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
        placedFurniture={placedFurniture}
        editFurnitureMode={editFurnitureMode}
        selectedFurnitureId={selectedFurnitureId}
        homeSpotRef={homeSpotRef}
        onChangeZone={handleZoneChange}
        onOpenWardrobe={() => setWardrobeOpen(true)}
        onOpenShop={() => setBoutiqueOpen(true)}
        onOpenFurnitureShop={() => setFurnitureShopOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenDailyQuests={() => setDailyQuestsOpen(true)}
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
        onFishCaught={() => markQuestDone('fishing')}
        onRestoreEnergy={() => setStats((prev) => ({...prev, energy: 100}))}
        onBoostMood={() =>
          setStats((prev) => ({...prev, mood: Math.min(100, prev.mood + 10)}))
        }
        onDrinkWellWater={() =>
          setStats((prev) => ({...prev, energy: Math.min(100, prev.energy + 15)}))
        }
        onOpenPlot={(plotId) => setActivePlotId(plotId)}
        onHarvestPlot={handleHarvestPlot}
        onOpenWorkshop={(tab) => setWorkshopTab(tab)}
        onOpenOrders={() => setOrderBoardOpen(true)}
        onOpenPasture={(coop) => setPastureCoop(coop ?? 'poultry')}
        onOpenPond={() => setPondOpen(true)}
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

      {zone === 'garden' && activePlot && (
        <GardenPlotModal
          plot={activePlot}
          coins={stats.coins}
          bugSprayCount={farmInventory.supplies.bugSpray}
          onPlant={handlePlantPlot}
          onWater={handleWaterPlot}
          onSprayPest={handleSprayPest}
          onCancelCrop={handleCancelCrop}
          onHarvest={handleHarvestPlot}
          onUpgradePlot={handleUpgradePlot}
          onClose={() => setActivePlotId(null)}
        />
      )}

      {zone === 'garden' && workshopTab && (
        <FarmWorkshopModal
          initialTab={workshopTab}
          inventory={farmInventory}
          onProcessItem={handleProcessItem}
          onCookRecipe={handleCookRecipe}
          onClose={() => setWorkshopTab(null)}
        />
      )}

      {zone === 'garden' && orderBoardOpen && (
        <OrderBoardModal
          coins={stats.coins}
          orders={farmOrders}
          inventory={farmInventory}
          onFulfillOrder={handleFulfillOrder}
          onRefreshOrder={handleRefreshOrder}
          onDirectSell={handleDirectSell}
          onClose={() => setOrderBoardOpen(false)}
        />
      )}

      {zone === 'garden' && pastureCoop && (
        <LivestockModal
          key={pastureCoop}
          initialCoop={pastureCoop}
          coins={stats.coins}
          animals={livestock}
          troughs={troughs}
          inventory={farmInventory}
          onBuyAnimal={handleBuyAnimal}
          onFeedAnimal={handleFeedAnimal}
          onFillTrough={handleFillCoopTrough}
          onCureAnimal={handleCureAnimal}
          onCollectProduce={handleCollectProduce}
          onSellAnimal={handleSellAnimal}
          onBuySupply={handleBuyLivestockSupply}
          onCraftFeedFromCrop={handleCraftFeedFromCrop}
          onClose={() => setPastureCoop(null)}
        />
      )}

      {zone === 'garden' && pondOpen && (
        <PondModal
          coins={stats.coins}
          fishList={pondFish}
          supplies={farmInventory.supplies}
          onStockFish={handleStockFish}
          onFeedFish={handleFeedFish}
          onCureFish={handleCureFish}
          onBoostFish={handleBoostFish}
          onHarvestFish={handleHarvestFish}
          onBuySupply={handleBuyPondSupply}
          onClose={() => setPondOpen(false)}
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
