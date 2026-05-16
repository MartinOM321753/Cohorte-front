import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'

export type UserRole =
  | 'ADMINISTRADOR'
  | 'MEDICO'
  | 'LABORATORISTA'
  | 'RECEPCIONISTA'
  | 'PACIENTE'
  | 'ROLE_ADMIN'
  | 'ROLE_USER'

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

  login: (credentials: { token: string; user: UserData }) => void
  logout: () => void
  hasRole: (role: UserRole | UserRole[]) => boolean
}

const initialState = {
  token: null,
  user: null,
  isAuthenticated: false,
  isLoading: false,
}

function normalizeRoleName(rol: RolLike): string {
  if (!rol) return ''
  if (typeof rol === 'string') return rol.trim()
  if (typeof rol === 'object' && typeof rol.nombre === 'string') return rol.nombre.trim()
  return ''
}

export const useAuthStore = create<AuthState>()(
  persist(
    subscribeWithSelector((set, get) => ({
      ...initialState,

      login: (credentials: { token: string; user: UserData }) => {
        set({
          token: credentials.token,
          user: credentials.user,
          isAuthenticated: true,
        })
      },

      logout: () => {
        set(initialState)
      },

      hasRole: (role: UserRole | UserRole[]) => {
        const { user } = get()
        if (!user) return false
        const rolesToCheck = Array.isArray(role) ? role : [role]
        const userRoleName = normalizeRoleName(user.rol) as UserRole
        return rolesToCheck.includes(userRoleName)
      },
    })),
    {
      name: 'auth-store',
      version: 2,
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
