# Firebase Configuration Guide

This guide will walk you through setting up Firebase for The Common Loaf web app.

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** or select an existing project
3. Enter a project name (e.g., "The Common Loaf")
4. Follow the setup wizard:
   - Enable/disable Google Analytics (optional)
   - Choose or create a Google Analytics account if enabled
5. Click **"Create project"** and wait for it to finish

## Step 2: Register Your Web App

1. In your Firebase project, click the **Web icon** (`</>`) or **"Add app"** → **"Web"**
2. Register your app:
   - **App nickname**: "Common Loaf Web" (or any name)
   - **Firebase Hosting**: You can skip this for now (optional)
3. Click **"Register app"**
4. **Copy the Firebase configuration object** - it will look like this:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123..."
};
```

## Step 3: Set Up Environment Variables

1. Create a `.env.local` file in the root of your project (same level as `package.json`)

2. Add your Firebase configuration values:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

**Important Notes:**
- Replace all placeholder values with your actual Firebase config values
- The `NEXT_PUBLIC_` prefix is required for Next.js to expose these to the browser
- Never commit `.env.local` to git (it should already be in `.gitignore`)

## Step 4: Enable Authentication

1. In Firebase Console, go to **Authentication** (left sidebar)
2. Click **"Get started"** if you haven't set it up yet
3. Go to the **"Sign-in method"** tab
4. Enable **"Email/Password"**:
   - Click on "Email/Password"
   - Toggle **"Enable"** to ON
   - Click **"Save"**

**Note:** The app uses email/password authentication with phone numbers as email identifiers (format: `+1234567890@phoneauth.com`). This is handled automatically by the AuthService.

## Step 5: Set Up Firestore Database

1. In Firebase Console, go to **Firestore Database** (left sidebar)
2. Click **"Create database"**
3. Choose your security rules:
   - **Start in production mode** (recommended for now)
   - You can switch to test mode later for development
4. Choose a location for your database (select the closest to your users)
5. Click **"Enable"**

### Firestore Collections Structure

Your app expects these collections:

#### `users` Collection
Each document ID is the user's Firebase Auth UID.

**Document structure:**
```json
{
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+1234567890",
  "createdAt": Timestamp,
  "isDeleted": false (optional)
}
```

#### `gatherings` Collection
Each document represents a gathering/event.

**Document structure:**
```json
{
  "title": "Italian Dinner Night",
  "start": Timestamp,
  "end": Timestamp (optional),
  "locationId": "location_doc_id" (optional),
  "description": "A wonderful evening..." (optional),
  "attendeeUserIds": ["user_id_1", "user_id_2"],
  "waitlist": [] (array of WaitlistUser objects),
  "maxAttendees": 10 (optional, null for unlimited),
  "active": true,
  "isPublic": true,
  "menu": [
    {
      "type": "main",
      "recipeId": "recipe_doc_id"
    }
  ],
  "imageURL": "https://..." (optional),
  "costPerSeat": 25.00 (optional),
  "hostUserId": "user_id" (optional)
}
```

#### `recipes` Collection
Each document represents a recipe.

**Document structure:**
```json
{
  "name": "Pasta Carbonara",
  "description": "Classic Italian pasta..." (optional),
  "ingredients": ["pasta", "eggs", "bacon"] (optional),
  "country": "italy",
  "servingSize": "4 servings" (optional),
  "costPerServing": "$5" (optional),
  "imageURL": "https://..." (optional),
  "author": "Chef Name" (optional),
  "cookbook": "Book Name" (optional),
  "url": "https://..." (optional),
  "tags": ["vegetarian", "gluten-free"] (optional)
}
```

#### `locations` Collection
Each document represents a location.

**Document structure:**
```json
{
  "address": "123 Main St, Chicago, IL",
  "neighborhood": "Lincoln Park" (optional)
}
```

## Step 6: Set Up Firestore Security Rules

1. Go to **Firestore Database** → **Rules** tab
2. For development, you can use these rules (⚠️ **NOT for production**):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read their own data
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Gatherings - public read, authenticated write
    match /gatherings/{gatheringId} {
      allow read: if true; // Public gatherings are readable by all
      allow write: if request.auth != null;
    }
    
    // Recipes - public read
    match /recipes/{recipeId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Locations - public read
    match /locations/{locationId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

**For production**, implement more restrictive rules based on your security requirements.

## Step 7: Create Firestore Indexes (Optional but Recommended)

Some queries may require composite indexes. Firebase will prompt you to create them when needed, but you can create them proactively:

1. Go to **Firestore Database** → **Indexes** tab
2. Click **"Create Index"**
3. Create these indexes:

**Index 1:**
- Collection: `gatherings`
- Fields:
  - `active` (Ascending)
  - `start` (Ascending)
  - `isPublic` (Ascending)

**Index 2:**
- Collection: `gatherings`
- Fields:
  - `active` (Ascending)
  - `start` (Ascending)
  - `attendeeUserIds` (Array)

**Index 3:**
- Collection: `gatherings`
- Fields:
  - `active` (Ascending)
  - `start` (Descending)

## Step 8: Verify Your Setup

1. Make sure your `.env.local` file is in the project root
2. Restart your Next.js dev server:
   ```bash
   npm run dev
   ```
3. Open the app in your browser
4. Try signing up or signing in

## Troubleshooting

### "Firebase: Error (auth/configuration-not-found)"
- Check that all environment variables are set correctly in `.env.local`
- Make sure variable names start with `NEXT_PUBLIC_`
- Restart your dev server after changing `.env.local`

### "Missing or insufficient permissions"
- Check your Firestore security rules
- Make sure authentication is enabled
- Verify the user is signed in

### "Index required" errors
- Go to Firestore → Indexes and create the required composite index
- Wait for the index to build (can take a few minutes)

### Can't find Firebase config values
- Go to Firebase Console → Project Settings (gear icon)
- Scroll down to "Your apps" section
- Click on your web app
- The config object is shown there

## Next Steps

Once Firebase is configured:

1. **Test Authentication**: Try creating an account and signing in
2. **Add Test Data**: Create some test gatherings, recipes, and locations in Firestore
3. **Test the App**: Browse gatherings, book seats, view profile

## Production Deployment

When deploying to production:

1. Set environment variables in your hosting platform (Vercel, Netlify, etc.)
2. Update Firestore security rules for production
3. Enable Firebase App Check for additional security
4. Set up proper CORS rules if needed

## Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)

