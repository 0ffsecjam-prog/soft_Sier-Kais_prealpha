import './globals.css';
import type { Metadata, Viewport } from 'next';
import { SessionProvider } from '@/components/SessionProvider';

export const metadata: Metadata = {
  title: 'Tempel × SIERA — Video Deportivo',
  description: 'Plataforma de grabación y distribución de video para complejos deportivos.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
