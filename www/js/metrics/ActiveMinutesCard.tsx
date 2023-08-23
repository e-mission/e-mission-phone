
import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Card, Text, useTheme} from 'react-native-paper';
import { MetricsData } from './metricsTypes';
import { cardStyles } from './MetricsTab';
import { useImperialConfig } from '../config/useImperialConfig';

const ACTIVE_MODES = ['walk', 'bike'];

type Props = { userMetrics: MetricsData }
const ActiveMinutesCard = ({ userMetrics }: Props) => {

  const { colors } = useTheme();
  
  // number of seconds for each of [walk, bike]
  const activeModesDurations = useMemo(() => {
    if (!userMetrics?.duration) return [];
    return ACTIVE_MODES.map(mode => {
      const sum = userMetrics.duration.reduce((acc, day) => (
        acc + (day[`label_${mode}`] || 0)
      ), 0);
      return sum;
    });
  }, [userMetrics?.duration]);

  return (
    <Card style={{overflow: 'hidden', minHeight: 300}}>
      <Card.Title 
        title={'Active minutes'} // TODO: i18n
        titleVariant='titleLarge'
        titleStyle={cardStyles.titleText(colors)}
        titleNumberOfLines={2}
        style={cardStyles.title(colors)} />
      <Card.Content style={{paddingHorizontal: 8}}>
        { activeModesDurations.map((mode, i) => (
          <View style={{ width: '50%', paddingHorizontal: 8 }}>
            <Text variant='titleSmall'>{ACTIVE_MODES[i]}</Text>
            <Text>{Math.round(activeModesDurations[i] / 60) + ' minutes'}</Text>{/* TODO i18n*/}
          </View>
        ))}
      </Card.Content>
    </Card>
  )
}

export default ActiveMinutesCard;
