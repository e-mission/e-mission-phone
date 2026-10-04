/* Once onboarding is done, this is the main app content.
  Includes the bottom navigation bar and each of the tabs. */

import React, { useCallback, useEffect } from 'react';
import { useContext, useMemo, useState } from 'react';
import { BottomNavigation, useTheme } from 'react-native-paper';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import { AppContext } from './AppContext';
import { withErrorBoundary } from './plugin/ErrorBoundary';
import LabelTab from './diary/LabelTab';
import MetricsTab from './metrics/MetricsTab';
import ProfileSettings from './control/ProfileSettings';
import LibraryTab from './library/LibraryTab';
import TimelineContext, { useTimelineContext } from './TimelineContext';
import { addStatReading } from './plugin/clientStats';
import { showMetricsTab } from './metrics/metricsHelper';

const defaultRoutes = (t: TFunction<'translation'>) => [
  {
    key: 'library',
    title: t('Library'),
    focusedIcon: 'book-open-page-variant',
    unfocusedIcon: 'book-open-outline',
    accessibilityLabel: t('library-tab'),
  },
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
  library: withErrorBoundary(LibraryTab),
};
const renderScene = BottomNavigation.SceneMap(scenes);

type MainProps = {
  defaultTab?: 'library' | 'label' | 'metrics' | 'control';
  routesOverride?: Array<{
    key: string;
    title: string;
    focusedIcon: string;
    unfocusedIcon: string;
    accessibilityLabel: string;
  }>;
};

const Main = ({ defaultTab = 'label', routesOverride }: MainProps) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { appConfig } = useContext(AppContext);
  const timelineContext = useTimelineContext();
  const routes = useMemo(() => {
    let r = routesOverride ?? defaultRoutes(t);
    if (!routesOverride && (!appConfig || !showMetricsTab(appConfig)))
      r = r.filter((route) => route.key != 'metrics');
    if (!routesOverride && !appConfig?.vehicle_library)
      r = r.filter((route) => route.key != 'library');
    return r;
  }, [appConfig, routesOverride, t]);
  const getInitialIndex = useCallback(() => {
    const nextIndex = routes.findIndex((route) => route.key === defaultTab);
    return nextIndex >= 0 ? nextIndex : 0;
  }, [defaultTab, routes]);
  const [index, setIndex] = useState(getInitialIndex);

  useEffect(() => {
    const nextIndex = routes.findIndex((route) => route.key === defaultTab);
    if (nextIndex >= 0) {
      setIndex(nextIndex);
    }
  }, [defaultTab, routes]);

  const onIndexChange = useCallback(
    (i: number) => {
      addStatReading('nav_tab_change', routes[i].key);
      setIndex(i);
    },
    [routes],
  );

  useEffect(() => {
    const { setShouldRenderTimeline } = timelineContext;
    // update TimelineScrollList component only when the active tab is 'label' to fix leaflet map issue
    const isLabelTab = routes[index].key == 'label';
    setShouldRenderTimeline(isLabelTab);
  }, [index]);

  return (
    <TimelineContext.Provider value={timelineContext}>
      <BottomNavigation
        navigationState={{ index, routes }}
        onIndexChange={onIndexChange}
        renderScene={renderScene}
        // Place at bottom, color of 'surface' (white) by default, and 68px tall (default was 80)
        safeAreaInsets={{ bottom: 0 }}
        barStyle={{ height: 68, justifyContent: 'center' }}
        // BottomNavigation uses secondaryContainer color for the background, but we want primaryContainer
        // (light blue), so we override here.
        theme={{ colors: { secondaryContainer: colors.primaryContainer } }}
      />
    </TimelineContext.Provider>
  );
};

export default Main;
