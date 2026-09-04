import i18next, { applyConfigTranslations } from '../js/i18nextInit';
import { DeploymentConfigWithOverrides } from '../js/types/appConfigTypes';

const configWithOverrides = {
  translation_overrides: {
    en: { control: { 'feedback-modal': { sure: 'Absolutely!' } } },
  },
} as unknown as DeploymentConfigWithOverrides;

describe('applyConfigTranslations', () => {
  afterEach(() => applyConfigTranslations(null));

  it('overrides a built-in string with the one from the config', () => {
    applyConfigTranslations(configWithOverrides);
    expect(i18next.t('control.feedback-modal.sure')).toBe('Absolutely!');
  });

  it('leaves keys that the config does not mention alone', () => {
    applyConfigTranslations(configWithOverrides);
    expect(i18next.t('control.feedback-modal.no-thanks')).toBe('No thanks');
    expect(i18next.t('control.profile-tab')).toBe('Profile');
  });

  it('only overrides the languages given in the config', () => {
    applyConfigTranslations({
      translation_overrides: { en: { general: { cancel: 'Never mind' } } },
    } as unknown as DeploymentConfigWithOverrides);
    expect(i18next.getResource('en', 'translation', 'general.cancel')).toBe('Never mind');
    expect(i18next.getResource('es', 'translation', 'general.cancel')).toBe('Cancelar');
  });

  it('restores the built-in strings once a config without overrides is applied', () => {
    applyConfigTranslations(configWithOverrides);
    applyConfigTranslations({} as DeploymentConfigWithOverrides);
    expect(i18next.t('control.feedback-modal.sure')).toBe('Sure!');
  });
});
