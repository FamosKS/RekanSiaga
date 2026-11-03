import { useEffect } from 'react'
import { useAccessibilityStore } from '../stores/accessibilityStore'

export function useAccessibilityPreferences() {
  const { textSize, highContrast, reducedMotion } = useAccessibilityStore()

  useEffect(() => {
    document.documentElement.dataset.textSize = textSize
    document.documentElement.dataset.contrast = String(highContrast)
    document.documentElement.dataset.reducedMotion = String(reducedMotion)
  }, [textSize, highContrast, reducedMotion])
}
