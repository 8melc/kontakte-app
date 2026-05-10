type Pattern = 'tap' | 'soft' | 'success' | 'warn';

const PATTERNS: Record<Pattern, number | number[]> = {
  tap: 10,
  soft: 6,
  success: [8, 30, 12],
  warn: [10, 60, 10, 60, 10],
};

export function haptic(pattern: Pattern = 'tap') {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  try {
    navigator.vibrate(PATTERNS[pattern]);
  } catch {
    // ignore
  }
}
