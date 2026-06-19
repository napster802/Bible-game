/* ============================================================
   Bible Challenge Arena - Admin Gate
   Casual client-side login gate (not secure credential storage)
   protecting Host Game and clearing Hall of Fame history.
   Default credentials: admin / 12345678
   ============================================================ */
const Admin = (function () {
  const USERNAME = 'admin';
  const PASSWORD = '12345678';
  const SESSION_KEY = 'bca_admin_authed';

  let onSuccess = null;

  function isAuthenticated() {
    return sessionStorage.getItem(SESSION_KEY) === '1';
  }

  function requireAdmin(callback) {
    if (isAuthenticated()) {
      callback();
      return;
    }
    onSuccess = callback;
    openLoginOverlay();
  }

  function openLoginOverlay() {
    const overlay = document.getElementById('overlay-admin-login');
    const error = document.getElementById('admin-login-error');
    const userInput = document.getElementById('admin-username-input');
    const passInput = document.getElementById('admin-password-input');
    if (error) error.textContent = '';
    if (userInput) userInput.value = '';
    if (passInput) passInput.value = '';
    if (overlay) overlay.style.display = 'flex';
    if (userInput) userInput.focus();
  }

  function closeLoginOverlay() {
    const overlay = document.getElementById('overlay-admin-login');
    if (overlay) overlay.style.display = 'none';
    onSuccess = null;
  }

  function attemptLogin() {
    const userInput = document.getElementById('admin-username-input');
    const passInput = document.getElementById('admin-password-input');
    const error = document.getElementById('admin-login-error');
    const user = userInput ? userInput.value.trim() : '';
    const pass = passInput ? passInput.value : '';

    if (user === USERNAME && pass === PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, '1');
      const overlay = document.getElementById('overlay-admin-login');
      if (overlay) overlay.style.display = 'none';
      const callback = onSuccess;
      onSuccess = null;
      if (callback) callback();
    } else if (error) {
      error.textContent = 'Incorrect username or password.';
    }
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  // Exposed only so the admin-only CSV question upload can authenticate its
  // server request - same "casual gate" model as the rest of this module.
  function getPasscode() {
    return PASSWORD;
  }

  return {
    isAuthenticated,
    requireAdmin,
    openLoginOverlay,
    closeLoginOverlay,
    attemptLogin,
    logout,
    getPasscode
  };
})();
