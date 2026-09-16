"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import {
  createSubmission,
  getMySubmission,
  getSubmissionDownloadUrl,
  listRoster,
} from "@/lib/data";
import type { RosterEntry, Submission } from "@/lib/types";

// 原因不明のモバイル不具合を切り分けるため、エラー内容を画面にそのまま表示する。
function errorDetail(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

export default function SubmitPage() {
  const params = useParams<{ issueId: string }>();
  const issueId = params.issueId;
  const { user, isAdmin, loading: authLoading } = useAuth();

  const [roster, setRoster] = useState<RosterEntry[] | null>(null);
  const [mySubmission, setMySubmission] = useState<Submission | null | undefined>(undefined);
  const [myUrl, setMyUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [locked, setLocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function refreshRoster() {
    listRoster(issueId)
      .then(setRoster)
      .catch((err) => setError(`名簿を取得できませんでした。(${errorDetail(err)})`));
  }

  function refreshSubmission() {
    if (!user) return;
    getMySubmission(issueId, user.uid)
      .then(async (submission) => {
        setMySubmission(submission);
        if (submission) {
          const url = await getSubmissionDownloadUrl(submission.storagePath);
          setMyUrl(url);
        } else {
          setMyUrl(null);
        }
      })
      .catch((err) => setError(`投稿状況を取得できませんでした。(${errorDetail(err)})`));
  }

  useEffect(() => {
    if (authLoading || isAdmin) return;
    refreshRoster();
    refreshSubmission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issueId, authLoading, isAdmin, user?.uid]);

  const myEntry = roster?.find((r) => r.claimedByUid === user?.uid) ?? null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file || !myEntry) return;
    if (!user) {
      setError("接続が完了していません。ページを再読み込みしてからお試しください。");
      return;
    }
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
      refreshSubmission();
      refreshRoster();
    } catch (err) {
      setError(`投稿に失敗しました。もう一度お試しください。(${errorDetail(err)})`);
    } finally {
      setSubmitting(false);
    }
  }

  if (isAdmin) {
    return (
      <div>
        <h2 style={{ fontSize: "1.15rem", marginBottom: "1rem" }}>原稿の投稿</h2>
        <p className="muted" style={{ fontSize: "0.9rem" }}>
          管理者アカウントでは投稿できません。投稿されたファイルの確認は管理画面から行ってください。
        </p>
      </div>
    );
  }

  if (roster !== null && !myEntry) {
    return (
      <div>
        <h2 style={{ fontSize: "1.15rem", marginBottom: "1rem" }}>原稿の投稿</h2>
        <p className="muted" style={{ fontSize: "0.9rem", marginBottom: "1rem" }}>
          投稿するには、先に名簿で自分の名前を選んでください。選ぶと、このブラウザではその名前で投稿できるようになります。
        </p>
        <Link href={`/issues/${issueId}/roster`} className="button">
          名簿で自分の名前を選ぶ
        </Link>
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
        {mySubmission && (
          <p className="muted" style={{ fontSize: "0.78rem" }}>
            投稿は1人1件までです。新しく投稿すると、下の投稿が置き換わります。
          </p>
        )}
        <div>
          <button type="submit" className="button" disabled={!file || submitting}>
            {submitting ? "投稿中…" : mySubmission ? "投稿し直す" : "投稿する"}
          </button>
        </div>
        {message && <p style={{ fontSize: "0.85rem" }}>{message}</p>}
        {error && <p style={{ color: "var(--danger)", fontSize: "0.85rem" }}>{error}</p>}
      </form>

      <h3 style={{ fontSize: "1rem", margin: "1.75rem 0 0.75rem" }}>自分の投稿</h3>
      <p className="muted" style={{ fontSize: "0.8rem", marginBottom: "0.75rem" }}>
        今投稿している原稿は、いつでもここから確認できます。他のメンバーからは見えません。
      </p>
      {mySubmission === undefined && <p className="muted" style={{ fontSize: "0.9rem" }}>読み込み中…</p>}
      {mySubmission === null && (
        <p className="muted" style={{ fontSize: "0.9rem" }}>まだ投稿がありません。</p>
      )}
      {mySubmission && (
        <div
          className="card"
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.9rem" }}
        >
          <span>
            {mySubmission.fileName}
            <span className="muted" style={{ marginLeft: "0.75rem", fontSize: "0.8rem" }}>
              {mySubmission.format.toUpperCase()}
              {mySubmission.locked ? " ・ 非公開" : ""}
              {mySubmission.submittedAt
                ? ` ・ ${new Date(mySubmission.submittedAt).toLocaleString("ja-JP")}`
                : ""}
            </span>
          </span>
          {myUrl ? (
            <a href={myUrl} target="_blank" rel="noreferrer" className="button-outline">
              閲覧
            </a>
          ) : (
            <span className="muted" style={{ fontSize: "0.8rem" }}>取得中…</span>
          )}
        </div>
      )}
    </div>
  );
}
