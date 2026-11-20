import { describe, it, expect, vi, beforeEach } from "vitest";

// Mocks de firebase-admin y @vercel/blob (Sección 11: Simule Firebase con vi.mock)
const mockVerifyIdToken = vi.fn();
const mockCollectionStore = new Map<string, Record<string, unknown>>();

vi.mock("@/lib/firebase-admin", () => {
  return {
    getAdminAuth: () => ({
      verifyIdToken: mockVerifyIdToken,
    }),
    getAdminDb: () => {
      const createDocRef = (fullPath: string) => ({
        path: fullPath,
        get: async () => ({
          exists: mockCollectionStore.has(fullPath),
          data: () => mockCollectionStore.get(fullPath),
        }),
      });

      return {
        collection: (rootName: string) => ({
          doc: (uid: string) => ({
            collection: (subName: string) => ({
              doc: (id: string) => createDocRef(`${rootName}/${uid}/${subName}/${id}`),
              orderBy: () => ({
                limit: () => ({
                  where: () => ({
                    get: async () => ({ docs: [] }),
                  }),
                  get: async () => {
                    const prefix = `${rootName}/${uid}/${subName}/`;
                    const docs = [];
                    for (const [key, val] of mockCollectionStore.entries()) {
                      if (key.startsWith(prefix)) {
                        docs.push({
                          id: key.slice(prefix.length),
                          data: () => val,
                        });
                      }
                    }
                    return { docs };
                  },
                }),
              }),
              where: () => ({
                where: () => ({
                  get: async () => {
                    const prefix = `${rootName}/${uid}/${subName}/`;
                    const docs = [];
                    for (const [key, val] of mockCollectionStore.entries()) {
                      if (key.startsWith(prefix)) {
                        docs.push({
                          id: key.slice(prefix.length),
                          data: () => val,
                        });
                      }
                    }
                    return { docs };
                  },
                }),
              }),
            }),
          }),
        }),
        runTransaction: async <T>(
          fn: (tx: {
            get: (ref: { path: string }) => Promise<{ exists: boolean; data: () => Record<string, unknown> | undefined }>;
            set: (ref: { path: string }, data: Record<string, unknown>) => void;
            update: (ref: { path: string }, data: Record<string, unknown>) => void;
          }) => Promise<T>
        ): Promise<T> => {
          const tx = {
            get: async (ref: { path: string }) => ({
              exists: mockCollectionStore.has(ref.path),
              data: () => mockCollectionStore.get(ref.path),
            }),
            set: (ref: { path: string }, data: Record<string, unknown>) => {
              mockCollectionStore.set(ref.path, { ...data });
            },
            update: (ref: { path: string }, data: Record<string, unknown>) => {
              const prev = mockCollectionStore.get(ref.path) || {};
              mockCollectionStore.set(ref.path, { ...prev, ...data });
            },
          };
          return fn(tx);
        },
      };
    },
  };
});

const mockBlobDel = vi.fn();
const mockBlobPut = vi.fn();

vi.mock("@vercel/blob", () => ({
  put: (...args: unknown[]) => mockBlobPut(...args),
  del: (...args: unknown[]) => mockBlobDel(...args),
}));

import { GET as getViajes } from "@/app/api/viaje/route";
import { PUT as putViaje } from "@/app/api/viaje/[id]/route";
import { DELETE as deleteImagen } from "@/app/api/imagenes/route";
import { GET as getAdminEstado } from "@/app/api/admin/estado/route";
import { GET as getEstadisticas } from "@/app/api/viajes/estadisticas/route";

describe("Pruebas de Rutas de la API (Sección 11)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCollectionStore.clear();
  });

  it("1. Autenticación: devuelve 401 cuando se intenta acceder a /api/viaje sin Bearer token", async () => {
    const req = new Request("https://api.bitacora.vercel.app/api/viaje", {
      method: "GET",
    });

    const res = await getViajes(req);
    expect(res.status).toBe(401);

    const body = (await res.json()) as { error: string };
    expect(body.error).toBeDefined();
  });

  it("2. Validación (Zod): devuelve 400 con detalles cuando PUT /api/viaje/[id] recibe datos inválidos o más de 1500 puntos", async () => {
    mockVerifyIdToken.mockResolvedValueOnce({
      uid: "user-senderista-1",
      email: "senderista@ejemplo.com",
    });

    const req = new Request("https://api.bitacora.vercel.app/api/viaje/uuid-viaje-1", {
      method: "PUT",
      headers: {
        Authorization: "Bearer token-valido-123",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nombre: "", // inválido: vacío
        inicio: "fecha-no-iso", // inválido
        metros: -50, // inválido: negativo
        desnivel_pos_m: 120,
      }),
    });

    const res = await putViaje(req, { params: Promise.resolve({ id: "uuid-viaje-1" }) });
    expect(res.status).toBe(400);

    const body = (await res.json()) as { error: string; detalles: Array<{ campo: string; mensaje: string }> };
    expect(body.error).toBe("Datos de entrada inválidos");
    expect(Array.isArray(body.detalles)).toBe(true);
    expect(body.detalles.length).toBeGreaterThanOrEqual(2);
  });

  it("3. Autorización y Aislamiento entre Usuarios: devuelve 403 si un usuario intenta eliminar una imagen de otro usuario en DELETE /api/imagenes", async () => {
    mockVerifyIdToken.mockResolvedValueOnce({
      uid: "uid-usuario-A",
      email: "usuarioA@ejemplo.com",
    });

    const urlDeOtroUsuario =
      "https://blob.vercel-storage.com/usuarios/uid-usuario-B/foto-secreta-123.jpg";

    const req = new Request(
      `https://api.bitacora.vercel.app/api/imagenes?url=${encodeURIComponent(urlDeOtroUsuario)}`,
      {
        method: "DELETE",
        headers: {
          Authorization: "Bearer token-usuario-A",
        },
      }
    );

    const res = await deleteImagen(req);
    expect(res.status).toBe(403);
    expect(mockBlobDel).not.toHaveBeenCalled();

    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("otro usuario");
  });

  it("4. Autorización por Rol (claim rol='admin'): devuelve 403 cuando un usuario sin claim admin accede a una ruta de administración", async () => {
    mockVerifyIdToken.mockResolvedValueOnce({
      uid: "uid-normal",
      email: "normal@ejemplo.com",
      rol: "usuario",
    });

    const req = new Request("https://api.bitacora.vercel.app/api/admin/estado", {
      method: "GET",
      headers: {
        Authorization: "Bearer token-normal",
      },
    });

    const res = await getAdminEstado(req);
    expect(res.status).toBe(403);
  });

  it("5. Aislamiento en Firestore y descarte de campos no declarados: PUT /api/viaje/[id] guarda solo bajo usuarios/{uid}/viaje/{id} y calcula estadísticas anuales", async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: "uid-senderista-99",
      email: "senderista99@ejemplo.com",
    });

    const reqPut = new Request("https://api.bitacora.vercel.app/api/viaje/viaje-nevado-1", {
      method: "PUT",
      headers: {
        Authorization: "Bearer token-senderista-99",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nombre: "Ascenso Paramillo",
        inicio: "2026-11-15T06:00:00.000Z",
        fin: "2026-11-15T11:30:00.000Z",
        metros: 12500,
        desnivel_pos_m: 840,
        altitud_max_m: 3950.5,
        pasos: 16400,
        ruta: [
          { t: "2026-11-15T06:00:00.000Z", lat: 4.8, lng: -75.3, alt: 3110.5 },
          { t: "2026-11-15T11:30:00.000Z", lat: 4.85, lng: -75.32, alt: 3950.5 },
        ],
        fotos: [],
        uid: "uid-atacante-falso", // Debe ser descartado por Zod
        rol: "admin", // Debe ser descartado por Zod
      }),
    });

    const resPut = await putViaje(reqPut, { params: Promise.resolve({ id: "viaje-nevado-1" }) });
    expect(resPut.status).toBe(200);

    const saved = (await resPut.json()) as Record<string, unknown>;
    expect(saved.id).toBe("viaje-nevado-1");
    expect(saved.uid).toBeUndefined();
    expect(saved.rol).toBeUndefined();
    expect(mockCollectionStore.has("usuarios/uid-senderista-99/viaje/viaje-nevado-1")).toBe(true);

    const reqStats = new Request(
      "https://api.bitacora.vercel.app/api/viajes/estadisticas?anio=2026",
      {
        method: "GET",
        headers: {
          Authorization: "Bearer token-senderista-99",
        },
      }
    );

    const resStats = await getEstadisticas(reqStats);
    expect(resStats.status).toBe(200);
    const stats = (await resStats.json()) as {
      kilometros_totales: number;
      desnivel_pos_acumulado_m: number;
      total_viajes: number;
    };
    expect(stats.total_viajes).toBe(1);
    expect(stats.kilometros_totales).toBe(12.5);
    expect(stats.desnivel_pos_acumulado_m).toBe(840);
  });
});
