const MIN_DIMENSION = 0.1;
const MAX_DIMENSION = 20;

export function clampPlaneDimension(value: number) {
  if (!Number.isFinite(value)) return MIN_DIMENSION;
  return Math.min(MAX_DIMENSION, Math.max(MIN_DIMENSION, value));
}
