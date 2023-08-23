
import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';
import { DayOfMetricData } from './metricsTypes';
import { getUniqueLabelsForDays } from './metricsHelper';

type Props = { metricDataDays: DayOfMetricData[], style: any };
const MetricsDetails = ({ metricDataDays, style }: Props) => {
 
  const metricValues = useMemo(() => {
    if (!metricDataDays) return [];
    const uniqueLabels = getUniqueLabelsForDays(metricDataDays);

    // for each label, sum up cumulative values across all days
    const vals = {};
    uniqueLabels.forEach(label => {
      vals[label] = metricDataDays.reduce((acc, day) => (
        acc + (day[`label_${label}`] || 0)
      ), 0);
    });
    return vals;
  }, [metricDataDays]);

  return (
    <View style={[{flexDirection: 'row', flexWrap: 'wrap'}, style]}>
      { Object.keys(metricValues).map((label, i) =>
        <View style={{ width: '50%', paddingHorizontal: 8 }}>
          <Text variant='titleSmall'>{label}</Text>
          <Text>{metricValues[label]}</Text>
        </View>
      )}
    </View>
  );
}

export default MetricsDetails;
