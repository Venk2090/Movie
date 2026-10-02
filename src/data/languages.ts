import { LanguageCode, LanguageInfo } from '../types';

export const SUPPORTED_LANGUAGES: Record<LanguageCode, LanguageInfo> = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    direction: 'ltr',
    defaultVoice: 'af_heart',
    flag: '🇺🇸'
  },
  es: {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    direction: 'ltr',
    defaultVoice: 'es_alvaro',
    flag: '🇪🇸'
  },
  pt: {
    code: 'pt',
    name: 'Portuguese',
    nativeName: 'Português',
    direction: 'ltr',
    defaultVoice: 'pt_camila',
    flag: '🇧🇷'
  },
  fr: {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    direction: 'ltr',
    defaultVoice: 'fr_pierre',
    flag: '🇫🇷'
  },
  te: {
    code: 'te',
    name: 'Telugu',
    nativeName: 'తెలుగు',
    direction: 'ltr',
    defaultVoice: 'te_ananya',
    flag: '🇮🇳'
  },
  kn: {
    code: 'kn',
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    direction: 'ltr',
    defaultVoice: 'kn_raghav',
    flag: '🇮🇳'
  },
  ml: {
    code: 'ml',
    name: 'Malayalam',
    nativeName: 'മലയാളം',
    direction: 'ltr',
    defaultVoice: 'ml_anoop',
    flag: '🇮🇳'
  },
  hi: {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    direction: 'ltr',
    defaultVoice: 'hi_aarav',
    flag: '🇮🇳'
  },
  bn: {
    code: 'bn',
    name: 'Bengali',
    nativeName: 'বাংলা',
    direction: 'ltr',
    defaultVoice: 'bn_sourav',
    flag: '🇧🇩'
  },
  gu: {
    code: 'gu',
    name: 'Gujarati',
    nativeName: 'ગુજરાતી',
    direction: 'ltr',
    defaultVoice: 'gu_kartik',
    flag: '🇮🇳'
  },
  zh: {
    code: 'zh',
    name: 'Chinese',
    nativeName: '简体中文',
    direction: 'ltr',
    defaultVoice: 'zh_xiaoyan',
    flag: '🇨🇳'
  },
  ru: {
    code: 'ru',
    name: 'Russian',
    nativeName: 'Русский',
    direction: 'ltr',
    defaultVoice: 'ru_dmitri',
    flag: '🇷🇺'
  }
};

export const INITIAL_11_LANGUAGES: LanguageCode[] = [
  'en', 'es', 'pt', 'fr', 'te', 'kn', 'ml', 'hi', 'bn', 'gu', 'zh', 'ru'
];
