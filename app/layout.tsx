import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono, Plus_Jakarta_Sans, Noto_Sans_JP } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Moji visual refresh (docs/design-referencemoji): Plus Jakarta Sans for
// UI text, Noto Sans JP specifically for kana/kanji glyphs — the two are
// deliberately kept separate everywhere in the reference design.
const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-moji-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const notoSansJP = Noto_Sans_JP({
  variable: "--font-moji-jp",
  subsets: ["latin"],
  weight: ["500", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const imageUrl = new URL("/og.png", `${protocol}://${host}`);

  return {
    title: "BaraJapan",
    description: "Your personalized path to learning Japanese.",
    openGraph: {
      title: "BaraJapan",
      description: "Your personalized path to learning Japanese.",
      images: [{ url: imageUrl, width: 1660, height: 948, alt: "BaraJapan" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "BaraJapan",
      description: "Your personalized path to learning Japanese.",
      images: [imageUrl],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body className={`${geistSans.variable} ${geistMono.variable} ${plusJakartaSans.variable} ${notoSansJP.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
