document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const errorMsg = document.getElementById('errorMsg');
  const rememberLogin = document.getElementById('rememberLogin');
  const rememberPassword = document.getElementById('rememberPassword');

  if (loginForm) {
    // Prefill saved login info (username and optionally password)
    const savedLogin = JSON.parse(localStorage.getItem('savedLogin') || 'null');
    if (savedLogin) {
      document.getElementById('username').value = savedLogin.username || '';
      if (rememberLogin) rememberLogin.checked = true;
      if (savedLogin.password && rememberPassword) {
        document.getElementById('password').value = savedLogin.password;
        rememberPassword.checked = true;
      }
    }

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value.trim();

      try {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (res.ok) {
          const saveLogin = rememberLogin && rememberLogin.checked;
          const savePwd = rememberPassword && rememberPassword.checked;
          if (saveLogin || savePwd) {
            const payload = { username };
            if (savePwd) payload.password = password;
            localStorage.setItem('savedLogin', JSON.stringify(payload));
          } else {
            localStorage.removeItem('savedLogin');
          }

          const role = data.role || 'user';
          const fullName = data.full_name || data.fullName || username;
          const allowedApps = data.allowed_apps || (
            role === 'superadmin'
              ? ['dashboard', 'inventory', 'controlpanel', 'adminforms', 'leaveform', 'userprofile', 'projects']
              : role === 'admin'
                ? ['dashboard', 'inventory', 'adminforms', 'leaveform', 'userprofile', 'projects']
                : role === 'poweruser'
                  ? ['dashboard', 'inventory', 'adminforms', 'leaveform', 'userprofile', 'projects']
                  : ['dashboard', 'adminforms', 'leaveform', 'userprofile', 'projects']
          );
          const isAdmin = role === 'admin' || role === 'superadmin' || ['admin', 'deskhubadmin'].includes(username.toLowerCase());
          localStorage.setItem('user', JSON.stringify({ username, fullName, isAdmin, role, allowedApps }));

          // Redirect to dashboard first for all users
          window.location.href = 'dashboard.html';
        } else {
          errorMsg.textContent = data.message || 'Invalid username or password.';
        }
      } catch (err) {
        errorMsg.textContent = 'Error connecting to server.';
      }
    });
  }

  const userGreeting = document.getElementById('userGreeting');
  const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
  if (userGreeting) {
    if (!currentUser) {
      window.location.href = 'login.html';
    } else {
      const nameToUse = currentUser.fullName || currentUser.username || '';
      userGreeting.textContent = `Welcome, ${nameToUse}!`;
    }
  }

  // Page-level guard: allowed pages per role
  const roleDefaults = {
    superadmin: [
      'dashboard',
      'items', 'models', 'units', 'inventorylocation',
      'adminforms', 'leaveform', 'nightaccess', 'overtime', 'claimoff', 'timeoff', 'mcform',
      'projects',
      'dataprocessinginfo',
      'emailsettings',
      'applicationforms',
      'deskhublogs',
      'teamviewerstatus',
      'operations-calendar', 'reports-calendar', 'leave-calendar',
      'manageusers',
      'userprofile', 'formsrecords'
    ],
    admin: [
      'dashboard',
      'items', 'models', 'units', 'inventorylocation',
      'adminforms', 'leaveform', 'nightaccess', 'overtime', 'claimoff', 'timeoff', 'mcform',
      'projects',
      'dataprocessinginfo',
      'emailsettings',
      'applicationforms',
      'teamviewerstatus',
      'operations-calendar', 'reports-calendar', 'leave-calendar',
      'userprofile', 'formsrecords'
    ],
    poweruser: [
      'dashboard',
      'items', 'models', 'units', 'inventorylocation',
      'adminforms', 'leaveform', 'nightaccess', 'overtime', 'claimoff', 'timeoff', 'mcform',
      'projects',
      'dataprocessinginfo',
      'teamviewerstatus',
      'operations-calendar', 'reports-calendar', 'leave-calendar',
      'userprofile', 'formsrecords'
    ],
    user: [
      'dashboard',
      'inventorylocation',
      'adminforms', 'leaveform', 'nightaccess', 'overtime', 'claimoff', 'timeoff', 'mcform',
      'projects',
      'dataprocessinginfo',
      'teamviewerstatus',
      'operations-calendar', 'reports-calendar', 'leave-calendar',
      'userprofile', 'formsrecords'
    ]
  };

  const roleKey = (currentUser && currentUser.role ? String(currentUser.role).toLowerCase() : 'user');
  const storedAllowed = (currentUser && currentUser.allowedApps) || [];
  const defaults = roleDefaults[roleKey] || roleDefaults.user;
  const mergedAllowed = Array.from(new Set([...defaults, ...storedAllowed]));
  let allowedApps = roleKey === 'superadmin'
    ? mergedAllowed
    : mergedAllowed.filter(key => key !== 'deskhublogs');
  if (roleKey !== 'superadmin' && roleKey !== 'admin') {
    allowedApps = allowedApps.filter(key => key !== 'emailsettings');
  }
  // Persist enriched permissions so subsequent page loads see them
  if (currentUser) {
    currentUser.allowedApps = allowedApps;
    localStorage.setItem('user', JSON.stringify(currentUser));
  }
  const path = (window.location.pathname || '').toLowerCase();
  if (!path.includes('login.html') && !path.includes('restricted.html')) {
    const pageKey = path.includes('projects.html') ? 'projects'
      : path.includes('leaveform.html') ? 'leaveform'
      : path.includes('nightaccessform.html') ? 'nightaccess'
      : path.includes('overtimeform.html') ? 'overtime'
      : path.includes('claimoffform.html') ? 'claimoff'
      : path.includes('timeoffform.html') ? 'timeoff'
      : path.includes('mcform.html') ? 'mcform'
      : (path.includes('manageusers.html') || path.includes('controlpanel.html')) ? 'manageusers'
      : path.includes('applicationforms.html') ? 'applicationforms'
      : path.includes('deskhublogs.html') ? 'deskhublogs'
      : path.includes('emailsettings.html') ? 'emailsettings'
      : path.includes('teamviewerstatus.html') ? 'teamviewerstatus'
      : path.includes('userprofile.html') ? 'userprofile'
      : path.includes('formsrecords.html') ? 'formsrecords'
      : path.includes('inventorylocation.html') ? 'inventorylocation'
      : path.includes('items.html') ? 'items'
      : path.includes('models.html') ? 'models'
      : path.includes('units.html') ? 'units'
      : path.includes('operations-calendar.html') ? 'operations-calendar'
      : path.includes('reports-calendar.html') ? 'reports-calendar'
      : path.includes('leave-calendar.html') ? 'leave-calendar'
      : path.includes('dataprocessinginfo.html') ? 'dataprocessinginfo'
      : path.includes('dashboard.html') ? 'dashboard'
      : null;
    if (pageKey && !allowedApps.includes(pageKey)) {
      window.location.href = 'restricted.html';
      return;
    }
  }

  // Hide menu items the user cannot access
  const nav = document.querySelector('.nav-main');
  if (nav) {
    const allowed = allowedApps;
    const isUserOnly = roleKey === 'user' || roleKey === 'poweruser';

    // Hide disallowed pages in the nav
    const disallowMap = [
      { key: 'manageusers', hrefs: ['manageusers.html', 'controlpanel.html'] },
      { key: 'applicationforms', hrefs: ['applicationforms.html'] },
      { key: 'deskhublogs', hrefs: ['deskhublogs.html'] },
      { key: 'emailsettings', hrefs: ['emailsettings.html'] },
      { key: 'teamviewerstatus', hrefs: ['teamviewerstatus.html'] },
      { key: 'items', hrefs: ['items.html'] },
      { key: 'models', hrefs: ['models.html'] },
      { key: 'units', hrefs: ['units.html'] }
    ];
    disallowMap.forEach(entry => {
      if (!allowed.includes(entry.key)) {
        entry.hrefs.forEach(h => {
          const link = nav.querySelector(`a[href$="${h}"]`);
          if (link && link.closest('li')) {
            link.closest('li').style.display = 'none';
          }
        });
      }
    });
    if (isUserOnly) {
      ['emailsettings.html'].forEach(h => {
        const link = nav.querySelector(`a[href$="${h}"]`);
        if (link && link.closest('li')) {
          link.closest('li').style.display = 'none';
        }
      });
      const controlParent = Array.from(nav.querySelectorAll('.nav-parent > a'))
        .find(a => (a.textContent || '').trim().toLowerCase().includes('control panel'));
      if (controlParent && controlParent.closest('li')) {
        controlParent.closest('li').style.display = 'none';
      }
    }

    const ensureMenuItem = (ul, href, label, afterHref, beforeHref) => {
      if (!ul || ul.querySelector(`a[href$="${href}"]`)) return;
      const li = document.createElement('li');
      li.innerHTML = `<a href="${href}">${label}</a>`;
      if (beforeHref) {
        const beforeLink = ul.querySelector(`a[href$="${beforeHref}"]`);
        const beforeLi = beforeLink ? beforeLink.closest('li') : null;
        if (beforeLi) {
          beforeLi.insertAdjacentElement('beforebegin', li);
          return;
        }
      }
      if (afterHref) {
        const afterLink = ul.querySelector(`a[href$="${afterHref}"]`);
        const afterLi = afterLink ? afterLink.closest('li') : null;
        if (afterLi) {
          afterLi.insertAdjacentElement('afterend', li);
          return;
        }
      }
      ul.appendChild(li);
    };

    // Ensure missing submenu links exist on all pages
    const opsLink = nav.querySelector('a[href$="projects.html"]');
    if (opsLink) {
      const opsUl = opsLink.closest('ul');
      ensureMenuItem(opsUl, 'teamviewerstatus.html', 'TeamViewer Status', null, 'projects.html');
      ensureMenuItem(opsUl, 'dataprocessinginfo.html', 'Data Processing Info', 'projects.html');
    }

    const calendarParent = Array.from(nav.querySelectorAll('.nav-parent > a'))
      .find(a => (a.textContent || '').trim().toLowerCase().includes('calendar'));
    if (calendarParent) {
      const calendarUl = calendarParent.parentElement.querySelector('.nav-children');
      ensureMenuItem(calendarUl, 'operations-calendar.html', 'Operations Calendar');
      ensureMenuItem(calendarUl, 'leave-calendar.html', 'Leave Calendar', 'operations-calendar.html');
      ensureMenuItem(calendarUl, 'reports-calendar.html', 'Reports Calendar', 'leave-calendar.html');
    }

    const controlLink = nav.querySelector('a[href$="applicationforms.html"]');
    if (controlLink) {
      const controlUl = controlLink.closest('ul');
      ensureMenuItem(controlUl, 'emailsettings.html', 'Email Settings', 'applicationforms.html');
      ensureMenuItem(controlUl, 'deskhublogs.html', 'DeskHub Logs', 'emailsettings.html');
    }

    const adminFormsLink = nav.querySelector('a[href$="nightaccessform.html"]');
    if (adminFormsLink) {
      const adminFormsUl = adminFormsLink.closest('ul');
      ensureMenuItem(adminFormsUl, 'claimoffform.html', 'Claim Off Form', 'overtimeform.html', 'timeoffform.html');
    }

    // Reset all active/expanded states, then set only the current page as active
    const pageFile = (window.location.pathname.split('/').pop() || 'dashboard.html').toLowerCase();
    nav.querySelectorAll('li').forEach(li => li.classList.remove('nav-active', 'nav-expanded'));

    const links = nav.querySelectorAll('a[href]');
    let activeLi = null;
    links.forEach(l => {
      const href = (l.getAttribute('href') || '').toLowerCase();
      if (href === pageFile || href.endsWith('/' + pageFile)) {
        activeLi = l.closest('li');
      }
    });
    if (activeLi) {
      activeLi.classList.add('nav-active');
      const parent = activeLi.closest('.nav-parent');
      if (parent) {
        parent.classList.add('nav-active', 'nav-expanded');
      }
    }

    // reset inline styles so the theme's built-in nav toggle can work
    nav.querySelectorAll('.nav-children').forEach(ul => { ul.style.display = ''; });

    // Allow only one expanded menu at a time (do not block default toggle)
    const parentLinks = nav.querySelectorAll('.nav-parent > a');
    parentLinks.forEach(link => {
      link.addEventListener('click', () => {
        const parent = link.closest('.nav-parent');
        if (!parent) return;
        nav.querySelectorAll('.nav-parent.nav-expanded').forEach(p => {
          if (p !== parent) p.classList.remove('nav-expanded');
        });
      });
    });

    // One active item at a time (parent or child)
    nav.addEventListener('click', (e) => {
      const anchor = e.target.closest('a');
      if (!anchor || !nav.contains(anchor)) return;
      const li = anchor.closest('li');
      if (!li) return;
      nav.querySelectorAll('li').forEach(el => el.classList.remove('nav-active'));
      li.classList.add('nav-active');
      const parent = li.closest('.nav-parent');
      if (parent) {
        parent.classList.add('nav-active', 'nav-expanded');
      }
      // collapse other parents
      nav.querySelectorAll('.nav-parent').forEach(p => {
        if (p !== parent) p.classList.remove('nav-expanded');
      });
    });
  }

  // Welcome banner (uses username as full name placeholder)
  async function fillWelcomeName() {
    const welcomeNameNodes = document.querySelectorAll('.welcome-name');
    const headerNameNodes = document.querySelectorAll('.header-full-name');
    if (!welcomeNameNodes.length && !headerNameNodes.length) return;
    if (!currentUser) return;

    let displayName = currentUser.fullName || currentUser.username || '';
    // Apply immediately with what we have
    welcomeNameNodes.forEach(n => { n.textContent = displayName; });
    headerNameNodes.forEach(n => { n.textContent = displayName; });

    // If we don't have a full name cached, try to fetch it from /api/users
    if (!currentUser.fullName) {
      try {
        const res = await fetch('/api/users');
        if (res.ok) {
          const list = await res.json();
          const found = list.find(u => (u.username || '').toLowerCase() === currentUser.username.toLowerCase());
          if (found) {
            displayName = found.full_name || found.username || currentUser.username;
            currentUser.fullName = displayName;
            if (found.office || found.office_location) {
              currentUser.office = found.office || found.office_location;
            }
            // persist the enriched user object
            localStorage.setItem('user', JSON.stringify(currentUser));
            welcomeNameNodes.forEach(n => { n.textContent = displayName; });
            headerNameNodes.forEach(n => { n.textContent = displayName; });
          }
        }
      } catch (err) {
        // ignore fetch errors; fallback to username
      }
    }

    welcomeNameNodes.forEach(n => { n.textContent = displayName; });
    headerNameNodes.forEach(n => { n.textContent = displayName; });
  }

  function ensureServerStatus() {
    const header = document.querySelector('header.header');
    if (!header) return;
    let statusEl = document.getElementById('serverStatus');
    if (!statusEl) {
      statusEl = document.createElement('div');
      statusEl.id = 'serverStatus';
      statusEl.className = 'server-status';
      statusEl.textContent = 'Checking...';
      header.appendChild(statusEl);
    }

    async function checkStatus() {
      try {
        const res = await fetch('/api/health', { cache: 'no-store' });
        if (res.ok) {
          statusEl.textContent = 'Server Connected';
          statusEl.classList.remove('fail');
          statusEl.classList.add('ok');
        } else {
          statusEl.textContent = 'Server Connection Failed';
          statusEl.classList.remove('ok');
          statusEl.classList.add('fail');
        }
      } catch (err) {
        statusEl.textContent = 'Server Connection Failed';
        statusEl.classList.remove('ok');
        statusEl.classList.add('fail');
      }
    }

    checkStatus();
    setInterval(checkStatus, 10000);
  }

  // Ensure top-right header full name banner exists
  function ensureHeaderFullName() {
    const header = document.querySelector('.header');
    if (!header) return;
    if (!header.querySelector('.header-full-name')) {
      const nameEl = document.createElement('div');
      nameEl.className = 'header-full-name';
      header.appendChild(nameEl);
    }
  }

  ensureHeaderFullName();
  fillWelcomeName();
  ensureServerStatus();
});

function logout() {
  fetch('/logout', { method: 'POST' })
    .then(() => {
      localStorage.removeItem('user');
      window.location.href = 'login.html';
    });
}
