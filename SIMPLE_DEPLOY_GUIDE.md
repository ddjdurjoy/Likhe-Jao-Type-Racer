# Simple Deployment Guide - Fix 404 Auth Errors

## The Problem

You're seeing `404` errors on `/api/auth/signup` and `/api/auth/me` because:
- **Vercel doesn't support WebSocket/Socket.IO** (your app uses it for real-time racing)
- Your `vercel.json` was trying to proxy to a Render backend that doesn't exist yet

## The Solution

Deploy your **ENTIRE APP** (frontend + backend) to **Render** or **Railway**, NOT Vercel.

---

## ✅ Option 1: Deploy to Render (Recommended)

### Step 1: Create Render Account
1. Go to https://render.com
2. Sign up with GitHub
3. Connect your repository

### Step 2: Create PostgreSQL Database
1. Click "New +" → "PostgreSQL"
2. Name: `likhe-jao-db`
3. Click "Create Database"
4. **Copy the "Internal Database URL"** (starts with `postgresql://`)

### Step 3: Deploy Web Service
1. Click "New +" → "Web Service"
2. Select your GitHub repository
3. Configure:
   ```
   Name: likhe-jao-typeracer
   Region: Oregon (US West)
   Branch: main
   Root Directory: (leave blank)
   Runtime: Node
   Build Command: npm install && npm run build
   Start Command: npm start
   Plan: Free
   ```

### Step 4: Add Environment Variables
Click "Environment" and add:
```
NODE_ENV = production
PORT = 5000
SESSION_SECRET = (click "Generate")
DATABASE_URL = (paste the PostgreSQL URL from Step 2)
```

### Step 5: Deploy!
1. Click "Create Web Service"
2. Wait 5-10 minutes for build
3. Your app will be live at: `https://likhe-jao-typeracer.onrender.com`

### Step 6: Test
1. Open your Render URL
2. Try to Sign Up
3. Should work! ✅

---

## ✅ Option 2: Deploy to Railway (Faster)

### Step 1: Create Railway Account
1. Go to https://railway.app
2. Sign up with GitHub

### Step 2: Create New Project
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your repository

### Step 3: Add PostgreSQL
1. Click "New" → "Database" → "Add PostgreSQL"
2. Railway auto-connects it!

### Step 4: Add Environment Variables
Click on your service → Variables:
```
NODE_ENV = production
SESSION_SECRET = (generate random: openssl rand -base64 32)
```
(DATABASE_URL is auto-added by Railway)

### Step 5: Deploy!
1. Railway auto-deploys on git push
2. Click "Settings" → "Generate Domain"
3. Your app will be live at: `https://your-app.up.railway.app`

### Step 6: Test
1. Open your Railway URL
2. Try to Sign Up
3. Should work! ✅

---

## 🚫 Why NOT Vercel?

Vercel is **static hosting** + **serverless functions**. Your app needs:
- ✅ WebSocket support (for Socket.IO racing)
- ✅ Long-running server process
- ✅ In-memory session store (or PostgreSQL sessions)
- ✅ File uploads (avatars)

Vercel doesn't support these well. Use Render or Railway instead!

---

## After Deployment

### Update Your Domain
If you have a custom domain, update:
1. `server/index.ts` → allowedOrigins array
2. `server/socket.ts` → allowedOrigins array

### Environment Variables Reference
```env
# Required
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://user:pass@host:5432/db
SESSION_SECRET=your-random-secret-here

# Optional (for custom domains)
FRONTEND_URL=https://yourdomain.com
COOKIE_DOMAIN=.yourdomain.com
```

---

## Troubleshooting

### "Application failed to respond"
- Check Render/Railway logs
- Ensure `npm run build` succeeds
- Verify environment variables are set

### "Database connection failed"
- Verify DATABASE_URL is correct
- Check database is running
- Ensure database accepts connections

### "Session not persisting"
- Ensure SESSION_SECRET is set
- Check DATABASE_URL for session store
- Verify cookies are being set (DevTools → Application → Cookies)

---

## Testing Locally First

Before deploying, test the production build locally:

```bash
# Set environment variables
export NODE_ENV=production
export DATABASE_URL="postgresql://localhost:5432/likhe_jao"
export SESSION_SECRET="test-secret"

# Build
npm run build

# Start
npm start

# Test
open http://localhost:5000
```

If it works locally in production mode, it will work on Render/Railway!

---

## Quick Commands

```bash
# Build
npm run build

# Start production
npm start

# Development
npm run dev

# Check TypeScript
npx tsc --noEmit
```

---

## Summary

1. ❌ Don't use Vercel (doesn't support WebSocket)
2. ✅ Use Render or Railway (full Node.js support)
3. ✅ Deploy entire app (frontend + backend together)
4. ✅ Set environment variables (DATABASE_URL, SESSION_SECRET)
5. ✅ Test sign up/sign in

Your auth will work! 🎉
