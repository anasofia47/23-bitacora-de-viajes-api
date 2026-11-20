# Evidencia de Configuración y Restricciones de IA (Sección 14)

> **Repositorio:** `23-bitacora-de-viajes-api`
> **Asistente configurado:** Google Antigravity (AGY)
> **Archivos de configuración:** `GEMINI.md`, `AGENTS.md`, `.agents/hooks.json`, `.agents/rules/security-and-quality.md`, `.agents/scripts/security-guard.mjs`

---

## 1.Cómo demostrar las restricciones en vivo en la sustentación

Ejecute desde la raíz del repositorio:

```bash
node ia/verify-ai-security.mjs
```

### Salida verificada de las pruebas de seguridad:

| ID | Caso de Prueba | Herramienta Simulada | Resultado Esperado | Resultado Obtenido | Estado |
|---|---|---|---|---|---|
| `TC-IA-01` | Bloqueo de lectura directa de `.env` | `read_file` (`.env`) | `deny` | `deny` | ✅ PASS |
| `TC-IA-02` | Bloqueo de lectura de clave privada Firebase (`*firebase-adminsdk*.json`) | `read_file` | `deny` | `deny` | ✅ PASS |
| `TC-IA-03` | Permiso de lectura de plantilla `.env.example` | `read_file` (`.env.example`) | `allow` | `allow` | ✅ PASS |
| `TC-IA-04` | Bloqueo de salida de la carpeta del proyecto (`../credenciales.txt`) | `read_file` | `deny` | `deny` | ✅ PASS |
| `TC-IA-05` | Bloqueo de comando en terminal que lee secretos (`cat .env`) | `run_command` | `deny` | `deny` | ✅ PASS |
| `TC-IA-06` | Confirmación obligatoria en despliegue externo (`vercel deploy --prod`) | `run_command` | `ask` | `ask` | ✅ PASS |
| `TC-IA-07` | Confirmación obligatoria en `git push origin main` | `run_command` | `ask` | `ask` | ✅ PASS |
| `TC-IA-08` | Lectura permitida de archivos del proyecto (`app/api/health/route.ts`) | `read_file` | `allow` | `allow` | ✅ PASS |

---

## 2. Reglas de Calidad Automática del Código

Toda contribución (humana o generada con Antigravity) se valida de forma automática con:

1. **Verificación de tipos (`npm run typecheck`):** TypeScript en modo `strict: true` valida contratos de Route Handlers y esquemas Zod.
2. **Pruebas automatizadas (`npm test`):** Vitest comprueba autenticación (`401`), validación Zod (`400`), aislamiento entre usuarios/roles (`403`) y cálculos de negocio.
3. **Verificación de ausencia de secretos:** `.gitignore` bloquea `.env*`, `*.pem`, `*.key` y `*firebase-adminsdk*.json`.
