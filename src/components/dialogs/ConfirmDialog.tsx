import type { ReactNode } from 'react'
import { Trash2 } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: ReactNode
  actionLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean

  pacienteFolio?: string
  pacienteNombre?: string
}

export function ConfirmDialog({
  open,
  title,
  description,
  actionLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = false,
  onConfirm,
  onCancel,
  isLoading = false,
  pacienteFolio,
  pacienteNombre,
}: ConfirmDialogProps) {
  const usesPacienteCopy = Boolean(destructive && pacienteFolio && pacienteNombre)

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onCancel()}>
      <DialogContent className="max-w-md p-0">
        <div className="p-6">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription asChild>
              <div className="text-sm text-muted-foreground">
                {usesPacienteCopy ? (
                  <>
                    ¿Eliminar al participante{' '}
                    <span className="font-mono">{pacienteFolio}</span>
                    {' · '}
                    <span className="font-medium">{pacienteNombre}</span>? Esta
                    acción no se puede deshacer y cancelará sus citas y estudios
                    pendientes.
                  </>
                ) : (
                  description
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="border-t border-border bg-[--imss-paper] px-6 py-3">
          <DialogFooter>
            <Button variant="ghost" onClick={onCancel} disabled={isLoading}>
              {cancelLabel}
            </Button>
            <Button
              variant={destructive ? 'destructive' : 'default'}
              onClick={onConfirm}
              disabled={isLoading}
            >
              {destructive ? <Trash2 className="mr-2 size-4" /> : null}
              {isLoading ? <Spinner className="mr-2 h-4 w-4" /> : null}
              {actionLabel}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
