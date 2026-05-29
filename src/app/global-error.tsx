'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="es">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0, padding: 24, background: '#f8fafc' }}>
        <div
          style={{
            maxWidth: 420,
            margin: '10vh auto',
            padding: 24,
            border: '1px solid #e5e7eb',
            borderRadius: 12,
            background: '#fff',
            textAlign: 'center',
          }}
        >
          <h1 style={{ margin: 0, fontSize: 20 }}>Algo salió mal</h1>
          <p style={{ marginTop: 8, color: '#555', fontSize: 14 }}>
            Ocurrió un error inesperado en la aplicación. Probá recargar.
          </p>
          {error?.digest && (
            <div style={{ marginTop: 8, fontSize: 12, color: '#777', fontFamily: 'monospace' }}>
              ref: {error.digest}
            </div>
          )}
          <button
            onClick={reset}
            style={{
              marginTop: 16,
              padding: '8px 16px',
              border: 'none',
              borderRadius: 6,
              background: '#111827',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
