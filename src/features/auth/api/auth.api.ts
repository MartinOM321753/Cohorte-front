import axiosInstance from '@/lib/axiosInstance'
import { ApiResponse, LoginRequest } from '@/types/api'
import { UserData } from '@/stores/authStore'

/**
 * Solicita la geolocalización del navegador con máxima precisión disponible.
 *
 * Estrategia en dos pasos para equilibrar velocidad y precisión:
 *
 * 1. Intento rápido-preciso: `enableHighAccuracy: true`, timeout 8 s.
 *    - Móviles con GPS → resuelve en 2-5 s con < 10 m de error.
 *    - PC con WiFi → resuelve en 1-3 s con ~100 m de error.
 *    - PC sin WiFi → puede agotar los 8 s (no hay GPS ni WiFi).
 *
 * 2. Fallback rápido: si el paso 1 agota el timeout (NO si el usuario
 *    deniega), reintenta con `enableHighAccuracy: false`, timeout 4 s.
 *    Esto fuerza la localización por IP del proveedor, que es instantánea.
 *
 * Si el usuario deniega el permiso en cualquier paso → rechaza de inmediato
 * (código 1 = PERMISSION_DENIED) y el login queda bloqueado.
 *
 * Tiempo máximo de espera: ~12 s en el peor caso (PC sin GPS ni WiFi).
 * Tiempo habitual: 1-5 s.
 */
export async function getGeolocation(): Promise<{
  latitud: number
  longitud: number
  precisionM: number
}> {
  const toResult = (pos: GeolocationPosition) => ({
    latitud:   pos.coords.latitude,
    longitud:  pos.coords.longitude,
    precisionM: Math.round(pos.coords.accuracy),
  })

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('GEOLOCATION_UNAVAILABLE'))
      return
    }

    // ── Paso 1: alta precisión (GPS / WiFi) ───────────────────────────────
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(toResult(pos)),
      (err) => {
        // PERMISSION_DENIED (code 1) → bloquear login de inmediato
        if (err.code === 1) {
          reject(err)
          return
        }
        // TIMEOUT (code 3) o POSITION_UNAVAILABLE (code 2) → fallback rápido
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(toResult(pos)),
          (err2) => reject(err2),
          { enableHighAccuracy: false, timeout: 4000, maximumAge: 60000 },
        )
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
    )
  })
}

/**
 * Inicia sesión y restaura los datos del usuario autenticado.
 *
 * El backend ya no devuelve el JWT en el cuerpo de la respuesta: lo emite como
 * cookie httpOnly (ver AuthController/auth_token), inaccesible desde JS — esto
 * elimina el vector de robo del token vía XSS. El navegador adjunta la cookie
 * automáticamente en la siguiente petición (`withCredentials: true`), así que
 * basta con consultar /auth/me para obtener los datos de la sesión recién creada.
 */
export async function loginUser(
  credentials: LoginRequest,
  coords: { latitud: number; longitud: number; precisionM: number } | null,
): Promise<{ user: UserData; mustChangePassword: boolean }> {
  const loginPayload: LoginRequest = {
    ...credentials,
    latitud: coords?.latitud ?? null,
    longitud: coords?.longitud ?? null,
    precisionM: coords?.precisionM ?? null,
  }

  // Elimina cualquier cookie auth_token stale que haya sobrevivido un deploy
  // anterior. La cookie es httpOnly → JS no puede borrarla directamente, pero
  // /clear-session responde con Set-Cookie Max-Age=0 que la expira.
  try { await axiosInstance.post('/auth/clear-session') } catch { /* ignorar */ }

  await axiosInstance.post('/auth/login', loginPayload)

  const meResponse = await axiosInstance.get<ApiResponse<{ user: any; mustChangePassword: boolean }>>('/auth/me')
  const data = meResponse.data?.data
  const dto = data?.user

  if (!dto) {
    throw new Error('No se pudo obtener la información de la sesión')
  }

  const nombreCompleto = dto.persona
    ? [dto.persona?.nombre, dto.persona?.apellidoPaterno, dto.persona?.apellidoMaterno].filter(Boolean).join(' ').trim()
    : ''

  // Backend puede mandar `rol` como string o como objeto `{ id, nombre }`
  const rolNombre =
    typeof dto?.rol === 'string' ? dto.rol : typeof dto?.rol?.nombre === 'string' ? dto.rol.nombre : ''

  const institucionDto = dto?.institucion
  const institucion = institucionDto && (institucionDto.uuid || institucionDto.nombre)
    ? {
        id: typeof institucionDto.id === 'number' ? institucionDto.id : undefined,
        uuid: institucionDto.uuid || '',
        nombre: institucionDto.nombre || '',
      }
    : null

  const user: UserData = {
    uuid: dto?.uuid || dto?.UUID || '',
    username: dto?.username || credentials.identifier,
    nombreCompleto: nombreCompleto || credentials.identifier,
    rol: rolNombre,
    institucion,
  }

  return { user, mustChangePassword: data?.mustChangePassword === true }
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
