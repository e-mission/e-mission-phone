import React, { useContext, useMemo } from 'react';
import { View } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { MetricsData } from '../metricsTypes';
import { metricsStyles } from '../MetricsScreen';
import {
  aggMetricEntries,
  formatDateRangeOfDays,
  segmentDaysByWeeks,
  valueForFieldOnDay,
} from '../metricsHelper';
import { useTranslation } from 'react-i18next';
import BarChart from '../../components/BarChart';
import { labelKeyToRichMode, labelOptions } from '../../survey/multilabel/confirmHelper';
import { getBaseModeByText } from '../../diary/diaryHelper';
import TimelineContext from '../../TimelineContext';

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
    activeModes.forEach((mode) => {
      if (weekDurations.some((week) => valueForFieldOnDay(week, 'mode_confirm', mode))) {
        weekDurations.forEach((week) => {
          const val = valueForFieldOnDay(week, 'mode_confirm', mode);
          records.push({
            label: labelKeyToRichMode(mode),
            x: formatDateRangeOfDays(week),
            y: val / 60,
          });
        });
      }
    });
    return records;
  }, [weekDurations]);

  return (
    <Card style={metricsStyles.card} contentStyle={{ flex: 1 }}>
      <Card.Content style={metricsStyles.content}>
        <Text variant="bodyLarge">{t('metrics.movement.weekly-active-minutes')}</Text>
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
              getColorForLabel={(l) => getBaseModeByText(l, labelOptions).color}
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
