"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import AdminProtectedRoute from "../components/AdminProtectedRoute";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

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
  ];

  return (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Admin Header */}
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <Link href="/admin" className="text-xl font-bold text-primary-600">
                  Admin Dashboard
                </Link>
                <span className="text-gray-400">|</span>
                <Link href="/" className="text-gray-600 hover:text-primary-600">
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

        <div className="flex">
          {/* Sidebar */}
          <aside className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-4rem)]">
            <nav className="p-4 space-y-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
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
          <main className="flex-1 p-8">{children}</main>
        </div>
      </div>
    </AdminProtectedRoute>
  );
}
