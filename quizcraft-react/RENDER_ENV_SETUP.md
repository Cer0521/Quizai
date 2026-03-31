# ⚙️ REQUIRED Render Environment Variables

Your Render backend needs these exact variables set. Verify each one on the Render dashboard.

## Steps to Fix on Render Dashboard:

1. Go to: **Service** → **quizcraft-backend** → **Environment**
2. Add/update these variables EXACTLY as shown below
3. Click "Save" (auto-redeploy)

---

## Environment Variables to Set:

### Database (CRITICAL - Most configs wrong here)
```
DATABASE_URL=postgresql://postgres:Espiritu0521%21@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require
DIRECT_URL=postgresql://postgres:Espiritu0521%21@db.ofmvpsywpducpoghxnsc.supabase.co:5432/postgres?sslmode=require
```

**⚠️ IMPORTANT NOTES:**
- Password `!` MUST be encoded as `%21`
- Do NOT include your actual database URL here - copy from above
- The pooler (port 6543) is for app traffic
- The direct connection (port 5432) is for migrations

### Authentication
```
JWT_SECRET=00b5909b76183d8a76a8fcc7370c1bf0cecba6a9a16ebc77ad4c912875c6908c
```

### API Keys
```
GEMINI_API_KEY=AIzaSyBGgDZbfaZK8MabZkuhJFi_jen69NPLa30
```

### Network
```
APP_URL=https://quizai-1ogu.vercel.app
DB_SSL=true
PORT=3000
```

### File Upload
```
MAX_FILE_SIZE=5242880
```

---

## Common Issues:

### "password authentication failed for user postgres"
- **Cause**: DATABASE_URL has wrong password or no password
- **Fix**: Use the exact URL above with `%21` for `!`

### "connect ENETUNREACH" on IPv6
- **Cause**: Render tries IPv6 first, times out
- **Fix**: Backend now forces IPv4. Deploy these changes to activate.

### "X-Forwarded-For header" error
- **Cause**: Rate limiter misconfiguration on proxy
- **Fix**: Already fixed in backend index.js. Deploy needed.

---

## What to Do Now:

1. ✅ Update **all** variables above on Render dashboard
2. ✅ Click **Save** (triggers auto-deploy)
3. ⏳ Wait 2-3 min for deployment
4. ✅ Test login at: https://quizai-1ogu.vercel.app
5. 📋 If still fails, check Render logs for new errors

---

## Testing After Deploy:

Go to browser console and test:
```javascript
fetch('https://quizai-1-ydi0.onrender.com/api/health')
  .then(r => r.json())
  .then(console.log)
```

Should show: `{status: "ok"}`

If 500 error still, paste the Render log error here.
