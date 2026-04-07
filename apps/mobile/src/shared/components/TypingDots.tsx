import { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { createStyles } from './styles/TypingDots.styles';

export function TypingDots() {
  const styles = useThemedStyles(createStyles);
  const dot0 = useRef(new Animated.Value(0)).current;
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const makeBounce = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(450 - delay),
        ]),
      );

    const a0 = makeBounce(dot0, 0);
    const a1 = makeBounce(dot1, 150);
    const a2 = makeBounce(dot2, 300);

    a0.start(); a1.start(); a2.start();
    return () => { a0.stop(); a1.stop(); a2.stop(); };
  }, [dot0, dot1, dot2]);

  const dotStyle = (dot: Animated.Value) => [
    styles.dot,
    {
      opacity: dot,
      transform: [{ translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
    },
  ];

  return (
    <View style={styles.bubble}>
      <Animated.View style={dotStyle(dot0)} />
      <Animated.View style={dotStyle(dot1)} />
      <Animated.View style={dotStyle(dot2)} />
    </View>
  );
}

