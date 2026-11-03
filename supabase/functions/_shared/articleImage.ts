// Article uploads are normalized to PNG by the browser, checked again here.
// No EXIF, textual, timestamp, location or unknown ancillary chunks survive.
export const maxArticleImageBytes = 5 * 1024 * 1024
export function crc32(bytes: Uint8Array): number {
  let value = 0xffffffff
  for (const byte of bytes) { value ^= byte; for (let n = 0; n < 8; n++) value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0) }
  return (value ^ 0xffffffff) >>> 0
}
export function sanitizeArticlePng(input: Uint8Array): Uint8Array {
  const fail = (): never => { throw Error('INVALID_IMAGE') }
  if (input.length < 45 || input.length > maxArticleImageBytes || ![137,80,78,71,13,10,26,10].every((b,i)=>input[i]===b)) fail()
  const parts = [input.slice(0,8)], view = new DataView(input.buffer,input.byteOffset,input.byteLength)
  let offset = 8, seenHeader = false, seenData = false, ended = false
  while (offset + 12 <= input.length) {
    const length = view.getUint32(offset), end = offset + length + 12
    if (end > input.length || length > maxArticleImageBytes) fail()
    const type = String.fromCharCode(...input.slice(offset+4,offset+8))
    if (!/^[A-Za-z]{4}$/.test(type) || crc32(input.subarray(offset+4,end-4)) !== view.getUint32(end-4)) fail()
    if (!seenHeader && type !== 'IHDR') fail()
    if (type === 'IHDR') {
      if (seenHeader || length !== 13) fail()
      const width = view.getUint32(offset+8), height = view.getUint32(offset+12)
      if (!width || !height || width > 4096 || height > 4096 || width * height > 16_000_000 || input[offset+16] !== 8 || ![0,2,3,4,6].includes(input[offset+17]) || input[offset+18]!==0 || input[offset+19]!==0 || input[offset+20]!==0) fail()
      seenHeader = true
    }
    if (type === 'IDAT' && length > 0) seenData = true
    if (type === 'IEND') { if (!seenData || length !== 0 || end !== input.length) fail(); ended = true }
    const keep = ['IHDR','PLTE','IDAT','IEND','tRNS'].includes(type)
    if (!keep && type[0]===type[0].toUpperCase()) fail()
    if (keep) parts.push(input.slice(offset,end))
    offset = end
    if (ended) break
  }
  if (!ended || offset !== input.length) fail()
  const output = new Uint8Array(parts.reduce((size,part)=>size+part.length,0))
  let position = 0; for (const part of parts) { output.set(part,position); position += part.length }
  return output
}
