import axiosInstance from '@/lib/axiosInstance'
import { ApiResponse, LoginRequest, LoginResponse, Usuario } from '@/types/api'
import { UserData } from '@/stores/authStore'

interface JWTPayload {
  // `sub` idealmente es el UUID (subject)
  sub: string

  // Algunos backends envían el UUID en un claim dedicado (recomendado)
  uuid?: string
  userUUID?: string

  // claims custom del backend
  name?: string
  role?: string
  activo: boolean
  iat: number
  exp: number
}

function decodeJWT(token: string): JWTPayload {
  try {
    const payload = token.split('.')[1]
    const decoded = JSON.parse(atob(payload))
    return decoded
  } catch {
    throw new Error('Token inválido')
  }
}

/** Solicita la geolocalización del navegador con un timeout de 3 s.
 *  Retorna las coordenadas o null si el usuario deniega / no está disponible. */
async function getGeolocation(): Promise<{ latitud: number; longitud: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null)
      return
    }
    const timer = setTimeout(() => resolve(null), 3000)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer)
        resolve({ latitud: pos.coords.latitude, longitud: pos.coords.longitude })
      },
      () => {
        clearTimeout(timer)
        resolve(null)
      },
      { timeout: 3000, maximumAge: 60000 }
    )
  })
}

export async function loginUser(credentials: LoginRequest): Promise<{ token: string; user: UserData }> {
  // Capturar geolocalización antes del login (silencioso en caso de denegación)
  const geo = await getGeolocation()
  const payload: LoginRequest = {
    ...credentials,
    latitud: geo?.latitud ?? null,
    longitud: geo?.longitud ?? null,
  }

  const response = await axiosInstance.post<LoginResponse>('/auth/login', payload)
  const jwtToken = response.data.data

  if (!jwtToken || typeof jwtToken !== 'string') {
    throw new Error('Token inválido en la respuesta del servidor')
  }

  const payload = decodeJWT(jwtToken)

  // Preferir UUID real: claim dedicado > `sub`
  const subjectUuid =
    (typeof payload.uuid === 'string' && payload.uuid.trim()) ||
    (typeof payload.userUUID === 'string' && payload.userUUID.trim()) ||
    payload.sub

  // Fetch real user data — pass token manually porque el store aún no lo tiene
  let dto: any | null = null
  try {
    const userResponse = await axiosInstance.get<ApiResponse<any>>(`/users/uuid/${subjectUuid}`, {
      headers: { Authorization: `Bearer ${jwtToken}` },
    })
    dto = userResponse.data?.data ?? null
  } catch {
    dto = null
  }

  // Fallback: si el token trae username en `sub`, intentar resolver UUID real listando usuarios
  if (!dto && typeof payload.sub === 'string' && payload.sub.trim()) {
    try {
      const listResponse = await axiosInstance.get<ApiResponse<Usuario[]>>('/users', {
        headers: { Authorization: `Bearer ${jwtToken}` },
      })
      const users = listResponse.data?.data ?? []
      const match =
        users.find((u) => u.uuid === payload.sub) ||
        users.find((u) => u.username === payload.sub) ||
        users.find((u) => u.username === credentials.identifier)
      dto = match ?? null
    } catch {
      dto = null
    }
  }

  const nombreCompleto = dto
    ? [dto.persona?.nombre, dto.persona?.apellidoPaterno, dto.persona?.apellidoMaterno].filter(Boolean).join(' ').trim()
    : ''

  // Backend puede mandar `rol` como string o como objeto `{ id, nombre }`
  const rolNombre =
    typeof dto?.rol === 'string' ? dto.rol : typeof dto?.rol?.nombre === 'string' ? dto.rol.nombre : ''

  const user: UserData = {
    uuid: dto?.uuid || dto?.UUID || subjectUuid,
    username: dto?.username || credentials.identifier,
    nombreCompleto: nombreCompleto || payload.name || credentials.username,
    rol: rolNombre || payload.role || '',
  }

  return { token: jwtToken, user }
}

export async function refreshToken(token: string): Promise<{ token: string }> {
  const response = await axiosInstance.post<{ token: string }>('/auth/refresh', { token })
  return response as any as { token: string }
}

// ── Recuperación de contraseña ─────────────────────────────────────────────────

export async function forgotPassword(email: string): Promise<string> {
  const res = await axiosInstance.post<ApiResponse<null>>('/auth/forgot-password', { email })
  return res.data.message
}

export async function validateResetToken(token: string): Promise<void> {
  await axiosInstance.get('/auth/reset-password/validate', { params: { token } })
}

export async function resetPassword(token: string, nuevaPassword: string): Promise<string> {
  const res = await axiosInstance.post<ApiResponse<null>>('/auth/reset-password', {
    token,
    nuevaPassword,
  })
  return res.data.message
}

// ── Cambio de contraseña (usuario autenticado) ─────────────────────────────────

/**
 * Cambio forzado en primer login (debeResetear=true).
 * No requiere contraseña actual porque fue generada por el sistema.
 */
export async function changePasswordForced(nuevaPassword: string): Promise<string> {
  const res = await axiosInstance.put<ApiResponse<null>>('/users/me/password', {
    nuevaPassword,
  })
  return res.data.message
}

/**
 * Cambio voluntario desde el perfil. Requiere la contraseña actual.
 */
export async function changePasswordVoluntario(
  passwordActual: string,
  nuevaPassword: string
): Promise<string> {
  const res = await axiosInstance.put<ApiResponse<null>>('/users/me/password', {
    passwordActual,
    nuevaPassword,
  })
  return res.data.message
}
