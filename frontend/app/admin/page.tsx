"use client";

import { useEffect, useState } from "react";
import { buildApiUrl } from "../../lib/api";

interface DashboardStats {
  totalProducts: number;
  totalOrders: number;
  totalUsers: number;
  lowStockItems: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const getAuthToken = () => {
    return localStorage.getItem("access_token");
  };

  const fetchDashboardStats = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      // Fetch products count
      const productsRes = await fetch(buildApiUrl("/api/v1/admin/products"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const products = await productsRes.json();

      // Fetch orders count
      const ordersRes = await fetch(buildApiUrl("/api/v1/admin/orders?limit=1"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const ordersData = await ordersRes.json();

      // Fetch users count
      const usersRes = await fetch(buildApiUrl("/api/v1/admin/users?limit=1"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const usersData = await usersRes.json();

      // Fetch inventory for low stock check
      const inventoryRes = await fetch(buildApiUrl("/api/v1/admin/inventory"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const inventory = await inventoryRes.json();
      const lowStock = inventory.filter(
        (inv: any) => inv.stock_available < 10
      ).length;

      setStats({
        totalProducts: products.length || 0,
        totalOrders: ordersData.total || 0,
        totalUsers: usersData.total || 0,
        lowStockItems: lowStock,
      });
    } catch (error) {
      console.error("Failed to fetch dashboard stats:", error);
    } finally {
      setLoading(false);
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
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard Overview</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total Products</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.totalProducts || 0}</p>
            </div>
            <div className="text-4xl">📦</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total Orders</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.totalOrders || 0}</p>
            </div>
            <div className="text-4xl">📝</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total Users</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.totalUsers || 0}</p>
            </div>
            <div className="text-4xl">👥</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Low Stock Items</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">
                {stats?.lowStockItems || 0}
              </p>
            </div>
            <div className="text-4xl">⚠️</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/admin/products"
            className="p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
          >
            <div className="text-2xl mb-2">➕</div>
            <div className="font-semibold">Add New Product</div>
            <div className="text-sm text-gray-600 mt-1">Create a new product listing</div>
          </a>

          <a
            href="/admin/orders"
            className="p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
          >
            <div className="text-2xl mb-2">📋</div>
            <div className="font-semibold">View Orders</div>
            <div className="text-sm text-gray-600 mt-1">Manage customer orders</div>
          </a>

          <a
            href="/admin/inventory"
            className="p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
          >
            <div className="text-2xl mb-2">📊</div>
            <div className="font-semibold">Manage Inventory</div>
            <div className="text-sm text-gray-600 mt-1">Update stock levels</div>
          </a>
        </div>
      </div>
    </div>
  );
}
