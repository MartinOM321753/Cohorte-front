import { createContext, useContext, useEffect } from 'react'

export type AnchoPagina = 'normal' | 'completo'

/**
 * Con cuánto ancho se pinta la página actual.
 *
 * <p>La aplicación limita el contenido a 1440 px, y para casi todo es lo correcto: una
 * tabla de texto estirada a dos mil píxeles se lee peor, no mejor. Pero hay pantallas
 * que son un taller —un lienzo con sus paneles alrededor— y ahí cada píxel cuenta.</p>
 *
 * <p>Por eso el ancho lo pide la página y no lo decide el marco: quitar el límite para
 * todo el sistema arreglaría el diseñador de reportes y estropearía el resto.</p>
 */
const ContextoAncho = createContext<(ancho: AnchoPagina) => void>(() => {})

export const ProveedorAncho = ContextoAncho.Provider

/**
 * Pide todo el ancho disponible mientras esta página esté montada.
 *
 * <p>Al salir se restablece solo. Sin eso, entrar al diseñador y volver a cualquier
 * otra pantalla dejaría el resto de la aplicación estirada.</p>
 */
export function useAnchoCompleto(activo = true) {
  const pedirAncho = useContext(ContextoAncho)

  useEffect(() => {
    if (!activo) return
    pedirAncho('completo')
    return () => pedirAncho('normal')
  }, [activo, pedirAncho])
}
