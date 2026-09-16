import { IssueProvider } from "@/lib/issue-context";
import { IssueNav } from "@/components/IssueNav";

// 冊子ビューア・投稿・名簿はログイン不要で公開する。
// 管理画面(/issues/[issueId]/admin)だけは、そのページ自身が
// RequireAuth で管理者ログインを要求する。
export default async function IssueLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ issueId: string }>;
}) {
  const { issueId } = await params;

  return (
    <IssueProvider issueId={issueId}>
      <IssueNav issueId={issueId} />
      {children}
    </IssueProvider>
  );
}
