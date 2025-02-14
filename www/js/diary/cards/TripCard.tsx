/* TripCard displays a card with information about a trip, including a map of the trip route,
    plus buttons for labeling trips and/or surveying the user about the trip.
  If the trip has not been processed on the server yet, this is a draft trip, and it
    will used the greyish 'draft' theme flavor.
*/

import React, { useContext } from 'react';
import { View, useWindowDimensions, StyleSheet } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import LeafletView from '../../components/LeafletView';
import { useTranslation } from 'react-i18next';
import MultilabelButtonGroup from '../../survey/multilabel/MultiLabelButtonGroup';
import UserInputButton from '../../survey/enketo/UserInputButton';
import useAppConfig from '../../useAppConfig';
import AddNoteButton from '../../survey/enketo/AddNoteButton';
import AddedNotesList from '../../survey/enketo/AddedNotesList';
import { getTheme } from '../../appTheme';
import { DiaryCard, cardStyles } from './DiaryCard';
import { useNavigation } from '@react-navigation/native';
import { useAddressNames } from '../addressNamesHelper';
import TimelineContext from '../../TimelineContext';
import useDerivedProperties from '../useDerivedProperties';
import StartEndLocations from '../components/StartEndLocations';
import ModesIndicator from './ModesIndicator';
import { useGeojsonForTrip } from '../timelineHelper';
import { CompositeTrip } from '../../types/diaryTypes';
import { EnketoUserInputEntry } from '../../survey/enketo/enketoHelper';
import { addStatReading } from '../../plugin/clientStats';

type Props = { trip: CompositeTrip; isFirstInList?: boolean };
const TripCard = ({ trip, isFirstInList }: Props) => {
  const { t } = useTranslation();
  const { width: windowWidth } = useWindowDimensions();
  const appConfig = useAppConfig();
  const {
    displayStartTime,
    displayEndTime,
    displayDate,
    formattedDistance,
    distanceSuffix,
    displayTime,
    detectedModes,
  } = useDerivedProperties(trip);
  let [tripStartDisplayName, tripEndDisplayName] = useAddressNames(trip);
  const navigation = useNavigation<any>();
  const { confirmedModeFor, notesFor } = useContext(TimelineContext);
  const tripGeojson = trip && useGeojsonForTrip(trip, confirmedModeFor(trip));

  const isDraft = trip.key.includes('UNPROCESSED');
  const flavoredTheme = getTheme(isDraft ? 'draft' : undefined);

  function showDetail() {
    const tripId = trip._id.$oid;
    addStatReading('view_trip_details', { tripId });
    navigation.navigate('label.details', { tripId, flavoredTheme });
  }

  const mapOpts = { attributionControl: isFirstInList, zoomControl: false, dragging: false };
  const showAddNoteButton = appConfig?.survey_info?.buttons?.['trip-notes'];
  const mapStyle = showAddNoteButton ? s.shortenedMap : s.fullHeightMap;
  return (
    <DiaryCard timelineEntry={trip} flavoredTheme={flavoredTheme} onPress={() => showDetail()}>
      <View
        style={[cardStyles.cardContent, { flexDirection: 'row-reverse' }]}
        accessibilityLabel={`Trip from ${displayStartTime} to ${displayEndTime}`}>
        <IconButton
          icon="dots-horizontal"
          size={24}
          accessibilityLabel="View trip details"
          onPress={() => showDetail()}
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            height: 16,
            width: 32,
            justifyContent: 'center',
            margin: 4,
          }}
        />
        <View style={s.rightPanel}>
          {/* right panel */}
          <View style={[cardStyles.panelSection, { marginTop: 0 }]}>
            {/* date and distance */}
            <Text
              style={{
                fontSize: 14,
                textAlign: 'center',
                fontWeight: 'bold',
                textDecorationLine: 'underline',
              }}>
              {displayDate}
            </Text>
            <Text style={{ fontSize: 13, textAlign: 'center' }}>
              {t('diary.distance-in-time', {
                distance: formattedDistance,
                distsuffix: distanceSuffix,
                time: displayTime,
              })}
            </Text>
          </View>
          <View style={cardStyles.panelSection}>
            {/* start and end locations */}
            <StartEndLocations
              displayStartName={tripStartDisplayName}
              displayEndName={tripEndDisplayName}
            />
          </View>
          <View style={[cardStyles.panelSection, { marginBottom: 0 }]}>
            {/* mode and purpose buttons / survey button */}
            {appConfig?.survey_info?.['trip-labels'] == 'MULTILABEL' && (
              <MultilabelButtonGroup trip={trip} />
            )}
            {appConfig?.survey_info?.['trip-labels'] == 'ENKETO' && (
              <UserInputButton timelineEntry={trip} />
            )}
          </View>
        </View>
        <View style={{ flex: 1, paddingBottom: showAddNoteButton ? 8 : 0 }}>
          {/* left panel */}
          {tripGeojson && (
            <LeafletView
              geojson={tripGeojson}
              opts={mapOpts}
              downscaleTiles={true}
              cacheHtml={true}
              /* the map should be at least as tall as it is wide
                          so it doesn't look squished */
              style={[{ minHeight: windowWidth / 2 }, mapStyle]}
            />
          )}
          <ModesIndicator trip={trip} detectedModes={detectedModes} />
          {showAddNoteButton && (
            <View style={cardStyles.notesButton}>
              <AddNoteButton
                timelineEntry={trip}
                notesConfig={appConfig?.survey_info?.buttons?.['trip-notes']}
                storeKey={'manual/trip_addition_input'}
              />
            </View>
          )}
        </View>
      </View>
      {notesFor(trip)?.length && (
        <View style={cardStyles.cardFooter}>
          <AddedNotesList
            timelineEntry={trip}
            additionEntries={(notesFor(trip) as EnketoUserInputEntry[]) || []}
          />
        </View>
      )}
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
