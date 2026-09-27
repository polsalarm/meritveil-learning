/** Shortens long hex addresses and commitments for display while keeping both ends recognizable. */
export function shortened(value: string): string {
  return value.length <= 22 ? value : `${value.slice(0, 12)}…${value.slice(-8)}`;
}
