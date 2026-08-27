import { ChecklistItem } from '../types';

export function getRequiredPhotoTotal(items: ChecklistItem[]): number {
  return items.filter(item => item.active && item.type === 'FOTO').reduce((sum, item) => sum + item.requiredCount, 0);
}
