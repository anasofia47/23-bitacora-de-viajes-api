import { NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { randomUUID } from "node:crypto";
import { verifyBearerToken } from "@/lib/auth";
import { jsonError } from "@/lib/errors";

export const runtime = "nodejs";

const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // ~4 MB (Sección 9.5: 413 si pasa de ~4 MB)

export async function POST(request: Request) {
  try {
    const auth = await verifyBearerToken(request);
    if (!auth.ok) {
      return auth.response;
    }

    const rawContentType = (request.headers.get("content-type") || "").split(";")[0]?.trim().toLowerCase();
    const ext = ALLOWED_MIME_TYPES[rawContentType];
    if (!ext) {
      return jsonError("Tipo de imagen no permitido. Use image/jpeg, image/png o image/webp", 415);
    }

    const buffer = await request.arrayBuffer();
    if (!buffer || buffer.byteLength === 0) {
      return jsonError("El cuerpo de la imagen está vacío", 400);
    }

    if (buffer.byteLength > MAX_IMAGE_BYTES) {
      return jsonError("La imagen supera el límite permitido de 4 MB", 413);
    }

    const targetPath = `usuarios/${auth.user.uid}/${randomUUID()}.${ext}`;
    const blob = await put(targetPath, Buffer.from(buffer), {
      access: "public",
      addRandomSuffix: true,
      contentType: rawContentType,
    });

    return NextResponse.json(
      {
        url: blob.url,
        pathname: blob.pathname,
      },
      { status: 201 }
    );
  } catch {
    return jsonError("Error interno", 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await verifyBearerToken(request);
    if (!auth.ok) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get("url")?.trim();
    if (!targetUrl) {
      return jsonError("El parámetro 'url' es obligatorio", 400, [
        { campo: "url", mensaje: "Falta la URL de la imagen a eliminar" },
      ]);
    }

    let pathname = "";
    try {
      const parsedUrl = new URL(targetUrl);
      pathname = parsedUrl.pathname.replace(/^\/+/, "");
    } catch {
      pathname = targetUrl.replace(/^\/+/, "");
    }

    const requiredPrefix = `usuarios/${auth.user.uid}/`;
    // 9.5: Solo imágenes propias: si el pathname no empieza con usuarios/<uid>/ -> 403
    if (!pathname.startsWith(requiredPrefix)) {
      return jsonError("No tiene permiso para eliminar imágenes de otro usuario", 403);
    }

    await del(targetUrl);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return jsonError("Error interno", 500);
  }
}
