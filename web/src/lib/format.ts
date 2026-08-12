export function formatPercent(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatMs(ms: number): string {
  return `${Math.round(ms)}ms`;
}

export function formatConfidence(value: number, digits = 3): string {
  return value.toFixed(digits);
}

export function formatCI(point: number, lower: number, upper: number, digits = 3): string {
  return `${point.toFixed(digits)} [${lower.toFixed(digits)}, ${upper.toFixed(digits)}]`;
}

/** Aturan spec §7/§14: klaim "A lebih baik dari B" hanya sah kalau 95% CI
 * keduanya tidak overlap. */
export function ciNonOverlapping(
  a: { lower: number; upper: number },
  b: { lower: number; upper: number },
): boolean {
  return a.lower > b.upper || b.lower > a.upper;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
