import React from 'react';
import Carousel from '../../components/Carousel';
import { GroupingField, MetricName } from '../../types/appConfigTypes';
import MetricsCard from './MetricsCard';
import { t } from 'i18next';

const SummarySection = ({ userMetrics, aggMetrics, metricList }) => {
  return (
    <Carousel>
      {Object.entries(metricList).map(
        ([metricName, groupingFields]: [MetricName, GroupingField[]]) => {
          return (
            <MetricsCard
              key={metricName}
              metricName={metricName}
              groupingFields={groupingFields}
              cardTitle={t(`main-metrics.${metricName}`)}
              userMetricsDays={userMetrics?.[metricName]}
              aggMetricsDays={aggMetrics?.[metricName]}
            />
          );
        },
      )}
    </Carousel>
  );
};

export default SummarySection;
