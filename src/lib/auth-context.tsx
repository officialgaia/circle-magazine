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
  signInAnonymously,
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
  authError: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

async function checkIsAdmin(email: string | null): Promise<boolean> {
  if (!email) return false;
  try {
    const snap = await getDoc(doc(db, "config", "adminEmails"));
    if (!snap.exists()) return false;
    const list = snap.data().adminEmails as string[] | undefined;
    return Array.isArray(list) && list.includes(email);
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      // 一般メンバーにはログイン画面を見せない。未ログインなら
      // 裏側で自動的に匿名セッションを割り当て、本人識別だけは
      // 名簿の「自分の行」選択で行う(管理者はGoogleサインインのまま)。
      if (!nextUser) {
        try {
          await signInAnonymously(auth);
        } catch {
          // 通信状況などで匿名サインインに失敗した場合、読み込み中のまま
          // 固まってしまわないよう、エラー状態にしてUIに知らせる。
          if (!cancelled) {
            setLoading(false);
            setAuthError(true);
          }
        }
        return;
      }
      const admin = await checkIsAdmin(nextUser.email);
      if (cancelled) return;
      setUser(nextUser);
      setIsAdmin(admin);
      setAuthError(false);
      setLoading(false);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      loading,
      isAdmin,
      authError,
      signInWithGoogle: async () => {
        await signInWithPopup(auth, new GoogleAuthProvider());
      },
      signOut: async () => {
        await firebaseSignOut(auth);
      },
    }),
    [user, loading, isAdmin, authError],
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
