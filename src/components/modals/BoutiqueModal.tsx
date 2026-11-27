import React, {useEffect, useState} from 'react';
import {Check, Coins, RotateCcw, ShoppingBag, Sparkles, X} from 'lucide-react';
import {FASHION_CATEGORIES, SHOP_ITEMS, SHOP_SETS} from '../../data/avatarCatalog';
import {AvatarConfig, ShopCategory, ShopItem, ShopSet} from '../../types/game';
import {soundFX} from '../../utils/sound';
import {AvatarPreview3D} from '../AvatarPreview3D';
import {GarmentPreview} from '../GarmentPreview';

interface BoutiqueModalProps {
  avatar: AvatarConfig;
  coins: number;
  ownedIds: string[];
  onBuyItem: (item: ShopItem) => void;
  onBuySet: (set: ShopSet, finalPrice: number) => void;
  onEquipAvatar: (next: AvatarConfig) => void;
  onClose: () => void;
}

type BoutiqueTab = 'sets' | ShopCategory;

function isItemEquipped(avatar: AvatarConfig, item: ShopItem): boolean {
  const entries = Object.entries(item.patch) as [keyof AvatarConfig, unknown][];
  return entries.every(([k, v]) => avatar[k] === v);
}

function isSetEquipped(avatar: AvatarConfig, set: ShopSet): boolean {
  const entries = Object.entries(set.patch) as [keyof AvatarConfig, unknown][];
  return entries.every(([k, v]) => avatar[k] === v);
}

export const BoutiqueModal: React.FC<BoutiqueModalProps> = ({
  avatar,
  coins,
  ownedIds,
  onBuyItem,
  onBuySet,
  onEquipAvatar,
  onClose,
}) => {
  const [tab, setTab] = useState<BoutiqueTab>('sets');
  const [previewAvatar, setPreviewAvatar] = useState<AvatarConfig>(avatar);

  useEffect(() => {
    setPreviewAvatar(avatar);
  }, [avatar]);

  const items = tab === 'sets' ? [] : SHOP_ITEMS.filter((item) => item.category === tab);
  const isPreviewDirty = JSON.stringify(previewAvatar) !== JSON.stringify(avatar);

  const handleTry = (item: ShopItem) => {
    soundFX.tap();
    setPreviewAvatar((prev) => ({...prev, ...item.patch}));
  };

  const handleTrySet = (set: ShopSet) => {
    soundFX.tap();
    setPreviewAvatar((prev) => ({...prev, ...set.patch}));
  };

  const handleEquip = (item: ShopItem) => {
    soundFX.sparkle();
    const next = {...avatar, ...item.patch};
    onEquipAvatar(next);
    setPreviewAvatar(next);
  };

  const handleEquipSet = (set: ShopSet) => {
    soundFX.sparkle();
    const next = {...avatar, ...set.patch};
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

  const handleBuySetClick = (set: ShopSet, finalPrice: number) => {
    if (coins < finalPrice) {
      soundFX.tap();
      return;
    }
    soundFX.sparkle();
    onBuySet(set, finalPrice);
  };

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-stone-950/65 p-1.5 sm:p-4"
      onClick={onClose}
    >
      <div
        className="anim-pop flex h-full max-h-[96dvh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border-4 border-[#9C734B] bg-[#FAF3E8] shadow-2xl md:h-[min(86dvh,660px)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Shop Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#E5D5BE] bg-[#F2E5D2] px-3.5 py-2 sm:px-4 sm:py-2.5">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-[#B85769]" />
            <h2 className="font-display text-sm font-bold text-[#4A3525] sm:text-base">
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
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E3CEB2] text-[#4A3525] transition-transform active:scale-95 sm:h-10 sm:w-10"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden min-[500px]:flex-row">
          {/* Live 3D Fitting Preview */}
          <div className="relative flex h-40 shrink-0 flex-col items-center justify-center border-b border-[#E5D5BE] bg-gradient-to-b from-[#FFFDF9] to-[#F7E5DF] min-[500px]:h-full min-[500px]:w-[225px] min-[500px]:border-r min-[500px]:border-b-0 sm:w-[250px] md:w-[300px]">
            <AvatarPreview3D avatar={previewAvatar} className="h-full w-full" />
            <div
              className={`pointer-events-none absolute inset-x-2 bottom-1.5 flex items-center gap-2 sm:bottom-2 ${
                isPreviewDirty ? 'justify-between' : 'justify-center'
              }`}
            >
              <span className="text-[10px] font-semibold text-[#6F4E37] sm:text-[11px]">
                Kéo nhân vật để xoay 360°
              </span>
              {isPreviewDirty && (
                <button
                  type="button"
                  onClick={() => {
                    soundFX.tap();
                    setPreviewAvatar(avatar);
                  }}
                  className="pointer-events-auto flex min-h-[30px] items-center gap-1 rounded-xl border border-[#DFC7A5] bg-[#FFF8EB]/95 px-2 text-[10px] font-bold text-[#6F4E37] shadow-xs transition-transform active:scale-95 sm:min-h-[32px] sm:px-2.5 sm:text-[11px]"
                >
                  <RotateCcw className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span>Hoàn tác</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {/* Set Đồ + 8 Fashion Category Tabs */}
            <div className="custom-scroll flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-[#E5D5BE] bg-[#F6ECDC] px-2.5 py-1.5 sm:px-3 sm:py-2">
              <button
                type="button"
                onClick={() => {
                  soundFX.tap();
                  setTab('sets');
                }}
                className={`flex min-h-[34px] shrink-0 items-center gap-1 rounded-xl px-3 py-1 text-xs font-bold whitespace-nowrap transition-colors sm:min-h-[40px] sm:px-3.5 sm:py-1.5 ${
                  tab === 'sets'
                    ? 'bg-[#B85769] text-white shadow-xs'
                    : 'bg-[#EADBC6] text-[#5B422E] hover:bg-[#DFCCB0]'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Set Đồ</span>
              </button>
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
              {tab === 'sets' ? (
                <div className="grid grid-cols-1 gap-2.5 pb-2 sm:grid-cols-2">
                  {SHOP_SETS.map((set) => {
                    const missingIds = set.itemIds.filter((id) => !ownedIds.includes(id));
                    const ownedAll = missingIds.length === 0;
                    const equipped = isSetEquipped(avatar, set);
                    const previewing = isSetEquipped(previewAvatar, set);
                    const finalPrice = ownedAll
                      ? 0
                      : Math.max(
                          1,
                          Math.round((set.price * missingIds.length) / set.itemIds.length),
                        );
                    const canAfford = coins >= finalPrice;

                    // Pick top item and accessory/bag preview from set items
                    const previewTop =
                      SHOP_ITEMS.find((i) => set.itemIds.includes(i.id) && i.category === 'tops') ??
                      null;
                    const previewExtra =
                      SHOP_ITEMS.find(
                        (i) =>
                          set.itemIds.includes(i.id) &&
                          (i.category === 'backpacks' || i.category === 'head'),
                      ) ?? null;
                    const previewShoes =
                      SHOP_ITEMS.find(
                        (i) => set.itemIds.includes(i.id) && i.category === 'shoes',
                      ) ?? null;

                    return (
                      <div
                        key={set.id}
                        className={`flex flex-col justify-between overflow-hidden rounded-2xl border p-3 transition-colors ${
                          equipped
                            ? 'border-[#B85769] bg-[#FFF6F8]'
                            : previewing
                              ? 'border-[#C59B6D] bg-[#FFFDF8]'
                              : 'border-[#E0CEB6] bg-white'
                        }`}
                      >
                        <div>
                          <button
                            type="button"
                            onClick={() => handleTrySet(set)}
                            className="mb-2.5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#FBF6EE] py-2 transition-transform active:scale-98"
                            aria-label={`Thử ${set.name}`}
                          >
                            {previewTop && (
                              <GarmentPreview
                                category={previewTop.category}
                                patch={previewTop.patch}
                                size={56}
                              />
                            )}
                            {previewExtra && (
                              <GarmentPreview
                                category={previewExtra.category}
                                patch={previewExtra.patch}
                                size={50}
                              />
                            )}
                            {previewShoes && (
                              <GarmentPreview
                                category={previewShoes.category}
                                patch={previewShoes.patch}
                                size={48}
                              />
                            )}
                          </button>

                          <div className="flex items-start justify-between gap-2">
                            <div className="text-xs font-extrabold leading-snug text-[#4A3525]">
                              {set.name}
                            </div>
                            <span className="shrink-0 rounded-lg bg-[#FCE7EC] px-2 py-0.5 text-[10px] font-black text-[#9A3D4F]">
                              {set.itemIds.length} món
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] font-medium leading-snug text-[#7A614A]">
                            {set.subtitle}
                          </p>
                        </div>

                        <div className="mt-3 flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleTrySet(set)}
                            className={`min-h-[36px] rounded-xl border px-3 text-[11px] font-semibold transition-transform active:scale-95 ${
                              previewing
                                ? 'border-[#B85769] bg-[#FCE7EC] text-[#9A3D4F]'
                                : 'border-[#DFCCB0] bg-[#FAF3E8] text-[#5B422E]'
                            }`}
                          >
                            Thử Set
                          </button>

                          {ownedAll ? (
                            <button
                              type="button"
                              onClick={() => handleEquipSet(set)}
                              disabled={equipped}
                              className={`flex min-h-[36px] flex-1 items-center justify-center gap-1 rounded-xl px-2 text-[11px] font-bold transition-transform active:scale-95 ${
                                equipped
                                  ? 'bg-[#6F4E37] text-amber-50'
                                  : 'bg-[#6BA383] text-white'
                              }`}
                            >
                              {equipped && <Check className="h-3.5 w-3.5" />}
                              <span>{equipped ? 'Đang mặc' : 'Mặc cả Set'}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleBuySetClick(set, finalPrice)}
                              disabled={!canAfford}
                              className={`flex min-h-[36px] flex-1 items-center justify-center rounded-xl px-2 text-[11px] font-bold tabular-nums transition-transform active:scale-95 ${
                                canAfford
                                  ? 'bg-[#B85769] text-white shadow-xs'
                                  : 'cursor-not-allowed bg-[#E6DDD1] text-[#9B8C7E]'
                              }`}
                            >
                              Mua Set · {finalPrice} Xu
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <>
                  {tab === 'face' && (
                    <div className="mb-2.5 flex items-center justify-between gap-2 rounded-2xl border border-[#E5D5BE] bg-[#FBF4EA] px-3 py-2">
                      <span className="text-xs font-bold text-[#5B422E]">
                        Má hồng trên mặt hộp
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          soundFX.tap();
                          const nextBlush = !previewAvatar.blush;
                          const next = {...avatar, blush: nextBlush};
                          onEquipAvatar(next);
                          setPreviewAvatar({...previewAvatar, blush: nextBlush});
                        }}
                        className={`min-h-[32px] rounded-xl px-3 text-xs font-bold transition-colors active:scale-95 ${
                          previewAvatar.blush
                            ? 'bg-[#E57A8D] text-white shadow-xs'
                            : 'bg-[#EADBC6] text-[#5B422E]'
                        }`}
                      >
                        {previewAvatar.blush ? 'Đang bật' : 'Đang tắt'}
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2.5 pb-2 sm:grid-cols-3">
                    {items.map((item) => {
                      const owned = ownedIds.includes(item.id);
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
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
