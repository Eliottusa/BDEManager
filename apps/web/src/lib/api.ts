import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const baseURL =
  typeof window === 'undefined'
    ? process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL
    : process.env.NEXT_PUBLIC_API_URL;

const api = axios.create({
  baseURL: baseURL || 'http://localhost:3001/api/v1',
  withCredentials: true,
});

// Endpoints pour lesquels on ne tente JAMAIS de refresh :
//  - /auth/refresh : éviterait une boucle infinie
//  - /auth/login, /auth/register : un 401 = vraie erreur d'identifiants
//  - /auth/logout : inutile
const NO_REFRESH = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

// Un seul appel /auth/refresh partagé, même si plusieurs requêtes tombent en
// 401 simultanément (évite N refresh en parallèle).
let refreshPromise: Promise<unknown> | null = null;

function redirectToLogin() {
  if (typeof window === 'undefined') return;
  const locale = window.location.pathname.split('/')[1] || 'fr';
  window.location.href = `/${locale}/auth/login`;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;
    const status = error.response?.status;
    const url = original?.url ?? '';
    const skipRefresh = NO_REFRESH.some((path) => url.includes(path));

    // On ne tente le refresh que : sur un 401, côté navigateur, une seule fois
    // par requête, et hors endpoints d'auth sensibles.
    if (
      status !== 401 ||
      !original ||
      original._retry ||
      skipRefresh ||
      typeof window === 'undefined'
    ) {
      return Promise.reject(error);
    }

    original._retry = true;

    try {
      // Le token d'accès (15 min) a expiré : on le renouvelle via le refresh
      // token (7 jours), puis on rejoue la requête initiale avec le nouveau cookie.
      if (!refreshPromise) {
        refreshPromise = api.post('/auth/refresh').finally(() => {
          refreshPromise = null;
        });
      }
      await refreshPromise;
      return api(original);
    } catch (refreshError) {
      // Refresh impossible : session réellement expirée / absente.
      // Pas de redirection pour la sonde /auth/me : les pages publiques doivent
      // rester accessibles à un visiteur non connecté.
      if (!url.includes('/auth/me')) {
        redirectToLogin();
      }
      return Promise.reject(refreshError);
    }
  },
);

export default api;
