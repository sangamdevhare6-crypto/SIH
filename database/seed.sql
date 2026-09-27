-- ============================================================
-- WORLD MONITOR DATABASE SEED DATA
-- Chhatrapati Sambhajinagar, Pune, Nashik, Nagpur & Maharashtra
-- ============================================================

-- Clean old data if recreating
TRUNCATE TABLE users, citizen_profiles, authority_profiles, alerts, citizen_reports, infrastructure, monitoring_stations, weather_data, notifications, safe_routes CASCADE;

-- 1. Insert Initial Users
INSERT INTO users (id, email, password_hash, full_name, phone, role, avatar_url) VALUES
('a0000000-0000-0000-0000-000000000001', 'admin@worldmonitor.gov.in', '$2a$10$tSK3RjZ2iK8IEp7/Me96c.zRiS.OKjNCDQ.ce/fNGzdR9TNSgsYP2', 'Commander Rajesh Deshmukh', '+91 98220 11223', 'AUTHORITY', '/assets/avatars/officer.png'),
('c0000000-0000-0000-0000-000000000001', 'citizen@worldmonitor.org', '$2a$10$QdFJxr7eXJbEXTZPkDlGJOSLtqyY1Z2TIcIJYEWju4ESuuwL7JXLi', 'Pooja Kulkarni', '+91 94220 44556', 'CITIZEN', '/assets/avatars/citizen.png');

-- 2. Authority Profile
INSERT INTO authority_profiles (id, user_id, department, designation, official_id, jurisdiction) VALUES
('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'State Disaster Management Authority (SDMA)', 'Chief Emergency Response Officer', 'SDMA-MH-7049', 'Chhatrapati Sambhajinagar & Marathwada');

-- 3. Citizen Profile
INSERT INTO citizen_profiles (id, user_id, emergency_contact, blood_group, address, city, state, pincode) VALUES
('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', '+91 98221 99887', 'O+', 'Flat 402, Shivajinagar Heights, Cidco N-4', 'Chhatrapati Sambhajinagar', 'Maharashtra', '431003');

-- 4. Weather Data (Chhatrapati Sambhajinagar + Nearby Cities)
INSERT INTO weather_data (id, city, temperature, humidity, rainfall_mm, wind_speed, wind_direction, pressure, visibility, uv_index, air_quality, condition, forecast_json) VALUES
('e0000000-0000-0000-0000-000000000001', 'Chhatrapati Sambhajinagar', 25.0, 92, 120.0, 35.0, 'NW', 995.0, 4.2, 3, 'Moderate (AQI 65)', 'Heavy Monsoon Downpour', '[
  {"time": "Now", "temp": 25, "rainProb": 95, "condition": "Heavy Rain", "humidity": 92},
  {"time": "3 PM", "temp": 24, "rainProb": 88, "condition": "Moderate Rain", "humidity": 94},
  {"time": "4 PM", "temp": 24, "rainProb": 80, "condition": "Rain Showers", "humidity": 93},
  {"time": "5 PM", "temp": 23, "rainProb": 75, "condition": "Thunderstorm", "humidity": 95},
  {"time": "6 PM", "temp": 23, "rainProb": 60, "condition": "Light Rain", "humidity": 91}
]'),
('e0000000-0000-0000-0000-000000000002', 'Pune', 23.5, 88, 94.0, 28.0, 'W', 998.0, 5.0, 4, 'Good (AQI 45)', 'Persistent Rainfall', '[]'),
('e0000000-0000-0000-0000-000000000003', 'Nashik', 22.0, 94, 142.0, 32.0, 'WSW', 993.0, 3.5, 2, 'Good (AQI 38)', 'Torrential Rain Alert', '[]'),
('e0000000-0000-0000-0000-000000000004', 'Nagpur', 28.0, 78, 45.0, 18.0, 'SW', 1002.0, 7.0, 5, 'Moderate (AQI 72)', 'Cloudy with Thunder', '[]');

-- 5. Active Alerts
INSERT INTO alerts (id, title, type, risk_level, location, latitude, longitude, description, affected_population, status, created_by) VALUES
('f0000000-0000-0000-0000-000000000001', 'Flash Flood Red Warning - Kham River Catchment', 'Flash Flood', 'Very High', 'Kham River Basin, Chhatrapati Sambhajinagar', 19.876165, 75.343314, 'Rapid water level rise due to 120mm cloudburst in catchment area. Low-lying areas in Begumpura and Cidco Sector 3 are at immediate risk of inundation.', '~45,000 citizens', 'Active', 'a0000000-0000-0000-0000-000000000001'),
('f0000000-0000-0000-0000-000000000002', 'Extreme Precipitation Downpour Alert', 'Heavy Rainfall', 'High', 'Marathwada Central Zone & Paithan Belt', 19.479532, 75.385551, 'Continuous heavy rainfall expected for next 18 hours. Wind gusts up to 45 km/h. Saturated soil conditions increase run-off danger.', '~120,000 citizens', 'Active', 'a0000000-0000-0000-0000-000000000001'),
('f0000000-0000-0000-0000-000000000003', 'Godavari River Basin Surge Level 2', 'River Level', 'High', 'Godavari River Corridor, Paithan & Gangapur', 19.531234, 75.228945, 'Upstream discharge from Darna and Gangapur dams has raised Godavari water level by 3.8 meters above danger threshold.', '~60,000 citizens', 'Active', 'a0000000-0000-0000-0000-000000000001'),
('f0000000-0000-0000-0000-000000000004', 'Landslide Warning - Daulatabad Ghat Sector', 'Landslide', 'Moderate', 'Daulatabad - Khuldabad Hill Section', 20.005882, 75.210419, 'Steep slopes destabilized due to prolonged saturation. Heavy vehicular movement prohibited on Ghat road.', '~8,500 commuters', 'Monitoring', 'a0000000-0000-0000-0000-000000000001'),
('f0000000-0000-0000-0000-000000000005', 'Severe Lightning & Thunderstorm Warning', 'Weather Alert', 'Moderate', 'Aurangabad Industrial Belt & Waluj MIDC', 19.832941, 75.241089, 'Intense convective cell detected on Doppler radar moving east at 22 km/h. High frequency cloud-to-ground lightning.', '~35,000 workers', 'Active', 'a0000000-0000-0000-0000-000000000001');

-- 6. Infrastructure Assets
INSERT INTO infrastructure (id, name, type, location, status, current_level, max_level, unit, health_score, sensor_health, last_inspected, latitude, longitude, sensors_json) VALUES
('10000000-0000-0000-0000-000000000001', 'Jayakwadi Dam (Nath Sagar)', 'Dam', 'Paithan, Chhatrapati Sambhajinagar', 'Warning', 463.80, 464.00, 'm MSL', 84, 'Live (18 Sensors Active)', CURRENT_TIMESTAMP, 19.493400, 75.378900, '[
  {"name": "Spillway Gate 1-18", "val": "14 Gates Open (3ft)", "status": "Normal"},
  {"name": "Reservoir Water Level", "val": "463.80 m / 464.00 m (96.4%)", "status": "Warning"},
  {"name": "Inflow Discharge", "val": "48,500 cusecs", "status": "High"},
  {"name": "Pore Pressure Transducer", "val": "0.32 MPa", "status": "Normal"},
  {"name": "Seepage Flow Sensor", "val": "18.2 L/min", "status": "Normal"}
]'),
('10000000-0000-0000-0000-000000000002', 'Khadakwasla Dam', 'Dam', 'Pune Outskirts, Maharashtra', 'At Risk', 582.40, 582.50, 'm MSL', 76, 'Live (24 Sensors Active)', CURRENT_TIMESTAMP, 18.428700, 73.766700, '[
  {"name": "Spillway Discharge", "val": "34,200 cusecs", "status": "Critical"},
  {"name": "Storage Capacity", "val": "98.9% Full", "status": "At Risk"},
  {"name": "Structural Strain Meter", "val": "Normal (0.01%)", "status": "Normal"}
]'),
('10000000-0000-0000-0000-000000000003', 'Godavari Old River Bridge', 'Bridge', 'Gangapur Road, Nashik / CS Highway', 'Warning', 14.8, 16.0, 'm Clearance', 82, 'Vibration Sensors Active', CURRENT_TIMESTAMP, 19.997500, 75.321400, '[
  {"name": "Pier Scour Gauge", "val": "Stable (-0.4m)", "status": "Normal"},
  {"name": "Clearance from Crest", "val": "1.2m remaining", "status": "Warning"}
]'),
('10000000-0000-0000-0000-000000000004', 'Kham River Causeway Bypass', 'Road', 'Begumpura, CS Old City', 'At Risk', 2.8, 2.0, 'm Inundation', 42, 'Flow Velocity Radar Active', CURRENT_TIMESTAMP, 19.882100, 75.334200, '[
  {"name": "Road Surface Inundation", "val": "0.8m Water Depth", "status": "At Risk"},
  {"name": "Flow Velocity", "val": "3.1 m/s (Torrential)", "status": "Danger"}
]'),
('10000000-0000-0000-0000-000000000005', 'Government Medical College & Hospital (GMCH)', 'Hospital', 'Panchakki Road, CS', 'Normal', 100.0, 100.0, '% Operational', 99, 'Aux Generator & ICU Monitored', CURRENT_TIMESTAMP, 19.896700, 75.319800, '[
  {"name": "Emergency Beds Free", "val": "48 Beds", "status": "Normal"},
  {"name": "Backup Power Status", "val": "100% Available (Diesel 72h)", "status": "Normal"},
  {"name": "Flood Defenses", "val": "Sump Pumps Operating", "status": "Normal"}
]');

-- 7. Monitoring Stations
INSERT INTO monitoring_stations (station_id, station_name, location, rainfall_mm, water_level_m, battery_pct, status, latitude, longitude) VALUES
('CS-ST01', 'Kham River Radar Station', 'Chhatrapati Sambhajinagar Central', 120.4, 4.8, 98, 'Online', 19.8761, 75.3433),
('CS-ST02', 'Paithan Hydro Station', 'Jayakwadi Reservoir Gate 4', 98.2, 463.8, 100, 'Online', 19.4934, 75.3789),
('PN-ST03', 'Mutha River Hydrologic Unit', 'Deccan Gymkhana, Pune', 94.0, 6.2, 92, 'Online', 18.5167, 73.8417),
('NS-ST04', 'Godavari High Velocity Unit', 'Ramkund Basin, Nashik', 142.1, 7.9, 95, 'Online', 19.9975, 73.7898),
('NG-ST05', 'Nag River Gauge Station', 'Sitabuldi, Nagpur', 45.2, 2.4, 88, 'Online', 21.1458, 79.0882),
('CS-ST06', 'Waluj Telemetry Station', 'MIDC Sector 2, CS', 82.0, 3.1, 0, 'Offline', 19.8329, 75.2410);

-- 8. Citizen Incident Reports
INSERT INTO citizen_reports (id, user_id, user_name, report_type, location, latitude, longitude, description, photo_url, priority, status, authority_notes) VALUES
('20000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Pooja Kulkarni', 'Flood', 'Begumpura Main Chawk, Near Bridge', 19.882100, 75.334200, 'Water level on the road is over 2.5 feet and rising fast. Several two wheelers stalled. Need municipal evacuation team.', '/assets/reports/flood_sample.jpg', 'Critical', 'In Progress', 'NDRF Unit 4 dispatched from Cidco depot. Sandbagging in progress.'),
('20000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'Pooja Kulkarni', 'Road Block', 'Jalna Road Underpass near Mukundwadi', 19.869400, 75.371200, 'Underpass heavily waterlogged. Heavy tree branch snapped and blocked both lanes.', '/assets/reports/tree_block.jpg', 'High', 'Pending', 'Traffic police alerted. Tree clearing crane en route.'),
('20000000-0000-0000-0000-000000000003', NULL, 'Amit Shinde (Local Volunteer)', 'Water Level', 'Paithan Old Ghat Embankment', 19.489100, 75.381200, 'Godavari backwater reached the ghat steps. Embankment wall showing minor moisture seepage.', NULL, 'Medium', 'Resolved', 'Inspected by Irrigation Dept engineer. Retaining wall structurally secure.');

-- 9. Real-time Notifications
INSERT INTO notifications (id, user_id, role_target, type, title, message, risk_level, is_read, link) VALUES
('30000000-0000-0000-0000-000000000001', NULL, 'ALL', 'Flood warning', 'RED ALERT: Kham River Basin Inundation Danger', 'Immediate evacuation advisory issued for low-lying sectors near Begumpura & Cidco N-3. Evacuate to designated Community Shelter #2.', 'Very High', false, '/flood-map.html'),
('30000000-0000-0000-0000-000000000002', NULL, 'ALL', 'Heavy rainfall', 'Meteorological Dept: 120mm Rainfall Measured in Last 3 Hours', 'Severe monsoon trough active across Marathwada. Avoid non-essential road travel.', 'High', false, '/weather-data.html'),
('30000000-0000-0000-0000-000000000003', NULL, 'AUTHORITY', 'Infrastructure risk', 'Jayakwadi Dam Exceeds 96.4% Storage Capacity', 'Emergency flood gates 1 through 14 opened to discharge 48,500 cusecs into Godavari river.', 'High', false, '/infrastructure-details.html?id=10000000-0000-0000-0000-000000000001'),
('30000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000001', 'CITIZEN', 'Citizen report update', 'Your Report #CR-2001 (Begumpura Main Chawk) has been updated', 'Status changed to: In Progress. NDRF Unit 4 has arrived at the location.', 'High', false, '/citizen-reports.html');

-- 10. Safe Evacuation Routes
INSERT INTO safe_routes (id, name, origin, destination, safe_status, distance_km, estimated_time_mins, checkpoints_json, shelters_json, polyline_json) VALUES
('40000000-0000-0000-0000-000000000001', 'Green Corridor #1 - Begumpura to Sports Complex Safe Shelter', 'Begumpura Chawk', 'Divisional Sports Complex Shelter, Garkheda', 'Clear', 6.4, 18, '[
  {"name": "University Road Junction", "status": "Clear", "police": "Stationed"},
  {"name": "Kranti Chawk Flyover (Elevated)", "status": "Clear", "police": "Stationed"},
  {"name": "Garkheda Sports Complex Safe Zone", "status": "Designated Evacuation Shelter", "police": "Active"}
]', '[
  {"name": "Divisional Sports Complex Evacuation Center", "capacity": "2,500 Persons", "status": "Open", "lat": 19.8654, "lng": 75.3521, "supplies": "Food, Medical, Clean Water"}
]', '[
  [19.8821, 75.3342],
  [19.8780, 75.3380],
  [19.8720, 75.3450],
  [19.8670, 75.3500],
  [19.8654, 75.3521]
]'),
('40000000-0000-0000-0000-000000000002', 'River Crossing Route #2 - Old Bazar via Causeway', 'Old Bazar Market', 'Cidco Community Hall', 'Blocked', 4.2, 45, '[
  {"name": "Kham River Causeway", "status": "Submerged (0.8m water)", "danger": "Do Not Attempt"}
]', '[]', '[
  [19.8860, 75.3280],
  [19.8821, 75.3342],
  [19.8760, 75.3480]
]');
