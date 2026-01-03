# The Common Loaf - Web App

A mobile-first web application that mimics the iOS app functionality for The Common Loaf - a platform for discovering and reserving seats at home-hosted dinners.

## Features

- **Authentication**: Phone number + password sign in/sign up
- **Gatherings View**: Browse upcoming gatherings with "My Schedule" and "All Upcoming" sections
- **Gathering Details**: View full details, menu items, attendees, and book/cancel reservations
- **Profile View**: Track countries explored through past gatherings
- **Mobile-First Design**: Optimized for 100% mobile viewership

## Setup

### Prerequisites

- Node.js 18+ and npm
- Firebase project with Firestore and Authentication enabled

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up Firebase configuration:

Create a `.env.local` file in the root directory with your Firebase configuration:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

3. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your mobile browser or browser with mobile emulation.

## Firebase Setup

### Authentication

The app uses Firebase Authentication with email/password (with phone numbers as email identifiers). Make sure:

1. Email/Password authentication is enabled in Firebase Console
2. The authentication domain is configured correctly

### Firestore

The app expects the following collections:

- `users` - User profiles
- `gatherings` - Gathering/event data
- `recipes` - Recipe information
- `locations` - Location data

### Firestore Indexes

You may need to create composite indexes for optimal query performance:

1. `gatherings` collection:
   - Fields: `active` (Ascending), `start` (Ascending), `isPublic` (Ascending)
   - Fields: `active` (Ascending), `start` (Ascending), `attendeeUserIds` (Array)

## Project Structure

```
app/
  components/
    auth/          # Authentication views
    gatherings/    # Gathering list and detail views
    profile/       # Profile and countries explored view
  page.tsx         # Main entry point with auth routing
  layout.tsx       # Root layout
  globals.css      # Global styles and design system

lib/
  models/          # TypeScript models (User, Gathering, Recipe, etc.)
  services/        # Firebase services (AuthService, FirestoreService)
  firebase/        # Firebase configuration
  utils/           # Utility functions (date formatting, etc.)
```

## Differences from iOS App

- **Contacts Permission**: Not implemented (as requested - 100% web viewership)
- **Phone Auth Verification**: Simplified flow (you may need to implement Firebase Phone Auth for full verification)
- **Contact Images**: Not available (uses initials instead)

## Development

The app is built with:
- **Next.js 16** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Firebase** - Backend services

## Mobile Optimization

- Touch-friendly tap targets (minimum 44px)
- Mobile-first responsive design
- Prevents horizontal scroll
- Optimized for mobile viewport

## Notes

- The sign-up flow includes a verification code step, but you'll need to implement Firebase Phone Auth for full functionality
- The app assumes the same Firestore data structure as the iOS app
- All functionality matches the iOS app except contacts permission features
