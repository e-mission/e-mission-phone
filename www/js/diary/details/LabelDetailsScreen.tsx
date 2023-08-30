/* A screen to show details of a trip, including a recap of trip info, a full-size map,
    listed sections of the trip, and a graph of speed during the trip.
  Navigated to from the main LabelListScreen by clicking a trip card. */

import React, { useContext, useState } from "react";
import { View, Modal, ScrollView, useWindowDimensions } from "react-native";
import { Appbar, SegmentedButtons, Button, Surface, Text, useTheme } from "react-native-paper";
import { LabelTabContext } from "../LabelTab";
import LeafletView from "../../components/LeafletView";
import { useTranslation } from "react-i18next";
import MultilabelButtonGroup from "../../survey/multilabel/MultiLabelButtonGroup";
import UserInputButton from "../../survey/enketo/UserInputButton";
import { useAddressNames } from "../addressNamesHelper";
import { SafeAreaView } from "react-native-safe-area-context";
import useDerivedProperties from "../useDerivedProperties";
import StartEndLocations from "../components/StartEndLocations";
import { useGeojsonForTrip } from "../timelineHelper";
import TripDescriptives from "./TripDescriptives";
import TripSectionsDetails from "./TripSectionsDetails";

const LabelScreenDetails = ({ route, navigation }) => {

  const { surveyOpt, timelineMap, labelOptions } = useContext(LabelTabContext);
  const { t } = useTranslation();
  const { height: windowHeight } = useWindowDimensions();
  const { colors } = useTheme();
  const trip = timelineMap.get(route.params.tripId);
  const { displayDate, displayStartTime, displayEndTime } = useDerivedProperties(trip);
  const [ tripStartDisplayName, tripEndDisplayName ] = useAddressNames(trip);

  const [ modesShown, setModesShown ] = useState<'labeled'|'detected'>('labeled');
  const tripGeojson = useGeojsonForTrip(trip, labelOptions, modesShown=='labeled' && trip?.userInput?.MODE?.value);
  const mapOpts = {minZoom: 3, maxZoom: 17};

  return (
    <Modal visible={true}>
      <SafeAreaView style={{flex: 1}}>
        <Appbar.Header statusBarHeight={0} elevated={true} style={{ height: 46, backgroundColor: 'white', elevation: 3 }}>
          <Appbar.BackAction onPress={() => { navigation.goBack() }} />
          <Appbar.Content title={displayDate} titleStyle={{fontSize: 17}} />
        </Appbar.Header>
        <Surface mode='elevated' style={{ paddingVertical: 4, paddingHorizontal: 10, zIndex: 1 }}>
          <StartEndLocations fontSize={14}
            displayStartTime={displayStartTime} displayEndTime={displayEndTime}
            displayStartName={tripStartDisplayName} displayEndName={tripEndDisplayName} />
        </Surface>
        <ScrollView style={{ paddingBottom: 30}}>
          <Surface mode='flat' style={{padding: 10, marginHorizontal: 10, marginVertical: 18 }}>
            <LeafletView geojson={tripGeojson} style={{width: '100%', height: windowHeight/2, marginBottom: 10}} opts={mapOpts} />
            {trip?.userInput?.MODE?.value ?
              <SegmentedButtons onValueChange={v => setModesShown(v)} value={modesShown}
                density='medium'
                buttons={[{label: 'Labeled Mode', value: 'labeled'},
                          {label: 'Detected Modes', value: 'detected'}]} />
            :
              <Button mode='outlined' compact={true} textColor={colors.onBackground}
                style={{height: 32}} contentStyle={{height:30}}>
                Detected Modes
              </Button>
            }
            <TripDescriptives trip={trip} />
            <View style={{ marginVertical: 10, paddingHorizontal: '10%' }}>
              {surveyOpt?.elementTag == 'multilabel' &&
                <MultilabelButtonGroup trip={trip} />}
              {surveyOpt?.elementTag == 'enketo-trip-button'
                && <UserInputButton timelineEntry={trip} />}
            </View>
            <TripSectionsDetails trip={trip} />
            {/* TODO: show speed graph here */}
          </Surface>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}

export default LabelScreenDetails;
