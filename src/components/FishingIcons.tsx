import React from 'react';
import {RiverFishSpeciesId} from '../types/game';

/**
 * Combined icon showing 1 wooden fishing rod + 1 bug net together (Cần & Vợt)
 */
export function RodAndNetIcon({className = 'w-11 h-11'}: {className?: string}) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className}>
      {/* Bug net (crossed diagonally top-left to bottom-right) */}
      <path
        d="M44 46 L18 20"
        stroke="#8C5A32"
        strokeWidth="4.2"
        strokeLinecap="round"
      />
      {/* Net hoop */}
      <ellipse
        cx="16"
        cy="17"
        rx="10"
        ry="7"
        transform="rotate(-40 16 17)"
        fill="#E5F6EC"
        fillOpacity="0.82"
        stroke="#489C73"
        strokeWidth="3"
      />
      {/* Net mesh lines */}
      <path
        d="M11 16 L20 12 M14 21 L22 17 M12 13 L18 21"
        stroke="#78C299"
        strokeWidth="1.4"
        strokeLinecap="round"
      />

      {/* Fishing rod (crossed diagonally bottom-left to top-right) */}
      <path
        d="M14 50 L48 14"
        stroke="#B87E45"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      {/* Cork grip */}
      <path
        d="M13 51 L21 42.5"
        stroke="#E4B57E"
        strokeWidth="6.2"
        strokeLinecap="round"
      />
      {/* Brass reel */}
      <circle cx="24" cy="40" r="4.5" fill="#EAC163" stroke="#8C6226" strokeWidth="1.8" />
      <circle cx="24" cy="40" r="1.5" fill="#8C6226" />
      {/* Line & red bobber */}
      <path
        d="M48 14 Q53 24 51 35"
        stroke="#62B2D4"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="51" cy="37" r="4" fill="#EA526F" stroke="#9C2A41" strokeWidth="1.5" />
      <path d="M47 37 A4 4 0 0 1 55 37 Z" fill="#FFF7EB" />
    </svg>
  );
}

/**
 * Woven bamboo fish basket icon (Giỏ Cá)
 */
export function FishBasketIcon({className = 'w-11 h-11'}: {className?: string}) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className}>
      {/* Peeking fish tail */}
      <path
        d="M36 22 L44 10 L49 18 L55 12 L46 25 Z"
        fill="#53AFC9"
        stroke="#2F6E82"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {/* Basket handle */}
      <path
        d="M19 24 C19 10 45 10 45 24"
        stroke="#8B572A"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      {/* Basket body */}
      <path
        d="M14 24 H50 L44 50 C43.2 53 40.5 55 37 55 H27 C23.5 55 20.8 53 20 50 L14 24 Z"
        fill="#DCA05A"
        stroke="#8B572A"
        strokeWidth="2.8"
        strokeLinejoin="round"
      />
      {/* Top rim */}
      <rect
        x="11"
        y="21"
        width="42"
        height="7"
        rx="3.5"
        fill="#C3823E"
        stroke="#8B572A"
        strokeWidth="2.4"
      />
      {/* Weave lines */}
      <path
        d="M17 34 H47 M19 42 H45 M26 28 L28 55 M38 28 L36 55"
        stroke="#9A612B"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Wooden Fishing Rod standalone icon (Cần Câu Gỗ)
 */
export function WoodenRodIcon({className = 'w-10 h-10'}: {className?: string}) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className}>
      <path d="M12 52 L50 12" stroke="#A66D3A" strokeWidth="4.6" strokeLinecap="round" />
      <path d="M12 52 L21 42.5" stroke="#E5B982" strokeWidth="6.8" strokeLinecap="round" />
      <circle cx="24" cy="40" r="4.8" fill="#EAC163" stroke="#8C6226" strokeWidth="2" />
      <path d="M50 12 Q55 24 52 38" stroke="#62B2D4" strokeWidth="2" strokeLinecap="round" />
      <circle cx="52" cy="41" r="4.5" fill="#EA526F" stroke="#9C2A41" strokeWidth="1.6" />
      <path d="M47.5 41 A4.5 4.5 0 0 1 56.5 41 Z" fill="#FFF7EB" />
    </svg>
  );
}

/**
 * Cute Cat Face icon for Pets bag category (Mặt mèo)
 */
export function PetCatFaceIcon({className = 'w-11 h-11'}: {className?: string}) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className}>
      {/* Cat ears */}
      <path
        d="M15 28 L12 10 L28 19 Z"
        fill="#F8C888"
        stroke="#8C582B"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <path
        d="M49 28 L52 10 L36 19 Z"
        fill="#F8C888"
        stroke="#8C582B"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      {/* Pink inner ears */}
      <path d="M17 24 L16 14.5 L25 20 Z" fill="#F59AB0" />
      <path d="M47 24 L48 14.5 L39 20 Z" fill="#F59AB0" />
      {/* Plump cat face */}
      <ellipse
        cx="32"
        cy="36"
        rx="21"
        ry="17.5"
        fill="#FFE2B3"
        stroke="#8C582B"
        strokeWidth="2.6"
      />
      {/* Forehead stripes */}
      <path
        d="M32 19 V24 M26 20 L27 24 M38 20 L37 24"
        stroke="#D99B58"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      {/* Eyes */}
      <circle cx="23.5" cy="34.5" r="2.7" fill="#3B2818" />
      <circle cx="40.5" cy="34.5" r="2.7" fill="#3B2818" />
      <circle cx="22.7" cy="33.6" r="0.9" fill="#FFFFFF" />
      <circle cx="39.7" cy="33.6" r="0.9" fill="#FFFFFF" />
      {/* Rosy cheeks */}
      <ellipse cx="18" cy="39.5" rx="3.2" ry="1.9" fill="#F79CB1" opacity="0.78" />
      <ellipse cx="46" cy="39.5" rx="3.2" ry="1.9" fill="#F79CB1" opacity="0.78" />
      {/* Cute nose & ':3' mouth */}
      <polygon points="32,37 29.5,34.5 34.5,34.5" fill="#EA7B93" />
      <path
        d="M27.5 40 Q29.8 43 32 39.5 Q34.2 43 36.5 40"
        stroke="#8C582B"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Whiskers */}
      <path
        d="M15 35 L7 33.5 M15 39 L7 40.5 M49 35 L57 33.5 M49 39 L57 40.5"
        stroke="#A47449"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Cute Mini Car icon for Mounts bag category (Cưỡi / Xe)
 */
export function MountCarIcon({className = 'w-11 h-11'}: {className?: string}) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className}>
      {/* Car roof cabin */}
      <path
        d="M17 31 L22 18 C23 15.8 25 15 27.5 15 H36.5 C39 15 41 15.8 42 18 L47 31 Z"
        fill="#7CC5E8"
        stroke="#366280"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      {/* Windshield highlight */}
      <path
        d="M21 29 L24.5 19.5 H39.5 L43 29 Z"
        fill="#E5F6FF"
        stroke="#4B85A8"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {/* Car body */}
      <rect
        x="8"
        y="29"
        width="48"
        height="15"
        rx="6"
        fill="#F47C7C"
        stroke="#8E3535"
        strokeWidth="2.4"
      />
      {/* Center bumper trim */}
      <path d="M12 37 H52" stroke="#FFD670" strokeWidth="2.6" strokeLinecap="round" />
      {/* Headlights */}
      <circle cx="13" cy="34" r="2.6" fill="#FFF3B0" stroke="#8E3535" strokeWidth="1.4" />
      <circle cx="51" cy="34" r="2.6" fill="#FFF3B0" stroke="#8E3535" strokeWidth="1.4" />
      {/* Front & Rear Wheels */}
      <circle cx="19" cy="45.5" r="6" fill="#3D4652" stroke="#222830" strokeWidth="2" />
      <circle cx="19" cy="45.5" r="2.4" fill="#E6ECF2" />
      <circle cx="45" cy="45.5" r="6" fill="#3D4652" stroke="#222830" strokeWidth="2" />
      <circle cx="45" cy="45.5" r="2.4" fill="#E6ECF2" />
    </svg>
  );
}

/**
 * Handcrafted Wooden Rowboat icon for Ship's shop & Bag Thuyền tab
 */
export function WoodenBoatIcon({className = 'w-11 h-11'}: {className?: string}) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className}>
      {/* Gentle water ripples under keel */}
      <path
        d="M8 50 Q16 47 24 50 T40 50 T56 50"
        stroke="#62B6CB"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M14 55 Q23 52.5 32 55 T50 55"
        stroke="#92D5E6"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Oar resting diagonally */}
      <path d="M26 24 L49 46" stroke="#D9A368" strokeWidth="3.2" strokeLinecap="round" />
      <ellipse
        cx="50"
        cy="47"
        rx="5.2"
        ry="2.6"
        transform="rotate(42 50 47)"
        fill="#E8BC82"
        stroke="#8C5629"
        strokeWidth="1.6"
      />
      {/* Wooden hull */}
      <path
        d="M8 34 C12 45 20 48 32 48 C44 48 52 45 56 34 L50 31 H14 L8 34 Z"
        fill="#C98344"
        stroke="#78421B"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Inner gunwale & bench seats */}
      <path d="M12 34 H52" stroke="#EAB87D" strokeWidth="3" strokeLinecap="round" />
      <rect x="20" y="29" width="8" height="4" rx="1.2" fill="#A6642D" stroke="#78421B" strokeWidth="1.4" />
      <rect x="35" y="29" width="8" height="4" rx="1.2" fill="#A6642D" stroke="#78421B" strokeWidth="1.4" />
      {/* Little bow pennant */}
      <path d="M15 31 V16" stroke="#78421B" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M16 17 L27 21 L16 25 Z" fill="#52A9C9" stroke="#2D6A85" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Custom recognizable illustration for each of the 8 River Fish species
 */
export function FishIllustration({
  speciesId,
  className = 'w-11 h-11',
}: {
  speciesId: RiverFishSpeciesId;
  className?: string;
}) {
  switch (speciesId) {
    case 'tom_cang_xanh':
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          {/* Long blue front claws */}
          <path d="M18 26 C10 20 7 24 12 29" stroke="#2D7CA8" strokeWidth="3" strokeLinecap="round" />
          <path d="M21 36 C12 40 9 44 15 46" stroke="#2D7CA8" strokeWidth="3" strokeLinecap="round" />
          {/* Feelers */}
          <path d="M18 23 Q8 14 4 17 M18 25 Q7 22 4 28" stroke="#4CA2CC" strokeWidth="1.6" strokeLinecap="round" />
          {/* Prawn curved segmented body */}
          <path
            d="M19 28 C25 20 39 20 46 31 C50 37 52 44 47 49 L41 44 C41 37 33 32 23 34 Z"
            fill="#4BB4D8"
            stroke="#226888"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          <path d="M31 24 L29 33 M38 26 L35 35 M44 33 L39 39" stroke="#226888" strokeWidth="1.8" />
          {/* Tail fan */}
          <path d="M46 47 L56 45 L53 53 Z" fill="#2D8BB2" stroke="#226888" strokeWidth="1.6" />
          <circle cx="23" cy="27" r="2.2" fill="#1E293B" />
        </svg>
      );

    case 'ca_loc':
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          {/* Long dorsal fin */}
          <path d="M20 23 L46 21 L44 28 L22 27 Z" fill="#708A58" stroke="#3B502B" strokeWidth="1.8" />
          {/* Snakehead elongated body */}
          <ellipse cx="32" cy="34" rx="20" ry="9.5" fill="#5A7747" stroke="#2F4222" strokeWidth="2.4" />
          {/* Tail */}
          <path d="M50 34 L59 26 L59 42 Z" fill="#6F8C58" stroke="#2F4222" strokeWidth="2" strokeLinejoin="round" />
          {/* Mottled snakehead markings */}
          <path d="M22 29 L25 35 M29 28 L31 36 M36 28 L38 35 M43 29 L44 35" stroke="#314424" strokeWidth="2.5" strokeLinecap="round" />
          <ellipse cx="30" cy="39" rx="12" ry="3.2" fill="#DCE4C7" opacity="0.7" />
          <circle cx="17" cy="32" r="2.4" fill="#FFFDF5" />
          <circle cx="16.5" cy="32" r="1.3" fill="#1F2937" />
        </svg>
      );

    case 'ca_chep':
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          {/* Dorsal fin */}
          <path d="M24 21 Q34 12 43 22 Z" fill="#F29E4C" stroke="#A6551B" strokeWidth="2" />
          {/* Plump carp body */}
          <ellipse cx="32" cy="34" rx="18" ry="13" fill="#F5B257" stroke="#A6551B" strokeWidth="2.4" />
          {/* Tail */}
          <path d="M48 34 L59 24 L56 34 L59 44 Z" fill="#E98A3A" stroke="#A6551B" strokeWidth="2" strokeLinejoin="round" />
          {/* Belly highlight */}
          <path d="M20 40 Q32 45 43 40" stroke="#FFE5B4" strokeWidth="3" strokeLinecap="round" />
          {/* Scale arcs */}
          <path d="M28 31 A4 4 0 0 1 28 37 M35 31 A4 4 0 0 1 35 37" stroke="#C56F28" strokeWidth="1.8" strokeLinecap="round" />
          {/* Carp whisker & eye */}
          <path d="M14 37 Q10 41 12 43" stroke="#A6551B" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="20" cy="31" r="2.6" fill="#FFFFFF" />
          <circle cx="19.5" cy="31" r="1.5" fill="#1F2937" />
        </svg>
      );

    case 'ca_com':
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          {/* Slender anchovy pair */}
          <g transform="translate(0,-4)">
            <ellipse cx="31" cy="32" rx="18" ry="5.5" fill="#B5D8EB" stroke="#4D7E9C" strokeWidth="2" />
            <path d="M48 32 L57 26 L55 32 L57 38 Z" fill="#89B9D4" stroke="#4D7E9C" strokeWidth="1.8" />
            <path d="M18 32 H45" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
            <circle cx="18" cy="31" r="1.6" fill="#1E293B" />
          </g>
          <g transform="translate(4,12) scale(0.82)">
            <ellipse cx="31" cy="32" rx="18" ry="5.5" fill="#A6CDE3" stroke="#4D7E9C" strokeWidth="2" />
            <path d="M48 32 L57 26 L55 32 L57 38 Z" fill="#89B9D4" stroke="#4D7E9C" strokeWidth="1.8" />
            <circle cx="18" cy="31" r="1.6" fill="#1E293B" />
          </g>
        </svg>
      );

    case 'ca_chinh':
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          {/* Long sinuous river eel */}
          <path
            d="M12 30 C20 18 28 42 38 30 C46 20 52 38 56 32"
            stroke="#596E64"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <path
            d="M12 30 C20 18 28 42 38 30 C46 20 52 38 56 32"
            stroke="#8CA698"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeDasharray="2 4"
          />
          <circle cx="13" cy="28.5" r="2.2" fill="#FFFDF5" />
          <circle cx="12.5" cy="28.5" r="1.2" fill="#1F2937" />
        </svg>
      );

    case 'ca_la_han':
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          {/* Dorsal & anal fins */}
          <path d="M23 19 L46 16 L45 27 Z" fill="#F26B8A" stroke="#9C2D4A" strokeWidth="2" />
          <path d="M30 46 L46 49 L44 39 Z" fill="#F26B8A" stroke="#9C2D4A" strokeWidth="2" />
          {/* Flowerhorn body + signature forehead hump (kok) */}
          <path
            d="M12 31 C10 18 21 15 26 21 C34 19 45 24 47 33 C45 43 32 48 20 44 C13 41 12 35 12 31 Z"
            fill="#F48AA4"
            stroke="#9C2D4A"
            strokeWidth="2.4"
          />
          {/* Pearl spots & flower marks */}
          <circle cx="31" cy="33" r="3" fill="#3A2834" />
          <circle cx="38" cy="32" r="2.5" fill="#3A2834" />
          <circle cx="19" cy="24" r="2" fill="#FFE66D" />
          <circle cx="24" cy="26" r="1.5" fill="#A6F4FF" />
          {/* Tail */}
          <path d="M46 33 L58 24 L56 33 L58 43 Z" fill="#FF9EB5" stroke="#9C2D4A" strokeWidth="2" strokeLinejoin="round" />
          <circle cx="19" cy="32" r="2.5" fill="#FFFFFF" />
          <circle cx="18.5" cy="32" r="1.4" fill="#1E293B" />
        </svg>
      );

    case 'ca_lia_thia_3_duoi':
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          {/* 3 Flowing Ribbon Tails */}
          <path d="M36 28 C46 15 55 15 58 23 C50 25 46 28 39 31 Z" fill="#9D6BFF" stroke="#532B9E" strokeWidth="1.8" />
          <path d="M38 33 C50 28 57 32 59 38 C51 40 44 37 38 35 Z" fill="#FF6B9D" stroke="#8C234B" strokeWidth="1.8" />
          <path d="M35 37 C46 43 52 50 53 55 C45 52 39 46 33 40 Z" fill="#4DD4E8" stroke="#1E7385" strokeWidth="1.8" />
          {/* Sleek betta body */}
          <ellipse cx="26" cy="33" rx="13" ry="7.5" fill="#5D7DF2" stroke="#2D4199" strokeWidth="2.2" />
          <path d="M22 25 C25 16 34 15 36 25 Z" fill="#7D98FA" stroke="#2D4199" strokeWidth="1.8" />
          <circle cx="18" cy="31.5" r="2.2" fill="#FFFFFF" />
          <circle cx="17.5" cy="31.5" r="1.2" fill="#1E293B" />
        </svg>
      );

    case 'ca_heo_nuoc_ngot':
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          {/* Freshwater River Dolphin (curving leap) */}
          <path
            d="M10 38 C12 22 28 16 40 23 C48 28 51 37 54 43 L47 45 C44 40 40 35 32 34 C24 33 19 37 15 41 Z"
            fill="#8AB4C9"
            stroke="#3C6880"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          {/* Dorsal fin */}
          <path d="M30 20 L34 12 L38 22 Z" fill="#73A1B8" stroke="#3C6880" strokeWidth="2" strokeLinejoin="round" />
          {/* Tail fluke */}
          <path d="M51 43 L60 41 L57 48 L52 46 Z" fill="#73A1B8" stroke="#3C6880" strokeWidth="1.8" />
          {/* Soft pink-white belly & smile */}
          <path d="M18 35 Q25 32 33 34" stroke="#E8F5FA" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M12 37 Q15 39 17 37" stroke="#3C6880" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="17" cy="30" r="2.1" fill="#1E293B" />
          <circle cx="16.4" cy="29.4" r="0.7" fill="#FFFFFF" />
        </svg>
      );
  }
}
