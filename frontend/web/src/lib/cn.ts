/**
 * src/lib/cn.ts — minimal className joiner (no external deps).
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}