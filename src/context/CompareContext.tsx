import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

export const MAX_COMPARE = 4;
const COMPARE_KEY = 'nova-compare';

export type CompareToggleResult = 'added' | 'removed' | 'full';

export interface CompareContextValue {
  ids: string[];
  max: number;
  isFull: boolean;
  has: (productId: string) => boolean;
  toggle: (productId: string) => CompareToggleResult;
  remove: (productId: string) => void;
  clear: () => void;
  modalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

export const CompareContext = createContext<CompareContextValue | null>(null);

function readIds(): string[] {
  try {
    const raw = window.localStorage.getItem(COMPARE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string').slice(0, MAX_COMPARE);
  } catch {
    return [];
  }
}

export function CompareProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>(readIds);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(COMPARE_KEY, JSON.stringify(ids));
    } catch {
      // Storage can be unavailable (private mode); comparison still works for this visit.
    }
  }, [ids]);

  const openModal = useCallback(() => setModalOpen(true), []);
  const closeModal = useCallback(() => setModalOpen(false), []);

  const value = useMemo<CompareContextValue>(
    () => ({
      ids,
      max: MAX_COMPARE,
      isFull: ids.length >= MAX_COMPARE,
      has: (productId) => ids.includes(productId),
      toggle: (productId) => {
        if (ids.includes(productId)) {
          setIds((current) => current.filter((id) => id !== productId));
          return 'removed';
        }
        if (ids.length >= MAX_COMPARE) return 'full';
        setIds((current) => (current.length >= MAX_COMPARE || current.includes(productId) ? current : [...current, productId]));
        return 'added';
      },
      remove: (productId) => {
        setIds((current) => current.filter((id) => id !== productId));
      },
      clear: () => {
        setIds([]);
        setModalOpen(false);
      },
      modalOpen,
      openModal,
      closeModal,
    }),
    [ids, modalOpen, openModal, closeModal],
  );

  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}
