import React, { useMemo } from 'react';
import { Text, Card } from 'react-native-paper';
import { metricsStyles } from '../MetricsScreen';
import { useTranslation } from 'react-i18next';
import BarChart from '../../components/BarChart';
import { useAppTheme } from '../../appTheme';
import { LabelPanel } from './SurveyComparisonCard';
import { DayOfMetricData, MetricsData } from '../metricsTypes';
import { GroupingField } from '../../types/appConfigTypes';
import { getUniqueLabelsForDays } from '../metricsHelper';

function sumResponseCountsForValue(
  days: DayOfMetricData<'response_count'>[],
  value: `${GroupingField}_${string}`,
) {
  const acc = { responded: 0, not_responded: 0 };
  days.forEach((day) => {
    acc.responded += day[value]?.responded || 0;
    acc.not_responded += day[value]?.not_responded || 0;
  });
  return acc;
}

type SurveyTripRecord = {
  label: string;
  x: string;
  y: number;
};

type Props = {
  userMetrics: MetricsData | undefined;
  aggMetrics: MetricsData | undefined;
};
const SurveyTripCategoriesCard = ({ userMetrics, aggMetrics }: Props) => {
  const { colors } = useAppTheme();
  const { t } = useTranslation();

  const records = useMemo(() => {
    if (!userMetrics?.response_count) return [];
    const surveys = getUniqueLabelsForDays(userMetrics.response_count);
    const records: SurveyTripRecord[] = [];
    surveys.forEach((survey) => {
      const { responded, not_responded } = sumResponseCountsForValue(
        userMetrics.response_count,
        `survey_${survey}`,
      );
      records.push({ label: 'Response', x: survey, y: responded || 0 });
      records.push({ label: 'No Response', x: survey, y: not_responded || 0 });
    });
    return records;
  }, [userMetrics]);

  return (
    <Card style={metricsStyles.card} contentStyle={{ flex: 1 }}>
      <Card.Title
        title={t('metrics.surveys.surveys')}
        subtitle={t('metrics.surveys.trip-categories')}
        subtitleStyle={metricsStyles.subtitleText}
      />
      <Card.Content style={metricsStyles.content}>
        {records.length ? (
          <>
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
              maxBarThickness={60}
            />
            <LabelPanel
              first={t('metrics.surveys.response')}
              second={t('metrics.surveys.no-response')}
            />
          </>
        ) : (
          <Text variant="labelMedium" style={{ textAlign: 'center', margin: 'auto' }}>
            {t('metrics.no-data-available')}
          </Text>
        )}
      </Card.Content>
    </Card>
  );
};

export default SurveyTripCategoriesCard;
