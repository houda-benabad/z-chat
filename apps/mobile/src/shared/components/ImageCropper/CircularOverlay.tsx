import React from 'react';
import { View, Dimensions } from 'react-native';
import { createStyles } from './styles/CircularOverlay.styles';

interface CircularOverlayProps {
  circleDiameter: number;
}

const OVERLAY_COLOR = 'rgba(0, 0, 0, 0.65)';

export function CircularOverlay({ circleDiameter }: CircularOverlayProps) {
  const styles = createStyles();
  const { width: screenW, height: screenH } = Dimensions.get('window');
  // Border must be large enough to cover from the circle edge to all screen corners
  const borderSize = Math.max(screenW, screenH);
  const radius = circleDiameter / 2;

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Dark overlay with transparent circular cutout */}
      <View
        style={[
          styles.ring,
          {
            width: circleDiameter,
            height: circleDiameter,
            borderRadius: radius,
            borderWidth: borderSize,
            borderColor: OVERLAY_COLOR,
          },
        ]}
      />
      {/* Thin white ring for polish */}
      <View
        style={[
          styles.innerRing,
          {
            width: circleDiameter,
            height: circleDiameter,
            borderRadius: radius,
          },
        ]}
      />
    </View>
  );
}
