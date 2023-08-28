
import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Card, Checkbox, Text, useTheme } from 'react-native-paper';
import BarChart from '../components/BarChart';
import { DayOfMetricData } from './metricsTypes';
import { getLabelsForDay, getUniqueLabelsForDays } from './metricsHelper';
import ToggleSwitch from './ToggleSwitch';
import { cardStyles } from './MetricsTab';
import { labelKeyToReadable } from '../survey/multilabel/confirmHelper';

type Props = {
  cardTitle: string,
  userMetricsDays: DayOfMetricData[],
  aggMetricsDays: DayOfMetricData[],
  axisUnits: string,
  unitFormatFn?: (val: number) => string|number,
  style: any,
}
const MetricsCard = ({cardTitle, userMetricsDays, aggMetricsDays, axisUnits, unitFormatFn, style}: Props) => {

  const { colors } = useTheme();  
  const [viewMode, setViewMode] = useState<'details'|'graph'>('details');
  const [populationMode, setPopulationMode] = useState<'user'|'aggregate'>('user');
  const [graphIsStacked, setGraphIsStacked] = useState(true);
  const metricDataDays = useMemo(() => (
    populationMode == 'user' ? userMetricsDays : aggMetricsDays
  ), [populationMode, userMetricsDays, aggMetricsDays]);

  // for each label on each day, create a record for the chart
  const chartData = useMemo(() => {
    if (!metricDataDays || viewMode != 'graph') return [];
    const records: {label: string, x: string|number, y: string|number}[] = [];
    metricDataDays.forEach(day => {
      const labels = getLabelsForDay(day);
      labels.forEach(label => {
        const rawVal = day[`label_${label}`];
        records.push({
          label: labelKeyToReadable(label),
          x: unitFormatFn ? unitFormatFn(rawVal) : rawVal,
          y: day.ts * 1000, // time (as milliseconds) will go on Y axis because it will be a horizontal chart
        });
      });
    });
    return records;
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
  }, [metricDataDays, viewMode]);

  return (
    <Card style={{...style, overflow: 'hidden', minHeight: 300}}>
      <Card.Title 
        title={cardTitle}
        titleVariant='titleLarge'
        titleStyle={{color: colors.onPrimary, fontWeight: '500', textAlign: 'center'}}
        titleNumberOfLines={2}
        right={() =>
          <View style={{gap: 3}}>
            <ToggleSwitch value={viewMode} setValue={setViewMode}
              options={[{ icon: 'abacus', value: 'details' }, { icon: 'chart-bar', value: 'graph' }]} />
            <ToggleSwitch value={populationMode} setValue={setPopulationMode}
              options={[{ icon: 'account', value: 'user' }, { icon: 'account-group', value: 'aggregate' }]} />
          </View>
        }
        style={cardStyles.title(colors)} />
      <Card.Content style={cardStyles.content}>
        {viewMode=='details' &&
          <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
            { Object.keys(metricSumValues).map((label, i) =>
              <View style={{ width: '50%', paddingHorizontal: 8 }}>
                <Text variant='titleSmall'>{labelKeyToReadable(label)}</Text>
                <Text>{metricSumValues[label] + ' ' + axisUnits}</Text>
              </View>
            )}
          </View>
        } {viewMode=='graph' && <>
          <BarChart records={chartData} axisTitle={axisUnits}
            isHorizontal={true} timeAxis={true} stacked={graphIsStacked} />
          <View style={{flexDirection: 'row', height: 10, alignItems: 'center', justifyContent: 'flex-end'}}>
            <Text variant='labelMedium'>Stack bars:</Text>
            <Checkbox 
              status={graphIsStacked ? 'checked' : 'unchecked'}
              onPress={() => setGraphIsStacked(!graphIsStacked)} />
          </View>
        </>}
      </Card.Content>
    </Card>
  )
}

export default MetricsCard;
