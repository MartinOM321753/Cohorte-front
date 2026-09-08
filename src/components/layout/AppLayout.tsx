import { useState } from 'react'
import { Outlet } from 'react-router-dom'

import { cn } from '@/lib/utils'

import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { ProveedorAncho, type AnchoPagina } from './anchoPagina'

export function AppLayout() {
  // Lo pide la página que lo necesita, con useAnchoCompleto, y se restablece al salir.
  const [ancho, setAncho] = useState<AnchoPagina>('normal')
  const completo = ancho === 'completo'

  return (
    <ProveedorAncho value={setAncho}>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-auto">
            <div
              className={cn(
                // min-w-0 y w-full: es el contenedor que acota a todas las páginas. Sin
                // él, un componente ancho de dentro empuja hacia fuera y el
                // desplazamiento aparece en la ventana en lugar de en ese componente.
                'mx-auto w-full min-w-0 py-4 sm:py-5 md:py-6',
                completo
                  // Sin tope y con menos margen lateral: en una pantalla de taller, el
                  // espacio que se va en márgenes es espacio que le falta al lienzo.
                  ? 'max-w-none px-3 sm:px-4'
                  : 'max-w-[1440px] px-3 sm:px-4 md:px-6',
              )}
            >
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </ProveedorAncho>
  )
}
