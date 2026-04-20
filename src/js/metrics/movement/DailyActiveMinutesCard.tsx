import React, { useMemo } from 'react';
import { Card, Text } from 'react-native-paper';
import { MetricsData } from '../metricsTypes';
import { metricsStyles } from '../MetricsScreen';
import { useTranslation } from 'react-i18next';
import { labelKeyToText } from '../../survey/multilabel/confirmHelper';
import LineChart from '../../components/LineChart';
import { getColorForModeLabel, tsForDayOfMetricData, valueForFieldOnDay } from '../metricsHelper';

type Props = { userMetrics?: MetricsData; activeModes: string[] };
const DailyActiveMinutesCard = ({ userMetrics, activeModes }: Props) => {
  const { t } = useTranslation();

  const dailyActiveMinutesRecords = useMemo(() => {
    const records: { label: string; x: number; y: number }[] = [];
    activeModes.forEach((modeKey) => {
      if (userMetrics?.duration?.some((d) => valueForFieldOnDay(d, 'mode_confirm', modeKey))) {
        userMetrics?.duration?.forEach((day) => {
          const activeSeconds = valueForFieldOnDay(day, 'mode_confirm', modeKey);
          records.push({
            label: labelKeyToText(modeKey),
            x: tsForDayOfMetricData(day) * 1000, // vertical chart, milliseconds on X axis
            y: (activeSeconds || 0) / 60, // minutes on Y axis
          });
        });
      }
    });
    return records as { label: string; x: number; y: number }[];
  }, [userMetrics?.duration]);

  return (
    <Card style={metricsStyles.card} contentStyle={{ flex: 1 }}>
      <Card.Title title={t('metrics.movement.daily-active-minutes')} />
      <Card.Content style={metricsStyles.content}>
        {dailyActiveMinutesRecords.length ? (
          <LineChart
            records={dailyActiveMinutesRecords}
            axisTitle={t('metrics.movement.active-minutes')}
            timeAxis={true}
            isHorizontal={false}
            getColorForLabel={getColorForModeLabel}
          />
        ) : (
          <Text variant="labelMedium" style={{ textAlign: 'center', margin: 'auto' }}>
            {t('metrics.no-data-available')}
          </Text>
        )}
      </Card.Content>
    </Card>
  );
};

export default DailyActiveMinutesCard;
