// Dedicated Fixed Admin Authentication Gate for INSTA-MART
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile } from '../types';

const ADMIN_STORAGE_KEY = 'instamart_admin_session';

// Fixed admin credentials as requested
export const FIXED_ADMIN_ID = 'ADMIN551';
export const FIXED_ADMIN_PASSWORD = 'ADMIN@ADMIN1';
export const FIREBASE_ADMIN_EMAIL = 'panelaccess379@gmail.com';

/**
 * Checks if the admin is currently authenticated in the browser storage
 */
export function isAdminSessionActive(): boolean {
  try {
    const session = localStorage.getItem(ADMIN_STORAGE_KEY);
    return session === 'active_authenticated';
  } catch {
    return false;
  }
}

/**
 * Verifies admin credentials against the fixed requirement:
 * Admin ID: ADMIN551
 * Admin Password: ADMIN@ADMIN1
 */
export function verifyAdminCredentials(adminId: string, adminPassword: string): boolean {
  if (!adminId || !adminPassword) return false;
  return adminId.trim() === FIXED_ADMIN_ID && adminPassword === FIXED_ADMIN_PASSWORD;
}

/**
 * Ensures the admin profile exists with role: 'admin' in Firestore
 */
async function ensureAdminFirestoreDoc(uid: string) {
  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      const adminProfile: UserProfile = {
        id: uid,
        uid: uid,
        email: FIREBASE_ADMIN_EMAIL,
        username: 'admin551',
        name: 'Administrator',
        mobile: '',
        role: 'admin',
        currency: 'INR',
        balance: 0,
        isBlocked: false,
        totalOrders: 0,
        totalSpent: 0,
        totalDeposits: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastLoginAt: Date.now(),
      };
      await setDoc(userRef, adminProfile);
    } else {
      const data = snap.data() as UserProfile;
      if (data.role !== 'admin') {
        await updateDoc(userRef, { role: 'admin', updatedAt: Date.now() });
      }
    }
  } catch (err) {
    console.warn('Admin profile initialization notice:', err);
  }
}

/**
 * Logs in the admin session if credentials match exactly and authenticates with Firebase Auth
 */
export async function loginAdminSession(
  adminId: string,
  adminPassword: string
): Promise<{ success: boolean; error?: string }> {
  if (!verifyAdminCredentials(adminId, adminPassword)) {
    return {
      success: false,
      error: 'Invalid Admin ID or Password',
    };
  }

  // Set local storage session
  try {
    localStorage.setItem(ADMIN_STORAGE_KEY, 'active_authenticated');
  } catch (err: any) {
    console.warn('Admin session storage warning:', err);
  }

  // Authenticate Firebase Auth to give Firestore full admin permissions under rules
  try {
    let cred;
    try {
      cred = await signInWithEmailAndPassword(auth, FIREBASE_ADMIN_EMAIL, FIXED_ADMIN_PASSWORD);
    } catch (authErr: any) {
      const code = authErr?.code || '';
      if (code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
        // Attempt creating the admin user in Firebase Auth if not already created
        try {
          cred = await createUserWithEmailAndPassword(auth, FIREBASE_ADMIN_EMAIL, FIXED_ADMIN_PASSWORD);
        } catch (createErr: any) {
          // If creation fails due to email-already-in-use, retry signIn
          cred = await signInWithEmailAndPassword(auth, FIREBASE_ADMIN_EMAIL, FIXED_ADMIN_PASSWORD);
        }
      } else {
        throw authErr;
      }
    }

    if (cred?.user) {
      await ensureAdminFirestoreDoc(cred.user.uid);
    }
  } catch (firebaseErr: any) {
    console.warn('Firebase admin auth session notice:', firebaseErr);
  }

  // Dispatch custom event so listeners in other components or windows sync instantly
  window.dispatchEvent(new Event('admin_auth_state_changed'));
  return { success: true };
}

/**
 * Logs out the admin session and clears storage & signs out of Firebase
 */
export function logoutAdminSession(): void {
  try {
    localStorage.removeItem(ADMIN_STORAGE_KEY);
    signOut(auth).catch(() => {});
    window.dispatchEvent(new Event('admin_auth_state_changed'));
  } catch (err) {
    console.warn('Admin logout storage notice:', err);
  }
}
