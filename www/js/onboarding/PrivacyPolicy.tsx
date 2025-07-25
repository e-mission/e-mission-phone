import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import useAppConfig from '../useAppConfig';
import { useTheme } from 'react-native-paper';

const PrivacyPolicy = () => {
  const { t, i18n } = useTranslation();
  const appConfig = useAppConfig();
  const { colors } = useTheme();

  const opcodeText = appConfig?.opcode?.autogen
    ? t('consent-text.opcode.autogen')
    : t('consent-text.opcode.not-autogen');

  const appRequired =
    appConfig?.intro?.app_required ?? appConfig?.intro?.program_or_study === 'program';

  const yourRightsText = appRequired
    ? t('consent-text.rights.app-required', {
        program_admin_contact: appConfig?.intro?.program_admin_contact,
      })
    : t('consent-text.rights.app-not-required', {
        program_or_study: appConfig?.intro?.program_or_study,
      });

  // backwards compat hack to fill in the raw_data_use for programs that don't have it
  if (appConfig?.intro) {
    const default_raw_data_use = {
      en: `monitor the ${appConfig?.intro?.program_or_study}, send personalized surveys or provide recommendations to participants`,
      es: `monitorear el ${appConfig?.intro?.program_or_study}, enviar encuestas personalizadas o proporcionar recomendaciones a los participantes`,
    };
    Object.entries(appConfig?.intro?.translated_text).forEach(([lang, val]: [string, any]) => {
      val.raw_data_use = val.raw_data_use || default_raw_data_use[lang];
    });
  }

  const lang = i18n.resolvedLanguage || 'en';
  const templateText = appConfig?.intro?.translated_text[lang];

  return (
    <>
      <Text style={styles.title}>{t('consent-text.title')}</Text>
      <Text style={styles.header}>{t('consent-text.introduction.header')}</Text>
      <Text style={styles.text}>{templateText?.short_textual_description}</Text>
      <Text>{'\n'}</Text>
      <Text style={styles.text}>{t('consent-text.introduction.what-is-openpath')}</Text>
      <Text>{'\n'}</Text>
      <Text style={styles.text}>
        {t('consent-text.introduction.what-is-NREL', {
          program_or_study: appConfig?.intro?.program_or_study,
        })}
      </Text>
      <Text>{'\n'}</Text>
      <Text style={styles.text}>{t('consent-text.introduction.if-disagree')}</Text>
      <Text>{'\n'}</Text>

      <Text style={styles.header}>{t('consent-text.why.header')}</Text>
      <Text style={styles.text}>{templateText?.why_we_collect}</Text>
      <Text>{'\n'}</Text>

      <Text style={styles.header}>{t('consent-text.what.header')}</Text>
      <Text style={styles.text}>{t('consent-text.what.no-pii')}</Text>
      <Text>{'\n'}</Text>
      <Text style={styles.text}>{t('consent-text.what.phone-sensor')}</Text>
      <Text>{'\n'}</Text>
      <Text style={styles.text}>{t('consent-text.what.labeling')}</Text>
      <Text>{'\n'}</Text>
      <Text style={styles.text}>{t('consent-text.what.demographics')}</Text>
      <Text>{'\n'}</Text>
      <Text style={styles.text}>
        {t('consent-text.what.open-source-data')}
        <Text
          style={styles.hyperlinkStyle(colors.primary)}
          onPress={() => {
            window['cordova'].InAppBrowser.open(
              'https://github.com/e-mission/e-mission-data-collection.git',
              '_system',
            );
          }}>
          {' '}
          https://github.com/e-mission/e-mission-data-collection.git{' '}
        </Text>
        {t('consent-text.what.open-source-analysis')}
        <Text
          style={styles.hyperlinkStyle(colors.primary)}
          onPress={() => {
            window['cordova'].InAppBrowser.open(
              'https://github.com/e-mission/e-mission-server.git',
              '_system',
            );
          }}>
          {' '}
          https://github.com/e-mission/e-mission-server.git{' '}
        </Text>
        {t('consent-text.what.open-source-dashboard')}
        <Text
          style={styles.hyperlinkStyle(colors.primary)}
          onPress={() => {
            window['cordova'].InAppBrowser.open(
              'https://github.com/e-mission/em-public-dashboard.git',
              '_system',
            );
          }}>
          {' '}
          https://github.com/e-mission/em-public-dashboard.git.{' '}
        </Text>
      </Text>
      <Text>{'\n'}</Text>

      <Text style={styles.header}>{t('consent-text.opcode.header')}</Text>
      <Text style={styles.text}>{opcodeText}</Text>
      <Text>{'\n'}</Text>

      <Text style={styles.header}>{t('consent-text.who-sees.header')}</Text>
      <Text style={styles.text}>{t('consent-text.who-sees.public-dash')}</Text>
      <Text>{'\n'}</Text>
      <Text style={styles.text}>{t('consent-text.who-sees.individual-info')}</Text>
      <Text>{'\n'}</Text>
      <Text style={styles.text}>
        {t('consent-text.who-sees.program-admins', {
          deployment_partner_name: appConfig?.intro?.deployment_partner_name,
          raw_data_use: templateText?.raw_data_use,
        })}
      </Text>
      <Text style={styles.text}>{t('consent-text.who-sees.nrel-devs')}</Text>
      <Text>{'\n'}</Text>
      <Text style={styles.text}>
        {t('consent-text.who-sees.TSDC-info')}
        <Text
          style={styles.hyperlinkStyle(colors.primary)}
          onPress={() => {
            window['cordova'].InAppBrowser.open(
              'https://www.nrel.gov/transportation/secure-transportation-data/',
              '_system',
            );
          }}>
          {t('consent-text.who-sees.on-website')}
        </Text>
        {t('consent-text.who-sees.and-in')}
        <Text
          style={styles.hyperlinkStyle(colors.primary)}
          onPress={() => {
            window['cordova'].InAppBrowser.open(
              'https://www.sciencedirect.com/science/article/pii/S2352146515002999',
              '_system',
            );
          }}>
          {t('consent-text.who-sees.this-pub')}
        </Text>
        {t('consent-text.who-sees.and')}
        <Text
          style={styles.hyperlinkStyle(colors.primary)}
          onPress={() => {
            window['cordova'].InAppBrowser.open(
              'https://www.nrel.gov/docs/fy18osti/70723.pdf',
              '_system',
            );
          }}>
          {t('consent-text.who-sees.fact-sheet') + '.'}
        </Text>
      </Text>
      <Text>{'\n'}</Text>

      <Text style={styles.header}>{t('consent-text.rights.header')}</Text>
      <Text style={styles.text}>{yourRightsText}</Text>
      <Text>{'\n'}</Text>
      <Text style={styles.text}>
        {t('consent-text.rights.destroy-data-pt1')}
        <Text>{'(k.shankari@nrel.gov)'}</Text>
        {t('consent-text.rights.destroy-data-pt2')}
      </Text>
      <Text>{'\n'}</Text>

      <Text style={styles.header}>{t('consent-text.questions.header')}</Text>
      <Text style={styles.text}>
        {t('consent-text.questions.for-questions', {
          program_admin_contact: appConfig?.intro?.program_admin_contact,
        })}
      </Text>
      <Text>{'\n'}</Text>

      <Text style={styles.header}>{t('consent-text.consent.header')}</Text>
      <Text style={styles.text}>
        {t('consent-text.consent.press-button-to-consent', {
          program_or_study: appConfig?.intro?.program_or_study,
        })}
      </Text>
    </>
  );
};

const styles = StyleSheet.create({
  hyperlinkStyle: (linkColor) => ({
    color: linkColor,
  }),
  text: {
    fontSize: 14,
  },
  header: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 22,
    paddingBottom: 10,
    textAlign: 'center',
  },
  divider: {
    marginVertical: 10,
  },
});

export default PrivacyPolicy;
