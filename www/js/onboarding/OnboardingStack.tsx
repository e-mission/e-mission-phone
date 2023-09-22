import React, { useContext } from "react";
import { AppContext } from "../App";
import JoinPage from "./JoinPage";
import ConsentPage from "./ConsentPage";
import SurveyPage from "./SurveyPage";
import SaveQrPage from "./SaveQrPage";

// true if loading/undetermined
// 'join' if no config present
// 'consent' if config present, but not consented
// 'survey' if consented but intro not done
// null if intro done
const OnboardingStack = () => {

  const { pendingOnboardingState } = useContext(AppContext);

  console.debug('pendingOnboardingState in OnboardingStack', pendingOnboardingState);

  if (pendingOnboardingState.route == 'join') {
    return <JoinPage />;
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

export default OnboardingStack
