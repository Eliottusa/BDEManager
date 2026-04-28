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
  location?: string;
  price: number;
  capacity: number;
  imageUrl?: string;
}

export default function EventDetailPage() {
  const t = useTranslations('events');
  const locale = useLocale();
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api.get(`/events/${id}`)
      .then((res) => setEvent(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleRegister = async () => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push(`/${locale}/auth/login`);
      return;
    }

    setRegistering(true);
    try {
      const res = await api.post(`/events/${id}/register`);
      if (res.data.checkoutUrl) {
        window.location.href = res.data.checkoutUrl;
      } else {
        setSuccess(true);
        setTimeout(() => router.push(`/${locale}/dashboard`), 2000);
      }
    } catch (err) {
      console.error('Registration failed', err);
    } finally {
      setRegistering(false);
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
        </div>

        {/* Sidebar Info & Action */}
        <aside className="space-y-6">
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
                  <p className="text-sm text-gray-500">{event.location || 'Lieu à venir'}</p>
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
               {success ? (
                 <div className="rounded-xl bg-green-50 p-4 text-center text-sm font-bold text-green-700 border border-green-100">
                    Inscription confirmée ! Redirection...
                 </div>
               ) : (
                 <button
                   onClick={handleRegister}
                   disabled={registering}
                   className="w-full rounded-2xl bg-blue-600 px-6 py-4 text-sm font-bold text-white shadow-xl shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-50 transition transform active:scale-95"
                 >
                   {registering ? 'Traitement...' : t('register')}
                 </button>
               )}
               <p className="mt-4 text-center text-xs text-gray-400">
                 Paiement sécurisé via Stripe
               </p>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
