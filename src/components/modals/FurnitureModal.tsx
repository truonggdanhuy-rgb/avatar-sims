import React, {useState} from 'react';
import {Armchair, PackageCheck, Plus, X} from 'lucide-react';
import {FURNITURE_CATALOG, FURNITURE_CATEGORIES} from '../../data/furnitureCatalog';
import {FurnitureCatalogItem, FurnitureCategory, PlacedFurniture} from '../../types/game';
import {soundFX} from '../../utils/sound';

interface FurnitureModalProps {
  inventory: Record<string, number>;
  placed: PlacedFurniture[];
  tab?: 'all' | FurnitureCategory;
  onTabChange?: (nextTab: 'all' | FurnitureCategory) => void;
  onPlaceItem: (catalogId: string) => void;
  onClose: () => void;
}

export const FurnitureSvgPreview: React.FC<{item: FurnitureCatalogItem}> = ({item}) => {
  const c = item.color;
  const a = item.accentColor || '#9E734B';

  switch (item.kind) {
    case 'sofa':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="8" y="14" width="48" height="18" rx="6" fill={a} />
          <rect x="6" y="24" width="52" height="16" rx="5" fill={c} />
          <rect x="12" y="40" width="6" height="6" rx="2" fill="#7A5230" />
          <rect x="46" y="40" width="6" height="6" rx="2" fill="#7A5230" />
        </svg>
      );
    case 'armchair':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="16" y="12" width="32" height="20" rx="6" fill={a} />
          <rect x="12" y="24" width="40" height="16" rx="5" fill={c} />
          <rect x="18" y="40" width="5" height="6" rx="2" fill="#7A5230" />
          <rect x="41" y="40" width="5" height="6" rx="2" fill="#7A5230" />
        </svg>
      );
    case 'coffee_table':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="8" y="20" width="48" height="8" rx="3" fill={c} />
          <rect x="14" y="28" width="5" height="16" rx="2" fill={a} />
          <rect x="45" y="28" width="5" height="16" rx="2" fill={a} />
          <rect x="24" y="14" width="16" height="6" rx="2" fill={a} opacity="0.7" />
        </svg>
      );
    case 'dining_table':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="7" y="18" width="50" height="7" rx="2.5" fill={c} />
          <path d="M16,17 H48 L50,28 L44,25 L38,28 L32,25 L26,28 L20,25 L14,28 Z" fill={a} />
          <rect x="13" y="25" width="5" height="20" rx="1.5" fill="#9A673B" />
          <rect x="46" y="25" width="5" height="20" rx="1.5" fill="#9A673B" />
        </svg>
      );
    case 'tv_stand':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="14" y="8" width="36" height="20" rx="3" fill={a} />
          <rect x="17" y="11" width="30" height="14" rx="2" fill="#8CD3F5" />
          <rect x="8" y="30" width="48" height="14" rx="3" fill={c} />
        </svg>
      );
    case 'bookshelf':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="16" y="6" width="32" height="42" rx="3" fill={c} />
          <rect x="20" y="12" width="24" height="8" rx="1" fill="#FFF4E2" />
          <rect x="20" y="23" width="24" height="8" rx="1" fill="#FFF4E2" />
          <rect x="20" y="34" width="24" height="8" rx="1" fill="#FFF4E2" />
          <rect x="22" y="13" width="5" height="7" fill={a} />
          <rect x="29" y="13" width="5" height="7" fill="#6BA383" />
          <rect x="24" y="24" width="5" height="7" fill="#69B3E7" />
        </svg>
      );
    case 'rug_round':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <ellipse cx="32" cy="28" rx="24" ry="15" fill={c} />
          <ellipse cx="32" cy="28" rx="16" ry="10" fill={a} />
        </svg>
      );
    case 'bed':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="12" y="10" width="40" height="16" rx="4" fill={a} />
          <rect x="16" y="16" width="14" height="8" rx="3" fill="#FFFDF8" />
          <rect x="34" y="16" width="14" height="8" rx="3" fill="#FFFDF8" />
          <rect x="10" y="24" width="44" height="20" rx="4" fill={c} />
        </svg>
      );
    case 'wardrobe':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="15" y="6" width="34" height="42" rx="4" fill={c} />
          <rect x="19" y="12" width="11" height="30" rx="2" fill="#C59363" />
          <rect x="34" y="12" width="11" height="26" rx="2" fill={a} />
        </svg>
      );
    case 'nightstand':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <polygon points="24,10 40,10 43,20 21,20" fill={a} />
          <rect x="30" y="20" width="4" height="6" fill="#8C5E3A" />
          <rect x="18" y="26" width="28" height="20" rx="3" fill={c} />
          <rect x="22" y="30" width="20" height="6" rx="1.5" fill="#E8C79B" />
        </svg>
      );
    case 'dining_chair':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="22" y="10" width="20" height="16" rx="3" fill={c} />
          <rect x="20" y="26" width="24" height="6" rx="2" fill={a} />
          <rect x="22" y="32" width="4" height="14" fill={c} />
          <rect x="38" y="32" width="4" height="14" fill={c} />
        </svg>
      );
    case 'fridge':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="20" y="6" width="24" height="42" rx="4" fill={c} stroke="#D5C6B2" strokeWidth="1.5" />
          <line x1="20" y1="22" x2="44" y2="22" stroke={a} strokeWidth="2" />
          <rect x="24" y="12" width="3" height="7" rx="1" fill={a} />
          <rect x="24" y="27" width="3" height="10" rx="1" fill={a} />
        </svg>
      );
    case 'dish_cabinet':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="14" y="7" width="36" height="22" rx="2.5" fill="#EDE0CE" stroke={c} strokeWidth="2.5" />
          <line x1="15" y1="18" x2="49" y2="18" stroke="#8F5F39" strokeWidth="2" />
          <ellipse cx="22" cy="15" rx="4" ry="2.2" fill="#FFFFFF" />
          <ellipse cx="22" cy="13" rx="4" ry="2" fill="#9CD6EE" />
          <rect x="36" y="11" width="3.5" height="6" rx="1" fill="#8FD8EC" />
          <rect x="42" y="10" width="3.5" height="7" rx="1" fill="#E3A65B" />
          <circle cx="24" cy="24" r="3" fill="#9AD1B3" />
          <rect x="36" y="21" width="4" height="6" rx="1" fill="#FFFFFF" />
          <rect x="12" y="29" width="40" height="18" rx="3" fill={c} />
          <rect x="16" y="33" width="14" height="11" rx="1.5" fill="#EFE0CA" />
          <rect x="34" y="33" width="14" height="11" rx="1.5" fill="#EFE0CA" />
        </svg>
      );
    case 'bathtub':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <circle cx="17" cy="40" r="2.5" fill="#E6BC5A" />
          <circle cx="47" cy="40" r="2.5" fill="#E6BC5A" />
          <path d="M12,23 H52 L49,38 Q32,42 15,38 Z" fill={c} stroke="#CBD5DF" strokeWidth="1.5" />
          <rect x="9" y="20" width="46" height="5" rx="2.5" fill={c} stroke="#CBD5DF" strokeWidth="1.2" />
          <ellipse cx="32" cy="22" rx="16" ry="3.2" fill={a} />
          <path d="M47,20 V13 A4,4 0 0,0 39,13" fill="none" stroke="#B8C4CE" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="22" cy="18" r="2.4" fill="#FFD447" />
        </svg>
      );
    case 'vanity_sink':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <path d="M21,26 V14 A11,10 0 0,1 43,14 V26 Z" fill={a} stroke="#B98452" strokeWidth="2" />
          <rect x="15" y="28" width="34" height="17" rx="3" fill={c} stroke="#D5C6B2" strokeWidth="1.5" />
          <ellipse cx="32" cy="28" rx="8" ry="3" fill="#FFFFFF" stroke="#D5C6B2" strokeWidth="1" />
        </svg>
      );
    case 'floor_lamp':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <polygon points="24,8 40,8 45,22 19,22" fill={c} />
          <rect x="30" y="22" width="4" height="22" fill={a} />
          <ellipse cx="32" cy="45" rx="10" ry="3.5" fill={a} />
        </svg>
      );
    case 'table_lamp':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <polygon points="22,12 42,12 47,28 17,28" fill={c} stroke="#E4C170" strokeWidth="1.2" />
          <rect x="30" y="28" width="4" height="7" fill="#E6BC5A" />
          <ellipse cx="32" cy="40" rx="8" ry="7" fill={a} />
        </svg>
      );
    case 'wall_lamp':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="14" y="18" width="6" height="16" rx="2" fill={a} />
          <line x1="20" y1="26" x2="31" y2="26" stroke="#E6BC5A" strokeWidth="3" />
          <polygon points="26,14 42,14 46,27 22,27" fill={c} stroke="#E4C170" strokeWidth="1.2" />
        </svg>
      );
    case 'potted_plant':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <circle cx="32" cy="20" r="10" fill={c} />
          <circle cx="24" cy="24" r="7" fill={c} />
          <circle cx="40" cy="24" r="7" fill={c} />
          <polygon points="23,30 41,30 37,46 27,46" fill={a} />
        </svg>
      );
    case 'window_single':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="18" y="8" width="28" height="34" rx="3" fill={c} />
          <rect x="22" y="12" width="20" height="26" rx="1.5" fill={a} />
          <line x1="32" y1="12" x2="32" y2="38" stroke={c} strokeWidth="2.5" />
          <line x1="22" y1="24" x2="42" y2="24" stroke={c} strokeWidth="2.5" />
          <rect x="15" y="42" width="34" height="4" rx="1.5" fill="#EDE0CC" />
        </svg>
      );
    case 'window_double':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="10" y="9" width="44" height="33" rx="3" fill={c} />
          <rect x="14" y="13" width="16" height="25" rx="1.5" fill={a} />
          <rect x="34" y="13" width="16" height="25" rx="1.5" fill={a} />
          <line x1="14" y1="24" x2="30" y2="24" stroke={c} strokeWidth="2" />
          <line x1="34" y1="24" x2="50" y2="24" stroke={c} strokeWidth="2" />
          <rect x="7" y="42" width="50" height="4" rx="1.5" fill="#EDE0CC" />
        </svg>
      );
    case 'window_curtain':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="14" y="11" width="36" height="30" rx="2.5" fill={c} />
          <rect x="18" y="14" width="28" height="24" rx="1.5" fill="#BFE9FA" />
          <line x1="8" y1="8" x2="56" y2="8" stroke="#7A5230" strokeWidth="3" strokeLinecap="round" />
          <rect x="11" y="9" width="11" height="35" rx="3" fill={a} />
          <rect x="42" y="9" width="11" height="35" rx="3" fill={a} />
          <rect x="12" y="41" width="40" height="4" rx="1.5" fill="#EDE0CC" />
        </svg>
      );
    case 'wall_clock':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <circle cx="32" cy="27" r="18" fill={c} />
          <circle cx="32" cy="27" r="14" fill={a} />
          <line x1="32" y1="27" x2="32" y2="17" stroke="#4A3525" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="32" y1="27" x2="40" y2="27" stroke="#4A3525" strokeWidth="2" strokeLinecap="round" />
          <circle cx="32" cy="27" r="2.2" fill="#F4C95D" />
        </svg>
      );
    case 'kitchen_l_counter':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="10" y="12" width="44" height="14" rx="2.5" fill={c} stroke="#C7B6A0" strokeWidth="1.2" />
          <rect x="38" y="12" width="16" height="32" rx="2.5" fill={c} stroke="#C7B6A0" strokeWidth="1.2" />
          <rect x="14" y="14" width="14" height="8" rx="1.5" fill="#9BB0BF" />
          <rect x="41" y="29" width="10" height="11" rx="1.5" fill="#2B3445" />
          <circle cx="46" cy="34.5" r="2.5" stroke="#7AD0F5" strokeWidth="1.2" fill="none" />
        </svg>
      );
    case 'microwave':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="11" y="15" width="42" height="26" rx="4" fill={c} stroke="#D5C6B2" strokeWidth="1.4" />
          <rect x="15" y="19" width="24" height="18" rx="2.5" fill="#27313D" stroke={a} strokeWidth="1.8" />
          <ellipse cx="27" cy="33" rx="6.5" ry="1.8" fill="#FFF8EE" opacity="0.85" />
          <rect x="42" y="19" width="8" height="5" rx="1" fill="#7CECD2" />
          <circle cx="46" cy="29" r="2.8" fill={a} />
          <rect x="42.5" y="34" width="7" height="3" rx="1" fill={a} />
        </svg>
      );
    case 'mini_oven':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="11" y="14" width="42" height="27" rx="4" fill={c} stroke="#88B5A2" strokeWidth="1.4" />
          <rect x="14" y="17" width="36" height="21" rx="2.5" fill="#FFF8EE" />
          <rect x="17" y="20" width="22" height="15" rx="2" fill="#2D3642" />
          <rect x="19" y="22" width="18" height="11" rx="1.2" fill="#4A3828" />
          <line x1="20" y1="29" x2="36" y2="29" stroke="#CBD5E1" strokeWidth="1.2" />
          <line x1="20" y1="24" x2="36" y2="24" stroke="#FF8F33" strokeWidth="1.4" />
          <line x1="19" y1="19.5" x2="37" y2="19.5" stroke={a} strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="44" cy="22" r="2.2" fill={a} />
          <circle cx="44" cy="28.5" r="2.2" fill={a} />
          <circle cx="44" cy="34.5" r="1.8" fill="#FF8F33" />
        </svg>
      );
    case 'wooden_table':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="10" y="18" width="44" height="7" rx="2.5" fill={c} />
          <rect x="14" y="25" width="36" height="4" fill={a} />
          <rect x="14" y="29" width="5" height="17" rx="1.5" fill={a} />
          <rect x="45" y="29" width="5" height="17" rx="1.5" fill={a} />
        </svg>
      );
    case 'wooden_chair':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="21" y="10" width="4" height="22" rx="1.5" fill={c} />
          <rect x="39" y="10" width="4" height="22" rx="1.5" fill={c} />
          <rect x="21" y="11" width="22" height="6" rx="2" fill={c} />
          <rect x="19" y="27" width="26" height="6" rx="2" fill={c} />
          <rect x="21" y="25" width="22" height="3" rx="1.5" fill={a} />
          <rect x="21" y="33" width="4" height="13" fill={c} />
          <rect x="39" y="33" width="4" height="13" fill={c} />
        </svg>
      );
    case 'table_tv':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="12" y="11" width="40" height="24" rx="3" fill={c} />
          <rect x="15" y="14" width="34" height="18" rx="1.5" fill={a} />
          <rect x="29" y="35" width="6" height="5" fill="#4B5563" />
          <rect x="21" y="40" width="22" height="4" rx="2" fill="#4B5563" />
        </svg>
      );
    case 'wall_tv':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="8" y="10" width="48" height="28" rx="3" fill={c} />
          <rect x="11" y="13" width="42" height="22" rx="1.5" fill={a} />
          <rect x="18" y="41" width="28" height="4" rx="2" fill="#4B5563" />
        </svg>
      );
    case 'plant_fiddle':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <line x1="32" y1="16" x2="32" y2="33" stroke="#7B5636" strokeWidth="3" />
          <ellipse cx="32" cy="14" rx="9" ry="5.5" fill={c} />
          <ellipse cx="22" cy="21" rx="8" ry="5" fill={c} />
          <ellipse cx="42" cy="21" rx="8" ry="5" fill={c} />
          <polygon points="23,32 41,32 38,46 26,46" fill={a} stroke="#D5C6B2" strokeWidth="1.2" />
        </svg>
      );
    case 'plant_snake':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <path d="M25,33 L22,15 L28,33 Z" fill={c} />
          <path d="M31,33 L32,10 L36,33 Z" fill="#87C875" />
          <path d="M37,33 L42,16 L41,33 Z" fill={c} />
          <polygon points="23,32 41,32 38,46 26,46" fill={a} />
        </svg>
      );
    case 'flower_basket':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <path d="M21,28 A11,12 0 0,1 43,28" fill="none" stroke={a} strokeWidth="2.8" />
          <circle cx="26" cy="24" r="5" fill={c} />
          <circle cx="32" cy="21" r="5" fill="#FFD166" />
          <circle cx="38" cy="24" r="5" fill="#FFF6EA" stroke="#E5C5C5" strokeWidth="1" />
          <polygon points="20,27 44,27 40,44 24,44" fill={a} />
        </svg>
      );
    case 'wall_calendar':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="18" y="8" width="28" height="36" rx="3" fill={c} stroke="#D5C6B2" strokeWidth="1.5" />
          <rect x="20" y="10" width="24" height="9" rx="1.5" fill={a} />
          <rect x="22" y="23" width="5" height="4" fill="#EADBC8" />
          <rect x="29.5" y="23" width="5" height="4" fill="#F4A261" />
          <rect x="37" y="23" width="5" height="4" fill="#EADBC8" />
          <rect x="22" y="30" width="5" height="4" fill="#EADBC8" />
          <rect x="29.5" y="30" width="5" height="4" fill="#EADBC8" />
          <rect x="37" y="30" width="5" height="4" fill="#EADBC8" />
        </svg>
      );
    case 'succulent_shelf':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <circle cx="19" cy="24" r="4.8" fill={a} />
          <circle cx="19" cy="24" r="2.2" fill="#9EE0AC" />
          <rect x="15" y="26" width="8" height="7" rx="1.5" fill="#D98C5F" />
          <circle cx="32" cy="23" r="5.2" fill="#82C79A" />
          <circle cx="32" cy="23" r="2.4" fill="#BDEBC9" />
          <rect x="28" y="26" width="8" height="7" rx="1.5" fill="#EFE4D2" />
          <circle cx="45" cy="24" r="4.8" fill="#569D72" />
          <circle cx="45" cy="24" r="2.2" fill="#8CD4A5" />
          <rect x="41" y="26" width="8" height="7" rx="1.5" fill="#C47E58" />
          <rect x="10" y="33" width="44" height="5" rx="2" fill={c} />
        </svg>
      );
    case 'wall_calendar_tet':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="19" y="6" width="26" height="36" rx="3" fill="#B81D24" stroke="#F5C443" strokeWidth="1.5" />
          <rect x="21" y="8" width="22" height="12" rx="1.5" fill="#D92B2B" />
          <circle cx="26" cy="14" r="2.2" fill="#FFD43B" />
          <rect x="21" y="21" width="22" height="19" rx="1.5" fill="#FFF7E8" />
          <text x="32" y="34" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#C92424">1</text>
          <polygon points="30,42 34,42 32,50" fill="#B81D24" />
        </svg>
      );
    case 'tet_couplets':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="14" y="8" width="12" height="36" rx="1.5" fill="#C92424" stroke="#F6C945" strokeWidth="1.4" />
          <rect x="38" y="8" width="12" height="36" rx="1.5" fill="#C92424" stroke="#F6C945" strokeWidth="1.4" />
          <line x1="12" y1="8" x2="28" y2="8" stroke="#5E2814" strokeWidth="2.5" />
          <line x1="36" y1="8" x2="52" y2="8" stroke="#5E2814" strokeWidth="2.5" />
          <circle cx="20" cy="18" r="2" fill="#FFE47A" />
          <circle cx="20" cy="26" r="2" fill="#FFE47A" />
          <circle cx="20" cy="34" r="2" fill="#FFE47A" />
          <circle cx="44" cy="18" r="2" fill="#FFE47A" />
          <circle cx="44" cy="26" r="2" fill="#FFE47A" />
          <circle cx="44" cy="34" r="2" fill="#FFE47A" />
        </svg>
      );
    case 'tet_mai_pot':
    case 'tet_peach_pot':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <path d="M32,33 L32,19 M32,26 L21,18 M32,23 L43,16" stroke="#6A4125" strokeWidth="3" strokeLinecap="round" />
          <circle cx="21" cy="17" r="4.5" fill={c} />
          <circle cx="32" cy="13" r="5" fill={c} />
          <circle cx="43" cy="16" r="4.5" fill={c} />
          <circle cx="26" cy="23" r="3.5" fill={c} />
          <circle cx="38" cy="23" r="3.5" fill={c} />
          <circle cx="32" cy="13" r="1.6" fill="#E87A14" />
          <polygon points="22,33 42,33 38,47 26,47" fill={a} stroke="#F5C443" strokeWidth="1.3" />
        </svg>
      );
    case 'tet_tea_table':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="8" y="20" width="48" height="7" rx="2.5" fill={c} stroke={a} strokeWidth="1.5" />
          <rect x="13" y="27" width="38" height="4" fill={a} />
          <rect x="14" y="38" width="36" height="3" rx="1" fill={c} />
          <rect x="12" y="27" width="5" height="19" rx="1.5" fill={a} />
          <rect x="47" y="27" width="5" height="19" rx="1.5" fill={a} />
        </svg>
      );
    case 'tet_chair':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="20" y="9" width="24" height="19" rx="3" fill={c} />
          <circle cx="32" cy="18" r="4" fill="#E8C366" />
          <rect x="18" y="28" width="28" height="6" rx="2" fill={a} />
          <rect x="20" y="34" width="4.5" height="13" fill={c} />
          <rect x="39.5" y="34" width="4.5" height="13" fill={c} />
        </svg>
      );
    case 'tet_five_fruit_tray':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <path d="M18,27 Q32,10 46,27" fill="none" stroke="#76B947" strokeWidth="5" strokeLinecap="round" />
          <circle cx="32" cy="25" r="7" fill="#F2C12E" />
          <circle cx="22" cy="27" r="4.5" fill="#E03E6E" />
          <circle cx="42" cy="27" r="4.5" fill="#FFA928" />
          <polygon points="16,30 48,30 41,37 23,37" fill={a} stroke="#F2C249" strokeWidth="1.2" />
          <rect x="28" y="37" width="8" height="6" fill={a} />
          <ellipse cx="32" cy="44" rx="10" ry="3" fill={a} />
        </svg>
      );
    case 'tet_banh_chung':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <ellipse cx="32" cy="36" rx="22" ry="8" fill="#E7F0EA" stroke="#F2C249" strokeWidth="1.4" />
          <rect x="17" y="20" width="18" height="15" rx="2.5" fill="#2E8540" />
          <line x1="23" y1="20" x2="23" y2="35" stroke="#EAD293" strokeWidth="1.8" />
          <line x1="29" y1="20" x2="29" y2="35" stroke="#EAD293" strokeWidth="1.8" />
          <circle cx="42" cy="26" r="7" fill="#226F3D" />
          <path d="M35,34 A7,7 0 0,0 49,34 Z" fill="#F0444D" />
        </svg>
      );
    case 'tea_set_ceramic':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <path d="M16,29 C11,29 11,36 16,36" fill="none" stroke={c} strokeWidth="2.4" />
          <ellipse cx="24" cy="32" rx="8.5" ry="7" fill={c} />
          <path d="M31,29 L36,24" stroke={c} strokeWidth="2.8" strokeLinecap="round" />
          <circle cx="24" cy="24" r="2.2" fill="#F2C249" />
          <rect x="38" y="33" width="6" height="6.5" rx="1.5" fill={c} />
          <rect x="46" y="34" width="5.5" height="5.5" rx="1.5" fill={c} />
          <rect x="39" y="32" width="4" height="1.4" fill="#D48C38" />
          <rect x="47" y="33" width="3.5" height="1.2" fill="#D48C38" />
        </svg>
      );
    case 'tet_lantern_lamp':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <path d="M22,46 V12 H37" fill="none" stroke="#4E2414" strokeWidth="3.2" strokeLinecap="round" />
          <ellipse cx="37" cy="26" rx="9" ry="11" fill={c} />
          <rect x="33" y="14" width="8" height="2.5" fill={a} />
          <rect x="33" y="36" width="8" height="2.5" fill={a} />
          <polygon points="35,39 39,39 37,47" fill={c} />
        </svg>
      );
    case 'tet_vase_blossom':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <path d="M31,25 Q23,16 19,9" fill="none" stroke="#6D4325" strokeWidth="2" strokeLinecap="round" />
          <path d="M32,25 Q33,15 35,7" fill="none" stroke="#6D4325" strokeWidth="2" strokeLinecap="round" />
          <path d="M33,25 Q41,17 45,11" fill="none" stroke="#6D4325" strokeWidth="2" strokeLinecap="round" />
          <circle cx="19" cy="11" r="3.6" fill="#FF9EB5" />
          <circle cx="25" cy="16" r="2.8" fill="#FF9EB5" />
          <circle cx="35" cy="9" r="3.8" fill="#FF9EB5" />
          <circle cx="32" cy="15" r="2.6" fill="#FFB3C6" />
          <circle cx="44" cy="12" r="3.4" fill="#FF9EB5" />
          <circle cx="19" cy="11" r="1.2" fill="#F6C945" />
          <circle cx="35" cy="9" r="1.3" fill="#F6C945" />
          <circle cx="44" cy="12" r="1.1" fill="#F6C945" />
          <ellipse cx="32" cy="37" rx="8.5" ry="10" fill={c} />
          <rect x="28" y="24" width="8" height="6" rx="1.5" fill={c} />
          <rect x="27" y="24" width="10" height="2.2" rx="1" fill="#F4EFE4" />
        </svg>
      );
    case 'tet_rug_red':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="8" y="13" width="48" height="28" rx="4" fill={c} stroke={a} strokeWidth="2" />
          <circle cx="32" cy="27" r="7.5" fill="none" stroke={a} strokeWidth="1.8" />
          <circle cx="32" cy="27" r="3.5" fill="#FFD43B" />
        </svg>
      );
    case 'tet_flower_wreath':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <circle cx="32" cy="27" r="15" fill="none" stroke="#8C5B32" strokeWidth="5.5" />
          <circle cx="21" cy="20" r="4.2" fill="#FFD43B" />
          <circle cx="19" cy="31" r="4" fill="#FF9EB5" />
          <circle cx="26" cy="39" r="4.2" fill="#FFD43B" />
          <circle cx="43" cy="20" r="3.8" fill="#FFD43B" />
          <circle cx="45" cy="30" r="4" fill="#FF9EB5" />
          <ellipse cx="26" cy="13" rx="5" ry="3" fill={a} />
          <ellipse cx="38" cy="13" rx="5" ry="3" fill={a} />
          <circle cx="32" cy="13" r="2.8" fill="#F5C443" />
          <path d="M30,42 L28,50 M34,42 L36,50" stroke={a} strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    case 'xmas_wreath':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <circle cx="32" cy="29" r="15" fill="none" stroke="#15472B" strokeWidth="8.5" strokeLinecap="round" strokeDasharray="3 1.5" />
          <circle cx="32" cy="29" r="14.2" fill="none" stroke="#247345" strokeWidth="5.5" strokeDasharray="4 3" />
          <circle cx="32" cy="29" r="13.5" fill="none" stroke="#539972" strokeWidth="3" strokeDasharray="2 5" />
          <circle cx="29" cy="22" r="2.8" fill="#F2C249" />
          <circle cx="35" cy="24" r="2.8" fill="#F2C249" />
          <ellipse cx="25.5" cy="14" rx="5.5" ry="3.2" fill={a} />
          <ellipse cx="38.5" cy="14" rx="5.5" ry="3.2" fill={a} />
          <path d="M30,15 L25,25 M34,15 L39,25" stroke={a} strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="32" cy="14" r="3" fill="#841118" />
          <circle cx="18.5" cy="25" r="2.8" fill="#F7A43B" stroke="#DF6F24" strokeWidth="1" />
          <circle cx="45.5" cy="25" r="2.8" fill="#F7A43B" stroke="#DF6F24" strokeWidth="1" />
          <circle cx="21" cy="39" r="2.5" fill="#8E5631" />
          <circle cx="43" cy="39" r="2.5" fill="#8E5631" />
          <circle cx="31" cy="44" r="2.1" fill="#E02430" />
          <circle cx="34.5" cy="43" r="2.1" fill="#E02430" />
        </svg>
      );
    case 'xmas_tree':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <polygon points="32,7 22,20 42,20" fill="#2E8B57" />
          <polygon points="32,15 18,30 46,30" fill="#237447" />
          <polygon points="32,24 14,41 50,41" fill="#1B5E3A" />
          <rect x="29" y="41" width="6" height="6" fill="#6B4427" />
          <circle cx="32" cy="6" r="3" fill="#FFE066" />
          <circle cx="28" cy="24" r="2.2" fill="#E03131" />
          <circle cx="37" cy="28" r="2.2" fill="#FFE066" />
          <circle cx="24" cy="36" r="2.2" fill="#4DABF7" />
          <circle cx="39" cy="37" r="2.2" fill="#E03131" />
        </svg>
      );
    case 'xmas_snowman':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <circle cx="32" cy="37" r="10" fill={c} stroke="#CBD5E1" strokeWidth="1.2" />
          <circle cx="32" cy="23" r="7.2" fill={c} stroke="#CBD5E1" strokeWidth="1.2" />
          <rect x="26" y="28" width="12" height="3.2" rx="1.5" fill={a} />
          <rect x="25" y="14" width="14" height="2.5" rx="1" fill="#2B303A" />
          <rect x="27" y="7" width="10" height="7.5" rx="1.5" fill="#2B303A" />
          <polygon points="32,22 39,23.5 32,25" fill="#FF7A1A" />
        </svg>
      );
    case 'xmas_gift_boxes':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="13" y="25" width="18" height="19" rx="2" fill={c} />
          <rect x="20" y="25" width="4" height="19" fill={a} />
          <rect x="33" y="29" width="17" height="15" rx="2" fill="#237447" />
          <rect x="39.5" y="29" width="4" height="15" fill="#F8F9FA" />
          <rect x="21" y="13" width="14" height="12" rx="2" fill="#FFF5E1" stroke="#E2D5C1" strokeWidth="1" />
          <rect x="26.5" y="13" width="3" height="12" fill={c} />
        </svg>
      );
    case 'moon_lamp':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <path d="M26,10 A15,15 0 1,0 44,36" fill="none" stroke={a} strokeWidth="3" strokeLinecap="round" />
          <circle cx="33" cy="24" r="11" fill={c} />
          <circle cx="29" cy="21" r="2.2" fill="#E6C97A" />
          <circle cx="36" cy="26" r="2.8" fill="#E6C97A" />
          <ellipse cx="32" cy="45" rx="9" ry="3" fill="#5E3A22" />
        </svg>
      );
    case 'bonsai_zen':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <path d="M25,35 Q20,26 32,20 Q41,16 44,12" fill="none" stroke="#6E472B" strokeWidth="4.2" strokeLinecap="round" />
          <path d="M29,24 L19,21" fill="none" stroke="#6E472B" strokeWidth="2.4" strokeLinecap="round" />
          <ellipse cx="18" cy="20" rx="8" ry="4" fill="#2E6F40" />
          <ellipse cx="33" cy="13" rx="9" ry="4.5" fill={c} />
          <ellipse cx="46" cy="16" rx="8" ry="4" fill="#68B572" />
          <polygon points="15,35 49,35 45,44 19,44" fill={a} />
          <rect x="20" y="44" width="4" height="3" fill={a} />
          <rect x="40" y="44" width="4" height="3" fill={a} />
        </svg>
      );
    case 'vinyl_corner':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="10" y="16" width="44" height="24" rx="4" fill={c} />
          <rect x="13" y="19" width="38" height="18" rx="2" fill="#F2E9DC" />
          <circle cx="27" cy="28" r="8" fill="#1E222A" />
          <circle cx="27" cy="28" r="3" fill={a} />
          <line x1="42" y1="21" x2="36" y2="30" stroke="#E8C366" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
    case 'white_desk':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="8" y="16" width="48" height="5" rx="2" fill={c} stroke={a} strokeWidth="1.2" />
          <rect x="11" y="21" width="24" height="7" rx="1.5" fill={a} />
          <circle cx="17" cy="24.5" r="1.3" fill="#DFBE73" />
          <circle cx="29" cy="24.5" r="1.3" fill="#DFBE73" />
          <rect x="37" y="21" width="16" height="7" rx="1.5" fill={c} stroke={a} strokeWidth="1" />
          <line x1="13" y1="28" x2="10" y2="46" stroke={a} strokeWidth="3.2" strokeLinecap="round" />
          <line x1="51" y1="28" x2="54" y2="46" stroke={a} strokeWidth="3.2" strokeLinecap="round" />
        </svg>
      );
    case 'white_study_chair':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="20" y="10" width="24" height="10" rx="3" fill={c} stroke={a} strokeWidth="1.2" />
          <rect x="22" y="12" width="20" height="6" rx="2" fill={a} />
          <line x1="23" y1="20" x2="23" y2="28" stroke={a} strokeWidth="2.5" />
          <line x1="41" y1="20" x2="41" y2="28" stroke={a} strokeWidth="2.5" />
          <rect x="19" y="28" width="26" height="5" rx="2" fill={c} stroke={a} strokeWidth="1.2" />
          <line x1="22" y1="33" x2="20" y2="46" stroke={a} strokeWidth="2.8" strokeLinecap="round" />
          <line x1="42" y1="33" x2="44" y2="46" stroke={a} strokeWidth="2.8" strokeLinecap="round" />
        </svg>
      );
    case 'office_swivel_chair':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="24" y="6" width="16" height="6" rx="2.5" fill={a} />
          <rect x="21" y="13" width="22" height="17" rx="4" fill={c} stroke="#CBD5E1" strokeWidth="1.2" />
          <rect x="23" y="15" width="18" height="13" rx="3" fill={a} />
          <rect x="18" y="30" width="28" height="6" rx="2.5" fill={a} />
          <line x1="17" y1="24" x2="21" y2="24" stroke="#64748B" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="43" y1="24" x2="47" y2="24" stroke="#64748B" strokeWidth="2.2" strokeLinecap="round" />
          <rect x="30" y="36" width="4" height="7" fill="#94A3B8" />
          <line x1="20" y1="45" x2="44" y2="45" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="20" cy="46.5" r="2" fill="#334155" />
          <circle cx="32" cy="46.5" r="2" fill="#334155" />
          <circle cx="44" cy="46.5" r="2" fill="#334155" />
        </svg>
      );
    case 'study_laptop':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="15" y="11" width="34" height="22" rx="2.5" fill="#CBD5E1" stroke="#94A3B8" strokeWidth="1.2" />
          <rect x="18" y="14" width="28" height="16" rx="1.5" fill={a} />
          <circle cx="32" cy="21" r="4.5" fill="#FFFDF8" opacity="0.85" />
          <polygon points="15,33 49,33 54,42 10,42" fill={c} stroke="#94A3B8" strokeWidth="1.2" />
          <rect x="20" y="35" width="24" height="3" rx="1" fill="#475569" />
          <rect x="27" y="39" width="10" height="2" rx="1" fill="#94A3B8" />
        </svg>
      );
    case 'desktop_pc_set':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="8" y="11" width="30" height="20" rx="2.5" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="1.3" />
          <rect x="10.5" y="13.5" width="25" height="15" rx="1.5" fill={a} />
          <rect x="21" y="31" width="4" height="4" fill="#CBD5E1" />
          <rect x="16" y="35" width="14" height="2.5" rx="1" fill="#94A3B8" />
          <rect x="11" y="40" width="21" height="4.5" rx="1.5" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="1" />
          <ellipse cx="37" cy="42" rx="3.2" ry="2.2" fill="#F4A6BE" />
          <rect x="43" y="14" width="13" height="29" rx="2.5" fill={c} stroke="#94A3B8" strokeWidth="1.3" />
          <circle cx="49.5" cy="23" r="3.6" fill={a} stroke="#FFFFFF" strokeWidth="1" />
          <circle cx="49.5" cy="34" r="3.6" fill="#F7A8B8" stroke="#FFFFFF" strokeWidth="1" />
        </svg>
      );
    case 'wall_pinboard':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="9" y="10" width="46" height="34" rx="3" fill="#DFB684" stroke="#B68756" strokeWidth="2.5" />
          <rect x="14" y="15" width="12" height="11" rx="1" fill="#FFF29E" />
          <rect x="29" y="14" width="12" height="12" rx="1" fill="#FFB8CC" />
          <rect x="42" y="17" width="9" height="10" rx="1" fill="#B8EBD0" />
          <rect x="16" y="29" width="14" height="10" rx="1" fill="#BDE4FF" />
          <rect x="34" y="28" width="14" height="11" rx="1" fill="#FFFFFF" />
          <circle cx="20" cy="17" r="1.7" fill="#E85D68" />
          <circle cx="35" cy="16" r="1.7" fill="#5FAEE3" />
          <circle cx="41" cy="30" r="1.7" fill="#F4C44E" />
        </svg>
      );
    case 'study_desk_lamp':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <path d="M24,42 L19,26 L36,15" fill="none" stroke="#DFBE73" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <polygon points="33,12 46,16 42,26 29,21" fill={a} />
          <circle cx="36" cy="24" r="3.2" fill={c} />
          <ellipse cx="26" cy="43" rx="10" ry="3.5" fill={a} />
        </svg>
      );
    case 'pen_holder':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <line x1="25" y1="26" x2="21" y2="11" stroke={a} strokeWidth="3.5" strokeLinecap="round" />
          <line x1="32" y1="26" x2="33" y2="9" stroke="#79B6E8" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="38" y1="26" x2="43" y2="12" stroke="#F28BA8" strokeWidth="3.5" strokeLinecap="round" />
          <rect x="21" y="24" width="22" height="21" rx="4" fill={c} stroke="#FFF8EE" strokeWidth="1.6" />
        </svg>
      );
    case 'art_supply_rack':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="13" y="15" width="38" height="28" rx="3" fill={c} stroke="#C79D6B" strokeWidth="1.5" />
          <line x1="14" y1="29" x2="50" y2="29" stroke="#C79D6B" strokeWidth="2" />
          <circle cx="24" cy="22" r="5" fill="#FFF8EE" />
          <circle cx="22" cy="21" r="1.6" fill={a} />
          <circle cx="26" cy="23" r="1.6" fill="#5FAEE3" />
          <rect x="35" y="17" width="10" height="10" rx="1.5" fill={a} />
          <rect x="18" y="33" width="6" height="7" rx="1" fill="#E76F51" />
          <rect x="26" y="33" width="6" height="7" rx="1" fill="#F4C44E" />
          <rect x="34" y="33" width="6" height="7" rx="1" fill="#5FAEE3" />
        </svg>
      );
    case 'pencil_case':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="12" y="21" width="40" height="16" rx="7" fill={c} stroke="#E484A0" strokeWidth="1.5" />
          <rect x="16" y="20" width="32" height="3.5" rx="1.5" fill={a} />
          <circle cx="46" cy="22" r="2.2" fill="#DFBE73" />
          <circle cx="22" cy="29" r="3" fill={a} />
          <line x1="16" y1="42" x2="46" y2="42" stroke="#79B6E8" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case 'book_stack':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="14" y="35" width="36" height="8" rx="2" fill={c} />
          <rect x="16" y="37" width="30" height="4" fill="#FFF8EA" />
          <rect x="16" y="27" width="33" height="8" rx="2" fill={a} />
          <rect x="18" y="29" width="27" height="4" fill="#FFF8EA" />
          <rect x="18" y="19" width="29" height="8" rx="2" fill="#7DBB92" />
          <circle cx="32" cy="14" r="4" fill="#E85D68" />
        </svg>
      );
    case 'open_book':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="10" y="15" width="44" height="26" rx="3" fill={a} />
          <rect x="13" y="17" width="18" height="22" rx="1.5" fill={c} />
          <rect x="33" y="17" width="18" height="22" rx="1.5" fill={c} />
          <line x1="16" y1="22" x2="28" y2="22" stroke="#94A3B8" strokeWidth="1.8" />
          <line x1="16" y1="27" x2="27" y2="27" stroke="#94A3B8" strokeWidth="1.8" />
          <circle cx="42" cy="25" r="4" fill="#F7A8B8" />
          <line x1="31" y1="16" x2="31" y2="43" stroke="#E85D68" strokeWidth="2.2" />
        </svg>
      );
    case 'headphone_stand':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="30" y="14" width="4" height="27" fill="#CBD5E1" />
          <ellipse cx="32" cy="43" rx="11" ry="3.5" fill={c} stroke="#CBD5E1" strokeWidth="1.2" />
          <path d="M19,28 A13,14 0 0,1 45,28" fill="none" stroke={a} strokeWidth="4.5" strokeLinecap="round" />
          <rect x="15" y="24" width="7" height="11" rx="3.5" fill={a} />
          <rect x="42" y="24" width="7" height="11" rx="3.5" fill={a} />
        </svg>
      );
    case 'table_snack_tray':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="10" y="33" width="44" height="9" rx="3" fill={c} stroke="#C8A476" strokeWidth="1.4" />
          <polygon points="16,20 26,20 24,33 18,33" fill="#FFB7CC" />
          <rect x="15.5" y="17" width="11" height="3.5" rx="1.5" fill="#FFF8EE" />
          <line x1="22" y1="17" x2="26" y2="10" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
          <ellipse cx="39" cy="32" rx="10" ry="3" fill="#FFFFFF" />
          <rect x="31" y="24" width="10" height="7" rx="1.5" fill="#F4D08A" />
          <rect x="31" y="22" width="10" height="2.5" rx="1" fill="#FFF8EE" />
          <circle cx="36" cy="20" r="2.2" fill="#E63946" />
          <circle cx="44" cy="28" r="4" fill={a} />
          <circle cx="44" cy="28" r="1.4" fill="#FFF8EE" />
        </svg>
      );
    case 'cozy_fireplace':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="10" y="13" width="44" height="5" rx="2" fill="#C89866" />
          <rect x="13" y="18" width="38" height="27" rx="2" fill={c} stroke="#D5C6B2" strokeWidth="1.2" />
          <rect x="21" y="24" width="22" height="20" rx="2" fill={a} />
          <rect x="24" y="27" width="16" height="17" rx="2" fill="#2E2623" />
          <path d="M27,43 Q32,31 37,43 Z" fill="#FF9E1B" />
          <path d="M29.5,43 Q32,35 34.5,43 Z" fill="#FFD166" />
          <rect x="8" y="44" width="48" height="4" rx="1.5" fill="#A99A8B" />
        </svg>
      );
    case 'fish_aquarium':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="13" y="27" width="38" height="19" rx="2" fill={c} stroke="#B69870" strokeWidth="1.4" />
          <line x1="32" y1="28" x2="32" y2="45" stroke="#B69870" strokeWidth="1.4" />
          <rect x="14" y="10" width="36" height="17" rx="2" fill={a} stroke="#2B3640" strokeWidth="2" />
          <ellipse cx="26" cy="18" rx="4" ry="2.2" fill="#FF8C42" />
          <ellipse cx="39" cy="21" rx="3.5" ry="2" fill="#FFD166" />
          <path d="M18,26 Q20,18 22,26" stroke="#49A068" strokeWidth="2.5" fill="none" />
        </svg>
      );
    case 'beanbag_chair':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <ellipse cx="32" cy="36" rx="19" ry="11" fill={c} />
          <circle cx="32" cy="24" r="13" fill={c} />
          <ellipse cx="33" cy="31" rx="11" ry="6" fill={a} opacity="0.85" />
          <path d="M15,38 Q32,44 49,38" stroke={a} strokeWidth="2" fill="none" />
        </svg>
      );
    case 'cat_tree_tower':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="13" y="43" width="38" height="4" rx="2" fill={c} />
          <rect x="16" y="29" width="17" height="14" rx="2" fill={c} stroke="#C7B299" strokeWidth="1.2" />
          <circle cx="24.5" cy="36" r="4" fill="#4C3D34" />
          <rect x="38" y="25" width="5" height="18" fill={a} />
          <rect x="27" y="23" width="22" height="4" rx="1.5" fill={c} />
          <rect x="29" y="13" width="4.5" height="10" fill={a} />
          <ellipse cx="31" cy="12" rx="11" ry="3.5" fill={c} stroke="#C7B299" strokeWidth="1.2" />
          <circle cx="43" cy="31" r="2.6" fill="#F28BA8" />
        </svg>
      );
    case 'wall_gallery_frames':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="7" y="16" width="14" height="20" rx="2" fill={c} />
          <rect x="9.5" y="18.5" width="9" height="15" fill="#CFE9F7" />
          <rect x="24" y="12" width="16" height="24" rx="2" fill={c} />
          <rect x="26.5" y="14.5" width="11" height="19" fill="#FDE3EC" />
          <polygon points="28,31 32,22 36,31" fill="#F4A261" />
          <rect x="43" y="16" width="14" height="20" rx="2" fill={c} />
          <rect x="45.5" y="18.5" width="9" height="15" fill="#E8F3E0" />
          <circle cx="50" cy="27" r="3.5" fill={a} />
        </svg>
      );
    case 'wall_mirror_arch':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <path d="M19,46 L19,22 A13,13 0 0,1 45,22 L45,46 Z" fill={c} />
          <path d="M22,43 L22,23 A10,10 0 0,1 42,23 L42,43 Z" fill={a} />
          <line x1="26" y1="35" x2="36" y2="17" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" opacity="0.7" />
        </svg>
      );
    case 'plush_bear_giant':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <circle cx="22" cy="14" r="5" fill={c} />
          <circle cx="42" cy="14" r="5" fill={c} />
          <ellipse cx="32" cy="36" rx="13" ry="12" fill={c} />
          <ellipse cx="32" cy="37" rx="7" ry="7" fill="#F8E7CE" />
          <circle cx="32" cy="20" r="10.5" fill={c} />
          <ellipse cx="32" cy="23" rx="5" ry="3.8" fill="#F8E7CE" />
          <circle cx="32" cy="22" r="2" fill="#2B211B" />
          <circle cx="28" cy="18" r="1.4" fill="#2B211B" />
          <circle cx="36" cy="18" r="1.4" fill="#2B211B" />
          <polygon points="27,28 32,30 27,32" fill={a} />
          <polygon points="37,28 32,30 37,32" fill={a} />
        </svg>
      );
    case 'coffee_maker_bar':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="15" y="13" width="22" height="29" rx="4" fill={c} />
          <rect x="14" y="12" width="24" height="8" rx="3" fill={c} stroke="#74A38C" strokeWidth="1.2" />
          <rect x="19" y="23" width="14" height="16" rx="2" fill={a} />
          <rect x="22" y="30" width="8" height="8" rx="1.5" fill="#FFF8F0" />
          <circle cx="26" cy="16" r="2.5" fill="#FFF8F0" />
          <rect x="41" y="25" width="9" height="16" rx="2" fill="#6B4429" />
          <rect x="40" y="23" width="11" height="3" rx="1" fill="#D8B282" />
        </svg>
      );
    case 'toast_toaster_set':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="19" y="14" width="12" height="12" rx="2" fill={a} />
          <rect x="27" y="13" width="12" height="12" rx="2" fill="#F4CF8A" stroke={a} strokeWidth="1.8" />
          <rect x="14" y="22" width="30" height="20" rx="5" fill={c} stroke="#D5C089" strokeWidth="1.4" />
          <rect x="45" y="28" width="4" height="3" rx="1" fill="#CBD5E1" />
          <rect x="46" y="32" width="8" height="10" rx="2" fill="#E85D75" />
          <rect x="45.5" y="30" width="9" height="2.5" rx="1" fill="#CBD5E1" />
        </svg>
      );
    case 'piano_keyboard':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="22" y="10" width="20" height="11" rx="1.5" fill="#FFFFFF" stroke={c} strokeWidth="1.5" />
          <rect x="10" y="21" width="44" height="9" rx="2" fill={c} stroke="#CBBFA8" strokeWidth="1.4" />
          <rect x="13" y="23" width="38" height="4" fill="#FFFFFF" />
          <rect x="17" y="23" width="2.5" height="2.5" fill={a} />
          <rect x="23" y="23" width="2.5" height="2.5" fill={a} />
          <rect x="33" y="23" width="2.5" height="2.5" fill={a} />
          <rect x="39" y="23" width="2.5" height="2.5" fill={a} />
          <rect x="13" y="30" width="4" height="16" fill={c} />
          <rect x="47" y="30" width="4" height="16" fill={c} />
        </svg>
      );
    case 'record_shelf_cabinet':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <rect x="14" y="13" width="18" height="5" rx="1.5" fill="#EDE2D2" />
          <circle cx="22" cy="14" r="4" fill="#1E1E24" />
          <rect x="12" y="20" width="40" height="20" rx="2.5" fill={c} />
          <rect x="15" y="23" width="4" height="14" fill="#E76F51" />
          <rect x="20" y="23" width="4" height="14" fill="#F4C44E" />
          <rect x="25" y="23" width="4" height="14" fill="#5FAEE3" />
          <rect x="35" y="24" width="13" height="12" rx="2" fill={a} />
          <circle cx="41.5" cy="30" r="3.5" fill="#C8A464" />
          <line x1="16" y1="40" x2="14" y2="47" stroke={c} strokeWidth="2.5" />
          <line x1="48" y1="40" x2="50" y2="47" stroke={c} strokeWidth="2.5" />
        </svg>
      );
    case 'terrace_swing_egg':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <path d="M28,45 L28,16 Q28,8 36,9" fill="none" stroke="#4A4540" strokeWidth="2.5" strokeLinecap="round" />
          <ellipse cx="32" cy="46" rx="14" ry="3" fill="none" stroke="#4A4540" strokeWidth="2.5" />
          <ellipse cx="34" cy="27" rx="12" ry="15" fill={c} stroke="#B8905E" strokeWidth="1.8" />
          <ellipse cx="34" cy="31" rx="8" ry="8" fill={a} />
        </svg>
      );
    case 'floor_paint':
    case 'wall_paint':
      return (
        <svg width="64" height="54" viewBox="0 0 64 54">
          <path d="M22,23 A10,9 0 0,1 42,23" fill="none" stroke="#9AA5B1" strokeWidth="2.2" />
          <line x1="35" y1="22" x2="43" y2="10" stroke="#C58F5B" strokeWidth="3" strokeLinecap="round" />
          <rect x="39" y="8" width="9" height="5" rx="2" fill={c} />
          <rect x="20" y="22" width="24" height="23" rx="3" fill="#E8EDF2" stroke="#C7D1DC" strokeWidth="1.2" />
          <rect x="20" y="28" width="24" height="10" fill={c} />
          <rect x="27" y="30" width="10" height="6" rx="1.5" fill={a} />
        </svg>
      );
  }
};

export const FurnitureModal: React.FC<FurnitureModalProps> = ({
  inventory,
  placed,
  tab: controlledTab,
  onTabChange,
  onPlaceItem,
  onClose,
}) => {
  const [internalTab, setInternalTab] = useState<'all' | FurnitureCategory>('all');
  const tab = controlledTab ?? internalTab;
  const setTab = (next: 'all' | FurnitureCategory) => {
    setInternalTab(next);
    onTabChange?.(next);
  };

  const placedCounts: Record<string, number> = {};
  for (const p of placed) {
    placedCounts[p.catalogId] = (placedCounts[p.catalogId] || 0) + 1;
  }

  const visibleItems = FURNITURE_CATALOG.filter((item) => {
    const inStorage = inventory[item.id] || 0;
    const isPlaced = placedCounts[item.id] || 0;
    if (inStorage === 0 && isPlaced === 0) return false;
    return tab === 'all' || item.category === tab;
  });

  const totalStored = Object.values(inventory).reduce((sum, n) => sum + n, 0);

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-stone-950/65 p-2.5 sm:p-5"
      onClick={onClose}
    >
      <div
        className="anim-pop flex h-full max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border-4 border-[#9C734B] bg-[#FAF3E8] shadow-2xl md:h-[min(85dvh,640px)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#E5D5BE] bg-[#F2E5D2] px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Armchair className="h-4 w-4 text-amber-800" />
            <h2 className="font-display text-base font-bold text-[#4A3525]">
              Tủ Nội Thất ({totalStored} món trong tủ)
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              soundFX.tap();
              onClose();
            }}
            aria-label="Đóng tủ nội thất"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E3CEB2] text-[#4A3525] transition-transform active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Category Filter Tabs */}
        <div className="custom-scroll flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-[#E5D5BE] bg-[#F6ECDC] px-3 py-2">
          {FURNITURE_CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => {
                soundFX.tap();
                setTab(c.key);
              }}
              className={`min-h-[38px] shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                tab === c.key
                  ? 'bg-[#6F4E37] text-amber-50 shadow-xs'
                  : 'bg-[#EADBC6] text-[#5B422E] hover:bg-[#DFCCB0]'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Visual Furniture Inventory Grid */}
        <div className="custom-scroll flex-1 overflow-y-auto p-3 text-[#4A3525]">
          <div className="grid grid-cols-2 gap-2.5 pb-2 sm:grid-cols-3 md:grid-cols-4">
            {visibleItems.map((item) => {
              const storedCount = inventory[item.id] || 0;
              const placedCount = placedCounts[item.id] || 0;

              return (
                <div
                  key={item.id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-[#E0CEB6] bg-white shadow-2xs"
                >
                  <div className="relative flex h-24 w-full items-center justify-center bg-[#FBF6EE] p-2">
                    <FurnitureSvgPreview item={item} />
                    {storedCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 rounded-lg bg-[#6F4E37] px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-amber-50">
                        x{storedCount}
                      </span>
                    )}
                    {placedCount > 0 && (
                      <span className="absolute top-1.5 left-1.5 flex items-center gap-0.5 rounded-lg bg-[#E7F3EC] px-1.5 py-0.5 text-[10px] font-bold text-[#3B7A57]">
                        <PackageCheck className="h-3 w-3" />
                        {placedCount}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col justify-between gap-2 p-2.5">
                    <span className="line-clamp-2 min-h-[32px] text-xs font-bold leading-snug text-[#4A3525]">
                      {item.name}
                    </span>

                    <button
                      type="button"
                      disabled={storedCount <= 0}
                      onClick={() => {
                        if (storedCount <= 0) return;
                        soundFX.sparkle();
                        onPlaceItem(item.id);
                      }}
                      className={`flex min-h-[36px] w-full items-center justify-center gap-1 rounded-xl px-2 text-xs font-bold transition-transform active:scale-95 ${
                        storedCount > 0
                          ? 'bg-[#6BA383] text-white shadow-xs'
                          : 'cursor-not-allowed bg-[#EAE2D6] text-[#9A8B7C]'
                      }`}
                    >
                      {storedCount > 0 ? (
                        <>
                          <Plus className="h-3.5 w-3.5" />
                          <span>Đặt ra nhà</span>
                        </>
                      ) : (
                        <span>Đã đặt hết</span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {visibleItems.length === 0 && (
            <div className="flex h-40 items-center justify-center px-6 text-center text-xs font-medium leading-relaxed text-[#7A6048]">
              Tủ nội thất hiện chưa có món nào trong mục này. Hãy ghé Cửa Hàng gặp Bob để mua thêm đồ trang trí nhé!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
