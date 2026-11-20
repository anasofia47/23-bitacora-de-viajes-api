import { NextResponse } from "next/server";
import { refreshTokenSchema } from "@/lib/schemas";
import { jsonError, zodValidationError } from "@/lib/errors";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return jsonError("Cuerpo JSON inválido", 400);
    }

    const parsed = refreshTokenSchema.safeParse(rawBody);
    if (!parsed.success) {
      return zodValidationError(parsed.error);
    }

    const apiKey = process.env.FIREBASE_WEB_API_KEY?.trim();
    if (!apiKey) {
      return jsonError("Error interno", 500);
    }

    const res = await fetch(
      `https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: parsed.data.refreshToken,
        }).toString(),
      }
    );

    const data = (await res.json()) as {
      id_token?: string;
      refresh_token?: string;
      expires_in?: string;
    };

    if (!res.ok || !data.id_token) {
      return jsonError("No fue posible renovar la sesión", 401);
    }

    return NextResponse.json(
      {
        token: data.id_token,
        refreshToken: data.refresh_token ?? parsed.data.refreshToken,
        expiraEnSeg: Number(data.expires_in || 3600),
      },
      { status: 200 }
    );
  } catch {
    return jsonError("Error interno", 500);
  }
}
