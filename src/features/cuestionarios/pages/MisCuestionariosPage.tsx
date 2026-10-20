import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronRight, ClipboardList, FileText, Loader2, Lock, Play } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { mensajeErrorApi } from '@/lib/apiErrors'
import { FormularioParticipante } from '../components/FormularioParticipante'
import {
  getDisponibles, getMisCuestionarios, iniciarMiCuestionario, type MiCuestionario,
} from '../api/misCuestionarios.api'

/**
 * Lo que ve el participante al entrar con su cuenta.
 *
 * <h3>Dos listas y por qué no es una</h3>
 *
 * Arriba, lo que ya empezó o le asignaron. Abajo, lo que **puede empezar por su cuenta** —
 * y ahí solo caben los instrumentos que el personal marcó como autollenables y que le
 * corresponden por sexo y edad. No es un catálogo: qué instrumento le toca a cada
 * participante es una decisión del protocolo, y una prueba cognitiva contestada a solas
 * deja de medir lo que mide.
 *
 * <h3>El vacío explica, no se encoge de hombros</h3>
 *
 * «No tiene cuestionarios» sin más deja al participante —y a quien administra— sin saber si
 * falta algo por configurar o si de verdad no le toca nada. El mensaje dice cuál de las dos
 * cosas es.
 */
export default function MisCuestionariosPage() {
  const qc = useQueryClient()
  const [abierto, setAbierto] = useState<MiCuestionario | null>(null)

  const { data: cuestionarios = [], isLoading } = useQuery({
    queryKey: ['mis-cuestionarios'],
    queryFn: getMisCuestionarios,
  })

  const { data: disponibles = [], isLoading: cargandoDisponibles } = useQuery({
    queryKey: ['mis-cuestionarios', 'disponibles'],
    queryFn: getDisponibles,
  })

  const iniciar = useMutation({
    mutationFn: (idTipo: number) => iniciarMiCuestionario(idTipo),
    onSuccess: (creado) => {
      qc.invalidateQueries({ queryKey: ['mis-cuestionarios'] })
      setAbierto(creado)
    },
    onError: (e) => toast.error(mensajeErrorApi(e, 'No se pudo iniciar el cuestionario')),
  })

  if (abierto) {
    return (
      <FormularioParticipante
        idCuestionario={abierto.id}
        nombre={abierto.nombre}
        onSalir={() => setAbierto(null)}
      />
    )
  }

  const pendientes = cuestionarios.filter((c) => c.contestableEnLinea)
  const cerrados = cuestionarios.filter((c) => !c.contestableEnLinea)
  const cargando = isLoading || cargandoDisponibles
  const vacio = cuestionarios.length === 0 && disponibles.length === 0

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Mis cuestionarios"
        subtitle="Puede contestarlos poco a poco: sus respuestas se guardan solas y puede volver cuando quiera."
      />

      {cargando ? (
        <div className="space-y-3">
          {[0, 1].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : vacio ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <ClipboardList className="size-8 text-muted-foreground" />
            <div className="max-w-md">
              <p className="font-medium">No hay cuestionarios para usted en este momento</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Puede ser que todavía no le hayan asignado ninguno, o que los que existen los
                tenga que aplicar el personal en su visita. Cuando haya uno disponible
                aparecerá aquí.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {pendientes.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">Por contestar</h2>
              {pendientes.map((c) => (
                <Card key={c.id}>
                  <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
                    <div className="min-w-0">
                      <CardTitle className="text-base">{c.nombre}</CardTitle>
                      {c.descripcion && (
                        <p className="mt-1 text-sm text-muted-foreground">{c.descripcion}</p>
                      )}
                      {c.fechaActualizacion && (
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          Lo dejó a medias el{' '}
                          {new Date(c.fechaActualizacion).toLocaleDateString('es-MX', {
                            day: 'numeric', month: 'long',
                          })}
                        </p>
                      )}
                    </div>
                    <Button onClick={() => setAbierto(c)}>
                      Continuar
                      <ChevronRight className="ml-1.5 size-4" />
                    </Button>
                  </CardHeader>
                </Card>
              ))}
            </section>
          )}

          {disponibles.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">Puede empezar</h2>
              {disponibles.map((d) => (
                <Card key={d.idTipoCuestionario}>
                  <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
                    <div className="min-w-0">
                      <CardTitle className="text-base">{d.nombre}</CardTitle>
                      {d.descripcion && (
                        <p className="mt-1 text-sm text-muted-foreground">{d.descripcion}</p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      disabled={iniciar.isPending}
                      onClick={() => iniciar.mutate(d.idTipoCuestionario)}
                    >
                      {iniciar.isPending && iniciar.variables === d.idTipoCuestionario
                        ? <Loader2 className="mr-1.5 size-4 animate-spin" />
                        : <Play className="mr-1.5 size-4" />}
                      Empezar
                    </Button>
                  </CardHeader>
                </Card>
              ))}
            </section>
          )}

          {cerrados.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">Ya enviados</h2>
              {cerrados.map((c) => (
                <Card key={c.id} className="opacity-80">
                  <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
                    <div className="flex min-w-0 items-center gap-3">
                      {c.estado === 'BORRADOR'
                        ? <FileText className="size-4 shrink-0 text-muted-foreground" />
                        : <Check className="size-4 shrink-0 text-emerald-600" />}
                      <div className="min-w-0">
                        <CardTitle className="text-sm">{c.nombre}</CardTitle>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {c.estado === 'BORRADOR'
                            ? 'Se capturó a partir de su hoja en papel.'
                            : 'Enviado. Gracias por su participación.'}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="shrink-0 gap-1">
                      <Lock className="size-3" />
                      No editable
                    </Badge>
                  </CardHeader>
                </Card>
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  )
}
