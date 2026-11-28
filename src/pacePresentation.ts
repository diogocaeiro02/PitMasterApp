import type { PaceSummary } from './pace'

/** Plain-language presentation of the sign and context of the pace metrics. */
export type PaceInsight = {
  headline: string
  label: string
  detail: string
  comparison: string
  change: string
  conditionNote: string | null
  tone: 'positive' | 'negative' | 'neutral'
}
const seconds = (ms: number) => (Math.abs(ms) / 1000).toFixed(2)
export function paceInsight(pace: PaceSummary): PaceInsight {
  const delta = pace.deltaMs
  const comparison = Math.abs(delta) <= 150
    ? 'Estamos ao ritmo médio do pelotão.'
    : delta < 0
      ? `Estamos ${seconds(delta)} s/volta mais rápidos do que o pelotão.`
      : `Estamos ${seconds(delta)} s/volta mais lentos do que o pelotão.`
  const trend = pace.trendMs
  const label = trend === null ? 'Ritmo comparado ao pelotão' : trend < -150 ? 'A GANHAR AOS OUTROS' : trend > 150 ? 'A PERDER PARA OS OUTROS' : 'A ACOMPANHAR O PELOTÃO'
  const headline = trend === null
    ? Math.abs(delta) <= 150 ? 'RITMO SEMELHANTE' : `${seconds(delta)} s/volta ${delta < 0 ? 'MAIS RÁPIDOS' : 'MAIS LENTOS'}`
    : Math.abs(trend) <= 150 ? 'RITMO ESTÁVEL' : `${seconds(trend)} s/volta ${trend < 0 ? 'GANHOS' : 'PERDIDOS'}`
  const detail = trend === null
    ? 'Já temos comparação de ritmo, mas faltam duas janelas completas para avaliar a evolução.'
    : trend < -150
      ? `Face ao período anterior, melhorámos ${seconds(trend)} s por volta relativamente aos outros.`
      : trend > 150
        ? `Face ao período anterior, estamos a perder ${seconds(trend)} s por volta relativamente aos outros.`
        : 'O nosso ritmo mudou praticamente tanto como o dos adversários.'
  const change = pace.ownChangeMs === null || pace.fieldChangeMs === null ? 'Comparação entre períodos ainda indisponível.' : `Nós: ${pace.ownChangeMs >= 0 ? '+' : '−'}${seconds(pace.ownChangeMs)} s · Pelotão: ${pace.fieldChangeMs >= 0 ? '+' : '−'}${seconds(pace.fieldChangeMs)} s` 
  const bothSlow = (pace.ownChangeMs ?? 0) > 200 && (pace.fieldChangeMs ?? 0) > 200
  const conditionNote = bothSlow ? 'Ambos abrandaram. Pode indicar uma alteração geral das condições, mas não prova que a causa seja a pista.' : null
  const tone = trend === null ? delta < -150 ? 'positive' : delta > 150 ? 'negative' : 'neutral' : trend < -150 ? 'positive' : trend > 150 ? 'negative' : 'neutral'
  return { headline, label, detail, comparison, change, conditionNote, tone }
}
