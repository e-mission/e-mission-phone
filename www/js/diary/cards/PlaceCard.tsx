/* PlaceCard displays a card with information about a place.
  PlaceCards are only shown in some configurations of the app,
    when the goal is to collect survey data about places.
  PlaceCard displays the place name and the AddNoteButton for getting
    survey data about the place.
  PlaceCards use the blueish 'place' theme flavor.
*/

import React from "react";
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import useAppConfig from "../../useAppConfig";
import AddNoteButton from "../../survey/enketo/AddNoteButton";
import AddedNotesList from "../../survey/enketo/AddedNotesList";
import { getTheme } from "../../appTheme";
import { DiaryCard, cardStyles } from "./DiaryCard";
import { useAddressNames } from "../addressNamesHelper";
import useDerivedProperties from "../useDerivedProperties";
import StartEndLocations from "../components/StartEndLocations";

type Props = { place: {[key: string]: any} };
const PlaceCard = ({ place }: Props) => {

  const appConfig = useAppConfig();
  const { displayStartTime, displayEndTime, displayDate } = useDerivedProperties(place);
  let [ placeDisplayName ] = useAddressNames(place);

  const flavoredTheme = getTheme('place');

  return (
    <DiaryCard timelineEntry={place} flavoredTheme={flavoredTheme}>
      <View style={[cardStyles.cardContent, s.placeCardContent]} focusable={true}
          accessibilityLabel={`Place from ${displayStartTime} to ${displayEndTime}`}>
        <View>{/*  date and distance */}
          <Text style={{ fontSize: 14, textAlign: 'center' }}>
            <Text style={{ fontWeight: 'bold', textDecorationLine: 'underline' }}>{displayDate}</Text>
          </Text>
        </View>
        <View style={cardStyles.panelSection}>{/*  place name */}
          <StartEndLocations centered={true}
            displayStartName={placeDisplayName} />
        </View>
        <View style={{margin: 'auto'}}>{/*  add note button */}
          <View style={s.notesButton}>
            <AddNoteButton timelineEntry={place}
              notesConfig={appConfig?.survey_info?.buttons?.['place-notes']}
              storeKey={'manual/place_addition_input'} />
          </View>
        </View>
      </View>
      <View style={cardStyles.cardFooter}>
        <AddedNotesList timelineEntry={place} additionEntries={place.additionsList} />
      </View>
    </DiaryCard>
  );
};

const s = StyleSheet.create({
  placeCardContent: {
    marginTop: 12,
    marginBottom: 6,
  },
  notesButton: {
    paddingHorizontal: 8,
    minWidth: 150,
    margin: 'auto',
  },
  locationText: {
    fontSize: 14,
    lineHeight: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default PlaceCard;
