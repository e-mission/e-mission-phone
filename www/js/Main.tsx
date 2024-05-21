/* Once onboarding is done, this is the main app content.
  Includes the bottom navigation bar and each of the tabs. */

import React, { useEffect } from 'react';
import { useContext, useMemo, useState } from 'react';
import { BottomNavigation, useTheme } from 'react-native-paper';
import { AppContext } from './App';
import { useTranslation } from 'react-i18next';
import { withErrorBoundary } from './plugin/ErrorBoundary';
import LabelTab from './diary/LabelTab';
import MetricsTab from './metrics/MetricsTab';
import ProfileSettings from './control/ProfileSettings';
import TimelineContext, { useTimelineContext } from './TimelineContext';

const defaultRoutes = (t) => [
  {
    key: 'label',
    title: t('diary.label-tab'),
    focusedIcon: 'check-bold',
    unfocusedIcon: 'check-outline',
    accessibilityLabel: t('diary.label-tab'),
  },
  {
    key: 'metrics',
    title: t('metrics.dashboard-tab'),
    focusedIcon: 'chart-box',
    unfocusedIcon: 'chart-box-outline',
    accessibilityLabel: t('metrics.dashboard-tab'),
  },
  {
    key: 'control',
    title: t('control.profile-tab'),
    focusedIcon: 'account',
    unfocusedIcon: 'account-outline',
    accessibilityLabel: t('control.profile-tab'),
  },
];

const scenes = {
  label: withErrorBoundary(LabelTab),
  metrics: withErrorBoundary(MetricsTab),
  control: withErrorBoundary(ProfileSettings),
};
const renderScene = BottomNavigation.SceneMap(scenes);

const Main = () => {
  const [index, setIndex] = useState(0);
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { appConfig } = useContext(AppContext);
  const timelineContext = useTimelineContext();

  const routes = useMemo(() => {
    const showMetrics = appConfig?.survey_info?.['trip-labels'] == 'MULTILABEL';
    return showMetrics ? defaultRoutes(t) : defaultRoutes(t).filter((r) => r.key != 'metrics');
  }, [appConfig, t]);

  useEffect(() => {
    const { setShouldUpdateTimeline } = timelineContext;
    // update TimelineScrollList component only when the active tab is 'label' to fix leaflet map issue
    setShouldUpdateTimeline(!index);
  }, [index]);

  return (
    <TimelineContext.Provider value={timelineContext}>
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
        theme={{ colors: { secondaryContainer: colors.primaryContainer } }}
      />
    </TimelineContext.Provider>
  );
};

export default Main;
