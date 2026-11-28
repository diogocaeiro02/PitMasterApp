/** All pit durations are displayed as minutes:seconds:milliseconds (m:ss:SSS).
 * Store canonical numeric seconds in the regulation/plan and milliseconds for real visits.
 */
export function formatPitDurationMs(milliseconds: number | null | undefined): string {
  if (milliseconds == null || !Number.isFinite(milliseconds)) return '—:——:———'
  const total = Math.max(0, Math.round(milliseconds))
  const minutes = Math.floor(total / 60_000)
  const seconds = Math.floor(total / 1_000) % 60
  const millis = total % 1_000
  return `${minutes}:${String(seconds).padStart(2,'0')}:${String(millis).padStart(3,'0')}`
}
export function formatPitDurationSeconds(seconds: number | null | undefined): string {
  return formatPitDurationMs(seconds == null ? null : seconds * 1000)
}
/** Accept m:ss:SSS, m:ss, m:ss.SSS or legacy plain seconds.
 * Returns null for blank and NaN for invalid input, so callers can distinguish them.
 */
export function parsePitDurationSeconds(input: string): number | null {
  const value = input.trim()
  if (!value) return null
  const full = /^(\d+):([0-5]\d):([0-9]{3})$/.exec(value)
  if (full) return (Number(full[1])*60_000 + Number(full[2])*1_000 + Number(full[3]))/1000
  const short = /^(\d+):([0-5]\d)(?:\.([0-9]{1,3}))?$/.exec(value)
  if (short) return (Number(short[1])*60_000 + Number(short[2])*1000 + Number((short[3]??'0').padEnd(3,'0')))/1000
  if (/^\d+(?:\.\d{1,3})?$/.test(value)) return Number(value)
  return Number.NaN
}
