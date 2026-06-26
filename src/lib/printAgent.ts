/**
 * Cliente para el agente local de impresión (IMSS Print Agent).
 *
 * El agente corre como Servicio de Windows en cada PC con impresora,
 * escuchando en localhost:9101. Detecta las impresoras instaladas en
 * ESA máquina (no las del servidor) y les envía ZPL directamente.
 *
 * Flujo: frontend pide el ZPL al backend remoto → lo manda al agente local.
 */

const AGENT_URL = 'http://localhost:9101'
const AGENT_TIMEOUT = 3000

async function agentFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), AGENT_TIMEOUT)

  try {
    const res = await fetch(`${AGENT_URL}${path}`, {
      ...options,
      signal: controller.signal,
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error((body as Record<string, string>).error ?? `Error ${res.status}`)
    }
    return (await res.json()) as T
  } finally {
    clearTimeout(timeout)
  }
}

export interface AgentHealth {
  status: string
  version: string
  impresoras: number
}

export async function checkAgentHealth(): Promise<AgentHealth | null> {
  try {
    return await agentFetch<AgentHealth>('/health')
  } catch {
    return null
  }
}

export async function isAgentAvailable(): Promise<boolean> {
  const health = await checkAgentHealth()
  return health?.status === 'ok'
}

export async function listarImpresorasLocal(): Promise<string[]> {
  const res = await agentFetch<{ data: string[] }>('/impresoras')
  return res.data
}

export async function imprimirLocal(impresora: string, zpl: string): Promise<void> {
  await agentFetch('/imprimir', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ impresora, zpl }),
  })
}
