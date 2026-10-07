import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  getDocumentosPublicos,
  getCategoriasPublicas,
  getSeccionesPublicas,
  type DocumentoPublicoDTO,
  type CategoriaDocumentoPublicoDTO,
  type SeccionDocumentoPublicoDTO,
} from '@/features/configuracion/api/documentosPublicos.api'
import cohorteLogoUrl from '@/assets/logo.png'

const API_BASE = (import.meta.env.VITE_API_URL as string) || 'http://localhost:8080/api'

function formatDate(d: string) {
  try {
    const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
    const [y, m, day] = d.split('-')
    return `${parseInt(day)} de ${months[parseInt(m) - 1]} de ${y}`
  } catch { return d }
}

function formatDateShort(d: string) {
  try {
    const [y, m, day] = d.split('-')
    return `${day}/${m}/${y}`
  } catch { return d }
}

function formatSize(bytes: number | null | undefined) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

function mimeLabel(mime: string | null) {
  if (!mime) return 'Archivo'
  if (mime === 'application/pdf') return 'PDF'
  if (mime.startsWith('image/')) return 'Imagen'
  if (mime.includes('word')) return 'Word'
  if (mime.includes('spreadsheet') || mime.includes('excel')) return 'Excel'
  if (mime.includes('presentation') || mime.includes('powerpoint')) return 'PPT'
  if (mime.includes('zip') || mime.includes('compressed')) return 'ZIP'
  return 'Archivo'
}

function isPreviewable(doc: DocumentoPublicoDTO) {
  const mime = doc.mimeType ?? ''
  return mime === 'application/pdf' || mime.startsWith('image/')
}

function displayName(doc: DocumentoPublicoDTO) {
  return doc.nombreMostrar || doc.nombreOriginal
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function DocumentosPublicosPage() {
  const { idInstitucion } = useParams<{ idInstitucion: string }>()
  const instId = Number(idInstitucion)

  const [docs, setDocs] = useState<DocumentoPublicoDTO[]>([])
  const [categorias, setCategorias] = useState<CategoriaDocumentoPublicoDTO[]>([])
  const [secciones, setSecciones] = useState<SeccionDocumentoPublicoDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDoc, setSelectedDoc] = useState<DocumentoPublicoDTO | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todas')
  const [filtroFase, setFiltroFase] = useState<string>('todas')

  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'preconnect'
    link.href = 'https://fonts.googleapis.com'
    document.head.appendChild(link)

    const link2 = document.createElement('link')
    link2.rel = 'stylesheet'
    link2.href = 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Source+Serif+4:wght@400;500;600;700&display=swap'
    document.head.appendChild(link2)

    return () => {
      document.head.removeChild(link)
      document.head.removeChild(link2)
    }
  }, [])

  useEffect(() => {
    if (!instId) return
    setLoading(true)
    Promise.all([
      getDocumentosPublicos(instId),
      getCategoriasPublicas(instId),
      getSeccionesPublicas(instId),
    ]).then(([d, c, s]) => {
      setDocs(d)
      setCategorias(c)
      setSecciones(s)
    }).finally(() => setLoading(false))
  }, [instId])

  const fases = useMemo(
    () => [...new Set(docs.map(d => d.fase).filter(Boolean) as string[])].sort(),
    [docs],
  )

  const filtered = useMemo(() => {
    const q = busqueda.toLowerCase().trim()
    return docs.filter(d => {
      if (filtroCategoria !== 'todas' && String(d.categoriaId) !== filtroCategoria) return false
      if (filtroFase !== 'todas' && d.fase !== filtroFase) return false
      if (q) {
        const name = displayName(d).toLowerCase()
        const desc = (d.descripcion ?? '').toLowerCase()
        const autor = (d.autor ?? '').toLowerCase()
        if (!name.includes(q) && !desc.includes(q) && !autor.includes(q)) return false
      }
      return true
    })
  }, [docs, filtroCategoria, filtroFase, busqueda])

  const groupedBySections = useMemo(() => {
    const groups: { seccion: SeccionDocumentoPublicoDTO | null; docs: DocumentoPublicoDTO[] }[] = []
    const seccionMap = new Map<number, DocumentoPublicoDTO[]>()
    const sinSeccion: DocumentoPublicoDTO[] = []

    for (const d of filtered) {
      if (d.seccionId != null) {
        let arr = seccionMap.get(d.seccionId)
        if (!arr) { arr = []; seccionMap.set(d.seccionId, arr) }
        arr.push(d)
      } else {
        sinSeccion.push(d)
      }
    }

    for (const sec of secciones) {
      const secDocs = seccionMap.get(sec.id)
      if (secDocs?.length) {
        groups.push({ seccion: sec, docs: secDocs })
      }
    }
    if (sinSeccion.length) {
      groups.push({ seccion: null, docs: sinSeccion })
    }
    return groups
  }, [filtered, secciones])

  const hasFilters = filtroCategoria !== 'todas' || filtroFase !== 'todas' || busqueda !== ''

  if (!instId) {
    return (
      <div style={{ ...tokens.page, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p style={{ fontFamily: 'var(--dp-sans)', color: 'var(--dp-fg-2)' }}>Institución no especificada.</p>
      </div>
    )
  }

  return (
    <div style={tokens.page}>
      <style>{cssVars}</style>

      {/* ── Top bar ── */}
      <div style={styles.topBar}>
        <img src={cohorteLogoUrl} alt="Logo" style={{ height: 32, width: 'auto' }} />
        <span style={{ fontFamily: 'var(--dp-sans)', fontSize: 14, fontWeight: 700, color: 'var(--dp-fg-0)', letterSpacing: '-0.3px' }}>
          Cohorte de Trabajadores de la Salud
        </span>
        <div style={{ flex: 1 }} />
        <span style={{ fontFamily: 'var(--dp-sans)', fontSize: 12, color: 'var(--dp-fg-2)', fontWeight: 500 }}>
        </span>
      </div>

      {/* ── Hero ── */}
      <div style={styles.hero}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 32 }}>
            <div style={{ flex: 1, minWidth: 280 }}>
              <div style={styles.overline}>Questionnaire Repository</div>
              <h1 style={styles.heroTitle}>Public Documents</h1>
              <p style={styles.heroDesc}>
                Access the questionnaires of the Health Workers Cohort from the different measurement waves.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={styles.metric}>{docs.length}</div>
                <div style={{ fontFamily: 'var(--dp-sans)', fontSize: 11, color: 'var(--dp-fg-3)', marginTop: 4 }}>documents</div>
              </div>
            </div>
          </div>

          {/* Search + filters */}
          <div style={{ marginTop: 24, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            <div style={styles.searchBox}>
              <SearchIcon />
              <input
                type="text"
                placeholder="Search by name..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                style={styles.searchInput}
              />
            </div>
            <select
              value={filtroCategoria}
              onChange={e => setFiltroCategoria(e.target.value)}
              style={styles.select}
            >
              <option value="todas">All Categories</option>
              {categorias.map(c => <option key={c.id} value={String(c.id)}>{c.nombre}</option>)}
            </select>
            {fases.length > 0 && (
              <select
                value={filtroFase}
                onChange={e => setFiltroFase(e.target.value)}
                style={styles.select}
              >
                <option value="todas">All Phases</option>
                {fases.map(f => <option key={f}  value={f}>Fase {f}</option>)}
                
              </select>
            )}
            {hasFilters && (
              <button
                onClick={() => { setFiltroCategoria('todas'); setFiltroFase('todas'); setBusqueda('') }}
                style={styles.clearBtn}
              >
                Limpiar Filtros
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Cards grid ── */}
      <div style={styles.cardsSection}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '64px 24px' }}>
              <div style={styles.spinner} />
              <div style={{ fontFamily: 'var(--dp-sans)', fontSize: 14, color: 'var(--dp-fg-2)', marginTop: 16 }}>Cargando documentos...</div>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 24px' }}>
              <SearchIcon size={40} color="var(--dp-fg-4)" />
              <div style={{ fontFamily: 'var(--dp-sans)', fontSize: 14, color: 'var(--dp-fg-2)', marginTop: 16 }}>
                {hasFilters ? 'No se encontraron documentos con esos filtros.' : 'Aún no hay documentos publicados.'}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
              {groupedBySections.map(group => (
                <div key={group.seccion?.id ?? 'sin-seccion'}>
                  <h2 style={styles.sectionTitle}>
                    {group.seccion?.nombre ?? 'Sin Sección'}
                  </h2>
                  <div style={styles.grid}>
                    {group.docs.map(doc => (
                      <DocumentCard
                        key={doc.id}
                        doc={doc}
                        isSelected={selectedDoc?.id === doc.id}
                        onSelect={() => setSelectedDoc(doc)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ fontFamily: 'var(--dp-sans)', fontSize: 11, color: 'var(--dp-fg-3)', marginTop: 16, textAlign: 'right' }}>
            {!loading && `${filtered.length} de ${docs.length} documentos`}
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={styles.footer}>
        <span style={{ fontFamily: 'var(--dp-sans)', fontSize: 11, color: 'var(--dp-fg-3)' }}>
          Cohorte de Trabajadores de la Salud · Documentación pública
        </span>
      </div>

      {/* ── Full-screen viewer ── */}
      {selectedDoc && (
        <DocumentViewer doc={selectedDoc} onClose={() => setSelectedDoc(null)} />
      )}
    </div>
  )
}

// ─── Document Card ─────────────────────────────────────────────────────────

function DocumentCard({ doc, isSelected, onSelect }: { doc: DocumentoPublicoDTO; isSelected: boolean; onSelect: () => void }) {
  const [hovered, setHovered] = useState(false)
  const label = mimeLabel(doc.mimeType)
  const isDanger = label === 'PDF'

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--dp-bg-1)',
        borderRadius: 'var(--dp-radius-lg)',
        overflow: 'hidden',
        boxShadow: hovered ? 'var(--dp-shadow-sm)' : 'var(--dp-shadow-xs)',
        display: 'flex',
        cursor: 'pointer',
        transition: 'border-color 120ms, box-shadow 120ms',
        border: isSelected ? '1px solid var(--dp-brand)' : '1px solid var(--dp-border)',
      }}
    >
      {/* Thumbnail */}
      <div style={styles.cardThumb}>
        <div style={styles.cardThumbDoc}>
          <div style={{ height: 3, background: 'var(--dp-fg-0)', borderRadius: 1, width: '75%' }} />
          <div style={{ height: 2, background: 'var(--dp-fg-4)', borderRadius: 1, width: '100%' }} />
          <div style={{ height: 2, background: 'var(--dp-fg-4)', borderRadius: 1, width: '85%' }} />
          <div style={{ height: 2, background: 'var(--dp-fg-4)', borderRadius: 1, width: '100%' }} />
          <div style={{ height: 2, background: 'var(--dp-fg-4)', borderRadius: 1, width: '65%' }} />
          <div style={{ height: 5 }} />
          <div style={{ height: 2, background: 'var(--dp-fg-4)', borderRadius: 1, width: '100%' }} />
          <div style={{ height: 2, background: 'var(--dp-fg-4)', borderRadius: 1, width: '90%' }} />
          <div style={{ height: 2, background: 'var(--dp-fg-4)', borderRadius: 1, width: '80%' }} />
        </div>
      </div>
      {/* Content */}
      <div style={{ flex: 1, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {doc.categoriaNombre && (
            <span style={styles.badgeMono}>{doc.categoriaNombre}</span>
          )}
          <span style={{
            fontFamily: 'var(--dp-sans)',
            padding: '2px 7px',
            background: isDanger ? 'var(--dp-danger-bg)' : 'var(--dp-info-bg)',
            color: isDanger ? 'var(--dp-danger)' : 'var(--dp-info)',
            borderRadius: 999,
            fontSize: 10,
            fontWeight: 600,
          }}>
            {label}
          </span>
          {doc.fase && (
            <span style={styles.badgeFase}>Fase {doc.fase}</span>
          )}
        </div>
        <div style={{ fontFamily: 'var(--dp-sans)', fontSize: 13.5, fontWeight: 600, color: 'var(--dp-fg-0)', lineHeight: 1.35 }}>
          {displayName(doc)}
        </div>
        {doc.descripcion && (
          <p style={styles.cardDesc}>{doc.descripcion}</p>
        )}
        <div style={styles.cardFooter}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <CalendarIcon />
            <span style={{ fontFamily: 'var(--dp-sans)', fontSize: 11, color: 'var(--dp-fg-3)' }}>
              {formatDateShort(doc.fechaPublicacion)}
            </span>
          </div>
          {doc.tamanioBytes && (
            <span style={{ fontFamily: 'var(--dp-sans)', fontSize: 11, color: 'var(--dp-fg-3)' }}>
              {formatSize(doc.tamanioBytes)}
            </span>
          )}
          {doc.autor && (
            <span style={{ fontFamily: 'var(--dp-sans)', fontSize: 11, color: 'var(--dp-fg-3)', marginLeft: 'auto' }}>
              {doc.autor}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Full-screen Document Viewer ────────────────────────────────────────────

function DocumentViewer({ doc, onClose }: { doc: DocumentoPublicoDTO; onClose: () => void }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const blobRef = useRef<string | null>(null)

  const loadDocument = useCallback(async () => {
    if (!isPreviewable(doc)) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(false)
    try {
      const url = `${API_BASE}/publico/documentos/descargar/${doc.id}?inline=true`
      const res = await fetch(url)
      if (!res.ok) throw new Error('fetch failed')
      const blob = await res.blob()
      const objUrl = URL.createObjectURL(blob)
      blobRef.current = objUrl
      setBlobUrl(objUrl)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [doc.id])

  useEffect(() => {
    loadDocument()
    return () => {
      if (blobRef.current) URL.revokeObjectURL(blobRef.current)
    }
  }, [loadDocument])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const downloadUrl = `${API_BASE}/publico/documentos/descargar/${doc.id}?inline=false`
  const label = mimeLabel(doc.mimeType)
  const isDanger = label === 'PDF'

  return (
    <div style={styles.viewerOverlay}>
      {/* Left: viewer area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Toolbar */}
        <div style={styles.viewerToolbar}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--dp-brand)', flexShrink: 0 }} />
          <span style={{ fontFamily: 'var(--dp-sans)', fontSize: 13, fontWeight: 600, color: 'var(--dp-fg-0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
            {displayName(doc)}
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexShrink: 0 }}>
        
            <button onClick={onClose} style={styles.closeBtn}>
              <CloseIcon />
            </button>
          </div>
        </div>
        {/* Preview area */}
        <div style={styles.viewerBody}>
          {loading ? (
            <div style={{ textAlign: 'center' }}>
              <div style={styles.spinner} />
              <div style={{ fontFamily: 'var(--dp-sans)', fontSize: 13, color: 'var(--dp-fg-2)', marginTop: 16 }}>Cargando documento...</div>
            </div>
          ) : error ? (
            <FallbackView doc={doc} downloadUrl={downloadUrl} message="No se pudo cargar el documento." />
          ) : blobUrl && isPreviewable(doc) ? (
            doc.mimeType === 'application/pdf' ? (
              <iframe
                src={blobUrl}
                style={{ width: '100%', height: '100%', border: 'none', borderRadius: 'var(--dp-radius-md)', background: '#fff' }}
                title={displayName(doc)}
              />
            ) : (
              <img
                src={blobUrl}
                alt={displayName(doc)}
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 'var(--dp-radius-md)', boxShadow: 'var(--dp-shadow-md)' }}
              />
            )
          ) : (
            <FallbackView doc={doc} downloadUrl={downloadUrl} message="Este archivo no se puede previsualizar." />
          )}
        </div>
      </div>

      {/* Right: detail drawer */}
      <div style={styles.detailDrawer}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={styles.drawerLabel}>Información</span>
          <button onClick={onClose} style={styles.drawerCloseBtn}>
            <CloseIcon size={14} />
          </button>
        </div>

        <div>
          <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 18, fontWeight: 600, color: 'var(--dp-fg-0)', lineHeight: 1.3, marginBottom: 10 }}>
            {displayName(doc)}
          </div>
          {doc.descripcion && (
            <p style={{ fontFamily: 'var(--dp-sans)', fontSize: 13, color: 'var(--dp-fg-2)', lineHeight: 1.6, margin: 0 }}>
              {doc.descripcion}
            </p>
          )}
        </div>

        {/* Metadata card */}
        <div style={styles.metaCard}>
          {doc.autor && (
            <>
              <MetaRow label="Autor" value={doc.autor} />
              <div style={styles.metaDivider} />
            </>
          )}
          <MetaRow label="Fecha De Publicación" value={formatDate(doc.fechaPublicacion)} />
          <div style={styles.metaDivider} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--dp-sans)', fontSize: 11, color: 'var(--dp-fg-3)' }}>Formato</span>
            <span style={{
              fontFamily: 'var(--dp-sans)', fontSize: 10, fontWeight: 600,
              color: isDanger ? 'var(--dp-danger)' : 'var(--dp-info)',
              background: isDanger ? 'var(--dp-danger-bg)' : 'var(--dp-info-bg)',
              padding: '2px 8px', borderRadius: 999,
            }}>
              {label}
            </span>
          </div>
          {doc.tamanioBytes && (
            <>
              <div style={styles.metaDivider} />
              <MetaRow label="Tamaño" value={formatSize(doc.tamanioBytes)} />
            </>
          )}
          {doc.seccionNombre && (
            <>
              <div style={styles.metaDivider} />
              <MetaRow label="Sección" value={doc.seccionNombre} />
            </>
          )}
          {doc.categoriaNombre && (
            <>
              <div style={styles.metaDivider} />
              <MetaRow label="Categoría" value={doc.categoriaNombre} />
            </>
          )}
          {doc.fase && (
            <>
              <div style={styles.metaDivider} />
              <MetaRow label="Fase" value={doc.fase} />
            </>
          )}
        </div>

        {/* Download CTA */}
        <div style={{ marginTop: 'auto' }}>
          <a href={downloadUrl} download onClick={e => e.stopPropagation()} style={styles.downloadCta}>
            <DownloadIcon />
            Descargar Documento
          </a>
        </div>
      </div>
    </div>
  )
}

function FallbackView({ doc, downloadUrl, message }: { doc: DocumentoPublicoDTO; downloadUrl: string; message: string }) {
  return (
    <div style={{ width: 300, maxWidth: '100%', background: 'var(--dp-bg-1)', borderRadius: 'var(--dp-radius-md)', boxShadow: 'var(--dp-shadow-md)', padding: '44px 32px', textAlign: 'center' }}>
      <FileIcon />
      <div style={{ fontFamily: 'var(--dp-sans)', fontSize: 15, fontWeight: 600, color: 'var(--dp-fg-0)', marginTop: 18 }}>
        {displayName(doc)}
      </div>
      <div style={{ fontFamily: 'var(--dp-sans)', fontSize: 13, color: 'var(--dp-fg-2)', marginTop: 8 }}>{message}</div>
      <a href={downloadUrl} download style={{ ...styles.downloadCta, display: 'inline-flex', marginTop: 24 }}>
        <DownloadIcon /> Descargar Archivo
      </a>
    </div>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontFamily: 'var(--dp-sans)', fontSize: 11, color: 'var(--dp-fg-3)' }}>{label}</span>
      <span style={{ fontFamily: 'var(--dp-sans)', fontSize: 12, color: 'var(--dp-fg-1)', fontWeight: 500 }}>{value}</span>
    </div>
  )
}

// ─── Icons (inline SVG) ─────────────────────────────────────────────────────

function SearchIcon({ size = 16, color = 'var(--dp-fg-3)' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="var(--dp-fg-3)" strokeWidth="1.5" strokeLinecap="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function CloseIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

function FileIcon() {
  return (
    <svg width={52} height={52} viewBox="0 0 24 24" fill="none" stroke="var(--dp-fg-4)" strokeWidth="1" strokeLinecap="round" style={{ margin: '0 auto' }}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" /><path d="M16 13H8" /><path d="M16 17H8" /><path d="M10 9H8" />
    </svg>
  )
}

// ─── CSS variables & tokens ─────────────────────────────────────────────────

const cssVars = `
  :root {
    --dp-brand: #1E4E3A;
    --dp-brand-500: #2E6B54;
    --dp-brand-600: #1E4E3A;
    --dp-brand-700: #17402F;
    --dp-bg-0: #FBFAF7;
    --dp-bg-1: #FFFFFF;
    --dp-bg-2: #F4F2ED;
    --dp-bg-3: #E8E5DD;
    --dp-fg-0: #18201C;
    --dp-fg-1: #3A4540;
    --dp-fg-2: #67726C;
    --dp-fg-3: #97A09B;
    --dp-fg-4: #C7CDC8;
    --dp-border: #E4E1D8;
    --dp-border-strong: #CFCBBE;
    --dp-divider: #EEECE5;
    --dp-danger: #A8443A;
    --dp-danger-bg: #F7E9E6;
    --dp-info: #3C5A7A;
    --dp-info-bg: #E7ECF3;
    --dp-warning-bg: #F9EFDC;
    --dp-warning: #B8761A;
    --dp-sans: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    --dp-serif: 'Source Serif 4', Georgia, 'Times New Roman', serif;
    --dp-radius-md: 6px;
    --dp-radius-lg: 8px;
    --dp-shadow-xs: 0 1px 2px rgba(24,32,28,0.04);
    --dp-shadow-sm: 0 1px 3px rgba(24,32,28,0.06), 0 1px 2px rgba(24,32,28,0.04);
    --dp-shadow-md: 0 8px 24px rgba(24,32,28,0.08), 0 1px 2px rgba(24,32,28,0.06);
  }
  @keyframes dp-spin { to { transform: rotate(360deg); } }
`

const tokens = {
  page: {
    fontFamily: "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: 14,
    lineHeight: 1.5,
    color: '#3A4540',
    background: '#FBFAF7',
    minHeight: '100vh',
    WebkitFontSmoothing: 'antialiased' as const,
    display: 'flex',
    flexDirection: 'column' as const,
  },
}

const styles: Record<string, React.CSSProperties> = {
  topBar: {
    background: 'var(--dp-bg-1)',
    padding: '12px 24px',
    borderBottom: '1px solid var(--dp-border)',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  hero: {
    padding: '48px 24px 40px',
    background: 'var(--dp-bg-0)',
    borderBottom: '1px solid var(--dp-border)',
  },
  overline: {
    fontFamily: 'var(--dp-sans)',
    fontSize: 15,
    fontWeight: 600,
    color: 'var(--dp-brand-500)',
    
    letterSpacing: '0.1em',
    marginBottom: 12,
  },
  heroTitle: {
    fontFamily: "'Source Serif 4', Georgia, serif",
    fontWeight: 600,
    fontSize: 'clamp(28px, 4vw, 38px)',
    color: 'var(--dp-fg-0)',
    margin: '0 0 14px',
    lineHeight: 1.15,
    letterSpacing: '-0.5px',
  },
  heroDesc: {
    fontFamily: 'var(--dp-sans)',
    fontSize: 14,
    color: 'var(--dp-fg-2)',
    margin: 0,
    maxWidth: 480,
    lineHeight: 1.65,
  },
  metric: {
    fontFamily: 'var(--dp-sans)',
    fontWeight: 700,
    fontSize: 36,
    color: 'var(--dp-brand-600)',
    lineHeight: 1,
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'var(--dp-bg-1)',
    border: '1px solid var(--dp-border)',
    borderRadius: 'var(--dp-radius-md)',
    padding: '10px 16px',
    flex: 1,
    maxWidth: 420,
    minWidth: 200,
  },
  searchInput: {
    border: 'none',
    outline: 'none',
    background: 'transparent',
    fontFamily: 'var(--dp-sans)',
    fontSize: 13,
    color: 'var(--dp-fg-0)',
    width: '100%',
  },
  select: {
    fontFamily: 'var(--dp-sans)',
    fontSize: 12,
    padding: '10px 14px',
    borderRadius: 'var(--dp-radius-md)',
    border: '1px solid var(--dp-border)',
    background: 'var(--dp-bg-1)',
    color: 'var(--dp-fg-1)',
    cursor: 'pointer',
    outline: 'none',
    
  },
  clearBtn: {
    fontFamily: 'var(--dp-sans)',
    fontSize: 12,
    color: 'var(--dp-brand)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
    padding: '4px 8px',
  },
  cardsSection: {
    padding: 24,
    background: 'var(--dp-bg-2)',
    flex: 1,
  },
  sectionTitle: {
    fontFamily: "'Source Serif 4', Georgia, serif",
    fontSize: 22,
    fontWeight: 600,
    color: 'var(--dp-fg-0)',
    margin: '0 0 16px',
    paddingBottom: 10,
    borderBottom: '2px solid var(--dp-brand)',
    letterSpacing: '-0.3px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 460px), 1fr))',
    gap: 14,
  },
  cardThumb: {
    width: 96,
    background: 'var(--dp-bg-3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRight: '1px solid var(--dp-border)',
    flexShrink: 0,
  },
  cardThumbDoc: {
    width: 52,
    height: 68,
    background: 'var(--dp-bg-1)',
    borderRadius: 2,
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    display: 'flex',
    flexDirection: 'column' as const,
    padding: '7px 5px',
    gap: 3,
  },
  badgeMono: {
    fontFamily: "'JetBrains Mono', ui-monospace, 'SF Mono', monospace",
    fontSize: 10,
    background: 'var(--dp-bg-2)',
    padding: '2px 7px',
    borderRadius: 3,
    fontWeight: 500,
    color: 'var(--dp-fg-2)',
  },
  badgeFase: {
    fontFamily: 'var(--dp-sans)',
    fontSize: 10,
    background: 'var(--dp-warning-bg)',
    padding: '2px 7px',
    borderRadius: 999,
    fontWeight: 600,
    color: 'var(--dp-warning)',
  },
  cardDesc: {
    fontFamily: 'var(--dp-sans)',
    fontSize: 12,
    color: 'var(--dp-fg-2)',
    lineHeight: 1.5,
    margin: 0,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical' as const,
    overflow: 'hidden',
  },
  cardFooter: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginTop: 'auto',
    paddingTop: 8,
    borderTop: '1px solid var(--dp-divider)',
  },
  footer: {
    padding: '20px 24px',
    borderTop: '1px solid var(--dp-border)',
    background: 'var(--dp-bg-0)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerOverlay: {
    position: 'fixed' as const,
    inset: 0,
    zIndex: 50,
    display: 'flex',
    background: 'var(--dp-bg-1)',
    animation: 'fadeIn 200ms ease-out',
  },
  viewerToolbar: {
    padding: '12px 24px',
    borderBottom: '1px solid var(--dp-border)',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  viewerBody: {
    flex: 1,
    background: 'var(--dp-bg-2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    overflow: 'auto',
  },
  downloadBtn: {
    padding: '6px 14px',
    background: 'var(--dp-brand-600)',
    color: '#fff',
    borderRadius: 'var(--dp-radius-md)',
    fontFamily: 'var(--dp-sans)',
    fontSize: 12,
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    cursor: 'pointer',
    textDecoration: 'none',
    border: 'none',
  },
  closeBtn: {
    padding: 6,
    //border: '1px solid var(--dp-border)',
    borderRadius: 'var(--dp-radius-md)',
    background: 'var(--dp-bg-1)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--dp-fg-2)',
  },
  detailDrawer: {
    width: 300,
    minWidth: 300,
    borderLeft: '1px solid var(--dp-border)',
    background: 'var(--dp-bg-0)',
    padding: 24,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 18,
    overflowY: 'auto' as const,
  },
  drawerLabel: {
    fontFamily: 'var(--dp-sans)',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--dp-fg-2)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
  },
  drawerCloseBtn: {
    width: 24,
    height: 24,
    borderRadius: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    color: 'var(--dp-fg-3)',
  },
  metaCard: {
    background: 'var(--dp-bg-1)',
    border: '1px solid var(--dp-border)',
    borderRadius: 'var(--dp-radius-lg)',
    padding: 16,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 14,
  },
  metaDivider: {
    height: 1,
    background: 'var(--dp-divider)',
  },
  downloadCta: {
    padding: 12,
    background: 'var(--dp-brand-600)',
    color: '#fff',
    borderRadius: 'var(--dp-radius-md)',
    fontFamily: 'var(--dp-sans)',
    fontSize: 13,
    fontWeight: 600,
    textAlign: 'center' as const,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    cursor: 'pointer',
    textDecoration: 'none',
    border: 'none',
  },
  spinner: {
    width: 32,
    height: 32,
    border: '3px solid var(--dp-border)',
    borderTop: '3px solid var(--dp-brand)',
    borderRadius: '50%',
    animation: 'dp-spin 0.8s linear infinite',
    margin: '0 auto',
  },
}
