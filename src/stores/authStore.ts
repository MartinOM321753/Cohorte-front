import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'

export type UserRole = 'ADMINISTRADOR' | 'MEDICO' | 'LABORATORISTA' | 'RECEPCIONISTA' | 'PACIENTE' | 'ROLE_ADMIN' | 'ROLE_USER'

export interface UserData {
  id: string
  uuid?: string
  username: string
  email: string
  enabled?: boolean
  roles: string[]
  permissions?: string[]
  // For compatibility with backend response
  persona?: {
    id?: number
    nombre: string
    apellidoPaterno: string
    apellidoMaterno: string
    fechaNacimiento?: string
    sexo?: 'M' | 'F' | 'O'
    telefono?: string
    email: string
  }
  rol?: {
    id: number
    nombre: string
  }
}

export interface AuthState {
  token: string | null
  user: UserData | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  
  // Actions
  setToken: (token: string) => void
  setUser: (user: UserData) => void
  login: (credentials: { token: string; user: UserData }) => void
  logout: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  
  // Role checking
  hasRole: (role: UserRole | UserRole[]) => boolean
  hasPermission: (permission: string) => boolean
}

const initialState = {
  token: null,
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
}

export const useAuthStore = create<AuthState>()(
  persist(
    subscribeWithSelector((set, get) => ({
      ...initialState,

      setToken: (token: string) => {
        set({ token, isAuthenticated: !!token })
      },

      setUser: (user: UserData) => {
        set({ user })
      },

      login: (credentials: { token: string; user: UserData }) => {
        set({
          token: credentials.token,
          user: credentials.user,
          isAuthenticated: true,
          error: null,
        })
      },

      logout: () => {
        set(initialState)
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading })
      },

      setError: (error: string | null) => {
        set({ error })
      },

      hasRole: (role: UserRole | UserRole[]) => {
        const { user } = get()
        if (!user) return false

        const rolesToCheck = Array.isArray(role) ? role : [role]
        return rolesToCheck.some(r => user.roles.includes(r))
      },

      hasPermission: (permission: string) => {
        const { user } = get()
        if (!user) return false

        if (user.permissions) {
          return user.permissions.includes('*') || user.permissions.includes(permission)
        }

        const rolePermissions: Record<UserRole, string[]> = {
          ROLE_ADMIN: ['all'],
          ROLE_USER: ['read'],
          ADMINISTRADOR: ['all'],
          MEDICO: ['estudios:read', 'estudios:create', 'estudios:update', 'citas:read', 'citas:create', 'pacientes:read'],
          LABORATORISTA: ['examenes:read', 'examenes:create', 'muestras:read', 'muestras:create', 'biobanco:read', 'biobanco:update'],
          RECEPCIONISTA: ['pacientes:read', 'pacientes:create', 'pacientes:update', 'citas:read', 'citas:create'],
          PACIENTE: ['citas:read', 'resultados:read'],
        }

        const permissions: string[] = []
        user.roles.forEach(role => {
          permissions.push(...(rolePermissions[role as UserRole] || []))
        })

        return permissions.includes('all') || permissions.includes(permission)
      },
    })),
    {
      name: 'auth-store',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
