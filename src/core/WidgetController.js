import { VERSION, EVENTS, CMDS, DEFAULTS, EMBED_ID_RE, ALLOWED_WIDGET_ORIGINS, ERROR_CODES, ERROR_MESSAGES, FATAL_ERROR_CODES } from '../constants';
import { getDomNode, shallowMerge, isObject, makeRequestId } from '../utils';
import EventEmitter from './EventEmitter';
import Logger from './Logger';
import SdkError from './SdkError';
import { createIframe } from '../services/iframe';
import InitHandler from './handlers/InitHandler';
import NavigateHandler from './handlers/NavigateHandler';
import LogoutHandler from './handlers/LogoutHandler';


/**
 * @typedef {Object} BootstrapConfig
 * @property {string|null} [token] Pre-fetched bootstrap token if already available
 * @property {(() => Promise<string>)|null} [getToken] Async function to obtain bootstrap token from integrator server
 * @property {string|null} [endpoint] Fallback endpoint on integrator server that returns a token
 * @property {('GET'|'POST'|string)} [method] HTTP method for endpoint (GET or POST only)
 * @property {Object<string,string>} [headers] Extra headers for endpoint request
 * @property {any} [payload] Request body for POST endpoint calls
 * @property {number} [timeoutMs] Token retrieval timeout in milliseconds
 */

/**
 * @typedef {"ai-editor" | "image-editor" | "ai-headshot" | "batch-editor"} WidgetType
 * Type of widget to embed (e.g., "ai-editor", "image-editor", "ai-headshot", "batch-editor")
 */

/**
 * @typedef {Object} Params
 * @property {WidgetType} widgetType Type of widget to embed
 * @property {'dark'|'light'} [theme] Optional theme (e.g. "dark", "light")
 * @property {'en-IN'|'en-US'} [locale] Optional locale string (e.g. "en-IN", "en-US")
 */

/**
 * @typedef {Object} WidgetConfig
 * @property {HTMLElement|string} domNode Mount element or selector
 * @property {string} widgetOrigin Exact iframe origin, e.g. "https://console.pixelbin.io"
 * @property {string} [embedId] Optional public identifier for the integration
 * @property {Params} [params] Extra query params appended to the iframe URL
 * @property {boolean} [autostart=false] Open automatically after READY
 * @property {string[]} [allowedIframeFeatures] Additional `allow` features for the iframe
 * @property {Object<string,string>} [style] Inline style overrides for the iframe
 * @property {boolean} [debug=false] Enable verbose logging
 * @property {boolean} [autoDestroyOnFatalError=true] Auto-destroy widget on fatal errors
 * @property {BootstrapConfig} [bootstrap] Bootstrap token configuration
 */

/**
 * Main controller for the embedded widget: iframe lifecycle, secure postMessage
 * handshake, and public control/event API.
 */
export default class WidgetController {
  /**
   * Create a new widget controller.
   * @param {WidgetConfig} userConfig Configuration for this widget instance
   */
  constructor(userConfig) {
    this._validateConfig(userConfig);
    this.config = shallowMerge(DEFAULTS, userConfig);
    this._logger = new Logger(!!this.config.debug);
    this._em = new EventEmitter();
    this._ready = false;
    this._destroyed = false;
    this._queue = [];
    this._reinitializing = false;
    
    // Initialize handlers
    this._initHandler = new InitHandler(
      this._logger,
      this._post.bind(this),
      this._emitError.bind(this)
    );
    this._navigateHandler = new NavigateHandler(
      this._logger,
      this._post.bind(this)
    );
    this._logoutHandler = new LogoutHandler(
      this._logger,
      this._post.bind(this)
    );

    this._setupFrameAndInit();
  }

  _setupFrameAndInit() {
    const bs = this.config.bootstrap || {};
    const needToken = (!!bs.getToken || !!bs.endpoint) && !bs.token;
    // Enforce query placement for token with fixed query param name
    const QUERY_PARAM_NAME = 'btToken';

    const setupFrameAndInit = () => {
      // Duplicate prevention
      const mount = getDomNode(this.config.domNode);
      const existing = mount.querySelector('iframe[data-widget-sdk="true"]');
      if (existing) {
        throw new SdkError(
          ERROR_CODES.CONFIG_DUPLICATE_INIT,
          ERROR_MESSAGES[ERROR_CODES.CONFIG_DUPLICATE_INIT],
          { domNode: this.config.domNode }
        );
      }

      // Always place token in query (if available)
      const cfgForIframe = (this.config.bootstrap && this.config.bootstrap.token)
        ? shallowMerge(this.config, {
            params: shallowMerge(this.config.params || {}, {
              [QUERY_PARAM_NAME]: bs.token
            })
          })
        : this.config;
      
      this._logger.log('cfgForIframe', cfgForIframe);

      this.iframe = createIframe(cfgForIframe, (...args) => this._logger.log(...args));

      // Bind message listener
      this._onMessage = this._handleMessage.bind(this);
      window.addEventListener('message', this._onMessage, false);

      // INIT handshake (token is never sent via INIT; always via query)
      const doInit = () => {
        const payload = {
          version: VERSION,
          token: null,
          parentOrigin: window.location.origin,
          params: this.config.params || {}
        };
        if (this.config.embedId != null) payload.embedId = this.config.embedId;

        this._initHandler.start(payload, () => {
          this._ready = true;
          this._flushQueue();
          this._em.emit('ready');
          if (this.config.autostart) this.open();
        });
      };

      if (this.iframe.contentWindow && this.iframe.contentDocument && this.iframe.contentDocument.readyState === 'complete') {
        doInit();
      } else {
        this.iframe.addEventListener('load', doInit, { once: true });
      }
    };

    if (needToken && !(this.config.bootstrap && this.config.bootstrap.token)) {
      // Need token before iframe to put into URL
      this._resolveToken()
        .then((tk) => { this.config.bootstrap.token = tk; setupFrameAndInit(); })
        .catch((e) => {
          this._logger.error('Token error', e);
          // Auth errors are NOT fatal by default - integrator can retry
          this._emitError(e, false);
        });
    } else {
      setupFrameAndInit();
    }
  }

  /**
   * Validate user configuration and throw descriptive errors when invalid.
   * @param {WidgetConfig} u Configuration object
   * @private
   */
  _validateConfig(u) {
    if (!u) {
      throw new SdkError(
        ERROR_CODES.CONFIG_MISSING,
        ERROR_MESSAGES[ERROR_CODES.CONFIG_MISSING]
      );
    }
    if (!u.domNode) {
      throw new SdkError(
        ERROR_CODES.CONFIG_INVALID_DOM_NODE,
        ERROR_MESSAGES[ERROR_CODES.CONFIG_INVALID_DOM_NODE],
        { provided: u.domNode }
      );
    }
    if (!u.widgetOrigin) {
      throw new SdkError(
        ERROR_CODES.CONFIG_INVALID_ORIGIN,
        'widgetOrigin is required (e.g. https://console.pixelbin.io)',
        { allowed: ALLOWED_WIDGET_ORIGINS }
      );
    }
    if (ALLOWED_WIDGET_ORIGINS.indexOf(String(u.widgetOrigin)) === -1) {
      throw new SdkError(
        ERROR_CODES.CONFIG_INVALID_ORIGIN,
        ERROR_MESSAGES[ERROR_CODES.CONFIG_INVALID_ORIGIN],
        { provided: u.widgetOrigin, allowed: ALLOWED_WIDGET_ORIGINS }
      );
    }
    if (u.embedId != null) {
      const embedId = String(u.embedId);
      if (!EMBED_ID_RE.test(embedId)) {
        throw new SdkError(
          ERROR_CODES.CONFIG_INVALID_EMBED_ID,
          ERROR_MESSAGES[ERROR_CODES.CONFIG_INVALID_EMBED_ID],
          { provided: embedId, pattern: EMBED_ID_RE.toString() }
        );
      }
    }
    if (u.bootstrap) {
      const b = u.bootstrap;
      if (b.getToken && typeof b.getToken !== 'function') {
        throw new SdkError(
          ERROR_CODES.AUTH_BOOTSTRAP_GETTOKEN_INVALID,
          ERROR_MESSAGES[ERROR_CODES.AUTH_BOOTSTRAP_GETTOKEN_INVALID],
          { type: typeof b.getToken }
        );
      }
      if (b.endpoint && typeof b.endpoint !== 'string') {
        throw new SdkError(
          ERROR_CODES.AUTH_BOOTSTRAP_ENDPOINT_INVALID,
          ERROR_MESSAGES[ERROR_CODES.AUTH_BOOTSTRAP_ENDPOINT_INVALID],
          { type: typeof b.endpoint }
        );
      }
      if (b.method && !['GET', 'POST'].includes(String(b.method).toUpperCase())) {
        throw new SdkError(
          ERROR_CODES.AUTH_BOOTSTRAP_METHOD_INVALID,
          ERROR_MESSAGES[ERROR_CODES.AUTH_BOOTSTRAP_METHOD_INVALID],
          { provided: b.method, allowed: ['GET', 'POST'] }
        );
      }
    }
  }

  /**
   * Send a postMessage to the iframe with strict target origin.
   * @param {string} type Message type
   * @param {any} payload Payload body
   * @private
   */
  _post(type, payload) {
    if (this._destroyed) return;
    const targetOrigin = this.config.widgetOrigin;
    const message = { type, payload: payload || {}, requestId: makeRequestId() };
    this._logger.log('postMessage →', targetOrigin, message);
    try {
      this.iframe.contentWindow.postMessage(message, targetOrigin);
    } catch (e) {
      this._logger.error('postMessage failed', e);
      const error = new SdkError(
        ERROR_CODES.COMM_POSTMESSAGE_FAILED,
        ERROR_MESSAGES[ERROR_CODES.COMM_POSTMESSAGE_FAILED],
        { type, originalError: e.message }
      );
      this._emitError(error);
    }
  }

  /**
   * Emit error event and handle fatal errors.
   * @param {SdkError|Error} error
   * @param {boolean} [fatal] Override fatal detection
   * @private
   */
  _emitError(error, fatal = null) {
    const errorPayload = error instanceof SdkError
      ? { code: error.code, message: error.getUserMessage(), context: error.context }
      : { code: ERROR_CODES.UNKNOWN, message: error.message, context: {} };

    this._em.emit('error', errorPayload);

    // Determine if this is a fatal error
    const isFatal = fatal !== null 
      ? fatal 
      : (error instanceof SdkError && FATAL_ERROR_CODES.has(error.code));

    const autoDestroy = this.config.autoDestroyOnFatalError !== false; // Default true

    if (isFatal && autoDestroy && !this._destroyed) {
      this._logger.warn(`Fatal error [${errorPayload.code}]: Auto-destroying widget`);
      // Small delay to ensure error event handlers run first
      setTimeout(() => {
        if (!this._destroyed) {
          this._finishDestroy();
        }
      }, 0);
    }
  }

  /**
   * Handle messages from the iframe and emit SDK-level events.
   * @param {MessageEvent} event browser message event
   * @private
   */
  _handleMessage(event) {
    if (event.source !== this.iframe.contentWindow) return;
    if (event.origin !== this.config.widgetOrigin) return;
    const data = event.data || {};
    if (!data || !data.type) return;
    this._logger.log('message ←', event.origin, data);
    switch (data.type) {
      case EVENTS.INIT_ACK:
        this._initHandler.handleAck();
        break;
      case EVENTS.READY:
        this._initHandler.handleReady();
        break;
      case EVENTS.OPENED:
        this._em.emit('open');
        this._show();
        break;
      case EVENTS.CLOSED:
        this._em.emit('close');
        this._hide();
        break;
      case EVENTS.ERROR:
        this._em.emit('error', data.payload || {});
        break;
      case EVENTS.LOGOUT:
        this._em.emit('logout', data.payload);
        this._logoutHandler.handleAck();
        break;
      case EVENTS.NAVIGATED:
        this._em.emit('navigate', data.payload);
        this._navigateHandler.handleAck(data.payload);
        break;
      case EVENTS.SESSION_EXPIRED:
        this._handleSessionExpired(data.payload);
        break;
      default:
        break;
    }
  }

  /**
   * Handle session expiration - reinitialize widget with new token.
   * @private
   */
  _handleSessionExpired(payload) {
    if (this._reinitializing || this._destroyed) return;
    
    this._logger.warn('Session expired, reinitializing widget...', payload);
    this._reinitializing = true;
    
    // Reset state
    this._ready = false;
    this._queue = [];
    
    // Cleanup existing iframe
    try {
      window.removeEventListener('message', this._onMessage, false);
      if (this.iframe && this.iframe.parentNode) {
        this.iframe.parentNode.removeChild(this.iframe);
      }
    } catch (e) {
      this._logger.error('Error cleaning up during reinitialization', e);
    }
    
    // Clear token to force refresh
    if (this.config.bootstrap) {
      this.config.bootstrap.token = null;
    }
    
    // Reinitialize
    setTimeout(() => {
      this._reinitializing = false;
      this._setupFrameAndInit();
    }, 100);
  }

  /**
   * Flush any queued actions once iframe is ready.
   * @private
   */
  _flushQueue() {
    const q = this._queue.splice(0, this._queue.length);
    for (let i = 0; i < q.length; i++) q[i]();
  }

  /**
   * Enqueue an action until ready; otherwise run immediately.
   * @param {Function} fn
   * @private
   */
  _ensureReady(fn) {
    if (this._ready) fn(); else this._queue.push(fn);
  }

  _show() { this.iframe.style.display = 'block'; }
  _hide() { this.iframe.style.display = 'none'; }

  // Public API
  /**
   * Open the widget with optional image data
   * @param {Object} [options] - Open options
   * @param {string} [options.imageUrl] - URL of the image to edit
   * @param {string} [options.widgetType] - Optional widget type to open
   * @returns {WidgetController} this instance for chaining
   */
  open(options = {}) {
    this._ensureReady(() => {
      const payload = {};

      // Handle imageUrl (regular URL)
      if (options.imageUrl && typeof options.imageUrl === 'string') {
        payload.imageUrl = options.imageUrl;
      }

      // Handle widgetType
      if (options.widgetType) {
        payload.widgetType = options.widgetType;
      }

      this._post(CMDS.OPEN, payload);
    });
    return this;
  }

  /** Close the widget (requests CLOSE and sets display:none) */
  close() {
    this._ensureReady(() => { this._post(CMDS.CLOSE); this._hide(); });
    return this;
  }

  /**
   * Navigate to a different widget type.
   * Returns a Promise that resolves when navigation succeeds or rejects on failure.
   * @param {Object} options - Navigation options
   * @param {string} [options.widgetType] - Widget type to navigate to
   * @param {number} [options.timeout] - Override default timeout
   * @returns {Promise<Object>} Resolves with navigation result payload
   */
  navigate(options) {
    return this._navigateHandler.execute(options || {}, this._ensureReady.bind(this));
  }

  /**
   * Shallow-merge a config patch at runtime.
   * @param {Partial<WidgetConfig>|Object} patch
   */
  updateConfig(patch) {
    if (!isObject(patch)) return this;
    this.config = shallowMerge(this.config, patch);
    return this;
  }

  /** Register event listener */
  on(evt, cb) { this._em.on(evt, cb); return this; }
  /** Remove event listener */
  off(evt, cb) { this._em.off(evt, cb); return this; }
  /** Register one-time event listener */
  once(evt, cb) { this._em.once(evt, cb); return this; }

  /** Destroy and cleanup iframe + listeners */
  destroy(options = {}) {
    const { force = false } = options;
    if (this._destroyed) return;
    
    if (force || !this.iframe || !this.iframe.contentWindow) {
      this._finishDestroy();
      return;
    }
    
    if (this._logoutHandler.isPending()) return;
    
    this._logoutHandler.start(() => {
      this._finishDestroy();
    });
  }

  _finishDestroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    this._ready = false;
    this._reinitializing = false;
    this._queue = [];
    
    // Cleanup all handlers
    this._initHandler.clear();
    this._logoutHandler.clear();
    this._navigateHandler.cleanup();

    try { window.removeEventListener('message', this._onMessage, false); } catch (_) { /* no-op */ }
    try { if (this.iframe && this.iframe.parentNode) this.iframe.parentNode.removeChild(this.iframe); } catch (_) { /* no-op */ }
    this._em.emit('destroy');
  }

  /**
   * Resolve a bootstrap token using either getToken() or endpoint fetch.
   * @private
   */
  async _resolveToken() {
    const bs = this.config.bootstrap || {};
    const { getToken, endpoint, method = 'GET', headers = {}, payload = null, timeoutMs = 10000 } = bs;

    let promise;
    if (typeof getToken === 'function') {
      // Integrator calls their server using their auth to obtain bootstrap token
      promise = Promise.resolve().then(() => getToken());
    } else if (typeof endpoint === 'string' && endpoint) {
      // Fallback: SDK calls client's server endpoint (no direct API token exposure)
      const upper = (method || 'GET').toUpperCase();
      if (upper !== 'GET' && upper !== 'POST') {
        throw new SdkError(
          ERROR_CODES.AUTH_BOOTSTRAP_METHOD_INVALID,
          ERROR_MESSAGES[ERROR_CODES.AUTH_BOOTSTRAP_METHOD_INVALID],
          { provided: method, allowed: ['GET', 'POST'] }
        );
      }
      promise = fetch(endpoint, {
        method: upper,
        headers: headers || {},
        body: (upper === 'POST' && payload != null)
          ? (typeof payload === 'string' ? payload : JSON.stringify(payload))
          : undefined
      }).then(async (res) => {
        if (!res.ok) {
          throw new SdkError(
            ERROR_CODES.AUTH_ENDPOINT_FAILED,
            ERROR_MESSAGES[ERROR_CODES.AUTH_ENDPOINT_FAILED],
            { status: res.status, statusText: res.statusText, endpoint }
          );
        }
        const data = await res.json().catch(() => ({}));
        const token = data && data.token;
        if (!token) {
          throw new SdkError(
            ERROR_CODES.AUTH_ENDPOINT_NO_TOKEN,
            ERROR_MESSAGES[ERROR_CODES.AUTH_ENDPOINT_NO_TOKEN],
            { endpoint, responseKeys: Object.keys(data) }
          );
        }
        return token;
      });
    } else {
      throw new SdkError(
        ERROR_CODES.AUTH_TOKEN_SOURCE_INVALID,
        ERROR_MESSAGES[ERROR_CODES.AUTH_TOKEN_SOURCE_INVALID],
        { hasGetToken: !!getToken, hasEndpoint: !!endpoint }
      );
    }

    const token = await this._withTimeout(promise, timeoutMs);
    if (!token || typeof token !== 'string') {
      throw new SdkError(
        ERROR_CODES.AUTH_TOKEN_INVALID,
        ERROR_MESSAGES[ERROR_CODES.AUTH_TOKEN_INVALID],
        { tokenType: typeof token, tokenValue: token ? '[REDACTED]' : 'null' }
      );
    }
    return token;
  }

  /**
   * Wrap a promise with a timeout.
   * @private
   */
  _withTimeout(promise, ms) {
    if (!ms) return promise;
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => {
        reject(new SdkError(
          ERROR_CODES.AUTH_TOKEN_TIMEOUT,
          ERROR_MESSAGES[ERROR_CODES.AUTH_TOKEN_TIMEOUT],
          { timeoutMs: ms }
        ));
      }, ms);
      promise.then(
        (v) => { clearTimeout(t); resolve(v); },
        (e) => { clearTimeout(t); reject(e); }
      );
    });
  }
}
