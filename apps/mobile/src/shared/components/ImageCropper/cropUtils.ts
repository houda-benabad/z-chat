export interface CropRegion {
  originX: number;
  originY: number;
  width: number;
  height: number;
}

/**
 * Compute the contain-fit dimensions of an image within a container.
 */
export function computeFittedSize(
  imageW: number,
  imageH: number,
  containerW: number,
  containerH: number,
): { width: number; height: number } {
  const imageAspect = imageW / imageH;
  const containerAspect = containerW / containerH;

  if (imageAspect > containerAspect) {
    return { width: containerW, height: containerW / imageAspect };
  }
  return { width: containerH * imageAspect, height: containerH };
}

/**
 * The minimum scale so the image fully covers the crop circle.
 */
export function computeMinScale(
  fittedW: number,
  fittedH: number,
  circleDiameter: number,
): number {
  return circleDiameter / Math.min(fittedW, fittedH);
}

/**
 * Clamp translation so the crop circle is always fully covered by the image.
 * Designed to run as a reanimated worklet (has 'worklet' directive).
 */
export function clampToBounds(
  tx: number,
  ty: number,
  currentScale: number,
  fittedW: number,
  fittedH: number,
  circleDiameter: number,
): { x: number; y: number } {
  'worklet';
  const scaledW = fittedW * currentScale;
  const scaledH = fittedH * currentScale;
  const maxTx = (scaledW - circleDiameter) / 2;
  const maxTy = (scaledH - circleDiameter) / 2;
  return {
    x: Math.min(Math.max(tx, -maxTx), maxTx),
    y: Math.min(Math.max(ty, -maxTy), maxTy),
  };
}

/**
 * Convert gesture state (scale + translation in screen pts) into crop
 * coordinates in the original image's pixel space.
 */
export function calculateCropRegion(
  imageW: number,
  imageH: number,
  containerW: number,
  containerH: number,
  circleDiameter: number,
  scale: number,
  translateX: number,
  translateY: number,
): CropRegion {
  const fitted = computeFittedSize(imageW, imageH, containerW, containerH);
  const scaledW = fitted.width * scale;
  const scaledH = fitted.height * scale;

  // Image top-left in container space (centered + translated)
  const imageLeft = (containerW - scaledW) / 2 + translateX;
  const imageTop = (containerH - scaledH) / 2 + translateY;

  // Circle top-left in container space (always centered)
  const circleLeft = (containerW - circleDiameter) / 2;
  const circleTop = (containerH - circleDiameter) / 2;

  // Circle position relative to the displayed image
  const relX = circleLeft - imageLeft;
  const relY = circleTop - imageTop;

  // Scale from displayed pixels → original pixels
  const pixelRatio = imageW / scaledW;
  const originX = Math.round(relX * pixelRatio);
  const originY = Math.round(relY * pixelRatio);
  const cropSize = Math.round(circleDiameter * pixelRatio);

  return {
    originX: Math.max(0, originX),
    originY: Math.max(0, originY),
    width: Math.min(cropSize, imageW - Math.max(0, originX)),
    height: Math.min(cropSize, imageH - Math.max(0, originY)),
  };
}
