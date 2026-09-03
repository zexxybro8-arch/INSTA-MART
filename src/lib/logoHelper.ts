import { Category, Subcategory } from '../types';

/**
  * Resolves the effective logo URL according to INSTA MART hierarchy rules:
  * 1. If child/subcategory has a custom logoUrl, use it.
  * 2. If child/subcategory logoUrl is empty/null, inherit parent category's logoUrl.
  * 3. If neither is set, return empty string (fallback to icon).
  */
export function getEffectiveLogoUrl(
  subcategory?: Subcategory | null,
  category?: Category | null
): string {
  const childLogo = subcategory?.logoUrl?.trim();
  if (childLogo) {
    return childLogo;
  }

  const parentLogo = category?.logoUrl?.trim();
  if (parentLogo) {
    return parentLogo;
  }

  return '';
}

/**
  * Gets the logo URL for a Category
  */
export function getCategoryLogoUrl(category?: Category | null): string {
  return category?.logoUrl?.trim() || '';
}

/**
  * Gets the effective logo URL for a Subcategory with parent inheritance
  */
export function getSubcategoryLogoUrl(
  subcategory?: Subcategory | null,
  parentCategory?: Category | null
): string {
  return getEffectiveLogoUrl(subcategory, parentCategory);
}

/**
  * Checks if a subcategory has overridden the parent category logo
  */
export function hasCustomSubcategoryLogo(subcategory?: Subcategory | null): boolean {
  return Boolean(subcategory?.logoUrl && subcategory.logoUrl.trim().length > 0);
}
