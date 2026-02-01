"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { buildApiUrl, API_BASE_URL } from "../../../../lib/api";

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    price_cents: "",
    currency: "INR",
    category_id: "",
    is_active: true,
    main_image_url: "",
  });

  useEffect(() => {
    fetchCategories();
    fetchProduct();
  }, [productId]);

  const getAuthToken = () =>
    typeof window === "undefined" ? null : localStorage.getItem("access_token");

  const verifyAdminToken = () => {
    const token = getAuthToken();
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.roles?.includes("admin") && Date.now() < payload.exp * 1000;
    } catch {
      return false;
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch(buildApiUrl("/api/v1/categories"));
      if (res.ok) setCategories(await res.json());
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchProduct = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const res = await fetch(
        buildApiUrl(`/api/v1/admin/products/${productId}`),
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) throw new Error("Failed to fetch product");
      const product = await res.json();

      setFormData({
        name: product.name,
        slug: product.slug,
        description: product.description || "",
        price_cents: (product.price_cents / 100).toString(),
        currency: product.currency,
        category_id: product.category_id,
        is_active: product.is_active,
        main_image_url: product.main_image_url || "",
      });

      if (product.main_image_url) setImagePreview(product.main_image_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load product");
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData((p) => ({ ...p, name, slug: p.slug || generateSlug(name) }));
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((p) => ({
      ...p,
      [name]:
        type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : value,
    }));
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value === "other") {
      setShowNewCategory(true);
      setFormData((p) => ({ ...p, category_id: "" }));
    } else {
      setShowNewCategory(false);
      setFormData((p) => ({ ...p, category_id: e.target.value }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const uploadImage = async (file: File) => {
    setUploadingImage(true);
    try {
      const token = getAuthToken();
      if (!token) return null;

      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch(buildApiUrl("/api/v1/upload/image"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      if (!res.ok) throw new Error("Image upload failed");
      const data = await res.json();
      return `${API_BASE_URL}${data.url}`;
    } catch (err) {
      setError("Failed to upload image");
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (!verifyAdminToken()) {
        router.push("/admin-login");
        return;
      }

      let imageUrl = formData.main_image_url;
      if (imageFile) {
        const uploaded = await uploadImage(imageFile);
        if (!uploaded) return;
        imageUrl = uploaded;
      }

      const payload = {
        ...formData,
        price_cents: Math.round(Number(formData.price_cents) * 100),
        main_image_url: imageUrl || null,
      };

      const token = getAuthToken();
      const res = await fetch(
        buildApiUrl(`/api/v1/admin/products/${productId}`),
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) throw new Error("Failed to update product");
      router.push("/admin/products");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !formData.name) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin h-10 w-10 border-b-2 border-primary-500 rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-full overflow-x-hidden">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row gap-4 sm:justify-between sm:items-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Edit Product</h1>
        <Link href="/admin/products" className="text-sm text-gray-600">
          ← Back to Products
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded mb-6">
          {error}
        </div>
      )}

      {/* FORM */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow p-4 sm:p-6 space-y-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <input
            className="form-input"
            placeholder="Product name"
            value={formData.name}
            onChange={handleNameChange}
          />

          <input
            className="form-input"
            placeholder="Slug"
            value={formData.slug}
            onChange={handleChange}
            name="slug"
          />

          <textarea
            className="form-input md:col-span-2"
            placeholder="Description"
            value={formData.description}
            onChange={handleChange}
            name="description"
          />

          <select
            className="form-input"
            value={showNewCategory ? "other" : formData.category_id}
            onChange={handleCategoryChange}
          >
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            <option value="other">Create new</option>
          </select>

          <input
            className="form-input"
            type="number"
            placeholder="Price"
            value={formData.price_cents}
            onChange={handleChange}
            name="price_cents"
          />

          <input type="file" onChange={handleImageChange} />

          {imagePreview && (
            <img
              src={imagePreview}
              className="w-28 h-28 object-cover rounded border"
            />
          )}
        </div>

        {/* ACTIONS */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t">
          <Link
            href="/admin/products"
            className="px-4 py-2 border rounded text-center"
          >
            Cancel
          </Link>
          <button
            disabled={loading || uploadingImage}
            className="btn-primary"
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
