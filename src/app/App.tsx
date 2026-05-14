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
