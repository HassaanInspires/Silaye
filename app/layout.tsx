import type { Metadata, Viewport } from "next";
import { Geist, Noto_Sans_Arabic, Noto_Nastaliq_Urdu } from "next/font/google";
import "./globals.css";
import { NativeInitializer } from "@/components/platform/native-initializer";
import { NotificationScheduler } from "@/components/platform/notification-scheduler";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const notoSansArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-urdu-sans",
  display: "swap",
});

const notoNastaliqUrdu = Noto_Nastaliq_Urdu({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-urdu-serif",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#0B0C0E",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Silaye Beta | Bespoke Tailor Workshop Management & CRM",
  description:
    "Mission-critical bespoke tailor workshop OS, bilingual measurement vault, and workflow pipeline engine.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${notoSansArabic.variable} ${notoNastaliqUrdu.variable} dark`}
      suppressHydrationWarning
    >
      <body className="h-full w-full overflow-hidden bg-background font-sans text-foreground antialiased selection:bg-primary/20 selection:text-primary">
        <NativeInitializer />
        <NotificationScheduler />
        {children}
      </body>
    </html>
  );
}
