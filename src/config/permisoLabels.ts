/**
 * Traducción de códigos de permisos a etiquetas amigables.
 * Usado en: bitácora, tooltips, badges y cualquier lugar donde se muestre
 * un código como `PACIENTES_CREAR_ACCESO` a un usuario final.
 *
 * El código canónico sigue siendo el del backend (PermisoInitializer). Este
 * mapa es solo presentación.
 */

const LABELS: Record<string, string> = {
  // Dashboard
  DASHBOARD_VER:               'Acceder al panel principal',
  DASHBOARD_KPI_VER:           'Indicadores generales del panel',
  DASHBOARD_SOMATOMETRIA_VER:  'Gráficos de somatometría',
  DASHBOARD_EXAMENES_VER:      'Gráficos de exámenes',
  DASHBOARD_BIOBANCO_VER:      'Ocupación del biobanco',
  DASHBOARD_AGENDA_VER:        'Agenda del día',

  // Participantes
  PACIENTES_ACCEDER:           'Acceder a la pantalla de participantes',
  PACIENTES_LOOKUP:            'Consultar participantes (buscar en formularios ajenos)',
  PACIENTES_VER:               'Ver participantes (legacy)',
  PACIENTES_CREAR:             'Registrar participantes',
  PACIENTES_EDITAR:            'Editar participantes',
  PACIENTES_ELIMINAR:          'Eliminar participantes',
  PACIENTES_IMPORTAR:          'Importar participantes',
  PACIENTES_CREAR_ACCESO:      'Crear cuenta de acceso al portal',

  // Expediente
  EXPEDIENTE_VER:                'Acceder al expediente',
  EXPEDIENTE_DATOS_PERSONALES:   'Ver datos personales',
  EXPEDIENTE_SOMATOMETRIA:       'Ver somatometría',
  EXPEDIENTE_RESULTADOS_LAB:     'Ver resultados de laboratorio',
  EXPEDIENTE_PERFIL_LAB:         'Ver perfil de laboratorio',
  EXPEDIENTE_BIOBANCO:           'Ver muestras del biobanco',
  EXPEDIENTE_PRUEBA_ESCALON:     'Ver prueba de escalón',
  EXPEDIENTE_CITAS:              'Ver citas del participante',
  EXPEDIENTE_ESTUDIOS:           'Ver estudios del participante',
  EXPEDIENTE_EXAMENES:           'Ver exámenes del participante',
  EXPEDIENTE_DOCUMENTOS:         'Ver documentos del participante',

  // Estudios
  ESTUDIOS_LLENADO_ACCEDER:  'Tab Llenado de estudios',
  ESTUDIOS_CATALOGO_ACCEDER: 'Tab Cat. Estudios',
  ESTUDIOS_TIPOS_LOOKUP:     'Consultar tipos de estudio (dropdown)',
  ESTUDIOS_VER:              'Ver estudios (legacy)',
  ESTUDIOS_CREAR:            'Registrar resultados de estudio',
  ESTUDIOS_EDITAR:           'Editar resultados de estudio',
  ESTUDIOS_ELIMINAR:         'Eliminar estudios',
  ESTUDIOS_CARGA_MASIVA:     'Cargar resultados desde un archivo',
  ESTUDIOS_TIPOS_CREAR:      'Crear tipos en catálogo de estudios',
  ESTUDIOS_TIPOS_EDITAR:     'Editar tipos en catálogo de estudios',
  ESTUDIOS_TIPOS_ELIMINAR:   'Eliminar tipos en catálogo de estudios',

  // Exámenes
  EXAMENES_LLENADO_ACCEDER:  'Tab Llenado de exámenes',
  EXAMENES_CATALOGO_ACCEDER: 'Tab Cat. Exámenes',
  EXAMENES_LOOKUP:           'Consultar exámenes (dropdown)',
  EXAMENES_VER:              'Ver exámenes (legacy)',
  EXAMENES_CREAR:            'Registrar resultados de examen',
  EXAMENES_EDITAR:           'Editar resultados de examen',
  EXAMENES_ELIMINAR:         'Eliminar resultados de examen',
  EXAMENES_CARGA_MASIVA:     'Cargar resultados desde un archivo',
  EXAMENES_CATALOGO_CREAR:   'Crear exámenes en catálogo',
  EXAMENES_CATALOGO_EDITAR:  'Editar exámenes en catálogo',
  EXAMENES_CATALOGO_ELIMINAR:'Eliminar exámenes en catálogo',

  // Citas
  CITAS_VER:                   'Ver citas',
  CITAS_CREAR:                 'Agendar citas',
  CITAS_EDITAR:                'Editar citas',
  CITAS_ELIMINAR:              'Cancelar citas',
  CITAS_CONFIGURACION_VER:     'Ver configuración de horarios',
  CITAS_CONFIGURACION_EDITAR:  'Editar configuración de horarios',

  // Cobertura
  COBERTURA_VER: 'Ver cobertura',

  // Biobanco
  BIOBANCO_VER: 'Acceder al biobanco',

  // Refrigeradores
  REFRIGERADORES_ACCEDER:  'Tab Refrigeradores',
  REFRIGERADORES_LOOKUP:   'Consultar refrigeradores y pisos (formularios)',
  REFRIGERADORES_VER:      'Ver refrigeradores (legacy)',
  REFRIGERADORES_CREAR:    'Crear refrigeradores',
  REFRIGERADORES_EDITAR:   'Editar refrigeradores',
  REFRIGERADORES_ELIMINAR: 'Eliminar refrigeradores',

  // Cajas
  CAJAS_ACCEDER: 'Tab Cajas criogénicas',
  CAJAS_LOOKUP:  'Consultar cajas y posiciones (formularios)',
  CAJAS_VER:     'Ver cajas criogénicas (legacy)',
  CAJAS_CREAR:   'Crear cajas criogénicas',
  CAJAS_EDITAR:   'Editar cajas criogénicas',
  CAJAS_ELIMINAR: 'Eliminar cajas criogénicas',

  // Muestras
  MUESTRAS_VER:      'Ver muestras',
  MUESTRAS_CREAR:    'Registrar muestras',
  MUESTRAS_EDITAR:   'Editar muestras',
  MUESTRAS_ELIMINAR: 'Eliminar muestras',
  MUESTRAS_IMPRIMIR: 'Imprimir etiquetas de muestras',

  // Tipos de muestra
  TIPOS_MUESTRA_ACCEDER: 'Tab Tipos de muestra',
  TIPOS_MUESTRA_LOOKUP:  'Consultar tipos de muestra (formularios)',
  TIPOS_MUESTRA_VER:     'Ver tipos de muestra (legacy)',
  TIPOS_MUESTRA_CREAR:   'Crear tipos de muestra',
  TIPOS_MUESTRA_EDITAR:   'Editar tipos de muestra',
  TIPOS_MUESTRA_ELIMINAR: 'Eliminar tipos de muestra',

  // Estudios de muestra
  ESTUDIOS_MUESTRA_ACCEDER:  'Tab Estudios de muestra',
  ESTUDIOS_MUESTRA_LOOKUP:   'Consultar estudios de muestra (formularios)',
  ESTUDIOS_MUESTRA_VER:      'Ver estudios de muestra (legacy)',
  ESTUDIOS_MUESTRA_CREAR:    'Crear estudios de muestra',
  ESTUDIOS_MUESTRA_EDITAR:   'Editar estudios de muestra',
  ESTUDIOS_MUESTRA_ELIMINAR: 'Eliminar estudios de muestra',

  // Traslados
  TRASLADOS_ACCEDER:   'Tab Préstamos entre instituciones',
  TRASLADOS_LOOKUP:    'Consultar estado de préstamos (MuestrasTab)',
  TRASLADOS_VER:       'Ver préstamos (legacy)',
  TRASLADOS_CREAR:     'Iniciar préstamos',
  TRASLADOS_CONFIRMAR: 'Confirmar recepción de préstamos',
  TRASLADOS_DEVOLVER:  'Devolver préstamos',
  TRASLADOS_CANCELAR:  'Cancelar préstamos',

  // Documentos
  DOCUMENTOS_VER_METADATA: 'Ver lista de documentos',
  DOCUMENTOS_DESCARGAR:    'Descargar archivos',
  DOCUMENTOS_SUBIR:        'Subir archivos',
  DOCUMENTOS_ELIMINAR:     'Eliminar archivos',

  // Somatometría
  SOMATOMETRIA_VER:      'Ver somatometría',
  SOMATOMETRIA_CREAR:    'Crear somatometría',
  SOMATOMETRIA_EDITAR:   'Editar somatometría',
  SOMATOMETRIA_ELIMINAR: 'Eliminar somatometría',

  // Usuarios
  USUARIOS_ACCEDER:        'Acceder a la pantalla de usuarios',
  USUARIOS_LOOKUP_MEDICOS: 'Consultar usuarios con rol MÉDICO (citas/estudios)',
  USUARIOS_VER:            'Ver usuarios (legacy)',
  USUARIOS_CREAR:          'Crear usuarios',
  USUARIOS_EDITAR:         'Editar usuarios',
  USUARIOS_ELIMINAR:       'Eliminar usuarios',

  // Instituciones
  INSTITUCIONES_ACCEDER:  'Acceder a la pantalla de instituciones',
  INSTITUCIONES_LOOKUP:   'Consultar instituciones (dropdowns, jerarquía)',
  INSTITUCIONES_VER:      'Ver instituciones (legacy)',
  INSTITUCIONES_CREAR:    'Crear instituciones',
  INSTITUCIONES_EDITAR:   'Editar instituciones',
  INSTITUCIONES_ELIMINAR: 'Eliminar instituciones',

  // Catálogos
  CATALOGOS_ACCEDER: 'Acceder a la pantalla de catálogos',
  UNIDADES_LOOKUP:   'Consultar unidades de medida (formularios de parámetros)',
  CATALOGOS_VER:     'Ver catálogos (legacy)',
  CATALOGOS_EDITAR:  'Editar catálogos',

  // Configuración
  CONFIGURACION_VER:    'Ver configuración',
  CONFIGURACION_EDITAR: 'Editar configuración',

  // Bitácora
  BITACORA_ACCESOS_VER:  'Ver bitácora de accesos',
  BITACORA_ACCIONES_VER: 'Ver bitácora de acciones',

  // Permisos
  PERMISOS_VER:    'Ver panel de permisos',
  PERMISOS_EDITAR: 'Editar roles y permisos',
}

/** Traduce un código a etiqueta amigable; fallback = el propio código. */
export function codigoAEtiqueta(codigo: string): string {
  return LABELS[codigo] ?? codigo
}

/** Etiquetas de módulos backend (columna `modulo` de la tabla `permiso`). */
const MODULO_LABELS: Record<string, string> = {
  DASHBOARD:        'Panel principal',
  PACIENTES:        'Participantes',
  EXPEDIENTE:       'Expediente 360',
  ESTUDIOS:         'Estudios',
  EXAMENES:         'Exámenes',
  CITAS:            'Citas',
  COBERTURA:        'Cobertura',
  BIOBANCO:         'Biobanco',
  REFRIGERADORES:   'Refrigeradores',
  CAJAS:            'Cajas criogénicas',
  MUESTRAS:         'Muestras',
  TIPOS_MUESTRA:    'Tipos de muestra',
  ESTUDIOS_MUESTRA: 'Estudios de muestra',
  TRASLADOS:        'Préstamos entre instituciones',
  DOCUMENTOS:       'Documentos',
  SOMATOMETRIA:     'Somatometría',
  USUARIOS:         'Usuarios',
  INSTITUCIONES:    'Instituciones',
  CATALOGOS:        'Catálogos',
  CONFIGURACION:    'Configuración',
  BITACORA:         'Bitácora',
  PERMISOS:         'Permisos y roles',
}

export function moduloAEtiqueta(modulo: string): string {
  return MODULO_LABELS[modulo] ?? modulo
}

/**
 * Reemplaza códigos de permiso embebidos en un texto libre por su etiqueta
 * amigable, dejando el código entre paréntesis para no perder trazabilidad.
 * Usado en la bitácora que trae detalles como "Permiso PACIENTES_CREAR concedido...".
 */
export function humanizarTextoConCodigos(texto: string): string {
  return texto.replace(/\b[A-Z][A-Z0-9_]{3,}\b/g, (match) => {
    if (LABELS[match]) {
      return `${LABELS[match]}`
    }
    return match
  })
}
