export type AlertVersion = { id: string; version: number }
export type AlertPeriod = { starts_at: string; expires_at: string }
export type AlertUrgency = AlertPeriod & { severity: 'information' | 'watch' | 'warning' | 'emergency'; id: string }
const severityOrder = { emergency: 0, warning: 1, watch: 2, information: 3 } as const

export function alertIsCurrent(alert: AlertPeriod, now = Date.now()) {
  return Date.parse(alert.starts_at) <= now && Date.parse(alert.expires_at) > now
}
export function prioritizeAlerts<T extends AlertUrgency>(alerts: readonly T[], now = Date.now()) {
  return alerts.filter(alert => alertIsCurrent(alert, now)).toSorted((a, b) => severityOrder[a.severity] - severityOrder[b.severity] || Date.parse(b.starts_at) - Date.parse(a.starts_at) || a.id.localeCompare(b.id))
}
export function unseenAlerts<T extends AlertVersion>(alerts: readonly T[], seen: Readonly<Record<string, number>>) {
  return alerts.filter(alert => (seen[alert.id] ?? 0) < alert.version)
}
export function safeRoute<T extends { evacuation_route: string | null; evacuation_source_url: string | null; evacuation_verified_at: string | null }>(alert: T) {
  return alert.evacuation_route && alert.evacuation_source_url && alert.evacuation_verified_at ? alert.evacuation_route : null
}
