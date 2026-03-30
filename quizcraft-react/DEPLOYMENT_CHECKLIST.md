# Quick Deployment Checklist

## Before You Deploy

- [ ] Push all changes to GitHub main branch
- [ ] Have your Supabase database URL ready
- [ ] Have your Google Gemini API key ready
- [ ] Generate a JWT_SECRET: `openssl rand -hex 32`
- [ ] Decide on your custom domains (optional)

## Backend Deployment (Render)

1. [ ] Create Render account at https://render.com
2. [ ] Click "New +" → "Web Service"
3. [ ] Connect GitHub and select repository
4. [ ] Settings:
   - Service name: `quizcraft-backend`
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`
5. [ ] Add Environment Variables (copy from backend/.env.example):
   - [ ] PORT=3000
   - [ ] APP_URL=https://quizai-fkl269y5v-cer0521s-projects.vercel.app
   - [ ] JWT_SECRET=[Generate a random string]
   - [ ] DATABASE_URL=[From Supabase]
   - [ ] DIRECT_URL=[From Supabase]
   - [ ] GEMINI_API_KEY=[Your API key]
   - [ ] DB_SSL=true
   - [ ] MAX_FILE_SIZE=5242880
6. [ ] Click Deploy
7. [ ] **Copy your Render URL** (e.g., https://quizcraft-backend-xxx.onrender.com)
8. [ ] Test: Visit `https://your-backend-url/api/health` (should return `{"status":"ok"}`)

## Frontend Deployment (Vercel)

1. [ ] Create Vercel account at https://vercel.com
2. [ ] Click "Add New" → "Project"
3. [ ] Import your GitHub repository
4. [ ] Settings:
   - Framework: Vite
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. [ ] Add Environment Variables:
   - [ ] VITE_API_URL=[Your Render backend URL from above]
6. [ ] Click Deploy
7. [ ] Wait for deployment to complete
8. [ ] **Copy your Vercel URL** (or check for custom domain)

## Post-Deployment

1. [ ] Go back to Render backend service
2. [ ] Update APP_URL environment variable to your Vercel URL
3. [ ] Verify frontend loads: Visit your Vercel URL
4. [ ] Test login
5. [ ] Check browser console for any API errors
6. [ ] Create a test quiz to verify database connection

## If Something Goes Wrong

### Backend won't deploy (Render)
- Check Logs tab - look for DATABASE_URL or connection errors
- Verify all environment variables are set
- Ensure database connection string is correct

### Frontend can't reach backend (Vercel)
- Verify VITE_API_URL is set correctly
- Check browser Network tab to see actual API request URL
- Ensure Render backend service is running

### Database connection fails
- Test connection locally: `psql postgres://<connection-string>`
- Verify DATABASE_URL format: `postgresql://user:pass@host:port/db`
- Enable DB_SSL=true for remote connections

## Helpful Links

- Render Dashboard: https://dashboard.render.com
- Vercel Dashboard: https://vercel.com/dashboard
- Supabase Dashboard: https://supabase.com/dashboard
- Render Docs: https://render.com/docs
- Vercel Docs: https://vercel.com/docs
