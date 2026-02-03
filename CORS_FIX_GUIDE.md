# CORS Fix - Deployment Instructions

## Issue Summary

Your deployed frontend on Vercel cannot communicate with the backend on Railway due to CORS (Cross-Origin Resource Sharing) policy blocking.

## What Was Fixed

### 1. Backend CORS Configuration (app/main.py)

- Updated to explicitly list allowed origins
- Added regex pattern for Vercel URLs
- Specified exact HTTP methods and headers
- Increased max_age for better preflight caching

### 2. Environment Variables (vercel.json)

- Added `NEXT_PUBLIC_API_URL` pointing to Railway backend
- This ensures frontend knows where to make API calls

### 3. Local Development (.env.local)

- Created for local development with localhost backend

### 4. Production Configuration (.env.production)

- Added specific backend CORS origins for production

## Steps to Deploy

### On Railway (Backend)

1. **Push the updated code to your repository:**

   ```bash
   git add .
   git commit -m "Fix CORS configuration for Vercel deployment"
   git push origin main
   ```

2. **Redeploy on Railway:**
   - Go to your Railway project dashboard
   - Your updated code should automatically trigger a redeploy
   - Wait for the build and deployment to complete
   - Verify the service is running

3. **Verify the health endpoint:**
   - Visit: `https://sublime-wisdom-production.up.railway.app/health`
   - Should return: `{"status":"ok"}`

### On Vercel (Frontend)

1. **Push the updated code:**

   ```bash
   git add .
   git commit -m "Add API URL configuration"
   git push origin main
   ```

2. **Vercel will automatically:**
   - Detect the changes
   - Rebuild the Next.js app
   - Deploy with the new environment variables from vercel.json

3. **Clear browser cache:**
   - Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
   - Clear localStorage if needed

## Testing

### Test from Browser Console

```javascript
// Test if API is accessible
fetch("https://sublime-wisdom-production.up.railway.app/health")
  .then((r) => r.json())
  .then((d) => console.log("Backend OK:", d))
  .catch((e) => console.error("Backend Error:", e));
```

### Expected Results After Fix

- ✅ Admin pages load without CORS errors
- ✅ Products can be viewed and created
- ✅ Cart operations work
- ✅ API calls succeed with 200-400 status codes (not blocked)

## Key Files Modified

- `backend/app/main.py` - CORS configuration
- `backend/.env.production` - Production environment variables
- `frontend/vercel.json` - Vercel configuration with API URL
- `frontend/.env.local` - Local development configuration

## Troubleshooting

If you still see CORS errors after deploying:

1. **Check backend is running:**
   - Visit health endpoint
   - Check Railway logs

2. **Verify environment variables:**
   - Check Vercel project settings → Environment Variables
   - Ensure NEXT_PUBLIC_API_URL is set

3. **Check frontend is using correct URL:**
   - Open DevTools → Network
   - Check the request URL in the browser

4. **Clear cache:**
   - Vercel: hard refresh
   - Railway: restart the service

## Notes

- The regex `https://.*\.vercel\.app.*` allows all Vercel preview and production URLs
- CORS preflight requests (OPTIONS) are now properly cached for 24 hours
- All necessary HTTP methods and headers are explicitly listed for security
