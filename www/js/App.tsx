import React, { useEffect, useState, createContext, useMemo } from 'react';
import { getAngularService } from './angular-react-helper';
import { BottomNavigation, Button, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import LabelTab from './diary/LabelTab';
import MetricsTab from './metrics/MetricsTab';
import ProfileSettings from './control/ProfileSettings';
import useAppConfig from './useAppConfig';
import OnboardingStack from './onboarding/OnboardingStack';
import { OnboardingRoute, OnboardingState, getPendingOnboardingState } from './onboarding/onboardingHelper';
import { setServerConnSettings } from './config/serverConn';
import AppStatusModal from './control/AppStatusModal';

const defaultRoutes = (t) => [
  { key: 'label', title: t('diary.label-tab'), focusedIcon: 'check-bold', unfocusedIcon: 'check-outline' },
  { key: 'metrics', title: t('metrics.dashboard-tab'), focusedIcon: 'chart-box', unfocusedIcon: 'chart-box-outline' },
  { key: 'control', title: t('control.profile-tab'), focusedIcon: 'account', unfocusedIcon: 'account-outline' },
];

export const AppContext = createContext<any>({});

const App = () => {

  const [index, setIndex] = useState(0);
  const [pendingOnboardingState, setPendingOnboardingState] = useState<OnboardingState>(null);
  const [permissionsPopupVis, setPermissionsPopupVis] = useState(false);
  const appConfig = useAppConfig();
  const { colors } = useTheme();
  const { t } = useTranslation();

  const StartPrefs = getAngularService('StartPrefs');

  const routes = useMemo(() => {
    const showMetrics = appConfig?.survey_info?.['trip-labels'] == 'MULTILABEL';
    return showMetrics ? defaultRoutes(t) : defaultRoutes(t).filter(r => r.key != 'metrics');
  }, [appConfig, t]);

  const renderScene = BottomNavigation.SceneMap({
    label: LabelTab,
    metrics: MetricsTab,
    control: ProfileSettings,
  });

  const refreshOnboardingState = () => getPendingOnboardingState().then(setPendingOnboardingState);
  useEffect(() => { refreshOnboardingState() }, []);

  useEffect(() => {
    if (!appConfig) return;
    setServerConnSettings(appConfig).then(() => {
      refreshOnboardingState();
    });
  }, [appConfig]);

  const appContextValue = {
    appConfig,
    pendingOnboardingState, setPendingOnboardingState, refreshOnboardingState,
    permissionsPopupVis, setPermissionsPopupVis,
  }

  console.debug('pendingOnboardingState in App', pendingOnboardingState);

  return (<>
    <AppContext.Provider value={appContextValue}>
      {pendingOnboardingState == null ?
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
      :
        <OnboardingStack />
      }
      { /* if onboarding is done (state == null), or if is in progress but we are past the
        consent page (route > CONSENT), the permissions popup can show if needed */ }
      {(pendingOnboardingState == null || pendingOnboardingState.route > OnboardingRoute.CONSENT) &&
        <AppStatusModal permitVis={permissionsPopupVis} setPermitVis={setPermissionsPopupVis} />
      }
    </AppContext.Provider>
  </>);
}

export default App;
