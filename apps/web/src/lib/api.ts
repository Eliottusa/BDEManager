import axios from 'axios';

const baseURL =
  typeof window === 'undefined'
    ? process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL
    : process.env.NEXT_PUBLIC_API_URL;

const api = axios.create({
  baseURL: baseURL || 'http://localhost:3001/api/v1',
});

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Mock interceptor for development/rendering tests
if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
  api.interceptors.response.use(
    async (response) => {
      // Small delay to simulate network
      await new Promise((resolve) => setTimeout(resolve, 300));
      return response;
    },
    async (error) => {
      if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
        const { config } = error;
        
        // Mock registrations
        if (config.url?.includes('/events/my-registrations')) {
          return {
            data: [
              {
                id: 'mock-reg-1',
                event: { id: 'e1', title: 'Soirée de Gala (Mock)', startDate: new Date().toISOString() }
              },
              {
                id: 'mock-reg-2',
                event: { id: 'e2', title: 'Tournoi Sportif (Mock)', startDate: new Date(Date.now() + 86400000).toISOString() }
              }
            ],
            status: 200,
            statusText: 'OK',
            headers: {},
            config,
          };
        }

        // Mock event details
        if (config.method === 'post' && config.url?.endsWith('/events')) {
          return {
            data: { id: 'new-event-id', ...JSON.parse(config.data) },
            status: 201,
            statusText: 'Created',
            headers: {},
            config,
          };
        }

        // Mock event details callback
        if (config.url?.match(/\/events\/[a-zA-Z0-9-]+$/)) {
          return {
            data: {
              id: 'e1',
              title: 'Soirée de Gala (Mock)',
              description: 'Une superbe soirée de gala pour tous les étudiants. Au programme : DJ, buffet, et photobooth. Tenue correcte exigée.',
              startDate: new Date().toISOString(),
              endDate: new Date(Date.now() + 14400000).toISOString(),
              price: 15,
              capacity: 200,
              location: 'Grand Hall, Campus Nord',
              imageUrl: ''
            },
            status: 200,
            statusText: 'OK',
            headers: {},
            config,
          };
        }

        // Mock registration
        if (config.url?.endsWith('/register')) {
          return {
            data: { message: 'Inscription réussie', checkoutUrl: null },
            status: 200,
            statusText: 'OK',
            headers: {},
            config,
          };
        }

        // Mock events list
        if (config.url?.endsWith('/events')) {
          return {
            data: [
              {
                id: 'e1',
                title: 'Soirée de Gala (Mock)',
                description: 'Une superbe soirée de gala pour tous les étudiants.',
                startDate: new Date().toISOString(),
                price: 15,
                capacity: 200,
                location: 'Grand Hall'
              },
              {
                id: 'e2',
                title: 'Tournoi Sportif (Mock)',
                description: 'Venez affronter les autres écoles !',
                startDate: new Date(Date.now() + 86400000).toISOString(),
                price: 0,
                capacity: 50,
                location: 'Gymnase'
              }
            ],
            status: 200,
            statusText: 'OK',
            headers: {},
            config,
          };
        }
      }
      return Promise.reject(error);
    }
  );
}

export default api;
