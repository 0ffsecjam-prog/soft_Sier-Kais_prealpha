import { ReactNode } from 'react';

interface Props {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
}

export default function MetricCard({ label, value, hint, icon }: Props) {
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-gray-500">{label}</div>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>
      <div className="mt-2 text-2xl sm:text-3xl font-bold leading-tight">{value}</div>
      {hint && <div className="mt-1 text-xs text-gray-500">{hint}</div>}
    </div>
  );
}
