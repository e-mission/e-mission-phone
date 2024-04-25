import React from 'react';
import { View, Text } from 'react-native';
import { Card } from 'react-native-paper';
import { cardStyles } from './MetricsTab';
import { useTranslation } from 'react-i18next';
import BarChart from '../components/BarChart';
import { useAppTheme } from '../appTheme';
import { LabelPanel } from './SurveyDoughnutCharts';

const SurveyTripCategoriesCard = () => {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const records = [
    {
      label: 'Response',
      x: 'EV Roaming trip',
      y: 20,
    },
    {
      label: 'No Response',
      x: 'EV Roaming trip',
      y: 20,
    },
    {
      label: 'Response',
      x: 'EV Return trip',
      y: 30,
    },
    {
      label: 'No Response',
      x: 'EV Return trip',
      y: 40,
    },
    {
      label: 'Response',
      x: 'Gas Car trip',
      y: 50,
    },
    {
      label: 'No Response',
      x: 'Gas Car trip',
      y: 10,
    },
  ];

  return (
    <Card style={cardStyles.card} contentStyle={{ flex: 1 }}>
      <Card.Title
        title={t('main-metrics.surveys')}
        titleVariant="titleLarge"
        titleStyle={cardStyles.titleText(colors)}
        subtitle={t('main-metrics.trip-categories')}
        subtitleStyle={[cardStyles.titleText(colors), cardStyles.subtitleText]}
        style={cardStyles.title(colors)}
      />
      <Card.Content style={cardStyles.content}>
        <BarChart
          records={records}
          axisTitle=""
          isHorizontal={false}
          timeAxis={false}
          stacked={true}
          getColorForLabel={(l) => (l === 'Response' ? colors.navy : colors.orange)}
          getColorForChartEl={(l) => (l === 'Response' ? colors.navy : colors.orange)}
          showLegend={false}
          reverse={false}
        />
        <LabelPanel first={t('main-metrics.response')} second={t('main-metrics.no-response')} />
      </Card.Content>
    </Card>
  );
};

export default SurveyTripCategoriesCard;
