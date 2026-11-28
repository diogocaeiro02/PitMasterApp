import type { RaceRules } from './strategy'
import type { PhaseConfig } from './racePhases'

/** A 10+30 race format sets only durations; never invent race regulations. */
export function palmelaSprintRules(previous: RaceRules): RaceRules {
  return { ...previous, raceMinutes: 30, minPitStops: null, minPitSeconds: null, minStintMinutes: null, maxStintMinutes: null, minTeamStints: null, minDriverStints: null, maxDriverMinutes: null }
}
export function palmelaSprintPhases(previous: PhaseConfig): PhaseConfig {
  return { ...previous, current:'preparation', qualifyingMinutes: 10, superqualifying: false, practice: false }
}
