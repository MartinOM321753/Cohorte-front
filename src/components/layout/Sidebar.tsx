import React, { useMemo, useState } from 'react'
import type { ElementType } from 'react'
import cohorteLogo from '../../assets/logo.png'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuthStore, type UserRole } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ClipboardList,
  Database,
  LayoutDashboard,
  LogOut,
  Microscope,
  PieChart,
  Settings,
  Stethoscope,
  TestTube2,
  UserRound,
  UsersRound,
  CircleUserRound,
  Warehouse,
} from 'lucide-react'
import { useGetAlmacenesByEncargado } from '@/features/biobanco/hooks/useBiobanco'
import { useEncargadoStore } from '@/stores/encargadoStore'

interface NavItem {
  label: string
  href: string
  icon: ElementType
  roles?: UserRole[]
  group: 'Clínico' | 'Biobanco' | 'Sistema'
}

const navItems: NavItem[] = [
  { label: 'Inicio', href: '/dashboard', icon: LayoutDashboard, roles: ['ADMINISTRADOR', 'MEDICO', 'RECEPCIONISTA', 'LABORATORISTA', 'PACIENTE'], group: 'Clínico' },
  { label: 'Colaboradores', href: '/pacientes', icon: UserRound, roles: ['ADMINISTRADOR', 'RECEPCIONISTA'], group: 'Clínico' },
  { label: 'Estudios médicos', href: '/estudios', icon: Stethoscope, roles: ['ADMINISTRADOR', 'RECEPCIONISTA'], group: 'Clínico' },
  {
    label: 'Exámenes',
    href: '/examenes',
    icon: Microscope,
    roles: ['ADMINISTRADOR', 'MEDICO', 'LABORATORISTA'],
    group: 'Clínico',
  },
  {
    label: 'Citas',
    href: '/citas',
    icon: CalendarDays,
    roles: ['ADMINISTRADOR', 'MEDICO', 'RECEPCIONISTA'],
    group: 'Clínico',
  },
  {
    label: 'Cobertura',
    href: '/cobertura',
    icon: PieChart,
    roles: ['ADMINISTRADOR', 'MEDICO'],
    group: 'Clínico',
  },
  {
    label: 'Biobanco',
    href: '/biobanco',
    icon: TestTube2,
    roles: ['ADMINISTRADOR', 'MEDICO'],
    group: 'Biobanco',
  },
  {
    label: 'Usuarios',
    href: '/usuarios',
    icon: UsersRound,
    roles: ['ADMINISTRADOR'],
    group: 'Sistema',
  },
  {
    label: 'Catálogos',
    href: '/catalogos',
    icon: Database,
    roles: ['ADMINISTRADOR'],
    group: 'Sistema',
  },
  {
    label: 'Bitácora',
    href: '/bitacora',
    icon: ClipboardList,
    roles: ['ADMINISTRADOR'],
    group: 'Sistema',
  },
  {
    label: 'Configuración',
    href: '/configuracion',
    icon: Settings,
    roles: ['ADMINISTRADOR'],
    group: 'Sistema',
  },
  {
    label: 'Mi perfil',
    href: '/perfil',
    icon: CircleUserRound,
    group: 'Sistema',
  },
]

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

function EncargadoAlmacenesSection({ uuid, collapsed }: { uuid: string; collapsed: boolean }) {
  const [expanded, setExpanded] = useState(true)
  const location = useLocation()
  const { data: almacenes = [] } = useGetAlmacenesByEncargado(uuid)
  const { selectedAlmacenId, setSelectedAlmacen } = useEncargadoStore()

  if (collapsed) {
    return (
      <div className="mb-2">
        <div className="space-y-1 px-2">
          {almacenes.map((almacen) => {
            const isActive = location.pathname === '/mis-muestras' && selectedAlmacenId === almacen.id
            return (
              <Link
                key={almacen.id}
                to="/mis-muestras"
                title={almacen.nombre}
                onClick={() => setSelectedAlmacen(almacen.id)}
                className="flex items-center justify-center rounded-[5px] py-2 transition-colors"
                style={{
                  color: isActive ? 'var(--sidebar-fg)' : 'var(--sidebar-fg-dim)',
                  background: isActive ? 'var(--sidebar-active-bg)' : undefined,
                  boxShadow: isActive ? 'inset 2px 0 0 var(--sidebar-accent)' : undefined,
                } as React.CSSProperties}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--sidebar-hover)' }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = '' }}
                aria-current={isActive ? 'page' : undefined}
              >
                <Warehouse className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              </Link>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="mb-2">
      <div className="px-3 pb-1 pt-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-between text-[10px] font-semibold uppercase tracking-[0.06em] transition-colors hover:opacity-80"
          style={{ color: 'var(--sidebar-muted)' }}
        >
          <span>Mis Almacenes</span>
          {expanded
            ? <ChevronUp className="h-3 w-3" />
            : <ChevronDown className="h-3 w-3" />
          }
        </button>
      </div>

      {expanded && (
        <div className="space-y-1 px-2">
          {almacenes.length === 0 ? (
            <p className="px-[10px] py-1 text-[11px] italic" style={{ color: 'var(--sidebar-muted)' }}>Sin almacenes asignados</p>
          ) : (
            almacenes.map((almacen) => {
              const isActive = location.pathname === '/mis-muestras' && selectedAlmacenId === almacen.id
              return (
                <Link
                  key={almacen.id}
                  to="/mis-muestras"
                  onClick={() => setSelectedAlmacen(almacen.id)}
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
                  <Warehouse className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                  <span className="truncate">{almacen.nombre}</span>
                </Link>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const { user, logout, hasRole } = useAuthStore()
  const isEncargado = hasRole('ENCARGADO')

  const userRoleLabel = useMemo(() => {
    if (!user) return ''
    const knownRoles: UserRole[] = ['ADMINISTRADOR', 'MEDICO', 'RECEPCIONISTA', 'LABORATORISTA', 'PACIENTE', 'ENCARGADO']
    const normalized = knownRoles.find((r) => hasRole(r))
    if (normalized) return normalized
    return typeof user.rol === 'string' ? user.rol : typeof (user.rol as any)?.nombre === 'string' ? (user.rol as any).nombre : ''
  }, [hasRole, user])

  const filteredNavItems = useMemo(() => {
    return navItems.filter((item) => {
      if (!item.roles) return true
      if (!user) return false
      return hasRole(item.roles)
    })
  }, [hasRole, user])

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

  return (
    <aside
      className={cn(
        'flex flex-col border-r',
        collapsed ? 'w-16' : 'w-[248px]'
      )}
      style={{
        background: 'var(--sidebar-bg)',
        color: 'var(--sidebar-fg)',
        borderColor: 'var(--sidebar-border)',
      }}
    >
      <div className="flex h-14 items-center justify-between border-b px-3" style={{ borderColor: 'var(--sidebar-border)' }}>
        {!collapsed ? (
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

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8 hover:opacity-100 opacity-70"
          style={{ color: 'var(--sidebar-fg)' } as React.CSSProperties}
          aria-label={collapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
          title={collapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <nav className="flex-1 overflow-auto py-2">
        {(['Clínico', 'Biobanco', 'Sistema'] as const).map((group) => {
          const items = groupedNavItems[group]

          // For ENCARGADO: replace Biobanco group with the dynamic almacenes section
          if (group === 'Biobanco' && isEncargado) {
            return (
              <EncargadoAlmacenesSection
                key="encargado-almacenes"
                uuid={user?.uuid ?? ''}
                collapsed={collapsed}
              />
            )
          }

          if (items.length === 0) return null

          return (
            <div key={group} className="mb-2">
              {!collapsed && (
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
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      <div className="border-t p-2" style={{ borderColor: 'var(--sidebar-border)' }}>
        {user && !collapsed ? (
          <div className="flex items-center gap-3 rounded-md px-2 py-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full"
              style={{ background: 'var(--sidebar-active-bg)', color: 'var(--sidebar-fg)' }}>
              <span className="text-[13px] font-semibold">{initials}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium" style={{ color: 'var(--sidebar-fg)' }}>
                {user.nombreCompleto || user.username}
              </div>
              <div className="truncate text-[11px]" style={{ color: 'var(--sidebar-muted)' }}>{userRoleLabel}</div>
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
              collapsed && 'justify-center px-0'
            )}
            style={{ color: 'var(--sidebar-fg)' } as React.CSSProperties}
            onClick={logout}
            title="Cerrar sesión"
          >
            <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            {!collapsed && <span>Cerrar sesión</span>}
          </Button>
        )}
      </div>
    </aside>
  )
}
