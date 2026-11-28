import type { RaceNotice } from './raceControl'
/** Only newly received warnings/penalties for our kart or watched rivals may flash. */
export function reconcileRaceNotices(
  previous: Set<string> | null,
  incoming: RaceNotice[],
  ownKart: string,
  watchedRivals: string[]
): { seen: Set<string>, alert: RaceNotice | null } {
  const seen = new Set(previous ?? [])
  const baseline = previous === null
  const fresh = incoming.filter(n => {
    const newNotice = !seen.has(n.id)
    seen.add(n.id)
    return !baseline && newNotice && n.kart !== null &&
      (n.kart === ownKart || watchedRivals.includes(n.kart)) &&
      (n.type === 'warning' || n.type === 'penalty')
  })
  const alert = fresh.find(n => n.kart === ownKart && n.type === 'penalty') ||
    fresh.find(n => n.type === 'penalty') || fresh.find(n => n.kart === ownKart) || fresh[0] || null
  return { seen, alert }
}
