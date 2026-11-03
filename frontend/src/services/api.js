import axios from 'axios';

const rawUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
const apiBase = rawUrl
  ? (rawUrl.endsWith('/api') ? rawUrl : `${rawUrl}/api`)
  : '/api';

const api = axios.create({
  baseURL: apiBase,
  withCredentials: true,
});

// Request interceptor to attach session JWT token from sessionStorage
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('detective_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  changePassword: (data) => api.post('/auth/change-password', data),
  getMe: () => api.get('/auth/me'),
  getScoreHistory: () => api.get('/auth/score-history'),
  dismissWelcome: () => api.post('/auth/dismiss-welcome'),
};

export const mysteryAPI = {
  generateCase: (mysteryName, scenarioPrompt, difficulty) =>
    api.post('/mysteries/generate', { mysteryName, scenarioPrompt, difficulty }),
  getCase: (id) => api.get(`/mysteries/${id}`),
  accuse: (id, suspectId, playerNotes) =>
    api.post(`/mysteries/${id}/accuse`, { suspectId, playerNotes }),
  getHistory: () => api.get('/mysteries/history/my'),
};

export const botAPI = {
  sendMessage: (message, chatHistory) =>
    api.post('/bot/chat', { message, chatHistory }),
};

export default api;
