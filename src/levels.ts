// levels.ts
export const levels = Array.from({ length: 100 }, (_, i) => ({
  id: i + 1,
  duration: Math.max(20, 60 - i * 0.3),
  targetScore: 100 + i * 10,
  candyTypes: Math.min(5, 3 + Math.floor(i / 20)),
}));
