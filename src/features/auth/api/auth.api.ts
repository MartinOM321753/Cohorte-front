import axiosInstance from '@/lib/axiosInstance'
import { LoginRequest, LoginResponse } from '@/types/api'
import { UserData } from '@/stores/authStore'

interface JWTPayload {
  id: number
  uuid: string
  sub: string
  activo: boolean
  iat: number
  exp: number
}

function decodeJWT(token: string): JWTPayload {
  try {
    const payload = token.split('.')[1]
    const decoded = JSON.parse(atob(payload))
    return decoded
  } catch (error) {
    throw new Error('Token inválido')
  }
}

/**
 * Login with username and password
 */
export async function loginUser(credentials: LoginRequest): Promise<{ token: string; user: UserData }> {
  const response = await axiosInstance.post<LoginResponse>('/auth/login', credentials)

  // response.data es el objeto { data: "jwt_token", message: "...", status: "...", error: false }
  const jwtToken = response.data.data

  if (!jwtToken || typeof jwtToken !== 'string') {
    throw new Error('Token inválido en la respuesta del servidor')
  }

  const payload = decodeJWT(jwtToken)

  const user: UserData = {
    id: String(payload.id),
    uuid: payload.uuid,
    username: payload.sub,
    email: payload.sub + '@imss.gob.mx',
    enabled: payload.activo,
    roles: ['ADMINISTRADOR', 'ROLE_ADMIN'],
    permissions: ['*'],
    persona: {
      nombre: payload.sub.toUpperCase(),
      apellidoPaterno: 'Admin',
      apellidoMaterno: 'Sistema',
      email: payload.sub + '@imss.gob.mx',
    },
    rol: {
      id: 1,
      nombre: 'ADMINISTRADOR',
    },
  }

  return {
    token: jwtToken,
    user,
  }
}

/**
 * Logout (client-side only, no API call needed)
 */
export function logoutUser(): void {
  localStorage.removeItem('lastRefresh')
}

/**
 * Refresh token (placeholder for future implementation)
 */
export async function refreshToken(token: string): Promise<{ token: string }> {
  const response = await axiosInstance.post<{ token: string }>('/auth/refresh', { token })
  return response as any as { token: string }
}
