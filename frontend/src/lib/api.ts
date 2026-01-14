import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post(`${API_URL}/api/auth/refresh`, {
            refresh_token: refreshToken,
          });

          const { access_token, refresh_token } = response.data;
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', refresh_token);

          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: async (email: string, password: string) => {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);
    const response = await api.post('/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return response.data;
  },

  register: async (data: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
    company?: string;
  }) => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },
};

// Calls API
export const callsApi = {
  create: async (data: {
    prospect_id?: string;
    call_type?: string;
    scheduled_at?: string;
    context?: string;
    objectives?: string[];
  }) => {
    const response = await api.post('/calls', data);
    return response.data;
  },

  list: async (params?: { status?: string; limit?: number; offset?: number }) => {
    const response = await api.get('/calls', { params });
    return response.data;
  },

  get: async (callId: string) => {
    const response = await api.get(`/calls/${callId}`);
    return response.data;
  },

  update: async (
    callId: string,
    data: {
      outcome?: string;
      outcome_notes?: string;
      next_steps?: string[];
      follow_up_date?: string;
    }
  ) => {
    const response = await api.patch(`/calls/${callId}`, data);
    return response.data;
  },

  getSuggestions: async (callId: string) => {
    const response = await api.get(`/calls/${callId}/suggestions`);
    return response.data;
  },

  delete: async (callId: string) => {
    const response = await api.delete(`/calls/${callId}`);
    return response.data;
  },
};

// Products API
export const productsApi = {
  create: async (data: {
    name: string;
    sku?: string;
    category?: string;
    description?: string;
    price?: number;
    key_features?: string[];
    benefits?: string[];
    target_audience?: string;
    objection_handlers?: Record<string, string>;
    faqs?: { question: string; answer: string }[];
  }) => {
    const response = await api.post('/products', data);
    return response.data;
  },

  list: async (params?: { category?: string; is_active?: boolean }) => {
    const response = await api.get('/products', { params });
    return response.data;
  },

  get: async (productId: string) => {
    const response = await api.get(`/products/${productId}`);
    return response.data;
  },

  update: async (productId: string, data: Partial<Parameters<typeof productsApi.create>[0]>) => {
    const response = await api.patch(`/products/${productId}`, data);
    return response.data;
  },

  search: async (query: string, category?: string) => {
    const response = await api.post('/products/search', { query, category });
    return response.data;
  },

  import: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/products/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  delete: async (productId: string) => {
    const response = await api.delete(`/products/${productId}`);
    return response.data;
  },
};

// Prospects API
export const prospectsApi = {
  create: async (data: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    company?: string;
    job_title?: string;
    notes?: string;
    pain_points?: string[];
    interests?: string[];
  }) => {
    const response = await api.post('/prospects', data);
    return response.data;
  },

  list: async (params?: { status?: string; search?: string; limit?: number }) => {
    const response = await api.get('/prospects', { params });
    return response.data;
  },

  get: async (prospectId: string) => {
    const response = await api.get(`/prospects/${prospectId}`);
    return response.data;
  },

  update: async (prospectId: string, data: Partial<Parameters<typeof prospectsApi.create>[0]>) => {
    const response = await api.patch(`/prospects/${prospectId}`, data);
    return response.data;
  },

  delete: async (prospectId: string) => {
    const response = await api.delete(`/prospects/${prospectId}`);
    return response.data;
  },
};

// Users API
export const usersApi = {
  getProfile: async () => {
    const response = await api.get('/users/profile');
    return response.data;
  },

  updateProfile: async (data: {
    full_name?: string;
    phone?: string;
    company?: string;
    preferred_language?: string;
    notification_settings?: Record<string, boolean>;
  }) => {
    const response = await api.patch('/users/profile', data);
    return response.data;
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const response = await api.post('/users/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
    return response.data;
  },
};

export default api;
