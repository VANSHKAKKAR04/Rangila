"use client";

import { useState, useEffect } from "react";
import { buildApiUrl } from "../../../lib/api";

interface ThemeColors {
  primary_50: string;
  primary_100: string;
  primary_200: string;
  primary_300: string;
  primary_400: string;
  primary_500: string;
  primary_600: string;
  primary_700: string;
  primary_800: string;
  primary_900: string;
}

interface Theme {
  name: string;
  colors: ThemeColors;
  logo_url?: string;
}

interface ThemePreset {
  id: string;
  name: string;
  colors: ThemeColors;
}

export default function AdminThemePage() {
  const [currentTheme, setCurrentTheme] = useState<Theme | null>(null);
  const [presets, setPresets] = useState<ThemePreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    fetchCurrentTheme();
    fetchPresets();
  }, []);

  const getAuthToken = () => localStorage.getItem("access_token");

  const fetchCurrentTheme = async () => {
    try {
      const response = await fetch(buildApiUrl("/api/v1/admin/theme"), {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      if (response.ok) {
        const data = await response.json();
        setCurrentTheme(data);
        setLogoUrl(data.logo_url || "");
        setLogoPreview(data.logo_url || null);
      }
    } catch (err) {
      console.error("Failed to fetch theme:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPresets = async () => {
    try {
      const response = await fetch(buildApiUrl("/api/v1/admin/theme/presets"), {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      if (response.ok) {
        const data = await response.json();
        setPresets(data.presets || []);
      }
    } catch (err) {
      console.error("Failed to fetch presets:", err);
    }
  };

  const applyPreset = async (preset: ThemePreset) => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(buildApiUrl("/api/v1/admin/theme"), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({
          name: preset.name,
          colors: preset.colors,
          logo_url: logoUrl || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Failed to update theme" }));
        throw new Error(errorData.detail || "Failed to update theme");
      }

      const updatedTheme = await response.json();
      setCurrentTheme(updatedTheme);
      // Reload page to apply theme
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update theme");
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setError("Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("File size too large. Please upload an image smaller than 5MB.");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(buildApiUrl("/api/v1/upload/image"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Failed to upload image" }));
        throw new Error(errorData.detail || "Failed to upload image");
      }

      const data = await response.json();
      const uploadedUrl = buildApiUrl(data.url);
      
      // Update logo URL with the uploaded file URL
      setLogoUrl(uploadedUrl);
      setLogoPreview(uploadedUrl);
      
      // Automatically save the theme with the new logo
      await updateLogo(uploadedUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload logo");
    } finally {
      setUploading(false);
      // Reset file input
      event.target.value = "";
    }
  };

  const updateLogo = async (url?: string) => {
    const urlToUse = url || logoUrl;
    setSaving(true);
    setError(null);
    try {
      if (!currentTheme) return;

      const response = await fetch(buildApiUrl("/api/v1/admin/theme"), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({
          name: currentTheme.name,
          colors: currentTheme.colors,
          logo_url: urlToUse || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Failed to update logo" }));
        throw new Error(errorData.detail || "Failed to update logo");
      }

      const updatedTheme = await response.json();
      setCurrentTheme(updatedTheme);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update logo");
    } finally {
      setSaving(false);
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
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Theme Management</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Current Theme Display */}
      {currentTheme && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Current Theme: {currentTheme.name}</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(currentTheme.colors).map(([key, value]) => (
              <div key={key} className="flex items-center space-x-2">
                <div
                  className="w-12 h-12 rounded border border-gray-300"
                  style={{ backgroundColor: value }}
                ></div>
                <span className="text-sm text-gray-600">{key.replace("primary_", "")}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Logo Management */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Logo Management</h2>
        
        {/* Logo Preview */}
        {logoPreview && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">Current Logo Preview:</p>
            <div className="flex items-center space-x-4">
              <img
                src={logoPreview}
                alt="Logo preview"
                className="h-16 w-auto object-contain border border-gray-300 rounded"
                onError={() => setLogoPreview(null)}
              />
              <button
                onClick={() => {
                  setLogoUrl("");
                  setLogoPreview(null);
                }}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Remove
              </button>
            </div>
          </div>
        )}

        {/* Upload from Device */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Logo from Device
          </label>
          <div className="flex items-center gap-4">
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading || saving}
              />
              <span className="btn-secondary px-6 py-2 inline-block disabled:opacity-50">
                {uploading ? "Uploading..." : "Choose File"}
              </span>
            </label>
            {uploading && (
              <div className="flex items-center text-sm text-gray-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500 mr-2"></div>
                Uploading...
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Supported formats: JPEG, PNG, GIF, WebP (Max size: 5MB)
          </p>
        </div>

        {/* Or Enter URL */}
        <div className="border-t border-gray-200 pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Or Enter Logo URL
          </label>
          <div className="flex gap-4">
            <input
              type="text"
              value={logoUrl}
              onChange={(e) => {
                setLogoUrl(e.target.value);
                if (e.target.value) {
                  setLogoPreview(e.target.value);
                }
              }}
              placeholder="https://example.com/logo.png"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            />
            <button
              onClick={() => updateLogo()}
              disabled={saving || uploading}
              className="btn-primary px-6 py-2 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Update Logo"}
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Enter a URL to your logo image. The logo will be displayed in the navigation bar. If the image fails to load, the emoji 🎁 will be shown as fallback.
          </p>
        </div>
      </div>

      {/* Theme Presets */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Theme Presets</h2>
        <p className="text-gray-600 mb-6">Select a preset theme to apply instantly:</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {presets.map((preset) => (
            <div
              key={preset.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => applyPreset(preset)}
            >
              <h3 className="font-semibold text-lg mb-3">{preset.name}</h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {Object.entries(preset.colors)
                  .filter(([key]) => ["primary_500", "primary_600", "primary_700"].includes(key))
                  .map(([key, value]) => (
                    <div
                      key={key}
                      className="w-8 h-8 rounded border border-gray-300"
                      style={{ backgroundColor: value }}
                      title={key}
                    ></div>
                  ))}
              </div>
              <button
                className="w-full btn-primary py-2 text-sm"
                disabled={saving || currentTheme?.name === preset.name}
              >
                {saving ? "Applying..." : currentTheme?.name === preset.name ? "Active" : "Apply Theme"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
