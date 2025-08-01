/* UntrackedTimeCard displays a card with information about untracked time.
  'Untracked time' is when, for whatever reason, we don't have any location data,
    such as if the phone was off or in airplane mode.
  This card displays the time range during which we don't have data, and
    shows the start and end locations. In this case, 'start' is last known location
    before the untracked time, and 'end' is the first known location after.
  UntrackedTimeCards use the reddish 'untracked' theme flavor.
*/

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { getTheme } from '../../appTheme';
import { useTranslation } from 'react-i18next';
import { DiaryCard, cardStyles } from './DiaryCard';
import useAddressNames from '../useAddressNames';
import useDerivedProperties from '../useDerivedProperties';
import StartEndLocations from '../components/StartEndLocations';

type Props = { triplike: { [key: string]: any } };
const UntrackedTimeCard = ({ triplike }: Props) => {
  const { t } = useTranslation();
  const { displayStartTime, displayEndTime, displayDate } = useDerivedProperties(triplike);
  const [triplikeStartDisplayName, triplikeEndDisplayName] = useAddressNames(triplike);

  const flavoredTheme = getTheme('untracked');

  return (
    <DiaryCard timelineEntry={triplike} flavoredTheme={flavoredTheme}>
      <View
        style={[cardStyles.cardContent, { marginVertical: 12 }]}
        focusable={true}
        accessibilityLabel={`Untracked time from ${displayStartTime} to ${displayEndTime}`}>
        <View>
          {/*  date and distance */}
          <Text style={{ fontSize: 14, margin: 'auto' }}>
            <Text style={{ fontWeight: 'bold', textDecorationLine: 'underline' }}>
              {displayDate}
            </Text>
          </Text>
        </View>
        <View style={[cardStyles.panelSection, { margin: 'auto' }]}>
          <Text
            style={[
              s.untrackedText,
              {
                backgroundColor: flavoredTheme.colors.primary,
                color: flavoredTheme.colors.onPrimary,
              },
            ]}>
            {t('diary.untracked-time-range', { start: displayStartTime, end: displayEndTime })}
          </Text>
        </View>
        <View>
          {/* start and end locations */}
          <StartEndLocations
            centered={true}
            displayStartName={triplikeStartDisplayName}
            displayEndName={triplikeEndDisplayName}
          />
        </View>
      </View>
    </DiaryCard>
  );
};

const s = StyleSheet.create({
  untrackedText: {
    borderRadius: 5,
    paddingVertical: 1,
    paddingHorizontal: 8,
    fontSize: 13,
  },
  locationText: {
    fontSize: 12,
    lineHeight: 12,
  },
});

export default UntrackedTimeCard;
