import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  basePath: string;
  page: number;
  totalPages: number;
  total: number;
  params?: Record<string, string | number | undefined>;
}

export default function Pagination({ basePath, page, totalPages, total, params = {} }: Props) {
  const build = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '') sp.set(k, String(v));
    }
    sp.set('page', String(p));
    return `${basePath}?${sp.toString()}`;
  };

  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <div className="text-gray-500">{total} en total · página {page} de {Math.max(1, totalPages)}</div>
      <div className="flex gap-2">
        {prevDisabled ? (
          <span className="btn btn-secondary text-sm opacity-40 pointer-events-none"><ChevronLeft size={14} />Anterior</span>
        ) : (
          <Link href={build(page - 1)} className="btn btn-secondary text-sm"><ChevronLeft size={14} />Anterior</Link>
        )}
        {nextDisabled ? (
          <span className="btn btn-secondary text-sm opacity-40 pointer-events-none">Siguiente<ChevronRight size={14} /></span>
        ) : (
          <Link href={build(page + 1)} className="btn btn-secondary text-sm">Siguiente<ChevronRight size={14} /></Link>
        )}
      </div>
    </div>
  );
}
