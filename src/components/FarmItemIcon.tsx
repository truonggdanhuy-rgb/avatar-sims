import React from 'react';
import {
  AnimalProduceId,
  CropType,
  FarmSupplies,
  ProcessedId,
  RecipeId,
} from '../types/game';
import {CROPS} from '../data/farmCatalog';

export type FarmIconCategory =
  | 'crop'
  | 'seed'
  | 'animal_product'
  | 'processed'
  | 'dish'
  | 'supply';

interface FarmItemIconProps {
  kind: FarmIconCategory;
  id: string;
  className?: string;
}

const CropArt: React.FC<{id: CropType}> = ({id}) => {
  switch (id) {
    case 'wheat':
      return (
        <>
          <path d="M16 28V9" stroke="#C58B2B" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M16 25C12 22 9 19 8.5 16" stroke="#80AC4A" strokeWidth="2" strokeLinecap="round" />
          <path d="M16 25C20 22 23 19 23.5 16" stroke="#80AC4A" strokeWidth="2" strokeLinecap="round" />
          <ellipse cx="12.5" cy="11.5" rx="2.6" ry="3.8" transform="rotate(-28 12.5 11.5)" fill="#F3C751" />
          <ellipse cx="19.5" cy="11.5" rx="2.6" ry="3.8" transform="rotate(28 19.5 11.5)" fill="#F3C751" />
          <ellipse cx="12.8" cy="17.2" rx="2.5" ry="3.5" transform="rotate(-26 12.8 17.2)" fill="#E3AE39" />
          <ellipse cx="19.2" cy="17.2" rx="2.5" ry="3.5" transform="rotate(26 19.2 17.2)" fill="#E3AE39" />
          <ellipse cx="16" cy="6.8" rx="2.2" ry="3.2" fill="#F9DA72" />
        </>
      );
    case 'scallion':
      return (
        <>
          <ellipse cx="14" cy="24.5" rx="3.4" ry="3.2" fill="#F5F3EB" stroke="#DFDAC9" strokeWidth="1" />
          <ellipse cx="19" cy="24.8" rx="3" ry="2.8" fill="#F5F3EB" stroke="#DFDAC9" strokeWidth="1" />
          <path d="M13 22.5L10.5 7.5M14.5 22L14 5M18 22.5L19.5 6.5M20 23L23 10" stroke="#53AD4D" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M14 5L14 9M19.5 6.5L19 10" stroke="#7AD069" strokeWidth="1.6" strokeLinecap="round" />
        </>
      );
    case 'rice':
      return (
        <>
          <path d="M14 27C14 17 16 10 22 7" stroke="#6FA64A" strokeWidth="2.3" strokeLinecap="round" />
          <path d="M14 26C12 18 10 12 6.5 9.5" stroke="#5D923C" strokeWidth="2" strokeLinecap="round" />
          <ellipse cx="22.5" cy="9.5" rx="2.6" ry="1.5" transform="rotate(30 22.5 9.5)" fill="#F3D96F" />
          <ellipse cx="20.2" cy="13.2" rx="2.6" ry="1.5" transform="rotate(25 20.2 13.2)" fill="#ECCB54" />
          <ellipse cx="18" cy="16.8" rx="2.4" ry="1.4" transform="rotate(18 18 16.8)" fill="#F3D96F" />
          <ellipse cx="8" cy="11.5" rx="2.4" ry="1.4" transform="rotate(-25 8 11.5)" fill="#F3D96F" />
          <ellipse cx="10" cy="15" rx="2.3" ry="1.3" transform="rotate(-20 10 15)" fill="#ECCB54" />
        </>
      );
    case 'carrot':
      return (
        <>
          <path d="M16 9.5C15.5 6 12 4.5 9.5 5.2M16 9.5C16.5 5.5 20 4.5 22.5 5.5M16 9.5V3.5" stroke="#4D9C4B" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M11 10.5C11 8.5 21 8.5 21 10.5L17.6 26.5C17.2 28 14.8 28 14.4 26.5L11 10.5Z" fill="#F2822E" />
          <path d="M13 14.5H16.2M15.5 19H18.2M14 23H16.2" stroke="#D1641B" strokeWidth="1.4" strokeLinecap="round" />
        </>
      );
    case 'corn':
      return (
        <>
          <ellipse cx="16" cy="14" rx="5" ry="8.5" fill="#F6CE4B" />
          <circle cx="14.2" cy="10" r="1.1" fill="#FFE680" />
          <circle cx="17.8" cy="10" r="1.1" fill="#FFE680" />
          <circle cx="14" cy="13.5" r="1.1" fill="#FFE680" />
          <circle cx="18" cy="13.5" r="1.1" fill="#FFE680" />
          <path d="M9.5 14C9.5 21.5 12.2 27 16 27C19.8 27 22.5 21.5 22.5 14C19.8 18 17.6 20 16 20C14.4 20 12.2 18 9.5 14Z" fill="#59A452" />
          <path d="M16 5.5C15 4 17 3.5 18 4.8" stroke="#D9A84E" strokeWidth="1.8" strokeLinecap="round" />
        </>
      );
    case 'strawberry':
      return (
        <>
          <path d="M9.5 11.5C9.5 8.5 22.5 8.5 22.5 11.5L18.8 24.8C18 27.5 14 27.5 13.2 24.8L9.5 11.5Z" fill="#E84A60" />
          <path d="M9 10.5L16 7.2L23 10.5L19.5 12.6L16 11L12.5 12.6L9 10.5Z" fill="#4D9C4B" />
          <circle cx="14" cy="15.5" r="1" fill="#FFE39C" />
          <circle cx="18.2" cy="16" r="1" fill="#FFE39C" />
          <circle cx="16" cy="20.2" r="1" fill="#FFE39C" />
          <circle cx="13.8" cy="22" r="0.85" fill="#FFE39C" />
        </>
      );
    case 'vanilla':
      return (
        <>
          <path d="M10.5 26C12 17.5 14.2 12.5 19.5 8" stroke="#5E3A24" strokeWidth="3.2" strokeLinecap="round" />
          <path d="M16.5 26.5C17.5 19.5 19 15 22.8 11.5" stroke="#754A2F" strokeWidth="2.8" strokeLinecap="round" />
          <circle cx="15" cy="9.5" r="4.2" fill="#FFF3CA" stroke="#E0C068" strokeWidth="1.2" />
          <circle cx="15" cy="9.5" r="1.5" fill="#E6A935" />
        </>
      );
    case 'tomato':
      return (
        <>
          <circle cx="16" cy="17.5" r="8.8" fill="#E24739" />
          <ellipse cx="13" cy="14" rx="2.3" ry="1.5" transform="rotate(-30 13 14)" fill="#FF8C80" opacity="0.65" />
          <path d="M11.5 9.5L16 6.2L20.5 9.5L16 11.8L11.5 9.5Z" fill="#4C944A" />
          <path d="M16 6.5V4" stroke="#4C944A" strokeWidth="2" strokeLinecap="round" />
        </>
      );
    case 'lemon':
      return (
        <>
          <ellipse cx="15.5" cy="17" rx="9" ry="7" transform="rotate(-24 15.5 17)" fill="#F9D54C" />
          <circle cx="7.5" cy="20.6" r="1.8" fill="#F2C738" />
          <circle cx="23.5" cy="13.4" r="1.8" fill="#F2C738" />
          <path d="M19.5 8.5C21.8 6.2 25 6.8 25 9.2C22.4 10.2 20.2 9.8 19.5 8.5Z" fill="#529B4D" />
        </>
      );
    case 'sugarcane':
      return (
        <>
          <path d="M11.5 27.5L14 8.5M20 27.5L18.5 7" stroke="#74B854" strokeWidth="4.2" strokeLinecap="round" />
          <path d="M10.8 19.5H15.4M17.2 18H21.8M11.5 13.5H15.8" stroke="#E1E8A4" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M14 8.5C11 5.5 8 6 6.5 8.5M18.5 7C21.5 4.2 24.5 5 26 7.5" stroke="#4D9C4B" strokeWidth="2.4" strokeLinecap="round" />
        </>
      );
    case 'watermelon':
      return (
        <>
          <circle cx="16" cy="17" r="9.2" fill="#4BA558" />
          <path d="M12 8.8C13.3 13.8 13.3 19.8 12 25.2M16 7.8C17.2 13.8 17.2 19.8 16 26.2M20 8.8C18.7 13.8 18.7 19.8 20 25.2" stroke="#1D5E29" strokeWidth="2" strokeLinecap="round" />
          <path d="M16 7.8C16 5.5 17.8 4.5 19.5 5.2" stroke="#3D7F44" strokeWidth="2" strokeLinecap="round" />
        </>
      );
    case 'pumpkin':
      return (
        <>
          <path d="M16 8.5C16 5.8 18 4.5 19.8 5.4" stroke="#4C8444" strokeWidth="2.8" strokeLinecap="round" />
          <ellipse cx="11.8" cy="17.5" rx="5.8" ry="7.4" fill="#DC691D" />
          <ellipse cx="20.2" cy="17.5" rx="5.8" ry="7.4" fill="#DC691D" />
          <ellipse cx="16" cy="17.5" rx="4.6" ry="7.8" fill="#F28533" />
        </>
      );
    case 'cacao':
      return (
        <>
          <ellipse cx="16" cy="17" rx="7.2" ry="9.8" fill="#A65E39" />
          <path d="M16 7.5V26.5M12.5 9.5C11 14 11 19.5 12.5 24.5M19.5 9.5C21 14 21 19.5 19.5 24.5" stroke="#72391D" strokeWidth="1.7" strokeLinecap="round" />
          <path d="M16 7.2V4.5" stroke="#5D3720" strokeWidth="2.4" strokeLinecap="round" />
        </>
      );
    case 'coffee':
      return (
        <>
          <path d="M16 13.5V7.5M16 9C19 6.8 22.5 7.5 23.2 9.8" stroke="#3E8245" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="12.2" cy="18.2" r="5.2" fill="#CC3E4D" />
          <circle cx="20" cy="19" r="4.9" fill="#B32F3E" />
          <circle cx="10.6" cy="16.4" r="1.4" fill="#F2828D" opacity="0.65" />
        </>
      );
  }
};

const SeedArt: React.FC<{id: CropType}> = ({id}) => {
  const def = CROPS[id];
  return (
    <>
      <rect x="6" y="7" width="20" height="21" rx="3.5" fill="#E9D3AE" stroke="#B78C56" strokeWidth="1.6" />
      <path d="M6 10.5L16 13.5L26 10.5" fill="#D9BD90" />
      <rect x="9" y="13.5" width="14" height="11.5" rx="2.5" fill="#FFFDF8" />
      <circle cx="16" cy="19.2" r="4.2" fill={def?.color ?? '#6EA85C'} />
      <circle cx="16" cy="19.2" r="1.8" fill={def?.accentColor ?? '#FFF'} />
    </>
  );
};

const AnimalProductArt: React.FC<{id: AnimalProduceId}> = ({id}) => {
  switch (id) {
    case 'chicken_egg':
      return (
        <>
          <ellipse cx="14" cy="17.5" rx="6.2" ry="8" transform="rotate(-10 14 17.5)" fill="#F9E7BF" stroke="#DEC08A" strokeWidth="1.2" />
          <ellipse cx="20.5" cy="19" rx="5" ry="6.6" transform="rotate(14 20.5 19)" fill="#FFF2D6" stroke="#DEC08A" strokeWidth="1.2" />
        </>
      );
    case 'duck_egg':
      return (
        <>
          <ellipse cx="14.5" cy="17.5" rx="6.4" ry="8.2" transform="rotate(-8 14.5 17.5)" fill="#D7EFE7" stroke="#A7D4C6" strokeWidth="1.2" />
          <ellipse cx="20.8" cy="19" rx="5.1" ry="6.8" transform="rotate(14 20.8 19)" fill="#E9F9F4" stroke="#A7D4C6" strokeWidth="1.2" />
        </>
      );
    case 'pork':
      return (
        <>
          <path d="M7.5 19.5C6.5 13 11.5 8.5 18 9.2C23.5 9.8 26 14 24.5 19.2C23 23.8 17.5 24.5 13 23.5C9.5 22.8 8 21.5 7.5 19.5Z" fill="#F5B4BA" stroke="#D4747E" strokeWidth="1.5" />
          <ellipse cx="16" cy="16.2" rx="5.8" ry="4" fill="#DC6874" />
          <circle cx="14" cy="16.2" r="1.6" fill="#FFF7F2" />
        </>
      );
    case 'milk':
      return (
        <>
          <path d="M11.5 8H20.5L22 13.5V25.5C22 26.9 20.9 28 19.5 28H12.5C11.1 28 10 26.9 10 25.5V13.5L11.5 8Z" fill="#F8FAFC" stroke="#B7CDE0" strokeWidth="1.5" />
          <rect x="11" y="5" width="10" height="3.5" rx="1.2" fill="#5D9CD4" />
          <rect x="10.5" y="15.5" width="11" height="6.5" fill="#7FB8EA" opacity="0.5" />
          <circle cx="16" cy="18.8" r="2.1" fill="#FFF" />
        </>
      );
  }
};

const ProcessedArt: React.FC<{id: ProcessedId}> = ({id}) => {
  switch (id) {
    case 'flour':
      return (
        <>
          <path d="M8.5 12C8.5 9.5 23.5 9.5 23.5 12L25 25C25 26.8 23.5 28 21.5 28H10.5C8.5 28 7 26.8 7 25L8.5 12Z" fill="#F5E9D3" stroke="#CBB28B" strokeWidth="1.5" />
          <path d="M11 7.5H21L19.5 10.5H12.5L11 7.5Z" fill="#E6CFA9" />
          <circle cx="16" cy="19.5" r="4" fill="#DFBE74" />
        </>
      );
    case 'rice_noodle':
      return (
        <>
          <path d="M6.5 17.5C6.5 23.5 10.5 27.5 16 27.5C21.5 27.5 25.5 23.5 25.5 17.5H6.5Z" fill="#6BA383" />
          <path d="M9 17.5C9.5 12.5 13 10.5 16 10.5C19 10.5 22.5 12.5 23 17.5" fill="#FAF6EE" stroke="#DFD5C2" strokeWidth="1.2" />
          <path d="M11 15C13.5 13.5 18.5 13.5 21 15" stroke="#DFD5C2" strokeWidth="1.3" strokeLinecap="round" />
        </>
      );
    case 'brown_sugar':
      return (
        <>
          <path d="M6.5 24.5L13 11.5C14.3 9.2 17.7 9.2 19 11.5L25.5 24.5H6.5Z" fill="#B87740" />
          <rect x="11" y="21" width="5" height="5" rx="1" fill="#9A5D2B" />
          <rect x="16.5" y="21" width="5" height="5" rx="1" fill="#CE8E52" />
          <circle cx="16" cy="15.5" r="1.2" fill="#E8B97F" />
        </>
      );
    case 'cane_syrup':
      return (
        <>
          <rect x="9.5" y="10" width="13" height="17" rx="3.5" fill="#E59B34" stroke="#B7711A" strokeWidth="1.5" />
          <rect x="12" y="6" width="8" height="4" rx="1.2" fill="#8C5B32" />
          <path d="M12.5 14V23" stroke="#FAD07A" strokeWidth="2.2" strokeLinecap="round" opacity="0.7" />
        </>
      );
    case 'berry_jam':
      return (
        <>
          <rect x="9" y="10.5" width="14" height="16.5" rx="3.5" fill="#D3435B" stroke="#9B263B" strokeWidth="1.5" />
          <rect x="8.5" y="7" width="15" height="4" rx="1.5" fill="#F2D7B6" stroke="#C59D6B" strokeWidth="1.2" />
          <rect x="11.5" y="15" width="9" height="7" rx="1.8" fill="#FFF7F2" />
          <circle cx="16" cy="18.5" r="2.1" fill="#E54E63" />
        </>
      );
    case 'cacao_powder':
      return (
        <>
          <path d="M8.5 12H23.5L22.5 25.5C22.3 27 21 28 19.5 28H12.5C11 28 9.7 27 9.5 25.5L8.5 12Z" fill="#7D4932" stroke="#542E1D" strokeWidth="1.5" />
          <rect x="8" y="8" width="16" height="4" rx="1.5" fill="#C9986B" />
          <ellipse cx="16" cy="19.5" rx="3.5" ry="4.5" fill="#B56E4B" />
        </>
      );
    case 'roasted_coffee':
      return (
        <>
          <rect x="8.5" y="8.5" width="15" height="19" rx="3" fill="#6C3F28" stroke="#472616" strokeWidth="1.5" />
          <circle cx="16" cy="18" r="4.6" fill="#F6E9D5" />
          <ellipse cx="16" cy="18" rx="2.4" ry="3.2" transform="rotate(-25 16 18)" fill="#522B18" />
          <path d="M15.2 15.5C16.2 17 15.8 19 16.8 20.5" stroke="#E5CBB0" strokeWidth="1" strokeLinecap="round" />
        </>
      );
    case 'cheese':
      return (
        <>
          <path d="M5.5 17.5L22.5 9.5L26.5 15.5V24.5H5.5V17.5Z" fill="#FAD75D" stroke="#D9A826" strokeWidth="1.5" strokeLinejoin="round" />
          <circle cx="12.5" cy="20.8" r="1.8" fill="#E4A825" />
          <circle cx="19.5" cy="18.5" r="2.1" fill="#E4A825" />
          <circle cx="22.8" cy="22.2" r="1.3" fill="#E4A825" />
        </>
      );
    case 'fresh_cream':
      return (
        <>
          <path d="M8 20.5H24L22 27H10L8 20.5Z" fill="#7FB8EA" />
          <path d="M9.5 20.5C9 16 12.5 15.5 16 15.5C19.5 15.5 23 16 22.5 20.5Z" fill="#FFFDF8" stroke="#E2D9C8" strokeWidth="1" />
          <path d="M12.5 16C12.5 11.5 16 11 16 8.2C16.5 11 19.5 11.5 19.5 16Z" fill="#FFFDF8" stroke="#E2D9C8" strokeWidth="1" />
        </>
      );
  }
};

const DishArt: React.FC<{id: RecipeId}> = ({id}) => {
  switch (id) {
    // === DRINKS ===
    case 'sugarcane_juice':
    case 'watermelon_juice':
    case 'watermelon_smoothie':
    case 'strawberry_tea':
    case 'honey_lemonade':
    case 'pumpkin_smoothie': {
      const fill =
        id === 'sugarcane_juice'
          ? '#A8D870'
          : id === 'watermelon_juice'
            ? '#F05B6E'
            : id === 'watermelon_smoothie'
              ? '#F78495'
              : id === 'strawberry_tea'
                ? '#EC6D83'
                : id === 'honey_lemonade'
                  ? '#F8DC64'
                  : '#F29C42';
      const garnish =
        id === 'honey_lemonade'
          ? '#FFE97D'
          : id === 'watermelon_juice' || id === 'watermelon_smoothie'
            ? '#3E8F4B'
            : id === 'strawberry_tea'
              ? '#DF3952'
              : '#FFFDF7';
      return (
        <>
          <path d="M18.5 10.5L22.5 4.5" stroke="#DF6C58" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M9.5 11H22.5L20.5 27.5H11.5L9.5 11Z" fill={fill} stroke="#FFFFFF" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M11 14H21" stroke="#FFF" strokeWidth="1.5" opacity="0.6" />
          <circle cx="22.5" cy="11.5" r="3" fill={garnish} />
        </>
      );
    }
    case 'corn_milk':
    case 'hot_cacao':
    case 'milk_coffee':
    case 'vanilla_iced_coffee': {
      const body =
        id === 'corn_milk'
          ? '#F7DB76'
          : id === 'hot_cacao'
            ? '#7D4B34'
            : id === 'milk_coffee'
              ? '#965F3E'
              : '#B27850';
      const foam = id === 'corn_milk' ? '#FFF8DA' : '#FFFDF8';
      return (
        <>
          <path d="M22.5 15.5C25.5 15.5 26 21.5 22 21.5" stroke="#D9C4AA" strokeWidth="2.4" fill="none" />
          <rect x="8.5" y="12.5" width="14" height="14.5" rx="3.2" fill={body} stroke="#6E4630" strokeWidth="1.4" />
          <ellipse cx="15.5" cy="12.8" rx="7" ry="2.6" fill={foam} />
          {id === 'vanilla_iced_coffee' && <circle cx="15.5" cy="11.8" r="1.8" fill="#E6A935" />}
          {id === 'hot_cacao' && (
            <path d="M13.5 9C13 7.5 14 6.5 14 5.5M17.5 9C17 7.5 18 6.5 18 5.5" stroke="#DFBBA2" strokeWidth="1.4" strokeLinecap="round" />
          )}
        </>
      );
    }
    // === BAKERY ===
    case 'butter_bread':
      return (
        <>
          <ellipse cx="16" cy="19" rx="10.5" ry="6.2" fill="#DF9548" stroke="#B26A27" strokeWidth="1.5" />
          <path d="M10.5 16L13 19M15.5 15.2L17.5 18.8M20 16L21.5 19" stroke="#F8CE82" strokeWidth="2" strokeLinecap="round" />
        </>
      );
    case 'egg_tart':
      return (
        <>
          <path d="M7.5 17.5H24.5L22 25.5H10L7.5 17.5Z" fill="#DDA055" stroke="#B5742D" strokeWidth="1.4" />
          <ellipse cx="16" cy="17.2" rx="8.4" ry="3.2" fill="#FBE067" />
          <circle cx="17.5" cy="16.5" r="2" fill="#F2B830" />
        </>
      );
    case 'pumpkin_pie':
      return (
        <>
          <path d="M6.5 18.5L23.5 11.5L25.5 22.5L6.5 23.5V18.5Z" fill="#E57B27" stroke="#A6531A" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M6.5 22.5H25.5" stroke="#DFB274" strokeWidth="2.8" strokeLinecap="round" />
          <circle cx="15.5" cy="17" r="2.6" fill="#FFFDF8" />
        </>
      );
    case 'strawberry_cake':
      return (
        <>
          <rect x="7" y="15.5" width="18" height="10.5" rx="2.5" fill="#F8C7CE" stroke="#D17B8A" strokeWidth="1.4" />
          <path d="M7 17.5C9.5 19.5 11.5 19.5 13.5 17.5C15.5 19.5 17.5 19.5 19.5 17.5C21.5 19.5 23.5 19.5 25 17.5V15.5H7V17.5Z" fill="#FFFDF9" />
          <circle cx="16" cy="12" r="3.2" fill="#E54B62" />
          <path d="M14.5 9.5L16 8L17.5 9.5" stroke="#4D9C4B" strokeWidth="1.6" strokeLinecap="round" />
        </>
      );
    case 'duck_egg_flan':
    case 'vanilla_flan':
      return (
        <>
          <ellipse cx="16" cy="24.5" rx="10.5" ry="3" fill="#E5D5C0" />
          <path d="M9.5 23.5L11.5 13.5H20.5L22.5 23.5H9.5Z" fill={id === 'vanilla_flan' ? '#FCE18A' : '#F6C85F'} />
          <path d="M11.2 13.5H20.8L19.8 16C17.5 17.2 14.5 17.2 12.2 16L11.2 13.5Z" fill="#8C4820" />
          {id === 'vanilla_flan' && <circle cx="16" cy="12" r="2" fill="#FFF3CA" />}
        </>
      );
    case 'panna_cotta':
      return (
        <>
          <ellipse cx="16" cy="24.5" rx="9.5" ry="2.8" fill="#E6EFEA" />
          <path d="M10 23.5L11.5 13.5H20.5L22 23.5H10Z" fill="#FFF9F3" stroke="#E4D6C8" strokeWidth="1.2" />
          <path d="M11.5 13.5H20.5L19.5 16.5C17 17.5 15 17.5 12.5 16.5L11.5 13.5Z" fill="#E54E63" />
          <circle cx="16" cy="11.5" r="2.2" fill="#E54E63" />
        </>
      );
    case 'berry_cheesecake':
      return (
        <>
          <path d="M6.5 18L22.5 11.5L25.5 22.5L6.5 23.5V18Z" fill="#FBEAC3" stroke="#D4B274" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M6.5 18L22.5 11.5L24 14.2L7 19.8Z" fill="#D3455E" />
          <path d="M6.5 22.5H25.5" stroke="#B67A48" strokeWidth="2.5" strokeLinecap="round" />
        </>
      );
    case 'cacao_brownie':
      return (
        <>
          <path d="M7 14.5L16 10L25 14.5V22.5L16 27L7 22.5V14.5Z" fill="#6E3E2A" stroke="#4D291A" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M7 14.5L16 19L25 14.5" stroke="#8F543B" strokeWidth="1.6" fill="none" />
          <path d="M16 19V27" stroke="#4D291A" strokeWidth="1.4" />
        </>
      );
    // === MEALS ===
    case 'carrot_soup':
      return (
        <>
          <path d="M6 17H26C25.5 23.5 21.5 27.5 16 27.5C10.5 27.5 6.5 23.5 6 17Z" fill="#F5EDE0" stroke="#C8B49B" strokeWidth="1.4" />
          <ellipse cx="16" cy="16.5" rx="9" ry="3.2" fill="#EC6D33" />
          <circle cx="16" cy="16.2" r="2.2" fill="#FFF4DF" />
        </>
      );
    case 'tomato_pasta':
      return (
        <>
          <ellipse cx="16" cy="21" rx="11.5" ry="5.5" fill="#F9F6F0" stroke="#D2C5B4" strokeWidth="1.4" />
          <ellipse cx="16" cy="18.5" rx="7.5" ry="4" fill="#F5D376" />
          <circle cx="16" cy="17.5" r="4.2" fill="#DD493A" />
          <circle cx="13.5" cy="16.5" r="1.4" fill="#529C4D" />
        </>
      );
    case 'pork_pho':
      return (
        <>
          <path d="M6 16.5H26C25.5 23.5 21.5 27.5 16 27.5C10.5 27.5 6.5 23.5 6 16.5Z" fill="#528A6D" />
          <ellipse cx="16" cy="16.2" rx="9" ry="3" fill="#EED4A2" />
          <circle cx="13.5" cy="15.8" r="2.4" fill="#E38E8A" />
          <circle cx="18.8" cy="16" r="1.5" fill="#5DB254" />
          <path d="M18 11.5L25 7.5M19.5 13L26 9.5" stroke="#B67B48" strokeWidth="1.6" strokeLinecap="round" />
        </>
      );
    case 'corn_fried_rice':
      return (
        <>
          <ellipse cx="16" cy="21.5" rx="11.2" ry="5" fill="#FFFDF8" stroke="#D7C7B0" strokeWidth="1.4" />
          <path d="M8.5 20C9 13.5 23 13.5 23.5 20Z" fill="#F7D86C" />
          <circle cx="13.5" cy="17" r="1.2" fill="#E89D32" />
          <circle cx="18.5" cy="17.5" r="1.2" fill="#53AD4D" />
          <circle cx="16" cy="15.5" r="1.3" fill="#F4AE3C" />
        </>
      );
    case 'glazed_carrot':
      return (
        <>
          <ellipse cx="16" cy="21.5" rx="11.2" ry="5" fill="#FFFDF8" stroke="#D7C7B0" strokeWidth="1.4" />
          <ellipse cx="13" cy="19.5" rx="4.5" ry="2.2" transform="rotate(-18 13 19.5)" fill="#EB7B27" />
          <ellipse cx="19" cy="18.8" rx="4.5" ry="2.2" transform="rotate(15 19 18.8)" fill="#F29132" />
          <circle cx="16" cy="16.5" r="1.4" fill="#53A34D" />
        </>
      );
    case 'salted_duck_porridge':
      return (
        <>
          <path d="M6.5 17H25.5C25 23.5 21.5 27.5 16 27.5C10.5 27.5 7 23.5 6.5 17Z" fill="#E9C79B" stroke="#C59B69" strokeWidth="1.4" />
          <ellipse cx="16" cy="16.8" rx="8.6" ry="2.8" fill="#F7E6BE" />
          <circle cx="14.5" cy="16.5" r="2.2" fill="#F2AF3A" />
          <circle cx="18.8" cy="16.8" r="1.6" fill="#D5736E" />
        </>
      );
    case 'roasted_pork_corn':
      return (
        <>
          <ellipse cx="16" cy="21.5" rx="11.5" ry="5.2" fill="#FFFDF8" stroke="#D7C7B0" strokeWidth="1.4" />
          <ellipse cx="14" cy="18.5" rx="5.5" ry="3.5" fill="#C96452" />
          <ellipse cx="20.5" cy="18" rx="3.4" ry="2.4" fill="#F5CD4B" />
          <circle cx="11.5" cy="16" r="1.6" fill="#DF483B" />
        </>
      );
    case 'cheese_omelet':
      return (
        <>
          <ellipse cx="16" cy="21.5" rx="11.2" ry="5" fill="#FFFDF8" stroke="#D7C7B0" strokeWidth="1.4" />
          <path d="M8.5 19.5C9.5 14 22.5 14 23.5 19.5C21 22 11 22 8.5 19.5Z" fill="#FAD252" stroke="#E0A526" strokeWidth="1.3" />
          <circle cx="18.5" cy="17.2" r="1.8" fill="#DF483B" />
        </>
      );
  }
};

const SupplyArt: React.FC<{id: keyof FarmSupplies}> = ({id}) => {
  switch (id) {
    case 'bugSpray':
      return (
        <>
          <path d="M11 13H20L21.5 26C21.5 27.2 20.5 28 19.2 28H11.8C10.5 28 9.5 27.2 9.5 26L11 13Z" fill="#E8657B" />
          <rect x="13" y="9" width="5" height="4" fill="#B54156" />
          <path d="M11 8H21L23.5 9.5H17.5V11.5H13.5V8H11Z" fill="#FFFDF8" stroke="#9B8C7E" strokeWidth="1.2" />
          <circle cx="25" cy="9" r="1" fill="#89D6F2" />
          <circle cx="27" cy="11" r="0.9" fill="#89D6F2" />
        </>
      );
    case 'animalFeed':
      return (
        <>
          <path d="M9 11.5C9 9.5 23 9.5 23 11.5L24.5 25C24.5 26.8 23 28 21 28H11C9 28 7.5 26.8 7.5 25L9 11.5Z" fill="#E6AE58" stroke="#B67B2F" strokeWidth="1.5" />
          <path d="M12 7.5H20L18.5 10.5H13.5L12 7.5Z" fill="#CF933E" />
          <circle cx="16" cy="19.5" r="3.6" fill="#FFF3D2" />
        </>
      );
    case 'animalMedicine':
      return (
        <>
          <rect x="10" y="11" width="12" height="16.5" rx="3" fill="#FFF8F9" stroke="#C95168" strokeWidth="1.6" />
          <rect x="12.5" y="6.5" width="7" height="4.5" rx="1.2" fill="#C95168" />
          <path d="M16 15.5V23M12.2 19.2H19.8" stroke="#D94B64" strokeWidth="2.6" strokeLinecap="round" />
        </>
      );
    case 'fishFeed':
      return (
        <>
          <path d="M9 11.5C9 9.5 23 9.5 23 11.5L24.5 25C24.5 26.8 23 28 21 28H11C9 28 7.5 26.8 7.5 25L9 11.5Z" fill="#4692B8" stroke="#2B6787" strokeWidth="1.5" />
          <path d="M12 7.5H20L18.5 10.5H13.5L12 7.5Z" fill="#2F789B" />
          <ellipse cx="15.5" cy="19.5" rx="4" ry="2.6" fill="#FFE28F" />
          <path d="M19.5 19.5L22 17.5V21.5L19.5 19.5Z" fill="#FFE28F" />
        </>
      );
    case 'fishMedicine':
      return (
        <>
          <rect x="10" y="11" width="12" height="16.5" rx="3" fill="#F2FAF4" stroke="#4B8A5B" strokeWidth="1.6" />
          <rect x="12.5" y="6.5" width="7" height="4.5" rx="1.2" fill="#4B8A5B" />
          <path d="M16 15.5V23M12.2 19.2H19.8" stroke="#4B8A5B" strokeWidth="2.6" strokeLinecap="round" />
        </>
      );
  }
};

export const FarmItemIcon: React.FC<FarmItemIconProps> = ({
  kind,
  id,
  className = 'h-7 w-7',
}) => {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" aria-hidden="true">
      {kind === 'crop' && <CropArt id={id as CropType} />}
      {kind === 'seed' && <SeedArt id={id as CropType} />}
      {kind === 'animal_product' && <AnimalProductArt id={id as AnimalProduceId} />}
      {kind === 'processed' && <ProcessedArt id={id as ProcessedId} />}
      {kind === 'dish' && <DishArt id={id as RecipeId} />}
      {kind === 'supply' && <SupplyArt id={id as keyof FarmSupplies} />}
    </svg>
  );
};
