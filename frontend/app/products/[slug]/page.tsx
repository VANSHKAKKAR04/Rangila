"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "../../contexts/CartContext";
import Toast from "../../components/Toast";
import { buildApiUrl } from "../../../lib/api";

interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  description?: string;
  price_cents: number;
  currency: string;
  main_image_url?: string;
  default_variant_id?: string;
  category: {
    id: string;
    name: string;
    slug: string;
  };
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const { addToCart } = useCart();

  useEffect(() => {
    fetchProduct();
  }, [slug]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await fetch(buildApiUrl(`/api/v1/products/${slug}`));
      
      if (response.ok) {
        const data = await response.json();
        setProduct(data);
      } else if (response.status === 404) {
        setToast({ message: "Product not found", type: "error" });
      }
    } catch (error) {
      setToast({ message: "Failed to load product", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;

    if (!product.default_variant_id) {
      setToast({ message: "Product variant not available", type: "error" });
      return;
    }

    setAddingToCart(true);
    const success = await addToCart(product.default_variant_id, quantity);
    
    if (success) {
      setToast({ message: "Added to cart successfully!", type: "success" });
    } else {
      setToast({ message: "Failed to add to cart", type: "error" });
    }
    setAddingToCart(false);
  };

  const formatPrice = (cents: number) => {
    return `₹${(cents / 100).toLocaleString("en-IN")}`;
  };

  if (loading) {
    return (
      <section className="py-12">
        <div className="text-center">
          <div className="text-lg">Loading product...</div>
        </div>
      </section>
    );
  }

  if (!product) {
    return (
      <section className="py-12">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Product Not Found</h1>
          <Link href="/products" className="text-primary-600 hover:underline">
            Back to Catalogue
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="py-8">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="mb-4">
        <Link
          href="/products"
          className="text-primary-600 hover:text-primary-700 font-medium"
        >
          ← Back to Catalogue
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Product Image */}
        <div className="aspect-square bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center w-full">
          {product.main_image_url ? (
            <img
              src={product.main_image_url}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-8xl">🎁</div>
          )}
        </div>

        {/* Product Details */}
        <div className="p-8 flex flex-col">
          {product.category && (
            <span className="text-sm text-gray-500 mb-2">{product.category.name}</span>
          )}
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4">{product.name}</h1>
          
          <div className="text-2xl sm:text-3xl font-bold text-primary-600 mb-4 sm:mb-6">
            {formatPrice(product.price_cents)}
          </div>

          {product.description && (
            <div className="mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-semibold mb-2">Description</h2>
              <p className="text-gray-700 whitespace-pre-line text-sm sm:text-base">{product.description}</p>
            </div>
          )}

          {/* Quantity Selector */}
          <div className="mb-6">
            <label className="form-label">Quantity</label>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-10 h-10 rounded-lg border border-gray-300 hover:bg-gray-50 flex items-center justify-center font-semibold"
                disabled={quantity <= 1}
              >
                -
              </button>
              <input
                type="number"
                min="1"
                max="100"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                className="w-20 text-center form-input"
              />
              <button
                onClick={() => setQuantity((q) => Math.min(100, q + 1))}
                className="w-10 h-10 rounded-lg border border-gray-300 hover:bg-gray-50 flex items-center justify-center font-semibold"
                disabled={quantity >= 100}
              >
                +
              </button>
            </div>
          </div>

          {/* Add to Cart Button */}
          <button
            onClick={handleAddToCart}
            disabled={addingToCart}
            className="btn-primary w-full py-4 text-lg mb-4"
          >
            {addingToCart ? "Adding..." : "Add to Cart"}
          </button>

          {/* Additional Actions */}
          <div className="mt-auto pt-6 border-t border-gray-200">
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                  <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
                </svg>
                Free Shipping
              </div>
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                Fast Delivery
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
