/* ============================================================
   WORLD MONITOR - LIVE RADAR & SATELLITE CONTROLLER
   ============================================================
   Features:
    - Live RainViewer precipitation radar
    - Esri dark-gray basemap
   - Satellite basemap
   - Storm cell visualization
   - Lightning visualization
   - Intensity filters
   - Play / Pause timeline
   - Radar timeline
   - Automatic radar refresh
   - Leaflet resize protection
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
    RadarApp.init();
});


const RadarApp = {

    /* ==========================================================
       MAP
       ========================================================== */

    map: null,

    darkTileLayer: null,

    satelliteTileLayer: null,

    cityMarker: null,

    // LIVE RADAR TILE LAYER
    liveRadarLayer: null,

    // Existing data layers
    radarLayerGroup: null,

    lightningLayerGroup: null,

    windLayerGroup: null,


    /* ==========================================================
       STATE
       ========================================================== */

    currentMode: 'radar',

    activeFilter: 'all',

    isPlaying: true,

    currentFrameIndex: 4,

    playbackInterval: null,

    radarRefreshInterval: null,

    radarData: null,

    mapResizeObserver: null,

    citySearchTimer: null,

    citySearchRequestId: 0,

    citySelectionRequestId: 0,

    citySearchResults: [],


    /* ==========================================================
       INIT
       ========================================================== */

    async init() {

        console.log('WORLD MONITOR RADAR: Initializing...');

        // Check Leaflet
        if (!window.L) {
            console.error(
                'WORLD MONITOR RADAR: Leaflet.js is not loaded.'
            );
            return;
        }

        // Check API
        if (!window.API) {
            console.error(
                'WORLD MONITOR RADAR: API object is not available.'
            );
        }

        // Fetch metadata first
        await this.fetchRadarData();

        // Initialize map
        this.initMap();

        // Bind buttons and controls
        this.bindControls();
        this.bindCitySearch();

        const initialCity =
            localStorage.getItem('wm_selected_city') ||
            'Chhatrapati Sambhajinagar';

        this.loadCityByName(initialCity);

        // Start timeline animation
        this.startAnimationLoop();

        // Start live radar refresh
        this.startLiveRadarRefresh();

        // Fix Leaflet size after page layout is ready
        this.setupMapResizeObserver();

        setTimeout(() => {
            this.invalidateMapSize();
        }, 300);

        setTimeout(() => {
            this.invalidateMapSize();
        }, 1000);

        console.log(
            'WORLD MONITOR RADAR: Initialization complete.'
        );
    },


    bindCitySearch() {
        const input = document.getElementById('radar-city-search');
        const searchButton = document.getElementById('radar-city-search-button');
        const results = document.getElementById('radar-city-search-results');
        const citySelect = document.getElementById('global-city-select');

        if (!input || !searchButton || !results) return;

        input.addEventListener('input', () => {
            window.clearTimeout(this.citySearchTimer);
            const query = input.value.trim();

            if (query.length < 2) {
                this.citySearchRequestId += 1;
                this.hideCitySearchResults();
                return;
            }

            this.citySearchTimer = window.setTimeout(
                () => this.searchCities(query),
                350
            );
        });

        searchButton.addEventListener('click', () => {
            window.clearTimeout(this.citySearchTimer);
            this.searchCities(input.value.trim());
        });

        input.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.hideCitySearchResults();
                return;
            }

            if (event.key === 'Enter') {
                event.preventDefault();
                const firstResult = results.querySelector('[data-location-index]');

                if (firstResult && !results.hidden) {
                    firstResult.click();
                } else {
                    this.searchCities(input.value.trim());
                }
            }
        });

        results.addEventListener('click', (event) => {
            const resultButton = event.target.closest('[data-location-index]');
            if (!resultButton) return;

            const location = this.citySearchResults[
                Number(resultButton.dataset.locationIndex)
            ];

            if (location) this.selectRadarCity(location);
        });

        document.addEventListener('click', (event) => {
            if (!event.target.closest('.radar-city-picker')) {
                this.hideCitySearchResults();
            }
        });

        if (citySelect) {
            citySelect.addEventListener('change', (event) => {
                this.loadCityByName(event.target.value);
            });
        }
    },


    async searchCities(query) {
        const input = document.getElementById('radar-city-search');

        if (query.length < 2) {
            this.renderCitySearchMessage('Enter at least 2 characters');
            return;
        }

        const requestId = ++this.citySearchRequestId;
        this.renderCitySearchMessage('Searching locations...');

        try {
            const response = await API.get(
                `/api/weather/locations?q=${encodeURIComponent(query)}`
            );

            if (requestId !== this.citySearchRequestId) return;

            this.citySearchResults = response.data || [];

            if (this.citySearchResults.length === 0) {
                this.renderCitySearchMessage('No matching cities found');
                return;
            }

            this.renderCitySearchResults(this.citySearchResults);
            input?.setAttribute('aria-expanded', 'true');
        } catch (error) {
            if (requestId !== this.citySearchRequestId) return;
            this.renderCitySearchMessage(this.getCitySearchErrorMessage(error));
        }
    },


    getCitySearchErrorMessage(error) {
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


    renderCitySearchResults(locations) {
        const results = document.getElementById('radar-city-search-results');
        if (!results) return;

        results.replaceChildren();
        locations.forEach((location, index) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'radar-city-result';
            button.setAttribute('role', 'option');
            button.dataset.locationIndex = String(index);

            const name = document.createElement('span');
            name.className = 'radar-city-result-name';
            name.textContent = location.name;

            const details = document.createElement('span');
            details.className = 'radar-city-result-meta';
            details.textContent = [
                location.state,
                this.getCountryName(location.country)
            ].filter(Boolean).join(', ');

            button.append(name, details);
            results.append(button);
        });

        results.hidden = false;
        document.getElementById('radar-city-search')?.setAttribute('aria-expanded', 'true');
    },


    renderCitySearchMessage(message) {
        const results = document.getElementById('radar-city-search-results');
        if (!results) return;

        results.replaceChildren();
        const messageElement = document.createElement('div');
        messageElement.className = 'radar-city-search-message';
        messageElement.textContent = message;
        results.append(messageElement);
        results.hidden = false;
        document.getElementById('radar-city-search')?.setAttribute('aria-expanded', 'true');
    },


    hideCitySearchResults() {
        const results = document.getElementById('radar-city-search-results');
        if (results) results.hidden = true;
        document.getElementById('radar-city-search')?.setAttribute('aria-expanded', 'false');
    },


    getCountryName(countryCode) {
        if (!countryCode) return '';

        try {
            return new Intl.DisplayNames([navigator.language || 'en'], {
                type: 'region'
            }).of(countryCode) || countryCode;
        } catch (error) {
            return countryCode;
        }
    },


    formatCityLabel(location) {
        return [
            location.name,
            location.state,
            this.getCountryName(location.country)
        ].filter(Boolean).join(', ');
    },


    async selectRadarCity(location) {
        const requestId = ++this.citySelectionRequestId;
        const selectedLocation = {
            ...location,
            latitude: Number(location.latitude),
            longitude: Number(location.longitude)
        };

        this.applyRadarLocation(selectedLocation);
        this.hideCitySearchResults();
        this.syncSharedCity(selectedLocation);

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
            this.renderCityWeather(response.data, selectedLocation);
        } catch (error) {
            if (requestId !== this.citySelectionRequestId) return;
            this.renderCityWeather(null, selectedLocation);
        }
    },


    async loadCityByName(city) {
        if (!city || !this.map) return;

        const requestId = ++this.citySelectionRequestId;
        this.setCityWeatherLoading(city);

        try {
            const response = await API.get(
                `/api/weather?city=${encodeURIComponent(city)}`
            );

            if (requestId !== this.citySelectionRequestId) return;

            const weather = response.data;
            const location = {
                name: weather.city,
                state: weather.state,
                country: weather.country,
                latitude: weather.latitude,
                longitude: weather.longitude
            };

            this.applyRadarLocation(location);
            this.renderCityWeather(weather, location);
        } catch (error) {
            if (requestId !== this.citySelectionRequestId) return;
            this.renderCityWeather(null, { name: city });
        }
    },


    applyRadarLocation(location) {
        this.selectedLocation = location;

        if (
            this.map &&
            Number.isFinite(location.latitude) &&
            Number.isFinite(location.longitude)
        ) {
            this.map.setView(
                [location.latitude, location.longitude],
                11,
                { animate: true }
            );

            if (this.cityMarker) {
                this.map.removeLayer(this.cityMarker);
            }

            const markerLabel = document.createElement('span');
            markerLabel.textContent = this.formatCityLabel(location);
            this.cityMarker = L.circleMarker(
                [location.latitude, location.longitude],
                {
                    radius: 8,
                    color: '#ffffff',
                    weight: 2,
                    fillColor: '#00d9ff',
                    fillOpacity: 1
                }
            ).addTo(this.map).bindPopup(markerLabel);
        }

        const cityName = this.formatCityLabel(location);
        const selectedCity = document.getElementById('radar-selected-city');
        const searchInput = document.getElementById('radar-city-search');

        if (selectedCity) selectedCity.textContent = cityName;
        if (searchInput) searchInput.value = cityName;

        this.setCityWeatherLoading(cityName);
    },


    setCityWeatherLoading(cityName) {
        const selectedCity = document.getElementById('radar-selected-city');
        const condition = document.getElementById('radar-city-condition');

        if (selectedCity) selectedCity.textContent = cityName;
        if (condition) condition.textContent = 'Loading current conditions';

        ['radar-city-temperature', 'radar-city-rainfall', 'radar-city-humidity']
            .forEach((id) => {
                const element = document.getElementById(id);
                if (element) element.textContent = '--';
            });
    },


    renderCityWeather(weather, location) {
        const cityName = this.formatCityLabel({
            name: weather?.city || location.name,
            state: weather?.state || location.state,
            country: weather?.country || location.country
        });

        const selectedCity = document.getElementById('radar-selected-city');
        const condition = document.getElementById('radar-city-condition');
        if (selectedCity) selectedCity.textContent = cityName;

        if (!weather) {
            if (condition) condition.textContent = 'Current weather unavailable';
            return;
        }

        if (condition) {
            condition.textContent = weather.condition || 'Current conditions available';
        }

        const metrics = {
            'radar-city-temperature': `${Math.round(Number(weather.temperature))}°C`,
            'radar-city-rainfall': `${Number(weather.rainfall_mm || 0).toFixed(1)} mm`,
            'radar-city-humidity': `${Math.round(Number(weather.humidity))}%`
        };

        Object.entries(metrics).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });
    },


    syncSharedCity(location) {
        const cityQuery = [location.name, location.country]
            .filter(Boolean)
            .join(', ');
        const citySelect = document.getElementById('global-city-select');

        if (citySelect) {
            let option = Array.from(citySelect.options).find(
                (item) => item.value === cityQuery
            );

            if (!option) {
                option = new Option(this.formatCityLabel(location), cityQuery);
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


    /* ==========================================================
       FETCH RADAR METADATA
       ========================================================== */

    async fetchRadarData() {

        try {

            if (!window.API) {
                console.warn(
                    'Radar metadata skipped: API object missing.'
                );
                return;
            }

            const res =
                await API.get('/api/weather/radar');

            if (
                res &&
                res.success &&
                res.data
            ) {

                this.radarData = res.data;

                console.log(
                    'Radar metadata loaded:',
                    this.radarData
                );

            } else {

                console.warn(
                    'Radar metadata response was empty.'
                );

            }

        } catch (error) {

            console.warn(
                'Could not fetch radar metadata:',
                error
            );

            /*
             * IMPORTANT:
             * Metadata failure should NOT prevent
             * the actual Leaflet map from loading.
             */

            this.radarData = {
                frames: []
            };
        }
    },


    /* ==========================================================
       MAP INITIALIZATION
       ========================================================== */

    initMap() {

        const mapEl =
            document.getElementById('radar-map');


        /* ------------------------------------------------------
           VALIDATION
           ------------------------------------------------------ */

        if (!mapEl) {

            console.error(
                'Radar map element #radar-map not found.'
            );

            return;
        }


        if (!window.L) {

            console.error(
                'Leaflet library not found.'
            );

            return;
        }


        /* ------------------------------------------------------
           PREVENT DUPLICATE MAP INITIALIZATION
           ------------------------------------------------------ */

        if (this.map) {

            console.warn(
                'Radar map already initialized.'
            );

            return;
        }


        /* ------------------------------------------------------
           CREATE MAP
           ------------------------------------------------------ */

        try {

            this.map = L.map(
                'radar-map',
                {
                    zoomControl: true,

                    attributionControl: true,

                    preferCanvas: true,

                    worldCopyJump: true,

                    minZoom: 2,

                    maxZoom: 18
                }
            );


            /*
             * Start at the default selected city.
             */

            this.map.setView(
                [19.8762, 75.3433],
                11
            );


        } catch (error) {

            console.error(
                'Leaflet map initialization failed:',
                error
            );

            this.map = null;

            return;
        }


          /* ======================================================
              SATELLITE BASEMAP
          ====================================================== */

        this.darkTileLayer =
            L.tileLayer(
                'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                {
                    maxZoom: 18,

                    minZoom: 2,

                    tileSize: 256,

                    updateWhenIdle: false,

                    keepBuffer: 2,

                    attribution:
                        'Tiles &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community'
                }
            );


        /* ------------------------------------------------------
           Add dark base map
        ------------------------------------------------------ */

        this.darkTileLayer.addTo(
            this.map
        );


        /* ======================================================
           SATELLITE BASEMAP
        ====================================================== */

        this.satelliteTileLayer =
            L.tileLayer(
                'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                {
                    maxZoom: 18,

                    minZoom: 2,

                    tileSize: 256,

                    updateWhenIdle: false,

                    keepBuffer: 2,

                    attribution:
                        'Tiles &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community'
                }
            );


        /* ======================================================
           DATA LAYER GROUPS
        ====================================================== */

        this.radarLayerGroup =
            L.layerGroup();


        this.lightningLayerGroup =
            L.layerGroup();


        this.windLayerGroup =
            L.layerGroup();


        /*
         * Add vector groups to map.
         */

        this.radarLayerGroup.addTo(
            this.map
        );


        this.lightningLayerGroup.addTo(
            this.map
        );


        this.windLayerGroup.addTo(
            this.map
        );


        /* ======================================================
           LIVE RADAR
        ====================================================== */

        this.addLiveRadarLayer();


        /* ======================================================
           EXISTING STORM DATA
        ====================================================== */

        this.renderStormCells();

        this.renderLightning();


        /* ======================================================
           MAP EVENTS
        ====================================================== */

        this.map.on(
            'resize',
            () => {
                this.invalidateMapSize();
            }
        );


        this.map.on(
            'zoomend',
            () => {
                console.log(
                    'Radar map zoom:',
                    this.map.getZoom()
                );
            }
        );


        /* ======================================================
           TILE ERROR MONITORING
        ====================================================== */

        this.darkTileLayer.on(
            'tileerror',
            (event) => {

                console.warn(
                    'Base map tile failed:',
                    event?.tile?.src || event
                );

            }
        );


        this.satelliteTileLayer.on(
            'tileerror',
            (event) => {

                console.warn(
                    'Satellite tile failed:',
                    event?.tile?.src || event
                );

            }
        );


        console.log(
            'Radar map initialized successfully.'
        );
    },


    /* ==========================================================
       MAP SIZE FIX
       ========================================================== */

    invalidateMapSize() {

        if (!this.map) {
            return;
        }

        try {

            this.map.invalidateSize({
                animate: false,
                pan: false
            });

        } catch (error) {

            console.warn(
                'Could not invalidate radar map size:',
                error
            );
        }
    },


    /* ==========================================================
       RESIZE OBSERVER
       ========================================================== */

    setupMapResizeObserver() {

        const mapEl =
            document.getElementById('radar-map');


        if (!mapEl) {
            return;
        }


        /*
         * ResizeObserver prevents the common Leaflet issue
         * where only part of the map tiles appear.
         */

        if (
            typeof ResizeObserver !==
            'undefined'
        ) {

            this.mapResizeObserver =
                new ResizeObserver(() => {

                    this.invalidateMapSize();

                });


            this.mapResizeObserver.observe(
                mapEl
            );
        }
    },


    /* ==========================================================
    LIVE RAINVIEWER RADAR
       ========================================================== */

    addLiveRadarLayer() {

        if (!this.map) {

            console.warn(
                'Cannot add live radar: map not initialized.'
            );

            return;
        }


        /* ------------------------------------------------------
           REMOVE OLD RADAR
        ------------------------------------------------------ */

        if (this.liveRadarLayer) {

            try {

                this.map.removeLayer(
                    this.liveRadarLayer
                );

            } catch (error) {

                console.warn(
                    'Could not remove old radar layer:',
                    error
                );
            }

            this.liveRadarLayer = null;
        }


        /* ======================================================
           LIVE RADAR TILE URL
           ======================================================

           Browser
                ↓
           /api/radar/tile/{z}/{x}/{y}
                ↓
           Node / Express backend
                ↓
           RainViewer
        ====================================================== */

        this.liveRadarLayer =
            L.tileLayer(
                '/api/weather/radar/tile/{z}/{x}/{y}',
                {

                    opacity: 0.68,

                    minZoom: 2,

                    maxZoom: 12,

                    maxNativeZoom: 7,

                    tileSize: 256,

                    zIndex: 500,

                    updateWhenIdle: false,

                    updateWhenZooming: false,

                    keepBuffer: 1,

                    crossOrigin: true,

                    attribution:
                        'Radar data &copy; RainViewer'
                }
            );


        /* ------------------------------------------------------
           Radar tile loaded
        ------------------------------------------------------ */

        this.liveRadarLayer.on(
            'tileload',
            () => {

                this.updateRadarStatus(
                    true
                );

            }
        );


        /* ------------------------------------------------------
           Radar tile failed
        ------------------------------------------------------ */

        this.liveRadarLayer.on(
            'tileerror',
            (event) => {

                console.error(
                    'RainViewer radar tile failed:',
                    event?.tile?.src || event
                );

                this.updateRadarStatus(
                    false
                );

            }
        );


        /* ------------------------------------------------------
           Add radar layer
        ------------------------------------------------------ */

        this.liveRadarLayer.addTo(
            this.map
        );


        console.log(
            'LIVE RADAR: RainViewer precipitation layer enabled.'
        );
    },


    /* ==========================================================
       RADAR STATUS UI
       ========================================================== */

    updateRadarStatus(isOnline) {

        /*
         * Update any existing status elements if they exist.
         * This function does not require special HTML.
         */

        const statusElements =
            document.querySelectorAll(
                '[data-radar-status]'
            );


        statusElements.forEach(
            element => {

                if (isOnline) {

                    element.textContent =
                        'Radar feed available';

                    element.classList.remove(
                        'offline',
                        'error'
                    );

                    element.classList.add(
                        'online'
                    );

                } else {

                    element.textContent =
                        'Radar data unavailable';

                    element.classList.remove(
                        'online'
                    );

                    element.classList.add(
                        'error'
                    );
                }

            }
        );
    },


    /* ==========================================================
       REFRESH LIVE RADAR
       ========================================================== */

    refreshLiveRadar() {

        if (!this.map) {
            return;
        }


        console.log(
            'Refreshing live radar tiles...'
        );


        /*
         * Leaflet tile cache-busting.
         */

        if (this.liveRadarLayer) {

            try {

                this.liveRadarLayer.redraw();

            } catch (error) {

                console.warn(
                    'Radar redraw failed:',
                    error
                );

                this.addLiveRadarLayer();
            }

        } else {

            this.addLiveRadarLayer();
        }
    },


    /* ==========================================================
       AUTOMATIC RADAR REFRESH
       ========================================================== */

    startLiveRadarRefresh() {

        /*
         * Prevent duplicate intervals.
         */

        if (this.radarRefreshInterval) {

            clearInterval(
                this.radarRefreshInterval
            );
        }


        /*
         * Refresh every 10 minutes.
         */

        this.radarRefreshInterval =
            setInterval(
                () => {

                    console.log(
                        'Automatic radar refresh...'
                    );

                    this.refreshLiveRadar();

                },
                10 * 60 * 1000
            );
    },


    /* ==========================================================
       STORM CELLS
       ========================================================== */

    renderStormCells() {

        if (!this.radarLayerGroup) {
            return;
        }


        this.radarLayerGroup.clearLayers();


        if (
            !this.radarData ||
            !Array.isArray(
                this.radarData.stormCells
            )
        ) {

            return;
        }


        const colors = {

            Light:
                '#00F5FF',

            Moderate:
                '#00FFA3',

            Heavy:
                '#FFB020',

            Extreme:
                '#FF3366'

        };


        this.radarData.stormCells.forEach(
            cell => {

                /*
                 * Validate coordinates.
                 */

                const lat =
                    Number(cell.lat);

                const lng =
                    Number(cell.lng);


                if (
                    !Number.isFinite(lat) ||
                    !Number.isFinite(lng)
                ) {

                    return;
                }


                /*
                 * Filter.
                 */

                const intensity =
                    String(
                        cell.intensity ||
                        ''
                    );


                if (
                    this.activeFilter !==
                        'all' &&
                    intensity.toLowerCase() !==
                        this.activeFilter.toLowerCase()
                ) {

                    return;
                }


                const color =
                    colors[intensity] ||
                    '#00D9FF';


                const radius =
                    Number(
                        cell.radius
                    ) || 10000;


                /* ==================================================
                   OUTER STORM CLOUD
                ================================================== */

                const outerCircle =
                    L.circle(
                        [
                            lat,
                            lng
                        ],
                        {

                            color:

                                color,

                            fillColor:

                                color,

                            fillOpacity:
                                0.20,

                            weight:
                                2,

                            radius:
                                radius
                        }
                    );


                outerCircle
                    .addTo(
                        this.radarLayerGroup
                    );


                /* ==================================================
                   POPUP
                ================================================== */

                outerCircle.bindPopup(
                    this.createStormPopup(
                        cell,
                        color
                    )
                );


                /* ==================================================
                   INNER DENSE CORE
                ================================================== */

                L.circle(
                    [
                        lat,
                        lng
                    ],
                    {

                        color:
                            color,

                        fillColor:
                            color,

                        fillOpacity:
                            0.45,

                        weight:
                            1,

                        radius:
                            radius *
                            0.45

                    }
                ).addTo(
                    this.radarLayerGroup
                );

            }
        );
    },


    /* ==========================================================
       STORM POPUP
       ========================================================== */

    createStormPopup(
        cell,
        color
    ) {

        const name =
            this.escapeHtml(
                cell.name ||
                'Storm Cell'
            );


        const intensity =
            this.escapeHtml(
                cell.intensity ||
                'Unknown'
            );


        const dbz =
            this.escapeHtml(
                cell.dbz ??
                'N/A'
            );


        const speed =
            this.escapeHtml(
                cell.speed ??
                'N/A'
            );


        const direction =
            this.escapeHtml(
                cell.direction ||
                'N/A'
            );


        const lightningRate =
            this.escapeHtml(
                cell.lightningRate ??
                'N/A'
            );


        return `
            <div
                style="
                    color:#111;
                    font-family:Arial,sans-serif;
                    min-width:190px;
                "
            >

                <h4
                    style="
                        margin:0 0 8px;
                        color:${color};
                    "
                >
                    ${name}
                </h4>

                <p style="margin:4px 0;">
                    <b>Intensity:</b>
                    ${intensity}
                    (${dbz} dBZ)
                </p>

                <p style="margin:4px 0;">
                    <b>Speed:</b>
                    ${speed}
                    (${direction})
                </p>

                <p style="margin:4px 0;">
                    <b>Lightning Rate:</b>
                    ${lightningRate}
                </p>

            </div>
        `;
    },


    /* ==========================================================
       LIGHTNING
       ========================================================== */

    renderLightning() {

        if (!this.lightningLayerGroup) {
            return;
        }


        this.lightningLayerGroup.clearLayers();


        if (
            !this.radarData ||
            !Array.isArray(
                this.radarData.lightningStrikes
            )
        ) {

            return;
        }


        this.radarData.lightningStrikes.forEach(
            strike => {

                const lat =
                    Number(strike.lat);

                const lng =
                    Number(strike.lng);


                if (
                    !Number.isFinite(lat) ||
                    !Number.isFinite(lng)
                ) {

                    return;
                }


                const strikeIcon =
                    L.divIcon({

                        className:
                            'lightning-marker',

                        html: `
                            <div
                                style="
                                    color:#FFE600;
                                    font-size:22px;
                                    line-height:20px;
                                    filter:
                                        drop-shadow(
                                            0 0 8px #FFE600
                                        );
                                "
                            >
                                ⚡
                            </div>
                        `,

                        iconSize:
                            [20, 20],

                        iconAnchor:
                            [10, 10]

                    });


                const marker =
                    L.marker(
                        [
                            lat,
                            lng
                        ],
                        {
                            icon:
                                strikeIcon
                        }
                    );


                marker
                    .addTo(
                        this.lightningLayerGroup
                    );


                const ageSec =
                    this.escapeHtml(
                        strike.ageSec ??
                        'N/A'
                    );


                const polarity =
                    this.escapeHtml(
                        strike.polarity ||
                        'Unknown'
                    );


                marker.bindPopup(
                    `
                        <div
                            style="
                                color:#111;
                                font-family:Arial,sans-serif;
                            "
                        >

                            <b>
                                Lightning Strike Detected
                            </b>

                            <br><br>

                            <b>Age:</b>
                            ${ageSec}s ago

                            <br>

                            <b>Polarity:</b>
                            ${polarity}

                        </div>
                    `
                );

            }
        );
    },


    /* ==========================================================
       HTML ESCAPE
       ========================================================== */

    escapeHtml(value) {

        return String(value)
            .replace(
                /&/g,
                '&amp;'
            )
            .replace(
                /</g,
                '&lt;'
            )
            .replace(
                />/g,
                '&gt;'
            )
            .replace(
                /"/g,
                '&quot;'
            )
            .replace(
                /'/g,
                '&#039;'
            );
    },


    /* ==========================================================
       CONTROLS
       ========================================================== */

    bindControls() {


        /* ======================================================
           RADAR / SATELLITE
        ====================================================== */

        const radarTab =
            document.getElementById(
                'tab-mode-radar'
            );


        const satelliteTab =
            document.getElementById(
                'tab-mode-satellite'
            );


        if (
            radarTab &&
            satelliteTab
        ) {

            radarTab.addEventListener(
                'click',
                () => {

                    radarTab.classList.add(
                        'active'
                    );


                    satelliteTab.classList.remove(
                        'active'
                    );


                    this.setMode(
                        'radar'
                    );

                }
            );


            satelliteTab.addEventListener(
                'click',
                () => {

                    satelliteTab.classList.add(
                        'active'
                    );


                    radarTab.classList.remove(
                        'active'
                    );


                    this.setMode(
                        'satellite'
                    );

                }
            );
        }


        /* ======================================================
           INTENSITY FILTERS
        ====================================================== */

        const filterBtns =
            document.querySelectorAll(
                '.radar-filter-btn'
            );


        filterBtns.forEach(
            btn => {

                btn.addEventListener(
                    'click',
                    () => {

                        filterBtns.forEach(
                            b => {

                                b.classList.remove(
                                    'active'
                                );

                            }
                        );


                        btn.classList.add(
                            'active'
                        );


                        this.activeFilter =
                            btn.dataset.filter ||
                            'all';


                        this.renderStormCells();

                    }
                );

            }
        );


        /* ======================================================
           PLAY / PAUSE
        ====================================================== */

        const playPauseBtn =
            document.getElementById(
                'radar-play-btn'
            );


        if (playPauseBtn) {

            playPauseBtn.addEventListener(
                'click',
                () => {

                    this.isPlaying =
                        !this.isPlaying;


                    if (
                        this.isPlaying
                    ) {

                        playPauseBtn.innerHTML =
                            `
                                <i
                                    data-lucide="pause"
                                ></i>
                                Pause
                            `;

                    } else {

                        playPauseBtn.innerHTML =
                            `
                                <i
                                    data-lucide="play"
                                ></i>
                                Play
                            `;
                    }


                    if (
                        window.lucide
                    ) {

                        window.lucide.createIcons();

                    }

                }
            );
        }


        /* ======================================================
           TIME SLIDER
        ====================================================== */

        const timeSlider =
            document.getElementById(
                'radar-time-slider'
            );


        if (timeSlider) {

            /*
             * Make sure slider has a valid range.
             */

            if (
                !timeSlider.max ||
                Number(timeSlider.max) < 1
            ) {

                timeSlider.max =
                    this.getFrameCount() - 1;

            }


            if (
                !timeSlider.value
            ) {

                timeSlider.value =
                    this.currentFrameIndex;

            }


            timeSlider.addEventListener(
                'input',
                event => {

                    const value =
                        parseInt(
                            event.target.value,
                            10
                        );


                    if (
                        Number.isFinite(value)
                    ) {

                        this.currentFrameIndex =
                            value;

                        this.updateTimeLabel();

                    }

                }
            );
        }


        /*
         * Update initial timeline label.
         */

        this.updateTimeLabel();
    },


    /* ==========================================================
       GET FRAME COUNT
       ========================================================== */

    getFrameCount() {

        if (
            this.radarData &&
            Array.isArray(
                this.radarData.frames
            ) &&
            this.radarData.frames.length
        ) {

            return this.radarData.frames.length;
        }


        return 5;
    },


    /* ==========================================================
       RADAR / SATELLITE MODE
       ========================================================== */

    setMode(mode) {

        this.currentMode =
            mode;


        if (!this.map) {
            return;
        }


        /* ======================================================
           SATELLITE MODE
        ====================================================== */

        if (
            mode === 'satellite'
        ) {

            /*
             * Remove dark basemap.
             */

            if (
                this.darkTileLayer &&
                this.map.hasLayer(
                    this.darkTileLayer
                )
            ) {

                this.map.removeLayer(
                    this.darkTileLayer
                );
            }


            /*
             * Add satellite.
             */

            if (
                this.satelliteTileLayer &&
                !this.map.hasLayer(
                    this.satelliteTileLayer
                )
            ) {

                this.satelliteTileLayer.addTo(
                    this.map
                );
            }


            /*
             * Keep live radar over satellite.
             */

            if (
                this.liveRadarLayer &&
                !this.map.hasLayer(
                    this.liveRadarLayer
                )
            ) {

                this.liveRadarLayer.addTo(
                    this.map
                );
            }


            console.log(
                'Radar mode: SATELLITE'
            );


        } else {


            /* ==================================================
               RADAR / DARK MODE
            ================================================== */

            if (
                this.satelliteTileLayer &&
                this.map.hasLayer(
                    this.satelliteTileLayer
                )
            ) {

                this.map.removeLayer(
                    this.satelliteTileLayer
                );
            }


            if (
                this.darkTileLayer &&
                !this.map.hasLayer(
                    this.darkTileLayer
                )
            ) {

                this.darkTileLayer.addTo(
                    this.map
                );
            }


            /*
             * Make sure radar remains visible.
             */

            if (
                this.liveRadarLayer &&
                !this.map.hasLayer(
                    this.liveRadarLayer
                )
            ) {

                this.liveRadarLayer.addTo(
                    this.map
                );
            }


            console.log(
                'Radar mode: DARK RADAR'
            );
        }


        /*
         * Leaflet sometimes needs a resize
         * after switching layers.
         */

        setTimeout(
            () => {

                this.invalidateMapSize();

            },
            150
        );
    },


    /* ==========================================================
       TIME LABEL
       ========================================================== */

    updateTimeLabel() {

        const label =
            document.getElementById(
                'radar-frame-label'
            );


        if (!label) {
            return;
        }


        /*
         * If backend supplied frames,
         * use them.
         */

        if (
            this.radarData &&
            Array.isArray(
                this.radarData.frames
            ) &&
            this.radarData.frames.length
        ) {

            const index =
                Math.max(
                    0,
                    Math.min(
                        this.currentFrameIndex,
                        this.radarData.frames.length - 1
                    )
                );


            const frame =
                this.radarData.frames[
                    index
                ];


            if (frame) {

                const time =
                    frame.time ||
                    'Live';


                const frameLabel =
                    frame.label ||
                    '';


                label.textContent =
                    `${time}${
                        frameLabel
                            ? ` (${frameLabel})`
                            : ''
                    }`;

                return;
            }
        }


        /*
         * Fallback label.
         */

        label.textContent =
            'Live Radar';
    },


    /* ==========================================================
       TIMELINE ANIMATION
       ========================================================== */

    startAnimationLoop() {

        /*
         * Stop previous interval.
         */

        if (
            this.playbackInterval
        ) {

            clearInterval(
                this.playbackInterval
            );
        }


        /*
         * Run every 1800ms.
         */

        this.playbackInterval =
            setInterval(
                () => {

                    if (
                        !this.isPlaying
                    ) {

                        return;
                    }


                    const frameCount =
                        this.getFrameCount();


                    if (
                        frameCount <= 0
                    ) {

                        return;
                    }


                    this.currentFrameIndex =
                        (
                            this.currentFrameIndex + 1
                        ) %
                        frameCount;


                    const slider =
                        document.getElementById(
                            'radar-time-slider'
                        );


                    if (slider) {

                        slider.max =
                            frameCount - 1;


                        slider.value =
                            this.currentFrameIndex;
                    }


                    this.updateTimeLabel();

                },
                1800
            );
    },


    /* ==========================================================
       CLEANUP
       ========================================================== */

    destroy() {

        /*
         * Stop timeline.
         */

        if (
            this.playbackInterval
        ) {

            clearInterval(
                this.playbackInterval
            );

            this.playbackInterval =
                null;
        }


        /*
         * Stop radar refresh.
         */

        if (
            this.radarRefreshInterval
        ) {

            clearInterval(
                this.radarRefreshInterval
            );

            this.radarRefreshInterval =
                null;
        }


        /*
         * Stop ResizeObserver.
         */

        if (
            this.mapResizeObserver
        ) {

            this.mapResizeObserver.disconnect();

            this.mapResizeObserver =
                null;
        }


        /*
         * Remove map.
         */

        if (this.map) {

            try {

                this.map.remove();

            } catch (error) {

                console.warn(
                    'Radar map cleanup failed:',
                    error
                );
            }

            this.map =
                null;
        }


        this.liveRadarLayer =
            null;

        this.darkTileLayer =
            null;

        this.satelliteTileLayer =
            null;

        this.radarLayerGroup =
            null;

        this.lightningLayerGroup =
            null;

        this.windLayerGroup =
            null;
    }
};


/* ============================================================
   PAGE CLEANUP
   ============================================================ */

window.addEventListener(
    'beforeunload',
    () => {

        RadarApp.destroy();

    }
);


/* ============================================================
   GLOBAL ACCESS
   ============================================================ */

window.RadarApp =
    RadarApp;