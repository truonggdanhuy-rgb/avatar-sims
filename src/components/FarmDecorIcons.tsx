import React from 'react';
import {FarmDecorCatalogItem} from '../types/game';

export const FarmDecorIcon: React.FC<{item: FarmDecorCatalogItem; className?: string}> = ({
  item,
  className = 'h-14 w-16',
}) => {
  const c = item.color;
  const a = item.accentColor;

  switch (item.kind) {
    case 'farm_fence_white':
      return (
        <svg viewBox="0 0 64 54" className={className} fill="none">
          <rect x="8" y="23" width="48" height="4.5" rx="1.5" fill={a} />
          <rect x="8" y="34" width="48" height="4.5" rx="1.5" fill={a} />
          <path d="M13 46 V17 L17 12 L21 17 V46 Z" fill={c} stroke="#C7B293" strokeWidth="1.4" />
          <path d="M28 46 V17 L32 12 L36 17 V46 Z" fill={c} stroke="#C7B293" strokeWidth="1.4" />
          <path d="M43 46 V17 L47 12 L51 17 V46 Z" fill={c} stroke="#C7B293" strokeWidth="1.4" />
        </svg>
      );

    case 'farm_fence_ranch':
      return (
        <svg viewBox="0 0 64 54" className={className} fill="none">
          <rect x="9" y="20" width="46" height="5" rx="1.5" fill={a} stroke="#784C28" strokeWidth="1.3" />
          <rect x="9" y="32" width="46" height="5" rx="1.5" fill={a} stroke="#784C28" strokeWidth="1.3" />
          <rect x="13" y="13" width="7" height="33" rx="2" fill={c} stroke="#694121" strokeWidth="1.5" />
          <rect x="44" y="13" width="7" height="33" rx="2" fill={c} stroke="#694121" strokeWidth="1.5" />
        </svg>
      );

    case 'farm_signpost':
      return (
        <svg viewBox="0 0 64 54" className={className} fill="none">
          <rect x="29" y="10" width="6" height="37" rx="2" fill={c} stroke="#6C4422" strokeWidth="1.5" />
          <path d="M16 14 H42 L48 19 L42 24 H16 Z" fill={a} stroke="#8B5E34" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M48 27 H22 L16 32 L22 37 H48 Z" fill="#FFF3D6" stroke="#8B5E34" strokeWidth="1.5" strokeLinejoin="round" />
          <circle cx="32" cy="19" r="1.5" fill="#8B5E34" />
          <circle cx="32" cy="32" r="1.5" fill="#8B5E34" />
        </svg>
      );

    case 'farm_sunflower_barrel':
      return (
        <svg viewBox="0 0 64 54" className={className} fill="none">
          <circle cx="24" cy="18" r="6" fill={a} stroke="#B87A14" strokeWidth="1.3" />
          <circle cx="24" cy="18" r="2.7" fill="#5D3A1A" />
          <circle cx="38" cy="15" r="6.5" fill={a} stroke="#B87A14" strokeWidth="1.3" />
          <circle cx="38" cy="15" r="3" fill="#5D3A1A" />
          <ellipse cx="32" cy="25" rx="11" ry="4.5" fill="#589C4B" />
          <path d="M20 26 H44 L41 46 H23 Z" fill={c} stroke="#684122" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M21 32 H43 M22 40 H42" stroke="#5A636E" strokeWidth="2.4" />
        </svg>
      );

    case 'farm_hay_bale':
      return (
        <svg viewBox="0 0 64 54" className={className} fill="none">
          <rect x="11" y="29" width="21" height="16" rx="5" fill={c} stroke="#9E6E1E" strokeWidth="1.6" />
          <rect x="32" y="29" width="21" height="16" rx="5" fill={c} stroke="#9E6E1E" strokeWidth="1.6" />
          <rect x="21" y="15" width="22" height="16" rx="5" fill="#F2CA5B" stroke="#9E6E1E" strokeWidth="1.6" />
          <path d="M17 29 V45 M38 29 V45 M28 15 V31" stroke={a} strokeWidth="2" />
        </svg>
      );

    case 'farm_flower_cart':
      return (
        <svg viewBox="0 0 64 54" className={className} fill="none">
          <path d="M14 25 L6 21" stroke="#8C5629" strokeWidth="2.8" strokeLinecap="round" />
          <circle cx="24" cy="20" r="4.5" fill={a} />
          <circle cx="33" cy="17" r="5" fill="#FFD166" />
          <circle cx="41" cy="20" r="4.5" fill="#FFF2F6" stroke="#D97A96" strokeWidth="1.2" />
          <path d="M15 24 H48 L43 37 H20 Z" fill={c} stroke="#7A4B23" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M22 37 L18 45" stroke="#7A4B23" strokeWidth="2.8" strokeLinecap="round" />
          <circle cx="44" cy="40" r="6.5" fill="#8C5629" stroke="#522E14" strokeWidth="1.8" />
          <circle cx="44" cy="40" r="2.2" fill="#E8D2B0" />
        </svg>
      );

    case 'farm_scarecrow':
      return (
        <svg viewBox="0 0 64 54" className={className} fill="none">
          <path d="M32 22 V47 M14 27 H50" stroke="#8C582B" strokeWidth="3.2" strokeLinecap="round" />
          <rect x="23" y="23" width="18" height="16" rx="3" fill={a} stroke="#2E547A" strokeWidth="1.5" />
          <circle cx="32" cy="17" r="5.5" fill="#FCE5B8" stroke="#A67638" strokeWidth="1.4" />
          <ellipse cx="32" cy="12" rx="10" ry="2.6" fill={c} stroke="#A67638" strokeWidth="1.3" />
          <path d="M26 12 L29 6 H35 L38 12 Z" fill={c} stroke="#A67638" strokeWidth="1.3" />
        </svg>
      );

    case 'farm_lantern_post':
      return (
        <svg viewBox="0 0 64 54" className={className} fill="none">
          <rect x="29.5" y="19" width="5" height="26" fill={c} />
          <rect x="24" y="43" width="16" height="4.5" rx="2" fill={c} />
          <path d="M23 19 L26 10 H38 L41 19 Z" fill={a} stroke={c} strokeWidth="2" strokeLinejoin="round" />
          <path d="M23 10 L32 5 L41 10 Z" fill={c} />
          <circle cx="32" cy="14.5" r="2.5" fill="#FFF9D6" />
        </svg>
      );

    case 'farm_picnic_blanket':
      return (
        <svg viewBox="0 0 64 54" className={className} fill="none">
          <polygon points="10,36 22,22 54,22 44,44" fill={a} stroke={c} strokeWidth="2" strokeLinejoin="round" />
          <polygon points="19,32 27,24 44,24 37,38" fill={c} opacity="0.85" />
          <rect x="33" y="18" width="13" height="9" rx="2.5" fill="#B57A42" stroke="#6E4620" strokeWidth="1.4" />
          <circle cx="24" cy="31" r="3" fill="#E84A5F" />
          <circle cx="29" cy="33" r="2.6" fill="#FFD166" />
        </svg>
      );

    case 'farm_garden_bench':
      return (
        <svg viewBox="0 0 64 54" className={className} fill="none">
          <rect x="13" y="15" width="38" height="12" rx="2.5" fill={c} stroke="#734922" strokeWidth="1.6" />
          <line x1="15" y1="21" x2="49" y2="21" stroke="#734922" strokeWidth="1.5" />
          <rect x="11" y="28" width="42" height="6" rx="2" fill="#CE945C" stroke="#734922" strokeWidth="1.6" />
          <path d="M16 34 V45 M48 34 V45 M14 27 V34 M50 27 V34" stroke={a} strokeWidth="3.2" strokeLinecap="round" />
        </svg>
      );

    case 'farm_birdbath_fountain':
      return (
        <svg viewBox="0 0 64 54" className={className} fill="none">
          <ellipse cx="32" cy="45" rx="14" ry="4" fill="#C4BDB2" stroke="#857E74" strokeWidth="1.5" />
          <rect x="27" y="27" width="10" height="17" rx="3" fill={c} stroke="#857E74" strokeWidth="1.5" />
          <ellipse cx="32" cy="24" rx="18" ry="6" fill={c} stroke="#857E74" strokeWidth="1.6" />
          <ellipse cx="32" cy="23.5" rx="13.5" ry="3.8" fill={a} />
          <path d="M32 22 V13 M28 16 Q32 10 36 16" stroke="#8BE2FF" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );

    case 'farm_floral_arch':
      return (
        <svg viewBox="0 0 64 54" className={className} fill="none">
          <path d="M15 47 V25 A17 17 0 0 1 49 25 V47" stroke={c} strokeWidth="6" strokeLinecap="round" />
          <path d="M15 47 V25 A17 17 0 0 1 49 25 V47" stroke="#539E5C" strokeWidth="2.5" strokeDasharray="3 4" />
          <circle cx="17" cy="23" r="3.4" fill={a} />
          <circle cx="24" cy="11" r="3.8" fill={a} />
          <circle cx="32" cy="8.5" r="3.8" fill="#FFB8CB" />
          <circle cx="41" cy="11" r="3.6" fill={a} />
          <circle cx="47" cy="23" r="3.4" fill={a} />
        </svg>
      );

    case 'farm_stone_well':
      return (
        <svg viewBox="0 0 64 54" className={className} fill="none">
          <rect x="19" y="18" width="4" height="16" fill="#7D522D" />
          <rect x="41" y="18" width="4" height="16" fill="#7D522D" />
          <polygon points="12,19 32,7 52,19" fill={a} stroke="#853827" strokeWidth="1.6" strokeLinejoin="round" />
          <rect x="18" y="30" width="28" height="17" rx="4" fill={c} stroke="#636B73" strokeWidth="1.7" />
          <path d="M19 36 H45 M25 30 V47 M39 30 V47" stroke="#6B737A" strokeWidth="1.3" />
        </svg>
      );

    case 'farm_mini_windmill':
      return (
        <svg viewBox="0 0 64 54" className={className} fill="none">
          <polygon points="22,47 26,20 38,20 42,47" fill={c} stroke="#9E8B74" strokeWidth="1.6" strokeLinejoin="round" />
          <polygon points="24,20 32,11 40,20" fill={a} stroke="#8C382A" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M16 14 L48 34 M48 14 L16 34" stroke="#7A4C25" strokeWidth="2.8" strokeLinecap="round" />
          <circle cx="32" cy="24" r="3.2" fill={a} stroke="#6E3024" strokeWidth="1.4" />
        </svg>
      );

    case 'farm_wooden_pergola':
      return (
        <svg viewBox="0 0 64 54" className={className} fill="none">
          <rect x="13" y="16" width="5" height="30" rx="1.5" fill={c} />
          <rect x="46" y="16" width="5" height="30" rx="1.5" fill={c} />
          <rect x="8" y="12" width="48" height="5" rx="2" fill={c} stroke="#7B502C" strokeWidth="1.4" />
          <circle cx="22" cy="14" r="4.5" fill="#5AA658" />
          <circle cx="32" cy="13" r="5" fill="#5AA658" />
          <circle cx="42" cy="14" r="4.5" fill="#5AA658" />
          <polygon points="21,17 25,17 23,27" fill={a} />
          <polygon points="30,17 34,17 32,29" fill="#D6B8FA" />
          <polygon points="39,17 43,17 41,26" fill={a} />
        </svg>
      );

    case 'farm_pumpkin_patch':
      return (
        <svg viewBox="0 0 64 54" className={className} fill="none">
          <ellipse cx="32" cy="41" rx="22" ry="6" fill="#654328" />
          <ellipse cx="24" cy="33" rx="10" ry="8.5" fill={c} stroke="#B8561A" strokeWidth="1.4" />
          <ellipse cx="40" cy="34" rx="8.5" ry="7.5" fill="#F4B844" stroke="#B87A14" strokeWidth="1.4" />
          <rect x="22.5" y="21" width="3.5" height="5" rx="1" fill={a} />
          <rect x="38.5" y="23" width="3" height="4.5" rx="1" fill={a} />
          <circle cx="15" cy="39" r="3.5" fill={a} />
        </svg>
      );

    case 'farm_beehive_stand':
      return (
        <svg viewBox="0 0 64 54" className={className} fill="none">
          <rect x="20" y="34" width="4" height="12" fill={a} />
          <rect x="40" y="34" width="4" height="12" fill={a} />
          <rect x="16" y="31" width="32" height="4" rx="1.5" fill={a} />
          <rect x="20" y="15" width="24" height="16" rx="2.5" fill={c} stroke="#BA8828" strokeWidth="1.4" />
          <line x1="20" y1="21" x2="44" y2="21" stroke="#BA8828" strokeWidth="1.4" />
          <line x1="20" y1="26" x2="44" y2="26" stroke="#BA8828" strokeWidth="1.4" />
          <polygon points="16,16 32,7 48,16" fill="#B85D3B" />
          <circle cx="50" cy="18" r="2.5" fill="#FFD13B" stroke="#3B281B" strokeWidth="1" />
        </svg>
      );

    case 'farm_watering_trough':
      return (
        <svg viewBox="0 0 64 54" className={className} fill="none">
          <rect x="10" y="27" width="32" height="16" rx="3" fill={c} stroke="#634022" strokeWidth="1.5" />
          <ellipse cx="26" cy="27" rx="13" ry="3" fill={a} />
          <rect x="44" y="19" width="6" height="24" rx="2" fill="#B84A3E" />
          <line x1="44" y1="26" x2="36" y2="26" stroke="#B84A3E" strokeWidth="3" strokeLinecap="round" />
          <line x1="48" y1="20" x2="55" y2="14" stroke="#4C535A" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );

    case 'farm_duck_pond_mini':
      return (
        <svg viewBox="0 0 64 54" className={className} fill="none">
          <ellipse cx="32" cy="34" rx="22" ry="11" fill={c} stroke="#9AA3AB" strokeWidth="4" />
          <ellipse cx="20" cy="36" rx="5.5" ry="3" fill="#5AA658" />
          <circle cx="19" cy="33" r="3" fill="#F7A1B8" />
          <ellipse cx="37" cy="33" rx="6" ry="4" fill={a} />
          <circle cx="41" cy="27" r="3.8" fill={a} />
          <polygon points="44,27 49,28.5 44,30" fill="#F28B30" />
        </svg>
      );

    case 'farm_mailbox_cute':
      return (
        <svg viewBox="0 0 64 54" className={className} fill="none">
          <rect x="29" y="27" width="6" height="19" rx="1.5" fill={a} stroke="#B8A388" strokeWidth="1.3" />
          <path d="M21 28 V17 A8 8 0 0 1 37 17 L45 19 V28 Z" fill={c} stroke="#A63737" strokeWidth="1.4" />
          <rect x="24" y="20" width="7" height="3" rx="1" fill="#FFF8F0" />
          <path d="M38 18 V10 H43 V13 H38" fill="#F5C44E" stroke="#F5C44E" strokeWidth="1.5" />
        </svg>
      );

    case 'farm_hammock_stand':
      return (
        <svg viewBox="0 0 64 54" className={className} fill="none">
          <line x1="10" y1="42" x2="54" y2="42" stroke="#9E6B40" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="16" y1="42" x2="10" y2="19" stroke="#9E6B40" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="48" y1="42" x2="54" y2="19" stroke="#9E6B40" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M11 21 Q32 39 53 21 Q32 31 11 21 Z" fill={c} stroke="#C95F50" strokeWidth="1.5" />
          <ellipse cx="19" cy="24" rx="4.5" ry="2.5" fill={a} transform="rotate(-18 19 24)" />
        </svg>
      );

    case 'farm_tractor_decor':
      return (
        <svg viewBox="0 0 64 54" className={className} fill="none">
          <rect x="14" y="14" width="16" height="18" rx="3" fill={c} />
          <rect x="17" y="17" width="10" height="8" rx="1.5" fill="#BCE3F5" />
          <rect x="29" y="22" width="21" height="12" rx="3" fill={c} />
          <rect x="43" y="14" width="3" height="9" fill={a} />
          <circle cx="22" cy="37" r="9" fill={a} />
          <circle cx="22" cy="37" r="4.5" fill="#F4CE62" />
          <circle cx="45" cy="40" r="6" fill={a} />
          <circle cx="45" cy="40" r="2.8" fill="#F4CE62" />
        </svg>
      );
  }
};
