export type Point = { latitude: number; longitude: number }
export function validPoint(latitude: number, longitude: number): Point | null { return Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180 ? { latitude, longitude } : null }
export function parsePoint(value: unknown): Point | null {
  if (typeof value !== 'string') return null
  const pair = /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/.exec(value.trim())
  if (pair) return validPoint(Number(pair[1]), Number(pair[2]))
  const wkt = /^(?:SRID=4326;)?POINT\((-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)\)$/i.exec(value)
  if (wkt) return validPoint(Number(wkt[2]), Number(wkt[1]))
  if (!/^(?:[\da-f]{2}){21,25}$/i.test(value)) return null
  const bytes = Uint8Array.from(value.match(/../g) ?? [], byte => parseInt(byte, 16))
  const view = new DataView(bytes.buffer)
  const little = bytes[0] === 1
  const type = view.getUint32(1, little)
  if ((type & 0xffff) !== 1 || (type & 0xc0000000) !== 0) return null
  const offset = type & 0x20000000 ? 9 : 5
  if (bytes.length !== offset + 16 || offset === 9 && view.getUint32(5, little) !== 4326) return null
  return validPoint(view.getFloat64(offset + 8, little), view.getFloat64(offset, little))
}
export function pointInput(value: unknown) { const point = parsePoint(value); return point ? `${point.latitude}, ${point.longitude}` : '' }
export function pointPayload(value: string) {
  if (!value.trim()) return null
  const parts = value.split(',').map(part => part.trim())
  const point = parts.length === 2 && parts.every(Boolean) ? validPoint(Number(parts[0]), Number(parts[1])) : null
  if (!point) throw new Error('Koordinat harus latitude, longitude pada rentang yang benar.')
  return `SRID=4326;POINT(${point.longitude.toFixed(12)} ${point.latitude.toFixed(12)})`
}
