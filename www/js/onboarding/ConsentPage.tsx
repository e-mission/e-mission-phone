import React, { useContext, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View, ScrollView } from 'react-native';
import { Button, Surface } from 'react-native-paper';
import { resetDataAndRefresh } from '../config/dynamicConfig';
import { AppContext } from '../App';
import { getAngularService } from '../angular-react-helper';
import i18next from "i18next";
import PrivacyPolicy from '../join/PrivacyPolicy';
import { onboardingStyles } from './OnboardingStack';

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
    <ScrollView>
      <Surface style={onboardingStyles.page}>
        <PrivacyPolicy />
        <View style={onboardingStyles.buttonRow}>
          <Button mode='contained' onPress={agree}> {t('consent.button-accept')} </Button>
          <Button mode='outlined' onPress={disagree}> {t('consent.button-decline')} </Button>
        </View>
      </Surface>
    </ScrollView>
  </>);
}

export default ConsentPage;
