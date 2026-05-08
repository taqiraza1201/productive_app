import type { Metadata } from "next";
import "./globals.css";
import SessionProvider from "@/components/SessionProvider";

export const metadata: Metadata = {
  title: "CyberSec Consistency Tracker",
  description: "Track your daily cybersecurity consistency and streaks",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full">
      <body className="min-h-full font-sans antialiased bg-gray-950 text-gray-100">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
