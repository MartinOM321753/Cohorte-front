import { useMemo, useState } from 'react'
import { Plus, Edit, MapPin, Phone, User, AlertCircle, CheckCircle2, XCircle, Search, Network, ShieldCheck, Tag } from 'lucide-react'
import { useGetInstitucionesPaginado, useGetInstitucionesGestionables, useSearchInstituciones, useToggleInstitucion } from '../hooks/useInstituciones'
import { InstitucionFormModal } from './InstitucionFormModal'
import { InstitucionModulosModal } from './InstitucionModulosModal'
import { TiposInstitucionModal } from './TiposInstitucionModal'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Institucion } from '@/types/api'

const PAGE_SIZE = 9

export function InstitucionesTab() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingInstitucion, setEditingInstitucion] = useState<Institucion | null>(null)
  const [modulosInstitucion, setModulosInstitucion] = useState<Institucion | null>(null)
  const [isModulosOpen, setIsModulosOpen] = useState(false)
  const [isTiposOpen, setIsTiposOpen] = useState(false)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')

  const isSearching = search.trim().length > 0

  // Búsqueda server-side: debounce simple vía control directo del input + queryKey
  const paginado = useGetInstitucionesPaginado(page, PAGE_SIZE)
  const buscado = useSearchInstituciones(search, false, page, PAGE_SIZE, isSearching)

  const { data, isLoading } = isSearching ? buscado : paginado

  const toggleMutation = useToggleInstitucion()

  // IDs de instituciones que el usuario puede gestionar (encargado directo o ancestral + bootstrap)
  const { data: idsGestionables } = useGetInstitucionesGestionables()
  const gestionablesSet = useMemo(() => new Set(idsGestionables ?? []), [idsGestionables])

  const instituciones = useMemo(() => data?.content ?? [], [data])
  const totalPages = data?.totalPages ?? 0

  const handleEdit = (institucion: Institucion) => {
    setEditingInstitucion(institucion)
    setIsModalOpen(true)
  }

  const handleOpenModulos = (institucion: Institucion) => {
    setModulosInstitucion(institucion)
    setIsModulosOpen(true)
  }

  const handleModulosClose = () => {
    setIsModulosOpen(false)
    setModulosInstitucion(null)
  }

  const handleToggle = async (id: number) => {
    await toggleMutation.mutateAsync(id)
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setEditingInstitucion(null)
  }

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPage(0)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Instituciones</h2>
          <p className="text-muted-foreground">
            Catálogo central de instituciones (jerarquía, ubicación y módulos habilitados)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsTiposOpen(true)}>
            <Tag className="mr-2 h-4 w-4" />
            Tipos de institución
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Institución
          </Button>
        </div>
      </div>

      <Alert>
        <Network className="h-4 w-4" />
        <AlertDescription>
          Cada institución pertenece a una jerarquía (institución superior opcional) y define la
          ubicación, contacto y módulos disponibles para sus usuarios. Las instituciones inactivas
          conservan su historial pero no podrán operar en el sistema.
        </AlertDescription>
      </Alert>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar institución por nombre..."
          className="pl-8"
          value={search}
          onChange={e => handleSearchChange(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : instituciones.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {isSearching ? 'Sin resultados' : 'No hay instituciones registradas'}
            </h3>
            <p className="text-muted-foreground text-center mb-4">
              {isSearching
                ? 'No se encontraron instituciones con ese nombre.'
                : 'Registra la primera institución para comenzar a operar el sistema.'}
            </p>
            {!isSearching && (
              <Button onClick={() => setIsModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Registrar Primera Institución
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {instituciones.map((institucion) => (
              <Card key={institucion.id} className={`relative flex flex-col ${!institucion.activo ? 'opacity-60' : ''}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-tight">{institucion.nombre}</CardTitle>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge variant={institucion.activo ? 'default' : 'secondary'}>
                        {institucion.activo ? 'Activa' : 'Inactiva'}
                      </Badge>
                      {institucion.tipoInstitucion && (
                        <Badge variant="outline" className="text-[10px]">
                          {institucion.tipoInstitucion.nombre}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {institucion.institucionPadre && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Network className="h-3 w-3" />
                      Depende de <span className="font-medium text-foreground">{institucion.institucionPadre.nombre}</span>
                    </p>
                  )}
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
                  <div className="space-y-1.5 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span>{institucion.ciudad}, {institucion.estado}</span>
                    </div>
                    {institucion.direccion && (
                      <div className="flex items-start gap-2 text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 opacity-0" />
                        <span className="text-xs">{institucion.direccion}</span>
                      </div>
                    )}
                    {institucion.latitud != null && institucion.longitud != null && (
                      <a
                        href={`https://www.google.com/maps?q=${institucion.latitud},${institucion.longitud}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary underline underline-offset-2 ml-5"
                      >
                        Ver en el mapa
                      </a>
                    )}
                    {institucion.responsable && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="h-3.5 w-3.5 shrink-0" />
                        <span>{institucion.responsable}</span>
                      </div>
                    )}
                    {institucion.telefono && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        <span>{institucion.telefono}</span>
                      </div>
                    )}
                    {institucion.tieneBiobanco && (
                      <Badge variant="outline" className="text-[10px]">Biobanco habilitado</Badge>
                    )}
                    {institucion.encargado && (
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t">
                        <User className="h-3.5 w-3.5 shrink-0 text-primary" />
                        <div>
                          <span className="text-xs font-medium text-foreground">
                            {institucion.encargado.nombreCompleto}
                          </span>
                          <span className="text-xs text-muted-foreground ml-1">
                            · @{institucion.encargado.username}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>

                <CardFooter className="flex flex-col gap-2 pt-3 border-t">
                  {!gestionablesSet.has(institucion.id) && (
                    <p className="text-xs text-muted-foreground w-full text-center">
                      Solo el encargado de esta institución o de su institución superior puede gestionarla.
                    </p>
                  )}
                  <div className="flex gap-2 w-full">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(institucion)}
                      disabled={!gestionablesSet.has(institucion.id)}
                      className="flex-1"
                    >
                      <Edit className="mr-1 h-3 w-3" />
                      Editar
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenModulos(institucion)}
                      disabled={!gestionablesSet.has(institucion.id)}
                      title="Configurar módulos habilitados (permisos estilo ERP)"
                    >
                      <ShieldCheck className="h-4 w-4" />
                    </Button>

                    {institucion.activo ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!gestionablesSet.has(institucion.id)}
                            className="text-destructive border-destructive/30 hover:bg-destructive/5 hover:text-destructive"
                            title="Desactivar institución"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Desactivar institución?</AlertDialogTitle>
                            <AlertDialogDescription>
                              La institución <strong>{institucion.nombre}</strong> quedará inactiva y no podrá operar en
                              el sistema. Su historial se conserva y puede reactivarse más adelante.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleToggle(institucion.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Desactivar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!gestionablesSet.has(institucion.id)}
                            className="text-green-700 border-green-300 hover:bg-green-50 hover:text-green-800"
                            title="Activar institución"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Activar institución?</AlertDialogTitle>
                            <AlertDialogDescription>
                              La institución <strong>{institucion.nombre}</strong> volverá a estar disponible para operar
                              en el sistema.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleToggle(institucion.id)}
                              className="bg-green-600 text-white hover:bg-green-700"
                            >
                              Activar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button variant="outline" size="sm" disabled={page <= 0} onClick={() => setPage(p => Math.max(0, p - 1))}>
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {page + 1} de {totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                Siguiente
              </Button>
            </div>
          )}
        </>
      )}

      <InstitucionFormModal
        open={isModalOpen}
        onOpenChange={handleModalClose}
        institucion={editingInstitucion}
      />

      <InstitucionModulosModal
        open={isModulosOpen}
        onOpenChange={(open) => { if (!open) handleModulosClose(); else setIsModulosOpen(true) }}
        institucion={modulosInstitucion}
      />

      <TiposInstitucionModal open={isTiposOpen} onOpenChange={setIsTiposOpen} />
    </div>
  )
}
