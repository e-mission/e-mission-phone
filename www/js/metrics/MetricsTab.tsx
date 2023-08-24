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
    <ScrollView>
      <ActiveMinutesCard userMetrics={userMetrics} />
      <ScrollView horizontal={true}
          decelerationRate={0}
          snapToInterval={cardWidth + cardMargin*2}
          snapToAlignment={"center"}
          // @ts-ignore, RN doesn't recognize `scrollSnapType`, but it does work on RN Web
          style={{scrollSnapType: 'x mandatory', paddingVertical: 10}}>
        <MetricsCard cardTitle={t('main-metrics.distance')}
          userMetricsDays={userMetrics?.distance}
          aggMetricsDays={aggMetrics?.distance}
          axisUnits={distanceSuffix}
          unitFormatFn={getFormattedDistance}
          style={s.card(cardWidth)} />
        <MetricsCard cardTitle={t('main-metrics.trips')}
          userMetricsDays={userMetrics?.count}
          aggMetricsDays={aggMetrics?.count}
          axisUnits={t('metrics.trips')}
          unitFormatFn={formatForDisplay}
          style={s.card(cardWidth)} />
        <MetricsCard cardTitle={t('main-metrics.duration')}
          userMetricsDays={userMetrics?.duration}
          aggMetricsDays={aggMetrics?.duration}
          axisUnits={t('metrics.hours')}
          unitFormatFn={secondsToHours}
          style={s.card(cardWidth)} />
        <MetricsCard cardTitle={t('main-metrics.mean-speed')}
          userMetricsDays={userMetrics?.mean_speed}
          aggMetricsDays={aggMetrics?.mean_speed}
          axisUnits={speedSuffix}
          unitFormatFn={getFormattedSpeed}
          style={s.card(cardWidth)} />
      </ScrollView>
    </ScrollView>
  </>);
}

const cardMargin = 8;
const s = {
  scroll: {
    scrollSnapType: 'x mandatory',
  },
  card: (cardWidth) => ({
    margin: cardMargin,
    width: cardWidth,
    scrollSnapAlign: 'center',
    scrollSnapStop: 'always',
  }),
};
export const cardStyles: any = {
  title: (colors) => ({
    backgroundColor: colors.primary, paddingHorizontal: 8, minHeight: 60
  }),
  titleText: (colors) => ({
    color: colors.onPrimary,
    fontWeight: '500',
    textAlign: 'center'
  }),
}

angularize(MetricsTab, 'MetricsTab', 'emission.main.metricstab');
export default MetricsTab;
