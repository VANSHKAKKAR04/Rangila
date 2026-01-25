"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useCart } from "../contexts/CartContext";
import { useTheme } from "../contexts/ThemeContext";
import { buildApiUrl } from "../../lib/api";

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [logoError, setLogoError] = useState(false);
  const { cart } = useCart();
  const { theme } = useTheme();

  const [isAdmin, setIsAdmin] = useState(false);

  // Reset logo error when theme changes
  useEffect(() => {
    if (theme?.logo_url) {
      setLogoError(false);
    }
  }, [theme?.logo_url]);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    setIsLoggedIn(!!token);

    // Check if user is admin
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        const roles: string[] = payload.roles || [];
        setIsAdmin(roles.includes("admin"));
      } catch (err) {
        setIsAdmin(false);
      }
    } else {
      setIsAdmin(false);
    }

    const handleStorageChange = () => {
      const token = localStorage.getItem("access_token");
      setIsLoggedIn(!!token);
      
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          const roles: string[] = payload.roles || [];
          setIsAdmin(roles.includes("admin"));
        } catch (err) {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setIsLoggedIn(false);
    router.push("/login");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
    }
  };

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/about", label: "About Us" },
  ];
  
  const userNavLinks = isLoggedIn ? [
    { href: "/orders", label: "My Orders" },
  ] : [];

  const cartItemCount = cart?.item_count || 0;

  return (
    <header className="bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg sticky top-0 z-50">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        {/* Top Row: Logo, Search, User Actions */}
        <div className="flex items-center h-16 gap-4 lg:gap-6">
          {/* Logo - Left Corner */}
          <Link href="/" className="flex items-center space-x-2 hover:opacity-90 transition-opacity flex-shrink-0">
            <div className="relative w-8 h-8 flex items-center justify-center">
              {theme?.logo_url && !logoError ? (
                <img 
                  src={theme.logo_url} 
                  alt="Rangila Store Logo" 
                  className="w-full h-full object-contain"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <span className="text-2xl">🎁</span>
              )}
            </div>
            <span className="text-xl font-bold hidden sm:inline">Rangila Store</span>
          </Link>

          {/* Search Bar - Takes maximum available space */}
          <form onSubmit={handleSearch} className="flex-1 min-w-0 max-w-none">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for products..."
                className="w-full px-4 py-2.5 pl-10 pr-12 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-white/50 text-base"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-primary-600 hover:bg-primary-100 rounded"
                aria-label="Search"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </form>

          {/* Desktop Navigation - User Actions */}
          <nav className="hidden md:flex items-center space-x-2 lg:space-x-3 flex-shrink-0 ml-2">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    isActive
                      ? "bg-white/20 font-semibold shadow-md"
                      : "hover:bg-white/10 hover:shadow-sm"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}

            {isLoggedIn ? (
              <>
                <Link
                  href="/orders"
                  className={`px-4 py-2 rounded-lg transition-all ${
                    pathname === "/orders"
                      ? "bg-white/20 font-semibold shadow-md"
                      : "hover:bg-white/10 hover:shadow-sm"
                  }`}
                >
                  My Orders
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    className={`px-4 py-2 rounded-lg transition-all ${
                      pathname?.startsWith("/admin")
                        ? "bg-white/20 font-semibold"
                        : "hover:bg-white/10"
                    }`}
                  >
                    Admin
                  </Link>
                )}
                <Link
                  href="/cart"
                  className="relative p-2 rounded-lg hover:bg-white/10 transition-all flex items-center justify-center"
                  aria-label={`Cart (${cartItemCount} items)`}
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  {cartItemCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center min-w-[1.25rem]">
                      {cartItemCount > 9 ? "9+" : cartItemCount}
                    </span>
                  )}
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 rounded-lg hover:bg-white/10 transition-all"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className={`px-4 py-2 rounded-lg transition-all ${
                    pathname === "/login"
                      ? "bg-white/20 font-semibold"
                      : "hover:bg-white/10"
                  }`}
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="px-6 py-2 rounded-lg bg-white/20 hover:bg-white/30 font-semibold transition-all"
                >
                  Sign Up
                </Link>
              </>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-all"
            aria-label="Toggle menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="md:hidden py-4 border-t border-white/20 space-y-2">
            {/* Mobile Search */}
            <form onSubmit={handleSearch} className="px-4 pb-4">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for products..."
                  className="w-full px-4 py-2 pl-10 pr-12 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-white/50"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-primary-600 hover:bg-primary-100 rounded"
                  aria-label="Search"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </form>
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`block px-4 py-2 rounded-lg ${
                    isActive
                      ? "bg-white/20 font-semibold"
                      : "hover:bg-white/10"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            {isLoggedIn ? (
              <>
                <Link
                  href="/orders"
                  onClick={() => setIsMenuOpen(false)}
                  className={`block px-4 py-2 rounded-lg ${
                    pathname === "/orders"
                      ? "bg-white/20 font-semibold"
                      : "hover:bg-white/10"
                  }`}
                >
                  My Orders
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setIsMenuOpen(false)}
                    className={`block px-4 py-2 rounded-lg ${
                      pathname?.startsWith("/admin")
                        ? "bg-white/20 font-semibold"
                        : "hover:bg-white/10"
                    }`}
                  >
                    Admin Dashboard
                  </Link>
                )}
                <Link
                  href="/cart"
                  onClick={() => setIsMenuOpen(false)}
                  className="relative flex items-center justify-between px-4 py-2 rounded-lg hover:bg-white/10"
                  aria-label={`Cart (${cartItemCount} items)`}
                >
                  <div className="flex items-center space-x-2">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                    <span>Cart</span>
                  </div>
                  {cartItemCount > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center min-w-[1.25rem]">
                      {cartItemCount > 9 ? "9+" : cartItemCount}
                    </span>
                  )}
                </Link>
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 rounded-lg hover:bg-white/10"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setIsMenuOpen(false)}
                  className="block px-4 py-2 rounded-lg hover:bg-white/10"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setIsMenuOpen(false)}
                  className="block px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 font-semibold"
                >
                  Sign Up
                </Link>
              </>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
