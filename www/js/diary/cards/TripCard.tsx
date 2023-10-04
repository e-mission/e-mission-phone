/* TripCard displays a card with information about a trip, including a map of the trip route,
    plus buttons for labeling trips and/or surveying the user about the trip.
  If the trip has not been processed on the server yet, this is a draft trip, and it
    will used the greyish 'draft' theme flavor.
*/

import React, { useContext } from "react";
import { View, useWindowDimensions, StyleSheet } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import LeafletView from "../../components/LeafletView";
import { useTranslation } from "react-i18next";
import MultilabelButtonGroup from "../../survey/multilabel/MultiLabelButtonGroup";
import UserInputButton from "../../survey/enketo/UserInputButton";
import useAppConfig from "../../useAppConfig";
import AddNoteButton from "../../survey/enketo/AddNoteButton";
import AddedNotesList from "../../survey/enketo/AddedNotesList";
import { getTheme } from "../../appTheme";
import { DiaryCard, cardStyles } from "./DiaryCard";
import { useNavigation } from "@react-navigation/native";
import { useAddressNames } from "../addressNamesHelper";
import { LabelTabContext } from "../LabelTab";
import useDerivedProperties from "../useDerivedProperties";
import StartEndLocations from "../components/StartEndLocations";
import ModesIndicator from "./ModesIndicator";
import { useGeojsonForTrip } from "../timelineHelper";

type Props = { trip: {[key: string]: any}};
const TripCard = ({ trip }: Props) => {

  const { t } = useTranslation();
  const { width: windowWidth } = useWindowDimensions();
  const appConfig = useAppConfig();
  const { displayStartTime, displayEndTime, displayDate, formattedDistance,
    distanceSuffix, displayTime, detectedModes } = useDerivedProperties(trip);
  let [ tripStartDisplayName, tripEndDisplayName ] = useAddressNames(trip);
  const navigation = useNavigation<any>();
  const { surveyOpt, labelOptions } = useContext(LabelTabContext);
  const tripGeojson = useGeojsonForTrip(trip, labelOptions, trip?.userInput?.MODE?.value);

  const isDraft = trip.key.includes('UNPROCESSED');
  const flavoredTheme = getTheme(isDraft ? 'draft' : undefined);

  function showDetail() {
    const tripId = trip._id.$oid;
    navigation.navigate("label.details", { tripId, flavoredTheme });
  }

  const mapOpts = { zoomControl: false, dragging: false };
  const showAddNoteButton = appConfig?.survey_info?.buttons?.['trip-notes'];
  const mapStyle = showAddNoteButton ? s.shortenedMap : s.fullHeightMap;
  return (
    <DiaryCard timelineEntry={trip} flavoredTheme={flavoredTheme} onPress={() => showDetail()}>
      <View style={[cardStyles.cardContent, {flexDirection: 'row-reverse'}]}
        accessibilityLabel={`Trip from ${displayStartTime} to ${displayEndTime}`}>
        <IconButton icon='dots-horizontal' size={24}
          accessibilityLabel="View trip details" onPress={() => showDetail()}
          style={{position: 'absolute', right: 0, top: 0, height: 16, width: 32,
                  justifyContent: 'center', margin: 4}} />
        <View style={s.rightPanel}>{/* right panel */}
          <View style={[cardStyles.panelSection, {marginTop: 0}]}>{/* date and distance */}
            <Text style={{fontSize: 14, textAlign: 'center'}}>
              <Text style={{fontWeight: 'bold', textDecorationLine: 'underline'}}>{displayDate}</Text>
            </Text>
            <Text style={{fontSize: 13, textAlign: 'center'}}>
              {t('diary.distance-in-time', {distance: formattedDistance, distsuffix: distanceSuffix, time: displayTime})}
            </Text>
          </View>
          <View style={cardStyles.panelSection}>{/* start and end locations */}
            <StartEndLocations displayStartName={tripStartDisplayName}
              displayEndName={tripEndDisplayName} />
          </View>
          <View style={[cardStyles.panelSection, {marginBottom: 0}]}>{/* mode and purpose buttons / survey button */}
            {surveyOpt?.elementTag == 'multilabel' &&
                <MultilabelButtonGroup trip={trip} />}
            {surveyOpt?.elementTag == 'enketo-trip-button'
                && <UserInputButton timelineEntry={trip} />}
          </View>
        </View>
        <View style={{flex: 1, paddingBottom: showAddNoteButton ? 8 : 0}}>{/* left panel */}
          <LeafletView geojson={tripGeojson} opts={mapOpts}
                        /* the map should be at least as tall as it is wide
                          so it doesn't look squished */
                        style={[{minHeight: windowWidth / 2}, mapStyle]} />
          <ModesIndicator trip={trip} detectedModes={detectedModes} />
          {showAddNoteButton && 
            <View style={s.notesButton}>
              <AddNoteButton timelineEntry={trip}
                              notesConfig={appConfig?.survey_info?.buttons?.['trip-notes']}
                              storeKey={'manual/trip_addition_input'} />
            </View>
          }
        </View>
      </View>
      {trip.additionsList?.length != 0 &&
        <View style={cardStyles.cardFooter}>
          <AddedNotesList timelineEntry={trip} additionEntries={trip.additionsList} />
        </View>
      }
    </DiaryCard>
  );
};

const s = StyleSheet.create({
  fullHeightMap: {
    flex: 1,
    overflow: 'hidden',
    borderTopLeftRadius: 15,
    borderBottomLeftRadius: 15,
  },
  shortenedMap: {
    flex: 4,
    overflow: 'hidden',
    borderTopLeftRadius: 15,
    borderBottomRightRadius: 15,
  },
  notesButton: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    minWidth: 150,
    margin: 'auto',
  },
  rightPanel: {
    flex: 1,
    paddingHorizontal: 5,
    paddingVertical: 8,
  },
  locationText: {
    fontSize: 12,
    lineHeight: 12,
  },
});

export default TripCard;
