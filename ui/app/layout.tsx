import type { Metadata } from "next";

import "@fontsource-variable/inter";

import "./globals.css";

export const metadata: Metadata = {
  title: "SentientOS — Your daily briefing",
  description: "A private, proactive intelligence briefing from your local life.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
