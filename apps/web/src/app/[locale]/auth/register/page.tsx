'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations, useLocale } from 'next-intl';
import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AddressAutocomplete from '@/components/AddressAutocomplete';

const schema = z.object({
  firstName: z.string().min(1, 'Prénom requis'),
  lastName: z.string().min(1, 'Nom requis'),
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Minimum 8 caractères'),
  phone: z.string().optional(),
  city: z.string().optional(),
  postcode: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const { register: registerUser } = useAuth();
  const searchParams = useSearchParams();
  // Page d'origine à rejoindre après inscription (ex: fiche événement).
  const redirect = searchParams.get('redirect') ?? undefined;
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setError(null);
    try {
      const { city: _city, postcode: _postcode, ...registerData } = data;
      await registerUser(registerData, redirect);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      if (msg === 'Un compte existe déjà avec cet email') {
        setError('Un compte existe déjà avec cet email.');
      } else {
        setError('Une erreur est survenue. Veuillez réessayer.');
      }
    }
  };

  return (
    <main className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('register')}</h1>
          <p className="mt-2 text-sm text-gray-500">Créez votre compte BDE Manager.</p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="rounded-2xl bg-white p-8 shadow-xl border border-gray-100 space-y-5"
        >
          {error && (
            <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-100 flex items-center gap-3">
              <svg className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">{t('firstName')}</label>
              <input type="text" {...register('firstName')} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition" />
              {errors.firstName && <p className="mt-1 text-xs text-red-500">{errors.firstName.message}</p>}
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">{t('lastName')}</label>
              <input type="text" {...register('lastName')} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition" />
              {errors.lastName && <p className="mt-1 text-xs text-red-500">{errors.lastName.message}</p>}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">{t('email')}</label>
            <input type="email" {...register('email')} placeholder="votre@email.com" className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition" />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">{t('password')}</label>
            <input type="password" {...register('password')} placeholder="••••••••" className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition" />
            {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Téléphone <span className="text-gray-400 font-normal">(optionnel)</span>
            </label>
            <input type="tel" {...register('phone')} placeholder="06 00 00 00 00" className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition" />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Adresse <span className="text-gray-400 font-normal">(optionnel)</span>
            </label>
            <AddressAutocomplete
              placeholder="Votre ville ou adresse…"
              onSelect={(addr) => {
                setValue('city', addr.city);
                setValue('postcode', addr.postcode);
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-50 transition transform active:scale-[0.98]"
          >
            {isSubmitting ? 'Création en cours...' : t('register')}
          </button>

          <p className="text-center text-sm text-gray-500">
            Déjà un compte ?{' '}
            <Link
              href={`/${locale}/auth/login${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`}
              className="font-bold text-blue-600 hover:underline"
            >
              {t('login')}
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
