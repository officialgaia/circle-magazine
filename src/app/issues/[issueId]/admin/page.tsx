"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import { RequireAuth } from "@/components/RequireAuth";
import {
  addBookletSection,
  addRosterMember,
  deleteBookletSection,
  deleteRosterMember,
  downloadSubmissionFile,
  listBookletSections,
  listRoster,
  listSubmissions,
  markSubmissionDownloaded,
  updateBookletSectionOrder,
  updateRosterMemberByAdmin,
} from "@/lib/data";
import { GRADE_OPTIONS, type BookletSection, type Grade, type RosterEntry, type Submission } from "@/lib/types";

function SubmissionsPanel({ issueId }: { issueId: string }) {
  const [submissions, setSubmissions] = useState<Submission[] | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    listSubmissions(issueId)
      .then(setSubmissions)
      .catch(() => setError("投稿一覧を取得できませんでした。"));
  }
  useEffect(refresh, [issueId]);

  async function handleDownload(s: Submission) {
    setDownloading(s.id);
    setError(null);
    try {
      await downloadSubmissionFile(s.storagePath, s.fileName);
      if (!s.downloadedByAdmin) {
        await markSubmissionDownloaded(issueId, s.id);
        refresh();
      }
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      setError(`ダウンロードに失敗しました。(${detail})`);
    } finally {
      setDownloading(null);
    }
  }

  return (
    <section className="card" style={{ marginBottom: "1.5rem" }}>
      <h3 style={{ fontSize: "1rem", marginBottom: "0.75rem" }}>投稿された生ファイル</h3>
      <p className="muted" style={{ fontSize: "0.78rem", marginBottom: "0.75rem" }}>
        投稿は1人1件までです(再投稿すると前回分と置き換わります)。まだダウンロードしていないものは色を変えて示しています。
      </p>
      {error && <p style={{ color: "var(--danger)", fontSize: "0.85rem" }}>{error}</p>}
      {submissions === null && <p className="muted" style={{ fontSize: "0.85rem" }}>読み込み中…</p>}
      {submissions !== null && submissions.length === 0 && (
        <p className="muted" style={{ fontSize: "0.85rem" }}>まだ投稿はありません。</p>
      )}
      <ul style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {submissions?.map((s) => (
          <li
            key={s.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "0.9rem",
              padding: "0.5rem 0.7rem",
              borderRadius: "var(--radius-sm)",
              background: s.downloadedByAdmin ? "transparent" : "var(--status-editing-bg)",
            }}
          >
            <span>
              {s.submitterName} — {s.fileName}
              <span className="muted" style={{ marginLeft: "0.5rem", fontSize: "0.78rem" }}>
                {s.format.toUpperCase()}
                {s.locked ? " ・ 非公開" : ""}
                {!s.downloadedByAdmin && (
                  <span style={{ color: "var(--status-editing)", marginLeft: "0.5rem" }}>・ 未ダウンロード</span>
                )}
              </span>
            </span>
            <button
              type="button"
              className="button-outline"
              disabled={downloading === s.id}
              onClick={() => void handleDownload(s)}
            >
              {downloading === s.id ? "ダウンロード中…" : "ダウンロード"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function BookletPanel({ issueId }: { issueId: string }) {
  const [sections, setSections] = useState<BookletSection[] | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sourceSubmissionId, setSourceSubmissionId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    listBookletSections(issueId, { isAdmin: true, uid: null })
      .then(setSections)
      .catch(() => setError("セクション一覧を取得できませんでした。"));
    listSubmissions(issueId).then(setSubmissions).catch(() => {});
  }
  useEffect(refresh, [issueId]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!title || !file) return;
    setSubmitting(true);
    setError(null);
    try {
      const nextOrder = (sections?.reduce((max, s) => Math.max(max, s.order), 0) ?? 0) + 1;
      const sourceSubmission = submissions.find((s) => s.id === sourceSubmissionId) ?? null;
      await addBookletSection({ issueId, title, file, order: nextOrder, sourceSubmission });
      setTitle("");
      setFile(null);
      setSourceSubmissionId("");
      const input = document.getElementById("booklet-file") as HTMLInputElement | null;
      if (input) input.value = "";
      refresh();
    } catch {
      setError("セクションの追加に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  }

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

  async function handleDelete(section: BookletSection) {
    setError(null);
    try {
      await deleteBookletSection(issueId, section.id, section.pdfStoragePath);
      refresh();
    } catch {
      setError("削除に失敗しました。");
    }
  }

  return (
    <section className="card" style={{ marginBottom: "1.5rem" }}>
      <h3 style={{ fontSize: "1rem", marginBottom: "0.75rem" }}>冊子セクション</h3>
      {error && <p style={{ color: "var(--danger)", fontSize: "0.85rem" }}>{error}</p>}

      <ul style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.25rem" }}>
        {sections?.map((section, i) => (
          <li
            key={section.id}
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.9rem" }}
          >
            <span>
              <span className="muted" style={{ marginRight: "0.5rem" }}>{i + 1}.</span>
              {section.title}
              {section.locked && (
                <span className="muted" style={{ fontSize: "0.78rem", marginLeft: "0.5rem" }}>
                  (非公開 ・ {section.ownerName ?? "不明"})
                </span>
              )}
            </span>
            <span style={{ display: "flex", gap: "0.4rem" }}>
              <button type="button" className="button-outline" onClick={() => handleMove(section, -1)}>
                上へ
              </button>
              <button type="button" className="button-outline" onClick={() => handleMove(section, 1)}>
                下へ
              </button>
              <button type="button" className="button-outline" onClick={() => handleDelete(section)}>
                削除
              </button>
            </span>
          </li>
        ))}
      </ul>

      <form onSubmit={handleAdd} style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        <div>
          <label className="label" htmlFor="booklet-title">セクション名</label>
          <input
            id="booklet-title"
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ marginTop: "0.3rem" }}
          />
        </div>
        <div>
          <label className="label" htmlFor="booklet-file">PDFファイル</label>
          <input
            id="booklet-file"
            className="input"
            type="file"
            accept=".pdf,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            style={{ marginTop: "0.3rem" }}
          />
        </div>
        <div>
          <label className="label" htmlFor="booklet-source">
            元になった投稿(任意・非公開設定を引き継ぎます)
          </label>
          <select
            id="booklet-source"
            className="input"
            value={sourceSubmissionId}
            onChange={(e) => setSourceSubmissionId(e.target.value)}
            style={{ marginTop: "0.3rem" }}
          >
            <option value="">指定なし(全員に公開)</option>
            {submissions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.submitterName} — {s.fileName}
                {s.locked ? "(非公開)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <button type="submit" className="button" disabled={!title || !file || submitting}>
            {submitting ? "追加中…" : "セクションを追加"}
          </button>
        </div>
      </form>
    </section>
  );
}

function RosterPanel({ issueId }: { issueId: string }) {
  const [roster, setRoster] = useState<RosterEntry[] | null>(null);
  const [name, setName] = useState("");
  const [grade, setGrade] = useState<Grade | "">("");
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    listRoster(issueId).then(setRoster).catch(() => setError("名簿を取得できませんでした。"));
  }
  useEffect(refresh, [issueId]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!name) return;
    try {
      await addRosterMember(issueId, { name, grade });
      setName("");
      setGrade("");
      refresh();
    } catch {
      setError("メンバーの追加に失敗しました。");
    }
  }

  async function handleFieldChange(entry: RosterEntry, patch: Partial<RosterEntry>) {
    try {
      await updateRosterMemberByAdmin(issueId, entry.id, {
        name: patch.name ?? entry.name,
        grade: patch.grade ?? entry.grade,
        submitted: patch.submitted ?? entry.submitted,
      });
      refresh();
    } catch {
      setError("更新に失敗しました。");
    }
  }

  async function handleDelete(entry: RosterEntry) {
    try {
      await deleteRosterMember(issueId, entry.id);
      refresh();
    } catch {
      setError("削除に失敗しました。");
    }
  }

  return (
    <section className="card">
      <h3 style={{ fontSize: "1rem", marginBottom: "0.75rem" }}>名簿の管理</h3>
      {error &&<p style={{ color: "var(--danger)", fontSize: "0.85rem" }}>{error}</p>}

      <table className="table" style={{ marginBottom: "1.25rem" }}>
        <thead>
          <tr>
            <th>名前</th>
            <th>学年</th>
            <th>提出</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {roster?.map((entry) => (
            <tr key={entry.id}>
              <td>
                <input
                  className="input"
                  defaultValue={entry.name}
                  onBlur={(e) => handleFieldChange(entry, { name: e.target.value })}
                />
              </td>
              <td>
                <select
                  className="input"
                  value={entry.grade}
                  onChange={(e) => handleFieldChange(entry, { grade: e.target.value as Grade | "" })}
                >
                  <option value="">未設定</option>
                  {GRADE_OPTIONS.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </td>
              <td>{entry.submitted ? "提出済み" : "未提出"}</td>
              <td>
                <button type="button" className="button-outline" onClick={() => handleDelete(entry)}>
                  削除
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <form onSubmit={handleAdd} style={{ display: "flex", gap: "0.6rem", alignItems: "flex-end", flexWrap: "wrap" }}>
        <div>
          <label className="label" htmlFor="roster-name">名前</label>
          <input id="roster-name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="roster-grade">学年</label>
          <select
            id="roster-grade"
            className="input"
            value={grade}
            onChange={(e) => setGrade(e.target.value as Grade | "")}
          >
            <option value="">未設定</option>
            {GRADE_OPTIONS.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="button" disabled={!name}>
          追加
        </button>
      </form>
    </section>
  );
}

function IssueAdminInner({ issueId }: { issueId: string }) {
  return (
    <div>
      <h2 style={{ fontSize: "1.15rem", marginBottom: "1.25rem" }}>号の管理</h2>
      <SubmissionsPanel issueId={issueId} />
      <BookletPanel issueId={issueId} />
      <RosterPanel issueId={issueId} />
    </div>
  );
}

export default function IssueAdminPage() {
  const params = useParams<{ issueId: string }>();
  return (
    <RequireAuth>
      <IssueAdminInner issueId={params.issueId} />
    </RequireAuth>
  );
}
