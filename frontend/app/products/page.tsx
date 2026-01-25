"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useCart } from "../contexts/CartContext";
import Toast from "../components/Toast";
import { buildApiUrl } from "../../lib/api";

interface Product {
  id: string;
  name: string;
  slug: string;
  price_cents: number;
  currency: string;
  short_description?: string;
  main_image_url?: string;
  default_variant_id?: string;
  category: {
    id: string;
    name: string;
    slug: string;
  };
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface CategoryWithProducts {
  category: Category;
  products: Product[];
}

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const categorySlug = searchParams.get("category");
  const searchQuery = searchParams.get("search");
  
  const [categoriesWithProducts, setCategoriesWithProducts] = useState<CategoryWithProducts[]>([]);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const { addToCart } = useCart();
  const scrollContainerRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    if (searchQuery) {
      fetchSearchResults();
    } else if (categorySlug) {
      fetchCategoryProducts();
    } else {
      fetchCategoriesAndProducts();
    }
  }, [categorySlug, searchQuery]);

  const fetchSearchResults = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        buildApiUrl(`/api/v1/products?search=${encodeURIComponent(searchQuery || "")}&page_size=100`)
      );
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.items || []);
        setCategoriesWithProducts([]);
      } else {
        throw new Error("Failed to fetch search results");
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      console.error("Error fetching search results:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoryProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        buildApiUrl(`/api/v1/products?category_slug=${categorySlug}&page_size=100`)
      );
      if (response.ok) {
        const data = await response.json();
        // Get category info
        const categoryResponse = await fetch(buildApiUrl(`/api/v1/categories/${categorySlug}`));
        if (categoryResponse.ok) {
          const category: Category = await categoryResponse.json();
          setCategoriesWithProducts([{
            category,
            products: data.items || [],
          }]);
        }
        setSearchResults([]);
      } else {
        throw new Error("Failed to fetch category products");
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      console.error("Error fetching category products:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoriesAndProducts = async () => {
    try {
      setLoading(true);
      
      // Fetch all categories
      const categoriesResponse = await fetch(buildApiUrl("/api/v1/categories"));
      if (!categoriesResponse.ok) {
        throw new Error("Failed to fetch categories");
      }
      const categories: Category[] = await categoriesResponse.json();

      // Fetch products for each category
      const categoryProductsPromises = categories.map(async (category) => {
        const productsResponse = await fetch(
          buildApiUrl(`/api/v1/products?category_slug=${category.slug}&page_size=50`)
        );
        if (productsResponse.ok) {
          const data = await productsResponse.json();
          return {
            category,
            products: data.items || [],
          };
        }
        return { category, products: [] };
      });

      const results = await Promise.all(categoryProductsPromises);
      
      // Include all categories, even if they have no products
      setCategoriesWithProducts(results);
      setSearchResults([]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      console.error("Error fetching products:", err);
    } finally {
      setLoading(false);
    }
  };

  const scrollCategory = (categoryId: string, direction: "left" | "right") => {
    const container = scrollContainerRefs.current[categoryId];
    if (container) {
      const scrollAmount = 400;
      container.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const handleAddToCart = async (product: Product, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!product.default_variant_id) {
      setToast({ message: "Product variant not available", type: "error" });
      return;
    }
    
    setAddingToCart(product.id);
    const success = await addToCart(product.default_variant_id, 1);
    
    if (success) {
      setToast({ message: "Added to cart!", type: "success" });
    } else {
      setToast({ message: "Failed to add to cart", type: "error" });
    }
    setAddingToCart(null);
  };

  const formatPrice = (cents: number) => {
    return `₹${(cents / 100).toLocaleString("en-IN")}`;
  };

  if (loading) {
    return (
      <section>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading products...</p>
        </div>
      </section>
    );
  }

  return (
    <section>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="mb-6 sm:mb-8">
        {searchQuery ? (
          <>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 text-gray-900">
              Search Results for "{searchQuery}"
            </h1>
            <p className="text-gray-600 text-base sm:text-lg">
              Found {searchResults.length} product{searchResults.length !== 1 ? "s" : ""}
            </p>
          </>
        ) : categorySlug ? (
          <>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 text-gray-900">
              {categoriesWithProducts[0]?.category.name || "Category"}
            </h1>
            <p className="text-gray-600 text-base sm:text-lg">
              Browse products in this category
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 text-gray-900">Our Catalogue</h1>
            <p className="text-gray-600 text-base sm:text-lg">
              Browse through our carefully curated collection of gifts
            </p>
          </>
        )}
      </div>

      {error && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg mb-6">
          Note: {error}
        </div>
      )}

      {/* Search Results View */}
      {searchQuery && searchResults.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {searchResults.map((product) => (
            <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow group">
              <Link href={`/products/${product.slug}`} className="block">
                <div className="h-48 relative overflow-hidden bg-gray-100">
                  {product.main_image_url ? (
                    <img
                      src={product.main_image_url}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-6xl">🎁</div>
                  )}
                </div>
              </Link>
              <div className="p-4">
                <Link href={`/products/${product.slug}`}>
                  <h3 className="font-semibold text-lg mb-1 group-hover:text-primary-600 transition-colors line-clamp-2">
                    {product.name}
                  </h3>
                </Link>
                {product.short_description && (
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {product.short_description}
                  </p>
                )}
                <div className="flex justify-between items-center mb-3">
                  <span className="font-bold text-primary-600 text-xl">
                    {formatPrice(product.price_cents)}
                  </span>
                </div>
                <button
                  onClick={(e) => handleAddToCart(product, e)}
                  disabled={addingToCart === product.id || !product.default_variant_id}
                  className="w-full btn-primary py-2 text-sm disabled:opacity-50"
                >
                  {addingToCart === product.id ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Adding...
                    </span>
                  ) : (
                    "Add to Cart"
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : searchQuery && searchResults.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-lg text-gray-600">No products found for "{searchQuery}".</p>
          <Link href="/products" className="text-primary-600 hover:text-primary-700 mt-4 inline-block">
            View all products →
          </Link>
        </div>
      ) : categoriesWithProducts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-lg text-gray-600">No products found.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {categoriesWithProducts
            .filter(({ products }) => products.length > 0)
            .map(({ category, products }) => (
            <div key={category.id} className="mb-12">
              {/* Category Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{category.name}</h2>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => scrollCategory(category.id, "left")}
                    className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                    aria-label="Scroll left"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => scrollCategory(category.id, "right")}
                    className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                    aria-label="Scroll right"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Horizontal Scrolling Product Cards */}
              <div
                ref={(el) => { scrollContainerRefs.current[category.id] = el; }}
                className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide"
                style={{
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                  WebkitOverflowScrolling: "touch",
                }}
              >
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="flex-shrink-0 w-56 sm:w-64 bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 group"
                  >
                    <Link href={`/products/${product.slug}`} className="block">
                      <div className="h-48 bg-gradient-to-br from-primary-100 to-primary-200 relative overflow-hidden">
                        {product.main_image_url ? (
                          <img
                            src={product.main_image_url}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-6xl">
                            🎁
                          </div>
                        )}
                      </div>
                    </Link>
                    <div className="p-4">
                      <Link href={`/products/${product.slug}`}>
                        <h3 className="font-semibold text-lg mb-1 group-hover:text-primary-600 transition-colors line-clamp-2">
                          {product.name}
                        </h3>
                      </Link>
                      {product.short_description && (
                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                          {product.short_description}
                        </p>
                      )}
                      <div className="flex justify-between items-center mb-3">
                        <span className="font-bold text-primary-600 text-xl">
                          {formatPrice(product.price_cents)}
                        </span>
                      </div>
                      <button
                        onClick={(e) => handleAddToCart(product, e)}
                        disabled={addingToCart === product.id || !product.default_variant_id}
                        className="w-full btn-primary py-2 text-sm disabled:opacity-50"
                      >
                        {addingToCart === product.id ? (
                          <span className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Adding...
                          </span>
                        ) : (
                          "Add to Cart"
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  );
}
