import type { Metadata } from "next";
import { Newsreader, Public_Sans, Space_Mono } from "next/font/google";

import { SessionProvider } from "@/components/session";
import "./globals.css";

// Font roles are mapped to these CSS variables in globals.css.
const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
});
const publicSans = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-public-sans",
});
const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
});

const fontVariables = [
  newsreader.variable,
  publicSans.variable,
  spaceMono.variable,
].join("");

export const metadata: Metadata = {
  title: "Peace Circle",
  description:
    "A private space for the Peace Circle community to share resources, discuss, and track events.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fontVariables} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SessionProvider>
          <div className="flex flex-1 flex-col bg-bg font-body text-ink">
            {children}
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}
