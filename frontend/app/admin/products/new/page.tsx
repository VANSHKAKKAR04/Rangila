"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { buildApiUrl, API_BASE_URL } from "../../../../lib/api";

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    price_cents: "",
    currency: "INR",
    category_id: "",
    is_active: true,
    main_image_url: "",
    initial_stock: "0",
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

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

  const createCategory = async () => {
    if (!newCategoryName.trim()) return;
    setCreatingCategory(true);
    try {
      const token = getAuthToken();
      if (!token) return;

      const res = await fetch(buildApiUrl("/api/v1/admin/categories"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newCategoryName.trim(),
          slug: generateSlug(newCategoryName),
        }),
      });

      if (!res.ok) throw new Error();
      const cat = await res.json();
      setCategories((p) => [...p, cat]);
      setFormData((p) => ({ ...p, category_id: cat.id }));
      setShowNewCategory(false);
      setNewCategoryName("");
    } finally {
      setCreatingCategory(false);
    }
  };

  const processImageFile = (file: File) => {
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

      if (!res.ok) throw new Error();
      const data = await res.json();
      return `${API_BASE_URL}${data.url}`;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

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
        initial_stock: Number(formData.initial_stock),
        main_image_url: imageUrl || null,
      };

      const token = getAuthToken();
      const res = await fetch(buildApiUrl("/api/v1/admin/products"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error();
      router.push("/admin/products");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-full overflow-x-hidden">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row gap-4 sm:justify-between sm:items-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">
          Create New Product
        </h1>
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
            name="slug"
            value={formData.slug}
            onChange={handleChange}
          />

          <textarea
            className="form-input md:col-span-2"
            placeholder="Description"
            name="description"
            value={formData.description}
            onChange={handleChange}
          />

          <input
            className="form-input"
            type="number"
            placeholder="Price"
            name="price_cents"
            value={formData.price_cents}
            onChange={handleChange}
          />

          <input
            className="form-input"
            type="number"
            placeholder="Initial Stock"
            name="initial_stock"
            value={formData.initial_stock}
            onChange={handleChange}
          />

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
          <button disabled={loading} className="btn-primary">
            {loading ? "Creating..." : "Create Product"}
          </button>
        </div>
      </form>
    </div>
  );
}
