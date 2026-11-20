import React from 'react';
import {ClipboardList, Coins, PackageCheck, RefreshCw, X} from 'lucide-react';
import {
  getFarmItemColor,
  getFarmItemCount,
  getFarmItemName,
} from '../../data/farmCatalog';
import {FarmInventory, FarmOrder} from '../../types/game';
import {soundFX} from '../../utils/sound';

interface OrderBoardModalProps {
  coins: number;
  orders: FarmOrder[];
  inventory: FarmInventory;
  onFulfillOrder: (orderId: string) => void;
  onRefreshOrder: (orderId: string) => void;
  onClose: () => void;
}

export const OrderBoardModal: React.FC<OrderBoardModalProps> = ({
  coins,
  orders,
  inventory,
  onFulfillOrder,
  onRefreshOrder,
  onClose,
}) => {
  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-stone-950/60 p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="anim-pop flex max-h-[86dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border-[3px] border-[#9C734B] bg-[#FAF3E8] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#E5D5BE] bg-[#F2E5D2] px-3 py-2">
          <div className="flex items-center gap-1.5">
            <ClipboardList className="h-4 w-4 text-[#8C5B32]" />
            <h2 className="font-display text-sm font-bold text-[#4A3525]">
              Bảng Đơn Hàng ({orders.length})
            </h2>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 rounded-lg border border-[#DFC7A5] bg-[#FFF8EB] px-2 py-0.5 text-xs font-bold tabular-nums text-[#6F4E37]">
              <Coins className="h-3 w-3 text-amber-500" />
              <span>{coins}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                soundFX.tap();
                onClose();
              }}
              aria-label="Đóng bảng đơn hàng"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E3CEB2] text-[#4A3525] active:scale-95"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="custom-scroll flex-1 space-y-2 overflow-y-auto p-2.5 text-[#4A3525] sm:p-3">
          {orders.map((order) => {
            const canFulfill = order.requirements.every(
              (req) => getFarmItemCount(inventory, req.kind, req.id) >= req.qty,
            );

            return (
              <div
                key={order.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-[#E0CEB6] bg-white p-2.5"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="truncate text-xs font-bold text-[#4A3525]">
                    {order.customerName}{' '}
                    <span className="font-normal text-[#7A6048]">· {order.title}</span>
                  </div>

                  <div className="flex flex-wrap gap-1 text-[10px]">
                    {order.requirements.map((req) => {
                      const have = getFarmItemCount(inventory, req.kind, req.id);
                      const ok = have >= req.qty;
                      return (
                        <span
                          key={`${order.id}_${req.id}`}
                          className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-semibold tabular-nums ${
                            ok
                              ? 'bg-[#EEF7F0] text-[#3F7B4E]'
                              : 'bg-[#FDF0F2] text-[#C2515E]'
                          }`}
                        >
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{backgroundColor: getFarmItemColor(req.kind, req.id)}}
                          />
                          <span>
                            {getFarmItemName(req.kind, req.id)} {have}/{req.qty}
                          </span>
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    disabled={!canFulfill}
                    onClick={() => {
                      soundFX.sparkle();
                      onFulfillOrder(order.id);
                    }}
                    className={`flex min-h-[30px] items-center gap-1 rounded-lg px-2.5 text-[11px] font-bold tabular-nums transition-transform active:scale-95 ${
                      canFulfill
                        ? 'bg-[#6BA383] text-white shadow-xs'
                        : 'cursor-not-allowed bg-[#E6DDD1] text-[#9B8C7E]'
                    }`}
                  >
                    <PackageCheck className="h-3.5 w-3.5" />
                    <span>+{order.rewardCoins}</span>
                  </button>

                  <button
                    type="button"
                    disabled={coins < 5}
                    onClick={() => {
                      soundFX.tap();
                      onRefreshOrder(order.id);
                    }}
                    title="Đổi đơn (5 Xu)"
                    aria-label="Đổi đơn 5 Xu"
                    className={`flex h-[30px] w-[30px] items-center justify-center rounded-lg border transition-transform active:scale-95 ${
                      coins >= 5
                        ? 'border-[#DFCCB0] bg-[#FAF3E8] text-[#6F4E37]'
                        : 'cursor-not-allowed border-[#E6DDD1] bg-[#F4EFE8] text-[#A99B8C]'
                    }`}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
