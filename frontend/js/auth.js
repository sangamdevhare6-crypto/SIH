/* ============================================================
   WORLD MONITOR - AUTHENTICATION MODULE
   Role-based access, JWT session management, & login/signup
   ============================================================ */

const Auth = {
  getUser() {
    try {
      const u = localStorage.getItem('wm_user_data');
      return u ? JSON.parse(u) : null;
    } catch (e) {
      return null;
    }
  },

  setUser(user) {
    localStorage.setItem('wm_user_data', JSON.stringify(user));
  },

  getRole() {
    const user = this.getUser();
    return user ? (user.role || '').toUpperCase() : null;
  },

  isLoggedIn() {
    return !!API.getToken() && !!this.getUser();
  },

  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
      return false;
    }
    return true;
  },

  requireRole(requiredRole) {
    if (!this.requireAuth()) return false;
    const currentRole = this.getRole();
    if (currentRole !== requiredRole.toUpperCase()) {
      alert(`Access Restricted: This terminal is strictly reserved for ${requiredRole} personnel.`);
      window.location.href = '/dashboard.html';
      return false;
    }
    return true;
  },

  async login(identifier, password, roleHint = 'CITIZEN') {
    try {
      const res = await API.post('/api/auth/login', {
        identifier,
        password,
        role_hint: roleHint
      });

      if (res.success && res.token) {
        API.setToken(res.token);
        this.setUser(res.user);
        return { success: true, user: res.user };
      }
      return { success: false, error: res.error || 'Login failed' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async registerCitizen(formData) {
    try {
      const res = await API.post('/api/auth/register/citizen', formData);
      if (res.success && res.token) {
        API.setToken(res.token);
        this.setUser(res.user);
        return { success: true, user: res.user };
      }
      return { success: false, error: res.error || 'Registration failed' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async registerAuthority(formData) {
    try {
      const res = await API.post('/api/auth/register/authority', formData);
      if (res.success && res.token) {
        API.setToken(res.token);
        this.setUser(res.user);
        return { success: true, user: res.user };
      }
      return { success: false, error: res.error || 'Registration failed' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  logout() {
    API.post('/api/auth/logout', {}).catch(() => {});
    API.clearToken();
    window.location.href = '/login.html?logged_out=1';
  }
};

// Auto-inject ambient moving cyber boxes for auth pages
document.addEventListener('DOMContentLoaded', () => {
  if (!document.querySelector('.moving-box-canvas')) {
    const canvas = document.createElement('div');
    canvas.className = 'moving-box-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.innerHTML = `
      <div class="cyber-moving-box box-1"><div class="box-inner-glow"></div><div class="box-grid-lines"></div></div>
      <div class="cyber-moving-box box-2"><div class="box-inner-glow"></div><div class="box-grid-lines"></div></div>
      <div class="cyber-moving-box box-3"><div class="box-inner-glow"></div><div class="box-grid-lines"></div></div>
      <div class="cyber-moving-box box-4"><div class="box-inner-glow"></div><div class="box-grid-lines"></div></div>
      <div class="cyber-moving-box box-5"><div class="box-inner-glow"></div><div class="box-grid-lines"></div></div>
    `;
    document.body.prepend(canvas);
  }
});

window.Auth = Auth;
