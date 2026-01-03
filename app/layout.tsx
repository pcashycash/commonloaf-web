import type { Metadata } from "next";
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
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
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
