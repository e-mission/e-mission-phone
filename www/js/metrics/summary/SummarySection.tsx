import React from 'react';
import { GroupingField, MetricName } from '../../types/appConfigTypes';
import MetricsCard from './MetricsCard';
import { t } from 'i18next';

const SummarySection = ({ userMetrics, aggMetrics, metricList }) => {
  return (
    <>
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
    </>
  );
};

export default SummarySection;
