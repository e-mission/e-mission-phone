/* A screen to show details of a trip, including a recap of trip info, a full-size map,
    listed sections of the trip, and a graph of speed during the trip.
  Navigated to from the main LabelListScreen by clicking a trip card. */

import React, { useContext, useState } from 'react';
import { View, Modal, ScrollView, useWindowDimensions } from 'react-native';
import {
  PaperProvider,
  Appbar,
  SegmentedButtons,
  Button,
  Surface,
  Text,
  useTheme,
} from 'react-native-paper';
import TimelineContext from '../../TimelineContext';
import LeafletView from '../../components/LeafletView';
import { useTranslation } from 'react-i18next';
import MultilabelButtonGroup from '../../survey/multilabel/MultiLabelButtonGroup';
import UserInputButton from '../../survey/enketo/UserInputButton';
import { useAddressNames } from '../addressNamesHelper';
import { SafeAreaView } from 'react-native-safe-area-context';
import useDerivedProperties from '../useDerivedProperties';
import StartEndLocations from '../components/StartEndLocations';
import { useGeojsonForTrip } from '../timelineHelper';
import TripSectionsDescriptives from './TripSectionsDescriptives';
import OverallTripDescriptives from './OverallTripDescriptives';
import ToggleSwitch from '../../components/ToggleSwitch';
import useAppConfig from '../../useAppConfig';
import { CompositeTrip } from '../../types/diaryTypes';
import NavBar from '../../components/NavBar';

const LabelScreenDetails = ({ route, navigation }) => {
  const { timelineMap, labelOptions, confirmedModeFor } = useContext(TimelineContext);
  const { t } = useTranslation();
  const { height: windowHeight } = useWindowDimensions();
  const appConfig = useAppConfig();
  const { tripId, flavoredTheme } = route.params;
  const trip = timelineMap?.get(tripId) as CompositeTrip;
  const { colors } = flavoredTheme || useTheme();
  const { displayDate, displayStartTime, displayEndTime } = useDerivedProperties(trip);
  const [tripStartDisplayName, tripEndDisplayName] = useAddressNames(trip);

  const [modesShown, setModesShown] = useState<'confirmed' | 'detected'>(() =>
    // if trip has a labeled mode, initial state shows that; otherwise, show detected modes
    trip && confirmedModeFor(trip)?.value ? 'confirmed' : 'detected',
  );
  const tripGeojson =
    trip &&
    labelOptions &&
    useGeojsonForTrip(trip, modesShown == 'confirmed' ? confirmedModeFor(trip) : undefined);
  const mapOpts = { minZoom: 3, maxZoom: 17 };

  const modal = (
    <Modal visible={true}>
      <SafeAreaView style={{ flex: 1 }}>
        <NavBar elevated={true}>
          <Appbar.BackAction
            onPress={() => {
              navigation.goBack();
            }}
          />
          <Appbar.Content title={displayDate} titleStyle={{ fontSize: 17 }} />
        </NavBar>
        <Surface mode="elevated" style={{ paddingVertical: 4, paddingHorizontal: 10, zIndex: 1 }}>
          <StartEndLocations
            fontSize={14}
            displayStartTime={displayStartTime}
            displayEndTime={displayEndTime}
            displayStartName={tripStartDisplayName}
            displayEndName={tripEndDisplayName}
          />
        </Surface>
        <ScrollView style={{ paddingBottom: 30, backgroundColor: colors.background }}>
          <Surface mode="flat" style={{ margin: 10, padding: 10, rowGap: 12, borderRadius: 15 }}>
            {/* MultiLabel or UserInput button, inline on one row */}
            <View style={{ paddingVertical: 10 }}>
              {appConfig?.survey_info?.['trip-labels'] == 'MULTILABEL' && (
                <MultilabelButtonGroup trip={trip} />
              )}
              {appConfig?.survey_info?.['trip-labels'] == 'ENKETO' && (
                <UserInputButton timelineEntry={trip} />
              )}
            </View>
            {tripGeojson && (
              // Full-size Leaflet map, with zoom controls
              <LeafletView
                geojson={tripGeojson}
                style={{ width: '100%', height: windowHeight / 2, marginBottom: 10 }}
                opts={mapOpts}
              />
            )}

            {/* If trip is labeled, show a toggle to switch between "Labeled Mode" and "Detected Modes"
              otherwise, just show "Detected" */}
            {trip && confirmedModeFor(trip)?.value ? (
              <ToggleSwitch
                onValueChange={(v: 'confirmed' | 'detected') => setModesShown(v)}
                value={modesShown}
                density="medium"
                buttons={[
                  { label: t('diary.labeled-mode'), value: 'confirmed' },
                  { label: t('diary.detected-modes'), value: 'detected' },
                ]}
              />
            ) : (
              <Button
                mode="outlined"
                compact={true}
                textColor={colors.onBackground}
                style={{ height: 32 }}
                contentStyle={{ height: 30 }}>
                {t('diary.detected-modes')}
              </Button>
            )}

            {/* section-by-section breakdown of duration, distance, and mode */}
            <TripSectionsDescriptives trip={trip} showConfirmedMode={modesShown == 'confirmed'} />
            {/* Overall trip duration, distance, and modes.
              Only show this when multiple sections are shown, and we are showing detected modes.
              If we just showed the labeled mode or a single section, this would be redundant. */}
            {modesShown == 'detected' && (trip as CompositeTrip)?.sections?.length > 1 && (
              <OverallTripDescriptives trip={trip} />
            )}
            {/* TODO: show speed graph here */}
          </Surface>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
  if (route.params.flavoredTheme) {
    return <PaperProvider theme={route.params.flavoredTheme}>{modal}</PaperProvider>;
  }
  return modal;
};

export default LabelScreenDetails;
