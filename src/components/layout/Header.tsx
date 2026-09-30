import { useLocation } from 'react-router-dom'
import { Bell, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuthStore } from '@/stores/authStore'

const routeTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/pacientes': 'Pacientes',
  '/estudios': 'Estudios Médicos',
  '/biobanco': 'Biobanco',
  '/catalogos': 'Catálogos',
  '/configuracion': 'Configuración',
}

export function Header() {
  const location = useLocation()
  const { user } = useAuthStore()

  const title = routeTitles[location.pathname] || 'IMSS Cohorte'
  const initials = user
    ? `${(user.persona?.nombre || user.username).charAt(0)}${(user.persona?.apellidoPaterno || '').charAt(0)}`
    : 'US'

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar paciente..."
            className="w-64 pl-9"
          />
        </div>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive" />
        </Button>

        {/* User avatar */}
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary text-primary-foreground text-sm">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
