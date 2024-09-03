import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SegmentedButtons } from 'react-native-paper';
import { TabsProvider, Tabs, TabScreen } from 'react-native-paper-tabs';
import FootprintSection from './footprint/FootprintSection';
import ActiveTravelSection from './activetravel/ActiveTravelSection';
import SummarySection from './summary/SummarySection';
import useAppConfig from '../useAppConfig';
import { MetricsUiSection } from '../types/appConfigTypes';
import SurveysSection from './surveys/SurveysSection';
import { useAppTheme } from '../appTheme';

const DEFAULT_SECTIONS_TO_SHOW: MetricsUiSection[] = ['footprint', 'movement', 'travel'];

const SECTIONS: Record<string, [any, string, string]> = {
  footprint: [FootprintSection, 'shoe-print', 'Footprint'],
  movement: [ActiveTravelSection, 'walk', 'Movement'],
  travel: [SummarySection, 'chart-timeline', 'Travel'],
  surveys: [SurveysSection, 'clipboard-list', 'Surveys'],
};

const MetricsScreen = ({ userMetrics, aggMetrics, metricList }) => {
  const { colors } = useAppTheme();
  const appConfig = useAppConfig();
  const sectionsToShow: string[] =
    appConfig?.metrics?.phone_dashboard_ui?.sections || DEFAULT_SECTIONS_TO_SHOW;
  const [selectedSection, setSelectedSection] = useState<string>(sectionsToShow[0]);

  const studyStartDate = `${appConfig?.intro.start_month} / ${appConfig?.intro.start_year}`;

  return (
    <TabsProvider
      defaultIndex={0}
      // onChangeIndex={handleChangeIndex} optional
    >
      <Tabs
        mode={sectionsToShow.length > 2 ? 'scrollable' : 'fixed'}
        style={{ backgroundColor: colors.elevation.level2 }}>
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
  title: (colors) => ({
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    minHeight: 52,
  }),
  titleText: (colors) => ({
    color: colors.onPrimary,
    fontWeight: '500',
    textAlign: 'center',
  }),
  subtitleText: {
    fontSize: 13,
    lineHeight: 13,
    fontWeight: '400',
    fontStyle: 'italic',
  },
  content: {
    padding: 8,
    paddingBottom: 12,
    flex: 1,
  },
});

export default MetricsScreen;
