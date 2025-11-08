document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const errorMsg = document.getElementById('errorMsg');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;

      try {
const res = await fetch('http://localhost:3000/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username, password })
});


        const data = await res.json();
        if (data.success) {
          localStorage.setItem('user', JSON.stringify(data.user));
          window.location.href = 'index.html';
        } else {
          errorMsg.textContent = data.message || 'Invalid username or password.';
        }
      } catch (err) {
        errorMsg.textContent = 'Error connecting to server.';
      }
    });
  }

  // Greet user if logged in
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
