import { useMemo, useState } from 'react'
import type { ElementType } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuthStore, type UserRole } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Database,
  LayoutDashboard,
  LogOut,
  Microscope,
  Settings,
  Stethoscope,
  TestTube2,
  UserRound,
  UsersRound,
  CircleUserRound,
} from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: ElementType
  roles?: UserRole[]
  group: 'Clínico' | 'Biobanco' | 'Sistema'
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, group: 'Clínico' },
  { label: 'Pacientes', href: '/pacientes', icon: UserRound, group: 'Clínico' },
  { label: 'Estudios médicos', href: '/estudios', icon: Stethoscope, group: 'Clínico' },
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
    // Sin roles: visible para todos los usuarios autenticados
    group: 'Sistema',
  },
]

function ImssShield({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size * 1.08} viewBox="0 0 48 52" aria-hidden="true">
      <path d="M24 1 L46 7 V26 C46 38 36 47 24 51 C12 47 2 38 2 26 V7 Z" fill="#ffffff" />
      <path d="M24 6 L41 11 V26 C41 36 33 43 24 46 C15 43 7 36 7 26 V11 Z" fill="#a87b2c" />
      <path
        d="M24 14 L18 22 L13 20 L20 26 L13 30 L20 30 L17 38 L24 32 L31 38 L28 30 L35 30 L28 26 L35 20 L30 22 Z"
        fill="#1e4e3a"
      />
      <rect x="7" y="40" width="34" height="2.4" fill="#ffffff" />
    </svg>
  )
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const { user, logout, hasRole } = useAuthStore()
  const userRoleLabel = useMemo(() => {
    if (!user) return ''
    const knownRoles: UserRole[] = ['ADMINISTRADOR', 'MEDICO', 'RECEPCIONISTA', 'LABORATORISTA', 'PACIENTE']
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
        'flex flex-col border-r border-white/10 bg-[var(--imss-green-900)] text-white/80',
        collapsed ? 'w-16' : 'w-[248px]'
      )}
    >
      <div className="flex h-14 items-center justify-between border-b border-white/10 px-3">
        {!collapsed ? (
          <div className="flex min-w-0 items-center gap-3">
            <ImssShield size={32} />
            <div className="min-w-0">
              <div className="truncate text-[14px] font-semibold leading-none text-white">IMSS Cohorte</div>
              <div className="mt-1 truncate text-[10px] font-semibold uppercase tracking-[0.06em] text-white/60">
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
          className="h-8 w-8 text-white/70 hover:bg-white/10 hover:text-white"
          aria-label={collapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
          title={collapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <nav className="flex-1 overflow-auto py-2">
        {(['Clínico', 'Biobanco', 'Sistema'] as const).map((group) => {
          const items = groupedNavItems[group]
          if (items.length === 0) return null

          return (
            <div key={group} className="mb-2">
              {!collapsed && (
                <div className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.06em] text-white/40">
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
                      className={cn(
                        'flex items-center gap-[10px] rounded-[5px] px-[10px] py-2 text-[13px] font-medium text-white/78',
                        'hover:bg-white/6 hover:text-white',
                        isActive && 'bg-white/10 text-white shadow-[inset_2px_0_0_var(--imss-ochre-500)]'
                      )}
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

      <div className="border-t border-white/10 p-2">
        {user && !collapsed ? (
          <div className="flex items-center gap-3 rounded-md px-2 py-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--imss-green-700)] text-white">
              <span className="text-[13px] font-semibold">{initials}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium text-white">
                {user.nombreCompleto || user.username}
              </div>
              <div className="truncate text-[11px] text-white/60">{userRoleLabel}</div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/70 hover:bg-white/10 hover:text-white"
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
              'w-full justify-start gap-3 text-white/70 hover:bg-white/10 hover:text-white',
              collapsed && 'justify-center px-0'
            )}
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
