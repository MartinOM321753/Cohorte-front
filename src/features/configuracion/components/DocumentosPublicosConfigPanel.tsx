import { useRef, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  FileUp, Pencil, Plus, Trash2, Tag, Eye,
} from 'lucide-react'
import {
  useDocumentosPublicosAdmin,
  useUploadDocumentoPublico,
  useUpdateDocumentoPublico,
  useDeleteDocumentoPublico,
  useCategoriasDocPublico,
  useCreateCategoriaDocPublico,
  useUpdateCategoriaDocPublico,
  useToggleCategoriaDocPublico,
} from '../hooks/useDocumentosPublicos'
import { useAuthStore } from '@/stores/authStore'
import type { DocumentoPublicoDTO, DocumentoPublicoRequest, CategoriaDocumentoPublicoDTO } from '../api/documentosPublicos.api'

const INITIAL_FORM: DocumentoPublicoRequest = {
  fechaPublicacion: new Date().toISOString().slice(0, 10),
  nombreMostrar: '',
  fase: '',
  descripcion: '',
  categoriaId: null,
  autor: '',
}

export default function DocumentosPublicosConfigPanel() {
  const { user } = useAuthStore()
  const { data: docs, isLoading } = useDocumentosPublicosAdmin()
  const { data: categorias } = useCategoriasDocPublico()
  const uploadMut = useUploadDocumentoPublico()
  const updateMut = useUpdateDocumentoPublico()
  const deleteMut = useDeleteDocumentoPublico()

  const [showUpload, setShowUpload] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showCategorias, setShowCategorias] = useState(false)
  const [editingDoc, setEditingDoc] = useState<DocumentoPublicoDTO | null>(null)
  const [form, setForm] = useState<DocumentoPublicoRequest>(INITIAL_FORM)
  const [file, setFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function openUpload() {
    setForm(INITIAL_FORM)
    setFile(null)
    setShowUpload(true)
  }

  function openEdit(doc: DocumentoPublicoDTO) {
    setEditingDoc(doc)
    setForm({
      fechaPublicacion: doc.fechaPublicacion,
      nombreMostrar: doc.nombreMostrar ?? '',
      fase: doc.fase ?? '',
      descripcion: doc.descripcion ?? '',
      categoriaId: doc.categoriaId,
      autor: doc.autor ?? '',
    })
    setShowEdit(true)
  }

  function handleUpload() {
    if (!file || !user) return
    uploadMut.mutate(
      { file, data: form, usuarioUUID: user.uuid },
      { onSuccess: () => { setShowUpload(false); setFile(null) } },
    )
  }

  function handleUpdate() {
    if (!editingDoc) return
    updateMut.mutate(
      { id: editingDoc.id, data: form },
      { onSuccess: () => setShowEdit(false) },
    )
  }

  function displayName(doc: DocumentoPublicoDTO) {
    return doc.nombreMostrar || doc.nombreOriginal
  }

  function formatBytes(bytes: number | null) {
    if (!bytes) return '—'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formFields = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 @sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Nombre a mostrar</Label>
          <Input
            placeholder="Dejar vacío para usar el nombre del archivo"
            value={form.nombreMostrar}
            onChange={e => setForm(f => ({ ...f, nombreMostrar: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Fecha de publicación *</Label>
          <Input
            type="date"
            value={form.fechaPublicacion}
            onChange={e => setForm(f => ({ ...f, fechaPublicacion: e.target.value }))}
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 @sm:grid-cols-3">
        <div className="space-y-2">
          <Label>Fase</Label>
          <Input
            placeholder="Ej: Fase 1"
            value={form.fase}
            onChange={e => setForm(f => ({ ...f, fase: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Categoría</Label>
          <Select
            value={form.categoriaId ? String(form.categoriaId) : 'none'}
            onValueChange={v => setForm(f => ({ ...f, categoriaId: v === 'none' ? null : Number(v) }))}
          >
            <SelectTrigger><SelectValue placeholder="Sin categoría" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin categoría</SelectItem>
              {categorias?.filter(c => c.activo).map(c => (
                <SelectItem key={c.id} value={String(c.id)}>{c.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Autor</Label>
          <Input
            placeholder="Nombre del autor"
            value={form.autor}
            onChange={e => setForm(f => ({ ...f, autor: e.target.value }))}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Descripción</Label>
        <Textarea
          placeholder="Descripción del documento"
          value={form.descripcion}
          onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
          rows={2}
        />
      </div>
    </div>
  )

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>Documentos Públicos</CardTitle>
            <CardDescription>
              Documentos visibles en la página pública de la cohorte sin necesidad de iniciar sesión
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowCategorias(true)}>
              <Tag className="mr-2 h-4 w-4" /> Categorías
            </Button>
            <Button size="sm" onClick={openUpload}>
              <Plus className="mr-2 h-4 w-4" /> Publicar documento
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Spinner className="h-6 w-6" /></div>
          ) : !docs?.length ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay documentos publicados. Use el botón "Publicar documento" para agregar el primero.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Fase</TableHead>
                  <TableHead>Fecha publicación</TableHead>
                  <TableHead>Tamaño</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {docs.map(doc => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{displayName(doc)}</TableCell>
                    <TableCell>{doc.categoriaNombre ?? '—'}</TableCell>
                    <TableCell>{doc.fase ?? '—'}</TableCell>
                    <TableCell>{doc.fechaPublicacion}</TableCell>
                    <TableCell>{formatBytes(doc.tamanioBytes)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={doc.activo ? 'default' : 'secondary'}>
                        {doc.activo ? 'Publicado' : 'Eliminado'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(doc)} title="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {doc.activo && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMut.mutate(doc.id)}
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Upload dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Publicar Documento</DialogTitle>
            <DialogDescription>
              Suba un archivo y complete los datos. Solo la fecha de publicación es obligatoria.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Archivo *</Label>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                  <FileUp className="mr-2 h-4 w-4" /> Seleccionar archivo
                </Button>
                <span className="text-sm text-muted-foreground truncate">
                  {file?.name ?? 'Ningún archivo seleccionado'}
                </span>
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  onChange={e => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>
            {formFields}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpload(false)}>Cancelar</Button>
            <Button
              onClick={handleUpload}
              disabled={!file || !form.fechaPublicacion || uploadMut.isPending}
            >
              {uploadMut.isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Publicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Documento</DialogTitle>
            <DialogDescription>Modifique los datos del documento publicado.</DialogDescription>
          </DialogHeader>
          {formFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>Cancelar</Button>
            <Button onClick={handleUpdate} disabled={!form.fechaPublicacion || updateMut.isPending}>
              {updateMut.isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Categorías dialog */}
      <CategoriasDialog open={showCategorias} onOpenChange={setShowCategorias} />
    </>
  )
}

// ─── Categorías Dialog ──────────────────────────────────────────────────────

function CategoriasDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { data: categorias, isLoading } = useCategoriasDocPublico()
  const createMut = useCreateCategoriaDocPublico()
  const updateMut = useUpdateCategoriaDocPublico()
  const toggleMut = useToggleCategoriaDocPublico()

  const [nombre, setNombre] = useState('')
  const [editId, setEditId] = useState<number | null>(null)
  const [editNombre, setEditNombre] = useState('')

  function handleCreate() {
    if (!nombre.trim()) return
    createMut.mutate(nombre.trim(), { onSuccess: () => setNombre('') })
  }

  function startEdit(cat: CategoriaDocumentoPublicoDTO) {
    setEditId(cat.id)
    setEditNombre(cat.nombre)
  }

  function handleUpdate() {
    if (editId == null || !editNombre.trim()) return
    updateMut.mutate(
      { id: editId, nombre: editNombre.trim() },
      { onSuccess: () => setEditId(null) },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Categorías de Documentos Públicos</DialogTitle>
          <DialogDescription>Cree y administre categorías para organizar los documentos.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Nueva categoría"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
            />
            <Button size="sm" onClick={handleCreate} disabled={createMut.isPending || !nombre.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {isLoading ? (
            <div className="flex justify-center py-4"><Spinner className="h-5 w-5" /></div>
          ) : (
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {categorias?.map(cat => (
                <div key={cat.id} className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-muted">
                  {editId === cat.id ? (
                    <div className="flex gap-2 flex-1">
                      <Input
                        value={editNombre}
                        onChange={e => setEditNombre(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleUpdate()}
                        className="h-7 text-sm"
                      />
                      <Button size="sm" variant="outline" className="h-7" onClick={handleUpdate}>
                        Guardar
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7" onClick={() => setEditId(null)}>
                        ×
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span className={`text-sm ${!cat.activo ? 'text-muted-foreground line-through' : ''}`}>
                        {cat.nombre}
                      </span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(cat)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleMut.mutate(cat.id)}>
                          <Eye className={`h-3 w-3 ${!cat.activo ? 'text-muted-foreground' : ''}`} />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {!categorias?.length && (
                <p className="text-sm text-muted-foreground text-center py-2">Sin categorías</p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
