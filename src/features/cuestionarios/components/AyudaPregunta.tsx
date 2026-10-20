import { Info } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * Lo que el papel imprime junto a la pregunta: la aclaración y la figura.
 *
 * <h3>Por qué esto no es decoración</h3>
 *
 * Son parte del instrumento. «¿A qué hora se acostó?» significa una cosa con
 * «considerando horario de 24 hrs» al lado y otra sin ello; «¿por cuántos meses tomó
 * el medicamento?» necesita saber que cinco años son sesenta meses. Y hay preguntas
 * que **son** la imagen: «¿qué figura representa mejor su cuerpo?» no quiere decir
 * nada sin las nueve siluetas.
 *
 * Al quitar el papel, si esto no se muestra, el participante contesta otra pregunta.
 *
 * <h3>Las figuras se sirven estáticas</h3>
 *
 * Viven en `public/cuestionarios/figuras/` y la plantilla guarda su ruta relativa.
 * Son quince imágenes recortadas del cuestionario impreso, menos de un mega en
 * total: no justifican un almacén ni un endpoint, y servidas así se cachean solas.
 */
export function AyudaPregunta({ instruccion, figura, className }: {
  instruccion?: string | null
  figura?: string | null
  className?: string
}) {
  if (!instruccion && !figura) return null

  return (
    <div className={cn('space-y-2', className)}>
      {instruccion && (
        <p className="flex items-start gap-1.5 rounded-md bg-muted/60 px-2.5 py-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          <span>{instruccion}</span>
        </p>
      )}
      {figura && (
        <img
          src={`/cuestionarios/${figura}`}
          // El texto alternativo es deliberadamente escueto: describir una escala de
          // nueve siluetas no la sustituye, y prometer que sí engaña a quien depende
          // de él. Lo honesto es decir qué es y que hace falta verla.
          alt="Figura de la pregunta; hace falta verla para poder contestar"
          loading="lazy"
          className="max-w-full rounded-md border bg-white p-2 dark:bg-zinc-100"
        />
      )}
    </div>
  )
}
