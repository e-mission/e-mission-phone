import React from 'react';
import { Card } from 'react-native-paper';
import { cardStyles } from './MetricsTab';
import { useTranslation } from 'react-i18next';
import BarChart from '../components/BarChart';
import { useAppTheme } from '../appTheme';

const SurveyTripCategoriesCard = () => {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const records = [
    { label: 'EV Roaming trip', x: 'EV Roaming trip', y: 91 },
    { label: 'EV Return trip', x: 'EV Return trip', y: 72 },
    { label: 'Gas Car trip', x: 'Gas Car trip', y: 68 },
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
          stacked={false}
          getColorForLabel={() => colors.navy}
          getColorForChartEl={() => colors.navy}
          hideLegend={true}
          reverse={false}
        />
      </Card.Content>
    </Card>
  );
};

export default SurveyTripCategoriesCard;
