/**
 * LocalFix API Client
 * Uses relative '/api' so requests always match the current origin
 * Works seamlessly on both http://localhost:5000 and https://*.vercel.app
 */
const getApiBaseUrl = () => {
  try {
    if (window.LOCALFIX_API_URL) return window.LOCALFIX_API_URL;
    const stored = localStorage.getItem('lf_api_url');
    if (stored) return stored;
    return '/api';
  } catch {
    return '/api';
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
    const endpoint = `${baseUrl}${path}`;

    let res;
    try {
      res = await fetch(endpoint, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (networkErr) {
      throw new Error(
        `Network error: Could not reach backend API at ${endpoint}. Please verify your internet connection or backend server.`
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
