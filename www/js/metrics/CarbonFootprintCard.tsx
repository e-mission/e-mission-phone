import React, { useState, useMemo, useContext } from 'react';
import { View } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { MetricsData } from './metricsTypes';
import { cardStyles } from './MetricsTab';
import {
  getFootprintForMetrics,
  getHighestFootprint,
  getHighestFootprintForDistance,
} from './footprintHelper';
import {
  formatDateRangeOfDays,
  parseDataFromMetrics,
  generateSummaryFromData,
  calculatePercentChange,
  segmentDaysByWeeks,
  isCustomLabels,
  MetricsSummary,
  dateForDayOfMetricData,
} from './metricsHelper';
import { useTranslation } from 'react-i18next';
import BarChart from '../components/BarChart';
import ChangeIndicator, { CarbonChange } from './ChangeIndicator';
import color from 'color';
import { useAppTheme } from '../appTheme';
import { logDebug, logWarn } from '../plugin/logger';
import TimelineContext from '../TimelineContext';
import { isoDatesDifference } from '../diary/timelineHelper';

type Props = { userMetrics?: MetricsData; aggMetrics?: MetricsData };
const CarbonFootprintCard = ({ userMetrics, aggMetrics }: Props) => {
  const { colors } = useAppTheme();
  const { dateRange } = useContext(TimelineContext);
  const { t } = useTranslation();

  const [emissionsChange, setEmissionsChange] = useState<CarbonChange>(undefined);

  const userCarbonRecords = useMemo(() => {
    if (userMetrics?.distance?.length) {
      //separate data into weeks
      const [thisWeekDistance, lastWeekDistance] = segmentDaysByWeeks(
        userMetrics?.distance,
        dateRange[1],
      );

      //formatted data from last week, if exists (14 days ago -> 8 days ago)
      let userLastWeekModeMap = {};
      let userLastWeekSummaryMap = {};
      if (
        lastWeekDistance &&
        isoDatesDifference(dateRange[0], dateForDayOfMetricData(lastWeekDistance[0])) >= 0
      ) {
        userLastWeekModeMap = parseDataFromMetrics(lastWeekDistance, 'user');
        userLastWeekSummaryMap = generateSummaryFromData(userLastWeekModeMap, 'distance');
      }

      //formatted distance data from this week (7 days ago -> yesterday)
      let userThisWeekModeMap = parseDataFromMetrics(thisWeekDistance, 'user');
      let userThisWeekSummaryMap = generateSummaryFromData(userThisWeekModeMap, 'distance');
      let worstDistance = userThisWeekSummaryMap.reduce(
        (prevDistance, currModeSummary) => prevDistance + currModeSummary.values,
        0,
      );

      //setting up data to be displayed
      let graphRecords: { label: string; x: number | string; y: number | string }[] = [];

      //calculate low-high and format range for prev week, if exists (14 days ago -> 8 days ago)
      let userPrevWeek;
      if (userLastWeekSummaryMap[0]) {
        userPrevWeek = {
          low: getFootprintForMetrics(userLastWeekSummaryMap, 0),
          high: getFootprintForMetrics(userLastWeekSummaryMap, getHighestFootprint()),
        };
        graphRecords.push({
          label: t('main-metrics.unlabeled'),
          x: userPrevWeek.high - userPrevWeek.low,
          y: `${t('main-metrics.prev-week')}\n(${formatDateRangeOfDays(lastWeekDistance)})`,
        });
        graphRecords.push({
          label: t('main-metrics.labeled'),
          x: userPrevWeek.low,
          y: `${t('main-metrics.prev-week')}\n(${formatDateRangeOfDays(lastWeekDistance)})`,
        });
      }

      //calculate low-high and format range for past week (7 days ago -> yesterday)
      let userPastWeek = {
        low: getFootprintForMetrics(userThisWeekSummaryMap, 0),
        high: getFootprintForMetrics(userThisWeekSummaryMap, getHighestFootprint()),
      };
      graphRecords.push({
        label: t('main-metrics.unlabeled'),
        x: userPastWeek.high - userPastWeek.low,
        y: `${t('main-metrics.past-week')}\n(${formatDateRangeOfDays(thisWeekDistance)})`,
      });
      graphRecords.push({
        label: t('main-metrics.labeled'),
        x: userPastWeek.low,
        y: `${t('main-metrics.past-week')}\n(${formatDateRangeOfDays(thisWeekDistance)})`,
      });
      if (userPrevWeek) {
        let pctChange = calculatePercentChange(userPastWeek, userPrevWeek);
        setEmissionsChange(pctChange);
      }

      //calculate worst-case carbon footprint
      let worstCarbon = getHighestFootprintForDistance(worstDistance);
      graphRecords.push({
        label: t('main-metrics.labeled'),
        x: worstCarbon,
        y: `${t('main-metrics.worst-case')}`,
      });

      return graphRecords;
    }
  }, [userMetrics?.distance]);

  const groupCarbonRecords = useMemo(() => {
    if (aggMetrics?.distance?.length) {
      //separate data into weeks
      const thisWeekDistance = segmentDaysByWeeks(aggMetrics?.distance, dateRange[1])[0];
      logDebug(`groupCarbonRecords: aggMetrics = ${JSON.stringify(aggMetrics)}; 
       thisWeekDistance = ${JSON.stringify(thisWeekDistance)}`);

      let aggThisWeekModeMap = parseDataFromMetrics(thisWeekDistance, 'aggregate');
      let aggThisWeekSummary = generateSummaryFromData(aggThisWeekModeMap, 'distance');

      // Issue 422:
      // https://github.com/e-mission/e-mission-docs/issues/422
      let aggCarbonData: MetricsSummary[] = [];
      for (let i in aggThisWeekSummary) {
        aggCarbonData.push(aggThisWeekSummary[i]);
        if (isNaN(aggCarbonData[i].values)) {
          logWarn(`WARNING in calculating groupCarbonRecords: value is NaN for mode 
            ${aggCarbonData[i].key}, changing to 0`);
          aggCarbonData[i].values = 0;
        }
      }

      let groupRecords: { label: string; x: number | string; y: number | string }[] = [];

      let aggCarbon = {
        low: getFootprintForMetrics(aggCarbonData, 0),
        high: getFootprintForMetrics(aggCarbonData, getHighestFootprint()),
      };
      logDebug(`groupCarbonRecords: aggCarbon = ${JSON.stringify(aggCarbon)}`);
      groupRecords.push({
        label: t('main-metrics.unlabeled'),
        x: aggCarbon.high - aggCarbon.low,
        y: `${t('main-metrics.average')}\n(${formatDateRangeOfDays(thisWeekDistance)})`,
      });
      groupRecords.push({
        label: t('main-metrics.labeled'),
        x: aggCarbon.low,
        y: `${t('main-metrics.average')}\n(${formatDateRangeOfDays(thisWeekDistance)})`,
      });

      return groupRecords;
    }
  }, [aggMetrics]);

  const chartData = useMemo(() => {
    let tempChartData: { label: string; x: number | string; y: number | string }[] = [];
    if (userCarbonRecords?.length) {
      tempChartData = tempChartData.concat(userCarbonRecords);
    }
    if (groupCarbonRecords?.length) {
      tempChartData = tempChartData.concat(groupCarbonRecords);
    }
    tempChartData = tempChartData.reverse();
    return tempChartData;
  }, [userCarbonRecords, groupCarbonRecords]);

  const cardSubtitleText = useMemo(() => {
    if (!aggMetrics?.distance?.length) return;
    const recentEntries = segmentDaysByWeeks(aggMetrics?.distance, dateRange[1])
      .slice(0, 2)
      .reverse()
      .flat();
    const recentEntriesRange = formatDateRangeOfDays(recentEntries);
    return `${t('main-metrics.estimated-emissions')}, (${recentEntriesRange})`;
  }, [aggMetrics?.distance]);

  //hardcoded here, could be read from config at later customization?
  let carbonGoals = [
    {
      label: t('main-metrics.us-2050-goal'),
      value: 14,
      color: color(colors.warn).darken(0.65).saturate(0.5).rgb().toString(),
    },
    {
      label: t('main-metrics.us-2030-goal'),
      value: 54,
      color: color(colors.danger).saturate(0.5).rgb().toString(),
    },
  ];
  let meter = { dash_key: t('main-metrics.unlabeled'), high: 54, middle: 14 };

  return (
    <Card style={cardStyles.card} contentStyle={{ flex: 1 }}>
      <Card.Title
        title={t('main-metrics.footprint')}
        titleVariant="titleLarge"
        titleStyle={cardStyles.titleText(colors)}
        subtitle={cardSubtitleText}
        subtitleStyle={[cardStyles.titleText(colors), cardStyles.subtitleText]}
        right={(props) => <ChangeIndicator change={emissionsChange}></ChangeIndicator>}
        style={cardStyles.title(colors)}
      />
      <Card.Content style={cardStyles.content}>
        {chartData?.length > 0 ? (
          <View>
            <BarChart
              records={chartData}
              axisTitle={t('main-metrics.footprint-label')}
              isHorizontal={true}
              timeAxis={false}
              stacked={true}
              lineAnnotations={carbonGoals}
              meter={meter}
            />
            <Text
              variant="labelSmall"
              style={{ textAlign: 'left', fontWeight: '400', marginTop: 'auto', paddingTop: 10 }}>
              {t('main-metrics.us-goals-footnote')}
            </Text>
          </View>
        ) : (
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Text variant="labelMedium" style={{ textAlign: 'center' }}>
              {t('metrics.chart-no-data')}
            </Text>
          </View>
        )}
      </Card.Content>
    </Card>
  );
};

export default CarbonFootprintCard;
