import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SwipeSummarize - スワイプで記事を仕分ける",
  description: "「後で読む」リストに溜まった記事を、AI要約でサクサク消化。Tinder風UIで直感的に仕分けできるWebアプリ。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${inter.className} antialiased bg-neutral-50`}>
        <main className="min-h-screen">
          {children}
        </main>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
