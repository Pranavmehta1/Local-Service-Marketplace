/**
 * LocalFix API Client
 * Uses relative '/api' so requests always match the current origin
 * Works seamlessly on both http://localhost:5000 and https://*.vercel.app
 */
const FALLBACK_REMOTE_API = 'https://immune-sugar-thank-wins.trycloudflare.com/api';

const getApiBaseUrl = () => {
  try {
    if (window.LOCALFIX_API_URL) return window.LOCALFIX_API_URL;
    const stored = localStorage.getItem('lf_api_url');
    if (stored) return stored;
    if (typeof window !== 'undefined' && window.location && window.location.protocol === 'file:') {
      return 'http://127.0.0.1:5000/api';
    }
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

  const request = async (path, { method = 'GET', body, auth = true, timeoutMs = 15000 } = {}) => {
    const headers = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (auth && token) headers.Authorization = `Bearer ${token}`;

    const baseUrl = getApiBaseUrl();
    const endpoint = `${baseUrl}${path}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let res;
    try {
      res = await fetch(endpoint, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      // If relative endpoint failed (e.g. 404 on Vercel preview or stale rewrite), try active tunnel
      if ((!res.ok || res.status === 404) && baseUrl === '/api' && typeof window !== 'undefined' && !window.location.host.includes('localhost') && !window.location.host.includes('127.0.0.1')) {
        try {
          const fallbackRes = await fetch(`${FALLBACK_REMOTE_API}${path}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
            signal: controller.signal,
          });
          if (fallbackRes.ok) {
            res = fallbackRes;
          }
        } catch (_) {}
      }
    } catch (networkErr) {
      if (networkErr.name === 'AbortError') {
        throw new Error('Verification request timed out. Please check your internet connection and try again.');
      }
      // If relative endpoint network failed, try active tunnel fallback
      if (baseUrl === '/api' && typeof window !== 'undefined' && !window.location.host.includes('localhost') && !window.location.host.includes('127.0.0.1')) {
        try {
          res = await fetch(`${FALLBACK_REMOTE_API}${path}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
            signal: controller.signal,
          });
        } catch (_) {
          throw new Error(
            `Network error: Could not reach backend API at ${endpoint}. Please verify your internet connection or backend server.`
          );
        }
      } else {
        throw new Error(
          `Network error: Could not reach backend API at ${endpoint}. Please verify your internet connection or backend server.`
        );
      }
    } finally {
      clearTimeout(timeoutId);
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
