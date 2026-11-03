import type { ContentSource } from '../../types/publicContent'
import { safeExternalUrl, formatDate } from '../../lib/publicFormatting'
export function SourceAttribution({ source, date }: { source?: ContentSource; date?: string }) {
  const url = safeExternalUrl(source?.url)
  return <div className="source-line"><span>Sumber: {source ? url ? <a href={url} target="_blank" rel="noreferrer">{source.name}</a> : source.name : 'Belum tersedia'}</span><span>{date ? <time dateTime={date}>{formatDate(date)}</time> : 'Pembaruan: belum tersedia'}</span></div>
}
