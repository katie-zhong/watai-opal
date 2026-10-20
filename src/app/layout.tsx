import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const plex = localFont({
  src: [
    { path: "../../docs/assets/fonts/sans-400.woff2", weight: "400" },
    { path: "../../docs/assets/fonts/sans-500.woff2", weight: "500" },
    { path: "../../docs/assets/fonts/sans-600.woff2", weight: "600" },
    { path: "../../docs/assets/fonts/sans-700.woff2", weight: "700" }
  ],
  variable: "--font-plex"
});
const plexMono = localFont({
  src: [
    { path: "../../docs/assets/fonts/mono-400.woff2", weight: "400" },
    { path: "../../docs/assets/fonts/mono-500.woff2", weight: "500" },
    { path: "../../docs/assets/fonts/mono-600.woff2", weight: "600" }
  ],
  variable: "--font-plex-mono"
});

export const metadata: Metadata = {
  title: "WAT.ai Ops",
  description: "Partnership and operations platform for WAT.ai"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${plex.variable} ${plexMono.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
