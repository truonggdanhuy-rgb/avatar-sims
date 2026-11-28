import React from 'react';
import {AvatarConfig, ShopCategory} from '../types/game';

interface GarmentPreviewProps {
  category: ShopCategory;
  patch: Partial<AvatarConfig>;
  size?: number;
}

function shade(hex: string, amount: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const num = parseInt(clean, 16);
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xff) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export const GarmentPreview: React.FC<GarmentPreviewProps> = ({
  category,
  patch,
  size = 76,
}) => {
  const outline = '#4A3525';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="select-none"
    >
      {/* 1. ÁO */}
      {category === 'tops' && (() => {
        const col = patch.topColor || '#E57A6B';
        const dark = shade(col, -26);
        const light = shade(col, 24);
        const style = patch.top || 'cardigan_vest';

        if (style === 'hoodie') {
          return (
            <g>
              {/* Big Plush Back Hood & Collar */}
              <path d="M23 24 C22 10, 58 10, 57 24 L52 30 H28 Z" fill={dark} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M28 21 C31 15, 49 15, 52 21" stroke={light} strokeWidth="2.2" strokeLinecap="round" fill="none" />
              {/* Wide Oversized Boxy Sleeves & Body */}
              <path d="M22 23 L8 39 L16 46 L23 36 V65 H57 V36 L64 46 L72 39 L58 23 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              {/* Ribbed Hem */}
              <path d="M24 61 H56" stroke={dark} strokeWidth="3.2" strokeLinecap="round" />
              {/* Kangaroo Pocket */}
              <path d="M30 47 H50 L54 58 H26 Z" fill={light} stroke={outline} strokeWidth="1.6" strokeLinejoin="round" />
              {/* Drawstrings + Aglets */}
              <path d="M35 26 V37 M45 26 V37" stroke="#FFFDF8" strokeWidth="2.1" strokeLinecap="round" />
              <circle cx="35" cy="38" r="1.3" fill={dark} />
              <circle cx="45" cy="38" r="1.3" fill={dark} />
            </g>
          );
        }

        if (style === 'knit_sweater') {
          return (
            <g>
              <path d="M25 22 L12 40 L20 46 L26 35 V64 H54 V35 L60 46 L68 40 L55 22 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M32 22 Q40 30 48 22" stroke="#FFFDF8" strokeWidth="3.2" fill="none" strokeLinecap="round" />
              <path d="M27 59 H53" stroke={dark} strokeWidth="2.5" strokeLinecap="round" />
              <path d="M31 40 Q40 43 49 40" stroke={light} strokeWidth="2" fill="none" strokeLinecap="round" />
            </g>
          );
        }

        if (style === 'sailor_blouse') {
          return (
            <g>
              <path d="M25 22 L13 38 L21 43 L27 34 V63 H53 V34 L59 43 L67 38 L55 22 Z" fill="#FFFDF8" stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M25 22 L40 37 L55 22 L50 20 L40 29 L30 20 Z" fill={col} stroke={outline} strokeWidth="2" strokeLinejoin="round" />
              <path d="M35 35 L40 38 L45 35 L44 43 L40 39 L36 43 Z" fill="#E65C65" stroke={outline} strokeWidth="1.5" strokeLinejoin="round" />
            </g>
          );
        }

        if (style === 'sundress') {
          return (
            <g>
              <rect x="27" y="16" width="5" height="12" rx="2" fill={col} stroke={outline} strokeWidth="1.8" />
              <rect x="48" y="16" width="5" height="12" rx="2" fill={col} stroke={outline} strokeWidth="1.8" />
              <path d="M24 26 H56 L58 63 H22 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M25 39 Q40 44 55 39" stroke="#FFFDF8" strokeWidth="2.2" fill="none" />
            </g>
          );
        }

        if (style === 'office_male') {
          return (
            <g>
              {/* Crisp White Dress Shirt */}
              <path
                d="M25 22 L12 40 L20 45 L27 34 V64 H53 V34 L60 45 L68 40 L55 22 Z"
                fill="#FFFFFF"
                stroke={outline}
                strokeWidth="2.2"
                strokeLinejoin="round"
              />
              {/* Structured Dress Collar */}
              <path d="M31 22 L38 30 L34 33 L27 25 Z" fill="#F1F5F9" stroke={outline} strokeWidth="1.7" strokeLinejoin="round" />
              <path d="M49 22 L42 30 L46 33 L53 25 Z" fill="#F1F5F9" stroke={outline} strokeWidth="1.7" strokeLinejoin="round" />
              {/* Tailored Necktie + Windsor Knot + Silver Tie Clip */}
              <path d="M37 25 H43 L42 31 H38 Z" fill="#1F3456" stroke={outline} strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M38.5 31 H41.5 L44 53 L40 58 L36 53 Z" fill="#1F3456" stroke={outline} strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M37 42 H43.5" stroke="#DCE2EA" strokeWidth="2" strokeLinecap="round" />
            </g>
          );
        }

        if (style === 'office_female') {
          return (
            <g>
              {/* Waist-Cinching Fitted Feminine Blouse */}
              <path
                d="M27 22 L15 39 L22 44 L28 34 C29 44, 31 50, 29 63 H51 C49 50, 51 44, 52 34 L58 44 L65 39 L53 22 Z"
                fill="#FFFFFF"
                stroke={outline}
                strokeWidth="2.2"
                strokeLinejoin="round"
              />
              {/* Crisp V-Neck Collar & Feminine Bust Contour */}
              <path d="M34 22 L40 33 L46 22 Z" fill="#FDE2CC" stroke={outline} strokeWidth="1.6" strokeLinejoin="round" />
              <path d="M31 22 L36 32 L32 34 L28 25 Z" fill="#F1F5F9" stroke={outline} strokeWidth="1.6" strokeLinejoin="round" />
              <path d="M49 22 L44 32 L48 34 L52 25 Z" fill="#F1F5F9" stroke={outline} strokeWidth="1.6" strokeLinejoin="round" />
              <path d="M30 41 Q35 44 39 40 M41 40 Q45 44 50 41" stroke="#CBD5E1" strokeWidth="1.6" strokeLinecap="round" fill="none" />
              <circle cx="40" cy="41" r="1.4" fill="#94A3B8" />
              <circle cx="40" cy="49" r="1.4" fill="#94A3B8" />
              <circle cx="40" cy="57" r="1.4" fill="#94A3B8" />
            </g>
          );
        }

        if (style === 'varsity_jacket') {
          return (
            <g>
              {/* Contrast Sleeves */}
              <path d="M24 22 L11 39 L19 45 L26 35 V63 H54 V35 L61 45 L69 39 L56 22 Z" fill="#FAF4E8" stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              {/* Jacket Body */}
              <path d="M25 22 H55 V63 H25 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              {/* Striped Collar & Hem & Cuffs */}
              <path d="M32 22 Q40 27 48 22" stroke="#FAF4E8" strokeWidth="2.8" fill="none" strokeLinecap="round" />
              <path d="M26 60 H54" stroke={dark} strokeWidth="3.2" strokeLinecap="round" />
              <path d="M26 60 H54" stroke="#FAF4E8" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M13 38 L19 43 M67 38 L61 43" stroke={col} strokeWidth="3" strokeLinecap="round" />
              {/* Snap Placket & Snaps */}
              <line x1="40" y1="25" x2="40" y2="61" stroke={dark} strokeWidth="2.4" />
              {[31, 39, 47, 55].map((sy) => (
                <circle key={sy} cx="40" cy={sy} r="1.4" fill="#FFFFFF" />
              ))}
              {/* Pocket Welts + Varsity B Patch */}
              <path d="M29 48 L33 55 M51 48 L47 55" stroke="#FAF4E8" strokeWidth="2" strokeLinecap="round" />
              <text x="48" y="39" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="900" fontFamily="Georgia, serif">B</text>
            </g>
          );
        }

        if (style === 'raglan_clover') {
          return (
            <g>
              <path d="M25 22 L11 35 L18 42 L26 34 V63 H54 V34 L62 42 L69 35 L55 22 Z" fill="#FAF4E8" stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              {/* Raglan Sleeves & Neck */}
              <path d="M25 22 L11 35 L18 42 L26 34 L33 22 Z" fill={col} stroke={outline} strokeWidth="2" strokeLinejoin="round" />
              <path d="M55 22 L69 35 L62 42 L54 34 L47 22 Z" fill={col} stroke={outline} strokeWidth="2" strokeLinejoin="round" />
              <path d="M33 22 Q40 27 47 22" stroke={col} strokeWidth="3" fill="none" strokeLinecap="round" />
              {/* 4-Leaf Clover */}
              <circle cx="37.5" cy="40.5" r="3" fill={col} />
              <circle cx="42.5" cy="40.5" r="3" fill={col} />
              <circle cx="37.5" cy="45.2" r="3" fill={col} />
              <circle cx="42.5" cy="45.2" r="3" fill={col} />
              <path d="M40 46 Q41 50 42 52" stroke={col} strokeWidth="1.8" strokeLinecap="round" fill="none" />
            </g>
          );
        }

        if (style === 'star_sweater') {
          return (
            <g>
              <path d="M25 22 L12 40 L20 46 L26 35 V64 H54 V35 L60 46 L68 40 L55 22 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M32 22 Q40 28 48 22" stroke={dark} strokeWidth="3" fill="none" strokeLinecap="round" />
              <path d="M27 60 H53" stroke={dark} strokeWidth="2.8" strokeLinecap="round" />
              {/* Golden Star Emblem */}
              <polygon
                points="46,34 47.9,38 52.2,38.4 48.9,41.2 49.9,45.5 46,43.2 42.1,45.5 43.1,41.2 39.8,38.4 44.1,38"
                fill="#E8B954"
                stroke={outline}
                strokeWidth="1.1"
                strokeLinejoin="round"
              />
            </g>
          );
        }

        if (style === 'ribbon_blouse') {
          return (
            <g>
              <path d="M25 22 L13 36 L20 42 L27 33 V63 H53 V33 L60 42 L67 36 L55 22 Z" fill="#FFFFFF" stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M32 22 L38 29 L33 32 L28 24 Z" fill="#F1F5F9" stroke={outline} strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M48 22 L42 29 L47 32 L52 24 Z" fill="#F1F5F9" stroke={outline} strokeWidth="1.5" strokeLinejoin="round" />
              <circle cx="40" cy="43" r="1.3" fill="#CBD5E1" />
              <circle cx="40" cy="51" r="1.3" fill="#CBD5E1" />
              <circle cx="40" cy="58" r="1.3" fill="#CBD5E1" />
              {/* Red Bow */}
              <path d="M40 31 L31 26 L32 35 Z" fill={col} stroke={outline} strokeWidth="1.4" strokeLinejoin="round" />
              <path d="M40 31 L49 26 L48 35 Z" fill={col} stroke={outline} strokeWidth="1.4" strokeLinejoin="round" />
              <path d="M38 33 L35 42 M42 33 L45 42" stroke={col} strokeWidth="2.8" strokeLinecap="round" />
              <circle cx="40" cy="31" r="2.6" fill={dark} stroke={outline} strokeWidth="1.3" />
            </g>
          );
        }

        if (style === 'pinafore_dress') {
          return (
            <g>
              {/* White Tee Base */}
              <path d="M25 22 L13 36 L20 42 L27 33 V60 H53 V33 L60 42 L67 36 L55 22 Z" fill="#FFFFFF" stroke={outline} strokeWidth="2.1" strokeLinejoin="round" />
              {/* Yellow Overall Pinafore + Flared Skirt */}
              <rect x="29" y="21" width="4.5" height="12" rx="1.8" fill={col} stroke={outline} strokeWidth="1.6" />
              <rect x="46.5" y="21" width="4.5" height="12" rx="1.8" fill={col} stroke={outline} strokeWidth="1.6" />
              <path d="M27 30 H53 L55 44 L61 65 H19 L25 44 Z" fill={col} stroke={outline} strokeWidth="2.1" strokeLinejoin="round" />
              <rect x="33" y="36" width="14" height="9" rx="2" fill={light} stroke={outline} strokeWidth="1.4" />
              <circle cx="31.2" cy="32" r="1.5" fill="#E3B04B" stroke={outline} strokeWidth="0.9" />
              <circle cx="48.8" cy="32" r="1.5" fill="#E3B04B" stroke={outline} strokeWidth="0.9" />
            </g>
          );
        }

        if (style === 'bunny_hoodie') {
          return (
            <g>
              <path d="M23 24 C22 10, 58 10, 57 24 L52 30 H28 Z" fill={dark} stroke={outline} strokeWidth="2.1" strokeLinejoin="round" />
              <path d="M22 23 L8 39 L16 46 L23 36 V65 H57 V36 L64 46 L72 39 L58 23 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M24 61 H56" stroke={dark} strokeWidth="3" strokeLinecap="round" />
              <path d="M30 49 H50 L53 58 H27 Z" fill={light} stroke={outline} strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M35 25 V34 M45 25 V34" stroke="#FFFFFF" strokeWidth="1.9" strokeLinecap="round" />
              {/* Bunny Emblem */}
              <ellipse cx="37.5" cy="35" rx="1.8" ry="4.5" fill="#FFFFFF" stroke={outline} strokeWidth="1.2" />
              <ellipse cx="42.5" cy="35" rx="1.8" ry="4.5" fill="#FFFFFF" stroke={outline} strokeWidth="1.2" />
              <ellipse cx="40" cy="41.5" rx="5.8" ry="4.6" fill="#FFFFFF" stroke={outline} strokeWidth="1.3" />
              <circle cx="38.2" cy="41" r="0.8" fill={outline} />
              <circle cx="41.8" cy="41" r="0.8" fill={outline} />
              <circle cx="40" cy="42.6" r="0.9" fill="#F5A2B8" />
            </g>
          );
        }

        if (style === 'zip_parka') {
          return (
            <g>
              <path d="M23 24 C22 10, 58 10, 57 24 L52 30 H28 Z" fill={dark} stroke={outline} strokeWidth="2.1" strokeLinejoin="round" />
              <path d="M22 23 L9 39 L17 45 L24 35 V64 H56 V35 L63 45 L71 39 L58 23 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M25 61 H55" stroke="#FFFFFF" strokeWidth="3.2" strokeLinecap="round" />
              <path d="M11 38 L17 43 M69 38 L63 43" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round" />
              <line x1="40" y1="24" x2="40" y2="62" stroke="#E2E8F0" strokeWidth="2.1" />
              <rect x="27" y="48" width="8" height="8" rx="2" fill={light} stroke="#FFFFFF" strokeWidth="1.5" />
              <rect x="45" y="48" width="8" height="8" rx="2" fill={light} stroke="#FFFFFF" strokeWidth="1.5" />
            </g>
          );
        }

        if (style === 'safari_shirt') {
          return (
            <g>
              <path d="M25 22 L12 36 L19 42 L26 33 V63 H54 V33 L61 42 L68 36 L55 22 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M32 22 L38 29 L33 32 L28 24 Z" fill={light} stroke={outline} strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M48 22 L42 29 L47 32 L52 24 Z" fill={light} stroke={outline} strokeWidth="1.5" strokeLinejoin="round" />
              <line x1="40" y1="27" x2="40" y2="62" stroke={dark} strokeWidth="1.6" />
              <rect x="29" y="38" width="8" height="8" rx="1.5" fill={light} stroke={outline} strokeWidth="1.4" />
              <rect x="43" y="38" width="8" height="8" rx="1.5" fill={light} stroke={outline} strokeWidth="1.4" />
              <path d="M29 40 H37 M43 40 H51" stroke={dark} strokeWidth="2" />
            </g>
          );
        }

        if (style === 'sport_raglan') {
          return (
            <g>
              <path d="M25 22 L11 35 L18 42 L26 34 V63 H54 V34 L62 42 L69 35 L55 22 Z" fill="#FFFFFF" stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M25 22 L11 35 L18 42 L26 34 L33 22 Z" fill={col} stroke={outline} strokeWidth="2" strokeLinejoin="round" />
              <path d="M55 22 L69 35 L62 42 L54 34 L47 22 Z" fill={col} stroke={outline} strokeWidth="2" strokeLinejoin="round" />
              <path d="M33 22 Q40 27 47 22" stroke={col} strokeWidth="3" fill="none" strokeLinecap="round" />
              <polygon
                points="40,34 42.3,38.9 47.6,39.5 43.6,43 44.8,48.2 40,45.5 35.2,48.2 36.4,43 32.4,39.5 37.7,38.9"
                fill={col}
                stroke={outline}
                strokeWidth="1.1"
                strokeLinejoin="round"
              />
            </g>
          );
        }

        if (style === 'casual_shirt') {
          return (
            <g>
              <path d="M25 22 L12 36 L19 42 L26 33 V63 H54 V33 L61 42 L68 36 L55 22 Z" fill="#FFFFFF" stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M32 22 L38 29 L33 32 L28 24 Z" fill="#F1F5F9" stroke={outline} strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M48 22 L42 29 L47 32 L52 24 Z" fill="#F1F5F9" stroke={outline} strokeWidth="1.5" strokeLinejoin="round" />
              <line x1="40" y1="27" x2="40" y2="62" stroke="#CBD5E1" strokeWidth="1.6" />
              <circle cx="40" cy="36" r="1.2" fill="#94A3B8" />
              <circle cx="40" cy="45" r="1.2" fill="#94A3B8" />
              <circle cx="40" cy="54" r="1.2" fill="#94A3B8" />
              <rect x="44" y="38" width="6.5" height="7" rx="1.2" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1.3" />
            </g>
          );
        }

        if (style === 'panda_pajama') {
          return (
            <g>
              <path d="M25 21 L12 39 L19 45 L26 34 V63 H54 V34 L61 45 L68 39 L55 21 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M32 21 L39 29 L30 31 L27 23 Z M48 21 L41 29 L50 31 L53 23 Z" fill="#FFFFFF" stroke={outline} strokeWidth="1.5" strokeLinejoin="round" />
              <line x1="40" y1="28" x2="40" y2="62" stroke="#FFFFFF" strokeWidth="3.2" />
              {/* Mini Panda motifs */}
              {[
                [31, 41],
                [49, 43],
                [32, 54],
                [48, 55],
              ].map(([px, py]) => (
                <g key={`${px}-${py}`}>
                  <circle cx={px - 2.6} cy={py - 2.6} r="1.4" fill="#2A2224" />
                  <circle cx={px + 2.6} cy={py - 2.6} r="1.4" fill="#2A2224" />
                  <circle cx={px} cy={py} r="3.6" fill="#FFFFFF" />
                  <circle cx={px - 1.3} cy={py - 0.3} r="0.9" fill="#2A2224" />
                  <circle cx={px + 1.3} cy={py - 0.3} r="0.9" fill="#2A2224" />
                </g>
              ))}
              <circle cx="40" cy="36" r="1.3" fill={dark} />
              <circle cx="40" cy="46" r="1.3" fill={dark} />
              <circle cx="40" cy="56" r="1.3" fill={dark} />
            </g>
          );
        }

        if (style === 'denim_overalls') {
          return (
            <g>
              <path d="M25 18 L13 36 L19 41 L26 31 V44 H54 V31 L61 41 L67 36 L55 18 Z" fill="#FFFFFF" stroke={outline} strokeWidth="2.1" strokeLinejoin="round" />
              <path d="M28 28 H52 V45 L55 66 H43 L40 49 L37 66 H25 L28 45 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M31 19 V29 M49 19 V29" stroke={col} strokeWidth="4" strokeLinecap="round" />
              <circle cx="31" cy="30" r="1.6" fill="#F2C14E" />
              <circle cx="49" cy="30" r="1.6" fill="#F2C14E" />
              <rect x="34" y="34" width="12" height="8" rx="1.5" fill={shade(col, -12)} stroke={outline} strokeWidth="1.2" />
            </g>
          );
        }

        if (style === 'puffer_jacket') {
          return (
            <g>
              <path d="M25 22 L12 40 L20 46 L26 35 V63 H54 V35 L60 46 L68 40 L55 22 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M29 22 Q40 28 51 22 L46 31 H34 Z" fill="#2B7A4B" stroke={outline} strokeWidth="1.6" strokeLinejoin="round" />
              <path d="M26 35 H54 M26 45 H54 M26 54 H54" stroke={dark} strokeWidth="2" />
              <line x1="40" y1="27" x2="40" y2="62" stroke="#FFFFFF" strokeWidth="3" />
            </g>
          );
        }

        if (
          style === 'coin_tunic' ||
          style === 'ao_dai_lotus' ||
          style === 'ao_dai_peach' ||
          style === 'ao_dai_white' ||
          style === 'ao_dai_nam'
        ) {
          const isNam = style === 'ao_dai_nam';
          const isWhite = style === 'ao_dai_white';
          const trimCol = isWhite ? '#E6EDF8' : '#F4C95D';
          return (
            <g>
              {/* Back Tà peeking behind */}
              <path d="M27 42 H53 L58 69 H22 Z" fill={shade(col, -28)} stroke={outline} strokeWidth="1.9" strokeLinejoin="round" />
              {/* Fitted Áo Dài Bodice + Long Sleeves + Curved Slit Front Tà */}
              <path
                d={
                  isNam
                    ? 'M26 20 L11 39 L18 45 L26 32 V40 L23 68 H57 L54 40 V32 L62 45 L69 39 L54 20 Z'
                    : 'M27 20 L12 39 L19 45 L27 32 C28 38, 30 41, 29 44 L24 68 H56 L51 44 C50 41, 52 38, 53 32 L61 45 L68 39 L53 20 Z'
                }
                fill={col}
                stroke={outline}
                strokeWidth="2.1"
                strokeLinejoin="round"
              />
              {/* Raglan Shoulder Seams */}
              <path d="M33 21 L27 32 M47 21 L53 32" stroke={shade(col, -32)} strokeWidth="1.4" strokeLinecap="round" />
              {/* Standing Cổ Tàu Collar */}
              <rect x="33" y="14" width="14" height="7" rx="2.5" fill={col} stroke={trimCol} strokeWidth="1.7" />
              {/* Diagonal Tà Chéo + Frog Buttons */}
              <path d="M40 21 L49 29 V41" stroke={trimCol} strokeWidth="1.7" fill="none" strokeLinecap="round" />
              <circle cx="43.5" cy="24.5" r="1.2" fill={trimCol} />
              <circle cx="48.5" cy="29.5" r="1.2" fill={trimCol} />
              <circle cx="48.5" cy="36" r="1.2" fill={trimCol} />
              {/* Bottom Tà Trim */}
              <path d="M25 65 H55" stroke={trimCol} strokeWidth="2.2" strokeLinecap="round" />
              {/* Style Motifs */}
              {style === 'coin_tunic' &&
                [
                  [33, 49],
                  [46, 54],
                  [34, 59],
                ].map(([cx, cy]) => (
                  <g key={`${cx}-${cy}`}>
                    <circle cx={cx} cy={cy} r="3.4" fill="#F7CA44" stroke="#B77914" strokeWidth="1" />
                    <rect x={cx - 1.1} y={cy - 1.1} width="2.2" height="2.2" fill={col} />
                  </g>
                ))}
              {style === 'ao_dai_lotus' && (
                <g transform="translate(40,54)">
                  <ellipse cx="0" cy="-4" rx="2.6" ry="5" fill="#FFF2F6" stroke="#C86D88" strokeWidth="0.9" />
                  <ellipse cx="-4" cy="-2" rx="2.2" ry="4.4" transform="rotate(-28 -4 -2)" fill="#F9B5C9" stroke="#C86D88" strokeWidth="0.9" />
                  <ellipse cx="4" cy="-2" rx="2.2" ry="4.4" transform="rotate(28 4 -2)" fill="#F9B5C9" stroke="#C86D88" strokeWidth="0.9" />
                  <path d="M-6 3 Q0 6 6 3" stroke="#539D63" strokeWidth="2" strokeLinecap="round" fill="none" />
                </g>
              )}
              {style === 'ao_dai_peach' && (
                <g>
                  <path d="M31 61 Q39 51 48 45" stroke="#68432A" strokeWidth="1.6" fill="none" strokeLinecap="round" />
                  <circle cx="37" cy="54" r="3" fill="#FFA6BE" stroke="#C95978" strokeWidth="0.9" />
                  <circle cx="45" cy="48" r="2.7" fill="#FFBBD0" stroke="#C95978" strokeWidth="0.9" />
                  <circle cx="42" cy="57" r="2.5" fill="#FF92B0" stroke="#C95978" strokeWidth="0.9" />
                </g>
              )}
              {style === 'ao_dai_white' && (
                <path d="M35 37 Q40 42 45 37" stroke="#DCE5F2" strokeWidth="1.6" fill="none" strokeLinecap="round" />
              )}
              {style === 'ao_dai_nam' && (
                <g>
                  <circle cx="40" cy="52" r="5.5" fill="none" stroke="#F4C95D" strokeWidth="1.6" />
                  <path d="M37.5 49.5 H42.5 M40 47.5 V56.5 M37.5 54.5 H42.5" stroke="#F4C95D" strokeWidth="1.2" />
                </g>
              )}
            </g>
          );
        }

        if (style === 'lolita_dress') {
          return (
            <g>
              <path d="M27 21 L14 35 L22 41 L28 31 L20 65 H60 L52 31 L58 41 L66 35 L53 21 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M31 22 L40 34 L49 22 Z" fill="#FFFDF8" stroke={outline} strokeWidth="1.5" />
              <path d="M22 61 Q31 66 40 61 Q49 66 58 61" stroke="#FFFDF8" strokeWidth="3.2" fill="none" strokeLinecap="round" />
              <path d="M40 36 L34 33 L35 39 Z M40 36 L46 33 L45 39 Z" fill="#FFFDF8" stroke={outline} strokeWidth="1.2" />
            </g>
          );
        }

        if (style === 'trench_coat') {
          return (
            <g>
              <path d="M25 20 L11 39 L19 45 L26 34 L22 67 H58 L54 34 L61 45 L69 39 L55 20 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M30 20 L38 33 L32 36 L26 24 Z M50 20 L42 33 L48 36 L54 24 Z" fill={shade(col, -16)} stroke={outline} strokeWidth="1.6" />
              <rect x="25" y="42" width="30" height="4.5" rx="1.5" fill={shade(col, -28)} stroke={outline} strokeWidth="1.4" />
              <rect x="37" y="41.5" width="6" height="5.5" rx="1" fill="#E3B34C" stroke={outline} strokeWidth="1.1" />
              <circle cx="35" cy="36" r="1.4" fill="#4A3525" />
              <circle cx="45" cy="36" r="1.4" fill="#4A3525" />
              <circle cx="35" cy="52" r="1.4" fill="#4A3525" />
              <circle cx="45" cy="52" r="1.4" fill="#4A3525" />
            </g>
          );
        }

        if (style === 'academy_blazer') {
          return (
            <g>
              <path d="M25 22 L12 39 L19 45 L26 34 V64 H54 V34 L61 45 L68 39 L55 22 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M33 22 L40 38 L47 22 Z" fill="#FFFFFF" stroke={outline} strokeWidth="1.5" />
              <path d="M37 25 L40 37 L43 25 Z" fill="#C94557" />
              <path d="M31 22 L38 35 L33 37 L27 25 Z M49 22 L42 35 L47 37 L53 25 Z" fill={dark} stroke={outline} strokeWidth="1.4" />
              <circle cx="47" cy="37" r="3" fill="#F2C85B" stroke={outline} strokeWidth="1" />
            </g>
          );
        }

        if (style === 'bomber_jacket') {
          return (
            <g>
              <path d="M25 22 L11 39 L19 45 L26 35 V63 H54 V35 L61 45 L69 39 L55 22 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M31 22 Q40 27 49 22" stroke="#22252D" strokeWidth="3.2" fill="none" />
              <path d="M26 60 H54" stroke="#22252D" strokeWidth="3.6" strokeLinecap="round" />
              <path d="M13 38 L19 43 M67 38 L61 43" stroke="#22252D" strokeWidth="3" strokeLinecap="round" />
              <line x1="40" y1="25" x2="40" y2="61" stroke="#D9E0E8" strokeWidth="2.4" />
              <rect x="44" y="34" width="6" height="5" rx="1.2" fill="#F2C85B" stroke={outline} strokeWidth="1.1" />
            </g>
          );
        }

        if (style === 'turtleneck_sweater') {
          return (
            <g>
              <path d="M25 22 L12 40 L20 46 L26 35 V64 H54 V35 L60 46 L68 40 L55 22 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <rect x="32" y="15" width="16" height="9" rx="3" fill={light} stroke={outline} strokeWidth="2" />
              <path d="M33 30 V60 M40 30 V60 M47 30 V60" stroke={dark} strokeWidth="1.5" opacity="0.45" />
              <path d="M27 60 H53" stroke={dark} strokeWidth="2.8" strokeLinecap="round" />
            </g>
          );
        }

        if (style === 'hawaii_shirt') {
          return (
            <g>
              <path d="M25 22 L12 36 L19 42 L26 33 V63 H54 V33 L61 42 L68 36 L55 22 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M32 22 L39 30 L33 32 L28 24 Z M48 22 L41 30 L47 32 L52 24 Z" fill={light} stroke={outline} strokeWidth="1.5" />
              <line x1="40" y1="28" x2="40" y2="62" stroke="#D4B896" strokeWidth="1.6" />
              <circle cx="32" cy="40" r="3.6" fill="#FF7C9C" />
              <circle cx="48" cy="48" r="3.6" fill="#FFE066" />
              <circle cx="33" cy="55" r="3.2" fill="#FFFFFF" />
              <path d="M45 36 Q50 34 51 39 Q46 40 45 36 Z" fill="#46A85C" />
            </g>
          );
        }

        if (style === 'picnic_dress') {
          return (
            <g>
              <path d="M25 22 L12 34 L19 40 L26 32 L20 64 H60 L54 32 L61 40 L68 34 L55 22 Z" fill="#FFFFFF" stroke={outline} strokeWidth="2.1" strokeLinejoin="round" />
              <path d="M28 24 L31 40 H49 L52 24 L50 40 L59 64 H21 L30 40 Z" fill={col} stroke={outline} strokeWidth="1.9" strokeLinejoin="round" />
              <path d="M25 46 H55 M23 55 H57 M34 40 L31 64 M46 40 L49 64" stroke="#FFFFFF" strokeWidth="2.4" opacity="0.82" />
              <circle cx="38" cy="27" r="2.2" fill="#E63946" />
              <circle cx="42" cy="27" r="2.2" fill="#E63946" />
            </g>
          );
        }

        if (style === 'picnic_shirt') {
          return (
            <g>
              <path d="M25 22 L12 36 L19 42 L26 33 V63 H54 V33 L61 42 L68 36 L55 22 Z" fill="#FFFFFF" stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M31 22 L40 31 L49 22" fill="none" stroke={outline} strokeWidth="1.8" />
              <path d="M38 28 H42 L43 49 L40 54 L37 49 Z" fill={col} stroke={outline} strokeWidth="1.4" strokeLinejoin="round" />
              <path d="M37.5 36 H42.5 M37.2 44 H42.8" stroke="#FFFFFF" strokeWidth="1.6" />
              <rect x="37" y="40" width="6" height="2.4" rx="1" fill="#F2C85B" stroke={outline} strokeWidth="0.9" />
              <rect x="44" y="37" width="8" height="9" rx="1.5" fill="#FFFDF8" stroke={outline} strokeWidth="1.2" />
              <circle cx="48" cy="42" r="2.4" fill="#D4A373" />
              <circle cx="48" cy="35" r="1.4" fill="#E63946" />
            </g>
          );
        }

        if (style === 'vampire_prince_coat') {
          return (
            <g>
              <path d="M24 22 L10 38 L16 55 L26 42 V64 H54 V42 L64 55 L70 38 L56 22 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M30 22 L24 31 L36 33 Z M50 22 L56 31 L44 33 Z" fill="#C9182B" stroke={outline} strokeWidth="1.4" />
              <path d="M34 25 H46 L44 43 H36 Z" fill="#FFFFFF" stroke={outline} strokeWidth="1.5" />
              <path d="M40 32 L34 29 L35 35 Z M40 32 L46 29 L45 35 Z" fill="#1C1A20" stroke="#C9182B" strokeWidth="1.1" />
              <path d="M36 47 L44 51 M44 47 L36 51 M36 53 L44 57 M44 53 L36 57" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M12 52 L17 55 M68 52 L63 55" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
            </g>
          );
        }

        if (style === 'vampire_lady_dress') {
          return (
            <g>
              <path d="M25 22 L12 39 L18 51 L26 40 L20 65 H60 L54 40 L62 51 L68 39 L55 22 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M33 25 H47 L53 62 H27 Z" fill="#FFFFFF" stroke={outline} strokeWidth="1.6" />
              <path d="M30 22 L24 31 L35 33 Z M50 22 L56 31 L45 33 Z" fill="#C9182B" stroke={outline} strokeWidth="1.4" />
              <path d="M27 59 H53" stroke="#C9182B" strokeWidth="3.5" />
              <path d="M40 32 L34 29 L35 35 Z M40 32 L46 29 L45 35 Z" fill="#1C1A20" stroke="#C9182B" strokeWidth="1.1" />
            </g>
          );
        }

        if (style === 'goose_pinafore_dress') {
          return (
            <g>
              <path d="M25 22 L12 41 L18 46 L26 35 L20 64 H60 L54 35 L62 46 L68 41 L55 22 Z" fill="#FFFFFF" stroke={outline} strokeWidth="2.1" strokeLinejoin="round" />
              <path d="M12 40 L18 45 M68 40 L62 45" stroke={col} strokeWidth="3.5" strokeLinecap="round" />
              <path d="M29 24 L31 41 H49 L51 24 L59 64 Q49 67 40 64 Q31 67 21 64 Z" fill={col} stroke={outline} strokeWidth="2" strokeLinejoin="round" />
              <circle cx="30" cy="37" r="3.4" fill="#F6B83B" stroke={outline} strokeWidth="1" />
              <circle cx="43" cy="52" r="5" fill="#FFFFFF" stroke={outline} strokeWidth="1.2" />
              <ellipse cx="48" cy="51" rx="2.5" ry="1.4" fill="#F28B30" />
            </g>
          );
        }

        if (style === 'goose_raglan_tee') {
          return (
            <g>
              <path d="M25 22 L12 36 L19 42 L26 33 V63 H54 V33 L61 42 L68 36 L55 22 Z" fill="#FFFFFF" stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M25 22 L12 36 L19 42 L28 32 Z M55 22 L68 36 L61 42 L52 32 Z" fill={col} stroke={outline} strokeWidth="2" strokeLinejoin="round" />
              <path d="M32 22 Q40 28 48 22" stroke={col} strokeWidth="3" fill="none" />
              <circle cx="46" cy="40" r="3.6" fill="#FFFFFF" stroke={outline} strokeWidth="1.2" />
              <ellipse cx="49" cy="40" rx="2" ry="1.2" fill="#F28B30" />
            </g>
          );
        }

        if (style === 'pompom_pajama_shirt') {
          return (
            <g>
              <path d="M25 22 L11 40 L18 46 L26 35 V63 H54 V35 L62 46 L69 40 L55 22 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M25 22 L11 40 L18 46 L26 35 Z M55 22 L69 40 L62 46 L54 35 Z" fill="#FFE680" stroke={outline} strokeWidth="2" strokeLinejoin="round" />
              <path d="M12 40 L18 45 M68 40 L62 45" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
              <path d="M31 22 L40 29 L49 22 Z" fill="#FFE680" stroke={outline} strokeWidth="1.5" />
              <rect x="37.5" y="28" width="5" height="35" fill="#FFE680" stroke={outline} strokeWidth="1.2" />
              <rect x="28" y="45" width="8" height="9" rx="2" fill="#FFE680" stroke={outline} strokeWidth="1.3" />
              <rect x="44" y="45" width="8" height="9" rx="2" fill="#FFE680" stroke={outline} strokeWidth="1.3" />
              <circle cx="32" cy="43" r="3.2" fill="#FFE066" stroke={outline} strokeWidth="1.1" />
              <circle cx="48" cy="43" r="3.2" fill="#FFE066" stroke={outline} strokeWidth="1.1" />
            </g>
          );
        }

        if (style === 'pompom_sleep_dress') {
          return (
            <g>
              <path d="M25 21 L12 39 L18 45 L26 34 L21 65 H59 L54 34 L62 45 L68 39 L55 21 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M25 21 L12 39 L18 45 L26 34 Z M55 21 L68 39 L62 45 L54 34 Z" fill="#FFE680" stroke={outline} strokeWidth="2" strokeLinejoin="round" />
              <path d="M31 21 L40 28 L49 21 Z" fill="#FFE680" stroke={outline} strokeWidth="1.5" />
              <rect x="38" y="27" width="4" height="34" fill="#FFE680" />
              <path d="M21 59 H59 L60 65 H20 Z" fill="#FFE680" stroke={outline} strokeWidth="1.8" />
              <rect x="27" y="44" width="8" height="8" rx="2" fill="#FFE680" stroke={outline} strokeWidth="1.2" />
              <rect x="45" y="44" width="8" height="8" rx="2" fill="#FFE680" stroke={outline} strokeWidth="1.2" />
            </g>
          );
        }
        if (style === 'witch_cat_dress') {
          return (
            <g>
              <path d="M25 21 L12 37 L18 42 L26 32 L18 65 H62 L54 32 L62 42 L68 37 L55 21 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M26 49 Q33 44 40 49 Q47 44 54 49" stroke="#3B3548" strokeWidth="1.6" fill="none" />
              <path d="M26 36 L48 56" stroke="#D9A842" strokeWidth="2.2" />
              <path d="M46 54 C46 61, 55 62, 57 55 C53 56, 49 54, 48 51 Z" fill="#F8CE48" stroke={outline} strokeWidth="1.4" />
            </g>
          );
        }
        if (style === 'midautumn_girl_top') {
          return (
            <g>
              <path d="M25 22 L12 37 L18 43 L26 33 L21 63 H59 L54 33 L62 43 L68 37 L55 22 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M25 22 C28 31, 52 31, 55 22 Z" fill="#DA2A2E" stroke="#F4C542" strokeWidth="1.6" />
              <path d="M24 52 Q32 48 40 53 Q48 48 56 52 L59 63 H21 Z" fill="#DA2A2E" stroke="#F4C542" strokeWidth="1.4" />
              <circle cx="40" cy="30" r="2.5" fill="#46B966" stroke={outline} strokeWidth="1.1" />
              <line x1="40" y1="32.5" x2="40" y2="41" stroke="#DA2A2E" strokeWidth="2.6" strokeLinecap="round" />
            </g>
          );
        }
        if (style === 'midautumn_boy_top') {
          return (
            <g>
              <path d="M25 21 L12 37 L18 43 L26 33 V64 H54 V33 L62 43 L68 37 L55 21 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M32 21 L40 36 L48 21" stroke="#F4C542" strokeWidth="2.4" fill="none" />
              <path d="M32 21 L40 35 L48 21 Z" fill="#1E1C22" />
              <rect x="26" y="54" width="28" height="4.5" fill="#F5F3EE" stroke={outline} strokeWidth="1.2" />
              <circle cx="40" cy="34" r="2.4" fill="#46B966" />
              <line x1="40" y1="36.4" x2="40" y2="45" stroke="#DA2A2E" strokeWidth="2.5" strokeLinecap="round" />
            </g>
          );
        }

        // cardigan_vest
        return (
          <g>
            <path d="M25 22 L14 38 L21 43 L27 34 V63 H53 V34 L59 43 L66 38 L55 22 Z" fill="#FFFDF8" stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
            <path d="M27 22 L36 22 L40 35 L44 22 L53 22 V63 H27 Z" fill={col} stroke={outline} strokeWidth="2" strokeLinejoin="round" />
            <circle cx="40" cy="43" r="1.8" fill={dark} />
            <circle cx="40" cy="52" r="1.8" fill={dark} />
          </g>
        );
      })()}

      {/* 2. QUẦN / CHÂN VÁY */}
      {category === 'bottoms' && (() => {
        const col = patch.bottomColor || '#3B526B';
        const dark = shade(col, -24);
        const style = patch.bottom || 'pleated_skirt';

        if (style === 'wide_trousers') {
          return (
            <g>
              <path d="M24 18 H56 L61 65 H43 L40 34 L37 65 H19 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M24 23 H56" stroke={dark} strokeWidth="2" />
            </g>
          );
        }

        if (style === 'denim_shorts') {
          return (
            <g>
              <path d="M23 23 H57 L60 54 H43 L40 41 L37 54 H20 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M23 29 H57" stroke={dark} strokeWidth="2" />
              <path d="M23 36 Q28 38 30 31 M57 36 Q52 38 50 31" stroke={dark} strokeWidth="1.6" fill="none" />
            </g>
          );
        }

        if (style === 'midi_skirt') {
          return (
            <g>
              <path d="M26 20 H54 L65 62 C50 67, 30 67, 15 62 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M26 25 H54" stroke={dark} strokeWidth="2" />
              <path d="M22 55 Q40 61 58 55" stroke={dark} strokeWidth="1.8" fill="none" />
            </g>
          );
        }

        if (style === 'office_trousers') {
          return (
            <g>
              {/* Straight-leg tailored dress slacks (suông gọn, không loe!) */}
              <path
                d="M25 18 H55 L56 65 H43 L40 35 L37 65 H24 Z"
                fill={col}
                stroke={outline}
                strokeWidth="2.2"
                strokeLinejoin="round"
              />
              {/* Belt & Silver Buckle */}
              <path d="M25 22 H55" stroke="#1E1815" strokeWidth="3.5" />
              <rect x="37" y="19.5" width="6" height="4.5" rx="1" fill="#DCE2EA" stroke={outline} strokeWidth="1.2" />
              {/* Crisp Front Creases */}
              <path d="M31 30 L30.5 61 M49 30 L49.5 61" stroke={shade(col, 24)} strokeWidth="1.6" strokeLinecap="round" />
            </g>
          );
        }

        if (style === 'office_skirt') {
          return (
            <g>
              {/* Fitted High-Waisted Office Pencil Skirt */}
              <path
                d="M27 20 H53 C56 32, 56 46, 54 62 H26 C24 46, 24 32, 27 20 Z"
                fill={col}
                stroke={outline}
                strokeWidth="2.2"
                strokeLinejoin="round"
              />
              <path d="M26.5 24.5 H53.5" stroke="#1E1815" strokeWidth="3.2" />
              <rect x="37.2" y="22.2" width="5.6" height="4.2" rx="1" fill="#E8C36A" stroke={outline} strokeWidth="1.1" />
              <path d="M40 28 V61" stroke={dark} strokeWidth="1.6" strokeLinecap="round" />
            </g>
          );
        }

        if (style === 'cargo_shorts') {
          return (
            <g>
              <path d="M23 23 H57 L60 55 H43 L40 41 L37 55 H20 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M23 28 H57" stroke={dark} strokeWidth="2" />
              <rect x="17" y="34" width="7" height="12" rx="1.6" fill={shade(col, 14)} stroke={outline} strokeWidth="1.6" />
              <rect x="56" y="34" width="7" height="12" rx="1.6" fill={shade(col, 14)} stroke={outline} strokeWidth="1.6" />
              <path d="M17 37 H24 M56 37 H63" stroke={dark} strokeWidth="1.8" />
            </g>
          );
        }

        if (style === 'sport_shorts') {
          return (
            <g>
              <path d="M23 23 H57 L61 54 H43 L40 41 L37 54 H19 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M23 26 H57" stroke="#FFFFFF" strokeWidth="3.2" />
              <path d="M22 30 L19 52 M58 30 L61 52" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" />
              <path d="M20 53 H36 M44 53 H60" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" />
            </g>
          );
        }

        if (style === 'pajama_pants') {
          return (
            <g>
              <path d="M24 18 H56 L61 65 H43 L40 34 L37 65 H19 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M24 23 H56" stroke="#FFFFFF" strokeWidth="2.4" />
              {[
                [29, 36],
                [50, 38],
                [28, 52],
                [51, 53],
              ].map(([px, py]) => (
                <g key={`${px}-${py}`}>
                  <circle cx={px - 2.2} cy={py - 2.2} r="1.2" fill="#2A2224" />
                  <circle cx={px + 2.2} cy={py - 2.2} r="1.2" fill="#2A2224" />
                  <circle cx={px} cy={py} r="3.2" fill="#FFFFFF" />
                  <circle cx={px - 1.1} cy={py - 0.2} r="0.8" fill="#2A2224" />
                  <circle cx={px + 1.1} cy={py - 0.2} r="0.8" fill="#2A2224" />
                </g>
              ))}
              <path d="M19 62 H37 M43 62 H61" stroke="#FFFFFF" strokeWidth="2.2" />
            </g>
          );
        }

        if (style === 'tunic_pants') {
          return (
            <g>
              <path d="M24 18 H56 L63 65 H43 L40 33 L37 65 H17 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M24 23 H56" stroke="#E6DDD0" strokeWidth="2" />
              <path d="M31 28 L29 61 M49 28 L51 61" stroke="#E6DDD0" strokeWidth="1.5" />
            </g>
          );
        }

        if (style === 'cloud_shorts') {
          return (
            <g>
              <path d="M23 23 H57 L61 54 H43 L40 41 L37 54 H19 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M23 26 H57" stroke="#FFFFFF" strokeWidth="3" />
              <circle cx="24" cy="51" r="4.5" fill="#FFFFFF" />
              <circle cx="31" cy="51" r="4.2" fill="#FFFFFF" />
              <circle cx="49" cy="51" r="4.2" fill="#FFFFFF" />
              <circle cx="56" cy="51" r="4.5" fill="#FFFFFF" />
            </g>
          );
        }

        if (style === 'silk_culottes') {
          return (
            <g>
              <path d="M23 18 H57 L64 65 H43 L40 34 L37 65 H16 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M23 23 H57" stroke="#F4DFB0" strokeWidth="2.2" />
              <path d="M29 29 L24 62 M51 29 L56 62" stroke={shade(col, 24)} strokeWidth="1.6" strokeLinecap="round" />
            </g>
          );
        }

        if (style === 'tiered_lace_skirt') {
          return (
            <g>
              <path d="M26 21 H54 L59 38 C48 41, 32 41, 21 38 Z" fill={col} stroke={outline} strokeWidth="2.1" strokeLinejoin="round" />
              <path d="M22 36 H58 L64 51 C49 55, 31 55, 16 51 Z" fill={shade(col, 14)} stroke={outline} strokeWidth="2.1" strokeLinejoin="round" />
              <path d="M18 49 H62 L67 63 C50 67, 30 67, 13 63 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M15 61 Q27 65 40 61 Q53 65 65 61" stroke="#FFFDF8" strokeWidth="2.6" fill="none" />
            </g>
          );
        }

        if (style === 'plaid_skirt') {
          return (
            <g>
              <path d="M25 22 H55 L63 57 C48 61, 32 61, 17 57 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M22 36 H58 M19 48 H61" stroke="#FFFDF8" strokeWidth="2" opacity="0.85" />
              <path d="M32 24 L29 57 M40 24 V58 M48 24 L51 57" stroke={dark} strokeWidth="2" />
              <path d="M25 26 H55" stroke={dark} strokeWidth="2.4" />
            </g>
          );
        }

        if (style === 'cargo_pants') {
          return (
            <g>
              <path d="M24 18 H56 L61 65 H43 L40 34 L37 65 H19 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <rect x="17" y="38" width="7" height="11" rx="1.6" fill={shade(col, 15)} stroke={outline} strokeWidth="1.6" />
              <rect x="56" y="38" width="7" height="11" rx="1.6" fill={shade(col, 15)} stroke={outline} strokeWidth="1.6" />
              <path d="M24 22 H56" stroke="#221D1A" strokeWidth="3" />
            </g>
          );
        }

        if (style === 'flare_jeans') {
          return (
            <g>
              <path d="M25 18 H55 L54 39 L63 65 H43 L40 36 L37 65 H17 L26 39 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M25 23 H55" stroke="#D9A34E" strokeWidth="2" />
              <path d="M29 31 L25 60 M51 31 L55 60" stroke={shade(col, 24)} strokeWidth="2.4" strokeLinecap="round" opacity="0.7" />
            </g>
          );
        }

        if (style === 'a_line_skirt') {
          return (
            <g>
              <path d="M26 22 H54 L63 59 C48 63, 32 63, 17 59 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M26 27 H54" stroke={dark} strokeWidth="2" />
              <path d="M19 57 Q40 61 61 57" stroke={shade(col, 18)} strokeWidth="1.8" fill="none" />
            </g>
          );
        }

        if (style === 'picnic_chinos') {
          return (
            <g>
              <path d="M25 18 H55 L58 65 H43 L40 34 L37 65 H22 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M25 22 H55" stroke="#2A201B" strokeWidth="3.5" />
              <rect x="37" y="19.5" width="6" height="4.5" rx="1" fill="#DCE2EA" stroke={outline} strokeWidth="1.2" />
              <path d="M30 30 L29 62 M50 30 L51 62" stroke={dark} strokeWidth="1.5" opacity="0.65" />
            </g>
          );
        }

        if (style === 'vampire_slit_pants') {
          return (
            <g>
              <path d="M24 18 H56 L61 65 H43 L40 34 L37 65 H19 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M24 22 H56" stroke="#C9182B" strokeWidth="3" />
              <path d="M21 37 H36" stroke="#C9182B" strokeWidth="3.6" />
              <rect x="26" y="34.5" width="5" height="5" rx="1" fill="#DCE2EA" stroke={outline} strokeWidth="1.1" />
              <polygon points="24,65 28,51 32,65" fill="#C9182B" />
              <polygon points="48,65 52,51 56,65" fill="#C9182B" />
            </g>
          );
        }

        if (style === 'goose_puff_shorts') {
          return (
            <g>
              <path d="M22 23 H58 C64 38, 63 51, 56 54 H43 L40 41 L37 54 H24 C17 51, 16 38, 22 23 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M22 27 H58" stroke={dark} strokeWidth="2.4" />
              <path d="M24 53 H37 M43 53 H56" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
              <circle cx="49" cy="39" r="4.2" fill="#FFFFFF" stroke={outline} strokeWidth="1.3" />
              <ellipse cx="53" cy="39" rx="2.4" ry="1.3" fill="#F28B30" />
            </g>
          );
        }

        if (style === 'pompom_pajama_pants') {
          return (
            <g>
              <path d="M24 18 H56 L60 65 H43 L40 34 L37 65 H20 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M24 22 H56" stroke="#FFE680" strokeWidth="3" />
              <path d="M20 58 H37 V65 H20 Z M43 58 H60 V65 H43 Z" fill="#FFE680" stroke={outline} strokeWidth="1.6" />
            </g>
          );
        }

        if (style === 'witch_cat_skirt') {
          return (
            <g>
              <path d="M24 22 H56 L66 58 Q53 63 40 59 Q27 63 14 58 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M24 27 H56" stroke="#3D384B" strokeWidth="2" />
              <path d="M31 28 L24 58 M40 28 V59 M49 28 L56 58" stroke="#181520" strokeWidth="1.6" strokeLinecap="round" />
            </g>
          );
        }
        if (style === 'midautumn_bloomers') {
          return (
            <g>
              <path d="M24 25 H56 C63 34, 63 50, 56 54 H42 L40 44 L38 54 H24 C17 50, 17 34, 24 25 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M24 54 H38 M42 54 H56" stroke="#DA2A2E" strokeWidth="2.8" strokeLinecap="round" />
            </g>
          );
        }
        if (style === 'midautumn_boy_pants') {
          return (
            <g>
              <path d="M23 19 H57 L61 65 H43 L40 38 L37 65 H19 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <rect x="31" y="21" width="18" height="39" rx="2" fill="#DA2A2E" stroke="#F4C542" strokeWidth="1.8" />
              <path d="M34 45 Q40 40 46 45 M34 52 Q40 47 46 52" stroke="#F4C542" strokeWidth="1.5" fill="none" />
              <path d="M22 57 Q29 53 34 57 M49 57 Q54 53 59 57" stroke="#F5EFE4" strokeWidth="1.5" fill="none" />
            </g>
          );
        }

        // pleated_skirt
        return (
          <g>
            <path d="M25 22 H55 L63 57 C48 61, 32 61, 17 57 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
            <path d="M25 27 H55" stroke={dark} strokeWidth="2" />
            <path d="M32 28 L28 57 M40 28 V58 M48 28 L52 57" stroke={dark} strokeWidth="1.8" strokeLinecap="round" />
          </g>
        );
      })()}

      {/* 3. ĐẦU HỘP */}
      {category === 'hair' && (() => {
        const skin = patch.boxHeadSkin || 'cream_cube';
        const col = patch.boxHeadColor || '#F7D7BC';
        const dark = shade(col, -28);
        const light = shade(col, 24);
        const isDark =
          skin === 'tv_screen' || skin === 'hero_visor' || skin === 'witch_rune';
        const faceFill =
          skin === 'tv_screen'
            ? '#152236'
            : skin === 'hero_visor'
              ? '#111A2C'
              : skin === 'witch_rune'
                ? '#221C30'
                : skin === 'panda_box'
                  ? '#FFFFFF'
                  : skin === 'pompom_box'
                    ? '#FFF7D4'
                    : skin === 'student_milk'
                      ? '#FFFFFF'
                      : skin === 'classic_carton'
                        ? '#E8C59B'
                        : '#FFFDF8';

        return (
          <g>
            {/* Top 3D skin accessories behind/above box */}
            {skin === 'tv_screen' && (
              <g>
                <path d="M32 22 L24 10" stroke={outline} strokeWidth="2.4" strokeLinecap="round" />
                <path d="M48 22 L56 10" stroke={outline} strokeWidth="2.4" strokeLinecap="round" />
                <circle cx="24" cy="10" r="2.6" fill="#38BDF8" stroke={outline} strokeWidth="1.4" />
                <circle cx="56" cy="10" r="2.6" fill="#38BDF8" stroke={outline} strokeWidth="1.4" />
              </g>
            )}
            {skin === 'cat_box' && (
              <g>
                <path d="M21 24 L20 11 L32 20 Z" fill={col} stroke={outline} strokeWidth="2" strokeLinejoin="round" />
                <path d="M59 24 L60 11 L48 20 Z" fill={col} stroke={outline} strokeWidth="2" strokeLinejoin="round" />
                <path d="M23 21 L22.5 14.5 L29 19.5 Z" fill="#F497AC" />
                <path d="M57 21 L57.5 14.5 L51 19.5 Z" fill="#F497AC" />
              </g>
            )}
            {skin === 'bunny_box' && (
              <g>
                <rect x="24" y="6" width="8.5" height="18" rx="4.2" fill={col} stroke={outline} strokeWidth="2" />
                <rect x="47.5" y="6" width="8.5" height="18" rx="4.2" fill={col} stroke={outline} strokeWidth="2" />
                <rect x="26.5" y="9" width="3.5" height="11" rx="1.7" fill="#F48FB1" />
                <rect x="50" y="9" width="3.5" height="11" rx="1.7" fill="#F48FB1" />
              </g>
            )}
            {skin === 'frog_box' && (
              <g>
                <circle cx="26" cy="20" r="6.2" fill={col} stroke={outline} strokeWidth="2" />
                <circle cx="54" cy="20" r="6.2" fill={col} stroke={outline} strokeWidth="2" />
                <circle cx="26" cy="19.5" r="3.2" fill="#FFFFFF" />
                <circle cx="54" cy="19.5" r="3.2" fill="#FFFFFF" />
                <circle cx="26" cy="19.5" r="1.6" fill="#1F2937" />
                <circle cx="54" cy="19.5" r="1.6" fill="#1F2937" />
              </g>
            )}
            {skin === 'panda_box' && (
              <g>
                <circle cx="22" cy="21" r="6" fill="#232226" stroke={outline} strokeWidth="1.8" />
                <circle cx="58" cy="21" r="6" fill="#232226" stroke={outline} strokeWidth="1.8" />
              </g>
            )}
            {skin === 'student_milk' && (
              <g>
                <path d="M22 22 L28 13 H52 L58 22 Z" fill={light} stroke={outline} strokeWidth="2" strokeLinejoin="round" />
                <path d="M47 15 L52 7 L58 8" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </g>
            )}
            {skin === 'parcel_love' && (
              <g>
                <ellipse cx="34" cy="16" rx="6" ry="3.5" transform="rotate(-18 34 16)" fill="#EE5A78" stroke={outline} strokeWidth="1.6" />
                <ellipse cx="46" cy="16" rx="6" ry="3.5" transform="rotate(18 46 16)" fill="#EE5A78" stroke={outline} strokeWidth="1.6" />
                <circle cx="40" cy="17.5" r="2.8" fill="#D93B5B" stroke={outline} strokeWidth="1.5" />
              </g>
            )}
            {skin === 'midautumn_lantern' && (
              <g>
                <rect x="33" y="13" width="14" height="7" rx="2" fill="#F2B840" stroke={outline} strokeWidth="1.8" />
                <circle cx="40" cy="11" r="2.4" fill="#F2B840" stroke={outline} strokeWidth="1.4" />
              </g>
            )}

            {/* Main Box Shell */}
            <rect
              x="16"
              y="20"
              width="48"
              height="44"
              rx="10"
              fill={col}
              stroke={outline}
              strokeWidth="2.3"
            />
            {/* Top rim highlight */}
            <path d="M23 23.5 H57" stroke={light} strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
            {/* Bottom shadow lip */}
            <path d="M21 60.5 H59" stroke={dark} strokeWidth="2.5" strokeLinecap="round" opacity="0.45" />

            {/* Skin-specific shell decorations */}
            {skin === 'classic_carton' && (
              <g>
                <rect x="35.5" y="20" width="9" height="8" fill="#E8C794" stroke={outline} strokeWidth="1.3" />
                <rect x="19" y="54" width="9" height="6" rx="1" fill="#F7EFE1" stroke={outline} strokeWidth="1.1" />
              </g>
            )}
            {skin === 'parcel_love' && (
              <rect x="37" y="20" width="6" height="44" fill="#EE5A78" opacity="0.9" />
            )}
            {skin === 'pompom_box' && (
              <g>
                <path
                  d="M17 28 C17 20, 63 20, 63 28 C58 32, 53 28, 49 32 C45 29, 39 33, 33 29 C27 33, 21 29, 17 28 Z"
                  fill="#6E3B26"
                  stroke={outline}
                  strokeWidth="1.6"
                />
                <ellipse cx="40" cy="18" rx="9" ry="3.6" fill="#6E3B26" stroke={outline} strokeWidth="1.8" />
                <circle cx="40" cy="14" r="2" fill="#6E3B26" />
              </g>
            )}
            {skin === 'hero_visor' && (
              <path d="M40 12 L44 21 H36 Z" fill="#38BDF8" stroke={outline} strokeWidth="1.6" strokeLinejoin="round" />
            )}

            {/* Front Recessed / Framed Face Screen Plate */}
            <rect
              x="22"
              y="28"
              width="36"
              height="28"
              rx="6.5"
              fill={faceFill}
              stroke={skin === 'hero_visor' ? '#38BDF8' : dark}
              strokeWidth="1.8"
            />
            {skin === 'panda_box' && (
              <g>
                <ellipse cx="31" cy="40" rx="5.5" ry="4.5" transform="rotate(-14 31 40)" fill="#232226" />
                <ellipse cx="49" cy="40" rx="5.5" ry="4.5" transform="rotate(14 49 40)" fill="#232226" />
              </g>
            )}
            {skin === 'witch_rune' && (
              <path d="M40 24 L41.5 26.8 L44.5 27 L42 28.8 L42.8 31.6 L40 29.8 L37.2 31.6 L38 28.8 L35.5 27 L38.5 26.8 Z" fill="#F8CB46" />
            )}

            {/* Mini signature expression on Box preview */}
            {isDark ? (
              <g>
                <rect x="29" y="38" width="5" height="6" rx="1.4" fill="#38BDF8" />
                <rect x="46" y="38" width="5" height="6" rx="1.4" fill="#38BDF8" />
                <path d="M36 49 Q40 52 44 49" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" fill="none" />
              </g>
            ) : (
              <g>
                <circle cx="32" cy="40.5" r="2.6" fill={skin === 'panda_box' ? '#FFFFFF' : '#261C18'} />
                <circle cx="48" cy="40.5" r="2.6" fill={skin === 'panda_box' ? '#FFFFFF' : '#261C18'} />
                <ellipse cx="27.5" cy="45" rx="3" ry="1.6" fill="#F48B96" opacity="0.7" />
                <ellipse cx="52.5" cy="45" rx="3" ry="1.6" fill="#F48B96" opacity="0.7" />
                <path d="M36 47.5 Q40 50.8 44 47.5" stroke="#2D1E19" strokeWidth="2" strokeLinecap="round" fill="none" />
              </g>
            )}
          </g>
        );
      })()}

      {/* 4. MẶT HỘP */}
      {category === 'face' && (() => {
        const eyeCol = patch.eyeColor || '#5B341E';
        const eyeStyle = patch.eyeStyle || 'bright';
        const expr = patch.expression || 'sweet_smile';
        const hasBlush = Boolean(patch.blush);
        const isPout = expr === 'pout';
        const isCool = eyeStyle === 'cool';
        const isPixelDark = eyeStyle === 'box_pixel';
        const plateFill = isPixelDark ? '#152236' : '#FFFDF8';
        const strokeMain = isPixelDark ? '#38BDF8' : '#231612';

        return (
          <g>
            {/* Outer Rounded Box Head Frame */}
            <rect
              x="14"
              y="16"
              width="52"
              height="48"
              rx="10.5"
              fill={isPixelDark ? '#333E52' : '#F2D5B8'}
              stroke={outline}
              strokeWidth="2.2"
            />
            {/* Inner Box Screen Plate */}
            <rect
              x="18.5"
              y="21"
              width="43"
              height="38"
              rx="7.5"
              fill={plateFill}
              stroke={isPixelDark ? '#38BDF8' : '#D5B290'}
              strokeWidth="1.6"
            />

            {/* Eyebrows (hidden on minimalist dot/pixel/sleepy/heart unless pout) */}
            {eyeStyle !== 'box_dot' &&
              eyeStyle !== 'box_pixel' &&
              eyeStyle !== 'box_sleepy' &&
              eyeStyle !== 'box_heart' && (
                <g>
                  <path
                    d={
                      isPout
                        ? 'M23.5 29 L34 32.5'
                        : isCool
                          ? 'M23 32.5 Q29 31.5 34.5 33'
                          : 'M23.5 30.5 Q29 28 34.5 30.8'
                    }
                    stroke="#241916"
                    strokeWidth="2.1"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <path
                    d={
                      isPout
                        ? 'M46 32.5 L56.5 29'
                        : isCool
                          ? 'M45.5 33 Q51 31.5 57 32.5'
                          : 'M45.5 30.8 Q51 28 56.5 30.5'
                    }
                    stroke="#241916"
                    strokeWidth="2.1"
                    strokeLinecap="round"
                    fill="none"
                  />
                </g>
              )}

            {/* Soft Rosy Cheeks */}
            {hasBlush && (
              <g opacity="0.72">
                <ellipse cx="24" cy="46.5" rx="4.5" ry="2.5" fill="#F28B92" />
                <ellipse cx="56" cy="46.5" rx="4.5" ry="2.5" fill="#F28B92" />
              </g>
            )}

            {/* Box Head Eyes */}
            {eyeStyle === 'box_dot' ? (
              <g>
                <circle cx="29.5" cy="39" r="4" fill={eyeCol} />
                <circle cx="50.5" cy="39" r="4" fill={eyeCol} />
                <circle cx="28" cy="37.4" r="1.3" fill="#FFFFFF" />
                <circle cx="49" cy="37.4" r="1.3" fill="#FFFFFF" />
              </g>
            ) : eyeStyle === 'box_pixel' ? (
              <g>
                <rect x="25" y="33.5" width="8.5" height="10" rx="1.8" fill={eyeCol} />
                <rect x="46.5" y="33.5" width="8.5" height="10" rx="1.8" fill={eyeCol} />
                <rect x="26.5" y="35" width="3" height="3" fill="#FFFFFF" />
                <rect x="48" y="35" width="3" height="3" fill="#FFFFFF" />
              </g>
            ) : eyeStyle === 'box_heart' ? (
              <g>
                {[29.5, 50.5].map((cx) => (
                  <path
                    key={cx}
                    d={`M${cx} 44.5 C${cx - 6.5} 40.5, ${cx - 6.5} 34, ${cx - 2.5} 34 C${cx - 0.8} 34, ${cx} 35.4, ${cx} 36.2 C${cx} 35.4, ${cx + 0.8} 34, ${cx + 2.5} 34 C${cx + 6.5} 34, ${cx + 6.5} 40.5, ${cx} 44.5 Z`}
                    fill={eyeCol}
                  />
                ))}
              </g>
            ) : eyeStyle === 'box_sleepy' ? (
              <g>
                <path d="M23.5 39 Q29.5 43.5 35.5 39" stroke={eyeCol} strokeWidth="2.8" strokeLinecap="round" fill="none" />
                <path d="M44.5 39 Q50.5 43.5 56.5 39" stroke={eyeCol} strokeWidth="2.8" strokeLinecap="round" fill="none" />
              </g>
            ) : eyeStyle === 'happy_arc' ? (
              <g>
                <path d="M23.5 40 Q29.5 33.8 35.5 40" stroke="#241814" strokeWidth="2.8" strokeLinecap="round" fill="none" />
                <path d="M44.5 40 Q50.5 33.8 56.5 40" stroke="#241814" strokeWidth="2.8" strokeLinecap="round" fill="none" />
              </g>
            ) : eyeStyle === 'joy_xd' ? (
              <g>
                <path
                  d="M24.5 35.5 L34.5 39.8 L24.5 44"
                  stroke="#1E1512"
                  strokeWidth="2.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
                <path
                  d="M55.5 35.5 L45.5 39.8 L55.5 44"
                  stroke="#1E1512"
                  strokeWidth="2.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </g>
            ) : eyeStyle === 'cool' ? (
              <g>
                {[29.5, 50.5].map((ex) => (
                  <g key={ex}>
                    <path d={`M${ex - 5.5} 36.5 H${ex + 5.5} C${ex + 5.5} 44, ${ex - 5.5} 44, ${ex - 5.5} 36.5 Z`} fill="#FFFFFF" stroke="#1E1818" strokeWidth="1.2" />
                    <circle cx={ex} cy="39.5" r="3.2" fill={eyeCol} />
                    <circle cx={ex} cy="39.7" r="1.6" fill="#18141A" />
                    <circle cx={ex - 1.2} cy="38.4" r="1.1" fill="#FFFFFF" />
                    <path d={`M${ex - 6.2} 36.4 Q${ex} 35.4 ${ex + 6.2} 36.4`} stroke="#1E1818" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                  </g>
                ))}
              </g>
            ) : (
              <g>
                {[29.5, 50.5].map((ex, idx) => {
                  const isWinkClosed = eyeStyle === 'wink' && idx === 1;
                  if (isWinkClosed) {
                    return (
                      <g key={ex}>
                        <path d={`M${ex - 5.5} 40.2 Q${ex} 34 ${ex + 5.5} 40.2`} stroke="#231612" strokeWidth="2.6" strokeLinecap="round" fill="none" />
                        <path d={`M${ex + 4.4} 38.6 L${ex + 6.6} 36.6`} stroke="#231612" strokeWidth="1.9" strokeLinecap="round" />
                      </g>
                    );
                  }
                  return (
                    <g key={ex}>
                      <ellipse
                        cx={ex}
                        cy="39.2"
                        rx={eyeStyle === 'heroic' ? 5.6 : 5.4}
                        ry={eyeStyle === 'sparkle' ? 6.0 : eyeStyle === 'heroic' ? 5.0 : 5.6}
                        fill="#FFFFFF"
                        stroke={eyeStyle === 'gentle' ? '#382117' : '#231612'}
                        strokeWidth="1.2"
                      />
                      <circle cx={ex} cy="39.6" r={eyeStyle === 'heroic' ? 3.8 : 4.2} fill={eyeCol} />
                      <circle cx={ex} cy="39.6" r="2.0" fill="#171318" />
                      <circle cx={ex - 1.5} cy="37.6" r="1.5" fill="#FFFFFF" />
                      <circle cx={ex + 1.4} cy="41.4" r="0.9" fill="#FFFFFF" />
                      {eyeStyle === 'sparkle' && (
                        <path
                          d={`M${ex + 1.5} 36.6 L${ex + 1.9} 37.6 L${ex + 2.9} 38.0 L${ex + 1.9} 38.4 L${ex + 1.5} 39.4 L${ex + 1.1} 38.4 L${ex + 0.1} 38.0 L${ex + 1.1} 37.6 Z`}
                          fill="#FFFFFF"
                        />
                      )}
                      <path
                        d={
                          idx === 0
                            ? `M${ex - 6.2} 36.2 Q${ex} 32.2 ${ex + 5.2} 36.0`
                            : `M${ex - 5.2} 36.0 Q${ex} 32.2 ${ex + 6.2} 36.2`
                        }
                        stroke={eyeStyle === 'gentle' ? '#382117' : '#231612'}
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        fill="none"
                      />
                    </g>
                  );
                })}
              </g>
            )}

            {/* Expressive Box Head Mouths */}
            {expr === 'joy_open' && (
              <g>
                <path d="M34.5 49.5 Q40 50.3 45.5 49.5 C45.5 55.8, 34.5 55.8, 34.5 49.5 Z" fill="#C84B59" stroke="#4E2225" strokeWidth="1.1" />
                <ellipse cx="40" cy="53.1" rx="3.2" ry="1.5" fill="#F796A0" />
              </g>
            )}
            {expr === 'gentle_o' && (
              <g>
                <ellipse cx="40" cy="51.6" rx="2.6" ry="3.0" fill="#C44C5A" stroke="#4E2225" strokeWidth="1.0" />
                <ellipse cx="40" cy="53.0" rx="1.6" ry="1.1" fill="#F796A0" />
              </g>
            )}
            {expr === 'cat_w' && (
              <path
                d="M34.2 50.8 Q37.1 54.2 40 50.8 Q42.9 54.2 45.8 50.8"
                stroke={strokeMain}
                strokeWidth="2.1"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            )}
            {expr === 'confident' && (
              <path d="M35.5 51.8 Q40.5 53 45 50.5" stroke={strokeMain} strokeWidth="2.1" strokeLinecap="round" fill="none" />
            )}
            {expr === 'pout' && (
              <g>
                <path d="M35.8 52.6 Q40 49.2 44.2 52.4" stroke={strokeMain} strokeWidth="2.1" strokeLinecap="round" fill="none" />
                <path d="M43.2 49.8 Q45.2 51.4 43.4 53.4" stroke={strokeMain} strokeWidth="1.5" strokeLinecap="round" fill="none" />
              </g>
            )}
            {expr === 'box_zigzag' && (
              <path
                d="M33 51.5 L35.8 49.2 L38.6 52.5 L41.4 49.2 L44.2 52.5 L47 50.2"
                stroke={strokeMain}
                strokeWidth="2.1"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            )}
            {expr === 'box_blep' && (
              <g>
                <path d="M34.8 49.8 Q40 52.2 45.2 49.8" stroke={strokeMain} strokeWidth="2.1" strokeLinecap="round" fill="none" />
                <path d="M37.8 51 H42.2 V54.5 C42.2 56.2, 37.8 56.2, 37.8 54.5 Z" fill="#F4728A" stroke="#7A2E3B" strokeWidth="1.1" />
              </g>
            )}
            {expr === 'box_triangle' && (
              <path
                d="M35 49.5 H45 L40 55.2 Z"
                fill={isPixelDark ? '#38BDF8' : '#E05B69'}
                stroke={isPixelDark ? '#7DD3FC' : '#4E2225'}
                strokeWidth="1.3"
                strokeLinejoin="round"
              />
            )}
            {expr === 'sweet_smile' && (
              <path d="M34.8 50.2 Q40 54.6 45.2 50.2" stroke={strokeMain} strokeWidth="2.2" strokeLinecap="round" fill="none" />
            )}
          </g>
        );
      })()}

      {/* 5. ĐẦU */}
      {category === 'head' && (() => {
        const col = patch.headItemColor || '#E57A6B';
        const style = patch.headItem || 'none';

        if (style === 'none') {
          return (
            <g>
              <circle cx="40" cy="40" r="20" stroke="#B8A490" strokeWidth="2.4" strokeDasharray="4 4" />
              <path d="M28 52 L52 28" stroke="#B8A490" strokeWidth="2.4" strokeLinecap="round" />
            </g>
          );
        }
        if (style === 'beret') {
          return (
            <g>
              <path d="M16 46 C18 28, 38 22, 58 27 C67 30, 68 41, 61 48 C46 44, 30 43, 16 46 Z" fill={col} stroke={outline} strokeWidth="2.2" />
              <path d="M39 24 L42 17" stroke={outline} strokeWidth="2.5" strokeLinecap="round" />
            </g>
          );
        }
        if (style === 'sunhat') {
          return (
            <g>
              <ellipse cx="40" cy="48" rx="30" ry="9" fill={col} stroke={outline} strokeWidth="2.2" />
              <path d="M23 46 C24 27, 56 27, 57 46 Z" fill={shade(col, 14)} stroke={outline} strokeWidth="2.2" />
              <path d="M23 42 Q40 46 57 42" stroke="#E57A6B" strokeWidth="4" fill="none" />
            </g>
          );
        }
        if (style === 'cat_ears') {
          return (
            <g>
              <path d="M20 48 Q40 30 60 48" stroke={outline} strokeWidth="3.5" fill="none" strokeLinecap="round" />
              <path d="M21 43 L17 20 L34 34 Z" fill="#FFFDF8" stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M22 39 L20 26 L30 34 Z" fill={col} />
              <path d="M59 43 L63 20 L46 34 Z" fill="#FFFDF8" stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M58 39 L60 26 L50 34 Z" fill={col} />
            </g>
          );
        }
        if (style === 'flower_crown') {
          return (
            <g>
              <ellipse cx="40" cy="44" rx="24" ry="9" stroke="#5E9E69" strokeWidth="4" fill="none" />
              {[22, 33, 47, 58].map((fx, i) => (
                <g key={fx} transform={`translate(${fx}, ${i === 1 || i === 2 ? 36 : 41})`}>
                  <circle r="6" fill={i % 2 === 0 ? col : '#FFE082'} stroke={outline} strokeWidth="1.6" />
                  <circle r="2.2" fill="#FFFFFF" />
                </g>
              ))}
            </g>
          );
        }
        if (style === 'cap') {
          return (
            <g>
              <path d="M18 46 C18 24, 58 24, 58 46 Z" fill={col} stroke={outline} strokeWidth="2.2" />
              <path d="M22 46 Q46 53 68 47 Q54 41 22 46 Z" fill="#F4EFE6" stroke={outline} strokeWidth="2" />
              <circle cx="38" cy="26" r="2.6" fill="#F4EFE6" stroke={outline} strokeWidth="1.4" />
            </g>
          );
        }
        if (style === 'beanie') {
          return (
            <g>
              <circle cx="40" cy="18" r="6" fill="#F8F4EC" stroke={outline} strokeWidth="2" />
              <path d="M20 44 C20 22, 60 22, 60 44 Z" fill={col} stroke={outline} strokeWidth="2.2" />
              <rect x="17" y="42" width="46" height="10" rx="5" fill={shade(col, -16)} stroke={outline} strokeWidth="2" />
            </g>
          );
        }
        if (style === 'bucket_hat') {
          return (
            <g>
              {/* Downward-sloped Bucket Brim & Tapered Flat Crown */}
              <path d="M12 52 C14 43, 66 43, 68 52 C56 58, 24 58, 12 52 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M22 44 L25 25 C31 22, 49 22, 55 25 L58 44 Z" fill={shade(col, 10)} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M22 42 Q40 45 58 42" stroke={shade(col, -26)} strokeWidth="4" fill="none" />
            </g>
          );
        }
        if (style === 'frog_bucket') {
          return (
            <g>
              <circle cx="31" cy="23" r="6" fill={col} stroke={outline} strokeWidth="2" />
              <circle cx="49" cy="23" r="6" fill={col} stroke={outline} strokeWidth="2" />
              <circle cx="31" cy="23" r="3.6" fill="#FFFFFF" />
              <circle cx="49" cy="23" r="3.6" fill="#FFFFFF" />
              <circle cx="31.5" cy="23" r="1.8" fill="#1B1D24" />
              <circle cx="49.5" cy="23" r="1.8" fill="#1B1D24" />
              <path d="M12 52 C14 43, 66 43, 68 52 C56 58, 24 58, 12 52 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M22 44 L25 25 C31 22, 49 22, 55 25 L58 44 Z" fill={shade(col, 10)} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
            </g>
          );
        }
        if (style === 'chick_hat') {
          return (
            <g>
              <path d="M12 52 C14 43, 66 43, 68 52 C56 58, 24 58, 12 52 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M22 44 L25 24 C31 21, 49 21, 55 24 L58 44 Z" fill={shade(col, 8)} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <ellipse cx="40" cy="39" rx="7" ry="4" fill="#F27E24" stroke={outline} strokeWidth="1.6" />
              <circle cx="33" cy="33" r="2" fill="#1B1D24" />
              <circle cx="47" cy="33" r="2" fill="#1B1D24" />
            </g>
          );
        }
        if (style === 'cloud_bucket') {
          return (
            <g>
              <path d="M12 52 C14 43, 66 43, 68 52 C56 58, 24 58, 12 52 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M22 44 L25 25 C31 22, 49 22, 55 25 L58 44 Z" fill={shade(col, 10)} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <circle cx="36" cy="35" r="4.5" fill="#FFFFFF" />
              <circle cx="42" cy="33" r="5" fill="#FFFFFF" />
              <circle cx="47" cy="36" r="4" fill="#FFFFFF" />
              <circle cx="44" cy="29" r="2.6" fill="#F6C945" />
            </g>
          );
        }
        if (style === 'rainbow_cap') {
          return (
            <g>
              <path d="M18 46 C18 24, 58 24, 58 46 Z" fill={col} stroke={outline} strokeWidth="2.2" />
              <path d="M22 46 Q46 53 68 47 Q54 41 22 46 Z" fill="#F7E4B8" stroke={outline} strokeWidth="2" />
              <path d="M31 38 A8 8 0 0 1 47 38" stroke="#F2646D" strokeWidth="2.5" fill="none" />
              <path d="M33.5 38 A5.5 5.5 0 0 1 44.5 38" stroke="#F6C145" strokeWidth="2.5" fill="none" />
              <path d="M36 38 A3 3 0 0 1 42 38" stroke="#5EA8E8" strokeWidth="2.2" fill="none" />
            </g>
          );
        }
        if (style === 'cc_beanie') {
          return (
            <g>
              <path d="M20 44 C20 22, 60 22, 60 44 Z" fill={col} stroke={outline} strokeWidth="2.2" />
              <rect x="17" y="42" width="46" height="11" rx="5" fill={shade(col, -12)} stroke={outline} strokeWidth="2" />
              <text x="40" y="39" textAnchor="middle" fontSize="9.5" fontWeight="800" fill="#FFF8EE">CC</text>
            </g>
          );
        }
        if (style === 'angel_halo') {
          return (
            <g>
              <ellipse cx="40" cy="40" rx="22" ry="8" fill="none" stroke="#F7D558" strokeWidth="5.5" />
              <ellipse cx="40" cy="40" rx="22" ry="8" fill="none" stroke="#FFFCE6" strokeWidth="2.4" />
            </g>
          );
        }
        if (style === 'non_la') {
          return (
            <g>
              <path d="M10 52 L40 20 L70 52 Q40 59 10 52 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M22 41 Q40 45 58 41 M29 33 Q40 36 51 33" stroke={shade(col, -25)} strokeWidth="1.4" fill="none" />
              <path d="M24 53 Q40 66 56 53" stroke="#E0607E" strokeWidth="2" fill="none" />
            </g>
          );
        }
        if (style === 'khan_dong') {
          return (
            <g>
              <ellipse cx="40" cy="42" rx="24" ry="12" fill={col} stroke={outline} strokeWidth="2.2" />
              <ellipse cx="40" cy="39" rx="20" ry="9" fill={shade(col, 14)} stroke="#F4C95D" strokeWidth="1.6" />
              <path d="M21 43 Q40 50 59 43" stroke="#F4C95D" strokeWidth="2" fill="none" />
              <circle cx="40" cy="40" r="3.5" fill="#F4C95D" stroke={outline} strokeWidth="1.1" />
            </g>
          );
        }
        if (style === 'bunny_beanie') {
          return (
            <g>
              <ellipse cx="29" cy="21" rx="5.5" ry="12" transform="rotate(-10 29 21)" fill={col} stroke={outline} strokeWidth="2" />
              <ellipse cx="51" cy="21" rx="5.5" ry="12" transform="rotate(10 51 21)" fill={col} stroke={outline} strokeWidth="2" />
              <ellipse cx="29" cy="22" rx="2.5" ry="7" transform="rotate(-10 29 22)" fill="#F9B8CB" />
              <ellipse cx="51" cy="22" rx="2.5" ry="7" transform="rotate(10 51 22)" fill="#F9B8CB" />
              <path d="M20 48 C20 27, 60 27, 60 48 Z" fill={col} stroke={outline} strokeWidth="2.2" />
              <rect x="17" y="46" width="46" height="10" rx="5" fill={shade(col, -16)} stroke={outline} strokeWidth="2" />
            </g>
          );
        }
        if (style === 'royal_crown') {
          return (
            <g>
              <path d="M18 52 L21 28 L31 38 L40 22 L49 38 L59 28 L62 52 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <rect x="17" y="50" width="46" height="7" rx="3" fill={shade(col, -18)} stroke={outline} strokeWidth="1.8" />
              <circle cx="40" cy="43" r="3.5" fill="#E84A66" stroke={outline} strokeWidth="1.1" />
              <circle cx="28" cy="44" r="2.6" fill="#46A8E8" stroke={outline} strokeWidth="1" />
              <circle cx="52" cy="44" r="2.6" fill="#46A8E8" stroke={outline} strokeWidth="1" />
            </g>
          );
        }
        if (style === 'headphone') {
          return (
            <g>
              <path d="M20 44 C20 18, 60 18, 60 44" stroke={col} strokeWidth="5.5" fill="none" strokeLinecap="round" />
              <rect x="13" y="37" width="11" height="20" rx="5" fill={col} stroke={outline} strokeWidth="2" />
              <rect x="56" y="37" width="11" height="20" rx="5" fill={col} stroke={outline} strokeWidth="2" />
              <circle cx="18.5" cy="47" r="2.5" fill="#FFFFFF" />
              <circle cx="61.5" cy="47" r="2.5" fill="#FFFFFF" />
            </g>
          );
        }
        if (style === 'picnic_bonnet') {
          return (
            <g>
              <path d="M16 48 C18 22, 62 22, 64 48 C56 44, 24 44, 16 48 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M24 28 H56 M19 37 H61 M33 25 V45 M47 25 V45" stroke="#FFFFFF" strokeWidth="2.5" opacity="0.85" />
              <path d="M21 47 L16 61 M59 47 L64 61" stroke={col} strokeWidth="4" strokeLinecap="round" />
            </g>
          );
        }
        if (style === 'vampire_giant_bow') {
          return (
            <g>
              <path d="M40 34 L15 20 L21 44 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M40 34 L65 20 L59 44 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M36 37 L24 58 L33 55 Z M44 37 L56 58 L47 55 Z" fill={shade(col, -18)} stroke={outline} strokeWidth="1.8" strokeLinejoin="round" />
              <circle cx="40" cy="34" r="6" fill={shade(col, -15)} stroke={outline} strokeWidth="2" />
            </g>
          );
        }
        if (style === 'sunflower_hat') {
          return (
            <g>
              <ellipse cx="40" cy="49" rx="31" ry="9.5" fill={col} stroke={outline} strokeWidth="2.2" />
              <path d="M23 46 C24 26, 56 26, 57 46 Z" fill="#FFE066" stroke={outline} strokeWidth="2.2" />
              <circle cx="27" cy="39" r="7" fill="#F9B826" stroke={outline} strokeWidth="1.5" />
              <circle cx="27" cy="39" r="3.2" fill="#5C3A21" />
            </g>
          );
        }
        if (style === 'pompom_sleep_mask') {
          return (
            <g>
              <ellipse cx="18" cy="44" rx="6" ry="12" transform="rotate(15 18 44)" fill={col} stroke={outline} strokeWidth="2" />
              <ellipse cx="62" cy="44" rx="6" ry="12" transform="rotate(-15 62 44)" fill={col} stroke={outline} strokeWidth="2" />
              <ellipse cx="40" cy="42" rx="22" ry="15" fill={col} stroke={outline} strokeWidth="2.2" />
              <ellipse cx="40" cy="27" rx="10" ry="4.5" fill="#6D442B" stroke={outline} strokeWidth="1.8" />
              <circle cx="32" cy="41" r="2" fill="#2A1D18" />
              <circle cx="48" cy="41" r="2" fill="#2A1D18" />
              <path d="M36 46 Q38 49 40 46 Q42 49 44 46" stroke="#2A1D18" strokeWidth="1.8" fill="none" strokeLinecap="round" />
            </g>
          );
        }
        if (style === 'pompom_ear_hood') {
          return (
            <g>
              <path d="M19 36 C12 44, 11 58, 17 64 C22 64, 24 54, 24 44 Z" fill={col} stroke={outline} strokeWidth="2" />
              <path d="M61 36 C68 44, 69 58, 63 64 C58 64, 56 54, 56 44 Z" fill={col} stroke={outline} strokeWidth="2" />
              <circle cx="17" cy="64" r="4" fill="#FFFFFF" stroke={outline} strokeWidth="1.5" />
              <circle cx="63" cy="64" r="4" fill="#FFFFFF" stroke={outline} strokeWidth="1.5" />
              <path d="M21 48 C21 24, 59 24, 59 48 Z" fill={col} stroke={outline} strokeWidth="2.2" />
              <ellipse cx="40" cy="25" rx="11" ry="4.8" fill="#6D442B" stroke={outline} strokeWidth="1.8" />
            </g>
          );
        }
        if (style === 'witch_giant_bow') {
          return (
            <g>
              <path d="M18 53 Q40 31 62 53" stroke={col} strokeWidth="4.5" fill="none" strokeLinecap="round" />
              <path d="M40 33 L15 16 L20 42 Z" fill={col} stroke={outline} strokeWidth="2.1" strokeLinejoin="round" />
              <path d="M40 33 L65 16 L60 42 Z" fill={col} stroke={outline} strokeWidth="2.1" strokeLinejoin="round" />
              <ellipse cx="40" cy="33" rx="6" ry="5" fill={shade(col, -18)} stroke={outline} strokeWidth="1.8" />
            </g>
          );
        }
        // ribbon_bow
        return (
          <g>
            <path d="M19 52 Q40 30 61 52" stroke={col} strokeWidth="4" fill="none" strokeLinecap="round" />
            <path d="M40 32 L24 22 L28 38 Z" fill={col} stroke={outline} strokeWidth="2" strokeLinejoin="round" />
            <path d="M40 32 L56 22 L52 38 Z" fill={col} stroke={outline} strokeWidth="2" strokeLinejoin="round" />
            <circle cx="40" cy="32" r="4.5" fill={shade(col, -20)} stroke={outline} strokeWidth="1.8" />
          </g>
        );
      })()}

      {/* 5. PHỤ KIỆN */}
      {category === 'accessories' && (() => {
        const col = patch.accessoryColor || '#5E4638';
        const style = patch.accessory || 'none';

        if (style === 'none') {
          return (
            <g>
              <circle cx="40" cy="40" r="20" stroke="#B8A490" strokeWidth="2.4" strokeDasharray="4 4" />
              <path d="M28 52 L52 28" stroke="#B8A490" strokeWidth="2.4" strokeLinecap="round" />
            </g>
          );
        }
        if (style === 'glasses' || style === 'sunglasses') {
          const isSun = style === 'sunglasses';
          return (
            <g>
              <circle cx="25" cy="42" r="11" fill={isSun ? '#1F232B' : 'rgba(255,255,255,0.45)'} stroke={col} strokeWidth="3" />
              <circle cx="55" cy="42" r="11" fill={isSun ? '#1F232B' : 'rgba(255,255,255,0.45)'} stroke={col} strokeWidth="3" />
              <path d="M36 42 H44" stroke={col} strokeWidth="2.8" />
              {isSun && <path d="M19 38 L25 35 M49 38 L55 35" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" opacity="0.65" />}
            </g>
          );
        }
        if (style === 'scarf') {
          return (
            <g>
              {/* Layered Soft Under-Tail */}
              <path d="M35 36 H46 L48 59 H34 Z" fill={shade(col, -18)} stroke={outline} strokeWidth="2" strokeLinejoin="round" />
              <path d="M34.5 54 H47.5" stroke="#FFF8EE" strokeWidth="2.2" />
              <path d="M37 59 V63 M41 59 V63 M45 59 V63" stroke={outline} strokeWidth="1.6" strokeLinecap="round" />
              {/* Primary Draped Tail */}
              <path d="M44 35 H56 L59 63 H44 Z" fill={col} stroke={outline} strokeWidth="2.1" strokeLinejoin="round" />
              <path d="M44.5 58 H58.5" stroke="#FFF8EE" strokeWidth="2.4" />
              <path d="M46 63 V67 M51 63 V67 M56 63 V67" stroke={outline} strokeWidth="1.7" strokeLinecap="round" />
              {/* Double-Tiered Plush Collar & Rib Bands */}
              <rect x="16" y="21" width="48" height="17" rx="8.5" fill={col} stroke={outline} strokeWidth="2.2" />
              <rect x="20" y="18" width="40" height="11" rx="5.5" fill={shade(col, 16)} stroke={outline} strokeWidth="1.9" />
              <path d="M27 21 L24 38 M53 21 L56 38" stroke="#FFF8EE" strokeWidth="2.4" strokeLinecap="round" />
              {/* Plump Cross-Knot */}
              <rect x="41" y="29" width="15" height="11" rx="5" fill={shade(col, 14)} stroke={outline} strokeWidth="2" />
            </g>
          );
        }
        if (style === 'star_glasses') {
          return (
            <g>
              <polygon points="24,28 27,36 36,36 29,42 32,50 24,45 16,50 19,42 12,36 21,36" fill={col} stroke={outline} strokeWidth="2" strokeLinejoin="round" />
              <polygon points="56,28 59,36 68,36 61,42 64,50 56,45 48,50 51,42 44,36 53,36" fill={col} stroke={outline} strokeWidth="2" strokeLinejoin="round" />
              <path d="M35 39 H45" stroke="#F4C95D" strokeWidth="2.8" />
            </g>
          );
        }
        if (style === 'pearl_ribbon_choker') {
          return (
            <g>
              <rect x="20" y="30" width="40" height="8" rx="4" fill={col} stroke={outline} strokeWidth="2" />
              <path d="M40 36 L30 29 L31 41 Z M40 36 L50 29 L49 41 Z" fill={col} stroke={outline} strokeWidth="1.6" strokeLinejoin="round" />
              <circle cx="40" cy="36" r="3.4" fill="#FFFDF8" stroke={outline} strokeWidth="1.4" />
              <circle cx="40" cy="44" r="3" fill="#FFFDF8" stroke={outline} strokeWidth="1.3" />
            </g>
          );
        }
        if (style === 'camera_strap') {
          return (
            <g>
              <rect x="17" y="25" width="46" height="32" rx="6" fill={col} stroke={outline} strokeWidth="2.2" />
              <rect x="17" y="25" width="46" height="10" rx="4" fill="#D8E0E8" stroke={outline} strokeWidth="1.8" />
              <rect x="32" y="19" width="16" height="7" rx="2" fill="#D8E0E8" stroke={outline} strokeWidth="1.5" />
              <circle cx="55" cy="22" r="2.6" fill="#E8EDF2" stroke={outline} strokeWidth="1.3" />
              <rect x="21" y="28" width="7" height="4" rx="1" fill="#465362" />
              <circle cx="41" cy="43" r="10.5" fill="#2A313D" stroke="#E8EDF2" strokeWidth="2.4" />
              <circle cx="41" cy="43" r="5" fill="#4EA8E8" stroke="#1E2530" strokeWidth="1.2" />
              <circle cx="38.5" cy="40.5" r="1.8" fill="#FFFFFF" opacity="0.85" />
            </g>
          );
        }
        if (style === 'vampire_cross_earring') {
          return (
            <g>
              <circle cx="40" cy="25" r="7" fill="none" stroke="#DCE2EA" strokeWidth="3" />
              <rect x="37" y="32" width="6" height="32" rx="1.5" fill={col} stroke={outline} strokeWidth="1.5" />
              <rect x="28" y="40" width="24" height="6" rx="1.5" fill={col} stroke={outline} strokeWidth="1.5" />
            </g>
          );
        }
        // pearl_necklace
        return (
          <g>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
              const t = (i / 8) * Math.PI;
              const px = 40 - Math.cos(t) * 20;
              const py = 28 + Math.sin(t) * 22;
              return (
                <circle
                  key={i}
                  cx={px}
                  cy={py}
                  r="4.2"
                  fill={col}
                  stroke={outline}
                  strokeWidth="1.5"
                />
              );
            })}
          </g>
        );
      })()}

      {/* 5B. BALO / CÁNH */}
      {category === 'backpacks' && (() => {
        const col = patch.backpackColor || '#5CC4DF';
        const style = patch.backpack || 'none';

        if (style === 'none') {
          return (
            <g>
              <circle cx="40" cy="40" r="20" stroke="#B8A490" strokeWidth="2.4" strokeDasharray="4 4" />
              <path d="M28 52 L52 28" stroke="#B8A490" strokeWidth="2.4" strokeLinecap="round" />
            </g>
          );
        }
        if (style === 'fish_plush') {
          return (
            <g>
              <rect x="23" y="21" width="34" height="36" rx="14" fill={col} stroke={outline} strokeWidth="2.2" />
              <ellipse cx="40" cy="47" rx="11" ry="7" fill="#92E0F2" />
              <circle cx="34" cy="31" r="4.2" fill="#FFFFFF" stroke={outline} strokeWidth="1.4" />
              <circle cx="46" cy="31" r="4.2" fill="#FFFFFF" stroke={outline} strokeWidth="1.4" />
              <circle cx="34" cy="31" r="1.8" fill="#1B1D24" />
              <circle cx="46" cy="31" r="1.8" fill="#1B1D24" />
              <ellipse cx="40" cy="39" rx="7.5" ry="3.2" fill="#F79AB6" stroke={outline} strokeWidth="1.3" />
              <path d="M30 57 V64 M50 57 V64" stroke="#3D9EC0" strokeWidth="4.5" strokeLinecap="round" />
            </g>
          );
        }
        if (style === 'lamb_plush') {
          return (
            <g>
              <circle cx="24" cy="32" r="7" fill={col} stroke={outline} strokeWidth="1.8" />
              <circle cx="56" cy="32" r="7" fill={col} stroke={outline} strokeWidth="1.8" />
              <rect x="27" y="42" width="26" height="20" rx="8" fill="#FFF8F0" stroke={outline} strokeWidth="2" />
              <circle cx="40" cy="31" r="14" fill={col} stroke={outline} strokeWidth="2.2" />
              <circle cx="40" cy="32" r="9.5" fill="#FFF8F0" />
              <circle cx="36" cy="31" r="1.6" fill="#221E24" />
              <circle cx="44" cy="31" r="1.6" fill="#221E24" />
              <circle cx="33" cy="34" r="2" fill="#F79AB4" />
              <circle cx="47" cy="34" r="2" fill="#F79AB4" />
            </g>
          );
        }
        if (style === 'chick_plush') {
          return (
            <g>
              <rect x="23" y="21" width="34" height="36" rx="11" fill={col} stroke={outline} strokeWidth="2.2" />
              <circle cx="34" cy="33" r="1.8" fill="#221E24" />
              <circle cx="46" cy="33" r="1.8" fill="#221E24" />
              <ellipse cx="40" cy="38" rx="4.2" ry="2.4" fill="#F28B30" stroke={outline} strokeWidth="1.2" />
              <path d="M31 57 V64 M49 57 V64" stroke="#F28B30" strokeWidth="4" strokeLinecap="round" />
            </g>
          );
        }
        if (style === 'bee_plush') {
          return (
            <g>
              <ellipse cx="30" cy="23" rx="6" ry="4" fill="#FFFFFF" stroke={outline} strokeWidth="1.6" />
              <ellipse cx="50" cy="23" rx="6" ry="4" fill="#FFFFFF" stroke={outline} strokeWidth="1.6" />
              <circle cx="40" cy="41" r="17" fill={col} stroke={outline} strokeWidth="2.2" />
              <path d="M24 44 H56" stroke="#3E281D" strokeWidth="5" />
              <circle cx="34" cy="36" r="1.8" fill="#1B1D24" />
              <circle cx="46" cy="36" r="1.8" fill="#1B1D24" />
            </g>
          );
        }
        if (style === 'honey_bear') {
          return (
            <g>
              <circle cx="27" cy="22" r="5" fill={col} stroke={outline} strokeWidth="1.8" />
              <circle cx="53" cy="22" r="5" fill={col} stroke={outline} strokeWidth="1.8" />
              <rect x="23" y="23" width="34" height="37" rx="10" fill="#5C341F" stroke={outline} strokeWidth="2.2" />
              <path d="M23 32 C23 24, 57 24, 57 32 V40 Q48 44 43 38 Q36 45 30 39 Q25 43 23 40 Z" fill={col} stroke={outline} strokeWidth="1.8" />
            </g>
          );
        }
        if (style === 'carrot_basket') {
          return (
            <g>
              <path d="M31 29 L34 15 M40 29 V13 M49 29 L46 15" stroke="#4FA84B" strokeWidth="4.5" strokeLinecap="round" />
              <path d="M31 32 L34 21 M40 32 V19 M49 32 L46 21" stroke="#F46B25" strokeWidth="6" strokeLinecap="round" />
              <path d="M24 31 H56 L51 61 H29 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M23 31 H57" stroke="#C68A4B" strokeWidth="4" strokeLinecap="round" />
            </g>
          );
        }
        if (style === 'bunny_plush') {
          return (
            <g>
              <ellipse cx="31" cy="21" rx="4.5" ry="11" transform="rotate(-10 31 21)" fill={col} stroke={outline} strokeWidth="1.9" />
              <ellipse cx="49" cy="21" rx="4.5" ry="11" transform="rotate(10 49 21)" fill={col} stroke={outline} strokeWidth="1.9" />
              <rect x="23" y="27" width="34" height="35" rx="14" fill={col} stroke={outline} strokeWidth="2.2" />
              <circle cx="34" cy="39" r="1.8" fill="#221E24" />
              <circle cx="46" cy="39" r="1.8" fill="#221E24" />
              <circle cx="40" cy="43" r="1.8" fill="#F285A6" />
              <circle cx="31" cy="44" r="2.3" fill="#FAD0DF" />
              <circle cx="49" cy="44" r="2.3" fill="#FAD0DF" />
            </g>
          );
        }
        if (style === 'strawberry_bear') {
          return (
            <g>
              <circle cx="27" cy="25" r="5" fill={col} stroke={outline} strokeWidth="1.8" />
              <circle cx="53" cy="25" r="5" fill={col} stroke={outline} strokeWidth="1.8" />
              <rect x="23" y="24" width="34" height="36" rx="13" fill={col} stroke={outline} strokeWidth="2.2" />
              <ellipse cx="40" cy="44" rx="7" ry="5" fill="#FFF2F6" />
              <circle cx="34" cy="37" r="1.8" fill="#221E24" />
              <circle cx="46" cy="37" r="1.8" fill="#221E24" />
              <circle cx="40" cy="43" r="2" fill="#D84D6B" />
              <circle cx="40" cy="54" r="3.5" fill="#EE4B6A" stroke="#5AA85B" strokeWidth="1.5" />
            </g>
          );
        }
        if (style === 'astro_pack') {
          return (
            <g>
              <rect x="22" y="21" width="36" height="38" rx="9" fill={col} stroke={outline} strokeWidth="2.2" />
              <circle cx="40" cy="37" r="8" fill="#77D4FA" stroke="#2D3748" strokeWidth="2" />
              <rect x="26" y="49" width="28" height="6" rx="2" fill="#F29F3D" />
              <path d="M29 59 V66 M51 59 V66" stroke="#FF7B42" strokeWidth="4.5" strokeLinecap="round" />
            </g>
          );
        }
        if (style === 'crystal_wings') {
          return (
            <g>
              <path d="M37 40 C24 20, 9 20, 12 37 C14 45, 25 46, 37 43 Z" fill={col} stroke={outline} strokeWidth="2" />
              <path d="M37 44 C26 45, 16 53, 21 62 C27 66, 35 55, 37 47 Z" fill={shade(col, 24)} stroke={outline} strokeWidth="1.8" />
              <path d="M43 40 C56 20, 71 20, 68 37 C66 45, 55 46, 43 43 Z" fill={col} stroke={outline} strokeWidth="2" />
              <path d="M43 44 C54 45, 64 53, 59 62 C53 66, 45 55, 43 47 Z" fill={shade(col, 24)} stroke={outline} strokeWidth="1.8" />
              <circle cx="40" cy="42" r="3.5" fill="#F5C953" stroke={outline} strokeWidth="1.3" />
            </g>
          );
        }
        if (style === 'goose_cross_bag') {
          return (
            <g>
              <rect x="25" y="34" width="30" height="27" rx="12" fill={col} stroke={outline} strokeWidth="2.2" />
              <ellipse cx="40" cy="50" rx="10" ry="7" fill="#F1F5FA" />
              <path d="M36 35 C36 22, 44 20, 45 31" fill={col} stroke={outline} strokeWidth="2" />
              <ellipse cx="47" cy="25" rx="5.5" ry="2.6" fill="#F28B30" stroke={outline} strokeWidth="1.3" />
              <circle cx="41.5" cy="24.5" r="1.5" fill="#1B1D24" />
              <path d="M40 32 L35 29 L36 35 Z M40 32 L45 29 L44 35 Z" fill="#E65A5A" stroke={outline} strokeWidth="1" />
              <path d="M33 61 V66 M47 61 V66" stroke="#F28B30" strokeWidth="3.5" strokeLinecap="round" />
            </g>
          );
        }
        if (style === 'student_bag_gingham') {
          return (
            <g>
              <path d="M28 32 C28 14, 52 14, 52 32" stroke={col} strokeWidth="5.2" strokeLinecap="round" fill="none" />
              <path d="M28 32 C28 14, 52 14, 52 32" stroke="#FFFFFF" strokeWidth="2.2" strokeDasharray="3.5 3.5" fill="none" />
              <rect x="22" y="31" width="36" height="31" rx="6" fill="#FFFFFF" stroke={outline} strokeWidth="2.2" />
              <rect x="24" y="33" width="32" height="27" rx="4" fill={col} opacity="0.88" />
              <path d="M30 33 V60 M40 33 V60 M50 33 V60 M24 41 H56 M24 50 H56" stroke="#FFFFFF" strokeWidth="3" opacity="0.82" />
              <rect x="22" y="31" width="36" height="31" rx="6" fill="none" stroke={outline} strokeWidth="2.2" />
            </g>
          );
        }
        if (style === 'student_bag_brown' || style === 'student_bag_navy') {
          const trim = style === 'student_bag_navy' ? '#F4EFE6' : '#E9C259';
          return (
            <g>
              <path d="M27 32 C27 14, 53 14, 53 32" stroke={shade(col, -16)} strokeWidth="4.5" strokeLinecap="round" fill="none" />
              <rect x="20" y="31" width="40" height="30" rx="7" fill={col} stroke={outline} strokeWidth="2.2" />
              <path d="M20 35 C20 31, 60 31, 60 35 V47 H20 Z" fill={shade(col, -12)} stroke={outline} strokeWidth="2" />
              <rect x="36" y="44" width="8" height="7" rx="2" fill={trim} stroke={outline} strokeWidth="1.4" />
            </g>
          );
        }
        // angel_wings
        return (
          <g>
            <path d="M36 42 C25 22, 10 18, 9 30 C9 37, 17 41, 24 41 C15 44, 14 52, 22 54 C28 55, 34 49, 37 45 Z" fill={col} stroke={outline} strokeWidth="2" strokeLinejoin="round" />
            <path d="M44 42 C55 22, 70 18, 71 30 C71 37, 63 41, 56 41 C65 44, 66 52, 58 54 C52 55, 46 49, 43 45 Z" fill={col} stroke={outline} strokeWidth="2" strokeLinejoin="round" />
            <circle cx="40" cy="43" r="3.2" fill="#F2C85B" stroke={outline} strokeWidth="1.3" />
          </g>
        );
      })()}

      {/* 6. GIÀY */}
      {category === 'shoes' && (() => {
        const col = patch.shoeColor || '#3A2B2B';
        const style = patch.shoes || 'mary_janes';

        if (style === 'crocs_fish') {
          return (
            <g>
              <path d="M14 48 H66 C66 58, 56 61, 40 61 C24 61, 14 58, 14 48 Z" fill="#F28AA8" stroke={outline} strokeWidth="2.1" />
              <path d="M16 50 C16 28, 64 28, 64 50 Z" fill="#5AC4DF" stroke={outline} strokeWidth="2.2" />
              <path d="M17 44 Q14 33 24 31" stroke="#399DB8" strokeWidth="4.5" strokeLinecap="round" fill="none" />
              <circle cx="32" cy="29" r="5.5" fill="#FFFFFF" stroke={outline} strokeWidth="1.7" />
              <circle cx="48" cy="29" r="5.5" fill="#FFFFFF" stroke={outline} strokeWidth="1.7" />
              <circle cx="32" cy="29" r="2.3" fill="#1B1D24" />
              <circle cx="48" cy="29" r="2.3" fill="#1B1D24" />
              <circle cx="30" cy="39" r="1.7" fill="#2A6577" />
              <circle cx="40" cy="37" r="1.7" fill="#2A6577" />
              <circle cx="50" cy="39" r="1.7" fill="#2A6577" />
              <ellipse cx="40" cy="46" rx="8" ry="3.6" fill="#F79AB6" stroke={outline} strokeWidth="1.4" />
            </g>
          );
        }
        if (style === 'crocs_panda') {
          return (
            <g>
              <path d="M14 48 H66 C66 58, 56 61, 40 61 C24 61, 14 58, 14 48 Z" fill="#3675DE" stroke={outline} strokeWidth="2.1" />
              <circle cx="25" cy="29" r="5.5" fill="#222228" />
              <circle cx="55" cy="29" r="5.5" fill="#222228" />
              <path d="M16 50 C16 28, 64 28, 64 50 Z" fill="#FFFFFF" stroke={outline} strokeWidth="2.2" />
              <path d="M17 44 Q14 33 24 31" stroke="#222228" strokeWidth="4.2" strokeLinecap="round" fill="none" />
              <ellipse cx="32" cy="40" rx="4.6" ry="3.5" fill="#222228" />
              <ellipse cx="48" cy="40" rx="4.6" ry="3.5" fill="#222228" />
              <circle cx="32" cy="40" r="1.6" fill="#FFFFFF" />
              <circle cx="48" cy="40" r="1.6" fill="#FFFFFF" />
              <ellipse cx="40" cy="46" rx="3.2" ry="2" fill="#222228" />
            </g>
          );
        }
        if (style === 'crocs_chick') {
          return (
            <g>
              <path d="M14 48 H66 C66 58, 56 61, 40 61 C24 61, 14 58, 14 48 Z" fill="#E88A2C" stroke={outline} strokeWidth="2.1" />
              <path d="M16 50 C16 28, 64 28, 64 50 Z" fill="#F8CE48" stroke={outline} strokeWidth="2.2" />
              <path d="M17 44 Q14 33 24 31" stroke="#D97E26" strokeWidth="4.2" strokeLinecap="round" fill="none" />
              <circle cx="32" cy="38" r="2.2" fill="#1B1D24" />
              <circle cx="48" cy="38" r="2.2" fill="#1B1D24" />
              <ellipse cx="40" cy="45" rx="7.2" ry="3.5" fill="#F27E24" stroke={outline} strokeWidth="1.4" />
            </g>
          );
        }
        if (style === 'crocs_frog') {
          return (
            <g>
              <path d="M14 48 H66 C66 58, 56 61, 40 61 C24 61, 14 58, 14 48 Z" fill="#F2E7B8" stroke={outline} strokeWidth="2.1" />
              <circle cx="30" cy="29" r="5.8" fill="#6CC763" stroke={outline} strokeWidth="1.8" />
              <circle cx="50" cy="29" r="5.8" fill="#6CC763" stroke={outline} strokeWidth="1.8" />
              <path d="M16 50 C16 29, 64 29, 64 50 Z" fill="#6CC763" stroke={outline} strokeWidth="2.2" />
              <circle cx="30" cy="29" r="3.3" fill="#FFFFFF" />
              <circle cx="50" cy="29" r="3.3" fill="#FFFFFF" />
              <circle cx="30" cy="29" r="1.6" fill="#1B1D24" />
              <circle cx="50" cy="29" r="1.6" fill="#1B1D24" />
              <circle cx="28" cy="43" r="2.8" fill="#F697AE" />
              <circle cx="52" cy="43" r="2.8" fill="#F697AE" />
            </g>
          );
        }
        if (style === 'crocs_bunny') {
          return (
            <g>
              <path d="M14 48 H66 C66 58, 56 61, 40 61 C24 61, 14 58, 14 48 Z" fill="#FFFDF8" stroke={outline} strokeWidth="2.1" />
              <ellipse cx="31" cy="24" rx="4" ry="10" transform="rotate(-12 31 24)" fill={col} stroke={outline} strokeWidth="1.8" />
              <ellipse cx="49" cy="24" rx="4" ry="10" transform="rotate(12 49 24)" fill={col} stroke={outline} strokeWidth="1.8" />
              <path d="M16 50 C16 29, 64 29, 64 50 Z" fill={col} stroke={outline} strokeWidth="2.2" />
              <circle cx="32" cy="40" r="2" fill="#1B1D24" />
              <circle cx="48" cy="40" r="2" fill="#1B1D24" />
              <circle cx="40" cy="44" r="2.2" fill="#F16E94" />
            </g>
          );
        }
        if (style === 'crocs_dino') {
          return (
            <g>
              <path d="M14 48 H66 C66 58, 56 61, 40 61 C24 61, 14 58, 14 48 Z" fill="#E8F0D8" stroke={outline} strokeWidth="2.1" />
              <polygon points="34,26 40,18 46,26" fill="#F09A3E" stroke={outline} strokeWidth="1.5" />
              <path d="M16 50 C16 29, 64 29, 64 50 Z" fill={col} stroke={outline} strokeWidth="2.2" />
              <circle cx="32" cy="39" r="3" fill="#FFFFFF" stroke={outline} strokeWidth="1.2" />
              <circle cx="48" cy="39" r="3" fill="#FFFFFF" stroke={outline} strokeWidth="1.2" />
              <circle cx="32" cy="39" r="1.5" fill="#1B1D24" />
              <circle cx="48" cy="39" r="1.5" fill="#1B1D24" />
              <path d="M31 47 H49" stroke="#FFFFFF" strokeWidth="2.5" strokeDasharray="3 2" />
            </g>
          );
        }
        if (style === 'rain_boots') {
          const rim = col === '#F5E7C6' ? '#E5A832' : '#FFFFFF';
          return (
            <g>
              <path d="M25 18 H42 V46 L59 48 C63 49, 64 58, 59 59 H24 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M24 20 H43" stroke={rim} strokeWidth="4" strokeLinecap="round" />
              <path d="M24 55 H60" stroke={rim} strokeWidth="4" strokeLinecap="round" />
            </g>
          );
        }
        if (style === 'boots') {
          return (
            <g>
              <path d="M25 20 H42 V46 L59 48 C63 49, 64 58, 59 59 H24 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M24 55 H60" stroke="#2D1E17" strokeWidth="3.5" strokeLinecap="round" />
            </g>
          );
        }
        if (style === 'sneakers') {
          return (
            <g>
              <path d="M18 35 L33 31 L46 42 L62 45 C65 46, 65 56, 61 57 H18 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M18 52 H62" stroke="#D5DCE4" strokeWidth="4" strokeLinecap="round" />
              <path d="M37 36 L41 34 M41 39 L45 37" stroke="#9AA5B4" strokeWidth="1.8" strokeLinecap="round" />
            </g>
          );
        }
        if (style === 'loafers') {
          return (
            <g>
              <path d="M18 38 C24 38, 28 33, 35 33 L46 43 L61 45 C65 46, 65 56, 60 57 H19 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <rect x="33" y="40" width="11" height="4" rx="2" fill={shade(col, -25)} stroke={outline} strokeWidth="1.3" />
            </g>
          );
        }
        if (style === 'platform_sneakers') {
          return (
            <g>
              <path d="M17 33 L33 29 L47 41 L62 43 C65 44, 65 53, 61 54 H17 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <rect x="16" y="51" width="48" height="9" rx="3.5" fill="#FFFFFF" stroke={outline} strokeWidth="2" />
              <path d="M36 35 L40 33 M40 38 L44 36" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
            </g>
          );
        }
        if (style === 'ribbon_heels') {
          return (
            <g>
              <path d="M18 42 C24 51, 39 51, 46 42 L61 46 C65 48, 65 55, 60 56 H22 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <rect x="20" y="55" width="7" height="7" rx="1.5" fill={shade(col, -25)} stroke={outline} strokeWidth="1.5" />
              <path d="M47 43 L42 37 L47 40 L52 37 Z" fill="#FFFDF8" stroke={outline} strokeWidth="1.2" />
            </g>
          );
        }
        if (style === 'vampire_buckle_boots') {
          return (
            <g>
              <path d="M25 18 H42 V46 L60 48 C64 49, 64 58, 59 59 H24 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M24 56 H60" stroke="#C9182B" strokeWidth="3.5" strokeLinecap="round" />
              <rect x="24" y="25" width="19" height="4" fill="#C9182B" />
              <rect x="24" y="34" width="19" height="4" fill="#C9182B" />
              <rect x="24" y="43" width="19" height="4" fill="#C9182B" />
              <rect x="31" y="24.5" width="5" height="5" fill="none" stroke="#DCE2EA" strokeWidth="1.4" />
              <rect x="31" y="33.5" width="5" height="5" fill="none" stroke="#DCE2EA" strokeWidth="1.4" />
              <rect x="31" y="42.5" width="5" height="5" fill="none" stroke="#DCE2EA" strokeWidth="1.4" />
            </g>
          );
        }
        if (style === 'goose_slippers') {
          return (
            <g>
              <path d="M14 48 H66 C66 58, 56 61, 40 61 C24 61, 14 58, 14 48 Z" fill={col} stroke={outline} strokeWidth="2.1" />
              <path d="M18 49 C18 35, 60 35, 60 49 Z" fill={shade(col, 12)} stroke={outline} strokeWidth="2" />
              <circle cx="40" cy="34" r="8" fill="#FFFFFF" stroke={outline} strokeWidth="1.8" />
              <ellipse cx="47" cy="35" rx="4.5" ry="2.5" fill="#F28B30" stroke={outline} strokeWidth="1.2" />
              <circle cx="38" cy="32" r="1.5" fill="#1B1D24" />
              <path d="M37 42 L32 39 L33 44 Z M37 42 L42 39 L41 44 Z" fill="#E65A5A" />
            </g>
          );
        }
        if (style === 'pompom_slippers') {
          return (
            <g>
              <path d="M14 48 H66 C66 58, 56 61, 40 61 C24 61, 14 58, 14 48 Z" fill="#E8B944" stroke={outline} strokeWidth="2.1" />
              <path d="M17 49 C17 31, 63 31, 63 49 Z" fill={col} stroke={outline} strokeWidth="2.2" />
              <ellipse cx="40" cy="32" rx="7" ry="3.2" fill="#6D442B" stroke={outline} strokeWidth="1.4" />
              <circle cx="33" cy="40" r="1.7" fill="#2A1D18" />
              <circle cx="47" cy="40" r="1.7" fill="#2A1D18" />
              <path d="M37 44 Q38.5 46.5 40 44 Q41.5 46.5 43 44" stroke="#2A1D18" strokeWidth="1.6" fill="none" />
            </g>
          );
        }
        if (style === 'witch_mary_janes') {
          return (
            <g>
              <path d="M24 22 H40 V45 H24 Z" fill="#D98A1A" stroke={outline} strokeWidth="1.8" />
              <path d="M18 42 C22 50, 38 50, 44 42 L59 46 C64 48, 64 56, 59 57 H19 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M29 44 Q33 36 39 42" stroke={col} strokeWidth="3.2" fill="none" />
              <path d="M29 44 Q33 36 39 42" stroke={outline} strokeWidth="1.4" fill="none" />
            </g>
          );
        }
        if (style === 'midautumn_girl_boots') {
          return (
            <g>
              <path d="M23 23 H41 L43 44 H58 C63 46, 63 57, 57 57 H21 Z" fill="#FFFFFF" stroke={outline} strokeWidth="2.1" strokeLinejoin="round" />
              <path d="M22 46 H58 C62 48, 62 56, 57 57 H21 Z" fill={col} stroke={outline} strokeWidth="1.8" strokeLinejoin="round" />
              <path d="M23 24 H41" stroke={col} strokeWidth="2.8" />
              <circle cx="32" cy="24" r="2.2" fill="#46B966" />
              <line x1="32" y1="26" x2="32" y2="33" stroke={col} strokeWidth="2.2" strokeLinecap="round" />
            </g>
          );
        }
        if (style === 'midautumn_boy_boots') {
          return (
            <g>
              <path d="M23 24 H41 L43 44 H58 C63 46, 63 57, 57 57 H21 Z" fill={col} stroke={outline} strokeWidth="2.1" strokeLinejoin="round" />
              <path d="M21 53 H60 V57 H21 Z" fill="#C92228" stroke={outline} strokeWidth="1.4" />
              <path d="M27 32 Q32 28 37 32 M27 38 Q32 34 37 38" stroke="#E8E1D3" strokeWidth="1.5" fill="none" />
            </g>
          );
        }
        if (style === 'student_mary_socks') {
          return (
            <g>
              <path d="M24 16 H40 V45 H24 Z" fill="#FFFFFF" stroke={outline} strokeWidth="1.8" />
              <path d="M23 16 H41" stroke="#E2E8F0" strokeWidth="3" strokeLinecap="round" />
              <path d="M18 42 C22 50, 38 50, 44 42 L59 46 C64 48, 64 56, 59 57 H19 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M29 44 Q33 36 39 42" stroke={col} strokeWidth="3.2" fill="none" />
              <path d="M29 44 Q33 36 39 42" stroke={outline} strokeWidth="1.4" fill="none" />
            </g>
          );
        }
        if (style === 'student_loafers') {
          return (
            <g>
              <path d="M25 31 H39 V44 H25 Z" fill="#FFFFFF" stroke={outline} strokeWidth="1.7" />
              <path d="M18 41 C22 49, 39 49, 45 41 L60 45 C64 47, 64 56, 59 57 H19 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <rect x="33" y="42" width="12" height="5" rx="2" fill="#3B3544" stroke={outline} strokeWidth="1.2" />
            </g>
          );
        }
        // mary_janes
        return (
          <g>
            <path d="M18 41 C22 50, 38 50, 44 41 L59 45 C64 47, 64 56, 59 57 H19 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
            <path d="M29 44 Q33 36 39 42" stroke={col} strokeWidth="3.2" fill="none" />
            <path d="M29 44 Q33 36 39 42" stroke={outline} strokeWidth="1.4" fill="none" />
          </g>
        );
      })()}

      {/* 7. CẦM TAY */}
      {category === 'handheld' && (() => {
        const col = patch.handheldColor || '#E5BE8A';
        const style = patch.handheld || 'none';

        if (style === 'none') {
          return (
            <g>
              <circle cx="40" cy="40" r="20" stroke="#B8A490" strokeWidth="2.4" strokeDasharray="4 4" />
              <path d="M28 52 L52 28" stroke="#B8A490" strokeWidth="2.4" strokeLinecap="round" />
            </g>
          );
        }
        if (style === 'milk_tea') {
          return (
            <g>
              <path d="M41 13 L45 27" stroke="#E86F82" strokeWidth="3.5" strokeLinecap="round" />
              <path d="M26 28 C26 20, 54 20, 54 28 Z" fill="#FFFDF8" stroke={outline} strokeWidth="2" />
              <path d="M26 28 H54 L49 63 H31 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <circle cx="36" cy="56" r="2.2" fill="#3D2B2B" />
              <circle cx="42" cy="57" r="2.2" fill="#3D2B2B" />
              <circle cx="39" cy="52" r="2.2" fill="#3D2B2B" />
              <circle cx="45" cy="54" r="2.2" fill="#3D2B2B" />
            </g>
          );
        }
        if (style === 'plush_bear') {
          return (
            <g>
              <circle cx="29" cy="24" r="6" fill={col} stroke={outline} strokeWidth="2" />
              <circle cx="51" cy="24" r="6" fill={col} stroke={outline} strokeWidth="2" />
              <ellipse cx="40" cy="52" rx="13" ry="13" fill={col} stroke={outline} strokeWidth="2.2" />
              <circle cx="40" cy="33" r="12" fill={col} stroke={outline} strokeWidth="2.2" />
              <ellipse cx="40" cy="37" rx="5.5" ry="4" fill="#F5E2CC" />
              <circle cx="36" cy="31" r="1.6" fill={outline} />
              <circle cx="44" cy="31" r="1.6" fill={outline} />
              <circle cx="40" cy="35.5" r="1.8" fill={outline} />
            </g>
          );
        }
        if (style === 'flower_bouquet') {
          return (
            <g>
              <path d="M26 37 H54 L40 66 Z" fill="#E9D5B5" stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <circle cx="40" cy="26" r="10" fill={col} stroke={outline} strokeWidth="2" />
              <circle cx="29" cy="32" r="7" fill={col} stroke={outline} strokeWidth="1.8" />
              <circle cx="51" cy="32" r="7" fill={col} stroke={outline} strokeWidth="1.8" />
              <circle cx="40" cy="26" r="4.5" fill="#6D452B" />
              <circle cx="29" cy="32" r="3" fill="#6D452B" />
              <circle cx="51" cy="32" r="3" fill="#6D452B" />
            </g>
          );
        }
        if (style === 'blue_rose_bouquet') {
          return (
            <g>
              <path d="M26 36 H54 L40 65 Z" fill="#FFFDF9" stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <circle cx="40" cy="25" r="9.5" fill={col} stroke={outline} strokeWidth="2" />
              <circle cx="29" cy="31" r="7" fill={col} stroke={outline} strokeWidth="1.8" />
              <circle cx="51" cy="31" r="7" fill={col} stroke={outline} strokeWidth="1.8" />
              <rect x="34" y="45" width="12" height="5" rx="2" fill="#3D86EC" stroke={outline} strokeWidth="1.2" />
            </g>
          );
        }
        if (style === 'cupid_bow') {
          return (
            <g>
              <path d="M20 15 C36 22, 38 33, 33 40 C38 47, 36 58, 20 65" stroke={col} strokeWidth="4.2" fill="none" strokeLinecap="round" />
              <line x1="20" y1="15" x2="20" y2="65" stroke="#E8DEC8" strokeWidth="1.5" />
              <rect x="31" y="35" width="5" height="10" rx="2" fill="#E84258" stroke={outline} strokeWidth="1.2" />
              <line x1="45" y1="59" x2="60" y2="23" stroke={col} strokeWidth="2.6" strokeLinecap="round" />
              <path d="M60 21 C57 17, 52 19, 54 24 L61 28 L64 21 C65 16, 60 16, 60 21 Z" fill="#E84258" stroke={outline} strokeWidth="1.3" strokeLinejoin="round" />
              <path d="M45 59 L40 62 M45 59 L48 64" stroke="#F79AB6" strokeWidth="2.2" strokeLinecap="round" />
            </g>
          );
        }
        if (style === 'tote_bag') {
          return (
            <g>
              <path d="M31 31 C31 16, 49 16, 49 31" stroke="#C59F76" strokeWidth="3.2" fill="none" />
              <rect x="22" y="30" width="36" height="33" rx="4" fill={col} stroke={outline} strokeWidth="2.2" />
              <rect x="30" y="39" width="20" height="14" rx="2" fill={shade(col, -12)} stroke={outline} strokeWidth="1.5" />
            </g>
          );
        }
        if (style === 'paper_lantern') {
          return (
            <g>
              <path d="M32 16 L44 26" stroke="#7A4E2E" strokeWidth="2.8" strokeLinecap="round" />
              <line x1="44" y1="26" x2="44" y2="33" stroke="#C59849" strokeWidth="1.8" />
              <ellipse cx="44" cy="46" rx="14" ry="13" fill={col} stroke={outline} strokeWidth="2.2" />
              <path d="M44 33 V59 M35 35 C38 42, 38 50, 35 57 M53 35 C50 42, 50 50, 53 57" stroke="#F4C95D" strokeWidth="1.5" fill="none" />
              <line x1="44" y1="59" x2="44" y2="68" stroke="#E04B5A" strokeWidth="3" strokeLinecap="round" />
            </g>
          );
        }
        if (style === 'lotus_fan') {
          return (
            <g>
              <circle cx="40" cy="36" r="19" fill={col} stroke="#F4C95D" strokeWidth="2.5" />
              <ellipse cx="40" cy="36" rx="4" ry="8" fill="#FFE6EE" />
              <ellipse cx="35" cy="38" rx="3" ry="6.5" transform="rotate(-25 35 38)" fill="#F9B5C9" />
              <ellipse cx="45" cy="38" rx="3" ry="6.5" transform="rotate(25 45 38)" fill="#F9B5C9" />
              <line x1="40" y1="54" x2="40" y2="69" stroke="#6E4427" strokeWidth="3.4" strokeLinecap="round" />
            </g>
          );
        }
        if (style === 'matcha_latte') {
          return (
            <g>
              <path d="M42 13 L45 27" stroke="#4D8A4D" strokeWidth="3.2" strokeLinecap="round" />
              <path d="M27 28 C27 21, 53 21, 53 28 Z" fill="#FFFFFF" stroke={outline} strokeWidth="2" />
              <path d="M27 28 H53 L49 62 H31 Z" fill="#FFFDF8" stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M29 39 H51 L49 61 H31 Z" fill={col} />
            </g>
          );
        }
        if (style === 'daisy_flower') {
          return (
            <g>
              <path d="M40 34 V68" stroke="#539E4D" strokeWidth="4" strokeLinecap="round" />
              <path d="M40 53 Q52 46 53 54 Q45 58 40 53 Z" fill="#64B55D" stroke={outline} strokeWidth="1.5" />
              <g transform="translate(40,28)">
                {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                  <ellipse
                    key={deg}
                    cx="0"
                    cy="-11"
                    rx="4.2"
                    ry="8"
                    transform={`rotate(${deg})`}
                    fill={col}
                    stroke={outline}
                    strokeWidth="1.4"
                  />
                ))}
                <circle cx="0" cy="0" r="6" fill="#F4C430" stroke={outline} strokeWidth="1.5" />
              </g>
            </g>
          );
        }
        if (style === 'star_lantern') {
          return (
            <g>
              <line x1="40" y1="54" x2="40" y2="70" stroke="#7A4E2E" strokeWidth="3.2" strokeLinecap="round" />
              <polygon
                points="40,14 46,28 61,28 49,37 54,52 40,43 26,52 31,37 19,28 34,28"
                fill="#40B966"
                stroke="#F5C942"
                strokeWidth="2.4"
                strokeLinejoin="round"
              />
              <circle cx="40" cy="34" r="8.5" fill={col} stroke="#FFFFFF" strokeWidth="1.5" />
            </g>
          );
        }
        if (style === 'rooster_lantern') {
          return (
            <g>
              <line x1="36" y1="52" x2="36" y2="70" stroke="#7A4E2E" strokeWidth="3" strokeLinecap="round" />
              <path d="M26 24 C29 14, 41 14, 44 21 L49 18 L47 25 C55 28, 56 44, 46 49 L31 49 C22 45, 21 31, 26 24 Z" fill="#46B868" stroke="#F8D24E" strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M36 16 C37 11, 41 11, 43 15" stroke={col} strokeWidth="3.4" strokeLinecap="round" />
              <polygon points="48,22 55,25 48,27" fill="#F8CE48" />
              <ellipse cx="37" cy="38" rx="6.5" ry="4" fill="#F8CE48" stroke={col} strokeWidth="1.5" />
            </g>
          );
        }
        // mini_umbrella
        return (
          <g>
            <path d="M18 39 C20 20, 60 20, 62 39 Q51 35 40 39 Q29 35 18 39 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
            <path d="M40 18 V58 C40 63, 47 63, 47 58" stroke="#7D5333" strokeWidth="2.6" strokeLinecap="round" fill="none" />
          </g>
        );
      })()}
    </svg>
  );
};
