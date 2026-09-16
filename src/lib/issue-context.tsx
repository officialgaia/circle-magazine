"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getIssue } from "@/lib/data";
import type { Issue } from "@/lib/types";

interface IssueContextValue {
  issue: Issue | null;
  loading: boolean;
  error: string | null;
}

const IssueContext = createContext<IssueContextValue | null>(null);

export function IssueProvider({
  issueId,
  children,
}: {
  issueId: string;
  children: ReactNode;
}) {
  const [issue, setIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getIssue(issueId)
      .then((result) => {
        if (cancelled) return;
        setIssue(result);
        setError(result ? null : "指定された号が見つかりません。");
      })
      .catch(() => {
        if (!cancelled) setError("号の情報を取得できませんでした。");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [issueId]);

  return (
    <IssueContext.Provider value={{ issue, loading, error }}>
      {children}
    </IssueContext.Provider>
  );
}

export function useIssue(): IssueContextValue {
  const ctx = useContext(IssueContext);
  if (!ctx) {
    throw new Error("useIssue は IssueProvider の内側でのみ使用できます");
  }
  return ctx;
}
