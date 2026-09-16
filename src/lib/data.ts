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
} from "firebase/firestore/lite";
import {
  deleteObject,
  getBlob,
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

// 号を削除する。投稿・冊子セクションはStorage上のファイルも含めて削除し、
// 名簿とあわせて号そのものも削除する(Firestoreはサブコレクションを
// 自動では削除しないため、明示的にすべて削除して回る)。
export async function deleteIssue(issueId: string): Promise<void> {
  const [submissionsSnap, bookletSnap, rosterSnap] = await Promise.all([
    getDocs(submissionsCol(issueId)),
    getDocs(bookletCol(issueId)),
    getDocs(rosterCol(issueId)),
  ]);

  await Promise.all(
    submissionsSnap.docs.map(async (d) => {
      const storagePath = d.data().storagePath as string;
      await deleteObject(ref(storage, storagePath)).catch(() => {});
      await deleteDoc(d.ref);
    }),
  );

  await Promise.all(
    bookletSnap.docs.map(async (d) => {
      const pdfStoragePath = d.data().pdfStoragePath as string;
      await deleteObject(ref(storage, pdfStoragePath)).catch(() => {});
      await deleteDoc(d.ref);
    }),
  );

  await Promise.all(rosterSnap.docs.map((d) => deleteDoc(d.ref)));

  await deleteDoc(doc(db, "issues", issueId));
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
    downloadedByAdmin: Boolean(data.downloadedByAdmin),
  };
}

// 管理者専用。号内の投稿を一覧する(1人1件までしか存在しない)。
export async function listSubmissions(issueId: string): Promise<Submission[]> {
  const snap = await getDocs(
    query(submissionsCol(issueId), orderBy("submittedAt", "desc")),
  );
  return snap.docs.map((d) => toSubmission(d.id, d.data()));
}

// 自分(このブラウザ)が今投稿しているものを取得する。1人1件までなので
// ドキュメントIDをuidに固定しており、直接取得できる。
export async function getMySubmission(
  issueId: string,
  uid: string,
): Promise<Submission | null> {
  const snap = await getDoc(doc(submissionsCol(issueId), uid));
  return snap.exists() ? toSubmission(snap.id, snap.data()) : null;
}

// 1人につき投稿は1件までとし、再投稿すると前回分を置き換える。
export async function createSubmission(params: {
  issueId: string;
  uid: string;
  rosterId: string;
  submitterName: string;
  file: File;
  locked: boolean;
}): Promise<void> {
  const { issueId, uid, rosterId, submitterName, file, locked } = params;
  const lowerName = file.name.toLowerCase();
  const format: SubmissionFormat = lowerName.endsWith(".pdf") ? "pdf" : "docx";
  // スマートフォンのファイル選択では file.type が空文字になることがあり、
  // Storageルールのcontent-typeチェックに弾かれて投稿が即座に失敗する原因に
  // なっていた。拡張子から正しいMIMEタイプを判定して確実に設定する。
  const contentType = lowerName.endsWith(".pdf")
    ? "application/pdf"
    : lowerName.endsWith(".doc")
      ? "application/msword"
      : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const storagePath = `issues/${issueId}/submissions/${uid}/${file.name}`;

  const existingRef = doc(submissionsCol(issueId), uid);
  const existing = await getDoc(existingRef);
  if (existing.exists()) {
    const oldPath = existing.data().storagePath as string;
    if (oldPath !== storagePath) {
      await deleteObject(ref(storage, oldPath)).catch(() => {
        // 既に無ければ無視
      });
    }
  }

  await uploadBytes(ref(storage, storagePath), file, {
    contentType,
  });

  await setDoc(existingRef, {
    submitterName,
    submitterUid: uid,
    format,
    fileName: file.name,
    storagePath,
    submittedAt: serverTimestamp(),
    locked,
    downloadedByAdmin: false,
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

// 管理者専用。<a download> はStorageのような別オリジンのURLには効かず、
// ブラウザがPDFをそのまま開いてしまう。SDKで中身を取得してBlobにし、
// 同一オリジンのURLとして保存させることで、確実にダウンロード動作にする。
// (Storageバケットに cors.json の設定が必要。READMEを参照)
export async function downloadSubmissionFile(
  storagePath: string,
  fileName: string,
): Promise<void> {
  const blob = await getBlob(ref(storage, storagePath));
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Safariはクリック直後に revoke するとダウンロードが中断されることがある
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}

export async function markSubmissionDownloaded(
  issueId: string,
  submissionId: string,
): Promise<void> {
  await updateDoc(doc(db, "issues", issueId, "submissions", submissionId), {
    downloadedByAdmin: true,
  });
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
// (等値条件のみのクエリにして複合インデックスを不要にし、並び順はクライアント側でソートする)
export async function listBookletSections(
  issueId: string,
  viewer: { isAdmin: boolean; uid: string | null },
): Promise<BookletSection[]> {
  if (viewer.isAdmin) {
    const snap = await getDocs(query(bookletCol(issueId), orderBy("order", "asc")));
    return snap.docs.map((d) => toBookletSection(d.id, d.data()));
  }

  const publicSnap = await getDocs(
    query(bookletCol(issueId), where("locked", "==", false)),
  );
  const byId = new Map<string, BookletSection>();
  publicSnap.docs.forEach((d) => byId.set(d.id, toBookletSection(d.id, d.data())));

  if (viewer.uid) {
    const ownSnap = await getDocs(
      query(bookletCol(issueId), where("ownerUid", "==", viewer.uid)),
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
    claimedByUid: (data.claimedByUid as string | null) ?? null,
  };
}

export async function listRoster(issueId: string): Promise<RosterEntry[]> {
  const snap = await getDocs(query(rosterCol(issueId), orderBy("name", "asc")));
  return snap.docs.map((d) => toRosterEntry(d.id, d.data()));
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
    claimedByUid: null,
  });
}

export async function updateRosterMemberByAdmin(
  issueId: string,
  rosterId: string,
  input: { name: string; grade: Grade | ""; submitted: boolean },
): Promise<void> {
  await updateDoc(doc(db, "issues", issueId, "roster", rosterId), input);
}

// 別の端末で選び直したい場合や、認証がうまく引き継がれなかった場合の
// 復旧用に、管理者が「自分の行」の選択を解除できるようにする。
export async function resetRosterClaim(
  issueId: string,
  rosterId: string,
): Promise<void> {
  await updateDoc(doc(db, "issues", issueId, "roster", rosterId), {
    claimedByUid: null,
  });
}

export async function deleteRosterMember(
  issueId: string,
  rosterId: string,
): Promise<void> {
  await deleteDoc(doc(db, "issues", issueId, "roster", rosterId));
}
