import { StyleSheet, View } from 'react-native';

import { PERSONAL_CATEGORY_MAP, TRIP_CATEGORY_MAP } from '@/data/categories';
import { withAlpha } from '@/lib/color';
import { useTheme } from '@/theme';
import type { PersonalCategoryId, TripCategoryId } from '@/types/models';

type CategoryIconProps = {
  categoryId: TripCategoryId | PersonalCategoryId;
  type?: 'trip' | 'personal';
  size?: number;
  iconSize?: number;
  color?: string;
  background?: string;
};

export function CategoryIcon({
  categoryId,
  type = 'trip',
  size = 42,
  iconSize,
  color,
  background,
}: CategoryIconProps) {
  const theme = useTheme();
  const category =
    type === 'trip'
      ? TRIP_CATEGORY_MAP[categoryId as TripCategoryId]
      : PERSONAL_CATEGORY_MAP[categoryId as PersonalCategoryId];
  const fallback = type === 'trip' ? TRIP_CATEGORY_MAP.other : PERSONAL_CATEGORY_MAP.other;
  const resolved = category ?? fallback;
  const Icon = resolved.icon;
  const tint = color ?? resolved.color;

  return (
    <View
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size * 0.32,
          backgroundColor: background ?? withAlpha(tint, theme.isDark ? 0.2 : 0.13),
        },
      ]}
    >
      <Icon size={iconSize ?? size * 0.46} color={tint} strokeWidth={2} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
});
