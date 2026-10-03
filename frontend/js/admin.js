(function () {

  const $ = (id) =>
    document.getElementById(id);


  // Prevent HTML injection
  function escapeHtml(value) {

    return String(value ?? '')
      .replace(
        /[&<>'"]/g,
        character => ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          "'": '&#39;',
          '"': '&quot;'
        }[character])
      );

  }


  // Format date
  function formatDate(value) {

    if (!value) {
      return '—';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '—';
    }

    return date.toLocaleString(
      [],
      {
        dateStyle: 'medium',
        timeStyle: 'short'
      }
    );

  }


  // Display users
  function renderUsers(users) {

    if (!users.length) {

      $('usersBody').innerHTML = `
        <tr>
          <td
            colspan="8"
            class="empty"
          >
            No registered users found.
          </td>
        </tr>
      `;

      return;
    }


    $('usersBody').innerHTML = users
      .map(user => `

        <tr>

          <td>
            <strong>
              ${escapeHtml(user.full_name)}
            </strong>
          </td>

          <td>
            ${escapeHtml(user.email)}
          </td>

          <td>
            ${escapeHtml(user.phone || '—')}
          </td>

          <td>

            <span
              class="role ${String(user.role).toLowerCase()}"
            >
              ${escapeHtml(user.role)}
            </span>

          </td>

          <td>${Number(user.login_count) || 0}</td>

          <td>${formatDate(user.last_login_at)}</td>

          <td>

            <span
              class="account-status ${
                user.is_active === false
                  ? 'inactive'
                  : 'active'
              }"
            >

              ${
                user.is_active === false
                  ? 'Inactive'
                  : 'Active'
              }

            </span>

          </td>

          <td>
            ${formatDate(user.created_at)}
          </td>

        </tr>

      `)
      .join('');

  }


  function showAdminAccessMessage(message, signInLink = false) {
    $('statusText').textContent = 'Access required';
    $('totalUsers').textContent = '—';
    $('activeUsers').textContent = '—';
    $('citizens').textContent = '—';
    $('authorities').textContent = '—';
    $('loggedInUsers').textContent = '—';
    $('totalLogins').textContent = '—';

    const signInAction = signInLink
      ? '<a href="/login.html?redirect=%2Fadmin.html">Sign in with the configured admin account</a>'
      : '';

    $('usersBody').innerHTML = `
      <tr>
        <td colspan="8" class="empty error">
          ${escapeHtml(message)} ${signInAction}
        </td>
      </tr>
    `;
  }



  // Load admin dashboard
  async function loadAdmin() {

    $('statusText').textContent =
      'Loading…';

    const token = API.getToken();
    let user = null;

    try {
      user = JSON.parse(localStorage.getItem('wm_user_data') || 'null');
    } catch (_) {}

    if (!token || !user) {
      showAdminAccessMessage(
        'Sign in to view registered accounts.',
        true
      );
      return;
    }

    if (String(user.role || '').toUpperCase() !== 'AUTHORITY') {
      showAdminAccessMessage(
        'This page requires an authority account. Sign out and sign in with your admin account.',
        true
      );
      return;
    }


    try {

      const data =
        await API.get('/api/admin/users');


      const stats =
        data.stats || {};


      // Statistics

      $('totalUsers').textContent =
        stats.total_users ?? 0;


      $('activeUsers').textContent =
        stats.active_users ?? 0;


      $('citizens').textContent =
        stats.citizens ?? 0;


      $('authorities').textContent =
        stats.authorities ?? 0;

      $('loggedInUsers').textContent =
        stats.logged_in_users ?? 0;

      $('totalLogins').textContent =
        stats.total_logins ?? 0;


      // Users

      renderUsers(
        data.users || []
      );


      $('statusText').textContent =
        'Live data';

    }


    catch (error) {

      console.error(
        'Admin dashboard error:',
        error
      );


      const isForbidden = /403|access denied/i.test(error.message);
      showAdminAccessMessage(
        isForbidden
          ? 'This account is not configured as the admin. Sign in with the configured admin account.'
          : error.message || 'Could not load registered accounts.',
        isForbidden
      );

    }

  }



  // Refresh
  $('refreshBtn')
    .addEventListener(
      'click',
      loadAdmin
    );



  // Logout
  $('logoutBtn')
    .addEventListener(
      'click',
      async () => {

        try {

          await API.post(
            '/api/auth/logout',
            {}
          );

        } catch (_) {}


        API.clearToken();


        window.location.href =
          '/index.html';

      }
    );



  // Auto-inject ambient moving cyber boxes
  if (!document.querySelector('.moving-box-canvas')) {
    const canvas = document.createElement('div');
    canvas.className = 'moving-box-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.innerHTML = `
      <div class="cyber-moving-box box-1"><div class="box-inner-glow"></div><div class="box-grid-lines"></div></div>
      <div class="cyber-moving-box box-2"><div class="box-inner-glow"></div><div class="box-grid-lines"></div></div>
      <div class="cyber-moving-box box-3"><div class="box-inner-glow"></div><div class="box-grid-lines"></div></div>
      <div class="cyber-moving-box box-4"><div class="box-inner-glow"></div><div class="box-grid-lines"></div></div>
      <div class="cyber-moving-box box-5"><div class="box-inner-glow"></div><div class="box-grid-lines"></div></div>
    `;
    document.body.prepend(canvas);
  }

  // Initial load
  loadAdmin();

  window.setInterval(() => {
    if (!document.hidden && API.getToken()) {
      loadAdmin();
    }
  }, 30000);

})();