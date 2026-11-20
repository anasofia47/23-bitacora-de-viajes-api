import { NextResponse } from "next/server";
import { authCredentialsSchema } from "@/lib/schemas";
import { jsonError, zodValidationError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    if (!checkRateLimit(`registro:${ip}`)) {
      return jsonError("Demasiados intentos, intente más tarde", 429);
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return jsonError("Cuerpo JSON inválido", 400);
    }

    const parsed = authCredentialsSchema.safeParse(rawBody);
    if (!parsed.success) {
      return zodValidationError(parsed.error);
    }

    const { email, password } = parsed.data;
    const apiKey = process.env.FIREBASE_WEB_API_KEY?.trim();
    if (!apiKey) {
      return jsonError("Error interno", 500);
    }

    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true,
        }),
      }
    );

    const data = (await res.json()) as {
      idToken?: string;
      refreshToken?: string;
      expiresIn?: string;
      localId?: string;
      email?: string;
      error?: { message?: string };
    };

    if (!res.ok) {
      const code = data?.error?.message || "";
      if (code.includes("EMAIL_EXISTS")) {
        return jsonError("El correo electrónico ya está registrado", 409);
      }
      if (code.includes("WEAK_PASSWORD")) {
        return jsonError("La contraseña es demasiado débil (mínimo 8 caracteres)", 400);
      }
      if (code.includes("TOO_MANY_ATTEMPTS_TRY_LATER")) {
        return jsonError("Demasiados intentos, intente más tarde", 429);
      }
      return jsonError("No fue posible completar el registro", 400);
    }

    return NextResponse.json(
      {
        token: data.idToken ?? "",
        refreshToken: data.refreshToken ?? "",
        expiraEnSeg: Number(data.expiresIn || 3600),
        usuario: {
          id: data.localId ?? "",
          email: data.email ?? email,
        },
      },
      { status: 201 }
    );
  } catch {
    return jsonError("Error interno", 500);
  }
}
