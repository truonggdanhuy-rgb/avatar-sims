import React from 'react';
import {INSECT_CATALOG} from '../data/insectCatalog';
import {InsectSpeciesId} from '../types/game';

/** Icon Vợt Gỗ (cán gỗ + vành nâu + túi lưới trắng kem sâu lòng) */
export function WoodenNetIcon({className = 'w-8 h-8'}: {className?: string}) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className}>
      {/* Wooden handle */}
      <path
        d="M9 39L24 24"
        stroke="#8B542C"
        strokeWidth="4.2"
        strokeLinecap="round"
      />
      <path
        d="M9.5 38.5L15 33"
        stroke="#B87E4B"
        strokeWidth="4.4"
        strokeLinecap="round"
      />
      {/* Hoop connector */}
      <circle cx="24" cy="24" r="2.2" fill="#5E371B" />
      {/* Tapered mesh pouch */}
      <path
        d="M20.5 14.5C18 22 25 32.5 35.5 33.5C38.5 33.8 40 28.5 36.5 21.5"
        fill="#EEF6FA"
        stroke="#B4CEDA"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Subtle cross mesh lines inside bag */}
      <path
        d="M23.5 20.5L32.5 29.5M28 19L35 27.5M23 26.5L32.5 22.5"
        stroke="#CFE2EC"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      {/* Wooden hoop rim */}
      <ellipse
        cx="29"
        cy="17"
        rx="10.2"
        ry="6.6"
        transform="rotate(36 29 17)"
        fill="#FAFDFE"
        fillOpacity="0.45"
        stroke="#7A4824"
        strokeWidth="3.2"
      />
    </svg>
  );
}

/** Icon Sổ Sinh Vật (Cá + Bướm kết hợp) */
export function CreatureBookIcon({className = 'w-7 h-7'}: {className?: string}) {
  return (
    <svg viewBox="0 0 36 36" fill="none" className={className}>
      {/* Blue Fish bottom-left */}
      <g transform="translate(11, 22) rotate(-18)">
        <ellipse cx="0" cy="0" rx="7.2" ry="4.4" fill="#3B9AB2" stroke="#1E5D70" strokeWidth="1.4" />
        <path d="M6.4 0L10.8 -3.6L9.4 0L10.8 3.6Z" fill="#2A7A8F" stroke="#1E5D70" strokeWidth="1.2" strokeLinejoin="round" />
        <circle cx="-3.6" cy="-1" r="1.1" fill="#FFFDF8" />
        <circle cx="-3.6" cy="-1" r="0.55" fill="#1C2A32" />
      </g>
      {/* Golden-Coral Butterfly top-right */}
      <g transform="translate(24, 12) rotate(14)">
        <ellipse cx="-3.8" cy="-2.2" rx="4.2" ry="3.2" fill="#F6A25E" stroke="#9B4D18" strokeWidth="1.2" />
        <ellipse cx="3.8" cy="-2.2" rx="4.2" ry="3.2" fill="#F6A25E" stroke="#9B4D18" strokeWidth="1.2" />
        <ellipse cx="-3" cy="2.6" rx="3" ry="2.3" fill="#FAD149" stroke="#9B4D18" strokeWidth="1.1" />
        <ellipse cx="3" cy="2.6" rx="3" ry="2.3" fill="#FAD149" stroke="#9B4D18" strokeWidth="1.1" />
        <rect x="-1" y="-4" width="2" height="8.2" rx="1" fill="#4A2E1A" />
        <path d="M-0.4 -4C-1.5 -6 -2.6 -6.2 -3.2 -5.8M0.4 -4C1.5 -6 2.6 -6.2 3.2 -5.8" stroke="#4A2E1A" strokeWidth="1.1" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/** Minh họa từng loài côn trùng sắc nét theo shapeKind & bảng màu riêng */
export function InsectIllustration({
  speciesId,
  className = 'w-11 h-11',
}: {
  speciesId: InsectSpeciesId;
  className?: string;
}) {
  const spec = INSECT_CATALOG[speciesId];
  const {shapeKind, primaryColor, accentColor, wingColor} = spec;

  if (shapeKind === 'butterfly' || shapeKind === 'moth') {
    const isSwallow = speciesId === 'buom_duoi_nhan' || speciesId === 'buom_phuong_xanh';
    const isMoth = shapeKind === 'moth';
    const isEmperor = speciesId === 'buom_hoang_de';
    return (
      <svg viewBox="0 0 48 48" fill="none" className={className}>
        {/* Upper wings */}
        <path
          d="M23 23C16 11 5 9 6 19C6.5 24 14 27 22.5 25.5Z"
          fill={wingColor}
          stroke={primaryColor}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M25 23C32 11 43 9 42 19C41.5 24 34 27 25.5 25.5Z"
          fill={wingColor}
          stroke={primaryColor}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        {/* Lower wings */}
        <path
          d={
            isSwallow || isMoth
              ? 'M23 25.5C15 26 9 31 12.5 36.5C14.5 39.5 14 42 16 42.5C18.5 39 21 34 23 29Z'
              : 'M23 25.5C14 26 9.5 31 12.5 36C15.5 40.5 21 36 23 29Z'
          }
          fill={wingColor}
          stroke={primaryColor}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d={
            isSwallow || isMoth
              ? 'M25 25.5C33 26 39 31 35.5 36.5C33.5 39.5 34 42 32 42.5C29.5 39 27 34 25 29Z'
              : 'M25 25.5C34 26 38.5 31 35.5 36C32.5 40.5 27 36 25 29Z'
          }
          fill={wingColor}
          stroke={primaryColor}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        {/* Wing markings */}
        <circle cx="13.5" cy="18.5" r={isMoth || isEmperor ? '2.8' : '2.1'} fill={accentColor} />
        <circle cx="34.5" cy="18.5" r={isMoth || isEmperor ? '2.8' : '2.1'} fill={accentColor} />
        {(isEmperor || isMoth || isSwallow) && (
          <>
            <circle cx="16.2" cy="31.5" r="1.8" fill={accentColor} />
            <circle cx="31.8" cy="31.5" r="1.8" fill={accentColor} />
          </>
        )}
        {/* Body & Feathered / Clubbed Antennae */}
        <rect x="22" y="16.5" width="4" height="15.5" rx="2" fill={primaryColor} />
        <circle cx="24" cy="15.5" r="2.2" fill={primaryColor} />
        <path
          d="M23 13.5C21 9.5 18.5 8.5 17 9M25 13.5C27 9.5 29.5 8.5 31 9"
          stroke={primaryColor}
          strokeWidth={isMoth ? '2.2' : '1.5'}
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (shapeKind === 'dragonfly') {
    return (
      <svg viewBox="0 0 48 48" fill="none" className={className}>
        {/* 4 translucent wings */}
        <ellipse cx="14.5" cy="18.5" rx="9.5" ry="3.2" transform="rotate(-14 14.5 18.5)" fill={wingColor} stroke="#7BA6BA" strokeWidth="1.3" />
        <ellipse cx="33.5" cy="18.5" rx="9.5" ry="3.2" transform="rotate(14 33.5 18.5)" fill={wingColor} stroke="#7BA6BA" strokeWidth="1.3" />
        <ellipse cx="15" cy="24.5" rx="8.5" ry="2.8" transform="rotate(8 15 24.5)" fill={wingColor} stroke="#7BA6BA" strokeWidth="1.3" />
        <ellipse cx="33" cy="24.5" rx="8.5" ry="2.8" transform="rotate(-8 33 24.5)" fill={wingColor} stroke="#7BA6BA" strokeWidth="1.3" />
        {/* Long segmented tail */}
        <rect x="22.4" y="20" width="3.2" height="20" rx="1.6" fill={primaryColor} stroke="#36221C" strokeWidth="1.2" />
        <path d="M22.5 27H25.5M22.5 32H25.5M22.5 36.5H25.5" stroke={accentColor} strokeWidth="1.3" />
        {/* Thorax & big compound eyes */}
        <ellipse cx="24" cy="18" rx="3.4" ry="4" fill={primaryColor} stroke="#36221C" strokeWidth="1.3" />
        <circle cx="22.2" cy="13.2" r="2.1" fill={accentColor} stroke="#36221C" strokeWidth="1.1" />
        <circle cx="25.8" cy="13.2" r="2.1" fill={accentColor} stroke="#36221C" strokeWidth="1.1" />
      </svg>
    );
  }

  if (shapeKind === 'bee') {
    return (
      <svg viewBox="0 0 48 48" fill="none" className={className}>
        {/* Wings */}
        <ellipse cx="17.5" cy="17" rx="7" ry="4.2" transform="rotate(-28 17.5 17)" fill={wingColor} stroke="#88B5CA" strokeWidth="1.4" />
        <ellipse cx="30.5" cy="17" rx="7" ry="4.2" transform="rotate(28 30.5 17)" fill={wingColor} stroke="#88B5CA" strokeWidth="1.4" />
        {/* Legs */}
        <path d="M18 28L14 33M30 28L34 33M17.5 24L13 26M30.5 24L35 26" stroke={accentColor} strokeWidth="1.5" strokeLinecap="round" />
        {/* Plump striped abdomen */}
        <ellipse cx="24" cy="27.5" rx="7.5" ry="9" fill={primaryColor} stroke={accentColor} strokeWidth="1.8" />
        <path d="M17 26.5H31M18 31H30" stroke={accentColor} strokeWidth="2.8" />
        <path d="M24 36.5L24 39.2" stroke={accentColor} strokeWidth="1.8" strokeLinecap="round" />
        {/* Head */}
        <circle cx="24" cy="16.5" r="4.5" fill={accentColor} />
        <circle cx="22.3" cy="16" r="1" fill="#FFFDF8" />
        <circle cx="25.7" cy="16" r="1" fill="#FFFDF8" />
        <path d="M22.2 12.2L20 9.2M25.8 12.2L28 9.2" stroke={accentColor} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (shapeKind === 'ladybug') {
    return (
      <svg viewBox="0 0 48 48" fill="none" className={className}>
        {/* Legs */}
        <path d="M15 20L10.5 17M14 26L9.5 26M15.5 32L11 35.5M33 20L37.5 17M34 26L38.5 26M32.5 32L37 35.5" stroke={accentColor} strokeWidth="1.8" strokeLinecap="round" />
        {/* Round red shell */}
        <ellipse cx="24" cy="26.5" rx="10.8" ry="11.5" fill={primaryColor} stroke={accentColor} strokeWidth="1.8" />
        {/* Head */}
        <path d="M17.5 18C18.5 13 29.5 13 30.5 18Z" fill={accentColor} />
        <path d="M21.5 13.5L19.5 10.2M26.5 13.5L28.5 10.2" stroke={accentColor} strokeWidth="1.5" strokeLinecap="round" />
        {/* Split line & 7 dots */}
        <line x1="24" y1="18" x2="24" y2="38" stroke={accentColor} strokeWidth="1.8" />
        <circle cx="19" cy="24" r="2" fill={accentColor} />
        <circle cx="29" cy="24" r="2" fill={accentColor} />
        <circle cx="18" cy="31" r="1.8" fill={accentColor} />
        <circle cx="30" cy="31" r="1.8" fill={accentColor} />
        <circle cx="24" cy="21.5" r="1.7" fill={accentColor} />
        <circle cx="21.5" cy="34.2" r="1.3" fill={accentColor} />
        <circle cx="26.5" cy="34.2" r="1.3" fill={accentColor} />
      </svg>
    );
  }

  if (shapeKind === 'horned_beetle') {
    const isStag = speciesId === 'bo_kep_kim';
    return (
      <svg viewBox="0 0 48 48" fill="none" className={className}>
        {/* Legs */}
        <path d="M16 21L10.5 18.5M15 27L9.5 28.5M16.5 33L11.5 37.5M32 21L37.5 18.5M33 27L38.5 28.5M31.5 33L36.5 37.5" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" />
        {/* Horns / Mandibles */}
        {isStag ? (
          <>
            <path d="M20.5 16.5C17 11.5 17 7.5 21 6.5C19.8 9.2 20.5 11.8 22.5 13.5" stroke={accentColor} strokeWidth="2.4" strokeLinecap="round" />
            <path d="M27.5 16.5C31 11.5 31 7.5 27 6.5C28.2 9.2 27.5 11.8 25.5 13.5" stroke={accentColor} strokeWidth="2.4" strokeLinecap="round" />
          </>
        ) : (
          <path d="M24 17V7.5M21.5 8.5L24 6.5L26.5 8.5" stroke={accentColor} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        )}
        {/* Thorax & Wing casing */}
        <ellipse cx="24" cy="29.5" rx="8.8" ry="10.2" fill={primaryColor} stroke="#28160E" strokeWidth="1.7" />
        <ellipse cx="24" cy="19.5" rx="7.2" ry="4.5" fill={accentColor} stroke="#28160E" strokeWidth="1.5" />
        <line x1="24" y1="24" x2="24" y2="39.5" stroke="#28160E" strokeWidth="1.5" />
        <path d="M19.5 27C19.5 30 19.5 33 20.5 35" stroke="#FFFFFF" strokeOpacity="0.35" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }

  if (shapeKind === 'beetle' || shapeKind === 'stinkbug' || shapeKind === 'firefly') {
    const isShield = shapeKind === 'stinkbug';
    const isFirefly = shapeKind === 'firefly';
    return (
      <svg viewBox="0 0 48 48" fill="none" className={className}>
        <path d="M16 20L11 17M14.5 26L9.5 26.5M16 32L11.5 36M32 20L37 17M33.5 26L38.5 26.5M32 32L36.5 36" stroke="#363230" strokeWidth="1.7" strokeLinecap="round" />
        {isShield ? (
          <path d="M24 14L34.5 20.5L32 33.5L24 39L16 33.5L13.5 20.5Z" fill={primaryColor} stroke="#294D28" strokeWidth="1.7" strokeLinejoin="round" />
        ) : (
          <ellipse cx="24" cy="27.5" rx="8.5" ry="10.5" fill={primaryColor} stroke="#24302C" strokeWidth="1.7" />
        )}
        {isFirefly ? (
          <ellipse cx="24" cy="34" rx="5.6" ry="3.8" fill={accentColor} />
        ) : (
          <line x1="24" y1="20" x2="24" y2="38" stroke="#1E2C27" strokeWidth="1.4" />
        )}
        <circle cx="24" cy="15.5" r="3.8" fill={isFirefly ? '#D95436' : accentColor} stroke="#24302C" strokeWidth="1.3" />
        <path d="M22 12.2L19.5 8.5M26 12.2L28.5 8.5" stroke="#363230" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }

  if (shapeKind === 'cicada') {
    return (
      <svg viewBox="0 0 48 48" fill="none" className={className}>
        <path d="M17 19L12 16M16 25L11.5 26M31 19L36 16M32 25L36.5 26" stroke="#4D3428" strokeWidth="1.7" strokeLinecap="round" />
        <ellipse cx="24" cy="24.5" rx="6.8" ry="10.2" fill={primaryColor} stroke="#3B271E" strokeWidth="1.5" />
        {/* Folded clear wings */}
        <ellipse cx="19" cy="28" rx="4.5" ry="11.5" transform="rotate(14 19 28)" fill={wingColor} fillOpacity="0.82" stroke="#7A9A92" strokeWidth="1.3" />
        <ellipse cx="29" cy="28" rx="4.5" ry="11.5" transform="rotate(-14 29 28)" fill={wingColor} fillOpacity="0.82" stroke="#7A9A92" strokeWidth="1.3" />
        <rect x="20" y="13.5" width="8" height="4.8" rx="2.4" fill={accentColor} stroke="#3B271E" strokeWidth="1.3" />
        <circle cx="19.5" cy="15.2" r="1.7" fill="#C94A38" />
        <circle cx="28.5" cy="15.2" r="1.7" fill="#C94A38" />
      </svg>
    );
  }

  if (shapeKind === 'mantis') {
    return (
      <svg viewBox="0 0 48 48" fill="none" className={className}>
        {/* Back legs */}
        <path d="M21 29L13 36L11 40M27 29L35 36L37 40" stroke={accentColor} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        {/* Raptorial front arms */}
        <path d="M22 19L14 15L16.5 22.5M26 19L34 15L31.5 22.5" stroke={primaryColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Abdomen & long thorax */}
        <ellipse cx="24" cy="31" rx="5.2" ry="8.8" fill={wingColor} stroke={accentColor} strokeWidth="1.5" />
        <rect x="22.4" y="14" width="3.2" height="11" rx="1.6" fill={primaryColor} />
        {/* Triangular mantis head */}
        <polygon points="19.5,11 28.5,11 24,16" fill={primaryColor} stroke={accentColor} strokeWidth="1.3" strokeLinejoin="round" />
        <circle cx="19.8" cy="11.5" r="1.4" fill="#FFF7C2" />
        <circle cx="28.2" cy="11.5" r="1.4" fill="#FFF7C2" />
        <path d="M22 10.5L18.5 6.5M26 10.5L29.5 6.5" stroke={accentColor} strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    );
  }

  // grasshopper
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className}>
      {/* Powerful bent hind legs */}
      <path d="M24 27L33 17L39 32M19 27L13 33" stroke={primaryColor} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      {/* Sleek horizontal-diagonal body */}
      <ellipse cx="22.5" cy="27.5" rx="11.5" ry="4.5" transform="rotate(-14 22.5 27.5)" fill={primaryColor} stroke="#3B6E22" strokeWidth="1.6" />
      <ellipse cx="24" cy="26.2" rx="8.5" ry="2.6" transform="rotate(-14 24 26.2)" fill={wingColor} />
      <circle cx="12" cy="28" r="3.4" fill={accentColor} stroke="#3B6E22" strokeWidth="1.4" />
      <circle cx="11" cy="27.2" r="1" fill="#2A261E" />
      <path d="M10.5 25L6.5 19.5M12 24.5L9.5 18.5" stroke="#3B6E22" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
