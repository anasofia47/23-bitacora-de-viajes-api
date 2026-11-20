import { z } from "zod";

const isoDateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2}))?$/;

export const isoStringSchema = z
  .string()
  .min(10, "Fecha ISO inválida")
  .refine((val) => isoDateRegex.test(val) && !Number.isNaN(Date.parse(val)), {
    message: "Debe ser una fecha ISO 8601 válida",
  });

export const authCredentialsSchema = z.object({
  email: z.string().trim().email("Correo electrónico inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(128),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().trim().min(1, "El refreshToken es obligatorio"),
});

export const puntoRutaSchema = z.object({
  t: isoStringSchema,
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  alt: z.number().min(-500).max(12000).nullable().default(null),
});

export const fotoViajeSchema = z.object({
  url: z.string().url("La URL de la foto debe ser válida"),
  lat: z.number().min(-90).max(90).nullable().default(null),
  lng: z.number().min(-180).max(180).nullable().default(null),
  t: isoStringSchema,
});

// 9.4: usuarios/{uid}/viaje/{id}
// Campos en snake_case con los mismos nombres que SQLite + ruta (máx 1500 puntos) y fotos
export const viajePutSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre del viaje es obligatorio").max(150),
  inicio: isoStringSchema,
  fin: isoStringSchema.nullable().default(null),
  metros: z.number().int().min(0, "Los metros no pueden ser negativos"),
  desnivel_pos_m: z.number().int().min(0, "El desnivel positivo no puede ser negativo"),
  altitud_max_m: z.number().min(-500).max(12000).nullable().default(null),
  pasos: z.number().int().min(0).nullable().default(null),
  ruta: z
    .array(puntoRutaSchema)
    .max(1500, "La ruta no puede superar los 1500 puntos (simplifique la ruta antes de sincronizar)")
    .default([]),
  fotos: z.array(fotoViajeSchema).max(200).default([]),
});

export type ViajeInput = z.infer<typeof viajePutSchema>;
export type PuntoRuta = z.infer<typeof puntoRutaSchema>;
export type FotoViaje = z.infer<typeof fotoViajeSchema>;
