/**
 * CivicResolve Centralized API Configuration & Routing Service
 * Directly configured to access Render Backend: https://civicresolve-8nve.onrender.com
 * No hidden environment variables or Render dashboard configuration required.
 */

export const BACKEND_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL)
  ? import.meta.env.VITE_API_BASE_URL
  : 'https://civicresolve-8nve.onrender.com';

// Direct production backend URL.
// When running locally on localhost/127.0.0.1 in Vite dev mode, uses dev proxy '';
// Everywhere else (including https://civicresolve-yc9v.onrender.com), directly connects to https://civicresolve-8nve.onrender.com.
export const API_BASE_URL = (
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
  import.meta.env.DEV
) ? '' : BACKEND_URL;

/**
 * Resolves an API endpoint path into a fully qualified API URL.
 * Example:
 *   getApiUrl('/api/complaints') -> 'https://civicresolve-8nve.onrender.com/api/complaints'
 * 
 * @param {string} endpoint - e.g. '/api/complaints', 'api/dashboard/stats'
 * @returns {string} Fully qualified backend URL
 */
export function getApiUrl(endpoint) {
  if (!endpoint) return API_BASE_URL || BACKEND_URL;
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  const clean = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const base = API_BASE_URL || BACKEND_URL;
  return `${base}${clean}`;
}

/**
 * Resolves an asset or uploaded grievance photo URL.
 * Example:
 *   getAssetUrl('/uploads/civic-123.jpg') -> 'https://civicresolve-8nve.onrender.com/uploads/civic-123.jpg'
 * 
 * @param {string} path - e.g. '/uploads/civic-123.jpg'
 * @returns {string} Fully qualified asset URL
 */
export function getAssetUrl(path) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:') || path.startsWith('blob:')) {
    return path;
  }
  const clean = path.startsWith('/') ? path : `/${path}`;
  const base = API_BASE_URL || BACKEND_URL;
  return `${base}${clean}`;
}

/**
 * Safely parses response JSON without throwing SyntaxError on plain text or HTML 404/500 pages.
 * Prevents "Unexpected token 'N', 'Not Found' is not valid JSON".
 * 
 * @param {Response} response - Fetch API Response
 * @param {any} [fallback] - Fallback object if parsing fails
 * @returns {Promise<any>}
 */
export async function parseResponseSafely(response, fallback = null) {
  if (!response) return fallback;
  try {
    const text = await response.text();
    if (!text || text.trim() === '') {
      return response.ok ? {} : (fallback || { error: `HTTP ${response.status}` });
    }
    try {
      return JSON.parse(text);
    } catch {
      console.warn(`[API] Non-JSON response received from ${response.url || 'endpoint'} (HTTP ${response.status}):`, text.slice(0, 150));
      return fallback || {
        error: !response.ok ? `HTTP ${response.status} error from server` : 'Invalid server response',
        status: response.status,
        message: text.slice(0, 200)
      };
    }
  } catch (err) {
    console.warn('[API] Stream read error:', err.message);
    return fallback;
  }
}

/**
 * Centralized API Fetch Client
 * Automatically prepends backend URL, attaches credentials: 'include',
 * sets Accept: application/json, and ensures consistent cross-origin headers.
 * 
 * @param {string} endpoint - API path (e.g. '/api/complaints')
 * @param {RequestInit} [options] - Fetch options
 * @returns {Promise<Response>}
 */
export async function apiFetch(endpoint, options = {}) {
  const url = getApiUrl(endpoint);
  const opts = {
    credentials: 'include',
    ...options,
    headers: {
      'Accept': 'application/json',
      ...(options.headers || {})
    }
  };
  return fetch(url, opts);
}

/**
 * Global fetch interceptor.
 * Automatically intercepts every fetch('/api/...') and fetch('/uploads/...') call,
 * routing it directly to https://civicresolve-8nve.onrender.com, and safely wraps
 * response.json() so text 404s/500s never crash with SyntaxError.
 */
export function initApiInterceptor() {
  if (typeof window === 'undefined' || !window.fetch) return;
  if (window.__civicApiInterceptorInitialized) return;
  window.__civicApiInterceptorInitialized = true;

  const originalFetch = window.fetch;
  window.fetch = async function (resource, init = {}) {
    let target = resource;
    const method = (init.method || 'GET').toUpperCase();

    if (typeof resource === 'string') {
      if (resource.startsWith('/api/') || resource === '/api' || resource.startsWith('/uploads/') || resource === '/uploads') {
        target = getApiUrl(resource);
      }
    } else if (resource instanceof Request) {
      const url = new URL(resource.url, window.location.origin);
      if (url.origin === window.location.origin && (url.pathname.startsWith('/api') || url.pathname.startsWith('/uploads'))) {
        target = new Request(getApiUrl(`${url.pathname}${url.search}`), resource);
      }
    }

    const options = {
      credentials: 'include',
      ...init
    };

    // Attach timeout if not explicitly provided (30s accommodates Render 15-25s cold starts safely)
    let timeoutId = null;
    if (!options.signal && typeof AbortController !== 'undefined') {
      const controller = new AbortController();
      const timeoutMs = typeof options.timeout === 'number' ? options.timeout : 30000;
      timeoutId = setTimeout(() => {
        controller.abort(new Error(`CivicResolve API request timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      options.signal = controller.signal;
    }

    // Only allow bounded retries for idempotent/safe GET requests on network failures. Never retry mutations (POST/PUT/PATCH/DELETE).
    const isSafeGet = method === 'GET';
    const maxRetries = isSafeGet ? (typeof options.retries === 'number' ? options.retries : 2) : 0;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        const res = await originalFetch.call(this, target, options);
        if (timeoutId) clearTimeout(timeoutId);

        // Enhance res.json to safely handle text/HTML error responses without throwing SyntaxError
        const originalJson = res.json.bind(res);
        res.json = async function () {
          try {
            const text = await res.text();
            if (!text || text.trim() === '') return {};
            try {
              return JSON.parse(text);
            } catch {
              console.warn(`[CivicResolve API] Non-JSON payload received from ${res.url || target} (HTTP ${res.status}):`, text.slice(0, 150));
              return {
                error: `HTTP ${res.status}: ${res.statusText || 'Server error'}`,
                status: res.status,
                message: text.slice(0, 200)
              };
            }
          } catch {
            return originalJson();
          }
        };

        return res;
      } catch (fetchErr) {
        attempt++;
        const isAbort = fetchErr.name === 'AbortError';
        if (isSafeGet && attempt <= maxRetries && !isAbort) {
          console.warn(`[CivicResolve API] Safe GET retry ${attempt}/${maxRetries} for ${target}...`);
          await new Promise(r => setTimeout(r, 2000 * attempt));
          continue;
        }
        if (timeoutId) clearTimeout(timeoutId);
        console.error(`[CivicResolve API] Connection error for ${target}:`, fetchErr.message);
        throw fetchErr;
      }
    }
  };
}
