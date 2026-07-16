import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Curhatin Aja",
  description: "Internal workspace for Curhatin Aja - attendance, tasks, and team chat.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
