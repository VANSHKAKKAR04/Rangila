"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { buildApiUrl } from "../../../lib/api";

interface Product {
  id: string;
  name: string;
  slug: string;
  price_cents: number;
  currency: string;
  is_active: boolean;
  category_name: string;
  variants: Array<{
    id: string;
    name: string;
    sku: string;
    stock_on_hand: number;
  }>;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchProducts();
  }, []);

  const getAuthToken = () => {
    return localStorage.getItem("access_token");
  };

  const fetchProducts = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(buildApiUrl("/api/v1/admin/products"), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch products");
      }

      const data = await response.json();
      setProducts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (productId: string, currentStatus: boolean) => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(buildApiUrl(`/api/v1/admin/products/${productId}`), {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ is_active: !currentStatus }),
      });

      if (response.ok) {
        fetchProducts();
      }
    } catch (err) {
      console.error("Failed to update product:", err);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm("Are you sure you want to delete this product? This will deactivate it.")) {
      return;
    }

    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(buildApiUrl(`/api/v1/admin/products/${productId}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        fetchProducts();
      } else {
        const error = await response.json().catch(() => ({
          detail: "Failed to delete product",
        }));
        alert(error.detail || "Failed to delete product");
      }
    } catch (err) {
      console.error("Failed to delete product:", err);
      alert("Failed to delete product");
    }
  };

  const formatPrice = (cents: number) => {
    return `₹${(cents / 100).toLocaleString("en-IN")}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-full overflow-x-hidden">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Products
        </h1>
        <Link href="/admin/products/new" className="btn-primary w-full sm:w-auto text-center">
          Add New Product
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* TABLE WRAPPER */}
      <div className="bg-white rounded-lg shadow-md overflow-x-auto">
        <table className="min-w-[900px] divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Variants
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-200">
            {products.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  No products found. Create your first product!
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {product.name}
                    </div>
                    <div className="text-sm text-gray-500 break-all">
                      {product.slug}
                    </div>
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-500">
                    {product.category_name}
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-900">
                    {formatPrice(product.price_cents)}
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-500">
                    {product.variants.length} variant
                    {product.variants.length !== 1 ? "s" : ""}
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        product.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {product.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-right text-sm font-medium">
                    <div className="flex flex-wrap justify-end gap-3">
                      <button
                        onClick={() =>
                          handleToggleActive(product.id, product.is_active)
                        }
                        className="text-primary-600 hover:text-primary-900"
                      >
                        {product.is_active ? "Deactivate" : "Activate"}
                      </button>

                      <Link
                        href={`/admin/products/${product.id}`}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        Edit
                      </Link>

                      <button
                        onClick={() => handleDelete(product.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
