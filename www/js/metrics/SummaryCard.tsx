import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { formatForDisplay } from '../datetimeUtil';
import { colors } from '../appTheme';
import { t } from 'i18next';
import { FootprintGoal } from '../types/appConfigTypes';
import { metricsStyles } from './MetricsScreen';

type Value = [number, number];
type Props = {
  title: string;
  unit: string;
  value: Value;
  nDays: number;
  goals: FootprintGoal[];
};
const SummaryCard = ({ title, unit, value, nDays, goals }: Props) => {
  const valueIsRange = value[0] != value[1];
  const perDayValue = value.map((v) => v / nDays) as Value;

  const formatVal = (v: Value) => {
    if (valueIsRange) return `${formatForDisplay(v[0])} - ${formatForDisplay(v[1])}`;
    return `${formatForDisplay(v[0])}`;
  };

  const colorFn = (v: Value) => {
    const low = v[0];
    const high = v[1];
    if (high < goals[0]?.value) return colors.success;
    if (low > goals[goals.length - 1]?.value) return colors.error;
    return colors.onSurfaceVariant;
  };

  return (
    <Card style={{ flex: 1 }}>
      <Card.Title title={title} />
      {!isNaN(value[0]) ? (
        <Card.Content style={metricsStyles.content}>
          <Text style={s.titleText}>
            {formatVal(value)} {unit}
          </Text>
          <View>
            <View style={[s.perDay, { borderLeftColor: colorFn(perDayValue) }]}>
              <Text
                style={{
                  fontWeight: 'bold',
                  fontSize: 16,
                  color: colorFn(perDayValue),
                }}>
                {formatVal(perDayValue)} {unit}
              </Text>
              <Text>per day</Text>
            </View>
          </View>
        </Card.Content>
      ) : (
        <Card.Content style={metricsStyles.content}>
          <Text variant="labelMedium">{t('metrics.no-data')}</Text>
        </Card.Content>
      )}
    </Card>
  );
};

const s = StyleSheet.create({
  titleText: {
    fontSize: 24,
    fontWeight: 'bold',
    margin: 'auto',
  },
  perDay: {
    borderLeftWidth: 5,
    paddingLeft: 12,
    marginLeft: 4,
  },
});

export default SummaryCard;
