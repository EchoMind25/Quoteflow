/**
 * Theme Application Utility
 *
 * Generates and injects CSS custom properties from business primary_color and industry.
 * Call this function when:
 * - App loads (authenticated layout)
 * - Business settings change (color picker)
 * - Industry changes
 *
 * The color engine generates complete palettes that are injected as CSS variables,
 * making them available to Tailwind via the extended color config.
 */

import {
  generateCompletePalette,
  hexToRGB,
  type ColorScale,
  type SemanticColors,
} from './color-engine';
import type { Database } from '@/types/database';

type IndustryType = Database['public']['Enums']['industry_type'];

/**
 * Apply business theme to document root
 */
export function applyBusinessTheme(
  primaryColor: string,
  industry: IndustryType = 'general'
): void {
  // Generate complete palette
  const palette = generateCompletePalette(primaryColor, industry);

  // Get document root
  const root = document.documentElement;

  // Apply primary palette
  applyColorScale(root, 'primary', palette.primary);

  // Apply accent palette
  applyColorScale(root, 'accent', palette.accent);

  // Apply semantic colors
  applySemanticColors(root, 'success', palette.success);
  applySemanticColors(root, 'warning', palette.warning);
  applySemanticColors(root, 'danger', palette.danger);

  // Apply neutral palette
  applyColorScale(root, 'neutral', palette.neutral);

  // Apply primary RGB (for alpha transparency in shadows/glows)
  const primaryRGB = hexToRGB(primaryColor);
  root.style.setProperty('--primary-rgb', `${primaryRGB.r}, ${primaryRGB.g}, ${primaryRGB.b}`);
}

/**
 * Apply a color scale (50-950) to CSS custom properties
 */
function applyColorScale(
  element: HTMLElement,
  name: string,
  scale: ColorScale
): void {
  Object.entries(scale).forEach(([key, value]) => {
    element.style.setProperty(`--${name}-${key}`, value);
  });
}

/**
 * Apply semantic colors (base, light, dark) to CSS custom properties
 */
function applySemanticColors(
  element: HTMLElement,
  name: string,
  colors: SemanticColors
): void {
  element.style.setProperty(`--${name}-base`, colors.base);
  element.style.setProperty(`--${name}-light`, colors.light);
  element.style.setProperty(`--${name}-dark`, colors.dark);
}

/**
 * Reset theme to default (blue brand color)
 */
export function resetTheme(): void {
  applyBusinessTheme('#3b82f6', 'general');
}

/**
 * Get computed color value from CSS variable
 */
export function getThemeColor(variable: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(variable)
    .trim();
}

/**
 * Check if theme is currently applied
 */
export function isThemeApplied(): boolean {
  const primary = getThemeColor('--primary-500');
  return primary !== '';
}

/**
 * React hook for applying theme (use in app layout)
 */
export function useBusinessTheme(
  primaryColor?: string | null,
  industry?: IndustryType | null
): void {
  if (typeof window === 'undefined') return;

  if (primaryColor && industry) {
    applyBusinessTheme(primaryColor, industry);
  }
}

/**
 * Generate theme CSS for server-side rendering
 * Returns inline <style> tag content
 */
export function generateThemeCSS(
  primaryColor: string,
  industry: IndustryType = 'general'
): string {
  const palette = generateCompletePalette(primaryColor, industry);

  const css: string[] = [':root {'];

  // Primary palette
  Object.entries(palette.primary).forEach(([key, value]) => {
    css.push(`  --primary-${key}: ${value};`);
  });

  // Accent palette
  Object.entries(palette.accent).forEach(([key, value]) => {
    css.push(`  --accent-${key}: ${value};`);
  });

  // Semantics
  css.push(`  --success-base: ${palette.success.base};`);
  css.push(`  --success-light: ${palette.success.light};`);
  css.push(`  --success-dark: ${palette.success.dark};`);
  css.push(`  --warning-base: ${palette.warning.base};`);
  css.push(`  --warning-light: ${palette.warning.light};`);
  css.push(`  --warning-dark: ${palette.warning.dark};`);
  css.push(`  --danger-base: ${palette.danger.base};`);
  css.push(`  --danger-light: ${palette.danger.light};`);
  css.push(`  --danger-dark: ${palette.danger.dark};`);

  // Neutrals
  Object.entries(palette.neutral).forEach(([key, value]) => {
    css.push(`  --neutral-${key}: ${value};`);
  });

  // Primary RGB
  const primaryRGB = hexToRGB(primaryColor);
  css.push(`  --primary-rgb: ${primaryRGB.r}, ${primaryRGB.g}, ${primaryRGB.b};`);

  css.push('}');

  return css.join('\n');
}
