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
import LabelTabContext from '../LabelTabContext';
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

const LabelScreenDetails = ({ route, navigation }) => {
  const { timelineMap, labelOptions, timelineLabelMap } = useContext(LabelTabContext);
  const { t } = useTranslation();
  const { height: windowHeight } = useWindowDimensions();
  const appConfig = useAppConfig();
  const { tripId, flavoredTheme } = route.params;
  const trip = timelineMap.get(tripId);
  const { colors } = flavoredTheme || useTheme();
  const { displayDate, displayStartTime, displayEndTime } = useDerivedProperties(trip);
  const [tripStartDisplayName, tripEndDisplayName] = useAddressNames(trip);

  const [modesShown, setModesShown] = useState<'labeled' | 'detected'>('labeled');
  const tripGeojson = useGeojsonForTrip(
    trip,
    labelOptions,
    modesShown == 'labeled' && timelineLabelMap[trip._id.$oid]?.MODE?.value,
  );
  const mapOpts = { minZoom: 3, maxZoom: 17 };

  const modal = (
    <Modal visible={true}>
      <SafeAreaView style={{ flex: 1 }}>
        <Appbar.Header
          statusBarHeight={0}
          elevated={true}
          style={{ height: 46, backgroundColor: colors.surface, elevation: 3 }}>
          <Appbar.BackAction
            onPress={() => {
              navigation.goBack();
            }}
          />
          <Appbar.Content title={displayDate} titleStyle={{ fontSize: 17 }} />
        </Appbar.Header>
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
          <Surface
            mode="flat"
            style={{ margin: 10, paddingHorizontal: 10, rowGap: 12, borderRadius: 15 }}>
            {/* MultiLabel or UserInput button, inline on one row */}
            <View style={{ paddingVertical: 10 }}>
              {appConfig?.survey_info?.['trip-labels'] == 'MULTILABEL' && (
                <MultilabelButtonGroup trip={trip} />
              )}
              {appConfig?.survey_info?.['trip-labels'] == 'ENKETO' && (
                <UserInputButton timelineEntry={trip} />
              )}
            </View>

            {/* Full-size Leaflet map, with zoom controls */}
            <LeafletView
              geojson={tripGeojson}
              style={{ width: '100%', height: windowHeight / 2, marginBottom: 10 }}
              opts={mapOpts}
            />

            {/* If trip is labeled, show a toggle to switch between "Labeled Mode" and "Detected Modes"
              otherwise, just show "Detected" */}
            {timelineLabelMap[trip._id.$oid]?.MODE?.value ? (
              <ToggleSwitch
                onValueChange={(v) => setModesShown(v)}
                value={modesShown}
                density="medium"
                buttons={[
                  { label: t('diary.labeled-mode'), value: 'labeled' },
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
            <TripSectionsDescriptives trip={trip} showLabeledMode={modesShown == 'labeled'} />
            {/* Overall trip duration, distance, and modes.
              Only show this when multiple sections are shown, and we are showing detected modes.
              If we just showed the labeled mode or a single section, this would be redundant. */}
            {modesShown == 'detected' && trip?.sections?.length > 1 && (
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
