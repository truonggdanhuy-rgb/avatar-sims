import React, {useState} from 'react';
import {Check, Shirt, X} from 'lucide-react';
import {FASHION_CATEGORIES, SHOP_ITEMS} from '../../data/avatarCatalog';
import {AvatarConfig, ShopCategory, ShopItem} from '../../types/game';
import {soundFX} from '../../utils/sound';
import {AvatarPreview3D} from '../AvatarPreview3D';
import {GarmentPreview} from '../GarmentPreview';

interface WardrobeModalProps {
  avatar: AvatarConfig;
  ownedIds: string[];
  onChange: (next: AvatarConfig) => void;
  onClose: () => void;
}

const OPTIONAL_UNEQUIP_PATCH: Partial<Record<ShopCategory, Partial<AvatarConfig>>> = {
  head: {headItem: 'none'},
  accessories: {accessory: 'none'},
  handheld: {handheld: 'none'},
};

function isItemEquipped(avatar: AvatarConfig, item: ShopItem): boolean {
  const entries = Object.entries(item.patch) as [keyof AvatarConfig, unknown][];
  return entries.every(([k, v]) => avatar[k] === v);
}

export const WardrobeModal: React.FC<WardrobeModalProps> = ({
  avatar,
  ownedIds,
  onChange,
  onClose,
}) => {
  const [tab, setTab] = useState<ShopCategory>('tops');

  const ownedInCategory = SHOP_ITEMS.filter(
    (item) => item.category === tab && (ownedIds.includes(item.id) || item.price === 0),
  );
  const unequipPatch = OPTIONAL_UNEQUIP_PATCH[tab];
  const isUnequipped =
    (tab === 'head' && avatar.headItem === 'none') ||
    (tab === 'accessories' && avatar.accessory === 'none') ||
    (tab === 'handheld' && avatar.handheld === 'none');

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-stone-950/65 p-2.5 sm:p-5"
      onClick={onClose}
    >
      <div
        className="anim-pop flex h-full max-h-[94dvh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border-4 border-[#9C734B] bg-[#FAF3E8] shadow-2xl md:h-[min(86dvh,660px)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mirror Frame Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#E5D5BE] bg-[#F2E5D2] px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Shirt className="h-4 w-4 text-amber-800" />
            <h2 className="font-display text-base font-bold text-[#4A3525]">
              Tủ Đồ Của {avatar.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              soundFX.tap();
              onClose();
            }}
            aria-label="Đóng tủ đồ"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E3CEB2] text-[#4A3525] transition-transform active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
          {/* Live 3D Mirror Character Preview */}
          <div className="relative flex h-44 shrink-0 flex-col items-center justify-center border-b border-[#E5D5BE] bg-gradient-to-b from-[#FFFDF9] to-[#F4E7D3] md:h-full md:w-[300px] md:border-r md:border-b-0">
            <AvatarPreview3D avatar={avatar} className="h-full w-full" />
            <span className="pointer-events-none absolute bottom-2 text-[11px] font-semibold text-[#6F4E37]">
              Kéo nhân vật để xoay 360°
            </span>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {/* 8 Category Tabs (Matches Shop Exactly) */}
            <div className="custom-scroll flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-[#E5D5BE] bg-[#F6ECDC] px-3 py-2">
              {FASHION_CATEGORIES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => {
                    soundFX.tap();
                    setTab(t.key);
                  }}
                  className={`min-h-[40px] shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                    tab === t.key
                      ? 'bg-[#6F4E37] text-amber-50 shadow-xs'
                      : 'bg-[#EADBC6] text-[#5B422E] hover:bg-[#DFCCB0]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Scrollable Owned Items Grid */}
            <div className="custom-scroll flex-1 overflow-y-auto p-3 text-[#4A3525]">
              <div className="grid grid-cols-2 gap-2.5 pb-2 sm:grid-cols-3">
                {unequipPatch && (
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.tap();
                      onChange({...avatar, ...unequipPatch});
                    }}
                    className={`flex flex-col overflow-hidden rounded-2xl border text-left transition-transform active:scale-[0.98] ${
                      isUnequipped
                        ? 'border-[#6F4E37] bg-[#FFF8EE]'
                        : 'border-[#E0CEB6] bg-white'
                    }`}
                  >
                    <div className="flex h-24 w-full items-center justify-center bg-[#FBF6EE] p-2">
                      <GarmentPreview
                        category={tab}
                        patch={unequipPatch}
                        size={70}
                      />
                    </div>
                    <div className="flex flex-1 flex-col justify-between gap-1.5 p-2.5">
                      <span className="text-xs font-bold text-[#4A3525]">
                        Không Dùng
                      </span>
                      <span className="text-[11px] font-semibold text-[#7A6048]">
                        {isUnequipped ? 'Đang chọn' : 'Tháo món đang mang'}
                      </span>
                    </div>
                  </button>
                )}

                {ownedInCategory.map((item) => {
                  const equipped = isItemEquipped(avatar, item);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        soundFX.sparkle();
                        onChange({...avatar, ...item.patch});
                      }}
                      className={`flex flex-col overflow-hidden rounded-2xl border text-left transition-transform active:scale-[0.98] ${
                        equipped
                          ? 'border-[#6F4E37] bg-[#FFF8EE]'
                          : 'border-[#E0CEB6] bg-white hover:border-[#C59B6D]'
                      }`}
                    >
                      <div className="flex h-24 w-full items-center justify-center bg-[#FBF6EE] p-2">
                        <GarmentPreview
                          category={item.category}
                          patch={item.patch}
                          size={74}
                        />
                      </div>
                      <div className="flex flex-1 flex-col justify-between gap-1.5 p-2.5">
                        <span className="line-clamp-2 text-xs font-bold leading-snug text-[#4A3525]">
                          {item.name}
                        </span>
                        <div
                          className={`flex items-center gap-1 text-[11px] font-bold ${
                            equipped ? 'text-[#6F4E37]' : 'text-[#6BA383]'
                          }`}
                        >
                          {equipped && <Check className="h-3.5 w-3.5" />}
                          <span>{equipped ? 'Đang mặc' : 'Chạm để mặc'}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {ownedInCategory.length === 0 && !unequipPatch && (
                <div className="flex h-36 items-center justify-center text-center text-xs font-medium text-[#7A6048]">
                  Bạn chưa có món nào trong mục này. Hãy ghé cửa hàng của Tina để mua thêm nhé!
                </div>
              )}

              {ownedInCategory.length === 0 && unequipPatch && (
                <p className="mt-2 text-center text-[11px] font-medium text-[#7A6048]">
                  Ghé cửa hàng của Tina để sưu tầm thêm nhiều món mới cho mục này!
                </p>
              )}
            </div>

            {/* Bottom Confirm */}
            <div className="shrink-0 border-t border-[#E5D5BE] bg-[#F2E5D2] p-3">
              <button
                type="button"
                onClick={() => {
                  soundFX.sparkle();
                  onClose();
                }}
                className="flex h-11 w-full items-center justify-center rounded-2xl bg-[#6F4E37] text-sm font-bold text-amber-50 shadow-sm transition-transform active:scale-[0.98]"
              >
                Xong
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
