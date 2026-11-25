import React from 'react';
import {CalendarCheck2, CheckCircle2, Coins, Gift, Sparkles, X} from 'lucide-react';
import {CHECK_IN_REWARDS, getTodayDateKey} from '../../data/progressionCatalog';
import {CheckInState} from '../../types/game';
import {soundFX} from '../../utils/sound';
import {HandheldFoodIcon} from './VendingMachineModal';

interface DailyCheckInModalProps {
  checkIn: CheckInState;
  onClaimToday: () => void;
  onClose: () => void;
}

export const DailyCheckInModal: React.FC<DailyCheckInModalProps> = ({
  checkIn,
  onClaimToday,
  onClose,
}) => {
  const todayKey = getTodayDateKey();
  const claimedToday = checkIn.lastClaimDate === todayKey;
  const completedCount = checkIn.completedDays % 7;
  const activeDayNumber = claimedToday ? 0 : completedCount + 1;

  return (
    <div
      className="phone-ui fixed inset-0 z-50 flex items-center justify-center bg-stone-950/65 p-3 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="anim-pop flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border-4 border-[#9C734B] bg-[#FAF3E8] shadow-2xl"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#E5D5BE] bg-gradient-to-r from-[#E6934B] to-[#D46F3D] px-4 py-3 text-white">
          <div className="flex items-center gap-2">
            <CalendarCheck2 className="h-5 w-5 text-[#FFF2B2]" />
            <div>
              <h2 className="font-display text-base font-black leading-tight">
                Điểm Danh 7 Ngày
              </h2>
              <p className="text-[11px] font-semibold text-amber-50/90">
                Nhận Xu &amp; đồ ăn mỗi ngày · Ngày 7 thưởng cực lớn!
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundFX.tap();
              onClose();
            }}
            aria-label="Đóng điểm danh 7 ngày"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-white transition active:scale-95 hover:bg-white/30"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="custom-scroll flex-1 space-y-3 overflow-y-auto p-4 text-[#4A3525]">
          {/* Days 1-6 grid */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {CHECK_IN_REWARDS.slice(0, 6).map((spec) => {
              const isClaimed =
                claimedToday && checkIn.completedDays > 0
                  ? spec.day <= (checkIn.completedDays % 7 || 7)
                  : spec.day <= completedCount;
              const isTodayTarget = !claimedToday && spec.day === activeDayNumber;

              return (
                <div
                  key={spec.day}
                  className={`relative flex flex-col justify-between rounded-2xl border-2 p-2.5 transition ${
                    isTodayTarget
                      ? 'border-[#D9743B] bg-[#FFF8EB] shadow-md ring-2 ring-[#F5BE7B]/60'
                      : isClaimed
                        ? 'border-[#B9DEC5] bg-[#F1FAF4]'
                        : 'border-[#E6D6C1] bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-[11px] font-black ${
                        isTodayTarget
                          ? 'text-[#C25322]'
                          : isClaimed
                            ? 'text-[#31784D]'
                            : 'text-[#6A5039]'
                      }`}
                    >
                      Ngày {spec.day}
                    </span>
                    {isClaimed ? (
                      <CheckCircle2 className="h-4 w-4 text-[#3F945E]" />
                    ) : isTodayTarget ? (
                      <Sparkles className="h-3.5 w-3.5 text-[#E58333]" />
                    ) : null}
                  </div>

                  <div className="my-2 flex flex-col items-center gap-1.5 text-center">
                    <div className="flex items-center gap-1 text-xs font-black tabular-nums text-[#B06B14]">
                      <Coins className="h-3.5 w-3.5 text-amber-500" />
                      <span>+{spec.coins} Xu</span>
                    </div>
                    {spec.foodReward && (
                      <div className="flex items-center gap-1 rounded-xl border border-[#EFE2CE] bg-[#FFFDF8] px-2 py-1">
                        <HandheldFoodIcon foodId={spec.foodReward.foodId} className="h-5 w-5 shrink-0" />
                        <span className="text-[10px] font-bold leading-tight text-[#5B422E]">
                          x{spec.foodReward.qty} {spec.foodReward.name}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="text-center text-[10px] font-bold text-[#8A7056]">
                    {isClaimed ? 'Đã nhận' : isTodayTarget ? 'Hôm nay' : 'Sắp tới'}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Day 7 Jackpot Card */}
          {(() => {
            const day7 = CHECK_IN_REWARDS[6];
            const isDay7Claimed =
              claimedToday && checkIn.completedDays > 0 && checkIn.completedDays % 7 === 0;
            const isDay7Today = !claimedToday && activeDayNumber === 7;

            return (
              <div
                className={`rounded-2xl border-2 p-3.5 transition ${
                  isDay7Today
                    ? 'border-[#D9653B] bg-gradient-to-r from-[#FFF5DF] to-[#FFE7D4] shadow-md ring-2 ring-[#F7B267]/60'
                    : isDay7Claimed
                      ? 'border-[#A7D8B6] bg-[#EDF9F1]'
                      : 'border-[#E6C78A] bg-gradient-to-r from-[#FFF9EB] to-[#FFF2DB]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EE7C43] text-white shadow-xs">
                      <Gift className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-[#6E3314]">{day7.title}</div>
                      <div className="text-[11px] font-semibold text-[#8A5633]">
                        Quà đặc biệt khi hoàn thành đủ tuần điểm danh
                      </div>
                    </div>
                  </div>
                  {isDay7Claimed && (
                    <span className="flex items-center gap-1 rounded-xl bg-[#D9F2E2] px-2.5 py-1 text-[11px] font-black text-[#2D7648]">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Đã nhận
                    </span>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 rounded-xl border border-[#ECC876] bg-white px-2.5 py-1.5 text-xs font-black tabular-nums text-[#B06910]">
                    <Coins className="h-4 w-4 text-amber-500" />
                    <span>+{day7.coins} Xu</span>
                  </div>
                  {day7.foodReward && (
                    <div className="flex items-center gap-1.5 rounded-xl border border-[#EAD7BE] bg-white px-2.5 py-1 text-[11px] font-bold text-[#4A3525]">
                      <HandheldFoodIcon foodId={day7.foodReward.foodId} className="h-5 w-5" />
                      <span>
                        x{day7.foodReward.qty} {day7.foodReward.name}
                      </span>
                    </div>
                  )}
                  {day7.bonusFoodReward && (
                    <div className="flex items-center gap-1.5 rounded-xl border border-[#EAD7BE] bg-white px-2.5 py-1 text-[11px] font-bold text-[#4A3525]">
                      <HandheldFoodIcon foodId={day7.bonusFoodReward.foodId} className="h-5 w-5" />
                      <span>
                        x{day7.bonusFoodReward.qty} {day7.bonusFoodReward.name}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Footer CTA */}
        <div className="shrink-0 border-t border-[#E5D5BE] bg-[#F2E5D2] px-4 py-3">
          <button
            type="button"
            disabled={claimedToday}
            onClick={() => {
              if (claimedToday) return;
              soundFX.sparkle();
              onClaimToday();
            }}
            className={`flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl text-sm font-black shadow-sm transition active:scale-98 ${
              claimedToday
                ? 'cursor-not-allowed bg-[#DDD2C2] text-[#7A6A58]'
                : 'bg-[#D96B38] text-white hover:bg-[#C25A2B]'
            }`}
          >
            {claimedToday ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Hôm nay đã điểm danh · Hẹn ngày mai nhé!</span>
              </>
            ) : (
              <>
                <Gift className="h-4 w-4" />
                <span>
                  Nhận Quà Ngày {activeDayNumber} (+
                  {CHECK_IN_REWARDS[activeDayNumber - 1]?.coins ?? 40} Xu)
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
