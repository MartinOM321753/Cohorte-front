/**
 * Mapa declarativo de la estructura funcional de la aplicación para el panel
 * de gestión de permisos.
 *
 * Cada sección representa un módulo visible en la sidebar; cada sub-sección
 * agrupa acciones relacionadas (usualmente una pantalla o un tab); cada
 * acción es un checkbox visible al admin que se traduce a uno o varios
 * permisos backend.
 *
 * Un mismo permiso backend puede aparecer bajo varias acciones (en distintas
 * secciones o sub-secciones). Esto es intencional: refleja la realidad de
 * que un `PACIENTES_VER` habilita tanto "ver la lista" como "ver el detalle
 * desde otra pantalla". El panel de permisos lo marca visualmente y
 * sincroniza automáticamente los checkboxes duplicados.
 */

import {
  Home, Users, Calendar, Stethoscope, FlaskConical, Warehouse,
  UserCog, Building2, FolderTree, Settings, ClipboardList, ShieldCheck,
  PieChart,
  type LucideIcon,
} from 'lucide-react'

export interface Accion {
  /** Id único dentro de la sub-sección */
  id: string
  /** Etiqueta visible al admin */
  label: string
  /** Descripción opcional que se muestra debajo del checkbox */
  descripcion?: string
  /** Permisos backend que se activan al marcar esta acción */
  permisos: string[]
  /**
   * Marca la acción como base obligatoria de su sub-sección. Cuando cualquier
   * otra acción de la misma sub-sección está activa, esta no se puede desmarcar
   * porque desactivarla revienta el mount del componente correspondiente
   * (por ejemplo, sin `MUESTRAS_VER` la tab Muestras dispara 403/401 y saca
   * al usuario aunque le hayan concedido MUESTRAS_CREAR).
   */
  imprescindible?: boolean
}

export interface Subseccion {
  id: string
  nombre: string
  descripcion?: string
  acciones: Accion[]
}

export interface Seccion {
  id: string
  nombre: string
  icono: LucideIcon
  descripcion: string
  subsecciones: Subseccion[]
}

export const SECCIONES: Seccion[] = [
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'inicio',
    nombre: 'Inicio',
    icono: Home,
    descripcion: 'Panel principal con indicadores y widgets del sistema',
    subsecciones: [
      {
        id: 'acceso',
        nombre: 'Acceso al panel',
        acciones: [
          {
            id: 'ver-panel',
            label: 'Acceder al panel principal',
            descripcion: 'Muestra la sección Inicio en la barra lateral',
            permisos: ['DASHBOARD_VER'],
          },
        ],
      },
      {
        id: 'widgets',
        nombre: 'Widgets del panel',
        descripcion: 'Cada widget se puede habilitar por separado',
        acciones: [
          {
            id: 'kpi',
            label: 'Indicadores generales (KPIs)',
            descripcion: 'Participantes activos, citas del mes, estudios, exámenes',
            permisos: ['DASHBOARD_KPI_VER'],
          },
          {
            id: 'somatometria',
            label: 'Gráficos de somatometría',
            descripcion: 'Tendencias de peso, IMC, presión arterial',
            permisos: ['DASHBOARD_SOMATOMETRIA_VER'],
          },
          {
            id: 'examenes',
            label: 'Gráficos de exámenes de laboratorio',
            descripcion: 'Distribución de exámenes y calidad de resultados',
            permisos: ['DASHBOARD_EXAMENES_VER'],
          },
          {
            id: 'biobanco',
            label: 'Ocupación del biobanco',
            descripcion: 'Capacidad de refrigeradores y cajas criogénicas',
            permisos: ['DASHBOARD_BIOBANCO_VER'],
          },
          {
            id: 'agenda',
            label: 'Agenda del día',
            descripcion: 'Citas programadas para el día actual',
            permisos: ['DASHBOARD_AGENDA_VER'],
          },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Cobertura tiene seccion propia porque COBERTURA_VER no controla solo un
  // widget: da acceso a la pagina completa que aparece en el menu lateral.
  // Estaba listada como un widget mas de Inicio, donde nadie la encontraba al
  // buscar como quitarle la seccion a alguien.
  {
    id: 'cobertura',
    nombre: 'Cobertura',
    icono: PieChart,
    descripcion: 'Indicadores de cobertura institucional',
    subsecciones: [
      {
        id: 'general',
        nombre: 'Cobertura',
        acciones: [
          {
            id: 'ver',
            label: 'Acceder a Cobertura',
            descripcion: 'Muestra la sección Cobertura en la barra lateral y habilita sus indicadores',
            permisos: ['COBERTURA_VER'],
            imprescindible: true,
          },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'participantes',
    nombre: 'Participantes',
    icono: Users,
    descripcion: 'Registro, gestión y acceso al expediente de los participantes',
    subsecciones: [
      {
        id: 'lista',
        nombre: 'Lista de participantes',
        descripcion: 'Pantalla propia. Da acceso a la sidebar "Participantes" y a la tabla paginada.',
        acciones: [
          {
            id: 'ver',
            label: 'Ver la pantalla de participantes',
            descripcion: 'Acceso al item "Participantes" en la sidebar y a la tabla completa',
            permisos: ['PACIENTES_ACCEDER', 'PACIENTES_LOOKUP', 'INSTITUCIONES_LOOKUP'],
            imprescindible: true,
          },
          { id: 'crear',    label: 'Registrar nuevo participante', permisos: ['PACIENTES_CREAR'] },
          { id: 'editar',   label: 'Editar datos',                 permisos: ['PACIENTES_EDITAR'] },
          { id: 'eliminar', label: 'Eliminar participantes',       permisos: ['PACIENTES_ELIMINAR'] },
          { id: 'importar', label: 'Importar masivamente',         permisos: ['PACIENTES_IMPORTAR'] },
          { id: 'acceso',   label: 'Crear cuenta de acceso al portal', permisos: ['PACIENTES_CREAR_ACCESO'] },
        ],
      },
      {
        id: 'expediente',
        nombre: 'Expediente 360',
        descripcion: 'Vista integral del participante y sus datos clínicos',
        acciones: [
          { id: 'ver',              label: 'Acceder al expediente',        permisos: ['EXPEDIENTE_VER'], imprescindible: true },
          { id: 'datos-personales', label: 'Ver datos personales',         permisos: ['EXPEDIENTE_DATOS_PERSONALES'] },
          { id: 'somatometria',     label: 'Ver somatometría',             permisos: ['EXPEDIENTE_SOMATOMETRIA'] },
          { id: 'resultados-lab',   label: 'Ver resultados de laboratorio', permisos: ['EXPEDIENTE_RESULTADOS_LAB'] },
          { id: 'perfil-lab',       label: 'Ver perfil de laboratorio',    permisos: ['EXPEDIENTE_PERFIL_LAB'] },
          { id: 'biobanco',         label: 'Ver muestras del biobanco',    permisos: ['EXPEDIENTE_BIOBANCO'] },
          { id: 'prueba-escalon',   label: 'Ver prueba de escalón',        permisos: ['EXPEDIENTE_PRUEBA_ESCALON'] },
          { id: 'citas',            label: 'Ver citas del participante',   permisos: ['EXPEDIENTE_CITAS'] },
          { id: 'estudios',         label: 'Ver estudios del participante', permisos: ['EXPEDIENTE_ESTUDIOS'] },
          { id: 'examenes',         label: 'Ver exámenes del participante', permisos: ['EXPEDIENTE_EXAMENES'] },
          { id: 'documentos',       label: 'Ver documentos del participante', permisos: ['EXPEDIENTE_DOCUMENTOS'] },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'citas',
    nombre: 'Citas',
    icono: Calendar,
    descripcion: 'Agenda de citas y configuración de horarios de atención',
    subsecciones: [
      {
        id: 'agenda',
        nombre: 'Agenda',
        descripcion: 'Los formularios de crear/editar cita usan lookup de participantes, médicos y tipos de estudio',
        acciones: [
          { id: 'ver',      label: 'Ver la agenda',    permisos: ['CITAS_VER'], imprescindible: true },
          {
            id: 'crear',
            label: 'Agendar citas',
            descripcion: 'Habilita el formulario de nueva cita (busca participantes, elige médico y tipo)',
            permisos: ['CITAS_CREAR', 'PACIENTES_LOOKUP', 'USUARIOS_LOOKUP_MEDICOS', 'ESTUDIOS_TIPOS_LOOKUP', 'CITAS_CONFIGURACION_VER'],
          },
          {
            id: 'editar',
            label: 'Editar citas',
            permisos: ['CITAS_EDITAR', 'PACIENTES_LOOKUP', 'USUARIOS_LOOKUP_MEDICOS', 'ESTUDIOS_TIPOS_LOOKUP'],
          },
          { id: 'eliminar', label: 'Cancelar citas',   permisos: ['CITAS_ELIMINAR'] },
        ],
      },
      {
        id: 'configuracion',
        nombre: 'Configuración de horarios',
        acciones: [
          { id: 'ver',    label: 'Ver configuración de horarios',    permisos: ['CITAS_CONFIGURACION_VER'], imprescindible: true },
          { id: 'editar', label: 'Editar configuración de horarios', permisos: ['CITAS_CONFIGURACION_EDITAR'] },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'estudios',
    nombre: 'Estudios',
    icono: Stethoscope,
    descripcion: 'Estudios médicos: llenado de resultados y catálogo de tipos',
    subsecciones: [
      {
        id: 'llenado',
        nombre: 'Llenado de estudios',
        descripcion: 'Tab "Llenado". Los formularios buscan participantes y consultan tipos de estudio sin abrir el catálogo ni la pantalla de participantes.',
        acciones: [
          {
            id: 'ver',
            label: 'Ver la tab Llenado',
            descripcion: 'Muestra la tab con la lista de estudios registrados. No abre Cat. Estudios.',
            permisos: ['ESTUDIOS_LLENADO_ACCEDER', 'ESTUDIOS_TIPOS_LOOKUP'],
            imprescindible: true,
          },
          {
            id: 'crear',
            label: 'Registrar resultados',
            descripcion: 'Habilita el formulario de nuevo estudio (busca participante + selecciona tipo)',
            permisos: ['ESTUDIOS_CREAR', 'PACIENTES_LOOKUP', 'UNIDADES_LOOKUP'],
          },
          {
            id: 'editar',
            label: 'Editar resultados',
            permisos: ['ESTUDIOS_EDITAR', 'PACIENTES_LOOKUP', 'UNIDADES_LOOKUP'],
          },
          {
            id: 'carga-masiva',
            label: 'Cargar resultados desde un archivo',
            descripcion: 'Permite subir el archivo que exporta un instrumento y registrar de golpe los resultados de muchos participantes. Se revisa antes de guardar.',
            permisos: ['ESTUDIOS_CARGA_MASIVA', 'ESTUDIOS_TIPOS_LOOKUP'],
          },
          { id: 'eliminar', label: 'Eliminar estudios',     permisos: ['ESTUDIOS_ELIMINAR'] },
        ],
      },
      {
        id: 'catalogo',
        nombre: 'Catálogo de tipos de estudio',
        descripcion: 'Tab "Cat. Estudios". Administra los tipos de estudio y sus parámetros.',
        acciones: [
          {
            id: 'ver',
            label: 'Ver la tab Cat. Estudios',
            descripcion: 'Muestra la tab de administración de tipos de estudio.',
            permisos: ['ESTUDIOS_CATALOGO_ACCEDER', 'ESTUDIOS_TIPOS_LOOKUP', 'UNIDADES_LOOKUP'],
            imprescindible: true,
          },
          { id: 'crear',    label: 'Crear tipos de estudio',  permisos: ['ESTUDIOS_TIPOS_CREAR'] },
          { id: 'editar',   label: 'Editar tipos de estudio', permisos: ['ESTUDIOS_TIPOS_EDITAR'] },
          { id: 'eliminar', label: 'Eliminar tipos de estudio', permisos: ['ESTUDIOS_TIPOS_ELIMINAR'] },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'examenes',
    nombre: 'Exámenes',
    icono: FlaskConical,
    descripcion: 'Exámenes de laboratorio: llenado de resultados y catálogo',
    subsecciones: [
      {
        id: 'llenado',
        nombre: 'Llenado de exámenes',
        descripcion: 'Tab "Llenado". Registrar resultados de exámenes de laboratorio para participantes.',
        acciones: [
          {
            id: 'ver',
            label: 'Ver la tab Llenado',
            permisos: ['EXAMENES_LLENADO_ACCEDER', 'EXAMENES_LOOKUP'],
            imprescindible: true,
          },
          {
            id: 'crear',
            label: 'Registrar resultados',
            descripcion: 'Habilita el formulario (busca participante + selecciona examen)',
            permisos: ['EXAMENES_CREAR', 'PACIENTES_LOOKUP', 'UNIDADES_LOOKUP'],
          },
          {
            id: 'editar',
            label: 'Editar resultados',
            permisos: ['EXAMENES_EDITAR', 'PACIENTES_LOOKUP', 'UNIDADES_LOOKUP'],
          },
          {
            id: 'carga-masiva',
            label: 'Cargar resultados desde un archivo',
            descripcion: 'Permite subir el archivo que entrega el laboratorio y registrar de golpe los resultados de muchos participantes. Cada columna se reconoce por los alias del examen. Se revisa antes de guardar.',
            permisos: ['EXAMENES_CARGA_MASIVA', 'EXAMENES_LOOKUP'],
          },
          { id: 'eliminar', label: 'Eliminar resultados',  permisos: ['EXAMENES_ELIMINAR'] },
        ],
      },
      {
        id: 'catalogo',
        nombre: 'Catálogo de exámenes',
        descripcion: 'Tab "Cat. Exámenes". Definir exámenes con rangos de referencia.',
        acciones: [
          {
            id: 'ver',
            label: 'Ver la tab Cat. Exámenes',
            permisos: ['EXAMENES_CATALOGO_ACCEDER', 'EXAMENES_LOOKUP', 'UNIDADES_LOOKUP'],
            imprescindible: true,
          },
          { id: 'crear',    label: 'Crear exámenes',    permisos: ['EXAMENES_CATALOGO_CREAR'] },
          { id: 'editar',   label: 'Editar exámenes',   permisos: ['EXAMENES_CATALOGO_EDITAR'] },
          { id: 'eliminar', label: 'Eliminar exámenes', permisos: ['EXAMENES_CATALOGO_ELIMINAR'] },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'biobanco',
    nombre: 'Biobanco',
    icono: Warehouse,
    descripcion: 'Sistema de almacenamiento criogénico y gestión de muestras',
    subsecciones: [
      {
        id: 'acceso',
        nombre: 'Acceso al módulo',
        acciones: [
          { id: 'ver', label: 'Acceder al biobanco', permisos: ['BIOBANCO_VER'] },
        ],
      },
      {
        id: 'refrigeradores',
        nombre: 'Refrigeradores y pisos',
        descripcion: 'Tab "Refrigeradores". Administra refrigeradores y sus pisos.',
        acciones: [
          {
            id: 'ver',
            label: 'Ver la tab Refrigeradores',
            permisos: ['REFRIGERADORES_ACCEDER', 'REFRIGERADORES_LOOKUP'],
            imprescindible: true,
          },
          { id: 'crear',    label: 'Crear refrigeradores',  permisos: ['REFRIGERADORES_CREAR'] },
          { id: 'editar',   label: 'Editar refrigeradores', permisos: ['REFRIGERADORES_EDITAR'] },
          { id: 'eliminar', label: 'Eliminar refrigeradores', permisos: ['REFRIGERADORES_ELIMINAR'] },
        ],
      },
      {
        id: 'cajas',
        nombre: 'Cajas criogénicas',
        descripcion: 'Tab "Cajas". El modal de crear caja consulta refrigeradores/pisos vía lookup.',
        acciones: [
          {
            id: 'ver',
            label: 'Ver la tab Cajas',
            permisos: ['CAJAS_ACCEDER', 'CAJAS_LOOKUP', 'REFRIGERADORES_LOOKUP'],
            imprescindible: true,
          },
          { id: 'crear',  label: 'Crear cajas',  permisos: ['CAJAS_CREAR'] },
          { id: 'editar',   label: 'Editar cajas',   permisos: ['CAJAS_EDITAR'] },
          { id: 'eliminar', label: 'Eliminar cajas', permisos: ['CAJAS_ELIMINAR'] },
        ],
      },
      {
        id: 'muestras',
        nombre: 'Muestras',
        descripcion: 'Tab "Muestras". Consulta tipos de muestra y estado de préstamos vía lookup.',
        acciones: [
          {
            id: 'ver',
            label: 'Ver la tab Muestras',
            permisos: ['MUESTRAS_VER', 'TIPOS_MUESTRA_LOOKUP', 'TRASLADOS_LOOKUP'],
            imprescindible: true,
          },
          {
            id: 'crear',
            label: 'Registrar muestras',
            descripcion: 'Habilita el formulario (busca participante + selecciona tipo)',
            permisos: ['MUESTRAS_CREAR', 'PACIENTES_LOOKUP'],
          },
          {
            id: 'editar',
            label: 'Editar muestras',
            permisos: ['MUESTRAS_EDITAR', 'CAJAS_LOOKUP'],
          },
          { id: 'eliminar', label: 'Eliminar muestras', permisos: ['MUESTRAS_ELIMINAR'] },
          {
            id: 'imprimir',
            label: 'Imprimir etiquetas',
            descripcion: 'Habilita el selector de impresora y las llamadas al servicio de impresión. Si se desmarca, la tab de muestras oculta los botones y no dispara ninguna llamada a /impresoras.',
            permisos: ['MUESTRAS_IMPRIMIR'],
          },
        ],
      },
      {
        id: 'tipos-muestra',
        nombre: 'Tipos de muestra',
        descripcion: 'Tab "Tipos de muestra" (admin).',
        acciones: [
          {
            id: 'ver',
            label: 'Ver la tab Tipos de muestra',
            permisos: ['TIPOS_MUESTRA_ACCEDER', 'TIPOS_MUESTRA_LOOKUP'],
            imprescindible: true,
          },
          { id: 'crear',  label: 'Crear tipos de muestra',  permisos: ['TIPOS_MUESTRA_CREAR'] },
          { id: 'editar',   label: 'Editar tipos de muestra',   permisos: ['TIPOS_MUESTRA_EDITAR'] },
          { id: 'eliminar', label: 'Eliminar tipos de muestra', permisos: ['TIPOS_MUESTRA_ELIMINAR'] },
        ],
      },
      {
        id: 'estudios-muestra',
        nombre: 'Estudios de muestra',
        descripcion: 'Tab "Estudios de muestra" (admin).',
        acciones: [
          {
            id: 'ver',
            label: 'Ver la tab Estudios de muestra',
            permisos: ['ESTUDIOS_MUESTRA_ACCEDER', 'ESTUDIOS_MUESTRA_LOOKUP', 'UNIDADES_LOOKUP'],
            imprescindible: true,
          },
          { id: 'crear',    label: 'Crear estudios de muestra',  permisos: ['ESTUDIOS_MUESTRA_CREAR'] },
          { id: 'editar',   label: 'Editar estudios de muestra', permisos: ['ESTUDIOS_MUESTRA_EDITAR'] },
          { id: 'eliminar', label: 'Eliminar estudios de muestra', permisos: ['ESTUDIOS_MUESTRA_ELIMINAR'] },
        ],
      },
      {
        id: 'prestamos',
        nombre: 'Préstamos entre instituciones',
        descripcion: 'Tab "Préstamos". Confirmar recepción usa lookup de cajas para asignar posición.',
        acciones: [
          {
            id: 'ver',
            label: 'Ver la tab Préstamos',
            permisos: ['TRASLADOS_ACCEDER', 'TRASLADOS_LOOKUP'],
            imprescindible: true,
          },
          {
            id: 'crear',
            label: 'Iniciar préstamos',
            permisos: ['TRASLADOS_CREAR', 'INSTITUCIONES_LOOKUP'],
          },
          {
            id: 'confirmar',
            label: 'Confirmar recepción',
            descripcion: 'Al confirmar, el modal de asignar posición consulta cajas y refrigeradores.',
            permisos: ['TRASLADOS_CONFIRMAR', 'CAJAS_LOOKUP', 'REFRIGERADORES_LOOKUP'],
          },
          { id: 'devolver',  label: 'Iniciar devolución',  permisos: ['TRASLADOS_DEVOLVER'] },
          { id: 'cancelar',  label: 'Cancelar préstamos',  permisos: ['TRASLADOS_CANCELAR'] },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'somatometria',
    nombre: 'Somatometría',
    icono: ClipboardList,
    descripcion: 'Registros de mediciones antropométricas y prueba de escalón',
    subsecciones: [
      {
        id: 'general',
        nombre: 'Somatometría',
        acciones: [
          { id: 'ver',      label: 'Ver registros',    permisos: ['SOMATOMETRIA_VER'], imprescindible: true },
          { id: 'crear',    label: 'Crear registros',  permisos: ['SOMATOMETRIA_CREAR'] },
          { id: 'editar',   label: 'Editar registros', permisos: ['SOMATOMETRIA_EDITAR'] },
          { id: 'eliminar', label: 'Eliminar registros', permisos: ['SOMATOMETRIA_ELIMINAR'] },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'documentos',
    nombre: 'Documentos',
    icono: FolderTree,
    descripcion: 'Archivos adjuntos en estudios, muestras y expedientes',
    subsecciones: [
      {
        id: 'gestion',
        nombre: 'Gestión de documentos',
        acciones: [
          {
            id: 'ver-metadata',
            label: 'Ver la lista de documentos',
            descripcion: 'Ver que existen archivos (nombre, fecha, tipo), sin descargarlos',
            permisos: ['DOCUMENTOS_VER_METADATA'],
            imprescindible: true,
          },
          {
            id: 'descargar',
            label: 'Descargar archivos',
            descripcion: 'Obtener el archivo real desde el almacenamiento',
            permisos: ['DOCUMENTOS_DESCARGAR'],
          },
          {
            id: 'subir',
            label: 'Subir nuevos archivos',
            permisos: ['DOCUMENTOS_SUBIR'],
          },
          {
            id: 'eliminar',
            label: 'Eliminar archivos',
            permisos: ['DOCUMENTOS_ELIMINAR'],
          },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'usuarios',
    nombre: 'Usuarios',
    icono: UserCog,
    descripcion: 'Gestión de cuentas de acceso al sistema',
    subsecciones: [
      {
        id: 'gestion',
        nombre: 'Cuentas de usuario',
        descripcion: 'Pantalla propia. El formulario de crear/editar consulta instituciones vía lookup.',
        acciones: [
          {
            id: 'ver',
            label: 'Ver la pantalla de usuarios',
            permisos: ['USUARIOS_ACCEDER', 'INSTITUCIONES_LOOKUP'],
            imprescindible: true,
          },
          { id: 'crear',    label: 'Crear usuarios',          permisos: ['USUARIOS_CREAR'] },
          { id: 'editar',   label: 'Editar usuarios',         permisos: ['USUARIOS_EDITAR'] },
          { id: 'eliminar', label: 'Eliminar usuarios',       permisos: ['USUARIOS_ELIMINAR'] },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'instituciones',
    nombre: 'Instituciones',
    icono: Building2,
    descripcion: 'Registro de instituciones participantes',
    subsecciones: [
      {
        id: 'gestion',
        nombre: 'Instituciones',
        descripcion: 'Pantalla propia. Los dropdowns de instituciones en otros módulos usan el LOOKUP.',
        acciones: [
          {
            id: 'ver',
            label: 'Ver la pantalla de instituciones',
            permisos: ['INSTITUCIONES_ACCEDER', 'INSTITUCIONES_LOOKUP'],
            imprescindible: true,
          },
          { id: 'crear',    label: 'Crear instituciones',  permisos: ['INSTITUCIONES_CREAR'] },
          { id: 'editar',   label: 'Editar instituciones', permisos: ['INSTITUCIONES_EDITAR'] },
          { id: 'eliminar', label: 'Eliminar instituciones', permisos: ['INSTITUCIONES_ELIMINAR'] },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'catalogos',
    nombre: 'Catálogos',
    icono: FolderTree,
    descripcion: 'Administración de unidades y copia inter-institucional',
    subsecciones: [
      {
        id: 'acceso',
        nombre: 'Acceso al módulo',
        acciones: [
          {
            id: 'ver',
            label: 'Acceder a catálogos',
            descripcion: 'Ver y administrar unidades, copia inter-institucional',
            permisos: ['CATALOGOS_ACCEDER', 'UNIDADES_LOOKUP', 'INSTITUCIONES_LOOKUP'],
            imprescindible: true,
          },
          {
            id: 'editar',
            label: 'Editar catálogos y copiar entre instituciones',
            permisos: ['CATALOGOS_EDITAR'],
          },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'configuracion',
    nombre: 'Configuración',
    icono: Settings,
    descripcion: 'Configuración global del sistema y etiquetas',
    subsecciones: [
      {
        id: 'general',
        nombre: 'Configuración general',
        acciones: [
          { id: 'ver',    label: 'Ver configuración',    permisos: ['CONFIGURACION_VER'], imprescindible: true },
          { id: 'editar', label: 'Editar configuración', permisos: ['CONFIGURACION_EDITAR'] },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'bitacora',
    nombre: 'Bitácora',
    icono: ClipboardList,
    descripcion: 'Auditoría de accesos y acciones realizadas en el sistema',
    subsecciones: [
      {
        id: 'accesos',
        nombre: 'Bitácora de accesos',
        acciones: [
          { id: 'ver', label: 'Ver bitácora de accesos', permisos: ['BITACORA_ACCESOS_VER'] },
        ],
      },
      {
        id: 'acciones',
        nombre: 'Bitácora de acciones',
        acciones: [
          { id: 'ver', label: 'Ver bitácora de acciones', permisos: ['BITACORA_ACCIONES_VER'] },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'permisos',
    nombre: 'Permisos y roles',
    icono: ShieldCheck,
    descripcion: 'Meta-permiso: quién puede administrar el panel de permisos',
    subsecciones: [
      {
        id: 'gestion',
        nombre: 'Administración de permisos',
        acciones: [
          { id: 'ver',    label: 'Ver panel de permisos', permisos: ['PERMISOS_VER'], imprescindible: true },
          { id: 'editar', label: 'Editar roles y permisos', permisos: ['PERMISOS_EDITAR'] },
        ],
      },
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Índices derivados
// ─────────────────────────────────────────────────────────────────────────────

/** Todos los permisos referenciados por al menos una acción del mapa. */
export function getPermisosDelMapa(): Set<string> {
  const s = new Set<string>()
  for (const sec of SECCIONES) {
    for (const sub of sec.subsecciones) {
      for (const acc of sub.acciones) {
        for (const p of acc.permisos) s.add(p)
      }
    }
  }
  return s
}

/**
 * Para un permiso dado, retorna todas las acciones que lo referencian.
 * Útil para: al marcar/desmarcar un checkbox, encontrar los demás que
 * también deben cambiar visualmente por sincronización.
 */
export function getUbicacionesDePermiso(codigoPermiso: string): Array<{
  seccionId: string
  seccionNombre: string
  subseccionId: string
  subseccionNombre: string
  accionId: string
  accionLabel: string
}> {
  const out: Array<{
    seccionId: string
    seccionNombre: string
    subseccionId: string
    subseccionNombre: string
    accionId: string
    accionLabel: string
  }> = []
  for (const sec of SECCIONES) {
    for (const sub of sec.subsecciones) {
      for (const acc of sub.acciones) {
        if (acc.permisos.includes(codigoPermiso)) {
          out.push({
            seccionId: sec.id,
            seccionNombre: sec.nombre,
            subseccionId: sub.id,
            subseccionNombre: sub.nombre,
            accionId: acc.id,
            accionLabel: acc.label,
          })
        }
      }
    }
  }
  return out
}

/** Verifica si una acción está "compartida" (aparece bajo otra ubicación). */
export function esAccionCompartida(codigoPermiso: string): boolean {
  return getUbicacionesDePermiso(codigoPermiso).length > 1
}

/**
 * Determina si TODOS los permisos de una acción están en el set marcado.
 * Una acción con múltiples permisos requiere que TODOS estén presentes
 * para considerarse activa.
 */
export function esAccionActiva(accion: Accion, permisosActivos: Set<string>): boolean {
  return accion.permisos.every((p) => permisosActivos.has(p))
}

/**
 * En dev, alerta sobre permisos del backend que no aparecen en el mapa.
 * Se invoca desde el panel de permisos comparando contra `/api/permisos`.
 */
export function detectarPermisosNoCategorizados(catalogoBackend: string[]): string[] {
  const enMapa = getPermisosDelMapa()
  return catalogoBackend.filter((codigo) => !enMapa.has(codigo))
}

/**
 * Elimina permisos "huérfanos" del set: permisos que pertenecen a una acción
 * cuyo conjunto completo NO está activo, y que no pertenecen a ninguna otra
 * acción activa. Permisos fuera del mapa de secciones se conservan intactos.
 *
 * Caso típico: el rol MEDICO tiene MUESTRAS_VER pero no TRASLADOS_LOOKUP.
 * La acción "Ver tab Muestras" requiere ambos, así que aparece desmarcada,
 * pero MUESTRAS_VER queda atrapado en el Set sin forma de quitarlo.
 */
export function limpiarPermisosHuerfanos(permisos: Set<string>): Set<string> {
  const limpio = new Set<string>()
  const enMapa = getPermisosDelMapa()

  for (const p of permisos) {
    if (!enMapa.has(p)) {
      limpio.add(p)
      continue
    }
    const ubicaciones = getUbicacionesDePermiso(p)
    for (const ubi of ubicaciones) {
      const sec = SECCIONES.find((s) => s.id === ubi.seccionId)
      const sub = sec?.subsecciones.find((s) => s.id === ubi.subseccionId)
      const acc = sub?.acciones.find((a) => a.id === ubi.accionId)
      if (acc && esAccionActiva(acc, permisos)) {
        limpio.add(p)
        break
      }
    }
  }

  return limpio
}

/**
 * Verifica si un permiso es requerido por al menos otra acción activa
 * distinta de la que se está desactivando. Esto evita que al desmarcar
 * una acción se elimine un permiso compartido que otra acción necesita.
 */
export function esPermisoRequeridoPorOtraAccion(
  codigoPermiso: string,
  seccionId: string,
  subseccionId: string,
  accionId: string,
  permisosActivos: Set<string>,
): boolean {
  for (const sec of SECCIONES) {
    for (const sub of sec.subsecciones) {
      for (const acc of sub.acciones) {
        if (sec.id === seccionId && sub.id === subseccionId && acc.id === accionId) continue
        if (acc.permisos.includes(codigoPermiso) && esAccionActiva(acc, permisosActivos)) {
          return true
        }
      }
    }
  }
  return false
}

/**
 * Una acción imprescindible queda bloqueada (no se puede desmarcar) cuando:
 *   1. Está marcada como `imprescindible: true` en el config
 *   2. Tiene al menos un permiso activo en `permisosActivos`
 *   3. Existe alguna OTRA acción activa dentro de la misma sub-sección
 *
 * Rationale: el "VER" de una sección es lo que permite cargar la vista base.
 * Si el admin concede CREAR/EDITAR pero desmarca VER, el componente monta,
 * dispara su fetch principal, recibe 403 y (peor) puede caer en el interceptor
 * de axios que lo confunde con sesión inválida → logout.
 */
export function esAccionImprescindibleBloqueada(
  subseccion: Subseccion,
  accion: Accion,
  permisosActivos: Set<string>,
): boolean {
  if (!accion.imprescindible) return false
  if (!esAccionActiva(accion, permisosActivos)) return false
  return subseccion.acciones.some(
    (a) => a.id !== accion.id && esAccionActiva(a, permisosActivos),
  )
}
