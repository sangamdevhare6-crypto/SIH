/* ============================================================
   WORLD MONITOR - LIVE RADAR & SATELLITE CONTROLLER
   Matches Section 12 Specification
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  RadarApp.init();
});

const RadarApp = {
  map: null,
  radarLayerGroup: null,
  lightningLayerGroup: null,
  windLayerGroup: null,
  currentMode: 'radar', // 'radar' or 'satellite'
  activeFilter: 'all', // 'Light', 'Moderate', 'Heavy', 'Extreme'
  isPlaying: true,
  currentFrameIndex: 4,
  playbackInterval: null,
  radarData: null,

  async init() {
    await this.fetchRadarData();
    this.initMap();
    this.bindControls();
    this.startAnimationLoop();
  },

  async fetchRadarData() {
    try {
      const res = await API.get('/api/weather/radar');
      if (res && res.success) {
        this.radarData = res.data;
      }
    } catch (e) {
      console.warn('Could not fetch radar metadata:', e);
    }
  },

  initMap() {
    const mapEl = document.getElementById('radar-map');
    if (!mapEl || !window.L) return;

    this.map = L.map('radar-map', {
      zoomControl: true
    }).setView([19.8762, 75.3433], 9);

    // Dark Basemap
    this.darkTileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 18,
      attribution: '© OpenStreetMap contributors, © CARTO'
    }).addTo(this.map);

    // Satellite Basemap layer (Esri World Imagery)
    this.satelliteTileLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 18,
      attribution: 'Tiles © Esri'
    });

    this.radarLayerGroup = L.layerGroup().addTo(this.map);
    this.lightningLayerGroup = L.layerGroup().addTo(this.map);
    this.windLayerGroup = L.layerGroup().addTo(this.map);

    this.renderStormCells();
    this.renderLightning();
  },

  renderStormCells() {
    this.radarLayerGroup.clearLayers();
    if (!this.radarData || !this.radarData.stormCells) return;

    const colors = {
      'Light': '#00F5FF',
      'Moderate': '#00FFA3',
      'Heavy': '#FFB020',
      'Extreme': '#FF3366'
    };

    this.radarData.stormCells.forEach(cell => {
      if (this.activeFilter !== 'all' && cell.intensity.toLowerCase() !== this.activeFilter.toLowerCase()) {
        return;
      }

      const color = colors[cell.intensity] || '#00D9FF';

      // Outer storm cloud perimeter
      L.circle([cell.lat, cell.lng], {
        color: color,
        fillColor: color,
        fillOpacity: 0.28,
        weight: 2,
        radius: cell.radius
      }).addTo(this.radarLayerGroup).bindPopup(`
        <div style="color: #000; font-family: sans-serif;">
          <h4 style="margin: 0 0 4px; color: ${color};">${cell.name}</h4>
          <p style="margin: 2px 0;"><b>Intensity:</b> ${cell.intensity} (${cell.dbz} dBZ)</p>
          <p style="margin: 2px 0;"><b>Speed:</b> ${cell.speed} (${cell.direction})</p>
          <p style="margin: 2px 0;"><b>Lightning Rate:</b> ${cell.lightningRate}</p>
        </div>
      `);

      // Inner dense core
      L.circle([cell.lat, cell.lng], {
        color: color,
        fillColor: color,
        fillOpacity: 0.6,
        weight: 1,
        radius: cell.radius * 0.45
      }).addTo(this.radarLayerGroup);
    });
  },

  renderLightning() {
    this.lightningLayerGroup.clearLayers();
    if (!this.radarData || !this.radarData.lightningStrikes) return;

    this.radarData.lightningStrikes.forEach(strike => {
      const strikeIcon = L.divIcon({
        className: 'lightning-marker',
        html: `<div style="color: #FFE600; font-size: 22px; filter: drop-shadow(0 0 8px #FFE600);"><i data-lucide="zap">⚡</i></div>`,
        iconSize: [20, 20]
      });

      L.marker([strike.lat, strike.lng], { icon: strikeIcon })
        .addTo(this.lightningLayerGroup)
        .bindPopup(`<b>Lightning Strike Detected</b><br>Age: ${strike.ageSec}s ago<br>Polarity: ${strike.polarity}`);
    });
  },

  bindControls() {
    // Mode switcher (Radar vs Satellite)
    const radarTab = document.getElementById('tab-mode-radar');
    const satelliteTab = document.getElementById('tab-mode-satellite');

    if (radarTab && satelliteTab) {
      radarTab.addEventListener('click', () => {
        radarTab.classList.add('active');
        satelliteTab.classList.remove('active');
        this.setMode('radar');
      });

      satelliteTab.addEventListener('click', () => {
        satelliteTab.classList.add('active');
        radarTab.classList.remove('active');
        this.setMode('satellite');
      });
    }

    // Intensity Filter Buttons (Light, Moderate, Heavy, Extreme)
    const filterBtns = document.querySelectorAll('.radar-filter-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeFilter = btn.dataset.filter || 'all';
        this.renderStormCells();
      });
    });

    // Playback buttons
    const playPauseBtn = document.getElementById('radar-play-btn');
    if (playPauseBtn) {
      playPauseBtn.addEventListener('click', () => {
        this.isPlaying = !this.isPlaying;
        playPauseBtn.innerHTML = this.isPlaying ? '<i data-lucide="pause"></i> Pause' : '<i data-lucide="play"></i> Play';
        if (window.lucide) window.lucide.createIcons();
      });
    }

    // Time slider
    const timeSlider = document.getElementById('radar-time-slider');
    if (timeSlider) {
      timeSlider.addEventListener('input', (e) => {
        this.currentFrameIndex = parseInt(e.target.value);
        this.updateTimeLabel();
      });
    }
  },

  setMode(mode) {
    this.currentMode = mode;
    if (mode === 'satellite') {
      this.map.removeLayer(this.darkTileLayer);
      this.satelliteTileLayer.addTo(this.map);
    } else {
      this.map.removeLayer(this.satelliteTileLayer);
      this.darkTileLayer.addTo(this.map);
    }
  },

  updateTimeLabel() {
    const lbl = document.getElementById('radar-frame-label');
    if (lbl && this.radarData && this.radarData.frames) {
      const frame = this.radarData.frames[this.currentFrameIndex] || this.radarData.frames[4];
      lbl.textContent = `${frame.time} (${frame.label})`;
    }
  },

  startAnimationLoop() {
    this.playbackInterval = setInterval(() => {
      if (this.isPlaying && this.radarData && this.radarData.frames) {
        this.currentFrameIndex = (this.currentFrameIndex + 1) % this.radarData.frames.length;
        const slider = document.getElementById('radar-time-slider');
        if (slider) slider.value = this.currentFrameIndex;
        this.updateTimeLabel();
      }
    }, 1800);
  }
};

window.RadarApp = RadarApp;
