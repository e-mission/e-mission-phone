import React, { useEffect, useState, createContext } from 'react';
import { registerRootComponent } from 'expo';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PaperProvider, ActivityIndicator } from 'react-native-paper';
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
// import { getUserCustomLabels } from './services/commHelper';
import { initCustomDatasetHelper } from './metrics/customMetricsHelper';
import AlertBar from './components/AlertBar';
import Main from './Main';
import { getTheme } from './appTheme';

import initializedI18next from '../js/i18nextInit';
window['i18next'] = initializedI18next;

import { setupExpoCompat, IS_EXPO } from './expoCompat';
setupExpoCompat();

export const AppContext = createContext<any>({});
const CUSTOM_LABEL_KEYS_IN_DATABASE = ['mode', 'purpose'];
type CustomLabelMap = {
  [k: string]: string[];
};

const theme = getTheme();

const App = () => {
  // will remain null while the onboarding state is still being determined
  const [onboardingState, setOnboardingState] = useState<OnboardingState | null>(null);
  const [permissionsPopupVis, setPermissionsPopupVis] = useState(false);
  const [customLabelMap, setCustomLabelMap] = useState<CustomLabelMap>({});
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
    // getUserCustomLabels(CUSTOM_LABEL_KEYS_IN_DATABASE).then((res) => setCustomLabelMap(res));
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
    customLabelMap,
    setCustomLabelMap,
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
    <PaperProvider theme={theme}>
      <SafeAreaView style={{ flex: 1 }}>
        <AppContext.Provider value={appContextValue}>
          {appContent}

          {/* If we are fully consented, (route > PROTOCOL), the permissions popup can show if needed.
            This also includes if onboarding is DONE altogether (because "DONE" is > "PROTOCOL") */}
          {onboardingState && onboardingState.route > OnboardingRoute.PROTOCOL && (
            <AppStatusModal permitVis={permissionsPopupVis} setPermitVis={setPermissionsPopupVis} />
          )}
        </AppContext.Provider>
        <AlertBar />
      </SafeAreaView>
    </PaperProvider>
  );
};

export default IS_EXPO ? registerRootComponent(App) : App;
