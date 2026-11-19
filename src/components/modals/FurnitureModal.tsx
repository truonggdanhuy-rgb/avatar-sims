import React, {useState} from 'react';
import {Armchair, PackageCheck, Plus, X} from 'lucide-react';
import {FURNITURE_CATALOG, FURNITURE_CATEGORIES} from '../../data/furnitureCatalog';
import {FurnitureCatalogItem, FurnitureCategory, PlacedFurniture} from '../../types/game';
import {soundFX} from '../../utils/sound';

interface FurnitureModalProps {
  inventory: Record<string, number>;
  placed: PlacedFurniture[];
  onPlaceItem: (catalogId: string) => void;
  onClose: () => void;
}

export const FurnitureSvgPreview: React.FC<{item: FurnitureCatalogItem}> = ({item}) => {
  const c = item.color;
  const a = item.accentColor || '#9E734B';

  switch (item.kind) {
    case 'sofa':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="8" y="14" width="48" height="18" rx="6" fill={a} />
          <rect x="6" y="24" width="52" height="16" rx="5" fill={c} />
          <rect x="12" y="40" width="6" height="6" rx="2" fill="#7A5230" />
          <rect x="46" y="40" width="6" height="6" rx="2" fill="#7A5230" />
        </svg>
      );
    case 'armchair':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="16" y="12" width="32" height="20" rx="6" fill={a} />
          <rect x="12" y="24" width="40" height="16" rx="5" fill={c} />
          <rect x="18" y="40" width="5" height="6" rx="2" fill="#7A5230" />
          <rect x="41" y="40" width="5" height="6" rx="2" fill="#7A5230" />
        </svg>
      );
    case 'coffee_table':
    case 'dining_table':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="8" y="20" width="48" height="8" rx="3" fill={c} />
          <rect x="14" y="28" width="5" height="16" rx="2" fill={a} />
          <rect x="45" y="28" width="5" height="16" rx="2" fill={a} />
          <rect x="24" y="14" width="16" height="6" rx="2" fill={a} opacity="0.7" />
        </svg>
      );
    case 'tv_stand':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="14" y="8" width="36" height="20" rx="3" fill={a} />
          <rect x="17" y="11" width="30" height="14" rx="2" fill="#8CD3F5" />
          <rect x="8" y="30" width="48" height="14" rx="3" fill={c} />
        </svg>
      );
    case 'bookshelf':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="16" y="6" width="32" height="42" rx="3" fill={c} />
          <rect x="20" y="12" width="24" height="8" rx="1" fill="#FFF4E2" />
          <rect x="20" y="23" width="24" height="8" rx="1" fill="#FFF4E2" />
          <rect x="20" y="34" width="24" height="8" rx="1" fill="#FFF4E2" />
          <rect x="22" y="13" width="5" height="7" fill={a} />
          <rect x="29" y="13" width="5" height="7" fill="#6BA383" />
          <rect x="24" y="24" width="5" height="7" fill="#69B3E7" />
        </svg>
      );
    case 'rug_round':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <ellipse cx="32" cy="28" rx="24" ry="15" fill={c} />
          <ellipse cx="32" cy="28" rx="16" ry="10" fill={a} />
        </svg>
      );
    case 'bed':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="12" y="10" width="40" height="16" rx="4" fill={a} />
          <rect x="16" y="16" width="14" height="8" rx="3" fill="#FFFDF8" />
          <rect x="34" y="16" width="14" height="8" rx="3" fill="#FFFDF8" />
          <rect x="10" y="24" width="44" height="20" rx="4" fill={c} />
        </svg>
      );
    case 'wardrobe':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="15" y="6" width="34" height="42" rx="4" fill={c} />
          <rect x="19" y="12" width="11" height="30" rx="2" fill="#C59363" />
          <rect x="34" y="12" width="11" height="26" rx="2" fill={a} />
        </svg>
      );
    case 'nightstand':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <polygon points="24,10 40,10 43,20 21,20" fill={a} />
          <rect x="30" y="20" width="4" height="6" fill="#8C5E3A" />
          <rect x="18" y="26" width="28" height="20" rx="3" fill={c} />
          <rect x="22" y="30" width="20" height="6" rx="1.5" fill="#E8C79B" />
        </svg>
      );
    case 'dining_chair':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="22" y="10" width="20" height="16" rx="3" fill={c} />
          <rect x="20" y="26" width="24" height="6" rx="2" fill={a} />
          <rect x="22" y="32" width="4" height="14" fill={c} />
          <rect x="38" y="32" width="4" height="14" fill={c} />
        </svg>
      );
    case 'fridge':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="20" y="6" width="24" height="42" rx="4" fill={c} stroke="#D5C6B2" strokeWidth="1.5" />
          <line x1="20" y1="22" x2="44" y2="22" stroke={a} strokeWidth="2" />
          <rect x="24" y="12" width="3" height="7" rx="1" fill={a} />
          <rect x="24" y="27" width="3" height="10" rx="1" fill={a} />
        </svg>
      );
    case 'dish_cabinet':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="14" y="8" width="36" height="20" rx="3" fill={c} />
          <rect x="18" y="11" width="12" height="14" rx="1.5" fill={a} />
          <rect x="34" y="11" width="12" height="14" rx="1.5" fill={a} />
          <rect x="12" y="28" width="40" height="18" rx="3" fill={c} />
        </svg>
      );
    case 'bathtub':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="10" y="20" width="44" height="18" rx="8" fill={c} stroke="#CBD5DF" strokeWidth="1.5" />
          <ellipse cx="32" cy="22" rx="17" ry="4" fill={a} />
          <rect x="45" y="12" width="4" height="9" rx="1" fill="#B8C4CE" />
        </svg>
      );
    case 'vanity_sink':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="20" y="8" width="24" height="18" rx="3" fill={a} stroke="#C7B6A0" strokeWidth="1.5" />
          <rect x="15" y="28" width="34" height="18" rx="3" fill={c} stroke="#D5C6B2" strokeWidth="1.5" />
          <ellipse cx="32" cy="28" rx="8" ry="3" fill="#FFFFFF" />
        </svg>
      );
    case 'floor_lamp':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <polygon points="24,8 40,8 45,22 19,22" fill={c} />
          <rect x="30" y="22" width="4" height="22" fill={a} />
          <ellipse cx="32" cy="45" rx="10" ry="3.5" fill={a} />
        </svg>
      );
    case 'potted_plant':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <circle cx="32" cy="20" r="10" fill={c} />
          <circle cx="24" cy="24" r="7" fill={c} />
          <circle cx="40" cy="24" r="7" fill={c} />
          <polygon points="23,30 41,30 37,46 27,46" fill={a} />
        </svg>
      );
    case 'window_single':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="18" y="8" width="28" height="34" rx="3" fill={c} />
          <rect x="22" y="12" width="20" height="26" rx="1.5" fill={a} />
          <line x1="32" y1="12" x2="32" y2="38" stroke={c} strokeWidth="2.5" />
          <line x1="22" y1="24" x2="42" y2="24" stroke={c} strokeWidth="2.5" />
          <rect x="15" y="42" width="34" height="4" rx="1.5" fill="#EDE0CC" />
        </svg>
      );
    case 'window_double':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="10" y="9" width="44" height="33" rx="3" fill={c} />
          <rect x="14" y="13" width="16" height="25" rx="1.5" fill={a} />
          <rect x="34" y="13" width="16" height="25" rx="1.5" fill={a} />
          <line x1="14" y1="24" x2="30" y2="24" stroke={c} strokeWidth="2" />
          <line x1="34" y1="24" x2="50" y2="24" stroke={c} strokeWidth="2" />
          <rect x="7" y="42" width="50" height="4" rx="1.5" fill="#EDE0CC" />
        </svg>
      );
    case 'window_curtain':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="14" y="11" width="36" height="30" rx="2.5" fill={c} />
          <rect x="18" y="14" width="28" height="24" rx="1.5" fill="#BFE9FA" />
          <line x1="8" y1="8" x2="56" y2="8" stroke="#7A5230" strokeWidth="3" strokeLinecap="round" />
          <rect x="11" y="9" width="11" height="35" rx="3" fill={a} />
          <rect x="42" y="9" width="11" height="35" rx="3" fill={a} />
          <rect x="12" y="41" width="40" height="4" rx="1.5" fill="#EDE0CC" />
        </svg>
      );
    case 'wall_clock':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <circle cx="32" cy="27" r="18" fill={c} />
          <circle cx="32" cy="27" r="14" fill={a} />
          <line x1="32" y1="27" x2="32" y2="17" stroke="#4A3525" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="32" y1="27" x2="40" y2="27" stroke="#4A3525" strokeWidth="2" strokeLinecap="round" />
          <circle cx="32" cy="27" r="2.2" fill="#F4C95D" />
        </svg>
      );
  }
};

export const FurnitureModal: React.FC<FurnitureModalProps> = ({
  inventory,
  placed,
  onPlaceItem,
  onClose,
}) => {
  const [tab, setTab] = useState<'all' | FurnitureCategory>('all');

  const placedCounts: Record<string, number> = {};
  for (const p of placed) {
    placedCounts[p.catalogId] = (placedCounts[p.catalogId] || 0) + 1;
  }

  const visibleItems = FURNITURE_CATALOG.filter((item) => {
    const inStorage = inventory[item.id] || 0;
    const isPlaced = placedCounts[item.id] || 0;
    if (inStorage === 0 && isPlaced === 0) return false;
    return tab === 'all' || item.category === tab;
  });

  const totalStored = Object.values(inventory).reduce((sum, n) => sum + n, 0);

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-stone-950/65 p-2.5 sm:p-5"
      onClick={onClose}
    >
      <div
        className="anim-pop flex h-full max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border-4 border-[#9C734B] bg-[#FAF3E8] shadow-2xl md:h-[min(85dvh,640px)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#E5D5BE] bg-[#F2E5D2] px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Armchair className="h-4 w-4 text-amber-800" />
            <h2 className="font-display text-base font-bold text-[#4A3525]">
              Tủ Nội Thất ({totalStored} món trong tủ)
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              soundFX.tap();
              onClose();
            }}
            aria-label="Đóng tủ nội thất"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E3CEB2] text-[#4A3525] transition-transform active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
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
                  ? 'bg-[#6F4E37] text-amber-50 shadow-xs'
                  : 'bg-[#EADBC6] text-[#5B422E] hover:bg-[#DFCCB0]'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Visual Furniture Inventory Grid */}
        <div className="custom-scroll flex-1 overflow-y-auto p-3 text-[#4A3525]">
          <div className="grid grid-cols-2 gap-2.5 pb-2 sm:grid-cols-3 md:grid-cols-4">
            {visibleItems.map((item) => {
              const storedCount = inventory[item.id] || 0;
              const placedCount = placedCounts[item.id] || 0;

              return (
                <div
                  key={item.id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-[#E0CEB6] bg-white shadow-2xs"
                >
                  <div className="relative flex h-24 w-full items-center justify-center bg-[#FBF6EE] p-2">
                    <FurnitureSvgPreview item={item} />
                    {storedCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 rounded-lg bg-[#6F4E37] px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-amber-50">
                        x{storedCount}
                      </span>
                    )}
                    {placedCount > 0 && (
                      <span className="absolute top-1.5 left-1.5 flex items-center gap-0.5 rounded-lg bg-[#E7F3EC] px-1.5 py-0.5 text-[10px] font-bold text-[#3B7A57]">
                        <PackageCheck className="h-3 w-3" />
                        {placedCount}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col justify-between gap-2 p-2.5">
                    <span className="line-clamp-2 min-h-[32px] text-xs font-bold leading-snug text-[#4A3525]">
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
                          ? 'bg-[#6BA383] text-white shadow-xs'
                          : 'cursor-not-allowed bg-[#EAE2D6] text-[#9A8B7C]'
                      }`}
                    >
                      {storedCount > 0 ? (
                        <>
                          <Plus className="h-3.5 w-3.5" />
                          <span>Đặt ra nhà</span>
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
            <div className="flex h-40 items-center justify-center px-6 text-center text-xs font-medium leading-relaxed text-[#7A6048]">
              Tủ nội thất hiện chưa có món nào trong mục này. Hãy ghé Cửa Hàng gặp Bob để mua thêm đồ trang trí nhé!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
