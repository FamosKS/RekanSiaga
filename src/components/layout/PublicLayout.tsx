import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { PublicHeader } from './PublicHeader'
import { PublicFooter } from './PublicFooter'
import { AccessibilityDialog } from '../accessibility/AccessibilityDialog'
import { EnvironmentNotice } from '../../features/content/EnvironmentNotice'
import { LocationAlertCenter } from '../../features/notifications/LocationAlertCenter'
export function PublicLayout() {
  const [accessibilityOpen, setAccessibilityOpen] = useState(false)
  return (
    <div className="public-shell">
      <a className="skip-link" href="#main-content">Lewati ke konten</a>
      <PublicHeader onAccessibility={() => setAccessibilityOpen(true)}/>
      <LocationAlertCenter/>
      <main id="main-content" tabIndex={-1} className="container main-content"><EnvironmentNotice/><Outlet/></main>
      <PublicFooter/>
      <AccessibilityDialog open={accessibilityOpen} onClose={() => setAccessibilityOpen(false)}/>
    </div>
  )
}
