/** Classification of official Apex Race Control messages.
 *  This does not determine whether a penalty was served, applied or rescinded.
 */
export type NoticeType = 'warning' | 'penalty' | 'correction'
export type RaceNotice = {
  id: string
  time: string
  kart: string | null
  type: NoticeType
  message: string
}

function classify(message: string): NoticeType | null {
  if (/corre[cç][ãa]o.{0,24}penaliza|correction.{0,24}penalt|anula[cç][ãa]o.{0,24}penaliza|penalt.{0,24}(cancel|removed|rescinded)/i.test(message)) return 'correction'
  if (/warning|advert[eê]ncia|\baviso\b/i.test(message)) return 'warning'
  if (/penaliza|\bpenalt|drive[ -]?through|stop[ -]?(?:and|&)[ -]?go/i.test(message)) return 'penalty'
  return null
}
function fingerprint(value: string): string {
  let hash = 2166136261
  for (const char of value) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  return (hash >>> 0).toString(36)
}
/** HTML from Apex is parsed as inert text; never inserted into the app DOM. */
export function parseRaceControl(html: string): RaceNotice[] {
  if (!html.trim()) return []
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const messages = Array.from(doc.querySelectorAll('p'))
  const occurrences = new Map<string, number>()
  const notices: RaceNotice[] = []
  for (const paragraph of messages) {
    const time = (paragraph.querySelector('b')?.textContent || '').trim()
    const kartValue = (paragraph.querySelector('.com_no')?.textContent || '').trim()
    const kart = /^\d+$/.test(kartValue) ? String(Number(kartValue)) : null
    const copy = paragraph.cloneNode(true) as HTMLElement
    copy.querySelectorAll('b,.com_no,[data-flag]').forEach(node => node.remove())
    const message = (copy.textContent || '').replace(/\s+/g, ' ').trim()
    const type = classify(message)
    if (!type || !message) continue
    const key = `${time}|${kart ?? ''}|${type}|${message}`
    const occurrence = (occurrences.get(key) || 0) + 1
    occurrences.set(key, occurrence)
    notices.push({ id: fingerprint(`${key}|${occurrence}`), time, kart, type, message })
  }
  // The Apex message generally presents the most recent item first.
  return notices
}
export function noticeTypeLabel(type: NoticeType): string {
  return type === 'warning' ? 'WARNING' : type === 'penalty' ? 'PENALIZAÇÃO' : 'CORREÇÃO'
}
export function directRivalKarts(racers: {position: number | null; kart: string}[], selectedKart: string, followed: string[] = []): string[] {
  const mine = racers.find(r => r.kart === selectedKart)
  const nearest = mine?.position ? racers
    .filter(r => r.kart !== selectedKart && r.position !== null && Math.abs(r.position - mine.position!) <= 2)
    .sort((a,b) => Math.abs(a.position! - mine.position!) - Math.abs(b.position! - mine.position!)).map(r => r.kart) : []
  return [...new Set([...nearest, ...followed.filter(kart => kart !== selectedKart)])]
}
