import React, { useContext, useMemo } from 'react';
import { View } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { MetricsData } from '../metricsTypes';
import { metricsStyles } from '../MetricsScreen';
import {
  aggMetricEntries,
  getColorForModeLabel,
  segmentDaysByWeeks,
  valueForFieldOnDay,
} from '../metricsHelper';
import { useTranslation } from 'react-i18next';
import BarChart from '../../components/BarChart';
import { labelKeyToText } from '../../survey/multilabel/confirmHelper';
import TimelineContext from '../../TimelineContext';
import { formatIsoNoYear, isoDateWithOffset } from '../../datetimeUtil';

type Props = { userMetrics?: MetricsData; activeModes: string[] };
const WeeklyActiveMinutesCard = ({ userMetrics, activeModes }: Props) => {
  const { colors } = useTheme();
  const { dateRange } = useContext(TimelineContext);
  const { t } = useTranslation();

  const weekDurations = useMemo(() => {
    if (!userMetrics?.duration?.length) return [];
    const weeks = segmentDaysByWeeks(userMetrics?.duration, dateRange[1]);
    return weeks.map((week, i) => ({
      ...aggMetricEntries(week, 'duration'),
    }));
  }, [userMetrics]);

  const weeklyActiveMinutesRecords = useMemo(() => {
    let records: { label: string; x: string; y: number }[] = [];
    activeModes.forEach((modeKey) => {
      if (weekDurations.some((week) => valueForFieldOnDay(week, 'mode_confirm', modeKey))) {
        weekDurations.forEach((week, i) => {
          const startDate = isoDateWithOffset(dateRange[1], -7 * (i + 1) + 1);
          if (startDate < dateRange[0]) return; // partial week at beginning of queried range; skip
          const endDate = isoDateWithOffset(dateRange[1], -7 * i);
          const val = valueForFieldOnDay(week, 'mode_confirm', modeKey);
          records.push({
            label: labelKeyToText(modeKey),
            x: formatIsoNoYear(startDate, endDate),
            y: val / 60,
          });
        });
      }
    });
    return records;
  }, [weekDurations]);

  return (
    <Card style={metricsStyles.card} contentStyle={{ flex: 1 }}>
      <Card.Title title={t('metrics.movement.weekly-active-minutes')} />
      <Card.Content style={metricsStyles.content}>
        {weeklyActiveMinutesRecords.length ? (
          <View style={{ flex: 1 }}>
            <BarChart
              records={weeklyActiveMinutesRecords}
              axisTitle={t('metrics.movement.active-minutes')}
              isHorizontal={false}
              stacked={true}
              lineAnnotations={[
                { value: 150, label: t('metrics.movement.weekly-goal'), position: 'center' },
              ]}
              getColorForLabel={getColorForModeLabel}
            />
            <Text
              variant="labelSmall"
              style={{ textAlign: 'left', fontWeight: '400', marginTop: 'auto', paddingTop: 10 }}>
              {t('metrics.movement.weekly-goal-footnote')}
            </Text>
          </View>
        ) : (
          <Text variant="labelMedium" style={{ textAlign: 'center', margin: 'auto' }}>
            {t('metrics.no-data-available')}
          </Text>
        )}
      </Card.Content>
    </Card>
  );
};

export default WeeklyActiveMinutesCard;
