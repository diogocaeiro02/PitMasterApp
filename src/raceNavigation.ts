import type {RaceProfile} from './races'
export const HUB_PAGES=['races','calendar'] as const
export const RACE_PAGES=['setup','qualifying','race','ranking','strategy'] as const
export type AppPage=typeof HUB_PAGES[number]|typeof RACE_PAGES[number]
export function isRacePage(page:AppPage):boolean {return (RACE_PAGES as readonly string[]).includes(page)}
export function firstRacePage(race:RaceProfile):AppPage {return race.status==='live'?'race':'setup'}
