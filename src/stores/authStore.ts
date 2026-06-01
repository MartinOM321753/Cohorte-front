import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'
import axiosInstance from '@/lib/axiosInstance'

export type UserRole =
  | 'ADMINISTRADOR'
  | 'MEDICO'
  | 'LABORATORISTA'
  | 'RECEPCIONISTA'
  | 'PACIENTE'
  | 'ENCARGADO'

type RolLike = string | { nombre?: string } | null | undefined

export interface UserData {
  uuid: string
  username: string
  nombreCompleto: string
  rol: RolLike
}

export interface AuthState {
  token: string | null
  user: UserData | null
  isAuthenticated: boolean
  isLoading: boolean
  mustChangePassword: boolean

  login: (credentials: { token: string; user: UserData }) => void
  logout: () => void
  hasRole: (role: UserRole | UserRole[]) => boolean
  clearMustChangePassword: () => void
}

const initialState = {
  token: null,
  user: null,
  isAuthenticated: false,
  isLoading: false,
  mustChangePassword: false,
}

function normalizeRoleName(rol: RolLike): string {
  if (!rol) return ''
  const raw = typeof rol === 'string' ? rol : typeof rol === 'object' && typeof rol.nombre === 'string' ? rol.nombre : ''
  const cleaned = raw.trim().toUpperCase()
  if (!cleaned) return ''

  // Strict: only accept roles that exist in the frontend app.
  // If backend sends "ADMIN" (or any unknown role), user must NOT be authenticated.
  const withoutPrefix = cleaned.startsWith('ROLE_') ? cleaned.slice('ROLE_'.length) : cleaned
  if (withoutPrefix === 'ADMINISTRADOR') return 'ADMINISTRADOR'
  if (withoutPrefix === 'MEDICO') return 'MEDICO'
  if (withoutPrefix === 'RECEPCIONISTA') return 'RECEPCIONISTA'
  if (withoutPrefix === 'LABORATORISTA') return 'LABORATORISTA'
  if (withoutPrefix === 'PACIENTE') return 'PACIENTE'
  if (withoutPrefix === 'ENCARGADO') return 'ENCARGADO'

  return ''
}

function decodeJwtPayload(token: string): any | null {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    const payloadB64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = payloadB64.padEnd(payloadB64.length + ((4 - (payloadB64.length % 4)) % 4), '=')
    const binary = globalThis.atob(padded)
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
    const json = new TextDecoder().decode(bytes)
    return JSON.parse(json)
  } catch {
    return null
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    subscribeWithSelector((set, get) => ({
      ...initialState,

      login: (credentials: { token: string; user: UserData }) => {
        const tokenPayload = decodeJwtPayload(credentials.token)
        const rawRoleFromToken = tokenPayload?.role ?? tokenPayload?.rol ?? tokenPayload?.authorities
        const roleFromToken = normalizeRoleName(rawRoleFromToken ?? null)

        // If backend explicitly sends a role in the token, it must be a known role.
        // Do NOT fallback to `credentials.user.rol` when token role is unknown (e.g. "ADMIN").
        if (rawRoleFromToken != null && String(rawRoleFromToken).trim() && !roleFromToken) {
          set(initialState)
          return
        }

        const normalizedRole = roleFromToken || normalizeRoleName(credentials.user.rol)
        if (!normalizedRole) {
          set(initialState)
          return
        }

        const mustChangePassword = tokenPayload?.mustChangePassword === true

        set({
          token: credentials.token,
          user: { ...credentials.user, rol: normalizedRole },
          isAuthenticated: true,
          mustChangePassword,
        })
      },

      logout: () => {
        // Leer el token ANTES de limpiar el store — el interceptor de axios corre
        // como microtask (asíncrono), así que set(initialState) podría ejecutarse
        // primero y dejar el token como null antes de que el interceptor lo agregue.
        // Pasando el header explícitamente lo garantizamos.
        const token = get().token
        if (token) {
          axiosInstance
            .post('/auth/logout', {}, { headers: { Authorization: `Bearer ${token}` } })
            .catch(() => {})
        }
        set(initialState)
      },

      clearMustChangePassword: () => {
        set({ mustChangePassword: false })
      },

      hasRole: (role: UserRole | UserRole[]) => {
        const { user } = get()
        if (!user) return false
        const rolesToCheck = Array.isArray(role) ? role : [role]
        const userRoleName = normalizeRoleName(user.rol)
        if (!userRoleName) return false
        return rolesToCheck.includes(userRoleName as UserRole)
      },
    })),
    {
      name: 'auth-store',
      version: 2,
      onRehydrateStorage: () => (state) => {
        if (!state?.isAuthenticated || !state.user) return
        const tokenPayload = state.token ? decodeJwtPayload(state.token) : null
        const normalizedRole = normalizeRoleName(tokenPayload?.role ?? tokenPayload?.rol ?? state.user.rol)
        if (!normalizedRole) {
          state.logout()
          return
        }
        if (typeof state.user.rol !== 'string' || state.user.rol !== normalizedRole) {
          // Keep persisted user but normalize role to the app's known set
          state.login({ token: state.token as string, user: { ...state.user, rol: normalizedRole } })
        }
      },
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        mustChangePassword: state.mustChangePassword,
      }),
    }
  )
)
