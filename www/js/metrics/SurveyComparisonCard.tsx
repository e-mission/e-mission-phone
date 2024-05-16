import React from 'react';
import { View, Text } from 'react-native';
import { Icon, Card } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../appTheme';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { cardStyles, SurveyMetric } from './MetricsTab';
ChartJS.register(ArcElement, Tooltip, Legend);

type Props = {
  surveyMetric: SurveyMetric;
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

const SurveyComparisonCard = ({ surveyMetric }: Props) => {
  const { colors } = useAppTheme();
  const { t } = useTranslation();

  const mySurveyMetric = surveyMetric.me.overview;
  const othersSurveyMetric = surveyMetric.others.overview;
  const mySurveyRate = Math.round(
    (mySurveyMetric.answered / (mySurveyMetric.answered + mySurveyMetric.unanswered)) * 100,
  );

  const surveyComparison: SurveyComparison = {
    me: mySurveyRate,
    others: Math.round(
      (othersSurveyMetric.answered /
        (othersSurveyMetric.answered + othersSurveyMetric.unanswered)) *
        100,
    ),
  };

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
          <Text>{rate}%</Text>
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
    <Card style={cardStyles.card} contentStyle={{ flex: 1 }}>
      <Card.Title
        title={t('main-metrics.surveys')}
        titleVariant="titleLarge"
        titleStyle={cardStyles.titleText(colors)}
        subtitle={t('main-metrics.comparison')}
        subtitleStyle={[cardStyles.titleText(colors), cardStyles.subtitleText]}
        style={cardStyles.title(colors)}
      />
      <Card.Content style={cardStyles.content}>
        <View>
          <Text style={styles.chartTitle}>{t('main-metrics.survey-response-rate')}</Text>
          <View style={styles.chartWrapper}>
            {renderDoughnutChart(surveyComparison.me, colors.navy, true)}
            {renderDoughnutChart(surveyComparison.others, colors.orange, false)}
          </View>
          <LabelPanel first={t('main-metrics.you')} second={t('main-metrics.others')} />
        </View>
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
