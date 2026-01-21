# Vercel Deployment Guide

This guide will help you deploy the Rangila Gift Shop frontend to Vercel with automatic deployments on every commit.

## Prerequisites

1. A Vercel account (sign up at https://vercel.com)
2. Your backend API deployed and accessible
3. Git repository (GitHub, GitLab, or Bitbucket)

## Deployment Steps

### 1. Connect Your Repository to Vercel

1. Go to https://vercel.com/new
2. Import your Git repository
3. Vercel will auto-detect Next.js

### 2. Configure Project Settings

**Root Directory:** Set to `frontend`

**Build Command:** `npm run build` (or leave default)

**Output Directory:** `.next` (or leave default)

**Install Command:** `npm install` (or leave default)

### 3. Set Environment Variables

In the Vercel project settings, add the following environment variable:

- **Key:** `NEXT_PUBLIC_API_URL`
- **Value:** Your backend API URL (e.g., `https://your-backend-api.com`)

**Important:** 
- For production, use your production backend URL
- For preview deployments, you can use different URLs if needed
- The `NEXT_PUBLIC_` prefix makes this variable available in the browser

### 4. Deploy

Click "Deploy" and Vercel will:
- Install dependencies
- Build your Next.js app
- Deploy it to a global CDN
- Provide you with a URL

### 5. Automatic Deployments

Once connected, Vercel will automatically:
- Deploy on every push to your main branch
- Create preview deployments for pull requests
- Rebuild on every commit

## Environment Variables

Create a `.env.local` file for local development:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Note:** Never commit `.env.local` to git. It's already in `.gitignore`.

## Mobile Responsiveness

The site is now fully responsive with:
- Mobile-first design approach
- Responsive navigation menu
- Touch-friendly buttons and inputs
- Optimized layouts for all screen sizes
- Viewport meta tag configured

## Troubleshooting

### Build Fails
- Check that all dependencies are in `package.json`
- Verify Node.js version (Vercel uses Node 18+ by default)
- Check build logs in Vercel dashboard

### API Calls Fail
- Verify `NEXT_PUBLIC_API_URL` is set correctly
- Check CORS settings on your backend
- Ensure backend is accessible from Vercel's servers

### Images Not Loading
- Update `next.config.mjs` with your image domain
- Ensure image URLs are absolute (not relative)

## Custom Domain

1. Go to Project Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions
4. SSL certificates are automatically provisioned

## Performance

Vercel automatically provides:
- Global CDN
- Edge caching
- Automatic HTTPS
- Image optimization
- Analytics (on Pro plan)
