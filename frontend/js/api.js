/**
 * LocalFix API Client
 * Thin fetch wrapper around the LocalFix backend.
 * Attaches the JWT (if the user is logged in) to every request and
 * throws an Error with the server's descriptive message on failure.
 *
 * Configurable via window.LOCALFIX_API_URL or localStorage.getItem('lf_api_url')
 */
const DEFAULT_API_URL = 'http://localhost:5000/api';

const getApiBaseUrl = () => {
  try {
    return window.LOCALFIX_API_URL || localStorage.getItem('lf_api_url') || DEFAULT_API_URL;
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
      throw new Error(
        `Cannot connect to LocalFix backend at ${baseUrl}. Ensure backend server is running (npm run dev in localfix/backend).`
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
