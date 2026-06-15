'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import Link from 'next/link';

interface Event {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  status?: 'BROUILLON' | 'OUVERT' | 'COMPLET' | 'ANNULE';
  addressLabel?: string;
  addressCity?: string;
  price: number;
  capacity: number;
  imageUrl?: string;
}

// Inscrit tel que renvoyé par GET /events/:id/registrations (gestionnaires)
interface Registrant {
  id: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'WAITLISTED';
  createdAt: string;
  user: { id: string; firstName: string; lastName: string; email: string; phone?: string | null };
  payment?: { status: string } | null;
}

const REG_STATUS_LABELS: Record<Registrant['status'], { label: string; className: string }> = {
  CONFIRMED: { label: 'Confirmé', className: 'bg-green-100 text-green-700' },
  PENDING: { label: 'En attente', className: 'bg-amber-100 text-amber-700' },
  WAITLISTED: { label: "Liste d'attente", className: 'bg-blue-100 text-blue-700' },
  CANCELLED: { label: 'Annulé', className: 'bg-gray-200 text-gray-500' },
};

export default function EventDetailPage() {
  const t = useTranslations('events');
  const locale = useLocale();
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const router = useRouter();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [success, setSuccess] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  // Statut d'inscription de l'utilisateur courant pour CET event
  const [myStatus, setMyStatus] = useState<'none' | 'pending' | 'confirmed' | 'other'>('none');
  // Liste des inscrits (gestionnaires uniquement)
  const [registrants, setRegistrants] = useState<Registrant[]>([]);

  const canManage = isAuthenticated && (user?.role === 'ADMIN' || user?.role === 'ORGANIZER');
  const isFinished = event ? new Date(event.endDate) < new Date() : false;

  useEffect(() => {
    api.get(`/events/${id}`)
      .then((res) => setEvent(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  // Récupère l'inscription éventuelle de l'utilisateur pour adapter le bouton
  // (S'inscrire / Finaliser le paiement / Déjà inscrit).
  useEffect(() => {
    if (authLoading || !isAuthenticated || !user?.id) return;
    api.get(`/events/my-registrations?userId=${user.id}`)
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        const reg = list.find((r: any) => r.event?.id === id);
        if (!reg) setMyStatus('none');
        else if (reg.status === 'CONFIRMED') setMyStatus('confirmed');
        else if (reg.status === 'PENDING') setMyStatus('pending');
        else setMyStatus('other');
      })
      .catch(() => {});
  }, [authLoading, isAuthenticated, user?.id, id]);

  // Charge la liste des inscrits pour les gestionnaires (route sécurisée côté API).
  useEffect(() => {
    if (authLoading || !canManage) return;
    api.get(`/events/${id}/registrations`)
      .then((res) => setRegistrants(Array.isArray(res.data) ? res.data : []))
      .catch(() => {});
  }, [authLoading, canManage, id]);

  const handleRegister = async () => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setRegisterError('Connectez-vous pour vous inscrire à cet événement.');
      setTimeout(() => router.push(`/${locale}/auth/login`), 1500);
      return;
    }

    setRegistering(true);
    try {
      const res = await api.post(`/events/${id}/register`, { userId: user?.id });
      // L'API renvoie l'URL Stripe dans le champ `url` (PaymentResponseDto) pour
      // un event payant. Si présente, on redirige vers le paiement.
      const checkoutUrl = res.data?.url ?? res.data?.checkoutUrl;
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        setMyStatus('confirmed');
        setSuccess(true);
        setTimeout(() => router.push(`/${locale}/dashboard`), 2000);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setRegisterError(msg || 'Une erreur est survenue lors de l\'inscription.');
    } finally {
      setRegistering(false);
    }
  };

  // Publication d'un brouillon (BROUILLON -> OUVERT) — réservé aux gestionnaires.
  const handlePublish = async () => {
    setPublishing(true);
    try {
      await api.patch(`/events/${id}/status`, { status: 'OUVERT' });
      setEvent((prev) => (prev ? { ...prev, status: 'OUVERT' } : prev));
    } catch (err: any) {
      setRegisterError(
        err?.response?.data?.message || 'La publication a échoué.',
      );
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="animate-pulse">
          <div className="h-[400px] w-full rounded-3xl bg-gray-200 mb-8"></div>
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-8 w-64 rounded bg-gray-200"></div>
              <div className="h-4 w-full rounded bg-gray-200"></div>
              <div className="h-4 w-full rounded bg-gray-200"></div>
            </div>
            <div className="h-64 rounded-2xl bg-gray-200"></div>
          </div>
        </div>
      </main>
    );
  }

  if (!event) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Événement introuvable</h1>
        <Link href={`/${locale}/events`} className="mt-4 text-blue-600 hover:underline inline-block">
          Retour à la liste
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Hero with Image Placeholder */}
      <div className="relative h-[300px] md:h-[450px] w-full overflow-hidden rounded-3xl bg-gray-900 shadow-2xl mb-10">
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
        <div className="absolute inset-0 flex items-center justify-center text-gray-700">
           <svg className="h-24 w-24 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.581-1.581a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
           </svg>
        </div>
        
        <div className="absolute bottom-8 left-8 right-8 z-20">
          <div className="flex flex-wrap items-center gap-4 mb-4">
             <span className="rounded-full bg-blue-600 px-4 py-1 text-sm font-bold text-white shadow-lg">
                {event.price === 0 ? t('free') : `${event.price} €`}
             </span>
             <span className="rounded-full bg-white/20 backdrop-blur-md px-4 py-1 text-sm font-medium text-white">
                {new Date(event.startDate).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}
             </span>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white">{event.title}</h1>
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <section className="rounded-3xl bg-white p-8 shadow-sm border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">À propos de cet événement</h2>
            <div className="prose prose-blue max-w-none text-gray-600 leading-relaxed">
              {event.description}
            </div>
          </section>

          {/* Liste des inscrits — visible uniquement par les gestionnaires */}
          {canManage && (
            <section className="mt-8 rounded-3xl bg-white p-8 shadow-sm border border-gray-100">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Inscrits</h2>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-600">
                  {registrants.filter((r) => r.status !== 'CANCELLED').length} / {event.capacity}
                </span>
              </div>
              {registrants.length === 0 ? (
                <p className="text-sm text-gray-500">Aucune inscription pour le moment.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-xs uppercase tracking-wider text-gray-400">
                        <th className="pb-3 pr-4 font-semibold">Nom</th>
                        <th className="pb-3 pr-4 font-semibold">Email</th>
                        <th className="pb-3 pr-4 font-semibold">Téléphone</th>
                        <th className="pb-3 font-semibold">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {registrants.map((r) => {
                        const badge = REG_STATUS_LABELS[r.status];
                        return (
                          <tr key={r.id}>
                            <td className="py-3 pr-4 font-medium text-gray-900">
                              {r.user.firstName} {r.user.lastName}
                            </td>
                            <td className="py-3 pr-4 text-gray-500">{r.user.email}</td>
                            <td className="py-3 pr-4 text-gray-500">{r.user.phone || '—'}</td>
                            <td className="py-3">
                              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${badge.className}`}>
                                {badge.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </div>

        {/* Sidebar Info & Action */}
        <aside className="space-y-6">
          {canManage && (
            <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Gestion</p>
              {event.status === 'BROUILLON' && (
                <button
                  onClick={handlePublish}
                  disabled={publishing}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50 transition"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  {publishing ? 'Publication...' : 'Publier l’événement'}
                </button>
              )}
              <Link
                href={`/${locale}/events/${id}/edit`}
                className="flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-6 py-3 text-sm font-bold text-blue-700 hover:bg-blue-100 transition"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Modifier l&apos;événement
              </Link>
              <p className="text-center text-xs text-gray-400">
                Statut : {event.status ?? '—'}{isFinished ? ' · terminé' : ''}
              </p>
            </div>
          )}
          <div className="rounded-3xl bg-white p-8 shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Informations pratiques</h3>
            
            <ul className="space-y-6">
              <li className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Horaire</p>
                  <p className="text-sm text-gray-500">
                    De {new Date(event.startDate).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })} à {new Date(event.endDate).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </li>

              <li className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Lieu</p>
                  <p className="text-sm text-gray-500">{event.addressLabel || event.addressCity || 'Lieu à venir'}</p>
                </div>
              </li>

              <li className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Capacité</p>
                  <p className="text-sm text-gray-500">{event.capacity} places au total</p>
                </div>
              </li>
            </ul>

            <div className="mt-10">
               {registerError && (
                 <div className="mb-4 rounded-xl bg-amber-50 p-3 text-center text-sm text-amber-700 border border-amber-100">
                   {registerError}
                 </div>
               )}
               {success ? (
                 <div className="rounded-xl bg-green-50 p-4 text-center text-sm font-bold text-green-700 border border-green-100">
                    Inscription confirmée ! Redirection...
                 </div>
               ) : myStatus === 'confirmed' ? (
                 <div className="space-y-3">
                   <div className="flex items-center justify-center gap-2 rounded-xl bg-green-50 p-4 text-sm font-bold text-green-700 border border-green-100">
                     <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                     </svg>
                     Vous êtes inscrit à cet événement
                   </div>
                   <Link href={`/${locale}/dashboard`} className="block text-center text-sm font-semibold text-blue-600 hover:underline">
                     Voir dans Mon espace
                   </Link>
                 </div>
               ) : isFinished ? (
                 <div className="rounded-xl bg-gray-100 p-4 text-center text-sm font-bold text-gray-500 border border-gray-200">
                   Cet événement est terminé
                 </div>
               ) : myStatus === 'pending' ? (
                 <>
                   <div className="mb-4 rounded-xl bg-amber-50 p-3 text-center text-sm text-amber-700 border border-amber-100">
                     Paiement en attente — finalisez-le pour confirmer votre place.
                   </div>
                   <button
                     onClick={handleRegister}
                     disabled={registering}
                     className="w-full rounded-2xl bg-blue-600 px-6 py-4 text-sm font-bold text-white shadow-xl shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-50 transition transform active:scale-95"
                   >
                     {registering ? 'Traitement...' : 'Finaliser le paiement'}
                   </button>
                 </>
               ) : (
                 <button
                   onClick={handleRegister}
                   disabled={registering}
                   className="w-full rounded-2xl bg-blue-600 px-6 py-4 text-sm font-bold text-white shadow-xl shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-50 transition transform active:scale-95"
                 >
                   {registering ? 'Traitement...' : t('register')}
                 </button>
               )}
               {myStatus !== 'confirmed' && !success && !isFinished && (
                 <p className="mt-4 text-center text-xs text-gray-400">
                   Paiement sécurisé via Stripe
                 </p>
               )}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
