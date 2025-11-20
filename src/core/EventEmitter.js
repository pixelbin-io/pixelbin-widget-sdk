/**
 * Minimal synchronous event emitter.
 * - Listeners are invoked in registration order.
 * - Exceptions thrown by listeners are re-thrown asynchronously to avoid
 *   interrupting the emitter loop.
 */
export default class EventEmitter {
  /**
   * Create a new emitter instance.
   */
  constructor() {
    /** @type {Record<string, Array<(...args: any[]) => void>>} */
    this._ev = {};
  }

  /**
   * Subscribe to an event.
   * @param {string} event - Event name
   * @param {(...args: any[]) => void} fn - Listener function
   * @returns {this}
   */
  on(event, fn) {
    (this._ev[event] = this._ev[event] || []).push(fn);
    return this;
  }

  /**
   * Unsubscribe a specific listener from an event.
   * No-op if the listener is not registered.
   * @param {string} event - Event name
   * @param {(...args: any[]) => void} fn - Listener function to remove
   * @returns {this}
   */
  off(event, fn) {
    const arr = this._ev[event];
    if (!arr) return this;
    this._ev[event] = arr.filter((f) => f !== fn);
    return this;
  }

  /**
   * Subscribe to an event once; auto-unsubscribes after first invocation.
   * @param {string} event - Event name
   * @param {(...args: any[]) => void} fn - Listener function
   * @returns {this}
   */
  once(event, fn) {
    const wrap = (...args) => {
      try { fn(...args); } finally { this.off(event, wrap); }
    };
    return this.on(event, wrap);
  }

  /**
   * Emit an event to all current listeners.
   * @param {string} event - Event name
   * @param {...any} args - Arguments passed to listeners
   * @returns {void}
   */
  emit(event, ...args) {
    const arr = this._ev[event] || [];
    arr.forEach((fn) => {
      try { fn(...args); } catch (e) { setTimeout(() => { throw e; }, 0); }
    });
  }
}


