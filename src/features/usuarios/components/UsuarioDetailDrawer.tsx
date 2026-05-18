import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Pencil } from 'lucide-react'
import { type Usuario, getNombreCompleto, getRolBadgeClass } from '../types/usuario.types'

interface UsuarioDetailDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  usuario: Usuario | null
  onEdit: (usuario: Usuario) => void
}

interface DetailRowProps {
  label: string
  value?: string | null
}

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 border-b border-[var(--imss-ink-100)] last:border-0">
      <span className="text-[11px] font-medium uppercase tracking-widest text-[var(--imss-ink-300)]">
        {label}
      </span>
      <span className="text-[13px] text-[var(--imss-ink-900)]">{value || '—'}</span>
    </div>
  )
}

export function UsuarioDetailDrawer({
  open,
  onOpenChange,
  usuario,
  onEdit,
}: UsuarioDetailDrawerProps) {
  if (!usuario) return null

  const rolNombre = usuario.rol?.nombre ?? '—'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-[400px]">
        {/* Header */}
        <SheetHeader className="border-b border-[var(--imss-ink-100)] px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Avatar con iniciales */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--imss-green-100)] text-[var(--imss-green-700)]">
                <span className="text-[14px] font-semibold">
                  {getNombreCompleto(usuario.persona)
                    .split(' ')
                    .slice(0, 2)
                    .map((n) => n.charAt(0))
                    .join('')
                    .toUpperCase()}
                </span>
              </div>
              <div>
                <SheetTitle className="text-[15px] font-semibold text-[var(--imss-ink-900)]">
                  {getNombreCompleto(usuario.persona)}
                </SheetTitle>
                <p className="text-[12px] text-[var(--imss-ink-300)]">@{usuario.username}</p>
              </div>
            </div>
          </div>

          {/* Badges de rol y estado */}
          <div className="flex items-center gap-2 pt-1">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${getRolBadgeClass(rolNombre)}`}
            >
              {rolNombre}
            </span>
            {usuario.activo ? (
              <span className="inline-flex items-center rounded-full bg-[var(--status-success-bg)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--status-success-fg)]">
                Activo
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-[var(--status-danger-bg)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--status-danger-fg)]">
                Inactivo
              </span>
            )}
          </div>
        </SheetHeader>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Sección: Datos personales */}
          <section>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-[var(--imss-ink-300)]">
              Datos personales
            </p>
            <div className="rounded-md border border-[var(--imss-ink-100)] px-3">
              <DetailRow label="Nombre completo" value={getNombreCompleto(usuario.persona)} />
              <DetailRow
                label="Fecha de nacimiento"
                value={
                  usuario.persona.fechaNacimiento
                    ? new Date(usuario.persona.fechaNacimiento + 'T12:00:00').toLocaleDateString(
                        'es-MX',
                        { day: '2-digit', month: 'long', year: 'numeric' }
                      )
                    : null
                }
              />
              <DetailRow
                label="Sexo"
                value={
                  usuario.persona.sexo === 'M'
                    ? 'Masculino'
                    : usuario.persona.sexo === 'F'
                      ? 'Femenino'
                      : null
                }
              />
              <DetailRow label="Correo electrónico" value={usuario.persona.email} />
              <DetailRow label="Teléfono" value={usuario.persona.telefono} />
            </div>
          </section>

          {/* Sección: Datos del sistema */}
          <section>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-[var(--imss-ink-300)]">
              Datos del sistema
            </p>
            <div className="rounded-md border border-[var(--imss-ink-100)] px-3">
              <DetailRow label="Usuario" value={`@${usuario.username}`} />
              <DetailRow label="Rol asignado" value={rolNombre} />

            </div>
          </section>
        </div>

        {/* Footer con acción de editar */}
        <div className="border-t border-[var(--imss-ink-100)] px-5 py-3">
          <Button
            className="w-full gap-2 bg-[var(--imss-green-500)] text-white hover:bg-[var(--imss-green-700)] text-[13px]"
            onClick={() => {
              onOpenChange(false)
              onEdit(usuario)
            }}
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
            Editar usuario
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
