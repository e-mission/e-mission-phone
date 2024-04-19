import React from 'react';
import { Card, useTheme } from 'react-native-paper';
import { cardStyles } from './MetricsTab';
import { useTranslation } from 'react-i18next';

const SurveyTripCategoriesCard = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();

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
      <Card.Content style={cardStyles.content}>Trip Categories</Card.Content>
    </Card>
  );
};

export default SurveyTripCategoriesCard;
