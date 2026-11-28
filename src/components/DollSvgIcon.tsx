import React from 'react';
import {HandheldStyle} from '../types/game';

interface DollSvgIconProps {
  style: HandheldStyle;
  size?: number;
  className?: string;
}

const OUTLINE = '#3F2D21';

export const DollSvgIcon: React.FC<DollSvgIconProps> = ({
  style,
  size = 76,
  className = '',
}) => {
  const renderDoll = () => {
    switch (style) {
      case 'doll_mimi_bunny':
        return (
          <g>
            {/* Long bunny ears */}
            <ellipse cx="29" cy="18" rx="6" ry="13" transform="rotate(-14 29 18)" fill="#F9B4CE" stroke={OUTLINE} strokeWidth="2" />
            <ellipse cx="29" cy="19" rx="3" ry="8" transform="rotate(-14 29 19)" fill="#FFF5F8" />
            <ellipse cx="51" cy="18" rx="6" ry="13" transform="rotate(14 51 18)" fill="#F9B4CE" stroke={OUTLINE} strokeWidth="2" />
            <ellipse cx="51" cy="19" rx="3" ry="8" transform="rotate(14 51 19)" fill="#FFF5F8" />
            {/* Body */}
            <ellipse cx="40" cy="56" rx="14" ry="13" fill="#F9B4CE" stroke={OUTLINE} strokeWidth="2.1" />
            <ellipse cx="40" cy="57" rx="8.5" ry="8.5" fill="#FFF5F8" />
            {/* Head */}
            <circle cx="40" cy="36" r="14.5" fill="#F9B4CE" stroke={OUTLINE} strokeWidth="2.1" />
            <ellipse cx="40" cy="37" rx="11" ry="9.5" fill="#FFF3E6" />
            {/* Eyes & Blush */}
            <circle cx="35" cy="36" r="2.2" fill="#3B232B" />
            <circle cx="45" cy="36" r="2.2" fill="#3B232B" />
            <circle cx="34.2" cy="35.1" r="0.8" fill="#FFFFFF" />
            <circle cx="44.2" cy="35.1" r="0.8" fill="#FFFFFF" />
            <ellipse cx="32" cy="40" rx="2.6" ry="1.4" fill="#FF8BA7" opacity="0.7" />
            <ellipse cx="48" cy="40" rx="2.6" ry="1.4" fill="#FF8BA7" opacity="0.7" />
            <circle cx="40" cy="39" r="1.6" fill="#F47296" />
            {/* Bow */}
            <path d="M33 48 L40 51 L33 54 Z M47 48 L40 51 L47 54 Z" fill="#FB7185" stroke={OUTLINE} strokeWidth="1.4" strokeLinejoin="round" />
          </g>
        );

      case 'doll_coco_bear':
        return (
          <g>
            <circle cx="27" cy="24" r="6" fill="#C58B58" stroke={OUTLINE} strokeWidth="2" />
            <circle cx="27" cy="24" r="3" fill="#FBEBD7" />
            <circle cx="53" cy="24" r="6" fill="#C58B58" stroke={OUTLINE} strokeWidth="2" />
            <circle cx="53" cy="24" r="3" fill="#FBEBD7" />
            <ellipse cx="40" cy="56" rx="14" ry="13" fill="#C58B58" stroke={OUTLINE} strokeWidth="2.1" />
            <rect x="31" y="51" width="18" height="14" rx="4" fill="#60A5FA" stroke={OUTLINE} strokeWidth="1.6" />
            <circle cx="40" cy="36" r="14.5" fill="#C58B58" stroke={OUTLINE} strokeWidth="2.1" />
            <ellipse cx="40" cy="37" rx="11" ry="9.5" fill="#FFF3E6" />
            <ellipse cx="40" cy="40" rx="5" ry="3.5" fill="#FBEBD7" />
            <circle cx="35" cy="35" r="2.1" fill="#271A14" />
            <circle cx="45" cy="35" r="2.1" fill="#271A14" />
            <circle cx="34.2" cy="34.2" r="0.8" fill="#FFFFFF" />
            <circle cx="44.2" cy="34.2" r="0.8" fill="#FFFFFF" />
            <circle cx="40" cy="39" r="1.7" fill="#3D2419" />
            <path d="M34 48 L40 50.5 L34 53 Z M46 48 L40 50.5 L46 53 Z" fill="#EF4444" stroke={OUTLINE} strokeWidth="1.3" />
          </g>
        );

      case 'doll_pepe_frog':
        return (
          <g>
            {/* Raised frog eye bumps */}
            <circle cx="31" cy="23" r="6.5" fill="#7AD06C" stroke={OUTLINE} strokeWidth="2" />
            <circle cx="49" cy="23" r="6.5" fill="#7AD06C" stroke={OUTLINE} strokeWidth="2" />
            <ellipse cx="40" cy="56" rx="14" ry="13" fill="#7AD06C" stroke={OUTLINE} strokeWidth="2.1" />
            <ellipse cx="40" cy="57" rx="9" ry="8.5" fill="#F7FFE8" />
            <ellipse cx="40" cy="37" rx="15" ry="13" fill="#7AD06C" stroke={OUTLINE} strokeWidth="2.1" />
            {/* Strawberry mini cap */}
            <ellipse cx="40" cy="24" rx="5.5" ry="4.5" fill="#FB7185" stroke={OUTLINE} strokeWidth="1.5" />
            <line x1="40" y1="17" x2="40" y2="20" stroke="#22C55E" strokeWidth="2.2" strokeLinecap="round" />
            {/* Frog eyes */}
            <circle cx="31" cy="23.5" r="4" fill="#FFFFFF" stroke={OUTLINE} strokeWidth="1.3" />
            <circle cx="49" cy="23.5" r="4" fill="#FFFFFF" stroke={OUTLINE} strokeWidth="1.3" />
            <circle cx="31" cy="23.5" r="2.1" fill="#1B1D24" />
            <circle cx="49" cy="23.5" r="2.1" fill="#1B1D24" />
            <ellipse cx="30" cy="38" rx="3" ry="1.8" fill="#FF8FA3" opacity="0.8" />
            <ellipse cx="50" cy="38" rx="3" ry="1.8" fill="#FF8FA3" opacity="0.8" />
            <path d="M33 38 Q40 43 47 38" stroke="#3B2A26" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          </g>
        );

      case 'doll_boba_capy':
        return (
          <g>
            <ellipse cx="26" cy="28" rx="4.2" ry="5" fill="#B8845A" stroke={OUTLINE} strokeWidth="1.8" />
            <ellipse cx="54" cy="28" rx="4.2" ry="5" fill="#B8845A" stroke={OUTLINE} strokeWidth="1.8" />
            <ellipse cx="40" cy="56" rx="14" ry="13" fill="#B8845A" stroke={OUTLINE} strokeWidth="2.1" />
            <ellipse cx="40" cy="57" rx="8.5" ry="8" fill="#F5E1C8" />
            <ellipse cx="40" cy="37" rx="14.5" ry="13" fill="#B8845A" stroke={OUTLINE} strokeWidth="2.1" />
            {/* Tangerine on head */}
            <circle cx="40" cy="20" r="5.5" fill="#FB923C" stroke={OUTLINE} strokeWidth="1.7" />
            <ellipse cx="43" cy="15" rx="3.2" ry="1.6" transform="rotate(-20 43 15)" fill="#22C55E" stroke={OUTLINE} strokeWidth="1" />
            {/* Chill capy face */}
            <ellipse cx="40" cy="40" rx="8" ry="5.5" fill="#D7A97C" stroke={OUTLINE} strokeWidth="1.4" />
            <path d="M31 34 Q34 36.5 37 34" stroke="#2D1D14" strokeWidth="1.9" fill="none" strokeLinecap="round" />
            <path d="M43 34 Q46 36.5 49 34" stroke="#2D1D14" strokeWidth="1.9" fill="none" strokeLinecap="round" />
            <circle cx="40" cy="38.5" r="1.5" fill="#4B3022" />
            <ellipse cx="30" cy="39" rx="2.4" ry="1.4" fill="#FF8BA7" opacity="0.65" />
            <ellipse cx="50" cy="39" rx="2.4" ry="1.4" fill="#FF8BA7" opacity="0.65" />
          </g>
        );

      case 'doll_lulu_sheep':
        return (
          <g>
            {/* Droopy pink ears */}
            <ellipse cx="22" cy="39" rx="4.5" ry="7.5" transform="rotate(25 22 39)" fill="#F7A8BE" stroke={OUTLINE} strokeWidth="1.8" />
            <ellipse cx="58" cy="39" rx="4.5" ry="7.5" transform="rotate(-25 58 39)" fill="#F7A8BE" stroke={OUTLINE} strokeWidth="1.8" />
            <ellipse cx="40" cy="56" rx="14" ry="13" fill="#FFF6EB" stroke={OUTLINE} strokeWidth="2.1" />
            {/* Fluffy wool cloud head */}
            <circle cx="31" cy="27" r="6" fill="#FFF8F0" stroke={OUTLINE} strokeWidth="1.8" />
            <circle cx="40" cy="24" r="6.5" fill="#FFF8F0" stroke={OUTLINE} strokeWidth="1.8" />
            <circle cx="49" cy="27" r="6" fill="#FFF8F0" stroke={OUTLINE} strokeWidth="1.8" />
            <circle cx="40" cy="36" r="13.5" fill="#FFF8F0" stroke={OUTLINE} strokeWidth="2" />
            <ellipse cx="40" cy="37.5" rx="10" ry="8.5" fill="#FFF3E6" />
            <circle cx="35.5" cy="36.5" r="2" fill="#3B282A" />
            <circle cx="44.5" cy="36.5" r="2" fill="#3B282A" />
            <circle cx="34.8" cy="35.8" r="0.7" fill="#FFFFFF" />
            <circle cx="43.8" cy="35.8" r="0.7" fill="#FFFFFF" />
            <ellipse cx="32" cy="40" rx="2.4" ry="1.3" fill="#FF8BA7" opacity="0.75" />
            <ellipse cx="48" cy="40" rx="2.4" ry="1.3" fill="#FF8BA7" opacity="0.75" />
            <circle cx="40" cy="49.5" r="3" fill="#FACC15" stroke={OUTLINE} strokeWidth="1.4" />
          </g>
        );

      case 'doll_pipi_duck':
        return (
          <g>
            <ellipse cx="40" cy="56" rx="14" ry="13" fill="#FDE047" stroke={OUTLINE} strokeWidth="2.1" />
            <ellipse cx="40" cy="57" rx="8.5" ry="8" fill="#FEF9C3" />
            <circle cx="40" cy="36" r="14.5" fill="#FDE047" stroke={OUTLINE} strokeWidth="2.1" />
            {/* Mint beret */}
            <ellipse cx="37" cy="23" rx="10" ry="5" transform="rotate(-12 37 23)" fill="#5EEAD4" stroke={OUTLINE} strokeWidth="1.8" />
            <circle cx="35" cy="18" r="1.8" fill="#0F766E" />
            {/* Eyes + Orange Bill */}
            <circle cx="34.5" cy="35" r="2.2" fill="#1F1A24" />
            <circle cx="45.5" cy="35" r="2.2" fill="#1F1A24" />
            <circle cx="33.8" cy="34.2" r="0.8" fill="#FFFFFF" />
            <circle cx="44.8" cy="34.2" r="0.8" fill="#FFFFFF" />
            <ellipse cx="31" cy="38.5" rx="2.5" ry="1.4" fill="#FF8BA7" opacity="0.7" />
            <ellipse cx="49" cy="38.5" rx="2.5" ry="1.4" fill="#FF8BA7" opacity="0.7" />
            <ellipse cx="40" cy="39.5" rx="5.2" ry="2.8" fill="#FB923C" stroke={OUTLINE} strokeWidth="1.5" />
          </g>
        );

      case 'doll_labu_mint':
        return (
          <g>
            {/* Tall Labubu ears */}
            <ellipse cx="30" cy="16" rx="5.2" ry="12.5" transform="rotate(-8 30 16)" fill="#7BE4C4" stroke={OUTLINE} strokeWidth="2" />
            <ellipse cx="30" cy="17" rx="2.6" ry="7.8" transform="rotate(-8 30 17)" fill="#FFD6E4" />
            <ellipse cx="50" cy="16" rx="5.2" ry="12.5" transform="rotate(8 50 16)" fill="#7BE4C4" stroke={OUTLINE} strokeWidth="2" />
            <ellipse cx="50" cy="17" rx="2.6" ry="7.8" transform="rotate(8 50 17)" fill="#FFD6E4" />
            <ellipse cx="40" cy="56" rx="14" ry="13" fill="#7BE4C4" stroke={OUTLINE} strokeWidth="2.1" />
            <ellipse cx="40" cy="57" rx="8.5" ry="8" fill="#FFF4E6" />
            <circle cx="40" cy="36" r="14.5" fill="#7BE4C4" stroke={OUTLINE} strokeWidth="2.1" />
            <ellipse cx="40" cy="37" rx="11.2" ry="9.8" fill="#FFF3E6" />
            {/* Crystal sparkly eyes */}
            <circle cx="34.5" cy="34" r="3" fill="#0D9488" />
            <circle cx="45.5" cy="34" r="3" fill="#0D9488" />
            <circle cx="34.5" cy="34" r="1.6" fill="#132A2A" />
            <circle cx="45.5" cy="34" r="1.6" fill="#132A2A" />
            <circle cx="33.5" cy="32.8" r="1.1" fill="#FFFFFF" />
            <circle cx="44.5" cy="32.8" r="1.1" fill="#FFFFFF" />
            {/* Labubu wide toothy grin */}
            <path d="M32 40 Q40 45 48 40" stroke="#33252C" strokeWidth="1.8" fill="none" strokeLinecap="round" />
            <polygon points="34,41 36,44.2 37.5,41.6" fill="#FFFFFF" stroke="#33252C" strokeWidth="0.7" />
            <polygon points="39,42 40,45 41,42" fill="#FFFFFF" stroke="#33252C" strokeWidth="0.7" />
            <polygon points="42.5,41.6 44,44.2 46,41" fill="#FFFFFF" stroke="#33252C" strokeWidth="0.7" />
            <circle cx="40" cy="38.2" r="1.5" fill="#FB7185" />
          </g>
        );

      case 'doll_baby3_berry':
        return (
          <g>
            <circle cx="27" cy="24" r="6" fill="#FF7FA9" stroke={OUTLINE} strokeWidth="2" />
            <circle cx="27" cy="24" r="3" fill="#FFF0F5" />
            <circle cx="53" cy="24" r="6" fill="#FF7FA9" stroke={OUTLINE} strokeWidth="2" />
            <circle cx="53" cy="24" r="3" fill="#FFF0F5" />
            <ellipse cx="40" cy="56" rx="14" ry="13" fill="#FF7FA9" stroke={OUTLINE} strokeWidth="2.1" />
            <ellipse cx="40" cy="57" rx="8.5" ry="8" fill="#FFF0F5" />
            <circle cx="40" cy="36" r="14.5" fill="#FF7FA9" stroke={OUTLINE} strokeWidth="2.1" />
            {/* Strawberry leaf crown */}
            <path d="M31 23 Q40 16 49 23 Q44 26 40 23 Q36 26 31 23 Z" fill="#4ADE80" stroke={OUTLINE} strokeWidth="1.4" />
            <ellipse cx="40" cy="37.5" rx="11" ry="9.5" fill="#FFF3E6" />
            {/* Sparkly starry eyes */}
            <circle cx="34.5" cy="36" r="3.1" fill="#BE185D" />
            <circle cx="45.5" cy="36" r="3.1" fill="#BE185D" />
            <circle cx="33.5" cy="34.8" r="1.1" fill="#FFFFFF" />
            <circle cx="44.5" cy="34.8" r="1.1" fill="#FFFFFF" />
            <circle cx="35.6" cy="37.2" r="0.6" fill="#FFFBEB" />
            <circle cx="46.6" cy="37.2" r="0.6" fill="#FFFBEB" />
            <ellipse cx="30.5" cy="40" rx="2.6" ry="1.4" fill="#FB7185" opacity="0.8" />
            <ellipse cx="49.5" cy="40" rx="2.6" ry="1.4" fill="#FB7185" opacity="0.8" />
            <circle cx="40" cy="39.2" r="1.5" fill="#F43F5E" />
            <circle cx="40" cy="50" r="2.6" fill="#F43F5E" stroke={OUTLINE} strokeWidth="1.2" />
          </g>
        );

      case 'doll_luna_kuromi':
        return (
          <g>
            {/* Jester pointed bunny ears */}
            <path d="M29 27 L23 11 L35 23 Z" fill="#241E38" stroke={OUTLINE} strokeWidth="1.8" strokeLinejoin="round" />
            <circle cx="23" cy="11" r="2.8" fill="#A78BFA" stroke={OUTLINE} strokeWidth="1.3" />
            <path d="M51 27 L57 11 L45 23 Z" fill="#241E38" stroke={OUTLINE} strokeWidth="1.8" strokeLinejoin="round" />
            <circle cx="57" cy="11" r="2.8" fill="#A78BFA" stroke={OUTLINE} strokeWidth="1.3" />
            <ellipse cx="40" cy="56" rx="14" ry="13" fill="#A78BFA" stroke={OUTLINE} strokeWidth="2.1" />
            <ellipse cx="40" cy="57" rx="8.5" ry="8" fill="#EDE9FE" />
            <circle cx="40" cy="36" r="14.5" fill="#241E38" stroke={OUTLINE} strokeWidth="2.1" />
            <circle cx="40" cy="27" r="2.6" fill="#F472B6" />
            <ellipse cx="40" cy="38" rx="10.8" ry="9" fill="#FFF3E6" />
            <circle cx="34.5" cy="37" r="2.9" fill="#7C3AED" />
            <circle cx="45.5" cy="37" r="2.9" fill="#7C3AED" />
            <circle cx="33.5" cy="35.8" r="1.1" fill="#FFFFFF" />
            <circle cx="44.5" cy="35.8" r="1.1" fill="#FFFFFF" />
            <ellipse cx="31" cy="40.8" rx="2.4" ry="1.3" fill="#F472B6" opacity="0.75" />
            <ellipse cx="49" cy="40.8" rx="2.4" ry="1.3" fill="#F472B6" opacity="0.75" />
            <circle cx="40" cy="40" r="1.4" fill="#F472B6" />
          </g>
        );

      case 'doll_secret_doraemon':
      default:
        return (
          <g>
            {/* Waving white paw */}
            <circle cx="56" cy="46" r="4.5" fill="#FFFFFF" stroke={OUTLINE} strokeWidth="1.8" />
            <circle cx="24" cy="53" r="4.2" fill="#FFFFFF" stroke={OUTLINE} strokeWidth="1.8" />
            {/* Blue Body + White Belly + 4D Pocket */}
            <ellipse cx="40" cy="56" rx="14" ry="13" fill="#1E88E5" stroke={OUTLINE} strokeWidth="2.1" />
            <circle cx="40" cy="56.5" r="9.5" fill="#FFFFFF" stroke={OUTLINE} strokeWidth="1.3" />
            <path d="M33.5 56.5 A6.5 6 0 0 0 46.5 56.5 Z" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="1.4" />
            {/* Blue Head + White Face */}
            <circle cx="40" cy="33" r="15.5" fill="#1E88E5" stroke={OUTLINE} strokeWidth="2.1" />
            <ellipse cx="40" cy="35.5" rx="12.5" ry="11" fill="#FFFFFF" stroke={OUTLINE} strokeWidth="1.3" />
            {/* Oval Eyes */}
            <ellipse cx="36" cy="27.5" rx="3.4" ry="4.3" fill="#FFFFFF" stroke={OUTLINE} strokeWidth="1.4" />
            <ellipse cx="44" cy="27.5" rx="3.4" ry="4.3" fill="#FFFFFF" stroke={OUTLINE} strokeWidth="1.4" />
            <circle cx="37" cy="28" r="1.4" fill="#1B1D24" />
            <circle cx="43" cy="28" r="1.4" fill="#1B1D24" />
            {/* Red Nose + Whiskers + Smile */}
            <circle cx="40" cy="32.5" r="2.4" fill="#E53935" stroke={OUTLINE} strokeWidth="1.2" />
            <line x1="40" y1="35" x2="40" y2="39.5" stroke={OUTLINE} strokeWidth="1.4" />
            <path d="M33 38.5 Q40 44.5 47 38.5" fill="#D32F2F" stroke={OUTLINE} strokeWidth="1.4" />
            <line x1="27" y1="33" x2="33" y2="34.5" stroke={OUTLINE} strokeWidth="1.1" />
            <line x1="26.5" y1="36" x2="33" y2="36" stroke={OUTLINE} strokeWidth="1.1" />
            <line x1="47" y1="34.5" x2="53" y2="33" stroke={OUTLINE} strokeWidth="1.1" />
            <line x1="47" y1="36" x2="53.5" y2="36" stroke={OUTLINE} strokeWidth="1.1" />
            {/* Red Collar & Gold Bell */}
            <rect x="29" y="45.5" width="22" height="3.2" rx="1.6" fill="#E53935" stroke={OUTLINE} strokeWidth="1.3" />
            <circle cx="40" cy="48.5" r="3.2" fill="#FFD54F" stroke={OUTLINE} strokeWidth="1.4" />
          </g>
        );
    }
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      {renderDoll()}
    </svg>
  );
};
