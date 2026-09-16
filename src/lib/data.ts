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
  where,
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
  Grade,
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

function toSubmission(id: string, data: Record<string, unknown>): Submission {
  const submittedAt = data.submittedAt as Timestamp | null;
  return {
    id,
    submitterName: data.submitterName as string,
    submitterEmail: data.submitterEmail as string,
    submitterUid: data.submitterUid as string,
    format: data.format as SubmissionFormat,
    fileName: data.fileName as string,
    storagePath: data.storagePath as string,
    submittedAt: submittedAt ? submittedAt.toMillis() : null,
    locked: Boolean(data.locked),
  };
}

export async function listSubmissions(issueId: string): Promise<Submission[]> {
  const snap = await getDocs(
    query(submissionsCol(issueId), orderBy("submittedAt", "desc")),
  );
  return snap.docs.map((d) => toSubmission(d.id, d.data()));
}

export async function getSubmission(
  issueId: string,
  submissionId: string,
): Promise<Submission | null> {
  const snap = await getDoc(doc(db, "issues", issueId, "submissions", submissionId));
  if (!snap.exists()) return null;
  return toSubmission(snap.id, snap.data());
}

export async function createSubmission(params: {
  issueId: string;
  uid: string;
  submitterName: string;
  submitterEmail: string;
  file: File;
  locked: boolean;
}): Promise<void> {
  const { issueId, uid, submitterName, submitterEmail, file, locked } = params;
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
    locked,
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

function toBookletSection(id: string, data: Record<string, unknown>): BookletSection {
  return {
    id,
    title: data.title as string,
    order: data.order as number,
    pdfStoragePath: data.pdfStoragePath as string,
    fileName: data.fileName as string,
    sourceSubmissionId: (data.sourceSubmissionId as string | null) ?? null,
    locked: Boolean(data.locked),
    ownerEmail: (data.ownerEmail as string | null) ?? null,
  };
}

// 非公開(locked)セクションは、投稿者本人と管理者にしか見えない。
// Firestoreのクエリは「ルール上返せることが保証できる範囲」しか実行できないため、
// 管理者は無条件の一覧取得、一般メンバーは
// 「公開セクション」「自分が投稿者のセクション」の2クエリに分けて取得し、マージする。
export async function listBookletSections(
  issueId: string,
  viewer: { isAdmin: boolean; email: string | null },
): Promise<BookletSection[]> {
  if (viewer.isAdmin) {
    const snap = await getDocs(query(bookletCol(issueId), orderBy("order", "asc")));
    return snap.docs.map((d) => toBookletSection(d.id, d.data()));
  }

  const publicSnap = await getDocs(
    query(bookletCol(issueId), where("locked", "==", false), orderBy("order", "asc")),
  );
  const byId = new Map<string, BookletSection>();
  publicSnap.docs.forEach((d) => byId.set(d.id, toBookletSection(d.id, d.data())));

  if (viewer.email) {
    const ownSnap = await getDocs(
      query(
        bookletCol(issueId),
        where("ownerEmail", "==", viewer.email),
        orderBy("order", "asc"),
      ),
    );
    ownSnap.docs.forEach((d) => byId.set(d.id, toBookletSection(d.id, d.data())));
  }

  return Array.from(byId.values()).sort((a, b) => a.order - b.order);
}

export async function addBookletSection(params: {
  issueId: string;
  title: string;
  file: File;
  order: number;
  sourceSubmission?: Submission | null;
}): Promise<void> {
  const { issueId, title, file, order, sourceSubmission } = params;

  // 先にドキュメントIDを採番し、Storageのパスにも使う
  // (施錠されたセクションのファイルをStorageルール側で判定できるようにするため)
  const sectionRef = doc(bookletCol(issueId));
  const pdfStoragePath = `issues/${issueId}/booklet/${sectionRef.id}/${file.name}`;

  await uploadBytes(ref(storage, pdfStoragePath), file, {
    contentType: "application/pdf",
  });

  await setDoc(sectionRef, {
    title,
    order,
    pdfStoragePath,
    fileName: file.name,
    sourceSubmissionId: sourceSubmission?.id ?? null,
    locked: sourceSubmission?.locked ?? false,
    ownerEmail: sourceSubmission?.submitterEmail ?? null,
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
  input: { name: string; email: string; grade: Grade | "" },
): Promise<void> {
  await addDoc(rosterCol(issueId), {
    name: input.name,
    email: input.email,
    grade: input.grade,
    submitted: false,
    note: "",
  });
}

export async function updateRosterMemberByAdmin(
  issueId: string,
  rosterId: string,
  input: {
    name: string;
    email: string;
    grade: Grade | "";
    submitted: boolean;
    note: string;
  },
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
