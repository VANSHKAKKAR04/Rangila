"use client";

import { usePathname } from "next/navigation";
import Navigation from "./Navigation";

export default function ConditionalNavigation() {
  const pathname = usePathname();
  
  // Don't show regular navigation on admin pages
  if (pathname?.startsWith("/admin")) {
    return null;
  }
  
  return <Navigation />;
}
