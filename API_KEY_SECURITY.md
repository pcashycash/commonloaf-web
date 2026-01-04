# API Key Security - Adding Restrictions

Since your Firebase API key was exposed in GitHub, you should add restrictions to prevent unauthorized use.

## Step 1: Add API Key Restrictions

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project: **The Common Loaf**
3. Navigate to **APIs & Services → Credentials**
4. Find your API key: `AIzaSyCAdK8kpzyEIr_er5oAcmmNROxX_jOETDQ`
5. Click on the API key to edit it

### Application Restrictions

1. Under **Application restrictions**, select **HTTP referrers (web sites)**
2. Click **Add an item** and add your domains:
   - `localhost:3000` (for local development)
   - `*.vercel.app` (for Vercel deployments - the `*` wildcard covers all Vercel subdomains)
   - Your custom domain if you have one (e.g., `*.yourdomain.com` or `yourdomain.com`)
   
   Example:
   ```
   localhost:3000/*
   *.vercel.app/*
   yourdomain.com/*
   *.yourdomain.com/*
   ```

### API Restrictions

1. Under **API restrictions**, select **Restrict key**
2. Select these APIs:
   - Firebase Authentication API
   - Cloud Firestore API
   - Firebase Installations API
   - Firebase Remote Config API (if using)
   - Any other Firebase APIs you're using

3. Click **Save**

## Step 2: Set Environment Variables in Vercel

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings → Environment Variables**
4. Add these variables (set for Production, Preview, and Development):
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyCAdK8kpzyEIr_er5oAcmmNROxX_jOETDQ
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=the-common-loaf.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=the-common-loaf
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=the-common-loaf.firebasestorage.app
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=108770179795
   NEXT_PUBLIC_FIREBASE_APP_ID=1:108770179795:web:c0ef83fc4f8429fa743226
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-QVX4BGRB9S
   ```

## Step 3: Commit and Push Changes

The config.ts file now uses environment variables instead of hardcoded values. Commit and push:

```bash
git add lib/firebase/config.ts
git commit -m "Switch Firebase config to environment variables"
git push origin main
```

## Optional: Regenerate API Key (If You Want Extra Security)

If you want to regenerate the compromised key:

1. In Google Cloud Console → Credentials
2. Click on your API key
3. Click **Regenerate key**
4. Copy the new key
5. Update it in:
   - `.env.local` (local development)
   - Vercel Environment Variables (production)
   - Firebase Console (if needed)

**Note:** Regenerating is optional since you're adding restrictions, which should prevent unauthorized use.

## Important Notes

- The API key will still be visible in the browser's JavaScript bundle (this is normal for Firebase client-side keys)
- Restrictions limit where the key can be used (which domains)
- API restrictions limit which APIs the key can access
- The key is now in environment variables, not in your source code (going forward)
- Your `.env.local` file should already have these values for local development

