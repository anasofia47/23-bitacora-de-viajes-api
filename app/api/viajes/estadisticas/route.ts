import { NextResponse } from "next/server";
import { verifyBearerToken } from "@/lib/auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { jsonError } from "@/lib/errors";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const auth = await verifyBearerToken(request);
    if (!auth.ok) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get("anio") || searchParams.get("year");
    const targetYear = yearParam ? Number(yearParam) : new Date().getUTCFullYear();

    if (!Number.isInteger(targetYear) || targetYear < 2000 || targetYear > 2100) {
      return jsonError("El año consultado es inválido", 400, [
        { campo: "anio", mensaje: "Debe ser un año entre 2000 y 2100" },
      ]);
    }

    const startOfYear = `${targetYear}-01-01T00:00:00.000Z`;
    const endOfYear = `${targetYear + 1}-01-01T00:00:00.000Z`;

    const db = getAdminDb();
    const snapshot = await db
      .collection("usuarios")
      .doc(auth.user.uid)
      .collection("viaje")
      .where("inicio", ">=", startOfYear)
      .where("inicio", "<", endOfYear)
      .get();

    let metrosTotales = 0;
    let desnivelPositivoTotalM = 0;
    let altitudMaximaM: number | null = null;
    let cantidadViajes = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (data.deleted_at !== null && data.deleted_at !== undefined) {
        continue;
      }
      cantidadViajes += 1;
      metrosTotales += Number(data.metros || 0);
      desnivelPositivoTotalM += Number(data.desnivel_pos_m || 0);
      if (typeof data.altitud_max_m === "number") {
        altitudMaximaM =
          altitudMaximaM === null
            ? data.altitud_max_m
            : Math.max(altitudMaximaM, data.altitud_max_m);
      }
    }

    const kilometrosTotales = Number((metrosTotales / 1000).toFixed(2));

    return NextResponse.json(
      {
        anio: targetYear,
        total_viajes: cantidadViajes,
        metros_totales: metrosTotales,
        kilometros_totales: kilometrosTotales,
        desnivel_pos_acumulado_m: desnivelPositivoTotalM,
        altitud_max_m: altitudMaximaM,
      },
      { status: 200 }
    );
  } catch {
    return jsonError("Error interno", 500);
  }
}
