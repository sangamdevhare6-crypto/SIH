/* ============================================================
   WORLD MONITOR - GLOBAL APP SHELL CONTROLLER
   Sidebar, Navigation, Topbar, Clock, Toasts, and Modals
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

const App = {
  selectedCity: localStorage.getItem('wm_selected_city') || 'Chhatrapati Sambhajinagar',

  init() {
    this.setupSidebar();
    this.setupTopbar();
    this.setupActiveNavigation();
    this.setupClock();
    this.setupLogoutModal();
    this.setupLocationSelector();

    // Initialize real-time notifications if authenticated or on app pages
    if (window.NotificationManager) {
      NotificationManager.init();
    }

    // Initialize Lucide Icons
    if (window.lucide) {
      window.lucide.createIcons();
    }
  },

  setupSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebar-toggle-btn');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const backdrop = document.getElementById('mobile-drawer-backdrop');

    // Restore desktop collapsed state
    const isCollapsed = localStorage.getItem('wm_sidebar_collapsed') === 'true';
    if (isCollapsed && sidebar) {
      sidebar.classList.add('collapsed');
    }

    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        localStorage.setItem('wm_sidebar_collapsed', sidebar.classList.contains('collapsed'));
      });
    }

    // Mobile Hamburger Drawer
    if (mobileMenuBtn && sidebar) {
      mobileMenuBtn.addEventListener('click', () => {
        sidebar.classList.add('mobile-open');
        if (backdrop) backdrop.classList.add('active');
      });
    }

    if (backdrop && sidebar) {
      backdrop.addEventListener('click', () => {
        sidebar.classList.remove('mobile-open');
        backdrop.classList.remove('active');
      });
    }
  },

  setupTopbar() {
    const user = Auth.getUser();
    const userNameEl = document.getElementById('topbar-user-name');
    const userRoleEl = document.getElementById('topbar-user-role');
    const avatarEl = document.getElementById('topbar-avatar-img');

    if (user) {
      if (userNameEl) userNameEl.textContent = user.full_name;
      if (userRoleEl) userRoleEl.textContent = user.role;
      if (avatarEl && user.avatar_url) avatarEl.src = user.avatar_url;
    } else {
      if (userNameEl) userNameEl.textContent = 'Command Guest';
      if (userRoleEl) userRoleEl.textContent = 'MONITOR';
    }
  },

  setupActiveNavigation() {
    const currentPath = window.location.pathname;
    const pageName = currentPath.substring(currentPath.lastIndexOf('/') + 1) || 'index.html';

    // Highlight sidebar links
    const navLinks = document.querySelectorAll('.sidebar-nav .nav-link, .sidebar-footer .nav-link');
    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href && href.includes(pageName)) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Highlight mobile bottom items
    const bottomLinks = document.querySelectorAll('.mobile-bottom-item');
    bottomLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href && href.includes(pageName)) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  },

  setupClock() {
    const clockEl = document.getElementById('system-clock');
    if (!clockEl) return;

    function update() {
      const now = new Date();
      clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) + ' IST';
    }
    update();
    setInterval(update, 1000);
  },

  setupLocationSelector() {
    const citySelect = document.getElementById('global-city-select');
    if (!citySelect) return;

    citySelect.value = this.selectedCity;
    citySelect.addEventListener('change', (e) => {
      this.selectedCity = e.target.value;
      localStorage.setItem('wm_selected_city', this.selectedCity);
      window.showToast(`Monitoring Region Switched: ${this.selectedCity}`, 'info');
      // Dispatch event to page controllers
      window.dispatchEvent(new CustomEvent('wm:city_changed', { detail: { city: this.selectedCity } }));
    });
  },

  setupLogoutModal() {
    const logoutBtn = document.getElementById('logout-trigger-btn');
    const modal = document.getElementById('logout-modal');
    const cancelBtn = document.getElementById('logout-cancel-btn');
    const confirmBtn = document.getElementById('logout-confirm-btn');

    if (logoutBtn && modal) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        modal.classList.add('active');
      });
    }

    if (cancelBtn && modal) {
      cancelBtn.addEventListener('click', () => {
        modal.classList.remove('active');
      });
    }

    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        Auth.logout();
      });
    }
  }
};

// Global Toast Notification Utility
window.showToast = function(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconName = type === 'danger' ? 'alert-triangle' : (type === 'success' ? 'check-circle' : 'info');
  toast.innerHTML = `
    <i data-lucide="${iconName}" style="width: 20px; height: 20px; flex-shrink: 0; color: ${type === 'danger' ? 'var(--danger-crimson)' : (type === 'success' ? 'var(--green-neon)' : 'var(--cyan-bright)')}"></i>
    <div style="flex: 1; font-weight: 500;">${message}</div>
  `;

  container.appendChild(toast);
  if (window.lucide) window.lucide.createIcons();

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(50px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4500);
};

window.App = App;
