import React from 'react';
import { View } from 'react-native';
import { Text, useTheme } from 'react-native-paper'
import { Icon } from '../../components/Icon';
import useDerivedProperties from '../useDerivedProperties';

const TripSectionsDetails = ({ trip }) => {

  const { formattedSectionProperties } = useDerivedProperties(trip);
  const { colors } = useTheme();

  return (
    <View style={{ marginTop: 15 }}>
      {formattedSectionProperties.map((section, i) => (
        <View key={i} style={{ marginVertical: 4, marginHorizontal: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ fontSize: 15 }}> {section.fmt_time_range} </Text>
            <Text style={{ fontSize: 13 }}> {section.fmt_time} </Text>
          </View>
          <View>
            <Text style={{ fontSize: 20 }}>
              {`${section.fmt_distance} ${section.fmt_distance_suffix}`}
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
