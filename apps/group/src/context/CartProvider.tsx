'use client';

import type { CartResponse } from '@kia./shared';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '@/context/AuthProvider';
import { api, ApiError } from '@/lib/api';

interface CartContextValue {
  cart: CartResponse | null;
  itemCount: number;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  addCourse: (slug: string) => Promise<CartResponse>;
  removeItem: (id: string) => Promise<void>;
  clear: () => Promise<void>;
}

const emptyCart = (): CartResponse => ({
  id: '',
  items: [],
  itemCount: 0,
  subtotalCents: 0,
  discountCents: 0,
  totalCents: 0,
  currency: 'irr',
  updatedAt: new Date(0).toISOString(),
});

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setCart(null);
      setError('');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const next = await api.getCart();
      setCart(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load cart');
      setCart(null);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setCart(null);
      setError('');
      return;
    }
    void refresh();
  }, [authLoading, isAuthenticated, refresh]);

  const addCourse = useCallback(
    async (slug: string) => {
      const next = await api.addToCart(slug);
      setCart(next);
      setError('');
      return next;
    },
    [],
  );

  const removeItem = useCallback(async (id: string) => {
    const next = await api.removeCartItem(id);
    setCart(next);
    setError('');
  }, []);

  const clear = useCallback(async () => {
    const next = await api.clearCart();
    setCart(next);
    setError('');
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      itemCount: cart?.itemCount ?? 0,
      loading,
      error,
      refresh,
      addCourse,
      removeItem,
      clear,
    }),
    [cart, loading, error, refresh, addCourse, removeItem, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}

export function useCartOptional() {
  return useContext(CartContext);
}

/** Safe empty cart helper for UI when cart has not loaded yet. */
export function getCartOrEmpty(cart: CartResponse | null): CartResponse {
  return cart ?? emptyCart();
}
