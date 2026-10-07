"use client"; // Error boundaries must be Client Components

import Link from "next/link";

// Catalog failures land here (getGames/getGame throw); the server already logs the cause
export default function Error({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <div className="av-error fade-in">
      <div className="av-error-screen">
        <h1 className="av-error-title">SIN SEÑAL</h1>
        <p className="av-error-line">
          {"> NO SE PUDO CARGAR EL CATÁLOGO DE JUEGOS."}
        </p>
        <p className="av-error-hint">
          Comprueba tu conexión y vuelve a intentarlo.
        </p>
      </div>
      <div className="av-error-actions">
        <button
          type="button"
          className="btn magenta lg"
          onClick={() => retry()}
        >
          REINTENTAR
        </button>
        <Link href="/games" className="btn ghost lg">
          VOLVER AL VAULT
        </Link>
      </div>
    </div>
  );
}
