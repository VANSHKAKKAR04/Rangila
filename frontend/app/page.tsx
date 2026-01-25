"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useCart } from "./contexts/CartContext";
import Toast from "./components/Toast";
import { buildApiUrl } from "../lib/api";

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

export default function HomePage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [specialOffers, setSpecialOffers] = useState<Product[]>([]);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const { addToCart } = useCart();

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    setIsLoggedIn(!!token);
    fetchFeaturedProducts();
    fetchTrendingProducts();
    fetchSpecialOffers();
  }, []);

  const fetchFeaturedProducts = async () => {
    try {
      const response = await fetch(buildApiUrl(`/api/v1/products?page=1&page_size=4`));
      
      if (response.ok) {
        const data = await response.json();
        setFeaturedProducts(data.items || []);
      }
    } catch (error) {
      console.error("Failed to fetch featured products:", error);
    }
  };

  const fetchTrendingProducts = async () => {
    try {
      // Fetch products sorted by some criteria (you can modify this based on your backend)
      const response = await fetch(buildApiUrl(`/api/v1/products?page=1&page_size=8`));
      
      if (response.ok) {
        const data = await response.json();
        // Take first 6 as trending
        setTrendingProducts(data.items?.slice(0, 6) || []);
      }
    } catch (error) {
      console.error("Failed to fetch trending products:", error);
    }
  };

  const fetchSpecialOffers = async () => {
    try {
      // Fetch products - you can add a special offers filter if your backend supports it
      const response = await fetch(buildApiUrl(`/api/v1/products?page=2&page_size=6`));
      
      if (response.ok) {
        const data = await response.json();
        setSpecialOffers(data.items || []);
      }
    } catch (error) {
      console.error("Failed to fetch special offers:", error);
    }
  };

  const handleOrderClick = () => {
    if (!isLoggedIn) {
      router.push("/login");
    } else {
      router.push("/cart");
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

  return (
    <div>
      {/* Hero Banner Section */}
      <section className="bg-gradient-to-r from-primary-500 to-primary-600 text-white py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 sm:p-8 lg:p-12 text-center">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4">Starting ₹199 | Special Gift Deals</h1>
            <p className="text-sm sm:text-base lg:text-lg mb-4 sm:mb-6 max-w-2xl mx-auto opacity-90">
              Discover curated gifts for every celebration. From birthdays to anniversaries,
              we have something special for everyone.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
              <Link
                href="/products"
                className="w-full sm:w-auto bg-white text-primary-600 px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors shadow-lg text-center"
              >
                Browse Catalogue
              </Link>
              <button
                onClick={handleOrderClick}
                className="w-full sm:w-auto bg-primary-700 text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg font-semibold hover:bg-primary-800 transition-colors border-2 border-white shadow-lg"
              >
                Order Now
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-10 sm:py-12 lg:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-12">Why Choose Rangila?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="text-4xl mb-4">🎁</div>
              <h3 className="text-xl font-semibold mb-2">Curated Selection</h3>
              <p className="text-gray-600">
                Handpicked gifts that bring joy and make every occasion memorable.
              </p>
            </div>
            <div className="text-center p-6">
              <div className="text-4xl mb-4">🚚</div>
              <h3 className="text-xl font-semibold mb-2">Fast Delivery</h3>
              <p className="text-gray-600">
                Quick and reliable delivery to your doorstep, anywhere in India.
              </p>
            </div>
            <div className="text-center p-6">
              <div className="text-4xl mb-4">💝</div>
              <h3 className="text-xl font-semibold mb-2">Thoughtful Gifts</h3>
              <p className="text-gray-600">
                Every gift tells a story and shows how much you care.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trending Items Section */}
      <section className="py-8 sm:py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {toast && (
            <Toast
              message={toast.message}
              type={toast.type}
              onClose={() => setToast(null)}
            />
          )}
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">🔥 Trending Now</h2>
              <p className="text-gray-600 text-sm sm:text-base mt-1">Most popular gifts this week</p>
            </div>
            <Link
              href="/products"
              className="text-primary-600 font-semibold hover:text-primary-700 text-sm sm:text-base"
            >
              See all →
            </Link>
          </div>
          
          {trendingProducts.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-gray-100 rounded-lg overflow-hidden animate-pulse">
                  <div className="h-32 bg-gray-200"></div>
                  <div className="p-3">
                    <div className="h-3 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 w-16 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {trendingProducts.map((product) => (
                <div key={product.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow group">
                  <Link href={`/products/${product.slug}`} className="block">
                    <div className="h-32 sm:h-40 relative overflow-hidden bg-gray-100">
                      {product.main_image_url ? (
                        <img
                          src={product.main_image_url}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl">🎁</div>
                      )}
                    </div>
                  </Link>
                  <div className="p-3">
                    <Link href={`/products/${product.slug}`}>
                      <h3 className="font-medium text-sm mb-1 hover:text-primary-600 transition-colors line-clamp-2 min-h-[2.5rem]">
                        {product.name}
                      </h3>
                    </Link>
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-bold text-primary-600 text-sm">{formatPrice(product.price_cents)}</span>
                      <button
                        onClick={(e) => handleAddToCart(product, e)}
                        disabled={addingToCart === product.id || !product.default_variant_id}
                        className="bg-primary-600 text-white text-xs px-2 py-1 rounded hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {addingToCart === product.id ? "..." : "Add"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Special Offers Section */}
      <section className="py-8 sm:py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">⚡ Special Offers</h2>
              <p className="text-gray-600 text-sm sm:text-base mt-1">Limited time deals you don't want to miss</p>
            </div>
            <Link
              href="/products"
              className="text-primary-600 font-semibold hover:text-primary-700 text-sm sm:text-base"
            >
              View all offers →
            </Link>
          </div>
          
          {specialOffers.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
                  <div className="h-48 bg-gray-200"></div>
                  <div className="p-4">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded mb-3"></div>
                    <div className="flex justify-between items-center">
                      <div className="h-5 w-16 bg-gray-200 rounded"></div>
                      <div className="h-8 w-24 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {specialOffers.map((product) => (
                <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow group relative">
                  <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded z-10">
                        Special Offer
                      </div>
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
                      <h3 className="font-semibold mb-2 hover:text-primary-600 transition-colors line-clamp-2">
                        {product.name}
                      </h3>
                    </Link>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {product.short_description || "Perfect gift for any occasion"}
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-primary-600 text-lg">{formatPrice(product.price_cents)}</span>
                      <button
                        onClick={(e) => handleAddToCart(product, e)}
                        disabled={addingToCart === product.id || !product.default_variant_id}
                        className="btn-primary text-sm py-2 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {addingToCart === product.id ? (
                          <span className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
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
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Featured Products Preview */}
      <section className="py-8 sm:py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Featured Products</h2>
              <p className="text-gray-600 text-sm sm:text-base mt-1">Handpicked selections for you</p>
            </div>
            <Link
              href="/products"
              className="text-primary-600 font-semibold hover:text-primary-700 text-sm sm:text-base"
            >
              View All →
            </Link>
          </div>
          
          {featuredProducts.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Loading placeholders */}
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
                  <div className="h-48 bg-gray-200"></div>
                  <div className="p-4">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded mb-3"></div>
                    <div className="flex justify-between items-center">
                      <div className="h-5 w-16 bg-gray-200 rounded"></div>
                      <div className="h-8 w-24 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.map((product) => (
                <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                  <Link href={`/products/${product.slug}`} className="block">
                    <div className="h-48 relative overflow-hidden">
                      {product.main_image_url ? (
                        <img
                          src={product.main_image_url}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-white"></div>
                      )}
                    </div>
                  </Link>
                  <div className="p-4">
                    <Link href={`/products/${product.slug}`}>
                      <h3 className="font-semibold mb-2 hover:text-primary-600 transition-colors line-clamp-2">
                        {product.name}
                      </h3>
                    </Link>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {product.short_description || "Perfect gift for any occasion"}
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-primary-600">{formatPrice(product.price_cents)}</span>
                      <button
                        onClick={(e) => handleAddToCart(product, e)}
                        disabled={addingToCart === product.id || !product.default_variant_id}
                        className="btn-primary text-sm py-2 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {addingToCart === product.id ? (
                          <span className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
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
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-10 sm:py-12 lg:py-16 bg-primary-600 text-white text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">Ready to Find the Perfect Gift?</h2>
          <p className="text-base sm:text-lg lg:text-xl mb-6 sm:mb-8">Browse our extensive collection of thoughtful gifts</p>
          <Link
            href="/products"
            className="bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors inline-block shadow-lg"
          >
            Explore Catalogue
          </Link>
        </div>
      </section>
    </div>
  );
}
