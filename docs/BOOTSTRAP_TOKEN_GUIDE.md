# Bootstrap Token Flow

Follow these steps to generate the bootstrap token that the Pixelbin Widget SDK expects when calling `init({ bootstrap: { getToken } })`.

## 1. Create an API key (keep it secret)

1. Log into [`console.pixelbin.io`](https://console.pixelbin.io/) using your organization account.
2. Navigate to **Settings → Tokens**. (Official docs: https://www.pixelbin.io/docs/tokens/)
3. Create or copy an existing **API key**.
4. Store this key in your backend only. **Never expose the API key in frontend code, repositories, or logs.**
5. If you need help provisioning accounts or keys, contact the Pixelbin service team at `support@pixelbin.io`.

## 2. Implement a client endpoint to fetch bootstrap tokens

The SDK’s `bootstrap.getToken` callback should invoke your own server endpoint (e.g., `/api/pixelbin/bootstrap`). That server endpoint is responsible for:

1. Receiving the request from the browser and validating the user session (if needed).
2. Calling Pixelbin’s bootstrap token API using the secret API key.

Document the backend call (replace `<APIKEY>` and `<HOST-ORIGIN>`):

```
POST https://api.pixelbin.io/service/platform/organization/v1.0/apps/bootstrap_token

Headers:
  Authorization: Bearer <APIKEY>
  X-Widget-Parent-Origin: <HOST-ORIGIN>

Response 200 OK:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsImtpZCI6ImhzMjU2LTA5LTIwMjUifQ.eyJhcHBJZCI6NjY1NCwib3JnSWQiOjEwNjM2LCJwYXJlbnRPcmlnaW5zIjpbImh0dHA6Ly8xMjcuMC4wLjE6NTUwMCJdLCJpYXQiOjE3NjM1Mzk4NTMsImlzcyI6InBpeGVsYmluLmlvIiwiYXVkIjoicGl4ZWxiaW4td2lkZ2V0IiwiZXhwIjoxNzYzNTM5OTczLCJqdGkiOiIyODAyYjI2Ny0zODk5LTRmMzUtOTY3NC00M2VlMGE5NTU3ZTIifQ.jiuNyQh3IlTDje3RdnuqULTeHuBk342SCk828vaT_m0",
  "expiresIn": "2025-11-19T08:15:53.734Z",
  "message": "Bootstrap token generated successfully",
  "allowedOrigins": [
    "http://127.0.0.1:5500"
  ]
}
```

Return only the `token` value to the browser. Do not forward the API key or any other secrets.

## 3. Hook into the SDK

In your frontend (one of the method) :

```js
import { init } from 'pixelbin-widget-sdk';

const widget = init({
  domNode: '#pixelbin-widget',
  widgetOrigin: 'https://console.pixelbin.io',
  bootstrap: {
    getToken: async () => {
      const res = await fetch('/api/pixelbin/bootstrap');
      if (!res.ok) throw new Error('Unable to fetch bootstrap token');
      const data = await res.json();
      return data.token;
    }
  }
});
```

The SDK automatically injects the returned token into the iframe URL. When the token expires, the SDK will re-run `getToken` (your endpoint) to fetch a fresh token.

## Checklist

- [ ] API key is stored server-side only and never exposed to clients.
- [ ] Server endpoint validates the requesting user (if needed) before calling Pixelbin.
- [ ] Responses only include the `token` (and optional metadata), never the API key.
- [ ] `X-Widget-Parent-Origin` header matches the origin where the widget is hosted.
- [ ] Frontend uses `bootstrap.getToken` to call the secure endpoint.
