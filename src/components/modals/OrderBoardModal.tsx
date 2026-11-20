import React, {useState} from 'react';
import {ClipboardList, Coins, PackageCheck, RefreshCw, X} from 'lucide-react';
import {
  CROP_LIST,
  getFarmItemColor,
  getFarmItemCount,
  getFarmItemDirectSellPrice,
  getFarmItemName,
  PROCESSED_LIST,
  RECIPE_LIST,
} from '../../data/farmCatalog';
import {FarmInventory, FarmItemKind, FarmOrder} from '../../types/game';
import {soundFX} from '../../utils/sound';

interface OrderBoardModalProps {
  coins: number;
  orders: FarmOrder[];
  inventory: FarmInventory;
  onFulfillOrder: (orderId: string) => void;
  onRefreshOrder: (orderId: string) => void;
  onDirectSell: (kind: FarmItemKind, id: string, qty: number) => void;
  onClose: () => void;
}

export const OrderBoardModal: React.FC<OrderBoardModalProps> = ({
  coins,
  orders,
  inventory,
  onFulfillOrder,
  onRefreshOrder,
  onDirectSell,
  onClose,
}) => {
  const [tab, setTab] = useState<'orders' | 'storage'>('orders');

  const stockItems: {kind: FarmItemKind; id: string; qty: number}[] = [];
  for (const c of CROP_LIST) {
    const qty = getFarmItemCount(inventory, 'crop', c.id);
    if (qty > 0) stockItems.push({kind: 'crop', id: c.id, qty});
  }
  for (const prodId of ['egg', 'pork', 'milk'] as const) {
    const qty = getFarmItemCount(inventory, 'animal_product', prodId);
    if (qty > 0) stockItems.push({kind: 'animal_product', id: prodId, qty});
  }
  for (const p of PROCESSED_LIST) {
    const qty = getFarmItemCount(inventory, 'processed', p.id);
    if (qty > 0) stockItems.push({kind: 'processed', id: p.id, qty});
  }
  for (const r of RECIPE_LIST) {
    const qty = getFarmItemCount(inventory, 'dish', r.id);
    if (qty > 0) stockItems.push({kind: 'dish', id: r.id, qty});
  }

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-stone-950/65 p-3 sm:p-5"
      onClick={onClose}
    >
      <div
        className="anim-pop flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border-4 border-[#9C734B] bg-[#FAF3E8] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#E5D5BE] bg-[#F2E5D2] px-4 py-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-[#8C5B32]" />
            <h2 className="font-display text-base font-bold text-[#4A3525]">
              Bảng Đơn Hàng & Kho Nông Sản
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-xl border border-[#DFC7A5] bg-[#FFF8EB] px-2.5 py-1 text-xs font-bold tabular-nums text-[#6F4E37]">
              <Coins className="h-3.5 w-3.5 text-amber-500" />
              <span>{coins} Xu</span>
            </div>
            <button
              type="button"
              onClick={() => {
                soundFX.tap();
                onClose();
              }}
              aria-label="Đóng bảng đơn hàng"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E3CEB2] text-[#4A3525] active:scale-95"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 border-b border-[#E5D5BE] bg-[#F6ECDC] px-4 py-2">
          <button
            type="button"
            onClick={() => {
              soundFX.tap();
              setTab('orders');
            }}
            className={`min-h-[40px] rounded-xl px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
              tab === 'orders'
                ? 'bg-[#6F4E37] text-amber-50 shadow-xs'
                : 'bg-[#EADBC6] text-[#5B422E] hover:bg-[#DFCCB0]'
            }`}
          >
            Đơn Hàng ({orders.length})
          </button>
          <button
            type="button"
            onClick={() => {
              soundFX.tap();
              setTab('storage');
            }}
            className={`min-h-[40px] rounded-xl px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
              tab === 'storage'
                ? 'bg-[#6F4E37] text-amber-50 shadow-xs'
                : 'bg-[#EADBC6] text-[#5B422E] hover:bg-[#DFCCB0]'
            }`}
          >
            Kho & Bán Lẻ ({stockItems.reduce((sum, s) => sum + s.qty, 0)})
          </button>
        </div>

        <div className="custom-scroll flex-1 overflow-y-auto p-4 text-[#4A3525]">
          {tab === 'orders' ? (
            <div className="space-y-3">
              {orders.map((order) => {
                const canFulfill = order.requirements.every(
                  (req) => getFarmItemCount(inventory, req.kind, req.id) >= req.qty,
                );

                return (
                  <div
                    key={order.id}
                    className="flex flex-col justify-between gap-3 rounded-2xl border border-[#E0CEB6] bg-white p-4 sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-[#4A3525]">
                          {order.customerName}
                        </span>
                        <span className="text-xs text-[#7A6048]">· {order.title}</span>
                      </div>

                      <div className="space-y-1">
                        {order.requirements.map((req) => {
                          const have = getFarmItemCount(inventory, req.kind, req.id);
                          const ok = have >= req.qty;
                          return (
                            <div
                              key={`${order.id}_${req.id}`}
                              className="flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                                  style={{backgroundColor: getFarmItemColor(req.kind, req.id)}}
                                />
                                <span className="font-medium text-[#5B422E]">
                                  {getFarmItemName(req.kind, req.id)}
                                </span>
                              </div>
                              <span
                                className={`font-bold tabular-nums ${
                                  ok ? 'text-[#4B8A5B]' : 'text-[#C2515E]'
                                }`}
                              >
                                {have}/{req.qty}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
                      <button
                        type="button"
                        disabled={!canFulfill}
                        onClick={() => {
                          soundFX.sparkle();
                          onFulfillOrder(order.id);
                        }}
                        className={`flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-xl px-4 text-xs font-bold tabular-nums transition-transform active:scale-95 sm:w-full ${
                          canFulfill
                            ? 'bg-[#6BA383] text-white shadow-xs'
                            : 'cursor-not-allowed bg-[#E6DDD1] text-[#9B8C7E]'
                        }`}
                      >
                        <PackageCheck className="h-4 w-4" />
                        <span>Giao Đơn · +{order.rewardCoins} Xu</span>
                      </button>

                      <button
                        type="button"
                        disabled={coins < 5}
                        onClick={() => {
                          soundFX.tap();
                          onRefreshOrder(order.id);
                        }}
                        className={`flex min-h-[34px] items-center justify-center gap-1 rounded-xl border px-3 text-[11px] font-semibold tabular-nums transition-transform active:scale-95 ${
                          coins >= 5
                            ? 'border-[#DFCCB0] bg-[#FAF3E8] text-[#6F4E37]'
                            : 'cursor-not-allowed border-[#E6DDD1] bg-[#F4EFE8] text-[#A99B8C]'
                        }`}
                      >
                        <RefreshCw className="h-3 w-3" />
                        <span>Đổi đơn (5 Xu)</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : stockItems.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-[#DFCCB0] bg-[#FFFDF9] p-6 text-center">
              <div className="text-sm font-bold text-[#6F4E37]">Kho nông sản đang trống</div>
              <div className="mt-1 text-xs text-[#8A6D53]">
                Hãy trồng cây ở các ô đất và chế biến tại Máy Ép hoặc Bếp Nông Trại nhé.
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="text-xs text-[#7A6048]">
                Mẹo: Giao theo Đơn Hàng ở tab bên cạnh luôn lời hơn so với bán lẻ trực tiếp.
              </div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {stockItems.map((item) => {
                  const unitPrice = getFarmItemDirectSellPrice(item.kind, item.id);
                  return (
                    <div
                      key={`${item.kind}_${item.id}`}
                      className="flex items-center justify-between gap-2 rounded-2xl border border-[#E0CEB6] bg-white p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="h-3 w-3 shrink-0 rounded-full"
                            style={{backgroundColor: getFarmItemColor(item.kind, item.id)}}
                          />
                          <span className="truncate text-xs font-bold text-[#4A3525]">
                            {getFarmItemName(item.kind, item.id)}
                          </span>
                        </div>
                        <div className="mt-0.5 text-[11px] tabular-nums text-[#7A6048]">
                          Đang có: {item.qty} · Giá lẻ {unitPrice} Xu
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            soundFX.sparkle();
                            onDirectSell(item.kind, item.id, 1);
                          }}
                          className="min-h-[34px] rounded-xl bg-[#D99B58] px-2.5 text-[11px] font-bold text-white transition-transform active:scale-95"
                        >
                          Bán 1
                        </button>
                        {item.qty > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              soundFX.sparkle();
                              onDirectSell(item.kind, item.id, item.qty);
                            }}
                            className="min-h-[34px] rounded-xl bg-[#8C6239] px-2.5 text-[11px] font-bold text-white transition-transform active:scale-95"
                          >
                            Hết
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
