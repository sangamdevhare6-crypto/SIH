# 🌐 WORLD MONITOR
> **"Real-time • Safe • Together"**
>
> *Next-Generation Full-Stack Real-Time Disaster Intelligence Command Center & Early Warning Platform*

---

## 🛰️ 1. Project Overview

**WORLD MONITOR** is an enterprise-grade disaster management, meteorological tracking, and civil protection command center web application. Engineered with a futuristic command-center UI aesthetic (deep navy `#020817`, cyber cyan `#00D9FF`, safety green `#00FFA3`, and warning crimson `#FF3366`), it delivers real-time situational awareness, flood inundation modeling, early warning sirens, and participatory citizen reporting.

The system supports **Two Distinct User Roles**:
1. **CITIZEN**: Accesses real-time weather KPIs, track threat levels in their area, receives early warning sirens, computes elevated safe evacuation routes, and submits geo-tagged incident reports with photo uploads.
2. **AUTHORITY**: Civil protection officers and SDMA commanders monitor high-risk zones, track river basin water discharge (Godavari, Krishna, Narmada, Brahmaputra), inspect critical infrastructure sensors (Jayakwadi & Khadakwasla dams), broadcast emergency public alerts, and dispatch emergency response teams to citizen incidents.

---

## ⚡ 2. Core Features & Architecture

- **Real-Time Command Dashboard**: Live weather KPIs (Rainfall: 120 mm, Temperature: 25°C, Humidity: 92%, Wind: 35 km/h, Barometric Pressure: 995 hPa), active regional warnings, high-risk inundation corridors, and civil protection meters.
- **Live Doppler Radar & Satellite View**: Interactive multi-layer Leaflet map with 3.2 GHz S-Band Doppler radar simulation, 4-tier precipitation intensity filtering (*Light, Moderate, Heavy, Extreme*), lightning strike sensors, and animated timeline playback slider.
- **Short-Term Nowcast Predictions**: 5-hour immediate hourly forecast sequence (*Now, 3 PM, 4 PM, 5 PM, 6 PM*), Chart.js predictive precipitation rate curves, and convective risk assessment scoring.
- **Interactive River Basin Flood Map**: Hydrological sensor tracking across major river basins (*Godavari, Brahmaputra, Narmada, Krishna*), dynamic danger thresholds, discharge rates, flood plain polygons, and designated emergency shelter havens.
- **AI-Guided Safe Evacuation Routing**: Dynamic routing algorithm that computes hazard-free elevation paths avoiding submerged roads, collapsed underpasses, and saturated flood polygons.
- **Critical Infrastructure Health Matrix**: Sensor monitoring for dams, bridges, roads, and emergency hospitals with hydraulic inflow/outflow charts, pore pressure transducers, and certified safety review dossiers.
- **Participatory Citizen Incident Reporting**: Fast ground incident logging (*Flood, Road Block, Water Level, Landslide, Heavy Rain, Other*) with client-side photo previews, urgency flags, and authoritative status tracking (*Pending ➔ In Progress ➔ Resolved*).
- **Automated Analytics & Report Dossiers**: Instant compilation and download of CSV/PDF dossiers for meteorological logs, flood hydrology, infrastructure audits, and siren logs.
- **Real-Time Telemetry & Alert Stream**: Native Server-Sent Events (SSE) `/api/realtime/stream` delivering live alerts, citizen reports, and sensor fluctuations without polling.
- **Dual Authentication & Role-Based Access**: Cryptographically hashed passwords with `bcryptjs`, signed JWT tokens, and backend middleware authorization guarding authority actions.

---

## 🛠️ 3. Technology Stack

### Frontend
- **HTML5 & Vanilla CSS3**: 8px spatial grid system, OLED dark command panels, glassmorphism (`backdrop-filter: blur()`), glowing HUD neon borders.
- **Modern JavaScript (ES6+)**: Zero bulky SPA framework overhead — fast, modular, and dependency-light.
- **Leaflet.js + OpenStreetMap / CartoDB Dark Matter**: High-contrast vector maps, animated storm cells, and custom pulsing markers.
- **Chart.js**: Glowing neon cyan & crimson graphs with dual Y-axis scales.
- **Lucide Icons**: Crisp SVG iconography.

### Backend
- **Node.js & Express.js**: REST API architecture with modular routers, controllers, services, and middlewares.
- **Security Protocols**: `helmet` security headers, CORS origin verification, `express-rate-limit` DDoS/brute-force mitigation, and input sanitization.
- **Authentication**: JWT (`jsonwebtoken`) token validation and `bcryptjs` password hashing.
- **Real-Time Engine**: Server-Sent Events (SSE) with persistent client connection pooling and automatic reconnects.

### Database
- **PostgreSQL**: Production-grade relational database schema with tables for `users`, `citizen_profiles`, `authority_profiles`, `alerts`, `citizen_reports`, `infrastructure`, `monitoring_stations`, `weather_data`, `notifications`, `safe_routes`, and `refresh_tokens`.
- **Zero-Config Embedded Fallback Engine**: If PostgreSQL credentials are not yet configured or local database services are inactive, the backend automatically boots into an in-memory/JSON store pre-seeded with identical data so the entire system works instantly with zero setup hurdles.

---

## 📂 4. Project Directory Structure

```
world-monitor/
├── frontend/
│   ├── index.html                  # Landing Hero & Role Selection Modal
│   ├── login.html                  # Citizen & Authority Dual Login Portal
│   ├── signup.html                 # Citizen & Authority Role Registration
│   ├── dashboard.html              # Central Command Center Dashboard
│   ├── radar.html                  # Live Doppler Radar & Satellite View
│   ├── nowcast.html                # 5-Hour Forecast & Precipitation Graph
│   ├── flood-map.html              # Basin Hydrology & Flood Inundation Zones
│   ├── alerts.html                 # Active Alerts & Authority Siren Dispatch
│   ├── safe-routes.html            # Evacuation Corridors & Route Calculator
│   ├── infrastructure.html         # Dams, Bridges, Roads & Hospitals
│   ├── infrastructure-details.html # In-depth Sensor Telemetry & History
│   ├── citizen-reports.html        # Hazard Reporting & Action Tracker
│   ├── reports.html                # Analytics Dossier & CSV Exporter
│   ├── monitoring-stations.html    # Telemetry Rain Gauge Towers
│   ├── weather-data.html           # Full Meteorological Dashboard & 7-Day Forecast
│   ├── settings.html               # Terminal Preferences & Audio Sirens
│   ├── profile.html                # Contact Records & Credential Security
│   │
│   ├── css/
│   │   ├── global.css              # Tokens, Reset, Typography, Buttons & Panels
│   │   ├── dashboard.css           # Sidebar, Topbar, KPI Cards & Tables
│   │   ├── auth.css                # Hero Landing, Role Selection & Forms
│   │   ├── responsive.css          # Mobile Drawer, Breakpoints & Bottom Nav
│   │   └── animations.css          # Radar Sweep, Pulse Beacons & Shimmers
│   │
│   ├── js/
│   │   ├── api.js                  # Centralized REST Client with JWT Header
│   │   ├── auth.js                 # Session Manager & Role Guards
│   │   ├── notifications.js        # SSE Stream Listener & Bell Dropdown
│   │   ├── app.js                  # Global App Shell (Sidebar, Clock, Toasts)
│   │   ├── dashboard.js            # KPI Cards & Mini Map Controller
│   │   ├── radar.js                # Doppler Radar & Timeline Animation
│   │   ├── weather.js              # Nowcast Prediction & 7-Day Forecast
│   │   ├── alerts.js               # Alerts Filter & Emergency Broadcasting
│   │   ├── reports.js              # Incident Submissions & CSV Export
│   │   └── routes.js               # Evacuation Routing & Basin Overlays
│   │
│   └── assets/
│       └── avatars/                # Officer and Citizen profile avatars
│
├── backend/
│   ├── server.js                   # Express App & Static File Server
│   ├── config/
│   │   ├── env.js                  # Environment Variables Loader
│   │   └── db.js                   # PostgreSQL Pool & Embedded ACID Store
│   ├── controllers/
│   │   ├── authController.js       # Login, Signup, Profile, Password Reset
│   │   ├── dashboardController.js  # Weather KPIs & Risk Overview
│   │   ├── weatherController.js    # Open-Meteo Integration & Radar Telemetry
│   │   ├── alertController.js      # Filtered Alerts & Siren Broadcasting
│   │   ├── reportController.js     # Citizen Reports & CSV Generation
│   │   ├── infrastructureController.js # Sensor Readings & Asset Dossiers
│   │   ├── routeController.js      # Safe Route Computation Algorithm
│   │   ├── stationController.js    # Automated Rain Gauge Monitoring
│   │   └── notificationController.js # Bell Alerts & Mark as Read
│   ├── routes/                     # REST API Endpoint Routers
│   ├── middleware/
│   │   ├── authMiddleware.js       # JWT Verification
│   │   ├── roleMiddleware.js       # Role-Based Access Control (RBAC)
│   │   ├── rateLimiter.js          # Rate Limiting
│   │   └── errorHandler.js         # Centralized Error Responses
│   ├── services/
│   │   ├── weatherService.js       # Open-Meteo Live API + Fallbacks
│   │   ├── radarService.js         # Radar Reflectivity & Lightning Strikes
│   │   ├── mapService.js           # Hydrological Basin Geometries
│   │   ├── alertService.js         # Alert Broadcasting Engine
│   │   └── realtimeService.js      # Server-Sent Events (SSE) Stream
│   ├── utils/
│   │   ├── jwt.js                  # Token Sign & Verify
│   │   ├── hash.js                 # bcryptjs Password Security
│   │   └── logger.js               # Colored Terminal Logger
│   └── scripts/
│       ├── seed.js                 # PostgreSQL Seeding Script
│       └── verify-all.js           # Automated E2E Test Suite (29 Tests)
│
├── database/
│   ├── schema.sql                  # PostgreSQL Tables, Foreign Keys, Indexes
│   └── seed.sql                    # Realistic Maharashtra Disaster Data
│
├── .env.example                    # Template Environment File
├── .env                            # Active Local Configuration
├── package.json                    # Backend Dependencies & Scripts
├── .gitignore                      # Git Exclusions
└── README.md                       # Comprehensive Documentation
```

---

## 🚀 5. Installation & Local Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher (Tested on Node v24)
- **npm**: v9.0.0 or higher
- Optional: PostgreSQL (v14+) if using a live database instance.

### 1. Clone & Enter Project Directory
```bash
git clone https://github.com/your-username/world-monitor.git
cd world-monitor
```

### 2. Install Backend Dependencies
```bash
npm install
```

### 3. Environment Configuration
Copy the template environment file:
```bash
cp .env.example .env
```
Use the values in `.env.example` for local development. Production requires explicit database, JWT secret, and CORS origin settings; see [deploy.md](deploy.md).
*(Leave `DATABASE_URL` empty to run in zero-config mode, or provide your Neon/Supabase PostgreSQL connection string).*

### 4. Run the Full-Stack Application
```bash
npm start
```
Terminal output:
```
ℹ️ [DATABASE] Operating with high-performance embedded store. Connect PostgreSQL by configuring DATABASE_URL.
[SUCCESS] 🚀 WORLD MONITOR Command Center live at http://localhost:5000
[INFO]    🌐 Static UI available at: http://localhost:5000/index.html
[INFO]    📡 Real-Time SSE Stream active at: http://localhost:5000/api/realtime/stream
```

### 5. Access the Web Interface
Open your browser and navigate to:
**`http://localhost:5000`**

---

## 🔐 6. Pre-Configured Test Credentials

For quick evaluation, a demo citizen account is available on the login screen. Authority admin credentials are private and managed separately by the system administrator.

| Role | Email Address | Password | Privileges |
| :--- | :--- | :--- | :--- |
| **AUTHORITY** | `admin@worldmonitor.gov.in` | `AdminPassword@123` | Broadcast alerts, update citizen reports, inspect sensors, manage emergency assets |
| **CITIZEN** | `citizen@worldmonitor.org` | `CitizenPassword@123` | Submit incident reports, view own reports, plan safe evacuation routes, receive warnings |
| **AUTHORITY** | `admin@worldmonitor.gov.in` | *(Private — Contact Admin)* | Broadcast alerts, update citizen reports, inspect sensors, manage emergency assets |

> **Note:** Authority account credentials are not publicly documented. Contact the system administrator for access.

---

## 🗄️ 7. Database Setup (PostgreSQL)

If using a live PostgreSQL instance (e.g., Neon, Supabase, Railway, or local Postgres):
1. Create a database:
   ```sql
   CREATE DATABASE world_monitor;
   ```
2. Set `DATABASE_URL` in `.env`:
   ```env
   DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/world_monitor
   ```
3. For a disposable local database only, run the demo seeder. It truncates application tables before inserting demo records; never use it in production.
   ```bash
   npm run seed
   ```
   Or execute directly using `psql`:
   ```bash
   psql -d world_monitor -f database/schema.sql
   psql -d world_monitor -f database/seed.sql
   ```

---

## 🧪 8. Automated End-to-End Testing

A smoke test suite checks API responses, admin user totals/access, city search, location-specific weather, live radar tiles, and role-based authorization:

```bash
npm test
```

Test Results Output:
```
  ✅ PASS: System Health Check Endpoint
  ✅ PASS: Citizen Login with Password Verification
  ✅ PASS: Authority Login with Role Authorization
  ✅ PASS: Admin user list requires authentication
  ✅ PASS: Citizen cannot access admin user list
  ✅ PASS: Additional authority account can be created in development
  ✅ PASS: Only configured admin email can access admin user list
  ✅ PASS: Authority admin dashboard returns account and login counts
  ✅ PASS: New citizen registration succeeds
  ✅ PASS: Registration updates account totals, not login totals
  ✅ PASS: Newly registered citizen can log in
  ✅ PASS: Successful login updates admin login metrics
  ✅ PASS: Dashboard returns live weather KPIs
  ✅ PASS: Live Weather Service & Forecast
  ✅ PASS: Worldwide city search returns Indian locations
  ✅ PASS: Selected city weather uses its exact coordinates
  ✅ PASS: Nowcast Short-Term Prediction Curve & Risk Assessment
  ✅ PASS: Radar metadata endpoint
  ✅ PASS: RainViewer radar tile for Chhatrapati Sambhajinagar
  ✅ PASS: Emergency Alerts Query & Risk Levels
  ✅ PASS: Authority Emergency Alert Broadcasting
  ✅ PASS: Role-Based Access Control: Citizen Forbidden From Broadcasting Authority Alerts
  ✅ PASS: Citizen Incident Report Creation & Validation
  ✅ PASS: Critical Infrastructure (Jayakwadi & Khadakwasla Dams, Bridges, Hospitals)
  ✅ PASS: Telemetry Monitoring Stations (Online/Offline Status)
  ✅ PASS: Safe Evacuation Routes, Risk Polygons & Shelters
  ✅ PASS: Elevation-Safe Route Calculation Algorithm
  ✅ PASS: Real-Time Notifications Feed & Counter
  ✅ PASS: Automated CSV / Dossier Export Download

==================================================
TEST RESULTS: 29 Passed, 0 Failed
==================================================
```

---

## 📡 9. REST API Reference

### Authentication
- `POST /api/auth/register/citizen`: Register a new citizen account.
- `POST /api/auth/register/authority`: Register a new authority officer account.
- `POST /api/auth/login`: Authenticate with email/mobile and password. Returns JWT token.
- `POST /api/auth/logout`: Terminate user session.
- `POST /api/auth/forgot-password`: Send reset challenge.
- `GET /api/auth/profile`: Fetch current user profile with role metadata.
- `PATCH /api/auth/profile`: Update contact information.
- `POST /api/auth/change-password`: Update account password.

### Meteorological & Radar Telemetry
- `GET /api/dashboard?city=...`: Live dashboard KPIs, active warnings count, risk areas, and evacuation metrics.
- `GET /api/weather?city=...`: Live weather observations and 7-day forecast.
- `GET /api/weather/nowcast?city=...`: 5-hour prediction sequence, precipitation graph points, and convective risk score.
- `GET /api/weather/radar`: Doppler radar reflectivity frames, storm cells, and lightning coordinates.

### Alerts & Civil Defense
- `GET /api/alerts`: List alerts with optional filtering (`?risk_level=Very High`).
- `POST /api/alerts`: Broadcast new emergency alert *(Requires AUTHORITY role)*.
- `PATCH /api/alerts/:id`: Resolve or update alert status *(Requires AUTHORITY role)*.

### Field Incident Reports
- `GET /api/reports`: List citizen incident reports (role filtered).
- `POST /api/reports`: Lodge new field hazard report with description & photo URL *(Authenticated)*.
- `PATCH /api/reports/:id`: Update report status (*In Progress / Resolved*) and add dispatch notes *(Requires AUTHORITY role)*.
- `GET /api/reports/analytics`: Fetch analytic report dossiers.
- `GET /api/reports/download/:id`: Download instant CSV report export.

### Maps & Routing
- `GET /api/routes`: Fetch safe routes, shelters, flood risk polygons, and river hydrology.
- `POST /api/routes/find`: Calculate elevation-safe route between origin and shelter avoiding hazard zones.
- `GET /api/routes/flood-map`: River water levels and danger benchmarks.
- `GET /api/infrastructure`: List critical dams, bridges, roads, and hospitals with health ratings.
- `GET /api/infrastructure/:id`: Detailed structural sensor telemetry, inflow/outflow charts, and certified documents.
- `GET /api/monitoring-stations`: Live rain gauge and telemetry tower statuses.

### Real-Time & Notifications
- `GET /api/realtime/stream`: Server-Sent Events (SSE) telemetry stream.
- `GET /api/notifications`: Unread notifications and alerts.
- `PATCH /api/notifications/:id/read`: Mark notification as read.
- `POST /api/notifications/read-all`: Mark all notifications as read.

---

## ☁️ 10. Production Deployment Guide

Use [deploy.md](deploy.md) for the required deployment steps and environment variables. The recommended setup deploys frontend and backend together as one Node.js service. The notes below are abbreviated examples only.

### Single-service examples (Render / Railway / Fly.io)
Because the Express backend serves the static frontend directly from `frontend/`, the entire application can be deployed as a single production service!

#### Deploying on Render:
1. Push repository to GitHub.
2. Go to [Render Dashboard](https://dashboard.render.com/) and create a **Web Service**.
3. Connect your GitHub repository.
4. Set configurations:
   - **Root Directory**: `world-monitor`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Add Environment Variables:
   - `PORT`: `10000`
   - `NODE_ENV`: `production`
   - `JWT_SECRET`: *(Generate a secure 64-character random string)*
   - `DATABASE_URL`: *(Your Neon or Supabase PostgreSQL connection string)*
6. Click **Deploy**. Your command center will be live on HTTPS with real-time SSE stream!

#### Deploying on Railway:
1. Go to [Railway](https://railway.app/) and create **New Project**.
2. Select **Deploy from GitHub repo**.
3. Add a PostgreSQL database in Railway and link the `DATABASE_URL` variable.
4. Set start command to `npm start`.

---

### Optional separate frontend hosting (not recommended for the initial deployment)
1. Deploy the backend to Render/Fly.io.
2. In `frontend/js/api.js`, update `const API_BASE = 'https://your-backend.onrender.com';`.
3. In `frontend/js/notifications.js`, update `new EventSource('https://your-backend.onrender.com/api/realtime/stream');`.
4. Deploy the `frontend/` directory to Vercel or Netlify.
5. In your backend `.env`, set `CORS_ORIGIN=https://your-frontend.vercel.app`.

---

## 🛠️ 11. Troubleshooting

1. **Port Already in Use**:
   If port 5000 is occupied, set `PORT=5050` in `.env` or run:
   ```bash
   PORT=5050 npm start
   ```

2. **Database Connection Notice**:
   If you see:
   `ℹ️ [DATABASE] Operating with high-performance embedded store.`
   The application is running in zero-config mode. All features (login, reporting, alerts, routing) work completely. To switch to PostgreSQL, set `DATABASE_URL=postgresql://...` in `.env`.

3. **Live Weather Falling Back to Simulated Telemetry**:
   If the server is offline or Open-Meteo is temporarily unreachable, the system automatically falls back to regional radar telemetry for Chhatrapati Sambhajinagar with exact baseline values (Rainfall: 120 mm, Temperature: 25°C).

---

## 📜 12. License & Attribution

Designed and engineered for emergency disaster response and resilient community safety.
**WORLD MONITOR — Real-time • Safe • Together**
Licensed under the MIT License.
