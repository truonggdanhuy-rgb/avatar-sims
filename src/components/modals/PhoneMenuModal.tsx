import React, {useEffect, useState} from 'react';
import {
  Armchair,
  ArrowLeft,
  Backpack,
  BookOpen,
  ClipboardList,
  CloudSun,
  Coins,
  Compass,
  Fish,
  Heart,
  Home,
  Moon,
  Settings,
  Shirt,
  ShoppingBag,
  Sprout,
  Sun,
  Sunset,
  Trees,
  Volume2,
  VolumeX,
  Warehouse,
  Waves,
  X,
  Zap,
  Gamepad2,
} from 'lucide-react';
import {AvatarConfig, DailyQuestProgress, GameStats, TimeOfDay, ZoneId} from '../../types/game';
import {soundFX} from '../../utils/sound';
import {AvatarPreview3D} from '../AvatarPreview3D';

interface PhoneMenuModalProps {
  zone: ZoneId;
  avatar: AvatarConfig;
  stats: GameStats;
  timeOfDay: TimeOfDay;
  soundEnabled: boolean;
  dailyQuests: DailyQuestProgress;
  storageUsed: number;
  storageCapacity: number;
  onChangeZone: (next: ZoneId) => void;
  onOpenWardrobe: () => void;
  onOpenDailyQuests: () => void;
  onOpenSettings: () => void;
  onOpenFurniture: () => void;
  onOpenStorage: () => void;
  onChangeTimeOfDay: (time: TimeOfDay) => void;
  onToggleSound: () => void;
  onClose: () => void;
}

type PhoneTab = 'menu' | 'map' | 'guide' | 'bag' | 'fishdex';

const ZONE_LABELS: Record<ZoneId, string> = {
  town: 'Thị Trấn',
  home: 'Nhà Của Tôi',
  garden: 'Nông Trại',
  boutique: 'Thời Trang',
  arcade: 'Tiệm Game',
  fishing: 'Hồ Câu Cá',
};

const TELEPORT_ZONES: {
  id: ZoneId;
  label: string;
  sub: string;
  accent: string;
  icon: React.FC<{className?: string}>;
}[] = [
  {
    id: 'town',
    label: 'Quảng Trường',
    sub: 'Trung tâm thị trấn',
    accent: 'bg-[#E9F3EC] text-[#3F7B4E]',
    icon: Trees,
  },
  {
    id: 'home',
    label: 'Về Nhà',
    sub: 'Nghỉ ngơi & trang trí',
    accent: 'bg-[#FCECE4] text-[#B85838]',
    icon: Home,
  },
  {
    id: 'garden',
    label: 'Nông Trại',
    sub: 'Trồng cây & chăn nuôi',
    accent: 'bg-[#EEF6E4] text-[#4C803B]',
    icon: Sprout,
  },
  {
    id: 'boutique',
    label: 'Thời Trang',
    sub: 'Quần áo & nội thất',
    accent: 'bg-[#FCEBF1] text-[#B8476D]',
    icon: ShoppingBag,
  },
  {
    id: 'fishing',
    label: 'Hồ Câu Cá',
    sub: 'Câu cá kiếm xu',
    accent: 'bg-[#E7F4FC] text-[#2F6F99]',
    icon: Waves,
  },
  {
    id: 'arcade',
    label: 'Tiệm Game',
    sub: 'Minigame tăng vui vẻ',
    accent: 'bg-[#EFEBFB] text-[#5B49A8]',
    icon: Gamepad2,
  },
];

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
  onChangeZone,
  onOpenWardrobe,
  onOpenDailyQuests,
  onOpenSettings,
  onOpenFurniture,
  onOpenStorage,
  onChangeTimeOfDay,
  onToggleSound,
  onClose,
}) => {
  const [tab, setTab] = useState<PhoneTab>('menu');
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
      className="phone-ui absolute inset-0 z-50 flex items-center justify-center bg-stone-950/65 p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="anim-pop flex h-[min(91dvh,630px)] w-full max-w-[372px] flex-col overflow-hidden rounded-[36px] border-[5px] border-[#4A3628] bg-[#FAF3E8] shadow-2xl"
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

                {/* 2. Túi Đồ (Bag Icon - Empty placeholder for future items) */}
                <button
                  type="button"
                  onClick={() => {
                    soundFX.tap();
                    setTab('bag');
                  }}
                  className="group flex flex-col items-center gap-1.5 transition-transform active:scale-95"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-[18px] border border-[#E5C9A8] bg-gradient-to-br from-[#FFF4E3] to-[#F2D8B6] text-[#9A5B25] shadow-sm transition-transform group-hover:-translate-y-0.5">
                    <Backpack className="h-7 w-7" strokeWidth={2.1} />
                  </div>
                  <span className="text-[11px] font-bold leading-tight text-[#4A3525]">
                    Túi Đồ
                  </span>
                </button>

                {/* 3. Sổ Cá (Fish Icon - Empty FishDex placeholder) */}
                <button
                  type="button"
                  onClick={() => {
                    soundFX.tap();
                    setTab('fishdex');
                  }}
                  className="group flex flex-col items-center gap-1.5 transition-transform active:scale-95"
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
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.tap();
                      onClose();
                      onOpenFurniture();
                    }}
                    className="flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-[#E0CEB6] bg-white px-2 py-1.5 text-[11px] font-bold text-[#4A3525] transition-transform active:scale-95"
                  >
                    <Armchair className="h-3.5 w-3.5 text-[#B85838]" />
                    <span>Nội Thất</span>
                  </button>

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
            <div className="flex h-full flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    soundFX.tap();
                    setTab('menu');
                  }}
                  className="flex min-h-[36px] items-center gap-1 rounded-xl bg-[#EFE0C9] px-2.5 py-1 text-xs font-bold text-[#5B422E] active:scale-95"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Quay lại</span>
                </button>
                <span className="text-xs font-extrabold text-[#4A3525]">Túi Đồ</span>
                <span className="w-16" />
              </div>

              <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-[#E0CEB6] bg-white p-6 text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF4E3] text-[#9A5B25]">
                  <Backpack className="h-7 w-7" />
                </div>
                <div className="text-sm font-extrabold text-[#4A3525]">Túi đồ đang trống</div>
                <p className="mt-1.5 max-w-[230px] text-xs leading-relaxed text-[#7A6048]">
                  Danh sách vật phẩm cá nhân và đạo cụ thu thập sẽ hiển thị tại đây trong bản cập nhật tới.
                </p>
              </div>
            </div>
          )}

          {tab === 'fishdex' && (
            <div className="flex h-full flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    soundFX.tap();
                    setTab('menu');
                  }}
                  className="flex min-h-[36px] items-center gap-1 rounded-xl bg-[#EFE0C9] px-2.5 py-1 text-xs font-bold text-[#5B422E] active:scale-95"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Quay lại</span>
                </button>
                <span className="text-xs font-extrabold text-[#4A3525]">Sổ Cá</span>
                <span className="w-16" />
              </div>

              <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-[#E0CEB6] bg-white p-6 text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EAF6FE] text-[#286B94]">
                  <Fish className="h-7 w-7" />
                </div>
                <div className="text-sm font-extrabold text-[#4A3525]">Sổ Cá Đang Trống</div>
                <p className="mt-1.5 max-w-[230px] text-xs leading-relaxed text-[#7A6048]">
                  Các loài cá bạn câu được ở Hồ Câu Cá sẽ được lưu lại kích thước và độ hiếm tại sổ cá này.
                </p>
              </div>
            </div>
          )}

          {tab === 'map' && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-[#6F4E37]">
                Chọn tiểu khu để di chuyển ngay
              </div>
              <div className="grid grid-cols-2 gap-2">
                {TELEPORT_ZONES.map((item) => {
                  const Icon = item.icon;
                  const active = zone === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        soundFX.enterDoor();
                        onChangeZone(item.id);
                        onClose();
                      }}
                      className={`flex flex-col items-start gap-1.5 rounded-2xl border p-3 text-left transition-transform active:scale-95 ${
                        active
                          ? 'border-2 border-[#6F4E37] bg-[#FFF8EB]'
                          : 'border-[#E0CEB6] bg-white hover:border-[#C5A47D]'
                      }`}
                    >
                      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.accent}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#4A3525]">
                          {item.label}
                          {active ? ' · Đang ở đây' : ''}
                        </div>
                        <div className="text-[11px] text-[#7A6048]">{item.sub}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

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
                  Mở mũi tên góc trên bên phải để đặt nội thất, sơn tường/sàn hoặc xếp đồ trang trí lên mặt bàn, tủ, giường.
                </div>
              </div>
              <div className="px-3.5 py-2.5">
                <div className="text-xs font-bold text-[#4A3525]">Dạo Phố & Góc Trà Anh Đào</div>
                <div className="mt-0.5 text-[11px] leading-relaxed text-[#7A6048]">
                  Khám phá các tuyến đường mới dẫn ra góc trà bánh dưới gốc anh đào rụng hoa, câu cá bên hồ hoặc ghé Trạm Bưu Điện.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Phone Dock Navigation */}
        <div className="shrink-0 border-t border-[#E5D5BE] bg-[#F2E5D2] px-3 py-2">
          <div className="grid grid-cols-3 gap-1.5">
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
                setTab('map');
              }}
              className={`flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition-colors ${
                tab === 'map'
                  ? 'bg-[#6F4E37] text-amber-50 shadow-xs'
                  : 'bg-[#E9D9C3] text-[#5B422E]'
              }`}
            >
              <Compass className="h-3.5 w-3.5" />
              <span>Bản Đồ</span>
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
  );
};
