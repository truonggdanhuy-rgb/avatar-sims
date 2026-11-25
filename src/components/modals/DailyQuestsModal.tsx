import React from 'react';
import {
  Bug,
  Check,
  Coins,
  Fish,
  HeartHandshake,
  Home,
  Package,
  Sparkles,
  Sprout,
  Tractor,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import {DAILY_QUEST_DEFS} from '../../data/progressionCatalog';
import {DailyQuestKey, DailyQuestProgress} from '../../types/game';
import {soundFX} from '../../utils/sound';

interface DailyQuestsModalProps {
  quests: DailyQuestProgress;
  onClaimQuest: (key: DailyQuestKey, reward: number) => void;
  onClose: () => void;
}

function getQuestIcon(key: DailyQuestKey) {
  switch (key) {
    case 'garden':
      return Sprout;
    case 'livestock':
      return Tractor;
    case 'fishing':
      return Fish;
    case 'insects':
      return Bug;
    case 'cooking':
      return UtensilsCrossed;
    case 'pet':
      return HeartHandshake;
    case 'decor':
      return Home;
    case 'delivery':
      return Package;
  }
}

export const DailyQuestsModal: React.FC<DailyQuestsModalProps> = ({
  quests,
  onClaimQuest,
  onClose,
}) => {
  const claimedCount = DAILY_QUEST_DEFS.filter((q) => quests.claimed[q.key]).length;
  const totalRewardCoins = DAILY_QUEST_DEFS.reduce((s, q) => s + q.rewardCoins, 0);

  return (
    <div
      className="phone-ui fixed inset-0 z-50 flex items-center justify-center bg-stone-950/65 p-3 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="anim-pop flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border-4 border-[#9C734B] bg-[#FAF3E8] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#E5D5BE] bg-[#F2E5D2] px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-600" />
            <div>
              <h2 className="font-display text-base font-bold text-[#4A3525]">
                Bảng Nhiệm Vụ Hằng Ngày
              </h2>
              <p className="text-[11px] font-semibold tabular-nums text-[#7A6048]">
                Hoàn thành {claimedCount}/{DAILY_QUEST_DEFS.length} · Tổng thưởng {totalRewardCoins} Xu/ngày
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              soundFX.tap();
              onClose();
            }}
            aria-label="Đóng bảng nhiệm vụ ngày"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E3CEB2] text-[#4A3525] active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="custom-scroll flex-1 space-y-2.5 overflow-y-auto p-4 text-[#4A3525]">
          {DAILY_QUEST_DEFS.map((q) => {
            const done = quests.tasks[q.key];
            const claimed = quests.claimed[q.key];
            const Icon = getQuestIcon(q.key);
            return (
              <div
                key={q.key}
                className="flex items-center justify-between gap-3 rounded-2xl border border-[#E0CEB6] bg-white p-3"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{backgroundColor: q.accentBg, color: q.badgeColor}}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-extrabold text-[#4A3525] sm:text-sm">{q.title}</div>
                    <div className="mt-0.5 text-[11px] leading-snug text-[#7A6048]">{q.desc}</div>
                  </div>
                </div>

                {claimed ? (
                  <div className="flex shrink-0 items-center gap-1 rounded-xl bg-[#E8F3EC] px-3 py-2 text-xs font-bold text-[#4C8763]">
                    <Check className="h-3.5 w-3.5" />
                    <span>Đã Nhận</span>
                  </div>
                ) : done ? (
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.sparkle();
                      onClaimQuest(q.key, q.rewardCoins);
                    }}
                    className="flex shrink-0 items-center gap-1 rounded-xl bg-[#5B9C76] px-3 py-2 text-xs font-bold tabular-nums text-white shadow-xs transition-transform active:scale-95"
                  >
                    <Coins className="h-3.5 w-3.5" />
                    <span>Nhận +{q.rewardCoins}</span>
                  </button>
                ) : (
                  <div className="shrink-0 rounded-xl bg-[#F4ECE0] px-3 py-2 text-xs font-bold tabular-nums text-[#8A6D53]">
                    +{q.rewardCoins} Xu
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
