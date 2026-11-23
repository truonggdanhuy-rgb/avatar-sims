import React, {useMemo, useState} from 'react';
import {Check, Sparkles, UserCheck} from 'lucide-react';
import {
  SHOP_ITEMS,
  STARTER_CHARACTER_OPTIONS,
  StarterCharacterOption,
} from '../../data/avatarCatalog';
import {AvatarConfig} from '../../types/game';
import {finalizePlayerName, sanitizePlayerNameInput} from '../../utils/playerName';
import {soundFX} from '../../utils/sound';
import {AvatarPreview3D} from '../AvatarPreview3D';

interface StarterCharacterModalProps {
  onConfirm: (payload: {
    avatar: AvatarConfig;
    unlockItemIds: string[];
  }) => void;
}

export const StarterCharacterModal: React.FC<StarterCharacterModalProps> = ({
  onConfirm,
}) => {
  const [selectedId, setSelectedId] = useState<'girl' | 'boy'>('girl');
  const [customName, setCustomName] = useState<string>('');
  const [hasTypedName, setHasTypedName] = useState(false);

  const selectedOption: StarterCharacterOption = useMemo(
    () =>
      STARTER_CHARACTER_OPTIONS.find((opt) => opt.id === selectedId) ??
      STARTER_CHARACTER_OPTIONS[0],
    [selectedId],
  );

  const displayName = hasTypedName ? customName : selectedOption.defaultName;

  const previewAvatar: AvatarConfig = useMemo(
    () => ({
      ...selectedOption.avatar,
      name: displayName.trim() || selectedOption.defaultName,
    }),
    [selectedOption, displayName],
  );

  const unlockedNames = useMemo(
    () =>
      selectedOption.unlockItemIds
        .map((id) => SHOP_ITEMS.find((item) => item.id === id)?.name)
        .filter((name): name is string => Boolean(name)),
    [selectedOption],
  );

  const handleSelectOption = (option: StarterCharacterOption) => {
    soundFX.tap();
    setSelectedId(option.id);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    soundFX.sparkle();
    const finalName = finalizePlayerName(
      displayName,
      selectedOption.defaultName,
    );
    onConfirm({
      avatar: {
        ...selectedOption.avatar,
        name: finalName,
      },
      unlockItemIds: selectedOption.unlockItemIds,
    });
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-stone-950/75 p-2 sm:p-4">
      <form
        onSubmit={handleSubmit}
        className="anim-pop flex max-h-[95dvh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border-4 border-[#9C734B] bg-[#FAF3E8] shadow-2xl"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#E5D5BE] bg-[#F2E5D2] px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#6BA383] text-white shadow-xs">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-base font-bold text-[#4A3525] sm:text-lg">
                Chào Mừng Đến Thị Trấn Mây
              </h1>
              <p className="text-xs font-medium text-[#7A6048]">
                Chọn nhân vật Nam hoặc Nữ &amp; đặt tên để bắt đầu hành trình (bộ đồ mặc sẵn sẽ lưu trong Tủ Đồ!)
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto md:flex-row md:overflow-hidden">
          {/* Left: Live 3D Stage */}
          <div className="relative flex h-64 shrink-0 flex-col items-center justify-center border-b border-[#E5D5BE] bg-gradient-to-b from-[#FFFDF8] to-[#EFE1CC] md:h-auto md:w-[340px] md:border-r md:border-b-0">
            <AvatarPreview3D avatar={previewAvatar} className="h-full w-full" />
            <div className="pointer-events-none absolute bottom-2.5 rounded-xl border border-[#DFC7A5] bg-[#FFF8EB] px-3 py-1 text-[11px] font-bold text-[#5B422E] shadow-xs">
              {previewAvatar.name} · Kéo để xoay 360°
            </div>
          </div>

          {/* Right: Nam / Nữ Cards + Name Input + Confirm */}
          <div className="custom-scroll flex flex-1 flex-col justify-between gap-4 overflow-y-auto p-4 sm:p-5">
            <div className="space-y-4">
              {/* Two Character Gender Cards */}
              <div>
                <div className="mb-2 text-xs font-bold tracking-wide text-[#6F4E37] uppercase">
                  1. Chọn Tạo Hình Khởi Đầu
                </div>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {STARTER_CHARACTER_OPTIONS.map((option) => {
                    const active = option.id === selectedId;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => handleSelectOption(option)}
                        className={`flex flex-col gap-1.5 rounded-2xl border-2 p-3.5 text-left transition-all active:scale-[0.98] ${
                          active
                            ? 'border-[#6BA383] bg-[#F1FAF4] shadow-sm'
                            : 'border-[#DFCCB0] bg-white hover:border-[#C5A47E]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`rounded-lg px-2.5 py-0.5 text-xs font-bold ${
                              option.id === 'boy'
                                ? 'bg-[#E5F0FB] text-[#2F6296]'
                                : 'bg-[#FCE8EE] text-[#B84A69]'
                            }`}
                          >
                            {option.genderLabel}
                          </span>
                          {active && (
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#6BA383] text-white">
                              <Check className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </div>
                        <div className="font-display text-sm font-bold text-[#4A3525]">
                          {option.title}
                        </div>
                        <div className="text-[11px] font-medium leading-snug text-[#7A6048]">
                          {option.subtitle}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Included Wardrobe Items */}
              <div className="rounded-2xl border border-[#E5D5BE] bg-[#FBF6EE] p-3">
                <div className="mb-1.5 text-xs font-bold text-[#5B422E]">
                  Trang phục tặng kèm trong Tủ Đồ ({unlockedNames.length} món):
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {unlockedNames.map((itemName) => (
                    <div
                      key={itemName}
                      className="flex items-center gap-1.5 rounded-xl bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#4A3525] shadow-2xs"
                    >
                      <Check className="h-3.5 w-3.5 shrink-0 text-[#6BA383]" />
                      <span className="truncate">{itemName}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Name Input */}
              <div>
                <label
                  htmlFor="starter-character-name"
                  className="mb-1.5 block text-xs font-bold tracking-wide text-[#6F4E37] uppercase"
                >
                  2. Đặt Tên Nhân Vật
                </label>
                <input
                  id="starter-character-name"
                  type="text"
                  maxLength={18}
                  value={displayName}
                  onChange={(e) => {
                    setHasTypedName(true);
                    setCustomName(sanitizePlayerNameInput(e.target.value));
                  }}
                  placeholder={`Ví dụ: ${selectedOption.defaultName}`}
                  className="w-full rounded-2xl border-2 border-[#DFCCB0] bg-white px-4 py-2.5 text-sm font-bold text-[#4A3525] outline-none transition-colors focus:border-[#6BA383]"
                />
              </div>
            </div>

            {/* Submit CTA */}
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#6BA383] px-5 py-3.5 font-display text-sm font-bold text-white shadow-md transition-transform hover:bg-[#5D9474] active:scale-[0.98]"
            >
              <UserCheck className="h-5 w-5" />
              <span>Bắt Đầu Vào Thị Trấn · {previewAvatar.name}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
