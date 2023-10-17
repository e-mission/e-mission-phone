import React, { useEffect, useState, createContext, useMemo } from 'react';
import { getAngularService } from './angular-react-helper';
import { ActivityIndicator, BottomNavigation, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import LabelTab from './diary/LabelTab';
import MetricsTab from './metrics/MetricsTab';
import ProfileSettings from './control/ProfileSettings';
import useAppConfig from './useAppConfig';
import OnboardingStack from './onboarding/OnboardingStack';
import { OnboardingRoute, OnboardingState, getPendingOnboardingState } from './onboarding/onboardingHelper';
import { setServerConnSettings } from './config/serverConn';
import AppStatusModal from './control/AppStatusModal';
import usePermissionStatus from './usePermissionStatus';

const defaultRoutes = (t) => [
  { key: 'label', title: t('diary.label-tab'), focusedIcon: 'check-bold', unfocusedIcon: 'check-outline' },
  { key: 'metrics', title: t('metrics.dashboard-tab'), focusedIcon: 'chart-box', unfocusedIcon: 'chart-box-outline' },
  { key: 'control', title: t('control.profile-tab'), focusedIcon: 'account', unfocusedIcon: 'account-outline' },
];

export const AppContext = createContext<any>({});

const App = () => {

  const [index, setIndex] = useState(0);
  // will remain null while the onboarding state is still being determined
  const [onboardingState, setOnboardingState] = useState<OnboardingState|null>(null);
  const [permissionsPopupVis, setPermissionsPopupVis] = useState(false);
  const appConfig = useAppConfig();
  const permissionStatus = usePermissionStatus();
  const { colors } = useTheme();
  const { t } = useTranslation();

  const routes = useMemo(() => {
    const showMetrics = appConfig?.survey_info?.['trip-labels'] == 'MULTILABEL';
    return showMetrics ? defaultRoutes(t) : defaultRoutes(t).filter(r => r.key != 'metrics');
  }, [appConfig, t]);

  const renderScene = BottomNavigation.SceneMap({
    label: LabelTab,
    metrics: MetricsTab,
    control: ProfileSettings,
  });

  const refreshOnboardingState = () => getPendingOnboardingState().then(setOnboardingState);
  useEffect(() => { refreshOnboardingState() }, []);

  useEffect(() => {
    if (!appConfig) return;
    setServerConnSettings(appConfig).then(() => {
      refreshOnboardingState();
    });
  }, [appConfig]);

  const appContextValue = {
    appConfig,
    onboardingState, setOnboardingState, refreshOnboardingState,
    permissionStatus,
    permissionsPopupVis, setPermissionsPopupVis,
  }

  console.debug('onboardingState in App', onboardingState);

  let appContent;
  if (onboardingState == null) {
    // if onboarding state is not yet determined, show a loading spinner
    appContent = <ActivityIndicator size={'large'} style={{ flex: 1 }} />
  } else if (onboardingState?.route == OnboardingRoute.DONE) {
    // if onboarding route is DONE, show the main app with navigation between tabs
    appContent = (
      <BottomNavigation
        navigationState={{ index, routes }}
        onIndexChange={setIndex}
        renderScene={renderScene}
        // Place at bottom, color of 'surface' (white) by default, and 68px tall (default was 80)
        safeAreaInsets={{ bottom: 0 }}
        style={{ backgroundColor: colors.surface }}
        barStyle={{ height: 68, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0)' }}
        // BottomNavigation uses secondaryContainer color for the background, but we want primaryContainer
        // (light blue), so we override here.
        theme={{ colors: { secondaryContainer: colors.primaryContainer } }} />
    );
  } else {
    // if there is an onboarding route that is not DONE, show the onboarding stack
    appContent = <OnboardingStack />
  }

  return (<>
    <AppContext.Provider value={appContextValue}>
      {appContent}

      { /* If we are past the consent page (route > CONSENT), the permissions popup can show if needed.
          This also includes if onboarding is DONE altogether (because "DONE" is > "CONSENT") */ }
      {(onboardingState && onboardingState.route > OnboardingRoute.CONSENT) &&
        <AppStatusModal permitVis={permissionsPopupVis} setPermitVis={setPermissionsPopupVis} />
      }
    </AppContext.Provider>
  </>);
}

export default App;
