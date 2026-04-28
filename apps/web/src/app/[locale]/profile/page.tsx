'use client';

import { useAuth } from '@/context/AuthContext';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const t = useTranslations('profile');
  const locale = useLocale();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(`/${locale}/auth/login`);
    }
  }, [isLoading, isAuthenticated, router, locale]);

  if (isLoading || !user) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 animate-pulse">
         <div className="h-8 w-48 bg-gray-200 rounded mb-8"></div>
         <div className="h-64 bg-white rounded-3xl border border-gray-100"></div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('title')}</h1>

      <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-blue-600 to-blue-400 h-32" />
        
        <div className="px-8 pb-8">
          <div className="relative -mt-12 mb-6">
            <div className="inline-flex h-24 w-24 items-center justify-center rounded-2xl bg-white p-1 shadow-xl">
              <div className="flex h-full w-full items-center justify-center rounded-xl bg-blue-50 text-3xl font-bold text-blue-600 uppercase">
                {user.firstName?.[0]}{user.lastName?.[0]}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {user.firstName} {user.lastName}
              </h2>
              <p className="text-gray-500">{user.email}</p>
            </div>
            <span className="rounded-full bg-blue-100 px-4 py-1 text-xs font-bold text-blue-700 uppercase">
              {user.role}
            </span>
          </div>

          <hr className="border-gray-100 mb-8" />

          <section>
            <h3 className="text-lg font-bold text-gray-900 mb-6">{t('personalInfo')}</h3>
            
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Prénom</label>
                <p className="text-gray-900 font-medium">{user.firstName}</p>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Nom</label>
                <p className="text-gray-900 font-medium">{user.lastName}</p>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Email</label>
                <p className="text-gray-900 font-medium">{user.email}</p>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">{t('role')}</label>
                <p className="text-gray-900 font-medium">{user.role}</p>
              </div>
            </div>
          </section>

          <div className="mt-10">
            <button className="rounded-xl bg-gray-900 px-6 py-3 text-sm font-bold text-white shadow-lg hover:bg-black transition transform active:scale-95">
              {t('edit')}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
