import React, {useState} from 'react';
import {
  Armchair,
  BookOpen,
  Coins,
  Compass,
  Gamepad2,
  Heart,
  Home,
  Mail,
  Moon,
  Shirt,
  ShoppingBag,
  Sparkles,
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
} from 'lucide-react';
import {AvatarConfig, DailyQuestProgress, GameStats, TimeOfDay, ZoneId} from '../../types/game';
import {soundFX} from '../../utils/sound';

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

type PhoneTab = 'menu' | 'map' | 'guide';

const ZONE_LABELS: Record<ZoneId, string> = {
  town: 'Quảng Trường Thị Trấn',
  home: 'Nhà Của Tôi',
  garden: 'Nông Trại Rộng Mở',
  boutique: 'Tiệm Thời Trang',
  arcade: 'Tiệm Minigame',
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

  const readyQuestCount = (['garden', 'fishing', 'dressup'] as const).filter(
    (k) => dailyQuests.tasks[k] && !dailyQuests.claimed[k],
  ).length;
  const doneQuestCount = (['garden', 'fishing', 'dressup'] as const).filter(
    (k) => dailyQuests.claimed[k],
  ).length;

  const TimeIcon =
    timeOfDay === 'morning' ? Sun : timeOfDay === 'sunset' ? Sunset : Moon;
  const timeLabel =
    timeOfDay === 'morning'
      ? 'Sáng Trong'
      : timeOfDay === 'sunset'
        ? 'Hoàng Hôn'
        : 'Đêm Sao';

  const nextTime: TimeOfDay =
    timeOfDay === 'morning' ? 'sunset' : timeOfDay === 'sunset' ? 'night' : 'morning';

  return (
    <div
      className="phone-ui absolute inset-0 z-50 flex items-center justify-center bg-stone-950/65 p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="anim-pop flex h-[min(90dvh,610px)] w-full max-w-[368px] flex-col overflow-hidden rounded-[34px] border-[5px] border-[#5C4433] bg-[#FAF3E8] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Phone Speaker & Status Bar */}
        <div className="shrink-0 border-b border-[#E5D5BE] bg-[#F2E5D2] px-4 pt-2 pb-2.5">
          <div className="mb-2 flex items-center justify-between text-[11px] font-semibold text-[#5B422E]">
            <div className="flex items-center gap-1">
              <TimeIcon className="h-3.5 w-3.5 text-[#9A5B25]" />
              <span>{timeLabel}</span>
            </div>
            <div className="h-1.5 w-14 rounded-full bg-[#C7B092]" />
            <div className="flex items-center gap-1 tabular-nums text-[#6F4E37]">
              <Coins className="h-3.5 w-3.5 text-amber-500" />
              <span>{stats.coins} Xu</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-base font-bold leading-tight text-[#4A3525]">
                Điện Thoại Thị Trấn
              </h2>
              <p className="text-[11px] font-medium text-[#7A6048]">
                {avatar.name} · {ZONE_LABELS[zone]}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                soundFX.tap();
                onClose();
              }}
              aria-label="Đóng điện thoại"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E3CEB2] text-[#4A3525] transition-transform active:scale-95"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Phone Main Scrollable Viewport */}
        <div className="custom-scroll min-h-0 flex-1 space-y-3 overflow-y-auto p-3.5 text-[#4A3525]">
          {tab === 'menu' && (
            <>
              {/* Character Vital Card */}
              <div className="rounded-2xl border border-[#E0CEB6] bg-white p-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <div className="mb-1 flex items-center justify-between text-[11px] font-bold text-[#5B422E]">
                      <span className="flex items-center gap-1">
                        <Zap className="h-3.5 w-3.5 text-[#E59A32]" />
                        Năng lượng
                      </span>
                      <span className="tabular-nums">{stats.energy}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#EFE4D3]">
                      <div
                        className="h-full rounded-full bg-[#6BA383] transition-all"
                        style={{width: `${Math.max(0, Math.min(100, stats.energy))}%`}}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between text-[11px] font-bold text-[#5B422E]">
                      <span className="flex items-center gap-1">
                        <Heart className="h-3.5 w-3.5 text-[#E0647A]" />
                        Vui vẻ
                      </span>
                      <span className="tabular-nums">{stats.mood}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#EFE4D3]">
                      <div
                        className="h-full rounded-full bg-[#E88394] transition-all"
                        style={{width: `${Math.max(0, Math.min(100, stats.mood))}%`}}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* App Grid */}
              <div>
                <div className="mb-1.5 text-xs font-bold text-[#6F4E37]">Ứng Dụng Chính</div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.tap();
                      setTab('map');
                    }}
                    className="flex flex-col items-center gap-1.5 rounded-2xl border border-[#E0CEB6] bg-white p-2.5 text-center transition-transform active:scale-95"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E9F3EC] text-[#3F7B4E]">
                      <Compass className="h-5 w-5" />
                    </div>
                    <span className="text-[11px] font-bold leading-tight text-[#4A3525]">
                      Đi Nhanh
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      soundFX.tap();
                      onClose();
                      onOpenWardrobe();
                    }}
                    className="flex flex-col items-center gap-1.5 rounded-2xl border border-[#E0CEB6] bg-white p-2.5 text-center transition-transform active:scale-95"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FCEBF1] text-[#B8476D]">
                      <Shirt className="h-5 w-5" />
                    </div>
                    <span className="text-[11px] font-bold leading-tight text-[#4A3525]">
                      Tủ Đồ
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      soundFX.tap();
                      onClose();
                      onOpenDailyQuests();
                    }}
                    className="relative flex flex-col items-center gap-1.5 rounded-2xl border border-[#E0CEB6] bg-white p-2.5 text-center transition-transform active:scale-95"
                  >
                    {readyQuestCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 rounded-md bg-[#D96D56] px-1.5 py-0.5 text-[9px] font-bold text-white">
                        +{readyQuestCount}
                      </span>
                    )}
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF3D8] text-[#B9771E]">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <span className="text-[11px] font-bold leading-tight text-[#4A3525]">
                      Nhiệm Vụ ({doneQuestCount}/3)
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      soundFX.tap();
                      onClose();
                      onOpenStorage();
                    }}
                    className="flex flex-col items-center gap-1.5 rounded-2xl border border-[#E0CEB6] bg-white p-2.5 text-center transition-transform active:scale-95"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F5EBDC] text-[#8C5B32]">
                      <Warehouse className="h-5 w-5" />
                    </div>
                    <span className="text-[11px] font-bold leading-tight text-[#4A3525]">
                      Kho ({storageUsed}/{storageCapacity})
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      soundFX.tap();
                      onClose();
                      onOpenFurniture();
                    }}
                    className="flex flex-col items-center gap-1.5 rounded-2xl border border-[#E0CEB6] bg-white p-2.5 text-center transition-transform active:scale-95"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FCECE4] text-[#B85838]">
                      <Armchair className="h-5 w-5" />
                    </div>
                    <span className="text-[11px] font-bold leading-tight text-[#4A3525]">
                      Nội Thất
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      soundFX.tap();
                      onClose();
                      onOpenSettings();
                    }}
                    className="flex flex-col items-center gap-1.5 rounded-2xl border border-[#E0CEB6] bg-white p-2.5 text-center transition-transform active:scale-95"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E7F4FC] text-[#2F6F99]">
                      <Mail className="h-5 w-5" />
                    </div>
                    <span className="text-[11px] font-bold leading-tight text-[#4A3525]">
                      Bưu Điện
                    </span>
                  </button>
                </div>
              </div>

              {/* Quick Controls Strip */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    soundFX.tap();
                    onChangeTimeOfDay(nextTime);
                  }}
                  className="flex min-h-[42px] items-center justify-center gap-2 rounded-2xl border border-[#E0CEB6] bg-white px-3 py-2 text-xs font-bold text-[#4A3525] transition-transform active:scale-95"
                >
                  <TimeIcon className="h-4 w-4 text-[#B9771E]" />
                  <span>Đổi Buổi</span>
                </button>

                <button
                  type="button"
                  onClick={onToggleSound}
                  className="flex min-h-[42px] items-center justify-center gap-2 rounded-2xl border border-[#E0CEB6] bg-white px-3 py-2 text-xs font-bold text-[#4A3525] transition-transform active:scale-95"
                >
                  {soundEnabled ? (
                    <Volume2 className="h-4 w-4 text-[#4B8A66]" />
                  ) : (
                    <VolumeX className="h-4 w-4 text-[#8A7562]" />
                  )}
                  <span>{soundEnabled ? 'Âm Thanh: Bật' : 'Âm Thanh: Tắt'}</span>
                </button>
              </div>
            </>
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
                <div className="text-xs font-bold text-[#4A3525]">Câu Cá & Tiệm Game</div>
                <div className="mt-0.5 text-[11px] leading-relaxed text-[#7A6048]">
                  Dạo quanh thị trấn để câu cá bên hồ, mua trang phục và nội thất ở Tiệm Thời Trang hoặc chơi minigame nhận Xu.
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
                tab === 'menu'
                  ? 'bg-[#6F4E37] text-amber-50 shadow-xs'
                  : 'bg-[#E9D9C3] text-[#5B422E]'
              }`}
            >
              <Home className="h-3.5 w-3.5" />
              <span>Menu</span>
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
