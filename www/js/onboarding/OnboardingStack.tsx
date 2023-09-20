import React, { useContext } from "react";
import { AppContext } from "../App";
import JoinPage from "./JoinPage";

// true if loading/undetermined
// 'join' if no config present
// 'consent' if config present, but not consented
// 'permissions' if consented but not granted permissions
// 'survey' if granted permissions but not completed survey
// null if all done
export type OnboardingState = true | 'join' | 'consent' | 'permissions' | 'survey' | null;

const OnboardingStack = () => {

  const { pendingOnboardingState } = useContext(AppContext);

  console.debug('pendingOnboardingState in OnboardingStack', pendingOnboardingState);

  if (pendingOnboardingState) {
    return <JoinPage />;
  }
}

export default OnboardingStack
