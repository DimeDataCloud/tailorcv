import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { BRAND } from '../lib/brand';

export default function StepIndicator({ current, total }: { current: number; total: number }) {
  const pct = Math.round((current / total) * 100);
  const w = useSharedValue(pct);
  // Animate whenever current changes
  w.value = withTiming(pct, { duration: 360, easing: Easing.out(Easing.cubic) });
  const label = `Step ${current} of ${total}`;
  const fillStyle = useAnimatedStyle(() => ({ width: `${w.value}%` }));
  return (
    <View style={s.wrap}>
      <View style={s.barBg}>
        <Animated.View style={[s.barFill, fillStyle]} />
      </View>
      <Text style={s.label}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginBottom: 28 },
  barBg: { height: 3, backgroundColor: BRAND.hairline, borderRadius: 2, marginBottom: 8, overflow: 'hidden' },
  barFill: { height: 3, backgroundColor: BRAND.accent, borderRadius: 2 },
  label: { fontSize: 11, fontWeight: '700', color: BRAND.muted, letterSpacing: 0.8, textTransform: 'uppercase' },
});
