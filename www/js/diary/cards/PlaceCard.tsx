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
import { object } from "prop-types";
import useAppConfig from "../../useAppConfig";
import AddNoteButton from "../../survey/enketo/AddNoteButton";
import AddedNotesList from "../../survey/enketo/AddedNotesList";
import { getTheme } from "../../appTheme";
import { DiaryCard, cardStyles } from "./DiaryCard";
import { useAddressNames } from "../addressNamesHelper";
import { Icon } from "../../components/Icon";

const PlaceCard = ({ place }) => {

  const { appConfig, loading } = useAppConfig();
  let [ placeDisplayName ] = useAddressNames(place);

  const flavoredTheme = getTheme('place');

  return (
    <DiaryCard timelineEntry={place} flavoredTheme={flavoredTheme}>
      <View style={[cardStyles.cardContent, {marginVertical: 12}]}>
        <View>{/*  date and distance */}
          <Text style={{ fontSize: 14, textAlign: 'center' }}>
            <Text style={{ fontWeight: 'bold', textDecorationLine: 'underline' }}>{place.display_date}</Text>
          </Text>
        </View>
        <View style={cardStyles.panelSection}>{/*  place name */}
          <View style={[cardStyles.location, {paddingHorizontal: 10}]}>
            <Icon icon='map-marker-star' size={18} style={cardStyles.locationIcon} />
            <Text style={s.locationText} accessibilityLabel={`Location: ${placeDisplayName}`}>
              {placeDisplayName}
            </Text>
          </View>
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

PlaceCard.propTypes = {
  place: object,
}

export default PlaceCard;
