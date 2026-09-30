# Arquitectura IMSS Cohorte Frontend

Documento de referencia para entender la arquitectura del frontend de IMSS Cohorte.

## 📐 Principios de Diseño

1. **Feature-Based Architecture**: Cada módulo es autosuficiente y contiene todo lo necesario (API, hooks, componentes, schemas, tipos)
2. **Clean Code**: Separación clara entre presentación, lógica y datos
3. **Type Safety**: TypeScript strict mode en todo el proyecto
4. **DRY (Don't Repeat Yourself)**: Componentes reutilizables, no duplicación
5. **Security First**: JWT en memoria, no localStorage, CSRF protection ready
6. **Performance**: React Query para caché inteligente, lazy loading por rutas, memoización

## 🏗️ Capas de la Aplicación

```
┌─────────────────────────────────────────┐
│         Componentes UI (React)          │ ← Presentación
├─────────────────────────────────────────┤
│     Hooks & Custom Logic (React)        │ ← Lógica de negocio
├─────────────────────────────────────────┤
│   React Query + Zustand (Estado)        │ ← Gestión de estado
├─────────────────────────────────────────┤
│      Axios + Interceptores (HTTP)       │ ← Comunicación
├─────────────────────────────────────────┤
│        Spring Boot Backend (API)        │ ← Persistencia
└─────────────────────────────────────────┘
```

## 🎯 Flujo de Datos

### Ejemplo: Obtener lista de pacientes

```
1. Usuario navega a /pacientes
   ↓
2. PacientesPage.tsx renderiza
   ↓
3. useGetPacientes() hook hace fetch
   ↓
4. React Query llama a getPacientes() en API
   ↓
5. getPacientes() usa axiosInstance.get('/pacientes')
   ↓
6. Axios interceptor agrega: Authorization: Bearer <token>
   ↓
7. Response interceptor parsea APIResponse { data, message, status, error }
   ↓
8. React Query cachea los datos
   ↓
9. Componente PacientesTable renderiza con datos
   ↓
10. Usuario puede interactuar (click, editar, eliminar)
```

## 📦 Estructura de Feature

Cada feature en `src/features/<nombre>/` sigue este patrón:

```
features/pacientes/
├── api/
│   └── pacientes.api.ts              ← Llamadas HTTP (nunca axios directo en componentes)
├── hooks/
│   ├── useGetPacientes.ts            ← React Query queries
│   └── useCreatePaciente.ts          ← React Query mutations
├── schemas/
│   └── paciente.schema.ts            ← Validación Zod
├── types/
│   └── paciente.types.ts             ← Tipos locales
├── components/
│   ├── PacientesTable.tsx            ← Tabla con listado
│   ├── PacienteFormModal.tsx         ← Modal de creación/edición
│   ├── PacienteDetailDrawer.tsx      ← Drawer de detalle
│   └── index.ts                      ← Barrel export
├── pages/
│   └── PacientesPage.tsx             ← Página enruteable
└── index.ts                          ← Barrel export (opcional)
```

### ¿Por qué esta estructura?

- **api/** - Aislamiento de la lógica HTTP. Si la API cambia, solo cambias aquí
- **hooks/** - Reutilización de lógica. Múltiples componentes pueden usar el mismo hook
- **schemas/** - Validación centralizada. Un único punto de verdad para validar
- **types/** - Tipos TypeScript locales. Interfases del dominio
- **components/** - UI reutilizable. Componentes puros sin lógica de negocio
- **pages/** - Contenedores. Conectan componentes con hooks y data

## 🔄 Patrones Clave

### 1. API Layer Pattern

```typescript
// ✅ CORRECTO: Toda la lógica HTTP centralizada
// src/features/pacientes/api/pacientes.api.ts
export async function getPacientes() {
  const response = await axiosInstance.get('/pacientes')
  return response as any as Paciente[]
}

// ✅ Usar desde componentes:
// src/features/pacientes/hooks/useGetPacientes.ts
export function useGetPacientes() {
  return useQuery({
    queryKey: ['pacientes'],
    queryFn: getPacientes,
  })
}

// ❌ INCORRECTO: Hacer llamadas HTTP directamente en componentes
// const [data, setData] = useState([])
// useEffect(() => {
//   axiosInstance.get('/pacientes').then(res => setData(res))
// }, [])
```

### 2. Hook Composition Pattern

```typescript
// ✅ CORRECTO: Componer hooks para lógica compleja
export function usePacientesWithFilters(searchTerm: string) {
  const [filteredData, setFilteredData] = useState([])
  const { data, isLoading } = useGetPacientes()

  useEffect(() => {
    if (data) {
      setFilteredData(data.filter(p => 
        p.persona.nombre.includes(searchTerm)
      ))
    }
  }, [data, searchTerm])

  return { data: filteredData, isLoading }
}

// ❌ INCORRECTO: Duplicar toda la lógica en múltiples componentes
```

### 3. Type Safety Pattern

```typescript
// ✅ CORRECTO: Tipos explícitos
import { Paciente, PacienteRequestDTO } from '@/types/api'

export async function createPaciente(
  data: PacienteRequestDTO
): Promise<Paciente> {
  const response = await axiosInstance.post('/pacientes', data)
  return response as any as Paciente
}

// ❌ INCORRECTO: Any type o tipos implícitos
export async function createPaciente(data: any): Promise<any> {
  // ...
}
```

### 4. React Query Pattern

```typescript
// ✅ CORRECTO: Usar React Query para queries
export function useGetPacientes() {
  return useQuery({
    queryKey: ['pacientes'],      // Unique key
    queryFn: getPacientes,          // Fetch function
    staleTime: 5 * 60 * 1000,      // 5 min before refetch
    gcTime: 10 * 60 * 1000,         // Keep in cache 10 min
    retry: 1,                       // Retry once on failure
  })
}

// ✅ CORRECTO: Usar React Query para mutations
export function useCreatePaciente() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createPaciente,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pacientes'] })
      toast.success('Paciente creado')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message)
    },
  })
}

// ❌ INCORRECTO: Hacer fetch manualmente con useState/useEffect
const [loading, setLoading] = useState(false)
const [error, setError] = useState(null)
useEffect(() => {
  setLoading(true)
  getPacientes()
    .then(setData)
    .catch(setError)
    .finally(() => setLoading(false))
}, [])
```

### 5. Zod Validation Pattern

```typescript
// ✅ CORRECTO: Validación declarativa con Zod
const schema = z.object({
  folio: z.string().min(1, 'Requerido'),
  email: z.string().email('Email válido requerido'),
})

export function PacienteForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  })

  return <form onSubmit={handleSubmit(onSubmit)}>...</form>
}

// ❌ INCORRECTO: Validación manual
if (!folio) setError('Folio requerido')
if (!email.includes('@')) setError('Email inválido')
```

## 🔐 Autenticación en Detalle

### Login Flow

```
1. Usuario abre /login
2. Completa formulario (username, password)
3. Submit → loginUser({ username, password })
4. Axios POST /auth/login
5. Backend retorna: { token: "jwt...", usuario: { ... } }
6. useAuthStore.login({ token, usuario })
   ├─ Zustand guarda token EN MEMORIA
   ├─ Zustand guarda usuario
   └─ Zustand setea isAuthenticated = true
7. Navigator redirige a /dashboard
8. Todas las requests posteriores llevan: Authorization: Bearer <token>
```

### Token Refresh (Preparado)

```typescript
// En axiosInstance.ts - Response interceptor
if (error.response?.status === 401) {
  // Token expirado
  const newToken = await refreshToken(token)
  // Retry request con nuevo token
  // Si refresh falla → logout y redirect /login
}
```

### Logout Flow

```
1. Usuario click "Cerrar Sesión"
2. useAuthStore.logout()
   ├─ Limpia token
   ├─ Limpia usuario
   └─ Setea isAuthenticated = false
3. Redirect a /login
4. ProtectedRoute bloquea acceso a /dashboard
```

### Role-Based Access Control (RBAC)

```typescript
// En useAuthStore
hasRole(role: UserRole | UserRole[]): boolean {
  // Verifica si usuario actual tiene rol requerido
  return user.rol.nombre === role || 
         (Array.isArray(role) && role.includes(user.rol.nombre))
}

// En componentes
<ProtectedRoute requiredRoles={['ADMINISTRADOR']}>
  <AdminPanel /> {/* Solo si usuario es ADMINISTRADOR */}
</ProtectedRoute>

<RoleGuard role="MEDICO">
  <MedicoFeature /> {/* Render condicional por rol */}
</RoleGuard>
```

## 📊 State Management

### Zustand Auth Store

```typescript
// Eventos de autenticación
useAuthStore.subscribe((state) => {
  console.log('Auth state changed:', state)
})

// Desde cualquier componente
const { user, logout, hasRole } = useAuthStore()

// Acceso desde APIs
const { token } = useAuthStore.getState()
```

### React Query Cache

```typescript
// Invalidar manualmente
queryClient.invalidateQueries({ queryKey: ['pacientes'] })

// Prefetch data
queryClient.prefetchQuery({
  queryKey: ['pacientes', 1],
  queryFn: () => getPacienteById(1),
})

// Clear entire cache
queryClient.clear()
```

## 🧩 Component Composition

### Container Component Pattern

```typescript
// PacientesPage.tsx - Container (Smart)
export default function PacientesPage() {
  const { data, isLoading } = useGetPacientes()
  const [searchTerm, setSearchTerm] = useState('')

  return (
    <>
      <SearchBar value={searchTerm} onChange={setSearchTerm} />
      <PacientesTable data={data} isLoading={isLoading} />
    </>
  )
}

// PacientesTable.tsx - Presentation (Dumb)
export function PacientesTable({ data, isLoading }) {
  return (
    <table>
      {/* Renderiza data, NO sabe cómo obtenerla */}
    </table>
  )
}
```

### Props Drilling vs Context

```typescript
// ✅ Props drilling es OK para 2-3 niveles
<PacientesPage>
  <PacientesTable pacientes={pacientes}>
    <PacientesRow paciente={paciente} />
  </PacientesTable>
</PacientesPage>

// ✅ Para más niveles: usar Context o RoleGuard
<RoleGuard role="ADMIN">
  {/* Acceso a información de rol sin pasar por props */}
</RoleGuard>
```

## 🚀 Performance Optimizations

### 1. Lazy Loading de Rutas
```typescript
// Router.tsx
const PacientesPage = lazy(() => import('@/features/pacientes/pages/PacientesPage'))

// Auto code-splitting por route
```

### 2. Memoización
```typescript
// Memoizar componentes complejos
const PacientesTable = memo(function PacientesTable({ data }) {
  return <DataTable columns={columns} data={data} />
}, (prev, next) => prev.data === next.data)

// Memoizar callbacks
const handleDelete = useCallback((id) => {
  deleteMutation.mutate(id)
}, [deleteMutation])
```

### 3. React Query Caching
```typescript
staleTime: 5 * 60 * 1000       // Datos frescos por 5 min
gcTime: 10 * 60 * 1000          // Guardar en memoria 10 min
retry: 1                        // Un solo reintento
refetchOnWindowFocus: false     // No refetch cuando usuario vuelve a tab
```

## 🛡️ Manejo de Errores

### API Errors
```typescript
// axiosInstance.ts - Response interceptor
(error: AxiosError<APIError>) => {
  if (error.response?.status === 401) logout()        // Unauthorized
  if (error.response?.status === 403) redirect403()   // Forbidden
  if (error.response?.status === 404) showNotFound()  // Not found
  if (error.response?.status === 500) showError()     // Server error
}
```

### UI Errors
```typescript
// Validación en tiempo real con Zod
const errors = formState.errors
{errors.email && <p className="text-red-600">{errors.email.message}</p>}

// Toasts para feedback
toast.error('Error al crear paciente')
toast.success('Paciente creado exitosamente')
```

### Error Boundaries
```typescript
// ErrorBoundary component (future)
<ErrorBoundary>
  <PacientesPage />
</ErrorBoundary>
```

## 🔧 Extensibilidad

### Agregar Nuevo Módulo

1. Crear carpeta `src/features/nuevo-modulo/`
2. Crear estructura estándar:
   ```
   nuevo-modulo/
   ├── api/nuevo-modulo.api.ts
   ├── hooks/useGetNuevoModulo.ts
   ├── schemas/nuevo-modulo.schema.ts
   ├── types/nuevo-modulo.types.ts
   ├── components/NuevoModuloTable.tsx
   ├── pages/NuevoModuloPage.tsx
   └── index.ts
   ```
3. Agregar tipos en `src/types/api.ts`
4. Agregar ruta en `src/routes/Router.tsx`
5. Agregar en sidebar en `src/components/layout/Sidebar.tsx`

### Agregar Nuevo Componente Reutilizable

```typescript
// src/components/custom/MiComponente.tsx
export interface MiComponenteProps {
  prop1: string
  prop2: number
}

export function MiComponente({ prop1, prop2 }: MiComponenteProps) {
  return <div>{prop1}: {prop2}</div>
}

// Barrel export en src/components/custom/index.ts
export { MiComponente }
export type { MiComponenteProps }
```

## 📈 Debugging

### Herramientas
```typescript
// React Query DevTools
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

// Redux DevTools compatible con Zustand
import { subscribeWithSelector } from 'zustand/middleware'

// Console logs
console.log('[v0] User data:', user)
console.log('[v0] API response:', response)
```

### Network Debugging
- DevTools → Network → Filtrar por "Fetch/XHR"
- Ver headers Authorization
- Revisar response APIResponse format

## ✅ Checklist para Producción

- [ ] Cambiar VITE_API_URL a backend real
- [ ] Desactivar VITE_DEBUG_MODE
- [ ] Configurar CORS en backend
- [ ] Configurar HTTPS
- [ ] Establecer política de refresh token
- [ ] Configurar PWA manifest
- [ ] Setup de monitoring (Sentry)
- [ ] Pruebas e2e (Cypress/Playwright)
- [ ] Pruebas unitarias (Vitest)
- [ ] Performance testing (Lighthouse)

---

**Documentación de referencia - IMSS Cohorte Frontend v1.0**
