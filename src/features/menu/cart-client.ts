"use client";

import { useEffect, useMemo, useState } from "react";
import { effectiveOnlinePrice, type CartItem, type Product } from "../../types";

function getCartStorageKey(tenantSlug: string) {
  return `kendisepetim:cart:${tenantSlug}`;
}

function sanitizeCartItems(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => item as Partial<CartItem>)
    .filter(
      (item) =>
        typeof item.lineId === "string" &&
        typeof item.productId === "string" &&
        typeof item.name === "string" &&
        typeof item.price === "number" &&
        Number.isFinite(item.price) &&
        typeof item.quantity === "number" &&
        Number.isFinite(item.quantity) &&
        item.quantity > 0,
    )
    .map((item) => ({
      lineId: item.lineId as string,
      productId: item.productId as string,
      name: item.name as string,
      price: item.price as number,
      quantity: Math.floor(item.quantity as number),
      removedIngredients: Array.isArray(item.removedIngredients)
        ? item.removedIngredients.filter((v): v is string => typeof v === "string")
        : [],
      addedIngredients: Array.isArray(item.addedIngredients)
        ? item.addedIngredients.filter((v): v is string => typeof v === "string")
        : [],
      itemNote: typeof item.itemNote === "string" ? item.itemNote : null,
    }));
}

function buildLineId(
  productId: string,
  removedIngredients: string[],
  addedIngredients: string[],
  itemNote: string,
): string {
  const normalize = (value: string) => value.trim().toLowerCase();
  const removed = [...removedIngredients].map(normalize).filter(Boolean).sort().join("|");
  const added = [...addedIngredients].map(normalize).filter(Boolean).sort().join("|");
  const note = normalize(itemNote);
  return [productId, removed, added, note].join("::");
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

  function addToCart(
    product: Product,
    options?: {
      removedIngredients?: string[];
      addedIngredients?: string[];
      itemNote?: string;
    },
  ) {
    const removedIngredients = (options?.removedIngredients ?? []).filter(Boolean);
    const addedIngredients = (options?.addedIngredients ?? []).filter(Boolean);
    const itemNote = (options?.itemNote ?? "").trim();
    const lineId = buildLineId(product.id, removedIngredients, addedIngredients, itemNote);

    setCartItems((prev) => {
      const found = prev.find((item) => item.lineId === lineId);
      if (!found) {
        return [
          ...prev,
          {
            lineId,
            productId: product.id,
            name: product.name,
            price: effectiveOnlinePrice(product),
            quantity: 1,
            removedIngredients,
            addedIngredients,
            itemNote: itemNote || null,
          },
        ];
      }
      return prev.map((item) =>
        item.lineId === lineId ? { ...item, quantity: item.quantity + 1 } : item,
      );
    });
  }

  function updateQuantity(lineId: string, quantity: number) {
    if (quantity <= 0) {
      setCartItems((prev) => prev.filter((item) => item.lineId !== lineId));
      return;
    }
    setCartItems((prev) =>
      prev.map((item) => (item.lineId === lineId ? { ...item, quantity } : item)),
    );
  }

  function removeFromCart(lineId: string) {
    setCartItems((prev) => prev.filter((item) => item.lineId !== lineId));
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
