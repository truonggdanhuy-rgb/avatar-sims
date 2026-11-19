import React, {useState} from 'react';
import {Armchair, Coins, ShoppingBag, X} from 'lucide-react';
import {FURNITURE_CATALOG, FURNITURE_CATEGORIES} from '../../data/furnitureCatalog';
import {FurnitureCatalogItem, FurnitureCategory, PlacedFurniture} from '../../types/game';
import {soundFX} from '../../utils/sound';
import {FurnitureSvgPreview} from './FurnitureModal';

interface FurnitureShopModalProps {
  coins: number;
  inventory: Record<string, number>;
  placed: PlacedFurniture[];
  onBuyItem: (item: FurnitureCatalogItem) => void;
  onClose: () => void;
}

export const FurnitureShopModal: React.FC<FurnitureShopModalProps> = ({
  coins,
  inventory,
  placed,
  onBuyItem,
  onClose,
}) => {
  const [tab, setTab] = useState<'all' | FurnitureCategory>('all');

  const placedCounts: Record<string, number> = {};
  for (const p of placed) {
    placedCounts[p.catalogId] = (placedCounts[p.catalogId] || 0) + 1;
  }

  const items = FURNITURE_CATALOG.filter(
    (item) => tab === 'all' || item.category === tab,
  );

  const handleBuy = (item: FurnitureCatalogItem) => {
    if (coins < item.price) {
      soundFX.tap();
      return;
    }
    soundFX.sparkle();
    onBuyItem(item);
  };

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-stone-950/65 p-2.5 sm:p-5"
      onClick={onClose}
    >
      <div
        className="anim-pop flex h-full max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border-4 border-[#9C734B] bg-[#FAF3E8] shadow-2xl md:h-[min(86dvh,650px)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Shop Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#E5D5BE] bg-[#F2E5D2] px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Armchair className="h-4 w-4 text-[#4B7F62]" />
            <h2 className="font-display text-base font-bold text-[#4A3525]">
              Cửa Hàng Nội Thất của Bob
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
              aria-label="Đóng cửa hàng nội thất"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E3CEB2] text-[#4A3525] transition-transform active:scale-95"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="custom-scroll flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-[#E5D5BE] bg-[#F6ECDC] px-3 py-2">
          {FURNITURE_CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => {
                soundFX.tap();
                setTab(c.key);
              }}
              className={`min-h-[38px] shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                tab === c.key
                  ? 'bg-[#4B7F62] text-white shadow-xs'
                  : 'bg-[#EADBC6] text-[#5B422E] hover:bg-[#DFCCB0]'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Furniture Catalog Grid */}
        <div className="custom-scroll flex-1 overflow-y-auto p-3 text-[#4A3525]">
          <div className="grid grid-cols-2 gap-2.5 pb-2 sm:grid-cols-3 md:grid-cols-4">
            {items.map((item) => {
              const ownedTotal = (inventory[item.id] || 0) + (placedCounts[item.id] || 0);
              const canAfford = coins >= item.price;

              return (
                <div
                  key={item.id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-[#E0CEB6] bg-white shadow-2xs"
                >
                  <div className="relative flex h-24 w-full items-center justify-center bg-[#FBF6EE] p-2">
                    <FurnitureSvgPreview item={item} />
                    {ownedTotal > 0 && (
                      <span className="absolute top-1.5 right-1.5 rounded-lg bg-[#E7F3EC] px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-[#3B7A57]">
                        Đã có: {ownedTotal}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col justify-between gap-2 p-2.5">
                    <span className="line-clamp-2 min-h-[32px] text-xs font-bold leading-snug text-[#4A3525]">
                      {item.name}
                    </span>

                    <button
                      type="button"
                      disabled={!canAfford}
                      onClick={() => handleBuy(item)}
                      className={`flex min-h-[36px] w-full items-center justify-center gap-1 rounded-xl px-2 text-xs font-bold tabular-nums transition-transform active:scale-95 ${
                        canAfford
                          ? 'bg-[#4B7F62] text-white shadow-xs hover:bg-[#3F6D54]'
                          : 'cursor-not-allowed bg-[#EAE2D6] text-[#9A8B7C]'
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
