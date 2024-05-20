import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { MetricsData } from './metricsTypes';
import { cardStyles } from './MetricsTab';
import { useTranslation } from 'react-i18next';
import { labelKeyToRichMode, labelOptions } from '../survey/multilabel/confirmHelper';
import LineChart from '../components/LineChart';
import { getBaseModeByText } from '../diary/diaryHelper';
import { tsForDayOfMetricData, valueForFieldOnDay } from './metricsHelper';
import useAppConfig from '../useAppConfig';
import { ACTIVE_MODES } from './WeeklyActiveMinutesCard';

type Props = { userMetrics?: MetricsData };
const DailyActiveMinutesCard = ({ userMetrics }: Props) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const appConfig = useAppConfig();
  // modes to consider as "active" for the purpose of calculating "active minutes", default : ['walk', 'bike']
  const activeModes =
    appConfig?.metrics?.phone_dashboard_ui?.active_travel_options?.modes_list ?? ACTIVE_MODES;

  const dailyActiveMinutesRecords = useMemo(() => {
    const records: { label: string; x: number; y: number }[] = [];
    const recentDays = userMetrics?.duration?.slice(-14);
    recentDays?.forEach((day) => {
      activeModes.forEach((mode) => {
        const activeSeconds = valueForFieldOnDay(day, 'mode_confirm', mode);
        records.push({
          label: labelKeyToRichMode(mode),
          x: tsForDayOfMetricData(day) * 1000, // vertical chart, milliseconds on X axis
          y: activeSeconds ? activeSeconds / 60 : null, // minutes on Y axis
        });
      });
    });
    return records as { label: ActiveMode; x: number; y: number }[];
  }, [userMetrics?.duration]);

  return (
    <Card style={cardStyles.card} contentStyle={{ flex: 1 }}>
      <Card.Title
        title={t('main-metrics.active-minutes')}
        titleVariant="titleLarge"
        titleStyle={cardStyles.titleText(colors)}
        subtitle={t('main-metrics.daily-active-minutes')}
        subtitleStyle={[cardStyles.titleText(colors), cardStyles.subtitleText]}
        style={cardStyles.title(colors)}
      />
      <Card.Content style={cardStyles.content}>
        {dailyActiveMinutesRecords.length ? (
          <LineChart
            records={dailyActiveMinutesRecords}
            axisTitle={t('main-metrics.active-minutes')}
            timeAxis={true}
            isHorizontal={false}
            getColorForLabel={(l) => getBaseModeByText(l, labelOptions).color}
          />
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

export default DailyActiveMinutesCard;
