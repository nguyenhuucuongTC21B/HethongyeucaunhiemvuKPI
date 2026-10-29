import type { Metadata } from "next";
import { Roboto, Roboto_Slab } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "700"],
});

const robotoSlab = Roboto_Slab({
  variable: "--font-roboto-slab",
  subsets: ["latin", "vietnamese"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Hệ thống Quản lý Phân công Nhiệm vụ - Tính KPI",
  description:
    "Hệ thống tiếp nhận, phân công và theo dõi nhiệm vụ kỹ thuật - đánh giá KPI khối lượng công việc, phục vụ cán bộ, công chức Viện.",
  keywords: ["quản lý nhiệm vụ", "phân công", "KPI", "kỹ thuật", "Viện"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body
        className={`${roboto.variable} ${robotoSlab.variable} font-sans antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
