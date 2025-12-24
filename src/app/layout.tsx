import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../contexts/AuthContext";
import Header from "../components/layout/Header";
import { LocationProvider } from "../contexts/LocationContext";
import { SeasonPostProvider } from "../contexts/SeasonPostContext";
import { Toaster } from "react-hot-toast";

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
          <Header />
          <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
          <div className="pt-14 sm:pt-16 md:pt-20">
            <LocationProvider>
              <SeasonPostProvider>
                {children}
              </SeasonPostProvider>
            </LocationProvider>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
