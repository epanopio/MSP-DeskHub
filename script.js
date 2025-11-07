document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const errorMsg = document.getElementById('errorMsg');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    try {
      const response = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('loggedInUser', JSON.stringify(data.user));
        window.location.href = 'index.html';
      } else {
        errorMsg.textContent = 'Invalid username or password.';
      }
    } catch (error) {
      console.error('Login error:', error);
      errorMsg.textContent = 'Server error. Please try again later.';
    }
  });
});
