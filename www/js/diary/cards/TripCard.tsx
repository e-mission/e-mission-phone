/* TripCard displays a card with information about a trip, including a map of the trip route,
    plus buttons for labeling trips and/or surveying the user about the trip.
  If the trip has not been processed on the server yet, this is a draft trip, and it
    will used the greenish/greyish 'draft' theme flavor.
*/

import React, { useEffect, useState } from "react";
import { angularize, getAngularService } from "../../angular-react-helper";
import { View, useWindowDimensions, StyleSheet } from 'react-native';
import { Card, Divider, IconButton, PaperProvider, Text, useTheme } from 'react-native-paper';
import { object } from "prop-types";
import LeafletView from "../../components/LeafletView";
import { useTranslation } from "react-i18next";
import TimestampBadge from "./TimestampBadge";
import MultilabelButtonGroup from "../../survey/multilabel/MultiLabelButtonGroup";
import UserInputButton from "../../survey/enketo/UserInputButton";
import useAppConfig from "../../useAppConfig";
import AddNoteButton from "../../survey/enketo/AddNoteButton";
import AddedNotesList from "../../survey/enketo/AddedNotesList";
import { getTheme } from "../../appTheme";
import { DiaryCard, cardStyles } from "./DiaryCard";
import { useNavigation } from "@react-navigation/native";

const TripCard = ({ trip }) => {

  const { t } = useTranslation();
  const { height, width } = useWindowDimensions();
  const { appConfig, loading } = useAppConfig();
  const navigation = useNavigation<any>();

  const SurveyOptions = getAngularService('SurveyOptions');
  const $state = getAngularService('$state');

  const [surveyOpt, setSurveyOpt] = useState(null);
  const [rerender, setRerender] = useState(false);

  const isDraft = trip.key.includes('UNPROCESSED');
  const flavoredTheme = getTheme(isDraft ? 'draft' : undefined);

  useEffect(() => {
    trip.onChanged = () => {
      console.log("DiaryCard: timelineEntry changed, force update");
      setRerender(!rerender);
    }
  }, []);

  useEffect(() => {
    const surveyOptKey = appConfig?.survey_info?.['trip-labels'];
    setSurveyOpt(SurveyOptions[surveyOptKey]);
  }, [appConfig, loading]);

  function showDetail() {
    navigation.navigate("label.details", { trip });
  }

  const mapOpts = { zoomControl: false, dragging: false };
  const showAddNoteButton = appConfig?.survey_info?.buttons?.['trip-notes'];
  const mapStyle = showAddNoteButton ? s.shortenedMap : s.fullHeightMap;
  return (
    <DiaryCard timelineEntry={trip} flavoredTheme={flavoredTheme} onPress={() => showDetail()}>
      <View style={[cardStyles.cardContent, {flexDirection: 'row'}]}>
        <IconButton icon='dots-horizontal' size={28}
          style={{position: 'absolute', right: 0, top: 0, height: 16, width: 32,
                  justifyContent: 'center', margin: 4}} />
        <View style={{flex: 1}}>{/* left panel */}
          <LeafletView geojson={trip.geojson} opts={mapOpts}
                        /* the map should be at least as tall as it is wide
                          so it doesn't look squished */
                        style={[{minHeight: width / 2}, mapStyle]} />
          {showAddNoteButton && 
            <View style={s.notesButton}>
              <AddNoteButton timelineEntry={trip}
                              notesConfig={appConfig?.survey_info?.buttons?.['trip-notes']}
                              storeKey={'manual/trip_addition_input'} />
            </View>
          }
        </View>
        <View style={s.rightPanel}>{/* right panel */}
          <View style={[cardStyles.panelSection, {marginTop: 0}]}>{/* date and distance */}
            <Text style={{fontSize: 14, textAlign: 'center'}}>
              <Text style={{fontWeight: 'bold', textDecorationLine: 'underline'}}>{trip.display_date}</Text>
            </Text>
            <Text style={{fontSize: 13, textAlign: 'center'}}>
              {t('diary.distance-in-time', {distance: trip.display_distance, distsuffix: trip.display_distance_suffix, time: trip.display_time})}
            </Text>
          </View>
          <View style={cardStyles.panelSection}>{/* start and end locations */}
            <View style={[cardStyles.location, {justifyContent: 'flex-start'}]}>
              <IconButton icon='map-marker-star' iconColor={flavoredTheme.colors.primaryContainer} size={18}
                          style={cardStyles.locationIcon} />
              <Text numberOfLines={2} style={s.locationText}>
                {trip.start_display_name}
              </Text>
            </View>
            <Divider style={{marginVertical: 4}} />
            <View style={[cardStyles.location, {justifyContent: 'flex-start'}]}>
              <IconButton icon='flag' iconColor={flavoredTheme.colors.primary} size={18}
                          style={cardStyles.locationIcon} />
              <Text numberOfLines={2} style={s.locationText}>
                {trip.end_display_name}
              </Text>
            </View>
          </View>
          <View style={cardStyles.panelSection}>{/* mode and purpose buttons / survey button */}
            {surveyOpt?.elementTag == 'multilabel' &&
                <MultilabelButtonGroup trip={trip} />}
            {surveyOpt?.elementTag == 'enketo-trip-button'
                && <UserInputButton timelineEntry={trip} />}
          </View>
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
    paddingVertical: 12,
    width: 150,
    margin: 'auto',
  },
  rightPanel: {
    flex: 1,
    paddingHorizontal: 5,
    paddingVertical: 12,
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
