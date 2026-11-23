import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'

const context = { window: {} as any, document: { documentElement: { lang: 'es' } }, URL }
runInNewContext(readFileSync('public/landing/request-validation.js', 'utf8'), context)
const validation = context.window.requestValidation
const field = (name: string, value: string) => validation.field({ name, value, required: true })

describe('public data request input boundaries', () => {
  it.each(['María-José O’Neill', 'Li', '李明', 'José Pérez'])('accepts legitimate names: %s', name => {
    expect(field('fullName', name)).toBe(name)
  })
  it.each(['<script>alert(1)</script>', 'Ana\u202Etxt', 'Ana\u200B', 'Ana123', '😀😀'])('rejects malformed names: %s', name => {
    expect(() => field('fullName', name)).toThrow()
  })
  it('normalizes decomposed accents and whitespace', () => {
    expect(field('fullName', '  Jose\u0301 Pérez  ')).toBe('José Pérez')
  })
  it.each(['7771234567', '5512345678'])('accepts exactly ten phone digits: %s', phone => {
    expect(field('phone', phone)).toBe(phone)
  })
  it.each(['551234567', '55123456789', '+525512345678', '55 12345678', '0000000000', '５５１２３４５６７８', '551234567a'])('rejects invalid phone: %s', phone => {
    expect(() => field('phone', phone)).toThrow()
  })
  it('accepts plus addressing, preserves local case and normalizes email domains', () => {
    expect(validation.email('Research+cohorte@EXAMPLE.ORG')).toBe('Research+cohorte@example.org')
    expect(validation.email('ana@bücher.de')).toBe('ana@xn--bcher-kva.de')
  })
  it.each(['a@@example.org', 'a@localhost', '.a@example.org', 'a..b@example.org', 'a@-example.org', 'a@example..org', 'a@example.org/path', 'a@example.org:80', 'a@example.org\nBcc:test@example.org'])('rejects invalid email: %s', email => {
    expect(() => validation.email(email)).toThrow()
  })
  it('allows research punctuation and multiline text but rejects markup and control characters', () => {
    const text = 'Estudiaremos IMC <25, riesgo ≥2 y hábitos.\nAnálisis 2024–2026.'
    expect(field('project', text)).toBe(text)
    expect(() => field('project', 'Este proyecto contiene una etiqueta <img src=x onerror=alert(1)>')).toThrow()
    expect(() => field('project', 'Un proyecto con texto suficientemente largo\u0000')).toThrow()
    expect(() => field('project', 'Corto')).toThrow()
    expect(() => field('project', 'a'.repeat(2401))).toThrow()
  })
})
