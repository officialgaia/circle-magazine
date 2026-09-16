"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const { user, loading, signIn } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/");
    }
  }, [loading, user, router]);

  async function handleSignIn() {
    setError(null);
    setSubmitting(true);
    try {
      await signIn();
    } catch {
      setError("サインインに失敗しました。もう一度お試しください。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="py-16">
      <div className="card" style={{ maxWidth: "28rem", margin: "0 auto" }}>
        <h1 style={{ fontSize: "1.3rem", marginBottom: "0.5rem" }}>
          サークル機関誌
        </h1>
        <p className="muted" style={{ fontSize: "0.9rem", marginBottom: "1.5rem" }}>
          サークルメンバー用のGoogleアカウントでサインインしてください。
        </p>
        <button
          type="button"
          className="button"
          onClick={() => void handleSignIn()}
          disabled={submitting || loading}
        >
          {submitting ? "サインイン中…" : "Googleでサインイン"}
        </button>
        {error && (
          <p style={{ color: "var(--danger)", fontSize: "0.85rem", marginTop: "1rem" }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
