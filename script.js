document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const errorMsg = document.getElementById('errorMsg');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value.trim();
      const appfunction = document.getElementById('appfunction').value;

      try {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (res.ok) {
          localStorage.setItem('user', JSON.stringify({ username }));

          if (appfunction === 'inventory') {
            window.location.href = 'index.html';
          } else if (appfunction === 'leaveform') {
            window.location.href = 'leaveform.html';
          } else {
            errorMsg.textContent = 'Please select a valid access option.';
          }
        } else {
          errorMsg.textContent = data.message || 'Invalid username or password.';
        }
      } catch (err) {
        errorMsg.textContent = 'Error connecting to server.';
      }
    });
  }

  const userGreeting = document.getElementById('userGreeting');
  if (userGreeting) {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
      window.location.href = 'login.html';
    } else {
      userGreeting.textContent = `Welcome, ${user.username}!`;
    }
  }
});

function logout() {
  fetch('/logout', { method: 'POST' })
    .then(() => {
      localStorage.removeItem('user');
      window.location.href = 'login.html';
    });
}
