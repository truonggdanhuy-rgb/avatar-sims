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

        if (style === 'coin_tunic') {
          return (
            <g>
              <path d="M26 20 L12 39 L19 45 L26 33 L24 65 H56 L54 33 L61 45 L68 39 L54 20 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <rect x="33" y="16" width="14" height="6" rx="2" fill={col} stroke="#F6CA44" strokeWidth="1.8" />
              <path d="M40 22 L48 31 V44" stroke="#F6CA44" strokeWidth="1.8" fill="none" />
              {[
                [32, 37],
                [46, 42],
                [33, 52],
                [47, 56],
              ].map(([cx, cy]) => (
                <g key={`${cx}-${cy}`}>
                  <circle cx={cx} cy={cy} r="3.8" fill="#F7CA44" stroke="#C88718" strokeWidth="1" />
                  <rect x={cx - 1.2} y={cy - 1.2} width="2.4" height="2.4" fill={col} />
                </g>
              ))}
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

        if (style === 'a_line_skirt') {
          return (
            <g>
              <path d="M26 22 H54 L63 59 C48 63, 32 63, 17 59 Z" fill={col} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M26 27 H54" stroke={dark} strokeWidth="2" />
              <path d="M19 57 Q40 61 61 57" stroke={shade(col, 18)} strokeWidth="1.8" fill="none" />
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

      {/* 3. TÓC */}
      {category === 'hair' && (() => {
        const col = patch.hairColor || '#5B3A29';
        const light = shade(col, 28);
        const back = patch.hairBack || 'long_wave';
        const front = patch.hairFront || 'air_bangs';

        return (
          <g>
            {back === 'long_wave' && (
              <path d="M21 32 C15 44, 15 60, 21 68 H59 C65 60, 65 44, 59 32 C55 18, 48 14, 40 14 C32 14, 25 18, 21 32 Z" fill={col} stroke={outline} strokeWidth="2.1" />
            )}
            {back === 'bob_cut' && (
              <path d="M21 32 C17 43, 19 53, 26 58 H54 C61 53, 63 43, 59 32 C55 18, 48 14, 40 14 C32 14, 25 18, 21 32 Z" fill={col} stroke={outline} strokeWidth="2.1" />
            )}
            {back === 'twin_tails' && (
              <g>
                <path d="M23 30 C11 33, 8 49, 13 64 C16 68, 22 65, 24 56 Z" fill={col} stroke={outline} strokeWidth="2" />
                <path d="M57 30 C69 33, 72 49, 67 64 C64 68, 58 65, 56 56 Z" fill={col} stroke={outline} strokeWidth="2" />
              </g>
            )}
            {back === 'ponytail' && (
              <path d="M54 25 C67 27, 72 41, 66 59 C63 63, 57 60, 56 52 Z" fill={col} stroke={outline} strokeWidth="2" />
            )}
            {back === 'twin_buns' && (
              <g>
                <circle cx="23" cy="20" r="9" fill={col} stroke={outline} strokeWidth="2" />
                <circle cx="57" cy="20" r="9" fill={col} stroke={outline} strokeWidth="2" />
              </g>
            )}
            {/* Sculpted Fluffy Hairline Base Cap + Chibi Face */}
            <ellipse cx="40" cy="34" rx="20.5" ry="20" fill={col} stroke={outline} strokeWidth="2.1" />
            <path d="M25 38 C25 27, 32 24, 40 24 C48 24, 55 27, 55 38 C55 49, 47 55, 40 55 C33 55, 25 49, 25 38 Z" fill="#FDE2CC" stroke={outline} strokeWidth="1.7" />
            {/* Bangs */}
            {back === 'hero_wave' ? (
              <path
                d="M21 38 C20 19, 30 13, 41 13 C52 13, 59 20, 58 38 C55 31, 51 25, 45 23 C41 22, 37 24, 34 28 C33 32, 37 33, 39 30 C41 33, 36 37, 32 34 C29 31, 25 32, 21 38 Z"
                fill={col}
                stroke={outline}
                strokeWidth="1.9"
                strokeLinejoin="round"
              />
            ) : back === 'boy_1' ? (
              <path d="M21 39 C21 19, 31 13, 41 13 C51 13, 59 20, 58 39 C54 34, 50 30, 46 25 C41 33, 33 38, 21 39 Z" fill={col} stroke={outline} strokeWidth="1.8" strokeLinejoin="round" />
            ) : back === 'boy_2' ? (
              <path d="M21 39 C21 19, 30 13, 40 14 C50 13, 59 19, 59 39 C52 38, 48 33, 44 26 C42 29, 41 31, 40 25 C37 33, 31 38, 21 39 Z" fill={col} stroke={outline} strokeWidth="1.8" strokeLinejoin="round" />
            ) : back === 'boy_3' ? (
              <path d="M40 9 L43 14 C52 15, 59 22, 59 38 L53 34 L49 39 L45 31 L40 39 L35 31 L31 39 L27 34 L21 38 C21 22, 28 15, 37 14 Z" fill={col} stroke={outline} strokeWidth="1.8" strokeLinejoin="round" />
            ) : back === 'boy_4' ? (
              <path d="M42 10 L44 14 C53 15, 60 22, 59 39 L54 33 L50 38 L46 31 L42 38 L38 30 L34 38 L30 31 L25 38 L21 33 L15 32 L20 27 C20 18, 29 14, 39 14 Z" fill={col} stroke={outline} strokeWidth="1.8" strokeLinejoin="round" />
            ) : back === 'short_crop' ? (
              <path d="M22 36 C22 18, 31 14, 40 14 C49 14, 58 18, 58 36 C53 33, 49 34, 46 31 C42 35, 38 35, 34 31 C31 34, 27 33, 22 36 Z" fill={col} stroke={outline} strokeWidth="1.8" strokeLinejoin="round" />
            ) : front === 'curtain' ? (
              <path d="M22 38 C23 20, 32 15, 40 15 C48 15, 57 20, 58 38 C50 35, 45 31, 40 26 C35 31, 30 35, 22 38 Z" fill={col} stroke={outline} strokeWidth="1.8" />
            ) : front === 'side_sweep' ? (
              <path d="M22 37 C22 20, 32 15, 40 15 C49 15, 57 21, 58 35 C48 33, 38 30, 22 37 Z" fill={col} stroke={outline} strokeWidth="1.8" />
            ) : (
              <path d="M22 35 C23 19, 32 15, 40 15 C48 15, 57 19, 58 35 C51 31, 46 31, 44 35 C41 30, 38 30, 36 35 C33 31, 29 31, 22 35 Z" fill={col} stroke={outline} strokeWidth="1.8" />
            )}
            <path d="M30 20 Q40 17 50 20" stroke={light} strokeWidth="2.2" strokeLinecap="round" opacity="0.7" />
          </g>
        );
      })()}

      {/* 4. MẶT */}
      {category === 'face' && (() => {
        const eyeCol = patch.eyeColor || '#5B341E';
        const eyeStyle = patch.eyeStyle || 'bright';
        const expr = patch.expression || 'sweet_smile';
        const hasBlush = Boolean(patch.blush);
        const isPout = expr === 'pout';
        const isCool = eyeStyle === 'cool';

        return (
          <g>
            {/* Ears + Sculpted Chibi head oval */}
            <circle cx="15" cy="42" r="4.5" fill="#FDE2CC" stroke={outline} strokeWidth="1.9" />
            <circle cx="65" cy="42" r="4.5" fill="#FDE2CC" stroke={outline} strokeWidth="1.9" />
            <path
              d="M17 39 C17 22, 27 16, 40 16 C53 16, 63 22, 63 39 C63 53, 52 63, 40 63 C28 63, 17 53, 17 39 Z"
              fill="#FDE2CC"
              stroke={outline}
              strokeWidth="2.1"
            />
            {/* Sculpted Eyebrows */}
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
            {/* Soft Rosy Cheeks & cute nose button */}
            {hasBlush && (
              <g opacity="0.7">
                <ellipse cx="23.5" cy="48.5" rx="5" ry="2.8" fill="#F28B92" />
                <ellipse cx="56.5" cy="48.5" rx="5" ry="2.8" fill="#F28B92" />
              </g>
            )}
            <circle cx="40" cy="46.2" r={expr === 'joy_open' ? '1.3' : '1.05'} fill={expr === 'joy_open' ? '#CE5D66' : '#C2795E'} />

            {/* Big Expressive Chibi Eyes */}
            {eyeStyle === 'happy_arc' ? (
              <g>
                <path d="M23 41 Q29 34.5 35 41" stroke="#241814" strokeWidth="2.8" strokeLinecap="round" fill="none" />
                <path d="M45 41 Q51 34.5 57 41" stroke="#241814" strokeWidth="2.8" strokeLinecap="round" fill="none" />
              </g>
            ) : eyeStyle === 'joy_xd' ? (
              <g>
                <path
                  d="M24 36.5 L34.5 41 L24 45.5"
                  stroke="#1E1512"
                  strokeWidth="2.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
                <path
                  d="M56 36.5 L45.5 41 L56 45.5"
                  stroke="#1E1512"
                  strokeWidth="2.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </g>
            ) : eyeStyle === 'cool' ? (
              <g>
                {[29, 51].map((ex) => (
                  <g key={ex}>
                    <path d={`M${ex - 6} 37.5 H${ex + 6} C${ex + 6} 45.5, ${ex - 6} 45.5, ${ex - 6} 37.5 Z`} fill="#FFFFFF" stroke="#1E1818" strokeWidth="1.2" />
                    <circle cx={ex} cy="40.6" r="3.4" fill={eyeCol} />
                    <circle cx={ex} cy="40.8" r="1.7" fill="#18141A" />
                    <circle cx={ex - 1.3} cy="39.4" r="1.15" fill="#FFFFFF" />
                    <path d={`M${ex - 6.6} 37.4 Q${ex} 36.4 ${ex + 6.6} 37.4`} stroke="#1E1818" strokeWidth="2.6" strokeLinecap="round" fill="none" />
                  </g>
                ))}
              </g>
            ) : (
              <g>
                {[29, 51].map((ex, idx) => {
                  const isWinkClosed = eyeStyle === 'wink' && idx === 1;
                  if (isWinkClosed) {
                    return (
                      <g key={ex}>
                        <path d={`M${ex - 6} 41.2 Q${ex} 34.5 ${ex + 6} 41.2`} stroke="#231612" strokeWidth="2.7" strokeLinecap="round" fill="none" />
                        <path d={`M${ex + 4.8} 39.6 L${ex + 7.2} 37.5`} stroke="#231612" strokeWidth="2" strokeLinecap="round" />
                      </g>
                    );
                  }
                  return (
                    <g key={ex}>
                      <ellipse
                        cx={ex}
                        cy="40.2"
                        rx={eyeStyle === 'heroic' ? 6.0 : 5.8}
                        ry={eyeStyle === 'sparkle' ? 6.4 : eyeStyle === 'heroic' ? 5.2 : 6.0}
                        fill="#FFFFFF"
                        stroke={eyeStyle === 'gentle' ? '#382117' : '#231612'}
                        strokeWidth="1.2"
                      />
                      <circle
                        cx={ex}
                        cy="40.6"
                        r={eyeStyle === 'heroic' ? 4.1 : 4.5}
                        fill={eyeCol}
                      />
                      <circle cx={ex} cy="40.6" r="2.2" fill="#171318" />
                      <circle cx={ex - 1.6} cy="38.5" r="1.6" fill="#FFFFFF" />
                      <circle cx={ex + 1.6} cy="42.6" r="0.95" fill="#FFFFFF" />
                      {eyeStyle === 'sparkle' && (
                        <path
                          d={`M${ex + 1.6} 37.5 L${ex + 2.0} 38.6 L${ex + 3.1} 39.0 L${ex + 2.0} 39.4 L${ex + 1.6} 40.5 L${ex + 1.2} 39.4 L${ex + 0.1} 39.0 L${ex + 1.2} 38.6 Z`}
                          fill="#FFFFFF"
                        />
                      )}
                      <path
                        d={
                          idx === 0
                            ? `M${ex - 6.8} 37.2 Q${ex} 32.8 ${ex + 5.6} 36.8`
                            : `M${ex - 5.6} 36.8 Q${ex} 32.8 ${ex + 6.8} 37.2`
                        }
                        stroke={eyeStyle === 'gentle' ? '#382117' : '#231612'}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        fill="none"
                      />
                    </g>
                  );
                })}
              </g>
            )}

            {/* Expressive Chibi Mouths */}
            {expr === 'joy_open' && (
              <g>
                <path d="M34.5 51 Q40 51.8 45.5 51 C45.5 57.6, 34.5 57.6, 34.5 51 Z" fill="#C84B59" stroke="#4E2225" strokeWidth="1.1" />
                <ellipse cx="40" cy="54.8" rx="3.4" ry="1.6" fill="#F796A0" />
              </g>
            )}
            {expr === 'gentle_o' && (
              <g>
                <ellipse cx="40" cy="53.4" rx="2.7" ry="3.1" fill="#C44C5A" stroke="#4E2225" strokeWidth="1.0" />
                <ellipse cx="40" cy="54.9" rx="1.7" ry="1.2" fill="#F796A0" />
              </g>
            )}
            {expr === 'cat_w' && (
              <path
                d="M34.2 52.5 Q37.1 56 40 52.5 Q42.9 56 45.8 52.5"
                stroke="#4A261E"
                strokeWidth="2.1"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            )}
            {expr === 'confident' && (
              <path d="M35.5 53.5 Q40.5 54.8 45 52.2" stroke="#4B2922" strokeWidth="2.1" strokeLinecap="round" fill="none" />
            )}
            {expr === 'pout' && (
              <g>
                <path d="M35.8 54.4 Q40 50.8 44.2 54.2" stroke="#45231C" strokeWidth="2.1" strokeLinecap="round" fill="none" />
                <path d="M43.2 51.4 Q45.2 53.2 43.4 55.2" stroke="#45231C" strokeWidth="1.5" strokeLinecap="round" fill="none" />
              </g>
            )}
            {expr === 'sweet_smile' && (
              <path d="M34.8 52 Q40 56.5 45.2 52" stroke="#5C2E24" strokeWidth="2.2" strokeLinecap="round" fill="none" />
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
        if (style === 'hair_clip') {
          return (
            <g>
              <rect x="18" y="31" width="44" height="7" rx="3.5" transform="rotate(-6 40 34)" fill={col} stroke={outline} strokeWidth="2" />
              <rect x="18" y="43" width="44" height="7" rx="3.5" transform="rotate(6 40 46)" fill="#FDF2D6" stroke={outline} strokeWidth="2" />
              <circle cx="54" cy="33" r="3" fill="#FFFDF8" stroke={outline} strokeWidth="1.5" />
            </g>
          );
        }
        if (style === 'flower_pin') {
          return (
            <g transform="translate(40,40)">
              {[0, 72, 144, 216, 288].map((deg) => (
                <ellipse
                  key={deg}
                  cx="0"
                  cy="-12"
                  rx="7"
                  ry="9"
                  transform={`rotate(${deg})`}
                  fill={col}
                  stroke={outline}
                  strokeWidth="1.8"
                />
              ))}
              <circle cx="0" cy="0" r="6.5" fill="#F4B942" stroke={outline} strokeWidth="1.8" />
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
        // angel_wings
        return (
          <g>
            <path d="M38 40 C26 24, 14 23, 14 35 C14 45, 25 51, 38 47 Z" fill={col} stroke={outline} strokeWidth="2" />
            <path d="M42 40 C54 24, 66 23, 66 35 C66 45, 55 51, 42 47 Z" fill={col} stroke={outline} strokeWidth="2" />
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
              <ellipse cx="40" cy="52" rx="22" ry="7" fill="#F28AA8" stroke={outline} strokeWidth="2" />
              <path d="M21 50 C21 31, 59 31, 59 50 Z" fill="#5AC4DF" stroke={outline} strokeWidth="2.2" />
              <circle cx="33" cy="31" r="5" fill="#FFFFFF" stroke={outline} strokeWidth="1.6" />
              <circle cx="47" cy="31" r="5" fill="#FFFFFF" stroke={outline} strokeWidth="1.6" />
              <circle cx="33" cy="31" r="2.1" fill="#1B1D24" />
              <circle cx="47" cy="31" r="2.1" fill="#1B1D24" />
              <ellipse cx="40" cy="44" rx="7" ry="3.2" fill="#F79AB6" stroke={outline} strokeWidth="1.3" />
            </g>
          );
        }
        if (style === 'crocs_panda') {
          return (
            <g>
              <ellipse cx="40" cy="52" rx="22" ry="7" fill="#3675DE" stroke={outline} strokeWidth="2" />
              <circle cx="27" cy="32" r="4.8" fill="#222228" />
              <circle cx="53" cy="32" r="4.8" fill="#222228" />
              <path d="M21 50 C21 31, 59 31, 59 50 Z" fill="#FFFFFF" stroke={outline} strokeWidth="2.2" />
              <ellipse cx="33" cy="41" rx="4" ry="3" fill="#222228" />
              <ellipse cx="47" cy="41" rx="4" ry="3" fill="#222228" />
              <circle cx="33" cy="41" r="1.4" fill="#FFFFFF" />
              <circle cx="47" cy="41" r="1.4" fill="#FFFFFF" />
              <ellipse cx="40" cy="46" rx="2.8" ry="1.8" fill="#222228" />
            </g>
          );
        }
        if (style === 'crocs_chick') {
          return (
            <g>
              <ellipse cx="40" cy="52" rx="22" ry="7" fill="#E88A2C" stroke={outline} strokeWidth="2" />
              <path d="M21 50 C21 31, 59 31, 59 50 Z" fill="#F8CE48" stroke={outline} strokeWidth="2.2" />
              <circle cx="33" cy="38" r="2" fill="#1B1D24" />
              <circle cx="47" cy="38" r="2" fill="#1B1D24" />
              <ellipse cx="40" cy="44" rx="6.5" ry="3.2" fill="#F27E24" stroke={outline} strokeWidth="1.3" />
            </g>
          );
        }
        if (style === 'crocs_frog') {
          return (
            <g>
              <ellipse cx="40" cy="52" rx="22" ry="7" fill="#F2E7B8" stroke={outline} strokeWidth="2" />
              <circle cx="31" cy="31" r="5" fill="#6CC763" stroke={outline} strokeWidth="1.8" />
              <circle cx="49" cy="31" r="5" fill="#6CC763" stroke={outline} strokeWidth="1.8" />
              <path d="M21 50 C21 32, 59 32, 59 50 Z" fill="#6CC763" stroke={outline} strokeWidth="2.2" />
              <circle cx="31" cy="31" r="3" fill="#FFFFFF" />
              <circle cx="49" cy="31" r="3" fill="#FFFFFF" />
              <circle cx="31" cy="31" r="1.5" fill="#1B1D24" />
              <circle cx="49" cy="31" r="1.5" fill="#1B1D24" />
              <circle cx="29" cy="43" r="2.6" fill="#F697AE" />
              <circle cx="51" cy="43" r="2.6" fill="#F697AE" />
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
              <path d="M28 16 C48 26, 48 54, 28 64" stroke={col} strokeWidth="4.2" fill="none" strokeLinecap="round" />
              <line x1="28" y1="16" x2="28" y2="64" stroke="#E0D3B8" strokeWidth="1.5" />
              <line x1="20" y1="40" x2="54" y2="40" stroke={col} strokeWidth="2.4" />
              <circle cx="55" cy="40" r="4.5" fill="#E84258" stroke={outline} strokeWidth="1.4" />
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
