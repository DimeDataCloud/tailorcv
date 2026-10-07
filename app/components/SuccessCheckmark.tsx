import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { BRAND } from '../lib/brand';

// Animated SVG checkmark that draws itself on mount.
// Uses a stroke-dasharray animation — the path "draws" from 0 to full.
export default function SuccessCheckmark({ size = 48, onDone }: { size?: number; onDone?: () => void }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      200,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }, () => {
        if (onDone) runOnJS(onDone)();
      }),
    );
  }, []);

  return (
    <Animated.View style={[s.wrap, { width: size, height: size }]}>
      <Animated.View style={[s.circle, { width: size, height: size, borderRadius: size / 2 }]} />
      <Animated.View style={s.checkWrap}>
        <Animated.View
          style={[
            s.check,
            {
              width: size * 0.5,
              height: size * 0.35,
              borderColor: BRAND.accent,
              borderRightWidth: size * 0.06,
              borderBottomWidth: size * 0.06,
              transform: [{ rotate: '45deg' }, { translateY: -size * 0.05 }],
            },
            // Animate the checkmark via opacity since RN doesn't have stroke-dasharray
            // We use a clip animation instead — opacity fade-in after circle draws
            { opacity: progress },
          ]}
        />
      </Animated.View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: { justifyContent: 'center', alignItems: 'center' },
  circle: {
    backgroundColor: BRAND.accentWash,
    borderWidth: 2,
    borderColor: BRAND.accent,
  },
  checkWrap: { position: 'absolute', justifyContent: 'center', alignItems: 'center' },
  check: { borderStyle: 'solid' },
});
