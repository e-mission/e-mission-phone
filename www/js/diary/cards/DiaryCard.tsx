/* DiaryCard is a common wrapper used by all the cards in the diary view,
    including TripCard, PlaceCard, and UntrackedTimeCard.
  It provides the timestamp badges at the top and bottom of the card,
    and renders the children passed to it inside the Card.
  It also provides a PaperProvider to the children, so that they can use
    a flavor of the theme that is appropriate for the card type.
    (see appTheme.ts for more info on theme flavors)
*/

import React from 'react';
import { View, useWindowDimensions, StyleSheet } from 'react-native';
import { Card, PaperProvider, useTheme } from 'react-native-paper';
import TimestampBadge from './TimestampBadge';
import useDerivedProperties from '../useDerivedProperties';

export const DiaryCard = ({ timelineEntry, children, flavoredTheme, ...otherProps }) => {
  const { width: windowWidth } = useWindowDimensions();
  const { displayStartTime, displayEndTime, displayStartDateAbbr, displayEndDateAbbr } =
    useDerivedProperties(timelineEntry);
  const theme = flavoredTheme || useTheme();

  return (
    <PaperProvider theme={theme}>
      <Card
        style={[cardStyles.card, { width: windowWidth * 0.9 }]}
        contentStyle={{ alignItems: 'center' }}
        {...otherProps}>
        <View
          aria-hidden={true}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: -10,
            justifyContent: 'center',
            zIndex: 999,
          }}>
          {displayStartTime && (
            <TimestampBadge time={displayStartTime} date={displayStartDateAbbr} lightBg={true} />
          )}
        </View>
        {children}
        <View
          aria-hidden={true}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: -10,
            justifyContent: 'center',
            zIndex: 999,
          }}>
          {displayEndTime && (
            <TimestampBadge time={displayEndTime} date={displayEndDateAbbr} lightBg={false} />
          )}
        </View>
      </Card>
    </PaperProvider>
  );
};

// common styles, used for DiaryCard
export const cardStyles = StyleSheet.create({
  card: {
    position: 'relative',
    alignSelf: 'center',
    marginVertical: 10,
  },
  cardContent: {
    flex: 1,
    width: '100%',
  },
  panelSection: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginVertical: 'auto',
  },
  cardFooter: {
    width: '100%',
    paddingBottom: 10,
  },
});
