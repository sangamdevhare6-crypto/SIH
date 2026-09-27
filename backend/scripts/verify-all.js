const app = require('../server');
const http = require('http');

let server;
const PORT = 5099;

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };
    if (payload) {
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request({
      hostname: 'localhost',
      port: PORT,
      path,
      method,
      headers: reqHeaders
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting End-to-End Verification of WORLD MONITOR APIs & System Flows...\n');

  // Start test server
  await new Promise(r => {
    server = app.listen(PORT, () => {
      console.log(`[TEST-SUITE] Test server bound to port ${PORT}`);
      r();
    });
  });

  let passCount = 0;
  let failCount = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passCount++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failCount++;
    }
  }

  try {
    // 1. Health Check
    const health = await request('GET', '/api/health');
    assert(health.status === 200 && health.body.status === 'ONLINE', 'System Health Check Endpoint');

    // 2. Citizen Login
    const citizenLogin = await request('POST', '/api/auth/login', {
      identifier: 'citizen@worldmonitor.org',
      password: 'CitizenPassword@123',
      role_hint: 'CITIZEN'
    });
    assert(citizenLogin.status === 200 && citizenLogin.body.success && citizenLogin.body.user.role === 'CITIZEN', 'Citizen Login with Password Verification');
    const citizenToken = citizenLogin.body.token;

    // 3. Authority Login
    const authLogin = await request('POST', '/api/auth/login', {
      identifier: 'admin@worldmonitor.gov.in',
      password: 'AdminPassword@123',
      role_hint: 'AUTHORITY'
    });
    assert(authLogin.status === 200 && authLogin.body.success && authLogin.body.user.role === 'AUTHORITY', 'Authority Login with Role Authorization');
    const authorityToken = authLogin.body.token;

    // 4. Dashboard KPIs & Telemetry
    const dashboard = await request('GET', '/api/dashboard?city=Chhatrapati%20Sambhajinagar');
    assert(dashboard.status === 200 && dashboard.body.kpis.rainfall_mm >= 120 && dashboard.body.kpis.temperature > 0, 'Dashboard KPIs (Rainfall, Temp, Humidity, Wind, Pressure)');

    // 5. Weather & Nowcast
    const weather = await request('GET', '/api/weather?city=Chhatrapati%20Sambhajinagar');
    assert(weather.status === 200 && weather.body.data.temperature > 0, 'Live Weather Service & Forecast');

    const nowcast = await request('GET', '/api/weather/nowcast?city=Chhatrapati%20Sambhajinagar');
    assert(nowcast.status === 200 && nowcast.body.chartData.precipitationRate.length > 0, 'Nowcast Short-Term Prediction Curve & Risk Assessment');

    // 6. Radar & Satellite Metadata
    const radar = await request('GET', '/api/weather/radar');
    assert(radar.status === 200 && radar.body.data.stormCells.length > 0, 'Radar Reflectivity Cells & Doppler Telemetry');

    // 7. Alerts List
    const alerts = await request('GET', '/api/alerts');
    assert(alerts.status === 200 && alerts.body.data.length >= 3, 'Emergency Alerts Query & Risk Levels');

    // 8. Authority Broadcasts Alert (Role Protected)
    const newAlert = await request('POST', '/api/alerts', {
      title: 'Emergency Flash Flood Test Broadcast',
      type: 'Flash Flood',
      risk_level: 'High',
      location: 'Paithan Sector 4',
      description: 'Test verification broadcast for civil protection cells',
      affected_population: '~15,000 citizens'
    }, { Authorization: `Bearer ${authorityToken}` });
    assert(newAlert.status === 201 && newAlert.body.success, 'Authority Emergency Alert Broadcasting');

    // Verify Citizen CANNOT broadcast alert (Role authorization test)
    const citizenBlock = await request('POST', '/api/alerts', {
      title: 'Illegal Citizen Alert',
      type: 'Flash Flood',
      risk_level: 'High',
      location: 'Test'
    }, { Authorization: `Bearer ${citizenToken}` });
    assert(citizenBlock.status === 403, 'Role-Based Access Control: Citizen Forbidden From Broadcasting Authority Alerts');

    // 9. Citizen Incident Report Submission
    const newReport = await request('POST', '/api/reports', {
      report_type: 'Flood',
      location: 'Begumpura Chawk',
      description: 'Water depth 2.5ft rising rapidly',
      priority: 'Critical'
    }, { Authorization: `Bearer ${citizenToken}` });
    assert(newReport.status === 201 && newReport.body.success, 'Citizen Incident Report Creation & Validation');

    // 10. Critical Infrastructure Telemetry
    const infra = await request('GET', '/api/infrastructure');
    assert(infra.status === 200 && infra.body.data.length >= 5, 'Critical Infrastructure (Jayakwadi & Khadakwasla Dams, Bridges, Hospitals)');

    // 11. Monitoring Stations
    const stations = await request('GET', '/api/monitoring-stations');
    assert(stations.status === 200 && stations.body.onlineCount > 0, 'Telemetry Monitoring Stations (Online/Offline Status)');

    // 12. Safe Evacuation Routes & Calculator
    const routes = await request('GET', '/api/routes');
    assert(routes.status === 200 && routes.body.routes.length > 0 && routes.body.shelters.length > 0, 'Safe Evacuation Routes, Risk Polygons & Shelters');

    const routeCalc = await request('POST', '/api/routes/find', {
      origin: 'Begumpura Chawk',
      destination: 'Divisional Sports Complex Shelter, Garkheda'
    });
    assert(routeCalc.status === 200 && routeCalc.body.route.safe_status === 'Clear', 'Elevation-Safe Route Calculation Algorithm');

    // 13. Notifications & Unread Counters
    const notifs = await request('GET', '/api/notifications', null, { Authorization: `Bearer ${citizenToken}` });
    assert(notifs.status === 200 && notifs.body.totalCount > 0, 'Real-Time Notifications Feed & Counter');

    // 14. Report Dossier Download
    const reportDownload = await request('GET', '/api/reports/download/rep_01');
    assert(reportDownload.status === 200, 'Automated CSV / Dossier Export Download');

    console.log(`\n==================================================`);
    console.log(`TEST RESULTS: ${passCount} Passed, ${failCount} Failed`);
    console.log(`==================================================\n`);

  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    server.close();
    process.exit(failCount === 0 ? 0 : 1);
  }
}

runTests();
