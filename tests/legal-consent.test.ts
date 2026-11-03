import { describe, expect, it } from 'vitest';

import { LEGAL_VERSION } from '@/content/legal';
import { PRIVACY_VERSION } from '@/content/privacy';
import { TERMS_VERSION } from '@/content/terms';
import {
  LEGAL_ROUTES,
  hasAcceptedCurrentVersion,
  isAuthActionDisabled,
  legalRoute,
  needsConsent,
} from '@/features/legal/consent';

describe('legal consent gate', () => {
  it('bundles both documents at the shared legal version', () => {
    expect(TERMS_VERSION).toBe(LEGAL_VERSION);
    expect(PRIVACY_VERSION).toBe(LEGAL_VERSION);
  });

  it('disables auth actions until the checkbox is checked', () => {
    expect(isAuthActionDisabled(false)).toBe(true);
    expect(isAuthActionDisabled(true)).toBe(false);
  });

  it('routes the consent links to the legal screens', () => {
    expect(legalRoute('terms')).toBe('/legal/terms');
    expect(legalRoute('privacy')).toBe('/legal/privacy');
    expect(LEGAL_ROUTES).toEqual({
      terms: '/legal/terms',
      privacy: '/legal/privacy',
    });
  });

  it('re-shows the gate when the bundled version changes', () => {
    expect(needsConsent('2026-11-03', '2026-11-03')).toBe(false);
    expect(hasAcceptedCurrentVersion('2026-11-03', '2026-11-03')).toBe(true);
    expect(needsConsent('2026-11-03', '2027-01-01')).toBe(true);
    expect(hasAcceptedCurrentVersion('2026-11-03', '2027-01-01')).toBe(false);
    expect(needsConsent(null, '2026-11-03')).toBe(true);
  });
});
