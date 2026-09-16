"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

// 管理者として登録されていないアカウントでログインしようとした人に見せる文言。
// 本気で怒っているのではなく、軽くからかう程度のトーンにしている。
const REJECTION_LINES = [
  {
    title: "おや、見慣れない顔ですね。",
    body: "管理者の名簿を隅から隅まで探しましたが、その名前はどこにもありませんでした。編集長の座を狙うのは自由ですが、まずは原稿を一本書いてからにしましょう。",
  },
  {
    title: "そのドアは関係者専用です。",
    body: "ノックの音は聞こえましたが、あいにく合言葉が違います。管理画面の向こう側には、締切に追われる編集作業しか待っていませんので、今のうちに引き返すのが賢明です。",
  },
  {
    title: "惜しい。実に惜しい。",
    body: "Googleアカウントでのログイン自体は完璧でした。ただひとつ、あなたが管理者ではないという点を除いて。原稿の投稿ならログインなしでできますから、そちらで才能を発揮してください。",
  },
];

export default function LoginPage() {
  const { isAdmin, loading, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [rejected, setRejected] = useState<{ email: string | null; line: number } | null>(null);

  useEffect(() => {
    if (!loading && isAdmin) {
      router.replace("/admin");
    }
  }, [loading, isAdmin, router]);

  async function handleSignIn() {
    setError(null);
    setRejected(null);
    setSubmitting(true);
    try {
      const result = await signInWithGoogle();
      if (!result.admin) {
        setRejected({
          email: result.email,
          line: Math.floor(Math.random() * REJECTION_LINES.length),
        });
      }
    } catch {
      setError("サインインに失敗しました。もう一度お試しください。");
    } finally {
      setSubmitting(false);
    }
  }

  if (rejected) {
    const line = REJECTION_LINES[rejected.line];
    return (
      <div className="py-16">
        <div className="card" style={{ maxWidth: "28rem", margin: "0 auto" }}>
          <h1 style={{ fontSize: "1.3rem", marginBottom: "0.75rem" }}>{line.title}</h1>
          {rejected.email && (
            <p className="muted" style={{ fontSize: "0.82rem", marginBottom: "0.75rem" }}>
              {rejected.email} でお越しの方へ
            </p>
          )}
          <p style={{ fontSize: "0.92rem", lineHeight: 1.8, marginBottom: "1.5rem" }}>{line.body}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem" }}>
            <Link href="/" className="button">
              おとなしく年度一覧に戻る
            </Link>
            <button
              type="button"
              className="button-outline"
              onClick={() => void handleSignIn()}
              disabled={submitting}
            >
              別のアカウントで出直す
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-16">
      <div className="card" style={{ maxWidth: "28rem", margin: "0 auto" }}>
        <h1 style={{ fontSize: "1.3rem", marginBottom: "0.5rem" }}>
          管理者ログイン
        </h1>
        <p className="muted" style={{ fontSize: "0.9rem", marginBottom: "1.5rem" }}>
          一般メンバーはログイン不要です。冊子の閲覧・投稿・名簿は
          <Link href="/" style={{ textDecoration: "underline" }}>年度一覧</Link>
          からそのまま利用できます。このページは管理者用です。
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
