"use client";

import { useEffect, useState } from "react";
import { buildApiUrl } from "../../../lib/api";

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", slug: "" });

  useEffect(() => {
    fetchCategories();
  }, []);

  const getAuthToken = () => {
    return localStorage.getItem("access_token");
  };

  const fetchCategories = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(buildApiUrl("/api/v1/admin/categories"), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch categories");
      }

      const data = await response.json();
      setCategories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(buildApiUrl("/api/v1/admin/categories"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowCreateForm(false);
        setFormData({ name: "", slug: "" });
        fetchCategories();
      } else {
        const errorData = await response.json().catch(() => ({ detail: "Failed to create category" }));
        alert(errorData.detail || "Failed to create category");
      }
    } catch (err) {
      console.error("Failed to create category:", err);
      alert("Failed to create category");
    }
  };

  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    setFormData({ name: category.name, slug: category.slug });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;

    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(buildApiUrl(`/api/v1/admin/categories/${editingId}`), {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setEditingId(null);
        setFormData({ name: "", slug: "" });
        fetchCategories();
      } else {
        const errorData = await response.json().catch(() => ({ detail: "Failed to update category" }));
        alert(errorData.detail || "Failed to update category");
      }
    } catch (err) {
      console.error("Failed to update category:", err);
      alert("Failed to update category");
    }
  };

  const handleDelete = async (categoryId: string) => {
    if (!confirm("Are you sure you want to delete this category? This will fail if there are products in this category.")) {
      return;
    }

    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(buildApiUrl(`/api/v1/admin/categories/${categoryId}`), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchCategories();
      } else {
        const errorData = await response.json().catch(() => ({ detail: "Failed to delete category" }));
        alert(errorData.detail || "Failed to delete category");
      }
    } catch (err) {
      console.error("Failed to delete category:", err);
      alert("Failed to delete category");
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleNameChange = (name: string) => {
    setFormData({ name, slug: generateSlug(name) });
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
        <h1 className="text-3xl font-bold text-gray-900">Categories</h1>
        <button
          onClick={() => {
            setShowCreateForm(true);
            setEditingId(null);
            setFormData({ name: "", slug: "" });
          }}
          className="btn-primary"
        >
          Add New Category
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Create/Edit Form */}
      {(showCreateForm || editingId) && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingId ? "Edit Category" : "Create New Category"}
          </h2>
          <form onSubmit={editingId ? handleUpdate : handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Slug
              </label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                URL-friendly identifier (auto-generated from name)
              </p>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="btn-primary">
                {editingId ? "Update Category" : "Create Category"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingId(null);
                  setFormData({ name: "", slug: "" });
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Categories List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Slug
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {categories.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
                  No categories found. Create your first category!
                </td>
              </tr>
            ) : (
              categories.map((category) => (
                <tr key={category.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{category.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{category.slug}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => handleEdit(category)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(category.id)}
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
