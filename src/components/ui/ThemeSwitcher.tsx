import { Check, Palette } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { useThemeStore, THEMES } from '@/stores/themeStore'

/**
 * Dropdown en la barra superior para seleccionar entre los 6 temas de la interfaz.
 * Muestra swatches de color y el nombre/descripción de cada tema.
 */
export function ThemeSwitcher() {
  const { theme, setTheme } = useThemeStore()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          aria-label="Cambiar tema"
          title="Tema de la interfaz"
        >
          <Palette className="h-4 w-4" strokeWidth={1.75} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs uppercase tracking-wide text-muted-foreground">
          Tema de la interfaz
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {THEMES.map(t => (
          <DropdownMenuItem
            key={t.id}
            onSelect={() => setTheme(t.id)}
            className="flex items-center gap-3 py-2 cursor-pointer"
          >
            {/* Swatches */}
            <span className="flex h-7 w-12 overflow-hidden rounded-md border border-border shrink-0">
              {t.swatches.map((c, i) => (
                <span key={i} className="flex-1" style={{ background: c }} />
              ))}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-medium leading-tight">{t.name}</span>
              <span className="block text-xs text-muted-foreground leading-tight">{t.description}</span>
            </span>
            {theme === t.id && (
              <Check className="h-4 w-4 text-primary shrink-0" strokeWidth={2} />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
