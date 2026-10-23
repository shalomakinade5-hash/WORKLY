# Workly — Vercel Deployment Guide

Deploying Workly to Vercel takes less than two minutes.

---

## 1. Prerequisites
- A GitHub repository containing the Workly codebase.
- A [Vercel account](https://vercel.com).
- A newly created Firebase project configuration (see `FIREBASE_SETUP.md`).
- Optional: Google Cloud OAuth Client ID for Calendar sync.

---

## 2. Import Project to Vercel
1. Log in to [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New...** > **Project**.
2. Select your Workly GitHub repository and click **Import**.
3. **Framework Preset**: Vercel will automatically detect `Vite`.
4. **Build and Output Settings**:
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

---

## 3. Configure Environment Variables in Vercel
Before clicking Deploy, expand the **Environment Variables** section and add the public variables from your new Firebase and Google configurations:

| Key | Value for workly-7d6a0 |
| :--- | :--- |
| `VITE_FIREBASE_API_KEY` | `AIzaSyBsJTIIRHYzoMJenVPODmQDEalgubwqAJ4` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `workly-7d6a0.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `workly-7d6a0` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `workly-7d6a0.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `522549969173` |
| `VITE_FIREBASE_APP_ID` | `1:522549969173:web:850d9aba494641db15691c` |
| `VITE_GOOGLE_CLIENT_ID` | `your-google-oauth-client-id.apps.googleusercontent.com` |
| `APP_URL` | `https://your-workly-domain.vercel.app` |

---

## 4. Post-Deployment Origin Authorization
1. Copy your live Vercel production domain (e.g. `https://workly-app.vercel.app`).
2. In **Firebase Console**:
   - Go to **Authentication** > **Settings** > **Authorized domains**.
   - Add your Vercel domain (`workly-app.vercel.app`).
3. In **Google Cloud Console**:
   - Go to **APIs & Services** > **Credentials** > Click your OAuth 2.0 Web Client.
   - Under **Authorized JavaScript origins**, add `https://workly-app.vercel.app`.
   - Save changes.
