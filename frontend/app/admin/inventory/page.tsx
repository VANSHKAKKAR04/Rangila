"use client";

import { useEffect, useState } from "react";
import { buildApiUrl } from "../../../lib/api";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface InventoryItem {
  product_id: string;
  product_name: string;
  product_slug: string;
  category_id: string;
  category_name: string;
  stock_available: number;
}

export default function AdminInventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newStock, setNewStock] = useState<number>(0);

  useEffect(() => {
    fetchCategories();
    fetchInventory();
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [selectedCategoryId]);

  const getAuthToken = () => {
    return localStorage.getItem("access_token");
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(buildApiUrl("/api/v1/categories"));
      if (response.ok) {
        const data = await response.json();
        setCategories(data || []);
      }
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    }
  };

  const fetchInventory = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      let url = buildApiUrl("/api/v1/admin/inventory");
      if (selectedCategoryId) {
        url += `?category_id=${selectedCategoryId}`;
      }

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch inventory");
      }

      const data = await response.json();
      setInventory(data);
    } catch (err) {
      console.error("Failed to fetch inventory:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStock = async (productId: string) => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(buildApiUrl(`/api/v1/admin/inventory/${productId}`), {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ stock_available: newStock }),
      });

      if (response.ok) {
        setEditingId(null);
        fetchInventory();
      } else {
        const errorData = await response.json().catch(() => ({ detail: "Failed to update stock" }));
        alert(errorData.detail || "Failed to update stock");
      }
    } catch (err) {
      console.error("Failed to update stock:", err);
      alert("Failed to update stock");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Filter by Category:</label>
          <select
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Slug
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Available Stock
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {inventory.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  No inventory records found.
                </td>
              </tr>
            ) : (
              inventory.map((item) => (
                <tr
                  key={item.product_id}
                  className={`hover:bg-gray-50 ${
                    item.stock_available < 10 ? "bg-orange-50" : ""
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{item.product_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{item.category_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{item.product_slug}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingId === item.product_id ? (
                      <input
                        type="number"
                        value={newStock}
                        onChange={(e) => setNewStock(parseInt(e.target.value) || 0)}
                        className="w-32 px-3 py-2 border border-gray-300 rounded-lg"
                        min="0"
                        autoFocus
                      />
                    ) : (
                      <span
                        className={`text-sm font-medium ${
                          item.stock_available < 10
                            ? "text-orange-600 font-bold"
                            : item.stock_available < 50
                            ? "text-yellow-600"
                            : "text-green-600"
                        }`}
                      >
                        {item.stock_available}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {editingId === item.product_id ? (
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleUpdateStock(item.product_id)}
                          className="text-green-600 hover:text-green-900 font-semibold"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingId(item.product_id);
                          setNewStock(item.stock_available);
                        }}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        Update
                      </button>
                    )}
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
