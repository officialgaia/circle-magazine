"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

interface AuthValue {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

async function checkIsAdmin(email: string | null): Promise<boolean> {
  if (!email) return false;
  const snap = await getDoc(doc(db, "config", "adminEmails"));
  if (!snap.exists()) return false;
  const list = snap.data().adminEmails as string[] | undefined;
  return Array.isArray(list) && list.includes(email);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setIsAdmin(await checkIsAdmin(nextUser?.email ?? null));
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      loading,
      isAdmin,
      signIn: async () => {
        await signInWithPopup(auth, new GoogleAuthProvider());
      },
      signOut: async () => {
        await firebaseSignOut(auth);
      },
    }),
    [user, loading, isAdmin],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth は AuthProvider の内側でのみ使用できます");
  }
  return ctx;
}
