/* ============================================================
   WORLD MONITOR — PREMIUM ADMIN DASHBOARD LOGIC
   ============================================================ */
(function () {
  'use strict';

  const $ = id => document.getElementById(id);

  // ---- UTILITY ----
  function escapeHtml(v) {
    return String(v ?? '').replace(/[&<>'"]/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[c]));
  }

  function formatDate(v) {
    if (!v) return '—';
    const d = new Date(v);
    if (isNaN(d)) return '—';
    return d.toLocaleString('hi-IN', { dateStyle: 'medium', timeStyle: 'short' });
  }

  function timeAgo(v) {
    if (!v) return '—';
    const diff = (Date.now() - new Date(v)) / 1000;
    if (diff < 60) return 'Abhi abhi';
    if (diff < 3600) return Math.floor(diff / 60) + ' min pehle';
    if (diff < 86400) return Math.floor(diff / 3600) + ' ghante pehle';
    return Math.floor(diff / 86400) + ' din pehle';
  }

  // ---- ANIMATED COUNTER ----
  function animateCounter(el, target) {
    const start = 0;
    const duration = 800;
    const startTime = performance.now();
    function update(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(start + (target - start) * ease);
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }

  // ---- DONUT CHART ----
  const CIRCUMFERENCE = 2 * Math.PI * 70; // r=70 => ~440

  function updateDonut(citizens, authorities) {
    const total = citizens + authorities || 1;
    const citizenRatio = citizens / total;
    const authorityRatio = authorities / total;

    const citizenArc = CIRCUMFERENCE * citizenRatio;
    const authorityArc = CIRCUMFERENCE * authorityRatio;
    const citizenOffset = 0;
    const authorityOffset = citizenArc;

    const cEl = $('donutCitizen');
    const aEl = $('donutAuthority');

    cEl.style.strokeDasharray = `${citizenArc} ${CIRCUMFERENCE - citizenArc}`;
    cEl.style.strokeDashoffset = '0';

    aEl.style.strokeDasharray = `${authorityArc} ${CIRCUMFERENCE - authorityArc}`;
    // offset so authority arc starts after citizen arc
    aEl.style.strokeDashoffset = -citizenOffset - citizenArc;

    $('donutTotal').textContent = citizens + authorities;
    $('legendCitizen').textContent = citizens;
    $('legendAuthority').textContent = authorities;
  }

  // ---- BAR CHART ----
  function renderBarChart(stats) {
    const total = stats.total_users || 0;
    const loggedIn = stats.logged_in_users || 0;
    const neverLogged = Math.max(0, total - loggedIn);

    const bars = [
      { label: 'Total Registered', value: total, color: 'linear-gradient(180deg,#00f5ff,#0070c8)', },
      { label: 'Login Kiya', value: loggedIn, color: 'linear-gradient(180deg,#32dc82,#00a855)', },
      { label: 'Login Nahi Kiya', value: neverLogged, color: 'linear-gradient(180deg,#ffaa55,#c06000)', },
      { label: 'Total Logins', value: stats.total_logins || 0, color: 'linear-gradient(180deg,#b58cff,#6020c0)', },
    ];

    const maxVal = Math.max(...bars.map(b => b.value), 1);
    const CHART_HEIGHT = 140; // px

    const container = $('barChart');
    container.innerHTML = bars.map(b => {
      const height = Math.max(4, (b.value / maxVal) * CHART_HEIGHT);
      return `
        <div class="bar-item">
          <div class="bar-fill" data-value="${b.value}"
               style="height:${height}px; background:${b.color}; box-shadow:0 0 12px rgba(0,245,255,0.2);">
          </div>
          <div class="bar-label">${b.label}</div>
        </div>
      `;
    }).join('');
  }

  // ---- ACCESS GUARD ----
  function showAccessDenied(msg, showLink = false) {
    $('accessDeniedScreen').classList.remove('hidden');
    $('adminShell').style.display = 'none';
    $('accessMsg').textContent = msg;
  }

  // ---- RENDER USERS TABLE ----
  let allUsers = [];

  function renderUsers(users) {
    const query = ($('searchInput').value || '').toLowerCase();
    const roleVal = $('roleFilter').value;

    const filtered = users.filter(u => {
      const matchSearch = !query ||
        (u.full_name || '').toLowerCase().includes(query) ||
        (u.email || '').toLowerCase().includes(query);
      const matchRole = !roleVal || u.role === roleVal;
      return matchSearch && matchRole;
    });

    $('showingCount').textContent = `${filtered.length} / ${users.length} users dikha rahe hain`;

    if (!filtered.length) {
      $('usersBody').innerHTML = `
        <tr><td colspan="9" class="empty">Koi user nahi mila. Search ya filter badlen.</td></tr>
      `;
      return;
    }

    $('usersBody').innerHTML = filtered.map((user, idx) => `
      <tr>
        <td style="color:#3a5060;font-weight:700">${idx + 1}</td>
        <td>
          <div class="user-cell">
            <span class="user-name">${escapeHtml(user.full_name)}</span>
            <span class="user-id">${escapeHtml(user.id ? user.id.slice(0,8) + '…' : '—')}</span>
          </div>
        </td>
        <td>${escapeHtml(user.email)}</td>
        <td>${escapeHtml(user.phone || '—')}</td>
        <td>
          <span class="role ${String(user.role).toLowerCase()}">
            ${escapeHtml(user.role)}
          </span>
        </td>
        <td style="font-weight:700;color:${Number(user.login_count) > 0 ? '#00f5ff' : '#3a5060'}">
          ${Number(user.login_count) || 0}
        </td>
        <td style="font-size:12px">
          ${user.last_login_at ? `<span title="${formatDate(user.last_login_at)}">${timeAgo(user.last_login_at)}</span>` : '<span style="color:#3a5060">Kabhi nahi</span>'}
        </td>
        <td>
          <span class="account-status ${user.is_active === false ? 'inactive' : 'active'}">
            ${user.is_active === false ? 'Inactive' : 'Active'}
          </span>
        </td>
        <td style="font-size:12px;color:#5a7a8c">${formatDate(user.created_at)}</td>
      </tr>
    `).join('');
  }

  // ---- RENDER LOGIN LEADERBOARD ----
  function renderLoginLeaderboard(users) {
    const sorted = [...users]
      .filter(u => Number(u.login_count) > 0)
      .sort((a, b) => Number(b.login_count) - Number(a.login_count))
      .slice(0, 10);

    if (!sorted.length) {
      $('loginTimeline').innerHTML = '<p class="empty">Abhi tak kisi ne login nahi kiya.</p>';
      return;
    }

    const rankClass = i => i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
    const rankEmoji = i => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;

    $('loginTimeline').innerHTML = sorted.map((u, i) => `
      <div class="timeline-card">
        <div class="timeline-rank ${rankClass(i)}">${rankEmoji(i)}</div>
        <div class="timeline-info">
          <div class="timeline-name">${escapeHtml(u.full_name)}</div>
          <div class="timeline-email">${escapeHtml(u.email)} · <span class="role ${String(u.role).toLowerCase()}" style="font-size:10px;padding:2px 7px">${u.role}</span></div>
        </div>
        <div class="timeline-right">
          <div class="timeline-count">${u.login_count}</div>
          <div class="timeline-count-label">logins</div>
        </div>
      </div>
    `).join('');
  }

  // ---- MAIN LOAD ----
  async function loadAdmin() {
    // Auth check
    const token = API.getToken();
    let user = null;
    try { user = JSON.parse(localStorage.getItem('wm_user_data') || 'null'); } catch (_) {}

    if (!token || !user) {
      showAccessDenied('Pehle authority account se login karen. Yeh page sirf admin ke liye hai.');
      return;
    }
    if (String(user.role || '').toUpperCase() !== 'AUTHORITY') {
      showAccessDenied('Yeh page sirf AUTHORITY account ke liye hai. Citizen account se access nahi hoga.');
      return;
    }

    // Show admin info in sidebar
    if ($('sidebarAdminName')) $('sidebarAdminName').textContent = user.full_name || 'Admin';
    if ($('sidebarAdminEmail')) $('sidebarAdminEmail').textContent = user.email || '—';

    // Refresh button loading state
    const refreshBtn = $('refreshBtn');
    refreshBtn.classList.add('loading');
    $('statusText').textContent = 'Loading…';

    try {
      const data = await API.get('/api/admin/users');
      const stats = data.stats || {};
      const users = data.users || [];
      allUsers = users;

      // ---- Animated stat counters ----
      animateCounter($('totalUsers'), stats.total_users ?? 0);
      animateCounter($('activeUsers'), stats.active_users ?? 0);
      animateCounter($('citizens'), stats.citizens ?? 0);
      animateCounter($('authorities'), stats.authorities ?? 0);
      animateCounter($('loggedInUsers'), stats.logged_in_users ?? 0);
      animateCounter($('totalLogins'), stats.total_logins ?? 0);

      // ---- Charts ----
      setTimeout(() => {
        updateDonut(stats.citizens ?? 0, stats.authorities ?? 0);
        renderBarChart(stats);
      }, 200);

      // ---- Users table ----
      renderUsers(users);

      // ---- Login leaderboard ----
      renderLoginLeaderboard(users);

      // ---- Status ----
      $('statusText').textContent = `${users.length} users loaded`;
      const now = new Date();
      $('lastRefresh').textContent = 'Last refresh: ' + now.toLocaleTimeString('hi-IN', { timeStyle: 'short' });

    } catch (err) {
      console.error('Admin load error:', err);
      const is403 = /403|forbidden|access denied/i.test(err.message || '');
      $('statusText').textContent = 'Error';
      if (is403) {
        showAccessDenied('Yeh account configured admin email se match nahi karta. Admin account se login karen.');
      } else {
        $('usersBody').innerHTML = `<tr><td colspan="9" class="empty error">⚠️ ${escapeHtml(err.message || 'Load nahi hua')}</td></tr>`;
      }
    } finally {
      refreshBtn.classList.remove('loading');
    }
  }

  // ---- SEARCH & FILTER (real-time) ----
  function attachFilters() {
    const si = $('searchInput');
    const rf = $('roleFilter');
    if (si) si.addEventListener('input', () => renderUsers(allUsers));
    if (rf) rf.addEventListener('change', () => renderUsers(allUsers));
  }

  // ---- SIDEBAR TOGGLE (mobile) ----
  function attachSidebarToggle() {
    const btn = $('sidebarToggle');
    const sidebar = $('sidebar');
    if (btn && sidebar) {
      btn.addEventListener('click', () => sidebar.classList.toggle('open'));
      document.addEventListener('click', e => {
        if (!sidebar.contains(e.target) && !btn.contains(e.target)) {
          sidebar.classList.remove('open');
        }
      });
    }
  }

  // ---- NAV SCROLL LINKS ----
  function attachNavLinks() {
    document.querySelectorAll('.nav-link[data-section]').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const section = link.dataset.section;
        const el = document.getElementById('section-' + section);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        if ($('sidebar')) $('sidebar').classList.remove('open');
      });
    });
  }

  // ---- REFRESH BUTTON ----
  $('refreshBtn').addEventListener('click', loadAdmin);

  // ---- LOGOUT ----
  $('logoutBtn').addEventListener('click', async () => {
    try { await API.post('/api/auth/logout', {}); } catch (_) {}
    API.clearToken();
    localStorage.removeItem('wm_user_data');
    window.location.href = '/index.html';
  });

  // ---- INIT ----
  attachFilters();
  attachSidebarToggle();
  attachNavLinks();
  loadAdmin();

  // Auto-refresh every 30 seconds
  setInterval(() => {
    if (!document.hidden && API.getToken()) loadAdmin();
  }, 30000);

})();
