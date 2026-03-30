# Deployment Guide: QuizCraft on Render & Vercel

QuizCraft is now configured for production deployment with the backend on **Render** and the frontend on **Vercel**.

## Architecture

- **Backend (Render)**: Node.js + Express + PostgreSQL (Supabase)
- **Frontend (Vercel)**: React + Vite
- **Database**: Supabase PostgreSQL (hosted externally)

---

## Prerequisites

1. **GitHub Repository**: Push your code to GitHub
2. **Supabase Account**: Database setup complete with connection strings
3. **Google Gemini API Key**: For AI quiz generation
4. **Render Account**: https://render.com (free tier available)
5. **Vercel Account**: https://vercel.com (free tier available)

---

## Backend Deployment (Render)

### 1. Create a Web Service on Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New +** → **Web Service**
3. Connect your GitHub repository
4. Select the repository and click **Connect**
5. Fill in the settings:
   - **Name**: `quizcraft-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run migrate`
   - **Start Command**: `npm start`
   - **Plan**: Free (or paid for better uptime)

### 2. Set Environment Variables on Render

In the **Environment** tab, add these variables:

```
APP_URL=https://your-frontend-url.vercel.app
JWT_SECRET=<generate a long random string here>
DATABASE_URL=<get from Supabase connection pooler>
DIRECT_URL=<get from Supabase direct connection>
GEMINI_API_KEY=<your Google Gemini API key>
DB_SSL=true
MAX_FILE_SIZE=5242880
```

**How to get database URLs from Supabase:**
1. Go to Supabase Dashboard → Project Settings → Database
2. Under Connection Pooler, find `DATABASE_URL` (use this)
3. Under Connection URL, find the direct connection (use for `DIRECT_URL`)
4. Both should follow the format: `postgresql://user:password@host:port/dbname`

### 3. Deploy

- Render will automatically deploy when you push to your main branch
- Check **Logs** tab to monitor deployment
- Once deployed, you'll get a URL like: `https://quizcraft-backend-xxxx.onrender.com`

**Important**: Copy your Render backend URL for the next step (Frontend Deployment)

---

## Frontend Deployment (Vercel)

### 1. Import Project on Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New** → **Project**
3. Click **Import Git Repository**
4. Select your GitHub repository

### 2. Configure Project Settings

On the configuration page:
- **Framework Preset**: Vite
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 3. Set Environment Variables

Add this environment variable:
```
VITE_API_URL=https://your-backend-url.onrender.com
```

Replace `your-backend-url` with your actual Render backend URL from the previous step.

### 4. Deploy

- Click **Deploy**
- Vercel will automatically build and deploy your frontend
- Once complete, you'll get a URL like: `https://quizcraft.vercel.app`

---

## Update Backend URL (if not done yet)

Go back to **Render Dashboard**, open your backend service, and update the `APP_URL` environment variable to your Vercel frontend URL.

---

## Verification & Testing

1. **Frontend Loads**: Visit your Vercel URL
2. **Login Works**: Test teacher/student login
3. **API Calls Work**: Check browser DevTools **Network** tab for successful API requests
4. **Database Connected**: Create a quiz and verify it's saved

If API requests fail:
- Open browser DevTools → **Network** tab
- Check the API request URL (should be your Render URL)
- Verify `VITE_API_URL` in Vercel environment variables

---

## Troubleshooting

### Backend Won't Start (Render)

Check **Logs** tab on Render:
- Missing `DATABASE_URL`? Add it to environment variables
- Migration failed? Check database connection string format
- Port issues? Render automatically assigns PORT 3000

### Frontend Getting 502s or "Cannot Connect to API"

- Verify Render backend is running (check Render dashboard)
- Verify `VITE_API_URL` is set on Vercel
- Check CORS in backend (`APP_URL` should be your Vercel domain)

### Database Connection Issues

- Verify `DB_SSL=true` in Render environment variables
- Check database credentials in `DATABASE_URL`
- Test connection string locally: `psql <connection-string-here>`

---

## Local Development

Even with cloud deployments, you can still develop locally:

```bash
# Terminal 1: Backend
cd backend
npm install
npm run dev

# Terminal 2: Frontend
cd frontend
npm install
npm run dev
```

Then visit `http://localhost:5173` (frontend automatically proxies API calls to localhost:3001).

---

## Custom Domain (Optional)

### Vercel Custom Domain
1. Go to Vercel Project Settings → Domains
2. Add your custom domain
3. Follow DNS configuration steps

### Render Custom Domain
1. Go to Render Service Settings → Custom Domain
2. Add your domain and follow DNS steps

---

## Environment Variables Reference

### Backend (.env)
- `PORT`: Set by Render (default 3000)
- `APP_URL`: Your Vercel frontend URL (for CORS)
- `JWT_SECRET`: Generate with `openssl rand -hex 32`
- `DATABASE_URL`: Supabase pooled connection
- `DIRECT_URL`: Supabase direct connection (for migrations)
- `GEMINI_API_KEY`: From Google Cloud Console
- `DB_SSL`: Always `true` for Supabase

### Frontend (.env.local during development)
- `VITE_API_URL`: Set on Vercel, use localhost:3001 locally

---

## CI/CD

Both Render and Vercel support automatic deployments:
- **Push to main** → Automatic deployment to production
- **Pull requests** → Preview deployments (Vercel)
- **Render deploys** → Can take 2-5 minutes

---

## Cost Considerations

- **Render Free Tier**: 750 free hours/month (enough for testing)
- **Vercel Free Tier**: Unlimited free tier deployments
- **Supabase**: Free tier with PostgreSQL included

This setup is suitable for production with minimal costs.
