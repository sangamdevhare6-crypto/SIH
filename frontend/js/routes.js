/* ============================================================
   WORLD MONITOR - SAFE ROUTES & FLOOD MAP CONTROLLER
   Matches Section 14 (Flood Map) & Section 16 (Safe Routes)
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  SafeRoutesApp.init();
});

const SafeRoutesApp = {
  map: null,
  routeLayer: null,
  shelterLayer: null,
  floodZoneLayer: null,
  riverLayer: null,

  async init() {
    this.initMap();
    await this.loadMapLayers();
    this.bindRouteCalculator();
  },

  initMap() {
    const mapEl = document.getElementById('safe-routes-map') || document.getElementById('flood-map-container');
    if (!mapEl || !window.L) return;

    this.map = L.map(mapEl.id, {
      zoomControl: true
    }).setView([19.8762, 75.3433], 12);

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',{
    maxZoom: 18,
    attribution: 'Tiles © Esri, HERE, Garmin, © OpenStreetMap contributors, GIS User Community'
    }).addTo(this.map);

    this.routeLayer = L.layerGroup().addTo(this.map);
    this.shelterLayer = L.layerGroup().addTo(this.map);
    this.floodZoneLayer = L.layerGroup().addTo(this.map);
    this.riverLayer = L.layerGroup().addTo(this.map);
  },

  async loadMapLayers() { 
    try {
      const res = await API.get('/api/routes');
      if (res && res.success) {
        this.renderRivers(res.rivers);
        this.renderRiskZones(res.riskZones);
        this.renderShelters(res.shelters);
        this.renderPresetRoutes(res.routes);
        this.renderRiverTelemetryList(res.rivers);
      }
    } catch (e) {
      console.warn('Failed to load routes telemetry:', e);
    }
  },

  renderRivers(rivers = []) {
    if (!this.riverLayer) return;
    this.riverLayer.clearLayers();

    rivers.forEach(riv => {
      if (riv.coordinates && riv.coordinates.length > 0) {
        const poly = L.polyline(riv.coordinates, {
          color: riv.riskLevel === 'Very High' ? '#FF3366' : '#00F5FF',
          weight: 4,
          opacity: 0.85
        }).addTo(this.riverLayer);

        poly.bindPopup(`
          <div style="font-family: sans-serif; color: #000;">
            <h4 style="margin: 0 0 4px; color: #0088CC;">${riv.name} River</h4>
            <p style="margin: 2px 0;"><b>Level:</b> ${riv.currentLevel} ${riv.unit} (Danger: ${riv.dangerMark})</p>
            <p style="margin: 2px 0;"><b>Discharge:</b> ${riv.dischargeRate}</p>
            <p style="margin: 2px 0;"><b>Status:</b> ${riv.status}</p>
          </div>
        `);
      }
    });
  },

  renderRiskZones(zones = []) {
    if (!this.floodZoneLayer) return;
    this.floodZoneLayer.clearLayers();

    zones.forEach(z => {
      L.polygon(z.polygon, {
        color: z.color,
        fillColor: z.fillColor,
        fillOpacity: 0.45,
        weight: 2
      }).addTo(this.floodZoneLayer).bindPopup(`
        <div style="font-family: sans-serif; color: #000;">
          <h4 style="margin: 0 0 4px; color: ${z.color};">${z.name}</h4>
          <p style="margin: 2px 0;"><b>Risk Level:</b> ${z.riskLevel}</p>
          <p style="margin: 2px 0; font-size: 0.85rem;">${z.details}</p>
        </div>
      `);
    });
  },

  renderShelters(shelters = []) {
    if (!this.shelterLayer) return;
    this.shelterLayer.clearLayers();

    shelters.forEach(sh => {
      const shelterIcon = L.divIcon({
        className: 'shelter-marker-icon',
        html: `<div style="background: #00FFA3; color: #000; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid #FFF; box-shadow: 0 0 10px #00FFA3;">🏠</div>`,
        iconSize: [28, 28]
      });

      L.marker([sh.lat, sh.lng], { icon: shelterIcon })
        .addTo(this.shelterLayer)
        .bindPopup(`
          <div style="font-family: sans-serif; color: #000;">
            <h4 style="margin: 0 0 4px; color: #00B36E;">${sh.name}</h4>
            <p style="margin: 2px 0;"><b>Capacity:</b> ${sh.capacity} (Current: ${sh.currentOccupancy})</p>
            <p style="margin: 2px 0;"><b>Supplies:</b> ${sh.supplies}</p>
            <p style="margin: 2px 0;"><b>Emergency Helpline:</b> ${sh.phone}</p>
          </div>
        `);
    });
  },

  renderPresetRoutes(routes = []) {
    if (!this.routeLayer) return;
    this.routeLayer.clearLayers();

    routes.forEach(rt => {
      if (rt.polyline && rt.polyline.length > 0) {
        const isBlocked = rt.safe_status === 'Blocked';
        L.polyline(rt.polyline, {
          color: isBlocked ? '#FF3366' : '#00FFA3',
          weight: 5,
          opacity: 0.9,
          dashArray: isBlocked ? '8, 8' : null
        }).addTo(this.routeLayer).bindPopup(`
          <div style="font-family: sans-serif; color: #000;">
            <h4 style="margin: 0 0 4px; color: ${isBlocked ? '#FF3366' : '#00FFA3'};">${rt.name}</h4>
            <p style="margin: 2px 0;"><b>Status:</b> ${rt.safe_status}</p>
            <p style="margin: 2px 0;"><b>Distance:</b> ${rt.distance_km} km (${rt.estimated_time_mins} mins)</p>
          </div>
        `);
      }
    });
  },

  renderRiverTelemetryList(rivers = []) {
    const container = document.getElementById('river-levels-telemetry-list');
    if (!container) return;

    container.innerHTML = rivers.map(r => {
      const pct = Math.min(100, Math.round((r.currentLevel / r.dangerMark) * 100));
      const badgeClass = r.riskLevel === 'Very High' ? 'badge-danger' : (r.riskLevel === 'High' ? 'badge-warning' : 'badge-cyan');
      return `
        <div class="hud-panel" style="padding: 14px; margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-family: var(--font-orbitron); font-size: 1rem; color: #FFF; font-weight: 700;">${r.name} River</span>
            <span class="badge ${badgeClass}">${r.status}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 6px;">
            <span>Level: <b style="color: var(--cyan-bright);">${r.currentLevel} ${r.unit}</b> / Danger Mark: ${r.dangerMark}</span>
            <span>Discharge: ${r.dischargeRate}</span>
          </div>
          <div class="meter-bar-track">
            <div class="meter-bar-fill" style="width: ${pct}%; background: ${pct > 95 ? 'var(--danger-crimson)' : 'var(--cyan-vibrant)'};"></div>
          </div>
        </div>
      `;
    }).join('');
  },

  bindRouteCalculator() {
    const form = document.getElementById('find-safe-route-form');
    const resultBox = document.getElementById('route-calculation-result');

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const origin = document.getElementById('route-origin').value;
        const destination = document.getElementById('route-destination').value;

        try {
          window.showToast('Calculating hazard-free elevation path...', 'info');
          const res = await API.post('/api/routes/find', { origin, destination });

          if (res && res.success && res.route) {
            const rt = res.route;
            if (resultBox) {
              resultBox.style.display = 'block';
              resultBox.innerHTML = `
                <div class="hud-panel neon-border-pulsing" style="margin-top: 16px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-family: var(--font-orbitron); font-weight: 700; color: var(--green-neon);">OPTIMAL ROUTE SECURED</span>
                    <span class="badge badge-success"><i data-lucide="shield-check"></i> ${rt.safe_status}</span>
                  </div>
                  <p style="font-size: 0.95rem; color: #FFF; margin-bottom: 8px;"><b>${rt.name}</b></p>
                  <p style="font-size: 0.85rem; color: var(--cyan-bright);">Distance: ${rt.distance_km} km • ETA: ${rt.estimated_time_mins} mins</p>
                  <div style="margin-top: 10px; font-size: 0.82rem; color: var(--text-secondary);">
                    <b>Active Hazards Avoided:</b>
                    <ul style="padding-left: 18px; margin-top: 4px;">
                      ${rt.avoidedRisks.map(a => `<li>${a}</li>`).join('')}
                    </ul>
                  </div>
                </div>
              `;
              if (window.lucide) window.lucide.createIcons();
            }

            // Draw calculated route on map
            if (this.routeLayer && rt.polyline) {
              const poly = L.polyline(rt.polyline, {
                color: '#00FFA3',
                weight: 6,
                opacity: 1
              }).addTo(this.routeLayer);
              this.map.fitBounds(poly.getBounds(), { padding: [40, 40] });
            }
          }
        } catch (err) {
          window.showToast(err.message, 'danger');
        }
      });
    }
  }
};

window.SafeRoutesApp = SafeRoutesApp;
