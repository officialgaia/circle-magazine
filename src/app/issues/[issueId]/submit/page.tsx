"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { createSubmission, listSubmissions } from "@/lib/data";
import type { Submission } from "@/lib/types";

export default function SubmitPage() {
  const params = useParams<{ issueId: string }>();
  const issueId = params.issueId;
  const { user } = useAuth();

  const [mySubmissions, setMySubmissions] = useState<Submission[] | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    if (!user?.email) return;
    listSubmissions(issueId)
      .then((all) => setMySubmissions(all.filter((s) => s.submitterEmail === user.email)))
      .catch(() => setError("投稿状況を取得できませんでした。"));
  }

  useEffect(refresh, [issueId, user?.email]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file || !user?.email) return;
    setError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      await createSubmission({
        issueId,
        uid: user.uid,
        submitterName: user.displayName ?? user.email,
        submitterEmail: user.email,
        file,
      });
      setMessage("投稿しました。");
      setFile(null);
      const input = document.getElementById("file-input") as HTMLInputElement | null;
      if (input) input.value = "";
      refresh();
    } catch {
      setError("投稿に失敗しました。もう一度お試しください。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h2 style={{ fontSize: "1.15rem", marginBottom: "1rem" }}>原稿の投稿</h2>

      <form onSubmit={handleSubmit} className="card" style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
        <div>
          <label className="label" htmlFor="file-input">
            PDF または Word ファイル
          </label>
          <input
            id="file-input"
            className="input"
            type="file"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            style={{ marginTop: "0.35rem" }}
          />
        </div>
        <div>
          <button type="submit" className="button" disabled={!file || submitting}>
            {submitting ? "投稿中…" : "投稿する"}
          </button>
        </div>
        {message && <p style={{ fontSize: "0.85rem" }}>{message}</p>}
        {error && <p style={{ color: "#8a3a2f", fontSize: "0.85rem" }}>{error}</p>}
      </form>

      <h3 style={{ fontSize: "1rem", margin: "1.75rem 0 0.75rem" }}>自分の投稿履歴</h3>
      {mySubmissions === null && <p className="muted" style={{ fontSize: "0.9rem" }}>読み込み中…</p>}
      {mySubmissions !== null && mySubmissions.length === 0 && (
        <p className="muted" style={{ fontSize: "0.9rem" }}>まだ投稿がありません。</p>
      )}
      <ul style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {mySubmissions?.map((s) => (
          <li key={s.id} className="card" style={{ fontSize: "0.9rem" }}>
            <span>{s.fileName}</span>
            <span className="muted" style={{ marginLeft: "0.75rem", fontSize: "0.8rem" }}>
              {s.format.toUpperCase()}
              {s.submittedAt ? ` ・ ${new Date(s.submittedAt).toLocaleString("ja-JP")}` : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
