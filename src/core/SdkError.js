import { ERR_PREFIX } from '../constants';

/**
 * Structured SDK error with code, message, and context.
 * @extends Error
 */
export default class SdkError extends Error {
  /**
   * @param {string} code - Error code (e.g., 'CONFIG_INVALID')
   * @param {string} message - Human-readable error message
   * @param {Object} [context] - Additional error context/metadata
   */
  constructor(code, message, context = {}) {
    // Support legacy single-argument constructor for backward compatibility
    if (typeof code === 'string' && !message) {
      super(`${ERR_PREFIX}${code}`);
      this.name = 'SdkError';
      this.code = 'UNKNOWN';
      this.context = {};
      return;
    }

    super(`${ERR_PREFIX}[${code}] ${message}`);
    this.name = 'SdkError';
    this.code = code;
    this.context = context;
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SdkError);
    }
  }

  /**
   * Convert error to a plain object for logging/transmission.
   * @returns {Object}
   */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      stack: this.stack
    };
  }

  /**
   * Get user-friendly error message (without prefix).
   * @returns {string}
   */
  getUserMessage() {
    return this.message.replace(ERR_PREFIX, '').replace(/^\[.*?\]\s*/, '');
  }
}


