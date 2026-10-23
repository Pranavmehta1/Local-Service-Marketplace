/**
 * LocalFix API Client
 * Thin fetch wrapper around the LocalFix backend.
 * Attaches the JWT (if the user is logged in) to every request and
 * throws an Error with the server's descriptive message on failure.
 *
 * Automatically detects same-origin /api when accessed via http://localhost:5000
 */
const DEFAULT_API_URL = 'http://localhost:5000/api';

const getApiBaseUrl = () => {
  try {
    if (window.LOCALFIX_API_URL) return window.LOCALFIX_API_URL;
    const stored = localStorage.getItem('lf_api_url');
    if (stored) return stored;

    if (typeof window !== 'undefined' && window.location) {
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return `${window.location.origin}/api`;
      }
    }
    return DEFAULT_API_URL;
  } catch {
    return DEFAULT_API_URL;
  }
};

const LocalFixAPI = (() => {
  const getToken = () => {
    try {
      return localStorage.getItem('lf_token');
    } catch {
      return null;
    }
  };

  const request = async (path, { method = 'GET', body, auth = true } = {}) => {
    const headers = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (auth && token) headers.Authorization = `Bearer ${token}`;

    const baseUrl = getApiBaseUrl();
    let res;
    try {
      res = await fetch(`${baseUrl}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (networkErr) {
      if (window.location && window.location.protocol === 'https:' && baseUrl.startsWith('http:')) {
        throw new Error(
          'Browser Mixed Content Block: HTTPS Vercel cannot reach your local HTTP backend. Open http://localhost:5000/pages/auth.html instead.'
        );
      }
      throw new Error(
        `Cannot connect to LocalFix backend at ${baseUrl}. Ensure backend server is running (node server.js on port 5000).`
      );
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.message || `Request failed with status ${res.status}`);
      err.status = res.status;
      err.code = data.code;
      throw err;
    }
    return data;
  };

  return {
    getBaseUrl: getApiBaseUrl,
    setBaseUrl: (url) => {
      try {
        localStorage.setItem('lf_api_url', url);
      } catch {}
    },
    get: (path) => request(path),
    post: (path, body, opts = {}) => request(path, { method: 'POST', body, ...opts }),
    put: (path, body) => request(path, { method: 'PUT', body }),
    del: (path) => request(path, { method: 'DELETE' }),
  };
})();

window.LocalFixAPI = LocalFixAPI;
