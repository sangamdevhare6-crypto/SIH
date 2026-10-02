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

    // 4. Admin user management is authority-only and includes account totals
    const anonymousAdminUsers = await request('GET', '/api/admin/users');
    assert(anonymousAdminUsers.status === 401, 'Admin user list requires authentication');

    const citizenAdminUsers = await request(
      'GET',
      '/api/admin/users',
      null,
      { Authorization: `Bearer ${citizenToken}` }
    );
    assert(citizenAdminUsers.status === 403, 'Citizen cannot access admin user list');

    const otherAuthority = await request('POST', '/api/auth/register/authority', {
      full_name: 'Other Authority Check',
      email: `other-authority-${Date.now()}@example.test`,
      department: 'Test Department',
      designation: 'Test Officer',
      password: 'AuthorityTestPass123'
    });
    assert(
      otherAuthority.status === 201 && otherAuthority.body.user.role === 'AUTHORITY',
      'Additional authority account can be created in development'
    );

    const otherAuthorityAdminUsers = await request(
      'GET',
      '/api/admin/users',
      null,
      { Authorization: `Bearer ${otherAuthority.body.token}` }
    );
    assert(otherAuthorityAdminUsers.status === 403, 'Only configured admin email can access admin user list');

    const authorityAdminUsers = await request(
      'GET',
      '/api/admin/users',
      null,
      { Authorization: `Bearer ${authorityToken}` }
    );
    assert(
      authorityAdminUsers.status === 200 &&
      authorityAdminUsers.body.stats.total_users >= 2 &&
      authorityAdminUsers.body.stats.logged_in_users === 2 &&
      authorityAdminUsers.body.stats.total_logins === 2 &&
      authorityAdminUsers.body.users.length >= 2 &&
      authorityAdminUsers.body.users.some(user =>
        user.email === 'admin@worldmonitor.gov.in' &&
        user.login_count === 1 &&
        Boolean(user.last_login_at)
      ),
      'Authority admin dashboard returns account and login counts'
    );

    const newCitizenEmail = `admin-count-${Date.now()}@example.test`;
    const newCitizen = await request('POST', '/api/auth/register/citizen', {
      full_name: 'Admin Count Check',
      email: newCitizenEmail,
      password: 'CitizenTestPass123'
    });
    assert(newCitizen.status === 201 && newCitizen.body.success, 'New citizen registration succeeds');

    const refreshedAdminUsers = await request(
      'GET',
      '/api/admin/users',
      null,
      { Authorization: `Bearer ${authorityToken}` }
    );
    assert(
      refreshedAdminUsers.status === 200 &&
      refreshedAdminUsers.body.stats.total_users === authorityAdminUsers.body.stats.total_users + 1 &&
      refreshedAdminUsers.body.stats.logged_in_users === authorityAdminUsers.body.stats.logged_in_users &&
      refreshedAdminUsers.body.stats.total_logins === authorityAdminUsers.body.stats.total_logins &&
      refreshedAdminUsers.body.users.some(user => user.email === newCitizenEmail),
      'Registration updates account totals, not login totals'
    );

    const newCitizenLogin = await request('POST', '/api/auth/login', {
      identifier: newCitizenEmail,
      password: 'CitizenTestPass123',
      role_hint: 'CITIZEN'
    });
    assert(newCitizenLogin.status === 200, 'Newly registered citizen can log in');

    const loginMetrics = await request(
      'GET',
      '/api/admin/users',
      null,
      { Authorization: `Bearer ${authorityToken}` }
    );
    assert(
      loginMetrics.status === 200 &&
      loginMetrics.body.stats.logged_in_users === authorityAdminUsers.body.stats.logged_in_users + 1 &&
      loginMetrics.body.stats.total_logins === authorityAdminUsers.body.stats.total_logins + 1,
      'Successful login updates admin login metrics'
    );

    // 5. Dashboard KPIs & Telemetry
    const dashboard = await request('GET', '/api/dashboard?city=Chhatrapati%20Sambhajinagar');
    assert(dashboard.status === 200 && Number.isFinite(dashboard.body.kpis.temperature), 'Dashboard returns live weather KPIs');

    // 5. Weather & Nowcast
    const weather = await request('GET', '/api/weather?city=Chhatrapati%20Sambhajinagar');
    assert(weather.status === 200 && weather.body.data.temperature > 0, 'Live Weather Service & Forecast');

    const citySearch = await request('GET', '/api/weather/locations?q=Mumbai');
    const mumbaiLocation = citySearch.body.data?.find(location => location.country === 'IN');
    assert(citySearch.status === 200 && Boolean(mumbaiLocation), 'Worldwide city search returns Indian locations');

    if (mumbaiLocation) {
      const selectedCityWeather = await request(
        'GET',
        `/api/weather?city=${encodeURIComponent(mumbaiLocation.name)}&lat=${mumbaiLocation.latitude}&lon=${mumbaiLocation.longitude}&country=${mumbaiLocation.country}`
      );
      assert(
        selectedCityWeather.status === 200 &&
        selectedCityWeather.body.data.latitude === mumbaiLocation.latitude &&
        selectedCityWeather.body.data.longitude === mumbaiLocation.longitude,
        'Selected city weather uses its exact coordinates'
      );
    } else {
      assert(false, 'Selected city weather uses its exact coordinates');
    }

    const nowcast = await request('GET', '/api/weather/nowcast?city=Chhatrapati%20Sambhajinagar');
    assert(nowcast.status === 200 && nowcast.body.chartData.precipitationRate.length > 0, 'Nowcast Short-Term Prediction Curve & Risk Assessment');

    // 6. Radar & Satellite Metadata
    const radar = await request('GET', '/api/weather/radar');
    assert(radar.status === 200 && radar.body.data.type === 'LIVE_PRECIPITATION_RADAR' && radar.body.data.provider === 'RainViewer', 'Radar metadata endpoint');

    const radarTile = await request('GET', '/api/weather/radar/tile/7/90/56');
    assert(radarTile.status === 200 && radarTile.headers['content-type'].includes('image/png'), 'RainViewer radar tile for Chhatrapati Sambhajinagar');

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
