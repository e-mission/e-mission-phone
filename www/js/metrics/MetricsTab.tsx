import React, { useEffect, useState, useMemo, useContext } from 'react';
import { View, ScrollView, useWindowDimensions } from 'react-native';
import { Appbar, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { DateTime } from 'luxon';
import NavBar from '../components/NavBar';
import { MetricsData } from './metricsTypes';
import MetricsCard from './MetricsCard';
import { formatForDisplay, useImperialConfig } from '../config/useImperialConfig';
import WeeklyActiveMinutesCard from './WeeklyActiveMinutesCard';
import { secondsToHours, secondsToMinutes } from './metricsHelper';
import CarbonFootprintCard from './CarbonFootprintCard';
import Carousel from '../components/Carousel';
import DailyActiveMinutesCard from './DailyActiveMinutesCard';
import CarbonTextCard from './CarbonTextCard';
import ActiveMinutesTableCard from './ActiveMinutesTableCard';
import { getAggregateData, getMetrics } from '../services/commHelper';
import { displayError, displayErrorMsg, logDebug, logWarn } from '../plugin/logger';
import useAppConfig from '../useAppConfig';
import {
  AppConfig,
  GroupingField,
  MetricName,
  MetricList,
  MetricsUiSection,
} from '../types/appConfigTypes';
import DateSelect from '../diary/list/DateSelect';
import TimelineContext, { TimelineLabelMap, TimelineMap } from '../TimelineContext';
import { isoDateRangeToTsRange, isoDatesDifference } from '../diary/timelineHelper';
import { metrics_summaries } from 'e-mission-common';
import SurveyLeaderboardCard from './SurveyLeaderboardCard';
import SurveyTripCategoriesCard from './SurveyTripCategoriesCard';
import SurveyComparisonCard from './SurveyComparisonCard';

// 2 weeks of data is needed in order to compare "past week" vs "previous week"
const N_DAYS_TO_LOAD = 14; // 2 weeks
const DEFAULT_SECTIONS_TO_SHOW: MetricsUiSection[] = [
  'footprint',
  'active_travel',
  'summary',
] as const;
export const DEFAULT_METRIC_LIST: MetricList = {
  distance: ['mode_confirm'],
  duration: ['mode_confirm'],
  count: ['mode_confirm'],
};

async function computeUserMetrics(
  metricList: MetricList,
  timelineMap: TimelineMap,
  timelineLabelMap: TimelineLabelMap | null,
  appConfig: AppConfig,
) {
  try {
    const timelineValues = [...timelineMap.values()];
    const result = metrics_summaries.generate_summaries(
      { ...metricList },
      timelineValues,
      appConfig,
      timelineLabelMap,
    );
    logDebug('MetricsTab: computed userMetrics');
    console.debug('MetricsTab: computed userMetrics', result);
    return result as MetricsData;
  } catch (e) {
    displayError(e, 'Error computing user metrics');
  }
}

async function fetchAggMetrics(
  metricList: MetricList,
  dateRange: [string, string],
  appConfig: AppConfig,
) {
  logDebug('MetricsTab: fetching agg metrics from server for dateRange ' + dateRange);
  const query = {
    freq: 'D',
    start_time: dateRange[0],
    end_time: dateRange[1],
    metric_list: metricList,
    is_return_aggregate: true,
    app_config: { survey_info: appConfig.survey_info },
  };
  return getAggregateData('result/metrics/yyyy_mm_dd', query, appConfig.server)
    .then((response) => {
      logDebug('MetricsTab: received aggMetrics');
      console.debug('MetricsTab: received aggMetrics', response);
      return response as MetricsData;
    })
    .catch((e) => displayError(e, 'Error fetching aggregate metrics'));
}

const MetricsTab = () => {
  const appConfig = useAppConfig();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const {
    dateRange,
    timelineMap,
    timelineLabelMap,
    timelineIsLoading,
    refreshTimeline,
    loadMoreDays,
    loadDateRange,
  } = useContext(TimelineContext);

  const metricList = appConfig?.metrics?.phone_dashboard_ui?.metric_list ?? DEFAULT_METRIC_LIST;

  const [userMetrics, setUserMetrics] = useState<MetricsData | undefined>(undefined);
  const [aggMetrics, setAggMetrics] = useState<MetricsData | undefined>(undefined);
  const [aggMetricsIsLoading, setAggMetricsIsLoading] = useState(false);

  useEffect(() => {
    if (!appConfig) return;
    const dateRangeDays = isoDatesDifference(...dateRange);
    if (timelineIsLoading) {
      logDebug('MetricsTab: timeline is still loading, skipping');
    } else if (dateRangeDays < N_DAYS_TO_LOAD) {
      logDebug('MetricsTab: loading more days');
      loadMoreDays('past', N_DAYS_TO_LOAD - dateRangeDays);
    } else {
      if (!timelineMap) return;
      logDebug(`MetricsTab: date range >= ${N_DAYS_TO_LOAD} days, computing metrics`);
      computeUserMetrics(metricList, timelineMap, timelineLabelMap, appConfig).then((result) =>
        setUserMetrics(result),
      );
      setAggMetricsIsLoading(true);
      fetchAggMetrics(metricList, dateRange, appConfig).then((response) => {
        setAggMetricsIsLoading(false);
        setAggMetrics(response);
      });
    }
  }, [appConfig, dateRange, timelineIsLoading, timelineMap, timelineLabelMap]);

  const sectionsToShow =
    appConfig?.metrics?.phone_dashboard_ui?.sections || DEFAULT_SECTIONS_TO_SHOW;
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = windowWidth * 0.88;
  const studyStartDate = `${appConfig?.intro.start_month} / ${appConfig?.intro.start_year}`;

  return (
    <>
      <NavBar isLoading={Boolean(timelineIsLoading || aggMetricsIsLoading)}>
        <Appbar.Content title={t('metrics.dashboard-tab')} />
        <DateSelect
          mode="range"
          onChoose={({ startDate, endDate }) => {
            const start = DateTime.fromJSDate(startDate).toISODate();
            const end = DateTime.fromJSDate(endDate).toISODate();
            if (!start || !end) return displayErrorMsg('Invalid date');
            loadDateRange([start, end]);
          }}
        />
        <Appbar.Action icon="refresh" size={32} onPress={refreshTimeline} />
      </NavBar>
      <ScrollView style={{ paddingVertical: 12 }}>
        {sectionsToShow.includes('footprint') && (
          <Carousel cardWidth={cardWidth} cardMargin={cardMargin}>
            <CarbonFootprintCard userMetrics={userMetrics} aggMetrics={aggMetrics} />
            <CarbonTextCard userMetrics={userMetrics} aggMetrics={aggMetrics} />
          </Carousel>
        )}
        {sectionsToShow.includes('active_travel') && (
          <Carousel cardWidth={cardWidth} cardMargin={cardMargin}>
            <WeeklyActiveMinutesCard userMetrics={userMetrics} />
            <DailyActiveMinutesCard userMetrics={userMetrics} />
            <ActiveMinutesTableCard userMetrics={userMetrics} />
          </Carousel>
        )}
        {sectionsToShow.includes('summary') && (
          <Carousel cardWidth={cardWidth} cardMargin={cardMargin}>
            {Object.entries(metricList).map(
              ([metricName, groupingFields]: [MetricName, GroupingField[]]) => {
                return (
                  <MetricsCard
                    key={metricName}
                    metricName={metricName}
                    groupingFields={groupingFields}
                    cardTitle={t(`main-metrics.${metricName}`)}
                    userMetricsDays={userMetrics?.[metricName]}
                    aggMetricsDays={aggMetrics?.[metricName]}
                  />
                );
              },
            )}
          </Carousel>
        )}
        {sectionsToShow.includes('surveys') && (
          <Carousel cardWidth={cardWidth} cardMargin={cardMargin}>
            <SurveyComparisonCard userMetrics={userMetrics} aggMetrics={aggMetrics} />
            <SurveyTripCategoriesCard userMetrics={userMetrics} aggMetrics={aggMetrics} />
          </Carousel>
        )}
        {/* we will implement leaderboard later */}
        {/* {sectionsToShow.includes('engagement') && (
          <Carousel cardWidth={cardWidth} cardMargin={cardMargin}>
            <SurveyLeaderboardCard
              surveyMetric={DUMMY_SURVEY_METRIC}
              studyStartDate={studyStartDate}
            />
          </Carousel>
        )} */}
      </ScrollView>
    </>
  );
};

export const cardMargin = 10;

export const cardStyles: any = {
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
};

export default MetricsTab;
