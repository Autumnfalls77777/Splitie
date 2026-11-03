import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { useTheme } from '@/theme';

export type DonutSegment = {
  value: number;
  color: string;
  label?: string;
};

type DonutChartProps = {
  segments: DonutSegment[];
  size?: number;
  strokeWidth?: number;
  /** Lets fixed-light screens keep a light track when the app theme is dark. */
  trackColor?: string;
  children?: React.ReactNode;
};

export function DonutChart({
  segments,
  size = 168,
  strokeWidth = 18,
  trackColor,
  children,
}: DonutChartProps) {
  const theme = useTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  let offset = 0;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <G rotation={-90}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={trackColor ?? theme.colors.surfaceAlt}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {total > 0
            ? segments.map((segment, index) => {
                const fraction = segment.value / total;
                const length = Math.max(0, fraction * circumference - 3);
                const dashOffset = -offset;
                offset += fraction * circumference;
                return (
                  <Circle
                    key={`${segment.label ?? 'segment'}-${index}`}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={segment.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${length} ${circumference - length}`}
                    strokeDashoffset={dashOffset}
                    strokeLinecap="round"
                    fill="none"
                  />
                );
              })
            : null}
        </G>
      </Svg>
      {children ? <View style={styles.center}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
