import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text } from 'react-native-paper';
import color from 'color';
import { formatForDisplay } from '../util';
import { useAppTheme } from '../appTheme';

type Value = [number, number];
type Props = {
  title: string;
  unit: string;
  value: Value;
  nDays: number;
  guidelines: number[];
};
const SummaryCard = ({ title, unit, value, nDays, guidelines }: Props) => {
  const { colors } = useAppTheme();
  const valueIsRange = value[0] != value[1];
  const perDayValue = value.map((v) => v / nDays) as Value;

  const formatVal = (v: Value) => {
    const opts = { maximumFractionDigits: 1 };
    if (valueIsRange) return `${formatForDisplay(v[0], opts)} - ${formatForDisplay(v[1], opts)}`;
    return `${formatForDisplay(v[0], opts)}`;
  };

  const colorFn = (v: Value) => {
    const low = v[0];
    const high = v[1];
    if (high < guidelines[guidelines.length - 1]) return colors.success;
    if (low > guidelines[0]) return colors.error;
    return colors.onSurfaceVariant;
  };

  useEffect(() => {
    console.debug('SummaryCard: value', value);
  }, [value]);

  return (
    <Card contentStyle={{ flex: 1 }}>
      {!isNaN(value[0]) ? (
        <Card.Content style={{ gap: 12, paddingBottom: 20, flex: 1 }}>
          <Text variant="bodyLarge">{title}</Text>
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
        <Card.Content style={{ flex: 1 }}>
          <Text>{title}</Text>
          <Text>No data available</Text>
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
