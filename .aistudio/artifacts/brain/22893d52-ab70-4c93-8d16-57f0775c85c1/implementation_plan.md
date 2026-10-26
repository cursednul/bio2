# Implementation Plan - Google Account Linked Admin System

Upgrade the administration suite by replacing passcode-only verification with real Google Account Authentication powered by Firebase Auth. Signing in with the whitelisted Google email (`kirya2010777@gmail.com`) automatically unlocks master admin privileges to manage live audio tracks, site banners, profile customizer, and layout styles.

---

## User Review Required

> [!IMPORTANT]
> - **Admin Whitelist**: The system will automatically recognize **`kirya2010777@gmail.com`** as the master administrator. Any other Google account will be authenticated as a standard visitor.
> - **Sign-in Flow**: Uses Firebase `signInWithPopup` with `GoogleAuthProvider`, allowing one-click login from mobile or desktop.

---

## Proposed Changes

### 1. Firebase Authentication Setup (`src/firebase.ts`)
- Export `GoogleAuthProvider` and `signInWithPopup`, `signOut`, `onAuthStateChanged` helpers.
- Ensure Firebase Auth is initialized and synced with app state.

### 2. Admin Modal Component Upgrade (`src/components/AdminModal.tsx`)
- Replace passcode entry screen with a modern **"Sign in with Google"** button.
- Check authenticated user's email against `kirya2010777@gmail.com` (and retain passcode fallback for quick emergency override).
- Display Google account profile avatar, display name, and verified badge in the admin header when authenticated.
- Provide a clean "Sign Out" button to log out of admin mode.

### 3. Main App Integration (`src/App.tsx`)
- Listen to Firebase Auth state change (`onAuthStateChanged`).
- Automatically detect when `kirya2010777@gmail.com` is signed in and set `isAdmin` state across the application.
- Maintain persistent admin status across browser refreshes and page navigation.

---

## Verification Plan

### Automated Verification
1. Run `compile_applet` to verify TypeScript compilation.
2. Run `lint_applet` to check for syntax and type safety errors.

### Manual Verification
1. Click the lock/admin icon in header.
2. Verify Google Authentication popup opens and authenticates user.
3. Confirm master admin tab unlocks and shows admin email `kirya2010777@gmail.com`.
4. Test track upload, music catalog deletion, marquee banner updates, and profile customizer.
