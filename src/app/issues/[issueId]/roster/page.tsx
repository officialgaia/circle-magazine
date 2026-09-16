"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { claimRosterEntry, listRoster } from "@/lib/data";
import type { RosterEntry } from "@/lib/types";

export default function RosterPage() {
  const params = useParams<{ issueId: string }>();
  const issueId = params.issueId;
  const { user, loading: authLoading } = useAuth();

  const [roster, setRoster] = useState<RosterEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState<string | null>(null);

  function refresh() {
    listRoster(issueId)
      .then(setRoster)
      .catch(() => setError("名簿を取得できませんでした。"));
  }

  useEffect(() => {
    if (authLoading) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issueId, authLoading]);

  const myEntry = roster?.find((r) => r.claimedByUid === user?.uid) ?? null;

  async function handleClaim(rosterId: string) {
    if (!user) return;
    setClaiming(rosterId);
    setError(null);
    try {
      await claimRosterEntry(issueId, rosterId, user.uid);
      refresh();
    } catch {
      setError("選択に失敗しました。すでに他の人が選んでいる可能性があります。");
    } finally {
      setClaiming(null);
    }
  }

  return (
    <div>
      <h2 style={{ fontSize: "1.15rem", marginBottom: "1rem" }}>名簿</h2>
      {error && <p style={{ color: "var(--danger)", fontSize: "0.9rem" }}>{error}</p>}
      {roster === null && !error && (
        <p className="muted" style={{ fontSize: "0.9rem" }}>読み込み中…</p>
      )}

      {roster !== null && !myEntry && (
        <p className="muted" style={{ fontSize: "0.85rem", marginBottom: "1rem" }}>
          自分の名前の行の「これは自分です」を押すと、以降このブラウザで自分の欄として提出状況の確認ができるようになります。
        </p>
      )}

      {roster !== null && (
        <table className="table">
          <thead>
            <tr>
              <th>名前</th>
              <th>学年</th>
              <th>提出</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {roster.map((entry) => {
              const isMine = entry.id === myEntry?.id;
              return (
                <tr key={entry.id}>
                  <td>{entry.name}</td>
                  <td>{entry.grade || "—"}</td>
                  <td>{entry.submitted ? "提出済み" : "未提出"}</td>
                  <td>
                    {isMine ? (
                      <span className="muted" style={{ fontSize: "0.8rem" }}>自分</span>
                    ) : !myEntry && !entry.claimedByUid ? (
                      <button
                        type="button"
                        className="button-outline"
                        disabled={claiming === entry.id}
                        onClick={() => handleClaim(entry.id)}
                      >
                        これは自分です
                      </button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
