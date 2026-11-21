import React from 'react';
import {Anchor, Backpack, CheckCircle2, Coins, Ship, Waves, X} from 'lucide-react';
import {WOODEN_BOAT_PRICE} from '../../data/fishingCatalog';
import {WoodenBoatState} from '../../types/game';
import {WoodenBoatIcon} from '../FishingIcons';

interface ShipShopModalProps {
  coins: number;
  woodenBoat: WoodenBoatState;
  onBuyBoat: () => void;
  onOpenBagBoats: () => void;
  onClose: () => void;
}

export function ShipShopModal({
  coins,
  woodenBoat,
  onBuyBoat,
  onOpenBagBoats,
  onClose,
}: ShipShopModalProps) {
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
        <div className="flex items-center justify-between bg-gradient-to-r from-[#287094] to-[#46A0C2] px-5 py-3.5 text-white">
          <div className="flex items-center gap-2">
            <Anchor className="h-5 w-5 text-[#FFE57F]" />
            <h2 className="text-lg font-black tracking-tight">Sạp Thuyền của Ship</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-black">
              <Coins className="h-3.5 w-3.5 text-[#FFE57F]" />
              {coins} Xu
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng sạp thuyền"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 transition hover:bg-white/30"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="space-y-3 overflow-y-auto p-4">
          <div className="flex items-center gap-2.5 rounded-2xl border border-[#C6E1EE] bg-[#EDF7FB] px-3.5 py-2.5 text-xs font-bold text-[#225670]">
            <Ship className="h-4 w-4 shrink-0 text-[#2E82A8]" />
            <span>
              Ship chào bạn! Bấm vào biển hiệu hình thuyền ở bến gỗ ven sông để chèo thuyền &amp; câu cá sông bất cứ lúc nào.
            </span>
          </div>

          {/* Wooden Boat Card */}
          <div className="space-y-3 rounded-2xl border-2 border-[#E4D3B4] bg-[#FFFDF8] p-4 shadow-xs">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-[#BFE0EE] bg-[#E8F5FA]">
                  <WoodenBoatIcon className="h-12 w-12" />
                </div>
                <div>
                  <div className="text-base font-black text-[#3B2A1A]">Thuyền Gỗ</div>
                  <div className="text-xs font-semibold text-[#6F583E]">
                    Thuyền chèo tay gỗ sồi thủ công
                  </div>
                  <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-[#2B7C9E]">
                    <Waves className="h-3.5 w-3.5" />
                    Chèo sông Khu Sinh Thái &amp; chuẩn bị bơi ra Biển
                  </div>
                </div>
              </div>
              <span className="shrink-0 rounded-full border border-[#E7C878] bg-[#FFF2D2] px-2.5 py-1 text-xs font-black text-[#A86914]">
                {WOODEN_BOAT_PRICE} Xu
              </span>
            </div>

            <div className="rounded-xl border border-[#ECE1CC] bg-[#FAF3E6] px-3 py-2.5 text-[11px] font-semibold leading-relaxed text-[#5C452C]">
              • Chèo tự do dọc dòng sông Khu Sinh Thái bằng Joystick hoặc chạm mặt nước.<br />
              • Đang đứng trên thuyền vẫn quăng Cần Câu Gỗ xuống sông câu cá như thường.<br />
              • Hành trang thiết yếu để mở khóa chuyến hải trình bơi ra <b>Biển</b> ở bản cập nhật tới!
            </div>

            {!woodenBoat.owned ? (
              <div className="space-y-2">
                {coins < WOODEN_BOAT_PRICE && (
                  <div className="rounded-xl bg-[#FDECEC] px-3 py-1.5 text-[11px] font-bold text-[#B63535]">
                    Bạn cần thêm {WOODEN_BOAT_PRICE - coins} Xu để mua Thuyền Gỗ.
                  </div>
                )}
                <button
                  type="button"
                  onClick={onBuyBoat}
                  disabled={coins < WOODEN_BOAT_PRICE}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2F84A8] py-2.5 text-sm font-black text-white transition hover:bg-[#256D8C] active:scale-98 disabled:opacity-45"
                >
                  <Coins className="h-4 w-4" />
                  Mua Thuyền Gỗ ({WOODEN_BOAT_PRICE} Xu)
                </button>
              </div>
            ) : (
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between text-xs font-extrabold">
                  <span className="inline-flex items-center gap-1 text-[#2E7D55]">
                    <CheckCircle2 className="h-4 w-4" />
                    Đã sở hữu (trong Túi &gt; Thuyền)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onOpenBagBoats}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#EFE4CF] px-3 py-2.5 text-xs font-black text-[#4E3922] transition hover:bg-[#E3D3B4]"
                >
                  <Backpack className="h-3.5 w-3.5" />
                  Mở Túi &gt; Thuyền
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
