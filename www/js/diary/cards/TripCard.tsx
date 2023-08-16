/* TripCard displays a card with information about a trip, including a map of the trip route,
    plus buttons for labeling trips and/or surveying the user about the trip.
  If the trip has not been processed on the server yet, this is a draft trip, and it
    will used the greenish/greyish 'draft' theme flavor.
*/

import React, { useContext } from "react";
import { View, useWindowDimensions, StyleSheet } from 'react-native';
import { Divider, Text, IconButton } from 'react-native-paper';
import { object } from "prop-types";
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
import { useImperialConfig } from "../../config/useImperialConfig";
import { useAddressNames } from "../addressNamesHelper";
import { Icon } from "../../components/Icon";
import { LabelTabContext } from "../LabelTab";

const TripCard = ({ trip }) => {

  const { t } = useTranslation();
  const { width: windowWidth } = useWindowDimensions();
  const { appConfig, loading } = useAppConfig();
  const { getFormattedDistance, distanceSuffix } = useImperialConfig();
  let [ tripStartDisplayName, tripEndDisplayName ] = useAddressNames(trip);
  const navigation = useNavigation<any>();
  const { surveyOpt } = useContext(LabelTabContext);

  const isDraft = trip.key.includes('UNPROCESSED');
  const flavoredTheme = getTheme(isDraft ? 'draft' : undefined);

  function showDetail() {
    navigation.navigate("label.details", { tripId: trip._id.$oid });
  }

  const mapOpts = { zoomControl: false, dragging: false };
  const showAddNoteButton = appConfig?.survey_info?.buttons?.['trip-notes'];
  const mapStyle = showAddNoteButton ? s.shortenedMap : s.fullHeightMap;
  return (
    <DiaryCard timelineEntry={trip} flavoredTheme={flavoredTheme} onPress={() => showDetail()}>
      <View style={[cardStyles.cardContent, {flexDirection: 'row-reverse'}]}
        accessibilityLabel={`Trip from ${trip.display_start_time} to ${trip.display_end_time}`}>
        <IconButton icon='dots-horizontal' size={24}
          accessibilityLabel="View trip details" onPress={() => showDetail()}
          style={{position: 'absolute', right: 0, top: 0, height: 16, width: 32,
                  justifyContent: 'center', margin: 4}} />
        <View style={s.rightPanel}>{/* right panel */}
          <View style={[cardStyles.panelSection, {marginTop: 0}]}>{/* date and distance */}
            <Text style={{fontSize: 14, textAlign: 'center'}}>
              <Text style={{fontWeight: 'bold', textDecorationLine: 'underline'}}>{trip.display_date}</Text>
            </Text>
            <Text style={{fontSize: 13, textAlign: 'center'}}>
              {t('diary.distance-in-time', {distance: getFormattedDistance(trip.distance), distsuffix: distanceSuffix, time: trip.display_time})}
            </Text>
          </View>
          <View style={cardStyles.panelSection}>{/* start and end locations */}
            <View style={[cardStyles.location, {justifyContent: 'flex-start'}]}>
              <Icon icon='map-marker-star' iconColor={flavoredTheme.colors.primaryContainer}
                size={18} style={cardStyles.locationIcon} />
              <Text numberOfLines={2} style={s.locationText}
                    accessibilityLabel={`Start Location: ${tripStartDisplayName}`}>
                {tripStartDisplayName}
              </Text>
            </View>
            <Divider style={{marginVertical: 4}} />
            <View style={[cardStyles.location, {justifyContent: 'flex-start'}]}>
              <Icon icon='flag' iconColor={flavoredTheme.colors.primary}
                size={18} style={cardStyles.locationIcon} />
              <Text numberOfLines={2} style={s.locationText}
                    accessibilityLabel={`End Location: ${tripEndDisplayName}`}>
                {tripEndDisplayName}
              </Text>
            </View>
          </View>
          <View style={[cardStyles.panelSection, {marginBottom: 0}]}>{/* mode and purpose buttons / survey button */}
            {surveyOpt?.elementTag == 'multilabel' &&
                <MultilabelButtonGroup trip={trip} />}
            {surveyOpt?.elementTag == 'enketo-trip-button'
                && <UserInputButton timelineEntry={trip} />}
          </View>
        </View>
        <View style={{flex: 1, paddingBottom: showAddNoteButton ? 8 : 0}}>{/* left panel */}
          <LeafletView geojson={trip.geojson} opts={mapOpts}
                        /* the map should be at least as tall as it is wide
                          so it doesn't look squished */
                        style={[{minHeight: windowWidth / 2}, mapStyle]} />
          <View style={s.modePercents}>
            {trip.percentages?.map?.((pct, i) => (
              <View key={i} style={{flexDirection: 'row', marginHorizontal: 4, alignItems: 'center'}}>
                <Icon icon={pct.icon} iconColor={pct.color} size={15} />
                <Text accessibilityLabel={`Sensed mode: ${pct.icon}, ${pct.pct}%`} style={{color: pct.color, fontSize: 12}}>{pct.pct}%</Text>
              </View>
            ))}
          </View>
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
  modePercents: {
    position: 'absolute',
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 50,
    left: '50%',
    transform: 'translate(-50%)',
    marginVertical: 5,
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

TripCard.propTypes = {
  trip: object,
}

export default TripCard;
