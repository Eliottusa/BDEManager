import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';

export default function HomePage() {
  const t = useTranslations('nav');
  const locale = useLocale();

  return (
    <main>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white py-20 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-6xl">
              Gérez votre BDE <span className="text-blue-600 text-nowrap">en toute simplicité.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-500">
              La plateforme tout-en-un pour organiser vos événements, gérer les inscriptions et communiquer avec vos étudiants.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                href={`/${locale}/events`}
                className="rounded-xl bg-blue-600 px-8 py-4 text-sm font-bold text-white shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition transform hover:-translate-y-1"
              >
                Découvrir les événements
              </Link>
              <Link
                href={`/${locale}/auth/register`}
                className="text-sm font-bold leading-6 text-gray-900 hover:text-blue-600 transition"
              >
                En savoir plus <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Decorative background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-50 rounded-full blur-3xl opacity-50" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-50 rounded-full blur-3xl opacity-50" />
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 md:grid-cols-3">
            {[
              {
                title: 'Organisation simplifiée',
                desc: 'Créez vos événements en quelques clics avec toutes les informations nécessaires.',
                icon: (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                ),
              },
              {
                title: 'Billetterie intégrée',
                desc: 'Gérez les inscriptions et les paiements en toute sécurité via Stripe.',
                icon: (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                ),
              },
              {
                title: 'Notifications Live',
                desc: 'Informez vos participants en temps réel grâce aux notifications push et emails.',
                icon: (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                ),
              },
            ].map((feature, i) => (
              <div key={i} className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100">
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900">{feature.title}</h3>
                <p className="mt-3 text-gray-500 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
