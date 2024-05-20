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
import { AppConfig, MetricsList, MetricsUiSection } from '../types/appConfigTypes';
import DateSelect from '../diary/list/DateSelect';
import TimelineContext from '../TimelineContext';
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
export const DEFAULT_METRICS_LIST: MetricsList = {
  distance: ['mode_confirm'],
  duration: ['mode_confirm'],
  count: ['mode_confirm'],
  response_count: ['mode_confirm'],
};

export type SurveyObject = {
  answered: number;
  unanswered: number;
  mismatched: number;
};

export type SurveyMetric = {
  me: {
    overview: SurveyObject;
    rank: number;
    details: {
      [key: string]: SurveyObject;
    };
  };
  others: {
    overview: SurveyObject;
    leaderboard: SurveyObject[];
  };
};

const DUMMY_SURVEY_METRIC: SurveyMetric = {
  me: {
    overview: {
      answered: 5,
      unanswered: 5,
      mismatched: 0,
    },
    rank: 5,
    details: {
      ev_roaming_trip: {
        answered: 10,
        unanswered: 5,
        mismatched: 0,
      },
      ev_return_trip: {
        answered: 10,
        unanswered: 10,
        mismatched: 0,
      },
      gas_car_trip: {
        answered: 5,
        unanswered: 10,
        mismatched: 0,
      },
    },
  },
  others: {
    overview: {
      answered: 30,
      unanswered: 60,
      mismatched: 0,
    },
    leaderboard: [
      {
        answered: 10,
        unanswered: 0,
        mismatched: 0,
      },
      {
        answered: 9,
        unanswered: 1,
        mismatched: 0,
      },
      {
        answered: 8,
        unanswered: 2,
        mismatched: 0,
      },
      {
        answered: 7,
        unanswered: 3,
        mismatched: 0,
      },
      {
        answered: 6,
        unanswered: 4,
        mismatched: 0,
      },
      {
        answered: 4,
        unanswered: 6,
        mismatched: 0,
      },
      {
        answered: 2,
        unanswered: 8,
        mismatched: 0,
      },
      {
        answered: 1,
        unanswered: 9,
        mismatched: 0,
      },
    ],
  },
};

async function fetchMetricsFromServer(
  type: 'user' | 'aggregate',
  dateRange: [string, string],
  metricsList: MetricsList,
  appConfig: AppConfig,
) {
  const [startTs, endTs] = isoDateRangeToTsRange(dateRange);
  logDebug('MetricsTab: fetching metrics from server for ts range ' + startTs + ' to ' + endTs);
  const query = {
    freq: 'D',
    start_time: dateRange[0],
    end_time: dateRange[1],
    metric_list: metricsList,
    is_return_aggregate: type == 'aggregate',
    app_config: { survey_info: appConfig.survey_info },
  };
  if (type == 'user') return getMetrics('timestamp', query);
  return getAggregateData('result/metrics/yyyy_mm_dd', query, appConfig.server);
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

  const metricsList = appConfig?.metrics?.phone_dashboard_ui?.metrics_list ?? DEFAULT_METRICS_LIST;

  const [aggMetrics, setAggMetrics] = useState<MetricsData | undefined>(undefined);
  // user metrics are computed on the phone from the timeline data
  const userMetrics = useMemo(() => {
    if (!timelineMap) return;
    const timelineValues = [...timelineMap.values()];
    const result = metrics_summaries.generate_summaries(
      { ...metricsList },
      timelineValues,
      timelineLabelMap,
    ) as MetricsData;
    logDebug('MetricsTab: computed userMetrics' + JSON.stringify(result));
    return result;
  }, [timelineMap]);

  // at least N_DAYS_TO_LOAD of timeline data should be loaded for the user metrics
  useEffect(() => {
    if (!appConfig) return;
    const dateRangeDays = isoDatesDifference(...dateRange);

    // this tab uses the last N_DAYS_TO_LOAD of data; if we need more, we should fetch it
    if (dateRangeDays < N_DAYS_TO_LOAD) {
      if (timelineIsLoading) {
        logDebug('MetricsTab: timeline is still loading, not loading more days yet');
      } else {
        logDebug('MetricsTab: loading more days');
        loadMoreDays('past', N_DAYS_TO_LOAD - dateRangeDays);
      }
    } else {
      logDebug(`MetricsTab: date range >= ${N_DAYS_TO_LOAD} days, not loading more days`);
    }
  }, [dateRange, timelineIsLoading, appConfig]);

  // aggregate metrics fetched from the server whenever the date range is set
  useEffect(() => {
    if (!appConfig) return;
    logDebug('MetricsTab: dateRange updated to ' + JSON.stringify(dateRange));
    const dateRangeDays = isoDatesDifference(...dateRange);
    if (dateRangeDays < N_DAYS_TO_LOAD) {
      logDebug(
        `MetricsTab: date range < ${N_DAYS_TO_LOAD} days, not loading aggregate metrics yet`,
      );
    } else {
      loadMetricsForPopulation('aggregate', dateRange, appConfig);
    }
  }, [dateRange, appConfig]);

  async function loadMetricsForPopulation(
    population: 'user' | 'aggregate',
    dateRange: [string, string],
    appConfig: AppConfig,
  ) {
    try {
      logDebug(`MetricsTab: fetching metrics for population ${population}'
        in date range ${JSON.stringify(dateRange)}`);
      const serverResponse: any = await fetchMetricsFromServer(
        population,
        dateRange,
        metricsList,
        appConfig,
      );
      logDebug('MetricsTab: received metrics: ' + JSON.stringify(serverResponse));
      // const metrics = {};
      // const dataKey = population == 'user' ? 'user_metrics' : 'aggregate_metrics';
      // METRIC_LIST.forEach((metricName, i) => {
      //   metrics[metricName] = serverResponse[dataKey][i];
      // });
      // logDebug('MetricsTab: parsed metrics: ' + JSON.stringify(metrics));
      // if (population == 'user') {
      //   // setUserMetrics(metrics as MetricsData);
      // } else {
      console.debug('MetricsTab: aggMetrics', serverResponse);
      setAggMetrics(serverResponse as MetricsData);
      // }
    } catch (e) {
      logWarn(e + t('errors.while-loading-metrics')); // replace with displayErr
    }
  }

  const sectionsToShow =
    appConfig?.metrics?.phone_dashboard_ui?.sections || DEFAULT_SECTIONS_TO_SHOW;
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = windowWidth * 0.88;
  const studyStartDate = `${appConfig?.intro.start_month} / ${appConfig?.intro.start_year}`;

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
            {(userMetrics?.distance || aggMetrics?.distance) && (
              <MetricsCard
                cardTitle={t('main-metrics.distance')}
                userMetricsDays={userMetrics?.distance}
                aggMetricsDays={aggMetrics?.distance}
                axisUnits={distanceSuffix}
                unitFormatFn={getFormattedDistance}
              />
            )}
            {(userMetrics?.count || aggMetrics?.count) && (
              <MetricsCard
                cardTitle={t('main-metrics.trips')}
                userMetricsDays={userMetrics?.count}
                aggMetricsDays={aggMetrics?.count}
                axisUnits={t('metrics.trips')}
                unitFormatFn={formatForDisplay}
              />
            )}
            {(userMetrics?.duration || aggMetrics?.duration) && (
              <MetricsCard
                cardTitle={t('main-metrics.duration')}
                userMetricsDays={userMetrics?.duration}
                aggMetricsDays={aggMetrics?.duration}
                axisUnits={t('metrics.hours')}
                unitFormatFn={secondsToHours}
              />
            )}
            {(userMetrics?.response_count || aggMetrics?.response_count) && (
              <MetricsCard
                cardTitle={t('main-metrics.responses')}
                userMetricsDays={userMetrics?.response_count}
                aggMetricsDays={aggMetrics?.response_count}
                axisUnits={t('metrics.responses')}
                unitFormatFn={formatForDisplay}
              />
            )}
            {/* <MetricsCard cardTitle={t('main-metrics.mean-speed')}
              userMetricsDays={userMetrics?.mean_speed}
              aggMetricsDays={aggMetrics?.mean_speed}
              axisUnits={speedSuffix}
              unitFormatFn={getFormattedSpeed} /> */}
          </Carousel>
        )}
        {sectionsToShow.includes('surveys') && (
          <Carousel cardWidth={cardWidth} cardMargin={cardMargin}>
            <SurveyComparisonCard surveyMetric={DUMMY_SURVEY_METRIC} />
            <SurveyTripCategoriesCard surveyTripCategoryMetric={DUMMY_SURVEY_METRIC.me?.details} />
          </Carousel>
        )}
        {sectionsToShow.includes('engagement') && (
          <Carousel cardWidth={cardWidth} cardMargin={cardMargin}>
            <SurveyLeaderboardCard
              surveyMetric={DUMMY_SURVEY_METRIC}
              studyStartDate={studyStartDate}
            />
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
