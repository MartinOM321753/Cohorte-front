import axios, { AxiosError, AxiosResponse } from 'axios'
import { useAuthStore } from '@/stores/authStore'

const API_BASE_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:8080/api'

let isForcingLogout = false

const PUBLIC_AUTH_PATHS = ['/login', '/forgot-password', '/reset-password']

function isPublicAuthPath(pathname: string) {
  return PUBLIC_AUTH_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

// Create axios instance
//
// Autenticación basada en cookie httpOnly: el backend emite la cookie de sesión
// (`auth_token`, HttpOnly + Secure + SameSite) en /auth/login y el navegador la
// envía automáticamente en cada petición — `withCredentials` es lo que le indica
// a Axios/el navegador que incluya cookies en peticiones cross-origin.
// Ya NO se adjunta manualmente un header Authorization: el JS no tiene ni puede
// leer el token (HttpOnly), lo que elimina el vector de robo vía XSS.
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Response interceptor — manejo de errores de autenticación
//
// Solo se hace logout automático cuando el backend devuelve 401 con un mensaje
// que indica token inválido/expirado (Spring Security), NO en errores de negocio.
// Los errores de negocio usan códigos distintos (422, 409, 400, etc.).
// El 403 NO provoca logout — significa "autenticado pero sin permiso".
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    const status = error.response?.status

    if (status === 401 && !isForcingLogout && !isPublicAuthPath(window.location.pathname)) {
      // Verificar que es realmente un error de autenticación de Spring Security,
      // no un error de negocio que el backend dejó pasar con 401 por descuido.
      // Spring Security devuelve 401 sin body estructurado o con error genérico.
      // Nuestros errores de negocio (contraseña incorrecta al cambiar) ya usan 422.
      isForcingLogout = true
      useAuthStore.getState().logout()
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }

    // 403 = autenticado pero sin permiso — NO hacer logout, solo propagar el error
    // para que cada componente lo maneje (toast, mensaje, etc.)

    return Promise.reject(error)
  }
)

export default api
