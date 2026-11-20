import React, {useEffect, useState} from 'react';
import {
  AlertTriangle,
  Coins,
  HeartPulse,
  PackageCheck,
  ShoppingBag,
  Sparkles,
  Utensils,
  Wheat,
  X,
} from 'lucide-react';
import {
  ANIMAL_LIST,
  ANIMAL_PRODUCTS,
  ANIMALS,
  MAX_PASTURE_ANIMALS,
  SUPPLY_PRICES,
} from '../../data/farmCatalog';
import {
  AnimalType,
  FarmInventory,
  LivestockAnimalState,
} from '../../types/game';
import {soundFX} from '../../utils/sound';

interface LivestockModalProps {
  coins: number;
  animals: LivestockAnimalState[];
  inventory: FarmInventory;
  onBuyAnimal: (type: AnimalType) => void;
  onFeedAnimal: (animalId: string) => void;
  onCureAnimal: (animalId: string) => void;
  onCollectProduce: (animalId: string) => void;
  onSellAnimal: (animalId: string) => void;
  onBuySupply: (supply: 'animalFeed' | 'animalMedicine', qty?: number) => void;
  onCraftFeedFromCrop: (crop: 'wheat' | 'corn') => void;
  onClose: () => void;
}

function formatShortTime(ms: number): string {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}p ${s.toString().padStart(2, '0')}s` : `${s}s`;
}

export const LivestockModal: React.FC<LivestockModalProps> = ({
  coins,
  animals,
  inventory,
  onBuyAnimal,
  onFeedAnimal,
  onCureAnimal,
  onCollectProduce,
  onSellAnimal,
  onBuySupply,
  onCraftFeedFromCrop,
  onClose,
}) => {
  const [tab, setTab] = useState<'pasture' | 'market'>('pasture');
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const readyCount = animals.filter((a) => a.hasProduce).length;
  const sickCount = animals.filter((a) => a.sick).length;
  const wheatQty = inventory.crops.wheat || 0;
  const cornQty = inventory.crops.corn || 0;

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-stone-950/65 p-3 sm:p-5"
      onClick={onClose}
    >
      <div
        className="anim-pop flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border-4 border-[#9E6B40] bg-[#FAF3E8] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#E5D5BE] bg-[#F2E5D2] px-4 py-3">
          <div className="flex items-center gap-2">
            <Wheat className="h-5 w-5 text-[#8A5B32]" />
            <div>
              <h2 className="font-display text-base font-bold text-[#4A3525]">
                Khu Chăn Nuôi Tự Do ({animals.length}/{MAX_PASTURE_ANIMALS})
              </h2>
              <p className="text-[11px] text-[#7A6048]">
                Gà, Lợn & Bò tự do đi lại · Cho ăn & trị bệnh để thu hoạch đều đặn
              </p>
            </div>
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
              aria-label="Đóng khu chăn nuôi"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E3CEB2] text-[#4A3525] active:scale-95"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Supply summary strip */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[#EADBC5] bg-[#F6ECDC] px-4 py-2 text-xs text-[#5B422E]">
          <div className="flex flex-wrap items-center gap-3 font-semibold tabular-nums">
            <span>Thức ăn thú: {inventory.supplies.animalFeed}</span>
            <span>Thuốc thú y: {inventory.supplies.animalMedicine}</span>
          </div>
          {(readyCount > 0 || sickCount > 0) && (
            <div className="flex items-center gap-2 text-[11px] font-bold">
              {readyCount > 0 && (
                <span className="text-[#4B8A5B]">{readyCount} sản phẩm sẵn sàng!</span>
              )}
              {sickCount > 0 && (
                <span className="text-[#C2515E]">{sickCount} con đang mệt!</span>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex shrink-0 items-center gap-2 border-b border-[#E5D5BE] bg-[#FAF3E8] px-4 py-2">
          <button
            type="button"
            onClick={() => {
              soundFX.tap();
              setTab('pasture');
            }}
            className={`min-h-[38px] rounded-xl px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
              tab === 'pasture'
                ? 'bg-[#8C5B32] text-white shadow-xs'
                : 'bg-[#EADBC6] text-[#5B422E] hover:bg-[#DFCCB0]'
            }`}
          >
            Đàn Vật Nuôi ({animals.length})
          </button>
          <button
            type="button"
            onClick={() => {
              soundFX.tap();
              setTab('market');
            }}
            className={`min-h-[38px] rounded-xl px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
              tab === 'market'
                ? 'bg-[#8C5B32] text-white shadow-xs'
                : 'bg-[#EADBC6] text-[#5B422E] hover:bg-[#DFCCB0]'
            }`}
          >
            Mua Giống, Thức Ăn & Thuốc
          </button>
        </div>

        <div className="custom-scroll flex-1 overflow-y-auto p-4 text-[#4A3525]">
          {tab === 'pasture' ? (
            animals.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-[#DFCCB0] bg-white p-6 text-center">
                <div className="text-sm font-bold text-[#6F4E37]">Khu chăn nuôi đang trống</div>
                <div className="mt-1 text-xs text-[#8A6D53]">
                  Sang tab &quot;Mua Giống, Thức Ăn & Thuốc&quot; để thả Gà, Lợn hoặc Bò vào đồng cỏ nhé!
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {animals.map((ani) => {
                  const def = ANIMALS[ani.type];
                  const prod = ANIMAL_PRODUCTS[def.produceId];
                  const hungerInt = Math.round(ani.hunger);
                  const pct = ani.hasProduce
                    ? 100
                    : Math.min(
                        99,
                        Math.max(4, Math.round((1 - ani.remainingMs / ani.cycleMs) * 100)),
                      );

                  return (
                    <div
                      key={ani.id}
                      className={`flex flex-col justify-between gap-3 rounded-2xl border bg-white p-3.5 ${
                        ani.sick
                          ? 'border-[#E8A3AD] bg-[#FFF6F7]'
                          : ani.hasProduce
                            ? 'border-[#9AC99E] bg-[#F5FBF6]'
                            : 'border-[#E0CEB6]'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-4 w-4 shrink-0 rounded-full border border-black/15"
                              style={{backgroundColor: def.color}}
                            />
                            <div>
                              <div className="text-sm font-bold text-[#4A3525]">
                                {ani.name}
                              </div>
                              <div className="text-[11px] text-[#7A6048]">
                                {def.name} · Tạo {prod.name} ({prod.directSellPrice} Xu)
                              </div>
                            </div>
                          </div>

                          <span
                            className={`text-xs font-bold tabular-nums ${
                              ani.hasProduce
                                ? 'text-[#4B8A5B]'
                                : ani.sick
                                  ? 'text-[#C2515E]'
                                  : 'text-[#8C5B32]'
                            }`}
                          >
                            {ani.hasProduce
                              ? 'Thu hoạch!'
                              : ani.sick
                                ? 'Đang mệt'
                                : formatShortTime(ani.remainingMs)}
                          </span>
                        </div>

                        <div>
                          <div className="mb-1 flex justify-between text-[11px] text-[#7A6048]">
                            <span>Tiến độ tạo {prod.name}</span>
                            <span className="font-bold tabular-nums">{pct}%</span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-[#EFE4D3]">
                            <div
                              className={`h-full rounded-full ${
                                ani.hasProduce ? 'bg-[#5FA86B]' : 'bg-[#C9925D]'
                              }`}
                              style={{width: `${pct}%`}}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="mb-1 flex justify-between text-[11px] text-[#7A6048]">
                            <span>Độ no</span>
                            <span
                              className={`font-bold tabular-nums ${
                                hungerInt <= 25 ? 'text-[#C2515E]' : 'text-[#6F4E37]'
                              }`}
                            >
                              {hungerInt}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#EFE4D3]">
                            <div
                              className={`h-full rounded-full ${
                                hungerInt <= 25 ? 'bg-[#D96B59]' : 'bg-[#E5A93C]'
                              }`}
                              style={{width: `${hungerInt}%`}}
                            />
                          </div>
                        </div>

                        {ani.sick && (
                          <div className="flex items-center gap-1.5 rounded-xl border border-[#EAB1B9] bg-[#FFEBEF] px-2.5 py-1.5 text-[11px] font-semibold text-[#A43245]">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                            <span>Vật nuôi bị ốm, cần Thuốc Thú Y để hồi phục!</span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {ani.hasProduce && (
                          <button
                            type="button"
                            onClick={() => {
                              soundFX.sparkle();
                              onCollectProduce(ani.id);
                            }}
                            className="flex min-h-[36px] w-full items-center justify-center gap-1.5 rounded-xl bg-[#5FA86B] px-3 text-xs font-bold text-white shadow-xs transition-transform active:scale-95"
                          >
                            <PackageCheck className="h-4 w-4" />
                            <span>Thu +1 {prod.name}</span>
                          </button>
                        )}

                        {ani.sick && (
                          <button
                            type="button"
                            disabled={
                              inventory.supplies.animalMedicine <= 0 &&
                              coins < SUPPLY_PRICES.animalMedicine
                            }
                            onClick={() => {
                              soundFX.sparkle();
                              onCureAnimal(ani.id);
                            }}
                            className="flex min-h-[36px] flex-1 items-center justify-center gap-1 rounded-xl bg-[#D95970] px-2.5 text-[11px] font-bold text-white transition-transform active:scale-95 disabled:cursor-not-allowed disabled:bg-[#E6DDD1] disabled:text-[#9B8C7E]"
                          >
                            <HeartPulse className="h-3.5 w-3.5" />
                            <span>
                              {inventory.supplies.animalMedicine > 0
                                ? 'Chữa Bệnh (1 Thuốc)'
                                : `Chữa (${SUPPLY_PRICES.animalMedicine} Xu)`}
                            </span>
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={
                            hungerInt >= 95 ||
                            (inventory.supplies.animalFeed <= 0 &&
                              coins < SUPPLY_PRICES.animalFeed)
                          }
                          onClick={() => {
                            soundFX.tap();
                            onFeedAnimal(ani.id);
                          }}
                          className="flex min-h-[36px] flex-1 items-center justify-center gap-1 rounded-xl bg-[#E09B3D] px-2.5 text-[11px] font-bold text-white transition-transform active:scale-95 disabled:cursor-not-allowed disabled:bg-[#E6DDD1] disabled:text-[#9B8C7E]"
                        >
                          <Utensils className="h-3.5 w-3.5" />
                          <span>
                            {inventory.supplies.animalFeed > 0
                              ? 'Cho Ăn (1 Cám)'
                              : `Cho Ăn (${SUPPLY_PRICES.animalFeed} Xu)`}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            soundFX.sparkle();
                            onSellAnimal(ani.id);
                          }}
                          className="flex min-h-[36px] items-center justify-center rounded-xl border border-[#DFCCB0] bg-[#FAF3E8] px-2.5 text-[11px] font-semibold text-[#6F4E37] transition-transform active:scale-95"
                        >
                          Bán ({def.sellAnimalPrice} Xu)
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            <div className="space-y-4">
              {/* Animals Market */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-[#6F4E37]">
                  Mua Con Giống Thả Tự Do (Tối đa {MAX_PASTURE_ANIMALS} con trong khu rào)
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {ANIMAL_LIST.map((def) => {
                    const full = animals.length >= MAX_PASTURE_ANIMALS;
                    const canBuy = !full && coins >= def.buyPrice;
                    return (
                      <div
                        key={def.type}
                        className="flex flex-col justify-between gap-3 rounded-2xl border border-[#E0CEB6] bg-white p-3.5"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-4 w-4 shrink-0 rounded-full border border-black/15"
                              style={{backgroundColor: def.color}}
                            />
                            <span className="text-sm font-bold text-[#4A3525]">
                              {def.name}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#7A6048]">{def.description}</div>
                        </div>

                        <button
                          type="button"
                          disabled={!canBuy}
                          onClick={() => {
                            soundFX.sparkle();
                            onBuyAnimal(def.type);
                            setTab('pasture');
                          }}
                          className={`flex min-h-[38px] w-full items-center justify-center rounded-xl px-3 text-xs font-bold tabular-nums transition-transform active:scale-95 ${
                            canBuy
                              ? 'bg-[#6BA383] text-white shadow-xs'
                              : 'cursor-not-allowed bg-[#E6DDD1] text-[#9B8C7E]'
                          }`}
                        >
                          {full ? 'Chuồng Đã Đầy' : `Mua · ${def.buyPrice} Xu`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Feed & Medicine + Craft feed from Wheat/Corn */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-[#6F4E37]">
                  Thức Ăn Chăn Nuôi & Thuốc Thú Y
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="flex flex-col justify-between gap-3 rounded-2xl border border-[#E0CEB6] bg-white p-3.5">
                    <div>
                      <div className="text-sm font-bold text-[#4A3525]">
                        Thức Ăn Chăn Nuôi (Có: {inventory.supplies.animalFeed})
                      </div>
                      <div className="mt-0.5 text-[11px] text-[#7A6048]">
                        Cho thú ăn giúp tăng nhanh tiến độ ra Trứng, Thịt & Sữa.
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        disabled={coins < SUPPLY_PRICES.animalFeed}
                        onClick={() => {
                          soundFX.sparkle();
                          onBuySupply('animalFeed', 1);
                        }}
                        className="flex min-h-[34px] flex-1 items-center justify-center gap-1 rounded-xl bg-[#E09B3D] px-2.5 text-xs font-bold text-white active:scale-95 disabled:cursor-not-allowed disabled:bg-[#E6DDD1] disabled:text-[#9B8C7E]"
                      >
                        <ShoppingBag className="h-3.5 w-3.5" />
                        <span>Mua 1 ({SUPPLY_PRICES.animalFeed} Xu)</span>
                      </button>
                      <button
                        type="button"
                        disabled={coins < SUPPLY_PRICES.animalFeed * 5}
                        onClick={() => {
                          soundFX.sparkle();
                          onBuySupply('animalFeed', 5);
                        }}
                        className="flex min-h-[34px] items-center justify-center rounded-xl bg-[#8C5B32] px-3 text-xs font-bold text-white active:scale-95 disabled:cursor-not-allowed disabled:bg-[#E6DDD1] disabled:text-[#9B8C7E]"
                      >
                        ×5
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 border-t border-[#F0E3D1] pt-2">
                      <button
                        type="button"
                        disabled={wheatQty < 1}
                        onClick={() => {
                          soundFX.sparkle();
                          onCraftFeedFromCrop('wheat');
                        }}
                        className="flex min-h-[32px] flex-1 items-center justify-center gap-1 rounded-xl bg-[#6BA383] px-2 text-[11px] font-bold text-white active:scale-95 disabled:cursor-not-allowed disabled:bg-[#E6DDD1] disabled:text-[#9B8C7E]"
                      >
                        <Sparkles className="h-3 w-3" />
                        <span>1 Lúa Mì → +2 Cám ({wheatQty})</span>
                      </button>
                      <button
                        type="button"
                        disabled={cornQty < 1}
                        onClick={() => {
                          soundFX.sparkle();
                          onCraftFeedFromCrop('corn');
                        }}
                        className="flex min-h-[32px] flex-1 items-center justify-center gap-1 rounded-xl bg-[#6BA383] px-2 text-[11px] font-bold text-white active:scale-95 disabled:cursor-not-allowed disabled:bg-[#E6DDD1] disabled:text-[#9B8C7E]"
                      >
                        <Sparkles className="h-3 w-3" />
                        <span>1 Ngô → +3 Cám ({cornQty})</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between gap-3 rounded-2xl border border-[#E0CEB6] bg-white p-3.5">
                    <div>
                      <div className="text-sm font-bold text-[#4A3525]">
                        Thuốc Thú Y (Có: {inventory.supplies.animalMedicine})
                      </div>
                      <div className="mt-0.5 text-[11px] text-[#7A6048]">
                        Dùng để chữa bệnh cho Gà, Lợn hoặc Bò khi thời tiết thay đổi.
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        disabled={coins < SUPPLY_PRICES.animalMedicine}
                        onClick={() => {
                          soundFX.sparkle();
                          onBuySupply('animalMedicine', 1);
                        }}
                        className="flex min-h-[36px] flex-1 items-center justify-center gap-1 rounded-xl bg-[#D95970] px-3 text-xs font-bold text-white active:scale-95 disabled:cursor-not-allowed disabled:bg-[#E6DDD1] disabled:text-[#9B8C7E]"
                      >
                        <HeartPulse className="h-3.5 w-3.5" />
                        <span>Mua 1 ({SUPPLY_PRICES.animalMedicine} Xu)</span>
                      </button>
                      <button
                        type="button"
                        disabled={coins < SUPPLY_PRICES.animalMedicine * 3}
                        onClick={() => {
                          soundFX.sparkle();
                          onBuySupply('animalMedicine', 3);
                        }}
                        className="flex min-h-[36px] items-center justify-center rounded-xl bg-[#8C5B32] px-3 text-xs font-bold text-white active:scale-95 disabled:cursor-not-allowed disabled:bg-[#E6DDD1] disabled:text-[#9B8C7E]"
                      >
                        ×3
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
