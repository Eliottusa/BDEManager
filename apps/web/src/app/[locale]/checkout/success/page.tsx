'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import Link from 'next/link';

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const locale = useLocale();
  const [verified, setVerified] = useState<boolean | null>(null);

  useEffect(() => {
    if (!sessionId) { setVerified(false); return; }
    const token = localStorage.getItem('accessToken');
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'}/payments/verify?session_id=${sessionId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => setVerified(r.ok))
      .catch(() => setVerified(false));
  }, [sessionId]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 text-center shadow">
        {verified === null ? (
          <p className="text-sm text-gray-500">Vérification du paiement…</p>
        ) : verified ? (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl">
              ✓
            </div>
            <h1 className="mb-2 text-xl font-semibold text-gray-900">Paiement confirmé !</h1>
            <p className="mb-6 text-sm text-gray-500">
              Ton inscription est validée. Tu recevras un email de confirmation.
            </p>
            <Link
              href={`/${locale}/dashboard`}
              className="inline-block rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Voir mon espace
            </Link>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-2xl">
              ✕
            </div>
            <h1 className="mb-2 text-xl font-semibold text-gray-900">Paiement non confirmé</h1>
            <p className="mb-6 text-sm text-gray-500">
              Une erreur est survenue. Contacte le BDE si le problème persiste.
            </p>
            <Link
              href={`/${locale}/events`}
              className="inline-block rounded-lg bg-gray-200 px-6 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-300"
            >
              Retour aux événements
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
