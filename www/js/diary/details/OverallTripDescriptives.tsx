import React from 'react';
import { View } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import useDerivedProperties from '../useDerivedProperties';
import { useTranslation } from 'react-i18next';

const OverallTripDescriptives = ({ trip }) => {
  const { t } = useTranslation();
  const {
    displayStartTime,
    displayEndTime,
    displayTime,
    formattedDistance,
    distanceSuffix,
    detectedModes,
  } = useDerivedProperties(trip);

  return (
    <View style={{ paddingHorizontal: 10, marginVertical: 5 }}>
      <Text variant="titleMedium" style={{ textAlign: 'center' }}>
        Overall
      </Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={{ justifyContent: 'center' }}>
          <Text variant="labelLarge"> {displayTime} </Text>
          <Text variant="bodyMedium"> {`${displayStartTime} - ${displayEndTime}`} </Text>
        </View>
        <View style={{ justifyContent: 'center' }}>
          <Text variant="bodyLarge">{`${formattedDistance} ${distanceSuffix}`}</Text>
        </View>
        <View style={{ justifyContent: 'center' }}>
          {detectedModes?.map?.((pct, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon source={pct.icon} size={16} color={pct.color} />
              <Text style={{ fontSize: 13, fontWeight: 'bold' }}>{pct.pct}%</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

export default OverallTripDescriptives;
