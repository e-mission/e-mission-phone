import React, { useContext } from 'react';
import { View } from 'react-native';
import { Text, useTheme } from 'react-native-paper'
import { Icon } from '../../components/Icon';
import useDerivedProperties from '../useDerivedProperties';
import { getBaseModeOfLabeledTrip } from '../diaryHelper';
import { LabelTabContext } from '../LabelTab';

const TripSectionsDetails = ({ trip, showLabeledMode=false }) => {

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
    }];
  }
  return (
    <View style={{ marginTop: 15 }}>
      {sections.map((section, i) => (
        <View key={i} style={{ marginVertical: 4, marginHorizontal: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ fontSize: 15 }}> {section.duration} </Text>
            <Text style={{ fontSize: 13 }}> {section.startTime} </Text>
          </View>
          <View>
            <Text style={{ fontSize: 20 }}>
              {`${section.distance} ${distanceSuffix}`}
            </Text>
          </View>
          <View>
            <Icon mode='contained' icon={section.icon}
              size={18} style={{ height: 32, width: 32 }}
              iconColor={colors.onPrimary} containerColor={section.color} />
          </View>
        </View>
      ))}
    </View>
  );
}

export default TripSectionsDetails;
