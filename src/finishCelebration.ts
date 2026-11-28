/** Explicit finish status plus own NEW finish-line crossing after baseline. */
export function shouldCelebrate(input:{sessionFinished:boolean; oursCrossed:boolean; alreadyCelebrated:boolean; live:boolean}):boolean {
  return input.sessionFinished&&input.oursCrossed&&!input.alreadyCelebrated&&input.live
}
