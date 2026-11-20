# 23 · Bitácora de Viajes y Caminatas — API (`23-bitacora-de-viajes-api`)

API Serverless construida con **Next.js (App Router, Route Handlers con `runtime = "nodejs"`)**, **Firebase Admin SDK** (Authentication + Cloud Firestore), **Vercel Blob** y **Zod**, probada con **Vitest**.

---

## 1. Arquitectura y Seguridad

- **Regla de oro:** La app móvil no contiene `firebaseConfig` ni ninguna credencial. Todas las claves (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_WEB_API_KEY`, `BLOB_READ_WRITE_TOKEN`) viven únicamente en las variables de entorno del proyecto en Vercel.
- **Firestore blindado:** `firestore.rules` niega todo acceso directo desde clientes (`allow read, write: if false;`). Todo acceso pasa por esta API tras verificar el ID Token con `getAuth().verifyIdToken()`.
- **Aislamiento por ruta:** Los viajes de cada usuario se almacenan en `usuarios/{uid}/viaje/{id}`, donde `uid` se extrae exclusivamente del token verificado.

---

## 2. Endpoints Implementados

### Autenticación (`9.1`)
| Método y Ruta | Cuerpo | Respuesta |
|---|---|---|
| `POST /api/auth/registro` | `{ email, password }` (mín. 8 caracteres) | `201 { token, refreshToken, expiraEnSeg, usuario: { id, email } }` |
| `POST /api/auth/login` | `{ email, password }` | `200 { token, refreshToken, expiraEnSeg, usuario: { id, email } }` |
| `POST /api/auth/refresh` | `{ refreshToken }` | `200 { token, refreshToken, expiraEnSeg }` |
| `GET /api/auth/yo` | Header `Authorization: Bearer <token>` | `200 { usuario: { id, email, rol } }` |

### Sincronización y Estadísticas de Viajes (`9.3` y `9.4`)
| Método y Ruta | Comportamiento |
|---|---|
| `GET /api/viaje?since=<ISO>` | Devuelve `{ items, servidor_ahora }` (máx. 500 documentos ordenados por `updated_at`, incluyendo borrados lógicos `deleted_at`). |
| `PUT /api/viaje/[id]` | Crea o reemplaza de forma idempotente (UUID generado por el cliente). Valida con Zod (`ruta` <= 1500 puntos) y descarta campos no declarados. |
| `DELETE /api/viaje/[id]` | Borrado lógico (`deleted_at = ISO`). Devuelve `200 { ok: true }` o `404`. |
| `GET /api/viajes/estadisticas` | Devuelve kilómetros y desnivel positivo acumulados del año (`metros_totales`, `kilometros_totales`, `desnivel_pos_acumulado_m`, `altitud_max_m`). |

### Imágenes Geolocalizadas con Vercel Blob (`9.5`)
| Método y Ruta | Comportamiento |
|---|---|
| `POST /api/imagenes` | Recibe bytes de imagen (`image/jpeg`, `image/png`, `image/webp`, máx. 4 MB). Guarda en `usuarios/<uid>/<uuid>.<ext>` con `addRandomSuffix` y devuelve `201 { url, pathname }`. |
| `DELETE /api/imagenes?url=` | Verifica que el `pathname` comience con `usuarios/<uid>/` (si es de otro usuario devuelve `403`) y elimina el blob. |

---

## 3. Puesta en Marcha Local y Pruebas

```bash
npm install
npm run verify:ia   # Verifica las 8 pruebas de seguridad de Antigravity AI (Sección 14)
npm run typecheck   # Verifica tipos con TypeScript
npm test            # Ejecuta las pruebas de rutas en Vitest (401, 400, 403 y aislamiento)
npm run dev         # Inicia el servidor local en http://localhost:3000
```

---

## 4. Configuración de IA (Sección 14) — Google Antigravity

- **Instrucciones del proyecto:** [`GEMINI.md`](./GEMINI.md) y [`AGENTS.md`](./AGENTS.md)
- **Hook de seguridad `PreToolUse`:** [`.agents/hooks.json`](./.agents/hooks.json) y [`.agents/scripts/security-guard.mjs`](./.agents/scripts/security-guard.mjs)
- **Evidencias y Bitácora:** [`ia/evidencia-restricciones.md`](./ia/evidencia-restricciones.md), [`ia/bitacora-ia.md`](./ia/bitacora-ia.md) y script ejecutable [`ia/verify-ai-security.mjs`](./ia/verify-ai-security.mjs).
