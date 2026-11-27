import React, {useEffect, useMemo, useState} from 'react';
import {Check, KeyRound, RefreshCw, Sparkles, UserCheck} from 'lucide-react';
import {
  SHOP_ITEMS,
  STARTER_CHARACTER_OPTIONS,
  StarterCharacterOption,
} from '../../data/avatarCatalog';
import {AvatarConfig} from '../../types/game';
import {AccountSavePreview, decodeAccountTransferCode} from '../../utils/accountSave';
import {finalizePlayerName, sanitizePlayerNameInput} from '../../utils/playerName';
import {soundFX} from '../../utils/sound';
import {AvatarPreview3D} from '../AvatarPreview3D';

interface StarterCharacterModalProps {
  onConfirm: (payload: {
    avatar: AvatarConfig;
    unlockItemIds: string[];
  }) => void;
  onRestoreAccountCode?: (code: string) => Promise<{ok: boolean; message: string}>;
}

export const StarterCharacterModal: React.FC<StarterCharacterModalProps> = ({
  onConfirm,
  onRestoreAccountCode,
}) => {
  const [mode, setMode] = useState<'create' | 'restore'>('create');
  const [selectedId, setSelectedId] = useState<'girl' | 'boy'>('girl');
  const [customName, setCustomName] = useState<string>('');
  const [hasTypedName, setHasTypedName] = useState(false);
  const [restoreCodeInput, setRestoreCodeInput] = useState('');
  const [restorePreview, setRestorePreview] = useState<AccountSavePreview | null>(null);
  const [restoreMessage, setRestoreMessage] = useState<{ok: boolean; text: string} | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    const trimmed = restoreCodeInput.trim();
    if (!trimmed) {
      setRestorePreview(null);
      return;
    }
    let cancelled = false;
    decodeAccountTransferCode(trimmed).then((res) => {
      if (cancelled) return;
      setRestorePreview(res.ok ? res.preview : null);
    });
    return () => {
      cancelled = true;
    };
  }, [restoreCodeInput]);

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
      <div className="anim-pop flex max-h-[95dvh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border-4 border-[#9C734B] bg-[#FAF3E8] shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[#E5D5BE] bg-[#F2E5D2] px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#6BA383] text-white shadow-xs">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-base font-bold text-[#4A3525] sm:text-lg">
                Chào Mừng Đến Thị Trấn Mây
              </h1>
              <p className="text-xs font-medium text-[#7A6048]">
                {mode === 'create'
                  ? 'Chọn nhân vật Nam hoặc Nữ & đặt tên để bắt đầu hành trình'
                  : 'Dán mã lưu tài khoản từ máy cũ để tiếp tục hành trình của bạn'}
              </p>
            </div>
          </div>

          {onRestoreAccountCode && (
            <button
              type="button"
              onClick={() => {
                soundFX.tap();
                setRestoreMessage(null);
                setMode((prev) => (prev === 'create' ? 'restore' : 'create'));
              }}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold transition-all active:scale-95 ${
                mode === 'restore'
                  ? 'border border-[#D8C2A6] bg-white text-[#5B422E]'
                  : 'bg-[#2F6296] text-white shadow-xs hover:bg-[#275380]'
              }`}
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span>
                {mode === 'restore' ? 'Quay lại tạo mới' : 'Đã có mã? Khôi phục'}
              </span>
            </button>
          )}
        </div>

        {/* Body */}
        {mode === 'restore' ? (
          <div className="custom-scroll flex-1 overflow-y-auto p-5 sm:p-6">
            <div className="mx-auto max-w-lg space-y-4 rounded-2xl border border-[#DFCCB0] bg-white p-5 shadow-xs">
              <div className="flex items-center gap-2 text-sm font-black text-[#4A3525]">
                <KeyRound className="h-5 w-5 text-[#2F6296]" />
                <span>Khôi Phục Tài Khoản Bằng Mã</span>
              </div>
              <p className="text-xs font-medium leading-relaxed text-[#7A6048]">
                Mở game trên máy cũ, vào <b>Điện thoại → Tài khoản → Sao chép mã tài khoản</b>, sau đó dán mã vào ô dưới đây để chuyển toàn bộ dữ liệu sang máy này.
              </p>
              <textarea
                rows={4}
                value={restoreCodeInput}
                onChange={(e) => {
                  setRestoreCodeInput(e.target.value);
                  if (restoreMessage) setRestoreMessage(null);
                }}
                placeholder="Dán mã TTM1-... vào đây"
                className="w-full resize-none rounded-2xl border-2 border-[#DFCCB0] bg-[#FAF4EA] px-3.5 py-2.5 font-mono text-xs font-semibold text-[#3B2A1A] placeholder:font-sans placeholder:text-[#9D856B] focus:border-[#2F6296] focus:outline-none"
              />

              {restorePreview && (
                <div className="rounded-2xl border border-[#C6E4D1] bg-[#F1FAF4] p-3 text-xs font-bold text-[#246341]">
                  <div className="text-sm font-black">
                    Nhân vật: {restorePreview.playerName}
                  </div>
                  <div className="mt-1 text-[11px] text-[#3B7353] tabular-nums">
                    ID: {restorePreview.accountId} · {restorePreview.coins.toLocaleString('vi-VN')} Xu ·{' '}
                    {restorePreview.coinGame} CG · {restorePreview.ownedItemCount} món đồ ·{' '}
                    {restorePreview.petCount} thú cưng
                  </div>
                </div>
              )}

              {restoreMessage && (
                <p
                  className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                    restoreMessage.ok
                      ? 'bg-[#EAF8EE] text-[#2A6E40]'
                      : 'bg-[#FDF0ED] text-[#A8382B]'
                  }`}
                >
                  {restoreMessage.text}
                </p>
              )}

              <button
                type="button"
                disabled={isRestoring}
                onClick={async () => {
                  if (!onRestoreAccountCode) return;
                  soundFX.tap();
                  setIsRestoring(true);
                  const res = await onRestoreAccountCode(restoreCodeInput);
                  setIsRestoring(false);
                  setRestoreMessage({ok: res.ok, text: res.message});
                  if (res.ok) soundFX.sparkle();
                }}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2F6296] px-5 py-3.5 font-display text-sm font-bold text-white shadow-md transition-transform hover:bg-[#275380] active:scale-[0.98] disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${isRestoring ? 'animate-spin' : ''}`} />
                <span>
                  {isRestoring ? 'Đang khôi phục...' : 'Khôi Phục & Vào Thị Trấn Mây'}
                </span>
              </button>
            </div>
          </div>
        ) : (
        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-y-auto md:flex-row md:overflow-hidden"
        >
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
        </form>
        )}
      </div>
    </div>
  );
};
