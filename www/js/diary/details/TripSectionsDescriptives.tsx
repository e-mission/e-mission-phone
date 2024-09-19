import React, { useContext } from 'react';
import { View, StyleSheet } from 'react-native';
import { Icon, Text, useTheme } from 'react-native-paper';
import useDerivedProperties from '../useDerivedProperties';
import TimelineContext from '../../TimelineContext';
import { base_modes } from 'e-mission-common';
import { labelKeyToText } from '../../survey/multilabel/confirmHelper';

const TripSectionsDescriptives = ({ trip, showConfirmedMode = false }) => {
  const { labelOptions, labelFor, confirmedModeFor } = useContext(TimelineContext);
  const {
    displayStartTime,
    displayTime,
    formattedDistance,
    distanceSuffix,
    formattedSectionProperties,
  } = useDerivedProperties(trip);

  const { colors } = useTheme();

  const confirmedModeForTrip = showConfirmedMode && confirmedModeFor(trip);
  let sections = formattedSectionProperties;
  /* if we're only showing the labeled mode, or there are no sections (i.e. unprocessed trip),
    we treat this as unimodal and use trip-level attributes to construct a single section */
  if (confirmedModeForTrip || !trip.sections?.length) {
    sections = [
      {
        startTime: displayStartTime,
        duration: displayTime,
        distance: formattedDistance,
        distanceSuffix,
        color: (confirmedModeForTrip || base_modes.BASE_MODES['UNPROCESSED']).color,
        icon: (confirmedModeForTrip || base_modes.BASE_MODES['UNPROCESSED']).icon,
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
            <View style={s.modeIconContainer(section.color)}>
              <Icon source={section.icon} color={colors.onPrimary} size={18} />
            </View>
            {confirmedModeForTrip && (
              <Text variant="labelSmall" numberOfLines={2} style={{ textAlign: 'center' }}>
                {labelKeyToText(confirmedModeForTrip.value)}
              </Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
};

const s = StyleSheet.create({
  modeIconContainer: (bgColor) => ({
    backgroundColor: bgColor,
    height: 32,
    width: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  }),
});

export default TripSectionsDescriptives;
