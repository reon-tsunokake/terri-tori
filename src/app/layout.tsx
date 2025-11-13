import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../contexts/AuthContext";
import { LocationProvider } from "../contexts/LocationContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Terri-tori - 現実の写真で、街を染めよう",
  description: "写真を投稿して、あなたの街を彩るSNSアプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <LocationProvider>
            {children}
          </LocationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
