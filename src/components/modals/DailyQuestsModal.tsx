import React from 'react';
import {Check, Coins, Sparkles, X} from 'lucide-react';
import {DailyQuestProgress} from '../../types/game';
import {soundFX} from '../../utils/sound';

interface DailyQuestsModalProps {
  quests: DailyQuestProgress;
  onClaimQuest: (key: keyof DailyQuestProgress['tasks'], reward: number) => void;
  onClose: () => void;
}

const QUEST_LIST: {
  key: keyof DailyQuestProgress['tasks'];
  title: string;
  desc: string;
  reward: number;
}[] = [
  {
    key: 'garden',
    title: 'Chăm Sóc Nhà Kính',
    desc: 'Gieo hạt hoặc thu hoạch 1 ô cây tại Khu Vườn.',
    reward: 25,
  },
  {
    key: 'fishing',
    title: 'Thú Vui Bên Hồ',
    desc: 'Câu thành công 1 chú cá ở Hồ Câu Cá.',
    reward: 25,
  },
  {
    key: 'dressup',
    title: 'Làm Mới Phong Cách',
    desc: 'Thay một món đồ mới trong Tủ Đồ hoặc Cửa Hàng.',
    reward: 20,
  },
];

export const DailyQuestsModal: React.FC<DailyQuestsModalProps> = ({
  quests,
  onClaimQuest,
  onClose,
}) => {
  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-stone-950/65 p-4"
      onClick={onClose}
    >
      <div
        className="anim-pop flex max-h-[88dvh] w-full max-w-md flex-col overflow-hidden rounded-3xl border-4 border-[#9C734B] bg-[#FAF3E8] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#E5D5BE] bg-[#F2E5D2] px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-600" />
            <h2 className="font-display text-base font-bold text-[#4A3525]">
              Nhiệm Vụ Ngày
            </h2>
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

        <div className="custom-scroll flex-1 space-y-3 overflow-y-auto p-4 text-[#4A3525]">
          {QUEST_LIST.map((q) => {
            const done = quests.tasks[q.key];
            const claimed = quests.claimed[q.key];
            return (
              <div
                key={q.key}
                className="flex items-center justify-between gap-3 rounded-2xl border border-[#E0CEB6] bg-white p-3.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-[#4A3525]">{q.title}</div>
                  <div className="mt-0.5 text-xs text-[#7A6048]">{q.desc}</div>
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
                      onClaimQuest(q.key, q.reward);
                    }}
                    className="flex shrink-0 items-center gap-1 rounded-xl bg-[#6BA383] px-3 py-2 text-xs font-bold tabular-nums text-white shadow-xs transition-transform active:scale-95"
                  >
                    <Coins className="h-3.5 w-3.5" />
                    <span>Nhận +{q.reward}</span>
                  </button>
                ) : (
                  <div className="shrink-0 rounded-xl bg-[#F4ECE0] px-3 py-2 text-xs font-bold tabular-nums text-[#8A6D53]">
                    +{q.reward} Xu
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
