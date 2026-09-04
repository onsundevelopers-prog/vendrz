import { Easing } from "remotion";

export const easings = {
  inOut: Easing.bezier(0.4, 0, 0.2, 1), // default material
  outExpo: Easing.bezier(0.22, 1, 0.36, 1), // entrances: fast start, soft land
  pop: Easing.bezier(0.34, 1.3, 0.64, 1), // overshoot pop (spring-like)
  whip: Easing.bezier(0.85, 0, 0.15, 1), // deliberate snap
  soft: Easing.bezier(0.25, 0.46, 0.45, 0.94), // gentle
} as const;
