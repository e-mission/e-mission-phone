
import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Card, Text, useTheme} from 'react-native-paper';
import { MetricsData } from './metricsTypes';
import { cardStyles } from './MetricsTab';
import { useTranslation } from 'react-i18next';
import { labelKeyToRichMode, labelOptions } from '../survey/multilabel/confirmHelper';
import LineChart from '../components/LineChart';
import { getBaseModeByText } from '../diary/diaryHelper';

const ACTIVE_MODES = ['walk', 'bike'] as const;
type ActiveMode = typeof ACTIVE_MODES[number];

type Props = { userMetrics: MetricsData }
const DailyActiveMinutesCard = ({ userMetrics }: Props) => {

  const { colors } = useTheme();
  const { t } = useTranslation();

  const dailyActiveMinutesRecords = useMemo(() => {
    const records = [];
    const recentDays = userMetrics?.duration?.slice(-14);
    recentDays?.forEach(day => {
      ACTIVE_MODES.forEach(mode => {
        const activeSeconds = day[`label_${mode}`];
        records.push({
          label: labelKeyToRichMode(mode),
          x: day.ts * 1000, // vertical chart, milliseconds on X axis
          y: activeSeconds && activeSeconds / 60, // minutes on Y axis
        });
      });
    });
    return records as {label: ActiveMode, x: string, y: number}[];
  }, [userMetrics?.duration]);

  return (
    <Card style={cardStyles.card}
      contentStyle={{flex: 1}}>
      <Card.Title 
        title={t('main-metrics.active-minutes')}
        titleVariant='titleLarge'
        titleStyle={cardStyles.titleText(colors)}
        subtitle={t('main-metrics.daily-active-minutes')}
        subtitleStyle={[cardStyles.titleText(colors), cardStyles.subtitleText]}
        style={cardStyles.title(colors)} />
      <Card.Content style={cardStyles.content}>
        { dailyActiveMinutesRecords.length ?
          <LineChart records={dailyActiveMinutesRecords} axisTitle={t('main-metrics.active-minutes')}
            timeAxis={true} isHorizontal={false}
            getColorForLabel={(l) => getBaseModeByText(l, labelOptions).color} />
        :
          <View style={{flex: 1, justifyContent: 'center'}}>
            <Text variant='labelMedium' style={{textAlign: 'center'}}>
              {t('metrics.chart-no-data')}
            </Text>
          </View>
        }
      </Card.Content>
    </Card>
  );
}

export default DailyActiveMinutesCard;
