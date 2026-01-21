"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "../components/ProtectedRoute";
import { useCart } from "../contexts/CartContext";
import Toast from "../components/Toast";
import { buildApiUrl } from "../../lib/api";

declare global {
  interface Window {
    Razorpay: any;
  }
}

function CheckoutContent() {
  const router = useRouter();
  const { cart, loading: cartLoading, refreshCart } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"razorpay" | "cod">("razorpay");
  const razorpayLoaded = useRef(false);

  const [formData, setFormData] = useState({
    name: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "India",
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Load Razorpay script
  useEffect(() => {
    if (!razorpayLoaded.current && paymentMethod === "razorpay") {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => {
        razorpayLoaded.current = true;
      };
      document.body.appendChild(script);
      return () => {
        document.body.removeChild(script);
      };
    }
  }, [paymentMethod]);

  useEffect(() => {
    if (!cartLoading && (!cart || cart.items.length === 0)) {
      router.push("/cart");
    }
  }, [cart, cartLoading, router]);

  const getAuthToken = () => {
    return localStorage.getItem("access_token");
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.address_line1.trim()) {
      newErrors.address_line1 = "Address line 1 is required";
    }

    if (!formData.city.trim()) {
      newErrors.city = "City is required";
    }

    if (!formData.state.trim()) {
      newErrors.state = "State is required";
    }

    if (!formData.postal_code.trim()) {
      newErrors.postal_code = "Postal code is required";
    }

    if (!formData.country.trim()) {
      newErrors.country = "Country is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handlePaymentMethodChange = (method: "razorpay" | "cod") => {
    setPaymentMethod(method);
  };

  const processRazorpayPayment = async (orderId: string) => {
    if (!razorpayLoaded.current || !window.Razorpay) {
      throw new Error("Razorpay SDK not loaded. Please try again.");
    }

    const token = getAuthToken();
    if (!token) {
      router.push("/login");
      return;
    }

    // Create Razorpay order
    const razorpayResponse = await fetch(buildApiUrl("/api/v1/payments/create-razorpay-order"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        order_id: orderId,
        amount_cents: cart!.total_cents,
        currency: "INR",
      }),
    });

    if (!razorpayResponse.ok) {
      const errorData = await razorpayResponse.json().catch(() => ({ detail: "Failed to create payment order" }));
      throw new Error(errorData.detail || "Failed to create payment order");
    }

    const razorpayOrder = await razorpayResponse.json();

    // Open Razorpay checkout
    return new Promise<void>((resolve, reject) => {
      const options = {
        key: razorpayOrder.key_id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: "Rangila Gift Shop",
        description: `Order ${razorpayOrder.order_id}`,
        order_id: razorpayOrder.razorpay_order_id,
        handler: async function (response: any) {
          try {
            // Verify payment
            const verifyResponse = await fetch(buildApiUrl("/api/v1/payments/verify"), {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                order_id: orderId,
              }),
            });

            if (!verifyResponse.ok) {
              const errorData = await verifyResponse.json().catch(() => ({ detail: "Payment verification failed" }));
              throw new Error(errorData.detail || "Payment verification failed");
            }

            const verifyData = await verifyResponse.json();
            if (verifyData.success) {
              resolve();
            } else {
              reject(new Error("Payment verification failed"));
            }
          } catch (error) {
            reject(error);
          }
        },
        prefill: {
          name: formData.name,
          email: "", // You can add email field if available
          contact: "", // You can add phone field if available
        },
        theme: {
          color: "#f97316", // Primary color
        },
        modal: {
          ondismiss: function() {
            reject(new Error("Payment cancelled by user"));
          },
        },
      };

      const razorpayInstance = new window.Razorpay(options);
      razorpayInstance.on("payment.failed", function (response: any) {
        reject(new Error(`Payment failed: ${response.error.description || "Unknown error"}`));
      });
      razorpayInstance.open();
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      setToast({ message: "Please fill in all required fields", type: "error" });
      return;
    }

    if (!cart || cart.items.length === 0) {
      setToast({ message: "Your cart is empty", type: "error" });
      return;
    }

    setSubmitting(true);
    try {
      const token = getAuthToken();
      if (!token) {
        router.push("/login");
        return;
      }

      // Step 1: Create order
      const orderResponse = await fetch(buildApiUrl("/api/v1/orders"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shipping_address: {
            name: formData.name,
            address_line1: formData.address_line1,
            address_line2: formData.address_line2 || null,
            city: formData.city,
            state: formData.state,
            postal_code: formData.postal_code,
            country: formData.country,
          },
          payment_method: paymentMethod, // Send payment method to backend
        }),
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json().catch(() => ({ detail: "Failed to place order" }));
        throw new Error(errorData.detail || "Failed to place order");
      }

      const orderData = await orderResponse.json();

      // Step 2: Handle payment based on method
      if (paymentMethod === "razorpay") {
        try {
          await processRazorpayPayment(orderData.id);
          // Payment successful - refresh cart and redirect
          await refreshCart();
          router.push(`/?order_success=${orderData.order_number}`);
        } catch (paymentError) {
          // Payment failed or cancelled
          setToast({
            message: paymentError instanceof Error ? paymentError.message : "Payment failed. Please try again.",
            type: "error",
          });
          // Order is created but payment failed - user can retry payment later
          // You might want to redirect to an order page with retry option
        }
      } else {
        // COD - order is already created and confirmed
        await refreshCart();
        router.push(`/?order_success=${orderData.order_number}`);
      }
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : "Failed to place order. Please try again.",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatPrice = (cents: number) => {
    return `₹${(cents / 100).toLocaleString("en-IN")}`;
  };

  if (cartLoading) {
    return (
      <section className="py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading checkout...</p>
        </div>
      </section>
    );
  }

  if (!cart || cart.items.length === 0) {
    return null; // Will redirect
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

      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 text-gray-900">Checkout</h1>
        <p className="text-gray-600 text-sm sm:text-base">Complete your order below</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Checkout Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Shipping Address */}
            <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-900">Shipping Address</h2>
              
              <div className="space-y-4">
                <div className="form-group">
                  <label htmlFor="name" className="form-label">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className={`form-input ${errors.name ? "border-red-500" : ""}`}
                    placeholder="John Doe"
                  />
                  {errors.name && (
                    <p className="text-red-600 text-sm mt-1">{errors.name}</p>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="address_line1" className="form-label">
                    Address Line 1 *
                  </label>
                  <input
                    type="text"
                    id="address_line1"
                    name="address_line1"
                    value={formData.address_line1}
                    onChange={handleChange}
                    required
                    className={`form-input ${errors.address_line1 ? "border-red-500" : ""}`}
                    placeholder="House/Building number, Street"
                  />
                  {errors.address_line1 && (
                    <p className="text-red-600 text-sm mt-1">{errors.address_line1}</p>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="address_line2" className="form-label">
                    Address Line 2 (Optional)
                  </label>
                  <input
                    type="text"
                    id="address_line2"
                    name="address_line2"
                    value={formData.address_line2}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Apartment, Suite, etc."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-group">
                    <label htmlFor="city" className="form-label">
                      City *
                    </label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      required
                      className={`form-input ${errors.city ? "border-red-500" : ""}`}
                      placeholder="Mumbai"
                    />
                    {errors.city && (
                      <p className="text-red-600 text-sm mt-1">{errors.city}</p>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="state" className="form-label">
                      State *
                    </label>
                    <input
                      type="text"
                      id="state"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      required
                      className={`form-input ${errors.state ? "border-red-500" : ""}`}
                      placeholder="Maharashtra"
                    />
                    {errors.state && (
                      <p className="text-red-600 text-sm mt-1">{errors.state}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-group">
                    <label htmlFor="postal_code" className="form-label">
                      Postal Code *
                    </label>
                    <input
                      type="text"
                      id="postal_code"
                      name="postal_code"
                      value={formData.postal_code}
                      onChange={handleChange}
                      required
                      className={`form-input ${errors.postal_code ? "border-red-500" : ""}`}
                      placeholder="400001"
                    />
                    {errors.postal_code && (
                      <p className="text-red-600 text-sm mt-1">{errors.postal_code}</p>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="country" className="form-label">
                      Country *
                    </label>
                    <input
                      type="text"
                      id="country"
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      required
                      className={`form-input ${errors.country ? "border-red-500" : ""}`}
                      placeholder="India"
                    />
                    {errors.country && (
                      <p className="text-red-600 text-sm mt-1">{errors.country}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-2xl font-bold mb-6 text-gray-900">Payment Method</h2>
              
              <div className="space-y-4">
                {/* Razorpay Option */}
                <div
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    paymentMethod === "razorpay"
                      ? "border-primary-500 bg-primary-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => handlePaymentMethodChange("razorpay")}
                >
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      id="razorpay"
                      name="payment_method"
                      value="razorpay"
                      checked={paymentMethod === "razorpay"}
                      onChange={() => handlePaymentMethodChange("razorpay")}
                      className="w-5 h-5 text-primary-600 border-gray-300 focus:ring-primary-500"
                    />
                    <label htmlFor="razorpay" className="flex-1 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-gray-900">Pay Online (Razorpay)</span>
                          <p className="text-sm text-gray-600 mt-1">
                            Secure payment via cards, UPI, wallets, and more
                          </p>
                        </div>
                        <div className="text-2xl">💳</div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* COD Option */}
                <div
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    paymentMethod === "cod"
                      ? "border-primary-500 bg-primary-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => handlePaymentMethodChange("cod")}
                >
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      id="cod"
                      name="payment_method"
                      value="cod"
                      checked={paymentMethod === "cod"}
                      onChange={() => handlePaymentMethodChange("cod")}
                      className="w-5 h-5 text-primary-600 border-gray-300 focus:ring-primary-500"
                    />
                    <label htmlFor="cod" className="flex-1 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-gray-900">Cash on Delivery</span>
                          <p className="text-sm text-gray-600 mt-1">
                            Pay when you receive your order
                          </p>
                        </div>
                        <div className="text-2xl">💰</div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={submitting}
              >
                Back to Cart
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary px-8 py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {paymentMethod === "razorpay" ? "Processing..." : "Placing Order..."}
                  </span>
                ) : (
                  paymentMethod === "razorpay" ? "Pay Now" : "Place Order"
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-md p-6 sticky top-24">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Order Summary</h2>
            
            {/* Cart Items */}
            <div className="space-y-4 mb-6">
              {cart.items.map((item) => (
                <div key={item.id} className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.product_name}</p>
                    {item.variant_name && (
                      <p className="text-sm text-gray-600">{item.variant_name}</p>
                    )}
                    <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {formatPrice(item.price_cents * item.quantity)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 pt-4 space-y-3">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span className="font-semibold">{formatPrice(cart.total_cents)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span className="font-semibold">Free</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tax</span>
                <span className="font-semibold">₹0</span>
              </div>
              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between text-xl font-bold text-gray-900">
                  <span>Total</span>
                  <span className="text-primary-600">{formatPrice(cart.total_cents)}</span>
                </div>
              </div>
            </div>

            {paymentMethod === "cod" && (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Cash on Delivery:</strong> Pay {formatPrice(cart.total_cents)} when your order arrives.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function CheckoutPage() {
  return (
    <ProtectedRoute>
      <CheckoutContent />
    </ProtectedRoute>
  );
}
