"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "../components/ProtectedRoute";
import Link from "next/link";
import { buildApiUrl } from "../../lib/api";

interface OrderItem {
  id: string;
  product_name: string;
  variant_name: string | null;
  sku: string;
  price_cents: number;
  quantity: number;
  currency: string;
}

interface ShippingAddress {
  name: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  total_cents: number;
  currency: string;
  payment_method: string; // "cod" or "razorpay"
  shipping_address: ShippingAddress | null;
  items: OrderItem[];
  created_at: string;
}

function OrdersContent() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const getAuthToken = () => {
    return localStorage.getItem("access_token");
  };

  const fetchOrders = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        router.push("/login");
        return;
      }

      const response = await fetch(buildApiUrl("/api/v1/orders?limit=50"), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.push("/login");
          return;
        }
        throw new Error("Failed to fetch orders");
      }

      const data = await response.json();
      setOrders(data.items || []);
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (cents: number) => {
    return `₹${(cents / 100).toLocaleString("en-IN")}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-blue-100 text-blue-800",
    processing: "bg-purple-100 text-purple-800",
    out_for_delivery: "bg-indigo-100 text-indigo-800",
    delivered: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
    refunded: "bg-gray-100 text-gray-800",
  };

  const statusLabels: Record<string, string> = {
    pending: "Pending",
    confirmed: "Confirmed",
    processing: "Processing",
    out_for_delivery: "Out for Delivery",
    delivered: "Delivered",
    cancelled: "Cancelled",
    refunded: "Refunded",
  };

  const canCancelOrder = (orderStatus: string): boolean => {
    return orderStatus !== "out_for_delivery" && 
           orderStatus !== "delivered" && 
           orderStatus !== "cancelled";
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm("Are you sure you want to cancel this order?")) {
      return;
    }

    setCancelling(orderId);
    try {
      const token = getAuthToken();
      if (!token) {
        router.push("/login");
        return;
      }

      const response = await fetch(buildApiUrl(`/api/v1/orders/${orderId}/cancel`), {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Failed to cancel order" }));
        console.error("Failed to cancel order:", errorData.detail || "Unknown error");
        setCancelling(null);
        return;
      }

      // Get the updated order from response
      const cancelledOrder = await response.json();
      
      // Optimistically update orders list immediately
      setOrders((prevOrders) =>
        prevOrders.map((order) => (order.id === orderId ? cancelledOrder : order))
      );
      
      // Update selected order if it was the cancelled one
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(cancelledOrder);
      }
    } catch (err) {
      console.error("Failed to cancel order:", err);
      // Silently fail - the status will be correct on next refresh
    } finally {
      setCancelling(null);
    }
  };

  if (loading) {
    return (
      <section className="py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading orders...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 text-gray-900">My Orders</h1>
        <p className="text-gray-600">View all your past and current orders</p>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <div className="text-6xl mb-4">📦</div>
          <h2 className="text-2xl font-bold mb-2 text-gray-900">No orders yet</h2>
          <p className="text-gray-600 mb-6">Start shopping to see your orders here!</p>
          <Link href="/products" className="btn-primary inline-block">
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Orders List */}
          <div className="lg:col-span-2">
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className={`bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer ${
                    selectedOrder?.id === order.id ? "ring-2 ring-primary-500" : ""
                  }`}
                  onClick={() => setSelectedOrder(order)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Order #{order.order_number}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Placed on {formatDate(order.created_at)}
                      </p>
                    </div>
                    <span
                      className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                        statusColors[order.status] || "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {statusLabels[order.status] || order.status}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-600">
                        {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                      </p>
                      <p className="text-lg font-bold text-primary-600 mt-1">
                        {formatPrice(order.total_cents)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedOrder(order);
                      }}
                      className="text-primary-600 hover:text-primary-700 font-medium"
                    >
                      View Details →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Details */}
          <div className="lg:col-span-1">
            {selectedOrder ? (
              <div className="bg-white rounded-xl shadow-md p-6 sticky top-24">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Details</h2>

                <div className="space-y-4 mb-6">
                  <div>
                    <p className="text-sm text-gray-600">Order Number</p>
                    <p className="font-medium">{selectedOrder.order_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <span
                      className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full mt-1 ${
                        statusColors[selectedOrder.status] || "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {statusLabels[selectedOrder.status] || selectedOrder.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Order Date</p>
                    <p className="font-medium">{formatDate(selectedOrder.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Amount</p>
                    <p className="font-medium text-lg text-primary-600">
                      {formatPrice(selectedOrder.total_cents)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Payment Method</p>
                    <p className="font-medium">
                      {selectedOrder.payment_method === "razorpay" ? (
                        <span className="text-blue-600">💳 Online Payment (Razorpay)</span>
                      ) : (
                        <span className="text-green-600">💰 Cash on Delivery</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Delivery Address */}
                {selectedOrder.shipping_address && (
                  <div className="border-t pt-4 mb-6">
                    <h3 className="font-semibold mb-3 text-gray-900">Delivery Address</h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-1 text-sm">
                      <p className="font-medium text-gray-900">
                        {selectedOrder.shipping_address.name}
                      </p>
                      <p className="text-gray-700">{selectedOrder.shipping_address.address_line1}</p>
                      {selectedOrder.shipping_address.address_line2 && (
                        <p className="text-gray-700">{selectedOrder.shipping_address.address_line2}</p>
                      )}
                      <p className="text-gray-700">
                        {selectedOrder.shipping_address.city}, {selectedOrder.shipping_address.state}{" "}
                        {selectedOrder.shipping_address.postal_code}
                      </p>
                      <p className="text-gray-700">{selectedOrder.shipping_address.country}</p>
                    </div>
                  </div>
                )}

                {/* Order Items */}
                <div className="border-t pt-4 mb-4">
                  <h3 className="font-semibold mb-3 text-gray-900">Items</h3>
                  <div className="space-y-3">
                    {selectedOrder.items.map((item) => (
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
                </div>

                {/* Cancel Order Button */}
                {canCancelOrder(selectedOrder.status) && (
                  <div className="border-t pt-4">
                    <button
                      onClick={() => handleCancelOrder(selectedOrder.id)}
                      disabled={cancelling === selectedOrder.id}
                      className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      {cancelling === selectedOrder.id ? (
                        <span className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Cancelling...
                        </span>
                      ) : (
                        "Cancel Order"
                      )}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-6">
                <p className="text-gray-500 text-center">Select an order to view details</p>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default function OrdersPage() {
  return (
    <ProtectedRoute>
      <OrdersContent />
    </ProtectedRoute>
  );
}
