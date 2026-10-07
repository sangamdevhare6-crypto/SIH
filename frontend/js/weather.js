/* ============================================================
   WORLD MONITOR - WEATHER & NOWCAST CONTROLLER
   Matches Section 13 (Nowcast) & Section 21 (Weather Data)
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  WeatherApp.init();
});

const WeatherApp = {
  nowcastChart: null,

  async init() {
    await this.loadWeather();
    await this.loadNowcast();

    window.addEventListener('wm:city_changed', () => {
      this.loadWeather();
      this.loadNowcast();
    });
  },

  async loadWeather() {
    try {
      const city = App.selectedCity || 'Chhatrapati Sambhajinagar';
      let url = `/api/weather?city=${encodeURIComponent(city)}`;
      const coords = App.selectedCoordinates || (localStorage.getItem('wm_selected_coordinates') ? JSON.parse(localStorage.getItem('wm_selected_coordinates')) : null);
      if (coords && Number.isFinite(coords.latitude) && Number.isFinite(coords.longitude)) {
        url += `&lat=${coords.latitude}&lon=${coords.longitude}`;
      }
      const res = await API.get(url);
      if (res && res.success && res.data) {
        this.renderWeatherOverview(res.data);
      }
    } catch (e) {
      console.warn('Weather fetch failed:', e);
    }
  },

  renderWeatherOverview(data) {
    const tempEl = document.getElementById('weather-temp-main');
    const condEl = document.getElementById('weather-condition-main');
    const rainEl = document.getElementById('weather-rainfall');
    const humEl = document.getElementById('weather-humidity');
    const windEl = document.getElementById('weather-wind');
    const pressEl = document.getElementById('weather-pressure');
    const visEl = document.getElementById('weather-visibility');
    const uvEl = document.getElementById('weather-uv');
    const aqiEl = document.getElementById('weather-aqi');

    if (tempEl) tempEl.textContent = data.temperature != null ? `${data.temperature}°C` : '—°C';
    if (condEl) condEl.textContent = data.condition || '—';
    if (rainEl) rainEl.textContent = data.rainfall_mm != null ? `${data.rainfall_mm} mm` : '— mm';
    if (humEl) humEl.textContent = data.humidity != null ? `${data.humidity}%` : '—%';
    if (windEl) windEl.textContent = data.wind_speed != null ? `${data.wind_speed} km/h (${data.wind_direction || 'N/A'})` : '— km/h';
    if (pressEl) pressEl.textContent = data.pressure != null ? `${data.pressure} hPa` : '— hPa';
    if (visEl) visEl.textContent = `${data.visibility ?? 4.2} km`;
    if (uvEl) uvEl.textContent = `${data.uv_index ?? 3} Moderate`;
    if (aqiEl) aqiEl.textContent = data.air_quality || 'Moderate (AQI 65)';

    // Render 7-Day Forecast if container exists
    const sevenDayContainer = document.getElementById('seven-day-forecast-list');
    if (sevenDayContainer && data.sevenDay && data.sevenDay.length > 0) {
      sevenDayContainer.innerHTML = data.sevenDay.map(d => `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid rgba(0, 59, 102, 0.4);">
          <span style="font-family: var(--font-rajdhani); font-weight: 700; width: 90px;">${d.day}</span>
          <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
            <i data-lucide="${d.rainProb > 60 ? 'cloud-rain' : 'cloud-sun'}" style="color: var(--cyan-vibrant); width: 20px; height: 20px;"></i>
            <span style="color: var(--text-secondary); font-size: 0.9rem;">${d.condition}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 16px; font-family: var(--font-orbitron); font-size: 0.9rem;">
            <span style="color: var(--cyan-bright);">${d.rainProb}% Rain</span>
            <span style="color: var(--text-white);">${d.high}° / <span style="color: var(--text-muted);">${d.low}°</span></span>
          </div>
        </div>
      `).join('');

      if (window.lucide) window.lucide.createIcons();
    }
  },

  async loadNowcast() {
    try {
      const city = App.selectedCity || 'Chhatrapati Sambhajinagar';
      let url = `/api/weather/nowcast?city=${encodeURIComponent(city)}`;
      const coords = App.selectedCoordinates || (localStorage.getItem('wm_selected_coordinates') ? JSON.parse(localStorage.getItem('wm_selected_coordinates')) : null);
      if (coords && Number.isFinite(coords.latitude) && Number.isFinite(coords.longitude)) {
        url += `&lat=${coords.latitude}&lon=${coords.longitude}`;
      }
      const res = await API.get(url);
      if (res && res.success) {
        this.renderHourlyCards(res.hourly);
        this.renderRiskCard(res.riskAssessment);
        this.renderNowcastChart(res.chartData);
      }
    } catch (e) {
      console.warn('Nowcast fetch failed:', e);
    }
  },

  renderHourlyCards(hourly = []) {
    const container = document.getElementById('nowcast-hourly-cards');
    if (!container) return;

    if (hourly.length === 0) {
      container.innerHTML = '<div style="color: var(--text-muted); padding: 16px;">Loading telemetry...</div>';
      return;
    }

    container.innerHTML = hourly.map((h, i) => `
      <div class="kpi-card ${i === 0 ? 'neon-border-pulsing' : ''}" style="flex-direction: column; align-items: flex-start; gap: 8px; padding: 16px;">
        <div style="display: flex; justify-content: space-between; width: 100%; border-bottom: 1px solid rgba(0, 59, 102, 0.4); padding-bottom: 6px;">
          <span style="font-family: var(--font-orbitron); font-size: 1rem; color: var(--cyan-bright); font-weight: 700;">${h.time}</span>
          <span class="badge ${h.rainProb > 75 ? 'badge-danger' : 'badge-warning'}" style="font-size: 0.72rem;">${h.rainProb}% Rain</span>
        </div>
        <div style="display: flex; align-items: baseline; gap: 8px;">
          <span style="font-family: var(--font-orbitron); font-size: 1.8rem; font-weight: 700; color: #FFF;">${h.temp}°C</span>
          <span style="color: var(--text-secondary); font-size: 0.85rem;">${h.condition}</span>
        </div>
        <div style="font-size: 0.8rem; color: var(--text-muted); display: flex; align-items: center; gap: 6px;">
          <i data-lucide="droplet" style="width: 14px; height: 14px; color: var(--cyan-vibrant);"></i> Humidity: ${h.humidity}%
        </div>
      </div>
    `).join('');

    if (window.lucide) window.lucide.createIcons();
  },

  renderRiskCard(risk) {
    if (!risk) return;
    const titleEl = document.getElementById('risk-card-title');
    const floodEl = document.getElementById('risk-flood-prob');
    const peakEl = document.getElementById('risk-peak-rate');
    const runoffEl = document.getElementById('risk-runoff');
    const soilEl = document.getElementById('risk-soil');

    if (titleEl) titleEl.textContent = risk.overallRisk;
    if (floodEl) floodEl.textContent = `${risk.floodProbabilityMax}%`;
    if (peakEl) peakEl.textContent = risk.peakRainfallRate;
    if (runoffEl) runoffEl.textContent = risk.runOffIndex;
    if (soilEl) soilEl.textContent = risk.soilSaturation;
  },

  renderNowcastChart(chartData) {
    const canvas = document.getElementById('nowcastPredictionChart');
    if (!canvas || !window.Chart || !chartData) return;

    if (this.nowcastChart) {
      this.nowcastChart.destroy();
    }

    const ctx = canvas.getContext('2d');

    // Create neon gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(0, 245, 255, 0.45)');
    gradient.addColorStop(1, 'rgba(0, 245, 255, 0.0)');

    const floodGrad = ctx.createLinearGradient(0, 0, 0, 300);
    floodGrad.addColorStop(0, 'rgba(255, 51, 102, 0.4)');
    floodGrad.addColorStop(1, 'rgba(255, 51, 102, 0.0)');

    this.nowcastChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: chartData.labels,
        datasets: [
          {
            label: 'Rainfall Intensity (mm/hr)',
            data: chartData.precipitationRate,
            borderColor: '#00F5FF',
            backgroundColor: gradient,
            borderWidth: 2,
            fill: true,
            tension: 0.35,
            yAxisID: 'y'
          },
          {
            label: 'Flood Risk Probability (%)',
            data: chartData.floodProbability,
            borderColor: '#FF3366',
            backgroundColor: floodGrad,
            borderWidth: 2,
            borderDash: [5, 5],
            fill: false,
            tension: 0.3,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            labels: {
              color: '#94A3B8',
              font: { family: 'Rajdhani', size: 13, weight: 600 }
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(0, 59, 102, 0.3)' },
            ticks: { color: '#64748B', font: { family: 'Rajdhani' } }
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            grid: { color: 'rgba(0, 59, 102, 0.3)' },
            ticks: { color: '#00F5FF', font: { family: 'Rajdhani' } },
            title: { display: true, text: 'Rainfall Rate (mm/hr)', color: '#00F5FF' }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: { color: '#FF3366', font: { family: 'Rajdhani' } },
            title: { display: true, text: 'Flood Risk (%)', color: '#FF3366' },
            min: 0,
            max: 100
          }
        }
      }
    });
  }
};

window.WeatherApp = WeatherApp;

class WeatherManager {

    constructor() {
        this.apiUrl = '/api/weather/current';
    }

    async getWeatherByLocation(lat, lon) {

        try {

            const response = await fetch(
                `${this.apiUrl}?lat=${lat}&lon=${lon}`
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Weather request failed');
            }

            return result.data;

        } catch (error) {

            console.error('Weather Error:', error);

            throw error;
        }
    }

    async getWeatherByCity(city) {

        try {

            const response = await fetch(
                `${this.apiUrl}?city=${encodeURIComponent(city)}`
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Weather request failed');
            }

            return result.data;

        } catch (error) {

            console.error('Weather Error:', error);

            throw error;
        }
    }

    async detectUserWeather() {

        return new Promise((resolve, reject) => {

            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                async (position) => {

                    try {

                        const lat = position.coords.latitude;
                        const lon = position.coords.longitude;

                        console.log('Detected Location:', lat, lon);

                        const weather =
                            await this.getWeatherByLocation(lat, lon);

                        resolve(weather);

                    } catch (error) {
                        reject(error);
                    }
                },

                (error) => {

                    console.error('Location Error:', error);

                    reject(
                        new Error(
                            'Location permission was denied or unavailable'
                        )
                    );
                },

                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 300000
                }
            );
        });
    }
}

const weatherManager = new WeatherManager();