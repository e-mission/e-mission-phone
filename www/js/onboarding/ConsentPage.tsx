import React, { useContext, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, ScrollView } from 'react-native';
import { Button, Surface } from 'react-native-paper';
import { resetDataAndRefresh } from '../config/dynamicConfig';
import { AppContext } from '../App';
import { getAngularService } from '../angular-react-helper';
import i18next from "i18next";
import PrivacyPolicy from '../join/PrivacyPolicy';

const ConsentPage = () => {

  const { t } = useTranslation();
  const context = useContext(AppContext);
  const { refreshOnboardingState } = context;

  /* If the user does not consent, we boot them back out to the join screen */
  function disagree() {
    resetDataAndRefresh();
  };

  function agree() {
    const StartPrefs = getAngularService('StartPrefs');
    StartPrefs.markConsented().then((response) => {
      refreshOnboardingState();
    });
  };

  const getTemplateText = function(configObject) {
    if (configObject && (configObject.name)) {
        return configObject.intro.translated_text[i18next.language];
    }
  }

  const templateText = useMemo(() => getTemplateText(context.appConfig), [context.appConfig]);

  //summary of the study, privacy policy, data, etc, and accept/reject
  return (<>
    <Surface style={s.page}>
      <ScrollView>
        <PrivacyPolicy></PrivacyPolicy>
        <Button onPress={agree}> {t('consent.button-accept')} </Button>
        <Button onPress={disagree}> {t('consent.button-decline')} </Button>
      </ScrollView>
    </Surface>
  </>);
}

const s = StyleSheet.create({
  welcomeTitle: {
    marginTop: 20,
    textAlign: 'center',
    paddingVertical: 20,
    fontWeight: '600',
  },
  page: {
    paddingHorizontal: 15,
    flex: 1
  },
});

export default ConsentPage;
