import { NextResponse } from "next/server";
import { verifyBearerToken } from "@/lib/auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { jsonError, zodValidationError } from "@/lib/errors";
import { viajePutSchema } from "@/lib/schemas";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const auth = await verifyBearerToken(request);
    if (!auth.ok) {
      return auth.response;
    }

    const { id } = await context.params;
    const cleanId = id?.trim();
    if (!cleanId || cleanId.length > 128) {
      return jsonError("Identificador de viaje inválido", 400, [
        { campo: "id", mensaje: "El id del documento es obligatorio" },
      ]);
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return jsonError("Cuerpo JSON inválido", 400);
    }

    const parsed = viajePutSchema.safeParse(rawBody);
    if (!parsed.success) {
      return zodValidationError(parsed.error);
    }

    const db = getAdminDb();
    const docRef = db
      .collection("usuarios")
      .doc(auth.user.uid)
      .collection("viaje")
      .doc(cleanId);

    const now = new Date().toISOString();

    // 9.2: En una transacción todas las lecturas van antes de las escrituras.
    // Solo se guardan los campos declarados con null en lugar de undefined.
    const savedDoc = await db.runTransaction(async (tx) => {
      const existingSnap = await tx.get(docRef);
      const existingData = existingSnap.exists ? existingSnap.data() : null;
      const createdAt =
        existingData && typeof existingData.created_at === "string"
          ? existingData.created_at
          : now;

      const payload = {
        nombre: parsed.data.nombre,
        inicio: parsed.data.inicio,
        fin: parsed.data.fin ?? null,
        metros: parsed.data.metros,
        desnivel_pos_m: parsed.data.desnivel_pos_m,
        altitud_max_m: parsed.data.altitud_max_m ?? null,
        pasos: parsed.data.pasos ?? null,
        ruta: parsed.data.ruta.map((pt) => ({
          t: pt.t,
          lat: pt.lat,
          lng: pt.lng,
          alt: pt.alt ?? null,
        })),
        fotos: parsed.data.fotos.map((f) => ({
          url: f.url,
          lat: f.lat ?? null,
          lng: f.lng ?? null,
          t: f.t,
        })),
        created_at: createdAt,
        updated_at: now,
        deleted_at: null,
      };

      tx.set(docRef, payload);
      return { id: cleanId, ...payload };
    });

    return NextResponse.json(savedDoc, { status: 200 });
  } catch {
    return jsonError("Error interno", 500);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const auth = await verifyBearerToken(request);
    if (!auth.ok) {
      return auth.response;
    }

    const { id } = await context.params;
    const cleanId = id?.trim();
    if (!cleanId) {
      return jsonError("Identificador de viaje inválido", 400);
    }

    const db = getAdminDb();
    const docRef = db
      .collection("usuarios")
      .doc(auth.user.uid)
      .collection("viaje")
      .doc(cleanId);

    const now = new Date().toISOString();

    const found = await db.runTransaction(async (tx) => {
      const snap = await tx.get(docRef);
      if (!snap.exists) {
        return false;
      }
      tx.update(docRef, {
        deleted_at: now,
        updated_at: now,
      });
      return true;
    });

    if (!found) {
      return jsonError("El viaje no existe", 404);
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return jsonError("Error interno", 500);
  }
}
