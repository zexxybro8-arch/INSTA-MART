import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile, UserRole, CurrencyCode } from '../types';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  profile: UserProfile | null;
  role: UserRole;
  isAdmin: boolean;
  isLoading: boolean;
  isBlocked: boolean;
  login: (identifier: string, pass: string) => Promise<UserRole>;
  loginWithGoogle: () => Promise<UserRole>;
  signup: (params: {
    email: string;
    username: string;
    password: string;
    name: string;
    mobile: string;
  }) => Promise<UserRole>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserCurrency: (newCurrency: CurrencyCode) => Promise<void>;
  updateProfileDetails: (data: Partial<Pick<UserProfile, 'name' | 'mobile'>>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_EMAIL = 'panelaccess379@gmail.com';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        const userRef = doc(db, 'users', user.uid);
        
        // Listen to live updates of the user profile document (e.g. balance, role, blocked state)
        unsubscribeProfile = onSnapshot(userRef, async (snap) => {
          try {
            if (snap.exists()) {
              const data = snap.data() as UserProfile;
              // Ensure admin email is always recognized as admin role
              if (user.email === ADMIN_EMAIL && data.role !== 'admin') {
                await updateDoc(userRef, { role: 'admin', updatedAt: Date.now() });
                data.role = 'admin';
              }
              // Sync username registry index if missing
              if (data.username) {
                try {
                  const unameRef = doc(db, 'usernames', data.username.toLowerCase());
                  const unameSnap = await getDoc(unameRef);
                  if (!unameSnap.exists()) {
                    await setDoc(unameRef, {
                      uid: user.uid,
                      email: data.email || user.email || '',
                      createdAt: Date.now(),
                    });
                  }
                } catch {
                  // Non-fatal index sync
                }
              }
              setProfile(data);
            } else {
              // Document does not exist yet (e.g., initial user created via auth)
              const initialRole: UserRole = user.email === ADMIN_EMAIL ? 'admin' : 'user';
              const cleanUsername = (user.email || '').split('@')[0].toLowerCase();
              const newProfile: UserProfile = {
                id: user.uid,
                uid: user.uid,
                email: user.email || '',
                username: cleanUsername,
                name: user.displayName || (user.email || '').split('@')[0],
                mobile: '',
                role: initialRole,
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
              await setDoc(userRef, newProfile);
              try {
                await setDoc(doc(db, 'usernames', cleanUsername), {
                  uid: user.uid,
                  email: user.email || '',
                  createdAt: Date.now(),
                });
              } catch {
                // Non-fatal
              }
              setProfile(newProfile);
            }
          } catch (profileErr) {
            console.warn('Profile sync notice:', profileErr);
          } finally {
            setIsLoading(false);
          }
        }, (error) => {
          console.warn('User profile subscription notice:', error);
          setIsLoading(false);
        });
      } else {
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }
        setProfile(null);
        setIsLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const login = async (identifier: string, pass: string): Promise<UserRole> => {
    const trimmed = identifier.trim();
    let emailToUse = trimmed;

    // If identifier is not an email, find user email by registered username
    if (!trimmed.includes('@')) {
      const uname = trimmed.toLowerCase();
      if (uname === ADMIN_EMAIL.split('@')[0]) {
        emailToUse = ADMIN_EMAIL;
      } else {
        const unameSnap = await getDoc(doc(db, 'usernames', uname));
        if (unameSnap.exists()) {
          emailToUse = unameSnap.data().email;
        } else {
          throw new Error('No account found with this username. Please check your username or use your email.');
        }
      }
    }

    let cred;
    try {
      cred = await signInWithEmailAndPassword(auth, emailToUse, pass);
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/operation-not-allowed' || err?.message?.includes('operation-not-allowed')) {
        throw new Error('Email/Password sign-in is disabled in Firebase Authentication. Please use "Continue with Google" or enable Email/Password provider in Firebase Console.');
      }
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        throw new Error('Invalid email/username or password. Please try again.');
      }
      if (code === 'auth/invalid-email') {
        throw new Error('Please enter a valid email address.');
      }
      if (code === 'auth/too-many-requests') {
        throw new Error('Too many failed attempts. Please try again in a few minutes or reset your password.');
      }
      if (code === 'auth/user-disabled') {
        throw new Error('This account has been disabled. Please contact support.');
      }
      throw err;
    }
    let resolvedRole: UserRole = cred.user.email === ADMIN_EMAIL ? 'admin' : 'user';

    // Update last login and retrieve role
    if (cred.user) {
      try {
        const userDoc = await getDoc(doc(db, 'users', cred.user.uid));
        if (userDoc.exists()) {
          const udata = userDoc.data() as UserProfile;
          if (cred.user.email === ADMIN_EMAIL || udata.role === 'admin') {
            resolvedRole = 'admin';
          } else {
            resolvedRole = 'user';
          }
        }
        await updateDoc(doc(db, 'users', cred.user.uid), {
          lastLoginAt: Date.now(),
          updatedAt: Date.now(),
        });
      } catch (err) {
        console.warn('Update lastLogin error:', err);
      }
    }
    return resolvedRole;
  };

  const loginWithGoogle = async (): Promise<UserRole> => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const cred = await signInWithPopup(auth, provider);
    const user = cred.user;

    const userEmail = (user.email || '').trim().toLowerCase();
    const isAdminUser = userEmail === ADMIN_EMAIL.toLowerCase();
    const defaultRole: UserRole = isAdminUser ? 'admin' : 'user';

    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      const data = snap.data() as UserProfile;
      let finalRole = data.role;
      if (isAdminUser && finalRole !== 'admin') {
        await updateDoc(userRef, { role: 'admin', updatedAt: Date.now() });
        finalRole = 'admin';
        data.role = 'admin';
      }
      await updateDoc(userRef, { lastLoginAt: Date.now() });
      setProfile(data);
      return finalRole;
    } else {
      let baseUsername = userEmail
        ? userEmail.split('@')[0].replace(/[^a-z0-9_]/g, '')
        : `user_${user.uid.slice(0, 6)}`;
      if (!baseUsername) baseUsername = `user_${user.uid.slice(0, 6)}`;
      let uniqueUsername = baseUsername;
      try {
        const uDoc = await getDoc(doc(db, 'usernames', uniqueUsername));
        if (uDoc.exists()) {
          uniqueUsername = `${baseUsername}_${Math.floor(1000 + Math.random() * 9000)}`;
        }
      } catch {
        // Non-fatal
      }

      const newProfile: UserProfile = {
        id: user.uid,
        uid: user.uid,
        email: userEmail,
        username: uniqueUsername,
        name: user.displayName || uniqueUsername,
        mobile: user.phoneNumber || '',
        role: defaultRole,
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

      await setDoc(userRef, newProfile);
      try {
        await setDoc(doc(db, 'usernames', uniqueUsername), {
          uid: user.uid,
          email: userEmail,
          createdAt: Date.now(),
        });
      } catch (err) {
        console.warn('Username index error:', err);
      }
      setProfile(newProfile);
      return defaultRole;
    }
  };

  const signup = async ({
    email,
    username,
    password,
    name,
    mobile,
  }: {
    email: string;
    username: string;
    password: string;
    name: string;
    mobile: string;
  }): Promise<UserRole> => {
    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    // 1. Check unique username using public usernames index (avoids permissions errors on protected users collection)
    const unameDoc = await getDoc(doc(db, 'usernames', cleanUsername));
    if (unameDoc.exists()) {
      throw new Error('This username is already taken. Please pick another.');
    }

    // 2. Create Auth user
    let cred;
    try {
      cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/operation-not-allowed' || err?.message?.includes('operation-not-allowed')) {
        throw new Error('Email/Password sign-up is disabled in Firebase Authentication. Please use "Continue with Google" or enable Email/Password provider in Firebase Console.');
      }
      if (code === 'auth/email-already-in-use' || err?.message?.includes('email-already-in-use')) {
        throw new Error('This email address is already registered. Please sign in or use a different email.');
      }
      if (code === 'auth/invalid-email') {
        throw new Error('Please enter a valid email address.');
      }
      if (code === 'auth/weak-password') {
        throw new Error('Password must be at least 6 characters.');
      }
      throw err;
    }

    // 3. User role: public registration creates USER accounts only (unless matching pre-authorized admin email)
    const role: UserRole = cleanEmail === ADMIN_EMAIL ? 'admin' : 'user';

    const newProfile: UserProfile = {
      id: cred.user.uid,
      uid: cred.user.uid,
      email: cleanEmail,
      username: cleanUsername,
      name: name.trim(),
      mobile: mobile.trim(),
      role: role,
      currency: 'INR', // Default for every newly registered user
      balance: 0,
      isBlocked: false,
      totalOrders: 0,
      totalSpent: 0,
      totalDeposits: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastLoginAt: Date.now(),
    };

    // 4. Save user profile document and create username index document
    await setDoc(doc(db, 'users', cred.user.uid), newProfile);
    try {
      await setDoc(doc(db, 'usernames', cleanUsername), {
        uid: cred.user.uid,
        email: cleanEmail,
        createdAt: Date.now(),
      });
    } catch (unameErr) {
      console.warn('Failed to write username index:', unameErr);
    }

    setProfile(newProfile);
    return role;
  };

  const logout = async () => {
    await signOut(auth);
    setProfile(null);
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/user-not-found') {
        throw new Error('No registered account found with this email address.');
      }
      if (code === 'auth/invalid-email') {
        throw new Error('Please enter a valid email address.');
      }
      if (code === 'auth/operation-not-allowed') {
        throw new Error('Password reset is not enabled for this project.');
      }
      throw err;
    }
  };

  const updateUserCurrency = async (newCurrency: CurrencyCode) => {
    if (!profile) return;
    const ref = doc(db, 'users', profile.id);
    await updateDoc(ref, {
      currency: newCurrency,
      updatedAt: Date.now(),
    });
    setProfile((prev) => (prev ? { ...prev, currency: newCurrency } : null));
  };

  const updateProfileDetails = async (data: Partial<Pick<UserProfile, 'name' | 'mobile'>>) => {
    if (!profile) return;
    const ref = doc(db, 'users', profile.id);
    await updateDoc(ref, {
      ...data,
      updatedAt: Date.now(),
    });
    setProfile((prev) => (prev ? { ...prev, ...data } : null));
  };

  const role: UserRole = profile?.role || 'user';
  const isAdmin = role === 'admin';
  const isBlocked = !!profile?.isBlocked;

  const value = useMemo(
    () => ({
      currentUser,
      profile,
      role,
      isAdmin,
      isLoading,
      isBlocked,
      login,
      loginWithGoogle,
      signup,
      logout,
      resetPassword,
      updateUserCurrency,
      updateProfileDetails,
    }),
    [currentUser, profile, role, isAdmin, isLoading, isBlocked]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
