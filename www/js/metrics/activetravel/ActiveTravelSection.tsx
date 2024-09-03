import React from 'react';
import WeeklyActiveMinutesCard from './WeeklyActiveMinutesCard';
import DailyActiveMinutesCard from './DailyActiveMinutesCard';
import ActiveMinutesTableCard from './ActiveMinutesTableCard';

const ActiveTravelSection = ({ userMetrics }) => {
  return (
    <>
      <WeeklyActiveMinutesCard userMetrics={userMetrics} />
      <DailyActiveMinutesCard userMetrics={userMetrics} />
      <ActiveMinutesTableCard userMetrics={userMetrics} />
    </>
  );
};

export default ActiveTravelSection;
