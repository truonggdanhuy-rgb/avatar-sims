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
            {/* Floating pink hearts */}
            <path d="M16 20 C16 18 19 17.5 19.5 19.8 C20 17.5 23 18 23 20 C23 22 19.5 24 19.5 24 C19.5 24 16 22 16 20 Z" fill="#FF4D8D" opacity="0.9" />
            <path d="M58 18 C58 16.5 60.5 16 61 17.8 C61.5 16 64 16.5 64 18 C64 19.6 61 21.2 61 21.2 C61 21.2 58 19.6 58 18 Z" fill="#FB7185" opacity="0.85" />
            <path d="M60 35 C60 33.8 62 33.4 62.4 34.8 C62.8 33.4 64.8 33.8 64.8 35 C64.8 36.2 62.4 37.6 62.4 37.6 C62.4 37.6 60 36.2 60 35 Z" fill="#F472B6" opacity="0.8" />
            {/* Plush ears + satin ear bows */}
            <circle cx="26" cy="24" r="6.2" fill="#FF6B9D" stroke={OUTLINE} strokeWidth="2" />
            <circle cx="26" cy="24" r="3.2" fill="#FFF8FB" />
            <circle cx="54" cy="24" r="6.2" fill="#FF6B9D" stroke={OUTLINE} strokeWidth="2" />
            <circle cx="54" cy="24" r="3.2" fill="#FFF8FB" />
            <path d="M22 28 L27 30 L24 33 Z" fill="#FB7185" stroke={OUTLINE} strokeWidth="1.1" strokeLinejoin="round" />
            <path d="M58 28 L53 30 L56 33 Z" fill="#FB7185" stroke={OUTLINE} strokeWidth="1.1" strokeLinejoin="round" />
            {/* Body + heart patch */}
            <ellipse cx="40" cy="56.5" rx="14" ry="12.8" fill="#FF6B9D" stroke={OUTLINE} strokeWidth="2.1" />
            <ellipse cx="40" cy="57.5" rx="8.8" ry="8" fill="#FFF5F8" />
            <path d="M36.5 56 C36.5 54 39.5 53.5 40 55.6 C40.5 53.5 43.5 54 43.5 56 C43.5 58 40 60 40 60 C40 60 36.5 58 36.5 56 Z" fill="#FDA4AF" />
            {/* Cream scalloped lace collar */}
            <circle cx="32" cy="49" r="3" fill="#FFF8FB" stroke={OUTLINE} strokeWidth="1.3" />
            <circle cx="36" cy="50" r="3" fill="#FFF8FB" stroke={OUTLINE} strokeWidth="1.3" />
            <circle cx="44" cy="50" r="3" fill="#FFF8FB" stroke={OUTLINE} strokeWidth="1.3" />
            <circle cx="48" cy="49" r="3" fill="#FFF8FB" stroke={OUTLINE} strokeWidth="1.3" />
            {/* Strawberry hood + seeds + whipped lace frame */}
            <circle cx="40" cy="36" r="14.8" fill="#FF6B9D" stroke={OUTLINE} strokeWidth="2.1" />
            <ellipse cx="32" cy="27" rx="0.9" ry="1.4" fill="#FDE047" />
            <ellipse cx="48" cy="27" rx="0.9" ry="1.4" fill="#FDE047" />
            <ellipse cx="40" cy="37.5" rx="11.4" ry="9.8" fill="#FFF7FA" stroke="#FFF0F5" strokeWidth="2.2" strokeDasharray="3 1.5" />
            {/* Berry leaf crown + blossom */}
            <path d="M30 22.5 Q40 15.5 50 22.5 Q45 25.5 40 22.5 Q35 25.5 30 22.5 Z" fill="#4ADE80" stroke={OUTLINE} strokeWidth="1.4" />
            <circle cx="45" cy="19.5" r="2.8" fill="#FFFBEB" stroke={OUTLINE} strokeWidth="1.1" />
            <circle cx="45" cy="19.5" r="1.1" fill="#FDE047" />
            {/* Sparkly starry eyes + blush */}
            <circle cx="34.5" cy="36" r="3.2" fill="#E11D63" />
            <circle cx="45.5" cy="36" r="3.2" fill="#E11D63" />
            <circle cx="33.5" cy="34.8" r="1.15" fill="#FFFFFF" />
            <circle cx="44.5" cy="34.8" r="1.15" fill="#FFFFFF" />
            <circle cx="35.6" cy="37.3" r="0.65" fill="#FFFBEB" />
            <circle cx="46.6" cy="37.3" r="0.65" fill="#FFFBEB" />
            <ellipse cx="30.5" cy="40.2" rx="2.6" ry="1.4" fill="#FB7185" opacity="0.8" />
            <ellipse cx="49.5" cy="40.2" rx="2.6" ry="1.4" fill="#FB7185" opacity="0.8" />
            <circle cx="40" cy="39.2" r="1.4" fill="#F43F5E" />
            {/* Neck ribbon + sculpted heart pendant */}
            <path d="M35 48 L40 50 L35 52 Z M45 48 L40 50 L45 52 Z" fill="#FB7185" stroke={OUTLINE} strokeWidth="1.1" />
            <path d="M37 50.5 C37 49 39.5 48.5 40 50.2 C40.5 48.5 43 49 43 50.5 C43 52.3 40 54 40 54 C40 54 37 52.3 37 50.5 Z" fill="#F43F5E" stroke={OUTLINE} strokeWidth="1.1" />
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
            {/* Tiny angel wings */}
            <ellipse cx="23" cy="53" rx="6" ry="3.8" transform="rotate(-24 23 53)" fill="#FFFFFF" stroke={OUTLINE} strokeWidth="1.5" />
            <ellipse cx="57" cy="53" rx="6" ry="3.8" transform="rotate(24 57 53)" fill="#FFFFFF" stroke={OUTLINE} strokeWidth="1.5" />
            {/* Big floppy cloud ears */}
            <ellipse cx="18" cy="40" rx="6.8" ry="11.5" transform="rotate(22 18 40)" fill="#F5FAFF" stroke={OUTLINE} strokeWidth="2" />
            <ellipse cx="18.5" cy="40.5" rx="3.4" ry="7.2" transform="rotate(22 18.5 40.5)" fill="#7DD3FC" />
            <ellipse cx="62" cy="40" rx="6.8" ry="11.5" transform="rotate(-22 62 40)" fill="#F5FAFF" stroke={OUTLINE} strokeWidth="2" />
            <ellipse cx="61.5" cy="40.5" rx="3.4" ry="7.2" transform="rotate(-22 61.5 40.5)" fill="#7DD3FC" />
            {/* Waving white paw */}
            <circle cx="57" cy="46" r="4.3" fill="#FFFFFF" stroke={OUTLINE} strokeWidth="1.8" />
            <circle cx="57" cy="46" r="1.6" fill="#FDA4AF" />
            <circle cx="24" cy="56" r="4" fill="#FFFFFF" stroke={OUTLINE} strokeWidth="1.8" />
            {/* Cloud-white Body + Sky Belly Heart */}
            <ellipse cx="40" cy="56.5" rx="13.5" ry="12.5" fill="#F5FAFF" stroke={OUTLINE} strokeWidth="2.1" />
            <ellipse cx="40" cy="57.5" rx="8.5" ry="7.8" fill="#E0F2FE" />
            <path d="M36.5 56.5 C36.5 54.5 39.5 54 40 56 C40.5 54 43.5 54.5 43.5 56.5 C43.5 58.4 40 60.4 40 60.4 C40 60.4 36.5 58.4 36.5 56.5 Z" fill="#7DD3FC" />
            {/* Wide Kawaii Puppy Head */}
            <ellipse cx="40" cy="34.5" rx="16.5" ry="13.2" fill="#F5FAFF" stroke={OUTLINE} strokeWidth="2.1" />
            {/* Golden Angel Crown */}
            <path d="M32 22 L34 15 L37.5 19 L40 13.5 L42.5 19 L46 15 L48 22 Z" fill="#FBBF24" stroke={OUTLINE} strokeWidth="1.5" strokeLinejoin="round" />
            <circle cx="40" cy="19.5" r="1.6" fill="#0284C7" />
            {/* Ear bows */}
            <path d="M22 30 L26.5 31.5 L23.5 34.5 Z" fill="#38BDF8" stroke={OUTLINE} strokeWidth="1.1" strokeLinejoin="round" />
            <path d="M58 30 L53.5 31.5 L56.5 34.5 Z" fill="#38BDF8" stroke={OUTLINE} strokeWidth="1.1" strokeLinejoin="round" />
            {/* Sky-Blue Starry Eyes + Blush + Puppy Smile */}
            <ellipse cx="33" cy="34.5" rx="2.7" ry="3.2" fill="#0284C7" />
            <ellipse cx="47" cy="34.5" rx="2.7" ry="3.2" fill="#0284C7" />
            <circle cx="32.2" cy="33.4" r="1.1" fill="#FFFFFF" />
            <circle cx="46.2" cy="33.4" r="1.1" fill="#FFFFFF" />
            <circle cx="33.8" cy="35.6" r="0.6" fill="#FFFBEB" />
            <circle cx="47.8" cy="35.6" r="0.6" fill="#FFFBEB" />
            <ellipse cx="29" cy="38.5" rx="2.8" ry="1.5" fill="#FDA4AF" opacity="0.85" />
            <ellipse cx="51" cy="38.5" rx="2.8" ry="1.5" fill="#FDA4AF" opacity="0.85" />
            <circle cx="40" cy="36.5" r="1.4" fill="#F47296" />
            <path d="M37 39 Q38.5 41 40 39 Q41.5 41 43 39" stroke={OUTLINE} strokeWidth="1.3" fill="none" strokeLinecap="round" />
            {/* Sky Ribbon Bow & Golden Bell */}
            <path d="M33 46 L40 48.5 L33 51 Z M47 46 L40 48.5 L47 51 Z" fill="#38BDF8" stroke={OUTLINE} strokeWidth="1.2" strokeLinejoin="round" />
            <circle cx="40" cy="49.5" r="2.6" fill="#FBBF24" stroke={OUTLINE} strokeWidth="1.2" />
            {/* Sparkles */}
            <path d="M62 20 L63 22.5 L65.5 23.5 L63 24.5 L62 27 L61 24.5 L58.5 23.5 L61 22.5 Z" fill="#FBBF24" />
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
