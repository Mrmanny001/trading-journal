// Shared API + auth helpers used across every page.
const TOKEN_KEY = 'tj_token';
const USER_KEY = 'tj_user';

const Auth = {
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },
  setSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  getUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch (e) {
      return null;
    }
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
  isLoggedIn() {
    return !!this.getToken();
  },
  // Call at the top of protected pages. Redirects to login if not authed.
  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.replace('login.html');
      return false;
    }
    return true;
  },
  // Call at the top of login/signup pages. Redirects to dashboard if already authed.
  redirectIfAuthed() {
    if (this.isLoggedIn()) {
      window.location.replace('dashboard.html');
      return true;
    }
    return false;
  },
  async logout() {
    try {
      await Api.post('/api/auth/logout', {});
    } catch (e) {
      // Non-fatal: clear the local session regardless.
    }
    this.clear();
    window.location.replace('login.html');
  },
};

const Api = {
  async request(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    const token = Auth.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let res;
    try {
      res = await fetch(path, { ...options, headers });
    } catch (networkErr) {
      throw new Error('Could not reach the server. Check your connection and try again.');
    }

    let data = {};
    try {
      data = await res.json();
    } catch (e) {
      data = {};
    }

    if (res.status === 401 && path !== '/api/auth/login') {
      Auth.clear();
      if (!window.location.pathname.endsWith('login.html')) {
        window.location.replace('login.html');
      }
    }

    if (!res.ok) {
      throw new Error(data.error || 'Something went wrong. Please try again.');
    }
    return data;
  },
  get(path) {
    return this.request(path, { method: 'GET' });
  },
  post(path, body) {
    return this.request(path, { method: 'POST', body: JSON.stringify(body) });
  },
  put(path, body) {
    return this.request(path, { method: 'PUT', body: JSON.stringify(body) });
  },
  delete(path) {
    return this.request(path, { method: 'DELETE' });
  },
};
