import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FileText, AlertCircle, Clock, ShieldAlert, ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuthStore } from '@/stores/authStore'
import {
  generarTokenAcceso,
  getInfoPorEtiqueta,
  buildDocumentoViewUrl,
  type DocumentoEtiquetaInfo,
} from '../api/documentos.api'

type ViewState =
  | { status: 'loading' }
  | { status: 'unauthorized'; reason: string }
  | { status: 'expired' }
  | { status: 'error'; message: string }
  | { status: 'ready'; info: DocumentoEtiquetaInfo; viewUrl: string; expiresAt: Date }

export default function DocumentoViewPage() {
  const { etiqueta } = useParams<{ etiqueta: string }>()
  const navigate = useNavigate()
  const { isAuthenticated, user, hasRole, isLoading: authLoading } = useAuthStore()
  const [state, setState] = useState<ViewState>({ status: 'loading' })

  const iniciarVisualizacion = useCallback(async () => {
    if (!etiqueta) {
      setState({ status: 'error', message: 'No se proporcionó una etiqueta válida.' })
      return
    }

    if (!hasRole('ADMINISTRADOR')) {
      setState({
        status: 'unauthorized',
        reason: 'Solo usuarios con rol ADMINISTRADOR pueden visualizar documentos escaneados.',
      })
      return
    }

    try {
      const [info, tokenData] = await Promise.all([
        getInfoPorEtiqueta(etiqueta),
        generarTokenAcceso(etiqueta),
      ])

      const viewUrl = buildDocumentoViewUrl(tokenData.token)
      const expiresAt = new Date(tokenData.expiresAt)

      setState({ status: 'ready', info, viewUrl, expiresAt })
    } catch (err: any) {
      const status = err?.response?.status
      const msg =
        err?.response?.data?.message ??
        (err instanceof Error ? err.message : 'Error desconocido')

      if (status === 403) {
        setState({
          status: 'unauthorized',
          reason: msg || 'No tiene permiso para acceder a este documento.',
        })
      } else if (status === 404) {
        setState({ status: 'error', message: 'No se encontró un documento con esta etiqueta.' })
      } else {
        setState({ status: 'error', message: msg })
      }
    }
  }, [etiqueta, hasRole])

  useEffect(() => {
    if (authLoading) return
    if (!isAuthenticated || !user) return
    iniciarVisualizacion()
  }, [authLoading, isAuthenticated, user, iniciarVisualizacion])

  useEffect(() => {
    if (state.status !== 'ready') return
    const remaining = state.expiresAt.getTime() - Date.now()
    if (remaining <= 0) {
      setState({ status: 'expired' })
      return
    }
    const timer = setTimeout(() => setState({ status: 'expired' }), remaining)
    return () => clearTimeout(timer)
  }, [state])

  if (authLoading || (!isAuthenticated && !authLoading)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-4 py-3">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <FileText className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold truncate">Visualización de documento</h1>
            {etiqueta && (
              <Badge variant="outline" className="mt-0.5 font-mono text-[11px]">
                {etiqueta}
              </Badge>
            )}
          </div>
          {state.status === 'ready' && (
            <ExpiryBadge expiresAt={state.expiresAt} />
          )}
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-5xl p-4">
        {state.status === 'loading' && (
          <div className="flex flex-col items-center gap-3 py-20">
            <Spinner className="h-8 w-8" />
            <p className="text-sm text-muted-foreground">Validando acceso al documento…</p>
          </div>
        )}

        {state.status === 'unauthorized' && (
          <Alert variant="destructive" className="max-w-lg mx-auto mt-10">
            <ShieldAlert className="h-4 w-4" />
            <AlertDescription>{state.reason}</AlertDescription>
          </Alert>
        )}

        {state.status === 'expired' && (
          <div className="flex flex-col items-center gap-4 py-20">
            <Clock className="h-10 w-10 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">Enlace expirado</p>
              <p className="text-sm text-muted-foreground mt-1">
                El enlace de visualización ha expirado (válido por 5 minutos).
              </p>
            </div>
            <Button onClick={iniciarVisualizacion}>Generar nuevo enlace</Button>
          </div>
        )}

        {state.status === 'error' && (
          <Alert variant="destructive" className="max-w-lg mx-auto mt-10">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        )}

        {state.status === 'ready' && (
          <div className="space-y-3">
            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{state.info.nombreOriginal}</span>
              <Badge variant="secondary" className="text-[10px]">
                {state.info.tipoEntidad}
              </Badge>
              {state.info.mimeType && (
                <Badge variant="outline" className="text-[10px]">
                  {state.info.mimeType.split('/').pop()?.toUpperCase()}
                </Badge>
              )}
              <span>{new Date(state.info.fechaSubida).toLocaleString('es-MX')}</span>
            </div>

            {/* Document viewer */}
            <DocumentViewer
              url={state.viewUrl}
              mimeType={state.info.mimeType}
              nombre={state.info.nombreOriginal}
            />
          </div>
        )}
      </main>
    </div>
  )
}

function ExpiryBadge({ expiresAt }: { expiresAt: Date }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, expiresAt.getTime() - Date.now()))

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(Math.max(0, expiresAt.getTime() - Date.now()))
    }, 1000)
    return () => clearInterval(interval)
  }, [expiresAt])

  const minutes = Math.floor(remaining / 60_000)
  const seconds = Math.floor((remaining % 60_000) / 1000)
  const isLow = remaining < 60_000

  return (
    <Badge
      variant={isLow ? 'destructive' : 'secondary'}
      className="font-mono text-[11px] gap-1 shrink-0"
    >
      <Clock className="h-3 w-3" />
      {minutes}:{seconds.toString().padStart(2, '0')}
    </Badge>
  )
}

function DocumentViewer({
  url,
  mimeType,
  nombre,
}: {
  url: string
  mimeType: string
  nombre: string
}) {
  if (mimeType === 'application/pdf') {
    return (
      <iframe
        src={url}
        title={nombre}
        className="w-full rounded-lg border bg-white"
        style={{ height: 'calc(100vh - 200px)', minHeight: 500 }}
      />
    )
  }

  if (mimeType.startsWith('image/')) {
    return (
      <div className="flex justify-center rounded-lg border bg-muted/20 p-4">
        <img
          src={url}
          alt={nombre}
          className="max-h-[calc(100vh-200px)] max-w-full object-contain rounded"
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3 py-10 rounded-lg border bg-muted/20">
      <FileText className="h-10 w-10 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">
        Vista previa no disponible para este tipo de archivo.
      </p>
      <a href={url} target="_blank" rel="noopener noreferrer">
        <Button variant="outline">Abrir en nueva pestaña</Button>
      </a>
    </div>
  )
}
