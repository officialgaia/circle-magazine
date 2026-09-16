import type { Metadata } from "next";
import { Noto_Sans_JP, Shippori_Mincho } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { Header } from "@/components/Header";

const sansJp = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-sans",
});

const serifJp = Shippori_Mincho({
  subsets: ["latin"],
  weight: ["600", "800"],
  variable: "--font-serif",
});

// このアプリは全ページがクライアント側のFirebase認証状態に依存するため、
// 静的プリレンダリングの恩恵がない。ビルド時にFirebase設定(環境変数)が
// 無い/無効な状態でも `next build` が失敗しないよう、動的レンダリングに固定する。
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "サークル機関誌",
    template: "%s | サークル機関誌",
  },
  description: "サークルの機関誌をオンラインで管理するアプリ。",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${sansJp.variable} ${serifJp.variable}`}>
      <body>
        <AuthProvider>
          <Header />
          <main className="container py-8">{children}</main>
          <footer className="container py-10">
            <p className="muted" style={{ fontSize: "0.75rem" }}>
              サークル機関誌 管理アプリ — メンバー限定
            </p>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
