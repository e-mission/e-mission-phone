import React, { useContext, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { MetricsData } from './metricsTypes';
import { cardMargin, cardStyles } from './MetricsTab';
import { formatDateRangeOfDays, segmentDaysByWeeks, valueForFieldOnDay } from './metricsHelper';
import { useTranslation } from 'react-i18next';
import BarChart from '../components/BarChart';
import { labelKeyToRichMode, labelOptions } from '../survey/multilabel/confirmHelper';
import { getBaseModeByText } from '../diary/diaryHelper';
import TimelineContext from '../TimelineContext';
import useAppConfig from '../useAppConfig';

export const ACTIVE_MODES = ['walk', 'bike'] as const;
type ActiveMode = (typeof ACTIVE_MODES)[number];

type Props = { userMetrics?: MetricsData };
const WeeklyActiveMinutesCard = ({ userMetrics }: Props) => {
  const { colors } = useTheme();
  const { dateRange } = useContext(TimelineContext);
  const { t } = useTranslation();
  const appConfig = useAppConfig();
  // modes to consider as "active" for the purpose of calculating "active minutes", default : ['walk', 'bike']
  const activeModes =
    appConfig?.metrics?.phone_dashboard_ui?.active_travel_options?.modes_list ?? ACTIVE_MODES;
  const weeklyActiveMinutesRecords = useMemo(() => {
    if (!userMetrics?.duration) return [];
    const records: { x: string; y: number; label: string }[] = [];
    const [recentWeek, prevWeek] = segmentDaysByWeeks(userMetrics?.duration, dateRange[1]);
    activeModes.forEach((mode) => {
      if (prevWeek) {
        const prevSum = prevWeek?.reduce(
          (acc, day) => acc + (valueForFieldOnDay(day, 'mode_confirm', mode) || 0),
          0,
        );
        const xLabel = `${t('main-metrics.prev-week')}\n(${formatDateRangeOfDays(prevWeek)})`;
        records.push({ label: labelKeyToRichMode(mode), x: xLabel, y: prevSum / 60 });
      }
      const recentSum = recentWeek?.reduce(
        (acc, day) => acc + (valueForFieldOnDay(day, 'mode_confirm', mode) || 0),
        0,
      );
      const xLabel = `${t('main-metrics.past-week')}\n(${formatDateRangeOfDays(recentWeek)})`;
      records.push({ label: labelKeyToRichMode(mode), x: xLabel, y: recentSum / 60 });
    });
    return records as { label: ActiveMode; x: string; y: number }[];
  }, [userMetrics?.duration]);

  return (
    <Card style={cardStyles.card} contentStyle={{ flex: 1 }}>
      <Card.Title
        title={t('main-metrics.active-minutes')}
        titleVariant="titleLarge"
        titleStyle={cardStyles.titleText(colors)}
        subtitle={t('main-metrics.weekly-active-minutes')}
        subtitleStyle={[cardStyles.titleText(colors), cardStyles.subtitleText]}
        style={cardStyles.title(colors)}
      />
      <Card.Content style={cardStyles.content}>
        {weeklyActiveMinutesRecords.length ? (
          <View style={{ flex: 1 }}>
            <BarChart
              records={weeklyActiveMinutesRecords}
              axisTitle={t('main-metrics.active-minutes')}
              isHorizontal={false}
              stacked={true}
              lineAnnotations={[
                { value: 150, label: t('main-metrics.weekly-goal'), position: 'center' },
              ]}
              getColorForLabel={(l) => getBaseModeByText(l, labelOptions).color}
            />
            <Text
              variant="labelSmall"
              style={{ textAlign: 'left', fontWeight: '400', marginTop: 'auto', paddingTop: 10 }}>
              {t('main-metrics.weekly-goal-footnote')}
            </Text>
          </View>
        ) : (
          <Text variant="labelMedium" style={{ textAlign: 'center', margin: 'auto' }}>
            {t('metrics.chart-no-data')}
          </Text>
        )}
      </Card.Content>
    </Card>
  );
};

export default WeeklyActiveMinutesCard;
