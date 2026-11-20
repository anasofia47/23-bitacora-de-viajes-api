import React from "react";

export const metadata = {
  title: "23 · Bitácora de Viajes y Caminatas API",
  description: "API Serverless en Next.js + Firebase Admin + Vercel Blob",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
