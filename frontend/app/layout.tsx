import React from "react";
import ConditionalNavigation from "./components/ConditionalNavigation";
import { CartProvider } from "./contexts/CartContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import "./globals.css";

export const metadata = {
  title: "Rangila Store",
  description: "Delightful gifts for every occasion",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      </head>
      <body suppressHydrationWarning={true}>
        <ThemeProvider>
          <CartProvider>
            <ConditionalNavigation />
            <main>{children}</main>
          </CartProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

