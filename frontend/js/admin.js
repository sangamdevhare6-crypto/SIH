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
            colspan="6"
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



  // Load admin dashboard
  async function loadAdmin() {

    $('statusText').textContent =
      'Loading…';


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


      $('statusText').textContent =
        'Access denied / error';


      $('usersBody').innerHTML = `

        <tr>

          <td
            colspan="6"
            class="empty error"
          >

            ${escapeHtml(error.message)}

          </td>

        </tr>

      `;

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



  // Initial load
  loadAdmin();

})();