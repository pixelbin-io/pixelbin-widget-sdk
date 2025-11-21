// Constants for the Widget SDK

export const VERSION = '1.0.0';
export const ERR_PREFIX = 'Widget SDK: ';

export const EMBED_ID_RE = /^[A-Za-z0-9._-]{3,128}$/;

// Allowed iframe origins for the widget
export const ALLOWED_WIDGET_ORIGINS = [
  'https://console.pixelbin.io',
  'https://console.pixelbinz0.de',
];

export const EVENTS = {
  READY: 'WIDGET_READY',
  PING: 'WIDGET_PING',
  OPENED:'WIDGET_OPENED',
  CLOSED: 'WIDGET_CLOSED',
  ERROR: 'WIDGET_ERROR',
  LOGOUT: 'WIDGET_LOGOUT',
  NAVIGATED: 'WIDGET_NAVIGATED',
  SESSION_EXPIRED: 'WIDGET_SESSION_EXPIRED'
};

export const CMDS = {
  INIT: 'SDK_INIT',
  OPEN: 'SDK_OPEN',
  CLOSE: 'SDK_CLOSE',
  NAVIGATE: 'SDK_NAVIGATE',
  PING: 'SDK_PING',
  LOGOUT: 'SDK_LOGOUT'
};

export const DEFAULTS = {
  params: {
    widgetType: 'ai-editor',
  },
  autostart: false,
  autoDestroyOnFatalError: true,  // Auto-destroy widget on fatal errors
  allowedIframeFeatures: [
    'clipboard-read',
    'clipboard-write',
    'camera',
    'microphone',
    'geolocation',
    'fullscreen',
    'web-share',
    'autoplay',
    'display-capture',
  ],
  style: {
    position: 'relative',
    width: '100%',
    height: '100%',
    border: '0',
    borderRadius: '12px',
    display: 'none',
  },
  debug: false,
  routePath : "/widget",
  // Bootstrap token configuration
  bootstrap: {
    token: null,             // if a token is already available
    getToken: null,          // async () => string; client calls their server with their auth
    endpoint: null,          // fallback: SDK fetches token from client's server URL
    method: 'GET',           // HTTP method for endpoint (GET or POST only)
    headers: {},             // extra headers when calling endpoint
    payload: null,           // body for non-GET calls (object or string)
    timeoutMs: 10000         // token retrieval timeout
  }
};


export const INIT_RETRY_INTERVAL_MS = 500;
export const INIT_MAX_ATTEMPTS = 10;
export const LOGOUT_TIMEOUT_MS = 2000;
export const NAVIGATE_TIMEOUT_MS = 5000;

/**
 * Error codes that trigger automatic widget destruction.
 * These are unrecoverable errors where the widget cannot function.
 */
export const FATAL_ERROR_CODES = new Set([
  'CONFIG_MISSING',
  'CONFIG_INVALID_DOM_NODE',
  'CONFIG_INVALID_ORIGIN',
  'CONFIG_INVALID_EMBED_ID',
  'CONFIG_DUPLICATE_INIT',
  'COMM_INIT_TIMEOUT',
  // Auth errors are NOT fatal - integrator might want to retry with new token
]);

/**
 * Standardized error codes for SDK operations.
 * Format: CATEGORY_SPECIFIC_REASON
 */
export const ERROR_CODES = {
  // Configuration errors (1xxx)
  CONFIG_MISSING: 'CONFIG_MISSING',
  CONFIG_INVALID_DOM_NODE: 'CONFIG_INVALID_DOM_NODE',
  CONFIG_INVALID_ORIGIN: 'CONFIG_INVALID_ORIGIN',
  CONFIG_INVALID_EMBED_ID: 'CONFIG_INVALID_EMBED_ID',
  CONFIG_DUPLICATE_INIT: 'CONFIG_DUPLICATE_INIT',
  
  // Bootstrap/Authentication errors (2xxx)
  AUTH_TOKEN_MISSING: 'AUTH_TOKEN_MISSING',
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  AUTH_TOKEN_TIMEOUT: 'AUTH_TOKEN_TIMEOUT',
  AUTH_TOKEN_SOURCE_INVALID: 'AUTH_TOKEN_SOURCE_INVALID',
  AUTH_BOOTSTRAP_GETTOKEN_INVALID: 'AUTH_BOOTSTRAP_GETTOKEN_INVALID',
  AUTH_BOOTSTRAP_ENDPOINT_INVALID: 'AUTH_BOOTSTRAP_ENDPOINT_INVALID',
  AUTH_BOOTSTRAP_METHOD_INVALID: 'AUTH_BOOTSTRAP_METHOD_INVALID',
  AUTH_ENDPOINT_FAILED: 'AUTH_ENDPOINT_FAILED',
  AUTH_ENDPOINT_NO_TOKEN: 'AUTH_ENDPOINT_NO_TOKEN',
  
  // Communication errors (3xxx)
  COMM_INIT_TIMEOUT: 'COMM_INIT_TIMEOUT',
  COMM_POSTMESSAGE_FAILED: 'COMM_POSTMESSAGE_FAILED',
  COMM_LOGOUT_TIMEOUT: 'COMM_LOGOUT_TIMEOUT',
  COMM_INVALID_ORIGIN: 'COMM_INVALID_ORIGIN',
  
  // Runtime errors (4xxx)
  RUNTIME_DESTROYED: 'RUNTIME_DESTROYED',
  RUNTIME_NOT_READY: 'RUNTIME_NOT_READY',
  RUNTIME_INVALID_URL: 'RUNTIME_INVALID_URL',
  
  // Network errors (5xxx)
  NETWORK_FETCH_FAILED: 'NETWORK_FETCH_FAILED',
  NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',
  
  // Unknown/Generic
  UNKNOWN: 'UNKNOWN'
};

/**
 * User-friendly error messages mapped to error codes.
 */
export const ERROR_MESSAGES = {
  [ERROR_CODES.CONFIG_MISSING]: 'Configuration object is required',
  [ERROR_CODES.CONFIG_INVALID_DOM_NODE]: 'Invalid domNode: must be an HTMLElement or valid CSS selector',
  [ERROR_CODES.CONFIG_INVALID_ORIGIN]: 'Invalid widgetOrigin: must be an allowed origin URL',
  [ERROR_CODES.CONFIG_INVALID_EMBED_ID]: 'Invalid embedId format: must match pattern [A-Za-z0-9._-]{3,128}',
  [ERROR_CODES.CONFIG_DUPLICATE_INIT]: 'Widget already initialized on this domNode',
  
  [ERROR_CODES.AUTH_TOKEN_MISSING]: 'Bootstrap token is required but not provided',
  [ERROR_CODES.AUTH_TOKEN_INVALID]: 'Bootstrap token is invalid or malformed',
  [ERROR_CODES.AUTH_TOKEN_TIMEOUT]: 'Bootstrap token request timed out',
  [ERROR_CODES.AUTH_TOKEN_SOURCE_INVALID]: 'No valid token source configured (provide getToken or endpoint)',
  [ERROR_CODES.AUTH_BOOTSTRAP_GETTOKEN_INVALID]: 'bootstrap.getToken must be a function',
  [ERROR_CODES.AUTH_BOOTSTRAP_ENDPOINT_INVALID]: 'bootstrap.endpoint must be a valid URL string',
  [ERROR_CODES.AUTH_BOOTSTRAP_METHOD_INVALID]: 'bootstrap.method must be GET or POST',
  [ERROR_CODES.AUTH_ENDPOINT_FAILED]: 'Token endpoint request failed',
  [ERROR_CODES.AUTH_ENDPOINT_NO_TOKEN]: 'Token endpoint did not return a valid token',
  
  [ERROR_CODES.COMM_INIT_TIMEOUT]: 'Widget initialization handshake timed out',
  [ERROR_CODES.COMM_POSTMESSAGE_FAILED]: 'Failed to send message to widget iframe',
  [ERROR_CODES.COMM_LOGOUT_TIMEOUT]: 'Widget logout acknowledgement timed out',
  [ERROR_CODES.COMM_INVALID_ORIGIN]: 'Message origin does not match widget origin',
  
  [ERROR_CODES.RUNTIME_DESTROYED]: 'Widget has been destroyed',
  [ERROR_CODES.RUNTIME_NOT_READY]: 'Widget is not ready yet',
  [ERROR_CODES.RUNTIME_INVALID_URL]: 'Invalid URL format for widget origin',
  
  [ERROR_CODES.NETWORK_FETCH_FAILED]: 'Network request failed',
  [ERROR_CODES.NETWORK_TIMEOUT]: 'Network request timed out',
  
  [ERROR_CODES.UNKNOWN]: 'An unknown error occurred'
};
