
import React, { useMemo, useState } from 'react';
import { Card, SegmentedButtons, useTheme} from 'react-native-paper';
import BarChart from '../components/BarChart';
import MetricsDetails from './MetricDetails';
import { DayOfMetricData } from './metricsTypes';
import { getUniqueLabelsForDays } from './metricsHelper';

type Props = {
  style: any,
  cardTitle: string,
  metricDataDays: DayOfMetricData[],
  axisUnits: string,
}
const MetricsCard = ({cardTitle, metricDataDays, axisUnits, style}: Props) => {

  const { colors } = useTheme();
  
  const [viewMode, setViewMode] = useState<'details'|'graph'>('details');
  const chartData = useMemo(() => {
    if (!metricDataDays) return [];
    const uniqueLabels = getUniqueLabelsForDays(metricDataDays);

    // for each label, format data for chart, with a record for each day with that label
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
        {viewMode=='details' ?
          <MetricsDetails metricDataDays={metricDataDays} style={{ marginTop: 12 }} />
        :
          <BarChart chartData={chartData} axisTitle={axisUnits} isHorizontal={true}/>
        }
      </Card.Content>
    </Card>
  )
}

export default MetricsCard;
