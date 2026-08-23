import type { Metadata } from "next";
import "@/lib/db";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fair Split",
  description: "Split shared expenses fairly.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
