export default class Logger {
  constructor(enabled) {
    this.enabled = !!enabled;
  }

  log(...args) {
    if (!this.enabled) return;
    try { console.log('[WidgetSDK]', ...args); } catch (_) {}
  }

  error(...args) {
    try { console.error('[WidgetSDK]', ...args); } catch (_) {}
  }

  warn(...args) {
    try { console.warn('[WidgetSDK]', ...args); } catch (_) {}
  }
}


