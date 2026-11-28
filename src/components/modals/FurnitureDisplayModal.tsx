import React, {useMemo, useState} from 'react';
import {Bug, Check, Fish, Plus, Sparkles, Trash2, X} from 'lucide-react';
import {ALL_FISH_CATALOG, ALL_FISH_LIST, FISH_RARITY_CONFIG} from '../../data/fishingCatalog';
import {HDDOLL_CATALOG, HDDOLL_RARITY_META, getDollByHandheld} from '../../data/hddollCatalog';
import {INSECT_CATALOG, INSECT_LIST} from '../../data/insectCatalog';
import {
  CaughtFishItem,
  CaughtInsectItem,
  FishDexRecord,
  FishSpeciesId,
  FurnitureCatalogItem,
  FurnitureDisplayItem,
  FurnitureDisplayKind,
  HandheldStyle,
  InsectDexRecord,
  InsectSpeciesId,
  PlacedFurniture,
} from '../../types/game';
import {soundFX} from '../../utils/sound';
import {DollSvgIcon} from '../DollSvgIcon';

interface FurnitureDisplayModalProps {
  furniture: PlacedFurniture;
  catalog: FurnitureCatalogItem;
  ownedIds: string[];
  fishBasket: CaughtFishItem[];
  fishDex: Partial<Record<FishSpeciesId, FishDexRecord>>;
  insectBasket: CaughtInsectItem[];
  insectDex: Partial<Record<InsectSpeciesId, InsectDexRecord>>;
  onSaveItems: (furnitureId: string, nextItems: FurnitureDisplayItem[]) => void;
  onClose: () => void;
}

export const FurnitureDisplayModal: React.FC<FurnitureDisplayModalProps> = ({
  furniture,
  catalog,
  ownedIds,
  fishBasket,
  fishDex,
  insectBasket,
  insectDex,
  onSaveItems,
  onClose,
}) => {
  const capacity = catalog.displayCapacity ?? 2;
  const mode: FurnitureDisplayKind =
    catalog.interactive === 'aquarium_display'
      ? 'fish'
      : catalog.interactive === 'insect_display'
        ? 'insect'
        : 'doll';

  const initialItems = useMemo<FurnitureDisplayItem[]>(
    () => (Array.isArray(furniture.displayItems) ? furniture.displayItems.slice(0, capacity) : []),
    [furniture.displayItems, capacity],
  );
  const [selectedSlot, setSelectedSlot] = useState<number>(() => {
    for (let i = 0; i < capacity; i++) {
      if (!initialItems.some((x) => x.slotIndex === i)) return i;
    }
    return 0;
  });

  const ownedDolls = useMemo(
    () => HDDOLL_CATALOG.filter((d) => ownedIds.includes(d.shopItemId)),
    [ownedIds],
  );

  const availableFishChoices = useMemo(() => {
    const out: Array<{
      key: string;
      speciesId: FishSpeciesId;
      name: string;
      rarityLabel: string;
      rarityClass: string;
      metricLabel: string;
      weightKg?: number;
      fromBasket: boolean;
    }> = [];

    fishBasket.forEach((f) => {
      const def = ALL_FISH_CATALOG[f.speciesId];
      if (!def) return;
      const rm = FISH_RARITY_CONFIG[def.rarity];
      out.push({
        key: `basket_${f.id}`,
        speciesId: f.speciesId,
        name: def.name,
        rarityLabel: rm.label,
        rarityClass:
          def.rarity === 'rare'
            ? 'bg-amber-400/20 text-amber-200 border-amber-300/40'
            : 'bg-slate-600/40 text-slate-200 border-white/15',
        metricLabel: `${f.weightKg.toFixed(2)} kg · Trong giỏ`,
        weightKg: f.weightKg,
        fromBasket: true,
      });
    });

    ALL_FISH_LIST.forEach((def) => {
      const dex = fishDex[def.id];
      if (!dex || dex.caughtCount <= 0) return;
      if (fishBasket.some((f) => f.speciesId === def.id)) return;
      const rm = FISH_RARITY_CONFIG[def.rarity];
      out.push({
        key: `dex_${def.id}`,
        speciesId: def.id,
        name: def.name,
        rarityLabel: rm.label,
        rarityClass:
          def.rarity === 'rare'
            ? 'bg-amber-400/20 text-amber-200 border-amber-300/40'
            : 'bg-slate-600/40 text-slate-200 border-white/15',
        metricLabel: `Kỷ lục ${dex.maxWeightKg.toFixed(2)} kg · Bách khoa`,
        weightKg: dex.maxWeightKg,
        fromBasket: false,
      });
    });
    return out;
  }, [fishBasket, fishDex]);

  const availableInsectChoices = useMemo(() => {
    const out: Array<{
      key: string;
      speciesId: InsectSpeciesId;
      name: string;
      rarityLabel: string;
      rarityClass: string;
      metricLabel: string;
      lengthMm?: number;
      fromBasket: boolean;
    }> = [];

    insectBasket.forEach((b) => {
      const def = INSECT_CATALOG[b.speciesId];
      if (!def) return;
      out.push({
        key: `basket_${b.id}`,
        speciesId: b.speciesId,
        name: def.name,
        rarityLabel: def.rarity === 'rare' ? 'Hiếm' : 'Thường',
        rarityClass:
          def.rarity === 'rare'
            ? 'bg-amber-400/20 text-amber-200 border-amber-300/40'
            : 'bg-slate-600/40 text-slate-200 border-white/15',
        metricLabel: `${b.lengthMm.toFixed(1)} mm · Trong vợt`,
        lengthMm: b.lengthMm,
        fromBasket: true,
      });
    });

    INSECT_LIST.forEach((def) => {
      const dex = insectDex[def.id];
      if (!dex || dex.caughtCount <= 0) return;
      if (insectBasket.some((b) => b.speciesId === def.id)) return;
      out.push({
        key: `dex_${def.id}`,
        speciesId: def.id,
        name: def.name,
        rarityLabel: def.rarity === 'rare' ? 'Hiếm' : 'Thường',
        rarityClass:
          def.rarity === 'rare'
            ? 'bg-amber-400/20 text-amber-200 border-amber-300/40'
            : 'bg-slate-600/40 text-slate-200 border-white/15',
        metricLabel: `Kỷ lục ${dex.maxLengthMm.toFixed(1)} mm · Bách khoa`,
        lengthMm: dex.maxLengthMm,
        fromBasket: false,
      });
    });
    return out;
  }, [insectBasket, insectDex]);

  const assignToSlot = (itemId: string, metric?: number) => {
    soundFX.sparkle();
    const filtered = initialItems.filter((x) => x.slotIndex !== selectedSlot);
    const next: FurnitureDisplayItem[] = [
      ...filtered,
      {
        slotIndex: selectedSlot,
        kind: mode,
        itemId,
        metric,
      },
    ].sort((a, b) => a.slotIndex - b.slotIndex);
    onSaveItems(furniture.instanceId, next);

    // Advance selectedSlot to next empty slot if available
    for (let i = 0; i < capacity; i++) {
      if (!next.some((x) => x.slotIndex === i)) {
        setSelectedSlot(i);
        return;
      }
    }
    setSelectedSlot((selectedSlot + 1) % capacity);
  };

  const removeSlot = (slotIdx: number) => {
    soundFX.tap();
    const next = initialItems.filter((x) => x.slotIndex !== slotIdx);
    onSaveItems(furniture.instanceId, next);
    setSelectedSlot(slotIdx);
  };

  const clearAll = () => {
    soundFX.tap();
    onSaveItems(furniture.instanceId, []);
    setSelectedSlot(0);
  };

  const theme =
    mode === 'fish'
      ? {
          border: 'border-[#38BDF8]/70',
          bg: 'bg-[#0F1E33]',
          headerBg: 'bg-[#132945]',
          accentText: 'text-[#7DD3FC]',
          icon: <Fish className="h-5 w-5 text-[#38BDF8]" />,
          hint: 'Chọn ô trống rồi chạm loài cá bên dưới để thả bơi lội sống động trong bể!',
          emptyText: 'Bạn chưa câu được loài cá nào. Hãy ra Hồ Câu Cá hoặc Bến Thuyền để câu cá nhé!',
        }
      : mode === 'insect'
        ? {
            border: 'border-[#4ADE80]/65',
            bg: 'bg-[#12241B]',
            headerBg: 'bg-[#183124]',
            accentText: 'text-[#86EFAC]',
            icon: <Bug className="h-5 w-5 text-[#4ADE80]" />,
            hint: 'Chọn ô rồi chạm bọ hoặc bướm để trưng bày bay lượn trong tủ sinh thái!',
            emptyText: 'Bạn chưa bắt được bọ hay bướm nào. Hãy cầm Vợt đi rón rén quanh Thị Trấn hoặc Đảo Hoang!',
          }
        : {
            border: 'border-[#F472B6]/70',
            bg: 'bg-[#23152A]',
            headerBg: 'bg-[#311B3B]',
            accentText: 'text-[#F9A8D4]',
            icon: <Sparkles className="h-5 w-5 text-[#F472B6]" />,
            hint: 'Chọn vị trí trên kệ rồi chạm bé HDDOLL bạn muốn trưng bày!',
            emptyText: 'Bạn chưa sở hữu bé HDDOLL nào. Hãy ghé Khu Game Cyber Mây để quay Blindbox HDDOLL nhé!',
          };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`anim-pop flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border-2 ${theme.border} ${theme.bg} text-white shadow-2xl`}
      >
        <div className={`flex items-center justify-between gap-2 border-b border-white/10 ${theme.headerBg} px-4 py-3`}>
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-black/25">
              {theme.icon}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-black">{catalog.name}</div>
              <div className={`text-[11px] font-bold ${theme.accentText}`}>
                Đang trưng bày: {initialItems.length} / {capacity} vị trí
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundFX.tap();
              onClose();
            }}
            aria-label="Đóng bảng trưng bày"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white active:scale-95"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          <p className="text-xs font-semibold text-white/80">{theme.hint}</p>

          {/* Display Slots */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-white/65">
                Các ô trưng bày ({capacity} chỗ)
              </span>
              {initialItems.length > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="flex items-center gap-1 rounded-lg border border-rose-300/35 bg-rose-500/20 px-2 py-1 text-[10.5px] font-bold text-rose-200 active:scale-95"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Gỡ hết</span>
                </button>
              )}
            </div>

            <div className={`grid gap-2 ${capacity <= 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
              {Array.from({length: capacity}).map((_, idx) => {
                const entry = initialItems.find((x) => x.slotIndex === idx);
                const isSelected = selectedSlot === idx;
                let itemName = '';
                if (entry) {
                  if (mode === 'doll') {
                    itemName = getDollByHandheld(entry.itemId as HandheldStyle)?.name ?? entry.itemId;
                  } else if (mode === 'fish') {
                    itemName = ALL_FISH_CATALOG[entry.itemId as FishSpeciesId]?.name ?? entry.itemId;
                  } else {
                    itemName = INSECT_CATALOG[entry.itemId as InsectSpeciesId]?.name ?? entry.itemId;
                  }
                }
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      soundFX.tap();
                      setSelectedSlot(idx);
                    }}
                    className={`relative flex min-h-[76px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 p-2 text-center transition ${
                      isSelected
                        ? 'border-amber-300 bg-white/15 shadow-md'
                        : entry
                          ? 'border-white/25 bg-black/25'
                          : 'border-dashed border-white/20 bg-black/15 hover:bg-white/5'
                    }`}
                  >
                    <span className="absolute top-1.5 left-2 text-[9.5px] font-black text-white/50">
                      #{idx + 1}
                    </span>
                    {entry ? (
                      <>
                        {mode === 'doll' && (
                          <DollSvgIcon style={entry.itemId as HandheldStyle} size={38} />
                        )}
                        {mode === 'fish' && <Fish className="mb-1 h-5 w-5 text-[#7DD3FC]" />}
                        {mode === 'insect' && <Bug className="mb-1 h-5 w-5 text-[#86EFAC]" />}
                        <div className="line-clamp-1 text-[11px] font-black text-white">
                          {itemName}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSlot(idx);
                          }}
                          className="mt-1 rounded-md bg-white/15 px-2 py-0.5 text-[9.5px] font-bold text-rose-200 hover:bg-rose-500/35"
                        >
                          Gỡ ra
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-white/55">
                        <Plus className="h-4 w-4" />
                        <span className="text-[10.5px] font-bold">
                          {isSelected ? 'Đang chọn ô này' : 'Chạm để chọn'}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Collection Picker */}
          <div className="space-y-2 border-t border-white/10 pt-3">
            <div className="text-[11px] font-black uppercase tracking-wider text-white/65">
              {mode === 'doll'
                ? `HDDOLL đã sở hữu (${ownedDolls.length})`
                : mode === 'fish'
                  ? `Cá đã câu được (${availableFishChoices.length})`
                  : `Bọ & Bướm đã bắt (${availableInsectChoices.length})`}
            </div>

            {mode === 'doll' &&
              (ownedDolls.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-black/25 p-4 text-center text-xs font-semibold text-white/70">
                  {theme.emptyText}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {ownedDolls.map((doll) => {
                    const meta = HDDOLL_RARITY_META[doll.rarity];
                    return (
                      <button
                        key={doll.handheldId}
                        type="button"
                        onClick={() => assignToSlot(doll.handheldId)}
                        className="flex items-center gap-2.5 rounded-2xl border border-white/15 bg-white/10 p-2 text-left transition hover:bg-white/15 active:scale-95"
                      >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#FFFDF8]">
                          <DollSvgIcon style={doll.handheldId} size={46} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className={`inline-block rounded px-1.5 py-0.5 text-[9px] font-black ${meta.badgeBg} ${meta.badgeText}`}>
                            {meta.label}
                          </span>
                          <div className="mt-0.5 truncate text-xs font-black text-white">
                            {doll.name}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}

            {mode === 'fish' &&
              (availableFishChoices.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-black/25 p-4 text-center text-xs font-semibold text-white/70">
                  {theme.emptyText}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {availableFishChoices.map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => assignToSlot(f.speciesId, f.weightKg)}
                      className="flex items-center justify-between gap-2 rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-left transition hover:bg-white/15 active:scale-95"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-xs font-black text-white">{f.name}</div>
                        <div className="text-[10px] font-semibold text-[#BAE6FD]">
                          {f.metricLabel}
                        </div>
                      </div>
                      <span className={`shrink-0 rounded-lg border px-2 py-0.5 text-[9.5px] font-black ${f.rarityClass}`}>
                        {f.rarityLabel}
                      </span>
                    </button>
                  ))}
                </div>
              ))}

            {mode === 'insect' &&
              (availableInsectChoices.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-black/25 p-4 text-center text-xs font-semibold text-white/70">
                  {theme.emptyText}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {availableInsectChoices.map((b) => (
                    <button
                      key={b.key}
                      type="button"
                      onClick={() => assignToSlot(b.speciesId, b.lengthMm)}
                      className="flex items-center justify-between gap-2 rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-left transition hover:bg-white/15 active:scale-95"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-xs font-black text-white">{b.name}</div>
                        <div className="text-[10px] font-semibold text-[#BBF7D0]">
                          {b.metricLabel}
                        </div>
                      </div>
                      <span className={`shrink-0 rounded-lg border px-2 py-0.5 text-[9.5px] font-black ${b.rarityClass}`}>
                        {b.rarityLabel}
                      </span>
                    </button>
                  ))}
                </div>
              ))}
          </div>
        </div>

        <div className="border-t border-white/10 bg-black/25 px-4 py-2.5">
          <button
            type="button"
            onClick={() => {
              soundFX.tap();
              onClose();
            }}
            className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-amber-300 py-2.5 text-xs font-black text-stone-900 active:scale-95"
          >
            <Check className="h-4 w-4" />
            <span>Hoàn Tất Trưng Bày</span>
          </button>
        </div>
      </div>
    </div>
  );
};
