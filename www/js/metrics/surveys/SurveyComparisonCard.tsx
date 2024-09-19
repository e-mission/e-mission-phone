import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Icon, Card, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../../appTheme';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { metricsStyles } from '../MetricsScreen';
import { DayOfMetricData, MetricsData } from '../metricsTypes';
import { getUniqueLabelsForDays } from '../metricsHelper';
ChartJS.register(ArcElement, Tooltip, Legend);

/**
 * @description Calculates the percentage of 'responded' values across days of 'response_count' data.
 * @returns Percentage as a whole number (0-100), or null if no data.
 */
function getResponsePctForDays(days: DayOfMetricData<'response_count'>[]) {
  const surveys = getUniqueLabelsForDays(days);
  let acc = { responded: 0, not_responded: 0 };
  days.forEach((day) => {
    surveys.forEach((survey) => {
      acc.responded += day[`survey_${survey}`]?.responded || 0;
      acc.not_responded += day[`survey_${survey}`]?.not_responded || 0;
    });
  });
  const total = acc.responded + acc.not_responded;
  if (total === 0) return null;
  return Math.round((acc.responded / total) * 100);
}

type Props = {
  userMetrics: MetricsData | undefined;
  aggMetrics: MetricsData | undefined;
};

export type SurveyComparison = {
  me: number;
  others: number;
};

export const LabelPanel = ({ first, second }) => {
  const { colors } = useAppTheme();

  return (
    <View style={styles.labelWrapper}>
      <View style={styles.labelItem}>
        <View style={{ backgroundColor: colors.navy, width: 20, height: 20 }} />
        <Text>{first}</Text>
      </View>
      <View style={styles.labelItem}>
        <View style={{ backgroundColor: colors.orange, width: 20, height: 20 }} />
        <Text>{second}</Text>
      </View>
    </View>
  );
};

const SurveyComparisonCard = ({ userMetrics, aggMetrics }: Props) => {
  const { colors } = useAppTheme();
  const { t } = useTranslation();

  const myResponsePct = useMemo(() => {
    if (!userMetrics?.response_count) return;
    return getResponsePctForDays(userMetrics.response_count);
  }, [userMetrics]);

  const othersResponsePct = useMemo(() => {
    if (!aggMetrics?.response_count) return;
    return getResponsePctForDays(aggMetrics.response_count);
  }, [aggMetrics]);

  const renderDoughnutChart = (rate, chartColor, myResponse) => {
    const data = {
      datasets: [
        {
          data: [rate, 100 - rate],
          backgroundColor: [chartColor, colors.silver],
          borderColor: [chartColor, colors.silver],
          borderWidth: 1,
        },
      ],
    };
    return (
      <View style={{ position: 'relative' }}>
        <View style={styles.textWrapper}>
          {myResponse ? (
            <Icon source="account" size={40} />
          ) : (
            <Icon source="account-group" size={40} />
          )}
          <Text>{rate === null ? t('metrics.no-data') : rate + '%'}</Text>
        </View>
        <Doughnut
          data={data}
          width={140}
          height={140}
          options={{
            cutout: 50,
            plugins: {
              legend: {
                display: false,
              },
              tooltip: {
                enabled: false,
              },
            },
          }}
        />
      </View>
    );
  };

  return (
    <Card style={metricsStyles.card} contentStyle={{ flex: 1 }}>
      <Card.Title
        title={t('metrics.surveys.surveys')}
        subtitle={t('metrics.surveys.comparison')}
        subtitleStyle={metricsStyles.subtitleText}
      />
      <Card.Content style={metricsStyles.content}>
        {typeof myResponsePct !== 'number' || typeof othersResponsePct !== 'number' ? (
          <Text variant="labelMedium" style={{ textAlign: 'center', margin: 'auto' }}>
            {t('metrics.no-data-available')}
          </Text>
        ) : (
          <View>
            <Text style={styles.chartTitle}>{t('metrics.surveys.survey-response-rate')}</Text>
            <View style={styles.chartWrapper}>
              {renderDoughnutChart(myResponsePct, colors.navy, true)}
              {renderDoughnutChart(othersResponsePct, colors.orange, false)}
            </View>
            <LabelPanel first={t('metrics.surveys.you')} second={t('metrics.surveys.others')} />
          </View>
        )}
      </Card.Content>
    </Card>
  );
};

const styles: any = {
  chartTitle: {
    alignSelf: 'center',
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 10,
  },
  statusTextWrapper: {
    alignSelf: 'center',
    display: 'flex',
    flexDirection: 'row',
    fontSize: 16,
  },
  chartWrapper: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  textWrapper: {
    position: 'absolute',
    width: 140,
    height: 140,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelWrapper: {
    alignSelf: 'center',
    display: 'flex',
    gap: 10,
    marginTop: 10,
  },
  labelItem: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
};

export default SurveyComparisonCard;
