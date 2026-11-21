import React from 'react';
import {Backpack, CheckCircle2, Coins, Sparkles, Store, X, Zap} from 'lucide-react';
import {MOUNT_LIST, MOUNT_RANK_META, SKATEBOARD_CLASSIC_PRICE} from '../../data/mountCatalog';
import {MountId, OwnedMountsState} from '../../types/game';
import {soundFX} from '../../utils/sound';
import {BicycleMountIcon, MountCarIcon, SkateboardMountIcon} from '../FishingIcons';

interface TunShopModalProps {
  coins: number;
  ownedMounts: OwnedMountsState;
  onBuyMount: (mountId: MountId) => void;
  onToggleMount: (mountId: MountId) => void;
  onOpenBagMounts: () => void;
  onClose: () => void;
}

export function TunShopModal({
  coins,
  ownedMounts,
  onBuyMount,
  onToggleMount,
  onOpenBagMounts,
  onClose,
}: TunShopModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="anim-pop flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border-4 border-[#DFCA9F] bg-[#FFF8EB] shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-[#C84B31] to-[#E36B4B] px-5 py-3.5 text-white">
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-[#FFE57F]" />
            <div>
              <h2 className="text-base font-black tracking-tight sm:text-lg">
                Kumo Motors · Cửa Hàng Xe Tun
              </h2>
              <div className="text-[10px] font-bold text-white/85">
                Tầng 1 May Mall · Ván Trượt &amp; Xe Đạp chính thức
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-black">
              <Coins className="h-3.5 w-3.5 text-[#FFE57F]" />
              {coins} Xu
            </div>
            <button
              type="button"
              onClick={() => {
                soundFX.tap();
                onClose();
              }}
              aria-label="Đóng cửa hàng Tun"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 transition hover:bg-white/30"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="custom-scroll space-y-3 overflow-y-auto p-4">
          <div className="flex items-start gap-2.5 rounded-2xl border border-[#F2C9B8] bg-[#FFF2EB] px-3.5 py-2.5 text-xs font-bold text-[#6E2C1B]">
            <Zap className="mt-0.5 h-4 w-4 shrink-0 text-[#D95338]" />
            <span>
              Tun chào bạn! Các phương tiện <b>Hạng B</b> chạy nhanh hơn đi bộ rõ rệt (Ván trượt giá
              chỉ <b>{SKATEBOARD_CLASSIC_PRICE} Xu</b> ngang Thuyền Gỗ!). Hạng <b>S</b> siêu tốc sẽ
              sớm cập bến.
            </span>
          </div>

          {MOUNT_LIST.map((def) => {
            const owned = ownedMounts.ownedIds.includes(def.id);
            const isActive = ownedMounts.activeMountId === def.id;
            const rankMeta = MOUNT_RANK_META[def.rank];
            const canAfford = coins >= def.price;

            return (
              <div
                key={def.id}
                className={`space-y-3 rounded-2xl border-2 p-4 shadow-xs transition ${
                  isActive
                    ? 'border-[#3CA374] bg-[#F5FFF9]'
                    : 'border-[#E4D3B4] bg-[#FFFDF8]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border ${
                        def.kind === 'skateboard'
                          ? 'border-[#F3C8B8] bg-[#FFF2EB]'
                          : 'border-[#BFE3EB] bg-[#EBF9FC]'
                      }`}
                    >
                      {def.kind === 'skateboard' ? (
                        <SkateboardMountIcon className="h-12 w-12" />
                      ) : (
                        <BicycleMountIcon className="h-12 w-12" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-black text-[#3B2A1A] sm:text-base">
                          {def.name}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-black ${rankMeta.badgeBg} ${rankMeta.badgeText} ${rankMeta.badgeBorder}`}
                        >
                          Hạng {rankMeta.shortTag}
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs font-semibold text-[#6F583E]">
                        {def.description}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 rounded-md bg-[#E8F6EC] px-2 py-0.5 text-[10px] font-black text-[#26734B]">
                          <Zap className="h-3 w-3" />
                          Tốc độ x{def.speedMultiplier.toFixed(2)} đi bộ
                        </span>
                        {def.kind === 'skateboard' && (
                          <span className="rounded-md bg-[#FFF3D6] px-2 py-0.5 text-[10px] font-extrabold text-[#9A6012]">
                            Ngang giá Thuyền Gỗ
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full border border-[#E7C878] bg-[#FFF2D2] px-2.5 py-1 text-xs font-black text-[#A86914]">
                    {def.price} Xu
                  </span>
                </div>

                {!owned ? (
                  <div className="space-y-2">
                    {!canAfford && (
                      <div className="rounded-xl bg-[#FDECEC] px-3 py-1.5 text-[11px] font-bold text-[#B63535]">
                        Bạn cần thêm {def.price - coins} Xu để sở hữu {def.name}.
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        soundFX.sparkle();
                        onBuyMount(def.id);
                      }}
                      disabled={!canAfford}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#D95338] py-2.5 text-sm font-black text-white transition hover:bg-[#BE432B] active:scale-98 disabled:opacity-45"
                    >
                      <Coins className="h-4 w-4" />
                      Mua {def.kind === 'skateboard' ? 'Ván Trượt' : 'Xe Đạp'} ({def.price} Xu)
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 pt-0.5">
                    <div className="flex items-center justify-between text-xs font-extrabold">
                      <span className="inline-flex items-center gap-1 text-[#2E7D55]">
                        <CheckCircle2 className="h-4 w-4" />
                        {isActive ? 'Đang cưỡi phương tiện này' : 'Đã sở hữu (trong Túi > Cưỡi)'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          soundFX.tap();
                          onToggleMount(def.id);
                          if (!isActive) {
                            onClose();
                          }
                        }}
                        className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-black text-white transition active:scale-98 ${
                          isActive
                            ? 'bg-[#6F7B86] hover:bg-[#5B6670]'
                            : 'bg-[#2E9467] hover:bg-[#247953]'
                        }`}
                      >
                        <Zap className="h-3.5 w-3.5" />
                        {isActive ? 'Xuống xe' : 'Cưỡi ngay'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          soundFX.tap();
                          onOpenBagMounts();
                        }}
                        className="flex items-center justify-center gap-1.5 rounded-xl bg-[#EFE4CF] px-3 py-2.5 text-xs font-black text-[#4E3922] transition hover:bg-[#E3D3B4]"
                      >
                        <Backpack className="h-3.5 w-3.5" />
                        Túi Đồ
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Teaser Card for Upcoming Rank S Vehicles */}
          <div className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-[#E6B86A] bg-gradient-to-r from-[#FFF9E8] to-[#FFF2D4] p-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#F0CD86] bg-white">
              <MountCarIcon className="h-10 w-10" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-[#5C2507]">Siêu Xe Mini &amp; Thú Cưỡi Hiếm</span>
                <span className="inline-flex items-center gap-0.5 rounded-md border border-[#E68A1E] bg-gradient-to-r from-[#FFE596] to-[#FFAE52] px-1.5 py-0.5 text-[10px] font-black text-[#5C2507]">
                  <Sparkles className="h-2.5 w-2.5" />
                  Hạng S
                </span>
              </div>
              <p className="mt-0.5 text-[11px] font-semibold leading-snug text-[#7D4B1B]">
                Tốc độ siêu nhanh — đang trưng bày xem trước tại sảnh và sẽ mở bán ở bản cập nhật
                tiếp theo!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
