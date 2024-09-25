import React, { useContext, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Card, Checkbox, Text } from 'react-native-paper';
import { metricsStyles } from '../MetricsScreen';
import TimelineContext from '../../TimelineContext';
import {
  aggMetricEntries,
  getColorForModeLabel,
  segmentDaysByWeeks,
  sumMetricEntries,
  trimGroupingPrefix,
} from '../metricsHelper';
import { formatIsoNoYear, isoDateWithOffset } from '../../datetimeUtil';
import { useTranslation } from 'react-i18next';
import BarChart from '../../components/BarChart';
import { ChartRecord } from '../../components/Chart';
import i18next from 'i18next';
import { MetricsData } from '../metricsTypes';
import { GroupingField, MetricList } from '../../types/appConfigTypes';
import { labelKeyToText } from '../../survey/multilabel/confirmHelper';

type Props = {
  type: 'carbon' | 'energy';
  unit: 'kg_co2' | 'kwh';
  title: string;
  axisTitle: string;
  goals;
  addFootnote: (string) => string;
  showUncertainty: boolean;
  userMetrics: MetricsData;
  metricList: MetricList;
};
const WeeklyFootprintCard = ({
  type,
  unit,
  title,
  axisTitle,
  goals,
  showUncertainty,
  addFootnote,
  userMetrics,
  metricList,
}: Props) => {
  const { t } = useTranslation();
  const { dateRange } = useContext(TimelineContext);
  const [groupingField, setGroupingField] = useState<GroupingField | null>(null);

  const weekFootprints = useMemo(() => {
    if (!userMetrics?.footprint?.length) return [];
    const weeks = segmentDaysByWeeks(userMetrics?.footprint, dateRange[1]);
    return weeks.map(
      (week) => [sumMetricEntries(week, 'footprint'), aggMetricEntries(week, 'footprint')] as const,
    );
  }, [userMetrics]);

  const chartRecords = useMemo<ChartRecord[]>(() => {
    let records: ChartRecord[] = [];
    weekFootprints.forEach(([weekSum, weekAgg], i) => {
      const startDate = isoDateWithOffset(dateRange[1], -7 * (i + 1) + 1);
      if (startDate < dateRange[0]) return; // partial week at beginning of queried range; skip
      const endDate = isoDateWithOffset(dateRange[1], -7 * i);
      const displayDateRange = formatIsoNoYear(startDate, endDate);
      if (groupingField) {
        Object.keys(weekAgg)
          .filter((key) => key.startsWith(groupingField) && !key.endsWith('UNLABELED'))
          .forEach((key) => {
            if (weekAgg[key][unit]) {
              records.push({
                label: labelKeyToText(trimGroupingPrefix(key)),
                x: weekAgg[key][unit] / 7,
                y: displayDateRange,
              });
            }
          });
      } else {
        records.push({
          label: t('metrics.footprint.labeled'),
          x: weekSum[unit] / 7,
          y: displayDateRange,
        });
      }
      if (showUncertainty && weekSum[`${unit}_uncertain`]) {
        records.push({
          label:
            t('metrics.footprint.unlabeled') +
            addFootnote(t('metrics.footprint.uncertainty-footnote')),
          x: weekSum[`${unit}_uncertain`]! / 7,
          y: displayDateRange,
        });
      }
    });
    return records;
  }, [weekFootprints, groupingField]);

  let meter = goals[type]?.length
    ? {
        uncertainty_prefix: t('metrics.footprint.unlabeled'),
        middle: goals[type][0].value,
        high: goals[type][goals[type].length - 1].value,
      }
    : undefined;

  return (
    <Card style={metricsStyles.card} contentStyle={{ flex: 1 }}>
      <Card.Title title={title} />
      <Card.Content style={metricsStyles.content}>
        {chartRecords?.length > 0 ? (
          <>
            <BarChart
              records={chartRecords}
              axisTitle={axisTitle}
              isHorizontal={true}
              timeAxis={false}
              stacked={true}
              lineAnnotations={goals[type]}
              meter={!groupingField ? meter : undefined}
              getColorForLabel={groupingField == 'mode_confirm' ? getColorForModeLabel : undefined}
            />
            {metricList.footprint!.map((gf: GroupingField) => (
              <View
                style={{
                  flexDirection: 'row',
                  height: 10,
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                }}
                key={gf}>
                <Text variant="labelMedium">
                  {t('metrics.split-by', { field: t(`metrics.grouping-fields.${gf}`) })}
                </Text>
                <Checkbox
                  key={gf}
                  status={groupingField === gf ? 'checked' : 'unchecked'}
                  onPress={() =>
                    groupingField == gf ? setGroupingField(null) : setGroupingField(gf)
                  }
                />
              </View>
            ))}
          </>
        ) : (
          <Text variant="labelMedium" style={{ textAlign: 'center', margin: 'auto' }}>
            {t('metrics.no-data')}
          </Text>
        )}
      </Card.Content>
    </Card>
  );
};

export default WeeklyFootprintCard;
