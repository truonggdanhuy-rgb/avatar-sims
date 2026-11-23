import React from 'react';
import {PeppaIngredientId, PeppaRecipeId} from '../../data/peppaKitchenCatalog';

export const PeppaIngredientIcon: React.FC<{
  id: PeppaIngredientId;
  className?: string;
}> = ({id, className = 'h-10 w-10'}) => {
  switch (id) {
    case 'noodle_pack':
      return (
        <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
          <rect x="8" y="13" width="32" height="24" rx="5" fill="#FDE08D" stroke="#A66B1C" strokeWidth="2" />
          <path d="M12 20C15 17.5 18 22.5 21 20C24 17.5 27 22.5 30 20C32.5 18 35 21 36 20" stroke="#D9831B" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M12 25.5C15 23 18 28 21 25.5C24 23 27 28 30 25.5C32.5 23.5 35 26.5 36 25.5" stroke="#D9831B" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M12 31C15 28.5 18 33.5 21 31C24 28.5 27 33.5 30 31C32.5 29 35 32 36 31" stroke="#D9831B" strokeWidth="2.2" strokeLinecap="round" />
          <rect x="27" y="8" width="12" height="9" rx="2" fill="#E85A4A" stroke="#7E251B" strokeWidth="1.5" />
          <circle cx="33" cy="12.5" r="1.8" fill="#FFE082" />
        </svg>
      );
    case 'fresh_egg':
      return (
        <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
          <ellipse cx="24" cy="37" rx="15" ry="5" fill="#D5AE78" stroke="#855E2E" strokeWidth="1.6" />
          <path d="M13 33C13 24 16.5 16 20.5 16C24.5 16 27 24 27 33C27 36.2 24.2 38 20 38C15.8 38 13 36.2 13 33Z" fill="#FFF2DC" stroke="#9B6E3E" strokeWidth="1.8" />
          <path d="M23 34C23 26 26.2 18.5 29.8 18.5C33.4 18.5 36 26 36 34C36 37 33.4 38.5 29.5 38.5C25.6 38.5 23 37 23 34Z" fill="#FFDFA8" stroke="#9B6E3E" strokeWidth="1.8" />
          <ellipse cx="18" cy="24" rx="1.6" ry="3" transform="rotate(-12 18 24)" fill="#FFFFFF" opacity="0.8" />
          <ellipse cx="28" cy="25.5" rx="1.3" ry="2.4" transform="rotate(-12 28 25.5)" fill="#FFFDF8" opacity="0.75" />
        </svg>
      );
    case 'cheese_slice':
      return (
        <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
          <path d="M8 22L36 12L40 22L8 25V22Z" fill="#FFE17D" stroke="#A86D14" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M8 22H40V36C40 37.1 39.1 38 38 38H10C8.9 38 8 37.1 8 36V22Z" fill="#FFC93C" stroke="#A86D14" strokeWidth="1.8" strokeLinejoin="round" />
          <circle cx="16" cy="29" r="3" fill="#DE8E14" />
          <circle cx="27" cy="32" r="2.3" fill="#DE8E14" />
          <circle cx="33" cy="26.5" r="2.2" fill="#DE8E14" />
          <circle cx="23" cy="25" r="1.4" fill="#DE8E14" />
        </svg>
      );
    case 'sausage_link':
      return (
        <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
          <rect x="8" y="19" width="24" height="10" rx="5" transform="rotate(-24 20 24)" fill="#E05C44" stroke="#7A2417" strokeWidth="1.8" />
          <rect x="16" y="23" width="24" height="10" rx="5" transform="rotate(-24 28 28)" fill="#CE4B34" stroke="#7A2417" strokeWidth="1.8" />
          <path d="M15 21L17.5 23.5M20 18.5L22.5 21M24 25L26.5 27.5M29 22.5L31.5 25" stroke="#FFB59E" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case 'butter_block':
      return (
        <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
          <ellipse cx="24" cy="36" rx="17" ry="5" fill="#F2F6FA" stroke="#7D8D9E" strokeWidth="1.6" />
          <path d="M12 24L20 17H36L28 24H12Z" fill="#FFE87D" stroke="#A67912" strokeWidth="1.7" strokeLinejoin="round" />
          <rect x="12" y="24" width="16" height="10" fill="#FBD144" stroke="#A67912" strokeWidth="1.7" />
          <path d="M28 24L36 17V27L28 34V24Z" fill="#EBB428" stroke="#A67912" strokeWidth="1.7" strokeLinejoin="round" />
          <path d="M15 27H24" stroke="#FFF8C7" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'milk_carton':
      return (
        <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
          <path d="M15 16L24 9L33 16" fill="#9ED7FB" stroke="#286796" strokeWidth="1.8" strokeLinejoin="round" />
          <rect x="20" y="7" width="8" height="3.5" rx="1.5" fill="#4BA3DF" stroke="#286796" strokeWidth="1.4" />
          <rect x="15" y="16" width="18" height="25" rx="2.5" fill="#FFFFFF" stroke="#286796" strokeWidth="1.8" />
          <rect x="15.5" y="22" width="17" height="11" fill="#63BAEF" />
          <circle cx="24" cy="27.5" r="3.6" fill="#FFFFFF" />
          <path d="M22.5 27.5H25.5M24 26V29" stroke="#286796" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
    case 'popcorn_kernel':
      return (
        <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
          <circle cx="19" cy="17" r="4.5" fill="#FFF3B8" stroke="#A6751B" strokeWidth="1.5" />
          <circle cx="25" cy="14" r="5" fill="#FFE885" stroke="#A6751B" strokeWidth="1.5" />
          <circle cx="30" cy="17" r="4.3" fill="#FFF3B8" stroke="#A6751B" strokeWidth="1.5" />
          <path d="M14 20H34L31 41H17L14 20Z" fill="#FFFDF8" stroke="#9B2D3E" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M18.5 20L19.5 41M24 20V41M29.5 20L28.5 41" stroke="#E84A5F" strokeWidth="3.2" />
          <rect x="13.5" y="19" width="21" height="3.5" rx="1.5" fill="#E84A5F" stroke="#9B2D3E" strokeWidth="1.3" />
        </svg>
      );
    case 'flour_bag':
      return (
        <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
          <path d="M19 13L16 8H32L29 13" fill="#EAD7BC" stroke="#7A5A3A" strokeWidth="1.7" strokeLinejoin="round" />
          <path d="M14 16C14 13.5 16.5 12 24 12C31.5 12 34 13.5 34 16L36 37C36 39.2 34.2 41 32 41H16C13.8 41 12 39.2 12 37L14 16Z" fill="#F7EAD7" stroke="#7A5A3A" strokeWidth="1.8" />
          <rect x="17" y="12" width="14" height="3" rx="1.5" fill="#C9975E" />
          <circle cx="24" cy="27" r="6" fill="#E6C69C" stroke="#8C6239" strokeWidth="1.3" />
          <path d="M24 23V31M22 25L24 27L26 25" stroke="#8C6239" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'cacao_pack':
      return (
        <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
          <rect x="13" y="13" width="22" height="28" rx="4" fill="#6F412C" stroke="#3D2014" strokeWidth="1.8" />
          <rect x="15" y="9" width="18" height="5" rx="2" fill="#A66A49" stroke="#3D2014" strokeWidth="1.6" />
          <rect x="14" y="20" width="20" height="12" fill="#F2D7BD" />
          <ellipse cx="24" cy="26" rx="5" ry="3.5" fill="#7B452D" />
          <path d="M20 26H28" stroke="#D9A782" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );
    case 'berry_jam_jar':
      return (
        <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
          <rect x="14" y="16" width="20" height="25" rx="5" fill="#EA4C73" stroke="#851E3B" strokeWidth="1.8" />
          <path d="M16 11C16 9.5 17.5 8.5 24 8.5C30.5 8.5 32 9.5 32 11V16H16V11Z" fill="#FFD2DF" stroke="#851E3B" strokeWidth="1.6" />
          <path d="M20 9V16M24 9V16M28 9V16" stroke="#E65A80" strokeWidth="1.8" />
          <rect x="16" y="22" width="16" height="12" rx="2.5" fill="#FFF9FA" />
          <circle cx="24" cy="28" r="3.5" fill="#E43F68" />
          <path d="M22.5 24.5L24 23L25.5 24.5" stroke="#459E51" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case 'chicken_cutlet':
      return (
        <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
          <rect x="9" y="15" width="30" height="22" rx="5" fill="#FFF4EC" stroke="#B2654A" strokeWidth="1.8" />
          <path
            d="M15 27C14 22 18.5 19 24.5 19.5C31 20 34.5 23.5 33.5 28C32.5 32 27.5 33 22 32.5C17.5 32 15.6 30 15 27Z"
            fill="#F49E7A"
            stroke="#9E482C"
            strokeWidth="1.7"
          />
          <path d="M20 24.5C23 23.5 26 24.5 28 26.5" stroke="#FFD6C2" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'honey_jar':
    default:
      return (
        <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
          <path d="M14 21C14 16.5 17.5 14 24 14C30.5 14 34 16.5 34 21V34C34 38.2 30.8 41 24 41C17.2 41 14 38.2 14 34V21Z" fill="#F6AE2D" stroke="#8C530D" strokeWidth="1.8" />
          <rect x="17" y="10" width="14" height="5" rx="2" fill="#E8C27A" stroke="#8C530D" strokeWidth="1.6" />
          <path d="M14 23C16.5 25.5 19 23.5 21 25C23.5 26.8 25.5 22.5 28.5 24.5C30.5 25.8 32.5 24.5 34 23" fill="#FFD859" />
          <path d="M28 11L36 6" stroke="#8C530D" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="24" cy="31" r="4.2" fill="#FFF4C2" opacity="0.85" />
        </svg>
      );
  }
};

export const PeppaDishIcon: React.FC<{
  id: PeppaRecipeId;
  className?: string;
}> = ({id, className = 'h-10 w-10'}) => {
  switch (id) {
    case 'mw_cheese_noodle':
      return (
        <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
          <path d="M10 23H38L34 38C33.5 40 31.5 41 29.5 41H18.5C16.5 41 14.5 40 14 38L10 23Z" fill="#FF8C73" stroke="#8A3220" strokeWidth="1.8" />
          <ellipse cx="24" cy="22.5" rx="14" ry="4.5" fill="#FFD35A" stroke="#A66B14" strokeWidth="1.6" />
          <circle cx="24" cy="21" r="4.2" fill="#FFFDF5" />
          <circle cx="24" cy="21" r="2.2" fill="#FF981A" />
          <path d="M16 14C15.5 11.5 17 10 16.5 7.5M24 13C23.5 10.5 25 9 24.5 6.5M32 14C31.5 11.5 33 10 32.5 7.5" stroke="#E0A95B" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
    case 'mw_honey_popcorn':
      return (
        <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
          <circle cx="18" cy="17" r="5" fill="#FBC446" stroke="#9B6110" strokeWidth="1.5" />
          <circle cx="24.5" cy="14" r="5.5" fill="#FFD96B" stroke="#9B6110" strokeWidth="1.5" />
          <circle cx="30.5" cy="17.5" r="4.8" fill="#FBC446" stroke="#9B6110" strokeWidth="1.5" />
          <path d="M13 21H35L31.5 41H16.5L13 21Z" fill="#FFF7EA" stroke="#B6551B" strokeWidth="1.8" />
          <path d="M18 21L19 41M24 21V41M30 21L29 41" stroke="#F48A3B" strokeWidth="3.2" />
        </svg>
      );
    case 'mw_garlic_toast':
      return (
        <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
          <ellipse cx="24" cy="37" rx="16" ry="4.5" fill="#FFF5E6" stroke="#9C7A52" strokeWidth="1.5" />
          <path d="M11 24C11 17 16.5 13 24 13C31.5 13 37 17 37 24L35 34C35 35.7 33.7 37 32 37H16C14.3 37 13 35.7 13 34L11 24Z" fill="#DF9A4A" stroke="#7E481A" strokeWidth="1.8" />
          <rect x="17" y="20" width="14" height="10" rx="3" fill="#FFF1AE" />
          <path d="M21 23L27 27M27 23L21 27" stroke="#E0A526" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case 'mw_cacao_milk':
      return (
        <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
          <path d="M14 19H32L30 38C29.7 40 28 41 26 41H20C18 41 16.3 40 16 38L14 19Z" fill="#7D4933" stroke="#422215" strokeWidth="1.8" />
          <path d="M31.5 22.5C35 22.5 36.8 24.4 36.8 26.8C36.8 29.2 35 31 31.2 31" stroke="#422215" strokeWidth="2.2" strokeLinecap="round" />
          <ellipse cx="23" cy="19" rx="9.5" ry="3.2" fill="#FFF4E1" stroke="#422215" strokeWidth="1.5" />
          <circle cx="21" cy="18.5" r="2.2" fill="#FFD38C" />
          <path d="M19 12C18.5 10 20 8.5 19.5 6.5M26 11C25.5 9 27 7.5 26.5 5.5" stroke="#B67C5B" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
    case 'mw_sausage_egg_cup':
      return (
        <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
          <path d="M11 23H37L34 37C33.5 39.2 31.5 40.5 29.3 40.5H18.7C16.5 40.5 14.5 39.2 14 37L11 23Z" fill="#FFF6EA" stroke="#8C5D3B" strokeWidth="1.8" />
          <ellipse cx="24" cy="22.5" rx="13" ry="4.5" fill="#FFDC73" stroke="#A67418" strokeWidth="1.5" />
          <circle cx="19.5" cy="21.5" r="2.8" fill="#D9503B" />
          <circle cx="28" cy="22" r="2.8" fill="#D9503B" />
          <circle cx="24" cy="19.8" r="2.3" fill="#FFAE26" />
        </svg>
      );
    case 'ov_sausage_pizza':
      return (
        <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
          <circle cx="24" cy="25" r="16" fill="#E39D46" stroke="#854416" strokeWidth="1.8" />
          <circle cx="24" cy="25" r="12.5" fill="#FFD25A" />
          <circle cx="18.5" cy="20.5" r="3" fill="#DB4836" />
          <circle cx="29" cy="20" r="3" fill="#DB4836" />
          <circle cx="21" cy="30" r="3" fill="#DB4836" />
          <circle cx="30" cy="29.5" r="2.8" fill="#DB4836" />
          <path d="M24 12V38M11 25H37" stroke="#C87E25" strokeWidth="1" opacity="0.6" />
        </svg>
      );
    case 'ov_butter_croissant':
      return (
        <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
          <ellipse cx="24" cy="37" rx="16" ry="4.5" fill="#FFF5E6" stroke="#9C7A52" strokeWidth="1.5" />
          <path
            d="M8 31C11 21 17.5 18 24 19C30.5 18 37 21 40 31C36.5 34.5 30.5 33.5 24 33.5C17.5 33.5 11.5 34.5 8 31Z"
            fill="#E79B42"
            stroke="#7B4316"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path d="M16.5 19.8L14.5 32.8M24 19.2V33.5M31.5 19.8L33.5 32.8" stroke="#A4581B" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
    case 'ov_honey_chicken':
      return (
        <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
          <ellipse cx="24" cy="36.5" rx="17" ry="5" fill="#FFF7EB" stroke="#8E6743" strokeWidth="1.6" />
          <path
            d="M12 28C12 21 18 17 26.5 18C33.5 18.8 36 23.5 35 28.5C34 32.5 27.5 33.5 21 33C15.5 32.5 12 31 12 28Z"
            fill="#D46F27"
            stroke="#75340C"
            strokeWidth="1.8"
          />
          <path d="M18 22.5C22 20.5 27.5 21.5 30.5 24.5" stroke="#FFCB6B" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="15.5" cy="31" r="2.2" fill="#68B85B" />
        </svg>
      );
    case 'ov_berry_tart':
      return (
        <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
          <path d="M10 25H38L34.5 37.5C34 39 32.5 40 30.8 40H17.2C15.5 40 14 39 13.5 37.5L10 25Z" fill="#E3AA64" stroke="#7E4D1B" strokeWidth="1.8" />
          <ellipse cx="24" cy="24.5" rx="14" ry="4.5" fill="#FFE6A8" stroke="#7E4D1B" strokeWidth="1.5" />
          <circle cx="19" cy="22.5" r="3.6" fill="#E53E68" stroke="#851A36" strokeWidth="1.3" />
          <circle cx="28.5" cy="22.5" r="3.6" fill="#E53E68" stroke="#851A36" strokeWidth="1.3" />
          <circle cx="24" cy="20" r="3.8" fill="#F0527B" stroke="#851A36" strokeWidth="1.3" />
          <path d="M24 15.5L26 13" stroke="#459E51" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'ov_choco_lava':
    default:
      return (
        <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
          <ellipse cx="24" cy="38" rx="16" ry="4" fill="#FFF5EB" stroke="#876652" strokeWidth="1.5" />
          <path d="M13 24C13 18.5 17.5 16 24 16C30.5 16 35 18.5 35 24L36.5 35H11.5L13 24Z" fill="#633622" stroke="#361A0E" strokeWidth="1.8" />
          <path d="M17 18.5C19.5 23 21.5 29 24 29C26.5 29 28.5 23 31 18.5" fill="#9E5532" />
          <circle cx="24" cy="18" r="3.5" fill="#A85D37" />
          <circle cx="24" cy="16" r="1.8" fill="#E64B6C" />
        </svg>
      );
  }
};
