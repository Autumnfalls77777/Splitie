import { LegalDocumentScreen } from '@/components/legal/LegalDocumentScreen';
import {
  PRIVACY_EFFECTIVE_DATE,
  PRIVACY_LAST_UPDATED,
  PRIVACY_TEXT,
  PRIVACY_TITLE,
  PRIVACY_VERSION,
} from '@/content/privacy';

export default function PrivacyScreen() {
  return (
    <LegalDocumentScreen
      title={PRIVACY_TITLE}
      version={PRIVACY_VERSION}
      effectiveDate={PRIVACY_EFFECTIVE_DATE}
      lastUpdated={PRIVACY_LAST_UPDATED}
      text={PRIVACY_TEXT}
    />
  );
}
