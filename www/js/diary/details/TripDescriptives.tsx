import React from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper'
import useDerivedProperties from '../useDerivedProperties';
import { Icon } from '../../components/Icon';
import { useTranslation } from 'react-i18next';

const TripDescriptives = ({ trip }) => {

  const { t } = useTranslation();
  const { displayTime, formattedDistance, distanceSuffix, detectedModes } = useDerivedProperties(trip);

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24, marginVertical: 5 }}>
      <View style={{ justifyContent: 'center' }}>
        <Text style={{ fontSize: 15 }}>
          {t('diary.distance')}
        </Text>
        <Text style={{ fontSize: 13, fontWeight: 'bold' }}>
          {`${formattedDistance} ${distanceSuffix}`}
        </Text>
      </View>
      <View style={{ justifyContent: 'center' }}>
        <Text style={{ fontSize: 15 }}>
          {t('diary.time')}
        </Text>
        <Text style={{ fontSize: 13, fontWeight: 'bold' }}>
          {displayTime}
        </Text>
      </View>
      <View style={{ justifyContent: 'center' }}>
        {detectedModes?.map?.((pct, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Icon icon={pct.icon} size={16} iconColor={pct.color} />
            <Text style={{ fontSize: 13, fontWeight: 'bold' }}>
              {pct.pct}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default TripDescriptives;
