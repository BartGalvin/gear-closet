import { use } from 'react';
import { GearContext } from '../context/GearContext';

export function usePackedItems() {
  const context = use(GearContext);
  if (!context) {
    throw new Error('usePackedItems must be used within a GearProvider');
  }
  const {
    createPackedItem,
    addPackedItem,
    movePackedItem,
    updatePackedItem,
    deletePackedItem,
    getPackedItemsForCategory,
  } = context;


  return {
    createPackedItem,
    addPackedItem,
    movePackedItem,
    updatePackedItem,
    deletePackedItem,
    getPackedItemsForCategory,
  };
}

