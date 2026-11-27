import React from 'react';
import {PetSpeciesId, PetSupplyId} from '../types/game';

export const BlingBlingBadge: React.FC<{className?: string}> = ({
  className = 'h-4 w-4',
}) => (
  <svg
    viewBox="0 0 24 24"
    className={`inline-block shrink-0 ${className}`}
    fill="none"
    aria-label="Bling Bling Lv.10"
  >
    <path
      d="M11 2L13.1 7.9L19 10L13.1 12.1L11 18L8.9 12.1L3 10L8.9 7.9L11 2Z"
      fill="#FFD15C"
      stroke="#D98A1B"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
    <path
      d="M19 14.5L19.9 17.1L22.5 18L19.9 18.9L19 21.5L18.1 18.9L15.5 18L18.1 17.1L19 14.5Z"
      fill="#FFF2A6"
      stroke="#E69B24"
      strokeWidth="0.9"
      strokeLinejoin="round"
    />
    <circle cx="5.2" cy="5.2" r="1.4" fill="#FFF7C8" />
  </svg>
);

export const BrownPuppyIcon: React.FC<{className?: string}> = ({
  className = 'h-10 w-10',
}) => (
  <svg viewBox="0 0 48 48" className={className} fill="none">
    {/* Floppy ears */}
    <ellipse cx="11.5" cy="21.5" rx="5.2" ry="8.5" transform="rotate(14 11.5 21.5)" fill="#8B5129" />
    <ellipse cx="36.5" cy="21.5" rx="5.2" ry="8.5" transform="rotate(-14 36.5 21.5)" fill="#8B5129" />
    {/* Head */}
    <ellipse cx="24" cy="22" rx="13.2" ry="11.5" fill="#C47D48" />
    {/* Cream forehead & cheeks */}
    <ellipse cx="24" cy="26" rx="8.6" ry="6.2" fill="#FCE8CC" />
    {/* Eyes */}
    <circle cx="18.6" cy="20.4" r="2.3" fill="#231915" />
    <circle cx="29.4" cy="20.4" r="2.3" fill="#231915" />
    <circle cx="19.3" cy="19.6" r="0.85" fill="#FFFFFF" />
    <circle cx="30.1" cy="19.6" r="0.85" fill="#FFFFFF" />
    {/* Blush */}
    <ellipse cx="14.5" cy="24" rx="2.3" ry="1.4" fill="#F2958B" opacity="0.72" />
    <ellipse cx="33.5" cy="24" rx="2.3" ry="1.4" fill="#F2958B" opacity="0.72" />
    {/* Nose & smile */}
    <ellipse cx="24" cy="24.2" rx="2.5" ry="1.8" fill="#412418" />
    <path d="M21.8 27.2Q24 29.5 26.2 27.2" stroke="#5B3322" strokeWidth="1.7" strokeLinecap="round" />
    {/* Red collar + gold bell */}
    <rect x="16" y="32.2" width="16" height="3.8" rx="1.9" fill="#DF5B57" />
    <circle cx="24" cy="36.8" r="2.6" fill="#FFD15C" stroke="#C5821A" strokeWidth="1" />
  </svg>
);

export const BlueBirdIcon: React.FC<{className?: string}> = ({
  className = 'h-10 w-10',
}) => (
  <svg viewBox="0 0 48 48" className={className} fill="none">
    {/* Wings */}
    <ellipse cx="11.5" cy="25.5" rx="6.5" ry="4.5" transform="rotate(-24 11.5 25.5)" fill="#3688C4" />
    <ellipse cx="36.5" cy="25.5" rx="6.5" ry="4.5" transform="rotate(24 36.5 25.5)" fill="#3688C4" />
    {/* Crest */}
    <path d="M23 7.5C21.5 11.2 23 13 24 14C25.5 12.2 27.5 10.6 26.2 7.8C24.8 8.8 23.6 8.4 23 7.5Z" fill="#3B93D4" />
    {/* Body */}
    <ellipse cx="24" cy="25.5" rx="12.5" ry="12" fill="#52B2EB" />
    {/* Cream chest */}
    <ellipse cx="24" cy="29.5" rx="8.8" ry="6.8" fill="#FFF4D8" />
    {/* Eyes */}
    <circle cx="18.8" cy="21.5" r="2.2" fill="#1D222B" />
    <circle cx="29.2" cy="21.5" r="2.2" fill="#1D222B" />
    <circle cx="19.5" cy="20.7" r="0.85" fill="#FFFFFF" />
    <circle cx="29.9" cy="20.7" r="0.85" fill="#FFFFFF" />
    {/* Blush */}
    <ellipse cx="14.8" cy="24.5" rx="2.1" ry="1.3" fill="#F59B95" opacity="0.7" />
    <ellipse cx="33.2" cy="24.5" rx="2.1" ry="1.3" fill="#F59B95" opacity="0.7" />
    {/* Beak */}
    <path d="M21 23.5L27 23.5L24 27.6Z" fill="#F7B733" stroke="#C98314" strokeWidth="1" strokeLinejoin="round" />
    {/* Little feet */}
    <path d="M20 37.5V40.5M28 37.5V40.5" stroke="#E09428" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const ShibaPuppyIcon: React.FC<{className?: string}> = ({
  className = 'h-10 w-10',
}) => (
  <svg viewBox="0 0 48 48" className={className} fill="none">
    {/* Upright Shiba triangular ears */}
    <path d="M12 20L10.5 7.5L21 14.5Z" fill="#E38938" stroke="#8C481A" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M36 20L37.5 7.5L27 14.5Z" fill="#E38938" stroke="#8C481A" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M13 18L12.5 10.5L19 15Z" fill="#FFF1DA" />
    <path d="M35 18L35.5 10.5L29 15Z" fill="#FFF1DA" />
    {/* Fox-orange plump Shiba puppy head */}
    <ellipse cx="24" cy="23.5" rx="13.5" ry="11.2" fill="#EB9642" stroke="#8C481A" strokeWidth="1.6" />
    {/* Cream urajiro cheeks & muzzle mask */}
    <path
      d="M11 25C12.5 29.8 18 33.5 24 33.5C30 33.5 35.5 29.8 37 25C33.5 25 30 22.8 24 22.8C18 22.8 14.5 25 11 25Z"
      fill="#FFF5E2"
    />
    <ellipse cx="24" cy="27.2" rx="6" ry="4.5" fill="#FFFBF2" />
    {/* Cream Shiba eyebrow pips */}
    <ellipse cx="18.2" cy="17.8" rx="2.1" ry="1.2" transform="rotate(-12 18.2 17.8)" fill="#FFF5E2" />
    <ellipse cx="29.8" cy="17.8" rx="2.1" ry="1.2" transform="rotate(12 29.8 17.8)" fill="#FFF5E2" />
    {/* Sparkling puppy eyes */}
    <circle cx="18.6" cy="21.5" r="2.2" fill="#231915" />
    <circle cx="29.4" cy="21.5" r="2.2" fill="#231915" />
    <circle cx="19.3" cy="20.7" r="0.85" fill="#FFFFFF" />
    <circle cx="30.1" cy="20.7" r="0.85" fill="#FFFFFF" />
    {/* Blush */}
    <ellipse cx="14.5" cy="25.2" rx="2.2" ry="1.3" fill="#F59B91" opacity="0.7" />
    <ellipse cx="33.5" cy="25.2" rx="2.2" ry="1.3" fill="#F59B91" opacity="0.7" />
    {/* Nose & joyful Shiba smile */}
    <ellipse cx="24" cy="25.2" rx="2.3" ry="1.6" fill="#2F1C14" />
    <path d="M21.6 28Q24 30.2 26.4 28" stroke="#5B3322" strokeWidth="1.6" strokeLinecap="round" />
    {/* Lucky red bandana & gold bell */}
    <path d="M14.5 33L24 41L33.5 33Z" fill="#DF4E48" stroke="#962824" strokeWidth="1.4" strokeLinejoin="round" />
    <circle cx="24" cy="36.2" r="2.5" fill="#FFD15C" stroke="#C5821A" strokeWidth="1" />
  </svg>
);

export const ChineseCatIcon: React.FC<{className?: string}> = ({
  className = 'h-10 w-10',
}) => (
  <svg viewBox="0 0 48 48" className={className} fill="none">
    {/* Crisp white cat ears with rosy pink lining */}
    <path d="M12.5 21L11 8L22 14.5Z" fill="#FFFFFF" stroke="#B7C0CC" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M35.5 21L37 8L26 14.5Z" fill="#FFFFFF" stroke="#B7C0CC" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M14 19L13.3 11.2L20 15.2Z" fill="#F7A7B8" />
    <path d="M34 19L34.7 11.2L28 15.2Z" fill="#F7A7B8" />
    {/* Snowy rounded white cat face */}
    <ellipse cx="24" cy="23.5" rx="13.2" ry="11.2" fill="#FFFFFF" stroke="#C5CCD6" strokeWidth="1.6" />
    {/* Expressive jade-amber eyes */}
    <ellipse cx="18.6" cy="21.5" rx="2.4" ry="2.6" fill="#3B8776" />
    <ellipse cx="29.4" cy="21.5" rx="2.4" ry="2.6" fill="#3B8776" />
    <circle cx="18.6" cy="21.7" r="1.4" fill="#182226" />
    <circle cx="29.4" cy="21.7" r="1.4" fill="#182226" />
    <circle cx="19.3" cy="20.4" r="0.85" fill="#FFFFFF" />
    <circle cx="30.1" cy="20.4" r="0.85" fill="#FFFFFF" />
    {/* Delicate blush & ':3' mouth */}
    <ellipse cx="14.2" cy="25" rx="2.2" ry="1.3" fill="#F7A1B3" opacity="0.72" />
    <ellipse cx="33.8" cy="25" rx="2.2" ry="1.3" fill="#F7A1B3" opacity="0.72" />
    <polygon points="24,25.8 22,23.8 26,23.8" fill="#F2839B" />
    <path d="M21 27.2Q22.5 29.2 24 26.8Q25.5 29.2 27 27.2" stroke="#7A6572" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    {/* Whiskers */}
    <path d="M12.5 24.2L7 23.2M12.5 26.5L7 27.5M35.5 24.2L41 23.2M35.5 26.5L41 27.5" stroke="#B6BFC9" strokeWidth="1.3" strokeLinecap="round" />
    {/* Crimson Chinese silk collar + jade charm & gold bell */}
    <rect x="14.5" y="33.2" width="19" height="4" rx="2" fill="#D93D43" stroke="#8F1F24" strokeWidth="1.2" />
    <circle cx="24" cy="38.2" r="2.8" fill="#FFD15C" stroke="#B87A18" strokeWidth="1" />
    <circle cx="24" cy="35.2" r="1.5" fill="#52C49B" />
  </svg>
);

export const MischievousParrotIcon: React.FC<{className?: string}> = ({
  className = 'h-10 w-10',
}) => (
  <svg viewBox="0 0 48 48" className={className} fill="none">
    {/* Colorful tropical fanned tail peeking bottom */}
    <path d="M20 35L17 44L22 42L24 45L27 42L31 44L28 35Z" fill="#2A7CE0" stroke="#184C96" strokeWidth="1.2" strokeLinejoin="round" />
    {/* Cheeky scarlet crest */}
    <path d="M22 6.5C20 9.5 22.5 12 24 13C25.8 10.5 28.5 8 26.5 5.5C25 6.8 23.5 7 22 6.5Z" fill="#E83F38" stroke="#9C1D1A" strokeWidth="1.1" strokeLinejoin="round" />
    <path d="M26.5 8.2C27.2 10.5 26 12.2 25 13C27.2 12 29.5 10.5 29.2 8.2Z" fill="#FFD03B" />
    {/* Plump ruby-red parrot body + emerald/blue layered wings */}
    <ellipse cx="11.5" cy="27" rx="5.5" ry="9" transform="rotate(-14 11.5 27)" fill="#40B262" stroke="#1E6B38" strokeWidth="1.4" />
    <ellipse cx="36.5" cy="27" rx="5.5" ry="9" transform="rotate(14 36.5 27)" fill="#3484E0" stroke="#1C4E91" strokeWidth="1.4" />
    <ellipse cx="12.5" cy="23.5" rx="3.4" ry="4.5" transform="rotate(-14 12.5 23.5)" fill="#FFD147" />
    <ellipse cx="35.5" cy="23.5" rx="3.4" ry="4.5" transform="rotate(14 35.5 23.5)" fill="#FFD147" />
    <ellipse cx="24" cy="25" rx="11.8" ry="12.2" fill="#EC4B40" stroke="#9C231B" strokeWidth="1.5" />
    {/* White macaw facial mask */}
    <ellipse cx="24" cy="22" rx="9" ry="6.2" fill="#FFFDF7" />
    {/* Mischievous bright eyes */}
    <circle cx="18.8" cy="21" r="2.2" fill="#1C2029" />
    <circle cx="29.2" cy="21" r="2.2" fill="#1C2029" />
    <circle cx="19.4" cy="20.2" r="0.85" fill="#FFFFFF" />
    <circle cx="29.8" cy="20.2" r="0.85" fill="#FFFFFF" />
    {/* Curved hooked parrot beak */}
    <path d="M21 23C21 20.8 27 20.8 27 23C27 26 25 28.5 24 29.5C23 28 21 25.8 21 23Z" fill="#F7C752" stroke="#9C6D14" strokeWidth="1.2" strokeLinejoin="round" />
    <path d="M22.2 26.5C23 28 25 28 25.8 26.5" fill="#3B322C" />
  </svg>
);

const BlackCatIcon: React.FC<{className?: string}> = ({className = 'h-10 w-10'}) => (
  <svg viewBox="0 0 48 48" className={className} fill="none">
    {/* Pointy witch-cat ears with soft pink interiors */}
    <path
      d="M11 22 L9 7 L21 14 Z"
      fill="#282233"
      stroke="#14101B"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path
      d="M37 22 L39 7 L27 14 Z"
      fill="#282233"
      stroke="#14101B"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path d="M12.2 19 L11.4 10.6 L19 15 Z" fill="#EF8FA6" />
    <path d="M35.8 19 L36.6 10.6 L29 15 Z" fill="#EF8FA6" />
    {/* Sleek rounded dark indigo-black head */}
    <ellipse
      cx="24"
      cy="26"
      rx="15"
      ry="13"
      fill="#282233"
      stroke="#14101B"
      strokeWidth="1.6"
    />
    {/* Fluffy cheek tufts */}
    <path d="M9.5 27.5 L7 25.5 M9.8 30.5 L6.5 30.5 M38.5 27.5 L41 25.5 M38.2 30.5 L41.5 30.5" stroke="#3E354E" strokeWidth="1.3" strokeLinecap="round" />
    {/* Luminous golden amber eyes with vertical feline pupils */}
    <ellipse cx="18" cy="24.8" rx="4.1" ry="4.4" fill="#F59E0B" stroke="#14101B" strokeWidth="1.1" />
    <ellipse cx="30" cy="24.8" rx="4.1" ry="4.4" fill="#F59E0B" stroke="#14101B" strokeWidth="1.1" />
    <ellipse cx="18" cy="24.9" rx="1.65" ry="3.3" fill="#120E17" />
    <ellipse cx="30" cy="24.9" rx="1.65" ry="3.3" fill="#120E17" />
    <circle cx="19.3" cy="23.2" r="1.2" fill="#FFFFFF" />
    <circle cx="31.3" cy="23.2" r="1.2" fill="#FFFFFF" />
    {/* Tiny pink nose & cute 'w' smile */}
    <path d="M22.5 29.8 H25.5 L24 31.6 Z" fill="#F295AC" />
    <path
      d="M21 32.8 Q22.5 34.4 24 32.6 Q25.5 34.4 27 32.8"
      stroke="#8E81A4"
      strokeWidth="1.4"
      strokeLinecap="round"
      fill="none"
    />
    {/* Delicate whiskers */}
    <path
      d="M14 29 L6.5 28 M14 31.5 L6.5 33 M34 29 L41.5 28 M34 31.5 L41.5 33"
      stroke="#6C6082"
      strokeWidth="1.1"
      strokeLinecap="round"
    />
  </svg>
);

export const PetSpeciesIcon: React.FC<{
  speciesId: PetSpeciesId;
  className?: string;
}> = ({speciesId, className}) => {
  if (speciesId === 'blue_bird') return <BlueBirdIcon className={className} />;
  if (speciesId === 'shiba_puppy') return <ShibaPuppyIcon className={className} />;
  if (speciesId === 'chinese_cat') return <ChineseCatIcon className={className} />;
  if (speciesId === 'mischievous_parrot') return <MischievousParrotIcon className={className} />;
  if (speciesId === 'black_cat') return <BlackCatIcon className={className} />;
  return <BrownPuppyIcon className={className} />;
};

export const PetFoodIcon: React.FC<{className?: string}> = ({
  className = 'h-8 w-8',
}) => (
  <svg viewBox="0 0 40 40" className={className} fill="none">
    <path d="M9 21H31L33 31C33 32.5 31.8 33.5 30.3 33.5H9.7C8.2 33.5 7 32.5 7 31L9 21Z" fill="#E67E5A" stroke="#9C472A" strokeWidth="1.5" />
    <ellipse cx="20" cy="20.5" rx="11.5" ry="3.6" fill="#C45C3B" />
    <circle cx="15" cy="19" r="2.6" fill="#8C532E" />
    <circle cx="20.5" cy="18.2" r="2.8" fill="#A5663C" />
    <circle cx="25.5" cy="19.3" r="2.4" fill="#8C532E" />
    <circle cx="17.8" cy="21" r="2.2" fill="#A5663C" />
    <circle cx="23" cy="21" r="2.2" fill="#784222" />
    <path d="M16 27.5H24" stroke="#FFF4DF" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
);

export const PetMedicineIcon: React.FC<{className?: string}> = ({
  className = 'h-8 w-8',
}) => (
  <svg viewBox="0 0 40 40" className={className} fill="none">
    <rect x="14.5" y="7" width="11" height="5" rx="2" fill="#E45A6D" stroke="#9D2E3F" strokeWidth="1.4" />
    <rect x="11" y="12" width="18" height="21" rx="4.5" fill="#F8FDFF" stroke="#4D9BB8" strokeWidth="1.6" />
    <rect x="13" y="21" width="14" height="9.5" rx="2.5" fill="#BEEAF7" />
    <path d="M20 15.2V21.2M17 18.2H23" stroke="#E45A6D" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
);

export const IntimacyTestPotionIcon: React.FC<{className?: string}> = ({
  className = 'h-8 w-8',
}) => (
  <svg viewBox="0 0 40 40" className={className} fill="none">
    <rect x="16" y="6.5" width="8" height="4.5" rx="1.5" fill="#B57B48" />
    <path
      d="M16.5 11H23.5V15.5L30.2 26.5C31.3 28.4 29.9 32.5 26.8 32.5H13.2C10.1 32.5 8.7 28.4 9.8 26.5L16.5 15.5V11Z"
      fill="#FFF2FA"
      stroke="#C9649D"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    <path
      d="M12.3 25.5H27.7C28.8 27.6 27.8 30.5 25.8 30.5H14.2C12.2 30.5 11.2 27.6 12.3 25.5Z"
      fill="#FF7BBF"
    />
    <path
      d="M20 22.8C18.6 21.1 16.2 22.2 16.9 24.3C17.4 25.9 20 27.6 20 27.6C20 27.6 22.6 25.9 23.1 24.3C23.8 22.2 21.4 21.1 20 22.8Z"
      fill="#FFF8FC"
    />
    <circle cx="29" cy="12" r="1.5" fill="#FFD15C" />
  </svg>
);

export const PetSupplyIcon: React.FC<{
  supplyId: PetSupplyId;
  className?: string;
}> = ({supplyId, className}) => {
  if (supplyId === 'petMedicine') return <PetMedicineIcon className={className} />;
  if (supplyId === 'intimacyTest') return <IntimacyTestPotionIcon className={className} />;
  return <PetFoodIcon className={className} />;
};
