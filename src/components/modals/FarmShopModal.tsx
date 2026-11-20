import React, {useState} from 'react';
import {
  Coins,
  PawPrint,
  ShoppingBag,
  Sprout,
  Store,
  X,
} from 'lucide-react';
import {FarmItemIcon} from '../FarmItemIcon';
import {
  ANIMAL_LIST,
  CROP_LIST,
  MAX_COOP_ANIMALS,
  MAX_POND_FISH,
  POND_FISH_LIST,
  SUPPLY_PRICES,
} from '../../data/farmCatalog';
import {
  AnimalType,
  CropType,
  FarmInventory,
  FarmSupplies,
  PondFishSpecies,
} from '../../types/game';
import {soundFX} from '../../utils/sound';

interface FarmShopModalProps {
  coins: number;
  inventory: FarmInventory;
  storageUsed: number;
  storageCapacity: number;
  poultryCount: number;
  cattleCount: number;
  pondCount: number;
  onBuySeed: (crop: CropType, qty?: number) => void;
  onBuySupply: (supply: keyof FarmSupplies, qty?: number) => void;
  onBuyAnimal: (type: AnimalType) => void;
  onStockFish: (species: PondFishSpecies) => void;
  onClose: () => void;
}

function formatGrowShort(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return m > 0 ? `${h}g${m}p` : `${h}g`;
  return `${m}p`;
}

export const FarmShopModal: React.FC<FarmShopModalProps> = ({
  coins,
  inventory,
  storageUsed,
  storageCapacity,
  poultryCount,
  cattleCount,
  pondCount,
  onBuySeed,
  onBuySupply,
  onBuyAnimal,
  onStockFish,
  onClose,
}) => {
  const [tab, setTab] = useState<'seeds' | 'supplies' | 'animals'>('seeds');
  const freeStorage = Math.max(0, storageCapacity - storageUsed);

  const supplyCards: {
    key: keyof FarmSupplies;
    name: string;
    price: number;
    owned: number;
    desc: string;
    bulkQty: number;
    btnClass: string;
    icon: React.ReactNode;
  }[] = [
    {
      key: 'bugSpray',
      name: 'Xịt Sâu',
      price: SUPPLY_PRICES.bugSpray,
      owned: inventory.supplies.bugSpray,
      desc: 'Xịt 1 cây bị sâu giữ +2 sản lượng.',
      bulkQty: 5,
      btnClass: 'bg-[#D95970]',
      icon: <FarmItemIcon kind="supply" id="bugSpray" className="h-6 w-6 shrink-0" />,
    },
    {
      key: 'animalFeed',
      name: 'Cám Vật Nuôi',
      price: SUPPLY_PRICES.animalFeed,
      owned: inventory.supplies.animalFeed,
      desc: 'Đổ máng chuồng (1 túi/con).',
      bulkQty: 5,
      btnClass: 'bg-[#E09B3D]',
      icon: <FarmItemIcon kind="supply" id="animalFeed" className="h-6 w-6 shrink-0" />,
    },
    {
      key: 'animalMedicine',
      name: 'Thuốc Thú Y',
      price: SUPPLY_PRICES.animalMedicine,
      owned: inventory.supplies.animalMedicine,
      desc: 'Chữa bệnh gia cầm & gia súc.',
      bulkQty: 3,
      btnClass: 'bg-[#C95168]',
      icon: <FarmItemIcon kind="supply" id="animalMedicine" className="h-6 w-6 shrink-0" />,
    },
    {
      key: 'fishFeed',
      name: 'Cám Thủy Sinh',
      price: SUPPLY_PRICES.fishFeed,
      owned: inventory.supplies.fishFeed,
      desc: 'Rải gần hồ (1 túi/3-4 con).',
      bulkQty: 5,
      btnClass: 'bg-[#2F789B]',
      icon: <FarmItemIcon kind="supply" id="fishFeed" className="h-6 w-6 shrink-0" />,
    },
    {
      key: 'fishMedicine',
      name: 'Thuốc Thủy Sinh',
      price: SUPPLY_PRICES.fishMedicine,
      owned: inventory.supplies.fishMedicine,
      desc: 'Trị bệnh Cá, Vịt & Rùa.',
      bulkQty: 3,
      btnClass: 'bg-[#4B8A5B]',
      icon: <FarmItemIcon kind="supply" id="fishMedicine" className="h-6 w-6 shrink-0" />,
    },
  ];

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-stone-950/60 p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="anim-pop flex max-h-[86dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border-[3px] border-[#5C8F6D] bg-[#FAF5EC] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#DCE5D8] bg-[#E9F3EC] px-3 py-2">
          <div className="flex items-center gap-1.5">
            <Store className="h-4 w-4 text-[#427A58]" />
            <h2 className="font-display text-sm font-bold text-[#2F4A39]">
              Xe Bus Shop Nông Trại
            </h2>
          </div>

          <div className="flex items-center gap-1.5">
            <div
              className={`rounded-lg border px-2 py-0.5 text-[11px] font-bold tabular-nums ${
                freeStorage <= 0
                  ? 'border-[#E6A3AD] bg-[#FFF1F3] text-[#B84356]'
                  : 'border-[#CFE0D5] bg-white text-[#3B6B4D]'
              }`}
              title="Sức chứa Nhà Kho"
            >
              Kho {storageUsed}/{storageCapacity}
            </div>
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
              aria-label="Đóng shop nông trại"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#D4E6DA] text-[#2F4A39] active:scale-95"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="custom-scroll flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-[#E3E7DE] bg-[#F4F8F4] px-3 py-1.5">
          <button
            type="button"
            onClick={() => {
              soundFX.tap();
              setTab('seeds');
            }}
            className={`flex min-h-[30px] shrink-0 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold whitespace-nowrap transition-colors ${
              tab === 'seeds'
                ? 'bg-[#4E8B64] text-white shadow-xs'
                : 'bg-[#E1ECE4] text-[#355441] hover:bg-[#D2E2D7]'
            }`}
          >
            <Sprout className="h-3.5 w-3.5" />
            <span>Hạt Giống ({CROP_LIST.length})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              soundFX.tap();
              setTab('supplies');
            }}
            className={`flex min-h-[30px] shrink-0 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold whitespace-nowrap transition-colors ${
              tab === 'supplies'
                ? 'bg-[#C97B48] text-white shadow-xs'
                : 'bg-[#E1ECE4] text-[#355441] hover:bg-[#D2E2D7]'
            }`}
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            <span>Vật Tư & Thuốc</span>
          </button>
          <button
            type="button"
            onClick={() => {
              soundFX.tap();
              setTab('animals');
            }}
            className={`flex min-h-[30px] shrink-0 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold whitespace-nowrap transition-colors ${
              tab === 'animals'
                ? 'bg-[#2F789B] text-white shadow-xs'
                : 'bg-[#E1ECE4] text-[#355441] hover:bg-[#D2E2D7]'
            }`}
          >
            <PawPrint className="h-3.5 w-3.5" />
            <span>Thú & Thủy Sinh</span>
          </button>
        </div>

        <div className="custom-scroll flex-1 overflow-y-auto p-2.5 text-[#3A3128] sm:p-3">
          {tab === 'seeds' && (
            <div className="grid grid-cols-2 gap-1.5">
              {CROP_LIST.map((crop) => {
                const owned = inventory.seeds[crop.id] || 0;
                const canBuy1 = coins >= crop.seedPrice && freeStorage >= 1;
                const canBuy5 = coins >= crop.seedPrice * 5 && freeStorage >= 5;
                return (
                  <div
                    key={crop.id}
                    className="flex flex-col justify-between gap-1 rounded-xl border border-[#DFD6C7] bg-white p-2"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <FarmItemIcon kind="seed" id={crop.id} className="h-6 w-6 shrink-0" />
                        <span className="truncate text-xs font-bold text-[#3D3025]">
                          {crop.name}
                        </span>
                      </div>
                      <span className="shrink-0 rounded bg-[#F2EFE8] px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-[#4E7A5B]">
                        ×{owned}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] tabular-nums text-[#786552]">
                      <span>{formatGrowShort(crop.growSeconds)}</span>
                      <span>Thu {crop.rawSellPrice * 2} Xu</span>
                    </div>

                    <div className="flex gap-1">
                      <button
                        type="button"
                        disabled={!canBuy1}
                        onClick={() => {
                          soundFX.sparkle();
                          onBuySeed(crop.id, 1);
                        }}
                        className="flex min-h-[26px] flex-1 items-center justify-center rounded-lg bg-[#55946B] px-2 text-[11px] font-bold text-white tabular-nums transition-transform active:scale-95 disabled:cursor-not-allowed disabled:bg-[#E5E0D7] disabled:text-[#968D82]"
                      >
                        {freeStorage < 1 ? 'Đầy kho' : `${crop.seedPrice} Xu`}
                      </button>
                      <button
                        type="button"
                        disabled={!canBuy5}
                        onClick={() => {
                          soundFX.sparkle();
                          onBuySeed(crop.id, 5);
                        }}
                        className="flex min-h-[26px] items-center justify-center rounded-lg bg-[#6F5338] px-2 text-[11px] font-bold text-white tabular-nums transition-transform active:scale-95 disabled:cursor-not-allowed disabled:bg-[#E5E0D7] disabled:text-[#968D82]"
                      >
                        ×5
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'supplies' && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {supplyCards.map((sup) => (
                <div
                  key={sup.key}
                  className="flex flex-col justify-between gap-1.5 rounded-xl border border-[#DFD6C7] bg-white p-2.5"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5">
                        {sup.icon}
                        <span className="text-xs font-bold text-[#3D3025]">{sup.name}</span>
                      </div>
                      <span className="rounded bg-[#F2EFE8] px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-[#5B4B3C]">
                        ×{sup.owned}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[10px] leading-snug text-[#786552]">{sup.desc}</div>
                  </div>

                  <div className="flex gap-1">
                    <button
                      type="button"
                      disabled={coins < sup.price || freeStorage < 1}
                      onClick={() => {
                        soundFX.sparkle();
                        onBuySupply(sup.key, 1);
                      }}
                      className={`flex min-h-[28px] flex-1 items-center justify-center rounded-lg px-2 text-[11px] font-bold text-white tabular-nums transition-transform active:scale-95 disabled:cursor-not-allowed disabled:bg-[#E5E0D7] disabled:text-[#968D82] ${sup.btnClass}`}
                    >
                      {freeStorage < 1 ? 'Đầy kho' : `Mua 1 (${sup.price} Xu)`}
                    </button>
                    <button
                      type="button"
                      disabled={coins < sup.price * sup.bulkQty || freeStorage < sup.bulkQty}
                      onClick={() => {
                        soundFX.sparkle();
                        onBuySupply(sup.key, sup.bulkQty);
                      }}
                      className="flex min-h-[28px] items-center justify-center rounded-lg bg-[#6F5338] px-2 text-[11px] font-bold text-white tabular-nums transition-transform active:scale-95 disabled:cursor-not-allowed disabled:bg-[#E5E0D7] disabled:text-[#968D82]"
                    >
                      ×{sup.bulkQty}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'animals' && (
            <div className="space-y-3">
              <div>
                <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold text-[#5B422E]">
                  <span>Vật Nuôi Chuồng</span>
                  <span className="tabular-nums text-[#786552]">
                    Gia Cầm {poultryCount}/{MAX_COOP_ANIMALS.poultry} · Gia Súc {cattleCount}/
                    {MAX_COOP_ANIMALS.cattle}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {ANIMAL_LIST.map((def) => {
                    const current = def.coop === 'poultry' ? poultryCount : cattleCount;
                    const max = MAX_COOP_ANIMALS[def.coop];
                    const full = current >= max;
                    const canBuy = !full && coins >= def.buyPrice;
                    return (
                      <div
                        key={def.type}
                        className="flex flex-col justify-between gap-1.5 rounded-xl border border-[#DFD6C7] bg-white p-2"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="h-3 w-3 shrink-0 rounded-full border border-black/15"
                                style={{backgroundColor: def.color}}
                              />
                              <span className="text-xs font-bold text-[#3D3025]">{def.name}</span>
                            </div>
                            <span className="rounded bg-[#F2E5D2] px-1.5 py-0.5 text-[9px] font-semibold text-[#6F4E37]">
                              {def.coop === 'poultry' ? 'Gia Cầm' : 'Gia Súc'}
                            </span>
                          </div>
                          <div className="mt-0.5 text-[10px] leading-snug text-[#786552]">
                            {def.description}
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={!canBuy}
                          onClick={() => {
                            soundFX.sparkle();
                            onBuyAnimal(def.type);
                          }}
                          className="flex min-h-[28px] w-full items-center justify-center rounded-lg bg-[#6BA383] px-2 text-[11px] font-bold text-white tabular-nums transition-transform active:scale-95 disabled:cursor-not-allowed disabled:bg-[#E5E0D7] disabled:text-[#968D82]"
                        >
                          {full ? 'Chuồng Đầy' : `Mua (${def.buyPrice} Xu)`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold text-[#224457]">
                  <span>Thủy Sinh Hồ Cá</span>
                  <span className="tabular-nums text-[#2F789B]">
                    Trong hồ: {pondCount}/{MAX_POND_FISH}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
                  {POND_FISH_LIST.map((spec) => {
                    const full = pondCount >= MAX_POND_FISH;
                    const canBuy = !full && coins >= spec.fryPrice;
                    return (
                      <div
                        key={spec.species}
                        className="flex flex-col justify-between gap-1.5 rounded-xl border border-[#CFE4EF] bg-white p-2"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex min-w-0 items-center gap-1.5">
                              <span
                                className="h-3 w-3 shrink-0 rounded-full border border-black/15"
                                style={{backgroundColor: spec.bodyColor}}
                              />
                              <span className="truncate text-xs font-bold text-[#224457]">
                                {spec.name}
                              </span>
                            </div>
                            <span className="shrink-0 rounded bg-[#E4F2F9] px-1 py-0.5 text-[9px] font-bold text-[#2A6F91]">
                              {spec.durationHours === 12
                                ? '12g'
                                : spec.durationHours === 24
                                  ? '1n'
                                  : '2n'}
                            </span>
                          </div>
                          <div className="mt-0.5 text-[10px] font-semibold text-[#2E8555]">
                            Bán lớn: {spec.matureSellPrice} Xu
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={!canBuy}
                          onClick={() => {
                            soundFX.splash();
                            onStockFish(spec.species);
                          }}
                          className="flex min-h-[28px] w-full items-center justify-center rounded-lg bg-[#2F789B] px-2 text-[11px] font-bold text-white tabular-nums transition-transform active:scale-95 disabled:cursor-not-allowed disabled:bg-[#DFEAEF] disabled:text-[#7D94A1]"
                        >
                          {full ? 'Hồ Đầy' : `Mua (${spec.fryPrice} Xu)`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

