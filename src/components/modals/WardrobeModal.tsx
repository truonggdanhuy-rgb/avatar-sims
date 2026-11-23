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
  backpacks: {backpack: 'none'},
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
    (tab === 'backpacks' && (!avatar.backpack || avatar.backpack === 'none')) ||
    (tab === 'handheld' && avatar.handheld === 'none');

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-stone-950/65 p-1.5 sm:p-4"
      onClick={onClose}
    >
      <div
        className="anim-pop flex h-full max-h-[96dvh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border-4 border-[#9C734B] bg-[#FAF3E8] shadow-2xl md:h-[min(86dvh,660px)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mirror Frame Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#E5D5BE] bg-[#F2E5D2] px-3.5 py-2 sm:px-4 sm:py-2.5">
          <div className="flex items-center gap-2">
            <Shirt className="h-4 w-4 text-amber-800" />
            <h2 className="font-display text-sm font-bold text-[#4A3525] sm:text-base">
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
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E3CEB2] text-[#4A3525] transition-transform active:scale-95 sm:h-10 sm:w-10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden min-[500px]:flex-row">
          {/* Live 3D Mirror Character Preview */}
          <div className="relative flex h-40 shrink-0 flex-col items-center justify-center border-b border-[#E5D5BE] bg-gradient-to-b from-[#FFFDF9] to-[#F4E7D3] min-[500px]:h-full min-[500px]:w-[225px] min-[500px]:border-r min-[500px]:border-b-0 sm:w-[250px] md:w-[300px]">
            <AvatarPreview3D avatar={avatar} className="h-full w-full" />
            <span className="pointer-events-none absolute bottom-1.5 text-[10px] font-semibold text-[#6F4E37] sm:bottom-2 sm:text-[11px]">
              Kéo nhân vật để xoay 360°
            </span>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {/* 8 Category Tabs (Matches Shop Exactly) */}
            <div className="custom-scroll flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-[#E5D5BE] bg-[#F6ECDC] px-2.5 py-1.5 sm:px-3 sm:py-2">
              {FASHION_CATEGORIES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => {
                    soundFX.tap();
                    setTab(t.key);
                  }}
                  className={`min-h-[34px] shrink-0 rounded-xl px-3 py-1 text-xs font-semibold whitespace-nowrap transition-colors sm:min-h-[40px] sm:px-3.5 sm:py-1.5 ${
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
              {tab === 'face' && (
                <div className="mb-2.5 flex items-center justify-between gap-2 rounded-2xl border border-[#E5D5BE] bg-[#FBF4EA] px-3 py-2">
                  <span className="text-xs font-bold text-[#5B422E]">
                    Má hồng trên gương mặt
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.tap();
                      onChange({...avatar, blush: !avatar.blush});
                    }}
                    className={`min-h-[32px] rounded-xl px-3 text-xs font-bold transition-colors active:scale-95 ${
                      avatar.blush
                        ? 'bg-[#E57A8D] text-white shadow-xs'
                        : 'bg-[#EADBC6] text-[#5B422E]'
                    }`}
                  >
                    {avatar.blush ? 'Đang bật' : 'Đang tắt'}
                  </button>
                </div>
              )}

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
