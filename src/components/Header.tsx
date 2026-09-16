"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export function Header() {
  const { user, isAdmin, signOut } = useAuth();

  return (
    <header className="header">
      <div className="header-inner">
        <Link href="/" className="title">
          サークル機関誌
        </Link>
        {user && (
          <nav className="nav items-center">
            <Link href="/">年度一覧</Link>
            {isAdmin && <Link href="/admin">管理</Link>}
            <span className="muted">{user.displayName ?? user.email}</span>
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
          </nav>
        )}
      </div>
    </header>
  );
}
