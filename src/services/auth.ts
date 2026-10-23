import {
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  deleteUser,
  updateProfile,
  onAuthStateChanged,
  type User
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from './firebase.ts';

export interface WorklyUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export function formatAuthError(error: any): string {
  if (!error) return 'An unexpected authentication error occurred.';
  const code = error.code || '';
  switch (code) {
    case 'auth/invalid-email':
      return 'The email address is not valid.';
    case 'auth/user-disabled':
      return 'This user account has been disabled.';
    case 'auth/user-not-found':
      return 'No account was found with this email.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please verify your credentials.';
    case 'auth/email-already-in-use':
      return 'An account already exists with this email address.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in popup was closed before completing.';
    case 'auth/popup-blocked':
      return 'Sign-in popup was blocked by your browser. Please allow popups for this site.';
    case 'auth/network-request-failed':
      return 'Network connection issue. Please check your internet connection.';
    case 'auth/configuration-not-found':
      return 'Authentication is not enabled in your Firebase project yet. Please go to Firebase Console -> Build -> Authentication, click "Get Started", and enable Email/Password or Google under the "Sign-in method" tab.';
    case 'auth/operation-not-allowed':
      return 'This sign-in method is not enabled. In Firebase Console -> Authentication -> Sign-in method, toggle this provider (Email/Password or Google) to Enabled and save.';
    case 'auth/unauthorized-domain':
      return `This domain (${typeof window !== 'undefined' ? window.location.hostname : 'current domain'}) is not authorized for Google Sign-in in Firebase Console.`;
    default:
      if (typeof error.message === 'string' && error.message.includes('auth/configuration-not-found')) {
        return 'Authentication is not enabled in your Firebase project yet. Please go to Firebase Console -> Build -> Authentication, click "Get Started", and enable Email/Password or Google under the "Sign-in method" tab.';
      }
      return error.message || 'Authentication failed. Please check your details.';
  }
}

export async function registerWithEmail(email: string, password: string, displayName: string): Promise<User> {
  if (!auth || !isFirebaseConfigured) {
    throw new Error('Firebase Authentication is not configured. Please add your new Firebase project credentials.');
  }
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (displayName.trim()) {
    await updateProfile(credential.user, { displayName: displayName.trim() });
  }
  return credential.user;
}

export async function loginWithEmail(email: string, password: string): Promise<User> {
  if (!auth || !isFirebaseConfigured) {
    throw new Error('Firebase Authentication is not configured. Please add your new Firebase project credentials.');
  }
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  return credential.user;
}

export async function loginWithGoogle(): Promise<User> {
  if (!auth || !isFirebaseConfigured) {
    throw new Error('Firebase Authentication is not configured. Please add your new Firebase project credentials.');
  }
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function resetPassword(email: string): Promise<void> {
  if (!auth || !isFirebaseConfigured) {
    throw new Error('Firebase Authentication is not configured. Please add your new Firebase project credentials.');
  }
  await sendPasswordResetEmail(auth, email.trim());
}

export async function logOut(): Promise<void> {
  if (auth) {
    await signOut(auth);
  }
}

export async function deleteCurrentAccount(): Promise<void> {
  if (!auth || !auth.currentUser) {
    throw new Error('No active user session to delete.');
  }
  await deleteUser(auth.currentUser);
}

export function subscribeToAuth(callback: (user: WorklyUser | null) => void): () => void {
  if (!auth || !isFirebaseConfigured) {
    callback(null);
    return () => {};
  }

  return onAuthStateChanged(auth, (user) => {
    if (user) {
      callback({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email?.split('@')[0] || 'Workly User',
        photoURL: user.photoURL
      });
    } else {
      callback(null);
    }
  });
}
