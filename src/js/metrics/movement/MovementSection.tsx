import React, { useContext } from 'react';
import WeeklyActiveMinutesCard from './WeeklyActiveMinutesCard';
import DailyActiveMinutesCard from './DailyActiveMinutesCard';
import ActiveMinutesTableCard from './ActiveMinutesTableCard';
import TimelineContext from '../../TimelineContext';
import { getActiveModes } from '../metricsHelper';

const MovementSection = ({ userMetrics }) => {
  const { labelOptions } = useContext(TimelineContext);
  const activeModes = labelOptions ? getActiveModes(labelOptions) : [];

  return (
    <>
      <WeeklyActiveMinutesCard {...{ userMetrics, activeModes }} />
      <DailyActiveMinutesCard {...{ userMetrics, activeModes }} />
      <ActiveMinutesTableCard {...{ userMetrics, activeModes }} />
    </>
  );
};

export default MovementSection;
