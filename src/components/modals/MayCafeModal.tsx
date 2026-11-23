import React, {useState} from 'react';
import {Coffee, Coins, Heart, Sparkles, Utensils, X, Zap} from 'lucide-react';
import {MAY_CAFE_ITEM_LIST, MayCafeItemId} from '../../data/mayCafeCatalog';
import {soundFX} from '../../utils/sound';

export const MayCafeItemIcon: React.FC<{itemId: MayCafeItemId; className?: string}> = ({
  itemId,
  className = 'h-11 w-11',
}) => {
  if (itemId === 'cafe_milk_coffee') {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
        <path
          d="M15 14H33L30.5 40C30.3 41.2 29.3 42 28.1 42H19.9C18.7 42 17.7 41.2 17.5 40L15 14Z"
          fill="#8E5431"
          stroke="#4F2D19"
          strokeWidth="1.8"
        />
        <path d="M16.8 29H31.2L30.5 39.5C30.4 40.3 29.7 41 28.9 41H19.1C18.3 41 17.6 40.3 17.5 39.5L16.8 29Z" fill="#F2DEC2" />
        <rect x="18" y="17" width="5" height="5" rx="1.2" fill="#E8F8FF" opacity="0.85" />
        <rect x="25" y="19" width="5" height="5" rx="1.2" fill="#E8F8FF" opacity="0.85" />
        <path d="M14 14C14 10.5 18.5 8 24 8C29.5 8 34 10.5 34 14H14Z" fill="#FFFDF9" stroke="#4F2D19" strokeWidth="1.6" />
        <path d="M27 11L31 4.5H34" stroke="#E06D53" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (itemId === 'cafe_latte_art') {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
        <ellipse cx="23" cy="39.5" rx="14" ry="3.2" fill="#E9D8C4" stroke="#6E4730" strokeWidth="1.6" />
        <path
          d="M11 21H34L32.5 32.5C32 36.2 28.8 39 25 39H20C16.2 39 13 36.2 12.5 32.5L11 21Z"
          fill="#FFF8EE"
          stroke="#6E4730"
          strokeWidth="1.8"
        />
        <path d="M33.5 23.5C36.8 23.5 38.5 25.4 38.5 27.8C38.5 30.2 36.6 32 33 32" stroke="#6E4730" strokeWidth="2.2" strokeLinecap="round" />
        <ellipse cx="22.5" cy="21" rx="11.2" ry="3.2" fill="#C98A54" stroke="#6E4730" strokeWidth="1.4" />
        <path
          d="M22.5 22.8C22.5 22.8 19.2 21.1 19.2 19.6C19.2 18.8 19.9 18.2 20.8 18.2C21.5 18.2 22.1 18.6 22.5 19.2C22.9 18.6 23.5 18.2 24.2 18.2C25.1 18.2 25.8 18.8 25.8 19.6C25.8 21.1 22.5 22.8 22.5 22.8Z"
          fill="#FFF9F0"
        />
        <path d="M18 14C17.5 12 19 10.5 18.5 8.5M25 13C24.5 11 26 9.5 25.5 7.5" stroke="#D9A373" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (itemId === 'cafe_peach_tea') {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
        <path
          d="M15 15H33L30.5 40C30.3 41.2 29.3 42 28.1 42H19.9C18.7 42 17.7 41.2 17.5 40L15 15Z"
          fill="#F5A15D"
          stroke="#7A3E1D"
          strokeWidth="1.8"
        />
        <circle cx="23" cy="28" r="5" fill="#FF7E5F" />
        <circle cx="29" cy="22" r="3.5" fill="#FFD166" />
        <path d="M14 15H34" stroke="#7A3E1D" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M27 15L32 6" stroke="#5AA86E" strokeWidth="2.2" strokeLinecap="round" />
        <ellipse cx="18" cy="14" rx="4.5" ry="2.6" transform="rotate(-18 18 14)" fill="#FF9270" stroke="#7A3E1D" strokeWidth="1.4" />
        <path d="M20 12L23 8.5" stroke="#5AA86E" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (itemId === 'cafe_matcha_cream') {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
        <path
          d="M15 16H33L30.5 40C30.3 41.2 29.3 42 28.1 42H19.9C18.7 42 17.7 41.2 17.5 40L15 16Z"
          fill="#6EB874"
          stroke="#2E5E35"
          strokeWidth="1.8"
        />
        <path d="M16 20H32L31.4 25C28.5 26.5 25.5 24 22.5 25.5C19.5 27 17 25 16.5 25L16 20Z" fill="#FFFDF5" />
        <path d="M14.5 16C14.5 11.5 18.8 9 24 9C29.2 9 33.5 11.5 33.5 16H14.5Z" fill="#FFF8EB" stroke="#2E5E35" strokeWidth="1.6" />
        <path d="M28 11L32 5H35" stroke="#3D8A4A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="24" cy="33" r="3" fill="#B5E8A4" opacity="0.65" />
      </svg>
    );
  }
  // cafe_croissant_combo
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
      <ellipse cx="24" cy="38" rx="17" ry="4" fill="#FFF5E6" stroke="#784C2C" strokeWidth="1.6" />
      <path
        d="M9 32C11.5 24 18 22 24 23C30 22 35.5 24 37.5 32C35 35 29.5 34.5 24 34.5C18.5 34.5 12 35 9 32Z"
        fill="#E89E4A"
        stroke="#784C2C"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M17 23.5L15 33.5M24 23V34.5M31 23.5L32.5 33.5" stroke="#A65E26" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M27 12H39L37.5 22C37.3 23.7 35.8 25 34.1 25H31.9C30.2 25 28.7 23.7 28.5 22L27 12Z" fill="#FFFDF8" stroke="#5A351E" strokeWidth="1.6" />
      <ellipse cx="33" cy="12" rx="6" ry="1.8" fill="#6E3D20" />
      <path d="M38.5 14C40.8 14 41.8 15.5 41.8 17.2C41.8 18.8 40.5 20.2 38 20.2" stroke="#5A351E" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
};

interface MayCafeModalProps {
  coins: number;
  energy: number;
  hunger: number;
  onBuyItem: (itemId: MayCafeItemId) => {ok: boolean; message: string};
  onClose: () => void;
}

export const MayCafeModal: React.FC<MayCafeModalProps> = ({
  coins,
  energy,
  hunger,
  onBuyItem,
  onClose,
}) => {
  const [feedback, setFeedback] = useState<{ok: boolean; message: string} | null>(null);

  return (
    <div
      className="phone-ui fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 p-3 backdrop-blur-xs sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="anim-pop flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border-4 border-[#B97A4B] bg-[#FFFBF5] text-[#432B1B] shadow-2xl"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#EED9C4] bg-gradient-to-r from-[#F9E7D2] via-[#FFF4E6] to-[#F9E7D2] px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#9B5E37] text-white shadow-xs">
              <Coffee className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-[#59331A]">Quán Cà Phê Mây · Barista Mây</h2>
              <p className="text-[11px] font-bold text-[#8A5B3A]">
                Đồ uống &amp; bánh thơm ngon hồi Thể Lực ngay tại quầy!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-xl border border-[#E5B87B] bg-[#FFF4DC] px-2.5 py-1 text-xs font-black text-[#8B5314] tabular-nums">
              <Coins className="h-3.5 w-3.5 text-[#D88B1C]" />
              <span>{coins.toLocaleString('vi-VN')} Xu</span>
            </div>
            <button
              type="button"
              onClick={() => {
                soundFX.tap();
                onClose();
              }}
              aria-label="Đóng Quán Cà Phê Mây"
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#ECD6BF] text-[#613B21] transition active:scale-95"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Player Current Stamina & Hunger Bar */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[#F2DFCA] bg-[#FFF6EB] px-4 py-2 text-[11px] font-extrabold">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-lg bg-[#E3F2FD] px-2.5 py-1 text-[#175B8A]">
              <Zap className="h-3.5 w-3.5" />
              Thể lực: {Math.round(energy)}/100
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-[#FFF1DC] px-2.5 py-1 text-[#9C5814]">
              <Utensils className="h-3.5 w-3.5" />
              Độ no: {Math.round(hunger)}/100
            </span>
          </div>
          <span className="text-[#875D3E]">Uống trực tiếp tại quán</span>
        </div>

        {/* Menu List */}
        <div className="custom-scroll min-h-0 flex-1 space-y-2.5 overflow-y-auto p-3.5 sm:p-4">
          {feedback && (
            <div
              className={`flex items-center gap-2 rounded-2xl border px-3.5 py-2.5 text-xs font-bold ${
                feedback.ok
                  ? 'border-[#B6E2C4] bg-[#ECF9F0] text-[#1D6B3E]'
                  : 'border-[#F2C3C8] bg-[#FFF1F3] text-[#9E2B3E]'
              }`}
            >
              <Sparkles className="h-4 w-4 shrink-0" />
              <span>{feedback.message}</span>
            </div>
          )}

          {MAY_CAFE_ITEM_LIST.map((item) => {
            const canAfford = coins >= item.price;
            return (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-2xl border-2 border-[#EED9C4] bg-white p-3 shadow-xs transition hover:border-[#D49D6A]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#F0DEC9] bg-[#FFF8EF]">
                    <MayCafeItemIcon itemId={item.id} className="h-11 w-11" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="text-xs font-black text-[#422817]">{item.name}</h3>
                      <span className="rounded-md bg-[#F6E8D8] px-1.5 py-0.5 text-[10px] font-extrabold text-[#7D4F2D]">
                        {item.categoryLabel}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] leading-snug text-[#74553F]">
                      {item.description}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] font-extrabold">
                      <span className="inline-flex items-center gap-0.5 rounded-md bg-[#E4F2FE] px-1.5 py-0.5 text-[#175B8A]">
                        <Zap className="h-3 w-3" />+{item.energyRestore} Thể lực
                      </span>
                      <span className="inline-flex items-center gap-0.5 rounded-md bg-[#FFF1DC] px-1.5 py-0.5 text-[#9C5814]">
                        <Utensils className="h-3 w-3" />+{item.hungerRestore} Độ no
                      </span>
                      <span className="inline-flex items-center gap-0.5 rounded-md bg-[#FFEAF0] px-1.5 py-0.5 text-[#AD2E56]">
                        <Heart className="h-3 w-3" />+{item.moodRestore} Vui vẻ
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!canAfford}
                  onClick={() => {
                    const res = onBuyItem(item.id);
                    setFeedback(res);
                    if (res.ok) soundFX.sparkle();
                    else soundFX.tap();
                  }}
                  className="flex shrink-0 flex-col items-center justify-center rounded-xl bg-[#B36634] px-3 py-2 text-[11px] font-black text-white shadow-xs transition hover:bg-[#965226] active:scale-95 disabled:cursor-not-allowed disabled:bg-stone-300"
                >
                  <span>Thưởng Thức</span>
                  <span className="mt-0.5 text-[10px] text-[#FFE5A8] tabular-nums">
                    {item.price} Xu
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
