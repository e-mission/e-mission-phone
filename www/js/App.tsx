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
// import { getUserCustomLabels } from './services/commHelper';
import AlertBar from './components/AlertBar';
import Main from './Main';
import { joinWithTokenOrUrl } from './config/dynamicConfig';
import { addStatReading } from './plugin/clientStats';
import useAppState from './useAppState';
import { displayErrorMsg, logDebug } from './plugin/logger';
import i18next from 'i18next';

export const AppContext = createContext<any>({});
const CUSTOM_LABEL_KEYS_IN_DATABASE = ['mode', 'purpose'];
type CustomLabelMap = {
  [k: string]: string[];
};
type OnboardingJoinMethod = 'scan' | 'paste' | 'textbox' | 'external';

const App = () => {
  // will remain null while the onboarding state is still being determined
  const [onboardingState, setOnboardingState] = useState<OnboardingState | null>(null);
  const [permissionsPopupVis, setPermissionsPopupVis] = useState(false);
  const [customLabelMap, setCustomLabelMap] = useState<CustomLabelMap>({});
  const appConfig = useAppConfig();
  const permissionStatus = usePermissionStatus();

  const refreshOnboardingState = () =>
    getPendingOnboardingState().then((state) => {
      setOnboardingState(state);
      return state;
    });

  useEffect(() => {
    refreshOnboardingState();
  }, []);

  async function handleTokenOrUrl(tokenOrUrl: string, joinMethod: OnboardingJoinMethod) {
    const onboardingState = await refreshOnboardingState();
    logDebug(`handleTokenOrUrl: onboardingState = ${JSON.stringify(onboardingState)}`);
    if (onboardingState.route > OnboardingRoute.WELCOME) {
      displayErrorMsg(i18next.t('join.already-logged-in', { token: onboardingState.opcode }));
      return;
    }
    const configUpdated = await joinWithTokenOrUrl(tokenOrUrl);
    addStatReading('onboard', { configUpdated, joinMethod });
    if (configUpdated) {
      refreshOnboardingState();
    }
    return configUpdated;
  }
  // handleOpenURL function must be provided globally for cordova-plugin-customurlscheme
  // https://www.npmjs.com/package/cordova-plugin-customurlscheme
  window['handleOpenURL'] = (url: string) => handleTokenOrUrl(url, 'external');

  useEffect(() => {
    if (!appConfig) return;
    setServerConnSettings(appConfig).then(() => {
      refreshOnboardingState();
    });
    initPushNotify();
    initStoreDeviceSettings();
    initRemoteNotifyHandler();
    // getUserCustomLabels(CUSTOM_LABEL_KEYS_IN_DATABASE).then((res) => setCustomLabelMap(res));
  }, [appConfig]);

  const appState = useAppState({});
  if (appState != 'active') {
    // Render nothing if the app state is not 'active'.
    // On iOS, the UI can run if the app is launched by the OS in response to a notification,
    // in which case the appState will be 'background'. In this case, we definitely do not want
    // to load the UI because it is not visible.
    // On Android, the UI can only be initiated by the user - but even so, the user can send it to
    // the background and we don't need the UI to stay active.
    // In the future, we may want to persist some UI states when the app is sent to the background;
    // i.e. the user opens the app, navigates away, and back again.
    // But currently, we're relying on a 'fresh' UI every time the app goes to 'active' state.
    logDebug(`App: appState = ${appState}; returning null`);
    return null;
  }

  const appContextValue = {
    appConfig,
    handleTokenOrUrl,
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
