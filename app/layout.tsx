import type { Metadata } from "next";
import {
  Archivo,
  Jost,
  Newsreader,
  Public_Sans,
  Space_Mono,
  Spectral,
} from "next/font/google";

import "./globals.css";

// Font roles per variant are mapped to these CSS variables in globals.css.
const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
  variable: "--font-archivo",
});
const jost = Jost({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-jost",
});
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
const spectral = Spectral({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-spectral",
});

const fontVariables = [
  archivo.variable,
  jost.variable,
  newsreader.variable,
  publicSans.variable,
  spaceMono.variable,
  spectral.variable,
].join(" ");

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
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
