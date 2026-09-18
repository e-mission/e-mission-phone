import React, { useCallback, useEffect, useState } from 'react';
import { AppStateStatus, View } from 'react-native';
import { ActivityIndicator, PaperProvider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { registerRootComponent } from 'expo';
import i18next from 'i18next';
import packageJson from '../../package.json';
import useAppConfig from './useAppConfig';
import OnboardingStack from './onboarding/OnboardingStack';
import {
  OnboardingRoute,
  OnboardingState,
  getPendingOnboardingState,
} from './onboarding/onboardingHelper';
import { setServerConnSettings } from './config/serverConn';
import AppStatusModal from './AppStatusModal';
import AlertArea from './components/AlertArea';
import Main from './Main';
import { AppContext, CustomLabelMap, OnboardingJoinMethod } from './AppContext';

import initializedI18next from '../js/i18nextInit';
window['i18next'] = initializedI18next;

import { joinWithTokenOrUrl } from './config/dynamicConfig';
import { isJoinUrl } from './config/opcode';
import { handleUrl, registerUrlHandler, UrlHandlerResult } from './urlHandler';
import { addStatReading } from './plugin/clientStats';
import { displayErrorMsg, logDebug } from './plugin/logger';
import { registerAndUpdateProfile, updateUserProfile, UserProfile } from './splash/userProfile';
import { getTheme } from './appTheme';
import usePermissionStatus from './usePermissionStatus';

const theme = getTheme();

const App = ({ appState }: { appState: AppStateStatus }) => {
  // will remain null while the onboarding state is still being determined
  const [onboardingState, setOnboardingState] = useState<OnboardingState | null>(null);
  const [permissionsPopupVis, setPermissionsPopupVis] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [customLabelMap, setCustomLabelMap] = useState<CustomLabelMap>({});
  const appConfig = useAppConfig();
  const permissionStatus = usePermissionStatus(appState, appConfig);

  const refreshOnboardingState = () =>
    getPendingOnboardingState().then((state) => {
      setOnboardingState(state);
      return state;
    });

  useEffect(() => {
    refreshOnboardingState();
  }, []);

  const handleJoinTokenOrUrl = useCallback(
    async (tokenOrUrl: string, joinMethod: OnboardingJoinMethod) => {
      const onboardingState = await refreshOnboardingState();
      logDebug(`handleJoinToken: onboardingState = ${JSON.stringify(onboardingState)}`);
      if (onboardingState.route > OnboardingRoute.WELCOME) {
        displayErrorMsg(i18next.t('join.already-logged-in', { token: onboardingState.opcode }));
        return false;
      }
      const configUpdated = await joinWithTokenOrUrl(tokenOrUrl);
      addStatReading('onboard', { configUpdated, joinMethod });
      if (configUpdated) {
        refreshOnboardingState();
      }
      return configUpdated;
    },
    [],
  );

  useEffect(() => {
    return registerUrlHandler((url) => {
      if (!isJoinUrl(url)) return false;
      return handleJoinTokenOrUrl(url, 'external');
    });
  }, [handleJoinTokenOrUrl]);

  // handleOpenURL function must be provided globally for cordova-plugin-customurlscheme
  // https://www.npmjs.com/package/cordova-plugin-customurlscheme
  // To handle URLs launched when the app is not yet open (i.e. cold start),
  // the stub in index.html stores them in window.__pendingAppUrls
  // so we can handle them once React mounts
  useEffect(() => {
    (window as any).handleOpenURL = handleUrl;
    const pendingUrls: string[] = (window as any).__pendingAppUrls || [];
    (window as any).__pendingAppUrls = [];
    if (pendingUrls.length) {
      logDebug(`Handling pending URLs: ${pendingUrls.join(', ')}`);
      pendingUrls.forEach((url) => handleUrl(url));
    }
  }, [handleUrl]);

  useEffect(() => {
    if (!appConfig) return;
    setServerConnSettings(appConfig).then(() => {
      refreshOnboardingState();
    });
  }, [appConfig]);

  // when onboardingState is DONE, call registerAndUpdateProfile
  // and setUserProfile with the latest profile
  useEffect(() => {
    if (!appConfig || onboardingState?.route != OnboardingRoute.DONE) return;
    registerAndUpdateProfile(appConfig)
      .then(setUserProfile)
      .catch((e) => {
        displayErrorMsg(e, 'Error while registering and updating profile');
      });
  }, [appConfig, onboardingState?.route]);

  const appContextValue = {
    appConfig,
    handleJoinTokenOrUrl,
    onboardingState,
    setOnboardingState,
    refreshOnboardingState,
    permissionStatus,
    permissionsPopupVis,
    setPermissionsPopupVis,
    userProfile,
    updateUserProfile: (p: Partial<UserProfile>) =>
      updateUserProfile(p, userProfile).then(setUserProfile),
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
    <AppContext.Provider value={appContextValue}>
      <PaperProvider theme={theme}>
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.elevation.level2 }}>
          {appContent}
          {/* If we are fully consented, (route > PROTOCOL), the permissions popup can show if needed.
          This also includes if onboarding is DONE altogether (because "DONE" is > "PROTOCOL") */}
          {onboardingState && onboardingState.route > OnboardingRoute.PROTOCOL && (
            <AppStatusModal />
          )}
          <AlertArea />
        </SafeAreaView>
      </PaperProvider>
    </AppContext.Provider>
  );
};

export default App;
