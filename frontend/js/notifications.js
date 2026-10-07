/* ============================================================
   WORLD MONITOR - REAL-TIME NOTIFICATION SYSTEM & SSE STREAM
   ============================================================ */

const NotificationManager = {
  notifications: [],
  unreadCount: 0,
  eventSource: null,
  _pollTimer: null,

  init() {
    this.registerServiceWorker();
    this.requestNotificationPermission();
    this.fetchNotifications();
    this.setupSSE();
    this.bindDOM();
    this.startPolling();   // fallback poll every 3 mins
  },

  // ── Register Service Worker ──
  registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(reg => {
        console.log('📡 [SW] Service Worker registered:', reg.scope);
      })
      .catch(err => {
        console.warn('📡 [SW] Registration failed:', err.message);
      });
  },

  // ── Play emergency audio chime on mobile / desktop ──
  playAlertSound(riskLevel = 'High') {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = riskLevel === 'Very High' ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(riskLevel === 'Very High' ? 880 : 587, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.36);
    } catch (_) {}
  },

  // ── Ask browser notification permission ──
  async requestNotificationPermission() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          console.log('🔔 [NOTIF] Mobile & Desktop notifications enabled');
        }
      } catch (err) {
        console.warn('Notification permission error:', err);
      }
    }
  },

  // ── Show OS-level notification (Mobile Android + Desktop) ──
  async showBrowserNotification(title, body, url = '/alerts.html', riskLevel = 'High') {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    // 1. Play alert sound chime
    this.playAlertSound(riskLevel);

    // 2. Mobile hardware vibration
    if (navigator.vibrate) {
      try {
        navigator.vibrate(riskLevel === 'Very High' ? [350, 120, 350, 120, 500] : [250, 100, 250]);
      } catch (_) {}
    }

    const options = {
      body: body || 'New emergency notification',
      icon: '/assets/avatars/officer.png',
      badge: '/assets/avatars/officer.png',
      tag: 'wm-' + Date.now(),
      renotify: true,
      requireInteraction: riskLevel === 'Very High',
      vibrate: riskLevel === 'Very High' ? [350, 120, 350, 120, 500] : [250, 100, 250],
      data: { url, risk_level: riskLevel }
    };

    // 3. Android Mobile standard: ServiceWorker showNotification
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (reg && reg.showNotification) {
          await reg.showNotification(title, options);
          return;
        }
      } catch (err) {
        console.warn('ServiceWorker showNotification fallback:', err);
      }
    }

    // 4. Desktop window Notification fallback
    try {
      const notif = new Notification(title, options);
      notif.addEventListener('click', () => {
        window.focus();
        window.location.href = url;
        notif.close();
      });
    } catch (err) {
      console.warn('Desktop Notification error:', err);
    }
  },

  // ── Polling fallback (every 3 minutes) ──
  startPolling() {
    this._pollTimer = setInterval(() => {
      this.fetchNotifications();
    }, 3 * 60 * 1000);
  },

  async fetchNotifications() {
    try {
      const res = await API.get('/api/notifications');
      if (res && res.success) {
        this.notifications = res.data || [];
        this.unreadCount = res.unreadCount || 0;
        this.renderBadge();
        this.renderList();
      }
    } catch (e) {
      console.warn('Could not fetch notifications:', e.message);
    }
  },

  setupSSE() {
    if (this.eventSource) return;

    try {
      this.eventSource = new EventSource('/api/realtime/stream');

      this.eventSource.addEventListener('connected', (e) => {
        console.log('📡 [REALTIME] Connected to World Monitor Telemetry stream');
      });

      this.eventSource.addEventListener('new_alert', (e) => {
        try {
          const payload = JSON.parse(e.data);
          const alert = payload.data || payload;
          window.showToast(`🚨 ALERT: ${alert.title}`, 'danger');
          this.fetchNotifications();
          // Browser OS notification
          this.showBrowserNotification(
            `🚨 ${alert.risk_level || 'Emergency'} Alert`,
            alert.title,
            alert.link || '/alerts.html',
            alert.risk_level
          );
          window.dispatchEvent(new CustomEvent('wm:new_alert', { detail: alert }));
        } catch (err) {}
      });

      this.eventSource.addEventListener('new_notification', (e) => {
        try {
          const payload = JSON.parse(e.data);
          const notif = payload.data || payload;
          window.showToast(notif.title, 'info');
          this.fetchNotifications();
          // Browser OS notification for high/very-high
          if (notif.risk_level === 'Very High' || notif.risk_level === 'High') {
            this.showBrowserNotification(
              `🔔 ${notif.title}`,
              notif.message || '',
              notif.link || '/alerts.html',
              notif.risk_level
            );
          }
        } catch (err) {}
      });

      this.eventSource.addEventListener('citizen_report_submitted', (e) => {
        try {
          const payload = JSON.parse(e.data);
          const rep = payload.data || payload;
          if (Auth.getRole() === 'AUTHORITY') {
            window.showToast(`NEW REPORT: ${rep.report_type} at ${rep.location}`, 'warning');
          }
          this.fetchNotifications();
          window.dispatchEvent(new CustomEvent('wm:new_report', { detail: rep }));
        } catch (err) {}
      });

      this.eventSource.addEventListener('telemetry_pulse', (e) => {
        try {
          const payload = JSON.parse(e.data);
          window.dispatchEvent(new CustomEvent('wm:telemetry_pulse', { detail: payload.data || payload }));
        } catch (err) {}
      });

      this.eventSource.onerror = () => {
        // SSE auto-reconnects natively
      };
    } catch (err) {
      console.warn('Real-time SSE not supported or blocked:', err.message);
    }
  },

  bindDOM() {
    const bellBtn = document.getElementById('notif-bell-btn');
    const panel = document.getElementById('notif-panel');
    const markAllBtn = document.getElementById('mark-all-read-btn');

    if (bellBtn && panel) {
      bellBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        panel.classList.toggle('active');
      });

      document.addEventListener('click', (e) => {
        if (!panel.contains(e.target) && !bellBtn.contains(e.target)) {
          panel.classList.remove('active');
        }
      });
    }

    if (markAllBtn) {
      markAllBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
          await API.post('/api/notifications/read-all', {});
          this.notifications.forEach(n => n.is_read = true);
          this.unreadCount = 0;
          this.renderBadge();
          this.renderList();
          window.showToast('All notifications marked as read', 'success');
        } catch (err) {
          console.error(err);
        }
      });
    }
  },

  renderBadge() {
    const badge = document.getElementById('notif-badge');
    if (!badge) return;

    if (this.unreadCount > 0) {
      badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  },

  renderList() {
    const list = document.getElementById('notif-list');
    if (!list) return;

    if (this.notifications.length === 0) {
      list.innerHTML = `
        <div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 0.9rem;">
          <i data-lucide="bell-off" style="width: 28px; height: 28px; margin: 0 auto 8px; display: block; opacity: 0.5;"></i>
          No notifications yet. System is monitoring.
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    list.innerHTML = this.notifications.map(n => {
      const isUnread = !n.is_read ? 'unread' : '';
      const timeStr = new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const badgeClass = n.risk_level === 'Very High' ? 'badge-danger' : (n.risk_level === 'High' ? 'badge-warning' : 'badge-cyan');
      
      return `
        <div class="notif-item ${isUnread}" data-id="${n.id}" onclick="NotificationManager.markRead('${n.id}', '${n.link || '#'}')">
          <div class="notif-item-body">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
              <span class="badge ${badgeClass}" style="font-size: 0.72rem; padding: 2px 6px;">${n.type || 'Notice'}</span>
              <span class="notif-time">${timeStr}</span>
            </div>
            <div class="notif-title">${escapeHtml(n.title)}</div>
            <div class="notif-msg">${escapeHtml(n.message)}</div>
            ${n.source ? `<div style="font-size: 0.68rem; color: #38bdf8; margin-top: 4px; font-weight: 600; display: flex; align-items: center; gap: 4px;">🛡️ Verified Source: ${escapeHtml(n.source)}</div>` : ''}
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  },

  async markRead(id, link) {
    try {
      await API.patch(`/api/notifications/${id}/read`, {});
      const item = this.notifications.find(n => n.id === id);
      if (item && !item.is_read) {
        item.is_read = true;
        this.unreadCount = Math.max(0, this.unreadCount - 1);
        this.renderBadge();
        this.renderList();
      }
      if (link && link !== '#' && link !== '') {
        window.location.href = link;
      }
    } catch (e) {
      console.error(e);
    }
  }
};

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

window.NotificationManager = NotificationManager;
