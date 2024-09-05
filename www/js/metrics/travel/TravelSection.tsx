import React from 'react';
import { GroupingField, MetricName } from '../../types/appConfigTypes';
import MetricsCard from './MetricsCard';
import { t } from 'i18next';

const TRAVEL_METRICS = ['distance', 'duration', 'count'];

const TravelSection = ({ userMetrics, aggMetrics, metricList }) => {
  return (
    <>
      {Object.entries(metricList).map(
        ([metricName, groupingFields]: [MetricName, GroupingField[]]) =>
          TRAVEL_METRICS.includes(metricName) ? (
            <MetricsCard
              key={metricName}
              metricName={metricName}
              groupingFields={groupingFields}
              cardTitle={t(`main-metrics.${metricName}`)}
              userMetricsDays={userMetrics?.[metricName]}
              aggMetricsDays={aggMetrics?.[metricName]}
            />
          ) : null,
      )}
    </>
  );
};

export default TravelSection;
