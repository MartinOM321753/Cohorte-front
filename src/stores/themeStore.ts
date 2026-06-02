/**
 * Theme store — persists theme id in localStorage under the key 'theme'.
 * The anti-flash script in index.html reads that key synchronously before React
 * hydrates, so there is no flash of unstyled content.
 * Supports 6 themes via data-theme attribute; maintains .dark class for Tailwind dark: utilities.
 */
import { create } from 'zustand'

export type ThemeId =
  | 'imss-verde'
  | 'imss-oscuro'
  | 'noche-slate'
  | 'sepia-lectura'
  | 'alto-contraste'
  | 'ambar-oled'

export interface ThemeMeta {
  id: ThemeId
  name: string
  description: string
  isDark: boolean
  swatches: [string, string, string, string]
}

export const THEMES: ThemeMeta[] = [
  { id: 'imss-verde',      name: 'IMSS Verde',      description: 'Institucional claro',  isDark: false, swatches: ['#0e2a20', '#1e4e3a', '#a87b2c', '#ffffff'] },
  { id: 'imss-oscuro',     name: 'IMSS Oscuro',     description: 'Verde teñido',          isDark: true,  swatches: ['#0a1712', '#5fa37e', '#d4a866', '#14241d'] },
  { id: 'noche-slate',     name: 'Noche Slate',     description: 'Gris neutro',           isDark: true,  swatches: ['#0b0f14', '#3f9d74', '#cbd3da', '#161b22'] },
  { id: 'sepia-lectura',   name: 'Sepia Lectura',   description: 'Cálido, baja fatiga',   isDark: false, swatches: ['#2c2417', '#1e4e3a', '#9a6f24', '#f3ead7'] },
  { id: 'alto-contraste',  name: 'Alto Contraste',  description: 'Accesibilidad AAA',     isDark: false, swatches: ['#000000', '#0a3a28', '#8a4b00', '#ffffff'] },
  { id: 'ambar-oled',      name: 'Ámbar OLED',      description: 'Negro puro, nocturno',  isDark: true,  swatches: ['#000000', '#d4a866', '#74c79a', '#0d0d0c'] },
]

const THEME_KEY = 'theme'
const DARK_THEMES: ThemeId[] = ['imss-oscuro', 'noche-slate', 'ambar-oled']
const ALL_IDS = THEMES.map(t => t.id)

function getInitialTheme(): ThemeId {
  if (typeof window === 'undefined') return 'imss-verde'
  const stored = localStorage.getItem(THEME_KEY) as ThemeId | null
  if (stored && ALL_IDS.includes(stored)) return stored
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  return prefersDark ? 'imss-oscuro' : 'imss-verde'
}

function applyTheme(theme: ThemeId) {
  const root = document.documentElement
  root.setAttribute('data-theme', theme)
  root.classList.toggle('dark', DARK_THEMES.includes(theme))
}

interface ThemeStore {
  theme: ThemeId
  setTheme: (t: ThemeId) => void
  /** Alterna entre el claro y el oscuro institucional (compatibilidad con toggle binario). */
  toggle: () => void
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: getInitialTheme(),

  setTheme: (t) => {
    applyTheme(t)
    localStorage.setItem(THEME_KEY, t)
    set({ theme: t })
  },

  toggle: () => {
    const next: ThemeId = DARK_THEMES.includes(get().theme) ? 'imss-verde' : 'imss-oscuro'
    get().setTheme(next)
  },
}))

// Apply on module load (synchronises with anti-flash attribute already set by index.html).
applyTheme(getInitialTheme())
