
import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Card, Text, useTheme} from 'react-native-paper';
import { MetricsData } from './metricsTypes';
import { cardMargin, cardStyles } from './MetricsTab';
import { useImperialConfig } from '../config/useImperialConfig';
import { filterToRecentWeeks, formatDateRangeOfDays, secondsToMinutes } from './metricsHelper';
import { useTranslation } from 'react-i18next';
import BarChart from '../components/BarChart';
import { labelKeyToReadable } from '../survey/multilabel/confirmHelper';

const ACTIVE_MODES = ['walk', 'bike'] as const;
type ActiveMode = typeof ACTIVE_MODES[number];

type Props = { userMetrics: MetricsData }
const ActiveMinutesCard = ({ userMetrics }: Props) => {

  const { colors } = useTheme();
  const { t } = useTranslation();

  userMetrics?.duration.forEach(day => {
    day.label_walk = day.label_walk || 400 + (Math.random() * 300);
    day.label_bike = day.label_bike || 200 + (Math.random() * 300);
  });
  
  // number of minutes for each of [walk, bike]
  const activeModesDurations = useMemo(() => {
    if (!userMetrics?.duration) return [];
    return ACTIVE_MODES.map(mode => {
      const sum = userMetrics.duration.reduce((acc, day) => (
        acc + (day[`label_${mode}`] || 0)
      ), 0);
      return secondsToMinutes(sum);
    });
  }, [userMetrics?.duration]);

  const weeklyActiveMinutesRecords = useMemo(() => {
    const records = [];
    const [ recentWeek, prevWeek ] = filterToRecentWeeks(userMetrics?.duration);
    ACTIVE_MODES.forEach(mode => {
      const recentSum = recentWeek?.reduce((acc, day) => (
        acc + (day[`label_${mode}`] || 0)
      ), 0);
      if (recentSum) {
        const xLabel = `Past Week\n(${formatDateRangeOfDays(recentWeek)})`; // TODO: i18n
        records.push({label: labelKeyToReadable(mode), x: xLabel, y: recentSum / 60});
      }
      const prevSum = prevWeek?.reduce((acc, day) => (
        acc + (day[`label_${mode}`] || 0)
      ), 0);
      if (prevSum) {
        const xLabel = `Previous Week\n(${formatDateRangeOfDays(prevWeek)})`; // TODO: i18n
        records.push({label: labelKeyToReadable(mode), x: xLabel, y: prevSum / 60});
      }
    });
    return records as {label: ActiveMode, x: string, y: number}[];
  }, [userMetrics?.duration]);

  return (
    <Card style={{overflow: 'hidden', minHeight: 300, margin: cardMargin}}
      contentStyle={{flex: 1}}>
      <Card.Title 
        title={t('main-metrics.active-minutes')}
        titleVariant='titleLarge'
        titleStyle={cardStyles.titleText(colors)}
        titleNumberOfLines={2}
        style={cardStyles.title(colors)} />
      <Card.Content style={cardStyles.content}>
        { activeModesDurations.map((mode, i) => (
          <View style={{ width: '50%', paddingHorizontal: 8 }}>
            <Text variant='titleSmall'>{labelKeyToReadable(ACTIVE_MODES[i])}</Text>
            <Text>{`${mode} ${t('metrics.minutes')}`}</Text>
          </View>
        ))}
        { weeklyActiveMinutesRecords.length ?
          <BarChart records={weeklyActiveMinutesRecords} axisTitle={t('main-metrics.active-minutes')}
            isHorizontal={false} stacked={true} />
        :
          <View style={{flex: 1, justifyContent: 'center'}}>
            <Text variant='labelMedium' style={{textAlign: 'center'}}>
              {t('metrics.chart-no-data')}
            </Text>
          </View>
        }
      </Card.Content>
    </Card>
  )
}

export default ActiveMinutesCard;
