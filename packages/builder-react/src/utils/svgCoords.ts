export function toSvgCoords(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
  imageSize: { w: number; h: number },
): { x: number; y: number } {
  const x = Math.max(0, Math.round(((clientX - rect.left) / rect.width) * imageSize.w));
  const y = Math.max(0, Math.round(((clientY - rect.top) / rect.height) * imageSize.h));
  return { x, y };
}
