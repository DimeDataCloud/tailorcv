import React from 'react';
import { ViewStyle, StyleProp } from 'react-native';
import Animated, {
  FadeInDown,
  FadeIn,
  FadeInUp,
  ZoomIn,
  SlideInRight,
  Easing,
} from 'react-native-reanimated';

export type StaggerDirection = 'down' | 'up' | 'none' | 'zoom' | 'right';

export interface AnimatedListItemProps {
  /** Index in the list. Used to compute the stagger delay (index * delay). */
  index: number;
  /** Delay per item in ms. Default 30ms — Material 3 expressive feel. */
  delay?: number;
  /** Direction of the entry animation. Default 'down'. */
  direction?: StaggerDirection;
  /** Initial vertical offset for FadeInDown/Up. Default 16. */
  distance?: number;
  /** Duration in ms. Default 240 (Linear house style). */
  duration?: number;
  /** Children. */
  children: React.ReactNode;
  /** Style override. */
  style?: StyleProp<ViewStyle>;
}

/**
 * Drop-in wrapper for list items that stagger in on mount.
 * Used for Home recent resumes list and History list.
 *
 * Respects prefers-reduced-motion automatically via Reanimated's ReduceMotion
 * system. When reduced motion is on, the entering animation is bypassed
 * entirely (the item just appears).
 */
export function AnimatedListItem({
  index,
  delay = 30,
  direction = 'down',
  distance = 16,
  duration = 240,
  children,
  style,
}: AnimatedListItemProps) {
  const baseConfig = {
    duration,
    easing: Easing.out(Easing.cubic),
  };

  // Cap stagger to first 12 items so late items don't take forever to appear
  const cappedIndex = Math.min(index, 12);
  const totalDelay = cappedIndex * delay;

  const entering =
    direction === 'down'
      ? FadeInDown.delay(totalDelay).duration(duration).withInitialValues({ transform: [{ translateY: -distance }] })
      : direction === 'up'
        ? FadeInUp.delay(totalDelay).duration(duration).withInitialValues({ transform: [{ translateY: distance }] })
        : direction === 'zoom'
          ? ZoomIn.delay(totalDelay).duration(duration)
          : direction === 'right'
            ? SlideInRight.delay(totalDelay).duration(duration).withInitialValues({ transform: [{ translateX: -distance }] })
            : FadeIn.delay(totalDelay).duration(duration);

  return (
    <Animated.View entering={entering} style={style}>
      {children}
    </Animated.View>
  );
}

export default AnimatedListItem;
