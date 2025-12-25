# Custom Axios Instance Documentation

## Overview

This project uses a custom Axios instance (`axiosInstance`) that automatically forwards all incoming request headers to downstream HTTP requests. This ensures that headers from the original client request are properly propagated through the webhook forwarding chain.

## Architecture

### Components

1. **`src/utils/axiosInstance.ts`** - Custom Axios instance with header forwarding
2. **`src/middleware/requestContext.ts`** - Express middleware that captures request headers
3. **Route handlers** - Use the custom instance instead of direct `axios` imports

### How It Works

1. **Request arrives** → Express middleware captures headers
2. **Headers stored** → `requestContextMiddleware` stores headers in the Axios instance
3. **Downstream request** → Axios interceptor automatically adds stored headers
4. **Response sent** → Middleware cleans up stored headers

## Usage

### In Route Handlers

```typescript
import axiosInstance from '../utils/axiosInstance';

// Use the custom instance for all HTTP requests
await axiosInstance.getAxios().post(targetUrl, body);
```

### Available Methods

```typescript
// Direct method calls (returns data directly)
await axiosInstance.post(url, data, config);
await axiosInstance.get(url, config);
await axiosInstance.put(url, data, config);
await axiosInstance.delete(url, config);
await axiosInstance.patch(url, data, config);

// Full Axios instance access
const axios = axiosInstance.getAxios();
await axios.post(url, data, config);
```

## Header Forwarding

### Automatically Forwarded Headers

All incoming request headers are forwarded **except**:
- `host` (replaced with target URL's host)
- `connection`
- `content-length`
- `transfer-encoding`
- `expect`

### Example Flow

```
Client Request Headers:
  authorization: Bearer token123
  x-custom-header: value
  user-agent: MyApp/1.0

↓ (captured by middleware)

Downstream Request Headers:
  authorization: Bearer token123
  x-custom-header: value
  user-agent: MyApp/1.0
  host: target-server.com  ← automatically set
```

## Error Handling

### Production Error Case: ECONNRESET

The custom instance includes special handling for the production error case documented below:

```
2025-12-25T06:35:10.563Z [ERROR] Failed to forward webhook for source 'whatsapp'
to https://dev.brijesh.fun/webhook/whatsapp {
  errorMessage: 'read ECONNRESET',
  errorDetails: {
    message: 'read ECONNRESET',
    response: undefined,
    status: undefined,
    headers: undefined
  }
}
```

### Error Handling Strategy

The Axios instance includes response interceptors that:

1. **Log connection errors** with detailed context:
   - `ECONNRESET` - Connection reset by peer
   - `ETIMEDOUT` - Request timeout
   - `ECONNREFUSED` - Connection refused

2. **Preserve error information** for upstream handling:
   - Error code and message
   - Request URL and method
   - Configuration details

3. **Graceful failure** in route handlers:
   - Errors are caught and logged
   - Failed webhooks are persisted to database
   - Client receives 200 OK response (webhook received)

### Example Error Handling in Routes

```typescript
try {
  await axiosInstance.getAxios().post(targetUrl, req.body);
  logger.info(`Webhook forwarded successfully`);
  res.status(200).send('Webhook forwarded successfully');
} catch (error: unknown) {
  let errorMessage = 'An unknown error occurred';
  let errorDetails: unknown = {};

  if (axios.isAxiosError(error)) {
    errorMessage = error.message;
    errorDetails = {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      headers: error.response?.headers,
    };
  }

  logger.error(`Failed to forward webhook`, {
    errorMessage,
    errorDetails,
  });

  // Persist failed webhook for retry/analysis
  await saveFailedWebhook({
    source,
    payload: req.body,
    headers: req.headers,
    target_url: targetUrl,
    error_message: errorMessage,
    error_details: errorDetails,
  });

  // Return success to client (webhook was received)
  res.status(200).send('Webhook received');
}
```

## Configuration

### Timeout Settings

Default timeout: **30 seconds**

```typescript
// In axiosInstance.ts
this.axiosInstance = axios.create({
  timeout: 30000,  // 30 seconds
  maxRedirects: 5,
});
```

### Modifying Timeout

To change timeout for specific requests:

```typescript
await axiosInstance.getAxios().post(url, data, {
  timeout: 60000  // 60 seconds
});
```

## Best Practices

1. **Always use `axiosInstance`** - Never import `axios` directly for HTTP requests
2. **Keep `axios` import for type checking** - Use `axios.isAxiosError()` for error detection
3. **Log errors comprehensively** - Include URL, method, and error details
4. **Persist failed webhooks** - Store failed requests for analysis and retry
5. **Return 200 OK to clients** - Even on forwarding failure (webhook was received)

## Troubleshooting

### Headers Not Being Forwarded

**Check:**
1. Is `requestContextMiddleware` registered in `src/index.ts`?
2. Is it registered **before** route handlers?
3. Are you using `axiosInstance` instead of direct `axios`?

### ECONNRESET Errors

**Common Causes:**
- Target server closed connection unexpectedly
- Network issues between services
- Target server timeout or crash
- Load balancer/proxy issues

**Solutions:**
- Check target server health and logs
- Verify network connectivity
- Review target server timeout settings
- Consider implementing retry logic with exponential backoff

### Memory Leaks

The middleware properly cleans up headers after each request using the response `end` hook. If you modify the middleware, ensure `clearRequestHeaders()` is always called.

## Migration Guide

### Before (Direct Axios)

```typescript
import axios from 'axios';

await axios.post(targetUrl, body, { 
  headers: { ...req.headers, host: new URL(targetUrl).host } 
});
```

### After (Custom Instance)

```typescript
import axios from 'axios';  // Keep for isAxiosError
import axiosInstance from '../utils/axiosInstance';

// Headers are automatically forwarded
await axiosInstance.getAxios().post(targetUrl, body);
```

## Testing

### Manual Testing

```bash
# Test header forwarding
curl -X POST http://localhost:3000/webhook/test \
  -H "Authorization: Bearer test123" \
  -H "X-Custom-Header: value" \
  -d '{"test": "data"}'
```

### Verify Headers

Check logs to confirm headers are forwarded to downstream services.

## Future Enhancements

Consider implementing:
- **Retry logic** with exponential backoff for transient errors
- **Circuit breaker** pattern for failing downstream services
- **Request/response logging** for debugging
- **Metrics collection** for monitoring
- **Header filtering** based on configuration
