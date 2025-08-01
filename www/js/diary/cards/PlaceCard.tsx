/* PlaceCard displays a card with information about a place.
  PlaceCards are only shown in some configurations of the app,
    when the goal is to collect survey data about places.
  PlaceCard displays the place name and the AddNoteButton for getting
    survey data about the place.
  PlaceCards use the blueish 'place' theme flavor.
*/

import React, { useContext } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import useAppConfig from '../../useAppConfig';
import AddNoteButton from '../../survey/enketo/AddNoteButton';
import AddedNotesList from '../../survey/enketo/AddedNotesList';
import { getTheme } from '../../appTheme';
import { DiaryCard, cardStyles } from './DiaryCard';
import useAddressNames from '../useAddressNames';
import useDerivedProperties from '../useDerivedProperties';
import StartEndLocations from '../components/StartEndLocations';
import TimelineContext from '../../TimelineContext';
import { ConfirmedPlace } from '../../types/diaryTypes';
import { EnketoUserInputEntry } from '../../survey/enketo/enketoHelper';

type Props = { place: ConfirmedPlace };
const PlaceCard = ({ place }: Props) => {
  const appConfig = useAppConfig();
  const { notesFor } = useContext(TimelineContext);
  const { displayStartTime, displayEndTime, displayDate } = useDerivedProperties(place);
  let [placeDisplayName] = useAddressNames(place);

  const flavoredTheme = getTheme('place');

  return (
    <DiaryCard timelineEntry={place} flavoredTheme={flavoredTheme}>
      <View
        style={[cardStyles.cardContent, s.placeCardContent]}
        focusable={true}
        accessibilityLabel={`Place from ${displayStartTime} to ${displayEndTime}`}>
        <View>
          {/*  date and distance */}
          <Text style={{ fontSize: 14, margin: 'auto' }}>
            <Text style={{ fontWeight: 'bold', textDecorationLine: 'underline' }}>
              {displayDate}
            </Text>
          </Text>
        </View>
        <View style={cardStyles.panelSection}>
          {/*  place name */}
          <StartEndLocations centered={true} displayStartName={placeDisplayName} />
        </View>
        {/*  add note button */}
        <View style={[cardStyles.notesButton, { paddingTop: 0 }]}>
          <AddNoteButton
            timelineEntry={place}
            notesConfig={appConfig?.survey_info?.buttons?.['place-notes']}
            storeKey={'manual/place_addition_input'}
          />
        </View>
      </View>
      {notesFor(place)?.length && (
        <View style={cardStyles.cardFooter}>
          <AddedNotesList
            timelineEntry={place}
            additionEntries={(notesFor(place) as EnketoUserInputEntry[]) || []}
          />
        </View>
      )}
    </DiaryCard>
  );
};

const s = StyleSheet.create({
  placeCardContent: {
    marginTop: 12,
    marginBottom: 6,
  },
  locationText: {
    fontSize: 14,
    lineHeight: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default PlaceCard;
