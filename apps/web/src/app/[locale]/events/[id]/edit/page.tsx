'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useParams, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import api from '@/lib/api';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

const schema = z.object({
  title: z.string().min(1, 'Le titre est requis'),
  description: z.string().min(1, 'La description est requise'),
  startDate: z.string().min(1, 'La date de début est requise'),
  endDate: z.string().min(1, 'La date de fin est requise'),
  capacity: z.coerce.number().min(1, 'La capacité doit être d\'au moins 1'),
  price: z.coerce.number().min(0, 'Le prix ne peut pas être négatif'),
  addressLabel: z.string().optional(),
  addressCity: z.string().optional(),
  addressZip: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

type FormData = z.infer<typeof schema>;

// ISO -> valeur attendue par <input type="datetime-local"> (YYYY-MM-DDTHH:mm)
function toDatetimeLocal(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EditEventPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('events');
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const canManage = user?.role === 'ADMIN' || user?.role === 'ORGANIZER';

  const { register, handleSubmit, setValue, reset, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  // Garde d'accès : seuls ADMIN / ORGANIZER peuvent éditer
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.push(`/${locale}/auth/login`);
      return;
    }
    if (!canManage) {
      router.push(`/${locale}/events`);
    }
  }, [isLoading, isAuthenticated, canManage, router, locale]);

  // Pré-remplissage du formulaire avec l'événement existant
  useEffect(() => {
    if (!id) return;
    api.get(`/events/${id}`)
      .then((res) => {
        const ev = res.data;
        reset({
          title: ev.title ?? '',
          description: ev.description ?? '',
          startDate: toDatetimeLocal(ev.startDate),
          endDate: toDatetimeLocal(ev.endDate),
          capacity: ev.capacity ?? 1,
          price: ev.price ?? 0,
          addressLabel: ev.addressLabel ?? '',
          addressCity: ev.addressCity ?? '',
          addressZip: ev.addressZip ?? '',
          latitude: ev.latitude ?? undefined,
          longitude: ev.longitude ?? undefined,
        });
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id, reset]);

  const onSubmit = async (data: FormData) => {
    setError(null);
    try {
      await api.patch(`/events/${id}`, {
        title: data.title,
        description: data.description,
        startDate: data.startDate,
        endDate: data.endDate,
        capacity: data.capacity,
        price: data.price,
        isFree: data.price === 0,
        addressLabel: data.addressLabel || '',
        addressCity: data.addressCity || '',
        addressZip: data.addressZip || '',
        latitude: data.latitude,
        longitude: data.longitude,
      });
      setSuccess(true);
      setTimeout(() => router.push(`/${locale}/events/${id}`), 1500);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(msg || 'Une erreur est survenue lors de la modification de l\'événement.');
    }
  };

  if (isLoading || loading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-64 rounded bg-gray-200"></div>
          <div className="h-64 rounded-3xl bg-gray-200"></div>
          <div className="h-48 rounded-3xl bg-gray-200"></div>
        </div>
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Événement introuvable</h1>
        <button
          onClick={() => router.push(`/${locale}/events`)}
          className="mt-4 text-blue-600 hover:underline"
        >
          Retour à la liste
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Modifier l&apos;événement</h1>
        <p className="mt-2 text-gray-500">Mettez à jour les informations de cet événement.</p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-100 flex items-center gap-3">
          <svg className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <section className="rounded-3xl bg-white p-8 shadow-sm border border-gray-100 space-y-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Informations générales
          </h2>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Titre de l&apos;événement</label>
            <input
              type="text"
              {...register('title')}
              placeholder="Ex: Soirée d'intégration 2024"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition"
            />
            {errors.title && <p className="mt-2 text-xs text-red-500 font-medium">{errors.title.message}</p>}
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Description</label>
            <textarea
              {...register('description')}
              rows={4}
              placeholder="Décrivez votre événement en quelques lignes..."
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition"
            />
            {errors.description && <p className="mt-2 text-xs text-red-500 font-medium">{errors.description.message}</p>}
          </div>
        </section>

        <section className="rounded-3xl bg-white p-8 shadow-sm border border-gray-100 space-y-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Planification & Lieu
          </h2>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Date et heure de début</label>
              <input
                type="datetime-local"
                {...register('startDate')}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500 transition"
              />
              {errors.startDate && <p className="mt-2 text-xs text-red-500 font-medium">{errors.startDate.message}</p>}
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Date et heure de fin</label>
              <input
                type="datetime-local"
                {...register('endDate')}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500 transition"
              />
              {errors.endDate && <p className="mt-2 text-xs text-red-500 font-medium">{errors.endDate.message}</p>}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Localisation</label>
            <AddressAutocomplete
              placeholder="Chercher une adresse..."
              onSelect={(addr) => {
                setValue('addressLabel', addr.label);
                setValue('addressCity', addr.city);
                setValue('addressZip', addr.postcode);
                setValue('latitude', addr.lat);
                setValue('longitude', addr.lon);
              }}
            />
            <p className="mt-2 text-xs text-gray-400 italic">Laissez vide pour conserver l&apos;adresse actuelle.</p>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-8 shadow-sm border border-gray-100 space-y-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Capacité & Tarification
          </h2>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Nombre de places</label>
              <input
                type="number"
                min={1}
                {...register('capacity')}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500 transition"
              />
              {errors.capacity && <p className="mt-2 text-xs text-red-500 font-medium">{errors.capacity.message}</p>}
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Prix par place (€)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                {...register('price')}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500 transition"
              />
              {errors.price && <p className="mt-2 text-xs text-red-500 font-medium">{errors.price.message}</p>}
            </div>
          </div>
        </section>

        <div className="flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={() => router.push(`/${locale}/events/${id}`)}
            className="rounded-xl px-6 py-3 text-sm font-bold text-gray-500 hover:text-gray-700 transition"
          >
            Annuler
          </button>
          {success ? (
            <div className="rounded-xl bg-green-50 px-8 py-3 text-sm font-bold text-green-700 border border-green-100 flex items-center gap-2">
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
              Modifications enregistrées ! Redirection...
            </div>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-blue-600 px-8 py-3 text-sm font-bold text-white shadow-xl shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-50 transition transform active:scale-95 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Enregistrement...
                </>
              ) : (
                'Enregistrer les modifications'
              )}
            </button>
          )}
        </div>
      </form>
    </main>
  );
}
