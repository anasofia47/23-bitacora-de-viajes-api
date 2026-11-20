import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export interface ErrorDetail {
  campo: string;
  mensaje: string;
}

export function jsonError(
  mensaje: string,
  status: 400 | 401 | 403 | 404 | 409 | 413 | 415 | 429 | 500,
  detalles?: ErrorDetail[]
) {
  if (status === 500) {
    // 9.3 y 9.6: Los errores internos responden 500 Error interno sin detalles
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }

  const body: { error: string; detalles?: ErrorDetail[] } = { error: mensaje };
  if (detalles && detalles.length > 0) {
    body.detalles = detalles;
  }
  return NextResponse.json(body, { status });
}

export function zodValidationError(err: ZodError) {
  const detalles: ErrorDetail[] = err.issues.map((issue) => ({
    campo: issue.path.join(".") || "cuerpo",
    mensaje: issue.message,
  }));
  return jsonError("Datos de entrada inválidos", 400, detalles);
}
