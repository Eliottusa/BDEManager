'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import api from '@/lib/api';

interface Event {
  id: string;
  title: string;
  description: string;
  startDate: string;
  location?: string;
  price: number;
  capacity: number;
  imageUrl?: string;
}

export default function EventsPage() {
  const t = useTranslations('events');
  const locale = useLocale();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/events')
      .then((res) => setEvents(Array.isArray(res.data) ? res.data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="animate-pulse">
          <div className="h-8 w-48 rounded bg-gray-200 mb-8"></div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 rounded-xl bg-gray-200"></div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
          <p className="mt-2 text-sm text-gray-500">Découvrez et participez aux événements de votre BDE.</p>
        </div>
        <Link
          href={`/${locale}/events/create`}
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition"
        >
          <svg className="-ml-0.5 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          {t('create')}
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 py-20 text-center">
          <p className="text-sm text-gray-500">{t('noEvents')}</p>
        </div>
      ) : (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/${locale}/events/${event.id}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition hover:shadow-xl hover:-translate-y-1"
            >
              <div className="relative h-48 w-full bg-gray-100 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                <div className="absolute top-4 right-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-blue-600 backdrop-blur-sm shadow-sm">
                  {event.price === 0 ? t('free') : `${event.price} €`}
                </div>
                {/* Placeholder image logic */}
                <div className="flex h-full items-center justify-center text-gray-300">
                  <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6.75a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6.75v10.5a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                </div>
              </div>
              <div className="flex flex-1 flex-col p-6">
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                    {new Date(event.startDate).toLocaleDateString(locale, { month: 'long', day: 'numeric' })}
                  </p>
                  <h3 className="mt-2 text-xl font-bold text-gray-900 group-hover:text-blue-600 transition">
                    {event.title}
                  </h3>
                  <p className="mt-3 text-sm text-gray-500 line-clamp-2">
                    {event.description}
                  </p>
                </div>
                <div className="mt-6 flex items-center text-sm text-gray-400">
                  <svg className="mr-1.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                  {event.location || 'Lieu à définir'}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
