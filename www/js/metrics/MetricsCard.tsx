
import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Card, Checkbox, Text, useTheme } from 'react-native-paper';
import colorLib from "color";
import BarChart from '../components/BarChart';
import { DayOfMetricData } from './metricsTypes';
import { formatDateRangeOfDays, getLabelsForDay, getUniqueLabelsForDays } from './metricsHelper';
import ToggleSwitch from '../components/ToggleSwitch';
import { cardStyles } from './MetricsTab';
import { labelKeyToRichMode, labelOptions } from '../survey/multilabel/confirmHelper';
import { getBaseModeByKey, getBaseModeByText } from '../diary/diaryHelper';
import { useTranslation } from 'react-i18next';

type Props = {
  cardTitle: string,
  userMetricsDays: DayOfMetricData[],
  aggMetricsDays: DayOfMetricData[],
  axisUnits: string,
  unitFormatFn?: (val: number) => string|number,
}
const MetricsCard = ({cardTitle, userMetricsDays, aggMetricsDays, axisUnits, unitFormatFn}: Props) => {

  const { colors } = useTheme();  
  const { t } = useTranslation();
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
          label: labelKeyToRichMode(label),
          x: unitFormatFn ? unitFormatFn(rawVal) : rawVal,
          y: day.ts * 1000, // time (as milliseconds) will go on Y axis because it will be a horizontal chart
        });
      });
    });
    // sort records (affects the order they appear in the chart legend)
    records.sort((a, b) => {
      if (a.label == 'Unlabeled') return 1;  // sort Unlabeled to the end
      if (b.label == 'Unlabeled') return -1; // sort Unlabeled to the end
      return (a.y as number) - (b.y as number); // otherwise, just sort by time
    });
    return records;
  }, [metricDataDays, viewMode]);

  const cardSubtitleText = useMemo(() => {
    const groupText = populationMode == 'user' ? t('main-metrics.user-totals')
                                               : t('main-metrics.group-totals');
    return `${groupText} (${formatDateRangeOfDays(metricDataDays)})`;
  }, [metricDataDays, populationMode]);

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

  // Unlabelled data shows up as 'UNKNOWN' grey and mostly transparent
  // All other modes are colored according to their base mode
  const getColorForLabel = (label: string) => {
    if (label == "Unlabeled") {
      const unknownModeColor = getBaseModeByKey('UNKNOWN').color;
      return colorLib(unknownModeColor).alpha(0.15).rgb().string();
    }
    return getBaseModeByText(label, labelOptions).color;
  }

  return (
    <Card style={cardStyles.card}>
      <Card.Title 
        title={cardTitle}
        titleVariant='titleLarge'
        titleStyle={cardStyles.titleText(colors)}
        subtitle={cardSubtitleText}
        subtitleStyle={[cardStyles.titleText(colors), cardStyles.subtitleText]}
        right={() =>
          <View style={{gap: 3}}>
            <ToggleSwitch density='high' value={viewMode} onValueChange={(v) => setViewMode(v as any)}
              buttons={[{ icon: 'abacus', value: 'details' }, { icon: 'chart-bar', value: 'graph' }]} />
            <ToggleSwitch density='high' value={populationMode} onValueChange={(p) => setPopulationMode(p as any)}
              buttons={[{ icon: 'account', value: 'user' }, { icon: 'account-group', value: 'aggregate' }]} />
          </View>
        }
        style={cardStyles.title(colors)} />
      <Card.Content style={cardStyles.content}>
        {viewMode=='details' &&
          <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
            { Object.keys(metricSumValues).map((label, i) =>
              <View style={{ width: '50%', paddingHorizontal: 8 }} key={i}>
                <Text variant='titleSmall'>{labelKeyToRichMode(label)}</Text>
                <Text>{metricSumValues[label] + ' ' + axisUnits}</Text>
              </View>
            )}
          </View>
        }
        {viewMode=='graph' && <>
          <BarChart records={chartData} axisTitle={axisUnits}
            isHorizontal={true} timeAxis={true} stacked={graphIsStacked}
            getColorForLabel={getColorForLabel} />
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
