import { LEGAL_VERSION } from '@/content/legal';

export type LegalDocument = 'terms' | 'privacy';

export const LEGAL_ROUTES = {
  terms: '/legal/terms',
  privacy: '/legal/privacy',
} as const;

export function legalRoute(document: LegalDocument): (typeof LEGAL_ROUTES)[LegalDocument] {
  return LEGAL_ROUTES[document];
}

export function isAuthActionDisabled(agreed: boolean): boolean {
  return !agreed;
}

export function needsConsent(
  acceptedVersion: string | null | undefined,
  bundledVersion: string = LEGAL_VERSION,
): boolean {
  return acceptedVersion !== bundledVersion;
}

export function hasAcceptedCurrentVersion(
  acceptedVersion: string | null | undefined,
  bundledVersion: string = LEGAL_VERSION,
): boolean {
  return !needsConsent(acceptedVersion, bundledVersion);
}
