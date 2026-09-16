"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  claimRosterEntry,
  createSubmission,
  getSubmissionDownloadUrl,
  listMySubmissions,
  listRoster,
} from "@/lib/data";
import type { RosterEntry, Submission } from "@/lib/types";

export default function SubmitPage() {
  const params = useParams<{ issueId: string }>();
  const issueId = params.issueId;
  const { user, loading: authLoading } = useAuth();

  const [roster, setRoster] = useState<RosterEntry[] | null>(null);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [mySubmissions, setMySubmissions] = useState<Submission[] | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [locked, setLocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

  function refreshRoster() {
    listRoster(issueId).then(setRoster).catch(() => setError("名簿を取得できませんでした。"));
  }

  function refreshSubmissions() {
    if (!user) return;
    listMySubmissions(issueId, user.uid)
      .then(setMySubmissions)
      .catch(() => setError("投稿状況を取得できませんでした。"));
  }

  useEffect(() => {
    if (authLoading) return;
    refreshRoster();
    refreshSubmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issueId, authLoading, user?.uid]);

  const myEntry = roster?.find((r) => r.claimedByUid === user?.uid) ?? null;

  async function handleClaim(rosterId: string) {
    if (!user) return;
    setClaiming(rosterId);
    setError(null);
    try {
      await claimRosterEntry(issueId, rosterId, user.uid);
      refreshRoster();
    } catch {
      setError("選択に失敗しました。すでに他の人が選んでいる可能性があります。");
    } finally {
      setClaiming(null);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file || !user || !myEntry) return;
    setError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      await createSubmission({
        issueId,
        uid: user.uid,
        rosterId: myEntry.id,
        submitterName: myEntry.name,
        file,
        locked,
      });
      setMessage("投稿しました。");
      setFile(null);
      setLocked(false);
      const input = document.getElementById("file-input") as HTMLInputElement | null;
      if (input) input.value = "";
      refreshSubmissions();
      refreshRoster();
    } catch {
      setError("投稿に失敗しました。もう一度お試しください。");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleOpen(submission: Submission) {
    setOpeningId(submission.id);
    setError(null);
    // Safariは「クリックの後にawaitを挟んでからwindow.open」だとポップアップとして
    // ブロックしてしまうため、まず空のタブを同期的に開いてからURLを差し込む。
    const win = window.open("", "_blank");
    try {
      const url = await getSubmissionDownloadUrl(submission.storagePath);
      if (win) win.location.href = url;
    } catch {
      win?.close();
      setError("ファイルを開けませんでした。");
    } finally {
      setOpeningId(null);
    }
  }

  if (roster !== null && !myEntry) {
    return (
      <div>
        <h2 style={{ fontSize: "1.15rem", marginBottom: "1rem" }}>原稿の投稿</h2>
        <p className="muted" style={{ fontSize: "0.9rem", marginBottom: "1rem" }}>
          投稿する前に、名簿から自分の名前を選んでください。
        </p>
        <ul style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {roster.map((entry) => (
            <li
              key={entry.id}
              className="card"
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
            >
              <span>
                {entry.name}
                {entry.grade && <span className="muted" style={{ marginLeft: "0.5rem", fontSize: "0.85rem" }}>{entry.grade}</span>}
              </span>
              <button
                type="button"
                className="button-outline"
                disabled={!!entry.claimedByUid || claiming === entry.id}
                onClick={() => handleClaim(entry.id)}
              >
                {entry.claimedByUid ? "選択済み" : "これは自分です"}
              </button>
            </li>
          ))}
        </ul>
        {error && <p style={{ color: "var(--danger)", fontSize: "0.85rem", marginTop: "1rem" }}>{error}</p>}
      </div>
    );
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
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.88rem" }}>
          <input
            type="checkbox"
            checked={locked}
            onChange={(e) => setLocked(e.target.checked)}
          />
          この投稿を非公開にする
        </label>
        <p className="muted" style={{ fontSize: "0.78rem", marginTop: "-0.5rem" }}>
          非公開にすると、これを元に冊子セクションが作られた場合も、自分と管理者以外には冊子ビューアに表示されません。
        </p>
        <div>
          <button type="submit" className="button" disabled={!file || submitting}>
            {submitting ? "投稿中…" : "投稿する"}
          </button>
        </div>
        {message && <p style={{ fontSize: "0.85rem" }}>{message}</p>}
        {error && <p style={{ color: "var(--danger)", fontSize: "0.85rem" }}>{error}</p>}
      </form>

      <h3 style={{ fontSize: "1rem", margin: "1.75rem 0 0.75rem" }}>自分の投稿履歴</h3>
      <p className="muted" style={{ fontSize: "0.8rem", marginBottom: "0.75rem" }}>
        自分が投稿したファイルは、いつでもここから開いて確認できます。他のメンバーからは見えません。
      </p>
      {mySubmissions === null && <p className="muted" style={{ fontSize: "0.9rem" }}>読み込み中…</p>}
      {mySubmissions !== null && mySubmissions.length === 0 && (
        <p className="muted" style={{ fontSize: "0.9rem" }}>まだ投稿がありません。</p>
      )}
      <ul style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {mySubmissions?.map((s) => (
          <li
            key={s.id}
            className="card"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "0.9rem",
              cursor: "pointer",
            }}
            onClick={() => handleOpen(s)}
          >
            <span>
              {s.fileName}
              <span className="muted" style={{ marginLeft: "0.75rem", fontSize: "0.8rem" }}>
                {s.format.toUpperCase()}
                {s.locked ? " ・ 非公開" : ""}
                {s.submittedAt ? ` ・ ${new Date(s.submittedAt).toLocaleString("ja-JP")}` : ""}
              </span>
            </span>
            <span className="button-outline" style={{ pointerEvents: "none" }}>
              {openingId === s.id ? "開いています…" : "開く"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
