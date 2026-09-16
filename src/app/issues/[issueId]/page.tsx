"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  getBookletFileUrl,
  listBookletSections,
  updateBookletSectionOrder,
} from "@/lib/data";
import type { BookletSection } from "@/lib/types";

export default function BookletViewerPage() {
  const params = useParams<{ issueId: string }>();
  const issueId = params.issueId;
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [sections, setSections] = useState<BookletSection[] | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    listBookletSections(issueId, { isAdmin, uid: user?.uid ?? null })
      .then(async (list) => {
        setSections(list);
        const entries = await Promise.all(
          list.map(async (section) => {
            const url = await getBookletFileUrl(section.pdfStoragePath);
            return [section.id, url] as const;
          }),
        );
        setUrls(Object.fromEntries(entries));
      })
      .catch(() => setError("冊子の内容を取得できませんでした。"));
  }

  useEffect(() => {
    if (authLoading) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issueId, authLoading, isAdmin, user?.uid]);

  async function handleMove(section: BookletSection, direction: -1 | 1) {
    if (!sections) return;
    const sorted = [...sections].sort((a, b) => a.order - b.order);
    const index = sorted.findIndex((s) => s.id === section.id);
    const swapWith = sorted[index + direction];
    if (!swapWith) return;
    setError(null);
    try {
      await Promise.all([
        updateBookletSectionOrder(issueId, section.id, swapWith.order),
        updateBookletSectionOrder(issueId, swapWith.id, section.order),
      ]);
      refresh();
    } catch {
      setError("並び替えに失敗しました。");
    }
  }

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
              <span style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
                {isAdmin && (
                  <>
                    <button type="button" className="button-outline" onClick={() => handleMove(section, -1)}>
                      上へ
                    </button>
                    <button type="button" className="button-outline" onClick={() => handleMove(section, 1)}>
                      下へ
                    </button>
                  </>
                )}
                {urls[section.id] && (
                  <a
                    href={urls[section.id]}
                    target="_blank"
                    rel="noreferrer"
                    className="button-outline"
                  >
                    開く
                  </a>
                )}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
