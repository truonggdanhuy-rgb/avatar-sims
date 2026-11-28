import React from 'react';
import {Compass, MapPin, Moon, Sun, Volume2, VolumeX, X} from 'lucide-react';
import {TimeOfDay} from '../../types/game';
import {finalizePlayerName, sanitizePlayerNameInput} from '../../utils/playerName';
import {soundFX} from '../../utils/sound';

interface SettingsModalProps {
  playerName: string;
  onChangeName: (name: string) => void;
  timeOfDay: TimeOfDay;
  onChangeTimeOfDay: (time: TimeOfDay) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onStartAnnaTour?: () => void;
  onClose: () => void;
}

const TOWN_DIRECTORY = [
  {zone: 'Nhà Của Tôi', detail: 'Tủ thay đồ, giường hồi năng lượng, sofa & biển Nhiệm vụ ngày'},
  {zone: 'Nông Trại Rộng Mở', detail: 'Trồng trọt, ép mía, nấu bếp nông trại, ao cá & khu chăn nuôi'},
  {zone: 'Hồ Câu Cá', detail: 'Cầu gỗ bờ hồ để quăng cần câu cá kiếm xu'},
  {zone: 'Tiệm Minigame', detail: 'Máy game thùng vui nhộn tăng điểm tâm trạng'},
  {zone: 'Tiệm Thời Trang', detail: 'Khám phá mẫu phối mới và đồ trang trí'},
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  playerName,
  onChangeName,
  timeOfDay,
  onChangeTimeOfDay,
  soundEnabled,
  onToggleSound,
  onStartAnnaTour,
  onClose,
}) => {
  const handleClose = () => {
    onChangeName(finalizePlayerName(playerName));
    onClose();
  };

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-stone-950/65 p-4"
      onClick={handleClose}
    >
      <div
        className="anim-pop flex max-h-[88dvh] w-full max-w-md flex-col overflow-hidden rounded-3xl border-4 border-[#8A6240] bg-[#FAF3E8] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#E5D5BE] bg-[#F2E5D2] px-4 py-3">
          <h2 className="font-display text-base font-bold text-[#4A3525]">
            Trạm Bưu Điện & Cài Đặt
          </h2>
          <button
            type="button"
            onClick={() => {
              soundFX.tap();
              handleClose();
            }}
            aria-label="Đóng bảng cài đặt"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E3CEB2] text-[#4A3525] active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="custom-scroll flex-1 space-y-5 overflow-y-auto p-4 text-[#4A3525]">
          {/* Avatar Name */}
          <div>
            <label
              htmlFor="avatar-name-input"
              className="mb-1.5 block text-xs font-bold text-[#6F4E37]"
            >
              Tên Nhân Vật
            </label>
            <input
              id="avatar-name-input"
              type="text"
              maxLength={16}
              value={playerName}
              onChange={(e) => onChangeName(sanitizePlayerNameInput(e.target.value))}
              onBlur={(e) => onChangeName(finalizePlayerName(e.target.value))}
              placeholder="Nhập tên của bạn..."
              className="h-11 w-full rounded-xl border border-[#D8C2A6] bg-white px-3.5 text-sm font-semibold text-[#4A3525] outline-none focus:border-[#8A6240]"
            />
            <p className="mt-1 text-[10px] font-semibold text-[#7A6048]">
              Chỉ dùng chữ cái, số và khoảng cách (không icon hoặc ký tự đặc biệt).
            </p>
          </div>

          {/* Time of Day Selector */}
          <div>
            <div className="mb-2 text-xs font-bold text-[#6F4E37]">
              Thời Gian Thị Trấn
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  soundFX.tap();
                  onChangeTimeOfDay('morning');
                }}
                className={`flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-xl border py-2 text-xs font-semibold ${
                  timeOfDay === 'morning'
                    ? 'border-[#6F4E37] bg-[#6F4E37] text-amber-50'
                    : 'border-[#E0CEB6] bg-white text-[#4A3525]'
                }`}
              >
                <Sun className="h-4 w-4" />
                <span>Sáng Trong</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  soundFX.tap();
                  onChangeTimeOfDay('night');
                }}
                className={`flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-xl border py-2 text-xs font-semibold ${
                  timeOfDay === 'night'
                    ? 'border-[#6F4E37] bg-[#6F4E37] text-amber-50'
                    : 'border-[#E0CEB6] bg-white text-[#4A3525]'
                }`}
              >
                <Moon className="h-4 w-4" />
                <span>Đêm Sao</span>
              </button>
            </div>
          </div>

          {/* Sound FX Toggle */}
          <div className="flex items-center justify-between rounded-2xl border border-[#E0CEB6] bg-white px-3.5 py-2.5">
            <div>
              <div className="text-xs font-bold text-[#4A3525]">Âm Thanh Tương Tác</div>
              <div className="text-[11px] text-[#7A6048]">
                Hiệu ứng chạm gỗ, cửa mở và thay đồ
              </div>
            </div>
            <button
              type="button"
              onClick={onToggleSound}
              className={`flex h-10 w-12 items-center justify-center rounded-xl transition-colors ${
                soundEnabled
                  ? 'bg-[#6BA383] text-white'
                  : 'bg-[#EADBC6] text-[#7A6048]'
              }`}
              aria-label="Bật tắt âm thanh"
            >
              {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </button>
          </div>

          {/* Replay Guided Tour with Anna */}
          {onStartAnnaTour && (
            <div className="flex items-center justify-between rounded-2xl border border-[#E0CEB6] bg-white px-3.5 py-2.5">
              <div>
                <div className="text-xs font-bold text-[#4A3525]">Hướng Dẫn Thị Trấn Cùng Anna</div>
                <div className="text-[11px] text-[#7A6048]">
                  Tua nhanh giới thiệu các khu vực nổi bật
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  soundFX.sparkle();
                  onClose();
                  onStartAnnaTour();
                }}
                className="flex h-10 items-center gap-1.5 rounded-xl bg-[#38BDF8] px-3 text-xs font-bold text-slate-950 active:scale-95"
              >
                <Compass className="h-4 w-4" />
                <span>Xem lại</span>
              </button>
            </div>
          )}

          {/* Town Directory */}
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-[#6F4E37]">
              <MapPin className="h-3.5 w-3.5" />
              <span>Bản Đồ Các Tiểu Khu</span>
            </div>
            <div className="divide-y divide-[#EFE2CF] rounded-2xl border border-[#E0CEB6] bg-white">
              {TOWN_DIRECTORY.map((item) => (
                <div key={item.zone} className="px-3.5 py-2.5">
                  <div className="text-xs font-bold text-[#4A3525]">{item.zone}</div>
                  <div className="text-[11px] text-[#7A6048]">{item.detail}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
