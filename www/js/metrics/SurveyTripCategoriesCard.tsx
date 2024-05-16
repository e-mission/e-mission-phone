import React from 'react';
import { Card } from 'react-native-paper';
import { cardStyles, SurveyObject } from './MetricsTab';
import { useTranslation } from 'react-i18next';
import BarChart from '../components/BarChart';
import { useAppTheme } from '../appTheme';
import { LabelPanel } from './SurveyComparisonCard';

type SurveyTripRecord = {
  label: string;
  x: string;
  y: number;
};

type Props = {
  surveyTripCategoryMetric: { [key: string]: SurveyObject };
};
const SurveyTripCategoriesCard = ({ surveyTripCategoryMetric }: Props) => {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const records: SurveyTripRecord[] = [];

  for (const category in surveyTripCategoryMetric) {
    const metricByCategory = surveyTripCategoryMetric[category];
    for (const key in metricByCategory) {
      // we don't consider "mismatched" survey result for now
      if (key === 'mismatched') continue;
      records.push({
        label: key === 'answered' ? 'Response' : 'No Response',
        x: category,
        y: metricByCategory[key],
      });
    }
  }

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
