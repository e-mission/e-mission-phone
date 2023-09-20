import React, { useContext } from "react";
import { AppContext } from "../App";
import JoinPage from "./JoinPage";
import ConsentPage from "./ConsentPage";

// true if loading/undetermined
// 'join' if no config present
// 'consent' if config present, but not consented
// 'permissions' if consented but not granted permissions
// 'survey' if granted permissions but not completed survey
// null if all done
const OnboardingStack = () => {

  const { pendingOnboardingState } = useContext(AppContext);

  console.debug('pendingOnboardingState in OnboardingStack', pendingOnboardingState);

  if (pendingOnboardingState.route == 'join') {
    return <JoinPage />;
  } else if (pendingOnboardingState.route == 'consent') {
    return <ConsentPage />;
  } else {
    return 'TODO'
  }
}

export default OnboardingStack
