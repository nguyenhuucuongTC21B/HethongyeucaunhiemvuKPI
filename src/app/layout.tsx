import type { Metadata } from "next";
import { Roboto, Roboto_Slab } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { getSettings } from "@/lib/storage";
import { THEME_PRESETS } from "@/lib/constants";

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

export async function generateMetadata(): Promise<Metadata> {
  try {
    const s = await getSettings();
    return {
      title: `${s.siteTitle} | ${s.siteSubtitle}`,
      description:
        "Hệ thống tiếp nhận, phân công và theo dõi nhiệm vụ kỹ thuật - đánh giá KPI khối lượng công việc, phục vụ cán bộ, công chức Viện.",
      keywords: ["quản lý nhiệm vụ", "phân công", "KPI", "kỹ thuật", "Viện"],
    };
  } catch {
    return {
      title: "Hệ thống Quản lý Phân công Nhiệm vụ - Tính KPI",
      description:
        "Hệ thống tiếp nhận, phân công và theo dõi nhiệm vụ kỹ thuật - đánh giá KPI khối lượng công việc, phục vụ cán bộ, công chức Viện.",
    };
  }
}

/** Tạo CSS biến chủ đề theo cấu hình Admin (navy / crimson / custom) */
function themeStyle(primary: string, agency: string): string {
  const safe = /^#[0-9a-fA-F]{6}$/.test(primary) ? primary : "#1a3a5c";
  return `:root{
    --primary: ${safe};
    --ring: ${safe};
    --secondary: color-mix(in srgb, ${safe} 8%, #ffffff);
    --secondary-foreground: ${safe};
    --accent: color-mix(in srgb, ${safe} 10%, #ffffff);
    --accent-foreground: ${safe};
    --agency: ${agency};
    --agency-dark: color-mix(in srgb, ${safe} 82%, #000000);
    --agency-light: color-mix(in srgb, ${safe} 7%, #ffffff);
    --chart-1: ${safe};
  }`;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let primary = "#1a3a5c";
  let agency = "#8b1a1a";
  try {
    const s = await getSettings();
    const preset = s.themePreset ?? "navy";
    if (preset === "navy") {
      primary = THEME_PRESETS.navy.primary;
      agency = THEME_PRESETS.navy.agency;
    } else if (preset === "crimson") {
      primary = THEME_PRESETS.crimson.primary;
      agency = THEME_PRESETS.crimson.agency;
    } else if (preset === "custom" && s.primaryColor) {
      primary = s.primaryColor;
    }
  } catch {
    /* dùng màu mặc định */
  }

  return (
    <html lang="vi" suppressHydrationWarning>
      <body
        className={`${roboto.variable} ${robotoSlab.variable} font-sans antialiased bg-background text-foreground`}
      >
        <style dangerouslySetInnerHTML={{ __html: themeStyle(primary, agency) }} />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
