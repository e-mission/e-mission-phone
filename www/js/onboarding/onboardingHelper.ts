import { getAngularService } from "../angular-react-helper";
import { OnboardingState } from "./OnboardingStack";

export function getPendingOnboardingState(): Promise<OnboardingState> {
  const StartPrefs = getAngularService('StartPrefs');
  return StartPrefs.readStartupState().then(([is_intro_done, is_consented, has_config]) => {
    if (!has_config) {
      return 'join';
    } else if (!is_consented) {
      return 'consent';
    } else if (!is_intro_done) {
      return 'intro';
    }
  });
};
