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
            {back === 'boy_1' ? (
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
        const eyeCol = patch.eyeColor || '#4B7F52';
        const eyeStyle = patch.eyeStyle || 'starry';
        const expr = patch.expression || 'smile';
        const hasBlush = Boolean(patch.blush);

        return (
          <g>
            {/* Ears + Sculpted Chibi-Sims head oval with soft V-chin */}
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
                expr === 'grin'
                  ? 'M25 32 Q30 29 35 32'
                  : expr === 'bashful'
                    ? 'M25 33 Q30 31.5 35 30'
                    : eyeStyle === 'squint'
                      ? 'M25 33.5 Q30 32.5 35 34'
                      : expr === 'cat'
                        ? 'M25 33 Q30 30 35 34'
                        : 'M25 32 Q30 30.5 35 32.5'
              }
              stroke={outline}
              strokeWidth="1.9"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d={
                expr === 'grin'
                  ? 'M45 32 Q50 29 55 32'
                  : expr === 'bashful'
                    ? 'M45 30 Q50 31.5 55 33'
                    : expr === 'smirk'
                      ? 'M45 31 Q50 28.5 55 31'
                      : eyeStyle === 'squint'
                        ? 'M45 34 Q50 32.5 55 33.5'
                        : expr === 'cat'
                          ? 'M45 34 Q50 30 55 33'
                          : 'M45 32.5 Q50 30.5 55 32'
              }
              stroke={outline}
              strokeWidth="1.9"
              strokeLinecap="round"
              fill="none"
            />
            {/* Optional Rosy Cheeks & subtle nose dot */}
            {hasBlush && (
              <g opacity="0.62">
                <ellipse cx="26" cy="48" rx="4.4" ry="2.3" fill="#F28B92" />
                <ellipse cx="54" cy="48" rx="4.4" ry="2.3" fill="#F28B92" />
              </g>
            )}
            <circle cx="40" cy="45.5" r="0.9" fill="#D9A88C" />

            {/* Detailed Nendoroid Eyes */}
            {eyeStyle === 'cozy' ? (
              <g>
                <path d="M25 41 Q30 36 35 41" stroke={outline} strokeWidth="2.5" strokeLinecap="round" fill="none" />
                <path d="M45 41 Q50 36 55 41" stroke={outline} strokeWidth="2.5" strokeLinecap="round" fill="none" />
              </g>
            ) : eyeStyle === 'squint' ? (
              <g>
                {[30, 50].map((ex) => (
                  <g key={ex}>
                    <rect x={ex - 4.8} y="38.5" width="9.6" height="4.8" rx="2.2" fill="#FFFFFF" stroke={outline} strokeWidth="1.2" />
                    <ellipse cx={ex} cy="41.2" rx="2.9" ry="2.1" fill={eyeCol} />
                    <circle cx={ex} cy="41.3" r="1.3" fill="#241B19" />
                    <circle cx={ex - 1.1} cy="40.3" r="0.8" fill="#FFFFFF" />
                    <rect x={ex - 5.2} y="35.8" width="10.4" height="3.2" rx="1" fill="#FDE2CC" />
                    <path d={`M${ex - 5.2} 38.8 L${ex + 5.2} 39.1`} stroke={outline} strokeWidth="2.2" strokeLinecap="round" />
                    <path d={`M${ex - 3.6} 43.4 Q${ex} 44.3 ${ex + 3.6} 43.4`} stroke="#B8836B" strokeWidth="1.2" strokeLinecap="round" fill="none" />
                  </g>
                ))}
              </g>
            ) : (
              <g>
                {[30, 50].map((ex, idx) =>
                  eyeStyle === 'wink' && idx === 1 ? (
                    <path
                      key={ex}
                      d="M45 38.5 Q50 41 55 43.2"
                      stroke={outline}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      fill="none"
                    />
                  ) : (
                    <g key={ex}>
                      <ellipse
                        cx={ex}
                        cy="41"
                        rx={eyeStyle === 'almond' ? 4.8 : 4.5}
                        ry={eyeStyle === 'almond' ? 4.3 : 5.2}
                        fill="#FFFFFF"
                        stroke={outline}
                        strokeWidth="1.4"
                      />
                      <circle cx={ex} cy="41.5" r="3.1" fill={eyeCol} />
                      <circle cx={ex} cy="41.7" r="1.7" fill="#241B19" />
                      <circle cx={ex - 1.3} cy="39.5" r="1.2" fill="#FFFFFF" />
                      {(eyeStyle === 'starry' || eyeStyle === 'wink') && (
                        <circle cx={ex + 1.4} cy="43.3" r="0.8" fill="#FFFFFF" />
                      )}
                      <path
                        d={
                          eyeStyle === 'almond'
                            ? idx === 0
                              ? `M${ex - 5} 38 Q${ex} 35 ${ex + 4} 37`
                              : `M${ex - 4} 37 Q${ex} 35 ${ex + 5} 38`
                            : `M${ex - 4.8} 37.5 Q${ex} 34.5 ${ex + 4.8} 37.5`
                        }
                        stroke={outline}
                        strokeWidth="2.1"
                        strokeLinecap="round"
                        fill="none"
                      />
                    </g>
                  ),
                )}
              </g>
            )}

            {/* Mouth */}
            {expr === 'grin' && (
              <g>
                <path d="M35 51.5 H45 C45 57, 35 57, 35 51.5 Z" fill="#D95F6A" stroke={outline} strokeWidth="1.6" strokeLinejoin="round" />
                <path d="M37 54.5 Q40 52.8 43 54.5" stroke="#FFAEB5" strokeWidth="1.5" strokeLinecap="round" fill="none" />
              </g>
            )}
            {expr === 'cat' && (
              <path
                d="M34.5 52 Q37.2 55 40 52 Q42.8 55 45.5 52"
                stroke={outline}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            )}
            {expr === 'calm' && (
              <path
                d="M37 53 Q40 54 43 53"
                stroke={outline}
                strokeWidth="1.9"
                strokeLinecap="round"
                fill="none"
              />
            )}
            {expr === 'smirk' && (
              <path
                d="M36 53.5 Q41 53.5 44.5 50.8"
                stroke={outline}
                strokeWidth="1.9"
                strokeLinecap="round"
                fill="none"
              />
            )}
            {expr === 'bashful' && (
              <path
                d="M36.5 53 Q38.5 54 40 52.5 Q41.5 54 43.5 53"
                stroke={outline}
                strokeWidth="1.8"
                strokeLinecap="round"
                fill="none"
              />
            )}
            {expr === 'smile' && (
              <path
                d="M36 52 Q40 56 44 52"
                stroke={outline}
                strokeWidth="1.9"
                strokeLinecap="round"
                fill="none"
              />
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
              <rect x="20" y="24" width="40" height="16" rx="8" fill={col} stroke={outline} strokeWidth="2.2" />
              <path d="M40 36 H53 L56 61 H42 Z" fill={shade(col, -16)} stroke={outline} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M44 61 V65 M49 61 V65 M54 61 V65" stroke={outline} strokeWidth="1.8" strokeLinecap="round" />
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

      {/* 6. GIÀY */}
      {category === 'shoes' && (() => {
        const col = patch.shoeColor || '#3A2B2B';
        const style = patch.shoes || 'mary_janes';

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
