import React from 'react';
import {Bike, CheckCircle2, Coins, MapPin, Package, Trash2, X} from 'lucide-react';
import {MAX_JOYBOY_DELIVERIES_PER_DAY} from '../../data/progressionCatalog';
import {JoyboyDeliveryState} from '../../types/game';
import {soundFX} from '../../utils/sound';

interface JoyboyDeliveryModalProps {
  deliveryState: JoyboyDeliveryState;
  onAcceptOrder: () => void;
  onCancelOrder: () => void;
  onClose: () => void;
}

export const JoyboyDeliveryModal: React.FC<JoyboyDeliveryModalProps> = ({
  deliveryState,
  onAcceptOrder,
  onCancelOrder,
  onClose,
}) => {
  const {completedCount, activeOrder} = deliveryState;
  const remainingCount = Math.max(0, MAX_JOYBOY_DELIVERIES_PER_DAY - completedCount);
  const reachedDailyCap = remainingCount <= 0 && !activeOrder;

  return (
    <div
      className="phone-ui fixed inset-0 z-50 flex items-center justify-center bg-stone-950/65 p-3 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="anim-pop flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-3xl border-4 border-[#3E7C99] bg-[#FFF8EB] shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between bg-gradient-to-r from-[#2E82A8] to-[#52A9C9] px-4 py-3 text-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
              <Bike className="h-5 w-5 text-[#FFE57F]" />
            </div>
            <div>
              <h2 className="font-display text-base font-black leading-tight">
                Joyboy · Nghề Giao Hàng
              </h2>
              <p className="text-[11px] font-semibold text-sky-50/90 tabular-nums">
                Đã giao hôm nay: {completedCount}/{MAX_JOYBOY_DELIVERIES_PER_DAY} đơn
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundFX.tap();
              onClose();
            }}
            aria-label="Đóng giao hàng Joyboy"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-white transition active:scale-95 hover:bg-white/30"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 p-4 text-[#4A3525]">
          <div className="rounded-2xl border border-[#C6E1EE] bg-[#EDF7FB] px-3.5 py-2.5 text-xs font-semibold leading-relaxed text-[#225670]">
            &ldquo;Chào bạn! Mình là <b>Joyboy</b> đạp xe khắp Thị Trấn Mây. Nhận bưu kiện rồi mang đến chạm trực tiếp vào NPC người nhận để lấy tiền công nhé!&rdquo;
          </div>

          {activeOrder ? (
            <div className="space-y-3 rounded-2xl border-2 border-[#D98B48] bg-white p-3.5 shadow-xs">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF1E0] text-[#D26A2E]">
                    <Package className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-[#9A5325]">Đơn Đang Nhận</div>
                    <div className="text-sm font-black text-[#3B2A1A]">{activeOrder.parcelName}</div>
                  </div>
                </div>
                <span className="flex shrink-0 items-center gap-1 rounded-xl bg-[#FFF3D4] px-2.5 py-1 text-xs font-black tabular-nums text-[#B06910]">
                  <Coins className="h-3.5 w-3.5 text-amber-500" />
                  +{activeOrder.rewardCoins} Xu
                </span>
              </div>

              <div className="space-y-1.5 rounded-xl border border-[#EFE2CE] bg-[#FAF4EA] p-2.5 text-xs">
                <div className="font-bold text-[#4A3525]">
                  Người nhận: <span className="font-black text-[#266E91]">{activeOrder.targetNpcName}</span>
                </div>
                <div className="flex items-start gap-1 text-[11px] font-semibold text-[#7A6048]">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D96B38]" />
                  <span>{activeOrder.locationHint}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    soundFX.tap();
                    onClose();
                  }}
                  className="flex min-h-[40px] flex-1 items-center justify-center rounded-xl bg-[#2E82A8] px-3 text-xs font-black text-white transition active:scale-95"
                >
                  Đi Giao Ngay
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundFX.tap();
                    onCancelOrder();
                  }}
                  title="Hủy đơn hiện tại"
                  className="flex min-h-[40px] items-center justify-center gap-1 rounded-xl bg-[#EFE0C9] px-3 text-xs font-bold text-[#6E492D] transition active:scale-95"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Hủy đơn</span>
                </button>
              </div>
            </div>
          ) : reachedDailyCap ? (
            <div className="space-y-2 rounded-2xl border-2 border-[#B9DEC5] bg-[#F1FAF4] p-4 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-[#3F945E]" />
              <div className="text-sm font-black text-[#2D6E46]">
                Hôm nay đã hoàn thành đủ {MAX_JOYBOY_DELIVERIES_PER_DAY}/{MAX_JOYBOY_DELIVERIES_PER_DAY} chuyến!
              </div>
              <p className="text-xs font-semibold text-[#4D7D5F]">
                Quay lại Quảng Trường gặp Joyboy vào ngày mai để nhận thêm đơn giao hàng mới nhé.
              </p>
            </div>
          ) : (
            <div className="space-y-3 rounded-2xl border border-[#E0CEB6] bg-white p-4 text-center">
              <div className="text-sm font-black text-[#3B2A1A]">
                Còn {remainingCount} chuyến giao hàng trong hôm nay
              </div>
              <p className="text-xs font-semibold text-[#7A6048]">
                Mỗi đơn giao tới NPC trong thị trấn hoặc May Mall thưởng <b>55–70 Xu</b> và tính hoàn thành Nhiệm Vụ Ngày!
              </p>
              <button
                type="button"
                onClick={() => {
                  soundFX.sparkle();
                  onAcceptOrder();
                }}
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl bg-[#D96B38] px-4 text-sm font-black text-white shadow-sm transition hover:bg-[#C25A2B] active:scale-98"
              >
                <Package className="h-4 w-4" />
                <span>Nhận Đơn Giao Hàng Mới</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
