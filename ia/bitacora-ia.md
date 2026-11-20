# Bitácora de Uso de IA (Google Antigravity) — `23-bitacora-de-viajes-api`

Esta bitácora documenta cada intervención del asistente **Google Antigravity** siguiendo la estructura exigida en la guía: **Propósito**, **Evidencia**, **Validación** y **Decisión**.

---

## Entrada 1 — Diseño de la Configuración y Guardias de Seguridad de IA (Sección 14)

- **Propósito:** Configurar las reglas del proyecto (`GEMINI.md`, `.agents/rules/security-and-quality.md`) y el hook `PreToolUse` (`.agents/hooks.json` + `.agents/scripts/security-guard.mjs`) antes de escribir código de la aplicación, asegurando que Antigravity no pueda leer `.env` ni claves privadas, no salga del directorio del repositorio y solicite autorización en acciones externas.
- **Evidencia:** Creación de `.agents/hooks.json`, `.agents/scripts/security-guard.mjs` y suite ejecutable `ia/verify-ai-security.mjs` versionados en el **primer commit** del repositorio.
- **Validación:** Se ejecutó `node ia/verify-ai-security.mjs` comprobando los 8 escenarios críticos (`TC-IA-01` a `TC-IA-08`), verificando que las lecturas a `.env` y rutas `../` devuelven `"decision": "deny"` y comandos como `vercel deploy` o `git push` devuelven `"decision": "ask"`.
- **Decisión:** Se aceptó la arquitectura de hooks nativos de Antigravity apoyada por un script en Node ESM sin dependencias externas para que funcione desde el commit inicial.

---

## Entrada 2 — Autenticación Mediada por la API con Firebase Auth REST + Admin SDK (Sección 9.1)

- **Propósito:** Implementar los endpoints `POST /api/auth/registro`, `POST /api/auth/login`, `POST /api/auth/refresh` y `GET /api/auth/yo` sin exponer `FIREBASE_WEB_API_KEY` ni `firebaseConfig` en la app móvil.
- **Evidencia:** Implementación en `lib/firebase-admin.ts`, `lib/auth.ts`, `lib/rate-limit.ts` y `app/api/auth/**/route.ts`.
- **Validación:**
  - Se verificó que `POST /api/auth/login` devuelva exactamente el mismo mensaje genérico en `401` (`Credenciales inválidas`) exista o no el correo.
  - Se validó que contraseñas menores a 8 caracteres devuelvan `400`, correos repetidos `409` y excesos de intentos `429`.
  - Se comprobó con pruebas en Vitest que `uid` siempre se extrae del token verificado por `verifyIdToken()`.
- **Decisión:** Se adoptó el patrón de mapeo de códigos de error de Identity Toolkit (`EMAIL_EXISTS`, `INVALID_LOGIN_CREDENTIALS`, `EMAIL_NOT_FOUND`, `INVALID_PASSWORD`, `TOO_MANY_ATTEMPTS_TRY_LATER`) a respuestas HTTP estandarizadas `{ error, detalles? }`.

---

## Entrada 3 — Sincronización Incremental en Firestore, Estadísticas y Vercel Blob (Secciones 9.2 a 9.5)

- **Propósito:** Implementar el CRUD de sincronización (`GET /api/viaje?since=`, `PUT /api/viaje/[id]`, `DELETE /api/viaje/[id]`), el cálculo anual en `GET /api/viajes/estadisticas` y la gestión de fotos geolocalizadas en `POST /api/imagenes` y `DELETE /api/imagenes?url=`.
- **Evidencia:** Archivos `lib/schemas.ts`, `app/api/viaje/route.ts`, `app/api/viaje/[id]/route.ts`, `app/api/viajes/estadisticas/route.ts` y `app/api/imagenes/route.ts`.
- **Validación:**
  - Validación estricta con Zod descartando campos no declarados y exigiendo que `ruta` tenga máximo 1500 puntos (o simplificándola automáticamente con Ramer-Douglas-Peucker si llega al límite).
  - Verificación en `DELETE /api/imagenes` de que el `pathname` comience obligatoriamente por `usuarios/${uid}/`, respondiendo `403` si un usuario intenta borrar la imagen de otro.
  - Ejecución completa de `npm test` (Vitest) y `npm run typecheck`.
- **Decisión:** Se aceptó la implementación y se incluyó además simplificación defensiva en el servidor para garantizar que ningún documento supere 1500 puntos ni 1 MiB en Firestore.
