import React, { useContext } from "react";
import { StyleSheet } from "react-native";
import { AppContext } from "../App";
import WelcomePage from "./WelcomePage";
import ConsentPage from "./ConsentPage";
import SurveyPage from "./SurveyPage";
import SaveQrPage from "./SaveQrPage";
import SummaryPage from "./SummaryPage";
import { OnboardingRoute } from "./onboardingHelper";
import { displayErrorMsg } from "../plugin/logger";

const OnboardingStack = () => {

  const { pendingOnboardingState } = useContext(AppContext);

  console.debug('pendingOnboardingState in OnboardingStack', pendingOnboardingState);

  if (pendingOnboardingState.route == OnboardingRoute.WELCOME) {
    return <WelcomePage />;
  } else if (pendingOnboardingState.route == OnboardingRoute.SUMMARY) {
    return <SummaryPage />;
  } else if (pendingOnboardingState.route == OnboardingRoute.CONSENT) {
    return <ConsentPage />;
  } else if (pendingOnboardingState.route == OnboardingRoute.SAVE_QR) {
    return <SaveQrPage />;
  } else if (pendingOnboardingState.route == OnboardingRoute.SURVEY) {
    return <SurveyPage />;
  } else {
    displayErrorMsg('OnboardingStack: unknown route', pendingOnboardingState.route);
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
