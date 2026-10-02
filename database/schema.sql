-- ============================================================
-- WORLD MONITOR DATABASE SCHEMA (PostgreSQL)
-- Tagline: "Real-time • Safe • Together"
-- ============================================================

-- Create Extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(30),
    role VARCHAR(20) NOT NULL CHECK (role IN ('CITIZEN', 'AUTHORITY')),
    avatar_url TEXT DEFAULT '/assets/avatars/default.png',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Citizen Profiles
CREATE TABLE IF NOT EXISTS user_login_events (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    logged_in_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_login_events_user_time
    ON user_login_events(user_id, logged_in_at DESC);

CREATE TABLE IF NOT EXISTS citizen_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    emergency_contact VARCHAR(30),
    blood_group VARCHAR(10),
    address TEXT,
    city VARCHAR(100) DEFAULT 'Chhatrapati Sambhajinagar',
    state VARCHAR(100) DEFAULT 'Maharashtra',
    pincode VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Authority Profiles
CREATE TABLE IF NOT EXISTS authority_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    department VARCHAR(150) NOT NULL,
    designation VARCHAR(150) NOT NULL,
    official_id VARCHAR(100),
    jurisdiction VARCHAR(150) DEFAULT 'Maharashtra Division',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Alerts Table
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('Heavy Rainfall', 'Flash Flood', 'River Level', 'Landslide', 'Weather Alert')),
    risk_level VARCHAR(30) NOT NULL CHECK (risk_level IN ('Very High', 'High', 'Moderate', 'Low')),
    location VARCHAR(200) NOT NULL,
    latitude DECIMAL(10, 6),
    longitude DECIMAL(10, 6),
    description TEXT,
    affected_population VARCHAR(100),
    status VARCHAR(30) DEFAULT 'Active' CHECK (status IN ('Active', 'Monitoring', 'Resolved')),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Citizen Reports Table
CREATE TABLE IF NOT EXISTS citizen_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_name VARCHAR(150),
    report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('Flood', 'Road Block', 'Water Level', 'Landslide', 'Heavy Rain', 'Other')),
    location VARCHAR(200) NOT NULL,
    latitude DECIMAL(10, 6),
    longitude DECIMAL(10, 6),
    description TEXT NOT NULL,
    photo_url TEXT,
    priority VARCHAR(30) DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
    status VARCHAR(30) DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Resolved', 'Dismissed')),
    authority_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Infrastructure Table
CREATE TABLE IF NOT EXISTS infrastructure (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('Bridge', 'Dam', 'Road', 'Hospital')),
    location VARCHAR(200) NOT NULL,
    status VARCHAR(30) DEFAULT 'Normal' CHECK (status IN ('Normal', 'Warning', 'At Risk')),
    current_level DECIMAL(10, 2),
    max_level DECIMAL(10, 2),
    unit VARCHAR(20) DEFAULT 'm',
    health_score INT DEFAULT 100,
    sensor_health VARCHAR(50) DEFAULT 'Optimal (100%)',
    last_inspected TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    latitude DECIMAL(10, 6),
    longitude DECIMAL(10, 6),
    sensors_json JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Monitoring Stations Table
CREATE TABLE IF NOT EXISTS monitoring_stations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    station_id VARCHAR(50) UNIQUE NOT NULL,
    station_name VARCHAR(150) NOT NULL,
    location VARCHAR(200) NOT NULL,
    rainfall_mm DECIMAL(10, 2) DEFAULT 0.0,
    water_level_m DECIMAL(10, 2) DEFAULT 0.0,
    battery_pct INT DEFAULT 100,
    status VARCHAR(30) DEFAULT 'Online' CHECK (status IN ('Online', 'Offline')),
    last_ping TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    latitude DECIMAL(10, 6),
    longitude DECIMAL(10, 6)
);

-- 8. Weather Data Table
CREATE TABLE IF NOT EXISTS weather_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    city VARCHAR(100) NOT NULL,
    temperature DECIMAL(5, 2) NOT NULL,
    humidity INT NOT NULL,
    rainfall_mm DECIMAL(10, 2) NOT NULL,
    wind_speed DECIMAL(5, 2) NOT NULL,
    wind_direction VARCHAR(10) DEFAULT 'NW',
    pressure DECIMAL(7, 2) NOT NULL,
    visibility DECIMAL(5, 2) DEFAULT 10.0,
    uv_index INT DEFAULT 5,
    air_quality VARCHAR(50) DEFAULT 'Good (AQI 42)',
    condition VARCHAR(100) NOT NULL,
    forecast_json JSONB DEFAULT '[]',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_target VARCHAR(20) DEFAULT 'ALL' CHECK (role_target IN ('ALL', 'CITIZEN', 'AUTHORITY')),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    risk_level VARCHAR(30) DEFAULT 'Moderate',
    is_read BOOLEAN DEFAULT FALSE,
    link VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Safe Routes Table
CREATE TABLE IF NOT EXISTS safe_routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    origin VARCHAR(150) NOT NULL,
    destination VARCHAR(150) NOT NULL,
    safe_status VARCHAR(30) DEFAULT 'Clear' CHECK (safe_status IN ('Clear', 'Advisory', 'Blocked')),
    distance_km DECIMAL(6, 2) NOT NULL,
    estimated_time_mins INT NOT NULL,
    checkpoints_json JSONB DEFAULT '[]',
    shelters_json JSONB DEFAULT '[]',
    polyline_json JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Refresh Tokens & Sessions
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for lightning fast lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_alerts_risk ON alerts(risk_level, status);
CREATE INDEX IF NOT EXISTS idx_reports_user ON citizen_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON citizen_reports(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_infra_status ON infrastructure(status);
