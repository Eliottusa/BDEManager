import { getRequestConfig } from 'next-intl/server';
import fr from '../../messages/fr.json';
import en from '../../messages/en.json';

const messages = { fr, en };

export default getRequestConfig(async ({ locale }) => {
  // Ensure locale is valid, fallback to 'fr'
  const validLocale = locale && messages[locale as keyof typeof messages] ? locale : 'fr';
  return {
    locale: validLocale,
    messages: messages[validLocale as keyof typeof messages],
  };
});
