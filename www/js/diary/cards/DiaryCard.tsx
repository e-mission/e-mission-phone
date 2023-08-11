/* DiaryCard is a common wrapper used by all the cards in the diary view,
    including TripCard, PlaceCard, and UntrackedTimeCard.
  It provides the timestamp badges at the top and bottom of the card,
    and renders the children passed to it inside the Card.
  It also provides a PaperProvider to the children, so that they can use
    a flavor of the theme that is appropriate for the card type.
    (see appTheme.ts for more info on theme flavors)
*/

import React from "react";
import { View, useWindowDimensions, StyleSheet } from 'react-native';
import { Card, PaperProvider, useTheme } from 'react-native-paper';
import TimestampBadge from "./TimestampBadge";

export const DiaryCard = ({ timelineEntry, children, flavoredTheme, ...otherProps }) => {
  const { height, width } = useWindowDimensions();
  const theme = flavoredTheme || useTheme();

  return (
    <PaperProvider theme={theme}>
      <Card style={[cardStyles.card, { width: width * .9 }]}
        contentStyle={{ alignItems: 'center' }} {...otherProps}>
        <View accessibilityHidden={true} style={{ position: 'absolute', left: 0, right: 0, top: -10, justifyContent: 'center', zIndex: 999 }}>
          <TimestampBadge time={timelineEntry.display_start_time} date={timelineEntry.display_start_date_abbr}
            lightBg={true} />
        </View>
        {children}
        <View accessibilityHidden={true} style={{ position: 'absolute', left: 0, right: 0, bottom: -10, justifyContent: 'center', zIndex: 999 }}>
          <TimestampBadge time={timelineEntry.display_end_time} date={timelineEntry.display_end_date_abbr}
            lightBg={false} />
        </View>
      </Card>
    </PaperProvider>
  );
}

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
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationIcon: {
    width: 18,
    height: 24,
    margin: 0,
    marginRight: 5,
  },
  cardFooter: {
    width: '100%',
    paddingBottom: 10,
  },
});
