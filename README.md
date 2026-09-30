# IMSS Cohorte - Sistema de Gestión de Investigación Clínica

Frontend profesional para un sistema de gestión de cohortes médicas y investigación clínica, integrado con un backend Spring Boot.

## 🚀 Características

- **Autenticación segura** con JWT Bearer tokens en memoria
- **5 roles de usuario** con permisos diferenciados (Administrador, Médico, Laboratorista, Recepcionista, Paciente)
- **Módulos especializados**:
  - Gestión de Pacientes (CRUD completo)
  - Estudios Médicos con **Form Engine dinámico**
  - Exámenes de Laboratorio
  - Prueba Escalón
  - Biobanco (Muestras, Refrigeradores, Cajas Criogénicas)
  - Administración de Usuarios
  - Configuración del Sistema
- **Componentes reutilizables** basados en shadcn/ui
- **DataTable** con paginación server-side ready
- **Progressive Web App (PWA)** - Instalable en dispositivos móviles
- **Responsive Design** - Mobile-first
- **Validación de formularios** con React Hook Form + Zod
- **Toasts y notificaciones** con Sonner
- **Caché inteligente** con React Query (TanStack Query)

## 🛠️ Tech Stack

- **React 18** + TypeScript (strict mode)
- **Vite** - Build tool ultrarrápido
- **React Router v6** - Rutas anidadas sin IDs sensibles en URLs
- **TailwindCSS 4** - Diseño minimalista y profesional
- **shadcn/ui** - Componentes UI accesibles
- **Zustand** - Estado global (auth, preferencias)
- **Axios** - HTTP client con interceptors JWT
- **React Query** - Data fetching y sincronización
- **TanStack Table** - Tablas profesionales
- **Zod** - Validación de esquemas
- **Framer Motion** - Animaciones suaves

## 📦 Instalación

### Requisitos
- Node.js 18+
- pnpm (recomendado) o npm/yarn

### Pasos

1. **Clonar el repositorio**
   ```bash
   git clone <repository-url>
   cd imss-cohorte-frontend
   ```

2. **Instalar dependencias**
   ```bash
   pnpm install
   # o
   npm install
   ```

3. **Configurar variables de entorno**
   ```bash
   cp .env.example .env.local
   # Editar .env.local con tu configuración
   ```

4. **Iniciar servidor de desarrollo**
   ```bash
   pnpm dev
   ```
   Acceso: `http://localhost:5173`

### Variables de Entorno

```env
# URL de la API del backend
VITE_API_URL=http://localhost:8080/api

# Configuración de la aplicación
VITE_APP_NAME=IMSS Cohorte
VITE_APP_VERSION=1.0.0

# Características
VITE_ENABLE_PWA=true
VITE_DEBUG_MODE=false
```

## 📁 Estructura del Proyecto

```
src/
├── app/                    # Configuración de la aplicación
│   └── App.tsx            # Componente raíz con providers
├── assets/                # Recursos estáticos
├── components/            # Componentes reutilizables globales
│   ├── layout/           # Sidebar, Header, AppLayout
│   ├── tables/           # DataTable genérico
│   ├── forms/            # FormEngine dinámico
│   ├── dialogs/          # ConfirmDialog, etc.
│   ├── routes/           # ProtectedRoute, RoleGuard
│   └── ui/               # Componentes base (shadcn)
├── features/              # Módulos de negocio (feature-based)
│   ├── auth/             # Autenticación
│   ├── pacientes/        # Gestión de pacientes
│   │   ├── api/         # Llamadas API
│   │   ├── hooks/       # Custom hooks
│   │   ├── schemas/     # Validación Zod
│   │   ├── components/  # UI components
│   │   ├── pages/       # Páginas enrutables
│   │   └── types/       # Tipos TypeScript
│   ├── estudios/         # Estudios médicos con Form Engine
│   ├── dashboard/        # Panel principal
│   └── errors/           # Páginas de error
├── hooks/                 # Hooks globales reutilizables
├── lib/                   # Utilidades y configuración
│   ├── axiosInstance.ts  # Axios + JWT + APIResponse handling
│   ├── queryClient.ts    # React Query config
│   └── utils.ts          # Helper functions
├── routes/               # Definición de rutas
│   └── Router.tsx        # Configuración React Router
├── stores/               # Zustand stores
│   └── authStore.ts      # Auth state + role management
├── styles/               # CSS global
│   └── globals.css       # TailwindCSS + design tokens
└── types/                # Tipos globales
    └── api.ts            # Interfases de API
```

## 🔐 Autenticación

### Flujo de Login
1. Usuario ingresa credenciales en `/login`
2. POST `/api/auth/login` → Retorna `{ token, usuario }`
3. Token se almacena **en memoria** (Zustand authStore)
4. Axios interceptor inyecta `Authorization: Bearer <token>` automáticamente
5. Al cerrar sesión o 401 → Limpia store y redirige a login

### Protección de Rutas
```tsx
// Proteger por autenticación
<ProtectedRoute>
  <PacientesPage />
</ProtectedRoute>

// Proteger por rol
<ProtectedRoute requiredRoles={['MEDICO', 'ADMINISTRADOR']}>
  <EstudiosPage />
</ProtectedRoute>

// Renderizado condicional dentro de componentes
<RoleGuard role="ADMINISTRADOR">
  <AdminPanel />
</RoleGuard>
```

## 📋 Módulos Implementados

### 1. **Pacientes** (Completo)
- ✅ Listado con búsqueda
- ✅ CRUD (Create, Read, Update, Delete)
- ✅ Detail drawer lateral
- ✅ Modal de confirmación para eliminar
- ✅ Validación completa con Zod
- ✅ DataTable con columnas de acciones

**Archivos clave:**
- `src/features/pacientes/api/pacientes.api.ts`
- `src/features/pacientes/pages/PacientesPage.tsx`
- `src/features/pacientes/components/PacientesTable.tsx`

### 2. **Estudios Médicos** (Con Form Engine)
- ✅ Gestión de tipos de estudios dinámicos
- ✅ **Form Engine** que genera formularios automáticamente
- ✅ Soporte para parámetros: Numérico, Texto, Booleano, Grupo
- ✅ Adjuntos de archivos (PDF, imágenes)
- ✅ Validación dinámica

**Características especiales:**
```typescript
// El Form Engine lee parámetros del backend y genera campos automáticamente
<FormEngine
  parametros={parametros}  // Array de ParametroEstudio
  onSubmit={handleSubmit}
/>

// Soporta múltiples tipos dinámicamente
// - NUMERICO: Input type="number"
// - TEXTO: Input type="text"
// - BOOLEANO: Checkbox
// - GRUPO: Input para categorización
```

### 3. **Biobanco** (Estructura lista)
- Visualización de Refrigeradores → Pisos → Cajas → Posiciones
- Grid 2D interactivo para posiciones
- API completamente tipada

### 4. **Dashboard** (Principal)
- Bienvenida personalizada por usuario
- Cards de resumen (pacientes activos, citas, estudios, etc.)
- Contenido dinámico por rol

### 5. **Administración**
- Gestión de usuarios
- Configuración del sistema

## 🧠 Patrones Clave

### API Wrapper
Todas las llamadas API están centralizadas en archivos `*.api.ts`:
```typescript
// src/features/pacientes/api/pacientes.api.ts
export async function getPacientes() {
  const response = await axiosInstance.get('/pacientes')
  return response as any as Paciente[]
}
```

### Hooks Custom
Cada módulo expone hooks de React Query:
```typescript
// src/features/pacientes/hooks/useGetPacientes.ts
export function useGetPacientes(params?: { buscar?: string }) {
  return useQuery({
    queryKey: ['pacientes', params],
    queryFn: () => getPacientes(params),
    staleTime: 5 * 60 * 1000,
  })
}
```

### Validación con Zod
```typescript
// src/features/pacientes/schemas/paciente.schema.ts
export const pacienteFormSchema = z.object({
  folio: z.string().min(1, 'El folio es requerido'),
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email válido requerido'),
  // ...
})
```

### Form Engine Dinámico
El Form Engine es un componente que acepta un array de parámetros y genera
campos automáticamente:

```typescript
interface ParametroEstudio {
  id: number
  nombre: string
  tipo: 'NUMERICO' | 'TEXTO' | 'BOOLEANO' | 'GRUPO'
  unidad?: string
}

// Uso:
<FormEngine parametros={parametros} onSubmit={onSubmit} />

// Genera campos basándose en tipo:
// NUMERICO → <input type="number" />
// TEXTO → <input type="text" />
// BOOLEANO → <input type="checkbox" />
// GRUPO → <input type="text" /> para categorización
```

## 🎨 Diseño y Estilos

### Design Tokens
Configurados en `src/styles/globals.css`:
- **Primary**: Blue (#0B63F5)
- **Accent**: Cyan/Teal
- **Neutral**: Slate grays
- **Danger**: Red
- **Success**: Green
- **Warning**: Amber

### Paleta Profesional Médica
- Tonos azules/grises fríos → Confianza y profesionalismo
- Espacios en blanco generosos → Claridad
- Sin decoraciones excesivas → Legibilidad máxima

### Responsive
- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Sidebar colapsable en mobile

## 🔄 Flujos Principales

### Crear Paciente
1. Click "Nuevo Paciente" → Abre modal
2. Formulario con validación Zod
3. Submit → `useCreatePaciente().mutate()`
4. React Query invalida `['pacientes']`
5. Tabla se recarga automáticamente
6. Toast de éxito

### Ver Detalle Paciente
1. Click icono "Ver" en tabla
2. Abre drawer lateral con `<PacienteDetailDrawer />`
3. Muestra información completa
4. Puede editar o eliminar desde aquí

### Eliminar Paciente
1. Click icono "Eliminar"
2. Modal de confirmación (`<ConfirmDialog />`)
3. Si confirma → `useDeletePaciente().mutate()`
4. React Query invalida caché
5. Tabla se actualiza

## 📊 DataTable Component

Componente `<DataTable />` genérico y reutilizable:

```typescript
<DataTable
  columns={columns}           // ColumnDef<T>[]
  data={data}                // T[]
  isLoading={isLoading}      // boolean
  onRowClick={handleRowClick} // (row: T) => void
  manualPagination={false}   // boolean (para server-side)
  pageSize={10}              // number
/>
```

**Características:**
- Skeleton loading states
- Empty state messages
- Pagination controls
- Row click handlers
- Responsive columns

## 🧪 Testing

El proyecto está listo para testing:
- Setup de Jest/Vitest (agregar si se necesita)
- React Testing Library compatible
- Hooks testables con `@testing-library/react`

## 🚀 Deployment

### Build para Producción
```bash
pnpm build
# Genera: dist/
```

### Vercel (Recomendado)
```bash
vercel deploy
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN pnpm install
COPY . .
RUN pnpm build
EXPOSE 5173
CMD ["pnpm", "preview"]
```

## 📚 Documentación de Endpoints

Todos los endpoints están documentados en `src/types/api.ts` con interfaces TypeScript completas.

### Ejemplo: Pacientes
```
GET    /api/pacientes              → Listar todos
GET    /api/pacientes/activos      → Listar activos
GET    /api/pacientes/{id}         → Detalle por ID
GET    /api/pacientes/uuid/{uuid}  → Búsqueda por UUID
GET    /api/pacientes/folio/{folio} → Búsqueda por folio
POST   /api/pacientes              → Crear
PUT    /api/pacientes/{id}         → Actualizar
DELETE /api/pacientes/{id}         → Eliminar (soft delete)
```

## 🔧 Configuración Avanzada

### Cambiar URL del Backend
`.env.local`:
```env
VITE_API_URL=https://api.tudominio.com/api
```

### Habilitar/Deshabilitar PWA
`.env.local`:
```env
VITE_ENABLE_PWA=false
```

### Debug Mode
`.env.local`:
```env
VITE_DEBUG_MODE=true
```

## 🤝 Contribución

Este proyecto está diseñado para ser fácil de extender:

1. **Crear nuevo módulo**: Crear carpeta en `src/features/nuevo-modulo/`
2. **Implementar API**: `api/nuevo-modulo.api.ts`
3. **Crear hooks**: `hooks/useGetNuevoModulo.ts`
4. **Agregar componentes**: `components/NuevoModuloTable.tsx`
5. **Crear página**: `pages/NuevoModuloPage.tsx`
6. **Agregar ruta**: Actualizar `src/routes/Router.tsx`

## 📞 Soporte

Para problemas o preguntas:
1. Revisar documentación de [React](https://react.dev)
2. Revisar documentación de [TailwindCSS](https://tailwindcss.com)
3. Revisar documentación de [shadcn/ui](https://ui.shadcn.com)
4. Contactar al equipo de desarrollo

## 📄 Licencia

Proyecto propietario - Prohibida su distribución sin autorización.

---

**Desarrollado con ❤️ para IMSS - Sistema de Investigación Clínica**
**Versión 1.0.0**
