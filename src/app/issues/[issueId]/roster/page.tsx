"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { listRoster, updateOwnRosterNote } from "@/lib/data";
import type { RosterEntry } from "@/lib/types";

export default function RosterPage() {
  const params = useParams<{ issueId: string }>();
  const issueId = params.issueId;
  const { user } = useAuth();

  const [roster, setRoster] = useState<RosterEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<string>("");
  const [savingId, setSavingId] = useState<string | null>(null);

  function refresh() {
    listRoster(issueId)
      .then(setRoster)
      .catch(() => setError("名簿を取得できませんでした。"));
  }

  useEffect(refresh, [issueId]);

  const myEntry = roster?.find((r) => r.email === user?.email) ?? null;

  async function handleSaveNote(rosterId: string) {
    setSavingId(rosterId);
    try {
      await updateOwnRosterNote(issueId, rosterId, editingNote);
      refresh();
    } catch {
      setError("記入欄の更新に失敗しました。");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div>
      <h2 style={{ fontSize: "1.15rem", marginBottom: "1rem" }}>名簿</h2>
      {error && <p style={{ color: "#8a3a2f", fontSize: "0.9rem" }}>{error}</p>}
      {roster === null && !error && (
        <p className="muted" style={{ fontSize: "0.9rem" }}>読み込み中…</p>
      )}

      {roster !== null && (
        <table className="table">
          <thead>
            <tr>
              <th>名前</th>
              <th>提出</th>
              <th>記入欄</th>
            </tr>
          </thead>
          <tbody>
            {roster.map((entry) => {
              const isMine = entry.email === user?.email;
              return (
                <tr key={entry.id}>
                  <td>{entry.name}</td>
                  <td>{entry.submitted ? "提出済み" : "未提出"}</td>
                  <td>
                    {isMine ? (
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                        <input
                          className="input"
                          defaultValue={entry.note}
                          onChange={(e) => setEditingNote(e.target.value)}
                          onFocus={(e) => setEditingNote(e.target.value)}
                        />
                        <button
                          type="button"
                          className="button-outline"
                          disabled={savingId === entry.id}
                          onClick={() => handleSaveNote(entry.id)}
                        >
                          保存
                        </button>
                      </div>
                    ) : (
                      <span className="muted">{entry.note}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {roster !== null && !myEntry && (
        <p className="muted" style={{ fontSize: "0.85rem", marginTop: "1rem" }}>
          あなたのアカウントは名簿に登録されていません。管理者に登録を依頼してください。
        </p>
      )}
    </div>
  );
}
