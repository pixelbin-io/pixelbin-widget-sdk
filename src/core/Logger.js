export default class Logger {
  constructor(enabled) {
    this.enabled = !!enabled;
  }

  log(...args) {
    if (!this.enabled) return;
    try { console.log('[WidgetSDK]', ...args); } catch (_) { /* no-op */ }
  }

  error(...args) {
    try { console.error('[WidgetSDK]', ...args); } catch (_) { /* no-op */ }
  }

  warn(...args) {
    try { console.warn('[WidgetSDK]', ...args); } catch (_) { /* no-op */ }
  }
}
