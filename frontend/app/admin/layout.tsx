"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import AdminProtectedRoute from "../components/AdminProtectedRoute";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    router.push("/login");
  };

  const navLinks = [
    { href: "/admin", label: "Dashboard", icon: "📊" },
    { href: "/admin/products", label: "Products", icon: "📦" },
    { href: "/admin/categories", label: "Categories", icon: "🏷️" },
    { href: "/admin/inventory", label: "Inventory", icon: "📋" },
    { href: "/admin/orders", label: "Orders", icon: "📝" },
    { href: "/admin/users", label: "Users", icon: "👥" },
    { href: "/admin/theme", label: "Theme", icon: "🎨" },
    { href: "/", label: "View Site", icon: "🌐", external: true },
  ];
  

  return (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Admin Header */}
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  aria-label="Toggle sidebar"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <Link href="/admin" className="text-xl font-bold text-primary-600">
                  Admin Dashboard
                </Link>
                <span className="hidden sm:inline text-gray-400">|</span>
                <Link href="/" className="hidden sm:inline text-gray-600 hover:text-primary-600">
                  View Site
                </Link>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm text-gray-700 hover:text-primary-600 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <div className="flex relative">
          {/* Mobile Sidebar Overlay */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Sidebar */}
          <aside
            className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-4rem)] transform transition-transform duration-300 ease-in-out ${
              sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
            }`}
          >
            <nav className="p-4 space-y-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setSidebarOpen(false)}
                  target={link.external ? "_blank" : undefined}
                  rel={link.external ? "noopener noreferrer" : undefined}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? "bg-primary-50 text-primary-600 font-semibold"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span>{link.icon}</span>
                  <span>{link.label}</span>
                </Link>
              );
            })}

            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 w-full min-w-0 p-4 sm:p-6 lg:p-8 overflow-x-auto">{children}</main>
        </div>
      </div>
    </AdminProtectedRoute>
  );
}
