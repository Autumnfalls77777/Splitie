import { LegalDocumentScreen } from '@/components/legal/LegalDocumentScreen';
import {
  TERMS_EFFECTIVE_DATE,
  TERMS_LAST_UPDATED,
  TERMS_TEXT,
  TERMS_TITLE,
  TERMS_VERSION,
} from '@/content/terms';

export default function TermsScreen() {
  return (
    <LegalDocumentScreen
      title={TERMS_TITLE}
      version={TERMS_VERSION}
      effectiveDate={TERMS_EFFECTIVE_DATE}
      lastUpdated={TERMS_LAST_UPDATED}
      text={TERMS_TEXT}
    />
  );
}
