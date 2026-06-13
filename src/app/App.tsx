import { useEffect } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
import { AppRouter } from '@/routes/Router'
import { Toaster } from 'sonner'
import { useAuthStore } from '@/stores/authStore'

function App() {
  useEffect(() => {
    // Limpieza única de datos heredados de la versión anterior (localStorage):
    // el authStore solía usar el middleware `persist` de Zustand bajo la clave
    // 'auth-store', guardando el JWT en texto plano accesible desde JS — el
    // mismo vector que esta migración a cookies httpOnly busca eliminar.
    // Borrarla aquí asegura que ningún navegador con sesión previa conserve
    // el token expuesto, aunque ya no se vuelva a escribir.
    try {
      localStorage.removeItem('auth-store')
    } catch {
      // localStorage puede no estar disponible (modo privado, etc.)
    }

    // Restaura la sesión a partir de la cookie httpOnly al cargar la app — el JS
    // ya no puede leer el token (no se persiste en localStorage), así que se
    // valida la sesión vigente contra /auth/me. Mientras tanto, ProtectedRoute
    // muestra un spinner (isLoading=true por defecto en el store).
    useAuthStore.getState().restoreSession()
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <AppRouter />
      <Toaster
        position="top-right"
        closeButton
        duration={4000}
        toastOptions={{
          style: {
            background: 'white',
            border: '1px solid var(--imss-ink-100)',
            borderRadius: '6px',
            fontFamily: "'Inter', sans-serif",
            fontSize: '14px',
          },
        }}
      />
    </QueryClientProvider>
  )
}

export default App
