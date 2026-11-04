import { createContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export interface CartLine {
  productId: string;
  variantId: string;
  quantity: number;
}

export interface CartPromotion {
  couponCode: string | null;
  freeSampleId: string | null;
}

export interface ShopContextValue {
  cart: CartLine[];
  cartCount: number;
  addToCart: (line: CartLine, maxQuantity: number) => void;
  setCartQuantity: (productId: string, variantId: string, quantity: number, maxQuantity: number) => void;
  removeFromCart: (productId: string, variantId: string) => void;
  clearCart: () => void;
  /** Items parked for a later purchase ("save for later"). They do not count towards the cart total. */
  savedForLater: CartLine[];
  saveForLater: (productId: string, variantId: string) => void;
  moveSavedToCart: (productId: string, variantId: string, maxQuantity: number) => void;
  removeSaved: (productId: string, variantId: string) => void;
  promotion: CartPromotion;
  setCouponCode: (code: string | null) => void;
  setFreeSampleId: (id: string | null) => void;
  wishlist: string[];
  isWishlisted: (productId: string) => boolean;
  toggleWishlist: (productId: string) => void;
}

export const ShopContext = createContext<ShopContextValue | null>(null);

const CART_KEY = 'nova-cart';
const WISHLIST_KEY = 'nova-wishlist';
const PROMOTION_KEY = 'nova-promotion';
const SAVED_KEY = 'nova-saved-for-later';
const EMPTY_PROMOTION: CartPromotion = { couponCode: null, freeSampleId: null };

function readStorage<T>(key: string, isValid: (value: unknown) => value is T, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return isValid(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function isCartLine(value: unknown): value is CartLine {
  if (typeof value !== 'object' || value === null) return false;
  const line = value as Record<string, unknown>;
  return (
    typeof line.productId === 'string' &&
    typeof line.variantId === 'string' &&
    typeof line.quantity === 'number' &&
    Number.isInteger(line.quantity) &&
    line.quantity > 0
  );
}

const isCart = (value: unknown): value is CartLine[] => Array.isArray(value) && value.every(isCartLine);
const isPromotion = (value: unknown): value is CartPromotion => {
  if (typeof value !== 'object' || value === null) return false;
  const promotion = value as Record<string, unknown>;
  return (
    (promotion.couponCode === null || typeof promotion.couponCode === 'string') &&
    (promotion.freeSampleId === null || typeof promotion.freeSampleId === 'string')
  );
};
const isStringList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

const clampQuantity = (quantity: number, max: number) => Math.max(1, Math.min(quantity, max));

export function ShopProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartLine[]>(() => readStorage(CART_KEY, isCart, []));
  const [wishlist, setWishlist] = useState<string[]>(() => readStorage(WISHLIST_KEY, isStringList, []));
  const [savedForLater, setSavedForLater] = useState<CartLine[]>(() => readStorage(SAVED_KEY, isCart, []));
  const [promotion, setPromotion] = useState<CartPromotion>(() => readStorage(PROMOTION_KEY, isPromotion, EMPTY_PROMOTION));

  useEffect(() => {
    window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    window.localStorage.setItem(PROMOTION_KEY, JSON.stringify(promotion));
  }, [promotion]);

  useEffect(() => {
    window.localStorage.setItem(SAVED_KEY, JSON.stringify(savedForLater));
  }, [savedForLater]);

  useEffect(() => {
    window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist));
  }, [wishlist]);

  const value = useMemo<ShopContextValue>(() => {
    const sameLine = (line: CartLine, productId: string, variantId: string) =>
      line.productId === productId && line.variantId === variantId;

    return {
      cart,
      cartCount: cart.reduce((sum, line) => sum + line.quantity, 0),
      addToCart: (line, maxQuantity) => {
        setCart((current) => {
          const existing = current.find((item) => sameLine(item, line.productId, line.variantId));
          if (!existing) {
            return [...current, { ...line, quantity: clampQuantity(line.quantity, maxQuantity) }];
          }
          return current.map((item) =>
            sameLine(item, line.productId, line.variantId)
              ? { ...item, quantity: clampQuantity(item.quantity + line.quantity, maxQuantity) }
              : item
          );
        });
      },
      setCartQuantity: (productId, variantId, quantity, maxQuantity) => {
        setCart((current) =>
          current.map((item) =>
            sameLine(item, productId, variantId)
              ? { ...item, quantity: clampQuantity(quantity, maxQuantity) }
              : item
          )
        );
      },
      removeFromCart: (productId, variantId) => {
        setCart((current) => current.filter((item) => !sameLine(item, productId, variantId)));
      },
      clearCart: () => {
        setCart([]);
        setPromotion(EMPTY_PROMOTION);
      },
      savedForLater,
      saveForLater: (productId, variantId) => {
        const line = cart.find((item) => sameLine(item, productId, variantId));
        if (!line) return;
        setCart((current) => current.filter((item) => !sameLine(item, productId, variantId)));
        setSavedForLater((current) => {
          const existing = current.find((item) => sameLine(item, productId, variantId));
          if (!existing) return [...current, line];
          return current.map((item) => (sameLine(item, productId, variantId) ? { ...item, quantity: item.quantity + line.quantity } : item));
        });
      },
      moveSavedToCart: (productId, variantId, maxQuantity) => {
        const line = savedForLater.find((item) => sameLine(item, productId, variantId));
        if (!line || maxQuantity < 1) return;
        setSavedForLater((current) => current.filter((item) => !sameLine(item, productId, variantId)));
        setCart((current) => {
          const existing = current.find((item) => sameLine(item, productId, variantId));
          if (!existing) return [...current, { ...line, quantity: clampQuantity(line.quantity, maxQuantity) }];
          return current.map((item) =>
            sameLine(item, productId, variantId) ? { ...item, quantity: clampQuantity(item.quantity + line.quantity, maxQuantity) } : item,
          );
        });
      },
      removeSaved: (productId, variantId) => {
        setSavedForLater((current) => current.filter((item) => !sameLine(item, productId, variantId)));
      },
      promotion,
      setCouponCode: (code) => setPromotion((current) => ({ ...current, couponCode: code })),
      setFreeSampleId: (id) => setPromotion((current) => ({ ...current, freeSampleId: id })),
      wishlist,
      isWishlisted: (productId) => wishlist.includes(productId),
      toggleWishlist: (productId) => {
        setWishlist((current) =>
          current.includes(productId)
            ? current.filter((id) => id !== productId)
            : [...current, productId]
        );
      },
    };
  }, [cart, wishlist, promotion, savedForLater]);

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}
