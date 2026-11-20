import React, {useEffect, useState} from 'react';
import {
  ArrowLeft,
  Backpack,
  BookOpen,
  ClipboardList,
  CloudSun,
  Coins,
  Fish,
  Heart,
  Home,
  Moon,
  Settings,
  Shirt,
  Sun,
  Sunset,
  Volume2,
  VolumeX,
  Warehouse,
  X,
  Zap,
} from 'lucide-react';
import {
  AvatarConfig,
  DailyQuestProgress,
  FishDexRecord,
  FishingRodState,
  FishWaterType,
  GameStats,
  RiverFishSpeciesId,
  TimeOfDay,
  ZoneId,
} from '../../types/game';
import {
  RIVER_FISH_LIST,
  WOODEN_ROD_MAX_DURABILITY,
  WOODEN_ROD_PRICE,
  getRodRepairCost,
} from '../../data/fishingCatalog';
import {soundFX} from '../../utils/sound';
import {AvatarPreview3D} from '../AvatarPreview3D';
import {
  FishIllustration,
  MountCarIcon,
  PetCatFaceIcon,
  RodAndNetIcon,
  WoodenRodIcon,
} from '../FishingIcons';

interface PhoneMenuModalProps {
  zone: ZoneId;
  avatar: AvatarConfig;
  stats: GameStats;
  timeOfDay: TimeOfDay;
  soundEnabled: boolean;
  dailyQuests: DailyQuestProgress;
  storageUsed: number;
  storageCapacity: number;
  fishingRod: FishingRodState;
  fishDex: Partial<Record<RiverFishSpeciesId, FishDexRecord>>;
  initialTab?: 'menu' | 'guide' | 'bag' | 'fishdex';
  initialBagSubTab?: 'list' | 'tools' | 'pets' | 'mounts';
  onToggleEquipRod: () => void;
  onOpenWardrobe: () => void;
  onOpenDailyQuests: () => void;
  onOpenSettings: () => void;
  onOpenStorage: () => void;
  onChangeTimeOfDay: (time: TimeOfDay) => void;
  onToggleSound: () => void;
  onClose: () => void;
}

type PhoneTab = 'menu' | 'guide' | 'bag' | 'fishdex';
type BagSubTab = 'list' | 'tools' | 'pets' | 'mounts';

const ZONE_LABELS: Record<ZoneId, string> = {
  town: 'Thị Trấn',
  home: 'Nhà Của Tôi',
  garden: 'Nông Trại',
  boutique: 'Thời Trang',
  arcade: 'Tiệm Game',
  fishing: 'Hồ Câu Cá',
};

function formatDeviceTime(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export const PhoneMenuModal: React.FC<PhoneMenuModalProps> = ({
  zone,
  avatar,
  stats,
  timeOfDay,
  soundEnabled,
  dailyQuests,
  storageUsed,
  storageCapacity,
  fishingRod,
  fishDex,
  initialTab = 'menu',
  initialBagSubTab = 'list',
  onToggleEquipRod,
  onOpenWardrobe,
  onOpenDailyQuests,
  onOpenSettings,
  onOpenStorage,
  onChangeTimeOfDay,
  onToggleSound,
  onClose,
}) => {
  const [tab, setTab] = useState<PhoneTab>(initialTab);
  const [bagSubTab, setBagSubTab] = useState<BagSubTab>(initialBagSubTab);
  const [fishDexWater, setFishDexWater] = useState<FishWaterType>('river');
  const [deviceTime, setDeviceTime] = useState<string>(() => formatDeviceTime());

  useEffect(() => {
    const id = window.setInterval(() => {
      setDeviceTime(formatDeviceTime());
    }, 10000);
    return () => window.clearInterval(id);
  }, []);

  const readyQuestCount = (['garden', 'fishing', 'dressup'] as const).filter(
    (k) => dailyQuests.tasks[k] && !dailyQuests.claimed[k],
  ).length;
  const doneQuestCount = (['garden', 'fishing', 'dressup'] as const).filter(
    (k) => dailyQuests.claimed[k],
  ).length;

  const TimeIcon =
    timeOfDay === 'morning' ? Sun : timeOfDay === 'sunset' ? Sunset : Moon;
  const nextTime: TimeOfDay =
    timeOfDay === 'morning' ? 'sunset' : timeOfDay === 'sunset' ? 'night' : 'morning';

  // Placeholder temperature (future weather system hook)
  const displayTemp = timeOfDay === 'night' ? '22°C' : timeOfDay === 'sunset' ? '25°C' : '27°C';

  return (
    <div
      className="phone-ui fixed inset-0 z-50 overflow-auto bg-stone-950/65 p-3 sm:p-4"
      onClick={onClose}
    >
      <div className="flex min-h-full min-w-full items-center justify-center">
        <div
          className="anim-pop flex h-[600px] w-[348px] shrink-0 flex-col overflow-hidden rounded-[36px] border-[5px] border-[#4A3628] bg-[#FAF3E8] shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
        {/* Top Phone Hardware Status Bar (Temp · Device Clock · Static Battery · Close) */}
        <div className="shrink-0 border-b border-[#E5D5BE] bg-[#F2E5D2] px-4 pt-2 pb-2.5">
          <div className="mb-2 flex items-center justify-between text-[11px] font-bold text-[#4A3525]">
            <div className="flex items-center gap-2 tabular-nums">
              <span>{deviceTime}</span>
              <span aria-hidden="true" className="text-[#A88F73]">·</span>
              <span className="flex items-center gap-1 text-[#7B5939]">
                <CloudSun className="h-3.5 w-3.5 text-[#D18332]" />
                <span>{displayTemp}</span>
              </span>
            </div>

            <div className="h-2 w-12 rounded-full bg-[#3A2B20]" />

            <div className="flex items-center gap-2">
              {/* Static Battery Icon */}
              <div
                aria-label="Pin thiết bị"
                className="flex items-center gap-[1.5px]"
              >
                <div className="flex h-3.5 w-6 items-center rounded-[3px] border-[1.5px] border-[#4A3525] p-[1.5px]">
                  <div className="h-full w-4/5 rounded-[1px] bg-[#559A6E]" />
                </div>
                <div className="h-1.5 w-[2px] rounded-r-[1px] bg-[#4A3525]" />
              </div>

              <button
                type="button"
                onClick={() => {
                  soundFX.tap();
                  onClose();
                }}
                aria-label="Đóng điện thoại"
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E3CEB2] text-[#4A3525] transition-transform active:scale-95"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* 1-Row Character Profile & Status Strip */}
          <div className="flex items-center gap-2.5 rounded-2xl border border-[#DFCBB0] bg-white px-2.5 py-2 shadow-xs">
            <div className="h-14 w-12 shrink-0 overflow-hidden rounded-xl border border-[#E5D4BB] bg-[#EFE3D0]">
              <AvatarPreview3D
                avatar={avatar}
                showInspectorControls={false}
                portraitFraming
                className="pointer-events-none h-full w-full"
              />
            </div>

            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[13px] font-extrabold text-[#4A3525]">
                  {avatar.name}
                </span>
                <span className="flex shrink-0 items-center gap-1 text-[11px] font-bold tabular-nums text-[#8F5928]">
                  <Coins className="h-3.5 w-3.5 text-amber-500" />
                  {stats.coins} Xu
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="mb-0.5 flex items-center justify-between text-[10px] font-bold text-[#5B422E]">
                    <span className="flex items-center gap-0.5">
                      <Zap className="h-3 w-3 text-[#E59A32]" />
                      <span>Năng lượng</span>
                    </span>
                    <span className="tabular-nums">{stats.energy}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#EFE4D3]">
                    <div
                      className="h-full rounded-full bg-[#6BA383] transition-all"
                      style={{width: `${Math.max(0, Math.min(100, stats.energy))}%`}}
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-0.5 flex items-center justify-between text-[10px] font-bold text-[#5B422E]">
                    <span className="flex items-center gap-0.5">
                      <Heart className="h-3 w-3 text-[#E0647A]" />
                      <span>Vui vẻ</span>
                    </span>
                    <span className="tabular-nums">{stats.mood}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#EFE4D3]">
                    <div
                      className="h-full rounded-full bg-[#E88394] transition-all"
                      style={{width: `${Math.max(0, Math.min(100, stats.mood))}%`}}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Phone Screen Body */}
        <div className="custom-scroll min-h-0 flex-1 overflow-y-auto p-3.5 text-[#4A3525]">
          {tab === 'menu' && (
            <div className="space-y-4">
              {/* Main Smartphone App Launcher Icons */}
              <div className="grid grid-cols-3 gap-x-2.5 gap-y-3.5 pt-1">
                {/* 1. Tủ Đồ (Shirt Icon) */}
                <button
                  type="button"
                  onClick={() => {
                    soundFX.tap();
                    onClose();
                    onOpenWardrobe();
                  }}
                  className="group flex flex-col items-center gap-1.5 transition-transform active:scale-95"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-[18px] border border-[#F0C6D3] bg-gradient-to-br from-[#FDEBF1] to-[#F7CAD9] text-[#B43F67] shadow-sm transition-transform group-hover:-translate-y-0.5">
                    <Shirt className="h-7 w-7" strokeWidth={2.1} />
                  </div>
                  <span className="text-[11px] font-bold leading-tight text-[#4A3525]">
                    Tủ Đồ
                  </span>
                </button>

                {/* 2. Túi Đồ (Cần & Vợt · Pets · Cưỡi) */}
                <button
                  type="button"
                  onClick={() => {
                    soundFX.tap();
                    setBagSubTab('list');
                    setTab('bag');
                  }}
                  className="group relative flex flex-col items-center gap-1.5 transition-transform active:scale-95"
                >
                  {fishingRod.equipped && (
                    <span className="absolute -top-1 right-2 z-10 rounded-md bg-[#45A168] px-1.5 py-0.5 text-[9px] font-extrabold text-white shadow-xs">
                      Đang cầm
                    </span>
                  )}
                  <div className="flex h-14 w-14 items-center justify-center rounded-[18px] border border-[#E5C9A8] bg-gradient-to-br from-[#FFF4E3] to-[#F2D8B6] text-[#9A5B25] shadow-sm transition-transform group-hover:-translate-y-0.5">
                    <Backpack className="h-7 w-7" strokeWidth={2.1} />
                  </div>
                  <span className="text-[11px] font-bold leading-tight text-[#4A3525]">
                    Túi Đồ
                  </span>
                </button>

                {/* 3. Sổ Cá */}
                <button
                  type="button"
                  onClick={() => {
                    soundFX.tap();
                    setTab('fishdex');
                  }}
                  className="group relative flex flex-col items-center gap-1.5 transition-transform active:scale-95"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-[18px] border border-[#BFE0F5] bg-gradient-to-br from-[#EAF6FE] to-[#C8E8FC] text-[#286B94] shadow-sm transition-transform group-hover:-translate-y-0.5">
                    <Fish className="h-7 w-7" strokeWidth={2.1} />
                  </div>
                  <span className="text-[11px] font-bold leading-tight text-[#4A3525]">
                    Sổ Cá
                  </span>
                </button>

                {/* 4. Nhiệm Vụ Ngày */}
                <button
                  type="button"
                  onClick={() => {
                    soundFX.tap();
                    onClose();
                    onOpenDailyQuests();
                  }}
                  className="group relative flex flex-col items-center gap-1.5 transition-transform active:scale-95"
                >
                  {readyQuestCount > 0 && (
                    <span className="absolute -top-1 right-2.5 z-10 rounded-md bg-[#D95B48] px-1.5 py-0.5 text-[9px] font-extrabold text-white shadow-xs">
                      {readyQuestCount}
                    </span>
                  )}
                  <div className="flex h-14 w-14 items-center justify-center rounded-[18px] border border-[#F0D59C] bg-gradient-to-br from-[#FFF7DF] to-[#FCE4AA] text-[#A86A14] shadow-sm transition-transform group-hover:-translate-y-0.5">
                    <ClipboardList className="h-7 w-7" strokeWidth={2.1} />
                  </div>
                  <span className="text-[11px] font-bold leading-tight text-[#4A3525]">
                    Nhiệm Vụ ({doneQuestCount}/3)
                  </span>
                </button>

                {/* 5. Nhà Kho Nông Trại */}
                <button
                  type="button"
                  onClick={() => {
                    soundFX.tap();
                    onClose();
                    onOpenStorage();
                  }}
                  className="group flex flex-col items-center gap-1.5 transition-transform active:scale-95"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-[18px] border border-[#C8DEC7] bg-gradient-to-br from-[#EFF8EC] to-[#D1EAD0] text-[#3F7B4E] shadow-sm transition-transform group-hover:-translate-y-0.5">
                    <Warehouse className="h-7 w-7" strokeWidth={2.1} />
                  </div>
                  <span className="text-[11px] font-bold leading-tight text-[#4A3525]">
                    Nhà Kho ({storageUsed}/{storageCapacity})
                  </span>
                </button>

                {/* 6. Cài Đặt (Mở Trạm Bưu Điện) */}
                <button
                  type="button"
                  onClick={() => {
                    soundFX.tap();
                    onClose();
                    onOpenSettings();
                  }}
                  className="group flex flex-col items-center gap-1.5 transition-transform active:scale-95"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-[18px] border border-[#CFD8E3] bg-gradient-to-br from-[#F1F5F9] to-[#DCE4EE] text-[#465C74] shadow-sm transition-transform group-hover:-translate-y-0.5">
                    <Settings className="h-7 w-7" strokeWidth={2.1} />
                  </div>
                  <span className="text-[11px] font-bold leading-tight text-[#4A3525]">
                    Cài Đặt
                  </span>
                </button>
              </div>

              {/* Compact Secondary Shortcuts */}
              <div className="border-t border-[#E6D6C1] pt-3">
                <div className="mb-2 flex items-center justify-between text-[11px] font-bold text-[#7A6048]">
                  <span>Tiện Ích Nhanh</span>
                  <span>Khu vực: {ZONE_LABELS[zone]}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.tap();
                      onChangeTimeOfDay(nextTime);
                    }}
                    className="flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-[#E0CEB6] bg-white px-2 py-1.5 text-[11px] font-bold text-[#4A3525] transition-transform active:scale-95"
                  >
                    <TimeIcon className="h-3.5 w-3.5 text-[#B9771E]" />
                    <span>Đổi Buổi</span>
                  </button>

                  <button
                    type="button"
                    onClick={onToggleSound}
                    className="flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-[#E0CEB6] bg-white px-2 py-1.5 text-[11px] font-bold text-[#4A3525] transition-transform active:scale-95"
                  >
                    {soundEnabled ? (
                      <Volume2 className="h-3.5 w-3.5 text-[#4B8A66]" />
                    ) : (
                      <VolumeX className="h-3.5 w-3.5 text-[#8A7562]" />
                    )}
                    <span>{soundEnabled ? 'Âm Bật' : 'Âm Tắt'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab === 'bag' && (
            <div className="flex h-full flex-col space-y-3">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    soundFX.tap();
                    if (bagSubTab !== 'list') {
                      setBagSubTab('list');
                    } else {
                      setTab('menu');
                    }
                  }}
                  className="flex min-h-[36px] items-center gap-1 rounded-xl bg-[#EFE0C9] px-2.5 py-1 text-xs font-bold text-[#5B422E] active:scale-95"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>{bagSubTab === 'list' ? 'Quay lại' : 'Túi Đồ'}</span>
                </button>
                <span className="text-xs font-extrabold text-[#4A3525]">
                  {bagSubTab === 'list'
                    ? 'Túi Đồ'
                    : bagSubTab === 'tools'
                      ? 'Cần & Vợt'
                      : bagSubTab === 'pets'
                        ? 'Pets'
                        : 'Cưỡi'}
                </span>
                <span className="w-16" />
              </div>

              {bagSubTab === 'list' && (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-[#E5D4BA] bg-white p-3.5">
                    <div className="mb-3 text-[11px] font-bold text-[#7B6247]">
                      Chọn mục trong túi đồ:
                    </div>
                    <div className="grid grid-cols-3 gap-2.5">
                      {/* Icon 1: Combined Fishing Rod + Bug Net icon */}
                      <button
                        type="button"
                        onClick={() => {
                          soundFX.tap();
                          setBagSubTab('tools');
                        }}
                        className="group relative flex flex-col items-center gap-1.5 rounded-2xl border-2 border-[#E8D7BC] bg-[#FFF8EB] p-2.5 transition hover:border-[#3C95AD] active:scale-95"
                      >
                        {fishingRod.equipped && (
                          <span className="absolute -top-1.5 right-1 rounded-full bg-[#45A168] px-1.5 py-0.5 text-[9px] font-black text-white shadow-xs">
                            Đang cầm
                          </span>
                        )}
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-xs">
                          <RodAndNetIcon className="h-11 w-11" />
                        </div>
                        <span className="text-[11px] font-extrabold text-[#4A3525]">
                          Cần &amp; Vợt
                        </span>
                      </button>

                      {/* Icon 2: Pets (Cat Face Icon) */}
                      <button
                        type="button"
                        onClick={() => {
                          soundFX.tap();
                          setBagSubTab('pets');
                        }}
                        className="group relative flex flex-col items-center gap-1.5 rounded-2xl border-2 border-[#E8D7BC] bg-[#FFF8EB] p-2.5 transition hover:border-[#E08A58] active:scale-95"
                      >
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-xs">
                          <PetCatFaceIcon className="h-10 w-10" />
                        </div>
                        <span className="text-[11px] font-extrabold text-[#4A3525]">
                          Pets
                        </span>
                      </button>

                      {/* Icon 3: Cưỡi (Vehicle / Car Icon) */}
                      <button
                        type="button"
                        onClick={() => {
                          soundFX.tap();
                          setBagSubTab('mounts');
                        }}
                        className="group relative flex flex-col items-center gap-1.5 rounded-2xl border-2 border-[#E8D7BC] bg-[#FFF8EB] p-2.5 transition hover:border-[#4F8FB5] active:scale-95"
                      >
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-xs">
                          <MountCarIcon className="h-10 w-10" />
                        </div>
                        <span className="text-[11px] font-extrabold text-[#4A3525]">
                          Cưỡi
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {bagSubTab === 'tools' && (
                <div className="space-y-2.5">
                  {/* Wooden Rod Item */}
                  <div className="rounded-2xl border-2 border-[#E3D1B2] bg-white p-3.5 space-y-2.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#C7E4EE] bg-[#EAF6FA]">
                        <WoodenRodIcon className="h-10 w-10" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-black text-[#3B2A1A]">
                            Cần Câu Gỗ
                          </span>
                          {fishingRod.owned ? (
                            <span
                              className={`text-[11px] font-black ${
                                fishingRod.durability <= 0
                                  ? 'text-[#D64545]'
                                  : 'text-[#3C8863]'
                              }`}
                            >
                              Độ bền {fishingRod.durability}/{fishingRod.maxDurability}
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold text-[#9C7D5A]">
                              Chưa có
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-semibold text-[#7A6048]">
                          {fishingRod.owned
                            ? `Bấm để trang bị. Độ bền tối đa ${WOODEN_ROD_MAX_DURABILITY} lần câu.`
                            : `Mua tại Sạp Câu Cá của anh Koi gần Hồ Câu (${WOODEN_ROD_PRICE} Xu).`}
                        </p>
                      </div>
                    </div>

                    {fishingRod.owned && (
                      <>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-[#EFE4D1]">
                          <div
                            className={`h-full rounded-full transition-all ${
                              fishingRod.durability <= 0
                                ? 'bg-[#E15252]'
                                : fishingRod.durability <= 7
                                  ? 'bg-[#E89B35]'
                                  : 'bg-[#48A878]'
                            }`}
                            style={{
                              width: `${Math.round(
                                (fishingRod.durability /
                                  Math.max(1, fishingRod.maxDurability)) *
                                  100,
                              )}%`,
                            }}
                          />
                        </div>

                        {fishingRod.durability <= 0 && (
                          <div className="rounded-xl border border-[#F3C1C1] bg-[#FDECEC] px-2.5 py-2 text-[11px] font-bold text-[#B63535]">
                            Cần câu đang hỏng! Hãy thả cần bên bờ hồ để sửa nhanh với giá{' '}
                            <span className="font-black">
                              {getRodRepairCost(
                                fishingRod.durability,
                                fishingRod.maxDurability,
                              )}{' '}
                              Xu
                            </span>
                            .
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            soundFX.tap();
                            onToggleEquipRod();
                          }}
                          className={`w-full rounded-xl py-2.5 text-xs font-black transition active:scale-98 ${
                            fishingRod.equipped
                              ? 'bg-[#D67C3A] text-white hover:bg-[#BE692B]'
                              : 'bg-[#3C95AD] text-white hover:bg-[#2F7D93]'
                          }`}
                        >
                          {fishingRod.equipped
                            ? 'Cất Cần Câu (Tháo trang bị)'
                            : 'Trang Bị Cần Câu'}
                        </button>

                        <div className="text-center text-[10px] font-semibold text-[#8A7257]">
                          Lưu ý: Khi cầm cần câu/vợt, món đồ cầm tay thời trang sẽ tự cất vào Tủ Đồ.
                        </div>
                      </>
                    )}
                  </div>

                  {/* Future Bug Net Slot */}
                  <div className="flex items-center gap-3 rounded-2xl border border-dashed border-[#D7C6AA] bg-[#FBF4E7] p-3 opacity-80">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EAF6EE]">
                      <RodAndNetIcon className="h-8 w-8" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-[#4A3525]">
                          Vợt Bắt Côn Trùng
                        </span>
                        <span className="rounded-full bg-[#DCEFE3] px-1.5 py-0.5 text-[9px] font-extrabold text-[#3B7C59]">
                          Sắp ra mắt
                        </span>
                      </div>
                      <p className="text-[11px] font-semibold text-[#7A6048]">
                        Sau này vợt bắt côn trùng cũng sẽ nằm trong mục Cần &amp; Vợt này.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {bagSubTab === 'pets' && (
                <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#E8CBB0] bg-[#FFF8F0] p-5 text-center">
                  <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-xs border border-[#F0D9C2]">
                    <PetCatFaceIcon className="h-12 w-12" />
                  </div>
                  <div className="text-sm font-black text-[#5C3D24]">
                    Thú Cưng Đồng Hành (Pets)
                  </div>
                  <span className="mt-1 rounded-full bg-[#FCE7D2] px-2.5 py-0.5 text-[10px] font-extrabold text-[#A85F24]">
                    Sắp ra mắt
                  </span>
                  <p className="mt-2 text-xs font-semibold leading-relaxed text-[#7D6147]">
                    Bạn sẽ sớm có thể nuôi và dẫn các bé thú cưng đáng yêu đi dạo khắp thị trấn!
                  </p>
                </div>
              )}

              {bagSubTab === 'mounts' && (
                <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#BBD6EA] bg-[#F2F8FC] p-5 text-center">
                  <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-xs border border-[#CCE2F2]">
                    <MountCarIcon className="h-12 w-12" />
                  </div>
                  <div className="text-sm font-black text-[#2C5370]">
                    Phương Tiện Cưỡi &amp; Xe
                  </div>
                  <span className="mt-1 rounded-full bg-[#DCEEFB] px-2.5 py-0.5 text-[10px] font-extrabold text-[#2B6894]">
                    Sắp ra mắt
                  </span>
                  <p className="mt-2 text-xs font-semibold leading-relaxed text-[#577994]">
                    Các loại xe đạp, xe hơi mini và thú cưỡi sẽ được mở bán ở bản cập nhật sắp tới!
                  </p>
                </div>
              )}
            </div>
          )}

          {tab === 'fishdex' && (() => {
            const discoveredCount = RIVER_FISH_LIST.filter(
              (s) => (fishDex[s.id]?.caughtCount ?? 0) > 0,
            ).length;
            const totalSpecies = RIVER_FISH_LIST.length;
            const pct = Math.round((discoveredCount / Math.max(1, totalSpecies)) * 100);

            return (
              <div className="flex h-full flex-col space-y-2.5">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.tap();
                      setTab('menu');
                    }}
                    className="flex min-h-[34px] items-center gap-1 rounded-xl bg-[#EFE0C9] px-2.5 py-1 text-xs font-bold text-[#5B422E] active:scale-95"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Quay lại</span>
                  </button>
                  <span className="text-xs font-extrabold text-[#4A3525]">Sổ Cá</span>
                  <span className="w-16" />
                </div>

                {/* Compact Collection Progress Card */}
                <div className="rounded-2xl border border-[#CCE2EC] bg-white px-3 py-2.5 shadow-xs">
                  <div className="flex items-center justify-between text-[11px] font-extrabold text-[#2A5970]">
                    <span>Bộ Sưu Tập Cá</span>
                    <span className="tabular-nums text-[#3C95AD]">
                      {discoveredCount}/{totalSpecies} loài ({pct}%)
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[#E6F2F7]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#45A8C4] to-[#5CC8A1] transition-all"
                      style={{width: `${pct}%`}}
                    />
                  </div>

                  {/* River vs Sea Clean Switcher */}
                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        soundFX.tap();
                        setFishDexWater('river');
                      }}
                      className={`rounded-xl py-1 text-[11px] font-extrabold transition ${
                        fishDexWater === 'river'
                          ? 'bg-[#3C95AD] text-white shadow-xs'
                          : 'bg-[#F3ECE0] text-[#6A5138]'
                      }`}
                    >
                      Cá Sông ({discoveredCount}/{totalSpecies})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        soundFX.tap();
                        setFishDexWater('sea');
                      }}
                      className={`rounded-xl py-1 text-[11px] font-extrabold transition ${
                        fishDexWater === 'sea'
                          ? 'bg-[#466C9C] text-white shadow-xs'
                          : 'bg-[#F3ECE0] text-[#6A5138]'
                      }`}
                    >
                      Cá Biển (Sắp có)
                    </button>
                  </div>
                </div>

                {fishDexWater === 'sea' ? (
                  <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#A8CBE0] bg-[#EDF5FA] p-5 text-center">
                    <div className="text-sm font-black text-[#2E5573]">
                      Bộ Sưu Tập Cá Biển · Sắp Ra Mắt
                    </div>
                    <p className="mt-1.5 text-xs font-semibold leading-relaxed text-[#567996]">
                      Các loài cá biển sẽ được mở rộng trong bản cập nhật tới. Hiện tại hãy sưu tầm đủ 8 loài Cá Sông nhé!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 pb-1">
                    {RIVER_FISH_LIST.map((species) => {
                      const dex = fishDex[species.id];
                      const totalCaught = dex?.caughtCount ?? 0;
                      const maxWeight = dex?.maxWeightKg ?? 0;
                      const isRare = species.rarity === 'rare';
                      const discovered = totalCaught > 0;

                      return (
                        <div
                          key={species.id}
                          className={`flex flex-col justify-between rounded-2xl border p-2.5 transition ${
                            discovered
                              ? isRare
                                ? 'border-[#D7B8F2] bg-[#FCF7FF]'
                                : 'border-[#CFE3EC] bg-white'
                              : 'border-[#E6DAC5] bg-[#F5EDE0]/80 opacity-80'
                          }`}
                        >
                          {/* Top Badge */}
                          <div className="flex items-center justify-between gap-1">
                            <span
                              className={`rounded-md px-1.5 py-0.5 text-[9px] font-black ${
                                isRare
                                  ? 'bg-[#8E44AD] text-white'
                                  : 'bg-[#DFF2E7] text-[#2F6F49]'
                              }`}
                            >
                              {isRare ? 'Hiếm' : 'Thường'}
                            </span>
                          </div>

                          {/* Centered Fish Illustration */}
                          <div
                            className={`my-2 mx-auto flex h-12 w-full items-center justify-center rounded-xl ${
                              discovered
                                ? isRare
                                  ? 'bg-[#F3E4FF]/70'
                                  : 'bg-[#EAF6FA]'
                                : 'bg-[#EAE0CE]/60 grayscale opacity-60'
                            }`}
                          >
                            <FishIllustration
                              speciesId={species.id}
                              className="h-10 w-10"
                            />
                          </div>

                          {/* Name & Record */}
                          <div>
                            <div className="truncate text-[11px] font-black text-[#3B2A1A]">
                              {species.name}
                            </div>
                            <div className="mt-0.5 truncate text-[10px] font-bold text-[#7A6048] tabular-nums">
                              {discovered
                                ? `Kỷ lục ${maxWeight.toFixed(2)}kg · ${totalCaught} con`
                                : `${species.minKg}–${species.maxKg} kg`}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {tab === 'guide' && (
            <div className="divide-y divide-[#EFE2CF] rounded-2xl border border-[#E0CEB6] bg-white">
              <div className="px-3.5 py-2.5">
                <div className="text-xs font-bold text-[#4A3525]">Nông Trại & Bếp</div>
                <div className="mt-0.5 text-[11px] leading-relaxed text-[#7A6048]">
                  Chạm ô đất để gieo hạt, tưới nước từ giếng và thu hoạch nông sản. Chế biến tại Máy Ép & Xay hoặc Bếp Nông Trại rồi giao ở Bảng Đơn Hàng.
                </div>
              </div>
              <div className="px-3.5 py-2.5">
                <div className="text-xs font-bold text-[#4A3525]">Nhà Của Tôi</div>
                <div className="mt-0.5 text-[11px] leading-relaxed text-[#7A6048]">
                  Mở mũi tên góc trên bên phải bên trong nhà để đặt nội thất, sơn tường/sàn hoặc xếp đồ trang trí lên mặt bàn, tủ, giường.
                </div>
              </div>
              <div className="px-3.5 py-2.5">
                <div className="text-xs font-bold text-[#4A3525]">Dạo Phố, Đồi Ngắm Cảnh & Trà Anh Đào</div>
                <div className="mt-0.5 text-[11px] leading-relaxed text-[#7A6048]">
                  Chạm lối đi đá để tự dạo khắp thị trấn rộng lớn, leo lên đồi anh đào cao phía bắc ngắm toàn cảnh, thưởng trà bánh hoặc ghé Hồ Câu Cá & Trạm Bưu Điện.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Phone Dock Navigation (2 Tabs: Ứng Dụng & Hướng Dẫn) */}
        <div className="shrink-0 border-t border-[#E5D5BE] bg-[#F2E5D2] px-3 py-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                soundFX.tap();
                setTab('menu');
              }}
              className={`flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition-colors ${
                tab === 'menu' || tab === 'bag' || tab === 'fishdex'
                  ? 'bg-[#6F4E37] text-amber-50 shadow-xs'
                  : 'bg-[#E9D9C3] text-[#5B422E]'
              }`}
            >
              <Home className="h-3.5 w-3.5" />
              <span>Ứng Dụng</span>
            </button>
            <button
              type="button"
              onClick={() => {
                soundFX.tap();
                setTab('guide');
              }}
              className={`flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition-colors ${
                tab === 'guide'
                  ? 'bg-[#6F4E37] text-amber-50 shadow-xs'
                  : 'bg-[#E9D9C3] text-[#5B422E]'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Hướng Dẫn</span>
            </button>
          </div>
          <div className="mx-auto mt-2 h-1 w-20 rounded-full bg-[#B99C7B]" />
        </div>
        </div>
      </div>
    </div>
  );
};
