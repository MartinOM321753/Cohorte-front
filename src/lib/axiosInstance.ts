import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios'
import { useAuthStore } from '@/stores/authStore'

const API_BASE_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:8080/api'

let isForcingLogout = false

// Create axios instance
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - add JWT token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().token
    if (token && config.headers) {  
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error: AxiosError) => {
    return Promise.reject(error)
  }
)

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

    if (status === 401 && !isForcingLogout) {
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
