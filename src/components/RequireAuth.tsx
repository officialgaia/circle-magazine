"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

// 管理者専用ページだけをガードする。一般メンバー向けページは
// ログイン画面を挟まない(裏側の匿名セッションだけで動く)ため、
// このコンポーネントで包む必要はない。
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!isAdmin) {
      router.replace("/login");
    }
  }, [loading, isAdmin, router]);

  if (loading || !user || !isAdmin) {
    return (
      <div className="container py-16">
        <p className="muted text-sm">読み込み中…</p>
      </div>
    );
  }

  return <>{children}</>;
}
