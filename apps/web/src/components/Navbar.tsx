'use client';

import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';

export default function Navbar() {
  const t = useTranslations('nav');
  const locale = useLocale();
  const { isAuthenticated, logout, user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <nav className="border-b border-gray-200 bg-white sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between items-center">
          {/* Logo */}
          <div className="flex shrink-0 items-center">
            <Link href={`/${locale}`} className="text-xl font-bold text-blue-600">
              BDE Manager
            </Link>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex md:items-center md:space-x-8">
            <Link
              href={`/${locale}/events`}
              className="text-sm font-medium text-gray-700 hover:text-blue-600 transition"
            >
              {t('events')}
            </Link>
            
            {isAuthenticated ? (
              <>
                {(user?.role === 'ADMIN' || user?.role === 'ORGANIZER') && (
                  <Link
                    href={`/${locale}/events/create`}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 transition"
                  >
                    {t('admin')}
                  </Link>
                )}
                <Link
                  href={`/${locale}/dashboard`}
                  className="text-sm font-medium text-gray-700 hover:text-blue-600 transition"
                >
                  {t('dashboard')}
                </Link>
                <Link
                  href={`/${locale}/profile`}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600 hover:bg-blue-200 transition"
                  title={t('profile')}
                >
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </Link>
                <button
                  onClick={logout}
                  className="rounded-lg bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
                >
                  {t('logout')}
                </button>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  href={`/${locale}/auth/login`}
                  className="text-sm font-medium text-gray-700 hover:text-blue-600 transition"
                >
                  {t('login')}
                </Link>
                <Link
                  href={`/${locale}/auth/register`}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
                >
                  {t('register')}
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none"
            >
              <span className="sr-only">Open main menu</span>
              {isMenuOpen ? (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white">
          <div className="space-y-1 px-2 pb-3 pt-2">
            <Link
              href={`/${locale}/events`}
              className="block rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-blue-600"
              onClick={() => setIsMenuOpen(false)}
            >
              {t('events')}
            </Link>
            {isAuthenticated ? (
              <>
                {(user?.role === 'ADMIN' || user?.role === 'ORGANIZER') && (
                  <Link
                    href={`/${locale}/events/create`}
                    className="block rounded-md px-3 py-2 text-base font-medium text-blue-600 hover:bg-blue-50"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {t('admin')}
                  </Link>
                )}
                <Link
                  href={`/${locale}/dashboard`}
                  className="block rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-blue-600"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t('dashboard')}
                </Link>
                <button
                  onClick={() => { logout(); setIsMenuOpen(false); }}
                  className="block w-full text-left rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50"
                >
                  {t('logout')}
                </button>
              </>
            ) : (
              <>
                <Link
                  href={`/${locale}/auth/login`}
                  className="block rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t('login')}
                </Link>
                <Link
                  href={`/${locale}/auth/register`}
                  className="block rounded-md px-3 py-2 text-base font-medium text-blue-600 hover:bg-blue-50"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t('register')}
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
