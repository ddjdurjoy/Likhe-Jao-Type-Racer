# Deployment Guide - Likhe Jao

## Architecture

This app uses a **split deployment architecture**:
- **Frontend**: Deployed to Vercel (static files)
- **Backend**: Deployed to Render or Railway (API server)

## Environment Variables

### Backend (Render/Railway)

Required environment variables for production:

```env
# Required
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://user:password@host:5432/database
SESSION_SECRET=your-very-long-random-secret-here

# Optional
FRONTEND_URL=https://your-app.vercel.app
COOKIE_DOMAIN=.yourdomain.com
```

### Frontend (Vercel)

No environment variables needed. API routing is handled via `vercel.json` rewrites.

## Deployment Steps

### 1. Deploy Backend to Render

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Configure:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment**: Node
4. Add environment variables (see above)
5. Deploy!
6. Note your backend URL (e.g., `https://likhe-jao-typeracer.onrender.com`)

### 2. Update vercel.json

Update the API rewrite destination with your Render backend URL:

```json
{
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "https://YOUR-RENDER-APP.onrender.com/api/$1"
    }
  ]
}
```

### 3. Deploy Frontend to Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Follow prompts
4. Deploy!

## Important Configuration Changes

### CORS & Cookies

The app now supports cross-origin authentication with these changes:

1. **CORS enabled** on backend with credentials support
2. **Session cookies** configured for cross-domain:
   - `sameSite: "none"` in production
   - `secure: true` (requires HTTPS)
3. **Trust proxy** enabled for Render/Railway
4. **Allowed origins** configured in server code

### Allowed Origins

Update `server/index.ts` and `server/socket.ts` with your production URLs:

```typescript
const allowedOrigins = [
  "http://localhost:5000",
  "https://your-app.vercel.app",  // ← Update this!
  process.env.FRONTEND_URL,
];
```

## Troubleshooting

### 404 Errors on /api/auth endpoints

**Symptoms**: Auth works locally but fails in production with 404

**Causes**:
1. Backend URL in `vercel.json` is incorrect
2. Backend service is not running
3. CORS is blocking requests

**Solutions**:
1. Verify backend URL is correct and accessible
2. Check Render/Railway logs for errors
3. Test backend directly: `curl https://your-backend.onrender.com/health`

### Session/Login Not Working

**Symptoms**: Login succeeds but user not authenticated on next request

**Causes**:
1. Cookies not being sent cross-origin
2. `sameSite` or `secure` cookie settings incorrect
3. CORS credentials not enabled

**Solutions**:
1. Check browser DevTools → Application → Cookies
2. Verify `sameSite: "none"` and `secure: true` in production
3. Ensure CORS has `credentials: true`
4. Frontend must send requests with `credentials: 'include'`

### Socket.IO Connection Failed

**Symptoms**: Real-time features don't work in production

**Causes**:
1. Socket.IO CORS not configured
2. WebSocket connection blocked

**Solutions**:
1. Verify socket CORS allows your frontend origin
2. Check that backend supports WebSocket upgrades
3. Test: Open browser console on frontend and check for socket errors

## Testing Production Setup

### Test Backend

```bash
# Health check
curl https://your-backend.onrender.com/health

# Test auth endpoint
curl https://your-backend.onrender.com/api/auth/me
```

### Test Frontend

1. Open: `https://your-app.vercel.app`
2. Open DevTools → Network
3. Try to sign up/sign in
4. Check requests go to correct backend
5. Verify cookies are set

## Alternative: Single Server Deployment

If you want to deploy everything to one server (Render/Railway):

1. Remove `vercel.json` rewrites
2. Deploy entire app to Render/Railway
3. Backend serves static files in production
4. No CORS/cross-domain issues!

Configure in Render:
```
Build Command: npm install && npm run build
Start Command: npm start
```

The app will serve both API and frontend on the same domain.

## Security Notes

- Always use HTTPS in production
- Use strong `SESSION_SECRET` (generate with: `openssl rand -base64 32`)
- Keep `DATABASE_URL` secret
- Enable rate limiting for auth endpoints (TODO)
- Consider adding CSRF protection (TODO)

## Performance Tips

- Enable caching headers for static assets
- Use CDN for frontend (Vercel does this automatically)
- Consider connection pooling for database
- Monitor database query performance
- Use Redis for session store in high-traffic scenarios

## Support

For issues:
1. Check Render/Railway logs
2. Check Vercel deployment logs
3. Test backend endpoints directly
4. Verify environment variables are set
