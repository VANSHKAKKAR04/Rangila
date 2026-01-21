"use client";

import ProtectedRoute from "../components/ProtectedRoute";
import { useCart } from "../contexts/CartContext";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Toast from "../components/Toast";

function CartContent() {
  const { cart, loading, updateCartItem, removeCartItem } = useCart();
  const [updating, setUpdating] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const router = useRouter();

  const formatPrice = (cents: number) => {
    return `₹${(cents / 100).toLocaleString("en-IN")}`;
  };

  const handleQuantityChange = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    setUpdating(itemId);
    const success = await updateCartItem(itemId, newQuantity);
    if (!success) {
      setToast({ message: "Failed to update quantity", type: "error" });
    }
    setUpdating(null);
  };

  const handleRemove = async (itemId: string) => {
    if (!confirm("Remove this item from cart?")) return;
    
    setRemoving(itemId);
    const success = await removeCartItem(itemId);
    if (success) {
      setToast({ message: "Item removed from cart", type: "success" });
    } else {
      setToast({ message: "Failed to remove item", type: "error" });
    }
    setRemoving(null);
  };

  if (loading) {
    return (
      <section className="py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading cart...</p>
        </div>
      </section>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <section className="py-12">
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
        
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-12 text-center">
          <div className="text-8xl mb-6">🛒</div>
          <h2 className="text-3xl font-bold mb-4 text-gray-900">Your cart is empty</h2>
          <p className="text-gray-600 mb-8 text-lg">Add some amazing gifts to get started!</p>
          <Link href="/products" className="btn-primary inline-block">
            Browse Products
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

      <div className="mb-6">
        <h1 className="text-4xl font-bold text-gray-900">Your Cart</h1>
        <p className="text-gray-600 mt-2">
          {cart.item_count} {cart.item_count === 1 ? "item" : "items"} in your cart
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {cart.items.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Product Image - Blank if not available */}
                <div className="w-full sm:w-32 h-32 rounded-lg flex-shrink-0 bg-white border border-gray-200">
                  {/* Image would go here if available - leave blank as requested */}
                </div>

                {/* Product Details */}
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-1">
                    {item.product_name}
                  </h3>
                  {item.variant_name && (
                    <p className="text-gray-600 text-sm mb-3">{item.variant_name}</p>
                  )}
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-xl font-bold text-primary-600">
                      {formatPrice(item.price_cents)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {item.stock_available > 0 ? (
                        <span className="text-green-600">In Stock</span>
                      ) : (
                        <span className="text-red-600">Out of Stock</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quantity Controls */}
                <div className="flex flex-col items-end justify-between">
                  <button
                    onClick={() => handleRemove(item.id)}
                    disabled={removing === item.id}
                    className="text-red-500 hover:text-red-700 p-2 disabled:opacity-50"
                    aria-label="Remove item"
                  >
                    {removing === item.id ? (
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                      disabled={item.quantity <= 1 || updating === item.id}
                      className="w-8 h-8 rounded-lg border border-gray-300 hover:bg-gray-50 flex items-center justify-center font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      −
                    </button>
                    <span className="w-12 text-center font-semibold">
                      {updating === item.id ? (
                        <svg className="animate-spin h-5 w-5 mx-auto" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        item.quantity
                      )}
                    </span>
                    <button
                      onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                      disabled={updating === item.id || item.quantity >= 100}
                      className="w-8 h-8 rounded-lg border border-gray-300 hover:bg-gray-50 flex items-center justify-center font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      +
                    </button>
                  </div>
                  <div className="text-sm text-gray-600 mt-2">
                    Subtotal: <span className="font-semibold">{formatPrice(item.price_cents * item.quantity)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-md p-6 sticky top-24">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Order Summary</h2>
            
            <div className="space-y-4 mb-6">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal ({cart.item_count} items)</span>
                <span className="font-semibold">{formatPrice(cart.total_cents)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span className="font-semibold">Free</span>
              </div>
              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between text-xl font-bold text-gray-900">
                  <span>Total</span>
                  <span className="text-primary-600">{formatPrice(cart.total_cents)}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => router.push("/checkout")}
              className="btn-primary w-full py-4 text-lg mb-4"
            >
              Proceed to Checkout
            </button>

            <Link
              href="/products"
              className="block text-center text-primary-600 hover:text-primary-700 font-medium"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function CartPage() {
  return (
    <ProtectedRoute>
      <CartContent />
    </ProtectedRoute>
  );
}
