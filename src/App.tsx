import {useEffect, useState} from 'react';
import {BoutiqueModal} from './components/modals/BoutiqueModal';
import {DailyQuestsModal} from './components/modals/DailyQuestsModal';
import {SettingsModal} from './components/modals/SettingsModal';
import {WardrobeModal} from './components/modals/WardrobeModal';
import {WorldCanvas} from './components/WorldCanvas';
import {DEFAULT_AVATAR, SHOP_ITEMS, STARTER_OWNED_IDS} from './data/avatarCatalog';
import {
  AvatarConfig,
  DailyQuestProgress,
  GameStats,
  GardenPlotState,
  ShopItem,
  TimeOfDay,
  ZoneId,
} from './types/game';
import {soundFX} from './utils/sound';

const STORAGE_KEY = 'thi_tran_may_save_v1';

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

export default function App() {
  const [zone, setZone] = useState<ZoneId>('town');
  const [wardrobeOpen, setWardrobeOpen] = useState(false);
  const [boutiqueOpen, setBoutiqueOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dailyQuestsOpen, setDailyQuestsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('morning');

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

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({avatar, stats, plots, ownedIds, dailyQuests}),
      );
    } catch {
      // ignore storage quota errors
    }
  }, [avatar, stats, plots, ownedIds, dailyQuests]);

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

  const handleClaimQuest = (key: keyof DailyQuestProgress['tasks'], reward: number) => {
    setDailyQuests((prev) => {
      if (!prev.tasks[key] || prev.claimed[key]) return prev;
      return {...prev, claimed: {...prev.claimed, [key]: true}};
    });
    addCoins(reward);
  };

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden bg-[#BFE6F7] select-none">
      <WorldCanvas
        zone={zone}
        avatar={avatar}
        stats={stats}
        timeOfDay={timeOfDay}
        plots={plots}
        onChangeZone={setZone}
        onOpenWardrobe={() => setWardrobeOpen(true)}
        onOpenShop={() => setBoutiqueOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenDailyQuests={() => setDailyQuestsOpen(true)}
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

      {/* Diegetic Fashion Boutique Modal (Triggered inside Cửa Hàng) */}
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
