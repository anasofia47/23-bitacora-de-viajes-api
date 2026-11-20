import { getAdminAuth } from "./firebase-admin";
import { jsonError } from "./errors";
import type { NextResponse } from "next/server";

export interface VerifiedUser {
  uid: string;
  email: string | null;
  rol: string | null;
}

export type AuthResult =
  | { ok: true; user: VerifiedUser }
  | { ok: false; response: NextResponse };

export async function verifyBearerToken(request: Request): Promise<AuthResult> {
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      ok: false,
      response: jsonError("Token de autenticación requerido", 401),
    };
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    return {
      ok: false,
      response: jsonError("Token de autenticación inválido", 401),
    };
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    const rol = typeof decoded.rol === "string" ? decoded.rol : null;
    return {
      ok: true,
      user: {
        uid: decoded.uid,
        email: decoded.email ?? null,
        rol,
      },
    };
  } catch {
    return {
      ok: false,
      response: jsonError("Token inválido o expirado", 401),
    };
  }
}

export async function verifyAdminToken(request: Request): Promise<AuthResult> {
  const auth = await verifyBearerToken(request);
  if (!auth.ok) {
    return auth;
  }
  if (auth.user.rol !== "admin") {
    return {
      ok: false,
      response: jsonError("Acceso denegado: se requiere rol admin", 403),
    };
  }
  return auth;
}
