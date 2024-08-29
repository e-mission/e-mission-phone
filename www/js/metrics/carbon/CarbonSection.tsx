import React from 'react';
import CarbonFootprintCard from './CarbonFootprintCard';
import CarbonTextCard from './CarbonTextCard';
import Carousel from '../../components/Carousel';

const CarbonSection = ({ userMetrics, aggMetrics }) => {
  return (
    <Carousel>
      <CarbonFootprintCard userMetrics={userMetrics} aggMetrics={aggMetrics} />
      <CarbonTextCard userMetrics={userMetrics} aggMetrics={aggMetrics} />
    </Carousel>
  );
};

export default CarbonSection;
