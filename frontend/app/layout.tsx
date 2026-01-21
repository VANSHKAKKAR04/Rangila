import React from "react";
import ConditionalNavigation from "./components/ConditionalNavigation";
import { CartProvider } from "./contexts/CartContext";
import "./globals.css";

export const metadata = {
  title: "Rangila Gift Shop",
  description: "Delightful gifts for every occasion",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning={true}>
        <CartProvider>
          <ConditionalNavigation />
          <main>{children}</main>
        </CartProvider>
      </body>
    </html>
  );
}

