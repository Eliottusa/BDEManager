'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/context/AuthContext';
import { useTranslations, useLocale } from 'next-intl';
import api from '@/lib/api';

interface Registration {
  id: string;
  event: { id: string; title: string; startDate: string; location?: string };
}

interface Notification {
  id: string;
  message: string;
  createdAt: string;
}

export default function DashboardPage() {
  const { isAuthenticated, isLoading, accessToken, logout, user } = useAuth();
  const t = useTranslations('dashboard');
  const locale = useLocale();
  const router = useRouter();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.push(`/${locale}/auth/login`);
      return;
    }

    // Fetch registrations
    api.get('/events/my-registrations')
      .then((res) => setRegistrations(Array.isArray(res.data) ? res.data : []))
      .catch(() => {})
      .finally(() => setDataLoading(false));

    // Socket.io initialization
    const isMock = process.env.NEXT_PUBLIC_MOCK_AUTH === 'true';
    if (!isMock) {
      const socket: Socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001', {
        auth: { token: accessToken },
        transports: ['websocket'],
      });
      socketRef.current = socket;

      socket.on('notification', (notif: Notification) => {
        setNotifications((prev) => [notif, ...prev]);
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [isLoading, isAuthenticated, accessToken, router, locale]);

  if (isLoading || dataLoading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="animate-pulse">
          <div className="h-8 w-64 rounded bg-gray-200 mb-10"></div>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="md:col-span-2 space-y-4">
              <div className="h-6 w-32 rounded bg-gray-200"></div>
              <div className="h-32 rounded-xl bg-gray-200"></div>
              <div className="h-32 rounded-xl bg-gray-200"></div>
            </div>
            <div className="space-y-4">
              <div className="h-6 w-32 rounded bg-gray-200"></div>
              <div className="h-64 rounded-xl bg-gray-200"></div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900">
          {t('welcome', { name: user?.firstName || 'Étudiant' })}
        </h1>
        <p className="mt-2 text-gray-500">Gérez vos participations et restez informé.</p>
      </header>

      <div className="grid gap-10 lg:grid-cols-3">
        {/* Left Column: Registrations */}
        <section className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">{t('myRegistrations')}</h2>
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
              {registrations.length}
            </span>
          </div>

          {registrations.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 py-12 text-center bg-white/50">
              <p className="text-sm text-gray-500">{t('noRegistrations')}</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {registrations.map((reg) => (
                <li
                  key={reg.id}
                  className="group relative flex items-center justify-between overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 transition hover:shadow-md"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition">
                        {reg.event.title}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {new Date(reg.event.startDate).toLocaleDateString(locale, {
                          day: 'numeric', month: 'long', year: 'numeric',
                        })}
                        {reg.event.location && ` • ${reg.event.location}`}
                      </p>
                    </div>
                  </div>
                  <svg className="h-5 w-5 text-gray-300 transition group-hover:text-blue-400 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Right Column: Notifications */}
        <section>
          <h2 className="mb-6 text-xl font-bold text-gray-900">{t('notifications')}</h2>
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            {notifications.length === 0 ? (
              <div className="text-center py-6">
                <svg className="mx-auto h-10 w-10 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <p className="mt-4 text-sm text-gray-500">{t('noNotifications')}</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {notifications.map((notif) => (
                  <li key={notif.id} className="py-4 first:pt-0 last:pb-0">
                    <p className="text-sm text-gray-800">{notif.message}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      {new Date(notif.createdAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
