import type { AppEdition } from '../types';

const configuredEdition = typeof import.meta.env.VITE_EDITION === 'string'
  ? import.meta.env.VITE_EDITION.trim().toLowerCase()
  : 'community';

/**
 * The renderer receives its edition at build time.  Keep the default safe so
 * a normal checkout always produces the Community edition unless the Pro
 * build script explicitly opts in.
 */
export const BUILD_EDITION: AppEdition = configuredEdition === 'pro' ? 'pro' : 'community';
export const IS_PRO_EDITION = BUILD_EDITION === 'pro';

export function getEditionLabel(edition: AppEdition = BUILD_EDITION): string {
  return edition === 'pro' ? 'Pro' : 'Community';
}
