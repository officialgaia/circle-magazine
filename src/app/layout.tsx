import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { Header } from "@/components/Header";

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
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://identitytoolkit.googleapis.com" />
        <link rel="preconnect" href="https://firestore.googleapis.com" />
        <link rel="preconnect" href="https://firebasestorage.googleapis.com" />
      </head>
      <body>
        <AuthProvider>
          <Header />
          <main className="container py-8">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
