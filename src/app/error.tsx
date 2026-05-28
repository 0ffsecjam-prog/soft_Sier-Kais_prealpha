'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function ErrorBoundary({
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
    <div className="min-h-[50vh] flex items-center justify-center p-6">
      <div className="card p-6 max-w-md w-full text-center space-y-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 flex items-center justify-center">
          <AlertTriangle />
        </div>
        <div>
          <h1 className="font-semibold text-lg">Algo salió mal</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Ocurrió un error inesperado. Probá de nuevo; si persiste, contactá al equipo.
          </p>
          {error?.digest && (
            <div className="mt-2 text-xs text-gray-500 font-mono">ref: {error.digest}</div>
          )}
        </div>
        <button onClick={reset} className="btn btn-primary inline-flex">
          <RotateCcw size={16} />Reintentar
        </button>
      </div>
    </div>
  );
}
