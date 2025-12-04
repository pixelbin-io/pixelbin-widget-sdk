# CDN Integration Guide

Use this guide when you want to load the Pixelbin Widget SDK via `<script>` tags (no bundler/build step required).

## 1. Add a mount node

```html
<div id="pixelbin-widget"></div>
```

The `domNode` you pass to `WidgetSDK.init` can be either this selector string or the actual element instance.

## 2. Load the SDK from a CDN

Pin a specific version to get deterministic builds:

```html
<script
  src="https://cdn.jsdelivr.net/npm/pixelbin-widget-sdk@1/dist/widget-sdk.js"
  integrity="sha384-..."
  crossorigin="anonymous"
></script>
```

Available mirrors:

- `https://cdn.jsdelivr.net/npm/pixelbin-widget-sdk@1/dist/widget-sdk.js`
- `https://unpkg.com/pixelbin-widget-sdk@1/dist/widget-sdk.js`

After the script loads it exposes `window.WidgetSDK`.

## 3. Initialize the widget

```html
<script>
  async function bootstrapToken() {
    const res = await fetch('/api/pixelbin/bootstrap', { credentials: 'include' });
    if (!res.ok) throw new Error('Unable to fetch bootstrap token');
    const data = await res.json();
    return data.token;
  }

  const widget = WidgetSDK.init({
    domNode: '#pixelbin-widget',
    widgetOrigin: 'https://console.pixelbin.io',
    params: { widgetType: 'ai-editor' },
    bootstrap: { getToken: bootstrapToken },
    autostart: false,
    debug: false
  });

  widget
    .on('ready', () => widget.open())
    .on('error', (err) => console.error('Pixelbin widget error', err));
</script>
```

## 4. Secure bootstrap token flow

- Keep the Pixelbin API key on your backend only.
- Create a thin endpoint (e.g., `/api/pixelbin/bootstrap`) that calls Pixelbin’s bootstrap-token API and returns `{ token }`.
- Pass `getToken` as shown above so the SDK can acquire the token before injecting the iframe.
- Review `docs/BOOTSTRAP_TOKEN_GUIDE.md` for the exact server-to-server call, required headers, and response format.

## 5. Local development tips

- Set `X-Widget-Parent-Origin` to your top-level origin when calling Pixelbin (e.g., `http://127.0.0.1:5500`).
- Use HTTPS locally (or `http://localhost`) if the host page must run inside secure contexts (camera/microphone permissions).
- If you serve the SDK from your own CDN, keep the `allow` list in sync with defaults (camera/microphone/clipboard/etc.).

## 6. Production hardening

- Pin to an explicit version (`@1.0.0`) and use Subresource Integrity (SRI) hashes.
- Cache the script aggressively but revalidate on deploys to pick new versions.
- Wrap init logic in a feature flag or user action (button click) if you need consent before loading the widget.

Need more help? Reach out to `support@pixelbin.io` with your integration details.
