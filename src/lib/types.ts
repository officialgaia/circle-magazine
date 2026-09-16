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
}

export interface BookletSection {
  id: string;
  title: string;
  order: number;
  pdfStoragePath: string;
  fileName: string;
  sourceSubmissionId: string | null;
}

export interface RosterEntry {
  id: string;
  name: string;
  email: string;
  submitted: boolean;
  note: string;
}
