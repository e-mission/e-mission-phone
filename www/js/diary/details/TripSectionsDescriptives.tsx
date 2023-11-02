import React, { useContext } from 'react';
import { View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { Icon } from '../../components/Icon';
import useDerivedProperties from '../useDerivedProperties';
import { getBaseModeByKey, getBaseModeOfLabeledTrip } from '../diaryHelper';
import { LabelTabContext } from '../LabelTab';

const TripSectionsDescriptives = ({ trip, showLabeledMode = false }) => {
  const { labelOptions } = useContext(LabelTabContext);
  const {
    displayStartTime,
    displayTime,
    formattedDistance,
    distanceSuffix,
    formattedSectionProperties,
  } = useDerivedProperties(trip);

  const { colors } = useTheme();

  let sections = formattedSectionProperties;
  /* if we're only showing the labeled mode, or there are no sections (i.e. unprocessed trip),
    we treat this as unimodal and use trip-level attributes to construct a single section */
  if ((showLabeledMode && trip?.userInput?.MODE) || !trip.sections?.length) {
    let baseMode;
    if (showLabeledMode && trip?.userInput?.MODE) {
      baseMode = getBaseModeOfLabeledTrip(trip, labelOptions);
    } else {
      baseMode = getBaseModeByKey('UNPROCESSED');
    }
    sections = [
      {
        startTime: displayStartTime,
        duration: displayTime,
        distance: formattedDistance,
        color: baseMode.color,
        icon: baseMode.icon,
        text: showLabeledMode && trip.userInput?.MODE?.text, // label text only shown for labeled trips
      },
    ];
  }
  return (
    <View style={{ marginTop: 15 }}>
      {sections.map((section, i) => (
        <View
          key={i}
          style={{
            marginVertical: 4,
            marginHorizontal: 10,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
          <View style={{ flexBasis: 100 }}>
            <Text variant="labelLarge"> {section.duration} </Text>
            <Text variant="bodyMedium"> {section.startTime} </Text>
          </View>
          <View>
            <Text variant="bodyLarge">{`${section.distance} ${distanceSuffix}`}</Text>
          </View>
          <View style={{ maxWidth: 50, alignItems: 'center' }}>
            <Icon
              mode="contained"
              icon={section.icon}
              size={18}
              style={{ height: 32, width: 32 }}
              iconColor={colors.onPrimary}
              containerColor={section.color}
            />
            {section.text && (
              <Text variant="labelSmall" numberOfLines={2} style={{ textAlign: 'center' }}>
                {section.text}
              </Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
};

export default TripSectionsDescriptives;
