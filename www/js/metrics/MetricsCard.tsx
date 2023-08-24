
import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Card, SegmentedButtons, Text, useTheme } from 'react-native-paper';
import BarChart from '../components/BarChart';
import { DayOfMetricData } from './metricsTypes';
import { getUniqueLabelsForDays } from './metricsHelper';

type Props = {
  style: any,
  cardTitle: string,
  metricDataDays: DayOfMetricData[],
  axisUnits: string,
  unitFormatFn?: (val: number) => string|number,
  style: any,
}
const MetricsCard = ({cardTitle, userMetricsDays, aggMetricsDays, axisUnits, unitFormatFn, style}: Props) => {

  const { colors } = useTheme();  
  const [viewMode, setViewMode] = useState<'details'|'graph'>('details');

  // for each label, format data for chart, with a record for each day with that label
  const chartData = useMemo(() => {
    if (!metricDataDays || viewMode != 'graph') return [];
    const uniqueLabels = getUniqueLabelsForDays(metricDataDays);

    return uniqueLabels.map((label, i) => {
      const daysWithThisLabel = metricDataDays.filter(e => e[`label_${label}`]);
      return {
        label: label,
        records: daysWithThisLabel.map(e => ({
          x: e[`label_${label}`],
          y: e.ts * 1000, // time (as milliseconds) will go on Y axis because it will be a horizontal chart
        }))
      }
    });
  }, [metricDataDays, viewMode]);

  // for each label, sum up cumulative values across all days
  const metricSumValues = useMemo(() => {
    if (!metricDataDays || viewMode != 'details') return [];
    const uniqueLabels = getUniqueLabelsForDays(metricDataDays);

    // for each label, sum up cumulative values across all days
    const vals = {};
    uniqueLabels.forEach(label => {
      const sum = metricDataDays.reduce((acc, day) => (
        acc + (day[`label_${label}`] || 0)
      ), 0);
      vals[label] = unitFormatFn ? unitFormatFn(sum) : sum;
    });
    return vals;
  }, [metricDataDays]);

  return (
    <Card style={{...style, overflow: 'hidden', minHeight: 300}}>
      <Card.Title 
        title={cardTitle}
        titleVariant='titleLarge'
        titleStyle={{color: colors.onPrimary, fontWeight: '500', textAlign: 'center'}}
        titleNumberOfLines={2}
        right={() =>
          <SegmentedButtons value={viewMode} onValueChange={(v) => setViewMode(v)}
            density='medium'
            buttons={[{
              icon: 'abacus', value: 'details',
              uncheckedColor: colors.onSurfaceDisabled,
              style: {
                minWidth: 0,
                backgroundColor: viewMode == 'details' ? colors.elevation.level2 : colors.surfaceDisabled
              },
              showSelectedCheck: true
            }, {
              icon: 'chart-bar',
              uncheckedColor: colors.onSurfaceDisabled,
              value: 'graph',
              style: {
                minWidth: 0,
                backgroundColor: viewMode == 'graph' ? colors.elevation.level2 : colors.surfaceDisabled
              },
              showSelectedCheck: true
            }]} />
        }
        style={{backgroundColor: colors.primary, paddingHorizontal: 8, minHeight: 60}} />
      <Card.Content style={{paddingHorizontal: 8}}>
        {viewMode=='details' &&
          <View style={{marginTop: 12, flexDirection: 'row', flexWrap: 'wrap'}}>
            { Object.keys(metricSumValues).map((label, i) =>
              <View style={{ width: '50%', paddingHorizontal: 8 }}>
                <Text variant='titleSmall'>{label}</Text>
                <Text>{metricSumValues[label] + ' ' + axisUnits}</Text>
              </View>
            )}
          </View>
        } {viewMode=='graph' &&
          <BarChart chartData={chartData} axisTitle={axisUnits} isHorizontal={true}/>
        }
      </Card.Content>
    </Card>
  )
}

export default MetricsCard;
