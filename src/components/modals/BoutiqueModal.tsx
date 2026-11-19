import React, {useEffect, useState} from 'react';
import {Check, Coins, RotateCcw, ShoppingBag, X} from 'lucide-react';
import {FASHION_CATEGORIES, SHOP_ITEMS} from '../../data/avatarCatalog';
import {AvatarConfig, ShopCategory, ShopItem} from '../../types/game';
import {soundFX} from '../../utils/sound';
import {AvatarPreview3D} from '../AvatarPreview3D';
import {GarmentPreview} from '../GarmentPreview';

interface BoutiqueModalProps {
  avatar: AvatarConfig;
  coins: number;
  ownedIds: string[];
  onBuyItem: (item: ShopItem) => void;
  onEquipAvatar: (next: AvatarConfig) => void;
  onClose: () => void;
}

function isItemEquipped(avatar: AvatarConfig, item: ShopItem): boolean {
  const entries = Object.entries(item.patch) as [keyof AvatarConfig, unknown][];
  return entries.every(([k, v]) => avatar[k] === v);
}

export const BoutiqueModal: React.FC<BoutiqueModalProps> = ({
  avatar,
  coins,
  ownedIds,
  onBuyItem,
  onEquipAvatar,
  onClose,
}) => {
  const [tab, setTab] = useState<ShopCategory>('tops');
  const [previewAvatar, setPreviewAvatar] = useState<AvatarConfig>(avatar);

  useEffect(() => {
    setPreviewAvatar(avatar);
  }, [avatar]);

  const items = SHOP_ITEMS.filter((item) => item.category === tab);
  const isPreviewDirty = JSON.stringify(previewAvatar) !== JSON.stringify(avatar);

  const handleTry = (item: ShopItem) => {
    soundFX.tap();
    setPreviewAvatar((prev) => ({...prev, ...item.patch}));
  };

  const handleEquip = (item: ShopItem) => {
    soundFX.sparkle();
    const next = {...avatar, ...item.patch};
    onEquipAvatar(next);
    setPreviewAvatar(next);
  };

  const handleBuy = (item: ShopItem) => {
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
        className="anim-pop flex h-full max-h-[94dvh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border-4 border-[#9C734B] bg-[#FAF3E8] shadow-2xl md:h-[min(86dvh,660px)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Shop Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#E5D5BE] bg-[#F2E5D2] px-4 py-2.5">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-[#B85769]" />
            <h2 className="font-display text-base font-bold text-[#4A3525]">
              Cửa Hàng của Tina
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
              aria-label="Đóng cửa hàng"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E3CEB2] text-[#4A3525] transition-transform active:scale-95"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
          {/* Live 3D Fitting Preview */}
          <div className="relative flex h-44 shrink-0 flex-col items-center justify-center border-b border-[#E5D5BE] bg-gradient-to-b from-[#FFFDF9] to-[#F7E5DF] md:h-full md:w-[300px] md:border-r md:border-b-0">
            <AvatarPreview3D avatar={previewAvatar} className="h-full w-full" />
            <div className="pointer-events-none absolute bottom-2 flex items-center gap-2">
              <span className="text-[11px] font-semibold text-[#6F4E37]">
                Kéo nhân vật để xoay 360°
              </span>
            </div>
            {isPreviewDirty && (
              <button
                type="button"
                onClick={() => {
                  soundFX.tap();
                  setPreviewAvatar(avatar);
                }}
                className="absolute right-2.5 bottom-2 flex min-h-[34px] items-center gap-1 rounded-xl border border-[#DFC7A5] bg-[#FFF8EB] px-2.5 text-[11px] font-bold text-[#6F4E37] shadow-xs transition-transform active:scale-95 md:top-2.5 md:bottom-auto"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Hoàn tác</span>
              </button>
            )}
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {/* 8 Fashion Category Tabs */}
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
                      ? 'bg-[#B85769] text-white shadow-xs'
                      : 'bg-[#EADBC6] text-[#5B422E] hover:bg-[#DFCCB0]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Scrollable Responsive Visual Garment Grid */}
            <div className="custom-scroll flex-1 overflow-y-auto p-3 text-[#4A3525]">
              <div className="grid grid-cols-2 gap-2.5 pb-2 sm:grid-cols-3">
                {items.map((item) => {
                  const owned = ownedIds.includes(item.id) || item.price === 0;
                  const equipped = isItemEquipped(avatar, item);
                  const previewing = isItemEquipped(previewAvatar, item);
                  const canAfford = coins >= item.price;

                  return (
                    <div
                      key={item.id}
                      className={`flex flex-col overflow-hidden rounded-2xl border transition-colors ${
                        equipped
                          ? 'border-[#B85769] bg-[#FFF6F8]'
                          : previewing
                            ? 'border-[#C59B6D] bg-[#FFFDF8]'
                            : 'border-[#E0CEB6] bg-white'
                      }`}
                    >
                      {/* Visual Garment Display (Tap to try on!) */}
                      <button
                        type="button"
                        onClick={() => handleTry(item)}
                        className="flex h-24 w-full items-center justify-center bg-[#FBF6EE] p-2 transition-transform active:scale-95"
                        aria-label={`Thử ${item.name}`}
                      >
                        <GarmentPreview
                          category={item.category}
                          patch={item.patch}
                          size={74}
                        />
                      </button>

                      {/* Item Name & Actions */}
                      <div className="flex flex-1 flex-col justify-between gap-2 p-2.5">
                        <div className="line-clamp-2 min-h-[32px] text-xs font-bold leading-snug text-[#4A3525]">
                          {item.name}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleTry(item)}
                            className={`min-h-[36px] rounded-xl border px-2.5 text-[11px] font-semibold transition-transform active:scale-95 ${
                              previewing
                                ? 'border-[#B85769] bg-[#FCE7EC] text-[#9A3D4F]'
                                : 'border-[#DFCCB0] bg-[#FAF3E8] text-[#5B422E]'
                            }`}
                          >
                            Thử
                          </button>

                          {owned ? (
                            <button
                              type="button"
                              onClick={() => handleEquip(item)}
                              disabled={equipped}
                              className={`flex min-h-[36px] flex-1 items-center justify-center gap-1 rounded-xl px-2 text-[11px] font-bold transition-transform active:scale-95 ${
                                equipped
                                  ? 'bg-[#6F4E37] text-amber-50'
                                  : 'bg-[#6BA383] text-white'
                              }`}
                            >
                              {equipped && <Check className="h-3.5 w-3.5" />}
                              <span>{equipped ? 'Đang mặc' : 'Mặc'}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleBuy(item)}
                              disabled={!canAfford}
                              className={`flex min-h-[36px] flex-1 items-center justify-center rounded-xl px-2 text-[11px] font-bold tabular-nums transition-transform active:scale-95 ${
                                canAfford
                                  ? 'bg-[#B85769] text-white shadow-xs'
                                  : 'cursor-not-allowed bg-[#E6DDD1] text-[#9B8C7E]'
                              }`}
                            >
                              Mua · {item.price} Xu
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
