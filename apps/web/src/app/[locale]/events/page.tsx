'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface Event {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate?: string;
  status?: 'BROUILLON' | 'OUVERT' | 'COMPLET' | 'ANNULE';
  addressLabel?: string;
  addressCity?: string;
  price: number;
  capacity: number;
  imageUrl?: string;
}

// Libellé + couleur d'un badge de statut (vue gestion uniquement)
function statusBadge(ev: Event): { label: string; className: string } | null {
  const isPast = ev.endDate ? new Date(ev.endDate) < new Date() : false;
  if (isPast) return { label: 'Terminé', className: 'bg-gray-200 text-gray-600' };
  switch (ev.status) {
    case 'BROUILLON': return { label: 'Brouillon', className: 'bg-amber-100 text-amber-700' };
    case 'OUVERT': return { label: 'Publié', className: 'bg-green-100 text-green-700' };
    case 'COMPLET': return { label: 'Complet', className: 'bg-blue-100 text-blue-700' };
    case 'ANNULE': return { label: 'Annulé', className: 'bg-red-100 text-red-700' };
    default: return null;
  }
}

export default function EventsPage() {
  const t = useTranslations('events');
  const locale = useLocale();
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const canManage = isAuthenticated && (user?.role === 'ADMIN' || user?.role === 'ORGANIZER');
  const canCreate = canManage;
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  // Tri / filtres (appliqués côté client, sur la liste déjà chargée)
  const [sortBy, setSortBy] = useState<'date-asc' | 'date-desc' | 'price-asc' | 'price-desc'>('date-asc');
  const [priceFilter, setPriceFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [locationQuery, setLocationQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'BROUILLON' | 'OUVERT' | 'COMPLET' | 'ANNULE' | 'past'>('all');

  useEffect(() => {
    // On attend que l'auth soit résolue pour choisir le bon endpoint :
    //  - gestionnaire -> /events/manage (tous les events, pour les gérer)
    //  - visiteur      -> /events (publiés & à venir uniquement)
    if (authLoading) return;
    const endpoint = canManage ? '/events/manage' : '/events';
    api.get(endpoint)
      .then((res) => setEvents(Array.isArray(res.data) ? res.data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [authLoading, canManage]);

  // Liste affichée = events filtrés puis triés. Recalculée uniquement quand une
  // dépendance change (mémoïsée) — instantané sur ce volume.
  const visibleEvents = useMemo(() => {
    const now = Date.now();
    let list = [...events];

    // Filtre prix
    if (priceFilter === 'free') list = list.filter((e) => e.price === 0);
    else if (priceFilter === 'paid') list = list.filter((e) => e.price > 0);

    // Filtre lieu (ville ou libellé d'adresse, insensible à la casse)
    const q = locationQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((e) =>
        `${e.addressCity ?? ''} ${e.addressLabel ?? ''}`.toLowerCase().includes(q),
      );
    }

    // Filtre statut (vue gestion uniquement)
    if (canManage && statusFilter !== 'all') {
      if (statusFilter === 'past') {
        list = list.filter((e) => e.endDate && new Date(e.endDate).getTime() < now);
      } else {
        list = list.filter((e) => e.status === statusFilter);
      }
    }

    // Tri
    return list.sort((a, b) => {
      switch (sortBy) {
        case 'price-asc': return a.price - b.price;
        case 'price-desc': return b.price - a.price;
        case 'date-desc': return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
        case 'date-asc':
        default: return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
      }
    });
  }, [events, sortBy, priceFilter, locationQuery, statusFilter, canManage]);

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
        {canCreate && (
          <Link
            href={`/${locale}/events/create`}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition"
          >
            <svg className="-ml-0.5 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            {t('create')}
          </Link>
        )}
      </div>

      {events.length > 0 && (
        <div className="mb-8 flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="mb-1 block text-xs font-semibold text-gray-500">Lieu</label>
            <input
              type="text"
              value={locationQuery}
              onChange={(e) => setLocationQuery(e.target.value)}
              placeholder="Ville ou adresse…"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <div className="min-w-[170px]">
            <label className="mb-1 block text-xs font-semibold text-gray-500">Trier par</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
            >
              <option value="date-asc">Date (ASC)</option>
              <option value="date-desc">Date (DESC)</option>
              <option value="price-asc">Prix (ASC)</option>
              <option value="price-desc">Prix (DESC)</option>
            </select>
          </div>
          <div className="min-w-[120px]">
            <label className="mb-1 block text-xs font-semibold text-gray-500">Prix</label>
            <select
              value={priceFilter}
              onChange={(e) => setPriceFilter(e.target.value as typeof priceFilter)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
            >
              <option value="all">Tous</option>
              <option value="free">Gratuit</option>
              <option value="paid">Payant</option>
            </select>
          </div>
          {canManage && (
            <div className="min-w-[140px]">
              <label className="mb-1 block text-xs font-semibold text-gray-500">Statut</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                <option value="all">Tous</option>
                <option value="BROUILLON">Brouillon</option>
                <option value="OUVERT">Publié</option>
                <option value="COMPLET">Complet</option>
                <option value="ANNULE">Annulé</option>
                <option value="past">Terminé</option>
              </select>
            </div>
          )}
        </div>
      )}

      {events.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 py-20 text-center">
          <p className="text-sm text-gray-500">{t('noEvents')}</p>
        </div>
      ) : visibleEvents.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 py-20 text-center">
          <p className="text-sm text-gray-500">Aucun événement ne correspond à ces filtres.</p>
        </div>
      ) : (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {visibleEvents.map((event) => {
            const badge = canManage ? statusBadge(event) : null;
            return (
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
                {badge && (
                  <div className={`absolute top-4 left-4 rounded-full px-3 py-1 text-xs font-bold shadow-sm ${badge.className}`}>
                    {badge.label}
                  </div>
                )}
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
                  {event.addressCity || event.addressLabel || 'Lieu à définir'}
                </div>
              </div>
            </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
