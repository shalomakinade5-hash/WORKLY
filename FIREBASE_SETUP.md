# Workly — New Firebase Project Setup Guide

This guide walks you through setting up a **new, dedicated Firebase project** for Workly without touching any legacy databases.

---

## 1. Create the Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project**, name it (e.g., `workly-production`), and choose whether to enable Google Analytics.
3. Once created, click **Continue**.

---

## 2. Enable Authentication Providers

1. In your Firebase project sidebar, click **Build** > **Authentication**.
2. Click **Get Started**.
3. In the **Sign-in method** tab:
   - **Email/Password**: Click to edit, toggle **Enable**, and click **Save**. (Optional: leave Email link off).
   - **Google**: Click to edit, toggle **Enable**, enter your support email (`shalomakinade5@gmail.com`), and click **Save**.
4. In the **Settings** > **Authorized domains** tab, verify that your development domain and deployment domains (e.g. `ais-dev-...run.app`, `localhost`, `*.vercel.app`) are listed.

---

## 3. Provision Cloud Firestore

1. In the sidebar, click **Build** > **Firestore Database**.
2. Click **Create database**.
3. Choose your database location (e.g. `us-central1` or `europe-west2`).
4. Select **Start in production mode** (or test mode, but our `firestore.rules` will be deployed).
5. Deploy the provided `firestore.rules` file:
   - In Firebase Console > **Firestore Database** > **Rules** tab, paste the contents of `firestore.rules` from this repository and click **Publish**.

---

## 4. Firestore Indexes

Workly's queries are cleanly scoped by `userId` in subcollections (`users/{userId}/tasks`, etc.).
Firestore automatically creates single-field indexes for all subcollection fields.
Recommended composite indexes for large task volumes:
- Collection: `tasks`
  - Field: `status` (Ascending), `priority` (Descending), `dueDate` (Ascending)
- Collection: `transactions`
  - Field: `date` (Descending), `type` (Ascending)

---

## 5. Register the Web App and Copy Config

1. In the Project Overview page or Project Settings, click the **Web icon (`</>`)** to add an app.
2. Enter app nickname: `Workly Web`.
3. Click **Register app**.
4. Copy the `firebaseConfig` keys into your `.env` (or Vercel Environment Variables):

```env
VITE_FIREBASE_API_KEY="AIzaSyBsJTIIRHYzoMJenVPODmQDEalgubwqAJ4"
VITE_FIREBASE_AUTH_DOMAIN="workly-7d6a0.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="workly-7d6a0"
VITE_FIREBASE_STORAGE_BUCKET="workly-7d6a0.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="522549969173"
VITE_FIREBASE_APP_ID="1:522549969173:web:850d9aba494641db15691c"
```

You can also paste these directly in the Workly app UI under **Settings > Firebase Configuration** for instant live persistence.
