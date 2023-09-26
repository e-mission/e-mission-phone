import React, { useContext } from "react";
import { StyleSheet } from "react-native";
import { AppContext } from "../App";
import WelcomePage from "./WelcomePage";
import ConsentPage from "./ConsentPage";
import SurveyPage from "./SurveyPage";
import SaveQrPage from "./SaveQrPage";

// true if loading/undetermined
// 'welcome' if no config present
// 'consent' if config present, but not consented
// 'survey' if consented but intro not done
// null if intro done
const OnboardingStack = () => {

  const { pendingOnboardingState } = useContext(AppContext);

  console.debug('pendingOnboardingState in OnboardingStack', pendingOnboardingState);

  if (pendingOnboardingState.route == 'welcome') {
    return <WelcomePage />;
  } else if (pendingOnboardingState.route == 'consent') {
    return <ConsentPage />;
  } else if (pendingOnboardingState.route == 'save-qr') {
    return <SaveQrPage />;
  } else if (pendingOnboardingState.route == 'survey') {
    return <SurveyPage />;
  } else {
    return 'TODO'
  }
}

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

export default OnboardingStack
