/* UntrackedTimeCard displays a card with information about untracked time.
  'Untracked time' is when, for whatever reason, we don't have any location data,
    such as if the phone was off or in airplane mode.
  This card displays the time range during which we don't have data, and
    shows the start and end locations. In this case, 'start' is last known location
    before the untracked time, and 'end' is the first known location after.
  UntrackedTimeCards use the reddish 'untracked' theme flavor.
*/

import React, { useEffect, useState } from "react";
import { angularize } from "../angular-react-helper";
import { View, StyleSheet } from 'react-native';
import { Divider, IconButton, Text } from 'react-native-paper';
import { object } from "prop-types";
import { getTheme } from "../appTheme";
import { useTranslation } from "react-i18next";
import { DiaryCard, cardStyles } from "./DiaryCard";

const UntrackedTimeCard = ({ triplike }) => {
  const { t } = useTranslation();
  const [rerender, setRerender] = useState(false);

  useEffect(() => {
    triplike.onChanged = () => {
      console.log("DiaryCard: timelineEntry changed, force update");
      setRerender(!rerender);
    }
  }, []);

  const flavoredTheme = getTheme('untracked');

  return (
    <DiaryCard timelineEntry={triplike} flavoredTheme={flavoredTheme}>
      <View style={[cardStyles.cardContent, {marginVertical: 12}]}>
        <View>{/*  date and distance */}
          <Text style={{ fontSize: 14, textAlign: 'center' }}>
            <Text style={{ fontWeight: 'bold', textDecorationLine: 'underline' }}>{triplike.display_date}</Text>
          </Text>
        </View>
        <View style={[cardStyles.panelSection, {margin: 'auto'}]}>
          <Text style={[s.untrackedText, {backgroundColor: flavoredTheme.colors.primary, color: flavoredTheme.colors.onPrimary}]}>
            {t('diary.untracked-time-range', { start: triplike.display_start_time, end: triplike.display_end_time })}
          </Text>
        </View>
        <View>{/*  start and end locations */}
          <View style={cardStyles.location}>
            <IconButton icon='map-marker-star' iconColor={flavoredTheme.colors.primaryContainer} size={18}
              style={cardStyles.locationIcon} />
            <Text style={s.locationText}>
              {triplike.start_display_name}
            </Text>
          </View>
          <Divider style={{ marginVertical: 2 }} />
          <View style={cardStyles.location}>
            <IconButton icon='flag' iconColor={flavoredTheme.colors.primary} size={18}
              style={cardStyles.locationIcon} />
            <Text style={s.locationText}>
              {triplike.end_display_name}
            </Text>
          </View>
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
    fontSize: 13
  },
  locationText: {
    fontSize: 12,
    lineHeight: 12,
  },
});

UntrackedTimeCard.propTypes = {
  triplike: object,
}

export default UntrackedTimeCard;
