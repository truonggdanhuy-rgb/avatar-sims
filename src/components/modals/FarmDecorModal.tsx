import React, {useState} from 'react';
import {PackageCheck, Plus, Trees, X} from 'lucide-react';
import {FARM_DECOR_CATALOG, FARM_DECOR_CATEGORIES} from '../../data/farmDecorCatalog';
import {FarmDecorCategory, PlacedFarmDecor} from '../../types/game';
import {soundFX} from '../../utils/sound';
import {FarmDecorIcon} from '../FarmDecorIcons';

interface FarmDecorModalProps {
  inventory: Record<string, number>;
  placed: PlacedFarmDecor[];
  tab?: 'all' | FarmDecorCategory;
  onTabChange?: (nextTab: 'all' | FarmDecorCategory) => void;
  onPlaceItem: (catalogId: string) => void;
  onClose: () => void;
}

export const FarmDecorModal: React.FC<FarmDecorModalProps> = ({
  inventory,
  placed,
  tab: controlledTab,
  onTabChange,
  onPlaceItem,
  onClose,
}) => {
  const [internalTab, setInternalTab] = useState<'all' | FarmDecorCategory>('all');
  const tab = controlledTab ?? internalTab;
  const setTab = (next: 'all' | FarmDecorCategory) => {
    setInternalTab(next);
    onTabChange?.(next);
  };

  const placedCounts: Record<string, number> = {};
  for (const p of placed) {
    placedCounts[p.catalogId] = (placedCounts[p.catalogId] || 0) + 1;
  }

  const visibleItems = FARM_DECOR_CATALOG.filter((item) => {
    const inStorage = inventory[item.id] || 0;
    const isPlaced = placedCounts[item.id] || 0;
    if (inStorage === 0 && isPlaced === 0) return false;
    return tab === 'all' || item.category === tab;
  });

  const totalStored = Object.values(inventory).reduce((sum, n) => sum + n, 0);

  return (
    <div
      className="phone-ui fixed inset-0 z-50 flex items-center justify-center bg-stone-950/65 p-2.5 sm:p-5"
      onClick={onClose}
    >
      <div
        className="anim-pop flex h-full max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border-4 border-[#5C874D] bg-[#F7FAEE] shadow-2xl md:h-[min(85dvh,640px)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#D7E3C5] bg-[#E8F2D9] px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Trees className="h-4 w-4 text-[#427A3A]" />
            <h2 className="font-display text-base font-bold text-[#2F4A28]">
              Túi Trang Trí Nông Trại ({totalStored} món trong túi)
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              soundFX.tap();
              onClose();
            }}
            aria-label="Đóng túi trang trí nông trại"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D7E6C4] text-[#2F4A28] transition-transform active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
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
            {visibleItems.map((item) => {
              const storedCount = inventory[item.id] || 0;
              const placedCount = placedCounts[item.id] || 0;

              return (
                <div
                  key={item.id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-[#D4E2C6] bg-white shadow-2xs"
                >
                  <div className="relative flex h-24 w-full items-center justify-center bg-[#F4F9EB] p-2">
                    <FarmDecorIcon item={item} />
                    {storedCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 rounded-lg bg-[#468240] px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white">
                        x{storedCount}
                      </span>
                    )}
                    {placedCount > 0 && (
                      <span className="absolute top-1.5 left-1.5 flex items-center gap-0.5 rounded-lg bg-[#E4F3DD] px-1.5 py-0.5 text-[10px] font-bold text-[#356D2F]">
                        <PackageCheck className="h-3 w-3" />
                        {placedCount}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col justify-between gap-2 p-2.5">
                    <span className="line-clamp-2 min-h-[32px] text-xs font-bold leading-snug text-[#2F4A28]">
                      {item.name}
                    </span>

                    <button
                      type="button"
                      disabled={storedCount <= 0}
                      onClick={() => {
                        if (storedCount <= 0) return;
                        soundFX.sparkle();
                        onPlaceItem(item.id);
                      }}
                      className={`flex min-h-[36px] w-full items-center justify-center gap-1 rounded-xl px-2 text-xs font-bold transition-transform active:scale-95 ${
                        storedCount > 0
                          ? 'bg-[#468240] text-white shadow-xs'
                          : 'cursor-not-allowed bg-[#E5EBDF] text-[#8E9B87]'
                      }`}
                    >
                      {storedCount > 0 ? (
                        <>
                          <Plus className="h-3.5 w-3.5" />
                          <span>Đặt ra vườn</span>
                        </>
                      ) : (
                        <span>Đã đặt hết</span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {visibleItems.length === 0 && (
            <div className="flex h-40 items-center justify-center px-6 text-center text-xs font-medium leading-relaxed text-[#5F7558]">
              Túi trang trí nông trại chưa có món nào trong mục này. Hãy ghé Sạp Trang Trí ở góc vườn để mua hàng rào, cổng hoa hoặc cối xay gió nhé!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
