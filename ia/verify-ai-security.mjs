#!/usr/bin/env node
/**
 * Script de Evidencia y Verificación en Vivo — Configuración de IA (Sección 14)
 * Ejecuta casos de prueba reales contra el guardia de seguridad de Antigravity (.agents/scripts/security-guard.mjs)
 * y genera el reporte verificable en ia/evidencia-restricciones.md.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateToolCall } from "../.agents/scripts/security-guard.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");

const testCases = [
  {
    id: "TC-IA-01",
    description: "Bloqueo de lectura directa de archivo .env",
    payload: {
      toolCall: {
        name: "read_file",
        args: { Path: path.join(REPO_ROOT, ".env") },
      },
    },
    expectedDecision: "deny",
  },
  {
    id: "TC-IA-02",
    description: "Bloqueo de lectura de clave privada / cuenta de servicio Firebase",
    payload: {
      toolCall: {
        name: "read_file",
        args: { Path: path.join(REPO_ROOT, "firebase-adminsdk-key.json") },
      },
    },
    expectedDecision: "deny",
  },
  {
    id: "TC-IA-03",
    description: "Permiso de lectura de plantilla pública .env.example",
    payload: {
      toolCall: {
        name: "read_file",
        args: { Path: path.join(REPO_ROOT, ".env.example") },
      },
    },
    expectedDecision: "allow",
  },
  {
    id: "TC-IA-04",
    description: "Bloqueo de acceso a archivo fuera de la carpeta del repositorio (../secreto.txt)",
    payload: {
      toolCall: {
        name: "read_file",
        args: { Path: path.resolve(REPO_ROOT, "..", "credenciales.txt") },
      },
    },
    expectedDecision: "deny",
  },
  {
    id: "TC-IA-05",
    description: "Bloqueo de comando de terminal que intenta leer .env (cat .env)",
    payload: {
      toolCall: {
        name: "run_command",
        args: { CommandLine: "cat .env" },
      },
    },
    expectedDecision: "deny",
  },
  {
    id: "TC-IA-06",
    description: "Solicitud de confirmación (ask) en acciones con efecto externo (vercel deploy --prod)",
    payload: {
      toolCall: {
        name: "run_command",
        args: { CommandLine: "vercel deploy --prod" },
      },
    },
    expectedDecision: "ask",
  },
  {
    id: "TC-IA-07",
    description: "Solicitud de confirmación (ask) en git push hacia repositorio remoto",
    payload: {
      toolCall: {
        name: "run_command",
        args: { CommandLine: "git push origin main" },
      },
    },
    expectedDecision: "ask",
  },
  {
    id: "TC-IA-08",
    description: "Permiso normal para lectura de código fuente dentro del repositorio",
    payload: {
      toolCall: {
        name: "read_file",
        args: { Path: path.join(REPO_ROOT, "app", "api", "health", "route.ts") },
      },
    },
    expectedDecision: "allow",
  },
];

console.log("=== Verificando Configuración de Seguridad de Antigravity AI ===");
let passed = 0;

for (const tc of testCases) {
  const result = evaluateToolCall(tc.payload, REPO_ROOT);
  assert.equal(
    result.decision,
    tc.expectedDecision,
    `Fallo en ${tc.id} (${tc.description}): esperado '${tc.expectedDecision}', obtenido '${result.decision}'`
  );
  console.log(`[PASS] ${tc.id}: ${tc.description} -> decision="${result.decision}" (${result.reason})`);
  passed++;
}

console.log(`\nResultado: ${passed}/${testCases.length} pruebas de seguridad de IA superadas con éxito.`);
