"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getBookletFileUrl, listBookletSections } from "@/lib/data";
import type { BookletSection } from "@/lib/types";

export default function BookletViewerPage() {
  const params = useParams<{ issueId: string }>();
  const issueId = params.issueId;
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [sections, setSections] = useState<BookletSection[] | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    listBookletSections(issueId, { isAdmin, uid: user?.uid ?? null })
      .then(async (list) => {
        setSections(list);
        // 非公開のセクションはそもそも閲覧ボタンを出さないため、URL取得も不要。
        const entries = await Promise.all(
          list
            .filter((section) => !section.locked)
            .map(async (section) => {
              const url = await getBookletFileUrl(section.pdfStoragePath);
              return [section.id, url] as const;
            }),
        );
        setUrls(Object.fromEntries(entries));
      })
      .catch(() => setError("冊子の内容を取得できませんでした。"));
  }, [issueId, authLoading, isAdmin, user?.uid]);

  return (
    <div>
      {error && <p style={{ color: "var(--danger)", fontSize: "0.9rem" }}>{error}</p>}

      {sections === null && !error && (
        <p className="muted" style={{ fontSize: "0.9rem" }}>読み込み中…</p>
      )}

      {sections !== null && sections.length === 0 && (
        <p className="muted" style={{ fontSize: "0.9rem" }}>
          まだ冊子セクションが追加されていません。
        </p>
      )}

      <ul style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {sections?.map((section, i) => (
          <li key={section.id} className="card">
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                gap: "0.75rem",
              }}
            >
              <span>
                <span className="muted" style={{ fontSize: "0.8rem", marginRight: "0.5rem" }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span style={{ fontFamily: "var(--font-serif)" }}>{section.title}</span>
                {section.locked && (
                  <span className="muted" style={{ fontSize: "0.78rem", marginLeft: "0.5rem" }}>
                    (非公開)
                  </span>
                )}
              </span>
              {urls[section.id] && (
                <a
                  href={urls[section.id]}
                  target="_blank"
                  rel="noreferrer"
                  className="button-outline"
                  style={{ flexShrink: 0 }}
                >
                  閲覧
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
