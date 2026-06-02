import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { CalendarDays, ChevronRight, LayoutDashboard, Search, Settings, Stethoscope, TestTube2, UserRound } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { ThemeSwitcher } from '@/components/ui/ThemeSwitcher'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'

const routeLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  pacientes: 'Pacientes',
  estudios: 'Estudios médicos',
  citas: 'Citas',
  biobanco: 'Biobanco',
  catalogos: 'Catálogos',
  configuracion: 'Configuración',
  perfil: 'Mi perfil',
  login: 'Inicio de sesión',
  'mis-muestras': 'Mis Almacenes',
  expediente: 'Expediente',
}

// Regex para UUID v4 estándar (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function labelForSegment(segment: string) {
  // Nunca mostrar IDs numéricos ni UUIDs en el breadcrumb
  if (/^\d+$/.test(segment)) return null
  if (UUID_RE.test(segment)) return null
  return routeLabels[segment] ?? segment
}

export function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const [commandOpen, setCommandOpen] = useState(false)
  const { hasRole } = useAuthStore()
  const homeHref = hasRole('ENCARGADO') ? '/mis-muestras' : '/dashboard'

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'k') return
      if (!e.metaKey && !e.ctrlKey) return
      e.preventDefault()
      setCommandOpen(true)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const breadcrumbs = useMemo(() => {
    const segments = location.pathname.split('/').filter(Boolean)
    const items: Array<{ label: string; href?: string }> = [{ label: 'Inicio', href: homeHref }]

    let accPath = ''
    segments.forEach((seg, idx) => {
      accPath += `/${seg}`
      const label = labelForSegment(seg)
      if (label === null) return // skip numeric ID segments
      const isLast = idx === segments.length - 1
      items.push({
        label,
        href: isLast ? undefined : accPath,
      })
    })

    return items
  }, [location.pathname, homeHref])

  const commandItems = useMemo(
    () => [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Pacientes', href: '/pacientes', icon: UserRound },
      { label: 'Estudios médicos', href: '/estudios', icon: Stethoscope },
      { label: 'Citas', href: '/citas', icon: CalendarDays },
      { label: 'Biobanco', href: '/biobanco', icon: TestTube2 },
      { label: 'Configuración', href: '/configuracion', icon: Settings },
    ],
    []
  )

  return (
    <>
      <header className="flex h-14 items-center gap-4 border-b border-border bg-card px-6">
        <nav className="hidden min-w-0 items-center gap-2 text-[13px] md:flex">
          {breadcrumbs.map((item, idx) => {
            const isLast = idx === breadcrumbs.length - 1
            return (
              <div key={`${item.label}-${idx}`} className="flex min-w-0 items-center gap-2">
                {idx > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" strokeWidth={1.75} />}
                {isLast || !item.href ? (
                  <span className="truncate font-medium text-foreground">{item.label}</span>
                ) : (
                  <Link to={item.href} className="truncate text-muted-foreground hover:text-foreground">
                    {item.label}
                  </Link>
                )}
              </div>
            )
          })}
        </nav>

        <div className="flex-1" />

        <button
          type="button"
          onClick={() => setCommandOpen(true)}
          className="hidden h-8 w-[280px] items-center gap-2 rounded-md border border-border bg-[var(--muted)] px-3 text-left text-[13px] text-muted-foreground md:flex"
          aria-label="Buscar"
        >
          <Search className="h-3.5 w-3.5" strokeWidth={1.75} />
          <span className="flex-1 truncate">Buscar paciente, folio, estudio…</span>
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
            Ctrl K
          </kbd>
        </button>

        <ThemeSwitcher />
      </header>

      <CommandDialog
        open={commandOpen}
        onOpenChange={setCommandOpen}
        title="Búsqueda"
        description="Buscar acciones y navegación"
        className="sm:max-w-[560px]"
        showCloseButton={false}
      >
        <CommandInput placeholder="Buscar paciente, folio, estudio…" />
        <CommandList>
          <CommandEmpty>No hay resultados.</CommandEmpty>
          <CommandGroup heading="Navegación">
            {commandItems.map((item) => {
              const Icon = item.icon
              return (
                <CommandItem
                  key={item.href}
                  value={item.label}
                  onSelect={() => {
                    setCommandOpen(false)
                    navigate(item.href)
                  }}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                  {item.label}
                </CommandItem>
              )
            })}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
