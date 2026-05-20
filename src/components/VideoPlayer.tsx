'use client';

import { useRef, useState } from 'react';

interface Props {
  src: string;
  poster?: string;
  title?: string;
}

export default function VideoPlayer({ src, poster, title }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="card overflow-hidden">
      <div className="bg-black aspect-video">
        <video
          ref={ref}
          src={src}
          poster={poster}
          controls
          preload="metadata"
          playsInline
          className="w-full h-full"
          onError={(e) => {
            const v = e.currentTarget;
            setError(v.error ? `Error reproduciendo (code ${v.error.code}).` : 'No se pudo cargar el video.');
          }}
        >
          Tu navegador no soporta video HTML5.
        </video>
      </div>
      {title && <div className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 border-t border-gray-200 dark:border-gray-800">{title}</div>}
      {error && <div className="px-4 py-2 text-sm text-red-600 border-t border-red-200">{error}</div>}
    </div>
  );
}
