import axios from 'axios';

const configured = import.meta.env.VITE_API_URL?.trim();

/** Base URL always ends with /api, whether the API is proxied or remote. */
export const API_ROOT = configured ? `${configured.replace(/\/+$/, '')}/api` : '/api';

export const TOKEN_KEY = 'ams_token';

export const api = axios.create({
  baseURL: API_ROOT,
  timeout: 45000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event('ams:unauthorized'));
    }
    return Promise.reject(error);
  },
);

export function errorMessage(error) {
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.code === 'ERR_NETWORK') {
    return 'Cannot reach the server. Please check your connection and try again.';
  }
  return error?.message || 'Something went wrong';
}
