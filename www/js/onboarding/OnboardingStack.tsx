import React, { useContext } from 'react';
import { StyleSheet } from 'react-native';
import { AppContext } from '../App';
import WelcomePage from './WelcomePage';
import ProtocolPage from './ProtocolPage';
import SurveyPage from './SurveyPage';
import SaveQrPage from './SaveQrPage';
import SummaryPage from './SummaryPage';
import { OnboardingRoute } from './onboardingHelper';
import { displayErrorMsg } from '../plugin/logger';

const OnboardingStack = () => {
  const { onboardingState } = useContext(AppContext);

  if (onboardingState.route == OnboardingRoute.WELCOME) {
    // This page needs 'light content' status bar (white text) due to blue header at the top
    // window['StatusBar']?.styleLightContent();
    return <WelcomePage />;
  }
  // All other pages go back to 'default' (black text)
  // window['StatusBar']?.styleDefault();
  if (onboardingState.route == OnboardingRoute.SUMMARY) {
    return <SummaryPage />;
  } else if (onboardingState.route == OnboardingRoute.PROTOCOL) {
    return <ProtocolPage />;
  } else if (onboardingState.route == OnboardingRoute.SAVE_QR) {
    return <SaveQrPage />;
  } else if (onboardingState.route == OnboardingRoute.SURVEY) {
    return <SurveyPage />;
  } else {
    displayErrorMsg('OnboardingStack: unknown route', onboardingState.route);
    return <></>;
  }
};

export const onboardingStyles = StyleSheet.create({
  page: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 20,
  },
  pageSection: {
    marginVertical: 15,
    alignItems: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 15,
    alignItems: 'center',
    gap: 8,
    margin: 'auto',
  },
});

export default OnboardingStack;
