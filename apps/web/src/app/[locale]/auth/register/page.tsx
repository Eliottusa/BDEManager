'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import AddressAutocomplete from '@/components/AddressAutocomplete';

const schema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
  city: z.string().optional(),
  postcode: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    const res = await fetch('http://localhost:3001/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) return;
    router.push('/auth/login');
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-sm rounded-xl bg-white p-8 shadow"
      >
        <h1 className="mb-6 text-2xl font-semibold text-gray-900">{t('register')}</h1>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">{t('firstName')}</label>
          <input
            type="text"
            {...register('firstName')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          {errors.firstName && <p className="mt-1 text-xs text-red-500">{errors.firstName.message}</p>}
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">{t('lastName')}</label>
          <input
            type="text"
            {...register('lastName')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          {errors.lastName && <p className="mt-1 text-xs text-red-500">{errors.lastName.message}</p>}
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">{t('email')}</label>
          <input
            type="email"
            {...register('email')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">{t('password')}</label>
          <input
            type="password"
            {...register('password')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Téléphone <span className="text-gray-400">(optionnel)</span>
          </label>
          <input
            type="tel"
            {...register('phone')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="mb-6">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Adresse <span className="text-gray-400">(optionnel)</span>
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
          className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {t('register')}
        </button>
      </form>
    </main>
  );
}
