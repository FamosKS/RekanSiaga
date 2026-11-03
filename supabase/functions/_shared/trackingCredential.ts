// Transport encoding only. The secret comes from the existing CSPRNG-backed
// backend token; never generate it from the administrative report reference.
const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
export function encodeTrackingCredential(token: string): string {
  if (!/^[a-f0-9]{64}$/.test(token)) throw Error('INVALID_CREDENTIAL')
  let bits = 0, value = 0, encoded = ''
  for (let i = 0; i < token.length; i += 2) {
    value = (value << 8) | Number.parseInt(token.slice(i, i + 2), 16); bits += 8
    while (bits >= 5) { bits -= 5; encoded += alphabet[(value >>> bits) & 31] }
  }
  if (bits) encoded += alphabet[(value << (5 - bits)) & 31]
  return 'RK2-' + encoded.match(/.{1,4}/g)!.join('-')
}
export function decodeTrackingCredential(input: string): string {
  if (input.length > 100) throw Error('INVALID_CREDENTIAL')
  const normalized = input.trim().toUpperCase()
  if (!normalized.startsWith('RK2-')) throw Error('INVALID_CREDENTIAL')
  const body = normalized.slice(4).replace(/[\s-]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1')
  if (body.length !== 52) throw Error('INVALID_CREDENTIAL')
  let bits = 0, value = 0, token = ''
  for (const char of body) {
    const digit = alphabet.indexOf(char)
    if (digit < 0) throw Error('INVALID_CREDENTIAL')
    value = (value << 5) | digit; bits += 5
    if (bits >= 8) { bits -= 8; token += ((value >>> bits) & 255).toString(16).padStart(2, '0') }
  }
  if ((value & ((1 << bits) - 1)) !== 0) throw Error('INVALID_CREDENTIAL')
  return token
}
