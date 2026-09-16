"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export function RequireAuth({
  children,
  requireAdmin = false,
}: {
  children: React.ReactNode;
  requireAdmin?: boolean;
}) {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (requireAdmin && !isAdmin) {
      router.replace("/");
    }
  }, [loading, user, isAdmin, requireAdmin, router]);

  if (loading || !user || (requireAdmin && !isAdmin)) {
    return (
      <div className="container py-16">
        <p className="muted text-sm">読み込み中…</p>
      </div>
    );
  }

  return <>{children}</>;
}
