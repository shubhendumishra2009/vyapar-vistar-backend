# VyaparVistar - Deployment Documentation

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Live URLs](#live-urls)
3. [Architecture](#architecture)
4. [GitHub Repositories](#github-repositories)
5. [Environment Configuration](#environment-configuration)
6. [Git Commands Reference](#git-commands-reference)
7. [Deployment Platforms](#deployment-platforms)
8. [Database Configuration](#database-configuration)
9. [Development Workflow](#development-workflow)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 Project Overview

**VyaparVistar** is a complete ERP (Enterprise Resource Planning) system for retail and wholesale businesses, consisting of:

1. **A2Wares Company Website** - Static marketing website
2. **VyaparVistar Frontend** - React web application
3. **VyaparVistar Backend** - Node.js/Express API server
4. **Database** - MySQL on AWS RDS

---

## 🌐 Live URLs

| Service | URL | Platform | Status |
|---------|-----|----------|--------|
| **Company Website** | https://a2wares.com | Netlify | ✅ Live |
| **VyaparVistar App** | https://vyaparvistar.a2wares.com | Vercel | ✅ Live |
| **Backend API** | https://vyapar-vistar-backend.onrender.com | Render | ✅ Live |
| **Database** | AWS RDS MySQL | AWS | ✅ Connected |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        User Access                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Frontend (Vercel)                                           │
│  https://vyaparvistar.a2wares.com                            │
│  React + TypeScript + Vite                                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Backend (Render)                                            │
│  https://vyapar-vistar-backend.onrender.com                  │
│  Node.js + Express + Socket.IO                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Database (AWS RDS)                                          │
│  MySQL Database                                              │
│  vyapar-vistar.cpsoq2kiomwh.eu-north-1.rds.amazonaws.com     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Company Website (Netlify)                                   │
│  https://a2wares.com                                         │
│  Static HTML/CSS/JS                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 GitHub Repositories

| Repository | URL | Purpose | Visibility |
|------------|-----|---------|------------|
| **vyapar-vistar-web** | https://github.com/shubhendumishra2009/vyapar-vistar-web | Frontend code | Private |
| **vyapar-vistar-backend** | https://github.com/shubhendumishra2009/vyapar-vistar-backend | Backend code | Private |
| **a2wares-website** | https://github.com/shubhendumishra2009/a2wares-website | Company website | Public |

---

## ⚙️ Environment Configuration

### Frontend Environment Variables

**Local Development** (`web/.env` - gitignored):
```env
VITE_API_URL=http://localhost:5000/api
```

**Production** (Vercel Environment Variable):
```
Key: VITE_API_URL
Value: https://vyapar-vistar-backend.onrender.com/api
Environment: Production
```

### Backend Environment Variables

**Local Development** (`backend/.env` - gitignored):
```env
# MySQL Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=rootroot
DB_NAME=vyaparvistar

# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=jowiqyhkjHIUyjkjjigsuydxkjcnjkxzguydyahjkdxzjhgcuyzx

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:19006
```

**Production** (Render Environment Variables):
```
NODE_ENV=production
DB_HOST=vyapar-vistar.cpsoq2kiomwh.eu-north-1.rds.amazonaws.com
DB_PORT=3306
DB_USER=admin
DB_PASSWORD=shubhu1984
DB_NAME=vyapar-vistar
JWT_SECRET=jowiqyhkjHIUyjkjjigsuydxkjcnjkxzguydyahjkdxzjhgcuyzx
FRONTEND_URL=https://vyaparvistar.a2wares.com
```

---

## 🚀 Git Commands Reference

### Frontend (web folder)

```bash
# Navigate to frontend directory
cd web

# Check status
git status

# Stage all changes
git add .

# Commit changes
git commit -m "Your commit message"

# Push to GitHub
git push origin main

# Pull latest changes
git pull origin main

# View commit history
git log --oneline

# Create new branch
git checkout -b feature-branch-name

# Switch to main branch
git checkout main

# Merge branch
git merge feature-branch-name
```

### Backend (backend folder)

```bash
# Navigate to backend directory
cd backend

# Check status
git status

# Stage all changes
git add .

# Commit changes
git commit -m "Your commit message"

# Push to GitHub
git push origin main

# Pull latest changes
git pull origin main

# View commit history
git log --oneline
```

### Important Notes:
- ⚠️ **NEVER** commit `.env` files (they are gitignored)
- ✅ `.env` files contain sensitive credentials
- ✅ Only commit source code files
- ✅ Always pull before making changes to avoid conflicts

---

## 🖥️ Deployment Platforms

### 1. Vercel (Frontend)

**Project Name:** vyapar-vistar  
**Repository:** vyapar-vistar-web  
**Root Directory:** `web`  
**Build Command:** `npm run build`  
**Output Directory:** `dist`  
**Framework:** Vite

**Environment Variables:**
- `VITE_API_URL` = `https://vyapar-vistar-backend.onrender.com/api`

**Auto-Deploy:** Enabled (pushes to `main` branch trigger deployment)

**To Redeploy:**
1. Go to Vercel Dashboard
2. Select project
3. Deployments → ... → Redeploy

---

### 2. Render (Backend)

**Service Name:** vyapar-vistar-backend  
**Repository:** vyapar-vistar-backend  
**Root Directory:** `backend`  
**Build Command:** `npm install`  
**Start Command:** `npm start`  
**Plan:** Free (Hobby) or Starter ($7/month)

**Environment Variables:**
- `NODE_ENV` = `production`
- `DB_HOST` = `vyapar-vistar.cpsoq2kiomwh.eu-north-1.rds.amazonaws.com`
- `DB_PORT` = `3306`
- `DB_USER` = `admin`
- `DB_PASSWORD` = `shubhu1984`
- `DB_NAME` = `vyapar-vistar`
- `JWT_SECRET` = `jowiqyhkjHIUyjkjjigsuydxkjcnjkxzguydyahjkdxzjhgcuyzx`
- `FRONTEND_URL` = `https://vyaparvistar.a2wares.com`

**Auto-Deploy:** Enabled (pushes to `main` branch trigger deployment)

**To Redeploy:**
1. Go to Render Dashboard
2. Select service
3. Manual Deploy → Deploy latest commit

---

### 3. Netlify (Company Website)

**Site Name:** a2wares  
**Repository:** a2wares-website  
**Root Directory:** `a2wares-website`  
**Publish Directory:** `.` (root)

**Custom Domain:** https://a2wares.com  
**SSL:** Auto-provisioned by Netlify

**To Redeploy:**
1. Go to Netlify Dashboard
2. Select site
3. Deploys → Trigger deploy → Deploy site

---

## 🗄️ Database Configuration

### AWS RDS MySQL

**Instance Identifier:** vyapar-vistar  
**Endpoint:** vyapar-vistar.cpsoq2kiomwh.eu-north-1.rds.amazonaws.com  
**Port:** 3306  
**Database Name:** vyapar-vistar  
**Username:** admin  
**Region:** eu-north-1  

**Connection:**
- **From Render:** ✅ Connected (via security group)
- **From Local:** ✅ Connected (publicly accessible)

**Backup:** Automated backups enabled (7 days retention)

---

## 💻 Development Workflow

### Local Development Setup

#### Frontend:
```bash
cd web
npm install
npm run dev
# Opens at http://localhost:3000
```

#### Backend:
```bash
cd backend
npm install
npm start
# Runs at http://localhost:5000
```

#### Database:
- Uses local MySQL: `vyaparvistar`
- Connection: `localhost:3306`
- User: `root`
- Password: `rootroot`

---

### Making Changes and Deploying

#### 1. Frontend Changes:
```bash
cd web
# Make code changes
git add .
git commit -m "Add new feature"
git push origin main
# Vercel auto-deploys in 1-2 minutes
```

#### 2. Backend Changes:
```bash
cd backend
# Make code changes
git add .
git commit -m "Fix API bug"
git push origin main
# Render auto-deploys in 2-5 minutes
```

#### 3. Company Website Changes:
```bash
cd a2wares-website
# Make code changes
git add .
git commit -m "Update homepage"
git push origin main
# Netlify auto-deploys in 1-2 minutes
```

---

## 🔧 Configuration Files

### Frontend
- **API Configuration:** `web/src/services/api.ts`
- **Local Environment:** `web/.env` (gitignored)
- **Git Ignore:** `web/.gitignore`

### Backend
- **Server Entry:** `backend/server.js`
- **Local Environment:** `backend/.env` (gitignored)
- **Git Ignore:** `backend/.gitignore`
- **Models:** `backend/models/`
- **Routes:** `backend/routes/`

### Company Website
- **Main Page:** `a2wares-website/index.html`
- **Styles:** Inline CSS in index.html

---

## 🐛 Troubleshooting

### Frontend Issues

**Problem:** Frontend not connecting to backend  
**Solution:**
1. Check `VITE_API_URL` in Vercel environment variables
2. Verify backend is running: https://vyapar-vistar-backend.onrender.com/api/health
3. Check browser console for CORS errors

**Problem:** Changes not reflecting on live site  
**Solution:**
1. Check Vercel dashboard for deployment status
2. Manually trigger redeploy if needed
3. Clear browser cache

---

### Backend Issues

**Problem:** Backend not starting  
**Solution:**
1. Check Render logs for errors
2. Verify environment variables are set correctly
3. Check database connection (AWS RDS security groups)

**Problem:** Database connection failed  
**Solution:**
1. Verify AWS RDS is running
2. Check security groups allow access from Render IPs
3. Verify credentials in environment variables

**Problem:** Local backend can't connect to database  
**Solution:**
1. Check MySQL is running locally
2. Verify credentials in `backend/.env`
3. Test connection: `mysql -u root -prootroot`

---

### Database Issues

**Problem:** Tables not created  
**Solution:**
1. Backend auto-creates tables on first run
2. Check server logs for migration errors
3. Manually run migrations if needed

**Problem:** Data not persisting  
**Solution:**
1. Check database connection
2. Verify correct database being used (local vs AWS)
3. Check for transaction rollbacks in logs

---

## 📝 Important Notes

### Security
- ✅ `.env` files are gitignored and never pushed to GitHub
- ✅ Production credentials stored in platform environment variables
- ✅ JWT secret used for authentication
- ✅ CORS configured to allow only specific origins

### Performance
- ✅ Vercel CDN for frontend (global distribution)
- ✅ Render auto-scaling for backend
- ✅ AWS RDS with automated backups
- ✅ Free tier suitable for development/testing

### Monitoring
- **Frontend:** Vercel Analytics
- **Backend:** Render Logs
- **Database:** AWS CloudWatch
- **Uptime:** All platforms provide status monitoring

---

## 🔄 Update History

| Date | Change | Author |
|------|--------|--------|
| 2025-07-28 | Initial deployment setup | Shubhendu Mishra |
| 2025-07-28 | Environment variable configuration | Shubhendu Mishra |
| 2025-07-28 | Local database setup | Shubhendu Mishra |

---

## 📞 Support

For issues or questions:
1. Check this documentation first
2. Review platform-specific logs (Vercel, Render, Netlify)
3. Check GitHub repository issues
4. Contact: info@a2wares.com

---

## 🎯 Quick Reference

### URLs to Remember:
- **Frontend:** https://vyaparvistar.a2wares.com
- **Backend:** https://vyapar-vistar-backend.onrender.com
- **Company Site:** https://a2wares.com
- **Backend Health:** https://vyapar-vistar-backend.onrender.com/api/health

### Git Workflow:
```bash
# Frontend
cd web && git add . && git commit -m "msg" && git push

# Backend
cd backend && git add . && git commit -m "msg" && git push

# Company Website
cd a2wares-website && git add . && git commit -m "msg" && git push
```

### Local Development:
```bash
# Terminal 1 - Backend
cd backend && npm start

# Terminal 2 - Frontend
cd web && npm run dev
```

---

**Last Updated:** 2025-07-28  
**Version:** 1.0.0  
**Maintained By:** Shubhendu Mishra (A2Wares)