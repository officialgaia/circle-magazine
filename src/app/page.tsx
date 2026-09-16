"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { listIssues } from "@/lib/data";
import type { Issue } from "@/lib/types";

export default function HomePage() {
  const { loading: authLoading } = useAuth();
  const [issues, setIssues] = useState<Issue[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    listIssues()
      .then(setIssues)
      .catch(() => setError("号の一覧を取得できませんでした。"));
  }, [authLoading]);

  return (
    <div>
      <h1 style={{ fontSize: "1.4rem", marginBottom: "1.5rem" }}>年度一覧</h1>

      {error && <p style={{ color: "var(--danger)", fontSize: "0.9rem" }}>{error}</p>}

      {issues === null && !error && (
        <p className="muted" style={{ fontSize: "0.9rem" }}>読み込み中…</p>
      )}

      {issues !== null && issues.length === 0 && (
        <p className="muted" style={{ fontSize: "0.9rem" }}>
          まだ号が作成されていません。管理者に新年度号の作成を依頼してください。
        </p>
      )}

      <ul style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {issues?.map((issue) => (
          <li key={issue.id}>
            <Link
              href={`/issues/${issue.id}`}
              className="card"
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <span>
                <span style={{ fontFamily: "var(--font-serif)", fontSize: "1.05rem" }}>
                  {issue.year}年号
                </span>
                <span className="muted" style={{ marginLeft: "0.75rem", fontSize: "0.9rem" }}>
                  {issue.title}
                </span>
              </span>
              <span className="status" data-status={issue.status}>
                {issue.status}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
