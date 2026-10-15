import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import SiteShell from "../components/pageBorder";
import { sans } from "../lib/fonts";

export const metadata: Metadata = {
  title: "สรุปเอกสารยาว",
  description: "สรุปเอกสารยาวหลายระดับ พร้อมอ้างอิงหน้าต้นฉบับ",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="th">
      <body className={`${sans.className} min-h-screen bg-[#F1EADB] text-black antialiased`}>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}