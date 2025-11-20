import { CMDS, NAVIGATE_TIMEOUT_MS } from '../../constants';

/**
 * Handles navigation requests with promise-based acknowledgement.
 */
export default class NavigateHandler {
  constructor(logger, postMessage) {
    this._logger = logger;
    this._post = postMessage;
    
    this._pending = null;
    this._timer = null;
  }

  /**
   * Execute navigation and return a promise.
   * @param {Object} options - Navigation options
   * @param {Function} ensureReady - Function to ensure widget is ready
   * @returns {Promise}
   */
  execute(options, ensureReady) {
    const { path, widgetType, params, timeout = NAVIGATE_TIMEOUT_MS } = options;

    return new Promise((resolve, reject) => {
      ensureReady(() => {
        if (this._pending) {
          reject(new Error('Navigation already in progress'));
          return;
        }

        const payload = {};
        if (widgetType) payload.widgetType = widgetType;
        if (path) payload.path = path;
        if (params) payload.params = params;

        this._pending = { resolve, reject, payload };
        
        this._post(CMDS.NAVIGATE, payload);

        // Timeout handler
        this._timer = window.setTimeout(() => {
          if (this._pending) {
            this._logger.warn('Navigate acknowledgement timed out');
            const { reject: pendingReject } = this._pending;
            this._pending = null;
            this.clear();
            pendingReject(new Error('Navigation timeout'));
          }
        }, timeout);
      });
    });
  }

  /**
   * Handle acknowledgement from iframe.
   * @param {Object} payload - Response payload
   */
  handleAck(payload) {
    if (!this._pending) return;
    
    const { resolve, reject } = this._pending;
    this._pending = null;
    this.clear();

    // Check if payload indicates success or error
    if (payload?.error || payload?.success === false) {
      this._logger.error('Navigation failed', payload);
      const error = payload?.error || payload?.message || 'Navigation failed';
      reject(new Error(error));
    } else {
      this._logger.log('Navigation successful', payload);
      resolve(payload || {});
    }
  }

  /**
   * Clear timeout timer.
   */
  clear() {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  }

  /**
   * Cleanup on destroy - reject pending operations.
   */
  cleanup() {
    if (this._pending) {
      this._pending.reject(new Error('Widget destroyed'));
      this._pending = null;
    }
    this.clear();
  }

  /**
   * Check if navigation is pending.
   */
  isPending() {
    return this._pending !== null;
  }
}

