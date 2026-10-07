/* ============================================================
   WORLD MONITOR - ALERTS CONTROLLER
   Matches Section 15 Specification
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  AlertsApp.init();
});

const AlertsApp = {
  currentFilter: 'All',
  alertsList: [],

  async init() {
    this.checkAuthorityFeatures();
    await this.loadAlerts();
    this.bindFilters();
    this.bindCreateModal();

    window.addEventListener('wm:new_alert', () => {
      this.loadAlerts();
    });
  },

  checkAuthorityFeatures() {
    const isAuth = Auth.getRole() === 'AUTHORITY';
    const broadcastBtn = document.getElementById('btn-broadcast-alert');
    if (broadcastBtn) {
      broadcastBtn.style.display = isAuth ? 'inline-flex' : 'none';
    }
  },

  async loadAlerts() {
    try {
      const url = this.currentFilter === 'All' ? '/api/alerts' : `/api/alerts?risk_level=${encodeURIComponent(this.currentFilter)}`;
      const res = await API.get(url);
      if (res && res.success) {
        this.alertsList = res.data || [];
        this.renderTable();
      }
    } catch (e) {
      console.error('Error loading alerts:', e);
    }
  },

  renderTable() {
    const tbody = document.getElementById('alerts-table-body');
    if (!tbody) return;

    if (this.alertsList.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 30px; color: var(--text-muted);">
            No emergency alerts found for filter: ${this.currentFilter}
          </td>
        </tr>
      `;
      return;
    }

    const isAuthority = Auth.getRole() === 'AUTHORITY';

    tbody.innerHTML = this.alertsList.map(a => {
      const timeStr = new Date(a.created_at).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' });
      const badgeClass = a.risk_level === 'Very High' ? 'badge-danger' : (a.risk_level === 'High' ? 'badge-warning' : 'badge-cyan');
      const statusClass = a.status === 'Active' ? 'badge-danger' : (a.status === 'Monitoring' ? 'badge-warning' : 'badge-success');

      let actionHtml = '';
      if (isAuthority && a.status !== 'Resolved') {
        actionHtml = `
          <button class="btn btn-outline" style="padding: 4px 8px; font-size: 0.75rem;" onclick="AlertsApp.resolveAlert('${a.id}')">
            Resolve
          </button>
        `;
      } else {
        actionHtml = `<span style="font-size: 0.8rem; color: var(--text-muted);">Broadcasted</span>`;
      }

      return `
        <tr>
          <td style="font-family: var(--font-rajdhani); font-weight: 600; color: var(--text-secondary);">${timeStr}</td>
          <td>
            <div style="font-weight: 600; color: #FFF;">${escapeHtml(a.title)}</div>
            <div style="font-size: 0.82rem; color: var(--text-muted);">${escapeHtml(a.location)}</div>
            ${a.source ? `<div style="font-size: 0.72rem; color: #38bdf8; font-weight: 600; margin-top: 2px;">🛡️ ${escapeHtml(a.source)}</div>` : ''}
          </td>
          <td><span class="badge badge-cyan" style="font-size: 0.75rem;">${escapeHtml(a.type)}</span></td>
          <td><span class="badge ${badgeClass}">${escapeHtml(a.risk_level)}</span></td>
          <td><span class="badge ${statusClass}"><span class="pulse-dot ${a.status === 'Active' ? 'danger' : ''}"></span> ${escapeHtml(a.status)}</span></td>
          <td>${actionHtml}</td>
        </tr>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  },

  bindFilters() {
    const filterBtns = document.querySelectorAll('.alert-filter-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentFilter = btn.dataset.filter || 'All';
        this.loadAlerts();
      });
    });
  },

  bindCreateModal() {
    const btnOpen = document.getElementById('btn-broadcast-alert');
    const modal = document.getElementById('broadcast-alert-modal');
    const btnCancel = document.getElementById('broadcast-cancel-btn');
    const form = document.getElementById('broadcast-alert-form');

    if (btnOpen && modal) {
      btnOpen.addEventListener('click', () => {
        modal.classList.add('active');
      });
    }

    if (btnCancel && modal) {
      btnCancel.addEventListener('click', () => {
        modal.classList.remove('active');
      });
    }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
          title: document.getElementById('new-alert-title').value.trim(),
          type: document.getElementById('new-alert-type').value,
          risk_level: document.getElementById('new-alert-risk').value,
          location: document.getElementById('new-alert-location').value.trim(),
          affected_population: document.getElementById('new-alert-population').value.trim(),
          description: document.getElementById('new-alert-desc').value.trim()
        };

        try {
          const res = await API.post('/api/alerts', payload);
          if (res && res.success) {
            window.showToast('Emergency alert broadcasted across region!', 'success');
            modal.classList.remove('active');
            form.reset();
            this.loadAlerts();
          }
        } catch (err) {
          window.showToast(err.message, 'danger');
        }
      });
    }
  },

  async resolveAlert(id) {
    if (!confirm('Confirm resolving this emergency alert?')) return;
    try {
      const res = await API.patch(`/api/alerts/${id}`, { status: 'Resolved' });
      if (res && res.success) {
        window.showToast('Alert resolved', 'success');
        this.loadAlerts();
      }
    } catch (e) {
      window.showToast(e.message, 'danger');
    }
  }
};

window.AlertsApp = AlertsApp;
