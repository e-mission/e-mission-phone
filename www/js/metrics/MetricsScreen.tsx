import React, { useState } from 'react';
import { ScrollView, StyleSheet, ViewStyle } from 'react-native';
import { shadow } from 'react-native-paper';
import { TabsProvider, Tabs, TabScreen } from 'react-native-paper-tabs';
import FootprintSection from './footprint/FootprintSection';
import MovementSection from './movement/MovementSection';
import TravelSection from './travel/TravelSection';
import useAppConfig from '../useAppConfig';
import { MetricsUiSection } from '../types/appConfigTypes';
import SurveysSection from './surveys/SurveysSection';
import { useAppTheme } from '../appTheme';
import i18next from 'i18next';

const DEFAULT_SECTIONS_TO_SHOW: MetricsUiSection[] = ['footprint', 'movement', 'travel'];

const SECTIONS: Record<string, [any, string, string]> = {
  footprint: [FootprintSection, 'shoe-print', i18next.t('metrics.footprint.footprint')],
  movement: [MovementSection, 'run', i18next.t('metrics.movement.movement')],
  travel: [TravelSection, 'chart-timeline', i18next.t('metrics.travel.travel')],
  surveys: [SurveysSection, 'clipboard-list', i18next.t('metrics.surveys.surveys')],
};

const MetricsScreen = ({ userMetrics, aggMetrics, metricList }) => {
  const { colors } = useAppTheme();
  const appConfig = useAppConfig();
  const sectionsToShow: string[] =
    appConfig?.metrics?.phone_dashboard_ui?.sections || DEFAULT_SECTIONS_TO_SHOW;
  const [selectedSection, setSelectedSection] = useState<string>(sectionsToShow[0]);

  const studyStartDate = `${appConfig?.intro.start_month} / ${appConfig?.intro.start_year}`;

  return (
    <TabsProvider defaultIndex={0}>
      <Tabs
        mode={sectionsToShow.length > 2 ? 'scrollable' : 'fixed'}
        style={{ backgroundColor: colors.elevation.level2, ...(shadow(2) as ViewStyle) }}>
        {Object.entries(SECTIONS).map(([section, [Component, icon, label]]) =>
          sectionsToShow.includes(section) ? (
            <TabScreen label={label} icon={icon} key={section}>
              <ScrollView
                contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 20, gap: 16 }}>
                <Component
                  userMetrics={userMetrics}
                  aggMetrics={aggMetrics}
                  metricList={metricList}
                />
              </ScrollView>
            </TabScreen>
          ) : null,
        )}
      </Tabs>
    </TabsProvider>
  );
};

export const metricsStyles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    minHeight: 300,
  },
  subtitleText: {
    fontSize: 13,
    lineHeight: 13,
    fontWeight: '400',
    fontStyle: 'italic',
  },
  content: {
    gap: 12,
    flex: 1,
  },
});

export default MetricsScreen;
