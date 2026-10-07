import React, { useCallback, useMemo } from 'react';
import {
  Pressable as RNPressable,
  PressableProps as RNPressableProps,
  ViewStyle,
  StyleProp,
  Platform,
  AccessibilityInfo,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
  ReduceMotion,
} from 'react-native-reanimated';
let Haptics: any = null;
try { Haptics = require('expo-haptics'); } catch {}
import { BRAND } from '../lib/brand';

const AnimatedPressable = Animated.createAnimatedComponent(RNPressable);

export interface PressableProps extends Omit<RNPressableProps, 'style'> {
  /** Style override for the inner View. */
  style?: StyleProp<ViewStyle>;
  /** Scale value when pressed. Default 0.97. */
  pressScale?: number;
  /** Opacity when pressed. Default 0.85. */
  pressOpacity?: number;
  /** Alias for pressOpacity — matches RN's built-in Pressable prop name. */
  activeOpacity?: number;
  /** Trigger haptic feedback on press-in. Default true. */
  haptic?: boolean | 'selection' | 'light' | 'medium' | 'heavy';
  /** Animation duration in ms for press-in. Default 100. */
  pressDuration?: number;
  /** Spring config for release. */
  releaseConfig?: { damping?: number; stiffness?: number; mass?: number };
  /** Respect AccessibilityInfo.isReduceMotionEnabled. Default true. */
  respectReduceMotion?: boolean;
  /** Disable the press scale animation entirely. */
  noScale?: boolean;
}

/**
 * Global motion wrapper. Every interactive surface in the app should use this
 * instead of the stock <TouchableOpacity>. Pressable gives us:
 *   - 0.97 scale on press-in, spring back on release (100ms in / spring out)
 *   - 0.85 opacity on press-in (configurable)
 *   - Optional haptic feedback on press-in
 *   - Automatic respect for prefers-reduced-motion via AccessibilityInfo
 *   - Cross-platform (iOS, Android, web via react-native-web)
 *
 * Token-driven timing (Material 3 expressive):
 *   - press-in:   100ms ease-out
 *   - release:    spring (damping 18, stiffness 220, mass 0.8)
 */
export function Pressable({
  style,
  pressScale = 0.97,
  pressOpacity = 0.85,
  activeOpacity,
  haptic = 'light',
  pressDuration = 100,
  releaseConfig = { damping: 18, stiffness: 220, mass: 0.8 },
  respectReduceMotion = true,
  noScale = false,
  onPressIn,
  onPressOut,
  disabled,
  ...rest
}: PressableProps) {
  // activeOpacity is an alias callers already pass (matches RN Pressable).
  // If both are given, explicit pressOpacity wins.
  const effectivePressOpacity = pressOpacity !== 0.85 ? pressOpacity : (activeOpacity ?? 0.85);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  // Cache reduce-motion state. We read it once on mount and let the
  // AccessibilityInfo listener update it. For most usage this is overkill
  // but it keeps the press feedback correct on hot reload.
  const [reduceMotion, setReduceMotion] = React.useState(false);
  React.useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(v => {
      if (mounted) setReduceMotion(v);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', v => {
      if (mounted) setReduceMotion(v);
    });
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  const shouldAnimate = respectReduceMotion ? !reduceMotion : true;
  const shouldScale = shouldAnimate && !noScale;

  const handlePressIn = useCallback(
    (e: any) => {
      if (shouldScale) {
        scale.value = withTiming(pressScale, {
          duration: pressDuration,
          easing: Easing.out(Easing.cubic),
        });
        opacity.value = withTiming(effectivePressOpacity, {
          duration: pressDuration,
          easing: Easing.out(Easing.cubic),
        });
      }
      if (haptic && !disabled && Haptics) {
        const kind =
          haptic === true
            ? Haptics.ImpactFeedbackStyle.Light
            : haptic === 'heavy'
              ? Haptics.ImpactFeedbackStyle.Heavy
              : haptic === 'medium'
                ? Haptics.ImpactFeedbackStyle.Medium
                : haptic === 'selection'
                  ? Haptics.SelectionFeedback
                  : Haptics.ImpactFeedbackStyle.Light;
        try {
          if (kind === Haptics.SelectionFeedback) {
            Haptics.selectionAsync();
          } else {
            Haptics.impactAsync(kind);
          }
        } catch {
          // Haptics API not available on this device; silently no-op
        }
      }
      onPressIn?.(e);
    },
    [shouldScale, pressScale, effectivePressOpacity, pressDuration, haptic, disabled, onPressIn, scale, opacity]
  );

  const handlePressOut = useCallback(
    (e: any) => {
      if (shouldScale) {
        scale.value = withSpring(1, {
          damping: releaseConfig.damping,
          stiffness: releaseConfig.stiffness,
          mass: releaseConfig.mass,
          reduceMotion: ReduceMotion.System,
        });
        opacity.value = withTiming(1, {
          duration: pressDuration + 60,
          easing: Easing.out(Easing.cubic),
        });
      }
      onPressOut?.(e);
    },
    [shouldScale, pressDuration, releaseConfig, onPressOut, scale, opacity]
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  // On web, also support :hover via onHoverIn / onHoverOut to lift opacity slightly.
  const handleHoverIn = useCallback(() => {
    if (Platform.OS === 'web' && shouldScale) {
      opacity.value = withTiming(0.92, { duration: 120 });
    }
  }, [shouldScale, opacity]);
  const handleHoverOut = useCallback(() => {
    if (Platform.OS === 'web' && shouldScale) {
      opacity.value = withTiming(1, { duration: 160 });
    }
  }, [shouldScale, opacity]);

  const mergedStyle = useMemo(() => [style, animatedStyle], [style, animatedStyle]);

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onHoverIn={Platform.OS === 'web' ? handleHoverIn : undefined}
      onHoverOut={Platform.OS === 'web' ? handleHoverOut : undefined}
      style={mergedStyle as any}
      // Accessibility hints
      accessibilityRole={rest.accessibilityRole ?? 'button'}
      accessibilityState={{ disabled: !!disabled, ...(rest.accessibilityState || {}) }}
    />
  );
}

export default Pressable;
