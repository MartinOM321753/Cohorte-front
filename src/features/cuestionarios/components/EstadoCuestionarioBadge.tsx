import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { EstadoCuestionario } from '../api/cuestionarios.types'

/**
 * El estado de un cuestionario, con lo que significa a la vista.
 *
 * La diferencia entre «completo» y «validado» no se adivina del nombre y sí importa:
 * completo dice que están todas las respuestas, validado dice que una persona se hizo
 * responsable de ellas contra la hoja original. El tooltip lo dice en lugar de dejar que
 * cada quien suponga.
 */
const ESTADOS: Record<EstadoCuestionario, {
  texto: string
  clase: string
  explica: string
}> = {
  BORRADOR: {
    texto: 'Borrador',
    clase: 'bg-slate-200 text-slate-800 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-100',
    explica: 'Capturándose. Admite faltantes: un cuestionario de dos mil preguntas no se llena de una sentada.',
  },
  COMPLETO: {
    texto: 'Completo',
    clase: 'bg-sky-500 text-sky-50 hover:bg-sky-500',
    explica: 'Todas las obligatorias que se le preguntaron tienen respuesta. Nadie lo ha revisado todavía.',
  },
  VALIDADO: {
    texto: 'Validado',
    clase: 'bg-emerald-600 text-emerald-50 hover:bg-emerald-600',
    explica: 'Revisado contra la hoja original, sin lecturas pendientes ni desacuerdos sin adjudicar.',
  },
  ANULADO: {
    texto: 'Anulado',
    clase: 'bg-destructive text-destructive-foreground hover:bg-destructive',
    explica: 'Retirado del análisis. Las respuestas se conservan: la hoja de papel existe y alguien la contestó.',
  },
}

export function EstadoCuestionarioBadge({ estado }: { estado: EstadoCuestionario }) {
  const info = ESTADOS[estado]
  if (!info) return <Badge variant="outline">{estado}</Badge>

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge className={info.clase}>{info.texto}</Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{info.explica}</TooltipContent>
    </Tooltip>
  )
}
