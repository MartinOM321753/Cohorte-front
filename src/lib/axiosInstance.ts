import axios, { AxiosError, AxiosResponse } from 'axios'
import { useAuthStore } from '@/stores/authStore'
import { queryClient } from '@/lib/queryClient'

const API_BASE_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:8080/api'

let isForcingLogout = false
let isRefreshingPermisos = false

const PUBLIC_AUTH_PATHS = ['/login', '/forgot-password', '/reset-password']

function isPublicAuthPath(pathname: string) {
  return PUBLIC_AUTH_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    const status = error.response?.status

    if (status === 401 && !isForcingLogout && !isPublicAuthPath(window.location.pathname)) {
      isForcingLogout = true
      useAuthStore.getState().logout()
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }

    if (status === 403 && !isRefreshingPermisos && !isPublicAuthPath(window.location.pathname)) {
      isRefreshingPermisos = true
      useAuthStore.getState().restoreSession().then(() => {
        queryClient.invalidateQueries()
      }).finally(() => {
        isRefreshingPermisos = false
      })
    }

    return Promise.reject(error)
  }
)

queueMicrotask(() => {
  useAuthStore.subscribe((state, prev) => {
    if (state.user && !prev.user) {
      isForcingLogout = false
    }
  })
})

export default api
