import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Janetimes Studio",
  description: "Student homework management frontend mock"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
