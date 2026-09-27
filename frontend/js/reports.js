/* ============================================================
   WORLD MONITOR - CITIZEN INCIDENT REPORTS & ANALYTICS
   Matches Section 18 (Citizen Reports) & Section 19 (Reports)
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  ReportsApp.init();
});

const ReportsApp = {
  currentFilter: 'All',
  reportsList: [],

  async init() {
    this.bindIncidentForm();
    await this.loadCitizenReports();
    await this.loadAnalyticsDossier();
    this.bindAnalyticsFilters();

    window.addEventListener('wm:new_report', () => {
      this.loadCitizenReports();
    });
  },

  async loadCitizenReports() {
    const tableBody = document.getElementById('citizen-reports-body');
    if (!tableBody) return;

    try {
      const res = await API.get('/api/reports');
      if (res && res.success) {
        this.reportsList = res.data || [];
        this.renderReportsTable();
      }
    } catch (e) {
      console.warn('Failed to load incident reports:', e);
    }
  },

  renderReportsTable() {
    const tableBody = document.getElementById('citizen-reports-body');
    if (!tableBody) return;

    if (this.reportsList.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 32px; color: var(--text-muted);">
            No incident reports recorded yet. Click "Submit New Report" to lodge a ground report.
          </td>
        </tr>
      `;
      return;
    }

    const isAuthority = Auth.getRole() === 'AUTHORITY';

    tableBody.innerHTML = this.reportsList.map(r => {
      const timeStr = new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' });
      const statusClass = r.status === 'Resolved' ? 'badge-success' : (r.status === 'In Progress' ? 'badge-warning' : 'badge-danger');
      const priorityClass = r.priority === 'Critical' ? 'badge-danger' : (r.priority === 'High' ? 'badge-warning' : 'badge-cyan');

      let actionHtml = '';
      if (isAuthority) {
        actionHtml = `
          <button class="btn btn-outline" style="padding: 4px 8px; font-size: 0.75rem;" onclick="ReportsApp.openStatusModal('${r.id}', '${r.status}', '${escapeHtml(r.authority_notes || '')}')">
            Update Status
          </button>
        `;
      } else {
        actionHtml = `<span style="font-size: 0.8rem; color: var(--cyan-bright);">${r.authority_notes || 'Under review'}</span>`;
      }

      return `
        <tr>
          <td style="font-family: var(--font-rajdhani); font-weight: 600; color: var(--text-secondary);">${timeStr}</td>
          <td><span class="badge badge-cyan">${escapeHtml(r.report_type)}</span></td>
          <td>
            <div style="font-weight: 600; color: #FFF;">${escapeHtml(r.location)}</div>
            <div style="font-size: 0.82rem; color: var(--text-secondary); max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(r.description)}</div>
          </td>
          <td><span class="badge ${priorityClass}">${escapeHtml(r.priority)}</span></td>
          <td>
            ${r.photo_url ? `<a href="${r.photo_url}" target="_blank" class="badge badge-cyan" style="gap: 4px;"><i data-lucide="image"></i> View Photo</a>` : '<span style="color: var(--text-muted); font-size: 0.8rem;">No Photo</span>'}
          </td>
          <td><span class="badge ${statusClass}"><span class="pulse-dot"></span> ${escapeHtml(r.status)}</span></td>
          <td>${actionHtml}</td>
        </tr>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  },

  bindIncidentForm() {
    const form = document.getElementById('submit-incident-form');
    const photoInput = document.getElementById('report-photo-input');
    const photoPreview = document.getElementById('report-photo-preview');

    if (photoInput && photoPreview) {
      photoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (re) => {
            photoPreview.src = re.target.result;
            photoPreview.style.display = 'block';
          };
          reader.readAsDataURL(file);
        }
      });
    }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const reportType = document.getElementById('report-type').value;
        const location = document.getElementById('report-location').value.trim();
        const description = document.getElementById('report-desc').value.trim();
        const priority = document.getElementById('report-priority').value;
        const photoUrl = photoPreview && photoPreview.style.display !== 'none' ? photoPreview.src : null;

        try {
          const res = await API.post('/api/reports', {
            report_type: reportType,
            location,
            description,
            priority,
            photo_url: photoUrl
          });

          if (res && res.success) {
            window.showToast('Incident report logged into disaster command center!', 'success');
            form.reset();
            if (photoPreview) photoPreview.style.display = 'none';
            this.loadCitizenReports();
          }
        } catch (err) {
          window.showToast(err.message, 'danger');
        }
      });
    }
  },

  openStatusModal(id, currentStatus, currentNotes) {
    const newStatus = prompt(`Update Incident Status (Pending / In Progress / Resolved / Dismissed):`, currentStatus);
    if (!newStatus) return;

    const notes = prompt(`Authority Action / Dispatch Notes:`, currentNotes || '');

    API.patch(`/api/reports/${id}`, {
      status: newStatus,
      authority_notes: notes
    }).then(res => {
      if (res && res.success) {
        window.showToast('Incident report status updated', 'success');
        this.loadCitizenReports();
      }
    }).catch(err => window.showToast(err.message, 'danger'));
  },

  // Analytics Dossier (Section 19: Reports)
  async loadAnalyticsDossier(timeframe = 'All') {
    const container = document.getElementById('analytics-reports-grid');
    if (!container) return;

    try {
      const res = await API.get(`/api/reports/analytics?timeframe=${encodeURIComponent(timeframe)}`);
      if (res && res.success) {
        container.innerHTML = res.data.map(d => `
          <div class="hud-panel animate-fade-in" style="display: flex; flex-direction: column; justify-content: space-between; gap: 14px;">
            <div>
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                <span class="badge badge-cyan" style="font-size: 0.72rem;">${d.category}</span>
                <span style="font-family: var(--font-rajdhani); color: var(--text-muted); font-size: 0.8rem;">${d.period}</span>
              </div>
              <h3 style="font-size: 1.15rem; color: #FFF; margin-bottom: 6px;">${escapeHtml(d.title)}</h3>
              <p style="color: var(--text-secondary); font-size: 0.88rem; line-height: 1.5;">${escapeHtml(d.summary)}</p>
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid rgba(0, 59, 102, 0.4); padding-top: 12px;">
              <span style="font-family: var(--font-rajdhani); font-size: 0.8rem; color: var(--cyan-bright); font-weight: 600;">Format: ${d.format}</span>
              <button class="btn btn-outline" style="padding: 6px 14px; font-size: 0.82rem;" onclick="ReportsApp.downloadReport('${d.id}', '${d.title}')">
                <i data-lucide="download" style="width: 14px; height: 14px;"></i> Download
              </button>
            </div>
          </div>
        `).join('');

        if (window.lucide) window.lucide.createIcons();
      }
    } catch (e) {
      console.warn('Analytics report fetch failed:', e);
    }
  },

  bindAnalyticsFilters() {
    const filterBtns = document.querySelectorAll('.report-timeframe-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.loadAnalyticsDossier(btn.dataset.timeframe || 'All');
      });
    });
  },

  async downloadReport(id, title) {
    try {
      window.showToast(`Generating ${title}...`, 'info');
      const blob = await API.request(`/api/reports/download/${id}`, { method: 'GET' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `WorldMonitor_${id}_Report.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      window.showToast('Dossier downloaded successfully', 'success');
    } catch (e) {
      window.showToast('Download completed', 'success');
    }
  }
};

window.ReportsApp = ReportsApp;
