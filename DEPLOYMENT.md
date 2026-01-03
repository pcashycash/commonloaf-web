# Deployment Guide - The Common Loaf Web App

This guide covers deploying your Next.js app to production.

## Deployment Options

### Option 1: Vercel (Recommended for Next.js)

**Why Vercel?**
- Built by the Next.js team
- Zero-config deployment
- Automatic HTTPS
- Global CDN
- Free tier available
- Automatic deployments from Git

**Steps:**

1. **Prepare your code:**
   ```bash
   # Make sure everything is committed to Git
   git add .
   git commit -m "Ready for production"
   git push origin main
   ```

2. **Deploy to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Sign up/Login with GitHub (or GitLab/Bitbucket)
   - Click "Add New Project"
   - Import your repository
   - Vercel will auto-detect Next.js settings

3. **Add Environment Variables:**
   - In Vercel project settings → Environment Variables
   - Add all your Firebase variables:
     ```
     NEXT_PUBLIC_FIREBASE_API_KEY=your_key
     NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=the-common-loaf.firebaseapp.com
     NEXT_PUBLIC_FIREBASE_PROJECT_ID=the-common-loaf
     NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=the-common-loaf.firebasestorage.app
     NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=108770179795
     NEXT_PUBLIC_FIREBASE_APP_ID=1:108770179795:web:c0ef83fc4f8429fa743226
     NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-QVX4BGRB9S
     ```
   - Set them for "Production", "Preview", and "Development" environments
   - Click "Save"

4. **Deploy:**
   - Vercel will automatically deploy
   - You'll get a URL like: `your-app.vercel.app`
   - Every push to main will trigger a new deployment

5. **Custom Domain (Optional):**
   - Go to Project Settings → Domains
   - Add your custom domain (e.g., `thecommonloaf.com`)
   - Follow DNS configuration instructions

### Option 2: Netlify

1. **Install Netlify CLI:**
   ```bash
   npm install -g netlify-cli
   ```

2. **Build your app:**
   ```bash
   npm run build
   ```

3. **Deploy:**
   ```bash
   netlify deploy --prod
   ```

4. **Add Environment Variables:**
   - Go to Netlify Dashboard → Site Settings → Environment Variables
   - Add all Firebase variables

### Option 3: Self-Hosted (VPS/Server)

1. **Build the app:**
   ```bash
   npm run build
   ```

2. **Start production server:**
   ```bash
   npm start
   ```

3. **Use a process manager (PM2 recommended):**
   ```bash
   npm install -g pm2
   pm2 start npm --name "commonloaf-web" -- start
   pm2 save
   pm2 startup
   ```

4. **Set up reverse proxy (Nginx):**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

5. **Set up SSL (Let's Encrypt):**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

## Pre-Deployment Checklist

### 1. Environment Variables
- [ ] All `NEXT_PUBLIC_*` variables are set in production
- [ ] No hardcoded secrets in code
- [ ] `.env.local` is in `.gitignore` (already done)

### 2. Firebase Configuration

**Update Firebase Authorized Domains:**
1. Go to Firebase Console → Authentication → Settings
2. Add your production domain to "Authorized domains"
3. Add your Vercel/Netlify domain if using those platforms

**Update Firestore Security Rules for Production:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users - can read/write their own data
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Gatherings - public read, authenticated write
    match /gatherings/{gatheringId} {
      allow read: if resource.data.isPublic == true || 
                     (request.auth != null && 
                      request.auth.uid in resource.data.attendeeUserIds);
      allow create, update: if request.auth != null;
      allow delete: if request.auth != null && 
                       request.auth.uid == resource.data.hostUserId;
    }
    
    // Recipes - public read, authenticated write
    match /recipes/{recipeId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Locations - public read, authenticated write
    match /locations/{locationId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

### 3. Build Test
```bash
# Test the production build locally
npm run build
npm start
# Visit http://localhost:3000 to test
```

### 4. Performance Optimization
- [ ] Images are optimized (Next.js Image component)
- [ ] Code splitting is working
- [ ] Check bundle size: `npm run build` shows bundle analysis

### 5. Analytics (Optional)
- Firebase Analytics is already configured
- Consider adding Google Analytics or other tracking

## Post-Deployment

### 1. Test Production Site
- [ ] Authentication works
- [ ] Data loads correctly
- [ ] All features work as expected
- [ ] Mobile experience is good
- [ ] No console errors

### 2. Monitor
- Check Firebase Console for errors
- Monitor Vercel/Netlify dashboard for build issues
- Set up error tracking (Sentry, etc.)

### 3. Set Up Custom Domain (Optional)
1. Buy a domain (Namecheap, Google Domains, etc.)
2. Add DNS records:
   - For Vercel: Add CNAME record pointing to `cname.vercel-dns.com`
   - For Netlify: Add A record or CNAME as instructed
3. Configure in hosting platform
4. Wait for DNS propagation (can take up to 48 hours)

## Continuous Deployment

### With Vercel/Netlify:
- Every push to `main` branch = automatic deployment
- Pull requests = preview deployments
- No manual steps needed after initial setup

### With Self-Hosted:
Set up a CI/CD pipeline:
1. GitHub Actions
2. GitLab CI
3. Jenkins
4. Or manual deployment script

## Environment-Specific Configs

You might want different configs for:
- **Development**: `localhost:3000`
- **Staging**: `staging.yourdomain.com`
- **Production**: `yourdomain.com`

Set environment variables separately for each in your hosting platform.

## Troubleshooting

### Build Fails
- Check for TypeScript errors: `npm run build`
- Check for missing environment variables
- Review build logs in hosting platform

### App Works Locally But Not in Production
- Verify all environment variables are set
- Check Firebase authorized domains
- Review browser console for errors
- Check network tab for failed requests

### Slow Performance
- Enable Next.js Image Optimization
- Check bundle size
- Use Vercel's Analytics to identify bottlenecks
- Consider enabling caching headers

## Cost Considerations

### Vercel
- **Free tier**: 100GB bandwidth, unlimited requests
- **Pro**: $20/month for more bandwidth and features

### Netlify
- **Free tier**: 100GB bandwidth, 300 build minutes/month
- **Pro**: $19/month

### Firebase
- **Free tier (Spark)**: Generous limits for most apps
- **Blaze (Pay-as-you-go)**: Scales automatically

## Security Checklist

- [ ] Firestore security rules are production-ready
- [ ] Authentication is properly configured
- [ ] No sensitive data in client-side code
- [ ] HTTPS is enabled (automatic with Vercel/Netlify)
- [ ] CORS is configured if needed
- [ ] Rate limiting considered (Firebase has built-in limits)

## Next Steps After Deployment

1. **Test thoroughly** on production URL
2. **Share with beta users** for feedback
3. **Monitor performance** and errors
4. **Set up alerts** for critical errors
5. **Plan for scaling** if needed

## Quick Deploy Commands

```bash
# Build for production
npm run build

# Test production build locally
npm start

# Deploy to Vercel (if using Vercel CLI)
vercel --prod

# Deploy to Netlify (if using Netlify CLI)
netlify deploy --prod
```

