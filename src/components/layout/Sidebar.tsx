import React, { useEffect, useMemo, useState } from 'react'
import type { ElementType } from 'react'
import cohorteLogo from '../../assets/logo.png'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { useSidebarStore } from '@/stores/sidebarStore'
import { useIsMobile } from '@/hooks/use-mobile'
import { permisosFor } from '@/config/featurePermisos'
import { ROL_LABELS } from '@/features/usuarios/types/usuario.types'
import { Button } from '@/components/ui/button'
import {
  ArrowLeftRight,
  BarChart3,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  ClipboardList,
  Database,
  FlaskConical,
  Home,
  KeyRound,
  LogOut,
  Microscope,
  Network,
  Package,
  PackageCheck,
  PieChart,
  ScrollText,
  Settings,
  Shield,
  Stethoscope,
  TestTube2,
  Thermometer,
  Upload,
  UserCheck,
  UserRound,
  UsersRound,
  X,
  FileText,
} from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: ElementType
  /** El item aparece si el usuario tiene ALGUNO de estos permisos ACCEDER. */
  permisos?: string[]
  modulo?: string
  /**
   * Solo para cuentas con expediente de participante.
   *
   * El permiso no alcanza para decidirlo: `CUESTIONARIOS_AUTOCONTESTAR` lo tienen
   * tambien ROOT y ADMINISTRADOR, y a ellos la pantalla responde «esta cuenta no esta
   * vinculada a un expediente de participante». Ofrecer en el menu algo que no lleva a
   * ninguna parte es peor que no ofrecerlo.
   */
  soloParticipantes?: boolean
  group: 'Clínico' | 'Biobanco' | 'Sistema'
}

const navItems: NavItem[] = [
  { label: 'Inicio', href: '/dashboard', icon: Home, permisos: permisosFor('dashboard'), group: 'Clínico' },
  { label: 'Participantes', href: '/pacientes', icon: UserRound, permisos: permisosFor('pacientes'), modulo: 'PARTICIPANTES', group: 'Clínico' },
  { label: 'Estudios médicos', href: '/estudios', icon: Stethoscope, permisos: permisosFor('estudios'), modulo: 'ESTUDIOS_MEDICOS', group: 'Clínico' },
  {
    label: 'Exámenes',
    href: '/examenes',
    icon: Microscope,
    permisos: permisosFor('examenes'),
    modulo: 'EXAMENES',
    group: 'Clínico',
  },
  {
    label: 'Cuestionarios',
    href: '/cuestionarios',
    icon: ClipboardList,
    permisos: permisosFor('cuestionarios'),
    modulo: 'CUESTIONARIOS',
    group: 'Clínico',
  },
  {
    // Sin `modulo`: el aspecto que lo comprueba usa la institucion del USUARIO, y una
    // cuenta de participante puede no tener ninguna. El servidor ya comprueba el modulo
    // contra la sede de su expediente.
    label: 'Mis cuestionarios',
    href: '/mis-cuestionarios',
    icon: ClipboardList,
    permisos: permisosFor('misCuestionarios'),
    soloParticipantes: true,
    group: 'Clínico',
  },
  {
    label: 'Citas',
    href: '/citas',
    icon: CalendarDays,
    permisos: permisosFor('citas'),
    modulo: 'CITAS',
    group: 'Clínico',
  },
  {
    label: 'Cobertura',
    href: '/cobertura',
    icon: PieChart,
    permisos: permisosFor('cobertura'),
    modulo: 'COBERTURA',
    group: 'Clínico',
  },
  {
    label: 'Análisis',
    href: '/analisis',
    icon: BarChart3,
    permisos: permisosFor('analisis'),
    modulo: 'ANALISIS',
    group: 'Clínico',
  },
  {
    label: 'Usuarios',
    href: '/usuarios',
    icon: UsersRound,
    permisos: permisosFor('usuarios'),
    group: 'Sistema',
  },
  {
    label: 'Instituciones',
    href: '/instituciones',
    icon: Network,
    permisos: permisosFor('instituciones'),
    group: 'Sistema',
  },
  {
    label: 'Catálogos',
    href: '/catalogos',
    icon: Database,
    permisos: permisosFor('catalogos'),
    group: 'Sistema',
  },
  {
    label: 'Permisos',
    href: '/permisos',
    icon: Shield,
    permisos: permisosFor('permisos'),
    group: 'Sistema',
  },
  {
    label: 'Bitácora de accesos',
    href: '/bitacora/accesos',
    icon: KeyRound,
    permisos: permisosFor('bitacoraAccesos'),
    modulo: 'BITACORA_ACCESOS',
    group: 'Sistema',
  },
  {
    label: 'Bitácora de acciones',
    href: '/bitacora/acciones',
    icon: ClipboardList,
    permisos: permisosFor('bitacoraAcciones'),
    modulo: 'BITACORA_ACCIONES',
    group: 'Sistema',
  },
  {
    label: 'Reportes',
    href: '/reportes',
    icon: FileText,
    permisos: permisosFor('reportes'),
    modulo: 'REPORTES',
    group: 'Sistema',
  },
  {
    label: 'Configuración',
    href: '/configuracion',
    icon: Settings,
    permisos: permisosFor('configuracion'),
    group: 'Sistema',
  },
  {
    label: 'Mi perfil',
    href: '/perfil',
    icon: CircleUserRound,
    group: 'Sistema',
  },
]

/* ── Biobanco: sub-navegación expandible ──────────────────────────────── */

interface BiobancoSubItem {
  label: string
  href: string
  icon: ElementType
  permiso: string
}

interface BiobancoSubGroup {
  label: string
  items: BiobancoSubItem[]
}

const biobancoSubGroups: BiobancoSubGroup[] = [
  {
    label: 'Operación',
    items: [
      { label: 'Muestras', href: '/biobanco/muestras', icon: TestTube2, permiso: 'MUESTRAS_VER' },
      { label: 'Procesar', href: '/biobanco/procesar', icon: FlaskConical, permiso: 'MUESTRAS_CREAR' },
    ],
  },
  {
    label: 'Almacenamiento',
    items: [
      { label: 'Refrigeradores', href: '/biobanco/refrigeradores', icon: Thermometer, permiso: 'REFRIGERADORES_ACCEDER' },
      { label: 'Cajas criogénicas', href: '/biobanco/cajas', icon: Package, permiso: 'CAJAS_ACCEDER' },
    ],
  },
  {
    label: 'Movimientos',
    items: [
      { label: 'Préstamos', href: '/biobanco/prestamos', icon: ArrowLeftRight, permiso: 'TRASLADOS_ACCEDER' },
      { label: 'Entregas', href: '/biobanco/entregas', icon: PackageCheck, permiso: 'ENTREGAS_ACCEDER' },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { label: 'Protocolos', href: '/biobanco/protocolos', icon: ScrollText, permiso: 'PROTOCOLOS_ACCEDER' },
      { label: 'Est. Muestras', href: '/biobanco/est-muestras', icon: Microscope, permiso: 'ESTUDIOS_MUESTRA_ACCEDER' },
      { label: 'Colaboradores', href: '/biobanco/colaboradores', icon: UserCheck, permiso: 'COLABORADORES_ACCEDER' },
      { label: 'Carga masiva', href: '/biobanco/carga-masiva', icon: Upload, permiso: 'MUESTRAS_CARGA_MASIVA' },
    ],
  },
]

/* ── Componentes ──────────────────────────────────────────────────────── */

function ImssShield({ size = 62 }: { size?: number }) {
  return (
    <img
      src={cohorteLogo}
      alt="Cohorte de Trabajadores de la Salud"
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        filter: 'invert(1)',
        mixBlendMode: 'screen',
        flexShrink: 0,
      }}
    />
  )
}

export function Sidebar() {
  const isMobile = useIsMobile()
  const { collapsed, toggleCollapsed, mobileOpen, setMobileOpen } = useSidebarStore()
  const location = useLocation()
  const { user, logout, hasPermiso, modulosHabilitados, roles, esParticipante } = useAuthStore()

  const [biobancoOpen, setBiobancoOpen] = useState(false)
  const [collapsedSubGroups, setCollapsedSubGroups] = useState<Set<string>>(new Set())

  const isBiobancoRoute = location.pathname.startsWith('/biobanco')
  const biobancoModuleEnabled = modulosHabilitados.includes('BIOBANCO')

  useEffect(() => {
    if (isMobile) setMobileOpen(false)
  }, [location.pathname, isMobile, setMobileOpen])

  useEffect(() => {
    if (isBiobancoRoute && biobancoModuleEnabled) {
      setBiobancoOpen(true)
      const activeGroup = biobancoSubGroups.find(g =>
        g.items.some(item => location.pathname === item.href || location.pathname.startsWith(item.href + '/'))
      )
      if (activeGroup) {
        setCollapsedSubGroups(prev => {
          if (!prev.has(activeGroup.label)) return prev
          const next = new Set(prev)
          next.delete(activeGroup.label)
          return next
        })
      }
    }
  }, [location.pathname, isBiobancoRoute, biobancoModuleEnabled])

  const filteredBiobancoSubGroups = useMemo(() => {
    if (!biobancoModuleEnabled) return []
    return biobancoSubGroups
      .map(g => ({ ...g, items: g.items.filter(item => hasPermiso(item.permiso)) }))
      .filter(g => g.items.length > 0)
  }, [biobancoModuleEnabled, hasPermiso])

  const biobancoVisible = filteredBiobancoSubGroups.length > 0

  const toggleSubGroup = (label: string) => {
    setCollapsedSubGroups(prev => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  const userRoleLabel = useMemo(() => {
    if (roles.length > 0) return roles.map((r) => ROL_LABELS[r] || r).join(', ')
    if (!user) return ''
    const raw = typeof user.rol === 'string' ? user.rol : typeof (user.rol as any)?.nombre === 'string' ? (user.rol as any).nombre : ''
    return ROL_LABELS[raw] || raw
  }, [roles, user])

  const filteredNavItems = useMemo(() => {
    return navItems.filter((item) => {
      if (item.permisos && item.permisos.length > 0) {
        if (!user) return false
        if (!item.permisos.some((p) => hasPermiso(p))) return false
      }
      if (item.modulo && !modulosHabilitados.includes(item.modulo)) return false
      if (item.soloParticipantes && !esParticipante) return false
      return true
    })
  }, [modulosHabilitados, hasPermiso, user, esParticipante])

  const groupedNavItems = useMemo(() => {
    return filteredNavItems.reduce<Record<NavItem['group'], NavItem[]>>(
      (acc, item) => {
        acc[item.group].push(item)
        return acc
      },
      { Clínico: [], Biobanco: [], Sistema: [] }
    )
  }, [filteredNavItems])

  const initials = user
    ? (user.nombreCompleto || user.username)
        .split(' ')
        .slice(0, 2)
        .map((n) => n.charAt(0))
        .join('')
    : ''

  const effectiveCollapsed = isMobile ? false : collapsed

  const renderBiobancoNav = () => {
    if (!biobancoVisible) return null

    if (effectiveCollapsed) {
      return (
        <div key="biobanco" className="mb-2 px-2">
          <Link
            to="/biobanco"
            className="flex items-center justify-center rounded-[5px] py-2 transition-colors"
            style={{
              color: isBiobancoRoute ? 'var(--sidebar-fg)' : 'var(--sidebar-fg-dim)',
              background: isBiobancoRoute ? 'var(--sidebar-active-bg)' : undefined,
              boxShadow: isBiobancoRoute ? 'inset 2px 0 0 var(--sidebar-accent)' : undefined,
            } as React.CSSProperties}
            onMouseEnter={e => { if (!isBiobancoRoute) (e.currentTarget as HTMLElement).style.background = 'var(--sidebar-hover)' }}
            onMouseLeave={e => { if (!isBiobancoRoute) (e.currentTarget as HTMLElement).style.background = '' }}
            title="Biobanco"
          >
            <TestTube2 className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          </Link>
        </div>
      )
    }

    return (
      <div key="biobanco" className="mb-2">
        <button
          type="button"
          onClick={() => setBiobancoOpen(prev => !prev)}
          className="flex w-full items-center justify-between px-3 pb-1 pt-3"
          style={{ color: 'var(--sidebar-muted)' } as React.CSSProperties}
        >
          <span className="text-[10px] font-semibold uppercase tracking-[0.06em]">Biobanco</span>
          <ChevronDown
            className={cn('h-3 w-3 transition-transform duration-200', !biobancoOpen && '-rotate-90')}
            strokeWidth={1.75}
          />
        </button>

        {biobancoOpen && (
          <div className="px-2">
            {filteredBiobancoSubGroups.map(subGroup => {
              const isSubGroupCollapsed = collapsedSubGroups.has(subGroup.label)
              return (
                <div key={subGroup.label} className="mt-1">
                  <button
                    type="button"
                    onClick={() => toggleSubGroup(subGroup.label)}
                    className="flex w-full items-center gap-1.5 rounded-[3px] px-[10px] py-1"
                    style={{ color: 'var(--sidebar-muted)' } as React.CSSProperties}
                  >
                    <ChevronDown
                      className={cn('h-2.5 w-2.5 transition-transform duration-200', isSubGroupCollapsed && '-rotate-90')}
                      strokeWidth={2}
                    />
                    <span className="text-[9px] font-semibold uppercase tracking-[0.06em]">{subGroup.label}</span>
                  </button>

                  {!isSubGroupCollapsed && (
                    <div className="space-y-0.5">
                      {subGroup.items.map(item => {
                        const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/')
                        const Icon = item.icon
                        return (
                          <Link
                            key={item.href}
                            to={item.href}
                            className="flex items-center gap-[10px] rounded-[5px] py-1.5 text-[13px] font-medium transition-colors"
                            style={{
                              color: isActive ? 'var(--sidebar-fg)' : 'var(--sidebar-fg-dim)',
                              background: isActive ? 'var(--sidebar-active-bg)' : undefined,
                              boxShadow: isActive ? 'inset 2px 0 0 var(--sidebar-accent)' : undefined,
                              paddingLeft: 28,
                              paddingRight: 10,
                            } as React.CSSProperties}
                            onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--sidebar-hover)' }}
                            onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = '' }}
                            aria-current={isActive ? 'page' : undefined}
                          >
                            <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                            <span className="truncate">{item.label}</span>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  const sidebarContent = (
    <aside
      className={cn(
        'flex h-full flex-col border-r',
        isMobile ? 'w-[280px]' : collapsed ? 'w-16' : 'w-[248px]'
      )}
      style={{
        background: 'var(--sidebar-bg)',
        color: 'var(--sidebar-fg)',
        borderColor: 'var(--sidebar-border)',
      }}
    >
      <div className="flex h-14 items-center justify-between border-b px-3" style={{ borderColor: 'var(--sidebar-border)' }}>
        {!effectiveCollapsed ? (
          <div className="flex min-w-0 items-center gap-3">
            <ImssShield size={32} />
            <div className="min-w-0">
              <div className="truncate text-[14px] font-semibold leading-none" style={{ color: 'var(--sidebar-fg)' }}>Cohorte</div>
              <div className="mt-1 truncate text-[10px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--sidebar-muted)' }}>
                Investigación · v1.0
              </div>
            </div>
          </div>
        ) : (
          <ImssShield size={28} />
        )}

        {isMobile ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(false)}
            className="h-8 w-8 hover:opacity-100 opacity-70"
            style={{ color: 'var(--sidebar-fg)' } as React.CSSProperties}
            aria-label="Cerrar menú"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCollapsed}
            className="h-8 w-8 hover:opacity-100 opacity-70"
            style={{ color: 'var(--sidebar-fg)' } as React.CSSProperties}
            aria-label={collapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
            title={collapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-2 custom-scrollbar">
        {(['Clínico', 'Biobanco', 'Sistema'] as const).map((group) => {
          if (group === 'Biobanco') return renderBiobancoNav()

          const items = groupedNavItems[group]
          if (items.length === 0) return null

          return (
            <div key={group} className="mb-2">
              {!effectiveCollapsed && (
                <div className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.06em]"
                  style={{ color: 'var(--sidebar-muted)' }}>
                  {group}
                </div>
              )}
              <div className="space-y-1 px-2">
                {items.map((item) => {
                  const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/')
                  const Icon = item.icon

                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      className="flex items-center gap-[10px] rounded-[5px] px-[10px] py-2 text-[13px] font-medium transition-colors"
                      style={{
                        color: isActive ? 'var(--sidebar-fg)' : 'var(--sidebar-fg-dim)',
                        background: isActive ? 'var(--sidebar-active-bg)' : undefined,
                        boxShadow: isActive ? 'inset 2px 0 0 var(--sidebar-accent)' : undefined,
                      } as React.CSSProperties}
                      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--sidebar-hover)' }}
                      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = '' }}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                      {!effectiveCollapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      <div className="border-t p-2" style={{ borderColor: 'var(--sidebar-border)' }}>
        {user && !effectiveCollapsed ? (
          <div className="flex items-center gap-3 rounded-md px-2 py-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full"
              style={{ background: 'var(--sidebar-active-bg)', color: 'var(--sidebar-fg)' }}>
              <span className="text-[13px] font-semibold">{initials}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium" style={{ color: 'var(--sidebar-fg)' }}>
                {user.nombreCompleto || user.username}
              </div>
              <div className="truncate text-[11px]" style={{ color: 'var(--sidebar-muted)' }}>
                {userRoleLabel}
                {user.institucion?.nombre ? ` · ${user.institucion.nombre}` : ''}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-70 hover:opacity-100"
              style={{ color: 'var(--sidebar-fg)' } as React.CSSProperties}
              onClick={logout}
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.75} />
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            className={cn(
              'w-full justify-start gap-3 opacity-70 hover:opacity-100',
              effectiveCollapsed && 'justify-center px-0'
            )}
            style={{ color: 'var(--sidebar-fg)' } as React.CSSProperties}
            onClick={logout}
            title="Cerrar sesión"
          >
            <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            {!effectiveCollapsed && <span>Cerrar sesión</span>}
          </Button>
        )}
      </div>
    </aside>
  )

  if (isMobile) {
    return (
      <>
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
        )}
        <div
          className={cn(
            'fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out',
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          {sidebarContent}
        </div>
      </>
    )
  }

  return sidebarContent
}
