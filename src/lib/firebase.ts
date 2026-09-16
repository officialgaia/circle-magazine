import { getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps()[0] ?? initializeApp(firebaseConfig);

// FirestoreはデフォルトでWebChannelという持続的なストリーミング接続を使うが、
// Braveのシールドや一部のモバイル回線・プロキシ環境ではこれが遮断・干渉され、
// 読み込みが永遠に終わらない/書き込みが即座に失敗する原因になる。
// ロングポーリングを自動検出させることで、こうした環境でも確実に通信できるようにする。
function createFirestore() {
  try {
    return initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
    });
  } catch {
    // 既に別設定で初期化済み(Fast Refreshなど)の場合はそのまま取得する
    return getFirestore(app);
  }
}

export const auth = getAuth(app);
export const db = createFirestore();
export const storage = getStorage(app);
