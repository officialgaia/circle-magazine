import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import type {
  BookletSection,
  Issue,
  IssueStatus,
  RosterEntry,
  Submission,
  SubmissionFormat,
} from "@/lib/types";

function issuesCol() {
  return collection(db, "issues");
}

function submissionsCol(issueId: string) {
  return collection(db, "issues", issueId, "submissions");
}

function bookletCol(issueId: string) {
  return collection(db, "issues", issueId, "booklet");
}

function rosterCol(issueId: string) {
  return collection(db, "issues", issueId, "roster");
}

// ----- 号 -----

export async function listIssues(): Promise<Issue[]> {
  const snap = await getDocs(query(issuesCol(), orderBy("year", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Issue, "id">) }));
}

export async function getIssue(issueId: string): Promise<Issue | null> {
  const snap = await getDoc(doc(db, "issues", issueId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Issue, "id">) };
}

export async function createIssue(input: {
  year: number;
  title: string;
  status: IssueStatus;
}): Promise<string> {
  const created = await addDoc(issuesCol(), input);
  return created.id;
}

export async function updateIssueStatus(
  issueId: string,
  status: IssueStatus,
): Promise<void> {
  await updateDoc(doc(db, "issues", issueId), { status });
}

// ----- 投稿 -----

export async function listSubmissions(issueId: string): Promise<Submission[]> {
  const snap = await getDocs(
    query(submissionsCol(issueId), orderBy("submittedAt", "desc")),
  );
  return snap.docs.map((d) => {
    const data = d.data();
    const submittedAt = data.submittedAt as Timestamp | null;
    return {
      id: d.id,
      submitterName: data.submitterName,
      submitterEmail: data.submitterEmail,
      submitterUid: data.submitterUid,
      format: data.format as SubmissionFormat,
      fileName: data.fileName,
      storagePath: data.storagePath,
      submittedAt: submittedAt ? submittedAt.toMillis() : null,
    };
  });
}

export async function createSubmission(params: {
  issueId: string;
  uid: string;
  submitterName: string;
  submitterEmail: string;
  file: File;
}): Promise<void> {
  const { issueId, uid, submitterName, submitterEmail, file } = params;
  const format: SubmissionFormat = file.name.toLowerCase().endsWith(".pdf")
    ? "pdf"
    : "docx";
  const storagePath = `issues/${issueId}/submissions/${uid}/${Date.now()}_${file.name}`;

  await uploadBytes(ref(storage, storagePath), file, {
    contentType: file.type,
  });

  await addDoc(submissionsCol(issueId), {
    submitterName,
    submitterEmail,
    submitterUid: uid,
    format,
    fileName: file.name,
    storagePath,
    submittedAt: serverTimestamp(),
  });

  // 自分の名簿行があれば提出済みにする
  const rosterSnap = await getDocs(rosterCol(issueId));
  const own = rosterSnap.docs.find((d) => d.data().email === submitterEmail);
  if (own) {
    await updateDoc(doc(db, "issues", issueId, "roster", own.id), {
      submitted: true,
    });
  }
}

export async function getSubmissionDownloadUrl(
  storagePath: string,
): Promise<string> {
  return getDownloadURL(ref(storage, storagePath));
}

// ----- 冊子セクション -----

export async function listBookletSections(
  issueId: string,
): Promise<BookletSection[]> {
  const snap = await getDocs(query(bookletCol(issueId), orderBy("order", "asc")));
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<BookletSection, "id">),
  }));
}

export async function addBookletSection(params: {
  issueId: string;
  title: string;
  file: File;
  order: number;
  sourceSubmissionId?: string | null;
}): Promise<void> {
  const { issueId, title, file, order, sourceSubmissionId } = params;
  const pdfStoragePath = `issues/${issueId}/booklet/${Date.now()}_${file.name}`;

  await uploadBytes(ref(storage, pdfStoragePath), file, {
    contentType: "application/pdf",
  });

  await addDoc(bookletCol(issueId), {
    title,
    order,
    pdfStoragePath,
    fileName: file.name,
    sourceSubmissionId: sourceSubmissionId ?? null,
  });
}

export async function updateBookletSectionOrder(
  issueId: string,
  sectionId: string,
  order: number,
): Promise<void> {
  await updateDoc(doc(db, "issues", issueId, "booklet", sectionId), {
    order,
  });
}

export async function deleteBookletSection(
  issueId: string,
  sectionId: string,
  pdfStoragePath: string,
): Promise<void> {
  await deleteDoc(doc(db, "issues", issueId, "booklet", sectionId));
  await deleteObject(ref(storage, pdfStoragePath)).catch(() => {
    // ストレージ側に既に無ければ無視
  });
}

export async function getBookletFileUrl(pdfStoragePath: string): Promise<string> {
  return getDownloadURL(ref(storage, pdfStoragePath));
}

// ----- 名簿 -----

export async function listRoster(issueId: string): Promise<RosterEntry[]> {
  const snap = await getDocs(query(rosterCol(issueId), orderBy("name", "asc")));
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<RosterEntry, "id">),
  }));
}

export async function addRosterMember(
  issueId: string,
  input: { name: string; email: string },
): Promise<void> {
  await addDoc(rosterCol(issueId), {
    name: input.name,
    email: input.email,
    submitted: false,
    note: "",
  });
}

export async function updateRosterMemberByAdmin(
  issueId: string,
  rosterId: string,
  input: { name: string; email: string; submitted: boolean; note: string },
): Promise<void> {
  await setDoc(doc(db, "issues", issueId, "roster", rosterId), input);
}

export async function updateOwnRosterNote(
  issueId: string,
  rosterId: string,
  note: string,
): Promise<void> {
  await updateDoc(doc(db, "issues", issueId, "roster", rosterId), {
    note,
  });
}

export async function deleteRosterMember(
  issueId: string,
  rosterId: string,
): Promise<void> {
  await deleteDoc(doc(db, "issues", issueId, "roster", rosterId));
}
