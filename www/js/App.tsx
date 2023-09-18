import React, { useState, createContext, useMemo } from 'react';
import { angularize } from './angular-react-helper';
import { BottomNavigation, Button, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import LabelTab from './diary/LabelTab';
import MetricsTab from './metrics/MetricsTab';
import ProfileSettings from './control/ProfileSettings';
import useAppConfig from './useAppConfig';
import OnboardingStack from './onboarding/OnboardingStack';

const defaultRoutes = (t) => [
  { key: 'label', title: t('diary.label-tab'), focusedIcon: 'check-bold', unfocusedIcon: 'check-outline' },
  { key: 'metrics', title: t('metrics.dashboard-tab'), focusedIcon: 'chart-box', unfocusedIcon: 'chart-box-outline' },
  { key: 'control', title: t('control.profile-tab'), focusedIcon: 'account', unfocusedIcon: 'account-outline' },
];

export const AppContext = createContext<any>({finishedOnboarding: false});

const App = () => {
  const [index, setIndex] = useState(0);
  const [finishedOnboarding, setFinishedOnboarding] = useState(false);
  const { appConfig, loading } = useAppConfig();
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

  const appContextValue = {
    appConfig,
    loading,
    finishedOnboarding,
    setFinishedOnboarding,
  }

  return (<>
    <AppContext.Provider value={appContextValue}>
      {finishedOnboarding ?
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
    </AppContext.Provider>
  </>);
}

angularize(App, 'App', 'emission.app');
export default App;
