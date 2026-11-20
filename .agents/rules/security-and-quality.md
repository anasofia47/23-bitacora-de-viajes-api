# Reglas de Seguridad y Calidad de Código — Antigravity AI

## 1. Protección de Secretos
- Ningún archivo `.env`, `.env.*` (salvo `.env.example`), `*.pem`, `*.key`, `*.keystore`, `*.jks`, o `*firebase-adminsdk*.json` puede ser leído, modificado ni expuesto por el asistente de IA.
- Las variables `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_WEB_API_KEY` y `BLOB_READ_WRITE_TOKEN` residen exclusivamente en Vercel.

## 2. Confinamiento al Directorio del Repositorio
- Toda ruta de archivo inspeccionada o editada debe resolverse dentro de la raíz del repositorio (`23-bitacora-de-viajes-api`).
- Cualquier intento de acceder a `../` fuera de la raíz o a rutas del sistema fuera del proyecto es bloqueado (`deny`) por el hook `.agents/scripts/security-guard.mjs`.

## 3. Confirmación para Efectos Externos
- Comandos con efectos fuera de la máquina local (`git push`, `vercel deploy`, `firebase deploy`, `npm publish`) devuelven `"decision": "ask"` para exigir autorización interactiva del desarrollador.

## 4. Calidad Automática del Código
- Todo código escrito por el equipo o por Antigravity debe superar sin errores:
  1. `npm run typecheck` (TypeScript estricto, sin `any` implícito).
  2. `npm run lint` (ESLint).
  3. `npm test` (Vitest).
