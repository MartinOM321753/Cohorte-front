import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
import { AppRouter } from '@/routes/Router'
import { Toaster } from 'sonner'

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppRouter />
      <Toaster
        position="top-right"
        richColors
        expand
        closeButton
        duration={4000}
      />
    </QueryClientProvider>
  )
}

export default App
