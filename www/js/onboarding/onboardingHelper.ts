import { getAngularService } from "../angular-react-helper";

type OnboardingRoute = 'join' | 'consent' | false;
export type OnboardingState = {
  opcode: string,
  route: OnboardingRoute,
}
export function getPendingOnboardingState(): Promise<OnboardingState> {
  return Promise.all([readConfig(), readConsented()]).then(([config, is_consented]) => {
    let route;
    if (!config) {
      route = 'join';
    } else if (!is_consented) {
      route = 'consent';
    } else {
      return null; // onboarding is done; no pending state
    }
    return { route, opcode: config?.joined?.opcode };
  });
};

async function readConfig() {
  const DynamicConfig = getAngularService('DynamicConfig');
  return DynamicConfig.loadSavedConfig() as Promise<any>;
}

async function readConsented() {
  const StartPrefs = getAngularService('StartPrefs');
  return StartPrefs.readConsentState().then(StartPrefs.isConsented) as Promise<boolean>;
}
