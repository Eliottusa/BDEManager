'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';
import Link from 'next/link';

const schema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const t = useTranslations('auth');
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setError(null);
    try {
      await login(data.email, data.password);
    } catch (err) {
      setError('Identifiants invalides ou erreur serveur');
    }
  };

  return (
    <main className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('login')}</h1>
          <p className="mt-2 text-sm text-gray-500">Heureux de vous revoir sur BDE Manager.</p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="rounded-2xl bg-white p-8 shadow-xl border border-gray-100"
        >
          {error && (
            <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-100 flex items-center gap-3">
              <svg className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <div className="mb-5">
            <label className="mb-2 block text-sm font-semibold text-gray-700">{t('email')}</label>
            <input
              type="email"
              {...register('email')}
              placeholder="votre@email.com"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition"
            />
            {errors.email && <p className="mt-2 text-xs text-red-500 font-medium">{errors.email.message}</p>}
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-700">{t('password')}</label>
              <a href="#" className="text-xs font-medium text-blue-600 hover:underline">Mot de passe oublié ?</a>
            </div>
            <input
              type="password"
              {...register('password')}
              placeholder="••••••••"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition"
            />
            {errors.password && <p className="mt-2 text-xs text-red-500 font-medium">{errors.password.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-50 transition transform active:scale-[0.98]"
          >
            {isSubmitting ? 'Connexion en cours...' : t('login')}
          </button>

          <p className="mt-8 text-center text-sm text-gray-500">
            Pas encore de compte ?{' '}
            <Link href="/auth/register" className="font-bold text-blue-600 hover:underline">
              {t('register')}
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
