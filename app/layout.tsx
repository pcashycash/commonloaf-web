import type { Metadata, Viewport } from "next";
import { Abril_Fatface } from "next/font/google";
import "./globals.css";

const abrilFatface = Abril_Fatface({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-abril",
});

export const metadata: Metadata = {
  title: "The Common Loaf",
  description: "Shared meals. Stronger relationships.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={abrilFatface.variable}>{children}</body>
    </html>
  );
}
