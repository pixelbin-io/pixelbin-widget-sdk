import { ERR_PREFIX } from '../constants';

export const isString = (x) => typeof x === 'string';
export const isObject = (x) => x && typeof x === 'object';

export const getDomNode = (target) => {
  if (target instanceof HTMLElement) return target;
  if (isString(target)) {
    const el = document.querySelector(target);
    if (!el) throw new Error(`${ERR_PREFIX}Invalid DOM node: selector not found: ${target}`);
    return el;
  }
  throw new Error(`${ERR_PREFIX}Invalid DOM node: domNode must be an element or selector`);
};

export const shallowMerge = (a = {}, b = {}) => {
  const out = {};
  for (const k in a) if (Object.prototype.hasOwnProperty.call(a, k)) out[k] = a[k];
  for (const k in b) if (Object.prototype.hasOwnProperty.call(b, k)) out[k] = b[k];
  return out;
};

export const makeRequestId = () => `w_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;

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


