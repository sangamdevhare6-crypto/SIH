/* ============================================================
   WORLD MONITOR - DASHBOARD CONTROLLER
   Matches Section 11 Specification
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  Dashboard.init();
});

const Dashboard = {
  map: null,
  radarLayer: null,

  async init() {
    this.updateUserGreeting();
    await this.loadData();
    this.initMiniMap();

    // Listen for city changes or live telemetry pulses
    window.addEventListener('wm:city_changed', (e) => {
      this.loadData(e.detail.city);
    });

    window.addEventListener('wm:new_alert', (e) => {
      this.loadData();
    });

    window.addEventListener('wm:telemetry_pulse', (e) => {
      const pulse = e.detail;
      // Animate minor fluctuation on live rainfall and wind
      const rainVal = document.getElementById('kpi-rainfall');
      if (rainVal && pulse.rainfallIncrement) {
        const cur = parseFloat(rainVal.textContent) || 120.0;
        rainVal.textContent = (cur + pulse.rainfallIncrement).toFixed(1) + ' mm';
      }
    });
  },

  updateUserGreeting() {
    const user = Auth.getUser();
    const greetingEl = document.getElementById('dashboard-greeting');
    const locationEl = document.getElementById('dashboard-location-title');

    if (user && greetingEl) {
      const roleTitle = user.role === 'AUTHORITY' ? 'Commander / Admin' : 'Citizen';
      greetingEl.textContent = `Welcome, ${user.full_name} (${roleTitle})`;
    } else if (greetingEl) {
      greetingEl.textContent = 'Welcome, Citizen';
    }

    if (locationEl) {
      locationEl.textContent = App.selectedCity || 'Chhatrapati Sambhajinagar';
    }
  },

  async loadData(city = App.selectedCity) {
    try {
      const res = await API.get(`/api/dashboard?city=${encodeURIComponent(city)}`);
      if (res && res.success) {
        this.renderKPIs(res.kpis);
        this.renderAlerts(res.recentAlerts);
        this.renderRiskAreas(res.highRiskAreas);
        this.renderReportsSummary(res.reports);
        this.renderWarningsCount(res.activeWarningsCount);

        if (this.map && res.weather) {
          // Re-center map if city coordinates changed
          this.recenterMiniMap(city);
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    }
  },

  renderKPIs(kpis) {
    if (!kpis) return;
    const rain = document.getElementById('kpi-rainfall');
    const temp = document.getElementById('kpi-temp');
    const humidity = document.getElementById('kpi-humidity');
    const wind = document.getElementById('kpi-wind');
    const pressure = document.getElementById('kpi-pressure');
    const condition = document.getElementById('kpi-condition');

    if (rain) rain.textContent = `${kpis.rainfall_mm} mm`;
    if (temp) temp.textContent = `${kpis.temperature}°C`;
    if (humidity) humidity.textContent = `${kpis.humidity}%`;
    if (wind) wind.textContent = `${kpis.wind_speed} km/h`;
    if (pressure) pressure.textContent = `${kpis.pressure} hPa`;
    if (condition) condition.textContent = kpis.condition || 'Severe Downpour';
  },

  renderAlerts(alerts = []) {
    const container = document.getElementById('dashboard-alerts-list');
    if (!container) return;

    if (alerts.length === 0) {
      container.innerHTML = `
        <div style="padding: 16px; text-align: center; color: var(--text-muted);">
          No active alerts in this sector.
        </div>
      `;
      return;
    }

    container.innerHTML = alerts.map(a => {
      const badgeClass = a.risk_level === 'Very High' ? 'badge-danger' : (a.risk_level === 'High' ? 'badge-warning' : 'badge-cyan');
      const timeStr = new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      return `
        <div class="risk-area-item" style="border-left: 3px solid ${a.risk_level === 'Very High' ? 'var(--danger-crimson)' : 'var(--warning-amber)'};">
          <div class="risk-area-info">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 2px;">
              <span class="risk-area-name">${escapeHtml(a.title)}</span>
              <span class="badge ${badgeClass}" style="font-size: 0.72rem; padding: 2px 6px;">${a.risk_level}</span>
            </div>
            <div class="risk-area-desc">${escapeHtml(a.location)} • <span style="color: var(--text-muted);">${timeStr}</span></div>
          </div>
          <a href="/alerts.html" class="btn btn-outline" style="padding: 4px 10px; font-size: 0.8rem;">Details</a>
        </div>
      `;
    }).join('');
  },

  renderRiskAreas(areas = []) {
    const container = document.getElementById('dashboard-risk-areas');
    if (!container) return;

    container.innerHTML = areas.map(ar => {
      const badgeClass = ar.risk === 'Very High' ? 'badge-danger' : (ar.risk === 'High' ? 'badge-warning' : 'badge-cyan');
      return `
        <div class="risk-area-item">
          <div class="risk-area-info">
            <span class="risk-area-name">${escapeHtml(ar.name)}</span>
            <span class="risk-area-desc">${escapeHtml(ar.alert)}</span>
          </div>
          <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
            <span class="badge ${badgeClass}" style="font-size: 0.75rem;">${ar.risk}</span>
            <span style="font-size: 0.75rem; color: var(--cyan-bright); font-family: var(--font-rajdhani);">${ar.evacStatus}</span>
          </div>
        </div>
      `;
    }).join('');
  },

  renderReportsSummary(reports) {
    if (!reports) return;
    const pending = document.getElementById('stat-reports-pending');
    const inProgress = document.getElementById('stat-reports-progress');
    const resolved = document.getElementById('stat-reports-resolved');

    if (pending) pending.textContent = reports.pending;
    if (inProgress) inProgress.textContent = reports.inProgress;
    if (resolved) resolved.textContent = reports.resolved;
  },

  renderWarningsCount(count) {
    const el = document.getElementById('dashboard-active-warnings-count');
    if (el) el.textContent = count || '3 Active';
  },

  initMiniMap() {
    const mapContainer = document.getElementById('mini-dashboard-map');
    if (!mapContainer || !window.L) return;

    // Center on Chhatrapati Sambhajinagar
    this.map = L.map('mini-dashboard-map', {
      zoomControl: false,
      attributionControl: false
    }).setView([19.8762, 75.3433], 11);

    // Esri dark-gray basemap
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',{
    maxZoom: 18,
    attribution: 'Tiles © Esri, HERE, Garmin, © OpenStreetMap contributors, GIS User Community'
    }).addTo(this.map);

    // Flood Danger Circle / Radar Simulation
    L.circle([19.8762, 75.3433], {
      color: '#FF3366',
      fillColor: '#FF3366',
      fillOpacity: 0.35,
      radius: 4000
    }).addTo(this.map).bindPopup('<b>Kham River Inundation Hotspot</b><br>Rainfall: 120 mm');

    L.circle([19.4934, 75.3789], {
      color: '#FFB020',
      fillColor: '#FFB020',
      fillOpacity: 0.3,
      radius: 6500
    }).addTo(this.map).bindPopup('<b>Jayakwadi Dam Spillway Discharge</b>');

    // Pulsing Marker for Command Post
    const commandMarker = L.circleMarker([19.8762, 75.3433], {
      radius: 8,
      fillColor: '#00F5FF',
      color: '#FFFFFF',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.9
    }).addTo(this.map).bindPopup('<b>District Disaster Management HQ</b>');
  },

  recenterMiniMap(city) {
    const coordsMap = {
      'Chhatrapati Sambhajinagar': [19.8762, 75.3433],
      'Pune': [18.5204, 73.8567],
      'Nashik': [19.9975, 73.7898],
      'Nagpur': [21.1458, 79.0882]
    };
    const c = coordsMap[city] || coordsMap['Chhatrapati Sambhajinagar'];
    if (this.map) {
      this.map.setView(c, 11);
    }
  }
};

window.Dashboard = Dashboard;
