import React from 'react';
import { GroupingField } from '../../types/appConfigTypes';
import MetricsCard from './MetricsCard';
import { t } from 'i18next';

const TRAVEL_METRICS = ['count', 'distance', 'duration'] as const;
export type TravelMetricName = (typeof TRAVEL_METRICS)[number];

const TravelSection = ({ userMetrics, aggMetrics, metricList }) => {
  return (
    <>
      {Object.entries(metricList).map(
        ([metricName, groupingFields]: [TravelMetricName, GroupingField[]]) =>
          TRAVEL_METRICS.includes(metricName) ? (
            <MetricsCard
              key={metricName}
              metricName={metricName}
              groupingFields={groupingFields}
              cardTitle={t(`metrics.travel.${metricName}`)}
              userMetricsDays={userMetrics?.[metricName]}
              aggMetricsDays={aggMetrics?.[metricName]}
            />
          ) : null,
      )}
    </>
  );
};

export default TravelSection;
