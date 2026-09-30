import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuthStore, type UserRole } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  Users,
  FileText,
  Database,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  FlaskConical,
  CalendarDays,
} from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  roles?: UserRole[]
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Pacientes',
    href: '/pacientes',
    icon: Users,
  },
  {
    label: 'Estudios',
    href: '/estudios',
    icon: FileText,
  },
  {
    label: 'Citas',
    href: '/citas',
    icon: CalendarDays,
    roles: ['ADMINISTRADOR', 'MEDICO', 'RECEPCIONISTA'],
  },
  {
    label: 'Biobanco',
    href: '/biobanco',
    icon: FlaskConical,
    roles: ['ADMINISTRADOR', 'MEDICO'],
  },
  {
    label: 'Catálogos',
    href: '/catalogos',
    icon: Database,
    roles: ['ADMINISTRADOR'],
  },
  {
    label: 'Configuración',
    href: '/configuracion',
    icon: Settings,
    roles: ['ADMINISTRADOR'],
  },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const { user, logout, hasRole } = useAuthStore()

  const filteredNavItems = navItems.filter((item) => {
    if (!item.roles) return true
    if (!user) return false
    // Use hasRole to check if user has any of the required roles
    return hasRole(item.roles)
  })

  return (
    <aside
      className={cn(
        'flex flex-col border-r bg-card transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b px-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
              IM
            </div>
            <span className="font-semibold text-foreground">IMSS Cohorte</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {filteredNavItems.map((item) => {
          const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/')
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      <div className="border-t p-2">
        {user && !collapsed && (
          <div className="mb-2 px-3 py-2">
            <p className="text-sm font-medium text-foreground truncate">
              {user.persona?.nombre || user.username} {user.persona?.apellidoPaterno || ''}
            </p>
            <p className="text-xs text-muted-foreground truncate">{user.rol?.nombre || user.roles?.[0] || ''}</p>
          </div>
        )}
        <Button
          variant="ghost"
          className={cn('w-full justify-start gap-3', collapsed && 'justify-center px-0')}
          onClick={logout}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Cerrar sesión</span>}
        </Button>
      </div>
    </aside>
  )
}
