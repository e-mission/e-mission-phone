import React, { useEffect, useState, createContext } from 'react';
import { ActivityIndicator } from 'react-native-paper';
import useAppConfig from './useAppConfig';
import OnboardingStack from './onboarding/OnboardingStack';
import {
  OnboardingRoute,
  OnboardingState,
  getPendingOnboardingState,
} from './onboarding/onboardingHelper';
import { setServerConnSettings } from './config/serverConn';
import AppStatusModal from './control/AppStatusModal';
import usePermissionStatus from './usePermissionStatus';
import { initPushNotify } from './splash/pushNotifySettings';
import { initStoreDeviceSettings } from './splash/storeDeviceSettings';
import { initRemoteNotifyHandler } from './splash/remoteNotifyHandler';
import { initCustomDatasetHelper } from './metrics/customMetricsHelper';
import AlertBar from './components/AlertBar';
import Main from './Main';

export const AppContext = createContext<any>({});

const App = () => {
  // will remain null while the onboarding state is still being determined
  const [onboardingState, setOnboardingState] = useState<OnboardingState | null>(null);
  const [permissionsPopupVis, setPermissionsPopupVis] = useState(false);
  const appConfig = useAppConfig();
  const permissionStatus = usePermissionStatus();

  const refreshOnboardingState = () => getPendingOnboardingState().then(setOnboardingState);
  useEffect(() => {
    refreshOnboardingState();
  }, []);

  useEffect(() => {
    if (!appConfig) return;
    setServerConnSettings(appConfig).then(() => {
      refreshOnboardingState();
    });
    initPushNotify();
    initStoreDeviceSettings();
    initRemoteNotifyHandler();
    initCustomDatasetHelper(appConfig);
  }, [appConfig]);

  const appContextValue = {
    appConfig,
    onboardingState,
    setOnboardingState,
    refreshOnboardingState,
    permissionStatus,
    permissionsPopupVis,
    setPermissionsPopupVis,
  };

  let appContent;
  if (onboardingState == null) {
    // if onboarding state is not yet determined, show a loading spinner
    appContent = <ActivityIndicator size={'large'} style={{ flex: 1 }} />;
  } else if (onboardingState?.route == OnboardingRoute.DONE) {
    // if onboarding route is DONE, show the main app with navigation between tabs
    appContent = <Main />;
  } else {
    // if there is an onboarding route that is not DONE, show the onboarding stack
    appContent = <OnboardingStack />;
  }

  return (
    <>
      <AppContext.Provider value={appContextValue}>
        {appContent}

        {/* If we are fully consented, (route > PROTOCOL), the permissions popup can show if needed.
          This also includes if onboarding is DONE altogether (because "DONE" is > "PROTOCOL") */}
        {onboardingState && onboardingState.route > OnboardingRoute.PROTOCOL && (
          <AppStatusModal permitVis={permissionsPopupVis} setPermitVis={setPermissionsPopupVis} />
        )}
      </AppContext.Provider>
      <AlertBar />
    </>
  );
};

export default App;
