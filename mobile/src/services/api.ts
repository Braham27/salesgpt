import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = await SecureStore.getItemAsync('refresh_token');
        if (refreshToken) {
          const response = await axios.post(`${API_URL}/api/auth/refresh`, {
            refresh_token: refreshToken,
          });
          
          const { access_token, refresh_token } = response.data;
          await SecureStore.setItemAsync('access_token', access_token);
          await SecureStore.setItemAsync('refresh_token', refresh_token);
          
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('refresh_token');
        await SecureStore.deleteItemAsync('user');
      }
    }
    
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
    
  register: (data: {
    email: string;
    password: string;
    full_name: string;
    company?: string;
    phone?: string;
  }) => api.post('/auth/register', data),
  
  getMe: () => api.get('/auth/me'),
  
  logout: () => api.post('/auth/logout'),
};

export const callsApi = {
  create: (data: { prospect_id?: string; context?: string }) =>
    api.post('/calls', data),
    
  list: (skip = 0, limit = 100) =>
    api.get('/calls', { params: { skip, limit } }),
    
  get: (id: string) => api.get(`/calls/${id}`),
  
  update: (id: string, data: { status?: string; notes?: string }) =>
    api.put(`/calls/${id}`, data),
    
  getSuggestions: (id: string) => api.get(`/calls/${id}/suggestions`),
  
  delete: (id: string) => api.delete(`/calls/${id}`),
};

export const productsApi = {
  create: (data: {
    name: string;
    description: string;
    category: string;
    features: string[];
    benefits: string[];
    price_range?: string;
    common_objections: string[];
    objection_responses: Record<string, string>;
    competitors?: string[];
  }) => api.post('/products', data),
  
  list: (skip = 0, limit = 100) =>
    api.get('/products', { params: { skip, limit } }),
    
  get: (id: string) => api.get(`/products/${id}`),
  
  update: (id: string, data: Partial<{
    name: string;
    description: string;
    category: string;
    features: string[];
    benefits: string[];
    price_range?: string;
    common_objections: string[];
    objection_responses: Record<string, string>;
    competitors?: string[];
  }>) => api.put(`/products/${id}`, data),
  
  search: (query: string, limit = 5) =>
    api.get('/products/search', { params: { query, limit } }),
    
  delete: (id: string) => api.delete(`/products/${id}`),
};

export const prospectsApi = {
  create: (data: {
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    title?: string;
    industry?: string;
    notes?: string;
    status?: string;
  }) => api.post('/prospects', data),
  
  list: (skip = 0, limit = 100) =>
    api.get('/prospects', { params: { skip, limit } }),
    
  get: (id: string) => api.get(`/prospects/${id}`),
  
  update: (id: string, data: Partial<{
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    title?: string;
    industry?: string;
    notes?: string;
    status?: string;
  }>) => api.put(`/prospects/${id}`, data),
  
  delete: (id: string) => api.delete(`/prospects/${id}`),
};

export const usersApi = {
  getProfile: () => api.get('/users/me'),
  
  updateProfile: (data: {
    full_name?: string;
    phone?: string;
    company?: string;
  }) => api.put('/users/me', data),
  
  changePassword: (data: { current_password: string; new_password: string }) =>
    api.post('/users/me/password', data),
};

export default api;
