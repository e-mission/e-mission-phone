import React, { useEffect, useState, useMemo } from "react";
import { angularize, getAngularService } from "../angular-react-helper";
import { View, ScrollView, useWindowDimensions } from "react-native";
import { Appbar } from "react-native-paper";
import NavBarButton from "../components/NavBarButton";
import { useTranslation } from "react-i18next";
import { DateTime } from "luxon";
import { MetricsData } from "./metricsTypes";
import MetricsCard from "./MetricsCard";
import { formatForDisplay, useImperialConfig } from "../config/useImperialConfig";
import MetricsDateSelect from "./MetricsDateSelect";
import ActiveMinutesCard from "./ActiveMinutesCard";
import { secondsToHours, secondsToMinutes } from "./metricsHelper";
import CarbonFootprintCard from "./CarbonFootprintCard";
import Carousel from "../components/Carousel";

export const METRIC_LIST = ['duration', 'mean_speed', 'count', 'distance'] as const;

async function fetchMetricsFromServer(type: 'user'|'aggregate', dateRange: [DateTime, DateTime]) {
  const CommHelper = getAngularService('CommHelper');
  const query = {
    freq: 'D',
    start_time: dateRange[0].toSeconds(),
    end_time: dateRange[1].toSeconds(),
    metric_list: METRIC_LIST,
    is_return_aggregate: (type == 'aggregate'),
  }
  if (type == 'user')
    return CommHelper.getMetrics('timestamp', query);
  return CommHelper.getAggregateData("result/metrics/timestamp", query);
}

const MetricsTab = () => {

  const { t } = useTranslation();
  const { getFormattedSpeed, speedSuffix,
          getFormattedDistance, distanceSuffix } = useImperialConfig();

  const [dateRange, setDateRange] = useState<[DateTime, DateTime]>(() => {
    const now = DateTime.utc().startOf('day');
    const start = now.minus({ days: 14 });
    const end = now.minus({ days: 1 });
    return [start, end];
  });
  const [aggMetrics, setAggMetrics] = useState<MetricsData>(null);
  const [userMetrics, setUserMetrics] = useState<MetricsData>(null);

  useEffect(() => {
    loadMetricsForPopulation('user', dateRange);
    loadMetricsForPopulation('aggregate', dateRange);
  }, [dateRange]);

  async function loadMetricsForPopulation(population: 'user'|'aggregate', dateRange: [DateTime, DateTime]) {
    const serverResponse = await fetchMetricsFromServer(population, dateRange);
    console.debug("Got metrics = ", serverResponse);
    const metrics = {};
    const dataKey = (population == 'user') ? 'user_metrics' : 'aggregate_metrics';
    METRIC_LIST.forEach((metricName, i) => {
      metrics[metricName] = serverResponse[dataKey][i];
    });
    if (population == 'user') {
      setUserMetrics(metrics as MetricsData);
    } else {
      setAggMetrics(metrics as MetricsData);
    }
  }

  function refresh() {
    // TODO
  }

  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = windowWidth * .85;

  return (<>
    <Appbar.Header statusBarHeight={12} elevated={true} style={{ height: 46, backgroundColor: 'white', elevation: 3 }}>
      <Appbar.Content title={t("main-metrics.dashboard")} />
      <MetricsDateSelect dateRange={dateRange} setDateRange={setDateRange} />
      <Appbar.Action icon="refresh" size={32} onPress={() => refresh()} />
    </Appbar.Header>
    <ScrollView style={{paddingVertical: 12}}>
      <CarbonFootprintCard userMetrics={userMetrics} aggMetrics={aggMetrics}></CarbonFootprintCard>
      <ActiveMinutesCard userMetrics={userMetrics} />
      <Carousel cardWidth={cardWidth} cardMargin={cardMargin}>
        <MetricsCard cardTitle={t('main-metrics.distance')}
          userMetricsDays={userMetrics?.distance}
          aggMetricsDays={aggMetrics?.distance}
          axisUnits={distanceSuffix}
          unitFormatFn={getFormattedDistance} />
        <MetricsCard cardTitle={t('main-metrics.trips')}
          userMetricsDays={userMetrics?.count}
          aggMetricsDays={aggMetrics?.count}
          axisUnits={t('metrics.trips')}
          unitFormatFn={formatForDisplay} />
        <MetricsCard cardTitle={t('main-metrics.duration')}
          userMetricsDays={userMetrics?.duration}
          aggMetricsDays={aggMetrics?.duration}
          axisUnits={t('metrics.hours')}
          unitFormatFn={secondsToHours} />
        <MetricsCard cardTitle={t('main-metrics.mean-speed')}
          userMetricsDays={userMetrics?.mean_speed}
          aggMetricsDays={aggMetrics?.mean_speed}
          axisUnits={speedSuffix}
          unitFormatFn={getFormattedSpeed} />
      </Carousel>
    </ScrollView>
  </>);
}

export const cardMargin = 8;

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
    textAlign: 'center'
  }),
  content: {
    padding: 8,
    paddingBottom: 12,
    flex: 1,
  }
}

angularize(MetricsTab, 'MetricsTab', 'emission.main.metricstab');
export default MetricsTab;
