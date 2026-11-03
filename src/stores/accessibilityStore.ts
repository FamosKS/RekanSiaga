import { create } from 'zustand'
import { persist } from 'zustand/middleware'
type Settings = { textSize: 'normal' | 'large' | 'extra'; highContrast: boolean; reducedMotion: boolean }
type AccessibilityState = Settings & { update: (settings: Partial<Settings>) => void; reset: () => void }
const defaults: Settings = { textSize: 'normal', highContrast: false, reducedMotion: false }
export const useAccessibilityStore = create<AccessibilityState>()(persist((set) => ({ ...defaults, update: (settings) => set(settings), reset: () => set(defaults) }), { name: 'rekansiaga-accessibility', partialize: ({ textSize, highContrast, reducedMotion }) => ({ textSize, highContrast, reducedMotion }) }))
