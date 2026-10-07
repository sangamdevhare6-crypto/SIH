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
    this.setupMovingBoxes();
    this.setupSidebar();
    this.setupTopbar();
    this.setupActiveNavigation();
    this.setupClock();
    this.setupLogoutModal();
    this.setupLocationSelector();
    this.setupMapLocationButtons();

    // Initialize real-time notifications if authenticated or on app pages
    if (window.NotificationManager) {
      NotificationManager.init();
    }

    // Initialize Lucide Icons
    if (window.lucide) {
      window.lucide.createIcons();
    }
  },

  setupMovingBoxes() {
    if (document.querySelector('.moving-box-canvas')) return;
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
    const searchInput = document.getElementById('city-search-input');
    const searchBtn = document.getElementById('city-search-btn');

    // ==============================
    // DROPDOWN CITY
    // ==============================
    if (citySelect) {
        // If selectedCity is not in options, prepend it
        const hasOption = Array.from(citySelect.options).some(
            option => option.value.toLowerCase() === this.selectedCity.toLowerCase()
        );
        if (!hasOption && this.selectedCity) {
            citySelect.prepend(new Option(this.selectedCity, this.selectedCity));
        }

        const match = Array.from(citySelect.options).find(
            option => option.value.toLowerCase() === this.selectedCity.toLowerCase()
        );
        if (match) {
            citySelect.value = match.value;
        }

        citySelect.addEventListener('change', (e) => {
            const city = e.target.value.trim();

            if (!city) return;

            this.changeCity(city);

            // Search box bhi update karo
            if (searchInput) {
                searchInput.value = '';
            }
        });
    }

    // ==============================
    // SEARCH BUTTON
    // ==============================
    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', () => {
            this.searchCity();
        });

        // ENTER PRESS
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.searchCity();
            }
        });
    }
},

 setupMapLocationButtons() {
  document.querySelectorAll('[data-use-current-location]').forEach((button) => {
    button.addEventListener('click', () => {
      if (!window.isSecureContext) {
        window.showToast(
          'Open this site over HTTPS to use your location.',
          'danger'
        );
        return;
      }

      if (!navigator.geolocation) {
        window.showToast(
          'Location is not supported by this browser.',
          'danger'
        );
        return;
      }

      window.showToast(
        'Allow location access in your browser to show your current position.',
        'info'
      );
      button.disabled = true;

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          };

          window.dispatchEvent(
            new CustomEvent('wm:user_location', { detail: location })
          );
          button.disabled = false;
          window.showToast('Your location found. Centering the map.', 'success');
        },
        (error) => {
          button.disabled = false;

          if (error.code === error.PERMISSION_DENIED) {
            window.showToast(
              'Location is blocked. Turn on location permission for this site in browser settings, then try again.',
              'danger'
            );
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            window.showToast(
              'Location is unavailable. Turn on your device location and try again.',
              'danger'
            );
          } else {
            window.showToast(
              'Location request timed out. Try again.',
              'danger'
            );
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 60000
        }
      );
    });
  });
},


async searchCity() {
    const searchInput =
        document.getElementById('city-search-input');

    const city = searchInput?.value.trim();

    if (!city) {
        window.showToast(
            'Please enter a city name',
            'danger'
        );
        return;
    }

    try {
        window.showToast(
            `Searching weather for ${city}...`,
            'info'
        );

        /*
         * IMPORTANT:
         * Backend will detect the actual city
         * using OpenWeather Geocoding API.
         */
        const response = await API.get(
            `/api/weather?city=${encodeURIComponent(city)}`
        );

        if (
            !response ||
            !response.success ||
            !response.data
        ) {
            throw new Error(
                'City not found'
            );
        }

        // Backend se actual detected city
        const detectedCity =
            response.data.city || city;

        // Save detected city
        this.selectedCity = detectedCity;

        localStorage.setItem(
            'wm_selected_city',
            detectedCity
        );

        // Dropdown me city available hai to select karo
        const citySelect =
            document.getElementById(
                'global-city-select'
            );

        if (citySelect) {
            const matchingOption =
                Array.from(citySelect.options)
                    .find(
                        option =>
                            option.value.toLowerCase() ===
                            detectedCity.toLowerCase()
                    );

            if (matchingOption) {
                citySelect.value =
                    matchingOption.value;
            } else {
                citySelect.prepend(new Option(detectedCity, detectedCity));
                citySelect.value = detectedCity;
            }
        }

        // Clear search
        searchInput.value = '';

        // Weather page ko city change batao
        window.dispatchEvent(
            new CustomEvent(
                'wm:city_changed',
                {
                    detail: {
                        city: detectedCity
                    }
                }
            )
        );

        window.showToast(
            `Weather loaded: ${detectedCity}`,
            'success'
        );

    } catch (error) {

        console.error(
            'City search failed:',
            error
        );

        window.showToast(
            `City "${city}" not found`,
            'danger'
        );
    }
},


changeCity(city) {

    this.selectedCity = city;

    localStorage.setItem(
        'wm_selected_city',
        city
    );

    const citySelect = document.getElementById('global-city-select');
    if (citySelect) {
        const matchingOption = Array.from(citySelect.options).find(
            option => option.value.toLowerCase() === city.toLowerCase()
        );
        if (matchingOption) {
            citySelect.value = matchingOption.value;
        } else {
            citySelect.prepend(new Option(city, city));
            citySelect.value = city;
        }
    }

    window.showToast(
        `Monitoring Region Switched: ${city}`,
        'info'
    );

    window.dispatchEvent(
        new CustomEvent(
            'wm:city_changed',
            {
                detail: {
                    city: city
                }
            }
        )
    );
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
