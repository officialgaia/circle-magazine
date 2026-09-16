"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export function Header() {
  const { user, loading, isAdmin, authError, signOut } = useAuth();

  return (
    <header className="header">
      <div className="header-inner">
        <Link href="/" className="title">
          サークル機関誌
        </Link>
        {!loading && (
          <nav className="nav items-center">
            <Link href="/">年度一覧</Link>
            <Link href="/about">このサイトについて</Link>
            {isAdmin ? (
              <>
                <Link href="/admin">管理</Link>
                <span className="muted">{user?.displayName ?? user?.email}</span>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  style={{
                    color: "var(--muted)",
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    textDecoration: "underline",
                    textUnderlineOffset: "2px",
                  }}
                >
                  ログアウト
                </button>
              </>
            ) : (
              <Link href="/login">管理者ログイン</Link>
            )}
          </nav>
        )}
      </div>
      {authError && (
        <div
          style={{
            background: "var(--status-editing-bg)",
            color: "var(--status-editing)",
            fontSize: "0.82rem",
            padding: "0.5rem 1.5rem",
            textAlign: "center",
          }}
        >
          通信状況により接続できませんでした。お手数ですが、ページを再読み込みしてください。
        </div>
      )}
    </header>
  );
}
