"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { buildApiUrl } from "../../lib/api";

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function CategoryNav() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
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

  if (loading) {
    return (
      <div className="bg-gray-100 border-b border-gray-200">
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
    <div className="bg-gray-100 border-b border-gray-200 sticky top-16 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-12 overflow-x-auto scrollbar-hide">
          <Link
            href="/products"
            className="flex-shrink-0 px-4 py-2 text-sm font-medium text-gray-700 hover:text-primary-600 hover:bg-white rounded transition-colors whitespace-nowrap"
          >
            All Categories
          </Link>
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/products?category=${category.slug}`}
              className="flex-shrink-0 px-4 py-2 text-sm font-medium text-gray-700 hover:text-primary-600 hover:bg-white rounded transition-colors whitespace-nowrap"
            >
              {category.name}
            </Link>
          ))}
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
