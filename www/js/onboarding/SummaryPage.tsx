import React, { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { View, ScrollView } from 'react-native';
import { Button, Surface } from 'react-native-paper';
import { AppContext } from '../App';
import { onboardingStyles } from './OnboardingStack';
import StudySummary from './StudySummary';
import { setSummaryDone } from './onboardingHelper';

const SummaryPage = () => {

  const { t } = useTranslation();
  const context = useContext(AppContext);
  const { refreshOnboardingState } = context;

  function next() {
    setSummaryDone(true);
    refreshOnboardingState();
  };

  // summary of the study, followed by 'next' button
  return (<>
    <ScrollView contentContainerStyle={{flex: 1}}>
      <Surface style={[onboardingStyles.page, {flex:1, gap: 16}]}>
        <StudySummary />
        <View style={[onboardingStyles.buttonRow, {marginTop: 'auto'}]}>
          <Button mode='contained' onPress={next}> {t('intro.proceed')} </Button>
        </View>
      </Surface>
    </ScrollView>
  </>);
}

export default SummaryPage;
