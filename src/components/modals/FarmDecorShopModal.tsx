import React, {useState} from 'react';
import {Coins, ShoppingBag, Trees, X} from 'lucide-react';
import {FARM_DECOR_CATALOG, FARM_DECOR_CATEGORIES} from '../../data/farmDecorCatalog';
import {FarmDecorCatalogItem, FarmDecorCategory, PlacedFarmDecor} from '../../types/game';
import {soundFX} from '../../utils/sound';
import {FarmDecorIcon} from '../FarmDecorIcons';

interface FarmDecorShopModalProps {
  coins: number;
  inventory: Record<string, number>;
  placed: PlacedFarmDecor[];
  onBuyItem: (item: FarmDecorCatalogItem) => void;
  onOpenBag: () => void;
  onClose: () => void;
}

export const FarmDecorShopModal: React.FC<FarmDecorShopModalProps> = ({
  coins,
  inventory,
  placed,
  onBuyItem,
  onOpenBag,
  onClose,
}) => {
  const [tab, setTab] = useState<'all' | FarmDecorCategory>('all');

  const placedCounts: Record<string, number> = {};
  for (const p of placed) {
    placedCounts[p.catalogId] = (placedCounts[p.catalogId] || 0) + 1;
  }

  const items = FARM_DECOR_CATALOG.filter((item) => tab === 'all' || item.category === tab);

  return (
    <div
      className="phone-ui fixed inset-0 z-50 flex items-center justify-center bg-stone-950/65 p-2.5 sm:p-5"
      onClick={onClose}
    >
      <div
        className="anim-pop flex h-full max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border-4 border-[#5C874D] bg-[#F7FAEE] shadow-2xl md:h-[min(86dvh,650px)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#D7E3C5] bg-[#E8F2D9] px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Trees className="h-4 w-4 text-[#427A3A]" />
            <h2 className="font-display text-base font-bold text-[#2F4A28]">
              Sạp Trang Trí Nông Trại
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                soundFX.tap();
                onOpenBag();
              }}
              className="rounded-xl border border-[#8EB67E] bg-white px-2.5 py-1 text-xs font-bold text-[#3C6E33] transition active:scale-95"
            >
              Túi Trang Trí
            </button>
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
              aria-label="Đóng sạp trang trí nông trại"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D7E6C4] text-[#2F4A28] transition-transform active:scale-95"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="custom-scroll flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-[#D7E3C5] bg-[#F0F7E6] px-3 py-2">
          {FARM_DECOR_CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => {
                soundFX.tap();
                setTab(c.key);
              }}
              className={`min-h-[38px] shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                tab === c.key
                  ? 'bg-[#468240] text-white shadow-xs'
                  : 'bg-[#DFECD1] text-[#395731] hover:bg-[#CEE0BD]'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="custom-scroll flex-1 overflow-y-auto p-3 text-[#2F4A28]">
          <div className="grid grid-cols-2 gap-2.5 pb-2 sm:grid-cols-3 md:grid-cols-4">
            {items.map((item) => {
              const ownedTotal = (inventory[item.id] || 0) + (placedCounts[item.id] || 0);
              const canAfford = coins >= item.price;

              return (
                <div
                  key={item.id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-[#D4E2C6] bg-white shadow-2xs"
                >
                  <div className="relative flex h-24 w-full items-center justify-center bg-[#F4F9EB] p-2">
                    <FarmDecorIcon item={item} />
                    {ownedTotal > 0 && (
                      <span className="absolute top-1.5 right-1.5 rounded-lg bg-[#E4F3DD] px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-[#356D2F]">
                        Đã có: {ownedTotal}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col justify-between gap-2 p-2.5">
                    <div>
                      <div className="line-clamp-2 text-xs font-bold leading-snug text-[#2F4A28]">
                        {item.name}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-[#5F7558]">
                        {item.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={!canAfford}
                      onClick={() => {
                        if (!canAfford) {
                          soundFX.tap();
                          return;
                        }
                        soundFX.sparkle();
                        onBuyItem(item);
                      }}
                      className={`flex min-h-[36px] w-full items-center justify-center gap-1 rounded-xl px-2 text-xs font-bold tabular-nums transition-transform active:scale-95 ${
                        canAfford
                          ? 'bg-[#468240] text-white shadow-xs hover:bg-[#3A6D35]'
                          : 'cursor-not-allowed bg-[#E5EBDF] text-[#8E9B87]'
                      }`}
                    >
                      <ShoppingBag className="h-3.5 w-3.5" />
                      <span>Mua · {item.price} Xu</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
