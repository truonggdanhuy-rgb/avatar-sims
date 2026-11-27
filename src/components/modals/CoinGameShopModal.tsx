import React from 'react';
import {Backpack, Cat, Check, CloudRain, Coins, Gamepad2, Sparkles, Wind, X} from 'lucide-react';
import {COINGAME_SHOP_MOUNTS, MOUNT_RANK_META} from '../../data/mountCatalog';
import {COINGAME_TO_XU_RATE, MountId, OwnedMountsState} from '../../types/game';
import {soundFX} from '../../utils/sound';
import {
  DongThapLotusMountIcon,
  LotusUmbrellaMountIcon,
  WitchBroomMountIcon,
} from '../FishingIcons';

interface CoinGameShopModalProps {
  coinGame: number;
  coins: number;
  ownedMounts: OwnedMountsState;
  onBuyCoinGameMount: (mountId: MountId) => void;
  onToggleMount: (mountId: MountId) => void;
  onOpenBagMounts: () => void;
  onClose: () => void;
}

export const CoinGameShopModal: React.FC<CoinGameShopModalProps> = ({
  coinGame,
  coins,
  ownedMounts,
  onBuyCoinGameMount,
  onToggleMount,
  onOpenBagMounts,
  onClose,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#040B14]/80 p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="anim-pop flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border-2 border-[#34D399]/70 bg-[#0A1F21] text-[#ECFDF5] shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-emerald-400/20 bg-[#0F2D2F] px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#34D399]/60 bg-[#07201E] text-[#34D399]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-black tracking-wide text-white">
                Shop CoinGame Premium
              </div>
              <div className="text-[11px] font-bold text-[#99F6E4]">
                Chỉ mở bán vật phẩm độc quyền bằng CoinGame
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundFX.tap();
              onClose();
            }}
            aria-label="Đóng Shop CoinGame"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white transition active:scale-95"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Balance strip */}
        <div className="grid grid-cols-2 gap-2 border-b border-emerald-400/15 bg-[#08191B] px-4 py-2.5">
          <div className="flex items-center justify-between rounded-2xl border border-[#38BDF8]/40 bg-[#0B1E2E] px-3 py-2">
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#BAE6FD]">
              <Gamepad2 className="h-4 w-4 text-[#38BDF8]" />
              <span>CoinGame</span>
            </span>
            <span className="text-sm font-black tabular-nums text-[#38BDF8]">{coinGame}</span>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-[#FBBF24]/30 bg-[#1B1914] px-3 py-2">
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#FDE68A]">
              <Coins className="h-4 w-4 text-[#FBBF24]" />
              <span>Xu</span>
            </span>
            <span className="text-sm font-black tabular-nums text-[#FBBF24]">{coins}</span>
          </div>
        </div>

        {/* Showcase Cards */}
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {COINGAME_SHOP_MOUNTS.map((mount) => {
            const owned = ownedMounts.ownedIds.includes(mount.id);
            const active = ownedMounts.activeMountId === mount.id;
            const cgPrice = mount.coinGamePrice ?? mount.price;
            const canAfford = coinGame >= cgPrice;
            const rankMeta = MOUNT_RANK_META[mount.rank];

            return (
              <div
                key={mount.id}
                className="rounded-3xl border border-[#34D399]/45 bg-[#102E31] p-4 shadow-md"
              >
                <div className="flex items-start gap-3.5">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-[#34D399]/50 bg-[#081F22] p-2">
                    {mount.kind === 'witch_broom' ? (
                      <WitchBroomMountIcon className="h-16 w-16" />
                    ) : mount.kind === 'dong_thap_lotus' ? (
                      <DongThapLotusMountIcon className="h-16 w-16" />
                    ) : (
                      <LotusUmbrellaMountIcon className="h-16 w-16" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-base font-black text-white">{mount.name}</h3>
                      <span
                        className={`rounded-lg border px-2 py-0.5 text-[10px] font-black ${rankMeta.badgeBg} ${rankMeta.badgeText} ${rankMeta.badgeBorder}`}
                      >
                        {rankMeta.label}
                      </span>
                    </div>

                    <p className="mt-1 text-xs font-semibold leading-relaxed text-[#CCFBF1]">
                      {mount.description}
                    </p>

                    <div className="mt-2.5 grid grid-cols-2 gap-1.5 text-[11px] font-bold">
                      <div className="flex items-center gap-1.5 rounded-xl bg-[#092124] px-2.5 py-1.5 text-[#7DD3FC]">
                        <Wind className="h-3.5 w-3.5 shrink-0" />
                        <span className="tabular-nums">Tốc độ x{mount.speedMultiplier.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 rounded-xl bg-[#092124] px-2.5 py-1.5 text-[#6EE7B7]">
                        {mount.kind === 'witch_broom' ? (
                          <>
                            <Cat className="h-3.5 w-3.5 shrink-0" />
                            <span>Chổi bay + Mèo Đen</span>
                          </>
                        ) : mount.kind === 'dong_thap_lotus' ? (
                          <>
                            <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#F9A8D4]" />
                            <span>Hào quang + Cánh sen</span>
                          </>
                        ) : (
                          <>
                            <CloudRain className="h-3.5 w-3.5 shrink-0" />
                            <span>Ếch + Mây đổ mưa</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/10 pt-3">
                  <div>
                    <div className="text-[10px] font-bold text-[#99F6E4]">Giá độc quyền</div>
                    <div className="flex items-center gap-1.5 text-sm font-black tabular-nums text-[#38BDF8]">
                      <Gamepad2 className="h-4 w-4" />
                      <span>{cgPrice} CoinGame</span>
                      <span className="text-[11px] font-semibold text-[#94A3B8]">
                        (≈ {cgPrice * COINGAME_TO_XU_RATE} Xu)
                      </span>
                    </div>
                  </div>

                  {owned ? (
                    <button
                      type="button"
                      onClick={() => {
                        soundFX.tap();
                        onToggleMount(mount.id);
                      }}
                      className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black transition active:scale-95 ${
                        active
                          ? 'border border-emerald-300/60 bg-emerald-500/20 text-emerald-200'
                          : 'bg-[#34D399] text-[#04241C]'
                      }`}
                    >
                      <Check className="h-4 w-4" />
                      <span>{active ? 'Đang bay (Tháo)' : 'Trang bị ngay'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!canAfford}
                      onClick={() => {
                        if (!canAfford) return;
                        onBuyCoinGameMount(mount.id);
                      }}
                      className={`rounded-xl px-4 py-2 text-xs font-black transition active:scale-95 ${
                        canAfford
                          ? 'bg-[#34D399] text-[#04241C] hover:bg-[#6EE7B7]'
                          : 'cursor-not-allowed border border-white/15 bg-white/10 text-[#94A3B8]'
                      }`}
                    >
                      {canAfford ? `Mua ${cgPrice} CG` : `Thiếu ${cgPrice - coinGame} CG`}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          <div className="rounded-2xl border border-white/10 bg-[#081A1C] p-3 text-xs font-semibold leading-relaxed text-[#A7F3D0]">
            Chơi <strong className="text-white">Đập Chuột</strong>,{' '}
            <strong className="text-white">Hứng Sao</strong>,{' '}
            <strong className="text-white">Sàn Nhảy Rhythm</strong> hoặc thử nhân phẩm tại{' '}
            <strong className="text-white">Gắp Bóng ?</strong> để tích lũy CoinGame săn đồ Premium!
          </div>

          <button
            type="button"
            onClick={() => {
              soundFX.tap();
              onOpenBagMounts();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-[#122F33] py-2.5 text-xs font-black text-[#CCFBF1] transition hover:bg-[#173B40] active:scale-95"
          >
            <Backpack className="h-4 w-4 text-[#34D399]" />
            <span>Mở Balo Thú Cưỡi</span>
          </button>
        </div>
      </div>
    </div>
  );
};
