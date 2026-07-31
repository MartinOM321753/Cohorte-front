/**
 * sanitize.ts — Sanitización de inputs en tiempo real.
 *
 * Cada tipo define qué caracteres se permiten y qué transformaciones
 * automáticas se aplican mientras el usuario escribe.
 *
 * | tipo         | permite                                          | bloquea                           | extras                      |
 * |--------------|--------------------------------------------------|-----------------------------------|-----------------------------|
 * | nombre       | letras con acentos, espacios                     | números, símbolos especiales      | primera letra de cada palabra en mayúscula |
 * | apellido     | letras con acentos, espacios, guión              | números, símbolos especiales      | primera letra de cada palabra en mayúscula |
 * | texto        | letras, números, espacios, . , : - ( ) ! ? °     | comillas, backtick, < > & / etc.  | sin espacio al inicio       |
 * | descripcion  | texto clínico libre (paréntesis, comillas, etc.) | solo < > & ` \ (XSS/inyección)   | sin restricción de largo    |
 * | codigo       | A-Z 0-9 guión                                    | todo lo demás                     | fuerza mayúsculas           |
 * | folio        | letras, números, guión, guión bajo               | símbolos especiales               | —                           |
 * | alfanumerico | letras con acentos, números, espacios, guión     | símbolos especiales               | sin espacio al inicio       |
 *
 * NOTA sobre `alfanumerico`: es el tipo más estricto de los de texto libre y
 * descarta punto, coma, paréntesis y el símbolo de grado. Eso lo hace
 * inadecuado para nomenclatura de laboratorio ("Gradilla 81 pozos (2 mL)",
 * "Hospital General de Zona No. 1", "-80°C"). Los campos de nombres de equipos,
 * instituciones, exámenes y tipos de estudio usan `texto`, que sí los admite
 * sin renunciar al bloqueo de caracteres de inyección.
 * | telefono     | dígitos 0-9                                      | todo lo demás                     | —                           |
 * | usuario      | a-z 0-9 . _ -                                    | todo lo demás                     | fuerza minúsculas           |
 * | numero       | dígitos + un punto decimal                       | todo lo demás                     | —                           |
 */
export type SanitizeType =
  | 'nombre'
  | 'apellido'
  | 'texto'
  | 'descripcion'
  | 'codigo'
  | 'folio'
  | 'alfanumerico'
  | 'telefono'
  | 'usuario'
  | 'numero'

// ─── Patrones compilados ────────────────────────────────────────────────────

/** Solo letras españolas y espacios */
const RE_NOMBRE = /[^a-zA-ZáéíóúüñÁÉÍÓÚÜÑ ]/g

/** Solo letras españolas, espacios y guión (apellidos compuestos: García-López) */
const RE_APELLIDO = /[^a-zA-ZáéíóúüñÁÉÍÓÚÜÑ \-]/g

/**
 * Caracteres peligrosos en textos cortos (nombres de equipos, tipos, marcas…).
 * Bloquea: comillas simples y dobles, backtick, backslash, operadores HTML/SQL,
 * llaves, corchetes, pipes, tildes, signos de moneda/porcentaje, operadores.
 */
const RE_TEXTO_PELIGROSO = /['"`\\<>&{}[\]|^~$%@#*+=;/]/g

/**
 * Para descripciones y observaciones clínicas: solo se bloquean los caracteres
 * que generan XSS (< > &) y los de escape directo (` \ carácter nulo ESC).
 * Se permiten paréntesis, comillas dobles simples, signos de puntuación, etc.
 */
const RE_DESC_PELIGROSO = /[<>&`\\\x00\x1b]/g

/** Código interno: A-Z, 0-9, guión */
const RE_CODIGO = /[^A-Z0-9\-]/g

/** Folio de expediente: letras, números, guión, guión bajo */
const RE_FOLIO = /[^a-zA-Z0-9\-_]/g

/** Alfanumérico ampliado: letras con acentos, números, espacios, guión */
const RE_ALFANUM = /[^a-zA-ZáéíóúüñÁÉÍÓÚÜÑ0-9 \-]/g

/** Teléfono: solo dígitos */
const RE_TELEFONO = /[^0-9]/g

/** Username: letras minúsculas, dígitos, punto, guión, guión bajo */
const RE_USUARIO = /[^a-z0-9._\-]/g

// ─── Utilidades internas ────────────────────────────────────────────────────

/**
 * Capitaliza la primera letra de cada palabra.
 * Funciona tanto con espacios como con guiones (para "García-López").
 */
function capitalizarPalabras(s: string): string {
  return s.replace(/(^|[ \-])([a-záéíóúüñ])/g, (_, sep, ch) => sep + ch.toUpperCase())
}

// ─── Función principal ──────────────────────────────────────────────────────

/**
 * Aplica la sanitización del tipo indicado al valor recibido.
 *
 * Se invoca en el `onChange` del `<Input>` / `<Textarea>` para filtrar
 * caracteres no permitidos en tiempo real.
 *
 * NO reemplaza la validación del schema Zod — es una capa adicional de UX.
 */
export function applySanitizer(type: SanitizeType, value: string): string {
  switch (type) {
    // ── Nombres propios ──────────────────────────────────────────────────
    case 'nombre': {
      const cleaned = value
        .replace(RE_NOMBRE, '')  // eliminar chars no permitidos
        .replace(/^ +/, '')      // sin espacio al inicio
      return capitalizarPalabras(cleaned)
    }
    case 'apellido': {
      const cleaned = value
        .replace(RE_APELLIDO, '')
        .replace(/^ +/, '')
      return capitalizarPalabras(cleaned)
    }

    // ── Textos descriptivos ───────────────────────────────────────────────
    case 'texto':
      return value.replace(RE_TEXTO_PELIGROSO, '').replace(/^ +/, '')

    case 'descripcion':
      return value.replace(RE_DESC_PELIGROSO, '')

    // ── Identificadores ───────────────────────────────────────────────────
    case 'codigo':
      return value.toUpperCase().replace(RE_CODIGO, '').replace(/^ +/, '')

    case 'folio':
      return value.replace(RE_FOLIO, '').replace(/^ +/, '')

    case 'alfanumerico':
      return value.replace(RE_ALFANUM, '').replace(/^ +/, '')

    // ── Campos especializados ─────────────────────────────────────────────
    case 'telefono':
      return value.replace(RE_TELEFONO, '')

    case 'usuario':
      return value.toLowerCase().replace(RE_USUARIO, '')

    case 'numero': {
      const soloDigitos = value.replace(/[^0-9.]/g, '')
      const partes = soloDigitos.split('.')
      // Permitir solo un punto decimal
      return partes.length > 2
        ? partes[0] + '.' + partes.slice(1).join('')
        : soloDigitos
    }

    default:
      return value
  }
}
