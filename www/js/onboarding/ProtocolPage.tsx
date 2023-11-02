import React, { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { View, ScrollView } from 'react-native';
import { Button, Surface } from 'react-native-paper';
import { resetDataAndRefresh } from '../config/dynamicConfig';
import { AppContext } from '../App';
import PrivacyPolicy from './PrivacyPolicy';
import { onboardingStyles } from './OnboardingStack';
import { markConsented } from '../splash/startprefs';
import { setProtocolDone } from './onboardingHelper';

const ProtocolPage = () => {
  const { t } = useTranslation();
  const context = useContext(AppContext);
  const { refreshOnboardingState } = context;

  /* If the user does not consent, we boot them back out to the join screen */
  function disagree() {
    resetDataAndRefresh();
  }

  function agree() {
    setProtocolDone(true);
    refreshOnboardingState();
  }

  // privacy policy and data collection info, followed by accept/reject buttons
  return (
    <>
      <ScrollView>
        <Surface style={onboardingStyles.page}>
          <PrivacyPolicy />
          <View style={onboardingStyles.buttonRow}>
            <Button mode="outlined" onPress={disagree}>
              {' '}
              {t('consent.button-decline')}{' '}
            </Button>
            <Button mode="contained" onPress={agree}>
              {' '}
              {t('consent.button-accept')}{' '}
            </Button>
          </View>
        </Surface>
      </ScrollView>
    </>
  );
};

export default ProtocolPage;
