import { useRef } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme';

export type BarDatum = {
  label: string;
  value: number;
  highlight?: boolean;
};

type BarChartProps = {
  data: BarDatum[];
  height?: number;
  color?: string;
  labelEvery?: number;
  showLabels?: boolean;
  highlightColor?: string;
};

export function BarChart({
  data,
  height = 120,
  color,
  labelEvery = 5,
  showLabels,
  highlightColor,
}: BarChartProps) {
  const theme = useTheme();
  const max = Math.max(...data.map((item) => item.value), 1);
  const gap = data.length > 20 ? 2 : 5;

  const { width: screenWidth } = Dimensions.get('window');
  const barItemWidth = screenWidth > 0 ? Math.max(2, (screenWidth - gap * (data.length - 1)) / data.length) : 0;

  return (
    <View>
      <View style={styles.chart}>
        {data.map((item, index) => {
          const value = item.value > 0 ? item.value : 0;
          const barHeight = (max > 0 ? (value / max) * height : 0);

          return (
            <View key={`${item.label}-${index}`} style={{ width: barItemWidth }}>
              <View style={{ height: height - barHeight }} />
              <View
                style={{
                  height: barHeight,
                  width: '100%',
                  borderRadius: 6,
                  backgroundColor:
                    item.value > 0
                      ? item.highlight
                        ? (highlightColor ?? theme.colors.ink)
                        : (color ?? theme.colors.limeDeep)
                      : theme.colors.surfaceAlt,
                  marginBottom: 2,
                }}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chart: { flexDirection: 'row', alignItems: 'flex-end', paddingBottom: 4 },
});