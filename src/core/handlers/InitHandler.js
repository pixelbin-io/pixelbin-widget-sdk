import { CMDS, INIT_RETRY_INTERVAL_MS, INIT_MAX_ATTEMPTS, ERROR_CODES, ERROR_MESSAGES } from '../../constants';
import SdkError from '../SdkError';

/**
 * Handles widget initialization handshake with retry logic.
 */
export default class InitHandler {
  constructor(logger, postMessage, emitError) {
    this._logger = logger;
    this._post = postMessage;
    this._emitError = emitError;
    
    this._initAck = false;
    this._initRetryHandle = null;
    this._initRetryAttempts = 0;
  }

  /**
   * Start the initialization handshake with retry logic.
   * @param {Object} payload - Init payload
   * @param {Function} onReady - Callback when ready
   */
  start(payload, onReady) {
    this._initAck = false;
    this._initRetryAttempts = 0;
    this._onReady = onReady;

    const sendInit = () => {
      this._logger.log('INIT attempt', this._initRetryAttempts + 1);
      this._post(CMDS.INIT, payload);
      
      if (this._initAck) {
        this.clear();
        return;
      }

      if (this._initRetryAttempts >= INIT_MAX_ATTEMPTS - 1) {
        this.clear();
        this._logger.error('INIT handshake timed out');
        const error = new SdkError(
          ERROR_CODES.COMM_INIT_TIMEOUT,
          ERROR_MESSAGES[ERROR_CODES.COMM_INIT_TIMEOUT],
          { attempts: INIT_MAX_ATTEMPTS, intervalMs: INIT_RETRY_INTERVAL_MS }
        );
        this._emitError(error);
        return;
      }

      this._initRetryAttempts += 1;
      this.clear();
      this._initRetryHandle = window.setTimeout(sendInit, INIT_RETRY_INTERVAL_MS);
    };

    this.clear();
    sendInit();
  }

  /**
   * Handle READY acknowledgement from iframe.
   */
  handleReady() {
    this._initAck = true;
    this.clear();
    if (this._onReady) {
      this._onReady();
    }
  }

  /**
   * Clear retry timer.
   */
  clear() {
    if (this._initRetryHandle) {
      clearTimeout(this._initRetryHandle);
      this._initRetryHandle = null;
    }
  }

  /**
   * Check if init is acknowledged.
   */
  isAcknowledged() {
    return this._initAck;
  }
}

