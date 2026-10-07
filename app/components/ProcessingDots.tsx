import React, { useEffect } from 'react';
import { View, StyleSheet, AccessibilityInfo } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { BRAND } from '../lib/brand';

interface Props {
  color?: string;
  size?: number;
  gap?: number;
  count?: number;
}

export default function ProcessingDots({ color = BRAND.accent, size = 8, gap = 8, count = 3 }: Props) {
  return (
    <View style={[s.row, { columnGap: gap }]}>
      {Array.from({ length: count }).map((_, i) => (
        <Dot key={i} color={color} size={size} delay={i * 180} />
      ))}
    </View>
  );
}

function Dot({ color, size, delay }: { color: string; size: number; delay: number }) {
  const opacity = useSharedValue(0.3);
  const [reduce, setReduce] = React.useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(v => { if (mounted) setReduce(v); });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (e: boolean) => setReduce(e));
    return () => { mounted = false; sub.remove(); };
  }, []);

  useEffect(() => {
    if (reduce) {
      opacity.value = 0.7;
      cancelAnimation(opacity);
      return;
    }
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.3, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      ),
    );
    return () => cancelAnimation(opacity);
  }, [reduce, delay, opacity]);

  const aStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[s.dot, aStyle, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]} />;
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  dot: {},
});
