import React, {useState} from 'react';
import {
  ArrowLeft,
  Check,
  ChefHat,
  Coins,
  Flame,
  Info,
  Package,
  Sparkles,
  Warehouse,
  X,
  Zap,
} from 'lucide-react';
import {
  BbqFoodId,
  BoatId,
  BoatsState,
  BugNetState,
  FishingRodState,
  MountId,
  OwnedMountsState,
  OwnedPetState,
  PetSupplies,
  PetSupplyId,
  RecipeId,
} from '../../types/game';
import {MOUNT_CATALOG, MOUNT_RANK_META} from '../../data/mountCatalog';
import {
  getPetXpForNextLevel,
  isPetTooHungry,
  MAX_PET_INTIMACY,
  PET_CATALOG,
  PET_FEED_HUNGER_THRESHOLD,
  PET_PLAY_HAPPINESS_THRESHOLD,
  PET_STARVING_THRESHOLD,
  PET_SUPPLY_LIST,
} from '../../data/petCatalog';
import {
  BOAT_LIST,
  getRodRepairCost,
  WOODEN_ROD_MAX_DURABILITY,
  WOODEN_ROD_PRICE,
} from '../../data/fishingCatalog';
import {
  getNetRepairCost,
  WOODEN_NET_MAX_DURABILITY,
  WOODEN_NET_PRICE,
} from '../../data/insectCatalog';
import {KITCHEN_RECIPES} from '../../data/farmCatalog';
import {PEPPA_RECIPES, PeppaRecipeId} from '../../data/peppaKitchenCatalog';
import {PeppaDishIcon} from './PeppaFoodIcons';
import {BBQ_FOOD_LIST, VENDING_DRINK_LIST} from '../../data/foodCatalog';
import {HandheldFoodIcon} from './VendingMachineModal';
import {soundFX} from '../../utils/sound';
import {
  BicycleMountIcon,
  BoatSkinIcon,
  DongThapLotusMountIcon,
  LotusUmbrellaMountIcon,
  MountCarIcon,
  PetCatFaceIcon,
  RodAndNetIcon,
  SkateboardMountIcon,
  WitchBroomMountIcon,
  WoodenRodIcon,
} from '../FishingIcons';
import {WoodenNetIcon} from '../InsectIcons';
import {BlingBlingBadge, PetSpeciesIcon, PetSupplyIcon} from '../PetIcons';

export type BagSubTab = 'list' | 'tools' | 'pets' | 'boats' | 'mounts' | 'food';

interface BackpackModalProps {
  fishingRod: FishingRodState;
  bugNet: BugNetState;
  boats: BoatsState;
  ownedMounts: OwnedMountsState;
  ownedPets: OwnedPetState[];
  activePetId: string | null;
  petSupplies: PetSupplies;
  bbqFoods: Partial<Record<BbqFoodId, number>>;
  equippedFoodId: BbqFoodId | null;
  farmDishes: Partial<Record<RecipeId, number>>;
  peppaDishes: Partial<Record<PeppaRecipeId, number>>;
  initialSubTab?: BagSubTab;
  onToggleEquipRod: () => void;
  onToggleEquipNet: () => void;
  onSelectBoat: (boatId: BoatId) => void;
  onToggleEquipFood: (foodId: BbqFoodId) => void;
  onEatPeppaDish: (recipeId: PeppaRecipeId) => {ok: boolean; message: string};
  onSellPeppaDish: (recipeId: PeppaRecipeId) => {ok: boolean; message: string};
  onToggleMount: (mountId: MountId) => void;
  onToggleSummonPet: (petId: string) => void;
  onRenamePet: (petId: string, newName: string) => void;
  onUsePetSupply: (petId: string, supplyId: PetSupplyId) => {ok: boolean; message: string};
  onClose: () => void;
}

export const BackpackModal: React.FC<BackpackModalProps> = ({
  fishingRod,
  bugNet,
  boats,
  ownedMounts,
  ownedPets,
  activePetId,
  petSupplies,
  bbqFoods,
  equippedFoodId,
  farmDishes,
  peppaDishes,
  initialSubTab = 'list',
  onToggleEquipRod,
  onToggleEquipNet,
  onSelectBoat,
  onToggleEquipFood,
  onEatPeppaDish,
  onSellPeppaDish,
  onToggleMount,
  onToggleSummonPet,
  onRenamePet,
  onUsePetSupply,
  onClose,
}) => {
  const [bagSubTab, setBagSubTab] = useState<BagSubTab>(initialSubTab);
  const [petsSubView, setPetsSubView] = useState<'pets' | 'supplies'>('pets');
  const [selectedPetInfoId, setSelectedPetInfoId] = useState<string | null>(null);
  const [petRenameDraft, setPetRenameDraft] = useState('');
  const [petActionFeedback, setPetActionFeedback] = useState<string | null>(null);
  const [foodActionFeedback, setFoodActionFeedback] = useState<string | null>(null);

  const subTitle =
    bagSubTab === 'list'
      ? 'Túi Đồ'
      : bagSubTab === 'tools'
        ? 'Cần & Vợt'
        : bagSubTab === 'pets'
          ? 'Thú Cưng'
          : bagSubTab === 'boats'
            ? 'Thuyền'
            : bagSubTab === 'food'
              ? 'Thức Ăn'
              : 'Phương Tiện Cưỡi';

  return (
    <div
      className="phone-ui fixed inset-0 z-50 flex items-center justify-center bg-stone-950/65 p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="anim-pop flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border-4 border-[#9C734B] bg-[#FAF3E8] text-[#4A3525] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#E5D5BE] bg-[#F2E5D2] px-4 py-3">
          {bagSubTab !== 'list' ? (
            <button
              type="button"
              onClick={() => {
                soundFX.tap();
                setSelectedPetInfoId(null);
                setPetActionFeedback(null);
                setBagSubTab('list');
              }}
              className="flex min-h-[34px] items-center gap-1 rounded-xl bg-[#E3CEB2] px-2.5 py-1 text-xs font-extrabold text-[#4A3525] transition-transform active:scale-95"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Túi Đồ</span>
            </button>
          ) : (
            <span className="w-16" />
          )}

          <h2 className="text-sm font-black text-[#4A3525]">{subTitle}</h2>

          <button
            type="button"
            onClick={() => {
              soundFX.tap();
              onClose();
            }}
            aria-label="Đóng túi đồ"
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#E3CEB2] text-[#4A3525] transition-transform active:scale-95"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="custom-scroll min-h-0 flex-1 overflow-y-auto p-4">
          {bagSubTab === 'list' && (
            <div className="space-y-3">
              <div className="rounded-2xl border border-[#E5D4BA] bg-white p-3.5">
                <div className="mb-3 text-[11px] font-bold text-[#7B6247]">
                  Chọn mục trong túi đồ:
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {/* 1. Cần & Vợt */}
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.tap();
                      setBagSubTab('tools');
                    }}
                    className="group relative flex flex-col items-center gap-1.5 rounded-2xl border-2 border-[#E8D7BC] bg-[#FFF8EB] p-3 transition hover:border-[#3C95AD] active:scale-95"
                  >
                    {(fishingRod.equipped || bugNet.equipped) && (
                      <span className="absolute -top-1.5 right-1 rounded-full bg-[#45A168] px-1.5 py-0.5 text-[9px] font-black text-white shadow-xs">
                        Đang cầm
                      </span>
                    )}
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-xs">
                      <RodAndNetIcon className="h-11 w-11" />
                    </div>
                    <span className="text-xs font-extrabold text-[#4A3525]">Cần &amp; Vợt</span>
                  </button>

                  {/* 2. Pets */}
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.tap();
                      setSelectedPetInfoId(null);
                      setPetsSubView('pets');
                      setPetActionFeedback(null);
                      setBagSubTab('pets');
                    }}
                    className="group relative flex flex-col items-center gap-1.5 rounded-2xl border-2 border-[#E8D7BC] bg-[#FFF8EB] p-3 transition hover:border-[#E08A58] active:scale-95"
                  >
                    {activePetId && (
                      <span className="absolute -top-1.5 right-1 rounded-full bg-[#DF7E5C] px-1.5 py-0.5 text-[9px] font-black text-white shadow-xs">
                        Đang gọi
                      </span>
                    )}
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-xs">
                      <PetCatFaceIcon className="h-10 w-10" />
                    </div>
                    <span className="text-xs font-extrabold text-[#4A3525]">Pets</span>
                  </button>

                  {/* 3. Thuyền */}
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.tap();
                      setBagSubTab('boats');
                    }}
                    className="group relative flex flex-col items-center gap-1.5 rounded-2xl border-2 border-[#E8D7BC] bg-[#FFF8EB] p-3 transition hover:border-[#2E82A8] active:scale-95"
                  >
                    {boats.ownedIds.length > 0 && (
                      <span className="absolute -top-1.5 right-1 rounded-full bg-[#2E82A8] px-1.5 py-0.5 text-[9px] font-black text-white shadow-xs">
                        {boats.ownedIds.length} thuyền
                      </span>
                    )}
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-xs">
                      <BoatSkinIcon
                        boatId={
                          boats.ownedIds.includes(boats.activeBoatId)
                            ? boats.activeBoatId
                            : 'wooden_boat'
                        }
                        className="h-10 w-10"
                      />
                    </div>
                    <span className="text-xs font-extrabold text-[#4A3525]">Thuyền</span>
                  </button>

                  {/* 4. Cưỡi */}
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.tap();
                      setBagSubTab('mounts');
                    }}
                    className="group relative flex flex-col items-center gap-1.5 rounded-2xl border-2 border-[#E8D7BC] bg-[#FFF8EB] p-3 transition hover:border-[#4F8FB5] active:scale-95"
                  >
                    {ownedMounts.activeMountId ? (
                      <span className="absolute -top-1.5 right-1 rounded-full bg-[#2E9467] px-1.5 py-0.5 text-[9px] font-black text-white shadow-xs">
                        Đang cưỡi
                      </span>
                    ) : ownedMounts.ownedIds.length > 0 ? (
                      <span className="absolute -top-1.5 right-1 rounded-full bg-[#2E82A8] px-1.5 py-0.5 text-[9px] font-black text-white shadow-xs">
                        {ownedMounts.ownedIds.length} xe
                      </span>
                    ) : null}
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-xs">
                      <SkateboardMountIcon className="h-10 w-10" />
                    </div>
                    <span className="text-xs font-extrabold text-[#4A3525]">Cưỡi</span>
                  </button>

                  {/* 5. Thức Ăn */}
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.tap();
                      setBagSubTab('food');
                    }}
                    className="group relative col-span-2 flex items-center gap-3 rounded-2xl border-2 border-[#E8D7BC] bg-[#FFF8EB] px-3.5 py-3 transition hover:border-[#D96B38] active:scale-98"
                  >
                    {equippedFoodId && (
                      <span className="absolute -top-1.5 right-2 rounded-full bg-[#D96B38] px-2 py-0.5 text-[9px] font-black text-white shadow-xs">
                        Đang cầm tay
                      </span>
                    )}
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-xs">
                      <Flame className="h-6 w-6 text-[#D95C32]" />
                    </div>
                    <div className="min-w-0 text-left">
                      <div className="text-xs font-extrabold text-[#4A3525]">Thức Ăn</div>
                      <div className="text-[10px] font-semibold text-[#8A6D4E]">
                        Món cầm tay hồi độ no &amp; món nông trại trong kho
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {bagSubTab === 'tools' && (
            <div className="space-y-2.5">
              {/* Wooden Rod */}
              <div className="rounded-2xl border-2 border-[#E3D1B2] bg-white p-3.5 space-y-2.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#C7E4EE] bg-[#EAF6FA]">
                    <WoodenRodIcon className="h-10 w-10" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-black text-[#3B2A1A]">Cần Câu Gỗ</span>
                      {fishingRod.owned ? (
                        <span
                          className={`text-[11px] font-black ${
                            fishingRod.durability <= 0 ? 'text-[#D64545]' : 'text-[#3C8863]'
                          }`}
                        >
                          Độ bền {fishingRod.durability}/{fishingRod.maxDurability}
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-[#9C7D5A]">Chưa có</span>
                      )}
                    </div>
                    <p className="text-[11px] font-semibold text-[#7A6048]">
                      {fishingRod.owned
                        ? `Bấm để trang bị. Độ bền tối đa ${WOODEN_ROD_MAX_DURABILITY} lần câu.`
                        : `Mua tại Sạp Câu Cá của anh Koi gần Hồ Câu (${WOODEN_ROD_PRICE} Xu).`}
                    </p>
                  </div>
                </div>

                {fishingRod.owned && (
                  <>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#EFE4D1]">
                      <div
                        className={`h-full rounded-full transition-all ${
                          fishingRod.durability <= 0
                            ? 'bg-[#E15252]'
                            : fishingRod.durability <= 7
                              ? 'bg-[#E89B35]'
                              : 'bg-[#48A878]'
                        }`}
                        style={{
                          width: `${Math.round(
                            (fishingRod.durability / Math.max(1, fishingRod.maxDurability)) * 100,
                          )}%`,
                        }}
                      />
                    </div>

                    {fishingRod.durability <= 0 && (
                      <div className="rounded-xl border border-[#F3C1C1] bg-[#FDECEC] px-2.5 py-2 text-[11px] font-bold text-[#B63535]">
                        Cần câu đang hỏng! Hãy thả cần bên bờ hồ để sửa nhanh với giá{' '}
                        <span className="font-black">
                          {getRodRepairCost(fishingRod.durability, fishingRod.maxDurability)} Xu
                        </span>
                        .
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        soundFX.tap();
                        onToggleEquipRod();
                      }}
                      className={`w-full rounded-xl py-2.5 text-xs font-black transition active:scale-98 ${
                        fishingRod.equipped
                          ? 'bg-[#D67C3A] text-white hover:bg-[#BE692B]'
                          : 'bg-[#3C95AD] text-white hover:bg-[#2F7D93]'
                      }`}
                    >
                      {fishingRod.equipped
                        ? 'Cất Cần Câu (Tháo trang bị)'
                        : 'Trang Bị Cần Câu'}
                    </button>

                    <div className="text-center text-[10px] font-semibold text-[#8A7257]">
                      Lưu ý: Khi cầm cần câu/vợt, món đồ cầm tay thời trang sẽ tự cất vào Tủ Đồ.
                    </div>
                  </>
                )}
              </div>

              {/* Wooden Bug Net */}
              <div className="rounded-2xl border-2 border-[#E3D1B2] bg-white p-3.5 space-y-2.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#C3E5CC] bg-[#EBF7EE]">
                    <WoodenNetIcon className="h-10 w-10" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-black text-[#3B2A1A]">Vợt Gỗ</span>
                      {bugNet.owned ? (
                        <span
                          className={`text-[11px] font-black ${
                            bugNet.durability <= 0 ? 'text-[#D64545]' : 'text-[#3C8863]'
                          }`}
                        >
                          Độ bền {bugNet.durability}/{bugNet.maxDurability}
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-[#9C7D5A]">Chưa có</span>
                      )}
                    </div>
                    <p className="text-[11px] font-semibold text-[#7A6048]">
                      {bugNet.owned
                        ? `Bắt buộc bật Joystick để rón rén & vung vợt. Độ bền ${WOODEN_NET_MAX_DURABILITY}.`
                        : `Mua tại Sạp Câu & Vợt của anh Koi gần Hồ Câu (${WOODEN_NET_PRICE} Xu).`}
                    </p>
                  </div>
                </div>

                {bugNet.owned && (
                  <>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#EFE4D1]">
                      <div
                        className={`h-full rounded-full transition-all ${
                          bugNet.durability <= 0
                            ? 'bg-[#E15252]'
                            : bugNet.durability <= 7
                              ? 'bg-[#E89B35]'
                              : 'bg-[#48A878]'
                        }`}
                        style={{
                          width: `${Math.round(
                            (bugNet.durability / Math.max(1, bugNet.maxDurability)) * 100,
                          )}%`,
                        }}
                      />
                    </div>

                    {bugNet.durability <= 0 && (
                      <div className="rounded-xl border border-[#F3C1C1] bg-[#FDECEC] px-2.5 py-2 text-[11px] font-bold text-[#B63535]">
                        Vợt gỗ đang hỏng! Bấm nút Bắt trong Thị Trấn để sửa với giá{' '}
                        <span className="font-black">
                          {getNetRepairCost(bugNet.durability, bugNet.maxDurability)} Xu
                        </span>
                        .
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        soundFX.tap();
                        onToggleEquipNet();
                      }}
                      className={`w-full rounded-xl py-2.5 text-xs font-black transition active:scale-98 ${
                        bugNet.equipped
                          ? 'bg-[#D67C3A] text-white hover:bg-[#BE692B]'
                          : 'bg-[#439A6C] text-white hover:bg-[#358059]'
                      }`}
                    >
                      {bugNet.equipped ? 'Cất Vợt Gỗ (Tháo trang bị)' : 'Trang Bị Vợt Gỗ'}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {bagSubTab === 'pets' && (() => {
            const infoPet = selectedPetInfoId
              ? ownedPets.find((p) => p.id === selectedPetInfoId) ?? null
              : null;
            const activePetObj = activePetId
              ? ownedPets.find((p) => p.id === activePetId) ?? null
              : ownedPets[0] ?? null;

            if (infoPet) {
              const spec = PET_CATALOG[infoPet.speciesId];
              const isMax = infoPet.intimacyLevel >= MAX_PET_INTIMACY;
              const isStarving = isPetTooHungry(infoPet);
              const reqXp = getPetXpForNextLevel(infoPet.intimacyLevel);
              const pct = isMax
                ? 100
                : Math.min(100, Math.round((infoPet.intimacyXp / Math.max(1, reqXp)) * 100));

              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        soundFX.tap();
                        setSelectedPetInfoId(null);
                        setPetActionFeedback(null);
                      }}
                      className="flex items-center gap-1 rounded-xl bg-[#EFE0C9] px-2.5 py-1.5 text-[11px] font-bold text-[#5B422E] active:scale-95"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      <span>Danh sách Pets</span>
                    </button>
                    <span className="text-[11px] font-extrabold text-[#7B6247]">Thông Tin Pet</span>
                  </div>

                  <div className="rounded-2xl border-2 border-[#E7CFAF] bg-white p-3.5 shadow-xs space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#EFE0C9] bg-[#FFF8EC]">
                        <PetSpeciesIcon speciesId={infoPet.speciesId} className="h-11 w-11" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1 text-sm font-black text-[#4A3525]">
                          {isMax && <BlingBlingBadge className="h-4 w-4" />}
                          <span className="truncate">{infoPet.name}</span>
                        </div>
                        <div className="mt-0.5 text-[11px] font-bold text-[#7A6048]">
                          Loài: {spec.name} · {spec.moveType === 'fly' ? 'Bay bên trái' : 'Đi bộ'}
                        </div>
                        <div className="mt-0.5 text-[10px] font-bold text-[#9C653C]">
                          Tương tác:{' '}
                          {spec.canHold
                            ? spec.holdMode === 'fly_orbit'
                              ? 'Bay quanh người'
                              : 'Đi quanh người'
                            : 'Không hỗ trợ'}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl bg-[#FAF4EA] p-2.5 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-black text-[#5A3E28]">
                        <span>Độ thân mật: Lv.{infoPet.intimacyLevel}/{MAX_PET_INTIMACY}</span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-extrabold ${
                            infoPet.sick
                              ? 'bg-[#FCE4E8] text-[#C93B4B]'
                              : 'bg-[#E5F6EB] text-[#2B7344]'
                          }`}
                        >
                          {infoPet.sick ? 'Đang bị bệnh' : 'Khỏe mạnh'}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[#EAD9C0]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#EE7394] to-[#F5AA4E] transition-all"
                          style={{width: `${pct}%`}}
                        />
                      </div>
                      <div className="text-[10px] font-bold text-[#7A6048]">
                        {isMax
                          ? 'Đã đạt cấp 10 — Tên pet hiển thị hiệu ứng bling bling!'
                          : `Tiến độ lên cấp: ${infoPet.intimacyXp}/${reqXp}`}
                      </div>
                    </div>

                    {(() => {
                      const hungerPct = Math.round(Math.max(0, Math.min(100, infoPet.hunger ?? 75)));
                      const happinessPct = Math.round(
                        Math.max(0, Math.min(100, infoPet.happiness ?? 75)),
                      );
                      return (
                        <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#FAF4EA] p-2.5">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px] font-black text-[#5A3E28]">
                              <span>Độ no</span>
                              <span className="tabular-nums text-[#B86A1B]">{hungerPct}%</span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#EAD9C0]">
                              <div
                                className="h-full rounded-full bg-[#F0A44B] transition-all"
                                style={{width: `${hungerPct}%`}}
                              />
                            </div>
                            <div className="text-[9px] font-bold text-[#8A7058]">
                              {hungerPct < PET_FEED_HUNGER_THRESHOLD
                                ? 'Cho ăn (+1 thân mật)'
                                : 'Đang no'}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px] font-black text-[#5A3E28]">
                              <span>Vui vẻ</span>
                              <span className="tabular-nums text-[#2E86B0]">{happinessPct}%</span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#DCE9F2]">
                              <div
                                className="h-full rounded-full bg-[#47A9D8] transition-all"
                                style={{width: `${happinessPct}%`}}
                              />
                            </div>
                            <div className="text-[9px] font-bold text-[#678094]">
                              {happinessPct < PET_PLAY_HAPPINESS_THRESHOLD
                                ? 'Chơi (+1 thân mật)'
                                : 'Đang rất vui'}
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {isStarving && (
                      <div className="rounded-xl border border-[#F2C79D] bg-[#FFF3E2] px-2.5 py-2 text-[11px] font-extrabold text-[#B55412]">
                        {infoPet.name} đang đói quá (≤{PET_STARVING_THRESHOLD}%)! Mọi hành động khác tạm khóa, chỉ có thể cho bé ăn lúc này.
                      </div>
                    )}

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (isStarving) {
                          soundFX.tap();
                          setPetActionFeedback(
                            `${infoPet.name} đang đói quá, hãy cho bé ăn trước rồi mới đổi tên nhé!`,
                          );
                          return;
                        }
                        const trimmed = petRenameDraft.trim();
                        if (!trimmed) return;
                        soundFX.sparkle();
                        onRenamePet(infoPet.id, trimmed);
                        setPetActionFeedback(`Đã đổi tên thành "${trimmed}"!`);
                      }}
                      className="space-y-1.5"
                    >
                      <label className="block text-[11px] font-extrabold text-[#5A3E28]">
                        Đổi tên thú cưng:
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={petRenameDraft}
                          disabled={isStarving}
                          onChange={(e) => setPetRenameDraft(e.target.value)}
                          maxLength={18}
                          placeholder={isStarving ? 'Cho ăn trước khi đổi tên...' : 'Nhập tên mới...'}
                          className="min-w-0 flex-1 rounded-xl border border-[#DECBB0] bg-[#FAF4EA] px-3 py-2 text-xs font-bold text-[#3B2A1A] focus:border-[#6F4E37] focus:outline-none disabled:opacity-55"
                        />
                        <button
                          type="submit"
                          disabled={isStarving}
                          className="flex shrink-0 items-center gap-1 rounded-xl bg-[#6F4E37] px-3 py-2 text-xs font-black text-amber-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Lưu
                        </button>
                      </div>
                    </form>

                    <div className="border-t border-[#F0E3D1] pt-2.5 space-y-1.5">
                      <div className="text-[10px] font-extrabold text-[#7B6247]">
                        Dùng đồ từ Túi &gt; Pets cho bé này:
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {PET_SUPPLY_LIST.map((sup) => {
                          const count = petSupplies[sup.id] ?? 0;
                          const isFull =
                            sup.id === 'petFood' &&
                            (infoPet.hunger ?? 75) >= PET_FEED_HUNGER_THRESHOLD;
                          const blockedByHunger = isStarving && sup.id !== 'petFood';
                          const disabled =
                            count <= 0 ||
                            isFull ||
                            blockedByHunger ||
                            (sup.id === 'petMedicine' && !infoPet.sick) ||
                            (sup.id === 'intimacyTest' && isMax);
                          return (
                            <button
                              key={sup.id}
                              type="button"
                              disabled={disabled}
                              onClick={() => {
                                const res = onUsePetSupply(infoPet.id, sup.id);
                                if (res.ok) soundFX.sparkle();
                                else soundFX.tap();
                                setPetActionFeedback(res.message);
                              }}
                              className="flex flex-col items-center gap-1 rounded-xl border border-[#E5D3B8] bg-[#FFF9F0] p-1.5 text-center transition active:scale-95 disabled:opacity-45"
                            >
                              <PetSupplyIcon supplyId={sup.id} className="h-6 w-6" />
                              <span className="line-clamp-1 text-[9px] font-extrabold text-[#4A3525]">
                                {sup.id === 'intimacyTest'
                                  ? 'Test Lv+'
                                  : sup.id === 'petMedicine'
                                    ? 'Thuốc'
                                    : isFull
                                      ? 'Đã no'
                                      : 'Cho ăn'}
                              </span>
                              <span className="text-[9px] font-black text-[#9A5B25] tabular-nums">
                                x{count}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {petActionFeedback && (
                      <div className="rounded-xl bg-[#EAF8EE] px-2.5 py-1.5 text-[11px] font-bold text-[#2A6E40]">
                        {petActionFeedback}
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            return (
              <div className="flex flex-col space-y-2.5">
                <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-[#EFE6D6] p-1">
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.tap();
                      setPetsSubView('pets');
                    }}
                    className={`rounded-lg py-1.5 text-[11px] font-black transition ${
                      petsSubView === 'pets'
                        ? 'bg-[#DF7E5C] text-white shadow-xs'
                        : 'text-[#6A5138]'
                    }`}
                  >
                    Thú Cưng ({ownedPets.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.tap();
                      setPetsSubView('supplies');
                    }}
                    className={`flex items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-black transition ${
                      petsSubView === 'supplies'
                        ? 'bg-[#49A58D] text-white shadow-xs'
                        : 'text-[#6A5138]'
                    }`}
                  >
                    <Package className="h-3 w-3" />
                    Đồ Dùng Pets
                  </button>
                </div>

                {petsSubView === 'pets' ? (
                  ownedPets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#E8CBB0] bg-[#FFF8F0] p-5 text-center">
                      <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#F0D9C2] bg-white shadow-xs">
                        <PetCatFaceIcon className="h-12 w-12" />
                      </div>
                      <div className="text-sm font-black text-[#5C3D24]">Chưa có thú cưng nào</div>
                      <p className="mt-1.5 text-xs leading-relaxed font-semibold text-[#7D6147]">
                        Hãy ghé <strong className="text-[#B85B38]">Cửa Hàng Pets</strong> trong thị
                        trấn để nhận nuôi Cún Nâu, Chim Xanh, Cún Shiba Bé, Mèo Trung Hoa Trắng hoặc
                        Vẹt Tinh Nghịch nhé!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {ownedPets.map((pet) => {
                        const spec = PET_CATALOG[pet.speciesId];
                        const isActive = activePetId === pet.id;
                        const isMax = pet.intimacyLevel >= MAX_PET_INTIMACY;
                        return (
                          <div
                            key={pet.id}
                            className={`relative rounded-2xl border-2 bg-white p-3 shadow-xs transition ${
                              isActive
                                ? 'border-[#DF7E5C] bg-[#FFFDF9]'
                                : 'border-[#E6D4BC]'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                soundFX.tap();
                                setPetRenameDraft(pet.name);
                                setPetActionFeedback(null);
                                setSelectedPetInfoId(pet.id);
                              }}
                              aria-label={`Thông tin ${pet.name}`}
                              title="Thông tin & Đổi tên"
                              className="absolute top-2.5 right-2.5 flex h-7 w-7 items-center justify-center rounded-full border border-[#DECBB0] bg-[#FFF7EA] text-[#6F4E37] shadow-2xs transition hover:bg-[#F3E4CE] active:scale-90"
                            >
                              <Info className="h-3.5 w-3.5" />
                            </button>

                            <div className="flex items-center gap-3 pr-8">
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#EFE0C9] bg-[#FFF7EC]">
                                <PetSpeciesIcon speciesId={pet.speciesId} className="h-10 w-10" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1 text-xs font-black text-[#4A3525]">
                                  {isMax && <BlingBlingBadge className="h-3.5 w-3.5" />}
                                  <span className="truncate">{pet.name}</span>
                                </div>
                                <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] font-bold text-[#7A6048]">
                                  <span>{spec.moveType === 'fly' ? 'Bay' : 'Đi bộ'}</span>
                                  <span>·</span>
                                  <span className="text-[#C84A6E]">
                                    Thân mật Lv.{pet.intimacyLevel}
                                  </span>
                                  {pet.sick && (
                                    <span className="rounded bg-[#FCE4E8] px-1 py-px text-[#C93B4B]">
                                      Ốm
                                    </span>
                                  )}
                                  {isPetTooHungry(pet) && (
                                    <span className="rounded bg-[#FFF1DC] px-1 py-px text-[#B85814]">
                                      Đói quá
                                    </span>
                                  )}
                                </div>
                                <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                                  <div>
                                    <div className="flex justify-between text-[9px] font-bold text-[#8B6232]">
                                      <span>Độ no</span>
                                      <span className="tabular-nums">
                                        {Math.round(Math.max(0, Math.min(100, pet.hunger ?? 75)))}%
                                      </span>
                                    </div>
                                    <div className="h-1 w-full overflow-hidden rounded-full bg-[#EFE2CC]">
                                      <div
                                        className="h-full rounded-full bg-[#EE9F42]"
                                        style={{
                                          width: `${Math.round(
                                            Math.max(0, Math.min(100, pet.hunger ?? 75)),
                                          )}%`,
                                        }}
                                      />
                                    </div>
                                  </div>
                                  <div>
                                    <div className="flex justify-between text-[9px] font-bold text-[#2E779A]">
                                      <span>Vui vẻ</span>
                                      <span className="tabular-nums">
                                        {Math.round(
                                          Math.max(0, Math.min(100, pet.happiness ?? 75)),
                                        )}%
                                      </span>
                                    </div>
                                    <div className="h-1 w-full overflow-hidden rounded-full bg-[#DCEAF2]">
                                      <div
                                        className="h-full rounded-full bg-[#48A8D6]"
                                        style={{
                                          width: `${Math.round(
                                            Math.max(0, Math.min(100, pet.happiness ?? 75)),
                                          )}%`,
                                        }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                soundFX.tap();
                                onToggleSummonPet(pet.id);
                              }}
                              className={`mt-2.5 w-full rounded-xl py-2 text-xs font-black transition active:scale-98 ${
                                isActive ? 'bg-[#D67C3A] text-white' : 'bg-[#439A6C] text-white'
                              }`}
                            >
                              {isActive ? 'Thu Hồi Pet' : 'Gọi Pet Đồng Hành'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : (
                  <div className="space-y-2.5">
                    {PET_SUPPLY_LIST.map((sup) => {
                      const count = petSupplies[sup.id] ?? 0;
                      const isTest = sup.id === 'intimacyTest';
                      const targetPet = activePetObj;
                      const isTargetStarving = Boolean(targetPet && isPetTooHungry(targetPet));
                      const isFullFood =
                        Boolean(targetPet) &&
                        sup.id === 'petFood' &&
                        (targetPet!.hunger ?? 75) >= PET_FEED_HUNGER_THRESHOLD;
                      const blockedByHunger = isTargetStarving && sup.id !== 'petFood';
                      const canUse = Boolean(
                        targetPet &&
                          count > 0 &&
                          !isFullFood &&
                          !blockedByHunger &&
                          !(sup.id === 'petMedicine' && !targetPet.sick) &&
                          !(
                            sup.id === 'intimacyTest' &&
                            targetPet.intimacyLevel >= MAX_PET_INTIMACY
                          ),
                      );
                      return (
                        <div
                          key={sup.id}
                          className="rounded-2xl border-2 border-[#E6D4BC] bg-white p-3 space-y-2"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#EFE0C9] bg-[#FFF8EC]">
                              <PetSupplyIcon supplyId={sup.id} className="h-8 w-8" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="flex items-center gap-1 text-xs font-black text-[#4A3525]">
                                  {isTest && <Sparkles className="h-3 w-3 text-[#D85A9E]" />}
                                  {sup.name}
                                </span>
                                <span className="rounded bg-[#F3E9D8] px-1.5 py-0.5 text-[10px] font-black text-[#6B4E34] tabular-nums">
                                  x{count}
                                </span>
                              </div>
                              <p className="mt-0.5 text-[10px] font-semibold text-[#7A6048]">
                                {sup.description}
                              </p>
                            </div>
                          </div>
                          {targetPet && (
                            <button
                              type="button"
                              disabled={!canUse}
                              onClick={() => {
                                const res = onUsePetSupply(targetPet.id, sup.id);
                                if (res.ok) soundFX.sparkle();
                                else soundFX.tap();
                                setPetActionFeedback(res.message);
                              }}
                              className="w-full rounded-xl bg-[#49A58D] py-1.5 text-[11px] font-black text-white transition active:scale-95 disabled:cursor-not-allowed disabled:bg-[#DDD5C9] disabled:text-[#8E8275]"
                            >
                              {isFullFood
                                ? `Đã no (${targetPet.name})`
                                : `Dùng cho ${targetPet.name}`}
                            </button>
                          )}
                        </div>
                      );
                    })}
                    {petActionFeedback && (
                      <div className="rounded-xl bg-[#EAF8EE] px-2.5 py-2 text-[11px] font-bold text-[#2A6E40]">
                        {petActionFeedback}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {bagSubTab === 'boats' && (
            <div className="space-y-2.5">
              <div className="rounded-xl border border-[#DCEBF2] bg-[#F4FAFD] px-3 py-2 text-[11px] font-semibold leading-relaxed text-[#436D82]">
                Chọn thuyền đang sử dụng để chèo tại Sông Khu Sinh Thái (Thị Trấn) hoặc Biển Đảo Mây. Có thể mua thêm thuyền ở <b>Sạp Thuyền của Ship</b>!
              </div>

              {BOAT_LIST.map((boat) => {
                const owned = boats.ownedIds.includes(boat.id);
                const isActive = owned && boats.activeBoatId === boat.id;
                return (
                  <div
                    key={boat.id}
                    className={`rounded-2xl border-2 bg-white p-3.5 space-y-2.5 ${
                      isActive ? 'border-[#2E82A8]' : 'border-[#BFE0EE]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-[#BFE0EE] bg-[#EAF6FA]">
                        <BoatSkinIcon boatId={boat.id} className="h-11 w-11" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-black text-[#264B5E]">{boat.name}</span>
                          {isActive ? (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-[#2E82A8] px-2 py-0.5 text-[10px] font-black text-white">
                              <Check className="h-3 w-3" />
                              Đang dùng
                            </span>
                          ) : owned ? (
                            <span className="rounded-full bg-[#DCEFF8] px-2 py-0.5 text-[10px] font-black text-[#246A8A]">
                              Đã sở hữu
                            </span>
                          ) : (
                            <span className="rounded-full bg-[#F1E8D8] px-2 py-0.5 text-[10px] font-black text-[#8A7154]">
                              {boat.price} Xu
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 text-[11px] font-bold text-[#467A94]">
                          {boat.subtitle}
                        </div>
                      </div>
                    </div>

                    <div className="text-[11px] font-semibold leading-relaxed text-[#526B78]">
                      {owned
                        ? boat.description
                        : `Chưa sở hữu. Ghé Sạp Thuyền của Ship tại Bến Sông Khu Sinh Thái (${boat.price} Xu) để mua.`}
                    </div>

                    {owned && !isActive && (
                      <button
                        type="button"
                        onClick={() => {
                          soundFX.tap();
                          onSelectBoat(boat.id);
                        }}
                        className="w-full rounded-xl bg-[#2E82A8] py-2 text-xs font-black text-white shadow-sm transition hover:bg-[#236A8B] active:scale-95"
                      >
                        Chọn {boat.name} làm thuyền chính
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {bagSubTab === 'food' && (() => {
            const farmDishEntries = (Object.keys(KITCHEN_RECIPES) as RecipeId[]).filter(
              (rid) => (farmDishes[rid] ?? 0) > 0,
            );
            return (
              <div className="space-y-3">
                <div className="rounded-xl border border-[#EAD4BA] bg-[#FFF8EC] px-3 py-2 text-[11px] font-semibold text-[#7A5738]">
                  Bấm <b>&quot;Cầm trên tay&quot;</b> rồi bấm nút <b>Ăn</b> hiện ngoài màn hình để
                  thưởng thức và hồi độ no.
                </div>

                {/* Section 1: Handheld BBQ Food (Equip ONLY in backpack) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-0.5">
                    <span className="flex items-center gap-1 text-[11px] font-black text-[#B84522]">
                      <Flame className="h-3.5 w-3.5" />
                      Món Ăn Nướng BBQ
                    </span>
                    <span className="text-[10px] font-bold text-[#8A6D4E]">+20% Độ no</span>
                  </div>

                  {BBQ_FOOD_LIST.map((item) => {
                    const count = bbqFoods[item.id] ?? 0;
                    const isHeld = equippedFoodId === item.id;
                    return (
                      <div
                        key={item.id}
                        className={`rounded-2xl border-2 bg-white p-3 space-y-2 ${
                          isHeld ? 'border-[#D96B38]' : 'border-[#E6D4BC]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#F0D9C0] bg-[#FFF8EF]">
                            <HandheldFoodIcon foodId={item.id} className="h-9 w-9" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-black text-[#3B2A1A]">{item.name}</span>
                              <span className="rounded bg-[#F3E9D8] px-1.5 py-0.5 text-[10px] font-black tabular-nums text-[#6B4E34]">
                                x{count}
                              </span>
                            </div>
                            <p className="mt-0.5 text-[10px] font-semibold text-[#7A6048]">
                              {item.description}
                            </p>
                          </div>
                        </div>

                        {count > 0 ? (
                          <button
                            type="button"
                            onClick={() => {
                              soundFX.tap();
                              onToggleEquipFood(item.id);
                              if (!isHeld) {
                                onClose();
                              }
                            }}
                            className={`w-full rounded-xl py-2 text-xs font-black text-white transition active:scale-95 ${
                              isHeld
                                ? 'bg-[#8F7055] hover:bg-[#7A5E46]'
                                : 'bg-[#D96B38] hover:bg-[#C15828]'
                            }`}
                          >
                            {isHeld ? 'Cất xuống' : 'Cầm trên tay'}
                          </button>
                        ) : (
                          <div className="rounded-lg bg-[#FAF4EA] px-2.5 py-1.5 text-[10px] font-semibold text-[#8A7058]">
                            Chế biến tại Lò Nướng BBQ Khu Cắm Trại ({item.price} Xu).
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Section 1B: Handheld Vending Drinks */}
                <div className="space-y-2 border-t border-[#E6D6C1] pt-3">
                  <div className="flex items-center justify-between px-0.5">
                    <span className="flex items-center gap-1 text-[11px] font-black text-[#2674A3]">
                      <Sparkles className="h-3.5 w-3.5" />
                      Thức Uống Cầm Tay
                    </span>
                    <span className="text-[10px] font-bold text-[#608299]">+6–10% Độ no</span>
                  </div>

                  {VENDING_DRINK_LIST.map((item) => {
                    const count = bbqFoods[item.id] ?? 0;
                    const isHeld = equippedFoodId === item.id;
                    return (
                      <div
                        key={item.id}
                        className={`rounded-2xl border-2 bg-white p-3 space-y-2 ${
                          isHeld ? 'border-[#2D82B2]' : 'border-[#D7E6F0]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#DCEBF5] bg-[#F2F9FE]">
                            <HandheldFoodIcon foodId={item.id} className="h-9 w-9" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-black text-[#223F52]">{item.name}</span>
                              <span className="rounded bg-[#E5F1F8] px-1.5 py-0.5 text-[10px] font-black tabular-nums text-[#2A6385]">
                                x{count}
                              </span>
                            </div>
                            <p className="mt-0.5 text-[10px] font-semibold text-[#5E7C8F]">
                              +{item.hungerRestore}% Độ no · {item.description}
                            </p>
                          </div>
                        </div>

                        {count > 0 ? (
                          <button
                            type="button"
                            onClick={() => {
                              soundFX.tap();
                              onToggleEquipFood(item.id);
                              if (!isHeld) {
                                onClose();
                              }
                            }}
                            className={`w-full rounded-xl py-2 text-xs font-black text-white transition active:scale-95 ${
                              isHeld
                                ? 'bg-[#648296] hover:bg-[#526D80]'
                                : 'bg-[#2D82B2] hover:bg-[#236B94]'
                            }`}
                          >
                            {isHeld ? 'Cất xuống' : 'Cầm trên tay'}
                          </button>
                        ) : (
                          <div className="rounded-lg bg-[#F2F8FC] px-2.5 py-1.5 text-[10px] font-semibold text-[#5D7E94]">
                            Mua tại Máy Bán Nước Tự Động trước May Mall ({item.price} Xu).
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                  {/* Section 2: Home Appliance Cooked Dishes (Lò Vi Sóng & Lò Nướng Mini) */}
                <div className="space-y-2 border-t border-[#E6D6C1] pt-3">
                  <div className="flex items-center justify-between px-0.5">
                    <span className="flex items-center gap-1 text-[11px] font-black text-[#2674A3]">
                      <ChefHat className="h-3.5 w-3.5" />
                      Món Ăn Tự Nấu Tại Nhà
                    </span>
                    <span className="text-[10px] font-bold text-[#4D7C99]">
                      Hồi Thể Lực &amp; Độ No
                    </span>
                  </div>

                  {foodActionFeedback && (
                    <div className="rounded-xl bg-[#EAF8EE] px-2.5 py-2 text-[11px] font-bold text-[#2A6E40]">
                      {foodActionFeedback}
                    </div>
                  )}

                  {(() => {
                    const peppaEntries = (Object.keys(PEPPA_RECIPES) as PeppaRecipeId[]).filter(
                      (rid) => (peppaDishes[rid] ?? 0) > 0,
                    );
                    if (peppaEntries.length === 0) {
                      return (
                        <div className="rounded-xl border border-[#DCEBF3] bg-[#F4FAFD] p-3 text-center text-[11px] font-semibold text-[#55778C]">
                          Chưa có món nấu tại nhà nào. Ghé <b>Siêu Thị Mini của Peppa</b> (Mây Mall Tầng 1) mua nguyên liệu &amp; công thức, rồi bấm vào <b>Lò Vi Sóng / Lò Nướng Mini</b> ở nhà để nấu nhé!
                        </div>
                      );
                    }
                    return (
                      <div className="space-y-2">
                        {peppaEntries.map((rid) => {
                          const r = PEPPA_RECIPES[rid];
                          const qty = peppaDishes[rid] ?? 0;
                          return (
                            <div
                              key={rid}
                              className="space-y-2 rounded-2xl border-2 border-[#D2E6F2] bg-white p-3"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex min-w-0 items-center gap-2.5">
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#DCEAF3] bg-[#F5FAFE]">
                                    <PeppaDishIcon id={rid} className="h-8 w-8" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="truncate text-xs font-black text-[#1E3B4D]">
                                      {r.name}
                                    </div>
                                    <div className="text-[10px] font-bold text-[#4C728A]">
                                      +{r.energyRestore} Thể lực · +{r.hungerRestore} Độ no · Bán {r.sellPrice} Xu
                                    </div>
                                  </div>
                                </div>
                                <span className="shrink-0 rounded-lg bg-[#E4F2FA] px-2 py-0.5 text-[11px] font-black tabular-nums text-[#226285]">
                                  x{qty}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const res = onEatPeppaDish(rid);
                                    setFoodActionFeedback(res.message);
                                    if (res.ok) soundFX.sparkle();
                                    else soundFX.tap();
                                  }}
                                  className="flex min-h-[32px] flex-1 items-center justify-center gap-1 rounded-xl bg-[#278556] px-2.5 text-[11px] font-black text-white transition active:scale-95"
                                >
                                  <Zap className="h-3.5 w-3.5" />
                                  <span>Ăn (+Thể lực)</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const res = onSellPeppaDish(rid);
                                    setFoodActionFeedback(res.message);
                                    if (res.ok) soundFX.sparkle();
                                    else soundFX.tap();
                                  }}
                                  className="flex min-h-[32px] items-center justify-center gap-1 rounded-xl border border-[#ECC38C] bg-[#FFF4DC] px-2.5 text-[11px] font-black text-[#945D18] transition active:scale-95"
                                >
                                  <Coins className="h-3.5 w-3.5" />
                                  <span>Bán {r.sellPrice}</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                {/* Section 3: Farm Dishes (Storage Only — NOT holdable in hand) */}
                <div className="space-y-2 border-t border-[#E6D6C1] pt-3">
                  <div className="flex items-center justify-between px-0.5">
                    <span className="flex items-center gap-1 text-[11px] font-black text-[#4B6B46]">
                      <Warehouse className="h-3.5 w-3.5" />
                      Món Ăn Nông Trại
                    </span>
                    <span className="rounded bg-[#EFE5D4] px-1.5 py-0.5 text-[9px] font-extrabold text-[#7B6247]">
                      Không cầm tay
                    </span>
                  </div>

                  <div className="rounded-xl border border-[#DCE5D5] bg-[#F5F9F2] px-2.5 py-2 text-[10px] font-semibold leading-relaxed text-[#4C6848]">
                    Thức ăn nông trại chỉ dùng trong kho và <b>không thể cầm trên tay</b>. Bản cập
                    nhật sau sẽ mở tính năng nấu tại bếp trong nhà để ăn hồi sức khỏe.
                  </div>

                  {farmDishEntries.length === 0 ? (
                    <div className="rounded-xl border border-[#E6D4BC] bg-white p-3 text-center text-[11px] font-semibold text-[#8A735B]">
                      Chưa có món ăn nông trại nào trong kho.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {farmDishEntries.map((rid) => {
                        const r = KITCHEN_RECIPES[rid];
                        const qty = farmDishes[rid] ?? 0;
                        return (
                          <div
                            key={rid}
                            className="flex items-center justify-between rounded-xl border border-[#E6D4BC] bg-white px-3 py-2"
                          >
                            <div className="min-w-0">
                              <div className="truncate text-xs font-extrabold text-[#3B2A1A]">
                                {r.name}
                              </div>
                              <div className="text-[10px] font-semibold text-[#8A7058]">
                                Lưu trữ Nhà Kho · Giá bán {r.sellPrice} Xu
                              </div>
                            </div>
                            <span className="ml-2 shrink-0 rounded-lg bg-[#EFE4D1] px-2 py-0.5 text-[11px] font-black tabular-nums text-[#5A422B]">
                              x{qty}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {bagSubTab === 'mounts' && (
            <div className="space-y-2.5">
              {ownedMounts.ownedIds.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#BBD6EA] bg-[#F2F8FC] p-5 text-center">
                  <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#CCE2F2] bg-white shadow-xs">
                    <SkateboardMountIcon className="h-12 w-12" />
                  </div>
                  <div className="text-sm font-black text-[#2C5370]">Chưa Có Phương Tiện Cưỡi</div>
                  <p className="mt-1.5 text-xs font-semibold leading-relaxed text-[#577994]">
                    Ghé <b>May Mall (Tầng 1)</b> gặp <b>Tun</b> để mua <b>Ván Trượt Mây (Hạng B ·
                    220 Xu)</b> hoặc <b>Xe Đạp Cổ Điển (Hạng B · 320 Xu)</b> chạy nhanh hơn đi bộ!
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {ownedMounts.ownedIds.map((mid) => {
                    const def = MOUNT_CATALOG[mid];
                    if (!def) return null;
                    const rankMeta = MOUNT_RANK_META[def.rank];
                    const isActive = ownedMounts.activeMountId === mid;
                    return (
                      <div
                        key={mid}
                        className={`rounded-2xl border-2 p-3.5 space-y-2.5 transition ${
                          isActive
                            ? 'border-[#3CA374] bg-[#F4FFF8]'
                            : 'border-[#E3D1B2] bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-xl border border-[#DCEBF5] bg-[#F4F9FD]">
                            {def.kind === 'skateboard' ? (
                              <SkateboardMountIcon className="h-11 w-11" />
                            ) : def.kind === 'lotus_umbrella' ? (
                              <LotusUmbrellaMountIcon className="h-11 w-11" />
                            ) : def.kind === 'dong_thap_lotus' ? (
                              <DongThapLotusMountIcon className="h-11 w-11" />
                            ) : def.kind === 'witch_broom' ? (
                              <WitchBroomMountIcon className="h-11 w-11" />
                            ) : (
                              <BicycleMountIcon className="h-11 w-11" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-sm font-black text-[#3B2A1A]">{def.name}</span>
                              <span
                                className={`rounded-md border px-1.5 py-0.5 text-[9px] font-black ${rankMeta.badgeBg} ${rankMeta.badgeText} ${rankMeta.badgeBorder}`}
                              >
                                Hạng {rankMeta.shortTag}
                              </span>
                            </div>
                            <p className="mt-0.5 text-[11px] font-semibold text-[#6F583E]">
                              Tốc độ x{def.speedMultiplier.toFixed(2)} đi bộ · {def.description}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            soundFX.tap();
                            onToggleMount(mid);
                            if (!isActive) {
                              onClose();
                            }
                          }}
                          className={`w-full rounded-xl py-2.5 text-xs font-black text-white transition active:scale-98 ${
                            isActive
                              ? 'bg-[#6F7B86] hover:bg-[#5B6670]'
                              : 'bg-[#2E9467] hover:bg-[#247953]'
                          }`}
                        >
                          {isActive ? 'Xuống phương tiện (Cất vào túi)' : 'Lấy ra cưỡi ngay'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center gap-2.5 rounded-2xl border border-[#ECD39B] bg-[#FFF8E6] p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#F0D59A] bg-white">
                  <MountCarIcon className="h-8 w-8" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-xs font-black text-[#69320E]">
                    <span>Siêu Xe &amp; Thú Cưỡi Hạng S</span>
                    <span className="rounded border border-[#E68A1E] bg-[#FFE596] px-1.5 py-0.5 text-[9px] font-black text-[#5C2507]">
                      Hạng S
                    </span>
                  </div>
                  <p className="text-[10px] font-semibold text-[#8A5A2B]">
                    Tốc độ siêu nhanh — đang trưng bày xem trước tại sảnh May Mall, sắp mở bán!
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
