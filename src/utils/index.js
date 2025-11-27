import { ERR_PREFIX } from '../constants';

/**
 * Check if value is a string
 * @param {any} x 
 * @returns {boolean}
 */
export const isString = (x) => typeof x === 'string';

/**
 * Check if value is an object (and not null)
 * @param {any} x 
 * @returns {boolean}
 */
export const isObject = (x) => x && typeof x === 'object';

/**
 * Get a DOM element from a selector or element reference
 * @param {string|HTMLElement} target 
 * @returns {HTMLElement}
 * @throws {Error} if node not found or invalid type
 */
export const getDomNode = (target) => {
  if (target instanceof HTMLElement) return target;
  if (isString(target)) {
    const el = document.querySelector(target);
    if (!el) throw new Error(`${ERR_PREFIX}Invalid DOM node: selector not found: ${target}`);
    return el;
  }
  throw new Error(`${ERR_PREFIX}Invalid DOM node: domNode must be an element or selector`);
};

/**
 * Shallow merge two objects (b overrides a)
 * @param {Object} a - Base object
 * @param {Object} b - Override object
 * @returns {Object} New merged object
 */
export const shallowMerge = (a = {}, b = {}) => {
  const out = {};
  for (const k in a) if (Object.prototype.hasOwnProperty.call(a, k)) out[k] = a[k];
  for (const k in b) if (Object.prototype.hasOwnProperty.call(b, k)) out[k] = b[k];
  return out;
};

/**
 * Generate a unique request ID
 * @returns {string}
 */
export const makeRequestId = () => `w_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;

/**
 * Construct a URL with query parameters
 * @param {string} origin - Base origin (must start with http/https)
 * @param {string} routePath - Path to append
 * @param {Object} params - Query parameters
 * @returns {string} Full URL
 */
export const buildUrl = (origin, routePath, params) => {
  if (!/^https?:\/\//.test(origin)) throw new Error(`${ERR_PREFIX}widgetOrigin must be absolute (https://...)`);
  const pathPart = isString(routePath) && routePath.length > 0
    ? (routePath.startsWith('/') ? routePath : `/${routePath}`)
    : '';
  const url = new URL(origin.replace(/\/$/, '') + pathPart);
  Object.keys(params || {}).forEach((key) => {
    const value = params[key];
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  });
  return url.toString();
};






