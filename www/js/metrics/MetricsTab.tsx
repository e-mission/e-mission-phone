import React, { useEffect, useState, useMemo, useContext } from 'react';
import { Appbar } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { DateTime } from 'luxon';
import NavBar from '../components/NavBar';
import { MetricsData } from './metricsTypes';
import { getAggregateData } from '../services/commHelper';
import { displayError, displayErrorMsg, logDebug } from '../plugin/logger';
import useAppConfig from '../useAppConfig';
import { AppConfig, MetricList } from '../types/appConfigTypes';
import DateSelect from '../diary/list/DateSelect';
import TimelineContext, { TimelineLabelMap, TimelineMap } from '../TimelineContext';
import { metrics_summaries } from 'e-mission-common';
import MetricsScreen from './MetricsScreen';
import { LabelOptions } from '../types/labelTypes';
import { useAppTheme } from '../appTheme';
import { isoDatesDifference } from '../datetimeUtil';

const N_DAYS_TO_LOAD = 14; // 2 weeks
export const DEFAULT_METRIC_LIST: MetricList = {
  footprint: ['mode_confirm'],
  distance: ['mode_confirm'],
  duration: ['mode_confirm'],
  count: ['mode_confirm'],
};

async function computeUserMetrics(
  metricList: MetricList,
  timelineMap: TimelineMap,
  appConfig: AppConfig,
  timelineLabelMap: TimelineLabelMap | null,
  labelOptions: LabelOptions,
) {
  try {
    const timelineValues = [...timelineMap.values()];
    const app_config = {
      ...appConfig,
      ...(metricList.footprint ? { label_options: labelOptions } : {}),
    };
    const result = await metrics_summaries.generate_summaries(
      { ...metricList },
      timelineValues,
      app_config,
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
  labelOptions: LabelOptions,
) {
  logDebug('MetricsTab: fetching agg metrics from server for dateRange ' + dateRange);
  const query = {
    freq: 'D',
    start_time: dateRange[0],
    end_time: dateRange[1],
    metric_list: metricList,
    is_return_aggregate: true,
    app_config: {
      ...(metricList.response_count ? { survey_info: appConfig.survey_info } : {}),
      ...(metricList.footprint ? { label_options: labelOptions } : {}),
    },
  };
  return getAggregateData('result/metrics/yyyy_mm_dd', query, appConfig.server)
    .then((response) => {
      console.debug('MetricsTab: received aggMetrics', response);
      return response as MetricsData;
    })
    .catch((e) => {
      displayError(e, 'Error fetching aggregate metrics');
      return undefined;
    });
}

const MetricsTab = () => {
  const { colors } = useAppTheme();
  const appConfig = useAppConfig();
  const { t } = useTranslation();
  const {
    queriedDateRange,
    timelineMap,
    timelineLabelMap,
    labelOptions,
    timelineIsLoading,
    refreshTimeline,
    loadMoreDays,
    loadDateRange,
  } = useContext(TimelineContext);

  const metricList = appConfig?.metrics?.phone_dashboard_ui?.metric_list || DEFAULT_METRIC_LIST;

  const [userMetrics, setUserMetrics] = useState<MetricsData | undefined>(undefined);
  const [aggMetrics, setAggMetrics] = useState<MetricsData | undefined>(undefined);
  const [aggMetricsIsLoading, setAggMetricsIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!isInitialized && appConfig && queriedDateRange) {
      logDebug('MetricsTab: initializing');
      const queriedNumDays = isoDatesDifference(...queriedDateRange) + 1;
      if (queriedNumDays < N_DAYS_TO_LOAD) {
        logDebug('MetricsTab: not enough days loaded, trying to load more');
        const loadingMore = loadMoreDays('past', N_DAYS_TO_LOAD - queriedNumDays);
        if (!loadingMore) {
          logDebug('MetricsTab: no more days can be loaded, continuing with what we have');
          setIsInitialized(true);
        }
      } else {
        setIsInitialized(true);
      }
    }
  }, [appConfig, queriedDateRange]);

  useEffect(() => {
    if (
      !isInitialized ||
      !appConfig ||
      timelineIsLoading ||
      !timelineMap ||
      !timelineLabelMap ||
      !labelOptions
    )
      return;
    logDebug('MetricsTab: ready to compute userMetrics');
    computeUserMetrics(metricList, timelineMap, appConfig, timelineLabelMap, labelOptions).then(
      (result) => setUserMetrics(result),
    );
  }, [isInitialized, appConfig, timelineIsLoading, timelineMap, timelineLabelMap]);

  useEffect(() => {
    if (!isInitialized || !appConfig || !queriedDateRange || !labelOptions) return;
    logDebug('MetricsTab: ready to fetch aggMetrics');
    setAggMetricsIsLoading(true);
    fetchAggMetrics(metricList, queriedDateRange, appConfig, labelOptions).then((response) => {
      setAggMetricsIsLoading(false);
      setAggMetrics(response);
    });
  }, [isInitialized, appConfig, queriedDateRange]);

  function refresh() {
    refreshTimeline();
    setIsInitialized(false);
    setAggMetricsIsLoading(true);
  }

  return (
    <>
      <NavBar
        isLoading={Boolean(timelineIsLoading || aggMetricsIsLoading)}
        elevated={false}
        style={{ backgroundColor: colors.elevation.level2 }}>
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
        <Appbar.Action
          icon="refresh"
          size={32}
          onPress={refresh}
          style={{ margin: 0, marginLeft: 'auto' }}
        />
      </NavBar>
      <MetricsScreen {...{ userMetrics, aggMetrics, metricList }} />
    </>
  );
};

export default MetricsTab;
