// Material categories and subcategories for device classification

export const MATERIAL_CATEGORIES = [
  'SURGICAL INSTRUMENTS',
  'IMPLANTS', 
  'FLUIDS & MEDICINES',
  'DISPOSABLES',
  'OR INVENTORY',
  'SUTURES'
] as const;

export const MATERIAL_SUBCATEGORIES = {
  'DISPOSABLES': [
    'OTHER DISPOSABLES',
    'DRAPING',
    'PREP',
    'STAPLERS',
    'WOUND CARE'
  ],
  'OR INVENTORY': [
    'POSITIONING MATERIALS',
    'CARTS CADDYS LOCKERS',
    'ACCESSORIES',
    'OTHER'
  ]
} as const;

export type MaterialCategory = typeof MATERIAL_CATEGORIES[number];
export type MaterialSubcategory = typeof MATERIAL_SUBCATEGORIES[keyof typeof MATERIAL_SUBCATEGORIES][number];

export function getSubcategoriesForCategory(category: string): readonly string[] {
  if (category === 'DISPOSABLES') {
    return MATERIAL_SUBCATEGORIES.DISPOSABLES;
  }
  if (category === 'OR INVENTORY') {
    return MATERIAL_SUBCATEGORIES['OR INVENTORY'];
  }
  return [];
}

export function hasSubcategories(category: string): boolean {
  return category === 'DISPOSABLES' || category === 'OR INVENTORY';
}