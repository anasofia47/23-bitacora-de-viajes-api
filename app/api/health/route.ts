import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      proyecto: "23-bitacora-de-viajes-api",
      servidor_ahora: new Date().toISOString(),
    },
    { status: 200 }
  );
}
