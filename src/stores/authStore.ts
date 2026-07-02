import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import axiosInstance from '@/lib/axiosInstance'
import { queryClient } from '@/lib/queryClient'
import { getModulosHabilitadosActual } from '@/features/instituciones/api/instituciones.api'

export type UserRole =
  | 'ADMINISTRADOR'
  | 'MEDICO'
  | 'LABORATORISTA'
  | 'RECEPCIONISTA'
  | 'PACIENTE'
  | 'ENCARGADO'

type RolLike = string | { nombre?: string } | null | undefined

export interface InstitucionResumen {
  id?: number
  uuid: string
  nombre: string
}

export interface UserData {
  uuid: string
  username: string
  nombreCompleto: string
  rol: RolLike
  institucion?: InstitucionResumen | null
}

export interface AuthState {
  user: UserData | null
  isAuthenticated: boolean
  isLoading: boolean
  mustChangePassword: boolean
  /** Módulos del sistema (BIOBANCO, EXAMENES, CITAS, etc.) habilitados para la institución del usuario. */
  modulosHabilitados: string[]
  /** Permisos efectivos del usuario (calculados por el backend). */
  permisos: string[]
  /** Roles asignados al usuario (multi-rol). */
  roles: string[]

  login: (data: { user: UserData; mustChangePassword?: boolean; permisos?: string[]; roles?: string[] }) => Promise<boolean>
  logout: () => void
  hasRole: (role: UserRole | UserRole[]) => boolean
  /** Verifica si el usuario tiene el permiso indicado. Acepta un código o un arreglo (any). */
  hasPermiso: (permiso: string | string[]) => boolean
  /** Verifica si el usuario tiene al menos uno de los permisos indicados. */
  hasAnyPermiso: (permisos: string[]) => boolean
  /** Indica si la institución del usuario tiene habilitado el módulo dado (ver ModuloSistema). */
  hasModulo: (modulo: string) => boolean
  clearMustChangePassword: () => void
  restoreSession: () => Promise<void>
}

const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  mustChangePassword: false,
  modulosHabilitados: [] as string[],
  permisos: [] as string[],
  roles: [] as string[],
}

function parseInstitucion(raw: any): InstitucionResumen | null {
  if (!raw || typeof raw !== 'object') return null
  const uuid = raw.uuid || raw.UUID || ''
  const nombre = raw.nombre || ''
  if (!uuid && !nombre) return null
  const id = typeof raw.id === 'number' ? raw.id : undefined
  return { id, uuid, nombre }
}

async function fetchModulosHabilitados(): Promise<string[]> {
  try {
    const modulos = await getModulosHabilitadosActual()
    return Array.isArray(modulos) ? modulos : []
  } catch {
    return []
  }
}

function normalizeRoleName(rol: RolLike): string {
  if (!rol) return ''
  const raw = typeof rol === 'string' ? rol : typeof rol === 'object' && typeof rol.nombre === 'string' ? rol.nombre : ''
  const cleaned = raw.trim().toUpperCase()
  if (!cleaned) return ''

  const withoutPrefix = cleaned.startsWith('ROLE_') ? cleaned.slice('ROLE_'.length) : cleaned
  if (withoutPrefix === 'ADMINISTRADOR') return 'ADMINISTRADOR'
  if (withoutPrefix === 'MEDICO') return 'MEDICO'
  if (withoutPrefix === 'RECEPCIONISTA') return 'RECEPCIONISTA'
  if (withoutPrefix === 'LABORATORISTA') return 'LABORATORISTA'
  if (withoutPrefix === 'PACIENTE') return 'PACIENTE'
  if (withoutPrefix === 'ENCARGADO') return 'ENCARGADO'

  return ''
}

export const useAuthStore = create<AuthState>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    login: async ({ user, mustChangePassword = false, permisos = [], roles = [] }) => {
      const normalizedRole = normalizeRoleName(user.rol)
      if (!normalizedRole && roles.length === 0) {
        queryClient.clear()
        set({ ...initialState, isLoading: false })
        return false
      }

      set({
        user: null,
        isAuthenticated: false,
        isLoading: true,
        mustChangePassword: false,
        modulosHabilitados: [],
        permisos: [],
        roles: [],
      })

      const modulosHabilitados = await fetchModulosHabilitados()
      queryClient.clear()

      set({
        user: { ...user, rol: normalizedRole || roles[0] || '' },
        isAuthenticated: true,
        isLoading: false,
        mustChangePassword,
        modulosHabilitados,
        permisos,
        roles,
      })
      return true
    },

    logout: () => {
      axiosInstance.post('/auth/logout').catch(() => {})
      queryClient.clear()
      set({ ...initialState, isLoading: false })
    },

    clearMustChangePassword: () => {
      set({ mustChangePassword: false })
    },

    hasRole: (role: UserRole | UserRole[]) => {
      const { roles, user } = get()
      if (!user) return false
      const rolesToCheck = Array.isArray(role) ? role : [role]
      if (roles.length > 0) {
        return rolesToCheck.some((r) => roles.includes(r))
      }
      const userRoleName = normalizeRoleName(user.rol)
      if (!userRoleName) return false
      return rolesToCheck.includes(userRoleName as UserRole)
    },

    hasPermiso: (permiso: string | string[]) => {
      const { permisos } = get()
      if (Array.isArray(permiso)) {
        return permiso.every((p) => permisos.includes(p))
      }
      return permisos.includes(permiso)
    },

    hasAnyPermiso: (permisos: string[]) => {
      const { permisos: userPermisos } = get()
      return permisos.some((p) => userPermisos.includes(p))
    },

    hasModulo: (modulo: string) => {
      return get().modulosHabilitados.includes(modulo)
    },

    restoreSession: async () => {
      set({ isLoading: true })
      try {
        const response = await axiosInstance.get('/auth/me')
        const data = response.data?.data
        const dto = data?.user
        if (!dto) {
          set({ ...initialState, isLoading: false })
          return
        }

        const rolNombre =
          typeof dto?.rol === 'string' ? dto.rol : typeof dto?.rol?.nombre === 'string' ? dto.rol.nombre : ''
        const nombreCompleto = dto?.persona
          ? [dto.persona?.nombre, dto.persona?.apellidoPaterno, dto.persona?.apellidoMaterno]
              .filter(Boolean)
              .join(' ')
              .trim()
          : ''

        const user: UserData = {
          uuid: dto?.uuid || dto?.UUID || '',
          username: dto?.username || '',
          nombreCompleto,
          rol: rolNombre,
          institucion: parseInstitucion(dto?.institucion),
        }

        const permisos: string[] = Array.isArray(data?.permisos) ? data.permisos : []
        const roles: string[] = Array.isArray(data?.roles) ? data.roles : []

        await get().login({ user, mustChangePassword: data?.mustChangePassword === true, permisos, roles })
      } catch {
        queryClient.clear()
        set({ ...initialState, isLoading: false })
      }
    },
  }))
)
