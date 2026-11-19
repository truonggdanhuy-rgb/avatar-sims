import {useEffect, useRef, useState} from 'react';
import {BoutiqueModal} from './components/modals/BoutiqueModal';
import {DailyQuestsModal} from './components/modals/DailyQuestsModal';
import {FurnitureModal} from './components/modals/FurnitureModal';
import {FurnitureShopModal} from './components/modals/FurnitureShopModal';
import {SettingsModal} from './components/modals/SettingsModal';
import {WardrobeModal} from './components/modals/WardrobeModal';
import {WorldCanvas} from './components/WorldCanvas';
import {DEFAULT_AVATAR, SHOP_ITEMS, STARTER_OWNED_IDS} from './data/avatarCatalog';
import {
  FURNITURE_BY_ID,
  STARTER_FURNITURE_INVENTORY,
  STARTER_PLACED_FURNITURE,
} from './data/furnitureCatalog';
import {
  AvatarConfig,
  DailyQuestProgress,
  FurnitureCatalogItem,
  GameStats,
  GardenPlotState,
  PlacedFurniture,
  ShopItem,
  TimeOfDay,
  ZoneId,
} from './types/game';
import {soundFX} from './utils/sound';

const STORAGE_KEY = 'thi_tran_may_save_v1';
const HOUSE_LAYOUT_VERSION = 3;

const getTodayKey = () => new Date().toISOString().slice(0, 10);

const createEmptyDailyQuests = (): DailyQuestProgress => ({
  date: getTodayKey(),
  tasks: {garden: false, fishing: false, dressup: false},
  claimed: {garden: false, fishing: false, dressup: false},
});

const INITIAL_PLOTS: GardenPlotState[] = [
  {id: 1, stage: 'ready', crop: 'strawberry'},
  {id: 2, stage: 'planted', crop: 'sunflower'},
  {id: 3, stage: 'empty', crop: null},
  {id: 4, stage: 'empty', crop: null},
  {id: 5, stage: 'ready', crop: 'carrot'},
  {id: 6, stage: 'empty', crop: null},
];

function clampDropIntoHouse(rawX: number, rawZ: number): {x: number; z: number} {
  let x = Math.max(-12.4, Math.min(9.4, rawX));
  let z = Math.max(-8.4, Math.min(6.4, rawZ));
  // Avoid dropping floor items inside the built-in L-shaped kitchen counter
  if (x > 6.45 && z > -0.5 && z < 5.2 && (z < 0.95 || x > 8.95)) {
    x = 6.2;
  }
  return {x, z};
}

export default function App() {
  const [zone, setZone] = useState<ZoneId>('town');
  const [wardrobeOpen, setWardrobeOpen] = useState(false);
  const [boutiqueOpen, setBoutiqueOpen] = useState(false);
  const [furnitureShopOpen, setFurnitureShopOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dailyQuestsOpen, setDailyQuestsOpen] = useState(false);
  const [furnitureModalOpen, setFurnitureModalOpen] = useState(false);
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
    return {coins: 120, energy: 85, mood: 90};
  });

  const [plots, setPlots] = useState<GardenPlotState[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.plots)) return parsed.plots;
      }
    } catch {
      // ignore storage errors
    }
    return INITIAL_PLOTS;
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
          parsed.houseVersion === HOUSE_LAYOUT_VERSION &&
          Array.isArray(parsed.placedFurniture)
        ) {
          return parsed.placedFurniture.filter(
            (p: PlacedFurniture) => p && typeof p.catalogId === 'string' && FURNITURE_BY_ID[p.catalogId],
          );
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
          parsed.houseVersion === HOUSE_LAYOUT_VERSION &&
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

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          houseVersion: HOUSE_LAYOUT_VERSION,
          avatar,
          stats,
          plots,
          ownedIds,
          dailyQuests,
          placedFurniture,
          furnitureInventory,
        }),
      );
    } catch {
      // ignore storage quota errors
    }
  }, [avatar, stats, plots, ownedIds, dailyQuests, placedFurniture, furnitureInventory]);

  const handleZoneChange = (next: ZoneId) => {
    setZone(next);
    if (next !== 'home') {
      setFurnitureModalOpen(false);
      setEditFurnitureMode(false);
      setSelectedFurnitureId(null);
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
      mood: Math.min(100, prev.mood + 6),
    }));
  };

  const handleUpdatePlot = (plotId: number, next: GardenPlotState) => {
    setPlots((prev) => prev.map((p) => (p.id === plotId ? next : p)));
    setStats((prev) => ({
      ...prev,
      energy: Math.max(10, prev.energy - 3),
    }));
    markQuestDone('garden');
  };

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
      // Mount cleanly onto a visible wall near the player
      if (homeSpotRef.current.z < -0.5) {
        // Player is in one of the back rooms -> place on back wall
        spawnX = Math.max(-12.0, Math.min(9.2, homeSpotRef.current.x));
        spawnZ = -9.32;
      } else {
        // Player is in Living Room -> place on partition wall facing Living Room
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

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden bg-[#BFE6F7] select-none">
      <WorldCanvas
        zone={zone}
        avatar={avatar}
        stats={stats}
        timeOfDay={timeOfDay}
        plots={plots}
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
        onUpdatePlot={handleUpdatePlot}
        onAddCoins={addCoins}
      />

      {/* Diegetic Wardrobe Mirror Modal (Triggered from Wardrobe inside House) */}
      {wardrobeOpen && (
        <WardrobeModal
          avatar={avatar}
          ownedIds={ownedIds}
          onChange={handleEquipAvatar}
          onClose={() => setWardrobeOpen(false)}
        />
      )}

      {/* House Furniture Cabinet Modal (Tủ nội thất) */}
      {furnitureModalOpen && zone === 'home' && (
        <FurnitureModal
          inventory={furnitureInventory}
          placed={placedFurniture}
          onPlaceItem={handlePlaceFurniture}
          onClose={() => setFurnitureModalOpen(false)}
        />
      )}

      {/* Diegetic Fashion Boutique Modal (Tina inside Cửa Hàng) */}
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

      {/* Bob's Furniture Shop Modal (Bob inside Cửa Hàng) */}
      {furnitureShopOpen && (
        <FurnitureShopModal
          coins={stats.coins}
          inventory={furnitureInventory}
          placed={placedFurniture}
          onBuyItem={handleBuyFurnitureItem}
          onClose={() => setFurnitureShopOpen(false)}
        />
      )}

      {/* Diegetic Daily Quests Modal (Triggered from "Nhiệm vụ ngày" Signboard outside House) */}
      {dailyQuestsOpen && (
        <DailyQuestsModal
          quests={dailyQuests}
          onClaimQuest={handleClaimQuest}
          onClose={() => setDailyQuestsOpen(false)}
        />
      )}

      {/* Diegetic Settings Town Board Modal (Triggered from Clock Kiosk on Town Map) */}
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
