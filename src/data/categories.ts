import {
  BedDouble,
  Car,
  Coffee,
  Ellipsis,
  GraduationCap,
  HeartPulse,
  House,
  ReceiptText,
  ShoppingBag,
  ShoppingBasket,
  ShoppingCart,
  Ticket,
  Utensils,
  Wine,
  type LucideIcon,
} from 'lucide-react-native';

import { palette } from '@/theme/tokens';
import type { PersonalCategoryId, TripCategoryId } from '@/types/models';

export type Category = {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
};

export const TRIP_CATEGORIES: (Category & { id: TripCategoryId })[] = [
  { id: 'food', label: 'Food', icon: Utensils, color: palette.clay },
  { id: 'stay', label: 'Stay', icon: BedDouble, color: palette.sky },
  { id: 'transport', label: 'Transport', icon: Car, color: palette.amber },
  { id: 'activities', label: 'Activities', icon: Ticket, color: palette.lilac },
  { id: 'drinks', label: 'Drinks', icon: Wine, color: palette.rose },
  { id: 'groceries', label: 'Groceries', icon: ShoppingBasket, color: palette.teal },
  { id: 'shopping', label: 'Shopping', icon: ShoppingBag, color: palette.limeDeep },
  { id: 'other', label: 'Other', icon: Ellipsis, color: palette.slate },
];

export const PERSONAL_CATEGORIES: (Category & { id: PersonalCategoryId })[] = [
  { id: 'food', label: 'Food & dining', icon: Utensils, color: palette.clay },
  { id: 'groceries', label: 'Groceries', icon: ShoppingCart, color: palette.teal },
  { id: 'transport', label: 'Transport', icon: Car, color: palette.amber },
  { id: 'rent', label: 'Rent & home', icon: House, color: palette.sky },
  { id: 'shopping', label: 'Shopping', icon: ShoppingBag, color: palette.lilac },
  { id: 'health', label: 'Health', icon: HeartPulse, color: palette.rose },
  { id: 'fun', label: 'Fun', icon: Coffee, color: palette.limeDeep },
  { id: 'bills', label: 'Bills', icon: ReceiptText, color: palette.slate },
  { id: 'education', label: 'Education', icon: GraduationCap, color: palette.sky },
  { id: 'other', label: 'Other', icon: Ellipsis, color: palette.slate },
];

export const TRIP_CATEGORY_MAP = Object.fromEntries(
  TRIP_CATEGORIES.map((category) => [category.id, category]),
) as Record<TripCategoryId, Category & { id: TripCategoryId }>;

export const PERSONAL_CATEGORY_MAP = Object.fromEntries(
  PERSONAL_CATEGORIES.map((category) => [category.id, category]),
) as Record<PersonalCategoryId, Category & { id: PersonalCategoryId }>;

export const COVERS = {
  lime: {
    label: 'Citrus',
    gradient: ['#D9FF72', '#B7E63F'] as const,
    ink: '#25310F',
    emoji: '🍋',
  },
  ocean: {
    label: 'Ocean',
    gradient: ['#9FD8F5', '#5B9FE8'] as const,
    ink: '#0E2A42',
    emoji: '🌊',
  },
  sunset: {
    label: 'Sunset',
    gradient: ['#FFC48A', '#F08A5D'] as const,
    ink: '#3A1B0C',
    emoji: '🌅',
  },
  lilac: {
    label: 'Lilac',
    gradient: ['#D8C6FF', '#A88BEF'] as const,
    ink: '#261642',
    emoji: '🪻',
  },
  clay: {
    label: 'Clay',
    gradient: ['#F7B6A0', '#E2603F'] as const,
    ink: '#3A140B',
    emoji: '🏜️',
  },
  teal: {
    label: 'Teal',
    gradient: ['#A8E8D8', '#3CB39A'] as const,
    ink: '#0C332A',
    emoji: '🌿',
  },
} as const;

export const MEMBER_COLORS = [
  '#C9F25B',
  '#F3A26F',
  '#8FC9F5',
  '#C8B4F5',
  '#F2A7C3',
  '#7FD8C2',
  '#F2D06B',
  '#A9B4A0',
];

export const EMOJIS = ['🏝️', '🏔️', '🌴', '🏙️', '🎿', '🚐', '🍜', '🎡', '🏕️', '✈️', '🎉', '🌊'];

export const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED'] as const;

export const PAYMENT_METHODS = [
  { id: 'upi', label: 'UPI', icon: 'smartphone' },
  { id: 'card', label: 'Card', icon: 'card' },
  { id: 'cash', label: 'Cash', icon: 'cash' },
  { id: 'netbanking', label: 'Net banking', icon: 'landmark' },
] as const;
