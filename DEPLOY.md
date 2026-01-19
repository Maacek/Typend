# Visual Analyzer - Deployment Guide

**For complete deployment instructions, see the brain artifacts:**
- `deployment_plan.md` - Comprehensive deployment guide
- `deployment_task.md` - Task checklist

## Quick Start Deployment

### 1. GitHub Upload
```bash
cd visual-analyzer
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/visual-analyzer.git
git push -u origin main
```

### 2. Database (Neon - Free)
1. Sign up at https://neon.tech
2. Create project "visual-analyzer"
3. Copy DATABASE_URL

### 3. Backend (Railway - $5/month)
1. Sign up at https://railway.app
2. New Project → Deploy from GitHub
3. Select backend directory
4. Add environment variables from `.env.example`
5. Add Redis database

### 4. Frontend (Vercel - Free)
1. Sign up at https://vercel.com
2. Import GitHub repository
3. Set root directory to `frontend`
4. Add NEXT_PUBLIC_API_URL environment variable

### 5. Custom Domain
- Frontend: Add domain in Vercel settings
- Backend: Add domain in Railway settings
- Update DNS records

## Support

See detailed instructions in `deployment_plan.md`
