import React from 'react';
import {FishSpeciesId} from '../types/game';

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
 * Stylized Skateboard Icon for Tun's Shop, Backpack & Quick Mount HUD
 */
export function SkateboardMountIcon({className = 'w-11 h-11'}: {className?: string}) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className}>
      {/* Tilted skateboard maple deck */}
      <g transform="rotate(-18 32 34)">
        <rect
          x="10"
          y="29"
          width="44"
          height="8"
          rx="4"
          fill="#E85D4A"
          stroke="#7A281E"
          strokeWidth="2.3"
        />
        <rect x="13" y="27.5" width="38" height="3.2" rx="1.6" fill="#2B303A" />
        {/* Teal center stripe & cream badge */}
        <rect x="22" y="31.5" width="20" height="3" rx="1.5" fill="#2DB5A3" />
        <circle cx="32" cy="33" r="2.2" fill="#FFF3D9" />
        {/* Trucks & yellow urethane wheels */}
        <rect x="18" y="37" width="4" height="4" rx="1" fill="#CBD5E1" stroke="#475569" strokeWidth="1.2" />
        <rect x="42" y="37" width="4" height="4" rx="1" fill="#CBD5E1" stroke="#475569" strokeWidth="1.2" />
        <circle cx="20" cy="44" r="5" fill="#FFD166" stroke="#8C5E14" strokeWidth="2" />
        <circle cx="20" cy="44" r="1.9" fill="#E85D4A" />
        <circle cx="44" cy="44" r="5" fill="#FFD166" stroke="#8C5E14" strokeWidth="2" />
        <circle cx="44" cy="44" r="1.9" fill="#E85D4A" />
      </g>
      {/* Dynamic speed swoosh lines */}
      <path d="M8 48 H20 M12 53 H28" stroke="#53AFC9" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Retro Cruiser Bicycle Icon for Tun's Shop, Backpack & Quick Mount HUD
 */
export function BicycleMountIcon({className = 'w-11 h-11'}: {className?: string}) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className}>
      {/* Rear & Front Tires */}
      <circle cx="17" cy="43" r="10.5" fill="#E8F5FA" fillOpacity="0.45" stroke="#2B303A" strokeWidth="3" />
      <circle cx="17" cy="43" r="3" fill="#CBD5E1" stroke="#475569" strokeWidth="1.4" />
      <circle cx="47" cy="43" r="10.5" fill="#E8F5FA" fillOpacity="0.45" stroke="#2B303A" strokeWidth="3" />
      <circle cx="47" cy="43" r="3" fill="#CBD5E1" stroke="#475569" strokeWidth="1.4" />
      {/* Retro Turquoise Diamond Frame */}
      <path
        d="M17 43 L29 43 L40 27 L25 27 Z M25 27 L29 43 M47 43 L38 22"
        stroke="#3DA5B8"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Leather Saddle & Handlebar */}
      <path d="M21 23.5 H28.5" stroke="#C97B44" strokeWidth="3.6" strokeLinecap="round" />
      <path d="M35 21 H42.5" stroke="#C97B44" strokeWidth="3" strokeLinecap="round" />
      {/* Front Wicker Basket */}
      <rect x="43" y="23.5" width="9" height="7" rx="1.8" fill="#D7A96D" stroke="#8A5629" strokeWidth="1.8" />
      {/* Crank Center */}
      <circle cx="29" cy="43" r="3.4" fill="#FFD166" stroke="#8C5E14" strokeWidth="1.4" />
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
 * Custom recognizable illustration for all River Fish & Sea Creatures
 */
export function FishIllustration({
  speciesId,
  className = 'w-11 h-11',
}: {
  speciesId: FishSpeciesId;
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

    case 'ca_ro_dong':
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          {/* Spiky dorsal fin */}
          <path d="M22 23L27 15L31 20L36 14L41 21L46 17L47 25Z" fill="#7A8F58" stroke="#3D4C26" strokeWidth="1.8" strokeLinejoin="round" />
          {/* Oval bronze-olive climbing perch body */}
          <ellipse cx="32" cy="34" rx="19" ry="11.5" fill="#92A164" stroke="#3D4C26" strokeWidth="2.3" />
          <path d="M50 34L59 25V43Z" fill="#7A8F58" stroke="#3D4C26" strokeWidth="2" strokeLinejoin="round" />
          <path d="M24 27L24 39M31 26L31 40M38 27L38 39" stroke="#5E6E3B" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
          <circle cx="22" cy="32" r="2.5" fill="#3D4C26" opacity="0.45" />
          <circle cx="18" cy="32" r="2.4" fill="#FFFDF5" />
          <circle cx="17.5" cy="32" r="1.3" fill="#1F2937" />
        </svg>
      );

    case 'ca_tre_vang':
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          {/* Catfish barbels / whiskers */}
          <path d="M12 33C6 29 5 24 8 21M12 36C6 39 5 44 9 47" stroke="#8C5E14" strokeWidth="2.2" strokeLinecap="round" />
          {/* Elongated golden catfish body */}
          <path d="M11 34C11 26 24 23 36 25C45 27 51 30 56 33L52 37C45 41 25 43 13 38C11.5 37 11 35.5 11 34Z" fill="#E6AE42" stroke="#8C5E14" strokeWidth="2.3" strokeLinejoin="round" />
          {/* Tail & dorsal fin */}
          <path d="M52 34L60 27V41Z" fill="#D4952C" stroke="#8C5E14" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M22 25L27 17L32 25Z" fill="#D4952C" stroke="#8C5E14" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M18 37Q31 41 44 37" stroke="#FFE599" strokeWidth="3" strokeLinecap="round" />
          <circle cx="17" cy="31" r="2.1" fill="#1F2937" />
          <circle cx="16.5" cy="30.4" r="0.7" fill="#FFFFFF" />
        </svg>
      );

    case 'ca_tai_tuong_do':
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          {/* Big sweeping red-orange fins */}
          <path d="M23 20C31 11 45 12 49 23L42 27Z" fill="#E85A3F" stroke="#8C2A1A" strokeWidth="2" strokeLinejoin="round" />
          <path d="M25 44C32 52 44 51 48 42L39 39Z" fill="#E85A3F" stroke="#8C2A1A" strokeWidth="2" strokeLinejoin="round" />
          {/* Deep ivory-pink giant gourami body */}
          <ellipse cx="32" cy="33" rx="19" ry="13.5" fill="#FCE5D2" stroke="#8C2A1A" strokeWidth="2.3" />
          <path d="M49 33L59 23L57 33L59 43Z" fill="#EA654B" stroke="#8C2A1A" strokeWidth="2" strokeLinejoin="round" />
          {/* Rosy blush & prominent gourami head bump */}
          <path d="M14 31C14 23 20 20 26 21" stroke="#F4A088" strokeWidth="3" strokeLinecap="round" />
          <path d="M26 36L20 42" stroke="#E85A3F" strokeWidth="2.6" strokeLinecap="round" />
          <circle cx="19.5" cy="30.5" r="2.6" fill="#FFFFFF" stroke="#8C2A1A" strokeWidth="1.2" />
          <circle cx="19" cy="30.5" r="1.4" fill="#1E293B" />
        </svg>
      );

    case 'ca_rong_bac':
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          {/* Silver Arowana barbels */}
          <path d="M9 32L4 28M10 35L4 37" stroke="#5D7D94" strokeWidth="2" strokeLinecap="round" />
          {/* Long sleek silver iridescent body */}
          <path d="M10 31C18 22 40 22 52 29L58 24L56 33L58 41L50 37C39 42 18 41 10 31Z" fill="#E5EFF5" stroke="#4D6E85" strokeWidth="2.3" strokeLinejoin="round" />
          {/* Dorsal & anal trailing fins */}
          <path d="M36 24L51 21L49 27Z" fill="#9BC9E3" stroke="#4D6E85" strokeWidth="1.6" />
          <path d="M35 39L50 43L48 37Z" fill="#9BC9E3" stroke="#4D6E85" strokeWidth="1.6" />
          {/* Iridescent diamond scales */}
          <path d="M23 29L27 32L23 35L19 32Z M31 28L35 32L31 36L27 32Z M39 29L43 32L39 35L35 32Z" stroke="#85B3CC" strokeWidth="1.4" fill="#F2FBFF" />
          <circle cx="15" cy="30" r="2.2" fill="#FFE66D" stroke="#4D6E85" strokeWidth="1.2" />
          <circle cx="14.7" cy="30" r="1.1" fill="#1E293B" />
        </svg>
      );

    case 'ca_tam_song':
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          {/* Sturgeon sharp snout & armored dorsal scutes */}
          <path d="M6 34L17 28L47 28L58 21L53 33L57 42L45 36L16 38Z" fill="#6B7E8C" stroke="#2D3E4A" strokeWidth="2.3" strokeLinejoin="round" />
          <path d="M20 27L23 22L26 27L29 22L32 27L35 22L38 27" stroke="#D1DEE6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M18 36H44" stroke="#E2ECF2" strokeWidth="2.5" strokeDasharray="3 4" strokeLinecap="round" />
          <path d="M10 36L8 41M13 36.5L12 41" stroke="#475A66" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="17" cy="31.5" r="2.1" fill="#FFFDF5" />
          <circle cx="16.6" cy="31.5" r="1.1" fill="#1E293B" />
        </svg>
      );

    case 'ca_he':
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          {/* Clownfish vibrant orange body & white bands */}
          <path d="M24 22 C29 14 39 15 41 24 Z" fill="#FF7B33" stroke="#8C3308" strokeWidth="2" strokeLinejoin="round" />
          <ellipse cx="32" cy="34" rx="16.5" ry="11.5" fill="#FF7B33" stroke="#8C3308" strokeWidth="2.3" />
          <path d="M47 34 L57 25 V43 Z" fill="#FF8C47" stroke="#8C3308" strokeWidth="2" strokeLinejoin="round" />
          <path d="M25 23.5 C27 30 27 38 25 44.5" stroke="#FFFFFF" strokeWidth="4.6" strokeLinecap="round" />
          <path d="M36 22.8 C38 30 38 38 36 45.2" stroke="#FFFFFF" strokeWidth="4.2" strokeLinecap="round" />
          <path d="M25 23.5 C27 30 27 38 25 44.5 M36 22.8 C38 30 38 38 36 45.2" stroke="#2D1B10" strokeWidth="1.1" strokeLinecap="round" strokeDasharray="1 0" opacity="0.4" />
          <ellipse cx="31" cy="38" rx="4.2" ry="2.8" fill="#FFA45B" stroke="#8C3308" strokeWidth="1.4" />
          <circle cx="19.5" cy="31.5" r="2.6" fill="#FFFFFF" stroke="#8C3308" strokeWidth="1.2" />
          <circle cx="19" cy="31.5" r="1.4" fill="#1E293B" />
        </svg>
      );

    case 'sua_bien':
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          {/* Trailing translucent tentacles */}
          <path d="M22 33 Q19 43 23 53" stroke="#FF8EC7" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M29 34 Q27 45 30 56" stroke="#D58CFF" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M36 34 Q38 45 34 55" stroke="#FF8EC7" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M42 33 Q45 43 41 52" stroke="#D58CFF" strokeWidth="2.4" strokeLinecap="round" />
          {/* Glowing pastel dome */}
          <path
            d="M15 32 C15 16 49 16 49 32 C44 35 38 32 32 34 C26 32 20 35 15 32 Z"
            fill="#FFB5E0"
            stroke="#A83C7D"
            strokeWidth="2.3"
            strokeLinejoin="round"
          />
          <path d="M22 25 C25 19 36 18 41 24" stroke="#FFF2FA" strokeWidth="2.8" strokeLinecap="round" />
          <circle cx="26" cy="28" r="1.6" fill="#FFF2FA" />
          <circle cx="38" cy="27" r="1.4" fill="#FFF2FA" />
        </svg>
      );

    case 'sao_bien':
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          {/* Plump coral sea star */}
          <path
            d="M32 10 L38.6 24.4 L54.5 26.2 L42.6 36.8 L46.2 52.5 L32 44.2 L17.8 52.5 L21.4 36.8 L9.5 26.2 L25.4 24.4 Z"
            fill="#FF8663"
            stroke="#9E3C20"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <circle cx="32" cy="33" r="4" fill="#FFBE9D" />
          <circle cx="32" cy="20" r="1.7" fill="#FFE0CF" />
          <circle cx="21" cy="29" r="1.7" fill="#FFE0CF" />
          <circle cx="43" cy="29" r="1.7" fill="#FFE0CF" />
          <circle cx="24" cy="43" r="1.7" fill="#FFE0CF" />
          <circle cx="40" cy="43" r="1.7" fill="#FFE0CF" />
        </svg>
      );

    case 'ca_noc_gai':
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          {/* Outer spikes */}
          <path d="M32 12 L34 18 M45 16 L41 21 M52 29 L46 31 M48 44 L42 41 M32 52 L32 46 M18 46 L22 41 M12 31 L18 32 M18 18 L22 22" stroke="#8C6726" strokeWidth="2.4" strokeLinecap="round" />
          {/* Chubby puffer body */}
          <circle cx="32" cy="32" r="14.5" fill="#FBE18D" stroke="#8C6726" strokeWidth="2.4" />
          <path d="M46 32 L56 26 V38 Z" fill="#E8C25B" stroke="#8C6726" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M21 39 C26 45 38 45 43 39" fill="#FFFDF2" />
          <circle cx="24" cy="29" r="2.7" fill="#FFFFFF" stroke="#8C6726" strokeWidth="1.2" />
          <circle cx="23.5" cy="29" r="1.5" fill="#1E293B" />
          <circle cx="21" cy="35" r="1.6" fill="#F4978E" />
          <circle cx="37" cy="25" r="1.6" fill="#C49A45" />
          <circle cx="40" cy="32" r="1.8" fill="#C49A45" />
        </svg>
      );

    case 'bach_tuoc':
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          {/* Wavy tentacles */}
          <path d="M22 36 Q14 44 16 52" stroke="#E96B5E" strokeWidth="4" strokeLinecap="round" />
          <path d="M27 38 Q23 48 26 55" stroke="#E96B5E" strokeWidth="4" strokeLinecap="round" />
          <path d="M37 38 Q41 48 38 55" stroke="#E96B5E" strokeWidth="4" strokeLinecap="round" />
          <path d="M42 36 Q50 44 48 52" stroke="#E96B5E" strokeWidth="4" strokeLinecap="round" />
          {/* Octopus dome head */}
          <ellipse cx="32" cy="26" rx="14.5" ry="13.5" fill="#F27669" stroke="#8C2F27" strokeWidth="2.4" />
          <ellipse cx="26" cy="19" rx="4" ry="2.2" transform="rotate(-25 26 19)" fill="#FFB3AA" />
          <circle cx="26.5" cy="29" r="2.7" fill="#FFFFFF" stroke="#8C2F27" strokeWidth="1.2" />
          <circle cx="26.5" cy="29" r="1.5" fill="#1E293B" />
          <circle cx="37.5" cy="29" r="2.7" fill="#FFFFFF" stroke="#8C2F27" strokeWidth="1.2" />
          <circle cx="37.5" cy="29" r="1.5" fill="#1E293B" />
          <path d="M30 33 Q32 35 34 33" stroke="#8C2F27" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );

    case 'ca_thu_xanh':
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          {/* Fast mackerel streamlined body */}
          <path d="M27 21 L35 16 L37 22 Z" fill="#3E759D" stroke="#1E4563" strokeWidth="1.8" />
          <path d="M8 33 C17 23 39 22 50 31 L58 23 L54 33 L58 43 L50 35 C39 43 17 42 8 33 Z" fill="#529AC7" stroke="#1E4563" strokeWidth="2.3" strokeLinejoin="round" />
          <path d="M14 35 C23 40 38 40 48 34" fill="#E6F4FA" />
          <path d="M22 27 L25 32 M28 26 L31 32 M34 26 L37 32 M40 27 L42 32" stroke="#1E4563" strokeWidth="1.9" strokeLinecap="round" />
          <circle cx="15" cy="31" r="2.3" fill="#FFFFFF" stroke="#1E4563" strokeWidth="1.2" />
          <circle cx="14.5" cy="31" r="1.2" fill="#0F172A" />
        </svg>
      );

    case 'ca_ngua':
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          {/* Cute golden seahorse */}
          <path
            d="M27 16 C28 11 37 11 39 17 C41 21 37 25 39 30 C42 35 40 42 35 45 C31 48 33 53 38 52 C41 51 41 47 38 47"
            fill="#F9C74F"
            stroke="#946511"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M27 17 L18 19 L25 22 Z" fill="#F9C74F" stroke="#946511" strokeWidth="2.1" strokeLinejoin="round" />
          <path d="M39 24 L46 21 L45 29 Z" fill="#FFE18A" stroke="#946511" strokeWidth="1.7" strokeLinejoin="round" />
          <path d="M30 28 H37 M29 33 H37 M30 38 H36" stroke="#D99B26" strokeWidth="2" strokeLinecap="round" />
          <circle cx="30.5" cy="17.5" r="2.2" fill="#FFFFFF" stroke="#946511" strokeWidth="1.1" />
          <circle cx="30" cy="17.5" r="1.1" fill="#1E293B" />
        </svg>
      );

    case 'tom_hum_do':
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          {/* Giant lobster claws */}
          <path d="M22 25 C12 18 8 22 14 28 C16 29 19 28 22 27" fill="#EA4C3B" stroke="#851E15" strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M22 39 C12 46 8 42 14 36 C16 35 19 36 22 37" fill="#EA4C3B" stroke="#851E15" strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M23 23 Q10 11 5 14 M23 41 Q10 53 5 50" stroke="#EA4C3B" strokeWidth="1.6" strokeLinecap="round" />
          {/* Segmented red tail & body */}
          <ellipse cx="32" cy="32" rx="12" ry="8" fill="#E63928" stroke="#851E15" strokeWidth="2.3" />
          <path d="M41 26 L53 27 L58 23 L55 32 L58 41 L53 37 L41 38 Z" fill="#D12D1D" stroke="#851E15" strokeWidth="2.1" strokeLinejoin="round" />
          <path d="M38 26 V38 M44 26.5 V37.5 M49 27 V37" stroke="#851E15" strokeWidth="1.8" />
          <circle cx="24" cy="29.5" r="1.9" fill="#1E293B" />
          <circle cx="24" cy="34.5" r="1.9" fill="#1E293B" />
        </svg>
      );

    case 'ca_duoi_dom':
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          {/* Blue-spotted stingray */}
          <path d="M44 36 Q52 46 57 53" stroke="#2D6D8C" strokeWidth="2.8" strokeLinecap="round" />
          <path
            d="M15 28 C21 15 39 14 48 25 C53 31 50 41 39 42 C29 44 12 40 15 28 Z"
            fill="#6EB8D9"
            stroke="#225570"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          <circle cx="25" cy="26" r="2.2" fill="#2494C7" />
          <circle cx="34" cy="24" r="2.4" fill="#2494C7" />
          <circle cx="41" cy="30" r="2.1" fill="#2494C7" />
          <circle cx="29" cy="34" r="2.2" fill="#2494C7" />
          <circle cx="37" cy="36" r="1.8" fill="#2494C7" />
          <circle cx="22" cy="30" r="2.1" fill="#FFFFFF" stroke="#225570" strokeWidth="1.1" />
          <circle cx="21.5" cy="30" r="1.1" fill="#0F172A" />
        </svg>
      );

    case 'rua_bien':
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          {/* Front & rear flippers */}
          <path d="M23 22 C17 12 24 10 29 20 Z" fill="#70C27E" stroke="#2A6B39" strokeWidth="2.1" strokeLinejoin="round" />
          <path d="M23 42 C17 52 24 54 29 44 Z" fill="#70C27E" stroke="#2A6B39" strokeWidth="2.1" strokeLinejoin="round" />
          <path d="M43 24 L50 18 L48 28 Z" fill="#70C27E" stroke="#2A6B39" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M43 40 L50 46 L48 36 Z" fill="#70C27E" stroke="#2A6B39" strokeWidth="1.8" strokeLinejoin="round" />
          {/* Head */}
          <ellipse cx="16" cy="32" rx="7" ry="5.5" fill="#7CD18A" stroke="#2A6B39" strokeWidth="2.2" />
          <circle cx="14.5" cy="30.5" r="1.6" fill="#1E293B" />
          {/* Emerald patterned shell */}
          <ellipse cx="34" cy="32" rx="14.5" ry="12" fill="#3D9C5D" stroke="#205432" strokeWidth="2.4" />
          <polygon points="34,25 40,29 38,36 30,36 28,29" fill="#63BD7D" stroke="#205432" strokeWidth="1.6" />
          <path d="M34 25 V20 M40 29 L47 28 M38 36 L44 41 M30 36 L24 41 M28 29 L21 28" stroke="#205432" strokeWidth="1.5" />
        </svg>
      );

    case 'so_tai_tuong':
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          {/* Giant clam scalloped shell with vibrant teal mantle & pearl */}
          <path
            d="M11 32 C11 19 20 14 32 14 C44 14 53 19 53 32 C49 36 44 33 40 36 C36 33 32 36 28 36 C24 33 19 36 11 32 Z"
            fill="#F4EBD7"
            stroke="#8A704E"
            strokeWidth="2.3"
            strokeLinejoin="round"
          />
          <path
            d="M14 34 C16 46 23 50 32 50 C41 50 48 46 50 34 Z"
            fill="#E3D2B6"
            stroke="#8A704E"
            strokeWidth="2.3"
            strokeLinejoin="round"
          />
          {/* Vivid sapphire-turquoise inner mantle */}
          <path d="M14 33 C20 29 26 35 32 31 C38 35 44 29 50 33 C45 38 39 39 32 39 C25 39 19 38 14 33 Z" fill="#2CA3C9" stroke="#185C75" strokeWidth="1.8" />
          {/* Radiant pearl */}
          <circle cx="32" cy="31.5" r="4.2" fill="#FFFDF9" stroke="#C5B293" strokeWidth="1.4" />
          <circle cx="30.8" cy="30.2" r="1.2" fill="#FFFFFF" />
          {/* Shell ribs */}
          <path d="M23 16 L25 27 M32 14 V26 M41 16 L39 27" stroke="#BA9F7B" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );

    case 'ca_voi_xanh':
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          {/* Little water spout */}
          <path d="M23 18 Q21 11 16 12 M25 18 Q27 11 32 12" stroke="#7AD3F0" strokeWidth="2.2" strokeLinecap="round" />
          {/* Iconic gentle blue whale */}
          <path
            d="M8 33 C8 21 25 19 39 24 C47 27 51 31 53 33 L60 25 L57 34 L61 42 L52 37 C46 43 32 46 18 44 C11 43 8 39 8 33 Z"
            fill="#3B89C4"
            stroke="#1B4B75"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          {/* Cream pleated belly */}
          <path d="M12 37 C19 42 32 43 42 38 C36 42 20 44 12 37 Z" fill="#DFF2FA" />
          <path d="M17 39 H32 M21 42 H34" stroke="#82BED9" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M27 36 L22 45 L31 41 Z" fill="#3278AD" stroke="#1B4B75" strokeWidth="1.8" strokeLinejoin="round" />
          <circle cx="15.5" cy="31.5" r="2.2" fill="#FFFFFF" stroke="#1B4B75" strokeWidth="1.2" />
          <circle cx="15" cy="31.5" r="1.1" fill="#0F172A" />
        </svg>
      );
  }
}
