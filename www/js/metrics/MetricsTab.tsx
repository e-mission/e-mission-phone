import React, { useEffect, useState, useMemo } from "react";
import { angularize, getAngularService } from "../angular-react-helper";
import { View, ScrollView, useWindowDimensions } from "react-native";
import { Appbar } from "react-native-paper";
import NavBarButton from "../components/NavBarButton";
import { useTranslation } from "react-i18next";
import { DateTime } from "luxon";
import { UserMetrics } from "./metricsTypes";
import MetricsCard from "./MetricsCard";
import { useImperialConfig } from "../config/useImperialConfig";

export const METRIC_LIST = ['duration', 'mean_speed', 'count', 'distance'] as const;

const MetricsTab = () => {

  const { t } = useTranslation();
  const { distanceSuffix, speedSuffix } = useImperialConfig();
  const CommHelper = getAngularService('CommHelper');

  const [userMetrics, setUserMetrics] = useState<UserMetrics>(null);
  // const [aggMetrics, setAggMetrics] = useState({});

  const tsRange = useMemo(() => {
    const now = DateTime.utc().startOf('day');
    const start = now.minus({ days: 14 });
    const end = now.minus({ days: 1 });
    return {
      start_time: start.toSeconds(),
      end_time: end.toSeconds()
    }
  }, [])

  useEffect(() => {
    fetchMetricsFromServer();
  }, []);

  async function fetchMetricsFromServer() {
    const serverResponse = await CommHelper.getMetrics('timestamp', {
      freq: 'D',
      ...tsRange,
      metric_list: METRIC_LIST,
      is_return_aggregate: false
    });
    console.debug("Got metrics = ", serverResponse);
    const userMetrics = {};
    METRIC_LIST.forEach((metricName, i) => {
      userMetrics[metricName] = serverResponse['user_metrics'][i];
    });
    setUserMetrics(userMetrics as UserMetrics);
  }

  function refresh() {
    // TODO
  }

  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = windowWidth * .85;

  return (<>
    <Appbar.Header statusBarHeight={12} elevated={true} style={{ height: 46, backgroundColor: 'white', elevation: 3 }}>
      <Appbar.Content title={t("main-metrics.dashboard")} />
      <NavBarButton icon='calendar' onPressAction={()=>{}}>
        Date
      </NavBarButton>
      <Appbar.Action icon="refresh" size={32} onPress={() => refresh()} />
    </Appbar.Header>
    <ScrollView>
      <ScrollView horizontal={true}
          decelerationRate={0}
          snapToInterval={cardWidth + cardMargin*2}
          snapToAlignment={"center"}
          // @ts-ignore, RN doesn't recognize `scrollSnapType`, but it does work on RN Web
          style={{scrollSnapType: 'x mandatory', paddingVertical: 10}}>
        <MetricsCard cardTitle={t('main-metrics.distance')}
          metricDataDays={userMetrics?.distance}
          axisUnits={distanceSuffix}
          style={s.card(cardWidth)} />
        <MetricsCard cardTitle={t('main-metrics.trips')}
          metricDataDays={userMetrics?.count}
          axisUnits={t('main-metrics.trips')}
          style={s.card(cardWidth)} />
        <MetricsCard cardTitle={t('main-metrics.duration')}
          metricDataDays={userMetrics?.duration}
          axisUnits={t('main-metrics.duration')}
          style={s.card(cardWidth)} />
        <MetricsCard cardTitle={t('main-metrics.mean-speed')}
          metricDataDays={userMetrics?.mean_speed}
          axisUnits={speedSuffix}
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

angularize(MetricsTab, 'MetricsTab', 'emission.main.metricstab');
export default MetricsTab;
