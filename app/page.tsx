import React from "react";

export default function HomePage() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <h1>23 · Bitácora de Viajes y Caminatas — API</h1>
      <p>Servicio activo. Compruebe el estado en <code>GET /api/health</code>.</p>
    </main>
  );
}
