import { NextResponse } from "next/server";
import { verifyBearerToken } from "@/lib/auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { jsonError } from "@/lib/errors";
import { isoStringSchema } from "@/lib/schemas";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const auth = await verifyBearerToken(request);
    if (!auth.ok) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const sinceParam = searchParams.get("since");

    if (sinceParam !== null && sinceParam.trim() !== "") {
      const parsedSince = isoStringSchema.safeParse(sinceParam);
      if (!parsedSince.success) {
        return jsonError("El parámetro 'since' debe ser una fecha ISO 8601 válida", 400, [
          { campo: "since", mensaje: "Formato ISO 8601 inválido" },
        ]);
      }
    }

    const db = getAdminDb();
    let queryRef = db
      .collection("usuarios")
      .doc(auth.user.uid)
      .collection("viaje")
      .orderBy("updated_at", "asc")
      .limit(500);

    if (sinceParam && sinceParam.trim() !== "") {
      queryRef = queryRef.where("updated_at", ">", sinceParam.trim());
    }

    const snapshot = await queryRef.get();
    const items = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json(
      {
        items,
        servidor_ahora: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch {
    return jsonError("Error interno", 500);
  }
}
