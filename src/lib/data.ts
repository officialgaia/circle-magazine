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
    submitterUid: data.submitterUid as string,
    format: data.format as SubmissionFormat,
    fileName: data.fileName as string,
    storagePath: data.storagePath as string,
    submittedAt: submittedAt ? submittedAt.toMillis() : null,
    locked: Boolean(data.locked),
  };
}

// 管理者専用。号内の全投稿を一覧する。
export async function listSubmissions(issueId: string): Promise<Submission[]> {
  const snap = await getDocs(
    query(submissionsCol(issueId), orderBy("submittedAt", "desc")),
  );
  return snap.docs.map((d) => toSubmission(d.id, d.data()));
}

// 自分(このブラウザ)が投稿したものだけを取得する。
export async function listMySubmissions(
  issueId: string,
  uid: string,
): Promise<Submission[]> {
  const snap = await getDocs(
    query(submissionsCol(issueId), where("submitterUid", "==", uid)),
  );
  return snap.docs
    .map((d) => toSubmission(d.id, d.data()))
    .sort((a, b) => (b.submittedAt ?? 0) - (a.submittedAt ?? 0));
}

export async function createSubmission(params: {
  issueId: string;
  uid: string;
  rosterId: string;
  submitterName: string;
  file: File;
  locked: boolean;
}): Promise<void> {
  const { issueId, uid, rosterId, submitterName, file, locked } = params;
  const format: SubmissionFormat = file.name.toLowerCase().endsWith(".pdf")
    ? "pdf"
    : "docx";
  const storagePath = `issues/${issueId}/submissions/${uid}/${Date.now()}_${file.name}`;

  await uploadBytes(ref(storage, storagePath), file, {
    contentType: file.type,
  });

  await addDoc(submissionsCol(issueId), {
    submitterName,
    submitterUid: uid,
    format,
    fileName: file.name,
    storagePath,
    submittedAt: serverTimestamp(),
    locked,
  });

  await updateDoc(doc(db, "issues", issueId, "roster", rosterId), {
    submitted: true,
  });
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
    ownerUid: (data.ownerUid as string | null) ?? null,
    ownerName: (data.ownerName as string | null) ?? null,
  };
}

// 非公開(locked)セクションは、投稿者本人(ownerUid)と管理者にしか見えない。
// Firestoreのクエリは「ルール上返せることが保証できる範囲」しか実行できないため、
// 管理者は無条件の一覧取得、一般メンバーは
// 「公開セクション」「自分が投稿者のセクション」の2クエリに分けて取得し、マージする。
export async function listBookletSections(
  issueId: string,
  viewer: { isAdmin: boolean; uid: string | null },
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

  if (viewer.uid) {
    const ownSnap = await getDocs(
      query(
        bookletCol(issueId),
        where("ownerUid", "==", viewer.uid),
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
  // (非公開セクションのファイルをStorageルール側で判定できるようにするため)
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
    ownerUid: sourceSubmission?.submitterUid ?? null,
    ownerName: sourceSubmission?.submitterName ?? null,
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

function toRosterEntry(id: string, data: Record<string, unknown>): RosterEntry {
  return {
    id,
    name: data.name as string,
    grade: (data.grade as Grade | "") ?? "",
    submitted: Boolean(data.submitted),
    note: (data.note as string) ?? "",
    claimedByUid: (data.claimedByUid as string | null) ?? null,
  };
}

export async function listRoster(issueId: string): Promise<RosterEntry[]> {
  const snap = await getDocs(query(rosterCol(issueId), orderBy("name", "asc")));
  return snap.docs.map((d) => toRosterEntry(d.id, d.data()));
}

// このブラウザ(uid)が既に「自分の行」として選択済みの名簿行を探す。
export async function findMyRosterEntry(
  issueId: string,
  uid: string,
): Promise<RosterEntry | null> {
  const snap = await getDocs(
    query(rosterCol(issueId), where("claimedByUid", "==", uid)),
  );
  const first = snap.docs[0];
  return first ? toRosterEntry(first.id, first.data()) : null;
}

// 名簿の中から自分の行を選択する(ログイン画面の代わりの本人識別)。
export async function claimRosterEntry(
  issueId: string,
  rosterId: string,
  uid: string,
): Promise<void> {
  await updateDoc(doc(db, "issues", issueId, "roster", rosterId), {
    claimedByUid: uid,
  });
}

export async function addRosterMember(
  issueId: string,
  input: { name: string; grade: Grade | "" },
): Promise<void> {
  await addDoc(rosterCol(issueId), {
    name: input.name,
    grade: input.grade,
    submitted: false,
    note: "",
    claimedByUid: null,
  });
}

export async function updateRosterMemberByAdmin(
  issueId: string,
  rosterId: string,
  input: { name: string; grade: Grade | ""; submitted: boolean; note: string },
): Promise<void> {
  await updateDoc(doc(db, "issues", issueId, "roster", rosterId), input);
}

// 誤って選択された場合などに、管理者が「自分の行」の指定を解除する。
export async function resetRosterClaim(
  issueId: string,
  rosterId: string,
): Promise<void> {
  await updateDoc(doc(db, "issues", issueId, "roster", rosterId), {
    claimedByUid: null,
  });
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
