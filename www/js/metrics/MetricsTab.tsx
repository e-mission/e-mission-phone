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
import { displayErrorMsg, logDebug, logWarn } from '../plugin/logger';
import useAppConfig from '../useAppConfig';
import { ServerConnConfig } from '../types/appConfigTypes';
import DateSelect from '../diary/list/DateSelect';
import TimelineContext from '../TimelineContext';
import { isoDateRangeToTsRange, isoDatesDifference } from '../diary/timelineHelper';
import { MetricsSummaries } from 'e-mission-common';

const DEFAULT_SECTIONS_TO_SHOW = ['footprint', 'active_travel', 'summary'] as const;
export const METRIC_LIST = ['duration', 'mean_speed', 'count', 'distance'] as const;
const DEFAULT_SUMMARY_LIST = ['distance', 'count', 'duration'] as const;

async function fetchMetricsFromServer(
  type: 'user' | 'aggregate',
  dateRange: [string, string],
  serverConnConfig: ServerConnConfig,
) {
  const [startTs, endTs] = isoDateRangeToTsRange(dateRange);
  logDebug('MetricsTab: fetching metrics from server for ts range ' + startTs + ' to ' + endTs);
  const query = {
    freq: 'D',
    start_time: startTs,
    end_time: endTs,
    metric_list: METRIC_LIST,
    is_return_aggregate: type == 'aggregate',
  };
  if (type == 'user') return getMetrics('timestamp', query);
  return getAggregateData('result/metrics/timestamp', query, serverConnConfig);
}

const MetricsTab = () => {
  const appConfig = useAppConfig();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { getFormattedSpeed, speedSuffix, getFormattedDistance, distanceSuffix } =
    useImperialConfig();
  const {
    dateRange,
    setDateRange,
    timelineMap,
    timelineLabelMap,
    timelineIsLoading,
    refreshTimeline,
    loadMoreDays,
  } = useContext(TimelineContext);

  const [aggMetrics, setAggMetrics] = useState<MetricsData | undefined>(undefined);

  // user metrics are computed on the phone from the timeline data
  const userMetrics = useMemo(() => {
    console.time('MetricsTab: generate_summaries');
    if (!timelineMap) return;
    console.time('MetricsTab: timelineMap.values()');
    const timelineValues = [...timelineMap.values()];
    console.timeEnd('MetricsTab: timelineMap.values()');
    const result = MetricsSummaries.generate_summaries(
      METRIC_LIST,
      timelineValues,
      timelineLabelMap,
    ) as MetricsData;
    console.timeEnd('MetricsTab: generate_summaries');
    return result;
  }, [timelineMap]);

  // at least 2 weeks of timeline data should be loaded for the user metrics
  useEffect(() => {
    if (!appConfig?.server) return;
    const dateRangeDays = isoDatesDifference(...dateRange);

    // this tab uses the last 2 weeks of data; if we need more, we should fetch it
    if (dateRangeDays < 14) {
      if (timelineIsLoading) {
        logDebug('MetricsTab: timeline is still loading, not loading more days yet');
      } else {
        logDebug('MetricsTab: loading more days');
        loadMoreDays('past', 14 - dateRangeDays);
      }
    } else {
      logDebug('MetricsTab: date range >= 14 days, not loading more days');
    }
  }, [dateRange, timelineIsLoading, appConfig?.server]);

  // aggregate metrics fetched from the server whenever the date range is set
  useEffect(() => {
    logDebug('MetricsTab: dateRange updated to ' + JSON.stringify(dateRange));
    const dateRangeDays = isoDatesDifference(...dateRange);
    if (dateRangeDays < 14) {
      logDebug('MetricsTab: date range < 14 days, not loading aggregate metrics yet');
    } else {
      loadMetricsForPopulation('aggregate', dateRange);
    }
  }, [dateRange]);

  async function loadMetricsForPopulation(
    population: 'user' | 'aggregate',
    dateRange: [string, string],
  ) {
    try {
      logDebug(`MetricsTab: fetching metrics for population ${population}'
        in date range ${JSON.stringify(dateRange)}`);
      const serverResponse: any = await fetchMetricsFromServer(
        population,
        dateRange,
        appConfig.server,
      );
      logDebug('MetricsTab: received metrics: ' + JSON.stringify(serverResponse));
      const metrics = {};
      const dataKey = population == 'user' ? 'user_metrics' : 'aggregate_metrics';
      METRIC_LIST.forEach((metricName, i) => {
        metrics[metricName] = serverResponse[dataKey][i];
      });
      logDebug('MetricsTab: parsed metrics: ' + JSON.stringify(metrics));
      if (population == 'user') {
        // setUserMetrics(metrics as MetricsData);
      } else {
        setAggMetrics(metrics as MetricsData);
      }
    } catch (e) {
      logWarn(e + t('errors.while-loading-metrics')); // replace with displayErr
    }
  }

  const sectionsToShow =
    appConfig?.metrics?.phone_dashboard_ui?.sections || DEFAULT_SECTIONS_TO_SHOW;
  const summaryList =
    appConfig?.metrics?.phone_dashboard_ui?.summary_options?.metrics_list ?? DEFAULT_SUMMARY_LIST;
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = windowWidth * 0.88;

  return (
    <>
      <NavBar isLoading={Boolean(timelineIsLoading)}>
        <Appbar.Content title={t('metrics.dashboard-tab')} />
        <DateSelect
          mode="range"
          onChoose={({ startDate, endDate }) => {
            const start = DateTime.fromJSDate(startDate).toISODate();
            const end = DateTime.fromJSDate(endDate).toISODate();
            if (!start || !end) return displayErrorMsg('Invalid date');
            setDateRange([start, end]);
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
            {summaryList.includes('distance') && (
              <MetricsCard
                cardTitle={t('main-metrics.distance')}
                userMetricsDays={userMetrics?.distance}
                aggMetricsDays={aggMetrics?.distance}
                axisUnits={distanceSuffix}
                unitFormatFn={getFormattedDistance}
              />
            )}
            {summaryList.includes('count') && (
              <MetricsCard
                cardTitle={t('main-metrics.trips')}
                userMetricsDays={userMetrics?.count}
                aggMetricsDays={aggMetrics?.count}
                axisUnits={t('metrics.trips')}
                unitFormatFn={formatForDisplay}
              />
            )}
            {summaryList.includes('duration') && (
              <MetricsCard
                cardTitle={t('main-metrics.duration')}
                userMetricsDays={userMetrics?.duration}
                aggMetricsDays={aggMetrics?.duration}
                axisUnits={t('metrics.hours')}
                unitFormatFn={secondsToHours}
              />
            )}
            {/* <MetricsCard cardTitle={t('main-metrics.mean-speed')}
              userMetricsDays={userMetrics?.mean_speed}
              aggMetricsDays={aggMetrics?.mean_speed}
              axisUnits={speedSuffix}
              unitFormatFn={getFormattedSpeed} /> */}
          </Carousel>
        )}
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
