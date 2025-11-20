import { CMDS, LOGOUT_TIMEOUT_MS } from '../../constants';

/**
 * Handles logout flow before widget destruction.
 */
export default class LogoutHandler {
  constructor(logger, postMessage) {
    this._logger = logger;
    this._post = postMessage;
    
    this._pending = false;
    this._timer = null;
  }

  /**
   * Start logout sequence.
   * @param {Function} onComplete - Callback when logout completes
   * @returns {boolean} - true if logout started, false if already pending
   */
  start(onComplete) {
    if (this._pending) {
      return false;
    }

    this._pending = true;
    this._onComplete = onComplete;

    try {
      this._post(CMDS.LOGOUT, { reason: 'destroy' });
    } catch (e) {
      this._logger.error('Failed to send LOGOUT', e);
      this._pending = false;
      if (onComplete) onComplete();
      return false;
    }

    this._timer = window.setTimeout(() => {
      this._logger.warn('LOGOUT acknowledgement timed out; forcing destroy');
      this._pending = false;
      if (this._onComplete) {
        this._onComplete();
      }
    }, LOGOUT_TIMEOUT_MS);

    return true;
  }

  /**
   * Handle acknowledgement from iframe.
   */
  handleAck() {
    if (!this._pending) return;
    
    this._pending = false;
    this.clear();
    
    if (this._onComplete) {
      this._onComplete();
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
   * Check if logout is pending.
   */
  isPending() {
    return this._pending;
  }
}

