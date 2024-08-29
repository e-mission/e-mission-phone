import React, { useEffect, useState, useMemo, useContext } from 'react';
import { ScrollView } from 'react-native';
import { Appbar } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { DateTime } from 'luxon';
import NavBar from '../components/NavBar';
import { MetricsData } from './metricsTypes';
import { getAggregateData } from '../services/commHelper';
import { displayError, displayErrorMsg, logDebug } from '../plugin/logger';
import useAppConfig from '../useAppConfig';
import { AppConfig, MetricList, MetricsUiSection } from '../types/appConfigTypes';
import DateSelect from '../diary/list/DateSelect';
import TimelineContext, { TimelineLabelMap, TimelineMap } from '../TimelineContext';
import { isoDatesDifference } from '../diary/timelineHelper';
import { metrics_summaries } from 'e-mission-common';
import CarbonSection from './carbon/CarbonSection';
import EnergySection from './energy/EnergySection';
import SummarySection from './summary/SummarySection';
import ActiveTravelSection from './activetravel/ActiveTravelSection';
import SurveysSection from './surveys/SurveysSection';

// 2 weeks of data is needed in order to compare "past week" vs "previous week"
const N_DAYS_TO_LOAD = 14; // 2 weeks
const DEFAULT_SECTIONS_TO_SHOW: MetricsUiSection[] = [
  'carbon',
  'energy',
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
      console.debug('MetricsTab: received aggMetrics', response);
      return response as MetricsData;
    })
    .catch((e) => {
      displayError(e, 'Error fetching aggregate metrics');
      return undefined;
    });
}

const MetricsTab = () => {
  const appConfig = useAppConfig();
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

  const readyToLoad = useMemo(() => {
    if (!appConfig || !dateRange) return false;
    const dateRangeDays = isoDatesDifference(...dateRange);
    if (dateRangeDays < N_DAYS_TO_LOAD) {
      logDebug('MetricsTab: not enough days loaded, trying to load more');
      const loadingMore = loadMoreDays('past', N_DAYS_TO_LOAD - dateRangeDays);
      if (loadingMore !== false) return false;
      logDebug('MetricsTab: no more days can be loaded, continuing with what we have');
    }
    return true;
  }, [appConfig, dateRange]);

  useEffect(() => {
    if (!readyToLoad || !appConfig || timelineIsLoading || !timelineMap || !timelineLabelMap)
      return;
    logDebug('MetricsTab: ready to compute userMetrics');
    computeUserMetrics(metricList, timelineMap, timelineLabelMap, appConfig).then((result) =>
      setUserMetrics(result),
    );
  }, [readyToLoad, appConfig, timelineIsLoading, timelineMap, timelineLabelMap]);

  useEffect(() => {
    if (!readyToLoad || !appConfig || !dateRange) return;
    logDebug('MetricsTab: ready to fetch aggMetrics');
    setAggMetricsIsLoading(true);
    fetchAggMetrics(metricList, dateRange, appConfig).then((response) => {
      setAggMetricsIsLoading(false);
      setAggMetrics(response);
    });
  }, [readyToLoad, appConfig, dateRange]);

  const sectionsToShow =
    appConfig?.metrics?.phone_dashboard_ui?.sections || DEFAULT_SECTIONS_TO_SHOW;
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
        {[
          ['carbon', CarbonSection],
          ['energy', EnergySection],
          ['active_travel', ActiveTravelSection],
          ['summary', SummarySection],
          // ['engagement', EngagementSection],
          ['surveys', SurveysSection],
        ].map(([section, component]: any) => {
          if (sectionsToShow.includes(section)) {
            return React.createElement(component, { userMetrics, aggMetrics, metricList });
          }
        })}
      </ScrollView>
    </>
  );
};

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
