"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

interface CartItem {
  id: string;
  variant_id: string;
  product_name: string;
  variant_name: string;
  price_cents: number;
  quantity: number;
  currency: string;
  stock_available: number;
}

interface Cart {
  id: string;
  item_count: number;
  total_cents: number;
  currency: string;
  items: CartItem[];
}

interface CartContextType {
  cart: Cart | null;
  loading: boolean;
  refreshCart: () => Promise<void>;
  addToCart: (variantId: string, quantity: number) => Promise<boolean>;
  updateCartItem: (itemId: string, quantity: number) => Promise<boolean>;
  removeCartItem: (itemId: string) => Promise<boolean>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);

  const getAuthToken = () => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("access_token");
  };

  const refreshCart = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setCart(null);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("http://localhost:8000/api/v1/cart", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCart(data);
      } else if (response.status === 401) {
        // Not logged in
        setCart(null);
      }
    } catch (error) {
      console.error("Failed to fetch cart:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const addToCart = useCallback(async (variantId: string, quantity: number): Promise<boolean> => {
    const token = getAuthToken();
    if (!token) {
      // Redirect to login
      window.location.href = `/login?return=${encodeURIComponent(window.location.pathname)}`;
      return false;
    }

    try {
      const response = await fetch("http://localhost:8000/api/v1/cart/items", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          variant_id: variantId,
          quantity,
        }),
      });

      if (response.ok) {
        await refreshCart();
        return true;
      } else {
        const error = await response.json().catch(() => ({ detail: "Failed to add item" }));
        alert(error.detail || "Failed to add item to cart");
        return false;
      }
    } catch (error) {
      console.error("Failed to add to cart:", error);
      alert("Failed to add item to cart");
      return false;
    }
  }, [refreshCart]);

  const updateCartItem = useCallback(async (itemId: string, quantity: number): Promise<boolean> => {
    const token = getAuthToken();
    if (!token) return false;

    try {
      const response = await fetch(`http://localhost:8000/api/v1/cart/items/${itemId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ quantity }),
      });

      if (response.ok) {
        await refreshCart();
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to update cart item:", error);
      return false;
    }
  }, [refreshCart]);

  const removeCartItem = useCallback(async (itemId: string): Promise<boolean> => {
    const token = getAuthToken();
    if (!token) return false;

    try {
      const response = await fetch(`http://localhost:8000/api/v1/cart/items/${itemId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await refreshCart();
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to remove cart item:", error);
      return false;
    }
  }, [refreshCart]);

  // Load cart on mount and when auth changes
  useEffect(() => {
    refreshCart();
    
    // Listen for storage changes (logout/login in other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "access_token" || e.key === null) {
        refreshCart();
      }
    };
    
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [refreshCart]);

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        refreshCart,
        addToCart,
        updateCartItem,
        removeCartItem,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
