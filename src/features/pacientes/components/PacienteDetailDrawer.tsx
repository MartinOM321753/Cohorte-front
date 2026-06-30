import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CalendarPlus, Pencil } from 'lucide-react'
import { getFullName, formatDate } from '@/lib/utils'
import type { Paciente, TipoDocumentoPaciente } from '@/types/api'
import { CURP_REGEX } from '../schemas/paciente.schema'
import { useAuthStore } from '@/stores/authStore'
import { DocumentoUploader } from '@/features/documentos/components/DocumentoUploader'
import { DocumentoList } from '@/features/documentos/components/DocumentoList'
import { CrearEtiquetaButton } from '@/features/documentos/components/CrearEtiquetaButton'
import {
  useDocumentosPacienteTipo,
} from '@/features/documentos/hooks/useDocumentos'

interface PacienteDetailDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  paciente: Paciente | null
  onEdit: (paciente: Paciente) => void
  onSchedule: (paciente: Paciente) => void
}

interface DetailRowProps {
  label: string
  value?: string | null
  mono?: boolean
}

function DetailRow({ label, value, mono }: DetailRowProps) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-[var(--imss-ink-100)] py-2.5 last:border-0">
      <span className="text-[11px] font-medium uppercase tracking-widest text-[var(--imss-ink-300)]">
        {label}
      </span>
      <span
        className={`text-[13px] text-[var(--imss-ink-900)] ${mono ? 'font-mono text-[12px]' : ''}`}
      >
        {value || '—'}
      </span>
    </div>
  )
}

function CurpDetailRow({ curp }: { curp?: string | null }) {
  const valor = curp?.trim().toUpperCase()
  const esValido = valor ? CURP_REGEX.test(valor) : null

  return (
    <div className="flex flex-col gap-0.5 border-b border-[var(--imss-ink-100)] py-2.5 last:border-0">
      <span className="text-[11px] font-medium uppercase tracking-widest text-[var(--imss-ink-300)]">
        CURP
      </span>
      {!valor ? (
        <span className="text-[13px] text-[var(--imss-ink-900)]">—</span>
      ) : (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[12px] text-[var(--imss-ink-900)]">{valor}</span>
          {!esValido && (
            <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-600">
              Formato no válido
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Sub-panel de documentos por tipo ────────────────────────────────────────

function DocumentosPacientePanel({
  uuid,
  tipo,
  usuarioUUID,
  canDelete,
  emptyMessage,
}: {
  uuid: string
  tipo: TipoDocumentoPaciente
  usuarioUUID: string
  canDelete: boolean
  emptyMessage?: string
}) {
  const { data: docs = [], isLoading, isError } = useDocumentosPacienteTipo(uuid, tipo, { enabled: !!uuid })
  const permiteEtiquetaSinArchivo = tipo !== 'GENERAL'

  return (
    <div className="space-y-3">
      {permiteEtiquetaSinArchivo && (
        <CrearEtiquetaButton pacienteUUID={uuid} usuarioUUID={usuarioUUID} tipos={[tipo]} />
      )}
      <DocumentoUploader
        entidad="paciente"
        pacienteUUID={uuid}
        tipoDoc={tipo}
        usuarioUUID={usuarioUUID}
        accept="application/pdf,image/*,.doc,.docx"
        showDescripcion
      />
      <DocumentoList
        documentos={docs}
        isLoading={isLoading}
        isError={isError}
        canDelete={canDelete}
        emptyMessage={emptyMessage ?? 'Sin documentos registrados.'}
      />
    </div>
  )
}

// ─── Drawer principal ─────────────────────────────────────────────────────────

export function PacienteDetailDrawer({
  open,
  onOpenChange,
  paciente,
  onEdit,
  onSchedule,
}: PacienteDetailDrawerProps) {
  const userUuid = useAuthStore((s) => s.user?.uuid) || ''
  const isAdmin = useAuthStore((s) => s.hasRole('ADMINISTRADOR'))

  if (!paciente) return null

  const nombreCompleto = getFullName(paciente.persona)
  const uuid = paciente.uuid || ''

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-[440px]">
        {/* Header */}
        <SheetHeader className="border-b border-[var(--imss-ink-100)] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--imss-green-100)] text-[var(--imss-green-700)]">
              <span className="text-[14px] font-semibold">
                {nombreCompleto
                  .split(' ')
                  .slice(0, 2)
                  .map((n) => n.charAt(0))
                  .join('')
                  .toUpperCase()}
              </span>
            </div>
            <div>
              <SheetTitle className="text-[15px] font-semibold text-[var(--imss-ink-900)]">
                {nombreCompleto}
              </SheetTitle>
              <p className="text-[12px] text-[var(--imss-ink-300)]">Folio: {paciente.folio}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            {paciente.activo ? (
              <span className="inline-flex items-center rounded-full bg-[var(--status-success-bg)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--status-success-fg)]">
                Activo
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-[var(--status-danger-bg)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--status-danger-fg)]">
                Inactivo
              </span>
            )}
            {paciente.persona.sexo === 'M' ? (
              <span className="inline-flex items-center rounded-full bg-[var(--status-info-bg)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--status-info-fg)]">
                Masculino
              </span>
            ) : paciente.persona.sexo === 'F' ? (
              <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-[11px] font-medium text-purple-700">
                Femenino
              </span>
            ) : null}
          </div>
        </SheetHeader>

        {/* Contenido con tabs */}
        <div className="flex-1 overflow-y-auto">
          <Tabs defaultValue="datos" className="h-full">
            <TabsList className="w-full rounded-none border-b bg-transparent px-5 justify-start gap-4 h-10">
              <TabsTrigger
                value="datos"
                className="rounded-none border-b-2 border-transparent px-0 pb-1 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-[13px]"
              >
                Datos
              </TabsTrigger>
              <TabsTrigger
                value="consentimientos"
                className="rounded-none border-b-2 border-transparent px-0 pb-1 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-[13px]"
              >
                Consentimientos
              </TabsTrigger>
              <TabsTrigger
                value="cuestionarios"
                className="rounded-none border-b-2 border-transparent px-0 pb-1 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-[13px]"
              >
                Cuestionarios
              </TabsTrigger>
              <TabsTrigger
                value="documentos"
                className="rounded-none border-b-2 border-transparent px-0 pb-1 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-[13px]"
              >
                Documentos
              </TabsTrigger>
            </TabsList>

            {/* ── Tab Datos ── */}
            <TabsContent value="datos" className="px-5 py-4 space-y-5 mt-0">
              <section>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-[var(--imss-ink-300)]">
                  Datos personales
                </p>
                <div className="rounded-md border border-[var(--imss-ink-100)] px-3">
                  <DetailRow label="Nombre completo" value={nombreCompleto} />
                  <DetailRow
                    label="Fecha de nacimiento"
                    value={
                      paciente.persona.fechaNacimiento
                        ? new Date(paciente.persona.fechaNacimiento + 'T12:00:00').toLocaleDateString('es-MX', {
                            day: '2-digit', month: 'long', year: 'numeric',
                          })
                        : null
                    }
                  />
                  <CurpDetailRow curp={paciente.persona.curp} />
                  <DetailRow label="Correo electrónico" value={paciente.persona.email} />
                  <DetailRow label="Teléfono" value={paciente.persona.telefono} />
                </div>
              </section>

              <section>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-[var(--imss-ink-300)]">
                  Datos del expediente
                </p>
                <div className="rounded-md border border-[var(--imss-ink-100)] px-3">
                  <DetailRow label="Folio" value={paciente.folio} mono />
                  <DetailRow
                    label="Fecha de registro"
                    value={paciente.fechaRegistro ? formatDate(paciente.fechaRegistro, 'dd/MM/yyyy HH:mm') : null}
                  />
                  <DetailRow
                    label="Última actualización"
                    value={paciente.fechaActualizacion ? formatDate(paciente.fechaActualizacion, 'dd/MM/yyyy HH:mm') : null}
                  />
                </div>
              </section>
            </TabsContent>

            {/* ── Tab Consentimientos ── */}
            <TabsContent value="consentimientos" className="px-5 py-4 mt-0">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-[var(--imss-ink-300)]">
                Documentos de consentimiento informado
              </p>
              <DocumentosPacientePanel
                uuid={uuid}
                tipo="CONSENTIMIENTO"
                usuarioUUID={userUuid}
                canDelete={isAdmin}
                emptyMessage="Sin consentimientos registrados."
              />
            </TabsContent>

            {/* ── Tab Cuestionarios ── */}
            <TabsContent value="cuestionarios" className="px-5 py-4 mt-0 space-y-5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--imss-ink-300)]">
                Cuestionarios clínicos
              </p>
              {[
                { tipo: 'CUESTIONARIO_GENERAL' as const, label: 'Cuestionario general de la Cohorte' },
                { tipo: 'CUESTIONARIO_MINIMENTAL' as const, label: 'Minimental (>45 años)' },
                { tipo: 'CUESTIONARIO_AFLUENCIA_VERBAL' as const, label: 'Afluencia verbal (>45 años)' },
                { tipo: 'CUESTIONARIO_AGES' as const, label: 'AGES' },
              ].map(({ tipo, label }) => (
                <section key={tipo} className="space-y-2">
                  <p className="text-[12px] font-medium text-[var(--imss-ink-700)]">{label}</p>
                  <DocumentosPacientePanel
                    uuid={uuid}
                    tipo={tipo}
                    usuarioUUID={userUuid}
                    canDelete={isAdmin}
                    emptyMessage="Sin registro."
                  />
                </section>
              ))}
            </TabsContent>

            {/* ── Tab Documentos generales ── */}
            <TabsContent value="documentos" className="px-5 py-4 mt-0">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-[var(--imss-ink-300)]">
                Otros documentos del expediente
              </p>
              <DocumentosPacientePanel
                uuid={uuid}
                tipo="GENERAL"
                usuarioUUID={userUuid}
                canDelete={isAdmin}
                emptyMessage="Sin documentos generales."
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-2 border-t border-[var(--imss-ink-100)] px-5 py-3">
          <Button
            className="w-full gap-2 bg-[var(--imss-green-500)] text-white hover:bg-[var(--imss-green-700)] text-[13px]"
            onClick={() => { onOpenChange(false); onEdit(paciente) }}
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
            Editar participante
          </Button>
          <Button
            variant="outline"
            className="w-full gap-2 text-[13px]"
            onClick={() => { onOpenChange(false); onSchedule(paciente) }}
          >
            <CalendarPlus className="h-3.5 w-3.5" strokeWidth={1.75} />
            Agendar cita
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
