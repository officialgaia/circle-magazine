import { getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore/lite";
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

export const auth = getAuth(app);
// このアプリはリアルタイム購読(onSnapshot)やオフラインキャッシュを使わず、
// すべて一回きりの読み書きなので、軽量版のFirestore SDK(lite)で足りる。
// 通常版より大幅に小さく、持続的なストリーミング接続も使わないため、
// 読み込みが速く、モバイル回線やプライバシー系ブラウザとの相性も良い。
export const db = getFirestore(app);
export const storage = getStorage(app);
