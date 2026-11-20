import React, {useEffect, useState} from 'react';
import {ArrowUp, Coins, Warehouse, X} from 'lucide-react';
import {
  CROP_LIST,
  FARM_STORAGE_STEP,
  getFarmItemColor,
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
  category: Exclude<StorageCategory, 'all'>;
  name: string;
  color: string;
  qty: number;
  unitPrice: number;
  badge: string;
  onSell: (qty: number) => void;
}

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
        category: 'produce',
        name: c.name,
        color: c.color,
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
        category: 'produce',
        name: getFarmItemName('animal_product', prodId),
        color: getFarmItemColor('animal_product', prodId),
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
        category: 'crafted',
        name: p.name,
        color: p.color,
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
        category: 'crafted',
        name: r.name,
        color: r.color,
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
        category: 'seeds',
        name: `Giống ${c.name}`,
        color: c.color,
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
        category: 'supplies',
        name: meta.name,
        color: meta.color,
        qty,
        unitPrice: meta.sellPrice,
        badge: 'Dụng cụ',
        onSell: (q) => onSellSupply(key, q),
      });
    }
  }

  const visibleEntries =
    filter === 'all' ? entries : entries.filter((item) => item.category === filter);

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-stone-950/60 p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="anim-pop flex max-h-[86dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border-[3px] border-[#8D6240] bg-[#FAF3E8] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#E5D5BE] bg-[#F2E5D2] px-3 py-2">
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

        {/* Capacity Bar & Upgrade Control */}
        <div className="shrink-0 space-y-1.5 border-b border-[#E5D5BE] bg-[#FFF8EE] px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center justify-between text-[11px] font-semibold">
                <span className={isFull ? 'text-[#C2515E]' : 'text-[#5B422E]'}>
                  {isFull
                    ? 'Kho đã đầy! Bán bớt hoặc nâng cấp để chứa thêm'
                    : 'Trữ tất cả đồ nông trại (trừ nước) · Bán thô lấy Xu'}
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
              <div className="h-2 w-full overflow-hidden rounded-full bg-[#EADBC6]">
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
                className={`flex min-h-[30px] shrink-0 items-center gap-1 rounded-lg px-2.5 text-[11px] font-bold tabular-nums transition-transform active:scale-95 ${
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
                Kho Tối Đa ({capacity})
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
              className={`min-h-[28px] shrink-0 rounded-lg px-2.5 text-[11px] font-semibold whitespace-nowrap transition-colors ${
                filter === t.key
                  ? 'bg-[#6F4E37] text-amber-50 shadow-xs'
                  : 'bg-[#EADBC6] text-[#5B422E] hover:bg-[#DFCCB0]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Stored Items List */}
        <div className="custom-scroll flex-1 overflow-y-auto p-2.5 text-[#4A3525] sm:p-3">
          {visibleEntries.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-[#DFCCB0] bg-[#FFFDF9] p-4 text-center text-xs text-[#6F4E37]">
              Chưa có món nào trong mục này.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {visibleEntries.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between gap-2 rounded-xl border border-[#E0CEB6] bg-white p-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full border border-black/15"
                        style={{backgroundColor: item.color}}
                      />
                      <span className="truncate text-xs font-bold text-[#4A3525]">
                        {item.name}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[10px] tabular-nums text-[#7A6048]">
                      <span className="rounded bg-[#F4ECE0] px-1 py-0.5 text-[9px] font-semibold text-[#6F4E37]">
                        {item.badge}
                      </span>
                      <span>
                        ×{item.qty} · {item.unitPrice} Xu/cái
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        soundFX.sparkle();
                        item.onSell(1);
                      }}
                      className="min-h-[26px] rounded-lg bg-[#D99B58] px-2 text-[10px] font-bold text-white transition-transform active:scale-95"
                    >
                      Bán 1
                    </button>
                    {item.qty > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          soundFX.sparkle();
                          item.onSell(item.qty);
                        }}
                        className="min-h-[26px] rounded-lg bg-[#8C6239] px-2 text-[10px] font-bold text-white transition-transform active:scale-95"
                      >
                        Hết
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
