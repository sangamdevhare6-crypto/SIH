/* ============================================================
   WORLD MONITOR - CENTRALIZED API CLIENT
   ============================================================ */

const API_BASE = ''; // Same origin relative calls

const API = {
  getToken() {
    return localStorage.getItem('wm_auth_token') || '';
  },

  setToken(token) {
    localStorage.setItem('wm_auth_token', token);
  },

  clearToken() {
    localStorage.removeItem('wm_auth_token');
    localStorage.removeItem('wm_user_data');
  },

  async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
      });

      // Handle CSV or file downloads
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/csv')) {
        return response.blob();
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401 && !endpoint.includes('/auth/login')) {
          this.clearToken();
          if (!window.location.pathname.includes('login.html') && !window.location.pathname.includes('index.html')) {
            window.location.href = '/login.html?expired=1';
          }
        }
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err.message);
      throw err;
    }
  },

  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },

  post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  },

  patch(endpoint, body) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body)
    });
  },

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
};

window.API = API;
