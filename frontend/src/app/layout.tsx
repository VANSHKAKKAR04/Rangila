import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rangila Store",
  description: "Delightful gifts for every occasion",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
