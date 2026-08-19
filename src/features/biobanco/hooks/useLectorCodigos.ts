import { useEffect, useRef } from 'react'

/**
 * Escucha un lector de códigos conectado por USB o Bluetooth.
 *
 * Estos aparatos no son una cámara ni una API: el sistema los ve como un
 * teclado. Cuando el operador dispara el láser, el lector "teclea" el contenido
 * del código carácter por carácter y termina con Enter. No hay evento que avise
 * de que empezó una lectura, así que hay que deducirlo.
 *
 * Lo que los distingue de una persona escribiendo es la velocidad: un lector
 * mete los caracteres en pocos milisegundos, un humano tarda decenas. Por eso se
 * mide el hueco entre pulsaciones y se descarta lo que llegue demasiado lento.
 * Sin ese filtro, cualquiera escribiendo en la página dispararía búsquedas.
 *
 * No se monta un input oculto con foco robado, que es la solución habitual y la
 * que rompe el resto de la pantalla: mientras el foco esté en un campo de texto
 * real, este hook se aparta y deja escribir en paz.
 */
interface OpcionesLector {
  /** Se invoca con el contenido leído, ya limpio. */
  onLectura: (codigo: string) => void
  /** Permite apagar la escucha sin desmontar (p. ej. si falta el permiso). */
  activo?: boolean
  /** Milisegundos máximos entre teclas para seguir considerándolo una ráfaga. */
  msEntreTeclas?: number
  /** Longitud mínima para aceptar la lectura; descarta pulsaciones sueltas. */
  largoMinimo?: number
}

export function useLectorCodigos({
  onLectura,
  activo = true,
  msEntreTeclas = 35,
  largoMinimo = 4,
}: OpcionesLector) {
  // El callback vive en una ref para no re-suscribir el listener en cada render
  // del componente que lo usa; si no, se pierde el buffer a medio escaneo.
  const onLecturaRef = useRef(onLectura)
  useEffect(() => { onLecturaRef.current = onLectura }, [onLectura])

  const buffer = useRef('')
  const ultimaTecla = useRef(0)

  useEffect(() => {
    if (!activo) return

    const handler = (e: KeyboardEvent) => {
      // Si el usuario está escribiendo en un campo, el teclado es suyo.
      const destino = e.target as HTMLElement | null
      if (destino) {
        const tag = destino.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || destino.isContentEditable) {
          return
        }
      }

      const ahora = Date.now()
      const huecoLargo = ahora - ultimaTecla.current > msEntreTeclas
      ultimaTecla.current = ahora

      if (e.key === 'Enter') {
        const leido = buffer.current.trim()
        buffer.current = ''
        // El Enter cierra la ráfaga solo si hay algo acumulado y es lo bastante
        // largo. Un Enter suelto —navegando con el teclado— no dispara nada.
        if (leido.length >= largoMinimo) {
          e.preventDefault()
          onLecturaRef.current(leido)
        }
        return
      }

      // Solo caracteres imprimibles: las teclas especiales llegan con nombre largo.
      if (e.key.length !== 1) return

      // Un hueco largo significa que esto no viene del lector: se empieza de cero.
      buffer.current = huecoLargo ? e.key : buffer.current + e.key
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [activo, msEntreTeclas, largoMinimo])
}
