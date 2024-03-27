import enJson from '../../i18n/en.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    resources: { translation: typeof enJson };
  }
}
