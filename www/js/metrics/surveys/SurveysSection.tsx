import React from 'react';
import SurveyComparisonCard from './SurveyComparisonCard';
import SurveyTripCategoriesCard from './SurveyTripCategoriesCard';

const SurveysSection = ({ userMetrics, aggMetrics }) => {
  return (
    <>
      <SurveyComparisonCard userMetrics={userMetrics} aggMetrics={aggMetrics} />
      <SurveyTripCategoriesCard userMetrics={userMetrics} aggMetrics={aggMetrics} />
    </>
  );
};

export default SurveysSection;
