export function isValidIdentifier(value: string | undefined): value is string {
  return typeof value === 'string' && /^[a-zA-Z0-9_-]{1,160}$/.test(value)
}

export function isUuidIdentifier(value: string | undefined): value is string { return typeof value === 'string' && /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(value) }
