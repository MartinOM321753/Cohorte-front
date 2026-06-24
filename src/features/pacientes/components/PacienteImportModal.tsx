import { useCallback, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { importarPacientes } from '../api/pacientes.api'
import { toast } from 'sonner'
import { Upload, FileSpreadsheet, Mail, X } from 'lucide-react'

interface PacienteImportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const COLUMNAS = [
  { nombre: 'folio', obligatorio: false, desc: 'Folio (vacío = auto)' },
  { nombre: 'nombre', obligatorio: true, desc: 'Nombre(s)' },
  { nombre: 'apellidoPaterno', obligatorio: true, desc: 'Apellido paterno' },
  { nombre: 'apellidoMaterno', obligatorio: false, desc: 'Apellido materno' },
  { nombre: 'curp', obligatorio: false, desc: 'CURP (18 caracteres)' },
  { nombre: 'fechaNacimiento', obligatorio: false, desc: 'Fecha de nacimiento (AAAA-MM-DD)' },
  { nombre: 'sexo', obligatorio: false, desc: 'Sexo (M o F)' },
  { nombre: 'telefono', obligatorio: false, desc: 'Teléfono (10 dígitos)' },
  { nombre: 'email', obligatorio: false, desc: 'Correo electrónico' },
]

export function PacienteImportModal({ open, onOpenChange }: PacienteImportModalProps) {
  const [archivo, setArchivo] = useState<File | null>(null)
  const [enviado, setEnviado] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  const mutation = useMutation({
    mutationFn: (file: File) => importarPacientes(file),
    onSuccess: () => {
      setEnviado(true)
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message ?? 'Error al enviar el archivo')
    },
  })

  const handleClose = () => {
    setArchivo(null)
    setEnviado(false)
    onOpenChange(false)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files[0]
    if (file && validarArchivo(file)) {
      setArchivo(file)
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && validarArchivo(file)) {
      setArchivo(file)
    }
    e.target.value = ''
  }

  const validarArchivo = (file: File): boolean => {
    const extensiones = ['.csv', '.xlsx', '.xls']
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
    if (!extensiones.includes(ext)) {
      toast.error('Formato no soportado. Use CSV o Excel (.xlsx)')
      return false
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('El archivo no puede superar 10 MB')
      return false
    }
    return true
  }

  const handleImportar = () => {
    if (archivo) {
      mutation.mutate(archivo)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle className="text-[16px] font-semibold text-[var(--imss-ink-900)]">
            Importar participantes
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Columnas esperadas */}
          <div className="rounded-lg border border-[var(--imss-ink-100)] p-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--imss-ink-300)] mb-2">
              Columnas del archivo
            </p>
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
              {COLUMNAS.map((col) => (
                <div key={col.nombre} className="flex items-center gap-1.5 text-[12px]">
                  <span className={`font-mono ${col.obligatorio ? 'font-semibold text-[var(--imss-ink-900)]' : 'text-[var(--imss-ink-500)]'}`}>
                    {col.nombre}
                  </span>
                  {col.obligatorio && <span className="text-red-500 text-[10px]">*</span>}
                  <span className="text-[var(--imss-ink-300)] text-[10px]">— {col.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Drop zone */}
          {!enviado && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              className={`relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 transition-colors ${
                dragActive
                  ? 'border-[var(--imss-green-500)] bg-[var(--imss-green-500)]/5'
                  : 'border-[var(--imss-ink-200)] hover:border-[var(--imss-ink-300)]'
              }`}
            >
              {archivo ? (
                <>
                  <FileSpreadsheet className="h-8 w-8 text-[var(--imss-green-500)]" />
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium">{archivo.name}</span>
                    <button
                      type="button"
                      onClick={() => setArchivo(null)}
                      className="rounded-full p-0.5 hover:bg-[var(--imss-ink-100)]"
                    >
                      <X className="h-3.5 w-3.5 text-[var(--imss-ink-400)]" />
                    </button>
                  </div>
                  <span className="text-[11px] text-[var(--imss-ink-400)]">
                    {(archivo.size / 1024).toFixed(1)} KB
                  </span>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-[var(--imss-ink-300)]" />
                  <p className="text-[13px] text-[var(--imss-ink-500)]">
                    Arrastra un archivo aquí o{' '}
                    <label className="cursor-pointer text-[var(--imss-green-600)] underline">
                      selecciona uno
                      <input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        className="hidden"
                        onChange={handleFileSelect}
                      />
                    </label>
                  </p>
                  <p className="text-[11px] text-[var(--imss-ink-300)]">
                    CSV o Excel (.xlsx) — máximo 10 MB
                  </p>
                </>
              )}
            </div>
          )}

          {/* Confirmación de envío — el procesamiento corre en segundo plano */}
          {enviado && (
            <div className="flex flex-col items-center gap-2 rounded-lg bg-green-50 p-8 text-center">
              <Mail className="h-8 w-8 text-green-600" />
              <p className="text-[14px] font-medium text-green-700">Archivo recibido</p>
              <p className="text-[12px] text-green-600 max-w-[420px]">
                Se está procesando en segundo plano. Te llegará un correo con el resumen
                (importados, duplicados y errores) cuando termine.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="text-[13px]"
          >
            {enviado ? 'Cerrar' : 'Cancelar'}
          </Button>
          {!enviado && (
            <Button
              type="button"
              disabled={!archivo || mutation.isPending}
              onClick={handleImportar}
              className="bg-[var(--imss-green-500)] text-white hover:bg-[var(--imss-green-700)] text-[13px]"
            >
              {mutation.isPending ? 'Enviando...' : 'Importar'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
