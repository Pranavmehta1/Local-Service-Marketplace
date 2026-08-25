/**
 * Thin fetch wrapper around the LocalFix backend.
 * Attaches the JWT (if the user is logged in) to every request and
 * throws a normal Error with the server's message on failure, so callers
 * can just `try { await api.get(...) } catch (err) { ... }`.
 *
 * Change API_BASE_URL once the backend is deployed / running locally.
 */
const API_BASE_URL = 'http://localhost:5000/api';

const LocalFixAPI = (() => {
  const getToken = () => localStorage.getItem('lf_token');

  const request = async (path, { method = 'GET', body, auth = true } = {}) => {
    const headers = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (auth && token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
    return data;
  };

  return {
    get: (path) => request(path),
    post: (path, body, opts = {}) => request(path, { method: 'POST', body, ...opts }),
    put: (path, body) => request(path, { method: 'PUT', body }),
    del: (path) => request(path, { method: 'DELETE' }),
  };
})();
