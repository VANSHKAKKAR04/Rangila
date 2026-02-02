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
  const [imagePreview, setImagePreview] = useState<string>("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const getAuthToken = (): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("access_token");
  };

  const verifyAdminToken = (): boolean => {
    const token = getAuthToken();
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const roles: string[] = payload.roles || [];
      
      // Check if token is expired
      const exp = payload.exp;
      if (exp && Date.now() >= exp * 1000) {
        return false;
      }
      
      return roles.includes("admin");
    } catch (error) {
      console.error("Token verification failed:", error);
      return false;
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(buildApiUrl("/api/v1/categories"));
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : type === "number" ? parseFloat(value) || 0 : value,
    }));
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === "other") {
      setShowNewCategory(true);
      setFormData((prev) => ({ ...prev, category_id: "" }));
    } else {
      setShowNewCategory(false);
      setFormData((prev) => ({ ...prev, category_id: value }));
    }
  };

  const createCategory = async () => {
    if (!newCategoryName.trim()) {
      setError("Category name is required");
      return;
    }

    try {
      setCreatingCategory(true);
      const token = getAuthToken();
      if (!token) {
        setError("Not authenticated");
        return;
      }

      const slug = generateSlug(newCategoryName);
      const response = await fetch(buildApiUrl("/api/v1/admin/categories"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newCategoryName.trim(),
          slug: slug,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Failed to create category" }));
        throw new Error(errorData.detail || "Failed to create category");
      }

      const newCategory = await response.json();
      setCategories((prev) => [...prev, newCategory]);
      setFormData((prev) => ({ ...prev, category_id: newCategory.id }));
      setShowNewCategory(false);
      setNewCategoryName("");
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create category");
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData((prev) => ({
      ...prev,
      name,
      slug: prev.slug || generateSlug(name),
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const processImageFile = (file: File) => {
    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setError("Please select a valid image file (JPEG, PNG, GIF, or WebP)");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5MB");
      return;
    }

    setImageFile(file);
    setError("");

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const startCamera = async () => {
    try {
      // Try to get camera access - will use default camera (webcam on PC, back camera preference on mobile)
      // First try environment (back camera on mobile), then fallback to user (front camera/webcam)
      let stream: MediaStream | null = null;
      
      try {
        // Try back camera first (for mobile devices)
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
      } catch (envError) {
        // Fallback to user-facing camera (webcam on PC, front camera on mobile)
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "user" },
          });
        } catch (userError) {
          // Final fallback: use default camera (no facingMode specified)
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
          });
        }
      }
      
      if (stream) {
        setCameraStream(stream);
        setShowCamera(true);
        setError("");
      } else {
        throw new Error("Could not access camera");
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Unable to access camera. Please check permissions or use file upload instead.");
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    const video = document.getElementById("camera-video") as HTMLVideoElement;
    if (!video || !cameraStream) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], "camera-capture.jpg", { type: "image/jpeg" });
          processImageFile(file);
          stopCamera();
        }
      },
      "image/jpeg",
      0.9
    );
  };

  // Set video source when camera stream is available
  useEffect(() => {
    if (showCamera && cameraStream) {
      const video = document.getElementById("camera-video") as HTMLVideoElement;
      if (video) {
        video.srcObject = cameraStream;
      }
    }
  }, [showCamera, cameraStream]);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      setUploadingImage(true);
      
      // Verify admin access first
      if (!verifyAdminToken()) {
        setError("Authentication required. Please log in as admin.");
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        router.push("/admin-login");
        return null;
      }

      const token = getAuthToken();
      if (!token) {
        setError("Authentication required. Please log in again.");
        router.push("/admin-login");
        return null;
      }

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(buildApiUrl("/api/v1/upload/image"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          // Don't set Content-Type - browser will set it automatically with boundary for FormData
        },
        body: formData,
      });

      if (response.status === 401 || response.status === 403) {
        setError("Authentication expired or insufficient permissions. Please log in again.");
        // Clear invalid token
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        router.push("/admin-login");
        return null;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Failed to upload image" }));
        throw new Error(errorData.detail || `Failed to upload image (${response.status})`);
      }

      const data = await response.json();
      // Return full URL
      return `${API_BASE_URL}${data.url}`;
    } catch (err) {
      console.error("Image upload error:", err);
      if (err instanceof TypeError && err.message.includes("fetch")) {
        setError("Network error. Please check your connection.");
      } else {
        setError(err instanceof Error ? err.message : "Failed to upload image");
      }
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Verify admin access before proceeding
      if (!verifyAdminToken()) {
        setError("Authentication required. Please log in as admin.");
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        router.push("/admin-login");
        return;
      }

      const token = getAuthToken();
      if (!token) {
        setError("Not authenticated");
        router.push("/admin-login");
        return;
      }

      // Upload image if provided
      let imageUrl = formData.main_image_url || null;
      if (imageFile) {
        const uploadedUrl = await uploadImage(imageFile);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        } else {
          setLoading(false);
          return; // Error already set in uploadImage
        }
      }

      // Convert price to cents
      const priceCents = Math.round(parseFloat(formData.price_cents) * 100);

      if (!formData.category_id) {
        setError("Please select or create a category");
        setLoading(false);
        return;
      }

      const payload = {
        name: formData.name,
        slug: formData.slug,
        description: formData.description || null,
        price_cents: priceCents,
        currency: formData.currency,
        category_id: formData.category_id,
        is_active: formData.is_active,
        main_image_url: imageUrl,
        initial_stock: parseInt(formData.initial_stock) || 0,
      };

      const response = await fetch(buildApiUrl("/api/v1/admin/products"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Failed to create product" }));
        throw new Error(errorData.detail || "Failed to create product");
      }

      // Redirect to products list
      router.push("/admin/products");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Create New Product</h1>
        <Link href="/admin/products" className="text-gray-600 hover:text-gray-900">
          ← Back to Products
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="form-group">
            <label htmlFor="name" className="form-label">
              Product Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleNameChange}
              required
              className="form-input"
              placeholder="Enter product name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="slug" className="form-label">
              Slug *
            </label>
            <input
              type="text"
              id="slug"
              name="slug"
              value={formData.slug}
              onChange={handleChange}
              required
              className="form-input"
              placeholder="product-slug"
            />
          </div>

          <div className="form-group md:col-span-2">
            <label htmlFor="description" className="form-label">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="form-input"
              placeholder="Enter product description"
            />
          </div>

          <div className="form-group">
            <label htmlFor="category_id" className="form-label">
              Category *
            </label>
            {loadingCategories ? (
              <div className="form-input">Loading categories...</div>
            ) : (
              <div className="space-y-2">
                <select
                  id="category_id"
                  name="category_id"
                  value={showNewCategory ? "other" : formData.category_id}
                  onChange={handleCategoryChange}
                  required
                  className="form-input"
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                  <option value="other">Other (Create New Category)</option>
                </select>
                {showNewCategory && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Enter new category name"
                      className="form-input flex-1"
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          createCategory();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={createCategory}
                      disabled={creatingCategory || !newCategoryName.trim()}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {creatingCategory ? "Creating..." : "Create"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewCategory(false);
                        setNewCategoryName("");
                        setFormData((prev) => ({ ...prev, category_id: "" }));
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="price_cents" className="form-label">
              Price (₹) *
            </label>
            <input
              type="number"
              id="price_cents"
              name="price_cents"
              value={formData.price_cents}
              onChange={handleChange}
              required
              min="0"
              step="0.01"
              className="form-input"
              placeholder="999.00"
            />
            <p className="text-xs text-gray-500 mt-1">Price will be stored in cents (₹1 = 100 cents)</p>
          </div>

          <div className="form-group">
            <label htmlFor="currency" className="form-label">
              Currency
            </label>
            <select
              id="currency"
              name="currency"
              value={formData.currency}
              onChange={handleChange}
              className="form-input"
            >
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="initial_stock" className="form-label">
              Initial Stock Quantity *
            </label>
            <input
              type="number"
              id="initial_stock"
              name="initial_stock"
              value={formData.initial_stock}
              onChange={handleChange}
              required
              min="0"
              className="form-input"
              placeholder="0"
            />
            <p className="text-xs text-gray-500 mt-1">Initial stock quantity when creating this product</p>
          </div>

          <div className="form-group md:col-span-2">
            <label htmlFor="image" className="form-label">
              Product Image
            </label>
            <div className="space-y-4">
              {/* Camera Capture Button */}
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Take Photo</span>
                </button>
                <label className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors cursor-pointer flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span>Upload from Device</span>
                  <input
                    type="file"
                    id="image"
                    name="image"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Camera Preview */}
              {showCamera && cameraStream && (
                <div className="relative bg-black rounded-lg overflow-hidden">
                  <video
                    id="camera-video"
                    autoPlay
                    playsInline
                    className="w-full max-w-md mx-auto"
                    style={{ maxHeight: "400px" }}
                  />
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-4">
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="px-6 py-3 bg-white rounded-full hover:bg-gray-100 transition-colors shadow-lg"
                      aria-label="Capture photo"
                    >
                      <svg className="w-8 h-8 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="px-6 py-3 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors shadow-lg"
                      aria-label="Close camera"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {/* Image Preview */}
              {imagePreview && !showCamera && (
                <div className="mt-2">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-32 h-32 object-cover rounded-lg border border-gray-300"
                  />
                </div>
              )}
              {uploadingImage && (
                <p className="text-sm text-gray-500">Uploading image...</p>
              )}
              <p className="text-xs text-gray-500">
                Take a photo with your camera or upload an image from your device (JPEG, PNG, GIF, or WebP, max 5MB)
              </p>
            </div>
          </div>

          <div className="form-group md:col-span-2">
            <label htmlFor="main_image_url" className="form-label">
              Or provide Image URL (optional)
            </label>
            <input
              type="url"
              id="main_image_url"
              name="main_image_url"
              value={formData.main_image_url}
              onChange={handleChange}
              className="form-input"
              placeholder="https://example.com/image.jpg"
            />
            <p className="text-xs text-gray-500 mt-1">
              If you provide both, uploaded image will be used
            </p>
          </div>

          <div className="form-group md:col-span-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-gray-700">Active (visible to customers)</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end space-x-4 pt-4 border-t">
          <Link
            href="/admin/products"
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
          >
            {loading ? "Creating..." : "Create Product"}
          </button>
        </div>
      </form>
    </div>
  );
}
