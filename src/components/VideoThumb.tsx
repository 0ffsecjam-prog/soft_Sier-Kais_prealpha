'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';

// Muestra el thumbnail si existe; si el endpoint devuelve 404 (sin ffmpeg o
// sin archivo) cae al placeholder con gradiente.
export default function VideoThumb({ src, alt }: { src: string; alt?: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="aspect-video bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 flex items-center justify-center">
        <Play size={36} className="text-white/80" />
      </div>
    );
  }

  return (
    <div className="aspect-video bg-black relative">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt ?? 'Miniatura del partido'}
        loading="lazy"
        className="w-full h-full object-cover"
        onError={() => setFailed(true)}
      />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-11 h-11 rounded-full bg-black/45 flex items-center justify-center">
          <Play size={20} className="text-white" />
        </div>
      </div>
    </div>
  );
}
