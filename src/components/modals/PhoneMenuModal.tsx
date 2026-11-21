import React, {useEffect, useState} from 'react';
import {
  ArrowLeft,
  BookOpen,
  ClipboardList,
  CloudSun,
  Coins,
  Database,
  Gift,
  Heart,
  Home,
  Moon,
  Send,
  Settings,
  Shirt,
  Sun,
  UserCircle2,
  Utensils,
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
  FishWaterType,
  GameStats,
  InsectDexRecord,
  InsectSpeciesId,
  RiverFishSpeciesId,
  TimeOfDay,
  ZoneId,
} from '../../types/game';
import {RIVER_FISH_LIST} from '../../data/fishingCatalog';
import {INSECT_HABITAT_LABELS, INSECT_LIST} from '../../data/insectCatalog';
import {HUNGER_HUNGRY_THRESHOLD} from '../../data/foodCatalog';
import {soundFX} from '../../utils/sound';
import {AvatarPreview3D} from '../AvatarPreview3D';
import {FishIllustration} from '../FishingIcons';
import {CreatureBookIcon, InsectIllustration} from '../InsectIcons';

interface PhoneMenuModalProps {
  zone: ZoneId;
  avatar: AvatarConfig;
  stats: GameStats;
  timeOfDay: TimeOfDay;
  soundEnabled: boolean;
  dailyQuests: DailyQuestProgress;
  storageUsed: number;
  storageCapacity: number;
  fishDex: Partial<Record<RiverFishSpeciesId, FishDexRecord>>;
  insectDex: Partial<Record<InsectSpeciesId, InsectDexRecord>>;
  accountCreatedAt: number;
  accountId: string;
  teleportCooldownSec: number;
  initialTab?: 'menu' | 'account' | 'guide' | 'fishdex';
  onTeleportToPlaza: () => void;
  onOpenWardrobe: () => void;
  onOpenDailyQuests: () => void;
  onOpenSettings: () => void;
  onOpenStorage: () => void;
  onChangeTimeOfDay: (time: TimeOfDay) => void;
  onToggleSound: () => void;
  onRedeemGiftCode: (code: string) => {ok: boolean; message: string};
  onClose: () => void;
}

type PhoneTab = 'menu' | 'account' | 'guide' | 'fishdex';

const ZONE_LABELS: Record<ZoneId, string> = {
  town: 'Thị Trấn',
  home: 'Nhà Của Tôi',
  garden: 'Nông Trại',
  boutique: 'Thời Trang',
  arcade: 'Tiệm Game',
  fishing: 'Hồ Câu Cá',
  petshop: 'Cửa Hàng Pets',
  mall: 'May Mall',
};

function formatDeviceTime(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function formatJoinDate(ts: number): string {
  const d = new Date(ts || Date.now());
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
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
  fishDex,
  insectDex,
  accountCreatedAt,
  accountId,
  teleportCooldownSec,
  initialTab = 'menu',
  onTeleportToPlaza,
  onOpenWardrobe,
  onOpenDailyQuests,
  onOpenSettings,
  onOpenStorage,
  onChangeTimeOfDay,
  onToggleSound,
  onRedeemGiftCode,
  onClose,
}) => {
  const [tab, setTab] = useState<PhoneTab>(initialTab);
  const [dexCategory, setDexCategory] = useState<'fish' | 'insects'>('fish');
  const [fishDexWater, setFishDexWater] = useState<FishWaterType>('river');
  const [deviceTime, setDeviceTime] = useState<string>(() => formatDeviceTime());
  const [giftCodeInput, setGiftCodeInput] = useState('');
  const [giftCodeMessage, setGiftCodeMessage] = useState<{ok: boolean; text: string} | null>(null);

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

  const TimeIcon = timeOfDay === 'morning' ? Sun : Moon;
  const nextTime: TimeOfDay = timeOfDay === 'morning' ? 'night' : 'morning';

  // Placeholder temperature (future weather system hook)
  const displayTemp = timeOfDay === 'night' ? '22°C' : '27°C';

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

              <div className="grid grid-cols-3 gap-1.5">
                <div>
                  <div className="mb-0.5 flex items-center justify-between text-[9px] font-bold text-[#5B422E]">
                    <span className="flex items-center gap-0.5">
                      <Zap className="h-2.5 w-2.5 text-[#E59A32]" />
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
                  <div className="mb-0.5 flex items-center justify-between text-[9px] font-bold text-[#5B422E]">
                    <span className="flex items-center gap-0.5">
                      <Heart className="h-2.5 w-2.5 text-[#E0647A]" />
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

                <div>
                  <div className="mb-0.5 flex items-center justify-between text-[9px] font-bold text-[#5B422E]">
                    <span className="flex items-center gap-0.5">
                      <Utensils className="h-2.5 w-2.5 text-[#D97724]" />
                      <span>Độ no</span>
                    </span>
                    <span
                      className={`tabular-nums ${
                        (stats.hunger ?? 100) < HUNGER_HUNGRY_THRESHOLD ? 'font-black text-[#C4422B]' : ''
                      }`}
                    >
                      {Math.round(Math.max(0, Math.min(100, stats.hunger ?? 100)))}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#EFE4D3]">
                    <div
                      className={`h-full rounded-full transition-all ${
                        (stats.hunger ?? 100) < HUNGER_HUNGRY_THRESHOLD
                          ? 'bg-[#D94F4F]'
                          : (stats.hunger ?? 100) <= 15
                            ? 'bg-[#E87A35]'
                            : 'bg-[#F0A44B]'
                      }`}
                      style={{width: `${Math.max(0, Math.min(100, stats.hunger ?? 100))}%`}}
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
                {/* 1. Tài khoản */}
                <button
                  type="button"
                  onClick={() => {
                    soundFX.tap();
                    setGiftCodeMessage(null);
                    setTab('account');
                  }}
                  className="group flex flex-col items-center gap-1.5 transition-transform active:scale-95"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-[18px] border border-[#C6DAFA] bg-gradient-to-br from-[#EEF5FF] to-[#CFE2FE] text-[#2F5B9E] shadow-sm transition-transform group-hover:-translate-y-0.5">
                    <UserCircle2 className="h-7 w-7" strokeWidth={2.1} />
                  </div>
                  <span className="text-[11px] font-bold leading-tight text-[#4A3525]">
                    Tài khoản
                  </span>
                </button>

                {/* 2. Tủ Đồ (Shirt Icon) */}
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

                {/* 4. Sổ Sinh Vật (Cá & Côn Trùng) */}
                <button
                  type="button"
                  onClick={() => {
                    soundFX.tap();
                    setTab('fishdex');
                  }}
                  className="group relative flex flex-col items-center gap-1.5 transition-transform active:scale-95"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-[18px] border border-[#BFE0F5] bg-gradient-to-br from-[#EAF6FE] to-[#C8E8FC] text-[#286B94] shadow-sm transition-transform group-hover:-translate-y-0.5">
                    <CreatureBookIcon className="h-9 w-9" />
                  </div>
                  <span className="text-[11px] font-bold leading-tight text-[#4A3525]">
                    Sổ Sinh Vật
                  </span>
                </button>

                {/* 5. Nhiệm Vụ Ngày */}
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

                {/* 6. Nhà Kho Nông Trại */}
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

                {/* 7. Di chuyển về Quảng Trường (Paper Plane Icon + anti-spam cooldown) */}
                <button
                  type="button"
                  disabled={teleportCooldownSec > 0}
                  onClick={() => {
                    if (teleportCooldownSec > 0) return;
                    soundFX.enterDoor();
                    onTeleportToPlaza();
                    onClose();
                  }}
                  className="group relative flex flex-col items-center gap-1.5 transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-65"
                >
                  {teleportCooldownSec > 0 && (
                    <span className="absolute -top-1 right-2 z-10 rounded-md bg-[#7A6048] px-1.5 py-0.5 text-[9px] font-extrabold tabular-nums text-white shadow-xs">
                      {teleportCooldownSec}s
                    </span>
                  )}
                  <div className="flex h-14 w-14 items-center justify-center rounded-[18px] border border-[#BAE3DA] bg-gradient-to-br from-[#EBFAF6] to-[#C2EDE2] text-[#227664] shadow-sm transition-transform group-hover:-translate-y-0.5">
                    <Send className="h-7 w-7 -translate-x-0.5 translate-y-0.5" strokeWidth={2.1} />
                  </div>
                  <span className="text-[11px] font-bold leading-tight text-[#4A3525]">
                    {teleportCooldownSec > 0 ? `Chờ ${teleportCooldownSec}s` : 'Di chuyển'}
                  </span>
                </button>

                {/* 8. Cài Đặt (Mở Trạm Bưu Điện) */}
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
                    <span>{timeOfDay === 'morning' ? 'Sáng -> Tối' : 'Tối -> Sáng'}</span>
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

          {tab === 'account' && (
            <div className="space-y-3">
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
                <span className="text-xs font-extrabold text-[#4A3525]">Tài khoản</span>
                <span className="w-16" />
              </div>

              <div className="rounded-2xl border border-[#DFCBB0] bg-white p-3.5 shadow-xs space-y-2.5">
                <div className="flex items-center gap-3">
                  <div className="h-14 w-12 shrink-0 overflow-hidden rounded-xl border border-[#E5D4BB] bg-[#EFE3D0]">
                    <AvatarPreview3D
                      avatar={avatar}
                      showInspectorControls={false}
                      portraitFraming
                      className="pointer-events-none h-full w-full"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-black text-[#3B2A1A]">
                      {avatar.name}
                    </div>
                    <div className="mt-0.5 text-[11px] font-bold text-[#7A6048] tabular-nums">
                      ID: <span className="font-mono text-[#4A3525]">{accountId}</span>
                    </div>
                    <div className="mt-0.5 text-[10px] font-bold text-[#7A6048] tabular-nums">
                      Ngày đến Thị trấn Mây:{' '}
                      <span className="text-[#4A3525]">{formatJoinDate(accountCreatedAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-[#D4E2F5] bg-[#F2F7FF] p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-[11px] font-extrabold text-[#2B538C]">
                      <Database className="h-3.5 w-3.5" />
                      <span>Đồng bộ Supabase</span>
                    </span>
                    <span className="rounded-md bg-[#DCE9FC] px-2 py-0.5 text-[9px] font-black text-[#2F5B9E]">
                      Sắp ra mắt
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] font-semibold leading-relaxed text-[#526D94]">
                    Tài khoản hiện đang lưu trên thiết bị. Tính năng liên kết Supabase để sao lưu đám mây sẽ sớm được mở khóa.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-[#DFCBB0] bg-white p-3.5 shadow-xs space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-black text-[#4A3525]">
                  <Gift className="h-4 w-4 text-[#D96B43]" />
                  <span>Nhập Code Quà Tặng</span>
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    soundFX.tap();
                    const cleaned = giftCodeInput.trim();
                    if (!cleaned) {
                      setGiftCodeMessage({
                        ok: false,
                        text: 'Vui lòng nhập mã code trước khi xác nhận.',
                      });
                      return;
                    }
                    const res = onRedeemGiftCode(cleaned);
                    setGiftCodeMessage({ok: res.ok, text: res.message});
                    if (res.ok) {
                      soundFX.sparkle();
                      setGiftCodeInput('');
                    }
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={giftCodeInput}
                    onChange={(e) => {
                      setGiftCodeInput(e.target.value.toUpperCase());
                      if (giftCodeMessage) setGiftCodeMessage(null);
                    }}
                    maxLength={24}
                    placeholder="Nhập gift code..."
                    className="min-w-0 flex-1 rounded-xl border border-[#DECBB0] bg-[#FAF4EA] px-3 py-2 text-xs font-bold uppercase text-[#3B2A1A] placeholder:normal-case placeholder:font-semibold placeholder:text-[#9D856B] focus:border-[#6F4E37] focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="shrink-0 rounded-xl bg-[#6F4E37] px-3 py-2 text-xs font-black text-amber-50 transition-transform active:scale-95"
                  >
                    Nhập
                  </button>
                </form>
                {giftCodeMessage && (
                  <p
                    className={`rounded-xl px-2.5 py-2 text-[11px] font-semibold leading-relaxed ${
                      giftCodeMessage.ok
                        ? 'bg-[#EAF8EE] text-[#2A6E40]'
                        : 'bg-[#FBF2E4] text-[#7B5939]'
                    }`}
                  >
                    {giftCodeMessage.text}
                  </p>
                )}
              </div>
            </div>
          )}

          {tab === 'fishdex' && (() => {
            const fishDiscovered = RIVER_FISH_LIST.filter(
              (s) => (fishDex[s.id]?.caughtCount ?? 0) > 0,
            ).length;
            const totalFish = RIVER_FISH_LIST.length;
            const fishPct = Math.round((fishDiscovered / Math.max(1, totalFish)) * 100);

            const bugDiscovered = INSECT_LIST.filter(
              (s) => (insectDex[s.id]?.caughtCount ?? 0) > 0,
            ).length;
            const totalBugs = INSECT_LIST.length;
            const bugPct = Math.round((bugDiscovered / Math.max(1, totalBugs)) * 100);

            const isFishTab = dexCategory === 'fish';
            const activePct = isFishTab ? fishPct : bugPct;

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
                  <span className="text-xs font-extrabold text-[#4A3525]">Sổ Sinh Vật</span>
                  <span className="w-16" />
                </div>

                {/* Fish vs Insects Switcher & Progress */}
                <div className="rounded-2xl border border-[#CCE2EC] bg-white px-3 py-2.5 shadow-xs space-y-2">
                  <div className="grid grid-cols-2 gap-1.5 bg-[#EFE6D6] p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => {
                        soundFX.tap();
                        setDexCategory('fish');
                      }}
                      className={`rounded-lg py-1.5 text-[11px] font-black transition ${
                        isFishTab
                          ? 'bg-[#3C95AD] text-white shadow-xs'
                          : 'text-[#6A5138]'
                      }`}
                    >
                      Cá ({fishDiscovered}/{totalFish})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        soundFX.tap();
                        setDexCategory('insects');
                      }}
                      className={`rounded-lg py-1.5 text-[11px] font-black transition ${
                        !isFishTab
                          ? 'bg-[#439A6C] text-white shadow-xs'
                          : 'text-[#6A5138]'
                      }`}
                    >
                      Côn Trùng ({bugDiscovered}/{totalBugs})
                    </button>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[11px] font-extrabold text-[#2A5970]">
                      <span>{isFishTab ? 'Bộ Sưu Tập Cá' : 'Bộ Sưu Tập Côn Trùng'}</span>
                      <span
                        className={`tabular-nums ${
                          isFishTab ? 'text-[#3C95AD]' : 'text-[#439A6C]'
                        }`}
                      >
                        {isFishTab
                          ? `${fishDiscovered}/${totalFish} loài (${activePct}%)`
                          : `${bugDiscovered}/${totalBugs} loài (${activePct}%)`}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[#E6F2F7]">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isFishTab
                            ? 'bg-gradient-to-r from-[#45A8C4] to-[#5CC8A1]'
                            : 'bg-gradient-to-r from-[#48A878] to-[#86D273]'
                        }`}
                        style={{width: `${activePct}%`}}
                      />
                    </div>
                  </div>

                  {/* River vs Sea Sub-Switcher inside Fish tab */}
                  {isFishTab && (
                    <div className="grid grid-cols-2 gap-1.5 pt-0.5">
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
                        Cá Sông ({fishDiscovered}/{totalFish})
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
                  )}
                </div>

                {!isFishTab ? (
                  <div className="grid grid-cols-2 gap-2 pb-1">
                    {INSECT_LIST.map((species) => {
                      const dex = insectDex[species.id];
                      const totalCaught = dex?.caughtCount ?? 0;
                      const maxMm = dex?.maxLengthMm ?? 0;
                      const isRare = species.rarity === 'rare';
                      const discovered = totalCaught > 0;

                      return (
                        <div
                          key={species.id}
                          className={`flex flex-col justify-between rounded-2xl border p-2.5 transition ${
                            discovered
                              ? isRare
                                ? 'border-[#D7B8F2] bg-[#FCF7FF]'
                                : 'border-[#C7E4CE] bg-white'
                              : 'border-[#E6DAC5] bg-[#F5EDE0]/80 opacity-85'
                          }`}
                        >
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
                            <span className="truncate text-[9px] font-bold text-[#7A6048]">
                              {INSECT_HABITAT_LABELS[species.habitat]}
                            </span>
                          </div>

                          <div
                            className={`my-2 mx-auto flex h-12 w-full items-center justify-center rounded-xl ${
                              discovered
                                ? isRare
                                  ? 'bg-[#F3E4FF]/70'
                                  : 'bg-[#EAF7EE]'
                                : 'bg-[#EAE0CE]/60 grayscale opacity-60'
                            }`}
                          >
                            <InsectIllustration
                              speciesId={species.id}
                              className="h-10 w-10"
                            />
                          </div>

                          <div>
                            <div className="truncate text-[11px] font-black text-[#3B2A1A]">
                              {species.name}
                            </div>
                            <div className="mt-0.5 truncate text-[10px] font-bold text-[#7A6048] tabular-nums">
                              {discovered
                                ? `Kỷ lục ${maxMm}mm · ${totalCaught} con`
                                : `${species.minMm}–${species.maxMm} mm`}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : fishDexWater === 'sea' ? (
                  <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#A8CBE0] bg-[#EDF5FA] p-5 text-center">
                    <div className="text-sm font-black text-[#2E5573]">
                      Bộ Sưu Tập Cá Biển · Sắp Ra Mắt
                    </div>
                    <p className="mt-1.5 text-xs font-semibold leading-relaxed text-[#567996]">
                      Các loài cá biển sẽ được mở rộng trong bản cập nhật tới. Hiện tại hãy sưu tầm đủ {totalFish} loài Cá Sông nhé!
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
                tab === 'menu' || tab === 'account' || tab === 'fishdex'
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
