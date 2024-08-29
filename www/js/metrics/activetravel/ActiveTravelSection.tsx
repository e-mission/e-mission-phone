import React from 'react';
import Carousel from '../../components/Carousel';
import WeeklyActiveMinutesCard from './WeeklyActiveMinutesCard';
import DailyActiveMinutesCard from './DailyActiveMinutesCard';
import ActiveMinutesTableCard from './ActiveMinutesTableCard';

const ActiveTravelSection = ({ userMetrics }) => {
  return (
    <Carousel>
      <WeeklyActiveMinutesCard userMetrics={userMetrics} />
      <DailyActiveMinutesCard userMetrics={userMetrics} />
      <ActiveMinutesTableCard userMetrics={userMetrics} />
    </Carousel>
  );
};

export default ActiveTravelSection;
