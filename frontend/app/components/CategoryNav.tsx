"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { buildApiUrl } from "../../lib/api";
import { useTheme } from "../contexts/ThemeContext";

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function CategoryNav() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollYRef = useRef(0);
  const { theme } = useTheme();

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    checkScrollButtons();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("scroll", checkScrollButtons);
      window.addEventListener("resize", checkScrollButtons);
      return () => {
        container.removeEventListener("scroll", checkScrollButtons);
        window.removeEventListener("resize", checkScrollButtons);
      };
    }
  }, [categories]);

  // Handle scroll to hide/show category navbar
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const lastScrollY = lastScrollYRef.current;
      
      // Hide when scrolling down, show when scrolling up
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else if (currentScrollY < lastScrollY) {
        setIsVisible(true);
      }
      
      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch(buildApiUrl("/api/v1/categories"));
      if (response.ok) {
        const data = await response.json();
        setCategories(data || []);
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkScrollButtons = () => {
    const container = scrollContainerRef.current;
    if (container) {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  const scrollLeft = () => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollBy({ left: -200, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollBy({ left: 200, behavior: "smooth" });
    }
  };

  // Get theme colors for styling
  const bgColor = theme?.colors?.primary_200 || "#fed7aa"; // Lighter shade (primary-200)
  const borderColor = theme?.colors?.primary_300 || "#fdba74"; // Slightly darker for border
  const hoverBgColor = theme?.colors?.primary_50 || "#fff7ed"; // Very light for hover

  if (loading) {
    return (
      <div 
        className="border-b sticky top-16 z-40 transition-transform duration-300"
        style={{ 
          backgroundColor: bgColor,
          borderColor: borderColor,
          transform: isVisible ? "translateY(0)" : "translateY(-100%)"
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-12 overflow-x-auto">
            <div className="flex space-x-4 animate-pulse">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-6 w-24 bg-gray-300 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="border-b sticky top-16 z-40 transition-transform duration-300"
      style={{ 
        backgroundColor: bgColor,
        borderColor: borderColor,
        transform: isVisible ? "translateY(0)" : "translateY(-100%)"
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative">
          {/* Left Arrow */}
          {showLeftArrow && (
            <button
              onClick={scrollLeft}
              className="absolute left-0 top-0 bottom-0 z-10 px-2 flex items-center justify-center transition-colors backdrop-blur-sm"
              style={{
                backgroundColor: `${hoverBgColor}cc`, // Semi-transparent
              }}
              aria-label="Scroll left"
            >
              <svg
                className="w-5 h-5"
                style={{ color: theme?.colors?.primary_700 || "#c2410c" }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          )}

          {/* Right Arrow */}
          {showRightArrow && (
            <button
              onClick={scrollRight}
              className="absolute right-0 top-0 bottom-0 z-10 px-2 flex items-center justify-center transition-colors backdrop-blur-sm"
              style={{
                backgroundColor: `${hoverBgColor}cc`, // Semi-transparent
              }}
              aria-label="Scroll right"
            >
              <svg
                className="w-5 h-5"
                style={{ color: theme?.colors?.primary_700 || "#c2410c" }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          )}

          <div
            ref={scrollContainerRef}
            className="flex items-center h-12 overflow-x-auto scrollbar-hide scroll-smooth pl-8 pr-8"
          >
            <Link
              href="/products"
              className="flex-shrink-0 px-4 py-2 text-sm font-medium rounded transition-colors whitespace-nowrap"
              style={{
                color: theme?.colors?.primary_800 || "#9a3412",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = hoverBgColor;
                e.currentTarget.style.color = theme?.colors?.primary_600 || "#ea580c";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = theme?.colors?.primary_800 || "#9a3412";
              }}
            >
              All Categories
            </Link>
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/products?category=${category.slug}`}
                className="flex-shrink-0 px-4 py-2 text-sm font-medium rounded transition-colors whitespace-nowrap"
                style={{
                  color: theme?.colors?.primary_800 || "#9a3412",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = hoverBgColor;
                  e.currentTarget.style.color = theme?.colors?.primary_600 || "#ea580c";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = theme?.colors?.primary_800 || "#9a3412";
                }}
              >
                {category.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
