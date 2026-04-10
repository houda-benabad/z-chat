import React, { useCallback, useMemo } from 'react';
import { View, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { CircularOverlay } from './CircularOverlay';
import {
  computeFittedSize,
  computeMinScale,
  clampToBounds,
  calculateCropRegion,
} from './cropUtils';
import type { CropRegion } from './cropUtils';
import { createStyles } from './styles/CropperView.styles';

const CIRCLE_PADDING = 24;
const MAX_ZOOM_FACTOR = 5;
const SPRING_CONFIG = { damping: 20, stiffness: 200, mass: 0.8 };

interface CropperViewProps {
  sourceUri: string;
  imageWidth: number;
  imageHeight: number;
  onCropRegionReady: (getCropRegion: () => CropRegion) => void;
}

export function CropperView({
  sourceUri,
  imageWidth,
  imageHeight,
  onCropRegionReady,
}: CropperViewProps) {
  const styles = createStyles();
  const { width: screenW, height: screenH } = Dimensions.get('window');

  const circleDiameter = screenW - CIRCLE_PADDING * 2;
  const containerW = screenW;
  const containerH = screenH;

  const fitted = useMemo(
    () => computeFittedSize(imageWidth, imageHeight, containerW, containerH),
    [imageWidth, imageHeight, containerW, containerH],
  );

  const minScale = useMemo(
    () => computeMinScale(fitted.width, fitted.height, circleDiameter),
    [fitted.width, fitted.height, circleDiameter],
  );
  const maxScale = minScale * MAX_ZOOM_FACTOR;

  // Shared values — persisted across gestures
  const scale = useSharedValue(minScale);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  // Gesture start snapshots
  const startScale = useSharedValue(minScale);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  // Expose a function to parent so it can get the crop region on confirm
  const getCropRegion = useCallback((): CropRegion => {
    return calculateCropRegion(
      imageWidth,
      imageHeight,
      containerW,
      containerH,
      circleDiameter,
      scale.value,
      translateX.value,
      translateY.value,
    );
  }, [imageWidth, imageHeight, containerW, containerH, circleDiameter, scale, translateX, translateY]);

  // Notify parent once
  React.useEffect(() => {
    onCropRegionReady(getCropRegion);
  }, [getCropRegion, onCropRegionReady]);

  const fittedW = fitted.width;
  const fittedH = fitted.height;
  const circleDiam = circleDiameter;

  const panGesture = Gesture.Pan()
    .onStart(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    .onUpdate((e) => {
      translateX.value = startX.value + e.translationX;
      translateY.value = startY.value + e.translationY;
    })
    .onEnd(() => {
      const clamped = clampToBounds(
        translateX.value,
        translateY.value,
        scale.value,
        fittedW,
        fittedH,
        circleDiam,
      );
      translateX.value = withSpring(clamped.x, SPRING_CONFIG);
      translateY.value = withSpring(clamped.y, SPRING_CONFIG);
    });

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      startScale.value = scale.value;
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    .onUpdate((e) => {
      const newScale = Math.min(Math.max(startScale.value * e.scale, minScale * 0.8), maxScale);
      scale.value = newScale;

      // Focal-point-aware zoom: adjust translation so pinch center stays stationary
      const focalOffsetX = e.focalX - containerW / 2;
      const focalOffsetY = e.focalY - containerH / 2;
      const scaleFactor = newScale / startScale.value;
      translateX.value = startX.value - focalOffsetX * (scaleFactor - 1);
      translateY.value = startY.value - focalOffsetY * (scaleFactor - 1);
    })
    .onEnd(() => {
      // Snap scale to valid range
      if (scale.value < minScale) {
        scale.value = withSpring(minScale, SPRING_CONFIG);
      }
      const effectiveScale = Math.max(scale.value, minScale);
      const clamped = clampToBounds(
        translateX.value,
        translateY.value,
        effectiveScale,
        fittedW,
        fittedH,
        circleDiam,
      );
      translateX.value = withSpring(clamped.x, SPRING_CONFIG);
      translateY.value = withSpring(clamped.y, SPRING_CONFIG);
    });

  const composed = Gesture.Simultaneous(panGesture, pinchGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    width: fittedW,
    height: fittedH,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <View style={styles.container}>
      <GestureDetector gesture={composed}>
        <Animated.View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Animated.Image
            source={{ uri: sourceUri }}
            style={animatedStyle}
            resizeMode="contain"
          />
        </Animated.View>
      </GestureDetector>
      <CircularOverlay circleDiameter={circleDiameter} />
    </View>
  );
}
