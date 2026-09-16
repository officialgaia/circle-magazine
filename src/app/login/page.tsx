"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

// 管理者として登録されていないアカウントでログインしようとした人に見せる文言。
// 本気で怒っているのではなく、軽くからかう程度のトーンにしている。
const REJECTION_LINES = [
  {
    title: "どちら様でしょうか。",
    body: "管理者の名簿を三度見返しましたが、その名前は影も形もありません。管理画面のボタンを押してみたくなる気持ちは分かりますが、それは編集長の仕事です。あなたの仕事は、締切までに原稿を出すことです。まだ出していないなら、なおさらです。",
  },
  {
    title: "そのドアは開きません。",
    body: "ノックの音は聞こえましたし、Googleアカウントも本物のようです。ただ、鍵が合いません。合鍵を作ろうとしても無駄です。管理画面の向こうには締切に追われる地味な作業しかないので、引き返すのが得策です。",
  },
  {
    title: "惜しくもなんともありません。",
    body: "ログインの手順は完璧でした。管理者ではないという致命的な一点を除けば、何も間違っていません。権限が欲しければ、まず一本、読むに値する原稿を書くことです。話はそれからです。",
  },
  {
    title: "管理者気取りは、ここまでです。",
    body: "ここから先に進めるのは、名簿に名前のある人だけです。あなたの名前は、少なくともその名簿にはありませんでした。悔しければ来年の編集を引き受けてください。喜んで名簿に加えます。",
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
