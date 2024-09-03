import React from 'react';
import CarbonFootprintCard from './CarbonFootprintCard';
import CarbonTextCard from './CarbonTextCard';
import EnergyFootprintCard from './EnergyFootprintCard';

const FootprintSection = ({ userMetrics, aggMetrics }) => {
  return (
    <>
      <CarbonFootprintCard userMetrics={userMetrics} aggMetrics={aggMetrics} />
      <CarbonTextCard userMetrics={userMetrics} aggMetrics={aggMetrics} />
      <EnergyFootprintCard {...{ userMetrics, aggMetrics }} />
    </>
  );
};

export default FootprintSection;
