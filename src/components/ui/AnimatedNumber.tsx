import { useEffect, useRef, useState } from 'react';
import { TextInput, type StyleProp, type TextStyle } from 'react-native';

import { formatMoney } from '@/lib/money';

type AnimatedNumberProps = {
  valuePaise: number;
  style?: StyleProp<TextStyle>;
  duration?: number;
  compact?: boolean;
  prefix?: string;
};

/** Counts a money value up without re-rendering the whole screen on every frame. */
export function AnimatedNumber({ valuePaise, style, duration = 750, compact = false, prefix }: AnimatedNumberProps) {
  const [display, setDisplay] = useState(valuePaise);
  const previous = useRef(valuePaise);

  useEffect(() => {
    const from = previous.current;
    const to = valuePaise;
    previous.current = valuePaise;
    if (from === to) return;
    const start = Date.now();
    let frame: number;

    const tick = () => {
      const progress = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [valuePaise, duration]);

  return (
    <TextInput
      editable={false}
      underlineColorAndroid="transparent"
      value={`${prefix ?? ''}${formatMoney(display, { compact })}`}
      style={[{ padding: 0 }, style]}
    />
  );
}
