# Pixelbin Widget SDK

A zero-dependency browser SDK that mounts the Pixelbin widgets inside any web application. It handles iframe creation, bootstrap-token acquisition, the secure `postMessage` handshake, widget lifecycle management, and exposes a tiny evented API for hosts to control navigation, logout, session handling, and configuration updates.

## Installation

### NPM
You can install the SDK via npm:

```bash
npm install pixelbin-widget-sdk
```

### CDN
You can also use the SDK directly via CDN. We recommend using the integrity attribute for security.

```html
<!-- Replace 'latest' with specific version and use the corresponding integrity hash -->
<script src="https://cdn.jsdelivr.net/gh/pixelbin-io/pixelbin-widget-sdk@latest/dist/widget-sdk.js"></script>
```

The package publishes a browser-ready build at `dist/widget-sdk.js` and also exposes the same file through the `browser`, `unpkg`, and `jsdelivr` fields for CDN usage.

## Quick start

```js
import { init } from "pixelbin-widget-sdk";

const widget = init({
   domNode: "#pixelbin-widget", // HTMLElement or selector
   widgetOrigin: "https://console.pixelbin.io",
   params: {
      widgetType: "ai-editor",
   },
   autostart: false,
   bootstrap: {
      // Either provide a token up front...
      token: window.__PIXELBIN_BOOTSTRAP__,
      // ...or return one dynamically from your backend (Recommend):
      getToken: async () => {
         const res = await fetch("/api/bootstrap", { credentials: "include" });
         const { token } = await res.json();
         return token;
      },
   },
   debug: false,
});

widget
   .on("ready", () => widget.open())
   .on("error", (err) => console.error("Pixelbin widget error", err));
```

## CDN usage

Prefer not to bundle the SDK? Load the prebuilt file from a CDN and use the global `WidgetSDK.init` helper:

```html
<div id="pixelbin-widget"></div>

<!-- Recommended: Use specific version with integrity check -->
<script src="https://cdn.jsdelivr.net/gh/pixelbin-io/pixelbin-widget-sdk@1.0.0/dist/widget-sdk.js" 
        integrity="sha384-lh7xurl4Nfutsm03ePF6XiKbjbel4Fpo1dXPCdZPkE3S6KjxuacE/h3Y5zaZ62p/" 
        crossorigin="anonymous"></script>

<!-- Or use master branch (auto-updates, use with caution) -->
<!-- <script src="https://cdn.jsdelivr.net/gh/pixelbin-io/pixelbin-widget-sdk@master/dist/widget-sdk.js"></script> -->

<script>
  const widget = window.WidgetSDK.init({
    domNode: '#pixelbin-widget',
    widgetOrigin: 'https://console.pixelbin.io',
    bootstrap: { getToken: async () => (await fetch('/api/bootstrap')).json().then(d => d.token) }
  });

  widget.on('ready', () => widget.open());
</script>
```

See `docs/CDN_INTEGRATION.md` for a full walkthrough covering script tag placement, integrity/crossorigin hints, and local development tips.

Add a mount container anywhere in your HTML:

```html
<div id="pixelbin-widget"></div>
```

The controller returned from `init` exposes methods and events documented below.

## Configuration reference

| Field                     | Type                    | Description                                                                                                                                |
| ------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `domNode`                 | `HTMLElement \| string` | Required mount element or selector. Must be unique per widget instance.                                                                    |
| `widgetOrigin`            | `string`                | Required iframe origin. Must be one of `https://console.pixelbin.io`, `https://console.pixelbinz0.de`, `https://local.pixelbinz0.de:9090`. |
| `routePath`               | `string`                | Optional iframe path (defaults to `/widget`).                                                                                              |
| `params`                  | `Object`                | Query params appended to the iframe URL. Includes `widgetType`, `theme`, `locale`, or any product-specific options.                        |
| `autostart`               | `boolean`               | Automatically call `open()` once the iframe reports `READY`. Defaults to `false`.                                                          |
| `allowedIframeFeatures`   | `string[]`              | Additional `allow` features merged with defaults (`camera`, `microphone`, etc.).                                                           |
| `style`                   | `Object`                | Inline style overrides for the iframe. Default styles create a centered modal.                                                             |
| `debug`                   | `boolean`               | Enables verbose console logs via the internal logger.                                                                                      |
| `autoDestroyOnFatalError` | `boolean`               | Automatically tears down the iframe (default `true`).                                                                                      |

### Bootstrap token options

The widget requires a bootstrap token. Choose exactly one of the following sources:

| Field                | Type                    | Description                                                                                                                                                                                       |
| -------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bootstrap.token`    | `string`                | Already-fetched token (placed in the iframe query string).                                                                                                                                        |
| `bootstrap.getToken` | `() => Promise<string>` | Function executed **before** iframe creation. Use this to call your backend with the host's authentication before handing the token to the SDK.                                                   |
| `bootstrap.endpoint` | `string`                | Alternatively, let the SDK fetch the token from your server. Supports `GET` or `POST` via `bootstrap.method`, `bootstrap.headers`, `bootstrap.payload`, and a configurable `bootstrap.timeoutMs`. |

If `getToken`/`endpoint` resolve without a token the SDK emits `error` with one of the `AUTH_*` codes. Session-expiration signals from the iframe are handled internally: the SDK clears the cached token and re-runs your bootstrap flow automatically (no public event is emitted).

### Params

`params` is merged onto the iframe URL. Common keys:

-  `widgetType`: `"ai-editor" \| "image-editor" \| "ai-headshot" \| "batch-editor"`
-  `theme`: `"light"` or `"dark"`
-  `locale`: `"en-US"`, `"en-IN"`, etc.

## Events

| Event            | Payload                        | Notes                                                                                                        |
| ---------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `ready`          | none                           | Fired once the iframe completes the INIT handshake.                                                          |
| `open` / `close` | none                           | Triggered when the iframe reports opened/closed states.                                                      |
| `error`          | `{ code, message, context }`   | Dispatched for SDK or widget errors. Fatal `code`s auto-destroy unless `autoDestroyOnFatalError` is `false`. |
| `navigate`       | `{ widgetType, path, params }` | Sent after `navigate()` resolves.                                                                            |
| `logout`         | custom                         | Raised when the iframe logs a user out. The SDK waits for acknowledgement before destroying.                 |
| `destroy`        | none                           | Fired after `.destroy()` completes.                                                                          |

Handlers can be registered via `controller.on(event, callback)`, `once`, and `off`.

## Public API

-  `open()` / `close()` – show or hide the iframe (automatically emits the corresponding events).
-  `navigate(options)` – accepts `{ widgetType, path, params, timeout }` or a simple path string. Returns a `Promise` that resolves when the iframe acknowledges navigation, or rejects (with timeout) if it cannot.
-  `updateConfig(patch)` – shallow merges runtime configuration changes (e.g., inject new inline styles).
-  `destroy({ force })` – removes event listeners and iframe. With `{ force: true }` it skips the logout handshake.
-  `on(event, handler)` / `once` / `off` – EventEmitter helpers.

## Development

### Setup
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Build
To build the project and generate the SRI hash:
```bash
npm run build        # production bundle -> dist/widget-sdk.js
```

Other commands:
```bash
npm run build:dev    # unminified bundle
npm run watch        # rebuild on file changes
npm run dev          # run watch + example + mock iframe servers
```

### Release
To release a new version (requires permissions):
```bash
npm run release
```
Follow the interactive prompts to bump the version, generate changelog, and publish.

The dev server expects static example assets under `examples/` and a mock iframe app under `examples/mock-iframe-app`.

## Examples

-  `examples/basic.html` – Minimal host page that loads the built SDK, mounts the widget, requests a bootstrap token from a mock endpoint, and wires up open/logout/error events.

Serve it locally with any static server (e.g., `npx http-server -p 9000 examples`) or adapt it into your integration environment.

## Need feedback?

If you find missing types, need additional events, or want to add framework-specific helpers, please open an issue or PR. Contributions such as typed definitions, Cypress smoke tests, or framework wrappers (React hook, Vue composable, etc.) are welcome.
