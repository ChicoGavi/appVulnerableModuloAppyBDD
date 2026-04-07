document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const loginError = document.getElementById('loginError');

  // If already logged in, redirect to index
  if (localStorage.getItem('token')) {
    window.location.href = 'index.html';
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.classList.add('d-none');
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('role', data.role);
        localStorage.setItem('username', username);
        // Redirect on success
        window.location.href = 'index.html';
      } else {
        loginError.innerHTML = data.error || 'Login fallido';
        loginError.classList.remove('d-none');
      }
    } catch (err) {
      console.error(err);
      loginError.innerHTML = 'Error de red';
      loginError.classList.remove('d-none');
    }
  });
});
