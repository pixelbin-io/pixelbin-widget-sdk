# Widget SDK Error Codes Reference

This document provides a comprehensive reference for all error codes emitted by the Widget SDK, along with troubleshooting steps and solutions.

---

## Error Structure

All SDK errors follow this structure:

```javascript
{
  code: 'ERROR_CODE',           // Unique identifier
  message: 'Human-readable message',
  context: {                    // Additional debugging context
    // Error-specific metadata
  }
}
```

## Fatal vs. Recoverable Errors

The SDK categorizes errors into two types:

### 🔴 Fatal Errors (Auto-Destroy)
These errors indicate the widget cannot function and will trigger **automatic cleanup** (if `autoDestroyOnFatalError: true`, which is the default):

- `CONFIG_MISSING` - No configuration provided
- `CONFIG_INVALID_DOM_NODE` - Invalid DOM element
- `CONFIG_INVALID_ORIGIN` - Disallowed origin
- `CONFIG_INVALID_EMBED_ID` - Malformed embed ID
- `CONFIG_DUPLICATE_INIT` - Widget already mounted
- `COMM_INIT_TIMEOUT` - Widget failed to initialize

**Behavior**: Widget automatically destroys itself after emitting the error event.

### 🟡 Recoverable Errors (No Auto-Destroy)
These errors are transient and the widget remains alive, allowing integrators to retry:

- `AUTH_*` - All authentication/token errors
- `NETWORK_*` - Network failures
- `COMM_POSTMESSAGE_FAILED` - Message send failure

**Behavior**: Widget stays alive; integrator can retry with `widget.updateConfig()` or manual recovery.

### Disabling Auto-Destroy
```javascript
const widget = WidgetSDK.init({
  domNode: '#widget',
  widgetOrigin: 'https://console.pixelbin.io',
  autoDestroyOnFatalError: false // Keep widget alive even on fatal errors
});

widget.on('error', (error) => {
  if (error.code === 'COMM_INIT_TIMEOUT') {
    // Manual cleanup
    widget.destroy();
    // Or retry logic
    setTimeout(() => location.reload(), 3000);
  }
});
```

---

## Configuration Errors (CONFIG_*)

### `CONFIG_MISSING`
**Message**: Configuration object is required  
**Cause**: No config object passed to `WidgetSDK.init()`  
**Solution**: 
```javascript
// ❌ Wrong
const widget = WidgetSDK.init();

// ✅ Correct
const widget = WidgetSDK.init({ 
  domNode: '#widget', 
  widgetOrigin: 'https://console.pixelbin.io' 
});
```

---

### `CONFIG_INVALID_DOM_NODE`
**Message**: Invalid domNode: must be an HTMLElement or valid CSS selector  
**Cause**: `domNode` is missing, not a valid selector, or element doesn't exist  
**Context**: `{ provided: <value> }`  
**Solution**:
```javascript
// ❌ Wrong
const widget = WidgetSDK.init({ 
  domNode: '#nonexistent' 
});

// ✅ Correct
const widget = WidgetSDK.init({ 
  domNode: document.getElementById('widget') 
});
// OR
const widget = WidgetSDK.init({ 
  domNode: '#widget' // Must exist in DOM
});
```

---

### `CONFIG_INVALID_ORIGIN`
**Message**: Invalid widgetOrigin: must be an allowed origin URL  
**Cause**: `widgetOrigin` is missing or not in the allowlist  
**Context**: `{ provided: <url>, allowed: [...] }`  
**Solution**:
```javascript
// ❌ Wrong
const widget = WidgetSDK.init({ 
  widgetOrigin: 'http://localhost:3000' // Not in allowlist
});

// ✅ Correct
const widget = WidgetSDK.init({ 
  widgetOrigin: 'https://console.pixelbin.io' // Must be exact match
});
```

**Allowed Origins**:
- `https://console.pixelbin.io`
- `https://console.pixelbinz0.de`

---

### `CONFIG_INVALID_EMBED_ID`
**Message**: Invalid embedId format: must match pattern [A-Za-z0-9._-]{3,128}  
**Cause**: `embedId` contains invalid characters or wrong length  
**Context**: `{ provided: <id>, pattern: <regex> }`  
**Solution**:
```javascript
// ❌ Wrong
const widget = WidgetSDK.init({ 
  embedId: 'my embed!' // Spaces/special chars not allowed
});

// ✅ Correct
const widget = WidgetSDK.init({ 
  embedId: 'my-embed-123' // 3-128 chars, alphanumeric, ., _, -
});
```

---

### `CONFIG_DUPLICATE_INIT`
**Message**: Widget already initialized on this domNode  
**Cause**: Attempted to initialize SDK twice on the same DOM element  
**Context**: `{ domNode: <selector> }`  
**Solution**:
```javascript
// ❌ Wrong
const widget1 = WidgetSDK.init({ domNode: '#widget' });
const widget2 = WidgetSDK.init({ domNode: '#widget' }); // Error!

// ✅ Correct
const widget = WidgetSDK.init({ domNode: '#widget' });
// Later, destroy before re-initializing:
widget.destroy();
const newWidget = WidgetSDK.init({ domNode: '#widget' });
```

---

## Authentication Errors (AUTH_*)

### `AUTH_TOKEN_MISSING`
**Message**: Bootstrap token is required but not provided  
**Cause**: No token source configured  
**Solution**:
```javascript
// ❌ Wrong
const widget = WidgetSDK.init({ 
  bootstrap: {} 
});

// ✅ Correct - Option 1: Direct token
const widget = WidgetSDK.init({ 
  bootstrap: { token: 'your-token-here' }
});

// ✅ Correct - Option 2: Async fetch
const widget = WidgetSDK.init({ 
  bootstrap: {
    getToken: async () => {
      const res = await fetch('/api/token');
      return res.json().then(d => d.token);
    }
  }
});
```

---

### `AUTH_TOKEN_INVALID`
**Message**: Bootstrap token is invalid or malformed  
**Cause**: Token is not a non-empty string  
**Context**: `{ tokenType: <type>, tokenValue: '[REDACTED]' }`  
**Solution**: Verify your token generation endpoint returns a valid string token

---

### `AUTH_TOKEN_TIMEOUT`
**Message**: Bootstrap token request timed out  
**Cause**: `getToken()` or `endpoint` took longer than `timeoutMs`  
**Context**: `{ timeoutMs: <ms> }`  
**Solution**:
```javascript
// Increase timeout
const widget = WidgetSDK.init({ 
  bootstrap: {
    getToken: async () => { /* ... */ },
    timeoutMs: 20000 // 20 seconds instead of default 10s
  }
});
```

---

### `AUTH_TOKEN_SOURCE_INVALID`
**Message**: No valid token source configured (provide getToken or endpoint)  
**Cause**: Neither `bootstrap.getToken` nor `bootstrap.endpoint` is set  
**Context**: `{ hasGetToken: false, hasEndpoint: false }`  
**Solution**: See `AUTH_TOKEN_MISSING`

---

### `AUTH_BOOTSTRAP_GETTOKEN_INVALID`
**Message**: bootstrap.getToken must be a function  
**Cause**: `getToken` is not a function  
**Context**: `{ type: <actual-type> }`  
**Solution**:
```javascript
// ❌ Wrong
const widget = WidgetSDK.init({ 
  bootstrap: { getToken: 'not-a-function' }
});

// ✅ Correct
const widget = WidgetSDK.init({ 
  bootstrap: { 
    getToken: async () => 'your-token' 
  }
});
```

---

### `AUTH_BOOTSTRAP_ENDPOINT_INVALID`
**Message**: bootstrap.endpoint must be a valid URL string  
**Cause**: `endpoint` is not a string  
**Context**: `{ type: <actual-type> }`  
**Solution**:
```javascript
// ❌ Wrong
const widget = WidgetSDK.init({ 
  bootstrap: { endpoint: 123 }
});

// ✅ Correct
const widget = WidgetSDK.init({ 
  bootstrap: { 
    endpoint: '/api/bootstrap-token',
    method: 'POST'
  }
});
```

---

### `AUTH_BOOTSTRAP_METHOD_INVALID`
**Message**: bootstrap.method must be GET or POST  
**Cause**: `method` is not 'GET' or 'POST'  
**Context**: `{ provided: <method>, allowed: ['GET', 'POST'] }`  
**Solution**:
```javascript
// ❌ Wrong
const widget = WidgetSDK.init({ 
  bootstrap: { 
    endpoint: '/api/token',
    method: 'PUT' // Not allowed
  }
});

// ✅ Correct
const widget = WidgetSDK.init({ 
  bootstrap: { 
    endpoint: '/api/token',
    method: 'POST'
  }
});
```

---

### `AUTH_ENDPOINT_FAILED`
**Message**: Token endpoint request failed  
**Cause**: HTTP request to `bootstrap.endpoint` returned non-2xx status  
**Context**: `{ status: <code>, statusText: <text>, endpoint: <url> }`  
**Solution**:
- Check server logs for the endpoint
- Verify endpoint is accessible from client
- Check CORS headers if cross-origin
- Verify authentication (cookies, headers)

---

### `AUTH_ENDPOINT_NO_TOKEN`
**Message**: Token endpoint did not return a valid token  
**Cause**: Response JSON doesn't contain `token`, `bootstrapToken`, or `access_token` field  
**Context**: `{ endpoint: <url>, responseKeys: [...] }`  
**Solution**:
```javascript
// ❌ Wrong API response
{ "data": "some-token" } // 'data' not recognized

// ✅ Correct API response (any one of these)
{ "token": "some-token" }
{ "bootstrapToken": "some-token" }
{ "access_token": "some-token" }
```

---

## Communication Errors (COMM_*)

### `COMM_INIT_TIMEOUT`
**Message**: Widget initialization handshake timed out  
**Cause**: Iframe didn't respond to `SDK_INIT` after max retries  
**Context**: `{ attempts: <count>, intervalMs: <ms> }`  
**Possible Causes**:
1. Network connectivity issues
2. Iframe app failed to load
3. Iframe app has JS errors preventing message listener
4. CSP blocking iframe scripts

**Solution**:
1. Check browser console for iframe errors
2. Verify `widgetOrigin` is correct and accessible
3. Check network tab for 404/500 errors
4. Enable debug mode: `debug: true`

---

### `COMM_POSTMESSAGE_FAILED`
**Message**: Failed to send message to widget iframe  
**Cause**: `postMessage()` threw an exception  
**Context**: `{ type: <message-type>, originalError: <error> }`  
**Solution**:
- Iframe may have been destroyed
- Call `widget.destroy()` and reinitialize

---

### `COMM_LOGOUT_TIMEOUT`
**Message**: Widget logout acknowledgement timed out  
**Cause**: Iframe didn't respond to `SDK_LOGOUT` within timeout  
**Solution**: 
- Normal if iframe already unloaded
- Use `widget.destroy({ force: true })` to skip logout wait

---

### `COMM_INVALID_ORIGIN`
**Message**: Message origin does not match widget origin  
**Cause**: Received postMessage from unexpected origin (security check)  
**Solution**: Internal error, contact SDK maintainers

---

## Runtime Errors (RUNTIME_*)

### `RUNTIME_DESTROYED`
**Message**: Widget has been destroyed  
**Cause**: Called SDK method after `destroy()`  
**Solution**:
```javascript
const widget = WidgetSDK.init({ /* ... */ });
widget.destroy();
widget.open(); // ❌ Error: RUNTIME_DESTROYED

// ✅ Correct: Create new instance
const newWidget = WidgetSDK.init({ /* ... */ });
newWidget.open();
```

---

### `RUNTIME_NOT_READY`
**Message**: Widget is not ready yet  
**Cause**: Called method before `ready` event (should auto-queue)  
**Solution**: Wait for `ready` event or let SDK queue it:
```javascript
const widget = WidgetSDK.init({ /* ... */ });

// Option 1: Wait for ready
widget.on('ready', () => {
  widget.open();
});

// Option 2: SDK auto-queues (recommended)
widget.open(); // Queued until ready
```

---

### `RUNTIME_INVALID_URL`
**Message**: Invalid URL format for widget origin  
**Cause**: `widgetOrigin` is not a valid absolute URL  
**Solution**: See `CONFIG_INVALID_ORIGIN`

---

## Network Errors (NETWORK_*)

### `NETWORK_FETCH_FAILED`
**Message**: Network request failed  
**Cause**: `fetch()` threw an error (network down, CORS, etc.)  
**Solution**:
- Check network connectivity
- Verify CORS headers on endpoint
- Check browser console for CORS errors

---

### `NETWORK_TIMEOUT`
**Message**: Network request timed out  
**Cause**: Request exceeded `timeoutMs`  
**Solution**: Increase timeout or check server performance

---

## Debugging Tips

### Enable Debug Mode
```javascript
const widget = WidgetSDK.init({ 
  debug: true // Enables verbose console logging
});
```

### Listen to Error Events
```javascript
widget.on('error', (error) => {
  console.error('SDK Error:', error.code, error.message);
  console.log('Context:', error.context);
  
  // Show user-friendly message
  if (error.code === 'AUTH_TOKEN_TIMEOUT') {
    alert('Loading timed out. Please refresh and try again.');
  }
});
```

### Check Browser Console
- SDK logs all postMessage traffic in debug mode
- Look for red errors from iframe origin
- Check Network tab for failed requests

### Common Pitfalls
1. **Wrong origin**: Must be exact match, including protocol and port
2. **Missing DOM element**: Ensure element exists before `init()`
3. **CORS issues**: Token endpoint must return proper headers
4. **Ad blockers**: May block iframe or API requests
5. **CSP violations**: Check `Content-Security-Policy` headers

---

## Support

If you encounter an error not documented here:

1. **Enable debug mode**: `debug: true`
2. **Check browser console**: Look for SDK logs and errors
3. **Collect error details**: Code, message, context
4. **Contact support**: Include SDK version and browser info

**SDK Version**: 1.0.0  
**Last Updated**: 2025-11-20

