/* A screen to show details of a trip, including a recap of trip info, a full-size map,
    listed sections of the trip, and a graph of speed during the trip.
  Navigated to from the main LabelScreen by clicking a trip card. */

import React, { useContext } from "react";
import { View, ScrollView, StyleSheet, useWindowDimensions } from "react-native";
import { Appbar, Divider, IconButton, Surface, Text, useTheme } from "react-native-paper";
import { LabelTabContext } from "./LabelTab";
import { cardStyles } from "./cards/DiaryCard";
import LeafletView from "../components/LeafletView";
import { useTranslation } from "react-i18next";
import MultilabelButtonGroup from "../survey/multilabel/MultiLabelButtonGroup";
import UserInputButton from "../survey/enketo/UserInputButton";

const LabelScreenDetails = ({ route, navigation }) => {

  const { surveyOpt } = useContext(LabelTabContext);
  const { t } = useTranslation();
  const { height: windowHeight } = useWindowDimensions();
  const { colors } = useTheme();
  const { trip } = route.params;

  return (<>
    <Appbar.Header statusBarHeight={12} elevated={true} style={{ height: 46, backgroundColor: 'white', elevation: 3 }}>
      <Appbar.BackAction onPress={() => { navigation.goBack() }} />
      <Appbar.Content title={trip.display_date} />
    </Appbar.Header>
    <Surface mode='elevated' style={{ padding: 10, zIndex: 1 }}>
      <View style={[cardStyles.location, { justifyContent: 'flex-start' }]}>
        <Text style={{padding: 10}}>
          {trip.display_start_time}
        </Text>
          <IconButton icon='map-marker-star' iconColor={colors.primaryContainer} size={18}
            style={cardStyles.locationIcon} />
          <Text numberOfLines={2}>
            {trip.start_display_name}
          </Text>
      </View>
      <Divider style={{ marginVertical: 4 }} />
      <View style={[cardStyles.location, { justifyContent: 'flex-start' }]}>
        <Text style={{padding: 10}}>
          {trip.display_end_time}
        </Text>
          <IconButton icon='flag' iconColor={colors.primary} size={18}
            style={cardStyles.locationIcon} />
          <Text numberOfLines={2}>
            {trip.end_display_name}
          </Text>
      </View>
    </Surface>
    <ScrollView style={{ paddingBottom: 30}}>
      <Surface mode='flat' style={{padding: 10, paddingBottom: 20, marginHorizontal: 10, marginVertical: 18 }}>
        <LeafletView geojson={trip.geojson} style={{width: '100%', height: windowHeight/2}} />
        <View style={{flexDirection: 'row', justifyContent: 'space-evenly'}}>
          <View style={{padding: 15}}>
            <Text style={{fontSize: 15}}>
              {t('diary.distance')}
            </Text>
            <Text style={{fontSize: 13, fontWeight: 'bold'}}>
              {`${trip.display_distance} ${trip.display_distance_suffix}`}
            </Text>
          </View>
          <View style={{padding: 15}}>
            <Text style={{fontSize: 15}}>
              {t('diary.time')}
            </Text>
            <Text style={{fontSize: 13, fontWeight: 'bold'}}>
              {trip.display_time}
            </Text>
          </View>
        </View>
        {surveyOpt?.elementTag == 'multilabel' &&
            <MultilabelButtonGroup trip={trip} />}
        {surveyOpt?.elementTag == 'enketo-trip-button'
            && <UserInputButton timelineEntry={trip} />}

        {/* TODO: list sections of trip here */}

        {/* TODO: show speed graph here */}

      </Surface>
    </ScrollView>
  </>)
}

export default LabelScreenDetails;
