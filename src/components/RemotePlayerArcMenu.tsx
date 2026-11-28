import React, {useState} from 'react';
import {
  Award,
  Calendar,
  Coins,
  Gamepad2,
  MapPin,
  PawPrint,
  Send,
  Smile,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react';
import {getMountDefinition} from '../data/mountCatalog';
import {PET_CATALOG} from '../data/petCatalog';
import {MAX_PLAYER_LEVEL} from '../data/levelCatalog';
import {OnlinePlayerMeta, ZoneId} from '../types/game';
import {soundFX} from '../utils/sound';

const ZONE_LABELS: Record<ZoneId, string> = {
  town: 'Thị Trấn',
  home: 'Nhà Riêng',
  garden: 'Nông Trại',
  fishing: 'Hồ Câu Cá',
  arcade: 'Tiệm Game',
  boutique: 'Thời Trang',
  petshop: 'Cửa Hàng Pets',
  mall: 'May Mall',
  island: 'Đảo Mây',
};

function formatJoinDate(ts: number): string {
  const d = new Date(ts || Date.now());
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

interface RemotePlayerArcMenuProps {
  player: OnlinePlayerMeta;
  screenX: number;
  screenY: number;
  myCoins: number;
  myCoinGame: number;
  onSendGift: (
    target: OnlinePlayerMeta,
    currency: 'coins' | 'coinGame',
    amount: number,
  ) => {ok: boolean; message: string};
  onClose: () => void;
}

export const RemotePlayerArcMenu: React.FC<RemotePlayerArcMenuProps> = ({
  player,
  screenX,
  screenY,
  myCoins,
  myCoinGame,
  onSendGift,
  onClose,
}) => {
  const [activePanel, setActivePanel] = useState<'none' | 'action_notice' | 'profile' | 'gift'>(
    'none',
  );
  const [giftCurrency, setGiftCurrency] = useState<'coins' | 'coinGame'>('coins');
  const [giftAmountInput, setGiftAmountInput] = useState<string>('50');
  const [giftStatus, setGiftStatus] = useState<{ok: boolean; text: string} | null>(null);

  const mainRadius = 60;
  const getArcPos = (idx: number, total: number, radius: number, spanDeg = 128) => {
    const startDeg = -90 - spanDeg / 2;
    const deg = total === 1 ? -90 : startDeg + (idx / (total - 1)) * spanDeg;
    const rad = (deg * Math.PI) / 180;
    return {
      x: Math.cos(rad) * radius,
      y: Math.sin(rad) * radius,
    };
  };

  const actions = [
    {
      key: 'action',
      title: 'Hành động (Sắp ra mắt)',
      bgClass:
        activePanel === 'action_notice'
          ? 'bg-[#C96B27] text-white ring-2 ring-[#FFF1D6]'
          : 'bg-[#E89149] text-white',
      badge: 'Hành động',
      badgeClass: 'border-[#E89149]/60 bg-[#FFF8F0]/95 text-[#9B4D10]',
      icon: <Smile className="h-4 w-4" />,
      onClick: () => {
        soundFX.tap();
        setActivePanel((p) => (p === 'action_notice' ? 'none' : 'action_notice'));
      },
    },
    {
      key: 'profile',
      title: 'Xem thông tin cư dân',
      bgClass:
        activePanel === 'profile'
          ? 'bg-[#29709E] text-white ring-2 ring-[#E2F3FF]'
          : 'bg-[#4BA0D8] text-white',
      badge: 'Thông tin',
      badgeClass: 'border-[#4BA0D8]/60 bg-[#F2FAFF]/95 text-[#1B6494]',
      icon: <UserRound className="h-4 w-4" />,
      onClick: () => {
        soundFX.tap();
        setActivePanel((p) => (p === 'profile' ? 'none' : 'profile'));
      },
    },
    {
      key: 'gift',
      title: 'Tặng Xu / CoinGame',
      bgClass:
        activePanel === 'gift'
          ? 'bg-[#C78312] text-white ring-2 ring-[#FFF6D6]'
          : 'bg-[#E8A52B] text-white',
      badge: 'Tặng Xu',
      badgeClass: 'border-[#E8A52B]/60 bg-[#FFFDF2]/95 text-[#8A5808]',
      icon: <Coins className="h-4 w-4" />,
      onClick: () => {
        soundFX.tap();
        setGiftStatus(null);
        setActivePanel((p) => (p === 'gift' ? 'none' : 'gift'));
      },
    },
  ];

  const mountDef = getMountDefinition(player.activeMountId);
  const petSpec = player.companionPet
    ? PET_CATALOG[player.companionPet.speciesId]
    : player.carriedPet
      ? PET_CATALOG[player.carriedPet.speciesId]
      : null;

  const parsedGiftAmount = Math.max(0, Math.floor(Number(giftAmountInput) || 0));
  const currentBalance = giftCurrency === 'coins' ? myCoins : myCoinGame;
  const canSendGift = parsedGiftAmount > 0 && currentBalance >= parsedGiftAmount;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-40 overflow-hidden"
      aria-label="Menu tương tác người chơi"
    >
      {/* Circular Arc Menu anchored at player screen position */}
      <div
        className="pointer-events-auto absolute"
        style={{left: `${screenX}px`, top: `${screenY}px`}}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => {
            soundFX.tap();
            onClose();
          }}
          aria-label="Đóng"
          title="Đóng"
          className="anim-pop flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-[#8C6239] bg-[#FFF8EB] text-[#4A3525] shadow-md transition-transform active:scale-90"
        >
          <X className="h-4 w-4" />
        </button>

        {actions.map((act, idx) => {
          const pos = getArcPos(idx, actions.length, mainRadius, 128);
          return (
            <div
              key={act.key}
              style={{left: `${pos.x}px`, top: `${pos.y}px`}}
              className="anim-pop absolute -translate-x-1/2 -translate-y-1/2"
            >
              <button
                type="button"
                onClick={act.onClick}
                aria-label={act.title}
                title={act.title}
                className={`relative flex h-10 w-10 items-center justify-center rounded-full shadow-lg transition-transform active:scale-90 ${act.bgClass}`}
              >
                {act.icon}
              </button>
              <div
                className={`pointer-events-none absolute top-full left-1/2 mt-0.5 -translate-x-1/2 rounded border px-1 py-px text-[9px] leading-none font-extrabold tracking-tight whitespace-nowrap shadow-2xs ${act.badgeClass}`}
              >
                {act.badge}
              </div>
            </div>
          );
        })}

        {activePanel === 'action_notice' && (
          <div className="anim-pop absolute top-7 left-0 w-[216px] -translate-x-1/2 rounded-xl border-2 border-[#8C6239]/80 bg-[#FFF9EF]/96 p-2.5 text-center text-[#4A3525] shadow-xl">
            <div className="text-[11px] font-black text-[#B85814]">Hành Động Chung</div>
            <p className="mt-1 text-[10px] font-semibold leading-relaxed text-[#6F4E37]">
              Hiện chưa có hành động tương tác giữa người chơi ở bản cập nhật này.
            </p>
          </div>
        )}
      </div>

      {/* Profile Card Modal (NO avatar rendered, centered cleanly) */}
      {activePanel === 'profile' && (
        <div
          className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-stone-950/45 p-3"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setActivePanel('none')}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="anim-pop w-full max-w-[320px] overflow-hidden rounded-3xl border-[3px] border-[#9C734B] bg-[#FAF3E8] text-[#4A3525] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#E5D5BE] bg-[#F2E5D2] px-4 py-2.5">
              <div className="flex items-center gap-2">
                <UserRound className="h-4 w-4 text-[#29709E]" />
                <span className="text-sm font-black">Thẻ Cư Dân Thị Trấn</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  soundFX.tap();
                  setActivePanel('none');
                }}
                aria-label="Đóng thẻ thông tin"
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E3CEB2] text-[#4A3525] active:scale-95"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="space-y-3 p-4">
              {/* Name & Level Header (strictly NO avatar per spec) */}
              <div className="rounded-2xl border border-[#DFCBB0] bg-white p-3.5 shadow-2xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-base font-black text-[#3B2A1A]">
                      {player.name}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-[#7A6048] tabular-nums">
                      <span className="font-mono text-[#4A3525]">{player.accountId}</span>
                      {player.username && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-[#0E7A60]">@{player.username}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 rounded-xl border border-[#F0D18A] bg-[#FFF7DF] px-2.5 py-1 text-xs font-black text-[#A66310] tabular-nums">
                    Lv.{player.level}
                  </div>
                </div>
              </div>

              {/* Resident Info Rows */}
              <div className="space-y-2 rounded-2xl border border-[#DFCBB0] bg-white p-3.5 text-xs font-semibold shadow-2xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-[#7A6048]">
                    <Award className="h-3.5 w-3.5 text-[#D9821E]" />
                    <span>Cấp độ</span>
                  </span>
                  <span className="font-black text-[#4A3525] tabular-nums">
                    Cấp {player.level} / {MAX_PLAYER_LEVEL}
                  </span>
                </div>

                <div className="h-px bg-[#EFE3D2]" />

                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-[#7A6048]">
                    <Calendar className="h-3.5 w-3.5 text-[#2F7C67]" />
                    <span>Ngày đến thị trấn</span>
                  </span>
                  <span className="font-black text-[#4A3525] tabular-nums">
                    {formatJoinDate(player.joinedAt)}
                  </span>
                </div>

                <div className="h-px bg-[#EFE3D2]" />

                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-[#7A6048]">
                    <MapPin className="h-3.5 w-3.5 text-[#29709E]" />
                    <span>Khu vực</span>
                  </span>
                  <span className="font-black text-[#4A3525]">
                    {ZONE_LABELS[player.zone] ?? 'Thị Trấn'}
                  </span>
                </div>

                <div className="h-px bg-[#EFE3D2]" />

                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-[#7A6048]">
                    <PawPrint className="h-3.5 w-3.5 text-[#C95970]" />
                    <span>Thú cưng</span>
                  </span>
                  <span className="truncate font-bold text-[#4A3525]">
                    {player.companionPet
                      ? `${player.companionPet.name} (${petSpec?.name ?? ''})`
                      : petSpec
                        ? `Đang bế ${petSpec.name}`
                        : 'Chưa gọi ra'}
                  </span>
                </div>

                <div className="h-px bg-[#EFE3D2]" />

                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-[#7A6048]">
                    <Sparkles className="h-3.5 w-3.5 text-[#7D63A8]" />
                    <span>Thú cưỡi</span>
                  </span>
                  <span className="truncate font-bold text-[#4A3525]">
                    {mountDef ? mountDef.name : 'Đi bộ'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  soundFX.tap();
                  setGiftStatus(null);
                  setActivePanel('gift');
                }}
                className="flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-xl bg-[#E8A52B] px-3 py-2 text-xs font-black text-white shadow-xs transition-transform active:scale-95"
              >
                <Coins className="h-4 w-4" />
                <span>Tặng Xu Cho {player.name}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gift Coins Modal */}
      {activePanel === 'gift' && (
        <div
          className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-stone-950/45 p-3"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setActivePanel('none')}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="anim-pop w-full max-w-[330px] overflow-hidden rounded-3xl border-[3px] border-[#9C734B] bg-[#FAF3E8] text-[#4A3525] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#E5D5BE] bg-[#F2E5D2] px-4 py-2.5">
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-[#C78312]" />
                <span className="text-sm font-black">Tặng Xu Cho {player.name}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  soundFX.tap();
                  setActivePanel('none');
                }}
                aria-label="Đóng tặng xu"
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E3CEB2] text-[#4A3525] active:scale-95"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="space-y-3 p-4">
              {/* Currency Selector */}
              <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-[#EFE4D3] p-1">
                <button
                  type="button"
                  onClick={() => {
                    soundFX.tap();
                    setGiftCurrency('coins');
                    setGiftStatus(null);
                  }}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-black transition ${
                    giftCurrency === 'coins'
                      ? 'bg-white text-[#9A5B14] shadow-xs'
                      : 'text-[#6F4E37]'
                  }`}
                >
                  <Coins className="h-3.5 w-3.5 text-amber-500" />
                  <span>Xu Vàng</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundFX.tap();
                    setGiftCurrency('coinGame');
                    setGiftStatus(null);
                  }}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-black transition ${
                    giftCurrency === 'coinGame'
                      ? 'bg-white text-[#0F6E8C] shadow-xs'
                      : 'text-[#6F4E37]'
                  }`}
                >
                  <Gamepad2 className="h-3.5 w-3.5 text-[#0EA5E9]" />
                  <span>Xu Game (CG)</span>
                </button>
              </div>

              {/* Balance */}
              <div className="flex items-center justify-between rounded-xl border border-[#DFCBB0] bg-white px-3 py-2 text-xs font-bold">
                <span className="text-[#7A6048]">Số dư hiện tại của bạn:</span>
                <span className="font-black tabular-nums text-[#3B2A1A]">
                  {currentBalance.toLocaleString('vi-VN')}{' '}
                  {giftCurrency === 'coins' ? 'Xu' : 'CG'}
                </span>
              </div>

              {/* Quick Presets */}
              <div className="grid grid-cols-4 gap-1.5">
                {[10, 50, 100, 500].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      soundFX.tap();
                      setGiftAmountInput(String(amt));
                      setGiftStatus(null);
                    }}
                    className={`rounded-xl border py-1.5 text-xs font-black tabular-nums transition active:scale-95 ${
                      parsedGiftAmount === amt
                        ? 'border-[#C78312] bg-[#FFF4DC] text-[#9A5B14]'
                        : 'border-[#DFCBB0] bg-white text-[#5B422E]'
                    }`}
                  >
                    +{amt}
                  </button>
                ))}
              </div>

              {/* Custom Amount Input */}
              <div>
                <label className="mb-1 block text-[11px] font-bold text-[#7A6048]">
                  Hoặc nhập số lượng muốn tặng:
                </label>
                <input
                  type="number"
                  min={1}
                  max={Math.max(1, currentBalance)}
                  value={giftAmountInput}
                  onChange={(e) => {
                    setGiftAmountInput(e.target.value);
                    if (giftStatus) setGiftStatus(null);
                  }}
                  className="w-full rounded-xl border border-[#DECBB0] bg-white px-3 py-2 text-sm font-black tabular-nums text-[#3B2A1A] focus:border-[#C78312] focus:outline-none"
                />
              </div>

              <button
                type="button"
                disabled={!canSendGift}
                onClick={() => {
                  const res = onSendGift(player, giftCurrency, parsedGiftAmount);
                  setGiftStatus({ok: res.ok, text: res.message});
                  if (res.ok) soundFX.sparkle();
                }}
                className="flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-xl bg-[#3A9462] px-4 py-2 text-xs font-black text-white shadow-xs transition-transform active:scale-95 disabled:cursor-not-allowed disabled:bg-[#DFD6C9] disabled:text-[#8E8274]"
              >
                <Send className="h-3.5 w-3.5" />
                <span>
                  {parsedGiftAmount <= 0
                    ? 'Nhập số lượng hợp lệ'
                    : currentBalance < parsedGiftAmount
                      ? `Không đủ ${giftCurrency === 'coins' ? 'Xu' : 'CoinGame'}`
                      : `Gửi Tặng ${parsedGiftAmount.toLocaleString('vi-VN')} ${
                          giftCurrency === 'coins' ? 'Xu' : 'CG'
                        }`}
                </span>
              </button>

              {giftStatus && (
                <p
                  className={`rounded-xl px-3 py-2 text-[11px] font-bold leading-relaxed ${
                    giftStatus.ok
                      ? 'bg-[#EAF8EE] text-[#226843]'
                      : 'bg-[#FDF0ED] text-[#A8382B]'
                  }`}
                >
                  {giftStatus.text}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
