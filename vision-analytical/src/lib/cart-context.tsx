'use client';

import { useSyncExternalStore } from 'react';

export type CartItemKind = 'PRODUCT' | 'REFURBISHED';

export interface CartItem {
  kind: CartItemKind;
  id: string;
  slug: string;
  name: string;
  sku?: string;
  quantity: number;
}

const STORAGE_KEY = 'va-cart';
type Listener = () => void;

function readFromStorage(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

// Module-level store shared by every useCart() consumer - simpler than a
// Context provider, and useSyncExternalStore handles SSR/hydration for us.
const EMPTY_ITEMS: CartItem[] = [];
let items: CartItem[] = typeof window === 'undefined' ? EMPTY_ITEMS : readFromStorage();
const listeners = new Set<Listener>();

function emit(next: CartItem[]) {
  items = next;
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return items;
}

function getServerSnapshot(): CartItem[] {
  return EMPTY_ITEMS;
}

function addItem(item: Omit<CartItem, 'quantity'>, quantity = 1) {
  const existing = items.find((i) => i.id === item.id);
  emit(
    existing
      ? items.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + quantity } : i))
      : [...items, { ...item, quantity }],
  );
}

function removeItem(id: string) {
  emit(items.filter((i) => i.id !== id));
}

function updateQuantity(id: string, quantity: number) {
  emit(quantity <= 0 ? items.filter((i) => i.id !== id) : items.map((i) => (i.id === id ? { ...i, quantity } : i)));
}

function clear() {
  emit([]);
}

export function useCart() {
  const cartItems = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const count = cartItems.reduce((sum, i) => sum + i.quantity, 0);

  return { items: cartItems, addItem, removeItem, updateQuantity, clear, count };
}
