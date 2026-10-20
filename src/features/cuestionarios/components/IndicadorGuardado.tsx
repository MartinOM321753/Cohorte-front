import { AlertTriangle, Check, CloudOff, Loader2, RefreshCw } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { EstadoGuardado } from '../hooks/useAutoguardado'

/**
 * En qué estado está el guardado, dicho sin rodeos.
 *
 * <h3>Por qué dice «en este dispositivo»</h3>
 *
 * Es la parte que más importa y la que suele estar mal escrita. Cuando no hay red, lo
 * honesto no es «error al guardar» —asusta y sugiere que se perdió algo— ni «guardado»
 * —sería mentira—. Lo que de verdad ocurre es que la respuesta está a salvo en el teléfono
 * y se enviará al reconectar, y eso es exactamente lo que se le dice. Un participante que
 * entiende eso cierra la pestaña tranquilo; uno que lee «error» vuelve a teclear todo.
 */
export function IndicadorGuardado({ estado, onReintentar }: {
  estado: EstadoGuardado
  onReintentar?: () => void
}) {
  const base = 'flex items-center gap-1.5 text-xs'

  switch (estado.tipo) {
    case 'limpio':
      return (
        <span className={cn(base, 'text-muted-foreground')}>
          <Check className="size-3.5 text-emerald-600" />
          {estado.guardadoEn
            ? `Guardado ${hora(estado.guardadoEn)}`
            : 'Sus respuestas se guardan solas'}
        </span>
      )

    case 'pendiente':
      return (
        <span className={cn(base, 'text-muted-foreground')}>
          <RefreshCw className="size-3.5" />
          {estado.cuantos === 1 ? 'Un cambio por guardar' : `${estado.cuantos} cambios por guardar`}
        </span>
      )

    case 'guardando':
      return (
        <span className={cn(base, 'text-muted-foreground')}>
          <Loader2 className="size-3.5 animate-spin" />
          Guardando…
        </span>
      )

    case 'sin-conexion':
      return (
        <span className={cn(base, 'text-amber-700 dark:text-amber-400')}>
          <CloudOff className="size-3.5" />
          Sin conexión. {estado.cuantos === 1 ? 'Su respuesta está' : 'Sus respuestas están'}
          {' '}guardada{estado.cuantos === 1 ? '' : 's'} en este dispositivo y se
          {estado.cuantos === 1 ? ' enviará' : ' enviarán'} al reconectar.
        </span>
      )

    case 'error':
      return (
        <span className={cn(base, 'flex-wrap text-amber-700 dark:text-amber-400')}>
          <AlertTriangle className="size-3.5" />
          {estado.mensaje}
          {onReintentar && (
            <button
              type="button"
              onClick={onReintentar}
              className="underline underline-offset-2 hover:no-underline"
            >
              Reintentar ahora
            </button>
          )}
        </span>
      )
  }
}

function hora(fecha: Date): string {
  const segundos = Math.round((Date.now() - fecha.getTime()) / 1000)
  if (segundos < 10) return 'hace un momento'
  if (segundos < 60) return `hace ${segundos} segundos`
  const minutos = Math.round(segundos / 60)
  if (minutos < 60) return `hace ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}`
  return `a las ${fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`
}
