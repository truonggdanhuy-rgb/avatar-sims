import React, {useEffect, useState} from 'react';
import {ArrowUp, Coins, Warehouse, X} from 'lucide-react';
import {
  CROP_LIST,
  FARM_STORAGE_STEP,
  getFarmItemCount,
  getFarmItemDirectSellPrice,
  getFarmItemName,
  getFarmSeedSellPrice,
  getFarmStorageCapacity,
  getFarmStorageUsed,
  getWarehouseUpgradeCost,
  MAX_WAREHOUSE_LEVEL,
  PROCESSED_LIST,
  RECIPE_LIST,
  SUPPLY_META,
} from '../../data/farmCatalog';
import {
  CropType,
  FarmInventory,
  FarmItemKind,
  FarmSupplies,
} from '../../types/game';
import {soundFX} from '../../utils/sound';
import {FarmIconCategory, FarmItemIcon} from '../FarmItemIcon';

interface FarmStorageModalProps {
  coins: number;
  warehouseLevel: number;
  inventory: FarmInventory;
  onDirectSell: (kind: FarmItemKind, id: string, qty: number) => void;
  onSellSeed: (crop: CropType, qty: number) => void;
  onSellSupply: (supply: keyof FarmSupplies, qty: number) => void;
  onUpgradeWarehouse: () => void;
  onClose: () => void;
}

type StorageCategory = 'all' | 'produce' | 'crafted' | 'seeds' | 'supplies';

interface StorageEntry {
  key: string;
  iconKind: FarmIconCategory;
  iconId: string;
  category: Exclude<StorageCategory, 'all'>;
  name: string;
  description: string;
  qty: number;
  unitPrice: number;
  badge: string;
  onSell: (qty: number) => void;
}

const ANIMAL_PRODUCT_HINTS: Record<string, string> = {
  chicken_egg: 'Sản phẩm từ Gà · Làm Bánh Tart, Bánh Flan, Brownie & Cơm Chiên',
  duck_egg: 'Sản phẩm từ Vịt · Làm Bánh Flan Trứng Vịt & Cháo Thịt Băm',
  pork: 'Sản phẩm từ Chuồng Lợn · Nấu Phở Thịt Lợn, Cháo & Thịt Áp Chảo',
  milk: 'Sản phẩm từ Bò Sữa · Ủ Phô Mai, Kem Tươi, Sữa Bắp & Cà Phê Sữa',
};

const SUPPLY_HINTS: Record<keyof FarmSupplies, string> = {
  bugSpray: 'Dùng xịt sâu trên cây trồng để giữ trọn +2 sản lượng thu hoạch',
  animalFeed: 'Đổ máng ăn chuồng thú giúp Gà, Vịt, Lợn, Bò mau lớn & khỏe mạnh',
  animalMedicine: 'Chữa bệnh cho vật nuôi trong Chuồng Gia Cầm & Gia Súc',
  fishFeed: 'Rải gần bờ Hồ Thủy Sinh cho tối đa 4 con Cá/Vịt/Rùa ăn cùng lúc',
  fishMedicine: 'Chữa bệnh kịp thời cho Cá Chép, Vịt Vàng và Rùa Xanh dưới hồ',
};

export const FarmStorageModal: React.FC<FarmStorageModalProps> = ({
  coins,
  warehouseLevel,
  inventory,
  onDirectSell,
  onSellSeed,
  onSellSupply,
  onUpgradeWarehouse,
  onClose,
}) => {
  const [filter, setFilter] = useState<StorageCategory>('all');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [confirmUpgrade, setConfirmUpgrade] = useState(false);

  useEffect(() => {
    setConfirmUpgrade(false);
  }, [warehouseLevel]);

  const used = getFarmStorageUsed(inventory);
  const capacity = getFarmStorageCapacity(warehouseLevel);
  const upgradeCost = getWarehouseUpgradeCost(warehouseLevel);
  const nextCapacity =
    warehouseLevel < MAX_WAREHOUSE_LEVEL ? getFarmStorageCapacity(warehouseLevel + 1) : null;
  const pct = Math.min(100, Math.round((used / Math.max(1, capacity)) * 100));
  const isNearFull = used >= capacity * 0.88;
  const isFull = used >= capacity;

  const entries: StorageEntry[] = [];

  for (const c of CROP_LIST) {
    const qty = getFarmItemCount(inventory, 'crop', c.id);
    if (qty > 0) {
      entries.push({
        key: `crop_${c.id}`,
        iconKind: 'crop',
        iconId: c.id,
        category: 'produce',
        name: c.name,
        description: c.hint,
        qty,
        unitPrice: getFarmItemDirectSellPrice('crop', c.id),
        badge: 'Nông sản',
        onSell: (q) => onDirectSell('crop', c.id, q),
      });
    }
  }

  for (const prodId of ['chicken_egg', 'duck_egg', 'pork', 'milk'] as const) {
    const qty = getFarmItemCount(inventory, 'animal_product', prodId);
    if (qty > 0) {
      entries.push({
        key: `ani_${prodId}`,
        iconKind: 'animal_product',
        iconId: prodId,
        category: 'produce',
        name: getFarmItemName('animal_product', prodId),
        description: ANIMAL_PRODUCT_HINTS[prodId] ?? 'Sản phẩm chăn nuôi nông trại',
        qty,
        unitPrice: getFarmItemDirectSellPrice('animal_product', prodId),
        badge: 'Chăn nuôi',
        onSell: (q) => onDirectSell('animal_product', prodId, q),
      });
    }
  }

  for (const p of PROCESSED_LIST) {
    const qty = getFarmItemCount(inventory, 'processed', p.id);
    if (qty > 0) {
      entries.push({
        key: `proc_${p.id}`,
        iconKind: 'processed',
        iconId: p.id,
        category: 'crafted',
        name: p.name,
        description: `${p.machineName} · ${p.description}`,
        qty,
        unitPrice: getFarmItemDirectSellPrice('processed', p.id),
        badge: 'Ép & Xay',
        onSell: (q) => onDirectSell('processed', p.id, q),
      });
    }
  }

  for (const r of RECIPE_LIST) {
    const qty = getFarmItemCount(inventory, 'dish', r.id);
    if (qty > 0) {
      entries.push({
        key: `dish_${r.id}`,
        iconKind: 'dish',
        iconId: r.id,
        category: 'crafted',
        name: r.name,
        description: r.description,
        qty,
        unitPrice: getFarmItemDirectSellPrice('dish', r.id),
        badge: r.categoryLabel,
        onSell: (q) => onDirectSell('dish', r.id, q),
      });
    }
  }

  for (const c of CROP_LIST) {
    const qty = inventory.seeds[c.id] || 0;
    if (qty > 0) {
      entries.push({
        key: `seed_${c.id}`,
        iconKind: 'seed',
        iconId: c.id,
        category: 'seeds',
        name: `Giống ${c.name}`,
        description: `Gieo xuống ô đất trống · ${c.hint}`,
        qty,
        unitPrice: getFarmSeedSellPrice(c.id),
        badge: 'Hạt giống',
        onSell: (q) => onSellSeed(c.id, q),
      });
    }
  }

  for (const key of [
    'bugSpray',
    'animalFeed',
    'animalMedicine',
    'fishFeed',
    'fishMedicine',
  ] as (keyof FarmSupplies)[]) {
    const qty = inventory.supplies[key] || 0;
    if (qty > 0) {
      const meta = SUPPLY_META[key];
      entries.push({
        key: `sup_${key}`,
        iconKind: 'supply',
        iconId: key,
        category: 'supplies',
        name: meta.name,
        description: SUPPLY_HINTS[key],
        qty,
        unitPrice: meta.sellPrice,
        badge: 'Dụng cụ',
        onSell: (q) => onSellSupply(key, q),
      });
    }
  }

  const visibleEntries =
    filter === 'all' ? entries : entries.filter((item) => item.category === filter);

  const selectedEntry =
    visibleEntries.find((item) => item.key === selectedKey) ?? visibleEntries[0] ?? null;

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-stone-950/60 p-1.5 sm:p-4"
      onClick={onClose}
    >
      <div
        className="anim-pop flex h-[min(93dvh,630px)] max-h-[94dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border-[3px] border-[#8D6240] bg-[#FAF3E8] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#E5D5BE] bg-[#F2E5D2] px-3 py-1.5 sm:py-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <Warehouse className="h-4 w-4 shrink-0 text-[#8C5B32]" />
            <h2 className="font-display truncate text-sm font-bold text-[#4A3525]">
              Nhà Kho Lv.{warehouseLevel} ({used}/{capacity})
            </h2>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <div className="flex items-center gap-1 rounded-lg border border-[#DFC7A5] bg-[#FFF8EB] px-2 py-0.5 text-xs font-bold tabular-nums text-[#6F4E37]">
              <Coins className="h-3 w-3 text-amber-500" />
              <span>{coins}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                soundFX.tap();
                onClose();
              }}
              aria-label="Đóng nhà kho"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E3CEB2] text-[#4A3525] active:scale-95"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Responsive 2-Column Body */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden min-[540px]:flex-row">
          {/* LEFT COLUMN: Capacity + Filter + Scrollable Storage Grid */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {/* Capacity Bar & Upgrade Control */}
            <div className="shrink-0 space-y-1.5 border-b border-[#E5D5BE] bg-[#FFF8EE] px-3 py-1.5 sm:py-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center justify-between text-[11px] font-semibold">
                    <span className={`truncate ${isFull ? 'text-[#C2515E]' : 'text-[#5B422E]'}`}>
                      {isFull ? 'Kho đã đầy! Bán bớt hoặc nâng cấp' : 'Sức chứa nông trại'}
                    </span>
                    <span
                      className={`shrink-0 pl-2 font-bold tabular-nums ${
                        isFull
                          ? 'text-[#C2515E]'
                          : isNearFull
                            ? 'text-[#C97B32]'
                            : 'text-[#4B8A5B]'
                      }`}
                    >
                      {used}/{capacity}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#EADBC6]">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isFull
                          ? 'bg-[#D95970]'
                          : isNearFull
                            ? 'bg-[#E09B3D]'
                            : 'bg-[#6BA383]'
                      }`}
                      style={{width: `${pct}%`}}
                    />
                  </div>
                </div>

                {upgradeCost !== null && nextCapacity !== null ? (
                  <button
                    type="button"
                    disabled={coins < upgradeCost}
                    onClick={() => {
                      soundFX.tap();
                      setConfirmUpgrade((prev) => !prev);
                    }}
                    title={`Nâng kho +${FARM_STORAGE_STEP} chỗ (${upgradeCost} Xu)`}
                    className={`flex min-h-[28px] shrink-0 items-center gap-1 rounded-lg px-2.5 text-[11px] font-bold tabular-nums transition-transform active:scale-95 ${
                      coins >= upgradeCost
                        ? 'bg-[#6BA383] text-white shadow-xs'
                        : 'cursor-not-allowed bg-[#E6DDD1] text-[#9B8C7E]'
                    }`}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                    <span>
                      +{FARM_STORAGE_STEP} ({upgradeCost}Xu)
                    </span>
                  </button>
                ) : (
                  <span className="shrink-0 rounded-lg bg-[#E8D4AC] px-2 py-1 text-[10px] font-bold text-[#7A541C]">
                    Tối Đa ({capacity})
                  </span>
                )}
              </div>

              {confirmUpgrade && upgradeCost !== null && nextCapacity !== null && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#DFC7A5] bg-[#FAF0DF] px-2.5 py-1.5 text-[11px] text-[#4A3525]">
                  <span className="font-semibold">
                    Nâng lên Lv.{warehouseLevel + 1} ({capacity} → {nextCapacity} chỗ) ·{' '}
                    <strong className="text-[#9A5B25]">{upgradeCost} Xu</strong>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        soundFX.tap();
                        setConfirmUpgrade(false);
                      }}
                      className="min-h-[26px] rounded-lg bg-[#EADBC6] px-2.5 text-[11px] font-semibold text-[#5B422E] active:scale-95"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      disabled={coins < upgradeCost}
                      onClick={() => {
                        soundFX.sparkle();
                        onUpgradeWarehouse();
                        setConfirmUpgrade(false);
                      }}
                      className="min-h-[26px] rounded-lg bg-[#6BA383] px-2.5 text-[11px] font-bold text-white shadow-xs active:scale-95 disabled:cursor-not-allowed disabled:bg-[#E6DDD1] disabled:text-[#9B8C7E]"
                    >
                      Xác nhận
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Category Filter Tabs */}
            <div className="custom-scroll flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-[#E5D5BE] bg-[#F6ECDC] px-3 py-1.5">
              {(
                [
                  {key: 'all', label: `Tất cả (${used})`},
                  {key: 'produce', label: 'Nông sản'},
                  {key: 'crafted', label: 'Ép & Món'},
                  {key: 'seeds', label: 'Hạt giống'},
                  {key: 'supplies', label: 'Dụng cụ'},
                ] as const
              ).map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => {
                    soundFX.tap();
                    setFilter(t.key);
                  }}
                  className={`min-h-[26px] shrink-0 rounded-lg px-2.5 text-[11px] font-semibold whitespace-nowrap transition-colors ${
                    filter === t.key
                      ? 'bg-[#6F4E37] text-amber-50 shadow-xs'
                      : 'bg-[#EADBC6] text-[#5B422E] hover:bg-[#DFCCB0]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Scrollable Storage Icon Grid */}
            <div className="custom-scroll min-h-0 flex-1 overflow-y-auto p-2.5 text-[#4A3525] sm:p-3">
              {visibleEntries.length === 0 ? (
                <div className="flex h-36 flex-col items-center justify-center rounded-xl border border-dashed border-[#DFCCB0] bg-[#FFFDF9] p-4 text-center text-xs text-[#6F4E37]">
                  Chưa có món nào trong mục này.
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 min-[420px]:grid-cols-4 lg:grid-cols-5">
                  {visibleEntries.map((item) => {
                    const isSelected = selectedEntry?.key === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => {
                          soundFX.tap();
                          setSelectedKey(item.key);
                        }}
                        className={`relative flex flex-col items-center justify-between gap-1 rounded-xl border p-2 text-center transition-all active:scale-95 ${
                          isSelected
                            ? 'border-2 border-[#8D6240] bg-[#FFF6E8] shadow-sm'
                            : 'border-[#E4D3BA] bg-white hover:border-[#C5A47D]'
                        }`}
                      >
                        <span className="absolute top-1 right-1 rounded bg-[#EFE3D0] px-1 text-[9px] font-extrabold tabular-nums text-[#5B422E]">
                          ×{item.qty}
                        </span>
                        <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-lg bg-[#FAF4EA]">
                          <FarmItemIcon kind={item.iconKind} id={item.iconId} className="h-8 w-8" />
                        </div>
                        <span className="line-clamp-2 w-full text-[10px] leading-tight font-bold text-[#4A3525]">
                          {item.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN / BOTTOM BAR: Item Detail & Raw Sell Panel */}
          {selectedEntry && (
            <div className="custom-scroll shrink-0 overflow-y-auto border-t-2 border-[#E2D0B6] bg-[#FFFDF9] p-2.5 text-[#4A3525] min-[540px]:flex min-[540px]:w-[250px] min-[540px]:flex-col min-[540px]:justify-between min-[540px]:border-t-0 min-[540px]:border-l-2 min-[540px]:p-3.5 md:w-[290px]">
              <div className="flex flex-wrap items-center justify-between gap-2.5 min-[540px]:flex-col min-[540px]:items-stretch">
                <div className="flex min-w-0 flex-1 items-center gap-2.5 min-[540px]:flex-initial">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#E5D5BE] bg-[#FAF3E8] min-[540px]:h-14 min-[540px]:w-14">
                    <FarmItemIcon
                      kind={selectedEntry.iconKind}
                      id={selectedEntry.iconId}
                      className="h-9 w-9 min-[540px]:h-10 min-[540px]:w-10"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="text-xs font-extrabold text-[#4A3525] sm:text-sm">
                        {selectedEntry.name}
                      </h3>
                      <span className="rounded bg-[#F2E5D2] px-1.5 py-0.5 text-[10px] font-bold text-[#6F4E37]">
                        {selectedEntry.badge}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-bold tabular-nums text-[#6F4E37]">
                      <span>Tồn: ×{selectedEntry.qty}</span>
                      <span>·</span>
                      <span className="text-[#9A5B25]">{selectedEntry.unitPrice} Xu/cái</span>
                    </div>
                  </div>
                </div>

                <p className="hidden text-[11px] leading-relaxed text-[#7A6048] min-[540px]:block">
                  {selectedEntry.description}
                </p>

                <div className="flex shrink-0 items-center gap-1.5 min-[540px]:hidden">
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.sparkle();
                      selectedEntry.onSell(1);
                    }}
                    className="min-h-[36px] rounded-xl bg-[#D99B58] px-3 text-xs font-bold text-white shadow-xs transition-transform active:scale-95"
                  >
                    Bán 1 (+{selectedEntry.unitPrice})
                  </button>
                  {selectedEntry.qty > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        soundFX.sparkle();
                        selectedEntry.onSell(selectedEntry.qty);
                      }}
                      className="min-h-[36px] rounded-xl bg-[#8C6239] px-3 text-xs font-bold text-white shadow-xs transition-transform active:scale-95"
                    >
                      Hết (+{selectedEntry.unitPrice * selectedEntry.qty})
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-3 hidden space-y-2 border-t border-[#F0E4D2] pt-3 min-[540px]:block">
                <button
                  type="button"
                  onClick={() => {
                    soundFX.sparkle();
                    selectedEntry.onSell(1);
                  }}
                  className="flex min-h-[40px] w-full items-center justify-center rounded-xl bg-[#D99B58] px-3 text-xs font-bold text-white shadow-xs transition-transform active:scale-95"
                >
                  Bán 1 (+{selectedEntry.unitPrice} Xu)
                </button>
                {selectedEntry.qty > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.sparkle();
                      selectedEntry.onSell(selectedEntry.qty);
                    }}
                    className="flex min-h-[40px] w-full items-center justify-center rounded-xl bg-[#8C6239] px-3 text-xs font-bold text-white shadow-xs transition-transform active:scale-95"
                  >
                    Bán hết ×{selectedEntry.qty} (+{selectedEntry.unitPrice * selectedEntry.qty} Xu)
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
