"use client";

import { useEffect, useMemo, useState } from "react";
import type { CartItem, Product } from "../../types";

function getCartStorageKey(tenantSlug: string) {
  return `kendisepetim:cart:${tenantSlug}`;
}

function sanitizeCartItems(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => item as Partial<CartItem>)
    .filter(
      (item) =>
        typeof item.productId === "string" &&
        typeof item.name === "string" &&
        typeof item.price === "number" &&
        Number.isFinite(item.price) &&
        typeof item.quantity === "number" &&
        Number.isFinite(item.quantity) &&
        item.quantity > 0,
    )
    .map((item) => ({
      productId: item.productId as string,
      name: item.name as string,
      price: item.price as number,
      quantity: Math.floor(item.quantity as number),
    }));
}

export function useTenantCart(tenantSlug: string) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const key = getCartStorageKey(tenantSlug);
    const raw = window.localStorage.getItem(key);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      setCartItems(sanitizeCartItems(parsed));
    } catch {
      window.localStorage.removeItem(key);
    }
  }, [tenantSlug]);

  useEffect(() => {
    const key = getCartStorageKey(tenantSlug);
    window.localStorage.setItem(key, JSON.stringify(cartItems));
  }, [tenantSlug, cartItems]);

  const totalQuantity = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems],
  );
  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems],
  );

  function addToCart(product: Product) {
    setCartItems((prev) => {
      const found = prev.find((item) => item.productId === product.id);
      if (!found) {
        return [
          ...prev,
          {
            productId: product.id,
            name: product.name,
            price: product.price,
            quantity: 1,
          },
        ];
      }
      return prev.map((item) =>
        item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item,
      );
    });
  }

  function updateQuantity(productId: string, quantity: number) {
    if (quantity <= 0) {
      setCartItems((prev) => prev.filter((item) => item.productId !== productId));
      return;
    }
    setCartItems((prev) =>
      prev.map((item) => (item.productId === productId ? { ...item, quantity } : item)),
    );
  }

  function removeFromCart(productId: string) {
    setCartItems((prev) => prev.filter((item) => item.productId !== productId));
  }

  function clearCart() {
    setCartItems([]);
  }

  return {
    cartItems,
    totalQuantity,
    subtotal,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
  };
}

export function formatTry(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
  }).format(value);
}
