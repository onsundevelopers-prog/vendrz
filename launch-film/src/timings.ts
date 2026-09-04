// All timings in frames at 30fps. Total = 1800 frames = 60s.
export const T = {
  fps: 30,
  totalFrames: 1800,

  s1: { start: 0, dur: 120 }, // THE PROBLEM 0-4s
  s2: { start: 120, dur: 180 }, // INTRODUCING 4-10s
  s3: { start: 300, dur: 240 }, // EVERYTHING IN ONE PLACE 10-18s
  s4: { start: 540, dur: 270 }, // AI UNDERSTANDS 18-27s
  s5: { start: 810, dur: 270 }, // THE AI 27-36s
  s6: { start: 1080, dur: 270 }, // ACTION 36-45s
  s7: { start: 1350, dur: 240 }, // THE OVERVIEW 45-53s
  s8: { start: 1590, dur: 210 }, // ENDING 53-60s

  // VO starts (absolute frames)
  vo1: 312,
  vo2: 556,
  vo3: 830,
  vo4: 1100,
  vo5: 1400,
} as const;
