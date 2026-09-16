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
  submitterName: string;
  submitterEmail: string;
  submitterUid: string;
  format: SubmissionFormat;
  fileName: string;
  storagePath: string;
  submittedAt: number | null;
  locked: boolean;
}

export interface BookletSection {
  id: string;
  title: string;
  order: number;
  pdfStoragePath: string;
  fileName: string;
  sourceSubmissionId: string | null;
  locked: boolean;
  ownerEmail: string | null;
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
  email: string;
  grade: Grade | "";
  submitted: boolean;
  note: string;
}
