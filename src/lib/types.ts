export type IssueStatus = "受付中" | "編集中" | "公開";

export interface Issue {
  id: string;
  year: number;
  title: string;
  status: IssueStatus;
}

export type SubmissionFormat = "pdf" | "docx";

export interface Submission {
  id: string;
  // 投稿は名簿の行(人)ごとに1件。ドキュメントIDも rosterId に固定する。
  rosterId: string;
  submitterName: string;
  submitterUid: string;
  format: SubmissionFormat;
  fileName: string;
  storagePath: string;
  submittedAt: number | null;
  locked: boolean;
  downloadedByAdmin: boolean;
}

export interface BookletSection {
  id: string;
  title: string;
  order: number;
  pdfStoragePath: string;
  fileName: string;
  sourceSubmissionId: string | null;
  locked: boolean;
  // 非公開セクションを見られる本人を、名簿の行で指定する。
  ownerRosterId: string | null;
  ownerName: string | null;
}

export const GRADE_OPTIONS = [
  "1年",
  "2年",
  "3年",
  "4年",
  "院生",
  "OB・OG",
] as const;

export type Grade = (typeof GRADE_OPTIONS)[number];

export interface RosterEntry {
  id: string;
  name: string;
  grade: Grade | "";
  submitted: boolean;
  // この行を「自分」として選んでいるブラウザ(匿名認証のuid)。
  // ブラウザを変えたり、保存が消えたりしても、同じ名前を選び直せば
  // 新しいuidに引き継がれ、投稿もそのまま見られる。
  claimedByUid: string | null;
}
