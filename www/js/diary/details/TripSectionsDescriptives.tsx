import React, { useContext } from 'react';
import { View } from 'react-native';
import { Text, useTheme } from 'react-native-paper'
import { Icon } from '../../components/Icon';
import useDerivedProperties from '../useDerivedProperties';
import { getBaseModeOfLabeledTrip } from '../diaryHelper';
import { LabelTabContext } from '../LabelTab';

const TripSectionsDescriptives = ({ trip, showLabeledMode=false }) => {

  const { labelOptions } = useContext(LabelTabContext);
  const { displayStartTime, displayTime, formattedDistance,
          distanceSuffix, formattedSectionProperties } = useDerivedProperties(trip);

  const { colors } = useTheme();

  let sections = formattedSectionProperties;
  if (showLabeledMode && trip?.userInput?.MODE) {
    const baseMode = getBaseModeOfLabeledTrip(trip, labelOptions);
    sections = [{
      startTime: displayStartTime,
      duration: displayTime,
      distance: formattedDistance,
      color: baseMode.color,
      icon: baseMode.icon,
      text: trip.userInput.MODE.text,
    }];
  }
  return (
    <View style={{ marginTop: 15 }}>
      {sections.map((section, i) => (
        <View key={i} style={{ marginVertical: 4, marginHorizontal: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexBasis: 100 }}>
            <Text variant='labelLarge'> {section.duration} </Text>
            <Text variant='bodyMedium'> {section.startTime} </Text>
          </View>
          <View>
            <Text variant='bodyLarge'>
              {`${section.distance} ${distanceSuffix}`}
            </Text>
          </View>
          <View style={{maxWidth: 50, alignItems: 'center'}}>
            <Icon mode='contained' icon={section.icon}
              size={18} style={{ height: 32, width: 32 }}
              iconColor={colors.onPrimary} containerColor={section.color} />
            {section.text &&
              <Text variant='labelSmall' numberOfLines={2} style={{textAlign: 'center'}}>
                {section.text}
              </Text>
            }
          </View>
        </View>
      ))}
    </View>
  );
}

export default TripSectionsDescriptives;
