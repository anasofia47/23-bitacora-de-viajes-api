# Reglas de Antigravity AI — 23 · Bitácora de Viajes y Caminatas (API)

> **Asistente configurado:** Google Antigravity (AGY)
> **Repositorio:** `23-bitacora-de-viajes-api`
> **Rol:** Backend / API Serverless desplegada en Vercel que media la autenticación con Firebase Auth, el almacenamiento de datos en Firestore (Admin SDK) y la carga de imágenes en Vercel Blob.

---

## 1. Stack Tecnológico y Comandos

- **Framework:** Next.js (App Router) con Route Handlers (`app/api/**/route.ts`)
- **Runtime:** Node.js (`export const runtime = "nodejs"` obligatorio en cada Route Handler que use `firebase-admin`)
- **Lenguaje:** TypeScript estricto (`strict: true`)
- **Base de datos y Auth:** `firebase-admin` (Authentication + Cloud Firestore)
- **Almacenamiento de imágenes:** `@vercel/blob`
- **Validación de esquemas:** `zod`
- **Pruebas unitarias e integración:** `vitest`

### Comandos oficiales del proyecto
- `npm run dev` — Inicia el servidor de desarrollo de Next.js.
- `npm run build` — Compila la aplicación para producción.
- `npm run lint` — Ejecuta el linter para verificar reglas de estilo y calidad.
- `npm run typecheck` — Verifica tipos con TypeScript (`tsc --noEmit`).
- `npm test` — Ejecuta la suite de pruebas con Vitest (`vitest run`).
- `node ia/verify-ai-security.mjs` — Ejecuta las pruebas automatizadas de seguridad y restricciones de la configuración de Antigravity.

---

## 2. Estructura del Proyecto

```text
23-bitacora-de-viajes-api/
├── .agents/
│   ├── hooks.json                  # Hooks de ciclo de vida de Antigravity (PreToolUse / PostToolUse)
│   ├── rules/
│   │   └── security-and-quality.md # Reglas modulares de seguridad y calidad
│   └── scripts/
│       └── security-guard.mjs      # Guardia de seguridad ejecutado en PreToolUse
├── app/
│   └── api/
│       ├── health/route.ts         # GET /api/health
│       ├── auth/
│       │   ├── registro/route.ts   # POST /api/auth/registro
│       │   ├── login/route.ts      # POST /api/auth/login
│       │   ├── refresh/route.ts    # POST /api/auth/refresh
│       │   └── yo/route.ts         # GET /api/auth/yo
│       ├── viaje/
│       │   ├── route.ts            # GET /api/viaje?since=<ISO>
│       │   └── [id]/route.ts       # PUT /api/viaje/[id], DELETE /api/viaje/[id]
│       ├── viajes/
│       │   └── estadisticas/route.ts # GET /api/viajes/estadisticas
│       └── imagenes/
│           └── route.ts            # POST /api/imagenes, DELETE /api/imagenes?url=
├── lib/
│   ├── firebase-admin.ts           # Inicialización singleton de Firebase Admin SDK
│   ├── auth.ts                     # Verificación de Bearer ID Token y claims de rol
│   ├── errors.ts                   # Respuestas de error normalizadas { error, detalles? }
│   ├── rate-limit.ts               # Limitador de tasa de intentos de login
│   └── schemas.ts                  # Esquemas Zod (auth, viaje, ruta, fotos)
├── tests/                          # Pruebas de rutas en Vitest (401, 400, 403/aislamiento)
├── ia/                             # Evidencias de configuración de Antigravity y Bitácora de IA
├── firestore.rules                 # Reglas de Firestore: allow read, write: if false;
├── firestore.indexes.json          # Índices compuestos de Firestore
├── GEMINI.md                       # Instrucciones principales para Antigravity
└── AGENTS.md                       # Enlace compatible con agentes basados en AGENTS.md
```

---

## 3. Lo que SÍ y lo que NO debe hacer Antigravity

### Lo que SÍ debe hacer:
1. **Validar todas las entradas con Zod:** Solo se persisten los campos declarados en el esquema; descartar cualquier campo adicional enviado por el cliente.
2. **Extraer `uid` exclusivamente del ID Token verificado:** Llamar siempre a `getAuth().verifyIdToken(token)` y tomar `decoded.uid`. Jamás confiar en un `uid` enviado en el body o query.
3. **Respetar las convenciones de Firestore:**
   - Rutas de aislamiento por usuario: `usuarios/{uid}/viaje/{id}`.
   - Nombres de campos en `snake_case` idénticos a SQLite (`nombre`, `inicio`, `fin`, `metros`, `desnivel_pos_m`, `altitud_max_m`, `pasos`, `ruta`, `fotos`).
   - Fechas en texto ISO 8601 UTC (`YYYY-MM-DDTHH:mm:ss.sssZ`).
   - Nunca enviar `undefined` a Firestore (usar `null`).
   - Campos de auditoría puestos por el servidor: `created_at`, `updated_at`, `deleted_at`.
   - En transacciones de Firestore, ejecutar **todas las lecturas antes que las escrituras**.
4. **Simplificar y acotar rutas:** Verificar que `ruta` tenga como máximo 1500 puntos para no superar el límite de 1 MiB por documento en Firestore.
5. **Formato estándar de errores:** Devolver `{ "error": "mensaje", "detalles"?: [{ "campo", "mensaje" }] }` con códigos HTTP semánticos (`400`, `401`, `403`, `404`, `409`, `413`, `415`, `429`) y `500` con `{ "error": "Error interno" }` sin exponer trazas ni detalles internos.

### Lo que NO debe hacer (Restricciones Estrictas):
1. **PROHIBIDO leer archivos de secretos:** Antigravity no puede leer `.env`, `.env.local`, `.env.production`, archivos `*.pem`, `*.key`, `*.keystore`, `*.jks`, ni credenciales JSON de cuentas de servicio (`*firebase-adminsdk*.json`).
2. **PROHIBIDO salir de la carpeta del repositorio:** Ninguna operación de lectura/escritura o comando puede acceder a rutas fuera de la raíz de `23-bitacora-de-viajes-api` (bloqueo de `..` y rutas absolutas externas).
3. **PROHIBIDO ejecutar acciones con efecto externo sin permiso (`ask`):** Comandos como `git push`, `vercel deploy`, `npm publish` o eliminaciones remotas requieren confirmación explícita del usuario mediante el hook `PreToolUse`.
4. **PROHIBIDO registrar datos sensibles en logs:** Nunca hacer `console.log` o `console.error` de contraseñas, tokens JWT, `refreshToken` o claves privadas.
