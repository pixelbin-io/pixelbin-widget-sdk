# Pixelbin Widget SDK – API Summary

Reference guide for the public API exposed by `pixelbin-widget-sdk`. The SDK embeds a secure iframe, negotiates bootstrap tokens, and exposes a small imperative/evented interface for host applications.

All examples below use the ESM/Node style import. When consuming the bundle directly from a `<script>` tag, the library exposes a global `window.WidgetSDK.init` helper (see `docs/CDN_INTEGRATION.md`).

> **Tip:** Start with the [Documentation Overview](./README.md) for a guide on where to find what.

---

## Initialization

### `init(config)`

Creates and initializes a new widget instance.

```js
import { init } from 'pixelbin-widget-sdk';

const widget = init({
  domNode: '#widget-container',
  widgetOrigin: 'https://console.pixelbin.io',
  params: { widgetType: 'ai-editor' },
  autostart: false,
  debug: false,
  bootstrap: {
    getToken: async () => {
      const res = await fetch('/api/bootstrap', { credentials: 'include' });
      const { token } = await res.json();
      return token;
    }
  }
});
```

**Returns**: `WidgetController` instance  
**Static**: `init.VERSION` exposes the SDK version string.

---

## Widget instance methods

### `widget.open()`

Requests the iframe to open (sends `SDK_OPEN`) and forces `display: block`.

```js
widget.open();
```

**Returns**: `this`

---

### `widget.close()`

Requests the iframe to close (sends `SDK_CLOSE`) and hides it (`display: none`).

```js
widget.close();
```

**Returns**: `this`

---

### `widget.navigate(pathOrOptions)`

Navigates to a different widget type or path. Returns a promise that resolves when the iframe acknowledges navigation or rejects on timeout/failure.

```js
await widget.navigate('/embed/editor');

await widget.navigate({
  widgetType: 'image-editor',
  params: { theme: 'dark' },
  timeout: 8000
});
```

**Parameters**:
- `pathOrOptions` (`string | { widgetType?, path?, params?, timeout? }`)

**Returns**: `Promise<Object>` (payload emitted via the `navigate` event)

---

### `widget.updateConfig(patch)`

Shallow-merges runtime config changes.

```js
widget.updateConfig({
  style: { width: '70vw' },
  params: { theme: 'light' }
});
```

**Parameters**: `patch` (`Object`)  
**Returns**: `this`

---

### `widget.destroy(options?)`

Destroys the instance by sending a logout command, waiting for acknowledgement (unless forced), and removing iframe/listeners.

```js
widget.destroy();          // graceful logout
widget.destroy({ force: true });  // skip logout wait
```

**Parameters**: `options.force` (`boolean`, default `false`)  
**Returns**: `void`

---

### Event emitter helpers

- `widget.on(event, handler)`
- `widget.once(event, handler)`
- `widget.off(event, handler)`

They proxy the internal `EventEmitter` and support chaining.

---

## Events reference

| Event    | Payload                         | Notes |
|----------|---------------------------------|-------|
| `ready`  | `void`                          | Fired after the INIT handshake completes. |
| `open`   | `void`                          | Widget reported `WIDGET_OPENED` and SDK forced display on. |
| `close`  | `void`                          | Widget reported `WIDGET_CLOSED`; SDK hides iframe. |
| `navigate` | `Object`                      | Raw payload from the iframe for the navigation request (success or failure info). |
| `logout` | `Object \| undefined`          | Emitted when the iframe confirms logout. |
| `error`  | `{ code, message, context }`    | SDK or widget errors. Fatal codes trigger auto-destroy unless disabled. |
| `destroy`| `void`                          | Emitted after the controller cleans itself up. |

Session-expiration messages are handled internally—the SDK reinitializes automatically without emitting an external event.

---

## Configuration reference

### Required

- **`domNode`** (`HTMLElement | string`): Mount element or selector (unique per instance).
- **`widgetOrigin`** (`string`): Exact iframe origin. Allowed values: `https://console.pixelbin.io`, `https://console.pixelbinz0.de`, `https://local.pixelbinz0.de:9090`.

### Optional

- **`routePath`** (`string`): Default `/widget`. Route appended after the origin.
- **`params`** (`Object`): Query params (e.g., `widgetType`, `theme`, `locale`).
- **`autostart`** (`boolean`): If `true`, automatically calls `open()` after `ready`.
- **`allowedIframeFeatures`** (`string[]`): Additional values for the iframe `allow` attribute (merged with defaults).
- **`style`** (`Object`): Inline CSS overrides merged with the default modal styles.
- **`debug`** (`boolean`): Enable verbose logs.
- **`autoDestroyOnFatalError`** (`boolean`): Defaults to `true`. Prevent to keep the iframe alive on fatal errors.

### Bootstrap token configuration

- **`bootstrap.token`** (`string`): Pre-fetched bootstrap token (placed into the iframe query string before load).
- **`bootstrap.getToken`** (`() => Promise<string>`): Preferred async callback where you call your backend endpoint that owns the Pixelbin API key.
- **`bootstrap.endpoint`** (`string`): Optional fallback to let the SDK fetch from your endpoint directly (`method`, `headers`, `payload`, `timeoutMs` are supported).
- **`bootstrap.timeoutMs`** (`number`): Default `10000`. Applied to both `getToken` and `endpoint` flows.

See `docs/BOOTSTRAP_TOKEN_GUIDE.md` for the complete bootstrap-token walkthrough.

---

## Usage patterns

### Basic usage

```js
const widget = init({
  domNode: '#widget',
  widgetOrigin: 'https://console.pixelbin.io',
  params: { widgetType: 'ai-editor' }
});

widget.on('ready', () => widget.open());
```

### Token via backend endpoint

```js
const widget = init({
  domNode: '#widget',
  widgetOrigin: 'https://console.pixelbin.io',
  bootstrap: {
    getToken: async () => {
      const res = await fetch('/api/pixelbin/bootstrap', { credentials: 'include' });
      if (!res.ok) throw new Error('Bootstrap token failed');
      return (await res.json()).token;
    }
  }
});
```

### Dynamic navigation

```js
widget.on('navigate', (payload) => {
  if (payload.success) {
    console.log('Navigated to', payload.widgetType);
  } else {
    console.error('Navigation failed', payload.error);
  }
});

await widget.navigate({ widgetType: 'image-editor', params: { theme: 'dark' } });
```

### Cleanup on unmount

```js
let widget = null;

function mount() {
  if (widget) widget.destroy();
  widget = init({ domNode: '#widget', widgetOrigin: 'https://console.pixelbin.io' });
}

function unmount() {
  if (widget) {
    widget.destroy();
    widget = null;
  }
}

window.addEventListener('beforeunload', unmount);
```

---

## Communication flow

1. `init(config)` validates options and (optionally) fetches the bootstrap token before creating the iframe URL.
2. The iframe loads `routePath` with all `params` and the token baked into the query string.
3. SDK sends `SDK_INIT` → iframe replies with `WIDGET_READY`.
4. Once ready, queued commands flush and optional `autostart` triggers `open()`.
5. Subsequent calls (`open`, `close`, `navigate`, `destroy`) translate to strict `postMessage` commands scoped to `widgetOrigin`.
6. If the iframe reports a session expiration, the SDK destroys the iframe, clears the cached token, fetches a new one, and reinitializes—all without emitting external events.

---

## Timeouts

| Operation        | Default timeout | How to override |
|------------------|-----------------|-----------------|
| Bootstrap token  | `10,000ms`      | `bootstrap.timeoutMs` |
| INIT handshake   | `10` retries @ `500ms` (5s total) | Internal constants |
| `navigate()`     | `5,000ms`       | `navigate({ timeout })` |
| Logout handshake | `2,000ms`       | Internal constant (use `destroy({ force: true })` to skip) |

---

## Best practices

1. **Do not expose API keys**: route `bootstrap.getToken` through your backend (see bootstrap guide).
2. **Handle `error` events**: log or surface `error.code` to users/instrumentation.
3. **Clean up widgets when unmounting**: call `destroy()` to avoid orphaned iframes/listeners.
4. **Use `autostart` sparingly**: wait for explicit user intent where possible.
5. **Enable `debug` only in dev**: verbose logs can leak contextual info in production.

---

## References

- `README.md` – Getting started & configuration overview.
- `docs/BOOTSTRAP_TOKEN_GUIDE.md` – How to provision bootstrap tokens securely.
- `docs/CDN_INTEGRATION.md` – Script-tag/CDN integration instructions.
- `docs/ERROR_CODES.md` – Error code catalog.
