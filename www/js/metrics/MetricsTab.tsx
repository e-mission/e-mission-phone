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
import { isoDateRangeToTsRange } from '../diary/timelineHelper';
import { MetricsSummaries } from '../../../../e-mission-common/js';

export const METRIC_LIST = ['duration', 'mean_speed', 'count', 'distance'] as const;

async function fetchMetricsFromServer(
  type: 'user' | 'aggregate',
  dateRange: [string, string],
  serverConnConfig: ServerConnConfig,
) {
  const [startTs, endTs] = isoDateRangeToTsRange(dateRange);
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

function getLastTwoWeeksDtRange() {
  const now = DateTime.now().startOf('day');
  const start = now.minus({ days: 15 });
  const end = now.minus({ days: 1 });
  return [start, end];
}

const MetricsTab = () => {
  const appConfig = useAppConfig();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { getFormattedSpeed, speedSuffix, getFormattedDistance, distanceSuffix } =
    useImperialConfig();
  const { dateRange, setDateRange, timelineMap, timelineLabelMap, refreshTimeline } =
    useContext(TimelineContext);

  const [aggMetrics, setAggMetrics] = useState<MetricsData | undefined>(undefined);
  const [userMetrics, setUserMetrics] = useState<MetricsData | undefined>(undefined);

  // aggregate metrics are fetched from the server
  useEffect(() => {
    if (!appConfig?.server) return;
    loadMetricsForPopulation('aggregate', dateRange);
  }, [dateRange, appConfig?.server]);

  // user metrics are computed on the phone from the timeline data
  useEffect(() => {
    if (!timelineMap) return;
    const userMetrics = MetricsSummaries.generate_summaries(
      METRIC_LIST,
      [...timelineMap.values()],
      timelineLabelMap,
    ) as MetricsData;
    setUserMetrics(userMetrics);
  }, [timelineMap]);

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
        setUserMetrics(metrics as MetricsData);
      } else {
        setAggMetrics(metrics as MetricsData);
      }
    } catch (e) {
      logWarn(e + t('errors.while-loading-metrics')); // replace with displayErr
    }
  }

  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = windowWidth * 0.88;

  return (
    <>
      <NavBar>
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
        <Carousel cardWidth={cardWidth} cardMargin={cardMargin}>
          <CarbonFootprintCard userMetrics={userMetrics} aggMetrics={aggMetrics} />
          <CarbonTextCard userMetrics={userMetrics} aggMetrics={aggMetrics} />
        </Carousel>
        <Carousel cardWidth={cardWidth} cardMargin={cardMargin}>
          <WeeklyActiveMinutesCard userMetrics={userMetrics} />
          <DailyActiveMinutesCard userMetrics={userMetrics} />
          <ActiveMinutesTableCard userMetrics={userMetrics} />
        </Carousel>
        <Carousel cardWidth={cardWidth} cardMargin={cardMargin}>
          <MetricsCard
            cardTitle={t('main-metrics.distance')}
            userMetricsDays={userMetrics?.distance}
            aggMetricsDays={aggMetrics?.distance}
            axisUnits={distanceSuffix}
            unitFormatFn={getFormattedDistance}
          />
          <MetricsCard
            cardTitle={t('main-metrics.trips')}
            userMetricsDays={userMetrics?.count}
            aggMetricsDays={aggMetrics?.count}
            axisUnits={t('metrics.trips')}
            unitFormatFn={formatForDisplay}
          />
          <MetricsCard
            cardTitle={t('main-metrics.duration')}
            userMetricsDays={userMetrics?.duration}
            aggMetricsDays={aggMetrics?.duration}
            axisUnits={t('metrics.hours')}
            unitFormatFn={secondsToHours}
          />
          {/* <MetricsCard cardTitle={t('main-metrics.mean-speed')}
          userMetricsDays={userMetrics?.mean_speed}
          aggMetricsDays={aggMetrics?.mean_speed}
          axisUnits={speedSuffix}
          unitFormatFn={getFormattedSpeed} /> */}
        </Carousel>
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
