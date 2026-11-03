import { useId, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme';

type AreaChartProps = {
  values: number[];
  labels?: string[];
  height?: number;
  color?: string;
  showDots?: boolean;
  showLabels?: boolean;
};

function buildPath(points: { x: number; y: number }[], close: boolean, bottom: number) {
  if (points.length === 0) return '';
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const midX = (previous.x + current.x) / 2;
    path += ` C ${midX} ${previous.y}, ${midX} ${current.y}, ${current.x} ${current.y}`;
  }
  if (close) {
    path += ` L ${points[points.length - 1].x} ${bottom} L ${points[0].x} ${bottom} Z`;
  }
  return path;
}

export function AreaChart({
  values,
  labels,
  height = 150,
  color,
  showDots = true,
  showLabels = true,
}: AreaChartProps) {
  const theme = useTheme();
  const gradientId = `area-${useId().replace(/:/g, '')}`;
  const [width, setWidth] = useState(0);
  const stroke = color ?? theme.colors.limeDeep;
  const padding = { top: 12, right: 6, bottom: 8, left: 6 };
  const chartHeight = height - padding.top - padding.bottom;
  const max = Math.max(...values, 1);
  const min = 0;

  const points = values.map((value, index) => ({
    x:
      padding.left +
      (values.length === 1 ? 0 : (index / (values.length - 1)) * (width - padding.left - padding.right)),
    y: padding.top + chartHeight - ((value - min) / (max - min || 1)) * chartHeight,
  }));

  const last = points[points.length - 1];

  return (
    <View>
      <View style={{ height }} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        {width > 0 ? (
          <Svg width={width} height={height}>
            <Defs>
              <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={stroke} stopOpacity={0.28} />
                <Stop offset="1" stopColor={stroke} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            {[0.25, 0.5, 0.75].map((fraction) => (
              <Path
                key={fraction}
                d={`M ${padding.left} ${padding.top + chartHeight * fraction} L ${width - padding.right} ${padding.top + chartHeight * fraction}`}
                stroke={theme.colors.line}
                strokeWidth={1}
                strokeDasharray="2 6"
              />
            ))}
            <Path
              d={buildPath(points, true, height - padding.bottom)}
              fill={`url(#${gradientId})`}
              stroke="none"
            />
            <Path
              d={buildPath(points, false, height - padding.bottom)}
              fill="none"
              stroke={stroke}
              strokeWidth={2.6}
              strokeLinecap="round"
            />
            {showDots && last ? (
              <>
                <Circle cx={last.x} cy={last.y} r={6} fill={theme.colors.bgElevated} />
                <Circle cx={last.x} cy={last.y} r={3.4} fill={stroke} />
              </>
            ) : null}
          </Svg>
        ) : null}
      </View>
      {showLabels && labels && labels.length > 0 ? (
        <View style={styles.labels}>
          {labels.map((label, index) => (
            <Text
              key={`${label}-${index}`}
              style={{
                fontFamily: theme.fonts.medium,
                fontSize: 9.5,
                color: theme.colors.inkSubtle,
              }}
            >
              {label}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  labels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
});
