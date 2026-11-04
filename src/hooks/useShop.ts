import { useContext } from 'react';
import { ShopContext } from '@/context/ShopContext';

export function useShop() {
  const context = useContext(ShopContext);
  if (!context) throw new Error('useShop must be used inside ShopProvider');
  return context;
}
