import { ClaimForm } from './ClaimForm';

export default function ClienteClaimPage() {
  return (
    <div className="max-w-md mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Canjear código</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">Ingresá el código que te dio la cancha para vincular el video a tu cuenta.</p>
      </div>
      <div className="card p-6">
        <ClaimForm />
      </div>
    </div>
  );
}
