import { useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

const LANDING_BASE = '/landing'

const CSS_FILES = [
  'theme.css',
  'instituciones.css',
  'retroalimentacion.css',
  'viewport.css',
  'selected-design.css?v=3',
]

const SCRIPT_FILES = [
  'motion-preferences.js',
  'carousels.js',
  'evaluations.js',
  'motion.js',
  'analytics.js?v=68',
  'presentation.js',
  'i18n.js?v=72',
]

function rewritePaths(html: string): string {
  return html
    .replace(/src="assets\//g, `src="${LANDING_BASE}/assets/`)
    .replace(/href="assets\//g, `href="${LANDING_BASE}/assets/`)
    .replace(/url\(assets\//g, `url(${LANDING_BASE}/assets/`)
    .replace(/src="evaluations-data/g, `src="${LANDING_BASE}/evaluations-data`)
    .replace(/src="results-data/g, `src="${LANDING_BASE}/results-data`)
    .replace(/href="login\/"/g, 'href="/login"')
    .replace(/href="login"/g, 'href="/login"')
}

function rewriteSubpageLinks(container: HTMLElement) {
  container.querySelectorAll<HTMLAnchorElement>('a[href]').forEach(a => {
    const href = a.getAttribute('href') ?? ''
    if (
      href.match(/^institucion-.*\.html/) ||
      href === 'privacidad.html' ||
      href === 'publicaciones.html' ||
      href === 'solicitud-datos.html'
    ) {
      a.setAttribute('href', `${LANDING_BASE}/${href}`)
    }
  })
}

export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const cleanupRef = useRef<(() => void) | null>(null)

  const handleLoginClick = useCallback(
    (e: Event) => {
      e.preventDefault()
      navigate('/login')
    },
    [navigate],
  )

  useEffect(() => {
    const linksAdded: HTMLLinkElement[] = []
    const scriptsAdded: HTMLScriptElement[] = []
    const originalOverflow = document.body.style.overflow
    const originalBg = document.body.style.background
    let cancelled = false

    CSS_FILES.forEach(file => {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = `${LANDING_BASE}/${file}`
      link.dataset.landing = 'true'
      document.head.appendChild(link)
      linksAdded.push(link)
    })

    const hideSpaStyles = document.createElement('style')
    hideSpaStyles.dataset.landing = 'true'
    hideSpaStyles.textContent = `
      #root > *:not(.landing-root) { display: none !important; }
    `
    document.head.appendChild(hideSpaStyles)

    fetch(`${LANDING_BASE}/_content.html`)
      .then(r => r.text())
      .then(html => {
        if (cancelled || !containerRef.current) return

        const parser = new DOMParser()
        const doc = parser.parseFromString(html, 'text/html')
        const body = doc.body

        const rewritten = rewritePaths(body.innerHTML)
        containerRef.current.innerHTML = rewritten
        rewriteSubpageLinks(containerRef.current)

        containerRef.current
          .querySelectorAll<HTMLAnchorElement>('.login-link, a[href="/login"], a[href="login/"], a[href="login"]')
          .forEach(a => a.addEventListener('click', handleLoginClick))

        requestAnimationFrame(() => {
          if (cancelled) return
          let chain = Promise.resolve()
          SCRIPT_FILES.forEach(file => {
            chain = chain.then(
              () =>
                new Promise<void>(resolve => {
                  if (cancelled) {
                    resolve()
                    return
                  }
                  const script = document.createElement('script')
                  script.src = `${LANDING_BASE}/${file}`
                  script.dataset.landing = 'true'
                  script.onload = () => resolve()
                  script.onerror = () => resolve()
                  document.body.appendChild(script)
                  scriptsAdded.push(script)
                }),
            )
          })
        })
      })

    cleanupRef.current = () => {
      cancelled = true
      linksAdded.forEach(l => l.remove())
      scriptsAdded.forEach(s => s.remove())
      hideSpaStyles.remove()
      document.body.style.overflow = originalOverflow
      document.body.style.background = originalBg
      document.querySelectorAll('[data-landing="true"]').forEach(el => el.remove())
    }

    return () => {
      cleanupRef.current?.()
    }
  }, [handleLoginClick])

  return <div ref={containerRef} className="landing-root" />
}
