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
  cityMarker: null,
  citySearchTimer: null,
  citySearchRequestId: 0,
  citySelectionRequestId: 0,
  citySearchResults: [],

  async init() {
    this.initMap();
    window.addEventListener('wm:user_location', (event) => {
      this.loadCurrentLocation(event.detail);
    });
    window.addEventListener('wm:city_changed', (event) => {
      if (event.detail && event.detail.city) {
        this.loadFloodCityByName(event.detail.city);
      }
    });
    await this.loadMapLayers();
    this.bindRouteCalculator();
    this.bindFloodCitySearch();
  },

  async loadCurrentLocation(location) {
    const selectedLocation = {
      name: 'Your location',
      latitude: Number(location.latitude),
      longitude: Number(location.longitude),
      zoom: 14
    };

    this.applyFloodCity(selectedLocation);

    const query = new URLSearchParams({
      city: selectedLocation.name,
      lat: String(selectedLocation.latitude),
      lon: String(selectedLocation.longitude)
    });

    try {
      const response = await API.get(`/api/weather?${query}`);
      this.renderFloodCityWeather(response.data, selectedLocation);
    } catch (error) {
      this.renderFloodCityWeather(null, selectedLocation);
    }
  },

  bindFloodCitySearch() {
    const input = document.getElementById('flood-city-search');
    const button = document.getElementById('flood-city-search-button');
    const results = document.getElementById('flood-city-search-results');
    const citySelect = document.getElementById('global-city-select');

    if (!input || !button || !results) return;

    input.addEventListener('input', () => {
      window.clearTimeout(this.citySearchTimer);
      const query = input.value.trim();

      if (query.length < 2) {
        this.citySearchRequestId += 1;
        this.hideFloodCityResults();
        return;
      }

      this.citySearchTimer = window.setTimeout(
        () => this.searchFloodCities(query),
        350
      );
    });

    button.addEventListener('click', () => {
      window.clearTimeout(this.citySearchTimer);
      this.searchFloodCities(input.value.trim());
    });

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        this.hideFloodCityResults();
      } else if (event.key === 'Enter') {
        event.preventDefault();
        const firstResult = results.querySelector('[data-location-index]');
        if (firstResult && !results.hidden) firstResult.click();
        else this.searchFloodCities(input.value.trim());
      }
    });

    results.addEventListener('click', (event) => {
      const resultButton = event.target.closest('[data-location-index]');
      if (!resultButton) return;

      const location = this.citySearchResults[
        Number(resultButton.dataset.locationIndex)
      ];

      if (location) this.selectFloodCity(location);
    });

    document.addEventListener('click', (event) => {
      if (!event.target.closest('.flood-city-picker')) {
        this.hideFloodCityResults();
      }
    });

    citySelect?.addEventListener('change', (event) => {
      this.loadFloodCityByName(event.target.value);
    });

    const initialCity =
      localStorage.getItem('wm_selected_city') ||
      'Chhatrapati Sambhajinagar';
    this.loadFloodCityByName(initialCity);
  },

  async searchFloodCities(query) {
    if (query.length < 2) {
      this.renderFloodCityMessage('Enter at least 2 characters');
      return;
    }

    const requestId = ++this.citySearchRequestId;
    this.renderFloodCityMessage('Searching locations...');

    try {
      const response = await API.get(
        `/api/weather/locations?q=${encodeURIComponent(query)}`
      );
      if (requestId !== this.citySearchRequestId) return;

      this.citySearchResults = response.data || [];
      if (this.citySearchResults.length === 0) {
        this.renderFloodCityMessage('No matching cities found');
        return;
      }

      this.renderFloodCityResults(this.citySearchResults);
    } catch (error) {
      if (requestId !== this.citySearchRequestId) return;
      this.renderFloodCityMessage(this.getFloodCitySearchErrorMessage(error));
    }
  },

  getFloodCitySearchErrorMessage(error) {
    const message = String(error?.message || '').toLowerCase();

    if (message.includes('weather_api_key is not configured')) {
      return 'WEATHER_API_KEY is missing in Render Environment. Add it and redeploy.';
    }
    if (/401|invalid api key|unauthorized/.test(message)) {
      return 'OpenWeather rejected WEATHER_API_KEY. Check that the key is active and copied correctly.';
    }
    if (/403|forbidden/.test(message)) {
      return 'OpenWeather denied city search. Check Geocoding API access for this key.';
    }
    if (/429|rate limit/.test(message)) {
      return 'OpenWeather rate limit reached. Wait a little, then try again.';
    }
    if (/endpoint not found|cannot get \/api\/weather\/locations|404/.test(message)) {
      return 'City search API is missing. Deploy the latest backend commit on Render.';
    }

    return 'City search failed. Check Render logs and WEATHER_API_KEY.';
  },

  renderFloodCityResults(locations) {
    const results = document.getElementById('flood-city-search-results');
    if (!results) return;

    results.replaceChildren();
    locations.forEach((location, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'flood-city-result';
      button.setAttribute('role', 'option');
      button.dataset.locationIndex = String(index);

      const name = document.createElement('strong');
      name.textContent = location.name;
      const details = document.createElement('span');
      details.textContent = [
        location.state,
        this.getFloodCountryName(location.country)
      ].filter(Boolean).join(', ');

      button.append(name, details);
      results.append(button);
    });

    results.hidden = false;
    document.getElementById('flood-city-search')?.setAttribute('aria-expanded', 'true');
  },

  renderFloodCityMessage(message) {
    const results = document.getElementById('flood-city-search-results');
    if (!results) return;

    results.replaceChildren();
    const messageElement = document.createElement('div');
    messageElement.className = 'flood-city-search-message';
    messageElement.textContent = message;
    results.append(messageElement);
    results.hidden = false;
    document.getElementById('flood-city-search')?.setAttribute('aria-expanded', 'true');
  },

  hideFloodCityResults() {
    const results = document.getElementById('flood-city-search-results');
    if (results) results.hidden = true;
    document.getElementById('flood-city-search')?.setAttribute('aria-expanded', 'false');
  },

  getFloodCountryName(countryCode) {
    if (!countryCode) return '';
    try {
      return new Intl.DisplayNames([navigator.language || 'en'], {
        type: 'region'
      }).of(countryCode) || countryCode;
    } catch (error) {
      return countryCode;
    }
  },

  formatFloodCity(location) {
    return [
      location.name,
      location.state,
      this.getFloodCountryName(location.country)
    ].filter(Boolean).join(', ');
  },

  async selectFloodCity(location) {
    const requestId = ++this.citySelectionRequestId;
    const selectedLocation = {
      ...location,
      latitude: Number(location.latitude),
      longitude: Number(location.longitude)
    };

    this.applyFloodCity(selectedLocation);
    this.hideFloodCityResults();
    this.syncFloodCity(selectedLocation);

    const query = new URLSearchParams({
      city: selectedLocation.name,
      lat: String(selectedLocation.latitude),
      lon: String(selectedLocation.longitude),
      state: selectedLocation.state || '',
      country: selectedLocation.country || ''
    });

    try {
      const response = await API.get(`/api/weather?${query}`);
      if (requestId !== this.citySelectionRequestId) return;
      this.renderFloodCityWeather(response.data, selectedLocation);
    } catch (error) {
      if (requestId !== this.citySelectionRequestId) return;
      this.renderFloodCityWeather(null, selectedLocation);
    }
  },

  async loadFloodCityByName(city) {
    if (!city || !this.map) return;

    // 1. Instantly move map using local coordinates (no API wait)
    const coords = (window.getCityCoordinates ? window.getCityCoordinates(city) : null) || [19.8762, 75.3433];
    const instantLocation = {
      name: city,
      state: '',
      country: 'IN',
      latitude: coords[0],
      longitude: coords[1],
      zoom: 11
    };
    this.applyFloodCity(instantLocation);

    const requestId = ++this.citySelectionRequestId;
    this.setFloodWeatherLoading(city);

    try {
      const response = await API.get(
        `/api/weather?city=${encodeURIComponent(city)}`
      );
      if (requestId !== this.citySelectionRequestId) return;

      const weather = response.data;
      if (weather) {
        const location = {
          name: weather.city || city,
          state: weather.state || '',
          country: weather.country || 'IN',
          latitude: Number(weather.latitude) || coords[0],
          longitude: Number(weather.longitude) || coords[1],
          zoom: 11
        };
        this.applyFloodCity(location);
        this.renderFloodCityWeather(weather, location);
      } else {
        this.renderFloodCityWeather(null, instantLocation);
      }
    } catch (error) {
      if (requestId !== this.citySelectionRequestId) return;
      this.renderFloodCityWeather(null, instantLocation);
    }
  },

  applyFloodCity(location) {
    const latitude = Number(location.latitude);
    const longitude = Number(location.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

    this.map.setView([latitude, longitude], location.zoom || 10, { animate: true });

    if (this.cityMarker) this.map.removeLayer(this.cityMarker);
    const popup = document.createElement('span');
    popup.textContent = this.formatFloodCity(location);
    this.cityMarker = L.circleMarker([latitude, longitude], {
      radius: 7,
      color: '#ffffff',
      weight: 2,
      fillColor: '#00d9ff',
      fillOpacity: 1
    }).addTo(this.map).bindPopup(popup);

    const label = this.formatFloodCity(location);
    const cityName = document.getElementById('flood-selected-city');
    const searchInput = document.getElementById('flood-city-search');
    if (cityName) cityName.textContent = label;
    if (searchInput) searchInput.value = label;
    this.setFloodWeatherLoading(label);
  },

  setFloodWeatherLoading(label) {
    const cityName = document.getElementById('flood-selected-city');
    const condition = document.getElementById('flood-city-condition');
    if (cityName) cityName.textContent = label;
    if (condition) condition.textContent = 'Loading current conditions';

    ['flood-city-temperature', 'flood-city-rainfall', 'flood-city-humidity']
      .forEach((id) => {
        const element = document.getElementById(id);
        if (element) element.textContent = '--';
      });
  },

  renderFloodCityWeather(weather, location) {
    const cityName = document.getElementById('flood-selected-city');
    const condition = document.getElementById('flood-city-condition');

    if (cityName) {
      cityName.textContent = this.formatFloodCity({
        name: weather?.city || location.name,
        state: weather?.state || location.state,
        country: weather?.country || location.country
      });
    }

    if (!weather) {
      if (condition) condition.textContent = 'Current weather unavailable';
      return;
    }

    if (condition) condition.textContent = weather.condition || 'Current conditions available';
    const metrics = {
      'flood-city-temperature': `${Math.round(Number(weather.temperature))}°C`,
      'flood-city-rainfall': `${Number(weather.rainfall_mm || 0).toFixed(1)} mm`,
      'flood-city-humidity': `${Math.round(Number(weather.humidity))}%`
    };

    Object.entries(metrics).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) element.textContent = value;
    });
  },

  syncFloodCity(location) {
    const cityQuery = [location.name, location.country]
      .filter(Boolean)
      .join(', ');
    const citySelect = document.getElementById('global-city-select');

    if (citySelect) {
      let option = Array.from(citySelect.options).find(
        (item) => item.value === cityQuery
      );
      if (!option) {
        option = new Option(this.formatFloodCity(location), cityQuery);
        citySelect.add(option);
      }
      citySelect.value = cityQuery;
    }

    if (window.App && typeof window.App.changeCity === 'function') {
      window.App.changeCity(cityQuery);
    } else {
      localStorage.setItem('wm_selected_city', cityQuery);
    }
  },

  initMap() {
    const mapEl = document.getElementById('safe-routes-map') || document.getElementById('flood-map-container');
    if (!mapEl || !window.L) return;

    this.map = L.map(mapEl.id, {
      zoomControl: true
    }).setView([19.8762, 75.3433], 12);

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{
    maxZoom: 18,
    attribution: 'Tiles © Esri, Maxar, Earthstar Geographics, and the GIS User Community'
    }).addTo(this.map);

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 18,
      pane: 'overlayPane',
      attribution: 'Place labels © Esri, HERE, Garmin, FAO, NOAA, USGS, EPA, NPS'
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

  /* ── Route Calculator: search, GPS, map drawing ── */

  bindRouteCalculator() {
    const form        = document.getElementById('find-safe-route-form');
    const resultBox   = document.getElementById('route-calculation-result');
    const originInput = document.getElementById('route-origin');
    const destInput   = document.getElementById('route-destination');
    const gpsBtn      = document.getElementById('use-my-location-btn');
    const originSugg  = document.getElementById('origin-suggestions');
    const destSugg    = document.getElementById('destination-suggestions');

    // Store selected lat/lon for map drawing even if backend has no polyline
    this._originCoords = null;
    this._destCoords   = null;

    if (!form) return;

    // ── Autocomplete for Departure field ──
    if (originInput && originSugg) {
      this._bindLocationSearch(originInput, originSugg, (loc) => {
        this._originCoords = [loc.lat, loc.lon];
      });
    }

    // ── Autocomplete for Destination field ──
    if (destInput && destSugg) {
      this._bindLocationSearch(destInput, destSugg, (loc) => {
        this._destCoords = [loc.lat, loc.lon];
      });
    }

    // ── GPS "My Location" Button ──
    if (gpsBtn && originInput) {
      gpsBtn.addEventListener('click', () => {
        if (!navigator.geolocation) {
          window.showToast('Geolocation not supported by your browser', 'danger');
          return;
        }
        gpsBtn.classList.add('gps-loading');
        gpsBtn.innerHTML = '<i data-lucide="loader" style="width:14px;height:14px;"></i> Locating…';
        if (window.lucide) window.lucide.createIcons();

        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const { latitude, longitude } = pos.coords;
            this._originCoords = [latitude, longitude];

            // Reverse-geocode with Nominatim
            try {
              const resp = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
                { headers: { 'Accept-Language': 'en' } }
              );
              const data = await resp.json();
              const label = data.display_name
                ? data.display_name.split(',').slice(0, 3).join(', ')
                : `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
              originInput.value = label;
            } catch {
              originInput.value = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
            }

            // Pan map to current location
            if (this.map) {
              this.map.setView([latitude, longitude], 14, { animate: true });
              if (this.cityMarker) this.map.removeLayer(this.cityMarker);
              this.cityMarker = L.circleMarker([latitude, longitude], {
                radius: 8, color: '#fff', weight: 2,
                fillColor: '#00d9ff', fillOpacity: 1
              }).addTo(this.map).bindPopup('📍 Your Current Location').openPopup();
            }

            gpsBtn.classList.remove('gps-loading');
            gpsBtn.innerHTML = '<i data-lucide="locate" style="width:14px;height:14px;"></i> My Location';
            if (window.lucide) window.lucide.createIcons();
            window.showToast('Current location detected!', 'success');
          },
          (err) => {
            gpsBtn.classList.remove('gps-loading');
            gpsBtn.innerHTML = '<i data-lucide="locate" style="width:14px;height:14px;"></i> My Location';
            if (window.lucide) window.lucide.createIcons();
            window.showToast('Unable to get location: ' + err.message, 'danger');
          },
          { enableHighAccuracy: true, timeout: 12000 }
        );
      });
    }

    // ── Form Submit ──
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const origin      = originInput ? originInput.value.trim() : '';
      const destination = destInput   ? destInput.value.trim()   : '';

      if (!origin || !destination) {
        window.showToast('Please fill both departure and destination fields', 'danger');
        return;
      }

      // Need lat/lon for real routing — geocode if not yet selected from dropdown
      let oc = this._originCoords;
      let dc = this._destCoords;

      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Calculating…'; }

      try {
        window.showToast('Fetching real road route…', 'info');

        // Geocode if coords missing (user typed manually without picking suggestion)
        if (!oc) oc = await this._geocodeText(origin);
        if (!dc) dc = await this._geocodeText(destination);

        if (!oc || !dc) {
          window.showToast('Could not locate one of the addresses. Pick from suggestions.', 'danger');
          return;
        }

        // ── OSRM real road routing (free, no API key) ──
        const osrmUrl =
          `https://router.project-osrm.org/route/v1/driving/` +
          `${oc[1]},${oc[0]};${dc[1]},${dc[0]}` +
          `?overview=full&geometries=geojson&steps=false`;

        const osrmResp = await fetch(osrmUrl);
        const osrmData = await osrmResp.json();

        if (osrmData.code !== 'Ok' || !osrmData.routes || !osrmData.routes.length) {
          window.showToast('No drivable road route found between these points.', 'danger');
          return;
        }

        const osrmRoute    = osrmData.routes[0];
        const distanceKm   = (osrmRoute.distance / 1000).toFixed(1);
        const durationMins = Math.round(osrmRoute.duration / 60);
        // Convert GeoJSON [lon,lat] → Leaflet [lat,lon]
        const latlngs = osrmRoute.geometry.coordinates.map(c => [c[1], c[0]]);

        // ── Draw route on map ──
        if (this.routeLayer) {
          this.routeLayer.clearLayers();   // clear preset routes while showing custom one
        }

        const routePoly = L.polyline(latlngs, {
          color: '#00FFA3',
          weight: 6,
          opacity: 0.95,
          lineJoin: 'round'
        }).addTo(this.routeLayer);
        this.map.fitBounds(routePoly.getBounds(), { padding: [50, 50], animate: true });

        // Origin marker
        L.marker(oc, {
          icon: L.divIcon({
            className: '',
            html: `<div style="background:#00d9ff;color:#000;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-size:15px;border:2px solid #fff;box-shadow:0 0 10px #00d9ff;">📍</div>`,
            iconSize: [30, 30], iconAnchor: [15, 15]
          })
        }).addTo(this.routeLayer).bindPopup(`<b>Departure</b><br>${origin}`);

        // Destination marker
        L.marker(dc, {
          icon: L.divIcon({
            className: '',
            html: `<div style="background:#00FFA3;color:#000;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-size:15px;border:2px solid #fff;box-shadow:0 0 10px #00FFA3;">🏠</div>`,
            iconSize: [30, 30], iconAnchor: [15, 15]
          })
        }).addTo(this.routeLayer).bindPopup(`<b>Destination</b><br>${destination}`);

        // ── Result box ──
        // Also try backend for hazard info (non-critical, ignore failure)
        let hazardInfo = [];
        try {
          const backendRes = await API.post('/api/routes/find', { origin, destination });
          if (backendRes?.success && backendRes?.route?.avoidedRisks) {
            hazardInfo = backendRes.route.avoidedRisks;
          }
        } catch { /* ignore backend errors */ }

        if (resultBox) {
          resultBox.style.display = 'block';
          resultBox.innerHTML = `
            <div class="hud-panel neon-border-pulsing" style="margin-top: 16px;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <span style="font-family:var(--font-orbitron);font-weight:700;color:var(--green-neon);font-size:0.9rem;">ROUTE SECURED</span>
                <div style="display:flex;gap:6px;align-items:center;">
                  <span class="badge badge-success" style="font-size:0.75rem;"><i data-lucide="shield-check" style="width:12px;height:12px;"></i> Safe</span>
                  <button id="clear-route-btn" type="button" style="padding:3px 10px;background:rgba(255,51,102,0.15);border:1px solid rgba(255,51,102,0.4);color:#ff3366;border-radius:5px;font-size:0.75rem;cursor:pointer;font-family:var(--font-rajdhani);font-weight:600;">✕ Clear</button>
                </div>
              </div>
              <p style="font-size:0.88rem;color:#FFF;margin-bottom:6px;">
                <b>📍 ${origin}</b><br>
                <span style="color:var(--text-secondary);font-size:0.8rem;">↓ via road</span><br>
                <b>🏠 ${destination}</b>
              </p>
              <div style="display:flex;gap:16px;margin:10px 0;padding:8px 12px;background:rgba(0,255,163,0.08);border-radius:6px;border:1px solid rgba(0,255,163,0.2);">
                <div style="text-align:center;">
                  <div style="font-size:1.2rem;font-weight:700;color:var(--green-neon);font-family:var(--font-orbitron);">${distanceKm}</div>
                  <div style="font-size:0.72rem;color:var(--text-secondary);">KM</div>
                </div>
                <div style="width:1px;background:rgba(255,255,255,0.1);"></div>
                <div style="text-align:center;">
                  <div style="font-size:1.2rem;font-weight:700;color:var(--cyan-bright);font-family:var(--font-orbitron);">${durationMins}</div>
                  <div style="font-size:0.72rem;color:var(--text-secondary);">MINS</div>
                </div>
                <div style="width:1px;background:rgba(255,255,255,0.1);"></div>
                <div style="text-align:center;">
                  <div style="font-size:1.2rem;font-weight:700;color:#a78bfa;font-family:var(--font-orbitron);">🚗</div>
                  <div style="font-size:0.72rem;color:var(--text-secondary);">BY ROAD</div>
                </div>
              </div>
              ${hazardInfo.length ? `
              <div style="margin-top:8px;font-size:0.82rem;color:var(--text-secondary);">
                <b style="color:#FFF;">⚠ Hazards Avoided:</b>
                <ul style="padding-left:18px;margin-top:4px;">
                  ${hazardInfo.map(a => `<li>${a}</li>`).join('')}
                </ul>
              </div>` : ''}
            </div>
          `;
          if (window.lucide) window.lucide.createIcons();

          // Clear button
          document.getElementById('clear-route-btn')?.addEventListener('click', () => {
            if (this.routeLayer) this.routeLayer.clearLayers();
            resultBox.style.display = 'none';
            resultBox.innerHTML = '';
            // Reload preset routes
            this.loadMapLayers();
          });
        }

        window.showToast(`Route found: ${distanceKm} km · ${durationMins} mins`, 'success');

      } catch (err) {
        console.error(err);
        window.showToast('Route calculation failed: ' + (err.message || 'Unknown error'), 'danger');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i data-lucide="route"></i> Compute Elevation Safe Route';
          if (window.lucide) window.lucide.createIcons();
        }
      }
    });

    // Close dropdowns on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#origin-wrap'))      originSugg && (originSugg.hidden = true);
      if (!e.target.closest('#destination-wrap')) destSugg   && (destSugg.hidden   = true);
    });
  },

  /* ── Location Autocomplete Helper ── */
  _bindLocationSearch(input, dropdown, onSelect) {
    let timer = null;

    const search = async (query) => {
      if (query.length < 2) { dropdown.hidden = true; return; }

      dropdown.hidden = false;
      dropdown.innerHTML = `<div class="route-search-msg">Searching…</div>`;

      try {
        const resp = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6&addressdetails=1`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const results = await resp.json();

        if (!results.length) {
          dropdown.innerHTML = `<div class="route-search-msg">No results found</div>`;
          return;
        }

        dropdown.replaceChildren();
        results.forEach((loc) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'route-suggestion-item';
          const label = loc.display_name.split(',').slice(0, 4).join(', ');
          btn.textContent = label;
          btn.addEventListener('click', () => {
            input.value = label;
            dropdown.hidden = true;
            if (this.map) {
              this.map.setView([parseFloat(loc.lat), parseFloat(loc.lon)], 14, { animate: true });
            }
            onSelect({ lat: parseFloat(loc.lat), lon: parseFloat(loc.lon), label });
          });
          dropdown.append(btn);
        });
      } catch {
        dropdown.innerHTML = `<div class="route-search-msg">Search failed. Try again.</div>`;
      }
    };

    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => search(input.value.trim()), 350);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') dropdown.hidden = true;
      if (e.key === 'Enter') {
        const first = dropdown.querySelector('.route-suggestion-item');
        if (first && !dropdown.hidden) { e.preventDefault(); first.click(); }
      }
    });
  },

  /* ── Geocode a free-text address → [lat, lon] or null ── */
  async _geocodeText(text) {
    if (!text) return null;
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await resp.json();
      if (data && data.length > 0) {
        return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      }
    } catch { /* ignore */ }
    return null;
  }
};

window.SafeRoutesApp = SafeRoutesApp;
