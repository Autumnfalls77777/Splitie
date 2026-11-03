import { useId, useState } from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { useTheme } from '@/theme';

type SparklineProps = {
  values: number[];
  height?: number;
  color?: string;
};

export function Sparkline({ values, height = 48, color }: SparklineProps) {
  const theme = useTheme();
  const gradientId = `spark-${useId().replace(/:/g, '')}`;
  const [width, setWidth] = useState(0);
  const stroke = color ?? theme.colors.limeDeep;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const points = values.map((value, index) => ({
    x: values.length === 1 ? 0 : (index / (values.length - 1)) * width,
    y: height - ((value - min) / (max - min || 1)) * (height - 6) - 3,
  }));

  let line = '';
  points.forEach((point, index) => {
    if (index === 0) {
      line = `M ${point.x} ${point.y}`;
    } else {
      const previous = points[index - 1];
      const midX = (previous.x + point.x) / 2;
      line += ` C ${midX} ${previous.y}, ${midX} ${point.y}, ${point.x} ${point.y}`;
    }
  });
  const area = points.length > 0 ? `${line} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z` : '';

  return (
    <View style={{ height }} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {width > 0 ? (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={stroke} stopOpacity={0.25} />
              <Stop offset="1" stopColor={stroke} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path d={area} fill={`url(#${gradientId})`} />
          <Path d={line} fill="none" stroke={stroke} strokeWidth={2.2} strokeLinecap="round" />
        </Svg>
      ) : null}
    </View>
  );
}
