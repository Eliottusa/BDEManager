import axios from 'axios';

const baseURL =
  typeof window === 'undefined'
    ? process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL
    : process.env.NEXT_PUBLIC_API_URL;

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
  withCredentials: true, // envoie les cookies httpOnly automatiquement
  baseURL: baseURL || 'http://localhost:3001/api/v1',
});

// ── Mock interceptor (développement sans API) ─────────────────────────────
if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
  api.interceptors.response.use(
    async (response) => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return response;
    },
    async (error) => {
      const { config } = error;

      if (config.url?.includes('/events/my-registrations')) {
        return {
          data: [
            { id: 'mock-reg-1', event: { id: 'e1', title: 'Soirée de Gala (Mock)', startDate: new Date().toISOString() } },
            { id: 'mock-reg-2', event: { id: 'e2', title: 'Tournoi Sportif (Mock)', startDate: new Date(Date.now() + 86400000).toISOString() } },
          ],
          status: 200, statusText: 'OK', headers: {}, config,
        };
      }
      if (config.method === 'post' && config.url?.endsWith('/events')) {
        return { data: { id: 'new-event-id', ...JSON.parse(config.data) }, status: 201, statusText: 'Created', headers: {}, config };
      }
      if (config.url?.match(/\/events\/[a-zA-Z0-9-]+$/)) {
        return {
          data: { id: 'e1', title: 'Soirée de Gala (Mock)', description: 'Une superbe soirée.', startDate: new Date().toISOString(), endDate: new Date(Date.now() + 14400000).toISOString(), price: 15, capacity: 200, location: 'Grand Hall, Campus Nord', imageUrl: '' },
          status: 200, statusText: 'OK', headers: {}, config,
        };
      }
      if (config.url?.endsWith('/register')) {
        return { data: { message: 'Inscription réussie', checkoutUrl: null }, status: 200, statusText: 'OK', headers: {}, config };
      }
      if (config.url?.endsWith('/events')) {
        return {
          data: [
            { id: 'e1', title: 'Soirée de Gala (Mock)', description: 'Une superbe soirée.', startDate: new Date().toISOString(), price: 15, capacity: 200, location: 'Grand Hall' },
            { id: 'e2', title: 'Tournoi Sportif (Mock)', description: 'Venez affronter les autres écoles !', startDate: new Date(Date.now() + 86400000).toISOString(), price: 0, capacity: 50, location: 'Gymnase' },
          ],
          status: 200, statusText: 'OK', headers: {}, config,
        };
      }

      return Promise.reject(error);
    },
  );
}

export default api;
