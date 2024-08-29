import React from 'react';
import Carousel from '../../components/Carousel';
import SurveyComparisonCard from './SurveyComparisonCard';
import SurveyTripCategoriesCard from './SurveyTripCategoriesCard';

const SurveysSection = ({ userMetrics, aggMetrics }) => {
  return (
    <Carousel>
      <SurveyComparisonCard userMetrics={userMetrics} aggMetrics={aggMetrics} />
      <SurveyTripCategoriesCard userMetrics={userMetrics} aggMetrics={aggMetrics} />
    </Carousel>
  );
};

export default SurveysSection;
